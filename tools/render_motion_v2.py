"""Layered pencil-style motion trial; all source PNGs are read-only.

Preview first. --quality final requires the root's explicit --approved flag.
This is enlarged 2D compositing with three character key poses, not 60 drawn poses.
"""
from __future__ import annotations
import argparse, hashlib, json, math, subprocess, time
from pathlib import Path
import cv2
import numpy as np
from PIL import Image, ImageDraw
import render_style_trials as shared

ROOT=Path(__file__).resolve().parents[1]
ASSETS=ROOT/'motion-tests/v2/assets'
OUT=ROOT/'exports/motion-v2'
FF=shared.FFMPEG
FPS=60; DURATION=30; N=1800
FLOWER_BOXES=[[53,69,505,571],[772,63,1079,571],[117,657,565,1180]]
FLOWER_ROOTS=[[366,567],[930,568],[286,1178]]
REX_BOXES=[[21,72,616,614],[630,64,1225,614],[21,659,616,1221]]
KEY_TIMES=[0,4,6.25,8.5,10.8,12.25,13.22,13.84,18.9,20.25,20.8,29.9]

def smooth(a,b,x):
    z=np.clip((x-a)/(b-a),0,1)
    return z*z*(3-2*z)

def write_json(path,obj):
    path.parent.mkdir(parents=True,exist_ok=True)
    tmp=path.with_suffix('.tmp.json')
    tmp.write_text(json.dumps(obj,ensure_ascii=False,indent=2,allow_nan=False)+'\n',encoding='utf8')
    tmp.replace(path)

def load_png(path):
    image=cv2.imdecode(np.fromfile(path,dtype=np.uint8),cv2.IMREAD_UNCHANGED)
    if image is None:raise ValueError(path)
    return image

def crop_sprite(atlas,box):
    x0,y0,x1,y1=box
    rgba=atlas[y0:y1,x0:x1].astype(np.float32)/255
    assert rgba.shape[2]==4
    # Remove isolated sub-pixel/very-small alpha debris only in render memory.
    mask=(rgba[:,:,3]>.06).astype(np.uint8)
    count,labels,stats,_=cv2.connectedComponentsWithStats(mask,8)
    rejected=[i for i in range(1,count) if stats[i,cv2.CC_STAT_AREA]<8]
    for i in rejected:rgba[:,:,3][labels==i]=0
    rgba[:,:,:3]*=rgba[:,:,3:4]
    return rgba,{'tiny_components_removed':len(rejected),'component_floor_pixels':8,'source_file_unchanged':True}


