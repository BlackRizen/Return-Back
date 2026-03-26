window.GameApp && window.GameApp.registerModule && window.GameApp.registerModule('80-boss-cinematics', {"entryMarker": "// === SOURCE: #BossL10DelayedIntro ===", "description": "Boss intro gating, cinematics, fullscreen persistence, attack probability overrides, VHS rewind."});
/*__MODULE_BOUNDARY__*/
// === SOURCE: #BossL10DelayedIntro ===
(function(){
  if (window.__bossL10IntroPatchedV4) return;
  window.__bossL10IntroPatchedV4 = true;

  const lerp = (a,b,t)=>a+(b-a)*t;
  const easeOutCubic = t => 1 - Math.pow(1 - t, 3);
  function runtime(){
    try{ return window.GameApp && GameApp.runtime || null; }catch(_){ return null; }
  }
  function later(fn, ms, label){
    const rt = runtime();
    if (rt && typeof rt.trackTimeout === 'function') return rt.trackTimeout(fn, Math.max(0, ms|0), label || 'boss-cinematic');
    return setTimeout(fn, Math.max(0, ms|0));
  }
  function every(fn, ms, label){
    const rt = runtime();
    if (rt && typeof rt.trackInterval === 'function') return rt.trackInterval(fn, Math.max(1, ms|0), label || 'boss-cinematic');
    return setInterval(fn, Math.max(1, ms|0));
  }

  function showBossRoar(e, ms=3000){
  try{
    if(!e || !e.el) return;
    var sprite = e.el.firstChild || e.el;
    // Pause CSS animations on this entity and freeze logic flags
    e.roaring = true; e.biting = false;
    e.el.classList.add('anim-paused');
    var prevVis = sprite.style.visibility; sprite.style.visibility = 'hidden';
    // Choose side image by facing dir
    var sideImg = (e.dir === 'right') ? 'roarright.png' : 'roarleft.png';
    try{ if(!Sounds.roar){ Sounds.roar = new Audio('roaring.mp3'); } Sounds.roar.currentTime = 0; Sounds.roar.play && Sounds.roar.play().catch(()=>{}); }catch(_){ }
var overlay = document.createElement('img');
    overlay.className = 'roar-overlay'; overlay.alt='roar'; overlay.src = sideImg;
    e.el.appendChild(overlay);
    try{ var oy=(typeof getBossOffsetY==='function'?getBossOffsetY():0)|0; overlay.style.marginTop = oy+'px'; }catch(_){ }
    try{ if (typeof applyBossSpriteOffset === 'function') applyBossSpriteOffset(e); }catch(_){}
    later(function(){
      e.roaring = false;
      try{ overlay.remove(); }catch(_){}
      sprite.style.visibility = prevVis || '';
      e.el.classList.remove('anim-paused');
    }, ms, 'boss-roar-finish');
  }catch(_){}
}

  function showQuake(e, ms=3000){
    // Gate F during L10 boss quake
    try{ if(!window.__fGateL10BossApplied && e && e.isBoss && typeof currentLevel!=='undefined' && currentLevel===10){
      window.__fGateL10BossApplied = true;
      window.__blockF = true;
      later(()=>{ try{ window.__blockF = false; window.__bossInvul = false; }catch(_){ } }, ms, 'boss-quake-unblock');
    }}catch(_){ }

    const layer = document.getElementById('particles') || document.body;
    const wrap = document.createElement('div');
    wrap.className = 'quake-wave';
    layer.appendChild(wrap);

    const place = ()=>{
      try{
        const cx = Math.round(e.x + e.w/2);
        const oy = (typeof getBossOffsetY === 'function' ? getBossOffsetY() : 0);
        const cy = Math.round(e.y + e.h*0.65 + oy);
        wrap.style.transform = `translate(${cx}px, ${cy}px)`;
      }catch(_){}
    };
    place();

    [0, 140, 280, 420].forEach(delay => {
      later(()=>{
        const ring = document.createElement('div');
        ring.className = 'ring';
        wrap.appendChild(ring);
        later(()=>{ try{ ring.remove(); }catch(_){} }, Math.max(0, ms - delay), 'boss-quake-ring-remove');
      }, delay, 'boss-quake-ring-add');
    });

    const t = every(place, 30, 'boss-quake-place');
    later(()=>{ clearInterval(t); try{ runtime() && runtime().untrackAsync && runtime().untrackAsync(t); }catch(__){} try{ wrap.remove(); }catch(_){} }, ms, 'boss-quake-finish');
    try{ if(window.bigQuake) bigQuake(ms); else if(window.screenShake) screenShake(ms); }catch(_){}
  }

  function pushPlayerToEdge(e, ms=1000){
    try{ if (typeof lockInputs === 'function') lockInputs(ms); }catch(_){}
    try{
      const W = (window.innerWidth || document.documentElement.clientWidth) || 1280;
      const margin = 16;
      const bossCX = e.x + e.w/2;
      const playerCX = player.x + player.w/2;
      const toRight = (playerCX >= bossCX);
      const targetX = toRight ? Math.max(0, W - player.w - margin) : margin;
      const dir = toRight ? 1 : -1;

      const t0 = performance.now();
      const force = (typeof scaled==='function' ? scaled(1800) : 1800);

      const h = every(()=>{
        const now = performance.now();
        const p = Math.min(1, (now - t0) / ms);
        const ramp = Math.min(1, p / 0.25);
        try{
          player.knockVX = dir * force * ramp;
          if ((dir < 0 && player.x <= targetX) || (dir > 0 && player.x >= targetX)){
            player.x = targetX;
            player.knockVX = 0;
          }
          if (typeof syncPlayer === 'function') syncPlayer();
        }catch(_){}
      }, 16);

      later(()=>{ try{ clearInterval(h); runtime() && runtime().untrackAsync && runtime().untrackAsync(h); player.knockVX = 0; }catch(_){ } }, ms, 'boss-push-finish');
    }catch(_){}
  }

  try{ window.showBossRoar = showBossRoar; }catch(_){ }
  try{ window.showQuake = showQuake; }catch(_){ }
  try{ window.pushPlayerToEdge = pushPlayerToEdge; }catch(_){ }
  try{ showBossRoar = window.showBossRoar; }catch(_){ }
  try{ showQuake = window.showQuake; }catch(_){ }
  try{ pushPlayerToEdge = window.pushPlayerToEdge; }catch(_){ }

  if (window.__domainOwnsSpawnEnemy) return;

  const origSpawnEnemy = window.spawnEnemy;
  if (typeof origSpawnEnemy !== 'function') return;

  let pending = false;

  window.spawnEnemy = function(){
  // Level 10 intro gating
  try {
    if (typeof currentLevel !== 'undefined' && currentLevel === 10) {
      var lta = (typeof levelTransitionActive !== 'undefined') ? levelTransitionActive : false;
      if (!window.__bossIntroDone || !enemySpawnsEnabled || lta) {
        return;
      }
    }
  } catch (e) { /* fail-closed */ }

      // Non-Level-10: behave normally
  if (!(typeof currentLevel !== 'undefined' && currentLevel === 10)) {
    return origSpawnEnemy.apply(this, arguments);
  }
  // Level-10: do not fall through to original while intro gating is active
  if (!enemySpawnsEnabled) { return; }

    if (pending || (typeof enemies !== 'undefined' && enemies.length > 0)) return;

    pending = true;

    setTimeout(()=>{
      origSpawnEnemy();

      const e = (enemies || []).find(x => x && x.isBoss && !x.__introHandled);
      if (!e){ pending = false; return; }
      e.__introHandled = true;

      const W = (window.innerWidth || document.documentElement.clientWidth);
      const margin = 16;
      const fromLeft = (e.dir === 'right');
      const targetX  = fromLeft ? margin : Math.max(0, W - e.w - margin);
      const startX = fromLeft ? -Math.max(140, e.w) : (W + Math.max(140, e.w));

      // Boss invul from intro start until quake ends
      try{ if(e && e.isBoss && typeof currentLevel!=='undefined' && currentLevel===10){ window.__bossInvul = true; } }catch(_){ }

      // Block F from the first frame of the boss intro until quake un-gates it
      try{ if(e && e.isBoss && typeof currentLevel!=='undefined' && currentLevel===10){ window.__blockF = true; } }catch(_){ }

      // Static boss throughout
      e.staticBoss = true;
      e.staticBossX = startX;
      e.x = startX;
      e.el.style.transform = `translate(${e.x}px, ${e.y}px)`;

      // Disable early actions
      e.shootTimer = 999;
      e.tpCd = 9999;

      // Slower entrance with ease-out
      const dur = 2600;
      const t0 = performance.now();
      (function step(now){
        const p = Math.min(1, (now - t0) / dur);
        const q = easeOutCubic(p);
        e.staticBossX = Math.round(lerp(startX, targetX, q));
        e.x = e.staticBossX;
        e.el.style.transform = `translate(${e.x}px, ${e.y}px)`;
        if (p < 1){ requestAnimationFrame(step); }
        else {
          // Arrival: 2s roar (left/right) + 2s bigger quake wave + push player
          showBossRoar(e, 1000);
          showQuake(e, 3000);
          pushPlayerToEdge(e, 1000);
          setTimeout(()=>{
            // Remain static and start firing from fixed spot
            e.staticBoss = true;
            e.staticBossX = targetX;
            try{
              e.shootTimer = Math.max(0.15, (Math.random()*(0.8-0.35)+0.35) * currentDiff.enemyShootRate);
            }catch(_){ e.shootTimer = 0.6; }
            e.tpCd = 9999;
            pending = false;
          }, 2000);
        }
      })(t0);
    }, 3000);
  };
})();

