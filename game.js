// Game Configuration
const CONFIG = {
    canvas: null,
    ctx: null,
    width: 1200,
    height: 800,
    gameTime: 0,
    isPaused: false,
    isGameOver: false,
    lastFrameTime: 0,
    // Base scale: speeds are defined in "game units per second" relative to a 1200x800 canvas
    // This ensures consistent game speed regardless of resolution
    baseWidth: 1200,
    baseHeight: 800,
    get scaleFactor() {
        // Average scale factor to maintain consistent game feel
        return Math.sqrt((this.width * this.height) / (this.baseWidth * this.baseHeight));
    }
};

// Game State
const gameState = {
    player: null,
    enemies: [],
    projectiles: [],
    enemyProjectiles: [], // Enemy projectiles (Incel shots, Politician spheres)
    experienceOrbs: [],
    particles: [],
    weapons: [],
    damagePools: [], // For ovulation AoE pools
    strikes: [], // For dildo whip strikes
    collarAuras: [], // For collar constant damage field
    chastityCageLevel: 0, // Chastity Cage upgrade level (max 3)
    lubeLevel: 0, // Lube upgrade level (reduces cooldown by 10% per level)
    hiddenVibeLevel: 0, // Hidden Vibe upgrade level (unlimited)
    cockRingLevel: 0, // Cock Ring upgrade level (max 5)
    pantiesLevel: 0, // Crotchless Panties upgrade level (unlimited, +10 HP per level)
    level: 1,
    xp: 0,
    xpNeeded: 10,
    startTime: null,
    startLevel: 1, // Track starting level for permanent stats
    boss: null, // Boss enemy
    bossSpawned: false, // Track if boss has been spawned
    rerolls: 0, // Rerolls available (3 base + 0.05 per permanent level)
    tabHiddenTime: null, // Track when tab was hidden (for pausing timer)
    totalPausedTime: 0 // Total time the tab was hidden (in milliseconds)
};

// Permanent Stats Manager (persists after death)
const PermanentStats = {
    totalLevelsGained: 0, // Total levels gained across all sessions
    
    // Load from localStorage
    load() {
        try {
            const saved = localStorage.getItem('permanentStats');
            if (saved) {
                const data = JSON.parse(saved);
                this.totalLevelsGained = data.totalLevelsGained || 0;
                console.log(`Loaded permanent stats: ${this.totalLevelsGained} total levels gained`);
            } else {
                console.log('No saved permanent stats found, starting fresh');
            }
        } catch (e) {
            console.error('Error loading permanent stats from localStorage:', e);
            this.totalLevelsGained = 0; // Reset on error
        }
    },
    
    // Save to localStorage
    save() {
        try {
            localStorage.setItem('permanentStats', JSON.stringify({
                totalLevelsGained: this.totalLevelsGained
            }));
            console.log(`Saved permanent stats: ${this.totalLevelsGained} total levels gained`);
        } catch (e) {
            console.error('Error saving permanent stats to localStorage:', e);
            // Try to use sessionStorage as fallback
            try {
                sessionStorage.setItem('permanentStats', JSON.stringify({
                    totalLevelsGained: this.totalLevelsGained
                }));
                console.warn('Saved to sessionStorage as fallback (will be lost when browser closes)');
            } catch (e2) {
                console.error('Failed to save to both localStorage and sessionStorage:', e2);
            }
        }
    },
    
    // Add levels from current session
    addLevels(levels) {
        this.totalLevelsGained += levels;
        this.save();
    },
    
    // Get permanent bonuses
    getBonuses() {
        return {
            xpGain: 1 + (this.totalLevelsGained * 0.02), // +2% per level (doubled)
            damage: 1 + (this.totalLevelsGained * 0.005), // +0.5% per level
            hp: 1 + (this.totalLevelsGained * 0.01), // +1% per level
            cooldown: 1 - (this.totalLevelsGained * 0.003), // -0.3% per level
            attackSize: 1 + (this.totalLevelsGained * 0.005), // +0.5% per level
            speed: 1 + (this.totalLevelsGained * 0.001) // +0.1% per level
        };
    }
};

// Sound Effects Manager
const SoundEffects = {
    volume: 0.5, // 50% volume for sound effects
    muted: false, // Mute state
    
    // Sound effect tracks
    sounds: {
        playerDamage: null,
        levelUp: null,
        bossDeath: null
    },
    
    // Initialize sound effects
    init() {
        // Load mute state from localStorage
        const savedMuteState = localStorage.getItem('muteSoundEffects');
        if (savedMuteState !== null) {
            this.muted = savedMuteState === 'true';
        }
        
        // Player damage sound
        this.sounds.playerDamage = new Audio('music/player-damage.wav');
        this.sounds.playerDamage.volume = this.volume;
        this.sounds.playerDamage.preload = 'auto';
        
        // Level up sound
        this.sounds.levelUp = new Audio('music/level-up.wav');
        this.sounds.levelUp.volume = this.volume;
        this.sounds.levelUp.preload = 'auto';
        
        // Boss death sound
        this.sounds.bossDeath = new Audio('music/boss-death.wav');
        this.sounds.bossDeath.volume = this.volume;
        this.sounds.bossDeath.preload = 'auto';
    },
    
    // Set mute state
    setMuted(muted) {
        this.muted = muted;
        localStorage.setItem('muteSoundEffects', muted.toString());
    },
    
    // Play sound effect
    play(soundName) {
        if (this.muted) return; // Don't play if muted
        
        const sound = this.sounds[soundName];
        if (sound) {
            // Reset to start and play
            sound.currentTime = 0;
            sound.play().catch(e => {
                console.warn(`Could not play sound effect ${soundName}:`, e);
            });
        }
    }
};

// Music Manager
const MusicManager = {
    currentTrack: null,
    volume: 0.125, // 12.5% volume (50% of 25%)
    muted: false, // Mute state
    
    // Music tracks
    tracks: {
        menu: null,
        gameplay: [], // Array of gameplay songs
        boss: null,
        bossSpoken: null, // Boss spoken audio
        gameOver: null,
        win: null
    },
    
    // Initialize music tracks
    init() {
        // Load mute state from localStorage
        const savedMuteState = localStorage.getItem('muteMusic');
        if (savedMuteState !== null) {
            this.muted = savedMuteState === 'true';
        }
        
        // Main menu song
        this.tracks.menu = new Audio('music/menu.mp3');
        this.tracks.menu.loop = true;
        this.tracks.menu.volume = this.volume;
        this.tracks.menu.preload = 'auto';
        // Add error handler for menu music
        this.tracks.menu.addEventListener('error', (e) => {
            console.error('Failed to load menu music: music/menu.mp3', e);
        });
        this.tracks.menu.addEventListener('loadeddata', () => {
            console.log('Menu music loaded successfully');
        });
        
        // Gameplay songs - load all available gameplay files
        // You can add more by calling: MusicManager.addGameplaySong('music/yourfile.mp3');
        const gameplayFiles = [
            'music/gameplay1.mp3',
            'music/gameplay2.mp3',
            'music/gameplay3.mp3',
            'music/gameplay4.mp3',
            'music/gameplay5.mp3',
            'music/gameplay6.mp3',
            'music/gameplay7.mp3',
            'music/gameplay.mp3'
        ];
        
        gameplayFiles.forEach(file => {
            // Only load files that have "gameplay" in the filename
            if (!file.toLowerCase().includes('gameplay')) {
                console.warn(`Skipping ${file} - filename must contain "gameplay"`);
                return;
            }
            
            try {
                const track = new Audio(file);
                track.loop = false; // Don't loop individual tracks - shuffle instead
                track.volume = this.volume;
                track.preload = 'auto';
                // Add error handler to silently skip missing files
                track.addEventListener('error', (e) => {
                    // File doesn't exist or failed to load, remove from array
                    const index = this.tracks.gameplay.indexOf(track);
                    if (index > -1) {
                        this.tracks.gameplay.splice(index, 1);
                        console.warn(`Removed invalid gameplay track: ${file}`);
                    }
                });
                // Add load handler to verify it loaded correctly
                track.addEventListener('loadeddata', () => {
                    console.log(`Loaded gameplay music: ${file}`);
                });
                // Add ended handler to shuffle to next song
                track.addEventListener('ended', () => {
                    // When this track ends, play next random gameplay song
                    if (this.currentTrack === track) {
                        this.playNextGameplaySong();
                    }
                });
                this.tracks.gameplay.push(track);
            } catch (e) {
                console.warn(`Could not load gameplay music: ${file}`, e);
            }
        });
        
        // Boss fight song
        this.tracks.boss = new Audio('music/boss.mp3');
        this.tracks.boss.loop = true;
        this.tracks.boss.volume = this.volume;
        this.tracks.boss.preload = 'auto';
        
        // Boss spoken audio
        this.tracks.bossSpoken = new Audio('music/boss-spoken.mp3');
        this.tracks.bossSpoken.volume = this.volume;
        this.tracks.bossSpoken.preload = 'auto';
        
        // Game over song
        this.tracks.gameOver = new Audio('music/gameover.mp3');
        this.tracks.gameOver.loop = false;
        this.tracks.gameOver.volume = this.volume;
        this.tracks.gameOver.preload = 'auto';
        
        // Win song
        this.tracks.win = new Audio('music/win.mp3');
        this.tracks.win.loop = false;
        this.tracks.win.volume = this.volume;
        this.tracks.win.preload = 'auto';
        
        console.log(`Music initialized. Gameplay songs loaded: ${this.tracks.gameplay.length}`);
        if (this.tracks.gameplay.length === 0) {
            console.error('WARNING: No gameplay music files were loaded!');
            console.error('Make sure gameplay1.mp3, gameplay2.mp3, etc. exist in the music folder.');
        }
    },
    
    // Stop current track
    stop() {
        if (this.currentTrack) {
            this.currentTrack.pause();
            this.currentTrack.currentTime = 0;
            this.currentTrack = null;
        }
        // Also explicitly stop menu music if it's playing
        if (this.tracks.menu && !this.tracks.menu.paused) {
            this.tracks.menu.pause();
            this.tracks.menu.currentTime = 0;
        }
    },
    
    // Set mute state
    setMuted(muted) {
        this.muted = muted;
        localStorage.setItem('muteMusic', muted.toString());
        // If muting, stop current track
        if (muted) {
            this.stop();
        }
    },
    
    // Play menu music
    playMenu() {
        if (this.muted) return; // Don't play if muted
        
        this.stop();
        this.currentTrack = this.tracks.menu;
        if (this.currentTrack) {
            this.currentTrack.currentTime = 0;
            const playPromise = this.currentTrack.play();
            if (playPromise !== undefined) {
                playPromise.then(() => {
                    console.log('Playing menu music');
                }).catch(e => {
                    console.warn('Could not play menu music:', e);
                    console.warn('Note: Some browsers require user interaction before playing audio.');
                });
            }
        } else {
            console.warn('Menu music track not loaded!');
        }
    },
    
    // Play next random gameplay song (used for shuffling)
    playNextGameplaySong() {
        if (this.muted) return; // Don't play if muted
        
        // Filter out any invalid tracks and only use files with "gameplay" in the name
        const validGameplayTracks = this.tracks.gameplay.filter(track => {
            if (!track) return false;
            // Check if the track source contains "gameplay" (case insensitive)
            const src = track.src || '';
            return src.toLowerCase().includes('gameplay');
        });
        
        if (validGameplayTracks.length > 0) {
            // Pick a random track, but avoid playing the same one that just ended
            let randomIndex;
            let attempts = 0;
            do {
                randomIndex = Math.floor(Math.random() * validGameplayTracks.length);
                attempts++;
                // Prevent infinite loop if there's only one track
                if (attempts > 10 || validGameplayTracks.length === 1) break;
            } while (validGameplayTracks[randomIndex] === this.currentTrack && validGameplayTracks.length > 1);
            
            this.currentTrack = validGameplayTracks[randomIndex];
            if (this.currentTrack) {
                // Reset to beginning
                this.currentTrack.currentTime = 0;
                const playPromise = this.currentTrack.play();
                if (playPromise !== undefined) {
                    playPromise.then(() => {
                        console.log(`Playing gameplay music: ${this.currentTrack.src.split('/').pop()}`);
                    }).catch(e => {
                        console.warn('Could not play gameplay music:', e);
                        // Try again after a short delay
                        setTimeout(() => this.playNextGameplaySong(), 1000);
                    });
                }
            }
        } else {
            console.warn('No valid gameplay music files found! Only files with "gameplay" in the filename will be used.');
            console.warn('Expected files: gameplay1.mp3, gameplay2.mp3, gameplay3.mp3, etc.');
        }
    },
    
    // Play random gameplay song (initial call)
    playGameplay() {
        if (this.muted) return; // Don't play if muted
        
        // Stop all music first, especially menu music
        this.stop();
        
        // Ensure menu music is stopped
        if (this.tracks.menu) {
            this.tracks.menu.pause();
            this.tracks.menu.currentTime = 0;
        }
        
        // Start the shuffle playlist
        this.playNextGameplaySong();
    },
    
    // Play boss spoken audio, then boss fight music
    playBossSpoken() {
        // Boss dialogue is controlled by sound effects mute, not music mute
        if (SoundEffects.muted) {
            // Skip dialogue, go straight to boss music
            this.playBoss();
            return;
        }
        
        if (this.tracks.bossSpoken) {
            this.tracks.bossSpoken.currentTime = 0;
            const playPromise = this.tracks.bossSpoken.play();
            if (playPromise !== undefined) {
                playPromise.then(() => {
                    console.log('Playing boss spoken audio');
                    // When spoken audio ends, start boss music
                    this.tracks.bossSpoken.addEventListener('ended', () => {
                        this.playBoss();
                    }, { once: true });
                }).catch(e => {
                    console.warn('Could not play boss spoken audio:', e);
                    // If spoken audio fails, just start boss music
                    this.playBoss();
                });
            }
        } else {
            // If no spoken audio, just start boss music
            this.playBoss();
        }
    },
    
    // Play boss fight music
    playBoss() {
        if (this.muted) return; // Don't play if muted
        
        this.stop();
        this.currentTrack = this.tracks.boss;
        if (this.currentTrack) {
            this.currentTrack.currentTime = 0;
            const playPromise = this.currentTrack.play();
            if (playPromise !== undefined) {
                playPromise.then(() => {
                    console.log('Playing boss music');
                    // Notify boss that music has started (for invincibility timer)
                    if (gameState.boss) {
                        gameState.boss.bossMusicStartTime = Date.now();
                    }
                }).catch(e => {
                    console.warn('Could not play boss music:', e);
                });
            }
        }
    },
    
    // Play game over music
    playGameOver() {
        if (this.muted) return; // Don't play if muted
        
        this.stop();
        this.currentTrack = this.tracks.gameOver;
        if (this.currentTrack) {
            this.currentTrack.play().catch(e => {
                console.warn('Could not play game over music:', e);
            });
        }
    },
    
    // Play win music
    playWin() {
        if (this.muted) return; // Don't play if muted
        
        this.stop();
        this.currentTrack = this.tracks.win;
        if (this.currentTrack) {
            this.currentTrack.play().catch(e => {
                console.warn('Could not play win music:', e);
            });
        }
    },
    
    // Add gameplay song to the array
    addGameplaySong(path) {
        try {
            const track = new Audio(path);
            track.loop = false; // Don't loop - shuffle instead
            track.volume = this.volume;
            track.preload = 'auto';
            // Add ended handler to shuffle to next song
            track.addEventListener('ended', () => {
                // When this track ends, play next random gameplay song
                if (this.currentTrack === track) {
                    this.playNextGameplaySong();
                }
            });
            this.tracks.gameplay.push(track);
            console.log(`Added gameplay song: ${path}`);
        } catch (e) {
            console.error(`Failed to add gameplay song: ${path}`, e);
        }
    },
    
    // Set volume (0.0 to 1.0)
    setVolume(volume) {
        this.volume = Math.max(0, Math.min(1, volume));
        // Update all existing tracks
        if (this.tracks.menu) this.tracks.menu.volume = this.volume;
        if (this.tracks.boss) this.tracks.boss.volume = this.volume;
        if (this.tracks.bossSpoken) this.tracks.bossSpoken.volume = this.volume;
        if (this.tracks.gameOver) this.tracks.gameOver.volume = this.volume;
        if (this.tracks.win) this.tracks.win.volume = this.volume;
        this.tracks.gameplay.forEach(track => {
            if (track) track.volume = this.volume;
        });
    }
};

// Helper functions for boss and win music (call these when boss fights start or player wins)
function startBossFight() {
    MusicManager.playBoss();
}

function playerWins() {
    // Prevent multiple calls
    if (CONFIG.isGameOver) {
        return;
    }
    
    CONFIG.isGameOver = true;
    
    // Calculate levels gained for permanent stats
    const levelsGained = gameState.level - gameState.startLevel;
    if (levelsGained > 0) {
        PermanentStats.addLevels(levelsGained);
        console.log(`Added ${levelsGained} levels to permanent stats. Total: ${PermanentStats.totalLevelsGained}`);
        console.log('Permanent stats saved to localStorage - will persist after browser closes');
    }
    
    // Update win screen stats
    document.getElementById('winTime').textContent = CONFIG.gameTime;
    document.getElementById('winLevel').textContent = gameState.level;
    // Clear hint text for win modal (no hints on victory!)
    document.getElementById('winHint').textContent = '';
    
    // Show win modal
    document.getElementById('winModal').classList.add('active');
    
    // Play win music
    MusicManager.playWin();
}

// Sprite Manager
const SpriteManager = {
    images: {},
    loaded: 0,
    total: 0,
    
    loadSprite(name, path, frames = 1) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            
            img.onload = () => {
                console.log(`✓ Sprite loaded: ${name} (${img.width}x${img.height}, ${frames} frames)`);
                this.images[name] = {
                    image: img,
                    frames: frames,
                    frameWidth: img.width / frames,
                    frameHeight: img.height
                };
                this.loaded++;
                resolve(this.images[name]);
            };
            img.onerror = (e) => {
                const fullPath = new URL(path, window.location.href).href;
                console.error(`✗ Failed to load sprite: ${path}`);
                console.error(`  Full path: ${fullPath}`);
                console.error(`  Current page location: ${window.location.href}`);
                reject(new Error(`Failed to load ${path}`));
            };
            
            // Use relative path - should work from index.html
            img.src = path;
            this.total++;
        });
    },
    
    getSprite(name) {
        return this.images[name] || null;
    },
    
    async loadAllSprites() {
        const sprites = [
            { name: 'player-front', path: 'sprites/player-front.png', frames: 2 },
            { name: 'player-back', path: 'sprites/player-back.png', frames: 2 },
            { name: 'player-left', path: 'sprites/player-left.png', frames: 2 },
            { name: 'player-right', path: 'sprites/player-right.png', frames: 2 },
            // Weapon sprites
            { name: 'weapon-dildo', path: 'sprites/dildo.png', frames: 1 },
            { name: 'dildo-effect', path: 'sprites/dildo-effect.png', frames: 1 },
            { name: 'weapon-buttplug', path: 'sprites/buttplug.png', frames: 1 },
            { name: 'weapon-collar', path: 'sprites/collar.png', frames: 1 },
            { name: 'collar-effect', path: 'sprites/collar-effect.png', frames: 1 },
            { name: 'weapon-ovulation', path: 'sprites/ovulation.png', frames: 1 },
            { name: 'pool-ovulation', path: 'sprites/ovulation-effect.png', frames: 1 },
            { name: 'weapon-hitachi', path: 'sprites/hitachi.png', frames: 1 },
            { name: 'hitachi-effect', path: 'sprites/hitachi-effect.png', frames: 1 },
            { name: 'chastitycage', path: 'sprites/chastitycage.png', frames: 1 },
            { name: 'lube', path: 'sprites/lube.png', frames: 1 },
            { name: 'hiddenvibe', path: 'sprites/hiddenvibe.png', frames: 1 },
            { name: 'cockring', path: 'sprites/cockring.png', frames: 1 },
            { name: 'panties', path: 'sprites/panties.png', frames: 1 },
            { name: 'xp', path: 'sprites/xp.png', frames: 1 },
            // Enemy sprites
            { name: 'enemy-bills', path: 'sprites/bills.png', frames: 1 },
            { name: 'enemy-incels', path: 'sprites/incels.png', frames: 1 },
            { name: 'enemy-politicians', path: 'sprites/politicians.png', frames: 1 },
            { name: 'boss', path: 'sprites/boss.png', frames: 1 },
            // Logo
            { name: 'logo', path: 'sprites/logo.png', frames: 1 },
            { name: 'menu-character', path: 'sprites/menu-character.png', frames: 1 },
            { name: 'challenge-sprite', path: 'sprites/challenge-sprite.png', frames: 1 },
            { name: 'gameover-sprite', path: 'sprites/gameover-sprite.png', frames: 1 },
            { name: 'win-sprite', path: 'sprites/win-sprite.png', frames: 1 }
        ];
        
        console.log('Loading sprites...');
        
        // Try to load all sprites, but continue even if some fail
        const loadPromises = sprites.map(sprite => {
            console.log(`Attempting to load: ${sprite.path}`);
            return this.loadSprite(sprite.name, sprite.path, sprite.frames)
                .then(() => {
                    console.log(`✓ Successfully loaded: ${sprite.name}`);
                    return sprite.name;
                })
                .catch((error) => {
                    console.warn(`✗ Failed to load ${sprite.path}:`, error.message);
                    return null;
                });
        });
        
        const results = await Promise.all(loadPromises);
        const loadedSprites = results.filter(r => r !== null);
        
        console.log(`Loaded ${this.loaded} sprite(s):`, loadedSprites);
        
        // If no sprites loaded, try alternative naming
        if (this.loaded === 0) {
            console.log('No sprites loaded from primary paths, trying alternatives...');
            const altSprites = [
                { name: 'player', path: 'sprites/player.png', frames: 1 },
                { name: 'player-front', path: 'player-front.png', frames: 2 },
                { name: 'player-back', path: 'player-back.png', frames: 2 }
            ];
            
            for (const sprite of altSprites) {
                try {
                    await this.loadSprite(sprite.name, sprite.path, sprite.frames);
                    console.log(`✓ Loaded alternative sprite: ${sprite.name}`);
                    break; // Use first successful load as default
                } catch (e) {
                    console.warn(`✗ Alternative path failed: ${sprite.path}`);
                }
            }
        }
        
        if (this.loaded === 0) {
            console.warn('⚠ No sprites loaded! Using fallback circle graphics.');
        }
    }
};

