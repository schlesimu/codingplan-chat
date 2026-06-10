// Cloudflare Pages Function: /api/search
// 代理博查 Web Search API

const BOCHA_API_KEY = "sk-ae1058cd6ce148e4a5322432f44c35a8";
const BOCHA_API = "https://api.bochaai.com/v1/ai/search";

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
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405, headers
    });
  }

  try {
    const { query, count } = await request.json();
    if (!query) {
      return new Response(JSON.stringify({ error: '缺少搜索关键词' }), { status: 400, headers });
    }

    const resp = await fetch(BOCHA_API, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${BOCHA_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        query,
        freshness: 'noLimit',
        summary: true,
        count: count || 5
      })
    });

    const data = await resp.json();
    return new Response(JSON.stringify(data), { status: 200, headers });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers });
  }
}
