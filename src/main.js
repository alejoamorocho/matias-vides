import '@fontsource-variable/big-shoulders-display';
import '@fontsource-variable/onest';
import './style.css';
import Lenis from 'lenis';
import { animate, inView, scroll, stagger } from 'motion';
import { initHero } from './hero.js';
import { buildMap } from './map.js';

const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// Edad calculada al día de hoy
document.querySelectorAll('.age[data-born]').forEach((n) => {
  const b = new Date(n.dataset.born + 'T00:00:00');
  const now = new Date();
  let age = now.getFullYear() - b.getFullYear();
  if (now < new Date(now.getFullYear(), b.getMonth(), b.getDate())) age--;
  n.textContent = `(${age} años)`;
});

// Scroll suave
let lenis;
if (!reduced) {
  lenis = new Lenis({ lerp: 0.1, anchors: { offset: -40 } });
  const raf = (t) => {
    lenis.raf(t);
    requestAnimationFrame(raf);
  };
  requestAnimationFrame(raf);
}

const bar = document.querySelector('.bar');
const hero = document.querySelector('.hero');
const nameEl = document.querySelector('.hero-name');
const cut = document.querySelector('.hero-cut');

// Partir cada línea del nombre para animarla desde abajo
document.querySelectorAll('.hero-line').forEach((line) => {
  const inner = document.createElement('span');
  inner.textContent = line.textContent;
  line.replaceChildren(inner);
});

document.fonts.ready.then(() => {
  const scene = initHero({ canvas: document.querySelector('.hero-pitch'), reduced });

  // Única secuencia orquestada de entrada
  if (!reduced) {
    animate('.hero-line > span', { y: ['105%', '0%'] }, { duration: 1.1, delay: stagger(0.12, { startDelay: 0.5 }), ease: [0.2, 0.8, 0.2, 1] });
    animate(cut, { opacity: [0, 1], x: [60, 0] }, { duration: 1.4, delay: 0.95, ease: [0.2, 0.8, 0.2, 1] });
    animate('.hero-meta', { opacity: [0, 1] }, { duration: 0.8, delay: 1.6 });
  }

  // Profundidad: nombre y jugador se separan al mover el mouse y al bajar
  let px = 0;
  let py = 0;
  let sp = 0;
  const apply = () => {
    nameEl.style.transform = `translate3d(${px * -10}px, ${py * -6 + sp * -120}px, 0)`;
    cut.style.translate = `${px * 22}px ${py * 10 + sp * -60}px`;
  };
  if (!reduced) {
    window.addEventListener('pointermove', (e) => {
      px = (e.clientX / window.innerWidth) * 2 - 1;
      py = (e.clientY / window.innerHeight) * 2 - 1;
      apply();
    });
  }

  scroll(
    (p) => {
      sp = p;
      scene.setScroll(p);
      apply();
    },
    { target: hero, offset: ['start start', 'end start'] }
  );
});

// Barra con fondo al salir del hero
new IntersectionObserver(([e]) => bar.classList.toggle('is-solid', !e.isIntersecting), { rootMargin: '-80px 0px 0px 0px' }).observe(hero);

// Ficha: las dos rutas del diagrama se trazan al aparecer
const runs = document.querySelectorAll('.ficha-pitch .run');
runs.forEach((r) => {
  const len = r.getTotalLength();
  r.style.strokeDasharray = r.classList.contains('shot') ? '5 6' : `${len}`;
  if (!reduced && !r.classList.contains('shot')) r.style.strokeDashoffset = `${len}`;
  if (!reduced && r.classList.contains('shot')) r.style.opacity = '0';
});
if (!reduced) {
  inView(
    '.ficha-pitch svg',
    () => {
      animate('.ficha-pitch .run:not(.shot)', { strokeDashoffset: 0 }, { duration: 1.4, delay: stagger(0.35), ease: [0.4, 0, 0.2, 1] });
      animate('.ficha-pitch .shot', { opacity: 1 }, { duration: 0.4, delay: stagger(0.35, { startDelay: 1.3 }) });
    },
    { amount: 0.5 }
  );
}

// Trayectoria: la ruta avanza con el scroll
const map = buildMap(document.querySelector('.ruta-map'));
const items = [...document.querySelectorAll('.ruta-list li')];
const paint = (p) => {
  const on = map.set(p);
  items.forEach((li, i) => li.classList.toggle('is-on', i < on || (i === items.length - 1 && p >= 0.999)));
};
if (reduced) paint(1);
else
  scroll((p) => paint(Math.min(1, p * 1.25)), {
    target: document.querySelector('.ruta'),
    offset: ['start 0.75', 'end 0.85'],
  });

// Remotion: se monta cuando la sección se acerca
const reelHost = document.getElementById('reel');
const io = new IntersectionObserver(
  async ([e]) => {
    if (!e.isIntersecting) return;
    io.disconnect();
    const { mountReel } = await import('./reel.jsx');
    mountReel(reelHost);
  },
  { rootMargin: '400px 0px' }
);
io.observe(reelHost);
