# Design System — Lumber Employee Profile

A reference for the visual language used in this prototype. All values map to CSS custom properties defined in `:root` of `src/css/styles.css`.

---

## Color tokens

| Token | Hex | Usage |
|---|---|---|
| `--nav-bg` | `#003435` | Not currently used (nav uses `#2c2c2c`) |
| `--white` | `#ffffff` | Backgrounds, card surfaces |
| `--50` | `#f6f7f9` | Page background, toolbar background |
| `--100` | `#eceff2` | Hover states |
| `--150` | `#e4e7eb` | Dividers, card borders |
| `--200` | `#d5dbe2` | Subtle borders |
| `--300` | `#b6bfca` | Separator dots |
| `--400` | `#8597ab` | Placeholder text, icon default |
| `--600` | `#5a6878` | Secondary text, inactive nav |
| `--800` | `#394553` | Body text, form labels |
| `--900` | `#1f2937` | Headings, active items |
| `--blue` | `#2970ff` | Primary actions, focus rings, active states |
| `--blue-hover` | `#1a5ff0` | Primary button hover |
| `--green-bg/border/text` | `#ecfdf3 / #abefc6 / #067647` | Enabled status badge |
| `--yellow-bg/border/text` | `#fffaeb / #fedf89 / #b54708` | Pending status badge |
| `--red-bg/border/text` | `#fef3f2 / #fda29b / #b42318` | Disabled status badge |

---

## Typography

- **Font family:** Inter, then system sans-serif fallbacks
- **Body / table:** 13–14px, weight 400–500, color `--800`
- **Labels:** 13px, weight 500, color `--800`
- **Section headings (drawer):** 16px, weight 700, color `--900`
- **Page title:** 28px, weight 700, letter-spacing -0.01em
- **Drawer name:** 18px, weight 700
- **Meta / secondary:** 13px, color `--600`

---

## Layout

### Navigation bar
- Height: 56px, background `#2c2c2c`, sticky top
- Logo mark: 28px circle, `#7aecb4` background with dark SVG
- Nav buttons: 13px, rounded 6px, transparent background; active state uses `#1a1a1a`
- Company switcher: 180px wide, bordered pill, right-aligned

### Page structure
- Page header: white, `padding: 20px 32px 0`
- Body container: `padding: 16px 32px 32px`, background `--50`
- Cards: white, 1px `--150` border, 10px radius, overflow hidden

### Profile drawer
- Overlay: `rgba(0,0,0,0.4)`, z-index 250
- Drawer: slides in from right, `top: 24px`, rounded top-left corner (16px), max-width 1280px
- **Sidebar**: 280px wide, white, right border `--150`
  - Clocked-in banner: green pill at top (`#d1fadf` bg)
  - Avatar: 72px square, 12px radius, dark green gradient, 2-letter initials
  - Nav items: 14px, active state has white bg + `--150` border + subtle shadow
- **Content area**: flexible, scrollable body
  - Header: `padding: 24px 32px 16px`
  - Body: `padding: 0 32px 24px`
  - Footer: Cancel + Save buttons, right-aligned, border-top

---

## Components

### Buttons

| Class | Description |
|---|---|
| `.btn` | Default: white bg, `--gray-border` border, `--800` text |
| `.btn-primary` | Blue bg, white text |
| `.btn.disabled` | 55% opacity, not-allowed cursor |
| `.action-btn` | Smaller (7px 12px pad), for toolbar actions |
| `.btn-inline-link` | Text-only, blue, no border — inline links (e.g. "View Applicable Taxes") |

### Form fields

All inputs use class `.field-input`:
- `padding: 9px 12px`, 1px `--gray-border` border, 8px radius
- Focus: blue border + `rgba(41,112,255,0.12)` box-shadow
- Placeholder color: `--400`

**Select dropdowns** — wrapped in `.select-wrapper` for custom chevron arrow.

**Phone inputs** — `.input-with-prefix` wraps a flag/code prefix + bare `<input>`. The prefix has a right border divider.

**Date fields** — `.date-input` adds a calendar icon via CSS `::after`.

**Ethnicity checkbox** — uses native `<input type="checkbox">` styled with `accent-color: var(--blue)`, inside `.checkbox-field-label` flex row.

**Textarea** — `.field-input.field-textarea`, `min-height: 80px`, resizable.

### Status badges

`.badge` + modifier:
- `.badge-enabled` — green
- `.badge-pending` — yellow/amber
- `.badge-disabled` — red

Each has a 6px colored dot (`.badge-dot`) on the left.

### Checkboxes (large, for form rows)

`.cb-large` inside `.checkbox-row`:
- 18px square, 5px radius
- Unchecked: white + `--gray-border`
- Checked: `--blue` background, white checkmark SVG

### Toasts

Fixed bottom-right, dark `--900` background, slide-up animation, 2.4 s auto-dismiss.

---

## Profile page — field layout

### Personal Details (3-column grid)

| Col 1 | Col 2 | Col 3 |
|---|---|---|
| First Name * | Middle Name | Last Name * |
| Preferred Name | Gender | Date of Birth |
| Birth Place | Language | Marital Status |
| Ethnicity (checkbox) | Race | Disability Status |

### Contact Details (3-column grid)

| Col 1 | Col 2 | Col 3 |
|---|---|---|
| Work Email | Secondary Email | Phone Number * |
| Residential Address * (span 2) | | Unit, Apt |
| City * | State * | Zip Code * |

Below the grid:
- **Tax Jurisdiction** — inline label + location + "View Applicable Taxes" text link
- **Mailing same as residential** — large checkbox row

### Emergency Contact Details (3-column grid)

| Col 1 | Col 2 | Col 3 |
|---|---|---|
| Contact Name | Phone Number | Relationship |

### Notes

Single full-width textarea.

---

## Drawer navigation items (in order)

1. Profile
2. Employment
3. Timesheet
4. Pay
5. Time Off
6. Scheduler
7. Credentials
8. Assignments
9. Documents
10. Roles & Permissions
11. Awards
12. Attendance Exceptions
13. Additional Settings
