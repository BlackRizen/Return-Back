window.GameApp && window.GameApp.registerModule && window.GameApp.registerModule('20-gameplay-core', {"entryMarker": "// === Preload pentru toate sprite-urile juc\u0103torului (anti-flicker)", "description": "Gameplay setup, preload logic, timers, combat loop, enemy updates, boss interactions."});
/*__MODULE_BOUNDARY__*/
// === Preload pentru toate sprite-urile jucătorului (anti-flicker)
(function preloadPlayerSprites(){
  const srcs = new Set();

  const collect = (x) => {
    if (!x) return;
    if (Array.isArray(x)) x.forEach(collect);
    else if (typeof x === 'object') Object.values(x).forEach(collect);
    else srcs.add(x);
  };

  collect(runFrames);
  collect(idleFrames);
  collect(hitFrames);
  collect(deathFrames);
  collect(shootFrames);
  collect(jumpImage);
  collect(landImage);
  collect(crouchImage);
  collect(slideImage);

  collect(slideFrames);
    validateSlideFrames();
    // ținem referințe ca să nu fie colectate de GC
  window.__PRELOADED_PLAYER_IMGS__ = [];
  srcs.forEach(src => {
    const img = new Image();
    img.src = src;
    window.__PRELOADED_PLAYER_IMGS__.push(img);
  });
})();

    const player={
      w:scaled(220),h:scaled(220),x:120,y:0,vx:0,vy:0,
      speed:scaled(380), jumpV:scaled(950), gravity:scaled(2000),
      onGround:false, facing:'right',
      state:'idle',
      runIndex:0, runTimer:0, runFrameDuration:0.08,
      idleIndex:0, idleTimer:0, idleFrameDuration:0.22,
      landingTimer:0, landingDuration:0.08,

      crouchLock:0, crouchLockAfterLand:0.3,

      shooting:false, shootContext:'idle', shootAnimTimer:0,
      shootFrameDuration:0.06, shootAnimTotal:0.18, shootCooldown:0, shootCooldownFull:1.0,

      hitTimer:0, hitDuration:0.25,
      hitIndex:0, hitFrameTimer:0, hitFrameDuration:0.08,
      invulTimer:0,
  isInvisible: false,
  invisTimer: 0,
  invisDuration: 5,
  invisCD: 0,
  invisCooldown: 10, invulDuration:0.4,
  telekActive: false,
  telekTimer: 0,
  telekDuration: 4,
  telekCD: 0,
  telekCooldown: 7,

      knockVX:0, knockDecay:0.86, knockBoostX:460, knockBoostY:320,

      preDeathTimer:0, preDeathDelay:0.2,
      deathTimer:0, deathFrame:0, deathFrameDur:0.12,

      deadFalling:false,
      perfectDodgeWindowTimer:0,
      perfectDodgeWindowDuration:0.2,
      perfectDodgeTriggered:false,
      perfectDodgeActiveTimer:0,
      perfectDodgeGraceTimer:0,
      perfectDodgeSlowFactor:0.3,
      perfectDodgeSlowDuration:0,
      perfectDodgeFxToken:0,
      perfectDodgeAfterimageTimer:0,
      slideInstanceId:0
    , slideAnimTimer:0, slideAnimIndex:0, slideFrameDur:0.08};

    // === Idle tracking for unpredictability ===
    let __idleTimer = 0;
    let __lastPlayerX = 0;
    const playerRead = {
      dir:0, sameDirT:0, reverseBurstT:0, airT:0, campT:0,
      jumpBurstT:0, jumpCount:0, lastOnGround:true, recentVX:0, recentVY:0
    };
    function updatePlayerRead(dt){
      try{
        if(!player) return;
        const moveEps = (typeof scaled === 'function') ? scaled(34) : 34;
        const vx = player.vx || 0;
        const vy = player.vy || 0;
        const absVX = Math.abs(vx);
        const moveDir = absVX > moveEps ? Math.sign(vx) : 0;
        if(moveDir !== 0){
          if(playerRead.dir !== 0 && moveDir !== playerRead.dir){
            playerRead.reverseBurstT = Math.max(playerRead.reverseBurstT || 0, 0.30);
            playerRead.sameDirT = 0;
          }
          playerRead.dir = moveDir;
          playerRead.sameDirT = Math.min(2.6, (playerRead.sameDirT || 0) + dt);
        }else{
          playerRead.sameDirT = Math.max(0, (playerRead.sameDirT || 0) - dt * 0.9);
        }
        playerRead.reverseBurstT = Math.max(0, (playerRead.reverseBurstT || 0) - dt);

        const onGroundNow = !!player.onGround;
        const airborneNow = !onGroundNow || player.state === 'jump';
        if(airborneNow){
          playerRead.airT = Math.min(2.4, (playerRead.airT || 0) + dt);
        }else{
          playerRead.airT = Math.max(0, (playerRead.airT || 0) - dt * 1.8);
        }

        if(!playerRead.lastOnGround && !airborneNow){
          playerRead.jumpBurstT = Math.max(playerRead.jumpBurstT || 0, 0.18);
        }
        if(playerRead.lastOnGround && airborneNow && vy < -moveEps * 3.2){
          playerRead.jumpBurstT = 0.72;
          playerRead.jumpCount = Math.min(5, (playerRead.jumpCount || 0) + 1);
        }
        playerRead.jumpBurstT = Math.max(0, (playerRead.jumpBurstT || 0) - dt);
        playerRead.jumpCount = Math.max(0, (playerRead.jumpCount || 0) - dt * 0.55);
        playerRead.lastOnGround = onGroundNow;

        if(absVX < moveEps){
          playerRead.campT = Math.min(3.0, (playerRead.campT || 0) + dt);
        }else{
          playerRead.campT = Math.max(0, (playerRead.campT || 0) - dt * 1.5);
        }

        playerRead.recentVX = (playerRead.recentVX || 0) * 0.84 + vx * 0.16;
        playerRead.recentVY = (playerRead.recentVY || 0) * 0.84 + vy * 0.16;
      }catch(_){ }
    }
    function getEnemyPlayerRead(e, ctx){
      const info = ctx || getEnemyAttackContext(e);
      const dirFromPlayerToEnemy = Math.sign((info.ex || 0) - (info.px || 0)) || 1;
      const moveDir = Math.sign((playerRead.recentVX || player.vx || 0));
      const movingTowardEnemy = moveDir !== 0 && moveDir === dirFromPlayerToEnemy;
      const movingAwayFromEnemy = moveDir !== 0 && moveDir === -dirFromPlayerToEnemy;
      const playerCommitted = (playerRead.sameDirT || 0) > 0.34;
      const reversing = (playerRead.reverseBurstT || 0) > 0.02;
      const jumpBurst = (playerRead.jumpBurstT || 0) > 0.02;
      const playerCamping = __idleTimer > 0.85 || (playerRead.campT || 0) > 0.70;
      const playerAirPressure = (playerRead.airT || 0) > 0.16;
      const playerJumpingToward = jumpBurst && movingTowardEnemy;
      const likelyContinueDir = playerCommitted && !reversing;
      const sameLane = !!info.laneMid;
      return {
        moveDir,
        movingTowardEnemy,
        movingAwayFromEnemy,
        playerCommitted,
        reversing,
        jumpBurst,
        playerCamping,
        playerAirPressure,
        playerJumpingToward,
        likelyContinueDir,
        sameLane
      };
    }


    function getAdaptiveEnemyTuning(e, info){
      try{
        const domain = window.GameApp && GameApp.domains && GameApp.domains.get && GameApp.domains.get('adaptiveDirector');
        if(domain && typeof domain.isEnabled === 'function' && domain.isEnabled() && typeof domain.getEnemyTuning === 'function'){
          return domain.getEnemyTuning(e, info || getEnemyAttackContext(e)) || null;
        }
      }catch(_){}
      return null;
    }

    function pulseAdaptiveCounterCue(e, tag, mode){
      try{
        if(!e || !e.el) return false;
        const colorMap = {
          leftDodger:'rgba(98,194,255,0.95)',
          rightDodger:'rgba(98,194,255,0.95)',
          rangedKiter:'rgba(255,122,122,0.95)',
          laneRepeater:'rgba(255,190,90,0.95)',
          panicDasher:'rgba(214,125,255,0.95)',
          camping:'rgba(255,150,84,0.95)',
          shotSpammer:'rgba(120,255,182,0.95)',
          teleportWeak:'rgba(255,116,226,0.95)',
          teleportStrong:'rgba(120,255,182,0.95)'
        };
        const color = mode === 'exposed' ? 'rgba(255,236,122,0.98)' : (colorMap[tag] || 'rgba(138,186,255,0.92)');
        const token = Date.now() + Math.random();
        e.__adaptiveCueToken = token;
        e.el.style.willChange = 'filter, box-shadow';
        e.el.style.filter = mode === 'exposed'
          ? 'brightness(1.18) saturate(1.18) drop-shadow(0 0 10px ' + color + ')'
          : 'drop-shadow(0 0 8px ' + color + ') saturate(1.08)';
        setTimeout(function(){
          try{
            if(!e || !e.el || e.__adaptiveCueToken !== token) return;
            e.el.style.filter = '';
          }catch(_){}
        }, mode === 'exposed' ? 650 : 420);
        try{
          if(window.GameApp && GameApp.debug){
            GameApp.debug.lastAdaptiveCounter = {
              at: new Date().toISOString(),
              tag: tag || '',
              mode: mode || 'read',
              level: (typeof currentLevel !== 'undefined' ? currentLevel : 1),
              x: Math.round(e.x || 0),
              y: Math.round(e.y || 0)
            };
          }
        }catch(_){}
        return true;
      }catch(_){}
      return false;
    }

    function enemyActionUrgency(e, ctx, pRead){
      if(!e || e.dead || e.isBoss || !player || player.isInvisible) return 0;
      const info = ctx || getEnemyAttackContext(e);
      const read = pRead || getEnemyPlayerRead(e, info);
      const gapX = info.gapX || 0;
      let urgency = 0;
      if(gapX <= scaled(220)) urgency += 0.55;
      else if(gapX <= scaled(340)) urgency += 0.34;
      else if(gapX <= scaled(500)) urgency += 0.16;
      if(info.laneTight && info.playerGrounded) urgency += 0.24;
      else if(info.laneMid) urgency += 0.12;
      if(read.playerCamping) urgency += 0.30;
      if(read.movingTowardEnemy && read.likelyContinueDir) urgency += 0.24;
      if(read.playerJumpingToward && info.laneMid) urgency += 0.22;
      if((e.comboBias || 0) > 0.08) urgency += Math.min(0.18, (e.comboBias || 0) * 0.22);
      if((e.attackLandedBias || 0) > 0.06) urgency += Math.min(0.18, (e.attackLandedBias || 0) * 0.26);
      if(info.playerHighAbove && !info.laneWide) urgency -= 0.26;
      urgency *= enemyTemperValue(e, 'aggression', 1);
      return clamp(urgency, 0, 1.45);
    }

    let health=100;
    let healthAtLevelStart = 100;
    
let healthAtLevelStartCapturedForLevel = 0;
const hpEl=document.getElementById('hp');
    const hpTextEl=document.getElementById('hpText');
    function setHealth(v){
  /* __scoreHook */ try{ if (typeof player!=='undefined' && typeof addScore==='function' && typeof window!=='undefined' && window.lastDamageSource==='projectile' && v < health) { addScore(-3, {x: player.x + player.w/2, y: player.y}); } }catch(_){ }

      if(player.state==='dead') return;
      const prev = health;
      health = clamp(v,0,100);
      hpEl.style.width = health + '%';
      hpTextEl.textContent = Math.round(health) + '%';
      if(prev>0 && health<=0 && player.state!=='predead'){
        player.state='predead';
        player.preDeathTimer = player.preDeathDelay;
        return;
      }
      if(health<=0) return;
    }

    /* ===== Overlays controle ===== */
    const overlay=document.getElementById('overlay');
    const overlayTitle=document.getElementById('overlayTitle');
    const winOv=document.getElementById('win');
    const youDiedStats = document.getElementById('youDiedStats');
    const winStats = document.getElementById('winStats');
    /* death overlay buttons */
    const retryYes = document.getElementById('retryYes');
    const retryNo  = document.getElementById('retryNo');
    function retryLevel(){
      try{ if (window.GameApp && GameApp.runtime && typeof GameApp.runtime.resetRunState === 'function') GameApp.runtime.resetRunState('retry-level'); }catch(_){}
      try{ document.getElementById('overlay').classList.remove('show'); }catch(_){}
      try{ document.getElementById('win').classList.remove('show'); }catch(_){}
      try{ hideBossHud && hideBossHud(); }catch(_){}

      gameEnded = false;
      try{ paused = false; }catch(_){}
      controlsLocked = false;

      try{ enemies.forEach(e=>{ try{ e.el && e.el.remove(); }catch(_){} }); enemies.length=0; }catch(_){}
      try{ enemyProjectiles.forEach(b=>{ try{ b.el && b.el.remove(); }catch(_){} }); enemyProjectiles.length=0; }catch(_){}
      try{ projectiles.forEach(p=>{ try{ p.el && p.el.remove(); }catch(_){}}); projectiles.length=0; }catch(_){}
      try{ coins.forEach(c=>{ try{ c.el && c.el.remove(); }catch(_){}}); coins.length=0; }catch(_){}

      try{
        player.state='idle'; player.deadFalling=false;
        player.vx=0; player.vy=0;
        player.invulTimer=0; player.hitTimer=0; player.hitIndex=0; player.hitFrameTimer=0; resetPerfectDodgeState();
      // Reset boss L10 gating flags and shooting state
      try{ window.__blockF = false; }catch(_){}
      try{ window.__fGateL10BossApplied = false; }catch(_){}
      try{ window.__bossInvul = false; }catch(_){}
      try{ shootHeld = false; keys.f=false; }catch(_){}

      }catch(_){}

      try{ setHealth(healthAtLevelStart); }catch(_){}

      try{ enemySpawnsEnabled = true; }catch(_){}
      try{ levelTransitionActive = false; }catch(_){}

      try{ currentLevel = Math.max(1, currentLevel - 1); }catch(_){}
      try{ beginLevelTransition(); }catch(_){ }
      try{
        if (window.GameApp && GameApp.actions && typeof GameApp.actions.startMainLoop === 'function') GameApp.actions.startMainLoop();
        else requestAnimationFrame(tick);
      }catch(_){ }
      try{ startGameTimer && startGameTimer(); }catch(_){ }
      // Start main BGM only for non-boss levels (not 10, 20, 30, ...)
      try{
        var __targetLevel = (typeof currentLevel === 'number' ? currentLevel : 1);
        if ((__targetLevel % 10) !== 0) { try{ startMusic && startMusic(); }catch(_){ } }
      }catch(_){ }

    }
    if (retryYes) retryYes.onclick = retryLevel;
    if (retryNo)  retryNo.onclick  = ()=>{ try{ location.reload(); }catch(_){} };
    document.getElementById('restart2').onclick = ()=>location.reload();
    addEventListener('keydown',(e)=>{ if(e.code==='KeyR' && (overlay.classList.contains('show')||winOv.classList.contains('show'))) location.reload(); });

    /* ===== Pause / Resume ===== */
    let paused = false;
    const pauseOv = document.getElementById('pause');
    const resumeBtn = document.getElementById('resumeBtn');
    function setPaused(v){
      if(gameEnded) return;
      if(!introLanded) return;
      paused = !!v;
      pauseOv.classList.toggle('show', paused);
    }
    function togglePause(){ setPaused(!paused); }
    if(resumeBtn) resumeBtn.addEventListener('click', ()=> setPaused(false));
    addEventListener('keydown', (e)=>{
      if(e.code === '__EscDisabled__'){
        if(!introLanded) return;
        const panel = document.getElementById('optionsPanel');
        if(panel.classList.contains('show')){ panel.classList.remove('show'); }
        else togglePause();
      }
    });

    /* ===== Input ===== */
    const keys={a:false,d:false,w:false,f:false,s:false,shift:false};
    let shootHeld=false;
    let controlsLocked=false;

    let shiftArmed=true;
    let inputDir=0; // -1 left, 1 right, 0 none

    addEventListener('keydown',e=>{
      if(['KeyA','KeyD','KeyW','KeyF','KeyS'].includes(e.code)) e.preventDefault();
      if(controlsLocked || paused) return;
      if(gameEnded && player.state!=='dead') return;
      if(player.state==='dead') return;
      if(e.code==='KeyA'){ if(!keys.a) player.runIndex=0; keys.a=true; inputDir=-1; if(player.state!=='slide'){ player.facing='left'; } }
      if(e.code==='KeyD'){ if(!keys.d) player.runIndex=0; keys.d=true; inputDir=1; if(player.state!=='slide'){ player.facing='right'; } }
      if(e.code==='KeyW'){
        if(player.telekActive) return;
        keys.w=true;
        if(player.onGround && player.state!=='hit' && player.state!=='predead' && player.state!=='slide'){
          if (player.state === 'crouch') exitCrouchKeepFeet();
          player.vy=-player.jumpV; player.onGround=false; player.state='jump';
          setImg(jumpImage[player.facing]);
          playSound(Sounds.jump);
        }
      }
      if(e.code==='KeyS'){
        if(player.telekActive) return;
        keys.s=true;
      }
      if((e.code==='ShiftLeft' || e.code==='ShiftRight') && !e.repeat && shiftArmed){
        if(player.telekActive) return;
        keys.shift = true;
        shiftArmed=false; tryStartSlide();
      }

      if(e.code==='KeyF'){
        if(player.telekActive) return;
        keys.f=true;
        if(window.__blockF){ return; }
        if(player.state!=='slide' && !shootHeld){ shootHeld=true; tryShoot(); }
      }
    });
    addEventListener('keyup',e=>{
      if(e.code==='KeyA') keys.a=false;
      if(!keys.d) inputDir=0; else inputDir=1; if(keys.d && player.state!=='slide') player.facing='right';
      if(e.code==='KeyA' && !keys.d && player.state!=='slide') player.facing='left';
      if(e.code==='KeyD') keys.d=false;
      if(!keys.a) inputDir=0; else inputDir=-1; if(keys.a && player.state!=='slide') player.facing='left';
      if(e.code==='KeyD' && !keys.a && player.state!=='slide') player.facing='right';
      if(e.code==='KeyW') keys.w=false;
      if(e.code==='KeyS') keys.s=false;
      
      if(e.code==='ShiftLeft'||e.code==='ShiftRight'){ keys.shift=false; shiftArmed=true; }
if(e.code==='KeyF'){ keys.f=false; shootHeld=false; }
    });

    /* ===== Touch controls ===== */
    const touch = { left:false, right:false, jump:false, fire:false };
    function bindHold(btn, prop, onDown){
      if(!btn) return;
      const down = (e)=>{ e.preventDefault(); touch[prop]=true; onDown && onDown(); };
      const up   = (e)=>{ e.preventDefault(); touch[prop]=false; };
      btn.addEventListener('touchstart', down, {passive:false});
      btn.addEventListener('touchend',   up,   {passive:false});
      btn.addEventListener('touchcancel',up,   {passive:false});
      btn.addEventListener('pointerdown',down);
      btn.addEventListener('pointerup',  up);
      btn.addEventListener('pointerleave',up);
    }
    const btnL = document.getElementById('btnLeft');
    const btnR = document.getElementById('btnRight');
    const btnJ = document.getElementById('btnJump');
    const btnF = document.getElementById('btnFire');

    bindHold(btnL,'left');
    bindHold(btnR,'right');
    bindHold(btnJ,'jump', ()=>{
      if(controlsLocked || paused) return;
      if(player.telekActive) return;
      if(player.onGround && player.state!=='hit' && player.state!=='predead'){
        if (player.state === 'crouch') exitCrouchKeepFeet();
        player.vy=-player.jumpV; player.onGround=false; player.state='jump';
        setImg(jumpImage[player.facing]); playSound(Sounds.jump);
      }
    });
    bindHold(btnF,'fire', ()=>{ if(!shootHeld){ shootHeld=true; tryShoot(); }});

    function applyTouchToKeys(){
      keys.a = keys.a || touch.left;
      keys.d = keys.d || touch.right;
      keys.f = keys.f || touch.fire;
    }

    function setImg(src, force=false){
  if (window.__spriteLocked && !force) return;
  playerImg.src = src;
}
    function setVisualOffset(py){ playerEl.style.setProperty('--imgDY', (py|0) + 'px'); }

    // === Game Over visuals when SAD frame appears ===
    function triggerGameOverVisuals(){
      try{
        if (window.__gameoverShown) return;
        window.__gameoverShown = true;

        // Play audio once
        try{
          if(!window.__gameoverAudio){
            window.__gameoverAudio = new Audio('gameover.mp3');
            window.__gameoverAudio.preload = 'auto';
            window.__gameoverAudio.volume = 1.0;
          }
          // Attempt play; ignore promise rejection
          const p = window.__gameoverAudio.play();
          if(p && typeof p.catch==='function'){ p.catch(()=>{}); }
        }catch(_){}

        // Centered gameover image
        let el = document.getElementById('gameoverBanner');
        if(!el){
          el = document.createElement('img');
          el.id = 'gameoverBanner';
          el.alt = 'Game Over';
          el.src = 'gameover.png';
          el.style.position = 'fixed';
          el.style.left = '50%';
          el.style.top = '35%';
          el.style.transform = 'translate(-50%, -50%) scale(0.5)';
          el.style.width = 'auto';
          el.style.maxWidth = 'none';
          el.style.height = 'auto';
          el.style.zIndex = '9999';
          el.style.pointerEvents = 'none';
          el.style.opacity = '0';
          el.style.transition = 'opacity 250ms ease';
          document.body.appendChild(el);
          requestAnimationFrame(()=>{ el.style.opacity = '1'; });
        }
        /* APPLY styles even if exists */
        try{
          el.style.top = '35%';
          el.style.transform = 'translate(-50%, -50%) scale(0.5)';
          el.style.width = 'auto';
          el.style.maxWidth = 'none';
        }catch(_){}
      }catch(_){}
    
        /* === Fade to black after 5s, then hard restart to start menu after +1s === */
        try{
          setTimeout(function(){
            try{
              var black = document.getElementById('blackFade');
              if (!black){
                black = document.createElement('div');
                black.id = 'blackFade';
                black.style.position = 'fixed';
                black.style.left = '0'; black.style.top = '0';
                black.style.right = '0'; black.style.bottom = '0';
                black.style.background = '#000';
                black.style.opacity = '0';
                black.style.transition = 'opacity 600ms linear';
                black.style.pointerEvents = 'none';
                black.style.zIndex = '100000';
                document.body.appendChild(black);
              }
              requestAnimationFrame(function(){ try{ black.style.opacity = '1'; }catch(_){ } });
              (function(){
                var reloaded = false;
                function go(){ if(reloaded) return; reloaded=true; try{ location.reload(); }catch(_){ location.href = location.href; } }
                try{
                  var once = function(e){
                    if (e && e.propertyName && e.propertyName !== 'opacity') return;
                    try{ black.removeEventListener('transitionend', once); }catch(_){}
                    setTimeout(go, 1000);
                  };
                  black.addEventListener('transitionend', once, {once:true});
                  setTimeout(once, 700);
                }catch(_){ setTimeout(go, 1000); }
              })();
            }catch(_){}
          }, 5000);
        }catch(_){}
}

    function clampPlayer(){ const maxX=window.innerWidth-player.w; if(player.x<0) player.x=0; if(player.x>maxX) player.x=maxX; if(player.state==='slide' && (player.x===0 || player.x===maxX)) endSlideKeepFeet(); }

function exitCrouchKeepFeet(){
  // ținem poziția tălpilor, dar folosim mereu înălțimi SCALATE
  const floor = groundY();
  const prevFeet = Math.min(floor, player.y + player.h);
  const H = scaled(220);
  player.h = H;
  player.y = prevFeet - H;
  setVisualOffset(0);
}

