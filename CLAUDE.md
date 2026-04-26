# PersonalDashboard — Claude Context

## Project Overview
GitHub Pages site at https://blharmon24.github.io (repo: blharmon24/personal-dashboard). Plain HTML/CSS/JS, no build tools. Entry point is `index.html` with a fixed dark-theme sidebar. Version string lives in the sidebar footer: `<span class="version">vYYYY.MM.DD.N</span>` in index.html.

**Tools in Misc Projects:**
- `general-conference-formatting.html` — PDF note margin tool (add ruled writing space to printed General Conference talk PDFs)
- `pdf-merger.html` — Merge multiple PDFs sorted by X-Y filename pattern, inserts session divider pages

**External project links in sidebar (open in new tab):**
- BNAP Ledger: https://blharmon24.github.io/bnab-ledger/
- IT Dashboard: https://blharmon24.github.io/slcsd-it-dashboard/dashboard.html

When adding new tools, follow the project card pattern in index.html and bump the version number on every push.

---

## pdf-lib UMD Bundle Gotchas
pdf-lib 1.17.1 is loaded via CDN/UMD. `PDFLib.StandardFonts` enum is NOT reliably exposed — accessing it returns `undefined`, causing a silent crash.

**Always use string literals instead of the enum:**
- `'Times-Roman'`, `'Times-Bold'`, `'Times-BoldItalic'`, `'Times-Italic'`
- `'Helvetica'`, `'Helvetica-Bold'`

Never write `StandardFonts.TimesRoman` etc. — always use the string literal form.

---

## GC Formatting Tool — PDF Architecture

**Bottom margin mode (default, preferred):** Uses `copyPages + setMediaBox/setCropBox`. Copies content stream directly — preserves original text rendering and uniform line spacing. Extends MediaBox in all four directions. Lines drawn with `drawLine` in the extended area.

**Side margin mode:** Uses `embedPages + drawPage` (re-encodes page as XObject). Introduces sub-point coordinate rounding causing non-uniform line spacing. This is why bottom mode is the default.

**GCDividerPage marker:** pdf-merger stamps divider pages with a custom PDF dict entry:
```js
page.node.set(PDFName.of('GCDividerPage'), mergedDoc.context.obj(true));
```
The formatting tool checks for this and skips margin processing on those pages:
```js
const isDivider = srcPage.node.get(PDFLib.PDFName.of('GCDividerPage'));
```

**Bottom mode sliders:** Note margin height, Binding gutter, Top margin, Side margins, Note line side padding.

Don't switch bottom mode back to `embedPages`. Keep the GCDividerPage check in place.

---

## UI Patterns and Preferences
- Use sliders (`<input type="range">`) with a live value readout (`<span class="slider-val">`) for any numeric setting with a natural min/max (margins, padding, spacing, gutter sizes).
- Tools open in a new tab (`target="_blank"`) from the dashboard — never iframe or inline panel.

---

## Deployment Reminders
- After pushing changes, always remind Brian to hard refresh (Ctrl+Shift+R) — GitHub Pages CDN caches aggressively and changes won't appear without it.

---

## Memory
Read and write all memory directly in this file (`G:\Other computers\Work Laptop\ClaudeAI\PersonalDashboard\CLAUDE.md`). Append new memory entries under the `## Memory Notes` section below. Do not use the default memory path (`C:\Users\Brian\.claude\projects\...`).

---

## Memory Notes

### Project Overview
GitHub Pages site at https://blharmon24.github.io (repo: blharmon24/personal-dashboard). Plain HTML/CSS/JS, no build tools. Entry point is `index.html` with a fixed dark-theme sidebar. Version string: `<span class="version">vYYYY.MM.DD.N</span>`. Tools: `general-conference-formatting.html`, `pdf-merger.html`. External links: BNAP Ledger, IT Dashboard (open in new tab). When adding tools, follow project card pattern and bump version on every push.

### pdf-lib UMD Gotcha
`PDFLib.StandardFonts` enum is NOT reliably exposed in the UMD bundle — returns `undefined`, silent crash. Always use string literals: `'Times-Roman'`, `'Times-Bold'`, `'Times-BoldItalic'`, `'Times-Italic'`, `'Helvetica'`, `'Helvetica-Bold'`. Never use `StandardFonts.TimesRoman` etc.

