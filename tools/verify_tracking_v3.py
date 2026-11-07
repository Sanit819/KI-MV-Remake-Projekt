"""Independently validate sampled v3 tracking traces with NumPy and SciPy.

This verifies numerical educational overlays, not trained detector performance.
The source is the trace captured from the actual browser render, not engine code.
"""
from __future__ import annotations

import argparse
import json
import math
from pathlib import Path

import numpy as np
from scipy.optimize import linear_sum_assignment


ROOT = Path(__file__).resolve().parents[1]
ATOL = 1e-8
RTOL = 1e-10
SCORE_MODEL = {
    'name': 'authored-low-frequency-v1', 'origin': 27.049, 'offset': .5,
    'frequencies': [.83, 1.37], 'weights': [.32, .18], 'secondPhaseScale': .7,
    'phases': {'ds': .3, 'astra': 1.7, 'star': 2.9, 'rice': .6},
    'ranges': {'ds': [.90, .99], 'astra': [.90, .99], 'star': [.90, .97], 'rice': [.97, 1]},
    'candidatePenalty': .03, 'precision': 2,
}


def score_key(identifier: str) -> str:
    return ('rice' if identifier == 'rice' else 'astra' if 'astra' in identifier
            else 'ds' if 'ds' in identifier else 'star')


def authored_score(time: float, identifier: str) -> float:
    """NumPy reconstruction from the published time/phase/range inputs."""
    key = score_key(identifier)
    phase = SCORE_MODEL['phases'][key]
    angles = (time - SCORE_MODEL['origin']) * np.asarray(SCORE_MODEL['frequencies'])
    angles += np.array([phase, phase * SCORE_MODEL['secondPhaseScale']])
    wave = np.clip(SCORE_MODEL['offset'] + np.dot(SCORE_MODEL['weights'], np.sin(angles)), 0, 1)
    lo, hi = SCORE_MODEL['ranges'][key]
    return math.floor((lo + (hi - lo) * wave) * 100 + .5) / 100


