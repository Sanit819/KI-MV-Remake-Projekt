import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {chromium} from 'playwright-core';
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const pageFile=path.join(ROOT,'docs/shot-review-20261105/index.html'),out=path.join(ROOT,'exports/shot-review-20261105');
const browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true,args:['--disable-gpu']});
try{
 const page=await browser.newPage({viewport:{width:1440,height:1100}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(pathToFileURL(pageFile).href);await page.waitForFunction(()=>window.__reviewReady===true);
 const cards=await page.locator('article.shot').count();
 await page.locator('#climax').click();const filtered=await page.locator('article.shot:not(.hidden)').count();
 await page.locator('#R71 .inspect').click();await page.waitForFunction(()=>document.querySelector('#refImg').complete&&document.querySelector('#refImg').naturalWidth>0);
 const before=await page.locator('#frame').inputValue();await page.locator('#nextFrame').click();const after=await page.locator('#frame').inputValue();
 await page.waitForFunction(()=>document.querySelector('#ourImg').complete&&document.querySelector('#ourImg').naturalWidth>0);
 await page.screenshot({path:path.join(out,'inspector-desktop.png')});
 await page.locator('#nextShot').click();const nextTitle=await page.locator('#vtitle').innerText();
 await page.locator('#close').click();await page.locator('#all').click();
 const badLinks=await page.evaluate(()=>[...document.querySelectorAll('img')].filter(i=>i.complete&&i.naturalWidth===0).map(i=>i.src));
 await page.locator('#search').fill('R73');const searchCount=await page.locator('article.shot:not(.hidden)').count();
 await page.locator('#R73').screenshot({path:path.join(out,'discussion-desktop.png')});
 await page.setViewportSize({width:390,height:844});await page.screenshot({path:path.join(out,'discussion-mobile.png')});
 const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+2);
 const result={cards,climax_filtered:filtered,frame_before:+before,frame_after:+after,next_shot_title:nextTitle,search_count:searchCount,bad_loaded_images:badLinks,js_errors:errors,mobile_horizontal_overflow:overflow};
 if(cards!==87||filtered!==7||+after!==+before+1||!nextTitle.startsWith('R72')||searchCount!==1||errors.length||badLinks.length||overflow)throw Error(JSON.stringify(result));
 fs.writeFileSync(path.join(ROOT,'docs/shot-review-20261105/browser-check.json'),JSON.stringify(result,null,2)+'\n');
 console.log(JSON.stringify(result));
}finally{await browser.close()}
