// Cloudflare Pages Function: /api/cloud/backup
// 使用 Cloudflare KV 存储对话数据

export async function onRequest(context) {
  const { request, env } = context;
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*'
  };

  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
      }
    });
  }

  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ ok: false, error: 'Method not allowed' }), {
      status: 405, headers
    });
  }

  try {
    const data = await request.json();
    const { token, conversations, updatedAt } = data;

    if (!token) {
      return new Response(JSON.stringify({ ok: false, error: '缺少用户标识' }), { status: 400, headers });
    }

    // 使用 KV 存储，key 格式: backup_{token}
    const key = `backup_${token}`;
    await env.CODINGPLAN_KV.put(key, JSON.stringify({
      conversations,
      updatedAt: updatedAt || Date.now(),
      count: Object.keys(conversations || {}).length
    }));

    return new Response(JSON.stringify({
      ok: true,
      method: 'kv',
      count: Object.keys(conversations || {}).length
    }), { status: 200, headers });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: e.message }), { status: 500, headers });
  }
}
