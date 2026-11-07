import * as THREE from 'three';
export {THREE};
export const palette={bg:0x111019,ink:0x15121d,purple:0x9e8fbc,pale:0xeee8df,gold:0xc5b993,muted:0x585065,red:0xe1717c};
export const clamp=x=>Math.max(0,Math.min(1,x));
export const smooth=x=>{x=clamp(x);return x*x*(3-2*x)};
export function makeLine(points,color=palette.purple,opacity=1){const g=new THREE.BufferGeometry().setFromPoints(points.map(p=>p.isVector3?p:new THREE.Vector3(...p)));return new THREE.Line(g,new THREE.LineBasicMaterial({color,transparent:opacity<1,opacity,depthWrite:false}));}
export function makeText(text,{width=4,height=1,color='#eee8df',fontSize=64,background=null,align='center'}={}){
 const c=document.createElement('canvas');c.width=Math.max(256,Math.ceil(width*180));c.height=Math.max(128,Math.ceil(height*180));const x=c.getContext('2d');
 if(background){x.fillStyle=background;x.fillRect(0,0,c.width,c.height)}
 x.fillStyle=color;x.textAlign=align;x.textBaseline='middle';const lines=text.split('\n'),size=Math.min(fontSize*c.height/128,c.height/(lines.length*1.35));x.font=`500 ${size}px Consolas, monospace`;
 lines.forEach((s,i)=>x.fillText(s,align==='center'?c.width/2:align==='left'?12:c.width-12,c.height/2+(i-(lines.length-1)/2)*size*1.25,c.width-20));
 const texture=new THREE.CanvasTexture(c);texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=8;
 return new THREE.Mesh(new THREE.PlaneGeometry(width,height),new THREE.MeshBasicMaterial({map:texture,transparent:true,alphaTest:.015,side:THREE.DoubleSide,depthWrite:false,toneMapped:false}));
}
export function artFactory(art){
 const textures={};
 return (name,height=6)=>{const a=art.items[name];if(!a)throw Error('Missing approved asset '+name);const b=a.bounds;
  if(!textures[name]){textures[name]=[a.canvas,a.gray].map(source=>{const c=document.createElement('canvas');c.width=b.w;c.height=b.h;c.getContext('2d').drawImage(source,b.x,b.y,b.w,b.h,0,0,b.w,b.h);const tx=new THREE.CanvasTexture(c);tx.colorSpace=THREE.SRGBColorSpace;tx.anisotropy=8;return tx;});}
  const group=new THREE.Group(),mat=new THREE.ShaderMaterial({uniforms:{baseMap:{value:textures[name][0]},greyMap:{value:textures[name][1]},grey:{value:0}},transparent:true,side:THREE.DoubleSide,depthWrite:true,toneMapped:false,vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:'uniform sampler2D baseMap,greyMap;uniform float grey;varying vec2 vUv;void main(){vec4 c=mix(texture2D(baseMap,vUv),texture2D(greyMap,vUv),grey);if(c.a<.06)discard;gl_FragColor=c;\n#include <colorspace_fragment>\n}'});group.add(new THREE.Mesh(new THREE.PlaneGeometry(height*b.w/b.h,height),mat));group.userData.setGrey=amount=>mat.uniforms.grey.value=clamp(amount);
  group.userData.anchors=Object.fromEntries(Object.entries(a.anchors||{}).map(([k,p])=>[k,new THREE.Vector3((p[0]-b.x-b.w/2)/b.h*height,(b.y+b.h/2-p[1])/b.h*height,.015)]));group.userData.source=name;return group;
 };
}
