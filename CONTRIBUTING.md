# 贡献指南

开发环境与资源准备见 [README](README.md)，部署流程见 [CI/CD 与部署](DEPLOYMENT.md)。

## 提交规范

提交信息和 PR 标题使用 Conventional Commits，沿用仓库惯例：

```text
<type>: <中文描述>

feat: 添加家具筛选
fix: 修复友邻图片加载
docs: 补充部署文档
```

允许的类型：`feat`、`fix`、`refactor`、`perf`、`docs`、`test`、`build`、`ci`、`chore`、`revert`。通常省略 scope；需要时可用 `fix(website): 修复图片加载`。

CI 校验 PR 标题，分支内的提交也应遵循上述格式。PR 标题不带编号，Squash 合并时以 `PR 标题 (#编号)` 为提交标题、PR 描述为正文。手工指定标题时也须保留编号，例如 `feat: 添加家具筛选 (#123)`。

## 提交 PR

1. 从最新 `master` 创建功能分支，每个 PR 聚焦一项变更。
2. 提交前运行 `vp run ready`（等价于 `vp check`、全仓测试和构建）。
3. 向 `master` 创建 PR，描述变更目的、实现要点、影响范围和验证结果；页面改动附人工验收结果。
4. 等待必需检查通过，并打开 PR 评论中的预览链接验收后，使用 **Squash and merge**。

## 合并限制

`master` 通过 [GitHub ruleset](https://github.com/chansyawn/loomix/rules/27083719) 强制要求：

- 所有变更经 PR 合并，仅允许 Squash；禁止强推和删除主分支，无绕过角色。
- `Validate PR title`、`Verify website`、`Preview website` 三个检查全部通过；目前不强制要求审批人数。
- 仅同仓库分支自动部署预览；Fork PR 需由维护者转入同仓库分支后重新创建 PR。检查内容与处理细节见[CI/CD 与部署](DEPLOYMENT.md#pr-检查与预览)。

合并或关闭 PR 会自动回收预览。分支目前不会在合并后自动删除，可在确认不再需要时手动删除。
