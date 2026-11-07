"""Independent NumPy forward, loss and finite-difference gradient checks of filmed toy network."""
import json
from pathlib import Path
import numpy as np

ROOT = Path(__file__).resolve().parents[1]
r = json.loads((ROOT/'exports/v2/review/browser-review.json').read_text(encoding='utf-8'))
records = []
xs = np.array([[np.sin(i*2.399963),np.cos(i*1.754877)] for i in range(32)])
ys = np.tanh(xs @ np.array([[.7,.45],[.45,.7]]))

def forward(x,w1,b1,w2,b2):
    h = np.tanh(x @ w1.T + b1)
    return h,np.tanh(h @ w2.T + b2)

for row in r['records']:
    f = row.get('features') or {}
    state = f.get('neural') or {}
    if not state.get('visible'):
        state = f.get('backprop') or {}
    if not isinstance(state,dict) or 'w1' not in state:
        continue
    x,w1,b1,w2,b2 = (np.array(state[k],dtype=float) for k in ['input','w1','b1','w2','b2'])
    h,o = forward(x,w1,b1,w2,b2)
    forward_error = max(np.max(np.abs(h-state['hidden'])),np.max(np.abs(o-state['output'])))
    _,all_out = forward(xs,w1,b1,w2,b2)
    loss = np.mean(np.square(all_out-ys))
    loss_error = abs(loss-state['loss'])
    assert forward_error < 1e-12 and loss_error < 1e-12
    result={'time':row['t'],'epoch':state['epoch'],'max_forward_error':float(forward_error),'recomputed_training_loss':float(loss),'training_loss_error':float(loss_error)}
    if 'dW1' in state:
        target = np.array(state['target'])
        def sample_loss():
            return np.mean(np.square(forward(x,w1,b1,w2,b2)[1]-target))
        errors = {}
        for name,weights in [('dW1',w1),('dW2',w2)]:
            numerical = np.zeros_like(weights)
            for idx in np.ndindex(weights.shape):
                old=weights[idx];eps=1e-6
                weights[idx]=old+eps;plus=sample_loss()
                weights[idx]=old-eps;minus=sample_loss()
                weights[idx]=old
                numerical[idx]=(plus-minus)/(2*eps)
            error=float(np.max(np.abs(numerical-np.array(state[name]))))
            assert error < 1e-8
            errors[name]=error
        result['finite_difference_gradient_errors']=errors
    records.append(result)
assert len(records)>=4 and any('finite_difference_gradient_errors' in row for row in records)
out={'status':'passed','scope':'Independent numerical checks of sampled educational 2→4→2 network; not verification of actual Astra/DeepSeek internals or generalization.','records':records,'method':'NumPy matrix products, tanh, MSE over fixed 32 samples; central finite differences epsilon 1e-6 for dW1/dW2'}
(ROOT/'exports/v2/neural-validation.json').write_text(json.dumps(out,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps(out,ensure_ascii=False))
