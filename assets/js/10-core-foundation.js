window.GameApp && window.GameApp.registerModule && window.GameApp.registerModule('10-core-foundation', {"entryMarker": "// --- level-based kill target ---", "description": "Core helpers, score/level HUD, boss HUD, shared gameplay scaling."});
/*__MODULE_BOUNDARY__*/
// --- level-based kill target ---

function validateSlideFrames(){
  try{
    const sides=['left','right'];
    for(const side of sides){
      const arr = slideFrames[side];
      let lastGood = (side==='right'? slideImage.right : slideImage.left);
      for(let i=0;i<arr.length;i++){
        const img = new Image();
        img.src = arr[i];
        img.onload = ()=>{};
        img.onerror = ()=>{ arr[i] = lastGood; };
        // optimistic: set lastGood to current if likely valid path string
        if(typeof arr[i]==='string' && arr[i].length>0) lastGood = arr[i];
      }
    }
  }catch(_){}
}
function killTargetForLevel(l){ return (l === 10) ? 1 : 10; }

    
(function setupStartScreenScale(){
  const BASE_W = 1920, BASE_H = 1080;
  function fitStartUI(){
    const s = Math.min(window.innerWidth / BASE_W, window.innerHeight / BASE_H);
    document.documentElement.style.setProperty('--uiScale', String(s));
  }
  window.addEventListener('resize', fitStartUI);
  fitStartUI();
})();

/* ===== Utils ===== */

// Boss bite VFX: show claw image and flash red once
function triggerBossBiteVFX(){
  try{
    const flash = document.getElementById('biteFlash');
    const claw  = document.getElementById('clawOverlay');
    if (flash){ flash.classList.remove('flash'); void flash.offsetWidth; flash.classList.add('flash'); }
    if (claw){ claw.classList.remove('show'); void claw.offsetWidth; claw.classList.add('show'); }
  }catch(_){}
}

// === Small helper: screen shake by toggling .shake on <body> ===
function screenShake(ms=250){
  try{
    const el = document.body || document.documentElement;
    el.classList.remove('shake'); // restart if active
    void el.offsetWidth;          // reflow
    el.classList.add('shake');
    setTimeout(()=>{ try{ el.classList.remove('shake'); }catch(_){ } }, Math.max(60, ms));
  }catch(_){}
}

// === SCORE under level badge (+2 on hit enemy, -3 when player is hit) ===
let score = 0;
function renderScoreBadge(){
  const el = document.getElementById('scoreBadgeTop');
  if(el) el.textContent = 'Score: ' + score;
}
// Floating text uses same font/animation as pickup resources (.bonus-float & pickupRise)
function showPoints(delta, pos){
  try{
    const el = document.createElement('div');
    el.className = 'bonus-float';
    // exact colors requested
    el.style.color = (delta >= 0) ? '#00ff33' : '#ff1a1a';
    // exact labels requested
    el.textContent = (delta >= 0) ? ('+' + delta + ' Points') : ('-' + Math.abs(delta) + ' Point');
    document.body.appendChild(el);
    const x = Math.max(16, Math.min(window.innerWidth-16, (pos && pos.x) ? pos.x : window.innerWidth/2));
    const y = Math.max(16, Math.min(window.innerHeight-16, ((pos && pos.y) ? pos.y : window.innerHeight/2) - 40));
    el.style.left = x + 'px';
    el.style.top  = y + 'px';
    setTimeout(()=>{ try{ el.remove(); }catch(_){ } }, 900);
  }catch(_){}
}
function addScore(delta, pos){
  score = Math.max(0, score + delta);
  try{ renderScoreBadge(); }catch(_){}
  showPoints(delta, pos);
}

// Initialize score badge once on load
(function(){ try{ renderScoreBadge(); }catch(_){ } })();

