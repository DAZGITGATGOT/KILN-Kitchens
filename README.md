# Kiln Quote Calculator — Webflow build guide

You build the layout in the Webflow Designer. `kiln-calculator.js` handles the interactivity and the pricing.
Open `reference-build.html` to see a working version: every class in it is one to create in Webflow, and every `data-kq-*` attribute is one to add.

## 1. Add the script
1. Host `kiln-calculator.js`. Webflow can't host JS files, so put it in a GitHub repo and serve it through jsDelivr: `https://cdn.jsdelivr.net/gh/<user>/<repo>@<tag>/kiln-calculator.js`. Alternatively, paste the whole file inside a `<script>` tag.
2. Go to Page settings → Custom code → Before `</body>` tag:
   ```html
   <script src="https://cdn.jsdelivr.net/gh/<user>/<repo>@v1/kiln-calculator.js" defer></script>
   ```
3. Custom code only runs on the published site or in preview, not in the Designer canvas.

## 2. Build the layout
- Use a Link Block (or Button / Div Block) for every option. The script adds the class `is-selected` to selected options and removes it from the rest.
- The selected styles (dark fill) are set by the script, because Webflow won't share one `is-selected` combo class across several base classes. To restyle them, edit `injectStyle()` in the script.
- To set what's selected when the page loads, give that option the `is-selected` combo class in the Designer.
- **Don't hide conditional blocks in the Designer.** Leave them visible and the script will show or hide them.

Add attributes under Element settings (⚙) → Custom attributes.

### Root
On the outer wrapper of the calculator:

| Attribute | Value |
|---|---|
| `data-kq-root` | *(leave blank)* |
| `data-cta-url` | Booking page URL, e.g. `/book-a-survey` |
| `data-founding-offer` | `true` to show the founding-client offer |
| `data-demo` | `true` uses sample prices (testing only — **remove before launch**) |

