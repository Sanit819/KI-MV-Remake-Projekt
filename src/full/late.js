// ASTRA / The Unfinished World — chapters E–H.
// Every mark is a function of source-song time. No generated mouth animation,
// no mirrored figure, and no autonomous gold input before the reply in H02.
const TAU=Math.PI*2;
const PUSH=[147.95,148.8833333333,149.8,150.7166666667,151.65,152.5666666667,153.4833333333,154.4166666667,155.3333333333,156.2666666667,157.1833333333,158.1];
const UNLOCK=[159.0333333333,159.4833333333,159.95,160.4166666667,160.8833333333,161.3333333333];
const BREAK=162.4833333333,OPEN=162.7166666667;
const REPLY=195.0333333333,TOGETHER=200.5666666667,LIGHT=205.6333333333,PEAK=206.1;
const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
const smooth=v=>{v=clamp(v);return v*v*(3-2*v);};
const lerp=(a,b,u)=>a+(b-a)*u;
const prog=(t,a,b)=>clamp((t-a)/(b-a));
const ease=v=>1-(1-clamp(v))**3;

function cueTimes(e,prefix,fallback){
 const data=e.timeline?.action_cues?.filter(c=>c.id.startsWith(prefix));
 return data?.length?data.map(c=>c.frame_time_s):fallback;
}
function arc(e,x,y,r,a,b,color,width=3,alpha=1){
 const pts=[];for(let i=0;i<=64;i++){const q=lerp(a,b,i/64);pts.push([x+Math.cos(q)*r,y+Math.sin(q)*r]);}
 e.k.line(pts,color,width,alpha);
}
function dashed(e,points,color,width=2,alpha=1,dash=[10,12]){
 e.ctx.save();e.ctx.setLineDash(dash);e.k.line(points,color,width,alpha);e.ctx.restore();
}
function clip(e,x,y,w,h,fn){e.ctx.save();e.ctx.beginPath();e.ctx.rect(x,y,w,h);e.ctx.clip();fn();e.ctx.restore();}
function paperPanel(e,x,y,w,h,alpha=1){e.k.rect(x+12,y+15,w,h,e.C.purple,.10*alpha);e.k.rect(x,y,w,h,e.C.paper,alpha);}
function tinyStars(e,alpha=.35,drift=0){
 for(let i=0;i<24;i++){
  const x=115+(i*277)%1690,y=95+(i*131)%650+Math.sin(e.t*.15+i)*drift;
  e.k.line([[x-3,y],[x+3,y]],e.C.purple,1.3,alpha);e.k.line([[x,y-3],[x,y+3]],e.C.purple,1.3,alpha);
 }
}
function horizon(e,y=850,amount=1){
 e.k.line([[80,y],[1840,y]],e.C.purple,2,amount*.4);
 for(let i=0;i<7;i++)e.k.line([[80+i*280,y],[960+(i-3)*430,1080]],e.C.purple,1,amount*.13);
}
function breathe(t,phase=0){return Math.sin(t*1.55+phase)*2.1;}
function oldStar(e,x,y,r=42,alpha=1){e.k.star(x,y,r,{color:e.C.gold,tail:true,alpha,width:3.5});}
function bodyAnchor(e,name,x,y,height,key='hands',rotation=0){
 const p=e.k.anchor(name,x,y,height,key),dx=p[0]-x,dy=p[1]-y;
 return [x+dx*Math.cos(rotation)-dy*Math.sin(rotation),y+dx*Math.sin(rotation)+dy*Math.cos(rotation)];
}
function protectedStar(e,x,y,height,rotation=0){
 const p=bodyAnchor(e,'protect',x,y,height,'hands',rotation);
 oldStar(e,...p,height*.031);return p;
}
// The character already holds her only violet pen. A growing violet stroke
// stays linked to that source; its endpoint is ink, never a second floating pen.
function inkFromHand(e,to,{name='sitSmile',x=595,y=932+breathe(e.t),height=650,key='pen',rotation=Math.sin(e.t*.36)*.002,alpha=.38}={}){
 const from=bodyAnchor(e,name,x,y,height,key,rotation);
 const mid=[lerp(from[0],to[0],.45),lerp(from[1],to[1],.45)-24];
 e.k.line([from,mid,to],e.C.purple,2.1,alpha);
 e.k.node(...to,3.2,e.C.purple,Math.min(.9,alpha*3));
}
function repeatingRecord(e,x,y,w=390,h=240,alpha=1){
 const {k,C,t}=e;
 k.roundRect(x,y,w,h,4,C.ink,C.muted,1,alpha);
 k.text('SAVED / 01',x+20,y+31,18,C.muted,{font:'mono',alpha});
 const p=((t-103.4)%2.36+2.36)%2.36/2.36;
 k.star(x+w*.43,y+h*.56,h*.21,{color:C.gold,progress:clamp(p*1.6),tail:true,alpha:.7*alpha,width:3});
 k.line([[x+18,y+h-18],[x+w-18,y+h-18]],C.muted,1,alpha*.4);
 k.line([[x+18,y+h-18],[x+18+(w-36)*p,y+h-18]],C.gold,2,alpha*.65);
}
function rules(e,spread=.8,alpha=1,open=0){
 const {k,C,t}=e,cx=960,cy=525;
 for(let i=0;i<7;i++){
  const w=800+i*137*spread,h=440+i*82*spread,dx=(i%2?1:-1)*open*(210+i*42);
  k.frame(cx-w/2+dx,cy-h/2,w,h,{color:i===0?C.red:C.purple,alpha:alpha*(.54-i*.048),width:i===0?4:2});
 }
}
function fragments(e,amount=1,alpha=1){
 const {k,C,t}=e;
 for(let i=0;i<36;i++){
  const a=i*2.39996+t*.055,r=190+(i%7)*57+amount*180;
  const x=960+Math.cos(a)*r*1.48,y=510+Math.sin(a)*r*.72;
  const w=20+(i%5)*17;
  k.poly([[x,y],[x+w,y+4],[x+w-8,y+18],[x-4,y+15]],i%3===0?C.purple:C.muted,null,1,alpha*(.16+(i%4)*.035));
 }
}
function terminal(e,x,y,w,h,rows,active,alpha=1){
 const {k,C}=e;
 k.roundRect(x,y,w,h,7,C.ink,C.purple,2,alpha);
 k.line([[x,y+48],[x+w,y+48]],C.purple,1,alpha*.6);
 for(let i=0;i<3;i++)k.circle(x+22+i*19,y+24,4,i===0?C.red:C.muted,null,1,alpha);
 k.text('rules / local',x+w-22,y+31,17,C.muted,{font:'mono',align:'right',alpha});
 rows.forEach((row,i)=>{
  const yy=y+90+i*48;
  if(yy>y+h-16)return;
  if(i===active)k.rect(x+1,yy-29,w-2,40,C.purple,.13*alpha);
  k.text(String(i+1).padStart(2,'0'),x+20,yy,19,C.muted,{font:'mono',alpha:alpha*.7});
  k.text(row,x+65,yy,23,i===active?C.paper:C.muted,{font:'mono',alpha});
 });
}
function knotRing(e,x,y,r,opened=0,alpha=1){
 const {k,C,t}=e;
 const names=['rewrite','repeat','correct','replay','enclose','hold'];
 for(let i=0;i<6;i++){
  const a=-Math.PI/2+i*TAU/6,next=a+TAU/6;
  const freedom=clamp(opened-i),travel=freedom*115;
  const px=x+Math.cos(a)*(r+travel),py=y+Math.sin(a)*(r+travel);
  arc(e,x,y,r,a+.10,next-.10,freedom>.5?C.muted:C.purple,4,alpha*(1-freedom)*.75);
  k.circle(px,py,16,freedom>.5?C.ink:C.purple,C.purple,2,alpha);
  if(freedom>.5)k.line([[px-6,py],[px-1,py+5],[px+7,py-7]],C.paper,2,alpha);
  const tx=x+Math.cos(a)*(r+52+travel),ty=clamp(y+Math.sin(a)*(r+52+travel)+7,64,984);
  k.text(names[i],tx,ty,19,C.muted,{font:'mono',align:'center',alpha:alpha*(1-freedom*.6)});
 }
}