### GC Formatting Tool Architecture
Bottom margin mode (default): `copyPages + setMediaBox/setCropBox` — preserves text rendering and uniform spacing. Side margin mode: `embedPages + drawPage` — causes rounding artifacts, non-uniform spacing (why bottom is default). GCDividerPage marker skips margin processing on session divider pages. Don't switch bottom mode to embedPages. Keep GCDividerPage check in place.

**Styling:** Tool is styled to match the main dashboard dark theme (Segoe UI font, same CSS variable palette). Has its own `#theme-toggle` button in the header — same `localStorage` key `'theme'` as the dashboard so theme preference is shared across pages.

**Terminology:** Bottom mode calls the gap between content and note lines "Content gap" (not "Binding gutter" — that would imply spine/binding, which is wrong). Side mode correctly uses "Binding gutter" for the spine-side margin. The info panel labels are dynamic: `id="infoGutterLabel"` switches between "Content gap" / "Binding gutter" and `id="infoNewSizeLabel"` switches between "New page height" / "New page width" depending on `notesPosition`.

**Bottom mode preview:** `scaleH = totalH / totalInches`, `scaleW = pageW / totalW`. Side margin strips use `var(--bg)`. Line spacing uses `Math.max(4, Math.round(spacing * scaleH / 72))`. Side strips appear in all four vertical sections (top, content, gap, note area) — distinct from note line side padding which only insets the ruled lines within the note area.

### UI Preferences
Use sliders (`<input type="range">`) with live value readout (`<span class="slider-val">`) for all numeric settings with a natural min/max. Tools open in new tab (`target="_blank"`) — never iframe or inline panel.

### GitHub Pages Caching
Always remind Brian to hard refresh (Ctrl+Shift+R) after pushing — CDN caches aggressively and changes won't appear without it.

### Kids Running Dashboard
File: `kids-running.html`. Tracks Luke and Tanner Harmon's race results. Supabase project: `https://ebdsxcbpnhevzkbpdxry.supabase.co`. Two data sources: SportTrax and Athletic.net. Edge Functions: `sync-sporttrax`, `sync-athleticnet`. DB tables: `kids_athletes`, `kids_results`.

**Athlete IDs:**
- Tanner Harmon: SportTrax 10608, Athletic.net 21290627
- Luke Harmon: SportTrax 10607, Athletic.net 22163804

**kids_results schema:** `id`, `athlete_id`, `sporttrax_result_id`, `athleticnet_result_id` (both nullable/unique), `meet_name`, `race_date`, `event_name`, `mark`, `place`, `is_pr`, `is_relay`.

**RLS policies on kids_results:** anon SELECT allowed, anon DELETE allowed (password-protected in UI). Same SELECT policy on kids_athletes.

**Athletic.net sync approach:** The `sync-athleticnet` Edge Function is dead — Cloudflare blocks all Supabase server IPs with 403 regardless of auth headers. Sync is done via a bookmarklet (`anet-sync.html`) that runs inside the user's authenticated browser session on athletic.net (same-origin, bypasses Cloudflare). The Edge Function code and secrets (`ANET_TOKEN`, `ANET_COOKIE`) in Supabase are unused dead code.

**Athletic.net API field names** (confirmed from live API, `resultsTF[]` entries): `IDResult`, `AthleteID`, `Result` (mark), `EventID` (→ look up in `eventsTF` by `IDEvent`), `MeetID` (→ look up in `meets{}` dict), `ResultDate`, `meetName` (direct), `Place`, `PersonalBest`. Event objects use `Event` (name field) and `IDEvent`. Meet objects use `MeetName` and `EndDate`.

**supabase-js version:** Must stay on v2 (`@supabase/supabase-js@2`). v3 UMD bundle exposes a different global — causes "supabase is not defined" crash. The `sb_publishable_...` anon key format works fine with v2 despite a harmless payload warning in the client internals.

**Delete All Results:** Password-protected button in header. Password: `DeleteTrackResultsHarmon`. Uses anon Supabase client — works because RLS delete policy allows anon.

### Token Efficiency Preference
Don't burn tokens on exploratory web fetches for simple UI/style tasks. When Brian asks for a visual change (e.g. "make the sidebar darker"), just make the change directly rather than fetching external pages to analyze them. If the request is ambiguous, ask one clarifying question instead of fetching. Brian interrupted a multi-fetch session and redirected to a simpler ask.