function perfectDodgeVisualEl(){
  try{
    if(!playerEl) return null;
    return playerEl.querySelector('img') || playerEl.firstElementChild || playerEl;
  }catch(_){ return playerEl || null; }
}
function restorePlayerStandHeightKeepFeet(){
  try{
    const floor = groundY();
    const prevFeet = Math.min(floor, player.y + player.h);
    const H = scaled(220);
    player.h = H;
    player.y = prevFeet - H;
    if(player.y + player.h > floor) player.y = floor - player.h;
    setVisualOffset(0);
  }catch(_){}
}
function spawnPerfectDodgeAfterimage(strength){
  try{
    const layer = document.getElementById('particles') || document.body;
    if(!layer || !playerEl || !playerImg) return false;
    const ghost = document.createElement('div');
    ghost.className = 'pd-afterimage';
    const alpha = Math.max(0.18, Math.min(0.72, Number(strength) || 0.46));
    ghost.style.width = Math.round(player.w || 220) + 'px';
    ghost.style.transform = 'translate(' + Math.round(player.x || 0) + 'px, ' + Math.round(player.y || 0) + 'px)';
    ghost.style.opacity = String(alpha);
    const img = document.createElement('img');
    img.src = playerImg.currentSrc || playerImg.src || '';
    try{
      img.style.transform = 'translateY(' + ((getComputedStyle(playerEl).getPropertyValue('--imgDY') || '0px').trim() || '0px') + ')';
    }catch(_){}
    ghost.appendChild(img);
    layer.appendChild(ghost);
    requestAnimationFrame(function(){
      try{
        ghost.style.opacity = '0';
        ghost.style.transform = 'translate(' + Math.round(player.x || 0) + 'px, ' + Math.round(player.y || 0) + 'px) scale(0.96)';
      }catch(_){}
    });
    setTimeout(function(){ try{ ghost.remove(); }catch(_){} }, 260);
    return true;
  }catch(_){}
  return false;
}
function phaseProjectileThroughPlayer(b){
  try{
    if(!b) return false;
    b._perfectDodged = true;
    b._perfectDodgedSlideId = player && player.slideInstanceId || 0;
    return true;
  }catch(_){}
  return false;
}
function playPerfectDodgeSlowdownSfx(){
  try{
    var a = new Audio('slowdown.mp3');
    a.preload = 'auto';
    a.volume = 0.92;
    a.playbackRate = 1;
    a.defaultPlaybackRate = 1;
    try{ a.preservesPitch = true; }catch(_){}
    try{ a.mozPreservesPitch = true; }catch(_){}
    try{ a.webkitPreservesPitch = true; }catch(_){}
    a.play && a.play().catch(function(){});
    return true;
  }catch(_){}
  return false;
}
function clearPerfectDodgeFx(){
  try{
    player.perfectDodgeFxToken = 0;
    var fxEl = perfectDodgeVisualEl();
    if(fxEl){
      fxEl.style.filter = '';
      fxEl.style.transform = '';
      fxEl.style.opacity = '';
    }
  }catch(_){}
}
function resetPerfectDodgeState(){
  try{
    player.perfectDodgeWindowTimer = 0;
    player.perfectDodgeTriggered = false;
    player.perfectDodgeActiveTimer = 0;
    player.perfectDodgeGraceTimer = 0;
    player.perfectDodgeSlowDuration = 0;
    player.perfectDodgeAfterimageTimer = 0;
  }catch(_){}
  clearPerfectDodgeFx();
}
function perfectDodgeWindowOpen(){
  return !!(player && player.state === 'slide' && !player.perfectDodgeTriggered && (player.perfectDodgeWindowTimer || 0) > 0);
}
function perfectDodgeActive(){
  return !!(player && player.state === 'slide' && ((player.perfectDodgeTriggered) || (player.perfectDodgeActiveTimer || 0) > 0 || (player.perfectDodgeGraceTimer || 0) > 0));
}
function triggerPerfectDodge(meta){
  try{
    if(!perfectDodgeWindowOpen()) return false;
    player.perfectDodgeTriggered = true;
    player.perfectDodgeWindowTimer = 0;
    var totalSlide = Math.max(0.22, Number(player.slideDuration) || 0.75);
    var remainingSlide = Math.max(0, Number(player.slideTimer) || 0);
    var slowDur = Math.min(remainingSlide, totalSlide * 0.5);
    if (!(slowDur > 0)) slowDur = Math.min(totalSlide * 0.5, 0.35);
    var graceDur = Math.max(remainingSlide, slowDur, 0.22);
    player.perfectDodgeActiveTimer = Math.max(player.perfectDodgeActiveTimer || 0, slowDur);
    player.perfectDodgeGraceTimer = Math.max(player.perfectDodgeGraceTimer || 0, graceDur);
    player.perfectDodgeSlowDuration = slowDur;
    player.invulTimer = Math.max(player.invulTimer || 0, graceDur);
    try{
      if(window.GameApp && GameApp.runtime && typeof GameApp.runtime.startSlowMotion === 'function'){
        GameApp.runtime.startSlowMotion(Math.max(0.16, Math.min(0.48, Number(player.perfectDodgeSlowFactor) || 0.3)), slowDur * 1000, 'perfect-dodge');
      }
    }catch(_){}
    try{ playPerfectDodgeSlowdownSfx(); }catch(_){}
    try{ spawnPerfectDodgeAfterimage(0.58); }catch(_){}
    try{
      var token = Date.now() + Math.random();
      player.perfectDodgeFxToken = token;
      var fxEl = perfectDodgeVisualEl();
      if(fxEl){
        fxEl.style.filter = 'brightness(1.16) saturate(1.22) drop-shadow(0 0 14px rgba(164,230,255,0.95))';
        fxEl.style.transform = 'translateZ(0) scale(1.02)';
        setTimeout(function(){
          try{
            if(!fxEl || player.perfectDodgeFxToken !== token) return;
            fxEl.style.filter = '';
            fxEl.style.transform = '';
          }catch(_){}
        }, Math.max(180, Math.round(slowDur * 1000)));
      }
    }catch(_){}
    try{
      if(window.GameApp){
        GameApp.debug = GameApp.debug || {};
        GameApp.debug.perfectDodges = (GameApp.debug.perfectDodges || 0) + 1;
        GameApp.debug.lastPerfectDodge = {
          at: new Date().toISOString(),
          level: (typeof currentLevel !== 'undefined' ? currentLevel : 1),
          kind: meta && meta.kind || '',
          source: meta && meta.source || '',
          slowDuration: Number((slowDur || 0).toFixed(3)),
          graceDuration: Number((graceDur || 0).toFixed(3))
        };
      }
    }catch(_){}
    return true;
  }catch(_){}
  return false;
}
function tryStartSlide(){
  if(player.telekActive) return;
  if(!(keys.a||keys.d)) return;
  if(player.slideCooldownTimer>0) return;
  if(player.state==='slide') return;
  if(controlsLocked || paused) return;
  if(!player.onGround) return;
  if(player.state==='hit' || player.state==='predead' || player.state==='dead') return;
  if(player.state==='crouch') return;
  const dir = (keys.a && !keys.d) ? 'left' : ((keys.d && !keys.a) ? 'right' : player.facing);
  startSlide(dir);
}
function startSlide(dir){
  resetPerfectDodgeState();
  player.slideInstanceId = (player.slideInstanceId || 0) + 1;
  player.slideAnimTimer=0; player.slideAnimIndex=0;
  const floor = groundY();
  const prevFeet = Math.min(floor, player.y + player.h);
  const H = scaled(220 * (typeof player.slideHeightFactor==='number' ? player.slideHeightFactor : 0.45));
  player.h = H;
  player.y = prevFeet - H;
  player.state = 'slide';
  try{ playSound(Sounds.slide); }catch(_){ }

  player.slideTimer = (typeof player.slideDuration==='number' ? player.slideDuration : 0.75);
  player.perfectDodgeWindowDuration = Math.max(0.12, Math.min(0.26, player.slideTimer * 0.42));
  player.perfectDodgeWindowTimer = player.perfectDodgeWindowDuration;
  player.perfectDodgeTriggered = false;
  player.perfectDodgeActiveTimer = 0;
    player.slideCooldownTimer = (typeof player.slideCooldown==='number' ? player.slideCooldown : 0.9);
player.slideDir = dir === 'left' ? 'left' : 'right';
  player.facing = player.slideDir;
  player.facing=player.slideDir; setImg(player.facing==='right' ? slideImage.right : slideImage.left);
  setVisualOffset(0);
}
function endSlideKeepFeet(){
  resetPerfectDodgeState();
  const floor = groundY();
  const prevFeet = Math.min(floor, player.y + player.h);
  if(keys.s && player.onGround && !player.telekActive){
    const Hc = scaled(220 * 0.6);
    player.h = Hc;
    player.y = prevFeet - Hc;
    player.state = 'crouch';
    setImg(player.facing==='right' ? crouchImage.right : crouchImage.left);
  } else {
    const H = scaled(220);
    player.h = H;
    player.y = prevFeet - H;
    player.state = player.onGround ? ((keys.a||keys.d) ? 'run' : 'idle') : 'jump';
  }
  /* facing settle */ if(typeof inputDir==='number'){ if(inputDir===-1) player.facing='left'; else if(inputDir===1) player.facing='right'; }
  setVisualOffset(0);
}
    function applyPhysics(dt){
      const allowPhysics = (player.state!=='dead') || (player.state==='dead' && player.deadFalling);
      if(!allowPhysics) return;

      let baseVX = 0;
      if(player.state==='slide'){
        const mult = (typeof player.slideSpeedMul==='number' ? player.slideSpeedMul : 1.8);
        const w = (typeof player.slideEaseWindow==='number' ? player.slideEaseWindow : 0.22);
        const ease = player.slideTimer < w ? Math.max(0, player.slideTimer / w) : 1;
        baseVX = (player.slideDir==='left' ? -1 : 1) * player.speed * mult * ease;
      } else if(!(player.state==='crouch' || player.state==='hit' || player.state==='predead' || player.state==='dead' || controlsLocked)){
        const left = !!keys.a, right = !!keys.d;
        let dir = 0;
        if(left && !right) dir = -1; else if(right && !left) dir = 1; else if(left && right) dir = inputDir || 0;
        if(dir === -1) baseVX -= player.speed; else if(dir === 1) baseVX += player.speed;
      }
      player.vx = baseVX + player.knockVX;
      if(controlsLocked) player.vx = 0;
      player.x += player.vx*dt;

      
      // Update idle timer based on horizontal movement
      if (Math.abs(player.x - __lastPlayerX) < 2) { __idleTimer += dt; } else { __idleTimer = 0; }
      __lastPlayerX = player.x;
      updatePlayerRead(dt);
player.knockVX *= player.knockDecay;
      if(Math.abs(player.knockVX) < 1) player.knockVX = 0;

      player.vy += player.gravity*dt;
      player.y  += player.vy*dt;

      const floor=groundY(); const bottom=player.y+player.h;
      const wasAir = !player.onGround;

      if(bottom>=floor){
        player.y=floor-player.h; player.vy=0;
        if(player.state==='dead' && player.deadFalling){
          player.deadFalling=false;
          player.deathFrame=0; player.deathTimer=player.deathFrameDur;
          setImg(deathFrames[player.facing][0]);
        } else if(wasAir && player.state!=='predead'){
          player.state='land'; player.landingTimer=player.landingDuration;
          setImg(landImage[player.facing]); playSound(Sounds.land);
          player.crouchLock = 0.3;
          if(introPlayerDropped && !introLanded){
            introLanded = true;
            playerEl.classList.remove('behind');
            playerEl.style.removeProperty('z-index');

            controlsLocked = false;
            try{ if (typeof currentLevel!=='undefined' && healthAtLevelStartCapturedForLevel !== currentLevel) { healthAtLevelStart = health; healthAtLevelStartCapturedForLevel = currentLevel; } }catch(_){ }
            setTimeout(()=>{
              enemySpawnsEnabled = true;
              if(enemies.length===0) spawnEnemy();
            }, 5000);
          }
        }
        player.onGround=true;
      } else {
        player.onGround=false;
      }
      clampPlayer();
    }

    function updateSprite(dt){
      if(player.slideCooldownTimer>0) player.slideCooldownTimer=Math.max(0, player.slideCooldownTimer-dt);
      if(player.shootCooldown>0) player.shootCooldown=Math.max(0, player.shootCooldown-dt);
      if(player.crouchLock>0)    player.crouchLock=Math.max(0, player.crouchLock-dt);

      if(player.state!=='crouch' && !player.telekActive) setVisualOffset(0);

      if(player.invulTimer>0){
        player.invulTimer = Math.max(0, player.invulTimer - dt);
        if(player.perfectDodgeTriggered || (player.perfectDodgeActiveTimer || 0) > 0 || (player.perfectDodgeGraceTimer || 0) > 0){
          playerEl.classList.remove('invul');
        }else{
          playerEl.classList.add('invul');
        }
      } else {
        playerEl.classList.remove('invul');
      }
      // cooldown ticks for invisibility
      if (player.invisCD > 0) player.invisCD = Math.max(0, player.invisCD - dt);

      // active invisibility ticks
      if (player.isInvisible){
        player.invisTimer = Math.max(0, player.invisTimer - dt);
        if (player.invisTimer === 0) endInvisibility();
      }

      if(player.state==='predead'){
        player.preDeathTimer -= dt;
        if(player.preDeathTimer<=0){ doDeath(); }
        return;
      }

      if(player.state==='dead'){
        if(player.deadFalling) return;
        player.deathTimer -= dt;
        if(player.deathTimer<=0){
          player.deathTimer = player.deathFrameDur;
          const frames = deathFrames[player.facing];
          if(player.deathFrame < frames.length-1) player.deathFrame++;
          setImg(frames[player.deathFrame]);
        }
        return;
      }

      if (player.state === 'hit') {
        player.hitTimer -= dt;
        player.hitFrameTimer -= dt;
        while (player.hitFrameTimer <= 0) {
          player.hitFrameTimer += player.hitFrameDuration;
          player.hitIndex = (player.hitIndex + 1) % hitFrames[player.facing].length;
        }
        setImg(hitFrames[player.facing][player.hitIndex]);
        if (player.hitTimer <= 0) {
          player.hitIndex = 0;
          player.state = player.onGround ? (keys.a || keys.d ? 'run' : 'idle') : 'jump';
        }
        return;
      }

      // Slide state handling
      if(player.state==='slide'){
        player.slideTimer -= dt;
        if((player.perfectDodgeWindowTimer || 0) > 0) player.perfectDodgeWindowTimer = Math.max(0, player.perfectDodgeWindowTimer - dt);
        if((player.perfectDodgeActiveTimer || 0) > 0) player.perfectDodgeActiveTimer = Math.max(0, player.perfectDodgeActiveTimer - dt);
        if((player.perfectDodgeGraceTimer || 0) > 0) player.perfectDodgeGraceTimer = Math.max(0, player.perfectDodgeGraceTimer - dt);
        if(player.perfectDodgeTriggered || (player.perfectDodgeActiveTimer || 0) > 0 || (player.perfectDodgeGraceTimer || 0) > 0){
          player.perfectDodgeAfterimageTimer = Math.max(0, (player.perfectDodgeAfterimageTimer || 0) - dt);
          if((player.perfectDodgeAfterimageTimer || 0) <= 0){
            spawnPerfectDodgeAfterimage((player.perfectDodgeActiveTimer || 0) > 0 ? 0.52 : 0.34);
            player.perfectDodgeAfterimageTimer = ((player.perfectDodgeActiveTimer || 0) > 0) ? 0.045 : 0.07;
          }
        }else{
          player.perfectDodgeAfterimageTimer = 0;
        }
        if(player.slideTimer<=0 || !player.onGround){
          endSlideKeepFeet();
        } else {
          player.facing = player.slideDir;
          player.slideAnimTimer += dt;
          const frames = (player.facing==='right') ? slideFrames.right : slideFrames.left;
          const fd = (typeof player.slideFrameDur==='number' ? player.slideFrameDur : 0.08);
          while(player.slideAnimTimer >= fd){ player.slideAnimTimer -= fd; player.slideAnimIndex = (player.slideAnimIndex+1) % frames.length; }
          const imgPath = frames[player.slideAnimIndex] || (player.facing==='right' ? slideImage.right : slideImage.left);
          setImg(imgPath);
          setVisualOffset(0);
          return;
        }
      }

      const wantCrouch = !player.telekActive && keys.s && player.onGround && player.crouchLock<=0 && !controlsLocked;
      if(wantCrouch){
        if(player.state!=='crouch'){
          const feet = player.y + player.h;
          player.h = scaled(220 * 0.6);
          player.y = feet - player.h;
          player.state='crouch';
        }
        setImg(player.facing==='right' ? crouchImage.right : crouchImage.left);
        setVisualOffset(0);
        return;
      }

      if(player.state==='land' && player.landingTimer>0){
        player.landingTimer -= dt;
        if(player.landingTimer<=0){
          if(keys.a||keys.d){ player.state='run'; player.runTimer=0; }
          else { player.state='idle'; player.idleTimer=0; }
        }
        return;
      }

      if(player.state==='crouch' && (!keys.s || !player.onGround)){
        const floor = groundY();
        const feet  = Math.min(floor, player.y + player.h);
        player.h = scaled(220);
        player.y = feet - player.h;
        player.state = player.onGround ? (keys.a||keys.d ? 'run' : 'idle') : 'jump';
        setVisualOffset(0);
      }

      if(player.shooting){
        player.shootAnimTimer -= dt;
        const ctx = player.shootContext;
        const frames = shootFrames[ctx][player.facing];
        const idx = Math.min(frames.length-1, Math.floor((player.shootAnimTotal-player.shootAnimTimer)/player.shootFrameDuration));
        setImg(frames[Math.max(0,idx)]);
        if(player.shootAnimTimer<=0) player.shooting=false;
        return;
      }

      if(!player.onGround){ player.state='jump'; setImg(jumpImage[player.facing]); if(!player.telekActive) return; }

      if((keys.a || keys.d) && !controlsLocked){
        if(player.state!=='run'){ player.state='run'; player.runIndex=0; player.runTimer=0; }
        player.runTimer += dt;
        if(player.runTimer>=player.runFrameDuration){
          player.runTimer-=player.runFrameDuration;
          player.runIndex=(player.runIndex+1)%runFrames[player.facing].length;

          if(player.onGround){
            if(player.runIndex===2) playSound(Sounds.step1);
            if(player.runIndex===5) playSound(Sounds.step2);
          }
        }
        setImg(runFrames[player.facing][player.runIndex]);
        if(!player.telekActive) return;
      }

      if(player.state!=='idle'){ player.state='idle'; player.idleIndex=0; player.idleTimer=0; }
      player.idleTimer += dt;
      if(player.idleTimer>=player.idleFrameDuration){
        player.idleTimer-=player.idleFrameDuration;
        player.idleIndex=(player.idleIndex+1)%idleFrames[player.facing].length;
      }
      setImg(idleFrames[player.facing][player.idleIndex]);
    
      // Telekinesis levitation override (late, suprascrie alte animatii cat timp abilitatea e activa sau imediat dupa explozie)
      if (player.state!=='predead' && player.state!=='dead' && player.state!=='hit') {
        if (typeof telekPostExplosionTimer === 'number' && telekPostExplosionTimer > 0) {
          const postFacing = (typeof telekPostExplosionFacing !== 'undefined' ? telekPostExplosionFacing : player.facing);
          const levitateFrame = (postFacing === 'right')
            ? 'levitate1right.png'
            : 'levitate1left.png';
          setImg(levitateFrame);
          try{ setVisualOffset(-scaled(40)); }catch(_){}
        } else if (player.telekActive) {
          const levitateFrame = (player.facing === 'right')
            ? 'levitate1right.png'
            : 'levitate1left.png';
          const phase = (typeof telekFloatPhase === 'number' ? telekFloatPhase : 0);
          const bob = Math.sin(phase * 4) * scaled(6);
          setImg(levitateFrame);
          try{ setVisualOffset(-scaled(40) + bob); }catch(_){}
        }
      }
}

    /* ===== Proiectile jucător ===== */
    const projLayer=document.getElementById('projectiles');
    const projectiles=[];
    const telekProjectiles=[];
    let telekSide = 'right';
    let telekShakeTimer = 0;
    let telekQuakeActive = false;
    let telekFloatPhase = 0;
    let telekPostExplosionTimer = 0;
    let telekPostExplosionFacing = 'right';
    let telekFallAudio = null;
    let telekAuraEl = null;
    let telekRingTimer = 0;
    let telekMindAudio = null;
    let telekTabUnlocked = false;
    let PROJ_SPEED = scaled(900), PROJ_LIFE=1.2, PROJ_SIZE=[40,56];

    function handPosition(){
      const hx = player.x + (player.facing==='right' ? player.w*0.68 : player.w*0.32);
      const hyBase = player.y + player.h*0.45;
      const hy = (player.state==='crouch') ? player.y + player.h*0.4 : hyBase;
      return {hx, hy};
    }
    function tryShoot(){
      if(controlsLocked || paused) return;
      if(player.telekActive) return;
      if(player.state==='crouch') return;
      if(player.state==='dead' || player.state==='predead' || player.shootCooldown>0 || player.shooting || player.state==='hit') return;
      const ctx = (!player.onGround) ? 'jump' : ((keys.a||keys.d) ? 'run' : 'idle');
      player.shooting = true; player.shootContext=ctx; player.shootAnimTimer=player.shootAnimTotal;
      const {hx,hy} = handPosition(); spawnProjectile(hx,hy,player.facing);
      player.shootCooldown = player.shootCooldownFull;
      playSound(Sounds.shoot);
    }
    function spawnProjectile(x,y,dir){
  const base = irand(PROJ_SIZE[0], PROJ_SIZE[1]);   // dimensiune de bază (design)
  const size = scaled(base);                         // o scalăm cu uiS
  const vx   = (dir==='right'?1:-1)*PROJ_SPEED;

  const p = {
    el: document.createElement('div'),
    x, y, vx, t:0, life:PROJ_LIFE,
    baseSize: base,               // ținem minte baza, util dacă se schimbă orientarea
    size, w: size, h: Math.round(size*0.5),
    triedTeleport:false
  };
  p.el.className='proj';
  p.el.style.width = size+'px';
  p.el.style.transform = `translate(${p.x}px, ${p.y}px)`;
  const img=document.createElement('img'); img.src='projectile.webp'; img.alt=''; p.el.appendChild(img);
  projLayer.appendChild(p.el); projectiles.push(p);
}

    function updateProjectiles(dt){
      for(let i=projectiles.length-1;i>=0;i--){
        const p=projectiles[i]; p.t+=dt; p.x+=p.vx*dt;
        p.el.style.transform=`translate(${p.x}px, ${p.y}px)`;
        if(p.t>=p.life || p.x<-180 || p.x>window.innerWidth+180){ p.el.remove(); projectiles.splice(i,1); }
      }
    }
    /* ===== Dușmani ===== */
    const enemyLayer=document.getElementById('enemies');
    const enemies=[];
    let BASE_ENEMY_HP=100;

    let ENEMY_DMG_PER_HIT=50;

    const eprojLayer=document.getElementById('enemyProjectiles');
    const enemyProjectiles=[];
    let EPROJ_SPEED = scaled(520), EPROJ_SIZE=[34,46];

    const enemyRunFrames = {
      left: [
        'enemy_run_left_1.png','enemy_run_left_2.png','enemy_run_left_3.png','enemy_run_left_4.png','enemy_run_left_5.png',
        'enemy_run_left_6.png','enemy_run_left_7.png','enemy_run_left_8.png','enemy_run_left_9.png','enemy_run_left_10.png','enemy_run_left_11.png','enemy_run_left_12.png','enemy_run_left_13.png','enemy_run_left_14.png','enemy_run_left_15.png'
      ],
      right: [
        'enemy_run_right_1.png','enemy_run_right_2.png','enemy_run_right_3.png','enemy_run_right_4.png','enemy_run_right_5.png',
        'enemy_run_right_6.png','enemy_run_right_7.png','enemy_run_right_8.png','enemy_run_right_9.png','enemy_run_right_10.png','enemy_run_right_11.png','enemy_run_right_12.png','enemy_run_right_13.png','enemy_run_right_14.png','enemy_run_right_15.png'
      ]
    };

    const enemyShootFrames = {
      left:  ['enemy_shoot_left_1.png','enemy_shoot_left_2.png','enemy_shoot_left_3.png'],
      right: ['enemy_shoot_right_1.png','enemy_shoot_right_2.png','enemy_shoot_right_3.png']
    };

    const enemyHitFrames = {
      left:  ['enemy_hit_left_1.png','enemy_hit_left_2.png'],
      right: ['enemy_hit_right_1.png','enemy_hit_right_2.png']
    };

    const bossBiteFrames = {
  left:  ['boss_bite_left_1.png','boss_bite_left_2.png','boss_bite_left_3.png','boss_bite_left_4.png'],
  right: ['boss_bite_right_1.png','boss_bite_right_2.png','boss_bite_right_3.png','boss_bite_right_4.png']
};

    function ensureEnemyAttackFxStyles(){
      try{
        if(document.getElementById('enemyAttackFxStyles')) return;
        const style = document.createElement('style');
        style.id = 'enemyAttackFxStyles';
        style.textContent = [
          '.enemy-attack-aura{position:absolute;left:50%;top:52%;width:78%;height:78%;border-radius:50%;pointer-events:none;z-index:-1;opacity:0;transform:translate(-50%,-50%) scale(.72);',
          'background:radial-gradient(circle, rgba(255,82,82,.38) 0%, rgba(255,42,42,.18) 42%, rgba(255,0,0,0) 78%);',
          'filter:blur(6px);transition:opacity .12s ease, transform .12s ease;mix-blend-mode:screen;}',
          '.enemy img.enemy-melee-glow{filter:drop-shadow(0 0 8px rgba(255,72,72,.95)) drop-shadow(0 0 18px rgba(255,18,18,.82));}',
          '.enemy img.enemy-charge-telegraph{filter:drop-shadow(0 0 10px rgba(255,96,96,1)) drop-shadow(0 0 26px rgba(255,28,28,.92));animation:enemyChargeShake 70ms infinite linear;}',
          '.enemy img.enemy-dash-rush{filter:drop-shadow(0 0 9px rgba(255,112,112,1)) drop-shadow(0 0 28px rgba(255,36,36,1));}',
          '@keyframes enemyChargeShake{0%{transform:translate(0,0)}25%{transform:translate(-2px,1px)}50%{transform:translate(2px,-1px)}75%{transform:translate(-1px,-1px)}100%{transform:translate(0,0)}}'
        ].join('');
        document.head.appendChild(style);
      }catch(_){ }
    }
    function ensureEnemyAttackAura(e){
      try{
        if(!e || !e.el || e.isBoss) return null;
        ensureEnemyAttackFxStyles();
        if(e._attackAuraEl && e._attackAuraEl.isConnected) return e._attackAuraEl;
        const aura = document.createElement('div');
        aura.className = 'enemy-attack-aura';
        e.el.style.overflow = 'visible';
        e.el.style.isolation = 'isolate';
        const sprite = e.el.firstChild;
        if(sprite && sprite.nextSibling) e.el.insertBefore(aura, sprite.nextSibling);
        else e.el.appendChild(aura);
        e._attackAuraEl = aura;
        return aura;
      }catch(_){ return null; }
    }
    function setEnemyAttackVfx(e, mode){
      try{
        if(!e || !e.el || e.isBoss) return;
        const img = e.el.firstChild;
        if(!img) return;
        const aura = ensureEnemyAttackAura(e);
        img.classList.remove('enemy-melee-glow','enemy-charge-telegraph','enemy-dash-rush');
        if(aura){
          aura.style.opacity = '0';
          aura.style.transform = 'translate(-50%, -50%) scale(0.72)';
        }
        if(mode === 'charge'){
          img.classList.add('enemy-charge-telegraph');
          if(aura){ aura.style.opacity='1'; aura.style.transform='translate(-50%, -50%) scale(1.12)'; }
        }else if(mode === 'dash'){
          img.classList.add('enemy-dash-rush');
          if(aura){ aura.style.opacity='0.92'; aura.style.transform='translate(-50%, -50%) scale(1.18)'; }
        }else if(mode === 'lunge'){
          img.classList.add('enemy-melee-glow');
          if(aura){ aura.style.opacity='0.85'; aura.style.transform='translate(-50%, -50%) scale(0.98)'; }
        }
      }catch(_){ }
    }
    function clearEnemyAttackVfx(e){
      try{
        if(!e || !e.el || e.isBoss) return;
        const img = e.el.firstChild;
        if(img && img.classList) img.classList.remove('enemy-melee-glow','enemy-charge-telegraph','enemy-dash-rush');
        if(e._attackAuraEl){
          e._attackAuraEl.style.opacity = '0';
          e._attackAuraEl.style.transform = 'translate(-50%, -50%) scale(0.72)';
        }
      }catch(_){ }
    }
    function enemyMidX(e){ return (e ? (e.x + e.w*0.5) : 0); }
    function playerMidX(){ return player ? (player.x + player.w*0.5) : 0; }
    function enemyMidY(e){ return (e ? (e.y + e.h*0.5) : 0); }
    function playerMidY(){ return player ? (player.y + player.h*0.5) : 0; }
    function getEnemyFrameBounds(e){
      const W = window.innerWidth || document.documentElement.clientWidth || 1280;
      const framePad = (e && !e.isBoss) ? scaled(28) : 0;
      const left = Math.max(0, framePad);
      const right = Math.max(left, W - (e ? e.w : 0) - framePad);
      const landingInset = (e && !e.isBoss) ? scaled(84) : 0;
      let safeLeft = Math.min(right, left + landingInset);
      let safeRight = Math.max(left, right - landingInset);
      if(safeLeft > safeRight){
        const mid = (left + right) * 0.5;
        safeLeft = mid;
        safeRight = mid;
      }
      return { W, left, right, safeLeft, safeRight, framePad, landingInset };
    }
    function enemyCrossTargetX(e, dir){
      const bounds = getEnemyFrameBounds(e);
      return dir > 0 ? bounds.safeRight : bounds.safeLeft;
    }
    function clampEnemyXInFrame(e){
      if(!e || e.isBoss) return 0;
      const bounds = getEnemyFrameBounds(e);
      if(e.x < bounds.left){
        e.x = bounds.left;
        if((e.vx || 0) < 0) e.vx = 0;
        if((e.intentVX || 0) < 0) e.intentVX = 0;
        return -1;
      }
      if(e.x > bounds.right){
        e.x = bounds.right;
        if((e.vx || 0) > 0) e.vx = 0;
        if((e.intentVX || 0) > 0) e.intentVX = 0;
        return 1;
      }
      return 0;
    }
    function getEnemyAttackContext(e){
      const bounds = getEnemyFrameBounds(e);
      const W = bounds.W;
      const ex = enemyMidX(e);
      const ey = enemyMidY(e);
      const px = playerMidX();
      const py = playerMidY();
      const dirToPlayer = (px >= ex) ? 1 : -1;
      const gapX = Math.abs(px - ex);
      const gapY = Math.abs(py - ey);
      const spaceLeft = Math.max(0, (e ? e.x : 0) - bounds.left);
      const spaceRight = Math.max(0, bounds.right - (e ? e.x : 0));
      const forwardSpace = dirToPlayer > 0 ? spaceRight : spaceLeft;
      const backSpace = dirToPlayer > 0 ? spaceLeft : spaceRight;
      const playerSpaceLeft = Math.max(0, player ? player.x : 0);
      const playerSpaceRight = Math.max(0, W - ((player ? player.x : 0) + (player ? player.w : 0)));
      const playerPinnedAtDashExit = dirToPlayer > 0 ? (playerSpaceRight <= scaled(120)) : (playerSpaceLeft <= scaled(120));
      const playerNearEdge = playerSpaceLeft <= scaled(72) || playerSpaceRight <= scaled(72);
      const enemyNearEdge = spaceLeft <= scaled(40) || spaceRight <= scaled(40);
      const playerGrounded = !!player && (player.y + player.h >= groundY() - scaled(68));
      const playerAirborne = !!player && (player.state === 'jump' || (player.y + player.h < groundY() - scaled(92)));
      const playerHighAbove = py < ey - scaled(82);
      const laneTight = gapY <= scaled(82);
      const laneMid = gapY <= scaled(132);
      const laneWide = gapY <= scaled(196);
      return {
        W, ex, ey, px, py, dirToPlayer, gapX, gapY,
        spaceLeft, spaceRight, forwardSpace, backSpace,
        playerSpaceLeft, playerSpaceRight, playerPinnedAtDashExit, playerNearEdge, enemyNearEdge,
        playerGrounded, playerAirborne, playerHighAbove, laneTight, laneMid, laneWide,
        edgeLeftX: bounds.left, edgeRightX: bounds.right, safeLeftX: bounds.safeLeft, safeRightX: bounds.safeRight
      };
    }
    function enemyGroundTargetY(e){
      return clamp(groundY() - e.h - 10, 60, groundY() - e.h - 10);
    }
    function canEnemyUseAttackKind(e, kind, ctx){
      if(!e || e.dead || e.isBoss || !player || player.isInvisible) return false;
      const info = ctx || getEnemyAttackContext(e);
      if(kind === 'dash'){
        return (e.dashAttackCD || 0) <= 0
          && info.gapX <= scaled(680)
          && info.forwardSpace >= scaled(170)
          && info.backSpace >= scaled(28)
          && info.laneWide;
      }
      if(kind === 'lunge'){
        return (e.lungeAttackCD || 0) <= 0
          && info.gapX <= scaled(390)
          && (info.laneMid || (info.playerGrounded && info.gapY <= scaled(168)));
      }
      if(kind === 'burst'){
        return (e.burstShotCD || 0) <= 0
          && info.gapX <= scaled(660)
          && info.gapY <= scaled(230)
          && info.forwardSpace >= scaled(54)
          && !info.playerHighAbove;
      }
      if(kind === 'strafe'){
        return (e.strafeShotCD || 0) <= 0
          && info.gapX >= scaled(150)
          && info.gapX <= scaled(760)
          && (info.spaceLeft >= scaled(58) || info.spaceRight >= scaled(58));
      }
      return kind === 'projectile';
    }
    function clearEnemyAttackChain(e){
      if(!e) return;
      e.chainQueued = false;
      e.chainTimer = 0;
      e.chainType = '';
      e.chainSourceKind = '';
      e.chainLanded = false;
    }
    function isEnemyExclusivePattern(pattern){
      return pattern === 'crossEvade'
        || pattern === 'jumpEvade'
        || pattern === 'edgeEscape'
        || pattern === 'stutterEvade'
        || pattern === 'dropEvade'
        || pattern === 'evade';
    }
    function enemyExclusivePatternActive(e){
      if(!e) return false;
      return isEnemyExclusivePattern(e.aiPattern || '') && (e.aiPatternTimer || 0) > 0;
    }
    function enemyExclusiveActionLabel(e){
      if(!e) return '';
      if(e.dead) return 'dead';
      if(e.isTeleporting) return 'teleport';
      if(e.entering) return 'enter';
      if(e.biting) return 'bite';
      if(e.state === 'hit') return 'hit';
      if(e.state === 'shoot') return 'shoot';
      if(e.state === 'attack') return e.attackType || 'attack';
      if(enemyExclusivePatternActive(e)) return e.aiPattern || 'pattern';
      return '';
    }
    function enemyHasExclusiveAction(e){
      return !!enemyExclusiveActionLabel(e);
    }
    function holdEnemyNextAction(e, minDelay, maxDelay){
      if(!e || e.dead) return false;
      const min = (typeof minDelay === 'number') ? minDelay : 0.12;
      const max = (typeof maxDelay === 'number') ? maxDelay : Math.max(min, 0.22);
      const nextDelay = min + Math.random() * Math.max(0, max - min);
      if(typeof e.shootTimer !== 'number' || e.shootTimer <= nextDelay){
        e.shootTimer = nextDelay;
      }
      return false;
    }
    function enterEnemyShootState(e, timerMul){
      if(!e) return false;
      clearEnemyAttackChain(e);
      e.state = 'shoot';
      rememberEnemyAttackChoice(e, 'projectile');
      e.shooting = (!player || !player.isInvisible) && (true);
      e.hasFired = false;
      e.runIndex = 0;
      e.runTimer = 0;
      e.shootAnimIndex = 0;
      e.shootAnimTimer = e.shootFrameDuration * (typeof timerMul === 'number' ? timerMul : 1);
      try{
        const tune = getAdaptiveEnemyTuning(e);
        if(tune && !e.isBoss){
          e.shootAnimTimer *= (1 + Math.max(0, Number(tune.burstDelayMix) || 0) * 0.25);
          if(tune.exposed) e.shootAnimTimer *= 1.18;
          if(tune.focusTag){
            pulseAdaptiveCounterCue(e, tune.focusTag, tune.exposed ? 'exposed' : 'read');
            e.adaptiveLastCounterTag = tune.focusTag;
            e.adaptiveLastCounterKind = 'projectile';
          }
        }
      }catch(_){}
      e.el.firstChild.src = enemyShootFrames[e.dir][0];
      applyBossSpriteOffset(e);
      return true;
    }
    function weightedEnemyAttackPick(weights){
      const entries = Object.entries(weights || {}).filter(([,v]) => typeof v === 'number' && v > 0.0001);
      if(!entries.length) return 'projectile';
      let total = 0;
      for(const [,w] of entries) total += w;
      let roll = Math.random() * total;
      for(const [key, weight] of entries){
        roll -= weight;
        if(roll <= 0) return key;
      }
      return entries[entries.length - 1][0];
    }
    const ENEMY_TEMPERAMENT_PRESETS = {
      balanced: {
        id:'balanced', aggression:1.00, projectileBias:1.00, lungeBias:1.00, dashBias:1.00,
        feintBias:1.00, chainBias:1.00, dodgeBias:1.00, tpEvadeBias:1.00, crossEvadeBias:1.00, kiteBias:1.00,
        chaseBias:1.00, retreatBias:1.00, minGapMul:1.00, maxGapMul:1.00, idlePunishBias:1.00
      },
      rushdown: {
        id:'rushdown', aggression:1.24, projectileBias:0.72, lungeBias:1.18, dashBias:1.40,
        feintBias:0.76, chainBias:1.24, dodgeBias:0.84, tpEvadeBias:0.84, crossEvadeBias:1.18, kiteBias:0.62,
        chaseBias:1.16, retreatBias:0.84, minGapMul:0.84, maxGapMul:0.88, idlePunishBias:1.16
      },
      trickster: {
        id:'trickster', aggression:1.04, projectileBias:1.04, lungeBias:1.00, dashBias:0.96,
        feintBias:1.78, chainBias:1.32, dodgeBias:1.10, tpEvadeBias:1.10, crossEvadeBias:1.36, kiteBias:1.08,
        chaseBias:0.98, retreatBias:1.04, minGapMul:0.96, maxGapMul:1.02, idlePunishBias:1.06
      },
      skirmisher: {
        id:'skirmisher', aggression:0.88, projectileBias:1.34, lungeBias:0.84, dashBias:0.74,
        feintBias:0.94, chainBias:0.86, dodgeBias:1.28, tpEvadeBias:1.16, crossEvadeBias:0.82, kiteBias:1.36,
        chaseBias:0.84, retreatBias:1.20, minGapMul:1.08, maxGapMul:1.22, idlePunishBias:0.90
      }
    };
    function chooseEnemyTemperamentProfile(){
      const roll = Math.random();
      if(roll < 0.28) return { ...ENEMY_TEMPERAMENT_PRESETS.balanced };
      if(roll < 0.56) return { ...ENEMY_TEMPERAMENT_PRESETS.rushdown };
      if(roll < 0.78) return { ...ENEMY_TEMPERAMENT_PRESETS.trickster };
      return { ...ENEMY_TEMPERAMENT_PRESETS.skirmisher };
    }
    function enemyTemperValue(e, key, fallback){
      const t = e && e.temperament;
      if(t && typeof t[key] === 'number') return t[key];
      return (typeof fallback === 'number') ? fallback : 1;
    }
    function rememberEnemyActionHistory(e, tag){
      if(!e || !tag) return;
      if(!Array.isArray(e.recentActions)) e.recentActions = [];
      e.recentActions.push(tag);
      if(e.recentActions.length > 6) e.recentActions.splice(0, e.recentActions.length - 6);
    }
    function enemyVarietyMultiplier(e, tag){
      if(!e || !tag || !Array.isArray(e.recentActions) || !e.recentActions.length) return 1;
      const hist = e.recentActions;
      let recent = 0;
      let streak = 0;
      for(let i=hist.length - 1; i>=0; i--){
        if(hist[i] === tag){
          recent++;
          if(i === hist.length - 1 || hist[i+1] === tag) streak++;
        }
      }
      let mul = 1;
      if(recent >= 1) mul *= 0.86;
      if(recent >= 2) mul *= 0.70;
      if(recent >= 3) mul *= 0.58;
      if(streak >= 1) mul *= 0.84;
      if(streak >= 2) mul *= 0.62;
      return clamp(mul, 0.26, 1);
    }
    function chooseEnemyFlowMode(e, ctx, read){
      const info = ctx || getEnemyAttackContext(e);
      const pRead = read || getEnemyPlayerRead(e, info);
      const weights = {
        stalk: 1.0 + Math.max(0, enemyTemperValue(e, 'aggression', 1) - 1) * 0.35,
        bait: 0.76 + Math.max(0, enemyTemperValue(e, 'feintBias', 1) - 1) * 0.55,
        orbit: 0.70 + Math.max(0, enemyTemperValue(e, 'kiteBias', 1) - 1) * 0.60
      };
      if(pRead.playerCamping){
        weights.bait += 0.90;
        weights.orbit += 0.22;
      }
      if(pRead.movingTowardEnemy && pRead.likelyContinueDir){
        weights.stalk += 0.58;
        weights.bait += 0.18;
      }
      if(info.gapX >= scaled(180) && info.gapX <= scaled(430) && !info.enemyNearEdge){
        weights.orbit += 0.82;
      }
      if(info.enemyNearEdge) weights.orbit *= 0.42;
      if(info.playerNearEdge) weights.stalk += 0.24;
      return weightedEnemyAttackPick(weights);
    }
    function chooseEnemyEntryStyle(e){
      const temperId = (e && e.temperament && e.temperament.id) ? e.temperament.id : 'balanced';
      const weights = { sweep:1.0, swoop:0.92, hesitate:0.78, rush:0.82 };
      if(temperId === 'rushdown'){
        weights.rush += 0.88;
        weights.sweep += 0.18;
      }else if(temperId === 'trickster'){
        weights.hesitate += 0.92;
        weights.swoop += 0.36;
      }else if(temperId === 'skirmisher'){
        weights.swoop += 0.78;
        weights.sweep += 0.20;
      }
      return weightedEnemyAttackPick(weights);
    }
    function buildEnemyEntryPath(e, minY, maxY){
      if(!e) return;
      const startY = clamp((typeof e.entrySpawnY === 'number') ? e.entrySpawnY : e.y, minY, maxY);
      let cruiseY = clamp((typeof e.entryCruiseY === 'number') ? e.entryCruiseY : ((typeof e.targetY === 'number') ? e.targetY : e.y), minY, maxY);
      const band = e.entrySpawnBand || 'mid';
      const style = e.entryStyle || 'sweep';
      const looseAmp = scaled(24) + Math.random()*scaled(18);
      const wideAmp = scaled(44) + Math.random()*scaled(28);
      let p1 = cruiseY;
      let p2 = cruiseY;
      let p3 = cruiseY;
      if(band === 'high'){
        const firstDrop = scaled(42) + Math.random()*scaled(style === 'swoop' ? 44 : 28);
        const reboundUp = scaled(28) + Math.random()*scaled(24);
        const secondDrop = scaled(34) + Math.random()*scaled(26);
        p1 = clamp(startY + firstDrop, minY + scaled(8), maxY - scaled(26));
        p2 = clamp(p1 - reboundUp, minY + scaled(10), maxY - scaled(28));
        p3 = clamp(Math.max(cruiseY, p2 + secondDrop), minY + scaled(12), maxY - scaled(18));
        cruiseY = clamp(Math.max(cruiseY, p3 - scaled(8) + rand(-scaled(10), scaled(12))), minY + scaled(10), maxY - scaled(12));
      }else if(band === 'low'){
        const rise1 = scaled(34) + Math.random()*scaled(24);
        const dip2 = scaled(24) + Math.random()*scaled(20);
        const rise3 = scaled(28) + Math.random()*scaled(24);
        p1 = clamp(startY - rise1, minY + scaled(10), maxY - scaled(18));
        p2 = clamp(p1 + dip2, minY + scaled(12), maxY - scaled(14));
        p3 = clamp(p2 - rise3, minY + scaled(10), maxY - scaled(16));
        cruiseY = clamp(cruiseY + rand(-scaled(10), scaled(10)), minY + scaled(10), maxY - scaled(10));
      }else{
        const dir = Math.random() < 0.5 ? -1 : 1;
        p1 = clamp(startY + dir * (looseAmp + Math.random()*scaled(12)), minY + scaled(8), maxY - scaled(8));
        p2 = clamp(p1 - dir * (wideAmp + Math.random()*scaled(14)), minY + scaled(8), maxY - scaled(8));
        p3 = clamp(p2 + dir * (looseAmp * (0.8 + Math.random()*0.35)), minY + scaled(8), maxY - scaled(8));
      }
      if(style === 'rush'){
        p1 = startY + (p1 - startY) * 0.72;
        p2 = p1 + (p2 - p1) * 0.68;
        p3 = p2 + (p3 - p2) * 0.62;
      }else if(style === 'hesitate'){
        p1 = startY + (p1 - startY) * 0.48;
        p2 = clamp(p2 + rand(-scaled(14), scaled(14)), minY + scaled(8), maxY - scaled(8));
        p3 = clamp(p3 + rand(-scaled(10), scaled(10)), minY + scaled(8), maxY - scaled(8));
      }else if(style === 'swoop'){
        p1 = clamp(p1 + (band === 'high' ? scaled(14) : -scaled(10)), minY + scaled(8), maxY - scaled(8));
        p2 = clamp(p2 + rand(-scaled(8), scaled(8)), minY + scaled(8), maxY - scaled(8));
      }
      e.entrySpawnY = startY;
      e.entryCruiseY = cruiseY;
      e.entryWaypoint1Y = clamp(p1, minY, maxY);
      e.entryWaypoint2Y = clamp(p2, minY, maxY);
      e.entryWaypoint3Y = clamp(p3, minY, maxY);
      e.entryPathJitterAmp = scaled(4) + Math.random()*scaled(6);
      e.entryPathBias = 0;
      e.entryPathBiasTarget = 0;
      e.entryPathBiasHold = 0;
    }
    function sampleEnemyEntryPathY(e, progress, minY, maxY){
      const pts = [
        clamp((typeof e.entrySpawnY === 'number') ? e.entrySpawnY : e.y, minY, maxY),
        clamp((typeof e.entryWaypoint1Y === 'number') ? e.entryWaypoint1Y : ((typeof e.entryCruiseY === 'number') ? e.entryCruiseY : e.y), minY, maxY),
        clamp((typeof e.entryWaypoint2Y === 'number') ? e.entryWaypoint2Y : ((typeof e.entryCruiseY === 'number') ? e.entryCruiseY : e.y), minY, maxY),
        clamp((typeof e.entryWaypoint3Y === 'number') ? e.entryWaypoint3Y : ((typeof e.entryCruiseY === 'number') ? e.entryCruiseY : e.y), minY, maxY),
        clamp((typeof e.entryCruiseY === 'number') ? e.entryCruiseY : e.y, minY, maxY)
      ];
      const segCount = pts.length - 1;
      const segPos = clamp(progress, 0, 0.999999) * segCount;
      const segIdx = Math.min(segCount - 1, Math.floor(segPos));
      const localT = segPos - segIdx;
      const easedT = localT * localT * (3 - 2 * localT);
      let desiredY = pts[segIdx] + (pts[segIdx + 1] - pts[segIdx]) * easedT;
      const flutter = Math.sin(progress * Math.PI * (4.4 + ((e.entryWaveFreq || 1.8) * 0.45)) + (e.entryPhaseOffset || 0)) * (e.entryPathJitterAmp || 0);
      desiredY += flutter;
      if(typeof e.entryPathBias === 'number') desiredY += e.entryPathBias;
      return clamp(desiredY, minY, maxY);
    }
    function detectIncomingProjectileThreat(e){
      if(!e || !Array.isArray(projectiles) || !projectiles.length) return null;
      const ex = e.x + e.w*0.5;
      const ey = e.y + e.h*0.5;
      const laneHeight = scaled(164);
      let threat = null;
      let best = Infinity;
      for(let pi=0; pi<projectiles.length; pi++){
        const p = projectiles[pi];
        if(!p) continue;
        const px = p.x + (p.w||0)*0.5;
        const py = p.y + (p.h||0)*0.5;
        const dx = px - ex;
        const dy = py - ey;
        const heading = (dx < 0 && p.vx > 0) || (dx > 0 && p.vx < 0);
        if(!heading) continue;
        const adx = Math.abs(dx);
        const ady = Math.abs(dy);
        if(adx > scaled(760) || ady > scaled(320)) continue;
        const speed = Math.max(1, Math.abs(p.vx || 1));
        const timeToImpact = adx / speed;
        const laneDanger = Math.max(0, 1 - (ady / Math.max(1, laneHeight)));
        const score = timeToImpact * 900 + ady * 0.85 + adx * 0.04 - laneDanger * 180;
        if(score < best){
          best = score;
          threat = { px, py, dx, dy, adx, ady, vx:p.vx || 0, timeToImpact, laneDanger };
        }
      }
      return threat;
    }
    function canEnemyUseCrossEvade(e, ctx, forcedDir){
      if(!e || e.dead || e.isBoss || !player || player.isInvisible) return false;
      const info = ctx || getEnemyAttackContext(e);
      const edgeReset = forcedDir === 1 || forcedDir === -1;
      if((e.crossEvadeCooldown || 0) > (edgeReset ? 0.25 : 0)) return false;
      if((e.crossEvadeRecovery || 0) > 0) return false;
      const crossDir = (forcedDir === 1 || forcedDir === -1) ? forcedDir : (info.px >= info.ex ? 1 : -1);
      const targetX = enemyCrossTargetX(e, crossDir);
      const travelNeed = Math.abs(targetX - e.x);
      if(travelNeed < scaled(edgeReset ? 96 : 120)) return false;
      if(!edgeReset && (info.gapX > scaled(560) || info.gapY > scaled(240))) return false;
      const sideRunway = crossDir > 0 ? info.spaceRight : info.spaceLeft;
      return sideRunway >= scaled(edgeReset ? 24 : 90);
    }
    function shouldEnemyCrossEvade(e, ctx, reason, read, threat, forcedDir){
      if(!canEnemyUseCrossEvade(e, ctx, forcedDir)) return false;
      const info = ctx || getEnemyAttackContext(e);
      const pRead = read || getEnemyPlayerRead(e, info);
      const why = reason || 'projectile';
      if(why === 'edgeReset'){
        const hardPinned = info.enemyNearEdge && (info.spaceLeft <= scaled(18) || info.spaceRight <= scaled(18));
        return hardPinned || (info.enemyNearEdge && (pRead.movingTowardEnemy || pRead.playerCamping || info.gapX <= scaled(180)));
      }
      if(why === 'jumpread'){
        return info.gapX <= scaled(320) && info.laneMid && (pRead.playerJumpingToward || (pRead.movingTowardEnemy && pRead.likelyContinueDir));
      }
      if(why === 'projectile'){
        if(!threat) return false;
        const immediate = (threat.timeToImpact || 99) <= 0.34;
        const soon = (threat.timeToImpact || 99) <= 0.52;
        const laneDanger = (threat.laneDanger || 0) >= 0.60;
        const pressured = pRead.playerJumpingToward || (pRead.movingTowardEnemy && pRead.likelyContinueDir) || pRead.playerCamping;
        if(info.enemyNearEdge && soon) return true;
        if(immediate && laneDanger && info.gapX <= scaled(340)) return true;
        if(soon && laneDanger && pressured && info.laneMid && info.gapX <= scaled(320)) return true;
        return false;
      }
      return false;
    }
    function beginEnemyCrossEvade(e, ctx, reason, forcedDir){
      if(!e || enemyHasExclusiveAction(e) || !canEnemyUseCrossEvade(e, ctx, forcedDir)) return false;
      const info = ctx || getEnemyAttackContext(e);
      const minY = 60;
      const maxY = groundY() - e.h - 10;
      const crossDir = (forcedDir === 1 || forcedDir === -1) ? forcedDir : (info.px >= info.ex ? 1 : -1);
      const targetX = enemyCrossTargetX(e, crossDir);
      const travelNeed = Math.abs(targetX - e.x);
      const startY = clamp(e.y, minY, maxY);
      const endY = enemyGroundTargetY(e);
      const baseMidY = (startY + endY) * 0.5;
      const edgeReset = (reason === 'edgeReset');
      const apexBase = edgeReset
        ? Math.min(player.y - scaled(210), startY - scaled(170), baseMidY - scaled(110))
        : Math.min(info.py - scaled(170), startY - scaled(132), baseMidY - scaled(74));
      const apexY = clamp(apexBase, minY, Math.max(minY, maxY - scaled(edgeReset ? 132 : 120)));
      const arcLift = Math.max(scaled(edgeReset ? 132 : 110), Math.max(startY, endY) - apexY);
      const crossSpeed = clamp(Math.max(scaled(edgeReset ? 1040 : 860), travelNeed / (edgeReset ? 0.62 : 0.70)), scaled(edgeReset ? 1040 : 860), scaled(edgeReset ? 1720 : 1560));
      const duration = clamp((travelNeed / Math.max(1, crossSpeed)) + (edgeReset ? 0.30 : 0.26) + Math.random()*0.06, 0.72, edgeReset ? 1.20 : 1.28);
      e.aiPattern = 'crossEvade';
      e.aiPatternTimer = duration;
      e.crossEvadeDuration = duration;
      e.crossEvadeStartX = e.x;
      e.crossEvadeStartY = startY;
      e.crossEvadeEndY = endY;
      e.crossEvadeArcLift = arcLift;
      e.crossEvadeDesiredY = startY;
      e.crossEvadeDir = crossDir;
      e.crossEvadeTargetX = targetX;
      e.crossEvadeApexY = apexY;
      e.crossEvadeReason = reason || 'projectile';
      e.crossEvadeSpeed = crossSpeed;
      e.crossEvadeAccel = Math.max(scaled(3200), crossSpeed * 4.2);
      e.crossEvadePassedPlayer = false;
      e.crossEvadeFailsafe = Math.max(1.05, duration + 0.45);
      e.crossEvadeLoopGuard = Math.min(4, (e.crossEvadeLoopGuard || 0) + 1);
      e.crossEvadeRecovery = (edgeReset ? 1.10 : 1.45) + (e.crossEvadeLoopGuard * 0.38) + Math.random()*0.22;
      e.crossEvadeCooldown = edgeReset ? (1.15 + Math.random()*0.30) : (1.70 + Math.random()*0.60);
      e.targetY = startY;
      e.changeYTimer = Math.max(e.changeYTimer || 0, 0.20);
      e.evadeTimer = Math.max(e.evadeTimer || 0, duration);
      return true;
    }
    function enemyAttackPressure(e){
      if(!e || !player) return 0;
      const gapX = Math.abs(playerMidX() - enemyMidX(e));
      const temperAggro = enemyTemperValue(e, 'aggression', 1);
      const idlePunish = enemyTemperValue(e, 'idlePunishBias', 1);
      let pressure = 0;
      if(gapX <= scaled(220)) pressure += 0.48;
      else if(gapX <= scaled(360)) pressure += 0.32;
      else if(gapX <= scaled(520)) pressure += 0.18;
      if(__idleTimer > 0.8) pressure += Math.min(0.42, (__idleTimer - 0.8) * 0.18 * idlePunish);
      pressure += Math.min(0.32, (e.comboBias || 0) * 0.38);
      pressure += Math.min(0.24, (e.attackLandedBias || 0) * 0.30);
      if(e.lastAttackKind === 'projectile' && gapX <= scaled(420)) pressure += 0.12;
      pressure *= temperAggro;
      return clamp(pressure, 0, 1.20);
    }
    function rememberEnemyAttackChoice(e, kind){
      if(!e) return;
      const nextKind = kind || 'projectile';
      if(e.lastAttackKind === nextKind) e.attackRepeatCount = Math.min(3, (e.attackRepeatCount || 0) + 1);
      else e.attackRepeatCount = 0;
      e.lastAttackKind = nextKind;
      rememberEnemyActionHistory(e, nextKind);
      if(nextKind === 'projectile' || nextKind === 'burst' || nextKind === 'strafe'){
        e.comboBias = Math.max(0, (e.comboBias || 0) - (nextKind === 'projectile' ? 0.24 : 0.12));
      }else{
        e.comboBias = Math.min(1, (e.comboBias || 0) + (nextKind === 'dash' ? 0.58 : 0.42));
      }
    }
    function chooseEnemyAttackType(e){
      if(!e || e.isBoss || !player || player.isInvisible) return 'projectile';
      const ctx = getEnemyAttackContext(e);
      const read = getEnemyPlayerRead(e, ctx);
      const gapX = ctx.gapX;
      const temperProjectile = enemyTemperValue(e, 'projectileBias', 1);
      const temperLunge = enemyTemperValue(e, 'lungeBias', 1);
      const temperDash = enemyTemperValue(e, 'dashBias', 1);
      const temperKite = enemyTemperValue(e, 'kiteBias', 1);
      const closeGap = scaled(260);
      const midGap = scaled(500);
      const canDash = canEnemyUseAttackKind(e, 'dash', ctx);
      const canLunge = canEnemyUseAttackKind(e, 'lunge', ctx);
      const canBurst = canEnemyUseAttackKind(e, 'burst', ctx);
      const canStrafe = canEnemyUseAttackKind(e, 'strafe', ctx);
      const pressure = enemyAttackPressure(e);
      const adaptiveTune = getAdaptiveEnemyTuning(e, ctx);
      const adaptiveStrength = adaptiveTune ? Math.max(0, Number(adaptiveTune.strength) || 0) : 0;
      const adaptiveExposed = !!(adaptiveTune && adaptiveTune.exposed);
      if(adaptiveExposed && !e.isBoss && ((e.__adaptiveExposedPulseAt || 0) + 900) < Date.now()){
        e.__adaptiveExposedPulseAt = Date.now();
        pulseAdaptiveCounterCue(e, adaptiveTune.focusTag || adaptiveTune.primaryTag || '', 'exposed');
      }
      let projectileW = adaptiveExposed ? 0.88 : 1.05;
      let lungeW = 0;
      let dashW = 0;
      let burstW = 0;
      let strafeW = 0;

      if(ctx.playerHighAbove || (ctx.playerAirborne && !ctx.playerGrounded)){
        projectileW = 1.9;
        burstW = canBurst ? 1.08 : 0;
        strafeW = canStrafe ? 0.44 : 0;
      }else{
        if(read.movingTowardEnemy && read.likelyContinueDir && ctx.laneMid && gapX <= scaled(250)){
          if(canDash) return 'dash';
          if(canLunge) return 'lunge';
        }
        if(read.playerCamping && ctx.playerGrounded && ctx.laneTight && gapX <= scaled(320)){
          if(canDash && ctx.forwardSpace >= scaled(180)) return 'dash';
          if(canLunge) return 'lunge';
        }
        if(read.movingAwayFromEnemy && gapX >= scaled(260) && !ctx.enemyNearEdge){
          projectileW = 1.65;
          burstW = canBurst ? 0.94 : 0;
          strafeW = canStrafe ? 0.88 : 0;
        }

        if(gapX <= closeGap){
          projectileW = 0.18 + Math.max(0, 0.34 - pressure * 0.30);
          lungeW = canLunge ? (2.35 + pressure * 2.25) : 0;
          dashW = canDash ? (1.78 + pressure * 2.05) : 0;
          burstW = canBurst ? (0.26 + pressure * 0.38) : 0;
          strafeW = canStrafe ? 0.12 : 0;
        }else if(gapX <= midGap){
          projectileW = 0.62 + Math.max(0, 0.26 - pressure * 0.10);
          lungeW = canLunge ? (1.04 + pressure * 1.10) : 0;
          dashW = canDash ? (1.08 + pressure * 1.25) : 0;
          burstW = canBurst ? (1.06 + pressure * 0.62) : 0;
          strafeW = canStrafe ? (0.92 + pressure * 0.54) : 0;
        }else{
          projectileW = 1.85;
          lungeW = canLunge ? 0.18 : 0;
          dashW = canDash ? (0.66 + pressure * 0.44) : 0;
          burstW = canBurst ? 1.38 : 0;
          strafeW = canStrafe ? 1.26 : 0;
        }
      }

      if(ctx.laneTight && ctx.playerGrounded){
        projectileW *= 0.76;
        lungeW += canLunge ? 1.00 : 0;
        dashW += canDash ? 1.18 : 0;
        burstW += canBurst ? 0.20 : 0;
      }else if(!ctx.laneWide){
        projectileW += 0.72;
        lungeW *= 0.30;
        dashW *= 0.42;
        burstW *= 0.72;
        strafeW *= 0.62;
      }else if(!ctx.laneMid){
        projectileW += 0.32;
        lungeW *= 0.62;
        dashW *= 0.74;
        burstW += canBurst ? 0.28 : 0;
        strafeW += canStrafe ? 0.24 : 0;
      }

      if(read.playerCamping && ctx.playerGrounded){
        projectileW *= 0.64;
        lungeW += canLunge ? 0.95 : 0;
        dashW += canDash ? 1.12 : 0;
        strafeW += canStrafe ? 0.98 : 0;
      }
      if(read.movingTowardEnemy && read.likelyContinueDir && ctx.laneMid){
        projectileW *= 0.82;
        lungeW += canLunge ? 0.66 : 0;
        dashW += canDash ? 0.84 : 0;
        burstW += canBurst ? 0.12 : 0;
      }
      if(read.movingAwayFromEnemy || read.reversing){
        projectileW += 0.62;
        lungeW *= 0.72;
        dashW *= 0.78;
        burstW += canBurst ? 0.42 : 0;
        strafeW += canStrafe ? 0.54 : 0;
      }
      if(ctx.playerPinnedAtDashExit && canDash && ctx.laneMid){
        dashW += 1.30;
        projectileW *= 0.84;
      }
      if(ctx.enemyNearEdge){
        projectileW += 0.40;
        dashW *= 0.72;
        strafeW *= 0.60;
        if(ctx.playerNearEdge && canDash && ctx.laneMid) dashW += 0.54;
      }
      if(ctx.playerNearEdge && gapX <= scaled(320) && ctx.laneMid){
        lungeW += canLunge ? 0.48 : 0;
        dashW += canDash ? 0.58 : 0;
        strafeW += canStrafe ? 0.28 : 0;
      }

      if(__idleTimer > 1.15){
        const idleBoost = Math.min(0.95, 0.25 + (__idleTimer - 1.15) * 0.22);
        lungeW += canLunge ? (0.76 + idleBoost) : 0;
        dashW += canDash ? (0.92 + idleBoost * 1.00) : 0;
        burstW += canBurst ? (0.54 + idleBoost * 0.72) : 0;
        strafeW += canStrafe ? (0.40 + idleBoost * 0.66) : 0;
        projectileW *= 0.76;
      }

      const repeatPenalty = 1 / (1 + Math.max(0, e.attackRepeatCount || 0) * 1.50);
      if(e.lastAttackKind === 'projectile') projectileW *= repeatPenalty * 0.70;
      if(e.lastAttackKind === 'lunge') lungeW *= repeatPenalty * 0.54;
      if(e.lastAttackKind === 'dash') dashW *= repeatPenalty * 0.44;
      if(e.lastAttackKind === 'burst') burstW *= repeatPenalty * 0.58;
      if(e.lastAttackKind === 'strafe') strafeW *= repeatPenalty * 0.62;

      if((e.comboBias || 0) > 0.12){
        const comboBoost = Math.min(1, e.comboBias || 0);
        dashW += canDash ? comboBoost * 0.92 : 0;
        lungeW += canLunge ? comboBoost * 0.72 : 0;
        burstW += canBurst ? comboBoost * 0.22 : 0;
        projectileW *= (1 - Math.min(0.40, comboBoost * 0.34));
      }

      if(!canDash) dashW = 0;
      if(!canLunge) lungeW = 0;
      if(!canBurst) burstW = 0;
      if(!canStrafe) strafeW = 0;
      if(gapX > scaled(560)) dashW *= 0.58;
      if(gapX > scaled(360)) lungeW *= 0.48;
      if(gapX <= scaled(170) && canDash && ctx.laneMid) dashW += 0.56;
      if(ctx.forwardSpace < scaled(210)) dashW *= 0.72;
      if(ctx.backSpace < scaled(42)) dashW *= 0.80;
      if(gapX <= scaled(180)) strafeW *= 0.32;

      projectileW *= temperProjectile * enemyVarietyMultiplier(e, 'projectile');
      lungeW *= temperLunge * enemyVarietyMultiplier(e, 'lunge');
      dashW *= temperDash * enemyVarietyMultiplier(e, 'dash');
      burstW *= temperProjectile * 0.94 * enemyVarietyMultiplier(e, 'burst');
      strafeW *= temperKite * 0.98 * enemyVarietyMultiplier(e, 'strafe');

      if(adaptiveTune){
        const flankBias = Math.max(0, adaptiveTune.flankTeleportBias || 0);
        const gapBonus = Math.max(0, adaptiveTune.gapCloseBonus || 0);
        const fakeoutBonus = Math.max(0, adaptiveTune.fakeoutBonus || 0);
        const punishBonus = Math.max(0, adaptiveTune.punishRetreatBonus || 0);
        const focusTag = adaptiveTune.focusTag || adaptiveTune.primaryTag || '';
        if(adaptiveExposed){
          projectileW += 0.12;
          dashW *= 0.58;
          lungeW *= 0.64;
          burstW *= 0.62;
          strafeW *= 0.62;
        }

        if(ctx.gapX >= scaled(250)){
          dashW += gapBonus * (1.8 + adaptiveStrength * 1.2);
          lungeW += gapBonus * (1.2 + adaptiveStrength * 0.8);
          projectileW *= Math.max(0.60, 1 - gapBonus * 0.58);
        }

        if(read.movingAwayFromEnemy || read.reversing){
          burstW += punishBonus * (1.35 + adaptiveStrength * 0.9);
          strafeW += punishBonus * (1.10 + adaptiveStrength * 0.8);
          projectileW *= Math.max(0.66, 1 - punishBonus * 0.46);
        }

        if((read.playerCamping || ctx.gapX >= scaled(300)) && flankBias > 0){
          strafeW += flankBias * (1.2 + adaptiveStrength * 1.0);
          dashW += flankBias * (0.85 + adaptiveStrength * 0.75);
          projectileW *= Math.max(0.64, 1 - flankBias * 0.50);
        }

        if(fakeoutBonus > 0){
          burstW += fakeoutBonus * 0.72;
          strafeW += fakeoutBonus * 0.48;
        }

        if(focusTag === 'rangedKiter' && ctx.gapX >= scaled(300)){
          dashW += 0.42 + adaptiveStrength * 0.58;
          lungeW += 0.22 + adaptiveStrength * 0.30;
        }else if(focusTag === 'laneRepeater'){
          strafeW += 0.34 + adaptiveStrength * 0.42;
          burstW += 0.16 + adaptiveStrength * 0.18;
        }else if(focusTag === 'panicDasher'){
          burstW += 0.26 + adaptiveStrength * 0.28;
          projectileW *= 0.90;
        }else if(focusTag === 'leftDodger' || focusTag === 'rightDodger'){
          burstW += 0.18 + adaptiveStrength * 0.20;
        }else if(focusTag === 'teleportWeak' || focusTag === 'camping'){
          strafeW += 0.20 + adaptiveStrength * 0.20;
          dashW += 0.12 + adaptiveStrength * 0.14;
        }else if(focusTag === 'shotSpammer'){
          strafeW += 0.18 + adaptiveStrength * 0.18;
        }

        if(!adaptiveExposed && adaptiveStrength >= 0.22 && ctx.gapX >= scaled(320) && (gapBonus + flankBias) > 0.10){
          if(canDash && dashW >= Math.max(lungeW, burstW, projectileW * 0.72)) return 'dash';
          if(canStrafe && strafeW >= Math.max(projectileW * 0.78, burstW * 0.92)) return 'strafe';
        }
      }

      const weights = {
        projectile: Math.max(0.05, projectileW),
        burst: Math.max(0, burstW),
        strafe: Math.max(0, strafeW),
        lunge: Math.max(0, lungeW),
        dash: Math.max(0, dashW)
      };
      const ordered = Object.entries(weights).sort((a,b)=>b[1]-a[1]);
      const best = ordered[0];
      const second = ordered[1] || ['projectile', 0];
      if(best && best[1] > 0 && best[1] >= (second[1] * 1.28 + 0.22)) return best[0];
      return weightedEnemyAttackPick(weights);
    }
    function pickEnemyFeintFollowup(e, primaryKind, ctx, sourceKind){
      const info = ctx || getEnemyAttackContext(e);
      const weights = {};
      const canDash = canEnemyUseAttackKind(e, 'dash', info);
      const canLunge = canEnemyUseAttackKind(e, 'lunge', info);
      if(primaryKind === 'dash'){
        if(canLunge) weights.lunge = 1.25 + (info.gapX <= scaled(300) ? 0.6 : 0) + (info.laneTight ? 0.35 : 0);
        weights.projectile = 0.92 + (info.playerHighAbove || info.playerAirborne ? 0.65 : 0.18);
      }else if(primaryKind === 'lunge'){
        if(canDash) weights.dash = 1.15 + (info.playerPinnedAtDashExit ? 0.7 : 0) + (info.laneMid ? 0.22 : 0);
        weights.projectile = 0.84 + (info.playerHighAbove || info.playerAirborne ? 0.70 : 0.24);
      }
      if(sourceKind === 'projectile' || sourceKind === 'chain'){
        if(weights.projectile) weights.projectile *= 0.58;
      }
      return weightedEnemyAttackPick(weights);
    }
    function shouldEnemyFeintAttack(e, primaryKind, ctx, sourceKind){
      if(!e || primaryKind === 'projectile' || (e.mindGameCD || 0) > 0) return false;
      const info = ctx || getEnemyAttackContext(e);
      const pressure = Math.min(1, enemyAttackPressure(e));
      const temperFeint = enemyTemperValue(e, 'feintBias', 1);
      let chance = 0.06 + pressure * 0.10 + Math.min(0.08, e.feintBias || 0);
      if(sourceKind === 'projectile' || sourceKind === 'chain') chance += 0.07;
      if(__idleTimer > 1.0) chance += 0.06;
      if(primaryKind === 'dash'){
        if(info.playerPinnedAtDashExit) chance += 0.06;
        if(info.gapX <= scaled(240)) chance += 0.04;
      }else if(primaryKind === 'lunge'){
        if(info.gapX <= scaled(280)) chance += 0.05;
        if(info.laneTight && info.playerGrounded) chance += 0.04;
      }
      if(e.lastAttackKind === primaryKind) chance += 0.04;
      chance *= temperFeint;
      return Math.random() < Math.min(0.42, chance);
    }
    function beginEnemyFeintAttack(e, primaryKind, followKind, sourceKind){
      if(!e || e.dead || e.isBoss || !player || enemyHasExclusiveAction(e)) return false;
      const ctx = getEnemyAttackContext(e);
      const dir = ctx.dirToPlayer;
      clearEnemyAttackChain(e);
      e.state = 'attack';
      e.attackType = 'feint';
      e.attackFeintKind = primaryKind || 'lunge';
      e.attackFollowKind = followKind || 'projectile';
      e.attackSourceKind = sourceKind || '';
      e.dir = (dir > 0) ? 'right' : 'left';
      e.attackDir = dir;
      e.attackHitApplied = true;
      e.attackOriginX = e.x;
      e.attackOriginY = e.y;
      e.attackTargetY = enemyGroundTargetY(e);
      e.attackCancelX = clamp(e.x + dir * scaled(26), 0, window.innerWidth - e.w);
      if(primaryKind === 'dash'){
        e.attackPhase = 'retreat';
        e.attackTargetX = clamp(e.x - dir * scaled(54), 0, window.innerWidth - e.w);
        e.attackTimer = 0.09 + Math.random()*0.03;
      }else{
        e.attackPhase = 'charge';
        e.attackTargetX = e.x;
        e.attackTimer = 0.08 + Math.random()*0.03;
      }
      e.runTimer = 0;
      e.runIndex = 0;
      e.mindGameCD = 1.18 + Math.random()*1.15;
      setEnemyAttackVfx(e, primaryKind === 'dash' ? 'charge' : 'lunge');
      return true;
    }
    function maybeQueueEnemyAttackChain(e, sourceKind, landed){
      if(!e || e.dead || e.isBoss || !player || player.isInvisible) return false;
      if((e.chainCD || 0) > 0 || e.chainQueued || e.state === 'attack' || e.state === 'hit' || enemyHasExclusiveAction(e)) return false;
      const ctx = getEnemyAttackContext(e);
      const pressure = Math.min(1, enemyAttackPressure(e));
      const temperChain = enemyTemperValue(e, 'chainBias', 1);
      const weights = {};
      let chance = 0;
      if(sourceKind === 'projectile'){
        if(ctx.gapX > scaled(540)) return false;
        chance = 0.20 + pressure * 0.22;
        if(__idleTimer > 0.85) chance += 0.12;
        if(ctx.laneTight && ctx.playerGrounded) chance += 0.09;
        if(canEnemyUseAttackKind(e, 'lunge', ctx)) weights.lunge = 1.25 + (ctx.gapX <= scaled(300) ? 0.72 : 0) + (ctx.laneTight ? 0.44 : 0);
        if(canEnemyUseAttackKind(e, 'dash', ctx)) weights.dash = 1.10 + (ctx.playerPinnedAtDashExit ? 0.95 : 0) + (ctx.gapX > scaled(220) ? 0.36 : 0);
      }else if(sourceKind === 'lunge'){
        chance = (landed ? 0.26 : 0.17) + pressure * 0.14;
        if(canEnemyUseAttackKind(e, 'dash', ctx)) weights.dash = 1.04 + (landed ? 0.72 : 0.20) + (ctx.playerPinnedAtDashExit ? 0.50 : 0);
        weights.projectile = 0.78 + (ctx.playerHighAbove || ctx.playerAirborne ? 0.62 : 0.16);
        if(canEnemyUseAttackKind(e, 'lunge', ctx) && !landed && ctx.gapX <= scaled(240)) weights.lunge = 0.58;
      }else if(sourceKind === 'dash'){
        chance = (landed ? 0.16 : 0.11) + pressure * 0.10;
        weights.projectile = 0.92 + (ctx.playerHighAbove || ctx.playerAirborne ? 0.80 : 0.18);
        if(canEnemyUseAttackKind(e, 'lunge', ctx) && !ctx.playerHighAbove && ctx.gapX <= scaled(310)) weights.lunge = 0.64 + (landed ? 0.24 : 0);
      }else{
        return false;
      }
      if(!Object.keys(weights).length) return false;
      Object.keys(weights).forEach((key)=>{ weights[key] *= temperChain; });
      const chainType = weightedEnemyAttackPick(weights);
      if(!chainType) return false;
      chance *= temperChain;
      if(Math.random() >= Math.min(0.78, chance)){
        e.chainCD = 0.28 + Math.random()*0.46;
        return false;
      }
      e.chainQueued = true;
      e.chainType = chainType;
      e.chainSourceKind = sourceKind;
      e.chainLanded = !!landed;
      e.chainTimer = (sourceKind === 'projectile' ? 0.11 : 0.15) + Math.random()*0.20;
      e.chainCD = 0.82 + Math.random()*0.90;
      return true;
    }
    function updateEnemyAttackChain(e, dt){
      if(!e || !e.chainQueued) return false;
      if(e.dead || e.isBoss || e.isTeleporting || !player || player.isInvisible){
        clearEnemyAttackChain(e);
        return false;
      }
      if(e.state !== 'move' || enemyHasExclusiveAction(e)) return false;
      e.chainTimer = Math.max(0, (e.chainTimer || 0) - dt);
      if(e.chainTimer > 0) return false;
      const kind = e.chainType || 'projectile';
      const sourceKind = e.chainSourceKind || 'chain';
      const ctx = getEnemyAttackContext(e);
      if(kind !== 'projectile' && !canEnemyUseAttackKind(e, kind, ctx)){
        clearEnemyAttackChain(e);
        return false;
      }
      clearEnemyAttackChain(e);
      if(kind === 'projectile') return enterEnemyShootState(e, 0.58);
      return beginEnemyPatternAttack(e, kind, sourceKind);
    }
    function resetEnemyAttackState(e, shootMinMul, shootMaxMul, finishKind){
      if(!e) return;
      const endedKind = finishKind || e.attackType || '';
      const landed = !!e.attackHitApplied;
      clearEnemyAttackVfx(e);
      e.state = 'move';
      e.attackType = '';
      e.attackPhase = '';
      e.attackTimer = 0;
      e.attackDir = 0;
      e.attackHitApplied = false;
      e.attackSpeed = 0;
      e.attackTargetX = null;
      e.attackTargetY = null;
      e.attackOriginX = null;
      e.attackOriginY = null;
      e.attackFeintKind = '';
      e.attackFollowKind = '';
      e.attackSourceKind = '';
      e.attackCancelX = null;
      e.enemyInvulnerable = false;
      e.vx = 0;
      e.shooting = (!player || !player.isInvisible) && (false);
      const minMul = (typeof shootMinMul === 'number') ? shootMinMul : 1.25;
      const maxMul = (typeof shootMaxMul === 'number') ? shootMaxMul : 2.5;
      const normalMin = minMul * currentDiff.enemyShootRate;
      const normalMax = maxMul * currentDiff.enemyShootRate;
      const normalTimer = rand(normalMin, normalMax);
      const pressure = Math.min(1, enemyAttackPressure(e));
      const comboBias = Math.min(1, Math.max(0, e.comboBias || 0));
      const landedBias = Math.min(1, Math.max(0, e.attackLandedBias || 0));
      let rushBias = Math.max(comboBias, landedBias * 0.92);
      if(__idleTimer > 1.0) rushBias = Math.min(1, rushBias + Math.min(0.35, (__idleTimer - 1.0) * 0.16));
      rushBias = Math.min(1, rushBias + pressure * 0.18);
      const quickMin = Math.max(0.16, 0.24 * currentDiff.enemyShootRate);
      const quickMax = Math.max(quickMin + 0.08, 0.65 * currentDiff.enemyShootRate);
      const quickTimer = rand(quickMin, quickMax);
      e.shootTimer = normalTimer * (1 - rushBias) + quickTimer * rushBias;
      e.comboBias = Math.max(0, comboBias - 0.22);
      e.attackLandedBias = Math.max(0, landedBias - 0.40);
      if(endedKind === 'dash' || endedKind === 'lunge') maybeQueueEnemyAttackChain(e, endedKind, landed);
      else if(endedKind === 'burst' || endedKind === 'strafe') maybeQueueEnemyAttackChain(e, 'projectile', landed);
    }
    function beginEnemyDashMelee(e){
      if(!e || e.dead || e.isBoss || !player || enemyHasExclusiveAction(e)) return false;
      const ctx = getEnemyAttackContext(e);
      const bounds = getEnemyFrameBounds(e);
      const dashDir = ctx.dirToPlayer;
      const retreatDist = clamp(scaled(92) + Math.min(scaled(58), ctx.gapX * 0.14), scaled(76), scaled(150));
      const prepX = clamp(e.x - dashDir * retreatDist, bounds.left, bounds.right);
      e.state = 'attack';
      e.attackType = 'dash';
      e.enemyInvulnerable = true;
      rememberEnemyAttackChoice(e, 'dash');
      e.dir = (dashDir > 0) ? 'right' : 'left';
      e.attackPhase = 'retreat';
      e.attackTimer = (__idleTimer > 1.1 ? 0.12 : 0.16) + Math.random()*0.05;
      e.attackDir = dashDir;
      e.attackHitApplied = false;
      e.attackTargetX = prepX;
      e.attackTargetY = enemyGroundTargetY(e);
      e.attackOriginX = e.x;
      e.attackOriginY = e.y;
      e.dashAttackCD = 2.05 + Math.random()*0.80;
      e.lungeAttackCD = Math.max(e.lungeAttackCD || 0, 0.55);
      e.runTimer = 0;
      e.runIndex = 0;
      setEnemyAttackVfx(e, 'lunge');
      return true;
    }
    function beginEnemyLungeMelee(e){
      if(!e || e.dead || e.isBoss || !player || enemyHasExclusiveAction(e)) return false;
      const ctx = getEnemyAttackContext(e);
      const dashDir = ctx.dirToPlayer;
      const bounds = getEnemyFrameBounds(e);
      const startX = e.x;
      const startY = e.y;
      const leadX = clamp((player.vx || 0) * 0.16, -scaled(72), scaled(72));
      const leadY = clamp((player.vy || 0) * 0.06, -scaled(24), scaled(16));
      const lungeTargetX = clamp(player.x + leadX - (dashDir > 0 ? e.w*0.18 : -player.w*0.18), bounds.left, bounds.right);
      const minY = 60, maxY = groundY() - e.h - 10;
      const targetBiasY = ctx.playerGrounded ? rand(-16, 18) : rand(-8, 12);
      const lungeTargetY = clamp(player.y + leadY + targetBiasY, minY, maxY);
      const retreatTargetX = clamp(startX - dashDir * scaled(72), bounds.left, bounds.right);
      e.state = 'attack';
      e.attackType = 'lunge';
      rememberEnemyAttackChoice(e, 'lunge');
      e.dir = (dashDir > 0) ? 'right' : 'left';
      e.attackPhase = 'charge';
      e.attackTimer = (__idleTimer > 1.1 ? 0.10 : 0.12) + Math.random()*0.05;
      e.attackDir = dashDir;
      e.attackHitApplied = false;
      e.attackOriginX = startX;
      e.attackOriginY = startY;
      e.attackTargetX = lungeTargetX;
      e.attackTargetY = lungeTargetY;
      e.attackRetreatX = retreatTargetX;
      e.attackRetreatY = startY;
      e.lungeAttackCD = 1.28 + Math.random()*0.52;
      e.dashAttackCD = Math.max(e.dashAttackCD || 0, 0.45);
      e.runTimer = 0;
      e.runIndex = 0;
      setEnemyAttackVfx(e, 'charge');
      return true;
    }
    function enemyShootWithOffset(e, offsetY, playAudio){
      if(!e) return false;
      const oy = e.y;
      e.y = oy + (typeof offsetY === 'number' ? offsetY : 0);
      try{ enemyShoot(e, playAudio); }finally{ e.y = oy; }
      return true;
    }
    function setEnemyShootPose(e, frameIdx){
      try{
        if(!e || !e.el || !enemyShootFrames[e.dir]) return;
        const idx = clamp((frameIdx|0), 0, enemyShootFrames[e.dir].length - 1);
        e.el.firstChild.src = enemyShootFrames[e.dir][idx];
        applyBossSpriteOffset(e);
      }catch(_){ }
    }
    function beginEnemyBurstShot(e){
      if(!e || e.dead || e.isBoss || !player || enemyHasExclusiveAction(e)) return false;
      const ctx = getEnemyAttackContext(e);
      e.state = 'attack';
      e.attackType = 'burst';
      rememberEnemyAttackChoice(e, 'burst');
      e.dir = (ctx.dirToPlayer > 0) ? 'right' : 'left';
      e.attackPhase = 'aim';
      e.attackTimer = 0.08 + Math.random()*0.04;
      e.attackDir = ctx.dirToPlayer;
      e.attackHitApplied = false;
      e.attackShotsRemaining = (Math.random() < 0.46 ? 3 : 2);
      e.attackBurstCadence = 0.09 + Math.random()*0.04;
      e.attackBurstSpread = scaled(24) + Math.random()*scaled(12);
      e.attackStrafeDir = (ctx.playerPinnedAtDashExit || ctx.enemyNearEdge)
        ? (-ctx.dirToPlayer)
        : ((Math.random() < 0.5) ? -1 : 1);
      e.attackStepX = clamp(e.x + e.attackStrafeDir * scaled(44), getEnemyFrameBounds(e).left, getEnemyFrameBounds(e).right);
      e.burstShotCD = 1.48 + Math.random()*0.72;
      e.strafeShotCD = Math.max(e.strafeShotCD || 0, 0.34);
      e.runTimer = 0;
      e.runIndex = 0;
      setEnemyAttackVfx(e, 'charge');
      setEnemyShootPose(e, 0);
      return true;
    }
    function beginEnemyStrafeShot(e){
      if(!e || e.dead || e.isBoss || !player || enemyHasExclusiveAction(e)) return false;
      const ctx = getEnemyAttackContext(e);
      const bounds = getEnemyFrameBounds(e);
      const preferDir = (ctx.spaceRight > ctx.spaceLeft) ? 1 : -1;
      const awayDir = -ctx.dirToPlayer;
      const strafeDir = ctx.enemyNearEdge ? preferDir : ((Math.random() < 0.55) ? awayDir : preferDir);
      const travel = clamp(scaled(150) + Math.min(scaled(90), ctx.gapX * 0.16), scaled(120), scaled(240));
      e.state = 'attack';
      e.attackType = 'strafe';
      rememberEnemyAttackChoice(e, 'strafe');
      e.dir = (ctx.dirToPlayer > 0) ? 'right' : 'left';
      e.attackPhase = 'windup';
      e.attackTimer = 0.10 + Math.random()*0.05;
      e.attackDir = ctx.dirToPlayer;
      e.attackHitApplied = false;
      e.attackShotsRemaining = (ctx.gapX >= scaled(340) ? 2 : 1);
      e.attackShotWindows = e.attackShotsRemaining === 2 ? [0.74, 0.34] : [0.54];
      e.attackTravelX = clamp(e.x + strafeDir * travel, bounds.left, bounds.right);
      e.attackStrafeDir = strafeDir;
      e.attackSpeed = scaled(540) + Math.random()*scaled(160);
      e.strafeShotCD = 1.72 + Math.random()*0.86;
      e.burstShotCD = Math.max(e.burstShotCD || 0, 0.42);
      e.runTimer = 0;
      e.runIndex = 0;
      setEnemyAttackVfx(e, 'charge');
      setEnemyShootPose(e, 0);
      return true;
    }
    function beginEnemyPatternAttack(e, forcedKind, sourceKind){
      if(!e || enemyHasExclusiveAction(e)) return false;
      const kind = forcedKind || chooseEnemyAttackType(e);
      const ctx = getEnemyAttackContext(e);
      const adaptiveTune = getAdaptiveEnemyTuning(e, ctx);
      if(adaptiveTune && !e.isBoss){
        if(adaptiveTune.focusTag){
          pulseAdaptiveCounterCue(e, adaptiveTune.focusTag, adaptiveTune.exposed ? 'exposed' : 'read');
        }
        e.adaptiveLastCounterTag = adaptiveTune.focusTag || adaptiveTune.primaryTag || '';
        e.adaptiveLastCounterKind = kind;
      }
      if(kind === 'dash' || kind === 'lunge'){
        if(shouldEnemyFeintAttack(e, kind, ctx, sourceKind || 'neutral')){
          const followKind = pickEnemyFeintFollowup(e, kind, ctx, sourceKind || 'neutral');
          if(followKind && followKind !== kind && (followKind === 'projectile' || canEnemyUseAttackKind(e, followKind, ctx))){
            return beginEnemyFeintAttack(e, kind, followKind, sourceKind || 'neutral');
          }
        }
      }
      clearEnemyAttackChain(e);
      if(kind === 'dash') return beginEnemyDashMelee(e);
      if(kind === 'lunge') return beginEnemyLungeMelee(e);
      if(kind === 'burst') return beginEnemyBurstShot(e);
      if(kind === 'strafe') return beginEnemyStrafeShot(e);
      return false;
    }
    function updateEnemyAttackAnimation(e, dt, frameSpeedMul){
      try{
        if(!e || !e.el || !enemyRunFrames[e.dir]) return;
        const mul = (typeof frameSpeedMul === 'number' && frameSpeedMul > 0) ? frameSpeedMul : 1;
        const baseDur = e.runFrameDuration || 0.09;
        const animDur = Math.max(0.04, baseDur / mul);
        e.runTimer = (e.runTimer || 0) + dt;
        if(e.runTimer >= animDur){
          e.runTimer -= animDur;
          e.runIndex = ((e.runIndex || 0) + 1) % enemyRunFrames[e.dir].length;
        }
        e.el.firstChild.src = enemyRunFrames[e.dir][e.runIndex || 0];
      }catch(_){ }
    }
    function updateEnemySpecialAttack(e, dt){
      if(!e || e.state !== 'attack') return false;
      const W = window.innerWidth || document.documentElement.clientWidth || 1280;
      const minY = 60;
      const maxY = groundY() - e.h - 10;
      e.attackTimer = Math.max(0, (e.attackTimer || 0) - dt);
      if(e.attackType === 'feint'){
        const feintKind = e.attackFeintKind || 'lunge';
        if(e.attackPhase === 'retreat'){
          const speed = scaled(520);
          const dx = clamp((e.attackTargetX - e.x), -speed*dt, speed*dt);
          const dy = clamp((enemyGroundTargetY(e) - e.y), -scaled(620)*dt, scaled(620)*dt);
          e.x += dx;
          clampEnemyXInFrame(e);
          e.y += dy;
          updateEnemyAttackAnimation(e, dt, 1.10);
          e.el.style.transform = `translate(${e.x}px, ${e.y}px)`;
          if(e.attackTimer <= 0 || Math.abs(e.attackTargetX - e.x) <= scaled(8)){
            e.attackPhase = 'charge';
            e.attackTimer = 0.12 + Math.random()*0.05;
            setEnemyAttackVfx(e, 'charge');
          }
          return true;
        }
        if(e.attackPhase === 'charge'){
          e.y += clamp((enemyGroundTargetY(e) - e.y), -scaled(700)*dt, scaled(700)*dt);
          updateEnemyAttackAnimation(e, dt, feintKind === 'dash' ? 1.45 : 1.28);
          e.el.style.transform = `translate(${e.x}px, ${e.y}px)`;
          if(e.attackTimer <= 0){
            e.attackPhase = 'cancel';
            e.attackTimer = 0.06 + Math.random()*0.04;
            clearEnemyAttackVfx(e);
          }
          return true;
        }
        if(e.attackPhase === 'cancel'){
          const speed = scaled(460);
          const dx = clamp(((e.attackCancelX != null ? e.attackCancelX : e.x) - e.x), -speed*dt, speed*dt);
          const dy = clamp((enemyGroundTargetY(e) - e.y), -scaled(620)*dt, scaled(620)*dt);
          e.x += dx;
          clampEnemyXInFrame(e);
          e.y += dy;
          updateEnemyAttackAnimation(e, dt, 1.0);
          e.el.style.transform = `translate(${e.x}px, ${e.y}px)`;
          if(e.attackTimer <= 0){
            const followKind = e.attackFollowKind || 'projectile';
            resetEnemyAttackState(e, 1.0, 1.8, 'feint');
            if(followKind === 'projectile') return enterEnemyShootState(e, 0.62);
            return beginEnemyPatternAttack(e, followKind, e.attackSourceKind || 'feint');
          }
          return true;
        }
      }
      if(e.attackType === 'burst'){
        if(e.attackPhase === 'aim'){
          const nudge = clamp((e.attackStepX - e.x), -scaled(260)*dt, scaled(260)*dt);
          e.x += nudge;
          clampEnemyXInFrame(e);
          e.y += clamp((enemyGroundTargetY(e) - e.y), -scaled(520)*dt, scaled(520)*dt);
          setEnemyShootPose(e, 0);
          e.el.style.transform = `translate(${e.x}px, ${e.y}px)`;
          if(e.attackTimer <= 0){
            e.attackPhase = 'burst';
            e.attackTimer = e.attackBurstCadence || 0.11;
            e.attackShotFired = false;
            setEnemyAttackVfx(e, 'lunge');
          }
          return true;
        }
        if(e.attackPhase === 'burst'){
          e.y += clamp((enemyGroundTargetY(e) - e.y), -scaled(560)*dt, scaled(560)*dt);
          const phaseDur = Math.max(0.06, e.attackBurstCadence || 0.11);
          const localProg = clamp(1 - (e.attackTimer / phaseDur), 0, 1);
          const shotFrame = localProg < 0.34 ? 0 : (localProg < 0.72 ? 1 : 2);
          setEnemyShootPose(e, shotFrame);
          const micro = scaled(46) * (0.5 + localProg * 0.9);
          e.x += e.attackStrafeDir * micro * dt;
          clampEnemyXInFrame(e);
          if(!e.attackShotFired && localProg >= 0.46){
            const spread = e.attackBurstSpread || scaled(24);
            let offY = 0;
            const index = Math.max(0, (e.attackShotsRemaining || 1) - 1);
            if(index === 1) offY = -spread * 0.45;
            else if(index === 0 && (e.attackShotsRemaining || 0) === 1) offY = spread * 0.36;
            else if(index >= 2) offY = 0;
            enemyShootWithOffset(e, offY, true);
            e.attackShotFired = true;
          }
          e.el.style.transform = `translate(${e.x}px, ${e.y}px)`;
          if(e.attackTimer <= 0){
            e.attackShotsRemaining = Math.max(0, (e.attackShotsRemaining || 0) - 1);
            if((e.attackShotsRemaining || 0) > 0){
              e.attackTimer = Math.max(0.06, (e.attackBurstCadence || 0.11) * (0.92 + Math.random()*0.10));
              e.attackShotFired = false;
            }else{
              e.attackPhase = 'recover';
              e.attackTimer = 0.10 + Math.random()*0.04;
              clearEnemyAttackVfx(e);
            }
          }
          return true;
        }
        if(e.attackPhase === 'recover'){
          e.y += clamp((enemyGroundTargetY(e) - e.y), -scaled(560)*dt, scaled(560)*dt);
          updateEnemyAttackAnimation(e, dt, 1.02);
          e.el.style.transform = `translate(${e.x}px, ${e.y}px)`;
          if(e.attackTimer <= 0){
            resetEnemyAttackState(e, 0.72, 1.38, 'burst');
          }
          return true;
        }
      }
      if(e.attackType === 'strafe'){
        if(e.attackPhase === 'windup'){
          e.y += clamp((enemyGroundTargetY(e) - e.y), -scaled(540)*dt, scaled(540)*dt);
          setEnemyShootPose(e, 0);
          e.el.style.transform = `translate(${e.x}px, ${e.y}px)`;
          if(e.attackTimer <= 0){
            e.attackPhase = 'slide';
            e.attackTimer = 0.42 + Math.random()*0.16;
            e.attackSlideDuration = e.attackTimer;
            e.attackShotCursor = 0;
            e.attackShotDone = {};
            setEnemyAttackVfx(e, 'dash');
          }
          return true;
        }
        if(e.attackPhase === 'slide'){
          const dx = e.attackTravelX - e.x;
          const step = clamp(dx, -((e.attackSpeed || scaled(560)) * dt), ((e.attackSpeed || scaled(560)) * dt));
          e.x += step;
          clampEnemyXInFrame(e);
          e.y += clamp((enemyGroundTargetY(e) - e.y), -scaled(560)*dt, scaled(560)*dt);
          const total = Math.max(0.001, e.attackSlideDuration || 0.56);
          const progress = clamp(1 - (e.attackTimer / total), 0, 1);
          const shotFrame = progress < 0.28 ? 0 : (progress < 0.72 ? 1 : 2);
          setEnemyShootPose(e, shotFrame);
          if(Array.isArray(e.attackShotWindows)){
            for(let si=0; si<e.attackShotWindows.length; si++){
              if(!e.attackShotDone[si] && progress >= e.attackShotWindows[si]){
                const offY = (si % 2 === 0 ? -scaled(12) : scaled(12));
                enemyShootWithOffset(e, offY, true);
                e.attackShotDone[si] = true;
              }
            }
          }
          e.el.style.transform = `translate(${e.x}px, ${e.y}px)`;
          const reached = Math.abs(e.attackTravelX - e.x) <= scaled(14);
          if(e.attackTimer <= 0 || reached){
            e.attackPhase = 'recover';
            e.attackTimer = 0.10 + Math.random()*0.04;
            clearEnemyAttackVfx(e);
          }
          return true;
        }
        if(e.attackPhase === 'recover'){
          e.y += clamp((enemyGroundTargetY(e) - e.y), -scaled(520)*dt, scaled(520)*dt);
          updateEnemyAttackAnimation(e, dt, 1.05);
          e.el.style.transform = `translate(${e.x}px, ${e.y}px)`;
          if(e.attackTimer <= 0){
            resetEnemyAttackState(e, 0.76, 1.48, 'strafe');
          }
          return true;
        }
      }
      if(e.attackType === 'dash'){
        const moveSpeed = scaled(540);
        if(e.attackPhase === 'retreat'){
          const dx = clamp((e.attackTargetX - e.x), -moveSpeed*dt, moveSpeed*dt);
          const dy = clamp((enemyGroundTargetY(e) - e.y), -scaled(620)*dt, scaled(620)*dt);
          e.x += dx;
          clampEnemyXInFrame(e);
          e.y += dy;
          updateEnemyAttackAnimation(e, dt, 1.15);
          e.el.style.transform = `translate(${e.x}px, ${e.y}px)`;
          if(e.attackTimer <= 0 || Math.abs(e.attackTargetX - e.x) <= scaled(10)){
            e.attackPhase = 'charge';
            e.attackTimer = 0.30 + Math.random()*0.08;
            e.vx = 0;
            setEnemyAttackVfx(e, 'charge');
            try{
              if(!window.Sounds) window.Sounds = (typeof Sounds !== 'undefined' ? Sounds : {});
              if(!Sounds.vibration){ Sounds.vibration = new Audio('vibration.mp3'); Sounds.vibration.volume = 0.9; Sounds.vibration.preload = 'auto'; }
              if(typeof playSound === 'function') playSound(Sounds.vibration);
            }catch(_){ }
          }
          return true;
        }
        if(e.attackPhase === 'charge'){
          e.y += clamp((enemyGroundTargetY(e) - e.y), -scaled(740)*dt, scaled(740)*dt);
          updateEnemyAttackAnimation(e, dt, 1.55);
          e.el.style.transform = `translate(${e.x}px, ${e.y}px)`;
          if(e.attackTimer <= 0){
            e.attackPhase = 'dash';
            e.attackTimer = 0.62 + Math.random()*0.10;
            const dashBounds = getEnemyFrameBounds(e);
            e.attackTargetX = (e.attackDir > 0) ? dashBounds.right : dashBounds.left;
            e.attackSpeed = scaled(1380);
            setEnemyAttackVfx(e, 'dash');
            try{ screenShake(180); }catch(_){ }
          }
          return true;
        }
        if(e.attackPhase === 'dash'){
          e.vx = e.attackDir * (e.attackSpeed || scaled(1220));
          e.x += e.vx * dt;
          clampEnemyXInFrame(e);
          e.y += clamp((enemyGroundTargetY(e) - e.y), -scaled(760)*dt, scaled(760)*dt);
          updateEnemyAttackAnimation(e, dt, 2.4);
          if(!e.attackHitApplied){
            const hitPadX = e.w * 0.20;
            const hitPadY = e.h * 0.20;
            if(aabb(e.x + hitPadX, e.y + hitPadY, Math.max(1, e.w - hitPadX*2), Math.max(1, e.h - hitPadY*2), player.x, player.y, player.w, player.h)){
              applyPlayerHitFromMelee({ dir: e.attackDir, kind: 'dash', source: e });
              e.attackHitApplied = true;
            }
          }
          e.el.style.transform = `translate(${e.x}px, ${e.y}px)`;
          const reached = (e.attackDir > 0) ? (e.x >= e.attackTargetX) : (e.x <= e.attackTargetX);
          if(reached || e.attackTimer <= 0){
            const dashBounds2 = getEnemyFrameBounds(e);
            e.x = clamp(e.x, dashBounds2.left, dashBounds2.right);
            e.attackPhase = 'recover';
            e.attackTimer = 0.12;
            clearEnemyAttackVfx(e);
            e.el.style.transform = `translate(${e.x}px, ${e.y}px)`;
          }
          return true;
        }
        if(e.attackPhase === 'recover'){
          e.y += clamp((enemyGroundTargetY(e) - e.y), -scaled(600)*dt, scaled(600)*dt);
          updateEnemyAttackAnimation(e, dt, 1.0);
          e.el.style.transform = `translate(${e.x}px, ${e.y}px)`;
          if(e.attackTimer <= 0){
            resetEnemyAttackState(e, 1.3, 2.4, 'dash');
          }
          return true;
        }
      }
      if(e.attackType === 'lunge'){
        if(e.attackPhase === 'charge'){
          e.y += clamp((e.attackTargetY - e.y), -scaled(460)*dt, scaled(460)*dt);
          updateEnemyAttackAnimation(e, dt, 1.2);
          e.el.style.transform = `translate(${e.x}px, ${e.y}px)`;
          if(e.attackTimer <= 0){
            e.attackPhase = 'lunge';
            e.attackTimer = 0.18 + Math.random()*0.05;
            e.attackSpeed = scaled(1040);
            setEnemyAttackVfx(e, 'lunge');
          }
          return true;
        }
        if(e.attackPhase === 'lunge'){
          const dx = e.attackTargetX - e.x;
          const dy = e.attackTargetY - e.y;
          const dist = Math.max(1, Math.hypot(dx, dy));
          const step = Math.min(dist, (e.attackSpeed || scaled(900)) * dt);
          e.x += (dx / dist) * step;
          clampEnemyXInFrame(e);
          e.y += (dy / dist) * step;
          updateEnemyAttackAnimation(e, dt, 1.9);
          if(!e.attackHitApplied){
            const hitPadX = e.w * 0.24;
            const hitPadY = e.h * 0.22;
            if(aabb(e.x + hitPadX, e.y + hitPadY, Math.max(1, e.w - hitPadX*2), Math.max(1, e.h - hitPadY*2), player.x, player.y, player.w, player.h)){
              applyPlayerHitFromMelee({ dir: e.attackDir, kind: 'lunge', source: e });
              e.attackHitApplied = true;
            }
          }
          e.el.style.transform = `translate(${e.x}px, ${e.y}px)`;
          if(dist <= scaled(20) || e.attackTimer <= 0){
            e.attackPhase = 'retreat';
            e.attackTimer = 0.16 + Math.random()*0.05;
            e.attackTargetX = e.attackRetreatX;
            e.attackTargetY = clamp(e.attackRetreatY, minY, maxY);
            clearEnemyAttackVfx(e);
          }
          return true;
        }
        if(e.attackPhase === 'retreat'){
          const dx = e.attackTargetX - e.x;
          const dy = e.attackTargetY - e.y;
          const dist = Math.max(1, Math.hypot(dx, dy));
          const step = Math.min(dist, scaled(760) * dt);
          e.x += (dx / dist) * step;
          clampEnemyXInFrame(e);
          e.y += (dy / dist) * step;
          updateEnemyAttackAnimation(e, dt, 1.2);
          e.el.style.transform = `translate(${e.x}px, ${e.y}px)`;
          if(dist <= scaled(16) || e.attackTimer <= 0){
            resetEnemyAttackState(e, 1.05, 2.0, 'lunge');
          }
          return true;
        }
      }
      resetEnemyAttackState(e, 1.15, 2.2);
      return true;
    }

    let enemySpawnsEnabled = false;

    function spawnEnemy(){
      if(!enemySpawnsEnabled) return;
      if(enemies.length>0 || player.state==='dead' || gameEnded) return;
      const fromLeft = Math.random()<0.5;
      const x = fromLeft ? -140 : (window.innerWidth+140);
      const dir = fromLeft ? 'right':'left';

// --- SPECIAL: LEVEL 10 BOSS ---
const isBoss10 = (currentLevel === 10);
const baseW = scaled(140), baseH = scaled(140);
const w = isBoss10 ? baseW * 4 : baseW;
const h = isBoss10 ? baseH * 4 : baseH;
const baseY = groundY() - h - (isBoss10 ? 0 : rand(40,160));

      const maxHp = Math.round(BASE_ENEMY_HP * currentDiff.enemyHpMul);

      const e={
        el:document.createElement('div'), x, y:baseY, vx:0, vy:0,
        w,h,dir, isBoss: isBoss10,
        hp:maxHp, maxHp,
        targetY: baseY, changeYTimer: rand(1.0, 2.0), floatT: rand(0, Math.PI*2),
        shootTimer: isBoss10 ? rand(1.6*currentDiff.enemyShootRate, 3.2*currentDiff.enemyShootRate)
                          : rand(1.05*currentDiff.enemyShootRate, 2.35*currentDiff.enemyShootRate),
        knockVX:0, knockDecay:0.88, knockBoostX:320, knockBoostY:160,
        state:'move', hitTimer:0, hitIndex:0, hitFrameTimer:0, hitFrameDur:0.08,
        dead:false, deathFade:false,
        tpCD:0, isTeleporting:false,
        runIndex:0, runTimer:0, runFrameDuration:0.09,

        shooting:false, shootAnimIndex:0, shootAnimTimer:0, shootFrameDuration:0.08, hasFired:false,

        coinDropped:false,
        postBiteActive:false,
        postBiteCloseTimer:0,
        attackType:'', attackPhase:'', attackTimer:0, attackDir:0,
        attackHitApplied:false, attackSpeed:0,
        dashAttackCD: rand(0.18, 0.95),
        lungeAttackCD: rand(0.05, 0.65),
        burstShotCD: rand(0.12, 0.62),
        strafeShotCD: rand(0.20, 0.84),
        crossEvadeCooldown: rand(0.15, 0.85),
        stutterEvadeCD: rand(0.12, 0.48),
        dropEvadeCD: rand(0.18, 0.62),
        mindGameCD: rand(0.30, 1.10), chainCD: rand(0.12, 0.70),
        chainQueued:false, chainTimer:0, chainType:'', chainSourceKind:'', chainLanded:false,
        attackFeintKind:'', attackFollowKind:'', attackSourceKind:'', attackCancelX:null,
        lastAttackKind:'', attackRepeatCount:0,
        comboBias: rand(0.08, 0.22), attackLandedBias:0, feintBias: rand(0.01, 0.08),
        temperament: chooseEnemyTemperamentProfile(),
        recentActions: [],
        flowMode: 'stalk', flowTimer: rand(0.35, 0.95), flowDir: (Math.random()<0.5?-1:1),
        entering: !isBoss10,
        entrySpeed: scaled(220),
        entryOpacity: 1,
        entryTargetX: x,
        entryStyle: 'sweep', entryT: 0, entryDuration: 0.92 + Math.random()*0.34, entryStartX: x, entryStartY: baseY,
        entryCruiseY: baseY, entrySpawnY: baseY, entrySpawnBand: 'mid',
        entryCurveAmp: scaled(26) + Math.random()*scaled(36), entryWaveAmp: scaled(8) + Math.random()*scaled(10), entryWaveFreq: 1.0 + Math.random()*0.9,
        entryDistanceX: 0, entryPhaseOffset: rand(0, Math.PI*2), entryGlideDir:0,
        introGlideT:0, introGlideDur:0, introGlideBaseY:baseY, introGlideAmp:0, introGlideFreq:0,
        entryJukeT:0, entryJukeDur:0, entryJukeDir:0, entryJukeAmp:0,
        entryEvadeT:0, entryEvadeDur:0, entryEvadeTargetY:baseY,
        entryWaypoint1Y: baseY, entryWaypoint2Y: baseY, entryWaypoint3Y: baseY,
        entryPathJitterAmp: 0, entryPathBias: 0, entryPathBiasTarget: 0, entryPathBiasHold: 0,
        introReactCD:0,
        introCanShoot:false, introShotCD:0, introShotsLeft:0,
        introGuardT: 0.70,
        crossEvadeRecovery: rand(0.15, 0.45),
        crossEvadeLoopGuard: 0,
        intentVX: 0,
        adaptiveRole: '',
        adaptiveLastReactionAt: 0
      };
      e.el.className='enemy'; e.el.style.width=w+'px'; e.el.style.transform=`translate(${x}px, ${e.y}px)`;
      if(!e.isBoss){
        const spawnBounds = getEnemyFrameBounds(e);
        const entryInset = scaled(164) + Math.random()*scaled(126);
        const flightTop = scaled(168);
        const flightBottom = Math.max(flightTop + scaled(180), groundY() - e.h - scaled(20));
        const lanePad = scaled(14);
        const highBandMin = flightTop + lanePad;
        const highBandMax = Math.min(flightBottom - scaled(166), flightTop + scaled(86));
        const midBandMin = Math.max(highBandMin + scaled(44), flightTop + scaled(108));
        const midBandMax = Math.min(flightBottom - scaled(74), midBandMin + scaled(96));
        const lowBandMin = Math.max(midBandMin + scaled(40), flightBottom - scaled(118));
        const lowBandMax = Math.max(lowBandMin + scaled(32), flightBottom - lanePad);
        e.entryTargetX = fromLeft
          ? clamp(spawnBounds.safeLeft + entryInset, spawnBounds.left + scaled(54), spawnBounds.safeRight)
          : clamp(spawnBounds.safeRight - entryInset, spawnBounds.safeLeft, spawnBounds.right - scaled(54));
        const offscreenLead = scaled(220) + Math.random()*scaled(120);
        e.x = fromLeft ? (-e.w - offscreenLead) : (spawnBounds.W + offscreenLead);
        e.entryStyle = chooseEnemyEntryStyle(e);
        let spawnBandRoll = Math.random();
        if(e.entryStyle === 'rush') spawnBandRoll = 0.18 + spawnBandRoll * 0.82;
        else if(e.entryStyle === 'hesitate') spawnBandRoll = 0.10 + spawnBandRoll * 0.82;
        else if(e.entryStyle === 'swoop') spawnBandRoll = 0.08 + spawnBandRoll * 0.78;
        const spawnBand = (spawnBandRoll < 0.56) ? 'mid' : 'low';
        const bandRanges = {
          high: { spawnMin: highBandMin, spawnMax: Math.max(highBandMin + scaled(18), highBandMax), cruiseMin: highBandMin + scaled(8), cruiseMax: Math.max(highBandMin + scaled(28), highBandMax + scaled(20)) },
          mid:  { spawnMin: midBandMin,  spawnMax: Math.max(midBandMin + scaled(18), midBandMax),  cruiseMin: Math.max(highBandMin + scaled(24), midBandMin - scaled(10)), cruiseMax: Math.min(lowBandMax - scaled(40), midBandMax + scaled(18)) },
          low:  { spawnMin: lowBandMin,  spawnMax: Math.max(lowBandMin + scaled(18), lowBandMax),  cruiseMin: Math.max(midBandMin + scaled(8), lowBandMin - scaled(26)), cruiseMax: Math.max(lowBandMin + scaled(16), lowBandMax - scaled(12)) }
        };
        const band = bandRanges[spawnBand] || bandRanges.mid;
        let spawnY = rand(band.spawnMin, band.spawnMax);
        let cruiseY = rand(Math.min(band.cruiseMin, band.cruiseMax), Math.max(band.cruiseMin, band.cruiseMax));
        if(spawnBand === 'low') cruiseY = Math.max(midBandMin + scaled(14), Math.min(lowBandMax - scaled(10), cruiseY));
        else cruiseY = Math.max(midBandMin + scaled(8), Math.min(midBandMax + scaled(18), cruiseY + scaled(8)));
        if(e.entryStyle === 'swoop'){
          spawnY = Math.min(lowBandMax - scaled(18), Math.max(midBandMin, spawnY + scaled(6)));
          cruiseY = Math.min(lowBandMax - scaled(8), cruiseY + scaled(14));
        }else if(e.entryStyle === 'rush'){
          cruiseY = spawnY + rand(-scaled(18), scaled(18));
        }else if(e.entryStyle === 'hesitate'){
          cruiseY = spawnY + rand(-scaled(34), scaled(34));
        }
        e.y = clamp(spawnY, flightTop, flightBottom);
        e.targetY = clamp(cruiseY, flightTop, flightBottom);
        e.entryCruiseY = e.targetY;
        e.entrySpawnY = e.y;
        e.entrySpawnBand = spawnBand;
        e.entryCurveAmp = Math.max(e.entryCurveAmp || 0, scaled(34) + Math.abs(e.entryCruiseY - e.y) * 0.22);
        e.entryWaveAmp = scaled(8) + Math.random()*scaled(8);
        e.entryWaveFreq = 1.5 + Math.random()*0.8;
        e.entryDuration = 1.15 + Math.random()*0.38 + (spawnBand === 'high' ? 0.10 : 0);
        e.entrySpeed = scaled(240) + Math.random()*scaled(86);
        e.intentVX = fromLeft ? e.entrySpeed : -e.entrySpeed;
        e.introCanShoot = (spawnBand === 'high');
        e.introShotCD = e.introCanShoot ? (0.26 + Math.random()*0.22) : 999;
        e.introShotsLeft = e.introCanShoot ? (1 + (Math.random() < 0.45 ? 1 : 0)) : 0;
        e.entryGlideDir = fromLeft ? 1 : -1;
        e.entryDistanceX = Math.abs((e.entryTargetX || e.x) - e.x);
        e.entryPhaseOffset = rand(0, Math.PI*2);
        e.entryStartX = e.x;
        e.entryStartY = e.y;
        buildEnemyEntryPath(e, flightTop, flightBottom);
        e.targetY = e.entryCruiseY;
        e.el.style.opacity = '1';
        e.el.style.transform = `translate(${e.x}px, ${e.y}px)`;
      }
      const img=document.createElement('img'); img.src = enemyRunFrames[dir][0]; img.alt=''; e.el.appendChild(img);
      
      if(e.isBoss){ try{ img.style.transform = `translateY(${getBossOffsetY()}px)`; }catch(_){}
      try{ img.dataset.boss = '1'; if (img.classList) img.classList.add('boss-sprite'); }catch(_){ }
      }
      const barWrap=document.createElement('div'); barWrap.className='ehpwrap';
      const bar=document.createElement('div'); bar.className='ehp'; barWrap.appendChild(bar);
      e.el.appendChild(barWrap); e.hpEl=bar;

      
      // Boss: hide the small head bar and show HUD
      if(e.isBoss){
        try{
          barWrap.style.display = 'none';
          showBossHud(e);
        }catch(_){}
      }
/* BossStatic: pin boss at the screen edge where it spawns */
if(e.isBoss){
  try{
    const M = 16;
    const W = (window.innerWidth || document.documentElement.clientWidth);
    e.staticBoss = true;
    e.staticBossX = (e.dir === 'right') ? M : Math.max(0, W - e.w - M);
    e.staticBossY = e.y;            /* keep whatever vertical spawn chosen */
    e.x = e.staticBossX;            /* snap to edge immediately */
    e.targetY = e.staticBossY;      /* lock vertical baseline */
    e.vx = 0; e.vy = 0;             /* neutral horizontal movement */
  }catch(_){}
}
enemyLayer.appendChild(e.el); enemies.push(e);
      if(e.isBoss){ e.shootTimer = Math.max(0.15, e.shootTimer * 0.4); }
      else {
        e.aiPattern = 'intro';
        e.aiPatternTimer = 0;
        e.shootTimer = Math.max(e.shootTimer, 0.85 + Math.random()*0.40);
      }
updateEnemyHpBar(e);
    }
    function updateEnemyHpBar(e){ e.hpEl.style.width = clamp(e.hp/e.maxHp,0,1)*100 + '%'; try{ if(e.isBoss) updateBossHud(e); }catch(_){}}
    function desiredBehindX(gap, e){
      return (player.facing === 'right')
        ? clamp(player.x - e.w - gap, 0, window.innerWidth - e.w)
        : clamp(player.x + player.w + gap, 0, window.innerWidth - e.w);
    }
    function teleportToBehind(e, gap=140){
      if(!ENEMY_CAN_TELEPORT || !e || enemyHasExclusiveAction(e)) return false;
      const minY = 60;
      const maxY = groundY() + ENEMY_GROUND_SHIFT - e.h - 10;
      const targetX = desiredBehindX(scaled(gap), e);
      const targetY = (e.isBoss ? (groundY() - e.h) : clamp(player.y + rand(-40, 40), minY, maxY));

      e.isTeleporting = true;
      e.el.classList.remove('tp-in');
      e.el.classList.add('tp-out');
      playSound(Sounds.tpOut);

      setTimeout(()=>{
        e.x = targetX;
        e.y = targetY;
        e.knockVX = 0; e.vy = 0;

        e.dir  = (e.x < player.x) ? 'right' : 'left';
        e.runIndex = 0; e.runTimer = 0;
        e.el.firstChild.src = enemyRunFrames[e.dir][e.runIndex]; applyBossSpriteOffset(e);

         // Bite animation override
        if (e.biting){
          e.biteTimer += dt;
          if (e.biteTimer >= (e.biteFrameDur || 0.10)){
            e.biteTimer -= (e.biteFrameDur || 0.10);
            e.biteFrame = (e.biteFrame|0) + 1;
            if (e.biteFrame >= (bossBiteFrames[e.dir] ? bossBiteFrames[e.dir].length : 4)){
              e.biting = false;
              e.biteFrame = 0;
            }
          }
          // If still biting, override sprite with bite frame this tick
          if (e.biting){
            e.el.firstChild.src = (bossBiteFrames[e.dir] || bossBiteFrames.right)[e.biteFrame|0];
            applyBossSpriteOffset(e);
          }
        }
        e.el.style.transform = `translate(${e.x}px, ${e.y}px)`;

        e.el.classList.remove('tp-out');
        e.el.classList.add('tp-in');
        playSound(Sounds.tpIn);

        setTimeout(()=>{ e.el.classList.remove('tp-in'); e.isTeleporting = false; holdEnemyNextAction(e, 0.10, 0.18); }, 60);
      }, 180);
      e.tpCD = 0.9;
      return true;
    }
    function teleportEnemyDuringEntry(e, minY, maxY){
      if(!e || e.dead || e.isTeleporting) return false;
      const bounds = getEnemyFrameBounds(e);
      const playerFacing = (player && player.facing === 'left') ? 'left' : 'right';
      const behindGap = scaled(162) + Math.random()*scaled(36);
      const continueGap = scaled(104) + Math.random()*scaled(30);
      const appearJitterX = rand(-scaled(8), scaled(8));
      const playerLeadY = player ? clamp(player.y + scaled(4) + rand(-scaled(4), scaled(14)), minY, maxY) : clamp(e.y, minY, maxY);
      const behindX = desiredBehindX(behindGap, e);

      let nextXRaw = clamp(behindX + appearJitterX, bounds.safeLeft, bounds.safeRight);
      let nextTargetX;
      let newDir;

      if(playerFacing === 'right'){
        newDir = 'right';
        nextTargetX = clamp(player.x - e.w - continueGap, bounds.safeLeft, Math.min(bounds.safeRight, player.x - scaled(32)));
      }else{
        newDir = 'left';
        nextTargetX = clamp(player.x + player.w + continueGap, Math.max(bounds.safeLeft, player.x + scaled(32)), bounds.safeRight);
      }

      if(Math.abs(nextTargetX - nextXRaw) < scaled(42)){
        nextTargetX = clamp(nextXRaw + (newDir === 'right' ? scaled(84) : -scaled(84)), bounds.safeLeft, bounds.safeRight);
      }

      let nextY = playerLeadY;
      if(typeof e.entryCruiseY !== 'number') e.entryCruiseY = nextY;
      e.isTeleporting = true;
      e.el.classList.remove('tp-in');
      e.el.classList.add('tp-out');
      playSound(Sounds.tpOut);
      setTimeout(()=>{
        e.x = nextXRaw;
        e.y = nextY;
        e.dir = newDir;
        e.entryGlideDir = (newDir === 'right') ? 1 : -1;
        e.entryStartX = e.x;
        e.entryStartY = e.y;
        e.entrySpawnY = e.y;
        e.entryTargetX = nextTargetX;
        e.entryDistanceX = Math.max(scaled(96), Math.abs(e.entryTargetX - e.entryStartX));
        e.entryT = 0;
        e.entryPathBias = 0;
        e.entryPathBiasTarget = 0;
        e.entryPathBiasHold = 0;
        e.entryPhaseOffset = rand(0, Math.PI*2);
        e.knockVX = 0;
        e.vy = 0;
        e.runIndex = 0;
        e.runTimer = 0;
        e.entrySpawnBand = (nextY >= (minY + maxY) * 0.58) ? 'low' : 'mid';
        e.entryStyle = 'sweep';
        e.entryCruiseY = clamp(playerLeadY + scaled(12) + rand(-scaled(4), scaled(10)), minY, maxY);
        e.entryWaypoint1Y = clamp(e.y + (e.entryCruiseY - e.y) * 0.34, minY, maxY);
        e.entryWaypoint2Y = clamp(e.y + (e.entryCruiseY - e.y) * 0.64, minY, maxY);
        e.entryWaypoint3Y = clamp(e.y + (e.entryCruiseY - e.y) * 0.88, minY, maxY);
        e.entryPathJitterAmp = scaled(1.5) + Math.random()*scaled(1.5);
        if(e.el && e.el.firstChild){
          e.el.firstChild.src = enemyRunFrames[e.dir][e.runIndex];
        }
        e.el.style.transform = `translate(${e.x}px, ${e.y}px)`;
        e.el.classList.remove('tp-out');
        e.el.classList.add('tp-in');
        playSound(Sounds.tpIn);
        setTimeout(()=>{
          e.el.classList.remove('tp-in');
          e.isTeleporting = false;
        }, 60);
      }, 180);
      e.introReactCD = 0.95;
      return true;
    }


    function enemyShoot(e, playAudio=true){
// -- slime.mp3 trigger on boss L10 projectile attack --
try{
  if ((typeof playAudio==='undefined' || playAudio) && typeof Sounds!=='undefined'){
    if(!Sounds.slime){ try{ Sounds.slime = new Audio('slime.mp3'); Sounds.slime.volume = 0.9; Sounds.slime.preload='auto'; }catch(_){ } }
    try{
      var __bossCheck = (typeof e!=='undefined' && e && e.isBoss && typeof currentLevel!=='undefined' && currentLevel===10);
      if(__bossCheck && typeof playSound==='function'){ playSound(Sounds.slime || Sounds.spit || Sounds.enemyShoot); }
      else if(__bossCheck && Sounds.slime && Sounds.slime.play){ try{ Sounds.slime.currentTime=0; Sounds.slime.play().catch(function(){}); }catch(_){ } }
    }catch(_){}
  }
}catch(_){}

  if(e.dead) return;
  const dir = e.dir;
  let centerX = e.x + (dir==='right' ? e.w*0.75 : e.w*0.25);
  let y = e.y + e.h*0.5;
  if(e.isBoss && typeof currentLevel!=='undefined' && currentLevel===10){
    y = e.y + e.h*0.42; // raise a bit more // raise projectile spawn a bit higher for boss lvl10
  }

  // --- Level 10 Boss mouth offset ---
  if(e.isBoss && typeof currentLevel !== 'undefined' && currentLevel === 10){
    const mouthXMul = 0.82;
    const mouthYMul = 0.70;
    centerX = e.x + (dir==='right' ? e.w*mouthXMul : e.w*(1 - mouthXMul));
    y       = e.y + e.h*mouthYMul;
  }

  const base = irand(EPROJ_SIZE[0], EPROJ_SIZE[1]); // bază (design)
  const size = scaled(base);                         // scalat cu uiS
  const shotSpeed = EPROJ_SPEED * (e.isBoss ? 1.6 : 1);

  const b = {
    el: document.createElement('div'),
    x: centerX, y,
    vx: (dir==='right'?1:-1) * shotSpeed,
    vy: 0,
    angleDeg: 0,
    t:0,
    w: size, h: Math.round(size*0.4),
    life: Infinity,
    baseSize: base
  };

  // Align projectile vertically by its center on MOBILE for boss
  (function(){
    try{
      var isMobile = (window.matchMedia && window.matchMedia('(hover: none) and (pointer: coarse)').matches) || (window.innerWidth <= 900);
      if(e.isBoss && isMobile){ b.y = Math.round(b.y - b.h*2.0); }  // și mai sus pe mobil  // mult mai sus pe mobil
    }catch(_){ }
  })();

  b.el.className='eproj';
  b.el.style.width = size+'px';
  // Boss level 10: enlarge only boss projectile (does NOT affect player/enemy projectiles)
  if(e.isBoss && typeof currentLevel!=='undefined' && currentLevel===10){
    b.w = Math.round(b.w * 2);
    b.h = Math.round(b.h * 2);
    b.el.style.width = b.w + 'px';
  }
  
  // Mobile-only: force boss projectile spawn higher (uses visual sprite offset)
  (function(){
    try{
      var isMobile = (window.matchMedia && window.matchMedia('(hover: none) and (pointer: coarse)').matches) || (window.innerWidth <= 900);
      if(isMobile && e.isBoss){
        var vis = (typeof e._visDY === 'number') ? e._visDY : 0;
        // 25% from top of boss sprite, plus visual transform offset; tweak factor as needed
        b.y = Math.round(e.y + e.h * 0.38 + vis);
      }
      else if(e.isBoss){
        var vis = (typeof e._visDY === 'number') ? e._visDY : 0;
        // Desktop: 45% from top (slightly higher than center)
        b.y = Math.round(e.y + e.h * 0.52 + vis);
      }
    }catch(_){ }
  })();

  try{
    let targetX = player.x + player.w * 0.5;
    const targetY = player.y + player.h * 0.45;
    try{
      const info = getEnemyAttackContext(e);
      const tune = getAdaptiveEnemyTuning(e, info);
      if(tune){
        const leadBias = Number(tune.aimLeadBiasX) || 0;
        const playerVX = Number((window.playerRead && window.playerRead.recentVX) || player.vx || 0);
        const leadAmount = clamp(playerVX * (0.05 + Math.abs(leadBias) * 0.08), -scaled(52), scaled(52));
        targetX += leadAmount;
        if(Math.abs(leadBias) > 0.01){
          targetX += scaled(34) * leadBias;
        }
      }
    }catch(_){}
    const enemyIsAbovePlayer = b.y < (targetY - scaled(10));
    if(enemyIsAbovePlayer){
      let dx = targetX - b.x;
      let dy = targetY - b.y;
      if(Math.abs(dx) < 8) dx = (dir==='right' ? 8 : -8);
      const len = Math.hypot(dx, dy) || 1;
      b.vx = (dx / len) * shotSpeed;
      b.vy = (dy / len) * shotSpeed;
      b.angleDeg = Math.atan2(b.vy, b.vx) * 180 / Math.PI;
    }else{
      b.vx = (dir==='right' ? 1 : -1) * shotSpeed;
      b.vy = 0;
      b.angleDeg = 0;
    }
  }catch(_){
    b.vx = (dir==='right' ? 1 : -1) * shotSpeed;
    b.vy = 0;
    b.angleDeg = 0;
  }

  b.el.style.transformOrigin = '50% 50%';
  b.el.style.transform = `translate(${b.x}px, ${b.y}px) rotate(${b.angleDeg}deg)`;
  const img=document.createElement('img');
  if(e.isBoss){
    const frames=['boss_proj_1.png','boss_proj_2.png','boss_proj_3.png'];
    let fi=0;
    img.src=frames[0];
    // simple looping animation; store timer for cleanup
    b._animFrames = frames;
    b._animTimer = setInterval(()=>{
      try{
        if(!b.el || !b.el.firstChild){ clearInterval(b._animTimer); return; }
        fi=(fi+1)%frames.length;
        b.el.firstChild.src = frames[fi];
      }catch(_){ try{ clearInterval(b._animTimer); }catch(__){} }
    }, 100);
  } else {
    img.src='enemy_projectile.png';
  }
  img.alt=''; b.el.appendChild(img);
  eprojLayer.appendChild(b.el); enemyProjectiles.push(b);
  if(playAudio) playSound(Sounds.enemyShoot);
}

    function beginEnemyShoot(e){
      const actionLabel = enemyExclusiveActionLabel(e);
      if(e.dead || actionLabel){
        clearEnemyAttackChain(e);
        holdEnemyNextAction(e, e && e.isBoss ? 0.18 : 0.12, e && e.isBoss ? 0.32 : 0.24);
        try{
          if(window.GameApp && GameApp.debug){
            GameApp.debug.lastEnemyActionHold = {
              at: new Date().toISOString(),
              reason: actionLabel || 'dead',
              x: e ? Math.round(e.x || 0) : 0,
              y: e ? Math.round(e.y || 0) : 0,
              level: (typeof currentLevel !== 'undefined' ? currentLevel : 1)
            };
          }
        }catch(_){ }
        return false;
      }
      if(!e.isBoss && !player.isInvisible && beginEnemyPatternAttack(e)){
        try{
          if(window.GameApp && GameApp.debug){
            GameApp.debug.lastEnemyAttackPattern = {
              at: new Date().toISOString(),
              attackType: e.attackType,
              phase: e.attackPhase,
              temperament: (e.temperament && e.temperament.id) ? e.temperament.id : 'balanced',
              x: Math.round(e.x),
              y: Math.round(e.y),
              gapX: Math.round(Math.abs(playerMidX() - enemyMidX(e))),
              gapY: Math.round(Math.abs(playerMidY() - enemyMidY(e))),
              level: (typeof currentLevel !== 'undefined' ? currentLevel : 1)
            };
          }
        }catch(_){ }
        return;
      }
      enterEnemyShootState(e, 1);
    }

    /* ===== Resource stacks (colectabile) ===== */
    const coinsLayer = document.getElementById('coins');
    const coins = [];
    const RES_IMG = { scrap:'scrap.png', wood:'wood.png', circuits:'circuits.png' };

