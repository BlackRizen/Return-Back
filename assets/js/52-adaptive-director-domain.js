window.GameApp && window.GameApp.registerModule && window.GameApp.registerModule('52-adaptive-director-domain', {"entryMarker":"// adaptive director domain","description":"Observes player habits, builds rolling pattern tags and publishes bounded adaptive weights for future enemy counter-behavior."});
/*__MODULE_BOUNDARY__*/
(function(){
  var app = window.GameApp;
  if (!app || !app.domains || window.__adaptiveDirectorInstalled) return;
  window.__adaptiveDirectorInstalled = true;

  function nowIso(){ return new Date().toISOString(); }
  function clamp(v, min, max){ v = Number(v); if (!Number.isFinite(v)) v = 0; return Math.max(min, Math.min(max, v)); }
  function lerp(a, b, t){ return a + (b - a) * t; }
  function ema(prev, sample, dt, tau){
    prev = Number(prev) || 0;
    sample = Number(sample) || 0;
    dt = Math.max(0, Number(dt) || 0);
    tau = Math.max(0.001, Number(tau) || 0.001);
    var alpha = 1 - Math.exp(-dt / tau);
    return prev + (sample - prev) * alpha;
  }
  function read(name, fallback){ return app.helpers && app.helpers.readState ? app.helpers.readState(name, fallback) : fallback; }
  function safe(fn, ctx, args, fallback){ return app.helpers && app.helpers.safeCall ? app.helpers.safeCall(fn, ctx, args, fallback) : fallback; }
  function record(type, details){
    try{
      if (app.debugMetrics && typeof app.debugMetrics.recent !== 'undefined'){
        var arr = app.debugMetrics.recent || (app.debugMetrics.recent = []);
        arr.unshift({ at: nowIso(), type: type, details: details || {} });
        if (arr.length > 18) arr.length = 18;
      }
    }catch(_){}
  }
  function persistedEnabled(){
    try{
      if (window.localStorage){
        var raw = localStorage.getItem('GAMEPOWER_ADAPTIVE_DIRECTOR');
        if (raw === '0') return false;
        if (raw === '1') return true;
      }
    }catch(_){}
    return true;
  }
  function defaultAdaptation(){
    return {
      enabled: persistedEnabled(),
      levelStartedAt: 0,
      levelObserved: null,
      lastCommittedLevel: null,
      recent: {
        distanceFarEMA: 0,
        distanceCloseEMA: 0,
        leftAfterShotEMA: 0,
        rightAfterShotEMA: 0,
        stationaryEMA: 0,
        aggressionEMA: 0,
        burstSpamEMA: 0,
        panicDodgeEMA: 0,
        laneRepeatEMA: 0,
        antiTeleportSkillEMA: 0,
        retreatAfterThreatEMA: 0
      },
      history: {
        distanceFar: 0,
        leftAfterShot: 0,
        rightAfterShot: 0,
        stationary: 0,
        aggression: 0,
        burstSpam: 0,
        panicDodge: 0,
        laneRepeat: 0,
        antiTeleportSkill: 0,
        retreatAfterThreat: 0
      },
      tags: {
        camping: false,
        leftDodger: false,
        rightDodger: false,
        rangedKiter: false,
        rushdown: false,
        panicDasher: false,
        shotSpammer: false,
        teleportWeak: false,
        teleportStrong: false,
        laneRepeater: false
      },
      weights: {
        aimLeadBiasX: 0,
        burstDelayMix: 0,
        flankTeleportBias: 0,
        gapCloseBias: 0,
        crossEvadeBias: 0,
        fakeoutBias: 0,
        punishRetreatBias: 0
      },
      scores: {
        camping: 0,
        leftDodger: 0,
        rightDodger: 0,
        rangedKiter: 0,
        rushdown: 0,
        panicDasher: 0,
        shotSpammer: 0,
        teleportWeak: 0,
        teleportStrong: 0,
        laneRepeater: 0
      },
      summary: {
        topTags: [],
        style: 'neutral',
        adaptationStrength: 0,
        nearestEnemyDistNorm: 0,
        zone: 'mid',
        primaryTag: '',
        secondaryTag: '',
        counterRead: 'neutral',
        breakableRead: false
      },
      lastEvents: {
        enemyTelegraphAt: 0,
        threatWindowUntil: 0,
        playerLastShotAt: 0,
        playerLastHitAt: 0,
        playerLastTeleportAt: 0,
        playerZone: 'mid'
      },
      memory: {
        campaignStyleStrength: 0.35,
        levelAdaptStrength: 0.65
      }
    };
  }

  app.state = app.state || {};
  var adaptation = app.state.adaptation = app.state.adaptation || defaultAdaptation();
  if (!adaptation.recent || !adaptation.history || !adaptation.tags || !adaptation.weights) {
    app.state.adaptation = adaptation = defaultAdaptation();
  }
  var runtime = app.__adaptiveRuntime = app.__adaptiveRuntime || {
    prevPlayerX: null,
    prevPlayerY: null,
    prevProjCount: 0,
    prevEnemyThreatCount: 0,
    prevTeleportCount: 0,
    prevHealth: null,
    shotWindowUntil: 0,
    shotOriginX: 0,
    shotOriginY: 0,
    shotResolved: false,
    lastShotAt: 0,
    burstCount: 0,
    prevZone: '',
    threatDistAtStart: null,
    threatResolved: true,
    lastSampleTs: 0,
    lastGameEnded: false
  };

  function syncEnabled(flag){
    var enabled = !!flag;
    adaptation.enabled = enabled;
    try{
      if (window.localStorage){
        if (enabled) localStorage.setItem('GAMEPOWER_ADAPTIVE_DIRECTOR', '1');
        else localStorage.setItem('GAMEPOWER_ADAPTIVE_DIRECTOR', '0');
      }
    }catch(_){}
    try{
      window.dispatchEvent(new CustomEvent('debug:adaptive-director-changed', { detail:{ enabled:enabled } }));
    }catch(_){}
    record('adaptive-mode-changed', { enabled: enabled });
    return enabled;
  }
  try{ adaptation.enabled = persistedEnabled(); }catch(_){}
  window.__isAdaptiveDirectorEnabled = function(){ return !!(app.state && app.state.adaptation && app.state.adaptation.enabled); };
  window.__setAdaptiveDirectorMode = syncEnabled;

  function player(){ try{ return app.state.player || window.player || null; }catch(_){ return null; } }
  function enemies(){
    try{ return (app.state.enemies || window.enemies || []).filter(function(e){ return e && !e.dead; }); }catch(_){ return []; }
  }
  function projectiles(){ try{ return app.state.projectiles || window.projectiles || []; }catch(_){ return []; } }
  function healthValue(){ var h = read('health', null); return Number.isFinite(Number(h)) ? Number(h) : null; }
  function playerCenter(pl){
    if (!pl) return { x: 0, y: 0 };
    return {
      x: (Number(pl.x) || 0) + (Number(pl.w) || 0) * 0.5,
      y: (Number(pl.y) || 0) + (Number(pl.h) || 0) * 0.5
    };
  }
  function enemyCenter(e){
    return {
      x: (Number(e && e.x) || 0) + (Number(e && e.w) || 0) * 0.5,
      y: (Number(e && e.y) || 0) + (Number(e && e.h) || 0) * 0.5
    };
  }
  function nearestEnemyInfo(pl, list){
    var pc = playerCenter(pl);
    var best = null;
    var bestDx = 0;
    var bestDy = 0;
    var bestDist = Infinity;
    for (var i = 0; i < list.length; i++){
      var e = list[i];
      if (!e || e.dead) continue;
      var ec = enemyCenter(e);
      var dx = ec.x - pc.x;
      var dy = ec.y - pc.y;
      var dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < bestDist){
        best = e;
        bestDist = dist;
        bestDx = dx;
        bestDy = dy;
      }
    }
    return {
      enemy: best,
      dx: bestDx,
      dy: bestDy,
      dist: Number.isFinite(bestDist) ? bestDist : Infinity,
      norm: clamp((Number.isFinite(bestDist) ? bestDist : 9999) / 420, 0, 1)
    };
  }
  function zoneForX(x){
    var w = Math.max(320, window.innerWidth || 1280);
    if (x < w * 0.3333) return 'left';
    if (x > w * 0.6666) return 'right';
    return 'mid';
  }
  function tagWithHysteresis(flag, value, onAt, offAt){
    if (!flag && value >= onAt) return true;
    if (flag && value <= offAt) return false;
    return !!flag;
  }
  function adaptationStrength(level){
    level = Number(level) || 1;
    if (level <= 3) return 0.00;
    if (level === 4) return 0.30;
    if (level === 5) return 0.40;
    if (level === 6) return 0.52;
    if (level === 7) return 0.62;
    if (level === 8) return 0.72;
    if (level === 9) return 0.78;
    return 0.84;
  }
  function focusScale(primaryTag, secondaryTag, groups, tertiary){
    groups = Array.isArray(groups) ? groups : [groups];
    tertiary = (typeof tertiary === 'number') ? tertiary : 0.12;
    if (primaryTag && groups.indexOf(primaryTag) >= 0) return 1;
    if (secondaryTag && groups.indexOf(secondaryTag) >= 0) return 0.42;
    return tertiary;
  }
  function softRoundMap(obj){
    var out = {};
    Object.keys(obj || {}).forEach(function(key){
      out[key] = Math.round((Number(obj[key]) || 0) * 1000) / 1000;
    });
    return out;
  }
  function pickRankedTags(scores, tags){
    return Object.keys(scores || {})
      .filter(function(key){ return !!(tags && tags[key]); })
      .sort(function(a, b){ return (scores[b] || 0) - (scores[a] || 0); });
  }
  function describeCounter(tag){
    switch(tag){
      case 'leftDodger': return 'lead-left shots';
      case 'rightDodger': return 'lead-right shots';
      case 'rangedKiter': return 'gap close pressure';
      case 'panicDasher': return 'delayed punish shots';
      case 'camping': return 'flank pressure';
      case 'shotSpammer': return 'cross-evade and fakeouts';
      case 'laneRepeater': return 'lane trap pressure';
      case 'teleportWeak': return 'teleport flanks';
      case 'teleportStrong': return 'reduced teleport, more direct pressure';
      case 'rushdown': return 'punish commits';
      default: return 'neutral';
    }
  }
  function playerBrokeRead(tag){
    switch(tag){
      case 'rangedKiter':
        return (Number(adaptation.summary && adaptation.summary.nearestEnemyDistNorm) || 0) < 0.52 || (Number(adaptation.recent.aggressionEMA) || 0) > 0.38;
      case 'camping':
        return (Number(adaptation.recent.stationaryEMA) || 0) < 0.34;
      case 'laneRepeater':
        return (Number(adaptation.recent.laneRepeatEMA) || 0) < 0.40;
      case 'panicDasher':
        return (Number(adaptation.recent.panicDodgeEMA) || 0) < 0.30;
      case 'leftDodger':
        return (Number(adaptation.recent.leftAfterShotEMA) || 0) < 0.18 && (Number(adaptation.recent.rightAfterShotEMA) || 0) > ((Number(adaptation.recent.leftAfterShotEMA) || 0) + 0.05);
      case 'rightDodger':
        return (Number(adaptation.recent.rightAfterShotEMA) || 0) < 0.18 && (Number(adaptation.recent.leftAfterShotEMA) || 0) > ((Number(adaptation.recent.rightAfterShotEMA) || 0) + 0.05);
      case 'shotSpammer':
        return (Number(adaptation.recent.burstSpamEMA) || 0) < 0.20;
      case 'teleportWeak':
        return (Number(adaptation.recent.antiTeleportSkillEMA) || 0) > 0.68;
      case 'teleportStrong':
        return (Number(adaptation.recent.antiTeleportSkillEMA) || 0) < 0.48;
      case 'rushdown':
        return (Number(adaptation.recent.aggressionEMA) || 0) < 0.30;
      default:
        return false;
    }
  }
  function combinedMetric(recentKey, historyKey){
    var recent = Number(adaptation.recent[recentKey]) || 0;
    var hist = Number(adaptation.history[historyKey]) || 0;
    var levelWeight = clamp(Number(adaptation.memory.levelAdaptStrength) || 0.65, 0, 1);
    var campaignWeight = clamp(Number(adaptation.memory.campaignStyleStrength) || 0.35, 0, 1);
    var total = Math.max(0.0001, levelWeight + campaignWeight);
    return clamp((recent * levelWeight + hist * campaignWeight) / total, 0, 1);
  }
  function refreshTagsAndWeights(level, nearestNorm){
    var tags = adaptation.tags;
    var weights = adaptation.weights;
    var farScore = combinedMetric('distanceFarEMA', 'distanceFar');
    var leftScore = combinedMetric('leftAfterShotEMA', 'leftAfterShot');
    var rightScore = combinedMetric('rightAfterShotEMA', 'rightAfterShot');
    var stationary = combinedMetric('stationaryEMA', 'stationary');
    var aggression = combinedMetric('aggressionEMA', 'aggression');
    var burstSpam = combinedMetric('burstSpamEMA', 'burstSpam');
    var panic = combinedMetric('panicDodgeEMA', 'panicDodge');
    var laneRepeat = combinedMetric('laneRepeatEMA', 'laneRepeat');
    var antiTp = combinedMetric('antiTeleportSkillEMA', 'antiTeleportSkill');
    var retreat = combinedMetric('retreatAfterThreatEMA', 'retreatAfterThreat');

    tags.camping = tagWithHysteresis(tags.camping, stationary, 0.62, 0.48);
    tags.leftDodger = tagWithHysteresis(tags.leftDodger, leftScore, 0.60, 0.45);
    tags.rightDodger = tagWithHysteresis(tags.rightDodger, rightScore, 0.60, 0.45);
    tags.rangedKiter = tagWithHysteresis(tags.rangedKiter, farScore, 0.64, 0.50);
    tags.rushdown = tagWithHysteresis(tags.rushdown, aggression, 0.62, 0.48);
    tags.panicDasher = tagWithHysteresis(tags.panicDasher, panic, 0.58, 0.44);
    tags.shotSpammer = tagWithHysteresis(tags.shotSpammer, burstSpam, 0.66, 0.52);
    tags.laneRepeater = tagWithHysteresis(tags.laneRepeater, laneRepeat, 0.60, 0.45);

    var tpWeakScore = clamp((1 - antiTp) * 0.75 + stationary * 0.25, 0, 1);
    var tpStrongScore = clamp(antiTp * 0.85 + aggression * 0.15, 0, 1);
    tags.teleportWeak = tagWithHysteresis(tags.teleportWeak, tpWeakScore, 0.62, 0.46);
    tags.teleportStrong = tagWithHysteresis(tags.teleportStrong, tpStrongScore, 0.62, 0.46);
    if (tags.teleportWeak && tags.teleportStrong){
      if (tpStrongScore >= tpWeakScore) tags.teleportWeak = false;
      else tags.teleportStrong = false;
    }

    var strength = adaptationStrength(level);
    var scoreMap = adaptation.scores || (adaptation.scores = {});
    scoreMap.camping = clamp(stationary * 0.92 + farScore * 0.08, 0, 1);
    scoreMap.leftDodger = clamp(leftScore, 0, 1);
    scoreMap.rightDodger = clamp(rightScore, 0, 1);
    scoreMap.rangedKiter = clamp(farScore, 0, 1);
    scoreMap.rushdown = clamp(aggression, 0, 1);
    scoreMap.panicDasher = clamp(panic, 0, 1);
    scoreMap.shotSpammer = clamp(burstSpam, 0, 1);
    scoreMap.teleportWeak = clamp(tpWeakScore, 0, 1);
    scoreMap.teleportStrong = clamp(tpStrongScore, 0, 1);
    scoreMap.laneRepeater = clamp(laneRepeat, 0, 1);

    var rankedTags = pickRankedTags(scoreMap, tags);
    var primaryTag = rankedTags[0] || '';
    var secondaryTag = rankedTags[1] || '';

    weights.aimLeadBiasX = clamp(((tags.leftDodger ? -0.22 : 0) + (tags.rightDodger ? 0.22 : 0)) * strength * focusScale(primaryTag, secondaryTag, ['leftDodger','rightDodger'], 0.10), -0.36, 0.36);
    weights.burstDelayMix = clamp(((tags.panicDasher ? 0.28 : 0.08)) * strength * focusScale(primaryTag, secondaryTag, ['panicDasher'], 0.18), 0, 0.42);
    weights.flankTeleportBias = clamp(((tags.camping ? 0.24 : 0) + (tags.rangedKiter ? 0.18 : 0) + (tags.teleportWeak ? 0.16 : 0) + (tags.teleportStrong ? -0.08 : 0)) * strength * focusScale(primaryTag, secondaryTag, ['camping','rangedKiter','teleportWeak','teleportStrong','laneRepeater'], 0.20), -0.18, 0.52);
    weights.gapCloseBias = clamp(((tags.rangedKiter ? 0.24 : 0) + (tags.rushdown ? -0.10 : 0) + (tags.camping ? 0.06 : 0)) * strength * focusScale(primaryTag, secondaryTag, ['rangedKiter','camping','rushdown'], 0.20), -0.16, 0.46);
    weights.crossEvadeBias = clamp(((tags.shotSpammer ? 0.20 : 0) + (tags.rushdown ? 0.12 : 0)) * strength * focusScale(primaryTag, secondaryTag, ['shotSpammer','rushdown'], 0.16), 0, 0.42);
    weights.fakeoutBias = clamp(((tags.panicDasher ? 0.20 : 0) + (tags.shotSpammer ? 0.08 : 0)) * strength * focusScale(primaryTag, secondaryTag, ['panicDasher','shotSpammer'], 0.16), 0, 0.42);
    weights.punishRetreatBias = clamp((((tags.leftDodger || tags.rightDodger) ? 0.16 : 0) + (retreat > 0.58 ? 0.18 : 0) + (tags.laneRepeater ? 0.08 : 0)) * strength * focusScale(primaryTag, secondaryTag, ['leftDodger','rightDodger','laneRepeater'], 0.14), 0, 0.44);

    var topTags = rankedTags.slice(0, 5);
    var style = 'neutral';
    if (tags.rangedKiter) style = 'ranged-kiter';
    else if (tags.rushdown) style = 'rushdown';
    else if (tags.camping) style = 'camping';
    else if (tags.shotSpammer) style = 'shot-spammer';
    adaptation.summary.topTags = topTags;
    adaptation.summary.primaryTag = primaryTag;
    adaptation.summary.secondaryTag = secondaryTag;
    adaptation.summary.counterRead = describeCounter(primaryTag);
    adaptation.summary.breakableRead = !!primaryTag;
    adaptation.summary.style = style;
    adaptation.summary.adaptationStrength = strength;
    adaptation.summary.nearestEnemyDistNorm = clamp(nearestNorm, 0, 1);
    adaptation.summary.zone = adaptation.lastEvents.playerZone || 'mid';  }
  function resetRecent(level){
    var r = adaptation.recent;
    Object.keys(r).forEach(function(k){ r[k] = 0; });
    adaptation.levelStartedAt = Date.now();
    adaptation.levelObserved = Number(level) || read('currentLevel', 1) || 1;
    runtime.shotWindowUntil = 0;
    runtime.shotResolved = false;
    runtime.burstCount = 0;
    runtime.threatDistAtStart = null;
    runtime.threatResolved = true;
    runtime.prevEnemyThreatCount = 0;
    runtime.prevTeleportCount = 0;
    runtime.prevProjCount = projectiles().length;
    runtime.prevHealth = healthValue();
    record('adaptive-level-reset', { level: adaptation.levelObserved });
  }
  function commitLevel(level){
    var lvl = Number(level) || adaptation.levelObserved || read('currentLevel', 1) || 1;
    if (adaptation.lastCommittedLevel === lvl) return false;
    var h = adaptation.history;
    var r = adaptation.recent;
    h.distanceFar = h.distanceFar * 0.82 + (Number(r.distanceFarEMA) || 0) * 0.18;
    h.leftAfterShot = h.leftAfterShot * 0.82 + (Number(r.leftAfterShotEMA) || 0) * 0.18;
    h.rightAfterShot = h.rightAfterShot * 0.82 + (Number(r.rightAfterShotEMA) || 0) * 0.18;
    h.stationary = h.stationary * 0.82 + (Number(r.stationaryEMA) || 0) * 0.18;
    h.aggression = h.aggression * 0.82 + (Number(r.aggressionEMA) || 0) * 0.18;
    h.burstSpam = h.burstSpam * 0.82 + (Number(r.burstSpamEMA) || 0) * 0.18;
    h.panicDodge = h.panicDodge * 0.82 + (Number(r.panicDodgeEMA) || 0) * 0.18;
    h.laneRepeat = h.laneRepeat * 0.82 + (Number(r.laneRepeatEMA) || 0) * 0.18;
    h.antiTeleportSkill = h.antiTeleportSkill * 0.82 + (Number(r.antiTeleportSkillEMA) || 0) * 0.18;
    h.retreatAfterThreat = h.retreatAfterThreat * 0.82 + (Number(r.retreatAfterThreatEMA) || 0) * 0.18;
    adaptation.lastCommittedLevel = lvl;
    record('adaptive-level-commit', {
      level: lvl,
      style: adaptation.summary && adaptation.summary.style || 'neutral',
      tags: adaptation.summary && adaptation.summary.topTags || []
    });
    return true;
  }
  function getSnapshot(){
    return {
      enabled: !!adaptation.enabled,
      levelObserved: adaptation.levelObserved,
      levelStartedAt: adaptation.levelStartedAt,
      tags: Object.assign({}, adaptation.tags),
      weights: Object.assign({}, adaptation.weights),
      recent: Object.assign({}, adaptation.recent),
      history: Object.assign({}, adaptation.history),
      summary: Object.assign({}, adaptation.summary)
    };
  }
  function getEnemyTuning(enemy, info){
    var level = read('currentLevel', 1);
    var strength = adaptationStrength(level);
    var role = (enemy && enemy.adaptiveRole) || (enemy && enemy.isBoss ? 'boss' : '');
    var primaryTag = (adaptation.summary && adaptation.summary.primaryTag) || '';
    var secondaryTag = (adaptation.summary && adaptation.summary.secondaryTag) || '';
    var nowMs = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
    if (!role){
      var temperId = enemy && enemy.temperament && enemy.temperament.id;
      if (temperId === 'rushdown') role = 'gapCloser';
      else if (temperId === 'skirmisher') role = 'flanker';
      else if (temperId === 'trickster') role = 'faker';
      else role = 'reader';
      try{ if (enemy && !enemy.isBoss) enemy.adaptiveRole = role; }catch(_){}
    }

    if (enemy && !enemy.isBoss){
      if (!enemy.adaptiveCounterTag || nowMs >= (enemy.adaptiveCounterUntil || 0)){
        enemy.adaptiveCounterTag = primaryTag || secondaryTag || '';
        enemy.adaptiveCounterUntil = nowMs + 1900 + Math.random() * 900;
      }
      if (enemy.adaptiveCounterTag && playerBrokeRead(enemy.adaptiveCounterTag) && nowMs < (enemy.adaptiveCounterUntil || 0)){
        enemy.adaptivePunishUntil = Math.max(enemy.adaptivePunishUntil || 0, nowMs + 900 + Math.random() * 240);
      }
    }

    var focusTag = (enemy && enemy.adaptiveCounterTag) || primaryTag || secondaryTag || '';
    var exposed = !!(enemy && (enemy.adaptivePunishUntil || 0) > nowMs);
    var tune = {
      role: role,
      strength: strength,
      primaryTag: primaryTag,
      secondaryTag: secondaryTag,
      focusTag: focusTag,
      counterLabel: describeCounter(focusTag || primaryTag),
      exposed: exposed,
      aimLeadBiasX: adaptation.weights.aimLeadBiasX,
      burstDelayMix: adaptation.weights.burstDelayMix,
      flankTeleportBias: adaptation.weights.flankTeleportBias,
      gapCloseBonus: adaptation.weights.gapCloseBias,
      crossEvadeBonus: adaptation.weights.crossEvadeBias,
      fakeoutBonus: adaptation.weights.fakeoutBias,
      punishRetreatBonus: adaptation.weights.punishRetreatBias,
      crossEvadeMul: clamp(1 + adaptation.weights.crossEvadeBias * 0.95, 0.8, 1.55),
      teleportMul: clamp(1 + adaptation.weights.flankTeleportBias * 1.25, 0.75, 1.75),
      dodgeMul: clamp(1 + (adaptation.tags.shotSpammer ? 0.18 : 0) * Math.max(0.15, strength), 0.85, 1.28),
      exposedMul: exposed ? 0.64 : 1
    };

    if (focusTag === 'rangedKiter'){
      tune.gapCloseBonus = clamp(tune.gapCloseBonus + 0.15 * (0.55 + strength), -0.15, 0.68);
      tune.flankTeleportBias = clamp(tune.flankTeleportBias + 0.08 * (0.50 + strength), -0.18, 0.72);
    } else if (focusTag === 'laneRepeater'){
      tune.punishRetreatBonus = clamp(tune.punishRetreatBonus + 0.18 * (0.50 + strength), 0, 0.68);
      tune.flankTeleportBias = clamp(tune.flankTeleportBias + 0.10 * (0.50 + strength), -0.15, 0.72);
      tune.aimLeadBiasX += (adaptation.lastEvents.playerZone === 'left' ? -0.12 : (adaptation.lastEvents.playerZone === 'right' ? 0.12 : 0));
    } else if (focusTag === 'panicDasher'){
      tune.burstDelayMix = clamp(tune.burstDelayMix + 0.16 * (0.45 + strength), 0, 0.58);
      tune.fakeoutBonus = clamp(tune.fakeoutBonus + 0.16 * (0.45 + strength), 0, 0.60);
    } else if (focusTag === 'leftDodger'){
      tune.aimLeadBiasX = clamp(tune.aimLeadBiasX - 0.10 * (0.45 + strength), -0.42, 0.42);
      tune.punishRetreatBonus = clamp(tune.punishRetreatBonus + 0.08 * (0.45 + strength), 0, 0.56);
    } else if (focusTag === 'rightDodger'){
      tune.aimLeadBiasX = clamp(tune.aimLeadBiasX + 0.10 * (0.45 + strength), -0.42, 0.42);
      tune.punishRetreatBonus = clamp(tune.punishRetreatBonus + 0.08 * (0.45 + strength), 0, 0.56);
    } else if (focusTag === 'teleportWeak'){
      tune.flankTeleportBias = clamp(tune.flankTeleportBias + 0.18 * (0.50 + strength), -0.15, 0.74);
      tune.teleportMul = clamp(tune.teleportMul + 0.14 + strength * 0.12, 0.75, 1.95);
    } else if (focusTag === 'teleportStrong'){
      tune.flankTeleportBias = clamp(tune.flankTeleportBias - 0.12 * (0.50 + strength), -0.22, 0.55);
      tune.teleportMul = clamp(tune.teleportMul - 0.14, 0.68, 1.60);
      tune.gapCloseBonus = clamp(tune.gapCloseBonus + 0.08, -0.16, 0.58);
    } else if (focusTag === 'camping'){
      tune.flankTeleportBias = clamp(tune.flankTeleportBias + 0.18 * (0.50 + strength), -0.15, 0.72);
      tune.gapCloseBonus = clamp(tune.gapCloseBonus + 0.08 * (0.50 + strength), -0.15, 0.58);
    } else if (focusTag === 'shotSpammer'){
      tune.crossEvadeBonus = clamp(tune.crossEvadeBonus + 0.16 * (0.50 + strength), 0, 0.56);
      tune.crossEvadeMul = clamp(tune.crossEvadeMul + 0.16, 0.85, 1.72);
      tune.fakeoutBonus = clamp(tune.fakeoutBonus + 0.10 * (0.50 + strength), 0, 0.58);
    }

    if (role === 'gapCloser'){
      tune.gapCloseBonus = clamp(tune.gapCloseBonus + 0.12 * (0.50 + strength), -0.15, 0.70);
    } else if (role === 'flanker'){
      tune.flankTeleportBias = clamp(tune.flankTeleportBias + 0.14 * (0.50 + strength), -0.15, 0.80);
      tune.teleportMul = clamp(tune.teleportMul + 0.12, 0.75, 1.98);
    } else if (role === 'faker'){
      tune.fakeoutBonus = clamp(tune.fakeoutBonus + 0.14 * (0.50 + strength), 0, 0.62);
      tune.burstDelayMix = clamp(tune.burstDelayMix + 0.08, 0, 0.55);
    }

    if (exposed){
      tune.gapCloseBonus *= 0.55;
      tune.flankTeleportBias *= 0.62;
      tune.crossEvadeMul = clamp(tune.crossEvadeMul * 0.74, 0.72, 1.45);
      tune.dodgeMul = clamp(tune.dodgeMul * 0.78, 0.70, 1.20);
      tune.fakeoutBonus *= 0.45;
      tune.burstDelayMix *= 0.58;
    }

    if (info && typeof info.dx === 'number'){
      tune.preferredLeadDir = info.dx < 0 ? 'left' : 'right';
    }
    return tune;
  }
  function observePlayer(dt, ts){
    if (!adaptation || adaptation.enabled !== true) return false;

    var level = Number(read('currentLevel', 1)) || 1;
    if (adaptation.levelObserved == null){
      adaptation.levelObserved = level;
      adaptation.levelStartedAt = Date.now();
    } else if (level !== adaptation.levelObserved){
      commitLevel(adaptation.levelObserved);
      resetRecent(level);
    }

    if (!!read('gameEnded', false) && !runtime.lastGameEnded){
      commitLevel(level);
    }
    runtime.lastGameEnded = !!read('gameEnded', false);

    var pl = player();
    if (!pl) return false;

    var active = !read('gameEnded', false) && !read('levelTransitionActive', false);
    var list = enemies();
    var proj = projectiles();
    var pc = playerCenter(pl);
    var zone = zoneForX(pc.x);
    adaptation.lastEvents.playerZone = zone;

    if (runtime.prevPlayerX == null){
      runtime.prevPlayerX = pc.x;
      runtime.prevPlayerY = pc.y;
      runtime.prevProjCount = proj.length;
      runtime.prevHealth = healthValue();
      runtime.prevZone = zone;
      runtime.lastSampleTs = ts || performance.now();
    }

    var sampleDt = Math.max(0.001, Number(dt) || Math.max(0.001, ((ts || performance.now()) - runtime.lastSampleTs) / 1000) || 0.016);
    runtime.lastSampleTs = ts || performance.now();
    var vx = (pc.x - runtime.prevPlayerX) / sampleDt;
    var vy = (pc.y - runtime.prevPlayerY) / sampleDt;
    var speed = Math.sqrt(vx * vx + vy * vy);
    var nearest = nearestEnemyInfo(pl, list);

    if (active){
      adaptation.recent.distanceFarEMA = ema(adaptation.recent.distanceFarEMA, nearest.norm, sampleDt, 5.0);
      adaptation.recent.distanceCloseEMA = ema(adaptation.recent.distanceCloseEMA, 1 - nearest.norm, sampleDt, 5.0);
      adaptation.recent.stationaryEMA = ema(adaptation.recent.stationaryEMA, speed < 55 ? 1 : 0, sampleDt, 4.5);
      adaptation.recent.laneRepeatEMA = ema(adaptation.recent.laneRepeatEMA, zone === runtime.prevZone ? 1 : 0, sampleDt, 6.0);
      var aggressionSample = (nearest.enemy && nearest.norm < 0.35) ? 1 : 0;
      if (nearest.enemy && Math.sign(vx || 0) === Math.sign(nearest.dx || 0) && Math.abs(vx) > 90) aggressionSample = 1;
      adaptation.recent.aggressionEMA = ema(adaptation.recent.aggressionEMA, aggressionSample, sampleDt, 5.0);
    }

    var projCount = proj.length;
    var stateName = String(pl.state || '');
    var shotDetected = false;
    if (projCount > runtime.prevProjCount) shotDetected = true;
    if (stateName === 'shoot' && runtime.shotWindowUntil <= (ts || performance.now())) shotDetected = true;
    if (shotDetected){
      var nowTs = ts || performance.now();
      var prevShotAt = runtime.lastShotAt || 0;
      var shotInterval = prevShotAt ? (nowTs - prevShotAt) : 9999;
      adaptation.lastEvents.playerLastShotAt = nowTs;
      if (shotInterval <= 250){
        runtime.burstCount += 1;
      } else {
        runtime.burstCount = 1;
      }
      runtime.lastShotAt = nowTs;
      runtime.shotWindowUntil = nowTs + 450;
      runtime.shotOriginX = pc.x;
      runtime.shotOriginY = pc.y;
      runtime.shotResolved = false;
      var burstSample = (runtime.burstCount >= 3 || shotInterval <= 180) ? 1 : 0;
      adaptation.recent.burstSpamEMA = ema(adaptation.recent.burstSpamEMA, burstSample, sampleDt, 5.5);
    }

    if (!runtime.shotResolved && runtime.shotWindowUntil > (ts || performance.now())){
      var dxFromShot = pc.x - runtime.shotOriginX;
      if (Math.abs(dxFromShot) >= 28){
        if (dxFromShot < 0){
          adaptation.recent.leftAfterShotEMA = ema(adaptation.recent.leftAfterShotEMA, 1, sampleDt, 6.0);
          adaptation.recent.rightAfterShotEMA = ema(adaptation.recent.rightAfterShotEMA, 0, sampleDt, 6.0);
        } else {
          adaptation.recent.rightAfterShotEMA = ema(adaptation.recent.rightAfterShotEMA, 1, sampleDt, 6.0);
          adaptation.recent.leftAfterShotEMA = ema(adaptation.recent.leftAfterShotEMA, 0, sampleDt, 6.0);
        }
        runtime.shotResolved = true;
      }
    } else if (runtime.shotWindowUntil <= (ts || performance.now()) && !runtime.shotResolved){
      adaptation.recent.leftAfterShotEMA = ema(adaptation.recent.leftAfterShotEMA, 0, sampleDt, 6.0);
      adaptation.recent.rightAfterShotEMA = ema(adaptation.recent.rightAfterShotEMA, 0, sampleDt, 6.0);
      runtime.shotResolved = true;
    }

    var threatCount = 0;
    var teleportCount = 0;
    for (var i = 0; i < list.length; i++){
      var e = list[i];
      if (!e || e.dead) continue;
      if (e.state === 'shoot' || e.state === 'attack' || (e.aiPatternTimer || 0) > 0) threatCount += 1;
      if (e.isTeleporting) teleportCount += 1;
    }
    var now = ts || performance.now();
    if (threatCount > runtime.prevEnemyThreatCount){
      adaptation.lastEvents.enemyTelegraphAt = now;
      adaptation.lastEvents.threatWindowUntil = now + 380;
      runtime.threatDistAtStart = nearest.norm;
      runtime.threatResolved = false;
    }
    if (adaptation.lastEvents.threatWindowUntil > now){
      var dodgeSample = (Math.abs(vx) > 180 || Math.abs(vy) > 180) ? 1 : 0;
      adaptation.recent.panicDodgeEMA = ema(adaptation.recent.panicDodgeEMA, dodgeSample, sampleDt, 5.5);
      if (!runtime.threatResolved && runtime.threatDistAtStart != null && nearest.norm > runtime.threatDistAtStart + 0.08){
        adaptation.recent.retreatAfterThreatEMA = ema(adaptation.recent.retreatAfterThreatEMA, 1, sampleDt, 6.0);
        runtime.threatResolved = true;
      }
    } else if (!runtime.threatResolved){
      adaptation.recent.retreatAfterThreatEMA = ema(adaptation.recent.retreatAfterThreatEMA, 0, sampleDt, 6.0);
      runtime.threatResolved = true;
    }

    if (teleportCount > runtime.prevTeleportCount){
      adaptation.lastEvents.playerLastTeleportAt = now;
    }
    var hpNow = healthValue();
    if (adaptation.lastEvents.playerLastTeleportAt && (now - adaptation.lastEvents.playerLastTeleportAt) <= 1200 && hpNow != null && runtime.prevHealth != null){
      var tookHit = hpNow < runtime.prevHealth ? 1 : 0;
      adaptation.recent.antiTeleportSkillEMA = ema(adaptation.recent.antiTeleportSkillEMA, tookHit ? 0 : 1, sampleDt, 7.5);
    }

    refreshTagsAndWeights(level, nearest.norm);

    runtime.prevPlayerX = pc.x;
    runtime.prevPlayerY = pc.y;
    runtime.prevProjCount = projCount;
    runtime.prevEnemyThreatCount = threatCount;
    runtime.prevTeleportCount = teleportCount;
    runtime.prevHealth = hpNow;
    runtime.prevZone = zone;
    return true;
  }

  var domain = app.domains.define('adaptiveDirector', {
    isEnabled: function(){ return !!adaptation.enabled; },
    setEnabled: syncEnabled,
    resetRecent: function(level){ resetRecent(level); return true; },
    commitLevel: function(level){ return commitLevel(level); },
    observePlayer: observePlayer,
    getEnemyTuning: getEnemyTuning,
    getSnapshot: getSnapshot,
    getState: function(){ return adaptation; }
  }, {
    owner: '52-adaptive-director-domain',
    phase: 'phase-1-observer'
  });

  if (app.loop && typeof app.loop.addAfter === 'function'){
    app.loop.addAfter(function(dt, ts){
      try{ observePlayer(dt, ts); }catch(_){}
    });
  }

  try{
    if (typeof window.addEventListener === 'function'){
      window.addEventListener('beforeunload', function(){
        try{ if (!read('gameEnded', false)) commitLevel(read('currentLevel', 1)); }catch(_){}
      });
    }
  }catch(_){}

  record('adaptive-director-ready', { enabled: !!adaptation.enabled });
})();