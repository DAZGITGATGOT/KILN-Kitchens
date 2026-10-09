/*!
 * Kiln Kitchens — 3D sketch model (v1.0)
 * parseSpec(summary | URLSearchParams) → spec;  buildKitchen(THREE, spec) → { group, info };  describe(spec, info) → copy.
 * Reads the same summary kiln-calculator.js emits (kiln:update detail / CTA query string).
 * Real-world metres, y-up. Stylised: pale volumes + ink edge lines, appliances drawn in accent.
 */
export const TIERS = { freestanding: 'Freestanding', patio: 'Fixed', standard: 'Built-in · modular units', masonry: 'Built-in · brick or block', clad: 'Built-in · masonry-clad' };
const SHAPES = { row: 'Row', L: 'L-shape', U: 'U-shape' };
const APP_LABEL = { bbq: 'BBQ', pizza: 'Pizza oven', kamado: 'Kamado', sink: 'Sink', ice: 'Ice well', fridge: 'Fridge', wine: 'Wine cooler', storage: 'Storage' };
const VAR_LABEL = { wood: 'wood-fired', gas: 'LPG', charcoal: 'charcoal', single: 'single', double: 'double' };
const TOP_LABEL = { dekton: 'Dekton', lapitec: 'Lapitec', telford: 'Telford Tops' };
const ZONE_LABEL = { path: 'Path & step', task: 'Under-counter task', feature: 'Feature & planting' };
const PERGOLA_LABEL = { timber: 'Freestanding timber', louvred: 'Aluminium louvred', sail: 'Sail shade', bio: 'Bioclimatic' };
const EXTRA_LABEL = { walls: 'side walls', heaters: 'infrared heaters', led: 'LED strips' };
// Housing widths in metres — mirror WIDTHS in kiln-calculator.js (placeholders until models are fixed).
const WIDTH = { 'pizza.wood': .8, 'pizza.gas': .7, 'bbq.charcoal': .8, 'bbq.gas': .9, kamado: .7, 'sink.single': .6, 'sink.double': 1, ice: .4, 'fridge.single': .6, 'fridge.double': 1.2, 'wine.single': .4, 'wine.double': .6, storage: .6, 'storage.single': .6, 'storage.double': 1.2 };
const ORDER = ['bbq', 'kamado', 'pizza', 'sink', 'ice', 'fridge', 'wine', 'storage'];
const COOK = ['bbq', 'kamado', 'pizza'];
const TOPS = { dekton: 0x3b3735, lapitec: 0xe4e1de, telford: 0xa9a4a0 };
const DEFAULT_RUNS = { row: [3], L: [3, 2], U: [2.5, 3, 2.5] };
const DEMO = { shape: 'L', counter: '3+2m', build: 'patio', worktop: 'dekton', appliances: 'pizza-wood,bbq-gas,sink-single,fridge-single', lighting: '', pergola: 'none' };

export function parseSpec(src) {
  const raw = (s, k) => { const v = s && (typeof s.get === 'function' ? s.get(k) : s[k]); return v == null || v === '' ? null : String(v); };
  if (!raw(src, 'shape')) src = DEMO;
  const get = (k) => raw(src, k);
  const shape = SHAPES[get('shape')] ? get('shape') : 'L';
  const given = String(get('counter') || '').replace(/m$/i, '').split('+').map(parseFloat);
  const runs = DEFAULT_RUNS[shape].map((d, i) => (given[i] > 0 ? Math.min(10, Math.max(1, given[i])) : d));
  const build = TIERS[get('build')] ? get('build') : 'patio';
  const apps = String(get('appliances') || '').split(',').filter(Boolean)
    .map((s) => { const [id, variant] = s.trim().split('-'); return { id, variant: variant || null }; })
    .filter((a) => APP_LABEL[a.id])
    .sort((a, b) => ORDER.indexOf(a.id) - ORDER.indexOf(b.id))
    .map((a) => ({ ...a, w: WIDTH[a.id + (a.variant ? '.' + a.variant : '')] || .6 }));
  const lighting = String(get('lighting') || '').split(',').map((s) => s.trim()).filter((z) => ZONE_LABEL[z]);
  const pg = String(get('pergola') || 'none').trim().split(/\s+/);
  let pergola = null;
  if (PERGOLA_LABEL[pg[0]]) {
    const size = /^\d+x\d+$/.test(pg[1] || '') ? pg[1] : '3x4';
    const extras = (pg.find((x) => x[0] === '+') || '').split('+').filter((x) => EXTRA_LABEL[x]);
    pergola = { type: pg[0], size, slats: pg.includes('electric') ? 'electric' : pg.includes('manual') ? 'manual' : null, extras };
  }
  return { shape, runs, build, apps, worktop: TOPS[get('worktop')] != null ? get('worktop') : 'dekton', lighting, pergola, range: get('range'), demo: src === DEMO };
}

