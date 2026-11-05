/** User-supplied 192 kHz / 24-bit FLAC -> exact integer trim/padding -> ALAC.
 * New upload copies only. Recording provenance and platform acceptance are
 * unverified. No resampling, time stretching, upmixing or lossy audio encode.
 */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawn} from 'node:child_process';
import {createHash} from 'node:crypto';
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const WORK=path.join(ROOT,'exports/warning-v3-hires');fs.mkdirSync(WORK,{recursive:true});
const FF=path.join(ROOT,'.cache/python/imageio_ffmpeg/binaries/ffmpeg-win-x86_64-v9.0.2.exe');
const SOURCE=path.join(ROOT,'media/audio/user-world-execute-192k24.flac');
const SOURCE_SHA='19d5b185fe6cff41ae7d0082ca4f9e7cf2828ef1de99c7f5336177a9761acbbc';
const hash=async f=>{const h=createHash('sha256');for await(const b of fs.createReadStream(f))h.update(b);return h.digest('hex');};
const reportFile=path.join(WORK,'render.json');
const report={passed:false,phase:'preflight',started_at:new Date().toISOString(),label:'User FLAC / 192 kHz 24-bit ALAC; supplied upload FORMAT requirements met after verification; recording provenance and platform acceptance unverified',fps:60,frames:13400,duration_seconds:13400/60,audio:{source:SOURCE,expected_sha256:SOURCE_SHA,sample_rate:192000,bit_depth:24,channels:2,source_samples_per_channel:40686080,trim_front_samples:11096,retained_source_samples:40674984,front_silent_samples:960000,tail_padding_samples:1245016,total_samples_per_channel:42880000,production_decode_count:1,alac_encode_count:1,resampling:false,time_stretch:false,upmix:false,lossy_audio_encoding:false,tail_clearance_evidence:'docs/audio/user-flac-analysis.json: old original song 211.848875 s onward all zero; retain full FLAC decay, trim front only'},inputs:[]};
const save=()=>fs.writeFileSync(reportFile,JSON.stringify(report,null,2)+'\n');
function run(args,label){return new Promise((resolve,reject)=>{fs.writeFileSync(path.join(WORK,label+'.command.json'),JSON.stringify({executable:FF,args},null,2)+'\n');const c=spawn(FF,args,{cwd:ROOT,windowsHide:true,stdio:['ignore','pipe','pipe']}),log=fs.createWriteStream(path.join(WORK,label+'.log'));let msg='';c.stdout.on('data',b=>log.write(b));c.stderr.on('data',b=>{log.write(b);msg=(msg+b).slice(-6000);});c.on('error',reject);c.on('close',n=>log.end(()=>n===0?resolve():reject(Error(label+' '+n+'\n'+msg))));});}
const start=Date.now();
try{
 report.audio.source_sha256_before=await hash(SOURCE);if(report.audio.source_sha256_before!==SOURCE_SHA)throw Error('User FLAC input hash differs');
 const prior=JSON.parse(fs.readFileSync(path.join(ROOT,'exports/warning-v3/verification.json'),'utf8'));if(!prior.passed)throw Error('AAC warning copies not previously verified');
 for(const p of prior.items){const input=path.resolve(p.output),h=await hash(input);if(h!==p.sha256)throw Error('Warning video hash differs');report.inputs.push({key:p.key,width:p.key==='4k60'?3840:1920,height:p.key==='4k60'?2160:1080,input,sha256_before:h,output:path.join(ROOT,`exports/astra-world-execute-me-full-v3-warning-hires-${p.key}.mp4`)});}
 save();console.log('[ALAC] Preparing exact 24-bit integer trim/padding reference');
 const reference=path.join(WORK,'user-flac-trimmed-padded.pcm24.wav'),alac=path.join(WORK,'user-flac-trimmed-padded.alac.m4a');
 report.phase='integer_reference';save();
 await run(['-hide_banner','-loglevel','warning','-y','-i',SOURCE,'-map','0:a:0','-vn','-af','atrim=start_sample=11096,asetpts=PTS-STARTPTS,adelay=960000S:all=1,apad=whole_len=42880000,atrim=end_sample=42880000,asetpts=N/SR/TB','-c:a','pcm_s24le',reference],'reference');
 report.audio.reference=reference;report.audio.reference_sha256=await hash(reference);report.phase='alac_once';save();console.log('[ALAC] Encoding ALAC once; s32p container with 24 significant bits');
 await run(['-hide_banner','-loglevel','warning','-y','-i',reference,'-map','0:a:0','-c:a','alac','-sample_fmt','s32p','-bits_per_raw_sample','24','-metadata','comment=User-provided FLAC preserved at 192 kHz / 24-bit stereo; front trim 11096 samples; 5 s silence; zero tail padding; recording provenance unverified','-movflags','+faststart',alac],'alac-once');
 report.audio.encoded_once=alac;report.audio.encoded_file_sha256=await hash(alac);save();
 for(const item of report.inputs){report.phase=`mux_${item.key}`;save();console.log('[ALAC] Copying video and ALAC into '+item.key);
  await run(['-hide_banner','-loglevel','warning','-y','-i',item.input,'-i',alac,'-map','0:v:0','-map','1:a:0','-c:v','copy','-c:a','copy','-frames:v','13400','-t','223.333333333','-video_track_timescale','60000','-map_metadata','0','-metadata','comment=ASTRA v3 warning upload copy; original video packet bytes copied; user FLAC 192kHz 24bit ALAC; trim 11096 samples then 5s silence and exact tail zeros; recording provenance and upload acceptance unverified','-movflags','+faststart',item.output],`mux-${item.key}`);
  item.bytes=fs.statSync(item.output).size;item.sha256=await hash(item.output);item.sha256_after=await hash(item.input);item.input_unchanged=item.sha256_after===item.sha256_before;save();
 }
 report.audio.source_sha256_after=await hash(SOURCE);if(report.audio.source_sha256_after!==SOURCE_SHA)throw Error('User source changed');
 report.phase='export_complete_pending_verification';report.export_succeeded=true;report.export_elapsed_seconds=(Date.now()-start)/1000;save();console.log('[ALAC] Both copies exported; independent verification required');
}catch(error){report.failed_phase=report.phase;report.phase='failed';report.error=error.message;save();throw error;}
