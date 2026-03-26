window.GameApp && window.GameApp.registerModule && window.GameApp.registerModule('70-ui-patches', {"entryMarker": "// === Synced Repair FX overlay (starts with Repair; stops exactly when repair anim ends) ===", "description": "Repair FX sync, anti-focus guards, no-flicker overlay init, loading bar polish, wave patch."});
/*__MODULE_BOUNDARY__*/
// === Synced Repair FX overlay (starts with Repair; stops exactly when repair anim ends) ===
window.startRepairFX = function(){
  try{
    const fx1 = 'repairfx1.png';
    const fx2 = 'repairfx2.png';
    const ship = (typeof shipEl !== 'undefined' && shipEl) ? shipEl : document.querySelector('.mothership img, .ship, #ship, img[src*="spaceship"]');
    if (!ship || !ship.parentElement) return;

    let fx = document.getElementById('repair-fx-overlay');
    if (!fx){
      fx = document.createElement('img');
      fx.id = 'repair-fx-overlay';
      fx.style.position = 'absolute';
      fx.style.pointerEvents = 'none';
      fx.style.zIndex = (parseInt(getComputedStyle(ship).zIndex)||10) + 5;
      fx.style.imageRendering = 'auto';
      fx.style.objectFit = 'contain';
      ship.parentElement.appendChild(fx);
    }

    const pr = ship.parentElement.getBoundingClientRect();
    const scale = 0.9;
    function place(){
      const srx = ship.getBoundingClientRect();
      const w = srx.width * scale;
      const h = srx.height * scale;
      fx.style.width  = w + 'px';
      fx.style.height = h + 'px';
      fx.style.left = (srx.left - pr.left) + (srx.width - w)/2 + 'px';
      fx.style.top  = (srx.top - pr.top) + (srx.height - h)/2 + 'px';
    }
    place();

    let onA = true;
    fx.src = fx1;
    const iv = setInterval(()=>{
      onA = !onA;
      fx.src = onA ? fx1 : fx2;
      try{ place(); }catch(_){}
    }, 350);

    window.__repairFXStop = ()=>{
      try{ clearInterval(iv); fx.remove(); delete window.__repairFXStop; }catch(_){}
    };
  }catch(e){ /* no-op */ }
};
(function(){
  function unlock(){
    try{
      if (window.__audioUnlocked) return;
      if (window.Sounds){
        for (const k in Sounds){
          const a = Sounds[k];
          if (a && typeof a.play === 'function'){
            const hadVol = ('volume' in a), prevVol = hadVol ? a.volume : null;
            try{ a.muted = false; if (hadVol) a.volume = 0; }catch(_){}
            const p = a.play();
            if (p && typeof p.then === 'function'){
              p.then(()=>{ try{ a.pause(); a.currentTime = 0; if (hadVol) a.volume = prevVol; }catch(_){}; })
               .catch(()=>{ try{ a.pause(); if (hadVol) a.volume = prevVol; }catch(_){ } });
            } else {
              try{ a.pause(); a.currentTime = 0; if (hadVol) a.volume = prevVol; }catch(_){}
            }
          }
        }
      }
      window.__audioUnlocked = true;
    }catch(e){}
    window.removeEventListener('pointerdown', unlock, {capture:false});
    window.removeEventListener('touchstart', unlock, {capture:false});
    window.removeEventListener('click', unlock, {capture:false});
  }
  window.addEventListener('pointerdown', unlock, {once:true, passive:true});
  window.addEventListener('touchstart', unlock, {once:true, passive:true});
  window.addEventListener('click', unlock, {once:true, passive:true});
})();
(function(){
  window.__barReady = false;
  function wrapShowWhenReady(){
    try{
      if (!window.__shipDownFillBar || window.__shipDownFillBar.__wrappedShow) return;
      const originalShow = window.__shipDownFillBar.show;
      window.__shipDownFillBar.show = function(){
        if (!window.__barReady) return;
        try{ originalShow && originalShow.call(window.__shipDownFillBar); }catch(_){}
      };
      window.__shipDownFillBar.__wrappedShow = true;
    }catch(e){}
  }
  wrapShowWhenReady();
  document.addEventListener('DOMContentLoaded', wrapShowWhenReady);

  window.__activateRepairBarAfterExplosion = function(){
    window.__barReady = true;
    try{ if (typeof shipState==='undefined' || shipState!=='crashed') { window.__shipDownFillBar && window.__shipDownFillBar.show && window.__shipDownFillBar.show(); } }catch(_){}
  };
})();
(function(){
  try{
    const root = document.body || document.documentElement;
    const obs = new MutationObserver((list)=>{
      for (const m of list){
        if (m.type === 'attributes' && m.attributeName === 'src' && m.target && m.target.tagName === 'IMG'){
          const s = (m.target.getAttribute('src')||'');
          if (s.indexOf('explosion6.webp') !== -1){
            try{ window.__activateRepairBarAfterExplosion && window.__activateRepairBarAfterExplosion(); }catch(_){}
          }
        }
      }
    });
    obs.observe(root, { subtree:true, attributes:true, attributeFilter:['src'] });
  }catch(e){}
})();
(function(){
  // Keep bar hidden until explosion6.webp is displayed
  window.__barReady = false;

  // Wrap .show() to prevent showing before explosion6
  function wrapShowWhenReady(){
    try{
      if (!window.__shipDownFillBar || window.__shipDownFillBar.__wrappedShow) return;
      const originalShow = window.__shipDownFillBar.show;
      window.__shipDownFillBar.show = function(){
        if (!window.__barReady) return;
        try{ originalShow && originalShow.call(window.__shipDownFillBar); }catch(_){}
      };
      window.__shipDownFillBar.__wrappedShow = true;
    }catch(e){}
  }
  wrapShowWhenReady();
  document.addEventListener('DOMContentLoaded', wrapShowWhenReady);

  // Function to activate the bar after explosion6.webp appears
  window.__activateRepairBarAfterExplosion = function(){
    window.__barReady = true;
    try{ document.body && document.body.classList && document.body.classList.add('bar-ready'); }catch(_){}
    try{ if (typeof shipState==='undefined' || shipState!=='crashed') { window.__shipDownFillBar && window.__shipDownFillBar.show && window.__shipDownFillBar.show(); } }catch(_){}
  };

  // Observe image src changes for explosion6.webp
  try{
    const root = document.body || document.documentElement;
    const obs = new MutationObserver((list)=>{
      for (const m of list){
        if (m.type === 'attributes' && m.attributeName === 'src' && m.target && m.target.tagName === 'IMG'){
          const s = (m.target.getAttribute('src')||'');
          if (s.includes('explosion6.webp')){
            try{ window.__activateRepairBarAfterExplosion && window.__activateRepairBarAfterExplosion(); }catch(_){}
          }
        }
      }
    });
    obs.observe(root, { subtree:true, attributes:true, attributeFilter:['src'] });
  }catch(e){}
})();

