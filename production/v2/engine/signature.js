/* Handwritten title and ds's late credit correction. Pure function of song time. */
(() => {
  'use strict';
  const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
  const lerp=(a,b,p)=>a+(b-a)*p;
  const smooth=p=>{p=clamp(p);return p*p*(3-2*p)};
  const blueInk='#527fa2';

  function bezier(a,b,c,d,n=20){let p=[];for(let i=0;i<=n;i++){let t=i/n,u=1-t;p.push([u*u*u*a[0]+3*u*u*t*b[0]+3*u*t*t*c[0]+t*t*t*d[0],u*u*u*a[1]+3*u*u*t*b[1]+3*u*t*t*c[1]+t*t*t*d[1]]);}return p;}
  function join(...parts){return parts.flatMap((p,i)=>i?p.slice(1):p);}
  // Deliberate, slender italic handwriting; each letter remains recognizable.
  const astra=[
    join(bezier([6,78],[21,54],[39,6],[52,2]),bezier([52,2],[57,-3],[59,42],[76,76])),
    bezier([20,54],[35,47],[58,47],[72,43]),
    join(bezier([85,44],[97,24],[121,28],[115,39]),bezier([115,39],[109,48],[88,41],[91,55]),bezier([91,55],[95,68],[121,64],[116,75]),bezier([116,75],[109,84],[90,84],[84,73])),
    join(bezier([149,9],[146,30],[132,67],[138,77]),bezier([138,77],[143,85],[153,78],[159,72])),
    bezier([125,39],[137,36],[154,36],[165,34]),
    join(bezier([170,41],[170,51],[166,70],[164,78]),bezier([164,78],[176,50],[187,29],[201,41])),
    join(bezier([231,44],[221,29],[202,43],[203,63]),bezier([203,63],[202,81],[221,83],[233,47]),bezier([233,47],[231,62],[227,83],[245,75])),
    bezier([15,91],[87,102],[182,86],[261,89])
  ];
  // Intentionally uneven but correctly structured simplified Chinese strokes.
  const glyph={
    '大':[
      [[8,38],[45,36],[92,34]],[[53,5],[50,37],[40,65],[27,80],[7,93]],[[49,43],[68,64],[91,85]]
    ],
    '肥':[
      [[7,12],[5,88]],[[7,12],[39,11],[39,87],[29,90]],[[8,36],[37,35]],[[7,59],[37,59]],
      [[53,15],[89,15],[88,51],[53,51]],[[72,16],[71,50]],[[53,15],[51,74],[54,88],[85,90],[95,76]]
    ],
    '鱼':[
      [[53,5],[41,19],[26,31]],[[42,17],[77,16],[63,35]],[[25,36],[25,76]],[[25,36],[82,35],[83,76],[25,76]],
      [[52,37],[52,75]],[[27,56],[80,55]],[[9,93],[94,90]]
    ],
    '啥':[
      [[5,33],[5,76]],[[5,33],[29,33],[29,75]],[[6,75],[28,75]],
      [[66,5],[53,20],[36,32]],[[66,5],[80,20],[97,31]],[[43,36],[91,36]],
      [[41,53],[93,52]],[[67,32],[67,64]],[[45,66],[45,91]],[[45,66],[90,66],[90,91]],[[45,91],[90,91]]
    ],
    '龙':[
      [[9,34],[93,31]],[[47,7],[45,37],[38,62],[25,81],[8,94]],
      [[65,34],[56,69],[56,84],[63,92],[84,91],[94,76]],[[87,45],[74,62],[54,79],[35,89]],[[80,7],[91,17]]
    ]
  };
  function xform(strokes,x,y,scale=1,angle=0){let c=Math.cos(angle),s=Math.sin(angle);return strokes.map(path=>path.map(p=>[x+scale*(p[0]*c-p[1]*s),y+scale*(p[0]*s+p[1]*c)]));}
  function chinese(word,x,y,size=80,sloppy=false){let out=[];[...word].forEach((ch,i)=>{let a=sloppy?[-.10,.055,-.075][i%3]:[-.018,.018][i%2];out.push(...xform(glyph[ch],x+i*size*1.13,y+(sloppy?[4,-2,7][i%3]:0),size/100,a));});return out;}
  function stroke(ctx,points,p,color,width){p=clamp(p);let distances=[],sum=0;for(let i=1;i<points.length;i++){let d=Math.hypot(points[i][0]-points[i-1][0],points[i][1]-points[i-1][1]);distances.push(d);sum+=d;}let remaining=sum*p,tip=points[0];ctx.save();ctx.strokeStyle=color;ctx.lineWidth=width;ctx.lineCap='round';ctx.lineJoin='round';ctx.beginPath();ctx.moveTo(...tip);for(let i=0;i<distances.length;i++){let a=points[i],b=points[i+1],k=distances[i]?Math.min(1,remaining/distances[i]):1;tip=[lerp(a[0],b[0],k),lerp(a[1],b[1],k)];ctx.lineTo(...tip);remaining-=distances[i];if(remaining<=0)break;}if(p>0)ctx.stroke();ctx.restore();return tip;}
  function strokes(ctx,paths,p,color,width){let k=clamp(p)*paths.length,tip=paths[0][0],active=-1;for(let i=0;i<paths.length;i++){let n=clamp(k-i);if(n>0)tip=stroke(ctx,paths[i],n,color,width);if(k>=i&&k<i+1)active=i;}return {tip,active};}
  function cross(ctx,x,y,r,ink){stroke(ctx,[[x-r,y-r*.75],[x+r,y+r*.8]],1,ink,3);stroke(ctx,[[x+r*.8,y-r],[x-r*.8,y+r]],1,ink,3);}
  function serious(ctx,x,y,scale,ink){return strokes(ctx,xform(astra,x,y,scale,-.018),1,ink,3.2*scale);}
  function fatFish(ctx,x,y,size,ink){return strokes(ctx,chinese('大肥鱼',x,y,size,true),1,ink,Math.max(2.5,size*.055));}
  function title(ctx,t,host){
    serious(ctx,432,586,.61,host.C.ink);cross(ctx,626,620,10,host.C.ink);fatFish(ctx,661,589,52,host.C.ink);
    window.__signatureFrame={phase:'title',text:'Astra × 大肥鱼',astra_style:'careful_vector_handwriting',ds_style:'rough_handwritten_characters'};
  }
  const scratch=[
    [[462,492],[694,483],[472,513],[700,506],[474,535],[697,529],[478,553],[697,545]]
  ];
  const replacement=chinese('啥龙',493,355,93,false);
  function penPlacement(host,t,tip){
    const opt={t,side:0,centerSide:true,x:320,h:350,bottom:620,maxWidth:440,still:true};
    const p=host.placement('draw',opt);if(!p)return null;
    const raw=[735/1672*p.a.w,806/941*p.a.h];
    const base=[p.dx+raw[0]*p.sc,p.dy+raw[1]*p.sc];
    return {p,opt:{...opt,dx:tip[0]-base[0],dy:tip[1]-base[1]},raw,tip};
  }
  function outro(ctx,t,host){
    const {C,line,text,sprite,legacy,drawNewStar,pluto}=host;
    const notice=t>=196.0&&t<196.8, scratching=t>=196.8&&t<198.05, writing=t>=198.12&&t<200.65;
    let sp=clamp((t-196.8)/1.2),wp=clamp((t-198.12)/2.5),tip;
    // Calculate the current real nib location without drawing a second pen.
    const pathTip=(paths,p)=>{let k=clamp(p)*paths.length,idx=Math.min(paths.length-1,Math.floor(k)),pts=paths[idx],q=clamp(k-idx),lengths=[],sum=0;for(let i=1;i<pts.length;i++){let d=Math.hypot(pts[i][0]-pts[i-1][0],pts[i][1]-pts[i-1][1]);lengths.push(d);sum+=d;}let rem=sum*q;for(let i=0;i<lengths.length;i++){if(rem<=lengths[i])return [lerp(pts[i][0],pts[i+1][0],rem/lengths[i]),lerp(pts[i][1],pts[i+1][1],rem/lengths[i])];rem-=lengths[i];}return pts.at(-1);};
    if(t<196.8){let p=smooth((t-196.55)/.25);tip=[lerp(350,462,p),lerp(565,492,p)];}
    else if(t<198.05)tip=pathTip(scratch,sp);
    else if(t<198.12){let p=(t-198.05)/.07,a=scratch[0].at(-1),b=replacement[0][0];tip=[lerp(a[0],b[0],p),lerp(a[1],b[1],p)];}
    else if(t<200.65)tip=pathTip(replacement,wp);
    else {let a=replacement.at(-1).at(-1),p=smooth((t-200.65)/.35);tip=[lerp(a[0],350,p),lerp(a[1],565,p)];}
    const place=penPlacement(host,t,tip);
    text('太陽系デスコ',640,45,43,{max:900});
    legacy(300,133,44);drawNewStar(t,793,147,53,true);
    // Both stars remain independent; small linking dots echo their drawn galaxy.
    line([[390,141],[490,176],[580,125],[680,162]],C.purple,2,.6);
    for(const [x,y]of[[490,176],[580,125],[680,162]]){ctx.fillStyle=C.white;ctx.beginPath();ctx.arc(x,y,5,0,Math.PI*2);ctx.fill();}
    sprite('q',{side:1,centerSide:true,t,x:1100,h:215,bottom:326,maxWidth:260,still:true});
    // A right-hand card leaves ds's full face and uninterrupted arm visible.
    ctx.fillStyle=C.white;ctx.fillRect(420,335,780,301);line([[424,335],[1200,337],[1197,634]],C.ink,2);line([[1191,638],[420,635],[421,341]],C.ink,2);
    serious(ctx,458,470,.87,C.ink);cross(ctx,778,515,15,C.ink);fatFish(ctx,858,471,78,C.ink);
    if(sp>0)strokes(ctx,scratch,sp,blueInk,5.5);
    if(wp>0)strokes(ctx,replacement,wp,blueInk,5.1);
    if(place)sprite('draw',place.opt);
    if(notice){text('!?',278,270,77,{max:160});for(let i=0;i<8;i++)line([[390+i*52,430],[412+i*52,430]],C.blue,2.5);line([[810,430],[866,464]],C.blue,3);line([[866,464],[845,460]],C.blue,3);line([[866,464],[857,445]],C.blue,3);}
    if(t>=200.65){line([[500,455],[700,453]],blueInk,3);text('…',1103,99,48,{max:120});}
    pluto(t,1224,592,20);
    text('MUSIC・LYRICS  ナユタン星人  /  VOCAL  初音ミク',640,669,19,{max:1180});
    text('CHARACTER DESIGN  ZipZipPipe / 上善无形',640,698,17,{max:1160});
    window.__signatureFrame={phase:t<196?'shown':notice?'noticed':scratching?'crossing_out':writing?'writing':t>=200.65?'corrected':'pen_lift',text:t>=200.65?'啥龙 × 大肥鱼':'Astra × 大肥鱼',scratch_progress:sp,rewrite_progress:wp,nib:tip,real_hand_pen:true,old_star_visible:true,new_star_visible:true,notice_start:196,scratch_start:196.8,rewrite_start:198.12,rewrite_end:200.62};
  }
  window.DiscoSignature={title,outro,handwriting:{astra,glyph},version:2};
})();
