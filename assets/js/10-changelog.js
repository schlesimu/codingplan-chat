// ========== 更新日志 (v0.9.9.0 重构) ==========
// 数据结构: { v, date, quote?, items[] }
//   - v       版本号
//   - date    日期
//   - quote   作者寄语（仅重要版本，会做大字标题渲染）
//   - items   条目（去 emoji，作品式简笔）
// 渲染: 关于页 → 翻页到更新日志页 (showChangelog → openAbout('changelog'))
// 收录范围: v0.1.0「起源」起所有大改动版本（共 75 版）

const CHANGELOG_DATA = [
  { v: 'v0.9.11.7', date: '2026-06-16',
    quote: '把钥匙交给云，让源码只剩故事。',
    items: [
      'API 凭据全部迁出源码，改由 Cloudflare 环境变量注入',
      '小纸船的代码从此可以放心公开 —— 任何人都能下载、阅读、自部署',
    ]},

  { v: 'v0.9.11.6', date: '2026-06-16',
    quote: '一本读起来更舒服的小书。',
    items: [
      '关于页书的版式按中文书籍标准重整：天头、订口、地脚比例更接近铅字时代',
      '页码独立成「页脚区」，居中显示并加细分隔线，仿宋字体衬出书卷气',
      '关于页背景与书纸张同色，无论窗口比例如何，视觉上都是一本完整的书',
      '手机端翻页不再闪烁：canvas 升级为独立合成层 + 阴影简化 + 翻页时间缩短',
      '内容溢出页码的顽疾修复（box-sizing border-box 下 clientHeight 含 padding 的判定盲区）',
    ]},

  { v: 'v0.9.11', date: '2026-06-16',
    quote: '小纸船清楚航行到了哪一天。',
    items: [
      '联网搜索升级到博查 AI Search：除网页摘要外，还能拿到天气、百科等结构化结果',
      '加入「时效性嗅探」：当你的问题里出现「今天 / 最新 / 价格 / 新闻」等关键词，开关一开就自动联网，不用等模型主动求助',
      '系统提示告诉模型今天的日期与知识截止情况，回答更不容易"活在去年"',
      '关于页更新日志重新排版：桌面正文 11→14px、寄语 14→17px、行高 1.55→1.7，纸张利用率从 50% 提到 80%+',
      '手机端更新日志字号也同步上调（正文 10.5→12px、寄语 13→14.5px），眼睛舒服一点',
      '总页数从 41 页瘦到 23 页，翻起来更顺',
    ]},

  { v: 'v0.9.10.6', date: '2026-06-16',
    quote: '让纸张真的卷起来。',
    items: [
      '关于页改为电子书翻页效果，可以拖拽页角自由翻',
      '一本完整的小书：封面 → 关于 → 更新日志 → 封底',
      '桌面双页跨页，手机自动单页',
      '去掉首页红色印章，纯文字签名更轻',
      '修复点击「查看更新日志」偶尔卡住不翻的老 bug',
    ]},

  { v: 'v0.9.10.3', date: '2026-06-15',
    items: [
      '彩蛋诗句改为「拖拽跟随」交互：手指拽多少，诗就跟着走多少',
      '拽过 40% 距离 → 完整露出停留 1.8s，拽不到则弹簧回弹',
    ]},

  { v: 'v0.9.10.2', date: '2026-06-15',
    items: [
      '修复底栏提示文「回车发送 · Shift+回车…」会被长按选中复制的问题',
      '提示文改为穿透元素，手指落上去直接到下方按钮',
    ]},

  { v: 'v0.9.10.1', date: '2026-06-15',
    items: [
      '修复长按输入框录音时，部分手机会同时弹出系统选择菜单的问题',
      '抑制只在录音期间生效，不影响平时复制粘贴',
    ]},

  { v: 'v0.9.10.0', date: '2026-06-15',
    quote: '让说话和写字，回到同一只手里。',
    items: [
      '底栏改造：移除独立麦克风按钮，「按住说话」并入输入框本体',
      '输入框单击打字，长按 0.4 秒进入语音录音转文字',
      '录音态视觉：浅红覆盖 + 实时波形 + 计时，上滑取消',
      '输入框宽度在小屏多出约 30%，长 prompt 不再被挤换行',
      '长按触发录音时 50ms 轻震动反馈',
      '通话页入口迁至加号菜单',
      '修复顶栏「来自小纸船」信封整体可点开',
      '彩蛋诗句改为下拉到底再上拉显露',
    ]},

  { v: 'v0.9.9.4', date: '2026-06-13',
    quote: '把多余的折回去，留下一艘船。',
    items: [
      '启动页大返工：从三屏拆礼物式回到一页隐私同意',
      '副标题改回「一艘装着这个时代 AI 的船。」',
      '新增信封寄语：顶栏下方一条小条，每个大版本一句寄语',
      '信封克制不打扰，「不再提示」永久关闭直到下个大版本',
      '修关于页无限下滑 bug',
      '视觉效果切换升格为侧栏底部三段胶囊',
      '字体重排：正文用宋体衬线，UI 操作区用系统无衬线',
      '修刷新页面误闯启动页的老 bug',
    ]},

  { v: 'v0.9.9.3', date: '2026-06-12',
    quote: '键也敲一下，鼠也点一下，都顺手。',
    items: [
      '桌面端键盘快捷键：⌘/Ctrl + K 新建对话、⌘/Ctrl + B 开关侧栏、⌘/Ctrl + , 设置、⌘/Ctrl + / 显示快捷键面板',
      'Esc 智能关弹窗：栈式优先级',
      '↑ 键编辑上一条用户消息（输入框为空时）',
      '顶栏新增 ⌨️ 快捷键面板入口',
      '面板自动检测系统：macOS 显 ⌘，Windows / Linux 显 Ctrl',
    ]},

  { v: 'v0.9.9.2', date: '2026-06-12',
    quote: '把这艘船的来路一笔一笔写清楚，再交到你手里。',
    items: [
      '启动页 3 屏从「黑紫夜空」改为「暖米白纸黄」基调',
      '版本号短按 → 寄语 toast，长按 → 反馈日志窗（含 UA、视口、最近消息、500 行 console）',
      '反馈日志一键复制或下载 .txt',
      '新增 console 早期拦截，确保最早期报错也能抓到',
      '更新日志补全早期 11 条，史册扩到 73 条',
      '「关于小纸船」前 🚢 删除，文案克制',
      '输入框上方快捷气泡线性图标删除，emoji + 文字统一',
    ]},

  { v: 'v0.9.9.1', date: '2026-06-12',
    quote: '把这艘船签上名字，递到你手里。',
    items: [
      '关于小纸船页 + 欢迎流程 v2 + 纸质感设计语言一次性上线',
      '欢迎流程改为 3 屏拆礼物式滑动',
      '老用户升级也会再拆一次新礼物',
      '侧栏底部新增「关于小纸船」入口，写了一封长信',
      '关于页含「这艘船建造时的世界」时间胶囊段落',
      '更新日志迁移到关于页内子页，电子书翻页效果切换',
      '所有更新日志去 emoji 重写，重要版本付寄语',
      '版本号短按 → 关于页翻到日志，长按 → 寄语彩蛋（手机震一下）',
      '首屏页脚加极小字短诗',
    ]},

  { v: 'v0.9.8.5', date: '2026-06-12',
    quote: '瓷砖摆好了，等一个会用它聊天的你。',
    items: [
      '产品定位校准：不是 IDE，是「Coding Plan 通吃各家最新模型」的移动端聊天器',
      '欢迎气泡去技术腔，新文案「把豆包、Kimi、DeepSeek、GLM、Claude 都装进了一艘小船」',
      '新对话不再空白，给出 6 张大瓷砖：商业点子 / 该不该买 / 旅行规划 / 写文案 / 解释概念 / 查动态',
      '点击瓷砖 → 半成品提示词自动填入输入框（不立即发送）',
      '瓷砖适配三主题，含玻璃质感与边缘高光',
    ]},

  { v: 'v0.9.8.4', date: '2026-06-12',
    quote: '小纸船终于学会了听你说话。',
    items: [
      '语音模块上线：加号菜单 + 按住说话 + 通话页 + 语音 API 设置',
      '输入栏图片按钮改造为加号菜单（图片 / 文件 / 通话）',
      '新增按住录音按钮，松开自动转写',
      '通话页：呼吸头像 + 渐变深空 + 按住对讲 + 浏览器原生 TTS 朗读',
      '语音 API 可独立配置（豆包 ASR / 火山 TTS 等）',
      'TTS 语速可调（0.5–2.0 倍）',
    ]},

  { v: 'v0.9.8.3', date: '2026-06-12',
    quote: '给船起了名字，给船刻了花纹。',
    items: [
      '小纸船人格首发：8 处加载文案换「小纸船划水」系列',
      '错误提示纸船化（迷航 / 风暴里翻 / 等 6 场景）',
      '提示词模板系统：内置 8 个常用模板（解释 / 写代码 / 翻译 / 邮件 / 总结 / 改写 / 写作 / 思维导图）',
      '支持自定义提示词模板，本地持久化',
      'Coding 能力首发：代码块支持实时预览（HTML / SVG）',
    ]},

  { v: 'v0.9.8.2', date: '2026-06-11', items: [
    '修复输入栏布局错位',
    '调整气泡内联代码字体回退栈，改善中文混排观感',
  ]},

  { v: 'v0.9.8.1', date: '2026-06-11', items: [
    '修复深色主题下推荐回复 chip 文字偶尔白色不可见',
    '气泡内多行代码块底色微调',
  ]},

  { v: 'v0.9.8', date: '2026-06-11',
    quote: '让这艘船在三种天气里都好看。',
    items: [
      '三主题独立审美定稿：深色 / 浅色 / 通透各自独立设计语言',
      'Liquid 玻璃质感真正生效：sidebar / header / input-area 真通透',
      '修复手机端 Liquid 主题缺玻璃卡片包装',
      '气泡液态玻璃化：AI / 用户 / 推荐 chip 全部通透',
      '黑色阴影替换为紫色柔光，去掉灰色浮雕感',
    ]},

  { v: 'v0.9.7', date: '2026-06-11',
    quote: '把船开进火山的洋流里。',
    items: [
      '正式接入火山引擎 Coding Plan API',
      '模型选择器：豆包 / Kimi / DeepSeek / GLM / Claude / MiniMax 一站切换',
      'API Key 配置支持多 provider',
      '模型显示名 + 真实 endpoint 解耦',
    ]},

  { v: 'v0.9.6', date: '2026-06-11', items: [
    '联网搜索接入火山搜索 API',
    '搜索结果引用块样式重做（卡片 + 来源链接）',
    '修复联网开关切换会话后不同步',
  ]},

  { v: 'v0.9.5.9', date: '2026-06-11', items: [
    '修复 Markdown 表格在窄屏下溢出',
    '调整代码块 copy 按钮在小屏的位置避免压字',
  ]},

  { v: 'v0.9.5.8', date: '2026-06-11', items: [
    '修复部分模型流式响应换行符吞掉',
    'KaTeX 数学公式渲染容错',
  ]},

  { v: 'v0.9.5.7', date: '2026-06-11', items: [
    'Mermaid 流程图渲染：```mermaid 自动转图',
    '兼容 flowchart / sequence / gantt / class 四种图型',
  ]},

  { v: 'v0.9.5.6', date: '2026-06-11', items: [
    '导出当前对话 / 全部对话为 Markdown',
    '导出包含模型信息、时间戳、完整气泡内容',
  ]},

  { v: 'v0.9.5.5', date: '2026-06-11', items: [
    '会话搜索（侧栏顶部 ⌘K）：标题 + 内容全文检索',
    '搜索高亮匹配片段',
  ]},

  { v: 'v0.9.5.4', date: '2026-06-11', items: [
    '会话标题自动生成（首条 AI 回复后自动总结）',
    '可手动重命名会话',
  ]},

  { v: 'v0.9.5.3', date: '2026-06-11', items: [
    '气泡操作菜单：复制全文 / 引用回复 / 朗读 / 重新生成',
    'PC 右键、移动端长按 500ms 触发',
  ]},

  { v: 'v0.9.5.2', date: '2026-06-11', items: [
    '修复云端同步在弱网下卡死',
    '同步状态指示器：未同步 / 同步中 / 已同步',
  ]},

  { v: 'v0.9.5.1', date: '2026-06-11', items: [
    '云同步链路稳定化',
    '同步码缩短为 8 位 base32',
  ]},

  { v: 'v0.9.5', date: '2026-06-11',
    quote: '学会跨设备带着对话走。',
    items: [
      '云端同步 + 跨设备扫码上线',
      '所有会话 + 配置加密存储到用户私有空间',
      '扫码同步：手机扫电脑二维码 1 秒拉取所有数据',
      '一键导出 / 导入配置 JSON',
    ]},

  { v: 'v0.9.4', date: '2026-06-11', items: [
    '会话本地持久化',
    '应用启动时恢复上次最后一个会话',
  ]},

  { v: 'v0.9.3', date: '2026-06-11', items: [
    '修复部分老 iOS Safari 上欢迎页按钮无响应',
  ]},

  { v: 'v0.9.2', date: '2026-06-11', items: [
    '修复深色主题部分按钮 hover 后状态错乱',
    '统一所有图标按钮 tap-highlight 透明（移动端去蓝框）',
  ]},

  { v: 'v0.9.1', date: '2026-06-11', items: [
    '修复 v0.9.0 引入的初次启动空白屏',
  ]},

  { v: 'v0.9.0', date: '2026-06-11',
    quote: '一艘正在试航的小船。',
    items: [
      '主题系统重构：三主题（深色 / 浅色 / 通透）切换',
      '通透模式（Liquid Glass）首版上线',
      '主题切换胶囊嵌入侧栏底部',
      '所有面板统一玻璃风格，文字保持高对比',
    ]},

  { v: 'v0.8.4', date: '2026-06-11', items: [
    '欢迎页拆出独立模块',
    '本地存储改名加前缀避免冲突',
  ]},

  { v: 'v0.8.2', date: '2026-06-11', items: [
    '欢迎页隐私文案重写：明确数据仅存本地',
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
    'chip 改为多行自适应',
  ]},

  { v: 'v0.7.4', date: '2026-06-10', items: [
    '修复深色主题下分享卡片背景色错误',
  ]},

  { v: 'v0.7.3', date: '2026-06-10', items: [
    '分享对话功能：生成只读链接',
  ]},

  { v: 'v0.7.2', date: '2026-06-10', items: [
    '修复联网搜索结果在 Markdown 引用块下嵌套错乱',
  ]},

  { v: 'v0.7.1', date: '2026-06-10', items: [
    '气泡 hover 操作按钮淡入动画',
  ]},

  { v: 'v0.7.0', date: '2026-06-10', items: [
    '对话气泡液态玻璃化：AI / 用户 / chip 全部通透质感',
    '黑色阴影改紫色柔光，漂浮感更纯粹',
  ]},

  { v: 'v0.6.9', date: '2026-06-10', items: [
    'Liquid 主题桌面端 sidebar 改为漂浮覆盖（iOS 抽屉式）',
    'sidebar 背后透出对话内容，玻璃质感真生效',
  ]},

  { v: 'v0.6.8', date: '2026-06-10', items: [
    '真·液态玻璃大改：底色和边框透明度大幅下调',
    '饱和度调回正常，避免过曝',
  ]},

  { v: 'v0.6.7', date: '2026-06-10', items: [
    '修复 Liquid 主题手机端缺浮卡几何包装',
    '手机端输入区适配 iPhone 全面屏 safe-area',
  ]},

  { v: 'v0.6.6', date: '2026-06-10', items: [
    '终极修复通透模式灰色浮雕（前 5 版未真生效的根因）',
    '黑阴影 → 紫色柔光，黑内阴影 → 白色高光',
  ]},

  { v: 'v0.6.1', date: '2026-06-10', items: [
    '极致液态玻璃：超低透明度 + 精密阴影',
    '三层内高光 / 内阴影 / 外投影精确复刻 Liquid Glass',
  ]},

  { v: 'v0.6.0', date: '2026-06-10', items: [
    '基于 Liquid-Glass-CSS 重做通透模式',
    'SVG 折射滤镜，低频噪声实现真实玻璃折射',
    '不影响深色 / 浅色模式',
  ]},

  { v: 'v0.5.1', date: '2026-06-10', items: [
    '通透模式全面升级：极致液态玻璃',
    '面板透明度从 22% 降至 12%，几乎完全透明',
    '背景改梦幻紫蓝粉极光渐变',
  ]},

  { v: 'v0.5.0', date: '2026-06-10', items: [
    '新增「通透模式」：超通透液态玻璃效果',
    '三档切换胶囊嵌入侧栏：深色 / 浅色 / 通透',
  ]},

  { v: 'v0.4.2', date: '2026-06-10', items: [
    '修复右键 / 长按菜单不触发的问题',
    'hover 操作按钮新增「朗读」',
  ]},

  { v: 'v0.4.1', date: '2026-06-10', items: [
    '右键 / 长按菜单新增「朗读」按钮',
    '修复菜单空白按钮问题',
  ]},

  { v: 'v0.4.0', date: '2026-06-10', items: [
    'AI 回复自动语音朗读',
    '语音开关在顶栏，朗读中按钮有脉冲动画',
  ]},

  { v: 'v0.3.7', date: '2026-06-10', items: [
    '顶栏改圆角悬浮，与输入栏风格统一',
    '侧栏宽度固定 280px',
  ]},

  { v: 'v0.3.6', date: '2026-06-10', items: [
    '侧栏 logo 背景从红色改透明',
    '初始快捷按钮改通用问题：小纸船 / AI 新闻 / 文案 / 好书 / 冷知识',
  ]},

  { v: 'v0.3.5', date: '2026-06-10', items: [
    '顶栏 logo 背景透明化适配白色边缘 logo',
    '快捷按钮智能化：根据 AI 回答动态生成追问建议',
  ]},

  { v: 'v0.3.4', date: '2026-06-10', items: [
    'Logo 升级为 PNG 透明背景版本',
    '新增 favicon 和 Apple touch icon',
  ]},

  { v: 'v0.3.3', date: '2026-06-10', items: [
    '品牌重塑：全新小纸船 logo 替换火焰图标',
    '标题改为「小纸船 - codingplan-chat」',
  ]},

  { v: 'v0.3.2', date: '2026-06-10',
    quote: '今天起，我有名字了。',
    items: [
      '正式起名「小纸船」（codingplan-chat）',
      '从一个无名前端 demo，变成一个想被人记住的小作品',
    ]},

  { v: 'v0.3.1', date: '2026-06-10',
    quote: '这艘船的最后一天还没有名字。',
    items: [
      '紧急修复：页面空白 bug',
    ]},

  { v: 'v0.3.0', date: '2026-06-10',
    items: [
      '消息操作菜单：复制 / 引用 / 重新生成（液态玻璃风格）',
      '引用回复：把 AI 回答以 blockquote 形式放进输入框',
      '图片理解：支持粘贴 / 拖入 / 选择图片，多模态发送',
      '右键菜单：AI 消息支持右键 / 长按弹出操作菜单',
      'Toast 提示：复制 / 引用操作有轻提示反馈',
    ]},

  { v: 'v0.2.0', date: '2026-06-10',
    items: [
      'API Key 设置页新增 Base URL 输入框',
      '支持接入其他兼容 OpenAI 格式的 API',
      '版本号体系改为语义化版本',
    ]},

  { v: 'v0.1.9', date: '2026-06-10',
    items: [
      '更多工具新增「设置 API Key」入口',
      '弹窗支持设置 CodingPlan Key 和博查搜索 Key',
      '留空使用默认 Key，填写后存储到本地',
    ]},

  { v: 'v0.1.8', date: '2026-06-10',
    items: [
      '联网搜索改为 AI 主动调用模式（ReAct）',
      'AI 输出 <search>关键词</search> 触发搜索',
      '搜索结果追加到上下文后 AI 给出最终回答',
    ]},

  { v: 'v0.1.6', date: '2026-06-10',
    items: [
      '修复云同步三个按钮点击无反应',
      '新增版本号点击查看更新日志功能',
    ]},

  { v: 'v0.1.5', date: '2026-06-10',
    items: [
      '修复横屏模式侧栏遮挡主内容区',
      '云同步迁移至 GitHub Gist API（免费永久存储）',
      '同步码改为 SHA-256 哈希实现多设备同步',
    ]},

  { v: 'v0.1.4', date: '2026-06-10',
    items: [
      '联网搜索开关从侧栏移到顶栏右上角',
      '横屏布局改用 margin-left + 宽度自适应',
      '顶栏搜索按钮带蓝色 on 状态样式',
    ]},

  { v: 'v0.1.3', date: '2026-06-10',
    items: [
      '横屏侧栏改为 macOS 26 风格悬浮卡片',
      '距边缘 10px + 圆角 20px + 悬浮阴影',
      '横屏模式下隐藏关闭按钮和汉堡菜单',
    ]},

  { v: 'v0.1.2', date: '2026-06-10',
    items: [
      '侧栏所有 emoji 图标替换为 iOS / 鸿蒙线性 SVG 图标',
      '横屏 / 电脑模式侧栏默认常驻展开',
    ]},

  { v: 'v0.1.1', date: '2026-06-10',
    items: [
      '白色模式液态玻璃效果全面优化',
      '侧栏加入彩虹色散边缘高光',
      'AI 气泡四角色散渐变 + 顶部明亮高光',
      '输入区 Dock 多层微光边缘 + 柔和悬浮阴影',
    ]},

  { v: 'v0.1.0', date: '2026-06-09',
    quote: '故事从这里开始。',
    items: [
      '品牌名改为 codingplan-chat，加上版本号',
      '侧栏新增「更多工具」折叠面板',
      '新增联网搜索开关',
      '新增云端备份 / 恢复功能（同步码多设备共享）',
      '导出 / 导入 .md、清空对话等基础功能',
    ]},
];

