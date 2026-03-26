# Changelog v4

## Refactor real pe domenii critice
- am extras orchestration-ul de level progression în `43-level-flow-domain.js`
- am extras orchestration-ul de boss intro în `44-boss-flow-domain.js`
- am extras rutarea audio critică în `45-audio-domain.js`

## Fixuri structurale
- `window.Sounds` este sincronizat cu obiectul real `Sounds`
- `beginLevelTransition`, `showBossIntro`, `startMusic`, `startMenuMusic`, `playSound` și `applyVolumes` trec acum prin domeniile noi
- flow-ul de level 10 nu mai depinde de patch-uri care se suprapun accidental

## Level 10 boss hardening
- freeze explicit înainte de intro
- resume explicit după intro
- restart controlat pentru boss music doar după intro
- spawn guard + watchdog păstrate și conectate la noul flow

## Validare
- toate fișierele JS trec `node --check`
