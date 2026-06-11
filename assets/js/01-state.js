// ========== 全局状态 ==========
// (拆自 index.html v0.8.4)

let messages = [];
let isStreaming = false;
let currentTheme = 'light';
let currentConversationId = null;
let conversations = {};
let cloudToken = null;       // 用户同步码（多设备共享，作为 Gist ID 种子）
let cloudSyncing = false;    // 正在同步中
let lastCloudSync = 0;       // 上次同步时间戳
let cloudGistId = null;      // GitHub Gist ID
const CLOUD_TOKEN_KEY = 'codingplan-sync-code';
let webSearchEnabled = localStorage.getItem('webSearchEnabled') === 'true';
let pendingImages = [];      // 待发送的图片 base64
let quotedText = '';         // 引用文字

const onboarding = document.getElementById('onboarding');
const appMain = document.getElementById('app-main');
const chatArea = document.getElementById('chatArea');
const userInput = document.getElementById('userInput');
const sendBtn = document.getElementById('sendBtn');
const sidebar = document.getElementById('sidebar');
const sidebarOverlay = document.getElementById('sidebarOverlay');
const chatHistoryList = document.getElementById('chatHistoryList');
const headerTitle = document.getElementById('headerTitle');

// ========== 首次欢迎页 ==========