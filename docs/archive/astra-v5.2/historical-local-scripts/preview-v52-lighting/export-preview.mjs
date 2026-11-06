/** Offline frame export for the original ASTRA sample.
 * Each native Canvas frame is streamed over loopback HTTP into ffmpeg.
 * The renderer receives source-song seconds; no realtime screen recording.
 */
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn, spawnSync } from 'node:child_process';
import { chromium } from 'playwright-core';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const argv = process.argv.slice(2);
function arg(key, fallback) {
  const i = argv.indexOf(`--${key}`);
  return i < 0 ? fallback : argv[i + 1];
}
const W = Number(arg('width', 1920));
const H = Number(arg('height', 1080));
const FPS = Number(arg('fps', 60));
const FIRST = Number(arg('start-frame', 11584));
const LAST = Number(arg('end-frame', 12740));
const STILL_ARG = arg('stills', null);
const VIDEO_ONLY_ARG = String(arg('video-only', 'false'));
if (!['true', 'false'].includes(VIDEO_ONLY_ARG)) throw new Error('--video-only must be true or false');
const VIDEO_ONLY = VIDEO_ONLY_ARG === 'true';
const ENTRY = String(arg('entry', 'src/sample/index.html')).replaceAll('\\', '/');
if (!['src/sample/index.html', 'src/sample-v02/index.html','src/full/index.html','src/mv2/index.html','src/mv3/index.html','src/mv4/index.html','src/mv5/index.html','src/mv5cat/index.html','src/mv52/index.html'].includes(ENTRY)) {
  throw new Error('Entry must be a supported project sample or full MV page');
}
const VERSION = ENTRY === 'src/mv52/index.html' ? 'preview-v52-lighting' : ENTRY === 'src/mv5cat/index.html' ? 'final-v05-cat' : ENTRY === 'src/mv5/index.html' ? 'final-v05' : ENTRY === 'src/mv4/index.html' ? 'full-v04' : ENTRY === 'src/mv3/index.html' ? 'full-v03' : ENTRY === 'src/mv2/index.html' ? 'full-v02' : ENTRY === 'src/full/index.html' ? 'full-v01' : ENTRY === 'src/sample-v02/index.html' ? 'v02' : 'v01';
const TRANSPORT = arg('transport', 'png');
if (!['png', 'rgba'].includes(TRANSPORT)) throw new Error('Transport must be png or rgba');
const OUT = path.resolve(ROOT, arg('out', STILL_ARG
  ? (VERSION === 'full-v02' ? 'exports/qa-v2' : VERSION === 'v02' ? 'exports/qa-v02' : 'exports/qa')
  : `exports/astra-ending-sample-${VERSION}-1080p60.mp4`));
if (![W, H, FPS, FIRST, LAST].every(Number.isInteger) || W <= 0 || H <= 0 || W % 2 || H % 2 || FPS <= 0 || FIRST < 0 || LAST <= FIRST) {
  throw new Error('Expected even positive dimensions, integer fps and a valid [start-frame,end-frame) range.');
}
const FRAME_BYTES = W * H * 4;
const COUNT = LAST - FIRST;
const DURATION = COUNT / FPS;
if (!STILL_ARG && DURATION > 12) throw new Error('Review-only exporter is limited to twelve seconds; full-film output is not authorized.');
if (!STILL_ARG && !VIDEO_ONLY) throw new Error('Render silent, then stream-copy the existing music segment with render-reel.mjs.');
const AUDIO = path.join(ROOT, 'media/audio/mili-world-execute-original-bilibili.m4a');
const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const FFMPEG = arg('ffmpeg', path.join(ROOT, '.cache/python/imageio_ffmpeg/binaries/ffmpeg-win-x86_64-v9.0.2.exe'));
if (!fs.existsSync(FFMPEG)) throw new Error(`ffmpeg missing: ${FFMPEG}`);
if (!STILL_ARG && !VIDEO_ONLY && !fs.existsSync(AUDIO)) throw new Error(`Source audio missing: ${AUDIO}`);

