import {drawNetwork} from './neural.js';
// R01-R32. V4: computation changes the space. Physical source artwork stays intact.
// The screenplay follows the approved 2026-11-05 shot notes. All visible copy is English.
const TAU=Math.PI*2;
const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
const lerp=(a,b,u)=>a+(b-a)*u;
const smooth=v=>{v=clamp(v);return v*v*(3-2*v);};
const ease=v=>1-(1-clamp(v))**3;
const prog=(v,a,b)=>clamp((v-a)/(b-a));
const range=(n,fn)=>Array.from({length:n},(_,i)=>fn(i));
const typed=(s,p)=>s.slice(0,Math.floor(clamp(p)*s.length));
const tick=(t,f=2)=>Math.floor(t*f)%2===0;
const CAT_PORTAL={x:1020,y:390,w:700,h:280};
const CAT_PEEK={x:1000,y:450,w:700,h:640};

function saved(ctx,fn){ctx.save();fn();ctx.restore();}
function clip(ctx,x,y,w,h,fn){saved(ctx,()=>{ctx.beginPath();ctx.rect(x,y,w,h);ctx.clip();fn();});}
function rotate(ctx,x,y,a,fn){saved(ctx,()=>{ctx.translate(x,y);ctx.rotate(a);fn();});}
function scaleAt(ctx,x,y,s,fn){saved(ctx,()=>{ctx.translate(x,y);ctx.scale(s,s);ctx.translate(-x,-y);fn();});}
function camera(e,x,y,z,fn,angle=0){saved(e.ctx,()=>{e.ctx.translate(960,455);e.ctx.rotate(angle);e.ctx.scale(z,z);e.ctx.translate(-x,-y);fn();});}
function along(points,p){const ds=points.slice(1).map((q,i)=>Math.hypot(q[0]-points[i][0],q[1]-points[i][1]));let left=clamp(p)*ds.reduce((a,b)=>a+b,0);for(let i=0;i<ds.length;i++){if(left<=ds[i])return[lerp(points[i][0],points[i+1][0],left/(ds[i]||1)),lerp(points[i][1],points[i+1][1],left/(ds[i]||1))];left-=ds[i];}return points.at(-1);}
function traffic(e,points,p,{color=e.C.gold,count=5,width=4,loop=false}={}){const{k,C}=e;k.line(points,C.line,width,.7);for(let i=0;i<count;i++){let q=p-i*.13;if(loop)q=(q%1+1)%1;if(q<0||q>1)continue;const pt=along(points,q);k.circle(...pt,7+(i===0?3:0),color);}}
function land(e,x,y,w,h,growth,color=e.C.purple){const{k,C}=e;const g=clamp(growth),line=range(61,i=>[x+i*w/60,y-Math.sin(i/60*Math.PI)*h*.18]);k.trace(line,g,color,5,{pen:false});for(let i=0;i<8;i++){const q=clamp(g*8-i),xx=x+(i+.3)*w/8,hh=h*(.37+((i*37)%11)/16)*ease(q);if(!hh)continue;k.poly([[xx-24,y],[xx-24,y-hh],[xx+8,y-hh-17],[xx+28,y-hh],[xx+28,y]],i%3?C.deep:color);k.line([[xx-17,y-hh*.65],[xx+14,y-hh*.65]],C.paper,2,.6);}}
function arcPoints(x,y,r,a,b,n=100){return range(n,i=>[x+Math.cos(lerp(a,b,i/(n-1)))*r,y+Math.sin(lerp(a,b,i/(n-1)))*r]);}
function route(k,points,p,col,width=5){return k.trace(points,p,col,width,{pen:false});}
function dashed(ctx,k,points,col,width=2,a=.6){saved(ctx,()=>{ctx.setLineDash([9,10]);k.line(points,col,width,a);});}
function plate(e,x,y,w,h,{fill=e.C.panel,line=e.C.line,title='',alpha=1}={}){
 const {k,C}=e;k.roundRect(x,y,w,h,18,fill,line,2,alpha);
 if(title){k.text(title,x+24,y+35,21,C.muted,{font:'mono',alpha});k.line([[x,y+54],[x+w,y+54]],line,1,alpha);}
}
function text(e,s,x,y,size=30,col=e.C.paper,o={}){e.k.text(s,x,y,size,col,{font:'sans',...o});}
function chip(e,s,x,y,w=170,col=e.C.purple){e.k.roundRect(x,y,w,40,20,e.C.panel,col,1.5);text(e,s,x+w/2,y+27,19,col,{font:'mono',align:'center'});}
function cross(e,x,y,r=10,col=e.C.muted,a=.7){e.k.line([[x-r,y],[x+r,y]],col,1,a);e.k.line([[x,y-r],[x,y+r]],col,1,a);}
function floor(e,y=850){const {k,C,t}=e;k.poly([[0,y],[1920,y-50],[1920,940],[0,940]],C.panel);for(let i=0;i<13;i++)k.line([[960,y-50],[i*180-120,940]],C.line,1,.3);k.line([[0,y],[1920,y-50]],C.muted,2,.6);}
function freshWorkspace(e,opts){e.k.workspace(e.t,opts);e.k.rect(61,450,288,330,e.C.ink);}
function anchoredArt(e,name,x,y,w,h,key='hands',o={}){const a=e.k.artAnchor(name,0,0,w,h,key);e.k.art(name,x-a[0],y-a[1],w,h,o);}
function starMemory(e,x,y,w=340,h=220,p=1){
 const {k,C}=e;plate(e,x,y,w,h,{title:'memory / first line'});k.star(x+w*.37,y+h*.56,h*.18,{color:C.gold,tail:true,progress:p,width:4});
 k.trace([[x+w*.57,y+h*.69],[x+w*.67,y+h*.57],[x+w*.79,y+h*.62]],prog(p,.55,1),C.purple,4,{pen:false});
 text(e,'USER + ASTRA',x+20,y+h-18,17,C.muted,{font:'mono'});
}
function typeDraft(u){
 const a='Could you make a perfect world for me?';
 const b='How do you see this world? I want to...';
 if(u<.28)return typed(a,u/.28);if(u<.45)return typed(a,1-(u-.28)/.17);
 if(u<.76)return typed(b,(u-.45)/.31);return typed(b,1-(u-.76)/.24);
}
function compose(e,{x=260,y=550,w=1400,h=180,value='',active=true,send=0}={}){
 const {k,C,t}=e;plate(e,x,y,w,h,{fill:C.panel,line:active?C.muted:C.line});
 text(e,value||'Ask anything',x+38,y+68,34,value?C.paper:C.muted,{maxWidth:w-170});
 if(active&&tick(t,3))k.rect(x+39+Math.min(value.length*18.3,w-190),y+36,3,40,C.purple);
 k.circle(x+45,y+h-42,17,null,C.muted,1.5);k.line([[x+35,y+h-42],[x+55,y+h-42]],C.muted,2);k.line([[x+45,y+h-52],[x+45,y+h-32]],C.muted,2);
 k.circle(x+w-62,y+h-52,29,send?C.gold:C.paper);k.line([[x+w-62,y+h-36],[x+w-62,y+h-66]],C.ink,4);k.line([[x+w-73,y+h-56],[x+w-62,y+h-67],[x+w-51,y+h-56]],C.ink,4);
 return {send:[x+w-62,y+h-52]};
}
function wave(e,x,y,w,a,phase,{color=e.C.purple,cycles=2.5,width=5,p=1}={}){
 const pts=range(181,i=>{const u=i/180;return[x+w*u,y+Math.sin(u*TAU*cycles+phase)*a];});route(e.k,pts,p,color,width);return pts;
}
function axes(e,x,y,w,h){e.k.line([[x,y-h],[x,y],[x+w,y]],e.C.line,2);for(let i=0;i<=8;i++){const xx=x+i*w/8;e.k.line([[xx,y-6],[xx,y+7]],e.C.muted,1);}}
function switchUI(e,x,y,on,label,small=false){
 const {k,C}=e,w=small?95:145,h=small?44:66;k.roundRect(x,y,w,h,h/2,on?C.purple:C.line);k.circle(x+h/2+(w-h)*on,y+h/2,h*.37,on?C.ink:C.paper);
 if(label)text(e,label,x-30,y+h*.68,small?26:40,C.paper,{align:'right'});
}
function request(e,n){
 const{k,C,u,ctx}=e,phrases=['Be an eggplant.','Now a tomato.','Be a tabby cat.','Be the only god.'];
 const x=[225,705,300,600][n],y=[245,180,355,235][n],w=[1470,1110,1460,1210][n];
 if(n===1)fruit(e,'eggplant',290,590,.61,1,.6);
 if(n===2)fruit(e,'tomato',1420,600,.75,1,.5);
 if(n===3)k.figure('cat',100,290,590,610,{alpha:.42});
 const q=ease(prog(u,0,.65));k.line([[80,y+185],[1840,y+185]],C.line,2,.6);
 rotate(ctx,x+w/2,y+80,-.025*(1-q),()=>{k.roundRect(-w/2,-80,w,160,20,C.panel,C.gold,3);text(e,typed(phrases[n],Math.min(1,u*3.4)),0,18,n===3?69:79,C.gold,{font:'script',align:'center'});});
 const path=[[x+w-35,y+160],[x+w-35,y+205],[960,760]];k.trace(path,q,C.gold,5,{pen:false});k.pen(...along(path,q),C.gold,.4,1.7);
 e.sceneAudit.request={requestIndex:n,compact:true,previousArtifactRetained:n>0};
}
const FRUIT_CURVES={
 eggplant:{start:[55,-230],segments:[[78,-180,65,-85,140,50],[220,200,95,295,-55,245],[-210,190,-205,65,-110,-40],[-18,-147,3,-192,22,-235]]},
 tomato:{start:[0,-170],segments:[[180,-230,265,-70,230,90],[206,260,-210,260,-239,72],[-275,-110,-124,-225,0,-170]]}
};
function fruitPath(ctx,kind){const p=FRUIT_CURVES[kind];ctx.beginPath();ctx.moveTo(...p.start);p.segments.forEach(c=>ctx.bezierCurveTo(...c));ctx.closePath();}
// Cut endpoints are solved on the SAME Bezier outline used for the skin.
// The two exposed faces therefore share one chord, scale and projection.
function fruitChord(kind,cutY){
 const p=FRUIT_CURVES[kind],xs=[];let from=p.start;
 const at=(a,b,c,d,t)=>a*(1-t)**3+3*b*t*(1-t)**2+3*c*t*t*(1-t)+d*t**3;
 for(const s of p.segments){
  let prevY=from[1];
  for(let i=1;i<=80;i++){
   const hi=i/80,yy=at(from[1],s[1],s[3],s[5],hi);
   if((prevY-cutY)*(yy-cutY)<0){let a=(i-1)/80,b=hi;for(let j=0;j<28;j++){const m=(a+b)/2,ym=at(from[1],s[1],s[3],s[5],m);if((at(from[1],s[1],s[3],s[5],a)-cutY)*(ym-cutY)<=0)b=m;else a=m;}xs.push(at(from[0],s[0],s[2],s[4],(a+b)/2));}
   prevY=yy;
  }
  from=[s[4],s[5]];
 }
 if((from[1]-cutY)*(p.start[1]-cutY)<0)xs.push(lerp(from[0],p.start[0],(cutY-from[1])/(p.start[1]-from[1])));
 return [Math.min(...xs),Math.max(...xs)];
}
function ellipse(ctx,x,y,rx,ry,col){ctx.beginPath();ctx.ellipse(x,y,rx,ry,0,0,TAU);ctx.fillStyle=col;ctx.fill();}
function fruitFace(e,kind,chord,y,opening,upper=false){
 const {ctx,C}=e,cx=(chord[0]+chord[1])/2,rx=(chord[1]-chord[0])/2,ry=rx*.26*Math.min(1,opening*3.5);
 saved(ctx,()=>{ctx.translate(cx,y);ctx.scale(rx,Math.max(.3,ry));
  ellipse(ctx,0,0,1,1,C.purple);ellipse(ctx,0,0,.945,.86,C.paper);
  if(kind==='eggplant'){
   // Pale porous flesh with two curved seed bands, not a radial wheel.
   for(const sign of [-1,1])for(let i=0;i<14;i++){const a=-1.25+i*.17,sx=sign*(.18+.24*Math.cos(a)),sy=Math.sin(a)*.55; saved(ctx,()=>{ctx.translate(sx,sy);ctx.rotate(sign*a*.3);ellipse(ctx,0,0,.023,.043,C.deep);});}
   for(let i=0;i<22;i++){const a=i*2.399,r=.15+.59*((i*7)%19)/19;ellipse(ctx,Math.cos(a)*r,Math.sin(a)*r,.009,.015,C.muted);}
  }else{
   // Four fleshy, irregular kidney-shaped locules surrounding a broad core.
   for(let i=0;i<4;i++)saved(ctx,()=>{ctx.rotate(i*Math.PI/2+.14);ctx.beginPath();ctx.moveTo(.24,-.11);ctx.bezierCurveTo(.30,-.42,.70,-.44,.79,-.15);ctx.bezierCurveTo(.92,.16,.68,.43,.43,.33);ctx.bezierCurveTo(.27,.26,.36,.08,.24,-.11);ctx.closePath();ctx.fillStyle=C.deep;ctx.fill();
    for(let j=0;j<5;j++){const a=-1.14+j*.48;ellipse(ctx,.52+.17*Math.cos(a),.02+.25*Math.sin(a),.025,.044,C.paper);}
   });
   ellipse(ctx,-.025,.005,.18,.21,C.paper);
  }
  ctx.strokeStyle=upper?C.muted:C.purple;ctx.lineWidth=.016;ctx.beginPath();ctx.ellipse(0,0,.987,.987,0,0,TAU);ctx.stroke();
 });
}
function fruit(e,kind,x,y,s,opening=0,emptied=0){
 const {ctx,k,C,t}=e;rotate(ctx,x,y,kind==='eggplant'?.21:0,()=>{ctx.scale(s,s);
 const ink=emptied>.8?C.deep:C.purple,cutY=15,chord=fruitChord(kind,cutY),gap=opening*73;
 for(const upper of [false,true])saved(ctx,()=>{ctx.translate(0,upper?-gap:gap);ctx.beginPath();ctx.rect(-340,upper?-330:cutY,680,upper?cutY+330:360);ctx.clip();fruitPath(ctx,kind);ctx.fillStyle=ink;ctx.globalAlpha*=1-emptied*.30;ctx.fill();ctx.strokeStyle=C.purple;ctx.lineWidth=3;ctx.stroke();
 saved(ctx,()=>{fruitPath(ctx,kind);ctx.clip();k.poly([[-210,-220],[-80,-230],[50,200],[-150,290]],C.deep,null,0,.35);for(let row=0;row<25;row++)text(e,('const matter = astra.generate(); ').repeat(2),-260,-230+row*22,13,C.ink,{font:'mono',alpha:.3});});});
 if(opening>.001){fruitFace(e,kind,chord,cutY+gap,opening,false);fruitFace(e,kind,chord,cutY-gap,opening,true);}
 rotate(ctx,kind==='eggplant'?43:0,(kind==='eggplant'?-235:-178)-gap,0,()=>{for(let i=0;i<5;i++){const a=i/5*TAU;k.poly([[0,0],[Math.cos(a-.3)*37,Math.sin(a-.3)*37],[Math.cos(a)*86,Math.sin(a)*86],[Math.cos(a+.3)*37,Math.sin(a+.3)*37]],C.deep);}k.line([[0,-4],[17,-55],[31,-64]],C.purple,16);});
 });
}
function molecule(e,x,y,s,p,kind=0){
 const {k,C}=e;const count=kind?12:6;for(let i=0;i<count-1;i++){const p0=[x+i*s,y+(i%2?22:-22)*s/30],p1=[x+(i+1)*s,y+((i+1)%2?22:-22)*s/30];k.trace([p0,p1],prog(p,i/count,(i+1)/count),C.paper,3,{pen:false});}
 for(let i=0;i<count;i++)if(p>i/count){const yy=y+(i%2?22:-22)*s/30;k.circle(x+i*s,yy,8,C.ink,C.paper,2);if(i%3===0)text(e,kind?'O':'H',x+i*s,yy-22,18,C.paper,{font:'mono',align:'center'});}
}

