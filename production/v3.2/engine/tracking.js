/* Stage detections, real NMS, Kalman filtering and Hungarian association.
 * Detections are authored from stage geometry, not outputs of a trained YOLO model.
 * All filter states are precomputed so arbitrary-time rendering is deterministic.
 */
(() => {
  'use strict';
  const START=71.849, END=85.049, FPS=30, DT=1/FPS, FIRST_FRAME=Math.ceil(START*FPS), BASE=FIRST_FRAME/FPS;
  const clamp=(x,a=0,b=1)=>Math.min(b,Math.max(a,x));
  const fract=x=>x-Math.floor(x),lerp=(a,b,p)=>a+(b-a)*p;
  const smooth=p=>{p=clamp(p);return p*p*(3-2*p)};
  // Slow authored display scores, independently reconstructible from time.
  // These are stage scores, not trained model probabilities or Kalman uncertainty.
  const SCORE_MODEL={name:'authored-low-frequency-v1',origin:27.049,offset:.5,frequencies:[.83,1.37],weights:[.32,.18],secondPhaseScale:.7,phases:{ds:.3,astra:1.7,star:2.9,rice:.6},ranges:{ds:[.90,.99],astra:[.90,.99],star:[.90,.97],rice:[.97,1]},candidatePenalty:.03,precision:2};
  function stageScore(t,id){
    const key=id==='rice'?'rice':id.includes('astra')?'astra':id.includes('ds')?'ds':'star';
    const phase=SCORE_MODEL.phases[key],u=t-SCORE_MODEL.origin;
    const wave=clamp(SCORE_MODEL.offset+SCORE_MODEL.weights[0]*Math.sin(u*SCORE_MODEL.frequencies[0]+phase)+SCORE_MODEL.weights[1]*Math.sin(u*SCORE_MODEL.frequencies[1]+phase*SCORE_MODEL.secondPhaseScale));
    const [lo,hi]=SCORE_MODEL.ranges[key];
    return Math.round((lo+(hi-lo)*wave)*100)/100;
  }
  const I=n=>Array.from({length:n},(_,i)=>Array.from({length:n},(_,j)=>+(i===j)));
  const transpose=a=>a[0].map((_,j)=>a.map(r=>r[j]));
  const mm=(a,b)=>a.map(r=>b[0].map((_,j)=>r.reduce((s,x,k)=>s+x*b[k][j],0)));
  const mv=(a,v)=>a.map(r=>r.reduce((s,x,k)=>s+x*v[k],0));
  const add=(a,b)=>a.map((r,i)=>r.map((x,j)=>x+b[i][j]));
  const sub=(a,b)=>a.map((r,i)=>r.map((x,j)=>x-b[i][j]));
  const F=[[1,0,DT,0],[0,1,0,DT],[0,0,1,0],[0,0,0,1]];
  const H=[[1,0,0,0],[0,1,0,0]],R=[[36,0],[0,36]];
  const q=600000,dt2=DT*DT,dt3=dt2*DT,dt4=dt2*dt2;
  const Q=[[q*dt4/4,0,q*dt3/2,0],[0,q*dt4/4,0,q*dt3/2],[q*dt3/2,0,q*dt2,0],[0,q*dt3/2,0,q*dt2]];
  const inverse2=a=>{const d=a[0][0]*a[1][1]-a[0][1]*a[1][0];return [[a[1][1]/d,-a[0][1]/d],[-a[1][0]/d,a[0][0]/d]];};

  function parcel(t){let p=fract((t-START)/6.4);if(p<.25)return [lerp(300,1220,p*4),lerp(540,80,p*4)];if(p<.5)return [lerp(1220,40,(p-.25)*4),60];if(p<.75)return [40,lerp(60,640,(p-.5)*4)];return [lerp(40,845,(p-.75)*4),lerp(640,430,(p-.75)*4)];}
  function qCenter(t,index){const side=index%2,phase=fract((t-START)/.8+index*.23),pop=phase<.12?smooth(phase/.12):phase>.72?1-smooth((phase-.72)/.28):1,angle=(side?1:-1)*(.1+Math.floor(phase*2)*.12);const x=side?1120:160,y=190;return [x+(side?1:-1)*(1-pop)*140+Math.sin(angle)*95,y-(1-pop)*160-Math.cos(angle)*95];}
  function truths(t){return [parcel(t),qCenter(t,0),qCenter(t,1)];}

  // Rectangular Hungarian algorithm using dual potentials and augmenting paths.
  // n <= m; callers add dummy columns for unmatched tracks.
  function hungarian(cost){const n=cost.length,m=cost[0].length,u=Array(n+1).fill(0),v=Array(m+1).fill(0),p=Array(m+1).fill(0),way=Array(m+1).fill(0);for(let i=1;i<=n;i++){p[0]=i;let j0=0,minv=Array(m+1).fill(Infinity),used=Array(m+1).fill(false);do{used[j0]=true;const i0=p[j0];let delta=Infinity,j1=0;for(let j=1;j<=m;j++)if(!used[j]){const cur=cost[i0-1][j-1]-u[i0]-v[j];if(cur<minv[j]){minv[j]=cur;way[j]=j0;}if(minv[j]<delta){delta=minv[j];j1=j;}}for(let j=0;j<=m;j++)if(used[j]){u[p[j]]+=delta;v[j]-=delta;}else minv[j]-=delta;j0=j1;}while(p[j0]!==0);do{const j1=way[j0];p[j0]=p[j1];j0=j1;}while(j0!==0);}const assignment=Array(n).fill(-1);for(let j=1;j<=m;j++)if(p[j])assignment[p[j]-1]=j-1;return {assignment,totalCost:assignment.reduce((s,j,i)=>s+cost[i][j],0),rowPotentials:u.slice(1),columnPotentials:v.slice(1)};}
  function predict(x,P){return {x:mv(F,x),P:add(mm(mm(F,P),transpose(F)),Q)};}
  function update(pred,z){const innovation=z.map((a,i)=>a-pred.x[i]),S=add(mm(mm(H,pred.P),transpose(H)),R),K=mm(mm(pred.P,transpose(H)),inverse2(S)),x=pred.x.map((a,i)=>a+K[i][0]*innovation[0]+K[i][1]*innovation[1]),IKH=sub(I(4),mm(K,H));const P=add(mm(mm(IKH,pred.P),transpose(IKH)),mm(mm(K,R),transpose(K)));return {x,P,innovation,S,K};}
  function precompute(){const names=['star','q-ds','q-astra'],initial=truths(BASE),tracks=initial.map(z=>({x:[...z,0,0],P:[[100,0,0,0],[0,100,0,0],[0,0,2500,0],[0,0,0,2500]]})),states=[];for(let frame=0;frame<=Math.ceil((END-START)*FPS);frame++){const t=BASE+frame*DT,truth=truths(t);let observations=truth.map((z,i)=>({source:names[i],score:stageScore(t,names[i]),scoreSource:'authored stage score, not model probability',point:[z[0]+5*Math.sin(frame*.79+i*2),z[1]+5*Math.cos(frame*.53+i*3)]}));const missed=frame>=145&&frame<=153;if(missed)observations=observations.filter(z=>z.source!=='star');const shift=frame%observations.length;observations=observations.slice(shift).concat(observations.slice(0,shift));if(Math.floor(frame/7)%2)observations.reverse();const before=tracks.map(a=>({x:[...a.x],P:a.P.map(r=>[...r])})),predictions=tracks.map(a=>predict(a.x,a.P));const cost=predictions.map((pred,i)=>[...observations.map(z=>(pred.x[0]-z.point[0])**2+(pred.x[1]-z.point[1])**2+((i===0)!==(z.source==='star')?1e9:0)),...Array(3).fill(2000000)]);const match=hungarian(cost);const results=tracks.map((track,i)=>{const j=match.assignment[i],measurement=j<observations.length?observations[j]:null,pred=predictions[i],posterior=measurement?update(pred,measurement.point):{x:pred.x,P:pred.P,innovation:null,S:null,K:null};track.x=posterior.x;track.P=posterior.P;const future=[posterior.x[0]+.25*posterior.x[2],posterior.x[1]+.25*posterior.x[3]];return {id:i+1,name:names[i],prior:before[i],prediction:pred,measurement,posterior,future,truth:truth[i],assignedColumn:j};});states.push({frame,time:t,dt:DT,mode:t<78.249?'Kalman':'Hungarian',observations,cost,assignment:match.assignment,totalCost:match.totalCost,tracks:results,scriptedMissingStar:missed});}return states;}
  const STATES=precompute();
  function state(t){if(t<START||t>=END)return null;return STATES[Math.min(STATES.length-1,Math.max(0,Math.floor(t*FPS+1e-7)-FIRST_FRAME))];}
  function iou(a,b){const x=Math.max(a.x,b.x),y=Math.max(a.y,b.y),right=Math.min(a.x+a.w,b.x+b.w),bottom=Math.min(a.y+a.h,b.y+b.h),inter=Math.max(0,right-x)*Math.max(0,bottom-y);return inter/(a.w*a.h+b.w*b.h-inter);}
  function nms(candidates,threshold=.48){const ordered=[...candidates].sort((a,b)=>b.score-a.score),kept=[],suppressed=[];for(const c of ordered){const winner=kept.find(k=>k.id===c.id&&iou(k,c)>threshold);if(winner)suppressed.push({candidate:c.index,by:winner.index,iou:iou(winner,c)});else kept.push(c);}return {kept,suppressed,threshold};}
  function fallbackBoxes(t,host){return [0,1].map(side=>{const p=host.placement(host.framePose(t),{t,h:665,bottom:746,maxWidth:1220}),b=p.a.halfBounds[side];return {id:side?'astra':'ds',label:side?'Astra':'大肥鱼',x:p.dx+b.x*p.sc,y:p.dy+b.y*p.sc,w:b.w*p.sc,h:b.h*p.sc};});}
  function drawBox(ctx,b,color,width=2,dashed=false){ctx.save();ctx.strokeStyle=color;ctx.lineWidth=width;if(dashed)ctx.setLineDash([11,8]);ctx.strokeRect(b.x,b.y,b.w,b.h);ctx.restore();}
  function label(host,s,x,y,size=25,color,max=240){host.text(s,x,y,size,{cn:true,color:color||host.C.ink,stroke:true,max});}
  function drawYOLO(ctx,t,host){
    const boxes=(Array.isArray(host.actorBoxes)&&host.actorBoxes.length?host.actorBoxes:fallbackBoxes(t,host)).filter(b=>b.id==='ds'||b.id==='astra');
    boxes.push({id:'legacy-star',label:'星',x:1120,y:68,w:119,h:76});
    const rice=window.DiscoRice?.state(t);
    if(rice?.mode==='yolo'&&rice.box)boxes.push({id:'rice',label:'白饭',...rice.box});
    const candidates=[];
    for(const b of boxes){
      for(let j=0;j<3;j++)candidates.push({...b,x:b.x+[0,-14,11][j],y:b.y+[0,8,-9][j],w:b.w+[0,24,-10][j],h:b.h+[0,-12,20][j],score:Math.round((stageScore(t,b.id)-j*SCORE_MODEL.candidatePenalty)*100)/100,index:candidates.length});
    }
    const n=nms(candidates),phase=host.phase(t);
    const boxColor=b=>b.id==='ds'?host.C.blue:b.id==='astra'?host.C.purple:host.C.white;
    if(phase<.2)for(const c of candidates){ctx.save();ctx.globalAlpha=.25;drawBox(ctx,c,boxColor(c),1,true);ctx.restore();}
    for(const b of n.kept){
      const color=boxColor(b),isRice=b.id==='rice',isWhite=isRice||b.id==='legacy-star';
      const clipped={x:Math.max(8,b.x-8),y:Math.max(8,b.y-5),w:Math.min(1264,b.x+b.w+8)-Math.max(8,b.x-8),h:Math.min(632,b.y+b.h+6)-Math.max(8,b.y-5)};
      drawBox(ctx,clipped,color,3);
      const lx=isRice?b.x+b.w/2:clamp(b.x+b.w/2,130,1180),ly=isRice?b.y-18:b.id==='legacy-star'?166:612;
      label(host,`${b.label} ${b.score.toFixed(2)}`,lx,ly,24,isWhite?host.C.ink:color,isRice?180:240);
    }
    label(host,'YOLO',105,253,35);label(host,'NMS',105,289,21);
    if(!rice||rice.mode!=='yolo'){
      const scan=160+fract((t-27.049)/1.6)*470;
      host.line([[12,scan],[178,scan]],host.C.white,2,.7);
      if(Math.floor((t-27.049)/.4)%4===3)label(host,'?',113,361,58);
    }
    return {kind:'YOLO-stage-detection',time:t,source:'authored sprite geometry, not trained model inference',scoreSource:'authored musical display scores, not model probabilities',scoreModel:SCORE_MODEL,actorBoxes:boxes,candidates,nms:n};
  }
  function drawTracking(ctx,t,host){
    const st=state(t),C=host.C;
    label(host,st.mode,119,265,st.mode==='Hungarian'?27:34);
    if(st.mode==='Hungarian')label(host,'1 ↔ 1',118,303,27);else label(host,'予測 →',112,305,24);
    for(const tr of st.tracks){
      const color=tr.id===2?C.blue:tr.id===3?C.purple:C.white,labelColor=tr.id===1?C.ink:color;
      const xy=tr.posterior.x;
      if(tr.id!==1&&(xy[0]<-100||xy[0]>1380||xy[1]<-100||xy[1]>665))continue;
      const r=tr.id===1?33:68,ry=tr.id===1?33:99;
      const px=tr.measurement?tr.measurement.point[0]:clamp(xy[0],35,1245),py=tr.measurement?tr.measurement.point[1]:clamp(xy[1],35,615);
      if(tr.id===1){
        ctx.save();ctx.setLineDash([8,6]);
        host.line([[px,py],[clamp(tr.future[0],35,1245),clamp(tr.future[1],35,615)]],color,2,.7);ctx.restore();
        const fx=clamp(tr.future[0],35,1245),fy=clamp(tr.future[1],35,615);
        drawBox(ctx,{x:fx-27,y:fy-27,w:54,h:54},color,1.8,true);
        if(st.scriptedMissingStar)label(host,'?',fx,fy,30,labelColor);
      }
      drawBox(ctx,{x:px-r,y:py-ry,w:2*r,h:2*ry},color,2,!tr.measurement);
      const identity=tr.measurement?`ID${tr.id} ${tr.measurement.score.toFixed(2)}`:`ID${tr.id} 预测`;
      label(host,identity,clamp(px,78,1202),clamp(py+ry+17,30,628),20,labelColor);
      if(st.mode==='Hungarian'&&tr.measurement){
        const z=tr.measurement.point,from=tr.prediction.x;
        if(Math.hypot(z[0]-from[0],z[1]-from[1])>8){
          host.line([[clamp(from[0],10,1270),clamp(from[1],10,625)],[clamp(z[0],10,1270),clamp(z[1],10,625)]],color,3,.8);
          host.ellipse(clamp(z[0],10,1270),clamp(z[1],10,625),6,6,color,2);
        }
      }
    }
    return {kind:'tracking',...st,scoreModel:SCORE_MODEL,parameters:{F,H,Q,R,initialCovariance:[[100,0,0,0],[0,100,0,0],[0,0,2500,0],[0,0,0,2500]],unmatchedCost:2000000,classMismatchCost:1e9,futureHorizon:.25},scope:'3 deterministic synthetic detections: original parcel star and existing upper Q actors; 4-state constant-velocity Kalman + rectangular Hungarian'};
  }
  function draw(ctx,t,host){let trace=null;ctx.save();ctx.beginPath();ctx.rect(0,0,1280,640);ctx.clip();if(t>=27.049&&t<39.849)trace=drawYOLO(ctx,t,host);else if(t>=START&&t<END)trace=drawTracking(ctx,t,host);ctx.restore();window.__trackingFrame=trace;return trace;}
  window.DiscoTracking={draw,state,parcel,qCenter,iou,nms,hungarian,stageScore,scoreModel:SCORE_MODEL,parameters:{F,H,Q,R},version:3};
})();