// Initialize Canvas
function initCanvas() {
    CONFIG.canvas = document.getElementById('gameCanvas');
    CONFIG.ctx = CONFIG.canvas.getContext('2d');
    CONFIG.canvas.width = CONFIG.width;
    CONFIG.canvas.height = CONFIG.height;
}

// Player Class
class Player {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.radius = 60 * CONFIG.scaleFactor; // 4x larger (was 15), scaled
        // Apply permanent HP bonus (+1% per level gained) and speed bonus (+0.1% per level)
        const bonuses = PermanentStats.getBonuses();
        this.speed = 270 * bonuses.speed; // pixels per second (scaled) - 1.5x faster, with permanent speed bonus
        // Apply crotchless panties HP bonus (+10 HP per level)
        const pantiesHPBonus = gameState.pantiesLevel * 10;
        this.maxHealth = Math.floor(100 * bonuses.hp) + pantiesHPBonus;
        this.health = this.maxHealth;
        this.color = '#4a90e2';
        this.lastDamageTime = 0;
        this.invulnerableDuration = 1000; // 1 second damage cooldown
        this.damageFlashStartTime = 0; // Track when flash effect started
        
        // Sprite properties
        // spriteScale will be calculated dynamically to match hitbox size
        this.direction = 'front'; // front, back, left, right
        this.lastDx = 0;
        this.lastDy = 0;
        this.spriteWidth = 32; // Default sprite width
        this.spriteHeight = 32; // Default sprite height
        
        // Animation properties
        this.animationFrame = 0; // Current frame (0 or 1 for 2-frame sheets)
        this.animationTimer = Date.now(); // Timer for frame switching (initialize to current time)
        this.animationSpeed = 200; // Milliseconds per frame (faster animation)
        this.isMoving = false; // Whether player is currently moving
    }

    update(keys, deltaTime) {
        // Movement
        let dx = 0;
        let dy = 0;

        if (keys['w'] || keys['ArrowUp']) dy -= 1;
        if (keys['s'] || keys['ArrowDown']) dy += 1;
        if (keys['a'] || keys['ArrowLeft']) dx -= 1;
        if (keys['d'] || keys['ArrowRight']) dx += 1;

        // Normalize diagonal movement
        if (dx !== 0 && dy !== 0) {
            dx *= 0.707;
            dy *= 0.707;
        }

        // Update movement state
        this.isMoving = (dx !== 0 || dy !== 0);

        // Update direction based on movement
        if (dx !== 0 || dy !== 0) {
            this.lastDx = dx;
            this.lastDy = dy;
            
            // Determine sprite direction
            if (Math.abs(dy) > Math.abs(dx)) {
                this.direction = dy < 0 ? 'back' : 'front';
            } else {
                this.direction = dx < 0 ? 'left' : 'right';
            }
        }

        // Scale speed by deltaTime and scaleFactor for consistent movement
        const scaledSpeed = this.speed * CONFIG.scaleFactor * deltaTime;
        this.x += dx * scaledSpeed;
        this.y += dy * scaledSpeed;

        // Keep player in bounds (recalculate radius for bounds check)
        const currentRadius = 60 * CONFIG.scaleFactor;
        this.x = Math.max(currentRadius, Math.min(CONFIG.width - currentRadius, this.x));
        this.y = Math.max(currentRadius, Math.min(CONFIG.height - currentRadius, this.y));
        
        // Update animation frame
        this.updateAnimation();
    }
    
    updateAnimation() {
        const now = Date.now();
        
        // Only animate if moving (for walking animation)
        if (this.isMoving) {
            if (now - this.animationTimer > this.animationSpeed) {
                this.animationFrame = (this.animationFrame + 1) % 2; // Toggle between 0 and 1
                this.animationTimer = now;
            }
        } else {
            // Reset to first frame when not moving
            this.animationFrame = 0;
            this.animationTimer = now;
        }
    }

    takeDamage(amount) {
        const now = Date.now();
        if (now - this.lastDamageTime < this.invulnerableDuration) {
            return; // Still invulnerable (300ms cooldown)
        }

        // Apply Chastity Cage damage reduction (10% per level, max 3 levels = 30% damage reduction)
        const damageReductionPercent = gameState.chastityCageLevel * 0.1; // 10% per level
        const finalDamage = Math.max(1, Math.floor(amount * (1 - damageReductionPercent))); // Minimum 1 damage

        this.health -= finalDamage;
        this.lastDamageTime = now;
        this.damageFlashStartTime = now; // Start flash effect
        
        // Play damage sound effect
        SoundEffects.play('playerDamage');

        if (this.health <= 0) {
            this.health = 0;
            gameOver();
        }
    }

    draw(ctx) {
        if (!ctx) return; // Safety check
        
        ctx.save();
        
        // Flash effect when taking damage (visible for 1 second)
        const now = Date.now();
        const timeSinceFlash = now - this.damageFlashStartTime;
        const flashDuration = 1000; // Flash for 1 second
        if (timeSinceFlash < flashDuration) {
            // Rapid flash effect - alternate between normal and red-tinted
            const flashCycle = Math.floor(timeSinceFlash / 50); // Flash every 50ms
            if (flashCycle % 2 === 0) {
                // Red tint flash
                ctx.globalAlpha = 0.8;
                ctx.filter = 'brightness(1.5) saturate(2)';
            } else {
                // Normal
                ctx.globalAlpha = 1.0;
                ctx.filter = 'none';
            }
        } else {
            ctx.globalAlpha = 1.0;
            ctx.filter = 'none';
        }

        // Try to draw sprite
        const spriteName = `player-${this.direction}`;
        let spriteData = SpriteManager.getSprite(spriteName);
        
        // Fallback to other sprites if direction-specific not found
        if (!spriteData) {
            spriteData = SpriteManager.getSprite('player-front') || 
                        SpriteManager.getSprite('player-back') ||
                        SpriteManager.getSprite('player') ||
                        SpriteManager.getSprite('player-left') ||
                        SpriteManager.getSprite('player-right');
        }

        if (spriteData && spriteData.image) {
            try {
                const sprite = spriteData.image;
                
                // Check if image is actually loaded
                if (!sprite.complete || sprite.naturalWidth === 0) {
                    console.warn('Sprite image not fully loaded yet');
                    this.drawFallback(ctx);
                    ctx.restore();
                    return;
                }
                
                const frames = spriteData.frames || 1;
                const frameWidth = spriteData.frameWidth || sprite.width;
                const frameHeight = spriteData.frameHeight || sprite.height;
                
                // Determine which frame to show
                let frameIndex = 0;
                if (frames > 1) {
                    frameIndex = this.animationFrame % frames;
                }
                
                // Calculate scale to match hitbox size (radius * 2 = diameter)
                // Use the larger dimension to ensure sprite fits within hitbox
                const hitboxSize = this.radius * 2;
                const spriteMaxDimension = Math.max(frameWidth, frameHeight);
                const spriteScale = hitboxSize / spriteMaxDimension;
                
                // Calculate scaled dimensions
                const width = frameWidth * spriteScale;
                const height = frameHeight * spriteScale;
                
                // Draw the specific frame from the sprite sheet
                ctx.drawImage(
                    sprite,
                    frameIndex * frameWidth, // Source X (frame position in sheet)
                    0, // Source Y
                    frameWidth, // Source width
                    frameHeight, // Source height
                    this.x - width / 2, // Destination X
                    this.y - height / 2, // Destination Y
                    width, // Destination width
                    height // Destination height
                );
                
                // Keep radius fixed - sprite now matches hitbox size
            } catch (e) {
                console.warn('Error drawing sprite, using fallback:', e);
                // Fall through to circle fallback
                this.drawFallback(ctx);
            }
        } else {
            // Fallback to circle if no sprite loaded
            this.drawFallback(ctx);
        }

        // Reset filter after drawing
        ctx.filter = 'none';
        ctx.restore();
    }
    
    drawFallback(ctx) {
        // Draw player circle as fallback
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        ctx.fill();
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.stroke();
        
        // Direction indicator
        ctx.beginPath();
        ctx.moveTo(this.x, this.y);
        const indicatorLength = this.radius + 5;
        if (this.direction === 'back') {
            ctx.lineTo(this.x, this.y - indicatorLength);
        } else if (this.direction === 'front') {
            ctx.lineTo(this.x, this.y + indicatorLength);
        } else if (this.direction === 'left') {
            ctx.lineTo(this.x - indicatorLength, this.y);
        } else {
            ctx.lineTo(this.x + indicatorLength, this.y);
        }
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.stroke();
    }
}

// Boss Class
class Boss {
    constructor() {
        this.size = 262.5; // 30% reduction from 375 (375 * 0.7 = 262.5 pixels)
        this.x = CONFIG.width / 2; // Start at center horizontally
        this.y = -this.size / 2; // Start above screen
        this.targetY = CONFIG.height / 2; // Target position (center of screen)
        this.speed = 30; // Drift speed (pixels per second, scaled) - was 0.5 per frame
        this.facingRight = false; // Default facing left
        this.hasReachedTarget = false;
        this.canDrift = false; // Don't drift until spoken audio finishes
        this.bossMusicStartTime = null; // Track when boss music starts
        this.invincible = true; // Invincible until 25 seconds after music starts
        this.invincibilityDuration = 25000; // 25 seconds in milliseconds
        
        // Attack cooldowns (25% less = 0.75 multiplier)
        this.incelCooldown = 1500; // 2000 * 0.75 = 1500ms
        this.lastIncelShot = 0;
        this.politicianCooldown = 0; // Will be calculated based on politician attack cycle
        this.lastPoliticianAttack = 0;
        this.politicianState = 'idle'; // 'idle', 'pulsing', 'charging', 'attacking'
        this.politicianStateStartTime = 0;
        this.chargeTargetX = 0;
        this.chargeTargetY = 0;
        this.chargeStartX = 0;
        this.chargeStartY = 0;
        this.chargeDistance = 0;
        this.maxChargeDistance = 300;
        this.pulseScale = 1.0;
        this.hasShotSpheres = false;
        
        // Flip attack state
        this.flipAttackState = 'idle'; // 'idle', 'flipping', 'paused', 'aura'
        this.flipAttackStartTime = 0;
        this.flipCount = 0;
        this.flipCooldown = 8000; // 8 seconds between flip attacks
        this.lastFlipAttack = 0;
        this.auraActive = false;
        this.auraRadius = 120; // 20% increase from 100 (100 * 1.2 = 120)
        this.auraDamage = 40;
        this.auraDamageInterval = 200; // Damage every 200ms
        this.lastAuraDamage = 0;
        
        // Boss health (doubled)
        this.health = 80000; // Doubled from 40000
        this.maxHealth = 80000; // Doubled from 40000
        this.radius = this.size / 2; // Collision radius (30% smaller)
        
        // Health threshold invincibility tracking
        this.healthThresholdsTriggered = []; // Track which thresholds (75%, 50%, 25%) have been crossed
        this.temporaryInvincible = false; // Temporary invincibility from health thresholds
        this.temporaryInvincibilityEndTime = 0; // When temporary invincibility ends
        
        // Death animation state
        this.isDying = false;
        this.deathStartTime = null;
        this.deathDuration = 2000; // 2 seconds for death animation
        this.currentScale = 1.0;
        this.currentOpacity = 1.0;
        this.flickerInterval = 100; // Flicker every 100ms
        this.lastFlickerTime = 0;
        this.flickerVisible = true;
        
        // Flamed effect (from Hitachi)
        this.flamedTicks = 0; // Number of active flame ticks
        this.lastFlameTickTime = 0; // Last time a flame tick occurred
        this.flameDamageInterval = 200; // Damage every 200ms
    }
    
    update(deltaTime) {
        const now = Date.now();
        const player = gameState.player;
        if (!player) return;
        
        // Handle flamed effect (from Hitachi)
        if (this.flamedTicks > 0 && !this.isDying) {
            // Deal damage every 200ms per tick
            if (now - this.lastFlameTickTime >= this.flameDamageInterval) {
                const damagePerTick = 3;
                const totalDamage = damagePerTick * this.flamedTicks;
                // Use takeDamage to respect invincibility and damage caps
                this.takeDamage(totalDamage, 'flamed');
                this.lastFlameTickTime = now;
                // Remove one tick after dealing damage
                this.flamedTicks = Math.max(0, this.flamedTicks - 1);
            }
        }
        
        // Handle death animation
        if (this.isDying) {
            const deathElapsed = now - this.deathStartTime;
            const deathProgress = Math.min(1.0, deathElapsed / this.deathDuration);
            
            // Flicker effect
            if (now - this.lastFlickerTime >= this.flickerInterval) {
                this.flickerVisible = !this.flickerVisible;
                this.lastFlickerTime = now;
            }
            
            // Scale up (from 1.0 to 2.0)
            this.currentScale = 1.0 + (deathProgress * 1.0);
            
            // Decrease opacity (from 1.0 to 0.0)
            this.currentOpacity = 1.0 - deathProgress;
            
            // When opacity reaches zero, show win message
            if (this.currentOpacity <= 0) {
                playerWins();
            }
            
            return; // Don't do normal updates during death animation
        }
        
        // Only drift if spoken audio has finished (boss music has started)
        if (!this.canDrift) {
            // Check if boss music is playing (means spoken audio finished)
            if (MusicManager.currentTrack === MusicManager.tracks.boss && 
                MusicManager.tracks.boss && 
                !MusicManager.tracks.boss.paused) {
                this.canDrift = true;
                // Record when boss music started
                if (!this.bossMusicStartTime) {
                    this.bossMusicStartTime = now;
                }
            }
            return; // Don't move until we can drift
        }
        
        // Check initial invincibility (25 seconds after boss music starts)
        if (this.invincible && this.bossMusicStartTime) {
            const timeSinceMusicStart = now - this.bossMusicStartTime;
            if (timeSinceMusicStart >= this.invincibilityDuration) {
                this.invincible = false;
                console.log('Boss is now vulnerable and can attack!');
            }
        }
        
        // Check temporary invincibility from health thresholds (10 seconds)
        if (this.temporaryInvincible && now >= this.temporaryInvincibilityEndTime) {
            this.temporaryInvincible = false;
            console.log('Boss temporary invincibility expired.');
        }
        
        // Drift down to target position
        if (!this.hasReachedTarget) {
            // Scale speed by deltaTime and scaleFactor for consistent movement
            const scaledSpeed = this.speed * CONFIG.scaleFactor * deltaTime;
            this.y += scaledSpeed;
            if (this.y >= this.targetY) {
                this.y = this.targetY;
                this.hasReachedTarget = true;
            }
        }
        
        // Update facing direction based on player position
        // Boss defaults facing left, flips if player is to the right
        if (player.x > this.x) {
            this.facingRight = true; // Player is to the right, face right
        } else {
            this.facingRight = false; // Player is to the left, face left (default)
        }
        
        // Only attack if not invincible and has reached target
        if (!this.invincible && this.hasReachedTarget) {
            // Incel attack (shoot at player)
            if (now - this.lastIncelShot >= this.incelCooldown) {
                const angle = Math.atan2(player.y - this.y, player.x - this.x);
                const projectile = new EnemyProjectile(
                    this.x,
                    this.y,
                    angle,
                    270, // Speed (pixels per second, scaled) - 25% faster than regular incel (216 * 1.25 = 270)
                    40, // Double damage: 20 * 2 = 40
                    'incel',
                    Infinity, // No max distance
                    Infinity, // No lifetime limit
                    false // Boss projectiles are never elite
                );
                gameState.enemyProjectiles.push(projectile);
                this.lastIncelShot = now;
            }
            
            // Politician attack (charge and shoot 8 spheres)
            this.updatePoliticianAttack(now, player, deltaTime);
            
            // Flip attack
            this.updateFlipAttack(now, player);
            
            // Body contact damage (like politicians: 40 * 2 = 80 damage)
            const dx = player.x - this.x;
            const dy = player.y - this.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            if (distance < this.radius + player.radius) {
                player.takeDamage(80); // Double politician body damage: 40 * 2 = 80
            }
        }
    }
    
    updatePoliticianAttack(now, player, deltaTime) {
        const stateTime = now - this.politicianStateStartTime;
        
        if (this.politicianState === 'idle') {
            // Switch to pulsing after 1.5 seconds (25% faster: 2000 * 0.75 = 1500ms)
            if (stateTime > 1500) {
                this.politicianState = 'pulsing';
                this.politicianStateStartTime = now;
            }
        } else if (this.politicianState === 'pulsing') {
            // Pulse for 0.75 seconds (25% faster: 1000 * 0.75 = 750ms)
            const pulseProgress = (stateTime / 750) % 1;
            this.pulseScale = 1.0 + Math.sin(pulseProgress * Math.PI * 2) * 0.2;
            
            if (stateTime >= 750) {
                // Start charging towards player's current position
                this.politicianState = 'charging';
                this.politicianStateStartTime = now;
                this.chargeTargetX = player.x;
                this.chargeTargetY = player.y;
                this.chargeStartX = this.x;
                this.chargeStartY = this.y;
                this.chargeDistance = 0;
                this.pulseScale = 1.0;
                this.hasShotSpheres = false;
            }
        } else if (this.politicianState === 'charging') {
            // Charge in straight line towards target
            const dx = this.chargeTargetX - this.x;
            const dy = this.chargeTargetY - this.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            const chargeSpeed = 600; // pixels per second (scaled) - 25% faster than regular (480 * 1.25 = 600)
            
            if (distance > 5) {
                // Scale speed by deltaTime and scaleFactor for consistent movement
                const scaledSpeed = chargeSpeed * CONFIG.scaleFactor * deltaTime;
                this.x += (dx / distance) * scaledSpeed;
                this.y += (dy / distance) * scaledSpeed;
                this.chargeDistance += scaledSpeed;
                // Update facing direction during charge
                this.facingRight = dx >= 0;
            } else {
                // Reached target, shoot 8 spheres
                if (!this.hasShotSpheres) {
                    this.hasShotSpheres = true;
                    this.politicianState = 'attacking';
                    this.politicianStateStartTime = now;
                    
                    // Shoot 8 spheres in 8 directions (double damage: 30 * 2 = 60)
                    const directions = [
                        0, Math.PI / 4, Math.PI / 2, 3 * Math.PI / 4,
                        Math.PI, 5 * Math.PI / 4, 3 * Math.PI / 2, 7 * Math.PI / 4
                    ];
                    
                    for (const angle of directions) {
                        const projectile = new EnemyProjectile(
                            this.x,
                            this.y,
                            angle,
                            375, // Speed (pixels per second, scaled) - 25% faster than regular (300 * 1.25 = 375)
                            60, // Double damage: 30 * 2 = 60
                            'politician',
                            120, // Max distance
                            Infinity, // No lifetime limit
                            false // Boss projectiles are never elite
                        );
                        gameState.enemyProjectiles.push(projectile);
                    }
                }
            }
            
            // Stop if exceeded max charge distance
            if (this.chargeDistance >= this.maxChargeDistance && !this.hasShotSpheres) {
                this.hasShotSpheres = true;
                this.politicianState = 'attacking';
                this.politicianStateStartTime = now;
                
                // Shoot 8 spheres
                const directions = [
                    0, Math.PI / 4, Math.PI / 2, 3 * Math.PI / 4,
                    Math.PI, 5 * Math.PI / 4, 3 * Math.PI / 2, 7 * Math.PI / 4
                ];
                
                    for (const angle of directions) {
                        const projectile = new EnemyProjectile(
                            this.x,
                            this.y,
                            angle,
                            375, // Speed (pixels per second, scaled) - 25% faster than regular (300 * 1.25 = 375)
                            60, // Double damage
                            'politician',
                            120, // Max distance
                            Infinity, // No lifetime limit
                            false // Boss projectiles are never elite
                        );
                        gameState.enemyProjectiles.push(projectile);
                    }
            }
        } else if (this.politicianState === 'attacking') {
            // Wait 2 seconds (25% faster: ~1500ms) before next attack cycle
            if (stateTime > 1500) {
                this.politicianState = 'idle';
                this.politicianStateStartTime = now;
            }
        }
    }
    
    updateFlipAttack(now, player) {
        // Check if flip attack is on cooldown
        if (this.flipAttackState === 'idle' && now - this.lastFlipAttack >= this.flipCooldown) {
            this.flipAttackState = 'flipping';
            this.flipAttackStartTime = now;
            this.flipCount = 0;
        }
        
        const stateTime = now - this.flipAttackStartTime;
        
        if (this.flipAttackState === 'flipping') {
            // Flip 4 times quickly (100ms per flip = 400ms total)
            if (this.flipCount < 4) {
                const flipInterval = 100; // 100ms per flip
                const expectedFlips = Math.floor(stateTime / flipInterval);
                if (expectedFlips > this.flipCount) {
                    this.flipCount = expectedFlips;
                    // Flip horizontally
                    this.facingRight = !this.facingRight;
                }
            }
            
            // After 4 flips (400ms), pause for 1 second
            if (stateTime >= 400 && this.flipCount >= 4) {
                this.flipAttackState = 'paused';
                this.flipAttackStartTime = now;
            }
        } else if (this.flipAttackState === 'paused') {
            // Pause for 1 second, then activate aura
            if (stateTime >= 1000) {
                this.flipAttackState = 'aura';
                this.flipAttackStartTime = now;
                this.auraActive = true;
                this.lastAuraDamage = now;
            }
        } else if (this.flipAttackState === 'aura') {
            // Aura active for 3 seconds
            if (stateTime >= 3000) {
                this.flipAttackState = 'idle';
                this.lastFlipAttack = now;
                this.auraActive = false;
            } else {
                // Deal damage to player in aura range
                if (now - this.lastAuraDamage >= this.auraDamageInterval) {
                    this.lastAuraDamage = now;
                    const dx = player.x - this.x;
                    const dy = player.y - this.y;
                    const distance = Math.sqrt(dx * dx + dy * dy);
                    
                    if (distance < this.auraRadius + player.radius) {
                        player.takeDamage(this.auraDamage);
                    }
                }
            }
        }
    }
    
