## Purpose

定义桌面端导航菜单的交互行为与实现约束，确保 hover 子菜单稳定、定位跟随触发项，并通过 `@radix-ui/react-navigation-menu` 实现。
## Requirements
### Requirement: Navigation dropdown positioning
下拉菜单面板 SHALL 定位在触发它的菜单项正下方，面板水平位置跟随触发项，而非固定在导航栏某一侧。实现 SHALL 使用 Navigation Menu 共享 Viewport，在 hover 交互下保持 trigger 与面板之间的 pointer 路径连续。

#### Scenario: Hover on second menu item
- **WHEN** 鼠标悬停在第二个有子菜单的导航项上
- **THEN** 下拉面板出现在该菜单项的正下方，水平居中对齐

#### Scenario: Hover switch between items
- **WHEN** 鼠标从第一个子菜单项移动到第二个子菜单项
- **THEN** 第一个下拉面板关闭，第二个下拉面板在第二个菜单项下方打开，菜单项不发生水平位移

#### Scenario: No children menu item click
- **WHEN** 点击没有子菜单的导航项
- **THEN** 直接触发对应操作（打开文档、打开标签弹窗等），不出现下拉面板

### Requirement: Hover submenu stability
桌面端有子菜单的导航项 SHALL 使用 `@radix-ui/react-navigation-menu` 实现 hover 交互。当指针从触发项移入子菜单面板或子菜单项时，子菜单 SHALL 保持打开，不得出现闪烁或意外关闭。

#### Scenario: Pointer moves from trigger to submenu item
- **WHEN** 用户在桌面端（`lg+`）将指针从有子菜单的导航触发项垂直移入其子菜单项
- **THEN** 子菜单 SHALL 保持打开直至指针离开整个导航菜单区域或用户选择子项

#### Scenario: No flicker on hover
- **WHEN** 用户将指针悬停在有子菜单的导航触发项上
- **THEN** 子菜单 SHALL 稳定打开，不得出现「打开 → 关闭 → 再打开」的闪烁

#### Scenario: Switch between submenu triggers
- **WHEN** 用户将指针从一个有子菜单的导航项移动到相邻的另一个有子菜单的导航项
- **THEN** 前一个子菜单 SHALL 关闭，后一个子菜单 SHALL 打开，且切换过程 SHALL 不依赖手写 JavaScript 定时器

### Requirement: Navigation menu implementation stack
桌面端 hover 子菜单 SHALL 通过 `web/src/components/ui/navigation-menu.tsx`（基于 `@radix-ui/react-navigation-menu` 的 shadcn 风格封装）实现，SHALL NOT 使用 `@radix-ui/react-dropdown-menu` 配合手写 pointer 定时器模拟 hover。

#### Scenario: No custom hover timers
- **WHEN** 检查 `NavigationMenu.tsx` 中有子菜单项的实现
- **THEN** SHALL NOT 存在用于控制 open/close 的 `setTimeout`/`setInterval` hover 定时器逻辑

#### Scenario: Dependency installed
- **WHEN** 检查 `web/package.json` 依赖
- **THEN** SHALL 包含 `@radix-ui/react-navigation-menu`

### Requirement: Navigation menu viewport DOM structure
`NavigationMenuViewport` 的实现 SHALL 将 `NavigationMenuPrimitive.Viewport` 作为唯一定位容器，SHALL NOT 在其外层包裹额外的 `position: absolute` 元素（例如 shadcn 默认的 `<div className="absolute left-0 top-full">` wrapper）。定位样式（`absolute`、`top-full`、`left-0`、`z-index` 等）SHALL 直接应用于 Viewport primitive，以便 Radix 通过 inline style 动态设置 `left` 与 `width`，使下拉面板跟随当前激活的 trigger。

#### Scenario: Viewport has no positioning wrapper
- **WHEN** 检查 `web/src/components/ui/navigation-menu.tsx` 中 `NavigationMenuViewport` 的实现
- **THEN** SHALL NOT 存在包裹 `NavigationMenuPrimitive.Viewport` 的外层 `absolute` div
- **AND** 定位相关 class SHALL 直接位于 Viewport primitive 元素上

#### Scenario: Submenu follows second trigger horizontally
- **WHEN** 用户在桌面端（`lg+`）将指针悬停在第二个有子菜单的导航项上
- **THEN** 下拉面板 SHALL 出现在该菜单项正下方，而非导航栏最左侧

