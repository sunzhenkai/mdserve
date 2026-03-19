# UI 组件约定（shadcn 风格 + Radix primitives + Tailwind v4）

本目录下的 `components/ui/*` 是对 **Radix UI primitives** 的轻量封装，并配合你们的 **Tailwind v4** 主题 token（定义在 `web/src/styles/globals.css`）。

## 现有栈（本项目使用）
- 样式：`Tailwind CSS v4`（通过 `@theme inline` 将 CSS 变量映射到 Tailwind）
- 主题切换：`next-themes`（`attribute="class"` 切换 `.dark`；视觉 token 来自 `globals.css`）
- 组件基座：`@radix-ui/*` primitives（例如 `dialog/tabs/sheet/scroll-area/navigation-menu`）
- class 工具：`clsx + tailwind-merge`（`cn()`）

## 写新组件时的优先级
1. 先沿用已有 token 命名（如 `bg-background/text-foreground/border-border` 等），避免引入新的配色体系。
2. 优先做“薄封装”：只把 a11y/交互交给 Radix，把外观交给 Tailwind class。
3. 若只需要最基础的样式部件（如 `Separator`），可用纯 React 实现；不额外新增依赖包。

## 组件文件命名与位置
- 统一放在 `web/src/components/ui/`。
- 该目录下组件应尽量提供与 shadcn/ui 接近的 API（例如 `variant/size`），以减少页面侧改动成本。

