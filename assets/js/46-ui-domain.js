window.GameApp && window.GameApp.registerModule && window.GameApp.registerModule('46-ui-domain', {"entryMarker": "// ui domain", "description": "Central UI/HUD facade for badges, boss HUD and overlay refreshes."});
/*__MODULE_BOUNDARY__*/
(function(){
  var app = window.GameApp; if (!app || !app.domains) return;
  function call(name, args){ return app.helpers.safeCall(window[name], null, args || []); }
  var domain = app.domains.define('ui', {
    renderTopHud: function(){ return call('renderTopHud'); },
    renderScoreBadge: function(){ return call('renderScoreBadge'); },
    renderKills: function(){ return call('renderKills'); },
    updateObjective: function(v){ return call('updateObjective', [v]); },
    renderResourcesHud: function(){ return call('renderResourcesHud'); },
    showBossHud: function(e){ return call('showBossHud', [e]); },
    hideBossHud: function(){ return call('hideBossHud'); },
    refreshAll: function(){
      this.renderTopHud();
      this.renderScoreBadge();
      this.renderKills();
      this.updateObjective(app.helpers.readState('kills', 0) || 0);
      this.renderResourcesHud();
      return true;
    }
  }, { owner:'46-ui-domain' });
})();
