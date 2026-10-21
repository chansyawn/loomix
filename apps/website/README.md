# loomix 络米小站网站

「星布谷地」非官方玩家社区网站，基于 TanStack Start、Vite+ 和 Tailwind CSS 构建。当前提供图鉴检索，未来计划扩展玩家分享和在售商品信息等社区功能。

品牌名称、默认页面标题与描述集中维护于 `src/site.ts`。

在仓库根目录执行：

```bash
vp run website#dev
vp run website#build
```

首页位于 `src/routes/index.tsx`，新增路由请放在 `src/routes/` 中。
