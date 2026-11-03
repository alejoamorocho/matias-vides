import * as THREE from 'three';
import { EffectComposer, RenderPass, EffectPass, BloomEffect, NoiseEffect, VignetteEffect, BlendFunction } from 'postprocessing';

// Medidas reglamentarias (m) escaladas: 68 x 105 -> 6.8 x 10.5
const S = 0.1;
const HW = 34 * S;
const HL = 52.5 * S;

const CHALK = new THREE.Color('#eef2f6');
const GOLD = new THREE.Color('#dcc39d');

function sampleLine(out, a, b, step) {
  const n = Math.max(2, Math.ceil(a.distanceTo(b) / step));
  for (let i = 0; i <= n; i++) out.push(a.clone().lerp(b, i / n));
}

function sampleArc(out, cx, cz, r, from, to, step) {
  const n = Math.max(4, Math.ceil((Math.abs(to - from) * r) / step));
  for (let i = 0; i <= n; i++) {
    const t = from + ((to - from) * i) / n;
    out.push(new THREE.Vector3(cx + Math.cos(t) * r, 0, cz + Math.sin(t) * r));
  }
}

function rect(out, x0, z0, x1, z1, step) {
  const v = (x, z) => new THREE.Vector3(x, 0, z);
  sampleLine(out, v(x0, z0), v(x1, z0), step);
  sampleLine(out, v(x1, z0), v(x1, z1), step);
  sampleLine(out, v(x1, z1), v(x0, z1), step);
  sampleLine(out, v(x0, z1), v(x0, z0), step);
}

function pitchMarkings(step = 0.022) {
  const p = [];
  rect(p, -HW, -HL, HW, HL, step);
  sampleLine(p, new THREE.Vector3(-HW, 0, 0), new THREE.Vector3(HW, 0, 0), step);
  sampleArc(p, 0, 0, 9.15 * S, 0, Math.PI * 2, step);
  for (const side of [-1, 1]) {
    const g = side * HL;
    // área grande y área chica
    rect(p, -20.16 * S, g, 20.16 * S, g - side * 16.5 * S, step);
    rect(p, -9.16 * S, g, 9.16 * S, g - side * 5.5 * S, step);
    // semicírculo del área
    const spot = g - side * 11 * S;
    const a = Math.acos((16.5 - 11) / 9.15);
    const base = side < 0 ? Math.PI / 2 : -Math.PI / 2;
    sampleArc(p, 0, spot, 9.15 * S, base - a, base + a, step);
    // punto penal
    for (let i = 0; i < 6; i++) p.push(new THREE.Vector3((Math.random() - 0.5) * 0.04, 0, spot + (Math.random() - 0.5) * 0.04));
    // arcos de esquina
    for (const cx of [-HW, HW]) {
      const start = cx < 0 ? (side < 0 ? 0 : -Math.PI / 2) : side < 0 ? Math.PI / 2 : Math.PI;
      sampleArc(p, cx, g, 1 * S, start, start + Math.PI / 2, step);
    }
  }
  return p;
}

const pointsVert = /* glsl */ `
  attribute float aOrder;
  attribute float aSeed;
  attribute float aSize;
  uniform float uReveal;
  uniform float uTime;
  uniform float uPixel;
  varying float vAlpha;
  void main() {
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    float on = smoothstep(aOrder - 0.06, aOrder, uReveal);
    float tw = 0.75 + 0.25 * sin(uTime * 1.6 + aSeed * 40.0);
    vAlpha = on * tw;
    gl_PointSize = aSize * uPixel * (7.0 / -mv.z);
    gl_Position = projectionMatrix * mv;
  }
`;

const pointsFrag = /* glsl */ `
  uniform vec3 uColor;
  uniform float uOpacity;
  varying float vAlpha;
  void main() {
    vec2 c = gl_PointCoord - 0.5;
    float d = length(c);
    float a = smoothstep(0.5, 0.0, d);
    gl_FragColor = vec4(uColor, a * vAlpha * uOpacity);
  }
`;

