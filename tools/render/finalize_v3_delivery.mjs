import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const abs=p=>path.join(root,p),read=p=>JSON.parse(fs.readFileSync(abs(p),'utf8'));
async function hash(p){const h=createHash('sha256');for await(const b of fs.createReadStream(abs(p)))h.update(b);return h.digest('hex');}
const records=[
 ['exports/astra-world-execute-me-full-v3-4k60.full-verify.json','docs/validation/astra-full-v3-4k60.verify.json'],
 ['exports/astra-world-execute-me-full-v3-4k60.timestamps.json','docs/validation/astra-full-v3-4k60.timestamps.json'],
 ['exports/astra-world-execute-me-full-v3-4k60.parallel.render.json','docs/validation/astra-full-v3-4k60.render.json'],
 ['exports/astra-world-execute-me-full-v3-1080p60.full-verify.json','docs/validation/astra-full-v3-1080p60.verify.json'],
 ['exports/astra-world-execute-me-full-v3-1080p60.timestamps.json','docs/validation/astra-full-v3-1080p60.timestamps.json'],
 ['exports/astra-world-execute-me-full-v3-1080p60.downscale.render.json','docs/validation/astra-full-v3-1080p60.render.json'],
 ['exports/qa-v3-final/qa-v3.json','docs/validation/astra-v3-runtime.json'],
 ['exports/qa-v3-middle-final/middle-runtime.json','docs/validation/astra-v3-middle.json'],
];
const loaded=records.map(([p])=>read(p));
for(let i=0;i<loaded.length;i++)if(loaded[i].passed!==true)throw Error(`Incomplete/failed verification: ${records[i][0]}`);
const [v4,,,v1080,,,runtime]=loaded;
for(const v of [v4,v1080]){
 const relative=path.relative(root,v.file);
 if(relative.startsWith('..')||await hash(relative)!==v.video_sha256)throw Error('Video hash differs from verified delivery');
}
for(const source of runtime.source_sha256)if(await hash(source.path)!==source.sha256)throw Error(`Source changed after runtime QA: ${source.path}`);
for(const asset of runtime.assets)if(await hash('.'+asset.path)!==asset.sha256)throw Error(`Asset changed after runtime QA: ${asset.name}`);
for(const [key,p] of [['timeline','data/production-v3/timeline.json'],['lyrics','data/production-v3/lyrics.en-zh.json'],['manifest','assets/astra/v08/manifest.json']])if(await hash(p)!==runtime.input_hashes[key])throw Error(`Input changed after runtime QA: ${p}`);
const previous=[
 ['exports/astra-world-execute-me-full-v2-4k60.mp4','3a52d4f32bdb3ad914b941cf8f96161eaa8dcf627d76dc724e1a01760df45b24'],
 ['exports/astra-world-execute-me-full-v2-1080p60.mp4','80fbd62ee2a6876350b12b0198105969d6cd31fe84982523fda0302dd97320d9'],
];
for(const [p,expected] of previous)if(await hash(p)!==expected)throw Error(`Preserved v2 differs: ${p}`);
for(const [src,dest] of records)fs.copyFileSync(abs(src),abs(dest));
const preservation={passed:true,checked_at:new Date().toISOString(),previous:previous.map(([file,sha256])=>({file,sha256,unchanged:true})),runtime_inputs_unchanged:true,delivered_hashes:[v4,v1080].map(x=>({file:x.file,sha256:x.video_sha256,bytes:x.bytes}))};
fs.writeFileSync(abs('docs/validation/astra-v3-delivery-preservation.json'),JSON.stringify(preservation,null,2)+'\n');
const table=[['4K60 母版',v4,'4k60'],['1080p60 播放版',v1080,'1080p60']].map(([label,v,suffix])=>`| [${label}](../exports/astra-world-execute-me-full-v3-${suffix}.mp4) | ${v.resolution.join(' × ')} / 60 fps | ${v.bytes.toLocaleString('en-US')} bytes | \`${v.video_sha256}\` |`).join('\n');
const doc=`# ASTRA 完整 MV v3 交付

2026-11-05。86 镜、218.333333 秒、13,100 帧；完整 Mili 原版音轨与已确认的 6 秒安静共画尾段。此次为针对用户十点反馈的完整影片修订。

| 文件 | 规格 | 大小 | SHA256 |
|---|---|---|---|
${table}

## 本次修订

| 反馈 | 成片里的处理 |
|---|---|
| 0:35 手突兀 | R10 使用连贯肩臂、不同持笔手，实体笔尖与圆周同点；角色从画边进入 |
| 0:37 脚突兀 | R11 删除脚，改独立绘制的垂直持笔动作；正弦曲线与解析切线在笔尖交会 |
| 0:53 手与静态方块 | R15 换伸指拖动姿势，移除方块；时间尺、AD/BC 年份与城市联动 |
| 茄子/番茄切面 | 从果实同一曲线轮廓求切口宽度，上下切面与皮相接；分别画弯曲种子带和番茄种腔 |
| 手部重复 | 新画五种动作；中后段原孤立手也换为完整接收、护星、作画或伸手人物。旧 hand 只用于开机接电镜 |
| 1:53 拼接姿势 | R45 一张完整头肩肘腕手的等待姿势，无独立手部拼贴 |
| 1:55 时间变化 | R46 明确逐级显示 1 second → 1 hour → 1 day → 1 week → 1 month，五级轨道持续保留 |
| 2:00 马赛克 | R48 对实际人物图像做低分辨率像素替换，依角色 alpha 从左上向右下覆盖到 100% |
| 五官与追加眼型纠正 | v01 新脸被用户否定后重画 v02，改原人设窄杏眼、细睫毛、小椭圆高光与闭口；R50/R70/R71 已接入 |
| 中文字幕 | 128 条演唱 cue 烧入上英文、下用户原中文译文；界面和叙事文字仍英文/代码 |

画风保持有限紫色、深墨剪纸与程序图形。人物 GPT 镂空结饰直接在源图里绘制；没有后贴圆形图标。完整图、拒稿、提示词和源像素锚点均保存。暖尾声不改：新回应、认出、放松、继续共画。

## 验证与边界

- [661 点实际渲染](validation/astra-v3-runtime.json)：86 镜首中末、128 条双语 cue 首中末、尾声及专门时间/马赛克点，全部通过。中文仅来自用户所给译文，英文在上、中文在下；无 404 或 JS 异常。
- [中段连续 347 帧](validation/astra-v3-middle.json)：等待五级为 31/31/30/31/30 帧；马赛克的 194 帧真实 alpha 加权覆盖率单调从 0 到 1。连续指标检查不是连续人工观看。
- [4K 完整解码/音频](validation/astra-full-v3-4k60.verify.json)、[逐包 PTS](validation/astra-full-v3-4k60.timestamps.json)、[渲染记录](validation/astra-full-v3-4k60.render.json)通过；所有 13,100 帧完整解码、精确 60fps，八个原音频窗口均对齐，安静尾段保持 6 秒。
- [1080p 完整解码/音频](validation/astra-full-v3-1080p60.verify.json)、[时间戳](validation/astra-full-v3-1080p60.timestamps.json)、[缩制记录](validation/astra-full-v3-1080p60.render.json)通过，由同一母版缩制、AAC 直接复制。
- 重点源帧与图板实际查看记录：[早段](production-v3/EARLY.md)、[中段](production-v3/MIDDLE.md)、[脸部及晚段](production-v3/FACE.md)。最终 MP4 抽查见 [编码后记录](production-v3/ENCODED_QA.md)。未把静帧抽样或完整解码称作全片逐帧人工听看。
- [交付哈希与旧版保留](validation/astra-v3-delivery-preservation.json)：当前源码/资产匹配运行时记录，两版 v2 MP4 哈希不变。旧作品未覆盖。

这仍是动作原画、2.5D 镜头和程序动态图形的合成，不是逐帧重绘的人体动画。艺术效果由用户继续评价；本地交付不包含发布或演唱音色训练。

## 可复现入口

生产页 [src/mv3/index.html](../src/mv3/index.html)，[素材清单](../assets/astra/v08/manifest.json)，[双语歌词](../data/production-v3/lyrics.en-zh.json)，[双语 SRT](../data/production-v3/world-execute-me.en-zh.srt)。

仓库根目录依次运行 \`npm run full:v3:data\`、\`npm run full:v3:assets\`、\`npm run full:v3:qa\`、\`npm run full:v3:4k\`、\`npm run full:v3:1080\`。本机 Node/Edge/FFmpeg NVENC/Python 路径沿用既有制作工具。

最新范围以 [用户反馈原文](production-v3/USER_FEEDBACK.md) 为准：本轮明确恢复中文字幕，覆盖 v2 的全片无中文决定。
`;
fs.writeFileSync(abs('docs/FULL_MV_V3.md'),doc);
console.log(JSON.stringify({passed:true,delivery:'docs/FULL_MV_V3.md',preserved_v2:true,frames:v4.decoded_video_frames,files:preservation.delivered_hashes},null,2));
