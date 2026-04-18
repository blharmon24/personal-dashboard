const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

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

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  const resp = await fetch(`${SUPABASE_URL}/rest/v1/kids_results?id=gte.0`, {
    method: 'DELETE',
    headers: DB,
  })

  if (!resp.ok) {
    const err = await resp.text()
    return new Response(JSON.stringify({ ok: false, error: err }), {
      status: 500,
      headers: { ...CORS, 'Content-Type': 'application/json' },
    })
  }

  return new Response(JSON.stringify({ ok: true }), {
    headers: { ...CORS, 'Content-Type': 'application/json' },
  })
})
