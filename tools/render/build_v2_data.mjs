import fs from 'node:fs';
const base=new URL('../../',import.meta.url),read=p=>JSON.parse(fs.readFileSync(new URL(p,base),'utf8'));
const source=read('docs/shot-review-20261105/shot-index.json'),notes=read('docs/production-v2/user-notes-20261105.json').notes;
const shots=source.shots.filter(s=>s.number>0).map((s,i,all)=>({id:s.review_id,source_id:s.id,start_frame:i?Math.round(s.astra_start*60):0,end_frame:i===all.length-1?13100:Math.round(s.astra_end*60),note:notes[s.review_id],reference_start:s.reference_song_start,reference_end:s.reference_song_end}));
const rawLyrics=read('data/lyrics/world-execute-me.en-zh.draft.json').lines;
// Reference scene cuts were quantized independently of the actual word cues.
// Lock the six counts and climax edits to the measured-offset lyric cue frames.
const cueCuts={R64:98,R65:99,R66:100,R67:101,R68:102,R69:103,R70:104,R71:105,R72:107,R73:108,R74:110,R75:111,R76:113,R77:114,R78:116,R79:119,R80:122,R81:124,R86:128};
for(const [id,cue]of Object.entries(cueCuts)){const s=shots.find(x=>x.id===id);s.reference_cut_frame=s.start_frame;s.start_frame=rawLyrics.find(x=>x.index===cue).start_frame;s.timing_override='Cut follows original sung cue '+cue;}
for(let i=0;i<shots.length-1;i++)shots[i].end_frame=shots[i+1].start_frame;
for(const s of shots){s.start_s=s.start_frame/60;s.end_s=s.end_frame/60;}
for(let i=1;i<shots.length;i++)if(shots[i-1].end_frame!==shots[i].start_frame)throw Error('Gap before '+shots[i].id);
const lyrics=read('data/lyrics/world-execute-me.en-zh.draft.json').lines.filter(x=>x.kind==='sung').map(({index,original,start_frame,end_frame,start_s,end_s,emphasis})=>({index,text:original,start_frame,end_frame,start_s,end_s,emphasis}));
// The inherited four-second final display window extended into measured silence.
// Clear it at 208 s, before the new reply; do not change sung words or the soundtrack.
lyrics.at(-1).end_s=208;lyrics.at(-1).end_frame=12480;
const out=new URL('data/production-v2/',base);fs.mkdirSync(out,{recursive:true});
fs.writeFileSync(new URL('timeline.json',out),JSON.stringify({version:2,fps:60,total_frames:13100,duration:13100/60,quiet_tail:6,reference_commit:source.reference_commit,audio_offset:source.astra_offset_s,shots},null,2)+'\n');
fs.writeFileSync(new URL('lyrics.en.json',out),JSON.stringify({source:'User supplied lyrics; original text retained. English only per latest direction.',timing:'Reference cue windows plus measured music offset. Final display cleared at quiet reply, 208 s.',lines:lyrics},null,2)+'\n');
const stamp=f=>{const ms=Math.round(f/60*1000);return `${String(Math.floor(ms/3600000)).padStart(2,'0')}:${String(Math.floor(ms/60000)%60).padStart(2,'0')}:${String(Math.floor(ms/1000)%60).padStart(2,'0')},${String(ms%1000).padStart(3,'0')}`};
fs.mkdirSync(new URL('exports/subtitles/',base),{recursive:true});fs.writeFileSync(new URL('exports/subtitles/world-execute-me.v2.en.srt',base),lyrics.map((x,i)=>`${i+1}\n${stamp(x.start_frame)} --> ${stamp(x.end_frame)}\n${x.text}\n`).join('\n'));
console.log(JSON.stringify({shots:shots.length,frames:13100,cues:lyrics.length,duration:13100/60}));