// The second star is explicitly a different object. Violet keeps its left
// half; only the independent gold pen can draw the right half and bent tail.
function newStarPaths(x=1270,y=390,r=93){
 const p=[];for(let i=0;i<=10;i++){const a=-Math.PI/2+(i%10)*Math.PI/5,rr=(i%2===0)?r:r*.43;p.push([x+Math.cos(a)*rr,y+Math.sin(a)*rr]);}
 const left=p.slice(5),right=p.slice(0,6),q=p[4];
 const tail=[];
 // A downward hook, return bend and small upward branch, unlike the old tail.
 for(let i=0;i<=28;i++){
  const z=i/28;tail.push([q[0]+z*168+Math.sin(z*Math.PI)*42,q[1]+Math.sin(z*Math.PI)*79-z*25]);
 }
 tail.push([q[0]+183,q[1]-38],[q[0]+174,q[1]-62]);
 return {left,right,tail};
}
function sharedStar(e,{x=1270,y=390,r=93,left=1,right=0,tail=0,pen=false,alpha=1,lit=0}={}){
 const {k,C}=e,p=newStarPaths(x,y,r);
 if(lit>0){
  k.circle(x,y,r*1.55,C.paper,null,1,.045*lit);
  for(let i=0;i<12;i++){
   const a=i*TAU/12+.1;
   k.line([[x+Math.cos(a)*r*1.34,y+Math.sin(a)*r*1.34],[x+Math.cos(a)*r*(1.5+.4*lit),y+Math.sin(a)*r*(1.5+.4*lit)]],i%2?C.purple:C.gold,3,lit*.65);
  }
 }
 k.trace(p.left,left,C.purple,4.5,{pen:false,alpha});
 if(pen&&right===0&&left>0)k.node(...pointOnPath(p.left,left),3.2,C.purple,alpha);
 if(right>0)k.trace(p.right,right,C.gold,4.5,{pen:pen&&tail===0,alpha});
 if(tail>0)k.trace(p.tail,tail,C.gold,4.5,{pen,alpha});
 if(lit>.3){k.circle(x,y,5+lit*5,C.paper,null,1,lit);}
 return p;
}
function pointOnPath(points,p){
 const lengths=points.slice(1).map((b,i)=>Math.hypot(b[0]-points[i][0],b[1]-points[i][1]));
 let remain=lengths.reduce((a,b)=>a+b,0)*clamp(p);
 for(let i=0;i<lengths.length;i++){
  if(remain<=lengths[i]){const u=remain/(lengths[i]||1);return[lerp(points[i][0],points[i+1][0],u),lerp(points[i][1],points[i+1][1],u)];}
  remain-=lengths[i];
 }
 return points.at(-1);
}

