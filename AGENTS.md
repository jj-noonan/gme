# Agent guidelines

## Change workflow

Every code change follows this flow. Never commit directly to `main`.

1. Branch from an up-to-date `main` (`git checkout main && git pull`), using a descriptive name such as `feat/...`, `fix/...`, `docs/...`.
2. Make the change, and run `npm test` (and `npm run build:web` for web changes).
3. Commit, push the branch, and open a pull request with `gh pr create`.
4. Merge the PR (`gh pr merge --squash --delete-branch`), then return to `main` and pull.

## Pull request size

Keep PRs as contained and small as possible: one concern per PR. If a task has several independent parts (assets, a new component, wiring it into the UI), split them into separate PRs, merged in order.
