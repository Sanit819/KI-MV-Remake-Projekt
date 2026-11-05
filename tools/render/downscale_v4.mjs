/** Derive 1080p60 from a completed, verified ASTRA v4 4K master.
 * Run only after the master exporter reports success:
 *   node tools/render/downscale_v4.mjs
 * Optional: --master exports/custom-4k.mp4 --out exports/custom-1080p.mp4
 * Never renders browser frames or rewrites the master/source/reference.
 */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawn} from 'node:child_process';
import {createHash} from 'node:crypto';

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const argv=process.argv.slice(2);
const allowed=new Set(['--master','--out','--ffmpeg','--python']);
for(let i=0;i<argv.length;i+=2){
  if(!allowed.has(argv[i])||!argv[i+1]||argv[i+1].startsWith('--'))throw Error(`Expected supported --name value arguments; found ${argv[i]}`);
}
const arg=(key,fallback)=>{const i=argv.indexOf(`--${key}`);return i<0?fallback:argv[i+1];};
const FPS=60,COUNT=13100,W=1920,H=1080,DURATION=COUNT/FPS;
const MASTER=path.resolve(ROOT,arg('master','exports/astra-world-execute-me-full-v4-4k60.mp4'));
const OUT=path.resolve(ROOT,arg('out','exports/astra-world-execute-me-full-v4-1080p60.mp4'));
const FFMPEG=path.resolve(ROOT,arg('ffmpeg','.cache/python/imageio_ffmpeg/binaries/ffmpeg-win-x86_64-v9.0.2.exe'));
const PYTHON=arg('python',fs.existsSync('C:/Users/auscar/miniconda3/python.exe')?'C:/Users/auscar/miniconda3/python.exe':'python');
const withinRepo=file=>{const relative=path.relative(ROOT,file);return relative!==''&&!relative.startsWith(`..${path.sep}`)&&relative!=='..'&&!path.isAbsolute(relative);};
for(const file of [MASTER,OUT])if(!withinRepo(file)||path.extname(file).toLowerCase()!=='.mp4')throw Error('Master and output must be MP4 files inside the repository.');
if(MASTER.toLowerCase()===OUT.toLowerCase())throw Error('The derivative must not overwrite the 4K master.');
const reportFile=OUT.replace(/\.[^.]+$/,'.downscale.render.json');
const verifyFile=OUT.replace(/\.[^.]+$/,'.full-verify.json');
const ptsFile=OUT.replace(/\.[^.]+$/,'.timestamps.json');
const masterReportFile=MASTER.replace(/\.[^.]+$/,'.parallel.render.json');
const stamp=new Date().toISOString().replace(/[:.]/g,'-');
const CACHE=path.join(ROOT,'.cache/downscale-v4',stamp);
const started=Date.now();
const report={passed:false,phase:'preflight',version:'v4',source_master:MASTER,output:OUT,
  expected_frames:COUNT,expected_fps:FPS,expected_resolution:[W,H],expected_duration_seconds:DURATION,
  encoding:{video_codec:'h264_nvenc',preset:'p6',tune:'hq',rate_control:'vbr',cq:19,scaler:'lanczos',pixel_format:'yuv420p',color_space:'BT.709 limited',fps_mode:'passthrough',audio:'copy; no re-encoding'},
  master_render_report:masterReportFile,logs:CACHE,started_at:new Date().toISOString(),
  scope:'1080p60 derivative of a verified 4K master. Complete frame/audio decode, distributed audio alignment, every video packet timestamp, and exact AAC payload equality are checked. No browser render or continuous visual review.'};

