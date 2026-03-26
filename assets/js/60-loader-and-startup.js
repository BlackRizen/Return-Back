window.GameApp && window.GameApp.registerModule && window.GameApp.registerModule('60-loader-and-startup', {"entryMarker": "// === SOURCE: #LoaderJS ===", "description": "Loader, tap-to-start, startup sequencing, audio warmup, loading bar bindings."});
/*__MODULE_BOUNDARY__*/
// === SOURCE: #LoaderJS ===
(function(){
  var loader = document.getElementById('loaderScreen');
  if(!loader) return;
  var startScreen = document.querySelector('.start-screen');

  function finish(){
    // Reveal start menu if present
    if(startScreen && getComputedStyle(startScreen).display === 'none'){
      startScreen.style.display = 'flex';
    }
    try{ window.dispatchEvent(new CustomEvent('gameUserStarted')); }catch(e){}
  }

  function onTap(){
    try{
      if(typeof Howler !== 'undefined' && Howler.ctx && Howler.ctx.state === 'suspended'){
        Howler.ctx.resume();
      }
    }catch(e){}
    // Fade out once, then finish
    loader.classList.add('fade-out');
    loader.addEventListener('transitionend', function once(e){
      if(e.propertyName !== 'opacity') return;
      loader.removeEventListener('transitionend', once);
      // keep in DOM (opacity 0) to avoid white flicker
      finish();
    });
    // Remove listeners to avoid double-trigger
    loader.removeEventListener('click', onTap);
    loader.removeEventListener('touchstart', onTap);
    window.removeEventListener('keydown', onKey);
  }

  function onKey(ev){
    if(ev.key === 'Enter' || ev.key === ' '){ onTap(); }
  }

  // Arm overlay immediately after load
  window.addEventListener('load', function(){
    loader.addEventListener('click', onTap, {once:false, passive:true});
    loader.addEventListener('touchstart', onTap, {once:false, passive:true});
    window.addEventListener('keydown', onKey);
  }, {once:true});
})();

// === SOURCE: #LoadingOverlayJS ===
(function(){
  const overlay = document.getElementById('loadingOverlay');
  const fill = document.getElementById('loadingFill');
  const pct = document.getElementById('loadingPct');
  const startBtn = document.getElementById('startBtn');
  const startScreen = document.getElementById('startScreen');

  function show(ms){
    if (!overlay || overlay.classList.contains('visible')) return;
    // Reset
    fill.style.transition='none'; fill.style.width='0%';
    overlay.style.display='flex'; overlay.classList.add('show','visible');
    try{ if(startScreen){ startScreen.style.visibility='hidden'; startScreen.style.display='none'; } }catch(_){}
    void fill.offsetWidth;
    requestAnimationFrame(()=>{ fill.style.transition = 'width '+ms+'ms linear'; fill.style.width='100%'; });
    const t0 = performance.now();
    (function tick(now){
      const p = Math.min(1,(now - t0)/ms);
      pct.textContent = Math.round(p*100)+'%';
      if (p < 1) requestAnimationFrame(tick);
    })(t0);
    setTimeout(()=>{
      overlay.classList.remove('visible');
      setTimeout(()=>{ overlay.classList.remove('show'); overlay.style.display='none'; }, 350);
    }, ms);
  }
  window.__showLoadingOverlay = show;

  // No-flash: show overlay as soon as finger/mouse goes down
  if (startBtn){
    const onDown = ()=> show(3000);
    startBtn.addEventListener('pointerdown', onDown, { once:true, capture:true });
    startBtn.addEventListener('touchstart', onDown, { once:true, capture:true, passive:false });
  }
})();

