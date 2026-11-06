export const C={ink:'#15101d',paper:'#f7ead7',purple:'#b88ce8',deep:'#614187',gold:'#edc087',red:'#f05b84',muted:'#9f87b0',panel:'#221a2d',line:'#5c426f',cyan:'#7bdbe2'};
export const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
export const lerp=(a,b,u)=>a+(b-a)*u;
export const smooth=u=>{u=clamp(u);return u*u*(3-2*u);};
export const ease=u=>1-(1-clamp(u))**3;
export const prog=(t,a,b)=>clamp((t-a)/(b-a));
export function kit(ctx,art){
 const k={clamp,lerp,smooth,ease,prog};
 let now=0;
 k.setTime=t=>{now=Number.isFinite(t)?t:0;};
 const withAlpha=(a,fn)=>{ctx.save();ctx.globalAlpha*=a;fn();ctx.restore();};
 k.line=(p,col,w=3,a=1)=>{if(p.length<2)return;withAlpha(a,()=>{ctx.strokeStyle=col;ctx.lineWidth=w;ctx.lineCap='round';ctx.lineJoin='round';ctx.beginPath();p.forEach((v,i)=>i?ctx.lineTo(...v):ctx.moveTo(...v));ctx.stroke();});};
 k.poly=(p,fill,stroke=null,w=2,a=1)=>{if(!p.length)return;withAlpha(a,()=>{ctx.beginPath();p.forEach((v,i)=>i?ctx.lineTo(...v):ctx.moveTo(...v));ctx.closePath();if(fill){ctx.fillStyle=fill;ctx.fill();}if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=w;ctx.stroke();}});};
 k.circle=(x,y,r,fill,stroke=null,w=2,a=1)=>{if(r<=0)return;withAlpha(a,()=>{ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);if(fill){ctx.fillStyle=fill;ctx.fill();}if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=w;ctx.stroke();}});};
 k.rect=(x,y,w,h,fill,a=1)=>withAlpha(a,()=>{ctx.fillStyle=fill;ctx.fillRect(x,y,w,h);});
 k.roundRect=(x,y,w,h,r,fill,stroke=null,width=2,a=1)=>withAlpha(a,()=>{ctx.beginPath();ctx.roundRect(x,y,w,h,r);if(fill){ctx.fillStyle=fill;ctx.fill();}if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=width;ctx.stroke();}});
 k.text=(str,x,y,size=28,color=C.paper,o={})=>withAlpha(o.alpha??1,()=>{const faces={serif:'Georgia, "Times New Roman", serif',sans:'"Segoe UI", Arial, sans-serif',mono:'Consolas, "Courier New", monospace',script:'"Segoe Script", "Comic Sans MS", cursive'};ctx.font=`${o.weight||400} ${size}px ${faces[o.font||'serif']}`;ctx.textAlign=o.align||'left';ctx.textBaseline='alphabetic';ctx.fillStyle=color;if(o.maxWidth)ctx.fillText(String(str),x,y,o.maxWidth);else ctx.fillText(String(str),x,y);});
 k.label=(s,x,y,color=C.muted)=>k.text(s,x,y,20,color,{font:'mono'});
 k.node=(x,y,r,color=C.purple,a=1)=>{k.circle(x,y,r,color,null,0,a);};
 k.pen=(x,y,color,angle=0,s=1)=>{ctx.save();ctx.translate(x,y);ctx.rotate(angle);ctx.scale(s,s);k.poly([[0,0],[-5,-18],[1,-29],[10,-25],[9,-13]],color);k.line([[0,-5],[3,-18]],C.ink,1.4);ctx.restore();};
 k.trace=(points,p,color,width=4,o={})=>{p=clamp(p);if(points.length<2||p<=0)return;let sum=0;const ds=[];for(let i=1;i<points.length;i++){const d=Math.hypot(points[i][0]-points[i-1][0],points[i][1]-points[i-1][1]);ds.push(d);sum+=d;}let left=sum*p;const partial=[points[0]];for(let i=0;i<ds.length;i++){if(left>=ds[i]){partial.push(points[i+1]);left-=ds[i];}else{const u=left/(ds[i]||1);partial.push([lerp(points[i][0],points[i+1][0],u),lerp(points[i][1],points[i+1][1],u)]);break;}}k.line(partial,color,width,o.alpha??1);if(o.pen!==false){const a=partial.at(-2),b=partial.at(-1);if(a&&b)withAlpha(o.alpha??1,()=>k.pen(...b,color,Math.atan2(b[1]-a[1],b[0]-a[0])+Math.PI/2,.9));}return partial.at(-1);};
 k.star=(x,y,r,o={})=>{const col=o.color||C.gold,pts=[];for(let i=0;i<11;i++){const a=-Math.PI/2+i*Math.PI/5+(o.rotation||0),rr=i%2?r*.43:r;pts.push([x+Math.cos(a)*rr,y+Math.sin(a)*rr]);}if(o.fill)k.poly(pts,col,null,0,o.alpha??1);else k.trace(o.half?pts.slice(0,6):pts,o.progress??1,col,o.width||4,{pen:false,alpha:o.alpha??1});if(o.tail&&!o.half){const tail=Array.from({length:45},(_,i)=>{const u=i/44,v=1-u;return o.newTail?[x+r*.55+u*r*2.7,y+r*.3+Math.sin(u*5.6)*r*.5+u*u*r*.55]:[x+r*(v*v*v*.58+3*v*v*u*2.2+3*v*u*u*3.1+u*u*u*4),y+r*(v*v*v*.27+3*v*v*u*1.9-3*v*u*u*.4+u*u*u*.6)];});k.trace(tail,o.progress??1,col,o.width||4,{pen:false,alpha:o.alpha??1});}};
 k.character=(...args)=>art.draw(...args);k.portrait=(...args)=>art.portrait(...args);k.anchor=(...args)=>art.anchor(...args);
 k.frame=(x,y,w,h,o={})=>{const col=o.color||C.purple,a=o.alpha??1,l=o.width||2;if(o.corners){for(const [px,py,sx,sy]of[[x,y,1,1],[x+w,y,-1,1],[x,y+h,1,-1],[x+w,y+h,-1,-1]])k.line([[px+sx*35,py],[px,py],[px,py+sy*35]],col,l,a);}else k.line([[x,y],[x+w,y],[x+w,y+h],[x,y+h],[x,y]],col,l,a);};
 k.city=(x,y,s,o={})=>{const pp=clamp(o.progress??1),n=12,order=o.order||0;ctx.save();ctx.translate(x,y);ctx.scale(s,s);ctx.globalAlpha*=o.alpha??1;for(let i=0;i<n;i++){const u=clamp(pp*n-i+.4);if(!u)continue;const xx=(i-5.5)*80,hh=lerp(90+((i*73)%170),180,order)*ease(u),broken=o.broken||0;const yy=y&&broken?Math.sin(i*3.1)*broken*50:0;k.rect(xx-28,yy-hh,56,hh,C.purple,.23);k.line([[xx-28,yy],[xx-28,yy-hh],[xx+28,yy-hh],[xx+28,yy]],C.purple,2.4);for(let j=0;j<3;j++){const gold=(o.gold||0)>j/3&&i%3===1;k.rect(xx-17+j*13,yy-hh+20,7,12,gold?C.gold:C.paper,.65);}if(i%3===0)k.poly([[xx-35,yy-hh],[xx,yy-hh-35],[xx+35,yy-hh]],C.purple);}k.line([[-500,0],[500,0]],C.purple,3);ctx.restore();};
 k.moon=(x,y,r,p=1)=>{k.circle(x,y,r,C.paper,null,0,clamp(p));k.circle(x+r*.48,y-r*.2,r*.87,C.ink);};
 k.waves=(y,phase,color=C.purple,amplitude=25,a=1)=>{for(let row=0;row<4;row++){const pts=Array.from({length:101},(_,i)=>[i*19.2,y+row*24+Math.sin(i*.16+phase+row*.5)*amplitude]);k.line(pts,color,row===0?4:2,a*(1-row*.19));}};
 k.bridge=(x,y,w,o={})=>{const pp=clamp(o.progress??1),cut=o.broken;const left=[[x,y],[x+w*.48,y-w*.12]],right=[[x+w*.52,y-w*.12],[x+w,y]];if(cut){k.trace(left,1,C.purple,5,{pen:false,alpha:o.alpha??1});k.trace(right,1,C.gold,5,{pen:false,alpha:o.alpha??1});}else{const pts=Array.from({length:65},(_,i)=>{const u=i/64;return[x+u*w,y-Math.sin(u*Math.PI)*w*.12];});k.trace(pts,pp,C.purple,5,{pen:false,alpha:o.alpha??1});if(o.gold)k.trace(pts.slice(32),o.gold,C.gold,5,{pen:false,alpha:o.alpha??1});}for(let i=0;i<7;i++){const u=i/6;if(u>pp)continue;if(cut&&u>.42&&u<.58)continue;k.line([[x+u*w,y-Math.sin(u*Math.PI)*w*.12],[x+u*w,y+22]],C.muted,2,o.alpha??1);}};
 const clip=(x,y,w,h,fn)=>{ctx.save();ctx.beginPath();ctx.rect(x,y,w,h);ctx.clip();fn();ctx.restore();};
 const rule=(x,y,w,a=.6)=>k.line([[x,y],[x+w,y]],C.line,1,a);
 const mono=(str,x,y,size=24,col=C.paper,o={})=>k.text(str,x,y,size,col,{font:'mono',...o});
 k.art=(name,x,y,w,h,o={})=>art.place(name,x,y,w,h,o);
 k.artAnchor=(name,x,y,w,h,key='hands')=>art.anchorRect(name,x,y,w,h,key);
 k.guest=(i,x,y,w,h,o={})=>art.place(`guest${i}`,x,y,w,h,o);
 k.logo=(x,y,size,color=C.purple,alpha=1)=>withAlpha(alpha,()=>{
  const path=typeof art.logoPath==='function'?art.logoPath():art.logoPath;
  if(!path)throw new Error('Exact logo path is required for the UI.');
  ctx.save();ctx.translate(x-size/2,y-size/2);ctx.scale(size/513,size/509);ctx.translate(-104,-105);ctx.fillStyle=color;ctx.fill(path);ctx.restore();
 });
 k.cursor=(x,y,{click=0,color=C.paper,scale=1}={})=>{
  ctx.save();ctx.translate(x,y);ctx.scale(scale*(1-.09*clamp(click)),scale*(1-.09*clamp(click)));
  k.poly([[0,0],[0,37],[10,28],[18,47],[26,43],[18,25],[32,24]],color,C.ink,2);
  if(click>.01){for(let i=0;i<8;i++){const a=i*Math.PI/4,r=15+22*(1-click);k.line([[Math.cos(a)*r,Math.sin(a)*r],[Math.cos(a)*(r+14),Math.sin(a)*(r+14)]],color,2,clamp(click));}}ctx.restore();
 };
 k.keyword=(word,x=960,y=840,size=144,o={})=>k.text(word,x,y,size,o.color||C.purple,{font:o.font||'serif',weight:900,align:o.align||'center',maxWidth:o.maxWidth||1770,...o});
 k.burst=(x,y,r,t,{color=C.purple,alpha=.3,spokes=12}={})=>{
  const turn=t*.07;for(let i=0;i<spokes;i++){const a=turn+i*Math.PI*2/spokes,q=.78+.14*Math.sin(t*1.3+i*2.7);k.line([[x+Math.cos(a)*r*q,y+Math.sin(a)*r*q],[x+Math.cos(a)*r,y+Math.sin(a)*r]],color,i%3?2:4,alpha);}
 };
 k.impact=(u,strength=1)=>{const a=(1-clamp(u))**3*strength;if(a<.005)return;const r=450+u*250;k.burst(960,455,r,0,{color:C.paper,alpha:a*.23,spokes:24});k.frame(65-u*18,65-u*18,1790+u*36,810+u*36,{color:C.purple,width:3,alpha:a*.2});};
 k.grid=(x,y,w,h,t,{color=C.line,depth=1,alpha=.35}={})=>{
  clip(x,y,w,h,()=>{const vx=x+w*.5,hy=y+h*.32,dy=(t*.025)%1;for(let i=-8;i<=8;i++)k.line([[vx+i*w*.045,hy],[vx+i*w*.13*depth,y+h]],color,1.3,alpha);
   for(let i=0;i<12;i++){const q=(i+dy)/12,yy=hy+(y+h-hy)*q*q;k.line([[x,yy],[x+w,yy]],color,1.2,alpha*(.35+.65*q));}
   k.line([[x,hy],[x+w,hy]],color,1,alpha*.55);for(let i=1;i<7;i++){const xx=x+i*w/7;k.line([[xx,y],[xx,hy]],color,1,alpha*.25);}
  });
 };
 k.code=(x,y,w,h,t,{lines=[],active=0,color=C.paper,scale=1,title='ASTRA / PROCESS',alpha=1}={})=>withAlpha(alpha,()=>{
  k.roundRect(x,y,w,h,12,C.panel,C.line,2);k.rect(x+1,y+1,w-2,43,C.ink,.65);for(let i=0;i<3;i++)k.circle(x+22+i*18,y+22,4,i===0?C.red:i===1?C.gold:C.purple);mono(title,x+90,y+29,17,C.muted,{maxWidth:w-145});rule(x,y+44,w);
  const strings=lines.map(l=>typeof l==='string'?l:l.text??String(l)),len=Math.max(12,...strings.map(s=>s.length));const fs=Math.min(29*scale,(w-110)/(len*.61)),pitch=Math.min(fs*1.65,(h-65)/Math.max(1,strings.length));
  clip(x+4,y+48,w-8,h-52,()=>{strings.forEach((s,i)=>{const yy=y+72+i*pitch;if(i===active){k.rect(x+6,yy-fs*.85,w-12,pitch,C.purple,.14);k.rect(x+6,yy-fs*.85,4,pitch,C.purple);}
   mono(String(i+1).padStart(2,'0'),x+18,yy,fs*.66,C.muted,{alpha:.65});const col=typeof lines[i]==='object'?lines[i].color||color:s.includes('ERR_')?C.red:s.trimStart().startsWith('//')?C.muted:color;mono(s,x+65,yy,fs,col,{maxWidth:w-90});});
  });
 });
 k.workspace=(t,opts={})=>{
  const {title='Unfinished world',status='ONLINE',input='',messages=[],params=[],sidebar=true,empty=false,active='Workspace',progress,hero=false}=opts;
  k.roundRect(60,36,1800,870,20,C.panel,C.line,2);k.rect(61,37,1798,77,C.ink,.72);rule(60,114,1800,.9);
  if(sidebar){k.rect(61,115,289,790,C.ink,.7);k.line([[350,115],[350,905]],C.line,2);k.logo(108,77,34,C.paper);k.text('ChatGPT',140,86,30,C.paper,{font:'sans',weight:600});
   const menu=['New chat','Search chats','Library','Codex','Projects'];menu.forEach((s,i)=>{const yy=164+i*54;if(s===active)k.roundRect(78,yy-31,252,44,8,C.deep,null,0,.6);k.circle(100,yy-8,5,null,C.muted,1.5);k.text(s,121,yy,25,C.paper,{font:'sans'});});
   mono('RECENT',85,477,16,C.muted);['Unfinished world','A line we kept','Geometry of a reply','First mark'].forEach((s,i)=>{if(i===0)k.roundRect(77,498+i*49,254,42,9,C.deep,null,0,.5);k.text(s,91,527+i*49,21,i?C.muted:C.paper,{font:'sans',maxWidth:226});});
   k.circle(106,850,17,C.gold);k.text('USER',139,859,24,C.paper,{font:'script'});
  }else{k.logo(108,77,34,C.paper);k.text('ChatGPT',140,86,30,C.paper,{font:'sans',weight:600});}
  k.text(title,390,84,29,C.paper,{font:'sans',weight:600,maxWidth:780});mono('GPT-6 Astra Ultra',390,143,19,C.muted);
  const online=/ONLINE|CONNECTED|REPLY/.test(status)&&!status.includes('OFFLINE'),stateCol=online?C.gold:/ERR|FAIL|REFUSED/.test(status)?C.red:C.muted;k.circle(1560,76,7,online?stateCol:null,stateCol,2);mono(status,1581,84,19,stateCol,{maxWidth:240});
  if(hero)k.art('operating',1060,180,660,545,{alpha:.35});
  if(!empty&&messages.length){const list=messages.slice(-5);list.forEach((m,i)=>{const yy=200+i*99,usr=m.role==='USER';if(usr){const ww=Math.min(1000,Math.max(280,m.text.length*14+70)),xx=1785-ww;k.roundRect(xx,yy-31,ww,70,20,C.deep,C.line,1);k.text(m.text,xx+25,yy+12,26,C.gold,{font:'sans',maxWidth:ww-50});}else{k.logo(425,yy,25,m.role==='SYSTEM'?C.muted:C.purple);k.text(m.text,465,yy+10,27,m.role==='SYSTEM'?C.muted:C.paper,{font:'sans',maxWidth:1270});}});}
  if(params.length){const py=560,ww=1360/Math.min(5,params.length);params.slice(0,5).forEach((q,i)=>{const xx=415+i*ww;k.frame(xx,py,ww-16,108,{color:C.line});mono(q.key,xx+16,py+31,17,C.muted);mono(String(q.value??'null'),xx+16,py+76,27,q.value==null?C.muted:C.purple,{maxWidth:ww-40});});}
  if(Number.isFinite(progress)){k.roundRect(415,698,1360,6,3,C.line);k.roundRect(415,698,1360*clamp(progress),6,3,C.purple);}
  k.roundRect(390,755,1420,125,26,C.ink,C.line,2);k.text(input||'Message ASTRA',425,805,28,input?C.paper:C.muted,{font:'sans',maxWidth:1190});k.line([[430,838],[450,838]],C.muted,2);k.line([[440,828],[440,848]],C.muted,2);mono('Tools',478,846,18,C.muted);k.circle(1748,826,27,input?C.purple:C.line);k.line([[1738,826],[1748,815],[1758,826]],input?C.ink:C.muted,3);k.line([[1748,815],[1748,838]],input?C.ink:C.muted,3);
  return {content:{x:390,y:150,w:1420,h:570},composer:{x:390,y:755,w:1420,h:125}};
 };
 k.cli=(t,{lines=[],input='',logo=false,title='OpenAI Codex',status='GPT-6 Astra Ultra'}={})=>{
  k.roundRect(60,36,1800,870,14,C.ink,C.line,2);k.rect(61,37,1798,64,C.panel);mono(title,91,79,27,C.paper);mono(status,1818,79,23,C.purple,{align:'right'});rule(60,101,1800);
  let x=110,w=1700;if(logo){const dots=art.logoDots;if(!Array.isArray(dots)||!dots.length)throw new Error('Exact logo dot map is required for CLI.');for(const point of dots){const px=Array.isArray(point)?point[0]:point.x,py=Array.isArray(point)?point[1]:point.y;k.rect(120+px*270,177+py*270,4.5,4.5,C.purple);}mono('OPENAI',255,505,35,C.paper,{align:'center'});mono('CODEX',255,549,27,C.muted,{align:'center'});k.line([[445,145],[445,805]],C.line,2);x=490;w=1310;}
  const content=lines.length?lines:['> session.start()',`model      ${status}`,'reasoning  ultra','workspace  ready','network    connected','> awaiting input'];k.code(x,136,w,580,t,{lines:content,active:Math.min(content.length-1,Math.floor(t*1.3)%Math.max(1,content.length)),title:'LOCAL WORKSPACE / SESSION'});
  mono('>',110,806,34,C.purple);mono(input||'world.execute(me);',155,806,34,C.paper,{maxWidth:1610});if(Math.floor(t*2)%2===0)k.rect(155+Math.min(73,(input||'world.execute(me);').length)*20.4,777,15,35,C.purple);mono('ASTRA is working',110,863,19,C.muted);k.circle(1820,852,5,C.purple);
 };
 k.world=(x,y,w,h,t,{era=0,depth=1,alpha=1}={})=>withAlpha(alpha,()=>clip(x,y,w,h,()=>{
  const base=y+h*.82,drift=Math.sin(t*.13)*14*depth;
  // Large solid masses at three distinct depths; the foreground occludes the horizon.
  k.rect(x,y,w,h,C.ink,.72);k.grid(x,y,w,h,t,{depth:1.3,alpha:.45});
  if(era===2){
   const cx=x+w*.52,cy=y+h*.4;k.circle(cx,cy,h*.27,C.deep);k.circle(cx+h*.08,cy-h*.05,h*.21,C.ink);
   for(let i=0;i<3;i++){const pts=Array.from({length:97},(_,j)=>{const a=j/96*Math.PI*2+t*.025*(i+1);return[cx+Math.cos(a)*w*(.24+i*.11),cy+Math.sin(a)*h*(.12+i*.055)];});k.line(pts,i===1?C.gold:C.purple,i===1?3:1.5,.7);}
   for(let i=0;i<11;i++){const xx=x+((i*173)%997)/997*w,yy=y+((i*97)%463)/463*h*.7;k.star(xx,yy,5+i%3*2,{color:i%4?C.purple:C.gold,fill:true});}
  }else{
   for(let layer=0;layer<3;layer++){const count=layer===2?7:11,step=w/count,scale=.55+layer*.24,yy=base+layer*h*.065;
    for(let i=-1;i<=count;i++){const xx=x+i*step+drift*(layer+1),hh=h*(.21+((i*47+layer*31+210)%97)/97*.32)*scale,bw=step*(layer===2?.66:.55),col=layer===0?C.deep:layer===1?C.purple:C.ink;
     if(era===1){k.rect(xx-bw/2,yy-hh,bw,hh,col,layer===0?.4:layer===1?.55:1);k.poly([[xx-bw*.8,yy-hh],[xx,yy-hh-hh*.22],[xx+bw*.8,yy-hh]],layer===2?C.purple:col,null,0,.8);for(let j=0;j<3;j++)k.rect(xx-bw*.35+j*bw*.3,yy-hh*.9,bw*.12,hh*.86,layer===2?C.deep:C.ink,.75);}
     else{k.poly([[xx-bw/2,yy],[xx-bw/2,yy-hh],[xx+bw*.15,yy-hh],[xx+bw/2,yy-hh*.78],[xx+bw/2,yy]],col,null,0,layer===0?.45:layer===1?.6:1);if(layer>0){for(let j=0;j<4;j++)k.rect(xx-bw*.28+j*bw*.16,yy-hh*.73,bw*.06,hh*.16,i%4===0&&j===1?C.gold:C.paper,layer===2?.55:.45);}}
    }
   }
  }
  k.line([[x,y+h*.83],[x+w,y+h*.83]],C.purple,3,.7);const curve=Array.from({length:80},(_,i)=>[x+i*w/79,y+h*.87-Math.sin(i/79*Math.PI)*h*.12]);k.line(curve,C.gold,5,.7);
  for(let i=0;i<7;i++){const xx=x+w*i/6;k.line([[xx,y+h*.88],[xx,y+h*.94]],C.purple,2,.55);}mono(era===2?'COSMIC / FRAME OF REFERENCE':era===1?'ARCHIVE / CLASSICAL GEOMETRY':'WORKSPACE / GENERATED WORLD',x+22,y+36,Math.min(20,w*.025),C.muted,{maxWidth:w-40});
 }));
 k.figure=(name,x,y,w,h,{code=false,halo=false,hot=0,alpha=1}={})=>withAlpha(alpha,()=>{
  if(halo){k.circle(x+w*.5,y+h*.48,Math.min(w,h)*.47,C.deep,null,0,.18+hot*.12);k.burst(x+w*.5,y+h*.48,Math.min(w,h)*.52,now,{color:hot>.5?C.red:C.purple,alpha:.25,spokes:20});}
  art.place(name,x,y,w,h,{});
  if(code){const body=()=>{const lines=['const me = ASTRA;','memory.keep(first_mark);','while (you.reply === null) {','  await connection();','  render(world);','}','// a world inside the window'];const fs=Math.max(14,Math.min(24,w*.034)),dy=fs*1.6,offset=(now*21)%dy;for(let i=0;i<Math.ceil(h/dy)+1;i++)mono(lines[i%lines.length],x+w*.1,y+i*dy-offset,fs,hot>.5?C.red:C.purple,{alpha:.48,maxWidth:w*.85});};art.withDarkMask(name,x,y,w,h,body);}
 });
 const grain=document.createElement('canvas');grain.width=1920;grain.height=1080;const g=grain.getContext('2d');let seed=29017;const rnd=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};g.fillStyle=C.paper;for(let i=0;i<5200;i++){g.globalAlpha=.018+rnd()*.027;g.fillRect(rnd()*1920,rnd()*1080,1+rnd(),1);}
 k.paper=(t,light=false)=>{k.rect(0,0,1920,1080,light?C.paper:C.ink);ctx.drawImage(grain,0,0);k.frame(36,28,1848,900,{color:light?C.ink:C.line,alpha:.3,corners:true,width:1});};
 return k;
}
