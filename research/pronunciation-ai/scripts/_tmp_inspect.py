import onnxruntime as ort

s = ort.InferenceSession("models/susrota_ctc_fp16.onnx", providers=["CPUExecutionProvider"])
print("inputs:", [(i.name, i.shape, i.type) for i in s.get_inputs()])
print("outputs:", [(o.name, o.shape, o.type) for o in s.get_outputs()])

import nemo.collections.asr.parts.preprocessing.features as F

print("nemo features file:", F.__file__)