### Inputs
| What | Attributes |
|---|---|
| Single-choice option | `data-kq-choice="<group>"` + `data-value="<value>"` |
| Multi-choice chip | `data-kq-toggle="<group>"` + `data-value="<value>"` |
| Appliance on/off | `data-kq-app="<id>"` |
| Appliance variant | `data-kq-variant="<id>"` + `data-value="<variant>"` |
| Variant wrapper (shown only when the appliance is on) | `data-kq-variants="<id>"` |
| Counter run row | `data-kq-run="0"`, `"1"` or `"2"` (rows the shape doesn't use are hidden automatically) |
| …inside it: −, +, value | `data-kq-run-dec`, `data-kq-run-inc`, `data-kq-run-value` |

**Groups and values**
- `shape`: `row` `L` `U`
- `build`: `simple` `moderate` `top`
- `look` (only shown when `build` is `top`): `standard` `masonry` `clad` (`clad` always shows **Enquire**)
- `worktop`: `dekton` `telford`
- `swatch-dekton` / `swatch-telford`: the colour name (12 swatches each; panels use `data-kq-if="worktop:dekton"` / `"worktop:telford"`). Colour doesn't change the price.
- `finish`: `artigiano-1` `artigiano-2` `naturateq-1` `naturateq-2`
- `pergola`: `none` `timber` `louvred` `sail` `bio`
- `size`: `2x3` `3x4` `4x4`
- `slats`: `manual` `electric`
- `zones` (multi): `path` `task` `feature`
- `extras` (multi): `walls` `heaters` `led`
- Appliance ids: `pizza` (`wood`/`gas`), `bbq` (`charcoal`/`gas`), `kamado`, `sink` (`single`/`double`), `ice`, `fridge` (`single`/`double`), `wine` (`single`/`double`), `storage` (`single`/`double`)

### Show / hide
Add `data-kq-if` to any element.
- **Match a group:** `shape:L,U`, `build:top`, `pergola:!none`
- **Flags:** `overfit` (appliance widths ≥ counter length), `partner` (new patio or base chosen), `corners`, `showSlats`, `hasPergola`, `lighting`, `gas`, `enquire`, `offer`, `demo`
- Add `!` in front of a flag to reverse it.
- Join conditions with `&`.

Examples: show a diagram only for the L-shape with `data-kq-if="shape:L"`; show the slats control with `data-kq-if="showSlats"`.

### Outputs (the script writes the text)
Add `data-kq-out="<name>"` to a text element:
`range`, `range-note`, `counter-total`, `kitchen-value`, `kitchen-detail`, `lighting-value`, `lighting-detail`, `pergola-value`, `pergola-detail`, `ground-note`, `total-weeks`, `offer-text`, `from-kitchen`, `from-cover`, `from-lighting`, `year` (current year), `fit-value`, `fit-warning`, `stage-patio-name`, `stage-utilities-note`, `stage-connection-note`.

Other output attributes:
- **Package rows:** `data-kq-package="kitchen|cover|lighting"`. The current package gets `is-selected`.
- **Timeline rows:** `data-kq-stage="survey|groundwork|utilities|patio|cure|kitchen|connection|handover|buffer"`. Rows that don't apply are hidden. Inside each row, add `data-kq-stage-num` (step number) and `data-kq-stage-dur` (duration).
- **Book button:** `data-kq-cta` on the link. The script adds the visitor's selections to the link as a query string.

## 3. Prices in the CMS (editable by the client)
1. Create a Collection called **Calculator Prices** with these fields:
   - `Name` — the key, e.g. `tier.porcelain`
   - `Low` — number
   - `High` — number (leave blank for single values)
2. Add one item per key from the list below. Leave a price blank and the calculator shows **TBC**.
3. On the calculator page, add a Collection List bound to this collection and set it to `display: none`. On the list item, add these custom attributes, binding the last three to CMS fields (the purple "+" button):
   - `data-kq-price` *(leave blank)*
   - `data-key` → Name
   - `data-lo` → Low
   - `data-hi` → High
4. Set the list's item limit to 100.

**Keys** (£; ranges are Low–High)
- **Build, per metre of counter:** `tier.modular` (all modular builds — the new patio or concrete base is charged separately by the landscaping partner), `tier.masonry`
- **Corner unit (each):** `corner.unit`
- **Appliances:** `app.pizza.wood`, `app.pizza.gas`, `app.bbq.charcoal`, `app.bbq.gas`, `app.kamado`, `app.sink.single`, `app.sink.double`, `app.ice`, `app.fridge.single`, `app.fridge.double`, `app.wine.single`, `app.wine.double`, `app.storage.single`, `app.storage.double`
- **Gas** (added once if any gas appliance is chosen — LPG bottle setup as standard; mains quoted at survey): `gas.connection`
- **Appliance widths, cm** (optional overrides, Low only): `width.pizza.gas`, `width.bbq.gas`, `width.sink.double`… Defaults live in `WIDTHS` in the script.
- **Worktop, per metre** (each corner counts as 0.6m): `worktop.dekton`, `worktop.telford`
- **Finish, per metre:** `finish.artigiano-1`, `finish.artigiano-2`, `finish.naturateq-1`, `finish.naturateq-2`
- **Lighting, per zone:** `lighting.zone`
- **Pergola band at 2×3m:** `pergola.timber`, `pergola.louvred`, `pergola.sail`, `pergola.bio`
- **Pergola size multipliers** (Low only, e.g. 1.6): `pergolaSize.2x3`, `pergolaSize.3x4`, `pergolaSize.4x4`
- **Pergola extras:** `pergola.electric`, `pergola.walls`, `pergola.heaters`, `pergola.led`
- **Package "from" figures** (Low only): `package.kitchen`, `package.cover`, `package.lighting`
- **Stage durations, in days:** `days.survey`, `days.groundwork`, `days.utilities`, `days.patio`, `days.kitchen`, `days.connection`, `days.handover`. Concrete cure is fixed at 28 days. A contingency buffer is added by job size — small (existing patio) 7 days, medium (new patio) 14 days, large (concrete base) 21–28 days; override with `days.buffer.simple`, `days.buffer.moderate`, `days.buffer.top`.

If you don't want to use the CMS, set the prices in code instead:
```html
<script>window.KILN_CONFIG = { prices: { 'tier.porcelain': [3000, 5000] }, days: { survey: [10, 15] } };</script>
```
Put this snippet before the script tag. Where both exist, CMS values override `KILN_CONFIG`.

## 4. Capture the quote in a Webflow form
- **Form on the same page:** add hidden inputs with `data-kq-field="<key>"`. They're kept filled in with the visitor's selections.
- **Form on the booking page:** the Book button passes the selections in the URL. Add the script to the booking page too, and give the hidden inputs `data-kq-prefill="<key>"`.
- **Keys:** `shape`, `counter`, `build`, `worktop`, `worktopColour`, `finish`, `appliances`, `lighting`, `pergola`, `package`, `range`.

The submission then shows up in Webflow form submissions with the full specification.

## 5. Before launch
- Remove `data-demo` from the root.
- Fill in every price and duration in the CMS.
- Set `data-founding-offer="true"` only once the Job Zero case study is live.
