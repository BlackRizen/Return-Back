window.GameApp && window.GameApp.registerModule && window.GameApp.registerModule('30-state-and-flow', {"entryMarker": "// === fall/crash vars & helpers ===", "description": "Crash/fall flow, level progression, music switching, overlays, options wiring."});
/*__MODULE_BOUNDARY__*/
// === fall/crash vars & helpers ===
let shipVy = 0;
const SHIP_GRAVITY = 900; // px/s^2
let shipGroundY = null;
const SHIP_GROUND_OFFSET = 120; // raise impact height
function computeGroundY(){
  try{
    const p = shipEl.offsetParent || shipEl.parentElement || document.documentElement;
    shipGroundY = p.clientHeight - shipEl.offsetHeight - 2;
    shipGroundY -= SHIP_GROUND_OFFSET;
  }catch(_){ shipGroundY = 0; }
}
// Keep crashed ship pinned on resize after impact
function positionCrashedOverlay(){
  try{
    const img = document.getElementById('shipImg');
    const crashed = document.getElementById('shipImgCrashed');
    if(!img || !crashed) return;
    const r = img.getBoundingClientRect();
    const host = shipEl.getBoundingClientRect();
    crashed.style.left = (r.left - host.left) + 'px';
    crashed.style.top  = (r.top  - host.top) + 'px';
    crashed.style.width  = r.width + 'px';
    crashed.style.height = r.height + 'px';
  }catch(_){}
}
window.addEventListener('resize', ()=>{
  try{
    if(shipState === 'crashed'){
      if (typeof computeGroundY === 'function'){ computeGroundY(); setShipY(shipGroundY); }
      positionCrashedOverlay();
    }
  }catch(_){}
});
let targetShipY = 0;
    shipEl.style.setProperty('--fxScale', 1.25);

    function setShipY(px){
      shipY = px;
      shipEl.style.setProperty('--shipY', shipY + 'px');
    }

    let landFxActive=false, landFxTimer=0, landFxFrameDur=0.25, landFxIndex=0;
    let holdFxActive=false, holdFxTimer=0, holdFxFrameDur=0.25, holdFxIndex=0;

    function redFlicker(times=3, gap=1000){
      const el = document.getElementById('redFlicker');
      let i = 0;
      const tick = ()=>{
        el.classList.remove('show'); void el.offsetWidth;
        el.classList.add('show');
        i++; if(i < times) setTimeout(tick, gap);
      };
      tick();
    }

    function triggerHoldAlerts(){
      const wrap = document.getElementById('holdAlerts');
      const img  = document.getElementById('alertImg');
      const pulse = (src)=>{
        img.src = src;
        wrap.style.display = 'flex';
        wrap.classList.remove('show'); void wrap.offsetWidth;
        wrap.classList.add('show');
        setTimeout(()=>{ wrap.classList.remove('show'); wrap.style.display = 'none'; }, 300);
        document.body.classList.add('shake');
        setTimeout(()=>document.body.classList.remove('shake'), 300);
      };
      pulse('alert_1.webp');
      setTimeout(()=>pulse('alert_2.webp'), 1000);
      setTimeout(()=>pulse('alert_3.webp'), 2000);
    }

    function onShipLanded(){
      playSound(Sounds.shipLand);
      shipEl.classList.add('wiggle');
      document.body.classList.add('shake');

      landFxActive = true;
      landFxIndex = 0;
      landFxTimer = landFxFrameDur;
      shipFxImg.src = SHIP_LAND_FRAMES[0];
      shipFxEl.classList.add('show');
      setTimeout(()=>{ landFxActive=false; shipFxEl.classList.remove('show'); }, 1000);

      setTimeout(()=>{
        document.body.classList.remove('shake');
        shipEl.classList.remove('wiggle');

        playSound(Sounds.shipHold);
        holdFxActive = true;
        holdFxIndex = 0;
        holdFxTimer = holdFxFrameDur;
        shipHoldFxImg.src = SHIP_HOLD_FRAMES[0];
        shipHoldFxEl.classList.add('show');

        redFlicker(3, 1000);
        triggerHoldAlerts();

        setTimeout(()=>{
          holdFxActive = false;
          shipHoldFxEl.classList.remove('show');

          playSound(Sounds.playerScream);

          playerEl.classList.add('behind');
          playerEl.style.display = 'block';
          player.x = Math.round(window.innerWidth/2 - player.w/2);
          const sy = shipY; const sh = shipEl.offsetHeight || 240;
          player.y = sy + Math.round(sh*1.15) - player.h;
          player.vx = 0; player.vy = 150;
          player.state = 'jump';
          setImg(jumpImage[player.facing]);
          
// --- Early ship explosion (before player drops) ---
if (!shipCrashed){
  shipCrashed = true;
  try{
    document.body.classList.add('shake');
    setTimeout(() => document.body.classList.remove('shake'), 1000);
    const fx = document.createElement('div');
    fx.className = 'ship-explosion';
    const im = document.createElement('img');
    const FRAMES = [
      'explosion1.webp','explosion2.webp','explosion3.webp',
      'explosion4.webp','explosion5.webp','explosion6.webp'
    ];
    let idx = 0;
    const FRAME_MS = 80; // ~12.5 fps
    im.src = FRAMES[0];
    fx.appendChild(im);
    shipEl.appendChild(fx);
    const timer = setInterval(()=>{
      idx++;
      if (idx >= FRAMES.length){
        clearInterval(timer);
        try{ fx.remove(); }catch(_){}
      } else {
        im.src = FRAMES[idx];
      }
    }, FRAME_MS);
    if (shipImg) shipImg.src = 'spaceshipdown.webp';
  }catch(_){}
}
// --- end early explosion ---
introPlayerDropped = true;

          // --- Ship crash visual (non-invasive) ---
          setTimeout(()=>{
            if (shipCrashed) return;
            shipCrashed = true;
            try{
              // Explosion overlay in front of the ship
              const fx = document.createElement('div');
              fx.className = 'ship-explosion';
              shipEl.appendChild(fx);
              // Swap to crashed sprite
              if (shipImg) shipImg.src = 'spaceshipdown.webp';
              // Remove FX after it fades
              setTimeout(()=>{ try{ fx.remove(); }catch(_){ } }, 900);
            }catch(_){}
          }, 600);
        }, 5000);
      }, 1500);
    }

    function tickShipLandFx(dt){
      if(landFxActive){
        landFxTimer -= dt;
        if(landFxTimer <= 0){
          landFxTimer += landFxFrameDur;
          landFxIndex = (landFxIndex + 1) % SHIP_LAND_FRAMES.length;
          shipFxImg.src = SHIP_LAND_FRAMES[landFxIndex];
        }
      }
      if(holdFxActive){
        holdFxTimer -= dt;
        if(holdFxTimer <= 0){
          holdFxTimer += holdFxFrameDur;
          holdFxIndex = (holdFxIndex + 1) % SHIP_HOLD_FRAMES.length;
          shipHoldFxImg.src = SHIP_HOLD_FRAMES[holdFxIndex];
        }
      }
    }

    function updateShip(dt){
      if(shipState==='warmup'){
        warmupTimer -= dt;
        if(warmupTimer <= 0){
          shipEl.classList.remove('wiggle');
          shipEl.classList.add('departing');
          shipState='departing';
           shipVy = 0; computeGroundY();playSound(Sounds.shipTakeoff);
        }
      } else if(shipState==='departing'){
        if(shipGroundY===null) computeGroundY();
        shipVy += SHIP_GRAVITY * dt;
        setShipY(shipY + shipVy * dt);
        if(shipY >= shipGroundY){
          setShipY(shipGroundY);
          shipState='crashed';
          // mark crash and hide repair bar only now
          try{ document.body && document.body.classList && document.body.classList.add('ship-crashed'); }catch(_){ }
          try{ document.body && document.body.classList && document.body.classList.remove('bar-ready'); }catch(_){ }
          try{ window.__shipDownFillBar && window.__shipDownFillBar.hide && window.__shipDownFillBar.hide(); }catch(_){ }
          try{ const bar = document.querySelector('.repair-bar-shipdown'); if(bar){ bar.classList.remove('show'); bar.style.opacity='0'; bar.style.visibility='hidden'; bar.style.pointerEvents='none'; } }catch(_){}
          // shake + sfx
          try{ document.body.classList.add('shake'); setTimeout(()=>{ try{ document.body.classList.remove('shake'); }catch(_){ } }, 600);}catch(_){}
          try{ playSound(Sounds.heavyExplosion || Sounds.explosion); }catch(_){}
          try{ const sfx = new Audio('player_scream.mp3'); sfx.volume = 1.0; sfx.play().catch(()=>{}); }catch(_){ }
          // explosion animation overlay
          try{
            const fx = document.createElement('div');
            fx.className = 'ship-explosion';
            const im = document.createElement('img');
            const FRAMES = ['explosion1.webp','explosion2.webp','explosion3.webp','explosion4.webp','explosion5.webp','explosion6.webp'];
            let idx = 0;
            const FRAME_MS = 80;
            im.src = FRAMES[0];
            fx.appendChild(im);
            shipEl.appendChild(fx);
            const timer = setInterval(()=>{
              idx++;
              if (idx >= FRAMES.length){ clearInterval(timer); try{ fx.remove(); }catch(_){ } }
              else { im.src = FRAMES[idx]; }
            }, FRAME_MS);
          }catch(_){ }
          // swap to crashed overlay pinned to exact position
          try{
            const img = document.getElementById('shipImg') || shipEl.querySelector('img');
            if(img){
              try{ shipEl.style.position = 'relative'; }catch(_){}
              const r = img.getBoundingClientRect();
              const host = shipEl.getBoundingClientRect();
              const w = r.width, h = r.height;
              const left = r.left - host.left;
              const top  = r.top  - host.top;
              const crashed = document.createElement('img');
              crashed.id = 'shipImgCrashed';
              crashed.alt = 'Crashed ship';
              crashed.src = 'crashedship.png';
              crashed.style.position = 'absolute';
              crashed.style.left = left + 'px';
              crashed.style.top  = top  + 'px';
              crashed.style.width = w + 'px';
              crashed.style.height = h + 'px';
              crashed.style.pointerEvents = 'none';
              shipEl.appendChild(crashed);
              img.style.visibility = 'hidden';
            try{
              // Lock sprite and orient toward ship
              window.__spriteLocked = true;
              const shipRect = shipEl.getBoundingClientRect();
              const playerRect = playerEl.getBoundingClientRect();
              const shipCenter = shipRect.left + shipRect.width/2;
              const playerCenter = playerRect.left + playerRect.width/2;
              const faceRight = shipCenter > playerCenter;
              const sadSrc = faceRight ? 'SAD.png' : 'SAD2.png';
              if (typeof setImg==='function') setImg(sadSrc, true);
              try{ triggerGameOverVisuals(); }catch(_){}
            }catch(_){ }

              if (typeof positionCrashedOverlay==='function') positionCrashedOverlay();
            }
          }catch(_){}
        }
      } else if(shipState==='intro-descend'){
        const speed = 180;
        const next = shipY + speed*dt;
        if(next >= targetShipY){
          setShipY(targetShipY);
          shipState='idle';
          onShipLanded();
        } else {
          setShipY(next);
        }
      }
    }

    /* ===== Hit detection proiectile vs dușman ===== */
    function checkHits(){
      if(enemies.length===0) return;
      const e = enemies[0];

      for(let i=projectiles.length-1; i>=0; i--){
        const p = projectiles[i];

        if(!p.triedTeleport && !e.dead && e.tpCD<=0 && !e.isTeleporting && e.state!=='hit'){
          const pdx = Math.abs((p.x+p.w/2) - (e.x+e.w/2));
          const pdy = Math.abs((p.y+p.h/2) - (e.y+e.h/2));
          if(pdx < 200 && pdy < 120){
            p.triedTeleport = true;
            if(Math.random() < 0.40){
              teleportToBehind(e, 140);
            }
          }
        }

        if(aabb(p.x,p.y,p.w,p.h, e.x,e.y,e.w,e.h) && !e.dead){
// === REFLECT v22: L10 boss shield reflect; 30% probability, 3s cooldown ===
if (e.isBoss && typeof currentLevel!=='undefined' && currentLevel===10){
  if (typeof window.bossShieldReady==='undefined') window.bossShieldReady = true;
  // Trigger only if off cooldown and chance passes
  const isLaugh = !!e.__laughing;
  const offCd   = !!window.bossShieldReady;
  const shouldReflect = (isLaugh && !e.__shieldedThisLaugh) || (offCd && Math.random() < 0.30);
  if (shouldReflect) {
    if (isLaugh) e.__shieldedThisLaugh = true;

    window.bossShieldReady = false;
    setTimeout(function(){ window.bossShieldReady = true; }, 3000);

    try{
      // --- Play shield sound (single path, no double-play) ---
      try{
        if (typeof playAudio==='undefined' || playAudio){
          if (typeof Sounds!=='undefined'){
            if (!Sounds.shield){ try{ Sounds.shield = new Audio('shield.mp3'); Sounds.shield.volume = 0.9; Sounds.shield.preload='auto'; }catch(_){ } }
            if (typeof playSound==='function'){ playSound(Sounds.shield); }
            else { try{ Sounds.shield.currentTime=0; Sounds.shield.play().catch(function(){}); }catch(_){ } }
          } else {
            // minimal fallback if Sounds map unavailable
            var __tmp = new Audio('shield.mp3'); __tmp.volume=0.9; try{ __tmp.play().catch(function(){}); }catch(_){}
          }
        }
      }catch(_){}
      
      // --- Visual shield anchored to enemyLayer with scaled offsets ---
      (function(){
        try{
          var layer = (typeof enemyLayer!=='undefined' ? enemyLayer : document.getElementById('enemies')) || document.body;
          var img=document.createElement('img'); img.src='scut.png'; img.alt='';
          img.style.position='absolute'; img.style.pointerEvents='none';
          var w=Math.round(e.w*0.85), h=Math.round(e.h*0.85);
          img.style.width=w+'px'; img.style.height=h+'px';
          var scale = (typeof scaled==='function') ? scaled : function(v){ return v; };
          var off  = scale(300); var voff = scale(60);
          var left = e.x + e.w/2 - w/2; if (e.dir==='right') left += off; else if (e.dir==='left') left -= off;
          var top  = e.y + e.h/2 - h/2 + voff;
          img.style.transform = 'translate(' + Math.round(left) + 'px, ' + Math.round(top) + 'px)';
          img.style.zIndex = 999;
          img.style.opacity = '1';
          layer.appendChild(img);
          // visible ~1.4s, then fade 0.6s
          setTimeout(function(){
            try{
              img.style.transition='opacity 0.6s linear';
              img.style.opacity='0';
              setTimeout(function(){ try{ img.remove(); }catch(_){ } }, 600);
            }catch(_){ try{ img.remove(); }catch(__){} }
          }, 1400);
        }catch(_){}
      })();

      // --- Remove player's projectile ---
      try{ if(p.el && p.el.parentNode) p.el.remove(); }catch(_){}
      try{ projectiles.splice(i,1); }catch(_){}

      // --- Spawn enemy projectile that looks like player's (projectile.webp) ---
      (function(){
        try{
          var dx = (player && typeof player.x==='number') ? (player.x + player.w/2) - (p.x + p.w/2) : (Math.random()<0.5?-1:1);
          var dirRight = dx >= 0;
          var base = p.baseSize || (typeof PROJ_SIZE!=='undefined' ? ((PROJ_SIZE[0]+PROJ_SIZE[1])>>1) : 48);
          var size = (typeof scaled==='function') ? scaled(base) : base;
          var speed = (typeof p.vx==='number' && Math.abs(p.vx)>0) ? Math.abs(p.vx)
                     : (typeof PROJ_SPEED!=='undefined' ? PROJ_SPEED
                     : (typeof EPROJ_SPEED!=='undefined' ? EPROJ_SPEED : 520));
          var vx = (dirRight?1:-1) * speed;
          var b = { el: document.createElement('div'), x: p.x, y: p.y, vx: vx, t:0,
                    w: size, h: Math.round(size*0.4), life: Infinity, baseSize: base };
          b.el.className = 'eproj';
          b.el.style.width = b.w + 'px';
          b.el.style.transform = 'translate(' + b.x + 'px, ' + b.y + 'px)';
          var im = document.createElement('img'); im.src='projectile.webp'; im.alt=''; b.el.appendChild(im);
          try{ eprojLayer.appendChild(b.el); }catch(_){ (document.getElementById('enemyProjectiles')||document.body).appendChild(b.el); }
          enemyProjectiles.push(b);
          try{ if (typeof playSound==='function' && (typeof playAudio==='undefined' || playAudio)) playSound(Sounds.enemyShoot); }catch(_){}
        }catch(_){}
      })();

    }catch(_){}
    continue; // skip normal damage when reflect triggers
  }
}
// === END REFLECT v22 ===

          if(e.isTeleporting) continue;
          if(e.enemyInvulnerable || (e.state === 'attack' && e.attackType === 'dash')){
            try{ if(p.el && p.el.parentNode) p.el.remove(); }catch(_){ }
            try{ projectiles.splice(i,1); }catch(_){ }
            continue;
          }

          const projCenter = p.x + p.w/2;
          const enemyCenter  = e.x + e.w/2;
          const pushDir = Math.sign(enemyCenter - projCenter) || 1;
          e.knockVX = pushDir * e.knockBoostX;
          e.vy      = -e.knockBoostY;

          e.state = 'hit';
          e.hitTimer = 0.22;
          
          try{ if(e && e.isBoss){ if(!Sounds.bossHurt){ Sounds.bossHurt = new Audio('hurt.mp3'); } Sounds.bossHurt.currentTime = 0; Sounds.bossHurt.play && Sounds.bossHurt.play().catch(()=>{}); } }catch(_){}
        e.hitIndex = 0;
          e.hitFrameTimer = e.hitFrameDur;
          e.el.firstChild.src = enemyHitFrames[e.dir][0];

          p.el.remove(); projectiles.splice(i,1);

          {
            if(!(e && e.isBoss && typeof currentLevel!=='undefined' && currentLevel===10 && window.__bossInvul===true)){
            var __d = (e && e.isBoss) ? Math.round(e.maxHp * 0.07) : ENEMY_DMG_PER_HIT;
            try{ if (typeof window.__computeEnemyDamage === 'function') __d = window.__computeEnemyDamage(e, __d); }catch(_){ }
            e.hp = Math.max(0, e.hp - __d);
          }
          }
            try{ addScore(2, {x:e.x + e.w/2, y:e.y}); }catch(_){ }
          updateEnemyHpBar(e);
          playSound(Sounds.enemyHit); try{window.haptic&&window.haptic.enemyHit();}catch{} try{window.haptic&&window.haptic.enemyHit();}catch{}

          if(e.hp <= 0){ e.dead = true; try{ if(e.qmarkEl){ e.qmarkEl.remove(); e.qmarkEl=null; } }catch(_){ } e.__patrolInit=false; e.patrolState=null; e.patrolPauseT=0;
            playSound(Sounds.enemyDie);
            e.state = 'dead';
            e.vy = 100;
            e.knockVX *= 0.4;
            addKill();
           try{ if(e.isBoss) hideBossHud(); }catch(_){ } }
          continue;
        }
      }
    }

    /* ===== Telekinesis asteroids ===== */
    function spawnAstroExplosion(cx, cy){
      try{
        const layer = document.getElementById('enemies') || document.getElementById('particles') || document.body;
        const fx = document.createElement('div');
        const size = scaled(720);
        fx.style.position='absolute';
        fx.style.width = size + 'px';
        fx.style.height = size + 'px';
        fx.style.left = (cx - size/2) + 'px';
        fx.style.top  = (cy - size/2) + 'px';
        fx.style.pointerEvents='none';
        fx.style.zIndex = 999;
        const im = document.createElement('img');
        try{
          if(typeof playSound==='function' && typeof Sounds!=='undefined' && Sounds.explosion){
            playSound(Sounds.explosion);
          } else {
            const au = new Audio('explosion.mp3');
            au.play().catch(()=>{});
          }
        }catch(_){}
        const FRAMES = [
          'explosion1.webp','explosion2.webp','explosion3.webp',
          'explosion4.webp','explosion5.webp','explosion6.webp'
        ];
        let idx = 0;
        const FRAME_MS = 80;
        im.src = FRAMES[0];
        im.alt = '';
        im.style.width='100%';
        im.style.height='100%';
        im.style.display='block';
        fx.appendChild(im);
        layer.appendChild(fx);
        const timer = setInterval(function(){
          idx++;
          if(idx >= FRAMES.length){
            clearInterval(timer);
            try{ fx.remove(); }catch(_){}
          } else {
            im.src = FRAMES[idx];
          }
        }, FRAME_MS);
      }catch(_){}
    }

    function ensureTelekAura(){
      try{
        const playerEl = document.getElementById('player');
        if(!playerEl) return;
        if(!telekAuraEl){
          const aura = document.createElement('div');
          aura.className = 'telek-aura';
          playerEl.insertBefore(aura, playerEl.firstChild || null);
          telekAuraEl = aura;
        }
        telekAuraEl.style.display = 'block';
      }catch(_){}
    }

    function hideTelekAura(){
      try{
        if(telekAuraEl){
          telekAuraEl.style.display = 'none';
        }
      }catch(_){}
    }

    function spawnTelekTrail(a){
      try{
        if(!a || !a.el) return;
        const layer = document.getElementById('particles') || document.body;
        const trail = document.createElement('div');
        trail.className = 'telek-trail';
        const w = a.w * 2.4;
        const h = a.h * 0.6;
        trail.style.position = 'absolute';
        trail.style.width = w + 'px';
        trail.style.height = h + 'px';
        const cx = a.x + a.w/2;
        const cy = a.y + a.h/2;
        // originul trail-ului este exact sub centrul asteroidului
        trail.style.left = cx + 'px';
        trail.style.top  = (cy - h/2) + 'px';
        let ang = 0;
        try{
          const vx = a.vx || 0, vy = a.vy || 0;
          if(vx!==0 || vy!==0){
            ang = Math.atan2(vy, vx) * 180/Math.PI + 180;
          }
        }catch(_){}
        trail.style.setProperty('--telekTrailAngle', ang + 'deg');
        layer.appendChild(trail);
        setTimeout(()=>{ try{ trail.remove(); }catch(_){ } }, 450);
      }catch(_){}
    }

    function fadeOutTelekFallSound(){
      try{
        if(!telekFallAudio) return;
        const au = telekFallAudio;
        // mai intai asteptam ~1 secunda la volum normal, apoi facem fade de 1 secunda
        setTimeout(()=>{
          try{
            if(!au) return;
            let t = 0;
            const duration = 1000;
            const step = 100;
            const startVol = ('volume' in au ? au.volume : 1);
            if(au.__fadeTimer){
              clearInterval(au.__fadeTimer);
            }
            au.__fadeTimer = setInterval(()=>{
              t += step;
              const p = t / duration;
              if(p >= 1){
                try{
                  au.volume = 0;
                }catch(_){}
                clearInterval(au.__fadeTimer);
                au.__fadeTimer = null;
                try{
                  au.pause();
                  au.currentTime = 0;
                }catch(_){}
                if(telekFallAudio === au){
                  telekFallAudio = null;
                }
                return;
              }
              try{
                au.volume = startVol * (1 - p);
              }catch(_){}
            }, step);
          }catch(_){}
        }, 1000);
      }catch(_){}
    }

        function setTelekQuakeActive(active){
      try{
        const el = document.body || document.documentElement;
        if(active){
          if(!telekQuakeActive){
            telekQuakeActive = true;
            el.classList.add('telek-shake');
          }
        } else {
          if(telekQuakeActive){
            telekQuakeActive = false;
            el.classList.remove('telek-shake');
          }
        }
      }catch(_){}
    }

