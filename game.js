// Game Configuration
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Set canvas size
function resizeCanvas() {
    const container = canvas.parentElement;
    canvas.width = container.clientWidth;
    canvas.height = 600;
}
resizeCanvas();
window.addEventListener('resize', resizeCanvas);

// Game State
const game = {
    running: false,
    paused: false,
    score: 0,
    bestScore: parseInt(localStorage.getItem('binkRacingBest')) || 0,
    speed: 0,
    baseSpeed: 2,
    maxSpeed: 15,
    speedIncrement: 0.001,
    difficulty: 'medium',
    soundEnabled: true
};

// Player Car
const player = {
    width: 40,
    height: 70,
    x: 0,
    y: 0,
    speed: 8,
    color: '#ff6b6b'
};

// Road lanes
const road = {
    lanes: 5,
    laneWidth: 0,
    stripeHeight: 40,
    stripeGap: 20,
    stripes: [],
    offset: 0
};

// Obstacles
const obstacles = [];
const coins = [];
const particles = [];

// Input handling
const keys = {
    left: false,
    right: false,
    pause: false
};

// Initialize game
function init() {
    road.laneWidth = canvas.width / road.lanes;
    player.x = Math.floor(road.lanes / 2) * road.laneWidth + road.laneWidth / 2 - player.width / 2;
    player.y = canvas.height - player.height - 50;

    // Initialize road stripes
    road.stripes = [];
    for (let i = 0; i < canvas.height / (road.stripeHeight + road.stripeGap) + 2; i++) {
        road.stripes.push({
            y: i * (road.stripeHeight + road.stripeGap) - road.stripeHeight
        });
    }

    updateBestScore();
}

// Start game
function startGame() {
    game.difficulty = document.getElementById('difficulty').value;

    // Set difficulty parameters
    switch(game.difficulty) {
        case 'easy':
            game.baseSpeed = 2;
            game.maxSpeed = 10;
            break;
        case 'medium':
            game.baseSpeed = 3;
            game.maxSpeed = 15;
            break;
        case 'hard':
            game.baseSpeed = 4;
            game.maxSpeed = 20;
            break;
    }

    game.running = true;
    game.paused = false;
    game.score = 0;
    game.speed = game.baseSpeed;
    obstacles.length = 0;
    coins.length = 0;
    particles.length = 0;

    document.getElementById('start-menu').classList.add('hidden');
    document.getElementById('game-over').classList.add('hidden');

    init();
    gameLoop();
}

// Game loop
let lastTime = 0;
function gameLoop(timestamp = 0) {
    if (!game.running) return;

    const deltaTime = timestamp - lastTime;
    lastTime = timestamp;

    if (!game.paused) {
        update(deltaTime);
        draw();
    }

    requestAnimationFrame(gameLoop);
}

// Update game state
function update(deltaTime) {
    // Increase speed gradually
    game.speed = Math.min(game.speed + game.speedIncrement, game.maxSpeed);

    // Update score
    game.score += Math.floor(game.speed / 10);
    updateScore();

    // Move road
    road.offset += game.speed;
    if (road.offset >= road.stripeHeight + road.stripeGap) {
        road.offset = 0;
    }

    // Update road stripes
    road.stripes.forEach(stripe => {
        stripe.y += game.speed;
        if (stripe.y > canvas.height) {
            stripe.y = -road.stripeHeight;
        }
    });

    // Move player
    if (keys.left && player.x > 0) {
        player.x -= player.speed;
    }
    if (keys.right && player.x < canvas.width - player.width) {
        player.x += player.speed;
    }

    // Keep player in lanes
    player.x = Math.max(0, Math.min(player.x, canvas.width - player.width));

    // Spawn obstacles
    if (Math.random() < 0.02) {
        spawnObstacle();
    }

    // Spawn coins
    if (Math.random() < 0.015) {
        spawnCoin();
    }

    // Update obstacles
    obstacles.forEach((obstacle, index) => {
        obstacle.y += game.speed;

        // Remove off-screen obstacles
        if (obstacle.y > canvas.height) {
            obstacles.splice(index, 1);
        }

        // Check collision
        if (checkCollision(player, obstacle)) {
            gameOver();
        }
    });

    // Update coins
    coins.forEach((coin, index) => {
        coin.y += game.speed;
        coin.rotation += 0.1;

        // Remove off-screen coins
        if (coin.y > canvas.height) {
            coins.splice(index, 1);
        }

        // Check collection
        if (checkCollision(player, coin)) {
            collectCoin(coin);
            coins.splice(index, 1);
        }
    });

    // Update particles
    particles.forEach((particle, index) => {
        particle.y += particle.speedY;
        particle.x += particle.speedX;
        particle.life -= 1;
        particle.alpha = particle.life / 30;

        if (particle.life <= 0) {
            particles.splice(index, 1);
        }
    });
}

