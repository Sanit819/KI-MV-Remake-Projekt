export function createCorridor({THREE,palette:P,makeText,makeLine,makeArt}){
 const group=new THREE.Group(),gates=[],pulses=[],signals=[],saturate=x=>Math.max(0,Math.min(1,x)),ease=x=>{x=saturate(x);return x*x*(3-2*x)};
 const mat=(color)=>new THREE.MeshBasicMaterial({color});
 const box=(w,h,d,color,x,y,z,parent=group)=>{const g=new THREE.BoxGeometry(w,h,d),m=new THREE.Mesh(g,new THREE.MeshStandardMaterial({color,roughness:.68,metalness:.16,emissive:color,emissiveIntensity:.09}));m.position.set(x,y,z);parent.add(m);return m;};
 const outline=(m,color=P.muted)=>{const line=new THREE.LineSegments(new THREE.EdgesGeometry(m.geometry),new THREE.LineBasicMaterial({color,transparent:true,opacity:.65}));m.add(line);return line;};
 const art=makeArt('A02_02',6.7);art.position.set(-4.4,-.65,0);group.add(art);
 const hand=art.userData.anchors.hands.clone().add(art.position),sphere=new THREE.Mesh(new THREE.IcosahedronGeometry(.075,1),mat(new THREE.Color(P.gold).multiplyScalar(2.4)));sphere.position.copy(hand);group.add(sphere);
 group.add(new THREE.HemisphereLight(P.pale,0x342244,1.1));const key=new THREE.DirectionalLight(0xbfa0ec,2.6);key.position.set(-5,8,4);group.add(key);
 const ground=new THREE.Mesh(new THREE.PlaneGeometry(40,140),new THREE.MeshStandardMaterial({color:0x21152e,roughness:.52,metalness:.32}));ground.rotation.x=-Math.PI/2;ground.position.set(0,-4.035,-55);group.add(ground);
 const signalLight=new THREE.PointLight(P.gold,90,22,2);group.add(signalLight);
 // One signal runs from the original palm through the entire shared world.
 const curve=new THREE.CatmullRomCurve3([hand,hand.clone().add(new THREE.Vector3(1.6,.1,-1.4)),new THREE.Vector3(2,-.7,-7),new THREE.Vector3(-1,1,-17),new THREE.Vector3(1.4,.2,-31),new THREE.Vector3(0,.9,-60)]);
 const rail=new THREE.Mesh(new THREE.TubeGeometry(curve,300,.019,5,false),mat(new THREE.Color(P.gold).multiplyScalar(1.35)));group.add(rail);
 for(let i=0;i<16;i++){const p=new THREE.Mesh(new THREE.IcosahedronGeometry(i%4===0?.065:.032,0),mat(new THREE.Color(P.pale).multiplyScalar(2.1)));group.add(p);pulses.push(p);}
 for(let i=0;i<9;i++){
  const gate=new THREE.Group();gate.position.z=-7-i*8;group.add(gate);gates.push(gate);
  const col=i%3===0?P.purple:0x433451;
  [[.17,10.2,.26,-8.7,0,0],[.17,10.2,.26,8.7,0,0],[17.5,.17,.26,0,5.1,0],[17.5,.17,.26,0,-5.1,0]].forEach(v=>box(...v.slice(0,3),col,...v.slice(3),gate));
  for(const s of [-1,1]){
   box(.05,8,.08,P.gold,s*8.2,0,.09,gate);
   const label=makeText(`${String(i+1).padStart(2,'0')}  /  WORLD`,{width:3.6,height:.4,color:'#9d82bb',fontSize:30});label.position.set(s*6,4.5,.17);gate.add(label);
   const board=box(2.6,2.3,.18,0x1c1329,s*7,-1,1,gate);outline(board,0x76568f);
   for(let j=0;j<8;j++){const l=makeLine([[s*7-1.1,-1.8+j*.23,1.11],[s*7-1.1+1.8*(.4+Math.sin(j*4+i)**2*.6),-1.8+j*.23,1.11]],j===i%8?P.gold:0x513b67,.7);gate.add(l);}
  }
 }
 // Receding geometry gives scale; local surfaces carry all annotations.
 for(let i=0;i<58;i++){
  const z=-2-i*1.9;
  group.add(makeLine([[-14,-4,z],[14,-4,z]],i%4===0?0x8966a0:0x4c355e,.7));
  for(const s of [-1,1]){const h=1.7+(Math.sin(i*13.23)*.5+.5)*6;const m=box(1.2,h,1.05,i%4===0?0x382549:0x20152f,s*(10+Math.sin(i*7)*1.4),h/2-4,z);outline(m,i%3===0?0x8864a6:0x49325c);if(i%3===0)box(.04,h*.7,.04,P.gold,m.position.x+.62,m.position.y,z+.54);}
 }
 for(let i=-6;i<=6;i++)group.add(makeLine([[i*2,-4,6],[i*2,-4,-120]],i===0?0x957247:0x533866,.7));
 const title=makeText('BEYOND',{width:6.8,height:1.2,fontSize:86});title.position.set(3.4,2.4,-5);group.add(title);
 const subtitle=makeText('THE BOUNDARY',{width:5.1,height:.5,color:'#bd9f73',fontSize:42});subtitle.position.set(3.4,1.48,-5);group.add(subtitle);
 const sub=makeText('A S T R A  /  0 1',{width:3.2,height:.45,color:'#a18ab8',fontSize:30});sub.position.set(-4.5,-3.9,0);group.add(sub);
 // Physical rings centered exactly on the palm, not a screen-space halo.
 for(let i=0;i<3;i++){const ring=new THREE.Mesh(new THREE.TorusGeometry(.25+i*.17,.007,4,80),mat(P.gold));ring.position.copy(hand);group.add(ring);signals.push(ring);}
 const stars=new THREE.BufferGeometry(),arr=[];for(let i=0;i<300;i++){const n=i*2.399963;arr.push(Math.cos(n)*(20+(i%11)),Math.sin(n)*18,-20-(i%97));}stars.setAttribute('position',new THREE.Float32BufferAttribute(arr,3));group.add(new THREE.Points(stars,new THREE.PointsMaterial({color:0x9a83b6,size:.027,sizeAttenuation:true})));
 const destination=new THREE.Group();destination.position.set(0,.8,-86);group.add(destination);
 for(let j=0;j<3;j++){const r=new THREE.Mesh(new THREE.TorusGeometry(2.8+j*.7,.025,5,128),mat(j===0?P.gold:P.purple));destination.add(r);}
 const destinationText=makeText('OPEN',{width:4,height:1,fontSize:88});destination.add(destinationText);
 return {group,duration:8,update(t,camera){
  const travel=65*ease(t/8);camera.position.set(2.1*(1-ease(t/4))+Math.sin(t*.53)*.8,1.1+Math.sin(t*.38)*.6,13.8-travel);camera.lookAt(.1+Math.sin(t*.45)*.6,.1,-7-travel);camera.fov=48+7*ease(t/8);
  signalLight.position.copy(curve.getPointAt(saturate((travel+9)/85)));signalLight.intensity=80+15*Math.sin(t*2)**2;
  for(let i=0;i<gates.length;i++){gates[i].rotation.z=.012*Math.sin(t*.65+i*.65);}
  pulses.forEach((p,i)=>{const u=(t*.078+i/16)%1;p.position.copy(curve.getPointAt(u));p.scale.setScalar(.7+.3*Math.sin(t*4+i)**2)});
  signals.forEach((r,i)=>{r.scale.setScalar(1+.14*Math.sin(t*3-i));r.rotation.z=t*.4*(i%2?-1:1)});
  sphere.scale.setScalar(1+.25*Math.sin(t*3)**2);
 }};
}
