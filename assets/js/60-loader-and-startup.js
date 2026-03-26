window.GameApp && window.GameApp.registerModule && window.GameApp.registerModule('60-loader-and-startup', {"entryMarker": "// === SOURCE: #LoaderJS ===", "description": "Loader, tap-to-start, startup sequencing, audio warmup, loading bar bindings."});
/*__MODULE_BOUNDARY__*/
// === SOURCE: #LoaderJS ===
(function(){
  var loader = document.getElementById('loaderScreen');
  if(!loader) return;
  var startScreen = document.querySelector('.start-screen');

  const qs = new URLSearchParams(window.location.search || '');
  const FROM_LAUNCHER = qs.get('launcher') === '1';

  window.__FROM_LAUNCHER = FROM_LAUNCHER;
  window.__SKIP_GAME_FULLSCREEN = FROM_LAUNCHER;

  function resumeAudio(){
    try{
      if(typeof Howler !== 'undefined' && Howler.ctx && Howler.ctx.state === 'suspended'){
        Howler.ctx.resume();
      }
    }catch(e){}
  }

  function finish(){
    if(startScreen && getComputedStyle(startScreen).display === 'none'){
      startScreen.style.display = 'flex';
    }
    try{ window.dispatchEvent(new CustomEvent('gameUserStarted')); }catch(e){}
  }

  function onTap(){
    resumeAudio();
    loader.classList.add('fade-out');
    loader.addEventListener('transitionend', function once(e){
      if(e.propertyName !== 'opacity') return;
      loader.removeEventListener('transitionend', once);
      finish();
    });
    loader.removeEventListener('click', onTap);
    loader.removeEventListener('touchstart', onTap);
    window.removeEventListener('keydown', onKey);
  }

  function onKey(ev){
    if(ev.key === 'Enter' || ev.key === ' '){ onTap(); }
  }

  // If launched from the website launcher, the real launcher overlay in index.html handles startup.
  // So we hide the old tap gate immediately.
  function bypassOldLoaderForLauncher(){
    resumeAudio();
    try{
      loader.classList.add('fade-out');
      loader.style.opacity = '0';
      loader.style.pointerEvents = 'none';
      loader.style.display = 'none';
    }catch(_){}
    finish();
  }

  window.addEventListener('load', function(){
    if (FROM_LAUNCHER) {
      bypassOldLoaderForLauncher();
      return;
    }

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
    if (!fill || !pct) return;

    fill.style.transition='none';
    fill.style.width='0%';

    overlay.style.display='flex';
    overlay.classList.add('show','visible');

    try{
      if(startScreen){
        startScreen.style.visibility='hidden';
        startScreen.style.display='none';
      }
    }catch(_){}

    void fill.offsetWidth;

    requestAnimationFrame(()=>{
      fill.style.transition = 'width '+ms+'ms linear';
      fill.style.width='100%';
    });

    const t0 = performance.now();
    (function tick(now){
      const p = Math.min(1,(now - t0)/ms);
      pct.textContent = Math.round(p*100)+'%';
      if (p < 1) requestAnimationFrame(tick);
    })(t0);

    setTimeout(()=>{
      overlay.classList.remove('visible');
      setTimeout(()=>{
        overlay.classList.remove('show');
        overlay.style.display='none';
      }, 350);
    }, ms);
  }

  window.__showLoadingOverlay = show;

  if (startBtn){
    const onDown = ()=> show(3000);
    startBtn.addEventListener('pointerdown', onDown, { once:true, capture:true });
    startBtn.addEventListener('touchstart', onDown, { once:true, capture:true, passive:false });
  }
})();

// === Robust starter: schedule the real game start once ===
(function(){
  let scheduled = false, timer = null, started = false;

  function forceResizeBursts(){
    try{ window.dispatchEvent(new Event('resize')); }catch(_){}
    setTimeout(()=>{ try{ window.dispatchEvent(new Event('resize')); }catch(_){} }, 120);
    setTimeout(()=>{ try{ window.dispatchEvent(new Event('resize')); }catch(_){} }, 450);
    setTimeout(()=>{ try{ window.dispatchEvent(new Event('resize')); }catch(_){} }, 1000);
  }

  function tryStart(){
    try{
      if (typeof showTouch === 'function') showTouch();
      else document.body.classList.add('playing');
    }catch(_){
      try{ document.body.classList.add('playing'); }catch(__){}
    }

    if (started) return;
    started = true;

    try{
      if (typeof window.boot === 'function') {
        try{ window.boot(); }
        finally{
          try{
            if (typeof showTouch === 'function') showTouch();
            else document.body.classList.add('playing');
          }catch(_){
            try{ document.body.classList.add('playing'); }catch(__){}
          }
          forceResizeBursts();
        }
      } else {
        try{ console.error('Game boot entry is missing: window.boot was not found.'); }catch(_){}
      }
    }catch(_){}
  }

  window.__startGameAfter = function(ms){
    if (scheduled) return;
    scheduled = true;
    timer = setTimeout(tryStart, ms|0);
  };

  try{
    const btn = document.getElementById('startBtn');
    if (btn){
      const onDown = function(){
        window.__showLoadingOverlay && window.__showLoadingOverlay(3000);
        window.__startGameAfter(3000);
      };
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

  const qs = new URLSearchParams(window.location.search || '');
  const FROM_LAUNCHER = qs.get('launcher') === '1';

  [startBtn, optionsBtn, exitBtn].forEach(btn => {
    if (btn) btn.setAttribute("disabled", "true");
  });

  // The new in-page launcher handles the first click.
  if (FROM_LAUNCHER){
    setTimeout(() => {
      [startBtn, optionsBtn, exitBtn].forEach(btn => {
        if (btn) btn.removeAttribute("disabled");
      });
    }, 50);
    return;
  }

  const onFirstTap = (ev) => {
    ev.stopPropagation();
    ev.preventDefault();

    setTimeout(() => {
      [startBtn, optionsBtn, exitBtn].forEach(btn => {
        if (btn) btn.removeAttribute("disabled");
      });
    }, 1000);

    overlay && overlay.removeEventListener("click", onFirstTap, true);
    overlay && overlay.removeEventListener("pointerdown", onFirstTap, true);
    overlay && overlay.removeEventListener("touchstart", onFirstTap, true);
  };

  overlay && overlay.addEventListener("click", onFirstTap, true);
  overlay && overlay.addEventListener("pointerdown", onFirstTap, true);
  overlay && overlay.addEventListener("touchstart", onFirstTap, { capture: true, passive: false });
});

// === SOURCE: #TapToStart_Fullscreen_EnableButtons_1s ===
document.addEventListener("DOMContentLoaded", () => {
  const startBtn   = document.getElementById("startBtn");
  const optionsBtn = document.getElementById("optionsBtn");
  const exitBtn    = document.getElementById("exitBtn");
  const loader     = document.getElementById("loaderScreen");
  const fadeOv     = document.querySelector(".fade-overlay");
  const buttons    = [startBtn, optionsBtn, exitBtn].filter(Boolean);

  try { buttons.forEach(b => { b.removeAttribute("disabled"); b.blur(); }); } catch(_) {}

  try { if (fadeOv){ fadeOv.classList.add("hide"); fadeOv.style.display = "none"; } } catch(_) {}
  try { if (loader){ loader.style.display = "none"; } } catch(_) {}

  try { document.dispatchEvent(new CustomEvent("firstTapSimulated")); } catch(_) {}
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
    if (!AC) return;

    const ctx = new AC({ latencyHint: 'playback' });
    const mast = ctx.createGain(); mast.connect(ctx.destination);

    const menuGain = ctx.createGain(); menuGain.gain.value = (window.Sounds?.startBgm?.volume ?? 0.9); menuGain.connect(mast);
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
        return;
      }

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

    Promise.all([fetchDecode('gamemusic.wav'), fetchDecode('music.wav')]).then(([mb, gb])=>{
      state.buffers.menu = mb;
      state.buffers.game = gb;

      const _applyVolumes = window.applyVolumes;
      window.applyVolumes = function(){
        try{ _applyVolumes && _applyVolumes(); }catch(_){}
        try{
          menuGain.gain.value = (window.Sounds?.startBgm?.volume ?? 0.9);
          gameGain.gain.value = (window.Sounds?.bgm?.volume ?? 0.35);
        }catch(_){}
      };

      const _smm = window.startMenuMusic;
      const _sm  = window.startMusic;

      window.startMenuMusic = function(){
        try{ muteHtmlAudio(); ensurePlayback(); startTrack('menu'); }
        catch(_){ _smm && _smm(); }
      };

      window.startMusic = function(){
        try{ muteHtmlAudio(); ensurePlayback(); startTrack('game'); }
        catch(_){ _sm && _sm(); }
      };

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
  const ImpactStyle = { Light:'Light', Medium:'Medium', Heavy:'Heavy', Rigid:'Rigid', Soft:'Soft' };
  let H = null;
  try {
    H = (window.Capacitor && (window.Capacitor.Haptics || (window.Capacitor.Plugins && window.Capacitor.Plugins.Haptics))) || null;
  } catch {}
  function nvib(ms){ try{ navigator.vibrate && navigator.vibrate(ms); }catch(_){} }
  function call(fn, arg){
    try{
      if (H && typeof H[fn] === 'function') { H[fn](arg); return; }
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
    if (!AC) return;

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
        if (location.protocol === 'file:') return Promise.reject(new Error('file-url'));
        return fetch(url).then(r=>{
          if(!r.ok) throw new Error('HTTP '+r.status);
          return r.arrayBuffer();
        }).then(buf => new Promise((res,rej)=> this.ctx.decodeAudioData(buf, res, rej)));
      },
      preload(){
        const tasks = Object.entries(this.files).map(([k,src]) =>
          this.fetchDecode(src).then(b=> this.buffers[k]=b).catch(()=>{})
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
        try{
          const a = new Audio(this.files[key]);
          a.currentTime = 0;
          a.play && a.play().catch(()=>{});
        }catch(_){}
      }
    };

    ['pointerdown','touchstart','mousedown','keydown'].forEach(ev => {
      window.addEventListener(ev, ()=>{ SFX.init(); SFX.resume(); }, { once:true, passive:true });
    });
    document.addEventListener('visibilitychange', ()=>{ if(!document.hidden) SFX.resume(); });

    try{
      var App = (window.Capacitor && (window.Capacitor.App || (window.Capacitor.Plugins && window.Capacitor.Plugins.App))) || null;
      App && App.addListener && App.addListener('appStateChange', st => { if(st && st.isActive) SFX.resume(); });
    }catch(_){}

    const _playSound = window.playSound;
    window.playSound = function(audio){
      try{
        const src = (audio && audio.src || '').toLowerCase();
        if (src.endsWith('healthup.mp3')) { SFX.play('healthup'); return; }
        if (src.endsWith('powerup.mp3')) { SFX.play('powerup'); return; }
        if (src.endsWith('repair.mp3'))  { SFX.play('repair'); return; }
      }catch(_){}
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
    try{
      var App=(window.Capacitor && (window.Capacitor.App || (window.Capacitor.Plugins && window.Capacitor.Plugins.App)))||null;
      App&&App.addListener&&App.addListener('appStateChange', st=>{ if(st&&st.isActive) SFX.resume(); });
    }catch(_){}
    const _playSound = window.playSound;
    window.playSound = function(audio){
      try{
        const src=(audio&&audio.src||'').toLowerCase();
        if(src.endsWith('healthup.mp3')){ SFX.play('healthup'); return; }
        if(src.endsWith('powerup.mp3')){ SFX.play('powerup'); return; }
        if(src.endsWith('repair.mp3'))  { SFX.play('repair'); return; }
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
    bar.dataset.ar = (549/1894).toFixed(6);
    return { bar, segs };
  }

  let level = 0;
  let barEl = null;
  let segEls = null;
  let shipImg = null;

  function draw(){
    if (!segEls) return;
    segEls.forEach(s => s.className = 'seg');
    if (level <= 0) return;

    const colors = ['red','orange','yellow','green'];
    const color  = colors[Math.min(level - 1, colors.length - 1)];

    for (let i = 0; i < level; i++) {
      segEls[i].classList.add('filled', color);
    }
  }

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

  window.addEventListener('startShipDepartureByRepair', ()=>{
    try{
      shipState = 'warmup'; warmupTimer = 2.0;
      if (shipEl && shipEl.classList) shipEl.classList.add('wiggle');
      try{ playSound(Sounds.shipWarmup); }catch(_){}
    }catch(_){}
  });
})();

(function(){
  const OVERLAY_SEL = '#levelOverlay';
  const REPAIR_BTN_SEL = 'button.choice-btn[data-choice="repair"]';
  let bound = false;

  function hideRepairButton(btn){
    try { if (btn) btn.style.display = 'none'; } catch(_) {}
  }

  function triggerShipDeparture(){
    try{
      shipState = 'warmup'; warmupTimer = 2.0;
      if (shipEl && shipEl.classList) shipEl.classList.add('wiggle');
      try{ playSound(Sounds.shipWarmup); }catch(_){}
    }catch(_){
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

  tryBind();
  const obs = new MutationObserver(()=> tryBind());
  obs.observe(document.documentElement, { childList: true, subtree: true, attributes: true });
  setTimeout(()=> obs.disconnect(), 20000);
})();

window.addEventListener('repairAnimationFinished', ()=>{
  try {
    if (window.__shipDownFillBar) {
      window.__shipDownFillBar.show && window.__shipDownFillBar.show();
      window.__shipDownFillBar.incr && window.__shipDownFillBar.incr();
    }
  } catch(_) {}
});