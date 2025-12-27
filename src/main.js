// Game Configuration
const CONFIG = {
    SPEED: 10,
    PLAYER_SIZE: 48,
    ROOMS: [
        { id: 1, name: "迷迭香", video: "迷迭香.mp4", answers: ["迷迭香", "周杰伦"], style: "jazz" },
        { id: 2, name: "龙卷风", video: "龙卷风.mp4", answers: ["龙卷风", "周杰伦"], style: "pop" },
        { id: 3, name: "月亮代表谁的心", video: "月亮代表谁的心.mp4", answers: ["月亮代表谁的心", "陶喆"], style: "rnb" },
        { id: 4, name: "千年等一回", video: "千年等一回.mp4", answers: ["千年等一回", "高胜美"], style: "classic-cn" },
        { id: 5, name: "一生所爱", video: "一生所爱.mp4", answers: ["一生所爱", "卢冠廷"], style: "hk" },
        { id: 6, name: "敢问路在何方", video: "敢问路在何方.mp4", answers: ["敢问路在何方", "蒋大为"], style: "folk" }
    ],
    // Rhythm Game Config
    NOTE_SPEED: 3,
    SPAWN_RATE: 100 // Frames between spawns (approx 1.5s at 60fps)
};

// State Management
const state = {
    currentScene: 'lobby', // 'lobby' or room ID
    visitedRooms: new Set(),
    playerPos: { x: window.innerWidth / 2, y: window.innerHeight / 2 },
    keys: {},
    isTransitioning: false,
    gameStarted: false,
    bgm: null,

    // Rhythm Stats
    rhythm: {
        score: 0,
        combo: 0,
        notes: [], // Array of active note objects {el, x, y, speed, type}
        frameCount: 0,
        isPlaying: false,
        powerUp: 'normal',
        powerUpTimer: 0,
        speedMod: 1,
        freezeTimer: 0
    }
};

// DOM Elements
const playerEl = document.getElementById('player');
const sceneLayer = document.getElementById('scene-layer');
const uiLayer = {
    startScreen: document.getElementById('start-screen'),
    startBtn: document.getElementById('start-btn'),
    controlsHint: document.getElementById('controls-hint'),

    // Rhythm HUD
    rhythmHud: document.getElementById('rhythm-hud'),
    score: document.getElementById('rhythm-score'),
    combo: document.getElementById('rhythm-combo'),
    msg: document.getElementById('rhythm-message'),

    // Common
    transition: document.getElementById('transition-overlay'),
    scoreBoard: document.getElementById('score-board')
};

// Initialization
function init() {
    uiLayer.startBtn.addEventListener('click', startGame);
    setupInputs();

    initBGM();

    document.addEventListener('click', () => {
        if (state.bgm && state.bgm.paused && !state.gameStarted) {
            state.bgm.play().catch(() => { });
        }
    }, { once: true });
}

function initBGM() {
    if (!state.bgm) {
        state.bgm = new Audio('/歌舞厅背景音乐.MP3');
        state.bgm.loop = true;
        state.bgm.volume = 0.4;
        state.bgm.play().catch((e) => console.log("Autoplay blocked", e));
    }
}

function startGame() {
    console.log("Game Starting...");
    if (audio.ctx && audio.ctx.state === 'suspended') {
        audio.ctx.resume().catch(() => { });
    }

    if (state.bgm && state.bgm.paused) {
        state.bgm.play().catch(() => { });
    }

    uiLayer.startScreen.classList.add('hidden');
    state.gameStarted = true;
    uiLayer.controlsHint.classList.remove('hidden');

    renderLobby();

    const container = document.getElementById('game-container');
    const startX = (container.clientWidth - CONFIG.PLAYER_SIZE) / 2;
    const startY = container.clientHeight - CONFIG.PLAYER_SIZE - 20;

    state.playerPos = { x: startX, y: startY };
    updatePlayerPos();

    gameLoop();
}

