# 贡献指南

## 提交规范

提交信息和 PR 标题使用 Conventional Commits 和中文描述，例如 `feat: 添加家具筛选`。通常省略 scope，需要时可用 `fix(website): 修复图片加载`。允许的类型见 [PR 标题检查](.github/workflows/pr-title.yml)。

## 提交 PR

1. 从最新 `master` 创建功能分支，每个 PR 聚焦一项变更。
2. 提交前运行 `vp run ready`，完成静态检查、全仓测试和构建。
3. 向 `master` 创建 PR，说明目的、实现要点、影响范围和验证结果，页面改动附人工验收结果。Fork PR 需由维护者转入同仓库分支并重新开 PR，预览部署才能使用部署凭证。
4. 检查通过后，打开 PR 评论中的预览验收，使用 **Squash and merge**。PR 标题不带编号，合并提交使用 `PR 标题 (#编号)`，正文使用 PR 描述。

## 合并限制

主分支保护与必需检查以 [GitHub ruleset](https://github.com/chansyawn/loomix/rules/27083719) 为准。预览部署或回收失败时查[CI/CD 与部署](DEPLOYMENT.md#pr-检查与预览)。合并后可手动删除已用完的功能分支。
