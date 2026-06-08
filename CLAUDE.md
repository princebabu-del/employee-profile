# Employee Profile — Lumber Users page

A static prototype of Lumber's **Users / Employee Profile** screen. Plain HTML + CSS + vanilla JavaScript — no framework, no build step.

## What this app does
- Lists employees in a sortable, filterable, paginated table (mock data of 347 rows).
- Supports row selection, bulk actions (enable/disable, SMS, etc.), and CSV download.
- Opens a side **profile drawer** when you click a row, with Personal/Contact/Emergency/SSN sections.
- "Add Employee" modal to append a new row.
- Tabs for Employees / Contractors / Crews / Archive / Issues (only Employees has data).

The data is generated in-memory by `src/js/data.js`. Nothing is persisted — refreshing the page resets everything.

## Folder structure

```
.
├── index.html          # Page markup. Loads CSS + JS from src/.
├── package.json        # npm config; declares live-server as a dev dependency.
├── .gitignore
├── CLAUDE.md           # (this file)
└── src/
    ├── css/
    │   └── styles.css  # All styles (design tokens in :root, then components).
    ├── js/
    │   ├── data.js     # Sample data + row generator. Load this BEFORE main.js.
    │   └── main.js     # Tabs, sort, filter, render, modal, drawer, toast, CSV.
    └── assets/         # (empty — for future images/icons)
```

## Running locally

Requires Node.js (which includes npm). One-time setup:

```bash
npm install      # installs live-server into node_modules/
npm start        # opens http://localhost:3000 with auto-reload
```

`npm start` runs `live-server`, which watches the folder and refreshes the browser on every save. Edit `index.html`, `styles.css`, or anything in `src/js/` and the page reloads automatically.

## Conventions

- **CSS design tokens** live in `:root` at the top of `styles.css` (colors like `--blue`, `--900`, `--green-text`, etc.). Use the tokens instead of hard-coding hex values.
- **State** is a set of module-level `let` variables at the top of `main.js` (`allData`, `filteredData`, `currentPage`, `selectedIds`, etc.). After mutating state, call `applyFilters()` to re-render.
- **Rendering** is plain `innerHTML =` with template strings — no virtual DOM. The single render entry point is `renderPage()`.
- **Event handlers** are inline `onclick="..."` attributes in the HTML that call functions defined in `main.js`. All handler functions are global on purpose so the inline attributes can see them.
- **Toasts** are how the UI confirms actions: `toast('Message here')`.

## Right-side pane anatomy (locked structure)

All right-side overlay panes (Taxes, Manager History, Timeline, Pay Rates, Time Off Request, and any new ones) MUST follow this exact structure and class names. Do not invent new wrappers, rename classes, or change the spacing values without explicit instruction.

```html
<div id="somethingPane" class="pane">
  <!-- Header: padding 16px 24px, gap 16px between children -->
  <div class="pane-hd">
    <div class="pane-hd-text">           <!-- padding: 2px 0 -->
      <span class="tl-pane-title">Title</span>
    </div>
    <!-- Optional extra right-side controls go here, gap 16px -->
    <button class="tl-pane-close" onclick="closeSomethingPane()">
      <svg width="24" height="24" viewBox="0 0 18 18" fill="none">
        <path d="M14 4L4 14M4 4l10 10" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
      </svg>
    </button>
  </div>

  <!-- Body: padding 24px, gap 24px between sections -->
  <div class="pane-body">
    <div class="pane-section">         <!-- flex column, gap 0 -->
      <div class="pane-section-hd">    <!-- margin-bottom: 16px → gap to content -->
        <div class="pane-section-hd-text">Section heading</div>
        <div class="pane-section-hd-action"><!-- optional action button --></div>
      </div>
      <!-- section content -->
    </div>
    <!-- more .pane-section blocks; body gap handles spacing between them -->
  </div>
</div>
```

