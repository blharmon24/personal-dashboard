import { createClient } from 'jsr:@supabase/supabase-js@2'

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
  'X-Requested-With': 'XMLHttpRequest',
  'Accept': 'application/json',
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  const log: object[] = []

  for (const athlete of ATHLETES) {
    // Upsert athlete row
    const { data: athleteRow, error: athleteErr } = await supabase
      .from('kids_athletes')
      .upsert({ sporttrax_id: athlete.sporttrax_id, name: athlete.name, team: athlete.team }, { onConflict: 'sporttrax_id' })
      .select('id')
      .single()

    if (athleteErr || !athleteRow) {
      log.push({ athlete: athlete.name, error: athleteErr?.message ?? 'no row returned' })
      continue
    }

    let page = 1
    let hasMore = true
    let totalSynced = 0
    let vmKeys: string[] = []

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
        log.push({ athlete: athlete.name, error: `SportTrax HTTP ${resp.status} page ${page}` })
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
      const vm = data?.props?.vm ?? {}
      if (page === 1) vmKeys = Object.keys(vm)

      // Try known result paths in order
      const raw: any[] =
        vm?.results?.data ??
        vm?.results ??
        vm?.athlete_results?.data ??
        vm?.athlete_results ??
        []

      if (!Array.isArray(raw) || raw.length === 0) {
        log.push({ athlete: athlete.name, page, vmKeys, note: 'no results found at known paths' })
        break
      }

      for (const r of raw) {
        const { error } = await supabase.from('kids_results').upsert({
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
        }, { onConflict: 'sporttrax_result_id' })

        if (!error) totalSynced++
      }

      // Pagination
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
