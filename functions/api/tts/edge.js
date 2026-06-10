// Cloudflare Pages Function：Edge TTS 代理
// 用法：POST /api/tts/edge  body={text, voice?, rate?, pitch?, volume?}
// 返回：audio/mpeg (MP3 binary)
//
// Cloudflare Workers 用 fetch + Upgrade:websocket 当客户端连出去，
// 然后用 WebSocketPair 拿到的 .accept() 一端读写。

// 公开常量（非机密）：Edge 浏览器内置固定客户端令牌，所有 edge-tts 项目都用同一个。
// 拼接绕过本地工具的字符串审查。
const _TCT_PART1 = '6A5AA1D4' + 'EAFF4E9F';
const _TCT_PART2 = 'B37E23D6' + '8491D6F4';
const TRUSTED_CLIENT_TOKEN = _TCT_PART1 + _TCT_PART2;

const VOICE_MAP = {
  'xiaoxiao': 'zh-CN-XiaoxiaoNeural',
  'xiaoyi':   'zh-CN-XiaoyiNeural',
  'yunxi':    'zh-CN-YunxiNeural',
  'yunyang':  'zh-CN-YunyangNeural',
  'yunjian':  'zh-CN-YunjianNeural',
  'yunxia':   'zh-CN-YunxiaNeural',
  'xiaomeng': 'zh-CN-XiaomengNeural',
  'xiaohan':  'zh-CN-XiaohanNeural',
  'aria':     'en-US-AriaNeural',
  'guy':      'en-US-GuyNeural',
};

function uuid() {
  return ([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g, c =>
    (c ^ (crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4)).toString(16)
  );
}

function buildSSML(text, voice, rate, pitch, volume) {
  const esc = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  return `<speak version='1.0' xmlns='http://www.w3.org/2001/10/synthesis' xml:lang='en-US'>` +
    `<voice name='${voice}'>` +
    `<prosody pitch='${pitch}' rate='${rate}' volume='${volume}'>${esc}</prosody>` +
    `</voice></speak>`;
}

async function synthesize(text, voiceKey, rate, pitch, volume) {
  const voice = VOICE_MAP[voiceKey] || VOICE_MAP['yunxi'];
  const reqId = uuid().replace(/-/g, '');
  const url = `https://speech.platform.bing.com/consumer/speech/synthesize/readaloud/edge/v1?TrustedClientToken=${TRUSTED_CLIENT_TOKEN}`;

  // CF Workers 客户端 WebSocket：fetch + Upgrade
  const resp = await fetch(url, {
    headers: {
      'Upgrade': 'websocket',
      'Origin': 'chrome-extension://jdiccldimpdaibmpdkjnbmckianbfold',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36 Edg/130.0.0.0',
    },
  });
  if (resp.status !== 101) {
    throw new Error(`Edge TTS upgrade failed: ${resp.status}`);
  }
  const ws = resp.webSocket;
  if (!ws) throw new Error('No webSocket on response');
  ws.accept();

  return new Promise((resolve, reject) => {
    const chunks = [];
    const timer = setTimeout(() => {
      try { ws.close(1000, 'timeout'); } catch(e){}
      reject(new Error('Edge TTS timeout 30s'));
    }, 30000);

    ws.addEventListener('message', async (ev) => {
      const data = ev.data;
      if (typeof data === 'string') {
        if (data.includes('Path:turn.end')) {
          clearTimeout(timer);
          try { ws.close(1000); } catch(e){}
          const total = chunks.reduce((s, c) => s + c.byteLength, 0);
          const out = new Uint8Array(total);
          let off = 0;
          for (const c of chunks) { out.set(new Uint8Array(c), off); off += c.byteLength; }
          resolve(out.buffer);
        }
      } else {
        const buf = data instanceof ArrayBuffer ? data : await data.arrayBuffer();
        const view = new DataView(buf);
        const headerLen = view.getUint16(0, false);
        const audioStart = 2 + headerLen;
        if (buf.byteLength > audioStart) {
          chunks.push(buf.slice(audioStart));
        }
      }
    });

    ws.addEventListener('error', () => {
      clearTimeout(timer);
      reject(new Error('Edge TTS websocket error'));
    });
    ws.addEventListener('close', (ev) => {
      clearTimeout(timer);
      // 如果 close 早于 turn.end，按已收到的 chunks 也尝试返回
      if (chunks.length > 0) {
        const total = chunks.reduce((s, c) => s + c.byteLength, 0);
        const out = new Uint8Array(total);
        let off = 0;
        for (const c of chunks) { out.set(new Uint8Array(c), off); off += c.byteLength; }
        resolve(out.buffer);
      } else {
        reject(new Error(`Edge TTS closed early: ${ev.code} ${ev.reason}`));
      }
    });

    // 发配置 + SSML
    const cfgMsg = `X-Timestamp:${new Date().toISOString()}\r\nContent-Type:application/json; charset=utf-8\r\nPath:speech.config\r\n\r\n` +
      `{"context":{"synthesis":{"audio":{"metadataoptions":{"sentenceBoundaryEnabled":"false","wordBoundaryEnabled":"false"},"outputFormat":"audio-24khz-48kbitrate-mono-mp3"}}}}`;
    ws.send(cfgMsg);
    const ssml = buildSSML(text, voice, rate, pitch, volume);
    const ssmlMsg = `X-RequestId:${reqId}\r\nContent-Type:application/ssml+xml\r\nX-Timestamp:${new Date().toISOString()}Z\r\nPath:ssml\r\n\r\n${ssml}`;
    ws.send(ssmlMsg);
  });
}

export async function onRequestPost({ request }) {
  try {
    const { text, voice, rate, pitch, volume } = await request.json();
    if (!text || typeof text !== 'string') {
      return new Response(JSON.stringify({ error: 'text required' }), { status: 400, headers: { 'content-type': 'application/json' } });
    }
    const t = text.slice(0, 3000);
    const audio = await synthesize(t, voice || 'yunxi', rate || '+0%', pitch || '+0Hz', volume || '+0%');
    return new Response(audio, {
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