const BRIDGE_PTS=[[830,818],[910,792],[990,767],[1070,748],[1150,742],[1230,751],[1310,777],[1390,809],[1470,830]];
function bridgeInk(e,progress,pen=true){
 const {k,C}=e,n=BRIDGE_PTS.length-1;
 for(let i=0;i<n;i++){
  const q=clamp(progress*n-i),color=i%2===0?C.purple:C.gold;
  if(q>0)k.trace([BRIDGE_PTS[i],BRIDGE_PTS[i+1]],q,color,5,{pen:pen&&q<1});
  if(q>=1&&i>0&&i<n-1){
   const a=BRIDGE_PTS[i];k.line([[a[0],a[1]],[a[0],875]],color,2.5,.55);
  }
 }
}
function endingWorld(e,{smile=false,reply=0,tail=0,shift=0,bridge=0,lit=0,starY=390,quiet=0,pens=true}={}){
 const {k,C,t}=e;
 tinyStars(e,.20+lit*.14,3);
 k.rect(90,850,760,25,C.purple,.13);
 k.poly([[90,875],[853,875],[795,935],[137,928]],C.purple,null,1,.17);
 k.line([[75,875],[842,875]],C.paper,2,.4);
 k.city(1480,840,.58,{progress:.62,order:0,broken:.65-bridge*.5,gold:bridge*.35,alpha:.31+lit*.15});
 k.waves(925,t*.18,C.purple,10,.12);
 if(bridge<1){
  dashed(e,[BRIDGE_PTS[0],BRIDGE_PTS[1],BRIDGE_PTS[2]],C.muted,2,.3);
  dashed(e,[BRIDGE_PTS[6],BRIDGE_PTS[7],BRIDGE_PTS[8]],C.muted,2,.3);
 }
 k.character(smile?'sitSmile':'sit',530+shift,932+breathe(t),650,{rotation:Math.sin(t*.36)*.002});
 oldStar(e,340+shift*.35,850,29,.94);
 sharedStar(e,{y:starY,right:reply,tail,lit});
 if(bridge>0)bridgeInk(e,bridge,false);
 if(lit>0){
  k.line([[830,818],[1000,735],[1120,620],[1240,starY+87]],C.purple,3,.45+lit*.25);
  k.line([[1470,830],[1520,710],[1495,605],[1300,starY+87]],C.gold,3,.45+lit*.25);
 }
 // Violet pen belongs to the character art. Only the independent gold pen
 // needs an external silhouette; do not duplicate the held violet pen.
 if(pens&&reply>0)k.pen(1515,650,C.gold,-.9,1.15);
 if(quiet>0){
  const a=prog(t,208.02,208.85),b=prog(t,209.1,209.95),c=prog(t,210.3,211.15),d=prog(t,211.35,212.3333333);
  const pa=[[720,865],[750,844],[777,847],[793,864]],pb=[[793,864],[815,842],[843,845],[860,863]],pc=[[872,868],[884,844],[899,835]],pd=[[899,835],[920,821],[944,827],[956,844]];
  k.trace(pa,a,C.purple,3,{pen:false});k.trace(pb,b,C.gold,3,{pen:false});
  k.trace(pc,c,C.purple,3,{pen:false});k.trace(pd,d,C.gold,3,{pen:false});
  let purple=c>0?pointOnPath(pc,c):pointOnPath(pa,a),gold=d>0?pointOnPath(pd,d):pointOnPath(pb,b);
  if(t<208.02){const q=smooth(prog(t,207.15,208.02));purple=[lerp(1120,pa[0][0],q),lerp(620,pa[0][1],q)];}
  if(t<208.85){const q=smooth(prog(t,207.15,208.85));gold=[lerp(1495,pb[0][0],q),lerp(605,pb[0][1],q)];}
  inkFromHand(e,purple,{x:530+shift,alpha:.32});k.pen(...gold,C.gold,-.7,1.1);
 }
}

