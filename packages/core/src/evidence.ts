import type { BuildEvidence } from "./types";
export function validateBuildEvidence(e: BuildEvidence): string[] {
  const errors: string[] = [];
  if (!/^[a-f\d]{40}$/i.test(e.commitSha)) errors.push("Missing full source commit SHA.");
  if (!Number.isSafeInteger(e.runId) || e.runId <= 0) errors.push("Missing real workflow run ID.");
  if (e.conclusion !== "success") errors.push("Workflow did not conclude successfully.");
  if (!e.artifactName || !Number.isSafeInteger(e.artifactBytes) || e.artifactBytes <= 0)
    errors.push("Artifact is empty or absent.");
  if (!/^[a-f\d]{64}$/i.test(e.artifactSha256)) errors.push("Missing artifact SHA-256.");
  if (!e.downloaded) errors.push("Artifact has not been downloaded.");
  if (!e.payloadVerified) errors.push("App payload has not been inspected.");
  if (e.artifactKind === "signed-ipa" && !e.signatureVerified)
    errors.push("IPA signature has not been verified.");
  return errors;
}
