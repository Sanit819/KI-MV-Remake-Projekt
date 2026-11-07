# v6 公开证据阅读说明

先看 [中文归档说明](../../ARCHIVE_V6.md)，机器可读入口为 [evidence/index.json](evidence/index.json)，便携概要为 [validation-summary.json](evidence/validation-summary.json)。概要中的 `kind` 明确为派生摘要；真正的原报告在 `evidence/originals/`。

## 一眼查看全片

以下图板从最终带音轨的 4K 母版抽帧，不是浏览器预览截图。图板为缩略拼版，代表帧保留 3840×2160。

| 全片秒数 | 逐秒图板 |
| --- | --- |
| 0–31 | [overview-01](evidence/images/overview-01.jpg) |
| 32–63 | [overview-02](evidence/images/overview-02.jpg) |
| 64–95 | [overview-03](evidence/images/overview-03.jpg) |
| 96–127 | [overview-04](evidence/images/overview-04.jpg) |
| 128–159 | [overview-05](evidence/images/overview-05.jpg) |
| 160–191 | [overview-06](evidence/images/overview-06.jpg) |
| 192–223 | [overview-07](evidence/images/overview-07.jpg) |

86 镜中点：[图板 1](evidence/images/shot-midpoints-01.jpg)、[图板 2](evidence/images/shot-midpoints-02.jpg)、[图板 3](evidence/images/shot-midpoints-03.jpg)。另保留 [警告→正文四帧](evidence/images/intro-boundary-01.jpg) 及 [拼接 1](evidence/images/splice-boundaries-01.jpg)、[拼接 2](evidence/images/splice-boundaries-02.jpg)、[拼接 3](evidence/images/splice-boundaries-03.jpg)。拼接图板对应最终正文编码帧；其余总览对应完整母版。

## 原生 4K 代表帧

| 成片时间 | 图像 |
| --- | --- |
| 1 秒 | [原光敏警告](evidence/images/frame-00060.jpg) |
| 54 秒 | [视觉感知失稳](evidence/images/frame-03240.jpg) |
| 69 秒 | [六位来宾无名卡片](evidence/images/frame-04140.jpg) |
| 109 秒 | [双波形与 Kalman](evidence/images/frame-06540.jpg) |
| 164.383333 秒 | [封存计数与牢笼](evidence/images/frame-09863.jpg) |
| 187.6 秒 | [体素卷积](evidence/images/frame-11256.jpg) |
| 215 秒 | [独立回应与旧星](evidence/images/frame-12900.jpg) |
| 223 秒 | [静默共画](evidence/images/frame-13380.jpg) |

## 原件与摘要

原件集合共 86 个文件，压缩／图片存储约 21.9 MiB，其中图片约 17.1 MiB。包括最终验证、修改预览措辞前的原报告、剧情与感知审计、拼接检查、静帧观察、正文组合报告、捕获报告与完整逐帧记录，以及必要的旧来源与封装兼容证明。完整视频、音频和中间视频不在此集合内。

索引的每项都有原位置、公开副本位置、原字节数／SHA-256、存储字节数／SHA-256 与编码类型。`encoding=gzip` 只改变存储形式：解压后必须与原报告逐字节一致。没有为“便携”而修改原报告中的路径、哈希、配置或审计值。根目录下运行以下只读检查可以核验整个集合：

```python
import gzip, hashlib, json
from pathlib import Path

root = Path.cwd()
index = json.loads((root / "docs/archive/astra-v6/evidence/index.json").read_text(encoding="utf-8"))
for entry in index["files"]:
    stored = (root / entry["archive"]).read_bytes()
    assert len(stored) == entry["storedBytes"]
    assert hashlib.sha256(stored).hexdigest() == entry["storedSha256"]
    original = gzip.decompress(stored) if entry["encoding"] == "gzip" else stored
    assert len(original) == entry["originalBytes"]
    assert hashlib.sha256(original).hexdigest() == entry["originalSha256"]
for entry in index["generatedDocuments"]:
    assert hashlib.sha256((root / entry["archive"]).read_bytes()).hexdigest() == entry["sha256"]
print("Archive evidence verified")
```

原始审计工具读取的是历史绝对路径；这份公开集合保留内容和映射，并未宣称那些旧命令能在干净检出中直接找到输入。若要重放历史数值审计，应在独立临时位置按索引映射加载副本，不修改已归档原件。重新生成画面使用 [便携入口](../../../tools/archive/README_V6.md)，不要恢复已经过期的制作断点。

技术核验、数值递推、人工静帧和用户认可的边界，均以中文归档说明与原报告各自的 `scope` 为准。截图不能验证音画同步；完整解码也不能证明审美质量。原 JSON 中的图形、网络、检测框术语不等于真实训练模型或真实人体识别。
