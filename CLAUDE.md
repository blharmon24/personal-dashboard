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

**25-year milestone bonus:** Starting salary year 2027 (yrs >= 25), an extra +2% is added on top of COLA each year going forward. Effective raise = COLA + 2%. A `+2%` badge appears in the COLA column for those years. Logic in `buildComputedBases()`: `milestoneBonus = yrsAt(yr) >= 25 ? 2 : 0`.

**Planned sessions still to build:**
- Session 3: Charts — base salary vs salary+bonus vs projected retirement on a single chart
- Session 4: Retirement calculator — top-3-year average, 2%/year multiplier, retirement date projections
