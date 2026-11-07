// Exercise the delivered file:// player; never modify the player or substitute its media.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';

const project=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const pipeline=path.join(path.dirname(project),'vocaloid-style-mv-pipeline');
const playerFile=path.join(project,'exports/v3.2/watch.html');
const outputDir=path.join(project,'exports/v3.2/review');
const fileURL=pathToFileURL(playerFile).href;
const html=fs.readFileSync(playerFile,'utf8');
const audioSource=html.match(/<audio\b[^>]*\bsrc="([^"]+)"/)?.[1];
const videoSource=html.match(/<source\b[^>]*\bsrc="([^"]+)"/)?.[1];
const resolveMedia=src=>src?fileURLToPath(new URL(src,fileURL)):null;
const preflight={
  fileURL, playerExists:fs.existsSync(playerFile),
  audioSource, audioExists:audioSource?fs.existsSync(resolveMedia(audioSource)):false,
  videoSource, videoExists:videoSource?fs.existsSync(resolveMedia(videoSource)):false,
  originalFLAC:/\.flac$/i.test(audioSource||''),
  expectedVideo:videoSource==='taiyoukei-disco-v3.2-video.mp4',
  requiredControls:['picture','song','play','seek','clock','fullscreen','player','status'].every(id=>html.includes(`id="${id}"`)),
  handlesHashChange:html.includes("addEventListener('hashchange'"),
  handlesPopState:html.includes("addEventListener('popstate'"),
};
const {launchBrowser,gpuArgs}=await import(pathToFileURL(path.join(pipeline,'_demo/tools/kit_env.mjs')));
preflight.browserLauncherImported=typeof launchBrowser==='function';
if(process.argv.includes('--preflight')){
  console.log(JSON.stringify({mode:'preflight-only',not_playback_validation:true,...preflight},null,2));
  process.exit(Object.values(preflight).some(value=>value===false)?1:0);
}
if(Object.values(preflight).some(value=>value===false))throw new Error('Player/media preflight failed: '+JSON.stringify(preflight));
fs.mkdirSync(outputDir,{recursive:true});
const report={schema_version:1,started_at:new Date().toISOString(),fileURL,status:'running',
  not_auditory_review:true,preflight,checks:[],samples:[],errors:[],
  drift_tolerance_seconds:.12,seek_tolerance_seconds:.035};
