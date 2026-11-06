import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright-core';
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..'),OUT=path.join(ROOT,'exports/preview-v52-wave');
const read=p=>fs.readFileSync(path.join(ROOT,p)),sha=b=>createHash('sha256').update(b).digest('hex');
const original=read('src/mv5cat/middle.js').toString(),current=read('src/mv52/middle.js').toString();
const split=s=>[s.slice(0,s.indexOf('function resonance(e){')),s.slice(s.indexOf('// Error pages become actual foreground boundaries.'))];
const a=split(original),b=split(current),sourceOnlyResonance=a[0]===b[0]&&a[1]===b[1];
const mime={'.html':'text/html','.js':'text/javascript','.json':'application/json','.png':'image/png','.jpg':'image/jpeg','.svg':'image/svg+xml','.m4a':'audio/mp4'};
const server=http.createServer((req,res)=>{try{const u=new URL(req.url,'http://localhost');if(u.pathname==='/favicon.ico'){res.writeHead(204);res.end();return;}const f=path.resolve(ROOT,'.'+decodeURIComponent(u.pathname));if(!f.startsWith(ROOT+path.sep)||!fs.existsSync(f)||!fs.statSync(f).isFile()){res.writeHead(404);res.end();return;}res.writeHead(200,{'Content-Type':mime[path.extname(f)]||'application/octet-stream'});fs.createReadStream(f).pipe(res);}catch{res.writeHead(500);res.end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;const errors=[];
try{
 browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true});
 const page=await browser.newPage({viewport:{width:1920,height:1080}});page.on('pageerror',e=>errors.push(String(e)));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});page.on('requestfailed',r=>errors.push(r.url()+': '+r.failure()?.errorText));
 await page.goto(`http://127.0.0.1:${server.address().port}/src/mv52/index.html?w=3840&h=2160&artPreview=1`);await page.evaluate(()=>window.sample.ready);
 const result=await page.evaluate(async()=>{
  const ctx=window.sample.canvas.getContext('2d'),native={};let point=null,prevLine=null,lineCount=0,curves=[],goldStrokes=[];
  for(const key of ['beginPath','moveTo','lineTo','bezierCurveTo','stroke'])native[key]=ctx[key].bind(ctx);
  ctx.beginPath=(...args)=>{point=null;prevLine=null;lineCount=0;curves=[];return native.beginPath(...args);};
  ctx.moveTo=(x,y)=>{point=[x,y];return native.moveTo(x,y);};
  ctx.lineTo=(x,y)=>{prevLine=point;point=[x,y];lineCount++;return native.lineTo(x,y);};
  ctx.bezierCurveTo=(x1,y1,x2,y2,x,y)=>{curves.push({from:point,previous:prevLine,c1:[x1,y1],c2:[x2,y2],to:[x,y]});point=[x,y];return native.bezierCurveTo(x1,y1,x2,y2,x,y);};
  ctx.stroke=(...args)=>{if(ctx.strokeStyle==='#edc087'&&lineCount===100&&curves.length===1)goldStrokes.push({lineCount,curve:curves[0],width:ctx.lineWidth});return native.stroke(...args);};
  const rows=[];for(let frame=6219;frame<6648;frame++){
   goldStrokes=[];await window.sample.renderFrame(frame/60);const s=window.sample.sceneAudit,g=goldStrokes[0]?.curve;let gap=null,cross=null,dot=null;
   if(g){gap=Math.hypot(g.to[0]-s.palm[0],g.to[1]-s.palm[1]);const v=[g.from[0]-g.previous[0],g.from[1]-g.previous[1]],w=[g.c1[0]-g.from[0],g.c1[1]-g.from[1]],norm=Math.hypot(...v)*Math.hypot(...w);cross=(v[0]*w[1]-v[1]*w[0])/norm;dot=(v[0]*w[0]+v[1]*w[1])/norm;}
   rows.push({frame,shot:window.sample.currentShot,asset:s.actionAsset,phase:s.actionPhase,palm:s.palm,signal:s.goldConnector,actualGoldStrokes:goldStrokes,handGap:gap,tangentCross:cross,tangentDot:dot,subtitleCount:window.sample.subtitleAudit.length});
  }
  await window.sample.renderFrame(6648/60);return{width:window.sample.canvas.width,height:window.sample.canvas.height,rows,nextShot:window.sample.currentShot};
 });
 const transitions=result.rows.filter((r,i)=>i&&r.phase!==result.rows[i-1].phase).map(r=>({frame:r.frame,from:result.rows[r.frame-6220].phase,to:r.phase,previousHandGap:result.rows[r.frame-6220].handGap,newHandGap:r.handGap}));
 const ys=result.rows.map(r=>r.signal.waveEnd[1]),checks={native4K:result.width===3840&&result.height===2160,all429frames:result.rows.length===429,allResonanceShots:result.rows.every(r=>['R40','R41','R42','R43'].includes(r.shot)),oneActualContinuousGoldStrokeEveryFrame:result.rows.every(r=>r.actualGoldStrokes.length===1),endpointAtActualHandEveryFrame:result.rows.every(r=>r.handGap===0),sharedActualWaveEndpointEveryFrame:result.rows.every(r=>r.actualGoldStrokes[0].curve.from.every((v,i)=>v===r.signal.waveEnd[i])),tangentMatchesActualWaveLastSegment:result.rows.every(r=>Math.abs(r.tangentCross)<1e-10&&r.tangentDot>.999999999),dynamicWaveEndpoint:Math.max(...ys)-Math.min(...ys)>99,threePoses:new Set(result.rows.map(r=>r.asset)).size===3,bothPoseCutsConnected:transitions.length===2&&transitions.every(r=>r.previousHandGap===0&&r.newHandGap===0),unchangedR44Boundary:result.nextShot==='R44',onlyResonanceSourceChanged:sourceOnlyResonance,noBrowserErrors:errors.length===0};
 const report={passed:Object.values(checks).every(Boolean),scope:'All 429 native4K R40–R43 runtime frames. Actual Canvas path capture verifies one gold stroke, shared wave endpoint, end tangent and current hand contact. No full-film export.',checks,transitions,maxHandGap:Math.max(...result.rows.map(r=>r.handGap)),maxTangentCross:Math.max(...result.rows.map(r=>Math.abs(r.tangentCross))),waveEndpointRange:[Math.min(...ys),Math.max(...ys)],source_sha256:sha(read('src/mv52/middle.js')),errors,...result};
 fs.writeFileSync(path.join(OUT,'qa.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({passed:report.passed,checks,transitions,maxHandGap:report.maxHandGap,maxTangentCross:report.maxTangentCross,errors},null,2));if(!report.passed)process.exitCode=1;
}finally{await browser?.close();server.closeAllConnections();await new Promise(r=>server.close(r));}
