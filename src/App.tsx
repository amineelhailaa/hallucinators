import {
  Component,
  lazy,
  Suspense,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import {
  HashRouter,
  Routes,
  Route,
  NavLink,
  Link,
  Navigate,
  useParams,
  useLocation,
  useNavigate,
} from "react-router-dom";
import { useTranslation } from "react-i18next";

import i18n, { locales, stored, save, type Locale } from "./i18n";
import metadata from "./content/metadata.json";
import styles from "./App.module.css";
const Home = lazy(() => import("./components/Home"));
const Lesson = lazy(() => import("./components/Lesson"));
const LabPage = lazy(() => import("./labs/LabPage"));
const Course = lazy(() =>
  import("./components/Pages").then((m) => ({ default: m.Course })),
);
const Glossary = lazy(() =>
  import("./components/Pages").then((m) => ({ default: m.Glossary })),
);
const Reference = lazy(() =>
  import("./components/Pages").then((m) => ({ default: m.Reference })),
);
const About = lazy(() =>
  import("./components/Pages").then((m) => ({ default: m.About })),
);
class Boundary extends Component<{ children: ReactNode }, { error: boolean }> {
  state = { error: false };
  static getDerivedStateFromError() {
    return { error: true };
  }
  render() {
    return this.state.error ? (
      <div role="alert">
        <p>{i18n.t("errorText")}</p>
        <button onClick={() => window.location.reload()}>
          {i18n.t("retry")}
        </button>
      </div>
    ) : (
      this.props.children
    );
  }
}
function Shell() {
  const { locale = "en" } = useParams(),
    { t } = useTranslation(),
    location = useLocation(),
    navigate = useNavigate(),
    [open, setOpen] = useState(false);
  const lang = locales.includes(locale as Locale) ? (locale as Locale) : "en";
  useEffect(() => {
    i18n.changeLanguage(lang);
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
    save("language", lang);
  }, [lang]);
  useEffect(() => setOpen(false), [location.pathname]);
  if (!locales.includes(locale as Locale))
    return (
      <Navigate
        to={`/en/${location.pathname.split("/").slice(2).join("/")}`}
        replace
      />
    );
  const section = location.pathname.split("/")[2],
    lessonId = location.pathname.split("/")[3],
    activeChapter = metadata.lessons.find((l) => l.id === lessonId)?.chapter;
  return (
    <div className={styles.app}>
      <a
        className="skipLink"
        href="#main"
        onClick={(e) => {
          e.preventDefault();
          document.getElementById("main")?.focus();
        }}
      >
        {t("course")}
      </a>
      <header className={styles.header}>
        <Link
          className={styles.brand}
          to={`/${lang}`}
          aria-label="Hallucinators"
        >
          <span className={styles.logo}>
            H<span>▴</span>
          </span>
          <div>
            <strong>HALLUCINATORS</strong>
            <small>{t("brand")}</small>
          </div>
        </Link>
        <div className={styles.headerRight}>
          <span className={styles.browserPill}>
            <span className="statusDot" />
            {t("noBackend")}
          </span>
          <label className={styles.language}>
            <span className="srOnly">{t("language")}</span>
            <select
              aria-label={t("language")}
              value={lang}
              onChange={(e) =>
                navigate(
                  location.pathname.replace(
                    /^\/(en|fr|ar)/,
                    `/${e.target.value}`,
                  ),
                )
              }
            >
              <option value="en">EN · English</option>
              <option value="fr">FR · Français</option>
              <option value="ar">AR · العربية</option>
            </select>
          </label>
          <button
            className={styles.menu}
            aria-expanded={open}
            onClick={() => setOpen(!open)}
          >
            {t(open ? "close" : "menu")}
          </button>
        </div>
      </header>
      <aside className={`${styles.sidebar} ${open ? styles.open : ""}`}>
        <span className="eyebrow">EXPLORE / CNN</span>
        <nav aria-label={t("menu")}>
          {[
            ["", "home", "⌂"],
            ["course", "course", "▤"],
            ["labs", "labs", "▦"],
            ["glossary", "glossary", "Aa"],
            ["reference", "reference", "ƒ"],
            ["about", "about", "◌"],
          ].map(([path, key, icon]) => (
            <NavLink
              end={!path}
              to={`/${lang}${path ? "/" + path : ""}`}
              key={key}
            >
              <span aria-hidden="true">{icon}</span>
              {t(key)}
            </NavLink>
          ))}
        </nav>
        {section === "course" && (
          <div className={styles.chapterNav}>
            <span className="eyebrow">{t("chapters")}</span>
            {metadata.chapters.map((c, i) => (
              <div key={i}>
                <Link
                  className={
                    activeChapter === i + 1 ? styles.chapterActive : ""
                  }
                  to={`/${lang}/course/${metadata.lessons[i * 3].id}`}
                >
                  <code>{String(i + 1).padStart(2, "0")}</code>
                  {c[lang]}
                </Link>
                {activeChapter === i + 1 &&
                  metadata.lessons
                    .filter((l) => l.chapter === i + 1)
                    .map((l) => (
                      <NavLink key={l.id} to={`/${lang}/course/${l.id}`}>
                        {l.title[lang]}
                      </NavLink>
                    ))}
              </div>
            ))}
          </div>
        )}
        <div className={styles.sidebarFoot}>
          <div className={styles.pixelBrain} aria-hidden="true">
            ▟▙
            <br />
            ▜▛
          </div>
          <span>v1.0 / OPEN LAB</span>
          <small>{t("footer")}</small>
        </div>
      </aside>
      {open && (
        <button
          className={styles.overlay}
          aria-label={t("close")}
          onClick={() => setOpen(false)}
        />
      )}
      <main id="main" tabIndex={-1} className={styles.main}>
        <Boundary>
          <Suspense
            fallback={
              <div className="loadingSkeleton" role="status">
                <span>{t("loading")}</span>
              </div>
            }
          >
            <Routes>
              <Route index element={<Home />} />
              <Route path="course" element={<Course />} />
              <Route path="course/:id" element={<Lesson />} />
              <Route path="labs" element={<LabPage />} />
              <Route path="labs/:id" element={<LabPage />} />
              <Route path="glossary" element={<Glossary />} />
              <Route path="reference" element={<Reference />} />
              <Route path="about" element={<About />} />
              <Route path="*" element={<Navigate to={`/${lang}`} replace />} />
            </Routes>
          </Suspense>
        </Boundary>
        <footer className={styles.footer}>
          <span>HALLUCINATORS / {t("footer")}</span>
          <span>16 × 16 × 1 → 4</span>
        </footer>
      </main>
    </div>
  );
}
export default function App() {
  const initial = stored("language") || "en";
  return (
    <HashRouter>
      <Routes>
        <Route path="/:locale/*" element={<Shell />} />
        <Route
          path="*"
          element={
            <Navigate
              to={`/${locales.includes(initial as Locale) ? initial : "en"}`}
              replace
            />
          }
        />
      </Routes>
    </HashRouter>
  );
}
