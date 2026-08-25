import * as THREE from 'three';

export const keys = {};
export let mouseAimAngle = 0;

const raycaster = new THREE.Raycaster();
const aimPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -1.2);

export function isMoveKeyDown() {
  return !!(keys['KeyW'] || keys['KeyA'] || keys['KeyS'] || keys['KeyD'] ||
    keys['ArrowUp'] || keys['ArrowDown'] || keys['ArrowLeft'] || keys['ArrowRight']);
}

export function getMoveVector() {
  let mx = 0, mz = 0;
  if (keys['KeyW'] || keys['ArrowUp']) mz -= 1;
  if (keys['KeyS'] || keys['ArrowDown']) mz += 1;
  if (keys['KeyA'] || keys['ArrowLeft']) mx -= 1;
  if (keys['KeyD'] || keys['ArrowRight']) mx += 1;
  const len = Math.hypot(mx, mz);
  if (len > 0) { mx /= len; mz /= len; }
  return { mx, mz, moving: len > 0 };
}

function updateAimFromScreen(clientX, clientY, camera, canvas, playerPos) {
  if (!playerPos) return;
  const rect = canvas.getBoundingClientRect();
  const ndcX = ((clientX - rect.left) / rect.width) * 2 - 1;
  const ndcY = -((clientY - rect.top) / rect.height) * 2 + 1;
  raycaster.setFromCamera(new THREE.Vector2(ndcX, ndcY), camera);
  const hit = new THREE.Vector3();
  raycaster.ray.intersectPlane(aimPlane, hit);
  if (hit) {
    const dx = hit.x - playerPos.x;
    const dz = hit.z - playerPos.z;
    mouseAimAngle = Math.atan2(dx, dz);
  }
}

/**
 * Wires up keyboard/mouse/touch listeners.
 * `getPlayerPos()` should return the current player Object3D position (or null before load).
 * `onHit()` is called on click / space / tap.
 */
export function setupInput(canvas, camera, getPlayerPos, onHit) {
  window.addEventListener('keydown', (e) => {
    keys[e.code] = true;
    if (e.code === 'Space') { e.preventDefault(); onHit(); }
  });
  window.addEventListener('keyup', (e) => { keys[e.code] = false; });

  window.addEventListener('mousemove', (e) => updateAimFromScreen(e.clientX, e.clientY, camera, canvas, getPlayerPos()));
  window.addEventListener('click', () => onHit());

  window.addEventListener('touchstart', (e) => {
    const t = e.touches[0];
    updateAimFromScreen(t.clientX, t.clientY, camera, canvas, getPlayerPos());
    onHit();
  }, { passive: true });
}
