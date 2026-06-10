// Cloudflare Pages Function：火山引擎 TTS HTTP 接口
// 用法：POST /api/tts/volc  body={text, voice?, rate?, appid, token}
// 返回：audio/mpeg (MP3 binary)
//
// 火山引擎 TTS HTTP（非流式）：https://www.volcengine.com/docs/6561/79817
// 注意：appid 和 token 由用户在前端"设置"里填，不在服务端硬编码。
// 这样用户用自己的额度，不会泄漏你的 key。

const VOLC_API = 'https://openspeech.bytedance.com/api/v1/tts';

// 火山 TTS 音色 ID 映射（用户友好名 → voice_type）
// 完整列表见：https://www.volcengine.com/docs/6561/97465
const VOICE_MAP = {
  'tianmei':     'BV700_streaming',      // 灿灿 / 通用女声
  'yangguang':   'BV001_streaming',      // 阳光青年 / 豆包默认男声同款
  'cixing':      'BV002_streaming',      // 磁性男主播
  'donfang_nv':  'BV405_streaming',      // 东方女声
  'xiaomei':     'BV007_streaming',      // 灵动女声
  'shaonian':    'BV701_streaming',      // 少年音
  'wencheng':    'BV113_streaming',      // 温柔成熟女声
  'huoli_nan':   'BV411_streaming',      // 活力男生
};

export async function onRequestPost({ request }) {
  try {
    const { text, voice, rate, appid, token, cluster } = await request.json();
    if (!text || typeof text !== 'string') {
      return new Response(JSON.stringify({ error: 'text required' }), { status: 400, headers: { 'content-type': 'application/json' } });
    }
    if (!appid || !token) {
      return new Response(JSON.stringify({ error: '需要在设置里填写火山 AppID 和 Access Token' }), { status: 400, headers: { 'content-type': 'application/json' } });
    }
    const voiceType = VOICE_MAP[voice] || VOICE_MAP['yangguang'];
    const speedRatio = Math.max(0.2, Math.min(3.0, Number(rate) || 1.0));

    const reqBody = {
      app: {
        appid: String(appid),
        token: String(token),
        cluster: cluster || 'volcano_tts',
      },
      user: { uid: 'codingplan-chat-user' },
      audio: {
        voice_type: voiceType,
        encoding: 'mp3',
        speed_ratio: speedRatio,
        rate: 24000,
      },
      request: {
        reqid: crypto.randomUUID(),
        text: text.slice(0, 1024),  // 火山 TTS HTTP 单次限制 1024 字
        operation: 'query',
      },
    };

    const resp = await fetch(VOLC_API, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer;${token}`,
      },
      body: JSON.stringify(reqBody),
    });

    if (!resp.ok) {
      const err = await resp.text();
      return new Response(JSON.stringify({ error: `volc TTS HTTP ${resp.status}: ${err.slice(0, 200)}` }), { status: resp.status, headers: { 'content-type': 'application/json' } });
    }

    const data = await resp.json();
    if (data.code !== 3000 || !data.data) {
      return new Response(JSON.stringify({ error: `volc TTS code=${data.code} msg=${data.message || ''}` }), { status: 502, headers: { 'content-type': 'application/json' } });
    }

    // base64 解码音频
    const binStr = atob(data.data);
    const bytes = new Uint8Array(binStr.length);
    for (let i = 0; i < binStr.length; i++) bytes[i] = binStr.charCodeAt(i);

    return new Response(bytes, {
      status: 200,
      headers: {
        'content-type': 'audio/mpeg',
        'cache-control': 'no-store',
        'access-control-allow-origin': '*',
      },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message || String(err) }), {
      status: 500, headers: { 'content-type': 'application/json' }
    });
  }
}

export async function onRequestOptions() {
  return new Response(null, {
    headers: {
      'access-control-allow-origin': '*',
      'access-control-allow-methods': 'POST, OPTIONS',
      'access-control-allow-headers': 'content-type',
    },
  });
}
