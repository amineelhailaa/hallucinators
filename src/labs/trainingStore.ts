import { useEffect, useSyncExternalStore } from "react";
import type { Config } from "../engine/model";
import type {
  Metric,
  TrainingEvent,
  Command,
  Artifact,
} from "../workers/types";
const defaultConfig: Config = {
  task: "classification",
  seed: 7,
  epochs: 10,
  batchSize: 32,
  learningRate: 0.001,
  optimizer: "adam",
};
type State = {
  runId: number;
  config: Config;
  phase: string;
  batch: number;
  metrics: Metric[];
  mode: "live" | "recorded";
  initialWeight?: number;
  event?: TrainingEvent;
  comparisons: Record<string, TrainingEvent>;
  evaluation?: TrainingEvent["evaluation"];
  artifact?: Artifact;
};
let state: State = {
    runId: 0,
    config: defaultConfig,
    phase: "loading",
    batch: 0,
    metrics: [],
    mode: "live",
    comparisons: {},
  },
  worker: Worker | undefined;
let autoStart = 0;
const listeners = new Set<() => void>();
function set(next: Partial<State>) {
  state = { ...state, ...next };
  listeners.forEach((f) => f());
}
function ensure() {
  if (worker) return;
  worker = new Worker(
    new URL("../workers/training.worker.ts", import.meta.url),
    { type: "module" },
  );
  worker.onmessage = (e) => {
    const event = e.data as TrainingEvent;
    if (event.runId !== state.runId) return;
    if (event.type === "metric")
      set({ metrics: [...state.metrics, event.metric!] });
    else if (event.type === "batch") set({ batch: event.batch! });
    else if (event.type === "evaluation") set({ evaluation: event.evaluation });
    else if (event.type === "prediction")
      set({
        event,
        comparisons: event.tag
          ? { ...state.comparisons, [event.tag]: event }
          : state.comparisons,
      });
    else {
      set({
        phase: event.type === "ready" ? "ready" : event.type,
        event: event.type === "error" ? event : state.event,
        initialWeight:
          event.type === "ready" ? event.weightBefore : state.initialWeight,
      });
      if (event.type === "ready" && autoStart === state.runId) {
        autoStart = 0;
        command("train");
      }
    }
  };
  worker.onerror = (event) =>
    set({
      phase: "error",
      event: { runId: state.runId, type: "error", message: event.message },
    });
  configure(defaultConfig);
}
export function configure(config: Config) {
  autoStart = 0;
  set({
    config,
    runId: state.runId + 1,
    phase: "loading",
    metrics: [],
    batch: 0,
    mode: "live",
    event: undefined,
    evaluation: undefined,
    artifact: undefined,
    comparisons: {},
  });
  worker?.postMessage({
    type: "initialize",
    runId: state.runId,
    config,
  } satisfies Command);
}
export function start(config: Config) {
  configure(config);
  autoStart = state.runId;
}
export function command(
  type: "train" | "pause" | "resume" | "cancel" | "evaluate",
) {
  if (type === "train")
    set({
      phase: "running",
      metrics: [],
      batch: 0,
      evaluation: undefined,
      mode: "live",
    });
  if (type === "resume") set({ phase: "running" });
  worker?.postMessage({ type, runId: state.runId } satisfies Command);
}
export function predict(input: number[], initial = false, tag?: string) {
  worker?.postMessage({
    type: "inspect",
    runId: state.runId,
    input,
    initial,
    tag,
  } satisfies Command);
}
export async function restore(task: Config["task"] = state.config.task) {
  const artifact: Artifact = await fetch(
    `${import.meta.env.BASE_URL}runs/${task}.json`,
  ).then((r) => {
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return r.json();
  });
  set({
    runId: state.runId + 1,
    config: artifact.config,
    phase: "loading",
    metrics: artifact.metrics,
    batch: artifact.metrics.at(-1)?.batch ?? 0,
    mode: "recorded",
    artifact,
    event: undefined,
    evaluation: undefined,
  });
  worker?.postMessage({
    type: "restore",
    runId: state.runId,
    artifact,
  } satisfies Command);
}
export function useTraining() {
  const result = useSyncExternalStore(
    (f) => {
      listeners.add(f);
      return () => listeners.delete(f);
    },
    () => state,
  );
  useEffect(() => ensure(), []);
  return result;
}
