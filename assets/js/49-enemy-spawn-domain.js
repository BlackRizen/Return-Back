window.GameApp && window.GameApp.registerModule && window.GameApp.registerModule('49-enemy-spawn-domain', {"entryMarker": "// enemy spawn domain", "description": "Centralizes enemy spawning and projectile audio policy while preserving legacy gameplay bodies."});
/*__MODULE_BOUNDARY__*/
(function(){
  var app = window.GameApp; if (!app || !app.domains) return;
  var originals = app.__enemySpawnOriginals = app.__enemySpawnOriginals || {};

  function read(name, fallback){ return app.helpers.readState(name, fallback); }
  function safe(fn, ctx, args, fallback){ return app.helpers.safeCall(fn, ctx, args, fallback); }
  function runtime(){ return app.runtime || null; }
  function audio(){ return app.domains.get('audio'); }
  function bossFlow(){ return app.domains.get('bossFlow'); }
  function enemies(){ try{ return app.state.enemies || window.enemies || []; }catch(_){ return []; } }
  function enemyProjectiles(){ try{ return app.state.enemyProjectiles || window.enemyProjectiles || []; }catch(_){ return []; } }
  function spawnControl(){
    app.spawnControl = app.spawnControl || window.GameApp && GameApp.spawnControl || { paused:false, queued:false, lastReason:'' };
    return app.spawnControl;
  }
  function captureOriginals(){
    if (!originals.spawnEnemy && app.legacy && typeof app.legacy.spawnEnemy === 'function') originals.spawnEnemy = app.legacy.spawnEnemy;
    if (!originals.enemyShoot && app.legacy && typeof app.legacy.enemyShoot === 'function') originals.enemyShoot = app.legacy.enemyShoot;
    if (!originals.beginEnemyShoot && app.legacy && typeof app.legacy.beginEnemyShoot === 'function') originals.beginEnemyShoot = app.legacy.beginEnemyShoot;

    if (!originals.spawnEnemy && typeof window.spawnEnemy === 'function') originals.spawnEnemy = window.spawnEnemy;
    if (!originals.enemyShoot && typeof window.enemyShoot === 'function') originals.enemyShoot = window.enemyShoot;
    if (!originals.beginEnemyShoot && typeof window.beginEnemyShoot === 'function') originals.beginEnemyShoot = window.beginEnemyShoot;
    return originals;
  }
  function isBossLevel(){
    var lvl = read('currentLevel', 1) | 0;
    return lvl > 0 && lvl % 10 === 0;
  }
  function clearQueuedSpawn(reason){
    var ctrl = spawnControl();
    ctrl.queued = false;
    if (!ctrl.paused) ctrl.lastReason = reason || '';
  }
  function ensureSlimeSound(){
    try{
      if (!window.Sounds) window.Sounds = (typeof Sounds !== 'undefined' ? Sounds : {});
      if (!window.Sounds.slime){
        window.Sounds.slime = new Audio('slime.mp3');
        window.Sounds.slime.volume = 0.9;
        window.Sounds.slime.preload = 'auto';
      }
      return window.Sounds.slime;
    }catch(_){ return null; }
  }
  function playEnemyAttackSfx(e){
    var aud = audio();
    try{
      if (e && e.isBoss && isBossLevel()){
        var slime = ensureSlimeSound();
        if (aud && typeof aud.playSound === 'function' && slime) return aud.playSound(slime);
        if (typeof window.playSound === 'function' && slime) return window.playSound(slime);
        if (slime && slime.play){ slime.currentTime = 0; return slime.play().catch(function(){}); }
        return false;
      }
      var bag = window.Sounds || (typeof Sounds !== 'undefined' ? Sounds : null);
      var shot = bag && (bag.enemyShoot || bag.spit);
      if (aud && typeof aud.playSound === 'function' && shot) return aud.playSound(shot);
      if (typeof window.playSound === 'function' && shot) return window.playSound(shot);
      if (shot && shot.play){ shot.currentTime = 0; return shot.play().catch(function(){}); }
    }catch(_){ }
    return false;
  }
  function updateSpawnDebug(payload){
    app.debug.lastSpawn = {
      at: new Date().toISOString(),
      reason: payload && payload.reason || 'direct',
      level: read('currentLevel', 1),
      before: payload && typeof payload.before !== 'undefined' ? payload.before : enemies().length,
      after: payload && typeof payload.after !== 'undefined' ? payload.after : enemies().length,
      spawnedBoss: !!(payload && payload.spawned && payload.spawned.isBoss),
      enemySpawnsEnabled: !!read('enemySpawnsEnabled', false),
      transition: !!read('levelTransitionActive', false),
      held: !!(payload && payload.held),
      holdReason: payload && payload.holdReason || '',
      pendingBossEntrance: !!window.__bossSpawnPending
    };
  }
  function shouldHoldSpawn(){
    var ctrl = spawnControl();
    var rt = runtime();
    if (ctrl && ctrl.paused) return 'paused';
    if (read('gameEnded', false)) return 'game-ended';
    if (rt && rt.runState && rt.runState.finalized) return 'finalized';
    if (read('levelTransitionActive', false)) return 'transition';
    if (window.__bossSpawnPending) return 'boss-pending';
    if (isBossLevel() && window.__bossIntroDone !== true) return 'boss-intro';
    return '';
  }
  function setBossTransform(e){
    try{
      if (e && e.el) e.el.style.transform = 'translate(' + e.x + 'px, ' + e.y + 'px)';
    }catch(_){ }
  }
  function computeBossTargetX(e){
    var W = (window.innerWidth || document.documentElement.clientWidth || 1280);
    var margin = 16;
    return (e && e.dir === 'right') ? margin : Math.max(0, W - e.w - margin);
  }
  function computeBossStartX(e){
    var W = (window.innerWidth || document.documentElement.clientWidth || 1280);
    var lead = Math.max(140, e && e.w || 140);
    return (e && e.dir === 'right') ? -lead : (W + lead);
  }
  function finalizeBossEntrance(e, targetX){
    var rt = runtime();
    try{
      e.staticBoss = true;
      e.staticBossX = targetX;
      e.x = targetX;
      try{
        e.shootTimer = Math.max(0.15, (Math.random()*(0.8-0.35)+0.35) * currentDiff.enemyShootRate);
      }catch(_){ e.shootTimer = 0.6; }
      e.tpCd = 9999;
      setBossTransform(e);
    }catch(_){ }
    window.__bossSpawnPending = false;
    window.__bossEntrancePlaying = false;
    clearQueuedSpawn('');
    try{ if (rt) rt.releaseAction('boss-spawn-sequence'); }catch(_){ }
    try{ if (rt) rt.releaseAction('boss-entrance'); }catch(_){ }
  }
  function playBossEntrance(e){
    var rt = runtime();
    if (!e) {
      window.__bossSpawnPending = false;
      if (rt) rt.releaseAction('boss-spawn-sequence');
      return false;
    }
    if (rt && !rt.lockAction('boss-entrance', 5200, { reason:'boss-entrance' })){
      updateSpawnDebug({ reason:'boss-entrance-locked', before:enemies().length, after:enemies().length, held:true, holdReason:'boss-entrance-active' });
      return false;
    }
    e.__introHandled = true;
    window.__bossSpawnPending = true;
    window.__bossEntrancePlaying = true;

    var targetX = computeBossTargetX(e);
    var startX = computeBossStartX(e);

    try{ if (e && e.isBoss && typeof currentLevel !== 'undefined' && currentLevel === 10){ window.__bossInvul = true; } }catch(_){ }
    try{ if (e && e.isBoss && typeof currentLevel !== 'undefined' && currentLevel === 10){ window.__blockF = true; } }catch(_){ }

    try{
      e.staticBoss = true;
      e.staticBossX = startX;
      e.x = startX;
      setBossTransform(e);
      e.shootTimer = 999;
      e.tpCd = 9999;
    }catch(_){ }

    var dur = 2600;
    var t0 = performance.now();
    var lerp = function(a,b,t){ return a + (b-a) * t; };
    var easeOutCubic = function(t){ return 1 - Math.pow(1 - t, 3); };

    (function step(now){
      try{
        if (!e || e.dead || (rt && rt.runState && rt.runState.finalized)){
          finalizeBossEntrance(e, targetX);
          return;
        }
        var p = Math.min(1, (now - t0) / dur);
        var q = easeOutCubic(p);
        e.staticBossX = Math.round(lerp(startX, targetX, q));
        e.x = e.staticBossX;
        setBossTransform(e);
        if (p < 1){
          if (rt && typeof rt.trackFrame === 'function') rt.trackFrame(step, 'boss-entrance-step');
          else requestAnimationFrame(step);
          return;
        }
        try{ if (typeof window.showBossRoar === 'function') window.showBossRoar(e, 1000); }catch(_){ }
        try{ if (typeof window.showQuake === 'function') window.showQuake(e, 3000); }catch(_){ }
        try{ if (typeof window.pushPlayerToEdge === 'function') window.pushPlayerToEdge(e, 1000); }catch(_){ }
        if (rt && typeof rt.trackTimeout === 'function') rt.trackTimeout(function(){ finalizeBossEntrance(e, targetX); }, 2000, 'boss-entrance-finish');
        else setTimeout(function(){ finalizeBossEntrance(e, targetX); }, 2000);
      }catch(_){
        finalizeBossEntrance(e, targetX);
      }
    })(t0);
    return true;
  }
  function scheduleBossSpawn(reason){
    var rt = runtime();
    if (window.__bossSpawnPending || (rt && rt.isActionLocked && rt.isActionLocked('boss-spawn-sequence'))){
      updateSpawnDebug({ reason:reason, before:enemies().length, after:enemies().length, held:true, holdReason:'boss-pending' });
      return false;
    }
    if (rt && !rt.lockAction('boss-spawn-sequence', 6200, { reason:reason || 'boss-schedule' })){
      updateSpawnDebug({ reason:reason, before:enemies().length, after:enemies().length, held:true, holdReason:'boss-spawn-sequence-active' });
      return false;
    }
    window.__bossSpawnPending = true;
    updateSpawnDebug({ reason:reason || 'boss-schedule', before:enemies().length, after:enemies().length, held:true, holdReason:'boss-delay' });

    var later = function(){
      captureOriginals();
      if (read('gameEnded', false) || (rt && rt.runState && rt.runState.finalized)){
        window.__bossSpawnPending = false;
        if (rt) rt.releaseAction('boss-spawn-sequence');
        clearQueuedSpawn('game-ended');
        return false;
      }
      var before = enemies().length;
      var result = originals.spawnEnemy ? safe(originals.spawnEnemy, window, [], false) : false;
      var list = enemies();
      var spawned = list.length > before ? list[list.length - 1] : null;
      if (!spawned || !spawned.isBoss){
        window.__bossSpawnPending = false;
        if (rt) rt.releaseAction('boss-spawn-sequence');
        clearQueuedSpawn('');
        updateSpawnDebug({ reason:reason || 'boss-spawn', before:before, after:list.length, spawned:spawned });
        return result;
      }
      playBossEntrance(spawned);
      updateSpawnDebug({ reason:reason || 'boss-spawn', before:before, after:list.length, spawned:spawned });
      return result;
    };
    if (rt && typeof rt.trackTimeout === 'function') rt.trackTimeout(later, 3000, 'boss-spawn-delay');
    else setTimeout(later, 3000);

    return true;
  }
  function wrapSpawn(reason){
    captureOriginals();
    var holdReason = shouldHoldSpawn();
    if (holdReason){
      var ctrl = spawnControl();
      ctrl.queued = true;
      ctrl.lastReason = holdReason;
      updateSpawnDebug({ reason:reason || 'direct', before:enemies().length, after:enemies().length, held:true, holdReason:holdReason });
      return false;
    }
    clearQueuedSpawn('');
    if (isBossLevel() && enemies().length === 0){
      return scheduleBossSpawn(reason || 'boss-level');
    }
    var before = enemies().length;
    var result = originals.spawnEnemy ? safe(originals.spawnEnemy, window, [], false) : false;
    var list = enemies();
    var spawned = list.length > before ? list[list.length - 1] : null;
    updateSpawnDebug({ reason:reason || 'direct', before:before, after:list.length, spawned:spawned });
    return result;
  }
  function wrapEnemyShoot(e, playAudio){
    captureOriginals();
    var before = enemyProjectiles().length;
    var result = originals.enemyShoot ? safe(originals.enemyShoot, window, [e, false], false) : false;
    if (playAudio !== false) playEnemyAttackSfx(e);
    app.debug.lastEnemyShot = {
      at: new Date().toISOString(),
      level: read('currentLevel', 1),
      boss: !!(e && e.isBoss),
      before: before,
      after: enemyProjectiles().length,
      audio: playAudio !== false
    };
    return result;
  }
  function wrapBeginEnemyShoot(e){
    captureOriginals();
    var rt = runtime();
    if (e && e.isBoss && isBossLevel()){
      if (read('controlsLocked', false)) return false;
      if (read('gameEnded', false)) return false;
      if (rt && rt.runState && rt.runState.finalized) return false;
      if (read('levelTransitionActive', false) && window.__bossIntroDone !== true) return false;
      if (window.__bossSpawnPending) return false;
      if (rt && rt.isActionLocked && rt.isActionLocked('boss-action')) return false;
    }
    return originals.beginEnemyShoot ? safe(originals.beginEnemyShoot, window, [e], false) : false;
  }

  var domain = app.domains.define('enemySpawning', {
    spawn: wrapSpawn,
    fireProjectile: wrapEnemyShoot,
    beginAttack: wrapBeginEnemyShoot,
    clearQueuedSpawn: clearQueuedSpawn,
    status: function(){
      return {
        level: read('currentLevel', 1),
        enemySpawnsEnabled: !!read('enemySpawnsEnabled', false),
        levelTransitionActive: !!read('levelTransitionActive', false),
        enemies: enemies().length,
        enemyProjectiles: enemyProjectiles().length,
        bossSpawnPending: !!window.__bossSpawnPending,
        bossEntrancePlaying: !!window.__bossEntrancePlaying,
        lastSpawn: app.debug.lastSpawn || null,
        lastEnemyShot: app.debug.lastEnemyShot || null
      };
    }
  }, { owner:'49-enemy-spawn-domain', extracted:true });

  captureOriginals();
  window.spawnEnemy = function(){ return domain.spawn('global-wrapper'); };
  window.enemyShoot = function(e, playAudio){ return domain.fireProjectile(e, playAudio); };
  window.beginEnemyShoot = function(e){ return domain.beginAttack(e); };
  try{ spawnEnemy = window.spawnEnemy; }catch(_){ }
  try{ enemyShoot = window.enemyShoot; }catch(_){ }
  try{ beginEnemyShoot = window.beginEnemyShoot; }catch(_){ }
  app.bindAction('spawnEnemy', window.spawnEnemy, { owner:'49-enemy-spawn-domain', extracted:true, patched:true });
  app.bindAction('enemyShoot', window.enemyShoot, { owner:'49-enemy-spawn-domain', extracted:true, patched:true });
  app.bindAction('beginEnemyShoot', window.beginEnemyShoot, { owner:'49-enemy-spawn-domain', extracted:true, patched:true });
})();
