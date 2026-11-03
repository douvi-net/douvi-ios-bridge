import type { Finding, Locale } from "../../../../packages/core/src";
import { Icon } from "./Icon";
export function Findings({ findings, locale }: { findings: Finding[]; locale: Locale }) {
  return (
    <ul className="findings">
      {findings.map((f) => (
        <li key={f.code} className={`finding ${f.severity}`}>
          <span className="finding-marker">{f.severity === "info" ? "i" : "!"}</span>
          <div>
            <strong>{f.title[locale]}</strong>
            <p>{f.fix[locale]}</p>
            <code>{f.code}</code>
          </div>
        </li>
      ))}
    </ul>
  );
}
export function CheckLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="check-label">
      <Icon name="check" size={14} />
      {children}
    </span>
  );
}
