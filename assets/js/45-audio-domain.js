window.GameApp && window.GameApp.registerModule && window.GameApp.registerModule('45-audio-domain', {"entryMarker": "// audio domain", "description": "Central audio domain with extracted music routing, boss-track transitions, sound bridge cleanup and diagnostics."});
/*__MODULE_BOUNDARY__*/
(function(){
  var app = window.GameApp; if (!app || !app.domains) return;

  function soundBag(){
    try{
      if (typeof Sounds !== 'undefined'){
        if (!window.Sounds || window.Sounds !== Sounds) window.Sounds = Sounds;
        return Sounds;
      }
    }catch(_){ }
    try{ return window.Sounds || null; }catch(_){ return null; }
  }
  function entries(){
    var bag = soundBag();
    if (!bag) return [];
    return Object.keys(bag).map(function(key){ return { key:key, audio:bag[key] }; }).filter(function(item){
      try{ return item.audio instanceof Audio; }catch(_){ return false; }
    });
  }
  function getAudio(name){ var bag = soundBag(); return bag && bag[name] ? bag[name] : null; }
  function eachAudio(fn){ entries().forEach(function(item){ try{ fn(item.audio, item.key); }catch(_){ } }); }

  var rawStartMusic = window.startMusic;
  var rawStartMenuMusic = window.startMenuMusic;
  var rawPlaySound = window.playSound;
  var rawApplyVolumes = window.applyVolumes;

  function pauseTracks(names){
    (names || []).forEach(function(name){
      var a = getAudio(name);
      if (!a) return;
      try{ a.pause && a.pause(); }catch(_){ }
    });
    return true;
  }
  function startGameplayMusic(){
    soundBag();
    pauseTracks(['startBgm', 'bossEntrance']);
    if (typeof rawStartMusic === 'function') return rawStartMusic();
    var a = getAudio('bgm');
    if (!a) return false;
    try{ a.currentTime = 0; a.play && a.play().catch(function(){}); return true; }catch(_){ return false; }
  }
  function startMenuMusic(){
    soundBag();
    pauseTracks(['bgm', 'bossEntrance']);
    if (typeof rawStartMenuMusic === 'function') return rawStartMenuMusic();
    var a = getAudio('startBgm');
    if (!a) return false;
    try{ a.play && a.play().catch(function(){}); return true; }catch(_){ return false; }
  }
  function playSoundBridge(audio){
    soundBag();
    if (typeof rawPlaySound === 'function') return rawPlaySound(audio);
    try{ audio && audio.play && audio.play(); return true; }catch(_){ return false; }
  }
  function applyVolumesBridge(){
    soundBag();
    return typeof rawApplyVolumes === 'function' ? rawApplyVolumes() : true;
  }
  function pauseGameplayMusic(){
    pauseTracks(['bgm', 'startBgm', 'bossEntrance']);
    return true;
  }
  function enterBossLevel(options){
    options = options || {};
    soundBag();
    pauseTracks(['bgm', 'startBgm']);
    var a = getAudio('bossEntrance');
    if (!a){
      try{
        var bag = soundBag() || (window.Sounds = window.Sounds || {});
        bag.bossEntrance = new Audio('bossentrance.mp3');
        bag.bossEntrance.loop = true;
        a = bag.bossEntrance;
      }catch(_){ return false; }
    }
    try{ a.loop = true; }catch(_){ }
    if (options.restart !== false){ try{ a.currentTime = 0; }catch(_){ } }
    if (options.pauseOnly) return true;
    try{ a.play && a.play().catch(function(){}); return true; }catch(_){ return false; }
  }
  function exitBossLevel(){
    pauseTracks(['bossEntrance']);
    return startGameplayMusic();
  }

  var domain = app.domains.define('audio', {
    list: function(){ return entries().map(function(item){ return item.key; }); },
    snapshot: function(){
      return entries().map(function(item){
        var a = item.audio;
        return {
          key:item.key,
          paused:!!a.paused,
          muted:!!a.muted,
          volume:typeof a.volume === 'number' ? a.volume : null,
          currentTime:a.currentTime || 0
        };
      });
    },
    syncGlobalSounds: function(){ return !!soundBag(); },
    play: function(name){ var a = getAudio(name); return a ? playSoundBridge(a) : false; },
    playSound: playSoundBridge,
    applyVolumes: applyVolumesBridge,
    pauseAll: function(){ eachAudio(function(a){ try{ a.pause(); }catch(_){ } }); return true; },
    pauseGameplayMusic: pauseGameplayMusic,
    muteAll: function(flag){ eachAudio(function(a){ try{ a.muted = !!flag; }catch(_){ } }); return true; },
    setMusicVolume: function(v){ ['bgm','startBgm','bossEntrance'].forEach(function(name){ var a=getAudio(name); if(a) try{ a.volume = v; }catch(_){} }); return true; },
    setSfxVolume: function(v){ eachAudio(function(a, key){ if (key==='bgm' || key==='startBgm' || key==='bossEntrance') return; try{ a.volume = v; }catch(_){ } }); return true; },
    startGameplayMusic: startGameplayMusic,
    startMenuMusic: startMenuMusic,
    enterBossLevel: enterBossLevel,
    exitBossLevel: exitBossLevel,
    resumeGameplay: function(){
      if ((app.helpers.readState('currentLevel', 1) || 1) === 10) return enterBossLevel({ restart:true });
      return startGameplayMusic();
    }
  }, { owner:'45-audio-domain' });

  domain.syncGlobalSounds();
  window.startMusic = function(){ return domain.startGameplayMusic(); };
  window.startMenuMusic = function(){ return domain.startMenuMusic(); };
  window.playSound = function(audio){ return domain.playSound(audio); };
  window.applyVolumes = function(){ return domain.applyVolumes(); };
  try{ startMusic = window.startMusic; }catch(_){ }
  try{ startMenuMusic = window.startMenuMusic; }catch(_){ }
  try{ playSound = window.playSound; }catch(_){ }
  try{ applyVolumes = window.applyVolumes; }catch(_){ }

  app.bindAction('startMusic', window.startMusic, { owner:'45-audio-domain', extracted:true });
  app.bindAction('startMenuMusic', window.startMenuMusic, { owner:'45-audio-domain', extracted:true });
  app.bindAction('playSound', window.playSound, { owner:'45-audio-domain', extracted:true });
})();