    takeDamage(damage, source = 'unknown') {
        // Don't take damage if already dying
        if (this.isDying) {
            return false;
        }
        
        // Boss is invincible for 25 seconds after music starts OR temporarily from health thresholds
        if (this.invincible || this.temporaryInvincible) {
            const invincibilityType = this.invincible ? 'initial' : 'temporary';
            console.log(`[Boss] Damage blocked (${invincibilityType} invincible): ${damage} from ${source}`);
            return false; // No damage taken
        }
        
        // Cap damage at 10% of max health per attack
        const maxDamagePerAttack = this.maxHealth * 0.1;
        const cappedDamage = Math.min(damage, maxDamagePerAttack);
        
        const oldHealth = this.health;
        const oldHealthPercent = oldHealth / this.maxHealth;
        this.health -= cappedDamage;
        const newHealthPercent = this.health / this.maxHealth;
        
        // Check if we crossed a health threshold (75%, 50%, 25%)
        const thresholds = [0.75, 0.50, 0.25];
        for (const threshold of thresholds) {
            if (oldHealthPercent > threshold && newHealthPercent <= threshold && !this.healthThresholdsTriggered.includes(threshold)) {
                // Crossed threshold - grant 10 seconds of invincibility
                this.healthThresholdsTriggered.push(threshold);
                this.temporaryInvincible = true;
                this.temporaryInvincibilityEndTime = Date.now() + 10000; // 10 seconds
                console.log(`[Boss] Crossed ${threshold * 100}% health threshold! Granting 10 seconds of invincibility.`);
                break; // Only trigger one threshold per damage instance
            }
        }
        
        if (damage > maxDamagePerAttack) {
            console.log(`[Boss] Took ${cappedDamage} damage (capped from ${damage}) from ${source}. Health: ${oldHealth} -> ${this.health}/${this.maxHealth}`);
        } else {
            console.log(`[Boss] Took ${cappedDamage} damage from ${source}. Health: ${oldHealth} -> ${this.health}/${this.maxHealth}`);
        }
        if (this.health <= 0) {
            this.health = 0;
            console.log(`[Boss] DEFEATED! Starting death animation...`);
            
            // Start death animation
            this.isDying = true;
            this.deathStartTime = Date.now();
            this.currentScale = 1.0;
            this.currentOpacity = 1.0;
            this.flickerVisible = true;
            this.lastFlickerTime = Date.now();
            
            // Play boss death sound effect
            SoundEffects.play('bossDeath');
            
            // Stop all music
            MusicManager.stop();
            
            return true; // Boss killed
        }
        return false; // Boss still alive
    }
    
    draw(ctx) {
        const spriteData = SpriteManager.getSprite('boss');
        
        ctx.save();
        ctx.translate(this.x, this.y);
        
        // Apply death animation effects
        if (this.isDying) {
            // Apply scale (grows during death)
            ctx.scale(this.currentScale, this.currentScale);
            
            // Apply opacity (fades during death)
            ctx.globalAlpha = this.currentOpacity;
            
            // Flicker effect - only draw if visible
            if (!this.flickerVisible) {
                ctx.restore();
                return; // Skip drawing this frame for flicker
            }
        } else {
            // Apply pulse scale for politician attack (only if not dying)
            if (this.politicianState === 'pulsing') {
                ctx.scale(this.pulseScale, this.pulseScale);
            }
        }
        
        // Flip horizontally if facing right
        if (this.facingRight) {
            ctx.scale(-1, 1);
        }
        
        if (spriteData && spriteData.image) {
            // Draw boss sprite at 262.5x262.5 (30% reduction from 375)
            // Scale is applied via ctx.scale above
            ctx.drawImage(
                spriteData.image,
                -this.size / 2, // Center X
                -this.size / 2, // Center Y
                this.size,      // Width
                this.size       // Height
            );
        } else {
            // Fallback visualization
            ctx.fillStyle = '#8b0000';
            ctx.beginPath();
            ctx.arc(0, 0, this.size / 2, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = '#ff0000';
            ctx.lineWidth = 10;
            ctx.stroke();
        }
        
        // Reset opacity after drawing
        ctx.globalAlpha = 1.0;
        ctx.restore();
        
        // Draw red overlay if flamed (after sprite but before other effects)
        if (this.flamedTicks > 0 && !this.isDying) {
            ctx.save();
            ctx.globalAlpha = 0.4; // Semi-transparent red overlay
            ctx.fillStyle = '#ff0000';
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size / 2, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }
        
        // Don't draw aura, invincibility indicator, or health bar during death animation
        if (!this.isDying) {
            // Draw red aura if active
            if (this.auraActive) {
                ctx.save();
                ctx.globalAlpha = 0.3;
                ctx.fillStyle = '#ff0000';
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.auraRadius, 0, Math.PI * 2);
                ctx.fill();
                ctx.globalAlpha = 1.0;
                ctx.strokeStyle = '#ff0000';
                ctx.lineWidth = 3;
                ctx.stroke();
                ctx.restore();
            }
            
            // Draw boss health bar
            if (this.hasReachedTarget) {
                const barWidth = this.size;
                const barHeight = 10;
                const healthPercent = this.health / this.maxHealth;
                const barY = this.y - this.size / 2 - 25;
                
                ctx.fillStyle = '#333';
                ctx.fillRect(this.x - barWidth / 2, barY, barWidth, barHeight);
                // Use gold color if temporarily invincible, red otherwise
                ctx.fillStyle = this.temporaryInvincible ? '#ffd700' : '#ff0000';
                ctx.fillRect(this.x - barWidth / 2, barY, barWidth * healthPercent, barHeight);
                ctx.strokeStyle = '#fff';
                ctx.lineWidth = 2;
                ctx.strokeRect(this.x - barWidth / 2, barY, barWidth, barHeight);
            }
        }
    }
}

// Enemy Projectile Class (for Incel shots and Politician spheres)
class EnemyProjectile {
    constructor(x, y, angle, speed, damage, type = 'incel', maxDistance = Infinity, lifetime = Infinity, isElite = false, isSuperElite = false) {
        this.x = x;
        this.y = y;
        this.startX = x;
        this.startY = y;
        this.angle = angle;
        this.baseSpeed = speed; // Store base speed for slow effect
        this.speed = speed; // pixels per second (scaled)
        this.damage = damage;
        this.type = type; // 'incel' or 'politician' (both red now)
        this.isElite = isElite || isSuperElite; // Whether this projectile came from an elite enemy
        this.isSuperElite = isSuperElite; // Whether this projectile came from a super elite enemy
        // Elite projectiles are double size, super elite are quadruple size
        const baseRadius = (type === 'incel' ? 4 : 6) * CONFIG.scaleFactor;
        if (isSuperElite) {
            this.radius = baseRadius * 4; // 4x size for super elite
        } else if (isElite) {
            this.radius = baseRadius * 2; // 2x size for elite
        } else {
            this.radius = baseRadius;
        }
        this.maxDistance = maxDistance; // For politician spheres (30 pixels)
        this.lifetime = lifetime; // Lifetime in ms (for incels)
        this.created = Date.now(); // Track creation time for lifetime
        this.color = (isElite || isSuperElite) ? '#ff8800' : '#ff0000'; // Orange for elite/super elite, red for normal
        this.ovulationPoolTime = 0; // Total time spent in ovulation pools (in milliseconds)
    }

    update(deltaTime) {
        // Check if projectile overlaps with any ovulation pools (35% slow, scaled by damage multiplier)
        let currentSpeed = this.baseSpeed;
        let inPool = false;
        for (const pool of gameState.damagePools) {
            const dx = this.x - pool.x;
            const dy = this.y - pool.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance < this.radius + pool.radius) {
                inPool = true;
                
                // Track time in ovulation pool (add deltaTime in seconds, convert to ms)
                this.ovulationPoolTime += deltaTime * 1000;
                
                // Overlapping with pool - apply 35% slow scaled by damage multiplier
                // Base slow: 35% (multiply by 0.65)
                // With damage multiplier: stronger slow (e.g., 2x damage = 70% slow = multiply by 0.3)
                // Formula: 1 - (0.35 * damageMultiplier), clamped between 0.1 and 0.65
                const damageMultiplier = pool.damageMultiplier || 1.0; // Default to 1.0 if not set
                const slowPercent = 0.35 * damageMultiplier;
                const speedMultiplier = Math.max(0.1, Math.min(0.65, 1 - slowPercent));
                currentSpeed = this.baseSpeed * speedMultiplier;
                break; // Only need to check if overlapping with at least one pool
            }
        }
        
        // Destroy projectile if it's been in ovulation pools for 5 seconds total
        if (this.ovulationPoolTime >= 5000) {
            return false; // Remove projectile
        }
        
        // Scale speed by deltaTime and scaleFactor for consistent movement
        const scaledSpeed = currentSpeed * CONFIG.scaleFactor * deltaTime;
        this.x += Math.cos(this.angle) * scaledSpeed;
        this.y += Math.sin(this.angle) * scaledSpeed;

        // Check if exceeded max distance (for politician spheres)
        const distanceTraveled = Math.sqrt(
            (this.x - this.startX) ** 2 + (this.y - this.startY) ** 2
        );
        if (distanceTraveled > this.maxDistance) {
            return false; // Remove projectile
        }
        
        // Check if lifetime expired (for incels with finite lifetime)
        if (this.lifetime !== Infinity && Date.now() - this.created > this.lifetime) {
            return false; // Remove projectile
        }

        // Remove if out of bounds
        if (this.x < -50 || this.x > CONFIG.width + 50 ||
            this.y < -50 || this.y > CONFIG.height + 50) {
            return false;
        }

        // Check collision with player
        const player = gameState.player;
        if (player) {
            const dx = this.x - player.x;
            const dy = this.y - player.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance < this.radius + player.radius) {
                player.takeDamage(this.damage);
                return false; // Remove projectile after hitting
            }
        }

        return true;
    }

    draw(ctx) {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        ctx.fill();
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1;
        ctx.stroke();
    }
}

// Enemy Class
class Enemy {
    constructor(x, y, type = 'bills') {
        this.x = x;
        this.y = y;
        this.type = type;
        
        // First check for super elite (1 in 50 = 2% base, +3% per cock ring level)
        const baseSuperEliteChance = 0.02; // 2% base chance (1 in 50)
        const superEliteCockRingBonus = gameState.cockRingLevel * 0.03; // +3% per level
        const superEliteChance = Math.min(1.0, baseSuperEliteChance + superEliteCockRingBonus); // Cap at 100%
        this.isSuperElite = Math.random() < superEliteChance;
        
        // If not super elite, check for regular elite (5% base, +10% per cock ring level)
        if (!this.isSuperElite) {
            const baseEliteChance = 0.05; // 5% base chance (1 in 20)
            const cockRingBonus = gameState.cockRingLevel * 0.10; // +10% per level
            const eliteChance = Math.min(1.0, baseEliteChance + cockRingBonus); // Cap at 100%
            this.isElite = Math.random() < eliteChance;
        } else {
            // Super elite is also elite (gets all elite bonuses plus more)
            this.isElite = true;
        }
        
        if (type === 'bills') {
            this.radius = 20 * CONFIG.scaleFactor;
            this.baseSpeed = 10; // pixels per second (scaled) - doubled from 5
            this.speed = this.baseSpeed;
            this.health = 20; // Doubled from 10
            this.maxHealth = 20; // Doubled from 10
            this.color = '#666666';
            this.xpValue = 1;
            this.damage = 5; // Contact damage
            this.difficulty = 1;
        } else if (type === 'incels') {
            this.radius = 36 * CONFIG.scaleFactor; // Doubled from 18, scaled
            this.baseSpeed = 20; // pixels per second (scaled) - was 1.2/frame ≈ 20/sec at 16-17 FPS
            this.speed = this.baseSpeed;
            this.health = 100; // Doubled from 50
            this.maxHealth = 100; // Doubled from 50
            this.color = '#aaaaaa';
            this.xpValue = 2;
            this.damage = 0; // No contact damage, uses projectiles
            this.difficulty = 2;
            this.shootCooldown = 2000; // Shoot every 2 seconds
            this.lastShot = Date.now() - this.shootCooldown; // Allow immediate shot
        } else if (type === 'politicians') {
            this.radius = 44 * CONFIG.scaleFactor; // Doubled from 22, scaled
            this.baseSpeed = 10; // pixels per second (scaled) - was 0.6/frame ≈ 10/sec at 16-17 FPS
            this.speed = this.baseSpeed;
            this.health = 600; // Tripled from 200
            this.maxHealth = 600; // Tripled from 200
            this.color = '#8b0000';
            this.xpValue = 3;
            this.damage = 40; // Body contact damage
            this.difficulty = 3;
            this.state = 'idle'; // 'idle', 'pulsing', 'charging', 'attacking'
            this.stateStartTime = Date.now();
            this.chargeTargetX = 0;
            this.chargeTargetY = 0;
            this.chargeStartX = 0;
            this.chargeStartY = 0;
            this.chargeDistance = 0;
            this.maxChargeDistance = 300;
            this.pulseScale = 1.0;
            this.hasShotSpheres = false; // Prevent double-shooting
        } else {
            // Default to Bills if unknown type
            this.radius = 20 * CONFIG.scaleFactor;
            this.baseSpeed = 5; // pixels per second (scaled) - very slow approach
            this.speed = this.baseSpeed;
            this.health = 20; // Doubled from 10
            this.maxHealth = 20; // Doubled from 10
            this.color = '#666666';
            this.xpValue = 1;
            this.damage = 5;
            this.difficulty = 1;
        }
        
        // Apply elite bonuses if this enemy is elite
        if (this.isElite) {
            // Base elite bonuses
            let sizeMultiplier = 2; // Double size
            let speedMultiplier = 2; // Double speed
            let hpMultiplier = 2; // Double HP
            let hpBonus = 20; // +20 HP bonus for elite
            let xpMultiplier = 5; // 5x XP
            let cooldownDivisor = 2; // Half cooldown
            
            // Super elite gets double the bonuses (4x size, 4x speed, double HP + 50, 10x XP, quarter cooldown)
            if (this.isSuperElite) {
                sizeMultiplier = 4; // 4x size (double of elite)
                speedMultiplier = 4; // 4x speed (double of elite)
                hpMultiplier = 2; // Still double HP (not 4x)
                hpBonus = 50; // +50 HP bonus for super elite
                xpMultiplier = 10; // 10x XP (double of elite's 5x)
                cooldownDivisor = 4; // Quarter cooldown (half of elite's half)
            }
            
            // Apply multipliers
            this.radius *= sizeMultiplier;
            this.baseSpeed *= speedMultiplier;
            this.speed = this.baseSpeed;
            this.health = (this.health * hpMultiplier) + hpBonus; // Double HP + bonus
            this.maxHealth = (this.maxHealth * hpMultiplier) + hpBonus; // Double max HP + bonus
            this.xpValue *= xpMultiplier;
            // Half/quarter attack cooldown (for incels/politicians)
            if (this.shootCooldown) {
                this.shootCooldown /= cooldownDivisor;
            }
            // Double/quadruple charge distance for politicians
            if (this.type === 'politicians') {
                if (this.isSuperElite) {
                    this.maxChargeDistance *= 4; // Quadruple for super elite
                } else {
                    this.maxChargeDistance *= 2; // Double for elite
                }
            }
        }
        
        // Apply Cock Ring HP increase (20% per level)
        if (gameState.cockRingLevel > 0) {
            const hpMultiplier = 1 + (gameState.cockRingLevel * 0.2);
            this.health = Math.floor(this.health * hpMultiplier);
            this.maxHealth = Math.floor(this.maxHealth * hpMultiplier);
        }
        
        this.slowMultiplier = 1.0; // Speed multiplier from slow effects
        this.facingRight = true; // Track direction for sprite flipping (incels/politicians)
        
        // Flamed effect (from Hitachi)
        this.flamedTicks = 0; // Number of active flame ticks
        this.lastFlameTickTime = 0; // Last time a flame tick occurred
        this.flameDamageInterval = 200; // Damage every 200ms
    }

    update(deltaTime) {
        const now = Date.now();
        const player = gameState.player;
        if (!player) return;

        // Handle flamed effect (from Hitachi)
        if (this.flamedTicks > 0) {
            // Deal damage every 200ms per tick
            if (now - this.lastFlameTickTime >= this.flameDamageInterval) {
                const damagePerTick = 3;
                const totalDamage = damagePerTick * this.flamedTicks;
                const killed = this.takeDamage(totalDamage);
                if (killed) {
                    spawnExperienceOrb(this.x, this.y, this.xpValue);
                    // Remove from enemies array (will be handled by caller)
                }
                this.lastFlameTickTime = now;
                // Remove one tick after dealing damage
                this.flamedTicks = Math.max(0, this.flamedTicks - 1);
            }
        }

        // Reset speed to base speed, then apply slow effects
        this.speed = this.baseSpeed;
        this.slowMultiplier = 1.0;
        
        // Check if enemy is in any ovulation pool (for slow effect)
        for (const pool of gameState.damagePools) {
            const dx = pool.x - this.x;
            const dy = pool.y - this.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance < pool.radius + this.radius) {
                // Apply slow: 5% per level, scaled by damage multiplier
                // Base slow: 5% per level
                // With damage multiplier: stronger slow (e.g., 2x damage = 10% per level)
                const damageMultiplier = pool.damageMultiplier || 1.0; // Default to 1.0 if not set
                const slowPercent = pool.level * 0.05 * damageMultiplier;
                this.slowMultiplier *= (1 - slowPercent);
            }
        }
        
        // Apply slow multiplier to speed
        this.speed *= this.slowMultiplier;

        // Type-specific behavior
        if (this.type === 'incels') {
            // Incels: move towards player and shoot
            const dx = player.x - this.x;
            const dy = player.y - this.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance > 0) {
                // Scale speed by deltaTime and scaleFactor for consistent movement
                const scaledSpeed = this.speed * CONFIG.scaleFactor * deltaTime;
                this.x += (dx / distance) * scaledSpeed;
                this.y += (dy / distance) * scaledSpeed;
                // Update facing direction (right by default, flip if moving left)
                this.facingRight = dx >= 0;
            }

            // Shoot at player
            if (now - this.lastShot >= this.shootCooldown) {
                const angle = Math.atan2(player.y - this.y, player.x - this.x);
                // Elite enemies: double projectile lifetime
                // Base lifetime for incel projectiles (5 seconds at 216 speed ≈ 1080 pixels)
                const baseLifetime = 5000; // 5 seconds in milliseconds
                const projectileLifetime = this.isElite ? baseLifetime * 2 : Infinity; // Double lifetime for elite
                const projectile = new EnemyProjectile(
                    this.x,
                    this.y,
                    angle,
                    216, // Speed (pixels per second, scaled) - 10% slower (240 * 0.9 = 216)
                    20, // Damage
                    'incel',
                    Infinity, // No max distance for incels
                    projectileLifetime,
                    this.isElite, // Pass elite status
                    this.isSuperElite // Pass super elite status
                );
                gameState.enemyProjectiles.push(projectile);
                this.lastShot = now;
            }

