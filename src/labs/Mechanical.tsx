import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import {
  Range,
  Select,
  Matrix,
  PixelCanvas,
  Playback,
  Stat,
  Formula,
  number,
  Panel,
} from "../components/Shared";
import {
  activations,
  derivative,
  dot,
  conv2d,
  pool,
  softmax,
  crossEntropy,
  mse,
  unflatten,
  transform,
  random,
  type Tensor,
  type Activation,
} from "../engine/math";
import { useTraining, configure, predict } from "./trainingStore";
import { sample, labels, type Task } from "../engine/dataset";
const options = (names: string[], t: (s: string) => string) =>
  names.map((value) => ({ value, label: t(value) }));
const base = {
  shape: [4, 4, 1],
  values: [0, 1, 2, 0, 1, 3, 4, 1, 0, 2, 1, 0, 0, 1, 0, 2],
};
export function Pixels() {
  const { t } = useTranslation();
  const [size, setSize] = useState(4),
    [rgb, setRgb] = useState(false),
    [norm, setNorm] = useState(true),
    [paint, setPaint] = useState(255),
    [channel, setChannel] = useState(0),
    [selected, setSelected] = useState(5),
    [values, setValues] = useState(
      Array.from({ length: 16 }, (_, i) => [0, 64, 128, 255][(i * 7) % 4]),
    );
  const tensor = {
      shape: [size, size, rgb ? 3 : 1],
      values: values.map((v) => v / 255),
    },
    display = { ...tensor, values: values.map((v) => (norm ? v / 255 : v)) };
  function resize(n: number) {
    const c = rgb ? 3 : 1;
    setValues(
      Array.from({ length: n * n * c }, (_, i) => {
        const y = Math.floor(i / c / n),
          x = Math.floor(i / c) % n,
          ch = i % c;
        return (
          values[
            (Math.min(size - 1, Math.floor((y * size) / n)) * size +
              Math.min(size - 1, Math.floor((x * size) / n))) *
              c +
              ch
          ] ?? 0
        );
      }),
    );
    setSize(n);
    setSelected(0);
  }
  return (
    <>
      <div className="controls">
        <Select
          label={t("channels")}
          value={rgb ? "rgb" : "grayscale"}
          options={options(["grayscale", "rgb"], t)}
          onChange={(v) => {
            const next = v === "rgb";
            setValues(
              Array.from(
                { length: size * size * (next ? 3 : 1) },
                (_, i) =>
                  values[Math.floor(i / (next ? 3 : 1)) * (rgb ? 3 : 1)] ?? 0,
              ),
            );
            setRgb(next);
            setChannel(0);
          }}
        />
        <Select
          label={t("size")}
          value={size}
          onChange={(v) => resize(+v)}
          options={[4, 8, 16].map((v) => ({ value: v, label: `${v}×${v}` }))}
        />
        {rgb && (
          <Select
            label={t("channel")}
            value={channel}
            onChange={(v) => setChannel(+v)}
            options={["R", "G", "B"].map((v, i) => ({ value: i, label: v }))}
          />
        )}
        <Range
          label={t("paint")}
          value={paint}
          onChange={setPaint}
          min={0}
          max={255}
          step={1}
        />
        <label className="toggle">
          <input
            type="checkbox"
            checked={norm}
            onChange={(e) => setNorm(e.target.checked)}
          />
          {t("normalize")}
        </label>
      </div>
      <div className="split">
        <PixelCanvas tensor={tensor} />
        <Matrix
          tensor={display}
          selected={selected}
          channel={channel}
          label={t("input")}
          onSelect={(i) => {
            setSelected(i);
            setValues((v) =>
              v.map((x, j) => (j === i * (rgb ? 3 : 1) + channel ? paint : x)),
            );
          }}
        />
      </div>
      <div className="stats">
        <Stat label="[B,H,W,C]" value={`[1,${size},${size},${rgb ? 3 : 1}]`} />
        <Stat
          label={t("selected")}
          value={`[0,${Math.floor(selected / size)},${selected % size},${channel}]`}
        />
        <Stat
          label={t("value")}
          value={number(
            display.values[selected * (rgb ? 3 : 1) + channel] ?? 0,
          )}
        />
      </div>
      <Playback
        step={selected}
        setStep={setSelected}
        total={size * size}
        reset={() => {
          setSelected(0);
          setValues(new Array(size * size * (rgb ? 3 : 1)).fill(0));
        }}
      />
    </>
  );
}
export function Neuron() {
  const { t } = useTranslation();
  const [x, setX] = useState([2, 3]),
    [w, setW] = useState([0.5, -1]),
    [b, setB] = useState(2),
    [kind, setKind] = useState<Activation>("relu"),
    [step, setStep] = useState(0),
    z = dot(x, w, b),
    a = activations[kind](z);
  return (
    <>
      <div className="split">
        <div>
          {x.map((v, i) => (
            <Range
              key={i}
              label={`x${i + 1}`}
              value={v}
              onChange={(v) => setX(x.map((a, j) => (i === j ? v : a)))}
            />
          ))}
          {w.map((v, i) => (
            <Range
              key={i}
              label={`${t("weights")} w${i + 1}`}
              value={v}
              onChange={(v) => setW(w.map((a, j) => (i === j ? v : a)))}
            />
          ))}
          <Range label={t("bias")} value={b} onChange={setB} />
          <Select
            label={t("activation")}
            value={kind}
            onChange={(v) => setKind(v as Activation)}
            options={options(Object.keys(activations), t)}
          />
        </div>
        <div className="neuronDiagram" dir="ltr">
          <div className={step === 0 ? "active" : ""}>
            x₁ × w₁ = {number(x[0] * w[0])}
          </div>
          <div className={step === 1 ? "active" : ""}>
            x₂ × w₂ = {number(x[1] * w[1])}
          </div>
          <div className={step === 2 ? "active" : ""}>
            Σ + b → z = {number(z)}
          </div>
          <div className={step === 3 ? "active" : ""}>
            {kind}(z) → {number(a)}
          </div>
        </div>
      </div>
      <div className="stats">
        <Stat label={t("output")} value={number(a)} />
        <Stat label={t("derivative")} value={number(derivative(z, kind))} />
      </div>
      <Playback
        step={step}
        setStep={setStep}
        total={4}
        reset={() => {
          setX([2, 3]);
          setW([0.5, -1]);
          setB(2);
          setStep(0);
        }}
      />
    </>
  );
}
export function Composition() {
  const { t } = useTranslation();
  const [nonlinear, setNonlinear] = useState(true),
    [preset, setPreset] = useState("xor"),
    [step, setStep] = useState(0);
  const points =
      preset === "xor"
        ? [
            [0, 0],
            [0, 1],
            [1, 0],
            [1, 1],
          ]
        : [
            [-1, 0],
            [-0.5, 1],
            [0, 0],
            [1, 1],
          ],
    hidden = points.map(([a, b]) =>
      preset === "affine"
        ? [nonlinear ? Math.max(0, 2 * a + 1) : 2 * a + 1, 0]
        : nonlinear
          ? [Math.max(0, a - b), Math.max(0, b - a)]
          : [a - b, b - a],
    );
  return (
    <>
      <div className="controls">
        <Select
          label={t("network")}
          value={preset}
          onChange={setPreset}
          options={options(["xor", "affine"], t)}
        />
        <label className="toggle">
          <input
            type="checkbox"
            checked={nonlinear}
            onChange={(e) => setNonlinear(e.target.checked)}
          />
          {t("withActivation")}
        </label>
      </div>
      <div className="split">
        <svg viewBox="0 0 280 250" role="img" aria-label={t("hidden")}>
          <path d="M40 15V210H265" fill="none" stroke="#768a96" />
          {Array.from({ length: 20 }, (_, iy) =>
            Array.from({ length: 20 }, (_, ix) => {
              const a = preset === "xor" ? ix / 19 : (2 * ix) / 19 - 1,
                b = iy / 19,
                h =
                  preset === "xor"
                    ? nonlinear
                      ? Math.abs(a - b)
                      : 0
                    : 3 * (nonlinear ? Math.max(0, 2 * a + 1) : 2 * a + 1) - 4;
              return (
                <rect
                  key={`${ix}-${iy}`}
                  x={40 + ix * 10}
                  y={200 - iy * 9}
                  width={10}
                  height={9}
                  fill={h > 0.5 ? "#43625e" : "#222e3a"}
                />
              );
            }),
          )}
          {points.map((p, i) => (
            <g key={i}>
              <circle
                cx={40 + (preset === "xor" ? p[0] : (p[0] + 1) / 2) * 190}
                cy={205 - p[1] * 180}
                r={8}
                fill={
                  i === step
                    ? "#f1c36b"
                    : i === 1 || i === 2
                      ? "#a9edb9"
                      : "#eaa5a2"
                }
              />
              <text
                x={45 + (preset === "xor" ? p[0] : (p[0] + 1) / 2) * 180}
                y={220 - p[1] * 180}
                fill="#e2e8df"
              >
                ({p.join(",")})
              </text>
            </g>
          ))}
        </svg>
        <div>
          <Formula
            value={
              preset === "xor"
                ? "h_1=\\phi(x_1-x_2),\\quad h_2=\\phi(x_2-x_1)"
                : "f(x)=3\\phi(2x+1)-4"
            }
          />
          <table>
            <thead>
              <tr>
                <th>{t("input")}</th>
                <th>{t("hidden")}</th>
                <th>{t("output")}</th>
              </tr>
            </thead>
            <tbody>
              {points.map((p, i) => (
                <tr key={i} className={step === i ? "active" : ""}>
                  <td>{p.join(", ")}</td>
                  <td>{hidden[i].join(", ")}</td>
                  <td>
                    {preset === "xor"
                      ? hidden[i][0] + hidden[i][1]
                      : 3 * hidden[i][0] - 4}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <p className="note">{t("affineNote")}</p>
      <Playback
        step={step}
        setStep={setStep}
        total={4}
        reset={() => {
          setNonlinear(true);
          setStep(0);
        }}
      />
    </>
  );
}
export function Convolution() {
  const { t } = useTranslation();
  const [k, setK] = useState([1, 0, -1, 1, 0, -1, 1, 0, -1]),
    [stride, setStride] = useState(1),
    [padding, setPadding] = useState<"same" | "valid">("valid"),
    [dilation, setDilation] = useState(1),
    [channels, setChannels] = useState(1),
    [channel, setChannel] = useState(0),
    [step, setStep] = useState(0);
  const input: Tensor = {
      shape: [6, 6, channels],
      values: Array.from(
        { length: 36 * channels },
        (_, i) => ((Math.floor(i / channels) + (i % channels)) % 7) / 6,
      ),
    },
    kernel: Tensor = { shape: [3, 3, channels, 1], values: k },
    out = conv2d(input, kernel, [0], stride, padding, dilation),
    y = Math.floor(step / out.shape[1]),
    x = step % out.shape[1],
    effective = 2 * dilation + 1,
    ph =
      padding === "same"
        ? Math.floor(
            Math.max(0, (out.shape[0] - 1) * stride + effective - 6) / 2,
          )
        : 0;
  const patch = Array.from({ length: 9 }, (_, i) => {
    const iy = y * stride + Math.floor(i / 3) * dilation - ph,
      ix = x * stride + (i % 3) * dilation - ph;
    return iy >= 0 && iy < 6 && ix >= 0 && ix < 6 ? iy * 6 + ix : -1;
  });
  return (
    <>
      <div className="controls">
        <Select
          label={t("stride")}
          value={stride}
          onChange={(v) => {
            setStride(+v);
            setStep(0);
          }}
          options={[1, 2].map((v) => ({ value: v, label: String(v) }))}
        />
        <Select
          label={t("padding")}
          value={padding}
          onChange={(v) => {
            setPadding(v as "same" | "valid");
            setStep(0);
          }}
          options={options(["valid", "same"], t)}
        />
        <Select
          label={t("dilation")}
          value={dilation}
          onChange={(v) => {
            setDilation(+v);
            setStep(0);
          }}
          options={[1, 2].map((v) => ({ value: v, label: String(v) }))}
        />
        <Select
          label={t("channels")}
          value={channels}
          onChange={(v) => {
            const next = +v;
            setK(
              Array.from(
                { length: 9 * next },
                (_, i) =>
                  k[
                    Math.floor(i / next) * channels +
                      Math.min(i % next, channels - 1)
                  ],
              ),
            );
            setChannels(next);
            setChannel(0);
          }}
          options={[1, 3].map((v) => ({ value: v, label: String(v) }))}
        />
        <Select
          label={t("channel")}
          value={channel}
          onChange={(v) => setChannel(+v)}
          options={Array.from({ length: channels }, (_, i) => ({
            value: i,
            label: String(i),
          }))}
        />
      </div>
      <div className="triple">
        <div>
          <h3>{t("input")}</h3>
          <Matrix
            tensor={input}
            channel={channel}
            highlight={patch}
            label={t("input")}
          />
        </div>
        <div>
          <h3>{t("kernel")}</h3>
          <div className="kernel" dir="ltr">
            {Array.from({ length: 9 }, (_, i) => (
              <input
                key={i}
                type="number"
                aria-label={`${t("kernel")} ${i}`}
                min={-5}
                max={5}
                step={1}
                value={k[i * channels + channel]}
                onChange={(e) =>
                  setK(
                    k.map((a, j) =>
                      i * channels + channel === j
                        ? Math.max(-5, Math.min(5, +e.target.value))
                        : a,
                    ),
                  )
                }
              />
            ))}
          </div>
          <small>
            {t("contribution")} C{channel}:{" "}
            {number(
              patch.reduce(
                (sum, p, i) =>
                  sum +
                  (p < 0 ? 0 : input.values[p * channels + channel]) *
                    k[i * channels + channel],
                0,
              ),
            )}
          </small>
        </div>
        <div>
          <h3>{t("output")}</h3>
          <Matrix
            tensor={out}
            selected={step}
            label={t("output")}
            onSelect={setStep}
          />
        </div>
      </div>
      <div className="stats">
        <Stat
          label={t("selected")}
          value={`[${y},${x},0] = ${number(out.values[step])}`}
        />
        <Stat label={t("params")} value={9 * channels + 1} />
        <Stat label="[B,H,W,C]" value={`[1,${out.shape.join(",")}]`} />
      </div>
      <Playback
        step={step}
        setStep={setStep}
        total={out.values.length}
        reset={() => {
          setStep(0);
          setChannels(1);
          setChannel(0);
          setStride(1);
          setPadding("valid");
          setDilation(1);
          setK([1, 0, -1, 1, 0, -1, 1, 0, -1]);
        }}
      />
    </>
  );
}
export function Pooling() {
  const { t } = useTranslation();
  const [mode, setMode] = useState<"max" | "average">("max"),
    [size, setSize] = useState(2),
    [step, setStep] = useState(0),
    out = pool(base, size, mode),
    w = out.shape[1],
    highlight = Array.from(
      { length: size * size },
      (_, i) =>
        (Math.floor(step / w) * size + Math.floor(i / size)) * 4 +
        (step % w) * size +
        (i % size),
    );
  return (
    <>
      <div className="controls">
        <Select
          label={t("model")}
          value={mode}
          onChange={(v) => setMode(v as "max" | "average")}
          options={options(["max", "average"], t)}
        />
        <Select
          label={t("window")}
          value={size}
          onChange={(v) => {
            setSize(+v);
            setStep(0);
          }}
          options={[2, 4].map((v) => ({ value: v, label: `${v}×${v}` }))}
        />
      </div>
      <div className="split">
        <Matrix tensor={base} highlight={highlight} label={t("input")} />
        <Matrix
          tensor={out}
          selected={step}
          label={t("output")}
          onSelect={setStep}
        />
      </div>
      <Panel title={t("collision")}>
        <div className="split">
          <Matrix
            tensor={{ shape: [2, 2, 1], values: [1, 0, 0, 0] }}
            label="A"
          />
          <Matrix
            tensor={{ shape: [2, 2, 1], values: [0, 1, 0, 0] }}
            label="B"
          />
        </div>
        <p dir="ltr">
          A → {mode === "max" ? 1 : 0.25} ; B → {mode === "max" ? 1 : 0.25}
        </p>
      </Panel>
      <p className="note">{t("poolNote")}</p>
      <Playback
        step={step}
        setStep={setStep}
        total={out.values.length}
        reset={() => {
          setStep(0);
          setSize(2);
          setMode("max");
        }}
      />
    </>
  );
}
export function Flatten() {
  const { t } = useTranslation();
  const [step, setStep] = useState(0),
    [channel, setChannel] = useState(0),
    [output, setOutput] = useState(0);
  const shape = [2, 2, 2],
    values = [1, 2, 3, 4, 5, 6, 7, 8],
    coords = unflatten(step, shape),
    weights = values.map((_, i) => ((i % 3) - 1) * 0.25 + output * 0.1),
    sum = dot(values, weights, 0.5);
  return (
    <>
      <div className="controls">
        <Select
          label={t("channel")}
          value={channel}
          onChange={(v) => setChannel(+v)}
          options={[0, 1].map((v) => ({ value: v, label: String(v) }))}
        />
        <Select
          label={t("output")}
          value={output}
          onChange={(v) => setOutput(+v)}
          options={[0, 1, 2].map((v) => ({ value: v, label: `z${v}` }))}
        />
      </div>
      <div className="split">
        <Matrix
          tensor={{ shape, values }}
          channel={channel}
          selected={Math.floor(step / 2)}
          label={t("feature")}
          onSelect={(i) => setStep(i * 2 + channel)}
        />
        <Matrix
          tensor={{ shape: [1, 8, 1], values }}
          selected={step}
          label="Flatten"
          onSelect={(i) => {
            setStep(i);
            setChannel(i % 2);
          }}
        />
      </div>
      <div className="stats">
        <Stat label={t("mapping")} value={`[${coords.join(",")}] ↔ ${step}`} />
        <Stat
          label={t("contribution")}
          value={`${values[step]} × ${number(weights[step])} = ${number(values[step] * weights[step])}`}
        />
        <Stat label={`z${output} = Σ + b`} value={number(sum)} />
        <Stat label="Flatten / P" value={0} />
      </div>
      <Formula value="z_j=\\sum_k W_{k,j}a_k+b_j" />
      <p className="note">{t("flattenNote")}</p>
      <Playback
        step={step}
        setStep={(i) => {
          setStep(i);
          setChannel(i % 2);
        }}
        total={8}
        reset={() => {
          setStep(0);
          setChannel(0);
        }}
      />
    </>
  );
}
export function Loss() {
  const { t } = useTranslation();
  const [task, setTask] = useState("classification"),
    [logits, setLogits] = useState([1, 0, -1, 0]),
    [target, setTarget] = useState(0),
    [pred, setPred] = useState(0.8),
    [goal, setGoal] = useState(0.5),
    [step, setStep] = useState(0),
    p = softmax(logits);
  return (
    <>
      <Select
        label={t("task")}
        value={task}
        onChange={setTask}
        options={options(["classification", "regression"], t)}
      />
      {task === "classification" ? (
        <>
          <div className="split">
            <div>
              {logits.map((v, i) => (
                <Range
                  key={i}
                  label={`z${i} · ${t(labels[i])}`}
                  value={v}
                  min={-10}
                  max={10}
                  onChange={(v) =>
                    setLogits(logits.map((a, j) => (j === i ? v : a)))
                  }
                />
              ))}
              <Select
                label={t("target")}
                value={target}
                onChange={(v) => setTarget(+v)}
                options={labels.map((v, i) => ({ value: i, label: t(v) }))}
              />
            </div>
            <div className="probabilities">
              {p.map((v, i) => (
                <div key={i} className={step === i ? "active" : ""}>
                  <span>{t(labels[i])}</span>
                  <div className="bar">
                    <span style={{ width: `${v * 100}%` }} />
                  </div>
                  <code>{number(v)}</code>
                  <small>∂L/∂z = {number(v - (i === target ? 1 : 0))}</small>
                </div>
              ))}
            </div>
          </div>
          <Stat
            label="CE = −ln p(target)"
            value={number(crossEntropy(logits, target))}
          />
        </>
      ) : (
        <>
          <Range
            label={t("prediction")}
            value={pred}
            min={-1}
            max={2}
            onChange={setPred}
          />
          <Range
            label={t("target")}
            value={goal}
            min={-1}
            max={2}
            onChange={setGoal}
          />
          <div className="stats">
            <Stat label="MSE" value={number(mse([pred], [goal]))} />
            <Stat label="MAE" value={number(Math.abs(pred - goal))} />
            <Stat label="∂L/∂ŷ" value={number(2 * (pred - goal))} />
          </div>
        </>
      )}
      <Playback
        step={step}
        setStep={setStep}
        total={4}
        reset={() => {
          setStep(0);
          setLogits([1, 0, -1, 0]);
          setPred(0.8);
          setGoal(0.5);
        }}
      />
    </>
  );
}
export function Backprop() {
  const { t } = useTranslation();
  const [w, setW] = useState(0.5),
    [x, setX] = useState(2),
    [b, setB] = useState(0),
    [target, setTarget] = useState(3),
    [lr, setLr] = useState(0.1),
    [kind, setKind] = useState<Activation>("linear"),
    [step, setStep] = useState(0),
    [history, setHistory] = useState<number[]>([0.5]);
  const activeW = history[Math.min(step, history.length - 1)] ?? w,
    z = activeW * x + b,
    a = activations[kind](z),
    gradient = 2 * (a - target) * derivative(z, kind) * x;
  return (
    <>
      <div className="split">
        <div>
          <Range
            label="x"
            value={x}
            onChange={(v) => {
              setX(v);
              setHistory([w]);
              setStep(0);
            }}
          />
          <Range
            label={t("weights")}
            value={w}
            onChange={(v) => {
              setW(v);
              setHistory([v]);
              setStep(0);
            }}
          />
          <Range
            label={t("bias")}
            value={b}
            onChange={(v) => {
              setB(v);
              setHistory([w]);
              setStep(0);
            }}
          />
          <Range
            label={t("target")}
            value={target}
            onChange={(v) => {
              setTarget(v);
              setHistory([w]);
              setStep(0);
            }}
            min={-5}
            max={5}
          />
          <Range
            label={t("learningRate")}
            value={lr}
            onChange={(v) => {
              setLr(v);
              setHistory([w]);
              setStep(0);
            }}
            min={0.001}
            max={0.5}
            step={0.001}
          />
          <Select
            label={t("activation")}
            value={kind}
            onChange={(v) => {
              setKind(v as Activation);
              setHistory([w]);
              setStep(0);
            }}
            options={options(Object.keys(activations), t)}
          />
        </div>
        <div>
          <div className="stats">
            <Stat
              label={t("forward")}
              value={`z=${number(z)}; a=${number(a)}`}
            />
            <Stat label={t("loss")} value={number((a - target) ** 2)} />
            <Stat label={t("gradient")} value={number(gradient)} />
            <Stat label="w − ηg" value={number(activeW - lr * gradient)} />
          </div>
          <Formula value="\\frac{\\partial L}{\\partial w}=2(a-y)\\phi'(z)x" />
          <button
            className="primary"
            onClick={() => {
              const next = activeW - lr * gradient;
              setHistory([...history.slice(0, step + 1), next]);
              setStep(step + 1);
            }}
          >
            {t("update")}
          </button>
          <p className="note">{t("batchNote")}</p>
        </div>
      </div>
      <Playback
        step={step}
        setStep={setStep}
        total={history.length}
        reset={() => {
          setW(0.5);
          setX(2);
          setB(0);
          setTarget(3);
          setLr(0.1);
          setKind("linear");
          setHistory([0.5]);
          setStep(0);
        }}
      />
    </>
  );
}
export function Transformations() {
  const { t } = useTranslation(),
    state = useTraining();
  const [task, setTask] = useState<Task>(state.config.task),
    [direction, setDirection] = useState(0),
    [kind, setKind] = useState("none"),
    [step, setStep] = useState(0),
    [model, setModel] = useState("trained");
  useEffect(() => {
    if (state.config.task !== task) configure({ ...state.config, task });
  }, [task]);
  const original = sample(task, random(8), direction),
    changed =
      kind === "none"
        ? original.input
        : transform(
            original.input,
            kind as "mirror" | "rotate" | "shift" | "noise",
          );
  const a = state.comparisons.original,
    b = state.comparisons.transformed,
    layerIndex = Math.max(0, step - 1),
    before = step === 0 ? original.input : a?.layers?.[layerIndex],
    after = step === 0 ? changed : b?.layers?.[layerIndex];
  const asTensor = (
    item: Tensor | { shape: number[]; values: number[] } | undefined,
    fallback: Tensor,
  ): Tensor =>
    !item
      ? fallback
      : item.shape.length === 4
        ? { shape: item.shape.slice(1), values: item.values }
        : item.shape.length === 2
          ? { shape: [1, item.values.length, 1], values: item.values }
          : (item as Tensor);
  const changedLabel =
    kind === "rotate"
      ? (direction + 1) % 4
      : kind === "mirror"
        ? (4 - direction) % 4
        : direction;
  let coords = [...original.target];
  if (task === "regression") {
    if (kind === "mirror") coords = [1 - coords[0], coords[1]];
    if (kind === "rotate") coords = [1 - coords[1], coords[0]];
    if (kind === "shift") coords = [coords[0] + 2 / 15, coords[1]];
  }
  const total = a?.layers ? 1 + a.layers.length : 1;
  return (
    <>
      <div className="controls">
        <Select
          label={t("task")}
          value={task}
          onChange={(v) => {
            setTask(v as Task);
            setStep(0);
          }}
          options={options(["classification", "regression"], t)}
        />
        <Select
          label={t("target")}
          value={direction}
          onChange={(v) => {
            setDirection(+v);
            setStep(0);
          }}
          options={labels.map((v, i) => ({ value: i, label: t(v) }))}
        />
        <Select
          label={t("experiment")}
          value={kind}
          onChange={(v) => {
            setKind(v);
            setStep(0);
          }}
          options={options(["none", "mirror", "rotate", "shift", "noise"], t)}
        />
        <Select
          label={t("modelSelect")}
          value={model}
          onChange={setModel}
          options={options(["initial", "trained"], t)}
        />
        <button
          className="primary"
          disabled={["loading", "running", "paused"].includes(state.phase)}
          onClick={() => {
            predict(original.input.values, model === "initial", "original");
            predict(changed.values, model === "initial", "transformed");
            setStep(0);
          }}
        >
          {t("predict")}
        </button>
      </div>
      <div className="split">
        <div>
          <h3>{t("input")}</h3>
          <PixelCanvas tensor={asTensor(before, original.input)} />
          <Matrix
            tensor={asTensor(before, original.input)}
            label={t("input")}
          />
          {a?.output && <code>{a.output.map(number).join(" / ")}</code>}
        </div>
        <div>
          <h3>{t("output")}</h3>
          <PixelCanvas tensor={asTensor(after, changed)} />
          <Matrix tensor={asTensor(after, changed)} label={t("output")} />
          {b?.output && <code>{b.output.map(number).join(" / ")}</code>}
        </div>
      </div>
      <div className="stats">
        <Stat
          label={t("target")}
          value={
            task === "classification"
              ? `${t(labels[direction])} → ${t(labels[changedLabel])}`
              : `(${original.target.map(number).join(",")}) → (${coords.map(number).join(",")})`
          }
        />
        <Stat
          label="Δ tensor L1"
          value={number(
            original.input.values.reduce(
              (s, v, i) => s + Math.abs(v - changed.values[i]),
              0,
            ),
          )}
        />
        <Stat
          label={t("model")}
          value={
            step === 0 ? "[1,16,16,1]" : (a?.layers?.[layerIndex]?.name ?? "—")
          }
        />
      </div>
      <p className="note">
        {t("sampleNote")}{" "}
        {t(task === "classification" ? "classificationNote" : "regressionNote")}
      </p>
      <Playback
        step={step}
        setStep={setStep}
        total={total}
        reset={() => {
          setKind("none");
          setStep(0);
        }}
      />
    </>
  );
}
export function Tasks() {
  const { t } = useTranslation();
  const [task, setTask] = useState<Task>("classification"),
    s = sample(task, random(8), 1),
    [step, setStep] = useState(0);
  return (
    <>
      <Select
        label={t("task")}
        value={task}
        onChange={(v) => setTask(v as Task)}
        options={options(["classification", "regression"], t)}
      />
      <div className="split">
        <PixelCanvas tensor={s.input} />
        <div>
          <div className="stats">
            <Stat
              label={t("target")}
              value={
                task === "classification"
                  ? t("right")
                  : s.target.map(number).join(", ")
              }
            />
            <Stat
              label={t("output")}
              value={
                task === "classification"
                  ? "4 logits → softmax"
                  : "2 linear values"
              }
            />
            <Stat
              label={t("loss")}
              value={task === "classification" ? "Cross-entropy" : "MSE"}
            />
            <Stat
              label={t("metric")}
              value={task === "classification" ? "Accuracy / F1" : "MAE / RMSE"}
            />
          </div>
          <p>
            {t(
              task === "classification"
                ? "classificationNote"
                : "regressionNote",
            )}
          </p>
        </div>
      </div>
      <div className="pipeline">
        <span className={step === 0 ? "active" : ""}>16×16×1</span>→
        <span className={step === 1 ? "active" : ""}>Conv / ReLU / Pool</span>→
        <span className={step === 2 ? "active" : ""}>128 / Dense 16</span>→
        <span className={step === 3 ? "active" : ""}>
          {task === "classification" ? "4 logits" : "x,y"}
        </span>
      </div>
      <Playback
        step={step}
        setStep={setStep}
        total={4}
        reset={() => setStep(0)}
      />
    </>
  );
}