def intersection_over_union(a: dict, b: dict) -> float:
    intersection_width = max(0.0, min(a['x'] + a['w'], b['x'] + b['w']) - max(a['x'], b['x']))
    intersection_height = max(0.0, min(a['y'] + a['h'], b['y'] + b['h']) - max(a['y'], b['y']))
    intersection = intersection_width * intersection_height
    union = a['w'] * a['h'] + b['w'] * b['h'] - intersection
    if union <= 0:
        raise ValueError('Nonpositive box union')
    return intersection / union


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--input', type=Path, default=ROOT / 'exports/v3/review/browser-review.json')
    parser.add_argument('--output', type=Path, default=ROOT / 'exports/v3/review/tracking-validation.json')
    args = parser.parse_args()
    data = json.loads(args.input.read_text(encoding='utf-8'))
    failures, warnings, results = [], [], []
    errors: dict[str, float] = {}
    checks = 0
    min_eigenvalue = math.inf
    sampled_scores: dict[str, set[float]] = {}

    def require(condition: bool, message: str) -> None:
        nonlocal checks
        checks += 1
        if not condition:
            failures.append(message)

    def close(actual, expected, name: str, context: str) -> float:
        a, e = np.asarray(actual, dtype=float), np.asarray(expected, dtype=float)
        if a.shape != e.shape:
            require(False, f'{context}: {name} shape {a.shape} != {e.shape}')
            return math.inf
        error = float(np.max(np.abs(a - e))) if a.size else 0.0
        errors[name] = max(errors.get(name, 0.0), error)
        require(bool(np.isfinite(a).all() and np.isfinite(e).all() and
                     np.allclose(a, e, atol=ATOL, rtol=RTOL)),
                f'{context}: {name} error {error}')
        return error

    def covariance(value, name: str, context: str) -> float:
        nonlocal min_eigenvalue
        matrix = np.asarray(value, dtype=float)
        require(bool(np.isfinite(matrix).all()), f'{context}: {name} is nonfinite')
        close(matrix, matrix.T, 'covariance_symmetry', context + '/' + name)
        eigenvalues = np.linalg.eigvalsh((matrix + matrix.T) / 2)
        smallest = float(np.min(eigenvalues))
        min_eigenvalue = min(min_eigenvalue, smallest)
        require(smallest >= -ATOL, f'{context}: {name} is not PSD: min eigenvalue {smallest}')
        return smallest

    def validate_score(value: float, time: float, identifier: str, context: str) -> None:
        lo, hi = SCORE_MODEL['ranges'][score_key(identifier)]
        require(lo <= value <= hi, f'{context}: {identifier} stage score outside [{lo}, {hi}]')
        close(value, authored_score(time, identifier), 'authored_score', context)
        sampled_scores.setdefault(identifier, set()).add(value)

    yolo_count = tracking_count = missing_count = rice_count = 0
    modes = set()
    for record in data['records']:
        trace = (record.get('ml') or {}).get('tracking')
        time = record['t']
        expected_visible = 27.049 <= time < 39.849 or 71.849 <= time < 85.049
        require((trace is not None) == expected_visible, f't={time}: tracking window boundary mismatch')
        if trace is None:
            continue
        context = f't={time}'
        require(trace.get('scoreModel') == SCORE_MODEL, f'{context}: authored score model inputs differ')
        if trace['kind'] == 'YOLO-stage-detection':
            yolo_count += 1
            candidates = trace['candidates']
            threshold = float(trace['nms']['threshold'])
            require(0 <= threshold <= 1, f'{context}: invalid NMS threshold')
            kept, suppressed = [], []
            for candidate in sorted(candidates, key=lambda b: -b['score']):
                require(candidate['w'] > 0 and candidate['h'] > 0,
                        f'{context}: nonpositive candidate box')
                require(0 <= candidate['score'] <= 1, f'{context}: authored score out of range')
                expected_score = math.floor((authored_score(trace['time'], candidate['id']) -
                                            (candidate['index'] % 3) * SCORE_MODEL['candidatePenalty']) * 100 + .5) / 100
                close(candidate['score'], expected_score, 'candidate_score', context)
                winner = next((old for old in kept if old['id'] == candidate['id'] and
                               intersection_over_union(old, candidate) > threshold), None)
                if winner is None:
                    kept.append(candidate)
                else:
                    suppressed.append({'candidate': candidate['index'], 'by': winner['index'],
                                       'iou': intersection_over_union(winner, candidate)})
            actual_kept = trace['nms']['kept']
            require([b['index'] for b in actual_kept] == [b['index'] for b in kept],
                    f'{context}: NMS kept indices disagree')
            actual_suppressed = trace['nms']['suppressed']
            require(len(actual_suppressed) == len(suppressed), f'{context}: NMS suppression count')
            for actual, expected in zip(actual_suppressed, suppressed):
                require((actual['candidate'], actual['by']) == (expected['candidate'], expected['by']),
                        f'{context}: NMS suppression relation')
                close(actual['iou'], expected['iou'], 'nms_iou', context)
            for a, b in zip(actual_kept, kept):
                close([a[k] for k in ['x', 'y', 'w', 'h']], [b[k] for k in ['x', 'y', 'w', 'h']],
                      'nms_kept_geometry', context)
                validate_score(a['score'], trace['time'], a['id'], context)
            rice_expected = 30.249 <= time < 39.849
            expected_ids = {'ds', 'astra', 'legacy-star'} | ({'rice'} if rice_expected else set())
            require({b['id'] for b in kept} == expected_ids,
                    f'{context}: authored actors or legacy star missing from NMS')
            require(len(kept) == len(expected_ids), f'{context}: multiple retained boxes for one actor')
            rice_kept = [b for b in kept if b['id'] == 'rice']
            require(bool(rice_kept) == rice_expected, f'{context}: rice timing boundary mismatch')
            if rice_kept:
                rice_count += 1
                require(.97 <= rice_kept[0]['score'] <= 1.0,
                        f'{context}: rice high stage score must stay within .97–1.00')
                close([rice_kept[0][k] for k in ['x', 'y', 'w', 'h']], [20, 410, 164, 145],
                      'rice_geometry', context)
            results.append({'time': time, 'kind': trace['kind'], 'candidates': len(candidates),
                            'kept': [b['index'] for b in kept], 'suppressed': len(suppressed)})
            continue
        if trace['kind'] != 'tracking':
            require(False, f'{context}: unknown trace kind {trace["kind"]}')
            continue

        tracking_count += 1
        modes.add(trace['mode'])
        parameters = trace['parameters']
        F, H, Q, R = (np.asarray(parameters[name], dtype=float) for name in ['F', 'H', 'Q', 'R'])
        dt = float(trace['dt'])
        close(dt, 1 / 30, 'sample_interval', context)
        expected_F = np.eye(4)
        expected_F[0, 2] = expected_F[1, 3] = dt
        close(F, expected_F, 'constant_velocity_F', context)
        close(H, np.eye(2, 4), 'position_observation_H', context)
        acceleration = np.array([[dt**2 / 2, 0], [0, dt**2 / 2], [dt, 0], [0, dt]])
        close(Q, 600000 * acceleration @ acceleration.T, 'white_acceleration_Q', context)
        close(R, np.diag([36, 36]), 'measurement_R', context)
        covariance(Q, 'Q', context)
        covariance(R, 'R', context)
        cost = np.asarray(trace['cost'], dtype=float)
        observations = trace['observations']
        for observation in observations:
            require(0 <= observation['score'] <= 1, f'{context}: observation score out of range')
            require(observation.get('scoreSource') == 'authored stage score, not model probability',
                    f'{context}: score provenance missing')
            validate_score(observation['score'], trace['time'], observation['source'], context)
        tracks = trace['tracks']
        require(cost.shape == (len(tracks), len(observations) + len(tracks)),
                f'{context}: cost matrix dimensions')
        recomputed_cost = np.full_like(cost, float(parameters['unmatchedCost']))
        for i, track in enumerate(tracks):
            for j, observation in enumerate(observations):
                difference = np.asarray(track['prediction']['x'][:2]) - observation['point']
                incompatible = (track['name'] == 'star') != (observation['source'] == 'star')
                recomputed_cost[i, j] = difference @ difference + (
                    parameters['classMismatchCost'] if incompatible else 0)
        close(cost, recomputed_cost, 'association_cost', context)
        rows, cols = linear_sum_assignment(cost)
        optimal_cost = float(cost[rows, cols].sum())
        assignment = np.asarray(trace['assignment'], dtype=int)
        require(len(set(assignment.tolist())) == len(tracks), f'{context}: assignment is not one-to-one')
        require(bool(np.all((assignment >= 0) & (assignment < cost.shape[1]))),
                f'{context}: assignment column out of bounds')
        actual_cost = float(sum(cost[i, j] for i, j in enumerate(assignment)))
        close(trace['totalCost'], actual_cost, 'assignment_total', context)
        close(actual_cost, optimal_cost, 'scipy_optimal_cost', context)
        track_results = []
        for i, track in enumerate(tracks):
            where = context + '/' + track['name']
            x_prior = np.asarray(track['prior']['x'], dtype=float)
            P_prior = np.asarray(track['prior']['P'], dtype=float)
            predicted_x = F @ x_prior
            predicted_P = F @ P_prior @ F.T + Q
            close(track['prediction']['x'], predicted_x, 'kalman_prediction_x', where)
            close(track['prediction']['P'], predicted_P, 'kalman_prediction_P', where)
            covariance(P_prior, 'prior_P', where)
            covariance(track['prediction']['P'], 'prediction_P', where)
            measurement = track['measurement']
            assigned = int(assignment[i])
            require(track['assignedColumn'] == assigned, f'{where}: assignment differs from track column')
            if assigned < len(observations):
                require(measurement == observations[assigned], f'{where}: measurement differs from assigned observation')
            else:
                require(measurement is None, f'{where}: dummy column has measurement')
            if measurement is not None:
                z = np.asarray(measurement['point'], dtype=float)
                innovation = z - H @ predicted_x
                S = H @ predicted_P @ H.T + R
                # Solve the innovation system; intentionally do not reproduce a hand-written inverse.
                K = np.linalg.solve(S, (predicted_P @ H.T).T).T
                posterior_x = predicted_x + K @ innovation
                residual = np.eye(F.shape[0]) - K @ H
                posterior_P = residual @ predicted_P @ residual.T + K @ R @ K.T
                close(track['posterior']['innovation'], innovation, 'kalman_innovation', where)
                close(track['posterior']['S'], S, 'kalman_S', where)
                close(track['posterior']['K'], K, 'kalman_K', where)
                covariance(track['posterior']['S'], 'innovation_S', where)
                require(measurement['source'] == track['name'], f'{where}: identity swap in sampled geometry')
            else:
                missing_count += 1
                posterior_x, posterior_P = predicted_x, predicted_P
                require(all(track['posterior'][k] is None for k in ['innovation', 'S', 'K']),
                        f'{where}: missing observation must not fabricate an update')
            close(track['posterior']['x'], posterior_x, 'kalman_posterior_x', where)
            close(track['posterior']['P'], posterior_P, 'kalman_Joseph_P', where)
            lowest = covariance(track['posterior']['P'], 'posterior_P', where)
            future = posterior_x[:2] + float(parameters['futureHorizon']) * posterior_x[2:]
            close(track['future'], future, 'future_prediction', where)
            track_results.append({'id': track['id'], 'name': track['name'],
                                  'has_measurement': measurement is not None,
                                  'min_posterior_covariance_eigenvalue': lowest})
        results.append({'time': time, 'frame': trace['frame'], 'kind': trace['kind'],
                        'mode': trace['mode'], 'measurement_count': len(observations),
                        'assignment': assignment.tolist(), 'scipy_optimal_cost': optimal_cost,
                        'tracks': track_results})

    require(yolo_count > 0, 'Missing YOLO/NMS trace samples')
    require(rice_count > 0, 'Missing white-rice YOLO/NMS trace samples')
    require(tracking_count > 0, 'Missing tracking trace samples')
    require(modes == {'Kalman', 'Hungarian'}, 'Both Kalman and Hungarian modes must be sampled')
    if missing_count == 0:
        warnings.append('Missing-observation branch is not sampled; include t=76.8s to cover it.')
    sampled_times = [float(record['t']) for record in data['records']]
    rice_boundaries = {
        'onset_before': any(30.249 - 1/30 <= t < 30.249 for t in sampled_times),
        'onset_after': any(30.249 <= t <= 30.249 + 1/30 for t in sampled_times),
        'end_before': any(39.849 - 1/30 <= t < 39.849 for t in sampled_times),
        'end_after': any(39.849 <= t <= 39.849 + 1/30 for t in sampled_times),
    }
    if not all(rice_boundaries.values()):
        warnings.append('Rice edge coverage incomplete; include 30.233/30.267/39.833/39.867s browser samples.')
    for identifier, values in sampled_scores.items():
        require(len(values) > 1, f'{identifier}: sampled stage scores must have multiple actual values')
    dense_rice = np.array([authored_score(t / 30, 'rice')
                          for t in range(math.ceil(30.249 * 30), math.ceil(39.849 * 30))])
    require(float(dense_rice.max()) == 1.0, 'Rice score model must occasionally reach 1.00 during its scene')
    require(float(dense_rice.min()) < 1.0, 'Rice score model must vary during its scene')
    maximum_rice_step = float(np.max(np.abs(np.diff(dense_rice))))
    require(maximum_rice_step <= .010000001, 'Rice score changes too fast at 30fps')
    out = {
        'status': 'failed' if failures else ('passed_with_coverage_warning' if warnings else 'passed'),
        'scope': 'Independent numerical validation of sampled browser traces: authored-geometry NMS and synthetic-observation Kalman/Hungarian. This does not validate trained YOLO inference or real-world tracking accuracy.',
        'input': str(args.input.resolve()),
        'method': 'NumPy matrix algebra and symmetric eigenspectrum; innovation solve and Joseph covariance; SciPy linear_sum_assignment optimal objective; independent box IoU/class-wise NMS.',
        'tolerances': {'absolute': ATOL, 'relative': RTOL, 'PSD_minimum': -ATOL},
        'checks': checks,
        'coverage': {'yolo_frames': yolo_count, 'tracking_frames': tracking_count,
                     'rice_frames': rice_count, 'rice_boundaries': rice_boundaries,
                     'modes': sorted(modes), 'missing_measurement_updates': missing_count},
        'score_validation': {'model': SCORE_MODEL,
                             'actual_sampled_values': {key: sorted(values) for key, values in sampled_scores.items()},
                             'rice_dense_reference_values': sorted(set(dense_rice.tolist())),
                             'rice_maximum_reference_step_30fps': maximum_rice_step},
        'max_absolute_errors': errors,
        'minimum_covariance_eigenvalue': min_eigenvalue if math.isfinite(min_eigenvalue) else None,
        'failures': failures,
        'warnings': warnings,
        'records': results,
    }
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(out, ensure_ascii=False, indent=2, allow_nan=False), encoding='utf-8')
    print(json.dumps({k: out[k] for k in ['status', 'checks', 'coverage', 'max_absolute_errors',
                                        'minimum_covariance_eigenvalue', 'failures', 'warnings']}, ensure_ascii=False))
    return int(bool(failures))


if __name__ == '__main__':
    raise SystemExit(main())
