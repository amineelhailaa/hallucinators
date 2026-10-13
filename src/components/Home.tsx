import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";

import metadata from "../content/metadata.json";
import { sample } from "../engine/dataset";
import { random, conv2d, pool, transform, type Tensor } from "../engine/math";
import { labInfo } from "../labs/catalog";
import type { Locale } from "../i18n";
function MiniGrid({ tensor }: { tensor: Tensor }) {
  const [h, w, c = 1] = tensor.shape,
    max = Math.max(1, ...tensor.values.map(Math.abs));
  return (
    <div
      className="miniGrid"
      style={{ gridTemplateColumns: `repeat(${w},1fr)` }}
      aria-hidden="true"
    >
      {Array.from({ length: h * w }, (_, i) => (
        <i
          key={i}
          style={{
            background: `rgba(169,237,185,${0.08 + (Math.abs(tensor.values[i * c]) / max) * 0.85})`,
          }}
        />
      ))}
    </div>
  );
}
function Machine() {
  const { t } = useTranslation(),
    [stage, setStage] = useState(0),
    [rotated, setRotated] = useState(false),
    input = sample("classification", random(7), 0).input,
    image = rotated ? transform(input, "rotate") : input,
    convolved = conv2d(
      image,
      { shape: [3, 3, 1, 1], values: [-1, 0, 1, -1, 0, 1, -1, 0, 1] },
      [0],
      1,
      "same",
    ),
    activated = {
      ...convolved,
      values: convolved.values.map((v) => Math.max(0, v)),
    },
    pooled = pool(activated, 2),
    tensor = [image, convolved, activated, pooled][stage];
  return (
    <div className="machine">
      <div className="machineHeader">
        <span className="statusDot" />
        <span>{t("inspector")}</span>
        <code>SYS.01</code>
      </div>
      <div className="machineDisplay">
        <div className="displayLabel">
          <span>
            {
              [
                "INPUT / PIXELS",
                "CONV / KERNEL",
                "ReLU / ACTIVATION",
                "POOL / FEATURES",
              ][stage]
            }
          </span>
          <code>{tensor.shape.join(" × ")}</code>
        </div>
        <MiniGrid tensor={tensor} />
        <div className="machineCoordinates">
          [ B = 1 ] <span>0.00 ░░▒▓█ 1.00</span>
        </div>
      </div>
      <div className="machineStages" dir="ltr">
        {["01 / IN", "02 / CONV", "03 / ReLU", "04 / POOL"].map((v, i) => (
          <button
            className={stage === i ? "active" : ""}
            key={v}
            onClick={() => setStage(i)}
            aria-label={`${t("step")} ${i + 1}`}
          >
            {v}
          </button>
        ))}
      </div>
      <div className="machineFoot">
        <span>{t("finite")}</span>
        <button onClick={() => setRotated(!rotated)} aria-label={t("rotate")}>
          ↻
        </button>
      </div>
    </div>
  );
}
export default function Home() {
  const { locale = "en" } = useParams(),
    { t } = useTranslation();
  return (
    <>
      <section className="hero">
        <div>
          <span className="eyebrow">
            <span className="statusDot" />
            {t("brand")}
          </span>
          <h1>
            {t("heroLine1")}
            <br />
            <span>{t("heroLine2")}</span>
          </h1>
          <p>{t("heroText")}</p>
          <div className="actions">
            <Link className="button primary" to={`/${locale}/course/pixels`}>
              {t("start")} <span>→</span>
            </Link>
            <Link className="button" to={`/${locale}/labs`}>
              {t("labs")} ↗
            </Link>
          </div>
          <div className="heroStats">
            <div>
              <strong>12</strong>
              <span>{t("chapters")}</span>
            </div>
            <div>
              <strong>36</strong>
              <span>{t("lessons")}</span>
            </div>
            <div>
              <strong>03</strong>
              <span>{t("languages")}</span>
            </div>
          </div>
        </div>
        <Machine />
      </section>
      <div className="sectionHeading">
        <div>
          <span className="eyebrow">01 / {t("learn")}</span>
          <h2>{t("path")}</h2>
          <p>{t("pathText")}</p>
        </div>
        <Link to={`/${locale}/course`}>{t("course")} →</Link>
      </div>
      <div className="chapterTiles">
        {metadata.chapters.map((chapter, i) => (
          <Link key={i} to={`/${locale}/course/${metadata.lessons[i * 3].id}`}>
            <span>{String(i + 1).padStart(2, "0")}</span>
            <div>
              <h3>{chapter[locale as Locale]}</h3>
              <small>03 {t("lessons")}</small>
            </div>
            <b>↗</b>
          </Link>
        ))}
      </div>
      <div className="sectionHeading">
        <div>
          <span className="eyebrow">02 / {t("experiment")}</span>
          <h2>{t("labTitle")}</h2>
          <p>{t("labText")}</p>
        </div>
        <Link to={`/${locale}/labs`}>{t("allLabs")} →</Link>
      </div>
      <div className="featuredLabs">
        {["convolution", "flatten", "training"].map((id) => {
          const info = labInfo(id, locale as Locale);
          return (
            <Link key={id} to={`/${locale}/labs/${id}`}>
              <span className="eyebrow">LAB {info.number} / ↗</span>
              <div className="labDrawing">
                {id === "convolution" ? (
                  <div className="convArt">
                    <span>▦</span>
                    <b>×</b>
                    <span>▧</span>
                    <b>→</b>
                    <span>▤</span>
                  </div>
                ) : id === "flatten" ? (
                  <div className="flattenArt">
                    <span>▦</span>
                    <b>→</b>
                    <span>▥▥▥</span>
                  </div>
                ) : (
                  <svg viewBox="0 0 200 70" aria-hidden="true">
                    <path
                      d="M5 10Q50 10 70 35T190 60"
                      stroke="#a9edb9"
                      fill="none"
                      strokeWidth={3}
                    />
                    <path
                      d="M5 15Q40 30 70 40T190 50"
                      stroke="#f1c36b"
                      fill="none"
                      strokeWidth={2}
                      strokeDasharray="4 4"
                    />
                  </svg>
                )}
              </div>
              <h3>{info.title}</h3>
              <p>{info.description}</p>
            </Link>
          );
        })}
      </div>
    </>
  );
}