// Draw game
function draw() {
    // Clear canvas
    ctx.fillStyle = '#34495e';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw road
    ctx.fillStyle = '#2c3e50';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw lane dividers
    ctx.fillStyle = '#95a5a6';
    for (let i = 1; i < road.lanes; i++) {
        const x = i * road.laneWidth;
        road.stripes.forEach(stripe => {
            ctx.fillRect(x - 2, stripe.y, 4, road.stripeHeight);
        });
    }

    // Draw edge lines
    ctx.strokeStyle = '#f39c12';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(0, canvas.height);
    ctx.moveTo(canvas.width, 0);
    ctx.lineTo(canvas.width, canvas.height);
    ctx.stroke();

    // Draw obstacles
    obstacles.forEach(obstacle => {
        drawCar(obstacle);
    });

    // Draw coins
    coins.forEach(coin => {
        drawCoin(coin);
    });

    // Draw particles
    particles.forEach(particle => {
        ctx.globalAlpha = particle.alpha;
        ctx.fillStyle = particle.color;
        ctx.fillRect(particle.x, particle.y, particle.size, particle.size);
    });
    ctx.globalAlpha = 1;

    // Draw player
    drawCar(player);
}

// Draw car
function drawCar(car) {
    ctx.save();

    // Car body
    ctx.fillStyle = car.color;
    ctx.fillRect(car.x, car.y, car.width, car.height);

    // Car top (cockpit)
    ctx.fillStyle = '#000';
    ctx.fillRect(car.x + 5, car.y + 15, car.width - 10, 25);

    // Car windows
    ctx.fillStyle = '#4dd0e1';
    ctx.fillRect(car.x + 8, car.y + 18, car.width - 16, 8);

    // Wheels
    ctx.fillStyle = '#000';
    ctx.fillRect(car.x - 3, car.y + 10, 6, 15);
    ctx.fillRect(car.x + car.width - 3, car.y + 10, 6, 15);
    ctx.fillRect(car.x - 3, car.y + car.height - 25, 6, 15);
    ctx.fillRect(car.x + car.width - 3, car.y + car.height - 25, 6, 15);

    // Headlights/Taillights
    if (car === player) {
        ctx.fillStyle = '#ff4444';
        ctx.fillRect(car.x + 5, car.y + car.height - 5, 10, 5);
        ctx.fillRect(car.x + car.width - 15, car.y + car.height - 5, 10, 5);
    } else {
        ctx.fillStyle = '#ffeb3b';
        ctx.fillRect(car.x + 5, car.y, 10, 5);
        ctx.fillRect(car.x + car.width - 15, car.y, 10, 5);
    }

    ctx.restore();
}

// Draw coin
function drawCoin(coin) {
    ctx.save();
    ctx.translate(coin.x + coin.size / 2, coin.y + coin.size / 2);
    ctx.rotate(coin.rotation);

    // Coin body
    ctx.fillStyle = '#ffd700';
    ctx.beginPath();
    ctx.arc(0, 0, coin.size / 2, 0, Math.PI * 2);
    ctx.fill();

    // Coin shine
    ctx.fillStyle = '#ffeb3b';
    ctx.beginPath();
    ctx.arc(-3, -3, coin.size / 4, 0, Math.PI * 2);
    ctx.fill();

    // Coin border
    ctx.strokeStyle = '#ffa000';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, coin.size / 2, 0, Math.PI * 2);
    ctx.stroke();

    ctx.restore();
}

// Spawn obstacle
function spawnObstacle() {
    const lane = Math.floor(Math.random() * road.lanes);
    const colors = ['#e74c3c', '#3498db', '#2ecc71', '#9b59b6', '#f39c12'];

    obstacles.push({
        x: lane * road.laneWidth + road.laneWidth / 2 - player.width / 2,
        y: -player.height,
        width: player.width,
        height: player.height,
        color: colors[Math.floor(Math.random() * colors.length)]
    });
}

// Spawn coin
function spawnCoin() {
    const lane = Math.floor(Math.random() * road.lanes);

    coins.push({
        x: lane * road.laneWidth + road.laneWidth / 2 - 10,
        y: -20,
        size: 20,
        rotation: 0
    });
}