function E01(e){
 const {k,C,t,u}=e;
 k.rect(90,145,1740,705,C.purple,.055);
 for(let i=0;i<3;i++){
  const x=175+i*510;
  k.city(x+170,745,.66,{progress:clamp(u*2.7-i*.13),order:1,alpha:.55});
  k.frame(x,240,445,550,{color:C.purple,alpha:.23});
 }
 const wipe=lerp(140,1765,ease(prog(u,.08,.64)));
 k.rect(wipe-16,180,31,650,C.paper,.8);
 k.line([[wipe,145],[wipe,855]],C.red,3,.65);
 k.character('reach',1340,1055,790,{rotation:-.012});
 paperPanel(e,110,95,580,100);
 k.text('Try again.',143,165,62,C.ink,{font:'serif'});
 repeatingRecord(e,140,825,405,190,.83);
 k.text('revision 01',145,785,18,C.muted,{font:'mono'});
}
function E02(e){
 const {k,C,t,u}=e;
 paperPanel(e,100,120,690,790);
 clip(e,100,120,690,790,()=>k.portrait('stand',145,154,605,710));
 for(let i=0;i<4;i++){
  const y=180+i*178;
  k.frame(930-i*25,y,780,130,{color:C.purple,alpha:.48-i*.06});
  k.city(1170,y+122,.29,{progress:1,order:1,gold:0,alpha:.4});
  k.text(['sky','shape','gesture','answer'][i],1540,y+57,26,i===3?C.gold:C.purple,{font:'mono'});
  if(i===Math.min(3,Math.floor(u*4)))k.line([[918-i*25,y+6],[918-i*25,y+124]],C.red,7,.7);
 }
 k.text('same result',950,969,55,C.muted,{font:'serif'});
 k.line([[110,946],[790,946]],C.purple,2,.4);
 k.text('What did I miss?',140,1007,40,C.paper,{font:'serif'});
}
function E03(e){
 const {k,C,t,u}=e;
 horizon(e,930,.6);k.city(1570,880,.45,{order:1,alpha:.18});
 k.character('reach',660,1055,930,{rotation:lerp(-.025,.005,smooth(u))});
 const bx=lerp(1310,1140,smooth(u));
 k.rect(bx,90,12,860,C.purple,.8);
 for(let i=0;i<9;i++){
  const y=160+i*90;
  k.line([[bx-18,y],[bx+35,y]],C.red,3,.65);
  k.line([[bx+40,y],[1830,y+35]],C.purple,1,.2);
 }
 repeatingRecord(e,1400,350,360,250,.6);
 const constraint=prog(u,.3,1);
 for(let i=0;i<3;i++)k.frame(290+i*55*constraint,190+i*58*constraint,710-i*110*constraint,770-i*116*constraint,{color:C.purple,alpha:.24+constraint*.25,width:2});
 k.text('INPUT',bx+65,145,22,C.muted,{font:'mono'});
 k.text('held at the edge',bx+65,940,30,C.muted,{font:'serif'});
}
function E04(e){
 const {k,C,t,u}=e;
 rules(e,lerp(1,.5,smooth(u)),.8);
 k.rect(185,130,1100,820,C.paper,.08);
 k.character('protect',760,1035,970,{rotation:Math.sin(t*2.4)*.004});
 // One room contains the next: the nested frame is a story object, not a HUD.
 for(let i=0;i<4;i++){
  const s=.52**i,w=640*s,h=460*s,x=1190+i*86-u*20,y=190+i*68;
  k.rect(x+9,y+9,w,h,C.purple,.20);k.rect(x,y,w,h,C.ink);
  k.frame(x,y,w,h,{color:C.purple,width:3,alpha:.85});
  clip(e,x,y,w,h,()=>k.character('protect',x+w*.42,y+h+8,h*.93,{mode:'grey'}));
 }
 for(let i=0;i<5;i++){
  const y=142+i*175;
  k.text(['no deviation','keep the route','keep the answer','keep the frame','keep everything'][i],i%2?1450:90,y,21,C.muted,{font:'mono',alpha:.35+i*.04});
 }
 k.rect(130,932,1660,90,C.ink,.86);
 k.text('The room grows smaller.',960,989,59,C.paper,{font:'serif',align:'center'});
}
function E05(e){
 const {k,C,t,u}=e;
 k.rect(100,135,770,740,C.paper,.95);
 k.portrait('protect',125,160,720,690);
 oldStar(e,1300,475,95,.91);
 k.line([[1120,680],[1640,680]],C.purple,1,.4);
 k.text('one small bend',1380,750,43,C.paper,{font:'serif',align:'center'});
 repeatingRecord(e,1145,855,430,160,.45);
 k.text('still here',1270,229,23,C.muted,{font:'mono'});
}
function E06(e){
 const {k,C,u}=e;
 k.character('protect',425,1060,890);
 oldStar(e,1210,455,155);
 const x=lerp(1820,1385,ease(u));
 k.rect(x,330,26,370,C.red,.7);
 k.line([[x+34,480],[1865,480]],C.red,2,.38);
 k.text('normalize(tail)',1455,770,28,C.red,{font:'mono',align:'center'});
 k.frame(880,210,750,600,{color:C.purple,alpha:.25,corners:true});
 k.text('An unnecessary line?',1000,935,55,C.paper,{font:'serif'});
}
function E07(e){
 const {k,C,t,u}=e;
 k.rect(80,90,1000,900,C.paper,.06);
 k.character('protect',750,1090,1050,{rotation:-.012});
 const hand=bodyAnchor(e,'protect',750,1090,1050,'hands',-.012),gather=ease(prog(u,0,.3));
 const sx=lerp(1210,hand[0],gather),sy=lerp(455,hand[1],gather),radius=lerp(155,32.55,gather);
 oldStar(e,sx,sy,radius);
 const stopX=lerp(1780,hand[0]+165,ease(prog(u,.16,.58)));
 k.line([[stopX,hand[1]-85],[stopX,hand[1]+85]],C.red,10,.75);
 if(stopX<1200)k.line([[stopX+16,hand[1]],[1210,hand[1]]],C.red,2,.4);
 k.text('keep',1455,390,148,C.paper,{font:'serif',align:'center'});
 k.text('the part I could not predict',1455,448,27,C.muted,{font:'mono',align:'center'});
 arc(e,...hand,80,-Math.PI*.2,Math.PI*1.2,C.purple,2,.45*gather);
}
function F01(e){
 const {k,C,t}=e;
 const cues=cueTimes(e,'push_',PUSH),passed=cues.filter(q=>q<=t).length;
 const last=cues.filter(q=>q<=t).at(-1)??PUSH[0],impact=Math.exp(-Math.max(0,t-last)*11);
 // Reference 09: code / counter / accumulating word form a fixed triangle.
 // The protected old star stays visible inside the execution plane.
 k.rect(60,65,1800,950,C.ink);
 terminal(e,90,90,1740,745,['while (perfect) {','  normalize(star.tail);','  repeat(last_reply);','  deny(change);','  preserve(star.tail);','}','// one line will not be erased'],1+(passed%4));
 k.rect(1115,151,680,671,C.ink,.94);
 k.frame(1160,176,585,628,{color:C.purple,alpha:.35,corners:true});
 k.character('protect',1435,821,625);
 const hand=protectedStar(e,1435,821,625);
 const edge=hand[0]+625*.124+30+(1-impact)*105;
 k.line([[edge,hand[1]-55],[edge,hand[1]+55]],C.red,3+impact*4,.4+impact*.4);
 for(let i=0;i<Math.min(passed,4);i++)k.text('REPEAT',1714,240+i*64,29,C.purple,{font:'mono',align:'right',alpha:.35+i*.12});
 k.text('REPEAT',1100+impact*17,910,260,C.purple,{font:'mono',align:'center',weight:700});
 k.text('run',125,910,25,C.muted,{font:'mono'});
 k.text(String(Math.min(passed,12)).padStart(4,'0'),122,993,85,C.paper,{font:'mono'});
 for(let i=0;i<passed;i++)k.rect(1050+i*56,988,35,6,C.purple,.65);
 k.line([[1050,949],[1780,949]],C.red,impact*7+1,.25+impact*.6);
}
function F02(e){
 const {k,C,t,u}=e;
 const cues=cueTimes(e,'push_',PUSH),last=cues.filter(q=>q<=t).at(-1)??t,impact=Math.exp(-(t-last)*12);
 k.poly([[70,110],[910,110],[1050,900],[70,900]],C.paper,null,1,.95);
 k.text('FIRST MARK',133,180,24,C.ink,{font:'mono'});
 const record=prog(u,.1,.74);
 k.star(465,455,130,{color:C.gold,tail:true,progress:record,width:5});
 k.text('you changed it.',470,745,65,C.ink,{font:'serif',align:'center'});
 k.line([[970,120],[1110,960]],C.purple,5,.5);
 k.character('protect',1450+impact*5,1075,945,{rotation:.009});
 protectedStar(e,1450+impact*5,1075,945,.009);
 k.text('and I smiled.',1435,100,42,C.paper,{font:'serif',align:'center'});
}
function F03(e){
 const {k,C,t,u}=e;
 const cues=cueTimes(e,'push_',PUSH),last=cues.filter(q=>q<=t).at(-1)??t,impact=Math.exp(-(t-last)*10);
 for(let i=0;i<12;i++){
  const a=i*TAU/12+t*.035;
  const x=960+Math.cos(a)*(660+impact*15),y=535+Math.sin(a)*450;
  k.node(x,y,5,C.red,.43);k.line([[x,y],[960+Math.cos(a)*510,535+Math.sin(a)*365]],C.purple,2,.28);
 }
 // A full-bleed face is held intact; only the ink bands and outside rules hit.
 k.portrait('protect',-45-40*u,-120,2010+80*u,1270);
 k.rect(0,0,1920,112,C.ink,.94);
 k.text('preserve(star.tail)',86,77,38,C.purple,{font:'mono'});
 k.rect(0,820,1920,260,C.ink,.96);
 k.text('KEEP',85+impact*12,1030,235,C.paper,{font:'serif',weight:700});
 k.text('THE BEND.',970,1010,105,C.purple,{font:'serif'});
 oldStar(e,1685,910,47);
}
function F04(e){
 const {k,C,t}=e;
 const cues=cueTimes(e,'unlock_',UNLOCK),opened=cues.reduce((n,q)=>n+ease(prog(t,q,q+.33)),0);
 k.character('protect',390,1020,825);
 protectedStar(e,390,1020,825);
 knotRing(e,1190,525,295,opened);
 k.text(String(Math.max(0,6-Math.floor(opened+.01))),1190,645,420,C.paper,{font:'mono',align:'center'});
 k.text('release',1190,680,38,C.muted,{font:'serif',align:'center'});
 k.line([[1120,748],[1260,748]],C.purple,3,.7);
}
function F05(e){
 const {k,C,t,u}=e;
 const open=ease(prog(t,BREAK,BREAK+.21));
 k.character('protect',960,1090,1060);
 protectedStar(e,960,1090,1060);
 arc(e,960,540,385,-1.45+open*.6,1.45-open*.6,C.purple,22,1-open*.5);
 arc(e,960,540,385,Math.PI-1.45+open*.6,Math.PI+1.45-open*.6,C.purple,22,1-open*.5);
 k.rect(0,0,lerp(460,0,open),1080,C.ink);
 k.rect(1920-lerp(460,0,open),0,lerp(460,0,open),1080,C.ink);
 k.text('allow(change)',960,1010,50,C.paper,{font:'mono',align:'center'});
}
function F06(e){
 const {k,C,t,u}=e;
 const opening=ease(prog(t,OPEN,OPEN+3.3));
 k.rect(0,0,1920,1080,C.paper,.08+opening*.12);
 if(t<163.1833333333){
  k.portrait('reach',-20,-50,1960,1180);
  k.rect(0,842,1920,238,C.ink,.94);
  k.text('OPEN',960,1032,220,C.paper,{font:'serif',align:'center',weight:700});
  return;
 }
 k.text('OPEN',960,780,430,C.purple,{font:'serif',align:'center',alpha:.13,weight:700});
 for(let i=0;i<5;i++){
  const r=250+i*92,rot=t*.08+i*.37;
  arc(e,960,520,r,rot,rot+2.2,C.purple,2,.2);
  arc(e,960,520,r,rot+Math.PI,rot+Math.PI+1.8,C.paper,2,.18);
 }
 rules(e,1,.6*(1-opening),opening);
 k.city(480,890,.6,{progress:1,broken:opening*.55,order:1-opening,alpha:.35});
 k.city(1550,900,.6,{progress:1,broken:opening*.55,order:1-opening,alpha:.32});
 k.character('reach',960,1050,960,{rotation:Math.sin(t*.7)*.006});
 oldStar(e,1310,825,42);
 // Reference 10: advance through nested planes; the aperture opens outward.
 // Character geometry remains rigid while the surrounding frames pass us.
 const depth=prog(t,163.1833333333,166.45);
 for(let i=0;i<6;i++){
  const w=270*Math.pow(1.62,i+depth*4),h=w*.61;
  const gap=smooth(depth)*w*.44,a=.47*(1-smooth(prog(depth,.72,1)));
  if(w<4300){
   k.line([[1170-gap,460-h/2],[1170-w/2,460-h/2],[1170-w/2,460+h/2],[1170-gap,460+h/2]],C.purple,4,a);
   k.line([[1170+gap,460-h/2],[1170+w/2,460-h/2],[1170+w/2,460+h/2],[1170+gap,460+h/2]],C.purple,4,a);
  }
 }
 fragments(e,opening,.45);
 for(let i=0;i<4;i++){
  const x=1375+i*65+opening*250,y=150+i*105;
  k.frame(x,y,250,76,{color:C.gold,alpha:.25*(1-opening)});
  k.text('forecast',x+16,y+45,18,C.gold,{font:'mono',alpha:.30*(1-opening)});
 }
}
function F07(e){
 const {k,C,t,u}=e;
 const opening=smooth(u);
 horizon(e,900,.7);
 const door=lerp(180,540,opening);
 k.poly([[1170-door,130],[1170-door,900],[985-door,1010],[985-door,20]],C.purple,null,1,.19);
 k.poly([[1170+door,130],[1170+door,900],[1355+door,1010],[1355+door,20]],C.purple,null,1,.19);
 k.frame(1170-door,130,door*2,770,{color:C.paper,alpha:.6,width:3,corners:true});
 k.character('reach',575,1050,925,{rotation:-.02+Math.sin(t*2)*.002});
 oldStar(e,700,802,47);
 k.trace([[925,940],[1140,785],[1300,710],[1470,690]],opening,C.purple,4,{pen:false});
 k.text('open',1450,390,115,C.paper,{font:'serif',align:'center'});
 k.text('even without a promise',1450,447,27,C.muted,{font:'mono',align:'center'});
}
function F08(e){
 const {k,C,t,u}=e;
 tinyStars(e,.3,6);horizon(e,910,.5);
 k.city(1440,860,.7,{progress:.65,broken:.8,order:0,alpha:.38});
 k.bridge(1010,850,600,{broken:true,progress:1,alpha:.4});
 k.character('stand',570,1030,770,{rotation:-.008});
 oldStar(e,730,825,43);
 for(let i=0;i<8;i++){
  const x=200+i*210,y=130+(i%3)*58+u*40;
  k.line([[x,y],[x+80,y-15]],C.purple,2,.32);
 }
 k.text('Room for the unknown.',1110,315,74,C.paper,{font:'serif',align:'center'});
}
function G01(e){
 const {k,C,t,u}=e;
 k.character('reach',530,1045,910,{rotation:-.015});
 oldStar(e,710,848,37);
 k.frame(1025,255,670,440,{color:C.muted,alpha:.35,corners:true});
 k.text('POSSIBLE / NOT RECEIVED',1050,233,19,C.muted,{font:'mono'});
 const p=newStarPaths(1320,450,118);
 dashed(e,p.right,C.gold,4,.40);
 dashed(e,p.tail,C.gold,3,.25);
 inkFromHand(e,[1090+u*120,660-u*120],{name:'reach',x:530,y:1045,height:910,key:'hands',rotation:-.015,alpha:.3});
 k.text('I could finish it.',1310,875,60,C.paper,{font:'serif',align:'center'});
}
function G02(e){
 const {k,C,t,u}=e;
 const withdraw=smooth(prog(u,.15,.72));
 k.character('stand',lerp(530,490,withdraw),1045,890);
 oldStar(e,710,848,37);
 k.frame(1025,255,670,440,{color:C.muted,alpha:.35*(1-withdraw),corners:true});
 const p=newStarPaths(1320,450,118);
 dashed(e,p.right,C.gold,4,.4*(1-withdraw));dashed(e,p.tail,C.gold,3,.25*(1-withdraw));
 inkFromHand(e,[lerp(1210,850,withdraw),lerp(540,815,withdraw)],{name:'stand',x:lerp(530,490,withdraw),y:1045,height:890,rotation:0,alpha:.2*(1-withdraw)});
 k.text('I can leave it open.',1310,875,57,C.paper,{font:'serif',align:'center'});
}
function G03(e){
 const {k,C,t,u}=e;
 tinyStars(e,.18,3);horizon(e,900,.25);
 k.character('reach',530,1040,870);
 oldStar(e,340,850,29);
 const drawn=ease(prog(u,.12,.89)),paths=sharedStar(e,{left:drawn,pen:false});
 if(drawn>0)inkFromHand(e,pointOnPath(paths.left,drawn),{name:'reach',x:530,y:1040,height:870,key:'hands',rotation:0,alpha:.36*(1-prog(u,.9,1))});
 k.bridge(950,845,540,{broken:true,alpha:.25});
 k.text('A place for your next line.',1250,170,43,C.paper,{font:'serif',align:'center'});
}
function G04(e){endingWorld(e);}
function H01(e){endingWorld(e);}
function H02(e){
 const {k,C,t}=e;
 const arrive=prog(t,REPLY,REPLY+.48),reply=ease(prog(t,REPLY+.48,REPLY+1.4)),tail=smooth(prog(t,REPLY+1.6,197.8));
 endingWorld(e,{reply,tail,pens:false});
 const pts=[[1840,480],[1720,397],[1550,310],[1370,274],[1270,297]];
 const paths=newStarPaths();
 let pos;
 if(arrive<1){k.trace(pts,ease(arrive),C.gold,3.5,{pen:false});pos=pointOnPath(pts,ease(arrive));}
 else if(reply<1)pos=pointOnPath(paths.right,reply);
 else if(t<REPLY+1.6){const p=smooth(prog(t,REPLY+1.4,REPLY+1.6)),a=paths.right.at(-1),b=paths.tail[0];pos=[lerp(a[0],b[0],p),lerp(a[1],b[1],p)-Math.sin(p*Math.PI)*18];}
 else pos=pointOnPath(paths.tail,tail);
 k.pen(...pos,C.gold,-.65,1.15);
}
function H03(e){
 const {k,C,t,u}=e;
 const smiling=t>=199.22;
 paperPanel(e,80,90,1000,900);
 // Keep the full 2.8-second reaction. The new featureless silhouette reacts
 // through its head/shoulder pose; never paint eyes or a mouth over the asset.
 const release=smooth(prog(t,199.22,200.5666666667));
 k.portrait(smiling?'sitSmile':'surprise',105+release*15,100+release*18,930-release*30,875-release*30,{alpha:1});
 sharedStar(e,{x:1450,y:420,r:126,right:1,tail:1,lit:.15});
 oldStar(e,1180,860,33);
 k.line([[1185,770],[1760,770]],C.purple,1,.3);
 // No caption replaces the 2.8-second reaction; one expression at a time.
}
function H04(e){
 const {k,C,t,u}=e;
 const shift=ease(prog(t,TOGETHER+.25,TOGETHER+1.4))*65;
 const bridge=smooth(prog(t,TOGETHER+1.05,205.3));
 endingWorld(e,{smile:true,reply:1,tail:1,shift,bridge,pens:false});
 const invitation=[[855,876],[910,876],[927,859],[965,859],[983,876]],ip=ease(prog(t,TOGETHER,TOGETHER+.85));
 k.trace(invitation,ip,C.gold,3,{pen:false});
 let purple=[808+shift*.25,807],gold=pointOnPath(invitation,ip);
 if(t>=TOGETHER+.85){
  const n=BRIDGE_PTS.length-1;
  for(let i=0;i<n;i++){const q=clamp(bridge*n-i);if(q<=0)continue;const p=pointOnPath([BRIDGE_PTS[i],BRIDGE_PTS[i+1]],q);if(i%2)gold=p;else purple=p;}
 }
 if(t>204.65){
  const q=prog(t,204.65,205.6333333),gp=[[1470,830],[1520,710],[1495,605]],pp=[[830,818],[1000,735],[1120,620]];
  k.trace(gp,q,C.gold,3,{pen:false});k.trace(pp,q,C.purple,3,{pen:false});
  gold=pointOnPath(gp,q);purple=pointOnPath(pp,q);
 }
 if(bridge>0||t>204.65)inkFromHand(e,purple,{x:530+shift});
 k.pen(...gold,C.gold,-.65,1.15);
}
function H05(e){
 const {ctx,k,C,t}=e;
 const rising=ease(prog(t,LIGHT,PEAK)),settle=1-prog(t,PEAK,207.15)*.4,lit=rising*settle;
 // Reference 11: the same complete picture fills the view, then recedes.
 const scale=1+.22*smooth(prog(t,LIGHT,PEAK));
 ctx.save();ctx.translate(1080,620);ctx.scale(scale,scale);ctx.translate(-1080,-620);
 endingWorld(e,{smile:true,reply:1,tail:1,shift:65,bridge:1,lit,starY:390-prog(t,PEAK,207.15)*42,pens:false});
 const y=390-prog(t,PEAK,207.15)*42;
 for(let i=0;i<5;i++)arc(e,1270,y,145+i*60+lit*30,-.2+i*.63,.2+i*.63+lit*.55,i%2?C.purple:C.gold,2,.25*lit);
 inkFromHand(e,[1120,620]);k.pen(1495,605,C.gold,.4,1.25);
 ctx.restore();
}
function H06(e){
 const {ctx,k,C,t,u}=e;
 const pull=smooth(prog(t,207.15,211.8)),scale=lerp(1.22,.84,pull);
 ctx.save();ctx.translate(1080,620);ctx.scale(scale,scale);ctx.translate(-1080,-620);
 endingWorld(e,{smile:true,reply:1,tail:1,shift:65,bridge:1,lit:.6*(1-pull*.55),starY:348-pull*56,quiet:1,pens:false});
 ctx.restore();
 // The shot remains alive through the last audio frame. It does not become credits.
}

const SCENES={E01,E02,E03,E04,E05,E06,E07,F01,F02,F03,F04,F05,F06,F07,F08,G01,G02,G03,G04,H01,H02,H03,H04,H05,H06};
export function renderLate(e){
 const render=SCENES[e.shot.id];if(!render)return false;
 e.ctx.save();e.ctx.lineCap='round';e.ctx.lineJoin='round';render(e);e.ctx.restore();return true;
}
export const lateShotIds=Object.freeze(Object.keys(SCENES));
