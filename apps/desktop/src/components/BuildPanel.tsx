import { useState } from "react";
import {
  generateUnsignedWorkflow,
  type ProjectInspection,
  parseGitHubRepository,
  type WorkflowConfig,
} from "../../../../packages/core/src";
import type { Copy } from "../i18n";
import { downloadText } from "../project-io";
import { Icon } from "./Icon";
export function BuildPanel({
  copy: t,
  project,
}: {
  copy: Copy;
  project: ProjectInspection | null;
}) {
  const [config, setConfig] = useState<WorkflowConfig>({
    flutterVersion: "",
    projectDirectory: ".",
    runner: "macos-15",
    timeoutMinutes: 30,
    retentionDays: 1,
    mode: "unsigned",
  });
  const [sourceConsent, setSourceConsent] = useState(false);
  const [costConsent, setCostConsent] = useState(false);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState("");
  const [repo, setRepo] = useState("");
  const [repoResult, setRepoResult] = useState("");
  const ready =
    project?.kind === "flutter" && !project.findings.some((f) => f.severity === "error");
  const update = <K extends keyof WorkflowConfig>(key: K, value: WorkflowConfig[K]) => {
    setConfig((old) => ({ ...old, [key]: value }));
    setDraft("");
    setError("");
  };
  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">FLUTTER → macOS CI</p>
          <h1>{t.buildTitle}</h1>
          <p>{t.buildBody}</p>
        </div>
        <span className="status-pill">{t.notRun}</span>
      </div>
      {!ready && <p className="notice">{t.noProject}</p>}
      <div className="build-layout">
        <div>
          <section className="panel">
            <div className="section-heading">
              <h2>{t.build}</h2>
              <span className="small-badge">01</span>
            </div>
            <div className="form-grid">
              <label>
                {t.flutter}
                <input
                  placeholder="3.x.y"
                  value={config.flutterVersion}
                  onChange={(e) => update("flutterVersion", e.target.value)}
                />
                <small>{t.flutterHint}</small>
              </label>
              <label>
                {t.directory}
                <input
                  value={config.projectDirectory}
                  onChange={(e) => update("projectDirectory", e.target.value)}
                />
              </label>
              <label>
                {t.runner}
                <select
                  value={config.runner}
                  onChange={(e) => update("runner", e.target.value as WorkflowConfig["runner"])}
                >
                  <option value="macos-15">macOS 15 · standard</option>
                  <option value="macos-26">macOS 26 · standard</option>
                </select>
              </label>
              <label>
                {t.mode}
                <select value="unsigned" disabled>
                  <option value="unsigned">{t.unsigned}</option>
                </select>
              </label>
              <label>
                {t.timeout}
                <input
                  type="number"
                  min="5"
                  max="60"
                  value={config.timeoutMinutes}
                  onChange={(e) => update("timeoutMinutes", Number(e.target.value))}
                />
              </label>
              <label>
                {t.retention}
                <input
                  type="number"
                  min="1"
                  max="7"
                  value={config.retentionDays}
                  onChange={(e) => update("retentionDays", Number(e.target.value))}
                />
              </label>
            </div>
            <p className="field-note">{t.signedUnavailable}</p>
          </section>
          <section className="panel consent-panel">
            <h2>{t.costTitle}</h2>
            <p>{t.costBody}</p>
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={sourceConsent}
                onChange={(e) => {
                  setSourceConsent(e.target.checked);
                  setDraft("");
                }}
              />
              {t.sourceConsent}
            </label>
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={costConsent}
                onChange={(e) => {
                  setCostConsent(e.target.checked);
                  setDraft("");
                }}
              />
              {t.costConsent}
            </label>
            <button
              className="primary"
              type="button"
              disabled={!ready || !sourceConsent || !costConsent}
              onClick={() => {
                try {
                  setDraft(generateUnsignedWorkflow(config));
                  setError("");
                } catch (e) {
                  setError(e instanceof Error ? e.message : t.error);
                }
              }}
            >
              <Icon name="build" size={17} />
              {t.generate}
            </button>
            {error && (
              <p className="error-box" role="alert">
                {error}
              </p>
            )}
          </section>
        </div>
        <aside>
          <section className="panel build-status">
            <span className="project-symbol">
              <Icon name="phone" size={28} />
            </span>
            <h3>{t.unsigned}</h3>
            <p>{t.outputHint}</p>
            <div className="status-line">
              <span>{t.status}</span>
              <strong>{t.notRun}</strong>
            </div>
            <button type="button" className="secondary" disabled>
              {t.buildBlocked}
            </button>
          </section>
          <section className="panel">
            <h3>{t.github}</h3>
            <label>
              <span className="visually-hidden">{t.github}</span>
              <input
                value={repo}
                placeholder="owner/repository"
                onChange={(e) => {
                  setRepo(e.target.value);
                  setRepoResult("");
                }}
              />
            </label>
            <button
              type="button"
              className="text-button"
              disabled={!repo}
              onClick={() => {
                try {
                  const parsed = parseGitHubRepository(repo);
                  setRepoResult(`${parsed.owner}/${parsed.repo}`);
                } catch (e) {
                  setRepoResult(e instanceof Error ? e.message : t.error);
                }
              }}
            >
              {t.validateRepo}
              <Icon name="arrow" size={14} />
            </button>
            <small>{t.repoHint}</small>
            {repoResult && (
              <p className="repo-result" role="status">
                {repoResult}
              </p>
            )}
          </section>
        </aside>
      </div>
      {draft && (
        <section className="panel workflow-panel">
          <div className="section-heading">
            <div>
              <h2>{t.draft}</h2>
              <p>{t.draftNote}</p>
            </div>
            <button
              className="secondary"
              type="button"
              onClick={() => downloadText("douvi-ios-unsigned.yml", draft)}
            >
              <Icon name="down" size={17} />
              {t.download}
            </button>
          </div>
          {/* biome-ignore lint/a11y/noNoninteractiveTabindex: This scrollable code region needs keyboard scrolling. */}
          <pre tabIndex={0}>{draft}</pre>
        </section>
      )}
    </>
  );
}
