import * as THREE from 'three';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';

gsap.registerPlugin(ScrollTrigger);

const canvas = document.querySelector('#webgl');
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const coarsePointer = window.matchMedia('(pointer: coarse)').matches;

let renderer;
let scene;
let camera;
let world;
let cardGroup;
let core;
let particles;
let lenis;
let clock;
let animationFrame;
let currentScrollTimeline;
let disposed = false;
const mouse = new THREE.Vector2();
const mouseTarget = new THREE.Vector2();
const cards = [];

const PALETTE = ['#d7ff3f', '#f2f0e9', '#ff623f', '#c2b6ff', '#61d6ff'];

function makeCardTexture(index) {
  const c = document.createElement('canvas');
  c.width = 1024;
  c.height = 640;
  const ctx = c.getContext('2d');
  const bg = index % 2 === 0 ? '#eceae3' : '#111111';
  const fg = index % 2 === 0 ? '#0b0b0b' : '#f3f1ea';
  const accent = PALETTE[index % PALETTE.length];

  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, c.width, c.height);

  // Large graphic blocks — deliberately original placeholder artwork.
  ctx.fillStyle = accent;
  const blockW = 220 + index * 25;
  ctx.fillRect(72, 70, blockW, 500);

  ctx.save();
  ctx.translate(560, 320);
  ctx.rotate(-0.14 + index * 0.045);
  ctx.strokeStyle = fg;
  ctx.lineWidth = 4;
  for (let i = 0; i < 12; i += 1) {
    const s = 50 + i * 22;
    ctx.strokeRect(-s, -s, s * 2, s * 2);
  }
  ctx.restore();

  ctx.fillStyle = fg;
  ctx.font = '700 68px Arial';
  ctx.letterSpacing = '-2px';
  ctx.fillText(`PROJECT 0${index + 1}`, 355, 545);
  ctx.font = '20px Arial';
  ctx.fillText(['IDENTITY / TYPE', 'SPATIAL / CGI', 'MOTION / IMAGE', 'OBJECT / FORM', 'CAMPAIGN / SIGNAL'][index], 358, 584);
  ctx.fillText('YOUR WORK HERE', 72, 42);

  const texture = new THREE.CanvasTexture(c);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

function createCard(index) {
  const geo = new THREE.PlaneGeometry(3.25, 2.03, 24, 16);
  const material = new THREE.ShaderMaterial({
    uniforms: {
      uTexture: { value: makeCardTexture(index) },
      uTime: { value: 0 },
      uHover: { value: 0 },
    },
    vertexShader: `
      uniform float uTime;
      uniform float uHover;
      varying vec2 vUv;
      void main() {
        vUv = uv;
        vec3 p = position;
        float wave = sin((p.x * 2.1) + uTime * 0.7) * 0.035;
        wave += cos((p.y * 3.1) - uTime * 0.45) * 0.022;
        p.z += wave * (0.3 + uHover);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
      }
    `,
    fragmentShader: `
      uniform sampler2D uTexture;
      uniform float uHover;
      varying vec2 vUv;
      void main() {
        vec2 uv = vUv;
        float shift = sin((uv.y * 18.0) + uHover * 4.0) * 0.0025 * uHover;
        vec4 r = texture2D(uTexture, uv + vec2(shift, 0.0));
        vec4 g = texture2D(uTexture, uv);
        vec4 b = texture2D(uTexture, uv - vec2(shift, 0.0));
        gl_FragColor = vec4(r.r, g.g, b.b, 1.0);
      }
    `,
    side: THREE.DoubleSide,
  });

  const mesh = new THREE.Mesh(geo, material);
  const a = index * 1.27;
  const radius = 3.7 + (index % 2) * 1.2;
  mesh.position.set(Math.cos(a) * radius, (index - 2) * 1.55, -index * 3.0);
  mesh.rotation.set(0.08 * (index - 2), a + Math.PI * 0.5, index % 2 ? -0.08 : 0.08);
  mesh.userData.baseRotation = mesh.rotation.clone();
  mesh.userData.phase = index * 0.82;
  cards.push(mesh);
  return mesh;
}

