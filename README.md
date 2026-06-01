# Journey Prototype Base

A **zero-dependency, single-file** mobile-app prototype you can fork to build new
product "journeys" fast. Everything — markup, styles, state, routing, animations —
lives in one `index.html`. No build step, no npm install, no framework. Open it in a
browser and it runs.

The included reference journey is **Cars24 "Deemed Ownership"** (the RC transfer
flow: seller → Cars24 → buyer, with 7 verification checks). Use it as the template
for your own journeys.

**Live demo:** https://arundhatimahapatro-holymuse.github.io/do-prototype/

---

## Why this base

- **One file to copy.** Fork = duplicate `index.html`. That's the whole "project."
- **In-app routing.** Screens are `<div>`s toggled by JS — no page reloads, feels like
  a real app inside the phone frame.
- **Shared in-memory state.** A single `S` object drives every screen, so an action on
  one screen (pay a bill, renew a policy) instantly updates banners, checklists and the
  end celebration everywhere else.
- **Design-system theming.** Swap the whole look (color + font) by flipping one
  `data-theme` attribute. Three themes ship out of the box.
- **Reusable components.** Status bar, stepper, cards, payment bottom-sheet, checklist,
  loading→verify→celebrate sequence, explainer carousel, confetti — all copy-paste-able.

---

## Run it locally

No install needed. Pick any static server:

```bash
# Node
npx serve .

# or Python
python3 -m http.server 8000
```

Then open the printed URL (e.g. `http://localhost:8000`). Or just double-click
`index.html` — it works straight from the filesystem too.

---

## Architecture in 60 seconds

```
#app[data-theme]            ← the 390×844 phone frame; theme lives here
  .screen#s-flow   (active) ← first screen: choose a scenario
  .screen#s-lock            ← lock-screen push notification
  .screen#s-price           ← each journey step is one .screen
  .screen#s-...             ← (challan / insurance / deal / handover / ready)
  #do-explainer             ← reusable modal carousel
  #do-happy-pop             ← reusable popup
.controls                   ← Restart + theme switcher (outside the phone)
<script>                    ← all logic: state, router, components
```

### 1. Screens & routing

Every screen is `<div class="screen" id="s-NAME">`. Only `.screen.active` is visible.
Navigate with:

```js
go('price');   // shows #s-price, hides the rest
```

`go()` also runs per-screen hooks (re-render the checklist, sync the banner, kick off
the ready animation, etc.) — see the `if (id === ...)` blocks inside it.

### 2. State

One in-memory object is the single source of truth:

```js
var S = { flow:'pending', echallan:false, insurance:false };
function doneCount(){ return 5 + (S.echallan?1:0) + (S.insurance?1:0); }
```

Mutate `S`, then call `go(currentScreen)` (or the relevant `render*` helper) and the UI
re-derives itself. No state lives in the DOM. `restart()` resets `S` and returns to the
flow chooser.

### 3. The flow chooser (first interaction)

`#s-flow` lets the user pick a scenario before anything else:

```js
chooseFlow('happy');    // all checks pre-passed
chooseFlow('pending');  // some checks failing  → user must resolve them
```

This sets `S` and routes to the lock screen → tap the notification → the journey opens.

### 4. Theming

Themes are CSS-variable bundles selected by `data-theme` on `#app`:

| Theme         | Brand color | Font    |
|---------------|-------------|---------|
| `cars24`      | `#4736FE`   | Geist   |
| `carsinfo`    | `#13C2C2`   | Manrope |
| `vehicleinfo` | `#456DFF`   | Geist   |

```js
setTheme('carsinfo', btn);   // restyles the entire app live
```

Components read tokens like `--lego-color-surface-brand-primary-rest`,
`--lego-color-text-brand-primary-rest`, `--lego-font`, `--do-primary` — never hard-code
brand colors in new components, use the variables so theming keeps working.

### 5. Reusable building blocks

- **Checklist** — `renderChecklist(containerId, ownerScreen)` renders a progress card
  that shows 3 items, fades the rest, and reveals all via a "View all" button. Pending
  items get an action button that opens a sub-flow.
- **Sub-flows** — `openSub(kind, ownerScreen)` / `closeSub()` push a task screen
  (payment, renewal) and return to wherever you launched it via `subReturn`.
- **Payment bottom-sheet** — method → card → OTP → success (`openSheet`, `pickPM`,
  `methodNext`, `cardNext`, `autoOtp`, `submitOtp`).
- **Ready sequence** — `startReadyAnimation()` runs loading → animated per-item
  verification (progress ring) → confetti celebration. The celebration is **gated**:
  it only fires when every check passes.
- **Explainer carousel** — `showExplainer()` auto-advances CSS scenes with a progress bar.

---

## Fork it: create a new journey

1. **Copy the base**
   ```bash
   cp index.html my-new-journey.html   # (or start a new repo from this one)
   ```

2. **Redefine your state.** Replace the `S` object and `doneCount()` with the variables
   your journey needs.

3. **Lay out your screens.** For each step add:
   ```html
   <div class="screen" id="s-mystep"> ... </div>
   ```
   and move between them with `go('mystep')`. Reuse `.status-bar`, `.sell-header`,
   `.stepper`, `.card`, `.cta-bar` from the existing screens.

4. **Wire the router.** If a screen needs to refresh data when shown, add an
   `if (id === 'mystep') { ... }` branch inside `go()`.

5. **Reuse components, not colors.** Drop in the checklist / payment sheet / ready
   sequence as needed, and style new pieces with the CSS variables so all three themes
   keep working.

6. **Keep the chooser pattern** (optional but recommended): start on a scenario picker
   so a single prototype can demo both the happy path and the edge cases.

That's it — no framework concepts to learn. If you can edit HTML/CSS/JS in one file,
you can ship a new journey.

---

## Deploy your fork (public link)

GitHub Pages, from a **public** repo, branch `main`, root folder:

```bash
gh repo create my-journey --public --source=. --remote=origin --push
gh api -X POST repos/<you>/my-journey/pages -f 'source[branch]=main' -f 'source[path]=/'
```

Live in ~1 minute at `https://<you>.github.io/my-journey/`.
(Pages needs a **public** repo on the free plan.)

---

## Conventions cheat-sheet

| Thing                 | Pattern                                             |
|-----------------------|-----------------------------------------------------|
| New screen            | `<div class="screen" id="s-x">` + `go('x')`         |
| Show/hide             | toggle `.active` (screens), `.show` (modals/sheets) |
| Brand color in CSS    | `var(--lego-color-surface-brand-primary-rest)`      |
| Font in CSS           | `var(--lego-font)`                                  |
| Reset demo            | `restart()`                                         |
| Phone frame           | `#app` — 390 × 844, theme attribute lives here      |

---

*Generated as a reusable base from the Cars24 Deemed Ownership prototype.*