/* Visual ring telegraph for stomp */
function spawnStompRing(cx, cy, radiusPx, delaySec){
  try{
    const layer = document.getElementById('particles') || document.body;
    const ring = document.createElement('div');
    ring.className = 'stomp-ring';
    const d = Math.max(8, Math.round(radiusPx*2));
    ring.style.width = d+'px';
    ring.style.height = d+'px';
    const left = Math.round(cx - radiusPx);
    const top  = Math.round(cy - radiusPx);
    ring.style.transform = `translate(${left}px, ${top}px) scale(0.2)`;
    layer.appendChild(ring);
    requestAnimationFrame(()=>{ ring.style.transform = `translate(${left}px, ${top}px) scale(1)`; });
    const ms = Math.max(10, (delaySec||0.6)*1000);
    setTimeout(()=>{ ring.classList.add('done'); }, ms-80);
    setTimeout(()=>{ try{ ring.remove(); }catch(_){ } }, ms+420);
  }catch(_){}
}

function bigQuake(ms=600){
  try{
    const el = document.body || document.documentElement;
    el.classList.remove('quake'); void el.offsetWidth; el.classList.add('quake');
    setTimeout(()=>{ try{ el.classList.remove('quake'); }catch(_){ } }, Math.max(120, ms));
  }catch(_){}
}

