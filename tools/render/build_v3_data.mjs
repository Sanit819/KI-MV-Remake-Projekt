import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const read=p=>JSON.parse(fs.readFileSync(path.join(root,p),'utf8'));
const old=read('data/production-v2/lyrics.en.json');
const supplied=read('data/lyrics/world-execute-me.en-zh.draft.json');
const translations=new Map(supplied.lines.filter(x=>x.kind==='sung').map(x=>[x.index,x]));
const lines=old.lines.map(cue=>{
 const pair=translations.get(cue.index);
 if(!pair||pair.original!==cue.text||!pair.translation)throw Error(`Missing or mismatched original/translation at ${cue.index}`);
 return {...cue,translation:pair.translation};
});
if(lines.length!==128)throw Error('Expected every one of the 128 sung cues');
const dir=path.join(root,'data/production-v3');fs.mkdirSync(dir,{recursive:true});
fs.writeFileSync(path.join(dir,'lyrics.en-zh.json'),JSON.stringify({source:'User supplied original and Chinese translation, preserved verbatim. Bilingual subtitles restored by explicit latest revision request.',timing:old.timing,layout:'Original above; Chinese below. Interface labels remain English/code.',lines},null,2)+'\n');
const stamp=f=>{let ms=Math.round(f*1000/60);const h=Math.floor(ms/3600000);ms%=3600000;const m=Math.floor(ms/60000);ms%=60000;const s=Math.floor(ms/1000);return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')},${String(ms%1000).padStart(3,'0')}`;};
fs.writeFileSync(path.join(dir,'world-execute-me.en-zh.srt'),lines.map((x,i)=>`${i+1}\n${stamp(x.start_frame)} --> ${stamp(x.end_frame)}\n${x.text}\n${x.translation}\n`).join('\n'));
console.log(JSON.stringify({cues:lines.length,translation_source:supplied.raw_sha256,first:lines[0],last:lines.at(-1)},null,2));