            // Check collision with player (no contact damage for incels)
            if (distance < this.radius + player.radius) {
                // Incels don't deal contact damage
            }
        } else if (this.type === 'politicians') {
            // Politicians: state machine (idle -> pulsing -> charging -> attacking)
            const stateTime = now - this.stateStartTime;

            if (this.state === 'idle') {
                // Move slowly towards player
                const dx = player.x - this.x;
                const dy = player.y - this.y;
                const distance = Math.sqrt(dx * dx + dy * dy);

                if (distance > 0) {
                    // Scale speed by deltaTime and scaleFactor for consistent movement
                    const scaledSpeed = this.speed * CONFIG.scaleFactor * deltaTime;
                    this.x += (dx / distance) * scaledSpeed;
                    this.y += (dy / distance) * scaledSpeed;
                    // Update facing direction (right by default, flip if moving left)
                    this.facingRight = dx >= 0;
                }

                // Switch to pulsing after 2 seconds
                if (stateTime > 2000) {
                    this.state = 'pulsing';
                    this.stateStartTime = now;
                }
            } else if (this.state === 'pulsing') {
                // Pulse for 1 second
                const pulseProgress = (stateTime / 1000) % 1;
                this.pulseScale = 1.0 + Math.sin(pulseProgress * Math.PI * 2) * 0.2;

                if (stateTime >= 1000) {
                    // Start charging towards player's current position
                    this.state = 'charging';
                    this.stateStartTime = now;
                    this.chargeTargetX = player.x;
                    this.chargeTargetY = player.y;
                    this.chargeStartX = this.x;
                    this.chargeStartY = this.y;
                    this.chargeDistance = 0;
                    this.pulseScale = 1.0;
                }
            } else if (this.state === 'charging') {
                // Charge in straight line towards target
                const dx = this.chargeTargetX - this.x;
                const dy = this.chargeTargetY - this.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                const chargeSpeed = 480; // pixels per second (scaled) - was 8 per frame

                if (distance > 5) {
                    // Scale speed by deltaTime and scaleFactor for consistent movement
                    const scaledSpeed = chargeSpeed * CONFIG.scaleFactor * deltaTime;
                    this.x += (dx / distance) * scaledSpeed;
                    this.y += (dy / distance) * scaledSpeed;
                    this.chargeDistance += scaledSpeed;
                    // Update facing direction during charge
                    this.facingRight = dx >= 0;
                } else {
                    // Reached target, shoot 8 spheres
                    if (!this.hasShotSpheres) {
                        this.hasShotSpheres = true;
                        this.state = 'attacking';
                        this.stateStartTime = now;
                        
                        // Shoot 8 spheres in 8 directions
                        const directions = [
                            0, Math.PI / 4, Math.PI / 2, 3 * Math.PI / 4,
                            Math.PI, 5 * Math.PI / 4, 3 * Math.PI / 2, 7 * Math.PI / 4
                        ];
                        
                        for (const angle of directions) {
                            // Elite enemies: double projectile lifetime, super elite: quadruple
                            const baseMaxDistance = 120; // Base max distance
                            let projectileMaxDistance = baseMaxDistance;
                            if (this.isSuperElite) {
                                projectileMaxDistance = baseMaxDistance * 4; // Quadruple for super elite
                            } else if (this.isElite) {
                                projectileMaxDistance = baseMaxDistance * 2; // Double for elite
                            }
                            
                            const projectile = new EnemyProjectile(
                                this.x,
                                this.y,
                                angle,
                                300, // Speed (pixels per second, scaled) - was 5 per frame
                                30, // Damage
                                'politician',
                                projectileMaxDistance,
                                Infinity, // No lifetime limit for politicians
                                this.isElite || this.isSuperElite // Pass elite/super elite status
                            );
                            gameState.enemyProjectiles.push(projectile);
                        }
                    }
                }

                // Stop if exceeded max charge distance
                if (this.chargeDistance >= this.maxChargeDistance && !this.hasShotSpheres) {
                    this.hasShotSpheres = true;
                    this.state = 'attacking';
                    this.stateStartTime = now;
                    
                    // Shoot 8 spheres
                    const directions = [
                        0, Math.PI / 4, Math.PI / 2, 3 * Math.PI / 4,
                        Math.PI, 5 * Math.PI / 4, 3 * Math.PI / 2, 7 * Math.PI / 4
                    ];
                    
                        for (const angle of directions) {
                            // Elite enemies: double projectile lifetime, super elite: quadruple
                            const baseMaxDistance = 120; // Base max distance
                            let projectileMaxDistance = baseMaxDistance;
                            if (this.isSuperElite) {
                                projectileMaxDistance = baseMaxDistance * 4; // Quadruple for super elite
                            } else if (this.isElite) {
                                projectileMaxDistance = baseMaxDistance * 2; // Double for elite
                            }
                            const projectile = new EnemyProjectile(
                                this.x,
                                this.y,
                                angle,
                                300, // Speed (pixels per second, scaled) - was 5 per frame
                                30,
                                'politician',
                                projectileMaxDistance,
                                Infinity, // No lifetime limit for politicians
                                this.isElite, // Pass elite status
                                this.isSuperElite // Pass super elite status
                            );
                            gameState.enemyProjectiles.push(projectile);
                        }
                }
            } else if (this.state === 'attacking') {
                // Brief pause after attack, then return to idle
                if (stateTime >= 500) {
                    this.state = 'idle';
                    this.stateStartTime = now;
                    this.hasShotSpheres = false; // Reset for next cycle
                }
            }

            // Check collision with player (body contact damage)
            const dx = player.x - this.x;
            const dy = player.y - this.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            if (distance < this.radius + player.radius) {
                player.takeDamage(this.damage);
            }
        } else {
            // Bills: move towards player
            const dx = player.x - this.x;
            const dy = player.y - this.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance > 0) {
                // Scale speed by deltaTime and scaleFactor for consistent movement
                const scaledSpeed = this.speed * CONFIG.scaleFactor * deltaTime;
                this.x += (dx / distance) * scaledSpeed;
                this.y += (dy / distance) * scaledSpeed;
            }

            // Check collision with player
            if (distance < this.radius + player.radius) {
                const damage = this.damage || 5;
                player.takeDamage(damage);
                // Bills die on contact and drop XP
                if (this.type === 'bills') {
                    this.health = 0;
                    // Drop XP when Bill dies on contact
                    spawnExperienceOrb(this.x, this.y, this.xpValue);
                }
            }
        }
    }

    takeDamage(amount) {
        this.health -= amount;
        return this.health <= 0;
    }

    draw(ctx) {
        ctx.save();

        // Try to draw sprite for new enemy types
        let spriteName = null;
        if (this.type === 'bills') {
            spriteName = 'enemy-bills';
        } else if (this.type === 'incels') {
            spriteName = 'enemy-incels';
        } else if (this.type === 'politicians') {
            spriteName = 'enemy-politicians';
        }

        if (spriteName) {
            const spriteData = SpriteManager.getSprite(spriteName);
            if (spriteData && spriteData.image) {
                const sprite = spriteData.image;
                let spriteSize = this.radius * 2;
                
                // Apply pulse scale for politicians
                if (this.type === 'politicians' && this.state === 'pulsing') {
                    spriteSize *= this.pulseScale;
                }
                
                ctx.translate(this.x, this.y);
                
                // Flip horizontally for incels and politicians when facing left
                // Bills always face the same direction (no flipping)
                if ((this.type === 'incels' || this.type === 'politicians') && !this.facingRight) {
                    ctx.scale(-1, 1); // Flip horizontally
                }
                
                ctx.drawImage(
                    sprite,
                    -spriteSize / 2,
                    -spriteSize / 2,
                    spriteSize,
                    spriteSize
                );
                ctx.restore();
                
                // Draw health bar if damaged
                if (this.health < this.maxHealth) {
                    const barWidth = this.radius * 2;
                    const barHeight = 4;
                    const healthPercent = this.health / this.maxHealth;

                    ctx.fillStyle = '#333';
                    ctx.fillRect(this.x - barWidth / 2, this.y - this.radius - 15, barWidth, barHeight);
                    ctx.fillStyle = '#ff4444';
                    ctx.fillRect(this.x - barWidth / 2, this.y - this.radius - 15, barWidth * healthPercent, barHeight);
                }
                
                // Draw red overlay if flamed
                if (this.flamedTicks > 0) {
                    ctx.save();
                    ctx.globalAlpha = 0.4; // Semi-transparent red overlay
                    ctx.fillStyle = '#ff0000';
                    ctx.beginPath();
                    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.restore();
                }
                return;
            }
        }

        // Fallback to circle for enemies without sprites or if sprite not loaded
        let drawRadius = this.radius;
        if (this.type === 'politicians' && this.state === 'pulsing') {
            drawRadius *= this.pulseScale;
        }
        
        ctx.beginPath();
        ctx.arc(this.x, this.y, drawRadius, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        ctx.fill();
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.stroke();
        
        // Draw red overlay if flamed
        if (this.flamedTicks > 0) {
            ctx.save();
            ctx.globalAlpha = 0.4; // Semi-transparent red overlay
            ctx.fillStyle = '#ff0000';
            ctx.beginPath();
            ctx.arc(this.x, this.y, drawRadius, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }

        // Health bar for enemies with more than 1 HP
        if (this.health < this.maxHealth && this.maxHealth > 1) {
            const barWidth = this.radius * 2;
            const barHeight = 4;
            const healthPercent = this.health / this.maxHealth;

            ctx.fillStyle = '#333';
            ctx.fillRect(this.x - barWidth / 2, this.y - this.radius - 10, barWidth, barHeight);
            ctx.fillStyle = '#ff4444';
            ctx.fillRect(this.x - barWidth / 2, this.y - this.radius - 10, barWidth * healthPercent, barHeight);
        }

        ctx.restore();
    }
}

// Strike Class (for dildo - whip style)
class Strike {
    constructor(playerX, playerY, side, damage, range, duration = 500, rotateAround = false, rotationSpeed = 0, strikeSize = 128) {
        this.playerX = playerX; // Player X position when strike was created
        this.playerY = playerY; // Player Y position when strike was created
        this.side = side; // 'left' or 'right' (or 'rotate' for level 5)
        this.damage = damage;
        this.range = range; // Strike range
        this.created = Date.now();
        this.duration = duration; // Fade duration (increases with level)
        this.strikeWidth = strikeSize; // Sprite width (scaled by attackSize)
        this.strikeHeight = strikeSize; // Sprite height (scaled by attackSize)
        this.hasHit = false; // Track if we've already dealt damage
        this.rotateAround = rotateAround; // Whether to rotate around player
        this.rotationSpeed = rotationSpeed; // Rotation speed in degrees per second
        this.currentAngle = side === 'left' ? Math.PI : 0; // Starting angle (left = 180°, right = 0°)
        this.hitEnemies = new Set(); // Track enemies already hit (for rotating strikes)
        this.lastUpdateTime = null; // Track last update time for rotation
        this.enemyHitTimes = new Map(); // Track when each enemy was last hit (for 300ms cooldown)
        this.hitCooldown = 300; // 300ms cooldown between hits on same enemy
    }

    update() {
        const now = Date.now();
        const age = now - this.created;

        // Remove if expired
        if (age > this.duration) {
            return false;
        }

        const player = gameState.player;
        if (!player) return false;

        // Update rotation angle if rotating
        if (this.rotateAround) {
            // Convert rotation speed from degrees per second to radians per frame
            // rotationSpeed is in degrees per second, convert to radians per millisecond
            const now = Date.now();
            const deltaTime = now - (this.lastUpdateTime || this.created);
            this.lastUpdateTime = now;
            
            const radiansPerMs = (this.rotationSpeed * Math.PI / 180) / 1000;
            this.currentAngle += radiansPerMs * deltaTime;
            
            // Normalize angle to 0-2π
            if (this.currentAngle >= Math.PI * 2) {
                this.currentAngle -= Math.PI * 2;
            }
        }

        // Calculate strike position
        let strikeX, strikeY;
        if (this.rotateAround) {
            // Rotate around player
            strikeX = player.x + Math.cos(this.currentAngle) * this.range;
            strikeY = player.y + Math.sin(this.currentAngle) * this.range;
        } else {
            // Static position (left or right)
            strikeX = this.side === 'left' ? this.playerX - this.range : this.playerX + this.range;
            strikeY = this.playerY;
        }

        // Check collision with enemies (continuous for rotating strikes)
        for (let i = gameState.enemies.length - 1; i >= 0; i--) {
            const enemy = gameState.enemies[i];
            
            // Skip if already hit (for rotating strikes)
            if (this.rotateAround && this.hitEnemies.has(i)) {
                continue;
            }
            
            const dx = strikeX - enemy.x;
            const dy = strikeY - enemy.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            // Enemy is in strike range (use sprite size for hitbox)
            const hitRadius = Math.max(this.strikeWidth, this.strikeHeight) / 2;
            if (distance < hitRadius + enemy.radius) {
                // Check 300ms cooldown per enemy
                const lastHitTime = this.enemyHitTimes.get(i) || 0;
                if (now - lastHitTime >= this.hitCooldown) {
                    // Update hit time
                    this.enemyHitTimes.set(i, now);
                    
                    const killed = enemy.takeDamage(this.damage);
                    if (killed) {
                        spawnExperienceOrb(enemy.x, enemy.y, enemy.xpValue);
                        gameState.enemies.splice(i, 1);
                        // Remove from hit set and hit times if enemy was killed
                        this.hitEnemies.delete(i);
                        this.enemyHitTimes.delete(i);
                    } else {
                        // Mark as hit for rotating strikes
                        if (this.rotateAround) {
                            this.hitEnemies.add(i);
                        }
                    }
                    // For non-rotating strikes, only hit once
                    if (!this.rotateAround) {
                        this.hasHit = true;
                        break;
                    }
                }
            }
        }
        
        // Check collision with boss
        if (gameState.boss && !gameState.boss.invincible) {
            const dx = strikeX - gameState.boss.x;
            const dy = strikeY - gameState.boss.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            const hitRadius = Math.max(this.strikeWidth, this.strikeHeight) / 2;
            
            if (distance < hitRadius + gameState.boss.radius) {
                // Check 300ms cooldown for boss
                const bossLastHitTime = this.enemyHitTimes.get('boss') || 0;
                if (now - bossLastHitTime >= this.hitCooldown) {
                    // Update hit time
                    this.enemyHitTimes.set('boss', now);
                    
                    const killed = gameState.boss.takeDamage(this.damage, 'strike');
                    if (killed) {
                        // Death animation will handle playerWins() call
                        this.enemyHitTimes.delete('boss');
                    }
                    if (!this.rotateAround) {
                        this.hasHit = true;
                    }
                }
            }
        }

        return true;
    }

    draw(ctx) {
        const now = Date.now();
        const age = now - this.created;
        const lifePercent = 1 - (age / this.duration); // Fade from 1.0 to 0.0

        const player = gameState.player;
        if (!player) return;

        // Try to draw sprite
        const spriteData = SpriteManager.getSprite('dildo-effect');
        
        ctx.save();
        
        // Calculate strike position
        let strikeX, strikeY;
        if (this.rotateAround) {
            // Rotate around player
            strikeX = player.x + Math.cos(this.currentAngle) * this.range;
            strikeY = player.y + Math.sin(this.currentAngle) * this.range;
        } else {
            // Static position (left or right)
            strikeX = this.side === 'left' ? this.playerX - this.range : this.playerX + this.range;
            strikeY = this.playerY;
        }
        
        if (spriteData && spriteData.image) {
            const sprite = spriteData.image;
            
            // Apply fade effect
            ctx.globalAlpha = lifePercent;
            
            // Translate to strike position
            ctx.translate(strikeX, strikeY);
            
            // Rotate sprite to point outward from player (for rotating strikes)
            if (this.rotateAround) {
                ctx.rotate(this.currentAngle + Math.PI / 2); // Point outward
            } else {
                // Flip horizontally for right side
                if (this.side === 'right') {
                    ctx.scale(-1, 1);
                }
            }
            
            // Draw the sprite centered
            ctx.drawImage(
                sprite,
                -this.strikeWidth / 2, // Destination X (centered)
                -this.strikeHeight / 2, // Destination Y (centered)
                this.strikeWidth,      // Destination width
                this.strikeHeight      // Destination height
            );
        } else {
            // Fallback visualization
            ctx.globalAlpha = lifePercent * 0.6;
            ctx.fillStyle = '#ff6b9d';
            ctx.beginPath();
            ctx.arc(strikeX, strikeY, 30, 0, Math.PI * 2);
            ctx.fill();
        }
        
        ctx.restore();
    }
}

// Collar Aura Class (for collar - Garlic style constant damage field)
class CollarAura {
    constructor(radius, damage, damageInterval, level = 1, rotationDirection = 0) {
        this.radius = radius;
        this.damage = damage;
        this.damageInterval = damageInterval; // How often to deal damage (ms)
        this.lastDamageTime = 0;
        this.created = Date.now();
        this.level = level;
        this.rotationDirection = rotationDirection; // 1 for clockwise, -1 for counterclockwise, 0 for no rotation
        this.rotationAngle = 0; // Current rotation angle in radians
        this.rotationSpeed = 0.5; // Rotation speed in radians per second
        this.lastUpdateTime = null; // Track last update time for rotation
        // Base sprite size is radius * 2 * 1.3 (30% larger), then increase 200% (3x total), then increase 10% per level
        const baseSize = radius * 2 * 1.3 * 3; // 200% increase (3x original)
        this.baseAuraSize = baseSize * (1 + (level - 1) * 0.1);
        this.auraSize = this.baseAuraSize; // Current size (will pulse at level 5)
        this.isLevel5 = level >= 5; // Track if this is level 5+ aura
        this.pulsePhase = 0; // Phase offset for pulse (0 or Math.PI for opposite ends)
    }

    update() {
        const now = Date.now();
        const player = gameState.player;
        
        if (!player) return false;

        // Update rotation if rotating
        if (this.rotationDirection !== 0) {
            const deltaTime = (now - (this.lastUpdateTime || this.created)) / 1000; // Convert to seconds
            this.lastUpdateTime = now;
            this.rotationAngle += this.rotationSpeed * this.rotationDirection * deltaTime;
            
            // Normalize angle to 0-2π
            if (this.rotationAngle >= Math.PI * 2) {
                this.rotationAngle -= Math.PI * 2;
            } else if (this.rotationAngle < 0) {
                this.rotationAngle += Math.PI * 2;
            }
        }

        // Update size pulsing at level 5 (between 70% and 150% of base size)
        if (this.isLevel5) {
            const pulseTime = (now - this.created) / 1000; // Time in seconds
            const pulse = Math.sin(pulseTime * 2 + this.pulsePhase) * 0.4 + 1.1; // Pulse between 0.7 and 1.5
            this.auraSize = this.baseAuraSize * pulse;
        }

        // Deal damage to enemies in range at intervals
        if (now - this.lastDamageTime >= this.damageInterval) {
            this.lastDamageTime = now;
            
            // Hitbox radius matches the visual sprite size (auraSize is the sprite diameter, so divide by 2 for radius)
            const hitboxRadius = this.auraSize / 2;
            
            for (let i = gameState.enemies.length - 1; i >= 0; i--) {
                const enemy = gameState.enemies[i];
                const dx = player.x - enemy.x;
                const dy = player.y - enemy.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                if (distance < hitboxRadius + enemy.radius) {
                    const killed = enemy.takeDamage(this.damage);
                    if (killed) {
                        spawnExperienceOrb(enemy.x, enemy.y, enemy.xpValue);
                        gameState.enemies.splice(i, 1);
                    }
                }
            }
            
            // Deal damage to boss if in range and not invincible
            if (gameState.boss && !gameState.boss.invincible) {
                const dx = player.x - gameState.boss.x;
                const dy = player.y - gameState.boss.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                if (distance < hitboxRadius + gameState.boss.radius) {
                    const killed = gameState.boss.takeDamage(this.damage, 'collar-aura');
                    if (killed) {
                        // Death animation will handle playerWins() call
                    }
                }
            }
        }

        return true; // Aura persists as long as player exists
    }

    draw(ctx) {
        const player = gameState.player;
        if (!player) return;

        const now = Date.now();
        // Pulse opacity: level 5 has double rate and goes up to 15%
        let pulse;
        if (this.isLevel5) {
            // Level 5: double pulse rate (now/100 instead of now/200) and 3% to 15% range
            pulse = Math.sin(now / 100) * 0.06 + 0.09; // Range: 0.03 to 0.15 (3% to 15%)
        } else {
            // Levels 1-4: normal pulse rate, 3% to 10% range
            pulse = Math.sin(now / 200) * 0.035 + 0.065; // Range: 0.03 to 0.10 (3% to 10%)
        }
        
        // Try to draw sprite
        const spriteData = SpriteManager.getSprite('collar-effect');
        
        ctx.save();
        
        // Translate to player position
        ctx.translate(player.x, player.y);
        
        // Rotate if this aura rotates
        if (this.rotationDirection !== 0) {
            ctx.rotate(this.rotationAngle);
        }
        
        if (spriteData && spriteData.image) {
            const sprite = spriteData.image;
            
            // Apply pulsing opacity
            ctx.globalAlpha = pulse;
            
            // Draw the sprite centered (use current pulsing size)
            ctx.drawImage(
                sprite,
                -this.auraSize / 2, // Destination X (centered)
                -this.auraSize / 2, // Destination Y (centered)
                this.auraSize,      // Destination width (pulsing)
                this.auraSize       // Destination height (pulsing)
            );
        } else {
            // Fallback visualization
            ctx.globalAlpha = pulse;
            let currentRadius = this.radius;
            if (this.isLevel5) {
                const sizeRatio = this.auraSize / this.baseAuraSize;
                currentRadius = this.radius * sizeRatio;
            }
            ctx.fillStyle = '#8b4513';
            ctx.beginPath();
            ctx.arc(0, 0, currentRadius, 0, Math.PI * 2);
            ctx.fill();
        }
        
        ctx.restore();
    }
}

// Damage Pool Class (for ovulation - Santa Water style)
class DamagePool {
    constructor(x, y, radius, damage, duration, level = 1, damageMultiplier = 1.0) {
        this.x = x;
        this.y = y;
        this.baseRadius = radius; // Base radius (for level 5 expansion)
        this.radius = radius; // Current radius (expands at level 5)
        this.damage = damage;
        this.duration = duration; // Total lifetime in ms
        this.created = Date.now();
        this.damageInterval = 200; // Damage every 200ms
        this.lastDamageTime = 0;
        this.rotation = Math.random() * Math.PI * 2; // Random rotation (0 to 2π)
        this.level = level; // Weapon level for slow effect
        this.isLevel5 = level >= 5; // Track if level 5 for expansion
        this.damageMultiplier = damageMultiplier; // Damage multiplier for scaling speed reduction
    }

    update() {
        const now = Date.now();
        const age = now - this.created;

        // Remove if expired
        if (age > this.duration) {
            return false;
        }

        // Level 5: expand radius at 6% per second (20% increase from 5%)
        if (this.isLevel5) {
            const ageInSeconds = age / 1000;
            const expansionRate = 0.06; // 6% per second (20% increase from 5%)
            this.radius = this.baseRadius * (1 + ageInSeconds * expansionRate);
        }

        // Deal damage to enemies in range
        if (now - this.lastDamageTime >= this.damageInterval) {
            this.lastDamageTime = now;
            
            for (let i = gameState.enemies.length - 1; i >= 0; i--) {
                const enemy = gameState.enemies[i];
                const dx = this.x - enemy.x;
                const dy = this.y - enemy.y;
                const distance = Math.sqrt(dx * dx + dy * dy);

                // Enemy is in pool range
                if (distance < this.radius + enemy.radius) {
                    const killed = enemy.takeDamage(this.damage);
                    if (killed) {
                        spawnExperienceOrb(enemy.x, enemy.y, enemy.xpValue);
                        gameState.enemies.splice(i, 1);
                    }
                }
            }
            
            // Deal damage to boss if in range and not invincible
            if (gameState.boss && !gameState.boss.invincible) {
                const dx = this.x - gameState.boss.x;
                const dy = this.y - gameState.boss.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                if (distance < this.radius + gameState.boss.radius) {
                    const killed = gameState.boss.takeDamage(this.damage, 'damage-pool');
                    if (killed) {
                        // Death animation will handle playerWins() call
                    }
                }
            }
        }

        return true;
    }

    draw(ctx) {
        const now = Date.now();
        const age = now - this.created;
        const lifePercent = 1 - (age / this.duration);
        
        // Pulsing effect for opacity (lighter/darker) - faster pulse rate at level 5
        const pulseRate = this.isLevel5 ? 50 : 100; // 2x faster at level 5
        const pulse = Math.sin(age / pulseRate) * 0.15 + 0.85; // Pulse between 0.7 and 1.0
        
        // Try to draw sprite
        const spriteData = SpriteManager.getSprite('pool-ovulation');
        
        ctx.save();
        
        if (spriteData && spriteData.image) {
            // Use sprite with pulse and fade effects
            const sprite = spriteData.image;
            const spriteSize = this.radius * 2; // Sprite size matches pool diameter (expands at level 5)
            
            // Apply fade and pulse to opacity
            const baseOpacity = lifePercent * pulse;
            ctx.globalAlpha = baseOpacity;
            
            // Translate to center, rotate, then draw
            ctx.translate(this.x, this.y);
            ctx.rotate(this.rotation);
            
            // Draw the sprite centered
            ctx.drawImage(
                sprite,
                -spriteSize / 2, // Destination X (centered)
                -spriteSize / 2, // Destination Y (centered)
                spriteSize,      // Destination width
                spriteSize       // Destination height
            );
        } else {
            // Fallback to original gradient if sprite not loaded
            const pulseRate = this.isLevel5 ? 50 : 100; // 2x faster pulse at level 5
            const currentRadius = this.radius * (Math.sin(age / pulseRate) * 0.1 + 1);
            ctx.globalAlpha = lifePercent * 0.6;
            
            const gradient = ctx.createRadialGradient(
                this.x, this.y, 0,
                this.x, this.y, currentRadius
            );
            gradient.addColorStop(0, 'rgba(255, 100, 200, 0.8)');
            gradient.addColorStop(0.5, 'rgba(200, 50, 150, 0.5)');
            gradient.addColorStop(1, 'rgba(150, 0, 100, 0.2)');
            
            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(this.x, this.y, currentRadius, 0, Math.PI * 2);
            ctx.fill();
            
            ctx.globalAlpha = lifePercent * 0.9;
            ctx.fillStyle = 'rgba(255, 150, 220, 0.7)';
            ctx.beginPath();
            ctx.arc(this.x, this.y, currentRadius * 0.6, 0, Math.PI * 2);
            ctx.fill();
        }
        
        ctx.restore();
    }
}

// Projectile Class
class Projectile {
    constructor(x, y, angle, speed, damage, type = 'normal', pierce = false, sizeMultiplier = 1, opacity = 1.0, lifetime = 2000, weaponLevel = 1) {
        this.x = x;
        this.y = y;
        this.angle = angle;
        this.speed = speed; // pixels per second (scaled)
        this.damage = damage;
        // Apply permanent attack size bonus to projectile radius
        const bonuses = PermanentStats.getBonuses();
        this.radius = 5 * CONFIG.scaleFactor * bonuses.attackSize;
        this.type = type;
        this.lifetime = lifetime; // Lifetime in ms (default 2 seconds)
        this.created = Date.now();
        this.pierce = pierce; // Whether projectile pierces through enemies
        this.sizeMultiplier = sizeMultiplier; // Size multiplier for sprite rendering
        this.opacity = opacity; // Opacity for rendering (0.0 to 1.0)
        this.weaponLevel = weaponLevel; // Weapon level for size scaling (Hitachi)
        
        // For buttplug: track how many enemy projectiles can be absorbed
        if (this.type === 'buttplug') {
            // Level 1 = 1, Level 5 = 3 (linear scaling)
            this.maxEnemyProjectiles = Math.floor(1 + (weaponLevel - 1) * 0.5);
            this.absorbedEnemyProjectiles = 0; // Track how many have been absorbed
        }
    }

    update(deltaTime) {
        // Scale speed by deltaTime and scaleFactor for consistent movement
        const scaledSpeed = this.speed * CONFIG.scaleFactor * deltaTime;
        this.x += Math.cos(this.angle) * scaledSpeed;
        this.y += Math.sin(this.angle) * scaledSpeed;

        // Remove if out of bounds or expired
        if (this.x < -50 || this.x > CONFIG.width + 50 ||
            this.y < -50 || this.y > CONFIG.height + 50 ||
            Date.now() - this.created > this.lifetime) {
            return false;
        }

        // Check collision with enemies
        for (let i = gameState.enemies.length - 1; i >= 0; i--) {
            const enemy = gameState.enemies[i];
            const dx = this.x - enemy.x;
            const dy = this.y - enemy.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            // Use sprite size for hitachi and buttplug, radius for others
            let hitRadius = this.radius;
            if (this.type === 'hitachi') {
                // Base size is 30% of original 32px, then grows 10% per level
                const baseSize = 32 * 0.3; // 9.6
                const sizeMultiplier = 1 + (this.weaponLevel - 1) * 0.1; // +10% per level
                const spriteSize = baseSize * sizeMultiplier;
                hitRadius = spriteSize / 2; // Radius is half the sprite size
            } else if (this.type === 'buttplug') {
                const baseSize = 12; // 24x24 sprite = 12px radius
                hitRadius = baseSize * this.sizeMultiplier; // Scale with size multiplier
            }
            
            if (distance < hitRadius + enemy.radius) {
                const killed = enemy.takeDamage(this.damage);
                
                // Apply flamed effect if Hitachi projectile
                if (this.type === 'hitachi') {
                    enemy.flamedTicks += 1; // Add one tick
                    if (enemy.lastFlameTickTime === 0) {
                        enemy.lastFlameTickTime = Date.now(); // Initialize tick time
                    }
                }
                
                if (killed) {
                    // Spawn experience orb
                    spawnExperienceOrb(enemy.x, enemy.y, enemy.xpValue);
                    gameState.enemies.splice(i, 1);
                }
                // If piercing, continue; otherwise remove projectile
                if (!this.pierce) {
                    return false; // Remove projectile
                }
            }
        }
        
        // Check collision with boss
        if (gameState.boss && !gameState.boss.invincible) {
            const dx = this.x - gameState.boss.x;
            const dy = this.y - gameState.boss.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            // Use sprite size for hitachi and buttplug, radius for others
            let hitRadius = this.radius;
            if (this.type === 'hitachi') {
                const baseSize = 32 * 0.3;
                const sizeMultiplier = 1 + (this.weaponLevel - 1) * 0.1;
                const spriteSize = baseSize * sizeMultiplier;
                hitRadius = spriteSize / 2;
            } else if (this.type === 'buttplug') {
                const baseSize = 12;
                hitRadius = baseSize * this.sizeMultiplier;
            }
            
            if (distance < hitRadius + gameState.boss.radius) {
                const killed = gameState.boss.takeDamage(this.damage, `projectile-${this.type}`);
                
                // Apply flamed effect if Hitachi projectile
                if (this.type === 'hitachi') {
                    gameState.boss.flamedTicks += 1; // Add one tick
                    if (gameState.boss.lastFlameTickTime === 0) {
                        gameState.boss.lastFlameTickTime = Date.now(); // Initialize tick time
                    }
                }
                
                if (killed) {
                    // Death animation will handle playerWins() call
                }
                // If piercing, continue; otherwise remove projectile
                if (!this.pierce) {
                    return false; // Remove projectile
                }
            }
        }
        
        // Check collision with enemy projectiles (for buttplug only, non-boss projectiles)
        if (this.type === 'buttplug' && this.absorbedEnemyProjectiles < this.maxEnemyProjectiles) {
            // Use sprite size for hit radius
            const baseSize = 12;
            const hitRadius = baseSize * this.sizeMultiplier;
            
            for (let i = gameState.enemyProjectiles.length - 1; i >= 0; i--) {
                const enemyProj = gameState.enemyProjectiles[i];
                
                // Skip boss projectiles (if they exist - currently all are non-boss)
                // Only absorb non-boss projectiles
                const dx = this.x - enemyProj.x;
                const dy = this.y - enemyProj.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                if (distance < hitRadius + enemyProj.radius) {
                    // Absorb the enemy projectile
                    gameState.enemyProjectiles.splice(i, 1);
                    this.absorbedEnemyProjectiles++;
                    
                    // If buttplug has absorbed its max, remove it
                    if (this.absorbedEnemyProjectiles >= this.maxEnemyProjectiles) {
                        return false; // Remove buttplug projectile
                    }
                }
            }
        }

        return true;
    }

    draw(ctx) {
        ctx.save();
        
        // Hitachi uses sprite (always upright, no rotation)
        if (this.type === 'hitachi') {
            const spriteData = SpriteManager.getSprite('hitachi-effect');
            
            ctx.save();
            
            // Apply opacity
            ctx.globalAlpha = this.opacity;
            
            if (spriteData && spriteData.image) {
                const sprite = spriteData.image;
                // Base size is 30% of original 32px, then grows 10% per level
                const baseSize = 32 * 0.3; // 9.6
                const sizeMultiplier = 1 + (this.weaponLevel - 1) * 0.1; // +10% per level
                const spriteSize = baseSize * sizeMultiplier;
                
                ctx.translate(this.x, this.y);
                // No rotation - sprite stays upright
                
                // Draw the sprite centered
                ctx.drawImage(
                    sprite,
                    -spriteSize / 2, // Destination X (centered)
                    -spriteSize / 2, // Destination Y (centered)
                    spriteSize,      // Destination width
                    spriteSize       // Destination height
                );
            } else {
                // Fallback to circle if sprite not loaded
                ctx.translate(this.x, this.y);
                // No rotation for hitachi
                ctx.fillStyle = '#ff6b00';
                ctx.strokeStyle = '#ffaa00';
                ctx.beginPath();
                ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
                ctx.fill();
                ctx.lineWidth = 2;
                ctx.stroke();
            }
            
            ctx.restore();
        } else if (this.type === 'buttplug') {
            // Buttplug uses smaller version of its own sprite, rotated to point in direction
            const spriteData = SpriteManager.getSprite('weapon-buttplug');
            
            if (spriteData && spriteData.image) {
                const sprite = spriteData.image;
                const baseSpriteSize = 24; // Base size smaller than weapon icon (128x128 -> 24x24)
                const spriteSize = baseSpriteSize * this.sizeMultiplier; // Apply size multiplier
                
                ctx.translate(this.x, this.y);
                // Rotate so top of icon points in direction of travel
                // angle is already in radians, pointing right = 0, so we add Math.PI/2 to point up
                ctx.rotate(this.angle + Math.PI / 2);
                
                // Draw the sprite centered
                ctx.drawImage(
                    sprite,
                    -spriteSize / 2, // Destination X (centered)
                    -spriteSize / 2, // Destination Y (centered)
                    spriteSize,      // Destination width
                    spriteSize       // Destination height
                );
            } else {
                // Fallback to circle if sprite not loaded
                ctx.translate(this.x, this.y);
                ctx.rotate(this.angle);
                ctx.fillStyle = '#ffff00';
                ctx.strokeStyle = '#ffaa00';
                ctx.beginPath();
                ctx.arc(0, 0, this.radius * this.sizeMultiplier, 0, Math.PI * 2);
                ctx.fill();
                ctx.lineWidth = 2;
                ctx.stroke();
            }
        } else {
            // Other projectiles use circles
            ctx.translate(this.x, this.y);
            ctx.rotate(this.angle);

            if (this.type === 'fire') {
                ctx.fillStyle = '#ff6b00';
                ctx.strokeStyle = '#ffaa00';
            } else if (this.type === 'ice') {
                ctx.fillStyle = '#00aaff';
                ctx.strokeStyle = '#00ddff';
            } else {
                ctx.fillStyle = '#ffff00';
                ctx.strokeStyle = '#ffaa00';
            }

            ctx.beginPath();
            ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
            ctx.fill();
            ctx.lineWidth = 2;
            ctx.stroke();
        }

        ctx.restore();
    }
}

// Experience Orb Class
class ExperienceOrb {
    constructor(x, y, value) {
        this.x = x;
        this.y = y;
        this.value = value;
        this.radius = 16 * CONFIG.scaleFactor; // 32x32 sprite / 2 (base size), scaled
        this.baseSpeed = 12; // pixels per second (scaled) - doubled from 6
        this.attractionSpeed = 600; // pixels per second (scaled) - doubled from 300
        this.attractionRange = 25 * CONFIG.scaleFactor; // Full attraction range, scaled
        this.collected = false;
        this.isAttracting = false; // Track if currently being attracted
    }

    update(deltaTime) {
        if (this.collected) return;

        const player = gameState.player;
        if (!player) return;

        // Check distance to player
        const dxToPlayer = player.x - this.x;
        const dyToPlayer = player.y - this.y;
        const distanceToPlayer = Math.sqrt(dxToPlayer * dxToPlayer + dyToPlayer * dyToPlayer);

        // Check if within attraction range to player
        this.isAttracting = distanceToPlayer < this.attractionRange;
        
        let targetX = player.x;
        let targetY = player.y;
        let speed = this.baseSpeed;
        
        // If not being attracted to player, check for nearby orbs
        if (!this.isAttracting) {
            let nearestOrb = null;
            let nearestDistance = Infinity;
            
            // Find nearest orb within 128 pixels (scaled)
            const mergeRange = 128 * CONFIG.scaleFactor;
            for (const otherOrb of gameState.experienceOrbs) {
                if (otherOrb === this || otherOrb.collected) continue;
                
                const dx = otherOrb.x - this.x;
                const dy = otherOrb.y - this.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                if (distance < mergeRange && distance < nearestDistance) {
                    nearestDistance = distance;
                    nearestOrb = otherOrb;
                }
            }
            
            // If found nearby orb, move towards it
            if (nearestOrb) {
                targetX = nearestOrb.x;
                targetY = nearestOrb.y;
                speed = 120; // pixels per second (scaled) - doubled from 60
            } else {
                // Move towards player at base speed
                speed = this.baseSpeed;
            }
        } else {
            // Being attracted to player - use attraction speed
            speed = this.attractionSpeed;
        }

        // Move towards target
        const dx = targetX - this.x;
        const dy = targetY - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance > 0) {
            // Scale speed by deltaTime and scaleFactor for consistent movement
            const scaledSpeed = speed * CONFIG.scaleFactor * deltaTime;
            this.x += (dx / distance) * scaledSpeed;
            this.y += (dy / distance) * scaledSpeed;
        }

        // Check collection (use scaled radius based on XP value)
        const sizeMultiplier = 1 + (this.value * 0.01);
        const currentRadius = this.radius * sizeMultiplier;
        if (distanceToPlayer < currentRadius + player.radius) {
            this.collected = true;
            gameState.xp += this.value;
            checkLevelUp();
        }
    }

    draw(ctx) {
        if (this.collected) return;

        // Try to draw sprite
        const spriteData = SpriteManager.getSprite('xp');
        
        ctx.save();
        
        if (spriteData && spriteData.image) {
            const sprite = spriteData.image;
            
            // Calculate opacity: 10% for 1 XP, 100% for 100 XP
            // Linear interpolation: opacity = 0.1 + (value - 1) * (0.9 / 99)
            const opacity = Math.min(1.0, Math.max(0.1, 0.1 + (this.value - 1) * (0.9 / 99)));
            
            // Calculate size: increase by 1% per XP value
            const sizeMultiplier = 1 + (this.value * 0.01);
            const currentSize = this.radius * 2 * sizeMultiplier; // Base size * multiplier
            
            ctx.globalAlpha = opacity;
            
            // Draw the sprite centered
            ctx.drawImage(
                sprite,
                this.x - currentSize / 2, // Destination X (centered)
                this.y - currentSize / 2, // Destination Y (centered)
                currentSize,             // Destination width (scaled by XP)
                currentSize              // Destination height (scaled by XP)
            );
        } else {
            // Fallback to circle if sprite not loaded
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
            ctx.fillStyle = '#00ff88';
            ctx.fill();
            ctx.strokeStyle = '#00cc66';
            ctx.lineWidth = 2;
            ctx.stroke();

            // Glow effect
            ctx.shadowBlur = 10;
            ctx.shadowColor = '#00ff88';
            ctx.fill();
            ctx.shadowBlur = 0;
        }
        
        ctx.restore();
    }
}

