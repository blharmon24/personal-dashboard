-- ============================================================================
--  KSP Mission Control — Supabase schema
--  Paste this whole file into the Supabase SQL Editor and run it once.
--  Project: ebdsxcbpnhevzkbpdxry  (same project as the other dashboard tools)
-- ============================================================================

-- ── PROGRAM ────────────────────────────────────────────────────────────────
-- One row per career. The "active" program is the most recently created row.
-- "Start Over" deletes the program row; crew + missions cascade-delete with it.
create table if not exists ksp_program (
  id                 uuid primary key default gen_random_uuid(),
  program_name       text,                       -- Brian's space program name
  president_name     text,                       -- generated each career
  president_title    text,                       -- e.g. "Administrator", "Director"
  president_persona  text,                       -- personality paragraph (drives the AI)
  -- capability profile (Brian tells the President where he's at):
  cap_tech           text,                       -- tech tree progress / nodes unlocked
  cap_science        text,                       -- science points / banked science
  cap_furthest       text,                       -- furthest body reached
  cap_craft          text,                       -- biggest / most capable craft flown
  cap_notes          text,                       -- anything else
  tech_tree          text default 'stock',       -- which tech tree this career uses
  tech_done          jsonb default '[]'::jsonb,  -- completed tech node ids (the visual tree)
  -- money (all website-side, never touches in-game funds):
  base_salary        numeric default 0,          -- negotiated recurring salary ($/week)
  salary_anchor_date date,                        -- accrual start for current salary rate
  banked             numeric default 0,          -- salary banked before last rate change
  chat               jsonb default '[]'::jsonb,  -- ongoing conversation with the President
  created_at         timestamptz default now()
);

-- ── CREW ───────────────────────────────────────────────────────────────────
create table if not exists ksp_crew (
  id          uuid primary key default gen_random_uuid(),
  program_id  uuid references ksp_program(id) on delete cascade,
  name        text not null,
  role        text,                              -- Pilot | Engineer | Scientist | Tourist
  level       int default 0,                     -- experience stars (0-5)
  status      text default 'available',          -- available | assigned | lost
  notes       text,
  created_at  timestamptz default now()
);

-- ── MISSIONS ───────────────────────────────────────────────────────────────
create table if not exists ksp_missions (
  id             uuid primary key default gen_random_uuid(),
  program_id     uuid references ksp_program(id) on delete cascade,
  vessel_name    text,                           -- vessel name(s) assigned by the President
  objective      text,                           -- what to accomplish
  deadline       date,                           -- real-world deadline
  assigned_crew  text,                           -- crew names assigned by the President
  status         text default 'proposed',        -- proposed | active | complete | failed
  payout         numeric default 0,              -- base pay on completion
  bonus          numeric default 0,              -- added if completed on/before deadline
  penalty        numeric default 0,              -- deducted if completed late
  briefing       text,                           -- the President's mission briefing text
  completed_at   date,                           -- date Brian marked it complete
  created_at     timestamptz default now()
);

-- ── TECH TREE DIRECTIVES ─────────────────────────────────────────────────────
-- The President's recommended unlock order for the R&D tech tree.
create table if not exists ksp_tech (
  id          uuid primary key default gen_random_uuid(),
  program_id  uuid references ksp_program(id) on delete cascade,
  node        text not null,                     -- tech node / area to unlock
  rationale   text,                              -- why the President wants it
  priority    int default 100,                   -- lower = unlock sooner
  status      text default 'planned',            -- planned | unlocked
  created_at  timestamptz default now()
);

-- ── ROW LEVEL SECURITY ───────────────────────────────────────────────────────
-- Client logs in (authenticated role). The ksp-president Edge Function uses the
-- service-role key, which bypasses RLS entirely.
alter table ksp_program  enable row level security;
alter table ksp_crew     enable row level security;
alter table ksp_missions enable row level security;
alter table ksp_tech     enable row level security;

drop policy if exists "auth all" on ksp_program;
drop policy if exists "auth all" on ksp_crew;
drop policy if exists "auth all" on ksp_missions;
drop policy if exists "auth all" on ksp_tech;

create policy "auth all" on ksp_program  for all to authenticated using (true) with check (true);
create policy "auth all" on ksp_crew     for all to authenticated using (true) with check (true);
create policy "auth all" on ksp_missions for all to authenticated using (true) with check (true);
create policy "auth all" on ksp_tech     for all to authenticated using (true) with check (true);