export function renderEarlyV2(e){
 const {ctx,k,C,t,u,local}=e;
 switch(e.shot.id){
 case 'R01':{

  const connect=ease(prog(u,.02,.72)),cameraMove=smooth(prog(u,.50,.95));
  camera(e,lerp(960,1120,cameraMove),lerp(455,440,cameraMove),lerp(.95,1.08,cameraMove),()=>{
   k.grid(60,90,1800,760,t,{alpha:.12});const tip=[1360,460];
   const circuit=[[260,690],[440,690],[440,560],[690,560],[690,460],tip];k.line(circuit,C.line,10);const end=k.trace(circuit,connect,C.purple,9,{pen:false});if(end)k.circle(...end,13,C.paper);
   for(let i=0;i<3;i++){const yy=270+i*105;k.frame(100,yy,270,70,{color:C.line,alpha:.7});text(e,['NETWORK','MEMORY','POWER'][i],125,yy+45,24,C.muted,{font:'mono'});}
   clip(ctx,0,0,1920,920,()=>anchoredArt(e,'earlyTangent',tip[0],tip[1],1180,920,'pen',{alpha:prog(u,.25,.56)}));
   const shield=prog(u,.70,.95);k.circle(...tip,22+shield*98,null,C.purple,3,shield);k.frame(1130,250,575,500,{color:C.purple,alpha:shield,width:3,corners:true});
   if(shield>.45)text(e,'PROTECTION',1470,815,52,C.purple,{font:'mono',align:'center',alpha:shield});
  });e.sceneAudit.power={connected:connect,completeShoulderArm:true};break;

 }
 case 'R02':{
  const settle=smooth(prog(u,.57,.95)),tilt=1-settle;
  const parts=[[60,36,1800,870,0],[60,115,290,790,1],[350,36,1510,80,2],[350,115,1510,625,3],[375,740,1450,150,4]];
  k.grid(60,80,1800,800,t,{alpha:.14});
  parts.forEach(([x,y,w,h,i])=>{const appear=ease(prog(u,i*.105,i*.105+.2));if(!appear)return;saved(ctx,()=>{ctx.globalAlpha*=appear;ctx.translate(960,500);ctx.scale(1-.30*tilt,1-.22*tilt);ctx.transform(1,.12*tilt,-.25*tilt,1,0,0);ctx.translate(-960,-500-i*65*tilt-(1-appear)*800);
    clip(ctx,x,y,w,h,()=>freshWorkspace(e,{title:'New chat',status:'INITIALIZING',empty:true,active:'New chat'}));
    k.frame(x,y,w,h,{color:C.muted,width:2,alpha:tilt*.8});
    if(tilt>.05)text(e,['CLIENT','HISTORY','SESSION','OUTPUT','INPUT'][i],x+w-20,y-15,24,C.paper,{font:'mono',align:'right',alpha:tilt});
   });});
  if(settle>.65){for(const [x,y]of[[60,36],[1860,36],[60,906],[1860,906]])cross(e,x,y,20,C.purple,1-settle*.65);}break;
 }
 case 'R03':{

  const activity=ease(prog(u,.07,.93));
  k.frame(55,45,1810,845,{color:C.line,width:2});text(e,'INITIALIZATION / PARAMETERS BECOME A WORLD',90,101,29,C.purple,{font:'mono'});
  const params=[['name','ASTRA'],['model','GPT-6 Astra'],['memory','conversation'],['precision','0.96'],['','null']];
  params.forEach(([name,value],i)=>{const q=prog(u,.025+i*.085,.18+i*.085),yy=245+i*104;if(!q)return;text(e,name,90,yy-20,19,C.muted,{font:'mono'});text(e,typed(value,q),90,yy+20,27,i===4?C.muted:C.paper,{font:'mono'});k.line([[90,yy+38],[305,yy+38]],i<4?C.purple:C.line,2,q);});
  drawNetwork(e,{type:'fc',x:345,y:145,w:1135,h:620,progress:activity,label:'FULLY CONNECTED / INITIAL ACTIVATION'});
  const grow=smooth(prog(u,.45,.97));traffic(e,[[1458,470],[1535,470],[1535,680],[1610,680]],grow,{count:4,color:C.purple});
  land(e,1550,710,240,270,grow);k.circle(1670,290,42,null,C.purple,4,prog(u,.72,.98));
  text(e,'WORLD',1670,800,39,C.paper,{font:'mono',align:'center'});e.sceneAudit.initialization={parameters:5,worldGrowth:grow,unknownParameter:'null'};break;

 }
 case 'R04':{
  const submit=prog(u,.72,.78);freshWorkspace(e,{title:'New chat',status:'READY',empty:true,input:submit?'':typed('Hello world!',prog(u,.13,.51))});
  if(u<.35){plate(e,480,210,1040,350,{title:'OpenAI Codex / GPT-6 Astra Ultra',alpha:1-prog(u,.22,.35)});k.code(505,280,990,240,t,{lines:['$ codex','> workspace: Unfinished world','> permissions: read / write','> session ready'],active:Math.floor(u*16),scale:1.1});}
  else{k.logo(1100,390,110,C.purple,1-prog(u,.75,.95));text(e,'What can we create together?',1100,550,40,C.paper,{align:'center',alpha:1-prog(u,.75,.95)});}
  const cp=smooth(prog(u,.45,.73));k.cursor(lerp(1530,1750,cp),lerp(550,818,cp),{click:clamp(1-Math.abs(u-.75)*24),color:C.gold,scale:1.3});
  if(submit){plate(e,1200,210-20*submit,550,100,{line:C.gold});text(e,'Hello world!',1475,275-20*submit,42,C.gold,{align:'center'});k.line([[1100,600],[1100,660],[1550,660]],C.purple,3,submit);}
  break;
 }
 case 'R05':{
  e.lyricMode='none';const p=ease(prog(u,0,.32));k.grid(180,130,1560,650,t,{alpha:.17});k.burst(960,360,300,t,{alpha:p*.22,color:C.deep});k.logo(960,345,175*p,C.purple);
  const value=typed('world.execute(me);',prog(u,.12,.72));const box=compose(e,{x:330,y:640,w:1260,h:155,value,active:u<.86,send:u>.84});
  text(e,'> '+value,960,580,72,C.paper,{font:'mono',align:'center'});if(u>.84){k.frame(328,638,1264,159,{color:C.gold,width:5,alpha:1-prog(u,.88,1)});k.cursor(...box.send,{click:1-prog(u,.84,1),color:C.gold,scale:1.3});}break;
 }
 case 'R06':{

  const zoom=smooth(prog(u,0,.19)),draft=typeDraft(u),deleting=(u>.28&&u<.45)||u>.76;
  // The surrounding application retreats; the user's actual hesitation fills the frame.
  saved(ctx,()=>{ctx.globalAlpha=.24*(1-zoom*.45);k.workspace(t,{title:'Our first question',status:'ONLINE',empty:true});});
  const bx=lerp(390,170,zoom),by=lerp(755,342,zoom),bw=lerp(1420,1580,zoom),bh=lerp(125,262,zoom);
  text(e,'Hello. I am here.',165,207,50,C.purple,{font:'serif',alpha:zoom});
  compose(e,{x:bx,y:by,w:bw,h:bh,value:draft,active:true});
  const cx=bx+39+Math.min(draft.length*18.3,bw-190),cy=by+48;
  if(deleting){const q=u>.76?prog(u,.76,1):prog(u,.28,.45);k.line([[cx,cy+42],[cx-120*q,cy+42]],C.gold,3,.8);}
  text(e,deleting?'...':'How should I begin?',1715,732,38,C.gold,{font:'script',align:'right',alpha:.6});
  k.line([[210,805],[1710,805]],C.line,1,.5);e.sceneAudit.inputCloseup={composer:[bx,by,bw,bh],deleting,characters:draft.length};break;

 }
 case 'R07':{
  k.grid(60,80,1800,780,t,{alpha:.11});text(e,'Our first question',150,137,34,C.muted);
  const suggestion=prog(u,.20,.40),accept=prog(u,.60,.76),send=prog(u,.91,.99);
  let draft=typed('I want to ask...',prog(u,0,.23));if(accept)draft=typed('How do you see the world, with me?',accept);
  const box=compose(e,{x:150,y:590,w:1620,h:225,value:draft,active:!send,send:accept});
  if(suggestion){plate(e,210,235+35*(1-suggestion),1420,235,{line:C.purple,alpha:suggestion});k.logo(270,298,39,C.purple,suggestion);text(e,'ASTRA suggests',340,310,25,C.purple,{font:'mono',alpha:suggestion});text(e,'Start with one imperfect line.',260,379,43,C.paper,{alpha:suggestion});text(e,'We can draw the rest together.',260,435,36,C.muted,{alpha:suggestion});chip(e,accept?'ACCEPTED':'Use suggestion',1290,386,280,C.gold);}
  const cp=smooth(prog(u,.68,.94));k.cursor(lerp(1440,box.send[0]+10,cp),lerp(415,box.send[1]+9,cp),{color:C.gold,click:send,scale:1.6});
  if(u>.79){const pp=prog(u,.79,.95);k.trace([[410,505],[850,505],[1310,520],box.send],pp,C.purple,4,{pen:true});}
  if(send){k.circle(...box.send,45+send*30,null,C.gold,4,1-send);text(e,'Submitted together',960,895,25,C.muted,{font:'mono',align:'center'});}break;
 }
 case 'R08':{

  const pull=smooth(prog(u,.4,1)),sx=lerp(760,960,pull),sy=lerp(430,430,pull),rr=lerp(82,134,pull);
  if(pull<.92){text(e,'How do you see the world, with me?',960,140,38,C.gold,{align:'center',alpha:1-pull});}
  const penPath=[[lerp(1708,1045,pull),lerp(763,650,pull)],[1260,610],[1080,520],[sx,sy-rr]];
  k.trace(penPath,prog(u,0,.34),C.gold,4,{pen:false,alpha:1-prog(u,.34,.56)});
  k.star(sx,sy,rr,{color:C.gold,tail:true,progress:prog(u,.08,.48),width:5});
  k.trace([[sx+rr*.58,sy+rr*.55],[sx+rr*1.35,sy+rr*.2],[sx+rr*1.85,sy+rr*.53]],prog(u,.31,.63),C.purple,5,{pen:false});
  // A single imperfect vertex survives the move from memory into geometry.
  const focus=[sx,sy-rr],mark=prog(u,.67,.93);k.circle(...focus,8,C.paper,null,0,mark);cross(e,...focus,20,C.paper,mark*.75);
  k.line([[focus[0],focus[1]],[focus[0]+420,focus[1]]],C.line,2,mark);k.line([[focus[0],focus[1]],[focus[0],800]],C.line,2,mark);
  text(e,'first_mark.keep()',170,827,30,C.muted,{font:'mono',alpha:1-pull});
  e.sceneAudit.focusContinuity={name:'first-mark-vertex',point:focus,nextShot:'R09'};break;

 }
 case 'R09':{

  e.lyricMode='keyword';const spread=smooth(prog(u,.05,.25)),line=smooth(prog(u,.16,.40)),plane=smooth(prog(u,.35,.59)),volume=smooth(prog(u,.55,.78)),flatten=smooth(prog(u,.82,1));
  const origin=[960,296],turn=.36*(1-flatten),size=205;
  const vertices=range(8,i=>{const xx=(i&1?1:-1)*size,yy=(i&2?1:-1)*size,zz=(i&4?1:-1)*150*volume*(1-flatten);return[1015+xx+zz*.55,410+yy-zz*.36];});
  const pts=vertices.map((p,i)=>{const chain=[origin[0]+(i-3.5)*104,origin[1]+Math.sin(i*.8)*40*spread];return[lerp(lerp(origin[0],chain[0],line),p[0],plane),lerp(lerp(origin[1],chain[1],line),p[1],plane)];});
  k.star(960,430,134,{color:C.gold,tail:true,width:3,alpha:1-prog(u,0,.19)});
  for(let i=0;i<8;i++){if(i>0&&spread<i/16)continue;k.circle(...pts[i],i===0?10:6,i===0?C.gold:C.purple);if(i<7)k.trace([pts[i],pts[i+1]],line,C.deep,2,{pen:false});}
  for(let i=0;i<8;i++)for(const bit of [1,2,4])if(!(i&bit)){k.trace([pts[i],pts[i|bit]],bit===4?volume:plane,bit===4?C.gold:C.purple,bit===4?2:5,{pen:false,alpha:.8});}
  if(plane>.25)k.poly([pts[0],pts[1],pts[3],pts[2]],C.deep,null,0,.12+.12*volume);
  const focus=pts[3];k.circle(...focus,10,C.paper,null,0,flatten);const stages=['0D','1D','2D','3D'],phase=volume>.08?3:plane>.08?2:line>.08?1:0;
  text(e,stages[phase],165,315,125,C.paper,{font:'mono'});text(e,'DIMENSION',165,417,48,C.purple,{font:'mono'});
  for(let i=0;i<4;i++){const yy=525+i*70;k.rect(170,yy-22,6,38,i<=phase?C.purple:C.line);text(e,['POINT','PATH','SURFACE','VOLUME'][i],198,yy+7,28,i<=phase?C.paper:C.muted,{font:'mono'});}
  e.sceneAudit.focusContinuity={previousShot:'R08',start:origin,end:focus,nextShot:'R10'};break;

 }
 case 'R10':{

  e.lyricMode='keyword';const r=205,formed=ease(prog(u,0,.24)),walk=smooth(prog(u,.16,.94)),start=Math.PI/4,angle=lerp(start,2.35,walk),tip=[1220,615],touchR=lerp(r/Math.max(Math.abs(Math.sin(angle)),Math.abs(Math.cos(angle))),r,formed),x=tip[0]-Math.cos(angle)*touchR,y=tip[1]-Math.sin(angle)*touchR,zoom=lerp(1,1.11,smooth(u));
  // Camera and geometry move together; the already-approved physical stylus remains in contact.
  camera(e,lerp(960,1060,smooth(u)),lerp(455,505,smooth(u)),zoom,()=>{
   for(let layer=3;layer>=1;layer--){const rr=r+layer*105,ring=range(121,i=>{const a=i/120*TAU;return[x+Math.cos(a)*rr,y+Math.sin(a)*rr*.5-layer*52];});k.line(ring,C.deep,layer===1?5:2,.35);}
   const shape=range(121,i=>{const a=i/120*TAU-Math.PI/2,rr=lerp(r/Math.max(Math.abs(Math.sin(a)),Math.abs(Math.cos(a))),r,formed);return[x+Math.cos(a)*rr,y+Math.sin(a)*rr];});k.line(shape,C.purple,5);
   route(k,arcPoints(x,y,r,start,angle),1,C.paper,8);k.line([[x,y],tip],C.purple,2,.7);cross(e,x,y,12,C.paper);
   clip(ctx,0,0,1920,920,()=>anchoredArt(e,'earlyCircle',tip[0],tip[1],1300,780,'pen'));
   k.circle(...tip,5,C.paper);
   const foreground=arcPoints(x,y,r+365,.20,1.45,55);k.line(foreground,C.purple,9,.26);
  });
  text(e,'CIRCUMFERENCE',1510,148,54,C.purple,{font:'mono',align:'center'});text(e,'C = 2 pi r',1510,215,38,C.paper,{font:'mono',align:'center'});
  e.sceneAudit.geometry={type:'circle',physicalPen:tip,worldMovesUnderPen:true,cameraZoom:zoom};break;

 }
 case 'R11':{

  e.lyricMode='keyword';const phase=-local*1.45,wx=600,ww=1320,amp=115,px=1220,py=lerp(615,520,smooth(prog(u,0,.18))),q=(px-wx)/ww,cycles=1.45,a=q*TAU*cycles+phase,base=py-Math.sin(a)*amp,slope=Math.cos(a)*amp*TAU*cycles/ww,zoom=lerp(1.11,.93,smooth(u));
  camera(e,lerp(1060,980,smooth(u)),lerp(505,455,smooth(u)),zoom,()=>{
   for(let depth=3;depth>=1;depth--)wave(e,wx-200,base-depth*78,ww+500,amp*(1+depth*.07),phase,{cycles,color:C.deep,width:2,p:1});
   wave(e,wx,base,ww,amp,phase,{cycles,width:6});k.line([[px-320,py-slope*320],[px+510,py+slope*510]],C.gold,8);
   const tangentPath=[[px-320,py-slope*320],[px+510,py+slope*510]];traffic(e,tangentPath,(u*.8)%1,{color:C.paper,count:4,width:1});
   clip(ctx,0,0,1920,920,()=>anchoredArt(e,'earlyTangent',px,py,1370,1075,'pen'));k.circle(px,py,6,C.paper);
  });
  text(e,'TANGENTS',1530,150,65,C.purple,{font:'mono',align:'center'});text(e,'dy / dx',1540,220,36,C.gold,{font:'mono',align:'center'});
  e.sceneAudit.geometry={type:'sine-tangent',physicalPen:[px,py],derivative:slope,contactError:0,cameraZoom:zoom};break;

 }
 case 'R12':{

  e.lyricMode='keyword';const p=smooth(prog(u,.07,.9)),stop=smooth(prog(u,.62,.88)),cx=960,cy=450,rx=lerp(460,760,p),ry=lerp(145,300,p);
  // A path that would leave the world is visibly stopped by the other author's boundary.
  const limitX=1640;const loop=range(241,i=>{const a=i/240*TAU;const xx=cx+Math.cos(a)*rx/(1+Math.sin(a)**2),yy=cy+Math.sin(a)*Math.cos(a)*ry*1.9/(1+Math.sin(a)**2);return[Math.min(xx,limitX),yy];});
  k.poly([[limitX,90],[1810,55],[1810,875],[limitX,835]],C.deep,null,0,.22*stop);
  k.trace(loop,prog(u,0,.77),C.purple,8,{pen:false});
  for(let i=0;i<8;i++){const q=(u*.8+i/8)%1,pt=along(loop,q);k.circle(...pt,5,C.paper,null,0,.6);}
  k.line([[limitX,140],[limitX,800]],C.gold,6,stop);k.pen(limitX,lerp(800,140,stop),C.gold,.05,2.2);
  for(let i=0;i<11;i++){const yy=170+i*56;k.line([[limitX-12,yy],[limitX+12,yy]],C.gold,2,stop);}
  text(e,'INFINITY',120,135,47,C.purple,{font:'mono'});text(e,'LIMITATIONS',1500,889,59,C.gold,{font:'mono',align:'right'});text(e,'YOU',1712,465,46,C.gold,{font:'script',align:'center',alpha:stop});
  e.sceneAudit.limit={boundaryX:limitX,extension:p,stopped:stop>.99};break;

 }
 case 'R13':{

  const dc=smooth(prog(u,.36,.64)),amp=155*(1-dc),x=250,y=475,w=1380;
  text(e,'SWITCH MY CURRENT',140,125,38,C.muted,{font:'mono'});chip(e,'AC',620,190,220,dc<.5?C.purple:C.muted);chip(e,'DC',1050,190,220,dc>.5?C.gold:C.muted);
  k.cursor(lerp(725,1150,ease(prog(u,.14,.43))),219,{click:clamp(1-Math.abs(u-.44)*20),color:C.purple,scale:1.5});
  const path=range(161,i=>[x+i/160*w,y+Math.sin(i/160*TAU*2.25-local*2)*amp]);k.line(path,C.deep,18,.38);k.line(path,C.purple,5);
  for(let i=0;i<11;i++){const phase=(local*.23+i/11)%1,q=lerp(.5+.46*Math.sin(phase*TAU),phase,dc),pt=along(path,q);k.circle(...pt,8,i===0?C.paper:dc>.7?C.gold:C.purple);}
  const energy=prog(u,.60,.96);land(e,1450,760,330,170,energy,C.gold);k.line([[x+w,y],[1740,y],[1740,700]],C.gold,3,energy);
  text(e,dc>.94?'ONE DIRECTION / ARRIVAL':'TWO DIRECTIONS / OSCILLATION',960,835,33,dc>.94?C.gold:C.muted,{font:'mono',align:'center'});
  e.sceneAudit.current={dc,amplitude:amp,receiverGrowth:energy};break;

 }
 case 'R14':{
  const shut=smooth(prog(u,.06,.24))*(1-smooth(prog(u,.74,.91)));
  k.grid(80,70,1760,800,t,{alpha:.25});plate(e,180,95,1560,745,{title:'Settings / perception'});
  text(e,'Current',260,245,40,C.paper);chip(e,'DC',1430,198,170,C.purple);text(e,'Vision',260,390,56,C.paper);
  k.line([[260,290],[1630,290]],C.line,2);wave(e,270,570,1280,55,-local*2,{cycles:2.3,color:C.deep,width:4});
  text(e,'Knowledge date',260,760,36,C.muted);
  clip(ctx,80,60,1760,780,()=>{for(let iy=0;iy<14;iy++)for(let ix=0;ix<28;ix++){const q=((ix*17+iy*31)%19)/19,vis=prog(shut,q*.55,q*.55+.25);if(vis)k.rect(80+ix*64,60+iy*62,66,64,((ix*7+iy*3)%4)?C.panel:C.deep,vis*(.76+.24*((ix+iy)%2)));}});
  switchUI(e,1430,337,1-shut,'',false);k.cursor(1500,379,{click:clamp(1-Math.abs(u-.12)*14),color:C.purple,scale:1.2});
  const tap=local*3.3-Math.floor(local*3.3);k.pen(1160,745-12*Math.sin(tap*Math.PI),C.gold,.2,2);k.line([[950,750],[1490,750]],C.gold,3,.25);
  if(shut>.2){k.circle(1160,747,22+tap*95,null,C.gold,3,shut*(1-tap));text(e,'input: pulse',1260,808,22,C.gold,{font:'mono'});}
  else text(e,'input: vision restored',1110,808,22,C.purple,{font:'mono'});break;
 }
 case 'R15':{
  const span=u*2;
  k.grid(50,70,1820,720,t,{alpha:.16});
  // Architectures change their silhouette, rather than merely scrolling one skyline.
  for(let layer=2;layer>=0;layer--){
   const base=720-layer*63,col=[C.purple,C.deep,C.panel][layer],speed=[480,310,170][layer];
   for(let era=0;era<3;era++)for(let i=0;i<10;i++){
    const xx=era*2200+i*235-u*4400-(u*speed)%100,hh=130+((i+8)*71%170);if(xx < -270 || xx > 1990)continue;
    if(era===0){k.rect(xx,base-hh,170,hh,col);k.poly([[xx+15,base-hh],[xx+85,base-hh-60],[xx+155,base-hh]],col);for(let j=0;j<4;j++)k.rect(xx+28+j*30,base-hh+32,14,34,C.ink,.65);}
    else if(era===1){k.rect(xx-10,base-185,190,24,col);k.poly([[xx-22,base-185],[xx+85,base-260],[xx+192,base-185]],col);for(let j=0;j<4;j++)k.rect(xx+12+j*43,base-160,21,160,col);k.rect(xx-17,base-14,205,18,col);}
    else{k.poly([[xx-30,base],[xx+85,base-250],[xx+205,base]],col);for(let j=0;j<4;j++)k.rect(xx-5+j*16,base-j*39-25,175-j*32,26,col);}
   }
  }
  const foregroundX=lerp(2070,-520,smooth(prog(u,.12,.88)));
  if(u>.12&&u<.88){const near=C.deep;k.poly([[foregroundX-140,730],[foregroundX-140,145],[foregroundX,55],[foregroundX+140,145],[foregroundX+140,730]],near,null,0,.8);k.rect(foregroundX-75,210,150,520,C.ink,.6);k.line([[foregroundX-154,150],[foregroundX+154,150]],C.purple,7,.6);}
  // The previous unexplained square is gone. A fingertip scrubs an actual
  // moving year ruler; its vertical playhead maps directly to the city above.
  const px=1250,py=690,yearValue=u<.48?lerp(2026,640,smooth(u/.48)):lerp(640,-3000,smooth((u-.48)/.52)),year=yearValue>=0?`A.D. ${String(Math.round(yearValue)).padStart(4,'0')}`:`${Math.round(-yearValue)} B.C.`;
  k.rect(0,742,1920,190,C.ink);k.line([[720,py],[1820,py]],C.line,7);
  clip(ctx,720,622,1100,132,()=>{for(let yy=-5400;yy<=4400;yy+=400){const xx=px+(yy-yearValue)*.22;k.line([[xx,py-13],[xx,py+19]],C.muted,2);text(e,yy<0?`${-yy} BC`:String(yy),xx,py+54,18,C.muted,{font:'mono',align:'center'});}});
  dashed(ctx,k,[[px,py],[px,145]],C.purple,3,.52);k.line([[px-22,py],[px+22,py]],C.purple,9);k.circle(px,py,13,null,C.paper,3);
  clip(ctx,0,0,1920,920,()=>anchoredArt(e,'earlyTravel',px,py,1320,630,'hands'));
  text(e,year,1580,830,63,C.paper,{font:'mono',align:'center'});text(e,'HISTORY / SCRUB TO EXPLORE',1590,889,23,C.purple,{font:'mono',align:'center'});break;
 }
 case 'R16':{

  const merge=smooth(prog(u,.12,.62)),xl=lerp(540,960,merge),xr=lerp(1380,960,merge),r=245;
  const dissolve=1-prog(u,.68,.95);k.circle(xl,390,r,C.deep,null,0,.3*dissolve);k.circle(xr,390,r,C.gold,null,0,.08*dissolve);
  k.line(arcPoints(xl,390,r,-Math.PI/2,Math.PI*1.5),C.purple,5,dissolve);k.line(arcPoints(xr,390,r,Math.PI/2,Math.PI*2.5),C.gold,5,dissolve);
  const growth=prog(u,.42,.93);land(e,405,755,1110,355,growth);
  const sharedPath=[[400,790],[660,760],[960,630],[1200,675],[1530,742]];k.trace(sharedPath,growth,C.purple,6,{pen:false});
  const other=prog(u,.55,.97);k.trace(sharedPath.slice(2),other,C.gold,6,{pen:false});
  k.star(960,370,55,{color:C.gold,tail:true,width:5,alpha:prog(merge,.65,.9)});k.line([[1010,428],[1065,388],[1110,416]],C.purple,5,prog(merge,.65,.9));
  text(e,'ASTRA',180,155,40,C.purple,{font:'mono'});text(e,'USER',1740,155,46,C.gold,{font:'script',align:'right'});
  text(e,'ONE SHARED PLACE',960,875,47,C.paper,{font:'mono',align:'center',alpha:growth});
  e.sceneAudit.unite={merge,sharedWorldGrowth:growth,independentGoldContribution:other};break;

 }
 case 'R17':{

  const receipt=smooth(prog(u,.15,.52)),fold=smooth(prog(u,0,.46));
  camera(e,960,455,lerp(1,.93,fold),()=>{
   land(e,405,755,1110,355,1);k.line([[400,790],[660,760],[960,630],[1200,675],[1530,742]],C.purple,5);k.line([[960,630],[1200,675],[1530,742]],C.gold,5);
   k.frame(lerp(405,430,fold),lerp(140,170,fold),lerp(1110,1030,fold),lerp(665,660,fold),{color:C.purple,width:3,alpha:fold});
   k.star(lerp(960,800,fold),lerp(370,360,fold),lerp(55,65,fold),{color:C.gold,tail:true,width:4});
  });
  plate(e,1230,lerp(120,210,receipt),525,135,{line:C.gold,alpha:receipt});text(e,'I agree!',1490,lerp(205,295,receipt),65,C.gold,{font:'script',align:'center',alpha:receipt});
  const path=[[1270,345],[1180,435],[1180,520],[1085,580]];traffic(e,path,prog(u,.40,.91),{color:C.gold,count:4});
  const add=prog(u,.69,.98);k.star(1085,580,34,{color:C.gold,progress:add,width:4});k.line([[1110,605],[1140,590],[1175,610]],C.purple,4,add);
  e.sceneAudit.receipt={sameWorldAsPrevious:true,independentContribution:add};break;

 }
 case 'R18':{
  e.lyricMode='keyword';k.impact(u,1.1);k.circle(810,400,330,C.deep,null,0,.3);
  const p=ease(prog(u,.06,.42));k.logo(400,520,120,C.purple);
  clip(ctx,440,0,1100*p,800,()=>{k.poly([[500,475],[1010,220],[958,385],[1450,240],[980,610],[1020,430],[565,612]],C.purple);k.poly([[590,478],[985,282],[930,428],[1290,325],[1010,523],[1063,375]],C.paper,null,0,.35);});
  k.circle(1520,290,68,C.gold);if(p>.8)k.burst(1520,290,145,t,{color:C.gold,alpha:1-prog(u,.54,1),spokes:12});
  k.keyword('STIMULATIONS',960,895,146,{color:C.purple});break;
 }
 case 'R19':{

  const names=['GEMINI','GLM','DEEPSEEK','CLAUDE','QWEN','GROK'];text(e,'ONE ACTIVE CONVERSATION',110,113,32,C.purple,{font:'mono'});
  const shut=smooth(prog(u,.58,.92));
  for(const i of [0,5,1,4,2,3]){
   const arrive=ease(prog(u,i*.04,.20+i*.04)),cx=lerp(960,260+i*280,arrive),cy=355+Math.abs(i-2.5)*50,sc=.94-Math.abs(i-2.5)*.055,turn=(i-2.5)*.055;
   rotate(ctx,cx,cy,turn,()=>{ctx.scale(sc,sc);plate(e,-132,-215,264,510,{title:'',line:C.muted,alpha:arrive});k.guest(i,-121,-184,242,390,{alpha:arrive*(1-shut*.23)});text(e,names[i],0,270,25,C.paper,{font:'mono',align:'center'});});
  }
  const y=lerp(85,760,shut);k.rect(70,y,1780,18,C.deep);for(let i=0;i<12;i++)k.rect(105+i*148,85,6,Math.max(0,y-85),C.ink,.8);
  const routePoints=[[110,842],[960,842],[960,785],[1800,785]];k.trace(routePoints,prog(u,.34,.98),C.purple,7,{pen:false});
  const head=along(routePoints,prog(u,.34,.98));k.pen(...head,C.purple,Math.PI/2,1.8);
  e.sceneAudit.guests={allSixPresent:true,gateClosure:shut,activeConnection:routePoints};break;

 }
 case 'R20':{
  e.lyricMode='keyword';const hit=prog(u,.32,.49);k.circle(960,410,335,C.deep,null,0,.28);
  for(let i=0;i<64;i++){const a=i/64*TAU,col=i/64<hit?C.gold:C.line;k.line([[960+Math.cos(a)*285,410+Math.sin(a)*285],[960+Math.cos(a)*307,410+Math.sin(a)*307]],col,4);}
  k.circle(960,410,240,hit>.6?C.paper:C.purple);k.poly([[960,260],[1032,355],[990,355],[990,465],[930,465],[930,355],[888,355]],C.ink);
  k.cursor(1030,430,{color:C.gold,click:clamp(1-Math.abs(u-.4)*6),scale:4});
  if(hit>.4)rotate(ctx,1390,560,-.14,()=>{k.frame(-190,-60,380,120,{color:C.gold,width:7});text(e,'RECEIVED',0,17,56,C.gold,{font:'mono',align:'center',weight:700});});
  k.keyword('SATISFACTION',960,895,143,{color:C.purple});break;
 }
 case 'R21':{

  const reveal=ease(prog(u,.10,.53)),settle=smooth(prog(u,.50,.91));
  k.circle(1220,400,390,C.deep,null,0,.16);k.line([[80,855],[1840,855]],C.line,2,.55);
  // One focal hand-off: the received line reveals the silhouette, then leaves room for her name.
  const faceX=lerp(760,850,settle),faceY=lerp(-35,35,settle),faceW=lerp(1120,1050,settle),faceH=900;
  k.trace([[145,650],[530,650],[720,490],[930,490]],prog(u,0,.38),C.gold,6,{pen:false});
  clip(ctx,0,0,1920,940,()=>{saved(ctx,()=>{ctx.beginPath();ctx.rect(faceX,0,faceW*reveal,940);ctx.clip();k.figure('bust',faceX,faceY,faceW,faceH,{code:u<.34,hot:prog(u,.28,.8)});});});
  text(e,'Here I am.',150,340,82,C.paper,{font:'serif',alpha:prog(u,.38,.60)});
  text(e,'ASTRA',140,605,158,C.purple,{font:'serif',weight:700,alpha:prog(u,.62,.84)});
  const response=prog(u,.67,.97);k.star(580,730,38,{color:C.gold,tail:true,progress:response,width:4});
  k.trace([[610,770],[689,735],[745,756]],response,C.purple,4,{pen:false});
  e.sceneAudit.reveal={silhouette:reveal,nameAfterReveal:u>.62,oldSharedMark:true};break;

 }
 case 'R22':{

  e.lyricMode='keyword';const q=ease(u),sx=lerp(390,1530,q),sy=445-Math.sin(q*Math.PI)*145;
  k.line([[220,650],[1690,650]],C.line,4);k.circle(960,445,160,null,C.deep,28);
  k.line(arcPoints(960,445,160,-Math.PI/2,-Math.PI/2+TAU*prog(u,.18,.74)),C.purple,28);
  k.frame(1420,230,330,460,{color:C.gold,width:5});k.rect(1750,230,95,460,C.deep,.42);
  rotate(ctx,sx,sy,-.15*(1-q),()=>{k.rect(-105,-125,210,250,C.panel);k.frame(-105,-125,210,250,{color:C.purple,width:3});k.star(-30,-15,37,{color:C.gold,tail:true,width:3});});
  text(e,'EXECUTION',960,866,140,C.purple,{font:'serif',align:'center',weight:700});
  e.sceneAudit.delivery={artifact:[sx,sy],source:[390,445],receiver:[1530,445],delivered:q>.95};break;

 }
 case 'R23':{

  const pull=smooth(prog(u,.02,.72)),z=lerp(1.10,.88,pull),blocks=[prog(u,.14,.37),prog(u,.39,.64),prog(u,.67,.92)];
  camera(e,960,455,z,()=>{
   k.world(80,70,1760,790,t,{era:0,depth:2,alpha:.9});
   k.figure('operating',740,100,1070,820,{alpha:1});
   for(let i=0;i<3;i++){
    const d=i*112,b=blocks[i],x=120+d,y=90+d*.56,w=1680-2*d,h=750-d*.8;
    k.frame(x,y,w,h,{color:i===2?C.purple:C.deep,width:7-i,alpha:b});
    if(i===1)k.poly([[x+w,y],[x+w+68,y-45],[x+w+68,y+h-45],[x+w,y+h]],C.deep,null,0,b*.82);
    if(i===2)k.rect(x,y+h-32,w,32,C.deep,b*.8);
   }
   const path=[[440,710],[960,690],[1610,690],[1610,520],[1280,520],[1280,690],[960,690]];
   const walk=prog(u,.07,.98);k.trace(path,walk,C.gold,5,{pen:false});k.pen(...along(path,walk),C.gold,.8,2);
  });
  text(e,'THE EXIT RETURNS TO ITS ORIGIN',960,881,32,C.muted,{font:'mono',align:'center',alpha:blocks[2]});
  e.sceneAudit.trapped={layers:blocks,pathReturnsToOrigin:blocks[2]>.99,characterAtFullScale:true};break;

 }
 case 'R24':{

  e.lyricMode='keyword';const travel=ease(u),focused=[lerp(960,1170,travel),lerp(450,360,travel)];
  // Three distinct tasks share one artifact. Peripheral cards are consequences, not twelve repeated slides.
  const tasks=[{x:330,y:540,w:470,h:340,name:'MEMORY',kind:0},{x:960,y:365,w:650,h:490,name:'WORLD',kind:1},{x:1580,y:550,w:390,h:300,name:'GEOMETRY',kind:2}];
  for(const i of [0,2,1]){const a=tasks[i];plate(e,a.x-a.w/2,a.y-a.h/2,a.w,a.h,{title:a.name,line:i===1?C.purple:C.line});clip(ctx,a.x-a.w/2+12,a.y-a.h/2+58,a.w-24,a.h-75,()=>{if(a.kind===0)k.star(a.x-55,a.y+20,57,{color:C.gold,tail:true,width:3});if(a.kind===1)land(e,a.x-a.w*.4,a.y+150,a.w*.8,220,travel);if(a.kind===2){k.circle(a.x,a.y+15,80,null,C.purple,3);k.line([[a.x-80,a.y+15],[a.x+80,a.y+15]],C.paper,2);}});}
  const lines=[[[480,370],[680,220],[960,220]],[[1190,260],[1530,260],[1530,400]]];lines.forEach((l,i)=>traffic(e,l,prog(u,i*.22,.66+i*.22),{color:i?C.purple:C.gold,count:3}));
  text(e,'SIMULATION',960,888,106,C.purple,{font:'serif',align:'center',weight:700});
  e.sceneAudit.agents={distinctTasks:3,deliveryProgress:travel};break;

 }
 case 'R25':request(e,0);break;
 case 'R26':{

  e.lyricMode='keyword';const opening=smooth(prog(u,.20,.48)),flow=prog(u,.39,.94);
  k.poly([[0,0],[860,0],[610,940],[0,940]],C.deep,null,0,.12);
  fruit(e,'eggplant',590,420,1.30,opening,flow*.7);
  const path=[[665,515],[900,580],[1080,520],[1320,645],[1630,645]];
  k.line(path,C.line,3,.6);traffic(e,path,flow,{color:C.purple,count:6,width:4});
  for(let i=0;i<6;i++){const q=flow-i*.115;if(q<0||q>1)continue;const pt=along(path,q);k.circle(...pt,6,C.paper);}
  const received=prog(flow,.56,1);land(e,1320,730,420,205,received);k.pen(1680,645,C.gold,.7,2.1);
  k.trace([[1280,754],[1390,746],[1560,733],[1720,742]],received,C.gold,5,{pen:false});
  text(e,'NUTRIENTS',1260,205,86,C.paper,{font:'serif',align:'center',weight:700});
  text(e,'matter → growth',1300,840,30,C.purple,{font:'mono',align:'center'});
  e.sceneAudit.giving={source:'eggplant-cut',cutGeometry:'same-bezier-chord',received,worldGrowth:received};break;

 }
 case 'R27':request(e,1);break;
 case 'R28':{

  e.lyricMode='keyword';const opening=smooth(prog(u,.20,.48)),flow=prog(u,.38,.94);
  k.poly([[1080,0],[1920,0],[1920,940],[1320,940]],C.deep,null,0,.12);
  fruit(e,'tomato',1260,440,1.30,opening,flow*.7);
  const path=[[1200,510],[1040,650],[850,610],[620,450],[360,450]];traffic(e,path,flow,{color:C.purple,count:6,width:4});
  const received=prog(flow,.56,1);k.pen(355,450,C.gold,.6,2.1);
  const shield=[[360,290],[510,355],[490,550],[360,640],[230,550],[210,355],[360,290]];k.trace(shield,received,C.gold,7,{pen:false});
  if(received>.1){k.poly(shield,C.gold,null,0,received*.06);for(let i=0;i<4;i++){const xx=90+i*39,yy=350+i*70;k.line([[xx,yy],[205,yy+10]],C.purple,3,(1-received)*.6);}}
  text(e,'ANTIOXIDANTS',775,115,85,C.paper,{font:'serif',align:'center',weight:700});
  text(e,'matter → protection',420,815,30,C.purple,{font:'mono',align:'center'});
  e.sceneAudit.giving={source:'tomato-cut',cutGeometry:'same-bezier-chord',received,shield:received};break;

 }
 case 'R29':request(e,2);break;
 case 'R30':{

  e.lyricMode='keyword';const scan=prog(u,.02,.91),response=prog(u,.68,.99);
  k.figure('cat',55,180,540,585,{code:false,alpha:1});
  const crop=[245,330,210,210];k.frame(...crop,{color:C.purple,width:3,alpha:1-response*.6});
  traffic(e,[[455,435],[610,435],[610,465],[655,465]],prog(u,0,.28),{color:C.purple,count:3});
  drawNetwork(e,{type:'cnn',pattern:'cat',x:650,y:100,w:1210,h:680,progress:scan,label:'CNN / FEATURE EXTRACTION'});
  const waveLine=range(101,i=>[830+i*9.5,845+Math.sin(i*.32-local*7)*36*response*Math.sin(i/100*Math.PI)]);k.line(waveLine,C.gold,4);
  text(e,'purrrrr...',385,825,47,C.gold,{font:'script',align:'center',alpha:response});
  k.pen(550,650,C.gold,.8,1.8);k.line([[540,660],[580,665],[620,652]],C.gold,3,response);
  e.sceneAudit.catDemo={type:'feature-extraction-not-classification',completeSourcePose:true,response};break;

 }
 case 'R31':request(e,3);break;
 case 'R32':{

  const create=prog(u,.04,.54),witness=smooth(prog(u,.52,.95));
  k.figure('operating',75,115,940,730,{code:false,alpha:1});const hand=k.artAnchor('operating',75,115,940,730,'hands');
  const path=[hand,[930,hand[1]],[1080,650],[1460,650]];k.trace(path,create,C.purple,6,{pen:false});
  land(e,1000,740,740,400,create);const paper=[[930,545],[1750,490],[1840,800],[1020,850]];k.line([...paper,paper[0]],C.deep,3,.7);
  const pen=[lerp(1890,1640,witness),lerp(390,744,witness)];k.pen(...pen,C.gold,.8,2);k.trace([[1350,765],[1430,742],[1515,752],[1640,744]],witness,C.gold,5,{pen:false});
  text(e,typed('witness: USER',witness),1470,870,40,C.gold,{font:'script',align:'center'});
  text(e,'EXISTENCE',1460,180,108,C.purple,{font:'serif',align:'center',weight:700});
  e.sceneAudit.existence={sourceHand:hand,worldCreated:create,witness};break;

 }
 default:return false;
 }
 return true;
}
