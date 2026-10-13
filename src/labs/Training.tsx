import { useState } from "react";
import { useTranslation } from "react-i18next";
import { scaleLinear } from "d3-scale";
import { line } from "d3-shape";
import {
  Range,
  Select,
  Stat,
  Panel,
  Playback,
  PixelCanvas,
  Matrix,
  number,
} from "../components/Shared";
import {
  useTraining,
  configure,
  start,
  command,
  restore,
  predict,
} from "./trainingStore";
import { sample, labels } from "../engine/dataset";
import { random } from "../engine/math";
import type { Config } from "../engine/model";
function Chart({
  metrics,
}: {
  metrics: ReturnType<typeof useTraining>["metrics"];
}) {
  const { t } = useTranslation();
  const x = scaleLinear()
      .domain([1, Math.max(2, metrics.length)])
      .range([50, 540]),
    y = scaleLinear()
      .domain([
        0,
        Math.max(0.1, ...metrics.flatMap((m) => [m.loss, m.valLoss])) * 1.1,
      ])
      .range([210, 20]);
  const shape = line<{ epoch: number; loss: number }>()
    .x((d) => x(d.epoch))
    .y((d) => y(d.loss));
  return (
    <>
      <svg
        viewBox="0 0 570 255"
        className="chart"
        role="img"
        aria-label={t("trainVal")}
      >
        <path d="M50 20V210H550" stroke="#647680" fill="none" />
        {y.ticks(4).map((v) => (
          <g key={v}>
            <path d={`M50 ${y(v)}H550`} stroke="#29333e" />
            <text x={4} y={y(v) + 4} fill="#c0ccc5" fontSize={12}>
              {number(v)}
            </text>
          </g>
        ))}
        <path
          d={shape(metrics) || ""}
          fill="none"
          stroke="#a9edb9"
          strokeWidth={3}
        />
        <path
          d={shape(metrics.map((m) => ({ ...m, loss: m.valLoss }))) || ""}
          fill="none"
          stroke="#f1c36b"
          strokeWidth={3}
          strokeDasharray="5 3"
        />
        <text x={280} y={245} fill="#d8e4dc">
          {t("epoch")}
        </text>
      </svg>
      <div className="legend">
        <span>━ {t("loss")}</span>
        <span>┄ {t("valLoss")}</span>
      </div>
      <details>
        <summary>{t("snapshot")}</summary>
        <div className="tableScroll">
          <table>
            <thead>
              <tr>
                <th>{t("epoch")}</th>
                <th>{t("loss")}</th>
                <th>{t("valLoss")}</th>
                <th>{t("metric")}</th>
                <th>w₀</th>
              </tr>
            </thead>
            <tbody>
              {metrics.map((m) => (
                <tr key={m.epoch}>
                  <td>{m.epoch}</td>
                  <td>{number(m.loss)}</td>
                  <td>{number(m.valLoss)}</td>
                  <td>{number(m.valScore)}</td>
                  <td>{number(m.weight)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </>
  );
}
export function Training() {
  const { t } = useTranslation(),
    state = useTraining(),
    [draft, setDraft] = useState<Config>(state.config),
    [step, setStep] = useState(0),
    [error, setError] = useState("");
  const busy = ["running", "paused", "loading"].includes(state.phase),
    metric = state.metrics[Math.min(step, state.metrics.length - 1)];
  function change<K extends keyof Config>(key: K, value: Config[K]) {
    setDraft({ ...draft, [key]: value });
  }
  return (
    <>
      <div className="labStatus">
        <span className="statusDot" />
        {t(state.mode)} ·{" "}
        {t(state.phase === "metric" ? "running" : state.phase)}{" "}
        <code>#{state.runId}</code>
      </div>
      <div className="controls">
        <Select
          label={t("task")}
          value={draft.task}
          onChange={(v) => change("task", v as Config["task"])}
          options={["classification", "regression"].map((v) => ({
            value: v,
            label: t(v),
          }))}
        />
        <label className="select">
          <span>{t("seed")}</span>
          <input
            type="number"
            min={0}
            max={99999}
            value={draft.seed}
            onChange={(e) =>
              change("seed", Math.max(0, Math.min(99999, +e.target.value)))
            }
          />
        </label>
        <Select
          label={t("batchSize")}
          value={draft.batchSize}
          onChange={(v) => change("batchSize", +v)}
          options={[16, 32, 64].map((v) => ({ value: v, label: String(v) }))}
        />
        <Select
          label={t("optimizer")}
          value={draft.optimizer}
          onChange={(v) =>
            setDraft({
              ...draft,
              optimizer: v as Config["optimizer"],
              learningRate: v === "adam" ? 0.001 : 0.01,
            })
          }
          options={["adam", "sgd"].map((v) => ({
            value: v,
            label: v.toUpperCase(),
          }))}
        />
        <Range
          label={t("epochs")}
          value={draft.epochs}
          onChange={(v) => change("epochs", v)}
          min={1}
          max={30}
          step={1}
        />
        <Range
          label={t("learningRate")}
          value={draft.learningRate}
          onChange={(v) => change("learningRate", v)}
          min={0.0005}
          max={0.03}
          step={0.0005}
        />
      </div>
      <div className="actions">
        <button
          className="primary"
          disabled={busy}
          onClick={() => {
            configure(draft);
            setStep(0);
            setError("");
          }}
        >
          {t("reset")}
        </button>
        <button
          className="primary"
          disabled={busy}
          onClick={() => {
            start(draft);
            setStep(0);
          }}
        >
          {t("train")}
        </button>
        <button
          disabled={state.phase !== "running" && state.phase !== "paused"}
          onClick={() => command(state.phase === "paused" ? "resume" : "pause")}
        >
          {t(state.phase === "paused" ? "resume" : "pause")}
        </button>
        <button
          disabled={!["running", "paused"].includes(state.phase)}
          onClick={() => command("cancel")}
        >
          {t("cancel")}
        </button>
        <button
          disabled={busy}
          onClick={() =>
            restore(draft.task)
              .then(() => setStep(0))
              .catch((e) => setError(String(e)))
          }
        >
          {t("loadRecorded")}
        </button>
      </div>
      <p className="note">
        {t("browserNote")} {t("sampleNote")}
      </p>
      {(error || state.phase === "error") && (
        <p role="alert">
          {t("error")}: {error || state.event?.message}
        </p>
      )}
      <div className="stats">
        <Stat
          label={t("batch")}
          value={`${state.batch} / ${state.config.epochs * Math.ceil(512 / state.config.batchSize)}`}
        />
        <Stat
          label={t("epoch")}
          value={`${state.metrics.length} / ${state.config.epochs}`}
        />
        <Stat label={t("loss")} value={metric ? number(metric.loss) : "—"} />
        <Stat
          label={t("valLoss")}
          value={metric ? number(metric.valLoss) : "—"}
        />
        <Stat
          label={t("metric")}
          value={state.config.task === "classification" ? "Accuracy" : "MSE"}
        />
        <Stat
          label="Δ w₀"
          value={
            metric
              ? number(metric.weight - (state.initialWeight ?? metric.weight))
              : "—"
          }
        />
      </div>
      {state.metrics.length ? (
        <>
          <Chart metrics={state.metrics} />
          <Playback
            step={Math.min(step, state.metrics.length - 1)}
            setStep={setStep}
            total={state.metrics.length}
            reset={() => setStep(0)}
          />
        </>
      ) : (
        <div className="empty">{t("emptyHistory")}</div>
      )}
      <div className="actions">
        <button
          disabled={busy || !state.metrics.length}
          onClick={() => command("evaluate")}
        >
          {t("evaluate")}
        </button>
        <button
          disabled={!state.metrics.length}
          onClick={() => {
            const blob = new Blob(
                [
                  JSON.stringify(
                    {
                      config: state.config,
                      mode: state.mode,
                      metrics: state.metrics,
                      evaluation: state.evaluation,
                      provenance: state.artifact?.provenance ?? {
                        engine: "TensorFlow.js",
                        backend: "cpu",
                        source: "live worker",
                      },
                    },
                    null,
                    2,
                  ),
                ],
                { type: "application/json" },
              ),
              url = URL.createObjectURL(blob),
              a = document.createElement("a");
            a.href = url;
            a.download = "hallucinators-run.json";
            a.click();
            URL.revokeObjectURL(url);
          }}
        >
          {t("download")}
        </button>
      </div>
      <small>{t("heldOut")}</small>
      {state.evaluation && (
        <Panel title={t("test")}>
          <div className="stats">
            <Stat label={t("loss")} value={number(state.evaluation.loss)} />
            <Stat
              label={t(
                state.config.task === "classification" ? "accuracy" : "rmse",
              )}
              value={number(state.evaluation.score)}
            />
            {state.evaluation.mae !== undefined && (
              <Stat label={t("mae")} value={number(state.evaluation.mae)} />
            )}
          </div>
          {state.evaluation.confusion && (
            <>
              <p>{t("confusion")}</p>
              <div className="tableScroll">
                <table>
                  <thead>
                    <tr>
                      <th>{t("target")}</th>
                      {labels.map((l) => (
                        <th key={l}>{t(l)}</th>
                      ))}
                      <th>{t("support")}</th>
                      <th>{t("precision")}</th>
                      <th>{t("recall")}</th>
                      <th>F1</th>
                    </tr>
                  </thead>
                  <tbody>
                    {state.evaluation.confusion.map((row, i) => {
                      const tp = row[i],
                        p =
                          tp /
                          (state.evaluation!.confusion!.reduce(
                            (s, r) => s + r[i],
                            0,
                          ) || 1),
                        r = tp / (row.reduce((s, v) => s + v, 0) || 1);
                      return (
                        <tr key={i}>
                          <th>{t(labels[i])}</th>
                          {row.map((v, j) => (
                            <td key={j}>{v}</td>
                          ))}
                          <td>{row.reduce((s, v) => s + v, 0)}</td>
                          <td>{number(p)}</td>
                          <td>{number(r)}</td>
                          <td>{number(p + r ? (2 * p * r) / (p + r) : 0)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <Stat
                label={t("macroF1")}
                value={number(
                  state.evaluation.confusion.reduce((sum, row, i) => {
                    const tp = row[i],
                      p =
                        tp /
                        (state.evaluation!.confusion!.reduce(
                          (s, r) => s + r[i],
                          0,
                        ) || 1),
                      r = tp / (row.reduce((s, v) => s + v, 0) || 1);
                    return sum + (p + r ? (2 * p * r) / (p + r) : 0);
                  }, 0) / 4,
                )}
              />
            </>
          )}
        </Panel>
      )}
      {state.artifact && (
        <details>
          <summary>
            {t("recorded")} · {t("sources")}
          </summary>
          <pre>{JSON.stringify(state.artifact.provenance, null, 2)}</pre>
        </details>
      )}
    </>
  );
}
export function Inference() {
  const { t } = useTranslation(),
    state = useTraining(),
    [direction, setDirection] = useState(0),
    [initial, setInitial] = useState(false),
    [step, setStep] = useState(0),
    [channel, setChannel] = useState(0),
    [drawn, setDrawn] = useState<number[] | null>(null),
    [paint, setPaint] = useState(1),
    s = sample(state.config.task, random(9), direction),
    input = drawn ?? s.input.values,
    event = state.event?.type === "prediction" ? state.event : undefined,
    layer = event?.layers?.[Math.min(step, event.layers.length - 1)];
  return (
    <>
      <div className="controls">
        <Select
          label={t("task")}
          value={state.config.task}
          onChange={(v) => {
            configure({ ...state.config, task: v as Config["task"] });
            setDrawn(null);
            setStep(0);
          }}
          options={["classification", "regression"].map((v) => ({
            value: v,
            label: t(v),
          }))}
        />
        <Select
          label={t("target")}
          value={direction}
          onChange={(v) => {
            setDirection(+v);
            setDrawn(null);
          }}
          options={labels.map((v, i) => ({ value: i, label: t(v) }))}
        />
        <Select
          label={t("modelSelect")}
          value={initial ? "initial" : "trained"}
          onChange={(v) => setInitial(v === "initial")}
          options={["initial", "trained"].map((v) => ({
            value: v,
            label: t(v),
          }))}
        />
        <Range
          label={t("paint")}
          value={paint}
          onChange={setPaint}
          min={0}
          max={1}
          step={0.1}
        />
        <button onClick={() => setDrawn(new Array(256).fill(0))}>
          {t("clear")}
        </button>
      </div>
      <div className="split">
        <div>
          <PixelCanvas tensor={{ shape: [16, 16, 1], values: input }} />
          <details>
            <summary>{t("draw")}</summary>
            <Matrix
              tensor={{ shape: [16, 16, 1], values: input }}
              label={t("input")}
              onSelect={(i) =>
                setDrawn(input.map((v, j) => (j === i ? paint : v)))
              }
            />
          </details>
        </div>
        <div>
          <button
            className="primary"
            disabled={["loading", "running", "paused"].includes(state.phase)}
            onClick={() => {
              predict(input, initial);
              setStep(0);
            }}
          >
            {t("predict")}
          </button>
          <p className="note">{t("frozen")}</p>
          {event?.output && (
            <div className="probabilities">
              {event.output.map((v, i) => (
                <div key={i}>
                  <span>
                    {state.config.task === "classification"
                      ? t(labels[i])
                      : ["x", "y"][i]}
                  </span>
                  <code>{number(v)}</code>
                </div>
              ))}
            </div>
          )}
          {event && (
            <div className="stat">
              <small>{t("weightsFrozen")}</small>
              <strong>max |Δw| = {number(event.weightDelta ?? 0)}</strong>
            </div>
          )}
        </div>
      </div>
      {layer && (
        <Panel title={`${t("feature")} · ${step + 1}`} tag={layer.name}>
          {layer.shape.length === 4 && (
            <Select
              label={t("channel")}
              value={Math.min(channel, layer.shape[3] - 1)}
              onChange={(v) => setChannel(+v)}
              options={Array.from({ length: layer.shape[3] }, (_, i) => ({
                value: i,
                label: String(i),
              }))}
            />
          )}
          <code>[B, …] = [{layer.shape.join(", ")}]</code>
          {layer.shape.length === 4 ? (
            <>
              <PixelCanvas
                tensor={{
                  shape: [layer.shape[1], layer.shape[2], 1],
                  values: layer.values.filter(
                    (_, i) =>
                      i % layer.shape[3] ===
                      Math.min(channel, layer.shape[3] - 1),
                  ),
                }}
              />
              <Matrix
                channel={Math.min(channel, layer.shape[3] - 1)}
                tensor={{ shape: layer.shape.slice(1), values: layer.values }}
                label={t("feature")}
              />
            </>
          ) : (
            <Matrix
              tensor={{
                shape: [1, layer.values.length, 1],
                values: layer.values,
              }}
              label={t("feature")}
            />
          )}
          <Playback
            step={step}
            setStep={(v) => {
              setStep(v);
              setChannel(0);
            }}
            total={event?.layers?.length ?? 1}
            reset={() => setStep(0)}
          />
        </Panel>
      )}
    </>
  );
}
