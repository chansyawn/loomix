# AGENTS.md

## React skill

- 开发 React 组件与 Hooks 时，优先使用 React 19 最新稳定特性；使用前核对项目安装版本及 [React 官方文档](https://react.dev/reference/react)。
- 按场景使用 Actions、`useActionState`、`useOptimistic`、`useFormStatus`、`use` 与 Suspense；新组件直接接收 `ref` prop，Context 使用 `<Context value={...}>`。
- Effect 中的非响应式逻辑使用 `useEffectEvent`；需要保留隐藏 UI 状态时使用 `Activity`，过渡动画优先使用 `ViewTransition`，无额外 DOM 的节点操作可使用 Fragment refs。
- 项目已通过 `@vitejs/plugin-react` 的 `compiler: true` 与 `oxc-transform-react` 启用 React Compiler（Rust 实现目前为实验性）。保持组件与 Hooks 纯净，遵循 Rules of React，默认依赖编译器自动记忆化；仅在有明确需求或性能测量依据时添加 `memo`、`useMemo`、`useCallback`。
- 修改编译器配置时查阅 [插件文档](https://github.com/vitejs/vite-plugin-react/tree/main/packages/plugin-react#react-compiler)，运行 `vp check` 与 `vp run website#build`，并确认产物含自动记忆化代码。

## UI 组件

- 网站开发中需要基础 UI 组件时，按需使用 [shadcn/ui](https://ui.shadcn.com/) 引入，避免一次性添加未使用的组件。
- 优先通过 shadcn CLI 添加组件，并将生成的源码纳入 `apps/website` 维护；组件引入后应根据项目现有样式和交互规范进行调整。
- 添加组件前先查阅 [shadcn/ui 组件文档](https://ui.shadcn.com/docs/components)。

## 测试范围

- 不编写或引入 UI 自动化测试，包括组件渲染、DOM 断言、UI 交互、视觉快照和浏览器端到端测试；不为此添加测试依赖或配置。
- 保留并按需补充非 UI 测试，例如数据处理、业务逻辑、参数校验、URL 状态与序列化、数据加载和工具脚本测试；不依赖 UI 渲染的路由逻辑测试属于此范围。
- UI 改动通过静态检查、构建和人工验证确认，不以渲染结果或交互断言编写回归测试。
