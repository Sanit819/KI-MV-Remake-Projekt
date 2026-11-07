import * as THREE from 'three';
import {Art} from '../mv52final/art.js';
export {THREE};
export const palette={bg:0x0a0812,ink:0x171021,purple:0x9a72cf,gold:0xe9c57a,pale:0xf3e6c9,muted:0x564569};
export const clamp=x=>Math.max(0,Math.min(1,x));
export const smooth=x=>{x=clamp(x);return x*x*(3-2*x)};
export function makeLine(points,color=palette.gold,opacity=1){const g=new THREE.BufferGeometry().setFromPoints(points.map(p=>p.isVector3?p:new THREE.Vector3(...p)));return new THREE.Line(g,new THREE.LineBasicMaterial({color,transparent:opacity<1,opacity}));}
export function makeText(text,{width=4,height=1,color='#f3e6c9',fontSize=64,background=null,align='center'}={}){
 const c=document.createElement('canvas');c.width=Math.max(256,Math.ceil(width*180));c.height=Math.max(128,Math.ceil(height*180));const x=c.getContext('2d');
 if(background){x.fillStyle=background;x.fillRect(0,0,c.width,c.height)}
 x.fillStyle=color;x.textAlign=align;x.textBaseline='middle';const lines=text.split('\n'),size=Math.min(fontSize*c.height/128,c.height/(lines.length*1.35));x.font=`500 ${size}px "Segoe UI", sans-serif`;
 lines.forEach((s,i)=>x.fillText(s,align==='center'?c.width/2:align==='left'?12:c.width-12,c.height/2+(i-(lines.length-1)/2)*size*1.25,c.width-20));
 const texture=new THREE.CanvasTexture(c);texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=8;
 return new THREE.Mesh(new THREE.PlaneGeometry(width,height),new THREE.MeshBasicMaterial({map:texture,transparent:true,alphaTest:.015,side:THREE.DoubleSide,depthWrite:false,toneMapped:false}));
}
export async function prepareArt(){
 const manifest=await fetch('/data/production-v52final/manifest.json').then(r=>r.json());
 const names=['A02_02','A04_02','A13_03'],c=document.createElement('canvas'),art=new Art(c.getContext('2d'));
 await art.load({assets:Object.fromEntries(names.map(n=>[n,manifest.assets[n]]))});
 const textures={};
 for(const n of names){const a=art.items[n],b=a.bounds,canvas=document.createElement('canvas');canvas.width=b.w;canvas.height=b.h;canvas.getContext('2d').drawImage(a.canvas,b.x,b.y,b.w,b.h,0,0,b.w,b.h);const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=8;textures[n]=texture;}
 return function makeArt(name,height=6){const a=art.items[name];if(!a)throw Error('Unprepared artwork '+name);const b=a.bounds,w=height*b.w/b.h,g=new THREE.Group();const mesh=new THREE.Mesh(new THREE.PlaneGeometry(w,height),new THREE.MeshBasicMaterial({map:textures[name],transparent:true,alphaTest:.05,side:THREE.DoubleSide,depthWrite:true,toneMapped:false}));g.add(mesh);g.userData.anchors=Object.fromEntries(Object.entries(a.anchors||{}).map(([k,p])=>[k,new THREE.Vector3((p[0]-b.x-b.w/2)/b.h*height,(b.y+b.h/2-p[1])/b.h*height,.015)]));g.userData.source=name;return g;};
}