/* Boss L10: special WAVE projectile (PNG) */
function enemyShootWave(e, playAudio=true){
// -- slime.mp3 trigger on boss L10 projectile attack --
try{
  if ((typeof playAudio==='undefined' || playAudio) && typeof Sounds!=='undefined'){
    if(!Sounds.slime){ try{ Sounds.slime = new Audio('slime.mp3'); Sounds.slime.volume = 0.9; Sounds.slime.preload='auto'; }catch(_){ } }
    try{
      var __bossCheck = (typeof e!=='undefined' && e && e.isBoss && typeof currentLevel!=='undefined' && currentLevel===10);
      if(__bossCheck && typeof playSound==='function'){ playSound(Sounds.slime || Sounds.spit || Sounds.enemyShoot); }
      else if(__bossCheck && Sounds.slime && Sounds.slime.play){ try{ Sounds.slime.currentTime=0; Sounds.slime.play().catch(function(){}); }catch(_){ } }
    }catch(_){}
  }
}catch(_){}

// -- slime.mp3 trigger on boss L10 projectile attack --
try{
  if ((typeof playAudio==='undefined' || playAudio) && typeof Sounds!=='undefined'){
    if(!Sounds.slime){ try{ Sounds.slime = new Audio('slime.mp3'); Sounds.slime.volume = 0.9; Sounds.slime.preload='auto'; }catch(_){ } }
    try{
      var __bossCheck = (typeof e!=='undefined' && e && e.isBoss && typeof currentLevel!=='undefined' && currentLevel===10);
      if(__bossCheck && typeof playSound==='function'){ playSound(Sounds.slime || Sounds.spit || Sounds.enemyShoot); }
      else if(__bossCheck && Sounds.slime && Sounds.slime.play){ try{ Sounds.slime.currentTime=0; Sounds.slime.play().catch(function(){}); }catch(_){ } }
    }catch(_){}
  }
}catch(_){}

  if(!e || e.dead) return;
  const dir = e.dir;
  // mouth-like offset
  let centerX = e.x + (dir==='right' ? e.w*0.82 : e.w*(1-0.82));
  let y       = e.y + e.h*0.70;
  const b={
    x:centerX + (dir==='right' ? 12 : -12),
    y:y,
    w: Math.round(scaled(130)),
    h: Math.round(scaled(64)),
    vx: (dir==='right' ? 1 : -1) * scaled(520),
    t:0, el:document.createElement('div'),
    dir:dir, isBoss:true, kind:'wave'
  };
  b.el.className='eproj wave';
  b.el.style.width = b.w + 'px';
  const img=document.createElement('img'); img.src='wave.png'; b.el.appendChild(img);
  b.el.style.transform = `translate(${b.x}px, ${b.y}px)`;
  try{ (document.getElementById('enemyProjectiles')||document.body).appendChild(b.el); }catch(_){ }
  enemyProjectiles.push(b);
  if(playAudio){ try{ playSound(Sounds.enemyShoot); }catch(_){ } }
  return b;
}

