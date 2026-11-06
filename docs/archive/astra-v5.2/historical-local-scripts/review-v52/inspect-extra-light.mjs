import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {chromium} from 'playwright-core';
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const OUT=path.join(ROOT,'exports/preview-v52-extra-light');fs.mkdirSync(OUT,{recursive:true});
const digest=f=>createHash('sha256').update(fs.readFileSync(path.join(ROOT,f))).digest('hex');
const protectedFiles=['src/mv52/main.js','src/mv52/lighting.js','src/mv52/early.js','src/mv52/middle.js','src/mv52/late.js','src/mv52/art.js','src/mv5cat/main.js','assets/astra/v12-approved-cat/manifest.json'];
const before=Object.fromEntries(protectedFiles.map(p=>[p,digest(p)]));
const mime={'.html':'text/html','.js':'text/javascript','.json':'application/json','.png':'image/png','.jpg':'image/jpeg','.svg':'image/svg+xml','.mp4':'video/mp4'};
const server=http.createServer((req,res)=>{const u=new URL(req.url,'http://localhost');if(u.pathname==='/favicon.ico'){res.writeHead(204);res.end();return;}const f=path.resolve(ROOT,'.'+decodeURIComponent(u.pathname));if(!f.startsWith(ROOT+path.sep)||!fs.existsSync(f)||!fs.statSync(f).isFile()){res.writeHead(404);res.end();return;}res.writeHead(200,{'Content-Type':mime[path.extname(f)]||'application/octet-stream'});fs.createReadStream(f).pipe(res);});
await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;const errors=[];
try{
 browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true});
 const page=await browser.newPage({viewport:{width:1920,height:1080}});
 page.on('pageerror',e=>errors.push(String(e)));page.on('requestfailed',r=>{if(!(r.resourceType()==='media'&&r.failure()?.errorText==='net::ERR_ABORTED'))errors.push(r.url()+': '+r.failure()?.errorText);});
 const origin=`http://127.0.0.1:${server.address().port}`;
 // The unchanged approved renderer isolates the addon from ongoing new-art
 // anchoring work. Its subtitle band is already drawn, but the addon clips
 // strictly above it; this is pixel-equivalent to pre-subtitle placement.
 await page.goto(`${origin}/src/mv52/index.html?w=3840&h=2160&lighting=1&artPreview=1`);await page.evaluate(()=>window.sample.ready);
 await page.evaluate(async()=>{window.extra=await import('/src/mv52review/extra-light.js');});
 const plan=await page.evaluate(()=>window.sample.timeline.shots.flatMap(s=>{
  const target=window.extra.EXTRA_LIGHT_SHOTS.includes(s.id),us=target?[0,.25,.5,.75,.9,1-1/(s.end_frame-s.start_frame)]:[.5];
  return us.map(u=>({shot:s.id,t:(s.start_frame+Math.floor(u*(s.end_frame-s.start_frame)))/60,target,still:target&&(s.id==='R08'?u===.9:u===.5)}));
 }));
 const rows=[];
 for(const item of plan){
  const row=await page.evaluate(({t,still})=>{
   const s=window.sample,canvas=s.canvas,ctx=canvas.getContext('2d');s.renderFrame(t);
   const shot=s.timeline.shots.find(x=>x.id===s.currentShot),u=(t-shot.start_s)/(shot.end_s-shot.start_s),before=ctx.getImageData(0,0,canvas.width,canvas.height),light=JSON.stringify(s.sceneAudit.lighting),subtitles=JSON.stringify(s.subtitleAudit);
   const compare=still?document.createElement('canvas'):null;let cc,off;
   if(still){compare.width=1920;compare.height=580;cc=compare.getContext('2d');cc.fillStyle='#15101d';cc.fillRect(0,0,1920,580);cc.drawImage(canvas,0,40,960,540);off=canvas.toDataURL('image/png');}
   const audit=window.extra.applyExtraLight(ctx,{t,u,shot,sceneAudit:s.sceneAudit},s.lighting),after=ctx.getImageData(0,0,canvas.width,canvas.height);
   const mask=document.createElement('canvas');mask.width=canvas.width;mask.height=canvas.height;const mc=mask.getContext('2d');mc.drawImage(s.lighting.mask,0,0,mask.width,mask.height);const ma=mc.getImageData(0,0,mask.width,mask.height).data;
   let changed=0,subtitleChanges=0,opaqueActorChanges=0,fadedActorChanges=0,shutterChanges=0,maxDelta=0,minX=canvas.width,minY=canvas.height,maxX=-1,maxY=-1;
   for(let i=0;i<before.data.length;i+=4){const d=Math.max(Math.abs(before.data[i]-after.data[i]),Math.abs(before.data[i+1]-after.data[i+1]),Math.abs(before.data[i+2]-after.data[i+2]));if(d){const px=i/4,x=px%canvas.width,y=Math.floor(px/canvas.width);changed++;maxDelta=Math.max(d,maxDelta);if(y>=933*canvas.height/1080)subtitleChanges++;if(ma[i+3]===255)opaqueActorChanges++;if(ma[i+3]>=8)fadedActorChanges++;const sx=((x+.5)*1920/canvas.width-960-s.lighting.shift[0])/s.lighting.zoom+960,sy=((y+.5)*1080/canvas.height-466-s.lighting.shift[1])/s.lighting.zoom+466;if(shot.id==='R14'&&sx>=81&&sx<1839&&sy>=61&&sy<839)shutterChanges++;minX=Math.min(x,minX);minY=Math.min(y,minY);maxX=Math.max(x,maxX);maxY=Math.max(y,maxY);}}
   const result={shot:shot.id,t,full:t+5,u,audit,changedPixels:changed,maxChannelDelta:maxDelta,changedBounds:changed?[minX,minY,maxX+1,maxY+1]:null,subtitlePixelChanges:subtitleChanges,opaqueActorPixelChanges:opaqueActorChanges,fadedActorPixelChanges:fadedActorChanges,visionShutterPixelChanges:shutterChanges,lightingAuditUnchanged:light===JSON.stringify(s.sceneAudit.lighting),subtitleAuditUnchanged:subtitles===JSON.stringify(s.subtitleAudit)};
   if(still){result.off=off;result.on=canvas.toDataURL('image/png');cc.drawImage(canvas,960,40,960,540);cc.font='22px Segoe UI';cc.fillStyle='#f7ead7';cc.fillText(`${shot.id} / accepted lighting / full ${(t+5).toFixed(3)} s`,22,29);cc.fillText('SCENE-ATTACHED EXTRA LIGHT / review only',982,29);result.comparison=compare.toDataURL('image/png');}
   return result;
  },item);
  for(const k of ['off','on','comparison'])if(row[k]){fs.writeFileSync(path.join(OUT,`${item.shot}-${k}.png`),Buffer.from(row[k].split(',')[1],'base64'));delete row[k];}
  rows.push(row);if(item.still)console.log(`Saved ${item.shot} comparison`);
 }
 // Exact disabled path must not touch pixels, even for a normally active shot.
 const offPage=await browser.newPage();await offPage.goto(`${origin}/src/mv52/index.html?w=1920&h=1080&lighting=1&extraLight=0&artPreview=1`);await offPage.evaluate(()=>window.sample.ready);
 const disabled=await offPage.evaluate(async()=>{const {applyExtraLight}=await import('/src/mv52review/extra-light.js'),s=window.sample;s.renderFrame(5.8);const c=s.canvas,ctx=c.getContext('2d'),before=c.toDataURL(),shot=s.timeline.shots.find(x=>x.id===s.currentShot);const audit=applyExtraLight(ctx,{t:5.8,u:(5.8-shot.start_s)/(shot.end_s-shot.start_s),shot,sceneAudit:s.sceneAudit},s.lighting);return{unchanged:before===c.toDataURL(),audit};});
 const protectedAfter=Object.fromEntries(protectedFiles.map(p=>[p,digest(p)]));
 const checks={no_errors:errors.length===0,all_86_shots_sampled:new Set(rows.map(r=>r.shot)).size===86,non_targets_unchanged:rows.filter(r=>!r.audit.active).every(r=>r.changedPixels===0),subtitle_pixels_unchanged:rows.every(r=>r.subtitlePixelChanges===0),opaque_actor_pixels_unchanged:rows.every(r=>r.opaqueActorPixelChanges===0),faded_actor_pixels_unchanged:rows.every(r=>r.fadedActorPixelChanges===0),vision_shutter_pixels_unchanged:rows.every(r=>r.visionShutterPixelChanges===0),approved_lighting_audit_unchanged:rows.every(r=>r.lightingAuditUnchanged),subtitle_audit_unchanged:rows.every(r=>r.subtitleAuditUnchanged),disabled_zero_draw:disabled.unchanged&&!disabled.audit.active,all_12_targets_have_visible_sample:new Set(rows.filter(r=>r.audit.active&&r.changedPixels>0).map(r=>r.shot)).size===12,protected_source_hashes_unchanged:JSON.stringify(before)===JSON.stringify(protectedAfter)};
 const report={passed:Object.values(checks).every(Boolean),timestamp:new Date().toISOString(),scope:'4K addon isolation against unchanged mv52 baseline; all 86 midpoints plus 6 positions of 12 target shots; not final candidate-art combination; not full video manual viewing',checks,samples:rows.length,module_sha256:digest('src/mv52review/extra-light.js'),protectedBefore:before,protectedAfter,disabled,rows,errors};
 fs.writeFileSync(path.join(OUT,'extra-light-validation.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({passed:report.passed,samples:rows.length,checks,errors},null,2));if(!report.passed)process.exitCode=1;
}finally{await browser?.close();server.closeAllConnections();await new Promise(r=>server.close(r));}
