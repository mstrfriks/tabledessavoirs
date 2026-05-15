const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: CORS });
}

export async function onRequestGet({ env }) {
  const data = await env.TDS_KV.get('entries', { type: 'json' });
  return Response.json(data || [], { headers: CORS });
}

export async function onRequestPost({ request, env }) {
  const entries = await request.json();
  if (!Array.isArray(entries)) {
    return Response.json({ error: 'expected array' }, { status: 400, headers: CORS });
  }
  await env.TDS_KV.put('entries', JSON.stringify(entries));
  return Response.json({ ok: true, count: entries.length }, { headers: CORS });
}
