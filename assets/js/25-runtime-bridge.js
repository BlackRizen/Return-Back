window.GameApp && window.GameApp.registerModule && window.GameApp.registerModule('25-runtime-bridge', {"entryMarker": "// runtime state bridge", "description": "Binds legacy globals to GameApp.state and window accessors for safer cross-module state sharing."});
/*__MODULE_BOUNDARY__*/
(function(){
  var app = window.GameApp;
  if (!app || window.__runtimeBridgeInstalled) return;
  window.__runtimeBridgeInstalled = true;

  function bindMutable(name, getter, setter, meta){
    try{ app.bindState(name, getter, setter, meta); }catch(_){ }
  }
  function bindReadonly(name, getter, meta){
    try{ app.bindState(name, getter, undefined, meta); }catch(_){ }
  }
  function bindAction(name, fn, meta){
    try{ app.bindAction(name, fn, meta); }catch(_){ }
  }

  app.legacy = app.legacy || {};
  try{ if (!app.legacy.spawnEnemy && typeof spawnEnemy === 'function') app.legacy.spawnEnemy = spawnEnemy; }catch(_){ }
  try{ if (!app.legacy.enemyShoot && typeof enemyShoot === 'function') app.legacy.enemyShoot = enemyShoot; }catch(_){ }
  try{ if (!app.legacy.beginEnemyShoot && typeof beginEnemyShoot === 'function') app.legacy.beginEnemyShoot = beginEnemyShoot; }catch(_){ }
  try{ if (!app.legacy.bossAttackFire && typeof bossAttackFire === 'function') app.legacy.bossAttackFire = bossAttackFire; }catch(_){ }
  try{ if (!app.legacy.bossJumpSlam && typeof __bossJumpSlamAndWave === 'function') app.legacy.bossJumpSlam = __bossJumpSlamAndWave; }catch(_){ }
  try{ if (!app.legacy.beginLevelTransition && typeof beginLevelTransition === 'function') app.legacy.beginLevelTransition = beginLevelTransition; }catch(_){ }

  try{ window.__domainOwnsSpawnEnemy = true; }catch(_){ }
  try{ window.__domainOwnsBossAttacks = true; }catch(_){ }

  app.runtime = app.runtime || {};
  app.runtime.trackedAsync = app.runtime.trackedAsync || new Map();
  app.runtime.actionLocks = app.runtime.actionLocks || {};
  app.runtime.runState = app.runtime.runState || { finalized:false, finalizeReason:'', finalizedAt:'' };
  app.runtime.timeFX = app.runtime.timeFX || { scale:1, untilTs:0, token:0, reason:'' };
  app.debugFlags = app.debugFlags || {};
  app.debugFlags.oneShotKill = app.debugFlags.oneShotKill === true;

  function syncOneShotKill(flag){
    var enabled = !!flag;
    app.debugFlags.oneShotKill = enabled;
    try{ window.__ONE_SHOT_KILL = enabled; }catch(_){ }
    try{
      if (window.localStorage){
        if (enabled) localStorage.setItem('GAMEPOWER_ONE_SHOT_KILL', '1');
        else localStorage.removeItem('GAMEPOWER_ONE_SHOT_KILL');
      }
    }catch(_){ }
    try{
      window.dispatchEvent(new CustomEvent('debug:oneshot-changed', { detail:{ enabled:enabled } }));
    }catch(_){ }
    return enabled;
  }

  try{
    if (window.localStorage && localStorage.getItem('GAMEPOWER_ONE_SHOT_KILL') === '1'){
      app.debugFlags.oneShotKill = true;
    }
  }catch(_){ }

  try{ window.__ONE_SHOT_KILL = !!app.debugFlags.oneShotKill; }catch(_){ }

  window.__isOneShotKillEnabled = function(){ return !!(app.debugFlags && app.debugFlags.oneShotKill); };
  window.__setOneShotKillMode = syncOneShotKill;
  window.__computeEnemyDamage = function(enemy, baseDamage){
    var dmg = Math.max(0, Number(baseDamage) || 0);
    if (!enemy) return dmg;
    try{
      if (window.__isOneShotKillEnabled && window.__isOneShotKillEnabled()){
        var hpNow = Number(enemy.hp);
        var maxHp = Number(enemy.maxHp);
        var lethal = Number.isFinite(hpNow) && hpNow > 0 ? hpNow : (Number.isFinite(maxHp) && maxHp > 0 ? maxHp : dmg);
        return Math.max(dmg, lethal || 0);
      }
    }catch(_){ }
    return dmg;
  };

  function nowIso(){ return new Date().toISOString(); }
  function nowMs(){
    try{ return (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now(); }catch(_){ return Date.now(); }
  }

  function safeNumber(getter, fallback){
    try{
      var value = getter();
      return Number.isFinite(value) ? value : fallback;
    }catch(_){
      return fallback;
    }
  }

  function currentRunEpoch(){
    try{
      var run = app.session && app.session.state && app.session.state.run;
      return ((run && run.epoch) | 0) || 1;
    }catch(_){
      return 1;
    }
  }

  function notifyParentRunFinished(reason, finalizedAt){
    try{
      if (!window.parent || window.parent === window) return false;

      var iso = finalizedAt || nowIso();
      var payload = {
        type: 'game-run-finished',
        reason: reason || 'finalized',
        score: safeNumber(function(){ return score; }, 0),
        level: safeNumber(function(){ return currentLevel; }, 1),
        kills: safeNumber(function(){ return kills; }, 0),
        finalizedAt: iso,
        runId: 'epoch-' + currentRunEpoch() + '-' + iso
      };

      window.parent.postMessage(payload, '*');

      app.debug = app.debug || {};
      app.debug.lastParentRunPost = {
        at: nowIso(),
        payload: payload
      };

      return true;
    }catch(_){
      return false;
    }
  }

  app.runtime.getTimeScale = function(ts){
    try{
      var fx = this.timeFX || (this.timeFX = { scale:1, untilTs:0, token:0, reason:'' });
      var now = (typeof ts === 'number') ? ts : nowMs();
      var scale = Number(fx.scale);
      if (!Number.isFinite(scale) || scale <= 0 || !fx.untilTs || now >= fx.untilTs){
        if (fx.untilTs && now >= fx.untilTs) this.clearSlowMotion('expired');
        return 1;
      }
      return Math.max(0.05, Math.min(1, scale));
    }catch(_){ return 1; }
  };

  app.runtime.startSlowMotion = function(scale, durationMs, reason){
    var s = Number(scale);
    var dur = Number(durationMs);
    if (!Number.isFinite(s)) s = 1;
    if (!Number.isFinite(dur)) dur = 0;
    s = Math.max(0.08, Math.min(1, s));
    dur = Math.max(0, dur);
    if (dur <= 0 || s >= 0.999) return false;
    var now = nowMs();
    this.timeFX = this.timeFX || { scale:1, untilTs:0, token:0, reason:'' };
    this.timeFX.scale = s;
    this.timeFX.untilTs = now + dur;
    this.timeFX.reason = reason || '';
    this.timeFX.token = (this.timeFX.token || 0) + 1;
    app.debug = app.debug || {};
    app.debug.lastTimeFx = {
      at: nowIso(),
      scale: s,
      durationMs: Math.round(dur),
      reason: reason || ''
    };
    return true;
  };

  app.runtime.clearSlowMotion = function(reason){
    this.timeFX = this.timeFX || { scale:1, untilTs:0, token:0, reason:'' };
    this.timeFX.scale = 1;
    this.timeFX.untilTs = 0;
    this.timeFX.reason = reason || '';
    this.timeFX.token = (this.timeFX.token || 0) + 1;
    app.debug = app.debug || {};
    app.debug.lastTimeFxCleared = {
      at: nowIso(),
      reason: reason || ''
    };
    return true;
  };

  function stopLoopSafe(){
    try{
      if (app.actions && typeof app.actions.stopMainLoop === 'function') return app.actions.stopMainLoop('runtime-finalize');
    }catch(_){ }
    try{ if (app.loop && typeof app.loop.stop === 'function') return app.loop.stop(); }catch(_){ }
    return false;
  }

  function clearBossFlags(){
    try{ window.__bossSpawnPending = false; }catch(_){ }
    try{ window.__bossEntrancePlaying = false; }catch(_){ }
    try{ window.__transitionStarting = false; }catch(_){ }
  }

  function finishBossIntroSession(){
    try{
      var bossFlow = app.domains && app.domains.get && app.domains.get('bossFlow');
      if (bossFlow && typeof bossFlow.finishIntro === 'function') bossFlow.finishIntro();
    }catch(_){ }
  }

  app.runtime.trackTimeout = function(fn, ms, label){
    var runtime = this;
    var id = setTimeout(function(){
      try{ runtime.trackedAsync.delete(id); }catch(_){ }
      try{ if (typeof fn === 'function') fn(); }catch(_){ }
    }, Math.max(0, ms|0));
    try{ runtime.trackedAsync.set(id, { kind:'timeout', label:label || '' }); }catch(_){ }
    return id;
  };

  app.runtime.trackInterval = function(fn, ms, label){
    var id = setInterval(function(){
      try{ if (typeof fn === 'function') fn(); }catch(_){ }
    }, Math.max(1, ms|0));
    try{ this.trackedAsync.set(id, { kind:'interval', label:label || '' }); }catch(_){ }
    return id;
  };

  app.runtime.trackFrame = function(fn, label){
    var runtime = this;
    var id = requestAnimationFrame(function(ts){
      try{ runtime.trackedAsync.delete(id); }catch(_){ }
      try{ if (typeof fn === 'function') fn(ts); }catch(_){ }
    });
    try{ runtime.trackedAsync.set(id, { kind:'frame', label:label || '' }); }catch(_){ }
    return id;
  };

  app.runtime.untrackAsync = function(id){
    try{ this.trackedAsync.delete(id); }catch(_){ }
    return id;
  };

  app.runtime.clearTrackedAsync = function(){
    try{
      this.trackedAsync.forEach(function(meta, id){
        try{
          if (meta && meta.kind === 'frame') cancelAnimationFrame(id);
          else {
            clearTimeout(id);
            clearInterval(id);
          }
        }catch(_){ }
      });
      this.trackedAsync.clear();
    }catch(_){ }
    return true;
  };

  app.runtime.clearSpawnQueue = function(reason){
    try{
      app.spawnControl = app.spawnControl || window.GameApp && GameApp.spawnControl || { paused:false, queued:false, lastReason:'' };
      app.spawnControl.queued = false;
      if (app.spawnControl.lastReason === 'boss-pending' || app.spawnControl.lastReason === 'boss-intro' || app.spawnControl.lastReason === 'game-ended' || app.spawnControl.lastReason === 'transition'){
        app.spawnControl.lastReason = reason || '';
      } else if (!app.spawnControl.paused) {
        app.spawnControl.lastReason = reason || '';
      }
    }catch(_){ }
    return true;
  };

  app.runtime.lockAction = function(key, durationMs, meta){
    if (!key) return false;
    if (this.runState && this.runState.finalized) return false;
    if (this.actionLocks[key]) return false;
    var lock = {
      key: key,
      startedAt: Date.now(),
      meta: meta || {},
      durationMs: Math.max(0, durationMs|0),
      timerId: 0
    };
    if (lock.durationMs > 0){
      var runtime = this;
      lock.timerId = runtime.trackTimeout(function(){ runtime.releaseAction(key); }, lock.durationMs, 'action-lock:' + key);
    }
    this.actionLocks[key] = lock;
    return lock;
  };

  app.runtime.releaseAction = function(key){
    var lock = this.actionLocks[key];
    if (!lock) return false;
    try{
      if (lock.timerId){
        clearTimeout(lock.timerId);
        clearInterval(lock.timerId);
        this.trackedAsync.delete(lock.timerId);
      }
    }catch(_){ }
    delete this.actionLocks[key];
    return true;
  };

  app.runtime.isActionLocked = function(key){
    return !!(key && this.actionLocks && this.actionLocks[key]);
  };

  app.runtime.clearActionLocks = function(){
    try{
      for (var key in this.actionLocks){
        try{
          var lock = this.actionLocks[key];
          if (lock && lock.timerId){
            clearTimeout(lock.timerId);
            clearInterval(lock.timerId);
            this.trackedAsync.delete(lock.timerId);
          }
        }catch(_){ }
        delete this.actionLocks[key];
      }
    }catch(_){ }
    return true;
  };

  app.runtime.clearCombatFlow = function(reason, options){
    options = options || {};
    this.clearTrackedAsync();
    this.clearActionLocks();
    this.clearSlowMotion(reason || '');
    this.clearSpawnQueue(reason || '');
    clearBossFlags();
    if (options.finishIntro !== false) finishBossIntroSession();
    try{ if (typeof enemySpawnsEnabled !== 'undefined') enemySpawnsEnabled = false; }catch(_){ }
    try{ if (typeof levelTransitionActive !== 'undefined' && options.keepTransition !== true) levelTransitionActive = false; }catch(_){ }
    try{
      var levelFlow = app.domains && app.domains.get && app.domains.get('levelFlow');
      if (levelFlow && typeof levelFlow.clearWatchdog === 'function') levelFlow.clearWatchdog();
    }catch(_){ }
    app.debug = app.debug || {};
    app.debug.lastFlowReset = { at:nowIso(), reason:reason || '', stopLoop:options.stopLoop !== false };
    return true;
  };

  app.runtime.finalizeRunEnd = function(reason, options){
    options = options || {};

    if (this.runState.finalized){
      if (options.stopLoop !== false) stopLoopSafe();
      return false;
    }

    var finalReason = reason || 'finalized';
    var finalizedAt = nowIso();

    this.runState.finalized = true;
    this.runState.finalizeReason = finalReason;
    this.runState.finalizedAt = finalizedAt;

    try{
      if (typeof gameEnded !== 'undefined') {
        gameEnded = (options.markGameEnded === false ? gameEnded : true);
      }
    }catch(_){ }

    this.clearCombatFlow(finalReason, options);

    if (options.stopLoop !== false) stopLoopSafe();

    app.debug = app.debug || {};
    app.debug.lastFinalize = {
      at: finalizedAt,
      reason: finalReason,
      stopLoop: options.stopLoop !== false
    };

    try{
      notifyParentRunFinished(finalReason, finalizedAt);
    }catch(_){ }

    return true;
  };

  app.runtime.resetRunState = function(reason){
    this.runState.finalized = false;
    this.runState.finalizeReason = reason || '';
    this.runState.finalizedAt = '';
    this.clearTrackedAsync();
    this.clearActionLocks();
    this.clearSlowMotion(reason || '');
    this.clearSpawnQueue(reason || '');
    clearBossFlags();
    try{ if (typeof gameEnded !== 'undefined') gameEnded = false; }catch(_){ }
    try{ if (typeof paused !== 'undefined') paused = false; }catch(_){ }
    app.debug = app.debug || {};
    app.debug.lastFinalize = { at:nowIso(), reset:true, reason:reason || '' };
    return true;
  };

  bindMutable('score', function(){ return score; }, function(v){ score = v; }, { owner: '10-core-foundation' });
  bindAction('addScore', function(delta, pos){ return addScore(delta, pos); }, { owner: '10-core-foundation' });
  bindAction('renderScoreBadge', function(){ return renderScoreBadge(); }, { owner: '10-core-foundation' });

  bindReadonly('player', function(){ return player; }, { owner: '20-gameplay-core' });
  bindReadonly('projectiles', function(){ return projectiles; }, { owner: '20-gameplay-core' });
  bindReadonly('enemies', function(){ return enemies; }, { owner: '20-gameplay-core' });
  bindReadonly('enemyProjectiles', function(){ return enemyProjectiles; }, { owner: '20-gameplay-core' });
  bindReadonly('coins', function(){ return coins; }, { owner: '20-gameplay-core' });
  bindReadonly('particles', function(){ return particles; }, { owner: '20-gameplay-core' });

  bindMutable('health', function(){ return health; }, function(v){ health = v; }, { owner: '20-gameplay-core' });
  bindMutable('healthAtLevelStart', function(){ return healthAtLevelStart; }, function(v){ healthAtLevelStart = v; }, { owner: '20-gameplay-core' });
  bindMutable('healthAtLevelStartCapturedForLevel', function(){ return healthAtLevelStartCapturedForLevel; }, function(v){ healthAtLevelStartCapturedForLevel = v; }, { owner: '20-gameplay-core' });
  bindMutable('paused', function(){ return paused; }, function(v){ paused = !!v; }, { owner: '20-gameplay-core' });
  bindMutable('controlsLocked', function(){ return controlsLocked; }, function(v){ controlsLocked = !!v; }, { owner: '20-gameplay-core' });
  bindMutable('shootHeld', function(){ return shootHeld; }, function(v){ shootHeld = !!v; }, { owner: '20-gameplay-core' });
  bindMutable('enemySpawnsEnabled', function(){ return enemySpawnsEnabled; }, function(v){ enemySpawnsEnabled = !!v; }, { owner: '20-gameplay-core' });
  bindMutable('timeLeft', function(){ return timeLeft; }, function(v){ timeLeft = v; }, { owner: '20-gameplay-core' });
  bindMutable('timerStarted', function(){ return timerStarted; }, function(v){ timerStarted = !!v; }, { owner: '20-gameplay-core' });
  bindMutable('gameEnded', function(){ return gameEnded; }, function(v){ gameEnded = !!v; }, { owner: '20-gameplay-core' });
  bindMutable('currentLevel', function(){ return currentLevel; }, function(v){ currentLevel = v|0; }, { owner: '20-gameplay-core' });
  bindMutable('levelTransitionActive', function(){ return levelTransitionActive; }, function(v){ levelTransitionActive = !!v; }, { owner: '20-gameplay-core' });
  bindMutable('kills', function(){ return kills; }, function(v){ kills = v|0; }, { owner: '20-gameplay-core' });

  bindAction('setHealth', function(v){ return setHealth(v); }, { owner: '20-gameplay-core' });
  bindAction('startGameTimer', function(){ return startGameTimer(); }, { owner: '20-gameplay-core' });
  bindAction('beginLevelTransition', function(){ return beginLevelTransition(); }, { owner: '20-gameplay-core' });
  bindAction('spawnEnemy', function(){ return spawnEnemy(); }, { owner: '20-gameplay-core' });
  bindAction('renderKills', function(){ return renderKills(); }, { owner: '20-gameplay-core' });
  bindAction('updateObjective', function(v){ return updateObjective(v); }, { owner: '20-gameplay-core' });

  app.boss = app.boss || {};
  app.boss.resetIntro = function(){
    try{ window.__bossIntroDone = false; }catch(_){ }
    try{ window.__bossInvul = false; }catch(_){ }
    try{ window.__blockF = false; }catch(_){ }
  };
  app.boss.markIntroDone = function(){
    try{ window.__bossIntroDone = true; }catch(_){ }
  };
})();