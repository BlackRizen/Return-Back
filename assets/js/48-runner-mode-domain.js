window.GameApp && window.GameApp.registerModule && window.GameApp.registerModule('48-runner-mode-domain', {"entryMarker": "// runner mode domain", "description": "Runner mode facade with start/stop/update helpers and status based on DOM/game flags."});
/*__MODULE_BOUNDARY__*/
(function(){
  var app = window.GameApp; if (!app || !app.domains) return;
  function active(){
    try{ return !!(document.body && document.body.classList.contains('runner-mode-active')); }catch(_){ return false; }
  }
  var domain = app.domains.define('runnerMode', {
    isActive: active,
    start: function(){ return app.helpers.safeCall(window.startRunnerMode); },
    stop: function(){ return app.helpers.safeCall(window.stopRunnerMode); },
    updateDistance: function(dt){ return app.helpers.safeCall(window.updateRunnerDistance, null, [dt]); },
    updateFuel: function(dt){ return app.helpers.safeCall(window.updateFuel, null, [dt]); },
    updateBoost: function(dt){ return app.helpers.safeCall(window.updateBoost, null, [dt]); },
    updateAsteroids: function(dt){ return app.helpers.safeCall(window.updateAsteroids, null, [dt]); },
    updatePickups: function(dt){ return app.helpers.safeCall(window.updatePickups, null, [dt]); },
    snapshot: function(){
      return {
        active: active(),
        distanceText: (function(){ try{ var el=document.getElementById('timer'); return el ? (el.textContent || '').trim() : ''; }catch(_){ return ''; } })(),
        fuelWidth: (function(){ try{ var el=document.querySelector('#runnerMode .fuel-bar-fill'); return el ? el.style.width : ''; }catch(_){ return ''; } })(),
        boostDashoffset: (function(){ try{ var el=document.querySelector('#runnerMode .boost-ring-fill'); return el ? el.style.strokeDashoffset : ''; }catch(_){ return ''; } })()
      };
    }
  }, { owner:'48-runner-mode-domain' });
})();
