# Regression Checklist

Use this checklist after any gameplay-flow, spawn, boss, timer, or startup change.

## Core startup
- [ ] Fresh page load reaches the start screen cleanly.
- [ ] Starting the game produces exactly one gameplay loop.
- [ ] Returning to menu / restarting does not create duplicate loops.

## Normal level flow
- [ ] Level 1 begins with the expected first spawn only once.
- [ ] Enemy spawns continue normally after the first enemy.
- [ ] Winning a normal level triggers one transition only.
- [ ] The next level resets timer, kills, and HUD correctly.

## Overlay / pause behavior
- [ ] Opening an overlay pauses future spawns.
- [ ] Closing an overlay resumes correctly.
- [ ] Resume flush creates at most one queued spawn.
- [ ] Overlay open/close does not duplicate audio or enemies.

## Boss level 10 flow
- [ ] Level 10 intro plays once.
- [ ] Boss spawns once after the intro.
- [ ] Boss first attack is selected once.
- [ ] Boss attack audio is not duplicated.
- [ ] Boss defeat / fail path resets state correctly.

## Failure / retry / refresh
- [ ] Death and retry do not preserve stale boss flags.
- [ ] Death and retry do not preserve stale spawn queue state.
- [ ] Full page refresh still reproduces the same clean flow.

## Timer / audio
- [ ] Countdown tick plays once per second under 10 seconds.
- [ ] Timer does not continue during level transition.
- [ ] Time-up / transition result is correct for kill target state.

## Debug panel checks
- [ ] Boot Calls increments as expected.
- [ ] Loop Starts does not climb unexpectedly.
- [ ] Spawn Requests roughly matches gameplay expectation.
- [ ] Spawn Held only increments when a pause/transition/intro gate is active.
- [ ] Boss Attacks increments only when the boss actually attacks.
- [ ] Transition Calls increments once per actual level change.