// === SOURCE: #BossIntroJS ===
(function(){
  if (window.__bossIntroInstalled) return; window.__bossIntroInstalled = true;

  function pauseAllGameAudio(){
    try{ window.Sounds && Sounds.bgm && Sounds.bgm.pause && Sounds.bgm.pause(); }catch(_){}
    try{ window.Sounds && Sounds.startBgm && Sounds.startBgm.pause && Sounds.startBgm.pause(); }catch(_){}
    try{ window.Sounds && Sounds.bossEntrance && Sounds.bossEntrance.pause && Sounds.bossEntrance.pause(); }catch(_){}
  }

  function resumeBossTrack(){
    try{
      if (!window.Sounds) window.Sounds = {};
      if (!Sounds.bossEntrance){ Sounds.bossEntrance = new Audio('bossentrance.mp3'); }
      Sounds.bossEntrance.loop = true;
      Sounds.bossEntrance.currentTime = 0;
      Sounds.bossEntrance.play && Sounds.bossEntrance.play().catch(function(){});
    }catch(_){}
  }

  window.showBossIntro = function(cb){
    var ov = document.getElementById('BossIntroOv');
    var vid = document.getElementById('BossIntroVid');
    var skip= document.getElementById('BossIntroSkip');
    if (!ov || !vid || !skip){
      try{ if (window.GameApp && GameApp.boss && typeof GameApp.boss.markIntroDone === 'function') GameApp.boss.markIntroDone(); else window.__bossIntroDone = true; }catch(_){ }
      if (typeof cb === 'function') cb();
      return;
    }

    // hard-stop gameplay
    try{ window.controlsLocked = true; }catch(_){}
    try{ window.enemySpawnsEnabled = false; }catch(_){}
    try{ window.levelTransitionActive = true; }catch(_){}
    pauseAllGameAudio();

    ov.style.display = 'flex';

    var finished = false;
    function finish(){
      if (finished) return; finished = true;
      try{ ov.style.display='none'; }catch(_){}
      try{ vid.pause(); }catch(_){}
      try{ vid.currentTime = 0; }catch(_){}
      try{ window.controlsLocked = false; }catch(_){}
      try{ if (window.GameApp && GameApp.boss && typeof GameApp.boss.markIntroDone === 'function') GameApp.boss.markIntroDone(); else window.__bossIntroDone = true; }catch(_){}
      if (typeof cb === 'function') cb();
    }

    skip.addEventListener('click', function(ev){ ev.stopPropagation(); finish(); }, {once:true});
    vid.addEventListener('ended', function(){ finish(); }, {once:true});

    // Autoplay-friendly: start muted if needed, unmute if already allowed
    try{ vid.muted = false; }catch(_){}
    var p = vid.play();
    if (p && typeof p.catch === 'function'){
      p.catch(function(){
        try{ vid.muted = true; }catch(_){}
        vid.play().catch(function(){});
      });
    }
  };

  window.__resumeBossTrack = resumeBossTrack;
})();

