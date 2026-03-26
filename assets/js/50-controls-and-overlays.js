window.GameApp && window.GameApp.registerModule && window.GameApp.registerModule('50-controls-and-overlays', {"entryMarker": "// === SOURCE: #touch-parity-js ===", "description": "Touch controls, fullscreen-safe helpers, level-choice controls, button interactions."});
/*__MODULE_BOUNDARY__*/
// === SOURCE: #touch-parity-js ===
(function(){
  const isTouchDevice = matchMedia('(hover: none), (pointer: coarse)').matches;
  if(!isTouchDevice) { document.body.classList.add('touch-hidden'); return; }

  const TOUCH_KEYS = {
    MOVE_LEFT:  'KeyA',
    MOVE_RIGHT: 'KeyD',
    JUMP:       'KeyW',
    FIRE:       'KeyF'
  ,
  CROUCH:     'KeyS'
};

  const keyState = new Map();
  function sendKey(key, type){
    const ev = new KeyboardEvent(type, {key, code:key, bubbles:true, cancelable:true});
    document.activeElement && document.activeElement.blur?.();
    document.dispatchEvent(ev);
    window.dispatchEvent(ev);
  }
  function press(key){ if(keyState.get(key)) return; keyState.set(key, true); sendKey(key,'keydown'); }
  function release(key){ if(!keyState.get(key)) return; keyState.set(key, false); sendKey(key,'keyup'); }
  function releaseAll(){ for(const [k,v] of keyState) if(v) release(k); }

  const ui = document.createElement('div');
  ui.className = 'touch-ui';
  ui.innerHTML = `
    <button class="btn btn-left"  data-key="${TOUCH_KEYS.MOVE_LEFT}">◀</button>
    <button class="btn btn-right" data-key="${TOUCH_KEYS.MOVE_RIGHT}">▶</button>
  <button class="btn btn-crouch" data-key="KeyS">▾</button>

    <button class="btn btn-jump"  data-key="${TOUCH_KEYS.JUMP}">━</button>
    <button class="btn btn-fire"  data-key="${TOUCH_KEYS.FIRE}">•</button>`;
  document.body.appendChild(ui);

  ui.querySelectorAll('.btn').forEach(btn=>{
    const key = btn.dataset.key;
    let down=false;
    const downFn = (e)=>{e.preventDefault(); if(down) return; down=true; press(key); /* vib removed */};
    const upFn   = (e)=>{e.preventDefault(); if(!down) return; down=false; release(key);};
    btn.addEventListener('touchstart', downFn, {passive:false});
    
  // --- Long-press (2s) on FIRE -> open Level Choice overlay (same as desktop 'O') ---
  (function(){
    const fireBtn = ui.querySelector('.btn-fire');
    if (!fireBtn) return;
    let holdTimer = null;
    let triggered = false;
    const HOLD_MS = 2000;

    function openOverlay(){
      if (triggered) return;
      triggered = true;
      try { release(TOUCH_KEYS.FIRE); } catch(e){}
      try {
        if (typeof window.showLevelChoice === 'function') { window.showLevelChoice(); }
        else {
          const ev = new KeyboardEvent('keydown', { key:'O', code:'KeyO', bubbles:true, cancelable:true });
          document.dispatchEvent(ev);
          window.dispatchEvent(ev);
        }
      } catch(e){}
      // small haptic feedback on trigger
      }

    function startHold(e){
      if (triggered) return;
      clearTimeout(holdTimer);
      holdTimer = setTimeout(openOverlay, HOLD_MS);
    }
    function clearHold(){
      clearTimeout(holdTimer);
      holdTimer = null;
      // reset for next press after release
      setTimeout(()=>{ triggered = false; }, 50);
    }

    // Wire both touch and pointer (for broader device support)
    fireBtn.addEventListener('touchstart', startHold, {passive:true});
    fireBtn.addEventListener('touchend',   clearHold, {passive:true});
    fireBtn.addEventListener('touchcancel',clearHold, {passive:true});
    fireBtn.addEventListener('pointerdown',startHold);
    fireBtn.addEventListener('pointerup',  clearHold);
    fireBtn.addEventListener('pointercancel', clearHold);
  })();
btn.addEventListener('touchend',   upFn,   {passive:false});
    btn.addEventListener('touchcancel',upFn,   {passive:false});
    btn.addEventListener('pointerdown',downFn);
    btn.addEventListener('pointerup',  upFn);
    btn.addEventListener('pointercancel', upFn);
  });

  window.addEventListener('blur', releaseAll);
  document.addEventListener('visibilitychange', ()=>{ if(document.hidden) releaseAll(); });
})();
// === Safe Fullscreen Patch (manual-start variant: no forced fullscreen) ===
(function(){
  window.ensureFullscreen = function(){ return Promise.resolve(false); };
  window.nudgeFullscreen = function(){ return false; };
  window.__fsPatchApplied = true;
})();
/* === JOYSTICK BRIDGE v2 — binds to old touch Left/Right and A/D ===================== */
(function(){
  const cont = document.getElementById('joystickContainer');
  const stick = document.getElementById('joystick');
  if(!cont || !stick) return;

  // Try several common selectors for legacy controls
  const leftSelectors  = ['#btnLeft','#leftBtn','.btn-left','[data-action="left"]','[data-dir="left"]','#controlLeft'];
  const rightSelectors = ['#btnRight','#rightBtn','.btn-right','[data-action="right"]','[data-dir="right"]','#controlRight'];
  const findEl = (sels)=> sels.map(s=>document.querySelector(s)).find(Boolean) || null;
  const leftEl  = findEl(leftSelectors);
  const rightEl = findEl(rightSelectors);

  // Safe press/release (PointerEvent if available, else mouse)
  const pressEl = (el)=>{
    if(!el) return;
    try{
      if(window.PointerEvent){
        el.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,cancelable:true,pointerType:'touch'}));
      } else {
        el.dispatchEvent(new MouseEvent('mousedown',{bubbles:true,cancelable:true}));
      }
      // Some UIs rely on click for continuous start
      if (typeof el.click === 'function') el.click();
      el.classList.add('active-left-right-sim');
    }catch(e){}
  };
  const releaseEl = (el)=>{
    if(!el) return;
    try{
      if(window.PointerEvent){
        el.dispatchEvent(new PointerEvent('pointerup',{bubbles:true,cancelable:true,pointerType:'touch'}));
      } else {
        el.dispatchEvent(new MouseEvent('mouseup',{bubbles:true,cancelable:true}));
      }
      el.classList.remove('active-left-right-sim');
    }catch(e){}
  };

  // Keyboard helpers (A/D)
  const sendKey = (key, type)=>{
    try{
      const code = key.toUpperCase()==='A' ? 'KeyA' : 'KeyD';
      const ev = new KeyboardEvent(type, {key, code, bubbles:true});
      window.dispatchEvent(ev); document.dispatchEvent(ev);
    }catch(e){}
  };

  let active=false, centerX=0, dir=null;
  const MAX_R=35, DEAD=12;

  const setDir = (next)=>{
    if(next===dir) return;
    // release old
    if(dir==='left'){ releaseEl(leftEl); sendKey('a','keyup'); }
    if(dir==='right'){ releaseEl(rightEl); sendKey('d','keyup'); }
    dir = next;
    if(dir==='left'){ pressEl(leftEl); sendKey('a','keydown'); }
    if(dir==='right'){ pressEl(rightEl); sendKey('d','keydown'); }
  };

  const move = (x)=>{
    const dx = x - centerX;
    const c = Math.max(-MAX_R, Math.min(MAX_R, dx));
    stick.style.transform = `translate(calc(-50% + ${c}px), -50%)`;
    if(c >  DEAD) setDir('right');
    else if(c < -DEAD) setDir('left');
    else setDir(null);
  };

  const end = ()=>{
    active=false; setDir(null);
    stick.style.transform = 'translate(-50%,-50%)';
  };

  cont.addEventListener('pointerdown',(e)=>{
    e.preventDefault();
    cont.setPointerCapture && cont.setPointerCapture(e.pointerId);
    active=true; centerX = e.clientX; move(e.clientX);
  });
  cont.addEventListener('pointermove',(e)=>{ if(active) move(e.clientX); });
  cont.addEventListener('pointerup', end);
  cont.addEventListener('pointercancel', end);
  window.addEventListener('blur', end);
  cont.addEventListener('touchmove', (e)=> e.preventDefault(), {passive:false}); // avoid scrolling on mobile
})();
(function(){
  try {
    if (window.matchMedia && window.matchMedia("(pointer: coarse)").matches) {
      if (!document.querySelector('.btn-crouch')) {
        // Map KeyS
        const key = 'KeyS';
        // Find or create UI container
        let ui = document.querySelector('.touch-ui');
        if (!ui) {
          ui = document.createElement('div');
          ui.className = 'touch-ui';
          document.body.appendChild(ui);
        }
        // Create button
        const b = document.createElement('button');
        b.className = 'btn btn-crouch';
        b.setAttribute('data-key', key);
        b.textContent = '▾';
        ui.appendChild(b);

        // Style (basic)
        const style = document.createElement('style');
        style.textContent = `@media (pointer: coarse){
          .btn-crouch {
    position: fixed;
    right: 12px;
    bottom: 92px;
    width: 64px;
    height: 64px;
    border-radius: 50%;
    z-index: 1000;
  }
        }`;
        document.head.appendChild(style);

        // Bridge to keyboard events like other touch buttons
        const down = (code)=>document.dispatchEvent(new KeyboardEvent('keydown',{code:code,bubbles:true}));
        const up   = (code)=>document.dispatchEvent(new KeyboardEvent('keyup',{code:code,bubbles:true}));

        const pressStart = (e)=>{ e.preventDefault(); down(key); };
        const pressEnd   = (e)=>{ e.preventDefault(); up(key); };

        b.addEventListener('touchstart', pressStart, {passive:false});
        b.addEventListener('touchend',   pressEnd,   {passive:false});
        b.addEventListener('touchcancel',pressEnd,   {passive:false});
        b.addEventListener('pointerdown',(e)=>{ if(e.pointerType!=='mouse'){ pressStart(e);} }, {passive:false});
        b.addEventListener('pointerup',  (e)=>{ if(e.pointerType!=='mouse'){ pressEnd(e);} },   {passive:false});
        b.addEventListener('pointercancel',(e)=>{ if(e.pointerType!=='mouse'){ pressEnd(e);} }, {passive:false});
      }
    }
  } catch(e){ /* no-op */ }
})();
(function(){
  function showTouch(){ document.body.classList.add('playing'); }
  function hideTouch(){ document.body.classList.remove('playing'); }

  // Hook Start button
  document.addEventListener('DOMContentLoaded', function(){
    var startBtn = document.getElementById('startBtn');
    if(startBtn){
      startBtn.addEventListener('click', function(){
        // Delay to allow start screen to fade/remove
        setTimeout(showTouch, 0);
      });
    }
  });

  // Optional hooks: if your game dispatches custom events, listen and toggle accordingly
  window.addEventListener('game:started', showTouch);
  window.addEventListener('game:ended', hideTouch);
  window.addEventListener('ui:startscreen:show', hideTouch);
})();

