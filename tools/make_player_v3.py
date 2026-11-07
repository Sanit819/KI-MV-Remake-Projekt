"""Generate a file:// player using the original FLAC as the playback clock."""
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "exports/v3/watch.html"

HTML = r'''<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>太陽系デスコ — 第三版</title>
<style>
:root{color-scheme:light;--red:#ff6452;--ink:#323232;--white:#fff;accent-color:var(--ink)}
*{box-sizing:border-box}html,body{margin:0;min-height:100%;background:var(--red);color:var(--ink)}
body{font-family:"Yu Gothic UI","Microsoft YaHei UI",Meiryo,sans-serif;padding:26px 24px 20px}
header{max-width:1280px;margin:0 auto 18px;display:flex;align-items:end;justify-content:space-between;gap:18px}
h1{font-size:clamp(28px,4.8vw,52px);font-weight:900;line-height:1.1;margin:0;letter-spacing:-.045em}
.cast{font-size:15px;font-weight:700;letter-spacing:.08em;white-space:nowrap;margin-bottom:3px}
.edition{font-size:12px;letter-spacing:.08em;display:block;margin-top:8px;font-weight:600}
#player{max-width:1280px;margin:auto;outline:none}
.picture{position:relative;width:100%;aspect-ratio:16/9;background:var(--red);overflow:hidden}
video{display:block;width:100%;height:100%;object-fit:contain;background:var(--red)}
.controls{padding:16px 0 0;display:grid;grid-template-columns:auto auto 1fr auto;gap:14px;align-items:center}
button{appearance:none;border:2px solid var(--ink);border-radius:0;background:transparent;color:var(--ink);font:inherit;font-size:14px;font-weight:700;padding:9px 15px;cursor:pointer;min-height:42px;white-space:nowrap}
button:hover{background:var(--ink);color:var(--white)}button:disabled{opacity:.55;cursor:wait}
button:focus-visible,input:focus-visible{outline:3px solid var(--white);outline-offset:4px}
#play{background:var(--ink);color:var(--white);min-width:92px}#play:hover{background:var(--white);color:var(--ink)}
#clock{font-family:Consolas,"Courier New",monospace;font-size:14px;font-variant-numeric:tabular-nums;white-space:nowrap}
#seek{width:100%;height:24px;margin:0;cursor:pointer}#seek:disabled{cursor:wait}
.below{display:flex;justify-content:space-between;gap:16px;align-items:start;min-height:25px;margin-top:12px;font-size:12px;font-weight:600}
#status{margin:0;max-width:65%;min-height:18px}#hint{margin:0;text-align:right;opacity:.78}
#player:fullscreen{max-width:none;width:100vw;height:100vh;background:var(--red);padding:18px 26px;display:flex;flex-direction:column;justify-content:center}
#player:fullscreen .picture{width:100%;min-height:0;max-height:calc(100vh - 110px);flex:1;aspect-ratio:auto}
#player:fullscreen .controls,#player:fullscreen .below{width:100%;max-width:1600px;margin-left:auto;margin-right:auto}
@media(max-width:650px){body{padding:20px 12px}header{display:block}.cast{margin-top:10px}.controls{grid-template-columns:auto 1fr auto;gap:10px}#seek{grid-row:2;grid-column:1/-1}#clock{justify-self:center}#hint{display:none}#status{max-width:100%}button{padding:8px 12px}#player:fullscreen{padding:10px}}
</style>
</head>
<body>
<header><div><h1 lang="ja">太陽系デスコ</h1><span class="edition">第三版</span></div></header>
<main id="player" tabindex="-1" aria-label="太陽系デスコ播放器">
  <div class="picture">
    <video id="picture" muted playsinline preload="auto" aria-label="MV画面">
      <source src="taiyoukei-disco-v3-video.mp4" type="video/mp4">
    </video>
    <audio id="song" preload="auto" src="../../local-source/audio/07%20%E5%A4%AA%E9%99%BD%E7%B3%BB%E3%83%87%E3%82%B9%E3%82%B3.flac"></audio>
  </div>
  <div class="controls">
    <button id="play" type="button" aria-label="开始播放">开始播放</button>
    <output id="clock" for="seek">00:00 / 03:23</output>
    <input id="seek" type="range" min="0" max="203.2" step="0.01" value="0" aria-label="播放进度" aria-valuetext="0分0秒">
    <button id="fullscreen" type="button" aria-label="进入全屏">全屏</button>
  </div>
  <div class="below"><p id="status" role="status" aria-live="polite">正在准备…</p><p id="hint">空格 播放／暂停 · ← → 前后5秒 · F 全屏</p></div>
</main>
<script>
(() => {
  'use strict';
  const video = document.getElementById('picture');
  const audio = document.getElementById('song');
  const play = document.getElementById('play');
  const seek = document.getElementById('seek');
  const clock = document.getElementById('clock');
  const status = document.getElementById('status');
  const player = document.getElementById('player');
  const fullscreen = document.getElementById('fullscreen');
  let requestedPlaying = false;
  let playToken = 0;
  let dragging = false;
  let mediaError = false;
  let frameRequest = 0;
  const requestedTimeFromLocation = () => {
    const value = new URLSearchParams(location.search).get('t')
      ?? new URLSearchParams(location.hash.replace(/^#/, '')).get('t');
    return value === null ? null : Number(value);
  };
  let initialSeekApplied = false;
  video.muted = true;
  video.volume = 0;
  audio.volume = 1;

  const duration = () => Number.isFinite(audio.duration) ? audio.duration : 203.2;
  const formatTime = t => {
    const s = Math.max(0, Math.floor(Number(t) || 0));
    return String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0');
  };
  const showState = () => {
    const t = audio.currentTime || 0;
    const d = duration();
    seek.max = d;
    if (!dragging) seek.value = Math.min(t, d);
    clock.textContent = formatTime(t) + ' / ' + formatTime(d);
    seek.setAttribute('aria-valuetext', Math.floor(t / 60) + '分' + Math.floor(t % 60) + '秒');
    play.textContent = requestedPlaying ? '暂停' : (audio.ended ? '重新播放' : '开始播放');
    play.setAttribute('aria-label', play.textContent);
  };
  const syncVideo = (force = false) => {
    if (!video.readyState || video.seeking) return;
    let target = audio.currentTime || 0;
    if (Number.isFinite(video.duration)) target = Math.min(target, Math.max(0, video.duration - .001));
    if (force || Math.abs(video.currentTime - target) > .075) video.currentTime = target;
  };
  const tick = () => {
    frameRequest = 0;
    syncVideo();
    showState();
    if (requestedPlaying) frameRequest = requestAnimationFrame(tick);
  };
  const pause = () => {
    requestedPlaying = false;
    ++playToken;
    audio.pause();
    video.pause();
    if (frameRequest) cancelAnimationFrame(frameRequest);
    frameRequest = 0;
    showState();
  };
  const seekTo = value => {
    const t = Math.max(0, Math.min(duration(), Number(value) || 0));
    audio.currentTime = t;
    syncVideo(true);
    showState();
  };
  const start = async () => {
    if (requestedPlaying) return;
    const token = ++playToken;
    mediaError = false;
    if (audio.ended || audio.currentTime >= duration() - .02) seekTo(0);
    syncVideo(true);
    requestedPlaying = true;
    status.textContent = '';
    showState();
    // Both play() calls occur in the user's click/key activation. No audio conversion.
    try {
      await Promise.all([audio.play(), video.play()]);
      if (token !== playToken) return;
      if (!frameRequest) frameRequest = requestAnimationFrame(tick);
    } catch (error) {
      if (token !== playToken) return;
      pause();
      status.textContent = '暂时无法播放，请重新点击播放，或在浏览器中打开本页。';
    }
  };
  const toggle = () => requestedPlaying ? pause() : start();
  const checkReady = () => {
    if (audio.readyState >= 1 && video.readyState >= 1 && !mediaError) {
      status.textContent = '';
      if (!initialSeekApplied) {
        initialSeekApplied = true;
        const initialTime = requestedTimeFromLocation();
        if (initialTime !== null && Number.isFinite(initialTime)) {
          pause();
          seekTo(initialTime);
        }
      }
    }
    showState();
  };
  const fail = which => {
    mediaError = true;
    pause();
    status.textContent = which + '未能打开，请确认本页与项目文件仍放在一起，然后重新打开本页。';
  };
  play.addEventListener('click', toggle);
  video.addEventListener('click', toggle);
  seek.addEventListener('pointerdown', () => { dragging = true; });
  seek.addEventListener('input', () => seekTo(seek.value));
  const finishDrag = () => { dragging = false; syncVideo(true); showState(); };
  seek.addEventListener('change', finishDrag);
  seek.addEventListener('pointerup', finishDrag);
  seek.addEventListener('pointercancel', finishDrag);
  const applyLocationTime = () => { initialSeekApplied = false; checkReady(); };
  window.addEventListener('hashchange', applyLocationTime);
  window.addEventListener('popstate', applyLocationTime);
  audio.addEventListener('loadedmetadata', checkReady);
  video.addEventListener('loadedmetadata', () => { checkReady(); syncVideo(true); });
  audio.addEventListener('timeupdate', showState);
  audio.addEventListener('seeked', () => { syncVideo(true); showState(); });
  video.addEventListener('seeked', () => { if (requestedPlaying && !video.ended) video.play().catch(() => {}); });
  audio.addEventListener('ended', () => { pause(); syncVideo(true); showState(); });
  audio.addEventListener('error', () => fail('音乐'));
  video.addEventListener('error', () => fail('画面'));
  const toggleFullscreen = async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await player.requestFullscreen();
    } catch { status.textContent = '此浏览器暂不支持全屏，可以放大窗口观看。'; }
  };
  fullscreen.addEventListener('click', toggleFullscreen);
  document.addEventListener('fullscreenchange', () => {
    fullscreen.textContent = document.fullscreenElement ? '退出全屏' : '全屏';
    fullscreen.setAttribute('aria-label', document.fullscreenElement ? '退出全屏' : '进入全屏');
  });
  document.addEventListener('keydown', event => {
    if (event.target instanceof HTMLInputElement || event.ctrlKey || event.metaKey || event.altKey) return;
    if (event.code === 'Space') {
      // A focused button already receives a native click from Space.
      if (event.target instanceof HTMLButtonElement) return;
      event.preventDefault(); toggle();
    }
    if (event.code === 'ArrowRight') { event.preventDefault(); seekTo(audio.currentTime + 5); }
    if (event.code === 'ArrowLeft') { event.preventDefault(); seekTo(audio.currentTime - 5); }
    if (event.code === 'KeyF') { event.preventDefault(); toggleFullscreen(); }
  });
  showState();
})();
</script>
</body>
</html>
'''


def main():
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT.write_text(HTML, encoding="utf-8", newline="\n")
    print(OUTPUT)


if __name__ == "__main__":
    main()
