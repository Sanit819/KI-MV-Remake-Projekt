"""Recompute filmed CNN/RNN traces with NumPy, without importing the renderer."""
import argparse
import hashlib
import json
from datetime import datetime, timezone
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parents[1]
TOLERANCE = 1e-12


def difference(expected, actual):
    actual = np.asarray(actual, dtype=float)
    if expected.shape != actual.shape:
        raise ValueError(f"Shape mismatch: expected {expected.shape}, got {actual.shape}")
    if not np.isfinite(actual).all():
        raise ValueError("Non-finite trace value")
    return float(np.max(np.abs(expected - actual), initial=0.0))


def check_cnn(state):
    x = np.asarray(state['input'], dtype=float)
    kernel = np.asarray(state['kernel'], dtype=float)
    if x.shape != (7, 7) or kernel.shape != (3, 3):
        raise ValueError('Unexpected CNN input/kernel shape')
    if state['stride'] != 1 or state['padding'] != 0:
        raise ValueError('Expected valid stride-1 convolution')
    patches = np.lib.stride_tricks.sliding_window_view(x, kernel.shape)
    conv = np.einsum('ijmn,mn->ij', patches, kernel) + float(state['bias'])
    relu = np.maximum(conv, 0)
    pool = state['pool']
    if pool['kernel'] != 2 or pool['stride'] != 2 or pool['padding'] != 0:
        raise ValueError('Expected valid 2x2 stride-2 pooling')
    pooled = np.lib.stride_tricks.sliding_window_view(relu, (2, 2))[::2, ::2].max(axis=(-1, -2))
    errors = {name: difference(expected, actual) for name, expected, actual in [
        ('convolution', conv, state['conv']),
        ('relu', relu, state['relu']),
        ('max_pool', pooled, pool['values']),
    ]}
    return {'errors': errors, 'recomputed_pool': pooled.tolist(),
            'scan': state['scan'], 'stage': state['stage']}


def check_rnn(state):
    weights = {key: np.asarray(value, dtype=float) for key, value in state['weights'].items()}
    sequence = np.asarray(state['sequence'], dtype=float)
    step = int(state['step'])
    if sequence.shape != (16, 2) or not 0 <= step < len(sequence):
        raise ValueError('Unexpected RNN sequence/step')
    hidden = np.zeros(2)
    zero_input_states = []
    states = []
    # Reconstruct every preceding state from h_0=0; do not trust the filmed previous_hidden.
    for i, token in enumerate(sequence):
        previous = hidden.copy()
        hidden = np.tanh(weights['Wih'] @ token + weights['Whh'] @ previous + weights['bh'])
        output = np.tanh(weights['Why'] @ hidden + weights['by'])
        states.append((previous, hidden.copy(), output))
        if np.all(token == 0):
            zero_input_states.append({'step': i, 'hidden': hidden.tolist(),
                                      'hidden_norm': float(np.linalg.norm(hidden))})
    before, hidden, output = states[step]
    errors = {name: difference(expected, actual) for name, expected, actual in [
        ('input', sequence[step], state['input']),
        ('previous_hidden_from_full_recurrence', before, state['previous_hidden']),
        ('hidden', hidden, state['hidden']),
        ('output', output, state['output']),
    ]}
    zero_input = bool(np.all(sequence[step] == 0))
    if zero_input != state['zero_input']:
        raise ValueError('zero_input flag disagrees with actual input')
    return {'errors': errors, 'step': step, 'zero_input': zero_input,
            'recomputed_hidden': hidden.tolist(), 'recomputed_output': output.tolist(),
            'all_sequence_zero_input_memory': zero_input_states}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--input', type=Path, default=ROOT / 'exports/v3/review/browser-review.json')
    parser.add_argument('--output', type=Path, default=ROOT / 'exports/v3/review/classic-validation.json')
    args = parser.parse_args()
    source_bytes = args.input.read_bytes()
    data = json.loads(source_bytes.decode('utf-8'))
    results = []
    skipped_fc = 0
    for record in data['records']:
        state = (record.get('ml') or {}).get('classic')
        if not state:
            continue
        kind = state.get('type')
        if kind == 'FC':
            skipped_fc += 1
            continue
        result = {'time': record['t'], 'type': kind}
        try:
            if kind == 'CNN':
                result.update(check_cnn(state))
            elif kind == 'RNN':
                result.update(check_rnn(state))
            else:
                raise ValueError(f'Unexpected Classic type {kind}')
            result['passed'] = max(result['errors'].values()) <= TOLERANCE
        except (KeyError, ValueError, TypeError, IndexError) as exc:
            result.update(passed=False, error=str(exc))
        results.append(result)
    counts = {kind: sum(row['type'] == kind for row in results) for kind in ['CNN', 'RNN']}
    coverage = {'sample_counts': counts, 'skipped_fc_samples': skipped_fc,
                'rnn_steps': sorted({row['step'] for row in results if 'step' in row}),
                'rnn_zero_input_samples': sum(row.get('zero_input', False) for row in results)}
    complete = counts['CNN'] >= 2 and counts['RNN'] >= 2
    report = {
        'schema_version': 1, 'checked_at': datetime.now(timezone.utc).isoformat(),
        'status': 'passed' if complete and all(row['passed'] for row in results) else 'failed',
        'input': str(args.input.resolve()), 'absolute_tolerance': TOLERANCE,
        'input_sha256': hashlib.sha256(source_bytes).hexdigest(),
        'method': 'Independent NumPy sliding windows/einsum/ReLU/max pool; full Elman recurrence from zero hidden with matrix products and tanh.',
        'scope': 'Sampled browser-rendered fixed teaching CNN/RNN traces. FC is checked separately. This does not establish trained model accuracy or an auditory/visual review.',
        'coverage': coverage, 'records': results,
    }
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding='utf-8')
    print(json.dumps({'status': report['status'], 'coverage': coverage, 'output': str(args.output)}, ensure_ascii=False))
    raise SystemExit(0 if report['status'] == 'passed' else 1)


if __name__ == '__main__':
    main()
