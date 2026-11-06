// Deterministic, actually computed teaching models. These are not GPT internals.
import {C,clamp,lerp,smooth} from './kit.js';
export const FC_INPUT=[.9,.35,.65,.2];
export const FC_WEIGHTS=[
 [[.8,-.3,.5,.2],[-.2,.9,.3,.6],[.4,.2,.7,-.5],[.6,.4,-.1,.8],[-.4,.5,.8,.3]],
 [[.6,.1,.4,-.2,.5],[-.3,.7,.2,.6,.1],[.5,-.2,.8,.3,.4],[.2,.6,-.1,.7,.5]],
 [[.7,-.2,.5,.3],[.2,.8,-.4,.6],[-.3,.4,.6,.7]]
];
export const FC_BIASES=[[.05,-.1,.02,0,.08],[.03,-.04,.02,.05],[.01,.02,-.03]];
export const PATTERNS={
 star:[[0,0,1,0,0],[1,1,1,1,1],[0,1,1,1,0],[0,1,0,1,0],[1,0,0,0,1]],
 cat:[[1,0,0,0,1],[1,1,0,1,1],[1,1,1,1,1],[1,0,1,0,1],[0,1,1,1,0]]
};
export const KERNEL=[[-1,0,1],[-1,0,1],[-1,0,1]];
export const RNN_INPUT=[[1,.2],[.3,.8],[0,0]],WX=[[.7,-.3],[.2,.6]],WH=[[.65,.15],[-.1,.7]],RB=[.02,-.01];
const dot=(a,b)=>a.reduce((sum,v,i)=>sum+v*b[i],0);
export function fcForward(input=FC_INPUT){const layers=[input.slice()],pre=[];FC_WEIGHTS.forEach((w,l)=>{const z=w.map((r,i)=>dot(r,layers[l])+FC_BIASES[l][i]);pre.push(z);layers.push(z.map(Math.tanh));});return{layers,pre,weights:FC_WEIGHTS,biases:FC_BIASES};}
export function cnnForward(pattern='star'){
 const input=PATTERNS[pattern]||PATTERNS.star;
 const conv=Array.from({length:3},(_,r)=>Array.from({length:3},(_,c)=>KERNEL.reduce((s,row,dy)=>s+row.reduce((a,v,dx)=>a+v*input[r+dy][c+dx],0),0)));
 const relu=conv.map(row=>row.map(v=>Math.max(0,v)));
 const pool=Array.from({length:2},(_,r)=>Array.from({length:2},(_,c)=>Math.max(relu[r][c],relu[r+1][c],relu[r][c+1],relu[r+1][c+1])));
 return {input,kernel:KERNEL,conv,relu,pool,stride:1,padding:0,poolStride:1};
}
export function rnnForward(input=RNN_INPUT,initial=[0,0]){
 let prev=initial.slice();return input.map((x,t)=>{const z=WX.map((w,i)=>dot(w,x)+dot(WH[i],prev)+RB[i]);const h=z.map(Math.tanh);const step={t,x:x.slice(),previous:prev.slice(),pre:z,h};prev=h;return step;});
}
function arrow(k,a,b,color,alpha=1,width=3){k.line([a,b],color,width,alpha);const q=Math.atan2(b[1]-a[1],b[0]-a[0]);k.poly([b,[b[0]-12*Math.cos(q-.5),b[1]-12*Math.sin(q-.5)],[b[0]-12*Math.cos(q+.5),b[1]-12*Math.sin(q+.5)]],color,null,0,alpha);}
function pulse(k,a,b,p,color=C.paper){if(p<=0||p>=1)return;k.circle(lerp(a[0],b[0],p),lerp(a[1],b[1],p),6,color);}
const fmt=v=>Math.abs(v)<.0005?'0.00':v.toFixed(2);
function header(k,title,label){k.text(title,42,63,34,C.paper,{font:'mono',weight:700});if(label)k.text(label,1155,63,19,C.muted,{font:'mono',align:'right',maxWidth:440});k.line([[42,88],[1158,88]],C.line,2);}
function fc(e,p,label){
 const {k}=e,data=fcForward(),xs=[115,430,760,1080],q=p*3;
 header(k,'FULLY CONNECTED',label||'FORWARD PASS');
 const ys=data.layers.map(layer=>layer.map((_,i)=>330+(i-(layer.length-1)/2)*73));
 for(let l=0;l<3;l++)for(let j=0;j<data.layers[l+1].length;j++)for(let i=0;i<data.layers[l].length;i++){
  const a=[xs[l]+28,ys[l][i]],b=[xs[l+1]-28,ys[l+1][j]],w=data.weights[l][j][i],active=clamp(q-l),bright=active>0;
  k.line([a,b],w<0?C.deep:C.purple,1.3+Math.abs(w)*2.2,bright?.38:.12);
  if(q>=l&&q<l+1)pulse(k,a,b,smooth(active),C.paper);
 }
 data.layers.forEach((layer,l)=>{
  k.text(['INPUT','HIDDEN 1','HIDDEN 2','OUTPUT'][l],xs[l],127,23,l===0?C.gold:C.purple,{font:'mono',align:'center'});
  const a=l===0?1:smooth(clamp(q-(l-1)));
  layer.forEach((v,i)=>{k.circle(xs[l],ys[l][i],29,C.ink,C.purple,2,.5);k.circle(xs[l],ys[l][i],25,C.purple,null,0,a*(.2+Math.abs(v)*.7));k.text(a>.85?fmt(v):l===0?fmt(v):'--',xs[l],ys[l][i]+6,18,a>.85?C.paper:C.muted,{font:'mono',align:'center'});});
 });
 const layer=Math.min(2,Math.floor(q)),z=data.pre[layer][0],v=data.layers[layer+1][0];
 k.text('h = tanh(Wx + b)',50,551,30,C.paper,{font:'mono'});
 k.text(`unit[0] : tanh(${fmt(z)}) = ${fmt(v)}`,1150,551,24,C.purple,{font:'mono',align:'right'});
 k.text('Every input in one layer reaches every unit in the next.',50,596,21,C.muted,{font:'mono'});
 return {type:'fc',layer,dimensions:[4,5,4,3],connections:52,values:data.layers,preactivations:data.pre,progress:p};
}
function grid(e,values,x,y,cell,{shown=Infinity,selected=-1,relu=false}={}){const {k}=e;values.forEach((row,r)=>row.forEach((v,c)=>{const i=r*row.length+c,visible=i<shown;const col=v<0?C.deep:C.purple;k.rect(x+c*cell,y+r*cell,cell-4,cell-4,visible?col:C.panel,visible?.22+.2*Math.abs(v):.6);k.frame(x+c*cell,y+r*cell,cell-4,cell-4,{color:i===selected?C.paper:C.line,width:i===selected?3:1});if(visible)k.text(String(relu?Math.max(0,v):v),x+c*cell+(cell-4)/2,y+r*cell+cell*.61,cell*.39,C.paper,{font:'mono',align:'center'});}));}
function cnn(e,p,label,pattern){
 const {k}=e,d=cnnForward(pattern),scan=clamp(p/.72)*9,idx=Math.min(8,Math.floor(scan)),rr=Math.floor(idx/3),cc=idx%3;
 header(k,'CONVOLUTIONAL NETWORK',label||'LOCAL PATTERN / SHARED FILTER');
 k.text('INPUT 5 x 5',170,141,24,C.gold,{font:'mono',align:'center'});grid(e,d.input,50,178,48);
 k.frame(50+cc*48,178+rr*48,140,140,{color:C.paper,width:4,alpha:p<.76?1:.25});
 k.text('KERNEL',439,141,24,C.purple,{font:'mono',align:'center'});grid(e,d.kernel,390,230,34);
 arrow(k,[307,300],[369,300],C.purple);pulse(k,[307,300],[369,300],scan%1);
 const relu=p>=.76,shown=Math.min(9,Math.floor(scan)+1);
 k.text(relu?'RELU 3 x 3':'FEATURE 3 x 3',680,141,24,C.purple,{font:'mono',align:'center'});grid(e,relu?d.relu:d.conv,590,205,60,{shown,selected:p<.76?idx:-1});
 arrow(k,[510,300],[568,300],C.purple);pulse(k,[510,300],[568,300],scan%1);
 const pooled=p<.84?0:Math.min(4,Math.floor((p-.84)/.16*4)+1);
 k.text('MAX POOL',1000,141,24,C.purple,{font:'mono',align:'center'});grid(e,d.pool,926,220,74,{shown:pooled});arrow(k,[793,300],[900,300],C.purple,p>.76?1:.25);
 if(pooled){const j=pooled-1;k.frame(590+(j%2)*60,205+Math.floor(j/2)*60,116,116,{color:C.paper,width:3});}
 k.text(`PATCH [${rr},${cc}]`,50,471,22,C.paper,{font:'mono'});k.text(`sum(input * kernel) = ${d.conv[rr][cc]}`,370,471,27,C.paper,{font:'mono'});
 k.text(relu?'ReLU(z) = max(0,z)':'One shared filter scans every local patch.',50,539,28,C.purple,{font:'mono'});
 k.text('CONV: stride 1 / no padding        POOL: 2 x 2 / stride 1',50,591,21,C.muted,{font:'mono'});
 return {type:'cnn',pattern,scanIndex:idx,phase:p<.76?'convolution':p<.84?'relu':'pool',convolution:d.conv,relu:d.relu,pool:d.pool,progress:p,inputSize:[5,5],kernelSize:[3,3],outputSize:[3,3],poolSize:[2,2]};
}
function rnn(e,p,label){
 const {k}=e,steps=rnnForward(),q=p*3,xs=[270,620,970];header(k,'RECURRENT NETWORK',label||'MEMORY THROUGH TIME');
 k.text('h0 = [0, 0]',48,288,22,C.muted,{font:'mono'});arrow(k,[90,330],[170,330],C.purple,.6);
 steps.forEach((s,i)=>{const x=xs[i],active=smooth(clamp(q-i)),next=clamp(q-i-.28);
  k.text(`t = ${i+1}`,x,139,24,C.paper,{font:'mono',align:'center'});
  k.roundRect(x-89,175,178,65,9,C.panel,C.line,2);k.text(`[${s.x.map(fmt).join(', ')}]`,x,216,22,i===2?C.muted:C.gold,{font:'mono',align:'center'});
  arrow(k,[x,243],[x,281],C.purple,.4+active*.6);pulse(k,[x,243],[x,281],clamp((q-i)*2));
  k.roundRect(x-108,286,216,118,13,C.panel,C.purple,3,.45+active*.55);k.text('tanh',x,324,25,C.paper,{font:'mono',align:'center'});
  k.text(active>.02?`[${s.h.map(v=>fmt(v*active)).join(', ')}]`:'[ -- , -- ]',x,369,21,C.purple,{font:'mono',align:'center'});
  if(i<2){arrow(k,[x+112,340],[xs[i+1]-114,340],C.purple,.25+active*.75,5);pulse(k,[x+112,340],[xs[i+1]-114,340],next);k.text('h(t)',x+175,310,19,C.muted,{font:'mono',align:'center'});}
  arrow(k,[x,410],[x,458],C.purple,.25+active*.75);k.text(`h${i+1}`,x,493,26,C.purple,{font:'mono',align:'center'});
 });
 k.line([[205,548],[1035,548]],C.purple,2,.7);for(const x of xs)k.line([[x,535],[x,557]],C.purple,2);
 k.text('SAME W_x / W_h / b AT EVERY STEP',620,580,22,C.paper,{font:'mono',align:'center'});
 k.text('h_t = tanh(W_x x_t + W_h h_(t-1) + b)',620,623,23,C.muted,{font:'mono',align:'center'});
 return {type:'rnn',activeStep:Math.min(2,Math.floor(q)),steps,sharedWeights:true,zeroInputRetainsState:steps[2].h.some(v=>Math.abs(v)>.001),progress:p};
}
export function drawNetwork(e,{type='fc',x=230,y=140,w=1460,h=750,progress=0,label='',pattern='star'}={}){
 const p=clamp(progress),scale=Math.min(w/1200,h/650),left=x+(w-1200*scale)/2,top=y+(h-650*scale)/2;
 if(!(scale>0)||![x,y,w,h,p].every(Number.isFinite))throw Error('Invalid network viewport');
 e.ctx.save();e.ctx.translate(left,top);e.ctx.scale(scale,scale);e.k.roundRect(0,0,1200,650,16,C.ink,C.line,2,.96);
 let state;if(type==='fc')state=fc(e,p,label);else if(type==='cnn')state=cnn(e,p,label,pattern);else if(type==='rnn')state=rnn(e,p,label);else throw Error('Unknown network '+type);
 e.ctx.restore();e.sceneAudit??={};(e.sceneAudit.neural??=[]).push({...state,bounds:[left,top,1200*scale,650*scale],scope:'computed educational toy model; not GPT architecture'});return state;
}
