/** Exact, bounded source changes for the approved-cat patch. */
export const MANIFEST='assets/astra/v12-approved-cat/manifest.json';
export const SOURCE_EDITS=[
 {file:'art.js',before:'/assets/astra/v09/manifest.json',after:'/'+MANIFEST,reason:'Use the approved cat source manifest'},
 {file:'early.js',before:"action(e,'A19',u,box,{phases:[.32,.75]})",after:"action(e,'A19',u,box,{phases:[48/180-1e-10,134/180-1e-10]})",reason:'R30 pose cuts at source frames 4965 and 5051, with sub-frame floating tolerance'},
 {file:'early.js',before:'const gridX=lerp(source[0]-105,145,focus),gridY=lerp(source[1]-105,225,focus),cell=lerp(30,48,focus),show=prog(u,.04,.18)*(1-prog(u,.84,.97));',after:'const gridFocus=smooth(prog(u,.10,.28)),gridX=lerp(source[0]-105,145,gridFocus),gridY=lerp(source[1]-105,225,gridFocus),cell=lerp(30,48,gridFocus),show=prog(u,.04,.18)*(1-prog(u,.80,.90));',reason:'R30 input grid stays on the left and fades there during the response'},
 {file:'early.js',before:'const output=[965,410],returnPath=[output,[965,640],hand]',after:'const output=[lerp(965,350,response),410],returnY=Math.min(825,hand[1]+180),returnPath=[output,[output[0],returnY],[hand[0]-90,returnY],hand]',reason:'R30 output line approaches the real hand from below and avoids the face'},
 {file:'early.js',before:'k.circle(hand[0]+p*240,hand[1]-p*20,18+p*46',after:'k.circle(hand[0]-p*220,hand[1]+p*65,18+p*46',reason:'R30 response waves travel left and down away from the face'},
 {file:'early.js',before:"text(e,'purrrrr...',1040,825,52",after:"text(e,'purrrrr...',285,805,52",reason:'R30 purr caption uses the left negative space'}
];

export function compareCatRenderer(name,original,current){
 let normalized=current;
 const edits=SOURCE_EDITS.filter(x=>x.file===name);
 for(const edit of edits){
  if(original.split(edit.before).length!==2||current.split(edit.after).length!==2)throw Error('Expected one exact approved source change: '+name+' / '+edit.reason);
  normalized=normalized.replace(edit.after,edit.before);
 }
 if(normalized!==original)throw Error('Unexpected renderer logic change '+name);
 return{name,identical_except_declared_changes:true,allowed_changes:edits.map(e=>e.reason)};
}
