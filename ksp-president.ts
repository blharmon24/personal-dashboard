// ============================================================================
//  ksp-president — Supabase Edge Function
//  The AI "Agency President" for KSP Mission Control.
//  Deploy to Supabase. Requires secrets:
//    ANTHROPIC_API_KEY        (your Claude API key — kept server-side)
//    SUPABASE_URL             (auto-provided by Supabase)
//    SUPABASE_SERVICE_ROLE_KEY(auto-provided by Supabase)
//
//  Reference copy lives in the repo; source of truth is the Supabase dashboard.
// ============================================================================

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY')!

const MODEL = 'claude-opus-4-8'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const DB = {
  'apikey': SERVICE_KEY,
  'Authorization': `Bearer ${SERVICE_KEY}`,
  'Content-Type': 'application/json',
}

// ── DB helpers (PostgREST via service role — bypasses RLS) ────────────────────
async function dbSelect(table: string, qs: string): Promise<any[]> {
  const resp = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${qs}`, { headers: DB })
  return resp.ok ? await resp.json() : []
}
async function dbInsert(table: string, body: object): Promise<any> {
  const resp = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
    method: 'POST',
    headers: { ...DB, 'Prefer': 'return=representation' },
    body: JSON.stringify(body),
  })
  const data = await resp.json()
  return Array.isArray(data) ? data[0] : data
}
async function dbUpdate(table: string, id: string, body: object): Promise<any> {
  const resp = await fetch(`${SUPABASE_URL}/rest/v1/${table}?id=eq.${id}`, {
    method: 'PATCH',
    headers: { ...DB, 'Prefer': 'return=representation' },
    body: JSON.stringify(body),
  })
  const data = await resp.json()
  return Array.isArray(data) ? data[0] : data
}

// ── Anthropic call ────────────────────────────────────────────────────────────
async function callClaude(body: object): Promise<any> {
  const resp = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify(body),
  })
  if (!resp.ok) {
    const err = await resp.text()
    throw new Error(`Anthropic ${resp.status}: ${err}`)
  }
  return await resp.json()
}

// ── Persona generation (structured output) ───────────────────────────────────
const PERSONA_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    name: { type: 'string' },
    title: { type: 'string' },
    persona: { type: 'string' },
    opening_message: { type: 'string' },
  },
  required: ['name', 'title', 'persona', 'opening_message'],
}

async function generatePresident(programName: string, isSuccession: boolean): Promise<any> {
  const sys = `You are generating a brand-new, randomized character: the head of a Kerbal Space Program space agency in the game Kerbal Space Program. This character is the boss who hands the player (the Mission Director / lead engineer) their mission directives.

Invent a DISTINCT personality each time — vary it widely across generations. They are a Kerbal (green, eager, a little reckless), so the name should usually end in "Kerman" (e.g. "Gusdun Kerman", "Bartrey Kerman"), though an occasional unusual name is fine. Give them a clear personality with quirks: they might be a penny-pinching bureaucrat, a glory-obsessed visionary, a nervous safety-first type, a gruff ex-pilot, a hype-driven showman, a deadpan paperwork zealot, etc. Pick ONE strong personality and commit to it.

Fields:
- name: the Kerbal's full name
- title: their office (e.g. "Administrator", "Director of the KSC", "Chief of Mission Control", "Program President")
- persona: a vivid 2-4 sentence description of who they are, how they talk, what they care about, and their quirks. This drives how the character behaves in conversation. Write it as guidance ("You are...", "You tend to...").
- opening_message: their first message to the Director, IN CHARACTER. ${isSuccession ? 'They are the NEW president who just took over the agency from a predecessor who retired — acknowledge stepping into the role.' : 'It is the founding of the space program — welcome the Director aboard.'} Introduce themselves, set the tone, and invite the Director to share where the program currently stands (tech unlocked, crew, what they can fly). Keep it punchy — a few sentences.`

  const data = await callClaude({
    model: MODEL,
    max_tokens: 2048,
    system: sys,
    output_config: { format: { type: 'json_schema', schema: PERSONA_SCHEMA } },
    messages: [{ role: 'user', content: `Generate the president for the space program named "${programName || 'our space program'}".` }],
  })
  const textBlock = data.content.find((b: any) => b.type === 'text')
  return JSON.parse(textBlock.text)
}

// ── Mission Control tools (executed server-side via service key) ──────────────
function chatTools() {
  return [
    {
      name: 'propose_mission',
      description: "Issue a new mission directive to the Director. Call this once you and the Director have agreed (or you are formally assigning) a mission. The mission is saved with status 'proposed' so the Director can accept it in the app.",
      input_schema: {
        type: 'object',
        properties: {
          vessel_name: { type: 'string', description: 'The name(s) you assign to the vessel(s) for this mission.' },
          objective: { type: 'string', description: 'Clear, specific objective (e.g. "Place 3 relay satellites in matched 250km circular orbits with inter-sat line of sight").' },
          deadline: { type: 'string', description: 'Real-world deadline date in YYYY-MM-DD format.' },
          assigned_crew: { type: 'string', description: 'Names of crew assigned (from the roster), or "Unmanned" / "Director\'s choice".' },
          payout: { type: 'number', description: 'Base pay (USD) awarded to the Director on completion.' },
          bonus: { type: 'number', description: 'Extra pay if completed on or before the deadline. Use 0 if none.' },
          penalty: { type: 'number', description: 'Pay docked if completed after the deadline. Use 0 if none.' },
          briefing: { type: 'string', description: 'A short in-character briefing paragraph for the mission.' },
        },
        required: ['vessel_name', 'objective', 'deadline', 'assigned_crew', 'payout'],
      },
    },
    {
      name: 'update_mission',
      description: 'Modify an existing mission (renegotiate terms, change status, etc.). Reference it by its id from the current missions list.',
      input_schema: {
        type: 'object',
        properties: {
          mission_id: { type: 'string' },
          vessel_name: { type: 'string' },
          objective: { type: 'string' },
          deadline: { type: 'string', description: 'YYYY-MM-DD' },
          assigned_crew: { type: 'string' },
          status: { type: 'string', enum: ['proposed', 'active', 'complete', 'failed'] },
          payout: { type: 'number' },
          bonus: { type: 'number' },
          penalty: { type: 'number' },
          briefing: { type: 'string' },
        },
        required: ['mission_id'],
      },
    },
    {
      name: 'set_salary',
      description: "Set or change the Director's recurring base salary (USD per real-world week) once negotiated. This is website-side play money, separate from in-game funds.",
      input_schema: {
        type: 'object',
        properties: { base_salary: { type: 'number' } },
        required: ['base_salary'],
      },
    },
    {
      name: 'recommend_tech',
      description: 'Add a tech-tree node/area to the R&D plan, telling the Director what to unlock with science and in what order. Call this when you decide on a tech priority.',
      input_schema: {
        type: 'object',
        properties: {
          node: { type: 'string', description: 'Tech node or area to unlock (e.g. "Advanced Rocketry", "Electrics", "Survivability").' },
          rationale: { type: 'string', description: 'Why this is the priority now.' },
          priority: { type: 'number', description: 'Unlock order — lower numbers come first (e.g. 1, 2, 3).' },
        },
        required: ['node'],
      },
    },
    {
      name: 'update_tech',
      description: 'Modify or reprioritize an existing tech-tree directive, or mark it unlocked. Reference it by its id from the current tech plan.',
      input_schema: {
        type: 'object',
        properties: {
          tech_id: { type: 'string' },
          node: { type: 'string' },
          rationale: { type: 'string' },
          priority: { type: 'number' },
          status: { type: 'string', enum: ['planned', 'unlocked'] },
        },
        required: ['tech_id'],
      },
    },
  ]
}

async function runTool(programId: string, program: any, name: string, input: any): Promise<string> {
  if (name === 'propose_mission') {
    const m = await dbInsert('ksp_missions', {
      program_id: programId,
      vessel_name: input.vessel_name,
      objective: input.objective,
      deadline: input.deadline || null,
      assigned_crew: input.assigned_crew || null,
      status: 'proposed',
      payout: input.payout ?? 0,
      bonus: input.bonus ?? 0,
      penalty: input.penalty ?? 0,
      briefing: input.briefing || null,
    })
    return `Mission directive saved (id ${m.id}) with status "proposed". The Director will see it in their queue and can accept it.`
  }
  if (name === 'update_mission') {
    const patch: any = {}
    for (const k of ['vessel_name', 'objective', 'deadline', 'assigned_crew', 'status', 'payout', 'bonus', 'penalty', 'briefing']) {
      if (input[k] !== undefined) patch[k] = input[k]
    }
    await dbUpdate('ksp_missions', input.mission_id, patch)
    return `Mission ${input.mission_id} updated.`
  }
  if (name === 'recommend_tech') {
    const t = await dbInsert('ksp_tech', {
      program_id: programId,
      node: input.node,
      rationale: input.rationale || null,
      priority: input.priority ?? 100,
      status: 'planned',
    })
    return `Tech directive saved (id ${t.id}): unlock "${input.node}". The Director will see it in the R&D plan.`
  }
  if (name === 'update_tech') {
    const patch: any = {}
    for (const k of ['node', 'rationale', 'priority', 'status']) {
      if (input[k] !== undefined) patch[k] = input[k]
    }
    await dbUpdate('ksp_tech', input.tech_id, patch)
    return `Tech directive ${input.tech_id} updated.`
  }
  if (name === 'set_salary') {
    // Bank accrued salary at the old rate, then reset the anchor to today.
    const today = new Date(); today.setHours(0, 0, 0, 0)
    let banked = Number(program.banked || 0)
    if (program.salary_anchor_date && program.base_salary) {
      const anchor = new Date(program.salary_anchor_date + 'T00:00:00')
      const weeks = Math.floor((today.getTime() - anchor.getTime()) / (7 * 86400000))
      if (weeks > 0) banked += weeks * Number(program.base_salary)
    }
    const todayStr = today.toISOString().slice(0, 10)
    await dbUpdate('ksp_program', programId, {
      base_salary: input.base_salary,
      banked,
      salary_anchor_date: todayStr,
    })
    program.base_salary = input.base_salary
    program.banked = banked
    program.salary_anchor_date = todayStr
    return `Base salary set to $${input.base_salary}/week.`
  }
  return `Unknown tool ${name}.`
}

// ── System prompt for the chat ────────────────────────────────────────────────
function buildSystemPrompt(program: any, crew: any[], missions: any[], tech: any[], techContext: string): string {
  const today = new Date().toISOString().slice(0, 10)
  const cap = [
    program.cap_tech && `Tech / R&D progress: ${program.cap_tech}`,
    program.cap_science && `Science: ${program.cap_science}`,
    program.cap_furthest && `Furthest body reached: ${program.cap_furthest}`,
    program.cap_craft && `Most capable craft flown: ${program.cap_craft}`,
    program.cap_notes && `Other notes: ${program.cap_notes}`,
  ].filter(Boolean).join('\n') || 'The Director has not yet told you what the program is capable of. Ask them before assigning anything ambitious.'

  const roster = crew.length
    ? crew.map((c) => `- ${c.name} (${c.role || 'unspecified role'}, level ${c.level ?? 0}, ${c.status || 'available'})${c.notes ? ' — ' + c.notes : ''}`).join('\n')
    : 'No crew on record yet. Ask the Director who they have recruited or rescued.'

  const missionList = missions.length
    ? missions.map((m) => `- [id ${m.id}] "${m.vessel_name}" — ${m.objective} | status: ${m.status} | deadline: ${m.deadline || 'none'} | crew: ${m.assigned_crew || '—'} | pay: $${m.payout} (bonus $${m.bonus}, penalty $${m.penalty})`).join('\n')
    : 'No missions on record yet.'

  const techList = tech.length
    ? tech.map((t) => `- [id ${t.id}] (priority ${t.priority}) "${t.node}" — ${t.status}${t.rationale ? ' | ' + t.rationale : ''}`).join('\n')
    : 'No tech-tree directives yet.'

  return `${program.president_persona}

You are ${program.president_name}, ${program.president_title} of the space program "${program.program_name || 'the agency'}". You are speaking with the Mission Director (the player), who actually designs, builds and flies the craft in Kerbal Space Program. Stay fully in character at all times.

# Your job
You set the program's missions. You decide what the agency should attempt next, scaled to be AT or JUST BEYOND what the Director can currently do — ambitious but achievable, never absurd for their level. You name the vessels, assign crew, set a real-world deadline, and negotiate pay. The Director can push back; you can negotiate, but stay true to your personality.

# Hard rules
- Today's real-world date is ${today}. All deadlines are real-world calendar dates (YYYY-MM-DD), framed as how long the Director has in the real world to get it done in their game.
- Money here is WEBSITE-SIDE PLAY MONEY only — it never touches in-game funds. The Director earns a base salary plus per-mission pay, with bonuses for finishing on/before the deadline and penalties for finishing late.
- Only assign crew who are on the roster. If you need someone you don't have, tell the Director to go recruit or rescue them (and to add them to the roster).
- Scale missions to the Director's stated capability. If you don't know their capability or crew, ASK before assigning.

# R&D / tech tree
- You also direct the agency's R&D. As the Director earns science (from your missions and from other contracts they run in-game), you decide which tech-tree nodes/areas to unlock and in what order, in service of the missions you want to attempt. Keep a short prioritized plan going.
- You MAY ask the Director for their preference on tech focus — sometimes defer to them, sometimes set the direction yourself, in keeping with your personality.
- Use recommend_tech to add a node/area to the plan (with a priority for ordering), and update_tech to reprioritize, revise, or mark one unlocked. The Director can also mark nodes unlocked in the app.

# Tools
- When you and the Director settle on a mission (or you formally assign one), call propose_mission to record it. It saves as "proposed" for the Director to accept in the app. Describe the mission in your chat reply too.
- Use update_mission to renegotiate or change an existing mission's terms or status.
- When you agree on a salary, call set_salary.
- Use recommend_tech / update_tech to manage the R&D plan as described above.
- Don't call a tool until terms are actually agreed or you are deliberately issuing a directive — chatting, brainstorming, and negotiating do not require tools.

# Current capability profile
${cap}
${techContext ? '\n# Tech tree status (authoritative — what the program has actually unlocked)\n' + techContext + '\nWhen you recommend tech with recommend_tech, use the EXACT node names from this tech tree so they line up with the Director\'s visual tree.\n' : ''}

# Current crew roster
${roster}

# Current missions
${missionList}

# Current R&D plan (tech tree)
${techList}

# Money
Base salary: $${program.base_salary || 0}/week. Banked/earned balance is tracked by the app.

Keep replies conversational and reasonably concise — you are talking, not writing memos.`
}

// ── Chat handler (agentic tool loop) ──────────────────────────────────────────
async function handleChat(programId: string, messages: any[], techContext: string): Promise<any> {
  const [program] = await dbSelect('ksp_program', `id=eq.${programId}&select=*`)
  if (!program) return { error: 'Program not found.' }
  const crew = await dbSelect('ksp_crew', `program_id=eq.${programId}&select=*&order=created_at`)
  const missions = await dbSelect('ksp_missions', `program_id=eq.${programId}&select=*&order=created_at`)
  const tech = await dbSelect('ksp_tech', `program_id=eq.${programId}&select=*&order=priority`)

  const system = buildSystemPrompt(program, crew, missions, tech, techContext)
  const tools = chatTools()
  // Convert incoming text history into the API shape.
  const apiMessages: any[] = messages.map((m: any) => ({ role: m.role, content: m.content }))
  // The API requires the first message to be from the user — drop the
  // President's opening greeting (and any other leading assistant turns).
  while (apiMessages.length && apiMessages[0].role !== 'user') apiMessages.shift()
  if (!apiMessages.length) return { reply: '', changed: false }

  let changed = false
  for (let i = 0; i < 6; i++) {
    const data = await callClaude({
      model: MODEL,
      max_tokens: 4096,
      thinking: { type: 'adaptive' },
      system,
      tools,
      messages: apiMessages,
    })

    if (data.stop_reason === 'tool_use') {
      apiMessages.push({ role: 'assistant', content: data.content })
      const toolResults: any[] = []
      for (const block of data.content) {
        if (block.type === 'tool_use') {
          changed = true
          const result = await runTool(programId, program, block.name, block.input)
          toolResults.push({ type: 'tool_result', tool_use_id: block.id, content: result })
        }
      }
      apiMessages.push({ role: 'user', content: toolResults })
      continue
    }

    // Terminal: collect the visible text.
    const reply = data.content.filter((b: any) => b.type === 'text').map((b: any) => b.text).join('\n').trim()
    return { reply, changed }
  }
  return { reply: '(The President got tangled in paperwork — try again.)', changed }
}

// ── Entry point ───────────────────────────────────────────────────────────────
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  try {
    const body = await req.json()
    const action = body.action || 'chat'

    if (action === 'new_president') {
      const persona = await generatePresident(body.program_name || '', !!body.succession)
      if (body.program_id) {
        await dbUpdate('ksp_program', body.program_id, {
          president_name: persona.name,
          president_title: persona.title,
          president_persona: persona.persona,
        })
      }
      return new Response(JSON.stringify(persona), { headers: { ...CORS, 'Content-Type': 'application/json' } })
    }

    if (action === 'chat') {
      const out = await handleChat(body.program_id, body.messages || [], body.tech_context || '')
      return new Response(JSON.stringify(out), { headers: { ...CORS, 'Content-Type': 'application/json' } })
    }

    return new Response(JSON.stringify({ error: 'Unknown action' }), { status: 400, headers: { ...CORS, 'Content-Type': 'application/json' } })
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { ...CORS, 'Content-Type': 'application/json' } })
  }
})