function makePoints(list, { color, size, opacity, orderFn }) {
  const n = list.length;
  const pos = new Float32Array(n * 3);
  const order = new Float32Array(n);
  const seed = new Float32Array(n);
  const sizes = new Float32Array(n);
  list.forEach((v, i) => {
    pos[i * 3] = v.x + (Math.random() - 0.5) * 0.012;
    pos[i * 3 + 1] = v.y;
    pos[i * 3 + 2] = v.z + (Math.random() - 0.5) * 0.012;
    order[i] = orderFn(v);
    seed[i] = Math.random();
    sizes[i] = size * (0.7 + Math.random() * 0.6);
  });
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('aOrder', new THREE.BufferAttribute(order, 1));
  geo.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1));
  geo.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
  const mat = new THREE.ShaderMaterial({
    vertexShader: pointsVert,
    fragmentShader: pointsFrag,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: {
      uReveal: { value: 0 },
      uTime: { value: 0 },
      uPixel: { value: 1 },
      uColor: { value: color },
      uOpacity: { value: opacity },
    },
  });
  return new THREE.Points(geo, mat);
}

const trailVert = /* glsl */ `
  varying float vU;
  void main() {
    vU = uv.x;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;
const trailFrag = /* glsl */ `
  uniform float uHead;
  uniform float uFade;
  uniform vec3 uColor;
  varying float vU;
  void main() {
    if (vU > uHead) discard;
    float tail = smoothstep(uHead - 0.75, uHead, vU);
    float head = smoothstep(uHead - 0.025, uHead, vU);
    vec3 col = mix(uColor, vec3(1.0), head * 0.35);
    gl_FragColor = vec4(col * (0.9 + head * 1.6), (0.25 + 0.75 * tail) * uFade);
  }
