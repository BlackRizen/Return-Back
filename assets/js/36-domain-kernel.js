window.GameApp && window.GameApp.registerModule && window.GameApp.registerModule('36-domain-kernel', {"entryMarker": "// domain kernel", "description": "Creates domain registry/helpers used by player/combat/level/boss/audio/ui/pickups/runner modules."});
/*__MODULE_BOUNDARY__*/
(function(){
  var app = window.GameApp;
  if (!app || window.__domainKernelInstalled) return;
  window.__domainKernelInstalled = true;

  var domains = app.domains = app.domains || {
    registry: {},
    define: function(name, api, meta){
      if (!name) return null;
      var payload = api || {};
      payload.__meta = Object.assign({ definedAt: new Date().toISOString() }, meta || {});
      this.registry[name] = payload;
      return payload;
    },
    get: function(name){ return this.registry[name] || null; },
    names: function(){ return Object.keys(this.registry); }
  };

  app.helpers = app.helpers || {};
  app.helpers.safeCall = function(fn, ctx, args, fallback){
    try{ return typeof fn === 'function' ? fn.apply(ctx || null, args || []) : fallback; }catch(_){ return fallback; }
  };
  app.helpers.readGlobal = function(name, fallback){
    try{ return typeof window[name] !== 'undefined' ? window[name] : fallback; }catch(_){ return fallback; }
  };
  app.helpers.readState = function(name, fallback){
    try{
      if (app.state && typeof app.state[name] !== 'undefined') return app.state[name];
      return typeof window[name] !== 'undefined' ? window[name] : fallback;
    }catch(_){ return fallback; }
  };
  app.helpers.listAudio = function(){
    var out = [];
    try{
      if (!window.Sounds) return out;
      for (var k in Sounds){
        try{ if (Sounds[k] instanceof Audio) out.push({ key:k, audio:Sounds[k] }); }catch(_){ }
      }
    }catch(_){ }
    return out;
  };
  app.helpers.poll = function(test, effect, options){
    options = options || {};
    var every = typeof options.every === 'number' ? options.every : 250;
    var max = typeof options.max === 'number' ? options.max : 40;
    var count = 0;
    var handle = setInterval(function(){
      count += 1;
      var ok = false;
      try{ ok = !!test(count); }catch(_){ ok = false; }
      if (ok){
        try{ effect(count); }catch(_){ }
        if (!options.repeat) clearInterval(handle);
      }
      if (count >= max) clearInterval(handle);
    }, every);
    return function(){ try{ clearInterval(handle); }catch(_){ } };
  };

  app.debug = app.debug || {};
  app.debug.domains = function(){
    return (app.domains && app.domains.names ? app.domains.names() : []).map(function(name){
      var d = app.domains.get(name) || {};
      return { name:name, meta:d.__meta || {} };
    });
  };
})();
