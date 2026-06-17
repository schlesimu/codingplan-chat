// Cloudflare Pages Function: /api/models
// API key 从 Cloudflare 环境变量 ARK_API_KEY 读，不进 git

const API_BASE = "https://ark.cn-beijing.volces.com/api/coding/v3";

export async function onRequest(context) {
  const { env } = context;
  const API_KEY = (env && env.ARK_API_KEY) || '';
  try {
    const resp = await fetch(`${API_BASE}/models`, {
      headers: { 'Authorization': `Bearer ${API_KEY}` }
    });
    const data = await resp.json();
    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });
  }
}