// ========== 渲染：把 changelog 数据 → StPageFlip 多个 .book-pf-page（v0.9.10.6） ==========
// 旧版输出到 #changelogPaperContent（单个滚动容器内）。新版按 ~10 版/页拆分，
// 输出多个 .book-pf-page DOM 字符串，由 02-onboarding.js 在构建翻页书时插入。
//
// 分页策略：每页装下大约一屏的高度 — 8-12 个版本，重要寄语版（quote 字段）单独
// 一页起头。最后一页留 footer 寄语。

// 分页策略（v0.9.11 修补）: 桌面/平板字号上调（cl-list 11→14px、line-height 1.55→1.7），
// 移动端字号也上调（cl-list 10.5→12px、cl-quote 13→14.5px）。
// 之前 v0.9.10.6 用"虚拟行数"估算 + 18 行预算 → 桌面页只填到 50%（每页 1-2 个 entry，下半页空白）。
// v0.9.11 改用"像素高度"估算 + 像素预算，更贴近真实占用。
//
// 桌面/平板单页可用高度：~530px - padding(52+64) = ~414px；预算 640px 是为了"激进塞满"
// （估算函数比真实高估 ~14%，640 估算 ≈ 550 物理 ≈ 80%+ 填充率）
// 移动端单页可用：屏幕 portrait ~430px - padding(28+32) = ~370px，估算高估 ~14% → 预算 420
// 留 22px 给 page-num + 12px 缓冲，最后一页再扣 footer 60px
// 分页策略（v0.9.11 修补·二）：之前 640 静态预算 → 短屏挤、长屏空。
// 进一步修（11-14 页内容溢出反馈）：直接读 _calcBookSize 真实算出的 bookH，
// 减去单页 padding（桌面 56+32=88，移动 40+24=64）和安全边距（45px）
function _changelogIsMobile() {
  return (typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(max-width: 640px)').matches);
}
function _changelogPxBudget() {
  if (typeof window === 'undefined') return 440;
  // 优先读 02-onboarding 实例化前暂存的 bookH（最准）
  let bookH = 0;
  if (window.__bookSizeForChangelog && window.__bookSizeForChangelog.height) {
    bookH = window.__bookSizeForChangelog.height;
  }
  // 次之：现场调 _calcBookSize（可能 stage rect 还没结算）
  if (!bookH) {
    try {
      if (typeof window._calcBookSize === 'function') {
        const sz = window._calcBookSize();
        if (sz && sz.height) bookH = sz.height;
      }
    } catch(_) {}
  }
  // 兜底：用 vh 估
  if (!bookH) {
    const vh = window.innerHeight || 700;
    bookH = Math.floor(vh * 0.85);
  }
  if (_changelogIsMobile()) {
    // 移动端单页 padding 40+24=64，留 50px 安全（page-num 22 + 余量 + footer 风险）
    return Math.max(360, bookH - 64 - 50);
  }
  // 桌面单页 padding 56+32=88，留 50px 安全
  return Math.max(420, bookH - 88 - 50);
}
function _changelogPxBudgetLast() {
  // 最后一页要给 footer（约 60px）让一让
  return _changelogPxBudget() - 60;
}
// 兼容旧引用（下方 packPages 里已经不用了，留着防外部调用）
const CHANGELOG_LINES_BUDGET = 18;
const CHANGELOG_LINES_BUDGET_LAST = 13;
// 单行平均字符数（仅用于物理像素估算里的"长 item 折行"判断）
function _changelogLineChars() {
  return _changelogIsMobile() ? 22 : 24;
}

// 估算一个版本条目的"物理高度（像素）"——按当前 CSS 实际字号 + line-height 测量出的经验值
function _estChangelogEntryPx(x) {
  const isMobile = _changelogIsMobile();
  const lineChars = _changelogLineChars();
  // 每行实际行高（line-height × font-size）
  // mobile: 12×1.55 ≈ 19  / desktop: 14×1.7 ≈ 24
  const itemLineH = isMobile ? 19 : 24;
  const quoteH    = isMobile ? 30 : 38;        // 寄语单行高度（含 margin）
  const metaH     = isMobile ? 19 : 22;        // meta 行高
  const entryGapH = isMobile ? 18 : 22;        // section margin-bottom + dashed border padding
  let px = 0;
  if (x.quote) {
    px += quoteH;
    px += metaH; // cl-meta-quote 还在
  } else {
    px += metaH;
  }
  for (const it of (x.items || [])) {
    const s = String(it).trim();
    if (!s) continue;
    // 长文本折行
    const lines = Math.max(1, Math.ceil(s.length / lineChars));
    px += lines * itemLineH;
  }
  px += entryGapH;
  return px;
}

// v0.9.11 修补·二：估算函数严重低估（估算 600 实际 800+），改用真实 DOM 测高
// 在分页前一次性把每个 entry 渲染到 off-screen 测真实物理高度
function _renderEntryHTML(x) {
  let h = '<section class="cl-entry">';
  if (x.quote) {
    h += '<h2 class="cl-quote">' + escapeHTML(x.quote) + '</h2>';
    h += '<div class="cl-meta cl-meta-quote">' + escapeHTML(x.v) + ' · ' + escapeHTML(x.date) + '</div>';
  } else {
    h += '<div class="cl-meta">' + escapeHTML(x.v) + ' · ' + escapeHTML(x.date) + '</div>';
  }
  h += '<ul class="cl-list">';
  for (const it of (x.items || [])) {
    if (it && String(it).trim()) h += '<li>' + escapeHTML(it) + '</li>';
  }
  h += '</ul></section>';
  return h;
}
function _measureEntryHeights(data) {
  if (typeof document === 'undefined') {
    // SSR/测试兜底：回退到估算
    return data.map(x => _estChangelogEntryPx(x));
  }
  // v0.9.11 修补·二：用真实 bookW 测高（之前写死 540 在宽屏上偏窄会高估折行）
  const isMobile = _changelogIsMobile();
  let probeWidth = isMobile ? 360 : 540;
  if (window.__bookSizeForChangelog && window.__bookSizeForChangelog.width) {
    probeWidth = window.__bookSizeForChangelog.width;
  }
  const probePadding = isMobile ? '40px 28px 24px' : '56px 64px 32px';
  const probe = document.createElement('div');
  probe.className = 'book-pf-page';
  probe.style.cssText = `width:${probeWidth}px; padding:${probePadding}; box-sizing:border-box; position:fixed; left:-9999px; top:0; visibility:hidden;`;
  document.body.appendChild(probe);
  const heights = [];
  for (const x of data) {
    probe.innerHTML = _renderEntryHTML(x);
    const sec = probe.querySelector('.cl-entry');
    heights.push(sec ? sec.scrollHeight : 0);
  }
  probe.remove();
  return heights;
}

// 旧估算函数保留：作为 SSR/无 DOM 兜底（_measureEntryHeights 走不到时使用）

// v0.9.11 修补·三：Word 式真实溢出分页
// 不再"先测每条高度再算预算"——直接造一个跟真实页同尺寸的 probe，
// 一条条塞进去，scrollHeight > clientHeight 就退回开新页。
// 优点：100% 不会溢出（CSS、行折、字体差异都自动适配）
// 缺点：O(N) DOM 测量但 N=80 行级别，不到 50ms
function _packChangelogByOverflow(data, opts) {
  if (typeof document === 'undefined') return null; // SSR 走估算分支
  
  const isMobile = _changelogIsMobile();
  const sz = (typeof window !== 'undefined' && window.__bookSizeForChangelog) || null;
  const pageW = sz ? sz.width : (isMobile ? 360 : 540);
  const pageH = sz ? sz.height : (isMobile ? 600 : 600);
  // v0.9.11 修补·五：probe padding 必须跟真实 CSS .book-pf-page 一致（中文书籍版式）
  // 桌面：上 56 / 左右 48 / 下 80（地脚 80px 给页脚区让位）
  // 移动：上 36 / 左右 22 / 下 56
  const padding = isMobile ? '36px 22px 56px' : '56px 48px 80px';
  
  // probe：与真实页同 W/H 同 padding，box-sizing border-box → clientHeight 就是内容区高
  const probe = document.createElement('div');
  probe.className = 'book-pf-page';
  probe.style.cssText = `width:${pageW}px; height:${pageH}px; padding:${padding}; box-sizing:border-box; position:fixed; left:-9999px; top:0; visibility:hidden; overflow:hidden;`;
  document.body.appendChild(probe);
  
  // 存放真实 entry 容器（不带 page-num，但要为最后一页留 footer 空间）
  const inner = document.createElement('div');
  probe.appendChild(inner);
  
  // v0.9.11 修补·五：CSS padding-bottom 80px = 页脚区（分隔线 + page-num 居中 32px bottom）
  // 桌面 padding 56/48/80，移动 36/22/56
  // 真实可写区域 = pageH - paddingTop - paddingBottom
  // ⚠️ 注意：probe.clientHeight 在 box-sizing:border-box 下 = padding-box 高 = 整个 height（不是 inner area）
  // 所以 fits 判定要手动扣 padding：inner.scrollHeight + paddingTop + paddingBottom + reserve <= pageH
  const PAD_TOP = isMobile ? 36 : 56;
  const PAD_BOTTOM = isMobile ? 56 : 80;
  // FOOTER_RESERVE_LAST 是末页 footer 寄语的高度（在 padding-bottom 区域占不下，要从内容区借空间）
  // FOOTER_RESERVE_NORMAL: padding-bottom 已经留出页脚带，0 即可
  const FOOTER_RESERVE_LAST = 60; // footer 寄语 ~ 60px，要从内容区借
  const FOOTER_RESERVE_NORMAL = 56; // 内容到分隔线 + 分隔线到 page-num 的安全间距（实测 probe 比真页矮约 40-50px）
  
  function fits(reserve) {
    // 内容区高 = pageH - padTop - padBottom
    // 内容 + reserve 须 ≤ 内容区高
    const contentArea = pageH - PAD_TOP - PAD_BOTTOM;
    return inner.scrollHeight + reserve <= contentArea;
  }
  
  const pages = [[]];
  for (let i = 0; i < data.length; i++) {
    const x = data[i];
    const isLastEntry = (i === data.length - 1);
    const reserve = isLastEntry ? FOOTER_RESERVE_LAST : FOOTER_RESERVE_NORMAL;
    
    // 试塞当前页
    const html = _renderEntryHTML(x);
    const wrap = document.createElement('div');
    wrap.innerHTML = html;
    const node = wrap.firstElementChild;
    inner.appendChild(node);
    
    if (fits(reserve)) {
      pages[pages.length - 1].push(x);
    } else {
      // 溢出，退回，开新页
      inner.removeChild(node);
      // 但如果当前页已经空，说明这条单独都装不下 → 强制塞，独占一页
      if (pages[pages.length - 1].length === 0) {
        pages[pages.length - 1].push(x);
        // 清空 inner 准备下一页
        inner.innerHTML = '';
        pages.push([]);
        continue;
      }
      // 当前页已满，开新页
      pages.push([x]);
      inner.innerHTML = '';
      inner.appendChild(node);
    }
  }
  
  // 收尾：清掉最后空页
  while (pages.length && pages[pages.length - 1].length === 0) pages.pop();
  
  probe.remove();
  return pages;
}

function buildChangelogBookPages() {
  const data = CHANGELOG_DATA || [];
  if (!data.length) return '';

  // v0.9.11 修补·三：优先走 Word 式真实溢出分页
  let pages = _packChangelogByOverflow(data);
  
  // SSR/失败兜底：用估算分页（旧逻辑）
  if (!pages) {
    const heights = _measureEntryHeights(data);
    const budget = _changelogPxBudget();
    const budgetLast = _changelogPxBudgetLast();
    pages = (function packEst() {
      const out = [[]];
      let used = 0;
      for (let i = 0; i < data.length; i++) {
        const x = data[i];
        const ln = heights[i];
        const isLastEntry = (i === data.length - 1);
        const b = isLastEntry ? budgetLast : budget;
        if (ln > b) {
          if (out[out.length-1].length === 0) {
            out[out.length-1].push(x); out.push([]); used = 0;
          } else {
            out.push([x]); out.push([]); used = 0;
          }
          continue;
        }
        if (used + ln > b && out[out.length-1].length > 0) {
          out.push([x]); used = ln;
        } else {
          out[out.length-1].push(x); used += ln;
        }
      }
      while (out.length && out[out.length-1].length === 0) out.pop();
      return out;
    })();
  }

  // v0.9.11 修补·三：StPageFlip 双页摊开要求总页数偶数
  // 关于书结构：前 3 页关于 + 1 页 changelog 序 + N 页 changelog = 4 + N
  // 要总偶数 ⇒ N（changelog 内容页数）必须偶数
  // 如果 changelog 内容页数奇数 → 补一页空白尾页
  if (pages.length % 2 === 1) {
    pages.push([{ __filler: true, v: '', date: '', items: [] }]);
  }
  let totalPages = pages.length;
  let html = '';

  html += `
    <div class="book-pf-page">
      <h1 class="pf-h1">更新日志</h1>
      <div class="pf-meta">CHANGELOG · 自 v0.1.0 起</div>
      <div class="pf-divider"></div>
      <p class="no-indent" style="text-align:center; color:var(--paper-ink-dim, #6a5839); font-size:13px; margin-top:24px;">
        每个版本都是给那一刻的礼物<br>
        共 ${data.length} 个版本，分 ${totalPages} 页记录
      </p>
      <div class="pf-page-num">— 序 —</div>
    </div>`;

  // 每个分片渲染一页
  pages.forEach((slice, pageIdx) => {
    // 若是 filler 空白尾页（凑偶数用），渲染一句寄语 + page-num
    if (slice.length === 1 && slice[0].__filler) {
      html += `
        <div class="book-pf-page" style="display:flex; flex-direction:column; align-items:center; justify-content:center; text-align:center;">
          <div style="font-family:'STKaiti','KaiTi',var(--paper-serif); font-size:13px; color:var(--paper-ink-dim, #6a5839); letter-spacing:2.5px;">
            （留白）
          </div>
          <div class="pf-page-num" style="margin-top:auto;">— ${pageIdx + 1} / ${pages.length} —</div>
        </div>`;
      return;
    }
    let entries = '';
    for (const x of slice) {
      entries += '<section class="cl-entry">';
      if (x.quote) {
        entries += '<h2 class="cl-quote">' + escapeHTML(x.quote) + '</h2>';
        entries += '<div class="cl-meta cl-meta-quote">' + escapeHTML(x.v) + ' · ' + escapeHTML(x.date) + '</div>';
      } else {
        entries += '<div class="cl-meta">' + escapeHTML(x.v) + ' · ' + escapeHTML(x.date) + '</div>';
      }
      entries += '<ul class="cl-list">';
      for (const it of (x.items || [])) {
        if (it && String(it).trim()) entries += '<li>' + escapeHTML(it) + '</li>';
      }
      entries += '</ul>';
      entries += '</section>';
    }

    // 最后一页加 footer（要避开 filler 空白尾页）
    let footer = '';
    const lastContentIdx = (pages[pages.length-1].length === 1 && pages[pages.length-1][0].__filler)
      ? pages.length - 2
      : pages.length - 1;
    if (pageIdx === lastContentIdx) {
      footer = `
        <div style="margin-top:20px; padding-top:14px; border-top:1px solid var(--paper-divider, rgba(120,80,30,0.25));
                    text-align:center; font-family:'STKaiti','KaiTi',var(--paper-serif);
                    font-size:13px; color:var(--paper-ink, #2b2118); letter-spacing:1.5px; text-indent:0;">
          —— 一艘还在更新的小船<br>
          <span style="display:block; margin-top:6px; font-size:11px;
                       color:var(--paper-ink-dim, #6a5839); letter-spacing:2.5px;">
            每个版本，都是给那一刻的礼物
          </span>
        </div>`;
    }

    html += `
      <div class="book-pf-page">
        ${entries}
        ${footer}
        <div class="pf-page-num">— ${pageIdx + 1} / ${totalPages} —</div>
      </div>`;
  });

  return html;
}

// ========== 旧入口兼容：renderChangelogPaper（v0.9.10.6 起 no-op） ==========
// v0.9.10.6 之前是把 changelog 注入到 #changelogPaperContent 单个滚动容器；
// 新版改为 StPageFlip 多页渲染，DOM 容器不再存在。保留函数避免外部代码报错。
function renderChangelogPaper() {
  const container = document.getElementById('changelogPaperContent');
  if (!container) return; // 新版关于页里这个 ID 已不存在 → 直接返回
  // 兜底：万一旧缓存的 HTML 还在用，把内容塞回去（防御性，理论上走不到）
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
  window.buildChangelogBookPages = buildChangelogBookPages;
  window.showChangelog = showChangelog;
}

// v0.9.10.6 起不再 DOM-ready 时预渲染（新关于页是按需懒构建的，不需要预填）
// 旧的 renderChangelogPaper() 在新关于页里也不会找到目标容器，直接 no-op。
