import {clamp,smooth} from './common.js';
// Envelopes follow measured mix onsets in the archived soundtrack, not a fake BPM clock.
export function createBeatTrack(data){
 if(data.schema_version!==1||!Array.isArray(data.events))throw Error('Measured accent data missing');
 return t=>{
  const section=data.sections?.find(s=>t>=s.start_body&&t<s.end_body);
  const quiet=data.quiet_intervals?.some(s=>t>=s.start_body&&t<s.end_body)||section?.mode==='quiet'||t>=212.333333;
  let pulse=0,kick=0;const events=[];
  if(!quiet)for(const ev of data.events){const dt=t-ev.time_body;if(dt<0)break;if(dt>.32)continue;const env=smooth(dt/.010)*Math.exp(-Math.max(0,dt-.01)/.095)*ev.strength;
   pulse=Math.max(pulse,env);if(ev.accent==='strong'&&ev.confidence==='high'&&['kick','combined'].includes(ev.type))kick=Math.max(kick,env);if(env>.08)events.push(ev.id);}
  const restraint=(t>=110.8&&t<125.566667)?0:(t>=192.266667&&t<205.733333)?.22:1;
  return{pulse:clamp(pulse*restraint),kick:clamp(kick*restraint),quiet:Boolean(quiet),events,section:section?.id||null,source:'measured soundtrack mix onsets; not isolated drum stems'};
 };
}
