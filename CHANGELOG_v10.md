# CHANGELOG v10

- Added hard frame bounds for normal enemies so they no longer drift or get pushed out of the visible play area.
- Reworked cross-evade landing to target safe inset positions instead of exact screen edges.
- Added edge-reset behavior: when a normal enemy is trapped near a frame edge under player pressure, it can cross-evade to the opposite safe side.
- Improved projectile evasion by prioritizing time-to-impact and lane danger over raw distance.
- Increased responsiveness of vertical evade when incoming projectiles are immediate lane threats.
- Made ground dash melee invulnerable for the full attack sequence until the dash attack fully resets.
- Clamped special-attack movement, hit knockback, and general movement inside the enemy frame bounds.
