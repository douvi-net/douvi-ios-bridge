import { useState } from "react";
import { analyzeBuildLog, type Locale } from "../../../../packages/core/src";
import type { Copy } from "../i18n";
import { Findings } from "./Findings";
import { Icon } from "./Icon";
export function LogPanel({ copy: t, locale }: { copy: Copy; locale: Locale }) {
  const [raw, setRaw] = useState("");
  const [result, setResult] = useState<ReturnType<typeof analyzeBuildLog> | null>(null);
  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">OFFLINE DIAGNOSTICS</p>
          <h1>{t.logTitle}</h1>
          <p>{t.logBody}</p>
        </div>
        <span className="status-pill">Offline</span>
      </div>
      <section className="panel">
        <label>
          {t.logInput}
          <textarea
            rows={10}
            maxLength={2_000_000}
            spellCheck={false}
            placeholder="Paste an actual CI log…"
            value={raw}
            onChange={(e) => {
              setRaw(e.target.value);
              setResult(null);
            }}
          />
        </label>
        <p className="field-note">{t.redactionNote}</p>
        <button
          className="primary"
          type="button"
          disabled={!raw.trim()}
          onClick={() => {
            setResult(analyzeBuildLog(raw));
            setRaw("");
          }}
        >
          <Icon name="terminal" size={17} />
          {t.analyze}
        </button>
      </section>
      {result && (
        <>
          <section className="panel">
            <Findings findings={result.findings} locale={locale} />
          </section>
          <section className="panel">
            <h2>{t.sanitized}</h2>
            {/* biome-ignore lint/a11y/noNoninteractiveTabindex: This scrollable log region needs keyboard scrolling. */}
            <pre tabIndex={0}>{result.redactedLog}</pre>
          </section>
        </>
      )}
    </>
  );
}
