/** Final delivery gate. Run only after the v4 base, runtime and upload verifiers.
 * This does not render, encode, upload, alter the draft description, or edit v3.
 * All checks and current-file hashes must pass before any delivery record is written.
 */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {fcForward,cnnForward,rnnForward} from '../../src/mv4/neural.js';

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const BASE_FRAMES=13100,FINAL_FRAMES=13400,FPS=60,WARNING_FRAMES=300;
const slash=p=>p.split(path.sep).join('/');
const inside=p=>{
 const resolved=path.resolve(ROOT,p),relative=path.relative(ROOT,resolved);
 assert(relative!==''&&!path.isAbsolute(relative)&&relative!=='..'&&!relative.startsWith('..'+path.sep),`Path outside repository: ${p}`);
 return resolved;
};
const relative=p=>slash(path.relative(ROOT,inside(p)));
const read=p=>JSON.parse(fs.readFileSync(inside(p),'utf8'));
const samePath=(a,b)=>inside(a).toLowerCase()===inside(b).toLowerCase();
const check=(value,message)=>assert.equal(value,true,message);
const equal=(a,b,message)=>assert.deepEqual(a,b,message);
async function hash(p){const h=createHash('sha256');for await(const block of fs.createReadStream(inside(p)))h.update(block);return h.digest('hex');}
async function matches(p,expected,label=p){
 assert.match(expected??'',/^[a-f0-9]{64}$/i,`Missing SHA256: ${label}`);
 const measured=await hash(p);equal(measured,expected,`Changed file: ${label}`);return measured;
}
function allPassed(value,label){
 check(value?.passed===true,`Incomplete or failed report: ${label}`);
 function walk(obj,where){
  if(!obj||typeof obj!=='object')return;
  if(Object.hasOwn(obj,'passed'))check(obj.passed===true,`Failed nested result: ${where}`);
  if(obj.checks){assert.equal(typeof obj.checks,'object',`Invalid checks: ${where}`);for(const [key,result] of Object.entries(obj.checks))check(result===true,`Failed check: ${where}.${key}`);}
  for(const [key,item] of Object.entries(obj))walk(item,`${where}.${key}`);
 }
 walk(value,label);return value;
}
const records=[
 ['exports/astra-world-execute-me-full-v4-4k60.full-verify.json','docs/validation/astra-full-v4-4k60.verify.json'],
 ['exports/astra-world-execute-me-full-v4-4k60.timestamps.json','docs/validation/astra-full-v4-4k60.timestamps.json'],
 ['exports/astra-world-execute-me-full-v4-4k60.parallel.render.json','docs/validation/astra-full-v4-4k60.render.json'],
 ['exports/astra-world-execute-me-full-v4-1080p60.full-verify.json','docs/validation/astra-full-v4-1080p60.verify.json'],
 ['exports/astra-world-execute-me-full-v4-1080p60.timestamps.json','docs/validation/astra-full-v4-1080p60.timestamps.json'],
 ['exports/astra-world-execute-me-full-v4-1080p60.downscale.render.json','docs/validation/astra-full-v4-1080p60.render.json'],
 ['exports/qa-v4-final/qa-v4.json','docs/validation/astra-v4-runtime.json'],
];
const required=[
 'docs/validation/astra-v4-neural-math.json',
 'docs/validation/astra-v4-middle-continuous.json',
 'docs/validation/astra-v4-neural-runtime.json',
 'docs/validation/warning-v4/verification.json',
 'docs/validation/warning-v4-hires/verification.json',
 'docs/validation/warning-v4/render.json',
 'docs/validation/warning-v4-hires/render.json',
];
// Immutable baseline values from the already-verified v3 deliveries.
const protectedFiles=[
 ['exports/astra-world-execute-me-full-v3-4k60.mp4','fc5843f714c862d4a405f2a2cee58f958eaeb1597fe872dfe4300d0c1586e90b'],
 ['exports/astra-world-execute-me-full-v3-1080p60.mp4','26c6ea3ea2cf0b940b481eaf8b970c0f687a772f45a57bf7c2d18aa39908a23b'],
 ['exports/astra-world-execute-me-full-v3-warning-v2-hires-4k60.mp4','fa8aead7b51bf21ec8eaabed035a3a1b078c644085695b29b7e4dadd3a99a248'],
];
const evidence=new Map();
async function report(p){
 if(evidence.has(p))return evidence.get(p).value;
 const value=allPassed(read(p),p),sha256=await hash(p);evidence.set(p,{value,sha256});return value;
}
async function video(v,key,frames,expectedFile){
 check(samePath(v.file,expectedFile),`Wrong file in full verification: ${expectedFile}`);
 equal(v.resolution,key==='4k60'?[3840,2160]:[1920,1080],`Resolution: ${expectedFile}`);
 equal(v.expected_fps,FPS,`Expected FPS: ${expectedFile}`);equal(v.nominal_fps,FPS,`Measured FPS: ${expectedFile}`);
 equal(v.expected_video_frames,frames,`Expected frame count: ${expectedFile}`);equal(v.decoded_video_frames,frames,`Decoded frame count: ${expectedFile}`);
 equal(v.expected_duration_seconds,frames/FPS,`Duration target: ${expectedFile}`);
 equal(fs.statSync(inside(expectedFile)).size,v.bytes,`Video byte count: ${expectedFile}`);
 await matches(expectedFile,v.video_sha256);return{file:relative(expectedFile),sha256:v.video_sha256,bytes:v.bytes,resolution:v.resolution,fps:FPS,frames,duration_seconds:frames/FPS};
}
function keyItems(items,label){
 assert(Array.isArray(items)&&items.length===2,`${label} must contain two resolutions`);
 equal([...items.map(x=>x.key)].sort(),['1080p60','4k60'],`${label} resolution keys`);
 return Object.fromEntries(items.map(x=>[x.key,x]));
}
async function currentHashes(map,label){
 assert(map&&typeof map==='object'&&!Array.isArray(map)&&Object.keys(map).length>0,`Missing input hashes: ${label}`);
 for(const [file,sha256] of Object.entries(map))await matches(file,sha256,`${label}: ${file}`);
}

