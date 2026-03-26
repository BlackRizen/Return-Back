window.GameApp && window.GameApp.registerModule && window.GameApp.registerModule('90-shop-and-abilities', {"entryMarker": "// === SOURCE: #ChoiceOverlayHudMirror ===", "description": "Choice overlay HUD mirror, shop rules, invisibility systems, cooldown UI, runner mode."});
/*__MODULE_BOUNDARY__*/
// === SOURCE: #ChoiceOverlayHudMirror ===
(function(){
  // Safe copy from HUD (bottom) to choice overlay
  function copy(fromId, toId){
    try{
      var src = document.getElementById(fromId);
      var dst = document.getElementById(toId);
      if (src && dst) dst.textContent = src.textContent || '0';
    }catch(_){}
  }
  function syncAll(){
    copy('resScrap','choiceResScrap');
    copy('resWood','choiceResWood');
    copy('resCircuits','choiceResCircuits');
  }
  // Observe HUD counters for any changes
  function startObservers(){
    var opts = { characterData: true, childList: true, subtree: true };
    ['resScrap','resWood','resCircuits'].forEach(function(id){
      var el = document.getElementById(id);
      if (!el) return;
      try{
        var ob = new MutationObserver(syncAll);
        ob.observe(el, opts);
      }catch(_){}
    });
  }
  // Retry finder in case HUD elements mount after game boot
  var retries = 0, maxRetries = 80; // ~20s at 250ms
  var poll = setInterval(function(){
    var ok = document.getElementById('resScrap') && document.getElementById('resWood') && document.getElementById('resCircuits');
    if (ok || retries++ > maxRetries){
      clearInterval(poll);
      syncAll();
      startObservers();
    }
  }, 250);

  // Also resync when the overlay is shown
  var bodyObs;
  try{
    bodyObs = new MutationObserver(function(muts){
      for (var i=0;i<muts.length;i++){
        if (muts[i].attributeName === 'class' && document.body.classList.contains('choice-open')){
          syncAll();
        }
      }
    });
    bodyObs.observe(document.body, { attributes:true });
  }catch(_){}

  // Initial sync
  if (document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', syncAll);
  } else {
    syncAll();
  }
})();

// === SOURCE: #ChoiceBuyRules_Sound ===
(function(){
  try{
    if (typeof Sounds !== 'undefined' && !Sounds.error){
      Sounds.error = new Audio('error.mp3');
    }
  }catch(_){}
})();

// === SOURCE: #SquelchNonErrorSFX ===
(function(){
  window.__squelchSFXExceptError = function(ms){
    try{
      if (typeof Sounds === 'undefined') return;
      var toRestore = [];
      for (var k in Sounds){
        try{
          var a = Sounds[k];
          if (!(a instanceof Audio)) continue;
          if (k === 'error') continue;
          toRestore.push([a, a.volume]);
          a.volume = 0.0;
        }catch(_){}
      }
      setTimeout(function(){
        try{ toRestore.forEach(function(p){ p[0].volume = p[1]; }); }catch(_){}
      }, ms||700);
    }catch(_){}
  };
})();
// === Invisibility ability ===
function canInvis(){
  try {
    return !window.controlsLocked && !window.paused &&
           window.player && window.player.state!=='dead' && window.player.state!=='predead' &&
           !window.player.isInvisible && (window.player.invisCD||0)<=0;
  } catch(e){ return false; }
}
function activateTelekinesis(){
  
  // Cooldown guard: play error if pressed during cooldown
  try {
    if (player && (player.telekCD||0) > 0) {
      try {
        if (typeof playSound==='function' && typeof Sounds!=='undefined') playSound(Sounds.error || new Audio('error.mp3'));
        else new Audio('error.mp3').play();
      } catch(_){ try{ new Audio('error.mp3').play(); }catch(_e){} }
      return;
    }
  } catch(_){}

  try{
    if(!player || player.state==='dead' || player.state==='predead') return;
  }catch(_){}

  try{
    telekSide = (player && player.facing === 'left') ? 'left' : 'right';
  }catch(_){}

  // On first telek activation, swap locked icon with tagmanipulation.png
  try{
    if(!telekTabUnlocked){
      telekTabUnlocked = true;
      const tab = document.getElementById('invisAbilityTab');
      if(tab) tab.src = 'tagmanipulation.png';
    }
  }catch(_){}

  player.telekActive = true;
  player.telekTimer = player.telekDuration || 4;
  player.telekCD = player.telekCooldown || 12;

  try{
    // spawn 1 asteroid per activation
    spawnTelekAsteroid();
  }catch(_){}

  try{
    if(telekMindAudio){
      telekMindAudio.pause();
      telekMindAudio.currentTime = 0;
    }
    telekMindAudio = new Audio('mindwave.mp3');
    telekMindAudio.loop = true;
    telekMindAudio.play().catch(()=>{});
  }catch(_){}

  try{
    if (window.invisCooldown && typeof window.invisCooldown.startUnfill === 'function'){
      var activeMs = ((player && player.telekDuration ? player.telekDuration : 4) * 1000) * 0.3;
      window.invisCooldown.startUnfill(activeMs);
    }
  }catch(_){}

  // no wait.mp3 for telekinesis ability

  try{ if (typeof playSfx==='function') playSfx('powerup'); }catch(_){}
}

function activateInvisibility(){
  
  // Cooldown guard: play error if pressed during cooldown
  try {
    if (player && (player.invisCD||0) > 0) {
      try {
        if (typeof playSound==='function' && typeof Sounds!=='undefined') playSound(Sounds.error || new Audio('error.mp3'));
        else new Audio('error.mp3').play();
      } catch(_){ try{ new Audio('error.mp3').play(); }catch(_e){} }
      return;
    }
  } catch(_){}
if(!canInvis()) return;
  player.isInvisible = true;
  player.invisTimer = player.invisDuration;

  try{ playerEl.classList.add('invisible')
; (function(){
  try{
    var p = document.getElementById('player');
    if(p){
      p.classList.remove('decloak-anim');
      void p.offsetWidth;
      p.classList.add('cloak-anim');
      setTimeout(function(){ try{ p.classList.remove('cloak-anim'); }catch(e){} }, 400);
    }
    if (typeof Sounds!=='undefined' && Sounds.inv){
      if (typeof playSound==='function'){ playSound(Sounds.inv); }
      else { Sounds.inv.currentTime = 0; Sounds.inv.play().catch(function(){}); }
    } else { new Audio('inv.mp3').play().catch(function(){}); }
  }catch(e){}
})(); 
;

try{
  if (typeof playSound==='function' && typeof Sounds!=='undefined' && Sounds.wait){
    playSound(Sounds.wait);
  } else if (typeof Sounds!=='undefined' && Sounds.wait){
    Sounds.wait.currentTime = 0;
    Sounds.wait.play().catch(()=>{});
  } else {
    new Audio('wait.mp3').play().catch(()=>{});
  }
}catch(e){}
; }catch(_){}
  try{ if (typeof playSfx==='function') playSfx('powerup'); }catch(_){}

  try{ if(typeof setEnemiesStagger==='function') setEnemiesStagger(1.0); }catch(_){ }
}

function endInvisibility(){
  try{ if(window.enemies){ for(let i=0;i<enemies.length;i++){ const __e=enemies[i]; if(!__e) continue; __e.__patrolInit=false; __e.patrolState=null; __e.patrolPauseT=0; if(__e.qmarkEl){ try{ __e.qmarkEl.remove(); }catch(_){ } __e.qmarkEl=null; } } } }catch(_){ }
if(!player || !player.isInvisible) return;
  player.isInvisible = false;
  player.invisCD = player.invisCooldown;
  try{ playerEl.classList.remove('invisible');
(function(){
  try{
    var p = document.getElementById('player');
    if(p){
      p.classList.remove('cloak-anim');
      void p.offsetWidth;
      p.classList.add('decloak-anim');
      setTimeout(function(){ try{ p.classList.remove('decloak-anim'); }catch(e){} }, 420);
    }
    if (typeof Sounds!=='undefined' && Sounds.inv){
      if (typeof playSound==='function'){ playSound(Sounds.inv); }
      else { Sounds.inv.currentTime = 0; Sounds.inv.play().catch(function(){}); }
    } else { new Audio('inv.mp3').play().catch(function(){}); }
  }catch(e){}
})();/*INJ_DECL*/; }catch(_){}
}
// Freeze enemies briefly and show question mark on their health bars
(function(){
  window.setEnemiesStagger = function(dur){
    try{
      if(!window.enemies) return;
      for(let i=0;i<enemies.length;i++){
        const e = enemies[i]; if(!e || e.dead) continue;
        e.staggerT = Math.max(dur, e.staggerT||0);
        // attach qmark to healthbar immediately
        try{
          if(!e.qmarkEl){ const img=document.createElement('img'); img.src='question.png'; img.alt='?'; img.className='qmark'; e.qmarkEl=img; e.el.appendChild(img); } else if(!e.qmarkEl.isConnected){ e.el.appendChild(e.qmarkEl); }
        }catch(_){}
      }
    }catch(_){}
  };
})();

