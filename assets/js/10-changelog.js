// ========== 更新日志 (v0.9.9.0 重构) ==========
// 数据结构: { v, date, quote?, items[] }
//   - v       版本号
//   - date    日期
//   - quote   作者寄语（仅重要版本，会做大字标题渲染）
//   - items   条目（去 emoji，作品式简笔）
// 渲染: 关于页 → 翻页到更新日志页 (showChangelog → openAbout('changelog'))
// 收录范围: v0.3.2「起名字」起所有大改动版本（共 60 版）

const CHANGELOG_DATA = [
  { v: 'v0.9.9.1', date: '2026-06-12',
    quote: '把这艘船签上名字，递到你手里。',
    items: [
      '关于小纸船页 + 欢迎流程 v2 + 纸质感设计语言一次性上线',
      '欢迎流程改为 3 屏拆礼物式滑动：自我介绍 / 三大顾虑消除 / 纸卡寄语',
      '老用户升到 v0.9.9.1 也会再拆一次新礼物',
      '侧边栏底部新增「关于小纸船」入口，写了一封长信',
      '关于页含「这艘船建造时的世界」时间胶囊段落',
      '更新日志迁移到关于页内子页，电子书翻页效果切换（移动端支持横滑手势）',
      '所有更新日志去 emoji 重写，自 v0.3.2 起共 60 版，重要版本付作者寄语',
      '版本号短按 → 关于页内翻到更新日志，长按 500ms → 弹寄语彩蛋（手机震一下）',
      '首屏页脚加极小字短诗：「一艘小船，载着这个时代最新的几位 AI」',
      '新设计词汇：暖米白 #F5EFE0 / 墨色 #2B2118 / 朱印 #B33A28 / 衬线字 + 朱红印章',
    ]},

  { v: 'v0.9.8.5', date: '2026-06-12',
    quote: '瓷砖摆好了，等一个会用它聊天的你。',
    items: [
      '产品定位校准：不是 IDE，是「一份 Coding Plan 通吃各家最新模型」的移动端聊天器',
      '欢迎气泡改写：去掉技术腔，新文案「把豆包、Kimi、DeepSeek、GLM、Claude 都装进了一艘小船」',
      '新对话不再空白，给出 6 张大瓷砖：商业点子 / 该不该买 / 旅行规划 / 写文案 / 解释概念 / 查动态',
      '点击瓷砖 → 半成品提示词自动填入输入框（不立即发送），用户改改再发',
      '快捷提问按钮文案重设计：从程序员风改通用风',
      '瓷砖适配三主题，含玻璃质感与边缘高光',
    ]},

  { v: 'v0.9.8.4', date: '2026-06-12',
    quote: '小纸船终于学会了听你说话。',
    items: [
      '语音模块上线：加号菜单 + 按住说话 + 通话页 + 语音 API 设置',
      '输入栏图片按钮改造为加号菜单（图片 / 文件 / 通话）',
      '新增按住录音按钮，松开自动转写（默认 60 秒上限）',
      '通话页：呼吸头像 + 渐变深空 + 按住对讲 + 浏览器原生 TTS 朗读',
      '语音 API 可独立配置（豆包多模态 ASR / 火山豆包 / 浏览器 TTS / 火山 TTS）',
      'TTS 语速可调（0.5–2.0 倍），API Key 留空时沿用主 LLM 密钥',
    ]},

  { v: 'v0.9.8.3', date: '2026-06-12',
    quote: '给船起了名字，给船刻了花纹。',
    items: [
      '小纸船人格首发：8 处加载文案换「小纸船划水」系列（划水中 / 打捞 / 打草稿 / 折信封 / 归港 / 拆包 / 测水深 / 数灯油）',
      '错误提示纸船化（6 场景）：网络出错 → 小纸船迷航了；分享上传失败 → 小纸船在风暴里翻了；等',
      '提示词模板系统：输入栏新增提示词按钮，弹出模板列表',
      '内置 8 个常用模板（解释概念 / 写代码 / 翻译 / 邮件 / 总结 / 提问改写 / 写作助手 / 思维导图）',
      '支持自定义提示词模板，本地持久化',
      'Coding 能力首发：代码块支持实时预览（HTML / SVG）',
    ]},

  { v: 'v0.9.8.2', date: '2026-06-11', items: [
    '修复 v0.9.8.1 引入的输入栏布局错位（高度计算冲突）',
    '调整气泡内联代码字体回退栈，改善中文混排观感',
  ]},

  { v: 'v0.9.8.1', date: '2026-06-11', items: [
    '修复深色主题下推荐回复 chip 文字偶尔白色不可见的问题',
    '气泡内多行代码块底色微调（避免与气泡背景同色融合）',
  ]},

  { v: 'v0.9.8', date: '2026-06-11',
    quote: '让这艘船在三种天气里都好看。',
    items: [
      '三主题独立审美定稿：深色 / 浅色 / 通透各自独立设计语言',
      'Liquid 玻璃质感真正生效：sidebar / header / input-area 真通透',
      '修复手机端 Liquid 主题缺玻璃卡片包装的问题',
      '气泡液态玻璃化：AI / 用户 / 推荐回复 chip 全部同款通透质感',
      '所有黑色阴影替换为紫色柔光，去掉灰色浮雕感',
    ]},

  { v: 'v0.9.7', date: '2026-06-11',
    quote: '把船开进火山的洋流里。',
    items: [
      '正式接入火山引擎 Coding Plan API（90 元 / 月通吃国内主流模型）',
      '模型选择器：豆包 / Kimi / DeepSeek / GLM / Claude / MiniMax 一站切换',
      'API Key 配置改为支持多 provider，内置火山预设',
      '模型显示名 + 真实 endpoint 解耦，UI 友好化',
    ]},

  { v: 'v0.9.6', date: '2026-06-11', items: [
    '联网搜索接入火山搜索 API',
    '搜索结果引用块样式重做（卡片 + 来源链接）',
    '修复联网开关状态在切换会话后不同步的问题',
  ]},

  { v: 'v0.9.5.9', date: '2026-06-11', items: [
    '修复 Markdown 表格在窄屏下溢出的问题（横向滚动条）',
    '调整代码块 copy 按钮在小屏的位置避免压字',
  ]},

  { v: 'v0.9.5.8', date: '2026-06-11', items: [
    '修复部分模型流式响应换行符吞掉的问题',
    'KaTeX 数学公式渲染容错处理',
  ]},

  { v: 'v0.9.5.7', date: '2026-06-11', items: [
    'Mermaid 流程图渲染：代码块 ```mermaid 自动转图',
    '兼容 flowchart / sequence / gantt / class 四种图型',
  ]},

  { v: 'v0.9.5.6', date: '2026-06-11', items: [
    '导出当前对话 / 全部对话为 Markdown 文件',
    '导出包含模型信息、时间戳、完整气泡内容',
  ]},

  { v: 'v0.9.5.5', date: '2026-06-11', items: [
    '会话搜索（侧边栏顶部 ⌘K）：标题 + 内容全文检索',
    '搜索高亮匹配片段',
  ]},

  { v: 'v0.9.5.4', date: '2026-06-11', items: [
    '会话标题自动生成（首条 AI 回复后调一次小模型总结）',
    '可手动重命名会话',
  ]},

  { v: 'v0.9.5.3', date: '2026-06-11', items: [
    '气泡操作菜单：复制全文 / 引用回复 / 朗读 / 重新生成',
    'PC 右键 / 移动端长按 500ms 触发',
  ]},

  { v: 'v0.9.5.2', date: '2026-06-11', items: [
    '修复云端同步在弱网下的卡死问题（增加 30s 超时 + 重试）',
    '同步状态指示器（未同步 / 同步中 / 已同步）',
  ]},

  { v: 'v0.9.5.1', date: '2026-06-11', items: [
    'GitHub Gist 同步备份链路稳定化',
    '同步码缩短为 8 位 base32（之前 16 位 hex 太长）',
  ]},

  { v: 'v0.9.5', date: '2026-06-11',
    quote: '学会跨设备带着对话走。',
    items: [
      '云端同步 + 跨设备扫码上线（基于 GitHub Gist）',
      '所有会话 + 配置加密存储到用户私有 Gist',
      '扫码同步：手机扫电脑二维码 1 秒拉取所有数据',
      '一键导出 / 导入配置 JSON',
    ]},

  { v: 'v0.9.4', date: '2026-06-11', items: [
    '会话本地持久化（IndexedDB）',
    '应用启动时恢复上次最后一个会话',
  ]},

  { v: 'v0.9.3', date: '2026-06-11', items: [
    '欢迎页按钮 onclick 直接绑函数，不依赖全局变量预初始化',
    '修复部分老 iOS Safari 上欢迎页按钮无响应',
  ]},

  { v: 'v0.9.2', date: '2026-06-11', items: [
    '修复深色主题部分按钮 hover 后状态错乱',
    '统一所有图标按钮 tap-highlight 透明（移动端去蓝框）',
  ]},

  { v: 'v0.9.1', date: '2026-06-11', items: [
    '修复 v0.9.0 引入的初次启动空白屏问题',
  ]},

  { v: 'v0.9.0', date: '2026-06-11',
    quote: '一艘正在试航的小船。',
    items: [
      '主题系统重构：CSS 变量 + data-theme 属性，三主题（深色 / 浅色 / 通透）切换',
      '通透模式（Liquid Glass）首版：sidebar / header / input 真玻璃质感',
      '主题切换胶囊嵌入侧边栏底部',
      '所有面板统一玻璃风格，文字保持高对比',
    ]},

  { v: 'v0.8.4', date: '2026-06-11', items: [
    '欢迎页拆出 02-onboarding.js 独立模块',
    'localStorage 改名 codingplan-onboarded（带前缀避免冲突）',
  ]},

  { v: 'v0.8.3', date: '2026-06-11', items: [
    '修复 onboarding 完成后输入框未自动 focus',
  ]},

  { v: 'v0.8.2', date: '2026-06-11', items: [
    '欢迎页隐私文案重写：明确说明数据仅存本地',
  ]},

  { v: 'v0.8.1', date: '2026-06-11', items: [
    '欢迎页加 logo 呼吸动画',
  ]},

  { v: 'v0.8.0', date: '2026-06-11', items: [
    '首次欢迎页（鸿蒙风格）上线：图标 + 隐私说明 + 同意按钮',
  ]},

  { v: 'v0.7.9', date: '2026-06-11', items: [
    '推荐回复 chip 在 liquid 主题下的玻璃化',
  ]},

  { v: 'v0.7.8', date: '2026-06-11', items: [
    '气泡内代码块 copy 按钮 hover 反馈优化',
  ]},

  { v: 'v0.7.7', date: '2026-06-11', items: [
    '修复输入框 placeholder 在 iOS Safari 下颜色异常',
  ]},

  { v: 'v0.7.6', date: '2026-06-11', items: [
    '气泡时间戳样式微调（更细、更次要）',
  ]},

  { v: 'v0.7.5', date: '2026-06-10', items: [
    '修复推荐回复 chip 长文本溢出',
    'chip 改为多行自适应（不再截断）',
  ]},

  { v: 'v0.7.4', date: '2026-06-10', items: [
    '修复深色主题下分享卡片背景色错误',
  ]},

  { v: 'v0.7.3', date: '2026-06-10', items: [
    '分享对话功能：生成只读链接（数据走 Gist）',
  ]},

  { v: 'v0.7.2', date: '2026-06-10', items: [
    '修复联网搜索结果在 Markdown 引用块下嵌套错乱',
  ]},

  { v: 'v0.7.1', date: '2026-06-10', items: [
    '气泡 hover 操作按钮淡入动画',
  ]},

  { v: 'v0.7.0', date: '2026-06-10', items: [
    '对话气泡液态玻璃化：AI / 用户 / 推荐回复 chip 全部通透质感',
    '黑色阴影改紫色柔光（漂浮感更纯粹）',
  ]},

  { v: 'v0.6.9', date: '2026-06-10', items: [
    'Liquid 主题桌面端 sidebar 改为漂浮覆盖（iOS 抽屉式视觉）',
    'sidebar 背后透出对话内容，玻璃质感终于真生效',
  ]},

  { v: 'v0.6.8', date: '2026-06-10', items: [
    '真·液态玻璃大改：底色降到 2%，边框降到 18%',
    'backdrop-filter 从过曝调回 saturate(180%)',
  ]},

  { v: 'v0.6.7', date: '2026-06-10', items: [
    '修复 Liquid 主题手机端缺浮卡几何包装',
    '手机端 input-area 适配 iPhone 全面屏 safe-area',
  ]},

  { v: 'v0.6.6', date: '2026-06-10', items: [
    '终极修复通透模式灰色浮雕（前 5 版未生效的根因）',
    'box-shadow 多值 + !important 解析 bug 绕过：拆成独立声明块',
    '黑阴影 → 紫色柔光，黑内阴影 → 白色高光',
  ]},

  { v: 'v0.6.5', date: '2026-06-10', items: [
    '尝试用 !important 覆盖 liquid 主题 background 等属性（未生效）',
  ]},

  { v: 'v0.6.4', date: '2026-06-10', items: [
    '修复 [data-theme="liquid"] .sidebar 后的孤儿花括号',
  ]},

  { v: 'v0.6.3', date: '2026-06-10', items: [
    '尝试给通透模式补 background-color 覆盖（引入新 bug）',
  ]},

  { v: 'v0.6.2', date: '2026-06-10', items: [
    '首次尝试修复通透模式灰色浮雕问题（未触及根因）',
  ]},

  { v: 'v0.6.1', date: '2026-06-10', items: [
    '改为纯 CSS 极致方案：超低透明度 + 精密 box-shadow',
    'saturate 提升至 320–350%，contrast 降至 0.8–0.85',
    '三层内高光 / 内阴影 / 外投影精确复刻 Liquid Glass',
  ]},

  { v: 'v0.6.0', date: '2026-06-10', items: [
    '基于 Liquid-Glass-CSS 重做通透模式',
    'SVG feTurbulence + feDisplacementMap 折射滤镜',
    'linearRGB 色彩空间 + screen 混合，低频噪声实现真实玻璃折射',
    '不影响深色 / 浅色模式',
  ]},

  { v: 'v0.5.1', date: '2026-06-10', items: [
    '通透模式全面升级：极致液态玻璃',
    '面板透明度从 22% 降至 12%，几乎完全透明',
    '背景改梦幻紫蓝粉极光渐变',
  ]},

  { v: 'v0.5.0', date: '2026-06-10', items: [
    '新增「通透模式」：超通透液态玻璃效果',
    '三档切换胶囊嵌入侧边栏：深色 / 浅色 / 通透',
  ]},

  { v: 'v0.4.2', date: '2026-06-10', items: [
    '修复右键 / 长按菜单不触发的问题',
    'hover 操作按钮新增「朗读」（复制 / 引用 / 朗读 / 重新生成）',
  ]},

  { v: 'v0.4.1', date: '2026-06-10', items: [
    '右键 / 长按菜单新增「朗读」按钮',
    '修复菜单空白按钮问题',
  ]},

  { v: 'v0.4.0', date: '2026-06-10', items: [
    'AI 回复自动语音朗读（基于 Web Speech API）',
    '语音开关在顶栏，朗读中按钮有脉冲动画',
  ]},

  { v: 'v0.3.7', date: '2026-06-10', items: [
    '顶栏改圆角悬浮，与输入栏风格统一',
    '侧边栏宽度固定 280px',
    '"什么是小纸船"改为"介绍一下你自己"',
  ]},

  { v: 'v0.3.6', date: '2026-06-10', items: [
    '侧边栏 logo 背景从红色改透明',
    '初始快捷按钮改为通用问题：小纸船 / AI 新闻 / 文案 / 好书 / 冷知识',
  ]},

  { v: 'v0.3.5', date: '2026-06-10', items: [
    '顶栏 logo 背景透明化适配白色边缘 logo',
    '快捷按钮智能化：根据 AI 回答动态生成追问建议（8 种规则）',
  ]},

  { v: 'v0.3.4', date: '2026-06-10', items: [
    'Logo 升级为 PNG 透明背景版本',
    '新增 favicon 和 Apple touch icon',
  ]},

  { v: 'v0.3.3', date: '2026-06-10', items: [
    '品牌重塑：全新小纸船 logo 替换火焰图标',
    '标题改为「小纸船 - codingplan-chat」',
    '欢迎页 / 侧边栏 / 顶栏全部更新 logo',
  ]},

  { v: 'v0.3.2', date: '2026-06-10',
    quote: '今天起，我有名字了。',
    items: [
      '正式起名「小纸船」（codingplan-chat）',
      '从一个无名前端 demo，变成一个想被人记住的小作品',
      '新增小纸船 logo 图片文件',
    ]},

  { v: 'v0.3.1', date: '2026-06-10',
    quote: '这艘船的最后一天还没有名字。',
    items: [
      '紧急修复：页面空白 bug（SVG 滤镜库放在 head 中导致 DOM 解析异常）',
      '将 SVG 滤镜库移至 body 内 display:none 容器，避免干扰 HTML 解析',
    ]},

  { v: 'v0.3.0', date: '2026-06-10',
    items: [
      '消息操作菜单：复制 / 引用 / 重新生成（液态玻璃风格）',
      '引用回复：把 AI 回答以 blockquote 形式放进输入框',
      '图片理解：支持粘贴 / 拖入 / 选择图片，以多模态格式发送给 AI',
      '右键菜单：AI 消息支持右键 / 长按弹出操作菜单',
      'Toast 提示：复制 / 引用操作有轻提示反馈',
      '消息气泡重构：操作按钮在 hover 时液态浮现',
    ]},

  { v: 'v0.2.0', date: '2026-06-10',
    items: [
      'API Key 设置页新增 Base URL 输入框',
      '支持接入其他兼容 OpenAI 格式的 API',
      '版本号体系改为语义化版本（0.x.y）',
      '更新日志补全 v0.1.0–v0.1.9 所有版本记录',
    ]},

  { v: 'v0.1.9', date: '2026-06-10',
    items: [
      '更多工具新增「设置 API Key」入口',
      '弹窗支持设置 CodingPlan Key 和博查搜索 Key',
      '后端 chat.js 和 search.js 支持自定义 Key 请求头',
      '留空使用默认 Key，填写后存储到 localStorage',
    ]},

  { v: 'v0.1.8', date: '2026-06-10',
    items: [
      '联网搜索改为 AI 主动调用模式（ReAct）',
      'AI 输出 <search>关键词</search> 触发搜索',
      '新增 SYSTEM_PROMPT 引导 AI 使用搜索工具',
      '搜索结果追加到上下文后 AI 给出最终回答',
    ]},

  { v: 'v0.1.7', date: '2026-06-10',
    items: [
      '修复联网搜索提示消息无法正确移除的 bug',
      'message-row 类名错误改为 msg',
      '改用 addMessage 返回值直接移除父元素',
    ]},

  { v: 'v0.1.6', date: '2026-06-10',
    items: [
      '修复云同步三个按钮点击无反应的问题',
      '补回 getCloudToken / setCloudToken / showSyncCodeDialog 缺失函数',
      '新增版本号点击查看更新日志功能',
      'updateCloudStatus 改用纯文本避免重复图标',
    ]},

  { v: 'v0.1.5', date: '2026-06-10',
    items: [
      '修复横屏模式侧边栏遮挡主内容区的问题',
      'app-main 改用 width: calc(100vw - 280px) 精确计算',
      '云同步迁移至 GitHub Gist API（免费永久存储）',
      '同步码 SHA-256 哈希 → 稳定 Gist ID 实现多设备同步',
    ]},

  { v: 'v0.1.4', date: '2026-06-10',
    items: [
      '联网搜索开关从侧边栏移到顶栏右上角',
      '横屏布局改用 margin-left + 宽度自适应',
      '顶栏搜索按钮带蓝色 on 状态样式',
    ]},

  { v: 'v0.1.3', date: '2026-06-10',
    items: [
      '横屏侧边栏改为 macOS 26 风格悬浮卡片',
      '距边缘 10px + 圆角 20px + 悬浮阴影',
      '主内容区改用 padding-left 让出侧边栏空间',
      '横屏模式下隐藏关闭按钮和汉堡菜单',
    ]},

  { v: 'v0.1.2', date: '2026-06-10',
    items: [
      '侧边栏所有 emoji 图标替换为 iOS / 鸿蒙线性 SVG 图标',
      '横屏 / 电脑模式侧边栏默认常驻展开',
      '窗口 resize 自动切换侧边栏展开 / 收起状态',
    ]},

  { v: 'v0.1.1', date: '2026-06-10',
    items: [
      '白色模式液态玻璃效果全面优化',
      '提升所有面板透明度，增强 backdrop-filter 亮度',
      '侧边栏加入彩虹色散边缘高光',
      'AI 气泡四角色散渐变 + 顶部明亮高光',
      '输入区 Dock 多层微光边缘 + 柔和悬浮阴影',
    ]},

  { v: 'v0.1.0', date: '2026-06-09',
    quote: '故事从这里开始。',
    items: [
      '品牌名改为 codingplan-chat，加上版本号',
      '侧边栏新增「更多工具」折叠面板',
      '新增联网搜索开关（博查 API 集成）',
      '新增云端备份 / 恢复功能（同步码多设备共享）',
      '导出 / 导入 .md、清空对话等基础功能',
    ]},
];

