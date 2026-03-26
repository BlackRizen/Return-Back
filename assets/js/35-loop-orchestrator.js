window.GameApp && window.GameApp.registerModule && window.GameApp.registerModule('35-loop-orchestrator', {"entryMarker": "// loop orchestrator bridge", "description": "Routes the main gameplay RAF through GameApp.loop for centralized orchestration and debugging."});
/*__MODULE_BOUNDARY__*/
(function(){
  var app = window.GameApp;
  if (!app || !app.loop || window.__mainLoopBridgeInstalled) return;
  window.__mainLoopBridgeInstalled = true;

  function getTick(){
    try{ return typeof tick === 'function' ? tick : null; }catch(_){ return null; }
  }

  app.bindAction('startMainLoop', function(){
    var frame = getTick();
    if (!frame) return false;
    app.loop.setFrame(function(dt, ts){ frame(dt, ts); });
    app.loop.start();
    return true;
  }, { owner: '35-loop-orchestrator' });

  app.bindAction('stopMainLoop', function(){
    app.loop.stop();
    return true;
  }, { owner: '35-loop-orchestrator' });
})();
