# 自部署指南

这份指南适合想把小纸船部署到自己 Cloudflare 账号下的人。

小纸船是 **纯静态前端 + Cloudflare Pages Functions**：

- 不需要 Node 构建
- 不需要服务器
- 不需要数据库
- 云同步使用 Cloudflare KV
- API key 放在 Cloudflare 环境变量里，不进入源码

---

## 0. 准备账号

你需要：

1. GitHub 账号
2. Cloudflare 账号
3. 至少一个模型服务 API key：
   - 火山方舟 / CodingPlan：`ARK_API_KEY`
   - 可选：博查 AI Search：`BOCHA_API_KEY`

---

## 1. Fork 仓库

打开仓库：

```text
https://github.com/schlesimu/codingplan-chat
```

点击右上角 **Fork**，复制一份到你自己的 GitHub 账号。

---

## 2. 创建 Cloudflare Pages 项目

进入 Cloudflare：

```text
https://dash.cloudflare.com/
```

路径：

```text
Workers & Pages → Create → Pages → Connect to Git
```

选择你 fork 的 `codingplan-chat` 仓库。

---

## 3. 构建配置

小纸船没有构建步骤，按下面填：

| 项 | 值 |
|---|---|
| Framework preset | None / 无 |
| Build command | 留空 |
| Build output directory | `/` |
| Root directory | 留空 / 默认 |

点 **Save and Deploy**。

第一次部署完成后，你会得到一个类似下面的域名：

```text
https://你的项目名.pages.dev
```

---

## 4. 配置环境变量

进入项目：

```text
Workers & Pages → 你的项目 → Settings → Environment variables
```

在 **Production** 环境下添加：

| Variable name | Value | 用途 |
|---|---|---|
| `ARK_API_KEY` | `ark-...` | 默认聊天 / 模型列表 key |
| `BOCHA_API_KEY` | `sk-...` | 默认联网搜索 key，可选 |

如果页面提供 **Encrypt / Secret** 选项，建议选择加密。

> 改完环境变量后，需要重新部署一次才会生效。

---

## 5. 绑定 Cloudflare KV（可选，但建议）

KV 用于「云端同步」。不绑定也能聊天，只是云同步不可用。

### 5.1 创建 KV namespace

路径：

```text
Storage & Databases → KV → Create namespace
```

命名可以用：

```text
codingplan-chat-kv
```

### 5.2 绑定到 Pages Functions

进入项目：

```text
Workers & Pages → 你的项目 → Settings → Functions → KV namespace bindings
```

新增绑定：

| Variable name | KV namespace |
|---|---|
| `CODINGPLAN_KV` | 选择刚创建的 namespace |

⚠️ 注意：`CODINGPLAN_KV` 是 **KV binding**，不是普通 Environment variable。

---

## 6. 重新部署

配置环境变量 / KV binding 后，需要触发一次重新部署。

常见入口：

```text
Deployments → 最新部署 → Retry deployment
```

如果界面没有 Retry，也可以在 GitHub 推一个新 commit，Cloudflare 会自动部署。

---

## 7. 验证部署

打开你的 Pages 域名，确认页面能进入。

再验证接口：

```bash
curl https://你的项目名.pages.dev/api/models
```

如果返回模型列表，说明 `ARK_API_KEY` 生效。

搜索接口：

```bash
curl -X POST https://你的项目名.pages.dev/api/search \
  -H 'Content-Type: application/json' \
  -d '{"query":"今天 AI 新闻","count":3}'
```

如果返回 `You do not have enough money or package quota`，说明博查 key 有效但余额不足；不是部署失败。

---

## 8. 常见问题

### Q: 我只想自己用，需要配置服务端 key 吗？

不一定。你可以不配置 `ARK_API_KEY`，然后在小纸船前端设置里填自己的 key。这样请求会通过 `X-Codingplan-Key` 发送。

但如果你想让朋友打开就能用，建议配置服务端默认 key。

### Q: 为什么不要把 key 写进源码？

公开仓库会被自动扫描。API key 一旦进入 git 历史，即使后来删除，也可能被爬虫、缓存和旧 commit 直链保留。正确做法是放进 Cloudflare 环境变量。

### Q: 本地运行时 `/api/*` 为什么 404？

`python3 -m http.server` 只能跑静态文件，不能运行 Cloudflare Pages Functions。接口需要部署到 Cloudflare 后测试。

### Q: 改了环境变量为什么还不生效？

Cloudflare Pages 的环境变量通常要重新部署后才注入到运行环境。

### Q: 可以改成自己的域名吗？

可以。Cloudflare Pages 项目里进入 **Custom domains**，绑定你的域名即可。
