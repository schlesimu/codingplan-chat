// Cloudflare Pages Function: /api/cloud/backup
// 暂用本地存储模式（可后续接入 Cloudflare KV）

export async function onRequest(context) {
  const { request } = context;
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
    // 云端备份暂时返回提示（可后续接入 Cloudflare KV）
    return new Response(JSON.stringify({
      ok: true,
      method: 'ephemeral',
      hint: '云端备份功能开发中。建议定期导出 .md 文件作为永久备份。'
    }), { status: 200, headers });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: e.message }), { status: 500, headers });
  }
}
