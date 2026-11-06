/** Native 4K runtime checks for approved v5.2. Writes QA evidence only. */
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {chromium} from 'playwright-core';
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const OUT=path.join(ROOT,'exports/qa-v52-final'),W=3840,H=2160,FPS=60;
const read=p=>JSON.parse(fs.readFileSync(path.join(ROOT,p),'utf8'));
const hash=p=>createHash('sha256').update(fs.readFileSync(path.join(ROOT,p))).digest('hex');
const manifest=read('data/production-v52final/manifest.json'),map=read('data/production-v52final/candidate-map.json');
const old=read('assets/astra/v12-approved-cat/manifest.json'),timeline=read('data/production-v5/timeline.json'),lyrics=read('data/production-v5/lyrics.en-zh.json').lines;
const files=[...fs.readdirSync(path.join(ROOT,'src/mv52final')).filter(n=>/\.(js|html)$/.test(n)).map(n=>'src/mv52final/'+n),'src/full/vendor/trace.js','data/production-v52final/manifest.json','data/production-v52final/candidate-map.json','data/production-v5/timeline.json','data/production-v5/lyrics.en-zh.json','data/production-v52/audio-accents.json','assets/astra/v07/interface-openai.svg',...Object.values(manifest.assets).map(a=>a.path.replace(/^\//,''))];
const input_hashes=[...new Set(files)].sort().map(p=>({path:p,sha256:hash(p)}));
const report={passed:false,width:W,height:H,fps:FPS,entry:'src/mv52final/index.html',started_at:new Date().toISOString(),input_hashes,fingerprint:createHash('sha256').update(JSON.stringify(input_hashes)).digest('hex'),checks:{},rows:[],stills:[],errors:[],media_preload_cancellations:[],scope:'Native render at three samples per all 86 shots plus every frame of five revised clip ranges and preserved cat sequence. All 429 waveform frames checked for endpoint/tangent continuity. Source dimensions, bilingual subtitles, real source paths, lighting and scene states checked. Static PNGs for separate visual review; no claim of continuous human full-film/audio review.'};
fs.mkdirSync(path.join(OUT,'stills'),{recursive:true});
const save=()=>fs.writeFileSync(path.join(OUT,'runtime.json'),JSON.stringify(report,null,2)+'\n');
const sampleSet=new Set(),stillSet=new Set();
for(const s of timeline.shots){sampleSet.add(s.start_frame);sampleSet.add(s.end_frame-1);const m=Math.floor((s.start_frame+s.end_frame-1)/2);sampleSet.add(m);stillSet.add(m);}
for(const [a,b] of [[4197,4391],[6219,6648],[7866,8434],[10130,10184],[12480,12660],[4917,5125]])for(let f=a;f<b;f++)sampleSet.add(f);
for(const id of ['R23','R40','R41','R42','R43','R53','R54','R55','R74']){const s=timeline.shots.find(x=>x.id===id);for(const q of [.15,.5,.85]){const f=Math.min(s.end_frame-1,s.start_frame+Math.floor((s.end_frame-s.start_frame)*q));sampleSet.add(f);stillSet.add(f);}}
for(const t of [106,106.05,108.75,108.8,138.783333333,138.8,209.3,209.7,210.4,212.333333333,218.316666667]){const f=Math.round(t*FPS);sampleSet.add(f);stillSet.add(f);}
const frames=[...sampleSet].sort((a,b)=>a-b);
const mime={'.html':'text/html','.js':'text/javascript','.json':'application/json','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.svg':'image/svg+xml','.mp4':'video/mp4','.m4a':'audio/mp4'};
const server=http.createServer((req,res)=>{try{const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);if(pathname==='/favicon.ico'){res.writeHead(204);res.end();return;}const file=path.resolve(ROOT,'.'+pathname);if(!file.startsWith(ROOT+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile()){report.errors.push('Missing local '+pathname);res.writeHead(404);res.end();return;}res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store'});fs.createReadStream(file).pipe(res);}catch(e){report.errors.push(String(e));res.writeHead(500);res.end();}});
let browser;
try{
 report.checks.cat_sources_preserved=['A19_01','A19_02','A19_03'].every(n=>JSON.stringify(manifest.assets[n])===JSON.stringify(old.assets[n]));
 report.checks.timeline_86_and_13100=timeline.shots.length===86&&timeline.shots[0].start_frame===0&&timeline.shots.at(-1).end_frame===13100&&timeline.quiet_tail===6;
 report.checks.lyrics_128_bilingual=lyrics.length===128&&lyrics.every(x=>x.text&&x.translation);
 report.checks.current_12_sources=Object.keys(map.assets).length===12&&Object.entries(map.assets).every(([n,a])=>manifest.assets[n].path==='/'+a.path&&manifest.assets[n].sha256===hash(a.path));
 for(const name of ['early.js','middle.js','late.js','kit.js','neural.js','spatial-neural.js'])report.checks['review_scene_preserved_'+name]=hash('src/mv52final/'+name)===hash('src/mv52review/'+name);
 if(!Object.values(report.checks).every(Boolean))throw Error('Preflight failed');
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true,args:['--disable-background-timer-throttling','--disable-renderer-backgrounding','--disable-backgrounding-occluded-windows']});
 const page=await browser.newPage({viewport:{width:W,height:H},deviceScaleFactor:1});page.setDefaultTimeout(0);
 page.on('pageerror',e=>report.errors.push(e.message));page.on('requestfailed',req=>{const row={url:req.url(),error:req.failure()?.errorText};if(req.resourceType()==='media'&&row.error==='net::ERR_ABORTED')report.media_preload_cancellations.push(row);else report.errors.push(row);});
 await page.goto(`http://127.0.0.1:${server.address().port}/src/mv52final/index.html?w=${W}&h=${H}&artPreview=1`,{waitUntil:'load',timeout:60000});await page.evaluate(()=>window.sample.ready);
 report.loaded_assets=await page.evaluate(()=>Object.fromEntries(Object.entries(window.sample.art.items).map(([n,a])=>[n,{path:a.path,w:a.w,h:a.h,bounds:a.bounds,anchors:a.anchors}])));
 report.checks.loaded_assets=Object.entries(map.assets).every(([n,a])=>{const v=report.loaded_assets[n],m=manifest.assets[n];return v.path===m.path&&v.w===m.source_width&&v.h===m.source_height;});
 let completed=0;
 for(const frame of frames){
  const snap=await page.evaluate(({frame,png})=>{const s=window.sample;s.renderFrame(frame/60);const row={frame,shot:s.currentShot,art:s.artAudit,subtitles:s.subtitleAudit,scene:s.sceneAudit};if(png)row.png=s.canvas.toDataURL('image/png').split(',')[1];return row;},{frame,png:stillSet.has(frame)});
  const t=frame/FPS,expected=timeline.shots.find(s=>frame>=s.start_frame&&frame<s.end_frame),cue=lyrics.find(l=>t>=l.start_s&&t<l.end_s),en=snap.subtitles.find(x=>x.language==='en'),zh=snap.subtitles.find(x=>x.language==='zh');
  snap.checks={shot:snap.shot===expected.id,lighting:snap.scene.lighting.enabled===true,subtitles:cue?en?.text===cue.text&&zh?.text===cue.translation&&en.y<zh.y&&snap.subtitles.length===2:snap.subtitles.length===0,subtitle_width:snap.subtitles.every(s=>s.width<=1770.1),finite_art:snap.art.every(a=>['x','y','w','h'].every(k=>Number.isFinite(a[k]))&&a.w>0&&a.h>0),opening_without_character:snap.shot!=='R01'||snap.art.length===0,preserved_empty_pause:!['R47','R50'].includes(snap.shot)||snap.scene.extraLight.active===false};
  if(frame>=6219&&frame<6648){const g=snap.scene.goldConnector;const cross=g.waveEndTangent[0]*g.connectorStartTangent[1]-g.waveEndTangent[1]*g.connectorStartTangent[0];snap.checks.wave_connected=g.singleStroke&&g.startGap===0&&g.handGap===0&&Math.hypot(g.connectorEnd[0]-g.handAnchor[0],g.connectorEnd[1]-g.handAnchor[1])<1e-8&&Math.abs(cross)<1e-6;}
  if(snap.png){const name=`${snap.shot}-body-${t.toFixed(3)}-frame-${frame}.png`;const bytes=Buffer.from(snap.png,'base64');fs.writeFileSync(path.join(OUT,'stills',name),bytes);report.stills.push({frame,shot:snap.shot,body_time:t,full_time:t+5,path:'stills/'+name,sha256:createHash('sha256').update(bytes).digest('hex')});delete snap.png;}
  snap.passed=Object.values(snap.checks).every(Boolean);report.rows.push(snap);completed++;
  if(completed%120===0){console.log(`[runtime] ${completed}/${frames.length}`);save();}
 }
 report.checks.samples_passed=report.rows.every(r=>r.passed);
 report.checks.all_86_shots_seen=new Set(report.rows.map(r=>r.shot)).size===86;
 report.checks.all_429_wave_frames=report.rows.filter(r=>r.frame>=6219&&r.frame<6648).length===429;
 report.checks.all_12_extra_light_active=['R02','R04','R05','R06','R08','R09','R14','R25','R31','R39','R44','R52'].every(id=>report.rows.some(r=>r.shot===id&&r.scene.extraLight.active));
 report.checks.no_runtime_errors=report.errors.length===0;
 report.checks.inputs_unchanged=input_hashes.every(x=>hash(x.path)===x.sha256);
 report.passed=Object.values(report.checks).every(Boolean);report.finished_at=new Date().toISOString();save();
 console.log(JSON.stringify({passed:report.passed,samples:report.rows.length,stills:report.stills.length,failed_checks:Object.entries(report.checks).filter(([,v])=>!v).map(([k])=>k),failed_rows:report.rows.filter(r=>!r.passed).map(r=>({frame:r.frame,checks:r.checks})),errors:report.errors}));
 if(!report.passed)process.exitCode=1;
}catch(e){report.error=e.stack;save();throw e;}finally{await browser?.close();server.closeAllConnections();if(server.listening)await new Promise(r=>server.close(r));}