// === Robust starter: schedule the real game start once ===
(function(){
  let scheduled = false, timer = null, started = false;
  function tryStart(){
    // Ensure touch controls/joystick are visible
    try{ if (typeof showTouch === 'function') showTouch(); else document.body.classList.add('playing'); }catch(_){ try{ document.body.classList.add('playing'); }catch(_){} }

    if (started) return;
    started = true;
    try{
      if (typeof window.boot === 'function') {
        try{ window.boot(); }
        finally{ try{ if (typeof showTouch==='function') showTouch(); else document.body.classList.add('playing'); }catch(_){ document.body.classList.add('playing'); } }
      } else {
        try{ console.error('Game boot entry is missing: window.boot was not found.'); }catch(_){ }
      }
    }catch(_){ }
  }
  window.__startGameAfter = function(ms){
    if (scheduled) return;
    scheduled = true;
    timer = setTimeout(tryStart, ms|0);
  };
  // Also schedule on earliest gesture so hiding the button doesn't kill the click
  try{
    const btn = document.getElementById('startBtn');
    if (btn){
      const onDown = function(){ window.__showLoadingOverlay && window.__showLoadingOverlay(3000); window.__startGameAfter(3000); };
      btn.addEventListener('pointerdown', onDown, { once:true, capture:true });
      btn.addEventListener('touchstart', onDown, { once:true, capture:true, passive:false });
    }
  }catch(_){}
})();

// === SOURCE: #EnableButtonsAfterDelayOnTap ===
document.addEventListener("DOMContentLoaded", () => {
  const overlay = document.querySelector(".fade-overlay");
  const startBtn = document.getElementById("startButton");
  const optionsBtn = document.getElementById("optionsButton");
  const exitBtn = document.getElementById("exitButton");

  // 1) Disable buttons initially
  [startBtn, optionsBtn, exitBtn].forEach(btn => {
    if (btn) btn.setAttribute("disabled", "true");
  });

  // 2) On first click/tap on the overlay: start a 1s timer, then enable buttons
  const onFirstTap = (ev) => {
    // ensure overlay eats the tap and doesn't pass it through
    ev.stopPropagation();
    ev.preventDefault();

    setTimeout(() => {
      [startBtn, optionsBtn, exitBtn].forEach(btn => {
        if (btn) btn.removeAttribute("disabled");
      });
    }, 1000); // 1s after tap

    // remove listener so it runs only once
    overlay.removeEventListener("click", onFirstTap, true);
    overlay.removeEventListener("pointerdown", onFirstTap, true);
    overlay.removeEventListener("touchstart", onFirstTap, true);
  };

  // capture early so it runs before anything underneath
  overlay.addEventListener("click", onFirstTap, true);
  overlay.addEventListener("pointerdown", onFirstTap, true);
  overlay.addEventListener("touchstart", onFirstTap, { capture: true, passive: false });
});