// Check collision
function checkCollision(rect1, rect2) {
    return rect1.x < rect2.x + rect2.width &&
           rect1.x + rect1.width > rect2.x &&
           rect1.y < rect2.y + rect2.height &&
           rect1.y + rect1.height > rect2.y;
}

// Collect coin
function collectCoin(coin) {
    game.score += 100;
    updateScore();

    // Create particles
    for (let i = 0; i < 10; i++) {
        particles.push({
            x: coin.x + coin.size / 2,
            y: coin.y + coin.size / 2,
            speedX: (Math.random() - 0.5) * 4,
            speedY: (Math.random() - 0.5) * 4,
            size: Math.random() * 4 + 2,
            color: '#ffd700',
            life: 30,
            alpha: 1
        });
    }

    playSound('coin');
}

// Game over
function gameOver() {
    game.running = false;
    game.paused = false;

    // Update best score
    if (game.score > game.bestScore) {
        game.bestScore = game.score;
        localStorage.setItem('binkRacingBest', game.bestScore);
        updateBestScore();
        document.getElementById('game-over-message').textContent = '🎉 NEW BEST SCORE! 🎉';
    } else {
        const messages = [
            'Nice try! Keep racing!',
            'Almost there! Try again!',
            'You can do better!',
            'Practice makes perfect!',
            'Speed demon in training!'
        ];
        document.getElementById('game-over-message').textContent = messages[Math.floor(Math.random() * messages.length)];
    }

    document.getElementById('final-score').textContent = game.score;
    document.getElementById('game-over').classList.remove('hidden');

    playSound('crash');
}

// Toggle pause
function togglePause() {
    if (!game.running) return;

    game.paused = !game.paused;

    if (game.paused) {
        document.getElementById('pause-menu').classList.remove('hidden');
    } else {
        document.getElementById('pause-menu').classList.add('hidden');
    }
}

// Update UI
function updateScore() {
    document.getElementById('score').textContent = game.score;
    document.getElementById('speed').textContent = Math.floor(game.speed * 10);
}

function updateBestScore() {
    document.getElementById('best').textContent = game.bestScore;
}

// Sound effects (simple beep using Web Audio API)
const audioContext = new (window.AudioContext || window.webkitAudioContext)();

function playSound(type) {
    if (!game.soundEnabled) return;

    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    switch(type) {
        case 'coin':
            oscillator.frequency.value = 800;
            oscillator.type = 'sine';
            gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.1);
            break;
        case 'crash':
            oscillator.frequency.value = 100;
            oscillator.type = 'sawtooth';
            gainNode.gain.setValueAtTime(0.5, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.3);
            break;
    }
}

// Event listeners
document.getElementById('start-btn').addEventListener('click', startGame);
document.getElementById('restart-btn').addEventListener('click', startGame);
document.getElementById('resume-btn').addEventListener('click', togglePause);
document.getElementById('quit-btn').addEventListener('click', () => {
    game.running = false;
    game.paused = false;
    document.getElementById('pause-menu').classList.add('hidden');
    document.getElementById('start-menu').classList.remove('hidden');
});

document.getElementById('sound-btn').addEventListener('click', () => {
    game.soundEnabled = !game.soundEnabled;
    const btn = document.getElementById('sound-btn');
    btn.textContent = game.soundEnabled ? '🔊' : '🔇';
    btn.classList.toggle('muted');
});

// Keyboard input
document.addEventListener('keydown', (e) => {
    switch(e.key) {
        case 'ArrowLeft':
        case 'a':
        case 'A':
            keys.left = true;
            e.preventDefault();
            break;
        case 'ArrowRight':
        case 'd':
        case 'D':
            keys.right = true;
            e.preventDefault();
            break;
        case 'p':
        case 'P':
            if (!keys.pause) {
                keys.pause = true;
                togglePause();
            }
            e.preventDefault();
            break;
        case 'Escape':
            if (game.running && !game.paused) {
                togglePause();
            }
            e.preventDefault();
            break;
    }
});

document.addEventListener('keyup', (e) => {
    switch(e.key) {
        case 'ArrowLeft':
        case 'a':
        case 'A':
            keys.left = false;
            break;
        case 'ArrowRight':
        case 'd':
        case 'D':
            keys.right = false;
            break;
        case 'p':
        case 'P':
            keys.pause = false;
            break;
    }
});

// Initialize on load
init();
