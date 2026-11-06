import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright-core';
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const OUT=path.join(ROOT,'exports/preview-v52-opening');
const sha=b=>createHash('sha256').update(b).digest('hex');
const read=p=>fs.readFileSync(path.join(ROOT,p));
const original=read('src/mv5cat/early.js').toString(),current=read('src/mv52/early.js').toString();
const split=s=>[s.slice(0,s.indexOf(" case 'R01':{")),s.slice(s.indexOf(" case 'R02':{"))];
const a=split(original),b=split(current);
const sourceChecks={only_R01_block_changed:a[0]===b[0]&&a[1]===b[1],other_files:[]};
for(const file of fs.readdirSync(path.join(ROOT,'src/mv5cat'))){
 if(file==='early.js'||!fs.statSync(path.join(ROOT,'src/mv5cat',file)).isFile())continue;
 sourceChecks.other_files.push({file,identical:sha(read('src/mv5cat/'+file))===sha(read('src/mv52/'+file))});
}
const mime={'.html':'text/html','.js':'text/javascript','.json':'application/json','.png':'image/png','.jpg':'image/jpeg','.svg':'image/svg+xml','.m4a':'audio/mp4'};
const server=http.createServer((req,res)=>{try{const url=new URL(req.url,'http://localhost');if(url.pathname==='/favicon.ico'){res.writeHead(204);res.end();return;}const file=path.resolve(ROOT,'.'+decodeURIComponent(url.pathname));if(!file.startsWith(ROOT+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile()){res.writeHead(404);res.end();return;}res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream'});fs.createReadStream(file).pipe(res);}catch{res.writeHead(500);res.end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;const errors=[];
try{
 browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true});
 const page=await browser.newPage({viewport:{width:1920,height:1080}});
 page.on('pageerror',e=>errors.push(String(e)));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});page.on('requestfailed',r=>errors.push(r.url()+': '+r.failure()?.errorText));
 await page.goto(`http://127.0.0.1:${server.address().port}/src/mv52/index.html?w=3840&h=2160&artPreview=1`);await page.evaluate(()=>window.sample.ready);
 const result=await page.evaluate(async()=>{const rows=[];for(let frame=0;frame<237;frame++){await window.sample.renderFrame(frame/60);rows.push({frame,shot:window.sample.currentShot,artCalls:window.sample.artAudit.length,power:window.sample.sceneAudit.power,subtitles:window.sample.subtitleAudit});}await window.sample.renderFrame(237/60);return {width:window.sample.canvas.width,height:window.sample.canvas.height,rows,nextShot:window.sample.currentShot};});
 const seq=key=>result.rows.every((r,i)=>!i||r.power[key]>=result.rows[i-1].power[key]);
 const finite=x=>typeof x==='number'?Number.isFinite(x):Array.isArray(x)?x.every(finite):x&&typeof x==='object'?Object.values(x).every(finite):true;
 const checks={native_4k:result.width===3840&&result.height===2160,all_237_frames_R01:result.rows.length===237&&result.rows.every(r=>r.shot==='R01'),zero_art_draws:result.rows.every(r=>r.artCalls===0&&r.power.characterCount===0),finite_audit:result.rows.every(r=>finite(r.power)),unchanged_R02_boundary:result.nextShot==='R02',all_subtitle_cues:result.rows.every(r=>r.frame===0?r.subtitles.length===0:r.subtitles.length===2),switch_before_current:result.rows.every(r=>r.power.breakerClosed||r.power.currentProgress===0),monotone_power:seq('currentProgress')&&seq('computeActivation'),monotone_protection:seq('protectionProgress')&&seq('protectionSealed'),only_R01_source_changed:sourceChecks.only_R01_block_changed&&sourceChecks.other_files.every(r=>r.identical),no_browser_errors:errors.length===0};
 const report={passed:Object.values(checks).every(Boolean),scope:'237 native 4K R01 runtime frames; source identity outside R01; no full-film export or full-film AV revalidation',checks,sourceChecks,errors,...result};fs.writeFileSync(path.join(OUT,'qa.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({passed:report.passed,checks,errors},null,2));if(!report.passed)process.exitCode=1;
}finally{await browser?.close();server.closeAllConnections();await new Promise(r=>server.close(r));}
