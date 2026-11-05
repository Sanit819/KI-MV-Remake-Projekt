/** Physical contact invariants: phase selection must never move a pinned hand. */
import assert from 'node:assert/strict';
import {Art} from '../../src/mv5/art.js';
const art=new Art({});
for(let phase=1;phase<=3;phase++)art.items[`A01_0${phase}`]={actionGroup:'A01',phase,bounds:{x:phase*7,y:phase*9,w:400+phase*20,h:800-phase*40},anchors:{hands:[100+phase*20,180+phase*8],pen:[120+phase*20,170+phase*8]}};
assert.equal(art.actionName('A01',-1),'A01_01');
assert.equal(art.actionName('A01',1),'A01_03');
assert.equal(art.actionName('A01',.29,{phases:[0,.3,.8,1]}),'A01_01');
assert.equal(art.actionName('A01',.3,{phases:[.3,.8]}),'A01_02');
for(const u of [0,.2,.4,.6,.8,1])for(const rotation of [0,-.35,.8]){
 const pose=art.actionLayout('A01',u,200,90,600,800,{anchor:'hands',target:[901,462],rotation});
 assert.ok(Math.hypot(pose.anchors.hands[0]-901,pose.anchors.hands[1]-462)<1e-9);
 assert.deepEqual(art.actionAnchor('A01',u,200,90,600,800,'hands',{anchor:'hands',target:[901,462],rotation}),pose.anchors.hands);
}
assert.throws(()=>art.actionName('MISSING',.2),/Missing/);
assert.throws(()=>art.actionName('A01',.2,{phases:[.8,.3]}),/Invalid/);
assert.throws(()=>art.actionAnchor('A01',0,0,0,600,800,'missing'),/Missing/);
console.log('Action thresholds and pinned physical contacts pass across distinct pose bounds and rotations.');
