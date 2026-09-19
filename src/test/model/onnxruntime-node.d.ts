/**
 * onnxruntime-node ships without bundled .d.ts in this version; its public
 * API is the shared onnxruntime-common surface (InferenceSession, Tensor).
 */
declare module 'onnxruntime-node' {
  export * from 'onnxruntime-common'
}
