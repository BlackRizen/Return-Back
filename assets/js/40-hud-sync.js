window.GameApp && window.GameApp.registerModule && window.GameApp.registerModule('40-hud-sync', {"entryMarker": "// === SOURCE: #TopDigitsUpdater ===", "description": "HUD digit sync and pre-control bridge utilities."});
/*__MODULE_BOUNDARY__*/
// === SOURCE: #TopDigitsUpdater ===
(function(){
  function ensureDigitSpans(){
    var lt = document.getElementById('lvlText');
    var st = document.getElementById('scoreText');
    if(lt && !lt.querySelector('.digits')){
      lt.innerHTML = 'LEVEL <span class="digits" id="lvlDigits">1</span>';
    }
    if(st && !st.querySelector('.digits')){
      st.innerHTML = 'SCORE: <span class="digits" id="scoreDigits">0</span>';
    }
  }
  function readLevel(){ try{ return (typeof currentLevel!=='undefined' && currentLevel>0)? currentLevel : 1; }catch(_){ return 1; } }
  function readScore(){ try{ return (typeof score!=='undefined' && score>=0)? score : 0; }catch(_){ return 0; } }
  function renderTopDigits(){
    try{
      var ld = document.getElementById('lvlDigits');
      var sd = document.getElementById('scoreDigits');
      if(ld) ld.textContent = String(readLevel());
      if(sd) sd.textContent = String(readScore());
    }catch(_){}
  }
  ensureDigitSpans();
  renderTopDigits();
  // Lightweight polling keeps it in sync with game state without touching core logic
  setInterval(renderTopDigits, 200);
})();
/* ============================
   DEV SKIP (Hold P ≈ 600 ms)
   - active by default in this debug build
   - disable with ?devskip=0 or localStorage.GAMEPOWER_DEV_SKIP=0
   ============================ */