function telekKillEnemy(e){
      try{
        if(!e || e.dead) return;
        try{ e.dead = true; }catch(_){}
        try{
          if(e.qmarkEl){
            e.qmarkEl.remove();
            e.qmarkEl = null;
          }
        }catch(_){}
        try{
          e.__patrolInit = false;
          e.patrolState = null;
          e.patrolPauseT = 0;
        }catch(_){}
        try{ playSound(Sounds.enemyDie); }catch(_){}
        try{
          e.state = 'dead';
          e.vy = 100;
          e.knockVX *= 0.4;
        }catch(_){}
        try{ addKill(); }catch(_){}
        try{ if(e.isBoss) hideBossHud(); }catch(_){}
      }catch(_){}
    }

    function telekHitEnemy(e, a){
      try{
        if(!e || e.dead) return;
        if(e.isBoss && typeof currentLevel!=='undefined' && currentLevel===10 && window.__bossInvul===true){
          spawnAstroExplosion(a.x + a.w/2, a.y + a.h/2);
          try{
            if(typeof setTelekQuakeActive==='function') setTelekQuakeActive(false);
            if(typeof bigQuake==='function') bigQuake(700);
            else if(typeof screenShake==='function') screenShake(550);
          }catch(_){}
          try{
            if(telekFallAudio){
              fadeOutTelekFallSound();
            }
            if(telekMindAudio){
              telekMindAudio.pause();
              telekMindAudio.currentTime = 0;
              telekMindAudio = null;
            }
            telekPostExplosionTimer = 0.6;
            telekPostExplosionFacing = (player && player.facing) ? player.facing : 'right';
            if(player){
              player.telekActive = false;
              player.telekTimer = 0;
            }
            telekFloatPhase = 0;
            try{
              if (window.invisCooldown && typeof window.invisCooldown.startCooldown === 'function'){
                var cdMs = (player && player.telekCooldown ? player.telekCooldown : 12) * 1000;
                window.invisCooldown.startCooldown(cdMs);
              }
            }catch(_){}
          }catch(_){}
          return;
        }
        spawnAstroExplosion(e.x + e.w/2, e.y + e.h/2);
        try{
          if(typeof setTelekQuakeActive==='function') setTelekQuakeActive(false);
          if(typeof bigQuake==='function') bigQuake(700);
          else if(typeof screenShake==='function') screenShake(550);
        }catch(_){}
        try{
          if(telekFallAudio){
            fadeOutTelekFallSound();
          }
          if(telekMindAudio){
            telekMindAudio.pause();
            telekMindAudio.currentTime = 0;
            telekMindAudio = null;
          }
          telekPostExplosionTimer = 0.6;
          telekPostExplosionFacing = (player && player.facing) ? player.facing : 'right';
          if(player){
            player.telekActive = false;
            player.telekTimer = 0;
          }
          telekFloatPhase = 0;
          try{
            if (window.invisCooldown && typeof window.invisCooldown.startCooldown === 'function'){
              var cdMs = (player && player.telekCooldown ? player.telekCooldown : 12) * 1000;
              window.invisCooldown.startCooldown(cdMs);
            }
          }catch(_){}
        }catch(_){}
        try{
          e.hp = 0;
          updateEnemyHpBar(e);
        }catch(_){}
        telekKillEnemy(e);
      }catch(_){}
    }

    function spawnTelekAsteroid(){
      try{
        const baseSize = 120;
        const size = scaled(baseSize);
        const a = {
          el: document.createElement('div'),
          x: 0,
          y: -size - 20,
          vx: 0,
          vy: 0,
          speed: scaled(650),
          w: size,
          h: size,
          life: 4,
          target: null,
          trailTimer: 0
        };
        a.el.className = 'telek-astro';
        a.el.style.position='absolute';
        a.el.style.pointerEvents='none';
        a.el.style.width = a.w + 'px';
        a.el.style.height = a.h + 'px';
        const img = document.createElement('img');
        img.src = 'astro1.png';
        img.alt = '';
        img.style.width='100%';
        img.style.height='100%';
        img.style.display='block';
        a.el.appendChild(img);
        const layer = (typeof projLayer!=='undefined' && projLayer) ? projLayer : (document.getElementById('projectiles') || document.body);
        layer.appendChild(a.el);

        // Choose initial target (if any)
        for(let i=0;i<enemies.length;i++){
          const e = enemies[i];
          if(e && !e.dead){ a.target = e; break; }
        }

        const screenW = window.innerWidth || 1920;

        // Spawn position: exact din coltul opus inamicului
        let spawnX;
        const spawnY = -size - scaled(80);
        if(a.target && !a.target.dead){
          const enemyCenter = a.target.x + a.target.w/2;
          const enemyOnLeft = enemyCenter < screenW*0.5;
          if(enemyOnLeft){
            // inamic in stanga => asteroidii pornesc din coltul dreapta-sus
            spawnX = Math.max(0, screenW - a.w);
          } else {
            // inamic in dreapta => asteroidii pornesc din coltul stanga-sus
            spawnX = 0;
          }
        } else {
          // fallback: coltul stanga-sus
          spawnX = 0;
        }

        a.x = spawnX;
        a.y = spawnY;

        a.el.style.transform = 'translate(' + a.x + 'px, ' + a.y + 'px)';
        telekProjectiles.push(a);
        try{
          if(telekFallAudio){
            telekFallAudio.pause();
            telekFallAudio.currentTime = 0;
          }
          telekFallAudio = new Audio('fallingdown.mp3');
          telekFallAudio.loop = false;
          telekFallAudio.play().catch(()=>{});
        }catch(_){}

      }catch(_){}
    }

    function updateTelekinesis(dt){
      try{
        if(player && player.telekCD>0) player.telekCD = Math.max(0, player.telekCD - dt);
        if(player){
          if(player.telekActive){
            player.telekTimer = Math.max(0, (player.telekTimer||0) - dt);
            telekFloatPhase = (telekFloatPhase + dt*1.5) % (Math.PI*2);
            if(player.telekTimer<=0){
              player.telekActive=false;
              telekFloatPhase = 0;
              try{ setVisualOffset(0); }catch(_){}
              try{
                if(telekMindAudio){
                  telekMindAudio.pause();
                  telekMindAudio.currentTime = 0;
                  telekMindAudio = null;
                }
              }catch(_){}
              try{
                if (window.invisCooldown && typeof window.invisCooldown.startCooldown === 'function'){
                  var cdMs = (player && player.telekCooldown ? player.telekCooldown : 12) * 1000;
                  window.invisCooldown.startCooldown(cdMs);
                }
              }catch(_){}
            }
            ensureTelekAura();
          } else {
            hideTelekAura();
          }
        }
        if(typeof telekPostExplosionTimer === 'number' && telekPostExplosionTimer>0){
          telekPostExplosionTimer = Math.max(0, telekPostExplosionTimer - dt);
        }
      }catch(_){}

      // Shake mic continuu cat timp exista asteroizi activi
      try{
        if(telekProjectiles.length>0){
          if(typeof setTelekQuakeActive==='function') setTelekQuakeActive(true);
        } else {
          if(typeof setTelekQuakeActive==='function') setTelekQuakeActive(false);
        }
      }catch(_){}

      for(let i=telekProjectiles.length-1;i>=0;i--){
        const a = telekProjectiles[i];
        a.life = (a.life||4) - dt;
        if(a.life<=0){
          try{ a.el.remove(); }catch(_){}
          telekProjectiles.splice(i,1);
          continue;
        }

        if(!a.target || a.target.dead){
          a.target = null;
          for(let j=0;j<enemies.length;j++){
            const e = enemies[j];
            if(e && !e.dead){ a.target = e; break; }
          }
        }

        if(a.target && !a.target.dead){
          const tx = a.target.x + a.target.w/2;
          const ty = a.target.y + a.target.h/2;
          const ax = a.x + a.w/2;
          const ay = a.y + a.h/2;
          const speed = a.speed || scaled(650);
          let dx = tx - ax;
          let dy = ty - ay;
          const dist = Math.sqrt(dx*dx + dy*dy) || 1;
          dx /= dist; dy /= dist;
          a.vx = dx * speed;
          a.vy = dy * speed;
        } else {
          // daca nu are tinta, continua sa cada in jos
          if(typeof a.vy !== 'number' || a.vy === 0){
            a.vx = 0;
            a.vy = a.speed || scaled(650);
          }
        }

        if(typeof a.trailTimer !== 'number') a.trailTimer = 0;
        a.trailTimer -= dt;
        if(a.trailTimer <= 0){
          spawnTelekTrail(a);
          a.trailTimer = 0.05;
        }

        a.x += (a.vx||0) * dt;
        a.y += (a.vy||0) * dt;
        a.el.style.transform = 'translate(' + a.x + 'px, ' + a.y + 'px)';

        let hitEnemy = null;
        if(a.target && !a.target.dead && aabb(a.x,a.y,a.w,a.h, a.target.x,a.target.y,a.target.w,a.target.h)){
          hitEnemy = a.target;
        } else {
          for(let k=0;k<enemies.length;k++){
            const e = enemies[k];
            if(e && !e.dead && aabb(a.x,a.y,a.w,a.h, e.x,e.y,e.w,e.h)){
              hitEnemy = e;
              break;
            }
          }
        }
        if(hitEnemy){
          telekHitEnemy(hitEnemy, a);
          try{ a.el.remove(); }catch(_){}
          telekProjectiles.splice(i,1);
          continue;
        }

        if(a.y > (window.innerHeight||1080) + 200){
          try{ a.el.remove(); }catch(_){}
          telekProjectiles.splice(i,1);
          continue;
        }
      }
      try{
        if(telekProjectiles.length===0 && telekFallAudio){
          fadeOutTelekFallSound();
        }
      }catch(_){}
    }

    /* ===== Intro ===== */
    const introEl = document.getElementById('intro'); // poate lipsi
    let introStarted=false, introPlayerDropped=false, introLanded=false; let shipCrashed=false;

    function showIntroPNG(){
      if(!introEl) return;
      introEl.classList.add('show');
      setTimeout(()=>introEl.classList.remove('show'), 2000);
    }
    function beginIntro(){
      targetShipY = Math.round(window.innerHeight*0.05);
      setShipY(- (shipEl.offsetHeight || 200) - 80);
      shipState = 'intro-descend';
      playSound(Sounds.shipDescend);
      showIntroPNG();
    }

    /* ===== Preload imagini ===== */
    function preloadImages(srcs){ srcs.forEach(src=>{ const i=new Image(); i.src=src; }); }
    preloadImages([
      'spaceship.png','spaceshipdown.webp','ship_land_fx_1.webp','ship_land_fx_2.webp','ship_land_fx_3.webp','ship_land_fx_4.webp',
      '',
      'projectile.png','enemy_projectile.png','dust.png',
      ...runFrames.left, ...runFrames.right,
      ...idleFrames.left, ...idleFrames.right,
      jumpImage.left, jumpImage.right, landImage.left, landImage.right, crouchImage.left, crouchImage.right,
      ...enemyRunFrames.left, ...enemyRunFrames.right,
      ...enemyShootFrames.left, ...enemyShootFrames.right,
      ...enemyHitFrames.left, ...enemyHitFrames.right,
      'scrap.webp','wood.webp','circuits.webp',
      'alert_1.webp','alert_2.webp','alert_3.webp',
      'my_overlay.webp', 'healthbar.png', 'objective.png', 'timer.webp',
      ...bossBiteFrames.left, ...bossBiteFrames.right
    ]);

    /* ===== Bucla principală & init ===== */
    const hpElDom=document.getElementById('hp');
    function syncPlayer(){
      playerEl.style.setProperty('--pw',player.w+'px');
      playerEl.style.setProperty('--px',player.x+'px');
      playerEl.style.setProperty('--py',player.y+'px');
    }

    function init(){
      layoutInitial();

      uiS = window.innerHeight / BASE_H;
      applyUiScaleToCssVars();

      applyGameplayScaleFromUiS();
      layoutInitial();

      playerEl.style.display = 'none';
      controlsLocked = true;

      // scale player la boot
      player.w = scaled(220);
      player.h = scaled(220);

      player.x = Math.round(window.innerWidth/2 - player.w/2);
      player.y = -player.h - 100;
      syncPlayer();

      hpElDom.style.width = '100%';
      health = 100;
      hpTextEl.textContent = '100%';

      kills = 0; renderKills();

      scrapCount = 0; woodCount = 0; circuitsCount = 0;
      renderResourcesHud();

      timerEl.textContent = '60';
      updateObjective(0);

      setShipY(- (shipEl.offsetHeight || 200) - 80);

      if (window.GameApp && GameApp.actions && typeof GameApp.actions.startMainLoop === 'function') GameApp.actions.startMainLoop();
      else requestAnimationFrame(tick);
    }

    let lastTs=performance.now();
    function tick(dtOrTs, maybeTs){
      const ts = (typeof maybeTs === 'number') ? maybeTs : dtOrTs;
      const rawDt = (typeof maybeTs === 'number') ? dtOrTs : Math.min(0.05,(ts-lastTs)/1000);
      let dt = rawDt;
      if (typeof maybeTs !== 'number'){
        try{
          const runtime = window.GameApp && GameApp.runtime;
          const scale = runtime && typeof runtime.getTimeScale === 'function' ? Number(runtime.getTimeScale(ts)) : 1;
          if (Number.isFinite(scale) && scale > 0 && scale !== 1) dt = rawDt * Math.max(0.05, Math.min(1, scale));
        }catch(_){}
      }
      lastTs = ts;

      // nori merg și dacă e pauză
      const dx=SPEED_VW_PER_SEC*dt;
      for(const c of clouds){
        c.x-=dx;
        if(c.x+c.wvw<-FADE_VW){ recycle(c); continue; }
        c.el.style.setProperty('--xvw',c.x+'vw');
        c.el.style.setProperty('--op',edgeOpacity(c.x, 0.95));
      }

      if(!paused){
        applyTouchToKeys();
        updateTimer(dt);
        updateShip(dt);
        tickShipLandFx(dt);
        applyPhysics(dt);
        updateSprite(dt);
        updateProjectiles(dt);
        updateEnemyProjectiles(dt);
        updateEnemies(dt);
        updateTelekinesis(dt);
        checkHits();
        checkPlayerEnemyContact();
        updateParticles(dt);
        updateCoins(dt);
      }

      syncPlayer();
      if (!(window.GameApp && GameApp.loop && GameApp.loop.isRunning)) requestAnimationFrame(tick);
    }

    /* ===== Resize: recalculare scală HUD + poziții ===== */
    window.addEventListener('resize', ()=>{
      uiS = window.innerHeight / BASE_H;
      applyUiScaleToCssVars();

      for (const c of clouds) c.wvw = pxToVw(c.wpx * uiS); // înainte fără * uiS

      const prevFeet = player.y + player.h;
      const wasCrouch = (player.state === 'crouch');

      const targetH = wasCrouch ? scaled(220 * 0.6) : scaled(220);
      const targetW = scaled(220);

      player.w = targetW;
      player.h = targetH;

      const floor = groundY();
      const feet  = Math.min(floor, prevFeet);
      player.y = feet - player.h;

      if(Math.abs((player.x + player.w/2) - window.innerWidth/2) < 200){
        player.x = Math.round(window.innerWidth/2 - player.w/2);
      }

      for(const e of enemies){
        const centerX = e.x + e.w/2;
        const feetE   = e.y + e.h;
        e.w = scaled(140) * (e.isBoss ? 4 : 1);
        e.h = scaled(140) * (e.isBoss ? 4 : 1);
        e.x = Math.round(centerX - e.w/2);
        const maxY = e.isBoss ? (groundY() - e.h) : (groundY() - e.h - 10); e.y = Math.min(maxY, feetE - e.h);
        e.el.style.width = e.w + 'px';
        e.el.style.transform = `translate(${e.x}px, ${e.y}px)`;
      }

      if(shipState==='idle'){ setShipY(window.innerHeight*0.05); }

      syncPlayer();
    });

    /* ===== Boot ===== */
    function boot(){
      if (window.__bootStarted) return false;
      window.__bootStarted = true;
      try{ updateLevelBalance(); }catch(_){ }
      try{ Sounds.startBgm.pause(); Sounds.startBgm.currentTime = 0; }catch{}
      startMusic();

      const fade = document.getElementById('fade');
      fade.style.display = 'block';
      requestAnimationFrame(()=> fade.classList.add('hide'));
      setTimeout(()=>{ try{fade.remove();}catch{}; }, 3000);

      init();
      setTimeout(()=>{ introStarted = true; beginIntro(); }, 500);
    }

    // === OPTIONS wiring ===
    const musicVolEl = document.getElementById('musicVol');
    const sfxVolEl   = document.getElementById('sfxVol');
    const muteEl     = document.getElementById('muteAll');
    const diffEl     = document.getElementById('difficulty');
    const fsBtn      = document.getElementById('fullscreenToggle');

    if(musicVolEl) musicVolEl.addEventListener('input', e=>{ musicVol = Number(e.target.value); applyVolumes();
    // Preload vibration.mp3 pentru stomp (dacă există în proiect)
    try{
      if(!window.Sounds) window.Sounds = {};
      if(!Sounds.vibration){
        Sounds.vibration = new Audio('vibration.mp3');
        Sounds.vibration.volume = 0.9;
        Sounds.vibration.preload = 'auto';
      }
    }catch(_){}
 });
    if(sfxVolEl)   sfxVolEl.addEventListener('input',   e=>{ sfxVol   = Number(e.target.value); applyVolumes();
    // Preload vibration.mp3 pentru stomp (dacă există în proiect)
    try{
      if(!window.Sounds) window.Sounds = {};
      if(!Sounds.vibration){
        Sounds.vibration = new Audio('vibration.mp3');
        Sounds.vibration.volume = 0.9;
        Sounds.vibration.preload = 'auto';
      }
    }catch(_){}
 });
    if(muteEl)     muteEl.addEventListener('change',    e=>{ muted    = !!e.target.checked;     applyVolumes();
    // Preload vibration.mp3 pentru stomp (dacă există în proiect)
    try{
      if(!window.Sounds) window.Sounds = {};
      if(!Sounds.vibration){
        Sounds.vibration = new Audio('vibration.mp3');
        Sounds.vibration.volume = 0.9;
        Sounds.vibration.preload = 'auto';
      }
    }catch(_){}
 });

    if(diffEl) diffEl.addEventListener('change', e=>{
      const v = e.target.value;
      currentDiff = DIFFS[v] || DIFFS.normal;
      playerDamageFromBullet = currentDiff.enemyBulletDmg;
    });

    if(fsBtn) fsBtn.addEventListener('click', async ()=>{
      try{
        if(!document.fullscreenElement) await document.documentElement.requestFullscreen();
        else await document.exitFullscreen();
      }catch{}
    });

    // Start screen
    document.getElementById('startBtn').addEventListener('click', ()=>{
      document.getElementById('startScreen').style.display = 'none';
      window.__showLoadingOverlay && window.__showLoadingOverlay(3000);
window.__startGameAfter && window.__startGameAfter(3000);
});

    document.getElementById('optionsBtn').addEventListener('click', ()=>{
      document.getElementById('optionsPanel').classList.add('show');
    });
    document.getElementById('optionsClose').addEventListener('click', ()=>{
      document.getElementById('optionsPanel').classList.remove('show');
    });

    document.getElementById('exitBtn').addEventListener('click', async ()=>{
      const ok = confirm('Exit the game?');
      if(!ok) return;
      try{ if (document.fullscreenElement) await document.exitFullscreen(); }catch{}
      window.close();
      setTimeout(()=>{
        document.body.innerHTML = `
          <style>
            html,body{height:100%}body{margin:0;display:flex;align-items:center;justify-content:center;background:#000;color:#fff;
            font:700 24px/1.2 system-ui, -apple-system, Segoe UI, Roboto, Arial,sans-serif;text-align:center;padding:20px}
            .hint{opacity:.8;font-weight:600;font-size:16px;margin-top:10px}
          </style>
          Thanks for playing!
          <div class="hint">(You can now close this tab)</div>
        `;
      }, 350);
    });

    // helper public pt. adăugare resurse (debug/cheat)
    window.addResource = function(type, amount=1){
      if(type === 'scrap')      scrapCount    += amount;
      else if(type === 'wood')  woodCount     += amount;
      else if(type === 'circuits') circuitsCount += amount;
      renderResourcesHud();
    };
  

