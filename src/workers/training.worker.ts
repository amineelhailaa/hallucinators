import * as tf from "../engine/tf";
import { makeModel, tensors, shuffleOrder, type Config } from "../engine/model";
import type { Command, TrainingEvent } from "./types";
let runId = 0,
  model: tf.Sequential | undefined,
  initialModel: tf.Sequential | undefined,
  data: ReturnType<typeof tensors> | undefined,
  config: Config,
  paused = false,
  cancelled = false,
  running = false;
const emit = (event: Omit<TrainingEvent, "runId">) =>
  self.postMessage({ ...event, runId });
const yieldUI = () => new Promise((r) => setTimeout(r, 0));
function weight(m = model!) {
  return tf.tidy(() => m.getWeights()[0].dataSync()[0]);
}
function dispose() {
  model?.optimizer.dispose();
  initialModel?.optimizer.dispose();
  model?.dispose();
  initialModel?.dispose();
  if (data)
    Object.values(data).forEach((s) => {
      s.x.dispose();
      s.y.dispose();
    });
  model = undefined;
  initialModel = undefined;
  data = undefined;
}
async function train() {
  if (running || !model || !data) return;
  running = true;
  cancelled = false;
  try {
    for (let epoch = 0; epoch < config.epochs && !cancelled; epoch++) {
      const order = shuffleOrder(512, config.seed + epoch);
      for (
        let start = 0;
        start < 512 && !cancelled;
        start += config.batchSize
      ) {
        while (paused && !cancelled)
          await new Promise((r) => setTimeout(r, 50));
        if (cancelled) break;
        const batch = tf.tidy(() => {
          const ids = tf.tensor1d(
            order.slice(start, start + config.batchSize),
            "int32",
          );
          return {
            x: tf.gather(data!.train.x, ids),
            y: tf.gather(data!.train.y, ids),
          };
        });
        await model.trainOnBatch(batch.x, batch.y);
        batch.x.dispose();
        batch.y.dispose();
        emit({
          type: "batch",
          batch:
            epoch * Math.ceil(512 / config.batchSize) +
            Math.floor(start / config.batchSize) +
            1,
        });
        await yieldUI();
      }
      if (cancelled) break;
      const metrics = tf.tidy(() => {
        const tr = model!.evaluate(data!.train.x, data!.train.y, {
          batchSize: 64,
        }) as tf.Scalar[];
        const va = model!.evaluate(data!.validation.x, data!.validation.y, {
          batchSize: 64,
        }) as tf.Scalar[];
        return {
          loss: tr[0].dataSync()[0],
          score: tr[1].dataSync()[0],
          valLoss: va[0].dataSync()[0],
          valScore: va[1].dataSync()[0],
        };
      });
      emit({
        type: "metric",
        metric: {
          ...metrics,
          epoch: epoch + 1,
          batch: (epoch + 1) * Math.ceil(512 / config.batchSize),
          weight: weight(),
        },
      });
      await yieldUI();
    }
    emit({ type: cancelled ? "cancelled" : "complete" });
  } finally {
    running = false;
  }
}
async function handle(c: Command) {
  if (c.type === "initialize" || c.type === "restore") {
    cancelled = true;
    while (running) await new Promise((r) => setTimeout(r, 20));
    dispose();
    runId = c.runId;
    config = c.type === "initialize" ? c.config : c.artifact.config;
    paused = false;
    cancelled = false;
    await tf.setBackend("cpu");
    await tf.ready();
    model = makeModel(config);
    initialModel = makeModel(config);
    data = tf.tidy(() => tensors(config));
    if (c.type === "restore") {
      tf.tidy(() => {
        model!.setWeights(
          c.artifact.weights.map((w) => tf.tensor(w.values, w.shape)),
        );
        initialModel!.setWeights(
          c.artifact.initial.map((w) => tf.tensor(w.values, w.shape)),
        );
      });
    }
    emit({ type: "ready", weightBefore: weight(initialModel) });
    return;
  }
  if (c.runId !== runId) return;
  if (c.type === "train") {
    await train();
    return;
  }
  if (c.type === "pause") {
    paused = true;
    emit({ type: "paused" });
    return;
  }
  if (c.type === "resume") {
    paused = false;
    return;
  }
  if (c.type === "cancel") {
    cancelled = true;
    paused = false;
    return;
  }
  if (c.type === "dispose") {
    cancelled = true;
    while (running) await new Promise((r) => setTimeout(r, 20));
    dispose();
    return;
  }
  if (c.type === "predict" || c.type === "inspect") {
    if (!model) throw new Error("Model unavailable");
    const m = c.initial ? initialModel! : model,
      before = weight(m),
      beforeAll = tf.tidy(() =>
        m.getWeights().flatMap((w) => Array.from(w.dataSync())),
      );
    const result = tf.tidy(() => {
      const x = tf.tensor4d(c.input, [1, 16, 16, 1]);
      const pred = m.predict(x) as tf.Tensor;
      const output = Array.from(
        (config.task === "classification" ? tf.softmax(pred) : pred).dataSync(),
      );
      let current: tf.Tensor = x;
      const layers = m.layers.map((layer) => {
        current = layer.apply(current, { training: false }) as tf.Tensor;
        return {
          name: layer.name,
          shape: current.shape,
          values: Array.from(current.dataSync()),
        };
      });
      return { output, layers };
    });
    emit({
      type: "prediction",
      ...result,
      initial: c.initial,
      tag: c.tag,
      weightBefore: before,
      weightAfter: weight(m),
      weightDelta: tf.tidy(() =>
        m
          .getWeights()
          .flatMap((w) => Array.from(w.dataSync()))
          .reduce(
            (delta, v, i) => Math.max(delta, Math.abs(v - beforeAll[i])),
            0,
          ),
      ),
    });
    return;
  }
  if (c.type === "evaluate") {
    if (!model || !data) throw new Error("Model unavailable");
    const evaluation = tf.tidy(() => {
      const out = model!.predict(data!.test.x) as tf.Tensor2D;
      const pred = Array.from(out.dataSync()),
        target = Array.from(data!.test.y.dataSync());
      const loss = (
        model!.evaluate(data!.test.x, data!.test.y) as tf.Scalar[]
      )[0].dataSync()[0];
      if (config.task === "classification") {
        const confusion = Array.from({ length: 4 }, () => [0, 0, 0, 0]);
        let correct = 0;
        for (let i = 0; i < 128; i++) {
          const p = pred.slice(i * 4, i * 4 + 4),
            t = target.slice(i * 4, i * 4 + 4),
            pi = p.indexOf(Math.max(...p)),
            ti = t.indexOf(1);
          confusion[ti][pi]++;
          if (pi === ti) correct++;
        }
        return { loss, score: correct / 128, confusion };
      }
      const dif = pred.map((v, i) => v - target[i]),
        mae = dif.reduce((s, v) => s + Math.abs(v), 0) / dif.length,
        rmse = Math.sqrt(dif.reduce((s, v) => s + v * v, 0) / dif.length);
      return { loss, score: rmse, mae, rmse };
    });
    emit({ type: "evaluation", evaluation });
  }
}
self.onmessage = (e) => {
  handle(e.data as Command).catch((error) => {
    running = false;
    emit({ type: "error", message: String(error) });
  });
};
