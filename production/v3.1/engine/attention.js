/* v3: small, deterministic attention mechanisms acting as stage gags.
 * Not pretrained Transformer/ViT models; traces expose every arithmetic input.
 */
(() => {
  'use strict';
  const clamp=(v,a=0,b=1)=>Math.min(b,Math.max(a,v));
  const lerp=(a,b,p)=>a+(b-a)*p;
  const smooth=p=>{p=clamp(p);return p*p*(3-2*p)};
  const TAU=2*Math.PI;
  const transpose=m=>m[0].map((_,j)=>m.map(row=>row[j]));
  const multiply=(a,b)=>a.map(row=>b[0].map((_,j)=>row.reduce((s,v,k)=>s+v*b[k][j],0)));
  const add=(a,b)=>a.map((row,i)=>row.map((v,j)=>v+b[i][j]));
  const softmax=row=>{const max=Math.max(...row),e=row.map(v=>Math.exp(v-max)),sum=e.reduce((s,v)=>s+v,0);return e.map(v=>v/sum)};
  const layerNorm=row=>{const mean=row.reduce((s,v)=>s+v,0)/row.length,variance=row.reduce((s,v)=>s+(v-mean)**2,0)/row.length;return row.map(v=>(v-mean)/Math.sqrt(variance+1e-5))};
  const gelu=x=>.5*x*(1+Math.tanh(Math.sqrt(2/Math.PI)*(x+.044715*x*x*x)));
  const Wq=[[.8,.1,-.2,.1],[.1,.7,.2,-.1],[-.2,.1,.8,.15],[.15,-.1,.2,.65]];
  const Wk=[[.65,.1,.15,-.1],[.2,.75,-.1,.15],[-.1,.2,.7,.1],[.1,-.15,.2,.75]];
  const Wv=[[.6,-.2,.1,.1],[.15,.75,.05,-.1],[-.1,.1,.7,.2],[.2,-.1,.15,.6]];
  const Wf1=Array.from({length:4},(_,i)=>Array.from({length:6},(_,j)=>Math.sin(3+i*5+j*2)*.32));
  const Wf2=Array.from({length:6},(_,i)=>Array.from({length:4},(_,j)=>Math.cos(5+i*3+j*4)*.28));
  const bf1=[.04,-.02,.03,-.01,.02,-.03],bf2=[.01,-.02,.02,-.01];
  function encoder(tokens){
    const normalized=tokens.map(layerNorm),Q=multiply(normalized,Wq),K=multiply(normalized,Wk),V=multiply(normalized,Wv);
    const scores=multiply(Q,transpose(K)).map(row=>row.map(v=>v/Math.sqrt(4))),weights=scores.map(softmax),attention=multiply(weights,V);
    const residual=add(tokens,attention),normalizedResidual=residual.map(layerNorm),ffPre=multiply(normalizedResidual,Wf1).map(row=>row.map((v,j)=>v+bf1[j])),ffHidden=ffPre.map(row=>row.map(gelu)),ffOutput=multiply(ffHidden,Wf2).map(row=>row.map((v,j)=>v+bf2[j])),output=add(residual,ffOutput);
    return {tokens,normalized,Q,K,V,keyDimension:4,scores,weights,attention,residual,normalizedResidual,Wq,Wk,Wv,Wf1,bf1,ffPre,ffHidden,Wf2,bf2,ffOutput,output};
  }
  const textLabels=['HA','HA','ナ','!'];
  const textEmbedding=[[1,.1,-.2,.3],[1,.1,-.2,.3],[-.1,.8,.5,-.2],[.3,-.2,.7,1]];
  const textPosition=textLabels.map((_,i)=>[Math.sin(i),Math.cos(i),Math.sin(i/100),Math.cos(i/100)]);
  const textModel=encoder(add(textEmbedding,textPosition));
  // Eight-by-eight representation of the already-existing purple/gold star.
  // This low-resolution diagram is not the new blue/purple star drawn at the end.
  const starPolygon=[[0,-1],[.27,-.37],[1,-.23],[.48,.15],[.65,.94],[0,.55],[-.69,.91],[-.46,.17],[-1.04,-.21],[-.28,-.38]];
  function inside(x,y){let hit=false;for(let i=0,j=starPolygon.length-1;i<starPolygon.length;j=i++){let a=starPolygon[i],b=starPolygon[j];if((a[1]>y)!==(b[1]>y)&&x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0])hit=!hit;}return hit;}
  const palette={red:[255,100,82],purple:[182,160,212],gold:[245,207,114]};
  const image=Array.from({length:8},(_,y)=>Array.from({length:8},(_,x)=>{const px=(x+.5)/4-1,py=(y+.5)/4-1;return inside(px,py)?[...(x<4?palette.purple:palette.gold)]:[...palette.red];}));
  const patches=Array.from({length:16},(_,i)=>{let row=Math.floor(i/4),col=i%4,pixels=[];for(let y=0;y<2;y++)for(let x=0;x<2;x++)pixels.push(image[row*2+y][col*2+x]);return {index:i,row,col,pixels,flat:pixels.flat().map(v=>v/127.5-1)};});
  const patchProjection=Array.from({length:12},(_,i)=>Array.from({length:4},(_,j)=>Math.sin(2+i*3+j*5)*.19));
  const patchEmbedding=multiply(patches.map(p=>p.flat),patchProjection),classToken=[.35,-.2,.4,.1];
  const position=Array.from({length:17},(_,i)=>[Math.sin(i*.37)*.22,Math.cos(i*.37)*.22,Math.sin(i*.11)*.22,Math.cos(i*.11)*.22]);
  const vitModel=encoder(add([classToken,...patchEmbedding],position));
  function state(t){
    if(t>=97.449&&t<110.249){let local=t-97.449,query=Math.floor(local/.4)%4;return {mode:'transformer',time:t,phase:'self_attention',query,labels:textLabels,embedding:textEmbedding,position:textPosition,...textModel,scope:'Single-head four-token educational encoder; fixed parameters, not pretrained language inference'};}
    if(t>=148.249&&t<154.649){let local=t-148.249,phase=local<1.2?'patches':local<2.4?'tokens':local<5.2?'attention':'reassemble';return {mode:'vit',time:t,phase,query:0,image,patchSize:2,patches,patchProjection,patchEmbedding,classToken,position,...vitModel,classRepresentation:layerNorm(vitModel.output[0]),scope:'8x8 toy RGB old-star image, sixteen 2x2 patches, one-head encoder; not a pretrained classifier'};}
    return null;
  }
  function flow(ctx,points,p,color,r=4){const ds=[],total=points.slice(1).reduce((sum,b,i)=>{const a=points[i],d=Math.hypot(b[0]-a[0],b[1]-a[1]);ds.push(d);return sum+d},0);let remaining=clamp(p)*total;for(let i=0;i<ds.length;i++){if(remaining<=ds[i]){let a=points[i],b=points[i+1],q=remaining/Math.max(ds[i],1e-9);ctx.fillStyle=color;ctx.beginPath();ctx.arc(lerp(a[0],b[0],q),lerp(a[1],b[1],q),r,0,TAU);ctx.fill();return;}remaining-=ds[i];}}
  function chip(ctx,host,label,x,y,w,h,color,active=false,rotation=0){ctx.save();ctx.translate(x,y);ctx.rotate(rotation);ctx.fillStyle=host.C.red;ctx.fillRect(-w/2,-h/2,w,h);host.line([[-w/2+2,-h/2],[w/2,-h/2+1],[w/2,h/2-2]],color,active?3.5:2);host.line([[w/2-5,h/2],[-w/2,h/2],[-w/2,-h/2+5]],color,active?3.5:2);host.text(label,0,1,h*.57,{cn:true,max:w-8,color:color===host.C.white?host.C.ink:color,stroke:active});ctx.restore();}
  function textAttention(ctx,t,host,tr){
    const {C,line,text,ellipse}=host,local=t-97.449,p=(local/.4)%1,query=tr.query;
    const positions=[[103,250],[1177,250],[103,465],[1177,465]].map(([x,y],i)=>[x+(i%2?1:-1)*Math.sin(Math.floor(local/.2)+i)*5,y+Math.sin(Math.floor(local/.4)+i)*7]);
    for(let i=0;i<4;i++){
      let a=positions[query],b=positions[i],weight=tr.weights[query][i],path;
      if(i===query){ellipse(a[0],a[1],66,38,i%2?C.purple:C.blue,2+.8*weight,.65,-.15);continue;}
      if((query%2)===(i%2)){let x=query%2?1242:38;path=[a,[x,a[1]],[x,b[1]],b];}
      else if(Math.floor(query/2)===Math.floor(i/2)){let y=query<2?184:626;path=[a,[a[0],y],[b[0],y],b];}
      else {let x1=query%2?1242:38,x2=i%2?1242:38;path=[a,[x1,a[1]],[x1,626],[x2,626],[x2,b[1]],b];}
      line(path,i%2?C.purple:C.blue,1.4+5.5*weight,.5+weight);flow(ctx,path,(p+i*.17)%1,C.white,3+weight*3);
    }
    positions.forEach(([x,y],i)=>chip(ctx,host,tr.labels[i],x,y,88,49,i%2?C.purple:C.blue,i===query,(i%2?1:-1)*.06));
    const out=tr.output[query],mag=Math.min(1,Math.abs(out[0])/3);
    text('Transformer',640,554,32,{cn:true,max:440,stroke:true});
    line([[477,578],[477+326*mag,578]],query%2?C.purple:C.blue,3,.8);
  }
  function paintPatch(ctx,patch,x,y,size,angle,outline,C,active=false){ctx.save();ctx.translate(x,y);ctx.rotate(angle);const cell=size/2;patch.pixels.forEach((rgb,j)=>{ctx.fillStyle=`rgb(${rgb.join(',')})`;ctx.fillRect(-size/2+(j%2)*cell,-size/2+Math.floor(j/2)*cell,cell+.3,cell+.3);});ctx.strokeStyle=outline;ctx.lineWidth=active?3:1.5;ctx.strokeRect(-size/2,-size/2,size,size);ctx.restore();}
  function visionAttention(ctx,t,host,tr){
    const {C,text,line}=host,local=t-148.249;
    let flatten=smooth((local-1.2)/1.2);if(local>5.2)flatten=1-smooth((local-5.2)/1.2);
    text('ViT',640,209,40,{cn:true,max:240,stroke:true});
    const active=Math.floor(Math.max(0,local-2.4)/.175)%16,clsWeights=tr.weights[0].slice(1),max=Math.max(...clsWeights),min=Math.min(...clsWeights);
    const pts=tr.patches.map((patch,i)=>{
      const gx=580+(i%4)*40,gy=448+Math.floor(i/4)*40;
      const rx=415+i*30,ry=548+Math.sin(i*.8+Math.floor(local/.4))*(local>2.4&&local<5.2?6:0);
      return [lerp(gx,rx,flatten),lerp(gy,ry,flatten),lerp(40,26,flatten)];
    });
    if(local>=2.4&&local<5.2){
      const strongest=clsWeights.map((w,i)=>({w,i})).sort((a,b)=>b.w-a.w).slice(0,5);
      for(const {w,i} of strongest){let [x,y]=pts[i],strength=(w-min)/Math.max(1e-9,max-min),path=[[x,y-16],[x+(640-x)*.42,432],[640,393]];line(path,i%2?C.purple:C.blue,1.2+2.2*strength,.4+.4*strength);flow(ctx,path,((local-2.4)/.4+i*.09)%1,C.white,3);}
      chip(ctx,host,'CLS',640,407,66,34,C.white,true);
    }
    pts.forEach(([x,y,size],i)=>paintPatch(ctx,tr.patches[i],x,y,size,flatten*((i%2?1:-1)*.035),i%2?C.purple:C.white,C,local>=2.4&&local<5.2&&i===active));
    text(tr.phase==='patches'||tr.phase==='reassemble'?'PATCH':'TOKEN',640,620,20,{cn:true,max:240,stroke:true});
  }
  function draw(ctx,t,host){const tr=state(t);window.__attentionFrame=tr;if(!tr)return null;ctx.save();if(tr.mode==='transformer')textAttention(ctx,t,host,tr);else visionAttention(ctx,t,host,tr);ctx.restore();return tr;}
  window.DiscoAttention={draw,state,version:3};
})();
