#!/usr/bin/env bash
# bump.sh - 一键升级版本号 + 自动加 changelog 条目
#
# 用法：
#   ./bump.sh <新版本号> "<条目1>" ["<条目2>" ...]
#
# 例：
#   ./bump.sh 0.9.4 '🐛 修复 X bug' '✨ 新增 Y 功能'
#
# 自动做的事：
#   1. 把 index.html 里所有 ?v=旧版 替换成 ?v=新版（17 JS + 1 CSS）
#   2. 把 sidebar-version 显示的「v0.9.x」改成「v0.9.y」
#   3. 在 assets/js/10-changelog.js 顶部插入新版本条目
#   4. 校验：剩余旧版本号 + node syntax check
#
# 不做：git commit/push、本地预览（保留人工 review）

set -eo pipefail  # 不带 -u，避免 BSD grep 空匹配炸

if [ $# -lt 2 ]; then
  echo "用法: $0 <新版本号> '<条目1>' ['<条目2>' ...]"
  echo "例:   $0 0.9.4 '🐛 修复 X' '✨ 新增 Y'"
  exit 1
fi

NEW="$1"; shift
ITEMS=("$@")

cd "$(dirname "$0")"

# === 1. 探测当前版本号（awk 避免 grep 边界问题）===
OLD=$(awk -F'>v' '/sidebar-version/{split($2,a,"<"); print a[1]; exit}' index.html)
if [ -z "$OLD" ]; then
  echo "❌ 找不到当前版本号（sidebar-version 行）"
  exit 1
fi

if [ "$OLD" = "$NEW" ]; then
  echo "⚠️  当前已是 v$NEW，无需 bump"
  exit 0
fi

echo "🔄 v$OLD → v$NEW"
echo "📋 条目数: ${#ITEMS[@]}"
echo ""

# === 2. 替换 index.html ===
BEFORE=$(grep -c "v=$OLD" index.html || echo 0)
SIDEBAR_BEFORE=$(grep -c ">v$OLD<" index.html || echo 0)
sed -i '' "s|?v=$OLD|?v=$NEW|g" index.html
sed -i '' "s|>v$OLD<|>v$NEW<|g" index.html
AFTER=$(grep -c "v=$OLD" index.html || echo 0)
SIDEBAR_AFTER=$(grep -c ">v$OLD<" index.html || echo 0)
echo "✅ index.html: ?v= 替换 $((BEFORE - AFTER)) 处, sidebar 替换 $((SIDEBAR_BEFORE - SIDEBAR_AFTER)) 处"

if [ "$AFTER" -gt 0 ] || [ "$SIDEBAR_AFTER" -gt 0 ]; then
  echo "⚠️  仍有未替换的 v$OLD:"
  grep -n "v=$OLD\|>v$OLD<" index.html || true
fi

# === 3. 在 changelog 顶部插入新条目（用 python，sed 处理多行太脆弱）===
CHANGELOG=assets/js/10-changelog.js

# 把 bash 数组写到环境变量传给 python
export NEW_VERSION="$NEW"
export NEW_DATE=$(date +%Y-%m-%d)
# 用 \x1f (单元分隔符) join 条目，python 拆开
export NEW_ITEMS=$(printf '%s\x1f' "${ITEMS[@]}")

python3 <<'PYEOF'
import os, re

path = 'assets/js/10-changelog.js'
src = open(path).read()
new_v = os.environ['NEW_VERSION']
date = os.environ['NEW_DATE']
items = [s for s in os.environ['NEW_ITEMS'].split('\x1f') if s]

if f"v: 'v{new_v}'" in src:
    print(f'⚠️  changelog 已存在 v{new_v}，跳过插入')
    raise SystemExit(0)

items_js = ''
for it in items:
    escaped = it.replace("\\", "\\\\").replace("'", "\\'")
    items_js += f"      '{escaped}',\n"

entry = f"    {{ v: 'v{new_v}', date: '{date}', items: [\n{items_js}    ]}},\n"

m = re.search(r'(const changelog\s*=\s*\[\s*\n)', src)
if not m:
    print('❌ changelog 数组头匹配失败')
    raise SystemExit(1)
ins = m.end()
src = src[:ins] + entry + src[ins:]
open(path, 'w').write(src)
print(f'✅ changelog: 插入 v{new_v} ({len(items)} 条)')
PYEOF

# === 4. node 语法校验 ===
if command -v node >/dev/null 2>&1; then
  if node --check "$CHANGELOG" 2>/dev/null; then
    echo "✅ $CHANGELOG syntax OK"
  else
    echo "❌ $CHANGELOG syntax 失败"
    node --check "$CHANGELOG"
    exit 1
  fi
fi

echo ""
echo "═══════════════════════════════════════"
echo "✅ v$NEW bump 完成"
echo "═══════════════════════════════════════"
echo "下一步："
echo "  1. python3 -m http.server 8888 --bind 0.0.0.0   # 本地预览"
echo "  2. 人工/真机验证"
echo "  3. git commit + push"