// ========== 渲染：把 changelog 数据 → 关于页内的子页 DOM ==========
function renderChangelogPaper() {
  const container = document.getElementById('changelogPaperContent');
  if (!container) return;

  let html = '';
  for (const x of CHANGELOG_DATA) {
    html += '<section class="cl-entry">';
    if (x.quote) {
      html += '<h2 class="cl-quote">' + escapeHTML(x.quote) + '</h2>';
      html += '<div class="cl-meta cl-meta-quote">' + x.v + ' · ' + x.date + '</div>';
    } else {
      html += '<div class="cl-meta">' + x.v + ' · ' + x.date + '</div>';
    }
    html += '<ul class="cl-list">';
    for (const it of x.items) {
      if (it.trim()) html += '<li>' + escapeHTML(it) + '</li>';
    }
    html += '</ul>';
    html += '</section>';
  }
  container.innerHTML = html;
}

function escapeHTML(s) {
  return String(s).replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[c]);
}

// ========== 兼容旧入口：showChangelog() ==========
// 旧行为是直接弹一个独立 modal，新行为改为打开关于页并翻到更新日志页
function showChangelog() {
  if (typeof openAbout === 'function') {
    openAbout('changelog');
  }
}

// 暴露
if (typeof window !== 'undefined') {
  window.CHANGELOG_DATA = CHANGELOG_DATA;
  window.renderChangelogPaper = renderChangelogPaper;
  window.showChangelog = showChangelog;
}

// 初次加载就渲染好（关于页就算没打开也先把 DOM 填上，第一次开关于→翻页时才有内容）
if (typeof window !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', renderChangelogPaper);
  } else {
    renderChangelogPaper();
  }
}
