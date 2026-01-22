SPRITE FILE ORGANIZATION
=======================

Place your player character sprite files in this folder.

SPRITE SHEET FORMAT:
- player-front.png (2-frame sprite sheet - character facing forward/toward camera)
- player-back.png (2-frame sprite sheet - character facing away/back view)
- player-left.png (single frame or sprite sheet - character facing left)
- player-right.png (single frame or sprite sheet - character facing right)

SPRITE SHEET LAYOUT:
For 2-frame sprite sheets (player-front.png and player-back.png):
- Frames should be arranged horizontally (side by side)
- Frame 1 (left) = idle/standing pose
- Frame 2 (right) = walking/moving pose
- Any resolution works! The game auto-detects the size

The game will automatically:
- Detect sprite dimensions (works with ANY size - 16x16, 32x32, 64x64, 128x128, etc.)
- Extract individual frames from sprite sheets
- Animate between frames when moving (walking animation)
- Show first frame when idle/not moving
- Scale sprites to appropriate size (2x scale by default, adjustable in code)
- Change sprite based on movement direction
- Fall back to circle if sprites aren't found

SPRITE SIZE:
- ANY resolution works! The game automatically detects the dimensions
- For 2-frame sheets: width should be 2x the frame width (e.g., if frames are 64x64, sheet is 128x64)
- The game will automatically scale them to fit the game
- You can adjust the scale in game.js (look for spriteScale property)

If you only have single-frame sprites:
- Name them player-front.png, player-back.png, etc.
- They will work fine, just won't animate
