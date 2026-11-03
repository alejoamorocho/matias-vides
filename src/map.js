import { geoMercator, geoPath, geoGraticule } from 'd3-geo';
import { COLOMBIA } from './colombia.js';

const NS = 'http://www.w3.org/2000/svg';

// Origen y paradas en el orden de la lista de trayectoria
const HOME = { name: 'Mompox', note: 'nacimiento', at: [-74.43, 9.24] };
const STOPS = [
  { name: 'La Guajira', at: [-72.91, 11.54], dx: 10, dy: -8 },
  { name: 'Ibagué', at: [-75.23, 4.44], dx: 12, dy: 4 },
  { name: 'Cali', at: [-76.53, 3.45], dx: -14, dy: 20, anchor: 'end' },
];

function el(tag, attrs = {}, parent) {
  const n = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v);
  if (parent) parent.appendChild(n);
  return n;
}

export function buildMap(host) {
  const W = 420;
  const H = 540;
  const land = { type: 'Feature', geometry: { type: 'Polygon', coordinates: [COLOMBIA] } };
  const proj = geoMercator().fitExtent(
    [
      [20, 20],
      [W - 20, H - 20],
    ],
    land
  );
  const path = geoPath(proj);

  const svg = el('svg', { viewBox: `0 0 ${W} ${H}` }, host);
  el('path', { d: path(geoGraticule().step([2, 2])()), class: 'grat' }, svg);
  el('path', { d: path(land), class: 'land' }, svg);

  const pts = [HOME, ...STOPS].map((s) => proj(s.at));

  // Ruta con tramos curvos entre paradas
  let d = `M${pts[0][0]},${pts[0][1]}`;
  for (let i = 1; i < pts.length; i++) {
    const [x0, y0] = pts[i - 1];
    const [x1, y1] = pts[i];
    const mx = (x0 + x1) / 2;
    const my = (y0 + y1) / 2;
    const nx = -(y1 - y0);
    const ny = x1 - x0;
    const k = 0.22 * (i % 2 ? 1 : -1);
    d += ` Q${mx + nx * k},${my + ny * k} ${x1},${y1}`;
  }
  const route = el('path', { d, class: 'path' }, svg);
  const len = route.getTotalLength();
  route.style.strokeDasharray = `${len}`;
  route.style.strokeDashoffset = `${len}`;

  // largo acumulado hasta cada parada para encenderlas en orden
  const marks = [];
  {
    let acc = 0;
    const probe = el('path', {}, null);
    const segs = d.split(/(?=[Q])/);
    let head = segs[0];
    for (let i = 1; i < segs.length; i++) {
      head += ' ' + segs[i];
      probe.setAttribute('d', head);
      svg.appendChild(probe);
      acc = probe.getTotalLength();
      svg.removeChild(probe);
      marks.push(acc / len);
    }
  }

  const homeDot = el('circle', { cx: pts[0][0], cy: pts[0][1], r: 5, class: 'dot home' }, svg);
  const homeLabel = el('text', { x: pts[0][0] + 10, y: pts[0][1] + 4 }, svg);
  homeLabel.textContent = HOME.name;
  const homeNote = el('text', { x: pts[0][0] + 10, y: pts[0][1] + 18, class: 'small' }, svg);
  homeNote.textContent = HOME.note;
  void homeDot;

  const dots = STOPS.map((s, i) => {
    const [x, y] = pts[i + 1];
    const c = el('circle', { cx: x, cy: y, r: 6, class: 'dot' }, svg);
    const t = el('text', { x: x + (s.dx ?? 10), y: y + (s.dy ?? 4), 'text-anchor': s.anchor ?? 'start' }, svg);
    t.textContent = s.name;
    return c;
  });

  return {
    // p: 0..1 avance de la ruta. Devuelve cuántas paradas están encendidas.
    set(p) {
      route.style.strokeDashoffset = `${len * (1 - p)}`;
      let on = 0;
      marks.forEach((m, i) => {
        const lit = p >= m - 0.005;
        dots[i].classList.toggle('is-on', lit);
        if (lit) on = i + 1;
      });
      return on;
    },
  };
}
