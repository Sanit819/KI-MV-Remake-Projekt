/** Static 4K inspection sheets using the exact production Art renderer. */
import fs from 'node:fs';import path from 'node:path';import http from 'node:http';
import {fileURLToPath} from 'node:url';import {chromium} from 'playwright-core';
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..'),OUT=path.join(ROOT,'exports/qa-v5-actions');
fs.mkdirSync(OUT,{recursive:true});
const mime={'.js':'text/javascript','.html':'text/html','.json':'application/json','.png':'image/png','.svg':'image/svg+xml','.m4a':'audio/mp4','.css':'text/css'};
const server=http.createServer((req,res)=>{
 const url=new URL(req.url,'http://localhost'),p=decodeURIComponent(url.pathname),file=path.resolve(ROOT,'.'+p);
 if(p==='/__art_review'){
  res.setHeader('Content-Type','text/html');
  res.end(`<canvas id="stage" width="3840" height="2160"></canvas><script type="module">
  import {Art} from '/src/mv5/art.js';
  const canvas=document.querySelector('canvas'),art=new Art(canvas.getContext('2d',{willReadFrequently:true}));
  const ready=(async()=>{const man=await fetch('/assets/astra/v09/manifest.json').then(r=>r.json()),group=new URLSearchParams(location.search).get('group');if(group)man.assets=Object.fromEntries(Object.entries(man.assets).filter(([n,a])=>a.actionGroup===group));await art.load(man);})();
  window.sample={art,canvas,ready};</script>`);return;
 }
 if(p==='/favicon.ico'){res.writeHead(204);res.end();return;}
 if(!['/src/','/assets/','/data/','/media/'].some(x=>p.startsWith(x))||!file.startsWith(ROOT+path.sep)||!fs.existsSync(file)){res.writeHead(404);res.end();return;}
 res.setHeader('Content-Type',mime[path.extname(file)]||'application/octet-stream');fs.createReadStream(file).pipe(res);
});
await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;
try{
 browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true,args:['--ignore-gpu-blocklist','--use-angle=d3d11']});
 const page=await browser.newPage({viewport:{width:1920,height:1080}});page.setDefaultTimeout(0);page.on('pageerror',e=>console.error(e.stack));page.on('console',m=>{if(m.type()==='error')console.error(m.text());});
 const gi=process.argv.indexOf('--group'),group=gi<0?'':process.argv[gi+1];if(group&&!/^A\d{2}$/.test(group))throw Error('Invalid group');
 await page.goto(`http://127.0.0.1:${server.address().port}/__art_review?group=${group}`,{timeout:60000});await page.evaluate(()=>window.sample.ready);
 const groups=await page.evaluate(()=>[...new Set(Object.values(window.sample.art.items).map(a=>a.actionGroup).filter(Boolean))].sort());
 for(const group of groups){
  const r=await page.evaluate(group=>{const s=window.sample,c=s.canvas.getContext('2d'),names=Object.keys(s.art.items).filter(n=>s.art.items[n].actionGroup===group).sort();c.reset();c.setTransform(2,0,0,2,0,0);c.fillStyle='#15101d';c.fillRect(0,0,1920,1080);const ww=1920/names.length;for(let i=0;i<names.length;i++){const x=i*ww; s.art.place(names[i],x+25,50,ww-50,900);c.fillStyle='#f7ead7';c.font='28px Consolas';c.fillText(names[i],x+30,1010);for(const [key,p] of Object.entries(s.art.items[names[i]].anchors||{})){const q=s.art.anchorRect(names[i],x+25,50,ww-50,900,key);c.strokeStyle='#edc087';c.lineWidth=1.5;c.beginPath();c.arc(...q,8,0,Math.PI*2);c.stroke();c.font='13px Consolas';c.fillText(key,q[0]+10,q[1]);}}return {png:s.canvas.toDataURL('image/png').split(',')[1],names};},group);
  fs.writeFileSync(path.join(OUT,group+'.png'),Buffer.from(r.png,'base64'));console.log(group+' '+r.names.join(', '));
 }
}finally{if(browser)await browser.close();server.closeAllConnections();await new Promise(r=>server.close(r));}
