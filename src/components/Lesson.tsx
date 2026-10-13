import {
  createContext,
  useContext,
  useMemo,
  useState,
  useEffect,
  lazy,
  Suspense,
  type ReactNode,
  type ComponentType,
} from "react";
import { Link, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import metadata from "../content/metadata.json";
import { Formula, Check } from "./Shared";
import { save, stored, type Locale } from "../i18n";
const modules = import.meta.glob("../content/*/*.mdx");
const View = createContext("explanation");
function Section({ kind, children }: { kind: string; children: ReactNode }) {
  const view = useContext(View);
  return kind === view ? <section>{children}</section> : null;
}
function LabLink({ id }: { id: string }) {
  const { locale } = useParams(),
    { t } = useTranslation();
  return (
    <Link className="lessonLab" to={`/${locale}/labs/${id}`}>
      <span>↗</span>
      <div>
        <strong>{t("openLab")}</strong>
        <small>
          {t("experiment")} / {id}
        </small>
      </div>
      <span>→</span>
    </Link>
  );
}
export default function Lesson() {
  const { locale = "en", id = "pixels" } = useParams(),
    { t } = useTranslation(),
    [view, setView] = useState("explanation"),
    [bookmark, setBookmark] = useState(
      () => stored(`bookmark:${id}`) === "true",
    );
  useEffect(() => setBookmark(stored(`bookmark:${id}`) === "true"), [id]);
  const lesson = metadata.lessons.find((l) => l.id === id),
    Content = useMemo(() => {
      const load = modules[`../content/${locale}/${id}.mdx`];
      return load
        ? lazy(
            load as () => Promise<{
              default: ComponentType<{ components: Record<string, unknown> }>;
            }>,
          )
        : undefined;
    }, [locale, id]);
  if (!lesson || !Content) return <p>{t("noResults")}</p>;
  const index = lesson.order,
    next = metadata.lessons[index + 1],
    previous = metadata.lessons[index - 1];
  return (
    <div className="lessonLayout">
      <article className="lessonBody">
        <div className="pageHeading">
          <span className="eyebrow">
            {t("chapter")} {String(lesson.chapter).padStart(2, "0")} /{" "}
            {t("lesson")} {index + 1}
          </span>
          <h1>{lesson.title[locale as Locale]}</h1>
          <p>{lesson.summary[locale as Locale]}</p>
        </div>
        <div className="lessonTools">
          <div className="tabs" role="tablist" aria-label={t("lesson")}>
            {["explanation", "math", "code"].map((v) => (
              <button
                key={v}
                role="tab"
                aria-selected={view === v}
                onClick={() => setView(v)}
              >
                {t(v)}
              </button>
            ))}
          </div>
          <button
            className="bookmark"
            aria-pressed={bookmark}
            onClick={() => {
              save(`bookmark:${id}`, String(!bookmark));
              setBookmark(!bookmark);
            }}
          >
            {t(bookmark ? "bookmarked" : "bookmark")}
          </button>
        </div>
        <div role="tabpanel">
          <View.Provider value={view}>
            <Suspense fallback={<p>{t("loading")}</p>}>
              <Content components={{ Section, Formula, Check, LabLink }} />
            </Suspense>
          </View.Provider>
        </div>
        <nav className="lessonPager" aria-label={t("course")}>
          {previous ? (
            <Link to={`/${locale}/course/${previous.id}`}>
              ← {previous.title[locale as Locale]}
            </Link>
          ) : (
            <span />
          )}
          {next && (
            <Link to={`/${locale}/course/${next.id}`}>
              {next.title[locale as Locale]} →
            </Link>
          )}
        </nav>
      </article>
      <aside className="lessonAside">
        <span className="eyebrow">{t("related")}</span>
        {metadata.lessons
          .filter((l) => l.chapter === lesson.chapter)
          .map((l) => (
            <Link
              key={l.id}
              className={l.id === id ? "active" : ""}
              to={`/${locale}/course/${l.id}`}
            >
              {l.title[locale as Locale]}
            </Link>
          ))}
        <div className="asideNote">{t("symbolsNote")}</div>
        <Link className="smallLink" to={`/${locale}/reference`}>
          {t("reference")} ↗
        </Link>
      </aside>
    </div>
  );
}
