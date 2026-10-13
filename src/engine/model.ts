import * as tf from "./tf";
import { dataset, type Task } from "./dataset";
export type Config = {
  task: Task;
  seed: number;
  epochs: number;
  batchSize: number;
  learningRate: number;
  optimizer: "sgd" | "adam";
};
export function makeModel(config: Config) {
  const model = tf.sequential();
  let i = 0;
  const init = () => tf.initializers.glorotUniform({ seed: config.seed + i++ });
  model.add(
    tf.layers.conv2d({
      inputShape: [16, 16, 1],
      filters: 4,
      kernelSize: 3,
      padding: "same",
      activation: "relu",
      kernelInitializer: init(),
    }),
  );
  model.add(tf.layers.maxPooling2d({ poolSize: 2, strides: 2 }));
  model.add(
    tf.layers.conv2d({
      filters: 8,
      kernelSize: 3,
      padding: "same",
      activation: "relu",
      kernelInitializer: init(),
    }),
  );
  model.add(tf.layers.maxPooling2d({ poolSize: 2, strides: 2 }));
  model.add(tf.layers.flatten());
  model.add(
    tf.layers.dense({
      units: 16,
      activation: "relu",
      kernelInitializer: init(),
    }),
  );
  model.add(
    tf.layers.dense({
      units: config.task === "classification" ? 4 : 2,
      kernelInitializer: init(),
    }),
  );
  model.compile({
    optimizer:
      config.optimizer === "adam"
        ? tf.train.adam(config.learningRate)
        : tf.train.sgd(config.learningRate),
    loss:
      config.task === "classification"
        ? (target, pred) =>
            tf.losses.softmaxCrossEntropy(
              target as tf.Tensor2D,
              pred as tf.Tensor2D,
            )
        : "meanSquaredError",
    metrics: config.task === "classification" ? ["accuracy"] : ["mse"],
  });
  return model;
}
export function tensors(config: Config) {
  const data = dataset(config.task, config.seed);
  const convert = (s: { xs: number[][]; ys: number[][] }) => ({
    x: tf.tensor4d(s.xs.flat(), [s.xs.length, 16, 16, 1]),
    y:
      config.task === "classification"
        ? tf.oneHot(tf.tensor1d(s.ys.flat(), "int32"), 4)
        : tf.tensor2d(s.ys, [s.ys.length, 2]),
  });
  return {
    train: convert(data.train),
    validation: convert(data.validation),
    test: convert(data.test),
  };
}
export function shuffleOrder(size: number, seed: number) {
  let s = seed >>> 0;
  const order = Array.from({ length: size }, (_, i) => i);
  for (let i = size - 1; i > 0; i--) {
    s = (1664525 * s + 1013904223) >>> 0;
    const j = s % (i + 1);
    [order[i], order[j]] = [order[j], order[i]];
  }
  return order;
}