// === SOURCE: #NextLevelBtnJS ===
(function(){
  const b = document.getElementById("nextLevelBtn");
  if (!b) return;

  function syncDevButton(){
    let enabled = false;
    try{ enabled = !!(typeof window.__isDevSkipEnabled === 'function' ? window.__isDevSkipEnabled() : window.__DEV_SKIP_ENABLED); }catch(_){}
    b.style.display = enabled ? '' : 'none';
    b.setAttribute('aria-hidden', enabled ? 'false' : 'true');
    b.disabled = !enabled;
    b.title = enabled ? 'Developer skip: next level' : '';
  }

  b.addEventListener("click", () => {
    try{
      if (typeof window.__triggerDevSkip === 'function') window.__triggerDevSkip();
      else if (window.GameApp && GameApp.actions && typeof GameApp.actions.devSkipNextLevel === 'function') GameApp.actions.devSkipNextLevel();
    }catch(_){}
  });

  window.addEventListener('devskip:mode-changed', syncDevButton);
  syncDevButton();
})();

// === SOURCE: #EnemySpawnPauseHooks ===
(function(){
  window.GameApp = window.GameApp || {};
  GameApp.spawnControl = GameApp.spawnControl || { paused:false, queued:false, lastReason:'' };

  function state(){ return GameApp.spawnControl; }

  function pauseEnemySpawns(reason){
    var ctrl = state();
    ctrl.paused = true;
    ctrl.lastReason = reason || 'overlay';
    document.body.classList.add('spawns-paused');
    document.dispatchEvent(new CustomEvent('enemy-spawns-pause'));
  }

  function resumeEnemySpawns(delayMs=0){
    const doResume = ()=>{
      var ctrl = state();
      const hadQueued = !!ctrl.queued;
      ctrl.paused = false;
      ctrl.queued = false;
      document.body.classList.remove('spawns-paused');
      document.dispatchEvent(new CustomEvent('enemy-spawns-resume'));
      if (hadQueued){
        try{
          var domain = GameApp.domains && GameApp.domains.get('enemySpawning');
          if (domain && typeof domain.spawn === 'function') domain.spawn('resume-flush');
        }catch(_){}
      }
    };
    if (delayMs>0) setTimeout(doResume, delayMs); else doResume();
  }

  window.pauseEnemySpawns = pauseEnemySpawns;
  window.resumeEnemySpawns = resumeEnemySpawns;
  Object.defineProperty(window, 'ENEMY_SPAWNS_PAUSED', { get(){ return !!state().paused; } });
})();

