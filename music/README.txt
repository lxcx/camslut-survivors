Music Files Required:

1. menu.mp3 - Main menu music (loops)
2. gameplay1.mp3, gameplay2.mp3, etc. - Standard gameplay songs (loops, random selection)
   - Add multiple gameplay songs using: MusicManager.addGameplaySong('music/gameplay1.mp3');
   - Example in game.js: MusicManager.addGameplaySong('music/gameplay1.mp3');
3. boss.mp3 - Boss fight music (loops)
4. gameover.mp3 - Game over music (plays once, no loop)
5. win.mp3 - Win/victory music (plays once, no loop)

All music plays at 25% volume automatically.

To add gameplay songs, edit game.js and add lines like:
MusicManager.addGameplaySong('music/gameplay1.mp3');
MusicManager.addGameplaySong('music/gameplay2.mp3');
etc.