// === SOURCE: #InvisBuzzV1 ===
(function(){
  if (window.__invisBuzzV2__) return; window.__invisBuzzV2__ = true;

  var VIB_POWER = 6.5;  // displacement multiplier
  var VIB_ROT   = 1.8;  // degrees

  function now(){ try { return performance.now(); } catch(_) { return Date.now(); } }

  function buzz(target, ms){
    if(!target) return;
    try{ if (target.__buzzCancel) target.__buzzCancel(); }catch(_){}

    var start = now();
    var rafId = 0;
    var alive = true;

    try{
      if (navigator && typeof navigator.vibrate === 'function'){
        navigator.vibrate([35, 25, 35, 25, 35]);
      }
    }catch(_){}

    function jitter(){
      if(!alive) return;
      var t = now() - start;
      if (t >= ms){
        try{ target.style.translate = ''; target.style.rotate = ''; }catch(_){}
        alive = false;
        return;
      }
      var decay = 1 - (t / ms);
      var mag = Math.max(0.5, 2.5 * decay) * VIB_POWER;
      var dx = (Math.random()*2 - 1) * mag;
      var dy = (Math.random()*2 - 1) * mag;
      try{
        target.style.translate = dx.toFixed(2) + "px " + dy.toFixed(2) + "px";
        if (VIB_ROT){
          target.style.rotate = ((Math.random()*2 - 1) * VIB_ROT * decay).toFixed(2) + "deg";
        }
      }catch(_){}
      rafId = requestAnimationFrame(jitter);
    }

    target.__buzzCancel = function(){
      alive = false;
      try{ cancelAnimationFrame(rafId); }catch(_){}
      try{ target.style.translate = ''; target.style.rotate = ''; }catch(_){}
      target.__buzzCancel = null;
    };

    jitter();
    setTimeout(function(){ try{ target.__buzzCancel && target.__buzzCancel(); }catch(_){} }, Math.max(60, ms+40));
  }

  function setup(){
    var player = document.getElementById('player');
    if (!player) return;
    var img = document.getElementById('playerImg');
    if (!img){
      try{ img = player.querySelector('img'); }catch(_){ img = null; }
    }

    var lastInvis = player.classList.contains('invisible');

    var reduce = false;
    try { reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch(_){}

    function buzzMaybe(kind){
      if (reduce) return;
      buzz(img || player, kind === 'in' ? 220 : 300);
    }

    try{
      var mo = new MutationObserver(function(muts){
        for (var i=0;i<muts.length;i++){
          var m = muts[i];
          if (m.attributeName !== 'class') continue;
          var nowInvis = player.classList.contains('invisible');
          if (nowInvis !== lastInvis){
            lastInvis = nowInvis;
            buzzMaybe(nowInvis ? 'in' : 'out');
          }
        }
      });
      mo.observe(player, { attributes:true, attributeFilter:['class'] });
    }catch(_){}
  }

  if (document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', setup, { once:true });
  } else {
    setup();
  }
})();

// === SOURCE: #WaitGuardV1 ===
(function(){
  if (window.__waitGuardV1__) return; window.__waitGuardV1__ = true;

  function hasEnemyInLevel(){
    try{
      if (Array.isArray(window.enemies)){
        for (var i=0;i<enemies.length;i++){
          var e = enemies[i];
          if (e && !e.dead && !e.despawned) return true;
        }
      }
    }catch(_){}
    try{
      var layer = document.querySelector('.enemies');
      if (layer && layer.querySelector('.enemy')) return true;
    }catch(_){}
    return false;
  }

  function isWaitAudio(a){
    try{
      if (a && window.Sounds && a === Sounds.wait) return true;
      var src = (a && (a.currentSrc || a.src)) || '';
      return /(^|\/)wait\.mp3(\?|#|$)/i.test(src);
    }catch(_){ return false; }
  }

  function patchPlaySound(){
    try{
      if (typeof window.playSound === 'function' && !window.playSound.__waitGuardPatched){
        var orig = window.playSound;
        window.playSound = function(audio){
          try{
            if (!hasEnemyInLevel() && isWaitAudio(audio)) return;
          }catch(_){}
          return orig.apply(this, arguments);
        };
        window.playSound.__waitGuardPatched = true;
      }
    }catch(_){}
  }

  function patchSoundsWait(){
    try{
      if (window.Sounds && Sounds.wait && !Sounds.wait.__waitGuardPatched){
        var a = Sounds.wait;
        var orig = a.play && a.play.bind ? a.play.bind(a) : null;
        if (orig){
          a.play = function(){
            try{ if (!hasEnemyInLevel()) return Promise.resolve(); }catch(_){}
            return orig();
          };
          a.__waitGuardPatched = true;
        }
      }
    }catch(_){}
  }

  function patchAudioPrototype(){
    try{
      var proto = window.HTMLAudioElement && HTMLAudioElement.prototype;
      if (proto && !proto.__waitGuardPatched){
        var orig = proto.play;
        if (typeof orig === 'function'){
          proto.play = function(){
            try{
              if (!hasEnemyInLevel() && isWaitAudio(this)) return Promise.resolve();
            }catch(_){}
            return orig.apply(this, arguments);
          };
          proto.__waitGuardPatched = true;
        }
      }
    }catch(_){}
  }

  function init(){
    patchPlaySound();
    patchSoundsWait();
    patchAudioPrototype();
  }

  if (document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', init, { once:true });
  } else {
    init();
  }
})();

// === SOURCE: #InvisCooldownUIV1 ===
(function(){
  if (window.__InvisCooldownUIV3__) return; window.__InvisCooldownUIV3__ = true;

  var COOLDOWN_MS = 10000;   // 10s cooldown (blue fill)
  var INVIS_ANIM_MS = 5000;  // unfill duration on invis start (yellow)
  var root, arc, CIRC = 125.66;
  var rafId = 0;

  // helpers
  function cancelRaf(){ try{ cancelAnimationFrame(rafId); }catch(_){ } rafId = 0; }
  function setOffset(v){ try{ arc.style.strokeDashoffset = String(v); }catch(_){ } }
  function setState(state){
    if (!root) return;
    root.classList.remove('ready','cooling','active');
    root.classList.add(state);
  }
  function clamp01(x){ return x<0?0:(x>1?1:x); }

  // mapping helpers
  function setFill(p){          // p: 0..1 => empty..full
    setOffset((1 - clamp01(p)) * CIRC);
  }
  function setUnfill(p){        // p: 0..1 => full..empty
    setOffset(clamp01(p) * CIRC);
  }

  // animations
  function animate(duration, step, done){
    cancelRaf();
    var t0 = (performance && performance.now) ? performance.now() : Date.now();
    function tick(){
      var now = (performance && performance.now) ? performance.now() : Date.now();
      var p = clamp01((now - t0) / duration);
      try{ step(p); }catch(_){}
      if (p < 1){
        rafId = requestAnimationFrame(tick);
      } else {
        try{ done && done(); }catch(_){}
      }
    }
    if (duration > 0){ tick(); } else { try{ step(1); done && done(); }catch(_){} }
  }

  function startCooldown(ms){
    setState('cooling');            // blue
    animate(ms|0, function(p){ setFill(p); }, function(){ setState('ready'); setFill(1); });
  }

  function startUnfill(ms){
    setState('active');             // yellow
    // start from full ring
    setFill(1);
    animate(ms|0, function(p){ setUnfill(p); }, function(){ /* stay empty until invis ends */ });
  }

  function setup(){
    root = document.getElementById('invisCooldown');
    arc  = document.getElementById('invisCooldownArc');
    if (!root || !arc) return;

    // initial UI state: ability ready (full yellow)
    setState('ready');
    setFill(1);

    // Observe #player class changes
    var player = document.getElementById('player');
    var lastInvis = !!(player && player.classList.contains('invisible'));

    if (player){
      try{
        var mo = new MutationObserver(function(muts){
          for (var i=0;i<muts.length;i++){
            if (muts[i].attributeName !== 'class') continue;
            var nowInvis = player.classList.contains('invisible');
            if (!lastInvis && nowInvis){
              // invisibility started: unfill yellow
              startUnfill(INVIS_ANIM_MS);
            } else if (lastInvis && !nowInvis){
              // invisibility ended: start blue cooldown fill
              startCooldown(COOLDOWN_MS);
            }
            lastInvis = nowInvis;
          }
        });
        mo.observe(player, { attributes:true, attributeFilter:['class'] });
      }catch(_){}
    }

    // Expose minimal API for manual control if needed
    window.invisCooldown = {
      startCooldown: function(ms){ startCooldown(ms || COOLDOWN_MS); },
      startUnfill: function(ms){ startUnfill(ms || INVIS_ANIM_MS); },
      setReady: function(){ setState('ready'); setFill(1); }
    };
  }

  if (document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', setup, { once:true });
  } else {
    setup();
  }
})();

// === SOURCE: #InvisCooldownDefaults ===
(function(){
  function setDefaults(){
    try{
      if (typeof player !== 'undefined' && player){
        if (!(player.invisCooldown > 0)) player.invisCooldown = 10; // seconds
        // Ensure current CD can't be negative or NaN
        if (!(player.invisCD >= 0)) player.invisCD = 0;
      }
    }catch(_){}
  }
  if (document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', setDefaults, {once:true});
  } else {
    setDefaults();
  }
})();

// === SOURCE: #InvisStrictGate ===
(function(){
  function install(){
    try{
      if (typeof player === 'undefined' || !player) { setTimeout(install, 60); return; }

      // Ensure cooldown default if missing
      if (!(player.invisCooldown > 0)) player.invisCooldown = 10;
      if (!(player.invisCD >= 0)) player.invisCD = 0;

      // Wrap isInvisible with a guard so ANY activation path respects cooldown
      if (!player.__invisGuardInstalled){
        var __isInvisVal = !!player.isInvisible;
        Object.defineProperty(player, 'isInvisible', {
          configurable: true,
          enumerable: true,
          get: function(){ return __isInvisVal; },
          set: function(v){
            try{
              // Block attempts to turn invisibility on while cooldown remains
              if (v === true && (player.invisCD||0) > 0){
                try{
                  if (typeof playSound==='function' && typeof Sounds!=='undefined'){
                    playSound(Sounds.error || new Audio('error.mp3'));
                  } else {
                    new Audio('error.mp3').play().catch(function(){});
                  }
                }catch(_){}
                return __isInvisVal;
              }
            }catch(_){}
            __isInvisVal = !!v;
          }
        });
        player.__invisGuardInstalled = true;
      }
    }catch(_){}
  }
  if (document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', install, { once:true });
  } else {
    install();
  }
})();

// === SOURCE: #RunnerModeScript ===
(function(){
  const BOOST_RING_CIRC = 264;
  const AST_FAST_FRAMES = [
    'asteroid2.png','asteroid3.png','asteroid4.png','asteroid5.png','asteroid6.png'
  ];
  const FAST_ANIM_FRAME_TIME = 0.05;

  /* CONSTANTE PENTRU NOILE MECANICI */
  const CHARGE_TIME_REQ = 0.8; 
  const DECEL_SPEED = 1.5;     

  /* === CSS === */
  const css = `
  #runnerMode{
    position:fixed; inset:0; overflow:hidden; z-index:2; display:none; pointer-events:none;
  }
  #runnerMode.runner-active{ display:block; }

  /* --- SPEED LINES --- */
  .runner-speed-lines {
    position: absolute; inset: -50%; width: 200%; height: 200%;
    left: 50%; top: 50%; transform: translate(-50%, -50%);
    pointer-events: none; z-index: 99; opacity: 0; display: none;
    -webkit-mask-image: radial-gradient(circle at center, transparent 35%, black 70%);
    mask-image: radial-gradient(circle at center, transparent 35%, black 70%);
    mix-blend-mode: screen;
  }
  body.runner-mode-active.speed-high .runner-speed-lines {
    display: block; opacity: 1;
  }
  .runner-speed-lines::before {
    content: ''; position: absolute; inset: 0;
    background: repeating-conic-gradient(from 0deg at 50% 50%, transparent 0deg, transparent 4deg, rgba(255, 255, 255, 0.95) 4.5deg, transparent 5deg, transparent 12deg, rgba(255, 255, 255, 0.85) 12.5deg, transparent 13deg, transparent 18deg);
    animation: animeBurst1 0.3s steps(4) infinite; 
  }
  .runner-speed-lines::after {
    content: ''; position: absolute; inset: 0;
    background: repeating-conic-gradient(from 15deg at 50% 50%, transparent 0deg, transparent 3deg, rgba(255, 255, 255, 0.75) 3.2deg, transparent 3.5deg, transparent 8deg, rgba(255, 255, 255, 0.65) 8.8deg, transparent 9deg, transparent 22deg);
    animation: animeBurst2 0.4s steps(5) infinite reverse; 
  }
  @keyframes animeBurst1 { 0% { transform: translate(0, 0) rotate(0deg) scale(1); } 100% { transform: translate(0, 0) rotate(360deg) scale(1); } }
  @keyframes animeBurst2 { 0% { transform: translate(0, 0) rotate(0deg) scale(1.1); } 100% { transform: translate(0, 0) rotate(-240deg) scale(1.1); } }

  #runnerMode .runner-bg{
    position:absolute; inset:0;
    background-image:url('intro1.png');
    background-position:0 50%; background-repeat:repeat-x; background-size:auto 100%;
    filter:brightness(0.9); z-index:0;
  }
  #runnerMode .runner-world{ position:absolute; inset:0; pointer-events:none; z-index:1; }
  
  #runnerMode .runner-player, #runnerMode .runner-asteroid, #runnerMode .runner-bullet, 
  #runnerMode .runner-explosion, #runnerMode .runner-pickup{
    position:absolute; will-change:transform; pointer-events:none;
  }
  #runnerMode .runner-player img, #runnerMode .runner-asteroid img, #runnerMode .runner-explosion img{
    width:100%; height:100%; display:block;
  }
  
  /* NAVA */
  #runnerMode .runner-player{ overflow:visible; }
  #runnerMode .runner-player img{ position:relative; z-index:2; }
  
  /* === TRAIL PROPULSIE === */
  .runner-ship-trail {
    position: absolute;
    left: -15%; top: 40%;
    transform: translate(-50%, -50%);
    width: 140%; 
    height: 140%;
    z-index: 1; 
    background-repeat: no-repeat;
    background-size: contain; 
    background-position: center;
    mix-blend-mode: screen;
    opacity: 0;
    will-change: opacity;
    animation: boostTrailLoop 0.12s infinite; 
  }
  @keyframes boostTrailLoop {
    0%   { background-image: url('boost1.png'); transform: translate(-50%, -50%) scale(1); }
    50%  { background-image: url('boost2.png'); transform: translate(-50%, -50%) scale(1.05); }
    100% { background-image: url('boost1.png'); transform: translate(-50%, -50%) scale(1); }
  }

  #runnerMode .runner-player.boosting::before,
  #runnerMode .runner-player.boosting::after {
    display: none !important; content: none !important;
  }
  #runnerMode .runner-player.boosting img {
    filter: brightness(1.3) drop-shadow(0 0 10px cyan);
  }

  /* === EFECT ÎNCĂRCARE === */
  #runnerMode .runner-player.charging img {
    animation: chargeShake 0.08s infinite;
    filter: brightness(1.2) contrast(1.2);
  }
  #runnerMode .runner-player.charging::before {
    content: ''; position: absolute; display: block;
    width: 300px; height: 300px; 
    top: 40%; left: 50%; 
    transform: translate(-50%, -50%);
    border-radius: 50%; 
    border: 4px solid rgba(0, 255, 255, 0.8);
    box-shadow: 0 0 15px rgba(0, 255, 255, 0.5);
    opacity: 0; z-index: 1; 
    animation: chargeExpand 0.5s ease-out infinite; 
    pointer-events: none;
  }
  #runnerMode .runner-player.charging::after {
    content: ''; position: absolute; display: block;
    width: 250px; height: 250px;
    top: 40%; left: 50%;
    transform: translate(-50%, -50%);
    border-radius: 50%; 
    background: radial-gradient(circle, rgba(255,255,255,0.9) 0%, rgba(0,255,255,0.3) 50%, transparent 70%);
    mix-blend-mode: screen;
    z-index: 3; 
    animation: chargePulse 0.2s infinite alternate;
    pointer-events: none;
  }
  @keyframes chargeShake {
    0% { transform: translate(0, 0) rotate(0deg); }
    25% { transform: translate(-2px, 2px) rotate(-1deg); }
    75% { transform: translate(2px, -2px) rotate(1deg); }
    100% { transform: translate(0, 0) rotate(0deg); }
  }
  @keyframes chargeExpand {
    0% { transform: translate(-50%, -50%) scale(0.1); opacity: 1; border-width: 8px; }
    100% { transform: translate(-50%, -50%) scale(1.4); opacity: 0; border-width: 0px; }
  }
  @keyframes chargePulse {
    0% { transform: translate(-50%, -50%) scale(0.8); opacity: 0.4; }
    100% { transform: translate(-50%, -50%) scale(1.0); opacity: 0.8; }
  }

  /* === SHAKE === */
  body.launch-shake { animation: strongShakeAnim 0.4s linear forwards; }
  @keyframes strongShakeAnim {
    0% { transform: translate(0, 0); } 10% { transform: translate(-15px, -15px); } 20% { transform: translate(15px, 15px); }
    30% { transform: translate(-15px, 15px); } 40% { transform: translate(15px, -15px); } 50% { transform: translate(-10px, 0px); }
    60% { transform: translate(10px, 0px); } 70% { transform: translate(-5px, 0px); } 100% { transform: translate(0, 0); }
  }
  body.runner-mode-active.boost-shaking:not(.launch-shake) { animation: screenshake 0.25s infinite; }

  /* UI Elements */
  #runnerMode .runner-fuel{
    position:fixed; left:50%; bottom:22px; transform:translateX(-50%);
    z-index:10; pointer-events:none; font-family:system-ui,sans-serif;
  }
  #runnerMode .fuelbar-shell{ position:relative; display:inline-block; width:min(550px, 53vw); height:auto; }
  #runnerMode .fuelbar-img{ display:block; width:100%; height:auto; }
  #runnerMode .fuel-bar-track{
    position:absolute; left:10%; right:10%; top:33.5%; transform:translateY(-50%);
    height:24%; border-radius:0; overflow:hidden;
  }
  #runnerMode .fuel-bar-fill{
    position:absolute; left:0; top:0; bottom:0; width:0%;
    background:linear-gradient(90deg,#22c55e,#eab308,#f97316,#ef4444);
    box-shadow:0 0 12px rgba(248,250,252,0.85); transition:width 0.12s linear;
  }
  #runnerMode .runner-boost{
    position:fixed; left:15px; bottom:15px; width:165px; height:165px; z-index:9; pointer-events:none;
  }
  #runnerMode .boost-shell{ position:relative; width:100%; height:100%; }
  #runnerMode .boost-bg{ position:absolute; inset:0; width:100%; height:100%; display:block; z-index:1; }
  #runnerMode .boost-ring{ position:absolute; inset:9%; width:80%; height:80%; transform:rotate(-90deg); z-index:0; }
  #runnerMode .boost-ring-bg{ fill:none; stroke:rgba(0,0,0,0.45); stroke-width:8; }
  #runnerMode .boost-ring-fill{
    fill:none; stroke:#ef4444; stroke-width:8; stroke-linecap:round;
    stroke-dasharray:${BOOST_RING_CIRC}; stroke-dashoffset:${BOOST_RING_CIRC};
    transition:stroke-dashoffset 0.12s linear;
  }
  #runnerMode .runner-bullet{
    border-radius:999px; background: radial-gradient(circle at 30% 50%, #ffffff 0, #c4f0ff 30%, #7ad0ff 60%, #1c7ed6 100%);
    box-shadow:0 0 12px rgba(118,206,255,0.9);
  }
  /* CSS PENTRU FUEL PICKUP */
  #runnerMode .runner-pickup{
    width:60px; height:60px; border-radius:999px; box-shadow:0 0 16px rgba(96,165,250,0.9); overflow:hidden;
  }
  #runnerMode .runner-pickup img{ width:100%; height:100%; display:block; }
  
  /* ORICE ASTEROID LOVIT SE FACE ROȘU */
  #runnerMode .runner-asteroid.hit img{
    filter:brightness(1.4) saturate(1.4) hue-rotate(-20deg) drop-shadow(0 0 20px rgba(239,68,68,.95));
  }

  body.runner-mode-active #invisCooldown{ display:none !important; }
  body.runner-mode-active #hudDockRight .timer-frame{
    background-image:url('distance.png'); background-size:contain; background-repeat:no-repeat; background-position:center;
    transform:translateX(-20px) scale(1.25);
  }
  body.runner-mode-active #hudDockRight #timer{
    position:absolute !important; top:50% !important; left:72% !important;
    transform:translate(-50%,-52%) !important; margin:0 !important; padding:0 !important;
    color:#ffffff !important; font-weight:800 !important; line-height:1 !important;
    text-shadow:0 0 4px rgba(0,0,0,0.85) !important;
    text-align:center !important; display:flex !important; flex-direction:column !important; align-items:center !important; justify-content:center !important;
  }
  body.runner-mode-active #hudDockRight #timer .km-value{ font-size:0.7em; }
  body.runner-mode-active #hudDockRight #timer .km-unit{ font-size:0.6em; margin-top:2px; letter-spacing:0.16em; }
  `;

  function injectCss(){
    try{
      if(document.getElementById('RunnerModeCSS')) return;
      const style=document.createElement('style');
      style.id='RunnerModeCSS';
      style.textContent=css;
      (document.head || document.documentElement).appendChild(style);
    }catch(_){}
  }
  injectCss();

  function createRoot(){
    let root=document.getElementById('runnerMode');
    if(root) return root;
    root=document.createElement('div');
    root.id='runnerMode';
    root.innerHTML = ''
      + '<div class="runner-bg"></div>'
      + '<div class="runner-speed-lines"></div>'
      + '<div class="runner-world"></div>'
      + '<div class="runner-fuel">'
      +   '<div class="fuelbar-shell">'
      +     '<img class="fuelbar-img" src="fuelbar.png" alt="Fuel bar"/>'
      +     '<div class="fuel-bar-track"><div class="fuel-bar-fill"></div></div>'
      +   '</div>'
      + '</div>'
      + '<div class="runner-boost">'
      +   '<div class="boost-shell">'
      +     '<img class="boost-bg" src="warp.png" alt="Warp Speed"/>'
      +     '<svg class="boost-ring" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet">'
      +       '<circle class="boost-ring-bg" cx="50" cy="50" r="42"></circle>'
      +       '<circle class="boost-ring-fill" cx="50" cy="50" r="42"></circle>'
      +     '</svg>'
      +   '</div>'
      + '</div>';
    document.body.appendChild(root);
    return root;
  }

  const state = {
    active:false, lastTs:0, player:null,
    asteroids:[], bullets:[], explosions:[], pickups:[],
    spawnTimer:0, speedScale:1, fireCooldown:0,
    _controlsInit:false, runnerHealthMax:100, runnerHealth:100, savedHud:null,
    fuelMax:100, fuel:100, fuelDrainPerSec:2.0, fuelBoostMul:3.0,
    distanceMeters:0, distanceSpeedMps:10, nextLevelKm:1.5, distanceBoostMul:3.5,
    bgOffset:0, bgSpeedBase:60, bgBoostMul:13,
    
    boostEnergyMax:100, boostEnergy:100,
    boostDrainPerSec:10, boostRegenPerSec:6, asteroidBoostMul:6,
    
    isCharging: false,
    chargeTimer: 0,
    boostActive: false,
    smoothedBoostFactor: 0,
    
    warpPlaying:false, fireVolume:0
  };

  const EXP_FRAMES = [
    'explosion1.webp','explosion2.webp','explosion3.webp','explosion4.webp','explosion5.webp','explosion6.webp'
  ];
  const EXP_FRAME_TIME = 0.06;

  let sndShoot=null, sndExplosion=null, sndHitShip=null, sndBg=null, sndImpactAsteroid=null, sndPickFuel=null;
  let sndWarp=null, sndFire=null, sndCharge=null, sndPropulsion=null;

  function initRunnerSounds(){
    try{
      sndShoot          = new Audio('shoot.mp3');
      sndExplosion      = new Audio('explosion.mp3');
      sndHitShip        = new Audio('hitship.mp3');
      sndBg             = new Audio('backgroundmuzic.mp3');
      sndImpactAsteroid = new Audio('impactasteroid.mp3');
      sndPickFuel       = new Audio('pickfuel.mp3');
      sndWarp           = new Audio('warp.mp3');
      sndFire           = new Audio('fire.mp3');
      sndCharge         = new Audio('incarcare.mp3');
      sndPropulsion     = new Audio('propulsie.mp3');

      if(sndBg)   sndBg.loop   = true;
      if(sndWarp) sndWarp.loop = true;
      if(sndFire) sndFire.loop = true;
      if(sndCharge) sndCharge.loop = true;

      [sndShoot,sndExplosion,sndHitShip,sndBg,sndImpactAsteroid,sndPickFuel,sndWarp,sndFire,sndCharge,sndPropulsion]
        .forEach(a=>{ if(a) a.volume = 0.9; });

      if(sndFire) sndFire.volume = 0;
    }catch(_){}
  }
  initRunnerSounds();

  function playRunnerSfx(baseAudio){
    try{
      if(!baseAudio) return;
      const n = baseAudio.cloneNode();
      n.volume = baseAudio.volume;
      n.play().catch(()=>{});
    }catch(_){}
  }

  const baseMutedState = {};
  const baseSoundsToMute = ['startBgm','bgm','bossEntrance','shipHold','shipLand','wait'];
  function pauseBaseAudioForRunner(flag){
    try{
      if(!window.Sounds) return;
      baseSoundsToMute.forEach(k=>{
        const a = Sounds[k];
        if(!a) return;
        if(flag){
          if(!(k in baseMutedState)){
            baseMutedState[k] = { paused:a.paused, currentTime:a.currentTime, volume:a.volume };
          }
          try{ a.pause(); }catch(_){}
        }else{
          const st = baseMutedState[k];
          if(!st) return;
          try{
            a.currentTime = st.currentTime;
            a.volume = st.volume;
            if(!st.paused) a.play().catch(()=>{});
          }catch(_){}
          delete baseMutedState[k];
        }
      });
    }catch(_){}
  }

  function rand(min,max){ return min + Math.random()*(max-min); }

  function toggleDisplay(sel, hide){
    try{
      const els = document.querySelectorAll(sel);
      els.forEach(el=>{
        if(hide){
          if(!el.dataset.runnerPrevDisplay){
            el.dataset.runnerPrevDisplay = el.style.display || '';
          }
          el.style.display = 'none';
        }else if(Object.prototype.hasOwnProperty.call(el.dataset,'runnerPrevDisplay')){
          el.style.display = el.dataset.runnerPrevDisplay;
          delete el.dataset.runnerPrevDisplay;
        }
      });
    }catch(_){}
  }

  function hideBaseForRunner(hide){
    const selectors = [
      '.sky','.sky2','.mothership','.cloud-layer.back','.cloud-layer.front',
      '#player','#enemies','#projectiles','#enemyProjectiles','#coins','#particles','#objective',
      '#hudDockBottom','#pause','.power-ring',"img[src*='inv1.png']","img[src*='locked.png']",
      '#holdHud','.hold-hud','#holdBar','.hold-bar','.hold-progress','#holdProgress',
      '.powerHud','#powerHud','.power-ui','.power-bar','.charge-bar','.chargeHud'
    ];
    selectors.forEach(sel=> toggleDisplay(sel, hide));
  }

  function captureHud(){
    const res = {};
    try{
      const hpEl=document.getElementById('hp');
      const hpTextEl=document.getElementById('hpText');
      const timerEl=document.getElementById('timer');
      if(hpEl)      res.hpWidth  = hpEl.style.width;
      if(hpTextEl)  res.hpText   = hpTextEl.textContent;
      if(timerEl)   res.timerTxt = timerEl.textContent;
    }catch(_){}
    return res;
  }

  function restoreHud(){
    const s = state.savedHud || {};
    try{
      const hpEl=document.getElementById('hp');
      const hpTextEl=document.getElementById('hpText');
      const timerEl=document.getElementById('timer');
      if(hpEl && s.hpWidth!=null)    hpEl.style.width      = s.hpWidth;
      if(hpTextEl && s.hpText!=null) hpTextEl.textContent = s.hpText;
      if(timerEl && s.timerTxt!=null)timerEl.textContent  = s.timerTxt;
    }catch(_){}
  }

  function updateRunnerHealthUi(){
    try{
      const hpEl=document.getElementById('hp');
      const hpTextEl=document.getElementById('hpText');
      if(!hpEl || !hpTextEl) return;
      const pct = Math.max(0, Math.min(100, state.runnerHealth));
      hpEl.style.width = pct + '%';
      hpTextEl.textContent = Math.round(pct) + '%';
    }catch(_){}
  }

  let timerFrameOriginalSrc = null;

  function setTimerFrameForRunner(active){
    try{
      const img = document.querySelector('#hudDockRight .timerHud .timer-frame');
      if(!img) return;
      if(active){
        if(timerFrameOriginalSrc === null){
          timerFrameOriginalSrc = img.getAttribute('src') || img.src;
        }
        img.src = 'distance.png';
      }else if(timerFrameOriginalSrc){
        img.src = timerFrameOriginalSrc;
      }
    }catch(_){}
  }

  function updateDistanceHud(){
    try{
      const timerEl=document.getElementById('timer');
      if(!timerEl) return;
      const km = state.distanceMeters / 1000;
      timerEl.innerHTML =
        '<span class="km-value">' + km.toFixed(1) + '</span>' +
        '<span class="km-unit">KM</span>';
    }catch(_){}
  }

  function resetRunnerDistance(){
    state.distanceMeters = 0;
    state.nextLevelKm = 1.5;
    updateDistanceHud();
  }

  function bumpLevelFromRunner(){
    try{
      if(typeof currentLevel!=='undefined'){
        currentLevel += 1;
      }else if(typeof window!=='undefined' && typeof window.currentLevel!=='undefined'){
        window.currentLevel += 1;
      }
    }catch(_){}
  }

  function updateRunnerDistance(dt){
    if(!state.active) return;
    const mul = 1 + (state.distanceBoostMul - 1) * state.smoothedBoostFactor;
    state.distanceMeters += state.distanceSpeedMps * dt * mul;
    if(state.distanceMeters < 0) state.distanceMeters = 0;

    const km = state.distanceMeters / 1000;
    while(km >= state.nextLevelKm){
      state.nextLevelKm += 1.5;
      bumpLevelFromRunner();
    }
    updateDistanceHud();
  }

  function updateFuelUi(){
    try{
      const root=document.getElementById('runnerMode');
      if(!root) return;
      const fill=root.querySelector('.fuel-bar-fill');
      if(!fill) return;
      const pct = Math.max(0, Math.min(100, state.fuel));
      fill.style.width = pct + '%';
    }catch(_){}
  }

  function resetFuel(){
    state.fuel = state.fuelMax;
    updateFuelUi();
  }

  function increaseFuel(amount){
    state.fuel = Math.min(state.fuelMax, state.fuel + amount);
    updateFuelUi();
  }

  function updateFuel(dt){
    if(!state.active) return;
    const mul = 1 + (state.fuelBoostMul - 1) * state.smoothedBoostFactor;
    state.fuel -= state.fuelDrainPerSec * mul * dt;
    if(state.fuel < 0) state.fuel = 0;
    updateFuelUi();
    if(state.fuel <= 0){
      stopRunnerMode();
    }
  }

  function pauseBaseGame(flag){
    try{ if(typeof setPaused==='function') setPaused(!!flag); }catch(_){}
    try{ if(typeof controlsLocked!=='undefined') controlsLocked = !!flag; }catch(_){}
  }

  function setupRunnerBgLoop(){
    try{
      state.bgOffset = 0;
      const root = document.getElementById('runnerMode');
      if(!root) return;
      const bg = root.querySelector('.runner-bg');
      if(bg) bg.style.backgroundPosition = '0px 50%';
    }catch(_){}
  }

  function updateBackground(dt){
    try{
      const root = document.getElementById('runnerMode');
      if(!root) return;
      const bg = root.querySelector('.runner-bg');
      if(!bg) return;
      const currentBoostMul = 1 + (state.bgBoostMul - 1) * state.smoothedBoostFactor;
      const speed = state.bgSpeedBase * currentBoostMul;
      state.bgOffset -= speed * dt;
      bg.style.backgroundPosition = state.bgOffset + 'px 50%';
    }catch(_){}
  }

  function updateBoostUi(){
    try{
      const root=document.getElementById('runnerMode');
      if(!root) return;
      const ring=root.querySelector('.boost-ring-fill');
      if(!ring) return;
      const pct = Math.max(0, Math.min(1, state.boostEnergy / state.boostEnergyMax));
      const offset = BOOST_RING_CIRC * (1 - pct);
      ring.style.strokeDashoffset = offset.toFixed(1);
    }catch(_){}
  }

  /* --- LOGICA BOOST + SHAKE --- */
  function updateBoost(dt){
    const hasFuel = state.boostEnergy > 0;
    if (input.boost && hasFuel) {
      if (!state.boostActive) {
        state.chargeTimer += dt;
        if (state.chargeTimer < CHARGE_TIME_REQ) {
           state.isCharging = true;
           state.boostActive = false;
        } else {
           if (!state.boostActive) {
             state.boostActive = true;
             if(sndPropulsion){
               sndPropulsion.currentTime = 0;
               sndPropulsion.play().catch(()=>{});
             }
             try {
                document.body.classList.remove('launch-shake');
                void document.body.offsetWidth; 
                document.body.classList.add('launch-shake');
                setTimeout(() => {
                    document.body.classList.remove('launch-shake');
                }, 400);
             } catch(e){}
           }
           state.isCharging = false;
        }
      } else {
        state.isCharging = false;
        state.boostActive = true;
      }
    } else {
      state.chargeTimer = 0;
      state.isCharging = false;
      state.boostActive = false;
    }

    if(state.boostActive){
      state.boostEnergy -= state.boostDrainPerSec * dt;
      if(state.boostEnergy <= 0){
        state.boostEnergy = 0;
        state.boostActive = false;
      }
    } else {
      if(!state.isCharging) {
        state.boostEnergy += state.boostRegenPerSec * dt;
        if(state.boostEnergy > state.boostEnergyMax){
          state.boostEnergy = state.boostEnergyMax;
        }
      }
    }

    const targetFactor = state.boostActive ? 1.0 : 0.0;
    const lerpSpeed = (targetFactor > state.smoothedBoostFactor) ? 8.0 : DECEL_SPEED;
    state.smoothedBoostFactor += (targetFactor - state.smoothedBoostFactor) * lerpSpeed * dt;
    if(state.smoothedBoostFactor < 0.01) state.smoothedBoostFactor = 0;
    if(state.smoothedBoostFactor > 0.99) state.smoothedBoostFactor = 1;

    const body = document.body || document.documentElement;
    const root = document.getElementById('runnerMode');
    const ship = root ? root.querySelector('.runner-player') : null;

    if(body){
       if(state.smoothedBoostFactor > 0.4) body.classList.add('speed-high');
       else body.classList.remove('speed-high');
       if(state.boostActive) body.classList.add('boost-shaking');
       else body.classList.remove('boost-shaking');
    }

    if(ship){
      if(state.isCharging) ship.classList.add('charging');
      else ship.classList.remove('charging');
      if(state.boostActive) ship.classList.add('boosting');
      else ship.classList.remove('boosting');
      const trail = ship.querySelector('.runner-ship-trail');
      if(trail) {
         trail.style.opacity = Math.pow(state.smoothedBoostFactor, 4);
      }
    }

    if(state.isCharging){
      if(sndCharge && sndCharge.paused){
         sndCharge.currentTime = 0;
         sndCharge.play().catch(()=>{});
      }
    } else {
      if(sndCharge && !sndCharge.paused){
        sndCharge.pause();
        sndCharge.currentTime = 0;
      }
    }

    if(state.boostActive){
      if(sndWarp && !state.warpPlaying){
        state.warpPlaying = true;
        sndWarp.currentTime = 0;
        sndWarp.play().catch(()=>{});
      }
    }else{
      if(sndWarp && state.warpPlaying){
        state.warpPlaying = false;
        sndWarp.pause();
        sndWarp.currentTime = 0;
      }
    }

    updateBoostUi();
  }

  function updateFastFireSound(dt, fastCount){
    try{
      if(!sndFire) return;
      const targetVol = fastCount > 0 ? 0.9 : 0.0;
      const upRate   = 2.5;
      const downRate = 2.5;

      if(state.fireVolume < targetVol){
        state.fireVolume = Math.min(targetVol, state.fireVolume + upRate * dt);
      }else if(state.fireVolume > targetVol){
        state.fireVolume = Math.max(targetVol, state.fireVolume - downRate * dt);
      }
      sndFire.volume = state.fireVolume;
      if(state.fireVolume > 0 && sndFire.paused){
        sndFire.currentTime = 0;
        sndFire.play().catch(()=>{});
      }
      if(state.fireVolume <= 0 && !sndFire.paused){
        sndFire.pause();
        sndFire.currentTime = 0;
      }
    }catch(_){}
  }

  function startRunnerMode(){
    if(state.active) return;
    const root = createRoot();
    root.classList.add('runner-active');
    try{ document.body.classList.add('runner-mode-active'); }catch(_){}

    setupRunnerBgLoop();

    state.savedHud = captureHud();
    hideBaseForRunner(true);
    pauseBaseGame(true);
    pauseBaseAudioForRunner(true);

    setTimerFrameForRunner(true);
    resetRunnerDistance();

    if(sndBg){
      try{ sndBg.currentTime = 0; sndBg.play().catch(()=>{}); }catch(_){}
    }

    const world = root.querySelector('.runner-world');
    world.innerHTML='';

    const W = window.innerWidth || 1280;
    const H = window.innerHeight || 720;

    const pW = Math.round(Math.min(260, W*0.20));
    const pH = Math.round(pW*0.7);
    const pEl = document.createElement('div');
    pEl.className = 'runner-player';
    
    const trailEl = document.createElement('div');
    trailEl.className = 'runner-ship-trail';
    pEl.appendChild(trailEl);

    const pImg = document.createElement('img');
    pImg.src = 'spaceship.webp';
    pImg.alt = 'Ship';
    pEl.appendChild(pImg);
    
    world.appendChild(pEl);

    state.player = {
      x: Math.round(W*0.18),
      y: Math.round(H*0.5 - pH*0.5),
      w:pW, h:pH, vx: 0, vy: 0,
      maxSpeed: Math.max(420, W*0.45),
      accel: Math.max(900, W*0.7),
      friction: 4.5
    };

    state.asteroids = [];
    state.bullets = [];
    state.explosions = [];
    state.pickups = [];
    state.lastTs = performance.now();
    state.spawnTimer = 2.3;
    state.fireCooldown = 0;
    state.speedScale = 1;

    state.runnerHealth = state.runnerHealthMax;
    updateRunnerHealthUi();
    resetFuel();

    state.boostEnergy = state.boostEnergyMax;
    state.boostActive = false;
    state.isCharging = false;
    state.chargeTimer = 0;
    state.smoothedBoostFactor = 0;
    updateBoostUi();

    state.fireVolume = 0;
    if(sndFire){ try{ sndFire.volume = 0; sndFire.pause(); sndFire.currentTime = 0; }catch(_){} }
    if(sndCharge){ try{ sndCharge.pause(); sndCharge.currentTime = 0; }catch(_){} }
    if(sndPropulsion){ try{ sndPropulsion.pause(); sndPropulsion.currentTime = 0; }catch(_){} }

    if(!state._controlsInit){
      state._controlsInit = true;
      window.addEventListener('keydown', runnerKeyDown, true);
      window.addEventListener('keyup', runnerKeyUp, true);
    }

    updatePlayerDom();
    state.active = true;
    requestAnimationFrame(runnerLoop);
  }

  function stopRunnerMode(){
    if(!state.active) return;
    state.active=false;

    const root = document.getElementById('runnerMode');
    if(root) root.classList.remove('runner-active');
    try{
      document.body.classList.remove('runner-mode-active');
      document.body.classList.remove('boost-shaking');
      document.body.classList.remove('speed-high');
      document.body.classList.remove('launch-shake');
    }catch(_){}

    if(sndBg){ try{ sndBg.pause(); }catch(_){} }
    if(sndWarp){ try{ sndWarp.pause(); sndWarp.currentTime = 0; }catch(_){} }
    if(sndCharge){ try{ sndCharge.pause(); sndCharge.currentTime = 0; }catch(_){} }
    if(sndPropulsion){ try{ sndPropulsion.pause(); sndPropulsion.currentTime = 0; }catch(_){} }
    state.warpPlaying = false;

    if(sndFire){ try{ sndFire.pause(); sndFire.currentTime = 0; }catch(_){} }
    state.fireVolume = 0;

    setTimerFrameForRunner(false);
    hideBaseForRunner(false);
    restoreHud();
    pauseBaseAudioForRunner(false);
    pauseBaseGame(false);
  }

  const input = {up:false,down:false,left:false,right:false,shoot:false,boost:false};

  function runnerKeyDown(e){
    if(!state.active) return;
    let handled = false;
    switch(e.code){
      case 'KeyW': case 'ArrowUp': input.up = true; handled=true; break;
      case 'KeyS': case 'ArrowDown': input.down = true; handled=true; break;
      case 'KeyA': case 'ArrowLeft': input.left = true; handled=true; break;
      case 'KeyD': case 'ArrowRight': input.right = true; handled=true; break;
      case 'Space': input.shoot = true; handled=true; break;
      case 'ShiftLeft': case 'ShiftRight': input.boost = true; handled=true; break;
      case 'KeyR': stopRunnerMode(); handled=true; break;
    }
    if(handled){ e.preventDefault(); e.stopPropagation(); }
  }

  function runnerKeyUp(e){
    if(!state.active) return;
    let handled=false;
    switch(e.code){
      case 'KeyW': case 'ArrowUp': input.up = false; handled=true; break;
      case 'KeyS': case 'ArrowDown': input.down = false; handled=true; break;
      case 'KeyA': case 'ArrowLeft': input.left = false; handled=true; break;
      case 'KeyD': case 'ArrowRight': input.right = false; handled=true; break;
      case 'ShiftLeft': case 'ShiftRight': input.boost = false; handled=true; break;
    }
    if(handled){ e.preventDefault(); e.stopPropagation(); }
  }

  function updatePlayer(dt){
    const p = state.player;
    if(!p) return;

    const ax = (input.right ? 1 : 0) - (input.left ? 1 : 0);
    const ay = (input.down ? 1 : 0) - (input.up ? 1 : 0);

    const accel = p.accel;
    p.vx += ax * accel * dt;
    p.vy += ay * accel * dt;

    const max = p.maxSpeed;
    if(p.vx >  max)       p.vx =  max;
    if(p.vx < -max * 0.4) p.vx = -max * 0.4;
    if(p.vy >  max)       p.vy =  max;
    if(p.vy < -max)       p.vy = -max;

    if(ax === 0){ p.vx -= p.vx * Math.min(1, p.friction * dt); }
    if(ay === 0){ p.vy -= p.vy * Math.min(1, p.friction * dt); }

    p.x += p.vx * dt;
    p.y += p.vy * dt;

    const W = window.innerWidth || 1280;
    const H = window.innerHeight || 720;
    const margin = 20;

    if(p.x < margin) p.x = margin;
    if(p.y < margin) p.y = margin;
    if(p.x + p.w > W - margin) p.x = W - margin - p.w;
    if(p.y + p.h > H - margin) p.y = H - margin - p.h;
  }

  function updatePlayerDom(){
    const p = state.player;
    if(!p) return;
    const root=document.getElementById('runnerMode');
    if(!root) return;
    const el=root.querySelector('.runner-player');
    if(!el) return;
    el.style.width  = p.w + 'px';
    el.style.height = p.h + 'px';
    el.style.transform = 'translate(' + Math.round(p.x) + 'px,' + Math.round(p.y) + 'px)';
  }

  function getPlayerHitbox(){
    const p = state.player;
    if(!p) return null;
    const marginX = p.w * 0.2;
    const marginY = p.h * 0.2;
    return {
      x: p.x + marginX,
      y: p.y + marginY,
      w: p.w - 2*marginX,
      h: p.h - 2*marginY
    };
  }

  function spawnAsteroid(){
    const root=document.getElementById('runnerMode');
    if(!root) return;
    const world=root.querySelector('.runner-world');
    const W = window.innerWidth || 1280;
    const H = window.innerHeight || 720;

    const isBig = Math.random() < 0.22;
    let isFast = false;
    if(!isBig && Math.random() < 0.07) isFast = true;

    const smallMin = Math.max(45, H*0.06);
    const smallMax = Math.max(90, H*0.10);
    const bigMin   = Math.max(90, H*0.11);
    const bigMax   = Math.max(150, H*0.16);

    let size;
    if(isBig){
      size = Math.round(rand(bigMin, bigMax));
    }else{
      size = Math.round(rand(smallMin, smallMax));
    }

    // === MODIFICARE: PROPORTIE CORECTA PENTRU ASTEROID RAPID ===
    // Daca este rapid, ii dam o lățime mai mare (1.7x) pentru a nu fi turtit
    // dar înălțimea rămâne 'size'.
    let finalW = size;
    let finalH = size;
    let hp = 1;

    const scaleFast = 4;
    if(isFast){
       // Marim dimensiunea generala
       let baseSize = Math.round(size * scaleFast);
       // Ajustăm proporția: Lățime mai mare ca înălțime (1.7 : 1)
       finalW = Math.round(baseSize * 1.7);
       finalH = baseSize;
       hp = 3;
    } else if (isBig){
       hp = 2;
    }
    
    // ===========================================================

    const x = W + finalW + rand(0, W*0.4);
    const y = rand(80, H - 80 - finalH);

    const el = document.createElement('div');
    el.className='runner-asteroid';
    if(isBig)  el.classList.add('big');
    if(isFast) el.classList.add('fast');

    const img = document.createElement('img');
    if(isFast) img.src = AST_FAST_FRAMES[0];
    else       img.src = 'asteroid.png';
    img.alt='Asteroid';

    el.appendChild(img);
    world.appendChild(el);

    let baseSpeed;
    if(isFast) baseSpeed = 280;
    else if(isBig) baseSpeed = 150;
    else baseSpeed = 190;

    let vx;
    if(isFast) vx = -(baseSpeed + Math.random()*80);
    else       vx = -(baseSpeed + Math.random()*60);
    const vy = 0;

    const a = {
      x:x, y:y, 
      w:finalW, h:finalH, // Folosim dimensiunile calculate
      vx:vx, vy:vy, 
      hp:hp, maxHp:hp,
      big:isBig, fast:isFast, hitFlash:0, el:el, imgEl:img,
      animFrameIndex:0, animTimer:FAST_ANIM_FRAME_TIME
    };
    state.asteroids.push(a);
  }

  function getAsteroidDamage(a){
    try{ if(a && a.big) return 20; return 10; }catch(_){} return 10;
  }

  function handlePlayerAsteroidHit(a){
    spawnExplosion(a.x + a.w*0.5, a.y + a.h*0.5, a.w*1.2);
    if(a.el) a.el.remove();
    flashHit();
    playRunnerSfx(sndHitShip);
    state.runnerHealth = Math.max(0, state.runnerHealth - getAsteroidDamage(a));
    updateRunnerHealthUi();
    if(state.runnerHealth <= 0){
      stopRunnerMode();
      try{ if(typeof doDeath==='function') doDeath(); }catch(_){}
      return true;
    }
    return false;
  }

  function updateAsteroids(dt){
    const pHit = getPlayerHitbox();
    const W = window.innerWidth || 1280;
    const H = window.innerHeight || 720;
    const keep = [];
    const speedMul = 1 + (state.asteroidBoostMul - 1) * state.smoothedBoostFactor;
    let fastCount = 0;

    for(const a of state.asteroids){
      a.x += a.vx * dt * speedMul;
      a.y += a.vy * dt;

      if(a.fast) fastCount++;

      if(a.fast && a.imgEl){
        a.animTimer -= dt;
        if(a.animTimer <= 0){
          a.animTimer += FAST_ANIM_FRAME_TIME;
          a.animFrameIndex = (a.animFrameIndex + 1) % AST_FAST_FRAMES.length;
          a.imgEl.src = AST_FAST_FRAMES[a.animFrameIndex];
        }
      }

      if(a.hitFlash > 0){
        a.hitFlash -= dt;
        if(a.hitFlash <= 0 && a.el) a.el.classList.remove('hit');
      }

      if(a.el){
        a.el.style.width  = a.w + 'px';
        a.el.style.height = a.h + 'px';
        a.el.style.transform = 'translate(' + Math.round(a.x) + 'px,' + Math.round(a.y) + 'px)';
      }

      if(pHit && rectOverlap(a, pHit)){
        const ended = handlePlayerAsteroidHit(a);
        if(ended) return;
        continue;
      }

      if(a.x + a.w < -80 || a.y > H + 120 || a.y + a.h < -120){
        if(a.el) a.el.remove();
      } else {
        keep.push(a);
      }
    }
    state.asteroids = keep;
    updateFastFireSound(dt, fastCount);
  }

  function maybeSpawnFuelPickup(cx, cy){
    if(Math.random() < 0.35) spawnFuelPickup(cx, cy);
  }

  function spawnFuelPickup(cx, cy){
    const root=document.getElementById('runnerMode');
    if(!root) return;
    const world=root.querySelector('.runner-world');
    const size = 60;
    const x = cx - size/2;
    const y = cy - size/2;
    const el=document.createElement('div');
    el.className='runner-pickup';
    const img=document.createElement('img');
    img.src='fuel.png';
    img.alt='Fuel';
    el.appendChild(img);
    world.appendChild(el);
    const p = { x:x, y:y, w:size, h:size, vy:80, el:el };
    state.pickups.push(p);
  }

  function updatePickups(dt){
    const pHit = getPlayerHitbox();
    const H = window.innerHeight || 720;
    const keep=[];
    for(const pk of state.pickups){
      pk.y += pk.vy * dt;
      if(pk.el){
        pk.el.style.transform = 'translate(' + Math.round(pk.x) + 'px,' + Math.round(pk.y) + 'px)';
      }

      let collected=false;
      if(pHit && rectOverlap(pk, pHit)){
        collected=true;
        increaseFuel(20);
        const ship = state.player;
        const pos = ship ? { x:ship.x + ship.w/2, y:ship.y } : {x:pk.x, y:pk.y};
        awardScore(5, pos);
        playRunnerSfx(sndPickFuel);
      }

      if(collected || pk.y > H + 60){
        if(pk.el) pk.el.remove();
      }else{
        keep.push(pk);
      }
    }
    state.pickups = keep;
  }

  function tryShoot(){
    if(!state.player) return;
    if(state.fireCooldown > 0) return;
    const p = state.player;
    const root=document.getElementById('runnerMode');
    if(!root) return;
    const world=root.querySelector('.runner-world');

    const bW = 30;
    const bH = 10;
    const el=document.createElement('div');
    el.className='runner-bullet';
    world.appendChild(el);

    const b = {
      x: p.x + p.w - 6,
      y: p.y + p.h * 0.5 - bH * 0.5,
      w: bW, h: bH, vx: 900, el: el
    };
    state.bullets.push(b);
    state.fireCooldown = 0.22;

    playRunnerSfx(sndShoot);
  }

  function awardScore(delta, pos){
    try{
      if(typeof addScore==='function') addScore(delta, pos);
      else if(typeof showPoints==='function') showPoints(delta, pos);
    }catch(_){}
  }

  function updateBullets(dt){
    const W = window.innerWidth || 1280;
    const keep=[];
    for(const b of state.bullets){
      b.x += b.vx * dt;
      if(b.el){
        b.el.style.width  = b.w + 'px';
        b.el.style.height = b.h + 'px';
        b.el.style.transform = 'translate(' + Math.round(b.x) + 'px,' + Math.round(b.y) + 'px)';
      }

      let hitIndex = -1;
      for(let i=0;i<state.asteroids.length;i++){
        const a = state.asteroids[i];
        if(rectOverlap(a, b)){ hitIndex = i; break; }
      }

      if(hitIndex >= 0){
        const a = state.asteroids[hitIndex];
        playRunnerSfx(sndImpactAsteroid);

        if(a.hp > 1){
          a.hp--; a.hitFlash = 0.15;
          if(a.el) a.el.classList.add('hit');
          if(b.el) b.el.remove();
          continue;
        }

        if(a && a.el) a.el.remove();
        state.asteroids.splice(hitIndex, 1);
        if(b.el) b.el.remove();

        const cx = a.x + a.w*0.5;
        const cy = a.y + a.h*0.5;
        spawnExplosion(cx, cy, a.w*1.2);
        
        // === SHAKE LA EXPLOZIE ===
        flashHit(); 
        
        maybeSpawnFuelPickup(cx, cy);
        
        let points = 10;
        if(a.fast) points = 30; else if(a.big) points = 20;
        awardScore(points, {x:cx, y:cy});

        continue;
      }

      if(b.x > W + 80){
        if(b.el) b.el.remove();
      } else {
        keep.push(b);
      }
    }
    state.bullets = keep;
  }

  function spawnExplosion(cx, cy, size){
    const root=document.getElementById('runnerMode');
    if(!root) return;
    const world=root.querySelector('.runner-world');
    if(!world) return;

    const s = size || 160;
    const x = cx - s*0.5;
    const y = cy - s*0.5;

    const el = document.createElement('div');
    el.className = 'runner-explosion';
    const img = document.createElement('img');
    img.src = EXP_FRAMES[0];
    img.alt = 'Explosion';
    el.appendChild(img);
    world.appendChild(el);

    el.style.width  = s + 'px';
    el.style.height = s + 'px';
    el.style.transform = 'translate(' + Math.round(x) + 'px,' + Math.round(y) + 'px)';

    state.explosions.push({
      x:x, y:y, size:s, frame:0, frameTime:EXP_FRAME_TIME,
      el:el, img:img
    });

    playRunnerSfx(sndExplosion);
  }

  function updateExplosions(dt){
    const keep=[];
    for(const ex of state.explosions){
      ex.frameTime -= dt;
      if(ex.frameTime <= 0){
        ex.frameTime += EXP_FRAME_TIME;
        ex.frame++;
        if(ex.frame >= EXP_FRAMES.length){
          if(ex.el) ex.el.remove();
          continue;
        }
        if(ex.img) ex.img.src = EXP_FRAMES[ex.frame];
      }
      keep.push(ex);
    }
    state.explosions = keep;
  }

  function flashHit(){
    try{
      const overlay=document.getElementById('redFlicker');
      if(overlay){
        overlay.classList.remove('show');
        void overlay.offsetWidth;
        overlay.classList.add('show');
      }
      const root = document.body || document.documentElement;
      if(root){
        root.classList.add('shake');
        setTimeout(()=>{ root.classList.remove('shake'); }, 1000);
      }
    }catch(_){}
  }

  function rectOverlap(a,b){
    return !(a.x + a.w < b.x || a.x > b.x + b.w || a.y + a.h < b.y || a.y > b.y + b.h);
  }

  function runnerLoop(ts){
    if(!state.active) return;
    const dt = Math.min(0.05, (ts - state.lastTs) / 1000);
    state.lastTs = ts;

    updateBoost(dt);        if(!state.active) return;
    updateBackground(dt);

    updatePlayer(dt);
    updatePlayerDom();

    state.speedScale += dt * 0.05;

    state.spawnTimer -= dt;
    if(state.spawnTimer <= 0){
      spawnAsteroid();
      const base = 1.6;
      const min  = 0.5;
      const t    = Math.max(min, base - 0.14 * Math.log(1 + state.speedScale));
      state.spawnTimer = rand(t * 0.7, t * 1.3);
    }

    if(input.shoot) tryShoot();
    state.fireCooldown -= dt;
    if(state.fireCooldown < 0) state.fireCooldown = 0;
    input.shoot = false;

    updateAsteroids(dt);       if(!state.active) return;
    updateBullets(dt);         if(!state.active) return;
    updateExplosions(dt);      if(!state.active) return;
    updatePickups(dt);         if(!state.active) return;
    updateRunnerDistance(dt);  if(!state.active) return;
    updateFuel(dt);

    requestAnimationFrame(runnerLoop);
  }

  window.addEventListener('keydown', function(e){
    if(e.code === 'Digit9' || e.key === '9'){
      if(!state.active){
        e.preventDefault(); e.stopPropagation();
        startRunnerMode();
      }
    }
  }, true);

})();
  