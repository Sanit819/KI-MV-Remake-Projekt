import json,hashlib
from pathlib import Path
r=Path('exports/preview-v52-lighting')
x=json.loads((r/'runtime-review.json').read_text())
a=json.loads(Path('data/production-v52/audio-accents.json').read_text())
rows=x['runtime']['rows']; accents=x['runtime']['accents']; allrows=[q['lighting'] for q in rows]+[q['audit'] for q in accents]
checks={
'browser_errors_zero':not x['errors'],
'86_shots_three_positions':len(rows)==258 and len(set(q['shot'] for q in rows))==86,
'all_17_lighting_sections_visited':len(set(q['lighting']['section'] for q in rows))==17,
'all_measured_events_checked':len(accents)==len(a['events'])==1096,
'subtitle_layout_and_content_identical':all(q['subtitleIdentical'] for q in x['records']),
'quiet_has_no_pulse_or_camera':all(q['pulse']==0 and q['strongKick']==0 and q['zoom']==1 and q['shift']==[0,0] for q in allrows if q['quiet'] or q['profile']['motion']==0),
'zoom_within_half_percent':all(1<=q['zoom']<=1.005 for q in allrows),
'no_synthetic_event_ids':all(set(q['events']).issubset({e['id'] for e in a['events']}) for q in allrows),
'opening_character_free':x['records'][0]['audit']['actorCount']==0,
'analysis_no_fixed_bpm_grid':a['analysis']['fixed_bpm_grid_used'] is False,
}
report={'passed':all(checks.values()),'checks':checks,'coverage':{'shots':86,'frames':258,'events':len(accents),'sections':sorted(set(q['lighting']['section'] for q in rows))},'bounds':{'max_zoom':max(q['zoom'] for q in allrows),'max_abs_design_pixel_shift':max(max(map(abs,q['shift'])) for q in allrows),'bloom_fraction_range':[min(q['lighting']['bloomFraction'] for q in rows),max(q['lighting']['bloomFraction'] for q in rows)]},'protected_candidate_sources':[{ 'path':str(p).replace('\\','/'),'sha256':hashlib.sha256(p.read_bytes()).hexdigest()} for p in map(Path,['src/mv52/early.js','src/mv52/middle.js'])], 'scope':'All shot boundaries and middles plus every measured event envelope; not every full-film frame and not a human drum annotation.'}
(r/'lighting-validation.json').write_text(json.dumps(report,indent=2)+'\n')
print(json.dumps(report,indent=2))
if not report['passed']:raise SystemExit(1)
