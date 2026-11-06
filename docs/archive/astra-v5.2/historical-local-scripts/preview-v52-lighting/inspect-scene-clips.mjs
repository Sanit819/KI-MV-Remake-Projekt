import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright-core';
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..'),OUT=path.join(ROOT,'exports/preview-v52-lighting');
const staticOnly=process.argv.includes('--static'),full=process.argv.includes('--full');
const mime={'.html':'text/html','.js':'text/javascript','.json':'application/json','.png':'image/png','.jpg':'image/jpeg','.svg':'image/svg+xml','.m4a':'audio/mp4'};
const server=http.createServer((req,res)=>{const u=new URL(req.url,'http://localhost');if(u.pathname==='/favicon.ico'){res.writeHead(204);res.end();return;}const f=path.resolve(ROOT,'.'+decodeURIComponent(u.pathname));if(!f.startsWith(ROOT+path.sep)||!fs.existsSync(f)||!fs.statSync(f).isFile()){res.writeHead(404);res.end();return;}res.writeHead(200,{'Content-Type':mime[path.extname(f)]||'application/octet-stream'});fs.createReadStream(f).pipe(res);});
await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;const errors=[];
try{
 browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true});
 const page=await browser.newPage({viewport:{width:1920,height:1080}});page.on('pageerror',e=>errors.push(String(e)));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});page.on('requestfailed',r=>{if(!(r.resourceType()==='media'&&r.failure()?.errorText==='net::ERR_ABORTED'))errors.push(r.url()+': '+r.failure()?.errorText);});
 await page.goto(`http://127.0.0.1:${server.address().port}/src/mv52/index.html?w=3840&h=2160&lighting=1&artPreview=1${staticOnly?'&dynamics=0':''}`);await page.evaluate(()=>window.sample.ready);
 const times=[91.64166666666667, 177.04666666666665];
 const records=[];
 for(const t of times){
  const r=await page.evaluate(t=>{
   const s=window.sample,c=s.canvas,ctx=c.getContext('2d');
   s.lighting.enabled=false;s.renderFrame(t);const off=c.toDataURL('image/png'),a=JSON.stringify(s.subtitleAudit);
   const comparison=document.createElement('canvas');comparison.width=1920;comparison.height=580;const cc=comparison.getContext('2d');cc.fillStyle='#15101d';cc.fillRect(0,0,1920,580);cc.drawImage(c,0,40,960,540);
   s.lighting.enabled=true;s.renderFrame(t);const on=c.toDataURL('image/png'),b=JSON.stringify(s.subtitleAudit);cc.drawImage(c,960,40,960,540);cc.font='22px Segoe UI';cc.fillStyle='#f7ead7';cc.fillText(`BASELINE / body ${t.toFixed(3)} s`,22,29);cc.fillText('LIGHTING CANDIDATE / same frame',982,29);
   return{off,on,comparison:comparison.toDataURL('image/png'),audit:s.sceneAudit.lighting,shot:s.currentShot,subtitleIdentical:a===b};
  },t);
  const stem=`body-${t.toFixed(3)}`;
  for(const k of ['off','on','comparison'])fs.writeFileSync(path.join(OUT,`${stem}-${k}.png`),Buffer.from(r[k].split(',')[1],'base64'));
  delete r.off;delete r.on;delete r.comparison;records.push({t,...r});console.log(`Compared ${t} s ${r.shot}`);
 }
 const runtime=full?await page.evaluate(()=>{
  const rows=[];for(const shot of window.sample.timeline.shots){for(const f of [shot.start_frame,Math.floor((shot.start_frame+shot.end_frame-1)/2),shot.end_frame-1]){window.sample.renderFrame(f/60);rows.push({frame:f,shot:shot.id,lighting:{...window.sample.sceneAudit.lighting},subtitles:window.sample.subtitleAudit.length});}}
  const events=window.sample.lighting.events,accents=[];for(const e of events){window.sample.lighting.begin(e.time_body+.025,null);accents.push({id:e.id,time:e.time_body,audit:{...window.sample.lighting.audit}});}
  return{rows,accents,eventCount:events.length};
 }):null;
 const report={passed:errors.length===0&&records.every(r=>r.subtitleIdentical),staticOnly,records,runtime,errors};
 fs.writeFileSync(path.join(OUT,'scene-clip-review.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({passed:report.passed,errors,runtimeFrames:runtime?.rows.length,eventCount:runtime?.eventCount},null,2));if(!report.passed)process.exitCode=1;
}finally{await browser?.close();server.closeAllConnections();await new Promise(r=>server.close(r));}
