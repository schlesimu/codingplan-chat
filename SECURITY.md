# 安全说明

小纸船是公开项目。公开项目最重要的一条规则是：

> **任何 API key、Token、密码、私钥，都不要进入源码、README、Issue、截图和 commit 历史。**

---

## 密钥应该放在哪里

### ✅ 推荐

| 密钥 | 放置位置 |
|---|---|
| `ARK_API_KEY` | Cloudflare Pages → Settings → Environment variables |
| `BOCHA_API_KEY` | Cloudflare Pages → Settings → Environment variables |
| 用户自己的模型 key | 浏览器本地设置，或用户自己通过请求头传入 |
| 火山 TTS AppID / Token | 用户前端设置里填写，不由项目默认托管 |

### ❌ 不要

- 不要写进 `functions/api/*.js`
- 不要写进 `.env` 后 commit
- 不要贴到 README / docs / Issue / PR
- 不要把含 key 的截图发到公开页面
- 不要把 key 放进 GitHub Release 附件

---

## 环境变量命名

当前服务端使用：

| 名称 | 说明 |
|---|---|
| `ARK_API_KEY` | 火山方舟 / CodingPlan 默认 key |
| `BOCHA_API_KEY` | 博查 AI Search 默认 key |
| `CODINGPLAN_KV` | Cloudflare KV binding，用于云同步 |

`CODINGPLAN_KV` 是 KV 绑定，不是普通字符串环境变量。

---

## 如果你不小心泄露了 key

请按这个顺序处理：

1. **立即到服务商控制台作废 / 删除旧 key**
2. 生成新 key
3. 在 Cloudflare Pages 环境变量里替换
4. 重新部署
5. 再考虑清理 git 历史

> 清理 git 历史不是第一优先级。公开仓库一旦 push，key 很可能已经被机器人扫走。作废 key 才是真正止损。

---

## Git 历史清理提醒

如果 key 已经进了历史：

- 可以用 `git-filter-repo` 从历史里替换为 `[REDACTED]`
- 需要 force push 改写远端 main
- 旧 commit SHA 可能仍在 GitHub 缓存里保留一段时间
- 已 fork / clone 的副本无法由原仓库删除

所以：**不要指望删历史能让旧 key 重新安全**。

---

## 报告安全问题

如果你发现了小纸船的安全问题：

1. 请不要直接在公开 Issue 里贴出完整密钥、攻击 payload 或可复现的敏感数据。
2. 可以先开一个 Issue，说明「发现安全问题，希望私下沟通」。
3. 或者直接联系仓库维护者。

---

## 项目边界

小纸船不是商业 SaaS，也不承诺：

- 多租户隔离
- 计费与配额系统
- 企业审计日志
- 完整权限管理

它更像一个可以自部署、可阅读、可改造的 AI 聊天作品。公开部署时，请按自己的风险承受能力配置服务端默认 key。