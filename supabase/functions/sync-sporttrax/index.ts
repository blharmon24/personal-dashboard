const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const ATHLETES = [
  { sporttrax_id: 10607, name: 'Luke Harmon', team: 'Cyprus' },
  { sporttrax_id: 10608, name: 'Tanner Harmon', team: 'Cyprus' },
]

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const INERTIA_HEADERS = {
  'X-Inertia': 'true',
  'X-Inertia-Version': '1e1667a7939f2b63377a36876a22e55c',
  'X-Requested-With': 'XMLHttpRequest',
  'Accept': 'application/json',
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
}

const DB = {
  'apikey': SERVICE_KEY,
  'Authorization': `Bearer ${SERVICE_KEY}`,
  'Content-Type': 'application/json',
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

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  const log: object[] = []

  for (const athlete of ATHLETES) {
    // Upsert athlete row and get back its id
    const { data: athleteRow, error: athleteErr } = await dbUpsert(
      'kids_athletes',
      { sporttrax_id: athlete.sporttrax_id, name: athlete.name, team: athlete.team },
      'sporttrax_id'
    )

    if (athleteErr || !athleteRow?.id) {
      log.push({ athlete: athlete.name, error: athleteErr ?? 'no row returned' })
      continue
    }

    let page = 1
    let hasMore = true
    let totalSynced = 0

    while (hasMore) {
      const url = `https://sporttrax.com/athletes/${athlete.sporttrax_id}?page=${page}`
      console.log(`Fetching: ${url}`)

      let resp: Response
      try {
        resp = await fetch(url, {
          headers: INERTIA_HEADERS,
          signal: AbortSignal.timeout(10000),
        })
      } catch (e: any) {
        log.push({ athlete: athlete.name, error: `fetch failed: ${e.message}`, url })
        break
      }

      console.log(`Response: ${resp.status} ${resp.headers.get('content-type')}`)

      if (!resp.ok) {
        log.push({ athlete: athlete.name, error: `SportTrax HTTP ${resp.status}` })
        break
      }

      const text = await resp.text()
      console.log(`Body preview: ${text.slice(0, 200)}`)

      let data: any
      try {
        data = JSON.parse(text)
      } catch {
        log.push({ athlete: athlete.name, error: 'Response was not JSON', preview: text.slice(0, 300) })
        break
      }

      const vm = data?.props?.vm ?? data?.vm ?? {}
      const vmKeys = Object.keys(vm)
      console.log('vmKeys:', JSON.stringify(vmKeys))
      console.log('season_options:', JSON.stringify(vm?.season_options))
      console.log('results_by_season keys:', JSON.stringify(Object.keys(vm?.results_by_season ?? {})))

      const resultsBySeason = vm?.results_by_season ?? {}
      const raw: any[] = Array.isArray(resultsBySeason)
        ? resultsBySeason.flatMap((s: any) => s?.results ?? s?.data ?? [s])
        : Object.values(resultsBySeason).flatMap((v: any) =>
            Array.isArray(v) ? v : v?.results ?? v?.data ?? []
          )

      if (!Array.isArray(raw) || raw.length === 0) {
        log.push({ athlete: athlete.name, page, vmKeys, note: 'no results found at known paths' })
        break
      }

      for (const r of raw) {
        const { error } = await dbUpsert('kids_results', {
          athlete_id: athleteRow.id,
          sporttrax_result_id: r.id,
          meet_name: r.meet_name?.name ?? r.meet?.name ?? null,
          race_date: r.at ? r.at.split('T')[0] : null,
          event_name: r.event?.name ?? r.meet_event?.event?.name ?? null,
          mark: r.mark?.mark_english ?? r.display?.mark_english ?? null,
          place: r.meet_event_place ?? r.place ?? null,
          is_pr: Array.isArray(r.result_achievements)
            ? r.result_achievements.some((a: any) => a.achievement_type === 'personal_record')
            : false,
          is_relay: r.is_relay_team ?? false,
        }, 'sporttrax_result_id')

        if (!error) totalSynced++
      }

      const meta = vm?.results?.meta
      hasMore = meta ? meta.current_page < meta.last_page : false
      page++
    }

    log.push({ athlete: athlete.name, synced: totalSynced })
  }

  return new Response(JSON.stringify({ ok: true, log }), {
    headers: { ...CORS, 'Content-Type': 'application/json' },
  })
})