export function describe(spec, info) {
  const appTxt = spec.apps.length ? spec.apps.map((a) => APP_LABEL[a.id] + (a.variant ? ' (' + VAR_LABEL[a.variant] + ')' : '')).join(', ') : 'None yet';
  const p = spec.pergola;
  const rows = [
    ['Layout', SHAPES[spec.shape] + ' · ' + spec.runs.map((r, i) => 'ABC'[i] + ' ' + r.toFixed(1) + 'm').join(', ')],
    ['Build', TIERS[spec.build]],
    ['Appliances', appTxt],
    ['Worktop', TOP_LABEL[spec.worktop]],
    ['Lighting', spec.lighting.length ? spec.lighting.map((z) => ZONE_LABEL[z]).join(', ') : 'Proposal at your visit'],
    ['Cover', p ? PERGOLA_LABEL[p.type] + ' · ' + p.size.replace('x', 'm × ') + 'm' + (p.slats ? ' · ' + p.slats + ' slats' : '') + (p.extras.length ? ' · ' + p.extras.map((x) => EXTRA_LABEL[x]).join(', ') : '') : 'None'],
  ];
  const warning = info.dropped.length
    ? 'Not shown — no room yet for: ' + info.dropped.map((a) => APP_LABEL[a.id]).join(', ') + '. Add counter length, or we rework the layout at your design visit.'
    : '';
  return { rows, warning, caption: 'Sketch, not to scale' + (p ? ', cover not shown' : '') + '. We measure and design it properly at your free design visit.' };
}