// === LEVEL badge renderer (non-invasive) ===
function renderLevelBadgeTop(){
  var el = document.getElementById('levelBadgeTop');
  if(!el) return;
  var lvl = (typeof currentLevel !== 'undefined' && currentLevel > 0) ? currentLevel : 1;
  el.textContent = 'LEVEL ' + lvl;
}
// render once and keep in sync (polling avoids touching core logic)
(function(){ try{ renderLevelBadgeTop(); }catch(_){}; try{ setInterval(renderLevelBadgeTop, 300); }catch(_){}; })();

    const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
    const rand=(a,b)=>a+Math.random()*(b-a);
    const irand=(a,b)=>Math.round(rand(a,b));
    const pick=a=>a[Math.floor(Math.random()*a.length)];
    const pxToVw=px=>(px/window.innerWidth)*100;

// === Boss big HUD helpers ===
const BossHUD = { wrap:null, fill:null, label:null, shownForId:null };
(function BossHudInit(){
  try{
    BossHUD.wrap = document.getElementById('bossHud');
    BossHUD.fill = document.getElementById('bossHpFill');
    BossHUD.label = document.getElementById('bossHpLabel');
  }catch(_){}
})();

function showBossHud(e){
  if(!BossHUD.wrap) return;
  BossHUD.shownForId = e.id || (e._uid ||= Math.random());
  BossHUD.wrap.style.display = 'block';
  updateBossHud(e);
}
function updateBossHud(e){
  if(!BossHUD.wrap) return;
  const p = Math.max(0, Math.min(1, e.hp / e.maxHp));
  if(BossHUD.fill) BossHUD.fill.style.width = (p*88.33).toFixed(2) + '%';
  if(BossHUD.label) BossHUD.label.textContent = 'BOSS ' + Math.round(p*100) + '%';
}
function hideBossHud(){
  if(!BossHUD.wrap) return;
  BossHUD.wrap.style.display = 'none';
  BossHUD.shownForId = null;
}

    
function applyBossSpriteOffset(e){
  // SAFETY: scoped to boss sprite only; visual-only; no impact on menus/fullscreen.
  try{
    if(!e || !e.isBoss || !e.el) return;
    var sprite = e.el.firstChild || e.el;

    // compute base offset if provided by game logic
    var baseY = 0;
    try{
      if (typeof getBossOffsetY === 'function') baseY = getBossOffsetY()|0;
    }catch(__){ baseY = 0; }

    // add a gentle parametric oscillation that is independent of collisions
    var now = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
    var t = now * 0.001;
    var isMobile = (window.matchMedia && window.matchMedia('(hover: none) and (pointer: coarse)').matches) || (window.innerWidth <= 900);
    var amp = isMobile ? 12 : 40;  // mobile smoother small amplitude  // amplitudine redusă pe mobil       // fixed small amplitude to avoid layout side-effects
    var omega = isMobile ? 1.1 : 2.4;   // slower on mobile
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) { omega *= 0.7; }
    var yOsc = amp * Math.sin(t * omega);

    // apply transform to the sprite only
    var center = baseY;
    if (typeof isMobile !== 'undefined' && isMobile){
      var lift = 18;         // urcă boss-ul cu ~18px
      center = baseY - lift; // coordonate CSS: minus = mai sus
    }
    var y = center + yOsc;
    if (typeof isMobile !== 'undefined' && isMobile){
      var up = 28;   // permite mai mult în sus
      var down = 12; // mai puțin în jos ca să nu coboare mult
      if (y < center - up) y = center - up;
      if (y > center + down) y = center + down;
    }
    sprite.style.transform = 'translate3d(0,' + y.toFixed(2) + 'px,0)';
  }catch(_){}
}
/* ===== Responsive scale (1.0 = design pe ~900px înălțime) ===== */
    const BASE_H = 900;
    let uiS = 1;

