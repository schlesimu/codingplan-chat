// EdgeOne Pages Node Function: /api/cloud/restore

export async function onRequest(context) {
  const { env } = context;
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*'
  };

  try {
    if (env && env.CODINGPLAN_KV) {
      const raw = await env.CODINGPLAN_KV.get('chat_backup');
      if (raw) {
        const data = JSON.parse(raw);
        return new Response(JSON.stringify({ ok: true, data }), { status: 200, headers });
      }
    }

    return new Response(JSON.stringify({
      ok: false,
      error: '暂无云端备份数据。请使用导出 .md 功能备份。'
    }), { status: 200, headers });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: e.message }), { status: 500, headers });
  }
}
