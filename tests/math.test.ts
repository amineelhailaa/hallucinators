import { describe, it, expect } from "vitest";
import {
  conv2d,
  pool,
  flatten,
  unflatten,
  flattenIndex,
  softmax,
  crossEntropy,
  mse,
  derivative,
  activations,
  transform,
  dot,
  architecture,
} from "../src/engine/math";
import { dataset, sample } from "../src/engine/dataset";
import { random } from "../src/engine/math";
describe("inspectable numerical engine", () => {
  it("computes a convolution against a hand-calculated fixture", () => {
    const x = { shape: [3, 3, 1], values: [1, 2, 3, 4, 5, 6, 7, 8, 9] },
      k = { shape: [2, 2, 1, 1], values: [1, 0, 0, -1] };
    expect(conv2d(x, k, [2]).values).toEqual([-2, -2, -2, -2]);
  });
  it("sums channels and adds bias once", () => {
    expect(
      conv2d(
        { shape: [1, 1, 2], values: [2, 3] },
        { shape: [1, 1, 2, 1], values: [4, 5] },
        [1],
      ).values,
    ).toEqual([24]);
  });
  it("handles same padding, strides, dilation and invalid configurations", () => {
    const x = { shape: [7, 7, 1], values: new Array(49).fill(1) },
      k = { shape: [3, 3, 1, 1], values: new Array(9).fill(1) };
    expect(conv2d(x, k, [0], 2, "valid").shape).toEqual([3, 3, 1]);
    expect(conv2d(x, k, [0], 2, "same").shape).toEqual([4, 4, 1]);
    expect(conv2d(x, k, [0], 1, "valid", 2).shape).toEqual([3, 3, 1]);
    expect(() => conv2d({ shape: [1, 1, 1], values: [1] }, k, [0])).toThrow();
  });
  it("flattens without changing values and round-trips coordinates", () => {
    const input = { shape: [2, 2, 2], values: [0, 1, 2, 3, 4, 5, 6, 7] };
    expect(flatten(input)).toEqual({ shape: [8], values: input.values });
    for (let k = 0; k < 8; k++)
      expect(flattenIndex(unflatten(k, input.shape), input.shape)).toBe(k);
    expect(
      flatten(transform({ shape: [2, 2, 1], values: [1, 2, 3, 4] }, "mirror"))
        .values,
    ).toEqual([2, 1, 4, 3]);
  });
  it("demonstrates irreversible pooling collisions", () => {
    const a = { shape: [2, 2, 1], values: [1, 0, 0, 0] },
      b = { shape: [2, 2, 1], values: [0, 1, 0, 0] };
    expect(pool(a).values).toEqual(pool(b).values);
    expect(pool(a, 2, "average").values).toEqual([0.25]);
  });
  it("keeps logits numerically stable and invariant to common offsets", () => {
    expect(softmax([10000, 10000])).toEqual([0.5, 0.5]);
    expect(crossEntropy([10000, -10000], 1)).toBe(20000);
    expect(crossEntropy([0, 0], 0)).toBeCloseTo(Math.log(2));
    expect(softmax([1, 2])).toEqual(softmax([101, 102]));
  });
  it("matches analytical derivatives to finite differences away from bends", () => {
    const e = 1e-5;
    for (const kind of ["linear", "relu", "sigmoid", "tanh"] as const)
      for (const x of [-2, 0.7])
        expect(derivative(x, kind)).toBeCloseTo(
          (activations[kind](x + e) - activations[kind](x - e)) / (2 * e),
          5,
        );
  });
  it("calculates chain-rule gradients and a known SGD update", () => {
    const x = 2,
      w = 0.5,
      y = 3,
      gradient = 2 * (w * x - y) * x;
    expect(gradient).toBe(-8);
    expect(w - 0.1 * gradient).toBe(1.3);
    expect(dot([2, 3], [0.5, -1], 2)).toBe(0);
    expect(mse([0.8, 0.2], [0.5, 0.4])).toBeCloseTo(0.065);
  });
  it("counts the complete teaching architecture", () => {
    expect(architecture.reduce((sum, l) => sum + l[2], 0)).toBe(2468);
  });
  it("generates deterministic unique splits", () => {
    const a = dataset("classification", 7),
      b = dataset("classification", 7);
    expect(a.train.xs).toEqual(b.train.xs);
    const all = Object.values(a).flatMap((s) => s.xs.map((x) => x.join(",")));
    expect(new Set(all).size).toBe(768);
    expect(a.train.ys.filter((y) => y[0] === 0).length).toBe(128);
  });
  it("rotates arrow geometry clockwise", () => {
    const s = sample("classification", random(7), 0),
      turned = transform(s.input, "rotate");
    expect(turned.values).not.toEqual(s.input.values);
    expect(
      transform(transform(transform(turned, "rotate"), "rotate"), "rotate")
        .values,
    ).toEqual(s.input.values);
  });
});
