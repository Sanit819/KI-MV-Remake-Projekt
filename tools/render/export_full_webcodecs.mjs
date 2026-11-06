/** Deterministic full-MV export through an isolated Edge WebCodecs encoder.
 * Canvas -> VideoFrame -> hardware-preferred H.264 Annex B -> loopback -> ffmpeg mux.
 * No PNG/raw RGBA readback or realtime recording; no software/quality fallback.
 * Example two-second benchmark (does not start a complete export):
 * node tools/render/export_full_webcodecs.mjs --start-frame 11940 --end-frame 12060 --out exports/benchmark-webcodecs-4k60.mp4
 */
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn, spawnSync } from 'node:child_process';
import { chromium } from 'playwright-core';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const argv = process.argv.slice(2);
function arg(name, fallback) {
  const index = argv.indexOf(`--${name}`);
  return index < 0 ? fallback : argv[index + 1];
}
const W = Number(arg('width', 3840));
const H = Number(arg('height', 2160));
const FPS = 60;
const FULL_FRAMES = 12740;
const FIRST = Number(arg('start-frame', 0));
const LAST = Number(arg('end-frame', FULL_FRAMES));
const BITRATE = Number(arg('bitrate', Math.ceil(50000000 * W * H / (3840 * 2160))));
const CODEC = String(arg('codec', 'avc1.640034'));
const LATENCY = String(arg('latency-mode', 'quality'));
const RATE_MODE = String(arg('bitrate-mode', 'constant'));
const MIN_BITRATE = Math.max(10000000, Math.ceil(40000000 * W * H / (3840 * 2160)));
const OUT = path.resolve(ROOT, arg('out', 'exports/astra-world-execute-me-full-webcodecs-4k60.mp4'));
const FFMPEG = arg('ffmpeg', path.join(ROOT, '.cache/python/imageio_ffmpeg/binaries/ffmpeg-win-x86_64-v9.0.2.exe'));
const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const AUDIO = path.join(ROOT, 'media/audio/mili-world-execute-original-bilibili.m4a');
if (![W, H, FIRST, LAST, BITRATE].every(Number.isInteger) || W <= 0 || H <= 0 || W % 2 || H % 2 || FIRST < 0 || LAST > FULL_FRAMES || LAST <= FIRST) {
  throw new Error('Expected even positive dimensions and a frame interval within [0, 12740). FPS is fixed at 60.');
}
if (BITRATE < MIN_BITRATE) throw new Error(`Bitrate ${BITRATE} is below the quality floor ${MIN_BITRATE}; no low-quality fallback.`);
if (!['avc1.640034', 'avc1.4d0034', 'avc1.420034'].includes(CODEC) || !['quality', 'realtime'].includes(LATENCY) || !['constant', 'variable'].includes(RATE_MODE)) throw new Error('Unsupported AVC 8-bit profile, latency mode or rate mode');
if (!OUT.startsWith(ROOT + path.sep) || path.extname(OUT).toLowerCase() !== '.mp4') throw new Error('Output must be an MP4 inside this repository.');
for (const file of [FFMPEG, EDGE, AUDIO]) if (!fs.existsSync(file)) throw new Error(`Required file missing: ${file}`);
const COUNT = LAST - FIRST;
const DURATION = COUNT / FPS;
const started = Date.now();
let ff = null, ffDone = null, browser = null, failure = null, ffLog = '';
let received = 0, receivedBytes = 0, chunkActive = false, firstPacketTime = null;
const mime = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.svg': 'image/svg+xml', '.css': 'text/css', '.m4a': 'audio/mp4' };
const server = http.createServer(async (req, res) => {
  try {
    const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    if (req.method === 'POST' && pathname === '/__encoded') {
      if (!ff || failure) throw new Error(`Muxer unavailable: ${failure?.message || 'not initialized'}`);
      if (chunkActive) throw new Error('Concurrent encoded-packet writes are forbidden');
      if (Number(req.headers['x-chunk-index']) !== received || received >= COUNT) throw new Error('Unexpected encoded packet order/count');
      if (Number(req.headers['x-timestamp-us']) !== Math.round(received * 1e6 / FPS)) throw new Error('Reordered or missing video timestamps; raw Annex B mux is not safe');
      if (received === 0 && req.headers['x-chunk-type'] !== 'key') throw new Error('First encoded packet must be a key frame');
      chunkActive = true;
      const chunks = [];
      let length = 0;
      for await (const chunk of req) {
        length += chunk.length;
        if (length > 32 * 1024 * 1024) throw new Error('Encoded access unit exceeds 32 MiB');
        chunks.push(chunk);
      }
      const bytes = Buffer.concat(chunks, length);
      if (length < 4 || !(bytes[0] === 0 && bytes[1] === 0 && (bytes[2] === 1 || (bytes[2] === 0 && bytes[3] === 1)))) throw new Error('Expected H.264 Annex B start code');
      await new Promise((resolve, reject) => ff.stdin.write(bytes, error => error ? reject(error) : resolve()));
      received++;
      receivedBytes += length;
      firstPacketTime ??= Date.now();
      chunkActive = false;
      res.writeHead(200, { 'Content-Type': 'text/plain' });
      res.end('ok');
      if (received === 1 || received % 60 === 0 || received === COUNT) {
        const elapsed = (Date.now() - started) / 1000;
        const fps = received / elapsed;
        console.log(`[webcodecs] ${received}/${COUNT}; ${fps.toFixed(1)} fps incl. startup; ETA ${Math.ceil((COUNT - received) / Math.max(fps, .01))}s`);
      }
      return;
    }
    if (req.method !== 'GET') { res.writeHead(405); res.end(); return; }
    const allowed = pathname.startsWith('/src/full/') || pathname.startsWith('/assets/') || pathname === '/docs/audio/calibrated_timeline.json' || pathname === '/media/audio/mili-world-execute-original-bilibili.m4a';
    if (!allowed) { res.writeHead(403); res.end('Forbidden'); return; }
    const file = path.resolve(ROOT, '.' + pathname);
    if (!file.startsWith(ROOT + path.sep)) throw new Error('Path outside workspace');
    if (!fs.existsSync(file) || !fs.statSync(file).isFile()) { res.writeHead(404); res.end('Not found'); return; }
    res.writeHead(200, { 'Content-Type': mime[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
    fs.createReadStream(file).pipe(res);
  } catch (error) {
    failure = error;
    chunkActive = false;
    if (!res.headersSent) res.writeHead(500);
    res.end(error.message);
  }
});
server.requestTimeout = 0;
server.headersTimeout = 60000;
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const port = server.address().port;

try {
  browser = await chromium.launch({ executablePath: EDGE, headless: true,
    args: ['--disable-background-timer-throttling', '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows', '--ignore-gpu-blocklist', '--use-angle=d3d11'] });
  const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
  page.setDefaultTimeout(0);
  page.on('pageerror', error => { failure = error; console.error('[page]', error.message); });
  await page.goto(`http://127.0.0.1:${port}/src/full/index.html?w=${W}&h=${H}`, { waitUntil: 'load', timeout: 60000 });
  await page.evaluate(async () => {
    if (!window.sample) throw new Error('window.sample is missing');
    await window.sample.ready;
  });
  const requestedConfig = {
    codec: CODEC, width: W, height: H, framerate: FPS,
    bitrate: BITRATE, bitrateMode: RATE_MODE, latencyMode: LATENCY,
    hardwareAcceleration: 'prefer-hardware', alpha: 'discard', avc: { format: 'annexb' },
  };
  const support = await page.evaluate(async config => {
    if (!isSecureContext || typeof VideoEncoder === 'undefined') throw new Error('WebCodecs unavailable in this secure loopback context');
    const canvas = window.sample.canvas || document.getElementById('stage');
    const supported = await VideoEncoder.isConfigSupported(config);
    return { ...supported, canvas: { width: canvas.width, height: canvas.height }, userAgent: navigator.userAgent };
  }, requestedConfig);
  if (support.canvas.width !== W || support.canvas.height !== H) throw new Error(`Unexpected canvas dimensions: ${JSON.stringify(support.canvas)}`);
  console.log(`[support] ${JSON.stringify(support)}`);
  if (!support.supported || support.config.hardwareAcceleration !== 'prefer-hardware' || support.config.avc?.format !== 'annexb') {
    const diagnostics = await page.evaluate(async config => {
      const results = [];
      for (const codec of ['avc1.640034', 'avc1.4d0034', 'avc1.420034']) {
        for (const latencyMode of ['quality', 'realtime']) {
          for (const bitrateMode of ['constant', 'variable']) {
            const candidate = { ...config, codec, latencyMode, bitrateMode };
            const result = await VideoEncoder.isConfigSupported(candidate);
            results.push({ codec, latencyMode, bitrateMode, supported: result.supported });
          }
        }
      }
      return results;
    }, requestedConfig);
    const system = await browser.newBrowserCDPSession();
    const gpu = await system.send('SystemInfo.getInfo').then(info => ({
      devices: info.gpu.devices, featureStatus: info.gpu.featureStatus,
      videoEncoding: info.gpu.videoEncoding,
    })).catch(error => ({ unavailable: error.message }));
    await system.detach();
    fs.mkdirSync(path.dirname(OUT), { recursive: true });
    fs.writeFileSync(OUT.replace(/\.[^.]+$/, '.unsupported.json'), JSON.stringify({ requestedConfig, support, diagnostics, gpu }, null, 2) + '\n');
    console.log(`[diagnostics] ${JSON.stringify(diagnostics)}`);
    console.log(`[gpu] ${JSON.stringify(gpu)}`);
    throw new Error('Requested hardware-preferred H.264 Annex B config is unsupported. No automatic profile/latency/quality fallback was used.');
  }
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  const params = [
    '-hide_banner', '-loglevel', 'warning', '-y', '-fflags', '+genpts', '-f', 'h264', '-framerate', String(FPS), '-i', 'pipe:0',
    '-ss', (FIRST / FPS).toFixed(9), '-i', AUDIO, '-map', '0:v:0', '-map', '1:a:0',
    '-frames:v', String(COUNT), '-t', DURATION.toFixed(9), '-c:v', 'copy',
    // RGB Canvas is converted by the AVC encoder. This makes SPS/container VUI
    // explicit; benchmark colour comparison must verify that conversion itself.
    '-bsf:v', 'h264_metadata=video_full_range_flag=0:colour_primaries=1:transfer_characteristics=1:matrix_coefficients=1',
    '-color_range', 'tv', '-color_primaries', 'bt709', '-color_trc', 'bt709', '-colorspace', 'bt709',
    '-af', `apad=whole_dur=${DURATION.toFixed(9)}`, '-c:a', 'aac', '-b:a', '192k', '-video_track_timescale', '60000',
    '-metadata', `comment=ASTRA full v05 WebCodecs; source_start_frame=${FIRST}; source_end_frame_exclusive=${LAST}; fps=60; requested_bitrate=${BITRATE}; hardware=prefer-hardware`,
    '-movflags', '+faststart', OUT,
  ];
  ff = spawn(FFMPEG, params, { stdio: ['pipe', 'ignore', 'pipe'] });
  ff.stderr.on('data', bytes => { ffLog += bytes.toString(); if (ffLog.length > 16000) ffLog = ffLog.slice(-16000); });
  ff.stdin.on('error', error => { failure = error; });
  ffDone = new Promise((resolve, reject) => {
    ff.on('error', reject);
    ff.on('exit', code => code === 0 ? resolve() : reject(new Error(`ffmpeg exit ${code}: ${ffLog}`)));
  });
  ffDone.catch(error => { failure = error; });
  const timing = await page.evaluate(async ({ config, first, last, fps }) => {
    const canvas = window.sample.canvas || document.getElementById('stage');
    let fatal = null, outputCount = 0, sentCount = 0, pendingBytes = 0, sendChain = Promise.resolve();
    let decoderConfig = null, firstFrameColorSpace = null, maxQueue = 0, maxPendingBytes = 0;
    const times = { render: 0, video_frame: 0, encode_submit: 0, backpressure: 0, final_flush: 0 };
    const begun = performance.now();
    const encoder = new VideoEncoder({
      error(error) { fatal = error; },
      output(chunk, metadata) {
        try {
          const index = outputCount++;
          if (chunk.timestamp !== Math.round(index * 1e6 / fps)) throw new Error(`Output timestamps are reordered/missing at ${index}: ${chunk.timestamp}`);
          if (metadata?.decoderConfig) decoderConfig = metadata.decoderConfig;
          const bytes = new Uint8Array(chunk.byteLength);
          chunk.copyTo(bytes);
          pendingBytes += bytes.length;
          maxPendingBytes = Math.max(maxPendingBytes, pendingBytes);
          sendChain = sendChain.then(async () => {
            if (fatal) throw fatal;
            const response = await fetch('/__encoded', { method: 'POST', headers: { 'x-chunk-index': String(index), 'x-timestamp-us': String(chunk.timestamp), 'x-chunk-type': chunk.type }, body: bytes });
            if (!response.ok) throw new Error(await response.text());
            pendingBytes -= bytes.length;
            sentCount++;
          }).catch(error => { fatal = error; });
        } catch (error) { fatal = error; }
      },
    });
    encoder.configure(config);
    try {
      for (let frame = first; frame < last; frame++) {
        const waiting = performance.now();
        while (encoder.encodeQueueSize >= 6 || pendingBytes >= 16 * 1024 * 1024) {
          if (fatal) throw fatal;
          if (performance.now() - waiting > 60000) throw new Error('Encoder/loopback backpressure stalled for 60 seconds');
          await new Promise(resolve => setTimeout(resolve, 0));
        }
        times.backpressure += performance.now() - waiting;
        if (fatal) throw fatal;
        const before = performance.now();
        await window.sample.renderFrame(frame / fps);
        const rendered = performance.now();
        const index = frame - first;
        const timestamp = Math.round(index * 1e6 / fps);
        const videoFrame = new VideoFrame(canvas, { timestamp, duration: Math.round((index + 1) * 1e6 / fps) - timestamp, alpha: 'discard' });
        if (firstFrameColorSpace === null) firstFrameColorSpace = videoFrame.colorSpace.toJSON();
        const prepared = performance.now();
        try { encoder.encode(videoFrame, { keyFrame: index % 120 === 0 }); } finally { videoFrame.close(); }
        times.render += rendered - before;
        times.video_frame += prepared - rendered;
        times.encode_submit += performance.now() - prepared;
        maxQueue = Math.max(maxQueue, encoder.encodeQueueSize);
      }
      const flushing = performance.now();
      await encoder.flush();
      await sendChain;
      times.final_flush = performance.now() - flushing;
      if (fatal) throw fatal;
      if (outputCount !== last - first || sentCount !== outputCount) throw new Error(`Encoded/sent ${outputCount}/${sentCount}, expected ${last - first}`);
      return { milliseconds: times, elapsed_seconds: (performance.now() - begun) / 1000, outputCount, sentCount, firstFrameColorSpace, decoderConfig, maxQueue, maxPendingBytes };
    } finally { if (encoder.state !== 'closed') encoder.close(); }
  }, { config: support.config, first: FIRST, last: LAST, fps: FPS });
  if (failure) throw failure;
  if (received !== COUNT) throw new Error(`Received ${received} encoded frames, expected ${COUNT}`);
  ff.stdin.end();
  await ffDone;
  const probe = spawnSync(FFMPEG, ['-hide_banner', '-i', OUT, '-map', '0:v:0', '-frames:v', '1', '-an', '-f', 'null', '-'], { encoding: 'utf8', timeout: 60000 });
  const probeText = String(probe.stderr || '');
  const videoLine = probeText.split(/\r?\n/).find(line => /Stream #0:0.*Video:/.test(line)) || '';
  if (probe.status !== 0 || !/h264.*yuv420p\(tv, bt709/.test(videoLine) || !videoLine.includes(`${W}x${H}`)) throw new Error(`Output is not verified 8-bit 4:2:0 limited BT.709 at native dimensions: ${videoLine}\n${probeText}`);
  const report = {
    output: path.relative(ROOT, OUT).replaceAll('\\', '/'), entry: 'src/full/index.html', width: W, height: H, fps: FPS,
    source_start_frame: FIRST, source_end_frame_exclusive: LAST, source_start_seconds: FIRST / FPS,
    intended_duration_seconds: DURATION, encoded_input_frames: received, encoded_bytes: receivedBytes,
    requested_config: requestedConfig, supported_config: support.config, browser: support.userAgent,
    hardware_evidence: 'isConfigSupported accepted prefer-hardware; this API expresses a preference, not a hardware-use certificate.',
    transport: 'VideoFrame(canvas) -> WebCodecs Annex B -> loopback HTTP -> ffmpeg video stream copy',
    elapsed_seconds: (Date.now() - started) / 1000, pipeline: timing,
    pipeline_fps: COUNT / timing.elapsed_seconds, encoded_bitrate_bps: receivedBytes * 8 / DURATION,
    output_bytes: fs.statSync(OUT).size, output_video_stream: videoLine.trim(), ffmpeg_log: ffLog.trim(),
    validation_scope: 'Ordered encoded timestamps/count and first-frame 8-bit yuv420p BT.709 decode. Run verify_full_mv.py for complete independent decode and audio alignment; visually check benchmark before final export.',
  };
  fs.writeFileSync(OUT.replace(/\.[^.]+$/, '.render.json'), JSON.stringify(report, null, 2) + '\n');
  console.log(`[done] ${path.relative(ROOT, OUT)}; ${timing.elapsed_seconds.toFixed(2)}s encode pipeline, ${report.pipeline_fps.toFixed(1)} fps; ${report.elapsed_seconds.toFixed(2)}s overall; ${(report.encoded_bitrate_bps / 1e6).toFixed(2)} Mbps actual`);
} catch (error) {
  failure = error;
  throw error;
} finally {
  if (browser) await browser.close();
  server.closeAllConnections();
  await new Promise(resolve => server.close(resolve));
  if (ff && ff.exitCode === null) {
    if (failure) ff.kill(); else ff.stdin.end();
    await ffDone.catch(() => {});
  }
}