// === SOURCE: #TapToStart_Fullscreen_EnableButtons_1s ===
document.addEventListener("DOMContentLoaded", () => {
  const startBtn   = document.getElementById("startBtn");
  const optionsBtn = document.getElementById("optionsBtn");
  const exitBtn    = document.getElementById("exitBtn");
  const loader     = document.getElementById("loaderScreen");
  const fadeOv     = document.querySelector(".fade-overlay");
  const buttons    = [startBtn, optionsBtn, exitBtn].filter(Boolean);

  // 1) Enable menu buttons right away
  try { buttons.forEach(b => { b.removeAttribute("disabled"); b.blur(); }); } catch(_) {}

  // 2) Hide tap overlays immediately (CSS already does it; JS enforces)
  try { if (fadeOv){ fadeOv.classList.add("hide"); fadeOv.style.display = "none"; } } catch(_) {}
  try { if (loader){ loader.style.display = "none"; } } catch(_) {}

  // 3) Simulate "first tap" hook for any listeners that depended on it (but skip fullscreen)
  try { document.dispatchEvent(new CustomEvent("firstTapSimulated")); } catch(_) {}

  // Note: audio may remain locked on iOS until the first real user gesture; that's expected.
});
(function(){
  try{
    /* ====== BACK BUTTON (Capacitor) ====== */
    try{
      var App = (window.Capacitor && (window.Capacitor.App || (window.Capacitor.Plugins && window.Capacitor.Plugins.App))) || null;
      if (App && typeof App.addListener === 'function'){
        App.addListener('backButton', function(){
          try{ if (typeof setPaused==='function') setPaused(true); }catch(_){}
          try{ if (typeof window.enforceGate==='function') window.enforceGate(); }catch(_){}
        });
      }
    }catch(_){}

    /* ====== GAPLESS LOOP (WebAudio, WAV) ====== */
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return; // keep HTMLAudio fallback if not supported

    const ctx = new AC({ latencyHint: 'playback' });
    const mast = ctx.createGain(); mast.connect(ctx.destination);

    const menuGain = ctx.createGain(); menuGain.gain.value = 0; menuGain.connect(mast);
    const gameGain = ctx.createGain(); gameGain.gain.value = (window.Sounds?.bgm?.volume ?? 0.35);  gameGain.connect(mast);

    const state = { current:'none', menuNode:null, gameNode:null, buffers:{menu:null, game:null} };

    function fetchDecode(url){
      return fetch(url).then(r=>r.arrayBuffer())
        .then(buf => new Promise((res,rej)=> ctx.decodeAudioData(buf, res, rej)));
    }

    function stopNode(n){ try{ n && n.stop(0); }catch(_){ } }

    function startTrack(which){
      if (!state.buffers[which]) return;
      if (state.current === which && ((which==='menu' && state.menuNode) || (which==='game' && state.gameNode))) {
        return; // already playing; do not restart
      }
      // stop both, then (re)start desired
      stopNode(state.menuNode); state.menuNode=null;
      stopNode(state.gameNode); state.gameNode=null;

      const node = ctx.createBufferSource();
      node.buffer = state.buffers[which];
      node.loop = true;
      node.loopStart = 0;
      node.loopEnd   = node.buffer.duration;
      node.connect(which==='menu'?menuGain:gameGain);
      node.start(ctx.currentTime + 0.03);
      if (which==='menu') state.menuNode = node; else state.gameNode = node;
      state.current = which;
    }

    function ensurePlayback(){
      try{ if (ctx.state === 'suspended') ctx.resume(); }catch(_){}
      if (state.current==='menu' && !state.menuNode) startTrack('menu');
      if (state.current==='game' && !state.gameNode) startTrack('game');
    }

    function muteHtmlAudio(){
      try{
        if (window.Sounds && Sounds.startBgm){ Sounds.startBgm.pause(); Sounds.startBgm.loop=false; Sounds.startBgm.volume=0; }
        if (window.Sounds && Sounds.bgm){ Sounds.bgm.pause(); Sounds.bgm.loop=false; Sounds.bgm.volume=0; }
      }catch(_){}
    }

    Promise.all([fetchDecode('gamemusic.wav').catch(function(){ return null; }), fetchDecode('music.wav')]).then(([mb, gb])=>{
      state.buffers.menu = mb;
      state.buffers.game = gb;

      // wire volume syncing
      const _applyVolumes = window.applyVolumes;
      window.applyVolumes = function(){
        try{ _applyVolumes && _applyVolumes(); }catch(_){}
        try{
          menuGain.gain.value = (window.Sounds?.startBgm?.volume ?? 0.9);
          gameGain.gain.value = (window.Sounds?.bgm?.volume ?? 0.35);
        }catch(_){}
      };

      // override starters with guards (no restarts if same track)
      const _smm = window.startMenuMusic;
      const _sm  = window.startMusic;

      window.startMenuMusic = function(){
        window.__menuMusicWanted = true;
        try{
          if (state.buffers && state.buffers.menu){
            muteHtmlAudio();
            try{ state.current = 'menu'; }catch(_){}
            ensurePlayback();
            startTrack('menu');
            return true;
          }
        }
        catch(_){}
        try{
          return _smm ? !!_smm() : false;
        }catch(_){}
        try{
          if (window.Sounds && Sounds.startBgm){
            Sounds.startBgm.loop = true;
            Sounds.startBgm.volume = Math.max(Sounds.startBgm.volume || 0, 0.9);
            Sounds.startBgm.currentTime = 0;
            const p = Sounds.startBgm.play();
            if (p && typeof p.catch === 'function') p.catch(()=>{});
            return true;
          }
        }catch(_){}
        return false;
      };
      window.startMusic = function(){
        try{ muteHtmlAudio(); ensurePlayback(); startTrack('game'); return true; }
        catch(_){ return _sm ? _sm() : false; }
      };

      window.stopMenuMusic = function(){
        try{ window.__menuMusicWanted = false; }catch(_){}
        try{
          if (window.Sounds && Sounds.startBgm){ Sounds.startBgm.pause(); Sounds.startBgm.currentTime = 0; }
        }catch(_){}
        try{ stopNode(state.menuNode); state.menuNode = null; }catch(_){}
        try{ if (state.current === 'menu') state.current = 'none'; }catch(_){}
        return true;
      };

      function revealStartMenu(){
        try{
          if (ctx.state === 'suspended') ctx.resume();
        }catch(_){}
        try{
          if (typeof Howler !== 'undefined' && Howler.ctx && Howler.ctx.state === 'suspended'){
            Howler.ctx.resume();
          }
        }catch(_){}
        try{
          var loader = document.getElementById('loaderScreen');
          if (loader){
            loader.classList.add('fade-out');
            loader.style.opacity = '0';
            loader.style.pointerEvents = 'none';
            loader.style.display = 'none';
          }
        }catch(_){}
        try{
          var startScreen = document.getElementById('startScreen') || document.querySelector('.start-screen');
          if (startScreen){
            startScreen.style.visibility = 'visible';
            startScreen.style.display = 'flex';
            startScreen.style.opacity = '1';
            startScreen.style.pointerEvents = 'auto';
          }
        }catch(_){}
        try{ window.dispatchEvent(new CustomEvent('gameUserStarted')); }catch(_){}
        return true;
      }

      window.gameApi = window.gameApi || {};
      window.gameApi.openStartMenu = function(){
        return revealStartMenu();
      };
      window.gameApi.playStartMenuSound = function(){
        try{
          if (ctx.state === 'suspended') ctx.resume();
        }catch(_){}
        try{
          if (typeof window.startMenuMusic === 'function') return !!window.startMenuMusic();
        }catch(_){}
        return false;
      };
      window.gameApi.openStartMenuAndPlaySound = function(){
        try{ revealStartMenu(); }catch(_){}
        try{
          if (typeof window.startMenuMusic === 'function') return !!window.startMenuMusic();
        }catch(_){}
        return false;
      };

      try{
        if (window.__menuMusicWanted && typeof window.startMenuMusic === 'function'){
          window.startMenuMusic();
        }
      }catch(_){}

      // re-ensure on app resume / visibility / user gesture
      try{
        document.addEventListener('visibilitychange', function(){
          if (!document.hidden) ensurePlayback();
        }, {passive:true});
      }catch(_){}

      ['pointerdown','touchstart','mousedown','keydown'].forEach(function(ev){
        window.addEventListener(ev, function(){ ensurePlayback(); }, {passive:true});
      });

      try{
        var App2 = (window.Capacitor && (window.Capacitor.App || (window.Capacitor.Plugins && window.Capacitor.Plugins.App))) || null;
        if (App2 && typeof App2.addListener === 'function'){
          App2.addListener('appStateChange', function(stateObj){
            if (stateObj && stateObj.isActive) ensurePlayback();
          });
        }
      }catch(_){}
    });
  }catch(_){}
})();
(function(){
  // Capacitor v6 Haptics detection with navigator.vibrate fallback
  const ImpactStyle = { Light:'Light', Medium:'Medium', Heavy:'Heavy', Rigid:'Rigid', Soft:'Soft' };
  let H = null;
  try {
    H = (window.Capacitor && (window.Capacitor.Haptics || (window.Capacitor.Plugins && window.Capacitor.Plugins.Haptics))) || null;
  } catch {}
  function nvib(ms){ try{ navigator.vibrate && navigator.vibrate(ms); }catch(_){} }
  function call(fn, arg){
    try{
      if (H && typeof H[fn] === 'function') { H[fn](arg); return; }
      // Fallback: small vib approximations
      if (fn === 'impact') nvib( fn && arg && arg.style === 'Heavy' ? 28 : 14 );
    }catch(_){}
  }
  window.haptic = {
    hit:      () => call('impact', { style: ImpactStyle.Heavy }),
    enemyHit: () => call('impact', { style: ImpactStyle.Light })
  };
})();
(function(){
  try{
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return; // stay on HTMLAudio if no WebAudio support

    const SFX = {
      ctx: null,
      gain: null,
      buffers: {},
      files: {
        healthup: 'healthup.mp3',
        powerup: 'powerup.mp3',
        repair:   'repair.mp3'
      },
      init(){
        if (this.ctx) return;
        this.ctx = new AC({ latencyHint: 'interactive' });
        this.gain = this.ctx.createGain();
        this.gain.gain.value = 1;
        this.gain.connect(this.ctx.destination);
        this.preload();
      },
      resume(){ try{ if(this.ctx && this.ctx.state==='suspended') this.ctx.resume(); }catch(_){ } },
      fetchDecode(url){
        // Avoid fetch on file:// which throws in some browsers
        if (location.protocol === 'file:') return Promise.reject(new Error('file-url'));
        return fetch(url).then(r=>{
          if(!r.ok) throw new Error('HTTP '+r.status);
          return r.arrayBuffer();
        }).then(buf => new Promise((res,rej)=> this.ctx.decodeAudioData(buf, res, rej)));
      },
      preload(){
        const tasks = Object.entries(this.files).map(([k,src]) =>
          this.fetchDecode(src).then(b=> this.buffers[k]=b).catch(()=>{/*fallback later*/})
        );
        Promise.all(tasks).catch(()=>{});
      },
      play(key){
        try{
          this.init(); this.resume();
          const buf = this.buffers[key];
          if (buf){
            const n = this.ctx.createBufferSource();
            n.buffer = buf;
            n.connect(this.gain);
            n.start();
            return;
          }
        }catch(_){}
        // Fallback to HTMLAudio if not decoded or on file://
        try{
          const a = new Audio(this.files[key]);
          a.currentTime = 0;
          a.play && a.play().catch(()=>{});
        }catch(_){}
      }
    };

    // Auto-init/resume on first interaction & on app resume
    ['pointerdown','touchstart','mousedown','keydown'].forEach(ev => {
      window.addEventListener(ev, ()=>{ SFX.init(); SFX.resume(); }, { once:true, passive:true });
    });
    document.addEventListener('visibilitychange', ()=>{ if(!document.hidden) SFX.resume(); });

    // Capacitor app resume hook
    try{
      var App = (window.Capacitor && (window.Capacitor.App || (window.Capacitor.Plugins && window.Capacitor.Plugins.App))) || null;
      App && App.addListener && App.addListener('appStateChange', st => { if(st && st.isActive) SFX.resume(); });
    }catch(_){}

    // Hook into your existing playSound(audio) so overlay buttons keep working
    const _playSound = window.playSound;
    window.playSound = function(audio){
      try{
        const src = (audio && audio.src || '').toLowerCase();
        if (src.endsWith('healthup.mp3')) { SFX.play('healthup'); return; }
        if (src.endsWith('powerup.mp3')) { SFX.play('powerup'); return; }
        if (src.endsWith('repair.mp3'))   { SFX.play('repair');   return; }
      }catch(_){}
      // otherwise, fallback to original behavior
      if (_playSound) return _playSound(audio);
      try{ audio && audio.play && audio.play(); }catch(_){}
    };
  }catch(_){}
})();
(function(){
  try{
    const AC = window.AudioContext || window.webkitAudioContext;
    const SFX = {
      ctx:null,gain:null,buffers:{},
      files:{healthup:'healthup.mp3',powerup:'powerup.mp3',repair:'repair.mp3'},
      init(){ if(this.ctx||!AC) return; this.ctx=new AC({latencyHint:'interactive'});
              this.gain=this.ctx.createGain(); this.gain.gain.value=1; this.gain.connect(this.ctx.destination);
              Object.entries(this.files).forEach(([k,src])=> this.fetchDecode(src).then(b=>this.buffers[k]=b).catch(()=>{})); },
      resume(){ try{ if(this.ctx && this.ctx.state==='suspended') this.ctx.resume(); }catch(_){ } },
      fetchDecode(url){ if(!AC) return Promise.reject('no-webaudio'); if(location.protocol==='file:') return Promise.reject('file-url');
                        return fetch(url).then(r=>{ if(!r.ok) throw new Error('HTTP '+r.status); return r.arrayBuffer(); })
                        .then(buf=>new Promise((res,rej)=> this.ctx.decodeAudioData(buf,res,rej))); },
      play(key){ try{ this.init(); this.resume(); const buf=this.buffers[key];
                      if(buf && this.ctx){ const n=this.ctx.createBufferSource(); n.buffer=buf; n.connect(this.gain); n.start(); return; } }catch(_){}
                    try{ const a=new Audio(this.files[key]); a.preload='auto'; a.crossOrigin='anonymous'; a.play&&a.play().catch(()=>{});}catch(_){} }
    };
    ['pointerdown','touchstart','mousedown','keydown'].forEach(ev=>{ window.addEventListener(ev,()=>{ SFX.init(); SFX.resume(); }, {once:true, passive:true}); });
    document.addEventListener('visibilitychange', ()=>{ if(!document.hidden) SFX.resume(); });
    try{ var App=(window.Capacitor && (window.Capacitor.App || (window.Capacitor.Plugins && window.Capacitor.Plugins.App)))||null;
         App&&App.addListener&&App.addListener('appStateChange', st=>{ if(st&&st.isActive) SFX.resume(); }); }catch(_){}
    const _playSound = window.playSound;
    window.playSound = function(audio){
      try{
        const src=(audio&&audio.src||'').toLowerCase();
        if(src.endsWith('healthup.mp3')){ SFX.play('healthup'); return; }
        if(src.endsWith('powerup.mp3')){ SFX.play('powerup'); return; }
        if(src.endsWith('repair.mp3'))  { SFX.play('repair');   return; }
      }catch(_){}
      if(_playSound) return _playSound(audio);
      try{ audio&&audio.play&&audio.play(); }catch(_){}
    };
  }catch(_){}
})();
/* --- Repair fill bar anchored to spaceshipdown.webp (70% ships) --- */
(function(){
  const TARGET_SRCS=['spaceshipdown.webp','spaceship.webp'];
  const GAP_VW = 0.3;

  function createBar(){
  const bar = document.createElement('div');
  bar.className = 'repair-bar-shipdown';
  const inner = document.createElement('div');
  inner.className = 'inner';
  const segs = [];
  for(let i=0;i<4;i++){ const s=document.createElement('div'); s.className='seg'; segs.push(s); inner.appendChild(s); }
  bar.appendChild(inner);
  // fixed known AR of the PNG; avoids onload jitter
  bar.dataset.ar = (549/1894).toFixed(6);
  return { bar, segs };
}

  let level = 0;
  let barEl = null;
  let segEls = null;
  let shipImg = null;

  function draw(){if (!segEls) return;

// Clear segments
segEls.forEach(s => s.className = 'seg');

if (level <= 0) return;

const colors = ['red','orange','yellow','green'];
const color  = colors[Math.min(level - 1, colors.length - 1)];

// With column-reverse, segEls[0] is the bottom segment visually.
for (let i = 0; i < level; i++) {
  segEls[i].classList.add('filled', color);
}}

  function ensureParentPositioned(el){
    const p = el && el.parentElement;
    if (!p) return null;
    const cs = getComputedStyle(p);
    if (cs.position === 'static'){
      p.style.position = 'relative';
    }
    return p;
  }

  function layoutBar(){
  if(!barEl || !shipImg) return;
  const p = shipImg.parentElement;
  const pr = p.getBoundingClientRect();
  const ir = shipImg.getBoundingClientRect();
  const targetH = Math.max(32, (ir.height*0.33));
  const ar = parseFloat(barEl.dataset.ar || (549/1894));
  const targetW = (targetH*ar);
  barEl.style.height = targetH + 'px';
  barEl.style.width  = targetW + 'px';
  const topPx = (ir.top-pr.top)+(ir.height-targetH)/2;
  const gapPx = Math.max(2, (0.30/100)*window.innerWidth);
  const leftPx = (ir.left-pr.left)-gapPx-targetW;
  barEl.style.transform = `translate3d(${leftPx}px, ${topPx}px, 0)`;
}

  function attachToShipDown(img){
    shipImg = img;
    const parent = ensureParentPositioned(img);
    if (!parent) return;
    const { bar, segs } = createBar();
    barEl = bar; segEls = segs;
    parent.appendChild(barEl);
    barEl.classList.add('show');
    draw();
    const step = () => { layoutBar(); requestAnimationFrame(step); };
    requestAnimationFrame(step);
    window.addEventListener('resize', layoutBar);
  }

  function tryFindAndAttach(){
    const imgs = document.images;
    for (let i=0;i<imgs.length;i++){
      const src = (imgs[i].getAttribute('src')||'').split('?')[0];
      if (Array.isArray(TARGET_SRCS) ? TARGET_SRCS.some(t=>src.endsWith(t)) : src.endsWith(TARGET_SRC)) {
        attachToShipDown(imgs[i]);
        return true;
      }
    }
    return false;
  }

  if (!tryFindAndAttach()){
    const obs = new MutationObserver(() => {
      if (tryFindAndAttach()){
        obs.disconnect();
      }
    });
    obs.observe(document.documentElement, { childList:true, subtree:true, attributes:true, attributeFilter:['src','style','class'] });
    setTimeout(() => obs.disconnect(), 15000);
  }

  

  window.__shipDownFillBar = {
    incr: () => { if(level<4){ level++; draw(); } if (barEl) barEl.classList.add('show'); },
    set: (n) => { level = Math.max(0, Math.min(4, n|0)); draw(); if (barEl) barEl.classList.add('show'); },
    show: () => { if (barEl) barEl.classList.add('show'); },
    get: () => level
  };
})(); 
/* --- end Repair fill bar --- */
// Repair->barfill binding + departure trigger (robust fallback)
(function(){
  function hideRepairButton(){
    const btns = Array.from(document.querySelectorAll('button, [role="button"], .btn'));
    for(const b of btns){
      const txt = (b.textContent||'').trim().toLowerCase();
      if (txt === 'repair' || b.getAttribute('data-action') === 'repair'){
        b.style.display = 'none';
      }
    }
  }
  

  // If globals aren't accessible, allow game code to listen for the event:
  window.addEventListener('startShipDepartureByRepair', ()=>{
    try{
      shipState = 'warmup'; warmupTimer = 2.0;
      if (shipEl && shipEl.classList) shipEl.classList.add('wiggle');
      try{ playSound(Sounds.shipWarmup); }catch(_){}
    }catch(_){}
  });
})();
/* Bind Repair fill only when overlay appears, and only to its actual button */
(function(){
  const OVERLAY_SEL = '#levelOverlay';
  const REPAIR_BTN_SEL = 'button.choice-btn[data-choice="repair"]';
  let bound = false;

  function hideRepairButton(btn){
    try { if (btn) btn.style.display = 'none'; } catch(_) {}
  }

  function triggerShipDeparture(){
    try{
      // Mirror the same warmup path used when time is up
      shipState = 'warmup'; warmupTimer = 2.0;
      if (shipEl && shipEl.classList) shipEl.classList.add('wiggle');
      try{ playSound(Sounds.shipWarmup); }catch(_){}
    }catch(_){
      // Fallback event in case globals aren't nearby
      window.dispatchEvent(new CustomEvent('startShipDepartureByRepair'));
    }
  }

  function onRepairClick(ev){
    ev.preventDefault();
    ev.stopPropagation();
    try{
      if (window.__shipDownFillBar){
        window.__shipDownFillBar.show && window.__shipDownFillBar.show();
        window.__shipDownFillBar.incr && window.__shipDownFillBar.incr();
        const lvl = (window.__shipDownFillBar.get && window.__shipDownFillBar.get()) || 0;
        if (lvl >= 4){
          const btn = ev.currentTarget;
          hideRepairButton(btn);
          triggerShipDeparture();
        }
      }
    }catch(_){}
  }

  function tryBind(){
    if (bound) return;
    const overlay = document.querySelector(OVERLAY_SEL);
    if (!overlay) return;
    const btn = overlay.querySelector(REPAIR_BTN_SEL);
    if (!btn) return;
    btn.addEventListener('click', onRepairClick, { capture: true });
    bound = true;
  }

  // Try now, then observe overlay appearance or changes
  tryBind();
  const obs = new MutationObserver(()=> tryBind());
  obs.observe(document.documentElement, { childList: true, subtree: true, attributes: true });
  // Safety: stop observing after some time
  setTimeout(()=> obs.disconnect(), 20000);
})();
// Fallback: in case playRepair() isn't found here, listen for a custom event
window.addEventListener('repairAnimationFinished', ()=>{
  try {
    if (window.__shipDownFillBar) {
      window.__shipDownFillBar.show && window.__shipDownFillBar.show();
      window.__shipDownFillBar.incr && window.__shipDownFillBar.incr();
    }
  } catch(_) {}
});
