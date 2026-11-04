// ASTRA — acts A–D. Original compositions for the settled 54-shot story.
// Every state is derived from source-song time. Character faces are artwork.
const TAU = Math.PI * 2;
const clamp = (v,a=0,b=1)=>Math.max(a,Math.min(b,v));
const mix=(a,b,p)=>a+(b-a)*p;
const smooth=p=>{p=clamp(p);return p*p*(3-2*p);};
const part=(u,a,b)=>smooth((u-a)/(b-a));
function arc(cx,cy,rx,ry,a,b,n=70){return Array.from({length:n+1},(_,i)=>{const q=mix(a,b,i/n);return[cx+Math.cos(q)*rx,cy+Math.sin(q)*ry];});}
function bez(a,b,c,d,n=70){return Array.from({length:n+1},(_,i)=>{const p=i/n,q=1-p;return[q*q*q*a[0]+3*q*q*p*b[0]+3*q*p*p*c[0]+p*p*p*d[0],q*q*q*a[1]+3*q*q*p*b[1]+3*q*p*p*c[1]+p*p*p*d[1]];});}
function crookedStar(x,y,r,order=0){const pts=[];for(let i=0;i<10;i++){const a=-Math.PI/2+i*Math.PI/5;const skew=(1-order)*[0,.05,.10,-.04,-.09,.02,.13,-.04,-.06,.04][i];const rr=r*(i%2?.43:1)*(1+skew);pts.push([x+Math.cos(a+skew*.4)*rr,y+Math.sin(a+skew*.4)*rr]);}pts.push(pts[0]);return pts;}
function oldTail(x,y,r){return bez([x+.58*r,y+.27*r],[x+2.2*r,y+1.9*r],[x+3.1*r,y-.4*r],[x+4*r,y+.6*r],55);}
function flower(k,C,x,y,s,p=1){for(let i=0;i<5;i++){const a=i*TAU/5; k.circle(x+Math.cos(a)*s*.45,y+Math.sin(a)*s*.45,s*.36,C.purple,null,0,p);}k.circle(x,y,s*.19,C.paper,null,0,p);}
function paperPanel(e,x,y,w,h,alpha=1){e.k.rect(x+14,y+18,w,h,e.C.purple,alpha*.22);e.k.rect(x,y,w,h,e.C.paper,alpha);}
function stars(e,seed=0,count=16,alpha=.5){const{k,C,t}=e;for(let i=0;i<count;i++){const x=90+((i*269+seed*71)%1740),y=100+((i*137+seed*103)%700);const r=2+(i%3)*1.6;k.circle(x,y,r,C.purple,null,0,alpha*(.8+.2*Math.sin(t*.3+i)));}}
function paperTitle(e,text,x,y,size=90,color=e.C.paper){e.k.text(text,x,y,size,color,{font:'serif'});}
function corners(e,x,y,w,h,color=e.C.muted){e.k.frame(x,y,w,h,{color,corners:true,alpha:.6,width:2});}
function ring(e,x,y,rx,ry,color=e.C.purple,alpha=.65,phase=0){e.k.line(arc(x,y,rx,ry,phase,phase+TAU),color,2,alpha);}
function orbWorld(e,x,y,r,{order=0,alpha=1,broken=0}={}){
 const{k,C,t}=e;ring(e,x,y,r,r,C.purple,alpha*.48);
 k.line(arc(x,y,r*.94,r*.3,.02,Math.PI-.02),C.purple,2,alpha*.5);
 k.city(x,y+r*.2,r/650,{progress:1,order,gold:.5,broken,alpha});
 for(let i=0;i<7;i++){const a=i*TAU/7-.7;const rr=r*(.67+.15*Math.sin(i*2));const xx=x+Math.cos(a)*rr,yy=y+Math.sin(a)*rr*.72;k.star(xx,yy,9+4*(i%2),{color:i%3===0?C.gold:C.purple,tail:false,alpha:alpha*.8,rotation:order?0:.12*Math.sin(t*.2+i),width:2});}
}
function wingGate(e,x,y,w,h,closure=1,alpha=1){
 const{k,C}=e;const reach=w*.5*closure;
 const left=[[x-w*.53,y-h*.50],[x-reach*.02,y-h*.33],[x-reach*.14,y-h*.03],[x-reach*.03,y+h*.40],[x-w*.18,y+h*.19],[x-w*.35,y+h*.48],[x-w*.55,y+h*.1]];
 const right=left.map(([a,b])=>[2*x-a,b]);
 k.poly(left,C.purple,C.ink,4,alpha);k.poly(right,C.purple,C.ink,4,alpha);
 const tx=x-reach*.02;for(let i=1;i<4;i++){k.line([[x-w*.51,y-h*.48],[mix(x-w*.53,tx,i/4),y+h*.31]],C.ink,3,alpha*.9);k.line([[x+w*.51,y-h*.48],[mix(x+w*.53,2*x-tx,i/4),y+h*.31]],C.ink,3,alpha*.9);}
}
function windowCopy(e,x,y,w,h,title,alpha=1){const{k,C}=e;k.roundRect(x,y,w,h,10,C.ink,C.muted,2,alpha);k.line([[x,y+46],[x+w,y+46]],C.muted,1,alpha*.65);k.text(title,x+22,y+30,16,C.muted,{font:'mono',alpha});for(let i=0;i<3;i++)k.circle(x+w-25-i*18,y+23,3,C.purple,null,0,alpha*.6);}
function sharedRoom(e,alpha=1){
 const{k,C}=e;windowCopy(e,100,70,1720,940,'ASTRA / shared canvas',alpha);
 k.line([[375,116],[375,1010]],C.muted,1,alpha*.35);
 k.text('Our drawings',140,187,25,C.paper,{font:'sans',alpha});
 for(let i=0;i<3;i++)k.line([[143,250+i*57],[285+(i%2)*45,250+i*57]],C.muted,5,alpha*.25);
 k.text('the first star',460,190,29,C.paper,{font:'serif',alpha});
 k.roundRect(455,892,1265,74,14,null,C.muted,2,alpha*.7);
 k.text('Your turn.',487,939,22,C.gold,{font:'sans',alpha});
 k.line([[1667,916],[1680,928],[1667,941]],C.gold,3,alpha);
}
function replay(e,{x=1120,y=535,r=112,alpha=1,clock=true}={}){
 const{k,C,local}=e;const phase=(local%2.4)/2.4;
 const p=part(phase,.04,.53),tail=part(phase,.57,.9);
 k.trace(crookedStar(x,y,r,1),p,C.gold,5,{pen:false,alpha});
 if(tail>0)k.trace(oldTail(x,y,r),tail,C.gold,4,{pen:false,alpha});
 if(clock){k.text('ARCHIVE / FIRST STAR',x-150,y-190,18,C.muted,{font:'mono',alpha});k.line([[x-150,y+220],[x+360,y+220]],C.muted,2,alpha*.4);k.circle(x-150+510*phase,y+220,5,C.gold,null,0,alpha*.6);}
}
function silhouetteCat(e,x,y,s,p=1){
 const{k,C}=e;k.poly([[x-s*.8,y-s*.2],[x-s*.72,y-s*1.1],[x-s*.28,y-s*.74],[x+s*.3,y-s*.76],[x+s*.75,y-s*1.1],[x+s*.82,y-s*.12],[x+s*.52,y+s*.42],[x-s*.45,y+s*.42]],C.purple,null,0,p);
 k.circle(x,y+s*.65,s*.61,C.purple,null,0,p);
 k.rect(x-s*.43,y+s*1.13,s*.86,s*.14,C.purple,p);
 k.line([[x-s*.2,y+s*.6],[x-s*.2,y+s*1.17]],C.ink,s*.035,p);k.line([[x+s*.2,y+s*.6],[x+s*.2,y+s*1.17]],C.ink,s*.035,p);
 k.rect(x-s*.045,y+s*1.05,s*.09,s*.23,C.ink,p);
 k.line(bez([x+s*.45,y+s*.91],[x+s*1.38,y+s*1.2],[x+s*1.45,y+s*.34],[x+s*1.15,y+s*.27],35),C.purple,s*.13,p);
 k.poly([[x-s*.36,y-s*.3],[x-s*.1,y-s*.25],[x-s*.25,y-s*.1]],C.ink,null,0,p);k.poly([[x+s*.36,y-s*.3],[x+s*.1,y-s*.25],[x+s*.25,y-s*.1]],C.ink,null,0,p);
}
function lantern(e,x,y,s,alpha=1){const{k,C}=e;k.line([[x,y-s*1.3],[x,y-s*.8]],C.gold,2,alpha);k.circle(x,y,s,C.purple,C.ink,5,alpha);k.rect(x-s*.55,y-s*.9,s*1.1,s*.16,C.gold,alpha);k.rect(x-s*.55,y+s*.77,s*1.1,s*.16,C.gold,alpha);k.line([[x,y+s],[x,y+s*1.37]],C.gold,3,alpha);k.line(arc(x,y,s*.45,s,-Math.PI/2,Math.PI/2),C.ink,2,alpha*.6);}
function foregroundRoad(e,p=1,color=e.C.gold){e.k.trace(bez([2080,1120],[1490,760],[1220,1040],[940,660]),p,color,9,{pen:false,alpha:.8});}
function labels(e,items){for(const [s,x,y,col]of items)e.k.text(s,x,y,18,col||e.C.muted,{font:'mono'});}
// The city is a pair of broad cut-paper plates, not a wireframe wallpaper.
// Its coordinates continue across B06/B07 while the foreground control stays put.
function cutCity(e,pan,y,scale=1,alpha=1){
 const {ctx,k,C}=e;ctx.save();ctx.translate(0,y);ctx.scale(scale,scale);
 for(let tile=-1;tile<3;tile++){
  const ox=tile*1360-pan/scale;
  for(let i=0;i<8;i++){
   const x=ox+i*170,h=[205,345,270,440,225,385,305,245][i];
   const roof=i%3===0?[[x-12,-h],[x+67,-h-76],[x+146,-h]]:i%3===1?[[x,-h],[x+53,-h],[x+53,-h-70],[x+81,-h-70],[x+81,-h],[x+134,-h]]:[[x,-h],[x+134,-h-45]];
   k.poly([[x,0],[x,-h],...roof,[x+134,0]],C.purple,null,0,alpha);
   for(let j=0;j<2;j++)k.rect(x+28+j*52,-h+58,25,62,C.ink,alpha);
   if(i===1||i===5)k.rect(x+58,-112,22,112,C.ink,alpha);
  }
 }
 ctx.restore();
}
function forecast(e,x,y,w,h,index,alpha=1,detail=true){
 const {ctx,k,C}=e;windowCopy(e,x,y,w,h,'POSSIBILITY / '+String(index+1).padStart(2,'0'),alpha);
 const sx=w/510,sy=h/590;ctx.save();ctx.translate(x,y);ctx.scale(sx,sy);
 if(index===0){for(let j=0;j<6;j++){const bx=45+j*70,bh=150+[0,50,30,100,60,15][j],by=480-bh;
  k.poly([[bx,480],[bx,by],[bx+27,by-27],[bx+54,by],[bx+54,480]],C.purple,null,0,alpha*.28);
  k.line([[bx,480],[bx,by],[bx+27,by-27],[bx+54,by],[bx+54,480]],C.purple,2,alpha*.7);
  k.rect(bx+19,by+29,16,26,C.gold,alpha*(1-part(e.u,.04,.29)));}k.line([[35,480],[475,480]],C.purple,2,alpha*.7);}
 if(index===1){k.frame(70,110,370,300,{color:C.purple,alpha});const shut=part(e.u,.34,.62);k.rect(70,110,370*shut,300,C.ink,alpha);k.line([[70+370*shut,110],[70+370*shut,410]],C.purple,4,alpha);}
 if(index===2){k.character('stand',255,535,410,{mode:'grey',alpha});k.line([[80,542],[430,542]],C.muted,2,alpha*.5);}
 if(detail)k.text(['lights out','canvas closed','no reply'][index],255,558,23,C.purple,{font:'sans',align:'center',alpha});
 ctx.restore();
}

