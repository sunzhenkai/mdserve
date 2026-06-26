## Why

桌面端导航子菜单无论 hover 哪个有子项的菜单，下拉面板都固定在导航栏最左侧，而非触发项正下方。该行为违反现有 `navigation-menu` spec 中的定位要求，且为 2026-06-25 迁移回 `@radix-ui/react-navigation-menu` 时 reintroduce 的 Viewport 外层 wrapper div 所致（2026-04-02 曾修复过同类问题）。需在保留 hover 稳定性的前提下恢复定位跟随。

## What Changes

- 修复 `web/src/components/ui/navigation-menu.tsx` 中 `NavigationMenuViewport` 的 DOM 结构：移除外层 `absolute left-0 top-full` 包裹 div，将定位样式直接应用于 Radix Viewport 元素，使 Radix 能通过 inline style 控制水平位置。
- 手动验证 hover 定位、项间切换、trigger→子项 pointer 路径及键盘导航，确保 2026-06-25 hover 修复成果不退化。

## Non-goals

- 不更换 Radix 原语（不回退 DropdownMenu）。
- 不改动移动端 Sheet 导航。
- 不支持多级嵌套子菜单。
- 不调整菜单数据模型或 API。

## Capabilities

### New Capabilities

（无）

### Modified Capabilities

- `navigation-menu`：补充 Viewport DOM 结构约束，明确禁止阻断 Radix 定位的外层 wrapper，防止同类回归。

## Impact

- **修改**：`web/src/components/ui/navigation-menu.tsx`（`NavigationMenuViewport` 组件）
- **验证**：`web/src/components/NavigationMenu.tsx` 行为不变，仅子菜单定位修复
- **依赖**：无新增依赖
- **Spec**：`openspec/specs/navigation-menu/spec.md` 合并 delta 中的实现约束
