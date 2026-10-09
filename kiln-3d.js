/*!
 * Kiln Kitchens — 3D sketch binding (v1.0). Load as <script type="module" src="kiln-3d.js">.
 * <three-d-stage data-kq-3d="live">  follows the calculator (kiln:update events).
 * <three-d-stage data-kq-3d="url">   renders from the page's query string (the CTA link).
 * Inside the nearest [data-kq-3d-scope] (or the document): [data-kq-3d-caption], [data-kq-3d-spec],
 * [data-kq-3d-warning], [data-kq-3d-range] are filled; [data-kq-3d-link="<url>"] gets the summary query string.
 */
import { parseSpec, buildKitchen, describe } from './kiln-3d-model.js';

const dispose = (o) => o.traverse((c) => {
  if (c.geometry) c.geometry.dispose();
  (Array.isArray(c.material) ? c.material : [c.material]).forEach((m) => m && m.dispose && m.dispose());
});

async function bind(stage) {
  const { THREE } = await stage.ready;
  const scope = stage.closest('[data-kq-3d-scope]') || document;
  const all = (sel) => scope.querySelectorAll(sel);
  let current = null, lastKey = null;

  const show = (src) => {
    const spec = parseSpec(src);
    const { group, info } = buildKitchen(THREE, spec);
    const key = [spec.shape, spec.runs.join('+'), spec.build].join('|');
    stage.setObject(group, { keepView: key === lastKey });
    if (current) dispose(current);
    current = group; lastKey = key;

    const d = describe(spec, info);
    all('[data-kq-3d-caption]').forEach((el) => { el.textContent = d.caption; });
    all('[data-kq-3d-warning]').forEach((el) => { el.textContent = d.warning; el.hidden = !d.warning; });
    all('[data-kq-3d-range]').forEach((el) => { el.textContent = spec.range || 'Indicative range on request'; });
    all('[data-kq-3d-spec]').forEach((el) => {
      el.replaceChildren(...d.rows.map(([k, v]) => {
        const row = document.createElement('div'); row.className = 'kq-line';
        const a = document.createElement('div'); a.className = 'kq-line-title'; a.textContent = k;
        const b = document.createElement('div'); b.className = 'kq-spec-value'; b.textContent = v;
        row.append(a, b); return row;
      }));
    });
    if (src && typeof src.get !== 'function') {
      const qs = new URLSearchParams(src).toString();
      all('[data-kq-3d-link]').forEach((a) => { a.href = (a.getAttribute('data-kq-3d-link') || 'kitchen-3d.html') + '?' + qs; });
    }
  };

  if (stage.getAttribute('data-kq-3d') === 'url') show(new URLSearchParams(location.search));
  else {
    show(window.KILN_SUMMARY || null);
    document.addEventListener('kiln:update', (e) => show(e.detail));
  }
}

document.querySelectorAll('three-d-stage[data-kq-3d]').forEach(bind);
