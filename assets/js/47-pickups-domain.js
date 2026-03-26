window.GameApp && window.GameApp.registerModule && window.GameApp.registerModule('47-pickups-domain', {"entryMarker": "// pickups domain", "description": "Pickup/resource facade for coins, resource stacks and runner fuel helpers."});
/*__MODULE_BOUNDARY__*/
(function(){
  var app = window.GameApp; if (!app || !app.domains) return;
  var domain = app.domains.define('pickups', {
    coins: function(){ try{ return app.state.coins || window.coins || []; }catch(_){ return []; } },
    updateCoins: function(dt){ return app.helpers.safeCall(window.updateCoins, null, [dt]); },
    spawnResourceStackAt: function(cx, ground, type, amount){ return app.helpers.safeCall(window.spawnResourceStackAt, null, [cx, ground, type, amount]); },
    showPickupText: function(text, x, y){ return app.helpers.safeCall(window.showPickupText, null, [text, x, y]); },
    spawnFuelPickup: function(cx, cy){ return app.helpers.safeCall(window.spawnFuelPickup, null, [cx, cy]); },
    increaseFuel: function(amount){ return app.helpers.safeCall(window.increaseFuel, null, [amount]); },
    updatePickups: function(dt){ return app.helpers.safeCall(window.updatePickups, null, [dt]); }
  }, { owner:'47-pickups-domain' });
})();
