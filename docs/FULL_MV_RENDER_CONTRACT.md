# Full MV renderer contract (2026-11-04)

Latest decision: user rejected ALL v01–v04 and old full character designs and the separate SVG/logo overlay method. User now says continue to a complete MV after the v05 cut-paper silhouette reset. The ONLY character style baseline is assets/astra/v05/style-bust.png plus user-style-reference.png. Dark featureless face, broad lavender/violet hair shapes, carved negative space; ornament is drawn directly WITH the character, never composited later. New assets are in assets/astra/final/. Use current 54-shot calibrated timeline unchanged. Full song is 12740 frames at 60 fps, 212.333333 seconds. No added preroll. Original audio stays unchanged.

Root owns src/full/{index.html,main.js,kit.js,art.js}, tools and assets. Chapter authors own only early.js (A–D) or late.js (E–H). Each exports `renderEarly(e)` or `renderLate(e)`, returning true if handled. No DOM, no per-frame pixel reads, no image files loaded by chapters.

e = {ctx,t,shot,u,local,duration,C,k,timeline}. Coordinates are 1920×1080; main handles output scaling. shot has id/start_s/end_s. u is [0,1] current shot progress, local is seconds from shot start. C={ink,paper,purple,gold,muted,red}; purple=ASTRA, gold=independent user, red only in errors. Use paper/ink large negative space, confident flat shapes and clear foreground/middle/background. No face deformation or hand-coded face. No color flipping of face, no flashes on every beat.

Common k helpers (bound to ctx):

- clamp(v,a=0,b=1), lerp(a,b,u), smooth(u), ease(u), prog(t,a,b).
- line(points,color,width=3,alpha=1), poly(points,fill,stroke=null,width=2,alpha=1), circle(x,y,r,fill,stroke=null,width=2,alpha=1), rect(x,y,w,h,fill,alpha=1), roundRect(x,y,w,h,r,fill,stroke=null,width=2,alpha=1).
- text(str,x,y,size=28,color=C.paper,{font:'serif'|'sans'|'mono',align:'left'|'center'|'right',alpha:1,weight:400}={}); fonts consistent. Original concise English copy only; don't fetch/write full song lyrics.
- star(x,y,r,{color:C.gold,progress:1,tail:true,newTail:false,fill:false,rotation:0,alpha:1,width:4}={}); five-point star with old/new bent-tail distinction. `half:true` draws first half only. Character-protect old star is gold; new star is purple half + independent gold half.
- trace(points,progress,color,width=4,{pen:true,alpha:1}={}); path reveals cumulatively with visible nib at end. `pen(x,y,color,angle=0,scale=1)`.
- character(name,x,y,height,{alpha:1,rotation:0,reveal:1,mode:'normal'}={}): center X, bottom Y. Names `stand`, `reach`, `protect`, `sit`, `sitSmile`; `sleep`, `surprise` may alias expression variants. No horizontal flip. Genuinely new pose assets will be ready before export. mode='grey' only for recorded/possible-state figures. Small rigid-body breathing/rotation is okay, not rubber deformation.
- portrait(name,x,y,w,h,{alpha:1}={}): rectangular head crop with natural aspect preserved and clipping; same names. For H03 switch sit→surprise→sitSmile with single-image cuts, no double face dissolve.
- anchor(name,x,y,height,key='hands'): returns [screenX,screenY] for a body source anchor (hands or pen) using exactly the same tight bounds and transform as character(). Root fills anchors after new art arrives. Use to put the OLD star in protecting hands. Do not assume old v04 coordinates.
- city(x,y,scale,{progress:1,order:0,broken:0,gold:0,alpha:1}={}): geometric skyline with lavender and occasional independent gold windows; baseline at y.
- moon(x,y,r,progress=1), waves(y,phase,color=C.purple,amplitude=25,alpha=1), bridge(x,y,w,{progress:1,broken:false,gold:0,alpha:1}={}).
- frame(x,y,w,h,{color:C.purple,alpha:1,corners:false,width:2}={}), node(x,y,r,color=C.purple,alpha=1), label(str,x,y,color=C.muted).
- paper(t,light=false): background with deterministic quiet paper grain/dots and corner registration marks (main calls this already). Chapters may cover regions with their own flat planes.

Main adds subtle crop marks but NO generic HUD/timecode/shot label in the product. All scene text must mean something, not describe implementation. Scene-specific compositions fill the frame intentionally; avoid continuous slides with one figure at left and a subtitle at bottom. Match cuts via persistent stars/roads, paper masks and shifting frames. The settled story is in docs/STORY.md and docs/STORYBOARD.md.

Keep old star distinct from NEW incomplete/shared star. No real new gold input after D01 blocking until H02 at 195.0333; prewritten replay/forecast must be clearly framed and visually repeated. F04–F08 undo control BEFORE gold response, no self deletion. H04 alternation and bridge finish 200.5667–205.6333; shared new star lights 205.6333 peak206.1; tail after207.987 near-silent but continues small new marks. No end card over the last shared-drawing moment.
