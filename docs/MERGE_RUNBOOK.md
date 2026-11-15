# Safe integration and Pages runbook

## Use one consolidated release PR

Use a new, separate PR from the verified M6 head to `main` after the owner approves public integration. Keep #7–#12 and the M6 draft as review history. Do not merge or retarget them individually. A consolidated merge puts the portfolio, build, CI and documentation on main together. The trade-off is a larger cumulative diff, so review it against the pinned pre-M1 main SHA rather than reviewing only M6’s incremental changes.

1. Confirm `main` still points to `ecc0484dcf027f04552eef6b5feb62401bc64b80`. If it moved, audit the difference and verify a new release candidate. Avoid force-pushes.
2. Review `git diff --stat main...<reviewed-m6-sha>` and the full cumulative diff. The expected additions are the audit and evidence extracts, research story, post-contest labs and companion, tests, tooling and release workflows. The root README is replaced. The protected trees `paper/`, `problem/`, `figures/` and `src/` must match the pinned manifest.
3. Verify both workflow jobs and the documentation checklist on the exact proposed head. Record the tested head SHA and approval. Inspect repository branch protection in Settings. The connector returned 403 and the readable repository ruleset list was empty, so protection and effective permissions remain owner checks. Require applicable reviews and green verification without bypassing gates.
4. After rights and product approval, open the consolidated PR and verify its exact head checks. Merge with a **merge commit** to make rollback unambiguous. Verify the resulting main commit and its own CI. Record the release merge SHA. Close redundant drafts as superseded and link them to the consolidated PR only after successful integration. Close milestone issues only after the owner confirms their delivery status.

## Approve and verify publication separately

GitHub reported Pages disabled before M6. The owner must confirm rights for the original paper, the COMAP prompt, and the embedded or extracted artwork. Then confirm that the repository is eligible for Pages and set Settings → Pages → Build and deployment → Source to **GitHub Actions**. Configure the `github-pages` environment for main only and require an owner reviewer where available. The workflow does not enable Pages itself. [GitHub Pages workflow documentation](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages)

After separate publication approval and green verification on the integrated main head, manually dispatch `deploy-pages` on **main**. Enter `publish-approved-main` and the full approved main SHA. The build gate checks the ref, repository, SHA and approval input. The deployment job uses the `github-pages` environment. No feature-branch push, PR or merge alone dispatches publication.

Use the URL returned by the successful deployment workflow. Check HTTPS status and visible rendering at the project root, `site/`, `site/decision/`, `site/companion/`, and the rendered Figure Atlas. Open the original PDF with a page anchor and the official prompt. Check figures, narrow-screen keyboard navigation, JSON and CSV downloads, and the JavaScript-free source library. Record the deployment run, tested URL and commit. Describe the site as live only after these post-deployment checks pass.

## Roll back

- If release CI fails before merge, keep the release PR open. Correct the feature branch, rerun CI and obtain approval for the new head.
- If the integrated release fails after merge, cancel any pending deployment. Open a rollback branch from current main and run `git revert -m 1 <release-merge-sha>` there. Review and merge the revert through a separate rollback PR. Preserve public history and original evidence.
- If a deployed release needs immediate removal, the owner can unpublish Pages in Settings while the rollback is reviewed. If an earlier reviewed site exists, restore its verified contents through a reviewed main-branch rollback PR and dispatch the workflow again with the new approved main SHA. If the pre-release state had Pages disabled, leave publication disabled after rollback.
- Verify the resulting Pages state, root and subpaths and log the rollback outcome. A Git revert alone does not remove content from an already published Pages deployment.
