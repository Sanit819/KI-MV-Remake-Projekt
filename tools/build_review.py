"""Build an offline frame inspector from decoded evidence. No web dependencies."""
from pathlib import Path
import json, html
R=Path(__file__).resolve().parents[1]
def read(p): return json.loads((R/p).read_text(encoding='utf-8'))
frames=read('analysis/frame-index.json')['frames']
events=[
 (0,'纯红底起始','本地解码首帧；底色样本约 #FD5354。'),
 (34,'片头小字出现','A 段连续图板观察；文字先小后大。'),
 (622,'举手姿态 A','与 f634 对照；两人位置保持。'),
 (634,'举手姿态 B','局部换姿间隔12帧，24帧回到同侧姿态。'),
 (982,'拍手变体样本','基本举手循环之间插入双手近脸动作。'),
 (1940,'边缘小人入场','首个可见模糊边缘；此前f1939干净。'),
 (1948,'拍手与短线','手部放射线和边缘小人构成短促视觉重音。'),
 (1965,'一帧姿态混合','左侧上举姿态与前姿态手部同在，右侧仍双手近脸；不推断制作原因。'),
 (1966,'双人恢复举手','与上一帧对照，不能用秒级抽样替代。'),
 (2554,'密集文字段起点','文字逐行扩充为背景纹理；具体观察见B段。'),
 (2734,'稳定换姿段起点','至f2914，16次换姿相邻间隔均12帧。'),
 (3016,'左角色独立变体','举双手的局部动作打破双人完全同步。'),
 (3070,'拉丁大字块样本','上半部的大号拉丁字逐组、逐行累积，形成独立构图。'),
 (3153,'小角色滚动段','约105.1–107.5秒，小角色在中央双人后方穿行。'),
 (3262,'另一大字块样本','与前一段巨字对应，但不据此声称像素级复用。'),
 (3778,'中央前景字幕','文字覆盖人物上身，前后遮挡关系改变。'),
 (3874,'中央文字清空','原角色仍留在同一构图内。'),
 (4440,'边缘角色变体样本','148秒附近出现围绕双人的头部/手部图形。'),
 (4654,'后段光效加入','155.133秒起加入粉白闪点与横向光带。'),
 (4743,'12帧负片式闪变','f4743–4754，白底深色人物，f4755恢复常规配色。'),
 (4822,'边缘图形再次插入','160.733秒附近，与拍手动作组合。'),
 (5010,'小型中央字幕样本','清空巨字后形成短暂视觉留白。'),
 (5040,'呼应段样本','环绕小人和文字再次出现，叠加后段光效。'),
 (5470,'密集文字回归','182.333秒起，主体循环保持，背景重复纹理增加。'),
 (5854,'收尾曲名','f5854–5913，60帧/2秒；随后空出12帧。'),
 (5926,'致谢','f5926–6045，120帧/4秒的中央致谢。'),
 (6046,'无字收尾','最后50帧保留红底双人，无黑场。'),
 (6095,'最后一帧','203.167秒PTS，画面名义结束203.2秒。'),
]
data={'n':len(frames),'fps':30,'pts':[x['pts_seconds'] for x in frames],
      'delta':[x['mean_abs_change'] for x in frames],'events':[{'frame':f,'title':t,'note':d} for f,t,d in events]}
(R/'analysis/highlights.json').write_text(json.dumps(data['events'],ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
template=(R/'tools/review.template.html').read_text(encoding='utf-8')
(R/'index.html').write_text(template.replace('__DATA__',json.dumps(data,ensure_ascii=False,separators=(',',':'))),encoding='utf-8')
print('Built offline inspector: index.html; frames:',len(frames),'highlights:',len(events))
