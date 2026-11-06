import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import http from 'node:http';
import {chromium} from 'playwright-core';
const ROOT=process.cwd(),OUT=path.join(ROOT,'exports/preview-v52-combination');
const manifest=JSON.parse(fs.readFileSync(path.join(ROOT,'data/production-v52review/manifest.json'),'utf8'));
const mime={'.html':'text/html','.js':'text/javascript','.json':'application/json','.png':'image/png','.jpg':'image/jpeg','.svg':'image/svg+xml','.mp4':'video/mp4'};
const server=http.createServer((req,res)=>{const u=new URL(req.url,'http://localhost'),p=path.resolve(ROOT,'.'+decodeURIComponent(u.pathname));if(!p.startsWith(ROOT+path.sep)||!fs.existsSync(p)||!fs.statSync(p).isFile()){res.writeHead(404);res.end();return;}res.writeHead(200,{'Content-Type':mime[path.extname(p)]||'application/octet-stream'});fs.createReadStream(p).pipe(res);});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
let browser;const errors=[];
try{
 browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true});
 const page=await browser.newPage({viewport:{width:1920,height:1080}});page.on('pageerror',e=>errors.push(String(e)));
 await page.goto(`http://127.0.0.1:${server.address().port}/src/mv52review/index.html?w=3840&h=2160&lighting=1&artPreview=1`);await page.evaluate(()=>window.sample.ready);
 const rows=await page.evaluate(()=>{
  const s=window.sample,rows=[];
  for(let frame=6219;frame<6648;frame++){
   s.renderFrame(frame/60);const a=s.sceneAudit,g=a.goldConnector,p=s.art.actionLayout('A04',Math.max(0,Math.min(1,(frame/60-103.65)/7.15)),800,72,1030,800,{phases:[.32,.72]});
   const tangentCross=g.waveEndTangent[0]*g.connectorStartTangent[1]-g.waveEndTangent[1]*g.connectorStartTangent[0];
   rows.push({frame,body_time:frame/60,shot:s.currentShot,asset:p.name,phase:p.phase,sourceHand:s.art.items[p.name].anchors.hands,hand:p.anchors.hands,connectorEnd:g.connectorEnd,startGap:g.startGap,handGap:g.handGap,singleStroke:g.singleStroke,tangentCross,extraLightActive:a.extraLight.active});
  }
  return rows;
 });
 const phaseCounts=Object.fromEntries([1,2,3].map(p=>[p,rows.filter(r=>r.phase===p).length]));
 const passed=errors.length===0&&rows.length===429&&rows.every(r=>r.singleStroke&&r.startGap===0&&r.handGap===0&&Math.hypot(r.hand[0]-r.connectorEnd[0],r.hand[1]-r.connectorEnd[1])<1e-8&&Math.abs(r.tangentCross)<1e-6&&!r.extraLightActive)&&phaseCounts[1]===138&&phaseCounts[2]===171&&phaseCounts[3]===120;
 const asset=manifest.assets.A04_02,p=path.join(ROOT,asset.path.slice(1));
 const result={passed,width:3840,height:2160,frames:429,phaseCounts,sourcePath:asset.path,sourceSha256:crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex'),sourceAnchors:asset.anchors,errors,rows};
 fs.writeFileSync(path.join(OUT,'wave-429-runtime.json'),JSON.stringify(result,null,2)+'\n');
 console.log(JSON.stringify({passed,frames:429,phaseCounts,source:asset.path,errors}));if(!passed)process.exitCode=1;
}finally{await browser?.close();server.closeAllConnections();await new Promise(r=>server.close(r));}