// === SOURCE: #LevelChoiceLogic ===
(function(){
  const overlay = document.getElementById('levelChoice');
  if(!overlay) return;
  let isOpen=false, animating=false;
  function isChoiceLevel(lvl){ return (typeof lvl==='number') && lvl>1 && ((lvl-1)%5===0); }
  function _applyLevelOverlaySuppression(){ document.body.classList.add('suppress-level-overlay'); }
  function _removeLevelOverlaySuppression(){ document.body.classList.remove('suppress-level-overlay'); }
  function _pauseSpawnsOnOpen(){ if (typeof window.pauseEnemySpawns==='function') window.pauseEnemySpawns(); }
  function _resumeSpawnsAfterSelection(){ if (typeof window.resumeEnemySpawns==='function') window.resumeEnemySpawns(5000); }
  function openChoiceOverlay(){
    const lvlNow = getCurrentLevel();
    if (isChoiceLevel(lvlNow)) _applyLevelOverlaySuppression();
    _pauseSpawnsOnOpen();
    if(isOpen||animating) return;
    animating=true;
    document.body.classList.add('choice-open');
    overlay.classList.add('show','animating-in');
    setTimeout(()=>{ overlay.classList.remove('animating-in'); animating=false; isOpen=true; }, 650);
  }
  function closeChoiceOverlay(){
    if(!isOpen||animating) return;
    animating=true;
    overlay.classList.add('animating-out');
    setTimeout(()=>{ overlay.classList.remove('animating-out','show'); document.body.classList.remove('choice-open'); animating=false; isOpen=false; }, 600);
  }
  overlay.addEventListener('click', (e)=>{
    const btn = e.target.closest('.choice-btn');
    if (btn){
      const ripple = document.createElement('div'); ripple.className='ripple'; btn.appendChild(ripple);
      setTimeout(()=> btn.removeChild(ripple), 650);
      _resumeSpawnsAfterSelection();
      closeChoiceOverlay();
    }
  });
  document.addEventListener('keydown', (e)=>{
    if (e.key==='o'||e.key==='O'){ if(!isOpen) openChoiceOverlay(); else closeChoiceOverlay(); }
  });
  function getCurrentLevel(){
    const el = document.querySelector('#lvlScoreHud .text.level');
    if(!el) return null;
    const m = (el.textContent||'').match(/(\d+)/);
    return m ? parseInt(m[1],10) : null;
  }
  let lastLevel = getCurrentLevel();
  const levelNode = document.querySelector('#lvlScoreHud .text.level');
  if (levelNode){
    new MutationObserver(()=>{
      const lvl = getCurrentLevel();
      if (lvl==null || lvl===lastLevel) return;
      if (isChoiceLevel(lvl)){ _applyLevelOverlaySuppression(); setTimeout(openChoiceOverlay, 60); }
      else { _removeLevelOverlaySuppression(); }
      lastLevel = lvl;
    }).observe(levelNode, { childList:true, characterData:true, subtree:true });
  }
  window.showLevelChoiceOverlay = openChoiceOverlay;
  window.hideLevelChoiceOverlay = closeChoiceOverlay;
})();

