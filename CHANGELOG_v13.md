# CHANGELOG v13 — Enemy AI vitality pass

## What changed
- Added **anti-repeat variety memory** so the enemy stops cycling the same action patterns as often.
- Added **dynamic locomotion modes**: stalk, bait, orbit.
- Added **multiple entrance styles** using existing run sprites only: sweep, swoop, hesitate, rush.
- Entrance is now **reactive to incoming projectiles**, with intro jukes instead of blindly walking to the center.
- Added **new attack variants** using existing resources:
  - **burst shot** (2–3 staggered shots)
  - **strafe shot** (mobile firing while sliding laterally)
- Added **new evade variants** using existing resources:
  - **stutter evade**
  - **drop evade**
- Reworked **cross evade** so it follows a locked cinematic arc instead of velocity-only frantic flight.
- Strengthened behavior variety through **temperament-aware entry style, movement style, and attack selection**.

## Design intent
The enemy should now feel like it has intent: it sizes up, baits, shifts rhythm, reacts during entry, and changes tempo instead of behaving like a linear script.

## Validation status
- JavaScript syntax checked with `node --check`.
- No full visual playtest was possible inside this environment, so final tuning still needs in-browser feel testing.