// Pergolas are listed in the spec but not drawn by default (sizes don't track the kitchen footprint).
export function buildKitchen(THREE, spec, opts = {}) {
  const D = .6, H = .9, T = .04, PL = .1, CD = .57;
  const masonry = spec.build === 'masonry' || spec.build === 'clad';
  const builtIn = ['standard', 'masonry', 'clad'].includes(spec.build);
  const std = (name, color, rough = .85, metal = 0, extra = {}) => new THREE.MeshStandardMaterial({ name, color, roughness: rough, metalness: metal, polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1, ...extra });
  const M = {
    unit: std('unit_paper', 0xf8f7f6),
    top: std('worktop_' + spec.worktop, TOPS[spec.worktop], .55),
    steel: std('appliance_steel', 0xd2cfcc, .4, .3),
    glass: std('glass_tint', 0x4c5052, .25, .1),
    ground: std('ground_patio', 0xe7e5e3, .95),
    base: std('concrete_base', 0xd3d0cd, .95),
    accent: std('accent_red', 0xec3013, .6, 0, { emissive: 0xec3013, emissiveIntensity: .25 }),
    fabric: std('sail_fabric', 0xfaf9f8, .9, 0, { side: THREE.DoubleSide }),
  };
  const L = {
    ink: new THREE.LineBasicMaterial({ name: 'line_ink', color: 0x201e1d }),
    red: new THREE.LineBasicMaterial({ name: 'line_accent', color: 0xec3013 }),
    faint: new THREE.LineBasicMaterial({ name: 'line_faint', color: 0xa9a5a2 }),
  };
  const outline = (m, line, thr = 20) => { const e = new THREE.LineSegments(new THREE.EdgesGeometry(m.geometry, thr), line); e.name = m.name + '_lines'; m.add(e); };
  const box = (p, name, w, h, d, x, y, z, mat = M.unit, line = L.ink) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    m.name = name; m.position.set(x + w / 2, y + h / 2, z + d / 2);
    if (line) outline(m, line); p.add(m); return m;
  };
  const solid = (p, name, geo, mat, line, thr, x, y, z) => { const m = new THREE.Mesh(geo, mat); m.name = name; m.position.set(x, y, z); if (line) outline(m, line, thr); p.add(m); return m; };
  const segs = (p, name, list, line = L.ink) => {
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(list.flat(), 3));
    const s = new THREE.LineSegments(g, line); s.name = name; p.add(s); return s;
  };

  // ---- Unit parts (local run frame: x along the run, z from back 0 to front D) ----
  const carcass = (p, n, x, w) => {
    if (masonry) {
      box(p, n + '_carcass', w, H - T, CD, x, 0, 0);
      const l = [], z = CD + .001;
      for (let y = .075, r = 0; y < H - T; y += .075, r++) {
        l.push([x, y, z, x + w, y, z]);
        for (let u = x + (r % 2 ? .1125 : .225); u < x + w - .01; u += .225) l.push([u, y - .075, z, u, y, z]);
      }
      segs(p, n + '_courses', l, L.faint);
    } else {
      box(p, n + '_plinth', w, PL, CD - .05, x, 0, 0, M.unit, L.faint);
      box(p, n + '_carcass', w, H - T - PL, CD, x, PL, 0);
    }
  };
  const doorMat = masonry ? M.steel : M.unit;
  const inset = masonry ? .06 : .004;
  const y0 = (masonry ? .08 : PL + .01), dh = H - T - y0 - (masonry ? .06 : .01);
  const doors = (p, n, x, w, kind = 'single', mat = doorMat) => {
    if (kind === 'drawers') {
      const h = dh / 3;
      for (let i = 0; i < 3; i++) {
        box(p, `${n}_drawer${i + 1}`, w - inset * 2, h - .006, .018, x + inset, y0 + i * h + .003, CD, mat);
        segs(p, `${n}_pull${i + 1}`, [[x + w / 2 - .08, y0 + (i + 1) * h - .045, CD + .03, x + w / 2 + .08, y0 + (i + 1) * h - .045, CD + .03]]);
      }
      return;
    }
    const k = kind === 'double' ? 2 : 1, dw = (w - inset * 2) / k;
    for (let i = 0; i < k; i++) {
      const dx = x + inset + i * dw;
      box(p, `${n}_door${i + 1}`, dw - .006, dh, .018, dx + .003, y0, CD, mat);
      const hx = k === 2 && i === 1 ? dx + .045 : dx + dw - .045;
      segs(p, `${n}_handle${i + 1}`, [[hx, y0 + dh - .05, CD + .03, hx, y0 + dh - .25, CD + .03]]);
    }
  };
  const vents = (p, n, x, w) => {
    const l = [];
    for (let i = 0; i < 4; i++) { const y = y0 + .05 + i * .03; l.push([x + w / 2 - .12, y, CD + .02, x + w / 2 + .12, y, CD + .02]); }
    segs(p, n + '_lpg_vents', l, L.red);
  };
  const halfTube = (p, name, r, len, squash, mat, line, x, y, z) => {
    const m = solid(p, name, new THREE.CylinderGeometry(r, r, len, 14, 1, false, 0, Math.PI), mat, line, 1, x, y, z);
    m.rotation.z = Math.PI / 2; m.scale.set(squash, 1, 1); return m;
  };

  const MOD = {
    cabinet(p, n, x, w) { carcass(p, n, x, w); doors(p, n, x, w, w > .75 ? 'double' : 'single'); },
    storage(p, n, x, w) { carcass(p, n, x, w); const k = w > .9 ? 2 : 1; for (let i = 0; i < k; i++) doors(p, n + '_' + (i + 1), x + i * w / k, w / k, 'drawers'); },
    bbq(p, n, x, w, v) {
      carcass(p, n, x, w); doors(p, n, x, w, 'double');
      if (v === 'gas') vents(p, n, x, w);
      box(p, n + '_grill_body', w - .08, .1, .5, x + .04, H - .04, .04, M.steel, L.red);
      halfTube(p, n + '_hood', .2, w - .12, .8, M.steel, L.red, x + w / 2, H + .06, .29);
      if (v === 'gas') for (let i = 0; i < 4; i++) {
        const k = solid(p, `${n}_knob${i + 1}`, new THREE.CylinderGeometry(.018, .018, .03, 16), M.unit, L.ink, 30, x + .14 + i * (w - .28) / 3, H + .01, .555);
        k.rotation.x = Math.PI / 2;
      }
    },
    pizza(p, n, x, w, v) {
      carcass(p, n, x, w); doors(p, n, x, w, 'double');
      const cx = x + w / 2;
      if (v === 'gas') {
        vents(p, n, x, w);
        box(p, n + '_oven_body', w - .1, .2, .5, x + .05, H, .05, M.unit, L.red);
        halfTube(p, n + '_oven_top', .25, w - .1, .45, M.unit, L.red, cx, H + .2, .3);
        box(p, n + '_mouth', .32, .1, .02, cx - .16, H + .04, .545, M.glass, L.ink);
      } else {
        const r = Math.min(.34, (w - .1) / 2);
        box(p, n + '_hearth', w - .04, .06, .56, x + .02, H, .03, M.unit, L.ink);
        solid(p, n + '_dome', new THREE.SphereGeometry(r, 16, 5, 0, Math.PI * 2, 0, Math.PI / 2), M.unit, L.red, 1, cx, H + .06, .31);
        solid(p, n + '_flue', new THREE.CylinderGeometry(.05, .05, .4, 16), M.unit, L.red, 30, cx, H + .06 + r + .1, .25);
        box(p, n + '_mouth', .26, .14, .04, cx - .13, H + .06, .31 + r - .06, M.glass, L.ink);
      }
    },
    kamado(p, n, x, w) {
      carcass(p, n, x, w); doors(p, n, x, w, 'double');
      const r = .27, cy = H + r * 1.15 * .6;
      const egg = solid(p, n + '_egg', new THREE.SphereGeometry(r, 16, 10), M.unit, L.red, 1, x + w / 2, cy, .3);
      egg.scale.set(1, 1.15, 1);
      const band = solid(p, n + '_band', new THREE.TorusGeometry(r + .004, .012, 8, 48), M.glass, null, 0, x + w / 2, cy, .3);
      band.rotation.x = Math.PI / 2;
    },
    sink(p, n, x, w, v) {
      carcass(p, n, x, w); doors(p, n, x, w, w > .75 ? 'double' : 'single');
      const k = v === 'double' ? 2 : 1, bw = (w - .16 - (k - 1) * .06) / k;
      for (let i = 0; i < k; i++) box(p, `${n}_basin${i + 1}`, bw, .004, .38, x + .08 + i * (bw + .06), H + .001, .12, M.steel, L.red);
      const cx = x + w / 2;
      solid(p, n + '_tap', new THREE.CylinderGeometry(.014, .014, .3, 16), M.steel, L.ink, 30, cx, H + .15, .06);
      const spout = solid(p, n + '_spout', new THREE.CylinderGeometry(.012, .012, .16, 16), M.steel, L.ink, 30, cx, H + .29, .14);
      spout.rotation.x = Math.PI / 2;
    },
    ice(p, n, x, w) {
      carcass(p, n, x, w); doors(p, n, x, w, 'single');
      box(p, n + '_lid', w - .08, .004, .4, x + .04, H + .001, .1, M.steel, L.red);
      segs(p, n + '_lid_split', [[x + w / 2, H + .006, .1, x + w / 2, H + .006, .5]], L.red);
    },
    fridge(p, n, x, w, v) { carcass(p, n, x, w); cold(p, n, x, w, v === 'double' ? 2 : 1, M.steel, false); },
    wine(p, n, x, w, v) { carcass(p, n, x, w); cold(p, n, x, w, v === 'double' ? 2 : 1, M.glass, true); },
  };
  function cold(p, n, x, w, k, mat, shelves) {
    const dw = (w - inset * 2) / k;
    for (let i = 0; i < k; i++) {
      const dx = x + inset + i * dw;
      box(p, `${n}_door${i + 1}`, dw - .006, dh, .02, dx + .003, y0, CD, mat, L.red);
      const hx = k === 2 && i === 1 ? dx + .045 : dx + dw - .045;
      segs(p, `${n}_handle${i + 1}`, [[hx, y0 + dh - .05, CD + .035, hx, y0 + .1, CD + .035]]);
      if (shelves) { const l = []; for (let y = y0 + .12; y < y0 + dh - .05; y += .1) l.push([dx + .03, y, CD + .021, dx + dw - .09, y, CD + .021]); segs(p, `${n}_shelves${i + 1}`, l, L.faint); }
    }
  }

  // ---- Runs, distribution, corners ----
  const len = { A: spec.runs[0], B: spec.runs[1], C: spec.runs[2] };
  const keys = spec.shape === 'row' ? ['A'] : spec.shape === 'L' ? ['A', 'B'] : ['A', 'B', 'C'];
  const main = spec.shape === 'row' ? 'A' : 'B', sides = keys.filter((k) => k !== main);
  const room = {}, placed = {}, dropped = [];
  keys.forEach((k) => { room[k] = len[k]; placed[k] = []; });
  spec.apps.forEach((a) => {
    const k = (COOK.includes(a.id) ? [main, ...sides] : [...sides, main]).find((r) => room[r] >= a.w - 1e-6);
    if (k) { placed[k].push(a); room[k] -= a.w; } else dropped.push(a);
  });

  const runGroup = (k, trim) => {
    const g = new THREE.Group(), l = len[k], items = placed[k];
    const used = items.reduce((s, i) => s + i.w, 0);
    let x = 0, c = 0;
    const fill = (w) => { if (w < .05) { x += w; return; } const n = Math.ceil(w / .6 - 1e-6), cw = w / n; for (let i = 0; i < n; i++) { MOD.cabinet(g, `${k}_cabinet${++c}`, x, cw); x += cw; } };
    fill(Math.max(0, l - used) / 2);
    items.forEach((a, i) => { MOD[a.id](g, `${k}_${a.id}${i ? i + 1 : ''}`, x, a.w, a.variant); x += a.w; });
    fill(l - x);
    box(g, `${k}_worktop`, l - trim[0] - trim[1], T, D + .02, trim[0], H - T, 0, M.top);
    if (spec.lighting.includes('task')) box(g, `${k}_task_light`, l - .1, .008, .012, .05, H - T - .012, CD + .035, M.accent, null);
    g.name = 'run_' + k; return g;
  };
  const corner = (p, n, x) => {
    if (masonry) box(p, n + '_carcass', D, H - T, D, x, 0, 0);
    else { box(p, n + '_plinth', D, PL, D - .05, x, 0, 0, M.unit, L.faint); box(p, n + '_carcass', D, H - T - PL, D, x, PL, 0); }
    box(p, n + '_worktop', D, T, D + .02, x, H - T, 0, M.top);
  };
  const kitchen = new THREE.Group(); kitchen.name = 'kitchen';
  const place = (g, x, z, rot) => { g.position.set(x, 0, z); g.rotation.y = rot; kitchen.add(g); };
  let W, Dz; const pads = [];
  if (spec.shape === 'row') {
    place(runGroup('A', [0, 0]), 0, 0, 0); W = len.A; Dz = D + .02; pads.push([0, 0, W, Dz]);
  } else {
    corner(kitchen, 'corner_AB', 0);
    place(runGroup('B', [0, 0]), D, 0, 0);
    place(runGroup('A', [0, .02]), 0, D + len.A, Math.PI / 2);
    W = D + len.B; Dz = D + len.A;
    if (spec.shape === 'U') {
      corner(kitchen, 'corner_BC', D + len.B);
      place(runGroup('C', [.02, 0]), D + len.B + D, D, -Math.PI / 2);
      W += D; Dz = D + Math.max(len.A, len.C);
      pads.push([W - D - .02, D + .02, W, D + len.C]);
    }
    pads.push([0, 0, W, D + .02], [0, D + .02, D + .02, D + len.A]);
  }

  // ---- Site: patio / existing surface / independent base ----
  const root = new THREE.Group(); root.name = 'kiln_kitchen';
  const site = new THREE.Group(); site.name = 'site'; root.add(site);
  const gx0 = -.8, gz0 = -.25, gx1 = W + .8, gz1 = Dz + 2.2;
  let lift;
  if (spec.build === 'freestanding') {
    box(site, 'existing_patio', gx1 - gx0, .03, gz1 - gz0, gx0, 0, gz0, M.ground, L.faint); lift = .03;
  } else {
    box(site, 'patio', gx1 - gx0, .05, gz1 - gz0, gx0, 0, gz0, M.ground, L.ink); lift = .05;
    if (builtIn) {
      pads.forEach(([x0, z0, x1, z1], i) => box(site, 'base_pad' + (i + 1), x1 - x0 + (i ? 0 : .1), .1, z1 - z0 + .05, x0 - (i ? 0 : .05), .05, z0 - (i ? 0 : .05), M.base, L.ink));
      lift = .15;
    }
  }
  kitchen.position.y = lift; root.add(kitchen);

  // ---- Luminos lighting ----
  const lights = new THREE.Group(); lights.name = 'lighting'; root.add(lights);
  const ground = spec.build === 'freestanding' ? .03 : .05;
  if (spec.lighting.includes('path')) {
    const n = Math.max(2, Math.round((gx1 - gx0) / 1.6));
    for (let i = 0; i < n; i++) {
      const bx = gx0 + .4 + i * (gx1 - gx0 - .8) / (n - 1);
      solid(lights, `path_bollard${i + 1}`, new THREE.CylinderGeometry(.035, .035, .45, 16), M.unit, L.ink, 30, bx, ground + .225, gz1 - .3);
      solid(lights, `path_bollard${i + 1}_lamp`, new THREE.CylinderGeometry(.036, .036, .04, 16), M.accent, null, 0, bx, ground + .41, gz1 - .3);
    }
  }
  if (spec.lighting.includes('feature')) {
    [[gx0 + .3, gz0 + .3], [gx1 - .3, gz0 + .3]].forEach(([fx, fz], i) => {
      solid(lights, `feature_uplight${i + 1}`, new THREE.CylinderGeometry(.045, .045, .06, 16), M.accent, L.ink, 30, fx, ground + .03, fz);
      segs(lights, `feature_beam${i + 1}`, [[fx, ground + .06, fz, fx - .15, 1.6, fz], [fx, ground + .06, fz, fx + .15, 1.6, fz]], L.red);
    });
  }

  // ---- Pergola ----
  if (spec.pergola && opts.pergola) {
    const pg = new THREE.Group(); pg.name = 'pergola_' + spec.pergola.type; root.add(pg);
    const [a, b] = spec.pergola.size.split('x').map(Number);
    const pw = Math.max(a, b), pd = Math.min(a, b), ph = 2.5, gy = ground;
    const x0 = W / 2 - pw / 2, z0 = gz0 + .05, t = spec.pergola.type;
    const s = t === 'timber' ? .12 : t === 'sail' ? .09 : .15;
    const corners = [[x0, z0], [x0 + pw - s, z0], [x0, z0 + pd - s], [x0 + pw - s, z0 + pd - s]];
    if (t === 'sail') {
      const hs = [2.7, 2.3, 2.3, 2.7];
      corners.forEach(([cx, cz], i) => solid(pg, `post${i + 1}`, new THREE.CylinderGeometry(s / 2, s / 2, hs[i], 16), M.unit, L.ink, 30, cx + s / 2, gy + hs[i] / 2, cz + s / 2));
      const v = corners.map(([cx, cz], i) => [cx + s / 2, gy + hs[i] - .05, cz + s / 2]);
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute([...v[0], ...v[1], ...v[3], ...v[0], ...v[3], ...v[2]], 3));
      geo.computeVertexNormals();
      solid(pg, 'sail', geo, M.fabric, L.ink, 20, 0, 0, 0);
    } else {
      corners.forEach(([cx, cz], i) => box(pg, `post${i + 1}`, s, ph, s, cx, gy, cz));
      const bh = t === 'timber' ? .18 : .22, by = gy + ph - bh;
      box(pg, 'beam_back', pw, bh, s, x0, by, z0);
      box(pg, 'beam_front', pw, bh, s, x0, by, z0 + pd - s);
      box(pg, 'beam_left', s, bh, pd - 2 * s, x0, by, z0 + s);
      box(pg, 'beam_right', s, bh, pd - 2 * s, x0 + pw - s, by, z0 + s);
      if (t === 'timber') {
        for (let x = x0 + .25, i = 1; x < x0 + pw - .25; x += .4, i++) box(pg, `rafter${i}`, .05, .14, pd + .2, x, gy + ph, z0 - .1);
      } else {
        for (let x = x0 + s + .1, i = 1; x < x0 + pw - s - .12; x += .17, i++) {
          const lv = box(pg, `louvre${i}`, .15, .022, pd - 2 * s - .02, x, by + bh / 2 - .011, z0 + s + .01, M.unit, L.ink);
          lv.rotation.z = .45;
        }
      }
      if (spec.pergola.extras.includes('walls')) for (let z = z0 + s + .03, i = 1; z < z0 + pd - s - .05; z += .12, i++) box(pg, `side_wall_slat${i}`, .03, ph - bh - .1, .07, x0 + s / 2 - .015, gy + .05, z, M.unit, L.faint);
      if (spec.pergola.extras.includes('heaters')) box(pg, 'infrared_heater', .6, .07, .12, x0 + pw / 2 - .3, by - .08, z0 + pd - s - .14, M.accent, L.ink);
      if (spec.pergola.extras.includes('led')) {
        box(pg, 'led_strip_back', pw - 2 * s, .015, .015, x0 + s, by - .016, z0 + s, M.accent, null);
        box(pg, 'led_strip_front', pw - 2 * s, .015, .015, x0 + s, by - .016, z0 + pd - s - .015, M.accent, null);
      }
    }
  }

  // Centre on the origin, base at y = 0.
  const bb = new THREE.Box3().setFromObject(root);
  const c = bb.getCenter(new THREE.Vector3());
  root.children.forEach((ch) => { ch.position.x -= c.x; ch.position.z -= c.z; });
  return { group: root, info: { dropped, placed } };
}
