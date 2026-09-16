"""
Ad-hoc probe used once to confirm the CTC-only reconstruction round-trips and
the documented Sanskrit-slice decode executes end to end. Kept as a script
(not run automatically) because load_susrota_ctc.py below is the reusable
version of the same logic.
"""
import os
import time

import numpy as np
import torch
from omegaconf import OmegaConf

import nemo.collections.asr as nemo_asr
from nemo.utils import app_state as app_state_mod

extract_dir = os.path.abspath("models/susrota_full_extract")
conf = OmegaConf.load("models/ctc_only_config.yaml")

app_state = app_state_mod.AppState()
app_state.nemo_file_folder = extract_dir
cwd = os.getcwd()
os.chdir(extract_dir)
try:
    model = nemo_asr.models.EncDecCTCModelBPE(cfg=conf)
finally:
    os.chdir(cwd)

sd = torch.load("models/ctc_only_state_dict.pt", map_location="cpu", weights_only=True)
model.load_state_dict(sd, strict=True)
model.eval()
print("model loaded, strict=True succeeded (round-trip check)")

lang_keys = sorted(model.tokenizer.tokenizers_dict.keys())
print("num langs:", len(lang_keys))
print("lang order:", lang_keys)
sa_idx = lang_keys.index("sa")
print("'sa' sorted index:", sa_idx, "-> offset", sa_idx * 256, "(card says SANSKRIT_OFFSET=4096)")
sa_vocab_size = model.tokenizer.tokenizers_dict["sa"].vocab_size
print("sa sub-tokenizer vocab_size:", sa_vocab_size)

sr = 16000
audio = np.zeros(sr * 3, dtype=np.float32)
sig = torch.tensor(audio).unsqueeze(0)
sig_len = torch.tensor([audio.shape[0]])

t0 = time.time()
with torch.no_grad():
    log_probs, encoded_len, greedy_predictions = model.forward(input_signal=sig, input_signal_length=sig_len)
print("forward() took", time.time() - t0)
print("log_probs shape [B,T,V]:", tuple(log_probs.shape))

lp = log_probs[0].cpu().numpy()
BLANK_ID = 5632
SANSKRIT_OFFSET = 4096
SANSKRIT_WIDTH = 256
cols = [BLANK_ID] + list(range(SANSKRIT_OFFSET, SANSKRIT_OFFSET + SANSKRIT_WIDTH))
sliced = lp[:, cols]
mx = sliced.max(axis=1, keepdims=True)
sliced = sliced - (mx + np.log(np.exp(sliced - mx).sum(axis=1, keepdims=True)))
ids = sliced.argmax(axis=1)

sub = model.tokenizer.tokenizers_dict["sa"]
pieces, prev = [], -1
for raw in ids:
    i = int(raw)
    if i != prev and i != 0:
        pieces.append(sub.ids_to_tokens([i - 1])[0])
    prev = i
decoded = "".join(pieces).replace("▁", " ").strip()
print("DECODE OF 3s SILENCE (mechanics test, garbage expected):", repr(decoded))
print()
print("=== B2 RESULT: the documented Sanskrit-slice CTC decode path EXECUTES END TO END ===")
