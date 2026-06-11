// ========== 更新日志 ==========
// (拆自 index.html v0.8.4)

function showChangelog() {
  const changelog = [
    { v: 'v0.9.0', date: '2026-06-11', items: [
      '🏗️ **重大重构：代码模块化**',
      '   - 原 4176 行单文件 index.html 拆为 363 行入口 + assets/css/main.css（1846 行）+ 16 个 JS 模块',
      '   - 每个模块单一职责（state/onboarding/storage/sidebar/conversation/render/theme/cloudsync/settings/changelog/input/msgops/image/websearch/tts/providers/fileupload）',
      '   - 不引入构建工具，保持单 HTML + script src 简单部署',
      '🤖 **多模型支持（#10）**',
      '   - 新增 6 家 provider：火山 CodingPlan（默认免费）/ 智谱 GLM / DeepSeek / Moonshot Kimi / OpenAI 兼容 / Anthropic Claude',
      '   - 顶栏可点击模型徽章 → 弹窗切换 provider + 模型 + 填 key',
      '   - OpenAI 兼容模式支持自定义 endpoint（One-API / 新 API / 自建反代）',
      '   - 用户 key 只存浏览器 localStorage，不上服务端',
      '📎 **文件上传（#14）**',
      '   - 支持 50+ 种文本/代码扩展名（.txt .md .py .js .json .yaml .sql 等）',
      '   - PDF 解析（PDF.js CDN 动态 import）',
      '   - DOCX 解析（mammoth.js CDN）',
      '   - 拖拽上传 + 多文件 + 80K 字符自动截断（头尾保留）',
      '   - 待发送文件横条 UI：图标 + 大小 + 解析状态 + 移除',
      '☁️ **云端同步重写（#22）**',
      '   - 移除已死的匿名 GitHub Gist 路径（GitHub 早已禁用匿名 Gist 创建）',
      '   - 改走 Cloudflare KV（已有的 /api/cloud/backup + /api/cloud/restore）',
      '   - 同步码体系不变，跨端可继续用',
    ]},
    { v: 'v0.8.4', date: '2026-06-11', items: [
      '🔧 修复 Edge TTS web 端不可用问题',
      '   - Edge TTS 服务端要求 Origin: chrome-extension://...，浏览器无法自定义此头',
      '   - 默认引擎从 Edge 改为「浏览器原生」（虽机器音但永远可用）',
      '   - Edge 选项加 ⚠️ 标识，告知仅 Chrome 扩展环境可用',
      '   - 自动迁移：之前默认选了 Edge 的用户回退到浏览器原生',
    ]},
    { v: 'v0.8.3', date: '2026-06-11', items: [
      '🎙️ Edge TTS 改为浏览器直连 WSS（Cloudflare Workers IP 段被 Microsoft 封了）',
      '   - 现在 Edge 神经 TTS 真正可用，云希音色，与豆包/千问同级',
      '   - 火山引擎 TTS 仍走服务端代理（保护用户 token）',
    ]},
    { v: 'v0.8.2', date: '2026-06-11', items: [
      '🔧 修复 Edge TTS 在 Cloudflare Workers 返回 403 的问题',
      '   - 补全 WebSocket 握手头：Sec-WebSocket-Key/Version/Protocol/Connection',
      '   - 加 ConnectionId query 参数 + Accept-Encoding 等浏览器特征头',
    ]},
    { v: 'v0.8.1', date: '2026-06-11', items: [
      '🎨 修复 Liquid 主题我方消息气泡看不清的问题',
      '   - 原气泡背景 rgba(180,160,255,0.10) 太透，白字几乎隐形',
      '   - 改为 0.28 不透明度的紫色渐变 + 加深紫边框 + 文字描边',
      '   - 仍保留液态玻璃质感（blur 40 + saturate 180%）',
    ]},
    { v: 'v0.8.0', date: '2026-06-11', items: [
      '🎙️ 语音朗读全面升级：从浏览器 SAPI（机器音）→ 云端神经 TTS',
      '🔊 默认引擎：Edge 神经 TTS（免费、无需 key，与豆包/千问同级别音质）',
      '🌋 高级选项：火山引擎 TTS（豆包同源），在「API Key 设置」里填 AppID + Token 即可启用',
      '🎚️ 音色 8 选（云希/晓晓/晓伊…），语速 0.5×~2.0× 滑杆调节',
      '🎧 设置面板新增「试听」按钮，调参实时验证',
      '⚡ 按句切分流式播放：首句 < 1s 出声，无需等全文合成',
      '🧹 文本归一化升级：智能跳过代码块、Markdown、链接，念错率大幅下降',
      '🔧 自动降级：神经 TTS 失败时无缝退化到浏览器原生（不打断你）',
    ]},
    { v: 'v0.7.9', date: '2026-06-11', items: [
      '🔧 修复 v0.7.7 漏改：sidebar 内按钮圆角现在三主题（Dark/Light/Liquid）全部统一',
      '📐 改 base 规则而非加主题块，所有主题自动继承同一组圆角',
      '🪟 新建对话 / 主题切换长条 → radius:18px（对齐顶栏 22px 嵌套层级）',
      '🔘 关闭✕ / 历史项 / 主题切换内的小按钮 / 未同步 / 从云端恢复 / 同步码 / 更多工具 / 搜索 → radius:14px',
      '✅ 现在切换 Dark/Light/Liquid 三主题 sidebar 按钮曲率完全一致',
    ]},
    { v: 'v0.7.8', date: '2026-06-11', items: [
      '📱 手机端 sidebar 改成四面浮卡（三主题：Dark/Light/Liquid 全部统一）',
      '📐 几何对齐顶栏 / 输入框：上 8px、左 10px、下 10px (含 safe-area)、四角圆角 18px',
      '📏 宽度 calc(100% - 90px)，最大 340px — 右侧留 80px 灰色空间方便点空白关抽屉',
      '🪟 收起态多滑 20px 让圆角彻底没入屏幕外，不留缝隙',
      '🎨 现在三主题手机端的 sidebar 圆角和顶栏/输入框完全一致的曲率',
    ]},
    { v: 'v0.7.7', date: '2026-06-11', items: [
      '🎨 Liquid 主题：sidebar 内所有矩形按钮的圆角和玻璃质感统一对齐顶栏/输入框栏',
      '📐 圆角层级遵循 iOS 嵌套设计：外层 22px → 内层 18px / 14px',
      '🪟 大按钮（新建对话 / 主题切换长条）→ radius:18px + SVG liquidGlassBig 玻璃 + 高光 shadow',
      '🔘 小按钮（关闭✕ / 历史项 / 主题切换胶囊里的小按钮 / footer 项 / 折叠按钮）→ radius:14px',
      '🪞 历史项 hover/active + 主题切换 active 都浮出毛玻璃高亮，质感与顶栏 inset 高光一致',
      '✅ 保留 v0.7.6 的 footer-item 默认透明 / hover 才浮出行为',
    ]},
    { v: 'v0.7.6', date: '2026-06-11', items: [
      '🧹 sidebar 底部"未同步 / 从云端恢复 / 同步码 / 更多工具"按钮默认不显示长方形玻璃底框',
      '👆 鼠标移上去（hover）或键盘聚焦（focus）才浮出毛玻璃块，减少视觉噪音',
      '📱 手机端没有 hover：用 `@media (hover:none)` + `:active` 触发，按下时短暂浮出反馈',
      '🔄 三大主题（Dark/Light/Liquid）全部对齐这个行为',
      '✅ 主要操作按钮（关闭/新建/搜索）保留默认玻璃底框不变，因为它们就该看着像按钮',
    ]},
    { v: 'v0.7.5', date: '2026-06-10', items: [
      '🌊 Liquid 主题加"流淌的呼吸光斑"：紫/青/粉三色光斑在背景里慢悠悠飘动',
      '⏱️ 速度：紫 28s / 青 33s / 粉 30s 错相循环（眼睛察觉不到动但下意识感到"活着"）',
      '🎨 强度：50% 中等不透明度 + 40px blur + soft-light 混合模式，融进底色不生硬',
      '🛋️ 缓解长时间盯屏的视觉疲劳：色相轮换 → 视锥细胞轮休，动态打破单色平面',
      '♿ 尊重 prefers-reduced-motion：系统设了"减少动效"自动停下变静态',
      '⚡ 性能：transform translate3d/scale → GPU 合成层，开销几乎为 0',
    ]},
    { v: 'v0.7.4', date: '2026-06-10', items: [
      '🔧 修复平板/电脑端 Liquid 主题 sidebar 遮挡对话内容的问题',
      '↩️ 撤销 v0.6.9 的"sidebar 漂浮覆盖 chat"布局，Liquid 改成跟 Dark/Light 一致：',
      '   sidebar 占左侧 280px 栏位（含 10px 外边距），#app-main 让出 margin-left:280px',
      '📐 sidebar 边距对齐顶栏/输入框：top 10px→8px 对齐 header.margin-top，左右 10px / 底 10px 对齐 input-area',
      '💧 SVG 折射 + 玻璃厚度 + 凸面 mask 全部保留，仅修布局位置',
    ]},
    { v: 'v0.7.3', date: '2026-06-10', items: [
      '🔮 边缘集中折射：SVG filter 加 radial mask，中心 55% 半径内零扭曲，边缘扭曲拉满',
      '🎯 技术：radialGradient(#808080 → #ffffff) + feComposite arithmetic 把噪声朝 128 灰 lerp',
      '📐 公式：out = (turb-128) × (mask/255) + 128，mask 灰处中和噪声、白处保留',
      '⚡ scale 70→80 让边缘扭曲更猛（中心反正不扭曲）',
      '🎨 视觉：从"均匀水波纹"→"凸面玻璃"质感，逼近 archisvaze 的真物理折射效果',
    ]},
    { v: 'v0.7.2', date: '2026-06-10', items: [
      '🌊 折射波纹加强：scale 40→70, baseFrequency 0.008→0.005（波纹幅度更大、起伏更舒缓，肉眼可见的边缘扭曲）',
      '💎 玻璃厚度感升级：sidebar / header / input-area 改用 7 层 box-shadow 模拟真玻璃斜面',
      '   ├ 顶部白高光 0.55 + 底部白反射 0.15（玻璃顶亮底微亮）',
      '   ├ 左右侧 inset 暗化 0.20（模拟玻璃侧面厚度）',
      '   ├ 内圈 30px 暗影 0.08（玻璃中央比边缘亮）',
      '   └ 外圈紫色光晕 + 黑色阴影（漂浮悬浮感）',
    ]},
    { v: 'v0.7.1', date: '2026-06-10', items: [
      '🌊 引入 SVG feDisplacementMap 折射滤镜：sidebar / header / input-area 三大面板获得"真玻璃厚度感"',
      '🎯 灵感参考 Mael-667/Liquid-Glass-CSS（GPL-3.0，仅借鉴思路，参数 baseFrequency=0.008-0.010 / scale=40 / seed=11 全自调）',
      '⚙️ 技术：feTurbulence fractalNoise 生成柏林噪声 → feDisplacementMap 用噪声 R/B 通道扭曲背景 → 透过玻璃的画面有"波动起伏"质感',
      '🛡️ @supports 兜底：Safari/Firefox/微信内置浏览器不支持 backdrop-filter:url(#) → 自动降级到 v0.7.0 纯 CSS 玻璃',
      '💬 对话气泡 / quick-btn 保持 v0.7.0 不变（避免长对话性能影响）',
    ]},
    { v: 'v0.7.0', date: '2026-06-10', items: [
      '💬 对话气泡液态玻璃化：AI 气泡 / 用户气泡 / 推荐回复 chip 全部改成同款通透质感',
      '🎯 底色 var(--bubble-ai-bg) 深底 → rgba(255,255,255,0.04) 几近透明',
      '✨ ::before 顶部白雾 90% → 18%（去掉糊雾感），::after 折射光从 12% → 6%（更细腻）',
      '🌫️ backdrop-filter: blur(40px) saturate(300%) brightness(1.45) → blur(40px) saturate(180%)（不再过曝）',
      '💡 阴影从混合白边/暗角/外阴影三层简化为单层紫色柔光',
      '👤 用户气泡：之前完全没动跟着 var 走深色底，现改为紫色淡玻璃 rgba(180,160,255,0.10)',
      '🎈 .quick-btn hover 状态加强（bg 4% → 8%，border 18% → 28%）',
    ]},
    { v: 'v0.6.9', date: '2026-06-10', items: [
      '🪟 Liquid 主题桌面端：sidebar 改为漂浮覆盖 chat（iOS 抽屉式视觉）',
      '🎯 真因：之前 #app-main margin-left:280px 让 chat 永远在 sidebar 右边不重叠，sidebar 背后只有 body 渐变没东西可虚化，所以玻璃看起来像纯色',
      '✨ 仅 Liquid 主题：#app-main 铺满整屏，sidebar position:fixed z-index:101 自然浮在上层，backdrop-filter 朦胧透出对话内容',
      '🌙 Dark / Light 主题保持原分栏布局不变',
    ]},
    { v: 'v0.6.8', date: '2026-06-10', items: [
      '🪟 真·液态玻璃大改：sidebar / header / input-area 改为纯通透质感',
      '🎯 底色 5% → 2%（几乎消失），边框 45% → 18%（极淡），顶部内高光 60% → 35%（细微）',
      '✨ ::before 顶层白雾从 90% → 22%（去掉雾面感），保留紫粉折射光斑',
      '🌫️ backdrop-filter 从 blur(60-80px) saturate(350%) brightness(1.45) 改为 blur(40px) saturate(180%)（不再过曝）',
      '💡 阴影从混合白/紫双层简化为单层紫色柔光（漂浮感更纯粹）',
      '📱 沿用 v0.6.7 手机端悬浮卡片包装（margin + border-radius + safe-area）',
    ]},
    { v: 'v0.6.7', date: '2026-06-10', items: [
      '📱 修复 Liquid 主题在手机端顶栏/输入栏没有悬浮玻璃卡片效果的问题',
      '🎯 真因：桌面端 @media (min-width:768px) 块给了 header/input-area margin+圆角，手机端缺这套几何包装，所以即使 backdrop-filter 已生效视觉上仍像实心色块',
      '✨ 新增 @media (max-width:768px) 块，仅在 liquid 主题下补齐手机端浮卡形态',
      '📐 手机端 input-area 适配 iPhone 全面屏底部 safe-area（env(safe-area-inset-bottom)）',
      '🌙 手机端 sidebar 在 Liquid 主题下右侧圆角更柔和（border-radius: 0 20px 20px 0）',
    ]},
    { v: 'v0.6.6', date: '2026-06-10', items: [
      '🎯 终极修复通透模式灰色浮雕问题（前 5 版均未生效的根因）',
      '🔧 把 background / box-shadow / backdrop-filter 拆成独立声明块，绕过 CSS 引擎对 box-shadow 多值 + !important 的解析 bug',
      '🎨 黑色阴影 rgba(0,0,0,0.3) 全部替换为紫色柔光 rgba(140,120,255,0.18)',
      '✨ 黑色内阴影 rgba(49,49,49,0.2) 全部替换为白色高光',
      '💎 新增 background-image:none 防止变量残留干扰',
      '📋 补全 v0.6.2 - v0.6.5 缺失的更新日志',
    ]},
    { v: 'v0.6.5', date: '2026-06-10', items: [
      '🔧 尝试用 !important 强制覆盖 liquid 主题 background / border / box-shadow',
      '⚠️ 实测未生效：CSS 引擎对 box-shadow 多值 + !important 处理异常导致整条规则丢弃',
    ]},
    { v: 'v0.6.4', date: '2026-06-10', items: [
      '🔧 修复 [data-theme="liquid"] .sidebar 后面的孤儿花括号',
      '⚠️ 部分生效：语法错误修了，但 background 仍被层叠覆盖',
    ]},
    { v: 'v0.6.3', date: '2026-06-10', items: [
      '🔧 尝试给通透模式补 background-color 覆盖',
      '⚠️ 引入新 bug：意外删掉/添加花括号',
    ]},
    { v: 'v0.6.2', date: '2026-06-10', items: [
      '🔧 首次尝试修复通透模式灰色浮雕问题',
      '⚠️ 未触及根因',
    ]},
    { v: 'v0.6.1', date: '2026-06-10', items: [
      '🔧 修复 SVG filter 与 backdrop-filter 冲突导致的显示异常',
      '💎 改为纯 CSS 极致方案：超低透明度 + 精密 box-shadow',
      '💎 saturate 提升至 320-350%，contrast 降至 0.8-0.85',
      '💎 三层内高光/内阴影/外投影精确复刻 Liquid Glass',
    ]},
    { v: 'v0.6.0', date: '2026-06-10', items: [
      '💎 基于 Liquid-Glass-CSS + liquid-glass 重做通透模式',
      '💎 引入 SVG feTurbulence + feDisplacementMap 折射滤镜',
      '💎 采用 linearRGB 色彩空间 + screen 混合模式',
      '💎 精密 3 层 box-shadow 叠层：内高光 + 内阴影 + 外投影',
      '💎 低频噪声 (0.009/0.011) + scale=55 实现真实玻璃折射',
      '💎 全局面板应用 panel 级滤镜，气泡/侧边栏/顶栏/输入区',
      '💎 不影响深色/浅色模式',
    ]},
    { v: 'v0.5.1', date: '2026-06-10', items: [
      '💎 通透模式全面升级：极致液态玻璃效果',
      '💎 面板透明度从 22% 降至 12%，几乎完全透明',
      '💎 backdrop-filter 增强：blur(80px) saturate(300%)',
      '💎 光球尺寸增大 60%，blur 160px，亮度提升',
      '💎 背景改为梦幻紫蓝粉极光渐变',
      '💎 文字使用深紫色调，保持高对比度',
      '💎 所有玻璃面板统一极致通透风格',
    ]},
    { v: 'v0.5.0', date: '2026-06-10', items: [
      '🆕 新增「通透模式」：超通透液态玻璃效果',
      '🎨 三档切换胶囊嵌入侧边栏：🌙 深色 / ☀️ 浅色 / 💧 通透',
      '💎 通透模式：超高透明度 + 强 backdrop-filter',
      '💎 背景光球增强，彩虹色散边缘微光',
      '💎 所有面板统一超通透风格，文字保持高对比',
    ]},
    { v: 'v0.4.2', date: '2026-06-10', items: [
      '🔧 修复右键/长按菜单不触发的问题',
      'hover 操作按钮新增「朗读」：复制/引用/朗读/重新生成',
      '右键/长按事件改为绑在整个 msg div 上',
      'PC 端右键触发菜单，移动端长按 500ms 触发',
      '流式回复完成后自动绑定操作事件',
    ]},
    { v: 'v0.4.1', date: '2026-06-10', items: [
      '🔊 右键/长按菜单新增「朗读」按钮',
      '修复右键菜单空白按钮问题',
      '菜单项：复制全文 / 引用回复 / 朗读 / 重新生成',
    ]},
    { v: 'v0.4.0', date: '2026-06-10', items: [
      '🔊 新增 AI 回复自动语音朗读功能',
      '语音开关在顶栏联网搜索旁，线性图标风格统一',
      '基于 Web Speech API，支持中文朗读',
      '朗读中按钮有脉冲动画，自动过滤代码块',
      '重新生成也会触发语音朗读',
    ]},
    { v: 'v0.3.7', date: '2026-06-10', items: [
      '🎨 顶栏改为圆角悬浮样式，与输入栏风格统一',
      '📐 侧边栏宽度从 min(300px,82vw) 改为固定 280px',
      '🔧 「什么是小纸船」改为「介绍一下你自己」',
    ]},
    { v: 'v0.3.6', date: '2026-06-10', items: [
      '🎨 侧边栏 logo 背景从红色改为透明',
      '🆕 初始快捷按钮改为通用问题：小纸船/AI新闻/文案/好书/冷知识',
      '去掉编程专属示例，降低新用户门槛',
    ]},
    { v: 'v0.3.5', date: '2026-06-10', items: [
      '🎨 顶部栏 logo 背景从红色改为透明，适配白色边缘 logo',
      '🆕 快捷按钮智能化：根据 AI 回答内容动态生成追问建议',
      '支持提取代码优化/举例说明/深入追问等 8 种追问规则',
      '智能关键词提取，自动生成技术对比追问',
    ]},
    { v: 'v0.3.4', date: '2026-06-10', items: [
      '🎨 Logo 升级为 PNG 透明背景版本',
      '新增 favicon 和 Apple touch icon',
      '删除旧 JPG logo，全站使用 PNG 格式',
      'Logo 尺寸优化：640x640 原图 + 多尺寸适配',
    ]},
    { v: 'v0.3.3', date: '2026-06-10', items: [
      '🎨 品牌重塑：全新小纸船 logo 替换火焰图标',
      '标题改为「小纸船 - codingplan-chat」',
      '所有 AI 头像位置替换为 logo 图片',
      '欢迎页、侧边栏、顶部栏全部更新 logo',
    ]},
    { v: 'v0.3.2', date: '2026-06-10', items: [
      '🆕 品牌更名为「【小纸船】codingplan-chat」',
      '新增小纸船 logo 图片文件',
    ]},
    { v: 'v0.3.1', date: '2026-06-10', items: [
      '🔧 紧急修复：页面空白 bug（SVG 滤镜库在 head 中导致 DOM 解析异常）',
      '将 SVG 滤镜库移至 body 内 display:none 容器，避免干扰 HTML 解析',
    ]},
    { v: 'v0.3.0', date: '2026-06-10', items: [
      '🆕 消息操作菜单：复制/引用/重新生成（液态玻璃风格）',
      '🆕 引用回复：点击引用将 AI 回答以 blockquote 放入输入框',
      '🆕 图片理解：支持粘贴/拖入/选择图片，以多模态格式发送给 AI',
      '🆕 右键菜单：AI 消息支持右键/长按弹出操作菜单',
      '🆕 Toast 提示：复制/引用操作有轻提示反馈',
      '🆕 消息气泡重构：操作按钮在 hover 时液态浮现',
    ]},
    { v: 'v0.2.0', date: '2026-06-10', items: [
      'API Key 设置页新增 Base URL 输入框',
      '支持接入其他兼容 OpenAI 格式的 API',
      '版本号体系改为语义化版本（0.x）',
      '更新日志补全 0.1.0-0.1.9 所有版本记录',
    ]},
    { v: 'v0.1.9', date: '2026-06-10', items: [
      '更多工具新增「设置 API Key」入口',
      '弹窗支持设置 CodingPlan Key 和博查搜索 Key',
      '后端 chat.js 和 search.js 支持自定义 Key 请求头',
      '留空使用默认 Key，填写后存储到 localStorage',
    ]},
    { v: 'v0.1.8', date: '2026-06-10', items: [
      '联网搜索改为 AI 主动调用模式（ReAct）',
      'AI 输出 <search>关键词</search> 触发搜索',
      '新增 SYSTEM_PROMPT 引导 AI 使用搜索工具',
      '搜索结果追加到上下文后 AI 给出最终回答',
    ]},
    { v: 'v0.1.7', date: '2026-06-10', items: [
      '修复联网搜索提示消息无法正确移除的 bug',
      'message-row 类名错误改为 msg',
      '改用 addMessage 返回值直接移除父元素',
    ]},
    { v: 'v0.1.6', date: '2026-06-10', items: [
      '修复云同步三个按钮点击无反应的问题',
      '补回 getCloudToken/setCloudToken/showSyncCodeDialog 缺失函数',
      '新增版本号点击查看更新日志功能',
      'updateCloudStatus 改用纯文本避免重复图标',
    ]},
    { v: 'v0.1.5', date: '2026-06-10', items: [
      '修复横屏模式侧边栏遮挡主内容区的问题',
      'app-main 改用 width: calc(100vw - 280px) 精确计算',
      '云同步迁移至 GitHub Gist API（免费永久存储）',
      '同步码 SHA-256 哈希 → 稳定 Gist ID 实现多设备同步',
    ]},
    { v: 'v0.1.4', date: '2026-06-10', items: [
      '联网搜索开关从侧边栏移到顶栏右上角',
      '横屏布局改用 margin-left + 宽度自适应',
      '顶栏搜索按钮带蓝色 on 状态样式',
    ]},
    { v: 'v0.1.3', date: '2026-06-10', items: [
      '横屏侧边栏改为 macOS 26 风格悬浮卡片',
      '距边缘 10px + 圆角 20px + 悬浮阴影',
      '主内容区改用 padding-left 让出侧边栏空间',
      '横屏模式下隐藏关闭按钮和汉堡菜单',
    ]},
    { v: 'v0.1.2', date: '2026-06-10', items: [
      '侧边栏所有 emoji 图标替换为 iOS/鸿蒙线性 SVG 图标',
      '横屏/电脑模式侧边栏默认常驻展开',
      '窗口 resize 自动切换侧边栏展开/收起状态',
    ]},
    { v: 'v0.1.1', date: '2026-06-10', items: [
      '白色模式液态玻璃效果全面优化',
      '提升所有面板透明度，增强 backdrop-filter 亮度',
      '侧边栏加入彩虹色散边缘高光',
      'AI 气泡四角色散渐变 + 顶部明亮高光',
      '输入区 Dock 多层微光边缘 + 柔和悬浮阴影',
    ]},
    { v: 'v0.1.0', date: '2026-06-09', items: [
      '品牌名改为 codingplan-chat，添加版本号',
      '侧边栏新增「更多工具」折叠面板',
      '新增联网搜索开关（博查 API 集成）',
      '新增云端备份/恢复功能（同步码多设备共享）',
      '导出/导入 .md、清空对话等基础功能',
    ]},
  ];

  let html = '<div style="text-align:center;margin-bottom:16px;font-size:18px;font-weight:700;color:var(--text-main)">📋 更新日志</div>';
  html += '<div style="max-height:60vh;overflow-y:auto;padding-right:8px">';
  changelog.forEach(entry => {
    html += `<div style="margin-bottom:14px;padding:10px 12px;border-radius:10px;background:var(--bubble-ai-bg);border:1px solid var(--bubble-ai-border)">`;
    html += `<div style="font-weight:700;color:var(--text-main);margin-bottom:4px">${entry.v} <span style="font-weight:400;font-size:11px;color:var(--text-dim)">${entry.date}</span></div>`;
    entry.items.forEach(item => {
      html += `<div style="font-size:12px;color:var(--sidebar-text);line-height:1.7;padding-left:8px">· ${item}</div>`;
    });
    html += `</div>`;
  });
  html += '</div>';

  // 创建弹窗
  const overlay = document.createElement('div');
  overlay.style.cssText = 'position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;padding:20px';
  overlay.onclick = function(e) { if (e.target === overlay) overlay.remove(); };
  
  const dialog = document.createElement('div');
  dialog.style.cssText = 'max-width:420px;width:100%;padding:20px;border-radius:18px;background:var(--sidebar-bg);backdrop-filter:blur(40px);-webkit-backdrop-filter:blur(40px);border:1px solid var(--sidebar-border);box-shadow:0 16px 48px rgba(0,0,0,0.25);color:var(--text-main)';
  dialog.innerHTML = html;
  dialog.onclick = function(e) { e.stopPropagation(); };
  
  const closeBtn = document.createElement('button');
  closeBtn.textContent = '关闭';
  closeBtn.style.cssText = 'display:block;margin:16px auto 0;padding:8px 28px;border-radius:20px;border:1px solid var(--btn-border);background:var(--btn-bg);color:var(--btn-color);cursor:pointer;font-size:13px;font-family:inherit';
  closeBtn.onclick = () => overlay.remove();
  dialog.appendChild(closeBtn);
  
  overlay.appendChild(dialog);
  document.body.appendChild(overlay);
}
(function init() {
  let saved = localStorage.getItem('codingplan-theme') || 'dark';
  if (!THEMES.includes(saved)) saved = 'dark';
  currentTheme = saved;
  document.documentElement.setAttribute('data-theme', saved);
  updateThemeSwitcherUI();

  loadConversations();
  const list = Object.values(conversations).sort((a, b) => b.updatedAt - a.updatedAt);
  if (list.length > 0) switchToConversation(list[0].id);
  else currentConversationId = createNewConversation();
  renderChatHistory();

  // 横屏/电脑模式自动展开侧边栏
  if (isDesktop()) {
    sidebar.classList.add('open');
    sidebarOverlay.classList.remove('open');
  }

  // 触发一次 resize 确保布局正确
  window.dispatchEvent(new Event('resize'));

  checkOnboarding();

  // 绑定 onboarding 按钮事件（确保在 DOM 加载后）
  const onbAgree = document.getElementById('onbAgree');
  const onbCancel = document.getElementById('onbCancel');
  if (onbAgree) onbAgree.addEventListener('click', finishOnboarding);
  if (onbCancel) onbCancel.addEventListener('click', cancelOnboarding);

  // 初始化云存储（异步，不阻塞页面）
  getCloudToken().then(() => updateCloudStatus());

  // v0.9.0: 初始化模型徽章
  if (typeof updateModelBadge === 'function') updateModelBadge();

  // v0.9.0: 初始化文件上传（图片+PDF+DOCX+文本+拖拽）
  if (typeof setupFileUpload === 'function') setupFileUpload();
})();

// ========== 输入处理 ==========