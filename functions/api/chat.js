// Cloudflare Pages Function: /api/chat
// 代理火山引擎 CodingPlan API - 支持流式和非流式
// 支持自定义 API Key 和 Base URL（通过请求头传入）

const DEFAULT_API_KEY = "ark-0807eeda-ed14-41c5-b2ab-cfc593367186-fa539";
const DEFAULT_API_BASE = "https://ark.cn-beijing.volces.com/api/coding/v3";
const DEFAULT_MODEL = "ark-code-latest";  // 控制台选的 auto 模式

// 火山 Coding Plan 支持的 Model Name 白名单（防止前端乱传）
const ALLOWED_MODELS = new Set([
  'ark-code-latest', 'auto',
  'doubao-seed-2.0-code', 'doubao-seed-2.0-pro', 'doubao-seed-2.0-lite',
  'doubao-seed-code',
  'minimax-m2.7', 'minimax-m3',
  'glm-5.1',
  'deepseek-v4-flash', 'deepseek-v4-pro',
  'kimi-k2.6',
]);

export async function onRequest(context) {
  const { request } = context;

  // CORS 预检
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, X-Codingplan-Key, X-Codingplan-Base'
      }
    });
  }

  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });
  }

  try {
    const body = await request.json();
    const { messages, stream, model: reqModel } = body || {};

    // 校验 model：必须在白名单里，'auto' 映射到 ark-code-latest
    let model = DEFAULT_MODEL;
    if (reqModel && ALLOWED_MODELS.has(reqModel)) {
      model = (reqModel === 'auto') ? 'ark-code-latest' : reqModel;
    }

    const apiBase = request.headers.get('X-Codingplan-Base') || DEFAULT_API_BASE;

    const resp = await fetch(`${apiBase}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${request.headers.get('X-Codingplan-Key') || DEFAULT_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model,
        messages,
        stream: stream || false
      })
    });

    if (stream) {
      return new Response(resp.body, {
        status: 200,
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Access-Control-Allow-Origin': '*',
          'X-Accel-Buffering': 'no'
        }
      });
    } else {
      const data = await resp.json();
      return new Response(JSON.stringify(data), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });
  }
}
