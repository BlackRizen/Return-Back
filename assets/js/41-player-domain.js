window.GameApp && window.GameApp.registerModule && window.GameApp.registerModule('41-player-domain', {"entryMarker": "// player domain", "description": "Player facade: movement, physics, pose sync and safe snapshot helpers."});
/*__MODULE_BOUNDARY__*/
(function(){
  var app = window.GameApp; if (!app || !app.domains) return;
  function readPlayer(){ try{ return app.state.player || window.player || null; }catch(_){ return null; } }
  var domain = app.domains.define('player', {
    get: readPlayer,
    snapshot: function(){
      var p = readPlayer();
      if (!p) return null;
      return {
        x:p.x, y:p.y, w:p.w, h:p.h, vx:p.vx, vy:p.vy,
        state:p.state, facing:p.facing, onGround:!!p.onGround,
        hp: app.helpers.readState('health', null)
      };
    },
    sync: function(){ return app.helpers.safeCall(window.syncPlayer); },
    clamp: function(){ return app.helpers.safeCall(window.clampPlayer); },
    updatePhysics: function(dt){ return app.helpers.safeCall(window.applyPhysics, null, [dt]); },
    updateSprite: function(dt){ return app.helpers.safeCall(window.updateSprite, null, [dt]); },
    tryShoot: function(){ return app.helpers.safeCall(window.tryShoot); },
    slide: function(dir){ return app.helpers.safeCall(window.startSlide, null, [dir]); },
    endSlide: function(){ return app.helpers.safeCall(window.endSlideKeepFeet); },
    exitCrouch: function(){ return app.helpers.safeCall(window.exitCrouchKeepFeet); },
    handPosition: function(){ return app.helpers.safeCall(window.handPosition, null, [], null); },
    isAlive: function(){ var p = readPlayer(); return !!(p && p.state !== 'dead' && p.state !== 'predead'); }
  }, { owner:'41-player-domain' });

  app.bindAction('player.sync', domain.sync, { owner:'41-player-domain' });
  app.bindAction('player.tryShoot', domain.tryShoot, { owner:'41-player-domain' });
})();
