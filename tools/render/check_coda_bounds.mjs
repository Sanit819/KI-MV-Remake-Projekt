/** Read-only, every-frame coda bounds check against real main.js / Art.
 * node tools/render/check_coda_bounds.mjs
 * Uses a hidden isolated Edge profile inside the repository. It does not edit
 * production rendering code or approximate contain placement with its request rect.
 */
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {chromium} from 'playwright-core';

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const FIRST=12660,LAST=13100,FPS=60,W=1920,H=1080,LIMIT={min_x:0,max_x:1920,min_y:0,max_y:940};
const REPORT=path.join(ROOT,'docs/validation/astra-v2-coda-bounds.json');
const PROFILE=path.join(ROOT,'.cache/coda-bounds',new Date().toISOString().replace(/[:.]/g,'-'),'edge-profile');
const EDGE='C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const hash=file=>createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const relative=file=>path.relative(ROOT,file).replaceAll('\\','/');
const sourceFiles=fs.readdirSync(path.join(ROOT,'src/mv2')).filter(name=>/\.(js|html)$/.test(name)).map(name=>path.join(ROOT,'src/mv2',name));
sourceFiles.push(...['src/full/vendor/trace.js','data/production-v2/timeline.json','data/production-v2/lyrics.en.json','assets/astra/v07/manifest.json'].map(name=>path.join(ROOT,name)));
const manifest=JSON.parse(fs.readFileSync(path.join(ROOT,'assets/astra/v07/manifest.json'),'utf8'));
const backPath=path.resolve(ROOT,'.'+manifest.assets.back.path);
if(!backPath.startsWith(ROOT+path.sep)||!fs.existsSync(backPath))throw Error('Back artwork must exist inside the repository.');
sourceFiles.push(backPath);
const inputs=sourceFiles.map(file=>({path:relative(file),sha256:hash(file)}));
fs.mkdirSync(path.dirname(REPORT),{recursive:true});fs.mkdirSync(PROFILE,{recursive:true});
const report={passed:false,phase:'preflight',started_at:new Date().toISOString(),fps:FPS,width:W,height:H,
  frame_interval:{first_inclusive:FIRST,end_exclusive:LAST,count:LAST-FIRST,seconds:[FIRST/FPS,LAST/FPS]},
  limits:LIMIT,source_sha256:inputs,browser_profile:relative(PROFILE),network:[],page_errors:[],console_errors:[],request_failures:[],frames:[],
  scope:'Every frame from 211.000000 to 218.316667 s is rendered through the real main.js/Art. The four source-bounds corners use Art.layout contain scale/translation and the actual Canvas transform at Art.place, including placement rotation. This certifies the source bounding rectangle stays inside x=0..1920, y=0..940; it is not per-pixel silhouette, opacity, clipping, logo, continuous-playback or line-contact visual certification. The real source pen anchor is also mapped through the placement transform; no substitute request rectangle is used.'};
