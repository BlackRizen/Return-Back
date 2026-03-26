window.GameApp && window.GameApp.registerModule && window.GameApp.registerModule('42-combat-domain', {"entryMarker": "// combat domain", "description": "Combat facade: projectiles, enemies, hit checks and score-aware firing helpers."});
/*__MODULE_BOUNDARY__*/
(function(){
  var app = window.GameApp; if (!app || !app.domains) return;
  function arr(name){ try{ return app.state[name] || window[name] || []; }catch(_){ return []; } }
  var domain = app.domains.define('combat', {
    projectiles: function(){ return arr('projectiles'); },
    enemyProjectiles: function(){ return arr('enemyProjectiles'); },
    enemies: function(){ return arr('enemies'); },
    counts: function(){
      return {
        projectiles: this.projectiles().length,
        enemyProjectiles: this.enemyProjectiles().length,
        enemies: this.enemies().length
      };
    },
    tryShoot: function(){ return app.helpers.safeCall(window.tryShoot); },
    spawnProjectile: function(x, y, dir){ return app.helpers.safeCall(window.spawnProjectile, null, [x, y, dir]); },
    updateProjectiles: function(dt){ return app.helpers.safeCall(window.updateProjectiles, null, [dt]); },
    updateEnemyProjectiles: function(dt){ return app.helpers.safeCall(window.updateEnemyProjectiles, null, [dt]); },
    updateEnemies: function(dt){ return app.helpers.safeCall(window.updateEnemies, null, [dt]); },
    checkHits: function(){ return app.helpers.safeCall(window.checkHits); },
    fireFromPlayer: function(dir){
      var hp = app.helpers.safeCall(window.handPosition, null, [], null);
      if (!hp || typeof hp.x !== 'number' || typeof hp.y !== 'number') return false;
      app.helpers.safeCall(window.spawnProjectile, null, [hp.x, hp.y, dir || (window.player && player.facing) || 'right']);
      return true;
    }
  }, { owner:'42-combat-domain' });

  app.bindAction('combat.tryShoot', domain.tryShoot, { owner:'42-combat-domain' });
})();