/* Jump→Slam helper: go up, then fall to ground, then quake + wave */
function __bossJumpSlamAndWave(e){
  try{
    
// Start vibration.mp3 right as the attack begins
try {
  if (!window.Sounds) window.Sounds = {};
  if (!Sounds.vibration){
    try {
      Sounds.vibration = new Audio("vibration.mp3");
      Sounds.vibration.volume = 0.9;
      Sounds.vibration.preload = "auto";
    } catch(_){}
  }
  if (typeof playSound === "function") playSound(Sounds.vibration);
  else { try { Sounds.vibration.currentTime = 0; Sounds.vibration.play().catch(function(){}); } catch(_){ } }
} catch(_){}

if(!e || !e.el) return;
    const ground = (typeof groundY==='function'? (groundY()-e.h) : e.y);
    const jumpH = Math.max(20, Math.round((e.h||120)*0.35));  // 35% of sprite height
    const upDur = 280;    // ms ease-out
    const dnDur = 220;    // ms ease-in
    const t0 = performance.now();
    const startY = e.y;
    const peakY = Math.max(60, startY - jumpH);
    function easeOut(t){ return 1 - Math.pow(1-t, 2); }
    function easeIn(t){ return t*t; }
    let phase = 0; // 0 = up, 1 = down
    function step(now){
      if(!e || !e.el) return;
      if(phase===0){
        const p = Math.min(1, (now - t0)/upDur);
        const q = easeOut(p);
        e.y = Math.round(startY + (peakY - startY)*q);
        e.el.style.transform = `translate(${e.x}px, ${e.y}px)`;
        if (p < 1) { requestAnimationFrame(step); return; }
        phase = 1; requestAnimationFrame(step); return;
      } else {
        const t1 = t0 + upDur;
        const p = Math.min(1, (now - t1)/dnDur);
        const q = easeIn(p);
        e.y = Math.round(peakY + (ground - peakY)*q);
        e.el.style.transform = `translate(${e.x}px, ${e.y}px)`;
        if (p < 1) { requestAnimationFrame(step); return; }
        // Impact
        try{
          const cx = Math.round(e.x + e.w*0.5), cy = Math.round(e.y + e.h*0.9);
          const radius = Math.max(60, (e.w||120)*0.8);
          if (typeof spawnStompRing==='function') spawnStompRing(cx, cy, radius, 0.45);
          if (typeof bigQuake==='function') bigQuake(600);
        }catch(_){}
        try{
          e._shotHeight = 'low';
          if (typeof enemyShootWave==='function') enemyShootWave(e, true);
        }catch(_){}
      }
    }
    requestAnimationFrame(step);
  }catch(_){}
}
/* Boss L10: RANDOM 3-attack selector (non-invasive) */
function bossAttackFire(e){
  // choose: 1) normal, 2) bursts U/D/M, 3) stomp+wave
  const roll = Math.random();
  const DY = scaled(38);
  const delay = (ms, fn) => setTimeout(fn, ms);
  const fireOnce = (offY=0)=>{ const oy=e.y; e.y+=offY; enemyShoot(e, false); e.y=oy; };

  if(roll < 0.34){
    fireOnce(0);
    try{ playSound(Sounds.spit); }catch(_){}
  } else if(roll < 0.67){
    const bursts = [ {off:-DY,n:3}, {off:DY,n:3}, {off:0,n:3} ];
    let t=0;
    bursts.forEach(bu=>{
      for(let i=0;i<bu.n;i++){ delay(t, ()=> fireOnce(bu.off)); t+=70; }
      t+=120;
    });
    try{ playSound(Sounds.spit); }catch(_){}
  } else {
    const cx = e.x + e.w*0.5, cy = e.y + e.h*0.9;
    spawnStompRing(cx, cy, scaled(120), 0.6);
    try{ bigQuake(180); }catch(_){ screenShake(400); }
    delay(600, ()=>{ enemyShootWave(e, true); });
  }
}

