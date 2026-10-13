import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import MiniSearch from "minisearch";
import metadata from "../content/metadata.json";
import type { Locale } from "../i18n";
import { architecture } from "../engine/math";
import { Formula } from "./Shared";
const records = () => import("../content/records.json").then((m) => m.default);
export function Course() {
  const { locale = "en" } = useParams(),
    { t } = useTranslation();
  return (
    <>
      <div className="pageHeading">
        <span className="eyebrow">12 / 36 / CNN</span>
        <h1>{t("course")}</h1>
        <p>{t("courseText")}</p>
      </div>
      {metadata.chapters.map((ch, i) => (
        <section className="courseChapter" key={i}>
          <div>
            <span className="chapterNumber">
              {String(i + 1).padStart(2, "0")}
            </span>
            <h2>{ch[locale as Locale]}</h2>
          </div>
          <div>
            {metadata.lessons
              .filter((l) => l.chapter === i + 1)
              .map((l, j) => (
                <Link key={l.id} to={`/${locale}/course/${l.id}`}>
                  <span>0{j + 1}</span>
                  <div>
                    <h3>{l.title[locale as Locale]}</h3>
                    <p>{l.summary[locale as Locale]}</p>
                  </div>
                  <b>→</b>
                </Link>
              ))}
          </div>
        </section>
      ))}
    </>
  );
}
export function Glossary() {
  const { locale = "en" } = useParams(),
    { t } = useTranslation(),
    [query, setQuery] = useState(""),
    [items, setItems] = useState<
      {
        id: string;
        lesson: string;
        title: string;
        english: string;
        body: string;
      }[]
    >([]);
  useEffect(() => {
    let active = true;
    const load = {
      en: () => import("../content/search-en.json"),
      fr: () => import("../content/search-fr.json"),
      ar: () => import("../content/search-ar.json"),
    }[locale as Locale];
    load().then((m) => {
      if (active) setItems(m.default);
    });
    return () => {
      active = false;
    };
  }, [locale]);
  const search = new MiniSearch({
    fields: ["title", "english", "body"],
    storeFields: ["id"],
  });
  search.addAll(items);
  const results = query
    ? new Set(
        search.search(query, { prefix: true, fuzzy: 0.2 }).map((r) => r.id),
      )
    : null;
  return (
    <>
      <div className="pageHeading">
        <span className="eyebrow">A → Z / {items.length}</span>
        <h1>{t("glossary")}</h1>
        <p>{t("glossaryText")}</p>
      </div>
      <input
        className="searchField"
        value={query}
        aria-label={t("search")}
        placeholder={t("search")}
        onChange={(e) => setQuery(e.target.value)}
      />
      <div className="glossaryList">
        {items
          .filter((r) => !results || results.has(r.id))
          .map((r) => (
            <article key={r.id}>
              <div>
                <h2>{r.title}</h2>
                {locale !== "en" && <small dir="ltr">{r.english}</small>}
              </div>
              <p>{r.body}</p>
              <Link to={`/${locale}/course/${r.lesson}`}>{t("read")} ↗</Link>
            </article>
          ))}
      </div>
      {results?.size === 0 && <p>{t("noResults")}</p>}
    </>
  );
}
export function Reference() {
  const { t } = useTranslation(),
    [items, setItems] = useState<Awaited<ReturnType<typeof records>>>([]),
    { locale = "en" } = useParams(),
    index = ["en", "fr", "ar"].indexOf(locale);
  useEffect(() => {
    records().then(setItems);
  }, []);
  return (
    <>
      <div className="pageHeading">
        <span className="eyebrow">[ B, H, W, C ]</span>
        <h1>{t("reference")}</h1>
        <p>{t("referenceText")}</p>
      </div>
      <section className="panel">
        <h2>CNN / 2,468</h2>
        <div className="tableScroll">
          <table>
            <thead>
              <tr>
                <th>{t("model")}</th>
                <th>[B, …]</th>
                <th>{t("params")}</th>
              </tr>
            </thead>
            <tbody>
              {architecture.map(([name, shape, p]) => (
                <tr key={name}>
                  <td>{name}</td>
                  <td dir="ltr">B × {shape}</td>
                  <td>{p}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      {items.map((r) => (
        <details key={r.id} className="referenceRow">
          <summary>
            {r.title[index]} <span>+</span>
          </summary>
          <Formula value={r.formula} />
          <p>{r.symbols[index]}</p>
          <pre dir="ltr">
            <code>{r.code}</code>
          </pre>
          <Link to={`/${locale}/course/${r.id}`}>{t("read")} ↗</Link>
        </details>
      ))}
    </>
  );
}
export function About() {
  const { t } = useTranslation();
  return (
    <>
      <div className="pageHeading">
        <span className="eyebrow">HALLUCINATORS / v1.0</span>
        <h1>{t("about")}</h1>
        <p>{t("aboutText")}</p>
      </div>
      <div className="prose">
        <p>{t("aboutBody")}</p>
        <p>{t("storageNote")}</p>
        <h2>{t("sources")}</h2>
        <ul>
          <li>
            <a href="https://keras.io/api/">Keras API</a> —{" "}
            <a href="https://keras.io/api/layers/reshaping_layers/flatten/">
              Flatten
            </a>
            ,{" "}
            <a href="https://keras.io/api/layers/convolution_layers/convolution2d/">
              Conv2D
            </a>
          </li>
          <li>
            <a href="https://en.d2l.ai/">Dive into Deep Learning</a>
          </li>
          <li>
            <a href="https://www.tensorflow.org/js/tutorials/training/web_worker">
              TensorFlow.js / Web Workers
            </a>
          </li>
          <li>
            <a href="https://arxiv.org/abs/2110.05861">
              Convolutional Neural Networks Are Not Invariant to Translation,
              but They Can Learn to Be
            </a>
          </li>
        </ul>
        <h2>{t("aboutText")}</h2>
        <p>
          {t("sampleNote")} {t("browserNote")}
        </p>
        <p>MIT · Hallucinators</p>
        <p>
          IBM Plex Sans / Mono · Noto Sans Arabic · Press Start 2P — SIL Open
          Font License.
        </p>
      </div>
    </>
  );
}
