import { useRef, useState } from "react";
import {
  inspectProject,
  type Locale,
  type ProjectFile,
  type ProjectInspection,
} from "../../../../packages/core/src";
import type { Copy } from "../i18n";
import { chooseNativeProject, isTauri, readDroppedFolder, readFolderFiles } from "../project-io";
import { CheckLabel, Findings } from "./Findings";
import { Icon } from "./Icon";

export function ProjectPanel({
  copy: t,
  locale,
  project,
  onProject,
  onBuild,
}: {
  copy: Copy;
  locale: Locale;
  project: ProjectInspection | null;
  onProject: (p: ProjectInspection | null) => void;
  onBuild: () => void;
}) {
  const picker = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [drag, setDrag] = useState(false);
  const inspect = async (loader: () => Promise<ProjectFile[] | null>) => {
    setBusy(true);
    setError("");
    try {
      const files = await loader();
      if (files) onProject(inspectProject(files));
    } catch (e) {
      setError(e instanceof Error ? e.message : t.error);
    } finally {
      setBusy(false);
    }
  };
  const open = () => (isTauri() ? void inspect(chooseNativeProject) : picker.current?.click());
  const blocked = !project || project.findings.some((f) => f.severity === "error");
  return (
    <>
      <input
        className="visually-hidden"
        type="file"
        multiple
        aria-label={t.import}
        ref={(node) => {
          picker.current = node;
          node?.setAttribute("webkitdirectory", "");
        }}
        onChange={(event) => {
          const files = event.target.files;
          if (files) void inspect(() => readFolderFiles(files));
          event.target.value = "";
        }}
      />
      {!project ? (
        <>
          <section className="hero">
            <div className="hero-copy">
              <p className="eyebrow">{t.heroSmall}</p>
              <h1>{t.heroTitle}</h1>
              <p className="hero-description">{t.heroBody}</p>
              <button type="button" className="primary" onClick={open} disabled={busy}>
                <Icon name="plus" size={18} />
                {busy ? t.inspecting : t.import}
                <Icon name="arrow" size={18} />
              </button>
              <p className="privacy">
                <Icon name="shield" size={14} />
                {t.importPrivacy}
              </p>
            </div>
            <div className="bridge-art" aria-hidden="true">
              <div className="orbit orbit-one" />
              <div className="orbit orbit-two" />
              <div className="code-tile">
                <span className="tile-dots">•••</span>
                <span className="code-line long" />
                <span className="code-line short" />
                <span className="code-line medium" />
                <span className="tile-label">FLUTTER</span>
              </div>
              <div className="bridge-link">
                <span />
                <Icon name="arrow" size={24} />
                <span />
              </div>
              <div className="phone-art">
                <div className="notch" />
                <Icon name="bridge" size={44} />
                <span>iOS</span>
              </div>
              <span className="art-caption">
                WINDOWS <span>→</span> macOS CI <span>→</span> iOS
              </span>
            </div>
          </section>
          <button
            type="button"
            className={`drop-zone ${drag ? "drag-active" : ""}`}
            onClick={open}
            disabled={busy}
            onDragOver={(e) => {
              e.preventDefault();
              setDrag(true);
            }}
            onDragLeave={() => setDrag(false)}
            onDrop={(event) => {
              event.preventDefault();
              setDrag(false);
              if (isTauri()) {
                open();
                return;
              }
              if (event.dataTransfer.items.length !== 1) {
                setError("Drop exactly one Flutter project folder.");
                return;
              }
              const item = event.dataTransfer.items[0];
              if (item) void inspect(() => readDroppedFolder(item));
            }}
          >
            <span className="drop-icon">
              <Icon name="folder" size={25} />
            </span>
            <span>
              <strong>{t.browse}</strong>
              <small>{t.importHint}</small>
            </span>
            <span className="file-chip">pubspec.yaml</span>
          </button>
          <div className="step-grid">
            {(["1", "2", "3"] as const).map((n) => (
              <section key={n} className="step-card">
                <span className="step-number">0{n}</span>
                <h3>{t[`step${n}`]}</h3>
                <p>{t[`step${n}Body`]}</p>
              </section>
            ))}
          </div>
          <section className="support-note">
            <Icon name="shield" size={23} />
            <div>
              <strong>{t.support}</strong>
              <p>{t.supportBody}</p>
            </div>
            <span className="mit-pill">MIT</span>
          </section>
        </>
      ) : (
        <>
          <div className="page-heading">
            <div>
              <p className="eyebrow">{t.project}</p>
              <h1>{project.name}</h1>
              <p>{t.readiness}</p>
            </div>
            <button className="secondary" type="button" onClick={() => onProject(null)}>
              {t.clear}
            </button>
          </div>
          <section className="project-summary panel">
            <div className="project-symbol">
              <Icon name="folder" size={30} />
            </div>
            <div>
              <h2>{project.kind === "flutter" ? t.detected : t.unsupported}</h2>
              <p>
                {project.fileCount} {t.files}
              </p>
            </div>
            <span className={`status-pill ${blocked ? "warning" : "ok"}`}>
              {blocked ? t.unsupported : t.ready}
            </span>
          </section>
          <dl className="detail-grid">
            <div>
              <dt>{t.version}</dt>
              <dd>{project.version ?? t.notSet}</dd>
            </div>
            <div>
              <dt>iOS Runner</dt>
              <dd>{project.hasIos ? "Runner.xcodeproj" : t.unknown}</dd>
            </div>
            <div>
              <dt>{t.bundle}</dt>
              <dd>{project.bundleIds.join(", ") || t.unknown}</dd>
            </div>
          </dl>
          <section className="panel">
            <div className="section-heading">
              <h2>{t.checking}</h2>
              <span>
                {project.findings.filter((f) => f.severity === "error").length} {t.errors}
              </span>
            </div>
            {project.findings.length ? (
              <Findings findings={project.findings} locale={locale} />
            ) : (
              <CheckLabel>{t.ready}</CheckLabel>
            )}
          </section>
          <div className="action-row">
            <button type="button" className="primary" disabled={blocked} onClick={onBuild}>
              {t.review}
              <Icon name="arrow" size={18} />
            </button>
          </div>
        </>
      )}
      {error && (
        <p role="alert" className="error-box">
          {error}
        </p>
      )}
    </>
  );
}
