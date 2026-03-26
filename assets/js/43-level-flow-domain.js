window.GameApp && window.GameApp.registerModule && window.GameApp.registerModule('43-level-flow-domain', {"entryMarker": "// level flow domain", "description": "Level progression domain with extracted transition orchestration, level-10 boss sequencing and watchdog/fallback spawn guard."});
/*__MODULE_BOUNDARY__*/
(function(){
  var app = window.GameApp; if (!app || !app.domains) return;
  var watchdog = { interval:0, timeout:0, lastReason:'', attempts:0, lastPulse:0 };

  function read(name, fallback){ return app.helpers.readState(name, fallback); }
  function write(name, value){
    try{
      if (app.state && typeof app.state[name] !== 'undefined') { app.state[name] = value; return value; }
    }catch(_){ }
    try{ window[name] = value; }catch(_){ }
    return value;
  }
  function call(fn, ctx, args, fallback){ return app.helpers.safeCall(fn, ctx, args, fallback); }
  function enemies(){ return read('enemies', []); }
  function level(){ return read('currentLevel', 1) || 1; }
  function kills(){ return read('kills', 0) || 0; }
  function audio(){ return app.domains.get('audio'); }
  function bossFlow(){ return app.domains.get('bossFlow'); }
  function spawnDomain(){ return app.domains.get('enemySpawning'); }
  function requestSpawn(reason){
    var d = spawnDomain();
    if (d && typeof d.spawn === 'function') return d.spawn(reason);
    if (app.legacy && typeof app.legacy.spawnEnemy === 'function') return app.legacy.spawnEnemy();
    return false;
  }
  function runtime(){ return app.runtime || null; }
  function sessionEpoch(){
    try{
      var session = app.session && app.session.state && app.session.state.run;
      return ((session && session.epoch) | 0) || 1;
    }catch(_){ return 1; }
  }
  function scheduleTracked(fn, ms, label){
    var rt = runtime();
    var epoch = sessionEpoch();
    var wrapped = function(){
      if (epoch !== sessionEpoch()) return false;
      try{ return typeof fn === 'function' ? fn() : false; }catch(_){ return false; }
    };
    if (rt && typeof rt.trackTimeout === 'function') return rt.trackTimeout(wrapped, Math.max(0, ms|0), label || 'level-flow');
    return setTimeout(wrapped, Math.max(0, ms|0));
  }
  function markTransitionSource(source, meta){
    app.debug = app.debug || {};
    app.debug.lastTransitionRequest = {
      at: new Date().toISOString(),
      source: source || 'gameplay',
      level: level(),
      meta: meta || {}
    };
    try{ window.__lastTransitionSource = source || 'gameplay'; }catch(_){ }
    return app.debug.lastTransitionRequest;
  }
  function hasBoss(){
    try{ return enemies().some(function(e){ return e && e.isBoss && !e.dead; }); }catch(_){ return false; }
  }
  function canAttemptBossSpawn(){
    if (level() !== 10) return false;
    if (read('gameEnded', false)) return false;
    if (read('levelTransitionActive', false)) return false;
    if (!read('enemySpawnsEnabled', false)) return false;
    try{
      var p = app.state.player || window.player;
      if (p && (p.state === 'dead' || p.state === 'predead')) return false;
    }catch(_){ }
    return true;
  }
  function clearWatchdog(){
    try{ if (watchdog.interval) clearInterval(watchdog.interval); }catch(_){ }
    try{ if (watchdog.timeout) clearTimeout(watchdog.timeout); }catch(_){ }
    try{
      var rt = app.runtime;
      if (rt && typeof rt.untrackAsync === 'function'){
        if (watchdog.interval) rt.untrackAsync(watchdog.interval);
        if (watchdog.timeout) rt.untrackAsync(watchdog.timeout);
      }
    }catch(_){ }
    watchdog.interval = 0;
    watchdog.timeout = 0;
    watchdog.attempts = 0;
  }
  function ensureBossPresence(reason){
    watchdog.lastReason = reason || 'manual';
    if (level() !== 10) return false;
    if (hasBoss()) return true;
    if (!canAttemptBossSpawn()) return false;
    var list = enemies();
    if (list && list.length > 0) return false;
    try{ return !!requestSpawn('boss-watchdog:' + watchdog.lastReason); }catch(_){ }
    return false;
  }
  function startBossWatchdog(origin){
    clearWatchdog();
    watchdog.lastReason = origin || 'unknown';
    watchdog.timeout = (app.runtime && typeof app.runtime.trackTimeout === 'function')
      ? app.runtime.trackTimeout(function(){ ensureBossPresence('watchdog-timeout:' + watchdog.lastReason); }, 1200, 'boss-watchdog-timeout')
      : setTimeout(function(){ ensureBossPresence('watchdog-timeout:' + watchdog.lastReason); }, 1200);
    watchdog.interval = (app.runtime && typeof app.runtime.trackInterval === 'function')
      ? app.runtime.trackInterval(function(){
      watchdog.attempts += 1;
      if (level() !== 10 || read('gameEnded', false) || hasBoss()){
        clearWatchdog();
        return;
      }
      ensureBossPresence('watchdog-interval:' + watchdog.lastReason + ':' + watchdog.attempts);
      if (watchdog.attempts >= 32) clearWatchdog();
    }, 250, 'boss-watchdog-interval')
      : setInterval(function(){
      watchdog.attempts += 1;
      if (level() !== 10 || read('gameEnded', false) || hasBoss()){
        clearWatchdog();
        return;
      }
      ensureBossPresence('watchdog-interval:' + watchdog.lastReason + ':' + watchdog.attempts);
      if (watchdog.attempts >= 32) clearWatchdog();
    }, 250);
  }

  function stopSpawnsAndFreeze(){
    write('levelTransitionActive', true);
    write('enemySpawnsEnabled', false);
    call(window.fadeEnemies);
  }
  function captureHealthSnapshot(targetLevel){
    try{
      var lvl = (typeof targetLevel === 'number' ? targetLevel : level()) | 0;
      if (read('healthAtLevelStartCapturedForLevel', 0) !== lvl){
        write('healthAtLevelStart', read('health', 100));
        write('healthAtLevelStartCapturedForLevel', lvl);
      }
    }catch(_){ }
  }
  function setTimerToFreshMinute(){
    write('timeLeft', 60.0);
    try{ lastTickSecond = null; }catch(_){ }
    try{
      var el = (typeof timerEl !== 'undefined' && timerEl) ? timerEl : document.getElementById('timer');
      if (el) el.textContent = String(Math.ceil(read('timeLeft', 60)));
    }catch(_){ }
  }
  function resetLevelRuntime(){
    write('kills', 0);
    call(window.renderKills);
    call(window.updateObjective, null, [0]);
    setTimerToFreshMinute();
    captureHealthSnapshot(level());
  }
  function overlayRefs(){
    return {
      overlay: document.getElementById('levelOverlay'),
      title: document.getElementById('levelTitle'),
      sub: document.getElementById('levelSub')
    };
  }
  function showLevelOverlay(){
    var refs = overlayRefs();
    if (refs.title) refs.title.textContent = 'LEVEL ' + level();
    if (refs.sub) refs.sub.textContent = '';
    if (refs.overlay) refs.overlay.classList.add('show');
    return refs;
  }
  function hideLevelOverlay(delay){
    scheduleTracked(function(){
      try{
        var refs = overlayRefs();
        if (refs.overlay) refs.overlay.classList.remove('show');
        if (refs.sub) refs.sub.textContent = '';
      }catch(_){ }
    }, delay, 'level-overlay-hide');
  }
  function scheduleFirstSpawn(delay, reason){
    scheduleTracked(function(){
      try{
        if (level() !== 10 || read('enemySpawnsEnabled', false)){
          if (enemies().length === 0) requestSpawn(reason || 'schedule-first-spawn');
        }
      }catch(_){ }
      if (level() === 10) startBossWatchdog(reason || 'scheduleFirstSpawn');
    }, delay, 'level-first-spawn');
  }
  function markGameplayResumed(){
    write('levelTransitionActive', false);
    write('enemySpawnsEnabled', true);
    try{ window.__transitionStarting = false; }catch(_){ }
    try{ if (app.runtime) app.runtime.releaseAction('level-transition'); }catch(_){ }
  }
  function handleBossAudioBeforeIntro(){
    var aud = audio();
    if (aud && typeof aud.pauseGameplayMusic === 'function') return aud.pauseGameplayMusic();
    try{ if (window.Sounds && Sounds.bgm && Sounds.bgm.pause) Sounds.bgm.pause(); }catch(_){ }
    try{ if (window.Sounds && Sounds.startBgm && Sounds.startBgm.pause) Sounds.startBgm.pause(); }catch(_){ }
    try{ if (window.Sounds && Sounds.bossEntrance && Sounds.bossEntrance.pause) Sounds.bossEntrance.pause(); }catch(_){ }
  }
  function resumeBossAudioAfterIntro(){
    var aud = audio();
    if (aud && typeof aud.enterBossLevel === 'function') return aud.enterBossLevel({ restart:true });
    try{ if (typeof window.__resumeBossTrack === 'function') window.__resumeBossTrack(); }catch(_){ }
  }
  function resumeStandardGameplayAudio(){
    var aud = audio();
    if (aud && typeof aud.startGameplayMusic === 'function') return aud.startGameplayMusic();
    try{ if (typeof window.startMusic === 'function') window.startMusic(); }catch(_){ }
  }
  function handleBossLevelStart(){
    clearWatchdog();
    try{ if (app.boss && typeof app.boss.resetIntro === 'function') app.boss.resetIntro(); }catch(_){ }
    handleBossAudioBeforeIntro();

    var intro = window.showBossIntro;
    if (typeof intro !== 'function'){
      resetLevelRuntime();
      markGameplayResumed();
      resumeBossAudioAfterIntro();
      scheduleFirstSpawn(500, 'boss-intro-missing');
      hideLevelOverlay(350);
      return true;
    }

    intro(function(){
      resetLevelRuntime();
      markGameplayResumed();
      resumeBossAudioAfterIntro();
      scheduleFirstSpawn(1000, 'boss-intro-finished');
      hideLevelOverlay(3000);
    });
    return true;
  }
  function handleStandardLevelStart(){
    scheduleTracked(function(){
      resetLevelRuntime();
      markGameplayResumed();
      scheduleTracked(function(){
        try{ if (enemies().length === 0) requestSpawn('standard-level-start'); }catch(_){ }
      }, 5000, 'standard-first-spawn');
    }, 2000, 'standard-level-start');
    hideLevelOverlay(3000);
  }
  function updateAudioForLevelChange(prevLevel, nextLevel){
    var aud = audio();
    if (nextLevel === 10){
      handleBossAudioBeforeIntro();
      return;
    }
    if (prevLevel === 10 && nextLevel === 11){
      if (aud && typeof aud.exitBossLevel === 'function') { aud.exitBossLevel(); return; }
      resumeStandardGameplayAudio();
    }
  }
  function beginTransitionImpl(source, meta){
    var transitionSource = source || 'gameplay';
    var transitionMeta = meta || {};
    if (read('gameEnded', false)) return false;
    if (read('levelTransitionActive', false) || window.__transitionStarting) return false;
    markTransitionSource(transitionSource, transitionMeta);
    if (app.runtime && typeof app.runtime.lockAction === 'function' && !app.runtime.lockAction('level-transition', 9000, { level:level() + 1, source:transitionSource, meta:transitionMeta })){
      return false;
    }
    window.__transitionStarting = true;
    stopSpawnsAndFreeze();

    var prevLevel = level();
    var nextLevel = (prevLevel|0) + 1;
    write('currentLevel', nextLevel);
    captureHealthSnapshot(nextLevel);
    updateAudioForLevelChange(prevLevel, nextLevel);
    call(window.updateLevelBalance);
    showLevelOverlay();

    if (nextLevel === 10) return handleBossLevelStart();
    handleStandardLevelStart();
    return true;
  }

  var domain = app.domains.define('levelFlow', {
    level: level,
    kills: kills,
    target: function(){ return call(window.killTargetForLevel, null, [level()], 0); },
    beginTransition: beginTransitionImpl,
    devSkipNextLevel: function(){
      if (runtime() && runtime().runState && runtime().runState.finalized) return false;
      return beginTransitionImpl('dev-skip', { debug:true, devSkip:true });
    },
    startTimer: function(){ return call(window.startGameTimer); },
    updateObjective: function(v){ return call(window.updateObjective, null, [v]); },
    renderKills: function(){ return call(window.renderKills); },
    spawnEnemy: function(){ return requestSpawn('domain-api'); },
    resetLevelRuntime: resetLevelRuntime,
    showLevelOverlay: showLevelOverlay,
    hideLevelOverlay: hideLevelOverlay,
    hasBoss: hasBoss,
    ensureBossPresence: ensureBossPresence,
    startBossWatchdog: startBossWatchdog,
    clearWatchdog: clearWatchdog,
    status: function(){
      return {
        level: level(), kills: kills(), target: this.target(), hasBoss: hasBoss(),
        enemySpawnsEnabled: !!read('enemySpawnsEnabled', false),
        levelTransitionActive: !!read('levelTransitionActive', false),
        gameEnded: !!read('gameEnded', false),
        watchdogReason: watchdog.lastReason,
        watchdogAttempts: watchdog.attempts
      };
    }
  }, { owner:'43-level-flow-domain' });

  window.beginLevelTransition = function(){ return domain.beginTransition('gameplay'); };
  window.devSkipToNextLevel = function(){ return domain.devSkipNextLevel(); };
  try{ beginLevelTransition = window.beginLevelTransition; }catch(_){ }
  app.bindAction('beginLevelTransition', window.beginLevelTransition, { owner:'43-level-flow-domain', patched:true, extracted:true });
  app.bindAction('devSkipNextLevel', window.devSkipToNextLevel, { owner:'43-level-flow-domain', debugOnly:true, extracted:true });

  if (app.loop && typeof app.loop.addAfter === 'function'){
    app.loop.addAfter(function(_dt, ts){
      if (level() !== 10 || hasBoss() || read('gameEnded', false)) return;
      if ((ts - watchdog.lastPulse) < 1000) return;
      watchdog.lastPulse = ts;
      if (canAttemptBossSpawn()) ensureBossPresence('loop-guard');
    });
  }
})();
