/** Merge inspected originals, rejecting missing, duplicated or incomplete poses. */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const partial=process.argv.includes('--partial');
const expected=[2,3,2,3,3,2,3,2,2,3,3,2,3,3,2,2,2,2,3,3,2];
const read=p=>JSON.parse(fs.readFileSync(path.join(ROOT,p),'utf8'));
const base=read('assets/astra/v08/manifest.json'),assets={...base.assets},seen=new Map(),counts={};
for(const owner of ['early','middle','root-middle','late']){
 const file=`assets/astra/v09/${owner}-assets.json`;
 if(!fs.existsSync(path.join(ROOT,file))){if(partial)continue;throw Error('Missing '+file);}
 for(const [name,a] of Object.entries(read(file).assets)){
  if(a.provenance?.prompt?.startsWith('/assets/'))a.provenance.prompt=a.provenance.prompt.slice(1);
  if(assets[name])throw Error('Duplicate key '+name);
  if(!/^A\d{2}_\d{2}$/.test(name)||name.slice(0,3)!==a.actionGroup||Number(name.slice(4))!==a.phase)throw Error('Invalid action name/group/phase '+name);
  if(!partial&&(a.styleRevision<2||a.faceTreatment!=='shadow'))throw Error('Final ordinary pose must use corrected style and inspected shadow face: '+name);
  if(!partial&&(!a.provenance?.inspected||!a.provenance?.source||!a.provenance?.prompt||!fs.existsSync(path.resolve(ROOT,a.provenance.prompt))))throw Error('Missing inspected image-generation provenance '+name);
  const resolved=path.resolve(ROOT,'.'+a.path);if(!resolved.startsWith(path.join(ROOT,'assets/astra/v09')+path.sep)||!fs.existsSync(resolved))throw Error('Missing/invalid original '+a.path);
  const bytes=fs.readFileSync(resolved),sha256=createHash('sha256').update(bytes).digest('hex');
  if(bytes.subarray(1,4).toString()!=='PNG')throw Error('Not PNG '+name);
  if(seen.has(sha256))throw Error('Duplicated pose bytes '+name+' '+seen.get(sha256));seen.set(sha256,name);
  if(!Object.keys(a.anchors||{}).length)throw Error('No inspected anchors '+name);
  for(const [key,p] of Object.entries(a.anchors)){if(!Array.isArray(p)||p.length!==2||!p.every(Number.isFinite)||p[0]<0||p[1]<0||p[0]>bytes.readUInt32BE(16)||p[1]>bytes.readUInt32BE(20))throw Error('Invalid anchor '+name+'.'+key);}
  assets[name]={...a,sha256,source_width:bytes.readUInt32BE(16),source_height:bytes.readUInt32BE(20)};counts[a.actionGroup]=(counts[a.actionGroup]||0)+1;
 }
}
const missing=[];expected.forEach((n,i)=>{const group=`A${String(i+1).padStart(2,'0')}`;for(let phase=1;phase<=n;phase++){const name=`${group}_${String(phase).padStart(2,'0')}`;if(!assets[name])missing.push(name);}if((counts[group]||0)>n)throw Error('Unexpected extra pose '+group);});
if(missing.length&&!partial)throw Error('Incomplete final original poses: '+missing.join(', '));
const shadowComplete=!missing.length&&Object.entries(assets).filter(([name])=>/^A\d{2}_\d{2}$/.test(name)).every(([,a])=>a.faceTreatment==='shadow');
const manifest={status:partial||!shadowComplete?'v5-in-production':'v5-complete-original-action-assets',date:new Date().toISOString(),style:base.style,face_policy:'Every new ordinary action uses an original-drawn dark face with eyes hidden. Only v4 eye/recognition source-art closeups reveal the face.',shadow_complete:shadowComplete,anchor_note:base.anchor_note,new_pose_count:seen.size,new_group_count:Object.keys(counts).length,expected_new_pose_count:52,missing,groups:counts,assets};
fs.writeFileSync(path.join(ROOT,'assets/astra/v09/manifest.json'),JSON.stringify(manifest,null,2)+'\n');
console.log(JSON.stringify({complete:!missing.length,new_poses:seen.size,groups:counts,missing,total_assets:Object.keys(assets).length}));