/* === Auto-fullscreen + Portrait-only (desktop + Android) === */
(function(){
  const blocker = document.getElementById('orientationBlocker');
  const startScreen = document.getElementById('startScreen');

  function isFullscreen(){
    return !!(document.fullscreenElement || document.webkitFullscreenElement);
  }
  function isPortrait(){
    return window.innerHeight >= window.innerWidth;
  }

  async function ensureFullscreen(){
    try{
      if (!isFullscreen()){
        const el = document.documentElement;
        if (el.requestFullscreen) await el.requestFullscreen();
        else if (el.webkitRequestFullscreen) await el.webkitRequestFullscreen();
      }
    }catch(_){}
  }

  async function lockPortrait(){
    try{
      if (screen.orientation && screen.orientation.lock){
        await screen.orientation.lock('portrait-primary').catch(()=>screen.orientation.lock('portrait'));
      }
    }catch(_){}
  }

  function enforceGate(){
    const ok = isFullscreen() && isPortrait();
    if (blocker) blocker.style.display = ok ? 'none' : 'block';
    if (startScreen) startScreen.style.pointerEvents = ok ? 'auto' : 'none';
  }

  // Try to satisfy both requirements on the earliest gestures
  const nudge = async () => {
    if (!isFullscreen()) await ensureFullscreen();
    await lockPortrait();  // harmless on desktop; required on Android
    enforceGate();
  };

  ['pointerdown','touchstart','keydown','click'].forEach(ev => {
    window.addEventListener(ev, nudge, { passive:true });
  });

  // Hook Start button specifically
  try{
    document.getElementById('startBtn')?.addEventListener('click', nudge);
  }catch(_){}

  // Keep enforcing on changes
  window.addEventListener('resize', enforceGate);
  window.addEventListener('orientationchange', enforceGate);
  document.addEventListener('fullscreenchange', enforceGate);
  document.addEventListener('webkitfullscreenchange', enforceGate);
  window.addEventListener('load', enforceGate);

  // Export helpers if needed elsewhere
  window.ensureFullscreen = ensureFullscreen;
  window.lockPortrait = lockPortrait;
  window.enforceGate = enforceGate;
})();

