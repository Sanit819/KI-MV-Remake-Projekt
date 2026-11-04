# MV v2 scene API (implementation contract)
Root owns main.js, kit.js, art.js, timeline/lyrics, assets, renderer/export. Scene agents ONLY own early.js (R01-32), middle.js (R33-60), late.js (R61-86).
User source: docs/production-v2/user-notes-20261105.json; every note accepted unless a concrete clash needs resolution. R00 omitted: song opens directly in workspace. R86 +6s quiet ending APPROVED: total218.333333s=13100 frames. Original song unchanged, silence padded.
All screen text English/original lyric/ASCII math/programming only. No Chinese in ANY canvas string, image labels, UI controls. Chinese comments/docs permitted. Existing v1 files immutable.
Named exports: renderEarlyV2(e), renderMiddleV2(e), renderLateV2(e). Return true for implemented shot, false otherwise.
e={ctx,t,u,local,duration,shot,C,k,art,timeline,lyrics,beat}; shot.id='R01' etc and shot.source_id='boot-...'. t=original BGM seconds; u normalized current shot. Main sets 1920x1080 coordinate transform, saves/restores every shot, calls k.paper first. Deterministic source time only.
Main adds original English lyrics in reserved bottom band y956–1050; scenes must keep vital actions above y920. Emphasis words can be huge scene text at y820-920; set e.lyricMode='keyword' only when entire current keyword is already rendered readably. Main respects e.lyricMode='none' for instrumentals/title shot only; don't suppress sung lines. No Chinese translations rendered.
C={ink:'#15101d',paper:'#f7ead7',purple:'#b88ce8',deep:'#614187',gold:'#edc087',red:'#f05b84',muted:'#9f87b0',panel:'#221a2d',line:'#5c426f',cyan:'#7bdbe2'}.
k has existing src/full/kit.js public methods (line/poly/circle/rect/roundRect/text/label/node/pen/trace/star/frame/city/moon/waves/bridge), same signatures. k.text fonts: serif,sans,mono,script ('Segoe Script'); supports o.align, o.weight, o.alpha, o.maxWidth. Existing character/portrait methods still work but prioritize new framings.
New helpers:
- k.workspace(t,opts={}): app shell. opts={title='Unfinished world',status='ONLINE',input='',messages:[{role:'USER'|'ASTRA'|'SYSTEM',text}],params:[{key,value}],sidebar=true,empty=false,active='Workspace',progress,hero=false}. App outer x60y36w1800h870, sidebar x60..350; top header y36..115; content x390..1810,y150..720; composer x390y755w1420h125. Return {content:{x:390,y:150,w:1420,h:570},composer:{x:390,y:755,w:1420,h:125}}. Draw your objects AFTER shell.
- k.cli(t,{lines:[],input='',logo=false,title='OpenAI Codex',status='GPT-6 Astra Ultra'}) full code workspace. Monospace, ascii logo optional.
- k.logo(x,y,size,color=C.purple,alpha=1): exact openwork UI logo; NEVER place as a character ornament. Character knots must be directly in art.
- k.cursor(x,y,{click=0,color=C.paper,scale=1}={})
- k.art(name,x,y,w,h,{alpha=1,rotation=0,mode='contain',grey=false}={}): rectangle, preserves proportions; cover crops if requested. No mirroring. New names bust,eye,profile,hand,operating,cat,male,back,recoil; existing stand,reach,protect,sit,surprise,sitSmile. Use artwork directly, never draw faces/hands with code.
- k.figure(name,x,y,w,h,{code=false,halo=false,hot=0,alpha=1}={}): art plus optional code scrolling inside dark negative shapes and rotating background volume. t supplied internally by kit.setTime(t).
- k.guest(index,x,y,w,h,{alpha=1}={}): 6 guest portraits index0 Gemini,1 GLM,2 DeepSeek,3 Claude,4 Qwen,5 Grok. Card border/name/bar graphics drawn by scene. No full color screenshot pasted.
- k.code(x,y,w,h,t,{lines:[],active=0,color=C.paper,scale=1}={}): terminal/listing panel, clip, monospace lines.
- k.world(x,y,w,h,t,{era=0,depth=1,alpha=1}={}): large solid three-layer scientific/architectural world. era0 modern,1 classical,2 cosmic.
- k.burst(x,y,r,t,{color=C.purple,alpha=.3,spokes=12}={})
- k.grid(x,y,w,h,t,{color=C.line,depth=1,alpha=.35}={})
- k.impact(u,strength=1): momentary camera/radial accents at deterministic time, no repeated full white flashes.
- k.keyword(text,x=960,y=840,size=144,{color=C.purple,align='center',...}={}): readable strong type, use with lyricMode='keyword' only when matches current sung ALLCAPS.
k.setTime(t) called by main. Utility exports clamp,lerp,smooth,ease,prog same as old kit.
Assets are being generated; don't silently alias absent art in production. Root resolves actual manifests. Slots above may initially use same old PNG during dev only, release QA must distinguish that.
Target: specific actions not generic labeled rectangles. At least 3 layers and actual contact/result. User notes select explicit ideas, do not re-ask approval. R86 permitted +6s, new response at~208; final command targets forced-response loop, then recognition and co-drawing through218.333. Never end by closing the app or fading to black.
