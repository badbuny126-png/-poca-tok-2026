import * as THREE from 'three';
import { createCourt, addLighting, COURT_WIDTH, COURT_LENGTH, RING_HEIGHT, RING_RADIUS } from './court.js';
import { loadCharacters, animateCharacter } from './characters.js';
import { createBall, BallState } from './ball.js';
import { setupInput, isMoveKeyDown, getMoveVector } from './input.js';
import * as InputModule from './input.js';

// ---------- WebGL support check ----------
function hasWebGL() {
  try {
    const c = document.createElement('canvas');
    return !!(window.WebGLRenderingContext && (c.getContext('webgl') || c.getContext('experimental-webgl')));
  } catch (e) {
    return false;
  }
}
if (!hasWebGL()) {
  document.getElementById('webgl-error').style.display = 'flex';
  throw new Error('No WebGL');
}

// ---------- Renderer / Scene / Camera ----------
const canvas = document.getElementById('game-canvas');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x1a1006);
scene.fog = new THREE.Fog(0x1a1006, 30, 90);

const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 200);

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

addLighting(scene);
const { ringMesh, ringWorldPos } = createCourt(scene);
const ballMesh = createBall(scene);
const ballState = new BallState();

// ---------- Loading manager ----------
const manager = new THREE.LoadingManager();
manager.onProgress = (url, loaded, total) => {
  const bar = document.getElementById('loadbar');
  if (bar) bar.style.width = Math.round((loaded / total) * 100) + '%';
};
manager.onLoad = () => {
  const loading = document.getElementById('loading');
  if (loading) loading.style.display = 'none';
};

let playerChar = null, aiChar = null, playerBones = {}, aiBones = {};
loadCharacters(scene, manager, '/models/player.glb').then((res) => {
  playerChar = res.playerChar;
  aiChar = res.aiChar;
  playerBones = res.playerBones;
  aiBones = res.aiBones;
});

// ---------- Aim indicator ----------
const aimIndicator = new THREE.Mesh(
  new THREE.ConeGeometry(0.18, 0.6, 8),
  new THREE.MeshStandardMaterial({ color: 0xe8a33d, emissive: 0x552200, emissiveIntensity: 0.5 })
);
aimIndicator.rotation.x = Math.PI / 2;
scene.add(aimIndicator);

// ---------- Game state ----------
let scorePlayer = 0, scoreAI = 0;
const TARGET_SCORE = 3;
let gameOver = false;
let playerHitCooldown = 0;
let aiHitCooldown = 0;
let aiSwingTimer = 0;
let playerSwingTimer = 0;

const HIT_RANGE = 1.7;
const HIT_UPWARD_MIN = 6.5;
const HIT_UPWARD_MAX = 9.5;
const HIT_FORWARD_SPEED = 7.5;
const PLAYER_SPEED = 6.5;
const AI_SPEED = 4.2;

function applyHit(fromPos, angle) {
  const dirX = Math.sin(angle);
  const dirZ = Math.cos(angle);
  const toRing = new THREE.Vector3().subVectors(ringWorldPos, fromPos).normalize();
  const aimDir = new THREE.Vector3(dirX, 0, dirZ).normalize();
  const blended = aimDir.multiplyScalar(0.7).add(toRing.multiplyScalar(0.3)).normalize();

  ballState.vel.x = blended.x * HIT_FORWARD_SPEED;
  ballState.vel.z = blended.z * HIT_FORWARD_SPEED;
  ballState.vel.y = HIT_UPWARD_MIN + Math.random() * (HIT_UPWARD_MAX - HIT_UPWARD_MIN);
  ballState.heldCooldown = 0.25;
}

function tryPlayerHit() {
  if (gameOver || !playerChar || playerHitCooldown > 0) return;
  const dist = ballState.pos.distanceTo(playerChar.position);
  if (dist > HIT_RANGE) return;
  applyHit(playerChar.position, currentAimAngle);
  playerHitCooldown = 0.45;
  playerSwingTimer = 0.3;
}

// input.js exports a live `mouseAimAngle` binding; we read it each frame
// via the namespace import above rather than destructuring a stale copy.
let currentAimAngle = 0;

setupInput(canvas, camera, () => (playerChar ? playerChar.position : null), tryPlayerHit);

function registerScore() {
  if (!playerChar || !aiChar) return;
  const dPlayer = playerChar.position.distanceTo(ballState.pos);
  const dAI = aiChar.position.distanceTo(ballState.pos);
  if (dPlayer < dAI) scorePlayer++; else scoreAI++;

  const spEl = document.getElementById('score-player');
  const saEl = document.getElementById('score-ai');
  if (spEl) spEl.textContent = scorePlayer;
  if (saEl) saEl.textContent = scoreAI;

  ballState.heldCooldown = 1.5;
  ballState.reset();

  if (scorePlayer >= TARGET_SCORE || scoreAI >= TARGET_SCORE) {
    endGame(scorePlayer > scoreAI);
  }
}

