## Why

当前导航菜单（基于 Radix UI NavigationMenu）存在明显的 UI 缺陷：鼠标悬停时菜单项整体向左偏移，下拉内容只在最右侧菜单项下方显示。这是 Radix NavigationMenu Viewport 定位机制的固有问题——Viewport 渲染在 Root 内部，受限于 Root 的 `max-w-max` 宽度，导致下拉面板定位错误。

## What Changes

- 重写导航菜单组件，弃用 Radix UI `NavigationMenu`，改用 Radix UI `DropdownMenu`（更简单、定位更可靠）或纯 CSS 方案实现下拉菜单
- 确保下拉面板正确定位在每个触发菜单项的下方，不发生整体偏移
- 保持现有的菜单数据结构和交互逻辑不变（点击文档跳转、点击标签/分类打开弹窗）

## Capabilities

### New Capabilities

### Modified Capabilities

## Impact

- `web/src/components/NavigationMenu.tsx` — 主要重写文件
- `web/src/components/ui/navigation-menu.tsx` — 可删除或简化
- `web/src/App.tsx` — 如组件 API 不变则无需修改
- 无 API 变更，无依赖变更

## Non-goals

- 不迁移到 Ant Design 或其他 UI 框架
- 不修改菜单数据结构（MenuItem 类型）或后端 API
- 不重构其他组件
- 不改变暗色模式/主题切换机制
