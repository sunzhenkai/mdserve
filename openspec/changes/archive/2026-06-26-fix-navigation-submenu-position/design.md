## Context

桌面端（`lg+`）顶部导航由 `NavigationMenuWrapper` 渲染，使用 `@radix-ui/react-navigation-menu` + 共享 `NavigationMenuViewport`（2026-06-25 迁移）。hover 稳定性已修复，但子菜单定位回归：`NavigationMenuViewport` 被 shadcn 默认模板包裹在 `<div className="absolute left-0 top-full flex justify-center">` 内。

Radix 通过在 `NavigationMenuPrimitive.Viewport` 元素上设置 inline `left`/`width` 使面板跟随当前 trigger。外层 div 固定在 Root 左边缘（`left: 0`），阻断 Viewport 水平位移，导致所有子菜单出现在导航栏最左侧。

2026-04-02 变更 `custom-footer-and-fix-menu-dropdown` 曾用相同手法修复；2026-06-25 重新引入 shadcn 模板时回归。

## Goals / Non-Goals

**Goals:**

- 子菜单下拉面板定位在触发项正下方，水平跟随 trigger。
- 保留 Navigation Menu hover 稳定性（无闪烁、pointer 路径连续）。
- 最小改动：仅调整 `NavigationMenuViewport` DOM/CSS 结构。

**Non-Goals:**

- 更换 Radix 原语或重写 `NavigationMenu.tsx` 结构。
- 移动端 Sheet 导航改动。
- 调整 Root 布局（如 `max-w-max`）除非验证后仍有问题。

## Decisions

### D1：移除外层 wrapper div，样式直接挂 Viewport

**选择**：删除 `NavigationMenuViewport` 外层 `<div className="absolute left-0 top-full flex justify-center">`，将 `absolute top-full left-0 z-50`（及现有视觉样式）直接应用于 `NavigationMenuPrimitive.Viewport`。

**理由**：与 2026-04-02 已验证修复一致；Radix 可直接控制 Viewport inline style；改动面最小。

**备选**：

- *保留 wrapper，给 wrapper 设 `w-full`* → Root 受 `max-w-max` 限制，仍干扰 Radix 定位逻辑。
- *回退 DropdownMenu* → 定位可靠但 hover 需手写 timer，与 2026-06-25 目标冲突。

### D2：保留 shadcn 其余结构不变

**选择**：`NavigationMenuContent`、`NavigationMenuList`、Root 的 `delayDuration`/`skipDelayDuration` 均不改动。

**理由**：定位问题 isolated 于 Viewport wrapper；避免扩大回归面。

### D3：不 fork shadcn 其他 Viewport 视觉类

**选择**：保留现有 `origin-top-center`、`mt-1`、popover 样式、fade 动画类，仅调整定位层级。

**理由**：用户可见的 hover 行为与视觉 token 已在 2026-06-25 对齐，无需重设。

## Risks / Trade-offs

- **[Root `max-w-max` 限制 Viewport 活动范围] → 去掉 wrapper 后先手动验证多菜单项、靠右 trigger；若有个别边界 case 再单独评估 Root 宽度策略**
- **[与 shadcn 上游模板漂移] → spec 新增 Viewport DOM 约束，防止未来复制 shadcn 模板时再次引入 wrapper**
- **[z-index 层级] → Viewport 直接加 `z-50`，与 header `z-40` 保持一致，避免被遮挡**

## Migration Plan

纯前端改动，无数据迁移：

1. 修改 `web/src/components/ui/navigation-menu.tsx` 中 `NavigationMenuViewport`。
2. 本地 `npm run dev`，`lg+` 视口验证：第 2/3 个有子项菜单 hover 定位、项间切换、trigger→子项无闪烁、无子项点击、键盘 Esc/Tab。
3. 回滚：恢复 wrapper div 结构即可（hover 仍可用，定位再次错误）。

## Open Questions

- 无。修复路径已在项目历史中验证，可直接实施。