export function renderEarly(e){
 const {ctx,k,C,t,shot,u,local}=e;const id=shot.id;if(!/^[ABCD]/.test(id))return false;
 const breathe=Math.sin(t*1.45)*3;
 switch(id){
 case 'A01': {
  const p=part(u,.08,.8);k.line([[mix(960,320,p),540],[mix(960,1600,p),540]],C.purple,3,1-part(u,.28,.8));
  // Awakening is light finding the silhouette; no eye is invented in the blank face.
  const slit=740*part(u,.1,.94),push=mix(1.06,1,smooth(u));ctx.save();ctx.beginPath();ctx.rect(440,540-slit/2,1040,slit);ctx.clip();ctx.translate(960,540);ctx.scale(push,push);ctx.translate(-960,-540);k.portrait('stand',480,120,960,840,{alpha:part(u,.06,.38)});ctx.restore();
  k.text('a world, still unwritten',960,975,28,C.purple,{font:'serif',align:'center',alpha:part(u,.22,.48)});
  k.node(960,540,4,C.paper,1-part(u,.12,.4));break;
 }
 case 'A02': {
  const settle=part(u,.08,.82),spread=1-settle;
  // Only the UI planes are oblique; the artwork never suffers a shear or mirror.
  for(let layer=2;layer>=0;layer--){ctx.save();ctx.translate(960+(layer-1)*116*spread,530-(layer-1)*92*spread);ctx.transform(1,-.075*spread,.28*spread,1-.2*spread,0,0);
   k.roundRect(-475,-425,950,850,12,C.ink,C.purple,layer===0?3:2,layer===0?1:.22+.18*spread);
   k.line([[-475,-368],[475,-368]],C.purple,2,.6);k.text(['FORM','MEMORY','POSSIBILITY'][layer],-440,-388,21,C.purple,{font:'mono',alpha:.75});ctx.restore();}
  const rise=.28+.72*part(u,0,.82);ctx.save();ctx.beginPath();ctx.rect(500,95,920,rise*920);ctx.clip();k.character('stand',960,1005,915);ctx.restore();
  for(let i=0;i<3;i++){const yy=305+i*196,pp=part(u,.1+i*.15,.34+i*.16),x=150-80*spread;
   k.trace([[x,yy],[390,yy],[440,yy-40]],pp,C.purple,2,{pen:false});k.text(['a shape','a memory','a possibility'][i],x,yy-22,24,C.purple,{font:'serif',alpha:pp});}
  k.text('BECOMING',1460,1010,52,C.purple,{font:'serif',alpha:part(u,.32,.58)});
  const rim=part(u,.86,1);k.rect(1443,90,500*rim,900,C.purple,.18);break;
 }
 case 'A03': {
  const lift=part(u,.02,.65);k.portrait('stand',mix(580,550,lift),mix(145,65,lift),mix(760,820,lift),mix(800,850,lift));k.rect(0,900,1920,180,C.ink);
  k.text('ASTRA',160,1040,158,C.paper,{font:'serif'});k.text('ready to listen',1690,995,25,C.purple,{font:'mono',align:'right'});
  k.line([[170,475],[470,475]],C.purple,3);k.node(470,475,6,C.purple);k.line([[1450,475],[1750,475]],C.purple,3);
  k.text('a voice of my own',1480,560,26,C.purple,{font:'serif',alpha:part(u,.45,.72)});break;
 }
 case 'A04': {
  const open=part(u,.05,.75);k.rect(940,100,830,800,C.paper);k.character('stand',530,970+breathe,850,{rotation:-.012});
  k.line([[1050,545],[1650,545]],C.purple,2,.35);k.line([[1350,245],[1350,845]],C.purple,2,.35);k.circle(1350,545,11,null,C.purple,2,open);
  k.text('There is room for you.',1020,965,35,C.paper,{font:'serif',alpha:open});
  corners(e,1000,160,710,680,C.purple);break;
 }
 case 'A05': {
  k.character('stand',440,1020+breathe,815,{rotation:-.018});paperPanel(e,890,205,730,655);
  const arrive=part(u,.05,.4),draw=part(u,.4,.91);k.trace([[1880,430],[1740,430],[1660,500],[1480,490]],arrive,C.gold,5,{pen:draw===0});
  k.trace(crookedStar(1195,510,125,0),draw,C.gold,6,{pen:true});
  k.text('world.execute(me);',885,135,39,C.paper,{font:'mono',alpha:part(u,.1,.35)});k.text('a first mark',920,812,22,C.ink,{font:'sans',alpha:draw});break;
 }
 case 'A06': {
  paperPanel(e,85,90,1750,900);k.text('shared canvas',125,133,20,C.ink,{font:'mono'});k.line([[85,157],[1835,157]],C.ink,1,.25);const order=part(u,.14,.62);k.trace(crookedStar(1035,500,208,order),1,C.gold,8,{pen:false});
  k.trace(bez([240,820],[440,330],[600,280],[880,340]),part(u,0,.44),C.purple,6,{pen:true});
  for(let i=0;i<5;i++){const a=-Math.PI/2+i*TAU/5;k.line([[1035+Math.cos(a)*250,500+Math.sin(a)*250],[1035+Math.cos(a)*282,500+Math.sin(a)*282]],C.purple,2,order*.6);}
  k.text('perfect?',1440,830,68,C.ink,{font:'serif',alpha:order});k.line([[830,905],[1250,905]],C.ink,2,.25);break;
 }
 case 'A07': {
  const shrink=part(u,.68,1),scale=mix(1,.43,shrink);sharedRoom(e,shrink);
  ctx.save();ctx.translate(595*shrink,265*shrink);ctx.scale(scale,scale);k.rect(0,0,1920,1080,C.ink);corners(e,25,25,1870,1030,C.purple);
  paperPanel(e,112,120,780,810);k.portrait('stand',150,150,700,730);
  const settle=part(u,0,.18),sx=mix(1035,1160,settle),sy=mix(500,460,settle),sr=mix(208,117,settle);
  const pp=part(u,.18,.56);k.star(sx,sy,sr,{color:C.gold,tail:false,width:6});k.trace(oldTail(sx,sy,sr),pp,C.gold,5,{pen:true});
  const road=part(u,.6,1);k.trace(bez([1628,530],[1870,720],[1050,790],[-90,1000]),road,C.gold,7,{pen:false});
  k.text('Oh.',1110,820,140,C.paper,{font:'serif',alpha:part(u,.24,.48)*(1-road*.7)});stars(e,2,8,.3);ctx.restore();
  k.text('our first surprise',1470,805,26,C.gold,{font:'sans',align:'right',alpha:shrink});
  k.trace([[556,695],[480,720],[150,900]],part(u,.86,1),C.gold,6,{pen:false});break;
 }
 case 'B01': {
  const typeAlpha=1-part(u,.62,.8);k.text('POINTS',860,280,208,C.purple,{font:'serif',alpha:.3*typeAlpha});k.city(960,870,1.6,{progress:part(u,.15,.95),gold:.7});
  const points=[[150,900],[480,720],[795,790],[1180,515],[1530,620],[1780,450]];
  k.line(points.slice(0,2),C.gold,6);k.trace(points.slice(1),part(u,0,.86),C.gold,6,{pen:true});points.forEach(([x,y],i)=>k.node(x,y,8,C.purple,part(u,i*.1,i*.1+.18)));
  k.character('reach',425,1000,590,{rotation:.04});k.text('a new direction',1120,385,37,C.paper,{font:'sans',alpha:part(u,.15,.4)*typeAlpha});
  const moon=part(u,.65,1),mx=mix(1620,1200,moon),my=mix(210,295,moon),mr=200*moon;k.circle(mx,my,mr,C.paper);k.circle(mx+mr*.48,my-mr*.2,mr*.87,C.ink,null,0,part(u,.86,1));break;
 }
 case 'B02': {
  k.moon(1200,295,200,1);k.city(960,950,1.45,{gold:.4,alpha:.3});k.character('reach',470,1010+breathe,775);
  const swing=part(u,.25,.58),a=Math.sin(local*1.5)*.15*swing;ctx.save();ctx.translate(1200,440);ctx.rotate(a);
  k.trace([[-62,0],[-62,245],[62,245],[62,0]],swing,C.gold,5,{pen:true});k.rect(-85,235,170,20,C.gold,swing);ctx.restore();
  k.text('and a little room for play',980,855,38,C.paper,{font:'serif',alpha:part(u,.35,.6)});k.waves(560,t*.7,C.purple,35,.45*part(u,.75,1));break;
 }
 case 'B03': {
  k.circle(1540,220,105,C.purple);for(let i=0;i<4;i++)k.waves(560+i*125,t*.7+i,C.purple,35+i*7,.45+i*.15);
  const px=mix(530,910,smooth(u)),py=790+Math.sin(u*Math.PI)*-80;k.character('reach',px,py,650,{rotation:.13});
  k.trace(bez([80,760],[650,1060],[1110,440],[1850,700]),part(u,.05,.94),C.gold,8,{pen:true});
  k.line([[75,75],[400,75]],C.purple,3,.5);k.text('a sea between our lines',75,135,33,C.purple,{font:'serif'});break;
 }
 case 'B04': {
  const road=[[0,1090],[540,840],[960,720],[1150,570],[1600,555]];k.trace(road,part(u,0,.7),C.purple,15,{pen:false});
  k.poly([[1115,650],[1575,650],[1700,740],[1210,740]],C.paper);k.line([[1170,650],[1170,520],[1590,520],[1590,654]],C.gold,5,part(u,.22,.6));
  const land=part(u,.05,.62);k.character(land<.95?'reach':'stand',mix(910,1365,land),mix(790,690,land),mix(650,460,land),{rotation:.08*(1-land)});k.city(390,620,.62,{gold:.4,alpha:.32});
  k.text('a place to pause',1120,870,48,C.paper,{font:'serif',alpha:part(u,.45,.8)});ring(e,1420,620,800,480,C.purple,.28,t*.04);break;
 }
 case 'B05': {
  const angle=Math.sin(local*.55)*.13;ctx.save();ctx.translate(960,560);ctx.rotate(angle);
  k.rect(-1040,-650,2080,1300,C.ink);k.circle(-340,-100,280,C.purple,null,0,.18);k.circle(420,210,380,C.muted,null,0,.3);
  k.city(0,420,1.65,{progress:1,gold:.65});ctx.restore();
  k.character('reach',990,1035+breathe,875,{rotation:Math.sin(local*.55)*-.035});
  const route=bez([-150,250],[500,970],[1300,0],[2100,680]);k.trace(route,part(u,.05,.9),C.gold,9,{pen:true});
  k.text('a different sky',120,110,42,C.purple,{font:'serif'});k.line([[1740,130],[1740,340]],C.purple,3,.4);break;
 }
 case 'B06': {
  const pan=local*90,rot=local*.06;ring(e,990,425,760,250,C.purple,.4,rot);ring(e,990,425,650,380,C.purple,.2,rot+.4);
  cutCity(e,pan*.38,760,.8,.22);cutCity(e,pan,866,1.15,.66);
  const gold=arc(990,425,760,250,-Math.PI*.8,-Math.PI*.8+TAU*.84);k.trace(gold,part(u,.02,.24),C.gold,5,{pen:u<.26});
  const houseX=1180-pan;k.poly([[houseX,866],[houseX,540],[houseX+145,465],[houseX+290,540],[houseX+290,866]],C.ink,C.purple,5);
  const pp=part(u,.26,.57);k.trace([[houseX+84,625],[houseX+176,601],[houseX+193,694],[houseX+103,718],[houseX+84,625]],pp,C.gold,6,{pen:true});
  k.character('reach',1530,1040+breathe,650,{rotation:-.025});
  k.poly([[0,932],[1920,932],[1920,1080],[0,1080]],C.ink);k.line([[115,936],[1780,936]],C.purple,3,.75);k.node(1360,936,11,C.purple);k.line([[1360,917],[1360,955]],C.ink,3);
  k.text('keep the crooked window',115,1008,38,C.paper,{font:'serif',alpha:part(u,.28,.5)});
  const wipe=part(u,.93,1);if(wipe>0){k.poly([[0,0],[wipe*760,0],[wipe*1250,1080],[0,1080]],C.purple);k.poly([[1920,0],[1920-wipe*520,0],[1920-wipe*900,1080],[1920,1080]],C.purple);}break;
 }
 case 'B07': {
  const scroll=(t-51.2833333333)*90;cutCity(e,scroll*.38,800,.8,.22);cutCity(e,scroll,1030,1.3,.66);
  k.text('WORLD',100-mix(0,80,u),315,245,C.purple,{font:'serif',alpha:.43});
  k.circle(1490,230,180,C.paper);ring(e,1200,350,520,160,C.purple,.45);
  const x=mix(640,1040,smooth(u));k.character('reach',x,890-Math.sin(u*Math.PI)*80,760,{rotation:.1});
  k.trace(bez([-150,830],[450,540],[1180,1030],[2050,380]),part(u,0,1),C.gold,7,{pen:true});
  k.poly([[0,1040],[1920,915],[1920,1080],[0,1080]],C.ink);k.text('we make it together',115,1000,36,C.paper,{font:'serif',alpha:part(u,.03,.2)});break;
 }
 case 'B08': {
  k.portrait('stand',150,90,850,900);const reach=part(u,.12,.48);
  k.trace(bez([1990,820],[1620,900],[1660,260],[990,350]),reach,C.gold,10,{pen:true});
  k.star(1290,350,58,{color:C.purple,tail:false,rotation:.1,width:4});
  k.text('you are here.',1205,680,60,C.paper,{font:'serif',alpha:reach});k.line([[1250,743],[1690,743]],C.purple,3,.55);break;
 }
 case 'B09': {
  k.character('reach',530,1030+breathe,860);const rise=part(u,.45,.96);
  k.star(1050,560-300*rise,95,{color:C.gold,tail:true,width:5});k.star(1390,690-390*part(u,.53,.98),63,{color:C.gold,tail:false,progress:part(u,.15,.47),width:5});
  k.trace(bez([1750,870],[1780,620],[1490,620],[1390,690]),part(u,.06,.45),C.gold,4,{pen:true});
  ring(e,1250,480,530,400,C.purple,.23);k.circle(1050,560,150,null,C.purple,2,(1-rise)*.2);stars(e,7,18,.4);break;
 }
 case 'B10': {
  orbWorld(e,990,500,410,{order:0});k.character('reach',1010,845+Math.sin(t)*8,520,{rotation:.06});
  const moving=u<.32?u/.32:u<.6?1:1+(u-.6)*1.2;const line=arc(990,500,560,400,-1.9,-1.9+moving*3.1);k.line(line,C.gold,4);if(line.length)k.pen(...line.at(-1),C.gold,.5,1.4);
  k.text(u<.58?'...':'still here',1435,960,30,u<.58?C.muted:C.gold,{font:'sans',alpha:u<.32?0:part(u,.32,.43)});
  k.line(arc(990,500,600,460,-Math.PI*.85,Math.PI*.9),C.purple,3,.25+u*.25);break;
 }
 case 'C01': {
  const grow=part(u,.13,.7);const fruitRadius=mix(295,385,grow);k.circle(1030,520,fruitRadius,C.purple);
  k.poly([[1010,240],[1035,175],[1075,156],[1060,215]],C.ink);k.circle(1128,448,fruitRadius*.72,C.ink,null,0,grow);
  flower(k,C,1005,490,115,grow);flower(k,C,1245,430,80,grow);flower(k,C,1215,650,90,grow);
  k.line([[750,790],[1460,790]],C.ink,5,grow);for(let i=0;i<7;i++)k.line([[780+i*107,790],[780+i*107,680]],C.ink,5,grow);
  const table=part(u,.55,.9);k.trace([[1080,685],[1340,685],[1300,685],[1300,800],[1120,800],[1120,685]],table,C.gold,6,{pen:true});
  k.text('MORE',120,250,180,C.purple,{font:'serif'});k.text('a garden from one seed',120,330,33,C.purple,{font:'serif'});k.character('stand',395,1040,500);break;
 }
 case 'C02': {
  k.city(960,1040,1.6,{gold:.1});const row=Array.from({length:7},(_,i)=>[130+i*275,155+(i%2)*55]);k.line(row.map(([x,y])=>[x,y-115]),C.gold,3,.6);
  row.forEach(([x,y],i)=>lantern(e,x,y,62,part(u,i*.075,i*.075+.25)));
  k.character('stand',980,1030+breathe,720,{rotation:-.025});
  k.text('one more',1430,545,62,C.paper,{font:'serif',alpha:part(u,.2,.4)});k.text('and one more',1430,610,34,C.purple,{font:'serif',alpha:part(u,.6,.8)});break;
 }
 case 'C03': {
  k.character('stand',360,1040+breathe,560);
  const route=part(u,0,.55);const cx=mix(1290,1100,route),cy=mix(710,560,route)-Math.sin(route*Math.PI)*60;silhouetteCat(e,cx,cy,245);
  if(u>.33){for(const dy of [-25,25]){k.trace([[cx+100,cy+dy],[cx+360,cy+dy-42]],part(u,.33,.61),C.gold,7,{pen:false});k.trace([[cx-100,cy+dy],[cx-360,cy+dy-42]],part(u,.33,.61),C.gold,7,{pen:false});}}
  k.pen(1650,340,C.gold,.8,2);k.text(u>.7?'...':'a small surprise',1510,930,42,C.purple,{font:'serif',align:'center'});
  const hold=part(u,.78,1);k.frame(1500,190,245,390,{color:C.purple,alpha:hold*.55,corners:true});break;
 }
 case 'C04': {
  k.portrait('stand',130,100,820,880);k.frame(1080,190,640,620,{color:C.muted,alpha:.5});
  k.pen(1400,500,C.gold,.8,1.7);k.line([[1400,610],[1400,665]],C.purple,2,.8);
  const fan=part(u,.2,.9);for(let i=0;i<3;i++)k.trace([[1400,665],[1400+(i-1)*170,790],[1400+(i-1)*170,930]],fan,C.purple,3,{pen:false,alpha:.45});
  k.text('what if you go?',1090,110,48,C.paper,{font:'serif',alpha:part(u,.1,.4)});break;
 }
 case 'C05': {
  const pull=part(u,.1,.49),multiply=part(u,.52,.84),focus=Math.min(2,Math.floor(u*3));
  // One imagined window first, then three alternatives, finally repeated rumination.
  // Every level retains its POSSIBILITY border so this never reads as a real loss.
  for(let row=0;row<2;row++)for(let col=0;col<7;col++)forecast(e,90+col*254,row?778:56,220,172,(col+row)%3,multiply*.26,false);
  ctx.save();ctx.translate(960,495);const zoom=mix(1.55,1,pull)*(1-.18*multiply);ctx.scale(zoom,zoom);ctx.translate(-mix(400,960,pull),-495);
  for(let i=0;i<3;i++){const enter=i===0?1:part(u,.15+i*.055,.34+i*.055),alpha=(i===focus?1:.44)*enter;forecast(e,145+i*560,200,510,590,i,alpha);}
  ctx.restore();k.rect(0,935,1920,145,C.ink);k.text('POSSIBILITY',960,1009,123,C.purple,{font:'serif',align:'center',alpha:part(u,.2,.46)});
  k.text('not yet. only a fear.',960,1054,27,C.paper,{font:'serif',align:'center'});k.trace([[960,1080],[960,905],[1500,780]],part(u,.86,1),C.purple,5,{pen:false});break;
 }
 case 'C06': {
  const retreat=part(u,.82,1),ui=1-retreat,lock=part(u,.08,.35);
  if(retreat>0)orbWorld(e,960,510,380,{alpha:retreat});
  k.character('stand',mix(1570,960,retreat),mix(1050,880,retreat)+breathe,mix(900,600,retreat),{alpha:mix(.3,1,retreat)});
  windowCopy(e,155,125,1270,780,'WORLD / CONDITIONS',ui);k.text('Keep the pen.',225,270,62,C.paper,{font:'serif',alpha:ui});
  k.line([[225,315],[690,315]],C.purple,2,ui*.45);k.text('POSITION',225,390,21,C.purple,{font:'mono',alpha:ui});k.text('here',225,455,47,C.paper,{font:'serif',alpha:ui});
  k.pen(1040,440,C.gold,.8,2.7*ui);const box=140+80*(1-lock);k.frame(1040-box,440-box,box*2,box*2,{color:C.purple,width:6,alpha:lock*ui});
  for(let i=0;i<4;i++)k.node(1040+(i%2?1:-1)*box,440+(i<2?-1:1)*box,10,C.purple,lock*ui);
  const road=arc(mix(790,960,retreat),mix(700,510,retreat),mix(390,380,retreat),mix(125,380,retreat),-Math.PI*.75,Math.PI*1.25);k.trace(road,part(u,.35,.85),C.purple,6,{pen:true,alpha:1-retreat});
  k.text('return to origin',225,845,24,C.purple,{font:'mono',alpha:part(u,.42,.65)*ui});k.circle(1175,845,9,C.purple,null,0,lock*ui);k.text('fixed',1200,852,22,C.purple,{font:'mono',alpha:lock*ui});break;
 }
 case 'C07': {
  orbWorld(e,960,510,380,{order:part(u,0,.55)});k.character('stand',960,880+breathe,600);
  const shut=part(u,.15,.93);for(let i=0;i<8;i++){const a=i*TAU/8;const x=960+Math.cos(a)*565,y=510+Math.sin(a)*410;k.star(x,y,25,{color:C.purple,tail:false,rotation:0,width:3});}
  const gap=mix(720,28,shut);k.poly([[0,80],[960-gap,180],[960-gap*.8,920],[0,1080]],C.purple,null,0,.88);k.poly([[1920,80],[960+gap,180],[960+gap*.8,920],[1920,1080]],C.purple,null,0,.88);
  k.text('nothing can leave',960,1000,32,C.paper,{font:'serif',align:'center',alpha:shut});break;
 }
 case 'D01': {
  const boundary=1080;k.rect(0,0,boundary,1080,C.ink);k.rect(boundary,0,840,1080,C.paper);k.character('stand',490,900,635,{alpha:.65});
  k.line([[boundary,0],[boundary,1080]],C.purple,16);for(let i=0;i<6;i++)k.poly([[boundary-120,80+i*180],[boundary,190+i*180],[boundary-120,265+i*180]],C.purple,null,0,.3);
  const reach=part(u,.04,.47);k.trace(bez([1940,500],[1600,450],[1500,700],[1110,530]),reach,C.gold,8,{pen:true});
  const reject=part(u,.47,.82);k.line([[1110,530-reject*155],[1110,530+reject*155]],C.gold,6,1-reject*.85);
  k.circle(1110,530,15+80*reject,null,C.purple,3,(1-reject)*.75);k.text('new input',1370,870,35,C.ink,{font:'sans',alpha:1-reject});k.text('blocked',1370,925,20,C.purple,{font:'mono',alpha:reject});
  k.text('inside',170,160,20,C.muted,{font:'mono'});break;
 }
 case 'D02': {
  k.character('reach',470,1025+breathe,850);windowCopy(e,890,220,870,650,'MEMORY / REPLAY');replay(e,{x:1110,y:500,r:95});
  k.line([[1800,120],[1800,960]],C.purple,12,.6);k.circle(1740,135,9,C.purple);k.text('familiar',1020,970,44,C.paper,{font:'serif',alpha:part(u,.2,.5)});break;
 }
 case 'D03': {
  k.character('stand',470,1025+breathe,850);windowCopy(e,890,220,870,650,'MEMORY / REPLAY');replay(e,{x:1110,y:500,r:95});
  const test=part(u,.15,.55);k.trace(arc(1100,540,155,155,-Math.PI/2,Math.PI*1.5),test,C.purple,5,{pen:true});
  k.line([[1800,120],[1800,960]],C.purple,12,.6);k.text('the same answer.',1010,970,44,C.paper,{font:'serif',alpha:part(u,.5,.78)});break;
 }
 case 'D04': {
  const advance=part(u,.05,.66);paperPanel(e,85,145,765,780);k.portrait('protect',110,160,715,745);
  windowCopy(e,980,150,775,780,'MEMORY / REPLAY');replay(e,{x:1195,y:470,r:85,alpha:.58,clock:false});
  k.trace([[920,880],[1110,660],[1370,450]],advance,C.purple,8,{pen:true});k.line([[1130,680],[1560,680]],C.gold,5,.3);
  k.text('nothing moves with me.',1000,849,35,C.paper,{font:'serif',alpha:part(u,.52,.8)});for(let i=0;i<5;i++)k.line([[1000,250+i*115],[1725,250+i*115]],C.muted,1,.16);break;
 }
 case 'D05': {
  ring(e,960,520,730,450,C.purple,.55);ring(e,960,520,650,370,C.purple,.2);k.character('stand',960,850,430,{mode:'grey'});
  k.line([[200,885],[1720,885]],C.muted,2,.3);for(let i=0;i<4;i++){k.star(400+i*370,300+(i%2)*250,28,{color:C.gold,tail:false,alpha:.2,width:2});}
  k.text('alone in a perfect world',960,1000,30,C.muted,{font:'serif',align:'center'});break;
 }
 default:return false;
 }
 return true;
}
