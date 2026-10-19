// Une "ligue" isole un groupe d'amis dans son propre espace de données, sous
// la même app/déploiement : entries:<ligue> / nameMap:<ligue>. Sans paramètre
// ?league=, on retombe sur "_none_", une clé volontairement jamais peuplée —
// l'URL nue ne doit exposer les données d'aucun groupe.
function kvKey(base, league) {
  return `${base}:${league}`;
}

function sanitizeLeague(raw) {
  const v = (raw || '').toLowerCase().replace(/[^a-z0-9_-]/g, '');
  return v || '_none_';
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const league = sanitizeLeague(url.searchParams.get('league'));

    // Writes require the shared secret (env.WRITE_PIN). Reads stay public.
    const secret = env.WRITE_PIN || '';
    const authed = secret !== '' && (request.headers.get('X-Auth-Token') || '') === secret;

    // Lightweight PIN check used by the UI to unlock the settings panel.
    if (url.pathname === '/api/auth') {
      if (request.method === 'OPTIONS') return new Response(null, { status: 204 });
      return Response.json({ ok: authed }, { status: authed ? 200 : 401 });
    }

    if (url.pathname === '/api/data') {
      if (request.method === 'OPTIONS') return new Response(null, { status: 204 });

      if (!env.TDS_KV) {
        return Response.json({ error: 'KV namespace not bound' }, { status: 503 });
      }

      if (request.method === 'GET') {
        const data = await env.TDS_KV.get(kvKey('entries', league), { type: 'json' });
        return Response.json(data || []);
      }

      if (request.method === 'POST') {
        if (!authed) return Response.json({ error: 'unauthorized' }, { status: 401 });
        const entries = await request.json();
        if (!Array.isArray(entries)) return Response.json({ error: 'expected array' }, { status: 400 });
        await env.TDS_KV.put(kvKey('entries', league), JSON.stringify(entries));
        return Response.json({ ok: true, count: entries.length });
      }
    }

    if (url.pathname === '/api/namemap') {
      if (request.method === 'OPTIONS') return new Response(null, { status: 204 });
      if (!env.TDS_KV) return Response.json({ error: 'KV namespace not bound' }, { status: 503 });
      if (request.method === 'GET') {
        const data = await env.TDS_KV.get(kvKey('nameMap', league), { type: 'json' });
        return Response.json(data || {});
      }
      if (request.method === 'POST') {
        if (!authed) return Response.json({ error: 'unauthorized' }, { status: 401 });
        const map = await request.json();
        if (typeof map !== 'object' || Array.isArray(map)) return Response.json({ error: 'expected object' }, { status: 400 });
        await env.TDS_KV.put(kvKey('nameMap', league), JSON.stringify(map));
        return Response.json({ ok: true });
      }
    }

    if (url.pathname === '/api/settings') {
      if (request.method === 'OPTIONS') return new Response(null, { status: 204 });
      if (!env.TDS_KV) return Response.json({ error: 'KV namespace not bound' }, { status: 503 });
      if (request.method === 'GET') {
        const data = await env.TDS_KV.get(kvKey('settings', league), { type: 'json' });
        return Response.json(data || { hideScores: false, seasonKey: '' });
      }
      if (request.method === 'POST') {
        if (!authed) return Response.json({ error: 'unauthorized' }, { status: 401 });
        const body = await request.json();
        const hideScores = !!(body && body.hideScores);
        const seasonKey = (body && typeof body.seasonKey === 'string') ? body.seasonKey : '';
        await env.TDS_KV.put(kvKey('settings', league), JSON.stringify({ hideScores, seasonKey }));
        return Response.json({ ok: true, hideScores, seasonKey });
      }
    }

    // Everything else → serve static assets (index.html, etc.)
    return env.ASSETS.fetch(request);
  },
};