// === SOURCE: #WingFlapJS ===
(function(){
  if (window.__wingFlapInstalled) return; window.__wingFlapInstalled = true;

  var flapAudio = null;
  var lastPlay = 0;

  function isBossImage(el){
    try{
      if(!el) return false;
      if (el.dataset && el.dataset.boss === '1') return true;
      if (el.closest){
        var hit = el.closest('.boss, .boss-sprite, [data-boss="1"]');
        if (hit) return true;
      }
    }catch(_){ }
    return false;
  }

  function playWingFlap(){
    try{
      var now = (window.performance && performance.now) ? performance.now() : Date.now();
      if (now - lastPlay < 120) return; // throttle
      lastPlay = now;
      if (!flapAudio){
        flapAudio = new Audio('wingflap.mp3');
        flapAudio.preload = 'auto';
      }
      try{ flapAudio.currentTime = 0; }catch(_){}
      var p = flapAudio.play();
      if (p && p.catch) p.catch(function(){});
    }catch(_){}
  }

  var suffixes = [
    '_run_left_4.png','_run_left_9.png','_run_left_14.png',
    '_run_right_4.png','_run_right_9.png','_run_right_14.png'
  ];

  function isFlapFrame(url){
    try{
      if (!url) return false;
      var u = String(url).split('?')[0].toLowerCase();
      for (var i=0;i<suffixes.length;i++){
        if (u.endsWith(suffixes[i])) return true;
      }
      return false;
    }catch(_){ return false; }
  }

  // Observe IMG src changes across the document
  try{
    var mo = new MutationObserver(function(muts){
      for (var i=0;i<muts.length;i++){
        var m = muts[i];
        if (m.type === 'attributes' && m.attributeName === 'src'){
          var t = m.target;
          if (!t || t.tagName !== 'IMG') continue;
          var srcVal = t.getAttribute('src') || t.src;
          if (isFlapFrame(srcVal) && isBossImage(t)) playWingFlap();
        }
      }
    });
    mo.observe(document.documentElement || document.body, {subtree:true, attributes:true, attributeFilter:['src']});
  }catch(_){}

  // Fallback: intercept direct property sets
  try{
    var proto = HTMLImageElement.prototype;
    var desc = Object.getOwnPropertyDescriptor(proto, 'src');
    if (desc && desc.set){
      Object.defineProperty(proto, 'src', {
        set: function(v){
          try{ if (isFlapFrame(v) && isBossImage(this)) playWingFlap(); }catch(_){}
          return desc.set.call(this, v);
        },
        get: desc.get
      });
    }
  }catch(_){}
})();