(() => {
  const HOLD_MS = 600;
  const DEV_KEY = 'GAMEPOWER_DEV_SKIP';

  function readSearch(){
    try { return new URLSearchParams(location.search || ''); } catch(_) { return null; }
  }
  function readDevSkipEnabled(){
    try{
      if (window.__DEV_SKIP_ENABLED === false) return false;
      if (window.__DEV_SKIP_ENABLED === true) return true;
      const qs = readSearch();
      if (qs && (qs.get('devskip') === '0' || qs.get('dev') === '0')) return false;
      if (qs && (qs.get('devskip') === '1' || qs.get('dev') === '1')) return true;
      if (window.localStorage){
        const saved = localStorage.getItem(DEV_KEY);
        if (saved === '0') return false;
        if (saved === '1') return true;
      }
    }catch(_){}
    return true;
  }
  function setDevSkipEnabled(flag){
    const enabled = !!flag;
    try{ window.__DEV_SKIP_ENABLED = enabled; }catch(_){}
    try{
      if (window.localStorage){
        if (enabled) localStorage.setItem(DEV_KEY, '1');
        else localStorage.setItem(DEV_KEY, '0');
      }
    }catch(_){}
    try{
      window.dispatchEvent(new CustomEvent('devskip:mode-changed', { detail:{ enabled:enabled } }));
    }catch(_){}
    return enabled;
  }
  function isTransitionBusy(){
    try{
      if (window.GameApp && GameApp.runtime && typeof GameApp.runtime.isActionLocked === 'function'){
        if (GameApp.runtime.isActionLocked('level-transition')) return true;
      }
    }catch(_){}
    return !!window.levelTransitionActive || !!window.__transitionStarting;
  }
  function devSkipToNextLevel() {
    if (!readDevSkipEnabled()) return false;
    if (isTransitionBusy() || window.gameEnded) return false;
    try {
      if (window.GameApp && GameApp.actions && typeof GameApp.actions.devSkipNextLevel === "function") {
        return !!GameApp.actions.devSkipNextLevel();
      }
      if (typeof window.devSkipToNextLevel === "function" && window.devSkipToNextLevel !== devSkipToNextLevel) {
        return !!window.devSkipToNextLevel();
      }
      if (typeof window.beginLevelTransition === "function") {
        return !!window.beginLevelTransition();
      }
    } finally {}
    return false;
  }

  window.__isDevSkipEnabled = readDevSkipEnabled;
  window.__setDevSkipMode = setDevSkipEnabled;
  window.__triggerDevSkip = devSkipToNextLevel;

  let pHeldTimer = null;
  window.addEventListener("keydown", (e) => {
    if (e.code !== "KeyP" || e.repeat) return;
    if (!readDevSkipEnabled()) return;
    clearTimeout(pHeldTimer);
    pHeldTimer = setTimeout(() => {
      devSkipToNextLevel();
    }, HOLD_MS);
  }, true);

  window.addEventListener("keyup", (e) => {
    if (e.code !== "KeyP") return;
    clearTimeout(pHeldTimer);
  }, true);
})();
(function(){
  if (window.__bossL10AddOn_v3) return; window.__bossL10AddOn_v3 = true;

  function scaledSafe(v){ try{ return (typeof scaled==='function') ? scaled(v) : v; }catch(_){ return v; } }

  // CSS minimal, pointer-events: none (nu blochează meniul)
  (function ensureCSS(){
    if (document.getElementById('bossL10AddonCSS_v3')) return;
    const css = document.createElement('style'); css.id = 'bossL10AddonCSS_v3';
    css.textContent = [
      '.stomp-ring{position:absolute;left:0;top:0;border-radius:50%;',
      ' border: calc(2px * var(--uiScale, 1)) solid rgba(255,255,255,.9);',
      ' box-shadow: 0 0 calc(18px * var(--uiScale,1)) rgba(255,255,255,.6);',
      ' transform: translate(-9999px,-9999px) scale(.2); opacity:.9; pointer-events:none; mix-blend-mode:screen;',
      ' transition: transform .6s ease-out, opacity .6s ease-out;}',
      '.stomp-ring.done{opacity:.02;}',
      '.quake{animation:quake .85s cubic-bezier(.36,.07,.19,.97);} ',
      '@keyframes quake{',
      ' 0%{transform:translate(0,0) rotate(0deg);} ',
      ' 10%{transform:translate(12px,-12px) rotate(-1.2deg);} ',
      ' 20%{transform:translate(-14px,10px) rotate(1.0deg);} ',
      ' 30%{transform:translate(16px,8px) rotate(-1.2deg);} ',
      ' 40%{transform:translate(-12px,-16px) rotate(1.0deg);} ',
      ' 50%{transform:translate(14px,-10px) rotate(-1.1deg);} ',
      ' 60%{transform:translate(-16px,12px) rotate(1.0deg);} ',
      ' 70%{transform:translate(12px,12px) rotate(-.9deg);} ',
      ' 80%{transform:translate(-14px,-12px) rotate(1.0deg);} ',
      ' 90%{transform:translate(10px,10px) rotate(-.8deg);} ',
      ' 100%{transform:translate(0,0) rotate(0deg);} ',
      '}'
    ].join('');
    (document.head||document.documentElement).appendChild(css);
  })();

  function spawnStompRing(cx, cy, radiusPx, delaySec){
    try{
      const layer = document.getElementById('particles') || document.body;
      const ring = document.createElement('div');
      ring.className = 'stomp-ring';
      const d = Math.max(8, Math.round(radiusPx*2));
      ring.style.width = d+'px'; ring.style.height = d+'px';
      const left = Math.round(cx - radiusPx), top = Math.round(cy - radiusPx);
      ring.style.transform = `translate(${left}px,${top}px) scale(0.2)`;
      layer.appendChild(ring);
      requestAnimationFrame(()=>{ ring.style.transform = `translate(${left}px,${top}px) scale(1)`; });
      const ms = Math.max(10, (delaySec||0.6)*1000);
      setTimeout(()=> ring.classList.add('done'), ms-80);
      setTimeout(()=>{ try{ ring.remove(); }catch(_){ } }, ms+420);
    }catch(_){}
  }

  function bigQuake(ms){
    try{
      const el = document.body || document.documentElement;
      el.classList.remove('quake'); void el.offsetWidth; el.classList.add('quake');
      setTimeout(()=>{ try{ el.classList.remove('quake'); }catch(_){ } }, Math.max(120, ms||850));
    }catch(_){}
  }

  // Proiectil special "wave": 2× dimensiune + sprite direcțional (left/right)
  function enemyShootWave(e, playAudio){
    if(!e || e.dead) return;
    const dir = e.dir;
    const centerX = e.x + (dir==='right' ? e.w*0.82 : e.w*(1-0.82));
    const yRatio = (e && e._shotHeight==='low') ? 0.82 : (e && e._shotHeight==='mid') ? 0.62 : 0.70;
    const y = e.y + e.h*yRatio;
    const b = {
      x: centerX + (dir==='right' ? 12 : -12),
      y: y,
      w: Math.round(scaledSafe(260)),   // 2× față de 130
      h: Math.round(scaledSafe(128)),   // 2× față de 64
      vx: (dir==='right' ? 1 : -1) * scaledSafe(520),
      t:0, el: document.createElement('div'),
      dir: dir, isBoss:true, kind:'wave', wave:true,
      steer: 0.08, maxVy: scaledSafe(220)  // steer vertical DOAR pentru wave
    };
    b.el.className = 'eproj wave';
    b.el.style.width = b.w + 'px';
    const img = document.createElement('img');
    img.src = (dir==='right' ? 'wave_right.png' : 'wave_left.png');
    b.el.appendChild(img);
    b.el.style.transform = `translate(${b.x}px, ${b.y}px)`;
    try{ (document.getElementById('enemyProjectiles')||document.body).appendChild(b.el); }catch(_){}
    try{ enemyProjectiles.push(b); }catch(_){ try{ window.enemyProjectiles.push(b); }catch(__){} }
    e._shotHeight = null;
    if(playAudio && window.playSound && window.Sounds){ try{ playSound(Sounds.enemyShoot); }catch(_){ } }
    return b;
  }

  // Steer vertical pentru wave (nu atingem restul proiectilelor)
  function installWaveSteer(){
    if (window.__waveSteerPatched || typeof window.updateEnemyProjectiles !== 'function') return;
    const base = window.updateEnemyProjectiles;
    window.updateEnemyProjectiles = function(dt){
      base(dt);
      try{
        for(let i=0;i<(enemyProjectiles?enemyProjectiles.length:0);i++){
          const b = enemyProjectiles[i];
          if(!b || !b.mp3e) continue;
          const targetY = (player ? (player.y + player.h*0.8) : b.y);
          const dy = targetY - b.y;
          const vy = Math.max(-b.maxVy, Math.min(b.maxVy, dy * b.steer));
          b.y += vy * dt;
          b.el.style.transform = `translate(${b.x}px, ${Math.round(b.y)}px)`;
        }
      }catch(_){}
    };
    window.__waveSteerPatched = true;
  }

  // Îmbunătățim selectorul de atac (dar nu atingem meniul): ne instalăm DUPĂ Start
  function installImprovedAttacks(){
    installWaveSteer();
    if (window.__domainOwnsBossAttacks) return;
    if (typeof window.bossAttackFire === 'function' && !window.__bossAttackWrapped_v3){
      const orig = window.bossAttackFire;
      window.bossAttackFire = function(e){
        if(!(e && e.isBoss && typeof currentLevel!=='undefined' && currentLevel===10)) return orig(e);
        const roll = Math.random();
        const DY = scaledSafe(38);
        const delay = (ms,fn)=> setTimeout(fn, ms);
        const fireOnce = (offY=0)=>{ const oy=e.y; e.y+=offY; enemyShoot(e,false); e.y=oy; };

        if(roll < 0.34){
          // NORMAL – jos/mijloc
          e._shotHeight = (Math.random()<0.5 ? 'low' : 'mid');
          fireOnce(0);
          try{ playSound(Sounds.spit); }catch(_){}
        } else if(roll < 0.67){
          // RAFALĂ U/D/M – low/mid înălțime reală la spawn
          const lanes = [ {off:-DY,h:'low'}, {off:DY,h:'low'}, {off:0,h:'mid'} ];
          let t=0;
          lanes.forEach(L=>{
            for(let i=0;i<3;i++){
              delay(t, ()=>{ e._shotHeight=L.h; fireOnce(L.off); });
              t += 70;
            }
            t += 120;
          });
          try{ playSound(Sounds.spit); }catch(_){}
        } else {
// STOMP – jump up, slam down, then seismic ring + wave
__bossJumpSlamAndWave(e);
}
      };
      window.__bossAttackWrapped_v3 = true;
    }
  }

  // Instalare DUPĂ Start (menu-safe)
  try{
    const btn = document.getElementById('startBtn');
    if(btn){
      btn.addEventListener('click', function once(){
        btn.removeEventListener('click', once);
        setTimeout(installImprovedAttacks, 0);
      });
    } else {
      document.addEventListener('DOMContentLoaded', ()=> setTimeout(installImprovedAttacks, 500));
    }
  }catch(_){}
})();
(function(){
  const choiceOv = document.getElementById('levelChoice');
  const pauseEl  = document.getElementById('pause');
  let choiceActive = false;
  let openedVia = null; // 'test' | 'flow'
  let prevPausedState = null; // true/false/null

  function getPaused(){
    try{
      if (typeof isPaused !== 'undefined') return !!isPaused;
      if (typeof gamePaused !== 'undefined') return !!gamePaused;
    }catch(_){}
    return null;
  }

  function pauseGame(){
    try{
      prevPausedState = getPaused();
      if (typeof setPaused === 'function') setPaused(true);
      else {
        // fallback: freeze controls & spawns
        try{ controlsLocked = true; }catch(_){}
        try{ enemySpawnsEnabled = false; }catch(_){}
      }
    }catch(_){}
  }
  function resumeGame(){
    try{
      if (typeof setPaused === 'function'){
        // If we knew it wasn't paused before, resume; otherwise keep existing state
        if (prevPausedState === false || prevPausedState === null) setPaused(false);
      }else{
        try{ controlsLocked = false; }catch(_){}
        try{ enemySpawnsEnabled = true; }catch(_){}
      }
    }catch(_){}
    prevPausedState = null;
  }

  function showLevelChoice(mode){
    if (!choiceOv) return;
    pauseGame();
    try{ fadeEnemies(); }catch(_){} document.body.classList.add('choice-open');
    choiceOv.classList.add('show','animating-in');
    const onIn = function(e){ if(e.target!==choiceOv) return; choiceOv.classList.remove('animating-in'); choiceOv.removeEventListener('animationend', onIn); };
    choiceOv.addEventListener('animationend', onIn);
    choiceActive = true;
    openedVia = mode === 'test' ? 'test' : 'flow';
  }

  function hideLevelChoice(){
  choiceOv.classList.add('animating-out');
  const onOut = function(e){
    if(e.target!==choiceOv) return;
    choiceOv.classList.remove('animating-out','show');
    document.body.classList.remove('choice-open');
    choiceActive = false;

    // revenim din pauză (deblochează input etc.)
    resumeGame();

    // oprim spawn-urile încă 5s după închidere
    try{ enemySpawnsEnabled = false; }catch(_){}
    setTimeout(()=>{
      try{ enemySpawnsEnabled = true; }catch(_){}
      try{ if(enemies.length===0) spawnEnemy(); }catch(_){}
    }, 5000);

    openedVia = null;
    choiceOv.removeEventListener('animationend', onOut);
  };
  choiceOv.addEventListener('animationend', onOut);
}

  // Click on a button -> apply effect (optional) and close
  choiceOv?.addEventListener('click', function(e){
    const btn = e.target.closest('.choice-btn');
    if (!btn) return;
    const kind = btn.getAttribute('data-choice');
    try{
      if (kind === 'health'){ if (typeof hpAdd==='function') hpAdd(25); }
      if (kind === 'repair'){ if (typeof tryRepairShip==='function') tryRepairShip(); }
      if (kind === 'powerup'){ if (typeof grantRandomPowerup==='function') grantRandomPowerup(); }
    }catch(_){}
    hideLevelChoice();
  });

  // Test toggle with key 'O'
  document.addEventListener('keydown', function(e){
    if (e.key === 'o' || e.key === 'O'){
      e.preventDefault();
      if (!choiceActive) showLevelChoice('test');
      else if (openedVia === 'test') hideLevelChoice();
    }
  });

  // Expose for level-flow usage
  window.showLevelChoice = function(){ showLevelChoice('flow'); };
  window.hideLevelChoice = hideLevelChoice;
})();
(function(){
  // Simple SFX manager for overlay + buttons
  const SFX = {
    open: new Audio('open.mp3'),
    b1:   new Audio('button1.mp3'),
    b2:   new Audio('button2.mp3'),
    b3:   new Audio('button3.mp3')
  };
  try{ Object.values(SFX).forEach(a => a && (a.preload = 'auto')); }catch(_){}

  function applySettings(a){
    try{ 
      const volEl = document.getElementById('sfxVol');
      const muteEl = document.getElementById('muteAll');
      const vol = volEl ? Math.max(0, Math.min(1, parseFloat(volEl.value))) : 0.85;
      const muted = muteEl ? !!muteEl.checked : false;
      a.volume = vol;
      a.muted = muted;
    }catch(_){
      // defaults already set
    }
  }

  // robust play helper that retries once on first user gesture if autoplay is blocked
  window.playSfx = function(key){
    try{
      const a = (window.__SFX || SFX)[key];
      if(!a) return;
      applySettings(a);
      a.currentTime = 0;
      const p = a.play();
      if (p && typeof p.catch === 'function') {
        p.catch(err => {
          if (err && err.name === 'NotAllowedError') {
            const once = () => { try{ a.currentTime = 0; a.play().catch(()=>{}); }catch(_){}
                                  window.removeEventListener('pointerdown', once, true);
                                  window.removeEventListener('keydown', once, true); };
            window.addEventListener('pointerdown', once, true);
            window.addEventListener('keydown', once, true);
          }
        });
      }
    }catch(_){}
  };

  window.__SFX = SFX;

  // Auto-play 'open' when levelChoice overlay becomes visible
  const ov = document.getElementById('levelChoice');
  if (ov) {
    const obs = new MutationObserver((muts)=>{
      for (const m of muts) {
        if (m.attributeName === 'class') {
          const isShown = ov.classList.contains('show');
          if (isShown && !ov.__openPlayed) { ov.__openPlayed = true; playSfx('open'); }
          if (!isShown) { ov.__openPlayed = false; }
        }
      }
    });
    obs.observe(ov, { attributes: true, attributeFilter: ['class'] });
  }

  // Button-specific SFX (delegated)
  
ov?.addEventListener('click', (e)=>{
  const btn = e.target.closest('.choice-btn');
  if (!btn) return;
  const kind = btn.getAttribute('data-choice');

  // --- Play per-button SFX ---
  if (kind === 'powerup') playSfx('b1');
  else if (kind === 'health') playSfx('b2');
  else if (kind === 'repair') playSfx('b3');

  // --- Ripple FX (centered at click/tap point) ---
  try{
    const rect = btn.getBoundingClientRect();
    const cx = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left;
    const cy = (e.touches ? e.touches[0].clientY : e.clientY) - rect.top;
    const d = Math.max(rect.width, rect.height) * 2.4; // diameter
    const rip = document.createElement('span');
    rip.className = 'ripple';
    rip.style.left = cx + 'px';
    rip.style.top  = cy + 'px';
    rip.style.width = d + 'px';
    rip.style.height = d + 'px';
    btn.appendChild(rip);
    setTimeout(()=>{ try{ rip.remove(); }catch(_){ } }, 700);
  }catch(_){}

  // --- Overlay shake (short) ---
  try{
    const ovEl = document.getElementById('levelChoice');
    if (ovEl){
      ovEl.classList.remove('shake');
      void ovEl.offsetWidth; // reflow to restart animation
      ovEl.classList.add('shake');
      setTimeout(()=>{ try{ ovEl.classList.remove('shake'); }catch(_){ } }, 360);
    }
  }catch(_){}
});
})();
(function(){
  const PRE_DELAY = 1000; // ms until effect starts
  const POWER_DUR = 1600;
  const HEALTH_DUR = 2000;

  const playerEl  = document.getElementById('player');
  const playerImg = document.getElementById('playerImg');

  // SFX
  let powerSfx, healthSfx;
  try{ powerSfx = new Audio('powerup.mp3'); powerSfx.preload = 'auto'; }catch(_){}
  try{ healthSfx = new Audio('healthup.mp3'); healthSfx.preload = 'auto'; }catch(_){}

  // preloads
  try{ new Image().src='player_powerup_5.png'; new Image().src='player_powerup_5left.png'; }catch(_){}
  try{ new Image().src='healthleft.png'; new Image().src='healthright.png'; }catch(_){}

  // helpers
  function centerOnPlayer(el, xb=0.5, yb=0.6){
    const cs = getComputedStyle(playerEl);
    const px = parseFloat(cs.getPropertyValue('--px')) || 0;
    const py = parseFloat(cs.getPropertyValue('--py')) || 0;
    const pw = parseFloat(cs.getPropertyValue('--pw')) || 220;
    el.style.left = (px + pw*xb) + 'px';
    el.style.top  = (py + pw*yb) + 'px';
  }
  

// helper: single, crisp big shake; re-triggerable
function bigShake(ms=220){
  try{
    const b = document.body;
    b.classList.remove('quake-big');
    // force reflow to restart CSS animation reliably
    void b.offsetWidth;
    b.classList.add('quake-big');
    setTimeout(()=>{ try{ b.classList.remove('quake-big'); }catch(_){} }, ms + 30);
  }catch(_){}
}

function spawnPowerRipples(){
    const cs = getComputedStyle(playerEl);
    const pw = parseFloat(cs.getPropertyValue('--pw')) || 220;
    const mk = (cls,delay=0,scale=5)=>{
      const r=document.createElement('div'); r.className=cls;
      r.style.setProperty('--rScale',scale.toFixed(2));
      r.style.animationDelay = delay+'ms';
      document.body.appendChild(r); centerOnPlayer(r);
      setTimeout(()=>{ try{ r.remove(); }catch(_){} }, 1600);
    };
    mk('ripple',0,Math.min(7, Math.max(4.5, pw/40)));
    mk('ripple',120,Math.min(7.4, Math.max(4.8, pw/38)));
    mk('ripple ring',60,Math.min(8, Math.max(5.2, pw/36)));
  }
  function spawnHealthPluses(){
    const cs = getComputedStyle(playerEl);
    const pw = parseFloat(cs.getPropertyValue('--pw')) || 220;
    const count = 14;
    for(let i=0;i<count;i++){
      const p = document.createElement('div');
      p.className='hplus';
      p.textContent='+';
      const size = Math.round(48 + Math.random()*36); // BIG: 48–84px
      p.style.fontSize = size+'px';
      const offX = (Math.random()*0.5 - 0.25) * pw;
      const rise = 180 + Math.random()*260;
      const dur  = 1.4 + Math.random()*0.8;
      p.style.setProperty('--rise', rise+'px');
      p.style.setProperty('--dur', dur+'s');
      document.body.appendChild(p);
      centerOnPlayer(p, 0.5 + offX/pw, 0.58 + Math.random()*0.06);
      setTimeout(()=>{ try{ p.remove(); }catch(_){} }, (dur*1000)|0 + 200);
    }
  }
  function lockInputs(ms){
    try{
      window.controlsLocked = true;
      if (typeof keys!=='undefined'){ keys.a=keys.d=keys.w=keys.s=keys.f=false; }
      if (typeof touch!=='undefined'){ touch.left=touch.right=touch.jump=touch.fire=false; }
      if (typeof shootHeld!=='undefined') shootHeld=false;
      setTimeout(()=>{ try{ window.controlsLocked=false; }catch(_){} }, ms);
    }catch(_){}
  }
  // Global event filter while controlsLocked
  ;['keydown','keyup','pointerdown','pointerup','touchstart','touchend','touchcancel'].forEach(t=>{
    addEventListener(t, ev=>{
      try{
        if(window.controlsLocked){ if(ev.cancelable) ev.preventDefault(); ev.stopImmediatePropagation(); ev.stopPropagation(); return false; }
      }catch(_){}
    }, true);
  });

  // protect sprite during effect (ignore idle/run setImg)
  if (typeof window.setImg === 'function' && !window.setImg.__powerPatch){
    const orig = window.setImg;
    window.setImg = function(src){
      if (window.__spriteLockUntil && Date.now() < window.__spriteLockUntil) return;
      return orig.apply(this, arguments);
    };
    window.setImg.__powerPatch = true;
  }

  function figureFacing(){
    let facing='right';
    try{
      const s=(playerImg.currentSrc||playerImg.src||'').toLowerCase();
      if(s.includes('left')) facing='left';
    }catch(_){}
    return facing;
  }

  // POWER-UP sequence
  window.playPowerup = function(){
    window.__spriteLockUntil = Date.now() + POWER_DUR;
    // pick directional sprite
    const keep = playerImg.src;
    const facing = figureFacing();
    playerImg.src = (facing==='left') ? 'player_powerup_5left.png' : 'player_powerup_5.png';
    // visuals
    playerEl.classList.add('powering');
    const ring=document.createElement('div'); ring.className='power-ring'; document.body.appendChild(ring); centerOnPlayer(ring);
    spawnPowerRipples();
    try{ powerSfx && (powerSfx.currentTime=0, powerSfx.play().catch(()=>{})); }catch(_){}
    setTimeout(()=>{ try{ playerEl.classList.remove('powering'); playerImg.src = keep; ring.remove(); }catch(_){} }, POWER_DUR);
  };

  // HEALTH-UP sequence
  window.playHealthUp = function(){
    window.__spriteLockUntil = Date.now() + HEALTH_DUR;
    const keep = playerImg.src;
    const facing = figureFacing();
    playerImg.src = (facing==='left') ? 'healthleft.png' : 'healthright.png';
    playerEl.classList.add('healthing');
    const beam=document.createElement('div'); beam.className='health-beam'; document.body.appendChild(beam); centerOnPlayer(beam,0.5,0.64);
    spawnHealthPluses();
    try{ healthSfx && (healthSfx.currentTime=0, healthSfx.play().catch(()=>{})); }catch(_){}
    setTimeout(()=>{ try{ playerEl.classList.remove('healthing'); playerImg.src = keep; beam.remove(); }catch(_){} }, HEALTH_DUR);
  };

  // Bind overlay buttons: start lock immediately, then run after PRE_DELAY
  function bind(){
    const ov=document.getElementById('levelChoice'); if(!ov) return;
    ov.addEventListener('click', e=>{
      const powerBtn = e.target.closest('#levelChoice .choice-btn[data-choice="powerup"]');
      const healthBtn = e.target.closest('#levelChoice .choice-btn[data-choice="health"]');
      if(!powerBtn && !healthBtn) return;
      
      
      
      // === Buy rules: Power uses 20 scrap, Health uses 10 wood (robust read/write) ===
      var s = Number((typeof scrapCount!=='undefined' ? scrapCount : (window.scrapCount||0)))|0;
      var w = Number((typeof woodCount!=='undefined' ? woodCount : (window.woodCount||0)))|0;

      if (powerBtn){
        if ( s < 20 ){
        try{ e.preventDefault(); e.stopImmediatePropagation(); }catch(_){}
        try{ __squelchSFXExceptError(700); }catch(_){}
        try{ playSound(Sounds.error || new Audio('error.mp3')); }catch(_){}try{ document.getElementById('levelChoice').classList.add('shake'); setTimeout(()=>document.getElementById('levelChoice').classList.remove('shake'), 360); }catch(_){}
          return;
        }
        s = Math.max(0, s - 20);
        if (typeof scrapCount!=='undefined') { scrapCount = s; } else { window.scrapCount = s; }
      } else if (healthBtn){
        if ( w < 10 ){
        try{ e.preventDefault(); e.stopImmediatePropagation(); }catch(_){}
        try{ __squelchSFXExceptError(700); }catch(_){}
        try{ playSound(Sounds.error || new Audio('error.mp3')); }catch(_){}try{ document.getElementById('levelChoice').classList.add('shake'); setTimeout(()=>document.getElementById('levelChoice').classList.remove('shake'), 360); }catch(_){}
          return;
        }
        w = Math.max(0, w - 10);
        if (typeof woodCount!=='undefined') { woodCount = w; } else { window.woodCount = w; }
      
        try{ if (typeof setHealth==='function') setHealth((typeof health!=='undefined'?health:0) + 30); }catch(_){ }
}
      try{ renderResourcesHud(); }catch(_){}

      // Unlock a random ability tab (invisibility or telekinesis) when buying POWER.
      // Each ability can drop at most once across the game.
      if (powerBtn){
        try{
          var tab = document.getElementById('invisAbilityTab');
          if (tab){
            var pool = [];
            if (!window.__invisTabUnlocked) pool.push('invis');
            try{
              if (typeof telekTabUnlocked === 'boolean' && !telekTabUnlocked) pool.push('telek');
            }catch(_){}
            if (pool.length){
              var pick = pool[Math.floor(Math.random()*pool.length)];
              if (pick === 'invis'){
                window.__invisTabUnlocked = true;
                tab.src = 'taginvis.png';
              } else if (pick === 'telek'){
                try{ telekTabUnlocked = true; }catch(_){}
                tab.src = 'tagmanipulation.png';
              }
              tab.classList.add('unlocking');
              setTimeout(function(){
                try{ tab.classList.remove('unlocking'); }catch(_){}
              }, 450);
            }
          }
        }catch(_){}
      }
      const DUR = powerBtn ? POWER_DUR : HEALTH_DUR;
lockInputs(PRE_DELAY + DUR + 60);
      setTimeout(()=>{ try{ (powerBtn?playPowerup:playHealthUp)(); }catch(_){} }, PRE_DELAY);
      // extra juice: screenshake right away
      try{ document.body.classList.add('shake'); setTimeout(()=>document.body.classList.remove('shake'), 460); }catch(_){}
    }, true);
  }
  if(document.readyState==='LOADING') addEventListener('DOMContentLoaded', bind); else bind();

  // Observer to ensure power ripples & ring stay centered behind player
  const mo = new MutationObserver(muts=>{
    for(const m of muts){
      if(m.type==='childList'){
        m.addedNodes.forEach(n=>{
          if(!(n instanceof HTMLElement)) return;
          if(n.classList.contains('power-ring') || n.classList.contains('ripple')) centerOnPlayer(n);
        });
      }
    }
  });
  mo.observe(document.body || document.documentElement, {childList:true, subtree:true});
})();
(function(){
  const PRE_DELAY = 1000;
  const FRAME_MS  = 405;       // slower
  const LOOPS     = 3;         // 2 frames × 3 = 6 total frames
  const TOTAL_MS  = FRAME_MS * 2 * LOOPS;
  const SHOCK_FRAMES = new Set([1,3,5]);

  const playerEl  = document.getElementById('player');
  const playerImg = document.getElementById('playerImg');
  let repairSfx;
  try{ repairSfx = new Audio('repair.mp3'); repairSfx.preload='auto'; }catch(_){}

  function centerOnPlayer(el, xb=0.5, yb=0.6){
    const cs = getComputedStyle(playerEl);
    const px = parseFloat(cs.getPropertyValue('--px')) || 0;
    const py = parseFloat(cs.getPropertyValue('--py')) || 0;
    const pw = parseFloat(cs.getPropertyValue('--pw')) || 220;
    el.style.left = (px + pw*xb) + 'px';
    el.style.top  = (py + pw*yb) + 'px';
  }
  function figureFacing(){
    let facing='right';
    try{ const s=(playerImg.currentSrc||playerImg.src||'').toLowerCase(); if(s.includes('left')) facing='left'; }catch(_){}
    return facing;
  }
  function framesForFacing(side){
    const base = side==='left' ? 'repairleft' : 'repairright';
    return [base+'1.png', base+'2.png'];
  }
  function spawnSparks(burst=22){
    for(let i=0;i<burst;i++){
      const s = document.createElement('div');
      s.className = 'spark';
      const ang = (Math.random()*Math.PI) - Math.PI/2; // upward
      const speed = 120 + Math.random()*140;
      const dx = Math.cos(ang) * (speed * (0.35 + Math.random()*0.25));
      const dy = -Math.abs(Math.sin(ang) * speed);
      const rot = Math.atan2(dy, dx);
      s.style.setProperty('--dx', dx.toFixed(1)+'px');
      s.style.setProperty('--dy', dy.toFixed(1)+'px');
      s.style.setProperty('--rot', rot+'rad');
      s.style.setProperty('--dur', (1.5 + Math.random()*1.0).toFixed(2)+'s');
      document.body.appendChild(s);
      centerOnPlayer(s, 0.5, 0.88);
      setTimeout(()=>{ try{ s.remove(); }catch(_){ } }, 1300);
    }
  }

  window.playRepair = function(){
  try{ window.startRepairFX && window.startRepairFX(); }catch(_){ }

    const keep = playerImg.src;
    const facing = figureFacing();
    const [f1,f2] = framesForFacing(facing);
    window.__spriteLockUntil = Date.now() + TOTAL_MS + 50;
    // SFX
    try{ if(repairSfx){ repairSfx.currentTime=0; repairSfx.play().catch(()=>{});} }catch(_){}
    let frameIndex = 0, tick = 0;
    playerImg.src = f1;
    const iv = setInterval(()=>{
      frameIndex = 1 - frameIndex;
      tick++;
      playerImg.src = (frameIndex===0) ? f1 : f2;
      if(SHOCK_FRAMES.has(tick)){
        try{ bigQuake(180); }catch(_){}
        spawnSparks(26);
      }
      
      if(tick >= 2*LOOPS){
        try{ window.__repairFXStop && window.__repairFXStop(); }catch(_){ }

        clearInterval(iv);
        setTimeout(()=>{ try{ playerImg.src = keep; }catch(_){ } 
          try{
            if (window.__shipDownFillBar){
              window.__shipDownFillBar.show && window.__shipDownFillBar.show();
              window.__shipDownFillBar.incr && window.__shipDownFillBar.incr();
            }
          }catch(_){}
          try{
            var __lvl = (window.__shipDownFillBar && window.__shipDownFillBar.get) ? window.__shipDownFillBar.get() : 0;
            if (__lvl >= 4 && !window.__repairDepartScheduled){
              window.__repairDepartScheduled = true;
              setTimeout(function(){
                try{
                  shipState = 'warmup'; warmupTimer = 2.0;
                  if (typeof shipEl!=='undefined' && shipEl && shipEl.classList) shipEl.classList.add('wiggle');
                  if (typeof playSound==='function' && typeof Sounds!=='undefined' && Sounds && Sounds.shipWarmup){
                    playSound(Sounds.shipWarmup);
                  }
                }catch(e){
                  try{ window.dispatchEvent(new CustomEvent('startShipDepartureByRepair')); }catch(_){}
                }
              }, 1000);
            }
          }catch(e){}
        }, FRAME_MS);
      }

    }, FRAME_MS);
  };

  function lockInputs(ms){
    try{
      window.controlsLocked = true;
      if (typeof keys!=='undefined'){ keys.a=keys.d=keys.w=keys.s=keys.f=false; }
      if (typeof touch!=='undefined'){ touch.left=touch.right=touch.jump=touch.fire=false; }
      if (typeof shootHeld!=='undefined') shootHeld=false;
      setTimeout(()=>{ try{ window.controlsLocked=false; }catch(_){} }, ms);
    }catch(_){}
  }

  function bind(){
    const ov = document.getElementById('levelChoice');
    if(!ov) return;
    ov.addEventListener('click', function(e){
      const btn = e.target.closest('#levelChoice .choice-btn[data-choice="repair"]');
      if(!btn) return;
      
      
      
      // === Buy rule: Repair costs 25 circuits (robust read/write) ===
      var c = Number((typeof circuitsCount!=='undefined' ? circuitsCount : (window.circuitsCount||0)))|0;
      if ( c < 25 ){
        try{ e.preventDefault(); e.stopImmediatePropagation(); }catch(_){}
        try{ __squelchSFXExceptError(700); }catch(_){}
        try{ playSound(Sounds.error || new Audio('error.mp3')); }catch(_){}try{ document.getElementById('levelChoice').classList.add('shake'); setTimeout(()=>document.getElementById('levelChoice').classList.remove('shake'), 360); }catch(_){}
        return;
      }
      c = Math.max(0, c - 25);
      if (typeof circuitsCount!=='undefined') { circuitsCount = c; } else { window.circuitsCount = c; }
      try{ renderResourcesHud(); }catch(_){}
lockInputs(PRE_DELAY + TOTAL_MS + 80);
      setTimeout(()=>{ try{ playRepair(); }catch(_){ } }, PRE_DELAY);
    }, true);
  }
  if(document.readyState==='LOADING') document.addEventListener('DOMContentLoaded', bind); else bind();

  // Preload frames (best-effort)
  try{ ['repairleft1.png','repairleft2.png','repairright1.png','repairright2.png'].forEach(src=>{ const i=new Image(); i.src=src; }); }catch(_){}
})();

