/* A small authored character-preference gag, independent of model arithmetic. */
(() => {
  'use strict';
  const TAU=2*Math.PI;
  function state(t){
    const mode=t>=30.249&&t<39.849?'yolo':t>=101.449&&t<106.249?'transformer':null;
    if(!mode)return null;
    const center=[100,mode==='yolo'?475:465],start=mode==='yolo'?30.249:101.449;
    return {kind:'rice-gag',mode,time:t,center,box:{x:20,y:center[1]-65,w:164,h:145},
      q:{side:0,x:92,bottom:634,h:78},beat:Math.floor((t-start)/.4),
      scope:'Authored ds white-rice preference gag. Rice geometry and animated high display scores are stage data, not trained detections or changed Transformer attention weights.'};
  }
  function shape(ctx,points,color){ctx.fillStyle=color;ctx.beginPath();points.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.closePath();ctx.fill();}
  function bowl(ctx,t,host,st){
    const {C,line}=host,[cx,cy]=st.center,jitter=Math.floor(t*10)%3-1;
    ctx.save();ctx.translate(cx+jitter,cy);ctx.rotate((st.beat%2?1:-1)*.025);
    // One lumpy white heap. Its ink deliberately leaves several small openings.
    const heap=[[-57,-8],[-55,-22],[-44,-27],[-42,-35],[-31,-34],[-24,-46],[-13,-43],[-3,-51],[8,-44],[19,-47],[28,-36],[40,-35],[42,-23],[53,-20],[57,-8]];
    shape(ctx,heap,C.white);
    line(heap.slice(0,5),C.ink,2.5);line(heap.slice(5,10),C.ink,2.4);line(heap.slice(11),C.ink,2.5);
    // Four broken grain marks keep the tiny silhouette legible at 720p.
    for(const [x,y,a] of [[-30,-19,-.3],[-10,-30,.5],[12,-19,-.4],[31,-13,.3]]){
      line([[x-2,y-a*3],[x+3,y+a*3]],C.ink,1.7);
    }
    const dish=[[-66,-8],[-60,13],[-45,37],[-20,48],[23,48],[45,35],[61,10],[66,-8]];
    shape(ctx,dish,C.white);
    line([[-66,-8],[-60,13],[-45,37],[-24,46]],C.ink,3);
    line([[-17,48],[23,48],[45,35],[61,10],[66,-6]],C.ink,3);
    line([[-61,-8],[-25,-5],[12,-7],[62,-8]],C.ink,2.6);
    line([[-22,50],[-23,56],[17,57],[22,52]],C.ink,2.5);
    // Loose whale-blue stripe, not a new face or edited character asset.
    line([[-46,19],[-28,27],[-9,23],[10,30],[31,23],[46,18]],C.blue,4);
    const steam=st.beat%2?3:-3;
    line([[-34,-51],[-38+steam,-58],[-33,-64]],C.ink,1.7,.65);
    line([[28,-51],[24-steam,-58],[30,-64]],C.ink,1.7,.65);
    ctx.restore();
  }
  function waitingFish(ctx,t,host,st){
    const {C,line,text,ellipse,sprite}=host;
    const bob=st.beat%2?0:-3;
    ctx.save();ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';
    sprite('q',{side:0,centerSide:true,x:92,h:78,bottom:634+bob,maxWidth:106,still:true,t});
    ctx.restore();
    // Thought dots rise from the existing ds Q toward the bowl.
    ellipse(133,566+bob,3,3,C.blue,1.7);
    ellipse(138,550,5,4,C.blue,1.8);
    if(st.beat%2===0)line([[41,579],[32,571]],C.ink,2);
    text('饭！',165,597+bob,26,{cn:true,color:C.ink,stroke:true,max:60,rot:-.1});
    line([[148,612+bob],[167,615+bob],[181,609+bob]],C.blue,2.4);
  }
  function draw(ctx,t,host){
    const st=state(t);window.__riceFrame=st;if(!st)return null;
    ctx.save();ctx.beginPath();ctx.rect(0,0,1280,640);ctx.clip();
    if(st.mode==='transformer'){
      // The visual joke replaces only the lower-left ナ tile. Attention math and
      // its exposed original token trace remain untouched.
      ctx.fillStyle=host.C.red;ctx.fillRect(20,400,164,145);
    }
    bowl(ctx,t,host,st);waitingFish(ctx,t,host,st);
    ctx.restore();return st;
  }
  window.DiscoRice={draw,state,version:3};
})();
