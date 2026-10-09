/*!
 * Kiln Kitchens — Quote Calculator (Webflow binding) v1.0
 * Binds to markup built in the Webflow Designer via data-kq-* attributes.
 * See README.md for the attribute reference.
 */
(function () {
  'use strict';

  // ---- SAMPLE figures — used only when the root has data-demo="true". NOT real prices. ----
  var SAMPLE_PRICES = {
    'tier.modular': [2000, 3500], 'tier.masonry': [4000, 7000], // per metre; patio/base is charged separately by the landscaping partner
    'corner.unit': [800, 1500],
    'app.pizza.wood': [1500, 3500], 'app.pizza.gas': [1200, 3000], 'app.bbq.charcoal': [800, 2500], 'app.bbq.gas': [1500, 6000], 'app.kamado': [1200, 3000],
    'app.sink.single': [600, 1200], 'app.sink.double': [900, 1800], 'app.ice': [400, 900], 'app.fridge.single': [800, 1500], 'app.fridge.double': [1400, 2600],
    'app.wine.single': [900, 1600], 'app.wine.double': [1500, 2800], 'app.storage.single': [300, 800], 'app.storage.double': [600, 1500],
    'gas.connection': [300, 600], // LPG bottle setup (standard); mains gas quoted at survey
    'worktop.dekton': [400, 700], 'worktop.telford': [150, 300],
    'finish.artigiano-1': [0, 0], 'finish.artigiano-2': [0, 0], 'finish.naturateq-1': [0, 150], 'finish.naturateq-2': [0, 150],
    'lighting.zone': [600, 1400],
    'pergola.timber': [2500, 4000], 'pergola.louvred': [6000, 9000], 'pergola.sail': [1200, 2500], 'pergola.bio': [9000, 14000],
    'pergolaSize.2x3': 1, 'pergolaSize.3x4': 1.6, 'pergolaSize.4x4': 2,
    'pergola.electric': [1500, 2500], 'pergola.walls': [1200, 3000], 'pergola.heaters': [800, 1600], 'pergola.led': [400, 900],
    'package.kitchen': 10000, 'package.cover': 16000, 'package.lighting': 19000
  };
  var SAMPLE_DAYS = { survey: [10, 15], groundwork: [3, 5], utilities: [2, 3], patio: [3, 7], kitchen: [3, 5], connection: [1, 2], handover: [1, 1] };

  var LABELS = {
    shape: { row: 'Row', L: 'L-shape', U: 'U-shape' },
    build: { simple: 'Freestanding', moderate: 'New patio', top: 'New concrete base' },
    look: { standard: 'Modular units', masonry: 'Brick or block built', clad: 'Stone or brick clad' },
    pergola: { none: 'No cover', timber: 'Freestanding timber', louvred: 'Aluminium louvred', sail: 'Sail shade', bio: 'Bioclimatic' },
    size: { '2x3': '2m × 3m', '3x4': '3m × 4m', '4x4': '4m × 4m' }
  };
  // Approximate housing widths in cm (placeholders — override with 'width.<id>' / 'width.<id>.<variant>' price keys)
  var WIDTHS = { 'pizza.wood': 80, 'pizza.gas': 70, 'bbq.charcoal': 80, 'bbq.gas': 90, 'kamado': 70, 'sink.single': 60, 'sink.double': 100, 'ice': 40, 'fridge.single': 60, 'fridge.double': 120, 'wine.single': 40, 'wine.double': 60, 'storage.single': 60, 'storage.double': 120 };
  var SLAT_TYPES = ['louvred', 'bio'];
  var SERVICE_APPS = ['sink', 'ice', 'fridge', 'wine'];
  var RUN_MIN = 1, RUN_MAX = 10, RUN_STEP = 0.5;

  var add = function () {
    var rs = Array.prototype.slice.call(arguments);
    for (var i = 0; i < rs.length; i++) if (rs[i] == null) return null;
    return rs.reduce(function (a, r) { return [a[0] + r[0], a[1] + r[1]]; }, [0, 0]);
  };
  var mul = function (r, m) { return r == null || m == null ? null : [r[0] * m, r[1] * m]; };
  var gbp = function (n) { return '£' + Math.round(n).toLocaleString('en-GB'); };
  var fmt = function (r) {
    if (r == null) return 'TBC';
    if (r[1] === 0) return 'Included';
    return gbp(Math.floor(r[0] / 100) * 100) + ' – ' + gbp(Math.ceil(r[1] / 100) * 100);
  };
  var num = function (v) { if (v == null || v === '') return null; var n = parseFloat(String(v).replace(/[£,\s]/g, '')); return isNaN(n) ? null : n; };

  function injectStyle() {
    if (document.getElementById('kq-style')) return;
    var s = document.createElement('style');
    s.id = 'kq-style';
    // Selected states live here because Webflow can't share one combo class across several base classes.
    // Delete a rule if you style that state in the Designer instead.
    s.textContent = '.kq-hidden{display:none !important;}' +
      '.kq-tile.is-selected,.kq-chip.is-selected,.kq-seg-btn.is-selected,.kq-package.is-selected{background-color:#201e1d;color:#f3f2f2;border-color:#201e1d;}' +
      '.kq-package.is-selected{font-weight:800;}' +
      '.kq-app-toggle.is-selected{background-color:transparent !important;color:#201e1d !important;border-color:transparent !important;}' +
      '.kq-app-toggle.is-selected .kq-check{background-color:#201e1d;position:relative;}' +
      '.kq-app-toggle.is-selected .kq-check::after{content:"";position:absolute;left:5px;top:1px;width:6px;height:11px;border:solid #f3f2f2;border-width:0 3px 3px 0;transform:rotate(45deg);}' +
      '.kq-swatch.is-selected{background-color:transparent !important;color:#201e1d !important;}' +
      '.kq-swatch.is-selected .kq-swatch-chip{outline:2px solid #201e1d;outline-offset:2px;}' +
      '[data-kq-root] a:focus-visible{outline:2px solid #ec3013;outline-offset:2px;}';
    document.head.appendChild(s);
  }

  function init(root) {
    var demo = root.getAttribute('data-demo') === 'true';
    var founding = root.getAttribute('data-founding-offer') === 'true';
    var ctaBase = root.getAttribute('data-cta-url') || '/book-a-survey';

    // ---- Pricing: sample (demo) → window.KILN_CONFIG → CMS items, later sources win ----
    var P = {}, D = {};
    if (demo) { Object.assign(P, SAMPLE_PRICES); Object.assign(D, SAMPLE_DAYS); }
    if (window.KILN_CONFIG) { Object.assign(P, window.KILN_CONFIG.prices || {}); Object.assign(D, window.KILN_CONFIG.days || {}); }
    document.querySelectorAll('[data-kq-price]').forEach(function (el) {
      var k = (el.getAttribute('data-key') || '').trim();
      if (!k) return;
      var lo = num(el.getAttribute('data-lo')), hi = num(el.getAttribute('data-hi'));
      var v = lo == null ? null : (hi == null ? lo : [lo, hi]);
      if (k.indexOf('days.') === 0) D[k.slice(5)] = v == null ? null : (Array.isArray(v) ? v : [v, v]);
      else P[k] = v;
    });
    var R = function (k) { var v = P[k]; return v == null ? null : Array.isArray(v) ? v : [v, v]; };
    var N = function (k) { var v = P[k]; return v == null ? null : Array.isArray(v) ? v[0] : v; };

    // ---- State (markup pre-selection with .is-selected wins over these defaults) ----
    var S = {
      shape: 'L', build: 'moderate', look: 'standard', worktop: 'dekton', finish: 'artigiano-1',
      pergola: 'none', size: '3x4', slats: 'manual',
      zones: [], extras: [], apps: {},
      runs: { row: [3], L: [3, 2], U: [2.5, 3, 2.5] }
    };
    root.querySelectorAll('[data-kq-choice].is-selected').forEach(function (el) { S[el.getAttribute('data-kq-choice')] = el.getAttribute('data-value'); });
    root.querySelectorAll('[data-kq-toggle].is-selected').forEach(function (el) { var g = el.getAttribute('data-kq-toggle'); (S[g] = S[g] || []).push(el.getAttribute('data-value')); });
    var appVariants = {};
    root.querySelectorAll('[data-kq-variant]').forEach(function (el) {
      var a = el.getAttribute('data-kq-variant');
      (appVariants[a] = appVariants[a] || []).push(el.getAttribute('data-value'));
    });
    root.querySelectorAll('[data-kq-app].is-selected').forEach(function (el) {
      var a = el.getAttribute('data-kq-app');
      var pre = root.querySelector('[data-kq-variant="' + a + '"].is-selected');
      S.apps[a] = pre ? pre.getAttribute('data-value') : (appVariants[a] ? appVariants[a][0] : true);
    });

    root.addEventListener('click', function (e) {
      var t = e.target.closest('[data-kq-choice],[data-kq-toggle],[data-kq-app],[data-kq-variant],[data-kq-run-dec],[data-kq-run-inc]');
      if (!t || !root.contains(t)) return;
      e.preventDefault();
      var v = t.getAttribute('data-value');
      if (t.hasAttribute('data-kq-choice')) S[t.getAttribute('data-kq-choice')] = v;
      else if (t.hasAttribute('data-kq-toggle')) {
        var g = t.getAttribute('data-kq-toggle'), arr = S[g] = S[g] || [], i = arr.indexOf(v);
        if (i > -1) arr.splice(i, 1); else arr.push(v);
      } else if (t.hasAttribute('data-kq-app')) {
        var a = t.getAttribute('data-kq-app');
        if (S.apps[a] !== undefined) delete S.apps[a];
        else S.apps[a] = appVariants[a] ? appVariants[a][0] : true;
      } else if (t.hasAttribute('data-kq-variant')) {
        S.apps[t.getAttribute('data-kq-variant')] = v;
      } else {
        var row = t.closest('[data-kq-run]');
        if (!row) return;
        var idx = parseInt(row.getAttribute('data-kq-run'), 10), runs = S.runs[S.shape];
        if (idx >= runs.length) return;
        var d = t.hasAttribute('data-kq-run-inc') ? RUN_STEP : -RUN_STEP;
        runs[idx] = Math.min(RUN_MAX, Math.max(RUN_MIN, Math.round((runs[idx] + d) / RUN_STEP) * RUN_STEP));
      }
      render();
    });

    function set(name, text) { root.querySelectorAll('[data-kq-out="' + name + '"]').forEach(function (el) { el.textContent = text; }); }
    function sel(el, on) { el.classList.toggle('is-selected', !!on); el.setAttribute('aria-pressed', on ? 'true' : 'false'); }
    function show(el, on) { el.classList.toggle('kq-hidden', !on); }

    function compute() {
      var build = S.build === 'simple' ? 'freestanding' : S.build === 'moderate' ? 'patio' : S.look;
      var enquire = build === 'clad';
      var runs = S.runs[S.shape], metres = runs.reduce(function (a, b) { return a + b; }, 0);
      var corners = S.shape === 'U' ? 2 : S.shape === 'L' ? 1 : 0, topM = metres + corners * 0.6;
      var appIds = Object.keys(S.apps);
      var hasGas = appIds.some(function (id) { return S.apps[id] === 'gas'; });
      var appR = add.apply(null, appIds.map(function (id) { return R('app.' + id + (S.apps[id] === true ? '' : '.' + S.apps[id])); }).concat([hasGas ? R('gas.connection') : [0, 0]]));
      var kitchen = enquire ? null : add(mul(R(build === 'masonry' ? 'tier.masonry' : 'tier.modular'), metres), corners ? mul(R('corner.unit'), corners) : [0, 0], appR, mul(R('worktop.' + S.worktop), topM), mul(R('finish.' + S.finish), topM));
      var appW = appIds.reduce(function (t, id) { var k = id + (S.apps[id] === true ? '' : '.' + S.apps[id]); var o = N('width.' + k); return t + (o != null ? o : (WIDTHS[k] || 0)); }, 0);
      var overfit = appIds.length > 0 && appW >= metres * 100;
      var hasLight = S.zones.length > 0, lighting = hasLight ? mul(R('lighting.zone'), S.zones.length) : null;
      var hasP = S.pergola !== 'none', showSlats = SLAT_TYPES.indexOf(S.pergola) > -1;
      var pergola = hasP ? add.apply(null, [mul(R('pergola.' + S.pergola), N('pergolaSize.' + S.size)), showSlats && S.slats === 'electric' ? R('pergola.electric') : [0, 0]].concat(S.extras.map(function (x) { return R('pergola.' + x); }))) : null;
      var parts = [kitchen]; if (hasLight) parts.push(lighting); if (hasP) parts.push(pergola);
      var total = enquire ? null : add.apply(null, parts);
      var pkg = hasP && hasLight ? 'lighting' : hasP ? 'cover' : 'kitchen';
      var needsUtil = hasGas || appIds.some(function (a) { return SERVICE_APPS.indexOf(a) > -1; }) || hasLight ||
        (hasP && (S.extras.some(function (x) { return x !== 'walls'; }) || (showSlats && S.slats === 'electric')));
      var base = S.build !== 'simple';
      var stages = [
        ['survey', true], ['groundwork', base], ['utilities', needsUtil], ['patio', base],
        ['cure', S.build === 'top'], ['kitchen', true], ['connection', needsUtil], ['handover', true], ['buffer', true]
      ].filter(function (x) { return x[1]; }).map(function (x) { return x[0]; });
      var BUFFER = { simple: [7, 7], moderate: [14, 14], top: [21, 28] };
      var dayR = function (k) { return k === 'cure' ? [28, 28] : k === 'buffer' ? (D['buffer.' + S.build] || BUFFER[S.build]) : (D[k] || null); };
      var days = add.apply(null, stages.map(dayR));
      return { build: build, enquire: enquire, runs: runs, metres: metres, corners: corners, appIds: appIds, hasGas: hasGas, kitchen: kitchen,
        hasLight: hasLight, lighting: lighting, hasP: hasP, showSlats: showSlats, pergola: pergola, total: total, pkg: pkg,
        stages: stages, dayR: dayR, days: days, appW: appW, overfit: overfit };
    }

    function testIf(expr, c) {
      return expr.split('&').every(function (part) {
        part = part.trim();
        var neg = false, m = part.match(/^([\w]+)\s*:\s*(!?)(.+)$/);
        if (!m) {
          if (part[0] === '!') { neg = true; part = part.slice(1); }
          var flags = { overfit: c.overfit, partner: S.build !== 'simple', hasPergola: c.hasP, showSlats: c.showSlats, corners: c.corners > 0, offer: founding, demo: demo, enquire: c.enquire, gas: c.hasGas, lighting: c.hasLight };
          return neg ? !flags[part] : !!flags[part];
        }
        var vals = m[3].split(',').map(function (s) { return s.trim(); });
        var cur = S[m[1]], hit = Array.isArray(cur) ? vals.some(function (v) { return cur.indexOf(v) > -1; }) : vals.indexOf(String(cur)) > -1;
        return m[2] === '!' ? !hit : hit;
      });
    }

    function render() {
      var c = compute();

      root.querySelectorAll('[data-kq-choice]').forEach(function (el) { sel(el, S[el.getAttribute('data-kq-choice')] === el.getAttribute('data-value')); });
      root.querySelectorAll('[data-kq-toggle]').forEach(function (el) { sel(el, (S[el.getAttribute('data-kq-toggle')] || []).indexOf(el.getAttribute('data-value')) > -1); });
      root.querySelectorAll('[data-kq-app]').forEach(function (el) { sel(el, S.apps[el.getAttribute('data-kq-app')] !== undefined); });
      root.querySelectorAll('[data-kq-variant]').forEach(function (el) { sel(el, S.apps[el.getAttribute('data-kq-variant')] === el.getAttribute('data-value')); });
      root.querySelectorAll('[data-kq-variants]').forEach(function (el) { show(el, S.apps[el.getAttribute('data-kq-variants')] !== undefined); });
      root.querySelectorAll('[data-kq-run]').forEach(function (el) {
        var i = parseInt(el.getAttribute('data-kq-run'), 10);
        show(el, i < c.runs.length);
        if (i < c.runs.length) el.querySelectorAll('[data-kq-run-value]').forEach(function (v) { v.textContent = c.runs[i].toFixed(1) + 'm'; });
      });
      root.querySelectorAll('[data-kq-if]').forEach(function (el) { show(el, testIf(el.getAttribute('data-kq-if'), c)); });

      var rangeText = c.enquire ? 'Enquire' : c.total ? fmt(c.total) : 'To be confirmed';
      set('range', rangeText);
      set('range-note', c.enquire ? 'Masonry-clad pricing is confirmed at survey. Book a visit and we\u2019ll scope it with you.' : 'Not a quote. Your fixed price is agreed at design stage.');
      var buildLabel = S.build === 'top' ? LABELS.look[S.look] : LABELS.build[S.build];
      set('kitchen-value', c.enquire ? 'Enquire' : fmt(c.kitchen));
      set('kitchen-detail', LABELS.shape[S.shape] + ' · ' + c.metres.toFixed(1) + 'm · ' + buildLabel + ' · ' + c.appIds.length + ' appliance' + (c.appIds.length === 1 ? '' : 's'));
      set('lighting-value', c.hasLight ? fmt(c.lighting) : '—');
      set('lighting-detail', c.hasLight ? S.zones.length + ' zone' + (S.zones.length > 1 ? 's' : '') : 'Proposal included with every visit');
      set('pergola-value', c.hasP ? fmt(c.pergola) : '—');
      set('pergola-detail', c.hasP ? LABELS.pergola[S.pergola] + ' · ' + LABELS.size[S.size] : 'None selected');
      set('ground-note', S.build === 'simple' ? 'No groundwork needed — units sit on your existing surface.' : (S.build === 'top' ? 'Your concrete base' : 'Your new patio') + ' is laid by our approved landscaping partner and charged separately by them — it isn’t included in this range. We coordinate everything and stay your single point of contact.');
      set('fit-value', c.appIds.length ? (c.appW / 100).toFixed(1) + 'm of ' + c.metres.toFixed(1) + 'm' : '—');
      root.querySelectorAll('[data-kq-out="fit-value"]').forEach(function (el) { el.style.color = c.overfit ? '#ae1800' : ''; });
      set('fit-warning', 'Your appliances need about ' + (c.appW / 100).toFixed(1) + 'm but you have ' + c.metres.toFixed(1) + 'm of counter. Add length or remove an appliance — we\u2019ll confirm at survey.');
      set('counter-total', c.metres.toFixed(1) + 'm of counter' + (c.corners ? ' + ' + c.corners + ' corner unit' + (c.corners > 1 ? 's' : '') : ''));

      root.querySelectorAll('[data-kq-package]').forEach(function (el) { sel(el, el.getAttribute('data-kq-package') === c.pkg); });
      ['kitchen', 'cover', 'lighting'].forEach(function (k) { var v = N('package.' + k); set('from-' + k, v == null ? 'From £TBC' : 'From ' + gbp(v)); });

      root.querySelectorAll('[data-kq-stage]').forEach(function (el) {
        var k = el.getAttribute('data-kq-stage'), i = c.stages.indexOf(k);
        show(el, i > -1);
        if (i < 0) return;
        var r = c.dayR(k);
        el.querySelectorAll('[data-kq-stage-num]').forEach(function (n) { n.textContent = String(i + 1).padStart(2, '0'); });
        el.querySelectorAll('[data-kq-stage-dur]').forEach(function (n) { n.textContent = r == null ? 'TBC' : (r[0] % 7 === 0 && r[1] % 7 === 0) ? (r[0] === r[1] ? (r[0] / 7) + ' week' + (r[0] > 7 ? 's' : '') : (r[0] / 7) + '–' + (r[1] / 7) + ' weeks') : r[0] === r[1] ? r[0] + ' day' + (r[0] > 1 ? 's' : '') : r[0] + '–' + r[1] + ' days'; });
      });
      set('stage-patio-name', S.build === 'top' ? 'Concrete pour' : 'Patio installation');
      set('stage-utilities-note', 'Ducts laid before covering; mains gas, if chosen, pressure-tested first');
      set('stage-connection-note', c.hasGas ? 'LPG set up by a Gas Safe engineer' : 'Electrics certified');
      set('total-weeks', c.days ? Math.ceil(c.days[0] / 7) + '–' + Math.ceil(c.days[1] / 7) + ' weeks' : 'TBC');

      set('year', String(new Date().getFullYear()));
      set('offer-text', c.total && c.total[0] > 12000 ? 'A free 3m × 3m pergola or £2,000 of Luminos lighting.' : '20% off Luminos lighting or a pergola.');

      var summary = {
        shape: S.shape, counter: c.runs.join('+') + 'm', build: c.build, worktop: S.worktop, worktopColour: S['swatch-' + S.worktop] || '', finish: S.finish,
        appliances: c.appIds.map(function (a) { return S.apps[a] === true ? a : a + '-' + S.apps[a]; }).join(','),
        lighting: S.zones.join(','), pergola: c.hasP ? S.pergola + ' ' + S.size + (c.showSlats ? ' ' + S.slats : '') + (S.extras.length ? ' +' + S.extras.join('+') : '') : 'none',
        package: c.pkg, range: rangeText, timeline: c.days ? Math.ceil(c.days[0] / 7) + '-' + Math.ceil(c.days[1] / 7) + ' weeks' : 'TBC', applianceSpace: (c.appW / 100).toFixed(1) + 'm', spaceWarning: c.overfit ? 'yes' : 'no'
      };
      var qs = Object.keys(summary).map(function (k) { return encodeURIComponent(k) + '=' + encodeURIComponent(summary[k]); }).join('&');
      root.querySelectorAll('[data-kq-cta]').forEach(function (a) { a.setAttribute('href', ctaBase + (ctaBase.indexOf('?') > -1 ? '&' : '?') + qs); });
      document.querySelectorAll('[data-kq-field]').forEach(function (inp) { var k = inp.getAttribute('data-kq-field'); if (k in summary) inp.value = summary[k]; });
      window.KILN_SUMMARY = summary; // read by kiln-3d.js if it loads after the first render
      root.dispatchEvent(new CustomEvent('kiln:update', { detail: summary, bubbles: true }));
    }

    render();
  }

  function boot() {
    injectStyle();
    document.querySelectorAll('[data-kq-root]').forEach(init);
    // Prefill fields on the booking page from the CTA query string.
    var params = new URLSearchParams(location.search);
    document.querySelectorAll('[data-kq-prefill]').forEach(function (inp) {
      var v = params.get(inp.getAttribute('data-kq-prefill'));
      if (v != null) inp.value = v;
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