/* === ESC / Back -> Pause (still portrait+fullscreen gated) === */
(function(){
    document.addEventListener('keydown', function(e){

    // SPACE = activează abilitatea afișată în tab (după ce a picat din shop)
    if (e.code === 'Space' || e.key === ' ') {
      try {
        var tab = document.getElementById('invisAbilityTab');
        var src = tab && tab.src ? tab.src : '';

        // dacă tab-ul arată MANIPULARE (manipulation), folosim telekinesis
        if (src.indexOf('tagmanipulation') !== -1) {
          if (typeof activateTelekinesis === 'function') activateTelekinesis();
        }
        // dacă tab-ul arată INVIZIBILITATE (invis), folosim invisibility
        else if (src.indexOf('taginvis') !== -1) {
          if (typeof activateInvisibility === 'function') activateInvisibility();
        }
        // dacă e locked sau altceva, nu facem nimic
      } catch(_){}
    }

    // 1 = INVIZIBILITATE (menținut ca fallback / debugging)
    if (e.code==='Digit1' || e.key==='1' || e.code==='Numpad1'){
      if (typeof activateInvisibility==='function') activateInvisibility();
    }

    // 2 = MANIPULARE (Telekinesis) (menținut ca fallback / debugging)
    if (e.code==='Digit2' || e.key==='2' || e.code==='Numpad2'){
      if (typeof activateTelekinesis==='function') activateTelekinesis();
    }

    if (e.code === '__EscDisabled__'){
      try{ e.preventDefault(); e.stopPropagation(); }catch(_){}
      try{ if (typeof setPaused==='function') setPaused(true); }catch(_){}
      if (typeof window.enforceGate==='function') window.enforceGate();
    }
  }, true);

  // Android back trap
  window.addEventListener('load', function(){
    try{ history.pushState(null, document.title, location.href); }catch(_){}
  });
  window.addEventListener('popstate', function(e){
    e.preventDefault();
    try{ if (typeof setPaused==='function') setPaused(true); }catch(_){}
    try{ history.pushState(null, document.title, location.href); }catch(_){}
    if (typeof window.enforceGate==='function') window.enforceGate();
  });
})();

