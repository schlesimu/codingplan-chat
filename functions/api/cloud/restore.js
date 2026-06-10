// Cloudflare Pages Function: /api/cloud/restore
// 从 Cloudflare KV 恢复对话数据

export async function onRequest(context) {
  const { request, env } = context;
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*'
  };

  try {
    // 从 URL 参数获取 token: /api/cloud/restore?token=xxx
    const url = new URL(request.url);
    const token = url.searchParams.get('token');

    if (!token) {
      return new Response(JSON.stringify({
        ok: false,
        error: '缺少用户标识，请先备份一次再恢复。'
      }), { status: 400, headers });
    }

    const key = `backup_${token}`;
    const raw = await env.CODINGPLAN_KV.get(key);

    if (!raw) {
      return new Response(JSON.stringify({
        ok: false,
        error: '暂无云端备份数据。请先点击备份按钮。'
      }), { status: 200, headers });
    }

    const data = JSON.parse(raw);
    return new Response(JSON.stringify({
      ok: true,
      data: data
    }), { status: 200, headers });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: e.message }), { status: 500, headers });
  }
}
