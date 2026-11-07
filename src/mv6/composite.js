import {THREE} from './common.js';
export function createComposite(base,mask,overlay){
 const texture=c=>{const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.minFilter=THREE.LinearFilter;t.magFilter=THREE.LinearFilter;t.generateMipmaps=false;return t;};
 const baseTexture=texture(base),maskTexture=texture(mask),overlayTexture=texture(overlay);
 const uniforms={baseTex:{value:baseTexture},maskTex:{value:maskTexture},overlayTex:{value:overlayTexture},worldTex:{value:null},mode:{value:0},reveal:{value:1},mixStrength:{value:.7},pulse:{value:0},kick:{value:0},time:{value:0},resolution:{value:new THREE.Vector2(base.width,base.height)}};
 const material=new THREE.ShaderMaterial({uniforms,depthTest:false,depthWrite:false,toneMapped:false,
 vertexShader:'varying vec2 vUv; void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}',
 fragmentShader:`uniform sampler2D baseTex,maskTex,overlayTex,worldTex; uniform float mode,reveal,mixStrength,pulse,kick,time;uniform vec2 resolution; varying vec2 vUv;
 void main(){
  float stageBottom=147.0/1080.0;
  vec2 uv=vUv;
  if(uv.y>stageBottom){vec2 center=vec2(.5,(1.+stageBottom)*.5);uv=center+(uv-center)/(1.+kick*.006);}
  vec4 base=texture2D(baseTex,uv);float actor=texture2D(maskTex,uv).a;
  vec2 worldUv=vec2(uv.x,clamp((uv.y-stageBottom)/(1.-stageBottom),0.,1.));
  vec3 world=texture2D(worldTex,worldUv).rgb;
  vec3 ink=vec3(.0075,.0052,.0123);
  float colorDistance=length(base.rgb-ink);
  float fg=smoothstep(.008,.047,colorDistance);
  fg=max(fg,actor);
  vec3 color=base.rgb;
  if(uv.y>stageBottom){
   if(mode>.5)color=mix(base.rgb,world,reveal);
   else{float strength=mixStrength*(1.-fg);color=mix(base.rgb,world,strength);}
   float light=(1.-actor)*pulse*.045;
   color+=vec3(.44,.32,.59)*light*smoothstep(.02,.4,dot(color,vec3(.2126,.7152,.0722)));
  }
  vec4 top=texture2D(overlayTex,vUv);color=mix(color,top.rgb,top.a);
  gl_FragColor=vec4(color,1.);
  #include <colorspace_fragment>
 }`});
 const scene=new THREE.Scene(),camera=new THREE.OrthographicCamera(-1,1,1,-1,0,1);scene.add(new THREE.Mesh(new THREE.PlaneGeometry(2,2),material));
 return{scene,camera,uniforms,update(){baseTexture.needsUpdate=true;maskTexture.needsUpdate=true;overlayTexture.needsUpdate=true;}};
}