function endGame(playerWon) {
  gameOver = true;
  const el = document.getElementById('endscreen');
  const title = document.getElementById('end-title');
  const sub = document.getElementById('end-sub');
  if (title) title.textContent = playerWon ? 'VICTORY' : 'THE RIVAL WINS';
  if (sub) sub.textContent = playerWon
    ? 'You carried the sun through the stone ring.'
    : 'The rival claimed the sacred court this time.';
  if (el) el.style.display = 'flex';
}

const restartBtn = document.getElementById('restart-btn');
if (restartBtn) {
  restartBtn.addEventListener('click', () => {
    scorePlayer = 0; scoreAI = 0;
    document.getElementById('score-player').textContent = 0;
    document.getElementById('score-ai').textContent = 0;
    gameOver = false;
    document.getElementById('endscreen').style.display = 'none';
    ballState.reset();
    if (playerChar) playerChar.position.set(-3, 0, -8);
    if (aiChar) aiChar.position.set(3, 0, 8);
  });
}

function updatePlayer(dt) {
  if (!playerChar || gameOver) return;
  const { mx, mz, moving } = getMoveVector();
  if (moving) {
    playerChar.position.x += mx * PLAYER_SPEED * dt;
    playerChar.position.z += mz * PLAYER_SPEED * dt;
    playerChar.position.x = THREE.MathUtils.clamp(playerChar.position.x, -COURT_WIDTH / 2 + 1.2, COURT_WIDTH / 2 - 1.2);
    playerChar.position.z = THREE.MathUtils.clamp(playerChar.position.z, -COURT_LENGTH / 2 + 1.5, COURT_LENGTH / 2 - 1.5);
    const moveAngle = Math.atan2(mx, mz);
    playerChar.rotation.y = THREE.MathUtils.lerp(playerChar.rotation.y, moveAngle, 0.25);
  }
  playerHitCooldown = Math.max(0, playerHitCooldown - dt);
}

function updateAI(dt) {
  if (!aiChar || gameOver) return;
  aiHitCooldown = Math.max(0, aiHitCooldown - dt);

  const toBall = new THREE.Vector3().subVectors(ballState.pos, aiChar.position);
  toBall.y = 0;
  const dist = toBall.length();

  if (dist > HIT_RANGE * 0.9) {
    toBall.normalize();
    aiChar.position.x += toBall.x * AI_SPEED * dt;
    aiChar.position.z += toBall.z * AI_SPEED * dt;
    aiChar.position.x = THREE.MathUtils.clamp(aiChar.position.x, -COURT_WIDTH / 2 + 1.2, COURT_WIDTH / 2 - 1.2);
    aiChar.position.z = THREE.MathUtils.clamp(aiChar.position.z, -COURT_LENGTH / 2 + 1.5, COURT_LENGTH / 2 - 1.5);
    aiChar.rotation.y = Math.atan2(toBall.x, toBall.z);
  } else if (aiHitCooldown <= 0 && ballState.pos.y < 3.2) {
    const angle = Math.atan2(aiChar.position.x - ringWorldPos.x, aiChar.position.z - ringWorldPos.z) + Math.PI;
    const jitter = (Math.random() - 0.5) * 0.4;
    applyHit(aiChar.position, angle + jitter);
    aiHitCooldown = 0.7 + Math.random() * 0.5;
    aiSwingTimer = 0.3;
  }
}

function updateAimIndicator() {
  if (!playerChar) return;
  currentAimAngle = InputModule.mouseAimAngle;
  const r = 1.3;
  aimIndicator.position.set(
    playerChar.position.x + Math.sin(currentAimAngle) * r,
    1.1,
    playerChar.position.z + Math.cos(currentAimAngle) * r
  );
  aimIndicator.rotation.y = currentAimAngle;
}

const camOffset = new THREE.Vector3(0, 7, 11);
function updateCamera(dt) {
  if (!playerChar) return;
  const desired = new THREE.Vector3().copy(playerChar.position).add(camOffset);
  camera.position.lerp(desired, 1 - Math.pow(0.001, dt));
  const lookTarget = new THREE.Vector3().copy(playerChar.position).add(new THREE.Vector3(0, 1.4, 0));
  camera.lookAt(lookTarget);
}

// ---------- Main loop ----------
const clock = new THREE.Clock();
let animTime = 0;

function tick() {
  requestAnimationFrame(tick);
  const dt = Math.min(clock.getDelta(), 0.05);
  animTime += dt;

  updatePlayer(dt);
  updateAI(dt);

  const scored = ballState.update(dt, ringWorldPos);
  ballMesh.position.copy(ballState.pos);
  if (scored) registerScore();

  updateCamera(dt);
  updateAimIndicator();

  if (playerSwingTimer > 0) playerSwingTimer -= dt;
  if (aiSwingTimer > 0) aiSwingTimer -= dt;

  animateCharacter(playerBones, isMoveKeyDown(), playerSwingTimer, dt, animTime);
  animateCharacter(aiBones, true, aiSwingTimer, dt, animTime);

  ringMesh.rotation.z += dt * 0.2;

  renderer.render(scene, camera);
}
tick();
