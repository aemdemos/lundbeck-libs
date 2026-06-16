# Icons as List Bullets

Related issue: [aemdemos/lundbeck-libs#19](https://github.com/aemdemos/lundbeck-libs/issues/19)

## Overview

On the source site — [vyepti.com/share-your-migraine-story](https://www.vyepti.com/share-your-migraine-story) — the **“Tips for telling your story”** section uses a styled list where each item has a **custom icon** (for example, a checkmark or brand mark) instead of a normal disc or circle bullet.

The migration team needs the same authoring pattern in AEM Edge Delivery: authors write a normal list, but the rendered page shows **icon bullets**, not default HTML list markers.

## Critical requirements for this to work

Everything below must be in place. If any item is missing, icon bullets will not render correctly (or at all).

### 1. Authoring (content)

| Requirement | Why it is critical |
|-------------|-------------------|
| Content must be an **unordered list** (`<ul>` / list items in the document) | `iconsToBullets()` only targets `<ul>` with leading icons in `<li>` items |
| The **icon must be the first content** in each list item | A leading icon is how the bullet pattern is detected |
| Use **colon notation**: `:icon-name:` (no spaces inside colons) | Becomes `<span class="icon icon-name">` after pipeline or `decorateColonIcons()` |
| Icon name must match the SVG filename **without** `.svg` | `:mic-30-desktop:` → `icons/mic-30-desktop.svg` |
| **Every item** in the list should use a leading icon (for full bullet styling) | The `<ul>` gets class `icon-bullets` only when **all** `<li>` items have a leading icon |
| Bold/italic items: put `:icon:` **inside** the formatting | e.g. `** :mic-30-desktop: Bold text **` — icon remains first meaningful content |

**Avoid in list items:** time values like `1:30:40` — the client fallback may misread `:30:` as icon notation until hardened (see [Colon notation vs times](#colon-notation-vs-times)).

### 2. Icon assets

| Requirement | Why it is critical |
|-------------|-------------------|
| SVG file exists at **`icons/{name}.svg`** in the code repo | `decorateIcon()` loads `…/icons/{name}.svg` |
| SVG is **committed and pushed** to the branch serving the page | Server-side colon conversion only runs when the file exists at content-processing time |
| **Or** SVG exists in the content source **`/icons/`** folder (Google Drive / SharePoint) | Authors can add icons without a code deploy ([AEM icons docs](https://www.aem.live/developer/block-collection/icons)) |
| Icon name uses **lowercase letters, numbers, and hyphens** only | Matches `decorateColonIcons()` validation and EDS conventions |

**Available icons in this repo (examples):** `search`, `mic-30-desktop`, `badge-30-desktop`, `conversation-30-desktop`, `clock-30-desktop`, `archive-30-desktop`, `warning-30-desktop`.

### 3. Server-side pipeline (Helix / DA Live)

| Requirement | Why it is critical |
|-------------|-------------------|
| Authored `:icon-name:` is converted to `<span class="icon icon-name">` **before** or **instead of** client JS | This is the primary, production path |
| Content document is **saved/published** after icons are available | Stale content may still contain literal `:icon-name:` text |
| Preview/live branch includes the **same icon SVGs** as authored names | Mismatch → literal colon text or broken images |

### 4. Client-side decoration (`scripts.js`)

These run during the **eager** phase via `decorateMain()` → `decorateIconsAndBullets()`:

| Step | Function | Critical need |
|------|----------|---------------|
| 1 | `decorateColonIcons()` | Converts leftover `:icon-name:` text to icon spans when the pipeline did not |
| 2 | `decorateIcons()` (from `aem.js`) | Injects `<img src="…/icons/{name}.svg">` into each `.icon` span |
| 3 | `iconsToBullets()` | Adds `icon-bullets` / `icon-bullet` classes; sets bullet imgs to eager 24×24 |

**Must not** defer this to `loadLazy()` or `delayed.js` — first-section lists would flash default bullets or unstyled icons.

**Universal Editor:** `editor-support.js` must call `decorateIconsAndBullets()` (not `decorateIcons()` alone) on partial re-decoration so edits keep icon bullets.

### 5. CSS (`styles/styles.css`)

| Requirement | Why it is critical |
|-------------|-------------------|
| Icon bullet rules live in **`styles/styles.css`** (eager), not `lazy-styles.css` | Prevents FOUC/CLS when the list is above the fold |
| `:has()` rules hide default list markers when icons are present | Stops double bullets (disc + icon) before JS classes apply |
| `--icon-size` (24px) aligns with bullet `<img>` dimensions | Prevents layout shift when images load |

### 6. Page load order

```
head.html → aem.js + scripts.js (eager)
  → loadEager() → decorateMain() → decorateIconsAndBullets()
  → CSS from styles.css already applied
```

Icon bullets depend on **JS + CSS + SVG assets** together — not one alone.

### 7. Quick verification checklist

Before reporting a bug, confirm:

- [ ] List item uses `:icon-name:` as **first** content
- [ ] `icons/{name}.svg` exists locally and on the preview branch
- [ ] Hard refresh after content or code changes
- [ ] DevTools: `<span class="icon icon-{name}"><img …></span>` present in DOM
- [ ] DevTools: parent `<ul>` has class `icon-bullets` when all items have icons
- [ ] Network tab: `/icons/{name}.svg` returns 200

### Colon notation vs times

| Text | Expected behavior today | Recommended hardening |
|------|-------------------------|------------------------|
| `:mic-30-desktop: Be natural` | Icon bullet | — |
| `1:30:40` | **Risk:** `:30:` may become a bogus icon | Require icon names to **start with a letter**; scope client conversion to `<li>` only |

## Authoring workflow

Test page: [main--lundbeck-libs--aemdemos.aem.page/drafts/bullets](https://main--lundbeck-libs--aemdemos.aem.page/drafts/bullets)

Authors follow this pattern:

1. Create a normal **unordered list** (`<ul>` / list items in a document).
2. Put an **icon as the first content** in each list item.
3. Use AEM **colon notation** for the icon (for example, `:search:`), which EDS turns into markup like:

```html
<span class="icon icon-search"></span>
```

4. After page decoration, that span gets an `<img>` via the existing icon pipeline in `scripts/aem.js`:

```javascript
function decorateIcon(span, prefix = '', alt = '') {
  if (span.hasChildNodes()) return; // already decorated
  const iconName = Array.from(span.classList)
    .find((c) => c.startsWith('icon-'))
    .substring(5);
  const img = document.createElement('img');
  img.dataset.iconName = iconName;
  img.src = `${window.hlx.codeBasePath}${prefix}/icons/${iconName}.svg`;
  // ...
}

function decorateIcons(element, prefix = '') {
  const icons = element.querySelectorAll('span.icon');
  [...icons].slice(0, MAX_LOOP_ITERATIONS.icons).forEach((span) => {
    decorateIcon(span, prefix);
  });
}
```

Today, icons inside list items are treated as inline content — they do **not** replace the default bullet without the decoration pipeline below.

## Implementation (current)

Implemented in `scripts.js` (Option B) as **`decorateIconsAndBullets()`**:

```javascript
export function decorateIconsAndBullets(element, prefix = '') {
  decorateColonIcons(element);   // :icon-name: text → <span class="icon">
  decorateIcons(element, prefix); // span → <img>
  iconsToBullets(element);        // bullet classes + eager 24×24 imgs
}

export function decorateMain(main) {
  decorateIconsAndBullets(main);
  buildAutoBlocks(main);
  decorateSections(main);
  decorateBlocks(main);
  decorateButtons(main);
  a11yLinks(main);
}
```

Also wired in `editor-support.js` for Universal Editor re-decoration.

## What was built

A function (likely named something like `iconsToBullets` or `decorateIconBullets`) that:

1. Finds lists (`<ul>`) whose `<li>` items start with an icon.
2. Restructures or classifies them so the icon sits in the bullet position (not as ordinary inline text beside a disc).
3. Adds CSS (in `styles/styles.css` or a related utility) to:
   - hide default `list-style`
   - position the icon where the bullet would be
   - keep text aligned correctly

The visual goal matches Vyepti: branded icon markers, consistent spacing, and support for bold or italic text within the same item.

## Implementation options

The issue leaves the approach open but suggests evaluating these two paths.

### Option A — Hook into icon decoration (`decorateIcon` / `decorateIcons`)

When an icon is decorated, check whether it is the **first child** of a `<li>`. If so, treat it as a bullet (add a class, wrap it, move it, etc.).

**Pros:**

- Runs at the same time icons are processed; one pass, no duplicate logic.

**Cons:**

- `decorateIcon` lives in `aem.js`, which this repo treats as **do not modify**. If you extend that logic, **move the function to `scripts.js`** instead of changing core AEM code.

### Option B — Separate DOM pass in `scripts.js`

After `decorateIcons(main)` in `decorateMain`, run a dedicated function that scans for `<li>` elements whose first meaningful content is a `.icon` span.

**Pros:**

- Keeps `aem.js` untouched; clear, isolated feature; easy to call from one place in the page lifecycle.

**Cons:**

- Second pass over the DOM; must run **after** icons are decorated (so `<img>` exists) but alongside or before final styling.

Current decoration flow in `scripts/scripts.js` — see [Implementation (current)](#implementation-current) above.

## Performance considerations

This project targets a PageSpeed score of 100 (see [AGENTS.md](../AGENTS.md)). The choice between `aem.js` and `scripts.js` has **little direct impact on Core Web Vitals**; what matters is *how* the feature is implemented.

### Short answer: `aem.js` vs `scripts.js`

**There is no meaningful Vitals advantage to putting this in `aem.js` vs `scripts.js`.** Both files load eagerly from `head.html` before LCP work runs, and `decorateIcons` is already called from `decorateMain()` during the **eager** phase:

```javascript
async function loadEager(doc) {
  const main = doc.querySelector('main');
  if (main) {
    decorateMain(main);
    document.body.classList.add('appear');
    await loadSection(main.querySelector('.section'), waitForFirstImage);
  }
}
```

The feature runs on the main thread in the same critical window either way. **`scripts.js` is the better choice** for maintainability (project rule: do not modify `aem.js`), not because it is faster.

| Factor | `aem.js` | `scripts.js` |
|--------|----------|--------------|
| Load timing | Eager (`head.html`) | Eager (`head.html`) |
| Runs before LCP | Yes (via `decorateMain`) | Yes (via `decorateMain`) |
| Vitals impact | Same if logic is equivalent | Same if logic is equivalent |
| Maintainability | Do not modify per project rules | Intended home for custom utilities |
| Scope of cost | Core lib grows for all pages | Project-specific layer |

### What actually affects Core Web Vitals

#### CLS (Cumulative Layout Shift) — highest risk

Icon bullets are the main Vitals concern, not file location.

- Before JS runs, authors see a normal `<ul>` with default disc bullets **plus** inline icon spans — possible double markers or layout jump when JS/CSS apply.
- `decorateIcon` injects `<img>` with `width="16"` / `height="16"`, while global CSS uses `--icon-size: 24px` — a size mismatch can cause shift when the image loads.
- Icons use `loading="lazy"` by default in `decorateIcon`. For **above-the-fold** bullet lists, lazy icons can pop in late and cause layout or visual flash.

**Mitigations (regardless of file):**

- Put bullet list CSS in **`styles/styles.css`** (eager), not `lazy-styles.css`, if the list can appear above the fold.
- Reserve space with fixed dimensions: `list-style: none`, consistent `padding-left`, fixed icon box size.
- Align JS `width`/`height` with CSS `--icon-size`.
- Prefer **class + CSS** over heavy DOM restructuring (fewer reflows, less CLS).
- For visible bullet icons, consider **`loading="eager"`** or CSS-based bullets (`background-image` / `mask`) to avoid late image paint.

#### LCP (Largest Contentful Paint) — low risk

Tip lists with icon bullets are usually **not** the LCP element (hero image or heading is). Putting logic in `aem.js` vs `scripts.js` does not change LCP. Only consider LCP if icon bullets appear in the first section alongside the LCP candidate — still uncommon.

#### TBT / INP (main-thread work) — minor difference

Both implementation options run synchronously in `loadEager` before the first section finishes loading.

| Approach | Main-thread impact |
|----------|-------------------|
| Hook into `decorateIcon` (single pass) | Slightly less DOM work — one loop over icons |
| Separate `iconsToBullets()` pass in `scripts.js` | One extra `querySelectorAll` over lists — negligible for typical list sizes (e.g. 8 items) |

On a Vyepti-style tips list, the difference is microseconds and will not move PageSpeed from 100 to 99.

What **does** add TBT:

- Scanning the entire `main` with broad selectors on every page, even when no icon lists exist.
- Layout thrashing (read layout → mutate DOM → read layout in a loop).

**Mitigation:** Scope queries (for example, `main ul:has(li > .icon)`) and early-exit when no matches are found.

#### Network / resource loading

Each colon-notation icon becomes an SVG request via `<img src=".../icons/{name}.svg">`. Eight bullets ≈ eight small SVGs — usually fine on HTTP/2. This is the same whether logic lives in `aem.js` or `scripts.js`, because `decorateIcon` already creates the images.

`aem.js` is only worse if bullet-specific code **inflates the core library on every page**, including pages with no icon lists. `scripts.js` keeps that growth in the project layer, but the bytes difference is tiny for this feature.

#### Loading phase (eager vs lazy vs delayed)

| Phase | What runs | Relevance |
|-------|-----------|-----------|
| **Eager** (`loadEager`) | `decorateMain` → `decorateIcons` | Icon bullets must run here if the list is in the first section |
| **Lazy** (`loadLazy`) | Remaining sections, header/footer | Too late for first-section lists — would cause flash/CLS |
| **Delayed** (`delayed.js` via `requestIdleCallback`) | Analytics, martech | Wrong place for structural decoration |

Do **not** defer `icons-to-bullets` to lazy or delayed loading.

### Recommended approach for Vitals + architecture

1. **Implement in `scripts.js`** — wrap or extend after `decorateIcons`, not in `aem.js`.
2. **Prefer a single pass** — either extend the icon decoration wrapper in `scripts.js` or run `iconsToBullets` immediately after `decorateIcons` with a scoped selector.
3. **CSS-first in `styles.css`** — hide default bullets and reserve icon space before/at first paint.
4. **Fix icon dimensions** — match `img` attributes to `--icon-size` (24px in this repo).
5. **Revisit `loading="lazy"`** for bullet icons in visible lists.
6. **Call the same utility from UE paths** in `editor-support.js` after `decorateIcons`, so edits do not cause layout jumps.

### Performance bottom line

Choosing `aem.js` over `scripts.js` will **not** improve Lighthouse or Core Web Vitals for this feature. Both are on the same eager critical path.

What protects the score:

- **CLS:** stable layout via critical CSS and consistent icon sizing
- **TBT:** scoped, early-exit DOM work
- **LCP:** keep bullet logic out of delayed/lazy phases
- **Network:** accept small SVG count, or use CSS bullets if zero extra requests are required

## Summary

| Piece | Meaning |
|-------|---------|
| **Source reference** | Vyepti “Tips” list with icon bullets |
| **Authoring** | Normal list + colon-notation icon as first item content |
| **Test page** | `/drafts/bullets` on the preview site |
| **Deliverable** | JS + CSS so icon-led list items render as icon bullets |
| **Architecture note** | Prefer `scripts.js`; do not modify `aem.js` |
| **Performance note** | No Vitals gain from `aem.js`; optimize CSS, image loading, and DOM scope instead |

This is not a new block — it is a **cross-cutting decoration utility** that turns “list item starting with `:iconname:`” into the Vyepti-style icon bullet list, using icons in `/icons/` (for example, `search.svg`; any colon-notation icon works once added to that folder).

## Troubleshooting

### Colon notation shows as literal text (e.g. `:mic-30-desktop:`)

EDS converts `:icon-name:` to `<span class="icon icon-name">` **server-side** when the matching SVG exists at content-processing time:

- **Code repo:** `icons/{name}.svg` (committed on the branch serving the page)
- **Content source:** `/icons/{name}.svg` in Google Drive / SharePoint (per [AEM icons docs](https://www.aem.live/developer/block-collection/icons))

If the SVG is missing from both locations, the colon text is delivered unchanged. `decorateIcons` only decorates existing `.icon` spans — it does not parse colon notation.

This project also runs **`decorateColonIcons()`** in `scripts.js` before `decorateIcons` as a client-side fallback when the pipeline left `:icon-name:` as text (common during local dev before new icons are committed and pushed).

**Checklist:**

1. Confirm `icons/mic-30-desktop.svg` exists and is **committed/pushed** to your preview branch
2. Hard-refresh `http://localhost:3000/drafts/bullets` after adding icons
3. In authored content, use exact notation with no extra spaces inside colons: `:mic-30-desktop:` not `: mic-30-desktop :`
4. Optionally upload the SVG to the content source `/icons/` folder so authors can add icons without a code deploy

## Validation

After implementation, verify against:

- [Test page — `/drafts/bullets`](https://main--lundbeck-libs--aemdemos.aem.page/drafts/bullets)
- [Source reference — Vyepti share your story](https://www.vyepti.com/share-your-migraine-story)

Check that list items with a leading icon:

- show no default disc or circle marker
- display the icon in the bullet position with correct alignment
- preserve inline formatting (bold, italic) in item text
- remain editable in Universal Editor (re-decoration path in `editor-support.js` should call the same utility after `decorateIcons`)

Performance validation:

- Run [PageSpeed Insights](https://developers.google.com/speed/pagespeed/insights/) on the preview URL; target score 100
- Confirm no CLS from bullet icons loading (check mobile and desktop)
- Confirm no flash of default disc bullets before decoration (FOUC)