function applyUiScaleToCssVars() {
  const r = document.documentElement;

  r.style.setProperty('--hudScale', String(uiS));
  r.style.setProperty('--cloudScale', String(uiS));
  r.style.setProperty('--hudFont', `${Math.round(24 * uiS)}px`);
  r.style.setProperty('--iconSize', `${Math.round(70 * uiS)}px`);
  r.style.setProperty('--frameWidth', `${Math.round(420 * uiS)}px`);
  r.style.setProperty('--resHudScale', String(uiS));
  r.style.setProperty('--resHudFont', `${Math.round(24 * uiS)}px`);
  r.style.setProperty('--ovScale', String(uiS));
  r.style.setProperty('--pickupTextPx', `${Math.round(18 * uiS)}px`);
  r.style.setProperty('--coinBadgeH', `${Math.round(18 * uiS)}px`);
  r.style.setProperty('--coinBadgeFont', `${Math.round(12 * uiS)}px`);
  r.style.setProperty('--coinBadgePadX', `${Math.max(4, Math.round(6 * uiS))}px`);
    // Enemy HP bar (scale cu uiS)
  r.style.setProperty('--ehpW',      `${Math.round(78 * uiS)}px`);
  r.style.setProperty('--ehpH',      `${Math.max(3, Math.round(6 * uiS))}px`);
  r.style.setProperty('--ehpShiftX', `${Math.round(10 * uiS)}px`); // +dreapta, -stânga
  r.style.setProperty('--ehpTop',    `${Math.round(-12 * uiS)}px`);
  r.style.setProperty('--ehpBorder', `${Math.max(1, Math.round(2 * uiS))}px`);
  r.style.setProperty('--ehpRadius', `${Math.round(6 * uiS)}px`);
  r.style.setProperty('--ehpInset',  `${Math.max(1, Math.round(1 * uiS))}px`);

  // === Auto-lift: calculează offset-ul dependent de scale
  const nudgeStr = getComputedStyle(document.documentElement).getPropertyValue('--resNudgeY').trim();
  const nudgePx  = parseFloat(nudgeStr) || 0;
  const lift     = nudgePx * (1 - uiS); // translateY = nudge * uiS
  document.documentElement.style.setProperty('--resAutoLiftPx', lift + 'px');
}

    /* helper pentru dimensiuni sprite/dușmani/jucător */
    function scaled(v){ return Math.max(1, Math.round(v * uiS)); }

    
function getBossOffsetY(){
  // responsive offset: scales with viewport height, capped to desktop value
  const vh = Math.max(320, Math.min(1200, window.innerHeight || 720));
  const byVh = Math.round(vh * 0.06); // ~6% of height
  const byTier = (window.innerWidth < 480) ? 32 : (window.innerWidth < 768) ? 44 : 120;
  return Math.round(Math.min(byTier, byVh) * uiS);
}
// tablets/desktop // move boss sprite down to remove bottom padding
// === Apply gameplay scale derived from uiS so feel matches desktop ===
    function applyGameplayScaleFromUiS(){
      try{
        // Player physics re-scaled to screen height
        if (typeof player !== 'undefined') {
          const oldFeet = player.y + player.h;
          player.w = scaled(220);
          player.h = scaled(220);
          player.speed   = scaled(380);
          player.jumpV   = scaled(950);
          player.gravity = scaled(2000);
          // keep feet anchored to ground if already placed
          const floor = (typeof groundY === 'function') ? groundY() : (window.innerHeight - Math.round(90*uiS));
          const newFeet = Math.min(floor, oldFeet);
          player.y = newFeet - player.h;
        }
        // Projectile speeds
        if (typeof PROJ_SPEED !== 'undefined') PROJ_SPEED = scaled(900);
        if (typeof EPROJ_SPEED !== 'undefined') EPROJ_SPEED = scaled(520);
      }catch(_){}
    }

    /* ===== Audio ===== */
    const Sounds = {inv: new Audio('inv.mp3'),
wait: new Audio('wait.mp3'),

      startBgm: new Audio('gamemusic.wav'),
      bgm: new Audio('music.wav'), bossEntrance: new Audio('bossentrance.mp3'), jump: new Audio('jump.mp3'), land: new Audio('land.mp3'),
      shoot: new Audio('shoot.mp3'), enemyShoot: new Audio(''), bossLaugh: new Audio('laugh.mp3'),
      hit: new Audio('hit.mp3'), enemyHit: new Audio('enemy_hit.mp3'), bite: new Audio('bite.mp3'), roar: new Audio('roaring.mp3'),
      death: new Audio('death.mp3'), playerDeath: new Audio('player_death.mp3'),
      win: new Audio(''), shipWarmup: new Audio('ship_warmup.mp3'),
      shipTakeoff: new Audio(''), countdownTick: new Audio('countdown_tick.mp3'),
      tpOut: new Audio(''), tpIn: new Audio('teleport_in.mp3'),
      shipLand: new Audio('ship_land.mp3'), shipDescend: new Audio('ship_descend.mp3'),
      playerScream: new Audio('player_scream.mp3'), shipHold: new Audio('ship_hold.mp3'),
      bing: new Audio('bing.mp3'),
      spit: new Audio('spit.mp3'),
      coin: new Audio('coin.mp3'),
      step1: new Audio('step1.mp3'),
      step2: new Audio('step2.mp3'),
      slowdown: new Audio('slowdown.mp3')
    
  , slide: new Audio('slide.mp3'),
  flapLow: new Audio('flaplow.mp3')
,
  enemyDie: new Audio('dieenemy.mp3')
}