### Light/Dark Mode Toggle
Added in April 2026. Toggle button (`#theme-toggle`) shows 🌙/☀️. Applies `data-theme="light"` to `<html>`. Preference persisted in `localStorage` key `'theme'`. Both the main dashboard and `general-conference-formatting.html` share this key — switching on one carries over to the other.

**Main dashboard (`index.html` / `style.css`):** Toggle is in the sidebar footer. Light mode sidebar is `#253447` (dark blue-gray) with separate CSS overrides under `[data-theme="light"] .sidebar` etc. to keep sidebar text readable.

**GC formatting tool (`general-conference-formatting.html`):** Toggle is in the page header (right-aligned, `margin-left:auto`). Light mode uses dashboard palette exactly: `--bg:#f0f2f5`, `--surface:#ffffff`, `--accent:#2563eb`, `--text:#1e293b`. Dark mode default: `--bg:#0f1117`, `--accent:#4f8ef7`.

### Salary Tracker
File: `salary-tracker.html`. Sidebar nav entry under "My Projects" (💼 icon). Tracks Brian's salary history and future projections from his school district job.

**Key facts:**
- District start date: May 28, 2002
- Current base salary (2025–26 year): $131,444
- Salary year runs July 1 – June 30. `CUR_YR = 2025` means the year starting July 1, 2025.
- Paid 2× per month (24 paychecks/year)
- Table rows span 2002–2040

**Sick leave bonus tiers** (applied to base salary):
- 936 hrs = +1%, 1352 hrs = +2%, 1768 hrs = +3%, 2184 hrs = +4%

**Milestone badges** auto-appear in the Year column:
- 25 YRS badge: salary year 2027–28 (yrsAt(2027) = 25)
- RETIRE badge: salary year 2032–33 (yrsAt(2032) = 30)

**Supabase storage:** Table `salary_rows` on `ebdsxcbpnhevzkbpdxry.supabase.co`. Schema: `salary_year` (integer, unique), `base_salary`, `cola_pct`, `sl_hours`, `pl_hours`. RLS: anon select/insert/update allowed. Uses supabase-js v2 CDN. Anon key: `sb_publishable_2chleZ28vhYAQqpW0RaNeg_0DYo_1v4`. Data upserted on each field change (no localStorage).

**Future projections (Session 2 — complete):** COLA defaults to 3% for future years. Future rows tagged PROJ. Base salary auto-fills from previous year's base × (1 + COLA%). If `D[yr].base` is null → auto-compute; non-null → manual override. Clearing a manual override (empty input) resets to auto. Auto-computed base inputs styled italic/muted (`auto-val` class).

**25-year milestone bonus:** Starting salary year 2027 (yrs >= 25), an extra +2% is added on top of COLA each year going forward. Effective raise = COLA + 2%. Logic in `buildComputedBases()`: `milestoneBonus = yrsAt(yr) >= 25 ? 2 : 0`. The `+2%` badge appears in the **Salary Year column** (alongside 25 YRS, RETIRE, PROJ badges) — NOT in the COLA % column. Moving it out of the COLA column was required to eliminate wasted horizontal space (see COLA column note below).

**Session 4 (complete) — Retirement Calculator:** Panel between chart and table. Dropdown to pick retirement year (defaults to 2032, the 30-yr milestone). Shows: Years of Service, Top-3 Avg Salary (with year labels), Annual Retirement Income, Monthly Retirement Income, % of Final Salary (green ≥70%, yellow 50-70%, red <50%). `buildRetireSelect()` called once on init; `updateRetireCalc(bases)` called from `render()` and on dropdown change. Formula: avg(top 3 salary+bonus totals to date) × 2% × yrs of service. `dollarShort()` rounds to whole dollars for stat display.

