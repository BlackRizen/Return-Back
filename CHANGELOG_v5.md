# Changelog v5

## Refactor pe spawning și boss attacks
- am introdus `49-enemy-spawn-domain.js` ca owner final pentru `spawnEnemy`, `enemyShoot` și `beginEnemyShoot`
- am introdus `51-boss-attack-domain.js` ca owner final pentru `bossAttackFire` și `__bossJumpSlamAndWave`

## Cleanup de comportament
- selectorii multipli de atac pentru boss nu mai rămân activi concurent; ultimul owner este domeniul dedicat
- audio-ul pentru proiectilele boss-ului de la level 10 este centralizat și nu mai depinde de blocuri duplicate împrăștiate în codul legacy
- spawning-ul și focul inamicilor scriu acum snapshot-uri de debug în `GameApp.debug`

## Impact pentru bug-ul de level 10
- dacă boss-ul apare, atacurile sale trec acum printr-o singură rută
- dacă boss-ul nu apare, poți vedea imediat în `GameApp.debug.lastSpawn` dacă spawn-ul a fost încercat, în ce stare și cu ce rezultat

## Validare
- toate fișierele JS trec `node --check`
