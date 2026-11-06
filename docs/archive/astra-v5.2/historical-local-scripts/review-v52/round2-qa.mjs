import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {chromium} from 'playwright-core';
const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,'../..');
const out=path.join(here,'round2-qa');
fs.mkdirSync(out,{recursive:true});
const hash=async p=>{const h=createHash('sha256');for await(const c of fs.createReadStream(p))h.update(c);return h.digest('hex');};
const baseline=JSON.parse(fs.readFileSync(path.join(root,'docs/production-v52/feedback-round2/protected-baseline.json'),'utf8'));
const protectedFiles=await Promise.all(baseline.map(async item=>{const p=path.join(root,item.path),exists=fs.existsSync(p),actual=exists?await hash(p):null;return {...item,exists,actual_sha256:actual,actual_bytes:exists?fs.statSync(p).size:null,unchanged:exists&&actual===item.sha256&&fs.statSync(p).size===item.bytes};}));
const report={timestamp:new Date().toISOString(),scope:'Read-only local page references, actual image decoding, desktop/mobile layout, and protected file hashes. No video playback, audio, dynamic composite, or user acceptance claim.',protectedFiles,pages:[]};
let browser;
try{
 browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true});
 for(const name of ['round2.html','index.html']){
  const file=path.join(here,name),html=fs.readFileSync(file,'utf8');
  const refs=[...new Set([...html.matchAll(/\b(?:href|src|poster)="([^"]+)"/g)].map(m=>m[1]).filter(s=>!s.startsWith('#')&&!/^[a-z]+:/i.test(s)))];
  const links=await Promise.all(refs.map(async href=>{const p=path.resolve(here,decodeURIComponent(href.split('#')[0]));const exists=fs.existsSync(p);return {href,path:path.relative(root,p),exists,inside_repository:!path.relative(root,p).startsWith('..'),bytes:exists?fs.statSync(p).size:null,sha256:exists&&/\.(png|jpe?g)$/i.test(p)?await hash(p):null};}));
  const errors=[];const page=await browser.newPage({viewport:{width:1600,height:1100},deviceScaleFactor:1});
  page.on('pageerror',e=>errors.push(String(e)));
  await page.goto(pathToFileURL(file).href,{waitUntil:'domcontentloaded'});
  await page.evaluate(async()=>{for(const img of document.images)img.loading='eager';await Promise.all([...document.images].map(img=>img.decode()));});
  const images=await page.evaluate(()=>[...document.images].map(i=>({src:i.getAttribute('src'),complete:i.complete,width:i.naturalWidth,height:i.naturalHeight})));
  const desktop=await page.evaluate(()=>({viewport:innerWidth,scrollWidth:document.documentElement.scrollWidth,horizontalOverflow:document.documentElement.scrollWidth>innerWidth}));
  const stem=name==='round2.html'?'round2':'index';
  await page.screenshot({path:path.join(out,stem+'-desktop-top.png')});
  if(name==='round2.html'){
   for(const id of ['book','boundary','wave'])await page.locator('#'+id).screenshot({path:path.join(out,stem+'-'+id+'.png')});
   await page.locator('details').evaluateAll(ds=>ds.forEach(d=>d.open=true));
  }
  await page.setViewportSize({width:390,height:844});
  await page.evaluate(()=>scrollTo(0,0));
  const mobile=await page.evaluate(()=>({viewport:innerWidth,scrollWidth:document.documentElement.scrollWidth,horizontalOverflow:document.documentElement.scrollWidth>innerWidth}));
  await page.screenshot({path:path.join(out,stem+'-mobile-top.png')});
  report.pages.push({name,links,images,desktop,mobile,errors,checks:{all_local_references_exist:links.every(l=>l.exists),all_references_inside_repository:links.every(l=>l.inside_repository),all_images_decoded:images.every(i=>i.complete&&i.width>0&&i.height>0),no_page_errors:errors.length===0,no_desktop_horizontal_overflow:!desktop.horizontalOverflow,no_mobile_horizontal_overflow:!mobile.horizontalOverflow}});
  await page.close();
 }
 report.checks={all_23_protected_files_unchanged:protectedFiles.length===23&&protectedFiles.every(p=>p.unchanged),all_page_checks_pass:report.pages.every(p=>Object.values(p.checks).every(Boolean))};
 report.passed=Object.values(report.checks).every(Boolean);
 fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2)+'\n');
 console.log(JSON.stringify({passed:report.passed,checks:report.checks,pages:report.pages.map(p=>({name:p.name,refs:p.links.length,images:p.images.length,checks:p.checks,desktop:p.desktop,mobile:p.mobile,errors:p.errors})),report:path.join(out,'report.json')},null,2));
 if(!report.passed)process.exitCode=1;
}finally{await browser?.close();}
