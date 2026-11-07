/* FC / CNN / RNN stage toys. All numerical and drawing state is a pure function of song time. */
(() => {
  'use strict';
  const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
  const lerp=(a,b,p)=>a+(b-a)*p;
  const CNN_START=46.249,CNN_END=52.649,RNN_START=85.049,RNN_END=97.449;
  const input=[
    [0,0,0,1,0,0,0],
    [0,0,0,1,0,0,0],
    [1,1,1,1,1,1,1],
    [0,1,1,1,1,1,0],
    [0,0,1,1,1,0,0],
    [0,1,1,0,1,1,0],
    [1,1,0,0,0,1,1]
  ];
  const kernel=[[-1,0,1],[-2,0,2],[-1,0,1]];
  const conv=Array.from({length:5},(_,y)=>Array.from({length:5},(_,x)=>{
    let s=0;for(let ky=0;ky<3;ky++)for(let kx=0;kx<3;kx++)s+=input[y+ky][x+kx]*kernel[ky][kx];return s;
  }));
  const relu=conv.map(row=>row.map(v=>Math.max(0,v)));
  const pooled=Array.from({length:2},(_,y)=>Array.from({length:2},(_,x)=>Math.max(...[0,1].flatMap(dy=>[0,1].map(dx=>relu[y*2+dy][x*2+dx])))));
  const cnnModel={input,kernel,bias:0,stride:1,padding:0,operator:'valid cross-correlation',conv,relu,pool:{kernel:2,stride:2,padding:0,values:pooled},input_role:'coarse paper sample of existing legacy star, not the new final star'};
  const rnnWeights={Wih:[[.9,.15],[-.25,.8]],Whh:[[.64,.18],[-.12,.6]],bh:[.015,-.02],Why:[[.9,-.2],[.25,.85]],by:[0,0]};
  const rnnInputs=Array.from({length:16},(_,i)=>i%4===3?[0,0]:i%2?[0,1]:[1,0]);
  let previous=[0,0];
  const rnnStates=rnnInputs.map((x,i)=>{
    const before=[...previous],hidden=rnnWeights.Wih.map((w,j)=>Math.tanh(w[0]*x[0]+w[1]*x[1]+rnnWeights.Whh[j][0]*before[0]+rnnWeights.Whh[j][1]*before[1]+rnnWeights.bh[j]));
    const output=rnnWeights.Why.map((w,j)=>Math.tanh(w[0]*hidden[0]+w[1]*hidden[1]+rnnWeights.by[j]));
    previous=hidden;return {step:i,input:[...x],previous_hidden:before,hidden,output,zero_input:x.every(v=>v===0),weights:rnnWeights};
  });
  function state(t,host={}){
    if(t>=CNN_START&&t<CNN_END){const elapsed=t-CNN_START,scan=Math.min(24,Math.floor(elapsed/4.8*25));return {type:'CNN',label:'CNN',window:[CNN_START,CNN_END],elapsed,stage:elapsed<4.8?'convolve_relu':'max_pool',scan:{index:scan,row:Math.floor(scan/5),col:scan%5},...cnnModel};}
    if((t>=62.649&&t<69.049)||(t>=158.249&&t<161.449)){
      const fn=host.getToyNetworkTrace||window.getToyNetworkTrace;
      return {type:'FC',label:'FC',topology:[2,4,2],source:'v2 deterministic fully-connected tanh galaxy',trace:fn?fn(t):null};
    }
    if(t>=RNN_START&&t<RNN_END){const local=(t-RNN_START)/.8,idx=Math.min(rnnStates.length-1,Math.floor(local));return {type:'RNN',label:'RNN',window:[RNN_START,RNN_END],phase:local-Math.floor(local),...rnnStates[idx],model:'Elman tanh RNN 2→2 with tanh 2D readout; fixed teaching weights',sequence:rnnInputs};}
    return null;
  }
  function arrow(host,a,b,color,width=2){host.line([a,b],color,width);const angle=Math.atan2(b[1]-a[1],b[0]-a[0]);host.line([[b[0]-8*Math.cos(angle-.55),b[1]-8*Math.sin(angle-.55)],b,[b[0]-8*Math.cos(angle+.55),b[1]-8*Math.sin(angle+.55)]],color,width);}
  function backing(ctx,host,x,y,w,h){ctx.save();ctx.fillStyle=host.C.red;ctx.globalAlpha=.94;ctx.fillRect(x,y,w,h);ctx.restore();}
  function matrix(ctx,host,data,x,y,cell,opt={}){
    const max=Math.max(1,...data.flat().map(Math.abs));
    for(let row=0;row<data.length;row++)for(let col=0;col<data[row].length;col++){
      const v=data[row][col],idx=row*data[row].length+col,visible=opt.reveal==null||idx<=opt.reveal;
      ctx.save();ctx.globalAlpha=visible?1:.22;
      ctx.fillStyle=host.C.white;ctx.fillRect(x+col*cell,y+row*cell,cell-2,cell-2);
      if(visible&&v!==0){ctx.globalAlpha=.35+.65*Math.abs(v)/max;ctx.fillStyle=opt.legacy?(row<3?host.C.gold:host.C.purple):(v>0?host.C.blue:host.C.purple);ctx.fillRect(x+col*cell+1,y+row*cell+1,cell-4,cell-4);}
      ctx.restore();
    }
  }
  function drawCNN(ctx,t,host,s){
    const {C,text,line,roughRect}=host;
    backing(ctx,host,18,190,194,426);
    text('CNN',113,218,42,{max:185,stroke:true});
    matrix(ctx,host,s.input,36,262,21,{legacy:true});
    const kx=36+s.scan.col*21,ky=262+s.scan.row*21;
    ctx.save();ctx.strokeStyle=C.blue;ctx.lineWidth=4;ctx.strokeRect(kx-2,ky-2,63,63);ctx.restore();
    // The shared three-by-three filter sweeps the old star, then leaves its feature trail.
    text('3×3',109,431,25,{cn:true,max:100,stroke:true});
    arrow(host,[110,449],[110,470],C.ink,2);
    matrix(ctx,host,s.relu,29,486,17,{reveal:s.stage==='max_pool'?24:s.scan.index});
    text('ReLU',72,585,20,{cn:true,max:94,stroke:true});
    arrow(host,[121,526],[141,526],C.ink,2);
    matrix(ctx,host,s.pool.values,151,509,20,{reveal:s.stage==='max_pool'?3:-1});
    text('POOL',173,568,18,{cn:true,max:72,stroke:true});
    if(s.stage==='max_pool'){
      const hop=Math.floor((t-CNN_START-4.8)/.4)%4,xx=29+(hop%2)*34,yy=486+Math.floor(hop/2)*34;
      roughRect(xx-2,yy-2,34,34,C.purple);
      line([[153,557],[171,570],[192,552]],C.purple,3);
    }
  }
  function drawFC(ctx,t,host,s){
    const {C,text,line}=host;
    backing(ctx,host,560,177,160,45);
    text('FC',640,197,39,{max:130,stroke:true});
    text('2 → 4 → 2',640,238,21,{cn:true,max:184,stroke:true});
    if(s.trace){
      const brightness=s.trace.output.reduce((a,v)=>a+Math.abs(v),0)/2;
      line([[596,258],[640,264+brightness*7],[684,258]],C.white,2);
    }
  }
  function drawRNN(ctx,t,host,s){
    const {C,text,line,ellipse}=host;
    backing(ctx,host,1062,192,204,408);
    text('RNN',1162,220,41,{max:192,stroke:true});
    const inputToken=s.zero_input?'…':'ナ';
    text(inputToken,1163,291,43,{max:90,stroke:true});
    arrow(host,[1163,320],[1163,350],C.ink,2.6);
    // The loop carries the previous hidden state, including every fourth blank input.
    line([[1225,405],[1240,405],[1240,344],[1196,344],[1196,356]],C.purple,3);
    arrow(host,[1196,344],[1196,356],C.purple,3);
    for(let j=0;j<2;j++){
      const x=1128+j*72,y=391,r=20+9*Math.abs(s.hidden[j]);
      ctx.save();ctx.fillStyle=C.red;ctx.beginPath();ctx.arc(x,y,r+3,0,Math.PI*2);ctx.fill();ctx.restore();
      ellipse(x,y,r,r,j?C.purple:C.blue,3);
      ctx.save();ctx.fillStyle=C.white;ctx.globalAlpha=.25+.75*Math.abs(s.hidden[j]);ctx.beginPath();ctx.arc(x,y,6+9*Math.abs(s.hidden[j]),0,Math.PI*2);ctx.fill();ctx.restore();
    }
    text('h',1163,437,23,{cn:true,max:60,stroke:true});
    arrow(host,[1163,459],[1163,486],C.ink,2.6);
    text('ナ',1163,526,46+10*Math.abs(s.output[0]),{max:100,stroke:true});
    const q=clamp(s.phase),dotY=q<.5?lerp(321,352,q*2):lerp(460,487,(q-.5)*2);
    ctx.save();ctx.fillStyle=q<.5?C.blue:C.purple;ctx.beginPath();ctx.arc(1163,dotY,5.5,0,Math.PI*2);ctx.fill();ctx.restore();
    if(s.zero_input)text('まだナ',1162,578,23,{max:160,stroke:true});
    else if(s.step%4===2)text('ナ…?',1162,578,23,{max:160,stroke:true});
  }
  function draw(ctx,t,host){
    const s=state(t,host);window.__classicFrame=s;if(!s)return null;
    ctx.save();if(s.type==='CNN')drawCNN(ctx,t,host,s);else if(s.type==='FC')drawFC(ctx,t,host,s);else drawRNN(ctx,t,host,s);ctx.restore();return s;
  }
  window.DiscoClassic={draw,state,cnn:cnnModel,rnn:{weights:rnnWeights,inputs:rnnInputs,states:rnnStates},windows:{cnn:[CNN_START,CNN_END],fc:[[62.649,69.049],[158.249,161.449]],rnn:[RNN_START,RNN_END]}};
})();