// === SOURCE: #LevelOverlayTextGuard ===
(function(){
  function isChoiceLevel(n){ return Number.isInteger(n) && n>1 && ((n-1)%5===0); } // 6,11,16,21,26,...
  function parseLevelFromTitleNode(node){
    if (!node) return null;
    const txt = (node.textContent||"").toUpperCase();
    const m = txt.match(/LEVEL[^0-9]*([0-9]{1,3})/);
    return m ? parseInt(m[1],10) : null;
  }
  function hardHide(){
    const ov=document.getElementById('levelOverlay'), ttl=document.getElementById('levelTitle');
    if (ov){
      ov.style.setProperty('display','none','important');
      ov.style.setProperty('visibility','hidden','important');
      ov.style.setProperty('opacity','0','important');
      ov.style.setProperty('animation','none','important');
    }
    if (ttl){
      ttl.style.setProperty('display','none','important');
      ttl.style.setProperty('visibility','hidden','important');
      ttl.style.setProperty('opacity','0','important');
      ttl.style.setProperty('animation','none','important');
    }
    document.body.classList.add('suppress-level-overlay');
  }
  function release(){
    const ov=document.getElementById('levelOverlay'), ttl=document.getElementById('levelTitle');
    document.body.classList.remove('suppress-level-overlay');
    if (ov){
      ov.style.removeProperty('display');
      ov.style.removeProperty('visibility');
      ov.style.removeProperty('opacity');
      ov.style.removeProperty('animation');
    }
    if (ttl){
      ttl.style.removeProperty('display');
      ttl.style.removeProperty('visibility');
      ttl.style.removeProperty('opacity');
      ttl.style.removeProperty('animation');
    }
  }
  function maybeToggleByTitle(){
    const ttl = document.getElementById('levelTitle');
    const n = parseLevelFromTitleNode(ttl);
    if (isChoiceLevel(n)) hardHide();
    else release();
  }
  function hookTitleObserver(){
    const ttl = document.getElementById('levelTitle'); if (!ttl) return false;
    new MutationObserver(()=> maybeToggleByTitle()).observe(ttl, { childList:true, characterData:true, subtree:true, attributes:true, attributeFilter:['class','style'] });
    maybeToggleByTitle(); return true;
  }
  // Watch DOM for overlay/title creation or visibility toggles
  new MutationObserver((muts)=>{
    for (const m of muts){
      for (const n of m.addedNodes){
        if (!(n instanceof HTMLElement)) continue;
        if (n.id==='levelOverlay' || n.id==='levelTitle' || n.querySelector?.('#levelOverlay, #levelTitle')){
          setTimeout(()=>{ hookTitleObserver(); maybeToggleByTitle(); }, 0);
        }
      }
    }
  }).observe(document.documentElement, { childList:true, subtree:true, attributes:true, attributeFilter:['class','style'] });
  // Burst checks for a couple seconds whenever someone announces overlay show or level change
  let clamp=null; function clampBurst(){ if (clamp) clearInterval(clamp); let t=0; clamp=setInterval(()=>{ maybeToggleByTitle(); if(++t>100){ clearInterval(clamp); clamp=null; } }, 30); }
  document.addEventListener('level-changed', clampBurst);
  document.addEventListener('levelOverlayShow', clampBurst);
  document.addEventListener('levelOverlayShown', clampBurst);
  // Also re-evaluate when HUD level changes from 6->7 etc.
  const hud = document.querySelector('#lvlScoreHud .text.level');
  if (hud){
    new MutationObserver(clampBurst).observe(hud, { childList:true, characterData:true, subtree:true });
  }
  // Initial
  setTimeout(()=>{ hookTitleObserver() || maybeToggleByTitle(); clampBurst(); }, 0);
  window._forceToggleLevelOverlayGuard = maybeToggleByTitle;
})();

