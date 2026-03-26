window.GameApp && window.GameApp.registerModule && window.GameApp.registerModule('95-debug-panel', {"entryMarker":"// debug panel","description":"Runtime debug counters, recent event log and regression checklist overlay for stabilization passes."});
/*__MODULE_BOUNDARY__*/
(function(){
  var app = window.GameApp = window.GameApp || {};
  var metrics = app.debugMetrics = app.debugMetrics || {
    startedAt: new Date().toISOString(),
    counters: {
      bootCalls: 0,
      bootSkipAttempts: 0,
      loopStarts: 0,
      loopStartIgnored: 0,
      loopStops: 0,
      loopStopIgnored: 0,
      startMainLoopCalls: 0,
      stopMainLoopCalls: 0,
      spawnRequests: 0,
      spawnHeld: 0,
      spawnFlushes: 0,
      bossAttackCalls: 0,
      transitionCalls: 0,
      transitionCallsGameplay: 0,
      transitionCallsDebug: 0,
      levelSkipCalls: 0,
      overlayPauses: 0,
      overlayResumes: 0
    },
    recent: [],
    checklist: {},
    wrapped: {}
  };
  var STORAGE_KEY = 'game-debug-checklist-v1';
  var MAX_EVENTS = 18;
  var CHECKLIST = [
    'Fresh boot shows exactly one active gameplay loop after starting.',
    'Level 1 starts with one expected enemy spawn only.',
    'Opening an overlay pauses future spawns without duplicating enemies.',
    'Closing an overlay flushes at most one queued spawn.',
    'Normal level clear triggers one transition only.',
    'Level 10 intro plays once and boss appears once.',
    'Boss first attack triggers once per selector decision.',
    'Death/restart does not preserve stale boss or spawn state.',
    'Countdown tick plays once per second under 10 seconds.',
    'Full refresh and replay still produce the same results.'
  ];

  function nowIso(){ return new Date().toISOString(); }
  function stamp(value){
    if (!value) return '';
    try{ return JSON.stringify(value); }catch(_){ return String(value); }
  }
  function trimEvents(){
    if (metrics.recent.length > MAX_EVENTS) metrics.recent.length = MAX_EVENTS;
  }
  function record(type, details){
    metrics.recent.unshift({
      at: nowIso(),
      type: type,
      details: details || null
    });
    trimEvents();
    render();
  }
  function bump(name, by){
    var n = typeof by === 'number' ? by : 1;
    metrics.counters[name] = (metrics.counters[name] || 0) + n;
    render();
  }
  function loadChecklist(){
    try{
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      var parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') metrics.checklist = parsed;
    }catch(_){}
  }
  function saveChecklist(){
    try{ localStorage.setItem(STORAGE_KEY, JSON.stringify(metrics.checklist || {})); }catch(_){}
  }

  function snapshot(){
    var s = app.debug && typeof app.debug.snapshot === 'function' ? app.debug.snapshot() : {};
    var loop = app.loop || {};
    var spawnCtrl = app.spawnControl || window.GameApp && GameApp.spawnControl || {};
    var enemies = [];
    try{ enemies = app.state.enemies || window.enemies || []; }catch(_){ enemies = []; }
    var bossPresent = false;
    try{ bossPresent = enemies.some(function(e){ return e && e.isBoss && !e.dead; }); }catch(_){ bossPresent = false; }
    return {
      level: safeRead('currentLevel', 1),
      kills: safeRead('kills', 0),
      enemies: enemies.length,
      bossPresent: bossPresent,
      enemySpawnsEnabled: !!safeRead('enemySpawnsEnabled', false),
      levelTransitionActive: !!safeRead('levelTransitionActive', false),
      gameEnded: !!safeRead('gameEnded', false),
      bossIntroDone: window.__bossIntroDone === true,
      bossSpawnPending: !!window.__bossSpawnPending,
      loopRunning: !!loop.isRunning,
      loopFrameHandle: !!loop.frameHandle,
      devSkipEnabled: !!(typeof window.__isDevSkipEnabled === 'function' ? window.__isDevSkipEnabled() : window.__DEV_SKIP_ENABLED),
      oneShotKillEnabled: !!(typeof window.__isOneShotKillEnabled === 'function' ? window.__isOneShotKillEnabled() : window.__ONE_SHOT_KILL),
      perfectDodgeCount: app.debug && app.debug.perfectDodges || 0,
      lastPerfectDodge: app.debug && app.debug.lastPerfectDodge || null,
      timeScale: (function(){ try{ return Number((app.runtime && typeof app.runtime.getTimeScale === 'function' ? app.runtime.getTimeScale() : 1).toFixed(3)); }catch(_){ return 1; } })(),
      adaptiveDirectorEnabled: !!(typeof window.__isAdaptiveDirectorEnabled === 'function' ? window.__isAdaptiveDirectorEnabled() : (app.state && app.state.adaptation && app.state.adaptation.enabled)),
      adaptiveDirector: (function(){
        try{
          var d = app.domains && app.domains.get && app.domains.get('adaptiveDirector');
          if (d && typeof d.getSnapshot === 'function') return d.getSnapshot();
          return app.state && app.state.adaptation || null;
        }catch(_){ return null; }
      })(),
      lastTransitionRequest: app.debug && app.debug.lastTransitionRequest || null,
      spawnPaused: !!spawnCtrl.paused,
      spawnQueued: !!spawnCtrl.queued,
      spawnLastReason: spawnCtrl.lastReason || '',
      lastSpawn: app.debug && app.debug.lastSpawn || null,
      lastBossAttack: app.debug && app.debug.lastBossAttack || null,
      runFinalized: !!(app.runtime && app.runtime.runState && app.runtime.runState.finalized),
      activeActionLocks: (function(){
        try{ return Object.keys(app.runtime && app.runtime.actionLocks || {}); }catch(_){ return []; }
      })(),
      lastFinalize: app.debug && app.debug.lastFinalize || null,
      base: s || {}
    };
  }
  function safeRead(name, fallback){
    try{
      if (app.state && typeof app.state[name] !== 'undefined') return app.state[name];
      if (typeof window[name] !== 'undefined') return window[name];
    }catch(_){}
    return fallback;
  }

  function wrapMethod(target, key, label, hooks){
    if (!target || typeof target[key] !== 'function') return false;
    var original = target[key];
    if (original.__debugWrappedByGameApp) return true;
    function wrapped(){
      var args = Array.prototype.slice.call(arguments);
      if (hooks && typeof hooks.before === 'function'){
        try{ hooks.before.call(this, args, original); }catch(_){}
      }
      var result = original.apply(this, args);
      if (hooks && typeof hooks.after === 'function'){
        try{ hooks.after.call(this, result, args, original); }catch(_){}
      }
      return result;
    }
    wrapped.__debugWrappedByGameApp = true;
    wrapped.__debugWrapLabel = label || key;
    wrapped.__debugOriginal = original;
    target[key] = wrapped;
    return true;
  }

  function installHooks(){
    var ok = false;
    ok = wrapMethod(window, 'boot', 'window.boot', {
      before: function(){
        if (window.__bootStarted) bump('bootSkipAttempts');
        bump('bootCalls');
        record('boot', { bootStarted: !!window.__bootStarted });
      }
    }) || ok;

    if (app.actions){
      ok = wrapMethod(app.actions, 'startMainLoop', 'actions.startMainLoop', {
        before: function(){ bump('startMainLoopCalls'); }
      }) || ok;
      ok = wrapMethod(app.actions, 'stopMainLoop', 'actions.stopMainLoop', {
        before: function(){ bump('stopMainLoopCalls'); }
      }) || ok;
    }

    if (app.loop){
      ok = wrapMethod(app.loop, 'start', 'loop.start', {
        before: function(){
          if (app.loop.isRunning) bump('loopStartIgnored');
          else bump('loopStarts');
          record('loop-start', { alreadyRunning: !!app.loop.isRunning });
        }
      }) || ok;
      ok = wrapMethod(app.loop, 'stop', 'loop.stop', {
        before: function(){
          if (app.loop.isRunning) bump('loopStops');
          else bump('loopStopIgnored');
          record('loop-stop', { wasRunning: !!app.loop.isRunning });
        }
      }) || ok;
    }

    ok = wrapMethod(window, 'beginLevelTransition', 'window.beginLevelTransition', {
      before: function(){
        bump('transitionCalls');
        bump('transitionCallsGameplay');
        record('level-transition', {
          level: safeRead('currentLevel', 1),
          kills: safeRead('kills', 0),
          source: 'gameplay'
        });
      }
    }) || ok;

    if (app.actions){
      ok = wrapMethod(app.actions, 'devSkipNextLevel', 'actions.devSkipNextLevel', {
        before: function(){
          bump('transitionCalls');
          bump('transitionCallsDebug');
          bump('levelSkipCalls');
          record('level-transition', {
            level: safeRead('currentLevel', 1),
            kills: safeRead('kills', 0),
            source: 'dev-skip'
          });
        }
      }) || ok;
    }

    ok = wrapMethod(window, 'pauseEnemySpawns', 'window.pauseEnemySpawns', {
      before: function(args){
        record('spawn-pause-call', { reason: args && args[0] || '' });
      }
    }) || ok;

    ok = wrapMethod(window, 'resumeEnemySpawns', 'window.resumeEnemySpawns', {
      before: function(args){
        record('spawn-resume-call', { delayMs: args && args[0] || 0 });
      }
    }) || ok;

    var spawnDomain = app.domains && app.domains.get && app.domains.get('enemySpawning');
    if (spawnDomain){
      ok = wrapMethod(spawnDomain, 'spawn', 'domain.enemySpawning.spawn', {
        before: function(args){
          var reason = args && args[0] || 'direct';
          metrics._spawnBeforeStamp = stamp(app.debug && app.debug.lastSpawn);
          bump('spawnRequests');
          if (String(reason).indexOf('resume-flush') !== -1) bump('spawnFlushes');
          record('spawn-request', { reason: reason });
        },
        after: function(result, args){
          var last = app.debug && app.debug.lastSpawn || null;
          var lastStamp = stamp(last);
          if (last && lastStamp !== metrics._spawnBeforeStamp && last.held){
            bump('spawnHeld');
            record('spawn-held', { reason: last.reason || (args && args[0]) || '', holdReason: last.holdReason || '' });
          } else if (last && lastStamp !== metrics._spawnBeforeStamp && !last.held) {
            record('spawn-result', {
              reason: last.reason || (args && args[0]) || '',
              after: typeof last.after === 'number' ? last.after : null,
              spawnedBoss: !!last.spawnedBoss
            });
          } else {
            record('spawn-result', { reason: args && args[0] || '', result: !!result });
          }
          metrics._spawnBeforeStamp = '';
        }
      }) || ok;
    }

    var bossDomain = app.domains && app.domains.get && app.domains.get('bossAttacks');
    if (bossDomain){
      ok = wrapMethod(bossDomain, 'fire', 'domain.bossAttacks.fire', {
        before: function(args){
          bump('bossAttackCalls');
          record('boss-attack-call', { boss: !!(args && args[0] && args[0].isBoss) });
        },
        after: function(result){
          var last = app.debug && app.debug.lastBossAttack || null;
          record('boss-attack-result', {
            selected: last && last.selected || result || '',
            level: last && last.level || safeRead('currentLevel', 1)
          });
        }
      }) || ok;
    }

    return ok;
  }

  function installEventListeners(){
    if (metrics.__listenersInstalled) return;
    metrics.__listenersInstalled = true;
    document.addEventListener('enemy-spawns-pause', function(){
      bump('overlayPauses');
      record('spawn-paused', { queued: !!(app.spawnControl && app.spawnControl.queued) });
    });
    document.addEventListener('enemy-spawns-resume', function(){
      bump('overlayResumes');
      record('spawn-resumed', { queued: !!(app.spawnControl && app.spawnControl.queued) });
    });
    window.addEventListener('keydown', function(ev){
      if (ev.key === 'F2' || ev.key === '`'){
        ev.preventDefault();
        toggle();
      }
    });
  }

  function ensureStyles(){
    if (document.getElementById('gameDebugPanelStyles')) return;
    var style = document.createElement('style');
    style.id = 'gameDebugPanelStyles';
    style.textContent =
      '#gameDebugToggle{' +
      'position:fixed;left:12px;top:12px;z-index:99999;border:1px solid rgba(255,255,255,.25);' +
      'background:rgba(8,12,18,.9);color:#fff;padding:10px 12px;border-radius:999px;font:700 12px/1.1 Arial,sans-serif;' +
      'box-shadow:0 8px 28px rgba(0,0,0,.35);cursor:pointer;opacity:.92;}' +
      '#gameDebugToggle:hover{opacity:1;}' +
      '#gameDebugPanel{' +
      'position:fixed;right:12px;bottom:12px;z-index:99998;width:min(380px,calc(100vw - 24px));max-height:min(78vh,760px);' +
      'display:none;overflow:auto;background:rgba(5,9,15,.94);color:#ecf3ff;border:1px solid rgba(120,180,255,.22);' +
      'border-radius:16px;padding:14px 14px 12px;box-shadow:0 18px 48px rgba(0,0,0,.45);font:12px/1.4 Arial,sans-serif;backdrop-filter:blur(8px);}' +
      '#gameDebugPanel.open{display:block;}' +
      '#gameDebugPanel .dbg-head{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:10px;}' +
      '#gameDebugPanel .dbg-title{font:700 14px/1.1 Arial,sans-serif;letter-spacing:.04em;text-transform:uppercase;}' +
      '#gameDebugPanel .dbg-actions{display:flex;gap:6px;flex-wrap:wrap;}' +
      '#gameDebugPanel .dbg-actions button,' +
      '#gameDebugPanel .dbg-checklist input,' +
      '#gameDebugPanel .dbg-mini{' +
      'accent-color:#5ca9ff;}' +
      '#gameDebugPanel button{' +
      'border:1px solid rgba(255,255,255,.18);background:rgba(255,255,255,.06);color:#fff;border-radius:10px;padding:6px 8px;font:600 11px/1 Arial,sans-serif;cursor:pointer;}' +
      '#gameDebugPanel button:hover{background:rgba(255,255,255,.12);}' +
      '#gameDebugPanel .dbg-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:10px 0;}' +
      '#gameDebugPanel .dbg-card{background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);border-radius:12px;padding:8px;}' +
      '#gameDebugPanel .dbg-card strong{display:block;font-size:11px;opacity:.72;text-transform:uppercase;letter-spacing:.04em;margin-bottom:4px;}' +
      '#gameDebugPanel .dbg-value{font-size:18px;font-weight:700;}' +
      '#gameDebugPanel .dbg-row{display:flex;justify-content:space-between;gap:8px;padding:3px 0;border-bottom:1px dashed rgba(255,255,255,.08);}' +
      '#gameDebugPanel .dbg-row:last-child{border-bottom:none;}' +
      '#gameDebugPanel .dbg-label{opacity:.76;}' +
      '#gameDebugPanel .dbg-section{margin-top:12px;}' +
      '#gameDebugPanel .dbg-section h4{margin:0 0 6px;font-size:11px;letter-spacing:.06em;text-transform:uppercase;opacity:.76;}' +
      '#gameDebugPanel .dbg-pre{white-space:pre-wrap;word-break:break-word;background:rgba(255,255,255,.04);border-radius:12px;padding:8px;margin:0;}' +
      '#gameDebugPanel .dbg-events{display:grid;gap:6px;}' +
      '#gameDebugPanel .dbg-event{background:rgba(255,255,255,.035);border-radius:10px;padding:7px 8px;}' +
      '#gameDebugPanel .dbg-event b{display:block;font-size:11px;margin-bottom:2px;}' +
      '#gameDebugPanel .dbg-event small{opacity:.7;display:block;margin-bottom:3px;}' +
      '#gameDebugPanel .dbg-checklist{display:grid;gap:8px;}' +
      '#gameDebugPanel label.dbg-item{display:flex;gap:8px;align-items:flex-start;background:rgba(255,255,255,.03);padding:7px 8px;border-radius:10px;}' +
      '#gameDebugPanel .dbg-toggle-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:10px;}' +
      '#gameDebugPanel .dbg-toggle{display:flex;align-items:center;justify-content:space-between;gap:8px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);border-radius:12px;padding:8px;}' +
      '#gameDebugPanel .dbg-toggle strong{display:block;font-size:11px;opacity:.78;text-transform:uppercase;letter-spacing:.04em;}' +
      '#gameDebugPanel .dbg-toggle span{opacity:.7;font-size:11px;display:block;margin-top:2px;}' +
      '#gameDebugPanel .dbg-hint{opacity:.72;font-size:11px;margin-top:6px;}' +
      '@media (max-width: 720px){#gameDebugPanel{left:12px;right:12px;width:auto;max-height:70vh;}#gameDebugToggle{left:auto;right:12px;top:12px;}}';
    document.head.appendChild(style);
  }

  var panel, toggleBtn, countersWrap, snapshotWrap, adaptiveWrap, eventsWrap, checklistWrap;

  function ensurePanel(){
    if (panel) return;
    ensureStyles();

    toggleBtn = document.createElement('button');
    toggleBtn.id = 'gameDebugToggle';
    toggleBtn.type = 'button';
    toggleBtn.textContent = 'DBG';
    toggleBtn.title = 'Open debug panel (F2)';
    toggleBtn.addEventListener('click', toggle);
    document.body.appendChild(toggleBtn);

    panel = document.createElement('aside');
    panel.id = 'gameDebugPanel';
    panel.setAttribute('aria-label', 'Game debug panel');

    panel.innerHTML =
      '<div class="dbg-head">' +
        '<div><div class="dbg-title">Runtime Debug</div><div class="dbg-hint">F2 or ` toggles · instrumentation build</div></div>' +
        '<div class="dbg-actions">' +
          '<button type="button" id="dbgCopyBtn">Copy snapshot</button>' +
          '<button type="button" id="dbgResetBtn">Reset counters</button>' +
          '<button type="button" id="dbgCloseBtn">Close</button>' +
        '</div>' +
      '</div>' +
      '<div class="dbg-grid" id="dbgCounters"></div>' +
      '<div class="dbg-section"><h4>Debug Controls</h4><div class="dbg-toggle-grid">' +
        '<label class="dbg-toggle"><div><strong>One-shot kill</strong><span>Player hits become lethal while enabled.</span></div><input type="checkbox" id="dbgOneShotToggle"></label>' +
        '<label class="dbg-toggle"><div><strong>Level skip (P)</strong><span>Hold P to skip to the next level.</span></div><input type="checkbox" id="dbgDevSkipToggle"></label>' +
        '<label class="dbg-toggle"><div><strong>Adaptive director</strong><span>Observe player habits and build live pattern tags.</span></div><input type="checkbox" id="dbgAdaptiveToggle"></label>' +
      '</div></div>' +
      '<div class="dbg-section"><h4>Adaptive Director</h4><pre class="dbg-pre" id="dbgAdaptive"></pre></div>' +
      '<div class="dbg-section"><h4>Live Snapshot</h4><pre class="dbg-pre" id="dbgSnapshot"></pre></div>' +
      '<div class="dbg-section"><h4>Recent Events</h4><div class="dbg-events" id="dbgEvents"></div></div>' +
      '<div class="dbg-section"><h4>Regression Checklist</h4><div class="dbg-checklist" id="dbgChecklist"></div><div class="dbg-hint">Checklist state is saved in this browser.</div></div>';

    document.body.appendChild(panel);
    countersWrap = panel.querySelector('#dbgCounters');
    snapshotWrap = panel.querySelector('#dbgSnapshot');
    adaptiveWrap = panel.querySelector('#dbgAdaptive');
    eventsWrap = panel.querySelector('#dbgEvents');
    checklistWrap = panel.querySelector('#dbgChecklist');

    panel.querySelector('#dbgCloseBtn').addEventListener('click', hide);
    panel.querySelector('#dbgResetBtn').addEventListener('click', function(){
      var fresh = {};
      Object.keys(metrics.counters).forEach(function(key){ fresh[key] = 0; });
      metrics.counters = fresh;
      metrics.recent = [];
      record('debug-reset', { by: 'user' });
      render();
    });
    panel.querySelector('#dbgCopyBtn').addEventListener('click', function(){
      var payload = {
        exportedAt: nowIso(),
        counters: metrics.counters,
        snapshot: snapshot(),
        recent: metrics.recent.slice(0, 10)
      };
      var text = JSON.stringify(payload, null, 2);
      if (navigator.clipboard && navigator.clipboard.writeText){
        navigator.clipboard.writeText(text).then(function(){ record('copy-snapshot', { ok:true }); }).catch(function(){ fallbackCopy(text); });
      } else {
        fallbackCopy(text);
      }
    });

    var oneShotToggle = panel.querySelector('#dbgOneShotToggle');
    var devSkipToggle = panel.querySelector('#dbgDevSkipToggle');
    var adaptiveToggle = panel.querySelector('#dbgAdaptiveToggle');
    if (oneShotToggle){
      oneShotToggle.checked = !!(typeof window.__isOneShotKillEnabled === 'function' ? window.__isOneShotKillEnabled() : window.__ONE_SHOT_KILL);
      oneShotToggle.addEventListener('change', function(){
        var enabled = !!oneShotToggle.checked;
        try{
          if (typeof window.__setOneShotKillMode === 'function') enabled = !!window.__setOneShotKillMode(enabled);
          else window.__ONE_SHOT_KILL = enabled;
        }catch(_){ }
        record('debug-one-shot-toggle', { enabled: enabled });
        render();
      });
    }
    if (devSkipToggle){
      devSkipToggle.checked = !!(typeof window.__isDevSkipEnabled === 'function' ? window.__isDevSkipEnabled() : window.__DEV_SKIP_ENABLED);
      devSkipToggle.addEventListener('change', function(){
        var enabled = !!devSkipToggle.checked;
        try{
          if (typeof window.__setDevSkipMode === 'function') enabled = !!window.__setDevSkipMode(enabled);
          else window.__DEV_SKIP_ENABLED = enabled;
        }catch(_){ }
        record('debug-devskip-toggle', { enabled: enabled });
        render();
      });
    }
    if (adaptiveToggle){
      adaptiveToggle.checked = !!(typeof window.__isAdaptiveDirectorEnabled === 'function' ? window.__isAdaptiveDirectorEnabled() : (app.state && app.state.adaptation && app.state.adaptation.enabled));
      adaptiveToggle.addEventListener('change', function(){
        var enabled = !!adaptiveToggle.checked;
        try{
          if (typeof window.__setAdaptiveDirectorMode === 'function') enabled = !!window.__setAdaptiveDirectorMode(enabled);
        }catch(_){ }
        record('debug-adaptive-toggle', { enabled: enabled });
        render();
      });
    }
    window.addEventListener('debug:oneshot-changed', function(){
      try{
        if (oneShotToggle) oneShotToggle.checked = !!(typeof window.__isOneShotKillEnabled === 'function' ? window.__isOneShotKillEnabled() : window.__ONE_SHOT_KILL);
      }catch(_){ }
      render();
    });
    window.addEventListener('devskip:mode-changed', function(){
      try{
        if (devSkipToggle) devSkipToggle.checked = !!(typeof window.__isDevSkipEnabled === 'function' ? window.__isDevSkipEnabled() : window.__DEV_SKIP_ENABLED);
      }catch(_){ }
      render();
    });
    window.addEventListener('debug:adaptive-director-changed', function(){
      try{
        if (adaptiveToggle) adaptiveToggle.checked = !!(typeof window.__isAdaptiveDirectorEnabled === 'function' ? window.__isAdaptiveDirectorEnabled() : (app.state && app.state.adaptation && app.state.adaptation.enabled));
      }catch(_){ }
      render();
    });

    renderChecklist();
    render();
  }

  function fallbackCopy(text){
    try{
      var ta = document.createElement('textarea');
      ta.value = text;
      ta.setAttribute('readonly', 'readonly');
      ta.style.position = 'fixed';
      ta.style.left = '-9999px';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      ta.remove();
      record('copy-snapshot', { ok:true, mode:'fallback' });
    }catch(_){
      record('copy-snapshot', { ok:false });
    }
  }

  function renderChecklist(){
    if (!checklistWrap) return;
    checklistWrap.innerHTML = '';
    CHECKLIST.forEach(function(item, index){
      var id = 'dbgCheck' + index;
      var row = document.createElement('label');
      row.className = 'dbg-item';
      row.setAttribute('for', id);
      var checked = !!metrics.checklist[index];
      row.innerHTML = '<input type="checkbox" id="' + id + '"' + (checked ? ' checked' : '') + '><span>' + item + '</span>';
      var input = row.querySelector('input');
      input.addEventListener('change', function(){
        metrics.checklist[index] = !!input.checked;
        saveChecklist();
        render();
      });
      checklistWrap.appendChild(row);
    });
  }

  function renderCounters(){
    if (!countersWrap) return;
    var c = metrics.counters || {};
    var cards = [
      { label:'Boot Calls', value:c.bootCalls, sub:'skip attempts: ' + (c.bootSkipAttempts || 0) },
      { label:'Loop Starts', value:c.loopStarts, sub:'ignored: ' + (c.loopStartIgnored || 0) },
      { label:'Spawn Requests', value:c.spawnRequests, sub:'held: ' + (c.spawnHeld || 0) + ' · flushes: ' + (c.spawnFlushes || 0) },
      { label:'Boss Attacks', value:c.bossAttackCalls, sub:'transitions: ' + (c.transitionCalls || 0) },
      { label:'Gameplay Transitions', value:c.transitionCallsGameplay || 0, sub:'debug skips: ' + (c.transitionCallsDebug || 0) + ' · skip calls: ' + (c.levelSkipCalls || 0) },
      { label:'Overlay Pauses', value:c.overlayPauses, sub:'resumes: ' + (c.overlayResumes || 0) },
      { label:'Loop Stops', value:c.loopStops, sub:'ignored: ' + (c.loopStopIgnored || 0) }
    ];
    countersWrap.innerHTML = cards.map(function(card){
      return '<div class="dbg-card"><strong>' + card.label + '</strong><div class="dbg-value">' + card.value + '</div><div class="dbg-hint">' + card.sub + '</div></div>';
    }).join('');
  }

  function renderSnapshot(){
    if (!snapshotWrap) return;
    var s = snapshot();
    var view = {
      level: s.level,
      kills: s.kills,
      enemies: s.enemies,
      bossPresent: s.bossPresent,
      enemySpawnsEnabled: s.enemySpawnsEnabled,
      levelTransitionActive: s.levelTransitionActive,
      gameEnded: s.gameEnded,
      bossIntroDone: s.bossIntroDone,
      bossSpawnPending: s.bossSpawnPending,
      runFinalized: s.runFinalized,
      activeActionLocks: s.activeActionLocks,
      loopRunning: s.loopRunning,
      devSkipEnabled: s.devSkipEnabled,
      oneShotKillEnabled: s.oneShotKillEnabled,
      adaptiveDirectorEnabled: s.adaptiveDirectorEnabled,
      adaptiveStyle: s.adaptiveDirector && s.adaptiveDirector.summary && s.adaptiveDirector.summary.style || 'neutral',
      adaptiveTopTags: s.adaptiveDirector && s.adaptiveDirector.summary && s.adaptiveDirector.summary.topTags || [],
      spawnPaused: s.spawnPaused,
      spawnQueued: s.spawnQueued,
      spawnLastReason: s.spawnLastReason,
      lastSpawn: s.lastSpawn && {
        reason: s.lastSpawn.reason || '',
        held: !!s.lastSpawn.held,
        holdReason: s.lastSpawn.holdReason || '',
        after: typeof s.lastSpawn.after === 'number' ? s.lastSpawn.after : null,
        spawnedBoss: !!s.lastSpawn.spawnedBoss
      } || null,
      lastBossAttack: s.lastBossAttack && {
        selected: s.lastBossAttack.selected || '',
        level: s.lastBossAttack.level || null,
        roll: typeof s.lastBossAttack.roll === 'number' ? Number(s.lastBossAttack.roll.toFixed(3)) : null
      } || null
    };
    snapshotWrap.textContent = JSON.stringify(view, null, 2);
  }

  function renderAdaptive(){
    if (!adaptiveWrap) return;
    var s = snapshot();
    var ad = s.adaptiveDirector || null;
    if (!ad){
      adaptiveWrap.textContent = JSON.stringify({ enabled:false, state:'missing' }, null, 2);
      return;
    }
    var topWeights = Object.keys(ad.weights || {}).map(function(key){
      return { key:key, value:Number(ad.weights[key]) || 0 };
    }).sort(function(a,b){ return Math.abs(b.value) - Math.abs(a.value); }).slice(0, 4);
    var view = {
      enabled: !!s.adaptiveDirectorEnabled,
      style: ad.summary && ad.summary.style || 'neutral',
      adaptationStrength: ad.summary && typeof ad.summary.adaptationStrength === 'number' ? Number(ad.summary.adaptationStrength.toFixed(2)) : 0,
      zone: ad.summary && ad.summary.zone || 'mid',
      nearestEnemyDistNorm: ad.summary && typeof ad.summary.nearestEnemyDistNorm === 'number' ? Number(ad.summary.nearestEnemyDistNorm.toFixed(3)) : null,
      topTags: ad.summary && ad.summary.topTags || [],
      topWeights: topWeights.map(function(item){ return { key:item.key, value:Number(item.value.toFixed(3)) }; }),
      tags: ad.tags || {},
      recent: {
        distanceFarEMA: ad.recent && typeof ad.recent.distanceFarEMA === 'number' ? Number(ad.recent.distanceFarEMA.toFixed(3)) : 0,
        leftAfterShotEMA: ad.recent && typeof ad.recent.leftAfterShotEMA === 'number' ? Number(ad.recent.leftAfterShotEMA.toFixed(3)) : 0,
        rightAfterShotEMA: ad.recent && typeof ad.recent.rightAfterShotEMA === 'number' ? Number(ad.recent.rightAfterShotEMA.toFixed(3)) : 0,
        stationaryEMA: ad.recent && typeof ad.recent.stationaryEMA === 'number' ? Number(ad.recent.stationaryEMA.toFixed(3)) : 0,
        aggressionEMA: ad.recent && typeof ad.recent.aggressionEMA === 'number' ? Number(ad.recent.aggressionEMA.toFixed(3)) : 0,
        burstSpamEMA: ad.recent && typeof ad.recent.burstSpamEMA === 'number' ? Number(ad.recent.burstSpamEMA.toFixed(3)) : 0,
        panicDodgeEMA: ad.recent && typeof ad.recent.panicDodgeEMA === 'number' ? Number(ad.recent.panicDodgeEMA.toFixed(3)) : 0,
        laneRepeatEMA: ad.recent && typeof ad.recent.laneRepeatEMA === 'number' ? Number(ad.recent.laneRepeatEMA.toFixed(3)) : 0,
        antiTeleportSkillEMA: ad.recent && typeof ad.recent.antiTeleportSkillEMA === 'number' ? Number(ad.recent.antiTeleportSkillEMA.toFixed(3)) : 0
      }
    };
    adaptiveWrap.textContent = JSON.stringify(view, null, 2);
  }

  function renderEvents(){
    if (!eventsWrap) return;
    if (!metrics.recent.length){
      eventsWrap.innerHTML = '<div class="dbg-hint">No events recorded yet.</div>';
      return;
    }
    eventsWrap.innerHTML = metrics.recent.slice(0, 10).map(function(evt){
      var details = evt.details ? JSON.stringify(evt.details) : '';
      return '<div class="dbg-event"><b>' + evt.type + '</b><small>' + evt.at + '</small><div>' + details + '</div></div>';
    }).join('');
  }

  function render(){
    if (!panel) return;
    try{
      var oneShotToggle = panel.querySelector('#dbgOneShotToggle');
      if (oneShotToggle) oneShotToggle.checked = !!(typeof window.__isOneShotKillEnabled === 'function' ? window.__isOneShotKillEnabled() : window.__ONE_SHOT_KILL);
      var devSkipToggle = panel.querySelector('#dbgDevSkipToggle');
      if (devSkipToggle) devSkipToggle.checked = !!(typeof window.__isDevSkipEnabled === 'function' ? window.__isDevSkipEnabled() : window.__DEV_SKIP_ENABLED);
      var adaptiveToggle = panel.querySelector('#dbgAdaptiveToggle');
      if (adaptiveToggle) adaptiveToggle.checked = !!(typeof window.__isAdaptiveDirectorEnabled === 'function' ? window.__isAdaptiveDirectorEnabled() : (app.state && app.state.adaptation && app.state.adaptation.enabled));
    }catch(_){ }
    renderCounters();
    renderSnapshot();
    renderAdaptive();
    renderEvents();
    if (toggleBtn){
      toggleBtn.textContent = 'DBG ' + (metrics.counters.spawnRequests || 0) + '/' + (metrics.counters.bossAttackCalls || 0);
    }
  }

  function show(){ ensurePanel(); panel.classList.add('open'); render(); }
  function hide(){ if (panel) panel.classList.remove('open'); }
  function toggle(){ ensurePanel(); panel.classList.toggle('open'); render(); }

  function boot(){
    loadChecklist();
    installEventListeners();
    ensurePanel();
    installHooks();
    var tries = 0;
    var interval = setInterval(function(){
      tries += 1;
      installHooks();
      if (tries >= 40) clearInterval(interval);
    }, 500);
    record('debug-panel-ready', { module:'95-debug-panel' });
  }

  app.debugPanel = {
    metrics: metrics,
    snapshot: snapshot,
    show: show,
    hide: hide,
    toggle: toggle,
    record: record
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once:true });
  else boot();
})();