// Input Handling
function setupInputs() {
    window.addEventListener('keydown', (e) => {
        state.keys[e.key] = true;

        if (e.key === 'Enter') {
            if (!state.gameStarted) {
                startGame();
            }
        }

        if (e.key === 'Escape') {
            if (state.currentScene !== 'lobby') {
                returnToLobby();
            }
        }
    });
    window.addEventListener('keyup', (e) => {
        state.keys[e.key] = false;
        playerEl.classList.remove('walking');
    });
}

// Game Loop
function gameLoop() {
    requestAnimationFrame(gameLoop);

    if (state.isTransitioning) return;

    if (state.currentScene === 'lobby') {
        movePlayer();
        checkCollisions();
    } else {
        // Assume Room Scene -> Rhythm Game
        movePlayer();
        updateRhythmGame();
    }
}

// Movement Logic
function movePlayer() {
    let moved = false;
    const speed = CONFIG.SPEED;

    if (state.keys['ArrowUp'] || state.keys['w']) { state.playerPos.y -= speed; moved = true; }
    if (state.keys['ArrowDown'] || state.keys['s']) { state.playerPos.y += speed; moved = true; }
    if (state.keys['ArrowLeft'] || state.keys['a']) { state.playerPos.x -= speed; moved = true; }
    if (state.keys['ArrowRight'] || state.keys['d']) { state.playerPos.x += speed; moved = true; }

    const container = document.getElementById('game-container');
    const maxX = container.clientWidth - CONFIG.PLAYER_SIZE;
    const maxY = container.clientHeight - CONFIG.PLAYER_SIZE;

    // In Room, player is restricted to bottom stage area
    let minY = container.clientHeight * 0.70;

    if (typeof state.currentScene === 'number') {
        minY = container.clientHeight * 0.60;
    }

    state.playerPos.x = Math.max(0, Math.min(state.playerPos.x, maxX));
    state.playerPos.y = Math.max(minY, Math.min(state.playerPos.y, maxY));

    updatePlayerPos();

    if (moved) playerEl.classList.add('walking');
    else playerEl.classList.remove('walking');
}

function updatePlayerPos() {
    playerEl.style.left = `${state.playerPos.x}px`;
    playerEl.style.top = `${state.playerPos.y}px`;
    playerEl.style.transform = 'none';
}

// ----------------------
// RHYTHM GAME LOGIC
// ----------------------

function startRhythmGame() {
    state.rhythm.score = 0;
    state.rhythm.combo = 0;
    state.rhythm.notes = [];
    state.rhythm.frameCount = 0;
    state.rhythm.isPlaying = true;

    // Reset Powerups
    setPowerUp('normal');

    uiLayer.rhythmHud.classList.remove('hidden');
    updateHud();

    // Player visible in room
    playerEl.style.display = 'block';
    playerEl.style.zIndex = 60; // Above notes
}

function stopRhythmGame() {
    state.rhythm.isPlaying = false;
    uiLayer.rhythmHud.classList.add('hidden');
    setPowerUp('normal');

    // Clear notes
    state.rhythm.notes.forEach(n => n.el.remove());
    state.rhythm.notes = [];
}

function setPowerUp(type) {
    state.rhythm.powerUp = type;
    playerEl.classList.remove('big', 'star');

    if (type === 'big') {
        playerEl.classList.add('big');
        state.rhythm.powerUpTimer = performance.now() + 15000; // 15s
        showFeedback("BIG MODE!", "#e50914");
    } else if (type === 'star') {
        playerEl.classList.add('star');
        state.rhythm.powerUpTimer = performance.now() + 8000; // 8s
        showFeedback("INVINCIBLE!", "#ffd700");
    }
}