// === SOURCE: #NextLevelBtnVisibility ===
(function(){
  function getCurrentLevel(){
    const el = document.querySelector('#lvlScoreHud .text.level');
    if(!el) return null;
    const m = (el.textContent||'').match(/(\d+)/);
    return m ? parseInt(m[1],10) : null;
  }
  function refresh(){
    const lvl = getCurrentLevel();
    if (typeof lvl === 'number' && lvl >= 1) {
      document.body.classList.add('in-level');
    } else {
      document.body.classList.remove('in-level');
    }
  }
  // Initial check
  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    refresh();
  } else {
    document.addEventListener('DOMContentLoaded', refresh);
  }
  // Watch HUD level changes
  const node = document.querySelector('#lvlScoreHud .text.level');
  if (node){
    new MutationObserver(refresh).observe(node, { childList:true, characterData:true, subtree:true });
  }
  // Listen for custom events if game emits them
  document.addEventListener('level-changed', refresh);
  document.addEventListener('menu-open', ()=> document.body.classList.remove('in-level'));
  document.addEventListener('menu-close', refresh);
})();

// === SOURCE: #ChoiceBtnPressAnimJS ===
(function(){
  const root = document.getElementById('levelChoice');
  if (!root) return;
  function setPressed(btn, on){ if(btn){ if(on) btn.classList.add('pressed'); else btn.classList.remove('pressed'); } }
  function bind(btn){
    if (!btn || btn.dataset._pressBound) return;
    btn.dataset._pressBound = "1";
    btn.addEventListener('pointerdown', ()=> setPressed(btn, true));
    btn.addEventListener('pointerup',   ()=> { setPressed(btn, false); btn.blur(); });
    btn.addEventListener('pointercancel',()=> setPressed(btn, false));
    btn.addEventListener('pointerleave', ()=> { setPressed(btn, false); btn.blur(); });
  }
if (typeof root !== 'undefined' && root) { root.querySelectorAll('.choice-btn').forEach(bind); }
new MutationObserver((muts)=>{
    for (const m of muts){
      for (const n of m.addedNodes){
        if (!(n instanceof HTMLElement)) continue;
        if (n.matches?.('.choice-btn')) bind(n);
        n.querySelectorAll?.('.choice-btn').forEach(bind);
      }
    }
  }).observe(root, { childList:true, subtree:true });
})();

  // Blur on click too, as a final safeguard
