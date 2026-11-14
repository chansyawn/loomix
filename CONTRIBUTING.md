# 贡献指南

开发环境与资源准备见 [README](README.md)，CI/CD 与部署见 [部署说明](docs/deployment.md)。

## 提交规范

提交信息和 PR 标题使用 Conventional Commits，沿用仓库惯例：

```text
<type>: <中文描述>

feat: 添加家具筛选
fix: 修复友邻图片加载
docs: 补充部署说明
```

允许的类型：`feat`、`fix`、`refactor`、`perf`、`docs`、`test`、`build`、`ci`、`chore`、`revert`。通常省略 scope；需要时可用 `fix(website): 修复图片加载`。

PR 标题由 CI 自动校验；分支内每条提交目前不单独校验，仍应遵循上述格式。合并时使用 PR 标题作为 Squash 提交标题、PR 描述作为提交正文，使 `master` 保持整齐的线性历史。

## 提交 PR

1. 从最新 `master` 创建功能分支，每个 PR 聚焦一项变更。
2. 提交前运行 `vp check`、`vp run -r test` 和 `vp run website#build`。修改代码后须运行 `vp lint` 并修复错误。
3. 向 `master` 创建 PR，描述变更目的、实现要点、影响范围和验证结果；页面改动附人工验收结果。
4. 等待必需检查通过，并打开 PR 评论中的预览链接验收后，使用 **Squash and merge**。

新增测试限于非 UI 逻辑；不引入组件渲染、DOM、视觉快照或浏览器自动化测试。UI 改动通过静态检查、构建和人工验收确认。

## 合并限制

`master` 通过 [GitHub ruleset](https://github.com/chansyawn/loomix/rules/27083719) 强制要求：

- 所有变更经 PR 合并，仅允许 Squash；禁止强推和删除主分支，无绕过角色。
- `Validate PR title`、`Verify website`、`Preview website` 三个检查全部通过；目前不强制要求审批人数。
- 仅同仓库分支自动部署预览。Fork PR 的预览检查会失败，需维护者将变更转入同仓库分支，创建 PR 并完成预览后合并。

合并或关闭 PR 会自动回收预览。分支目前不会在合并后自动删除，可在确认不再需要时手动删除。
