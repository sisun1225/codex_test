const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const scoreEl = document.getElementById("score");
const bestScoreEl = document.getElementById("bestScore");
const timeEl = document.getElementById("time");
const overlay = document.getElementById("overlay");
const messageEl = document.getElementById("message");
const startButton = document.getElementById("startButton");

const leftButton = document.getElementById("leftButton");
const rightButton = document.getElementById("rightButton");

const WORLD = {
  width: canvas.width,
  height: canvas.height,
};

const PLAYER = {
  width: 44,
  height: 26,
  speed: 290,
};

const player = {
  x: WORLD.width / 2 - PLAYER.width / 2,
  y: WORLD.height - PLAYER.height - 14,
  vx: 0,
};

const keys = {
  left: false,
  right: false,
};

let bombs = [];
let gameRunning = false;
let score = 0;
let bestScore = Number(localStorage.getItem("bomb-best-score") || 0);
let survivedSeconds = 0;
let spawnCooldown = 0;
let previousTime = 0;
let animationId = 0;

bestScoreEl.textContent = bestScore;

function resetGame() {
  bombs = [];
  score = 0;
  survivedSeconds = 0;
  spawnCooldown = 0;
  player.x = WORLD.width / 2 - PLAYER.width / 2;
  player.vx = 0;
  updateHud();
}

function updateHud() {
  scoreEl.textContent = score;
  timeEl.textContent = survivedSeconds.toFixed(1);
  bestScoreEl.textContent = bestScore;
}

function spawnBomb() {
  const radius = 10 + Math.random() * 12;
  const speed = 100 + Math.random() * 120 + survivedSeconds * 9;
  bombs.push({
    x: radius + Math.random() * (WORLD.width - radius * 2),
    y: -radius,
    radius,
    speed,
    pulse: Math.random() * Math.PI * 2,
  });
}

function update(dt) {
  player.vx = 0;
  if (keys.left) player.vx -= PLAYER.speed;
  if (keys.right) player.vx += PLAYER.speed;

  player.x += player.vx * dt;
  player.x = Math.max(0, Math.min(WORLD.width - PLAYER.width, player.x));

  survivedSeconds += dt;
  score = Math.floor(survivedSeconds * 12);

  spawnCooldown -= dt;
  if (spawnCooldown <= 0) {
    spawnBomb();
    const difficultyScale = Math.max(0.19, 0.8 - survivedSeconds * 0.018);
    spawnCooldown = difficultyScale;
  }

  bombs.forEach((bomb) => {
    bomb.y += bomb.speed * dt;
    bomb.pulse += dt * 8;
  });

  bombs = bombs.filter((bomb) => bomb.y - bomb.radius <= WORLD.height + 10);

  checkCollision();
  updateHud();
}

function checkCollision() {
  const playerCenterX = player.x + PLAYER.width / 2;
  const playerCenterY = player.y + PLAYER.height / 2;

  for (const bomb of bombs) {
    const dx = Math.max(Math.abs(bomb.x - playerCenterX) - PLAYER.width / 2, 0);
    const dy = Math.max(Math.abs(bomb.y - playerCenterY) - PLAYER.height / 2, 0);
    if (dx * dx + dy * dy <= bomb.radius * bomb.radius) {
      endGame();
      return;
    }
  }
}

function drawBackgroundGrid() {
  ctx.save();
  ctx.strokeStyle = "rgba(255,255,255,0.06)";
  ctx.lineWidth = 1;

  const step = 28;
  for (let x = 0; x <= WORLD.width; x += step) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, WORLD.height);
    ctx.stroke();
  }

  for (let y = 0; y <= WORLD.height; y += step) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(WORLD.width, y);
    ctx.stroke();
  }
  ctx.restore();
}

function drawPlayer() {
  ctx.save();
  ctx.translate(player.x, player.y);

  ctx.fillStyle = "#67d2ff";
  ctx.fillRect(0, 8, PLAYER.width, PLAYER.height - 8);

  ctx.fillStyle = "#a5ebff";
  ctx.beginPath();
  ctx.moveTo(0, 8);
  ctx.lineTo(PLAYER.width / 2, 0);
  ctx.lineTo(PLAYER.width, 8);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = "#0e2430";
  ctx.fillRect(PLAYER.width * 0.18, 14, 8, 8);
  ctx.fillRect(PLAYER.width * 0.64, 14, 8, 8);

  ctx.restore();
}

function drawBomb(bomb) {
  const glow = 0.5 + (Math.sin(bomb.pulse) + 1) * 0.35;

  ctx.save();
  ctx.translate(bomb.x, bomb.y);

  ctx.shadowBlur = 16 * glow;
  ctx.shadowColor = "rgba(255, 68, 68, 0.95)";

  ctx.fillStyle = "#262833";
  ctx.beginPath();
  ctx.arc(0, 0, bomb.radius, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#ff5d5d";
  ctx.beginPath();
  ctx.arc(-bomb.radius * 0.34, -bomb.radius * 0.26, bomb.radius * 0.25, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = "#f4b140";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, -bomb.radius + 2);
  ctx.quadraticCurveTo(5, -bomb.radius - 8, 8, -bomb.radius - 12);
  ctx.stroke();

  ctx.restore();
}

function draw() {
  ctx.clearRect(0, 0, WORLD.width, WORLD.height);
  drawBackgroundGrid();
  bombs.forEach(drawBomb);
  drawPlayer();
}

function frame(timestamp) {
  if (!gameRunning) return;

  const dt = Math.min((timestamp - previousTime) / 1000, 0.033);
  previousTime = timestamp;

  update(dt);
  draw();

  animationId = requestAnimationFrame(frame);
}

function startGame() {
  resetGame();
  overlay.classList.remove("visible");
  gameRunning = true;
  previousTime = performance.now();
  animationId = requestAnimationFrame(frame);
}

function endGame() {
  gameRunning = false;
  cancelAnimationFrame(animationId);

  if (score > bestScore) {
    bestScore = score;
    localStorage.setItem("bomb-best-score", String(bestScore));
  }

  messageEl.textContent = `게임 오버! 점수 ${score}점 (생존 ${survivedSeconds.toFixed(1)}초)`;
  startButton.textContent = "다시 시작";
  overlay.classList.add("visible");
  updateHud();
}

function setMoveState(direction, isPressed) {
  keys[direction] = isPressed;
}

window.addEventListener("keydown", (event) => {
  if (["ArrowLeft", "a", "A"].includes(event.key)) {
    keys.left = true;
  }
  if (["ArrowRight", "d", "D"].includes(event.key)) {
    keys.right = true;
  }
});

window.addEventListener("keyup", (event) => {
  if (["ArrowLeft", "a", "A"].includes(event.key)) {
    keys.left = false;
  }
  if (["ArrowRight", "d", "D"].includes(event.key)) {
    keys.right = false;
  }
});

startButton.addEventListener("click", () => {
  startButton.textContent = "게임 시작";
  messageEl.textContent = "행운을 빕니다!";
  startGame();
});

for (const [button, direction] of [
  [leftButton, "left"],
  [rightButton, "right"],
]) {
  button.addEventListener("pointerdown", () => setMoveState(direction, true));
  button.addEventListener("pointerup", () => setMoveState(direction, false));
  button.addEventListener("pointerleave", () => setMoveState(direction, false));
  button.addEventListener("pointercancel", () => setMoveState(direction, false));
}

draw();
