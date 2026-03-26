# CHANGELOG v12 — session ownership stabilization

## Added
- `assets/js/53-session-lifecycle-domain.js`

## Focus
- single late-loaded owner for boot scheduling, gameplay loop start/stop, retry cleanup and boss/session normalization
- safer recovery path for retry/restart without relying on stacked legacy hooks
- explicit derived boss combat stage used as an extra gate for level 10 attacks

## Main effects
- `window.boot` and `window.__startGameAfter` now pass through one session authority
- `GameApp.actions.startMainLoop` / `stopMainLoop` now enforce single-loop ownership
- `GameApp.runtime.resetRunState` now stops the loop, clears volatile flags, hides boss intro UI and purges world entities before retry flow resumes
- `resumeEnemySpawns(delay)` uses tracked timeouts when runtime tracking exists
- retry buttons are rebound to the centralized retry path
