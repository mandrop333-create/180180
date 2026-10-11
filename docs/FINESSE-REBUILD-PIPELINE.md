# Finesse Core Rebuild — Working Pipeline

This document is the source of truth for continuing the Finesse rebuild without drifting into unrelated repository infrastructure.

## Scope

- Repository: `mandrop333-create/180180`
- Working branch: `rebuild/finesse-core`
- Review vehicle: draft PR #8, targeting `main`
- Goal: replace/rebuild the Finesse planner incrementally while preserving the existing game engine, UI, input handling, and rules that already work.
- Current status: experimental rebuild; not approved for production.

## The pipeline we follow

1. **Work only on `rebuild/finesse-core`.** Inspect the actual code and tests before changing anything. Keep changes cohesive and limited to the Finesse rebuild.
2. **Prove the bug before changing behavior.** Reproduce a concrete failure against the rebuild or identify a missing invariant with a test. Do not infer a rebuild bug from a probe that tests the older live site.
3. **Add a regression test first where practical.** Prefer independent reference checks and browser/runtime tests that exercise the real game behavior, not only implementation details.
4. **Make the smallest justified code change.** Keep Finesse scoring cost distinct from execution-route details such as descent, gravity, and rotation. Do not alter unrelated game systems.
5. **Run the relevant GitHub Actions checks.** Report the exact runs and outcomes. Distinguish local/rebuild tests from read-only tests against the deployed site.
6. **Review the branch and draft PR #8.** Record remaining parity gaps and no-go gates clearly.
7. **Stop before production.** Do not merge to `main`, deploy, or claim the live domain is fixed without the user's explicit authorization. After authorization, verify each actual stage rather than assuming a deployment succeeded.

## What is and is not part of this pipeline

- GitHub is the workspace for code, commits, branches, pull requests, and GitHub Actions.
- The intended release path, when explicitly authorized, is reviewed rebuild branch → PR review → `main` → configured deployment process → live domain.
- **CL Circle / CircleCI is not part of the user's pipeline.** Do not use it as a workflow, dependency, prerequisite, or source of truth. Unrelated branches or files with similar names do not change this.
- Do not make unrelated infrastructure changes to simplify the Finesse task.

## Technical guardrails

- The main game engine and rules are reported to work; Finesse is the target of this rebuild.
- Keep the legacy `finesse.js` compatibility facade until its repository references have been audited and a safe replacement is demonstrated.
- Do not guess TETR.IO kick/pivot coordinate conversions. Prove parity using a pinned reference and the correct coordinate transform.
- Treat soft-drop-dependent tucks as an explicit coverage gap until their intended scope is decided and tested.
- A failing live-site probe is evidence about the deployed version unless it actually loads the rebuild branch. It does not alone establish that the rebuild is broken.
- Keep `main` and production untouched unless the user explicitly approves a merge or deployment.

## Progress note format

For each iteration, record:
1. **Finding** — concrete observed behavior or test gap.
2. **Evidence** — file/test and GitHub Actions run(s).
3. **Change** — exact files and reason; if none, say so.
4. **Validation** — checks run and actual outcomes.
5. **Next step** — the single next logical task and any unresolved blocker.

When asked to “proceed logically,” continue from the latest verified state using this sequence. Do not restart analysis, change the pipeline, or report work as completed when it has only been planned.
