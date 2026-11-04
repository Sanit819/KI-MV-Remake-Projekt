/** V2: four independent PNG/Edge/NVENC renders, then one original-audio mux.
 * Full: node tools/render/export_full_v2_parallel.mjs
 * Preview: --width 1920 --height 1080 --out exports/astra-full-v2-1080p60.mp4
 * Test: --frames-per-part 60 --out exports/benchmark-full-v2-4k60.mp4
 * One quarter QA: --part 3 --width 1920 --height 1080 --frames-per-part 120
 * Inspect without rendering/writing: --dry-run true
 * Test mode samples one short interval from each quarter; it is not the full MV.
 * Every final output is independently decoded and checked for audio alignment,
 * and its video packet PTS/DTS are checked across every segment boundary.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';

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
const PART = Number(arg('part', 0));
const DRY_RUN_ARG = String(arg('dry-run', 'false'));
if (!['true', 'false'].includes(DRY_RUN_ARG)) throw new Error('--dry-run must be true or false');
if (![W, H, TEST_FRAMES, PART].every(Number.isInteger) || W <= 0 || H <= 0 || W % 2 || H % 2 || TEST_FRAMES < 0 || TEST_FRAMES > 3200 || (TEST_FRAMES > 0 && TEST_FRAMES < 60) || PART < 0 || PART > 4) {
  throw new Error('Expected even positive dimensions; --frames-per-part is 0 (full) or 60–3200 (test); --part is 0 (all) or 1–4.');
}
const FULL_COUNT = 13100, FULL_DURATION = FULL_COUNT / FPS, ORIGINAL_END = 12740 / FPS;
const label = `${W === 3840 && H === 2160 ? '4k' : `${H}p`}60`;
const defaultName = PART ? `astra-world-execute-me-v2-part-${PART}${TEST_FRAMES ? '-test' : ''}-${label}` : TEST_FRAMES ? `benchmark-full-v2-${label}` : `astra-world-execute-me-full-v2-${label}`;
const OUT = path.resolve(ROOT, arg('out', `exports/${defaultName}.mp4`));
if (!OUT.startsWith(ROOT + path.sep) || path.extname(OUT).toLowerCase() !== '.mp4') throw new Error('Output must be an MP4 within this repository.');
const CACHE = path.join(ROOT, '.cache/full-export-v2', `${W}x${H}`, PART ? `part-${PART}` : 'all', TEST_FRAMES ? `benchmark-${TEST_FRAMES}` : 'complete');
const FFMPEG = path.resolve(ROOT, arg('ffmpeg', '.cache/python/imageio_ffmpeg/binaries/ffmpeg-win-x86_64-v9.0.2.exe'));
const PYTHON = arg('python', fs.existsSync('C:/Users/auscar/miniconda3/python.exe') ? 'C:/Users/auscar/miniconda3/python.exe' : 'python');
const AUDIO = path.join(ROOT, 'media/audio/mili-world-execute-original-bilibili.m4a');
for (const file of [FFMPEG, AUDIO]) if (!fs.existsSync(file)) throw new Error(`Required file missing: ${file}`);
const RANGES = [[0, 3300], [3300, 6600], [6600, 9900], [9900, 13100]];
const parts = RANGES.map(([first, last], index) => ({
  index: index + 1, first, last: TEST_FRAMES ? first + TEST_FRAMES : last,
  file: path.join(CACHE, `part-${String(index + 1).padStart(2, '0')}.mp4`),
})).filter(part => !PART || part.index === PART);
const COUNT = parts.reduce((sum, part) => sum + part.last - part.first, 0);
const DURATION = COUNT / FPS;
const SOURCE_START = PART ? parts[0].first / FPS : 0;
const IS_FULL = !PART && !TEST_FRAMES;
const CONTIGUOUS = Boolean(PART) || !TEST_FRAMES;
const REFERENCE = path.join(CACHE, 'original-with-approved-silence.f32.wav');
if (DRY_RUN_ARG === 'true') {
  console.log(JSON.stringify({dry_run:true,entry:'src/mv2/index.html',output:OUT,cache:CACHE,width:W,height:H,fps:FPS,expected_frames:COUNT,expected_duration_seconds:DURATION,full_v2_frames:FULL_COUNT,full_v2_duration_seconds:FULL_DURATION,source_audio_start_seconds:SOURCE_START,parts,original_audio:AUDIO,approved_added_tail_seconds:6,full_render:IS_FULL,contiguous_source_time:CONTIGUOUS,verification:'exact PTS + complete decode + distributed audio against original with zero-only padding + measured silent tail'},null,2));
  process.exit(0);
}
const REPORT = OUT.replace(/\.[^.]+$/, '.parallel.render.json');
const VERIFY = OUT.replace(/\.[^.]+$/, '.full-verify.json');
const PTS_REPORT = OUT.replace(/\.[^.]+$/, '.timestamps.json');
fs.mkdirSync(CACHE, { recursive: true });
fs.mkdirSync(path.dirname(OUT), { recursive: true });
const started = Date.now();
const report = {
  passed: false, version: 'v2', output: OUT, test_mode: Boolean(TEST_FRAMES), selected_part: PART || null, full_movie: IS_FULL, frames_per_part_test: TEST_FRAMES || null,
  width: W, height: H, fps: FPS, expected_frames: COUNT, expected_duration_seconds: DURATION,
  encoding: { codec: 'h264_nvenc', preset: 'p6', tune: 'hq', cq: 19, rate_control: 'vbr', pixel_format: 'yuv420p', color_space: 'BT.709 limited', transport: 'png', concurrent_parts: parts.length },
  audio: { source: AUDIO, source_sha256: createHash('sha256').update(fs.readFileSync(AUDIO)).digest('hex'), source_start_seconds: SOURCE_START, encode_count: 1, codec: 'aac', bitrate: 192000, concatenate_audio: false, original_timeline_end_seconds: ORIGINAL_END, full_timeline_end_seconds: FULL_DURATION, approved_extension_seconds: 6, padding: 'zero-only apad; no time stretch, loop or music reordering', independent_verification_reference: REFERENCE },
  parts, started_at: new Date().toISOString(),
  scope: TEST_FRAMES && !PART ? 'Short render/concat benchmark: pictures sample separated quarters, continuous audio starts at zero. Not final story/music synchronization approval.' : PART ? 'One contiguous source-song quarter or short sample; audio starts at the same source time. Not complete MV delivery.' : 'Complete v2, 13100 frames, original music followed by approved six-second silent extension. Original audio encoded once; exact PTS, full decode, distributed alignment and silent-tail checks required.',
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

async function paddedReference() {
  // The legacy verifier correctly rejects a source shorter than a video. Build
  // a PCM reference with only approved zero padding; never rewrite the source.
  const result = await run(FFMPEG, ['-hide_banner','-loglevel','error','-y','-i',AUDIO,
    '-map','0:a:0','-vn','-ac','1','-ar','24000','-af',`apad=whole_dur=${FULL_DURATION.toFixed(9)}`,
    '-t',FULL_DURATION.toFixed(9),'-c:a','pcm_f32le',REFERENCE],
    {label:'verification-reference',logFile:path.join(CACHE,'reference.log')});
  requireSuccess(result, 'Original-plus-silence PCM reference');
  report.audio.verification_reference_sha256 = createHash('sha256').update(fs.readFileSync(REFERENCE)).digest('hex');
  report.audio.verification_reference_duration_seconds = FULL_DURATION;
}

function validateSilentTail() {
  const end = SOURCE_START + DURATION;
  if (!CONTIGUOUS || end <= ORIGINAL_END) return {required:false,reason:'This QA selection does not contain the approved extension.'};
  const outputStart = Math.max(0, ORIGINAL_END-SOURCE_START), length = DURATION-outputStart;
  const result = spawnSync(FFMPEG, ['-hide_banner','-loglevel','error','-ss',outputStart.toFixed(9),'-i',OUT,
    '-map','0:a:0','-vn','-t',length.toFixed(9),'-ac','1','-ar','24000','-f','f32le','pipe:1'],
    {cwd:ROOT,windowsHide:true,maxBuffer:Math.ceil(length*24000*4*1.1)+65536});
  if(result.status!==0)throw new Error(`Tail decode failed: ${result.error?.message||result.stderr?.toString()}`);
  const bytes=result.stdout,n=Math.floor(bytes.length/4);let squares=0,peak=0;
  for(let i=0;i<n;i++){const v=bytes.readFloatLE(i*4);if(!Number.isFinite(v))throw new Error('Non-finite tail audio sample');squares+=v*v;peak=Math.max(peak,Math.abs(v));}
  const rmsDb=20*Math.log10(Math.max(1e-15,Math.sqrt(squares/Math.max(1,n))));
  const peakDb=20*Math.log10(Math.max(1e-15,peak));
  const passed=n>=Math.round((length-1/FPS)*24000)&&rmsDb<=-80&&peakDb<=-65;
  const measured={required:true,passed,output_start_seconds:outputStart,source_start_seconds:Math.max(ORIGINAL_END,SOURCE_START),expected_seconds:length,decoded_samples:n,sample_rate:24000,rms_dbfs:rmsDb,peak_dbfs:peakDb,threshold_rms_dbfs:-80,threshold_peak_dbfs:-65};
  if(!passed)throw new Error(`Approved quiet tail failed: ${JSON.stringify(measured)}`);
  return measured;
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
  console.log(`[parallel v2] ${TEST_FRAMES ? 'BENCHMARK' : PART ? 'PART QA' : 'FULL MV'}; ${W}x${H}@60; ${COUNT} frames; ${parts.length} isolated Edge/NVENC jobs`);
  const renderStart = Date.now();
  const results = await Promise.allSettled(parts.map(async part => {
    const child = await run(process.execPath, [
      path.join(ROOT, 'tools/render/export_sample.mjs'), '--entry', 'src/mv2/index.html',
      '--width', String(W), '--height', String(H), '--fps', '60', '--start-frame', String(part.first), '--end-frame', String(part.last),
      '--video-only', 'true', '--transport', 'png', '--codec', 'h264_nvenc', '--quality', '19', '--ffmpeg', FFMPEG, '--out', part.file,
    ], { label: `part-${part.index}`, logFile: path.join(CACHE, `part-${part.index}.log`) });
    requireSuccess(child, `Part ${part.index}`);
    const result = JSON.parse(fs.readFileSync(part.file.replace(/\.[^.]+$/, '.render.json'), 'utf8'));
    if (result.entry !== 'src/mv2/index.html' || !result.video_only || result.codec !== 'h264_nvenc' || result.encoded_input_frames !== part.last - part.first || result.width !== W || result.height !== H || result.fps !== FPS) {
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
    '-hide_banner', '-loglevel', 'warning', '-y', '-f', 'concat', '-safe', '1', '-i', concatFile, '-ss', SOURCE_START.toFixed(9), '-i', AUDIO,
    '-map', '0:v:0', '-map', '1:a:0', '-frames:v', String(COUNT), '-t', DURATION.toFixed(9), '-c:v', 'copy',
    '-af', `apad=whole_dur=${DURATION.toFixed(9)}`, '-c:a', 'aac', '-b:a', '192k',
    '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709', '-color_range', 'tv',
    '-video_track_timescale', '60000', '-metadata', `comment=ASTRA full MV v2; ${parts.length} PNG/NVENC video-only parts; original audio encoded once; approved quiet extension=6s; frames=${COUNT}; fps=60; source_start=${SOURCE_START}; benchmark=${Boolean(TEST_FRAMES)}; part=${PART||'all'}`,
    '-movflags', '+faststart', OUT,
  ], { label: 'mux', logFile: path.join(CACHE, 'mux.log') });
  requireSuccess(mux, 'Final concat and single-audio mux');
  report.mux_elapsed_seconds = (Date.now() - muxStart) / 1000;
  report.timestamps = await validateTimestamps();
  report.silent_tail = validateSilentTail();
  await paddedReference();

  const verifyArgs = [path.join(ROOT, 'tools/render/verify_full_mv.py'), OUT, '--width', String(W), '--height', String(H), '--fps', '60', '--frames', String(COUNT), '--source-start',String(SOURCE_START),'--ffmpeg', FFMPEG, '--audio', REFERENCE, '--out', VERIFY];
  if (TEST_FRAMES && !PART) {
    const interval = TEST_FRAMES / FPS;
    const window = Math.min(.75, interval / 2);
    verifyArgs.push('--window-length', String(window), '--windows', ...[1, 2, 3].map(index => String(index * interval - window / 2)));
  } else if(PART) {
    const window = Math.min(2.5,DURATION/5);
    const last = Math.min(DURATION-window-.151,207.8-SOURCE_START-window);
    const windows = [...new Set([.25,DURATION*.25,DURATION*.55,DURATION*.8].map(x=>Math.max(.15,Math.min(x,last))).map(x=>Number(x.toFixed(6))))];
    if(last<.15)throw new Error('Single-part QA has no reliable non-silent alignment window. Use a selection within the sung portion.');
    verifyArgs.push('--window-length',String(window),'--windows',...windows.map(String));
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
  console.log(`[done v2] ${COUNT} frames; render ${report.render_elapsed_seconds.toFixed(2)}s (${report.aggregate_render_fps.toFixed(1)} fps aggregate), all steps ${report.elapsed_seconds.toFixed(2)}s. PTS + full decode + audio alignment + applicable quiet-tail checks passed.`);
} catch (error) {
  report.error = error.message;
  report.elapsed_seconds = (Date.now() - started) / 1000;
  saveReport();
  throw error;
}