function save(){fs.writeFileSync(reportFile,JSON.stringify(report,null,2)+'\n');}
function phase(value){report.phase=value;save();console.log(`[downscale v4] ${value}`);}
function readJson(file){return JSON.parse(fs.readFileSync(file,'utf8'));}
async function sha256(file){const hash=createHash('sha256');for await(const chunk of fs.createReadStream(file))hash.update(chunk);return hash.digest('hex');}
function requireSuccess(result,label){if(result.code!==0)throw Error(`${label} exited ${result.code}: ${result.stderr||result.stdout}`);}
function run(command,args,{label='process',quiet=false,onLine}={}){
  return new Promise((resolve,reject)=>{
    const child=spawn(command,args,{cwd:ROOT,stdio:['ignore','pipe','pipe'],windowsHide:true});
    const log=fs.createWriteStream(path.join(CACHE,`${label}.log`));
    let stdout='',stderr='',outPending='',errPending='',spawnError=null;
    function receive(bytes,stream){
      const text=bytes.toString();log.write(text);
      if(stream==='stdout')stdout=(stdout+text).slice(-32000);else stderr=(stderr+text).slice(-32000);
      const lines=((stream==='stdout'?outPending:errPending)+text).split(/\r?\n|\r/);
      const pending=lines.pop();if(stream==='stdout')outPending=pending;else errPending=pending;
      for(const line of lines){onLine?.(line,stream);if(!quiet&&line.trim())console.log(`[${label}] ${line}`);}
    }
    child.stdout.on('data',bytes=>receive(bytes,'stdout'));
    child.stderr.on('data',bytes=>receive(bytes,'stderr'));
    child.on('error',error=>{spawnError=error;});
    child.on('close',code=>{
      if(outPending)onLine?.(outPending,'stdout');if(errPending)onLine?.(errPending,'stderr');
      log.end(()=>spawnError?reject(spawnError):resolve({code,stdout,stderr}));
    });
  });
}
async function audioPacketHash(file,label){
  const result=await run(FFMPEG,['-hide_banner','-loglevel','error','-i',file,'-map','0:a:0','-c:a','copy','-f','hash','-hash','sha256','-'],{label,quiet:true});
  requireSuccess(result,label);
  const hash=result.stdout.match(/^SHA256=([a-f0-9]{64})\s*$/im)?.[1]?.toLowerCase();
  if(!hash)throw Error(`No audio packet SHA256 returned for ${file}`);
  return hash;
}
async function timestamps(){
  const packets=[];let stream='';
  const result=await run(FFMPEG,['-hide_banner','-debug_ts','-i',OUT,'-map','0:v:0','-an','-c:v','copy','-f','null','-'],{
    label:'timestamp-debug',quiet:true,onLine(line){
      if(!stream&&/Stream #0:0.*Video:/.test(line))stream=line.trim();
      const m=line.match(/demuxer ->.*type:video pkt_pts:(-?\d+) pkt_pts_time:\S+ pkt_dts:(-?\d+) pkt_dts_time:\S+ duration:(\d+)/);
      if(m)packets.push({pts:Number(m[1]),dts:Number(m[2]),duration:Number(m[3])});
    },
  });
  requireSuccess(result,'Video packet timestamp scan');
  const tbn=stream.match(/, ([\d.]+)(k?) tbn/),denominator=tbn?Number(tbn[1])*(tbn[2]?1000:1):null;
  const sorted=packets.map(p=>p.pts).sort((a,b)=>a-b),step=60000/FPS;
  const checks={timescale_60000:denominator===60000,exact_packet_count:packets.length===COUNT,
    every_pts_exactly_one_sixtieth:sorted.length===COUNT&&sorted.every((v,i)=>v===i*step),
    every_packet_duration_one_sixtieth:packets.length===COUNT&&packets.every(p=>p.duration===step),
    strictly_increasing_dts:packets.length===COUNT&&packets.every((p,i)=>i===0||p.dts>packets[i-1].dts),
    high_profile_8bit_420_bt709_limited:/h264 \(High\).*yuv420p\(tv, bt709/.test(stream)};
  const value={passed:Object.values(checks).every(Boolean),checks,video_stream:stream,timebase_denominator:denominator,
    expected_packet_count:COUNT,actual_packet_count:packets.length,first_pts:sorted[0],last_pts:sorted.at(-1),first_dts:packets[0]?.dts,last_dts:packets.at(-1)?.dts,
    former_concat_boundaries:[3300,6600,9900].map(frame=>({frame,seconds:frame/FPS,previous_pts:sorted[frame-1],pts:sorted[frame],next_pts:sorted[frame+1]})),
    scope:'Every presentation timestamp equals n/60 with no missing or duplicate frames. B-frame negative initial DTS is allowed; subsequent DTS must strictly increase.'};
  fs.writeFileSync(ptsFile,JSON.stringify(value,null,2)+'\n');
  if(!value.passed)throw Error(`Timestamp/color checks failed: ${JSON.stringify(checks)}`);
  return value;
}

fs.mkdirSync(path.dirname(OUT),{recursive:true});fs.mkdirSync(CACHE,{recursive:true});save();
try{
  for(const file of [MASTER,masterReportFile,FFMPEG])if(!fs.existsSync(file))throw Error(`Required file missing: ${file}`);
  const masterReport=readJson(masterReportFile);
  if(!masterReport.passed||!masterReport.full_movie||masterReport.test_mode||masterReport.expected_frames!==COUNT||masterReport.width!==3840||masterReport.height!==2160||masterReport.fps!==FPS)throw Error('The 4K full v4 master has not passed its complete export. Wait for the master exporter to finish successfully.');
  if(path.resolve(masterReport.output).toLowerCase()!==MASTER.toLowerCase())throw Error('Master report refers to another output.');
  if(!masterReport.timestamps?.passed||!masterReport.silent_tail?.passed||!masterReport.silent_tail.required)throw Error('Master lacks passed timestamp and approved-silence measurements.');
  const masterVerificationFile=path.resolve(masterReport.verification_report||MASTER.replace(/\.[^.]+$/,'.full-verify.json'));
  const masterVerification=readJson(masterVerificationFile);
  if(!masterVerification.passed||masterVerification.decoded_video_frames!==COUNT||masterVerification.expected_fps!==FPS||masterVerification.expected_resolution?.join('x')!=='3840x2160')throw Error('Master full-decode/audio verification is absent or mismatched.');
  const reference=path.resolve(masterReport.audio.independent_verification_reference);
  const originalAudio=path.resolve(masterReport.audio.source);
  if(!withinRepo(reference)||!withinRepo(originalAudio))throw Error('Verification audio must remain inside this repository.');
  report.source_master_sha256=await sha256(MASTER);
  if(report.source_master_sha256!==masterVerification.video_sha256)throw Error('Master bytes changed after its complete verification.');
  report.reference_audio={path:reference,sha256:await sha256(reference),original:originalAudio,original_sha256:await sha256(originalAudio),source_start_seconds:0};
  if(report.reference_audio.sha256!==masterReport.audio.verification_reference_sha256||report.reference_audio.original_sha256!==masterReport.audio.source_sha256)throw Error('Original audio or its zero-padded verification reference changed after the master export.');
  report.master_verification_report=masterVerificationFile;
  report.master_silent_tail_measurement=masterReport.silent_tail;
  phase('hashing_master_audio');
  const masterAudioHash=await audioPacketHash(MASTER,'master-audio-hash');

  phase('downscaling');const transcodeStart=Date.now();
  const converted=await run(FFMPEG,['-hide_banner','-y','-i',MASTER,'-map','0:v:0','-map','0:a:0',
    '-vf','scale=1920:1080:flags=lanczos:in_color_matrix=bt709:out_color_matrix=bt709:in_range=limited:out_range=limited,format=yuv420p',
    '-fps_mode','passthrough','-c:v','h264_nvenc','-preset','p6','-tune','hq','-rc','vbr','-cq','19','-b:v','0','-profile:v','high','-bf','2',
    '-c:a','copy','-colorspace','bt709','-color_primaries','bt709','-color_trc','bt709','-color_range','tv',
    '-video_track_timescale','60000','-map_metadata','0',
    '-metadata','comment=ASTRA full MV v4; 1080p60 derived from verified 4K master; 13100 frames; master AAC copied without re-encoding; approved quiet extension=6s',
    '-movflags','+faststart',OUT],{label:'transcode'});
  requireSuccess(converted,'1080p60 conversion');report.transcode_elapsed_seconds=(Date.now()-transcodeStart)/1000;
  phase('checking_timestamps');report.timestamps=await timestamps();report.timestamp_report=ptsFile;
  phase('checking_audio_payload');
  const outputAudioHash=await audioPacketHash(OUT,'derivative-audio-hash');
  report.audio_payload={passed:masterAudioHash===outputAudioHash,algorithm:'SHA256',method:'FFmpeg hash muxer of copied audio packet bytes',master:masterAudioHash,derivative:outputAudioHash};
  if(!report.audio_payload.passed)throw Error('Derivative AAC payload differs from the verified 4K master.');

  phase('full_decode_and_audio_alignment');
  const verified=await run(PYTHON,[path.join(ROOT,'tools/render/verify_full_mv.py'),OUT,'--width',String(W),'--height',String(H),'--fps',String(FPS),'--frames',String(COUNT),'--source-start','0','--ffmpeg',FFMPEG,'--audio',reference,'--out',verifyFile],{label:'verify'});
  requireSuccess(verified,'Independent complete derivative verification');
  const verification=readJson(verifyFile);
  if(!verification.passed)throw Error('Derivative full verification report did not pass.');
  if(await sha256(MASTER)!==report.source_master_sha256)throw Error('4K master changed during derivative creation.');
  report.verification_report=verifyFile;report.output_sha256=verification.video_sha256;report.output_bytes=fs.statSync(OUT).size;
  report.checks={master_previously_verified:true,master_unchanged:true,all_pts_and_color_checks:report.timestamps.passed,
    identical_audio_packet_payload:report.audio_payload.passed,full_decode_and_distributed_audio_alignment:verification.passed,
    approved_silent_tail_preserved_from_master:report.audio_payload.passed&&masterReport.silent_tail.passed};
  report.passed=Object.values(report.checks).every(Boolean);report.elapsed_seconds=(Date.now()-started)/1000;phase('complete');
  console.log(JSON.stringify({passed:report.passed,output:OUT,report:reportFile,verification:verifyFile,timestamps:ptsFile,frames:COUNT,audio_packet_sha256:outputAudioHash,elapsed_seconds:report.elapsed_seconds},null,2));
}catch(error){
  report.failed_phase=report.phase;report.phase='failed';report.error=error.message;report.elapsed_seconds=(Date.now()-started)/1000;save();throw error;
}
