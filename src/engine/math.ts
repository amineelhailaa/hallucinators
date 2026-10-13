export type Tensor = { shape: number[]; values: number[] };
export const activations = {
  linear: (x: number) => x,
  relu: (x: number) => Math.max(0, x),
  sigmoid: (x: number) => 1 / (1 + Math.exp(-x)),
  tanh: Math.tanh,
};
export type Activation = keyof typeof activations;
export function derivative(x: number, kind: Activation) {
  const a = activations[kind](x);
  return kind === "linear"
    ? 1
    : kind === "relu"
      ? x > 0
        ? 1
        : 0
      : kind === "sigmoid"
        ? a * (1 - a)
        : 1 - a * a;
}
export function dot(x: number[], w: number[], bias = 0) {
  if (x.length !== w.length) throw new Error("Dimension mismatch");
  return x.reduce((sum, v, i) => sum + v * w[i], bias);
}
export function softmax(logits: number[]) {
  const max = Math.max(...logits);
  const ex = logits.map((x) => Math.exp(x - max));
  const sum = ex.reduce((a, b) => a + b, 0);
  return ex.map((x) => x / sum);
}
export function crossEntropy(logits: number[], target: number) {
  const max = Math.max(...logits);
  return (
    max +
    Math.log(logits.reduce((sum, x) => sum + Math.exp(x - max), 0)) -
    logits[target]
  );
}
export function mse(pred: number[], target: number[]) {
  return (
    pred.reduce((sum, v, i) => sum + (v - target[i]) ** 2, 0) / pred.length
  );
}
export function conv2d(
  input: Tensor,
  kernel: Tensor,
  bias: number[],
  stride = 1,
  padding: "same" | "valid" = "valid",
  dilation = 1,
): Tensor {
  const [h, w, cin] = input.shape,
    [kh, kw, kcin, cout] = kernel.shape;
  if (cin !== kcin) throw new Error("Channel mismatch");
  const eh = (kh - 1) * dilation + 1,
    ew = (kw - 1) * dilation + 1;
  const oh =
    padding === "same"
      ? Math.ceil(h / stride)
      : Math.floor((h - eh) / stride) + 1;
  const ow =
    padding === "same"
      ? Math.ceil(w / stride)
      : Math.floor((w - ew) / stride) + 1;
  if (oh < 1 || ow < 1) throw new Error("Kernel exceeds input");
  const ph =
      padding === "same"
        ? Math.floor(Math.max(0, (oh - 1) * stride + eh - h) / 2)
        : 0,
    pw =
      padding === "same"
        ? Math.floor(Math.max(0, (ow - 1) * stride + ew - w) / 2)
        : 0;
  const values = [];
  for (let y = 0; y < oh; y++)
    for (let x = 0; x < ow; x++)
      for (let o = 0; o < cout; o++) {
        let sum = bias[o] ?? 0;
        for (let ky = 0; ky < kh; ky++)
          for (let kx = 0; kx < kw; kx++)
            for (let c = 0; c < cin; c++) {
              const iy = y * stride + ky * dilation - ph,
                ix = x * stride + kx * dilation - pw;
              if (iy >= 0 && iy < h && ix >= 0 && ix < w)
                sum +=
                  input.values[(iy * w + ix) * cin + c] *
                  kernel.values[((ky * kw + kx) * cin + c) * cout + o];
            }
        values.push(sum);
      }
  return { shape: [oh, ow, cout], values };
}
export function pool(
  input: Tensor,
  size = 2,
  mode: "max" | "average" = "max",
): Tensor {
  const [h, w, c] = input.shape,
    oh = Math.floor(h / size),
    ow = Math.floor(w / size),
    values = [];
  for (let y = 0; y < oh; y++)
    for (let x = 0; x < ow; x++)
      for (let ch = 0; ch < c; ch++) {
        const patch = [];
        for (let ky = 0; ky < size; ky++)
          for (let kx = 0; kx < size; kx++)
            patch.push(
              input.values[((y * size + ky) * w + x * size + kx) * c + ch],
            );
        values.push(
          mode === "max"
            ? Math.max(...patch)
            : patch.reduce((a, b) => a + b, 0) / patch.length,
        );
      }
  return { shape: [oh, ow, c], values };
}
export function flatten(input: Tensor): Tensor {
  return { shape: [input.values.length], values: [...input.values] };
}
export function unflatten(index: number, shape: number[]) {
  const coordinates = [];
  for (let i = shape.length - 1; i >= 0; i--) {
    coordinates.unshift(index % shape[i]);
    index = Math.floor(index / shape[i]);
  }
  return coordinates;
}
export function flattenIndex(coords: number[], shape: number[]) {
  return coords.reduce((n, v, i) => n * shape[i] + v, 0);
}
export function transform(
  input: Tensor,
  kind: "mirror" | "rotate" | "shift" | "noise",
  seed = 1,
): Tensor {
  const [h, w, c] = input.shape,
    rng = random(seed),
    values = new Array(input.values.length).fill(0);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++)
      for (let ch = 0; ch < c; ch++) {
        let iy = y,
          ix = x;
        if (kind === "mirror") ix = w - 1 - x;
        if (kind === "rotate") {
          iy = h - 1 - x;
          ix = y;
        }
        if (kind === "shift") ix = x - 2;
        values[(y * w + x) * c + ch] =
          kind === "noise"
            ? Math.min(
                1,
                Math.max(
                  0,
                  input.values[(y * w + x) * c + ch] + (rng() - 0.5) * 0.35,
                ),
              )
            : ix >= 0 && ix < w && iy >= 0 && iy < h
              ? input.values[(iy * w + ix) * c + ch]
              : 0;
      }
  return { shape: [...input.shape], values };
}
export function random(seed: number) {
  let s = seed >>> 0;
  return () => {
    s += 0x6d2b79f5;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export const architecture = [
  ["Input", "16 × 16 × 1", 0],
  ["Conv 3×3 / 4 + ReLU", "16 × 16 × 4", 40],
  ["MaxPool 2×2", "8 × 8 × 4", 0],
  ["Conv 3×3 / 8 + ReLU", "8 × 8 × 8", 296],
  ["MaxPool 2×2", "4 × 4 × 8", 0],
  ["Flatten", "128", 0],
  ["Dense / 16 + ReLU", "16", 2064],
  ["Dense / 4 logits", "4", 68],
  ["Softmax", "4", 0],
] as const;
