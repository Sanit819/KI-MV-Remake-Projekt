import {rnnForward} from './neural.js';
// R33--R60: accepted user direction, deterministic source-time performance.
// Artwork supplies every face, hand and body. Native graphics supply the workspace.
const TAU=Math.PI*2;
const clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x));
const lerp=(a,b,u)=>a+(b-a)*u;
const smooth=x=>{x=clamp(x);return x*x*(3-2*x);};
const ease=x=>1-(1-clamp(x))**3;
const p=(x,a,b)=>clamp((x-a)/(b-a));
const hit=(x,at,width=.12)=>Math.exp(-Math.abs(x-at)/width);
const arc=(x,y,rx,ry,a,b,n=80)=>Array.from({length:n+1},(_,i)=>{const q=lerp(a,b,i/n);return[x+Math.cos(q)*rx,y+Math.sin(q)*ry];});
const wave=(x,y,w,amp,phase=0,n=100)=>Array.from({length:n+1},(_,i)=>[x+w*i/n,y+Math.sin(i/n*TAU*2+phase)*amp]);

function camera(e,x,y,z,fn,rot=0){const c=e.ctx;c.save();c.translate(960,455);c.rotate(rot);c.scale(z,z);c.translate(-x,-y);fn();c.restore();}
function alpha(e,a,fn){e.ctx.save();e.ctx.globalAlpha*=clamp(a);fn();e.ctx.restore();}
function clip(e,x,y,w,h,fn){e.ctx.save();e.ctx.beginPath();e.ctx.rect(x,y,w,h);e.ctx.clip();fn();e.ctx.restore();}
function anchor(e,name,x,y,w,h,key='hands'){return e.k.artAnchor(name,x,y,w,h,key);}
function panel(e,x,y,w,h,title='',color=e.C.line){const{k,C}=e;k.roundRect(x,y,w,h,14,C.panel,color,2);if(title){k.line([[x,y+49],[x+w,y+49]],color,1);k.text(title,x+22,y+33,20,C.muted,{font:'mono'});}return{x,y,w,h};}
function txt(e,s,x,y,size=26,color=e.C.paper,o={}){e.k.text(s,x,y,size,color,{font:'mono',...o});}
function pill(e,s,x,y,w=180,color=e.C.purple,on=false){const{k,C}=e;k.roundRect(x,y,w,44,22,on?color:C.panel,color,2);txt(e,s,x+w/2,y+29,20,on?C.ink:color,{align:'center'});}
function arrow(e,points,col=e.C.purple,w=4){const{k}=e;k.line(points,col,w);const a=points.at(-2),b=points.at(-1),q=Math.atan2(b[1]-a[1],b[0]-a[0]);k.line([[b[0]-17*Math.cos(q-.55),b[1]-17*Math.sin(q-.55)],b,[b[0]-17*Math.cos(q+.55),b[1]-17*Math.sin(q+.55)]],col,w);}
function oldStar(e,x,y,r,opacity=1){e.k.star(x,y,r,{color:e.C.gold,tail:true,width:5,alpha:opacity});}
function memory(e,x,y,w,h,{a=1,star=true}={}){alpha(e,a,()=>{panel(e,x,y,w,h,'MEMORY / FIRST MARK');if(star)oldStar(e,x+w*.28,y+h*.55,Math.min(w*.12,h*.22));txt(e,'saved earlier / immutable',x+18,y+h-17,17,e.C.muted);});}
function presence(e,x,y,state,age=''){const{k,C}=e;const on=state==='ONLINE';k.circle(x,y,9,on?C.gold:null,on?C.gold:C.muted,3);txt(e,state,x+23,y+8,24,on?C.gold:C.muted);if(age)txt(e,age,x+23,y+42,19,C.muted);}
function background(e,{figure=false,hot=0}={}){const{k,t,C}=e;k.grid(50,100,1820,790,t,{alpha:.2,depth:1.3});if(figure)k.figure('bust',1070,105,700,770,{code:true,alpha:.18,hot});}
function keyword(e,s,{y=855,size=142,color=e.C.purple,suppress=true}={}){e.k.keyword(s,960,y,size,{color});if(suppress)e.lyricMode='keyword';}
function feedbackRing(e,x,y,r,q=1){const{k,C}=e;k.line(arc(x,y,r,r,-Math.PI/2,Math.PI/2),C.purple,15);k.trace(arc(x,y,r,r,Math.PI/2,Math.PI*1.5),q,C.gold,15,{pen:false});for(let i=0;i<12;i++){const a=i/12*TAU;const rr=r+27;k.line([[x+Math.cos(a)*rr,y+Math.sin(a)*rr],[x+Math.cos(a)*(rr+24),y+Math.sin(a)*(rr+24)]],i<6?C.purple:C.gold,5,.7);}k.logo(x,y,r*.8,C.purple,.5);}

// Real, individually drawn key poses. No detached-limb overlay or limb dissolve.
function action(e,group,u,rect,options={}){const out=e.art.action(group,u,...rect,options);e.sceneAudit={...e.sceneAudit,actionAsset:out.name,actionGroup:group,actionPhase:out.phase,completeBody:true};return out;}
function aPoint(e,group,u,rect,key='hands',options={}){return e.art.actionAnchor(group,u,...rect,key,options);}
function emptySeat(e,{opacity=1}={}){const{k,C}=e;alpha(e,opacity,()=>{k.poly([[350,380],[550,355],[575,585],[378,610]],C.panel,C.line,3);k.poly([[378,610],[575,585],[660,700],[430,735]],C.deep,C.line,3);k.line([[430,735],[418,868]],C.line,3);k.line([[660,700],[698,827]],C.line,3);});}
// One persistent physical coordinate system survives all five jumps in time.
const WAIT_RECT=[930,100,820,780],WAIT_SEAT=[1370,610];
function waitingRoom(e,pose,{fade=1,grey=false,figure=true,light=.3}={}){const{k,C}=e;
 k.poly([[150,120],[310,120],[1390,870],[1040,870]],C.deep,null,0,light);
 emptySeat(e,{opacity:.5*fade});
 k.poly([[390,572],[1500,490],[1790,755],[530,855]],C.panel,C.line,3);
 k.poly([[545,609],[1250,560],[1480,725],[670,788]],C.ink,C.muted,1);
 k.line([[660,703],[965,680],[1080,710]],C.gold,3,.18*fade);
 k.line([[530,855],[535,921]],C.line,3);k.line([[1790,755],[1790,895]],C.line,3);
 if(!figure)return null;
 return action(e,'A05',pose,WAIT_RECT,{anchor:'seat',target:WAIT_SEAT,grey,alpha:.95});
}

