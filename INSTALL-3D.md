# Installing the 3D kitchen sketch on /cost-calculator

## 1. Host the scripts
Put these four files in the same place `kiln-calculator.js` is hosted now, for example a GitHub repo served through jsDelivr:
- `kiln-calculator.js` (updated: one line added, `window.KILN_SUMMARY = summary;`)
- `three-d-stage.js`
- `kiln-3d.js`
- `kiln-3d-model.js` (kiln-3d.js imports it by relative path, so keep them in the same folder)

Below, replace `https://cdn.jsdelivr.net/gh/DAZGITGATGOT/KILN-Kitchens@v1.0/` with that folder's URL.

## 2. Page settings → Custom code → Inside `<head>`
Paste the `<script type="importmap">…</script>` block from the top of `reference-build.html`, unchanged. Then add:
```html
<style>
three-d-stage:not(:defined){visibility:hidden}
.kq-3d{display:block;width:100%;height:300px}
.kq-3d-head{display:flex;justify-content:space-between;align-items:baseline;gap:12px}
.kq-3d-warning{font-size:13px;line-height:1.45;font-weight:600;color:#ae1800}
</style>
```

## 3. Designer: add an Embed as the first child of the summary aside
Give the Embed the class `kq-summary-block` and paste:
```html
<div data-kq-3d-scope>
  <div class="kq-3d-head"><div class="kq-label">Your kitchen</div><a class="kq-small" href="/kitchen-3d" data-kq-3d-link="/kitchen-3d" target="_blank">Open full view →</a></div>
  <three-d-stage class="kq-3d" data-kq-3d="live" name="kiln-kitchen" background="#e9e7e6" hide-toolbar></three-d-stage>
  <div class="kq-3d-warning" data-kq-3d-warning hidden></div>
  <div class="kq-small" data-kq-3d-caption></div>
</div>
```
Change `background` to match the summary panel's fill colour.

## 4. Page settings → Custom code → Before `</body>`
After the existing calculator script tag:
```html
<script src="https://cdn.jsdelivr.net/gh/DAZGITGATGOT/KILN-Kitchens@v1.0/three-d-stage.js"></script>
<script type="module" src="https://cdn.jsdelivr.net/gh/DAZGITGATGOT/KILN-Kitchens@v1.0/kiln-3d.js"></script>
```

## 5. Pergola copy
Under the pergola Size buttons, add a text block with the class `kq-small`:
"Larger sizes available on request. We'll size and quote it at your design visit."

## 6. Optional: full-view page
Create a page with the slug `kitchen-3d`. Rebuild the layout from `kitchen-3d.html` (the stage uses `data-kq-3d="url"`), using the same head code and scripts as above. If you skip it, remove the "Open full view" link from step 3.
