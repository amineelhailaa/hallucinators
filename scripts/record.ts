import * as tf from "../src/engine/tf";
import { writeFile, mkdir } from "node:fs/promises";
import {
  makeModel,
  tensors,
  shuffleOrder,
  type Config,
} from "../src/engine/model";
await tf.setBackend("cpu");
await tf.ready();
await mkdir("public/runs", { recursive: true });
for (const task of ["classification", "regression"] as const) {
  const config: Config = {
      task,
      seed: 7,
      epochs: 10,
      batchSize: 32,
      learningRate: 0.001,
      optimizer: "adam",
    },
    model = makeModel(config),
    data = tf.tidy(() => tensors(config)),
    metrics = [];
  const weights = () =>
      tf.tidy(() =>
        model
          .getWeights()
          .map((t) => ({ shape: t.shape, values: Array.from(t.dataSync()) })),
      ),
    initial = weights();
  for (let epoch = 0; epoch < config.epochs; epoch++) {
    const order = shuffleOrder(512, config.seed + epoch);
    for (let start = 0; start < 512; start += 32) {
      const batch = tf.tidy(() => {
        const ids = tf.tensor1d(order.slice(start, start + 32), "int32");
        return {
          x: tf.gather(data.train.x, ids),
          y: tf.gather(data.train.y, ids),
        };
      });
      await model.trainOnBatch(batch.x, batch.y);
      batch.x.dispose();
      batch.y.dispose();
    }
    const m = tf.tidy(() => {
      const tr = model.evaluate(data.train.x, data.train.y) as tf.Scalar[],
        va = model.evaluate(
          data.validation.x,
          data.validation.y,
        ) as tf.Scalar[];
      return {
        epoch: epoch + 1,
        loss: tr[0].dataSync()[0],
        score: tr[1].dataSync()[0],
        valLoss: va[0].dataSync()[0],
        valScore: va[1].dataSync()[0],
        batch: (epoch + 1) * 16,
        weight: model.getWeights()[0].dataSync()[0],
      };
    });
    metrics.push(m);
    process.stdout.write(
      `${task} epoch ${epoch + 1}: ${m.loss.toFixed(4)} / ${m.valLoss.toFixed(4)}\n`,
    );
  }
  await writeFile(
    `public/runs/${task}.json`,
    JSON.stringify({
      schema: 1,
      label: "Recorded run",
      provenance: {
        engine: `TensorFlow.js ${tf.version.tfjs}`,
        backend: "cpu",
        generator: "src/engine/dataset.ts",
        script: "npm run record",
        splits: [512, 128, 128],
        shuffle: "seeded per epoch",
      },
      topology: model.toJSON(undefined, false),
      preprocessing: {shape:[16,16,1],dtype:'float32',range:[0,1],color:'grayscale'},
      labels: task==='classification'?['up','right','down','left']:['x','y'],
      config,
      metrics,
      initial,
      weights: weights(),
    }),
  );
  model.optimizer.dispose();
  model.dispose();
  Object.values(data).forEach((s) => {
    s.x.dispose();
    s.y.dispose();
  });
}
