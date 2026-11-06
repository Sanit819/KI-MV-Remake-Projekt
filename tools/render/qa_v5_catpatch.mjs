/** Native 4K QA for the approved-source A19 poses. Writes QA only, no video. */
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {chromium} from 'playwright-core';
import {compareCatRenderer,MANIFEST} from './v5_catpatch_contract.mjs';

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const OUT=path.join(ROOT,'exports/qa-v5.1-cat');
const W=3840,H=2160,FPS=60;
const read=p=>JSON.parse(fs.readFileSync(path.join(ROOT,p),'utf8'));
const sha=b=>createHash('sha256').update(b).digest('hex');
const hash=p=>sha(fs.readFileSync(path.resolve(ROOT,p)));
const sourceNames=fs.readdirSync(path.join(ROOT,'src/mv5')).filter(n=>/\.(js|html)$/.test(n));
const manifest=read(MANIFEST),oldManifest=read('assets/astra/v09/manifest.json');
const timeline=read('data/production-v5/timeline.json'),lyrics=read('data/production-v5/lyrics.en-zh.json').lines;
const shot=timeline.shots.find(s=>s.id==='R30'),after=timeline.shots.find(s=>s.id==='R31');
const selected=[4917,4935,4964,4965,5007,5050,5051,5079,5096,5097,5111,5124];
const unaffected=[3300,4000,4916,5125,5700,6599];
const changed=Object.keys(oldManifest.assets).filter(n=>JSON.stringify(oldManifest.assets[n])!==JSON.stringify(manifest.assets[n]));
const inputHashes=[...sourceNames.map(n=>'src/mv5cat/'+n),MANIFEST,...Object.values(manifest.assets).map(a=>a.path.slice(1))].sort().map(p=>({path:p,sha256:hash(p)}));
const report={version:'final-v5.1-cat',passed:false,phase:'preflight',started_at:new Date().toISOString(),width:W,height:H,fps:FPS,input_hashes:inputHashes,fingerprint:sha(JSON.stringify(inputHashes)),changed_assets:changed,checks:{},samples:[],unaffected_comparisons:[],repeat_comparisons:[],page_errors:[],console_errors:[],request_failures:[],network_errors:[],media_preload_cancellations:[],scope:'All 208 source frames of R30/R31 rendered at native 4K with phase, shot, subtitles and anchor checks. Twelve native PNGs for human review, three exact repeat-render comparisons after a seek, six exact unaffected-frame comparisons. Passing machine checks do not establish anatomy, cat-ear symmetry, logos, continuous human visual acceptance or audio.'};
fs.mkdirSync(path.join(OUT,'stills'),{recursive:true});
const save=()=>fs.writeFileSync(path.join(OUT,'qa.json'),JSON.stringify(report,null,2)+'\n');
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.json':'application/json; charset=utf-8','.png':'image/png','.jpg':'image/jpeg','.svg':'image/svg+xml','.m4a':'audio/mp4'};
const server=http.createServer((req,res)=>{
 try{
  const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
  if(pathname==='/favicon.ico'){res.writeHead(204);res.end();return;}
  const p=path.resolve(ROOT,'.'+pathname);
  if(!p.startsWith(ROOT+path.sep)||!fs.existsSync(p)||!fs.statSync(p).isFile()){report.network_errors.push(pathname);res.writeHead(404);res.end();return;}
  res.writeHead(200,{'Content-Type':mime[path.extname(p)]||'application/octet-stream','Cache-Control':'no-store'});fs.createReadStream(p).pipe(res);
 }catch(e){report.network_errors.push({path:req.url,error:String(e)});res.writeHead(500);res.end();}
});
let browser;
try{
 report.checks.only_three_A19_entries_changed=JSON.stringify(changed.sort())===JSON.stringify(['A19_01','A19_02','A19_03'])&&JSON.stringify(Object.keys(manifest.assets))===JSON.stringify(Object.keys(oldManifest.assets));
 report.checks.shadow_face_approved_sources=changed.every(n=>manifest.assets[n].faceTreatment==='shadow'&&manifest.assets[n].path.startsWith('/assets/astra/v12-approved-cat/'));
 report.source_comparison=sourceNames.map(n=>compareCatRenderer(n,fs.readFileSync(path.join(ROOT,'src/mv5',n),'utf8'),fs.readFileSync(path.join(ROOT,'src/mv5cat',n),'utf8')));
 report.checks.renderer_unchanged_except_manifest_and_R30_layout=report.source_comparison.every(x=>x.identical_except_declared_changes);
 report.checks.source_dimensions_declared=changed.every(n=>manifest.assets[n].source_width>0&&manifest.assets[n].source_height>0);
 if(!Object.values(report.checks).every(Boolean))throw Error('Patch preflight checks failed');
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true,args:['--disable-background-timer-throttling','--disable-renderer-backgrounding']});
 const newPage=async()=>{const p=await browser.newPage({viewport:{width:W,height:H},deviceScaleFactor:1});p.setDefaultTimeout(0);p.on('pageerror',e=>report.page_errors.push(e.message));p.on('console',msg=>{if(msg.type()==='error')report.console_errors.push(msg.text());});p.on('requestfailed',req=>{const q={path:new URL(req.url()).pathname,error:req.failure()?.errorText};if(q.path.endsWith('.m4a')&&q.error==='net::ERR_ABORTED')report.media_preload_cancellations.push(q);else report.request_failures.push(q);});return p;};
 let page=await newPage();
 const load=async variant=>{await page.goto(`http://127.0.0.1:${server.address().port}/src/${variant}/index.html?w=${W}&h=${H}&artPreview=1`);await page.evaluate(()=>window.sample.ready);};
 const render=async(frame,png=false)=>page.evaluate(async({frame,png})=>{const s=window.sample;await s.renderFrame(frame/60);return {frame,width:s.canvas.width,height:s.canvas.height,shot:s.currentShot,scene:s.sceneAudit,art:s.artAudit,subtitles:s.subtitleAudit,png:png?s.canvas.toDataURL('image/png').split(',')[1]:undefined};},{frame,png});
 await load('mv5cat');
 report.assets=await page.evaluate(()=>Object.fromEntries(['A19_01','A19_02','A19_03'].map(n=>{const a=window.sample.art.items[n];return[n,{path:a.path,width:a.w,height:a.h,bounds:a.bounds,anchors:a.anchors,phase:a.phase}]})));
 report.checks.actual_dimensions_match_manifest=changed.every(n=>report.assets[n].width===manifest.assets[n].source_width&&report.assets[n].height===manifest.assets[n].source_height);
 report.checks.anchors_inside_source=Object.values(report.assets).every(a=>['hands','eyes'].every(k=>Array.isArray(a.anchors[k])&&a.anchors[k].length===2&&a.anchors[k].every(Number.isFinite)&&a.anchors[k][0]>=0&&a.anchors[k][0]<a.width&&a.anchors[k][1]>=0&&a.anchors[k][1]<a.height));
 report.phase='sampling';save();const stillHashes=new Map();
 for(let frame=shot.start_frame;frame<after.end_frame;frame++){
  const row=await render(frame,selected.includes(frame)),expectedShot=frame<shot.end_frame?'R30':'R31';
  const expectedPhase=frame<4965?1:frame<5051?2:3;
  const action=row.art.find(a=>a.actionGroup==='A19'),cue=lyrics.find(c=>frame/FPS>=c.start_s&&frame/FPS<c.end_s);
  const en=row.subtitles.find(s=>s.language==='en'),zh=row.subtitles.find(s=>s.language==='zh');
  row.checks={native_4k:row.width===W&&row.height===H,shot:row.shot===expectedShot,phase:action?.phase===expectedPhase,source_name:action?.name===`A19_0${expectedPhase}`,finite_placement:action&&[action.x,action.y,action.w,action.h].every(Number.isFinite),bilingual_cue:cue?en?.text===cue.text&&zh?.text===cue.translation&&en.y<zh.y:row.subtitles.length===0};
  row.passed=Object.values(row.checks).every(Boolean);
  if(row.png){const bytes=Buffer.from(row.png,'base64');row.still=`stills/${row.shot}-frame-${frame}-pose-${expectedPhase}.png`;row.png_sha256=sha(bytes);fs.writeFileSync(path.join(OUT,row.still),bytes);stillHashes.set(frame,row.png_sha256);delete row.png;}
  report.samples.push(row);
 }
 for(const frame of [4935,5007,5079]){await render(12500);const row=await render(frame,true),newHash=sha(Buffer.from(row.png,'base64'));report.repeat_comparisons.push({frame,original:stillHashes.get(frame),repeat:newHash,identical:stillHashes.get(frame)===newHash});}
 // Use a dedicated cold browser and matched render histories, as the export
 // preflight does. Long, unequal prior seeks can change 28 font-edge pixels
 // (max channel delta 2) in R32's EXISTENCE without changing its drawing calls.
 // Keep the exact PNG comparison and the original frame 5125; do not tolerate
 // differences or substitute another frame. Diagnostic captures remain in
 // exports/qa-v5.1-cat-5125/.
 await page.close();await browser.close();
 browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true,args:['--disable-background-timer-throttling','--disable-renderer-backgrounding']});
 page=await newPage();await load('mv5cat');
 report.unaffected_comparison_context='Independent cold browser; one new page per variant; identical six-frame rendering order. Strict PNG SHA256 equality, including source frame 5125. Earlier seek-history font antialias diagnostic retained separately.';
 const patch=new Map();for(const frame of unaffected){const row=await render(frame,true);patch.set(frame,sha(Buffer.from(row.png,'base64')));}
 await page.close();page=await newPage();await load('mv5');
 for(const frame of unaffected){const row=await render(frame,true),originalHash=sha(Buffer.from(row.png,'base64'));report.unaffected_comparisons.push({frame,original:originalHash,patch:patch.get(frame),identical:originalHash===patch.get(frame)});}
 report.checks.all_208_frames_sampled=report.samples.length===208;
 report.checks.all_frame_checks=report.samples.every(r=>r.passed);
 report.checks.all_three_phases_present=new Set(report.samples.filter(r=>r.shot==='R30').map(r=>r.art.find(a=>a.actionGroup==='A19')?.phase)).size===3;
 report.checks.twelve_native_stills=stillHashes.size===12;
 report.checks.repeat_render_exact=report.repeat_comparisons.every(r=>r.identical);
 report.checks.six_unaffected_frames_identical=report.unaffected_comparisons.length===6&&report.unaffected_comparisons.every(r=>r.identical);
 report.checks.no_page_console_or_resource_errors=!report.page_errors.length&&!report.console_errors.length&&!report.request_failures.length&&!report.network_errors.length;
 report.checks.inputs_unchanged=report.input_hashes.every(r=>hash(r.path)===r.sha256);
 report.passed=Object.values(report.checks).every(Boolean);report.phase=report.passed?'complete':'failed';report.finished_at=new Date().toISOString();save();
 console.log(JSON.stringify({passed:report.passed,checks:report.checks,report:path.join(OUT,'qa.json'),stills:path.join(OUT,'stills')},null,2));
 if(!report.passed)process.exitCode=1;
}catch(e){report.phase='failed';report.error=e.stack;save();console.error(e);process.exitCode=1;}
finally{await browser?.close();if(server.listening)await new Promise(resolve=>server.close(resolve));}
