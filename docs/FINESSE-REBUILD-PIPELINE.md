# Finesse Core Rebuild — Working Pipeline

This document is the source of truth for continuing the Finesse rebuild without confusing source-control, test, build, and deployment state.

## Scope

- Repository: `mandrop333-create/180180`
- Working branch: `rebuild/finesse-core`
- Review vehicle: draft PR #8, targeting `main`
- Goal: replace/rebuild the Finesse planner incrementally while preserving the existing game engine, UI, input handling, and rules that already work.
- Current status: experimental rebuild; not approved for production.

## The pipeline we follow

1. **Re-read repository state before acting.** Confirm the current branch, latest commit SHA, PR state, and the relevant version of this document. After a reconnect or interrupted tool call, inspect again; never infer where work stopped.
2. **Work only on `rebuild/finesse-core`.** Inspect the actual code and tests before changing anything. Keep changes cohesive and limited to the Finesse rebuild.
3. **Prove the bug before changing behavior.** Reproduce a concrete failure against the rebuild or identify a missing invariant with a test. Do not infer a rebuild bug from a probe that tests the older live site.
4. **Add a regression test first where practical.** Prefer independent reference checks and browser/runtime tests that exercise the real game behavior, not only implementation details.
5. **Make the smallest justified code change.** Keep Finesse scoring cost distinct from execution-route details such as descent, gravity, and rotation. Do not alter unrelated game systems.
6. **Run the relevant GitHub Actions checks.** Report exact run URLs/IDs, tested commit/ref, and outcomes. Distinguish local/rebuild tests from read-only tests against the deployed site.
7. **Review the branch and draft PR #8.** Record remaining parity gaps and no-go gates clearly.
8. **Stop before production.** Do not merge to `main`, deploy, or claim the live domain is fixed without the user's explicit authorization. After authorization, verify each actual stage rather than assuming a deployment succeeded.

## Cloudflare and deployment — mandatory separation of stages

**Do not treat “commit,” “GitHub Actions passed,” “Cloudflare build passed,” “deployment completed,” and “the live site works” as synonyms.** They are separate facts and each needs its own evidence.

### A. Identify what is being deployed

There are separate targets in this repository:

- **Website:** the static site served at `https://180436.xyz/`. A change to website files is not proof that a Cloudflare Worker was deployed.
- **Diagnostics Worker:** the isolated Worker deployed by `.github/workflows/deploy-diagnostics-worker.yml`. That workflow explicitly checks out `feature/runtime-diagnostics` and runs `wrangler deploy --config worker/wrangler.toml`. It is not the Finesse website deployment and does not deploy `rebuild/finesse-core` or `main` unless its checked-out ref/configuration is deliberately changed.
- **Tests/diagnostics:** `.github/workflows/finesse-tests.yml`, `.github/workflows/prompt-playwright-test.yml`, and `.github/workflows/test-live-diagnostics-worker.yml` perform checks; a successful test workflow is not itself a website deployment.

Before any deployment-related claim, name the target (website or Worker), the source ref and commit SHA, and the exact workflow/project being checked.

### B. Website build/deployment verification

1. Confirm the change is committed to the intended branch. Record the commit SHA and verify the commit exists on that branch. A planned edit, an uncommitted edit, or a commit on the rebuild branch is not a change to `main`.
2. Check whether the configured Cloudflare website project is actually connected to that branch and whether the commit triggered a build. Do not assume the integration, production branch, build command, output directory, or deployment trigger; verify those settings from the actual Cloudflare project/deployment record.
3. Open the deployment record for the **same commit SHA**. Record whether the build started, its final status, and any build log/error. A missing run, queued run, unavailable status, or unrelated deployment is **unverified**, not a build failure.
4. Separate the build result from deployment result. A successful build does not prove that production was deployed; a deployment status must be checked separately.
5. **Hand the live-site acceptance check to the user.** The user should open `https://180436.xyz/` on their device and confirm the actual visual/interactive change. Provide a short, specific checklist of what to inspect and what result to report. Do not claim the live experience is verified merely because the URL responds, a static fetch succeeds, or a GitHub test passes.
6. The assistant may inspect repository files, GitHub Actions results, and any Cloudflare deployment records genuinely available through connected tools. It must not imply it can see the user's browser, device-specific rendering, authenticated Cloudflare dashboard, or unexposed deployment details. If a relevant record is inaccessible, say exactly what is and is not verified.
7. If the Cloudflare dashboard/run cannot be inspected, say **“Cloudflare build/deployment not verified”** and state what evidence is missing. Do not say it failed, succeeded, or deployed based on assumption.

### C. Diagnostics Worker verification

1. Confirm the intended Worker source branch and commit. The existing deploy workflow currently checks out `feature/runtime-diagnostics`; treat that as a separate release path.
2. Verify the **Deploy diagnostics Worker** GitHub Actions run itself, including its exact checked-out ref/SHA and final result.
3. Only after a successful deploy run, verify the **Test live diagnostics Worker** smoke-test run and its health/storage/report checks. A deploy success and a smoke-test success are distinct statuses.
4. Do not use Worker deployment status as evidence that the website at `180436.xyz` was built or deployed.

### D. Status vocabulary — use precisely

- **Committed:** a verified commit SHA exists on the named branch.
- **Checks passed/failed:** a named test/workflow run completed with that conclusion for the stated ref/SHA.
- **Build passed/failed:** the actual website project's build record completed with that conclusion for the same commit.
- **Deployed:** the target's deployment record confirms completion for the stated commit/version.
- **Live endpoint checked:** a limited request to the public URL succeeded. This does not prove the intended visual or interactive change is correct.
- **Live behavior user-confirmed:** the user checked the deployed site in their real browser/device and confirmed the requested behavior.
- **Live behavior verified by automation:** a named browser test actually ran against the production URL and verified the expected behavior; name the run and commit/deployment it tested.
- **Unverified/unknown:** evidence is unavailable, still running, stale, or refers to a different commit/target. Never relabel this as failure.

When reporting a failure, include the failing stage and its evidence. If one stage succeeds and a later stage is unknown, report exactly that; do not collapse the stages into a single “build failed” statement.

## What is and is not part of this pipeline

- GitHub is the workspace for code, commits, branches, pull requests, and GitHub Actions.
- The intended Finesse release path, when explicitly authorized, is reviewed rebuild branch → PR review → `main` → verified configured website deployment → user-confirmed live-site acceptance (or a clearly identified production browser test if one is actually available).
- **CL Circle / CircleCI is not part of the user's pipeline.** Do not use it as a workflow, dependency, prerequisite, or source of truth. Unrelated branches or files with similar names do not change this.
- Do not make unrelated infrastructure changes to simplify the Finesse task.
- Do not infer the website deployment method from the existence of a Cloudflare Worker workflow. The current repository workflow deploys the separate diagnostics Worker; website build/deployment must be verified in the actual configured website project.

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
2. **Evidence** — file/test, commit SHA/ref, and GitHub Actions or Cloudflare run(s).
3. **Change** — exact files and reason; if none, say so.
4. **Validation** — checks run and actual outcomes, separately noting build, deploy, and live verification. Clearly identify any manual live-site check awaiting the user.
5. **User handoff, when needed** — give the user a concise checklist for the production browser/device check and ask them to report what they observe; do not mark it verified until they confirm or a real production browser test provides evidence.
6. **Next step** — the single next logical task and any unresolved blocker.

When asked to “proceed logically,” continue from the latest verified state using this sequence. Do not restart analysis, change the pipeline, or report work as completed when it has only been planned.
