/** Real v2 renderer QA, no production mutation.
 * node tools/render/qa_v2.mjs --dry-run true
 * node tools/render/qa_v2.mjs --out exports/qa-v2-runtime
 * Optional: --width 3840 --height 2160 --stills true --sheets false
 * Every shot: start + .1 s, midpoint, end - .1 s; plus ending and cue 128 probes.
 * A passing report establishes sampled runtime/text/asset integrity, not visual
 * acceptance of anatomy, logo topology, continuous motion, audio or every frame.
 */
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {chromium} from 'playwright-core';

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const args=process.argv.slice(2);
function arg(key,fallback){const i=args.indexOf(`--${key}`);return i<0?fallback:args[i+1];}
function bool(key,fallback){const s=String(arg(key,String(fallback)));if(!['true','false'].includes(s))throw Error(`--${key} must be true or false`);return s==='true';}
const W=Number(arg('width',1920)),H=Number(arg('height',1080));
const STILLS=bool('stills',false),SHEETS=bool('sheets',true),DRY=bool('dry-run',false);
const OUT=path.resolve(ROOT,arg('out','exports/qa-v2-runtime'));
if(![W,H].every(Number.isInteger)||W<320||H<180||W%2||H%2)throw Error('Positive even dimensions >= 320x180 required.');
if(!OUT.startsWith(ROOT+path.sep))throw Error('QA output must stay within this repository.');
const timelinePath=path.join(ROOT,'data/production-v2/timeline.json');
const lyricsPath=path.join(ROOT,'data/production-v2/lyrics.en.json');
const manifestPath=path.join(ROOT,'assets/astra/v07/manifest.json');
const timeline=JSON.parse(fs.readFileSync(timelinePath,'utf8'));
const lyrics=JSON.parse(fs.readFileSync(lyricsPath,'utf8')).lines;
const FPS=60,TOTAL=13100,END=TOTAL/FPS;
const samples=[];
function add(id,seconds,kind,expectedShot=null){
 const frame=Math.max(0,Math.min(TOTAL-1,Math.round(seconds*FPS))),time=frame/FPS;
 const shot=timeline.shots.find(s=>frame>=s.start_frame&&frame<s.end_frame);
 if(!shot)throw Error(`No shot at source frame ${frame}`);
 samples.push({id,kind,frame,time,expected_shot:expectedShot||shot.id});
}
for(const s of timeline.shots){
 const a=s.start_frame/FPS,b=s.end_frame/FPS,d=b-a;
 add(`${s.id}-start`,a+Math.min(.1,d/4),'shot-start',s.id);
 add(`${s.id}-mid`,(a+b)/2,'shot-mid',s.id);
 add(`${s.id}-end`,b-Math.min(.1,d/4),'shot-end',s.id);
}
for(const t of [208,209.7,210.6,212.5,216.6,218.3167])add(`ending-${t.toFixed(4)}`,t,'ending');
const cue128=lyrics.find(l=>l.index===128);
if(!cue128)throw Error('Required lyric cue 128 is missing from the data.');
add('cue128-first',cue128.start_frame/FPS,'cue128');
add('cue128-mid',(cue128.start_frame+cue128.end_frame-1)/2/FPS,'cue128');
add('cue128-last',(cue128.end_frame-1)/FPS,'cue128');
const timelineChecks={
 shot_count_86:timeline.shots.length===86,
 shot_ids_complete:timeline.shots.every((s,i)=>s.id===`R${String(i+1).padStart(2,'0')}`),
 starts_zero:timeline.shots[0]?.start_frame===0,
 ends_13100:timeline.shots.at(-1)?.end_frame===TOTAL,
 contiguous:timeline.shots.every((s,i)=>s.end_frame>s.start_frame&&(!i||s.start_frame===timeline.shots[i-1].end_frame)),
 final_cue_preserved:cue128.text==='EXECUTION'&&cue128.start_frame<cue128.end_frame&&cue128.end_frame===12480,
};
if(DRY){console.log(JSON.stringify({dry_run:true,output:OUT,width:W,height:H,timeline_checks:timelineChecks,shot_count:timeline.shots.length,sample_count:samples.length,stills:STILLS,sheets:SHEETS,ending_samples:samples.filter(s=>s.kind==='ending'||s.kind==='cue128'),scope:'No browser launched and no QA report or images written.'},null,2));process.exit(Object.values(timelineChecks).every(Boolean)?0:1);}

