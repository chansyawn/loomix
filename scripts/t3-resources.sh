#!/bin/sh
set -eu

if [ -f resources/website/resource-manifest.json ] &&
  vp run --no-cache resources verify --local; then
  exit 0
fi

if [ "${1:-}" != "--prepare" ]; then
  printf '%s\n' '当前 worktree 的网站资源缺失或校验失败。请重跑「初始化 Worktree」，再启动网站。' >&2
  exit 1
fi

printf '%s\n' '正在准备当前 worktree 的网站资源。'
refresh_output=$(vp run @loomix/extraction#refresh)
printf '%s\n' "$refresh_output"
resource_package_id=$(printf '%s\n' "$refresh_output" |
  awk '$1 == "resource-package-id:" { print $2 }')
: "${resource_package_id:?refresh 未返回资源包 ID}"

vp run @loomix/extraction#install-resources --resource-package "$resource_package_id"
vp run --no-cache resources verify --local