/* === Auto-fullscreen + Landscape-only (desktop + Android) === */
(function(){
  const blocker = document.getElementById('orientationBlocker');
  const startScreen = document.getElementById('startScreen');

  function isFullscreen(){
    return !!(document.fullscreenElement || document.webkitFullscreenElement);
  }
  function isLandscape(){
    return window.innerWidth > window.innerHeight;
  }

  async function ensureFullscreen(){
    try{
      if (!isFullscreen()){
        const el = document.documentElement;
        if (el.requestFullscreen) await el.requestFullscreen();
        else if (el.webkitRequestFullscreen) await el.webkitRequestFullscreen();
      }
    }catch(_){}
  }

  async function lockLandscape(){
    try{
      if (screen.orientation && screen.orientation.lock){
        await screen.orientation.lock('landscape-primary').catch(()=>screen.orientation.lock('landscape'));
      }
    }catch(_){}
  }

  function enforceGate(){
    const ok = isLandscape();
    if (blocker) blocker.style.display = ok ? 'none' : 'block';
    if (startScreen) startScreen.style.pointerEvents = ok ? 'auto' : 'none';
  }

  const nudge = async () => {
    if (!isFullscreen()) await ensureFullscreen();
    await lockLandscape();
    enforceGate();
  };

  ['pointerdown','touchstart','keydown','click'].forEach(ev => {
    window.addEventListener(ev, nudge, { passive:true });
  });

  try{
    document.getElementById('startBtn')?.addEventListener('click', nudge);
  }catch(_){}

  window.addEventListener('resize', enforceGate);
  window.addEventListener('orientationchange', enforceGate);
  document.addEventListener('fullscreenchange', enforceGate);
  document.addEventListener('webkitfullscreenchange', enforceGate);
  window.addEventListener('load', enforceGate);

  window.ensureFullscreen = ensureFullscreen;
  window.lockLandscape = lockLandscape;
  window.enforceGate = enforceGate;
})();

