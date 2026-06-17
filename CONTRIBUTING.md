# 贡献指南

谢谢你愿意靠近这艘小船。

小纸船不是商业产品，也不追求增长指标。它更像一份公开的手作礼物：轻、慢、克制，但尽量完整。

---

## 可以贡献什么

欢迎：

- 修复明显 bug
- 改错别字、补文档
- 改善移动端体验
- 优化无障碍、键盘操作、低端机性能
- 补充自部署经验
- 提供新的主题、音色、模型适配思路

不太欢迎：

- 增长埋点、广告、商业转化
- 强登录、强账号体系
- 过重的工程化改造
- 为了炫技牺牲打开速度和作品气质

---

## 本地运行

```bash
git clone https://github.com/schlesimu/codingplan-chat.git
cd codingplan-chat
python3 -m http.server 8090
open http://localhost:8090
```

本地静态服务器不能运行 Cloudflare Pages Functions，所以 `/api/*` 需要部署到 Cloudflare 后测试。

---

## 分支与 PR

建议：

1. Fork 仓库
2. 从 `main` 切新分支
3. 一次 PR 只做一类事情
4. PR 描述里说明：
   - 改了什么
   - 为什么改
   - 怎么测试
   - 是否影响 Cloudflare 环境变量 / KV binding

---

## 风格约定

- 前端保持纯 HTML/CSS/JS，不引入构建步骤
- 新增 JS 文件按加载顺序编号
- CSS 需同时考虑暗色、亮色、液态玻璃主题
- 移动端优先验证，特别是 Android / ColorOS 浏览器
- 不把 API key 写进源码

---

## 更新日志风格

`assets/js/10-changelog.js` 是作品的一部分，不是普通 git log。

写法原则：

- 写用户能感受到的结果
- 不写「回滚」「误删」「修补某版本引入的问题」
- 同一主题跨多个小版本的调整，合并成一条，挂最终落地版本
- 寄语要短，有层级，不重复

---

## 安全

请先阅读 [`SECURITY.md`](./SECURITY.md)。

如果 PR 涉及：

- API key
- OAuth / Token
- Cloudflare 环境变量
- KV 存储
- 用户同步数据

请在 PR 描述里单独说明风险和验证方式。