function showPickupText(text, x, y){
  const el = document.createElement('div');
  el.className = 'bonus-float';   // ← rămâne EXACT așa

  // convertește "x4" în "+4 wood" dacă apelezi cu "x4"
  let t = String(text).trim();
  t = t.replace(/^x(\d+)/i, '+$1'); // x4 -> +4
  el.textContent = t;

  el.style.left = x + 'px';
  el.style.top  = y + 'px';
  document.body.appendChild(el);
  setTimeout(()=>{ try{ el.remove(); }catch{} }, 1000);
}

    function spawnResourceStackAt(cx, ground, type, amount){
  const size = scaled(90); // se va scala cu uiS
  const c = {
    el: document.createElement('div'),
    x: Math.round(cx - size/2),
    y: Math.round(ground - size - 8),
    w: size, h: size,
    type, amount,
    bobT: Math.random()*Math.PI*2,
    scale: 0.75, targetScale: 1.0, scaleSpeed: 6.0,
    collected: false, collectT: 0, collectDur: 0.22, opacity: 1
  };
  c.el.className = 'coin';
  c.el.style.width = size + 'px';

  const img = document.createElement('img');
  img.src = RES_IMG[type];
  c.el.appendChild(img);

  /* BADGE “×N” lipit de icon – ca în codul vechi */
  const badge = document.createElement('div');
  badge.className = 'coin-badge';
  badge.textContent = '×' + amount;
  c.el.appendChild(badge);

  coinsLayer.appendChild(c.el);
  coins.push(c);
  c.el.style.transform = `translate(${c.x}px, ${c.y}px) scale(${c.scale})`;
    // auto-despawn after 3s: flicker 3x then remove if not collected
    c.el.__coinRef = c;
    c.despawnTimer = setTimeout(()=>{
      if (c.collected) return;
      c.el.classList.add('flicker-out'); // CSS-driven flicker
      const removeAfter = 0.25 * 3 * 1000 + 40; // 3 flashes at .25s each
      setTimeout(()=>{
        if (c.collected) return;
        try{ c.el.remove(); }catch(_){}
        const idx = coins.indexOf(c);
        if (idx >= 0) coins.splice(idx, 1);
      }, removeAfter);
    }, 3000);
    
}

    /* ===== HUD Resurse (numerele din jos) ===== */
    let scrapCount = 0, woodCount = 0, circuitsCount = 0;
    function renderResourcesHud(){
      const s = document.getElementById('resScrap');
      const w = document.getElementById('resWood');
      const c = document.getElementById('resCircuits');
      if(!s || !w || !c) return;
      s.textContent = String(scrapCount|0);
      w.textContent = String(woodCount|0);
      c.textContent = String(circuitsCount|0);
    }

    function updateCoins(dt){
      for(let i=coins.length-1;i>=0;i--){
        const c = coins[i];

        if(!c.collected){
          c.bobT += dt*3.5;
          const bob = Math.sin(c.bobT) * 4;
          if(c.scale < c.targetScale) c.scale = Math.min(c.targetScale, c.scale + c.scaleSpeed*dt);

          c.el.style.transform = `translate(${c.x}px, ${c.y + bob}px) scale(${c.scale})`;
          c.el.style.opacity = c.opacity;

          const pw = player.w;
          const ph = (player.state==='crouch') ? Math.round(220*0.6) : player.h;
          const px = player.x, py = player.y + (player.h - ph);
          if(aabb(c.x, c.y, c.w, c.h, px, py, pw, ph)){
            c.collected = true; c.collectT = 0; if (c.despawnTimer){ try{ clearTimeout(c.despawnTimer); }catch(_){ } c.despawnTimer = null; } playSound(Sounds.coin);

            if(c.type==='scrap')      scrapCount    += c.amount;
            else if(c.type==='wood')  woodCount     += c.amount;
            else                      circuitsCount += c.amount;
            renderResourcesHud();

            const cx = c.x + c.w/2;
            const cy = Math.max(10, c.y - 16);
            const RES_LABEL = { scrap:'Scrap', wood:'Wood', circuits:'Circuits' };
showPickupText(`+${c.amount} ${RES_LABEL[c.type]||''}`, cx, cy);

          }
        } else {
          c.collectT += dt;
          const k = Math.min(1, c.collectT / c.collectDur);
          const s = 1 + 0.5*k;
          const up = -24*k;
          c.opacity = 1 - k;
          c.el.style.opacity = c.opacity;
          c.el.style.transform = `translate(${c.x}px, ${c.y + up}px) scale(${s})`;
          if(k >= 1){
            try{ c.el.remove(); }catch{}
            coins.splice(i,1);
          }
        }
      }
    }

    /* ===== Objective ===== */
    const objSlotsWrap = document.getElementById('objSlots');
    const objectiveSlots = [];
    (function buildObjective(){
      for(let i=0;i<10;i++){
        const slot = document.createElement('div');
        slot.className = 'obj-slot';
        const fill = document.createElement('div');
        fill.className = 'obj-fill';
        slot.appendChild(fill);
        objSlotsWrap.appendChild(slot);
        objectiveSlots.push(slot);
      }
    })();
    function updateObjective(nKills){
      for(let i=0;i<objectiveSlots.length;i++){
        if(i < nKills) objectiveSlots[i].classList.add('filled');
        else           objectiveSlots[i].classList.remove('filled');
      }
    }

/* ===== Timer ===== */
const timerEl=document.getElementById('timer');
let timeLeft = 60.0;
let timerStarted = false;
let gameEnded = false;
let lastTickSecond = null;

// Level system
let currentLevel = 1;
let levelTransitionActive = false;

function startGameTimer(){
  if(timerStarted) return;
  timerStarted = true;
  lastTickSecond = null;
}

function updateTimer(dt){
  if(!timerStarted || gameEnded || player.state==='dead' || levelTransitionActive) return;

  timeLeft -= dt;
  if(timeLeft < 0) timeLeft = 0;

  const sec = Math.ceil(timeLeft);
  timerEl.textContent = String(sec);

  if (timeLeft > 0 && timeLeft <= 10 && sec !== lastTickSecond) {
    lastTickSecond = sec;
    playSound(Sounds.countdownTick);
  }

  if(timeLeft <= 0){
    if (kills >= killTargetForLevel(currentLevel)) beginLevelTransition();
    else timeUp();
  }
}

    function updateEnemyProjectiles(dt){
      for(let i=enemyProjectiles.length-1;i>=0;i--){
        const b=enemyProjectiles[i];
        b.t += dt;
        b.x += b.vx * dt;
        b.y += (b.vy || 0) * dt;
        b.el.style.transform = `translate(${b.x}px, ${b.y}px) rotate(${b.angleDeg || 0}deg)`;

        const pw = player.w;
        const ph = player.h;                    // << fără valori fixe
        const px = player.x, py = player.y + (player.h - ph);

        if(b._perfectDodged){
          if(b.x<-240 || b.x>window.innerWidth+240 || b.y<-240 || b.y>window.innerHeight+240){ try{ if(b._animTimer) clearInterval(b._animTimer); }catch(_){ } b.el.remove(); enemyProjectiles.splice(i,1); }
          continue;
        }
        const hitPlayerBox = aabb(b.x,b.y,b.w,b.h, px,py,pw,ph);
        const pdPad = Math.max(16, (typeof scaled === 'function' ? scaled(18) : 18));
        const perfectNearMiss = perfectDodgeWindowOpen() && aabb(b.x,b.y,b.w,b.h, px-pdPad, py-pdPad, pw+pdPad*2, ph+pdPad*2);
        if((hitPlayerBox || perfectNearMiss) && player.state!=='dead' && player.state!=='predead' && !player.isInvisible){
          if(player.state==='slide' && perfectNearMiss && !hitPlayerBox){
            triggerPerfectDodge({ kind:'projectile-nearmiss', source:(b && (b.ownerIsBoss ? 'boss-projectile' : 'enemy-projectile')) || 'projectile' });
            phaseProjectileThroughPlayer(b);
            continue;
          }
          if(player.state==='slide' && (perfectDodgeWindowOpen() || perfectDodgeActive() || player.invulTimer>0)){
            if(perfectDodgeWindowOpen()) triggerPerfectDodge({ kind:'projectile', source:(b && (b.ownerIsBoss ? 'boss-projectile' : 'enemy-projectile')) || 'projectile' });
            phaseProjectileThroughPlayer(b);
            continue;
          }
          if(player.invulTimer>0){
            try{ if(b._animTimer) clearInterval(b._animTimer); }catch(_){ } b.el.remove(); enemyProjectiles.splice(i,1);
            continue;
          }
          if(hitPlayerBox){
            window.lastDamageSource='projectile';
            screenShake(250);
            applyPlayerHitFromProjectile(b);
            try{ if(b._animTimer) clearInterval(b._animTimer); }catch(_){ } b.el.remove(); enemyProjectiles.splice(i,1);
            continue;
          }
        }
        if(b.x<-240 || b.x>window.innerWidth+240 || b.y<-240 || b.y>window.innerHeight+240){ try{ if(b._animTimer) clearInterval(b._animTimer); }catch(_){ } b.el.remove(); enemyProjectiles.splice(i,1); }
      }
    }

    /* ===== AI + animații dușmani ===== */
    
/* === Boss laugh overlay animation v3: L/R frames, 80% duration, no-shoot while laughing === */
function __startBossLaughOverlay(e, audio){
  try{
    if(!e || !e.el) return;

    // choose frames by facing
    const FRAMES = {
      left:  ['laugh1left.png','laugh2left.png'],
      right: ['laugh1right.png','laugh2right.png']
    };
    const frames = FRAMES[(e.dir==='left')?'left':'right'] || ['laugh1right.png','laugh2right.png'];

    // avoid duplicates
    if(e.__laughOverlay){ try{ e.__laughOverlay.remove(); }catch(_){ } e.__laughOverlay = null; }

    const ov = document.createElement('img');
    ov.className = 'boss-laugh-overlay';
    ov.style.position = 'absolute';
    ov.style.left = '0';
    ov.style.top = '0';
    ov.style.width = '100%';
    ov.style.height = '100%';
    ov.style.pointerEvents = 'none';
    ov.style.zIndex = '3'; // above base sprite and hp bar
    ov.style.imageRendering = 'pixelated';
    const base = e.el.firstChild || null;
    if(base) { try{ base.style.visibility = 'hidden'; }catch(_){} }
    e.el.appendChild(ov);
    e.__laughOverlay = ov;
    e.__laughing = true;
    e.__laughNoShoot = true;
    e.__shieldedThisLaugh = false;

    // end time: 80% of the laugh.mp3 duration
    function nowMs(){ return (performance && performance.now) ? performance.now() : Date.now(); }
    let endAt = null;
    function setEndFromAudio(){
      try{
        if(audio && isFinite(audio.duration) && audio.duration > 0){
          endAt = nowMs() + Math.max(0, (audio.duration * 0.8) * 1000);
        }
      }catch(_){}
    }
    setEndFromAudio();
    // Fallback if duration not known yet
    if(endAt === null){ endAt = nowMs() + 1200; }
    try{ audio && audio.addEventListener && audio.addEventListener('loadedmetadata', ()=>{ if(endAt) return; setEndFromAudio(); }); }catch(_){}

    let idx = 0, last = 0;
    const frameMs = 120;

    function cleanup(){
      e.__laughing=false;
      e.__laughNoShoot=false;
      e.__shieldedThisLaugh = false;
      try{ cancelAnimationFrame(e.__laughRAF); }catch(_){}
      e.__laughRAF = null;
      try{ if(ov && ov.parentNode) ov.parentNode.removeChild(ov); }catch(_){}
      e.__laughOverlay = null;
      if(base){ try{ base.style.visibility = ''; }catch(_){} }
    }

    function step(){
      try{
        if(!e || !e.el){ cleanup(); return; }

        // stop when boss dies or 80% time passes or audio ended
        if(e.dead || (typeof e.hp==='number' && e.hp<=0) || e.__removed){ cleanup(); return; }
        if((audio && (audio.ended || (audio.paused && audio.currentTime>0))) || (endAt && nowMs() >= endAt)){ cleanup(); return; }

        // actively block firing while laughing
        try{
          e.shooting = (!player || !player.isInvisible) && (false); e.hasFired = false;
          if(typeof e.shootTimer === 'number') e.shootTimer = Math.max(e.shootTimer, 0.2);
        }catch(_){}

        if(!ov.isConnected){ e.el.appendChild(ov); } // ensure attached

        // keep overlay transform aligned with base
        try{ ov.style.transform = (base && base.style && base.style.transform) ? base.style.transform : ''; }catch(_){}

        const t = nowMs();
        if(t - last >= frameMs){
          last = t; idx = (idx+1) % frames.length;
          const src = frames[idx];
          if(!ov.src || !ov.src.endsWith(src)) ov.src = src;
        }
        e.__laughRAF = requestAnimationFrame(step);
      }catch(_){ e.__laughRAF = requestAnimationFrame(step); }
    }
    e.__laughRAF = requestAnimationFrame(step);
  }catch(_){}
}

