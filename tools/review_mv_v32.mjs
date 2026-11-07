// Local production QA using the installed pipeline browser launcher.
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import crypto from 'node:crypto';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {execFileSync} from 'node:child_process';
const project=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const root=path.dirname(project),pipeline=path.join(root,'vocaloid-style-mv-pipeline');
const frozenModuleChecks=['signature.js','tracking.js','classic.js','attention.js','rice.js','style.css'].map(file=>{
  const original=fs.readFileSync(path.join(project,'production/v3.1/engine',file));
  const current=fs.readFileSync(path.join(project,'production/v3.2/engine',file));
  if(!original.equals(current))throw new Error('Unexpected non-artwork module change: '+file);
  return {file,equal:true,sha256:crypto.createHash('sha256').update(current).digest('hex')};
});
const {launchBrowser,gpuArgs}=await import(pathToFileURL(path.join(pipeline,'_demo/tools/kit_env.mjs')));
const out=path.join(project,'exports/v3.2/review');fs.mkdirSync(out,{recursive:true});
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.ttf':'font/ttf','.flac':'audio/flac','.mp4':'video/mp4'};
const server=http.createServer((req,res)=>{
  let u=new URL(req.url,'http://localhost'),p=path.resolve(root,'.'+decodeURIComponent(u.pathname));
  if(!p.startsWith(root+path.sep)||!fs.existsSync(p)||fs.statSync(p).isDirectory()){res.writeHead(404);res.end();return;}
  const size=fs.statSync(p).size,range=req.headers.range?.match(/bytes=(\d*)-(\d*)/),type=mime[path.extname(p)]||'application/octet-stream';
  if(range){let start=Number(range[1]||0),end=Math.min(size-1,range[2]?Number(range[2]):size-1);res.writeHead(206,{'Content-Type':type,'Content-Length':end-start+1,'Content-Range':`bytes ${start}-${end}/${size}`,'Accept-Ranges':'bytes'});fs.createReadStream(p,{start,end}).pipe(res);}
  else{res.writeHead(200,{'Content-Type':type,'Content-Length':size,'Accept-Ranges':'bytes'});fs.createReadStream(p).pipe(res);}
});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const origin=`http://127.0.0.1:${server.address().port}`;
const browser=await launchBrowser({headless:true,args:[...gpuArgs(),'--autoplay-policy=no-user-gesture-required']});
const page=await browser.newPage({viewport:{width:1280,height:720}}),errors=[];
page.on('pageerror',e=>errors.push(String(e)));
const url=`${origin}/Taiyoukei-Disco/production/v3.2/engine/index.html`;
try{
  await page.goto(url);const meta=await page.evaluate(()=>window.ready),info=await page.evaluate(()=>window.__filmInfo);
  if(info.missing.length||info.warnings.length)throw new Error(JSON.stringify({missing:info.missing,warnings:info.warnings}));
  if(info.version!==3.2||meta.assets!==7||Object.keys(info.assets).length!==7)throw new Error('Wrong v3.2 version or production asset count');
  if(!Array.isArray(info.earPatches)||info.earPatches.length!==4)throw new Error('Four ear patches must load');
  for(const key of ['pose-a','reach','clap','fallback']){
    const patch=info.earPatches.find(p=>p.asset===key);
    if(!patch||patch.url!==`../../v3.1/assets/${key}.png`||patch.changed_pixels_inside<=0||patch.changed_pixels_outside!==0||!patch.bounds_preserved||!patch.halfBounds_preserved)throw new Error('Ear patch invariant failed: '+key);
    if(key==='fallback'&&(!patch.backgroundPreserved||patch.background_restored_pixels<=0))throw new Error('RGB fallback original red backdrop was not preserved');
  }
  if(!Array.isArray(info.handPatches)||info.handPatches.length!==2)throw new Error('Two reach hand patches must load');
  const expectedHandRects={'joined-hands':[760,442,130,113],'astra-outer-hand':[1378,516,126,118]};
  for(const patch of info.handPatches){
    if(patch.asset!=='reach'||patch.url!=='../assets/reach-hands.png'||patch.changed_pixels_inside<=0||patch.changed_pixels_outside!==0||!patch.bounds_preserved||!patch.halfBounds_preserved)throw new Error('Hand patch invariant failed: '+patch.id);
    if(JSON.stringify(patch.rect)!==JSON.stringify(expectedHandRects[patch.id]))throw new Error('Unexpected hand patch rectangle: '+patch.id);
    if(patch.id==='astra-outer-hand'&&(JSON.stringify(patch.preserve_polygon)!==JSON.stringify([[1410,516],[1435,516],[1435,522],[1430,528],[1424,536],[1410,539]])||patch.protected_pixels<=0||patch.changed_protected_pixels!==0))throw new Error('Original hair protection failed');
    if(patch.width!==1672||patch.height!==941||Math.abs(patch.donor_native_size[0]-1672)>1||patch.donor_native_size[1]!==941||patch.map_size.join(',')!=='1672,941'||patch.scale[0]!==1672/patch.donor_native_size[0]||patch.scale[1]!==1)throw new Error('Hand patch donor mapping changed: '+patch.id);
  }
  if(info.handPatchAudit.changed_pixels_outside_union!==0||!info.handPatchAudit.original_geometry_preserved||info.handPatchAudit.split_source_x!==836)throw new Error('Combined hand patch geometry or pixel isolation failed');
  const handsPreview=await page.evaluate(async patches=>{
    const original=new Image,patched=new Image;
    original.src='../../v1/assets/reach.png';patched.src=window.getAssetPreview('reach');await Promise.all([original.decode(),patched.decode()]);
    const sheet=document.createElement('canvas');sheet.width=1280;sheet.height=720;const q=sheet.getContext('2d');
    q.fillStyle='#323232';q.fillRect(0,0,1280,720);
    for(let row=0;row<patches.length;row++){
      const patch=patches[row],[x,y,w,h]=patch.rect,pad=18,sx=Math.max(0,x-pad),sy=Math.max(0,y-pad),sw=Math.min(original.width-sx,w+pad*2),sh=Math.min(original.height-sy,h+pad*2),scale=Math.min(600/sw,300/sh);
      for(let col=0;col<2;col++){
        const dx=col*640+(640-sw*scale)/2,dy=row*360+45+(300-sh*scale)/2;
        q.fillStyle='#fff';q.font='20px sans-serif';q.fillText(patch.id+' / '+(col?'v3.2 patched':'previous hand'),col*640+18,row*360+29);
        q.fillStyle='#ff6452';q.fillRect(dx,dy,sw*scale,sh*scale);q.drawImage(col?patched:original,sx,sy,sw,sh,dx,dy,sw*scale,sh*scale);
      }
    }
    return sheet.toDataURL('image/png').split(',')[1];
  },info.handPatches);
  const assetHandPreview=path.join(out,'asset-hand-review.png');fs.writeFileSync(assetHandPreview,Buffer.from(handsPreview,'base64'));
  const headSpecs=[
    {key:'pose-a',crop:[916,15,400,360]},
    {key:'pose-b',crop:[1020,10,380,360]},
    {key:'clap',crop:[915,15,410,365]},
    {key:'reach',crop:[880,40,470,410]},
    {key:'draw',crop:[900,28,600,560]},
    {key:'q',crop:[1030,190,400,360]},
    {key:'fallback',crop:[910,15,410,365]}
  ];
  const assetPreview=await page.evaluate(async specs=>{
    const sheet=document.createElement('canvas');sheet.width=1680;sheet.height=900;
    const board=sheet.getContext('2d');board.fillStyle='#323232';board.fillRect(0,0,sheet.width,sheet.height);
    const heads=[];
    for(let i=0;i<specs.length;i++){
      const spec=specs[i],image=new Image;image.src=window.getAssetPreview(spec.key);await image.decode();
      const [sx,sy,sw,sh]=spec.crop,head=document.createElement('canvas');head.width=sw;head.height=sh;
      const view=head.getContext('2d');view.fillStyle='#ff6452';view.fillRect(0,0,sw,sh);view.drawImage(image,sx,sy,sw,sh,0,0,sw,sh);
      const x=(i%4)*420,y=Math.floor(i/4)*450,scale=Math.min(400/sw,400/sh);
      board.fillStyle='#fff';board.font='18px sans-serif';board.fillText(spec.key+(spec.key==='fallback'?' (RGB fallback)':''),x+12,y+26);
      board.fillStyle='#ff6452';board.fillRect(x+10,y+40,400,400);
      board.drawImage(head,x+10+(400-sw*scale)/2,y+40+(400-sh*scale)/2,sw*scale,sh*scale);
      heads.push({...spec,source_size:[image.naturalWidth,image.naturalHeight],png:head.toDataURL('image/png').split(',')[1]});
    }
    return {png:sheet.toDataURL('image/png').split(',')[1],heads};
  },headSpecs);
  const assetEarPreview={file:path.join(out,'asset-ear-review.png'),heads:[]};
  fs.writeFileSync(assetEarPreview.file,Buffer.from(assetPreview.png,'base64'));
  for(const {png,...head} of assetPreview.heads){
    const file=path.join(out,`asset-head-${head.key}.png`);fs.writeFileSync(file,Buffer.from(png,'base64'));assetEarPreview.heads.push({...head,file});
  }
  const reachRanges=[
    {section:'opening',first_frame:78,last_frame:239,mode:'full',interval:'[2.6, 8)'},
    {section:'reach',first_frame:3872,last_frame:4217,mode:'two_halves',interval:'[129.049, 140.569]'},
    {section:'final',first_frame:4364,last_frame:4447,mode:'full',interval:'[145.449, 148.249)'}
  ];
  const reachFrames=[77,78,120,239,240,3871,3872,3929,3930,4020,4094,4095,4186,4187,4217,4218,4363,4364,4409,4447,4448];
  const reachSamples=[];
  for(const frame of reachFrames){
    const time=frame/30,range=reachRanges.find(r=>frame>=r.first_frame&&frame<=r.last_frame);
    const actual=await page.evaluate(async time=>{await window.renderFrame(time);return {section:window.frameInfo(time).section.id,calls:window.getSpriteCalls().filter(call=>call.pose==='reach'),handSharding:window.getHandSharding()};},time);
    const expectedSides=range?.mode==='two_halves'?[0,1]:range?[null]:[];
    if(JSON.stringify(actual.calls.map(call=>call.side))!==JSON.stringify(expectedSides))throw new Error('Reach action coverage mismatch at frame '+frame);
    for(const call of actual.calls){
      const expectedSource=call.side===null?[0,0,1672,941]:[call.side*836,0,836,941];
      if(JSON.stringify(call.source)!==JSON.stringify(expectedSource))throw new Error('Reach source crop shifted at frame '+frame);

    }
    if(range?.mode==='two_halves'){
      const [left,right]=actual.calls;
      if(JSON.stringify(left.placement)!==JSON.stringify(right.placement))throw new Error('Split reach halves use different base geometry');
      if(frame>=4187&&JSON.stringify(left.transform)!==JSON.stringify(right.transform))throw new Error('Rejoined reach halves do not align');
      const sharding=actual.handSharding,expectedStage=frame<=4094?'sharded':frame<=4186?'gathering':'replicated';
      if(!sharding||sharding.stage!==expectedStage||sharding.source_cut_x!==836||sharding.image_width!==1672||sharding.rank_count!==2||!sharding.illustration_only||sharding.overlay_bottom>=sharding.subtitle_safe_top)throw new Error('Hand-sharding stage/layout invariant failed at frame '+frame);
      for(let rank=0;rank<2;rank++){
        const call=actual.calls[rank],cut=sharding.cuts[rank],x=call.placement[0]+836*call.placement[2]+call.transform[4];
        if(cut.rank!==rank||Math.abs(cut.x-x)>.001||JSON.stringify(cut.source_rect)!==JSON.stringify(call.source))throw new Error('Rank label no longer follows the original source cut');
      }
      if((expectedStage==='sharded'&&sharding.collective!==null)||(expectedStage!=='sharded'&&sharding.collective!=='all_gather'))throw new Error('Hand-sharding collective phase mismatch');
    }else if(actual.handSharding!==null){
      throw new Error('Hand-sharding overlay leaked outside the original split-hand passage');
    }
    reachSamples.push({frame,time,expected_mode:range?.mode||'absent',...actual});
  }
  const reachCoverage={scope:'Static exhaustive call-site ranges with runtime boundary/phase samples; not a frame-by-frame artistic review',ranges:reachRanges.map(r=>({...r,first_time:r.first_frame/30,last_time:r.last_frame/30,frame_count:r.last_frame-r.first_frame+1})),unique_frames:592,source_half_boundary:836,shared_asset:'assets.reach after both local hand repairs; original x836 half-image performance preserved',hand_sharding:{stages:[{stage:'sharded',first:3872,last:4094},{stage:'gathering',first:4095,last:4186},{stage:'replicated',first:4187,last:4217}],illustration_only:true,reference:'https://docs.pytorch.org/docs/stable/distributed.tensor.html'},samples:reachSamples};
  const arg=process.argv.indexOf('--times');
  const times=arg>=0?process.argv[arg+1].split(',').map(Number):[0.25, 6, 12, 18.5, 25, 27.1, 28.5, 31.5, 34.5, 38.5, 41, 46.35, 47.2, 48.5, 50.5, 52.4, 55, 61, 63, 64.125, 67, 70, 72, 73, 74.5, 76.5, 78.5, 80.5, 83.5, 84.8, 85.2, 86.5, 88.5, 90.5, 93, 96.5, 97.6, 98.8, 100.5, 103.5, 106.8, 109.8, 112, 118, 125.5, 128, 131, 136, 139.5, 143, 148.3, 149, 150.2, 151.5, 153.5, 154.5, 156, 159.2, 161, 162, 167, 173, 180, 184, 187.2, 190.1, 193.5, 195.2, 196.2, 197.3, 199.5, 202.5];
  if(arg<0){times.push(...reachFrames.map(frame=>frame/30),138,140.3,4,8.8,130,134,145.8,147.5,30.233,30.267,36.5,39.833,39.867,76.8,87.6,102,105.5);times.sort((a,b)=>a-b);}
  const records=[];
  for(const t of times){let data=await page.evaluate(async t=>{await window.renderFrame(t);return {png:document.querySelector('#out').toDataURL('image/png').split(',')[1],state:window.frameInfo(t),features:window.__v2Features,sprite_calls:window.getSpriteCalls(),handSharding:window.getHandSharding(),signature:window.__signatureFrame,ml:{tracking:window.__trackingFrame,classic:window.__classicFrame,attention:window.__attentionFrame,rice:window.__riceFrame}}},t);let file=path.join(out,`t${t.toFixed(3).padStart(7,'0')}.png`);fs.writeFileSync(file,Buffer.from(data.png,'base64'));records.push({t,file,state:data.state,features:data.features,sprite_calls:data.sprite_calls,handSharding:data.handSharding,signature:data.signature,ml:data.ml});}
  const capture=async t=>page.evaluate(async t=>{await window.renderFrame(t);return document.querySelector('#out').toDataURL()},t);
  let first=await capture(64.125);await capture(192.4);let second=await capture(64.125);
  if(first!==second)throw new Error('Repeated frame is nondeterministic');
  const deterministicChecks=[];
  for(const t of [18,31.5,48.5,64.125,76.5,83.5,90.5,103.5,151.5,187.5,197.3,202.5]){const a=await capture(t);await capture(t>100?18.45:201.25);const b=await capture(t);if(a!==b)throw new Error('Nondeterministic frame '+t);deterministicChecks.push({time:t,equal:true});}
  const oldReview=JSON.parse(fs.readFileSync(path.join(project,'production/v1/qa/browser-review.json'),'utf8'));
  if(JSON.stringify(info.sections)!==JSON.stringify(oldReview.info.sections))throw new Error('Original story section times changed');
  const cues=JSON.parse(fs.readFileSync(path.join(project,'production/v1/timeline/lyrics-candidate.json'),'utf8')).entries;
  const subtitles=[];
  for(const cue of cues){const state=await page.evaluate(async t=>{await window.renderFrame(t);return window.__subtitleFrame},(cue.start+cue.end)/2);if(!state||state.id!==cue.id||state.ja!==cue.ja.replace(/\s+/g,' ').trim()||state.zh!==cue.zh||state.yJa>=state.yZh)throw new Error('Bilingual cue failed: '+cue.id);subtitles.push(state);}
  const palette=await page.evaluate(async()=>{await window.renderFrame(64.125);return Array.from(document.querySelector('#out').getContext('2d').getImageData(0,0,1,1).data)});
  if(palette.join(',')!=='255,100,82,255')throw new Error('Requested reference palette mismatch: '+palette);
  await page.goto(url+'?watch=1');await page.evaluate(()=>window.ready);
  const playback=await page.evaluate(async()=>{const a=document.querySelector('#audio');a.muted=true;await a.play();await new Promise(r=>setTimeout(r,700));const r={duration:a.duration,time:a.currentTime,paused:a.paused,error:a.error?.message||null,flacSupport:a.canPlayType('audio/flac')};a.pause();return r;});
  if(!playback.time||playback.error||Math.abs(playback.duration-203.2)>.01)throw new Error('FLAC browser playback failed: '+JSON.stringify(playback));
  fs.writeFileSync(path.join(out,'browser-review.json'),JSON.stringify({meta,info,errors,playback,subtitles,palette,asset_ear_preview:assetEarPreview,asset_hand_preview:assetHandPreview,reach_coverage:reachCoverage,frozen_modules:frozenModuleChecks,story_sections_unchanged:true,determinism:{time:64.125,repeat_frame_equal:true,additional:deterministicChecks,sha256:crypto.createHash('sha256').update(first).digest('hex')},records},null,2));
  const py=`from PIL import Image,ImageDraw\nfrom pathlib import Path\nimport json,sys,math\nr=Path(sys.argv[1]); rec=json.loads((r/'browser-review.json').read_text(encoding='utf-8'))['records']\nfor off in range(0,len(rec),12):\n items=rec[off:off+12]; s=Image.new('RGB',(1280,math.ceil(len(items)/4)*204),(32,32,34));d=ImageDraw.Draw(s)\n for i,a in enumerate(items):\n  im=Image.open(a['file']).convert('RGB');im.thumbnail((320,180));x=(i%4)*320;y=(i//4)*204;s.paste(im,(x,y));d.text((x+5,y+184),str(a['t'])+'s | '+a['state']['section']['id'],fill='white')\n s.save(r/('sheet-%02d.jpg'%(off//12)),quality=92)\n`;
  execFileSync(path.join(pipeline,'.venv/Scripts/python.exe'),['-c',py,out],{stdio:'inherit',windowsHide:true});
  console.log(JSON.stringify({stills:records.length,missing:info.missing,warnings:info.warnings,errors,playback,repeat_frame_equal:true,out}));
}finally{await browser.close();await new Promise(r=>server.close(r));}