`;

function makeTrail(points, radius) {
  const curve = new THREE.CatmullRomCurve3(points, false, 'centripetal');
  const geo = new THREE.TubeGeometry(curve, 220, radius, 8, false);
  const mat = new THREE.ShaderMaterial({
    vertexShader: trailVert,
    fragmentShader: trailFrag,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: { uHead: { value: 0 }, uFade: { value: 1 }, uColor: { value: GOLD } },
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.userData.curve = curve;
  return mesh;
}

const easeOut = (t) => 1 - Math.pow(1 - t, 3);
const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

export function initHero({ canvas, reduced }) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance', alpha: true });
  renderer.setClearColor(0x000000, 0);
  const dpr = Math.min(window.devicePixelRatio, 2);
  renderer.setPixelRatio(dpr);

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0x07193c, 7, 19);

  const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 60);
  const look = new THREE.Vector3(0, 0, -1.6);
  const base = new THREE.Vector3(0, 1.9, 8.4);
  const start = new THREE.Vector3(0, 6.5, 12.5);

  const field = new THREE.Group();
  field.rotation.y = -0.12;
  scene.add(field);

  // Líneas de cal: se dibujan desde el círculo central hacia afuera
  const marks = pitchMarkings();
  const maxR = Math.hypot(HW, HL);
  const lines = makePoints(marks, {
    color: CHALK,
    size: 2.9,
    opacity: 1,
    orderFn: (v) => Math.hypot(v.x, v.z) / maxR,
  });
  field.add(lines);

  // Textura de césped: polvo fino sobre la cancha
  const dust = [];
  for (let i = 0; i < 5200; i++) {
    dust.push(new THREE.Vector3((Math.random() * 2 - 1) * (HW + 0.6), 0, (Math.random() * 2 - 1) * (HL + 0.6)));
  }
  const turf = makePoints(dust, {
    color: new THREE.Color('#5b7fb8'),
    size: 1.5,
    opacity: 0.32,
    orderFn: (v) => Math.hypot(v.x, v.z) / (maxR + 1),
  });
  field.add(turf);

  // Franjas de corte del césped, muy sutiles
  const stripes = new THREE.Group();
  for (let i = 0; i < 12; i++) {
    const m = new THREE.Mesh(
      new THREE.PlaneGeometry(HW * 2, (HL * 2) / 12),
      new THREE.MeshBasicMaterial({ color: 0x0d2a5e, transparent: true, opacity: i % 2 ? 0.0 : 0.14, depthWrite: false })
    );
    m.rotation.x = -Math.PI / 2;
    m.position.set(0, -0.002, -HL + (HL * 2 * (i + 0.5)) / 12);
    stripes.add(m);
  }
  field.add(stripes);

  // Dos trayectorias: por izquierda recorta hacia adentro (pierna cambiada),
  // por derecha desborda y centra (pierna natural). Atacan hacia -z.
  const v = (x, y, z) => new THREE.Vector3(x, y, z);
  const left = makeTrail(
    [v(-2.9, 0.03, 3.2), v(-3.0, 0.03, 0.6), v(-2.75, 0.03, -1.6), v(-1.9, 0.03, -2.9), v(-0.95, 0.03, -3.35), v(-0.35, 0.18, -4.3), v(0.25, 0.32, -5.25)],
    0.03
  );
  const right = makeTrail(
    [v(2.95, 0.03, 2.4), v(3.08, 0.03, -0.8), v(3.12, 0.03, -3.4), v(3.0, 0.03, -4.95), v(2.0, 0.55, -4.95), v(0.9, 0.85, -4.6), v(0.15, 0.25, -4.15)],
    0.03
  );
  field.add(left, right);

  const composer = new EffectComposer(renderer, { multisampling: 0 });
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new BloomEffect({ intensity: 0.9, luminanceThreshold: 0.5, luminanceSmoothing: 0.4, mipmapBlur: true, radius: 0.7 });
  const noise = new NoiseEffect({ blendFunction: BlendFunction.SOFT_LIGHT, premultiply: false });
  noise.blendMode.opacity.value = 0.35;
  const vignette = new VignetteEffect({ offset: 0.32, darkness: 0.55 });
  composer.addPass(new EffectPass(camera, bloom, noise, vignette));

  function resize() {
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    composer.setSize(w, h, false);
    camera.aspect = w / h;
    // en vertical la cancha necesita más campo de visión
    camera.fov = w / h < 0.8 ? 52 : 34;
    camera.updateProjectionMatrix();
    lines.material.uniforms.uPixel.value = dpr * (h / 900);
    turf.material.uniforms.uPixel.value = dpr * (h / 900);
  }
  resize();
  window.addEventListener('resize', resize);

  const pointer = { x: 0, y: 0, tx: 0, ty: 0 };
  window.addEventListener('pointermove', (e) => {
    pointer.tx = (e.clientX / window.innerWidth) * 2 - 1;
    pointer.ty = (e.clientY / window.innerHeight) * 2 - 1;
  });

  const state = { scroll: 0, visible: true };
  const io = new IntersectionObserver(([en]) => (state.visible = en.isIntersecting));
  io.observe(canvas);

  const t0 = performance.now();
  const INTRO = reduced ? 0 : 2.6;
  const CYCLE = 7.5;

  function trailHead(t, delay) {
    // dibuja, sostiene, se apaga y repite
    const local = (((t - delay) % CYCLE) + CYCLE) % CYCLE;
    if (t < delay) return { head: 0, fade: 1 };
    const head = easeInOut(Math.min(local / 2.4, 1));
    const fade = local > 5.6 ? 1 - Math.min((local - 5.6) / 1.2, 1) : 1;
    return { head: head * 1.02, fade };
  }

  function frame() {
    requestAnimationFrame(frame);
    if (!state.visible) return;
    const t = (performance.now() - t0) / 1000;
    const p = INTRO ? Math.min(t / INTRO, 1) : 1;
    const e = easeOut(p);

    lines.material.uniforms.uReveal.value = reduced ? 1.1 : e * 1.1;
    turf.material.uniforms.uReveal.value = reduced ? 1.1 : e * 1.2;
    lines.material.uniforms.uTime.value = t;
    turf.material.uniforms.uTime.value = t;

    if (reduced) {
      left.material.uniforms.uHead.value = 1.02;
      right.material.uniforms.uHead.value = 1.02;
    } else {
      const a = trailHead(t, INTRO * 0.55);
      const b = trailHead(t, INTRO * 0.55 + 0.9);
      left.material.uniforms.uHead.value = a.head;
      left.material.uniforms.uFade.value = a.fade;
      right.material.uniforms.uHead.value = b.head;
      right.material.uniforms.uFade.value = b.fade;
    }

    pointer.x += (pointer.tx - pointer.x) * 0.05;
    pointer.y += (pointer.ty - pointer.y) * 0.05;

    camera.position.lerpVectors(start, base, e);
    camera.position.x += pointer.x * 0.45;
    camera.position.y += -pointer.y * 0.18 + state.scroll * 1.6;
    camera.position.z -= state.scroll * 1.8;
    if (!reduced) field.rotation.y = -0.12 + Math.sin(t * 0.08) * 0.03;
    camera.lookAt(look);

    composer.render();
  }
  frame();

  return {
    setScroll(v) {
      state.scroll = v;
    },
  };
}
