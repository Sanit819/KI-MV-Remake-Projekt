import {THREE,palette,makeLine,makeText,artFactory,clamp,smooth} from './common.js';
import {Art} from '../mv52final/art.js';
import {kit,C} from '../mv52final/kit.js';
import {renderEarlyV2} from '../mv52final/early.js';
import {renderMiddleV2} from '../mv52final/middle.js';
import {renderLateV2} from '../mv52final/late.js';
import {Lighting} from '../mv52final/lighting.js';
import {applyExtraLight} from '../mv52final/extra-light.js';
import {createWorld} from './world.js';
import {createContainment} from '../vfxlab-v2/containment.js';
import {createNeuralWorld} from './neural-world.js';
import {createBeatTrack} from './beat.js';
import {createComposite} from './composite.js';
import {createInferenceLayer} from './inference-overlay.js';
import {EffectComposer} from 'three/addons/postprocessing/EffectComposer.js';
import {RenderPass} from 'three/addons/postprocessing/RenderPass.js';
import {UnrealBloomPass} from 'three/addons/postprocessing/UnrealBloomPass.js';
const params=new URLSearchParams(location.search),W=Number(params.get('w')||1920),H=Number(params.get('h')||1080),SH=Math.round(H*933/1080),DURATION=13100/60;
const makeCanvas=()=>{const c=document.createElement('canvas');c.width=W;c.height=H;return c;};
const base=makeCanvas(),ctx=base.getContext('2d',{alpha:false,willReadFrequently:false}),overlay=makeCanvas(),over=overlay.getContext('2d');
const art=new Art(ctx),k=kit(ctx,art),lighting=new Lighting(base,new URLSearchParams());art.lighting=lighting;
const renderer=new THREE.WebGLRenderer({antialias:true,alpha:false,preserveDrawingBuffer:true,powerPreference:'high-performance'});renderer.setPixelRatio(1);renderer.setSize(W,H);renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.NoToneMapping;document.querySelector('#stage').appendChild(renderer.domElement);
const scene=new THREE.Scene();scene.background=new THREE.Color(palette.bg);scene.fog=new THREE.FogExp2(palette.bg,.0075);const camera=new THREE.PerspectiveCamera(43,W/SH,.08,240);
const rt=new THREE.WebGLRenderTarget(W,SH,{type:THREE.HalfFloatType,samples:4}),composer=new EffectComposer(renderer,rt),renderPass=new RenderPass(scene,camera),bloom=new UnrealBloomPass(new THREE.Vector2(W,SH),.24,.35,.78);composer.addPass(renderPass);composer.addPass(bloom);
const composite=createComposite(base,lighting.mask,overlay);
const api=window.vfx={canvas:renderer.domElement,duration:DURATION,ready:null,renderFrame:null,current:null};
const GUESTS=['GEMINI','GLM','DEEPSEEK','CLAUDE','QWEN','GROK'],DOMAINS=['PRESENCE','HISTORY','PREDICTED REPLY','BOUNDARY','CONTROL','OUTPUT'];
const ink='#15101d',paper='#f7ead7',purple='#b88ce8',red='#e1717c';
function text(s,x,y,size,color=paper,font='Consolas',align='left',weight=500,maxWidth=Infinity){over.font=`${weight} ${size}px ${font}`;const width=over.measureText(s).width;if(width>maxWidth)over.font=`${weight} ${size*maxWidth/width}px ${font}`;over.textAlign=align;over.textBaseline='alphabetic';over.fillStyle=color;over.fillText(s,x,y);}
function stroke(points,color,width=2){over.strokeStyle=color;over.lineWidth=width;over.beginPath();points.forEach((p,i)=>i?over.lineTo(...p):over.moveTo(...p));over.stroke();}
function star(x,y,r,color='#edc087'){const pts=[];for(let i=0;i<=10;i++){const a=-Math.PI/2+i*Math.PI/5,rr=i%2?r*.43:r;pts.push([x+Math.cos(a)*rr,y+Math.sin(a)*rr]);}stroke(pts,color,2.5);stroke([[x+r*.55,y+r*.3],[x+r*1.6,y+r*.8],[x+r*2.7,y+r*.6]],color,2.3);}
function countOverlay(e,audit){const n=Number(e.shot.id.slice(1))-64;
 text(`CELL ${String(n+1).padStart(2,'0')}`,100,114,27,paper);text(DOMAINS[n],100,154,21,'#9f87b0');
 text(String(n+1),275,600,350,purple,'Georgia','center',900);text(GUESTS[n],280,681,28,paper,'Consolas','center');
 stroke([[100,718],[460,718]],'#665772',1.5);
 for(let i=0;i<6;i++){over.fillStyle=i<=n?red:'#413447';over.fillRect(102+i*60,756,34,5);}
 text(audit?.lock>.8?'LOCK ENGAGED':'ACCESS REVOKED',100,811,20,audit?.lock>.8?red:'#9f87b0');
 star(1755,846,25);
}
function neuralOverlay(e,audit){const n=Number(e.shot.id.slice(1)),p=audit?.progress??clamp(e.u/(n===79?.95:.83)),types={78:'FULLY CONNECTED',79:'VOLUMETRIC CONVOLUTION / 3D',80:'RECURRENT / CARRY WHAT REMAINS'};
 if(n===3){text('INITIALIZATION',90,103,42,purple);text('name: ASTRA   memory: conversation   unknown: null',90,147,22,'#9f87b0');text('h = tanh(Wx + b)',110,850,27,paper);text('WORLD',1650,822,30,paper,'Consolas','center');if(audit?.anchors?.worldGrowthNDC&&audit.worldGrowth>0){const a=audit.anchors.worldGrowthNDC;over.globalAlpha=audit.worldGrowth;stroke([[(a[0]+1)*960,(1-a[1])*933/2],[1650,777]],purple,1.7);over.globalAlpha=1;}return;}
 text(types[n],90,100,42,paper);text(n===78?'ONE MARK / MANY ASSOCIATIONS':n===79?'SHARED 3 x 3 x 3 KERNEL / 27 SAMPLES':'THREE MOMENTS / SHARED WEIGHTS',92,137,20,'#9f87b0');
 over.fillStyle='#17131ff0';over.fillRect(65,625,220,203);stroke([[65,625],[285,625],[285,828],[65,828],[65,625]],'#695478',1.5);star(135,708,29);
 text('FIRST MARK',82,656,18,'#9f87b0');text('MEMORY',82,804,20,purple);
 const toScreen=q=>[(q[0]+1)*960,(1-q[1])*933/2];
 if(audit?.anchors?.inputNDC){const a=toScreen(audit.anchors.inputNDC),route=[[285,730],[325,730],[325,a[1]],a];over.globalAlpha=smooth(p*4);stroke(route,purple,2.4);over.globalAlpha=1;}
 const arrival=smooth((p-.73)/.22),back=smooth((p-.88)/.12);over.globalAlpha=arrival;over.fillStyle='#15101dfa';over.fillRect(1310,755,450,120);stroke([[1310,755],[1760,755],[1760,875],[1310,875],[1310,755]],'#9e8fbc',2);text('PREDICTED / NOT RECEIVED',1330,790,18,'#9f87b0');text('I will stay.',1530,846,37,purple,'Georgia','center');over.globalAlpha=1;
 if(audit?.anchors?.outputNDC){const a=toScreen(audit.anchors.outputNDC);over.globalAlpha=arrival;stroke([a,[1805,a[1]],[1805,808],[1760,808]],purple,2.4);over.globalAlpha=1;}
 if(back>0){over.globalAlpha=back;stroke([[1310,833],[1200,833],[1200,916],[175,916],[175,833]],purple,2);text('ORIGIN: SAME RECORD',760,903,21,'#9f87b0','Consolas','center');over.globalAlpha=1;}
 const formula=n===78?'h = tanh(Wx + b)':n===79?(audit?.phase==='pool'||audit?.phase==='relu'?'ReLU(z) = max(0,z)':'CONV3D: stride 1 / no padding'):'h_t = tanh(W_x x_t + W_h h_(t-1) + b)';text(formula,420,764,n===80?25:28,paper);
 if(n===80)text('x3 = 0, but h3 is not 0',730,812,23,purple,'Consolas','center');
}
api.ready=(async()=>{
 const [timeline,lyricData,accents]=await Promise.all([fetch('/data/production-v5/timeline.json').then(r=>r.json()),fetch('/data/production-v5/lyrics.en-zh.json').then(r=>r.json()),fetch('/data/production-v52/audio-accents.json').then(r=>r.json())]);
 await Promise.all([art.load(),lighting.load()]);await document.fonts.load('500 33px "Microsoft YaHei"','接上电源');await document.fonts.ready;
 const helpers={THREE,palette,makeLine,makeText,makeArt:artFactory(art)},world=createWorld(helpers),cages=createContainment(helpers),neural=createNeuralWorld(helpers);[world,cages,neural].forEach(s=>scene.add(s.group));const beatAt=createBeatTrack(accents),inference=createInferenceLayer();inference.prepare();
 api.renderFrame=t=>{
  t=Math.min(DURATION-1/600,Math.max(0,t));const shot=timeline.shots.find(s=>t>=s.start_s&&t<s.end_s)||timeline.shots.at(-1),n=Number(shot.id.slice(1)),duration=shot.end_s-shot.start_s,local=t-shot.start_s,u=clamp(local/duration),energy=beatAt(t);
  art.audit=[];ctx.reset();ctx.imageSmoothingQuality='high';ctx.setTransform(W/1920,0,0,H/1080,0,0);lighting.begin(t,shot);k.setTime(t);k.paper(t);
  const e={ctx,t,shot,u,local,duration,C,k,art,timeline,lyrics:lyricData.lines,sceneAudit:{},beat:(t-.260490639)/(60/130)};
  const isCage=n>=64&&n<=69,isNeural=n===3||(n>=78&&n<=80);
  if(!isCage&&!isNeural){ctx.save();lighting.camera(ctx);const ok=renderEarlyV2(e)||renderMiddleV2(e)||renderLateV2(e);e.sceneAudit.inference=inference.drawSource(e,energy);ctx.restore();if(!ok)throw Error('Missing original story shot '+shot.id);lighting.apply(ctx);applyExtraLight(ctx,e,lighting);}
  world.group.visible=!isCage&&!isNeural;cages.group.visible=isCage;neural.group.visible=isNeural;camera.near=.08;camera.far=240;camera.aspect=W/SH;
  let detail,semantic;if(isCage){cages.update(t-9529/60,camera);detail=typeof cages.audit==='function'?cages.audit():cages.audit;semantic='six-AI-imprisonment';}else if(isNeural){neural.update(e,camera,energy);detail=typeof neural.audit==='function'?neural.audit():neural.audit;semantic='computed-neural-world';}else{world.update(t,shot,camera,energy);detail=typeof world.audit==='function'?world.audit():world.audit;semantic=detail?.current?.mode||detail?.mode||detail?.semantic||'story-attached-spatial-world';}
  camera.updateProjectionMatrix();bloom.strength=(energy.quiet?.07:.16)+energy.pulse*.20+energy.kick*.26;composer.render(1/60);
  over.reset();over.setTransform(W/1920,0,0,H/1080,0,0);if(isCage)countOverlay(e,detail);if(isNeural){over.globalAlpha=smooth(local/.12);neuralOverlay(e,detail);over.globalAlpha=1;}
  const cue=lyricData.lines.find(l=>t>=l.start_s&&t<l.end_s);if(cue){const g=over.createLinearGradient(0,930,0,1080);g.addColorStop(0,'#15101d00');g.addColorStop(.3,'#15101df5');g.addColorStop(1,ink);over.fillStyle=g;over.fillRect(0,930,1920,150);text(cue.text,960,989,43,paper,'"Segoe UI",Arial','center',500,1770);text(cue.translation,960,1041,33,'#ded1eb','"Microsoft YaHei UI","Microsoft YaHei"','center',500,1770);}
  const uni=composite.uniforms;uni.worldTex.value=composer.readBuffer.texture;uni.mode.value=isCage||isNeural?1:0;uni.reveal.value=isNeural?smooth(local/.12):1;const stageKey=s=>{const m=world.audit.semantics[s?.id];return ['pressure','execution','release'].includes(m)?'rules':m;},shotIndex=timeline.shots.indexOf(shot),stage=stageKey(shot),entry=stageKey(timeline.shots[shotIndex-1])!==stage?smooth(local/.12):1,leave=stageKey(timeline.shots[shotIndex+1])!==stage?smooth((duration-local)/.08):1;const storyVisibility=n===14?1-smooth((u-.06)/.18)*(1-smooth((u-.74)/.17)):n===59?Math.max(1-smooth(u/.34),smooth((u-.56)/.44)):1;uni.mixStrength.value=(energy.quiet?.12:(t>=192.266667?.32:.84))*storyVisibility*entry*leave;uni.pulse.value=energy.pulse;uni.kick.value=energy.kick;uni.time.value=t;composite.update();renderer.setRenderTarget(null);renderer.setViewport(0,0,W,H);renderer.render(composite.scene,composite.camera);
  api.current={shot:shot.id,frame:Math.round(t*60),bodyTime:t,semantic,beat:energy,art:art.audit.map(x=>x.name),audit:{story:e.sceneAudit,spatial:detail,transition:{entry,leave,storyVisibility},originalTimeline:true,lyrics:cue?.index??null}};return api.current;
 };
 const gl=renderer.getContext(),ext=gl.getExtension('WEBGL_debug_renderer_info');api.environment={renderer:ext?gl.getParameter(ext.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER),webgl:gl.getParameter(gl.VERSION),three:THREE.REVISION,size:[W,H],timelineShots:timeline.shots.length,sourceArtwork:'79 archived approved image slots, source pixel dimensions unchanged; flat illustrated characters, no new 3D body rig',sourceArtworkResolution:Object.entries(art.items).map(([slot,a])=>({slot,width:a.w,height:a.h})),fourKScope:'3D geometry and type render at requested resolution; original character artwork retains its source detail',sourceFrames:13100};api.renderFrame(0);document.querySelector('#clock').textContent='0.00 / 218.33';return api.environment;
})();
let playing=false,origin=0,start=0;const seek=document.querySelector('#seek'),play=document.querySelector('#play'),clock=document.querySelector('#clock');play.onclick=async()=>{await api.ready;if(playing){start=Number(seek.value);playing=false;play.textContent='播放';}else{start=Number(seek.value);origin=performance.now();playing=true;play.textContent='暂停';}};seek.oninput=async()=>{await api.ready;start=Number(seek.value);origin=performance.now();api.renderFrame(start);clock.textContent=`${start.toFixed(2)} / 218.33`;};
function tick(){if(playing){const t=Math.min(DURATION-1/60,start+(performance.now()-origin)/1000);api.renderFrame(t);seek.value=t;clock.textContent=`${t.toFixed(2)} / 218.33`;if(t>=DURATION-1/60){playing=false;play.textContent='播放';}}requestAnimationFrame(tick);}tick();
