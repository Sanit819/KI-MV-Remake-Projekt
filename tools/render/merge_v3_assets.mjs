import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const dir=path.join(root,'assets/astra/v08');
const manifest=JSON.parse(fs.readFileSync(path.join(root,'assets/astra/v07/manifest.json'),'utf8'));
manifest.status='v3-user-revision';
manifest.assets.reach.anchors.wrist=[1010,293];
manifest.revision='New contextual actions, refined face; source-drawn knots. Older v2 files preserved.';
const loaded=[];
for(const file of ['early-assets.json','middle-assets.json','face-assets.json']){
 const p=path.join(dir,file);
 if(!fs.existsSync(p)){if(process.argv.includes('--partial'))continue;throw Error(`Missing production assets fragment ${file}`);}
 const data=JSON.parse(fs.readFileSync(p,'utf8'));
 if(!data.assets)throw Error(`Invalid asset fragment ${file}`);
 Object.assign(manifest.assets,data.assets);loaded.push(file);
}
// The art defines the facial forms. These per-source exposure splits preserve
// those forms in the common three-ink palette without painting new geometry.
manifest.assets.eye.tonalThresholds=[65,16,160,22];
if(manifest.assets.midWait)manifest.assets.midWait.tonalThresholds=[40,12,125,22];
for(const [name,asset] of Object.entries(manifest.assets)){
 const file=path.resolve(root,'.'+asset.path);
 if(!file.startsWith(root+path.sep)||!fs.existsSync(file))throw Error(`Missing image ${name}: ${file}`);
}
fs.writeFileSync(path.join(dir,'manifest.json'),JSON.stringify(manifest,null,2)+'\n');
console.log(JSON.stringify({loaded,assets:Object.keys(manifest.assets)},null,2));