**Session 3 (complete) — Chart:** Uses Chart.js (CDN). Three lines: Base Salary (blue), Salary + SL Bonus (green), Projected Retirement Income (yellow dashed). Chart placed above the table in `#chart-section`. `renderChart(bases)` called from `render()`. Theme toggle calls `render()` to rebuild chart with correct colors (canvas can't use CSS vars — `themeColors()` returns actual hex values for current theme). Retirement income line = avg(top-3 highest salary+bonus totals earned to date) × 2% × yrs of service at that year.

**Sticky table headers (final fix — v2026.04.26.7):** Root cause: `overflow-x: auto` on `.table-scroll` silently forces `overflow-y: auto` (CSS spec — when one overflow axis is non-visible, the other can't stay visible). With no explicit height, the container just expands to fit its content — no vertical overflow, no internal scroll, so `thead th { position: sticky }` never activates. Fix: JS function `sizeTableScroll()` walks `offsetTop` up the DOM tree to get the element's absolute page position, then sets `height = window.innerHeight - absTop`. This gives the container a real height that overflows, making sticky headers work. Called after render and on window resize. `thead th { position: sticky; top: 0; z-index: 2 }` — top:0 is relative to `.table-scroll`.

**Table column headers and alignment:**
- Column names: "Sick Hrs" (was "SL Hours"), "Personal Hrs" (was "PL Hours")
- Alignment rule: **Salary Year** and **Yrs** are left-aligned; all other columns (Base Salary, COLA %, Sick Hrs, SL Bonus, Salary + Bonus, Personal Hrs, Paycheck, Monthly +/-, Yearly +/-) are right-aligned
- CSS: `thead th:first-child, thead th:nth-child(2) { text-align: left }` — only those two

**COLA % column:** The input sits directly in the `<td>` — no wrapper div. A `div.cola-cell` flex wrapper was tried but a block-level flex container stretches to fill the td width, making the COLA column much wider than other input columns. Removing the wrapper fixed the wasted space. The `+2%` badge was also removed from this column for the same reason (any inline element forces column wider for all rows due to table layout constraints).

**Current year row highlighting:** `tbody tr.row-current { background: rgba(79,142,247,0.18) }` and `tbody tr.row-current td:first-child { border-left: 3px solid var(--accent) }` — blue-tinted background plus left accent border.

**Auto-scroll to current year:** `scrollToCurrentYear()` runs after `sizeTableScroll()` on init. Uses `getBoundingClientRect()` to position the current year row just below the sticky thead: `ts.scrollTop = tr.getBoundingClientRect().top - ts.getBoundingClientRect().top + ts.scrollTop - theadHeight`. The `theadHeight` offset is critical — without it the scroll lands one row too far (thead covers the target row).

**Version number:** Both `index.html` (sidebar footer) and `salary-tracker.html` (page header) now show the version. Current version: **v2026.04.26.21**. Always bump both files on every push.

**Chart retirement zone shading:** Custom Chart.js inline plugin (`id: 'retireShade'`) in the `plugins` array of the Chart config (not `options.plugins`). Uses `beforeDatasetsDraw` to draw a green fill (`rgba(74,222,128,0.07)`) from 2032 to the right edge, plus a green dashed vertical line at 2032. Finds 2032 by searching `chart.data.labels.indexOf('2032–33')` — this works correctly at any zoom level. If `chartWindow.start > 2032` and the label isn't found, shades the entire chart area.

**Chart range selector:** Three preset buttons above the chart in `.chart-controls`. State stored in `let chartWindow = { start: FIRST, end: LAST }`. Buttons: "Full Career" (all years), "Last 5 + Next 10" (`CUR_YR-5` to `CUR_YR+10`), "Last 2 + Next 10" (`CUR_YR-2` to `CUR_YR+10`). Clicking a button updates `chartWindow` and calls `renderChart(buildComputedBases())` directly (not full `render()` — avoids rebuilding the table). The totals pre-computation loop always covers FIRST→LAST so retirement income is accurate at any zoom level; only the visible labels loop uses `chartWindow`.

### Property Management
For Brian's parents who manage 12–15 rental properties. Files: `property-management.html` (main list/dashboard), `property-detail.html` (individual property — tabs). Sidebar entry in `index.html`: 🏠 Property Management (opens new tab). Current version: **v2026.04.26.22** — bump both `index.html` and both pm HTML files on every push.

**Supabase project:** `https://ebdsxcbpnhevzkbpdxry.supabase.co` (same project as salary tracker and kids running). Same anon key: `sb_publishable_2chleZ28vhYAQqpW0RaNeg_0DYo_1v4`. Uses supabase-js v2 CDN. Auth: email/password via `signInWithPassword()`. Session persists in localStorage. All pm_* tables restricted to `authenticated` role via RLS.

**Table schemas:**
- `pm_properties`: `id` (uuid PK), `address`, `city`, `state`, `zip`, `notes`, `photo_url`, `created_at`
- `pm_tenants`: `id`, `property_id` (FK→pm_properties), `first_name`, `last_name`, `email`, `phone`, `move_in_date` (date), `monthly_rent` (numeric), `notes`, `is_active` (bool, default true), `created_at`
- `pm_payments`: `id`, `property_id` (FK), `amount` (numeric), `payment_date` (date), `for_month` (date — always stored as first of month e.g. "2026-04-01"), `method` (text), `notes`, `created_at`
- `pm_expenses`: `id`, `property_id` (FK), `amount` (numeric), `expense_date` (date), `category` (text), `description`, `notes`, `receipt_url` (text — user pastes Google Drive/Photos share link), `created_at`
- `pm_lease_docs`: `id`, `property_id` (FK), `file_path` (path in pm-leases bucket), `file_name`, `label`, `notes`, `uploaded_at`

**Storage buckets:**
- `pm-photos` — Public bucket. Property photos uploaded as `{propId}/photo.{ext}`, overwritten on update (`upsert:true`). Public URL stored in `pm_properties.photo_url`.
- `pm-leases` — Private bucket. Lease PDFs stored as `{propId}/{timestamp}_{filename}`. Viewed via 1-hour signed URLs (`createSignedUrl`). Path stored in `pm_lease_docs.file_path`.

**Card status logic** (determines border color on property cards and hero badge):
- `vacant` — no active tenant
- `paid` — total payments for current month ≥ monthly_rent
- `partial` — some payment made but < rent due, day < 5
- `current` — no payment yet, day < 5
- `warn` — not paid in full, day 5 or 6 (yellow border)
- `late` — not paid in full, day ≥ 7 (red border)
- Rent is due on the 1st of the month (may change — ask Brian if this ever needs to be configurable)

**Payment methods:** Cash, Check, Venmo, Zelle, Money Order, Bank Transfer, Other

**Expense categories:** Maintenance & Repair, Utilities, Insurance, Property Tax, HOA Fees, Landscaping, Cleaning, Management Fee, Capital Improvement, Legal / Accounting, Other

**Receipt links:** `receipt_url` column on `pm_expenses`. Free-text URL field in the Add Expense modal — user pastes a Google Drive or Google Photos share link. Shown as a 📎 icon in the expense table row that opens the link in a new tab. No Google API involved.

**property-management.html architecture:**
- Login overlay (full-screen, hides on auth)
- Sticky header: back arrow → index.html, title, version, user email, Sign Out, theme toggle
- Stats bar: Properties count, Collected This Month, Outstanding (red if >0), MTD Expenses, Current Tenants (First initial + Last name, sorted)
- Property card grid: photo, address, city/state + tenant name, rent/mo, status badge, amount paid this month. Cards link to `property-detail.html?id={prop.id}`
- Add Property modal: address (required), city, state, zip, photo upload, notes

**property-detail.html architecture:**
- Sticky header: breadcrumb (← Properties / Address), property switcher dropdown (navigates on change), version, Sign Out, theme toggle
- Hero: property photo (280px) + info panel (address, city/state/zip, tenant name + status badge, contact details, this month collected, action buttons)
- Tabs: Overview | Payments | Expenses | Documents
- **Overview tab:** Property Info card (editable) + Tenant card (add/edit/deactivate)
- **Payments tab:** Stats row (this month collected, rent due, outstanding, period total) + period filter dropdown + payments table (date, for_month, method badge, notes, amount, delete). Add Payment button.
- **Expenses tab:** Period filter + expenses table (date, category badge, description, notes, amount, 📎 receipt link, delete). Add Expense button.
- **Documents tab:** List of uploaded PDFs with View (signed URL) and delete. Upload Document button.

**Modals:** Edit Property (with photo replace), Add/Edit Tenant (with Deactivate button when editing), Record Payment (amount, date, for_month via `<input type="month">`, method, notes), Add Expense (amount, date, category, description, notes, receipt link), Upload Document (PDF file, label, notes).

**Tenant management:** Only one active tenant per property at a time (`is_active = true`). Deactivating sets `is_active = false` — historical records kept. Adding a new tenant after deactivation is supported.

**Theme:** Shared `localStorage` key `'theme'` — same dark/light palette as the rest of the dashboard. Both pm pages have their own `#theme-toggle` button in the header.

**⚠ PENDING — Before showing the app to Brian's parents:** Create Supabase Auth accounts. Go to Supabase dashboard → Authentication → Users → Add user → enter email + password. Need one account for parents (shared), one for Brian. Neither has been created yet.
