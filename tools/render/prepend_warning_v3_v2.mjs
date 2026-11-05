/** Purple GPT warning derivatives. Preserve v3, warning-v01 and its exports.
 * Encode only 300 new warning frames. Reuse already verified AAC and ALAC
 * bitstreams; no audio decoding/encoding in this production step.
 * Run --card, inspect it, --export, --proof, then the v2 verification wrapper.
 */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {spawn} from 'node:child_process';
import {createHash} from 'node:crypto';
import {chromium} from 'playwright-core';
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const ASSET=path.join(ROOT,'assets/publishing/warning-v02');
const WORK=path.join(ROOT,'exports/warning-v3-v2');
const FFMPEG=path.join(ROOT,'.cache/python/imageio_ffmpeg/binaries/ffmpeg-win-x86_64-v9.0.2.exe');
const SOURCE_IMAGE='C:/Users/auscar/AppData/Local/Temp/codex-clipboard-f0b3daaa-a2d7-4c8f-befb-f8cc5c499cf8.png';
const AUDIO=path.join(ROOT,'media/audio/mili-world-execute-original-bilibili.m4a');
const reportFile=path.join(WORK,'render.json');
const hash=async f=>{const h=createHash('sha256');for await(const b of fs.createReadStream(f))h.update(b);return h.digest('hex');};
const inputs=['4k60','1080p60'].map((key,i)=>({key,width:i?1920:3840,height:i?1080:2160,input:path.join(ROOT,`exports/astra-world-execute-me-full-v3-${key}.mp4`),output:path.join(ROOT,`exports/astra-world-execute-me-full-v3-warning-v2-${key}.mp4`)}));
fs.mkdirSync(ASSET,{recursive:true});fs.mkdirSync(WORK,{recursive:true});
function run(args,label){return new Promise((resolve,reject)=>{fs.writeFileSync(path.join(WORK,label+'.command.json'),JSON.stringify({executable:FFMPEG,args},null,2)+'\n');const c=spawn(FFMPEG,args,{cwd:ROOT,windowsHide:true,stdio:['ignore','pipe','pipe']}),s=fs.createWriteStream(path.join(WORK,label+'.log'));let err='';c.stdout.on('data',b=>s.write(b));c.stderr.on('data',b=>{s.write(b);err=(err+b).slice(-5000);});c.on('error',reject);c.on('close',n=>s.end(()=>n===0?resolve():reject(Error(`${label}: ${n}\n${err}`))));});}
const color=['-colorspace','bt709','-color_primaries','bt709','-color_trc','bt709','-color_range','tv'];
const enc=['-c:v','h264_nvenc','-preset','p6','-tune','hq','-rc','vbr','-cq','19','-b:v','0','-profile:v','high','-bf','2'];
async function card(){
 const browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true});
 try{const page=await browser.newPage({viewport:{width:1920,height:1080}});await page.goto(pathToFileURL(path.join(ASSET,'card.html')).href);const meta=await page.evaluate(()=>window.cardReady);const bytes=await page.evaluate(()=>document.querySelector('canvas').toDataURL('image/png').split(',')[1]);fs.writeFileSync(path.join(ASSET,'card-4k.png'),Buffer.from(bytes,'base64'));fs.copyFileSync(SOURCE_IMAGE,path.join(ASSET,'user-reference.png'));fs.writeFileSync(path.join(ASSET,'provenance.json'),JSON.stringify({created_at:new Date().toISOString(),method:'Native 3840x2160 Canvas typography and Path2D knot; no ImageGen; screenshot used only as layout reference',knot_source:{existing_repo_file:'assets/astra/v07/interface-openai.svg',existing_repo_sha256:await hash(path.join(ROOT,'assets/astra/v07/interface-openai.svg')),original_repo_file:'assets/astra/openai-blossom.svg',derived_file:'gpt-openwork.svg',path_geometry_unchanged:true,fill:'#b88ce8',stroke_removed:true,outer_circle:false,background_disc:false},user_reference:{original_path:SOURCE_IMAGE,preserved_file:'user-reference.png',sha256:await hash(SOURCE_IMAGE)},card:{file:'card-4k.png',sha256:await hash(path.join(ASSET,'card-4k.png')),...meta},request:'5 seconds stable silent warning; same exact English and Chinese; ASTRA deep purple palette; official openwork GPT knot replaces top star; no circle/disc; ivory text and small gold divider accent; old card and outputs preserved'},null,2)+'\n');console.log('Native 4K card ready:',path.join(ASSET,'card-4k.png'));}finally{await browser.close();}
}
async function exportCopies(){
 const begun=Date.now();
 const priorAAC=JSON.parse(fs.readFileSync(path.join(ROOT,'exports/warning-v3/render.json'),'utf8'));
 const priorLossless=JSON.parse(fs.readFileSync(path.join(ROOT,'exports/warning-v3-hires/render.json'),'utf8'));
 for(const dir of ['warning-v3','warning-v3-hires'])if(!JSON.parse(fs.readFileSync(path.join(ROOT,'exports',dir,'verification.json'),'utf8')).passed)throw Error('Missing verified prior '+dir);
 if(await hash(priorAAC.audio.encoded_once)!==priorAAC.audio.encoded_sha256)throw Error('Verified AAC changed');
 if(await hash(priorLossless.audio.encoded_once)!==priorLossless.audio.encoded_file_sha256)throw Error('Verified ALAC changed');
 const report={passed:false,phase:'preflight',started_at:new Date().toISOString(),version:'v3-warning-v2-purple-GPT',fps:60,warning_frames:300,original_frames:13100,total_frames:13400,duration:13400/60,card:{file:path.join(ASSET,'card-4k.png'),sha256:await hash(path.join(ASSET,'card-4k.png'))},audio:{...priorAAC.audio,production_source_decode_count:0,aac_encode_count:0,reused_verified_audio:true,previous_verification:'exports/warning-v3/verification.json'},inputs:[]};
 const save=()=>fs.writeFileSync(reportFile,JSON.stringify(report,null,2)+'\n');
 for(const item of inputs)report.inputs.push({...item,sha256_before:await hash(item.input)});if(report.inputs[0].sha256_before!=='fc5843f714c862d4a405f2a2cee58f958eaeb1597fe872dfe4300d0c1586e90b')throw Error('Unexpected 4K master hash');save();
 try{
  const aac=priorAAC.audio.encoded_once;
  console.log('[warning v2] Reusing verified AAC and ALAC without re-encoding');
  for(const item of report.inputs){
   report.phase=`warning_${item.key}`;save();console.log('[warning] Encoding 300 new warning frames:',item.key);
   const intro=path.join(WORK,`warning-${item.key}.mp4`),originalOnly=path.join(WORK,`original-video-${item.key}.mp4`);
   await run(['-hide_banner','-loglevel','warning','-y','-loop','1','-framerate','60','-i',path.join(ASSET,'card-4k.png'),'-frames:v','300','-an','-vf',`scale=${item.width}:${item.height}:flags=lanczos:out_color_matrix=bt709:out_range=limited,format=yuv420p`,...enc,...color,'-video_track_timescale','60000','-movflags','+faststart',intro],`warning-${item.key}`);
   await run(['-hide_banner','-loglevel','warning','-y','-i',item.input,'-map','0:v:0','-c:v','copy','-an','-video_track_timescale','60000',originalOnly],`original-video-${item.key}`);
   const list=path.join(WORK,`concat-${item.key}.ffconcat`);fs.writeFileSync(list,`ffconcat version 1.0\nfile '${path.basename(intro)}'\nduration 5.000000000\nfile '${path.basename(originalOnly)}'\nduration 218.333333333\n`);
   report.phase=`concat_${item.key}`;save();console.log('[warning] Stream-copy concat:',item.key);
   // auto_convert=0 preserves AVCC packet bytes. Exact packet hashes and full
   // decode must pass, otherwise this is not a successful copy-preserving mux.
   await run(['-hide_banner','-loglevel','warning','-y','-f','concat','-safe','1','-auto_convert','0','-i',list,'-i',aac,'-map','0:v:0','-map','1:a:0','-frames:v','13400','-t','223.333333333','-c:v','copy','-c:a','copy',...color,'-video_track_timescale','60000','-metadata','comment=ASTRA v3 purple GPT warning-v2; 300 stable silent warning frames + original 13100 picture packets stream-copied; existing verified AAC stream-copied without re-encoding; 5s front silence and 6s approved tail; 13400 frames at 60fps','-movflags','+faststart',item.output],`concat-${item.key}`);
   item.output_sha256=await hash(item.output);item.output_bytes=fs.statSync(item.output).size;item.sha256_after=await hash(item.input);item.original_unchanged=item.sha256_before===item.sha256_after;item.video_method='300 new warning frames encoded; original 13100 video packets stream-copied with auto_convert=0; byte equality pending independent verification';save();
  }
  report.phase='export_complete_pending_verification';report.export_succeeded=true;report.elapsed_seconds=(Date.now()-begun)/1000;save();
  const losslessWork=path.join(ROOT,'exports/warning-v3-v2-hires');fs.mkdirSync(losslessWork,{recursive:true});
  const lossless={...priorLossless,passed:false,phase:'mux_pending',started_at:new Date().toISOString(),version:'v3-warning-v2-purple-GPT-hires',card:report.card,audio:{...priorLossless.audio,production_decode_count:0,alac_encode_count:0,reused_verified_audio:true,previous_verification:'exports/warning-v3-hires/verification.json'},inputs:[],verification_report:undefined};
  const saveLossless=()=>fs.writeFileSync(path.join(losslessWork,'render.json'),JSON.stringify(lossless,null,2)+'\n');saveLossless();
  for(const item of report.inputs){
   const target={key:item.key,width:item.width,height:item.height,input:item.output,sha256_before:item.output_sha256,output:path.join(ROOT,`exports/astra-world-execute-me-full-v3-warning-v2-hires-${item.key}.mp4`)};
   console.log('[warning v2] Muxing verified ALAC:',item.key);
   await run(['-hide_banner','-loglevel','warning','-y','-i',target.input,'-i',priorLossless.audio.encoded_once,'-map','0:v:0','-map','1:a:0','-c:v','copy','-c:a','copy','-frames:v','13400','-t','223.333333333','-video_track_timescale','60000','-metadata','comment=ASTRA v3 purple GPT warning-v2; unchanged picture from AAC counterpart; prior verified 192kHz 24bit ALAC audio stream-copied; source provenance and platform acceptance unverified','-movflags','+faststart',target.output],`mux-hires-${item.key}`);
   target.bytes=fs.statSync(target.output).size;target.sha256=await hash(target.output);target.sha256_after=await hash(target.input);target.input_unchanged=target.sha256_after===target.sha256_before;lossless.inputs.push(target);saveLossless();
  }
  lossless.phase='export_complete_pending_verification';lossless.export_succeeded=true;lossless.export_elapsed_seconds=(Date.now()-begun)/1000;saveLossless();
  console.log('Four copies exported; run prepend_warning_v3_v2_verify.py');
 }catch(error){report.phase='failed';report.error=error.message;save();throw error;}
}
async function proofFrames(){
 for(const item of inputs){const dir=path.join(WORK,'visual',item.key);fs.mkdirSync(dir,{recursive:true});await run(['-hide_banner','-nostdin','-y','-i',item.output,'-vf',"select='eq(n,0)+eq(n,150)+eq(n,299)+eq(n,300)+eq(n,301)',scale=1920:1080:flags=lanczos,showinfo",'-fps_mode','vfr','-frames:v','5','-an',path.join(dir,'decoded-%02d.png')],`proof-${item.key}`);fs.writeFileSync(path.join(dir,'frames.json'),JSON.stringify({source:item.output,method:'Sequential decode from start; select original zero-based frame number before scaling; showinfo PTS retained',frames:[0,150,299,300,301].map((frame,i)=>({file:`decoded-${String(i+1).padStart(2,'0')}.png`,source_frame_zero_based:frame,time_seconds:frame/60,expected:frame<300?'warning':'original MV frame '+(frame-300)}))},null,2)+'\n');console.log('[warning] Boundary proof:',item.key);}
}
if(process.argv.includes('--card'))await card();else if(process.argv.includes('--export'))await exportCopies();else if(process.argv.includes('--proof'))await proofFrames();else throw Error('Use --card, --export or --proof');
