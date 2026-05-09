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

**RLS policies on kids_results:** No-role SELECT (`USING (true)` — public access, no login required). Authenticated DELETE only. Same no-role SELECT on kids_athletes. The `sb_publishable_` anon key no longer maps to the `anon` role in RLS — this was root cause of a blank page bug fixed April 2026.

**SportTrax sync (`sync-sporttrax` Edge Function):** Uses HTML fetch to discover the current Inertia.js asset version from `data-page` attribute, then uses that version for season API calls. Do NOT hardcode `X-Inertia-Version` — SportTrax deploys new assets periodically and a stale hash causes HTTP 409 (Inertia version mismatch), which silently blocks all syncs. Local reference copy of the Edge Function code: `sync-sporttrax.ts` (not deployed — source of truth is in Supabase dashboard).

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

**Version number:** Both `index.html` (sidebar footer) and `salary-tracker.html` (page header) now show the version. Current version: **v2026.04.26.29**. Always bump **all affected files** on every commit — including `kids-running.html`, `property-management.html`, `property-detail.html` when those files change. Never forget this — Brian will call it out if missed.

**Chart retirement zone shading:** Custom Chart.js inline plugin (`id: 'retireShade'`) in the `plugins` array of the Chart config (not `options.plugins`). Uses `beforeDatasetsDraw` to draw a green fill (`rgba(74,222,128,0.07)`) from 2032 to the right edge, plus a green dashed vertical line at 2032. Finds 2032 by searching `chart.data.labels.indexOf('2032–33')` — this works correctly at any zoom level. If `chartWindow.start > 2032` and the label isn't found, shades the entire chart area.

**Chart range selector:** Three preset buttons above the chart in `.chart-controls`. State stored in `let chartWindow = { start: FIRST, end: LAST }`. Buttons: "Full Career" (all years), "Last 5 + Next 10" (`CUR_YR-5` to `CUR_YR+10`), "Last 2 + Next 10" (`CUR_YR-2` to `CUR_YR+10`). Clicking a button updates `chartWindow` and calls `renderChart(buildComputedBases())` directly (not full `render()` — avoids rebuilding the table). The totals pre-computation loop always covers FIRST→LAST so retirement income is accurate at any zoom level; only the visible labels loop uses `chartWindow`.

### Property Management
For Brian's parents who manage 12–15 rental properties. Files: `property-management.html` (main list/dashboard), `property-detail.html` (individual property — tabs). Sidebar entry in `index.html`: 🏠 Property Management (opens new tab). Current version: **v2026.04.26.26** — bump `index.html` AND both pm HTML files on every push.

**Supabase project:** `https://ebdsxcbpnhevzkbpdxry.supabase.co` (same project as salary tracker and kids running). Same anon key: `sb_publishable_2chleZ28vhYAQqpW0RaNeg_0DYo_1v4`. Uses supabase-js v2 CDN. Auth: email/password via `signInWithPassword()`. Session persists in localStorage. All pm_* tables restricted to `authenticated` role via RLS.

**Table schemas:**
- `pm_properties`: `id` (uuid PK), `address`, `city`, `state`, `zip`, `notes`, `photo_url`, `is_sold` (bool), `created_at`
- `pm_tenants`: `id`, `property_id` (FK), `first_name`, `last_name`, `email`, `phone`, `move_in_date` (date), `move_out_date` (date, nullable), `monthly_rent` (numeric), `security_deposit` (numeric, nullable), `notes`, `is_active` (bool), `created_at`
- `pm_payments`: `id`, `property_id` (FK), `amount` (numeric), `payment_date` (date), `for_month` (date — first of month, e.g. "2026-04-01"), `method` (text), `payment_type` (text: 'Rent'|'Late Fee'|'Security Deposit'|'Other'), `notes`, `created_at`
- `pm_expenses`: `id`, `property_id` (FK), `amount` (numeric), `expense_date` (date), `category` (text), `description`, `notes`, `receipt_url` (text), `created_at`
- `pm_lease_docs`: `id`, `property_id` (FK), `file_path` (nullable — path in pm-leases bucket for uploaded PDFs), `doc_url` (nullable — pasted Google Drive/Photos link), `file_name`, `label`, `notes`, `uploaded_at`
- `pm_rent_history`: `id`, `property_id` (FK), `effective_date` (date), `amount` (numeric), `notes`, `created_at`
- `pm_insurance`: `id`, `property_id` (FK, unique — one row per property), `provider`, `policy_number`, `premium_amount`, `payment_frequency` (text), `renewal_date` (date), `notes`, `created_at`
- `pm_property_tax`: `id`, `property_id` (FK), `tax_year` (int), `amount` (numeric), `due_date` (date), `paid_date` (date, nullable), `notes`, `created_at`

**Storage buckets:**
- `pm-photos` — Public. Photos stored as `{propId}/photo.{ext}`, overwritten on update (`upsert:true`). URL in `pm_properties.photo_url`.
- `pm-leases` — Private. PDFs stored as `{propId}/{timestamp}_{filename}`. Viewed via 1-hour signed URLs. Path in `pm_lease_docs.file_path`.

**Payment type awareness:** `isRentPay(p)` helper: `!p.payment_type || p.payment_type === 'Rent'`. Used everywhere rent balance is calculated (cardStatus, stats bar, hero, overview cells). Late fees and deposits do NOT count toward rent status.

