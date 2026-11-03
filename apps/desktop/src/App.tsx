import { useEffect, useState } from "react";
import type { Locale, ProjectInspection } from "../../../packages/core/src";
import { BuildPanel } from "./components/BuildPanel";
import { Icon } from "./components/Icon";
import { LogPanel } from "./components/LogPanel";
import { ProjectPanel } from "./components/ProjectPanel";
import { messages } from "./i18n";
import { isTauri } from "./project-io";

type Page = "project" | "build" | "logs" | "settings";
function stored(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}
function persist(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* Preferences are optional. */
  }
}
export default function App() {
  const [locale, setLocale] = useState<Locale>(() =>
    stored("bridge.locale") === "vi" ? "vi" : "en",
  );
  const [theme, setTheme] = useState(() => (stored("bridge.theme") === "light" ? "light" : "dark"));
  const [page, setPage] = useState<Page>("project");
  const [project, setProject] = useState<ProjectInspection | null>(null);
  const t = messages[locale];
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    persist("bridge.theme", theme);
  }, [theme]);
  useEffect(() => {
    document.documentElement.lang = locale;
    persist("bridge.locale", locale);
  }, [locale]);
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-logo">
            <Icon name="bridge" size={25} />
          </span>
          <span>
            <strong>
              DOUVI<span className="brand-dot">.</span>
            </strong>
            <small>iOS Bridge</small>
          </span>
        </div>
        <div className="workspace-switch">
          <span className="workspace-avatar">D</span>
          <span>
            <strong>{t.local}</strong>
            <small>Flutter · iOS</small>
          </span>
          <span className="online-dot" />
        </div>
        <p className="nav-label">{t.workspace}</p>
        <nav aria-label={t.workspace}>
          {(["project", "build", "logs"] as const).map((item) => (
            <button
              type="button"
              key={item}
              className={`nav-item ${page === item ? "active" : ""}`}
              aria-current={page === item ? "page" : undefined}
              onClick={() => setPage(item)}
            >
              <Icon
                name={item === "project" ? "folder" : item === "build" ? "build" : "terminal"}
              />
              {t[item]}
              {item === "project" && <span className="nav-count">{project ? "1" : "0"}</span>}
            </button>
          ))}
          <div className="nav-divider" />
          {(["signing", "devices", "testflight"] as const).map((item) => (
            <button
              type="button"
              key={item}
              className="nav-item future-nav"
              disabled
              title={t.futureBody}
            >
              <Icon name={item === "signing" ? "shield" : item === "devices" ? "phone" : "plane"} />
              {t[item]}
              <span className="soon-dot" />
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="local-note">
            <Icon name="shield" size={16} />
            <span>Local first. Open source.</span>
          </div>
          <button
            type="button"
            className={`nav-item ${page === "settings" ? "active" : ""}`}
            onClick={() => setPage("settings")}
          >
            <Icon name="settings" />
            {t.settings}
          </button>
          <div className="version-label">
            <span>v0.1.0-dev.1</span>
            <span>DOUVI LABS</span>
          </div>
        </div>
      </aside>
      <div className="main-column">
        <header className="topbar">
          <div className="breadcrumb">
            iOS Bridge <span>/</span>
            <strong>{t[page]}</strong>
          </div>
          <div className="topbar-actions">
            <span className="stage-badge">
              <span />
              {t.stage}
            </span>
            <button
              type="button"
              className="locale-button"
              aria-label={t.language}
              onClick={() => setLocale(locale === "en" ? "vi" : "en")}
            >
              {locale.toUpperCase()}
            </button>
            <button
              type="button"
              className="icon-button"
              aria-label={theme === "dark" ? t.light : t.dark}
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            >
              <Icon name={theme === "dark" ? "sun" : "moon"} size={18} />
            </button>
          </div>
        </header>
        <main>
          {page === "project" && (
            <ProjectPanel
              copy={t}
              locale={locale}
              project={project}
              onProject={setProject}
              onBuild={() => setPage("build")}
            />
          )}
          {page === "build" && (
            <BuildPanel key={project?.name ?? "none"} copy={t} project={project} />
          )}
          {page === "logs" && <LogPanel copy={t} locale={locale} />}
          {page === "settings" && (
            <>
              <div className="page-heading">
                <div>
                  <p className="eyebrow">iOS BRIDGE</p>
                  <h1>{t.settingsTitle}</h1>
                </div>
              </div>
              <section className="panel settings-panel">
                <label>
                  {t.language}
                  <select value={locale} onChange={(e) => setLocale(e.target.value as Locale)}>
                    <option value="en">English</option>
                    <option value="vi">Tiếng Việt</option>
                  </select>
                </label>
                <label>
                  {t.appearance}
                  <select value={theme} onChange={(e) => setTheme(e.target.value)}>
                    <option value="dark">{t.dark}</option>
                    <option value="light">{t.light}</option>
                  </select>
                </label>
              </section>
              <section className="panel">
                <h2>{t.future}</h2>
                <p>{t.futureBody}</p>
              </section>
            </>
          )}
        </main>
        <footer className="statusbar">
          <span>
            <span className="online-dot" />
            {isTauri() ? "WINDOWS DESKTOP · DEVELOPMENT" : t.preview}
          </span>
          <span>
            {t.costs}
            <span className="footer-divider">|</span>
            {t.noArtifact}
          </span>
        </footer>
      </div>
    </div>
  );
}
