window.GameApp && window.GameApp.registerModule && window.GameApp.registerModule('53-session-lifecycle-domain', {"entryMarker": "// session lifecycle domain", "description": "Final authority for boot scheduling, loop ownership, retry cleanup and normalized boss/session state."});
/*__MODULE_BOUNDARY__*/
(function(){
  var app = window.GameApp;
  if (!app || window.__sessionLifecycleInstalled) return;
  window.__sessionLifecycleInstalled = true;

  function nowIso(){ return new Date().toISOString(); }
  function read(name, fallback){
    try{
      if (app.helpers && typeof app.helpers.readState === 'function') return app.helpers.readState(name, fallback);
      if (app.state && typeof app.state[name] !== 'undefined') return app.state[name];
      if (typeof window[name] !== 'undefined') return window[name];
    }catch(_){}
    return fallback;
  }
  function write(name, value){
    try{
      if (app.state && typeof app.state[name] !== 'undefined') { app.state[name] = value; return value; }
    }catch(_){}
    try{ window[name] = value; }catch(_){}
    return value;
  }
  function safe(fn, ctx, args, fallback){
    try{ return typeof fn === 'function' ? fn.apply(ctx || null, args || []) : fallback; }catch(_){ return fallback; }
  }
  function runtime(){ return app.runtime || null; }
  function loop(){ return app.loop || null; }
  function level(){ return (read('currentLevel', 1) | 0) || 1; }
  function enemies(){
    try{ return app.state.enemies || window.enemies || []; }catch(_){ return []; }
  }
  function hasBossEntity(){
    try{
      return enemies().some(function(e){ return e && e.isBoss && !e.dead; });
    }catch(_){ return false; }
  }
  function stateBag(){
    app.session = app.session || {};
    app.session.state = app.session.state || {
      installedAt: nowIso(),
      boot: { scheduled:false, started:false, completed:false, calls:0, timerId:0, scheduledAt:'', startedAt:'', completedAt:'' },
      run: { id:0, epoch:1, active:false, startCount:0, stopCount:0, lastStartReason:'', lastStopReason:'', lastTransitionSource:'', finalized:false },
      boss: { stage:'inactive', at:nowIso(), reason:'init', level:level(), present:false, introDone:false, pending:false, entrance:false }
    };
    try{
      app.session.state.run = app.session.state.run || {};
      if (!app.session.state.run.epoch || app.session.state.run.epoch < 1) app.session.state.run.epoch = 1;
    }catch(_){}
    return app.session.state;
  }
  function currentEpoch(){
    var bag = stateBag();
    return ((bag.run && bag.run.epoch) | 0) || 1;
  }
  function bumpEpoch(reason){
    var bag = stateBag();
    bag.run = bag.run || {};
    bag.run.epoch = ((bag.run.epoch | 0) || 0) + 1;
    app.debug = app.debug || {};
    app.debug.lastEpochChange = { at:nowIso(), epoch:bag.run.epoch, reason:reason || '' };
    return bag.run.epoch;
  }
  function setBossStage(stage, reason){
    var bag = stateBag();
    bag.boss = bag.boss || {};
    var changed = bag.boss.stage !== stage;
    bag.boss.stage = stage || 'inactive';
    bag.boss.at = nowIso();
    bag.boss.reason = reason || '';
    bag.boss.level = level();
    bag.boss.present = hasBossEntity();
    bag.boss.introDone = (window.__bossIntroDone === true);
    bag.boss.pending = !!window.__bossSpawnPending;
    bag.boss.entrance = !!window.__bossEntrancePlaying;
    app.debug = app.debug || {};
    app.debug.bossState = {
      stage: bag.boss.stage,
      at: bag.boss.at,
      reason: bag.boss.reason,
      level: bag.boss.level,
      present: bag.boss.present,
      introDone: bag.boss.introDone,
      pending: bag.boss.pending,
      entrance: bag.boss.entrance
    };
    return changed;
  }
  function inferBossStage(reason){
    var lvl = level();
    var rt = runtime();
    var stage = 'inactive';
    if (lvl === 10){
      if (read('gameEnded', false) || (rt && rt.runState && rt.runState.finalized)) stage = 'cleanup';
      else if (!!window.__bossEntrancePlaying) stage = 'entrance_playing';
      else if (!!window.__bossSpawnPending) stage = 'spawn_pending';
      else if (window.__bossIntroDone !== true){
        stage = (read('controlsLocked', false) || read('levelTransitionActive', false)) ? 'intro_playing' : 'intro_pending';
      } else if (hasBossEntity()){
        stage = 'combat_active';
      } else if (read('enemySpawnsEnabled', false)) {
        stage = 'combat_pending';
      } else {
        stage = 'intro_complete';
      }
    }
    setBossStage(stage, reason || 'infer');
    return stateBag().boss.stage;
  }
  function clearBossFlags(hard){
    try{ window.__bossSpawnPending = false; }catch(_){}
    try{ window.__bossEntrancePlaying = false; }catch(_){}
    try{ window.__transitionStarting = false; }catch(_){}
    try{ window.__fGateL10BossApplied = false; }catch(_){}
    if (hard){
      try{ window.__bossIntroDone = false; }catch(_){}
      try{ window.__bossInvul = false; }catch(_){}
      try{ window.__blockF = false; }catch(_){}
    }
  }
  function hideBossIntroUi(){
    try{
      var ov = document.getElementById('BossIntroOv');
      if (ov) ov.style.display = 'none';
    }catch(_){}
    try{
      var vid = document.getElementById('BossIntroVid');
      if (vid){ vid.pause(); vid.currentTime = 0; }
    }catch(_){}
  }
  function hideOverlays(){
    try{ var overlay = document.getElementById('overlay'); if (overlay) overlay.classList.remove('show'); }catch(_){}
    try{ var win = document.getElementById('win'); if (win) win.classList.remove('show'); }catch(_){}
    try{ var lvl = document.getElementById('levelOverlay'); if (lvl) lvl.classList.remove('show'); }catch(_){}
    hideBossIntroUi();
  }
  function clearItemTimers(item){
    if (!item) return false;
    var keys = ['_animTimer','despawnTimer','timer','timerId','iv','intervalId','timeoutId','trailTimer','holdTimer'];
    for (var i = 0; i < keys.length; i += 1){
      var key = keys[i];
      try{
        var id = item[key];
        if (!id) continue;
        clearTimeout(id);
        clearInterval(id);
        if (app.runtime && typeof app.runtime.untrackAsync === 'function') app.runtime.untrackAsync(id);
        item[key] = 0;
      }catch(_){}
    }
    return true;
  }
  function purgeList(name){
    var list;
    try{
      list = (app.state && app.state[name]) || window[name];
    }catch(_){ list = null; }
    if (!list || typeof list.length !== 'number') return 0;
    var removed = 0;
    for (var i = list.length - 1; i >= 0; i -= 1){
      var item = list[i];
      clearItemTimers(item);
      try{ if (item && item.el && item.el.remove) item.el.remove(); }catch(_){}
      try{ if (item && item.node && item.node.remove) item.node.remove(); }catch(_){}
      try{ if (item && item.wrap && item.wrap.remove) item.wrap.remove(); }catch(_){}
      try{ if (item && item.overlay && item.overlay.remove) item.overlay.remove(); }catch(_){}
      try{ if (item && item.trailEl && item.trailEl.remove) item.trailEl.remove(); }catch(_){}
      removed += 1;
    }
    try{ list.length = 0; }catch(_){}
    return removed;
  }
  function purgeWorld(reason){
    var removed = {
      enemies: purgeList('enemies'),
      enemyProjectiles: purgeList('enemyProjectiles'),
      projectiles: purgeList('projectiles'),
      coins: purgeList('coins'),
      particles: purgeList('particles')
    };
    app.debug = app.debug || {};
    app.debug.lastWorldPurge = { at:nowIso(), reason:reason || '', removed:removed };
    return removed;
  }
  function normalizeFlow(reason, options){
    options = options || {};
    var rt = runtime();
    if (rt && rt.runState){
      stateBag().run.finalized = !!rt.runState.finalized;
    }
    if (level() !== 10){
      clearBossFlags(false);
    }
    if (read('gameEnded', false) || (rt && rt.runState && rt.runState.finalized)){
      write('enemySpawnsEnabled', false);
      if (options.keepControlsLocked !== false) write('controlsLocked', true);
    }
    if (read('levelTransitionActive', false)){
      write('enemySpawnsEnabled', false);
    }
    if (!read('levelTransitionActive', false) && !read('gameEnded', false) && !(rt && rt.runState && rt.runState.finalized) && options.unlockControls === true){
      write('controlsLocked', false);
    }
    inferBossStage(reason || 'normalize');
    app.debug = app.debug || {};
    app.debug.lastSessionNormalize = {
      at: nowIso(),
      reason: reason || '',
      level: level(),
      enemySpawnsEnabled: !!read('enemySpawnsEnabled', false),
      levelTransitionActive: !!read('levelTransitionActive', false),
      gameEnded: !!read('gameEnded', false),
      finalized: !!(rt && rt.runState && rt.runState.finalized)
    };
    return true;
  }
  function stopLoopInternal(reason){
    var bag = stateBag();
    var lp = loop();
    if (!lp) return false;
    if (!lp.isRunning){
      bag.run.lastStopReason = reason || 'stop-ignored';
      return false;
    }
    bag.run.stopCount += 1;
    bag.run.lastStopReason = reason || 'stop';
    bag.run.active = false;
    lp.stop();
    inferBossStage('stop-loop:' + (reason || ''));
    return true;
  }
  function startLoopInternal(reason){
    var bag = stateBag();
    var rt = runtime();
    var lp = loop();
    if (!lp) return false;
    if (rt && rt.runState && rt.runState.finalized) return false;
    if (lp.isRunning){
      bag.run.lastStartReason = 'ignored:' + (reason || '');
      return false;
    }
    bag.run.startCount += 1;
    bag.run.active = true;
    bag.run.id = (bag.run.id | 0) + 1;
    bag.run.lastStartReason = reason || 'start';
    var frame = null;
    try{ frame = typeof tick === 'function' ? tick : null; }catch(_){ frame = null; }
    if (!frame && app.actions && typeof app.actions.__sessionOriginalStartMainLoop === 'function'){
      return !!app.actions.__sessionOriginalStartMainLoop(reason);
    }
    if (!frame) return false;
    lp.setFrame(function(dt, ts){ frame(dt, ts); });
    lp.start();
    normalizeFlow('start-loop:' + (reason || ''), { unlockControls:true });
    return true;
  }
  function installLoopOwnership(){
    app.actions = app.actions || {};
    if (!app.actions.__sessionOriginalStartMainLoop) app.actions.__sessionOriginalStartMainLoop = app.actions.startMainLoop;
    if (!app.actions.__sessionOriginalStopMainLoop) app.actions.__sessionOriginalStopMainLoop = app.actions.stopMainLoop;

    app.actions.startMainLoop = function(reason){
      return startLoopInternal(reason || 'action');
    };
    app.actions.stopMainLoop = function(reason){
      return stopLoopInternal(reason || 'action');
    };
  }
  function installBootOwnership(){
    var originalBoot = window.boot;
    if (typeof originalBoot !== 'function') return false;
    if (originalBoot.__sessionLifecycleWrapped) return true;
    function wrappedBoot(){
      var bag = stateBag();
      bag.boot.calls += 1;
      if (bag.boot.started || window.__bootStarted) return false;
      bag.boot.scheduled = false;
      bag.boot.timerId = 0;
      bag.boot.started = true;
      bag.boot.startedAt = nowIso();
      normalizeFlow('boot-start');
      var result = originalBoot.apply(this, arguments);
      bag.boot.completed = true;
      bag.boot.completedAt = nowIso();
      bag.run.active = true;
      normalizeFlow('boot-complete', { unlockControls:true });
      return result;
    }
    wrappedBoot.__sessionLifecycleWrapped = true;
    wrappedBoot.__sessionOriginal = originalBoot;
    window.boot = wrappedBoot;
    return true;
  }
  function clearScheduledBoot(){
    var bag = stateBag();
    var id = bag.boot && bag.boot.timerId;
    if (!id) return false;
    try{
      var rt = runtime();
      if (rt && typeof rt.untrackAsync === 'function') rt.untrackAsync(id);
    }catch(_){}
    try{
      clearTimeout(id);
      clearInterval(id);
      cancelAnimationFrame(id);
    }catch(_){}
    bag.boot.timerId = 0;
    bag.boot.scheduled = false;
    return true;
  }
  function scheduleBootAfter(ms){
    installBootOwnership();
    var bag = stateBag();
    if (bag.boot.started || bag.boot.completed || bag.boot.scheduled) return false;
    var delay = Math.max(0, ms | 0);
    var rt = runtime();
    bag.boot.scheduled = true;
    bag.boot.scheduledAt = nowIso();
    var invoke = function(){
      bag.boot.timerId = 0;
      bag.boot.scheduled = false;
      try{ if (typeof window.boot === 'function') window.boot(); }catch(_){}
      try{ if (typeof showTouch === 'function') showTouch(); else document.body.classList.add('playing'); }catch(_){ try{ document.body.classList.add('playing'); }catch(__){} }
    };
    if (rt && typeof rt.trackTimeout === 'function') bag.boot.timerId = rt.trackTimeout(invoke, delay, 'session-boot');
    else bag.boot.timerId = setTimeout(invoke, delay);
    return true;
  }
  function installBootScheduler(){
    window.__startGameAfter = function(ms){
      return scheduleBootAfter(ms);
    };
  }
  function installSpawnResumeOwnership(){
    window.resumeEnemySpawns = function(delayMs){
      var rt = runtime();
      var applyResume = function(){
        app.spawnControl = app.spawnControl || { paused:false, queued:false, lastReason:'' };
        var ctrl = app.spawnControl;
        var hadQueued = !!ctrl.queued;
        ctrl.paused = false;
        ctrl.queued = false;
        document.body.classList.remove('spawns-paused');
        try{ document.dispatchEvent(new CustomEvent('enemy-spawns-resume')); }catch(_){}
        if (hadQueued){
          try{
            var domain = app.domains && app.domains.get && app.domains.get('enemySpawning');
            if (domain && typeof domain.spawn === 'function') domain.spawn('resume-flush');
          }catch(_){}
        }
        normalizeFlow('resume-enemy-spawns', { unlockControls:true });
      };
      var delay = Math.max(0, delayMs | 0);
      if (delay > 0 && rt && typeof rt.trackTimeout === 'function'){
        rt.trackTimeout(applyResume, delay, 'resume-enemy-spawns');
        return true;
      }
      if (delay > 0){
        setTimeout(applyResume, delay);
        return true;
      }
      applyResume();
      return true;
    };
  }
  function wrapRuntimeMethods(){
    var rt = runtime();
    if (!rt || rt.__sessionLifecycleWrapped) return;
    rt.__sessionLifecycleWrapped = true;

    var originalClearCombatFlow = rt.clearCombatFlow;
    var originalFinalizeRunEnd = rt.finalizeRunEnd;
    var originalResetRunState = rt.resetRunState;

    rt.clearCombatFlow = function(reason, options){
      options = options || {};
      var result = safe(originalClearCombatFlow, rt, [reason, options], false);
      hideBossIntroUi();
      write('enemySpawnsEnabled', false);
      if (options.keepTransition !== true) write('levelTransitionActive', false);
      if (options.finishIntro !== false){
        try{
          var bossFlow = app.domains && app.domains.get && app.domains.get('bossFlow');
          if (bossFlow && typeof bossFlow.finishIntro === 'function') bossFlow.finishIntro();
        }catch(_){}
      }
      clearBossFlags(false);
      normalizeFlow('runtime-clear:' + (reason || ''));
      return result;
    };

    rt.finalizeRunEnd = function(reason, options){
      options = options || {};
      var result = safe(originalFinalizeRunEnd, rt, [reason, options], false);
      stateBag().run.active = false;
      stateBag().run.finalized = true;
      bumpEpoch('runtime-finalize:' + (reason || ''));
      hideBossIntroUi();
      normalizeFlow('runtime-finalize:' + (reason || ''));
      return result;
    };

    rt.resetRunState = function(reason){
      stopLoopInternal('runtime-reset:' + (reason || ''));
      clearScheduledBoot();
      bumpEpoch('runtime-reset:' + (reason || ''));
      var result = safe(originalResetRunState, rt, [reason], false);
      write('timerStarted', false);
      write('gameEnded', false);
      write('paused', false);
      write('controlsLocked', false);
      write('enemySpawnsEnabled', false);
      write('levelTransitionActive', false);
      try{ lastTickSecond = null; }catch(_){}
      clearBossFlags(true);
      hideOverlays();
      purgeWorld('runtime-reset:' + (reason || ''));
      stateBag().run.active = false;
      stateBag().run.finalized = false;
      normalizeFlow('runtime-reset:' + (reason || ''), { unlockControls:true });
      return result;
    };
  }
  function wrapLevelFlow(){
    var domain = app.domains && app.domains.get && app.domains.get('levelFlow');
    if (!domain || domain.__sessionLifecycleWrapped) return;
    domain.__sessionLifecycleWrapped = true;
    var originalBeginTransition = domain.beginTransition;
    if (typeof originalBeginTransition === 'function'){
      domain.beginTransition = function(source, meta){
        stateBag().run.lastTransitionSource = source || 'gameplay';
        normalizeFlow('pre-transition:' + (source || 'gameplay'));
        var result = originalBeginTransition.call(this, source, meta);
        normalizeFlow('post-transition:' + (source || 'gameplay'));
        return result;
      };
      window.beginLevelTransition = function(){ return domain.beginTransition('gameplay'); };
      try{ beginLevelTransition = window.beginLevelTransition; }catch(_){}
      app.bindAction && app.bindAction('beginLevelTransition', window.beginLevelTransition, { owner:'53-session-lifecycle-domain', patched:true, sessionOwner:true });
    }
    var originalDevSkip = domain.devSkipNextLevel;
    if (typeof originalDevSkip === 'function'){
      domain.devSkipNextLevel = function(){
        normalizeFlow('dev-skip');
        var result = originalDevSkip.call(this);
        normalizeFlow('dev-skip-complete');
        return result;
      };
      window.devSkipToNextLevel = function(){ return domain.devSkipNextLevel(); };
    }
  }
  function wrapBossFlow(){
    var domain = app.domains && app.domains.get && app.domains.get('bossFlow');
    if (!domain || domain.__sessionBossWrapped) return;
    domain.__sessionBossWrapped = true;

    var originalShowIntro = domain.showIntro;
    if (typeof originalShowIntro === 'function'){
      domain.showIntro = function(cb){
        setBossStage('intro_playing', 'boss-show-intro');
        return originalShowIntro.call(this, function(){
          setBossStage('intro_complete', 'boss-intro-finished');
          normalizeFlow('boss-intro-finished', { unlockControls:true });
          if (typeof cb === 'function') cb();
        });
      };
      window.showBossIntro = function(cb){ return domain.showIntro(cb); };
      try{ showBossIntro = window.showBossIntro; }catch(_){}
    }

    var originalFinishIntro = domain.finishIntro;
    if (typeof originalFinishIntro === 'function'){
      domain.finishIntro = function(){
        var result = originalFinishIntro.apply(this, arguments);
        normalizeFlow('boss-finish-intro', { unlockControls:true });
        return result;
      };
    }

    var originalFlags = domain.flags;
    if (typeof originalFlags === 'function'){
      domain.flags = function(){
        var base = originalFlags.call(this) || {};
        base.stage = inferBossStage('boss-flags');
        return base;
      };
    }
  }
  function wrapEnemySpawning(){
    var domain = app.domains && app.domains.get && app.domains.get('enemySpawning');
    if (!domain || domain.__sessionSpawnWrapped) return;
    domain.__sessionSpawnWrapped = true;
    var originalSpawn = domain.spawn;
    if (typeof originalSpawn === 'function'){
      domain.spawn = function(reason){
        normalizeFlow('spawn-request:' + (reason || 'direct'));
        var result = originalSpawn.call(this, reason);
        inferBossStage('spawn-result:' + (reason || 'direct'));
        return result;
      };
      window.spawnEnemy = function(){ return domain.spawn('global-wrapper'); };
      try{ spawnEnemy = window.spawnEnemy; }catch(_){}
      app.bindAction && app.bindAction('spawnEnemy', window.spawnEnemy, { owner:'53-session-lifecycle-domain', patched:true, sessionOwner:true });
    }
  }
  function wrapBossAttacks(){
    var domain = app.domains && app.domains.get && app.domains.get('bossAttacks');
    if (!domain || domain.__sessionAttackWrapped) return;
    domain.__sessionAttackWrapped = true;
    var originalCanAttack = domain.canAttack;
    var originalFire = domain.fire;
    var originalJumpSlam = domain.jumpSlam;
    var originalStatus = domain.status;

    function stageAllowsAttack(e){
      if (!(e && e.isBoss && level() === 10)) return '';
      var stage = inferBossStage('boss-attack-gate');
      if (stage !== 'combat_active') return 'boss-stage-' + stage;
      return '';
    }

    if (typeof originalCanAttack === 'function'){
      domain.canAttack = function(e){
        var stageReason = stageAllowsAttack(e);
        if (stageReason) return stageReason;
        return originalCanAttack.call(this, e);
      };
    }
    if (typeof originalFire === 'function'){
      domain.fire = function(e){
        var stageReason = stageAllowsAttack(e);
        if (stageReason){
          app.debug = app.debug || {};
          app.debug.lastBossAttack = {
            at: nowIso(),
            level: level(),
            selected: '',
            blocked: true,
            reason: stageReason,
            stage: inferBossStage('boss-attack-block')
          };
          return false;
        }
        var result = originalFire.call(this, e);
        inferBossStage('boss-attack-fire');
        return result;
      };
      window.bossAttackFire = function(e){ return domain.fire(e); };
      try{ bossAttackFire = window.bossAttackFire; }catch(_){}
      app.bindAction && app.bindAction('bossAttackFire', window.bossAttackFire, { owner:'53-session-lifecycle-domain', patched:true, sessionOwner:true });
    }
    if (typeof originalJumpSlam === 'function'){
      domain.jumpSlam = function(e){
        var stageReason = stageAllowsAttack(e);
        if (stageReason){
          app.debug = app.debug || {};
          app.debug.lastBossJumpSlam = {
            at: nowIso(),
            level: level(),
            blocked: true,
            reason: stageReason,
            stage: inferBossStage('boss-jumpslam-block')
          };
          return false;
        }
        var result = originalJumpSlam.call(this, e);
        inferBossStage('boss-jumpslam-fire');
        return result;
      };
      window.__bossJumpSlamAndWave = function(e){ return domain.jumpSlam(e); };
      try{ __bossJumpSlamAndWave = window.__bossJumpSlamAndWave; }catch(_){}
      app.bindAction && app.bindAction('bossJumpSlam', window.__bossJumpSlamAndWave, { owner:'53-session-lifecycle-domain', patched:true, sessionOwner:true });
    }
    if (typeof originalStatus === 'function'){
      domain.status = function(){
        var base = originalStatus.call(this) || {};
        base.stage = inferBossStage('boss-status');
        return base;
      };
    }
  }
  function retryCurrentLevel(){
    try{
      var rt = runtime();
      if (rt && typeof rt.resetRunState === 'function') rt.resetRunState('retry-level');
      else bumpEpoch('retry-level-no-runtime');
    }catch(_){ bumpEpoch('retry-level-error'); }
    hideOverlays();

    write('gameEnded', false);
    write('paused', false);
    write('controlsLocked', false);
    write('enemySpawnsEnabled', false);
    write('levelTransitionActive', false);

    try{
      var p = read('player', null) || window.player;
      if (p){
        p.state = 'idle';
        p.deadFalling = false;
        p.vx = 0;
        p.vy = 0;
        p.invulTimer = 0;
        p.hitTimer = 0;
        p.hitIndex = 0;
        p.hitFrameTimer = 0;
      }
    }catch(_){}
    try{ if (typeof resetPerfectDodgeState === 'function') resetPerfectDodgeState(); }catch(_){}
    try{ write('shootHeld', false); }catch(_){}
    try{
      if (window.keys){
        window.keys.a = false; window.keys.d = false; window.keys.w = false; window.keys.s = false; window.keys.f = false;
      }
    }catch(_){}
    clearBossFlags(true);
    try{
      if (app.actions && typeof app.actions.setHealth === 'function'){
        app.actions.setHealth(read('healthAtLevelStart', read('health', 100)));
      } else if (typeof setHealth === 'function'){
        setHealth(read('healthAtLevelStart', read('health', 100)));
      }
    }catch(_){}
    try{ write('currentLevel', Math.max(1, level() - 1)); }catch(_){}
    try{
      if (window.beginLevelTransition) window.beginLevelTransition();
      else if (app.actions && typeof app.actions.beginLevelTransition === 'function') app.actions.beginLevelTransition();
    }catch(_){}
    try{ if (app.actions && typeof app.actions.startMainLoop === 'function') app.actions.startMainLoop('retry-level'); }catch(_){}
    try{ if (app.actions && typeof app.actions.startGameTimer === 'function') app.actions.startGameTimer(); }catch(_){}
    try{
      var targetLevel = level();
      if ((targetLevel % 10) !== 0){
        if (typeof startMusic === 'function') startMusic();
      }
    }catch(_){}
    normalizeFlow('retry-level-complete', { unlockControls:true });
    return true;
  }
  function installRetryButtons(){
    function bind(){
      var retryYes = document.getElementById('retryYes');
      var retryNo = document.getElementById('retryNo');
      var restart2 = document.getElementById('restart2');
      if (retryYes) retryYes.onclick = retryCurrentLevel;
      if (retryNo) retryNo.onclick = function(){ try{ location.reload(); }catch(_){} };
      if (restart2) restart2.onclick = function(){ try{ location.reload(); }catch(_){} };
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bind, { once:true });
    else bind();
  }

  try{ window.retryLevel = retryCurrentLevel; }catch(_){ }
  app.session.retryLevel = retryCurrentLevel;
  app.session.normalizeFlow = normalizeFlow;
  app.session.inferBossStage = inferBossStage;
  app.session.scheduleBootAfter = scheduleBootAfter;
  app.session.clearScheduledBoot = clearScheduledBoot;
  app.session.purgeWorld = purgeWorld;
  app.session.stopLoop = stopLoopInternal;
  app.session.startLoop = startLoopInternal;
  app.session.currentEpoch = currentEpoch;
  app.session.bumpEpoch = bumpEpoch;

  installLoopOwnership();
  installBootOwnership();
  installBootScheduler();
  installSpawnResumeOwnership();
  wrapRuntimeMethods();
  wrapLevelFlow();
  wrapBossFlow();
  wrapEnemySpawning();
  wrapBossAttacks();
  installRetryButtons();
  normalizeFlow('session-install', { unlockControls:true });

  if (app.debug && typeof app.debug.snapshot === 'function'){
    var originalSnapshot = app.debug.snapshot;
    app.debug.snapshot = function(){
      var base = safe(originalSnapshot, app.debug, [], {}) || {};
      base.session = {
        boot: stateBag().boot,
        run: stateBag().run,
        boss: stateBag().boss,
        epoch: currentEpoch()
      };
      return base;
    };
  }
})();