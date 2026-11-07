"""Audit the 221 actually captured R14 states. No rendering or source changes."""
from pathlib import Path
import hashlib
import json
import math
import tempfile

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'exports/mv6/final4k-anonymous'
CHUNK = OUT / 'patches/vision.chunks/f002896-003117.json'
START, END, FPS = 2896, 3117, 60
TOL = 2e-8


def load(path):
    raw = path.read_bytes()
    return json.loads(raw), hashlib.sha256(raw).hexdigest()


def smooth(x):
    x = max(0, min(1, x))
    return x * x * (3 - 2 * x)


def close(a, b):
    if isinstance(a, list) or isinstance(b, list):
        return isinstance(a, list) and isinstance(b, list) and len(a) == len(b) and all(close(x, y) for x, y in zip(a, b))
    return type(a) in (int, float) and type(b) in (int, float) and math.isfinite(a) and math.isfinite(b) and math.isclose(a, b, abs_tol=TOL, rel_tol=TOL)


def transpose(a):
    return [list(row) for row in zip(*a)]


def multiply(a, b):
    return [[sum(x * y for x, y in zip(row, col)) for col in zip(*b)] for row in a]


def add(a, b):
    return [[x + y for x, y in zip(r, s)] for r, s in zip(a, b)]


def covariance_positive(p):
    if len(p) != 4 or any(len(row) != 4 for row in p) or not all(math.isfinite(x) for row in p for x in row):
        return False
    if not close(p, transpose(p)):
        return False
    lower = [[0.0] * 4 for _ in range(4)]
    for i in range(4):
        for j in range(i + 1):
            value = p[i][j] - sum(lower[i][k] * lower[j][k] for k in range(j))
            if i == j:
                if value <= 0:
                    return False
                lower[i][j] = math.sqrt(value)
            else:
                lower[i][j] = value / lower[j][j]
    return True


def causal_step(state, covariance, observed, dt, q=24, r=9):
    f = [[1, 0, dt, 0], [0, 1, 0, dt], [0, 0, 1, 0], [0, 0, 0, 1]]
    qmat = [[q*dt**3/3, 0, q*dt**2/2, 0], [0, q*dt**3/3, 0, q*dt**2/2],
            [q*dt**2/2, 0, q*dt, 0], [0, q*dt**2/2, 0, q*dt]]
    predicted = [row[0] for row in multiply(f, [[x] for x in state])]
    p = add(multiply(multiply(f, covariance), transpose(f)), qmat)
    if observed is None:
        return predicted, predicted, p
    a, b, c, d = p[0][0]+r, p[0][1], p[1][0], p[1][1]+r
    det = a*d-b*c
    inverse = [[d/det, -b/det], [-c/det, a/det]]
    gain = multiply([[row[0], row[1]] for row in p], inverse)
    innovation = [observed[i]-predicted[i] for i in range(2)]
    updated = [predicted[i]+sum(gain[i][j]*innovation[j] for j in range(2)) for i in range(4)]
    residual = [[float(i == j)-(gain[i][j] if j < 2 else 0) for j in range(4)] for i in range(4)]
    covariance = add(multiply(multiply(residual, p), transpose(residual)), multiply(multiply(gain, [[r, 0], [0, r]]), transpose(gain)))
    return predicted, updated, [[(covariance[i][j]+covariance[j][i])*.5 for j in range(4)] for i in range(4)]


def impulse(t, at):
    dt = t-at
    return 0 if dt < 0 or dt > .8 else math.sin(min(1, dt/.025)*math.pi/2)*math.exp(-dt/.25)


