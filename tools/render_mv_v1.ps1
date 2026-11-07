param([int]$Workers = 3)
$ErrorActionPreference = 'Stop'
$project = Split-Path -Parent $PSScriptRoot
$workspace = Split-Path -Parent $project
$pipeline = Join-Path $workspace 'vocaloid-style-mv-pipeline'
$env:FFMPEG = Join-Path $pipeline '_tools/ffmpeg/bin/ffmpeg.exe'
$env:BROWSER_HIGH_PERFORMANCE = '1'
$out = Join-Path $project 'exports/v1'
New-Item -ItemType Directory -Force -Path $out | Out-Null
$video = Join-Path $out 'taiyoukei-disco-v1-video.mp4'
$master = Join-Path $out 'taiyoukei-disco-v1-720p30-flac.mkv'
$song = Join-Path $project 'local-source/audio/07 太陽系デスコ.flac'
$renderTool = Join-Path $pipeline '_demo/tools/render_frames.mjs'
& node $renderTool --root $workspace --url Taiyoukei-Disco/production/v1/engine/index.html --out $video --start 0 --end 203.2 --fps 30 --width 1280 --height 720 --mode blob --workers $Workers --codec nvenc --preset p4 --cq 16 --selector 'canvas#out' --stats (Join-Path $out 'render-stats.json')
if ($LASTEXITCODE -ne 0) { throw 'Picture render failed' }
# Explicit maps exclude the FLAC cover-art video. Audio is copied, never encoded.
& $env:FFMPEG -v error -y -i $video -i $song -map 0:v:0 -map 1:a:0 -c:v copy -c:a copy -map_metadata -1 -metadata 'title=太陽系デスコ — Astra × ds / v1' $master
if ($LASTEXITCODE -ne 0) { throw 'FLAC stream-copy mux failed' }
& (Join-Path $pipeline '.venv/Scripts/python.exe') -X utf8 (Join-Path $project 'tools/verify_delivery_v1.py')
if ($LASTEXITCODE -ne 0) { throw 'Delivery validation failed' }
& (Join-Path $pipeline '.venv/Scripts/python.exe') -X utf8 (Join-Path $project 'tools/make_player_v1.py')
if ($LASTEXITCODE -ne 0) { throw 'Player build failed' }
Write-Host $master