let ff = null;
let ffDone = null;
let ffLog = '';
let received = 0;
let failure = null;
let frameActive = false;
const started = Date.now();
const mime = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.css': 'text/css', '.m4a': 'audio/mp4', '.mp4':'video/mp4' };
const server = http.createServer(async (req, res) => {
  try {
    const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    if (req.method === 'POST' && pathname === '/__frame') {
      if (!ff || failure) throw new Error('Encoder unavailable');
      if (frameActive) throw new Error('Concurrent frame writes are forbidden');
      if (Number(req.headers['x-frame-index']) !== FIRST + received) throw new Error('Unexpected frame order');
      frameActive = true;
      let bytes = 0;
      const chunks = [];
      const maxBytes = TRANSPORT === 'rgba' ? FRAME_BYTES : FRAME_BYTES + 1024 * 1024;
      for await (const chunk of req) {
        if (bytes + chunk.length > maxBytes) throw new Error('Oversized frame');
        chunks.push(chunk);
        bytes += chunk.length;
      }
      if (TRANSPORT === 'rgba' && bytes !== FRAME_BYTES) throw new Error(`Frame byte count ${bytes} != ${FRAME_BYTES}`);
      const frame = Buffer.concat(chunks, bytes);
      if (TRANSPORT === 'png' && (bytes < 24 || frame.readUInt32BE(16) !== W || frame.readUInt32BE(20) !== H)) throw new Error('PNG dimensions do not match the native export canvas');
      // One bounded frame buffer avoids thousands of tiny Windows pipe writes.
      // Resolve only after the whole frame is accepted by the encoder pipe.
      await new Promise((resolve, reject) => ff.stdin.write(frame, e => e ? reject(e) : resolve()));
      received++;
      frameActive = false;
      res.writeHead(200, { 'Content-Type': 'text/plain' });
      res.end('ok');
      if (received === 1 || received % 60 === 0 || received === COUNT) {
        const rate = received / ((Date.now() - started) / 1000);
        console.log(`[export] ${received}/${COUNT} frames; ${rate.toFixed(1)} fps; ETA ${Math.ceil((COUNT - received) / Math.max(rate, .01))}s`);
      }
      return;
    }
    if (req.method !== 'GET') { res.writeHead(405); res.end(); return; }
    // Serve only visual source, current project assets and explicit timeline data.
    const allowed = pathname.startsWith('/src/sample/') || pathname.startsWith('/src/sample-v02/') || pathname.startsWith('/src/full/') || pathname.startsWith('/src/mv2/') || pathname.startsWith('/src/mv52/') || pathname.startsWith('/src/mv5cat/') || pathname.startsWith('/src/mv5/') || pathname.startsWith('/src/mv4/') || pathname.startsWith('/src/mv3/') || pathname.startsWith('/assets/') || pathname === '/exports/astra-world-execute-me-final-v5-playback-4k60.mp4' || pathname === '/data/production-v52/audio-accents.json' || pathname === '/data/production-v5/timeline.json' || pathname === '/data/production-v5/lyrics.en-zh.json' || pathname === '/data/production-v2/timeline.json' || pathname === '/data/production-v2/lyrics.en.json' || pathname === '/data/production-v4/timeline.json' || pathname === '/data/production-v4/lyrics.en-zh.json' || pathname === '/data/production-v3/timeline.json' || pathname === '/data/production-v3/lyrics.en-zh.json' || pathname === '/docs/audio/calibrated_timeline.json' || pathname === '/media/audio/mili-world-execute-original-bilibili.m4a';
    if (!allowed) { res.writeHead(403); res.end('Forbidden'); return; }
    const file = path.resolve(ROOT, '.' + pathname);
    if (!file.startsWith(ROOT + path.sep)) throw new Error('Path outside workspace');
    if (!fs.existsSync(file) || !fs.statSync(file).isFile()) { res.writeHead(404); res.end('Not found'); return; }
    res.writeHead(200, { 'Content-Type': mime[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
    fs.createReadStream(file).pipe(res);
  } catch (error) {
    failure = error;
    frameActive = false;
    if (!res.headersSent) res.writeHead(500);
    res.end(String(error.message));
  }
});
server.requestTimeout = 0;
server.headersTimeout = 60000;
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const port = server.address().port;

let browser;
let codec = null;
try {
  const requestedCodec = arg('codec', 'auto');
  if (!STILL_ARG) {
    codec = requestedCodec;
    if (codec === 'auto' || codec === 'h264_nvenc') {
      const probe = spawnSync(FFMPEG, ['-hide_banner', '-loglevel', 'error', '-f', 'lavfi', '-i', `color=black:s=${W}x${H}:r=${FPS}`, '-frames:v', '5', '-c:v', 'h264_nvenc', '-f', 'null', '-'], { encoding: 'utf8' });
      codec = probe.status === 0 ? 'h264_nvenc' : 'libx264';
      if (probe.status !== 0) console.log('[export] NVENC probe failed; using libx264.');
    }
    if (!['h264_nvenc', 'libx264'].includes(codec)) throw new Error(`Unsupported codec: ${codec}`);
    fs.mkdirSync(path.dirname(OUT), { recursive: true });
    const quality = codec === 'h264_nvenc'
      ? ['-preset', 'p6', '-tune', 'hq', '-rc', 'vbr', '-cq', String(arg('quality', 19)), '-b:v', '0', '-profile:v', 'high', '-bf', '2']
      : ['-preset', 'medium', '-crf', String(arg('quality', 18)), '-profile:v', 'high'];
    const videoInput = TRANSPORT === 'png'
      ? ['-f', 'image2pipe', '-framerate', String(FPS), '-vcodec', 'png', '-i', 'pipe:0']
      : ['-f', 'rawvideo', '-pixel_format', 'rgba', '-video_size', `${W}x${H}`, '-framerate', String(FPS), '-i', 'pipe:0'];
    const params = ['-hide_banner', '-loglevel', 'warning', '-y', ...videoInput,
      ...(!VIDEO_ONLY ? ['-ss', (FIRST / FPS).toFixed(9), '-i', AUDIO] : []),
      '-map', '0:v:0', ...(!VIDEO_ONLY ? ['-map', '1:a:0'] : []), '-frames:v', String(COUNT), '-t', DURATION.toFixed(9),
      '-vf', 'scale=out_color_matrix=bt709:out_range=limited,format=yuv420p',
      '-c:v', codec, ...quality, '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709', '-color_range', 'tv',
      ...(!VIDEO_ONLY ? ['-af', `apad=whole_dur=${DURATION.toFixed(9)}`, '-c:a', 'aac', '-b:a', '192k'] : []),
      '-metadata', `comment=ASTRA ${VERSION}; source_start_frame=${FIRST}; source_end_frame_exclusive=${LAST}; source_fps=${FPS}; source_start_seconds=${(FIRST / FPS).toFixed(9)}`,
      '-movflags', '+faststart', OUT];
    ff = spawn(FFMPEG, params, { stdio: ['pipe', 'ignore', 'pipe'] });
    ff.stderr.on('data', b => { ffLog += b.toString(); if (ffLog.length > 16000) ffLog = ffLog.slice(-16000); });
    ff.stdin.on('error', e => { failure = e; });
    ffDone = new Promise((resolve, reject) => {
      ff.on('error', reject);
      ff.on('exit', code => code === 0 ? resolve() : reject(new Error(`ffmpeg exit ${code}: ${ffLog}`)));
    });
    // Keep encoder failure observable while a browser command is pending.
    ffDone.catch(e => { failure = e; });
  }
  browser = await chromium.launch({ executablePath: fs.existsSync(EDGE) ? EDGE : undefined, headless: true,
    args: ['--disable-background-timer-throttling', '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows', '--ignore-gpu-blocklist', '--use-angle=d3d11'] });
  const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
  page.setDefaultTimeout(0);
  page.on('pageerror', e => { failure = e; console.error('[page]', e.message); });
  await page.goto(`http://127.0.0.1:${port}/${ENTRY}?w=${W}&h=${H}&${arg('query','lighting=1')}`, { waitUntil: 'load', timeout: 60000 });
  await page.evaluate(async () => {
    if (!window.sample) throw new Error('window.sample is missing');
    await window.sample.ready;
  });
  const info = await page.evaluate(() => {
    const canvas = window.sample.canvas || document.getElementById('stage');
    return { width: canvas?.width, height: canvas?.height, renderer: window.sample.renderer || 'Canvas2D' };
  });
  if (info.width !== W || info.height !== H) throw new Error(`Renderer canvas ${info.width}x${info.height}, requested ${W}x${H}`);
  console.log(`[export] ${W}x${H} @ ${FPS}; song ${(FIRST/FPS).toFixed(6)}–${(LAST/FPS).toFixed(6)}; ${info.renderer}; ${ENTRY}`);
  if (STILL_ARG) {
    fs.mkdirSync(OUT, { recursive: true });
    const times = STILL_ARG.split(',').map(Number);
    if (times.some(t => !Number.isFinite(t))) throw new Error('Invalid still time');
    for (const t of times) {
      const png = await page.evaluate(async t => {
        await window.sample.renderFrame(t);
        return (window.sample.canvas || document.getElementById('stage')).toDataURL('image/png').split(',')[1];
      }, t);
      const file = path.join(OUT, `source-${t.toFixed(3).padStart(7, '0')}.png`);
      fs.writeFileSync(file, Buffer.from(png, 'base64'));
      console.log(`[still] ${path.relative(ROOT, file)}`);
    }
  } else {
    const timing = await page.evaluate(async ({ first, last, fps, transport }) => {
      const canvas = window.sample.canvas || document.getElementById('stage');
      const context = canvas.getContext('2d', { willReadFrequently: true });
      if (!context) throw new Error('Export requires a readable Canvas2D stage');
      const ms = { render: 0, readback: 0, transfer_and_encode: 0 };
      for (let frame = first; frame < last; frame++) {
        const before = performance.now();
        await window.sample.renderFrame(frame / fps);
        const rendered = performance.now();
        const pixels = transport === 'png'
          ? await new Promise((resolve, reject) => canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('PNG encode failed')), 'image/png'))
          : context.getImageData(0, 0, canvas.width, canvas.height).data;
        const read = performance.now();
        const response = await fetch('/__frame', { method: 'POST', headers: { 'x-frame-index': String(frame) }, body: pixels });
        if (!response.ok) throw new Error(await response.text());
        ms.render += rendered - before;
        ms.readback += read - rendered;
        ms.transfer_and_encode += performance.now() - read;
      }
      return ms;
    }, { first: FIRST, last: LAST, fps: FPS, transport: TRANSPORT });
    if (failure) throw failure;
    if (received !== COUNT) throw new Error(`Received ${received} of ${COUNT} frames`);
    ff.stdin.end();
    await ffDone;
    const report = { output: path.relative(ROOT, OUT).replaceAll('\\', '/'), entry: ENTRY, width: W, height: H, fps: FPS,
      source_start_frame: FIRST, source_end_frame_exclusive: LAST, encoded_input_frames: received,
      source_start_seconds: FIRST/FPS, intended_duration_seconds: DURATION, codec, transport: TRANSPORT, video_only: VIDEO_ONLY,
      elapsed_seconds: (Date.now()-started)/1000, pipeline_milliseconds: timing, output_bytes: fs.statSync(OUT).size, ffmpeg_log: ffLog.trim(),
      validation_scope: 'Frame input count and encoder success; run verify_sample.py for independent decode and audio comparison.' };
    fs.writeFileSync(OUT.replace(/\.[^.]+$/, '.render.json'), JSON.stringify(report, null, 2) + '\n');
    console.log(`[done] ${path.relative(ROOT, OUT)}; ${(report.output_bytes/1e6).toFixed(1)} MB; ${report.elapsed_seconds.toFixed(1)}s`);
  }
} finally {
  if (browser) await browser.close();
  server.closeAllConnections();
  await new Promise(resolve => server.close(resolve));
  if (ff && ff.exitCode === null) {
    ff.stdin.end();
    if (failure) ff.kill();
    await ffDone.catch(() => {});
  }
}