def main():
    chunk, chunk_sha = load(CHUNK)
    accents, accents_sha = load(ROOT / 'data/production-v52/audio-accents.json')
    body, body_sha = load(OUT / 'body.render.json')
    records = chunk['frameAudit']
    checks = {}
    def check(name, ok, frame=None, detail=None):
        item = checks.setdefault(name, {'tests': 0, 'failures': 0, 'examples': []})
        item['tests'] += 1
        if not ok:
            item['failures'] += 1
            if len(item['examples']) < 5:
                item['examples'].append({'frame': frame, 'detail': detail})
    check('capture_coverage', chunk['first'] == START and chunk['end'] == END and len(records) == END-START)
    reference = [c for c in body['chunks'] if c.get('captureSource') == 'vision']
    check('capture_provenance', len(reference) == 1 and reference[0]['reportSha256'] == chunk_sha and reference[0]['first'] == START and reference[0]['end'] == END)
    check('capture_provenance', chunk['config']['sourceCodeAndDataSha256'] == body['captureSources']['vision']['sourceCodeAndDataSha256'])
    event_ids = ['A0266', 'A0272', 'A0278']
    events = [next(e for e in accents['events'] if e['id'] == name) for name in event_ids]
    onsets = [event['time_body'] for event in events]
    for event, expected in zip(events, [49.624943, 50.547937, 51.488345]):
        check('actual_soundtrack_onsets', close(event['time_body'], expected) and event['accent'] == 'strong' and event['confidence'] == 'high' and close(event['strength'], 1), detail=event['id'])
    first_observation = records[0]['audit']['story']['perception']['filter']['observed']
    state = [*first_observation, 0, 0]
    covariance = [[36, 0, 0, 0], [0, 36, 0, 0], [0, 0, 1, 0], [0, 0, 0, 1]]
    duration = (END-START)/FPS
    occluded = nulls = 0
    peak_ghost = 0
    max_causal_error = 0
    envelopes = []
    phase_counts = {}
    for i, record in enumerate(records):
        frame, t = record['frame'], record['t']
        p = record['audit']['story']['perception']
        local, u = t-START/FPS, (t-START/FPS)/duration
        shut = smooth((u-.06)/.18)*(1-smooth((u-.74)/.17))
        envelope = smooth(local/.08)*smooth((duration-local)/.09)
        phase_counts[p['phase']] = phase_counts.get(p['phase'], 0)+1
        check('capture_coverage', frame == START+i and record['shot'] == 'R14' and close(t, frame/FPS) and p['frameInShot'] == i, frame)
        check('visualisation_scope', 'not YOLO/model inference' in p['source'] and 'toy observations' in p['source'] and p['kind'] == 'perception-visualisation', frame)
        check('shutter_and_lock', close(p['shutter'], shut), frame)
        filt = p['filter']
        if shut >= .96:
            occluded += 1
            check('fully_occluded_no_detection', p['detectionVisible'] is False and p['detectionAlpha'] == 0 and p['confidence'] == 0 and p['observationAvailable'] is False, frame)
        observed = filt['observed']
        if observed is None:
            nulls += 1
        # Rebuild each observation from its own sample index only, then replay
        # the filter causally. No future recorded observation is passed to a step.
        sample_shut = smooth((i/221-.06)/.18)*(1-smooth((i/221-.74)/.17))
        noise = 1.5+sample_shut*9
        expected_observation = None if sample_shut >= .96 else [1506+noise*math.sin(i*1.13), 374+noise*.6*math.sin(i*.79+.4)]
        check('causal_observations', observed is None if expected_observation is None else close(observed, expected_observation), frame)
        predicted, state, covariance = causal_step(state, covariance, observed, 0 if i == 0 else 1/FPS)
        check('prefix_only_filter_replay', close(filt['predicted'], predicted[:2]) and close(filt['filtered'], state[:2]) and close(filt['covariance'], covariance), frame)
        max_causal_error = max(max_causal_error, *(abs(a-b) for a,b in zip(filt['filtered'], state[:2])))
        check('finite_positive_covariance', covariance_positive(filt['covariance']) and all(math.isfinite(v) for key in ['predicted','filtered'] for v in filt[key]), frame)
        check('causal_observations', p['noFutureObservations'] is True and p['deterministicRandomAccess'] is True and close(filt['measurementVariance'], 9) and close(filt['processNoise'], 24), frame)
        check('gold_anchor', close(p['inputAnchor'], [1160, 745-12*math.sin(((local*3.3)%1)*math.pi)]), frame)
        impact = max(impulse(t, onsets[0]), impulse(t, onsets[1]))
        check('actual_soundtrack_onsets', close(p['onsetBodyTimes'], onsets[:2]) and close(p['recoveryOnsetBodyTime'], onsets[2]), frame)
        check('onset_envelopes', close(p['onsetStrengths'], [impulse(t, x) for x in onsets[:2]]) and close(p['recoveryHit'], impulse(t, onsets[2])), frame)
        check('beat_binding', close(p['pulse'], record['beat']['pulse']) and close(p['kick'], record['beat']['kick']), frame)
        check('ghost_bound_and_fade', 0 <= p['ghostAlpha'] <= .20+TOL and close(p['ghostAlpha'], envelope*shut*(.08+.10*impact+.02*p['kick'])), frame)
        peak_ghost = max(peak_ghost, p['ghostAlpha'])
        visibility = 1-shut
        loss = shut >= .96 or observed is None
        alpha = 0 if loss else envelope*visibility**1.4*(.67+.20*p['pulse'])
        confidence = 0 if loss else max(0,min(1,.97*visibility**1.3-.08*shut*p['pulse']))
        check('entry_exit_fade', close(p['detectionAlpha'], alpha) and close(p['confidence'], confidence) and p['detectionVisible'] == (alpha > .0001), frame)
        check('gold_input_fade', close(p['inputAlpha'], envelope*shut*(.17+.14*p['pulse']+.10*p['kick'])), frame)
        check('subtitle_safe_declaration', p['subtitleSafeBottom'] == 890 and p['subtitleSafeBottom'] < 933, frame)
        envelopes.append(envelope)
    check('entry_exit_fade', envelopes[0] == 0 and envelopes[-1] < .10 and all(envelopes[i] <= envelopes[i+1]+TOL for i in range(4)) and all(envelopes[i] >= envelopes[i+1]-TOL for i in range(216,220)), detail='entry first 5 samples and exit last 5 samples; end frame is exclusive')
    for item in checks.values():
        item['status'] = 'fail' if item['failures'] else 'pass'
        if not item['examples']:
            del item['examples']
    result = {'schemaVersion':1, 'status':'fail' if any(x['failures'] for x in checks.values()) else 'pass',
        'capturedInterval':[START,END], 'auditedFrames':len(records), 'fps':FPS, 'fullyOccludedFrames':occluded,
        'predictOnlyFrames':nulls, 'phaseFrameCounts':phase_counts, 'maximumGhostAlpha':peak_ghost,
        'maximumCausalFilteredPositionDifference':max_causal_error,
        'fade':{'firstEnvelope':envelopes[0],'lastCapturedEnvelope':envelopes[-1], 'lastCapturedDetectionAlpha':records[-1]['audit']['story']['perception']['detectionAlpha'], 'exclusiveEndIsNotCaptured':True},
        'onsetEvents':[{k:event[k] for k in ['id','time_body','accent','confidence','strength']} for event in events],
        'checks':checks, 'inputs':{'chunk':str(CHUNK),'chunkSha256':chunk_sha,'bodyRenderSha256':body_sha,'audioAccentsSha256':accents_sha},
        'scope':['All 221 captured JSON states checked; no browser, playback, listening, media decoding or pixel-level occlusion review.',
                 'Recorded filter states match an independently implemented prefix-only Kalman recursion with no future sample passed to any step. This is numerical evidence, not runtime memory instrumentation.',
                 'Onsets are editor-selected measured soundtrack transients; this does not claim word/phoneme alignment.',
                 'Subtitle safety is a recorded clipping-boundary check, not image inspection. Original combined story-audit is untouched.']}
    output=OUT/'perception-audit.json'
    with tempfile.NamedTemporaryFile('w',encoding='utf-8',dir=OUT,prefix='perception-audit-',suffix='.tmp',delete=False) as handle:
        json.dump(result,handle,ensure_ascii=False,separators=(',',':'))
        handle.write('\n')
        temporary=Path(handle.name)
    temporary.replace(output)
    print(json.dumps({'status':result['status'],'frames':len(records),'fullyOccludedFrames':occluded,'predictOnlyFrames':nulls,'maxGhostAlpha':peak_ghost,'output':str(output),'failures':{k:v for k,v in checks.items() if v['failures']}},ensure_ascii=False))
    return 0 if result['status']=='pass' else 1


if __name__=='__main__':
    raise SystemExit(main())