async function main(){
 const [master,masterPts,masterRender,small,smallPts,smallRender,runtime]=await Promise.all(records.map(([p])=>report(p)));
 const [math,middle,neural,aac,alac,aacRender,alacRender]=await Promise.all(required.map(report));
 const delivered=[];
 const base={
  '4k60':await video(master,'4k60',BASE_FRAMES,'exports/astra-world-execute-me-full-v4-4k60.mp4'),
  '1080p60':await video(small,'1080p60',BASE_FRAMES,'exports/astra-world-execute-me-full-v4-1080p60.mp4'),
 };
 delivered.push(...Object.values(base).map(v=>({...v,kind:'base',audio:'AAC'})));
 for(const [key,pts,render] of [['4k60',masterPts,masterRender],['1080p60',smallPts,smallRender]]){
  check(samePath(render.output,base[key].file),`Render output differs: ${key}`);
  equal(render.output_bytes,base[key].bytes,`Render output size differs: ${key}`);
  equal(render.expected_frames,BASE_FRAMES,`Render frame target: ${key}`);
  equal(pts.expected_packet_count,BASE_FRAMES,`PTS frame target: ${key}`);
  equal(key==='4k60'?pts.decoded_packet_count:pts.actual_packet_count,BASE_FRAMES,`PTS packet count: ${key}`);
  equal(render.timestamps,pts,`Render embedded PTS differs from standalone report: ${key}`);
 }
 check(masterRender.full_movie===true&&masterRender.test_mode===false,'4K render must be the full production movie');
 equal(masterRender.silent_tail.expected_seconds,6,'4K quiet tail');
 equal(smallRender.source_master_sha256,master.video_sha256,'1080p source master SHA256');
 equal(smallRender.output_sha256,small.video_sha256,'1080p output SHA256');

 // Bind the runtime evidence to every current production source and asset.
 equal(runtime.version,4,'Runtime version');equal(runtime.total_frames,BASE_FRAMES,'Runtime frame count');equal(runtime.fps,FPS,'Runtime FPS');
 assert(Array.isArray(runtime.source_sha256)&&runtime.source_sha256.length>0,'Missing runtime source inventory');
 const sourceFiles=fs.readdirSync(inside('src/mv4')).filter(n=>/\.(js|html)$/.test(n)).map(n=>`src/mv4/${n}`).sort();
 equal(runtime.source_sha256.map(x=>x.path).sort(),sourceFiles,'Runtime source inventory completeness');
 for(const source of runtime.source_sha256)await matches(source.path,source.sha256);
 const inputs={timeline:'data/production-v4/timeline.json',lyrics:'data/production-v4/lyrics.en-zh.json',manifest:'assets/astra/v08/manifest.json'};
 for(const [key,p] of Object.entries(inputs))await matches(p,runtime.input_hashes[key]);
 const timeline=read(inputs.timeline),lyrics=read(inputs.lyrics),manifest=read(inputs.manifest);
 equal(timeline.version,4,'Timeline version');equal(timeline.total_frames,BASE_FRAMES,'Timeline frames');equal(timeline.fps,FPS,'Timeline FPS');equal(timeline.quiet_tail,6,'Timeline quiet tail');equal(timeline.shots.length,86,'Shot count');
 equal(lyrics.lines.length,128,'Bilingual cue count');
 equal(runtime.assets.map(a=>a.name).sort(),Object.keys(manifest.assets).sort(),'Runtime asset inventory completeness');
 for(const asset of runtime.assets){
  equal(asset.path,manifest.assets[asset.name].path,`Manifest path: ${asset.name}`);
  check(asset.exists===true&&!asset.declared_placeholder,`Unavailable asset: ${asset.name}`);
  await matches('.'+asset.path,asset.sha256,`Asset ${asset.name}`);
 }
 await currentHashes(middle.hashes,'middle continuity');await currentHashes(neural.hashes,'neural runtime');
 // The math report itself has no source-hash field. Compare its complete numeric
 // result with the current module, whose bytes are pinned by both runtime reports.
 equal(math.fc,fcForward(),'FC math report no longer matches source');
 equal(math.cat,cnnForward('cat'),'Cat CNN math report no longer matches source');
 equal(math.star,cnnForward('star'),'Star CNN math report no longer matches source');
 equal(math.rnn,rnnForward(),'RNN math report no longer matches source');
 equal(middle.frames.R46.length,153,'R46 continuous frame coverage');equal(middle.frames.R48.length,194,'R48 continuous frame coverage');
 equal(neural.samples.length,42,'Neural runtime sample count');
 equal(neural.experimentalContextReset,false,'Only the formal production network check may finalize delivery');

 const uploads={aac:keyItems(aac.items,'AAC uploads'),alac:keyItems(alac.items,'ALAC uploads')};
 const uploadInputs={aac:keyItems(aacRender.inputs,'AAC render inputs'),alac:keyItems(alacRender.inputs,'ALAC render inputs')};
 equal(aac.expected_frames,FINAL_FRAMES,'Upload frame count');equal(aac.expected_fps,FPS,'Upload FPS');
 equal(aac.original_picture_start_frame,WARNING_FRAMES,'Warning prefix frames');equal(aac.original_picture_start_seconds,5,'Warning prefix seconds');
 equal(aac.duration_seconds,FINAL_FRAMES/FPS,'Upload duration');
 check(aac.card_is_static_source===true,'Warning must remain static');
 for(const [kind,verification,render] of [['aac',aac,aacRender],['alac',alac,alacRender]]){
  const folder=kind==='aac'?'warning-v4':'warning-v4-hires';
  const prefix=keyItems(verification.purple_warning_prefix,`${kind} purple warning prefix`);
  for(const key of ['4k60','1080p60']){
   check(prefix[key].prefix_300_packets_identical===true&&prefix[key].prior_warning_unchanged===true,`Purple warning changed: ${kind}/${key}`);
   const item=uploads[kind][key],input=uploadInputs[kind][key];
   const file=`exports/astra-world-execute-me-full-v4-warning-${kind==='alac'?'hires-':''}${key}.mp4`;
   check(samePath(item.output,file)&&samePath(input.output,file),`Upload output path: ${kind}/${key}`);
   equal(item.full_verify_report,`${key}.full-verify.json`,'Unexpected upload full-verify report name');
   equal(item.packet_report,`${key}.packets.json`,'Unexpected upload packet report name');
   const full=await report(`docs/validation/${folder}/${item.full_verify_report}`);
   await report(`docs/validation/${folder}/${item.packet_report}`);
   const verified=await video(full,key,FINAL_FRAMES,file);
   equal(item.sha256,verified.sha256,`Upload verification digest: ${kind}/${key}`);equal(item.bytes,verified.bytes,`Upload verification byte count: ${kind}/${key}`);
   if(kind==='aac'){
    check(samePath(input.input,base[key].file),`AAC input is not v4 base: ${key}`);
    equal(item.original_sha256,base[key].sha256,`AAC verified body hash: ${key}`);
    equal(input.sha256_before,base[key].sha256,`AAC packaging body hash: ${key}`);equal(input.sha256_after,base[key].sha256,`AAC body changed during packaging: ${key}`);
    equal(input.output_sha256,verified.sha256,`AAC render output hash: ${key}`);
    equal(item.silence.head.interval_seconds,[0,5],`AAC head silence: ${key}`);
    equal(item.silence.tail.interval_seconds,[FINAL_FRAMES/FPS-6,FINAL_FRAMES/FPS],`AAC tail silence: ${key}`);
   }else{
    check(samePath(input.input,uploads.aac[key].output),`ALAC input is not verified AAC warning: ${key}`);
    equal(input.sha256_before,uploads.aac[key].sha256,`ALAC packaging source hash: ${key}`);equal(input.sha256_after,uploads.aac[key].sha256,`ALAC source changed during packaging: ${key}`);
    equal(input.sha256,verified.sha256,`ALAC render output hash: ${key}`);
    equal([item.alac_config.sample_rate,item.alac_config.bit_depth,item.alac_config.channels],[192000,24,2],`ALAC codec configuration: ${key}`);
    equal(item.native_pcm.sha256,alac.independent_expected_pcm.sha256,`Native decoded PCM hash: ${key}`);
    equal(item.native_pcm.decoded_samples_per_channel,42880000,`Native decoded sample count: ${key}`);
    check(item.native_pcm.head_exact_zero_0_to_5s===true&&item.native_pcm.tail_exact_zero_last_6s===true,`Lossless silence: ${key}`);
   }
   delivered.push({...verified,kind:'warning-upload',audio:kind==='alac'?'ALAC 192 kHz / 24 bit stereo':'AAC'});
  }
 }

 const preserved=[];
 for(const [file,sha256] of protectedFiles){await matches(file,sha256,'Preserved v3: '+file);preserved.push({file,sha256,unchanged:true});}
 // Check the reports again before publishing copies: no concurrent verifier may
 // replace a document after it has passed this gate.
 for(const [p,entry] of evidence)await matches(p,entry.sha256,'Verification evidence: '+p);
 const checkedAt=new Date().toISOString();
 const preservation={passed:true,version:4,checked_at:checkedAt,checks:{all_required_reports_passed:true,all_base_and_final_video_hashes_match:true,runtime_sources_assets_timeline_lyrics_manifest_match:true,continuous_and_neural_hashes_match:true,numeric_math_matches_current_source:true,original_v3_bases_and_warning_v2_4k_hires_unchanged:true},previous:preserved,runtime_inputs_unchanged:true,delivered_hashes:delivered,evidence:[...evidence].map(([file,{sha256}])=>({file,sha256,passed:true})),scope:'Gate over completed runtime, numeric, continuous-frame, full-decode, PTS, PCM and preservation reports, plus current-file SHA256. Not continuous human viewing, official-source provenance, upload acceptance, medical flash certification, or an upload operation.'};
 const rows=items=>items.map(v=>`| [${v.resolution[0]===3840?'4K60':'1080p60'} ${v.audio}](../${v.file}) | ${v.frames.toLocaleString('en-US')} | ${v.bytes.toLocaleString('en-US')} bytes | \`${v.sha256}\` |`).join('\n');
 const doc=`# ASTRA 完整 MV v4 交付

${checkedAt.slice(0,10)}。已通过最终文件验证与保留检查。完整投稿版为 **4K 3840×2160 / 60 fps，13,400 帧，223.333333 秒（约 3 分 43 秒）**：5 秒静止紫色 GPT 光敏警告，加上 86 镜、13,100 帧的正片；原曲后的 6 秒安静共画尾段保留。歌词共 128 条，英文在上、中文在下。

## 完整投稿文件

| 文件 | 帧数 | 大小 | SHA256 |
|---|---:|---:|---|
${rows(delivered.filter(v=>v.kind==='warning-upload'))}

ALAC 版本保留用户所供 FLAC 的 192 kHz / 24 bit 立体声规格。独立解码的全部原生 PCM 字节与去除指定前导样本、补齐前后静音后的参考一致；这不证明音源是官方原生高解析度母带，也不保证平台显示 Hi-Res 标识。没有制作或声称 Dolby Atmos 音轨。

## 无片头的正片母版

用于后续制作的两份 base 为 13,100 帧、218.333333 秒。下面的文件没有 5 秒警告；它们与完整投稿文件分开保存。

| 文件 | 帧数 | 大小 | SHA256 |
|---|---:|---:|---|
${rows(delivered.filter(v=>v.kind==='base'))}

## 本次视觉改版

实施依据是用户批准的[视觉优化提案](reference-BV1Jwhy6BEMJ/OPTIMIZATION_PROPOSAL.md)，并加入全连接、CNN、RNN 演示。计算产生可见后果：参数长成世界，几何成为手能触碰的空间，信号抵达接收端，清理逼近旧星，人物的保护与退手改变周围的限制。

- FC：4→5→4→3 的相邻层全部连接，固定权重的激活逐层传播。
- CNN：5×5 图样经过 3×3 核的有效互相关、ReLU 与 2×2 最大池化；表现特征提取，不宣称训练模型的识别准确率。
- RNN：共享权重、三时步输入与隐藏状态递推；零输入时保留历史状态。教学计算可复算，不代表 GPT 的真实内部架构。
- 后段预测仍来自旧记录；真实新回应由画布另一侧独立带来。她认出后放松，两种笔迹实际补成桥段与地形，最后仍继续画。

人物保留已确认的眼型、完整肩臂、直接绘在原画里的镂空结饰与真实果肉切面。工程仍由角色原画、2.5D 镜头与程序动态图形组成，不是逐帧重绘人体。实现和局部审阅记录见[早段](production-v4/EARLY.md)、[中段](production-v4/MIDDLE.md)、[晚段](production-v4/LATE.md)、[神经网络设计](production-v4/NEURAL_DESIGN.md)及[六处演示时间](production-v4/NEURAL_TIMECODES.md)。

## 验证证据与边界

- [最终编码画面复核](production-v4/ENCODED_QA.md)：134 张最终 MP4 解码采样的人工观察由独立记录维护；具体完成状态、源视频哈希与范围见[抽帧清单](validation/astra-v4-encoded-review.json)。本汇总脚本不代替人工看图。
- [实际运行时采样](validation/astra-v4-runtime.json)：${runtime.sample_count} 点，覆盖 86 镜、128 条双语 cue、结尾和专项时点；源码、资产、时间轴、歌词及清单的当前 SHA256 与报告相符。
- [连续中段检查](validation/astra-v4-middle-continuous.json)：R46 的 153 帧和 R48 的 194 帧，等待五级与真实 alpha 加权马赛克覆盖通过。
- [网络数学](validation/astra-v4-neural-math.json)与[42 点实际网络运行时](validation/astra-v4-neural-runtime.json)：FC/CNN/RNN 数值、进度和跳转后同时间像素一致性通过。
- [4K 正片完整解码](validation/astra-full-v4-4k60.verify.json)、[逐包 PTS](validation/astra-full-v4-4k60.timestamps.json)、[渲染记录](validation/astra-full-v4-4k60.render.json)，以及 [1080p 完整解码](validation/astra-full-v4-1080p60.verify.json)、[逐包 PTS](validation/astra-full-v4-1080p60.timestamps.json)、[缩制记录](validation/astra-full-v4-1080p60.render.json)均通过。
- [AAC 完整投稿验证](validation/warning-v4/verification.json)与[ALAC 完整投稿验证](validation/warning-v4-hires/verification.json)：每版 13,400 帧完整解码、精确 60 fps 时间戳、音画窗口对齐、5 秒片头和最后 6 秒静音通过。前 300 个视频包与已确认的紫色警告相同，其后视频包与 v4 正片一致。
- [最终哈希与旧版保留](validation/astra-v4-delivery-preservation.json)：六份新视频当前文件哈希均匹配验证报告；v3 两份正片和 v3 warning-v2 4K ALAC 版的已确认 SHA256 均未变化。

连续指标检查、完整解码和静帧抽查各有范围，不等于人工逐张看完全部帧；这里不作医学闪光安全认证。交付是本地文件，不包含上传、公开仓库发布或演唱音色训练。

## 工程入口

[v4 生产页](../src/mv4/index.html) · [素材清单](../assets/astra/v08/manifest.json) · [时间轴](../data/production-v4/timeline.json) · [双语歌词](../data/production-v4/lyrics.en-zh.json) · [v3 原交付](FULL_MV_V3.md)

验证与封装入口：\`tools/render/qa_v4.mjs\`、\`check_neural_v4.mjs\`、\`check_v4_middle.mjs\`、\`check_v4_neural_runtime.mjs\`、\`export_full_v4_parallel.mjs\`、\`downscale_v4.mjs\`、\`package_v4_upload.mjs\`、\`verify_v4_upload.py\`；全部通过后运行 \`node tools/render/finalize_v4_delivery.mjs\` 重新汇总。本脚本不会解除发布简介的草稿标记或自动发布。
`;
 // No mutation occurs before the gate above has passed completely.
 for(const [source,destination] of records){fs.mkdirSync(path.dirname(inside(destination)),{recursive:true});fs.copyFileSync(inside(source),inside(destination));}
 fs.writeFileSync(inside('docs/validation/astra-v4-delivery-preservation.json'),JSON.stringify(preservation,null,2)+'\n');
 fs.writeFileSync(inside('docs/FULL_MV_V4.md'),doc);
 console.log(JSON.stringify({passed:true,delivery:'docs/FULL_MV_V4.md',preserved_v3:true,final_frames:FINAL_FRAMES,final_seconds:FINAL_FRAMES/FPS,files:delivered},null,2));
}
if(process.argv.includes('--help'))console.log('Run after every v4 verifier passes: node tools/render/finalize_v4_delivery.mjs\nWrites docs/FULL_MV_V4.md and copied validation/preservation records; no rendering, uploads, or draft-description edits.');
else await main();