// === SOURCE: #AntiFocusJS ===
document.addEventListener("DOMContentLoaded", () => {
  // Make Start/Options/Exit non-focusable to avoid first-tap focus flash
  ["startBtn","optionsBtn","exitBtn"].forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    try { el.tabIndex = -1; } catch(_) {}
    try { el.addEventListener("focus", ev => { try{ ev.target.blur(); }catch(_){ } }, {passive:true}); } catch(_){}
  });

  // Blur any focused element on pointerdown (capture) without canceling the click
  const blurOnPD = ev => {
    try {
      const ae = document.activeElement;
      if (ae && ae !== document.body) { ae.blur(); }
    } catch(_) {}
  };
  document.addEventListener("pointerdown", blurOnPD, {capture:true, passive:true});

  // Avoid default "#" navigation on anchors styled as buttons
  document.querySelectorAll('a[href="#"]').forEach(a => {
    a.setAttribute("href", "javascript:void(0)");
  });
});

// === SOURCE: #NoFlickerOverlayInit ===
(function(){
  function init(){
    var cap = window.Capacitor;
    if (!cap || typeof cap.isNativePlatform !== 'function' || !cap.isNativePlatform()) return;
    var plugin = cap.Plugins && cap.Plugins.NoFlickerOverlay;
    if (!plugin || !plugin.show) return;
    try { plugin.show(); } catch(e){}
    if (plugin.addListener){
      try {
        plugin.addListener('firstUserTap', function(){
          try { if (window.Howler && Howler.ctx && Howler.ctx.state === 'suspended') Howler.ctx.resume(); } catch(e){}
          try { if (window.game && game.sound && game.sound.context && game.sound.context.state === 'suspended') game.sound.context.resume(); } catch(e){}
          try { if (window.Tone && Tone.start) Tone.start(); } catch(e){}
        });
      } catch(e){}
    }
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
/* === injected: fullscreen menu music wiring === */
(function(){
  function __playMenuBgmIfFS(){ try{ startMenuMusic(); }catch(_){ } }
  function __pauseMenuBgm(){ try{ if (window.Sounds && Sounds.startBgm && Sounds.startBgm.pause) Sounds.startBgm.pause(); }catch(_){ } }

  function __isFS(){
    return !!(document.fullscreenElement || document.webkitFullscreenElement || document.msFullscreenElement || document.mozFullScreenElement);
  }

  // Start or stop based on fullscreen state
  function __fsHandler(){
    if (__isFS()) __playMenuBgmIfFS(); else __pauseMenuBgm();
  }
  document.addEventListener('fullscreenchange', __fsHandler);
  document.addEventListener('webkitfullscreenchange', __fsHandler);
  document.addEventListener('msfullscreenchange', __fsHandler);
  document.addEventListener('mozfullscreenchange', __fsHandler);

  // Pause AFTER loading overlay completes or when real game begins.
  (function hookLoading(){
    try{
      // 1) Wrap __startGameAfter to pause after its delay
      if (typeof window.__startGameAfter === 'function' && !window.__startGameAfter.__wrappedPause){
        const __orig = window.__startGameAfter;
        window.__startGameAfter = function(ms){
          const ret = __orig.apply(this, arguments);
          try{ setTimeout(__pauseMenuBgm, (ms|0)+60); }catch(_){}
          return ret;
        };
        window.__startGameAfter.__wrappedPause = true;
      }
      // 2) Wrap __showLoadingOverlay to also schedule a pause after given duration
      if (typeof window.__showLoadingOverlay === 'function' && !window.__showLoadingOverlay.__wrappedPause){
        const __origShow = window.__showLoadingOverlay;
        window.__showLoadingOverlay = function(ms){
          const r = __origShow.apply(this, arguments);
          try{ if (ms != null) setTimeout(__pauseMenuBgm, (ms|0)+100); }catch(_){}
          return r;
        };
        window.__showLoadingOverlay.__wrappedPause = true;
      }
      // 3) Observe the DOM for the overlay to hide, then pause
      const ov = document.getElementById('loadingOverlay');
      if (ov){
        const mo = new MutationObserver(function(){
          try{
            const cs = getComputedStyle(ov);
            const visible = ov.classList.contains('visible') || cs.display !== 'none';
            if (!visible){ __pauseMenuBgm(); mo.disconnect(); }
          }catch(_){}
        });
        mo.observe(ov, { attributes:true, attributeFilter:['class','style'] });
      }
    }catch(_){}
  })();
})();

// === SOURCE: #\"BossL10WaveFix\" ===
// Canonical override: Boss L10 wave uses left/right PNG with WEBP fallback.
(function(){
  function scaledSafe(v){
    try{
      var s = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--uiScale')) || 1;
      return Math.max(1, Math.round(v * s));
    }catch(_){ return v; }
  }
  function appendToEnemyLayer(el){
    try{
      var layer = document.getElementById('enemyProjectiles');
      (layer || document.body).appendChild(el);
    }catch(_){ try{ document.body.appendChild(el);}catch(__){} }
  }
  // Override placed last so it wins
  window.enemyShootWave = function(e, playAudio){
    try{
      // audio cue reuses existing Sounds if present
      if ((typeof playAudio==='undefined' || playAudio) && typeof Sounds!=='undefined'){
        try{
          if(!Sounds.slime){ Sounds.slime = new Audio('slime.mp3'); Sounds.slime.volume = 0.9; Sounds.slime.preload='auto'; }
          if (typeof playSound === 'function') playSound(Sounds.slime || Sounds.spit || Sounds.enemyShoot);
          else { Sounds.slime.currentTime = 0; Sounds.slime.play().catch(function(){}); }
        }catch(_){}
      }
    }catch(_){}
    if(!e || e.dead) return;
    var dir = e.dir;
    var yRatio = (e && e._shotHeight==='low') ? 0.82 : (e && e._shotHeight==='mid') ? 0.62 : 0.70;
    var centerX = e.x + (dir==='right' ? e.w*0.82 : e.w*(1-0.82));
    var y = e.y + e.h*yRatio;
    var b = {
      x: centerX + (dir==='right' ? 12 : -12),
      y: y,
      w: Math.round(scaledSafe(260)),
      h: Math.round(scaledSafe(128)),
      vx: (dir==='right' ? 1 : -1) * scaledSafe(520),
      t: 0,
      el: document.createElement('div'),
      dir: dir, isBoss:true, kind:'wave', wave:true, mp3e:true,
      steer: 0.08, maxVy: scaledSafe(220)
    };
    b.el.className = 'eproj wave';
    b.el.style.width = b.w + 'px';
    var img = document.createElement('img');
    var png = (dir==='right' ? 'wave_right.png' : 'wave_left.png');
    var webp = (dir==='right' ? 'wave_right.webp' : 'wave_left.webp');
    var fallback = 'wave.png';
    img.src = png;
    img.onerror = function(){
      img.onerror = null;
      img.src = webp;
      img.onerror = function(){
        img.onerror = null;
        img.src = fallback;
      };
    };
    b.el.appendChild(img);
    b.el.style.transform = 'translate(' + b.x + 'px, ' + b.y + 'px)';
    try{ appendToEnemyLayer(b.el); }catch(_){}
    try{
      if (window.enemyProjectiles) enemyProjectiles.push(b);
      else { window.enemyProjectiles = [b]; }
    }catch(_){}
    try{ if (playAudio && window.playSound && window.Sounds) playSound(Sounds.enemyShoot); }catch(_){ }
    return b;
  };
})();
(function(){
  const INTRO_ONCE   = false; // set true to show intro only once per browser
  const INTRO_KEY    = 'introSeen';
  const overlay      = document.getElementById('IntroOverlayX');
  const video        = document.getElementById('IntroVideoX');
  const audio        = document.getElementById('IntroAudioX');
  const skipBtn      = document.getElementById('IntroSkipX');
  const soundBtn     = document.getElementById('IntroSoundBtnX');
  const playBtn      = document.getElementById('IntroPlayBtnX');

  // Keep audio synced to video when allowed
  let audioWanted = false;
  let syncTimer = null;
  function stopMenuBridge(){
    try{ if (window.stopMenuMusic) window.stopMenuMusic(); }catch(_){}
    try{ if (window.Sounds && Sounds.startBgm){ Sounds.startBgm.pause(); Sounds.startBgm.currentTime = 0; } }catch(_){}
  }

  function startSync(){
    if (syncTimer) return;
    syncTimer = setInterval(function(){
      if (!video || !audio) return;
      if (audioWanted){
        if (audio.paused && !video.paused){
          try{ audio.play(); }catch(_){}
        }
        try{ audio.playbackRate = video.playbackRate; }catch(_){}
        try{
          const drift = Math.abs((audio.currentTime||0) - (video.currentTime||0));
          if (drift > 0.25) audio.currentTime = video.currentTime;
        }catch(_){}
      }
    }, 150);
  }
  function stopSync(){ if (syncTimer){ clearInterval(syncTimer); syncTimer = null; } }

  function finishIntro(cb){
    stopSync();
    stopMenuBridge();
    try{ video.pause(); }catch(_){}
    try{ audio.pause(); audio.currentTime = 0; }catch(_){}
    overlay.style.display = 'none';
    soundBtn.style.display = 'none';
    playBtn.style.display = 'none';
    if (INTRO_ONCE){ try{ localStorage.setItem(INTRO_KEY,'1'); }catch(_){ } }
    if (typeof cb === 'function'){ try{ cb(); }catch(_){ } }
    try{ window.dispatchEvent(new CustomEvent('intro:done')); }catch(_){}
  }

  function showIntroThen(cb){
    // Hide start UI if present
    try{
      const ss = document.getElementById('startScreen') || document.querySelector('[data-start-screen]');
      if (ss){ ss.style.visibility='hidden'; ss.style.display='none'; }
    }catch(_){}
    overlay.style.display = 'flex';

    // Wire interactions
    skipBtn.addEventListener('click', function(ev){
      ev.stopPropagation();
      finishIntro(cb);
    }, { once:true });

    soundBtn.addEventListener('click', function(ev){
      ev.stopPropagation();
      soundBtn.style.display = 'none';
      audioWanted = true;
      try{ video.muted = false; }catch(_){}
      try{ audio.play(); }catch(_){}
      startSync();
    });

    playBtn.addEventListener('click', function(ev){
      ev.stopPropagation();
      playBtn.style.display = 'none';
      audioWanted = true;
      try{ video.muted = false; }catch(_){}
      try{ video.play(); }catch(_){}
      try{ audio.play(); }catch(_){}
      startSync();
    }, { once:true });

    // Keep audio locked to video lifecycle
    video.addEventListener('play', function(){
      stopMenuBridge();
      audioWanted = true;
      try{ audio.currentTime = video.currentTime; }catch(_){}
      const pa = audio.play();
      if (pa && typeof pa.catch === 'function'){
        pa.catch(function(){ soundBtn.style.display = 'inline-block'; });
      }
      startSync();
    });
    video.addEventListener('pause', function(){ try{ audio.pause(); }catch(_){} });
    video.addEventListener('seeking', function(){ try{ audio.currentTime = video.currentTime; }catch(_){} });
    video.addEventListener('ratechange', function(){ try{ audio.playbackRate = video.playbackRate; }catch(_){} });
    video.addEventListener('ended', function(){ finishIntro(cb); }, { once:true });

    // Attempt autoplay: video muted to satisfy policies
    const pv = video.play();
    if (pv && typeof pv.catch === 'function'){
      pv.catch(function(){ playBtn.style.display = 'inline-block'; });
    }
  }

  // Hook ONLY the PRESS START flow via __startGameAfter.
  (function(){
    let _startAfter = window.__startGameAfter;
    Object.defineProperty(window, '__startGameAfter', {
      configurable:true, enumerable:true,
      get(){ return _startAfter; },
      set(v){
        if (typeof v === 'function'){
          _startAfter = function(ms){
            if (INTRO_ONCE && localStorage.getItem(INTRO_KEY)) return v(ms|0);
            setTimeout(function(){ showIntroThen(function(){ v(0); }); }, ms|0);
          };
        }else{ _startAfter = v; }
      }
    });
    if (typeof _startAfter === 'function'){
      window.__startGameAfter = _startAfter;
    }
  })();

  // IMPORTANT: No other fallbacks. The intro will not appear until PRESS START triggers __startGameAfter.
})();

// === SOURCE: #LoadingBarWidthSyncJS ===
(function(){
  function readVar(name){
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  }
  function computeBarWidth(){
    const cssW = readVar('--loadingBarWidth'); // e.g. "640px" or "42vmin"
    if (cssW) return cssW;
    const ratioVar = parseFloat(readVar('--loadingBarRatio'));
    const ratio = Number.isFinite(ratioVar) ? ratioVar : 0.62; // default: a bit longer
    const title = document.querySelector('#loadingOverlay .LOADING-title');
    const rect  = title ? title.getBoundingClientRect() : {width: 420};
    const w = Math.round(Math.max(110, Math.min(960, rect.width * ratio)));
    return w + 'px';
  }
  function applySizing(){
    const overlay = document.getElementById('loadingOverlay');
    if (!overlay) return false;
    const bar  = overlay.querySelector('.LOADING-bar');
    const card = overlay.querySelector('.LOADING-card');
    if (!bar) return false;

    // Do not let card cap width
    if (card) card.style.setProperty('width', 'auto', 'important');

    // Bar width control
    const targetW = computeBarWidth();
    bar.style.setProperty('width', targetW, 'important');

    // Fill length scale via CSS var (cartoon exaggeration)
    const scaleVar = parseFloat(readVar('--loadingFillScale'));
    const scale = Number.isFinite(scaleVar) ? scaleVar : 1.10; // default: slightly longer
    const fill  = overlay.querySelector('.LOADING-fill');
    if (fill){
      fill.style.setProperty('transform-origin', 'left center');
      fill.style.setProperty('transform', 'scaleX(' + scale + ')');
    }
    return true;
  }
  function sync(){ applySizing(); }

  // Public setters
  window.setLoadingBarWidth = function(value){ // "640px", "42vmin", or number
    const v = (typeof value === 'number') ? value + 'px' : String(value);
    document.documentElement.style.setProperty('--loadingBarWidth', v);
    sync();
  };
  window.setLoadingBarRatio = function(ratio){ // e.g. 0.62
    const r = parseFloat(ratio);
    if (Number.isFinite(r)) document.documentElement.style.setProperty('--loadingBarRatio', String(r));
    sync();
  };
  window.setLoadingFillScale = function(scale){ // e.g. 1.10 for slightly longer fill
    const s = parseFloat(scale);
    if (Number.isFinite(s)) document.documentElement.style.setProperty('--loadingFillScale', String(s));
    sync();
  };

  // Try until DOM nodes exist
  function ensure(){
    let tries = 0;
    function tick(){
      if (applySizing()) return;
      if (++tries < 120) requestAnimationFrame(tick);
    }
    tick();
  }
  window.addEventListener('load', ensure);
  window.addEventListener('resize', sync);
  window.addEventListener('orientationchange', sync);

  const overlay = document.getElementById('loadingOverlay');
  if (overlay && 'MutationObserver' in window){
    try{ new MutationObserver(sync).observe(overlay, {attributes:true, attributeFilter:['class','style']}); }catch(_){}
  }
})();

// === SOURCE: #LoadingBarPresetsJS ===
window.addEventListener('load', function(){
      if (typeof setLoadingBarWidth === 'function') setLoadingBarWidth(250);
      if (typeof setLoadingFillScale === 'function') setLoadingFillScale(1.10);
      if (typeof setLoadingBarRatio === 'function') setLoadingBarRatio(0.62);
    });

// === SOURCE: #LoadingBarHeightSetter ===
window.setLoadingBarHeight = function(value){ // e.g. 44 or "44px"
  const v = (typeof value === 'number') ? value + 'px' : String(value);
  document.documentElement.style.setProperty('--loadingBarHeight', v);
};

// === SOURCE: #LoadingBarViewportScalerV2 ===
(function(){
  function readVars(){
    var s = getComputedStyle(document.documentElement);
    return {
      W: (s.getPropertyValue('--barW').trim() || '240px'),
      H: (s.getPropertyValue('--barH').trim() || '22px'),
      B: (s.getPropertyValue('--barOutline').trim() || '2px')
    };
  }
  function apply(){
    var overlay = document.getElementById('loadingOverlay');
    if (!overlay) return false;
    var bar  = overlay.querySelector('.LOADING-bar');
    var fill = overlay.querySelector('.LOADING-fill');
    var card = overlay.querySelector('.LOADING-card');
    if (!bar || !fill) return false;

    var v = readVars();
    if (card) card.style.setProperty('width', 'auto', 'important');
    bar.style.setProperty('width', v.W, 'important');
    bar.style.setProperty('height', v.H, 'important');
    bar.style.setProperty('border-width', v.B, 'important');
    bar.style.setProperty('max-width', 'none', 'important');
    bar.style.setProperty('min-width', '0', 'important');

    fill.style.setProperty('height', '100%', 'important');
    fill.style.setProperty('border-width', v.B, 'important');
    fill.style.setProperty('box-sizing', 'border-box', 'important');
    fill.style.setProperty('transform', 'none', 'important');
    return true;
  }
  function rafLock(ticks){
    var n = 0;
    (function tick(){
      apply();
      if (++n < ticks) requestAnimationFrame(tick);
    })();
  }
  function bind(){
    apply();
    rafLock(60);
    var overlay = document.getElementById('loadingOverlay');
    if (overlay && 'MutationObserver' in window){
      try{ new MutationObserver(apply).observe(overlay, {attributes:true, childList:true, subtree:true}); }catch(e){}
    }
  }
  window.addEventListener('load', bind);
  window.addEventListener('resize', bind);
  window.addEventListener('orientationchange', bind);
})();

// === SOURCE: #LoadingBarWidthLockFlag ===
window.__LOCK_LOADING_BAR_WIDTH__ = true;

