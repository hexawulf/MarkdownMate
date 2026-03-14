You have already completed reconnaissance for MarkdownMate and created:

- OPTIMIZATION_PLAN.md
- Metrics scripts under ./scripts/*
- New npm "metrics:*" scripts in package.json

Now stop planning and start executing.

Goal:
Implement **PR #1 (Monaco Diet)** exactly as you described in OPTIMIZATION_PLAN.md, on top of the current main branch of MarkdownMate.

Important constraints:
- Work in the existing repo at ./ (MarkdownMate root).
- Do NOT rewrite OPTIMIZATION_PLAN.md or the metrics scripts unless you find a clear bug.
- Do NOT introduce new dependencies unless strictly necessary. If you must, choose pure JS/TS and ARM-friendly packages.
- Keep the diff small, focused, and easy to review.
- Preserve existing behavior and UX; this PR is an optimization, not a feature rewrite.

Use OPTIMIZATION_PLAN.md as the source of truth:
1. Read the section that defines **Quick Win #1 / PR #1 (Monaco Diet)**.
2. Follow that design: slimming Monaco bundle, lazy-loading any heavy editor features, etc.
3. Only touch the files you listed there (e.g. editor/Monaco related components, Vite config, etc.).

What to produce in THIS run:

1) **Implementation**
   - Make the actual code changes required for PR #1.
   - Avoid touching unrelated code.

2) **Unified Diff (reviewable patch)**
   - At the end, show the full unified diff for this PR as a single code block (git diff style).
   - Clearly list which files were changed.

3) **Test & Metrics Instructions**
   - Give me an explicit test plan for this PR:
     - npm / pnpm commands to run (build, tests, etc.).
     - How to manually verify the editor still works as expected (load a doc, type, preview).
   - Specify which metrics command(s) to run from the existing scripts, e.g.:
     - ./scripts/collect-baseline.sh
     - npm run metrics:monaco
   - Tell me exactly how to compare the new metrics vs. the baseline (which JSON files / numbers to look at).

4) **Rollback Plan**
   - Explain how to revert this PR cleanly:
     - either via git (e.g. git revert <commit>) or
     - by backing out the specific file changes.

Scope for this message:
- Only **PR #1 (Monaco Diet)**.
- Do not start PR #2 or any other quick win yet.
- Do not add more planning sections; the plan already exists.

Assume I will:
- Review your diff,
- Run the suggested commands locally,
- And only then ask you to proceed with PR #2 if everything looks good.

Now implement PR #1 following this description.
