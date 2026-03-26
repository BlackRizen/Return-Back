window.GameApp && window.GameApp.registerModule && window.GameApp.registerModule('51-boss-attack-domain', {"entryMarker": "// boss attack domain", "description": "Owns the final level-10 boss attack policy and removes duplicate selector patches from scattered legacy files."});
/*__MODULE_BOUNDARY__*/
(function(){
  var app = window.GameApp; if (!app || !app.domains) return;
  var originals = app.__bossAttackOriginals = app.__bossAttackOriginals || {};

  function read(name, fallback){ return app.helpers.readState(name, fallback); }
  function safe(fn, ctx, args, fallback){ return app.helpers.safeCall(fn, ctx, args, fallback); }
  function runtime(){ return app.runtime || null; }
  function captureOriginals(){
    if (!originals.bossAttackFire && app.legacy && typeof app.legacy.bossAttackFire === 'function') originals.bossAttackFire = app.legacy.bossAttackFire;
    if (!originals.jumpSlam && app.legacy && typeof app.legacy.bossJumpSlam === 'function') originals.jumpSlam = app.legacy.bossJumpSlam;
    if (!originals.bossAttackFire && typeof window.bossAttackFire === 'function') originals.bossAttackFire = window.bossAttackFire;
    if (!originals.jumpSlam && typeof window.__bossJumpSlamAndWave === 'function') originals.jumpSlam = window.__bossJumpSlamAndWave;
    return originals;
  }
  function isBossLevelTen(e){
    return !!(e && e.isBoss && ((read('currentLevel', 1) | 0) === 10));
  }
  function hasBossEntity(e){
    if (!e || e.dead || !e.isBoss) return false;
    try{
      if (e.el && typeof e.el.isConnected !== 'undefined' && !e.el.isConnected) return false;
    }catch(_){ }
    return true;
  }
  function debugBlocked(reason, e){
    app.debug.lastBossAttack = {
      at: new Date().toISOString(),
      level: read('currentLevel', 1),
      selected: '',
      blocked: true,
      reason: reason || 'blocked',
      introDone: window.__bossIntroDone === true,
      controlsLocked: !!read('controlsLocked', false),
      enemySpawnsEnabled: !!read('enemySpawnsEnabled', false),
      boss: !!(e && e.isBoss)
    };
    return false;
  }
  function canBossAttack(e){
    var rt = runtime();
    if (!hasBossEntity(e)) return 'no-boss';
    if (read('gameEnded', false)) return 'game-ended';
    if (rt && rt.runState && rt.runState.finalized) return 'run-finalized';
    if (read('controlsLocked', false)) return 'controls-locked';
    if (!read('enemySpawnsEnabled', false)) return 'spawns-disabled';
    if (read('levelTransitionActive', false) && window.__bossIntroDone !== true) return 'transition';
    if (window.__bossSpawnPending) return 'boss-pending';
    if (rt && rt.isActionLocked && rt.isActionLocked('boss-action')) return 'boss-action-active';
    return '';
  }
  function playSpit(){
    try{
      var audio = app.domains.get('audio');
      var bag = window.Sounds || (typeof Sounds !== 'undefined' ? Sounds : null);
      var sfx = bag && (bag.spit || bag.enemyShoot);
      if (audio && typeof audio.playSound === 'function' && sfx) return audio.playSound(sfx);
      if (typeof window.playSound === 'function' && sfx) return window.playSound(sfx);
      if (sfx && sfx.play){ sfx.currentTime = 0; return sfx.play().catch(function(){}); }
    }catch(_){ }
    return false;
  }
  function fireLane(e, offY, shotHeight){
    if (!hasBossEntity(e)) return false;
    var oy = e.y;
    var prevHeight = e._shotHeight;
    if (shotHeight) e._shotHeight = shotHeight;
    e.y = oy + (offY || 0);
    try{ return typeof window.enemyShoot === 'function' ? window.enemyShoot(e, false) : false; }
    finally {
      e.y = oy;
      if (typeof prevHeight === 'undefined') delete e._shotHeight;
      else e._shotHeight = prevHeight;
    }
  }
  function fireSingle(e){
    if (!hasBossEntity(e)) return false;
    e._shotHeight = (Math.random() < 0.5 ? 'low' : 'mid');
    fireLane(e, 0, e._shotHeight);
    playSpit();
    return 'single-shot';
  }
  function fireBurst(e){
    var rt = runtime();
    if (!hasBossEntity(e)) return false;
    var DY = (typeof window.scaledSafe === 'function' ? window.scaledSafe(38) : (typeof window.scaled === 'function' ? window.scaled(38) : 38));
    var lanes = [
      { off:-DY, height:'low' },
      { off: DY, height:'low' },
      { off:  0, height:'mid' }
    ];
    var t = 0;
    lanes.forEach(function(lane){
      for (var i = 0; i < 3; i += 1){
        var later = function(targetLane){
          return function(){
            if (!hasBossEntity(e)) return false;
            if (read('gameEnded', false)) return false;
            if (rt && rt.runState && rt.runState.finalized) return false;
            return fireLane(e, targetLane.off, targetLane.height);
          };
        }(lane);
        if (rt && typeof rt.trackTimeout === 'function') rt.trackTimeout(later, t, 'boss-burst-shot');
        else setTimeout(later, t);
        t += 70;
      }
      t += 120;
    });
    playSpit();
    return 'lane-burst';
  }
  function fireJumpSlam(e){
    captureOriginals();
    if (!hasBossEntity(e)) return false;
    if (originals.jumpSlam) return safe(originals.jumpSlam, window, [e], 'jump-slam');
    if (originals.bossAttackFire) return safe(originals.bossAttackFire, window, [e], 'jump-slam-fallback');
    return false;
  }
  function chooseAttack(e){
    var rt = runtime();
    var roll = Math.random();
    var selected = null;
    var duration = 450;
    if (roll < 0.34){
      selected = 'single-shot';
      duration = 420;
    } else if (roll < 0.68){
      selected = 'lane-burst';
      duration = 980;
    } else {
      selected = 'jump-slam';
      duration = 900;
    }
    if (rt && !rt.lockAction('boss-action', duration, { selected:selected, level:read('currentLevel', 1) })){
      return debugBlocked('boss-action-active', e);
    }
    if (selected === 'single-shot') selected = fireSingle(e) || 'single-shot';
    else if (selected === 'lane-burst') selected = fireBurst(e) || 'lane-burst';
    else selected = fireJumpSlam(e) || 'jump-slam';

    app.debug.lastBossAttack = {
      at: new Date().toISOString(),
      level: read('currentLevel', 1),
      selected: selected,
      roll: roll,
      introDone: window.__bossIntroDone === true,
      controlsLocked: !!read('controlsLocked', false),
      enemySpawnsEnabled: !!read('enemySpawnsEnabled', false)
    };
    return selected;
  }
  function wrappedBossAttackFire(e){
    captureOriginals();
    if (!isBossLevelTen(e)) return originals.bossAttackFire ? safe(originals.bossAttackFire, window, [e], false) : false;
    var reason = canBossAttack(e);
    if (reason) return debugBlocked(reason, e);
    return chooseAttack(e);
  }
  function wrappedJumpSlam(e){
    captureOriginals();
    app.debug.lastBossJumpSlam = { at:new Date().toISOString(), level:read('currentLevel', 1), boss:!!(e && e.isBoss) };
    if (!hasBossEntity(e)) return false;
    if (read('gameEnded', false)) return false;
    return originals.jumpSlam ? safe(originals.jumpSlam, window, [e], false) : false;
  }

  var domain = app.domains.define('bossAttacks', {
    fire: wrappedBossAttackFire,
    jumpSlam: wrappedJumpSlam,
    choose: chooseAttack,
    canAttack: canBossAttack,
    status: function(){
      return {
        level: read('currentLevel', 1),
        introDone: window.__bossIntroDone === true,
        controlsLocked: !!read('controlsLocked', false),
        bossSpawnPending: !!window.__bossSpawnPending,
        bossActionLocked: !!(runtime() && runtime().isActionLocked && runtime().isActionLocked('boss-action')),
        lastBossAttack: app.debug.lastBossAttack || null,
        lastBossJumpSlam: app.debug.lastBossJumpSlam || null
      };
    }
  }, { owner:'51-boss-attack-domain', extracted:true });

  captureOriginals();
  window.bossAttackFire = function(e){ return domain.fire(e); };
  window.__bossJumpSlamAndWave = function(e){ return domain.jumpSlam(e); };
  try{ bossAttackFire = window.bossAttackFire; }catch(_){ }
  try{ __bossJumpSlamAndWave = window.__bossJumpSlamAndWave; }catch(_){ }
  app.bindAction('bossAttackFire', window.bossAttackFire, { owner:'51-boss-attack-domain', extracted:true, patched:true });
})();
