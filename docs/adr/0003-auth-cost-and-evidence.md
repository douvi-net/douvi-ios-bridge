# ADR 0003 — Approval binds authority, cost and real build evidence

Status: accepted for foundation design, 2026-11-03.

Do not equate an OAuth sign-in with selected-repository access. Design around a repository-selected GitHub App or an explicit user-provided fine-grained token with only the required operations; native secure storage is mandatory. Workflow editing and workflow execution are separate permissions and approvals.

Every real dispatch must bind account/repo/source commit/workflow revision/runner to a reviewed cost and trust decision. Validate/refuse unsupported or larger runner labels. Default to manual-only workflows, bounded duration and one-day artifacts. Do not estimate zero cost for a private repo without inspecting the account's quota/billing policy.

Success requires the actual workflow conclusion and downloaded, hashed, inspected output. TASK 06 additionally requires a signed IPA; an unsigned app or YAML is a sub-milestone only. Device installation and Apple processing/review are separate states with separate evidence.

Consequences: onboarding requires an explicit review step and some operations may be BLOCKED when facts or authority are missing. This is preferable to claiming a build or initiating spend without evidence. No recurring server, public repo conversion, automatic merge or public release is part of the foundation.

Evidence: [GitHub app authorization](https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/authorizing-oauth-apps), [workflow API](https://docs.github.com/en/rest/actions/workflows), [artifact API](https://docs.github.com/en/rest/actions/artifacts), [secure use](https://docs.github.com/en/actions/reference/security/secure-use).
