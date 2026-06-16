// Cloudflare Pages Function: /api/search
// 代理博查 AI Search API（v0.9.11 升级：从 web-search 升 ai-search，模型可读 modal/conversation/image 多模态结果）
// 支持自定义 API Key（通过请求头 X-Search-Key 传入）

const DEFAULT_BOCHA_KEY = "sk-ae1...35a8";
const BOCHA_API = "https://api.bochaai.com/v1/ai-search";

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
        'Access-Control-Allow-Headers': 'Content-Type, X-Search-Key'
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

    // ai-search：answer:false（不让 AI 总结，原样返回所有 modal 给前端拼 system prompt）
    // freshness:noLimit、count 用前端给的（默认 5）
    const resp = await fetch(BOCHA_API, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${request.headers.get('X-Search-Key') || DEFAULT_BOCHA_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        query,
        freshness: 'noLimit',
        answer: false,
        stream: false,
        count: count || 5
      })
    });

    const data = await resp.json();
    return new Response(JSON.stringify(data), { status: 200, headers });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers });
  }
}
