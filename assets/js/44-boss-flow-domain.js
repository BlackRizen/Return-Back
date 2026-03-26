window.GameApp && window.GameApp.registerModule && window.GameApp.registerModule('44-boss-flow-domain', {"entryMarker": "// boss flow domain", "description": "Boss domain with extracted intro orchestration, intro flags and cinematic action wrappers."});
/*__MODULE_BOUNDARY__*/
(function(){
  var app = window.GameApp; if (!app || !app.domains) return;

  function read(name, fallback){ return app.helpers.readState(name, fallback); }
  function write(name, value){
    try{
      if (app.state && typeof app.state[name] !== 'undefined') { app.state[name] = value; return value; }
    }catch(_){ }
    try{ window[name] = value; }catch(_){ }
    return value;
  }
  function call(fn, ctx, args, fallback){ return app.helpers.safeCall(fn, ctx, args, fallback); }
  function enemies(){ try{ return app.state.enemies || window.enemies || []; }catch(_){ return []; } }
  function boss(){
    try{ return enemies().find(function(e){ return e && e.isBoss && !e.dead; }) || null; }catch(_){ return null; }
  }
  function audio(){ return app.domains.get('audio'); }
  function pauseAllGameAudio(){
    var aud = audio();
    if (aud && typeof aud.pauseGameplayMusic === 'function') return aud.pauseGameplayMusic();
    try{ window.Sounds && Sounds.bgm && Sounds.bgm.pause && Sounds.bgm.pause(); }catch(_){ }
    try{ window.Sounds && Sounds.startBgm && Sounds.startBgm.pause && Sounds.startBgm.pause(); }catch(_){ }
    try{ window.Sounds && Sounds.bossEntrance && Sounds.bossEntrance.pause && Sounds.bossEntrance.pause(); }catch(_){ }
    return true;
  }
  function resumeBossTrack(){
    var aud = audio();
    if (aud && typeof aud.enterBossLevel === 'function') return aud.enterBossLevel({ restart:true });
    try{
      if (!window.Sounds) window.Sounds = (typeof Sounds !== 'undefined' ? Sounds : {});
      if (!Sounds.bossEntrance){ Sounds.bossEntrance = new Audio('bossentrance.mp3'); }
      Sounds.bossEntrance.loop = true;
      Sounds.bossEntrance.currentTime = 0;
      Sounds.bossEntrance.play && Sounds.bossEntrance.play().catch(function(){});
      return true;
    }catch(_){ return false; }
  }
  function hideIntroOverlay(){
    try{ var ov = document.getElementById('BossIntroOv'); if (ov) ov.style.display = 'none'; }catch(_){ }
    try{ var vid = document.getElementById('BossIntroVid'); if (vid){ vid.pause(); vid.currentTime = 0; } }catch(_){ }
  }
  function finishIntro(session){
    if (!session || session.finished) return false;
    session.finished = true;
    try{ if (session.skip && session.onSkip) session.skip.removeEventListener('click', session.onSkip); }catch(_){ }
    try{ if (session.vid && session.onEnded) session.vid.removeEventListener('ended', session.onEnded); }catch(_){ }
    hideIntroOverlay();
    write('controlsLocked', false);
    try{ if (app.boss && typeof app.boss.markIntroDone === 'function') app.boss.markIntroDone(); else window.__bossIntroDone = true; }catch(_){ }
    try{ if (typeof session.cb === 'function') session.cb(); }catch(_){ }
    return true;
  }
  function showIntro(cb){
    var ov = document.getElementById('BossIntroOv');
    var vid = document.getElementById('BossIntroVid');
    var skip = document.getElementById('BossIntroSkip');
    if (!ov || !vid || !skip){
      try{ if (app.boss && typeof app.boss.markIntroDone === 'function') app.boss.markIntroDone(); else window.__bossIntroDone = true; }catch(_){ }
      if (typeof cb === 'function') cb();
      return false;
    }

    try{ if (window.__bossIntroSession && !window.__bossIntroSession.finished) finishIntro(window.__bossIntroSession); }catch(_){ }
    write('controlsLocked', true);
    write('enemySpawnsEnabled', false);
    write('levelTransitionActive', true);
    pauseAllGameAudio();

    ov.style.display = 'flex';
    try{ vid.currentTime = 0; }catch(_){ }

    var session = { finished:false, cb:cb, ov:ov, vid:vid, skip:skip, onSkip:null, onEnded:null };
    session.onSkip = function(ev){ try{ ev.stopPropagation(); }catch(_){ } finishIntro(session); };
    session.onEnded = function(){ finishIntro(session); };
    window.__bossIntroSession = session;

    skip.addEventListener('click', session.onSkip, { once:true });
    vid.addEventListener('ended', session.onEnded, { once:true });

    try{ vid.muted = false; }catch(_){ }
    try{
      var p = vid.play();
      if (p && typeof p.catch === 'function'){
        p.catch(function(){
          try{ vid.muted = true; }catch(_){ }
          vid.play && vid.play().catch(function(){});
        });
      }
    }catch(_){ }
    return true;
  }

  var domain = app.domains.define('bossFlow', {
    getBoss: boss,
    hasBoss: function(){ return !!boss(); },
    flags: function(){
      return {
        introDone: window.__bossIntroDone === true,
        invulnerable: window.__bossInvul === true,
        blockFire: window.__blockF === true,
        controlsLocked: !!read('controlsLocked', false)
      };
    },
    resetIntro: function(){ return call(app.boss && app.boss.resetIntro); },
    markIntroDone: function(){ return call(app.boss && app.boss.markIntroDone); },
    pauseAllGameAudio: pauseAllGameAudio,
    resumeBossTrack: resumeBossTrack,
    finishIntro: function(){ return finishIntro(window.__bossIntroSession); },
    showIntro: showIntro,
    showRoar: function(e, ms){ return call(window.showBossRoar, null, [e || boss(), ms]); },
    showQuake: function(e, ms){ return call(window.showQuake, null, [e || boss(), ms]); },
    firePattern: function(e){ return call(window.bossAttackFire, null, [e || boss()]); },
    jumpSlam: function(e){ return call(window.__bossJumpSlamAndWave, null, [e || boss()]); }
  }, { owner:'44-boss-flow-domain' });

  window.showBossIntro = function(cb){ return domain.showIntro(cb); };
  try{ showBossIntro = window.showBossIntro; }catch(_){ }
  window.__resumeBossTrack = function(){ return domain.resumeBossTrack(); };

  app.bindAction('bossFlow.showIntro', domain.showIntro, { owner:'44-boss-flow-domain', extracted:true });
})();