// Weapon Classes
class Weapon {
    constructor(type) {
        this.type = type;
        this.level = 1;
        this.cooldown = 0;
        this.lastFire = -9999; // Allow immediate firing

        // Apply permanent damage bonus (+1% per level gained)
        const bonuses = PermanentStats.getBonuses();
        
        if (type === 'dildo') {
            this.name = 'Dildo';
            this.baseCooldown = 4000; // 4 seconds
            this.originalBaseCooldown = 4000; // Store original for minimum calculation
            this.damage = Math.floor(120 * bonuses.damage); // Increased for highest DPS (melee risk)
            this.projectileSpeed = 0; // Not used for strikes
            this.count = 1;
            this.strikeRange = 100; // Distance from player
            this.baseStrikeDuration = 500; // 0.5 seconds base duration
        } else if (type === 'buttplug') {
            this.name = 'Buttplug';
            this.baseCooldown = 750;
            this.originalBaseCooldown = 750; // Store original for minimum calculation
            this.damage = Math.floor(8 * bonuses.damage);
            this.projectileSpeed = 600; // pixels per second (scaled) - was 10 per frame
            this.count = 1; // Always 1 - never increases
        } else if (type === 'collar') {
            this.name = 'Collar';
            this.baseCooldown = 0; // No cooldown - constant aura
            this.originalBaseCooldown = 0; // No cooldown
            this.damage = Math.floor(3 * bonuses.damage); // Low damage per tick
            this.projectileSpeed = 0; // Not used for aura
            this.count = 1;
            this.auraRadius = 40; // Aura radius (halved from 80)
            this.damageInterval = 150; // Damage every 150ms
        } else if (type === 'ovulation') {
            this.name = 'Ovulation';
            this.baseCooldown = 7000; // 7 seconds
            this.originalBaseCooldown = 7000; // Store original for minimum calculation
            this.damage = Math.floor(8 * bonuses.damage); // Damage per tick (hits multiple times)
            this.projectileSpeed = 0; // Not used for pools
            this.count = 1;
            this.poolRadius = 80; // Area of effect radius
            this.poolDuration = 5000; // 5 seconds
        } else if (type === 'hitachi') {
            this.name = 'Hitachi';
            this.baseCooldown = 3000; // 3 seconds
            this.originalBaseCooldown = 3000; // Store original for minimum calculation
            this.damage = Math.floor(5 * bonuses.damage); // Reduced by 75% (was 20)
            this.projectileSpeed = 420; // pixels per second (scaled) - was 7.0 per frame (doubled from 3.5)
            this.count = 1;
            this.burstCount = 3; // Three round bursts
            this.burstDelay = 200; // 0.2 seconds between bursts
        }
    }