const save=()=>fs.writeFileSync(REPORT,JSON.stringify(report,null,2)+'\n');
const phase=value=>{report.phase=value;save();console.log(`[coda bounds] ${value}`);};
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.json':'application/json','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.svg':'image/svg+xml','.m4a':'audio/mp4','.css':'text/css'};
const exact=new Set(['/src/full/vendor/trace.js','/data/production-v2/timeline.json','/data/production-v2/lyrics.en.json','/media/audio/mili-world-execute-original-bilibili.m4a']);
const server=http.createServer((req,res)=>{
  try{
    const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
    if(pathname==='/favicon.ico'){res.writeHead(204);res.end();return;}
    const file=path.resolve(ROOT,'.'+pathname),allowed=pathname.startsWith('/src/mv2/')||pathname.startsWith('/assets/astra/')||exact.has(pathname);
    const status=req.method!=='GET'?405:!allowed||!file.startsWith(ROOT+path.sep)?403:!fs.existsSync(file)||!fs.statSync(file).isFile()?404:200;
    report.network.push({path:pathname,status});
    if(status!==200){res.writeHead(status);res.end(String(status));return;}
    res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store'});
    const stream=fs.createReadStream(file);stream.on('error',e=>{report.request_failures.push({path:pathname,error:e.message});res.destroy(e);});stream.pipe(res);
  }catch(e){report.request_failures.push({path:req.url,error:e.message});if(!res.headersSent)res.writeHead(500);res.end(e.message);}
});
let context;const started=Date.now();
try{
  phase('launching_hidden_browser');
  if(!fs.existsSync(EDGE))throw Error('Expected Edge executable missing.');
  await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});
  context=await chromium.launchPersistentContext(PROFILE,{executablePath:EDGE,headless:true,viewport:{width:W,height:H},deviceScaleFactor:1,
    args:['--disable-background-timer-throttling','--disable-renderer-backgrounding','--disable-backgrounding-occluded-windows','--ignore-gpu-blocklist','--use-angle=d3d11']});
  const page=context.pages()[0]||await context.newPage();page.setDefaultTimeout(120000);
  page.on('pageerror',e=>report.page_errors.push({message:e.message,stack:e.stack}));
  page.on('console',m=>{if(m.type()==='error')report.console_errors.push(m.text());});
  page.on('requestfailed',r=>report.request_failures.push({path:new URL(r.url()).pathname,error:r.failure()?.errorText}));
  phase('loading_real_renderer');
  await page.goto(`http://127.0.0.1:${server.address().port}/src/mv2/index.html?w=1920&h=1080`,{waitUntil:'load',timeout:120000});
  await page.evaluate(async()=>{if(!window.sample)throw Error('window.sample missing');await window.sample.ready;});
  report.renderer=await page.evaluate(()=>{
    const s=window.sample,art=s.art,ctx=art.ctx;
    if(s.canvas.width!==1920||s.canvas.height!==1080)throw Error('Expected native 1920x1080 canvas.');
    if(!art.items.back?.bounds)throw Error('Actual back source bounds missing.');
    const originalPlace=art.place.bind(art);
    window.__codaBack=[];
    art.place=(name,x,y,w,h,options={})=>{
      if(name==='back'){
        const source=art.items.back;
        if(!source?.bounds)throw Error('Missing actual back source bounds during draw.');
        const b=source.bounds;
        if(![b.x,b.y,b.w,b.h].every(Number.isFinite)||b.w<=0||b.h<=0)throw Error('Invalid actual source bounds.');
        const p=art.layout(name,x,y,w,h,options.mode);
        if(!p.b||p.b!==source.bounds||![p.s,p.tx,p.ty].every(Number.isFinite)||p.s<=0)throw Error('Invalid live Art.layout result.');
        const anchor=source.anchors?.pen;
        if(!Array.isArray(anchor)||anchor.length!==2||!anchor.every(Number.isFinite))throw Error('Actual back pen anchor missing.');
        const base=ctx.getTransform(),rotation=options.rotation||0;
        const matrix=base.translate(x+w/2,y+h/2).rotate(rotation*180/Math.PI).translate(-x-w/2,-y-h/2).translate(p.tx,p.ty).scale(p.s,p.s);
        const map=(xx,yy)=>{const point=new DOMPoint(xx,yy).matrixTransform(matrix);return [point.x,point.y];};
        const corners=[[b.x,b.y],[b.x+b.w,b.y],[b.x+b.w,b.y+b.h],[b.x,b.y+b.h]].map(([xx,yy])=>map(xx,yy));
        const values=corners.flat();if(!values.every(Number.isFinite))throw Error('Non-finite transformed back bounds.');
        window.__codaBack.push({request_rect:[x,y,w,h],mode:options.mode||'contain',source_bounds:{...b},source_pen_anchor:[...anchor],
          caller_canvas_transform:[base.a,base.b,base.c,base.d,base.e,base.f],placement_rotation_radians:rotation,
          layout:{scale:p.s,translate_x:p.tx,translate_y:p.ty},source_to_screen:[matrix.a,matrix.b,matrix.c,matrix.d,matrix.e,matrix.f],
          corners,screen_bounds:{min_x:Math.min(...corners.map(a=>a[0])),max_x:Math.max(...corners.map(a=>a[0])),min_y:Math.min(...corners.map(a=>a[1])),max_y:Math.max(...corners.map(a=>a[1]))},
          pen_anchor_screen:map(...anchor),effective_alpha:ctx.globalAlpha*(options.alpha??1)});
      }
      return originalPlace(name,x,y,w,h,options);
    };
    return {name:s.renderer,canvas:[s.canvas.width,s.canvas.height],back_source:{path:art.items.back.path,width:art.items.back.w,height:art.items.back.h,bounds:art.items.back.bounds,pen:art.items.back.anchors.pen}};
  });
  phase('checking_440_real_frames');
  for(let first=FIRST;first<LAST;first+=20){
    const batch=await page.evaluate(async({first,last,limits})=>{
      const rows=[];
      for(let frame=first;frame<last;frame++){
        window.__codaBack=[];await window.sample.renderFrame(frame/60);
        const placements=window.__codaBack;
        if(placements.length!==1)throw Error(`Frame ${frame}: expected exactly one real back Art.place, found ${placements.length}`);
        const bounds=placements[0].screen_bounds;
        const margins={left:bounds.min_x-limits.min_x,right:limits.max_x-bounds.max_x,top:bounds.min_y-limits.min_y,bottom:limits.max_y-bounds.max_y};
        rows.push({frame,seconds:frame/60,shot:window.sample.currentShot,passed:Object.values(margins).every(v=>v>=0),margins,placement:placements[0]});
      }
      return rows;
    },{first,last:Math.min(LAST,first+20),limits:LIMIT});
    report.frames.push(...batch);
    if(report.frames.length%100===0||report.frames.length===LAST-FIRST){save();console.log(`[coda bounds] ${report.frames.length}/${LAST-FIRST}; out of bounds ${report.frames.filter(f=>!f.passed).length}`);}
  }
  const minimum={};
  for(const side of ['left','right','top','bottom']){
    const row=report.frames.reduce((a,b)=>b.margins[side]<a.margins[side]?b:a);
    minimum[side]={pixels:row.margins[side],frame:row.frame,seconds:row.seconds,pen_anchor_screen:row.placement.pen_anchor_screen};
  }
  report.minimum_margins=minimum;
  const allMin=report.frames.map(row=>({pixels:Math.min(...Object.values(row.margins)),frame:row.frame,seconds:row.seconds})).sort((a,b)=>a.pixels-b.pixels)[0];
  report.minimum_any_margin=allMin;
  report.source_unchanged=inputs.every(item=>hash(path.join(ROOT,item.path))===item.sha256);
  report.checks={all_440_frames:report.frames.length===LAST-FIRST,contiguous:report.frames.every((f,i)=>f.frame===FIRST+i),all_in_r86:report.frames.every(f=>f.shot==='R86'),
    all_actual_source_bounds_inside:report.frames.every(f=>f.passed),pen_anchor_recorded_every_frame:report.frames.every(f=>f.placement.pen_anchor_screen.every(Number.isFinite)),
    source_unchanged:report.source_unchanged,no_js_errors:report.page_errors.length===0&&report.console_errors.length===0,no_request_errors:report.request_failures.length===0&&report.network.every(r=>r.status<400)};
  report.passed=Object.values(report.checks).every(Boolean);report.phase=report.passed?'complete':'checks_failed';
}catch(e){report.failed_phase=report.phase;report.phase='failed';report.error=e.message;report.stack=e.stack;}
finally{await context?.close().catch(()=>{});await new Promise(resolve=>server.close(()=>resolve()));report.elapsed_seconds=(Date.now()-started)/1000;save();}
console.log(JSON.stringify({passed:report.passed,report:REPORT,frames:report.frames.length,minimum_margins:report.minimum_margins,error:report.error},null,2));
if(!report.passed)process.exitCode=1;
