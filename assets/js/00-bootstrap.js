"use strict";
(function(){
  const app = window.GameApp = window.GameApp || {};
  app.version = "top36-refactor-5-adaptive-phase1";
  app.loadedModules = [];
  app.moduleMeta = app.moduleMeta || {};
  app.registerModule = function(name, meta){
    app.loadedModules.push(name);
    app.moduleMeta[name] = Object.assign({ loadedAt: new Date().toISOString() }, meta || {});
  };
  app.dom = app.dom || {
    cache: new Map(),
    get(selector, root){
      const scope = root || document;
      const key = scope === document ? selector : `${selector}::scoped`;
      if (!this.cache.has(key)) this.cache.set(key, scope.querySelector(selector));
      return this.cache.get(key);
    },
    getAll(selector, root){
      return Array.from((root || document).querySelectorAll(selector));
    },
    clear(){ this.cache.clear(); }
  };
  app.utils = app.utils || {
    clamp(value, min, max){ return Math.max(min, Math.min(max, value)); },
    noop(){},
    defineAccessor(target, key, getter, setter){
      try{
        Object.defineProperty(target, key, {
          configurable: true,
          enumerable: true,
          get: getter,
          set: setter || function(){}
        });
        return true;
      }catch(_){ return false; }
    }
  };
  app.state = app.state || {};
  app.stateMeta = app.stateMeta || {};
  app.bindState = function(name, getter, setter, meta){
    if (typeof getter !== 'function') return false;
    const ok = app.utils.defineAccessor(app.state, name, getter, setter);
    if (!ok) return false;
    app.stateMeta[name] = Object.assign({ boundAt: new Date().toISOString() }, meta || {});
    if (!Object.getOwnPropertyDescriptor(window, name)){
      app.utils.defineAccessor(window, name, getter, setter);
    }
    return true;
  };
  app.actions = app.actions || {};
  app.bindAction = function(name, fn, meta){
    if (typeof fn !== 'function') return false;
    app.actions[name] = fn;
    app.moduleMeta['action:'+name] = Object.assign({ boundAt: new Date().toISOString() }, meta || {});
    return true;
  };
  app.loop = app.loop || {
    frameHandle: null,
    isRunning: false,
    lastTs: 0,
    beforeFrame: [],
    frame: null,
    afterFrame: [],
    setFrame(fn){ this.frame = fn; },
    addBefore(fn){ if (typeof fn === 'function') this.beforeFrame.push(fn); },
    addAfter(fn){ if (typeof fn === 'function') this.afterFrame.push(fn); },
    start(initialTs){
      if (this.isRunning) return;
      this.isRunning = true;
      this.lastTs = typeof initialTs === 'number' ? initialTs : performance.now();
      const tick = (ts) => {
        if (!this.isRunning) return;
        const prev = this.lastTs || ts;
        const rawDt = Math.min(0.05, Math.max(0, (ts - prev) / 1000));
        let dt = rawDt;
        try{
          const runtime = window.GameApp && GameApp.runtime;
          const scale = runtime && typeof runtime.getTimeScale === 'function' ? Number(runtime.getTimeScale(ts)) : 1;
          if (Number.isFinite(scale) && scale > 0 && scale !== 1) dt = rawDt * Math.max(0.05, Math.min(1, scale));
        }catch(_){}
        this.lastTs = ts;
        for (const hook of this.beforeFrame){ try{ hook(dt, ts); }catch(_){} }
        try{ if (typeof this.frame === 'function') this.frame(dt, ts); }catch(_){}
        for (const hook of this.afterFrame){ try{ hook(dt, ts); }catch(_){} }
        if (!this.isRunning){ this.frameHandle = null; return; }
        this.frameHandle = requestAnimationFrame(tick);
      };
      this.frameHandle = requestAnimationFrame(tick);
    },
    stop(){
      this.isRunning = false;
      if (this.frameHandle) cancelAnimationFrame(this.frameHandle);
      this.frameHandle = null;
    }
  };
  app.debug = app.debug || {
    snapshot(){
      const s = app.state || {};
      return {
        level: (()=>{ try{return s.currentLevel;}catch(_){return undefined;} })(),
        kills: (()=>{ try{return s.kills;}catch(_){return undefined;} })(),
        enemySpawnsEnabled: (()=>{ try{return s.enemySpawnsEnabled;}catch(_){return undefined;} })(),
        levelTransitionActive: (()=>{ try{return s.levelTransitionActive;}catch(_){return undefined;} })(),
        gameEnded: (()=>{ try{return s.gameEnded;}catch(_){return undefined;} })(),
        bossIntroDone: window.__bossIntroDone === true,
        bossInvulnerable: window.__bossInvul === true
      };
    }
  };
  app.registerModule("00-bootstrap", {
    role: "namespace-state-loop-debug-hooks"
  });
})();
