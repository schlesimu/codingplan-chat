# 小纸船 · codingplan-chat

> 一艘装着这个时代 AI 的船。

[![version](https://img.shields.io/badge/version-v0.9.12.0-blue?style=flat-square)](https://github.com/schlesimu/codingplan-chat/releases/tag/v0.9.12.0)
[![license](https://img.shields.io/badge/license-MIT-green?style=flat-square)](#许可证)
[![deploy](https://img.shields.io/badge/deploy-Cloudflare%20Pages-orange?style=flat-square)](https://pages.cloudflare.com/)

---

## 这是什么

2026 年初，AI 像潮水一样涨起来。豆包、Kimi、DeepSeek、GLM、Claude…… 每周都有新模型出来。

但身边那些刚接触 AI 的朋友 —— 没毕业的大学生、不写代码的普通人 —— 他们买不起 ChatGPT Plus，看不懂 Cursor，下载了扣子和 Trae 却 get 不到点。他们能用的，只有豆包这种官方 App。

而最强的那些模型，他们碰不到。

**所以做了这艘小船。**

一个不需要注册、不需要折腾、打开就能聊的多模型 AI 聊天网页 —— 把豆包、Kimi、DeepSeek、GLM、Claude、Gemini、GPT 这些藏在不同高门槛里的模型，装到同一个白色输入框后面。

这是一份**送给这个 AI 时代初期**的礼物，不是产品。

---

## 在线体验

- 正式站点：<https://codingplan-chat.pages.dev>
- 更新日志：网页内点击侧栏版本号，或查看 [`assets/js/10-changelog.js`](./assets/js/10-changelog.js)

---

## 它能做什么

| 模块 | 能力 |
|---|---|
| 💬 **多模型聊天** | 一键切换豆包 / Kimi / DeepSeek / GLM / Claude / GPT / Gemini 等主流模型 |
| 🎙️ **语音输入** | 长按输入框说话，识别后直接发送 |
| 📞 **通话模式** | 与 AI 实时语音对话，像打电话一样 |
| 🖼️ **多模态** | 支持图片粘贴、文件上传，模型可看图答题 |
| 🔍 **联网搜索** | 一键开启实时网络检索增强 |
| ☁️ **云端同步** | Cloudflare KV 跨设备同步对话历史 |
| 🎨 **三主题** | 暗色 / 亮色 / 液态玻璃，含中文书籍版式的「关于书」彩蛋 |
| 📱 **PWA** | 可添加到手机主屏幕，离线打开 |

---

## 开发者入口

如果你想调用、部署或改造小纸船，从这里开始：

| 文档 | 用途 |
|---|---|
| [`docs/API.md`](./docs/API.md) | `/api/chat`、`/api/search`、`/api/models`、云同步与 TTS 接口说明 |
| [`docs/DEPLOY.md`](./docs/DEPLOY.md) | Fork 到 Cloudflare Pages 的完整自部署流程 |
| [`.env.example`](./.env.example) | Cloudflare 环境变量 / KV binding 示例 |
| [`SECURITY.md`](./SECURITY.md) | API key、Token、git 历史泄露的安全边界 |
| [`CONTRIBUTING.md`](./CONTRIBUTING.md) | 贡献方式、PR 边界与作品风格 |

### 快速调用示例

```bash
curl -X POST https://codingplan-chat.pages.dev/api/chat \
  -H 'Content-Type: application/json' \
  -d '{
    "messages": [
      {"role": "user", "content": "用一句话介绍小纸船"}
    ],
    "stream": false
  }'
```

也可以传入你自己的 key 覆盖部署者默认 key：

```bash
curl -X POST https://codingplan-chat.pages.dev/api/chat \
  -H 'Content-Type: application/json' \
  -H 'X-Codingplan-Key: ark-你的key' \
  -d '{"messages":[{"role":"user","content":"你好"}]}'
```

---

## 技术架构

**前端**：纯静态 HTML/CSS/JS，无构建工具，浏览器直开。

**后端**：Cloudflare Pages Functions（Workers），用于：

- `functions/api/chat.js` —— 聊天接口转发，默认 key 从 `ARK_API_KEY` 读取
- `functions/api/models.js` —— 模型列表，默认 key 从 `ARK_API_KEY` 读取
- `functions/api/search.js` —— 联网搜索，默认 key 从 `BOCHA_API_KEY` 读取
- `functions/api/tts/` —— 语音合成
- `functions/api/cloud/` —— 跨设备数据同步（KV 存储，binding 名 `CODINGPLAN_KV`）

**前端模块**（`assets/js/00~28-*.js`，按加载顺序编号）：

```text
00-console-capture     日志捕获
01-state               全局状态
02-onboarding          首屏 + 关于书（StPageFlip 翻页）
03-storage             本地存储
04-sidebar             侧栏会话列表
05-conversation        会话管理
06-render              消息渲染（Markdown + KaTeX + 代码高亮）
07-theme               主题切换
08-cloudsync           云端同步
09-settings            设置面板
10-changelog           更新日志（书页式）
11-input ~ 28-*        输入、消息操作、图片、搜索、语音、PWA…
```

---

## 本地运行

```bash
# 1. 克隆
git clone https://github.com/schlesimu/codingplan-chat.git
cd codingplan-chat

# 2. 起一个静态服务器（任选）
python3 -m http.server 8090
# 或 npx serve .
# 或 php -S localhost:8090

# 3. 浏览器访问
open http://localhost:8090
```

> 注：本地直接打开 `index.html` 会因 CORS 跑不起 ES 模块和 Service Worker，必须经 HTTP 服务器。`python3 -m http.server` 只能运行静态页面，不能运行 Cloudflare Pages Functions，接口请部署到 Cloudflare 后测试。

---

## 部署到 Cloudflare Pages

最短流程：

1. Fork 这个仓库
2. Cloudflare Pages → **Connect to Git** → 选择你的 fork
3. 构建配置：
   - **Framework preset**：None
   - **Build command**：留空
   - **Build output directory**：`/`
4. 在 **Settings → Environment variables** 配置：
   - `ARK_API_KEY`
   - `BOCHA_API_KEY`（可选）
5. 在 **Settings → Functions → KV namespace bindings** 绑定：
   - `CODINGPLAN_KV`
6. 重新部署

完整步骤见 [`docs/DEPLOY.md`](./docs/DEPLOY.md)。

---

## 使用方式

1. 打开网页 → 阅读「关于小纸船」的小书 → 同意 → 进入
2. 左侧栏「⚙️ 设置」→ 填入你自己的 API key（或使用部署者预置的）
3. 顶部模型下拉切换模型，开始聊天
4. 长按输入框 = 语音输入；点电话图标 = 实时语音通话
5. 主题切换在右上角

---

## 项目状态

当前版本：**v0.9.12.0「开放航线」**（2026-06-17）

这一版把小纸船的图纸整理好：API 文档、自部署指南、环境变量模板、安全说明和贡献模板都已经补齐。

---

## 关于命名

「小纸船」—— 想做一个轻、慢、不功利的东西。
不是大船，不是邮轮。
只是一只折出来的纸船，有人能上船就好。

---

## 贡献

这是一份送给时代的礼物。如果你也想加点什么、修个 bug、改个错别字，欢迎直接 PR。

不收商业 PR、不接增长 KPI、不加埋点。

提交前请读 [`CONTRIBUTING.md`](./CONTRIBUTING.md) 和 [`SECURITY.md`](./SECURITY.md)。

---

## 许可证

MIT License — 自由克隆、修改、再发布，但请保留原作者署名。

---

> 「愿这艘小船陪你走过这个时代的开端。」
