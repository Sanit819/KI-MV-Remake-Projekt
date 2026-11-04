import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..'),DIR=path.join(ROOT,'docs/shot-review-20261105'),OUT=path.join(ROOT,'exports/shot-review-20261105');
const meta=JSON.parse(fs.readFileSync(path.join(DIR,'frame-index.json'),'utf8'));
const groups=['early','middle','late'].map(k=>JSON.parse(fs.readFileSync(path.join(DIR,'review-'+k+'.json'),'utf8').replace(/^\uFEFF/,'')));
const reviews=groups.flat(),ids=reviews.map(x=>x.review_id),missing=[],bad=[],evidence=new Set();
for(const s of meta.shots){const r=reviews.find(x=>x.review_id===s.review_id);if(!r){missing.push(s.review_id);continue}
 for(const key of ['title','composition','motion','astra_now','astra_proposal','discussion_prompt'])if(typeof r[key]!=='string'||r[key].length<3)bad.push(s.review_id+':'+key);
 for(const f of [s.board,s.boundary_strip])if(!fs.existsSync(path.join(DIR,f)))bad.push(f);
 for(const n of s.keyframes)if(!r.evidence_frames.includes(n))bad.push(s.review_id+':missing-keyframe-'+n);
 for(const n of r.evidence_frames){evidence.add(n);if(!Number.isInteger(n)||n<0||n>=meta.decoded_frames.ref||!fs.existsSync(path.join(OUT,'ref',String(n).padStart(6,'0')+'.jpg')))bad.push(s.review_id+':bad-frame-'+n)}
 for(const p of r.source_files)if(!fs.existsSync(p))bad.push(s.review_id+':missing-source:'+p);
}
const counts={ref:fs.readdirSync(path.join(OUT,'ref')).filter(x=>x.endsWith('.jpg')).length,ours:fs.readdirSync(path.join(OUT,'ours')).filter(x=>x.endsWith('.jpg')).length};
const metrics=JSON.parse(fs.readFileSync(path.join(OUT,'ref-frame-metrics.json'),'utf8'));
if(metrics.rows.length!==counts.ref||counts.ref!==6509||counts.ours!==12740)bad.push('frame counts');
const result={date:'2026-11-05',shot_count:meta.shots.length,review_count:reviews.length,unique_review_ids:new Set(ids).size,groups:groups.map(x=>x.length),missing_reviews:missing,invalid_items:bad,frame_counts:counts,all_reference_frames_numerically_measured:metrics.rows.length,distinct_human_review_evidence_frames:evidence.size,human_review_scope:'All 87 comparison boards; early/middle full cut strips and late selected strips. Evidence listed per shot, not a claim of human visual review of all 6509 frames.',same_music_offset_s:-0.08350936080898314,stored_source_hashes:meta.sha256};
if(missing.length||bad.length||new Set(ids).size!==87)throw Error(JSON.stringify(result));
fs.writeFileSync(path.join(DIR,'validation.json'),JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify(result));