// Base volume for flapLow
if (Sounds.flapLow) Sounds.flapLow.volume = 0.65;
Sounds.inv.volume = 0.9;
Sounds.wait.volume = 0.8;
Sounds.enemyDie.volume = 0.9;
;
    Sounds.startBgm.loop = true; Sounds.startBgm.volume = 0.9;
    Sounds.bgm.loop = true;      Sounds.bgm.volume = 0.35;
Sounds.bossEntrance.loop = true; Sounds.bossEntrance.volume = 1.0;
    Sounds.jump.volume = 0.6; Sounds.land.volume = 0.45;
    Sounds.shoot.volume = 0.6; Sounds.enemyShoot.volume = 0.5;
    Sounds.hit.volume = 0.8; Sounds.enemyHit.volume = 0.7;
    Sounds.death.volume = 0.7; Sounds.playerDeath.volume = 0.9; Sounds.win.volume = 0.7;
    Sounds.shipWarmup.volume = 0.8; Sounds.shipTakeoff.volume = 0.9;
    Sounds.countdownTick.volume = 0.9; Sounds.tpOut.volume = 0.8; Sounds.tpIn.volume = 0.9;
    Sounds.shipLand.volume = 0.5; Sounds.shipDescend.volume = 0.9;
    Sounds.playerScream.volume = 0.9; Sounds.shipHold.volume = 0.9;
    Sounds.bing.volume = 0.8; Sounds.spit.volume = 0.85; Sounds.coin.volume = 0.95; Sounds.slowdown.volume = 0.9;
    Sounds.step1.volume = 0.75; Sounds.step2.volume = 0.75;
 

    const baseVolumes = {};
