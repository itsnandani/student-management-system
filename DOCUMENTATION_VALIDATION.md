# Project Audit and Submission Evidence

## Repository and deployment

- Repository: https://github.com/itsnandani/student-management-system/
- Live site: https://itsnandani.github.io/student-management-system/
- Local checkout: branch `main`, at `da4195c Initial commit: Student Management System`; no commit or push was created during this audit.
- GitHub `main` currently points to `e0327b54885916c28231c6bca129021fa97fe5a5`, a remote child of local commit `da4195c`. Fetch and review this remote commit before committing or pushing local changes.
- GitHub Pages Actions run for the remote `main` commit completed successfully; its deployment status is `success`. A separate legacy Pages workflow run was cancelled.
- The live site responds successfully. Local changes in this workspace have not been deployed.
- No commit was created and nothing was pushed during this audit.

## Evidence captured

The five images below were captured from the running portal:

- `screenshots/dashboard.png` — desktop dashboard.
- `screenshots/students.png` — student list and table.
- `screenshots/add-student.png` — student entry form.
- `screenshots/reports.png` — reports and analytics.
- `screenshots/mobile.png` — responsive dashboard at a 375 CSS-pixel viewport.

## Automated and browser checks

- `node --test scripts/build.test.mjs`: 6 tests passed, covering content hashing, version changes, linked assets, update-check data safety, and exclusion of stale hash-named source copies.
- `node scripts/build.mjs`: completed successfully and generated 15 versioned assets in `dist/` (application version `d3a2ae369e204370`).
- Verified that generated asset references resolve and that the deployment output does not contain stale hash-named copies from the editable source folders.
- Browser smoke check of the built `dist/` site: the hashed JavaScript and CSS loaded, version `d3a2ae369e204370` was detected, 20 sample students rendered, and there were no failed requests or page errors.
- Browser smoke check on the live site: 20 students and 12 app sections loaded; no page errors or failed network requests were observed.
- Responsive viewport checks on the live site at 1440, 1024, 768, and 375: no document overflow was reported by the viewport sweep.
- Browser navigation checked Dashboard, Students, Add Student, and Reports pages; screenshots are included above.
- In an isolated local browser origin, tested student create/edit/delete, search and duplicate-ID rejection; attendance marking and persistence after reload; course and exam creation, mark entry, and result display; fee payment; and JSON backup export/import. The test origin was reset to the 20-student sample state after the checks. No live-site records were changed.
- The source Pages workflow runs its build tests, generates `dist/`, uploads the artifact, and deploys with GitHub Pages Actions. The latest remote Pages deployment succeeded; the local workspace changes remain undeployed.

## Limitations

The application uses LocalStorage, so records are scoped to a browser profile and are not a secure shared database. The local checkout does not include the latest remote `main` commit; review it before preparing a commit. No history was rewritten, no commit was created, nothing was pushed, and live-site data was not changed.

The browser checks were targeted smoke tests, not exhaustive QA: course editing/deletion, all CSV import/export edge cases, printable receipts, and every settings, theme, and notification action were not independently exercised.
