# CHANGELOG v7 — Player-read Evade Upgrade

## Added
- Lightweight player movement reader:
  - committed horizontal direction
  - recent reversals
  - short jump burst / airtime
  - camping / idle pressure
- New enemy evade pattern: `crossEvade`
  - climbs above the player
  - crosses to the opposite side of the arena
  - can trigger on incoming projectile pressure
  - can also trigger on jump-in reads
- Temperament-aware `crossEvadeBias`

## Improved
- Projectile reaction now uses:
  - threat time-to-impact
  - player movement commitment
  - player jump pressure
  - player camping tendency
- Vertical evade up/down is more intentional and scales its displacement with urgency.

## Safety / Feel
- Generic contact damage is disabled during evade-only patterns
  (`evade`, `jumpEvade`, `edgeEscape`, `crossEvade`)
  so long evasive passes do not accidentally feel like melee hits.