**Anatomy locks (do not change without instruction):**
- `.pane-hd` — padding `16px 24px`, gap `16px`.
- `.pane-hd-text` — padding `2px 0`.
- `.tl-pane-close` — 36×36 button, 24×24 icon inside.
- `.pane-body` — padding `24px`, gap `24px` between sections.
- `.pane-section` — flex column, gap `0` (header sits flush against content).
- `.pane-section-hd` — margin-bottom `16px` (this is the header→content gap).

When the user mentions "right-side pane," default to this structure. Existing static markup lives in `index.html` (Time Off Request); JS-generated panes use template strings inside functions like `buildPayRateHistoryPaneBody()` and the Taxes section builder — both already emit `<div class="pane-section">…</div>`.

## Section header anatomy (locked structure)

Drawer and page section headers use `.section-hd`. Use this exact structure and class names — do not invent new wrappers or change the spacing values without explicit instruction.

```html
<div class="section-hd">
  <div class="section-hd-text">
    <span class="pay-sh">Section title</span>
  </div>
  <div class="section-hd-action">
    <!-- optional action button(s) -->
  </div>
</div>
```

**Anatomy locks (do not change without instruction):**
- `.section-hd` — flex row, `align-items: center`, `justify-content: space-between`, gap `24px`, margin-bottom `24px`.
- `.section-hd-text` — flex column, gap `2px` (title + optional subtitle).
- `.section-hd-action` — flex row, `align-items: center`, gap `16px`, `flex-shrink: 0`.
- `.pay-sh` — title text: 20px / 600 weight / line-height 32px / `var(--900)`, `margin-bottom: 0` inside `.section-hd`.

Note: this is the drawer/page-level section header. Right-side panes use the separate `.pane-section-hd` documented above — do not mix the two.

## Primary and Secondary buttons

Two standard button styles used across all tabs for toolbar actions like "Add Credential", "Create Leave", "Add Pay Rate", etc. Always use these classes — do not invent new button styles or apply inline overrides for size/font/radius.

### Primary action button (blue) — toolbar CTA

```html
<button class="pay-action-btn" style="background:var(--blue);border-color:var(--blue);color:var(--white);"
        onmouseover="this.style.background='var(--blue-hover)';this.style.borderColor='var(--blue-hover)'"
        onmouseout="this.style.background='var(--blue)';this.style.borderColor='var(--blue)'"
        onclick="…">
  <svg width="16" height="16" …/>  <!-- optional leading icon -->
  Add Credential
</button>
```

**Locked specs (from `.pay-action-btn` + blue override):**
- Height: `44px`, padding: `0 20px`, gap: `8px`
- Font: `16px / 600 / inherit family`
- Border-radius: `8px`
- Background: `var(--blue)`, hover: `var(--blue-hover)`
- Color: `var(--white)`

### Secondary gray action button — toolbar neutral

```html
<button class="pay-action-btn" onclick="…">
  <svg width="16" height="16" …/>  <!-- optional leading icon -->
  Create Leave
</button>
```

**Locked specs (`.pay-action-btn` default):**
- Height: `44px`, padding: `0 20px`, gap: `8px`
- Font: `16px / 600 / inherit family`
- Border-radius: `8px`
- Background: `var(--white)`, hover: `var(--50)`
- Color: `var(--800)`
- Border: `1px solid var(--gray-border)`, hover: `var(--300)`

Use the gray variant for neutral/secondary toolbar actions and the blue variant for the primary CTA (e.g. "Add …" buttons).

## Primary Link button

A text-only blue link button used for secondary in-section actions (View History, View Timeline, View Manager History, etc.). Use this exact class — do not invent new link-button styles or override font/weight.

```html
<button class="field-helper-link" onclick="…">View History</button>
```

**Locked specs:**
- Class: `.field-helper-link`
- Font: `14px / 600 (semibold) / inherit family`
- Color: `var(--blue)` (hover: `opacity: 0.75`)
- No background, no border, padding `0` — pure link styling
- Inactive state available via `.field-helper-link--inactive` (gray, non-interactive)

When the design calls for a "link button" or "text link" (e.g., a secondary action like "View History" sitting in a `.section-ftr`), default to `.field-helper-link`. Do not use `<a>` tags or invent new classes.

