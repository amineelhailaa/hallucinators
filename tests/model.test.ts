// @vitest-environment node
import { beforeAll, it, expect } from "vitest";
import * as tf from "../src/engine/tf";
import { makeModel, type Config } from "../src/engine/model";
import { conv2d, pool, softmax } from "../src/engine/math";
import { readFileSync } from "node:fs";
const config: Config = {
  task: "classification",
  seed: 7,
  epochs: 1,
  batchSize: 32,
  optimizer: "adam",
  learningRate: 0.001,
};
beforeAll(async () => {
  await tf.setBackend("cpu");
  await tf.ready();
});
it("agrees with TensorFlow for convolution, pooling and softmax", () => {
  tf.tidy(() => {
    const values = [1, 2, 3, 4, 5, 6, 7, 8, 9],
      x = tf.tensor4d(values, [1, 3, 3, 1]),
      k = tf.tensor4d([1, 0, 0, -1], [2, 2, 1, 1]);
    expect(Array.from(tf.conv2d(x, k, 1, "valid").dataSync())).toEqual(
      conv2d(
        { shape: [3, 3, 1], values },
        { shape: [2, 2, 1, 1], values: [1, 0, 0, -1] },
        [0],
      ).values,
    );
    expect(Array.from(tf.maxPool(x, 2, 2, "valid").dataSync())).toEqual(
      pool({ shape: [3, 3, 1], values }, 2).values,
    );
    const p = Array.from(tf.softmax(tf.tensor1d([1, 2, 3])).dataSync());
    p.forEach((v, i) => expect(v).toBeCloseTo(softmax([1, 2, 3])[i], 6));
  });
});
it("matches 2468 parameters and leaves every weight frozen on inference", () => {
  const m = makeModel(config);
  expect(m.countParams()).toBe(2468);
  const before = tf.tidy(() =>
    m.getWeights().flatMap((w) => Array.from(w.dataSync())),
  );
  tf.tidy(() => m.predict(tf.zeros([1, 16, 16, 1])));
  const after = tf.tidy(() =>
    m.getWeights().flatMap((w) => Array.from(w.dataSync())),
  );
  expect(after).toEqual(before);
  m.dispose();
});
it("has a two-value unconstrained regression head", () => {
  const m = makeModel({ ...config, task: "regression" });
  expect(m.outputs[0].shape).toEqual([null, 2]);
  expect(m.countParams()).toBe(2434);
  m.dispose();
});
it("recorded artifacts contain actual finite metrics and full weights", () => {
  for (const task of ["classification", "regression"]) {
    const r = JSON.parse(readFileSync(`public/runs/${task}.json`, "utf8"));
    expect(r.metrics).toHaveLength(10);
    expect(
      r.metrics.every((m: { loss: number }) => Number.isFinite(m.loss)),
    ).toBe(true);
    expect(r.metrics.at(-1).loss).toBeLessThan(r.metrics[0].loss);
    expect(
      r.weights.flatMap((w: { values: number[] }) => w.values),
    ).toHaveLength(task === "classification" ? 2468 : 2434);
    expect(r.provenance.splits).toEqual([512, 128, 128]);
  }
});
it("recorded final loss and score match the stored weights on regenerated data", async () => {
  const { tensors } = await import("../src/engine/model");
  for (const task of ["classification", "regression"] as const) {
    const r = JSON.parse(readFileSync(`public/runs/${task}.json`, "utf8")),
      m = makeModel(r.config),
      data = tf.tidy(() => tensors(r.config));
    tf.tidy(() =>
      m.setWeights(
        r.weights.map((w: { shape: number[]; values: number[] }) =>
          tf.tensor(w.values, w.shape),
        ),
      ),
    );
    tf.tidy(() => {
      const values = m.evaluate(
        data.validation.x,
        data.validation.y,
      ) as tf.Scalar[];
      expect(values[0].dataSync()[0]).toBeCloseTo(r.metrics.at(-1).valLoss, 5);
      expect(values[1].dataSync()[0]).toBeCloseTo(r.metrics.at(-1).valScore, 5);
    });
    m.dispose();
    Object.values(data).forEach((s) => {
      s.x.dispose();
      s.y.dispose();
    });
  }
});