// === SOURCE: #BossIntroFullscreenJS_PERSIST ===
(function(){
  if (window.__bossIntroFullscreenInstalledV2) return; 
  window.__bossIntroFullscreenInstalledV2 = true;

  function pickFsTarget(){
    // Prefer the app root so fullscreen persists after overlay hides
    return (
      document.getElementById('GameRoot') ||
      document.getElementById('AppRoot') ||
      document.getElementById('App') ||
      document.getElementById('root') ||
      document.documentElement
    );
  }

  function requestFsOnRoot(){
    try{
      if (window.__DIRECT_START_PATCH__ || window.__SKIP_GAME_FULLSCREEN) return false;
      var el = pickFsTarget();
      var doc = document;
      if (!el) return false;
      if (doc.fullscreenElement || doc.webkitFullscreenElement || doc.msFullscreenElement || doc.mozFullScreenElement) return true;
      return (el.requestFullscreen || el.webkitRequestFullscreen || el.msRequestFullscreen || el.mozRequestFullScreen)?.call(el);
    }catch(_){}
    return false;
  }

  function wireAfterShow(){
    // Enter fullscreen on the app root and DO NOT auto-exit.
    try{
      requestFsOnRoot();
      // No 'ended' or 'skip' listeners. No MutationObserver exit.
    }catch(_){}
  }

  // Hook showBossIntro to ensure we try after it displays
  var orig = window.showBossIntro;
  if (typeof orig === 'function'){
    window.showBossIntro = function(cb){
      try{ orig(cb); }finally{ try{ wireAfterShow(); }catch(_){ } }
    };
  } else {
    // If showBossIntro isn't ready yet, hook later
    document.addEventListener('DOMContentLoaded', function(){ 
      try{
        if (typeof window.showBossIntro === 'function'){
          var o = window.showBossIntro;
          window.showBossIntro = function(cb){
            try{ o(cb); }finally{ try{ wireAfterShow(); }catch(_){ } }
          };
        } else {
          // Fallback: try once on first user interaction to satisfy gesture requirements
          var once = function(){
            try{ wireAfterShow(); }finally{
              window.removeEventListener('click', once);
              window.removeEventListener('keydown', once);
              window.removeEventListener('touchstart', once);
            }
          };
          window.addEventListener('click', once, { once:true });
          window.addEventListener('keydown', once, { once:true });
          window.addEventListener('touchstart', once, { once:true });
        }
      }catch(_){}
    });
  }
})();