## Secondary blue button (drawer footer)

An outlined blue button used as a middle-ground action in drawer footers — sits between a neutral "Discard/Cancel" button and a filled primary "Add/Save" button. First used in the Add Earning drawer ("Save & Add Another").

```html
<button class="drawer-btn drawer-btn-secondary" onclick="…">Save &amp; Add Another</button>
```

**Locked specs:**
- Classes: `.drawer-btn` + `.drawer-btn-secondary`
- Background: `var(--white)`, border: `var(--blue)`, color: `var(--blue)`
- Hover: light blue tint background (`#eff6ff`), border stays `var(--blue)`
- Disabled: `opacity: 0.4`, `cursor: not-allowed`
- Same height/padding/font as all `.drawer-btn` variants (44px height, 16px/600)

Use `.drawer-btn-secondary` whenever a footer needs a secondary action that is blue but not filled — do not invent new outline styles. Pair it with `.drawer-btn` (neutral) on the left and `.drawer-btn-primary` (filled blue) on the right.

## Timeline component (locked structure)

A vertical timeline of events (Activity Log, Manager History, etc.). Use this exact structure and tokens — do not invent new dot/line sizes, colors, or font weights without explicit instruction.

```html
<div class="timeline">
  <div class="timeline-item">
    <div class="timeline-line">
      <div class="timeline-dot"></div>     <!-- optional modifier: --approved / --active / --upcoming / --past -->
      <div class="timeline-connector"></div> <!-- omit on last item -->
    </div>
    <div class="timeline-content">
      <div class="timeline-primary">Approved</div>
      <div class="timeline-secondary">By John Smith · May 27, 2026</div>
    </div>
  </div>
  <!-- more items -->
</div>
```

**Locked specs:**
- **Primary text:** 16px / 500 weight (medium) / `var(--800–900)`
- **Secondary text:** 14px / 400 weight (regular) / `var(--500)`
- **Primary → secondary gap:** `4px` (gap on parent container, no margin-top on secondary)
- **Dot → content gap:** `12px`
- **Dot:** 12×12 circle, default `var(--300)` gray; status colors are scoped modifiers
- **Connector line:** 2px wide, `var(--200)` gray
- **Gap between dot and adjacent line segments:** `2px` (above and below)

In `index.html` the existing implementations use class prefixes `.tor-activity-*` (Activity Log inside Leave Request pane) and `.tl-feed-*` (Manager History pane). Both follow the locked specs above — match those tokens when adding any new timeline.

## Dropdown button

A bordered pill-style dropdown trigger used in toolbars (e.g. "Maternal Leave", "All Status"). Use `.to-filter-select` — do not invent new dropdown trigger styles.

```html
<div class="to-filter-select" onclick="…">
  Label text
  <svg width="20" height="20" viewBox="0 0 16 16" fill="none">
    <path d="M4 6l4 4 4-4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>
</div>
```

**Locked specs:**
- Class: `.to-filter-select`
- Height: `44px`, padding: `0 16px`, gap: `8px` between label and chevron
- Font: `16px / 600 / inherit family`, color: `var(--800)`
- Border: `1px solid var(--gray-border)`, border-radius: `8px`, background: `var(--white)`
- Hover: border-color `var(--blue)`
- Chevron icon: 20×20

Use this whenever a toolbar needs a labeled dropdown trigger. The `onclick` can open a custom dropdown, a toast, or any handler. Do not use `<select>` for this pattern.

## When making changes

- New sample data fields → add to the object literal in `genRows()` in `src/js/data.js`, then read them in `renderPage()` in `main.js`.
- New columns → add a `<th>` in `index.html`, render a `<td>` in `renderPage()`, and update the `colspan="14"` in the empty-state rows.
- New bulk action → add a button to the action-toolbar in `index.html`, add its id to the array in `updateBulkActionState()`, and handle the label in `bulkAction()`.

## Legacy file

`users.html` is the original single-file prototype that everything was extracted from. It's kept as a reference and can be deleted once the new structure is confirmed working.
