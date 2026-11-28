# Agent 协作约定

## 注释语言

- 源码、测试、配置与脚本中人工维护的说明性注释必须使用中文；新增或修改注释时不得引入英文说明。
- 标识符、API 名称与必要的专业术语可保留英文；工具指令注释保持原有语法，不得翻译指令或规则名称。
- 不手工翻译自动生成文件或第三方补丁上下文中的注释，避免生成结果被覆盖或补丁无法匹配上游源码。

## Lint

- 修改代码后运行 `vp check`（包含 lint、格式与类型检查），并修复所有错误；提交前的完整检查见[贡献指南](CONTRIBUTING.md#提交-pr)。

## 文档

- 使用方式、策略含义、决策依据或适用边界变化时，更新对应文档。若文首有「维护范围」引用块，先按其中的规则判断是否更新及写入哪些内容。
- 根 README 的文档表是唯一全局索引。新增、移动或改名文档时，同步更新该表和受影响的引用。

## 领域术语

- 涉及领域命名、收录边界或跨包概念时，先查阅[领域术语表](GLOSSARY.md)，代码、文档与沟通使用其中的统一含义。
- 新增概念、调整含义或消除歧义时同步更新术语表；术语表只维护定义与易混淆边界，字段映射、实现约束和操作步骤保留在所属文档中。

## React skill

- 开发 React 组件与 Hooks 时，优先使用 React 19 最新稳定特性；使用前核对项目安装版本及 [React 官方文档](https://react.dev/reference/react)。
- 按场景使用 Actions、`useActionState`、`useOptimistic`、`useFormStatus`、`use` 与 Suspense；新组件直接接收 `ref` prop，Context 使用 `<Context value={...}>`。
- Effect 中的非响应式逻辑使用 `useEffectEvent`；需要保留隐藏 UI 状态时使用 `Activity`，过渡动画优先使用 `ViewTransition`，无额外 DOM 的节点操作可使用 Fragment refs。
- 项目已通过 `@vitejs/plugin-react` 的 `compiler: true` 与 `oxc-transform-react` 启用 React Compiler（Rust 实现目前为实验性）。保持组件与 Hooks 纯净，遵循 Rules of React，默认依赖编译器自动记忆化；仅在有明确需求或性能测量依据时添加 `memo`、`useMemo`、`useCallback`。
- 修改编译器配置时查阅 [插件文档](https://github.com/vitejs/vite-plugin-react/tree/main/packages/plugin-react#react-compiler)，运行 `vp check` 与 `vp run website#build`，并确认产物含自动记忆化代码。

## UI 组件

- 优先复用现有基础组件，通过已有属性、变体和组件组合实现需求。页面特有的布局和交互放在业务层，遵循现有 lint 规则。
- 缺少合适组件时，先查阅 [shadcn/ui 组件文档](https://ui.shadcn.com/docs/components)，再通过 CLI 按需引入。只添加当前需求需要的组件及其依赖，将生成的源码纳入 `apps/website` 维护。
- 默认保留 `apps/website/src/ui/components/` 中的基础组件实现。现有接口无法合理满足需求，或需求明确涉及多个页面共用的样式或行为时，可以做最小范围的修改。
- 修改基础组件前，在进度更新中说明要改哪个组件、为什么需要改。完成后逐项列出文件、具体改动及对现有调用方的影响。同一文件里有多项独立改动时分别说明。通过 CLI 更新、覆盖或重新生成已有组件也适用此要求。
- 完成后列出本次新引入的组件及用途。以上说明用于告知，常规修改可以继续执行。

## 测试范围

- 不编写或引入 UI 自动化测试，包括组件渲染、DOM 断言、UI 交互、视觉快照和浏览器端到端测试；不为此添加测试依赖或配置。
- 保留并按需补充非 UI 测试，例如数据处理、业务逻辑、参数校验、URL 状态与序列化、数据加载和工具脚本测试；不依赖 UI 渲染的路由逻辑测试属于此范围。
- UI 改动通过静态检查、构建和人工验证确认，不以渲染结果或交互断言编写回归测试。
