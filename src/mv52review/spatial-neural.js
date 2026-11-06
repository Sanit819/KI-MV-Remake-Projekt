// The same computed teaching models inhabit three consecutive paper spaces.
// These are intentionally toy models, never a claim about GPT internals.
import {fcForward,cnnForward,rnnForward} from './neural.js';
const clamp=v=>Math.max(0,Math.min(1,v));
const lerp=(a,b,t)=>a+(b-a)*t;
const smooth=v=>{v=clamp(v);return v*v*(3-2*v);};
const fmt=v=>Math.abs(v)<.0005?'0.00':v.toFixed(2);
const text=(e,s,x,y,n=24,c=e.C.paper,o={})=>e.k.text(s,x,y,n,c,{font:'mono',...o});
const linePulse=(e,a,b,p,width=3)=>{e.k.line([a,b],e.C.purple,width,.35);if(p>0&&p<1)e.k.circle(lerp(a[0],b[0],p),lerp(a[1],b[1],p),7,e.C.paper);};
function source(e){
 const {k,C}=e;
 k.poly([[55,590],[300,555],[350,760],[90,805]],C.panel,C.purple,2);
 const star=[[169,626],[178,652],[205,653],[183,670],[191,696],[168,681],[146,697],[153,670],[131,654],[158,652],[169,626]];
 k.line(star,C.gold,4,.7);k.line([[187,684],[222,710],[260,702]],C.gold,3,.7);
 text(e,'FIRST MARK',75,565,20,C.muted);text(e,'MEMORY',100,838,25,C.purple);
 return[240,720];
}
function result(e,p,from,origin){
 const{k,C}=e,q=smooth(clamp((p-.73)/.22));
 k.trace([from,[1810,from[1]],[1810,799],[1500,799]],q,C.purple,5,{pen:false});
 k.roundRect(1305,760,442,115,7,C.ink,C.purple,2,q);
 text(e,'PREDICTED / NOT RECEIVED',1325,789,18,C.muted,{alpha:q});
 k.text('I will stay.',1520,845,37,C.purple,{align:'center',alpha:q});
 const back=smooth(clamp((p-.88)/.12));
 k.trace([[1310,818],[1190,818],[1190,899],[origin[0],899],origin],back,C.purple,4,{pen:false});
 if(back>.1)text(e,'ORIGIN: SAME RECORD',765,929,21,C.muted,{align:'center',alpha:back});
}
function fcSpace(e,p){
 const{k,C}=e,d=fcForward(),positions=[],xs=[400,770,1140,1505],ys=[493,407,323,239],q=p*3;
 text(e,'FULLY CONNECTED',90,103,48);text(e,'ONE MARK / MANY ASSOCIATIONS',92,139,21,C.muted);
 d.layers.forEach((layer,l)=>{const x=xs[l],y=ys[l],h=335;
  k.poly([[x-95,y-h/2],[x+165,y-h/2-50],[x+205,y+h/2],[x-55,y+h/2+50]],l%2?C.deep:C.panel,C.purple,2,.74);
  positions[l]=layer.map((_,i)=>[x+46,y+(i-(layer.length-1)/2)*61]);
  text(e,['INPUT','HIDDEN 1','HIDDEN 2','OUTPUT'][l],x+20,y-h/2-22,21,C.purple,{align:'center'});
 });
 for(let l=0;l<3;l++)for(let j=0;j<d.layers[l+1].length;j++)for(let i=0;i<d.layers[l].length;i++){
  const a=positions[l][i],b=positions[l+1][j],w=d.weights[l][j][i],active=clamp(q-l);
  k.line([a,b],w<0?C.deep:C.purple,1+Math.abs(w)*2.5,.12+active*.37);
  if(q>l&&q<l+1)linePulse(e,a,b,smooth(active),1.8);
 }
 d.layers.forEach((layer,l)=>layer.forEach((v,i)=>{const pt=positions[l][i],visible=l===0?1:smooth(clamp(q-l+1));k.circle(...pt,26,C.ink,C.purple,3);k.circle(...pt,20,C.purple,null,0,visible*(.2+.65*Math.abs(v)));text(e,visible>.95?fmt(v):'--',pt[0],pt[1]+6,16,C.paper,{align:'center'});}));
 const layer=Math.min(2,Math.floor(q));text(e,'h = tanh(Wx + b)',420,713,33);text(e,`tanh(${fmt(d.pre[layer][0])}) = ${fmt(d.layers[layer+1][0])}`,420,752,25,C.purple);
 return{end:positions[3].at(-1),state:{type:'fc',layer,dimensions:[4,5,4,3],connections:52,values:d.layers,preactivations:d.pre,progress:p}};
}
function obliqueGrid(e,values,x,y,cell,show=Infinity,selected=-1){
 const{k,C,ctx}=e;ctx.save();ctx.transform(1,-.16,.21,1,x,y);
 values.forEach((row,r)=>row.forEach((v,c)=>{const i=r*row.length+c,seen=i<show;k.rect(c*cell,r*cell,cell-4,cell-4,seen?(v<0?C.deep:C.purple):C.panel,seen?.32+.15*Math.abs(v):.8);k.frame(c*cell,r*cell,cell-4,cell-4,{color:i===selected?C.paper:C.line,width:i===selected?4:1});if(seen)text(e,String(v),(c+.5)*cell,(r+.61)*cell,cell*.36,C.paper,{align:'center'});}));ctx.restore();
}
function cnnSpace(e,p){
 const{k,C,ctx}=e,d=cnnForward('star'),scan=clamp(p/.72)*9,idx=Math.min(8,Math.floor(scan)),row=Math.floor(idx/3),col=idx%3,relu=p>=.76,pooled=p<.84?0:Math.min(4,Math.floor((p-.84)/.16*4)+1);
 text(e,'CONVOLUTION / LOCAL WINDOW',82,104,46);text(e,'SAME FILTER / DIFFERENT PLACE',84,142,22,C.muted);
 k.poly([[380,237],[1810,157],[1750,680],[330,775]],C.panel,C.deep,3,.55);
 obliqueGrid(e,d.input,340,345,64);text(e,'INPUT 5 x 5',365,278,24,C.purple);
 ctx.save();ctx.transform(1,-.16,.21,1,340,345);k.frame(col*64,row*64,188,188,{color:C.paper,width:5,alpha:p<.76?1:.25});ctx.restore();
 obliqueGrid(e,d.kernel,814,340,40);text(e,'SHARED KERNEL',790,270,22,C.purple);
 linePulse(e,[736,420],[803,380],scan%1,4);
 obliqueGrid(e,relu?d.relu:d.conv,1085,300,61,Math.min(9,Math.floor(scan)+1),p<.76?idx:-1);text(e,relu?'RELU':'FEATURE 3 x 3',1095,250,22,C.purple);
 linePulse(e,[985,375],[1060,355],scan%1,4);
 obliqueGrid(e,d.pool,1510,280,75,pooled);text(e,'MAX POOL',1505,225,22,C.purple);
 if(p>.76)linePulse(e,[1320,370],[1495,330],clamp((p-.76)/.24),5);
 text(e,`PATCH [${row},${col}]  sum(input * kernel) = ${d.conv[row][col]}`,465,727,29,C.paper);
 text(e,relu?'ReLU(z) = max(0,z)':'CONV: stride 1 / no padding',465,768,24,C.purple);
 return{end:[1695,400],state:{type:'cnn',pattern:'star',scanIndex:idx,phase:p<.76?'convolution':p<.84?'relu':'pool',convolution:d.conv,relu:d.relu,pool:d.pool,progress:p,inputSize:[5,5],kernelSize:[3,3],outputSize:[3,3],poolSize:[2,2]}};
}
function rnnSpace(e,p){
 const{k,C}=e,steps=rnnForward(),q=p*3,centers=[[500,565],[1035,423],[1530,282]];
 text(e,'RECURRENT / CARRY WHAT REMAINS',85,102,44);text(e,'THREE MOMENTS / SHARED WEIGHTS',87,141,21,C.muted);
 k.line([[340,801],[1780,408]],C.deep,15,.8);k.line([[320,816],[1760,423]],C.purple,2,.5);
 steps.forEach((s,i)=>{const[x,y]=centers[i],a=smooth(clamp(q-i));
  k.poly([[x-155,y-172],[x+165,y-226],[x+218,y+116],[x-105,y+171]],C.panel,C.purple,3,.65+.35*a);
  text(e,`t = ${i+1}`,x-104,y-177,24,C.paper);text(e,`x = [${s.x.map(fmt).join(', ')}]`,x+16,y-95,23,i===2?C.muted:C.purple,{align:'center'});
  k.roundRect(x-105,y-45,235,116,12,C.ink,C.purple,3);text(e,'tanh',x+12,y-9,30,C.paper,{align:'center'});text(e,a>.98?`[${s.h.map(fmt).join(', ')}]`:'[ -- , -- ]',x+12,y+38,21,C.purple,{align:'center'});
  if(i<2){const next=centers[i+1],from=[x+140,y+25],to=[next[0]-165,next[1]+25];linePulse(e,from,to,clamp(q-i-.25),7);text(e,'h(t)',(from[0]+to[0])/2,(from[1]+to[1])/2-20,19,C.paper,{align:'center'});}
 });
 text(e,'h_t = tanh(W_x x_t + W_h h_(t-1) + b)',525,830,27,C.paper);text(e,'x3 = 0, but h3 is not 0',800,871,23,C.purple,{align:'center'});
 return{end:[1740,340],state:{type:'rnn',activeStep:Math.min(2,Math.floor(q)),steps,sharedWeights:true,zeroInputRetainsState:steps[2].h.some(v=>Math.abs(v)>.001),progress:p}};
}
export function drawSpatialNetwork(e,type,progress){
 const p=clamp(progress),origin=source(e);let out;
 if(type==='fc')out=fcSpace(e,p);else if(type==='cnn')out=cnnSpace(e,p);else if(type==='rnn')out=rnnSpace(e,p);else throw Error('Unknown spatial neural '+type);
 e.k.trace([origin,[355,720],[380,580]],clamp(p*4),e.C.purple,5,{pen:false});result(e,p,out.end,origin);
 e.sceneAudit??={};(e.sceneAudit.neural??=[]).push({...out.state,bounds:[50,90,1820,840],scope:'computed educational toy model; not GPT architecture',spatial:true});
 Object.assign(e.sceneAudit,{learningType:type,authorshipPen:origin,predictedOutput:true,independentReply:false,spatialNetwork:true,characterOverlay:false});return origin;
}
