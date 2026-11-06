// Local read-only review server, including byte-range delivery of the old AAC copy.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const port=Number(process.argv[2]||8768);
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.json':'application/json','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.svg':'image/svg+xml','.m4a':'audio/mp4','.mp4':'video/mp4'};
http.createServer((req,res)=>{
 try{
  const p=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
  if(p==='/healthz'){res.writeHead(200,{'Content-Type':'application/json'});res.end(JSON.stringify({review_only:true,entry:'/src/mv52review/index.html'}));return;}
  if(p==='/favicon.ico'){res.writeHead(204);res.end();return;}
  if(req.method!=='GET'&&req.method!=='HEAD'){res.writeHead(405);res.end();return;}
  if(!['/src/mv52review/','/src/mv52/','/src/full/vendor/','/assets/','/data/production-v5/','/data/production-v52/','/data/production-v52review/','/exports/preview-v52-combination/'].some(x=>p.startsWith(x))&&p!=='/exports/astra-world-execute-me-final-v5-playback-4k60.mp4'){res.writeHead(403);res.end();return;}
  const file=path.resolve(ROOT,'.'+p);
  if(!file.startsWith(ROOT+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile()){res.writeHead(404);res.end();return;}
  const size=fs.statSync(file).size,headers={'Content-Type':mime[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store','Accept-Ranges':'bytes'};
  const range=req.headers.range?.match(/^bytes=(\d+)-(\d*)$/);
  if(range){const start=Number(range[1]),end=range[2]?Math.min(Number(range[2]),size-1):size-1;if(start>end||start>=size){res.writeHead(416,{'Content-Range':`bytes */${size}`});res.end();return;}res.writeHead(206,{...headers,'Content-Range':`bytes ${start}-${end}/${size}`,'Content-Length':end-start+1});if(req.method==='HEAD')res.end();else fs.createReadStream(file,{start,end}).pipe(res);}
  else{res.writeHead(200,{...headers,'Content-Length':size});if(req.method==='HEAD')res.end();else fs.createReadStream(file).pipe(res);}
 }catch(e){if(!res.headersSent)res.writeHead(500);res.end(String(e.message));}
}).listen(port,'127.0.0.1',()=>console.log(`Review only: http://127.0.0.1:${port}/src/mv52review/index.html?lighting=1`));
