// Cloudflare Pages Function: /api/cloud/restore

export async function onRequest(context) {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*'
  };

  try {
    return new Response(JSON.stringify({
      ok: false,
      error: '暂无云端备份数据。请使用导出 .md 功能备份。'
    }), { status: 200, headers });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: e.message }), { status: 500, headers });
  }
}