function updateEnemies(dt){
      if (player && player.isInvisible) { try { for (let i=0;i<enemies.length;i++){ const e=enemies[i]; 
        
        // === INVISIBILITY PATROL ROUTE (random legs, fixed 2s pauses) ===
        if (window.player && player.isInvisible && !e.dead) {
          // cancel combat and ensure movement state
          e.shooting=false; e.chasing=false;
          if(e.state!=='dead' && e.state!=='hit'){ e.state='move'; }
          if(e.state==='shoot'){ e.state='move'; e.hasFired=false; e.shootAnimTimer=0; e.shootAnimIndex=0; }
          if (typeof e.shootTimer === 'number') e.shootTimer=Math.max(e.shootTimer, 0.8);

          // initialize patrol once
          if (!e.__patrolInit) {
            e.__patrolInit = true;
            e.patrolDir = (Math.random() < 0.5) ? -1 : 1;        // -1 left, 1 right
            e.patrolLegT = 0.8 + Math.random() * 0.8;  // shorter legs: 0.8–1.6s            // 1.6–4.0 s
            const base = (typeof scaled==='function') ? scaled(160) : 160;
            const jitter = (typeof scaled==='function') ? scaled(40 + Math.random()*80) : (40 + Math.random()*80);
            e.patrolSpeed = base + jitter;
            e.patrolState = 'move';
            e.patrolPauseT = 0;
          }

          const W = (window.innerWidth || document.documentElement.clientWidth);
          const leftEdge = 0;
          const rightEdge = Math.max(0, W - e.w);

          
          // forced stop injected at activation
          if ((e.staggerT||0) > 0){ e.patrolState='pause'; e.patrolPauseT = Math.max(e.patrolPauseT||0, e.staggerT); }
if (e.patrolState === 'move') {
            // lock facing to patrol direction; no player-facing flips
            e.dir = (e.patrolDir < 0) ? 'left' : 'right';
            const spd = (typeof e.patrolSpeed==='number') ? e.patrolSpeed : ((typeof scaled==='function')?scaled(200):200);
            e.vx = e.patrolDir * spd;
            e.x += e.vx * dt;
            e.patrolLegT -= dt;

            // stop at edges or when timer expires
            if (e.patrolDir < 0 && e.x <= leftEdge) { e.x = leftEdge; e.patrolState='pause'; e.patrolPauseT=2.0; e.vx=0; }
            else if (e.patrolDir > 0 && e.x >= rightEdge) { e.x = rightEdge; e.patrolState='pause'; e.patrolPauseT=2.0; e.vx=0; }
            else if (e.patrolLegT <= 0) { e.patrolState='pause'; e.patrolPauseT=2.0; e.vx=0; }

            // keep run frame
            try{
              if(enemyRunFrames && enemyRunFrames[e.dir] && e.el && e.el.firstChild){
                const frames = enemyRunFrames[e.dir];
                const idx = (e.runIndex|0) % frames.length;
                e.el.firstChild.src = frames[idx];
              }
            }catch(_){}

          } else if (e.patrolState === 'pause') {
            // show question mark on healthbar
            try{
              if(!e.qmarkEl){ const img=document.createElement('img'); img.src='question.png'; img.alt='?'; img.className='qmark'; e.qmarkEl=img; e.el.appendChild(img); } else if(!e.qmarkEl.isConnected){ e.el.appendChild(e.qmarkEl); }
            }catch(_){}
            e.vx = 0;
            e.patrolPauseT -= dt;
            if((e.staggerT||0)>0){ e.staggerT = Math.max(0, e.staggerT - dt); }
            if (e.patrolPauseT <= 0) {
              // hide qmark, flip, randomize next leg
              try{ if(e.qmarkEl){ e.qmarkEl.remove(); e.qmarkEl=null; } }catch(_){}
              e.patrolDir = -e.patrolDir;
              e.patrolLegT = 0.8 + Math.random() * 0.8;  // shorter legs: 0.8–1.6s
              const base = (typeof scaled==='function') ? scaled(160) : 160;
              const jitter = (typeof scaled==='function') ? scaled(40 + Math.random()*80) : (40 + Math.random()*80);
              e.patrolSpeed = base + jitter;
              e.patrolState = 'move';
            }
          }

          // apply transform
          try{ e.el.style.transform = `translate(${e.x}px, ${e.y}px)`; }catch(_){}

          
          // advance run animation during patrol
          try{
            if(enemyRunFrames && enemyRunFrames[e.dir] && e.el && e.el.firstChild){
              e.runFrameDuration = e.runFrameDuration || 0.1;
              e.runTimer = (e.runTimer||0) + dt;
              if(e.runTimer >= e.runFrameDuration){
                e.runTimer -= e.runFrameDuration;
                e.runIndex = ((e.runIndex||0) + 1) % enemyRunFrames[e.dir].length;
              }
              const frames = enemyRunFrames[e.dir];
              const idx = (e.runIndex|0) % frames.length;
              e.el.firstChild.src = frames[idx];
            }
          }catch(_){}
continue; // skip normal AI for this enemy while invisible
        }
// === INVISIBILITY PATROL ROUTE (random legs, fixed 2s pauses) ===
        if (window.player && player.isInvisible && !e.dead) {
          e.shooting=false; e.chasing=false;
          if(e.state!=='dead' && e.state!=='hit'){ e.state='move'; }
          e.hasFired=false; e.shootAnimTimer=0; e.shootAnimIndex=0;
          if (typeof e.shootTimer === 'number') e.shootTimer=Math.max(e.shootTimer, 0.8);

          if (!e.__patrolInit) {
            e.__patrolInit = true;
            e.patrolDir = (Math.random() < 0.5) ? -1 : 1;
            e.patrolLegT = 0.8 + Math.random() * 0.8;  // shorter legs: 0.8–1.6s
            const base = (typeof scaled==='function') ? scaled(160) : 160;
            const jitter = (typeof scaled==='function') ? scaled(40 + Math.random()*80) : (40 + Math.random()*80);
            e.patrolSpeed = base + jitter;
            e.patrolState = 'move';
            e.patrolPauseT = 0;
          }

          const W = (window.innerWidth || document.documentElement.clientWidth);
          const leftEdge = 0;
          const rightEdge = Math.max(0, W - e.w);

          if (e.patrolState === 'move') {
            e.dir = (e.patrolDir < 0) ? 'left' : 'right';
            const spd = (typeof e.patrolSpeed === 'number') ? e.patrolSpeed : ((typeof scaled==='function')?scaled(200):200);
            e.vx = e.patrolDir * spd;
            e.x += e.vx * dt;
            e.patrolLegT -= dt;

            if (e.patrolDir < 0 && e.x <= leftEdge) { e.x = leftEdge; e.patrolState='pause'; e.patrolPauseT=2.0; e.vx=0; }
            else if (e.patrolDir > 0 && e.x >= rightEdge) { e.x = rightEdge; e.patrolState='pause'; e.patrolPauseT=2.0; e.vx=0; }
            else if (e.patrolLegT <= 0) { e.patrolState='pause'; e.patrolPauseT=2.0; e.vx=0; }

            try{
              if(enemyRunFrames && enemyRunFrames[e.dir] && e.el && e.el.firstChild){
                const frames = enemyRunFrames[e.dir];
                const idx = (e.runIndex|0) % frames.length;
                e.el.firstChild.src = frames[idx];
              }
            }catch(_){}

          } else if (e.patrolState === 'pause') {
            try{
              if(!e.qmarkEl){ const img=document.createElement('img'); img.src='question.png'; img.alt='?'; img.className='qmark'; e.qmarkEl=img; e.el.appendChild(img); } else if(!e.qmarkEl.isConnected){ e.el.appendChild(e.qmarkEl); }
            }catch(_){}
            e.vx = 0;
            e.patrolPauseT -= dt;
            if (e.patrolPauseT <= 0) {
              try{ if(e.qmarkEl){ e.qmarkEl.remove(); e.qmarkEl=null; } }catch(_){}
              e.patrolDir = -e.patrolDir;
              e.patrolLegT = 0.8 + Math.random() * 0.8;  // shorter legs: 0.8–1.6s
              const base = (typeof scaled==='function') ? scaled(160) : 160;
              const jitter = (typeof scaled==='function') ? scaled(40 + Math.random()*80) : (40 + Math.random()*80);
              e.patrolSpeed = base + jitter;
              e.patrolState = 'move';
            }
          }

          try{ e.el.style.transform = `translate(${e.x}px, ${e.y}px)`; }catch(_){}

          continue;
        }
if(!e) continue; e.desireVX=0; e.vx=0; e.ax=0; e.chasing=false; e.shooting=(!player || !player.isInvisible) && (false); } } catch(_){ } }
for(let i=enemies.length-1;i>=0;i--){
        const e=enemies[i];
        
        // Skip base AI while invisible; patrol already ran above
        if (window.player && player.isInvisible && !e.dead) { continue; }
if(e.tpCD>0) e.tpCD=Math.max(0, e.tpCD-dt);
        if((e.dashAttackCD||0) > 0) e.dashAttackCD = Math.max(0, e.dashAttackCD - dt);
        if((e.lungeAttackCD||0) > 0) e.lungeAttackCD = Math.max(0, e.lungeAttackCD - dt);
        if((e.burstShotCD||0) > 0) e.burstShotCD = Math.max(0, e.burstShotCD - dt);
        if((e.strafeShotCD||0) > 0) e.strafeShotCD = Math.max(0, e.strafeShotCD - dt);
        if((e.crossEvadeCooldown||0) > 0) e.crossEvadeCooldown = Math.max(0, e.crossEvadeCooldown - dt);
        if((e.stutterEvadeCD||0) > 0) e.stutterEvadeCD = Math.max(0, e.stutterEvadeCD - dt);
        if((e.dropEvadeCD||0) > 0) e.dropEvadeCD = Math.max(0, e.dropEvadeCD - dt);
        if((e.mindGameCD||0) > 0) e.mindGameCD = Math.max(0, e.mindGameCD - dt);
        if((e.chainCD||0) > 0) e.chainCD = Math.max(0, e.chainCD - dt);
        if((e.comboBias||0) > 0) e.comboBias = Math.max(0, e.comboBias - dt * 0.16);
        if((e.attackLandedBias||0) > 0) e.attackLandedBias = Math.max(0, e.attackLandedBias - dt * 0.34);

        if(e.dead){
          clearEnemyAttackVfx(e);
          const img = e.el && e.el.firstChild;
          const ground = groundY() + ENEMY_GROUND_SHIFT;
          const corpseGround = ground + ENEMY_DEATH_EXTRA;
          if(!e.deathStage) e.deathStage = 'fall';
          if(e.deathStage === 'fall'){
            e.vy += 2400*dt;
            e.vy = Math.min(e.vy, scaled(900));
            e.y += e.vy*dt;
            if(!e.coinDropped && (e.y + e.h >= ground - 8)){
              e.coinDropped = true;
              const cx = e.x + e.w*0.5;
              const type = pick(['scrap','wood','circuits']);
              const amount = irand(1,5);
              spawnResourceStackAt(cx, ground, type, amount);
            }
            if(e.y + e.h >= corpseGround){
              e.y = corpseGround - e.h;
              e.vy = 0;
              e.deathStage = 'blink';
              e.deathBlinkTimer = 0.42 + Math.random()*0.14;
              e.deathFadeTimer = 0.38;
              e.deathFade = false;
              e.el.style.opacity = '1';
            }
          }else if(e.deathStage === 'blink'){
            e.deathBlinkTimer = Math.max(0, (e.deathBlinkTimer || 0) - dt);
            const pulse = Math.sin(((e.deathBlinkTimer || 0) * 28) + (e.x * 0.01));
            const flash = pulse > 0 ? 1 : 0;
            if(img) img.style.filter = flash ? 'brightness(1.1) sepia(1) saturate(7) hue-rotate(-28deg)' : '';
            if(e.deathBlinkTimer <= 0){
              e.deathStage = 'fade';
              e.deathFade = true;
              e.el.style.transition = 'opacity 0.38s ease';
              e.el.classList.add('fade');
            }
          }else if(e.deathStage === 'fade'){
            e.deathFadeTimer = Math.max(0, (e.deathFadeTimer || 0) - dt);
            if(img) img.style.filter = 'brightness(1.0) sepia(1) saturate(5) hue-rotate(-24deg)';
            if(e.deathFadeTimer <= 0){
              try{ if(img) img.style.filter = ''; }catch(_){ }
              try{ e.el.remove(); }catch(_){ }
              enemies.splice(i,1);
              spawnEnemy();
            }
          }
          e.el.style.transform=`translate(${e.x}px, ${e.y}px)`;
          continue;
        }

        
        // === Bite-priority block: if biting, animate bite and skip other anim states ===
        if (e.biting){
          e.biteTimer = (e.biteTimer || 0) + dt;
          const dur = (e.biteFrameDur && e.biteFrameDur>0) ? e.biteFrameDur : 0.10;
          if (e.biteTimer >= dur){
            e.biteTimer -= dur;
            e.biteFrame = ((e.biteFrame|0) + 1);
            if (bossBiteFrames[e.dir] && e.biteFrame >= bossBiteFrames[e.dir].length){
              e.biting = false;
              e.biteFrame = 0;
            }
          }
          if (e.biting){
            e.el.firstChild.src = (bossBiteFrames[e.dir] || bossBiteFrames.right)[e.biteFrame|0];
            applyBossSpriteOffset(e);
            e.el.style.transform=`translate(${e.x}px, ${e.y}px)`;
            continue;
          }
        }
        // === end bite-priority ===

        if(e.state==='hit'){
          clearEnemyAttackVfx(e);
          e.hitTimer -= dt; e.hitFrameTimer -= dt;
          if(e.hitFrameTimer<=0){ e.hitFrameTimer = e.hitFrameDur; e.hitIndex = (e.hitIndex+1) % enemyHitFrames[e.dir].length; }
          e.el.firstChild.src = enemyHitFrames[e.dir][e.hitIndex]; applyBossSpriteOffset(e);
          e.knockVX *= e.knockDecay; if(Math.abs(e.knockVX)<0.5) e.knockVX=0;
          e.x += e.knockVX * dt; clampEnemyXInFrame(e); e.y += e.vy * dt; e.vy += 1200*dt;

          const maxY = groundY() - e.h - 10;
          if (e.y > maxY) { e.y = maxY; e.vy = 0; }
          if (e.y < -200) e.y = -200;

          e.el.style.transform=`translate(${e.x}px, ${e.y}px)`;
          if(e.hitTimer<=0){ e.state='move'; e.hitIndex=0; }
          continue;
        }

        if(updateEnemyAttackChain(e, dt)){
          if(!timerStarted && !e.dead && e.x >= 0 && (e.x + e.w) <= window.innerWidth){
            startGameTimer();
          }
          continue;
        }

        if(e.state==='attack'){
          updateEnemySpecialAttack(e, dt);
          if(!timerStarted && !e.dead && e.x >= 0 && (e.x + e.w) <= window.innerWidth){
            startGameTimer();
          }
          continue;
        }

        if(e.state==='shoot'){
          e.shootAnimTimer -= dt;

          
          if(!e.hasFired && e.shootAnimIndex >= 1){
            if(e.isBoss && typeof currentLevel!=='undefined' && currentLevel===10){
              bossAttackFire(e);
            } else {
              enemyShoot(e, false);
              try{ playSound(Sounds.spit); }catch(_){}
            }
            e.hasFired = true;
          }

          if(e.shootAnimTimer <= 0){
            e.shootAnimTimer += e.shootFrameDuration;
            e.shootAnimIndex++;
            if(e.shootAnimIndex >= enemyShootFrames[e.dir].length){
              e.state = 'move';
              e.shooting = (!player || !player.isInvisible) && (false);
              e.runIndex = 0; e.runTimer = 0;
              e.el.firstChild.src = enemyRunFrames[e.dir][0];
              const pressure = (!e.isBoss ? enemyAttackPressure(e) : 0);
              const fastShot = rand(0.55*currentDiff.enemyShootRate, 1.15*currentDiff.enemyShootRate);
              const normalShot = rand(1.25*currentDiff.enemyShootRate, 2.45*currentDiff.enemyShootRate);
              e.shootTimer = (!e.isBoss ? (normalShot * (1 - Math.min(0.68, pressure)) + fastShot * Math.min(0.68, pressure)) : rand(1.6*currentDiff.enemyShootRate, 3.0*currentDiff.enemyShootRate));
              holdEnemyNextAction(e, 0.08, 0.14);
              if(!e.isBoss) maybeQueueEnemyAttackChain(e, 'projectile', false);
            } else {
              e.el.firstChild.src = enemyShootFrames[e.dir][e.shootAnimIndex];
            }
          }

          e.el.style.transform = `translate(${e.x}px, ${e.y}px)`;
          if(!timerStarted && !e.dead && e.x >= 0 && (e.x + e.w) <= window.innerWidth){
            startGameTimer();
          }
          continue;
        }

        if(e.entering){
          const bounds = getEnemyFrameBounds(e);
          const threatIntro = (!player.isInvisible ? detectIncomingProjectileThreat(e) : null);
          const minFlightY = scaled(156);
          const maxFlightY = groundY() - e.h - 10;
          if((e.introReactCD||0) > 0) e.introReactCD = Math.max(0, e.introReactCD - dt);
          if((e.introShotCD||0) > 0) e.introShotCD = Math.max(0, e.introShotCD - dt);
          if(e.isTeleporting){
            e.vx = 0;
            e.intentVX = 0;
            e.el.style.transform = `translate(${e.x}px, ${e.y}px)`;
            continue;
          }
          const introDir = (typeof e.entryGlideDir === 'number' && e.entryGlideDir !== 0)
            ? Math.sign(e.entryGlideDir)
            : (((e.entryTargetX || e.x) >= e.x) ? 1 : -1);
          if(threatIntro && (e.introReactCD||0) <= 0 && (threatIntro.timeToImpact || 99) <= 0.60){
            if(Math.random() < 0.80){
              teleportEnemyDuringEntry(e, minFlightY, maxFlightY);
              continue;
            }
            e.introReactCD = 0.30 + Math.random()*0.18;
          }
          const startX = (e.entryStartX != null ? e.entryStartX : e.x);
          const targetX = (typeof e.entryTargetX === 'number') ? e.entryTargetX : e.x;
          const totalDX = Math.max(scaled(80), Math.abs((e.entryDistanceX || 0) || (targetX - startX)));
          const remainingX = targetX - e.x;
          let styleMul = 1;
          if(e.entryStyle === 'swoop'){
            styleMul = 1.03;
          }else if(e.entryStyle === 'hesitate'){
            styleMul = 0.95;
          }else if(e.entryStyle === 'rush'){
            styleMul = 1.18;
          }
          const entrySpeed = Math.max(scaled(190), (e.entrySpeed || scaled(240)) * styleMul);
          const maxStepX = entrySpeed * dt;
          const stepX = clamp(remainingX, -maxStepX, maxStepX);
          const nextX = e.x + stepX;
          const rawProgress = 1 - (Math.abs(targetX - nextX) / totalDX);
          const progress = clamp(rawProgress, 0, 1);
          e.entryT = progress;
          if((e.entryPathBiasHold||0) > 0){
            e.entryPathBiasHold = Math.max(0, e.entryPathBiasHold - dt);
          }else if(Math.abs(e.entryPathBiasTarget || 0) > 0.001){
            e.entryPathBiasTarget *= Math.max(0, 1 - dt * 4.6);
          }
          const biasFollow = Math.min(1, dt * 5.6);
          e.entryPathBias = (e.entryPathBias || 0) + (((e.entryPathBiasTarget || 0) - (e.entryPathBias || 0)) * biasFollow);
          let desiredY = sampleEnemyEntryPathY(e, progress, minFlightY, maxFlightY);
          desiredY = clamp(desiredY, minFlightY, maxFlightY);
          const canIntroShoot = e.introCanShoot && !player.isInvisible && (e.introShotsLeft || 0) > 0 && (e.introShotCD || 0) <= 0 && progress >= 0.18 && progress <= 0.88 && e.y <= (e.entryCruiseY || e.y) + scaled(26);
          if(canIntroShoot){
            enemyShoot(e, true);
            e.introShotsLeft = Math.max(0, (e.introShotsLeft || 0) - 1);
            e.introShotCD = 0.42 + Math.random()*0.22;
          }
          e.vx = stepX / Math.max(dt, 0.016);
          e.intentVX = e.vx;
          e.x = nextX;
          e.y += clamp(desiredY - e.y, -scaled(520) * dt, scaled(520) * dt);
          if((introDir > 0 && e.x >= bounds.left) || (introDir < 0 && e.x <= bounds.right)) clampEnemyXInFrame(e);
          e.entryOpacity = 1;
          e.el.style.opacity = '1';
          e.runTimer += dt;
          if(e.runTimer >= e.runFrameDuration){
            e.runTimer -= e.runFrameDuration;
            e.runIndex = (e.runIndex + 1) % enemyRunFrames[e.dir].length;
            e.el.firstChild.src = enemyRunFrames[e.dir][e.runIndex];
          }
          e.el.style.transform = `translate(${e.x}px, ${e.y}px)`;
          if(!timerStarted && !e.dead && e.x >= bounds.left && (e.x + e.w) <= bounds.right + scaled(6)){
            startGameTimer();
          }
          const entryDone = (introDir > 0)
            ? (e.x >= targetX - scaled(6))
            : (e.x <= targetX + scaled(6));
          if(entryDone){
            e.x = clamp(targetX, bounds.safeLeft, bounds.safeRight);
            e.vx = introDir * Math.max(scaled(84), entrySpeed * 0.34);
            e.intentVX = e.vx;
            const smoothFollowY = player
              ? clamp(player.y - scaled(22) + rand(-scaled(8), scaled(16)), 60, groundY() - e.h - 10)
              : clamp(e.y, 60, groundY() - e.h - 10);
            e.targetY = Math.max(e.y, smoothFollowY);
            e.changeYTimer = 0.82 + Math.random()*0.28;
            e.entering = false;
            e.introGlideDur = 0.58 + Math.random()*0.24;
            e.introGlideT = e.introGlideDur;
            e.introGlideBaseY = e.targetY;
            e.introGlideAmp = scaled(6) + Math.random()*scaled(6);
            e.introGlideFreq = 1.7 + Math.random()*0.7;
            e.aiPattern = 'normal';
            e.flowMode = chooseEnemyFlowMode(e, getEnemyAttackContext(e), getEnemyPlayerRead(e, getEnemyAttackContext(e)));
            e.flowTimer = 0.52 + Math.random()*0.68;
            e.introGuardT = 0.42 + Math.random()*0.24;
            e.shootTimer = Math.max(e.shootTimer || 0, 0.52 + Math.random()*0.20);
            e.introCanShoot = false;
            e.introShotsLeft = 0;
            e.entryEvadeT = 0;
            e.entryJukeT = 0;
            e.entryPathBias = 0;
            e.entryPathBiasTarget = 0;
            e.entryPathBiasHold = 0;
          }
          continue;
        }

        /* mișcare normală */
        const minGap = scaled(230) * enemyTemperValue(e, 'minGapMul', 1);
        const maxGap = scaled(390) * enemyTemperValue(e, 'maxGapMul', 1);
        const chaseV = scaled(182) * enemyTemperValue(e, 'chaseBias', 1);
        const retreatV = scaled(228) * enemyTemperValue(e, 'retreatBias', 1);

        const centerE = e.x + e.w/2;
        const centerP = player.x + player.w/2;
        const gap = Math.abs(centerP - centerE);
        const dirToPlayer = Math.sign(centerP - centerE) || 1;

        
        // === Scaled behavior: shoot in range, teleport if too close ===
        const shootRange = scaled(540);
        e.shooting = (!player || !player.isInvisible) && ((gap <= shootRange));

        const tpThreshold = scaled(300);
        if (ENEMY_CAN_TELEPORT && e.isBoss && !e.dead && (e.tpCD||0) === 0 && gap < tpThreshold && !(e.isBoss && typeof currentLevel!=='undefined' && currentLevel===10)) {
          teleportToBehind(e, 360); // gap is scaled inside
          e.tpCD = 4; // seconds cooldown
          continue; // skip further movement this frame while teleporting
        }
let desireVX = 0;
if (player && player.isInvisible) { desireVX = 0; }
        if(!(e.isBoss && e.staticBoss)){
          // doar dacă nu e într-un pattern special (evade / kite / jumpEvade) lăsăm chase/retreat-ul de bază să decidă
          if (e.aiPattern === 'normal' || !e.aiPattern) {
            const tooCloseGap = minGap * 0.8;
            if (gap < tooCloseGap){
              // foarte aproape de player -> forțează retragere puternică
              desireVX = -dirToPlayer * (retreatV * 1.1);
            } else if(gap < minGap){
              desireVX = -dirToPlayer * retreatV;
            } else if(gap > maxGap){
              desireVX =  dirToPlayer * chaseV;
            } else {
              desireVX = 0;
            }
          }
        }
        if(e.aiPattern === 'normal' || !e.aiPattern){
          e.flowTimer = Math.max(0, (e.flowTimer || 0) - dt);
          if((e.flowTimer || 0) <= 0){
            const flowCtx = getEnemyAttackContext(e);
            e.flowMode = chooseEnemyFlowMode(e, flowCtx, getEnemyPlayerRead(e, flowCtx));
            e.flowTimer = 0.65 + Math.random()*1.05;
            e.flowDir = (Math.random() < 0.5 ? -1 : 1);
          }
          const flowCtx = getEnemyAttackContext(e);
          const flowRead = getEnemyPlayerRead(e, flowCtx);
          if(e.flowMode === 'stalk'){
            if(gap >= minGap * 0.86 && gap <= maxGap * 1.08){
              desireVX *= 0.78;
              desireVX += e.flowDir * scaled(24);
            }
          }else if(e.flowMode === 'bait'){
            if(gap >= minGap * 0.70 && gap <= maxGap * 1.12){
              const pulse = Math.sin(((e.floatT || 0) * 2.6) + e.x * 0.01);
              desireVX += dirToPlayer * pulse * scaled(58);
              if(flowRead.playerCamping) desireVX += dirToPlayer * scaled(42);
            }
          }else if(e.flowMode === 'orbit'){
            if(!flowCtx.enemyNearEdge){
              desireVX += e.flowDir * scaled(82);
              if(gap < minGap * 0.92) desireVX += -dirToPlayer * scaled(44);
              else if(gap > maxGap * 1.06) desireVX += dirToPlayer * scaled(46);
            }
          }
        }

        // === SMART EVASION & KITE PATTERNS (projectile-aware, fluid) ===
        {
          const lvl = (typeof currentLevel!=='undefined'? currentLevel:1);
          const smart = Math.min(1, Math.max(0, (lvl-1)/34)); // 0..1 across ~1..35
          const dodgeProb = ((lvl < 5) ? 0.0 : Math.min(0.75, 0.20 + 0.03 * (lvl-5))) * enemyTemperValue(e, 'dodgeBias', 1);
          const tpEvadeProb = ((lvl < 5) ? 0.0 : Math.min(0.38, 0.08 + 0.02 * (lvl-5))) * enemyTemperValue(e, 'tpEvadeBias', 1);
          const bossTpEvadeProb = ((lvl < 8) ? 0.0 : Math.min(0.55, 0.16 + 0.02 * (lvl-8))) * enemyTemperValue(e, 'tpEvadeBias', 1);

          // pattern state: 'normal' | 'evade' | 'kite' | 'jumpEvade' | 'edgeEscape' | 'crossEvade'
          if (!e.aiPattern) {
            e.aiPattern = 'normal';
            e.aiPatternTimer = 0;
          }
          if (typeof e.aiPatternTimer === 'number' && e.aiPatternTimer > 0) {
            e.aiPatternTimer = Math.max(0, e.aiPatternTimer - dt);
            if (e.aiPatternTimer === 0 && e.aiPattern !== 'normal') {
              const finishedPattern = e.aiPattern;
              if (e.aiPattern === 'crossEvade') {
                const crossTargetX = (typeof e.crossEvadeTargetX === 'number')
                  ? e.crossEvadeTargetX
                  : (((window.innerWidth || document.documentElement.clientWidth || 1280) - e.w));
                const closeToCrossTarget = Math.abs(e.x - crossTargetX) <= scaled(26);
                if (!closeToCrossTarget && (e.crossEvadeFailsafe || 0) > 0) {
                  e.aiPatternTimer = 0.08;
                } else {
                  e.aiPattern = 'normal';
                }
              } else {
                e.aiPattern = 'normal';
              }
              if(isEnemyExclusivePattern(finishedPattern)){
                holdEnemyNextAction(e, 0.08, 0.16);
              }
            }
          }

          // cooldowns
          e.dodgeCD = Math.max(0, (e.dodgeCD||0) - dt);
          e.evadeTimer = Math.max(0, (e.evadeTimer||0) - dt);
          e.kiteCooldown = Math.max(0, (e.kiteCooldown||0) - dt);
          e.jumpEvadeCooldown = Math.max(0, (e.jumpEvadeCooldown||0) - dt);
          if((e.crossEvadeFailsafe||0) > 0) e.crossEvadeFailsafe = Math.max(0, e.crossEvadeFailsafe - dt);
          if((e.crossEvadeRecovery||0) > 0) e.crossEvadeRecovery = Math.max(0, e.crossEvadeRecovery - dt);
          else if((e.crossEvadeLoopGuard||0) > 0) e.crossEvadeLoopGuard = Math.max(0, e.crossEvadeLoopGuard - dt * 0.40);
          if((e.introGuardT||0) > 0) e.introGuardT = Math.max(0, e.introGuardT - dt);

          // dacă dodge-ul s-a terminat și avem o înălțime de bază memorată,
          // aducem inamicul înapoi spre un nivel apropiat de player, nu la Y-ul vechi fix
          if ((e.evadeTimer||0) <= 0 && typeof e.evadeBaseY === 'number') {
            const minY = 60, maxY = e.isBoss
              ? (groundY() - e.h + (typeof currentLevel!=='undefined' && currentLevel===10 ? 120 : 0))
              : (groundY() - e.h - 10);

            // refacem poziția țintă relativ la player, ca în baseline-ul de hover,
            // ca să revină lângă player, nu la un Y vechi
            const hoverOff = (typeof scaled === 'function' ? scaled(40) : 40);
            let baseY = player ? clamp(player.y - hoverOff, minY, maxY) : e.y;

            e.targetY = e.isBoss ? (groundY() - e.h) : baseY;
            e.changeYTimer = Math.min(e.changeYTimer||0.25, 0.18);
            e.evadeBaseY = undefined;
          };

          const tacticalCtxNow = getEnemyAttackContext(e);
          const pReadNow = getEnemyPlayerRead(e, tacticalCtxNow);
          if (!e.isBoss && !player.isInvisible && e.state === 'move' && !e.entering) {
            let urgency = enemyActionUrgency(e, tacticalCtxNow, pReadNow);
            if((e.introGuardT||0) > 0) urgency *= 0.30;
            if (urgency > 0) {
              const extraTick = dt * urgency * (0.72 + 0.92 * enemyTemperValue(e, 'aggression', 1));
              e.shootTimer = Math.max(-0.02, (e.shootTimer || 0) - extraTick);
              if ((e.aiPattern === 'normal' || e.aiPattern === 'kite') && urgency >= 0.92) {
                if (tacticalCtxNow.gapX <= scaled(250) && tacticalCtxNow.laneMid && tacticalCtxNow.playerGrounded) {
                  e.shootTimer = Math.min(e.shootTimer || 0, 0.05 + Math.random()*0.04);
                } else if (urgency >= 0.68) {
                  e.shootTimer = Math.min(e.shootTimer || 0, 0.28 + Math.random()*0.10);
                }
              }
            }
          }

          // === Detect closest incoming projectile aimed at the enemy ===
          let threat = detectIncomingProjectileThreat(e);

          const canTeleportEvade = ENEMY_CAN_TELEPORT && !e.dead && !e.entering &&
                                   (typeof currentLevel==='undefined' || !e.isBoss || currentLevel!==10) &&
                                   (((e.isBoss) && bossTpEvadeProb > 0) || ((!e.isBoss) && tpEvadeProb > 0));
          let info = getEnemyAttackContext(e);
          const pRead = getEnemyPlayerRead(e, info);
          let edgeResetStarted = false;
          if(!player.isInvisible && e.state === 'move' && e.evadeTimer <= 0 && e.dodgeCD <= 0 && info.enemyNearEdge && e.aiPattern !== 'crossEvade'){
            const pinnedLeft = e.x <= info.edgeLeftX + scaled(10);
            const pinnedRight = e.x >= info.edgeRightX - scaled(10);
            const forcedDir = pinnedLeft ? 1 : (pinnedRight ? -1 : 0);
            const underPressure = forcedDir !== 0 && (pRead.movingTowardEnemy || pRead.playerCamping || info.gapX <= scaled(190));
            if(underPressure && shouldEnemyCrossEvade(e, info, 'edgeReset', pRead, null, forcedDir) && beginEnemyCrossEvade(e, info, 'edgeReset', forcedDir)){
              e.dodgeCD = 0.52;
              edgeResetStarted = true;
            }
          }

          // === Choose reaction to projectile (primary) ===
          if (!edgeResetStarted && threat && e.dodgeCD <= 0 && e.evadeTimer <= 0 && !player.isInvisible) {
            const evadeRoll = Math.random();
            info = getEnemyAttackContext(e);
            const temperDodge = enemyTemperValue(e, 'dodgeBias', 1);
            const temperTp = enemyTemperValue(e, 'tpEvadeBias', 1);
            const temperCross = enemyTemperValue(e, 'crossEvadeBias', 1);
            const threatSoon = (threat.timeToImpact || 1) <= 0.58;
            const threatImmediate = (threat.timeToImpact || 1) <= 0.34;
            const mustReact = threatImmediate || ((threat.laneDanger || 0) >= 0.52 && threatSoon);

            const adaptiveTune = getAdaptiveEnemyTuning(e, info);
            let crossChance = 0;
            if (shouldEnemyCrossEvade(e, info, 'projectile', pRead, threat)) {
              crossChance = 0.16;
              if (info.enemyNearEdge) crossChance += 0.18;
              if (pRead.playerJumpingToward) crossChance += 0.16;
              if (pRead.movingTowardEnemy && pRead.likelyContinueDir) crossChance += 0.12;
              if (threatImmediate) crossChance += 0.20;
              else if (threatSoon) crossChance += 0.12;
              crossChance = Math.min(0.62, crossChance * temperCross);
              if(adaptiveTune && !e.isBoss){
                crossChance = Math.min(0.72, crossChance * (adaptiveTune.crossEvadeMul || 1));
              }
            }

            const canStutter = (e.stutterEvadeCD||0) <= 0 && info.laneMid && !info.enemyNearEdge;
            const canDrop = (e.dropEvadeCD||0) <= 0;
            let teleportRollProb = e.isBoss ? bossTpEvadeProb : tpEvadeProb;
            if(adaptiveTune){
              teleportRollProb *= (adaptiveTune.teleportMul || 1);
              if(!e.isBoss && (pRead.playerCamping || info.gapX >= scaled(260))){
                teleportRollProb += Math.max(0, adaptiveTune.flankTeleportBias || 0) * 0.18;
              }
              if(adaptiveTune.exposed){
                teleportRollProb *= 0.62;
                crossChance *= 0.76;
              }
              teleportRollProb = Math.min(e.isBoss ? 0.82 : 0.58, teleportRollProb);
            }
            const wantTeleport = canTeleportEvade && (e.tpCD||0) <= 0 && Math.random() < teleportRollProb;
            const chooseMicroEvade = !wantTeleport && !player.isInvisible && (threatImmediate || (threatSoon && (threat.laneDanger||0) >= 0.58));

            if (crossChance > 0 && Math.random() < crossChance) {
              if(adaptiveTune && !e.isBoss && adaptiveTune.focusTag) pulseAdaptiveCounterCue(e, adaptiveTune.focusTag, adaptiveTune.exposed ? 'exposed' : 'read');
              if (beginEnemyCrossEvade(e, info, 'projectile')) {
                e.dodgeCD = adaptiveTune && adaptiveTune.exposed ? 0.88 : 1.05;
              } else {
                e.dodgeCD = 0.25;
              }
            } else if (chooseMicroEvade && canStutter && Math.random() < (0.34 + Math.max(0, temperDodge - 1) * 0.18)) {
              e.aiPattern = 'stutterEvade';
              e.aiPatternTimer = 0.20 + Math.random()*0.10;
              e.stutterEvadeDir = (Math.random() < 0.55 ? -info.dirToPlayer : info.dirToPlayer);
              e.stutterEvadeBaseY = e.y;
              e.targetY = clamp(e.y + ((threat.py < (e.y + e.h*0.5)) ? scaled(36) : -scaled(24)), 60, groundY() - e.h - 10);
              e.evadeTimer = e.aiPatternTimer;
              e.stutterEvadeCD = 0.82 + Math.random()*0.45;
              e.dodgeCD = 0.48;
            } else if (chooseMicroEvade && canDrop && Math.random() < 0.36) {
              e.aiPattern = 'dropEvade';
              e.aiPatternTimer = 0.24 + Math.random()*0.12;
              e.dropEvadeDir = (Math.random() < 0.5 ? -info.dirToPlayer : info.dirToPlayer);
              e.dropEvadeBaseY = e.y;
              const minY = 60, maxY = groundY() - e.h - 10;
              e.targetY = clamp(e.y + scaled(96), minY, maxY);
              e.evadeTimer = e.aiPatternTimer;
              e.dropEvadeCD = 0.96 + Math.random()*0.54;
              e.dodgeCD = 0.54;
            } else if (wantTeleport) {
              if(adaptiveTune && !e.isBoss && adaptiveTune.focusTag) pulseAdaptiveCounterCue(e, adaptiveTune.focusTag, adaptiveTune.exposed ? 'exposed' : 'read');
              teleportToBehind(e, 360);
              e.tpCD = adaptiveTune && adaptiveTune.exposed ? 3.35 : 3.0;
              e.aiPattern = 'evade';
              e.aiPatternTimer = adaptiveTune && adaptiveTune.exposed ? 0.42 : 0.35;
              e.dodgeCD = adaptiveTune && adaptiveTune.exposed ? 0.56 : 0.7;
            } else {
              const ignoreCut = mustReact ? -1 : Math.max(0.38, dodgeProb - Math.min(0.12, (temperDodge - 1) * 0.12) - (threatImmediate ? 0.16 : (threatSoon ? 0.08 : 0)));
              if (!mustReact && evadeRoll > ignoreCut) {
                e.dodgeCD = 0.25;
              } else {
                const ex = e.x + e.w*0.5;
                const eTop = e.y;
                const eBot = e.y + e.h;
                const eMid = eTop + (eBot - eTop)*0.5;
                const pMid = threat.py;
                const bandPad = (typeof scaled === 'function' ? scaled(6) : 6);
                let away = 1;

                if (pMid < eMid - bandPad) {
                  away = 1;
                } else if (pMid > eMid + bandPad) {
                  away = -1;
                } else if (pRead.playerAirPressure && playerMidY() < eMid) {
                  away = 1;
                } else if (pRead.playerCamping) {
                  away = -1;
                } else {
                  away = (Math.random() < 0.5) ? 1 : -1;
                }

                const minY = 60;
                const maxY = e.isBoss
                  ? (groundY() - e.h + (typeof currentLevel!=='undefined' && currentLevel===10 ? 120 : 0))
                  : (groundY() - e.h - 10);

                const baseMag  = Math.max(240, 460*uiS * (0.8 + 0.6*smart));
                let mag        = baseMag * 1.42;
                if (away === 1) mag *= 1.58;
                if (threatSoon) mag *= 1.16;
                if (threatImmediate) mag *= 1.22;
                if ((threat.laneDanger || 0) > 0.6) mag *= 1.12;
                if (pRead.playerCamping) mag *= 1.08;

                let proposedY = clamp(e.y + away * mag, minY, maxY);
                const minShift = (typeof scaled === 'function' ? scaled(4) : 4);
                if (Math.abs(proposedY - e.y) < minShift) {
                  const altY = clamp(e.y - away * mag, minY, maxY);
                  if (Math.abs(altY - e.y) > Math.abs(proposedY - e.y)) {
                    proposedY = altY;
                    away = -away;
                  }
                }

                e.targetY = e.isBoss ? (groundY() - e.h) : proposedY;
                e.evadeBaseY = e.y;
                e.evadeTimer   = 0.24 + Math.random()*0.12;
                e.changeYTimer = e.evadeTimer + 0.08;

                const sideSign = Math.sign((player.x + player.w*0.5) - ex) || 1;
                const playerMoveDir = Math.sign(playerRead.recentVX || player.vx || 0);
                const lateralDir = playerMoveDir !== 0 ? -playerMoveDir : -sideSign;
                const lateral = Math.max(96, 210*uiS * (0.45 + 0.7*smart));
                desireVX += lateralDir * lateral;

                e.aiPattern = 'evade';
                e.aiPatternTimer = e.evadeTimer;
                e.dodgeCD = threatImmediate ? 0.56 : 0.66;
              }
            }
          } else {
            // === No direct projectile threat: react to jump-in or kite/wander ===
            const ex = e.x + e.w*0.5;
            const ey = e.y + e.h*0.5;
            const px = player.x + player.w*0.5;
            const py = player.y + player.h*0.5;
            const tacticalCtx = getEnemyAttackContext(e);
            const pRead = getEnemyPlayerRead(e, tacticalCtx);

            const dxPE = ex - px;
            const horizClose = Math.abs(dxPE) < scaled(320);
            const vertClose  = Math.abs(py - ey) < scaled(220);

            // Post-bite proximity: dacă playerul rămâne lipit după mușcătură,
            // inamicul va zbura peste player spre partea opusă
            const veryCloseHoriz = Math.abs(dxPE) < scaled(160);
            const veryCloseVert  = Math.abs(py - ey) < scaled(140);

            if (e.postBiteActive) {
              if (veryCloseHoriz && veryCloseVert && !player.isInvisible) {
                e.postBiteCloseTimer = (e.postBiteCloseTimer || 0) + dt;
              } else {
                e.postBiteCloseTimer = 0;
              }

              if ((e.postBiteCloseTimer || 0) >= 1.5 &&
                  (e.aiPattern === 'normal' || e.aiPattern === 'kite')) {
                const minY = 60;
                const maxY = e.isBoss
                  ? (groundY() - e.h + (typeof currentLevel!=='undefined' && currentLevel===10 ? 120 : 0))
                  : (groundY() - e.h - 10);

                // țintim deasupra playerului, ca la un salt peste cap
                const targetAbove = py - scaled(80);
                e.targetY = clamp(targetAbove, minY, maxY);

                // fugim în partea opusă față de player
                const dashAway = (dxPE > 0 ? 1 : -1);
                const dashSpeed = retreatV * 1.05;
                desireVX = dashAway * dashSpeed;

                e.aiPattern = 'jumpEvade';
                e.aiPatternTimer = 0.40 + Math.random()*0.25;
                e.jumpEvadeCooldown = 1.0;

                e.postBiteActive = false;
                e.postBiteCloseTimer = 0;
              }
            } else {
              // mică decădere, doar ca să nu rămână blocat cu un timer mare
              if (typeof e.postBiteCloseTimer === 'number' && e.postBiteCloseTimer > 0) {
                e.postBiteCloseTimer = Math.max(0, e.postBiteCloseTimer - dt);
              }
            }

            const playerIsJumping = player && (player.state === 'jump');
            const playerDir = Math.sign(playerRead.recentVX || player.vx || (px - ex));
            const playerMovingTowardEnemy = (playerDir > 0 && dxPE > 0) || (playerDir < 0 && dxPE < 0);

            // === Jump-evade: player sare spre inamic, enemy citește direcția și decide vertical/cross ===
            if (playerIsJumping &&
                playerMovingTowardEnemy &&
                horizClose && vertClose &&
                e.jumpEvadeCooldown <= 0 &&
                !player.isInvisible &&
                (e.aiPattern === 'normal' || e.aiPattern === 'kite')) {

              if (shouldEnemyCrossEvade(e, tacticalCtx, 'jumpread', pRead, null) &&
                  (pRead.playerJumpingToward || (pRead.movingTowardEnemy && pRead.likelyContinueDir && tacticalCtx.laneMid))) {
                if (beginEnemyCrossEvade(e, tacticalCtx, 'jumpread')) {
                  e.jumpEvadeCooldown = 1.20;
                }
              } else {
                const minY = 60;
                const maxY = e.isBoss
                  ? (groundY() - e.h + (typeof currentLevel!=='undefined' && currentLevel===10 ? 120 : 0))
                  : (groundY() - e.h - 10);

                const goOver = (Math.random() < 0.5);
                if (goOver) {
                  // trece deasupra playerului
                  const targetAbove = py - scaled(80);
                  e.targetY = clamp(targetAbove, minY, maxY);
                } else {
                  // trece pe sub player, aproape de sol
                  e.targetY = maxY;
                }

                const dashAway = (dxPE > 0 ? 1 : -1); // se duce mai departe pe partea lui
                const dashSpeed = retreatV * 1.05;
                desireVX = dashAway * dashSpeed;

                e.aiPattern = 'jumpEvade';
                e.aiPatternTimer = 0.40 + Math.random()*0.25;
                e.jumpEvadeCooldown = 1.0;
              }
            } else if ((e.aiPattern === 'normal' || e.aiPattern === 'kite') && !player.isInvisible) {
              // === Edge-escape near level borders + kiting ===
              const W = (window.innerWidth || document.documentElement.clientWidth || 1280);
              const marginX = (typeof scaled === 'function' ? scaled(40) : 40);
              const nearLeft  = e.x <= marginX;
              const nearRight = (e.x + e.w) >= (W - marginX);

              if ((nearLeft || nearRight) && gap < minGap*0.9 && !e.isBoss) {
                // Enemy is pushed to screen edge: climb above player and dash across to the open side
                const minY = 60;
                const maxY = e.isBoss
                  ? (groundY() - e.h + (typeof currentLevel!=='undefined' && currentLevel===10 ? 120 : 0))
                  : (groundY() - e.h - 10);

                const py = player.y + player.h*0.5;
                let escapeY = py - (typeof scaled === 'function' ? scaled(140) : 140);
                escapeY = clamp(escapeY, minY, maxY);
                e.targetY = escapeY;

                e.aiPattern = 'edgeEscape';
                e.aiPatternTimer = 0.8 + Math.random()*0.5;
                e.edgeEscapeDir = nearLeft ? 1 : -1;
                // ține această țintă verticală puțin timp, ca să aibă timp să se ridice peste player
                e.changeYTimer = Math.max(e.changeYTimer || 0, 0.22 + Math.random()*0.10);
              } else {
                // === Kiting pattern: gentle backstep to provoke player ===
                if (gap > minGap*0.9 && gap < maxGap*1.8 && e.kiteCooldown <= 0) {
                  if (Math.random() < (0.45 * enemyTemperValue(e, 'kiteBias', 1)) * dt) {
                    e.aiPattern = 'kite';
                    e.aiPatternTimer = 0.7 + Math.random()*0.7;
                    e.kiteCooldown = 1.6;
                    e.kiteDir = -dirToPlayer || 1; // always move away from player while facing him
                  }
                }
              }

            }
          }

          // === Apply pattern overrides on horizontal desireVX ===
          if (e.aiPattern === 'kite' && e.aiPatternTimer > 0) {
            const kiteSpeed = retreatV * 0.75;
            desireVX = e.kiteDir * kiteSpeed;
          } else if (e.aiPattern === 'jumpEvade' && e.aiPatternTimer > 0) {
            const px = player.x + player.w*0.5;
            const ex = e.x + e.w*0.5;
            const awayDir = (ex > px ? 1 : -1);
            const dashSpeed = retreatV * 1.0;
            desireVX = awayDir * dashSpeed;
          } else if (e.aiPattern === 'crossEvade' && e.aiPatternTimer > 0) {
            const crossDir = (typeof e.crossEvadeDir === 'number' && e.crossEvadeDir !== 0)
              ? Math.sign(e.crossEvadeDir)
              : ((e.x < player.x) ? 1 : -1);
            const totalT = Math.max(0.001, e.crossEvadeDuration || 0.9);
            const progress = clamp(1 - (e.aiPatternTimer / totalT), 0, 1);
            const easedX = (progress < 0.5)
              ? (2 * progress * progress)
              : (1 - Math.pow(-2 * progress + 2, 2) / 2);
            const targetX = (typeof e.crossEvadeTargetX === 'number') ? e.crossEvadeTargetX : enemyCrossTargetX(e, crossDir);
            const startX = (typeof e.crossEvadeStartX === 'number') ? e.crossEvadeStartX : e.x;
            const startY = (typeof e.crossEvadeStartY === 'number') ? e.crossEvadeStartY : e.y;
            const endY = (typeof e.crossEvadeEndY === 'number') ? e.crossEvadeEndY : enemyGroundTargetY(e);
            const arcLift = Math.max(scaled(96), e.crossEvadeArcLift || Math.abs(startY - endY) + scaled(120));
            const desiredX = startX + (targetX - startX) * easedX;
            const baseY = startY + (endY - startY) * progress;
            const parabolaY = clamp(baseY - (4 * arcLift * progress * (1 - progress)), 60, groundY() - e.h - 10);
            const prevX = e.x;
            const crossBounds = getEnemyFrameBounds(e);
            const lockedX = clamp(desiredX, crossBounds.left, crossBounds.right);
            e.crossEvadeLockedX = lockedX;
            e.vx = (lockedX - prevX) / Math.max(dt, 0.016);
            const exMid = lockedX + e.w*0.5;
            const pxMid = player.x + player.w*0.5;
            if (!e.crossEvadePassedPlayer) {
              if ((crossDir > 0 && exMid >= pxMid + scaled(18)) || (crossDir < 0 && exMid <= pxMid - scaled(18)) || progress >= 0.56) {
                e.crossEvadePassedPlayer = true;
              }
            }
            e.crossEvadeDesiredY = parabolaY;
            e.targetY = parabolaY;
            desireVX = e.vx;
            const reached = (progress >= 0.985) || ((crossDir > 0) ? (e.x >= targetX - scaled(18)) : (e.x <= targetX + scaled(18)));
            if (reached) {
              e.x = clamp(targetX, crossBounds.safeLeft, crossBounds.safeRight);
              e.vx = 0;
              e.crossEvadeLockedX = null;
              e.crossEvadeDesiredY = endY;
              e.crossEvadePassedPlayer = true;
              e.aiPatternTimer = 0;
              if((e.crossEvadeReason||'') === 'edgeReset'){
                e.aiPattern = 'kite';
                e.aiPatternTimer = 0.38 + Math.random()*0.18;
                const awayFromPlayer = ((e.x + e.w*0.5) < (player.x + player.w*0.5)) ? -1 : 1;
                e.kiteDir = awayFromPlayer;
                e.kiteCooldown = Math.max(e.kiteCooldown||0, 0.70);
              }else{
                e.aiPattern = 'normal';
              }
              holdEnemyNextAction(e, 0.08, 0.16);
              e.crossEvadeLockedX = null;
            }
          } else if (e.aiPattern === 'stutterEvade' && e.aiPatternTimer > 0) {
            const total = Math.max(0.001, e.evadeTimer || 0.26);
            const progress = clamp(1 - (e.aiPatternTimer / total), 0, 1);
            const burst = progress < 0.45 ? 1.0 : -0.52;
            desireVX = (e.stutterEvadeDir || -dirToPlayer) * retreatV * 1.08 * burst;
            e.targetY = clamp((e.stutterEvadeBaseY || e.y) + Math.sin(progress * Math.PI) * scaled(36), 60, groundY() - e.h - 10);
          } else if (e.aiPattern === 'dropEvade' && e.aiPatternTimer > 0) {
            const total = Math.max(0.001, e.evadeTimer || 0.30);
            const progress = clamp(1 - (e.aiPatternTimer / total), 0, 1);
            desireVX = (e.dropEvadeDir || -dirToPlayer) * retreatV * 0.72;
            const dip = (progress < 0.62) ? progress / 0.62 : (1 - progress) / 0.38;
            e.targetY = clamp((e.dropEvadeBaseY || e.y) + scaled(112) * Math.max(0, dip), 60, groundY() - e.h - 10);
          } else if (e.aiPattern === 'edgeEscape' && e.aiPatternTimer > 0) {
            const escapeDir = (typeof e.edgeEscapeDir === 'number' && e.edgeEscapeDir !== 0)
              ? Math.sign(e.edgeEscapeDir)
              : (-dirToPlayer || 1);
            const escapeSpeed = retreatV * 1.15;

            let dashFactor = 1;
            try {
              const px = player.x + player.w*0.5;
              const py = player.y + player.h*0.5;
              const ex2 = e.x + e.w*0.5;
              const ey2 = e.y + e.h*0.5;

              const safeVert = (typeof scaled === 'function' ? scaled(80) : 80);
              const verticalGap = Math.abs(ey2 - py);

              // cât timp este aproape la aceeași înălțime cu playerul, nu facem aproape deloc dash orizontal:
              // îl lăsăm întâi să se ridice peste player, apoi fugim în lateral
              if (verticalGap < safeVert) {
                dashFactor = 0.0;
              }
            } catch(_){}

            desireVX = escapeDir * escapeSpeed * dashFactor;
          }

          // === Smooth wander only in normal pattern, to avoid jitter but keep it lively ===
          if (e.aiPattern === 'normal') {
            if (typeof e.wanderTimer !== 'number') e.wanderTimer = 0;
            if (typeof e.wanderVX !== 'number') e.wanderVX = 0;

            e.wanderTimer -= dt;
            if (e.wanderTimer <= 0) {
              e.wanderTimer = 0.85 + Math.random()*1.10;
              const baseW = Math.max(28, 64*uiS * (0.45 + 0.45*smart));
              e.wanderVX = (Math.random()*2 - 1) * baseW;
            }

            desireVX += e.wanderVX;
          }
        }
e.changeYTimer -= dt; if(e.changeYTimer<=0){
          if (e.aiPattern === 'crossEvade' && e.aiPatternTimer > 0) {
            e.changeYTimer = 0.12;
          } else if((e.introGlideT||0) > 0) {
            e.changeYTimer = Math.max(e.changeYTimer||0, 0.16);
          } else {
          const minY = 60, maxY = e.isBoss ? (groundY() - e.h + (typeof currentLevel!=='undefined' && currentLevel===10 ? 120 : 0)) : (groundY() - e.h - 10);
          // baseline vertical: bias near player's Y, but nu urca după player dacă e deasupra
          const hoverOff = (typeof scaled === 'function' ? scaled(40) : 40);
          let baseY = player ? clamp(player.y - hoverOff, minY, maxY) : e.y;
          if (!e.isBoss && player) {
            const eyMid = e.y + e.h*0.5;
            const pyMid = player.y + player.h*0.5;
            const upTol = (typeof scaled === 'function' ? scaled(8) : 8);
            // dacă playerul este clar deasupra, evităm să urcăm după el (lăsăm doar evade/edgeEscape să ridice enemy)
            if (pyMid < eyMid - upTol && baseY < e.y) {
              baseY = e.y;
            }
          }
          e.targetY = e.isBoss ? (groundY() - e.h) : clamp(baseY, minY, maxY);
          e.changeYTimer = rand(0.5, 1.0);
          }
        }
        e.floatT = (e.floatT || 0) + dt * 2.0;
        const crossEvadingNow = (e.aiPattern === 'crossEvade' && e.aiPatternTimer > 0);
        const sine = crossEvadingNow ? 0 : (Math.sin(e.floatT) * ((e.isBoss && typeof currentLevel!=='undefined' && currentLevel===10) ? 120 : ((e.isBoss && e.staticBoss) ? 10 : (e.isBoss ? 0 : 16))));

        e.knockVX *= e.knockDecay; if(Math.abs(e.knockVX) < 0.5) e.knockVX = 0;
        {
          const crossEvading = crossEvadingNow;
          const maxVX = crossEvading ? Math.max(retreatV * 2.10, e.crossEvadeSpeed || 0) : retreatV;
          if (typeof e.intentVX !== 'number') e.intentVX = desireVX;
          const intentLerp = crossEvading ? Math.min(1, dt * 9.0) : Math.min(1, dt * 4.2);
          e.intentVX += (desireVX - e.intentVX) * intentLerp;
          const targetVX = clamp(e.intentVX + e.knockVX, -maxVX, maxVX);
          const accel = crossEvading ? Math.max(scaled(2600), e.crossEvadeAccel || 0) : scaled(620);
          if (typeof e.vx !== 'number') e.vx = 0;
          let deltaVX = targetVX - e.vx;
          const maxStep = accel * dt;
          if (deltaVX >  maxStep) deltaVX =  maxStep;
          if (deltaVX < -maxStep) deltaVX = -maxStep;
          e.vx += deltaVX;
        }

        
        // If player is idle for 2s, pick a random nudge: advance or retreat (unpredictable)
        if (__idleTimer > 2) {
          const nudge = (Math.random() < 0.5 ? -1 : 1); // -1 advance, +1 retreat relative to player
          const nudgeV = scaled(120) * (nudge < 0 ? enemyTemperValue(e, 'chaseBias', 1) : enemyTemperValue(e, 'retreatBias', 1));
          desireVX += nudge * nudgeV * dirToPlayer;
        }
if(!(e.isBoss && e.staticBoss)){ e.x += e.vx*dt; clampEnemyXInFrame(e); } else { e.x = e.staticBossX; }
        if(crossEvadingNow && typeof e.crossEvadeLockedX === 'number'){
          e.x = clamp(e.crossEvadeLockedX, getEnemyFrameBounds(e).left, getEnemyFrameBounds(e).right);
        }
        let vSpeed = scaled(190);
        if (e.aiPattern === 'crossEvade') { vSpeed = scaled(780); }
        else if (e.aiPattern === 'evade' || e.aiPattern === 'jumpEvade' || e.aiPattern === 'edgeEscape' || e.aiPattern === 'stutterEvade' || e.aiPattern === 'dropEvade') { vSpeed = scaled(460); }
        let toT = clamp((e.targetY - e.y), -vSpeed, vSpeed);

        // dacă este un evade în jos (targetY mai mare decât poziția curentă),
        // amplificăm mult pasul vertical ca să coboare foarte agresiv
        if (e.aiPattern === 'evade' && e.evadeTimer > 0 && e.targetY > e.y) {
          toT = clamp(toT * 8.0, -vSpeed, vSpeed);
        }

        if (crossEvadingNow && typeof e.crossEvadeDesiredY === 'number') {
          e.y = e.crossEvadeDesiredY;
        } else {
          e.y += toT*dt + sine*dt;
        }

        if((e.introGlideT||0) > 0 && !crossEvadingNow){
          const glideDur = Math.max(0.001, e.introGlideDur || 0.9);
          const glideProgress = 1 - ((e.introGlideT || 0) / glideDur);
          const glideFade = Math.max(0, 1 - glideProgress * 0.68);
          const glideWave = Math.sin((e.floatT || 0) * (e.introGlideFreq || 2.6) + (e.entryPhaseOffset || 0));
          e.targetY = clamp((e.introGlideBaseY || e.y) + glideWave * (e.introGlideAmp || 0) * glideFade, 60, groundY() - e.h - 10);
          e.introGlideT = Math.max(0, e.introGlideT - dt);
        }
        const minY = 60, maxY = e.isBoss ? (groundY() - e.h + (typeof currentLevel!=='undefined' && currentLevel===10 ? 120 : 0)) : (groundY() - e.h - 10);
        if(e.y<minY) e.y=minY; if(e.y>maxY) e.y=maxY;

                if (!e.dir) {
          e.dir = (e.x < player.x) ? 'right' : 'left';
        } else {
          const cx = e.x + e.w*0.5;
          const px = player.x + player.w*0.5;
          // only flip when there's a clear separation, avoid jitter when overlapped
          if (Math.abs(cx - px) > scaled(40)) {
            e.dir = (cx < px) ? 'right' : 'left';
          }
        }
e.runTimer += dt;
        if(e.runTimer >= e.runFrameDuration){
          e.runTimer -= e.runFrameDuration;
          e.runIndex = (e.runIndex + 1) % enemyRunFrames[e.dir].length;
        
  { const frameNo = e.runIndex + 1;
          // Boss wing-flap knockback
          try{
            if(e && e.isBoss && !e.dead){
              if (frameNo === 4 || frameNo === 9 || frameNo === 14){
                // push the player away from the boss center on flap frames
                const ex = (e.x||0) + (e.w||0)/2;
                const px = (player.x||0) + (player.w||0)/2;
                const dir = (px >= ex) ? 1 : -1;
                const impulse = (typeof scaled==='function' ? scaled(520) : 520);
                player.knockVX += dir * impulse;
                try{ if(typeof smallScreenShake==='function') smallScreenShake(120); else if(typeof screenShake==='function') screenShake(120); }catch(_){}
              }
            }
          }catch(_){}
 if (frameNo === 4 || frameNo === 9 || frameNo === 14) { if (Sounds && Sounds.flapLow) { try { Sounds.flapLow.currentTime = 0; Sounds.flapLow.play(); } catch(e){} } } }
}
        e.el.firstChild.src = enemyRunFrames[e.dir][e.runIndex]; applyBossSpriteOffset(e);

         e.el.style.transform=`translate(${e.x}px, ${e.y}px)`;

        if(enemyExclusivePatternActive(e)){
          holdEnemyNextAction(e, 0.08, 0.16);
        } else {
          e.shootTimer -= dt;
          if(e.shootTimer <= 0){
            beginEnemyShoot(e);
          }
        }

        if(!timerStarted && !e.dead && e.x >= 0 && (e.x + e.w) <= window.innerWidth){
          startGameTimer();
        }
      }
    }

    function aabb(ax,ay,aw,ah,bx,by,bw,bh){ return ax<bx+bw && ax+aw>bx && ay<by+bh && ay+ah>by; }

    let kills = 0;
    const killsEl = document.getElementById('kills');
    function renderKills(){ killsEl.textContent = `${kills} / ${killTargetForLevel(currentLevel)}`; }

    function showBonus(text="+5s"){
      const el = document.createElement('div');
      el.className = 'bonus-float';
      el.textContent = text;
      const cx = player.x + player.w/2;
      const top = Math.max(10, player.y - 24);
      el.style.left = cx + 'px';
      el.style.top  = top + 'px';
      document.body.appendChild(el);
      setTimeout(()=>{ try{ el.remove(); }catch{} }, 1000);
    }

    function addKill(){
      kills++;
      renderKills();
      updateObjective(kills);
      timeLeft += 5;
      showBonus('+5s');
      playSound(Sounds.bing);
      if (kills >= killTargetForLevel(currentLevel)) beginLevelTransition();
    }

    /* ===== Love/Death ===== */
    function applyPlayerHitFromProjectile(bullet){
      if (player && player.isInvisible) return { hit:false, reason:'invisible' };
if(controlsLocked) return { hit:false, reason:'controls-locked' };
      if(player.state==='dead' || player.state==='predead') return { hit:false, reason:'dead' };
      if (player.state === 'slide') {
        if (perfectDodgeWindowOpen()) {
          triggerPerfectDodge({ kind:'projectile', source:(bullet && (bullet.ownerIsBoss ? 'boss-projectile' : 'enemy-projectile')) || 'projectile' });
          return { hit:false, dodged:true, perfect:true };
        }
        if (perfectDodgeActive() || player.invulTimer>0) {
          return { hit:false, dodged:true, perfect:false };
        }
      }
      if(player.invulTimer>0) return { hit:false, reason:'invulnerable' };
      if (player.state === 'crouch' || player.state === 'slide' || player.h < scaled(220) - 1) {
        restorePlayerStandHeightKeepFeet();
      }

      const bulletCenter = bullet.x + bullet.w/2;
      const playerCenter = player.x + player.w/2;
      const away = Math.sign(playerCenter - bulletCenter) || 1;
      player.knockVX = away * player.knockBoostX;
      player.vy = -player.knockBoostY;

      player.shooting = false;
      player.state='hit';
      try{
        const floor = groundY();
        if(player.y + player.h > floor){
          player.y = floor - player.h;
          if(player.vy > 0) player.vy = 0;
        }
      }catch(_){}
          try{
            const ownerIsBoss = (typeof b!=='undefined' && (b.isBossProjectile || b.ownerIsBoss))
                              || (typeof bullet!=='undefined' && (bullet.isBossProjectile || bullet.ownerIsBoss))
                              || (typeof currentLevel!=='undefined' && currentLevel===10);
            if(ownerIsBoss && Math.random() < 0.30){
              if(!Sounds.bossLaugh){ Sounds.bossLaugh = new Audio('laugh.mp3'); }
              Sounds.bossLaugh.currentTime = 0;
              Sounds.bossLaugh.play && Sounds.bossLaugh.play().catch(()=>{});
            }
          }catch(_){}
      player.hitTimer=player.hitDuration;
      player.hitIndex=0;
      player.hitFrameTimer=player.hitFrameDuration;
      player.invulTimer = player.invulDuration;

      setImg(hitFrames[player.facing][player.hitIndex]); playSound(Sounds.hit); try{window.haptic&&window.haptic.hit();}catch{} try{window.haptic&&window.haptic.hit();}catch{}
      setHealth(health - playerDamageFromBullet);
      return { hit:true, dodged:false };
    }
    function applyPlayerHitFromMelee(hit){
      if (player && player.isInvisible) return { hit:false, reason:'invisible' };
      if(controlsLocked) return { hit:false, reason:'controls-locked' };
      if(player.state==='dead' || player.state==='predead') return { hit:false, reason:'dead' };
      if(player.state==='slide'){
        if (perfectDodgeWindowOpen()) {
          triggerPerfectDodge({ kind:'melee', source:(hit && hit.kind) || 'melee' });
          return { hit:false, dodged:true, perfect:true };
        }
        if (perfectDodgeActive() || player.invulTimer>0) {
          return { hit:false, dodged:true, perfect:false };
        }
      }
      if(player.invulTimer>0) return { hit:false, reason:'invulnerable' };
      if (player.state === 'crouch' || player.state === 'slide' || player.h < scaled(220) - 1) {
        restorePlayerStandHeightKeepFeet();
      }
      const kind = (hit && hit.kind) || 'lunge';
      const dir = (hit && typeof hit.dir === 'number' && hit.dir !== 0) ? Math.sign(hit.dir) : ((playerMidX() >= (hit && hit.source ? enemyMidX(hit.source) : playerMidX())) ? 1 : -1);
      const dashMul = (kind === 'dash') ? 1.35 : 0.95;
      const dmg = Math.min(40, Math.max(2, Math.round(playerDamageFromBullet * dashMul)));
      player.knockVX = dir * player.knockBoostX * (kind === 'dash' ? 1.45 : 0.95);
      player.vy = -player.knockBoostY * (kind === 'dash' ? 0.55 : 0.35);
      player.shooting = false;
      player.state = 'hit';
      try{
        const floor = groundY();
        if(player.y + player.h > floor){
          player.y = floor - player.h;
          if(player.vy > 0) player.vy = 0;
        }
      }catch(_){}
      player.hitTimer = player.hitDuration;
      player.hitIndex = 0;
      player.hitFrameTimer = player.hitFrameDuration;
      player.invulTimer = Math.max(player.invulDuration, kind === 'dash' ? 0.95 : 0.75);
      setImg(hitFrames[player.facing][player.hitIndex]);
      try{ playSound(Sounds.hit || Sounds.bite); }catch(_){ }
      try{ screenShake(kind === 'dash' ? 220 : 140); }catch(_){ }
      try{window.haptic&&window.haptic.hit();}catch{}
      window.lastDamageSource = (kind === 'dash') ? 'enemy-dash' : 'enemy-melee';
      try{
        if(hit && hit.source){
          hit.source.comboBias = Math.min(1, Math.max(hit.source.comboBias || 0, kind === 'dash' ? 0.95 : 0.72));
          hit.source.attackLandedBias = Math.min(1, Math.max(hit.source.attackLandedBias || 0, 1));
        }
      }catch(_){ }
      setHealth(health - dmg);
      return { hit:true, dodged:false };
    }

    function statsText(){
      return `Kills: ${kills} · Timp rămas: ${timeLeft.toFixed(1)}s · HP: ${Math.round(health)}% · Res: ${scrapCount}/${woodCount}/${circuitsCount}`;
    }
    function fadeEnemies(){
      for(const e of enemies){ e.el.classList.add('fade'); setTimeout(()=>{ try{ e.el.remove(); }catch{} }, 820); }
      enemies.length = 0;
      for(const b of enemyProjectiles){ try{ b.el.remove(); }catch{} }
      enemyProjectiles.length=0;
    }

    function doDeath(){
      if(gameEnded) return; gameEnded=true;
      player.state='dead';
      const bottom = player.y + player.h, floor  = groundY();
      player.deadFalling = bottom < floor - 1;
      player.vx=0; if(!player.deadFalling){ player.vy=0; } else { if(player.vy > -50) player.vy = Math.max(player.vy, 120); }
      player.deathFrame=0; player.deathTimer=player.deathFrameDur;
      setImg(deathFrames[player.facing][0]);
      fadeEnemies();
      try{ document.getElementById('overlayTitle').textContent=''; }catch(_){ }
      try{ document.getElementById('youDiedStats').style.display='none'; }catch(_){ }
      try{ document.getElementById('retryBtns').style.display = (timeLeft<=0 ? 'none' : 'flex'); }catch(_){ }
      try{ var _ri=document.getElementById('retryImg'); if(_ri) _ri.style.display = (timeLeft<=0 ? 'none' : 'block'); }catch(_){ }
      document.getElementById('overlay').classList.add('show');
      youDiedStats.textContent = statsText();
      playSound(Sounds.playerDeath); playSound(Sounds.death);
      try{ Sounds.bgm.pause(); }catch{}
     try{ Sounds && Sounds.bossEntrance && Sounds.bossEntrance.pause && Sounds.bossEntrance.pause(); }catch{}
      try{ if (window.GameApp && GameApp.runtime && typeof GameApp.runtime.finalizeRunEnd === 'function') GameApp.runtime.finalizeRunEnd('player-death', { stopLoop:true }); }catch(_){}
    }
    function timeUp(){
      if(gameEnded) return; gameEnded = true; try{ hideBossHud(); }catch(_){ } timeLeft = 0;
      controlsLocked = true; keys.a=keys.d=keys.w=keys.s=keys.f=false; player.vx = 0;
      try{ enemySpawnsEnabled = false; }catch(_){}
      try{ levelTransitionActive = false; }catch(_){}
      fadeEnemies(); try{ Sounds.bgm.pause(); }catch{}
       try{ Sounds && Sounds.bossEntrance && Sounds.bossEntrance.pause && Sounds.bossEntrance.pause(); }catch{}
      try{ if (window.GameApp && GameApp.runtime && typeof GameApp.runtime.clearCombatFlow === 'function') GameApp.runtime.clearCombatFlow('time-up', { stopLoop:false, keepTransition:false }); }catch(_){}
      shipState = 'warmup'; warmupTimer = 2.0; shipEl.classList.add('wiggle'); playSound(Sounds.shipWarmup);
      }

    function beginLevelTransition(){
      // Stop any new spawns and freeze gameplay timers
      levelTransitionActive = true;
      enemySpawnsEnabled = false;
      fadeEnemies();

      const __prevLevel = (typeof currentLevel!=='undefined'? currentLevel : 1);
// Advance level
      currentLevel += 1;

      
try{ if (typeof currentLevel!=='undefined' && healthAtLevelStartCapturedForLevel !== currentLevel) { healthAtLevelStart = health; healthAtLevelStartCapturedForLevel = currentLevel; } }catch(_){ }
// --- Boss music control
      try{
        // Entering L10: pause normal music, start boss track
        if (currentLevel === 10) {
          try{ Sounds && Sounds.bgm && Sounds.bgm.pause && Sounds.bgm.pause(); }catch(_){ }
          try{ Sounds && Sounds.startBgm && Sounds.startBgm.pause && Sounds.startBgm.pause(); }catch(_){ }
          if (!Sounds.bossEntrance) { try{ Sounds.bossEntrance = new Audio('bossentrance.mp3'); }catch(_){ } }
          try{ Sounds.bossEntrance.loop = true; Sounds.bossEntrance.currentTime = 0; Sounds.bossEntrance.play && Sounds.bossEntrance.play().catch(()=>{}); }catch(_){ }
        }
        // Leaving L10: stop boss track, resume normal BGM
        if (__prevLevel === 10 && currentLevel === 11) {
          try{ Sounds && Sounds.bossEntrance && Sounds.bossEntrance.pause && Sounds.bossEntrance.pause(); }catch(_){ }
          try{ startMusic && startMusic(); }catch(_){ }
        }
      }catch(_){ }
try{ updateLevelBalance(); }catch(_){ }

      // Show overlay and countdown
      const ov = document.getElementById('levelOverlay');
      const titleEl = document.getElementById('levelTitle');
      const subEl = document.getElementById('levelSub');
      titleEl.textContent = `LEVEL ${currentLevel}`;
      ov.classList.add('show');

      
subEl.textContent = '';

if (typeof currentLevel !== 'undefined' && currentLevel === 10){
  // Gate Level 10 by Boss Intro video
  try{ if (window.GameApp && GameApp.boss && typeof GameApp.boss.resetIntro === 'function') GameApp.boss.resetIntro(); else window.__bossIntroDone = false; }catch(_){ }
  if (typeof showBossIntro !== 'function') {
    try{ levelTransitionActive = false; enemySpawnsEnabled = true; }catch(_){ }
    setTimeout(function(){ try{ if(enemies.length===0) spawnEnemy(); }catch(_){ } }, 500);
  } else showBossIntro(function(){
    // Resume: replicate original start-of-level actions
    try{
      kills = 0;
      if (typeof renderKills === 'function') renderKills();
      if (typeof updateObjective === 'function') updateObjective(0);

      timeLeft = 60.0;
      lastTickSecond = null;
      if (typeof timerEl !== 'undefined') timerEl.textContent = String(Math.ceil(timeLeft));

      levelTransitionActive = false;
      enemySpawnsEnabled = true;

      // Ensure boss music starts AFTER the video
      if (typeof window.__resumeBossTrack === 'function') window.__resumeBossTrack();

      setTimeout(function(){ try{ if(enemies.length===0) spawnEnemy(); }catch(_){ } }, 1000);
      setTimeout(function(){ try{ ov.classList.remove('show'); subEl.textContent=''; }catch(_){ } }, 3000);
    }catch(_){}
  });
} else {
  // Start gameplay for the new level at T+2s (no extra delay)
setTimeout(()=>{
kills = 0;
            renderKills();
            updateObjective(0);

            // Reset level timer to 60s (same as initial design)
            timeLeft = 60.0;
            lastTickSecond = null;
            timerEl.textContent = String(Math.ceil(timeLeft));

            try{ if (typeof currentLevel!=='undefined' && healthAtLevelStartCapturedForLevel !== currentLevel) { healthAtLevelStart = health; healthAtLevelStartCapturedForLevel = currentLevel; } }catch(_){ }
            // Hide overlay and resume spawns
            levelTransitionActive = false;
            enemySpawnsEnabled = true;

// Spawn enemies 2s after the LEVEL X animation finishes
setTimeout(()=>{
  if(enemies.length===0) spawnEnemy();
}, 5000);

}, 2000);

// Keep LEVEL X visible until T+3s, then hide overlay
setTimeout(()=>{
ov.classList.remove('show');
subEl.textContent = '';
}, 3000);

}
}

    function win(){
      if(gameEnded) return; gameEnded=true;
      document.getElementById('win').classList.add('show');
      winStats.textContent = statsText();
      fadeEnemies(); playSound(Sounds.win);
      try{ Sounds.bgm.pause(); }catch{}
     try{ Sounds && Sounds.bossEntrance && Sounds.bossEntrance.pause && Sounds.bossEntrance.pause(); }catch{}
      try{ if (window.GameApp && GameApp.runtime && typeof GameApp.runtime.finalizeRunEnd === 'function') GameApp.runtime.finalizeRunEnd('win', { stopLoop:true }); }catch(_){}
    }
    /* updateTimer defined earlier */

    /* ===== Particule ===== */
    const particleLayer=document.getElementById('particles');
    const particles=[];
    function spawnDust(x,y){
      const size=rand(26,46), vx=rand(-60,60), vy=-rand(18,40), life=0.45+Math.random()*0.2;
      const p={el:document.createElement('div'),x,y,vx,vy,t:0,life,size,rot:rand(-10,10)};
      p.el.className='particle'; p.el.style.width=size+'px';
      p.el.style.transform=`translate(${x}px, ${y}px) rotate(${p.rot}deg)`;
      const img=document.createElement('img'); img.src='dust.png'; img.alt=''; p.el.appendChild(img);
      particleLayer.appendChild(p.el); particles.push(p);
    }
    function updateParticles(dt){
      for(let i=particles.length-1;i>=0;i--){
        const p=particles[i]; p.t+=dt; p.vy+=220*dt; p.x+=p.vx*dt; p.y+=p.vy*dt;
        const k=clamp(1-p.t/p.life,0,1);
        p.el.style.opacity=String(k);
        p.el.style.transform=`translate(${p.x}px, ${p.y}px) rotate(${p.rot}deg)`;
        if(p.t>=p.life){ p.el.remove(); particles.splice(i,1); }
      }
    }

    /* ===== Starea navei & FX ===== */
    const shipEl = document.getElementById('mothership');
    const shipFxEl = document.getElementById('shipLandFx');
    const shipFxImg = document.getElementById('shipLandFxImg');
    const shipHoldFxEl = document.getElementById('shipHoldFx');
    const shipHoldFxImg = document.getElementById('shipHoldFxImg');

    const SHIP_LAND_FRAMES = ['ship_land_fx_1.webp','ship_land_fx_2.webp','ship_land_fx_3.webp','ship_land_fx_4.webp'];
    const SHIP_HOLD_FRAMES = [''];

    let shipY; let shipState='idle'; let warmupTimer=0;
    