// === SOURCE: #BossAttackProbOverride35 ===
(function(){
  if (window.__bossAttackProbOverride35) return;
  window.__bossAttackProbOverride35 = true;

  function choose(e){
    try{
      if(!(e && e.isBoss && typeof currentLevel!=='undefined' && currentLevel===10)){
        return (typeof window.__prevBossAttack==='function' ? window.__prevBossAttack(e) : undefined);
      }
      const DY = (typeof scaledSafe==='function'? scaledSafe(38) : (typeof scaled==='function'? scaled(38): 38));
      const delay = (ms,fn)=> setTimeout(fn, ms);
      const fireOnce = (offY=0)=>{ const oy=e.y; e.y+=offY; if (typeof enemyShoot==='function') enemyShoot(e,false); e.y=oy; };

      const roll = Math.random();
      if (roll < 0.35){
        // 35%: jump→slam→wave
        __bossJumpSlamAndWave(e);
      } else if (roll < 0.67){
        // 32%: bursts U/D/M like original
        const lanes = [ {off:-DY,h:'low'}, {off:DY,h:'low'}, {off:0,h:'mid'} ];
        let t=0;
        lanes.forEach(L=>{
          for(let i=0;i<3;i++){ delay(t, ()=>{ e._shotHeight=L.h; fireOnce(L.off); }); t += 70; }
          t += 120;
        });
        try{ playSound(Sounds.spit); }catch(_){}
      } else {
        // 33%: normal single shot, low or mid
        e._shotHeight = (Math.random()<0.5 ? 'low' : 'mid');
        fireOnce(0);
        try{ playSound(Sounds.spit); }catch(_){}
      }
    }catch(_){}
  }

  function install(){
    if (window.__domainOwnsBossAttacks) return true;
    try{
      if (typeof window.bossAttackFire === 'function'){
        if (!window.__prevBossAttack) window.__prevBossAttack = window.bossAttackFire;
        window.bossAttackFire = function(e){ return choose(e); };
        return true;
      }
    }catch(_){}
    return false;
  }

  function boot(){
    var attempts = 0;
    (function retry(){
      if (install()) return;
      if (++attempts < 80) setTimeout(retry, 100);
    })();
  }

  if (document.readyState !== 'loading') boot();
  else document.addEventListener('DOMContentLoaded', boot);

  try{
    var btn = document.getElementById('startBtn');
    if(btn){ btn.addEventListener('click', function(){ setTimeout(boot, 0); }, { once:false }); }
  }catch(_){}
})();

// === SOURCE: #VHSRewindJS ===
(function(){
  let rewAudio = null, armed = true;

  function ensureAudio(){
    if (rewAudio) return rewAudio;
    try{
      rewAudio = new Audio('rewind.mp3');
      rewAudio.preload = 'auto';
      rewAudio.volume = 0.95;
    }catch(_){}
    return rewAudio;
  }

  function runVhsThen(next){
    let vid = null, fx = null;
    try{
      // Video layer under the overlay
      vid = document.createElement('video');
      vid.id = 'vhsRewindVideo';
      vid.className = 'rewind-video';
      vid.src = 'rewind.mp4';
      vid.playsInline = true;
      vid.muted = true;      // avoid audio clash with MP3
      vid.autoplay = true;
      vid.loop = false;
      document.body.appendChild(vid);
      vid.play && vid.play().catch(()=>{});
    }catch(_){}

    try{
      // Overlay with centered banner
      fx = document.createElement('div');
      fx.className = 'vhs-rewind';
      fx.id = 'vhsRewindFx';

      const banner = document.createElement('div');
      banner.className = 'vhs-banner';
      banner.innerHTML = '<span class="icon">⏪</span><span class="label">REWIND</span>';

      fx.appendChild(banner);
      document.body.appendChild(fx);
    }catch(_){}

    try{
      const a = ensureAudio();
      if (a){ a.currentTime = 0; a.play().catch(()=>{}); }
    }catch(_){}

    // Cleanup
    later(()=>{
      try{ fx && fx.remove(); }catch(_){}
      try{ vid && vid.remove(); }catch(_){}
    }, 1100, 'vhs-cleanup');

    // Proceed to restart near the end of the effect
    later(()=>{ try{ next && next(); }catch(_){ } }, 850, 'vhs-next');
  }

  function bind(){
    const btn = document.getElementById('retryYes');
    if (!btn) return;
    btn.onclick = function(){
      if (!armed) return;
      armed = false;
      runVhsThen(function(){
        armed = true;
        try{
          if (window.GameApp && GameApp.session && typeof GameApp.session.retryLevel === 'function') { GameApp.session.retryLevel(); }
          else if (typeof window.retryLevel === 'function') { window.retryLevel(); }
          else if (typeof retryLevel === 'function') { retryLevel(); }
          else { location.reload(); }
        }catch(_){
          try{ location.reload(); }catch(__){}
        }
      });
    };
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bind, { once:true });
  } else {
    bind();
  }
})();

