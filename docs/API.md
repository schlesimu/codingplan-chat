# API 调用文档

小纸船的后端是 Cloudflare Pages Functions。你可以把它当成一个轻量 API 代理：前端直接调用 `/api/*`，服务端再去请求火山方舟、博查、TTS 或 KV。

> 默认部署地址：`https://codingplan-chat.pages.dev`
>
> 自部署后，把示例里的域名替换成你自己的 Pages 域名即可。

---

## 认证与密钥来源

小纸船支持两种 key 来源：

1. **部署者预置 key**：在 Cloudflare Pages 环境变量中配置。
   - `ARK_API_KEY`：火山方舟 / CodingPlan API key
   - `BOCHA_API_KEY`：博查 AI Search API key
2. **用户自带 key**：调用接口时通过请求头覆盖。
   - `X-Codingplan-Key`：覆盖聊天 / 模型接口使用的火山 key
   - `X-Search-Key`：覆盖搜索接口使用的博查 key

优先级：**请求头里的用户 key > Cloudflare 环境变量里的默认 key**。

---

## `GET /api/models`

获取火山方舟可用模型列表。

### 请求

```bash
curl https://codingplan-chat.pages.dev/api/models
```

### 返回

成功时返回火山方舟原始模型列表，常见结构：

```json
{
  "object": "list",
  "data": [
    { "id": "doubao-seed-2.0-pro", "object": "model" }
  ]
}
```

### 可能错误

| 状态 | 含义 |
|---|---|
| 200 + `AuthenticationError` | `ARK_API_KEY` 未配置、格式错误或已失效 |
| 5xx | 上游服务或 Cloudflare Function 异常 |

---

## `POST /api/chat`

聊天补全接口，兼容 OpenAI 风格的 `messages` / `stream` 请求。

### 请求体

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `messages` | array | 是 | OpenAI 格式消息数组 |
| `model` | string | 否 | 模型名；默认 `ark-code-latest` |
| `stream` | boolean | 否 | 是否流式返回 |

### 可选请求头

| 请求头 | 说明 |
|---|---|
| `X-Codingplan-Key` | 用户自己的火山方舟 key，传了就覆盖服务端默认 key |
| `X-Codingplan-Base` | 自定义 API Base，默认 `https://ark.cn-beijing.volces.com/api/coding/v3` |

### 非流式示例

```bash
curl -X POST https://codingplan-chat.pages.dev/api/chat \
  -H 'Content-Type: application/json' \
  -d '{
    "model": "ark-code-latest",
    "messages": [
      {"role": "user", "content": "用一句话介绍小纸船"}
    ],
    "stream": false
  }'
```

### 用户自带 key 示例

```bash
curl -X POST https://codingplan-chat.pages.dev/api/chat \
  -H 'Content-Type: application/json' \
  -H 'X-Codingplan-Key: ark-你的key' \
  -d '{"messages":[{"role":"user","content":"你好"}]}'
```

### 流式示例

```bash
curl -N -X POST https://codingplan-chat.pages.dev/api/chat \
  -H 'Content-Type: application/json' \
  -d '{
    "messages": [{"role":"user","content":"写一首短诗"}],
    "stream": true
  }'
```

---

## `POST /api/search`

博查 AI Search 搜索代理，用于联网检索增强。

### 请求体

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `query` | string | 是 | 搜索关键词 |
| `count` | number | 否 | 返回结果数量，默认 5 |

### 可选请求头

| 请求头 | 说明 |
|---|---|
| `X-Search-Key` | 用户自己的博查 key，传了就覆盖服务端默认 key |

### 示例

```bash
curl -X POST https://codingplan-chat.pages.dev/api/search \
  -H 'Content-Type: application/json' \
  -d '{"query":"今天 AI 新闻","count":5}'
```

### 常见返回

成功时返回博查 `ai-search` 原始 JSON。若返回：

```json
{"code":"403","message":"You do not have enough money or package quota"}
```

说明 key 鉴权通过，但博查账号余额或套餐额度不足。

---

## `POST /api/cloud/backup`

把对话、偏好和前端设置备份到 Cloudflare KV。

> 需要先在 Cloudflare Pages 里绑定 KV namespace，变量名必须是 `CODINGPLAN_KV`。

### 请求体

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `token` | string | 是 | 用户同步标识，小纸船前端生成 |
| `conversations` | object | 否 | 会话数据 |
| `apiKeys` | object | 否 | 用户本地设置里的 key（由用户主动同步） |
| `preferences` | object | 否 | 主题、模型等偏好 |
| `updatedAt` | number | 否 | 更新时间戳 |

### 示例

```bash
curl -X POST https://codingplan-chat.pages.dev/api/cloud/backup \
  -H 'Content-Type: application/json' \
  -d '{
    "token":"demo-user",
    "conversations":{},
    "preferences":{"theme":"light"}
  }'
```

---

## `GET /api/cloud/restore?token=xxx`

从 Cloudflare KV 恢复备份。

### 示例

```bash
curl 'https://codingplan-chat.pages.dev/api/cloud/restore?token=demo-user'
```

### 返回

```json
{
  "ok": true,
  "data": {
    "conversations": {},
    "preferences": {},
    "updatedAt": 1780000000000
  }
}
```

---

## `POST /api/tts/edge`

Edge TTS 代理。无需部署者配置密钥。

### 请求体

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `text` | string | 是 | 要朗读的文本 |
| `voice` | string | 否 | 音色 key，如 `yunxi` / `xiaoxiao` |
| `rate` | string | 否 | 语速，如 `+0%` |
| `pitch` | string | 否 | 音高，如 `+0Hz` |
| `volume` | string | 否 | 音量，如 `+0%` |

返回 `audio/mpeg`。

---

## `POST /api/tts/volc`

火山 TTS 代理。**不使用部署者环境变量**，需要用户在前端设置里填写自己的 AppID 和 Access Token。

### 请求体

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `text` | string | 是 | 要朗读的文本，服务端截断到 1024 字 |
| `appid` | string | 是 | 火山 TTS AppID |
| `token` | string | 是 | 火山 TTS Access Token |
| `voice` | string | 否 | 音色 key |
| `rate` | number | 否 | 语速倍率，0.2 ~ 3.0 |
| `cluster` | string | 否 | 默认 `volcano_tts` |

返回 `audio/mpeg`。

---

## 错误排查速查

| 现象 | 可能原因 | 处理 |
|---|---|---|
| `/api/models` 返回 AuthenticationError | `ARK_API_KEY` 未配 / 填错 / 已作废 | 检查 Cloudflare 环境变量，重新部署 |
| `/api/search` 返回 403 quota | 博查 key 有效，但余额不足 | 充值、换套餐或用用户自己的 `X-Search-Key` |
| `/api/cloud/*` 500 | 没绑定 `CODINGPLAN_KV` | 在 Pages Functions 里绑定 KV namespace |
| 本地静态服务器打开能看页面但 `/api/*` 404 | 本地 `python -m http.server` 不运行 Pages Functions | 用 Cloudflare Pages 线上环境测试接口 |
| 改了环境变量没生效 | Pages 需要重新部署 | Deployments → 重试部署，或 push 新 commit |
