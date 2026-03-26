# TOP36 refactor map v5

Această variantă mută ownership-ul final pentru spawning-ul de inamici și selectorul de atacuri ale boss-ului într-un layer de domenii dedicat, astfel încât patch-urile vechi să nu se mai calce între ele.

## Module
1. **assets/js/10-core-foundation.js** — Core helpers, score/level HUD, boss HUD, shared gameplay scaling.
2. **assets/js/20-gameplay-core.js** — Gameplay setup, preload logic, timers, combat loop, enemy updates, boss interactions.
3. **assets/js/25-runtime-bridge.js** — Leagă globalele legacy de GameApp.state și de accessorii window.*, eliminând diferențele dintre variabilele let și proprietățile de pe window.
4. **assets/js/30-state-and-flow.js** — Crash/fall flow, overlays, options wiring și boot/start flow rămas legacy.
5. **assets/js/35-loop-orchestrator.js** — Mută orchestration-ul RAF într-un serviciu GameApp.loop, ca bază pentru refactorul complet al game loop-ului.
6. **assets/js/40-hud-sync.js** — HUD digit sync and pre-control bridge utilities.
7. **assets/js/50-controls-and-overlays.js** — Touch controls, fullscreen-safe helpers, level-choice controls, button interactions.
8. **assets/js/60-loader-and-startup.js** — Loader, tap-to-start, startup sequencing, audio warmup, loading bar bindings.
9. **assets/js/70-ui-patches.js** — Repair FX sync, anti-focus guards, no-flicker overlay init, loading bar polish, wave patch.
10. **assets/js/80-boss-cinematics.js** — Cinematici/patch-uri boss legacy păstrate compatibil.
11. **assets/js/90-shop-and-abilities.js** — Shop rules, abilities, cooldown UI, runner mode și overlay mirrors.
12. **assets/js/36-domain-kernel.js** — Registru de domenii + helperi comuni pentru noua arhitectură.
13. **assets/js/41-player-domain.js** — Fațadă pentru player, mișcare și snapshot-uri sigure.
14. **assets/js/42-combat-domain.js** — Fațadă pentru proiectile, inamici și hit checks.
15. **assets/js/43-level-flow-domain.js** — Orchestration real pentru tranziții de level, reset timer/kills, sequencing pentru level 10 și watchdog de boss.
16. **assets/js/44-boss-flow-domain.js** — Orchestration real pentru boss intro, flags și puntea către cinematici.
17. **assets/js/45-audio-domain.js** — Rutare reală pentru muzică/SFX, unificare Sounds/window.Sounds și tranziții audio boss/game/menu.
18. **assets/js/46-ui-domain.js** — Refresh și coordonare HUD/UI.
19. **assets/js/47-pickups-domain.js** — Resurse, coins și pickups.
20. **assets/js/48-runner-mode-domain.js** — Control pentru runner mode și snapshot UI.
21. **assets/js/49-enemy-spawn-domain.js** — Owner final pentru `spawnEnemy`, `enemyShoot` și `beginEnemyShoot`, cu politică audio unificată și diagnostic de spawn.
22. **assets/js/51-boss-attack-domain.js** — Owner final pentru `bossAttackFire` și `__bossJumpSlamAndWave`, care înlocuiește selectorii suprapuși din patch-urile vechi.
23. **assets/js/52-adaptive-director-domain.js** — Observer adaptiv pentru pattern-urile jucătorului: profil live, tag-uri de stil, memorie pe nivel/campanie și ponderi pregătite pentru counter-play-ul inamicilor.
24. **assets/js/53-session-lifecycle-domain.js** — Owner final pentru boot/start loop/stop loop/retry cleanup și normalizarea stărilor de sesiune + boss.

## Ce s-a schimbat în v5
- `spawnEnemy`, `enemyShoot` și `beginEnemyShoot` trec printr-un singur domeniu care păstrează corpurile legacy, dar scoate politicile de spawn/audio din monolit.
- `bossAttackFire` are acum un singur owner final, instalat ultimul, astfel încât patch-urile din `40-hud-sync.js` și `80-boss-cinematics.js` să nu se mai suprascrie imprevizibil.
- audio-ul pentru proiectilele boss-ului de la level 10 este centralizat și nu mai depinde de ramuri duplicate din `enemyShoot`.
- au fost adăugate snapshot-uri de debug: `GameApp.debug.lastSpawn`, `GameApp.debug.lastEnemyShot`, `GameApp.debug.lastBossAttack`.

## Impact
- spawning-ul și atacurile boss-ului pot fi urmărite dintr-un singur loc
- selectorul final de atac al boss-ului nu mai este lăsat la mâna ordinii accidentale a patch-urilor legacy
- debugging-ul pentru level 10 devine mult mai simplu în browser console

## Ce s-a adăugat în build-ul adaptiv
- modulul `52-adaptive-director-domain.js` observă poziția jucătorului, ritmul focului, schimbările de lane, distanța față de inamici și reacția la momente de presiune.
- profilul adaptiv este păstrat în `GameApp.state.adaptation` și este compus din metrici EMA, tag-uri cu hysteresis și ponderi soft pentru viitoarele decizii AI.
- debug panel-ul afișează acum stilul detectat, top tag-urile și top weight-urile, plus un toggle pentru activarea/dezactivarea Adaptive Director.
- această fază nu schimbă încă deciziile AI în luptă; pregătește doar fundația sigură pentru faza următoare.

## Ce s-a schimbat în session pass
- a fost introdus un owner final pentru `window.boot`, `__startGameAfter`, `GameApp.actions.startMainLoop` și `GameApp.actions.stopMainLoop`, astfel încât pornirea jocului și ownership-ul loop-ului să nu mai depindă de hook-uri parțiale.
- `GameApp.session` normalizează stările volatile (`gameEnded`, `levelTransitionActive`, `enemySpawnsEnabled`, flags boss) și expune un snapshot comun pentru debug.
- retry-ul folosește acum o cale centralizată care golește lumea, oprește loop-ul rămas, curăță boss intro/UI și repornește nivelul prin același flow orchestrat.
- boss-ul level 10 are acum o stare derivată (`intro_pending`, `intro_playing`, `spawn_pending`, `entrance_playing`, `combat_active`, `cleanup`) folosită ca gardă suplimentară pentru atacuri.
