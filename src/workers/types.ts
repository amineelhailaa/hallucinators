import type { Config } from "../engine/model";
export type Artifact = {
  topology: unknown;
  preprocessing: {shape:number[];dtype:string;range:number[];color:string};
  labels:string[];
  config: Config;
  metrics: Metric[];
  weights: { shape: number[]; values: number[] }[];
  initial: { shape: number[]; values: number[] }[];
  provenance: Record<string, unknown>;
};
export type Command =
  | { type: "restore"; runId: number; artifact: Artifact }
  | { type: "initialize"; runId: number; config: Config }
  | {
      type: "train" | "pause" | "resume" | "cancel" | "evaluate" | "dispose";
      runId: number;
    }
  | {
      type: "predict" | "inspect";
      runId: number;
      input: number[];
      initial?: boolean;
      tag?: string;
    };
export type Metric = {
  epoch: number;
  loss: number;
  valLoss: number;
  score: number;
  valScore: number;
  batch: number;
  weight: number;
};
export type TrainingEvent = {
  runId: number;
  type:
    | "ready"
    | "metric"
    | "batch"
    | "paused"
    | "complete"
    | "cancelled"
    | "error"
    | "evaluation"
    | "prediction";
  metric?: Metric;
  batch?: number;
  message?: string;
  output?: number[];
  initial?: boolean;
  tag?: string;
  layers?: { name: string; shape: number[]; values: number[] }[];
  weightBefore?: number;
  weightAfter?: number;
  weightDelta?: number;
  evaluation?: {
    loss: number;
    score: number;
    confusion?: number[][];
    mae?: number;
    rmse?: number;
  };
};
