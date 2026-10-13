import { useParams, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { motion, MotionConfig } from "motion/react";
import type { Locale } from "../i18n";
import { labCatalog, labInfo } from "./catalog";
import {
  Pixels,
  Neuron,
  Composition,
  Convolution,
  Pooling,
  Flatten,
  Loss,
  Backprop,
  Transformations,
  Tasks,
} from "./Mechanical";
import { Training, Inference } from "./Training";
const panels = {
  pixels: Pixels,
  neuron: Neuron,
  composition: Composition,
  convolution: Convolution,
  pooling: Pooling,
  flatten: Flatten,
  loss: Loss,
  backprop: Backprop,
  training: Training,
  transformations: Transformations,
  tasks: Tasks,
  inference: Inference,
};
export default function LabPage() {
  const { locale = "en", id } = useParams(),
    { t } = useTranslation();
  if (!id)
    return (
      <>
        <div className="pageHeading">
          <span className="eyebrow">12 / {t("labs")}</span>
          <h1>{t("labTitle")}</h1>
          <p>{t("labText")}</p>
        </div>
        <div className="labCards">
          {labCatalog.map((l) => {
            const info = labInfo(l[0], locale as Locale);
            return (
              <Link
                className="labCard"
                to={`/${locale}/labs/${info.id}`}
                key={info.id}
              >
                <span className="eyebrow">
                  LAB {info.number} <span>↗</span>
                </span>
                <h2>{info.title}</h2>
                <p>{info.description}</p>
                <div className="pixelIcon">
                  {
                    [
                      "▦",
                      "◉",
                      "⌁",
                      "▧",
                      "▤",
                      "▥",
                      "∿",
                      "↶",
                      "↗",
                      "↻",
                      "⇄",
                      "→",
                    ][+info.number - 1]
                  }
                </div>
              </Link>
            );
          })}
        </div>
      </>
    );
  const info = labInfo(id, locale as Locale),
    Component = panels[id as keyof typeof panels];
  if (!Component) return <p>{t("noResults")}</p>;
  return (
    <>
      <Link className="back" to={`/${locale}/labs`}>
        ← {t("labs")}
      </Link>
      <div className="pageHeading">
        <span className="eyebrow">
          LAB {info.number} / {t("experiment")}
        </span>
        <h1>{info.title}</h1>
        <p>{info.description}</p>
      </div>
      <MotionConfig reducedMotion="user">
        <motion.div
          className="labBench"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <Component />
        </motion.div>
      </MotionConfig>
    </>
  );
}
