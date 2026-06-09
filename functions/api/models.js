// Cloudflare Pages Function: /api/models

const API_KEY = "ark-0807eeda-ed14-41c5-b2ab-cfc593367186-fa539";
const API_BASE = "https://ark.cn-beijing.volces.com/api/coding/v3";

export async function onRequest(context) {
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