function updateRhythmGame() {
    if (!state.rhythm.isPlaying) return;

    state.rhythm.frameCount++;

    // Check PowerUp Expiry
    if (state.rhythm.powerUp !== 'normal' && performance.now() > state.rhythm.powerUpTimer) {
        setPowerUp('normal');
    }

    // 1. Spawn Notes
    if (state.rhythm.frameCount % CONFIG.SPAWN_RATE === 0) {
        spawnNote();
    }

    // Check Freeze Expiry
    if (state.rhythm.speedMod < 1 && performance.now() > state.rhythm.freezeTimer) {
        state.rhythm.speedMod = 1; // Reset speed
    }

    // 2. Update Notes Position
    const container = document.getElementById('game-container');
    const limitY = container.clientHeight;

    // Iterate backwards to remove safely
    for (let i = state.rhythm.notes.length - 1; i >= 0; i--) {
        const note = state.rhythm.notes[i];

        // Apply Speed Modifier (Ice effect)
        let currentSpeed = note.speed * (state.rhythm.speedMod || 1);
        note.y += currentSpeed;

        note.el.style.top = `${note.y}px`;

        // check miss
        if (note.y > limitY) {
            // MISS (Bomb misses are good!)
            if (note.type !== 'bomb') {
                resolveHit(note, false);
            } else {
                note.el.remove(); // Bomb fell safely
            }
            state.rhythm.notes.splice(i, 1);
            continue;
        }

        // check hit collision (Player Body vs Note)
        if (checkNoteCollision(note)) {
            // HIT
            resolveHit(note, true);
            state.rhythm.notes.splice(i, 1);
        }
    }
}

function spawnNote() {
    const container = document.getElementById('game-container');
    const noteEl = document.createElement('div');
    noteEl.className = 'note';

    // New Probability Table
    // Normal: 70% | Coin: 10% | Bomb: 7% | Mushroom: 5% | Star: 5% | Ice: 3%
    const rand = Math.random();
    let type = 'style-1';
    let content = '🎵';
    let speedMod = 0;

    if (rand < 0.03) {
        type = 'ice'; content = '❄️'; speedMod = 1; // 3%
    } else if (rand < 0.08) {
        type = 'mushroom'; content = '🍄'; speedMod = 2; // 5%
    } else if (rand < 0.13) {
        type = 'star'; content = '⭐'; speedMod = 3; // 5%
    } else if (rand < 0.20) {
        type = 'bomb'; content = '💣'; speedMod = 0; // 7%
    } else if (rand < 0.30) {
        type = 'coin'; content = '🪙'; speedMod = 2; // 10%
    } else if (rand < 0.65) {
        type = 'style-2'; content = '★'; // 35%
    }

    // Apply class
    noteEl.classList.add(type);
    noteEl.textContent = content;

    // Spawn X
    const maxX = container.clientWidth - 50;
    const startX = Math.random() * (maxX - 50) + 25;

    noteEl.style.left = `${startX}px`;
    noteEl.style.top = '-50px';

    sceneLayer.appendChild(noteEl);

    state.rhythm.notes.push({
        el: noteEl,
        x: startX,
        y: -50,
        speed: CONFIG.NOTE_SPEED + speedMod + (Math.random() * 2),
        type: type,
        width: 40,
        height: 40
    });
}
// checkNoteCollision kept same...
// resolveHit needs update for Logic

function checkNoteCollision(note) {
    // Simple AABB
    const pX = state.playerPos.x;
    const pY = state.playerPos.y;
    let pS = CONFIG.PLAYER_SIZE;

    // Hitbox is bigger if in BIG mode
    let offsetX = 5;
    if (state.rhythm.powerUp === 'big') {
        offsetX = -15; // Expand outwards
        pS = pS + 30;
    }

    // Shrink hitbox slightly for forgiveness
    const noteRect = { l: note.x, r: note.x + note.width, t: note.y, b: note.y + note.height };
    const playerRect = { l: pX + offsetX, r: pX + pS - offsetX, t: pY + 20, b: pY + pS };

    return !(playerRect.r < noteRect.l ||
        playerRect.l > noteRect.r ||
        playerRect.b < noteRect.t ||
        playerRect.t > noteRect.b);
}