const browser=await launchBrowser({headless:true,args:[...gpuArgs(),'--mute-audio']});
const page=await browser.newPage({viewport:{width:1280,height:900}});
page.on('pageerror',error=>report.errors.push(String(error)));
const snapshot=async name=>{
  const value=await page.evaluate(()=>{
    const a=document.querySelector('#song'),v=document.querySelector('#picture');
    return {audioTime:a.currentTime,videoTime:v.currentTime,audioDuration:a.duration,videoDuration:v.duration,
      audioPaused:a.paused,videoPaused:v.paused,audioEnded:a.ended,videoEnded:v.ended,
      audioReady:a.readyState,videoReady:v.readyState,width:v.videoWidth,height:v.videoHeight,
      clock:document.querySelector('#clock').textContent,button:document.querySelector('#play').textContent,
      status:document.querySelector('#status').textContent,errorAudio:a.error?.message||null,errorVideo:v.error?.message||null,
      fullscreen:!!document.fullscreenElement,audioSource:a.currentSrc,videoSource:v.currentSrc,
      audioMuted:a.muted,videoMuted:v.muted,videoVolume:v.volume,
      seekValue:Number(document.querySelector('#seek').value),seekMax:Number(document.querySelector('#seek').max),
      documentWidth:document.documentElement.scrollWidth,viewportWidth:innerWidth};
  });
  value.name=name;value.driftSeconds=value.videoTime-value.audioTime;
  report.samples.push(value);return value;
};
const check=(name,passed,details)=>report.checks.push({name,passed:!!passed,details});
const paused=s=>s.audioPaused&&s.videoPaused;
const playing=s=>!s.audioPaused&&!s.videoPaused;
const synced=s=>Math.abs(s.driftSeconds)<=report.drift_tolerance_seconds;
const near=(a,b)=>Math.abs(a-b)<report.seek_tolerance_seconds;
const waitReady=()=>page.waitForFunction(()=>document.querySelector('#song')?.readyState>=2&&document.querySelector('#picture')?.readyState>=2,null,{timeout:30000});
const waitSettled=()=>page.waitForFunction(()=>!document.querySelector('#song').seeking&&!document.querySelector('#picture').seeking,null,{timeout:10000});
const bodyFocus=()=>page.locator('#player').focus();
const seekTo=async value=>{
  await page.locator('#seek').evaluate((element,time)=>{element.value=String(time);element.dispatchEvent(new Event('input',{bubbles:true}));element.dispatchEvent(new Event('change',{bubbles:true}));},value);
  await waitSettled();
};
const goto=async suffix=>{await page.goto(fileURL+suffix);await waitReady();await waitSettled();};
try{
  await goto('');
  let s=await snapshot('loaded');
  check('metadata',s.width===1280&&s.height===720&&near(s.audioDuration,203.2)&&Math.abs(s.videoDuration-203.2)<.05&&!s.errorAudio&&!s.errorVideo,s);
  check('initial_paused',paused(s)&&near(s.audioTime,0),s);
  check('original_flac_and_muted_picture',decodeURIComponent(s.audioSource).endsWith('07 太陽系デスコ.flac')&&s.videoSource.endsWith('taiyoukei-disco-v3.2-video.mp4')&&!s.audioMuted&&s.videoMuted&&s.videoVolume===0,s);
  check('desktop_layout',s.documentWidth<=s.viewportWidth,s);
  await page.locator('#play').click();
  await page.waitForFunction(()=>document.querySelector('#song').currentTime>.6);
  s=await snapshot('playing');check('play',playing(s)&&synced(s)&&s.button==='暂停',s);
  await page.locator('#play').click();
  s=await snapshot('paused');check('pause',paused(s),s);
  const frozen=s.audioTime;await page.waitForTimeout(220);
  s=await snapshot('paused_stability');check('paused_clock_stable',paused(s)&&near(s.audioTime,frozen),s);
  await bodyFocus();await page.keyboard.press('f');
  await page.waitForFunction(()=>!!document.fullscreenElement);
  s=await snapshot('keyboard_fullscreen');check('keyboard_f_fullscreen',s.fullscreen,s);
  await page.keyboard.press('f');await page.waitForFunction(()=>!document.fullscreenElement);
  const beforeArrow=(await snapshot('before_arrow')).audioTime;
  await bodyFocus();await page.keyboard.press('ArrowRight');await waitSettled();
  s=await snapshot('keyboard_seek');check('keyboard_arrow_seek',near(s.audioTime,beforeArrow+5)&&synced(s)&&paused(s),s);
  await page.keyboard.press('Space');await page.waitForFunction(()=>!document.querySelector('#song').paused);
  await page.waitForTimeout(250);s=await snapshot('keyboard_space_play');check('keyboard_space_play',playing(s)&&synced(s),s);
  await page.keyboard.press('Space');s=await snapshot('keyboard_space_pause');check('keyboard_space_pause',paused(s),s);
  await seekTo(186.5);s=await snapshot('paused_seek');check('paused_seek',near(s.audioTime,186.5)&&near(s.videoTime,186.5)&&paused(s),s);
  await page.locator('#play').click();await seekTo(50);await page.waitForTimeout(300);
  s=await snapshot('playing_seek');check('playing_seek',playing(s)&&s.audioTime>=50&&s.audioTime<51.5&&synced(s),s);
  await page.locator('#fullscreen').click();await page.waitForFunction(()=>!!document.fullscreenElement);
  s=await snapshot('fullscreen');check('fullscreen',s.fullscreen&&playing(s)&&synced(s),s);
  await page.locator('#fullscreen').click();await page.waitForFunction(()=>!document.fullscreenElement);
  await seekTo(202.65);await page.waitForFunction(()=>document.querySelector('#song').ended,null,{timeout:8000});
  s=await snapshot('ended');check('natural_end',s.audioEnded&&paused(s)&&s.button==='重新播放'&&synced(s),s);
  await page.locator('#play').click();await page.waitForFunction(()=>document.querySelector('#song').currentTime>.25&&document.querySelector('#song').currentTime<2);
  s=await snapshot('replay');check('replay',playing(s)&&s.audioTime<2&&synced(s),s);
  await page.evaluate(()=>{location.hash='t=195';});
  await page.waitForFunction(()=>Math.abs(document.querySelector('#song').currentTime-195)<.01);await waitSettled();
  s=await snapshot('hash_tail');check('hash_tail',near(s.audioTime,195)&&near(s.videoTime,195)&&paused(s),s);
  await goto('?t=195');s=await snapshot('query_tail');check('query_tail',near(s.audioTime,195)&&near(s.videoTime,195)&&paused(s),s);
  await goto('?t=999');s=await snapshot('upper_clamp');check('upper_clamp',near(s.audioTime,203.2)&&paused(s)&&synced(s),s);
  await goto('?t=-5');s=await snapshot('lower_clamp');check('lower_clamp',near(s.audioTime,0)&&paused(s)&&synced(s),s);
  await goto('?t=banana');s=await snapshot('invalid_ignored');check('invalid_ignored',near(s.audioTime,0)&&paused(s)&&!s.errorAudio&&!s.errorVideo,s);
  await goto('#t=202');
  await page.screenshot({path:path.join(outputDir,'player-tail-202.png'),fullPage:true});
  report.visual_screenshot='exports/v3.2/review/player-tail-202.png';
  check('no_page_errors',report.errors.length===0,report.errors);
}catch(error){
  report.errors.push(String(error.stack||error));
  check('runner_completed',false,String(error));
}finally{
  report.status=report.checks.length>=22&&report.checks.every(check=>check.passed)&&report.errors.length===0?'passed':'failed';
  report.finished_at=new Date().toISOString();
  fs.writeFileSync(path.join(outputDir,'player-validation.json'),JSON.stringify(report,null,2));
  await browser.close();
}
console.log(JSON.stringify({status:report.status,checks:report.checks.length,failed:report.checks.filter(check=>!check.passed).map(check=>check.name),output:path.join(outputDir,'player-validation.json')}));
process.exitCode=report.status==='passed'?0:1;
