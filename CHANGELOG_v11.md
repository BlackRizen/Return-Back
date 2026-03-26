# CHANGELOG v11 — Enemy movement fluency polish

Changes:
- Added smooth enemy entry from off-screen with intro guard before first action.
- Disabled teleport repositioning for normal enemies to remove pop-in/disappear behavior.
- Added cross-evade recovery / loop guard to stop repeated chain use.
- Smoothed horizontal intent and reduced wander amplitude/acceleration for less frantic movement.
- Added post-edge-reset retreat after cross-evade landing.
- Kept enemies clamped inside safe frame bounds.