    fire() {
        const now = Date.now();
        const player = gameState.player;
        
        // Collar has no cooldown - constant aura (handled separately)
        if (this.type === 'collar') {
            // Check if aura already exists
            const existingAuras = gameState.collarAuras.filter(aura => aura.weaponId === this);
            if (existingAuras.length === 0) {
                // Get permanent attack size bonus
                const bonuses = PermanentStats.getBonuses();
                // Scale aura properties with level and permanent attack size bonus
                const auraRadius = this.auraRadius * (1 + this.level * 0.1) * bonuses.attackSize;
                const auraDamage = this.damage * (1 + this.level * 0.2);
                
                // Calculate damage interval: base / level reduction / lube reduction / permanent cooldown reduction
                let damageInterval = this.damageInterval / (1 + this.level * 0.1); // Faster damage at higher levels
                
                // Apply Lube reduction: 10% per level (multiplicative)
                if (gameState.lubeLevel > 0) {
                    damageInterval = damageInterval * Math.pow(0.9, gameState.lubeLevel);
                }
                
                // Apply permanent cooldown reduction (-0.3% per level gained)
                damageInterval = damageInterval * bonuses.cooldown;
                
                // Set minimum damage interval to 50ms
                damageInterval = Math.max(damageInterval, 50);
                
                // Level 5: create two rotating auras
                if (this.level >= 5) {
                    // First aura: clockwise rotation, pulse starts at 0
                    const aura1 = new CollarAura(auraRadius, auraDamage, damageInterval, this.level, 1);
                    aura1.weaponId = this;
                    aura1.pulsePhase = 0; // Start at beginning of pulse cycle
                    gameState.collarAuras.push(aura1);
                    
                    // Second aura: counterclockwise rotation (offset by 180 degrees), pulse starts at opposite end
                    const aura2 = new CollarAura(auraRadius, auraDamage, damageInterval, this.level, -1);
                    aura2.weaponId = this;
                    aura2.rotationAngle = Math.PI; // Start 180 degrees offset
                    aura2.pulsePhase = Math.PI; // Start at opposite end of pulse cycle (180 degrees phase offset)
                    gameState.collarAuras.push(aura2);
                } else {
                    // Single aura for levels 1-4
                    const aura = new CollarAura(auraRadius, auraDamage, damageInterval, this.level, 0);
                    aura.weaponId = this;
                    gameState.collarAuras.push(aura);
                }
            }
            return; // Exit early, no need to find enemies
        }
        
        // Calculate cooldown: weapon level reduction + lube reduction + permanent cooldown reduction
        let cooldown = this.baseCooldown;
        if (this.type === 'ovulation' || this.type === 'dildo' || this.type === 'hitachi') {
            // 10% reduction per level: baseCooldown * (0.9 ^ (level - 1))
            cooldown = this.baseCooldown * Math.pow(0.9, this.level - 1);
        } else {
            // Other weapons use additive reduction
            cooldown = this.baseCooldown / (1 + this.level * 0.1);
        }
        
        // Apply Lube reduction: 10% per level (multiplicative)
        if (gameState.lubeLevel > 0) {
            cooldown = cooldown * Math.pow(0.9, gameState.lubeLevel);
        }
        
        // Apply permanent cooldown reduction (-0.3% per level gained)
        const bonuses = PermanentStats.getBonuses();
        cooldown = cooldown * bonuses.cooldown;
        
        // Set minimum cooldown to 10% of original base cooldown (prevents non-stop firing)
        // Skip for collar (no cooldown) and weapons with very short base cooldowns
        if (this.originalBaseCooldown > 0) {
            const minCooldown = this.originalBaseCooldown * 0.1;
            cooldown = Math.max(cooldown, minCooldown);
        }
        
        if (now - this.lastFire < cooldown) {
            return;
        }

        this.lastFire = now;

        // Ovulation creates pools at player location (works even without enemies)
        if (this.type === 'ovulation') {
            // Create pool at player's current location
            const poolX = player.x;
            const poolY = player.y;
            
            // Get permanent attack size bonus
            const bonuses = PermanentStats.getBonuses();
            // Scale pool properties with level and permanent attack size bonus
            const poolRadius = this.poolRadius * (1 + this.level * 0.1) * bonuses.attackSize;
            const poolDamage = this.damage * (1 + this.level * 0.2);
            const poolDuration = this.poolDuration * (1 + this.level * 0.1);
            
            // Calculate damage multiplier relative to base damage of 8
            // This accounts for permanent damage bonuses and hidden vibe bonuses
            // Base damage without bonuses is 8, so multiplier = current damage / 8
            const damageMultiplier = this.damage / 8;
            
            const pool = new DamagePool(poolX, poolY, poolRadius, poolDamage, poolDuration, this.level, damageMultiplier);
            gameState.damagePools.push(pool);
            return; // Exit early, no need to find enemies
        }

        // Dildo creates whip strikes (left then right, both in one cooldown)
        if (this.type === 'dildo') {
            // Get permanent attack size bonus
            const bonuses = PermanentStats.getBonuses();
            // Scale strike properties with level and permanent attack size bonus
            const strikeRange = this.strikeRange * (1 + this.level * 0.1) * bonuses.attackSize;
            const strikeDamage = this.damage * (1 + this.level * 0.2);
            // Duration increases by 0.1 seconds per level: base + (level - 1) * 100ms
            const strikeDuration = this.baseStrikeDuration + (this.level - 1) * 100;
            // Scale strike visual size and hitbox with attack size bonus
            const strikeSize = 128 * bonuses.attackSize; // Base 128, scaled by attackSize
            
            // Level 5: rotating strike instead of left/right
            if (this.level >= 5) {
                // Create rotating strike that goes full circle in less than 300ms
                // 360 degrees / 0.3 seconds = 1200 degrees per second
                const rotationSpeed = 1200; // Rotation speed (degrees per second) to complete in <300ms
                const fullRotationTime = (360 / rotationSpeed) * 1000; // Time for full rotation in ms (~300ms)
                const strikeDurationRotating = Math.max(strikeDuration, fullRotationTime);
                
                const rotatingStrike = new Strike(
                    player.x, 
                    player.y, 
                    'rotate', 
                    strikeDamage, 
                    strikeRange, 
                    strikeDurationRotating,
                    true,  // rotateAround
                    rotationSpeed,  // rotationSpeed (degrees per second)
                    strikeSize  // Pass strike size for visual and hitbox scaling
                );
                gameState.strikes.push(rotatingStrike);
            } else {
                // Normal behavior: left then right
                // Create left strike immediately
                const leftStrike = new Strike(player.x, player.y, 'left', strikeDamage, strikeRange, strikeDuration, false, 0, strikeSize);
                gameState.strikes.push(leftStrike);
                
                // Create right strike 0.1 seconds (100ms) after left
                setTimeout(() => {
                    const rightStrike = new Strike(player.x, player.y, 'right', strikeDamage, strikeRange, strikeDuration, false, 0, strikeSize);
                    gameState.strikes.push(rightStrike);
                }, 100);
            }
            return; // Exit early, no need to find enemies
        }

        // Hitachi uses different targeting (highest health, closest for ties)
        if (this.type === 'hitachi') {
            // Helper function to find enemy with most health (prioritize closest for ties)
            const findHighestHealthEnemy = () => {
                let targetEnemy = null;
                let highestHealth = -1;
                let closestDistance = Infinity;
                
                for (const enemy of gameState.enemies) {
                    const dx = enemy.x - player.x;
                    const dy = enemy.y - player.y;
                    const distance = Math.sqrt(dx * dx + dy * dy);
                    
                    // Prioritize highest health, then closest if health is equal
                    if (enemy.health > highestHealth || 
                        (enemy.health === highestHealth && distance < closestDistance)) {
                        highestHealth = enemy.health;
                        closestDistance = distance;
                        targetEnemy = enemy;
                    }
                }
                
                return targetEnemy;
            };
            
            const targetEnemy = findHighestHealthEnemy();
            if (!targetEnemy) return; // No enemies found
            
            const angle = Math.atan2(targetEnemy.y - player.y, targetEnemy.x - player.x);
                
                // Level 5: constant stream behavior
                if (this.level >= 5) {
                    const streamDelay = 50; // 0.05 seconds (50ms)
                    const streamDuration = this.baseCooldown; // Stream for the full cooldown duration
                    const streamCount = Math.floor(streamDuration / streamDelay);
                    
                    // Fire constant stream of projectiles
                    for (let i = 0; i < streamCount; i++) {
                        setTimeout(() => {
                            // Find enemy with most health again (may have changed)
                            const currentTargetEnemy = findHighestHealthEnemy();
                            
                            if (currentTargetEnemy) {
                                const currentAngle = Math.atan2(currentTargetEnemy.y - player.y, currentTargetEnemy.x - player.x);
                                // Hitachi lifetime: 1 second base + 1 second per level (doubled travel distance)
                                const hitachiLifetime = 1000 + (this.level * 1000); // 1000ms base + 1000ms per level
                                const projectile = new Projectile(
                                    player.x,
                                    player.y,
                                    currentAngle,
                                    this.projectileSpeed,
                                    this.damage * 0.5, // 50% damage
                                    'hitachi',
                                    false, // No piercing
                                    1.0,   // Normal size
                                    0.25,  // 25% opacity (reduced by 50% from 50%)
                                    hitachiLifetime,
                                    this.level // Weapon level for size scaling
                                );
                                gameState.projectiles.push(projectile);
                            }
                        }, i * streamDelay);
                    }
                } else {
                    // Normal behavior: bursts with delays
                    // Fire bursts, each with delay
                    for (let burst = 0; burst < this.burstCount; burst++) {
                        setTimeout(() => {
                            // Find enemy with most health again (may have changed)
                            const currentTargetEnemy = findHighestHealthEnemy();
                            
                            if (currentTargetEnemy) {
                                const currentAngle = Math.atan2(currentTargetEnemy.y - player.y, currentTargetEnemy.x - player.x);
                                // Hitachi lifetime: 1 second base + 1 second per level (doubled travel distance)
                                const hitachiLifetime = 1000 + (this.level * 1000); // 1000ms base + 1000ms per level
                                const projectile = new Projectile(
                                    player.x,
                                    player.y,
                                    currentAngle,
                                    this.projectileSpeed,
                                    this.damage * (1 + this.level * 0.2),
                                    'hitachi',
                                    false, // No piercing
                                    1.0,   // Normal size
                                    0.5,   // 50% opacity (reduced by 50% from 100%)
                                    hitachiLifetime,
                                    this.level // Weapon level for size scaling
                                );
                                gameState.projectiles.push(projectile);
                            }
                        }, burst * this.burstDelay);
                    }
                }
                return; // Exit early for Hitachi
        }
        
        // Regular projectile weapons - find nearest enemy
        let nearestEnemy = null;
        let nearestDistance = Infinity;

        for (const enemy of gameState.enemies) {
            const dx = enemy.x - player.x;
            const dy = enemy.y - player.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance < nearestDistance) {
                nearestDistance = distance;
                nearestEnemy = enemy;
            }
        }

        if (nearestEnemy) {
            const angle = Math.atan2(nearestEnemy.y - player.y, nearestEnemy.x - player.x);
            
            // Buttplug special behavior at level 5
            if (this.type === 'buttplug' && this.level >= 5) {
                // Level 5: 1 large piercing projectile with 5x damage (one per cooldown, no bursts)
                const projectileType = 'buttplug';
                const projectile = new Projectile(
                    player.x,
                    player.y,
                    angle, // No spread, single shot
                    this.projectileSpeed * 0.3, // 30% speed
                    this.damage * 5, // 5x damage
                    projectileType,
                    true, // Pierce through enemies
                    5.0,  // 500% size (5x)
                    1.0,  // Full opacity
                    2000, // Lifetime
                    this.level // Weapon level for enemy projectile absorption
                );
                gameState.projectiles.push(projectile);
            } else if (this.type === 'buttplug') {
                // Normal behavior: single projectile (levels 1-4)
                const projectileType = 'buttplug';
                const projectile = new Projectile(
                    player.x,
                    player.y,
                    angle,
                    this.projectileSpeed,
                    this.damage * (1 + this.level * 0.2),
                    projectileType,
                    false, // No piercing
                    1.0,   // Normal size
                    1.0,   // Full opacity
                    2000,  // Lifetime
                    this.level // Weapon level for enemy projectile absorption
                );
                gameState.projectiles.push(projectile);
            } else {
                // Other projectile weapons
                for (let i = 0; i < this.count; i++) {
                    const spreadAngle = angle + (i - (this.count - 1) / 2) * 0.2;
                    const projectile = new Projectile(
                        player.x,
                        player.y,
                        spreadAngle,
                        this.projectileSpeed,
                        this.damage * (1 + this.level * 0.2),
                        'normal',
                        false, // No piercing
                        1.0,   // Normal size
                        1.0    // Full opacity
                    );
                    gameState.projectiles.push(projectile);
                }
            }
        }
    }

    upgrade() {
        // Cap weapon level at 5
        if (this.level >= 5) {
            return; // Already at max level
        }
        this.level++;
        this.damage = Math.floor(this.damage * 1.3);
        
        // Hitachi increases burstCount by 1 per level
        if (this.type === 'hitachi') {
            this.burstCount++;
        } else if (this.type !== 'buttplug' && this.level % 3 === 0) {
            // Other weapons (except buttplug) increase count every 3 levels
            this.count++;
        }
        
        // Ensure buttplug count always stays at 1
        if (this.type === 'buttplug') {
            this.count = 1;
        }
        
        // Update collar auras if they exist
        if (this.type === 'collar') {
            const auras = gameState.collarAuras.filter(a => a.weaponId === this);
            // Get permanent attack size bonus
            const bonuses = PermanentStats.getBonuses();
            const auraRadius = this.auraRadius * (1 + this.level * 0.1) * bonuses.attackSize;
            const auraDamage = this.damage * (1 + this.level * 0.2);
            
            // Calculate damage interval: base / level reduction / lube reduction / permanent cooldown reduction
            let damageInterval = this.damageInterval / (1 + this.level * 0.1);
            
            // Apply Lube reduction: 10% per level (multiplicative)
            if (gameState.lubeLevel > 0) {
                damageInterval = damageInterval * Math.pow(0.9, gameState.lubeLevel);
            }
            
            // Apply permanent cooldown reduction (-0.3% per level gained)
            damageInterval = damageInterval * bonuses.cooldown;
            
            // Set minimum damage interval to 50ms
            damageInterval = Math.max(damageInterval, 50);
            const baseSize = auraRadius * 2 * 1.3 * 3; // 200% increase (3x original)
            const baseAuraSize = baseSize * (1 + (this.level - 1) * 0.1);
            
            if (this.level >= 5 && auras.length === 1) {
                // Upgrade from single aura to dual rotating auras
                // Remove old aura
                const oldAura = auras[0];
                oldAura.weaponId = null; // Mark for removal
                gameState.collarAuras = gameState.collarAuras.filter(a => a.weaponId === this);
                
                // Create two new rotating auras
                const aura1 = new CollarAura(auraRadius, auraDamage, damageInterval, this.level, 1);
                aura1.weaponId = this;
                aura1.pulsePhase = 0; // Start at beginning of pulse cycle
                gameState.collarAuras.push(aura1);
                
                const aura2 = new CollarAura(auraRadius, auraDamage, damageInterval, this.level, -1);
                aura2.weaponId = this;
                aura2.rotationAngle = Math.PI; // Start 180 degrees offset
                aura2.pulsePhase = Math.PI; // Start at opposite end of pulse cycle (180 degrees phase offset)
                gameState.collarAuras.push(aura2);
            } else {
                // Update existing auras
                auras.forEach(aura => {
                    aura.radius = auraRadius;
                    aura.damage = auraDamage;
                    aura.damageInterval = damageInterval;
                    aura.baseAuraSize = baseAuraSize;
                    aura.auraSize = baseAuraSize; // Reset to base, pulsing will handle it
                    aura.level = this.level;
                    aura.isLevel5 = this.level >= 5;
                });
            }
        }
    }
}

// Spawn Functions
function spawnEnemy() {
    const side = Math.floor(Math.random() * 4);
    let x, y;

    if (side === 0) { // Top
        x = Math.random() * CONFIG.width;
        y = -50;
    } else if (side === 1) { // Right
        x = CONFIG.width + 50;
        y = Math.random() * CONFIG.height;
    } else if (side === 2) { // Bottom
        x = Math.random() * CONFIG.width;
        y = CONFIG.height + 50;
    } else { // Left
        x = -50;
        y = Math.random() * CONFIG.height;
    }

    // Enemy type based on game time and difficulty
    // Early game: up to 90 seconds (1.5 minutes)
    // Mid game: 90-180 seconds (1.5-3 minutes)
    // Late game: 180+ seconds (3+ minutes)
    // Three enemy types: Bills (difficulty 1), Incels (difficulty 2), Politicians (difficulty 3)
    // Incels don't appear until 60 seconds (1 minute)
    let type = 'bills'; // Default to Bills
    const time = CONFIG.gameTime;
    const rand = Math.random();
    
    // Use difficulty-based spawning with new time thresholds
    if (time >= 180) {
        // Late game (3+ minutes): all types possible, more difficult enemies
        if (rand < 0.25) type = 'politicians'; // Difficulty 3
        else if (rand < 0.50) type = 'incels'; // Difficulty 2
        else type = 'bills'; // Difficulty 1
    } else if (time >= 90) {
        // Mid game (1.5-3 minutes): bills and incels (incels can spawn after 60 seconds)
        if (rand < 0.30) type = 'incels'; // Difficulty 2
        else type = 'bills'; // Difficulty 1
    } else if (time >= 60) {
        // After 1 minute but before 1.5 minutes: bills and incels
        if (rand < 0.30) type = 'incels'; // Difficulty 2
        else type = 'bills'; // Difficulty 1
    } else {
        // Early game (0-60 seconds): only bills (incels don't appear until 60 seconds)
        type = 'bills'; // Difficulty 1
    }

    gameState.enemies.push(new Enemy(x, y, type));
}

function spawnExperienceOrb(x, y, value) {
    // Apply Cock Ring XP increase (5% per level) and round down
    if (gameState.cockRingLevel > 0) {
        const xpMultiplier = 1 + (gameState.cockRingLevel * 0.05);
        value = Math.floor(value * xpMultiplier);
    }
    // Apply permanent XP gain bonus (+1% per level gained)
    const bonuses = PermanentStats.getBonuses();
    value = Math.floor(value * bonuses.xpGain);
    gameState.experienceOrbs.push(new ExperienceOrb(x, y, value));
}

// Level System
function checkLevelUp() {
    if (gameState.xp >= gameState.xpNeeded) {
        const oldLevel = gameState.level;
        gameState.level++;
        gameState.xp -= gameState.xpNeeded;
        gameState.xpNeeded = Math.floor(gameState.xpNeeded * 1.1);
        
        // Track levels gained for permanent stats (will be saved on death)
        // This is tracked per session, not per level up
        
        // Play level up sound effect
        SoundEffects.play('levelUp');
        
        // Show upgrade selection
        showUpgradeSelection();
    }
}

function showUpgradeSelection() {
    const modal = document.getElementById('upgradeModal');
    const optionsDiv = document.getElementById('upgradeOptions');
    optionsDiv.innerHTML = '';

    // Add reroll button if rerolls available
    if (gameState.rerolls > 0) {
        const rerollButton = document.createElement('div');
        rerollButton.className = 'reroll-button';
        rerollButton.innerHTML = `
            <div class="reroll-text">
                <h3>Reroll (${Math.floor(gameState.rerolls)} remaining)</h3>
                <p>Get new upgrade options</p>
            </div>
        `;
        rerollButton.onclick = () => rerollUpgrades();
        optionsDiv.appendChild(rerollButton);
    }

    const upgrades = generateUpgradeOptions();
    
    upgrades.forEach(upgrade => {
        const option = document.createElement('div');
        option.className = 'upgrade-option';
        
        // Add weapon/item sprite if it's a weapon or item upgrade
        let spriteHtml = '';
        let nameText = upgrade.name;
        
        if (upgrade.type === 'new_weapon') {
            const spriteName = `weapon-${upgrade.weapon}`;
            const spriteData = SpriteManager.getSprite(spriteName);
            if (spriteData && spriteData.image) {
                spriteHtml = `<img src="${spriteData.image.src}" class="weapon-sprite-preview" alt="${upgrade.name}">`;
            }
        } else if (upgrade.type === 'upgrade_weapon') {
            const spriteName = `weapon-${upgrade.weapon}`;
            const spriteData = SpriteManager.getSprite(spriteName);
            if (spriteData && spriteData.image) {
                spriteHtml = `<img src="${spriteData.image.src}" class="weapon-sprite-preview" alt="${upgrade.name}">`;
            }
            // Show available level (current + 1)
            const weapon = gameState.weapons.find(w => w.type === upgrade.weapon);
            if (weapon) {
                nameText = `${upgrade.name} (Lv.${weapon.level + 1})`;
            }
        } else if (upgrade.type === 'chastity_cage') {
            const spriteData = SpriteManager.getSprite('chastitycage');
            if (spriteData && spriteData.image) {
                spriteHtml = `<img src="${spriteData.image.src}" class="weapon-sprite-preview" alt="${upgrade.name}">`;
            }
            // Show available level (current + 1, max 3)
            const nextLevel = Math.min(gameState.chastityCageLevel + 1, 3);
            if (gameState.chastityCageLevel > 0) {
                nameText = `${upgrade.name} (Lv.${nextLevel})`;
            }
        } else if (upgrade.type === 'lube') {
            const spriteData = SpriteManager.getSprite('lube');
            if (spriteData && spriteData.image) {
                spriteHtml = `<img src="${spriteData.image.src}" class="weapon-sprite-preview" alt="${upgrade.name}">`;
            }
            // Show available level (current + 1, max 5)
            const nextLevel = Math.min(gameState.lubeLevel + 1, 5);
            if (gameState.lubeLevel > 0) {
                nameText = `${upgrade.name} (Lv.${nextLevel})`;
            }
        } else if (upgrade.type === 'damage') {
            const spriteData = SpriteManager.getSprite('hiddenvibe');
            if (spriteData && spriteData.image) {
                spriteHtml = `<img src="${spriteData.image.src}" class="weapon-sprite-preview" alt="${upgrade.name}">`;
            }
        } else if (upgrade.type === 'cock_ring') {
            const spriteData = SpriteManager.getSprite('cockring');
            if (spriteData && spriteData.image) {
                spriteHtml = `<img src="${spriteData.image.src}" class="weapon-sprite-preview" alt="${upgrade.name}">`;
            }
            // Show available level (current + 1, max 5)
            const nextLevel = Math.min(gameState.cockRingLevel + 1, 5);
            if (gameState.cockRingLevel > 0) {
                nameText = `${upgrade.name} (Lv.${nextLevel})`;
            }
        } else if (upgrade.type === 'panties') {
            const spriteData = SpriteManager.getSprite('panties');
            if (spriteData && spriteData.image) {
                spriteHtml = `<img src="${spriteData.image.src}" class="weapon-sprite-preview" alt="${upgrade.name}">`;
            }
            // Crotchless Panties is endless - don't show level
        }
        
        // Check if this is a weapon upgrade to level 5 and use flavor text
        let descriptionText = upgrade.description;
        if (upgrade.type === 'upgrade_weapon') {
            const weapon = gameState.weapons.find(w => w.type === upgrade.weapon);
            if (weapon && weapon.level === 4) {
                // Level 5 flavor text mapping
                const level5FlavorText = {
                    'buttplug': 'TIME TO BRING OUT THE BIG ONES',
                    'hitachi': 'TURBO OVERDRIVE MODE ENGAGE',
                    'ovulation': 'NOW EXTRA GOOEY',
                    'collar': 'DOUBLE THE PAIN',
                    'dildo': 'SWING FOR THE FENCES'
                };
                const flavorText = level5FlavorText[upgrade.weapon];
                if (flavorText) {
                    descriptionText = `<strong>${flavorText}</strong>`;
                }
            }
        }
        
        option.innerHTML = `
            ${spriteHtml}
            <div class="upgrade-text">
                <h3>${nameText}</h3>
                <p>${descriptionText}</p>
            </div>
        `;
        option.onclick = () => selectUpgrade(upgrade);
        optionsDiv.appendChild(option);
    });

    modal.classList.add('active');
    CONFIG.isPaused = true;
}

