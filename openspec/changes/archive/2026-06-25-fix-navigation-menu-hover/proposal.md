## Why

桌面端顶部导航的子菜单在 hover 时出现「打开 → 关闭 → 再打开」的闪烁，用户从触发项滑向子菜单项时菜单会意外关闭。当前用 `@radix-ui/react-dropdown-menu` 配合手写 timer 模拟 hover，与组件设计目标不符，体验不稳定。

## What Changes

- **替换 Radix 原语**：有子菜单的导航项从 `DropdownMenu` 迁移到 `@radix-ui/react-navigation-menu`。
- **新增 UI 封装**：添加 `web/src/components/ui/navigation-menu.tsx`（shadcn 风格薄封装，对齐现有 `button.tsx` 等）。
- **移除 hover 补丁**：删除 `NavItemWithDropdown` 中的 `useState` 定时器、受控 `open` 状态及 `onPointerEnter/Leave` 逻辑。
- **安装依赖**：在 `web/package.json` 添加 `@radix-ui/react-navigation-menu`（`components/ui/README.md` 已列为预期栈，但未安装）。
- **保留现有行为**：子菜单定位、项间切换、无子项点击、移动端 Sheet 导航不受影响。

## Capabilities

### New Capabilities

（无）

### Modified Capabilities

- `navigation-menu`: 新增 hover 稳定性与子菜单指针路径连续性的需求；明确使用 Navigation Menu 原语实现桌面端 hover 子菜单。

## Non-goals

- 不重构移动端 Sheet 导航（`lg` 以下布局保持不变）。
- 不支持多级嵌套子菜单（当前 `MenuItem` 仅一层 `children`，保持现状）。
- 不移除 `@radix-ui/react-dropdown-menu`（其他组件可能仍在使用）。
- 不调整菜单数据来源或路由逻辑。

## Impact

- **修改**：`web/src/components/NavigationMenu.tsx`（重写 `NavItemWithDropdown` 为 Navigation Menu 组合）。
- **新增**：`web/src/components/ui/navigation-menu.tsx`。
- **依赖**：`web/package.json` 新增 `@radix-ui/react-navigation-menu`。
- **Spec**：`openspec/specs/navigation-menu/spec.md` 将在归档时合并 hover 稳定性需求。
