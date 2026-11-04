/** Four independent PNG/Edge/NVENC renders, then one original-audio mux.
 * Full: node tools/render/export_full_parallel.mjs --out exports/astra-full-4k60.mp4
 * Test: node tools/render/export_full_parallel.mjs --frames-per-part 60 --out exports/benchmark-full-parallel-4k60.mp4
 * Test mode samples one short interval from each quarter; it is not the full MV.
 * Every final output is independently decoded and checked for audio alignment,
 * and its video packet PTS/DTS are checked across every segment boundary.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const argv = process.argv.slice(2);
function arg(name, fallback) {
  const index = argv.indexOf(`--${name}`);
  return index < 0 ? fallback : argv[index + 1];
}
const FPS = 60;
const W = Number(arg('width', 3840));
const H = Number(arg('height', 2160));
const TEST_FRAMES = Number(arg('frames-per-part', 0));
if (![W, H, TEST_FRAMES].every(Number.isInteger) || W <= 0 || H <= 0 || W % 2 || H % 2 || TEST_FRAMES < 0 || TEST_FRAMES > 3180 || (TEST_FRAMES > 0 && TEST_FRAMES < 30)) {
  throw new Error('Expected even positive dimensions; --frames-per-part must be 0 (full), or 30–3180 (test).');
}
const OUT = path.resolve(ROOT, arg('out', TEST_FRAMES ? 'exports/benchmark-full-parallel-4k60.mp4' : 'exports/astra-world-execute-me-full-v1-4k60.mp4'));
if (!OUT.startsWith(ROOT + path.sep) || path.extname(OUT).toLowerCase() !== '.mp4') throw new Error('Output must be an MP4 within this repository.');
const CACHE = path.join(ROOT, '.cache/full-export-v1', ...(TEST_FRAMES ? [`benchmark-${TEST_FRAMES}`] : []));
const FFMPEG = path.resolve(ROOT, arg('ffmpeg', '.cache/python/imageio_ffmpeg/binaries/ffmpeg-win-x86_64-v9.0.2.exe'));
const PYTHON = arg('python', fs.existsSync('C:/Users/auscar/miniconda3/python.exe') ? 'C:/Users/auscar/miniconda3/python.exe' : 'python');
const AUDIO = path.join(ROOT, 'media/audio/mili-world-execute-original-bilibili.m4a');
for (const file of [FFMPEG, AUDIO]) if (!fs.existsSync(file)) throw new Error(`Required file missing: ${file}`);
const RANGES = [[0, 3180], [3180, 6360], [6360, 9540], [9540, 12740]];
const parts = RANGES.map(([first, last], index) => ({
  index: index + 1, first, last: TEST_FRAMES ? first + TEST_FRAMES : last,
  file: path.join(CACHE, `part-${String(index + 1).padStart(2, '0')}.mp4`),
}));
const COUNT = parts.reduce((sum, part) => sum + part.last - part.first, 0);
const DURATION = COUNT / FPS;
const REPORT = OUT.replace(/\.[^.]+$/, '.parallel.render.json');
const VERIFY = OUT.replace(/\.[^.]+$/, '.full-verify.json');
const PTS_REPORT = OUT.replace(/\.[^.]+$/, '.timestamps.json');
fs.mkdirSync(CACHE, { recursive: true });
fs.mkdirSync(path.dirname(OUT), { recursive: true });
const started = Date.now();
const report = {
  passed: false, output: OUT, test_mode: Boolean(TEST_FRAMES), frames_per_part_test: TEST_FRAMES || null,
  width: W, height: H, fps: FPS, expected_frames: COUNT, expected_duration_seconds: DURATION,
  encoding: { codec: 'h264_nvenc', preset: 'p6', tune: 'hq', cq: 19, rate_control: 'vbr', pixel_format: 'yuv420p', color_space: 'BT.709 limited', transport: 'png', concurrent_parts: 4 },
  audio: { source: AUDIO, source_start_seconds: 0, encode_count: 1, codec: 'aac', bitrate: 192000, concatenate_audio: false },
  parts, started_at: new Date().toISOString(),
  scope: TEST_FRAMES ? 'Short render/concat benchmark. Pictures sample separated song quarters; continuous audio starts at zero to test mux alignment across video segment joins. Not a final story/music synchronization approval.' : 'Complete frame intervals with original song audio muxed once. Independent decode/audio and exact video timestamps required before success.',
};
function saveReport() { fs.writeFileSync(REPORT, JSON.stringify(report, null, 2) + '\n'); }

function run(command, args, { label, logFile, quiet = false, onLine } = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd: ROOT, stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true });
    const log = logFile ? fs.createWriteStream(logFile) : null;
    let stdout = '', stderr = '', pendingStdout = '', pendingStderr = '';
    function data(bytes, stream) {
      const text = bytes.toString();
      log?.write(text);
      if (stream === 'stdout') stdout = (stdout + text).slice(-32000);
      else stderr = (stderr + text).slice(-32000);
      let pending = (stream === 'stdout' ? pendingStdout : pendingStderr) + text;
      const lines = pending.split(/\r?\n/);
      pending = lines.pop();
      if (stream === 'stdout') pendingStdout = pending; else pendingStderr = pending;
      for (const line of lines) {
        onLine?.(line, stream);
        if (!quiet && line.trim()) console.log(`[${label || 'process'}] ${line}`);
      }
    }
    child.stdout.on('data', bytes => data(bytes, 'stdout'));
    child.stderr.on('data', bytes => data(bytes, 'stderr'));
    child.on('error', error => { log?.end(); reject(error); });
    child.on('close', code => {
      if (pendingStdout) onLine?.(pendingStdout, 'stdout');
      if (pendingStderr) onLine?.(pendingStderr, 'stderr');
      log?.end();
      resolve({ code, stdout, stderr });
    });
  });
}
function requireSuccess(result, label) {
  if (result.code !== 0) throw new Error(`${label} exited ${result.code}: ${result.stderr || result.stdout}`);
}

async function validateTimestamps() {
  const packets = [];
  let stream = '';
  const trace = await run(FFMPEG, ['-hide_banner', '-debug_ts', '-i', OUT, '-map', '0:v:0', '-an', '-c:v', 'copy', '-f', 'null', '-'], {
    label: 'timestamps', quiet: true, logFile: path.join(CACHE, 'timestamp-debug.log'),
    onLine(line) {
      if (!stream && /Stream #0:0.*Video:/.test(line)) stream = line.trim();
      const match = line.match(/demuxer ->.*type:video pkt_pts:(-?\d+) pkt_pts_time:\S+ pkt_dts:(-?\d+) pkt_dts_time:\S+ duration:(\d+)/);
      if (match) packets.push({ pts: Number(match[1]), dts: Number(match[2]), duration: Number(match[3]) });
    },
  });
  requireSuccess(trace, 'Timestamp stream-copy scan');
  const tbnText = stream.match(/, ([\d.]+)(k?) tbn/);
  const timebaseDenominator = tbnText ? Number(tbnText[1]) * (tbnText[2] ? 1000 : 1) : null;
  const step = 60000 / FPS;
  const presentation = packets.map(packet => packet.pts).sort((a, b) => a - b);
  const checks = {
    timescale_60000: timebaseDenominator === 60000,
    exact_packet_count: packets.length === COUNT,
    every_pts_exactly_one_sixtieth: presentation.length === COUNT && presentation.every((pts, index) => pts === index * step),
    every_packet_duration_one_sixtieth: packets.length === COUNT && packets.every(packet => packet.duration === step),
    strictly_increasing_dts: packets.length === COUNT && packets.every((packet, index) => index === 0 || packet.dts > packets[index - 1].dts),
  };
  let cumulative = 0;
  const boundaries = parts.slice(0, -1).map(part => {
    cumulative += part.last - part.first;
    return { output_frame: cumulative, seconds: cumulative / FPS, expected_pts: cumulative * step,
      previous_pts: presentation[cumulative - 1], actual_pts: presentation[cumulative], next_pts: presentation[cumulative + 1] };
  });
  const result = { passed: Object.values(checks).every(Boolean), checks, video_stream: stream, timebase_denominator: timebaseDenominator,
    decoded_packet_count: packets.length, expected_packet_count: COUNT, first_pts: presentation[0], last_pts: presentation.at(-1),
    first_dts: packets[0]?.dts, last_dts: packets.at(-1)?.dts, boundaries,
    scope: 'Actual output video packet PTS cover every n/60 exactly, with no duplicate/gap and strictly increasing decode timestamps. Full pixel/audio decode is checked separately.' };
  fs.writeFileSync(PTS_REPORT, JSON.stringify(result, null, 2) + '\n');
  if (!result.passed) throw new Error(`Timestamp checks failed: ${JSON.stringify(checks)}`);
  return result;
}

saveReport();
try {
  console.log(`[parallel] ${TEST_FRAMES ? 'BENCHMARK' : 'FULL MV'}; ${W}x${H}@60; ${COUNT} frames; four separate Edge/NVENC jobs`);
  const renderStart = Date.now();
  const results = await Promise.allSettled(parts.map(async part => {
    const child = await run(process.execPath, [
      path.join(ROOT, 'tools/render/export_sample.mjs'), '--entry', 'src/full/index.html',
      '--width', String(W), '--height', String(H), '--fps', '60', '--start-frame', String(part.first), '--end-frame', String(part.last),
      '--video-only', 'true', '--transport', 'png', '--codec', 'h264_nvenc', '--quality', '19', '--ffmpeg', FFMPEG, '--out', part.file,
    ], { label: `part-${part.index}`, logFile: path.join(CACHE, `part-${part.index}.log`) });
    requireSuccess(child, `Part ${part.index}`);
    const result = JSON.parse(fs.readFileSync(part.file.replace(/\.[^.]+$/, '.render.json'), 'utf8'));
    if (!result.video_only || result.codec !== 'h264_nvenc' || result.encoded_input_frames !== part.last - part.first || result.width !== W || result.height !== H || result.fps !== FPS) {
      throw new Error(`Part ${part.index} did not preserve video-only/native/NVENC/frame-count requirements`);
    }
    const metadata = await run(FFMPEG, ['-hide_banner', '-i', part.file], { quiet: true });
    if (/Stream #.*Audio:/.test(metadata.stderr)) throw new Error(`Part ${part.index} unexpectedly contains audio`);
    const video = metadata.stderr.split(/\r?\n/).find(line => /Stream #.*Video:/.test(line)) || '';
    if (!/h264 \(High\).*yuv420p\(tv, bt709/.test(video)) throw new Error(`Part ${part.index} is not High-profile 8-bit 4:2:0 BT.709: ${video}`);
    part.render_report = result;
    part.video_stream = video.trim();
    return result;
  }));
  report.render_elapsed_seconds = (Date.now() - renderStart) / 1000;
  report.aggregate_render_fps = COUNT / report.render_elapsed_seconds;
  const errors = results.map((result, index) => result.status === 'rejected' ? `part ${index + 1}: ${result.reason.message}` : null).filter(Boolean);
  if (errors.length) throw new Error(errors.join('\n'));
  report.estimated_sequential_render_seconds = parts.reduce((sum, part) => sum + part.render_report.elapsed_seconds, 0);
  report.render_speedup_vs_sum_of_child_times = report.estimated_sequential_render_seconds / report.render_elapsed_seconds;
  saveReport();

  // Relative safe paths; explicit video-only durations eliminate audio encoder
  // priming/padding from concat offsets. The original music is input only once.
  const concatFile = path.join(CACHE, 'video-parts.ffconcat');
  fs.writeFileSync(concatFile, 'ffconcat version 1.0\n' + parts.map(part => `file '${path.basename(part.file)}'\nduration ${((part.last - part.first) / FPS).toFixed(9)}\n`).join(''));
  const muxStart = Date.now();
  const mux = await run(FFMPEG, [
    '-hide_banner', '-loglevel', 'warning', '-y', '-f', 'concat', '-safe', '1', '-i', concatFile, '-i', AUDIO,
    '-map', '0:v:0', '-map', '1:a:0', '-frames:v', String(COUNT), '-t', DURATION.toFixed(9), '-c:v', 'copy',
    '-af', `apad=whole_dur=${DURATION.toFixed(9)}`, '-c:a', 'aac', '-b:a', '192k',
    '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709', '-color_range', 'tv',
    '-video_track_timescale', '60000', '-metadata', `comment=ASTRA full v05; four PNG/NVENC video-only parts; original audio encoded once; frames=${COUNT}; fps=60; benchmark=${Boolean(TEST_FRAMES)}`,
    '-movflags', '+faststart', OUT,
  ], { label: 'mux', logFile: path.join(CACHE, 'mux.log') });
  requireSuccess(mux, 'Final concat and single-audio mux');
  report.mux_elapsed_seconds = (Date.now() - muxStart) / 1000;
  report.timestamps = await validateTimestamps();

  const verifyArgs = [path.join(ROOT, 'tools/render/verify_full_mv.py'), OUT, '--width', String(W), '--height', String(H), '--frames', String(COUNT), '--ffmpeg', FFMPEG, '--audio', AUDIO, '--out', VERIFY];
  if (TEST_FRAMES) {
    const interval = TEST_FRAMES / FPS;
    const window = Math.min(.75, interval / 2);
    verifyArgs.push('--window-length', String(window), '--windows', ...[1, 2, 3].map(index => String(index * interval - window / 2)));
  }
  const verified = await run(PYTHON, verifyArgs, { label: 'verify', logFile: path.join(CACHE, 'verify.log') });
  requireSuccess(verified, 'Independent full decode/audio verification');
  const verification = JSON.parse(fs.readFileSync(VERIFY, 'utf8'));
  if (!verification.passed) throw new Error('Independent verification report did not pass');
  report.verification_report = VERIFY;
  report.timestamp_report = PTS_REPORT;
  report.output_bytes = fs.statSync(OUT).size;
  report.elapsed_seconds = (Date.now() - started) / 1000;
  report.passed = true;
  saveReport();
  console.log(`[done] ${COUNT} frames; render ${report.render_elapsed_seconds.toFixed(2)}s (${report.aggregate_render_fps.toFixed(1)} fps aggregate), all steps ${report.elapsed_seconds.toFixed(2)}s. PTS + full decode + audio alignment passed.`);
} catch (error) {
  report.error = error.message;
  report.elapsed_seconds = (Date.now() - started) / 1000;
  saveReport();
  throw error;
}