if (typeof root !== 'undefined' && root) { root.querySelectorAll('.choice-btn').forEach(b=> b.addEventListener('click', ()=> b.blur())); }
/* === WebAudio low-latency SFX (safe append, robust fallback, skips on file://) === */
(function(){
  try{
    // If opened as file://, many browsers block fetch/decode => skip WebAudio to avoid errors
    if (!/^https?:$/.test(location.protocol)) {
      console.warn('[AudioMgr] file:// detected — using HTMLAudio only (no WebAudio fetch).');
      return;
    }

    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) { console.warn('[AudioMgr] WebAudio not supported.'); return; }

    const ctx  = new AC({ latencyHint: 'interactive' });
    const mast = ctx.createGain();
    mast.gain.value = 0.9;
    mast.connect(ctx.destination);

    const cache = new Map(); // src -> Promise<AudioBuffer>

    function absUrl(src){
      try { return new URL(src, window.location.href).href; } catch(e){ return src; }
    }

    function load(src){
      if (!src) return Promise.reject('no src');
      if (cache.has(src)) return cache.get(src);
      const p = fetch(absUrl(src))
        .then(r => {
          if (!r.ok) throw new Error('HTTP ' + r.status);
          return r.arrayBuffer();
        })
        .then(buf => new Promise((res,rej)=> ctx.decodeAudioData(buf, res, rej)));
      cache.set(src, p);
      return p;
    }

    // returns Promise<boolean> (true = played via WebAudio, false = failed)
    function playSrc(src, opt){
      if (!src) return Promise.resolve(false);
      const o = opt || {};
      const vol = (typeof o.volume === 'number') ? o.volume : 1;
      const rate = (typeof o.rate === 'number') ? o.rate : 1;
      const t = ctx.currentTime;

      function startWith(buffer){
        try{
          const g = ctx.createGain();
          g.gain.value = vol;
          const s = ctx.createBufferSource();
          s.buffer = buffer;
          s.playbackRate.value = rate;
          s.connect(g).connect(mast);
          s.start(t);
          s.onended = () => { try { s.disconnect(); g.disconnect(); } catch(e){} };
          return true;
        }catch(e){ return false; }
      }

      const run = () => load(src).then(buf => startWith(buf)).catch(()=>false);
      if (ctx.state === 'suspended') {
        return ctx.resume().then(run).catch(run);
      } else {
        return run();
      }
    }

    function tryGetSrc(aud){
      if (!aud) return null;
      if (typeof aud === 'string') return aud;
      if (aud.src) return aud.src;
      if (typeof aud === 'object' && typeof aud.src === 'string') return aud.src;
      return null;
    }

    // Wrap playSound with fallback if WebAudio path fails
    (function wrapPlaySound(){
      if (typeof window.playSound !== 'function') return;
      const orig = window.playSound;
      window.playSound = function(aud){
        try{
          const src = tryGetSrc(aud);
          if (src) {
            // race: if WebAudio not successful within 150ms, let orig play to guarantee sound
            let settled = false;
            playSrc(src, { volume: (aud && aud.volume) != null ? aud.volume : 1 })
              .then(ok => { settled = true; if (!ok) try { orig.call(this, aud); } catch(e){} });
            setTimeout(()=>{ if (!settled) try { orig.call(this, aud); } catch(e){} }, 150);
            return;
          }
        }catch(e){}
        try{ return orig.apply(this, arguments); }catch(e){}
      };
    })();

    // Wrap playSfx similarly
    (function wrapPlaySfx(){
      if (typeof window.playSfx !== 'function') return;
      const orig = window.playSfx;
      window.playSfx = function(key){
        try{
          const bag = window.__SFX || window.SFX || window.Sounds || {};
          const cand = bag[key];
          const src = tryGetSrc(cand);
          if (src) {
            let settled = false;
            const vol = (cand && cand.volume) != null ? cand.volume : 1;
            playSrc(src, { volume: vol })
              .then(ok => { settled = true; if (!ok) try { orig.call(this, key); } catch(e){} });
            setTimeout(()=>{ if (!settled) try { orig.call(this, key); } catch(e){} }, 150);
            return;
          }
        }catch(e){}
        try{ return orig.apply(this, arguments); }catch(e){}
      };
    })();

    // Preload common SFX on first user gesture (no UI side-effects)
    function collectUrls(){
      const out = new Set();
      try{
        const bags = [window.__SFX, window.SFX, window.Sounds];
        for (const b of bags){
          if (!b || typeof b !== 'object') continue;
          for (const k in b){
            const a = b[k];
            const s = tryGetSrc(a);
            if (s && !/(bgm|music|loop)/i.test(k)) out.add(s);
          }
        }
      }catch(e){}
      return Array.from(out);
    }
    function warm(){
      collectUrls().forEach(u => load(u).catch(()=>{}));
      try{ if (ctx.state === 'suspended') ctx.resume(); }catch(e){}
    }
    ['pointerdown','touchstart','keydown','mousedown'].forEach(ev => {
      window.addEventListener(ev, warm, { once:true, passive:true });
    });

  }catch(err){ console.warn('[AudioMgr] init failed', err); }
})();

// === SOURCE: #NoBlueFocusJS ===
(function(){
    function setup(){
      document.addEventListener('pointerdown', function(ev){
        var el = ev.target.closest && ev.target.closest('.menu-btn');
        if(el){ setTimeout(function(){ try{ el.blur(); }catch(e){} }, 0); }
      }, true);
    }
    if(document.readyState === 'LOADING'){
      document.addEventListener('DOMContentLoaded', setup, {once:true});
    } else { setup(); }
  })();

