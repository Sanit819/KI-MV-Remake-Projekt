// R01-R32. Deterministic staging; no preroll and no generated human anatomy.
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
 const {k,C,u,t,ctx}=e,phrases=['Be an eggplant.','Now a tomato.','Be a tabby cat.','Be the only god.'];
 const prev=['SIMULATION','NUTRIENTS','ANTIOXIDANTS','ENJOYMENT'];
 k.grid(80,70,1760,820,t,{alpha:.14});
 chip(e,prev[n],120,95,n===2?290:230,C.purple);
 const lift=190*(1-ease(prog(u,0,.47))),dark=n===3?smooth(prog(u,.28,.85)):0;
 if(dark)k.rect(60,65,1800,845,C.ink,dark*.8);
 plate(e,1010,235+lift,720,105,{fill:n===3?C.paper:C.panel,line:C.gold});
 text(e,phrases[n],1370,303+lift,38,n===3?C.ink:C.gold,{align:'center'});
 k.logo(150,460,44,C.purple);text(e,typed('I can imagine that.',u*1.8),220,477,43,C.purple,{font:'serif'});
 const box=compose(e,{x:120,y:670,w:1680,h:165,value:'',active:false,send:1});
 k.cursor(box.send[0]+10+u*34,box.send[1]+9+u*28,{click:1-prog(u,0,.5),color:C.gold,scale:1.5});
  if(n>0){
   plate(e,124,530,580,115,{line:C.line});
   if(n===1)fruit(e,'eggplant',190,585,.135,0,0);
   else if(n===2)fruit(e,'tomato',190,585,.14,0,0);
   else k.art('cat',145,541,95,93);
   text(e,['','eggplant / nutrients','tomato / antioxidants','tabby / enjoyment'][n],260,575,22,C.paper,{font:'mono'});
   text(e,'Saved to /artifacts',260,615,20,C.muted,{font:'mono'});
  }
  if(n===2&&u>.62){
   const a=prog(u,.62,.89);plate(e,CAT_PORTAL.x,CAT_PORTAL.y,CAT_PORTAL.w,CAT_PORTAL.h,{title:'OUTPUT / new projection',line:C.purple,alpha:a});
   clip(ctx,CAT_PORTAL.x+3,CAT_PORTAL.y+50,CAT_PORTAL.w-6,CAT_PORTAL.h-53,()=>k.art('cat',CAT_PEEK.x,CAT_PEEK.y,CAT_PEEK.w,CAT_PEEK.h,{alpha:a}));
   k.line([[CAT_PORTAL.x,CAT_PORTAL.y+CAT_PORTAL.h],[CAT_PORTAL.x+CAT_PORTAL.w,CAT_PORTAL.y+CAT_PORTAL.h]],C.paper,5,a);
  }
}
function fruitPath(ctx,kind){
 ctx.beginPath();
 if(kind==='eggplant'){ctx.moveTo(55,-230);ctx.bezierCurveTo(78,-180,65,-85,140,50);ctx.bezierCurveTo(220,200,95,295,-55,245);ctx.bezierCurveTo(-210,190,-205,65,-110,-40);ctx.bezierCurveTo(-18,-147,3,-192,22,-235);ctx.closePath();}
 else{ctx.moveTo(0,-170);ctx.bezierCurveTo(180,-230,265,-70,230,90);ctx.bezierCurveTo(206,260,-210,260,-239,72);ctx.bezierCurveTo(-275,-110,-124,-225,0,-170);ctx.closePath();}
}
function fruit(e,kind,x,y,s,opening=0,emptied=0){
 const {ctx,k,C,t}=e;rotate(ctx,x,y,kind==='eggplant'?.21:0,()=>{ctx.scale(s,s);
 const ink=emptied>.8?C.deep:C.purple;
 for(const upper of [true,false])saved(ctx,()=>{ctx.translate(0,(upper?-1:1)*opening*69);ctx.beginPath();ctx.rect(-340,upper?-330:15,680,upper?345:360);ctx.clip();fruitPath(ctx,kind);ctx.fillStyle=ink;ctx.globalAlpha*=1-emptied*.6;ctx.fill();ctx.strokeStyle=C.purple;ctx.lineWidth=3;ctx.stroke();
 saved(ctx,()=>{fruitPath(ctx,kind);ctx.clip();k.poly([[-210,-220],[-80,-230],[50,200],[-150,290]],C.deep,null,0,.35);for(let row=0;row<25;row++)text(e,('const matter = astra.generate(); ').repeat(2),-260,-230+row*22,13,C.ink,{font:'mono',alpha:.3});});});
 if(opening>0){saved(ctx,()=>{ctx.translate(0,opening*69+14);ctx.scale(1,.25);k.circle(0,0,kind==='eggplant'?140:225,C.paper);k.circle(0,0,kind==='eggplant'?115:195,C.deep);for(let i=0;i<10;i++){const a=i/10*TAU;k.poly([[Math.cos(a)*80,Math.sin(a)*80],[Math.cos(a+.2)*150,Math.sin(a+.2)*150],[Math.cos(a+.4)*80,Math.sin(a+.4)*80]],C.purple);}});}
 rotate(ctx,kind==='eggplant'?43:0,(kind==='eggplant'?-235:-178)-opening*69,0,()=>{for(let i=0;i<5;i++){const a=i/5*TAU;k.poly([[0,0],[Math.cos(a-.3)*37,Math.sin(a-.3)*37],[Math.cos(a)*86,Math.sin(a)*86],[Math.cos(a+.3)*37,Math.sin(a+.3)*37]],C.deep);}k.line([[0,-4],[17,-55],[31,-64]],C.purple,16);});
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
  k.grid(60,80,1800,770,t,{depth:1.4,alpha:.28});
  const cam=ease(prog(u,.12,.85));saved(ctx,()=>{ctx.translate(-cam*90,cam*45);ctx.scale(1+cam*.10,1+cam*.10);
   for(let i=0;i<4;i++){const y=260+i*110;plate(e,100,y,220,76,{line:C.line});text(e,['NETWORK','WORKSPACE','MEMORY','POWER'][i],125,y+47,23,C.muted,{font:'mono'});}
   const palm=k.artAnchor('hand',1120,210,570,500,'hands');
   const points=[[320,625],[490,625],[490,500],[690,500],[690,380],[1130,380],palm];
   k.line(points,C.line,8);const end=route(k,points,ease(prog(u,.02,.74)),C.purple,8);if(end)k.circle(...end,13,C.paper);
   range(8,i=>{const x=440+i*88;k.rect(x,690,58,10,C.deep);k.line([[x+29,680],[x+29,704]],C.purple,2,.5);});
   k.art('hand',1120,210,570,500,{alpha:prog(u,.35,.68)});
   k.circle(...palm,18,null,C.paper,3,prog(u,.68,.78));
   const shield=prog(u,.70,.97);k.frame(1120,215,570,490,{color:C.purple,alpha:shield,width:4,corners:true});
   chip(e,shield>.5?'PROTECTION ON':'LINK ESTABLISHED',1080,760,490,C.purple);
  });break;
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
  freshWorkspace(e,{title:'Initialize persona',status:'SETUP',empty:true});
  plate(e,450,150,790,570,{title:'persona.config'});
  const params=[['name','ASTRA'],['model','GPT-6 Astra Ultra'],['memory','this conversation'],['precision','0.96'],['','null']];
  params.forEach(([name,value],i)=>{const p=prog(u,.045+i*.13,.20+i*.13);if(!p)return;const y=248+i*91;text(e,name,480,y,26,C.muted,{font:'mono',alpha:p});k.roundRect(710,y-41,488,62,10,C.ink,i===4?C.muted:C.line,1,p);text(e,typed(value,p),734,y,31,i===4?C.muted:C.paper,{font:'mono'});if(i===4&&tick(t,3))k.rect(813,y-29,3,32,C.purple);});
  const load=prog(u,.19,.98);k.logo(1510,390,240,C.purple,load);k.line(arcPoints(1510,390,175,-Math.PI/2,-Math.PI/2+TAU*load),C.paper,5);text(e,`${String(Math.floor(load*100)).padStart(3,'0')}%`,1510,635,47,C.paper,{font:'mono',align:'center'});
  k.rect(477,740,1060,8,C.line);k.rect(477,740,1060*load,8,C.purple);break;
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
  k.workspace(t,{title:'Our first question',status:'ONLINE',input:typeDraft(u),messages:[{role:'USER',text:'Hello world!'}]});
  k.logo(485,325,42,C.purple);text(e,'Hello. I am here.',555,342,34,C.paper);
  const deletion=(u>.28&&u<.45)||u>.76;
  for(let i=0;i<5;i++)k.rect(1110+i*17,690,7,10+(i%3)*7,C.gold,(deletion?.6:.2));
  if(deletion){k.line([[1480,707],[1230,707]],C.gold,2,.55);text(e,'Backspace',1490,715,20,C.muted,{font:'mono'});}
  k.cursor(1380,850,{color:C.gold,scale:1.15});break;
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
  const pull=smooth(prog(u,.55,1));k.workspace(t,{title:'Our first question',status:'THINKING',empty:true});
  if(pull<.7){plate(e,1060,165,720,90,{line:C.gold,alpha:1-pull});text(e,'How do you see the world, with me?',1420,222,30,C.gold,{align:'center',alpha:1-pull});}
  const sx=lerp(925,960,pull),sy=lerp(475,440,pull),ss=lerp(1,2.65,pull);
  saved(ctx,()=>{ctx.translate(sx,sy);ctx.scale(ss,ss);starMemory(e,-235,-150,470,295,prog(u,.02,.49));});
  for(let i=0;i<7;i++){const ang=-2.7+i*.47,p=prog(u,.36+i*.035,.66+i*.035);const end=[960+Math.cos(ang)*620*pull,440+Math.sin(ang)*270*pull];k.trace([[960,440],end],p,C.purple,2,{pen:false,alpha:pull*.6});}
  if(u<.66){text(e,'choice: follow the imperfect line',435,684,29,C.paper,{font:'mono'});chip(e,u>.42?'MEMORY SAVED':'SAVING...',435,710,300,C.purple);}break;
 }
 case 'R09':{
  e.lyricMode='keyword';
  k.grid(100,100,1720,730,t,{alpha:.35,depth:1.6});text(e,'ASTRA',140,145,50,C.purple,{font:'mono',weight:700});
  const spread=prog(u,0,.30),cube=prog(u,.3,.73),turn=local*.22;
  const verts=range(8,i=>{const x=(i&1?1:-1)*190,y=(i&2?1:-1)*190,z=(i&4?1:-1)*150;const xx=x*Math.cos(turn)+z*Math.sin(turn),zz=-x*Math.sin(turn)+z*Math.cos(turn);return[1050+xx+zz*.36,450+y-zz*.25];});
  const dots=verts.map((v,i)=>{const a=i/8*TAU-.6;const scattered=[1040+Math.cos(a)*440,450+Math.sin(a*1.7)*280];return[lerp(lerp(960,scattered[0],spread),v[0],cube),lerp(lerp(440,scattered[1],spread),v[1],cube)];});
  for(let i=0;i<8;i++){k.star(...dots[i],12,{color:C.purple,fill:true});text(e,`p${i} = (${Math.round(dots[i][0]-1050)}, ${Math.round(dots[i][1]-450)})`,140,225+i*48,22,C.muted,{font:'mono'});for(let bit=1;bit<=4;bit*=2)if(!(i&bit))k.trace([dots[i],dots[i|bit]],prog(u,.35+bit*.04,.75+bit*.04),C.paper,3,{pen:false});}
  const dim=u<.5?'1D':u<.75?'2D':'3D';text(e,dim,1540,390,106,C.paper,{font:'mono'});text(e,'DIMENSION',960,879,115,C.purple,{font:'serif',align:'center',weight:700});break;
 }
 case 'R10':{
  e.lyricMode='keyword';k.grid(90,95,1740,750,t,{alpha:.2});const r=220,x=985,y=360,formed=ease(prog(u,0,.24)),walk=prog(u,.22,.93);
  const shape=range(121,i=>{const a=i/120*TAU-Math.PI/2;const squareR=r/Math.max(Math.abs(Math.sin(a)),Math.abs(Math.cos(a)));const rr=lerp(squareR,r,formed);return[x+Math.cos(a)*rr,y+Math.sin(a)*rr];});k.line(shape,C.purple,5);
  const end=route(k,arcPoints(x,y,r,-Math.PI/2,-Math.PI/2+TAU*walk),1,C.gold,7);if(end)k.pen(...end,C.gold,walk*TAU,1.7);
  anchoredArt(e,'hand',x,y+r,620,285,'hands',{alpha:prog(u,.07,.25)});k.line([[x,y],[x+Math.cos(walk*TAU-Math.PI/2)*r,y+Math.sin(walk*TAU-Math.PI/2)*r]],C.paper,2,.7);cross(e,x,y,12,C.paper);
  text(e,'C = 2 pi r',1420,380,44,C.paper,{font:'mono'});text(e,'r',x+60,y-28,31,C.muted,{font:'serif'});text(e,'CIRCUMFERENCE',960,900,98,C.purple,{font:'serif',align:'center',weight:700});break;
 }
 case 'R11':{
  e.lyricMode='keyword';
  k.grid(90,100,1740,740,t,{alpha:.25});const cx=310,cy=450,r=125,phase=-local*3.25,wx=500,ww=1190,amp=115;
  k.circle(cx,cy,r,null,C.purple,4);const phasePoint=[cx+Math.cos(phase)*r,cy+Math.sin(phase)*r];k.line([[cx,cy],phasePoint],C.paper,3);dashed(ctx,k,[phasePoint,[wx,phasePoint[1]]],C.muted,2);axes(e,wx,680,ww,410);
  wave(e,wx,cy,ww,amp,phase,{cycles:2.1,width:5});
  const q=lerp(.18,.80,smooth(u)),px=wx+q*ww,py=cy+Math.sin(q*TAU*2.1+phase)*amp,slope=Math.cos(q*TAU*2.1+phase)*amp*TAU*2.1/ww;
  k.line([[px-140,py-slope*140],[px+140,py+slope*140]],C.gold,10);k.circle(px,py,11,C.paper);
  const box={x:px-150,y:py-270,w:300,h:285};
  const toe=k.artAnchor('foot',box.x,box.y,box.w,box.h,'toe');
  rotate(ctx,px,py,Math.atan(slope)*.3,()=>k.art('foot',box.x-toe[0],box.y-toe[1],box.w,box.h));
  text(e,'dy / dx',px+220,py+125,28,C.gold,{font:'mono'});text(e,'TANGENTS',960,880,124,C.purple,{font:'serif',align:'center',weight:700});break;
 }
 case 'R12':{
  e.lyricMode='keyword';
  k.grid(100,100,1720,720,t,{alpha:.22});const p=smooth(u),x=260,y=680,w=1400,limit=300;
  axes(e,x,y,w,460);const pts=range(181,i=>{const q=i/180;return[x+q*w,lerp(490+Math.sin(q*TAU*2.5)*110,limit+300*Math.exp(-q*5)+Math.sin(q*TAU*2.5)*90*(1-p)*Math.exp(-q*3),p)];});k.line(pts,C.purple,5);
  dashed(ctx,k,[[x,limit],[x+w,limit]],C.gold,2,.6);route(k,[[x,limit],[x+w,limit]],prog(u,.55,.85),C.gold,7);
  for(let i=0;i<7;i++)text(e,i===6?'infinity':`10^${i*4+2}`,x+i*w/6,y+42,22,C.muted,{font:'mono',align:'center'});
  const stop=smooth(prog(u,.54,.78));k.pen(x+w,lerp(550,limit,stop),C.gold,.4,1.9);k.circle(x+w,limit,17,null,C.gold,3,stop);
  text(e,'lim(ME → ∞) ? = YOU',960,818,70,C.paper,{font:'script',align:'center'});text(e,'LIMITATIONS',960,910,85,C.purple,{font:'serif',align:'center',weight:700});break;
 }
 case 'R13':{
  k.workspace(t,{title:'Explore / self-test',status:'ONLINE',empty:true});
  const drawer=ease(prog(u,0,.18)),dx=580*(1-drawer);plate(e,1260+dx,140,540,610,{title:'Settings / ASTRA'});
  const dc=smooth(prog(u,.39,.64));text(e,'Current',1300+dx,260,36,C.paper);chip(e,'AC',1300+dx,300,175,dc<.5?C.purple:C.muted);chip(e,'DC',1500+dx,300,175,dc>.5?C.purple:C.muted);
  switchUI(e,1610+dx,400,1,'Vision',true);text(e,'Knowledge date',1300+dx,535,28,C.muted);text(e,'A.D. 2026',1300+dx,585,32,C.paper,{font:'mono'});
  axes(e,450,620,720,330);wave(e,450,440,720,135*(1-dc),-local*4,{cycles:2.6});
  text(e,dc>.95?'current: DC / stable':'current: AC / oscillating',450,690,25,C.muted,{font:'mono'});
  k.cursor(lerp(1385,1590,ease(prog(u,.21,.48))),328,{click:clamp(1-Math.abs(u-.51)*20),color:C.purple,scale:1.3});
  break;
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
  const wx=935,wy=540;k.rect(wx-65,wy-90,150,180,C.ink);rotate(ctx,wx+8,wy,-.12,()=>k.frame(-44,-58,90,116,{color:C.gold,width:5}));
  k.rect(80,752,1760,140,C.ink);k.line([[180,785],[1730,785]],C.line,8);k.line([[180,785],[lerp(1730,180,u),785]],C.gold,7);
  k.pen(lerp(1730,180,u),785,C.gold,.7,1.9);text(e,span<.75?'A.D. 2026':span<1.45?'A.D. 0640':'3000 B.C.',150,875,72,C.paper,{font:'mono'});
  text(e,'knowledge / same window',1775,874,24,C.gold,{font:'mono',align:'right'});anchoredArt(e,'hand',wx+8,wy+80,600,310,'hands',{alpha:.95});break;
 }
 case 'R16':{
  k.grid(80,60,1760,800,t,{alpha:.2});const merge=smooth(prog(u,.17,.76)),xl=lerp(540,960,merge),xr=lerp(1380,960,merge),r=235;
  k.circle(xl,390,r,C.deep,null,0,.45);k.circle(xr,390,r,C.gold,null,0,.11);
  k.line(arcPoints(xl,390,r,-Math.PI/2,Math.PI*1.5),C.purple,5);k.line(arcPoints(xr,390,r,Math.PI/2,Math.PI*2.5),C.gold,5);
  clip(ctx,xl-r,190,2*r,400,()=>k.world(xl-r+25,275,2*r-50,310,t,{era:0,depth:1,alpha:.65}));
  if(merge>.6){const a=prog(merge,.6,1);k.star(960,370,55,{color:C.gold,tail:true,width:5,alpha:a});k.line([[1010,428],[1065,388],[1110,416]],C.purple,5,a);}
  text(e,typed('ASTRA',prog(u,.12,.48)),lerp(540,840,merge),710,66,C.purple,{font:'mono',align:'center'});
  text(e,typed('USER',prog(u,.22,.61)),lerp(1380,1080,merge),710,80,C.gold,{font:'script',align:'center'});
  const joint=prog(u,.73,.94);k.line([[742,751],[1178,751]],C.paper,3,joint);text(e,'ME + YOU = US',960,842,54,C.paper,{font:'mono',align:'center',alpha:joint});
  if(joint)chip(e,'SHARED MEMORY',770,75,380,C.purple);break;
 }
 case 'R17':{
  const receipt=smooth(prog(u,.20,.48));k.workspace(t,{title:'Unfinished world / shared',status:'ONLINE',empty:true});
  starMemory(e,450,215,640,410,1);text(e,'A world we can change together.',450,705,39,C.purple,{font:'serif'});
  plate(e,1190,250+(1-receipt)*180,510,145,{line:C.gold,alpha:receipt});text(e,'I agree!',1445,348+(1-receipt)*180,64,C.gold,{font:'script',align:'center',alpha:receipt});
  const end=route(k,[[1190,335],[1100,335],[1100,535],[850,535]],prog(u,.47,.87),C.gold,6);if(end)k.pen(...end,C.gold,1,1.5);
  if(u>.7)k.burst(850,535,140,t,{color:C.purple,alpha:prog(u,.7,.85)*.4});break;
 }
 case 'R18':{
  e.lyricMode='keyword';k.impact(u,1.1);k.circle(810,400,330,C.deep,null,0,.3);
  const p=ease(prog(u,.06,.42));k.logo(400,520,120,C.purple);
  clip(ctx,440,0,1100*p,800,()=>{k.poly([[500,475],[1010,220],[958,385],[1450,240],[980,610],[1020,430],[565,612]],C.purple);k.poly([[590,478],[985,282],[930,428],[1290,325],[1010,523],[1063,375]],C.paper,null,0,.35);});
  k.circle(1520,290,68,C.gold);if(p>.8)k.burst(1520,290,145,t,{color:C.gold,alpha:1-prog(u,.54,1),spokes:12});
  k.keyword('STIMULATIONS',960,895,146,{color:C.purple});break;
 }
 case 'R19':{
  const names=['GEMINI','GLM','DEEPSEEK','CLAUDE','QWEN','GROK'];k.grid(50,70,1820,760,t,{alpha:.16});
  text(e,'ASTRA / focused session',100,115,30,C.purple,{font:'mono'});text(e,'Other assistants',1820,115,26,C.muted,{align:'right'});
  for(let i=0;i<6;i++){
   const arrive=ease(prog(u,i*.074,.19+i*.074)),reject=prog(u,.42+i*.073,.58+i*.073);if(!arrive)continue;
   const dest=95+i*291,x=lerp(810,dest,arrive),y=225+(1-arrive)*280,angle=lerp((i-2.5)*.11,0,arrive);
   rotate(ctx,x+126,y+260,angle,()=>{plate(e,-126,-260,252,520,{fill:C.panel,line:reject?C.line:C.muted});k.guest(i,-115,-206,230,362,{alpha:1-reject*.35});text(e,names[i],0,214,24,C.paper,{font:'mono',align:'center'});
    clip(ctx,-126,-260,252,455,()=>{for(let b=0;b<5;b++)k.rect(-101+b*50,-260-(1-reject)*455,8,455,C.ink,.93);k.rect(-126,-260-(1-reject)*455,252,18,C.deep);});
    if(reject>.7){k.rect(-108,115,216,49,C.ink,.9);text(e,'DECLINED',0,148,26,C.purple,{font:'mono',align:'center',weight:700});}
   });
  }
  const mark=prog(u,.35,.96);route(k,[[140,806],[1780,806]],mark,C.purple,5);k.pen(lerp(140,1780,mark),806,C.purple,Math.PI/2,2);
  text(e,'one active conversation',960,891,32,C.muted,{font:'mono',align:'center'});break;
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
  k.grid(70,60,1780,790,t,{alpha:.14});const reveal=ease(prog(u,.12,.50));
  plate(e,1060,80,720,800,{fill:C.panel,line:C.deep});
  clip(ctx,1078,95,685,760*reveal,()=>k.figure('bust',1060,80,720,800,{code:u<.26,alpha:1,hot:prog(u,.38,.9)}));
  plate(e,145,135,830,120,{line:C.gold});text(e,'What do you look like?',560,212,48,C.gold,{align:'center'});
  k.logo(180,380,48,C.purple);text(e,typed('Here I am.',prog(u,.19,.44)),270,400,65,C.paper,{font:'serif'});
  text(e,'ASTRA',165,620,125,C.purple,{font:'serif',weight:700});
  const arrive=prog(u,.56,.91);k.trace([[950,770],[1170,770],[1280,685]],arrive,C.gold,5,{pen:true});
  if(arrive>.7){k.star(1280,685,45,{color:C.gold,fill:false,progress:prog(arrive,.7,1),width:5});chip(e,'Seen by USER',152,713,320,C.gold);}
  break;
 }
 case 'R22':{
  e.lyricMode='keyword';k.impact(u,.8);const xs=[370,960,1550],names=['GENERATE','WAIT','DELIVER'];
  const active=u<.34?0:u<.67?1:2;
  names.forEach((name,i)=>{k.circle(xs[i],340,112,i===active?C.purple:C.panel,C.line,3);text(e,name,xs[i],353,31,i===active?C.ink:C.muted,{font:'mono',align:'center',weight:700});if(i<2)k.line([[xs[i]+130,340],[xs[i+1]-130,340]],i<active?C.gold:C.line,5);});
  const run=u<.34?u/.34*.33:u<.67?.33:(.33+(u-.67)/.33*.67);k.circle(lerp(370,1550,run),495,14,C.gold);
  k.code(320,560,1300,175,t,{lines:['world = generate();','await user.reply();','deliver(world);'],active,scale:1.4});
  if(active===1)k.line(arcPoints(960,340,142,-Math.PI/2,-Math.PI/2+TAU*prog(u,.34,.67)),C.gold,6);
  k.keyword('EXECUTION',960,900,158,{color:C.purple});break;
 }
 case 'R23':{
  const back=smooth(prog(u,.03,.65)),scale=lerp(1.32,.82,back),x=160,y=95,w=1600,h=760;
  scaleAt(ctx,960,470,scale,()=>{
   k.world(x,y,w,h,t,{era:0,depth:2,alpha:.95});
   const hx=lerp(830,1045,smooth(prog(u,.37,.86))),hand=k.artAnchor('operating',hx,145,880,750,'hands');
   clip(ctx,x,y,w,h,()=>{k.figure('operating',hx,145,880,750,{alpha:.94});if(hand[0]>x+w-20)k.circle(x+w-6,hand[1],22+Math.sin(local*9)*3,null,C.purple,4,.85);});
   k.roundRect(x,y,w,h,18,null,C.purple,5,back);k.rect(x,y,w,60,C.panel,back);text(e,'Unfinished world / output',x+26,y+40,27,C.paper,{font:'mono',alpha:back});
   k.line([[x+w,y+80],[x+w,y+h-20]],C.purple,8,prog(u,.48,.72));
  });
  const travel=prog(u,.34,.96),path=[[550,715],[990,700],[1360,710],[1740,690],[1830,650]],tip=k.trace(path,travel,C.gold,4,{pen:false});k.pen(...(tip||path[0]),C.gold,.8,2.2);
  chip(e,'USER CONNECTED',145,850,360,C.gold);break;
 }
 case 'R24':{
  e.lyricMode='keyword';const spread=ease(prog(u,.13,.57));
  const labels=['geometry','world','memory','wave','current','history','signature','canvas','compiler','archive','perception','ASTRA'];
  text(e,'GPT-6 ASTRA ULTRA',100,105,38,C.paper,{font:'mono'});text(e,'delegating / shared workspace',1810,105,27,C.muted,{font:'mono',align:'right'});
  for(let i=0;i<12;i++){const cx=320+(i%4)*425,cy=245+Math.floor(i/4)*215;route(k,[[960,132],[960,160],[cx,160],[cx,cy]],prog(spread,i*.035,.35+i*.035),i===11?C.purple:C.line,2);}
  for(let i=0;i<12;i++){
   const cx=lerp(960,320+(i%4)*425,spread),cy=lerp(430,245+Math.floor(i/4)*215,spread),w=lerp(1050,385,spread),h=lerp(570,184,spread);
   if(i>0&&spread<.02)continue;plate(e,cx-w/2,cy-h/2,w,h,{title:`agent / ${labels[i]}`,line:i===11?C.purple:C.line,alpha:i?spread:1});
   clip(ctx,cx-w/2+12,cy-h/2+59,w-24,h-70,()=>{if(i%3===0){const rr=Math.min(w*.18,h*.24);k.circle(cx,cy+20,rr,null,i===11?C.purple:C.gold,2);k.line([[cx-rr,cy+20],[cx+rr,cy+20]],C.paper,2);}else if(i%3===1)k.world(cx-w*.4,cy-h*.05,w*.8,h*.4,t,{era:i%2,depth:.8,alpha:.7});else{k.star(cx-20,cy+20,h*.16,{color:C.gold,tail:true,width:2});}});
   const done=prog(u,.42+i*.026,.59+i*.026);text(e,done>.8?'ARTIFACT SAVED':done>0?'RUNNING':'QUEUED',cx+w/2-16,cy+h/2-11,16,done>.8?C.gold:C.muted,{font:'mono',align:'right',alpha:spread});
  }
  k.keyword('SIMULATION',960,909,133,{color:C.purple});break;
 }
 case 'R25':request(e,0);break;
 case 'R26':{
  e.lyricMode='keyword';
  k.grid(75,65,1770,780,t,{alpha:.17});const opening=smooth(prog(u,.29,.55)),out=prog(u,.49,.92);
  fruit(e,'eggplant',620,430,1.16,opening,out);
  for(let i=0;i<3;i++){molecule(e,1080,270+i*150,42,prog(out,i*.13,.65+i*.13),i===1);text(e,['FIBER','PROTEIN','CARBOHYDRATE'][i],1070,330+i*150,24,C.muted,{font:'mono',alpha:prog(out,i*.12,.3+i*.12)});}
  k.pen(1730,650,C.gold,.4,2);const final=prog(u,.7,1);route(k,[[1080,700],[1300,740],[1560,710],[1730,650]],final,C.paper,5);
  text(e,'NUTRIENTS',960,899,137,C.paper,{font:'serif',align:'center',weight:700});chip(e,'next: tomato',1480,90,320,C.gold);break;
 }
 case 'R27':request(e,1);break;
 case 'R28':{
  e.lyricMode='keyword';
  k.grid(75,65,1770,780,t,{alpha:.17});const opening=smooth(prog(u,.26,.55)),out=prog(u,.48,.92);
  fruit(e,'tomato',600,420,1.08,opening,out);
  molecule(e,1050,260,47,prog(out,0,.65),1);molecule(e,1100,435,39,prog(out,.15,.80),0);
  text(e,'LYCOPENE',1110,320,26,C.muted,{font:'mono',alpha:out});text(e,'VITAMIN C / VITAMIN E',1070,510,25,C.muted,{font:'mono',alpha:out});
  const shield=smooth(prog(u,.70,.96));k.pen(1550,645,C.gold,.4,2.1);k.line(arcPoints(1550,645,20+shield*82,-Math.PI/2,-Math.PI/2+TAU*shield),C.paper,7);k.circle(1550,645,96,C.purple,null,0,shield*.08);
  route(k,[[1110,570],[1270,610],[1445,645]],shield,C.paper,4);text(e,'ANTIOXIDANTS',960,899,123,C.paper,{font:'serif',align:'center',weight:700});chip(e,'next: tabby cat',1430,90,360,C.gold);break;
 }
 case 'R29':request(e,2);break;
 case 'R30':{
  e.lyricMode='keyword';
  const leap=smooth(prog(u,.015,.41)),develop=smooth(prog(u,.15,.42)),touch=prog(u,.46,.81);k.circle(620,410,370,C.deep,null,0,.23);
  const r={x:lerp(CAT_PEEK.x,210,leap),y:lerp(CAT_PEEK.y,65,leap)-215*Math.sin(leap*Math.PI),w:lerp(CAT_PEEK.w,760,leap),h:lerp(CAT_PEEK.h,710,leap)};
  const drawCat=()=>k.figure('cat',r.x,r.y,r.w,r.h,{code:develop<.6,hot:develop,alpha:1});
  const portalFade=1-prog(u,.50,.80);
  plate(e,CAT_PORTAL.x,CAT_PORTAL.y,CAT_PORTAL.w,CAT_PORTAL.h,{title:'OUTPUT / projection released',line:C.purple,alpha:portalFade});
  // First behind the output rim, then above/left of it: both portions share the same moving asset.
  clip(ctx,CAT_PORTAL.x+3,CAT_PORTAL.y+50,CAT_PORTAL.w-6,CAT_PORTAL.h-53,drawCat);
  k.line([[CAT_PORTAL.x,CAT_PORTAL.y+CAT_PORTAL.h],[CAT_PORTAL.x+CAT_PORTAL.w,CAT_PORTAL.y+CAT_PORTAL.h]],C.paper,5,portalFade);
  saved(ctx,()=>{ctx.beginPath();ctx.rect(0,0,1920,940);ctx.rect(CAT_PORTAL.x+3,CAT_PORTAL.y+50,CAT_PORTAL.w-6,CAT_PORTAL.h-53);ctx.clip('evenodd');ctx.globalAlpha*=ease(prog(leap,.02,.24));drawCat();});
  if(leap>.8){const land=prog(leap,.8,1);k.line([[400-land*90,861],[920+land*90,861]],C.purple,3,(1-land)*.65);}
  const px=lerp(1620,1130,touch),py=lerp(310,410,touch);k.pen(px,py,C.gold,.65,2.1);
  for(let i=0;i<14;i++){const q=i/13,amp=(24+80*Math.sin(q*Math.PI))*touch*(.65+.35*Math.sin(t*8-i*.7));const x=1090+i*48;k.poly([[x,570-amp],[x+10,570],[x,570+amp],[x-10,570]],i<Math.floor(touch*14)?C.paper:C.purple,null,0,.85);}
  if(touch>.5){const pulse=(local*2.6)%1;k.circle(1060,430,40+pulse*70,null,C.gold,3,(1-pulse)*.6);text(e,'purrrrr...',1370,735,38,C.gold,{font:'script',align:'center'});}
  if(u>.38)text(e,'ENJOYMENT',960,907,132,C.purple,{font:'serif',align:'center',weight:700,alpha:smooth(prog(u,.38,.5))});break;
 }
 case 'R31':request(e,3);break;
 case 'R32':{
  e.lyricMode='keyword';k.grid(65,80,1790,740,t,{alpha:.18});const witness=smooth(prog(u,.48,.86));
  k.figure('operating',100,175,690,620,{code:false,alpha:1});
  const hand=k.artAnchor('operating',100,175,690,620,'hands');
  plate(e,790,200,430,370,{title:'world.generate()',line:C.purple});clip(ctx,805,259,400,292,()=>k.world(805,255,400,295,t,{era:0,depth:1.4,alpha:1}));
  k.line([hand,[885,hand[1]],[885,610],[1005,610],[1005,570]],C.purple,4);k.circle(...hand,8,C.purple);
  plate(e,1260,140,525,670,{title:'identity / ASTRA',line:witness>.8?C.gold:C.line});
  k.figure('bust',1300,210,440,405,{code:true,alpha:.24+witness*.56});
  text(e,'created: world',1300,665,27,C.muted,{font:'mono'});text(e,'witness:',1300,715,27,C.muted,{font:'mono'});text(e,typed('USER',witness),1470,720,43,C.gold,{font:'script'});
  const pen=[lerp(1870,1630,witness),lerp(385,729,witness)];k.pen(...pen,C.gold,.8,1.9);k.trace([[1450,748],[1510,760],[1590,744],[1680,756]],witness,C.gold,4,{pen:false});
  text(e,'EXISTENCE',960,910,123,C.purple,{font:'serif',align:'center',weight:700});break;
 }
 default:return false;
 }
 return true;
}
