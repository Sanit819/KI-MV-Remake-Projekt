/** Stream-copy the verified purple GPT warning and lossless audio onto v4. */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawn} from 'node:child_process';
import {createHash} from 'node:crypto';
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..'),WORK=path.join(ROOT,'exports/warning-v4'),LOSSLESS=path.join(ROOT,'exports/warning-v4-hires');
const FF=path.join(ROOT,'.cache/python/imageio_ffmpeg/binaries/ffmpeg-win-x86_64-v9.0.2.exe');
const hash=async f=>{const h=createHash('sha256');for await(const b of fs.createReadStream(f))h.update(b);return h.digest('hex');};
const read=f=>JSON.parse(fs.readFileSync(path.join(ROOT,f),'utf8'));
function run(args,label){return new Promise((resolve,reject)=>{fs.writeFileSync(path.join(WORK,label+'.command.json'),JSON.stringify(args,null,2));const log=fs.createWriteStream(path.join(WORK,label+'.log')),p=spawn(FF,args,{cwd:ROOT,windowsHide:true,stdio:['ignore','pipe','pipe']});p.stdout.pipe(log,{end:false});p.stderr.pipe(log,{end:false});p.on('error',reject);p.on('close',c=>log.end(()=>c?reject(Error(label+' exit '+c)):resolve()));});}
fs.mkdirSync(WORK,{recursive:true});fs.mkdirSync(LOSSLESS,{recursive:true});
const prior=read('exports/warning-v3-v2/verification.json'),priorLoss=read('exports/warning-v3-v2-hires/verification.json'),aac=read('exports/warning-v3/render.json'),alac=read('exports/warning-v3-hires/render.json');
if(!prior.passed||!priorLoss.passed)throw Error('Previous warning/audio not verified');
if(await hash(aac.audio.encoded_once)!==aac.audio.encoded_sha256||await hash(alac.audio.encoded_once)!==alac.audio.encoded_file_sha256)throw Error('Verified audio file changed');
const report={passed:false,version:'v4-warning',phase:'package',fps:60,warning_frames:300,original_frames:13100,total_frames:13400,duration:13400/60,started_at:new Date().toISOString(),audio:{...aac.audio,production_source_decode_count:0,aac_encode_count:0,reused_verified_audio:true},inputs:[]};
const loss={...alac,passed:false,version:'v4-warning-hires',phase:'package',base_video_template:'exports/astra-world-execute-me-full-v4-{key}.mp4',audio:{...alac.audio,production_decode_count:0,alac_encode_count:0,reused_verified_audio:true},inputs:[],verification_report:undefined};
const save=()=>{fs.writeFileSync(path.join(WORK,'render.json'),JSON.stringify(report,null,2));fs.writeFileSync(path.join(LOSSLESS,'render.json'),JSON.stringify(loss,null,2));};
save();
for(const key of ['4k60','1080p60']){
 const input=path.join(ROOT,`exports/astra-world-execute-me-full-v4-${key}.mp4`),width=key==='4k60'?3840:1920,height=key==='4k60'?2160:1080;
 const proof=read(`exports/astra-world-execute-me-full-v4-${key}.full-verify.json`),inputHash=await hash(input);if(!proof.passed||inputHash!==proof.video_sha256)throw Error('V4 master not verified '+key);
 const old=prior.items.find(x=>x.key===key);if(await hash(old.output)!==old.sha256)throw Error('Purple warning source changed');
 const intro=path.join(WORK,`warning-${key}.mp4`),body=path.join(WORK,`body-${key}.mp4`),list=path.join(WORK,`concat-${key}.ffconcat`),output=path.join(ROOT,`exports/astra-world-execute-me-full-v4-warning-${key}.mp4`);
 await run(['-hide_banner','-loglevel','warning','-y','-i',old.output,'-map','0:v:0','-frames:v','300','-c:v','copy','-an','-video_track_timescale','60000',intro],`prefix-${key}`);
 await run(['-hide_banner','-loglevel','warning','-y','-i',input,'-map','0:v:0','-c:v','copy','-an','-video_track_timescale','60000',body],`body-${key}`);
 fs.writeFileSync(list,`ffconcat version 1.0\nfile '${path.basename(intro)}'\nduration 5.000000000\nfile '${path.basename(body)}'\nduration 218.333333333\n`);
 await run(['-hide_banner','-loglevel','warning','-y','-f','concat','-safe','1','-auto_convert','0','-i',list,'-i',aac.audio.encoded_once,'-map','0:v:0','-map','1:a:0','-c','copy','-frames:v','13400','-t','223.333333333','-video_track_timescale','60000','-movflags','+faststart',output],`aac-${key}`);
 const v={key,width,height,input,output,sha256_before:inputHash,sha256_after:await hash(input),output_sha256:await hash(output),output_bytes:fs.statSync(output).size,prefix_source:old.output,prefix_source_sha256:old.sha256};v.original_unchanged=v.sha256_before===v.sha256_after;report.inputs.push(v);save();
 const final=path.join(ROOT,`exports/astra-world-execute-me-full-v4-warning-hires-${key}.mp4`);
 await run(['-hide_banner','-loglevel','warning','-y','-i',output,'-i',alac.audio.encoded_once,'-map','0:v:0','-map','1:a:0','-c','copy','-frames:v','13400','-t','223.333333333','-video_track_timescale','60000','-movflags','+faststart',final],`alac-${key}`);
 loss.inputs.push({key,width,height,input:output,output:final,sha256_before:v.output_sha256,sha256_after:await hash(output),input_unchanged:true,sha256:await hash(final),bytes:fs.statSync(final).size});save();console.log('[v4 upload] '+key+' AAC + ALAC packaged');
}
report.phase=loss.phase='export_complete_pending_verification';report.export_succeeded=loss.export_succeeded=true;save();