/* Hook boss laugh start -> overlay anim; also block beginEnemyShoot when laughing */
(function(){
  try{
    if(!window.__laughV3Hooked__){
      window.__laughV3Hooked__ = true;

      const getBoss = ()=>{
        try{
          if(Array.isArray(enemies)){
            for(let i=0;i<enemies.length;i++){
              const b = enemies[i];
              if(b && b.isBoss && !b.dead) return b;
            }
          }
        }catch(_){}
        return null;
      };

      if(Sounds && Sounds.bossLaugh && Sounds.bossLaugh.addEventListener){
        Sounds.bossLaugh.addEventListener('play', function(){
          try{
            const b = getBoss();
            if(b) __startBossLaughOverlay(b, Sounds.bossLaugh);
          }catch(_){}
        }, { once:false });
      }

      try{
        if(typeof window.beginEnemyShoot === 'function' && !window.beginEnemyShoot.__wrapped){
          const __origBegin = window.beginEnemyShoot;
          window.beginEnemyShoot = function(e){
            try{ if(e && e.__laughing){ e.shooting=(!player || !player.isInvisible) && ((!player || !player.isInvisible) && (false)); e.hasFired=false; return; } }catch(_){}
            return __origBegin.apply(this, arguments);
          };
          window.beginEnemyShoot.__wrapped = true;
        }
      }catch(_){}
    }
  }catch(_){}
})();

    for(const [k,a] of Object.entries(Sounds)) baseVolumes[k] = a.volume;

    // Track where the last damage came from for scoring
    window.lastDamageSource = 'unknown';

    let musicVol = 0.35; // UI default
    let sfxVol   = 0.85; // UI default
    let muted    = false;

    function applyVolumes(){
      for(const [k,a] of Object.entries(Sounds)){
        const base = baseVolumes[k] ?? 1;
        const groupMul =
          (k === 'bgm' || k === 'startBgm' || k === 'bossEntrance')
            ? (musicVol / (baseVolumes[k]||1))
            : (sfxVol / 1);
        a.volume = muted ? 0 : Math.max(0, Math.min(1, base * groupMul));
      
    try{
      if (typeof Sounds !== 'undefined' && Sounds.bossEntrance && typeof Sounds.bossEntrance.volume === 'number') {
        // bossEntrance boost
        /* bossEntrance boost */
        Sounds.bossEntrance.volume = Math.min(1, Sounds.bossEntrance.volume * 1.35);
      }
    }catch(_){}
}
    }
    applyVolumes();
    // Preload vibration.mp3 pentru stomp (dacă există în proiect)
    try{
      if(!window.Sounds) window.Sounds = {};
      if(!Sounds.vibration){
        Sounds.vibration = new Audio('vibration.mp3');
        Sounds.vibration.volume = 0.9;
        Sounds.vibration.preload = 'auto';
      }
    }catch(_){}

    function playSound(aud){ try{ const n=aud.cloneNode(); n.volume=aud.volume; n.play().catch(()=>{}); }catch{} }
    function startMusic(){ Sounds.bgm.currentTime=0; Sounds.bgm.play().catch(()=>{}); }
    function startMenuMusic(){
  // Only play in fullscreen
  try {
    const fsEl = document.fullscreenElement || document.webkitFullscreenElement || document.msFullscreenElement || document.mozFullScreenElement;
    if (!fsEl) return;
  } catch(_) {}

  if (Sounds.startBgm.paused) {
    Sounds.startBgm.play().catch(()=>{});
  }
}
    ['pointerdown','keydown','touchstart'].forEach(ev=>{
      window.addEventListener(ev, ()=>{ if(document.getElementById('startScreen').style.display!=='none') startMenuMusic(); }, { once:true })
    });

    /* ===== Dificultate ===== */

/* ===== Level-based Enemy Balance (non-invasive) ===== */
let ENEMY_CAN_TELEPORT = false;   // enabled from level >= 4

function hitsToKillForLevel(l){
  if(l <= 2) return 1;      // L1–2: 1 hit
  if(l <= 9) return 2;      // L3–9: 2 hits
  if(l <= 19) return 3;     // L10–19: 3 hits
  if(l <= 29) return 4;     // L20–29: 4 hits
  return 5;                 // L30+: 5 hits
}

// Enemy damage to player: +1 per level starting low, capped at 30 (L30 -> 30)
function damageForLevel(l){
  return Math.min(30, Math.max(1, l));
}

// Enemy shooting rate multiplier (bigger => slower): starts slow and ramps up
function shootRateForLevel(l){
  const rate = 2.4 - (l-1) * 0.06;          // tweak curve as needed
  return Math.max(0.9, Math.min(2.6, rate)); // clamp
}

