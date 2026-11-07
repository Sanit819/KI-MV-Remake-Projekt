/* 太陽系デスコ — deterministic 720p30 first-film renderer.
 * Contract compatible with NikusonP's vocaloid-style-mv-pipeline render_frames.mjs.
 * All visual state is a pure function of song time; no wall-clock randomness.
 */
(() => {
  'use strict';
  const W=1280,H=720,DURATION=203.2,FPS=30;
  const C={red:'#ff6452',ink:'#323232',white:'#fffdfc',blue:'#82b4d6',purple:'#b6a0d4',gold:'#f5cf72'};
  const canvas=document.querySelector('#out'),ctx=canvas.getContext('2d',{alpha:false});
  const assets={},missing=[],warnings=[];
  let lyrics=[],beats=[],rhythm=null,sourceLyrics=[];
  const sections=[
    ['opening',0,14.249,1,4],['title',14.249,27.049,0,0],['verse',27.049,52.649,5,12],
    ['pre',52.649,58.649,13,15],['chorus',58.649,71.849,16,19],['calls',71.849,85.049,20,24],
    ['nana',85.049,97.449,25,27],['rap',97.449,110.249,28,31],['quiet',110.249,123.049,32,35],
    ['braid',123.049,129.049,36,38],['reach',129.049,141.849,39,42],['final',141.849,167.849,43,50],
    ['calls2',167.849,182.249,51,55],['drawing',182.249,195.049,56,58],['outro',195.049,203.2,0,0]
  ].map(([id,start,end,l0,l1])=>({id,start,end,l0,l1}));
  const clamp=(v,a=0,b=1)=>Math.min(b,Math.max(a,v));
  const lerp=(a,b,t)=>a+(b-a)*t, smooth=t=>{t=clamp(t);return t*t*(3-2*t)};
  const quant=(t,hz=15)=>Math.floor(t*hz)/hz;
  const fract=x=>x-Math.floor(x);
  const rand=n=>fract(Math.sin(n*127.1+311.7)*43758.5453123);
  const TAU=Math.PI*2;
  const seg=t=>sections.find(s=>t>=s.start&&t<s.end)||sections[sections.length-1];
  function bi(t){let lo=0,hi=beats.length;while(lo<hi){let m=(lo+hi)>>1;if(beats[m]<=t)lo=m+1;else hi=m;}return lo-1;}
  function beat(t){return beats.length?bi(t):Math.floor((t-.249)/.4);}
  function phase(t){let i=bi(t);return beats.length&&i>=0&&i<beats.length-1?clamp((t-beats[i])/(beats[i+1]-beats[i])):fract((t-.249)/.4);}
  const pulse=t=>Math.pow(1-phase(t),3);
  function line(points,color=C.ink,width=2,alpha=1,closed=false){ctx.save();ctx.strokeStyle=color;ctx.lineWidth=width;ctx.globalAlpha=alpha;ctx.lineJoin='round';ctx.lineCap='round';ctx.beginPath();points.forEach((p,i)=>i?ctx.lineTo(p[0],p[1]):ctx.moveTo(p[0],p[1]));if(closed)ctx.closePath();ctx.stroke();ctx.restore();}
  function ellipse(x,y,rx,ry,color=C.ink,lw=2,alpha=1,rot=0){ctx.save();ctx.strokeStyle=color;ctx.lineWidth=lw;ctx.globalAlpha=alpha;ctx.beginPath();ctx.ellipse(x,y,rx,ry,rot,0,TAU);ctx.stroke();ctx.restore();}
  function text(s,x,y,size=74,opt={}){ctx.save();ctx.translate(x,y);if(opt.rot)ctx.rotate(opt.rot);ctx.globalAlpha=opt.alpha??1;ctx.fillStyle=opt.color||C.ink;ctx.textAlign=opt.align||'center';ctx.textBaseline='middle';ctx.font=`${opt.cn?600:400} ${size}px "${opt.cn?'DiscoCN':'DiscoHeavy'}",sans-serif`;let tw=ctx.measureText(s).width;let sx=Math.min(1,(opt.max||1180)/Math.max(tw,1));ctx.scale(sx,1);if(opt.stroke){ctx.strokeStyle=C.white;ctx.lineWidth=5;ctx.strokeText(s,0,0);}ctx.fillText(s,0,0);ctx.restore();}
  function roughRect(x,y,w,h,color=C.ink,fill=null){if(fill){ctx.fillStyle=fill;ctx.fillRect(x,y,w,h);}line([[x+4,y],[x+w,y+2],[x+w-1,y+h-4]],color,2);line([[x+w-7,y+h],[x,y+h-2],[x+1,y+6]],color,2);}
  function spark(x,y,r,color=C.white,lw=3){line([[x-r,y],[x+r,y]],color,lw);line([[x,y-r],[x,y+r]],color,lw);}
  function starPoints(x,y,r=50){return [[0,-1],[.27,-.37],[1,-.23],[.48,.15],[.65,.94],[0,.55],[-.69,.91],[-.46,.17],[-1.04,-.21],[-.28,-.38],[0,-1]].map(p=>[x+p[0]*r,y+p[1]*r]);}
  function legacy(x,y,r=45,alpha=1){let p=starPoints(x,y,r);line(p.slice(0,6),C.gold,3,alpha);line(p.slice(5),C.purple,3,alpha);line([[x+r,y-r*.23],[x+r*1.65,y-r*.11],[x+r*1.94,y+r*.3],[x+r*2.65,y+r*.04]],C.gold,3,alpha);}
  function smallStar(x,y,r=17,color=C.white,rot=0){ctx.save();ctx.translate(x,y);ctx.rotate(rot);line(starPoints(0,0,r),color,2);ctx.restore();}
  function drawPolylineProgress(points,p,color,width=5){if(p<=0)return points[0];let lens=[],sum=0;for(let i=1;i<points.length;i++){let d=Math.hypot(points[i][0]-points[i-1][0],points[i][1]-points[i-1][1]);lens.push(d);sum+=d;}let remaining=sum*clamp(p),out=[points[0]],tip=points[0];for(let i=0;i<lens.length;i++){let a=points[i],b=points[i+1],k=Math.min(1,remaining/lens[i]);tip=[lerp(a[0],b[0],k),lerp(a[1],b[1],k)];out.push(tip);remaining-=lens[i];if(remaining<=0)break;}line(out,color,width);return tip;}
  async function getJSON(url,optional=false){try{let r=await fetch(url,{cache:'no-store'});if(!r.ok)throw new Error(r.status);return await r.json()}catch(e){if(!optional)warnings.push(`${url}: ${e.message}`);return null;}}
  async function imageFile(key,url){return new Promise(resolve=>{let im=new Image;im.onload=()=>{const a={im,w:im.naturalWidth,h:im.naturalHeight,url};assets[key]=a;const c=document.createElement('canvas');c.width=a.w;c.height=a.h;const q=c.getContext('2d',{willReadFrequently:true});q.drawImage(im,0,0);const data=q.getImageData(0,0,a.w,a.h).data;let boxes=[[a.w,a.h,0,0],[a.w,a.h,0,0]],x0=a.w,y0=a.h,x1=0,y1=0,clear=0;for(let y=0;y<a.h;y++)for(let x=0;x<a.w;x++){const al=data[(y*a.w+x)*4+3];if(al<20)clear++;if(al>20){x0=Math.min(x0,x);x1=Math.max(x1,x);y0=Math.min(y0,y);y1=Math.max(y1,y);let box=boxes[x<a.w/2?0:1];box[0]=Math.min(box[0],x);box[1]=Math.min(box[1],y);box[2]=Math.max(box[2],x);box[3]=Math.max(box[3],y);}}a.bounds={x:x0,y:y0,w:x1-x0+1,h:y1-y0+1};a.halfBounds=boxes.map(b=>({x:b[0],y:b[1],w:b[2]-b[0]+1,h:b[3]-b[1]+1}));a.transparent=clear>data.length/4*.01;for(let scale of [.25,.5,.75,1])q.drawImage(im,0,0,a.w*scale,a.h*scale);resolve(a)};im.onerror=()=>{missing.push(key);resolve(null)};im.src=url;});}
  function framePose(t){let n=beat(t);if(n%8===7&&assets.clap)return 'clap';return n%2?'pose-b':'pose-a';}
  function placement(pose,opt={}){const a=assets[pose]||assets['pose-a']||assets.fallback;if(!a)return null;const b=opt.centerSide?a.halfBounds[opt.side]:a.bounds,h=opt.h??665,bottom=opt.bottom??746,cx=opt.x??640;const sc=Math.min(h/b.h,(opt.maxWidth??1220)/b.w);return {a,b,sc,cx,dx:cx-(b.x+b.w/2)*sc,dy:bottom-(b.y+b.h)*sc};}
  function sprite(pose,opt={}){
    const place=placement(pose,opt);if(!place)return;let {a,sc,cx,dx,dy}=place;
    const q=quant(opt.t??0,15);const wobble=opt.still?0:((Math.floor(q*15)%3)-1)*.55;
    ctx.save();ctx.globalAlpha=opt.alpha??1;
    const pivotY=opt.pivotY??H/2;
    if(opt.rot){ctx.translate(cx,pivotY);ctx.rotate(opt.rot);ctx.translate(-cx,-pivotY);}
    ctx.translate(opt.dx??wobble,opt.dy??0);
    if(opt.side===0||opt.side===1){let sx=opt.side*a.w/2;ctx.drawImage(a.im,sx,0,a.w/2,a.h,dx+sx*sc,dy,a.w/2*sc,a.h*sc);}
    else ctx.drawImage(a.im,dx,dy,a.w*sc,a.h*sc);
    ctx.restore();
  }
  function dance(t,opt={}){sprite(opt.pose||framePose(t),{t,...opt});}
  function orbit(t,intensity=1){ctx.save();ctx.translate(640,500);ctx.rotate(Math.sin(t*.3)*.12);for(let j=0;j<3;j++){ellipse(0,0,230+j*140,45+j*32,j%2?C.purple:C.blue,2,.5*intensity);let a=t*(.45+j*.12)+j*2;smallStar(Math.cos(a)*(230+j*140),Math.sin(a)*(45+j*32),9,C.white);}ctx.restore();}
  function constellation(t,n=12,alpha=.7){for(let i=0;i<n;i++){let x=40+rand(i+3)*1200,y=60+rand(i+80)*560;smallStar(x,y,6+rand(i+30)*12,C.white,t*.05*(i%2?1:-1));if(i%4===0)spark(x+30,y-20,5,C.ink,1);}}
  function footsteps(t,spread=1){for(let side=0;side<2;side++)for(let i=0;i<5;i++){let x=330+side*540+(i-2)*34*spread,y=690-i*10;ctx.save();ctx.translate(x,y);ctx.rotate((i%2?.5:-.5)+(side?-.2:.2));ctx.fillStyle=side?C.purple:C.blue;ctx.globalAlpha=.65*(1-i/7);ctx.fillRect(-10,-4,20,8);ctx.restore();}}
  function qCorner(t,index,opt={}){if(!assets.q&&!assets.clap)return;let phase=fract((t-(opt.start||0))/.8+index*.23),pop=phase<.12?smooth(phase/.12):phase>.72?1-smooth((phase-.72)/.28):1;let side=index%2,top=index<2;let x=side?1120:160,y=top?190:710;ctx.save();ctx.translate(x+(side?1:-1)*(1-pop)*140,y+(top?-1:1)*(1-pop)*160);ctx.rotate((index%2?1:-1)*(.1+Math.floor(phase*2)*.12));sprite('q',{side,centerSide:true,x:0,bottom:0,h:190,maxWidth:220,still:true});ctx.restore();if(pop>.7)for(let j=0;j<3;j++)line([[x+(j-1)*20,y-190],[x+(j-1)*25,y-210]],C.ink,2);}
  function chorusQ(t,start=0){for(let i=0;i<4;i++)qCorner(t,i,{start});}
  function pluto(t,x=1120,y=616,r=26){let b=beat(t-.2)%2;ctx.save();ctx.translate(x,y);ctx.rotate(b?.16:-.16);ctx.fillStyle=C.white;ctx.beginPath();ctx.arc(0,0,r,0,TAU);ctx.fill();ellipse(0,0,r,r,C.ink,2);line([[-r-2,0],[-r-16,-6],[-r-16,b?-32:-15]],C.ink,2);line([[r+2,0],[r+15,7],[r+15,b?25:40]],C.ink,2);line([[-8,-5],[-2,-5]],C.ink,2);line([[7,-5],[13,-5]],C.ink,2);line([[1,7],[7,7]],C.ink,1.7);ellipse(0,0,r*1.5,r*.4,C.ink,1.4,.8,-.3);ctx.restore();}
  function currentLine(t){return lyrics.find(l=>t>=l.start&&t<l.end)||null;}
  function cleanJa(s){return s.replace(/（[^）]*）/g,'').replace(/\([^)]*\)/g,'').replace(/\s+/g,' ').trim();}
  function backgroundLyric(l,t,opt={}){if(!l)return;let s=cleanJa(l.ja),p=clamp((t-l.start)/.18);let id=Number(l.id?.slice(1)||0);if(opt.wall){for(let j=0;j<5;j++)text(s,640+(j%2?1:-1)*(1-p)*180,82+j*140,75,{max:1240,alpha:.92});return;}
    const chunks=s.length>17?[s.slice(0,Math.ceil(s.length/2)),s.slice(Math.ceil(s.length/2))]:[s];
    if(chunks.length===1)text(s,640,112+(1-p)*25,Math.min(114,92+(s.length<9?25:0)),{max:1190,alpha:.96});
    else{ text(chunks[0],640,90+(1-p)*25,82,{max:1190});text(chunks[1],640,595-(1-p)*25,80,{max:1190}); }
    if(id%5===0&&pulse(t)>.6)line([[32,23],[1248,23]],C.ink,5);
  }
  function subtitle(l,t){if(!l){window.__subtitleFrame=null;return;}const ja=String(l.ja||'').replace(/\s+/g,' ').trim(),zh=l.zh||'';text(ja,640,662,26,{cn:true,max:1180,color:C.ink,stroke:true});text(zh,640,696,23,{cn:true,max:1180,color:C.ink,stroke:true});window.__subtitleFrame={id:l.id,ja,zh,yJa:662,yZh:696,fontJa:26,fontZh:23,fontFamily:'DiscoCN',maxWidth:1180,start:l.start,end:l.end};}
  function title(t){let local=t-14.249,pulseS=1+.045*pulse(t);ctx.save();ctx.translate(640,360);ctx.scale(pulseS,pulseS);text('太陽系',0,-90,174,{max:1150});text('デスコ',0,100,195,{max:1120});ctx.restore();text('ASTRA × ds',640,622,31,{max:650});if(local>5)text('MUSIC・LYRICS  ナユタン星人',640,672,24,{max:1120});}
  function school(t){let k=smooth((t-39.849)/.3)*(1-smooth((t-45.9)/.349));if(!k)return;ctx.save();ctx.translate(640,420);ctx.scale(k,1);roughRect(-330,-170,660,350,C.ink,C.white);line([[-365,-170],[0,-310],[365,-170]],C.ink,3);for(let x=-260;x<=200;x+=110)roughRect(x,-110,65,75,C.ink);text('校舎',0,80,125,{max:570});ctx.restore();}
  function paper(t){ctx.save();ctx.translate(640,410);ctx.rotate(.02*Math.sin(quant(t,4)));roughRect(-240,-160,480,320,C.ink,C.white);line([[205,-160],[205,-125],[240,-125]],C.ink,2);ctx.restore();}
  function oldStarScene(t){let p=smooth(t/2.2),x=lerp(540,620,p),y=lerp(350,170,p),r=lerp(102,42,p);if(t<2.6){paper(t);line([[450,460],[520,420],[590,460],[660,420],[730,460],[800,420]],C.purple,4,1-p*.4);}legacy(x,y,r);}
  function drawOpening(t,l){if(t<2.6){oldStarScene(t);if(t>1.0)backgroundLyric(l,t);return;}backgroundLyric(l,t);orbit(t,clamp((t-5)/5));legacy(620,165,40+3*pulse(t));if(t<8){sprite('reach',{t,h:560,bottom:750});let p=clamp((t-3)/5);ellipse(640,390,220,70,C.blue,3,p);line([[420,390],[535,310],[650,345],[820,380]],C.purple,3,p);}else dance(t);footsteps(t);}
  function drawVerse(t,l){backgroundLyric(l,t);orbit(t,.45);if(t>30.249&&t<33.449){roughRect(70,580,160,78,C.ink,C.white);for(let i=0;i<4;i++)smallStar(90+i*52,490+14*Math.sin(t*3+i),18,C.white);qCorner(t,2,{start:30.249});}if(t>33.449&&t<39.849){for(let i=0;i<5;i++){smallStar(210+i*210,210+16*Math.sin(t*4+i),24,C.white);text(String(i+1),210+i*210,257,25);}}if(t>39.849&&t<46.249){school(t);sprite('clap',{side:0,x:640,dx:-165+40*Math.sin(quant(t,5)),t,h:610,bottom:755});sprite('clap',{side:1,x:640,dx:165-40*Math.sin(quant(t,5)),t,h:610,bottom:755});}else dance(t);footsteps(t,.8);if(t>46.249)pluto(t);legacy(1155,103,26,.9);}
  function drawPre(t,l){backgroundLyric(l,t);for(let i=0;i<7;i++){let a=t*1.5+i*TAU/7;smallStar(640+Math.cos(a)*420,365+Math.sin(a)*205,18,C.white,a);}dance(t,{pose:beat(t)%3===0?'clap':framePose(t)});for(let x of [430,870]){ctx.fillStyle=C.white;ctx.beginPath();ctx.arc(x,365,9+5*pulse(t),0,TAU);ctx.fill();}legacy(640,104,34);}
  function drawChorus(t,l,final=false){backgroundLyric(l,t);orbit(t,1);constellation(t,final?18:10);dance(t,{pose:final&&t>=145.449&&t<148.249?'reach':undefined});footsteps(t,1.7);legacy(630,160,36+4*pulse(t));if(beat(t)%8>5)chorusQ(t);if(final){if(t>161.449){const names=['水','金','地','火','木','土','天','海'];let n=Math.min(8,Math.floor((t-161.449)/.4)+1);for(let i=0;i<n;i++){let x=160+i*140,y=70+(i%2)*28;ellipse(x,y,28,28,C.ink,3);text(names[i],x,y,29);if(i===5)ellipse(x,y,45,12,C.ink,2);}}if(t>164.649)pluto(t,1182,590,22);}}
  function drawCalls(t,l,start){backgroundLyric(l,t);orbit(t,.5);dance(t,{pose:beat(t)%2?'clap':framePose(t)});chorusQ(t,start);let p=fract((t-start)/6.4),x,y;if(p<.25){x=lerp(300,1220,p*4);y=lerp(540,80,p*4);}else if(p<.5){x=lerp(1220,40,(p-.25)*4);y=60;}else if(p<.75){x=40;y=lerp(60,640,(p-.5)*4);}else{x=lerp(40,845,(p-.75)*4);y=lerp(640,430,(p-.75)*4);}smallStar(x,y,22,C.white,t*4);if(p>.94){spark(850,435,55,C.white,3);text('!',1045,410,85);}legacy(620,150,32);}
  function drawNana(t,l){backgroundLyric(l,t,{wall:true});for(let j=0;j<3;j++){let p=fract((t-85.049)/3.2+j*.27);text('ナーナナナーナ',lerp(-150,1480,p),115+j*214,96,{max:1250});}dance(t);chorusQ(t,85.049);if(t>88.4&&t<92){line([[70,110],[105,60],[140,110]],C.white,6);line([[1150,110],[1180,60],[1210,110]],C.white,6);} }
  function drawRap(t,l){backgroundLyric(l,t);let rotation=t<99.449?0:t<99.849?Math.PI*smooth((t-99.449)/.4):t<106.649?Math.PI:t<107.049?Math.PI*(1-smooth((t-106.649)/.4)):0;ctx.save();ctx.translate(640,360);ctx.rotate(rotation);ctx.translate(-640,-360);orbit(t,1);for(let i=0;i<12;i++){let x=((i*130-t*180)%1560+1560)%1560-130;line([[x,656],[x+70,656]],i%2?C.blue:C.purple,8);}dance(t);ctx.restore();text('HA, HA, HA, HA',640,650,67,{max:1190});if(t>104.5){ellipse(640,360,460,160,C.ink,5,.75,Math.sin(t)*.25);} }
  function drawQuiet(t,l){backgroundLyric(l,t);if(t<116.6){line([[240,620],[370,500],[550,545]],C.blue,4);line([[750,545],[910,505],[1040,620]],C.purple,4);sprite('draw',{t,h:500,bottom:760,maxWidth:1050});if(t>113.8)drawPolylineProgress([[550,545],[640,480],[750,545]],clamp((t-113.8)/1.6),C.purple,4);}else{let p=clamp((t-116.6)/6.449),w=1280*Math.sin(p*Math.PI);ctx.fillStyle=C.ink;ctx.fillRect(0,180,w,340);smallStar(640,340,95,C.white,t);dance(t);line([[0,525],[w,525]],C.purple,8);ellipse(w,500,24,45,C.blue,4);}}
  function drawBraid(t,l){backgroundLyric(l,t);for(let j=0;j<2;j++){const points=[];for(let i=0;i<=48;i++){let x=100+i*22.5;points.push([x,540+Math.sin(i*.34+t*2+j*Math.PI)*54]);}drawPolylineProgress(points,clamp((t-123.049)/3.5),j?C.purple:C.blue,4);}dance(t);legacy(630,140,35);}
  function drawReach(t,l){let p=clamp((t-129.049)/12.8),sep=p<.15?300*smooth(p/.15):p<.58?300:p<.82?300*(1-smooth((p-.58)/.24)):0;legacy(640,130,39);if(p<.65){text('彼方',640,330,210,{max:550});line([[640,20],[650,700]],C.ink,5,.45);}else if(p<.84)text('手をのばして',640,115,64,{max:1150});if(p>.9)dance(t);else{sprite('reach',{side:0,dx:-sep,t,h:610,bottom:760});sprite('reach',{side:1,dx:sep,t,h:610,bottom:760});}if(p>.68){let k=clamp((p-.68)/.2);drawPolylineProgress([[200,650],[440,595],[640,630]],k,C.blue,6);drawPolylineProgress([[640,630],[840,595],[1080,650]],k,C.purple,6);if(p>.82&&p<.9){spark(640,414,44,C.white,4);}}}
  function newStarStrokes(cx,cy,r){let p=starPoints(cx,cy,r);return [p.slice(5,8),p.slice(7,11),p.slice(0,3),p.slice(2,6),[[cx+r*.65,cy+r*.94],[cx+r*1.28,cy+r*.7],[cx+r*1.6,cy+r*1.0]],[[cx+r*1.6,cy+r],[cx+r*1.95,cy+r*.7],[cx+r*2.15,cy+r*1.07],[cx+r*2.45,cy+r*.92]]];}
  function drawNewStar(t,cx=615,cy=523,r=40,complete=false){let strokes=newStarStrokes(cx,cy,r),tips=[null,null],active=-1;for(let i=0;i<6;i++){let elapsed=t-(185.449+i*1.35),p=complete?1:clamp(elapsed/1.08);if(p>0)tips[i%2]=drawPolylineProgress(strokes[i],p,i%2?C.purple:C.blue,4);if(elapsed>=0&&elapsed<1.08)active=i;}return {active,tips};}
  function drawDrawing(t,l){if(t<185.449){backgroundLyric(l,t);dance(t);for(let i=0;i<4;i++){let sx=i%2?1240:40,sy=i<2?100:600;line([[sx,sy],[640,470]],i%2?C.purple:C.blue,2,.6);}chorusQ(t,182.249);return;}text('ふたりの銀河',640,60,59,{max:1100});roughRect(160,445,960,190,C.ink,C.white);let state=drawNewStar(t),opt={t,h:530,bottom:650,maxWidth:1200,still:true},place=placement('draw',opt);if(place){const anchors=[[735,806],[931,814]],waiting=[[590,550],[665,550]];for(let side=0;side<2;side++){let raw=anchors[side],natural=[place.dx+raw[0]/1672*place.a.w*place.sc,place.dy+raw[1]/941*place.a.h*place.sc],tip=state.tips[side]||waiting[side],offset=[tip[0]-natural[0],tip[1]-natural[1]];sprite('draw',{...opt,side,dx:offset[0],dy:offset[1]});}window.__drawingFrame={active:state.active,tips:state.tips,anchors};}ctx.fillStyle=C.red;ctx.fillRect(0,642,W,78);line([[160,638],[1120,638]],C.ink,2);legacy(1110,140,33);if(t>193.549)spark(757,549,18,C.white,2);}
  function drawOutro(t){let p=(t-195.049)/8.151;legacy(610,145,58);drawNewStar(t,585,360,75,true);sprite(framePose(t),{t,h:300,bottom:745,maxWidth:600});if(p<.6){text('太陽系デスコ',640,560,55,{max:900});text('MUSIC・LYRICS  ナユタン星人',640,612,22,{max:1120});text('CHARACTER DESIGN  ZipZipPipe / 上善无形',640,644,19,{max:1130});}else{line([[540,550],[587,545]],C.blue,5);line([[700,550],[745,545]],C.purple,5);}pluto(t,1155,632,23);}
  function scene(t){let s=seg(t),l=currentLine(t);window.__subtitleFrame=null;ctx.save();ctx.fillStyle=C.red;ctx.fillRect(0,0,W,H);
    switch(s.id){
      case'opening':drawOpening(t,l);break;
      case'title':dance(t);legacy(1110,103,25);title(t);if(beat(t)%8>=6)chorusQ(t,14.249);break;
      case'verse':drawVerse(t,l);break;
      case'pre':drawPre(t,l);break;
      case'chorus':drawChorus(t,l);break;
      case'calls':drawCalls(t,l,71.849);break;
      case'nana':drawNana(t,l);break;
      case'rap':drawRap(t,l);break;
      case'quiet':drawQuiet(t,l);break;
      case'braid':drawBraid(t,l);break;
      case'reach':drawReach(t,l);break;
      case'final':drawChorus(t,l,true);break;
      case'calls2':drawCalls(t,l,167.849);break;
      case'drawing':drawDrawing(t,l);break;
      case'outro':drawOutro(t);break;
    }
    if(s.id!=='title'&&s.id!=='outro')subtitle(l,t);
    ctx.restore();
  }
  function fallbackLyrics(source){let arr=[];for(let s of sections){if(!s.l0)continue;let start=s.id==='opening'?1.049:s.start,step=(s.end-start)/(s.l1-s.l0+1);for(let id=s.l0;id<=s.l1;id++){let original=source.find(x=>x.id===`L${String(id).padStart(3,'0')}`);if(original)arr.push({...original,start:start+(id-s.l0)*step,end:start+(id-s.l0+1)*step,timing_status:'temporary_even_spacing_for_engine_smoke_test'});}}return arr;}
  async function init(){
    const fontBase='../../../../vocaloid-style-mv-pipeline/_demo/engine/fonts/';
    for(let [name,file] of [['DiscoHeavy','DelaGothicOne-Regular.ttf'],['DiscoCN','NotoSansSC_wght_.ttf']]){try{let face=new FontFace(name,`url("${fontBase+file}")`);await face.load();document.fonts.add(face);}catch(e){warnings.push(`font ${name}: ${e.message}`);}}
    let orig=await getJSON('../../../lyrics/lyrics.json');sourceLyrics=orig?.entries||[];
    let candidate=await getJSON('../timeline/lyrics-candidate.json',true);let entries=candidate?.entries||candidate?.lines||[];
    lyrics=entries.filter(l=>Number.isFinite(l.start)&&Number.isFinite(l.end)).map(l=>({...sourceLyrics.find(x=>x.id===l.id),...l}));
    if(lyrics.length!==58){warnings.push('Using fallback lyric timing for engine smoke test; final render requires all 58 candidates');lyrics=fallbackLyrics(sourceLyrics);}
    rhythm=await getJSON('../timeline/rhythm-analysis.json',true);beats=(rhythm?.beats||[]).map(x=>typeof x==='number'?x:x.time??x.start).filter(Number.isFinite).sort((a,b)=>a-b);
    await Promise.all(['pose-a','pose-b','clap','reach','draw','q'].map(k=>imageFile(k,`../assets/${k}.png`)));
    await imageFile('fallback','../../../art/style-tests/astra-ds-mv-style-v5.png');
    await document.fonts.load('24px "DiscoCN"',sourceLyrics.map(x=>x.zh).join(''));
    await document.fonts.load('80px "DiscoHeavy"',sourceLyrics.map(x=>x.ja).join(''));
    await document.fonts.ready;
    window.__filmInfo={width:W,height:H,duration:DURATION,fps:FPS,sections,lyrics,beats,assets:Object.fromEntries(Object.entries(assets).map(([k,a])=>[k,{url:a.url,width:a.w,height:a.h,bounds:a.bounds,transparent:a.transparent}])),missing,warnings};
    scene(0);
    return {duration:DURATION,fps:FPS,renderer:'Canvas2D-native-1280x720',shots:sections.length,assets:Object.keys(assets).length};
  }
  window.__zankoMeta={duration:DURATION,fps:FPS};
  window.renderFrame=async time=>{const t=clamp(Number(time)||0,0,DURATION-1/FPS);ctx.setTransform(1,0,0,1,0,0);ctx.globalAlpha=1;ctx.globalCompositeOperation='source-over';scene(t);return {time:t,section:seg(t).id,lyric:currentLine(t)?.id??null,pose:framePose(t)};};
  window.frameInfo=time=>({time,section:seg(time),lyric:currentLine(time),pose:framePose(time),beat:beat(time)});
  window.ready=init();
  if(new URLSearchParams(location.search).has('watch')){
    document.body.classList.add('watch');document.querySelector('#transport').hidden=false;
    const audio=document.querySelector('#audio'),seek=document.querySelector('#seek'),clock=document.querySelector('#clock');
    const stamp=v=>`${String(Math.floor(v/60)).padStart(2,'0')}:${String(Math.floor(v%60)).padStart(2,'0')}`;
    document.querySelector('#play').onclick=async()=>{await window.ready;if(audio.paused)await audio.play();else audio.pause();};
    seek.oninput=async()=>{await window.ready;audio.currentTime=Number(seek.value);window.renderFrame(audio.currentTime);};
    const tick=()=>{if(!audio.paused){window.renderFrame(Math.floor(audio.currentTime*FPS)/FPS);seek.value=audio.currentTime;}clock.textContent=`${stamp(audio.currentTime)} / 03:23`;requestAnimationFrame(tick);};window.ready.then(tick);
  }
})();