fs.mkdirSync(OUT,{recursive:true});
if(STILLS)fs.mkdirSync(path.join(OUT,'stills'),{recursive:true});
if(SHEETS)fs.mkdirSync(path.join(OUT,'thumbs'),{recursive:true});
const hash=p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const report={version:2,passed:false,phase:'preflight',started_at:new Date().toISOString(),width:W,height:H,fps:FPS,total_frames:TOTAL,duration_seconds:END,
 sample_count:samples.length,timeline_checks:timelineChecks,input_hashes:{timeline:hash(timelinePath),lyrics:hash(lyricsPath)},
 network:[],page_errors:[],console_errors:[],request_failures:[],samples:[],assets:[],sheets:[],
 scope:'Real main.js + real Art + actual renderFrame at three sampled frames per shot and explicit tail/cue-128 probes. Text comes from actual Canvas text calls and DOM. Art placement/portrait/anchor use is audited. Not an anatomy/logo-shape judgment, full continuous playback, full-frame decode or an audio verification.'};
const reportPath=path.join(OUT,'qa-v2.json');
const save=()=>fs.writeFileSync(reportPath,JSON.stringify(report,null,2)+'\n');
const phase=value=>{report.phase=value;save();};
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.json':'application/json','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.svg':'image/svg+xml','.m4a':'audio/mp4','.css':'text/css'};
const exact=new Set(['/src/full/vendor/trace.js','/data/production-v2/timeline.json','/data/production-v2/lyrics.en.json','/media/audio/mili-world-execute-original-bilibili.m4a']);
const server=http.createServer((req,res)=>{
 try{
  const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
  if(pathname==='/favicon.ico'){res.writeHead(204);res.end();return;}
  const allowed=pathname.startsWith('/src/mv2/')||pathname.startsWith('/assets/astra/')||exact.has(pathname);
  const file=path.resolve(ROOT,'.'+pathname);
  let status=200;if(req.method!=='GET')status=405;else if(!allowed||!file.startsWith(ROOT+path.sep))status=403;else if(!fs.existsSync(file)||!fs.statSync(file).isFile())status=404;
  report.network.push({path:pathname,status});
  if(status!==200){res.writeHead(status);res.end(String(status));return;}
  res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store'});
  const stream=fs.createReadStream(file);stream.on('error',e=>{report.request_failures.push({path:pathname,error:e.message});res.destroy(e)});stream.pipe(res);
 }catch(error){report.request_failures.push({path:req.url,error:error.message});if(!res.headersSent)res.writeHead(500);res.end(error.message);}
});
server.requestTimeout=0;
let browser;
const started=Date.now();
try{
 phase('preflight');
 if(!Object.values(timelineChecks).every(Boolean))throw Error('Timeline/data integrity checks failed.');
 const manifest=JSON.parse(fs.readFileSync(manifestPath,'utf8'));report.input_hashes.manifest=hash(manifestPath);
 for(const [name,item] of Object.entries(manifest.assets||{})){
  const filename=path.resolve(ROOT,'.'+item.path),inside=filename.startsWith(ROOT+path.sep),exists=inside&&fs.existsSync(filename);
  report.assets.push({name,path:item.path,exists,bytes:exists?fs.statSync(filename).size:null,sha256:exists?hash(filename):null,anchors:Object.keys(item.anchors||{}),declared_placeholder:item.placeholder===true||item.status==='placeholder'});
 }
 if(!report.assets.length||report.assets.some(a=>!a.exists||a.declared_placeholder))throw Error('Missing or explicitly placeholder artwork in manifest.');
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const port=server.address().port,edge=arg('browser','C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe');
 phase('launching_browser');
 browser=await chromium.launch({executablePath:fs.existsSync(edge)?edge:undefined,headless:true,args:['--disable-background-timer-throttling','--disable-renderer-backgrounding','--disable-backgrounding-occluded-windows','--ignore-gpu-blocklist','--use-angle=d3d11']});
 const page=await browser.newPage({viewport:{width:W,height:H},deviceScaleFactor:1});
 page.setDefaultTimeout(0);
 page.on('pageerror',e=>report.page_errors.push({message:e.message,stack:e.stack}));
 page.on('console',msg=>{if(msg.type()==='error')report.console_errors.push(msg.text());});
 page.on('requestfailed',req=>report.request_failures.push({path:new URL(req.url()).pathname,error:req.failure()?.errorText}));
 phase('loading_renderer_and_art');
 await page.goto(`http://127.0.0.1:${port}/src/mv2/index.html?w=${W}&h=${H}`,{waitUntil:'load',timeout:60000});
 await page.evaluate(async()=>{if(!window.sample)throw Error('window.sample missing');await window.sample.ready;});
 const loaded=await page.evaluate(()=>{
  const s=window.sample;window.__qaPortraits=[];window.__qaAnchors=[];
  const portrait=s.art.portrait.bind(s.art),anchor=s.art.anchorRect.bind(s.art);
  s.art.portrait=(name,x,y,w,h,o)=>{window.__qaPortraits.push({name,x,y,w,h,kind:'portrait'});return portrait(name,x,y,w,h,o);};
  s.art.anchorRect=(name,x,y,w,h,key)=>{const result=anchor(name,x,y,w,h,key);window.__qaAnchors.push({name,key:key||'hands',point:result});return result;};
  return {width:s.canvas.width,height:s.canvas.height,renderer:s.renderer,loaded_assets:Object.keys(s.art.items),dom_text:document.body.innerText};
 });
 report.renderer=loaded;
 if(loaded.width!==W||loaded.height!==H)throw Error('Native canvas resolution mismatch.');
 const thumbnails=[];
 phase('sampling');
 for(const sample of samples){
  const cue=lyrics.find(l=>sample.time>=l.start_s&&sample.time<l.end_s)||null;
  const row={...sample,expected_lyric:cue?{index:cue.index,text:cue.text}:null,passed:false};
  try{
   const actual=await page.evaluate(async({time,stills,sheets})=>{
    window.__qaPortraits=[];window.__qaAnchors=[];const s=window.sample;await s.renderFrame(time);
    const result={current_shot:s.currentShot,text:[...(s.textAudit||[])],lyric_keyword_parts:Array.isArray(s.lyricKeywordParts)?[...s.lyricKeywordParts]:[],art:[...(s.artAudit||[]),...window.__qaPortraits],anchors:[...window.__qaAnchors]};
    if(stills)result.png=s.canvas.toDataURL('image/png').split(',')[1];
    if(sheets){const c=document.createElement('canvas');c.width=480;c.height=270;c.getContext('2d').drawImage(s.canvas,0,0,480,270);result.thumb=c.toDataURL('image/jpeg',.9);}
    return result;
   },{time:sample.time,stills:STILLS,sheets:SHEETS});
   row.current_shot=actual.current_shot;row.text=actual.text;row.lyric_keyword_parts=actual.lyric_keyword_parts;row.art=actual.art;row.anchors=actual.anchors;
   const normalize=s=>s.trim().replace(/\s+/g,' ').toUpperCase();
   const wholeLyricDrawn=!!cue&&actual.text.some(s=>normalize(s)===normalize(cue.text));
   // A declared split is evidence only when every nonempty part was actually
   // drawn in this frame and the ordered concatenation reproduces the cue.
   const parts=actual.lyric_keyword_parts;
   const splitLyricDrawn=!!cue&&parts.length>=2&&parts.every(part=>typeof part==='string'&&part.trim().length>0&&actual.text.includes(part))&&normalize(parts.join(''))===normalize(cue.text);
   row.lyric_rendering=!cue?'not_applicable':wholeLyricDrawn?'whole':splitLyricDrawn?'verified_parts':'missing';
   row.checks={shot_matches:actual.current_shot===sample.expected_shot,no_chinese_text:actual.text.every(s=>!/[\u3400-\u9fff\uf900-\ufaff]/u.test(s)),expected_lyric_drawn:!cue||wholeLyricDrawn||splitLyricDrawn,known_art_only:actual.art.every(a=>loaded.loaded_assets.includes(a.name)),finite_art_rectangles:actual.art.every(a=>[a.x,a.y,a.w,a.h].every(Number.isFinite)&&a.w>0&&a.h>0),finite_anchors:actual.anchors.every(a=>Array.isArray(a.point)&&a.point.length===2&&a.point.every(Number.isFinite))};
   row.passed=Object.values(row.checks).every(Boolean);
   if(actual.png){row.still=`stills/${sample.id}.png`;fs.writeFileSync(path.join(OUT,row.still),Buffer.from(actual.png,'base64'));}
   if(actual.thumb){row.thumbnail=`thumbs/${sample.id}.jpg`;fs.writeFileSync(path.join(OUT,row.thumbnail),Buffer.from(actual.thumb.split(',')[1],'base64'));thumbnails.push({id:sample.id,frame:sample.frame,time:sample.time,shot:actual.current_shot,passed:row.passed,data:actual.thumb});}
  }catch(error){row.error=error.message;}
  report.samples.push(row);
  if(report.samples.length%24===0||report.samples.length===samples.length){save();console.log(`[qa v2] ${report.samples.length}/${samples.length}; failed samples ${report.samples.filter(s=>!s.passed).length}`);}
 }
 if(SHEETS){
  phase('building_contact_sheets');
  for(let offset=0;offset<thumbnails.length;offset+=18){
   const group=thumbnails.slice(offset,offset+18),number=1+offset/18;
   const jpeg=await page.evaluate(async({items,number})=>{
    const c=document.createElement('canvas'),rows=Math.ceil(items.length/3);c.width=1440;c.height=50+rows*308;const g=c.getContext('2d');g.fillStyle='#15101d';g.fillRect(0,0,c.width,c.height);g.fillStyle='#f7ead7';g.font='24px Segoe UI';g.fillText(`ASTRA v2 / actual renderFrame / sheet ${number}`,20,34);
    for(let i=0;i<items.length;i++){const item=items[i],im=new Image();await new Promise((resolve,reject)=>{im.onload=resolve;im.onerror=reject;im.src=item.data;});const x=(i%3)*480,y=50+Math.floor(i/3)*308;g.drawImage(im,x,y,480,270);g.fillStyle=item.passed?'#b88ce8':'#f05b84';g.font='18px Consolas';g.fillText(`${item.id} | ${item.time.toFixed(3)}s | f${item.frame}`,x+8,y+295);}
    return c.toDataURL('image/jpeg',.92).split(',')[1];
   },{items:group,number});
   const file=`sheet-${String(number).padStart(2,'0')}.jpg`;fs.writeFileSync(path.join(OUT,file),Buffer.from(jpeg,'base64'));report.sheets.push(file);
  }
 }
 const finalCueRows=report.samples.filter(s=>s.kind==='cue128');
 report.checks={...timelineChecks,all_samples_completed:report.samples.length===samples.length,all_sample_checks_passed:report.samples.every(s=>s.passed),no_chinese_canvas_text:report.samples.every(s=>s.checks?.no_chinese_text),no_chinese_dom_text:!/[\u3400-\u9fff\uf900-\ufaff]/u.test(loaded.dom_text),no_404:report.network.every(r=>r.status!==404),no_http_errors:report.network.every(r=>r.status<400),no_failed_requests:report.request_failures.length===0,no_js_exceptions:report.page_errors.length===0,no_console_errors:report.console_errors.length===0,all_assets_exist:report.assets.every(a=>a.exists&&!a.declared_placeholder),cue_128_visible_first_mid_last:finalCueRows.length===3&&finalCueRows.every(s=>s.expected_lyric?.index===128&&s.checks?.expected_lyric_drawn),quiet_tail_has_no_lyric_cue:report.samples.filter(s=>s.kind==='ending').every(s=>s.expected_lyric===null)};
 report.used_assets=[...new Set(report.samples.flatMap(s=>(s.art||[]).map(a=>a.name)))].sort();
 report.unused_loaded_assets=loaded.loaded_assets.filter(name=>!report.used_assets.includes(name));
 report.passed=Object.values(report.checks).every(Boolean);
 report.phase=report.passed?'complete':'checks_failed';
}catch(error){report.failed_phase=report.phase;report.phase='failed';report.error=error.message;report.stack=error.stack;}
finally{
 report.elapsed_seconds=(Date.now()-started)/1000;report.finished_at=new Date().toISOString();save();
 if(browser)await browser.close();server.closeAllConnections();if(server.listening)await new Promise(resolve=>server.close(resolve));
}
console.log(JSON.stringify({passed:report.passed,report:reportPath,samples_completed:report.samples.length,failed_samples:report.samples.filter(s=>!s.passed).map(s=>s.id),checks:report.checks,error:report.error},null,2));
if(!report.passed)process.exitCode=1;