function updateLevelBalance(){
  try{
    const lvl = (typeof currentLevel!=='undefined' && currentLevel>0) ? currentLevel : 1;

    // 1) Teleport only from level 4+
    ENEMY_CAN_TELEPORT = (lvl >= 4);

    // 2) Enemy damage to player (cap 30)
    const dmgToPlayer = damageForLevel(lvl);

    // 3) Enemy shoot cooldown multiplier
    const shootRate = shootRateForLevel(lvl);

    // 4) Apply into existing difficulty knobs (keeps other mechanics intact)
    currentDiff = { enemyBulletDmg: dmgToPlayer, enemyShootRate: shootRate, enemyHpMul: (currentDiff?.enemyHpMul ?? 1.0) };
    playerDamageFromBullet = Math.min(30, currentDiff.enemyBulletDmg);

    // 5) Player damage to enemy -> derive from requested hits-to-kill
    //    Use a base HP reference if present; otherwise assume 50 and let the exact #hits rule dominate.
    const hits = hitsToKillForLevel(lvl);
    const maxBase = (typeof BASE_ENEMY_HP!=='undefined') ? BASE_ENEMY_HP : 50;
    const hpMul = (currentDiff?.enemyHpMul ?? 1.0);
    const maxHp = Math.round(maxBase * hpMul);
    if (typeof ENEMY_DMG_PER_HIT !== 'undefined'){
      ENEMY_DMG_PER_HIT = Math.max(1, Math.round(maxHp / hits));
    }
  }catch(_){}
}

    const DIFFS = {
      easy:   { enemyBulletDmg: 3, enemyShootRate: 1.15, enemyHpMul: 0.9 },
      normal: { enemyBulletDmg: 5, enemyShootRate: 1.00, enemyHpMul: 1.0 },
      hard:   { enemyBulletDmg: 8, enemyShootRate: 0.85, enemyHpMul: 1.2 },
    };
    let currentDiff = DIFFS.normal;
    let playerDamageFromBullet = currentDiff.enemyBulletDmg;

    /* ===== Nori (două layere) ===== */
    const SPRITES=['cloud1.png','cloud2.png','cloud3.png'];
    const COUNT=6, Y_RANGE=[0,25];
    const SIZES={medium:[180,260], large:[300,420]};
    const SPEED_VW_PER_SEC=1.5, GAP_VW=8, FADE_VW=12, OPACITY_MAX=0.95;
    const layerBack = document.getElementById('cloudLayerBack');
    const layerFront= document.getElementById('cloudLayerFront');
    const clouds=[];

    function pickSize(){ const bucket=Math.random()<0.55?'medium':'large'; const [min,max]=SIZES[bucket]; return irand(min,max); }
    function createCloud(layerEl){ const el=document.createElement('div'); el.className='cloud'; const img=document.createElement('img'); img.src=pick(SPRITES); el.appendChild(img); layerEl.appendChild(el); return el; }
    function addCloud(x){
      const w=pickSize(); const wvw = pxToVw(w * uiS); const y=irand(Y_RANGE[0],Y_RANGE[1]);
      const useFront = Math.random() < 0.55;
      const el=createCloud(useFront?layerFront:layerBack);
      const rec={el,x,wvw,wpx:w,y};
      el.style.setProperty('--wpx',w+'px'); el.style.setProperty('--yvh',y+'vh'); el.style.setProperty('--xvw',x+'vw'); el.style.setProperty('--op',0);
      requestAnimationFrame(()=>el.style.setProperty('--op',OPACITY_MAX)); clouds.push(rec);
    }
// PATCH: layoutInitial — include uiS în calculele wvw de la start
function layoutInitial(){
  clouds.length = 0;
  layerBack.innerHTML = '';
  layerFront.innerHTML = '';
  let x = 0;

  // seed inițial
  for (let i = 0; i < COUNT; i++) {
    const w   = pickSize();
    const wvw = pxToVw(w * uiS);            // <-- înainte era pxToVw(w)
    const left = (i === 0) ? rand(0, 10) : x + GAP_VW;
    addCloud(left);
    x = left + wvw;
  }

  // completează până depășește marginea
  while (x < 130) {
    const w   = pickSize();
    const wvw = pxToVw(w * uiS);            // <-- înainte era pxToVw(w)
    const left = x + GAP_VW;
    addCloud(left);
    x = left + wvw;
  }
}

    function rightmostEdge(){ let r=-Infinity; for(const c of clouds) r=Math.max(r,c.x+c.wvw); return r; }
    function recycle(c){ const w=pickSize(); const wvw = pxToVw(w * uiS); c.wpx=w; c.wvw=wvw; c.x=rightmostEdge()+GAP_VW; c.y=irand(Y_RANGE[0],Y_RANGE[1]); c.el.style.setProperty('--wpx',w+'px'); c.el.style.setProperty('--yvh',c.y+'vh'); c.el.style.setProperty('--xvw',c.x+'vw'); if(Math.random()<0.5) c.el.firstChild.src=pick(SPRITES); c.el.style.setProperty('--op',0); requestAnimationFrame(()=>c.el.style.setProperty('--op',OPACITY_MAX)); }
