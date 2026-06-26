## ADDED Requirements

### Requirement: Navigation menu viewport DOM structure
`NavigationMenuViewport` 的实现 SHALL 将 `NavigationMenuPrimitive.Viewport` 作为唯一定位容器，SHALL NOT 在其外层包裹额外的 `position: absolute` 元素（例如 shadcn 默认的 `<div className="absolute left-0 top-full">` wrapper）。定位样式（`absolute`、`top-full`、`left-0`、`z-index` 等）SHALL 直接应用于 Viewport primitive，以便 Radix 通过 inline style 动态设置 `left` 与 `width`，使下拉面板跟随当前激活的 trigger。

#### Scenario: Viewport has no positioning wrapper
- **WHEN** 检查 `web/src/components/ui/navigation-menu.tsx` 中 `NavigationMenuViewport` 的实现
- **THEN** SHALL NOT 存在包裹 `NavigationMenuPrimitive.Viewport` 的外层 `absolute` div
- **AND** 定位相关 class SHALL 直接位于 Viewport primitive 元素上

#### Scenario: Submenu follows second trigger horizontally
- **WHEN** 用户在桌面端（`lg+`）将指针悬停在第二个有子菜单的导航项上
- **THEN** 下拉面板 SHALL 出现在该菜单项正下方，而非导航栏最左侧
