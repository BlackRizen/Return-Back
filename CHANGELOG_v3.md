# TOP36 refactor v3

## Ce s-a adăugat
- registru de domenii `GameApp.domains` pentru organizarea logicii pe responsabilități
- fațade separate pentru `player`, `combat`, `levelFlow`, `bossFlow`, `audio`, `ui`, `pickups`, `runnerMode`
- watchdog real pentru boss-ul de la level 10, cu polling și fallback spawn dacă jocul ajunge în starea potrivită și boss-ul încă lipsește
- patch pe `beginLevelTransition()` și `showBossIntro()` pentru a porni watchdog-ul și a sincroniza flag-urile de intro

## Beneficiu practic
- logicile importante sunt acum grupate pe domenii și pot fi mutate mai ușor în fișiere dedicate reale
- debugging mai clar: `GameApp.domains.get("levelFlow").status()` și `GameApp.domains.get("audio").snapshot()` oferă diagnoză rapidă
- bugul de boss de la level 10 are acum și o plasă de siguranță, nu doar o presupunere de cod

## Limitare asumată
- acesta este un refactor profund incremental: păstrează compatibilitatea cu globalele existente și nu rescrie încă intern tot gameplay-ul în clase/module ES