function initThree() {
  if (!canvas || renderer) return;
  renderer = new THREE.WebGLRenderer({ canvas, antialias: !coarsePointer, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, coarsePointer ? 1.5 : 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;

  scene = new THREE.Scene();
  scene.background = new THREE.Color('#070707');
  scene.fog = new THREE.FogExp2('#070707', 0.045);

  camera = new THREE.PerspectiveCamera(38, window.innerWidth / window.innerHeight, 0.1, 80);
  camera.position.set(0, 0, 8.2);

  world = new THREE.Group();
  scene.add(world);

  cardGroup = new THREE.Group();
  for (let i = 0; i < 5; i += 1) cardGroup.add(createCard(i));
  world.add(cardGroup);

  const coreGeo = new THREE.IcosahedronGeometry(1.7, coarsePointer ? 2 : 4);
  const coreMat = new THREE.ShaderMaterial({
    wireframe: true,
    transparent: true,
    uniforms: {
      uTime: { value: 0 },
      uMouse: { value: new THREE.Vector2() },
    },
    vertexShader: `
      uniform float uTime;
      uniform vec2 uMouse;
      varying float vPulse;
      void main() {
        vec3 p = position;
        float n = sin(p.x * 3.2 + uTime) * cos(p.y * 2.7 - uTime * .7);
        p += normal * n * .12;
        p.x += uMouse.x * .15 * (1.0 + p.z);
        p.y += uMouse.y * .12;
        vPulse = n;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
      }
    `,
    fragmentShader: `
      varying float vPulse;
      void main() {
        float a = .30 + abs(vPulse) * .34;
        gl_FragColor = vec4(vec3(.94), a);
      }
    `,
  });
  core = new THREE.Mesh(coreGeo, coreMat);
  core.position.set(0, 0, 1.2);
  world.add(core);

  const count = coarsePointer ? 650 : 1400;
  const positions = new Float32Array(count * 3);
  for (let i = 0; i < count; i += 1) {
    const r = 6 + Math.random() * 24;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
    positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
    positions[i * 3 + 2] = r * Math.cos(phi) - 8;
  }
  const particleGeo = new THREE.BufferGeometry();
  particleGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const particleMat = new THREE.PointsMaterial({ color: '#9d9a91', size: coarsePointer ? 0.018 : 0.024, transparent: true, opacity: 0.46 });
  particles = new THREE.Points(particleGeo, particleMat);
  world.add(particles);

  clock = new THREE.Clock();
}

function initLenis() {
  if (lenis || reducedMotion) return;
  lenis = new Lenis({
    smoothWheel: true,
    anchors: true,
    duration: 1.08,
    wheelMultiplier: 0.9,
  });
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add((time) => lenis?.raf(time * 1000));
  gsap.ticker.lagSmoothing(0);
}

function bindScrollScene() {
  if (!camera || !document.querySelector('[data-scene-root]')) return;
  currentScrollTimeline?.scrollTrigger?.kill();
  currentScrollTimeline?.kill();
  ScrollTrigger.getAll().forEach((trigger) => trigger.kill());

  const root = document.querySelector('[data-scene-root]');
  currentScrollTimeline = gsap.timeline({
    defaults: { ease: 'none' },
    scrollTrigger: {
      trigger: root,
      start: 'top top',
      end: 'bottom bottom',
      scrub: reducedMotion ? false : 1.1,
      invalidateOnRefresh: true,
    },
  });

  currentScrollTimeline
    .to(camera.position, { z: 5.7, x: -0.7, y: 0.45 }, 0.05)
    .to(cardGroup.rotation, { y: -0.8, z: 0.08 }, 0.05)
    .to(camera.position, { z: 2.6, x: 0.9, y: 1.2 }, 0.27)
    .to(cardGroup.rotation, { y: -2.4, x: 0.18 }, 0.27)
    .to(camera.position, { z: -1.1, x: -1.4, y: -0.45 }, 0.52)
    .to(cardGroup.rotation, { y: -4.25, z: -0.16 }, 0.52)
    .to(camera.position, { z: -5.2, x: 0.6, y: 0.2 }, 0.78)
    .to(cardGroup.rotation, { y: -6.0, x: -0.12 }, 0.78);

  document.querySelectorAll('.scene-title').forEach((title) => {
    gsap.fromTo(title,
      { opacity: 0, y: 70 },
      {
        opacity: 1,
        y: 0,
        duration: 1,
        ease: 'power3.out',
        scrollTrigger: { trigger: title, start: 'top 85%', end: 'top 52%', scrub: reducedMotion ? false : 1 },
      },
    );
  });

  ScrollTrigger.refresh();
}

function animate() {
  if (disposed || !renderer) return;
  const elapsed = clock.getElapsedTime();
  mouse.lerp(mouseTarget, 0.055);

  core.material.uniforms.uTime.value = elapsed;
  core.material.uniforms.uMouse.value.copy(mouse);
  core.rotation.x = elapsed * 0.09 + mouse.y * 0.2;
  core.rotation.y = elapsed * 0.13 + mouse.x * 0.25;

  cards.forEach((card, i) => {
    card.material.uniforms.uTime.value = elapsed + card.userData.phase;
    card.material.uniforms.uHover.value = Math.min(1, Math.abs(mouse.x) * 0.35 + Math.abs(mouse.y) * 0.25);
    card.position.y += Math.sin(elapsed * 0.55 + i * 1.2) * 0.0008;
  });

  particles.rotation.y = elapsed * 0.008;
  world.rotation.y += ((mouse.x * 0.09) - world.rotation.y) * 0.025;
  world.rotation.x += ((-mouse.y * 0.04) - world.rotation.x) * 0.025;

  renderer.render(scene, camera);
  animationFrame = requestAnimationFrame(animate);
}

function onResize() {
  if (!renderer || !camera) return;
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, coarsePointer ? 1.5 : 2));
  ScrollTrigger.refresh();
}

function onPointerMove(event) {
  mouseTarget.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouseTarget.y = -((event.clientY / window.innerHeight) * 2 - 1);
  const dot = document.querySelector('.cursor-dot');
  if (dot) gsap.set(dot, { x: event.clientX, y: event.clientY });
}

function init() {
  initThree();
  initLenis();
  bindScrollScene();
  if (!animationFrame) animate();
}

window.addEventListener('resize', onResize, { passive: true });
window.addEventListener('pointermove', onPointerMove, { passive: true });

document.addEventListener('swup:enable', () => {
  if (window.swup) {
    window.swup.hooks.on('page:view', () => {
      requestAnimationFrame(() => {
        window.scrollTo(0, 0);
        bindScrollScene();
      });
    });
  }
});

init();
