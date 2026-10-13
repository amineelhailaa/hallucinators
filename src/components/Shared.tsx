import { useEffect, useRef, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { useReducedMotion } from "motion/react";
import type { Tensor } from "../engine/math";
export const number = (n: number) =>
  Number.isFinite(n) ? Number(n.toFixed(4)).toString() : "—";
export function Panel({
  title,
  children,
  tag,
}: {
  title: string;
  children: ReactNode;
  tag?: string;
}) {
  return (
    <section className="panel">
      <header className="panelHeader">
        <h2>{title}</h2>
        {tag && <span className="tag">{tag}</span>}
      </header>
      {children}
    </section>
  );
}
export function Range({
  label,
  value,
  onChange,
  min = -3,
  max = 3,
  step = 0.1,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
}) {
  return (
    <label className="range">
      <span>
        {label}
        <output dir="ltr">{number(value)}</output>
      </span>
      <input
        type="range"
        aria-label={label}
        value={value}
        min={min}
        max={max}
        step={step}
        onChange={(e) => onChange(+e.target.value)}
      />
    </label>
  );
}
export function Select({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string | number;
  onChange: (v: string) => void;
  options: { value: string | number; label: string }[];
}) {
  return (
    <label className="select">
      <span>{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}
export function Matrix({
  tensor,
  selected = -1,
  onSelect,
  channel = 0,
  highlight = [],
  label,
}: {
  tensor: Tensor;
  selected?: number;
  onSelect?: (i: number) => void;
  channel?: number;
  highlight?: number[];
  label: string;
}) {
  const [h, w, c = 1] =
    tensor.shape.length === 1 ? [1, tensor.shape[0], 1] : tensor.shape;
  const { t } = useTranslation();
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const [focus, setFocus] = useState(0);
  const vals = Array.from(
    { length: h * w },
    (_, i) => tensor.values[i * c + channel],
  );
  const max = Math.max(1, ...vals.map(Math.abs));
  const inspected = Math.max(0, Math.min(selected >= 0 ? selected : focus, vals.length - 1));
  return (
    <div className="matrixWrap" dir="ltr">
      <div
        className="matrix"
        style={{ gridTemplateColumns: `repeat(${w}, minmax(24px,1fr))` }}
        role="group"
        aria-label={label}
      >
        {vals.map((v, i) => (
          <button
            key={i}
            ref={(el) => {
              refs.current[i] = el;
            }}
            tabIndex={focus === i ? 0 : -1}
            aria-label={`${label} [${Math.floor(i / w)}, ${i % w}, ${channel}] = ${number(v)}`}
            title={`${label} [${Math.floor(i / w)}, ${i % w}, ${channel}] = ${number(v)}`}
            aria-pressed={selected === i}
            className={`${selected === i ? "selected" : ""} ${highlight.includes(i) ? "highlight" : ""}`}
            style={{
              background: `rgba(${v < 0 ? "226,121,120" : "133,222,177"},${0.04 + (Math.abs(v) / max) * 0.22})`,
            }}
            onFocus={() => setFocus(i)}
            onClick={() => onSelect?.(i)}
            onKeyDown={(e) => {
              const delta = {
                ArrowLeft: -1,
                ArrowRight: 1,
                ArrowUp: -w,
                ArrowDown: w,
              }[e.key];
              if (delta !== undefined) {
                e.preventDefault();
                const next = Math.max(0, Math.min(vals.length - 1, i + delta));
                setFocus(next);
                refs.current[next]?.focus();
                onSelect?.(next);
              }
            }}
          >
            {w > 10 ? "" : number(v)}
          </button>
        ))}
      </div>
      <output className="matrixReadout" aria-live="polite">{t("selected")} [{Math.floor(inspected / w)}, {inspected % w}, {channel}] = {number(vals[inspected])}</output>
      <small>{t("keyboard")}</small>
    </div>
  );
}
export function PixelCanvas({ tensor }: { tensor: Tensor }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const [h, w, c = 1] = tensor.shape,
      ctx = ref.current?.getContext("2d");
    if (!ctx) return;
    const image = ctx.createImageData(w, h);
    for (let i = 0; i < h * w; i++) {
      for (let j = 0; j < 3; j++)
        image.data[i * 4 + j] = Math.round(
          Math.max(0, Math.min(1, tensor.values[i * c + (c === 3 ? j : 0)])) *
            255,
        );
      image.data[i * 4 + 3] = 255;
    }
    ctx.putImageData(image, 0, 0);
  }, [tensor]);
  return (
    <canvas
      ref={ref}
      width={tensor.shape[1]}
      height={tensor.shape[0]}
      className="pixelCanvas"
      aria-hidden="true"
    />
  );
}
export function Playback({
  step,
  setStep,
  total,
  reset,
}: {
  step: number;
  setStep: (n: number) => void;
  total: number;
  reset: () => void;
}) {
  const { t } = useTranslation(),
    reduce = useReducedMotion();
  const [playing, setPlaying] = useState(false),
    [speed, setSpeed] = useState(1);
  useEffect(() => {
    if (!playing) return;
    const id = setInterval(
      () => {
        if (step >= total - 1) {
          setPlaying(false);
          return;
        }
        setStep(step + 1);
      },
      (reduce ? 1200 : 700) / speed,
    );
    return () => clearInterval(id);
  }, [playing, speed, step, total, setStep, reduce]);
  return (
    <div className="playback">
      <button
        onClick={() => setStep(Math.max(0, step - 1))}
        disabled={step === 0}
      >
        {t("previous")}
      </button>
      <button
        onClick={() => {
          if (step === total - 1) setStep(0);
          setPlaying(!playing);
        }}
      >
        {t(playing ? "pause" : "play")}
      </button>
      <button
        onClick={() => setStep(Math.min(total - 1, step + 1))}
        disabled={step >= total - 1}
      >
        {t("next")}
      </button>
      <button
        onClick={() => {
          setPlaying(false);
          reset();
        }}
      >
        {t("reset")}
      </button>
      <Select
        label={t("speed")}
        value={speed}
        onChange={(v) => setSpeed(+v)}
        options={[0.5, 1, 2].map((v) => ({ value: v, label: `${v}×` }))}
      />
      <span dir="ltr">
        {step + 1} / {total}
      </span>
    </div>
  );
}
export function Stat({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="stat">
      <small>{label}</small>
      <strong dir="ltr">{value}</strong>
    </div>
  );
}
export function Formula({ value }: { value: string }) {
  const [html, setHtml] = useState("");
  useEffect(() => {
    let active = true;
    import("katex/dist/katex.min.css");
    import("katex").then((katex) => {
      if (active)
        setHtml(
          katex.default.renderToString(value, {
            throwOnError: false,
            displayMode: true,
            output: "htmlAndMathml",
          }),
        );
    });
    return () => {
      active = false;
    };
  }, [value]);
  return (
    <div className="formula" dir="ltr">
      {html ? (
        <div dangerouslySetInnerHTML={{ __html: html }} />
      ) : (
        <code>{value}</code>
      )}
    </div>
  );
}
export function Check({
  question,
  answer,
}: {
  question: string;
  answer: string;
}) {
  const { t } = useTranslation();
  return (
    <details className="check">
      <summary>
        {question} <span>+ {t("answer")}</span>
      </summary>
      <p>{answer}</p>
    </details>
  );
}