**Card status logic** (border color on cards and hero badge):
- `vacant` — no active tenant
- `paid` — rent payments for current month ≥ monthly_rent
- `partial` — some rent paid but < rent due, day < 5
- `current` — no rent payment yet, day < 5
- `warn` — rent not paid in full, day 5–6 (yellow)
- `late` — rent not paid in full, day ≥ 7 (red)
- `sold` — `is_sold = true` (grayed, SOLD overlay)

**Payment methods:** Cash, Check, Venmo, Zelle, Money Order, Bank Transfer, Other

**Expense categories:** Maintenance & Repair, Utilities, Insurance, Property Tax, HOA Fees, Landscaping, Cleaning, Management Fee, Capital Improvement, Legal / Accounting, Other

**property-management.html architecture:**
- Login overlay (full-screen, hides on auth)
- Sticky header: back arrow → index.html, title, version, user email, Sign Out, theme toggle
- Stats bar: Properties count, Collected This Month, Outstanding (rent-only, red if >0), **Expenses This Month**, Current Tenants (First initial + Last name, sorted). Stats exclude sold properties.
- Cards/Overview toggle buttons (`setView(v)`)
- **Cards view:** photo, address, city/state + tenant name, rent/mo, status badge, amount paid. Sold properties hidden unless "Show Sold (N)" toggle enabled.
- **Overview view:** 12-month rolling payment grid (`.ov-table`). Cells: PAID/PART/LATE/VAC/— color-coded. `ovCellStatus()` uses `isRentPay()` and tenant `move_in_date` to avoid false LATE for pre-tenancy months.
- `loadData()` fetches 12-month payments (`start12Mo()`) into `allPayments12Mo` for the overview.
- Add Property modal: address (required), city, state, zip, photo upload, notes

**property-detail.html architecture:**
- Sticky header: breadcrumb (← Properties / Address), `<span>Jump to:</span>` + `prop-switcher` dropdown (navigates on change), version, Sign Out, theme toggle
- Hero: property photo (280px) + info panel (address, tenant + status badge, contacts, this month collected, action buttons). Sold properties show SOLD badge, hide management buttons, show Reactivate.
- **6 tabs:** Overview | Payments | Expenses | Documents | History | Tax & Insurance
- **Overview:** Property Info card (editable) + Tenant card (add/edit/end tenancy)
- **Payments:** Stats row + period filter + table (date, for_month, payment_type badge, method badge, notes, amount, delete). Add Payment button.
- **Expenses:** Period filter + table (date, category badge, description, notes, amount, 📎 receipt icon, delete). Add Expense button.
- **Documents:** List with View (opens `doc_url` or signed URL for legacy `file_path`) and delete. Upload Document button (pastes Google Drive/Photos URL into `doc_url`).
- **History:** Rent History table (effective_date, amount, +/- delta), Tenant History table (with move-out dates), All Payments table, CSV Export button.
- **Tax & Insurance:** Insurance card (`insuranceWarning()` — yellow 60d before renewal, red 30d/expired); Property Tax table with `taxStatusHtml()` (OVERDUE/due-soon), Mark Paid, edit per row.

**Modals:**
- Edit Property: photo replace + **Mark as Sold** red danger button in footer (left side) → `openSellModal()`
- Add/Edit Tenant: security deposit field, prorated first month field (hidden when editing); auto-logs to `pm_rent_history`; auto-creates Rent payment if prorated > 0
- End Tenancy (`modal-deactivate`): records `move_out_date`, sets `is_active=false`
- Record Payment: type dropdown (Rent/Late Fee/Security Deposit/Other); "For Month" required only for Rent
- Add Expense: amount, date, category, description, notes, receipt URL
- Upload Document: paste Google Drive/Photos URL, label, notes (stores to `pm_lease_docs.doc_url`)

**Tenant management:** One active tenant per property (`is_active=true`). End Tenancy → sets `is_active=false` + records `move_out_date`. New tenant can be added after. Historical records kept.

**Theme:** Shared `localStorage` key `'theme'`. Both pm pages have `#theme-toggle` in header.

**⚠ PENDING — Before showing the app to Brian's parents:** Create Supabase Auth accounts. Go to Supabase dashboard → Authentication → Users → Add user → enter email + password. Need one account for parents (shared), one for Brian. Neither has been created yet.

### Fortnite Tracker
File: `fortnite.html`. Sidebar nav entry under "My Projects" (🎮 icon). Tracks multiple Fortnite accounts by Epic username. Current version: **v2026.05.09.1**.

**API:** Tracker.gg public API (`https://public-api.tracker.gg/v2/fortnite/standard/profile/epic/{username}`) with `TRN-Api-Key` header. Free key at tracker.gg/developers (1,000 req/day). Key stored in `localStorage` key `fn_trn_key`. Accounts stored in `localStorage` key `fn_accounts` (JSON array of usernames).

**Segments:** Response has `data.data.segments[]` array. Filter to `type === 'playlist'`, check `attributes.playlistId` contains `'rank'` or `'competitive'`. Reload ranked segments contain `'reload'` in the playlistId. Rank info extracted from `stats.rank` (or fallback keys `rankingType`, `ranked`, `competitive`). `displayValue` is e.g. "Gold III"; `metadata.rankName` is the tier; `metadata.iconUrl` is the badge image.

**Rank badge colors:** Bronze (#fb923c), Silver (#cbd5e1), Gold (#fbbf24), Platinum (#2dd4bf), Diamond (#60a5fa), Elite (#a78bfa), Champion (#f87171), Unreal (#e879f9). Applied as colored pill badges.

**Theme:** Shares `localStorage` key `'theme'` with rest of dashboard. Anti-flash script in `<head>` applies theme before render.