function generateUpgradeOptions() {
    const options = [];
    const allUpgrades = [
        // New weapons
        { type: 'new_weapon', weapon: 'dildo', name: 'Dildo', description: "It's big. It's heavy. Hit em with it." },
        { type: 'new_weapon', weapon: 'buttplug', name: 'Buttplug', description: 'If not bullet, then why bullet shaped?' },
        { type: 'new_weapon', weapon: 'collar', name: 'Collar', description: "It'll hurt anyone close enough to notice it." },
        { type: 'new_weapon', weapon: 'ovulation', name: 'Ovulation', description: 'Make use of your excitement to do some damage.' },
        { type: 'new_weapon', weapon: 'hitachi', name: 'Hitachi', description: "It's a wand. Cast some fireballs." },
        
        // Upgrades
        { type: 'damage', name: 'Hidden Vibe', description: 'Increases your excitement, leading to damage boosts to all weapons.' },
        { type: 'lube', name: 'Lube', description: 'Holes are ready, and attacks are faster.' },
        { type: 'chastity_cage', name: 'Chastity Cage', description: 'Decrease the damage output of your enemies.' },
        { type: 'cock_ring', name: 'Cock Ring', description: 'Increases the power and volume of your enemies.' },
        { type: 'panties', name: 'Crotchless Panties', description: 'For those who need coverage but don\'t want coverage. Gives a small amount of HP.' },
    ];

    // Separate upgrades into categories
    const newWeapons = [];
    const weaponUpgrades = [];
    const otherUpgrades = [];
    
    allUpgrades.forEach(upgrade => {
        if (upgrade.type === 'new_weapon') {
            if (!gameState.weapons.some(w => w.type === upgrade.weapon)) {
                newWeapons.push(upgrade);
            } else {
                // Weapon already owned - add as upgrade option only if not at max level (5)
                const existingWeapon = gameState.weapons.find(w => w.type === upgrade.weapon);
                if (existingWeapon && existingWeapon.level < 5) {
                    weaponUpgrades.push({
                        type: 'upgrade_weapon',
                        weapon: upgrade.weapon,
                        name: upgrade.name,
                        description: `Upgrade ${upgrade.name}`
                    });
                }
            }
        } else if (upgrade.type === 'chastity_cage') {
            if (gameState.chastityCageLevel < 3) {
                otherUpgrades.push(upgrade);
            }
        } else if (upgrade.type === 'lube') {
            if (gameState.lubeLevel < 5) {
                otherUpgrades.push(upgrade);
            }
        } else if (upgrade.type === 'cock_ring') {
            if (gameState.cockRingLevel < 5) {
                otherUpgrades.push(upgrade);
            }
        } else if (upgrade.type === 'panties') {
            // Crotchless Panties can be selected unlimited times (no max level)
            otherUpgrades.push(upgrade);
        } else {
            otherUpgrades.push(upgrade);
        }
    });
    
    // Combine all available upgrades, with weapon upgrades having higher weight
    const availableUpgrades = [];
    
    // Add new weapons
    availableUpgrades.push(...newWeapons);
    
    // Add weapon upgrades (3x weight for higher probability)
    for (let i = 0; i < 3; i++) {
        availableUpgrades.push(...weaponUpgrades);
    }
    
    // Add other upgrades
    availableUpgrades.push(...otherUpgrades);

    // Select 3 random upgrades (weapon upgrades now have higher probability)
    // Ensure no duplicates by tracking unique upgrade identifiers
    const selected = [];
    const selectedIds = new Set(); // Track selected upgrades to prevent duplicates
    
    // Shuffle the available upgrades
    const shuffled = availableUpgrades.sort(() => 0.5 - Math.random());
    
    // Select up to 3 unique upgrades
    for (const upgrade of shuffled) {
        if (selected.length >= 3) break;
        
        // Create unique identifier for this upgrade
        let upgradeId;
        if (upgrade.type === 'new_weapon' || upgrade.type === 'upgrade_weapon') {
            upgradeId = `${upgrade.type}-${upgrade.weapon}`;
        } else {
            upgradeId = upgrade.type; // For damage, lube, chastity_cage, etc.
        }
        
        // Only add if we haven't selected this upgrade yet
        if (!selectedIds.has(upgradeId)) {
            selected.push(upgrade);
            selectedIds.add(upgradeId);
        }
    }
    
    return selected;
}

function rerollUpgrades() {
    // Check if rerolls available
    if (gameState.rerolls <= 0) {
        return;
    }
    
    // Decrease rerolls by 1
    gameState.rerolls = Math.max(0, gameState.rerolls - 1);
    
    // Regenerate upgrade options (modal stays open)
    showUpgradeSelection();
}

function selectUpgrade(upgrade) {
    const modal = document.getElementById('upgradeModal');
    modal.classList.remove('active');
    CONFIG.isPaused = false;

    if (upgrade.type === 'new_weapon') {
        gameState.weapons.push(new Weapon(upgrade.weapon));
    } else if (upgrade.type === 'chastity_cage') {
        // Chastity Cage: reduce enemy damage by 10 per level (max 3 levels)
        if (gameState.chastityCageLevel < 3) {
            gameState.chastityCageLevel++;
        }
    } else if (upgrade.type === 'damage') {
        gameState.hiddenVibeLevel++;
        gameState.weapons.forEach(weapon => {
            weapon.damage = Math.floor(weapon.damage * 1.2);
        });
    } else if (upgrade.type === 'lube') {
        // Lube: reduce cooldown by 10% per level (multiplicative, max 5 levels)
        if (gameState.lubeLevel < 5) {
            gameState.lubeLevel++;
        }
    } else if (upgrade.type === 'cock_ring') {
        // Cock Ring: upgradeable up to level 5
        if (gameState.cockRingLevel < 5) {
            gameState.cockRingLevel++;
        }
    } else if (upgrade.type === 'panties') {
        // Crotchless Panties: +10 HP per level (unlimited)
        gameState.pantiesLevel++;
        if (gameState.player) {
            gameState.player.maxHealth += 10;
            gameState.player.health += 10; // Also increase current health
        }
    } else if (upgrade.type === 'upgrade_weapon') {
        const weapon = gameState.weapons.find(w => w.type === upgrade.weapon);
        if (weapon && weapon.level < 5) {
            weapon.upgrade();
        }
    }

    updateUI();
}

// Game Loop
let keys = {};

document.addEventListener('keydown', (e) => {
    keys[e.key.toLowerCase()] = true;
});

document.addEventListener('keyup', (e) => {
    keys[e.key.toLowerCase()] = false;
});

function gameLoop(currentTime) {
    // Check if challenge modal is visible - if so, don't run game loop
    const challengeModal = document.getElementById('challengeModal');
    if (challengeModal && challengeModal.classList.contains('active')) {
        CONFIG.lastFrameTime = currentTime;
        requestAnimationFrame(gameLoop);
        return;
    }
    
    // Check if start screen is visible - if so, ensure menu music is playing
    const startScreen = document.getElementById('startScreen');
    if (startScreen && startScreen.classList.contains('active')) {
        // Ensure menu music is playing when start screen is visible
        if (!MusicManager.tracks.menu || MusicManager.tracks.menu.paused || MusicManager.currentTrack !== MusicManager.tracks.menu) {
            MusicManager.playMenu();
        }
        CONFIG.lastFrameTime = currentTime;
        requestAnimationFrame(gameLoop);
        return;
    }
    
    if (CONFIG.isPaused || CONFIG.isGameOver) {
        CONFIG.lastFrameTime = currentTime;
        requestAnimationFrame(gameLoop);
        return;
    }

    // Safety check
    if (!CONFIG.ctx || !gameState.player) {
        CONFIG.lastFrameTime = currentTime;
        requestAnimationFrame(gameLoop);
        return;
    }

    // Calculate delta time (time since last frame in seconds)
    let deltaTime = 0;
    if (CONFIG.lastFrameTime > 0) {
        deltaTime = (currentTime - CONFIG.lastFrameTime) / 1000; // Convert to seconds
    }
    // Cap deltaTime to prevent large jumps (e.g., when tab becomes active)
    deltaTime = Math.min(deltaTime, 0.1); // Max 100ms
    CONFIG.lastFrameTime = currentTime;

    // Clear canvas
    CONFIG.ctx.fillStyle = '#0a0a0f';
    CONFIG.ctx.fillRect(0, 0, CONFIG.width, CONFIG.height);

    // Update game time (paused when tab is not active)
    if (gameState.startTime) {
        const elapsedTime = Date.now() - gameState.startTime - gameState.totalPausedTime;
        CONFIG.gameTime = Math.floor(elapsedTime / 1000);
    }
    
    // Check for boss spawn at 5 minutes (300 seconds)
    if (CONFIG.gameTime >= 300 && !gameState.bossSpawned) {
        gameState.bossSpawned = true;
        
        // Clear all enemies
        gameState.enemies = [];
        
        // Stop any currently playing gameplay music
        MusicManager.stop();
        
        // Play boss spoken audio, then boss music
        MusicManager.playBossSpoken();
        
        // Spawn boss
        gameState.boss = new Boss();
        
        // Timer will stop updating visually (stays at 0:00) when boss appears
    }

    // Update player
    if (gameState.player) {
        gameState.player.update(keys, deltaTime);
    }
    
    // Update boss
    if (gameState.boss) {
        gameState.boss.update(deltaTime);
    }
    
    // Update experience orbs FIRST (lowest z-index - drawn before everything else)
    gameState.experienceOrbs.forEach(orb => orb.update(deltaTime));
    
    // Merge nearby orbs (within 64 pixels) if both are more than 5 pixels from player
    const player = gameState.player;
    if (player) {
        for (let i = gameState.experienceOrbs.length - 1; i >= 0; i--) {
            const orb1 = gameState.experienceOrbs[i];
            if (orb1.collected) continue;
            
            // Check distance from player
            const dx1 = orb1.x - player.x;
            const dy1 = orb1.y - player.y;
            const distanceToPlayer1 = Math.sqrt(dx1 * dx1 + dy1 * dy1);
            if (distanceToPlayer1 <= 5) continue; // Don't merge if within 5 pixels of player
            
            for (let j = i - 1; j >= 0; j--) {
                const orb2 = gameState.experienceOrbs[j];
                if (orb2.collected) continue;
                
                // Check distance from player
                const dx2 = orb2.x - player.x;
                const dy2 = orb2.y - player.y;
                const distanceToPlayer2 = Math.sqrt(dx2 * dx2 + dy2 * dy2);
                if (distanceToPlayer2 <= 5) continue; // Don't merge if within 5 pixels of player
                
                // Check distance between orbs
                const dx = orb1.x - orb2.x;
                const dy = orb1.y - orb2.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                // Merge if within 64 pixels and both are far enough from player
                if (distance < 64) {
                    // Combine values and positions (weighted average by value)
                    const totalValue = orb1.value + orb2.value;
                    const totalWeight = orb1.value + orb2.value;
                    const newX = totalWeight > 0 ? (orb1.x * orb1.value + orb2.x * orb2.value) / totalWeight : orb1.x;
                    const newY = totalWeight > 0 ? (orb1.y * orb1.value + orb2.y * orb2.value) / totalWeight : orb1.y;
                    
                    // Merge into orb1, mark orb2 for removal
                    orb1.value = totalValue;
                    orb1.x = newX;
                    orb1.y = newY;
                    orb2.collected = true; // Mark for removal
                    break; // Only merge once per update
                }
            }
        }
    }
    
    gameState.experienceOrbs = gameState.experienceOrbs.filter(orb => !orb.collected);
    
    // Draw damage pools FIRST (lowest z-index - ovulation effect)
    gameState.damagePools = gameState.damagePools.filter(pool => pool.update());
    gameState.damagePools.forEach(pool => pool.draw(CONFIG.ctx));
    
    // Draw experience orbs (second lowest z-index)
    gameState.experienceOrbs.forEach(orb => orb.draw(CONFIG.ctx));

    // Spawn enemies (only if boss hasn't spawned)
    if (!gameState.bossSpawned) {
        // Base spawn rate increases every 20 seconds (difficulty scaling)
        // Every 20 seconds, spawn rate gets faster (lower number = faster spawning)
        // Cap hits at 240 seconds (reaches minimum spawn rate of 30)
        const difficultyLevel = Math.floor(CONFIG.gameTime / 20); // Increases every 20 seconds
        const baseSpawnRate = Math.max(30, 120 - (difficultyLevel * 7.5)); // Decrease by 7.5 every 20 seconds to cap at 240s
        
        let spawnRate = baseSpawnRate;
        
        // Apply Cock Ring spawn time reduction (10% faster per level = 10% lower spawnRate per level)
        if (gameState.cockRingLevel > 0) {
            spawnRate = spawnRate * Math.pow(0.9, gameState.cockRingLevel);
        }
        
        if (Math.random() < 1 / spawnRate) {
            spawnEnemy();
            
            // Apply Cock Ring enemy count increase (25% more enemies per level)
            if (gameState.cockRingLevel > 0) {
                // 25% chance per level to spawn an additional enemy
                for (let i = 0; i < gameState.cockRingLevel; i++) {
                    if (Math.random() < 0.25) {
                        spawnEnemy();
                    }
                }
            }
        }
    }

    // Update enemies
    gameState.enemies.forEach(enemy => enemy.update(deltaTime));
    gameState.enemies = gameState.enemies.filter(enemy => enemy.health > 0);

    // Update weapons
    gameState.weapons.forEach(weapon => weapon.fire());

    // Update projectiles
    gameState.projectiles = gameState.projectiles.filter(proj => proj.update(deltaTime));
    gameState.projectiles.forEach(proj => proj.draw(CONFIG.ctx));

    // Update enemy projectiles
    gameState.enemyProjectiles = gameState.enemyProjectiles.filter(proj => proj.update(deltaTime));
    gameState.enemyProjectiles.forEach(proj => proj.draw(CONFIG.ctx));
    
    // Damage pools are already updated and drawn above (lowest z-index)
    
    // Update strikes (dildo)
    gameState.strikes = gameState.strikes.filter(strike => strike.update());
    gameState.strikes.forEach(strike => strike.draw(CONFIG.ctx));

    // Update collar auras (constant damage field)
    gameState.collarAuras = gameState.collarAuras.filter(aura => aura.update());
    gameState.collarAuras.forEach(aura => aura.draw(CONFIG.ctx));

    // Draw enemies
    gameState.enemies.forEach(enemy => enemy.draw(CONFIG.ctx));

    // Draw player (always draw, even if sprites didn't load)
    if (gameState.player) {
        gameState.player.draw(CONFIG.ctx);
    }
    
    // Draw boss (if spawned)
    if (gameState.boss) {
        gameState.boss.draw(CONFIG.ctx);
    }

    // Update UI
    updateUI();

    requestAnimationFrame(gameLoop);
}

function updateUI() {
    document.getElementById('level').textContent = gameState.level;
    document.getElementById('xp').textContent = gameState.xp;
    document.getElementById('xpNeeded').textContent = gameState.xpNeeded;
    document.getElementById('health').textContent = Math.ceil(gameState.player.health);
    document.getElementById('maxHealth').textContent = gameState.player.maxHealth;
    
    // Update timer: countdown from 5 minutes (300 seconds), formatted as MM:SS
    // Stop visual timer when boss appears
    if (!gameState.bossSpawned) {
        const countdownSeconds = Math.max(0, 300 - CONFIG.gameTime);
        const minutes = Math.floor(countdownSeconds / 60);
        const seconds = countdownSeconds % 60;
        const formattedTime = `${minutes}:${seconds.toString().padStart(2, '0')}`;
        document.getElementById('time').textContent = formattedTime;
    }
    // If boss has spawned, timer stays at the value it was when boss appeared (don't update)
    
    // Update permanent stats display
    updatePermanentStatsUI();
    
    // Update logo display
    updateLogoDisplay();

    // Update weapons list
    const weaponsList = document.getElementById('weaponsList');
    weaponsList.innerHTML = '<div style="color: #4a90e2; font-weight: 600; margin-bottom: 5px;">Weapons:</div>';
    gameState.weapons.forEach(weapon => {
        const item = document.createElement('div');
        item.className = 'weapon-item';
        
        // Add weapon sprite
        const spriteName = `weapon-${weapon.type}`;
        const spriteData = SpriteManager.getSprite(spriteName);
        let spriteHtml = '';
        if (spriteData && spriteData.image) {
            spriteHtml = `<img src="${spriteData.image.src}" class="weapon-sprite-icon" alt="${weapon.name}">`;
        }
        
        item.innerHTML = `${spriteHtml}<span>${weapon.name} Lv.${weapon.level}</span>`;
        weaponsList.appendChild(item);
    });
    
    // Update upgrades list (separate from weapons)
    const upgradesList = document.getElementById('upgradesList');
    upgradesList.innerHTML = '<div style="color: #ff6b9d; font-weight: 600; margin-bottom: 5px;">Upgrades:</div>';
    
    // Display Lube if owned
    if (gameState.lubeLevel > 0) {
        const item = document.createElement('div');
        item.className = 'weapon-item';
        
        // Add lube sprite
        const spriteData = SpriteManager.getSprite('lube');
        let spriteHtml = '';
        if (spriteData && spriteData.image) {
            spriteHtml = `<img src="${spriteData.image.src}" class="weapon-sprite-icon" alt="Lube">`;
        }
        
        item.innerHTML = `${spriteHtml}<span>Lube Lv.${gameState.lubeLevel}</span>`;
        upgradesList.appendChild(item);
    }
    
    // Display Chastity Cage if owned
    if (gameState.chastityCageLevel > 0) {
        const item = document.createElement('div');
        item.className = 'weapon-item';
        
        // Add chastity cage sprite
        const spriteData = SpriteManager.getSprite('chastitycage');
        let spriteHtml = '';
        if (spriteData && spriteData.image) {
            spriteHtml = `<img src="${spriteData.image.src}" class="weapon-sprite-icon" alt="Chastity Cage">`;
        }
        
        item.innerHTML = `${spriteHtml}<span>Chastity Cage Lv.${gameState.chastityCageLevel}</span>`;
        upgradesList.appendChild(item);
    }
    
    // Display Hidden Vibe if owned
    if (gameState.hiddenVibeLevel > 0) {
        const item = document.createElement('div');
        item.className = 'weapon-item';
        
        // Add hidden vibe sprite
        const spriteData = SpriteManager.getSprite('hiddenvibe');
        let spriteHtml = '';
        if (spriteData && spriteData.image) {
            spriteHtml = `<img src="${spriteData.image.src}" class="weapon-sprite-icon" alt="Hidden Vibe">`;
        }
        
        item.innerHTML = `${spriteHtml}<span>Hidden Vibe (Endless)</span>`;
        upgradesList.appendChild(item);
    }
    
    // Display Cock Ring if owned
    if (gameState.cockRingLevel > 0) {
        const item = document.createElement('div');
        item.className = 'weapon-item';
        
        // Add cock ring sprite
        const spriteData = SpriteManager.getSprite('cockring');
        let spriteHtml = '';
        if (spriteData && spriteData.image) {
            spriteHtml = `<img src="${spriteData.image.src}" class="weapon-sprite-icon" alt="Cock Ring">`;
        }
        
        item.innerHTML = `${spriteHtml}<span>Cock Ring Lv.${gameState.cockRingLevel}</span>`;
        upgradesList.appendChild(item);
    }
    
    // Display Crotchless Panties if owned
    if (gameState.pantiesLevel > 0) {
        const item = document.createElement('div');
        item.className = 'weapon-item';
        
        // Add crotchless panties sprite
        const spriteData = SpriteManager.getSprite('panties');
        let spriteHtml = '';
        if (spriteData && spriteData.image) {
            spriteHtml = `<img src="${spriteData.image.src}" class="weapon-sprite-icon" alt="Crotchless Panties">`;
        }
        
        item.innerHTML = `${spriteHtml}<span>Crotchless Panties (Endless)</span>`;
        upgradesList.appendChild(item);
    }
}

function updateWeaponsAboutList() {
    const weaponsList = document.getElementById('weaponsAboutList');
    if (!weaponsList) return;
    
    const weapons = [
        { type: 'buttplug', name: 'Buttplug', description: 'If not bullet, then why bullet shaped?', isStarting: true },
        { type: 'dildo', name: 'Dildo', description: "It's big. It's heavy. Hit em with it." },
        { type: 'collar', name: 'Collar', description: "It'll hurt anyone close enough to notice it." },
        { type: 'ovulation', name: 'Ovulation', description: 'Make use of your excitement to do some damage.' },
        { type: 'hitachi', name: 'Hitachi', description: "It's a wand. Cast some fireballs." }
    ];
    
    weaponsList.innerHTML = '';
    
    weapons.forEach(weapon => {
        const li = document.createElement('li');
        li.style.display = 'flex';
        li.style.alignItems = 'center';
        li.style.gap = '10px';
        li.style.marginBottom = '8px';
        
        // Get sprite
        const spriteName = `weapon-${weapon.type}`;
        const spriteData = SpriteManager.getSprite(spriteName);
        let spriteHtml = '';
        
        if (spriteData && spriteData.image) {
            spriteHtml = `<img src="${spriteData.image.src}" style="width: 32px; height: 32px; image-rendering: pixelated; image-rendering: -moz-crisp-edges; image-rendering: crisp-edges;" alt="${weapon.name}">`;
        }
        
        const startingNote = weapon.isStarting ? ' <span style="color: #ffd700; font-size: 0.9em;">(Starting Weapon)</span>' : '';
        li.innerHTML = `
            ${spriteHtml}
            <div>
                <strong>${weapon.name}:</strong>${startingNote} ${weapon.description}
            </div>
        `;
        
        weaponsList.appendChild(li);
    });
}

