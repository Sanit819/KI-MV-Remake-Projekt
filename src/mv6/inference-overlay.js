import {kalmanFilter2D,createMatchingDemo} from './inference-math.js';
import {clamp,smooth} from './common.js';

const PURPLE='#b88ce8',GOLD='#edc087',PAPER='#eee8df',DIM='#786781';
const path=(ctx,p,color,width=2)=>{ctx.strokeStyle=color;ctx.lineWidth=width;ctx.beginPath();p.forEach((q,i)=>i?ctx.lineTo(...q):ctx.moveTo(...q));ctx.stroke();};
function label(ctx,s,x,y,size=18,color=PAPER,align='left'){ctx.fillStyle=color;ctx.font=`500 ${size}px Consolas`;ctx.textAlign=align;ctx.textBaseline='alphabetic';ctx.fillText(s,x,y);}
function marker(ctx,x,y,r,color){ctx.strokeStyle=color;ctx.lineWidth=1.8;ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.stroke();path(ctx,[[x-r-4,y],[x-r+2,y]],color,1.4);path(ctx,[[x+r-2,y],[x+r+4,y]],color,1.4);}

export function createInferenceLayer(){
 const demo=createMatchingDemo(),matching={costMatrix:demo.costMatrix,...demo.optimal};
 let kalman=null;
 const audit={version:'v6-inference-1',active:false};
 function tracking(e,energy){
  const ctx=e.ctx,pose=e.sceneAudit.performance?.at(-1);if(!pose)return;
  const keys=['eyes','hands','wrist'].filter(k=>pose.anchors[k]);
  const alpha=smooth((e.u-.19)/.10)*(1-smooth((e.u-.70)/.10));
  ctx.save();ctx.globalAlpha=alpha;
  const observed=[];
  for(let i=0;i<keys.length;i++){
   const key=keys[i],[x,y]=pose.anchors[key],r=10+energy.pulse*3;
   marker(ctx,x,y,r,i?PAPER:GOLD);
   ctx.fillStyle='#241c2bea';ctx.fillRect(x+14,y-29,28,21);
   label(ctx,String(i+1).padStart(2,'0'),x+17,y-13,14,i?PAPER:GOLD);
   observed.push({key,point:[x,y]});
  }
  label(ctx,'LANDMARK TRACK',1190,185,21,PAPER);label(ctx,'01 FACE   02 HAND   03 WRIST',1190,216,15,DIM);
  ctx.restore();return {kind:'landmark-overlay',source:'manually calibrated approved artwork anchors; not a detector inference',asset:pose.name,points:observed,alpha};
 }
 function correspondence(e,energy){
  const ctx=e.ctx,u=e.u,fade=smooth(u/.08)*(1-smooth((u-.56)/.18));if(fade<=0)return {kind:'hungarian',visible:false};
  const merge=smooth(clamp((u-.12)/.50)),xl=540+(960-540)*merge,xr=1380+(960-1380)*merge;
  const n=matching.costMatrix.length, chosen=matching.assignment, reveal=smooth((u-.12)/.25);
  const left=Array.from({length:n},(_,i)=>[xl-120+40*Math.sin(i*1.3),265+i*90]);
  const right=Array.from({length:n},(_,i)=>[xr+120-40*Math.sin(i*1.3),265+i*90]);
  ctx.save();ctx.globalAlpha=fade;
  for(let i=0;i<n;i++)for(let j=0;j<n;j++){
   const selected=chosen[i]===j, opacity=selected?(.45+.55*reveal):.16*(1-reveal);
   ctx.globalAlpha=fade*opacity;ctx.setLineDash(selected?[]:[4,11]);
   path(ctx,[left[i],[780,left[i][1]],[1140,right[j][1]],right[j]],selected?PAPER:DIM,selected?2.2+energy.pulse:1);
   ctx.setLineDash([]);
   if(selected&&reveal>.15){const p=(u*4+i*.2)%1,a=left[i],b=right[j];ctx.fillStyle=GOLD;ctx.beginPath();ctx.arc(a[0]+(b[0]-a[0])*p,a[1]+(b[1]-a[1])*p,3.8,0,7);ctx.fill();}
  }
  ctx.globalAlpha=fade;left.forEach((p,i)=>{marker(ctx,...p,8,PURPLE);label(ctx,'A'+(i+1),p[0]-20,p[1]-18,16,PURPLE);});right.forEach((p,i)=>{marker(ctx,...p,8,GOLD);label(ctx,'B'+(i+1),p[0]+15,p[1]-18,16,GOLD);});
  const mx=90,my=690,cell=39;ctx.fillStyle='#15101de0';ctx.fillRect(70,638,310,185);
  label(ctx,'HUNGARIAN / COST x100',mx,my-20,16,PAPER);
  for(let i=0;i<n;i++)for(let j=0;j<n;j++){
   if(chosen[i]===j){ctx.fillStyle=`rgba(184,140,232,${.13+.17*reveal})`;ctx.fillRect(mx+j*cell,my+i*cell,cell-3,cell-3);}
   ctx.strokeStyle=DIM;ctx.lineWidth=.8;ctx.strokeRect(mx+j*cell,my+i*cell,cell-3,cell-3);
   label(ctx,(100*matching.costMatrix[i][j]).toFixed(1),mx+j*cell+cell/2-2,my+i*cell+25,14,chosen[i]===j?PAPER:DIM,'center');
  }
  label(ctx,'ONE TO ONE',mx+n*cell+22,my+30,15,PURPLE);label(ctx,'MINIMUM TOTAL',mx+n*cell+22,my+58,13,DIM);label(ctx,(100*matching.totalCost).toFixed(2),mx+n*cell+22,my+96,24,PAPER);
  ctx.restore();return {kind:'hungarian',visible:true,costMatrix:matching.costMatrix,assignment:chosen,totalCost:matching.totalCost,phase:reveal,source:'authored feature correspondence for the shared-world merge; no claim about matching human intent'};
 }
 function filtered(e,energy){
  if(!kalman)return null;
  const ctx=e.ctx,elapsed=e.t-103.65,index=Math.min(kalman.length-1,Math.max(0,Math.floor(elapsed*60))),state=kalman[index];
  const alpha=smooth(elapsed/.3)*(1-smooth((elapsed-6.5)/.65)),from=Math.max(0,index-100),window=kalman.slice(from,index+1),baseY=350;
  ctx.save();ctx.globalAlpha=alpha;
  // A strip of sampled evidence sits above the original LIVE INPUT. The gold
  // source and the independent purple response are never replaced by estimates.
  const graphX=150,graphY=424,graphW=600,graphH=58;
  const xy=(r,key)=>[graphX+(r.index-from)/100*graphW,graphY+(1-r[key][1])*graphH];
  ctx.fillStyle='#15101dbf';ctx.fillRect(137,417,626,73);
  ctx.fillStyle='#15101dcf';ctx.fillRect(535,88,250,132);label(ctx,'KALMAN',550,122,24,PAPER);label(ctx,'OBSERVE > PREDICT',550,154,16,GOLD);label(ctx,'UPDATE / ESTIMATE',550,182,16,PURPLE);
  ctx.setLineDash([3,5]);path(ctx,window.map(r=>xy(r,'observed')),DIM,1);ctx.setLineDash([]);
  if(window.length>1)path(ctx,window.map(r=>xy(r,'filtered')),PAPER,2.4);
  window.filter((_,i)=>i%5===0).forEach(r=>{const p=xy(r,'observed');ctx.fillStyle=GOLD;ctx.fillRect(p[0]-1.8,p[1]-1.8,3.6,3.6);});
  const current=xy(state,'filtered'),prediction=xy(state,'predicted');marker(ctx,...current,5+energy.pulse*2,PAPER);marker(ctx,...prediction,10,PURPLE);
  const variance=Math.max(0,state.covariance?.[1]?.[1]??0),radius=Math.min(30,Math.sqrt(variance)*graphH*2);
  ctx.strokeStyle=PURPLE;ctx.lineWidth=1;ctx.beginPath();ctx.ellipse(current[0],current[1],8,Math.max(4,radius),0,0,Math.PI*2);ctx.stroke();
  ctx.globalAlpha=alpha;label(ctx,'MEASURED',145,411,13,GOLD);label(ctx,'ESTIMATE',315,411,13,PAPER);label(ctx,'UNCERTAINTY',505,411,13,PURPLE);
  ctx.restore();return {kind:'kalman',index,observed:state.observed,predicted:state.predicted,filtered:state.filtered,covariance:state.covariance,source:'deterministic noisy toy observations from the scene vibration; original two independent waves retained'};
 }
 return {
  audit,
  prepare(){
   const observations=Array.from({length:430},(_,i)=>{const t=103.65+i/60,noise=.055*Math.sin(i*2.17)+.035*Math.cos(i*.83);return [i/429,.5+.35*Math.sin(t*4.8)+noise];});
   const result=kalmanFilter2D(observations,{dt:1/60,processNoise:4,measurementVariance:.0021});
   kalman=(Array.isArray(result)?result:result.samples).map((r,i)=>({...r,index:i}));
  },
  drawSource(e,energy){let result=null;if(e.shot.id==='R30')result=tracking(e,energy);else if(e.shot.id==='R16')result=correspondence(e,energy);else if(['R40','R41','R42','R43'].includes(e.shot.id))result=filtered(e,energy);Object.keys(audit).forEach(k=>delete audit[k]);Object.assign(audit,{version:'v6-inference-1',active:!!result,...result});return audit;}
 };
}