function resolveHit(note, isHit) {
    if (isHit) {
        // Special Case: BOMB
        if (note.type === 'bomb') {
            // If Invincible, destroy bomb!
            if (state.rhythm.powerUp === 'star') {
                state.rhythm.score += 200;
                audio.playSuccess();
                showFeedback("DESTROY!", "#eda002");
                showHitEffect(note.x, note.y);
            } else {
                // OUCH!
                state.rhythm.score = Math.max(0, state.rhythm.score - 500);
                state.rhythm.combo = 0;
                audio.playFail();
                showFeedback("BOOM!!", "#f00");

                // Shake Screen
                document.body.classList.add('shake');
                setTimeout(() => document.body.classList.remove('shake'), 500);

                // Lose Powerup
                if (state.rhythm.powerUp === 'big') setPowerUp('normal');
            }
            note.el.remove();
            updateHud();
            return;
        }

        // Normal Hits
        let points = 100;
        let label = "PERFECT!";
        let color = "#0f0";

        if (note.type === 'coin') { points = 300; label = "RICH!"; color = "#ffd700"; }
        if (state.rhythm.powerUp === 'star') points *= 2;

        state.rhythm.score += points + (state.rhythm.combo * 10);
        state.rhythm.combo++;
        audio.playSuccess();

        note.el.remove();

        // Apply Effects
        if (note.type === 'mushroom') { setPowerUp('big'); label = "GROW!"; }
        if (note.type === 'star') { setPowerUp('star'); label = "STAR!"; }
        if (note.type === 'ice') {
            state.rhythm.speedMod = 0.5; // Slow down
            state.rhythm.freezeTimer = performance.now() + 5000; // 5s
            label = "FREEZE!"; color = "#a0eaff";
        }

        showHitEffect(note.x, note.y);
        showFeedback(label, color);

    } else {
        // Miss (Non-bomb)
        if (state.rhythm.powerUp !== 'normal') {
            setPowerUp('normal');
            audio.playFail();
            showFeedback("POWER DOWN", "#f00");
        } else {
            state.rhythm.combo = 0;
            audio.playFail();
            showFeedback("MISS", "#f00");
        }

        note.el.remove();
    }

    updateHud();
}

function showHitEffect(x, y) {
    const effect = document.createElement('div');
    effect.className = 'hit-effect';
    effect.style.left = `${x - 30}px`;
    effect.style.top = `${y - 30}px`;
    sceneLayer.appendChild(effect);
    setTimeout(() => effect.remove(), 500);
}

function showFeedback(text, color) {
    uiLayer.msg.textContent = text;
    uiLayer.msg.style.color = color;
    uiLayer.msg.classList.remove('pop');
    void uiLayer.msg.offsetWidth; // trigger reflow
    uiLayer.msg.classList.add('pop');
}

function updateHud() {
    uiLayer.score.textContent = state.rhythm.score;
    uiLayer.combo.textContent = state.rhythm.combo;
}

// Scene Rendering & Standard Logic

function renderLobby() {
    sceneLayer.innerHTML = '';

    if (state.bgm) {
        state.bgm.play().catch(e => console.log("BGM Play Error:", e));
    }

    const container = document.getElementById('game-container');
    if (container) {
        state.playerPos.x = (container.clientWidth - CONFIG.PLAYER_SIZE) / 2;
        state.playerPos.y = container.clientHeight - CONFIG.PLAYER_SIZE - 20;
        updatePlayerPos();
    }

    const positions = [
        { left: '5%', top: '35%', width: '12%', height: '55%', transform: 'perspective(1000px) rotateY(25deg)' },
        { left: '23%', top: '48%', width: '10%', height: '33%', transform: 'perspective(1000px) rotateY(15deg)' },
        { left: '40%', top: '51%', width: '8.5%', height: '26%', transform: 'none' },
        { left: '52%', top: '51%', width: '8.5%', height: '26%', transform: 'none' },
        { left: '69%', top: '52%', width: '8%', height: '28%', transform: 'perspective(1000px) rotateY(-15deg)' },
        { left: '86%', top: '46%', width: '10%', height: '38%', transform: 'perspective(1000px) rotateY(-25deg)' }
    ];

    CONFIG.ROOMS.forEach((room, index) => {
        const door = document.createElement('div');
        door.className = 'door';
        door.dataset.roomId = room.id;

        const pos = positions[index] || {};
        door.style.left = pos.left;
        door.style.top = pos.top;
        if (pos.width) door.style.width = pos.width;
        if (pos.height) door.style.height = pos.height;
        if (pos.transform) door.style.transform = pos.transform;

        const plate = document.createElement('div');
        plate.className = 'plate';
        plate.textContent = `${room.id}`;
        door.appendChild(plate);

        sceneLayer.appendChild(door);
    });

    playerEl.style.display = 'block';
    uiLayer.rhythmHud.classList.add('hidden');
}