function updateEnemiesAboutList() {
    const enemiesList = document.getElementById('enemiesAboutList');
    if (!enemiesList) return;
    
    const enemies = [
        { spriteName: 'enemy-bills', name: 'Bills', description: 'Slow melee enemies that deal damage on contact' },
        { spriteName: 'enemy-incels', name: 'Incels', description: 'Medium-speed enemies that shoot projectiles' },
        { spriteName: 'enemy-politicians', name: 'Politicians', description: 'Slow enemies that charge and shoot 8 projectiles in all directions' }
    ];
    
    enemiesList.innerHTML = '';
    
    enemies.forEach(enemy => {
        const li = document.createElement('li');
        li.style.display = 'flex';
        li.style.alignItems = 'center';
        li.style.gap = '10px';
        li.style.marginBottom = '8px';
        
        // Get sprite
        const spriteData = SpriteManager.getSprite(enemy.spriteName);
        let spriteHtml = '';
        
        if (spriteData && spriteData.image) {
            spriteHtml = `<img src="${spriteData.image.src}" style="width: 32px; height: 32px; image-rendering: pixelated; image-rendering: -moz-crisp-edges; image-rendering: crisp-edges;" alt="${enemy.name}">`;
        }
        
        li.innerHTML = `
            ${spriteHtml}
            <div>
                <strong>${enemy.name}:</strong> ${enemy.description}
            </div>
        `;
        
        enemiesList.appendChild(li);
    });
}

function updateXPAboutList() {
    const xpList = document.getElementById('xpAboutList');
    if (!xpList) return;
    
    xpList.innerHTML = '';
    
    const li = document.createElement('li');
    li.style.display = 'flex';
    li.style.alignItems = 'center';
    li.style.gap = '10px';
    li.style.marginBottom = '8px';
    
    // Get XP sprite
    const spriteData = SpriteManager.getSprite('xp');
    let spriteHtml = '';
    
    if (spriteData && spriteData.image) {
        spriteHtml = `<img src="${spriteData.image.src}" style="width: 32px; height: 32px; image-rendering: pixelated; image-rendering: -moz-crisp-edges; image-rendering: crisp-edges;" alt="XP Bubble">`;
    }
    
    li.innerHTML = `
        ${spriteHtml}
        <div>
            <strong>XP Bubbles:</strong> Collect these bubbles dropped by defeated enemies to gain experience points. Move close to them to attract them automatically. Level up to choose powerful upgrades!
        </div>
    `;
    
    xpList.appendChild(li);
}

function updatePermanentStatsUI() {
    const permanentStatsPanel = document.getElementById('permanentStatsPanel');
    if (!permanentStatsPanel) return;
    
    const bonuses = PermanentStats.getBonuses();
    const xpGainPercent = ((bonuses.xpGain - 1) * 100).toFixed(1);
    const damagePercent = ((bonuses.damage - 1) * 100).toFixed(1);
    const hpPercent = ((bonuses.hp - 1) * 100).toFixed(1);
    const cooldownPercent = ((1 - bonuses.cooldown) * 100).toFixed(1);
    const speedPercent = ((bonuses.speed - 1) * 100).toFixed(1);
    const attackSizePercent = ((bonuses.attackSize - 1) * 100).toFixed(1);
    // Calculate rerolls: 3 base + 0.05 per permanent level (halved)
    const rerolls = 3 + (PermanentStats.totalLevelsGained * 0.05);
    
    permanentStatsPanel.innerHTML = `
        <div style="color: #ffd700; font-weight: 600; margin-bottom: 10px; font-size: 14px;">Permanent Upgrades</div>
        <div style="margin-bottom: 8px; font-size: 12px;">
            <div style="color: #aaa; margin-bottom: 2px;">Total Levels Gained:</div>
            <div style="color: #fff; font-weight: 600;">${PermanentStats.totalLevelsGained}</div>
        </div>
        <div style="margin-bottom: 8px; font-size: 12px;">
            <div style="color: #aaa; margin-bottom: 2px;">Rerolls per Run:</div>
            <div style="color: #ffd700;">${rerolls.toFixed(1)}</div>
        </div>
        <div style="margin-bottom: 8px; font-size: 12px;">
            <div style="color: #aaa; margin-bottom: 2px;">XP Gain:</div>
            <div style="color: #4a90e2;">+${xpGainPercent}%</div>
        </div>
        <div style="margin-bottom: 8px; font-size: 12px;">
            <div style="color: #aaa; margin-bottom: 2px;">Damage:</div>
            <div style="color: #ff6b6b;">+${damagePercent}%</div>
        </div>
        <div style="margin-bottom: 8px; font-size: 12px;">
            <div style="color: #aaa; margin-bottom: 2px;">Max HP:</div>
            <div style="color: #00ff88;">+${hpPercent}%</div>
        </div>
        <div style="margin-bottom: 8px; font-size: 12px;">
            <div style="color: #aaa; margin-bottom: 2px;">Cooldown Reduction:</div>
            <div style="color: #ff6b9d;">-${cooldownPercent}%</div>
        </div>
        <div style="margin-bottom: 8px; font-size: 12px;">
            <div style="color: #aaa; margin-bottom: 2px;">Movement Speed:</div>
            <div style="color: #ffaa00;">+${speedPercent}%</div>
        </div>
        <div style="margin-bottom: 8px; font-size: 12px;">
            <div style="color: #aaa; margin-bottom: 2px;">Attack Size:</div>
            <div style="color: #9b59b6;">+${attackSizePercent}%</div>
        </div>
    `;
}

// Hints array for death screens
const HINTS = [
    "Try avoiding damage to survive longer!",
    "Get your weapons to level 5 to mutate them into stronger versions!",
    "Ovulation is sticky- it slows down enemies and their projectiles!",
    "The collar is great for early game growth!",
    "Don't be afraid to reroll your level up options to cater to your situation!",
    "Hit enemies until they die to defeat them!",
    "Buttplugs are not only comfy, they can also destroy enemy projectiles!",
    "Fireballs cast from your Hitachi Wand can light enemies on fire!",
    "The dildo hits slowly but HARD.  Great for enemies with high HP!",
    "localStorage is your very own cheat menu.",
    "If you're reading this, you died.",
    "Oh, man, you were so close too...",
    "What's one more round between friends?",
    "Epstein didn't kill himself.  But you did."
];

function getRandomHint() {
    return HINTS[Math.floor(Math.random() * HINTS.length)];
}

function gameOver() {
    CONFIG.isGameOver = true;
    document.getElementById('finalTime').textContent = CONFIG.gameTime;
    document.getElementById('finalLevel').textContent = gameState.level;
    document.getElementById('gameOverHint').textContent = getRandomHint();
    document.getElementById('gameOverModal').classList.add('active');
    MusicManager.playGameOver();
    
    // Save permanent stats: add levels gained this session
    const levelsGained = gameState.level - gameState.startLevel;
    if (levelsGained > 0) {
        PermanentStats.addLevels(levelsGained);
        console.log(`Added ${levelsGained} levels to permanent stats. Total: ${PermanentStats.totalLevelsGained}`);
        console.log('Permanent stats saved to localStorage - will persist after browser closes');
    }
}

function restartGame() {
    // Reset game state
    gameState.player = new Player(CONFIG.width / 2, CONFIG.height / 2);
    gameState.enemies = [];
    gameState.projectiles = [];
    gameState.enemyProjectiles = [];
    gameState.damagePools = [];
    gameState.strikes = [];
    gameState.collarAuras = [];
    gameState.boss = null;
    gameState.bossSpawned = false;
    gameState.chastityCageLevel = 0;
    gameState.lubeLevel = 0;
    gameState.hiddenVibeLevel = 0;
    gameState.cockRingLevel = 0;
    gameState.pantiesLevel = 0;
    gameState.pantiesLevel = 0;
    gameState.experienceOrbs = [];
    gameState.weapons = [new Weapon('buttplug')]; // Start with a buttplug
    gameState.level = 1;
    gameState.startLevel = 1; // Reset starting level
    gameState.xp = 0;
    gameState.xpNeeded = 10;
    gameState.startTime = Date.now();
    gameState.tabHiddenTime = null; // Reset tab hidden time
    gameState.totalPausedTime = 0; // Reset total paused time
    
    // Initialize rerolls: 3 base + 0.1 per permanent level
    const permanentLevels = PermanentStats.totalLevelsGained;
    gameState.rerolls = 3 + (permanentLevels * 0.1);
    
    CONFIG.gameTime = 0;
    CONFIG.isPaused = false;
    CONFIG.isGameOver = false;

    document.getElementById('gameOverModal').classList.remove('active');
    document.getElementById('winModal').classList.remove('active');
    
    updateUI();
}

function retryGame() {
    restartGame();
    // Start gameplay immediately
    gameState.startTime = Date.now();
    gameState.startLevel = gameState.level;
    MusicManager.playGameplay();
    requestAnimationFrame(gameLoop);
}

function returnToMainMenu() {
    restartGame();
    // Show start menu
    const startScreen = document.getElementById('startScreen');
    startScreen.classList.add('active');
    // Return to menu music - ensure it plays
    setTimeout(() => {
        MusicManager.playMenu();
    }, 100);
}

// Initialize Game
async function initGame() {
    initCanvas();
    
    // Initialize permanent stats (load from localStorage)
    PermanentStats.load();
    
    // Initialize music manager
    MusicManager.init();
    
    // Initialize sound effects
    SoundEffects.init();
    
    // Initialize mute checkbox states (if they exist)
    const muteMusicCheckbox = document.getElementById('muteMusicCheckbox');
    const muteSoundEffectsCheckbox = document.getElementById('muteSoundEffectsCheckbox');
    if (muteMusicCheckbox) {
        muteMusicCheckbox.checked = MusicManager.muted;
    }
    if (muteSoundEffectsCheckbox) {
        muteSoundEffectsCheckbox.checked = SoundEffects.muted;
    }
    
    // Set up tab visibility change listener to pause timer when tab is inactive
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
            // Tab became hidden - record the time
            if (gameState.startTime && !gameState.tabHiddenTime) {
                gameState.tabHiddenTime = Date.now();
            }
        } else {
            // Tab became visible - add the paused time to totalPausedTime
            if (gameState.startTime && gameState.tabHiddenTime) {
                const pausedDuration = Date.now() - gameState.tabHiddenTime;
                gameState.totalPausedTime += pausedDuration;
                gameState.tabHiddenTime = null;
            }
        }
    });
    
    // Set up challenge modal buttons
    document.getElementById('agreeButton').addEventListener('click', () => {
        // Hide challenge modal
        document.getElementById('challengeModal').classList.remove('active');
        // Show start screen
        document.getElementById('startScreen').classList.add('active');
        // Play menu music (now that user has interacted)
        setTimeout(() => {
            MusicManager.playMenu();
        }, 100);
    });
    
    document.getElementById('declineButton').addEventListener('click', () => {
        // Open the courage article in a new tab
        window.open('https://www.psy-ed.com/wpblog/child-courage/', '_blank');
    });
    
    // Load sprites (don't wait if they fail)
    try {
        await SpriteManager.loadAllSprites();
        console.log(`Loaded ${SpriteManager.loaded} sprite(s)`);
        // Update logo display after sprites load
        updateLogoDisplay();
    } catch (e) {
        console.warn('Some sprites failed to load, using fallback graphics:', e);
    }
    
    gameState.player = new Player(CONFIG.width / 2, CONFIG.height / 2);
    gameState.weapons = [new Weapon('buttplug')]; // Start with a buttplug
    
    // Start game button
    document.getElementById('startButton').addEventListener('click', () => {
        document.getElementById('startScreen').classList.remove('active');
        gameState.startTime = Date.now();
        gameState.tabHiddenTime = null; // Reset tab hidden time
        gameState.totalPausedTime = 0; // Reset total paused time
        gameState.startLevel = gameState.level; // Track starting level for permanent stats
        
        // Initialize rerolls: 3 base + 0.05 per permanent level (halved)
        const permanentLevels = PermanentStats.totalLevelsGained;
        gameState.rerolls = 3 + (permanentLevels * 0.05);
        console.log('Game started! Player should be visible at center of screen.');
        if (!gameState.player) {
            console.error('ERROR: Player not initialized!');
        }
        // Play gameplay music when game starts (after user interaction)
        setTimeout(() => {
            MusicManager.playGameplay();
        }, 100); // Small delay to ensure menu music stops first
        requestAnimationFrame(gameLoop);
    });

    // About button
    document.getElementById('aboutButton').addEventListener('click', () => {
        updateWeaponsAboutList();
        updateEnemiesAboutList();
        updateXPAboutList();
        document.getElementById('aboutModal').classList.add('active');
    });

    // Close About button
    document.getElementById('closeAboutButton').addEventListener('click', () => {
        document.getElementById('aboutModal').classList.remove('active');
        // Don't reset music - let it continue playing
    });

    // Settings button
    document.getElementById('settingsButton').addEventListener('click', () => {
        // Update checkboxes to reflect current mute state
        const muteMusicCheckbox = document.getElementById('muteMusicCheckbox');
        const muteSoundEffectsCheckbox = document.getElementById('muteSoundEffectsCheckbox');
        if (muteMusicCheckbox) {
            muteMusicCheckbox.checked = MusicManager.muted;
        }
        if (muteSoundEffectsCheckbox) {
            muteSoundEffectsCheckbox.checked = SoundEffects.muted;
        }
        document.getElementById('settingsModal').classList.add('active');
    });

    // Close Settings button
    document.getElementById('closeSettingsButton').addEventListener('click', () => {
        document.getElementById('settingsModal').classList.remove('active');
        // Clear password field
        document.getElementById('testModePassword').value = '';
        document.getElementById('testModeMessage').textContent = '';
        // Don't reset music - let it continue playing
    });
    
    // Mute Music checkbox
    const muteMusicCheckboxListener = document.getElementById('muteMusicCheckbox');
    if (muteMusicCheckboxListener) {
        muteMusicCheckboxListener.addEventListener('change', (e) => {
            MusicManager.setMuted(e.target.checked);
        });
    }
    
    // Mute Sound Effects checkbox
    const muteSoundEffectsCheckboxListener = document.getElementById('muteSoundEffectsCheckbox');
    if (muteSoundEffectsCheckboxListener) {
        muteSoundEffectsCheckboxListener.addEventListener('change', (e) => {
            SoundEffects.setMuted(e.target.checked);
        });
    }

    // Clear stats button
    document.getElementById('clearStatsButton').addEventListener('click', () => {
        if (confirm('Are you sure you want to clear all permanent stats? This cannot be undone!')) {
            PermanentStats.totalLevelsGained = 0;
            PermanentStats.save();
            
            // Recreate player with cleared stats if player exists (for immediate effect)
            if (gameState.player) {
                const oldX = gameState.player.x;
                const oldY = gameState.player.y;
                gameState.player = new Player(oldX, oldY);
            }
            
            // Also update any existing weapons to use cleared stats
            gameState.weapons.forEach(weapon => {
                const bonuses = PermanentStats.getBonuses();
                // Recalculate damage for weapons that use permanent bonuses
                if (weapon.type === 'dildo') {
                    weapon.damage = Math.floor(120 * bonuses.damage);
                } else if (weapon.type === 'buttplug') {
                    weapon.damage = Math.floor(30 * bonuses.damage);
                } else if (weapon.type === 'collar') {
                    weapon.damage = Math.floor(15 * bonuses.damage);
                } else if (weapon.type === 'ovulation') {
                    weapon.damage = Math.floor(20 * bonuses.damage);
                } else if (weapon.type === 'hitachi') {
                    weapon.damage = Math.floor(40 * bonuses.damage);
                }
            });
            
            alert('Permanent stats cleared!');
            updatePermanentStatsUI();
        }
    });

    // Enable test mode button
    document.getElementById('enableTestModeButton').addEventListener('click', () => {
        const password = document.getElementById('testModePassword').value;
        const messageEl = document.getElementById('testModeMessage');
        
        if (password === 'hunter2') {
            messageEl.textContent = 'Test mode enabled! Starting game...';
            messageEl.className = 'message-text success';
            
            // Close settings modal
            setTimeout(() => {
                document.getElementById('settingsModal').classList.remove('active');
                document.getElementById('startScreen').classList.remove('active');
                
                // Start test mode
                startTestMode();
            }, 500);
        } else {
            messageEl.textContent = 'Incorrect password!';
            messageEl.className = 'message-text error';
            document.getElementById('testModePassword').value = '';
        }
    });

    // Test mode function
    function startTestMode() {
        // Create all weapons at level 5
        const allWeaponTypes = ['dildo', 'buttplug', 'collar', 'ovulation', 'hitachi'];
        gameState.weapons = [];
        
        allWeaponTypes.forEach(weaponType => {
            const weapon = new Weapon(weaponType);
            // Set to level 5
            weapon.level = 5;
            // Apply level 5 upgrades (4 upgrades from level 1 to 5)
            weapon.damage = Math.floor(weapon.damage * Math.pow(1.3, 4)); // 4 upgrades (level 2-5)
            
            // Special handling for weapons that increase count/burstCount
            if (weaponType === 'hitachi') {
                weapon.burstCount = 3 + 4; // Base 3 + 4 levels = 7
            } else if (weaponType !== 'buttplug' && weaponType !== 'collar' && weaponType !== 'ovulation') {
                // Increase count for every 3 levels (levels 3, 6, 9...)
                weapon.count = 1 + Math.floor((weapon.level - 1) / 3);
            }
            
            gameState.weapons.push(weapon);
        });
        
        // Initialize collar aura if collar weapon exists (it will be created on first fire)
        const collarWeapon = gameState.weapons.find(w => w.type === 'collar');
        if (collarWeapon) {
            // Trigger fire to create the aura
            collarWeapon.fire();
        }
        
        // Start game at 4:30 (270 seconds) for boss testing
        // Set startTime to 270 seconds ago so gameTime will be 270
        gameState.startTime = Date.now() - (270 * 1000);
        gameState.startLevel = gameState.level; // Track starting level for permanent stats
        CONFIG.gameTime = 270; // Set game time to 4:30
        console.log('Test mode started with all weapons at level 5! Game time set to 4:30 for boss testing.');
        MusicManager.playGameplay(); // Play gameplay music when test mode starts
        requestAnimationFrame(gameLoop);
    }

    // Retry button (restarts game and enters gameplay)
    document.getElementById('retryButton').addEventListener('click', () => {
        retryGame();
    });

    // Main menu button (returns to start menu)
    document.getElementById('mainMenuButton').addEventListener('click', () => {
        returnToMainMenu();
    });
    
    // Win main menu button (returns to start menu from win screen)
    document.getElementById('winMainMenuButton').addEventListener('click', () => {
        returnToMainMenu();
    });
    
    // Initialize UI
    updateUI();
    updatePermanentStatsUI();
    updateLogoDisplay();
    
    // Start the game loop (it will pause when challenge modal is active)
    requestAnimationFrame(gameLoop);
}

function updateLogoDisplay() {
    const logoData = SpriteManager.getSprite('logo');
    const logoImage = document.getElementById('logoImage');
    const logoOverlay = document.getElementById('gameLogoOverlay');
    
    // Update start menu logo
    if (logoImage && logoData && logoData.image) {
        logoImage.src = logoData.image.src;
        logoImage.style.display = 'block';
        logoImage.style.maxWidth = '400px';
        logoImage.style.maxHeight = '200px';
        logoImage.style.width = 'auto';
        logoImage.style.height = 'auto';
    }
    
    // Update start menu character sprite
    const menuCharacterData = SpriteManager.getSprite('menu-character');
    const menuCharacterImage = document.getElementById('menuCharacterImage');
    if (menuCharacterImage && menuCharacterData && menuCharacterData.image) {
        menuCharacterImage.src = menuCharacterData.image.src;
        menuCharacterImage.style.display = 'block';
        menuCharacterImage.style.maxWidth = '200px';
        menuCharacterImage.style.maxHeight = '200px';
        menuCharacterImage.style.width = 'auto';
        menuCharacterImage.style.height = 'auto';
    }
    
    // Update gameplay logo overlay (only show during gameplay, not in menus)
    if (logoOverlay) {
        const startScreen = document.getElementById('startScreen');
        const gameOverModal = document.getElementById('gameOverModal');
        const isGameplay = !startScreen.classList.contains('active') && 
                          !gameOverModal.classList.contains('active') && 
                          !CONFIG.isPaused && 
                          !CONFIG.isGameOver;
        
        if (logoOverlay && logoData && logoData.image && isGameplay) {
            logoOverlay.innerHTML = `<img src="${logoData.image.src}" alt="Logo" class="logo-overlay-img">`;
            logoOverlay.style.display = 'block';
        } else {
            logoOverlay.style.display = 'none';
        }
    }
    
    // Update challenge modal sprite
    const challengeSpriteData = SpriteManager.getSprite('challenge-sprite');
    const challengeSpriteImage = document.getElementById('challengeSpriteImage');
    if (challengeSpriteImage && challengeSpriteData && challengeSpriteData.image) {
        challengeSpriteImage.src = challengeSpriteData.image.src;
        challengeSpriteImage.style.display = 'block';
        challengeSpriteImage.style.maxWidth = '300px';
        challengeSpriteImage.style.maxHeight = '150px';
        challengeSpriteImage.style.width = 'auto';
        challengeSpriteImage.style.height = 'auto';
    }
    
    // Update game over modal sprite
    const gameOverSpriteData = SpriteManager.getSprite('gameover-sprite');
    const gameOverSpriteImage = document.getElementById('gameOverSpriteImage');
    if (gameOverSpriteImage && gameOverSpriteData && gameOverSpriteData.image) {
        gameOverSpriteImage.src = gameOverSpriteData.image.src;
        gameOverSpriteImage.style.display = 'block';
        gameOverSpriteImage.style.maxWidth = '300px';
        gameOverSpriteImage.style.maxHeight = '150px';
        gameOverSpriteImage.style.width = 'auto';
        gameOverSpriteImage.style.height = 'auto';
    }
    
    // Update win modal sprite
    const winSpriteData = SpriteManager.getSprite('win-sprite');
    const winSpriteImage = document.getElementById('winSpriteImage');
    if (winSpriteImage && winSpriteData && winSpriteData.image) {
        winSpriteImage.src = winSpriteData.image.src;
        winSpriteImage.style.display = 'block';
        winSpriteImage.style.maxWidth = '300px';
        winSpriteImage.style.maxHeight = '150px';
        winSpriteImage.style.width = 'auto';
        winSpriteImage.style.height = 'auto';
    }
}

// Start the game when page loads
window.addEventListener('load', initGame);
