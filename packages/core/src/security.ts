/** Best-effort local redaction. Unknown secrets may remain: never auto-upload logs. */
export function redactLog(input: string, knownSecrets: readonly string[] = []): string {
  let text = input.slice(0, 2_000_000);
  for (const secret of [...knownSecrets].filter(Boolean).sort((a, b) => b.length - a.length))
    text = text.split(secret).join("[REDACTED]");
  return text
    .replace(
      /-----BEGIN [A-Z ]*(?:PRIVATE KEY|CERTIFICATE)-----[\s\S]*?(?:-----END [A-Z ]+-----|$)/g,
      "[REDACTED KEY/CERTIFICATE]",
    )
    .replace(/\b(?:gh[pousr]_[A-Za-z0-9_]+|github_pat_[A-Za-z0-9_]+)\b/g, "[REDACTED TOKEN]")
    .replace(/\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g, "[REDACTED JWT]")
    .replace(/(authorization\s*[:=]\s*)(?:bearer|basic)\s+[^\s"']+/gi, "$1[REDACTED]")
    .replace(
      /((?:[A-Z_]*(?:TOKEN|PASSWORD|SECRET|PRIVATE_KEY|CERTIFICATE|P12_BASE64|PROFILE_BASE64)[A-Z_]*|api[_-]?key)\s*[:=]\s*)(?:"[^"\n]*"|'[^'\n]*'|[^\s,;]+)/gi,
      "$1[REDACTED]",
    )
    .replace(/(https?:\/\/)[^\s/@]+:[^\s/@]+@/gi, "$1[REDACTED]@")
    .replace(/([?&](?:token|key|signature|sig|password|secret)=)[^&\s]+/gi, "$1[REDACTED]")
    .replace(/[A-Z]:\\Users\\[^\\\s]+/gi, "C:\\Users\\[USER]")
    .replace(/\/(?:Users|home)\/[^/\s]+/g, "/[HOME]")
    .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, "[EMAIL]");
}
export function parseGitHubRepository(input: string): { owner: string; repo: string } {
  const raw = input.trim();
  let path = raw;
  if (raw.startsWith("https://")) {
    const u = new URL(raw);
    if (u.hostname !== "github.com" || u.port || u.username || u.password || u.search || u.hash)
      throw new Error(
        "Use an exact github.com repository URL without credentials or query parameters.",
      );
    path = u.pathname.replace(/^\//, "").replace(/\/$/, "");
  }
  const match = /^([A-Za-z0-9](?:[A-Za-z0-9-]{0,37}[A-Za-z0-9])?)\/([A-Za-z0-9_.-]{1,100})$/.exec(
    path,
  );
  if (!match?.[1] || !match[2] || /^\.+$/.test(match[2]))
    throw new Error("Use owner/repository or https://github.com/owner/repository.");
  const repo = match[2].replace(/\.git$/, "");
  if (!repo || /^\.+$/.test(repo)) throw new Error("Invalid repository name.");
  return { owner: match[1], repo };
}