/* === ESC / Back -> Pause (landscape+fullscreen enforced) === */
(function(){
  document.addEventListener('keydown', function(e){
    if (e.code === '__EscDisabled__'){
      try{ e.preventDefault(); e.stopPropagation(); }catch(_){}
      try{ if (typeof setPaused==='function') setPaused(true); }catch(_){}
      if (typeof window.enforceGate==='function') window.enforceGate();
    }
  }, true);
  window.addEventListener('load', function(){
    try{ history.pushState(null, document.title, location.href); }catch(_){}
  });
  window.addEventListener('popstate', function(e){
    e.preventDefault();
    try{ if (typeof setPaused==='function') setPaused(true); }catch(_){}
    try{ history.pushState(null, document.title, location.href); }catch(_){}
    if (typeof window.enforceGate==='function') window.enforceGate();
  });
})();

/* === Auto-Fullscreen + Landscape-only gate (no prompts) === */
(function(){
  const blocker = document.getElementById('orientationBlocker');
  const startScreen = document.getElementById('startScreen');

  function isFullscreen(){ return !!(document.fullscreenElement || document.webkitFullscreenElement); }
  function isLandscape(){ return window.innerWidth > window.innerHeight; }

  async function ensureFullscreen(){
    try{
      if (!isFullscreen()){
        const el = document.documentElement;
        if (el.requestFullscreen)      { await el.requestFullscreen(); }
        else if (el.webkitRequestFullscreen) { await el.webkitRequestFullscreen(); }
      }
    }catch(_){}
  }

  async function lockLandscape(){
    try{
      if (screen.orientation && screen.orientation.lock){
        await screen.orientation.lock('landscape-primary').catch(()=>screen.orientation.lock('landscape'));
      }
    }catch(_){}
  }

  function enforceGate(){
    const ok = isLandscape() && isFullscreen();
    if (blocker) blocker.style.display = ok ? 'none' : 'block';
    if (startScreen) startScreen.style.pointerEvents = ok ? 'auto' : 'none';
  }

  // Silent attempt to satisfy requirements
  const nudge = async () => {
    if (!isFullscreen()) await ensureFullscreen();
    await lockLandscape();
    enforceGate();
  };

  // Wire to earliest gestures (no UI prompts)
  ['pointerdown','touchstart','keydown','click'].forEach(ev => {
    window.addEventListener(ev, nudge, { passive:true });
  });
  // Hook Start specifically
  try{ document.getElementById('startBtn')?.addEventListener('click', nudge); }catch(_){}

  // Re-assert on focus / visibility (common after user dismisses FS)
  window.addEventListener('focus', enforceGate);
  document.addEventListener('visibilitychange', enforceGate);

  // Keep checking on resize/orientation/fullscreen changes
  window.addEventListener('resize', enforceGate);
  window.addEventListener('orientationchange', enforceGate);
  document.addEventListener('fullscreenchange', enforceGate);
  document.addEventListener('webkitfullscreenchange', enforceGate);
  window.addEventListener('load', enforceGate);

  // Expose helpers
  window.ensureFullscreen = ensureFullscreen;
  window.lockLandscape = lockLandscape;
  window.enforceGate = enforceGate;
})();