function checkCollisions() {
    const playerRect = playerEl.getBoundingClientRect();
    const doors = document.querySelectorAll('.door');

    doors.forEach(door => {
        const rect = door.getBoundingClientRect();
        const roomId = parseInt(door.dataset.roomId);
        const xOverlap = (playerRect.left < rect.right && playerRect.right > rect.left);
        const container = document.getElementById('game-container');
        const floorHorizon = container.clientHeight * 0.70;

        let isDeepEnough = playerRect.top < (floorHorizon + 50);

        if (roomId === 3 || roomId === 4) {
            isDeepEnough = playerRect.bottom < (rect.bottom + 20);
        }

        if (xOverlap && isDeepEnough) {
            enterRoom(roomId, door);
        }
    });
}

async function enterRoom(roomId, doorEl) {
    if (state.isTransitioning) return;
    state.isTransitioning = true;

    if (doorEl) {
        doorEl.classList.add('open');
        audio.playClick();
        await new Promise(r => setTimeout(r, 500));
    }

    state.currentScene = roomId;

    uiLayer.transition.classList.remove('hidden');
    audio.playDiskChange();
    if (state.bgm) state.bgm.pause();
    uiLayer.controlsHint.classList.add('hidden');

    await new Promise(r => setTimeout(r, 2000));

    const room = CONFIG.ROOMS.find(r => r.id === roomId);
    loadRoomContent(room);

    uiLayer.transition.classList.add('hidden');
    state.isTransitioning = false;
}

function loadRoomContent(room) {
    sceneLayer.innerHTML = '';
    playerEl.style.display = 'block';

    const video = document.createElement('video');
    video.src = `/videos/${room.video}`;
    video.style.width = '100%';
    video.style.height = '100%';
    video.style.objectFit = 'cover';
    video.style.objectPosition = 'center 40%';
    video.autoplay = true;
    video.loop = true;
    video.controls = false;

    sceneLayer.appendChild(video);

    // Start Rhythm
    startRhythmGame();
}

function returnToLobby() {
    stopRhythmGame();
    uiLayer.transition.classList.remove('hidden');
    setTimeout(() => {
        state.currentScene = 'lobby';
        renderLobby();
        uiLayer.transition.classList.add('hidden');
        uiLayer.controlsHint.classList.remove('hidden');
    }, 1000);
}

// Audio System
const audio = {
    ctx: new (window.AudioContext || window.webkitAudioContext)(),
    playTone(freq, type, duration) {
        if (this.ctx.state === 'suspended') this.ctx.resume();
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
        gain.gain.setValueAtTime(0.1, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + duration);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start();
        osc.stop(this.ctx.currentTime + duration);
    },
    playNoise(duration) {
        if (this.ctx.state === 'suspended') this.ctx.resume();
        const bufferSize = this.ctx.sampleRate * duration;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }
        const noise = this.ctx.createBufferSource();
        noise.buffer = buffer;
        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.05, this.ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + duration);
        noise.connect(gain);
        gain.connect(this.ctx.destination);
        noise.start();
    },
    playSuccess() {
        this.playTone(600, 'sine', 0.1);
        setTimeout(() => this.playTone(800, 'sine', 0.2), 100);
    },
    playFail() {
        this.playTone(150, 'sawtooth', 0.3);
    },
    playDiskChange() {
        this.playNoise(1.5);
        this.playTone(50, 'square', 0.1);
    },
    playClick() {
        this.playTone(400, 'triangle', 0.05);
    }
};

document.querySelectorAll('button').forEach(btn => {
    btn.addEventListener('click', () => audio.playClick());
});

// Start
init();
