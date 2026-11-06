/** Independent local Edge media decode check; never touches the user's tabs. */
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const work=path.join(root,'exports/audio-repair-v5');
const media={
  '/hires.mp4':'exports/astra-world-execute-me-final-v5-warning-hires-4k60.mp4',
  '/playback.mp4':'exports/astra-world-execute-me-final-v5-playback-4k60.mp4'
};
const server=http.createServer((req,res)=>{
  if(req.url==='/'){res.writeHead(200,{'Content-Type':'text/html'});res.end('<!doctype html><title>Local audio verification</title>');return;}
  const relative=media[req.url];
  if(!relative){res.writeHead(404);res.end();return;}
  const file=path.join(root,relative),size=fs.statSync(file).size;
  const match=/^bytes=(\d+)-(\d*)$/.exec(req.headers.range||'');
  const first=match?Number(match[1]):0,last=match&&match[2]?Math.min(Number(match[2]),size-1):size-1;
  if(first>last||first>=size){res.writeHead(416);res.end();return;}
  const headers={'Content-Type':'video/mp4','Content-Length':last-first+1,'Accept-Ranges':'bytes'};
  if(match)headers['Content-Range']=`bytes ${first}-${last}/${size}`;
  res.writeHead(match?206:200,headers);
  fs.createReadStream(file,{start:first,end:last}).pipe(res);
});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
let browser;
try{
  browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true,args:['--autoplay-policy=no-user-gesture-required']});
  const page=await browser.newPage();
  await page.goto(`http://127.0.0.1:${server.address().port}/`);
  const result=await page.evaluate(async()=>{
    const can=document.createElement('audio');
    const report={userAgent:navigator.userAgent,canPlay:{alac:can.canPlayType('audio/mp4; codecs="alac"'),aac:can.canPlayType('audio/mp4; codecs="mp4a.40.2"')},items:[]};
    for(const name of ['hires','playback']){
      const a=new Audio();a.preload='auto';a.src=`/${name}.mp4`;
      const ac=new AudioContext(),an=ac.createAnalyser();an.fftSize=2048;
      ac.createMediaElementSource(a).connect(an);an.connect(ac.destination);
      const item={name};
      try{
        await Promise.race([new Promise((resolve,reject)=>{a.onloadedmetadata=resolve;a.onerror=()=>reject(Error(`Media error ${a.error?.code}: ${a.error?.message}`));a.load();}),new Promise((_,reject)=>setTimeout(()=>reject(Error('metadata timeout')),12000))]);
        item.duration=a.duration;await ac.resume();a.currentTime=6;await a.play();
        let peak=0,sum=0,n=0;const samples=new Float32Array(an.fftSize);
        const start=performance.now();while(performance.now()-start<2000){an.getFloatTimeDomainData(samples);for(const x of samples){peak=Math.max(peak,Math.abs(x));sum+=x*x;n++;}await new Promise(r=>setTimeout(r,40));}
        item.currentTime=a.currentTime;item.peak=peak;item.rms=Math.sqrt(sum/n);item.nonzeroDecodedSignal=peak>0.001;item.error=a.error?{code:a.error.code,message:a.error.message}:null;
      }catch(e){item.error=String(e);item.nonzeroDecodedSignal=false;}
      a.pause();a.removeAttribute('src');a.load();await ac.close();report.items.push(item);
    }
    return report;
  });
  result.scope='Independent hidden Edge HTMLAudioElement + WebAudio analyser at output 6-8 seconds; tests browser decoding, not physical speakers or user app mute state.';
  result.compatiblePlaybackPassed=result.items.find(x=>x.name==='playback')?.nonzeroDecodedSignal===true;
  fs.writeFileSync(path.join(work,'browser-audio.json'),JSON.stringify(result,null,2)+'\n');
  console.log(JSON.stringify(result,null,2));
  if(!result.compatiblePlaybackPassed)process.exitCode=1;
}finally{await browser?.close();await new Promise(r=>server.close(r));}
