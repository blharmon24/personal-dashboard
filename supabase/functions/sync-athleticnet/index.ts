const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const ATHLETES = [
  { athleticnet_id: 21290627, name: 'Tanner Harmon' },
  { athleticnet_id: 22163804, name: 'Luke Harmon' },
]

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const ANET_HEADERS = {
  'accept': 'application/json, text/plain, */*',
  'anet-appinfo': 'web:web:0:360',
  'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36',
  'referer': 'https://www.athletic.net/',
}

const DB = {
  'apikey': SERVICE_KEY,
  'Authorization': `Bearer ${SERVICE_KEY}`,
  'Content-Type': 'application/json',
}

async function dbSelect(table: string, filters: Record<string, string>) {
  const params = Object.entries(filters)
    .map(([k, v]) => `${k}=eq.${encodeURIComponent(v)}`)
    .join('&')
  const resp = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${params}`, { headers: DB })
  const data = await resp.json()
  return resp.ok ? { data: Array.isArray(data) ? data : [data], error: null } : { data: null, error: data }
}

async function dbUpsert(table: string, body: object, onConflict: string) {
  const resp = await fetch(`${SUPABASE_URL}/rest/v1/${table}?on_conflict=${onConflict}`, {
    method: 'POST',
    headers: { ...DB, 'Prefer': 'resolution=merge-duplicates,return=representation' },
    body: JSON.stringify(body),
  })
  const data = await resp.json()
  return resp.ok ? { data: Array.isArray(data) ? data[0] : data, error: null } : { data: null, error: data }
}

function normalizeEvent(name: string): string {
  if (!name) return name
  // "200 Meters" -> "200m"
  name = name.replace(/^(\d+(?:\.\d+)?)\s+[Mm]eters?$/, '$1m')
  // "4x400 Meter Relay" / "4x800 Relay" -> "4x400" / "4x800"
  name = name.replace(/^(4x\d+).*$/, '$1')
  return name
}

function cleanMark(mark: string | null | undefined): string | null {
  if (!mark) return null
  return mark.replace(/a$/, '')
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  const log: object[] = []

  for (const athlete of ATHLETES) {
    const { data: rows, error: lookupErr } = await dbSelect('kids_athletes', { name: athlete.name })
    if (lookupErr || !rows?.length) {
      log.push({ athlete: athlete.name, error: lookupErr ?? 'athlete not found in DB — run SportTrax sync first' })
      continue
    }
    const athleteRow = rows[0]

    let resp: Response
    try {
      resp = await fetch(
        `https://www.athletic.net/api/v1/AthleteBio/GetAthleteBioData?athleteId=${athlete.athleticnet_id}&sport=tf&level=0`,
        { headers: ANET_HEADERS, signal: AbortSignal.timeout(10000) }
      )
    } catch (e: any) {
      log.push({ athlete: athlete.name, error: `fetch failed: ${e.message}` })
      continue
    }

    if (!resp.ok) {
      log.push({ athlete: athlete.name, error: `HTTP ${resp.status}` })
      continue
    }

    const json = await resp.json()
    const resultsTF: any[] = json.resultsTF ?? []
    const eventsTF: any[] = json.eventsTF ?? []
    const meets: Record<string, any> = json.meets ?? {}

    const eventNames: Record<number, string> = {}
    for (const e of eventsTF) {
      const raw = e.EventName ?? e.Name ?? ''
      eventNames[e.IDEvent] = normalizeEvent(raw)
    }

    let totalSynced = 0

    for (const r of resultsTF) {
      // Relay entries list every team member — skip rows not belonging to this athlete
      if (r.AthleteID != null && r.AthleteID !== athlete.athleticnet_id) continue

      const eventName = eventNames[r.IDEvent] ?? normalizeEvent(r.EventName ?? '') ?? null
      const meetObj = meets[String(r.MeetID)] ?? {}
      const meetName: string | null = meetObj.Name ?? meetObj.MeetName ?? null
      const mark = cleanMark(r.Result ?? r.mark)
      const raceDate: string | null = r.Date ? r.Date.split('T')[0] : null
      const place: number | null = r.Place != null ? (parseInt(String(r.Place), 10) || null) : null
      const isPR: boolean = r.PersonalBest != null ? r.PersonalBest !== 0 : false
      const isRelay: boolean = eventName ? eventName.startsWith('4x') : false

      const { error } = await dbUpsert('kids_results', {
        athlete_id: athleteRow.id,
        athleticnet_result_id: r.IDResult,
        meet_name: meetName,
        race_date: raceDate,
        event_name: eventName || null,
        mark,
        place,
        is_pr: isPR,
        is_relay: isRelay,
      }, 'athleticnet_result_id')

      if (!error) totalSynced++
    }

    log.push({ athlete: athlete.name, synced: totalSynced, total: resultsTF.length })
  }

  return new Response(JSON.stringify({ ok: true, log }), {
    headers: { ...CORS, 'Content-Type': 'application/json' },
  })
})