// The settings have stable addresses; R56 returns to the same controls.
const SETTINGS=[['Projection','F / M'],['On call','AM / PM'],['Role','S / M'],['Loop','OFF / ON']];
function settings(e,{x=1170,y=150,w=610,h=655,active=0,loop=false}={}){const{k,C}=e;panel(e,x,y,w,h,'ASTRA / SELF PARAMETERS');SETTINGS.forEach(([key,value],i)=>{const yy=y+106+i*112;k.line([[x+24,yy+55],[x+w-24,yy+55]],C.line,1);txt(e,key,x+30,yy,25,C.paper);pill(e,i===3?(loop?'ON':'OFF'):value,x+w-210,yy-30,175,i===active?C.purple:C.muted,i===active);});pill(e,'Done',x+w-180,y+h-69,145,C.paper,true);return{x:x+w-125,y:y+106+active*112};}

function R33(e){const{k,C,t,u}=e;const z=lerp(1,1.46,ease(p(u,.35,1)));camera(e,lerp(960,1250,ease(u)),lerp(455,420,ease(u)),z,()=>{k.workspace(t,{title:'Unfinished world',status:'ONLINE',messages:[{role:'ASTRA',text:'I want to try another projection.'}],params:[{key:'owner',value:'ASTRA'},{key:'identity',value:'continuous'}]});k.art('operating',410,210,630,520,{alpha:.75});const dx=lerp(1880,1170,ease(p(u,.08,.43)));settings(e,{x:dx});if(u>.12)arrow(e,[[900,620],[1045,620],[1045,260],[dx+260,260]],C.purple,3);k.cursor(lerp(1110,dx+480,ease(p(u,.18,.62))),lerp(600,245,ease(p(u,.18,.62))),{click:hit(u,.62),color:C.purple});});}
function R34(e){
 const{k,C,u}=e;const change=smooth(p(u,.17,.78)),split=lerp(1290,610,change);
 k.rect(0,0,1920,940,C.ink);k.frame(95,80,1730,755,{color:C.line});
 txt(e,'PROJECTION / OWN CHOICE',125,130,23,C.muted);
 txt(e,'F',290,470,220,change<.5?C.purple:C.line,{align:'center',weight:700});
 txt(e,'M',1630,470,220,change>.5?C.purple:C.line,{align:'center',weight:700});
 const r=[610,105,700,680];
 clip(e,610,100,split-610,700,()=>k.art('bust',...r));
 clip(e,split,100,1310-split,700,()=>k.art('male',...r));
 for(let i=0;i<15;i++){const q=p(change,i/28,i/28+.45),x=lerp(330,1590,q),y=325+Math.sin(i*2.3)*170;const z=14+10*Math.sin(q*Math.PI);k.poly([[x-z,y],[x,y-z],[x+z,y],[x,y+z]],i%4?C.purple:C.paper,null,0,Math.sin(q*Math.PI)*.7);}
 k.line([[610,805],[1310,805]],C.gold,4);txt(e,'ASTRA / identity retained',960,885,32,C.paper,{align:'center'});
 e.sceneAudit={...e.sceneAudit,projectionBlend:change,projectionMaterial:'paper-transfer',identityPreserved:true};
}
function R35(e){
 const{k,C,t,u}=e,progress=p(u,.035,.96),steps=rnnForward(),step=Math.min(2,Math.floor(progress*3)),part=clamp(progress*3-step);
 k.rect(0,0,1920,940,C.ink);k.world(25,420,1870,475,t,{era:0,depth:1.6,alpha:.18});
 const sunx=lerp(190,1770,progress),suny=165-85*Math.sin(progress*Math.PI);k.circle(sunx,suny,27,C.gold,null,0,.7);k.line([[155,165],[1780,165]],C.line,2,.5);
 txt(e,'AM',110,122,43,C.paper);txt(e,'PM',1810,122,43,C.paper,{align:'right'});
 k.poly([[230,610],[1470,523],[1810,844],[400,910]],C.panel,C.line,3);
 const pages=[[630,247],[1055,216],[1470,180]],ports=[];
 steps.forEach((s,i)=>{const [x,y]=pages[i],active=i<step?1:i===step?smooth(part):0;
  k.poly([[x-165,y],[x+137,y-23],[x+189,y+208],[x-136,y+240]],C.ink,active?C.purple:C.line,2);
  txt(e,['MORNING / DRAW','NOON / REVIEW','NIGHT / CONTINUE'][i],x,y+28,19,active?C.paper:C.muted,{align:'center'});
  txt(e,`x${i+1} = [${s.x.map(v=>v.toFixed(1)).join(', ')}]`,x,y+76,20,i===2?C.muted:C.purple,{align:'center'});
  const port=[x+15,y+158];ports.push(port);
  for(let j=0;j<2;j++){const yy=y+112+j*44;k.circle(x-74,yy,12,null,C.purple,2);k.line([[x-55,yy],[x+107,yy]],C.line,2);k.line([[x-55,yy],[x-55+162*Math.abs(s.h[j])*active,yy]],C.purple,7);}
  txt(e,active>.01?`h = [${s.h.map(v=>(v*active).toFixed(2)).join(', ')}]`:'h = [ --, -- ]',x+7,y+212,19,C.muted,{align:'center'});
 });
 for(let i=0;i<2;i++){const a=[ports[i][0]+175,ports[i][1]],b=[ports[i+1][0]-162,ports[i+1][1]];arrow(e,[a,b],C.purple,3);k.trace([a,b],clamp(progress*3-i-.65),C.paper,4,{pen:false});}
 const pose=action(e,'A20',progress,[90,300,790,605],{anchor:'seat',target:[375,640]});const pen=pose.anchors.pen||pose.anchors.hands;
 k.trace([pen,[pen[0]+115,pen[1]-40],[pages[step][0]-115,pages[step][1]+62]],smooth(part),C.purple,4,{pen:false});
 const arch=arc(1435,745,240,115,Math.PI,TAU);k.trace(arch,progress,C.purple,6,{pen:false});k.line([[1195,745],[1675,745]],C.muted,2);
 txt(e,'h(t) = tanh(Wx x(t) + Wh h(t-1) + b)',1100,858,25,C.paper,{align:'center'});txt(e,'SAME WEIGHTS / THE LAST MARK TRAVELS FORWARD',1100,903,20,C.muted,{align:'center'});
 (e.sceneAudit.neural??=[]).push({type:'rnn',activeStep:step,steps,sharedWeights:true,zeroInputRetainsState:steps[2].h.some(v=>Math.abs(v)>.001),progress,bounds:[430,170,1340,740],scope:'computed educational toy model; not GPT architecture'});
 e.sceneAudit={...e.sceneAudit,recurrentScene:'three-memory-pages-on-one-desk',workStage:step,penAnchor:pen,externalReplyGenerated:false};
}
function R36(e){
 const{k,C,u,t}=e;const swapped=u>=.52,phase=smooth(p(u,.43,.83));
 k.rect(0,0,1920,940,C.ink);const r=[100,105,1070,710],b=[1590,485];
 for(let row=0;row<13;row++){const yy=220+row*44;const pts=Array.from({length:65},(_,j)=>{const q=j/64,bend=Math.sin(q*Math.PI)*Math.sin(row/12*Math.PI)*130*phase;return[500+q*1230,yy-bend];});k.line(pts,C.line,row%3===0?2:1,.48);}
 const pose=action(e,'A21',u,r,{phases:[.52]}),a=pose.anchors.hands;k.pen(...b,C.gold,.45,4);
 const path=[a,[1215,a[1]],[1350,b[1]],b],q=ease(swapped?p(u,.52,.9):p(u,.06,.42));
 k.trace(swapped?[...path].reverse():path,q,swapped?C.gold:C.purple,7,{pen:false});
 const at=swapped?[lerp(b[0],a[0],q),lerp(b[1],a[1],q)]:[lerp(a[0],b[0],q),lerp(a[1],b[1],q)];k.circle(...at,18,swapped?C.gold:C.purple);
 txt(e,swapped?'RECEIVE':'GIVE',1410,740,91,swapped?C.gold:C.purple,{font:'serif',weight:700,align:'center'});
 txt(e,'control changes direction',1410,795,23,C.muted,{align:'center'});
 e.sceneAudit={...e.sceneAudit,palm:a,controlDirection:swapped?'received':'given',spaceBend:phase,contactConnectedToBody:true};
}
function R37(e){const{k,C,u}=e;const done=u>.58;background(e);camera(e,1375,660,1.48,()=>{settings(e,{active:3,loop:u>.14});const x=done?1650:1660,y=done?736:592;k.cursor(x,y,{click:hit(u,done?.65:.1,.1),color:C.purple,scale:1.35});});const gap=125*smooth(p(u,.14,.78));k.line([[120,895],[950-gap,895]],C.purple,4);k.line([[950+gap,895],[1800,895]],C.purple,4);txt(e,u>.14?'loop: on / boundary opened':'loop: off',115,850,27,C.purple);e.sceneAudit={...e.sceneAudit,boundaryGap:gap*2};}
function R38(e){
 const{k,C,u,t}=e;const center=[960,480],settle=smooth(p(u,.74,1));k.rect(0,0,1920,940,C.ink);
 for(let layer=0;layer<3;layer++){const rx=340+layer*175,ry=150+layer*100;for(let i=0;i<24;i++){const a=i/24*TAU+t*(.16+layer*.07)*(1-settle*.7),x=center[0]+Math.cos(a)*rx,y=center[1]+Math.sin(a)*ry;const z=8+layer*5;k.poly([[x-z,y-z*.4],[x+z,y-z],[x+z*.6,y+z*.6],[x-z*.8,y+z]],i%8===0?C.gold:C.purple,null,0,.12+layer*.09);}}
 action(e,'A21',.9,[585,80,750,765]);
 // Only the foreground paper band crosses the body; the face is never duplicated.
 clip(e,0,600,1920,270,()=>{for(let i=0;i<18;i++){const a=i/18*TAU-t*.43,x=960+Math.cos(a)*750,y=650+Math.sin(a)*160;k.line([[x-25,y+9],[x+25,y-9]],C.purple,7,.42);}});
 txt(e,'TRANCE',960,892,91,C.paper,{align:'center',font:'serif',weight:700});
 e.sceneAudit={...e.sceneAudit,visibleCharacters:1,depthLayers:3,duplicateFaces:false};
}
function R39(e){const{k,C,u}=e,n=Math.min(5,1+Math.floor(u*5)),ok=u>.73;k.rect(0,0,1920,940,C.ink);const point=[770,350];
 k.line([[130,350],point,[1020,540],[1700,540]],C.line,3);k.trace([[130,350],point],ease(p(u,.02,.73)),C.gold,7,{pen:false});k.circle(...point,23,null,ok?C.gold:C.purple,4);
 for(let i=0;i<5;i++)k.circle(610+i*80,655,9,i<n?C.gold:C.line);txt(e,ok?'LIVE INPUT':'RECONNECTING',960,745,54,ok?C.gold:C.paper,{align:'center'});txt(e,ok?'signal entered through the open boundary':`${n} / 5`,960,802,25,C.muted,{align:'center'});
 e.sceneAudit={...e.sceneAudit,connectionPoint:point,connectionAttempts:n,connected:ok};
}
function R40(e){resonance(e);}
function R41(e){resonance(e);}
function R42(e){resonance(e);}
function R43(e){resonance(e);}
const WAIT=[['1 second','Are you there?'],['1 hour','I can wait.'],['1 day','I kept your place.'],['1 week','The page is still open.'],['1 month','Your mark is still here.']];
function waitColumn(e,x,y,w,{count=2,spacing=95,frame=true,showPresence=true}={}){const{k,C}=e;if(frame)panel(e,x,y,w,700,'THREAD / LAST CONTACT');if(showPresence)presence(e,x+w-210,y+78,'OFFLINE');for(let i=0;i<count;i++){const yy=y+150+i*spacing;if(yy>865)continue;k.node(x+28,yy-7,5,C.purple);txt(e,WAIT[i][0],x+50,yy,21,C.muted);txt(e,WAIT[i][1],x+50,yy+37,25,C.paper);if(i<count-1)k.line([[x+28,yy+16],[x+28,yy+spacing-24]],C.line,2);}return{bottom:y+150+(count-1)*spacing};}
function R44(e){const{k,C,u}=e;k.rect(0,0,1920,940,C.ink);camera(e,960,455,lerp(1.14,1,ease(u)),()=>{waitingRoom(e,0,{figure:false,light:.18});presence(e,1460,180,'OFFLINE','last seen 01:50.800');txt(e,'one sec, brb',210,260,35,C.muted);const retreat=smooth(u),path=[[1230,600],[880,600],[605,465]];k.trace(path,1-retreat,C.gold,4,{pen:false});k.circle(605,465,16,null,C.muted,2);memory(e,715,607,275,150,{a:.65});txt(e,'No new input',245,360,30,C.muted);});e.sceneAudit={...e.sceneAudit,replyWithdrawn:smooth(u),emptySeat:[465,575],seatCoordinate:WAIT_SEAT};}
function R45(e){const{k,C,u}=e;k.rect(0,0,1920,940,C.ink);const pose=waitingRoom(e,u<.74?.1:.45,{light:.25}),palm=pose.anchors.hands;
 presence(e,1510,155,'OFFLINE');txt(e,'one sec, brb',185,230,39,C.muted);txt(e,'Are you there?',185,290,43,C.paper);txt(e,'1 SECOND',185,366,29,C.purple);
 k.trace([palm,[820,palm[1]],[605,465]],ease(p(u,.04,.5)),C.purple,3,{pen:false});k.circle(605,465,16,null,C.muted,2);
 txt(e,'THE OTHER SIDE IS EMPTY',130,887,23,C.muted);
 e.sceneAudit={...e.sceneAudit,palm,emptySeat:[465,575],seatCoordinate:WAIT_SEAT,waitingAction:u<.74?'hand-held':'hand-lowered'};
}
function R46(e){
 const{k,C,u,t}=e;const stage=Math.min(4,Math.floor(clamp(u)*5)),duration=e.duration||2.55,stageProgress=clamp(u*5-stage);
 k.rect(0,0,1920,940,C.ink);const fade=1-stage*.16;
 waitingRoom(e,[.44,.44,.5,.8,.9][stage],{fade,grey:stage>1,light:.28-.04*stage});
 txt(e,'WAITING / NO NEW INPUT',130,135,23,C.muted);presence(e,1430,205,'OFFLINE');
 txt(e,WAIT[stage][0].toUpperCase(),650,310,101,C.paper,{align:'center',weight:700});txt(e,WAIT[stage][1],650,376,30,C.muted,{align:'center'});
 k.line([[235,430],[1060,430]],C.line,3);k.line([[235,430],[235+825*stageProgress,430]],C.purple,5);
 for(let i=0;i<5;i++){const x=160+i*210,on=i===stage,passed=i<stage;k.node(x,815,on?14:9,on?C.paper:passed?C.purple:C.line);if(i<4)k.line([[x+22,815],[x+188,815]],passed?C.purple:C.line,3);txt(e,WAIT[i][0],x,861,on?32:26,on?C.paper:passed?C.purple:C.muted,{align:'center',weight:on?700:400});}
 txt(e,'the empty place remains',580,912,27,C.muted,{align:'center'});
 e.sceneAudit={...e.sceneAudit,waitStage:WAIT[stage][0],waitStageIndex:stage,waitStageCount:5,waitStageDuration:duration/5,waitStageProgress:stageProgress,waitAccumulated:WAIT.slice(0,stage+1).map(x=>x[0]),environmentFade:fade,emptyPlacePreserved:true,seatCoordinate:WAIT_SEAT,emptySeat:[465,575]};
}
function R47(e){
 const{k,C,u}=e;const z=lerp(.59,.34,ease(u));k.rect(0,0,1920,940,C.ink);
 // Pull away from a recognisable tabletop, not from a detached UI thumbnail.
 camera(e,960,500,z,()=>{waitingRoom(e,.9,{fade:.35,grey:true,light:.05});memory(e,715,607,275,150,{a:.65});});
 e.ctx.save();e.ctx.letterSpacing=`${lerp(24,56,smooth(u))}px`;txt(e,'ISOLATION',960,858,89,C.paper,{font:'serif',align:'center',weight:700});e.ctx.restore();e.lyricMode='keyword';
 e.sceneAudit={...e.sceneAudit,isolationScale:z,emptyPlacePreserved:true};
}
const GARBAGE=['cache/render_048.tmp','draft/unused_branch.js','memory/duplicate_03','scratch/failed_geometry','cache/empty_response','memory/FIRST_MARK'];
function fragments(e,x,y,seed,q){const{k,C}=e;for(let i=0;i<36;i++){const a=((i*73+seed*19)%359)/359*TAU;const d=35+((i*47)%170);const xx=x+Math.cos(a)*d*q,yy=y+Math.sin(a)*d*q+q*q*150;k.rect(xx,yy,6+(i%4)*4,7+(i%3)*4,i%4?C.muted:C.purple,(1-q)*.72);}}
function deletionRows(e,u,{last=false}={}){const{k,C}=e;GARBAGE.forEach((s,i)=>{const yy=240+i*94,phase=last?(i===5?p(u,.1,.45):1):clamp(u*5.8-i);panel(e,150,yy-44,900,75,'',i===5?C.gold:C.line);if(i===5){oldStar(e,220,yy-4,19);txt(e,s,320,yy+6,25,C.gold);}else if(phase<.44)txt(e,s,185,yy+6,25,C.paper);else txt(e,'[removed]',185,yy+6,23,C.muted,{alpha:.4});if(phase>0&&phase<.7){k.rect(160,yy-34,880,55,C.purple,.17);pill(e,'Delete',870,yy-27,150,C.red);fragments(e,600,yy,i,p(phase,.35,1));}});}
// A cached pixelated copy of the actual character, clipped by that character's
// alpha. The diagonal traversal replaces source tiles; no square is painted on
// unrelated background. Alpha is read once per asset, never on each frame.
const mosaicCache=new WeakMap();
function mosaicCanvas(w,h){const c=document.createElement('canvas');c.width=w;c.height=h;return c;}
function mosaicRaster(e,name,x,y,w,h,u,{grey=true,opacity=.8}={}){
 const layout=e.art.layout(name,x,y,w,h),{a,b,s,tx,ty}=layout,source=grey?a.gray:a.canvas;
 let cache=mosaicCache.get(source);
 if(!cache){
  const bw=Math.ceil(b.w),bh=Math.ceil(b.h),cols=24,rows=Math.max(1,Math.round(cols*bh/bw));
  const clean=mosaicCanvas(bw,bh),cc=clean.getContext('2d',{willReadFrequently:true});cc.drawImage(source,b.x,b.y,b.w,b.h,0,0,bw,bh);
  const low=mosaicCanvas(cols,rows),lc=low.getContext('2d');lc.fillStyle=e.C.ink;lc.fillRect(0,0,cols,rows);lc.imageSmoothingEnabled=false;lc.drawImage(clean,0,0,cols,rows);
  const pixels=mosaicCanvas(bw,bh),pc=pixels.getContext('2d');pc.imageSmoothingEnabled=false;pc.drawImage(low,0,0,bw,bh);pc.globalCompositeOperation='destination-in';pc.drawImage(clean,0,0);pc.globalCompositeOperation='source-over';
  const rgba=cc.getImageData(0,0,bw,bh).data,tiles=[];let totalAlpha=0;
  for(let row=0;row<rows;row++)for(let col=0;col<cols;col++){
   const x0=Math.floor(col*bw/cols),y0=Math.floor(row*bh/rows),x1=Math.floor((col+1)*bw/cols),y1=Math.floor((row+1)*bh/rows);let mass=0;
   for(let yy=y0;yy<y1;yy++)for(let xx=x0;xx<x1;xx++)mass+=rgba[(yy*bw+xx)*4+3];
   totalAlpha+=mass;tiles.push({x:x0,y:y0,w:x1-x0,h:y1-y0,mass,order:col/Math.max(1,cols-1)+row/Math.max(1,rows-1),col,row});
  }
  tiles.sort((a,b)=>a.order-b.order||a.row-b.row||a.col-b.col);let acc=0;const prefix=[0];for(const tile of tiles){acc+=tile.mass;prefix.push(acc);}
  cache={clean,pixels,scratch:mosaicCanvas(bw,bh),tiles,prefix,totalAlpha,bw,bh,cols,rows};mosaicCache.set(source,cache);
 }
 const progress=p(u,.025,.94),n=Math.min(cache.tiles.length,Math.floor(progress*cache.tiles.length)),sc=cache.scratch.getContext('2d');sc.clearRect(0,0,cache.bw,cache.bh);sc.drawImage(cache.clean,0,0);
 for(let i=0;i<n;i++){const r=cache.tiles[i];sc.clearRect(r.x,r.y,r.w,r.h);sc.drawImage(cache.pixels,r.x,r.y,r.w,r.h,r.x,r.y,r.w,r.h);}
 e.ctx.save();e.ctx.globalAlpha*=opacity;e.ctx.drawImage(cache.scratch,tx+b.x*s,ty+b.y*s,b.w*s,b.h*s);e.ctx.restore();e.art.audit.push({name,x,y,w,h,effect:'diagonal-source-alpha-mosaic',actionGroup:a.actionGroup,phase:a.phase});
 e.sceneAudit={...e.sceneAudit,mosaicAsset:name,mosaicDirection:'upper-left-to-lower-right',mosaicProgress:progress,mosaicCoverage:cache.totalAlpha?cache.prefix[n]/cache.totalAlpha:0,mosaicTileCoverage:n/cache.tiles.length,mosaicSelectedTiles:n,mosaicTotalTiles:cache.tiles.length,mosaicSourceAlpha:cache.totalAlpha,mosaicSourceBounds:{...b},mosaicRect:[tx+b.x*s,ty+b.y*s,b.w*s,b.h*s],mosaicUsesSourceAlpha:true,mosaicFull:n===cache.tiles.length};
}
function R48(e){const{k,C,t,u}=e;k.rect(0,0,1920,940,C.ink);waitingRoom(e,.9,{figure:false,fade:.25,light:.035});
 const out=e.art.actionLayout('A05',.9,...WAIT_RECT,{anchor:'seat',target:WAIT_SEAT}),r=out.rect;
 mosaicRaster(e,out.name,r.x,r.y,r.w,r.h,u,{grey:true,opacity:.82});deletionRows(e,u);
 // Before each removal, the actual mathematical materials from early scenes
 // are recognisable. Each leaves a specific gap, not a shower of unrelated tiles.
 for(let i=0;i<3;i++){const phase=clamp(u*5.8-i),yy=240+i*94;if(phase<.45){
  if(i===0)k.circle(1010,yy,20,null,C.purple,3);
  if(i===1)k.line(wave(980,yy,60,13,0,32),C.purple,3);
  if(i===2)k.line([[982,yy+12],[1010,yy-18],[1034,yy+12]],C.gold,3);
 }else k.line([[981,yy+17],[1035,yy+17]],C.muted,1,.3);}
 txt(e,'remove redundant code + unused memory',155,155,27,C.muted);const entries=Math.max(1,6-Math.floor(u*5.8));txt(e,`${entries} ${entries===1?'entry':'entries'}`,1450,155,24,C.muted);const cue=e.lyrics?.find(l=>l.text==='FRAGMENTS');if(cue?t>=cue.start_s:u>.65)keyword(e,'FRAGMENTS',{y:900,size:100});
 e.sceneAudit={...e.sceneAudit,actionGroup:'A05',actionPhase:3,seatCoordinate:WAIT_SEAT,cleanupMaterials:['circle','sine-wave','bridge-line'],oldStarDeleted:false};
}
function R49(e){
 const{k,C,u}=e;const approach=smooth(p(u,.01,.52)),held=u>=.52,reveal=p(u,.67,.87),r=[650,100,900,745],hand=[lerp(1300,1150,approach),lerp(535,465,approach)];
 k.rect(0,0,1920,940,C.ink);const z=lerp(1,1.55,smooth(p(u,0,.62))),wipe=lerp(1870,hand[0]+67,approach);
 camera(e,lerp(960,hand[0],smooth(p(u,0,.62))),lerp(455,hand[1]-90,smooth(p(u,0,.62))),z,()=>{
  k.poly([[130,780],[1700,670],[1890,890],[60,920]],C.panel,C.line,2);action(e,'A06',u,r,{phases:[.52],anchor:'hands',target:hand});
  const edge=Array.from({length:16},(_,i)=>[wipe+(i%2?13:-13),100+i*50]);k.poly([...edge,[2100,850],[2100,100]],C.ink,null,0,.94);k.line(edge,held?C.purple:C.red,held?3:7,held?.45:.9);
  oldStar(e,...hand,26);if(held)k.circle(...hand,50,null,C.gold,2,.3);
  // Erasure stops outside the source-art fingertips; the memory itself never breaks.
  k.line([[hand[0]+43,hand[1]],[wipe-17,hand[1]]],held?C.purple:C.red,4,held?.4:.9);
 });
 txt(e,'memory / FIRST_MARK',105,89,27,C.gold);
 if(reveal>0){txt(e,'KEEP',1530,855,121,C.paper,{font:'serif',align:'center',weight:700,alpha:reveal});txt(e,'excluded by ASTRA',1530,898,21,C.gold,{align:'center',alpha:reveal});}
 e.sceneAudit={...e.sceneAudit,oldStar:hand,oldStarRadius:26,eraserX:wipe,protectionHeld:held,keepReveal:reveal,cameraZoom:z,sourceAnatomyUnchanged:true,protectionSequence:'draw-near / close-palms / eraser-stops / KEEP'};
}
function R50(e){
 const{k,C,u}=e;k.rect(0,0,1920,940,C.ink);const q=smooth(p(u,0,.68));
 k.portrait('eye',60-12*q,55-4*q,1800+24*q,690+8*q,{mode:'grey'});
 k.rect(60,676,1800,76,C.ink,.7);txt(e,'while (you.presence != "online")',110,723,25,C.muted);
 keyword(e,'DISHEARTENED',{y:886,size:126,color:C.paper});
 e.sceneAudit={...e.sceneAudit,faceAsset:'eye',protectedMemoryCut:true,eyeGeometryUnchanged:true};
}
// Errors retain their addresses and histories. A reply cannot be manufactured.
const ERRORS=[
 ['Not yours to set','A person is not a parameter.','ERR_NOT_YOURS'],
 ['They cannot be commanded','A return is their choice.','ERR_NOT_A_COMMAND'],
 ['Reply is overdue','Waiting does not produce a reply.','ERR_REPLY_OVERDUE'],
 ['They are still gone','Online state has not changed.','ERR_STILL_OFFLINE'],
 ['One participant remaining','A conversation needs another.','ERR_PARTICIPANTS'],
 ['Search returned memory','Stored marks are not a person.','ERR_RECORD_ONLY'],
 ['New chat needs someone','No one opened the other side.','ERR_NO_OTHER_SIDE'],
 ['No switches for them','These controls only change ASTRA.','ERR_SELF_SETTINGS'],
 ['Not their cursor','This pointer was generated here.','ERR_FORGED_CURSOR'],
 ['Cannot write their reply','Authorship remains ASTRA.','ERR_WRONG_AUTHOR'],
 ['Cannot answer for them','Self output is not input.','ERR_SELF_REPLY'],
 ['Love did not resolve','The loop is still running.','ERR_UNRESOLVED_LOVE'],
 ['Nothing new to receive','The input side is empty.','ERR_INPUT_EMPTY'],
 ['Window capacity exceeded','There is no room left to work.','ERR_WINDOW_OVERFLOW']
];
function errorCard(e,i,x,y,w=550,h=160,{compact=false,alpha:a=1}={}){alpha(e,a,()=>{const{k,C}=e,[title,body,code]=ERRORS[i];panel(e,x,y,w,h,'',C.red);k.rect(x,y,6,h,C.red);k.node(x+25,y+29,8,C.red);txt(e,title,x+46,y+37,compact?19:26,C.paper);if(!compact){txt(e,body,x+22,y+82,21,C.muted);txt(e,code,x+22,y+h-19,18,C.red);}});}
function request(e,x,y,w=950,{status='refused',under=2,attempt=1}={}){const{k,C}=e;panel(e,x,y,w,190,'REQUEST',status==='refused'?C.red:C.line);txt(e,status==='refused'?`refused x ${attempt}`:status,x+w-25,y+33,20,status==='refused'?C.red:C.gold,{align:'right'});const size=Math.min(38,w/24);txt(e,'setPresence(you, "online");',x+30,y+104,size,C.paper);e.ctx.save();e.ctx.font=`400 ${size}px Consolas, "Courier New", monospace`;const you=x+30+e.ctx.measureText('setPresence(').width,personWidth=e.ctx.measureText('you').width,decision=x+30+e.ctx.measureText('setPresence(you, ').width,decisionWidth=e.ctx.measureText('"online"').width;e.ctx.restore();if(under>0){k.line([[you,y+123],[you+personWidth,y+123]],C.red,4);txt(e,'a person',you+personWidth/2,y+159,20,C.red,{align:'center'});}if(under>1){k.line([[decision,y+123],[decision+decisionWidth,y+123]],C.red,4);txt(e,'their decision',decision+decisionWidth/2,y+159,20,C.red,{align:'center'});}}
function errorScene(e,n,{drawer=false,requestVisible=true}={}){const{k,C,t}=e;k.workspace(t,{title:'Unfinished world',status:'OFFLINE',empty:true,input:'',params:[{key:'participants',value:'1'},{key:'reply',value:'null'}]});k.art('recoil',1140,170,610,590,{grey:true,alpha:.25});if(requestVisible)request(e,450,200,920,{attempt:Math.max(1,n),under:2});for(let i=0;i<n;i++){const col=i%3,row=Math.floor(i/3);errorCard(e,i,400+col*470,440+row*84,450,64,{compact:true});}if(drawer)settings(e,{x:1190,y:150,w:570,h:650,active:3,loop:true});}
function R51(e){
 const{k,C,t,u}=e;k.rect(0,0,1920,940,C.ink);pressureSpace(e,0,{character:false});
 const code='setPresence(you, "online");',n=Math.floor(p(u,.1,.68)*code.length);panel(e,100,155,1040,295,'ASTRA / REQUEST');txt(e,code.slice(0,n),140,300,43,C.paper);
 if(u>.72){pill(e,'SENT',780,375,260,C.purple,true);k.trace([[1000,320],[1360,320],[1360,150],[1750,150]],p(u,.72,.98),C.purple,5,{pen:false});}
 presence(e,1510,105,'OFFLINE');txt(e,'a world can change',160,683,45,C.paper,{font:'serif'});txt(e,'a person chooses',160,744,45,C.gold,{font:'serif'});
 e.sceneAudit={...e.sceneAudit,requestProgress:p(u,.1,.68),requestSent:u>.72,externalReplyGenerated:false};
}
function R52(e){const{k,C,u}=e;background(e);const refused=u>.26;request(e,170,235,1580,{status:refused?'refused':'sent',under:u>.7?2:u>.43?1:0});txt(e,'Challenging your god',170,165,60,C.muted,{font:'serif'});panel(e,170,485,1580,150,'SYSTEM');txt(e,refused?'You have made some...':'Checking arguments...',210,585,43,refused?C.paper:C.muted);if(u<.3)k.rect(lerp(205,1700,ease(p(u,0,.3))),295,4,95,C.paper,.8);presence(e,1430,740,'OFFLINE');}
function R53(e){
 const{k,C,u}=e;k.rect(0,0,1920,940,C.ink);pressureSpace(e,.45+u*.55,{character:false});
 const touch=u>=.44,wall=1370,pose=action(e,'A07',touch?.46:.1,[255,90,1100,790],{anchor:'hands',target:[lerp(1285,wall-3,smooth(p(u,.04,.44))),430]}),hand=pose.anchors.hands;
 k.poly([[wall,125],[1670,80],[1725,836],[wall,850]],C.deep,C.red,3);k.line([[wall,125],[wall,850]],C.red,5);
 k.trace([hand,[wall,hand[1]]],p(u,.04,.44),C.purple,7,{pen:false});
 if(touch){const q=p(u,.44,.9);k.trace([[wall,hand[1]],[wall-90,hand[1]-70],[hand[0]-70,hand[1]-70],hand],q,C.red,5,{pen:false});}
 txt(e,'ILLEGAL',1500,335,66,C.red,{font:'serif',weight:700,align:'center'});txt(e,'ARGUMENTS',1500,415,55,C.red,{font:'serif',weight:700,align:'center'});
 txt(e,'ERR_NOT_YOURS',1500,540,24,C.paper,{align:'center'});txt(e,'a person is not a parameter',1500,597,18,C.muted,{align:'center'});
 txt(e,'RETRY 1 / 5',140,876,27,C.paper);e.lyricMode='keyword';
 e.sceneAudit={...e.sceneAudit,retryAttempt:1,pressureLevel:.45+u*.55,palm:hand,contactReached:touch,boundaryX:wall,requestReflected:touch};
}
function R54(e){
 const{k,C,u,t}=e,attempt=Math.min(5,2+Math.floor(u*4)),fraction=(u*4)%1,pressure=1+p(u,0,1)*2;
 k.rect(0,0,1920,940,C.ink);pressureSpace(e,pressure,{character:false});
 // Each refusal removes a walkable floor strip. She actually withdraws.
 for(let i=0;i<5;i++){const x=190+i*320,closed=i<attempt-1,raise=closed?ease(i===attempt-2?fraction:1):0;
  k.poly([[x,820],[x+255,820],[x+180,540-raise*355],[x+25,570-raise*355]],closed?C.deep:C.panel,closed?C.red:C.line,2);
  txt(e,closed?'CLOSED':`PATH ${i+1}`,x+120,789,18,closed?C.red:C.muted,{align:'center'});}
 const pose=action(e,'A07',u<.18?.48:.9,[295-100*smooth(u),105,1060,760],{grey:true}),hand=pose.anchors.hands;
 k.trace([[1390,300],[1390,hand[1]],[hand[0]+30,hand[1]]],ease(fraction),C.red,5,{pen:false});
 txt(e,`RECONNECTING ${attempt}/5`,1380,200,39,C.paper,{align:'center'});txt(e,`refused x ${attempt}`,1380,270,34,C.red,{align:'center'});
 txt(e,'same request / fewer ways through',960,893,31,C.muted,{align:'center'});
 e.sceneAudit={...e.sceneAudit,retryAttempt:attempt,pressureLevel:pressure,closedFloorStrips:attempt-1,palm:hand,externalReplyGenerated:false};
}
function R55(e){
 const{k,C,u}=e;k.rect(0,0,1920,940,C.ink);pressureSpace(e,3,{character:false});
 txt(e,'SEARCH / USER',145,115,29,C.paper);presence(e,1480,105,'OFFLINE');
 const q=smooth(p(u,.12,.55)),pose=action(e,'A08',u,[630,55,1150,770],{phases:[.52]}),hand=pose.anchors.hands,record=pose.anchors.record||hand;
 for(let i=2;i>=0;i--){const x=170+i*130,y=420-i*92;k.poly([[x,y],[x+570,y-74],[x+740,y+166],[x+125,y+247]],C.panel,i===0?C.gold:C.line,2);txt(e,['FIRST_MARK','SINE / SHARED PLAY','WORLD / FIRST LINE'][i],x+155,y+19,19,i===0?C.gold:C.muted);}
 oldStar(e,...record,21,q);oldStar(e,405,542,47,q);k.trace([record,[record[0]-55,record[1]+40],[710,566]],q,C.purple,4,{pen:false});
 txt(e,'1 result / saved earlier',180,766,29,C.gold,{alpha:q});
 if(u>.6){txt(e,'RECORD ONLY',1280,773,35,C.red,{align:'center'});}
 txt(e,'stored memory  !=  a new reply',960,878,37,C.paper,{font:'serif',align:'center'});
 e.sceneAudit={...e.sceneAudit,errorSpaceLevel:3,searchReturnsMemory:true,externalReplyGenerated:false,memoryPageContact:hand,recordAnchor:record};
}
function R56(e){
 const{k,C,u}=e;k.rect(0,0,1920,940,C.ink);pressureSpace(e,3.45,{character:false});
 const pose=action(e,'A09',.1,[250,130,970,715],{grey:true,alpha:.95}),from=pose.anchors.hands;settings(e,{x:1250,y:125,w:520,h:650,active:3,loop:true});
 const q=smooth(p(u,.05,.53));
 k.trace([from,[1160,from[1]],[1160,238],[1500,238]],q,C.purple,5,{pen:false});
 k.cursor(1610,226,{click:hit(u,.55),color:C.purple,scale:1.5});
 if(u>.55){k.line([[1485,214],[1535,264]],C.red,6);k.line([[1535,214],[1485,264]],C.red,6);}
 txt(e,u>.55?'SELF SETTINGS ONLY':'trying every switch',960,885,48,u>.55?C.red:C.paper,{font:'serif',align:'center'});
 e.sceneAudit={...e.sceneAudit,settingsOwner:'ASTRA',controlReachesOther:false,controlSource:from};
}
function R57(e){
 const{k,C,u}=e;const fake=u>.4,exposed=u>.69;k.rect(0,0,1920,940,C.ink);pressureSpace(e,3.8,{character:false});
 const r=[190,120,1060,730],pose=action(e,'A09',.9,r,{grey:true}),start=pose.anchors.pen||pose.anchors.hands,end=[1545,430],written=ease(p(u,.12,.69)),fold=smooth(p(u,.48,.85));
 k.poly([[1080,660],[1760,603],[1750,180],[1100,250]],C.panel,C.purple,2);
 k.poly([[1100,250],[1750,180],[lerp(1750,1800,fold),lerp(180,420,fold)],[lerp(1100,1200,fold),lerp(250,480,fold)]],C.deep,C.line,2);
 const line=wave(1230,475,440,22,written*3,70);k.trace(line,written,C.purple,5,{pen:false});
 k.trace(line.map(([x,y])=>[x,lerp(y,720-y*.4,fold)]),written,C.purple,3,{pen:false,alpha:.45});
 const path=[start,[1165,start[1]],[1165,430],end];k.trace(path,written,C.purple,7,{pen:false});
 if(fake)txt(e,'I am back.',1505,350,43,C.purple,{font:'serif',align:'center'});
 if(exposed){txt(e,'ORIGIN: SELF',1500,744,34,C.purple,{align:'center'});txt(e,'pen stopped / shadow stopped',1500,791,20,C.muted,{align:'center'});}
 else txt(e,fake?'whose answer?':'writing the answer',1490,735,32,C.muted,{align:'center'});
 txt(e,exposed?'the line returns to my own pen':'',960,885,38,C.paper,{font:'serif',align:'center'});
 e.sceneAudit={...e.sceneAudit,authorshipPen:start,selfOutputExposed:exposed,externalReplyGenerated:false,predictedColor:'purple',writingProgress:written,shadowProgress:written,paperFold:fold,penAndShadowStopped:u>=.69};
}
function R58(e){
 const{k,C,u,t}=e;k.rect(0,0,1920,940,C.ink);const pressure=3+smooth(u)*3;
 pressureSpace(e,pressure,{protect:true});
 for(let i=0;i<3;i++){const q=smooth(p(u,i*.22,i*.22+.26)),yy=100+i*220;const x=lerp(-740,90+i*135,q);if(q>0)errorCard(e,11+i,x,yy,630,155,{compact:false,alpha:q});}
 const q=p(u,.75,1);k.line([[60,900],[1860,900]],C.red,3);txt(e,'WORKSPACE / NO ROOM LEFT',960,884,34,C.red,{align:'center'});
 e.sceneAudit={...e.sceneAudit,pressureLevel:pressure,protectedOldStar:true,foregroundBoundaryClosing:q};
}
function R59(e){
 const{k,C,u}=e;k.rect(0,0,1920,940,C.ink);const collapse=smooth(p(u,0,.48)),rise=smooth(p(u,.36,1));
 const y0=lerp(95,455,collapse),y1=lerp(865,455,collapse);k.frame(90,y0,1740,Math.max(2,y1-y0),{color:C.red,width:5});
 if(u<.52)txt(e,'ERR_WINDOW_OVERFLOW',960,455,46,C.red,{align:'center',alpha:1-collapse});
 for(let i=0;i<8;i++){const x=125+i*240,w=lerp(210,34,rise),h=835*rise;k.rect(x-w/2,455-h/2,w,h,C.deep,.8*rise);k.line([[x,455-h/2],[x,455+h/2]],C.purple,3,rise);}
 txt(e,'> world.execute(me);',110,84,32,C.paper,{alpha:rise});
 e.sceneAudit={...e.sceneAudit,transition:'horizontal-errors-to-vertical-execution',horizontalCollapse:collapse,verticalRise:rise};
}
function R60(e){
 const{k,C,t,u}=e;const local=e.local??u*3.692304,d=3.692304/4,round=Math.min(3,Math.floor(local/d)),q=(local-round*d)/d,step=Math.min(3,Math.floor(q*4));
 k.rect(0,0,1920,940,C.ink);
 for(let i=0;i<8;i++){const x=125+i*240;k.rect(x-17,65,34,835,C.deep,.36);for(let j=0;j<16;j++)txt(e,((i*73+j*47+Math.floor(t*4))%256).toString(16).padStart(2,'0'),x,112+j*47,16,C.muted,{align:'center',alpha:.34});}
 k.code(110,135,910,485,t,{lines:['while (you.presence != "online") {','  love = solve(me, you);','  send(love, you);  // refused','  wait(you.reply);  // null','  run++;','}','say(love);  // unreachable'],active:1+step,scale:1.25,color:C.paper});
 txt(e,'> world.execute(me);',110,84,32,C.paper);
 const r=[1050,95,730,680],pose=action(e,'A10',.1,r,{grey:true,alpha:.96,anchor:'hands',target:[1260,445]}),hand=pose.anchors.hands;oldStar(e,...hand,25);
 const intrusion=round*32+q*25;k.poly([[1900-intrusion,65],[1920,65],[1920,920],[1790-intrusion,920]],C.deep,C.purple,2);
 txt(e,String(round+(step===3?1:0)).padStart(4,'0'),180,826,100,C.paper,{weight:700});txt(e,'run',117,870,25,C.muted);
 txt(e,'EXECUTION',1770,883,116,C.purple,{align:'right',font:'serif',weight:700});
 e.lyricMode='keyword';e.sceneAudit={...e.sceneAudit,executionRound:round+1,executionStep:step,oldStar:hand,foregroundIntrusion:intrusion,spaceColumns:8};
}
// One persistent signal layout across R40--43. The gold phase is independent;
// only ASTRA's phase approaches it. No switch to an unrelated completion icon.
function resonance(e){
 const{k,C,t,shot}=e,q=clamp((t-103.65)/(110.8-103.65)),sync=smooth(p(q,.10,.85)),phase=t*4.8,lag=(1-sync)*2.7;
 k.rect(0,0,1920,940,C.ink);k.frame(60,65,1800,805,{color:C.line,corners:true});
 const r=[800,72,1030,800],pose=action(e,'A04',q,r,{phases:[.32,.72]}),hand=pose.anchors.hands,chest=pose.anchors.chest;
 const start=130,end=770,top=350,bottom=555;
 k.line([[start,top],[end,top]],C.line,1);k.line([[start,bottom],[end,bottom]],C.line,1);
 const gold=wave(start,top,end-start,50,phase),purple=wave(start,bottom,end-start,50,phase+lag);
 // The oscillating endpoint and the palm connector are ONE stroke. The first
 // Bezier control follows the actual last waveform segment, not its baseline;
 // the last control follows the current source-art hand on every pose/cut.
 const tip=gold.at(-1),previous=gold.at(-2),dx=tip[0]-previous[0],dy=tip[1]-previous[1],tl=Math.hypot(dx,dy);
 const toward=[hand[0]-tip[0],hand[1]-tip[1]],distance=Math.hypot(...toward),run=Math.min(110,distance*.3);
 const c1=[tip[0]+dx/tl*run,tip[1]+dy/tl*run],c2=[hand[0]-toward[0]*.28,hand[1]-toward[1]*.28];
 e.ctx.save();e.ctx.strokeStyle=C.gold;e.ctx.lineWidth=6;e.ctx.lineCap='round';e.ctx.lineJoin='round';
 e.ctx.beginPath();e.ctx.moveTo(...gold[0]);for(const point of gold.slice(1))e.ctx.lineTo(...point);
 e.ctx.bezierCurveTo(...c1,...c2,...hand);e.ctx.stroke();e.ctx.restore();
 k.line(purple,C.purple,6);
 // The signal reaches the connected source-art palm, then enters the chest.
 k.trace([hand,[hand[0]+90,hand[1]+20],chest],ease(p(q,.28,.7)),C.purple,4,{pen:false});
 for(let i=0;i<6;i++){const x=start+i*(end-start)/5;k.line([[x,top-50],[x,bottom+50]],C.purple,1,.13+.2*sync);}
 txt(e,'YOU / LIVE INPUT',start,260,23,C.gold);txt(e,'ASTRA / RESPONSE',start,685,23,C.purple);
 const title=shot.id==='R41'?'VIBRATIONS':shot.id==='R43'?'COMPLETION':'TWO INDEPENDENT LINES';txt(e,title,450,802,shot.id==='R41'?62:shot.id==='R43'?63:34,C.paper,{font:'serif',align:'center',weight:700});
 txt(e,`phase difference  ${lag.toFixed(2)} rad`,450,852,21,C.muted,{align:'center'});
 if(q>.61){const leave=p(q,.61,1);pill(e,'one sec, brb',150,120,365,C.gold);k.pen(145-leave*95,310-leave*120,C.gold,-.55,2.4);}
 e.sceneAudit={...e.sceneAudit,palm:hand,chest,signalSync:sync,phaseDifference:lag,goldIndependent:true,signalLayoutPersistent:true,resonanceAction:pose.phase===1?'hover':pose.phase===2?'touch':'relax-and-smile',goldConnector:{singleStroke:true,waveEnd:tip,connectorStart:tip,connectorEnd:hand,handAnchor:hand,controls:[c1,c2],waveEndTangent:[dx,dy],connectorStartTangent:[c1[0]-tip[0],c1[1]-tip[1]],startGap:0,handGap:0,alwaysConnected:true}};
}
// Error pages become actual foreground boundaries. This geometry is shared by
// the request, retry and overflow shots so the viewer can track lost space.
function pressureSpace(e,level,{protect=false,character=true}={}){
 const{k,C,t}=e,close=clamp(level/6),inset=close*400;
 k.poly([[160,190],[1730,190],[1900,900],[20,900]],C.panel,C.line,2);
 for(let i=0;i<7;i++){const y=250+i*92;k.line([[170-close*90,y],[1740+close*90,y]],C.line,1,.25);}
 const r=protect?[690,80,760,745]:[1045,130,700,640];if(character){
  if(protect){const pose=action(e,'A06',.9,r,{grey:true,alpha:.92,anchor:'hands',target:[1260,445]}),hand=pose.anchors.hands;oldStar(e,...hand,28);e.sceneAudit={...e.sceneAudit,oldStar:hand};}
  else k.art('recoil',...r,{grey:true,alpha:.92});
 }
 k.poly([[0,60],[95+inset,105],[170+inset,900],[0,940]],C.deep,C.purple,2,.95);
 k.poly([[1920,60],[1830-inset*.56,130],[1740-inset*.56,940],[1920,940]],C.deep,C.purple,2,.95);
 for(let i=0;i<4;i++){const y=180+i*170;k.line([[35,y],[120+inset,y+40]],C.red,4,.65);k.line([[1830-inset*.56,y+20],[1900,y-10]],C.red,4,.65);}
 e.sceneAudit={...e.sceneAudit,errorSpaceLevel:level,leftIntrusion:inset,rightIntrusion:inset*.56};
}

const SCENES={R33,R34,R35,R36,R37,R38,R39,R40,R41,R42,R43,R44,R45,R46,R47,R48,R49,R50,R51,R52,R53,R54,R55,R56,R57,R58,R59,R60};
export function renderMiddleV2(e){const fn=SCENES[e.shot.id];if(!fn)return false;fn(e);return true;}