/* === ESC pauses; overlay gates if fullscreen is lost === */
(function(){
  document.addEventListener('keydown', function(e){
    if(e.code === '__EscDisabled__'){
      try{ e.preventDefault(); e.stopPropagation(); }catch(_){}
      try{ if (typeof setPaused==='function') setPaused(true); }catch(_){}
      if (typeof window.enforceGate==='function') window.enforceGate();
    }
  }, true);
  // Android Back -> Pause
  window.addEventListener('load', function(){
    try{ history.pushState(null, document.title, location.href); }catch(_){}
  });
  window.addEventListener('popstate', function(e){
    e.preventDefault();
    try{ if (typeof setPaused==='function') setPaused(true); }catch(_){}
    try{ history.pushState(null, document.title, location.href); }catch(_){}
    if (typeof window.enforceGate==='function') window.enforceGate();
  });
})();

/* === Pause menu: Options & Exit buttons wiring === */
(function(){
  const pauseOptionsBtn = document.getElementById('pauseOptionsBtn');
  const pauseExitBtn = document.getElementById('pauseExitBtn');
  const optionsPanel = document.getElementById('optionsPanel');

  if (pauseOptionsBtn){
    pauseOptionsBtn.addEventListener('click', function(){
      if (typeof setPaused === 'function') setPaused(false); // close pause before opening
      if (optionsPanel){ if (typeof setPaused==='function') setPaused(true); optionsPanel.classList.add('show'); }
    });
  }
  if (pauseExitBtn){
    pauseExitBtn.addEventListener('click', function(){
      try{ location.reload(); }catch(_){}
    });
  }
})();

/* === Pause menu: Resume/Options/Exit buttons wiring (idempotent) === */
(function(){
  const btnResume  = document.getElementById('pauseResumeBtn');
  const btnOptions = document.getElementById('pauseOptionsBtn');
  const btnExit    = document.getElementById('pauseExitBtn');
  const optionsPanel = document.getElementById('optionsPanel');
  if (btnResume)  btnResume.onclick  = () => { if (typeof setPaused==='function') setPaused(false); };
  if (btnOptions) btnOptions.onclick = () => { if (typeof setPaused==='function')  if (optionsPanel) optionsPanel.classList.add('show'); };
  if (btnExit)    btnExit.onclick    = () => { try{ location.reload(); }catch(_){} };
})();

/* === Backspace toggles Pause (robust) + focus helpers === */
(function(){
  // ensure body can receive keyboard focus
  try{ document.body.tabIndex = -1; }catch(_){}
  function focusGame(){ try{ window.focus(); document.body.focus({preventScroll:true}); }catch(_){ } }
  window.addEventListener('load', focusGame);
  window.addEventListener('pointerdown', focusGame);

  const pauseOv = document.getElementById('pause');

  function isEditableTarget(t){
    if(!t) return false;
    const tag = (t.tagName||'').toLowerCase();
    if (tag === 'input' || tag === 'textarea') return true;
    if (t.isContentEditable) return true;
    return false;
  }

  function isBackspace(e){
    return (e.code === 'Backspace') || (e.key === 'Backspace') || (e.keyCode === 8);
  }

  document.addEventListener('keydown', function(e){
    if (!isBackspace(e)) return;
    if (isEditableTarget(e.target)) return; // don't interfere with typing
    try{ e.preventDefault(); e.stopPropagation(); }catch(_){}
    if (pauseOv && pauseOv.classList.contains('show')){
      if (typeof setPaused === 'function') setPaused(false); // resume
    } else {
      if (typeof setPaused === 'function') setPaused(true);  // pause
    }
    if (typeof window.enforceGate==='function') window.enforceGate();
  }, true);
})();

// Reapply boss sprite offset on resize/orientation change
function reapplyBossOffsets(){
  try{
    for(const e of enemies){
      if(e && e.isBoss) applyBossSpriteOffset(e);
    }
  }catch(_){}
}
window.addEventListener('resize', reapplyBossOffsets, { passive:true });
window.addEventListener('orientationchange', reapplyBossOffsets, { passive:true });