class Scene:
    def __init__(self,w,h):
        self.w,self.h=w,h;self.r=w/1280
        self.window=load_png(ASSETS/'window-plate.png')[:,:,:3]
        self.cloud=load_png(ASSETS/'cloud-plate.png')[:,:,:3]
        flowers=load_png(ASSETS/'flower-poses.png');rex=load_png(ASSETS/'rex-poses.png')
        self.flowers=[];self.cleanups=[]
        for box in FLOWER_BOXES:
            sp,info=crop_sprite(flowers,box);self.flowers.append(sp);self.cleanups.append(info)
        self.pot,potclean=crop_sprite(flowers,[678,943,1203,1102]);self.cleanups.append(potclean)
        self.rex=[]
        for box in REX_BOXES:
            sp,info=crop_sprite(rex,box)
            canvas=np.zeros((580,600,4),np.float32)
            sh,sw=sp.shape[:2];canvas[580-sh:580,(600-sw)//2:(600-sw)//2+sw]=sp
            self.rex.append(canvas);self.cleanups.append(info)
        self.meshes={}
        d=json.loads((ROOT/'references/rhythm-v2/analysis.json').read_text(encoding='utf8'))
        env=d['sample_envelope']['points'];self.env_t=np.array([p['relative_seconds'] for p in env]);self.env_v=np.array([p['motion_intensity_0_1'] for p in env])
        self.accents=np.array([p['sample_relative_seconds'] for p in d['selection']['suggested_accent_markers']])
        self.source_audio=ROOT/d['selection']['audio_clip']['file'];self.audio_expected=d['selection']['audio_clip']
        self.original_audio=ROOT/d['source']['file'];self.original_audio_sha256=d['source']['sha256_before']
        assert shared.sha(self.original_audio)==self.original_audio_sha256
        # Integrating the envelope once makes cloud displacement continuous even
        # while velocity changes. Evaluated at absolute t, never frame accumulation.
        dt=np.diff(self.env_t);self.env_integral=np.r_[0,np.cumsum(dt*(self.env_v[1:]+self.env_v[:-1])/2)]
        self.asset_hashes={p.name:shared.sha(p) for p in ASSETS.glob('*.png')}
        self.asset_dimensions={'window-plate.png':list(self.window.shape[1::-1]),'cloud-plate.png':list(self.cloud.shape[1::-1]),'flower-poses.png':list(flowers.shape[1::-1]),'rex-poses.png':list(rex.shape[1::-1])}

    def intensity(self,t):return float(np.interp(t,self.env_t,self.env_v))
    def integral(self,t):return float(np.interp(t,self.env_t,self.env_integral))
    def accent(self,t):return float(np.max(np.exp(-((t-self.accents)/.15)**2)))

    def background(self,img,t,zoom=1,dx=0,dy=0):
        ih,iw=img.shape[:2];s=max(self.w/iw,self.h/ih)*zoom
        m=np.array([[s,0,(self.w-1)/2-s*(iw-1)/2+dx*self.r],
                    [0,s,(self.h-1)/2-s*(ih-1)/2+dy*self.r]],np.float32)
        return cv2.warpAffine(img,m,(self.w,self.h),flags=cv2.INTER_CUBIC,borderMode=cv2.BORDER_REFLECT_101)

    def grid(self,shape):
        key=shape[:2]
        if key not in self.meshes:
            y,x=np.mgrid[:key[0],:key[1]];self.meshes[key]=(x.astype(np.float32),y.astype(np.float32))
        return self.meshes[key]

    def wind_flower(self,index,t):
        sp=self.flowers[index];x,y=self.grid(sp.shape);height=sp.shape[0]
        root=np.array(FLOWER_ROOTS[index])-np.array(FLOWER_BOXES[index][:2])
        weight=np.clip((root[1]-y)/height,0,1)**1.65
        bend=(3.2*math.sin(t*1.55)+1.4*math.sin(t*2.35+.7))*weight
        # The source root stays fixed; the flower head and leaves deform more.
        return cv2.remap(sp,(x-bend).astype(np.float32),y,cv2.INTER_CUBIC,borderMode=cv2.BORDER_CONSTANT),root

    def rig_rex(self,index,t,intensity):
        sp=self.rex[index];x,y=self.grid(sp.shape)
        # Within one key pose only: head/neck inertial bend plus subtle breathing.
        neck=np.clip((400-y)/250,0,1);neck=neck*neck*(3-2*neck)
        lean=(1.8+2.2*intensity)*math.sin(t*.84)+1.0*math.sin(t*1.73)
        breath=1.8*math.sin(t*1.72)
        mx=x-lean*neck-.006*breath*(x-300)*np.clip((y-250)/330,0,1)
        my=y-breath*np.clip((580-y)/330,0,1)
        return cv2.remap(sp,mx.astype(np.float32),my.astype(np.float32),cv2.INTER_CUBIC,borderMode=cv2.BORDER_CONSTANT)

    def layer(self,canvas,sp,anchor,dest,scale,angle=0,opacity=1):
        # Warp premultiplied BGRA into only its on-screen bounding rectangle.
        a=math.radians(angle);ss=scale*self.r
        mat=np.array([[ss*math.cos(a),-ss*math.sin(a),0],
                      [ss*math.sin(a), ss*math.cos(a),0]],np.float32)
        mat[:,2]=np.array(dest)*self.r-mat[:,:2]@np.array(anchor)
        h,w=sp.shape[:2]
        c=np.array([[0,0,1],[w,0,1],[0,h,1],[w,h,1]],np.float32)@mat.T
        x0=max(0,int(np.floor(c[:,0].min()))-2);y0=max(0,int(np.floor(c[:,1].min()))-2)
        x1=min(self.w,int(np.ceil(c[:,0].max()))+2);y1=min(self.h,int(np.ceil(c[:,1].max()))+2)
        if x1<=x0 or y1<=y0:return
        mat[:,2]-=[x0,y0]
        warped=cv2.warpAffine(sp,mat,(x1-x0,y1-y0),flags=cv2.INTER_CUBIC,borderMode=cv2.BORDER_CONSTANT)
        alpha=np.clip(warped[:,:,3:4]*opacity,0,1)
        target=canvas[y0:y1,x0:x1].astype(np.float32)/255
        comp=warped[:,:,:3]*opacity+target*(1-alpha)
        canvas[y0:y1,x0:x1]=np.clip(comp*255,0,255).astype(np.uint8)

    def flower_scene(self,t):
        # Three intentional framing cuts, not uncontrolled sprite swapping.
        if t<6:
            pose=1;z=1.025+.014*t/6;cam=(-7+1.2*t,1)
        elif t<9.4:
            pose=0;z=1.20+.018*(t-6)/3.4;cam=(50,-10)
        else:
            pose=2;z=1.36+.018*(t-9.4)/2.6;cam=(0,-20)
        # Same world root and pot, projected by the same camera as the room.
        root=(640+(585-640)*z+cam[0],360+(584-360)*z+cam[1]);scale=.80*z
        frame=self.background(self.window,t,z,*cam)
        qt=math.floor(t*7)/7
        # Slow light movement remains local to the room rather than flashing.
        light=1+.012*math.sin(t*.48)
        frame=np.clip(frame.astype(np.float32)*light,0,255).astype(np.uint8)
        flower,anchor=self.wind_flower(pose,qt)
        angle=1.8*math.sin(qt*1.55)+.4*math.sin(qt*2.3)
        self.layer(frame,flower,anchor,root,scale,angle)
        # Soil/rim comes last, covering the small root registration differences.
        self.layer(frame,self.pot,[262,48],(root[0],root[1]-3),scale*.73,0)
        # A low-opacity drifting reflection in the exterior glass only.
        cloud=self.background(self.cloud,t,1.15,18*math.sin(t*.05),0)
        y1=int(250*self.r);x1=int(155*self.r)
        frame[:y1,:x1]=cv2.addWeighted(frame[:y1,:x1],.975,cloud[:y1,:x1],.025,0)
        return frame,pose

    def cloud_scene(self,t):
        u=t-12;v=self.intensity(t);distance=3*u+6*(self.integral(t)-self.integral(12))
        frame=self.background(self.cloud,t,1.17+.035*u/18,32-distance*.65,6*math.sin(t*.12))
        # An actual short A->B->C head-lift sequence, with no cross-pose dissolve.
        pose=0 if t<13.3 else (1 if t<13.85 else 2)
        if 20<=t<20.25:pose=1
        elif 20.25<=t<20.55:pose=0
        elif 20.55<=t<20.95:pose=1
        qt=math.floor(t*12)/12 if t<18 else t
        rex=self.rig_rex(pose,qt,v)
        x=825-8*math.sin(u*.18);y=759+3*math.sin(qt*1.72)
        scale=1.18+.035*u/18
        angle=.32*math.sin(qt*.67)
        self.layer(frame,rex,[300,580],(x,y),scale,angle)
        # Foreground cloud texture: independent depth/velocity, lower-body mask.
        cloud=self.background(self.cloud,t,1.42,85-distance*1.05,13*math.sin(t*.1))
        y0=int(self.h*.72);yy=np.linspace(0,1,self.h-y0,dtype=np.float32)[:,None,None]
        alpha=(.04+.12*v)*yy**1.5
        frame[y0:]=np.clip(frame[y0:].astype(np.float32)*(1-alpha)+cloud[y0:].astype(np.float32)*alpha,0,255).astype(np.uint8)
        # Local reflection/foreground vapor masks the two cel substitutions.
        # The image under this mask is always exactly ONE character pose.
        switches=[13.3,13.85,20,20.25,20.55,20.95]
        cover=max(math.exp(-((t-s)/(.18 if s<18 else .10))**2) for s in switches)
        if cover>.002:
            x0,x1=int(565*self.r),int(1060*self.r);y0,y1=int(20*self.r),int(470*self.r)
            yy,xx=np.mgrid[0:y1-y0,0:x1-x0].astype(np.float32)
            taper=np.sin(np.pi*xx/max(1,x1-x0-1))**2*np.sin(np.pi*yy/max(1,y1-y0-1))**2
            mask=taper*cover*.80
            region=frame[y0:y1,x0:x1].astype(np.float32);fog=cloud[y0:y1,x0:x1].astype(np.float32)
            frame[y0:y1,x0:x1]=np.clip(region*(1-mask[:,:,None])+fog*mask[:,:,None],0,255).astype(np.uint8)
        # Very small moving visor reflection; no global white flash or shake.
        a=self.accent(t);x0,x1=int(680*self.r),int(900*self.r);y0,y1=int(145*self.r),int(275*self.r)
        yy,xx=np.mgrid[0:y1-y0,0:x1-x0].astype(np.float32)
        mask=np.sin(np.pi*xx/max(1,x1-x0-1))**2*np.sin(np.pi*yy/max(1,y1-y0-1))**2*(.012+.022*a)
        region=frame[y0:y1,x0:x1].astype(np.float32)
        frame[y0:y1,x0:x1]=np.clip(region+(255-region)*mask[:,:,None],0,255).astype(np.uint8)
        return frame,pose

    def render(self,t):
        if t<12: frame,pose=self.flower_scene(t)
        else: frame,pose=self.cloud_scene(t)
        # A brief cloud-covered scene change; no character-to-character dissolve.
        if 11.8<t<12.25:
            cover=math.sin(math.pi*float(smooth(11.8,12.25,t)))**2
            cloud=self.background(self.cloud,t,1.3,0,0)
            frame=cv2.addWeighted(frame,1-cover,cloud,cover,0)
        return frame


def timeline(scene):
    return {'schema_version':1,'duration_seconds':30,'output_fps':60,'output_frames':1800,
            'source_audio':scene.audio_expected,'original_audio_sha256':scene.original_audio_sha256,'assets_sha256':scene.asset_hashes,'asset_dimensions':scene.asset_dimensions,
            'artwork_resolution_note':'Enlarged composites; source plates1672x941 and sprites smaller. Not native4K illustration.',
            'character_poses_used':['A','B','C'],'character_pose_D_used':False,
            'pose_D_exclusion':'Respiratory hose attachment continuity issue in supplied atlas.',
            'character_identity_boundary':'Experimental fan-art mask/rig, not an official accurate character model.',
            'shots':[{'range':[0,6],'scene':'window/flower B, independent rooted wind'},{'range':[6,9.4],'scene':'intentional closer framing/flower A'},{'range':[9.4,12],'scene':'flower C close detail'},{'range':[12,13.3],'scene':'Rex A lowering head; cloud background'},{'range':[13.3,13.85],'scene':'Rex B lifting gaze; local cloud occlusion'},{'range':[13.85,30],'scene':'Rex C near frontal; breathing/head inertia, foreground and background cloud flow'}],
            'local_animation_sampling':[{'range':[0,12],'hz':7,'layers':'flower bend and rooted rotation'},{'range':[12,18],'hz':12,'layers':'Rex local rig/body inertia'},{'range':[18,30],'hz':60,'layers':'Rex rig/body, cloud, camera'}],
            'camera_sampling_hz':60,'background_cloud_sampling_hz':60,
            'second_scan_sequence':[{'range':[20,20.25],'pose':'B'},{'range':[20.25,20.55],'pose':'A'},{'range':[20.55,20.95],'pose':'B'},{'range':[20.95,30],'pose':'C'}],
            'cloud_layer_provenance':'One original cloud plate transformed separately as background and procedural foreground/reflection masks; not separately painted cloud layers.',
            'cross_pose_alpha_dissolve':False,'camera_absolute_time':True,
            'flower_regions':FLOWER_BOXES,'flower_root_anchors_in_atlas':FLOWER_ROOTS,
            'rex_regions':REX_BOXES,'rex_registration':'600x580 canvas;595px equal shoulder width; bottom-centre chest registration',
            'alpha_processing':{'premultiplied':True,'memory_only_tiny_component_filter':scene.cleanups,'original_pngs_unchanged':True},
            'music_control':'references/rhythm-v2/analysis.json sample_envelope + curated mixed-transient accents; not separated drums',
            'key_pose_count_is_not_drawing_fps':True,'no_aircraft_exterior_or_cockpit_geometry':True}


def main():
    parser=argparse.ArgumentParser();parser.add_argument('--quality',choices=['preview','final'],default='preview');parser.add_argument('--approved',action='store_true');parser.add_argument('--stills-only',action='store_true')
    args=parser.parse_args()
    if args.quality=='final' and not args.approved:raise SystemExit('Final4K render requires observed root preview approval and --approved.')
    w,h=(1280,720) if args.quality=='preview' else (3840,2160)
    cv2.setNumThreads(8);OUT.mkdir(parents=True,exist_ok=True);scene=Scene(w,h)
    write_json(ROOT/'motion-tests/v2/timeline.json',timeline(scene))
    stem='hortus-motion-v2-preview' if args.quality=='preview' else 'hortus-motion-v2-4k60'
    sheet=Image.new('RGB',(1280,4*266),(20,22,26));draw=ImageDraw.Draw(sheet)
    for k,t in enumerate(KEY_TIMES):
        fr=scene.render(t);small=cv2.resize(fr,(426,240),interpolation=cv2.INTER_AREA)
        y=(k//3)*266;x=(k%3)*426
        sheet.paste(Image.fromarray(cv2.cvtColor(small,cv2.COLOR_BGR2RGB)),(x,y));draw.text((x+8,y+244),f'{t:05.2f}s | frame {round(t*60)}',fill='white')
        cv2.imencode('.png',fr)[1].tofile(str(OUT/f'{stem}-key-{k+1:02d}.png'))
    sheet.save(OUT/f'{stem}-contact-sheet.jpg',quality=93)
    if args.stills_only:return
    assert shared.sha(scene.source_audio)==scene.audio_expected['sha256']
    mp4=OUT/f'{stem}.mp4';pending_mp4=OUT/f'{stem}.rendering.mp4'
    cmd=[FF,'-hide_banner','-loglevel','warning','-y','-f','rawvideo','-pixel_format','bgr24','-video_size',f'{w}x{h}','-framerate','60','-i','pipe:0','-i',scene.source_audio,'-map','0:v:0','-map','1:a:0','-frames:v','1800','-t','30','-c:v','h264_nvenc','-preset','p6','-tune','hq','-rc','vbr','-cq','18','-b:v','0','-spatial-aq','1','-aq-strength','8','-rc-lookahead','32','-bf','3','-vf','scale=in_range=full:out_range=limited:out_color_matrix=bt709','-pix_fmt','yuv420p','-color_primaries','bt709','-color_trc','bt709','-colorspace','bt709','-color_range','tv','-c:a','aac','-b:a','320k','-ar','48000','-movflags','+faststart','-video_track_timescale','60000',pending_mp4]
    start=time.monotonic();hashes=[]
    with (OUT/f'{stem}-encode.log').open('wb') as log:
        proc=subprocess.Popen([str(c) for c in cmd],stdin=subprocess.PIPE,stdout=subprocess.DEVNULL,stderr=log)
        try:
            for i in range(N):
                frame=scene.render(i/FPS);hashes.append(hashlib.sha256(memoryview(frame)).hexdigest());proc.stdin.write(memoryview(frame))
                if i%180==0:print(f'{stem}: {i}/{N}',flush=True)
            proc.stdin.close();code=proc.wait()
            if code:raise RuntimeError(f'Encoder failed{code}')
        except BaseException:
            proc.kill();proc.wait();raise
    shared.W,shared.H=w,h
    checks=[shared.verify(pending_mp4,N,30,'aac')]
    pending_mp4.replace(mp4)
    checks[0]['file']=shared.rel(mp4);checks[0]['ffprobe']['format']['filename']=str(mp4)
    extra={}
    if args.quality=='final':
        mkv=OUT/f'{stem}.mkv';shared.run([FF,'-v','error','-y','-i',mp4,'-i',scene.source_audio,'-map','0:v:0','-map','1:a:0','-c:v','copy','-c:a','copy',mkv]);checks.append(shared.verify(mkv,N,30,'flac'))
        h1,h2=shared.video_hash(mp4),shared.video_hash(mkv);assert h1==h2
        master=shared.pcm(mkv);source=shared.pcm(scene.source_audio);assert master==source
        extra={'mp4_mkv_video_stream_identical':True,'video_stream_sha256':h1,'mkv_pcm_equals_source_slice':True,'mkv_pcm_sha256':hashlib.sha256(master).hexdigest()}
    assert scene.asset_hashes=={p.name:shared.sha(p) for p in ASSETS.glob('*.png')}
    assert shared.sha(scene.source_audio)==scene.audio_expected['sha256']
    assert shared.sha(scene.original_audio)==scene.original_audio_sha256
    result={'quality':args.quality,'duration_seconds':30,'frames':1800,'dimensions':[w,h],'fps':60,'source_frame_unique_count':len(set(hashes)),'outputs':checks,'encode_command':[str(c) for c in cmd],'elapsed_seconds':time.monotonic()-start,'timeline':'motion-tests/v2/timeline.json','source_pngs_preserved':True,'source_audio_preserved':True,'audio_clip_sha256':scene.audio_expected['sha256'],'original_audio_sha256':scene.original_audio_sha256,'artwork_native_4k':False,'pseudo_animation_not_60_hand_drawn_poses':True,**extra}
    write_json(OUT/f'{stem}-metadata.json',result)
    if args.quality=='final':write_json(OUT/'validation.json',result)
    print(f'PASS {stem}: {result["elapsed_seconds"]:.1f}s',flush=True)

if __name__=='__main__':main()