function edgeOpacity(x, base) {
  if (x > 100) {
    return base * Math.max(0, Math.min(1, 1 - (x - 100) / FADE_VW));
  }
  if (x < 0) {
    return base * Math.max(0, Math.min(1, 1 + x / FADE_VW));
  }
  return base;
}

/* ===== Solul (adaptiv: desktop + telefon) ===== */
const GROUND_RATIO  = 0.78;   // ~78% din înălțime (bun pe desktop)
const GROUND_OFF_VW = 0.5;   const ENEMY_GROUND_SHIFT = scaled(24);
const GROUND_SHIFT = 0; // coboară nivelul solului (~24px scalat)
const ENEMY_DEATH_EXTRA = scaled(94); // cât de jos cade cadavrul față de sol (pozitiv = mai jos)
// 12% din lățime (bun pe telefon)

// Offset tweak pentru înălțimea playerului față de sol față de marginea de jos a ecranului (în pixeli).
// Poți ajusta această valoare: valori mai mari ridică playerul (și inamicii) mai sus de la sol, valori mai mici îi coboară.
const PLAYER_GROUND_OFFSET = 215;

function groundY(){
  const vh = window.innerHeight || 1080;
  // linia de "sol" este la o distanță fixă față de partea de jos a ecranului
  return vh - PLAYER_GROUND_OFFSET;
}

    /* ===== Player & animații ===== */
    const playerEl=document.getElementById('player'), playerImg=document.getElementById('playerImg');
    // Guard direct assignments to playerImg.src when sprite is locked
    (function(){
      try{
        const desc = Object.getOwnPropertyDescriptor(HTMLImageElement.prototype, 'src');
        if(desc && !window.__playerSrcGuardInstalled){
          Object.defineProperty(playerImg, 'src', {
            get(){ return desc.get.call(playerImg); },
            set(v){
              if(v === 'SAD.png' || v === 'SAD2.png'){
              try{ triggerGameOverVisuals(); }catch(_){}
            }
            if(window.__spriteLocked && (v !== 'SAD.png' && v !== 'SAD2.png')) { return; }
              desc.set.call(playerImg, v);
            },
            configurable: true
          });
          window.__playerSrcGuardInstalled = true;
        }
      }catch(_){}
    })();

    const runFrames={left:['alien_run_left_1.png','alien_run_left_2.png','alien_run_left_3.png','alien_run_left_4.png','alien_run_left_5.png','alien_run_left_6.png'],
                     right:['alien_run_right_1.png','alien_run_right_2.png','alien_run_right_3.png','alien_run_right_4.png','alien_run_right_5.png','alien_run_right_6.png']};
    const idleFrames={left:['alien_idle_left_1.png','alien_idle_left_2.png','alien_idle_left_3.png','alien_idle_left_4.png'],
                      right:['alien_idle_right_1.png','alien_idle_right_2.png','alien_idle_right_3.png','alien_idle_right_4.png']};
    const jumpImage={left:'alien_jump_left.png', right:'alien_jump_right.png'};
    const landImage={left:'alien_land_left.png', right:'alien_land_right.png'};
    const crouchImage={left:'alien_crouch_left.png', right:'alien_crouch_right.png'};
    const slideImage={left:'slideleft.png', right:'slideright.png'};
const slideFrames={left:['slideleft1.png','slideleft2.png','slideleft3.png','slideleftt4.png'], right:['slideright1.png','slideright2.png','slideright3.png','slideright4.png']};

    const hitFrames = { left:['alien_hit_left_1.png','alien_hit_left_2.png'], right:['alien_hit_right_1.png','alien_hit_right_2.png'] };
    const deathFrames={left:['alien_death_left_1.png','alien_death_left_2.png','alien_death_left_3.png','alien_death_left_4.png'],
                       right:['alien_death_right_1.png','alien_death_right_2.png','alien_death_right_3.png','alien_death_right_4.png']};
    const shootFrames = {
      idle: { left:['alien_idle_shoot_left.png'], right:['alien_idle_shoot_right.png'] },
      run:  { left:['alien_run_shoot_left.png'],  right:['alien_run_shoot_right.png']  },
      jump: { left:['alien_jump_shoot_left.png'], right:['alien_jump_shoot_right.png'] }
    };