function checkPlayerEnemyContact(){
  if (player && (player.invulTimer>0 || player.state==='dead' || player.state==='predead' || player.isInvisible)) return;
try{
    // Don't run while in menus/intro/pause/end
    if (typeof controlsLocked !== 'undefined' && controlsLocked) return;
    if (typeof paused !== 'undefined' && paused) return;
    if (typeof gameEnded !== 'undefined' && gameEnded) return;
    try{
      const startEl = document.getElementById('startScreen');
      if (startEl && startEl.style.display !== 'none') return;
    }catch(_){}

    if (!Array.isArray(enemies) || !player) return;
    if (player.invulTimer > 0 || player.state === 'dead' || player.state === 'predead') return;

    for (let i = 0; i < enemies.length; i++){
      const e = enemies[i];
      if (!e || e.dead) continue;
      if (e.state === 'attack' && e.attackType && e.attackPhase !== 'dash' && e.attackPhase !== 'lunge') continue;
      if (e.aiPattern === 'evade' || e.aiPattern === 'jumpEvade' || e.aiPattern === 'edgeEscape' || e.aiPattern === 'crossEvade') continue;

      // hitbox adaptiv — permite jucătorului să se apropie mai mult înainte de damage
const coarse = window.matchMedia && matchMedia('(pointer:coarse)').matches;
const baseMargin = coarse ? 16 : 24; // mobil mai permisiv, desktop moderat
const scale = Math.min(e.w, e.h, player.w, player.h);
const prop = Math.round(scale * 0.12); // 12% din sprite ca bază
// Enemy: mai mult shrink, Player: mai puțin shrink => contact "mai adânc" necesar
const marginEnemy = Math.max(10, Math.min(Math.round(baseMargin * 1.4), prop + 6));
const marginPlayer = Math.max(6, Math.min(Math.round(baseMargin * 0.6), Math.max(6, prop - 4)));

// hitbox ENEMY micșorat mai mult (shrinked bbox)
const __shrinkX = 0.6, __shrinkY = 0.5;
const ex = e.x + e.w*(1-__shrinkX)/2, ey = e.y + e.h*(1-__shrinkY)/2,
      ew = Math.max(1, e.w*__shrinkX), eh = Math.max(1, e.h*__shrinkY);
// hitbox PLAYER micșorat mai puțin
const px = player.x + marginPlayer, py = player.y + marginPlayer,
      pw = Math.max(1, player.w - 2*marginPlayer), ph = Math.max(1, player.h - 2*marginPlayer);
        if(player.state==='slide'){ /* ignore enemy while sliding */ } else if (typeof aabb === 'function' && aabb(ex, ey, ew, eh, px, py, pw, ph)){
window.lastDamageSource='contact';
        try{ playSound(Sounds.bite); }catch(_){ } 
        screenShake(250);
        if (e.isBoss) triggerBossBiteVFX();
        if(player.state!=='slide') applyPlayerHitFromProjectile({ x:e.x, y:e.y, w:e.w, h:e.h });
        
        if(player.state!=='slide'){
// Trigger bite animation (enemy or boss)
        try{
          e.biting = true;
          e.biteFrame = 0;
          e.biteTimer = 0;
          e.biteFrameDur = (typeof e.biteFrameDur === 'number' && e.biteFrameDur>0) ? e.biteFrameDur : 0.10;
        }catch(_){}
        // mark that we've just bitten the player; used for post-bite escape logic
        try{
          e.postBiteActive = true;
          e.postBiteCloseTimer = 0;
        }catch(_){}
        }
// Ensure a minimum contact cooldown
        if (typeof player.invulTimer === 'number') { player.invulTimer = Math.max(player.invulTimer, 1.00); }// "One hit per frame" variant:
        break;
      }
    }
  }catch(_){}
}
(function(){
  function readLevel(){ try{ return (typeof currentLevel!=='undefined' && currentLevel>0) ? currentLevel : 1; }catch(_){ return 1; } }
  function readScore(){ try{ return (typeof score!=='undefined') ? score : (window.score||0); }catch(_){ return window.score||0; } }

  // make sure a global score exists (won't interfere if game already defines it)
  if (typeof window.score === 'undefined') window.score = 0;

  function renderTopHud(){
    try{
      var lt = document.getElementById('lvlText');
      var st = document.getElementById('scoreText');
      if(lt) lt.textContent = ' ' + readLevel();
      if(st) st.textContent = ' ' + readScore();
    }catch(e){ /* no-op */ }
  }

  // render now and keep in sync without touching core logic
  renderTopHud();
  try{ setInterval(renderTopHud, 300); }catch(_){}
})();
(function(){
  function pxToNum(v){ const n=parseFloat(v); return isNaN(n)?0:n; }
  function readVar(name){ return getComputedStyle(document.documentElement).getPropertyValue(name).trim(); }
  function safeTopPx(){
    try{ if(window.visualViewport) return window.visualViewport.offsetTop || 0; }catch(_){}
    try{
      const d=document.createElement('div');
      d.style.cssText="position:fixed;top:env(safe-area-inset-top);left:0;visibility:hidden;";
      document.body.appendChild(d);
      const y=d.getBoundingClientRect().top;
      d.remove();
      return y<0?0:y;
    }catch(_){}
    return 0;
  }
  function shouldClamp(){
    try{
      const clampEnabled = pxToNum(readVar('--topClampEnabled')) !== 0;
      if(!clampEnabled) return false;
      // Clamp on devices with safe area OR coarse pointer (phones/tablets) OR very short viewport
      const hasSafe = safeTopPx() > 0;
      const coarse  = window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
      const shortVH = window.innerHeight <= 580;
      return hasSafe || coarse || shortVH;
    }catch(_){ return true; }
  }
  function applyTopDockPadMeasured(){
    const root = document.documentElement;
    const design = pxToNum(readVar('--topDesignPad')); // negative allowed
if (typeof root !== 'undefined' && root) root.style.setProperty('--topDockPad', design + 'px'); // apply intent
    
    // Optionally clamp for mobile/safe-area devices only
    if(!shouldClamp()) return;
    requestAnimationFrame(()=>{
      try{
        const minTop = pxToNum(readVar('--topClampMinPx')) || 1;
        const hud = document.getElementById('hudDockTop');
        if(!hud) return;
        const rect = hud.getBoundingClientRect();
        if(rect.top < minTop){
          const delta = minTop - rect.top;
          const adjusted = design + delta;
if (typeof root !== 'undefined' && root) root.style.setProperty('--topDockPad', adjusted + 'px');
        }
      }catch(_){}
    });
  }
  // Run now and on viewport/zoom/orientation changes
  applyTopDockPadMeasured();
  window.addEventListener('resize', applyTopDockPadMeasured, {passive:true});
  window.addEventListener('orientationchange', applyTopDockPadMeasured, {passive:true});
  if(window.visualViewport){
    visualViewport.addEventListener('resize', applyTopDockPadMeasured, {passive:true});
    visualViewport.addEventListener('scroll', applyTopDockPadMeasured, {passive:true});
  }
})();
(function(){
  function pxToNum(v){ const n=parseFloat(v); return isNaN(n)?0:n; }
  function readVar(name){ return getComputedStyle(document.documentElement).getPropertyValue(name).trim(); }
  function safeTopPx(){
    try{ if(window.visualViewport) return window.visualViewport.offsetTop || 0; }catch(_){}
    try{
      const d=document.createElement('div');
      d.style.cssText="position:fixed;top:env(safe-area-inset-top);left:0;visibility:hidden;";
      document.body.appendChild(d);
      const y=d.getBoundingClientRect().top;
      d.remove();
      return y<0?0:y;
    }catch(_){}
    return 0;
  }
  function shouldClamp(){
    try{
      const clampEnabled = pxToNum(readVar('--topClampEnabled')) !== 0;
      if(!clampEnabled) return false;
      // Clamp on devices with safe area OR coarse pointer (phones/tablets) OR very short viewport
      const hasSafe = safeTopPx() > 0;
      const coarse  = window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
      const shortVH = window.innerHeight <= 580;
      return hasSafe || coarse || shortVH;
    }catch(_){ return true; }
  }
  function applyTopDockPadMeasured(){
    const root = document.documentElement;
    const design = pxToNum(readVar('--topDesignPad')); // negative allowed
if (typeof root !== 'undefined' && root) root.style.setProperty('--topDockPad', design + 'px'); // apply intent
    
    // Optionally clamp for mobile/safe-area devices only
    if(!shouldClamp()) return;
    requestAnimationFrame(()=>{
      try{
        const minTop = pxToNum(readVar('--topClampMinPx')) || 1;
        const hud = document.getElementById('hudDockTop');
        if(!hud) return;
        const rect = hud.getBoundingClientRect();
        if(rect.top < minTop){
          const delta = minTop - rect.top;
          const adjusted = design + delta;
if (typeof root !== 'undefined' && root) root.style.setProperty('--topDockPad', adjusted + 'px');
        }
      }catch(_){}
    });
  }
  // Run now and on viewport/zoom/orientation changes
  applyTopDockPadMeasured();
  window.addEventListener('resize', applyTopDockPadMeasured, {passive:true});
  window.addEventListener('orientationchange', applyTopDockPadMeasured, {passive:true});
  if(window.visualViewport){
    visualViewport.addEventListener('resize', applyTopDockPadMeasured, {passive:true});
    visualViewport.addEventListener('scroll', applyTopDockPadMeasured, {passive:true});
  }
})();
(function(){
  function num(v){ var n=parseFloat(v); return isNaN(n)?0:n; }
  function css(name){ return getComputedStyle(document.documentElement).getPropertyValue(name).trim(); }
  function applyTopAutoLift(){
    var uiS = num(css('--hudScale')) || 1;
    var nudge = num(css('--topNudgeY')) || 0;
    var lift  = nudge * (1 - uiS);  // so net offset = nudge * uiS
    document.documentElement.style.setProperty('--topAutoLiftPx', lift + 'px');
  }
  applyTopAutoLift();
  window.addEventListener('resize', applyTopAutoLift, {passive:true});
  window.addEventListener('orientationchange', applyTopAutoLift, {passive:true});
  if(window.visualViewport){
    visualViewport.addEventListener('resize', applyTopAutoLift, {passive:true});
    visualViewport.addEventListener('scroll', applyTopAutoLift, {passive:true});
  }
})();

