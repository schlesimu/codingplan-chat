// EdgeOne Pages Node Function: /api/cloud/backup
// 使用 Edge KV 存储对话数据

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

    // 尝试使用 Edge KV（需要在 EdgeOne 控制台绑定）
    if (env && env.CODINGPLAN_KV) {
      await env.CODINGPLAN_KV.put('chat_backup', JSON.stringify(data));
      return new Response(JSON.stringify({ ok: true, method: 'edge-kv' }), { status: 200, headers });
    }

    // 无 KV 绑定时返回提示
    return new Response(JSON.stringify({
      ok: true,
      method: 'ephemeral',
      hint: '云端备份需要绑定 KV 存储。建议定期导出 .md 文件作为永久备份。'
    }), { status: 200, headers });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: e.message }), { status: 500, headers });
  }
}
