# Threadsmith Release Checklist - v0.1.0

## Goal

Use this checklist before tagging or publishing `v0.1.0`.

## CI-safe Checks

- [ ] `npm run test`
- [ ] `npm run build`
- [ ] `npm run test:e2e`
- [ ] `npm run verify:launchers`
- [ ] `npm run verify:release`
- [ ] `git diff --check`

## Manual Environment-dependent Checks

- [ ] Confirm [LICENSE](../../LICENSE) exists and README points to the MIT license
- [ ] Fresh clone the public repository and confirm `npm ci`, `npm run test`, `npm run build`, and `npm run verify:launchers` pass
- [ ] In a fresh clone, run `npm run start`, open the front door, then stop the dev server manually
- [ ] Open `http://127.0.0.1:5173/?appHome=1` after `npm run start` and confirm the cross-platform front door works
- [ ] If testing on Windows / Linux, confirm the npm startup path works without macOS `.command` files
- [ ] `npm run smoke:self-host`
  Default runs inside an isolated runtime workspace; use `npm run smoke:self-host -- .` only if you intentionally want smoke to touch the current project root truth.
- [ ] Open `./Open-Threadsmith-App.command` and confirm the front door loads, explains the daily entry path, and still makes first-run connection understandable
- [ ] Open `./Launch-Threadsmith.command "/path/to/project"` and confirm explicit project entry still works
- [ ] Confirm README screenshot still matches the current product surface

## Release Artifacts

- [ ] `CHANGELOG.md` includes `v0.1.0`
- [ ] `docs/releases/threadsmith-v0.1.0.md` is ready to reuse as GitHub release copy
- [ ] `docs/releases/public-sync-strategy.md` explains how the private working repo exports to the public release repo
- [ ] `README.md` points to the current `Codex-only` release surface honestly, including default routing and product boundary
- [ ] `docs/guides/usage-and-llm-configuration.md` explains launch modes, daily workflow, truth writeback, and current LLM/provider limits
- [ ] `docs/architecture/threadsmith-truth-boundary.md` still matches the current `.threadsmith` boundary
- [ ] `CONTRIBUTING.md` points to release verification and release workflow
- [ ] Internal planning docs, local absolute paths, and runtime Threadsmith artifacts are not tracked in the public release surface

## Final GitHub Publish Steps

- [ ] Keep the working/private repository private
- [ ] Export a clean public snapshot into a separate repository directory
- [ ] Run the public sensitive-info scan in the exported repository
- [ ] Create or update the separate public GitHub repository from that clean snapshot
- [ ] Create tag `v0.1.0` in the public repository
- [ ] Push the public repository `main` and tag
- [ ] Create the GitHub Release using `docs/releases/threadsmith-v0.1.0.md`
