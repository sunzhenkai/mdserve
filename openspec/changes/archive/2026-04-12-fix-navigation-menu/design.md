## Context

当前导航菜单基于 `@radix-ui/react-navigation-menu` 实现。该组件采用 Viewport 机制——所有下拉面板都渲染在一个共享的 Viewport 元素内，Viewport 定位在 Root 元素内部。当 Root 使用 `max-w-max` 约束宽度时，Viewport 的定位范围被限制在 Root 的自然宽度内，导致：

1. 悬停触发时菜单项整体向左偏移（Root 重新计算宽度）
2. 下拉面板位置不跟随触发项，而是固定在 Viewport 区域（通常偏向最右）

当前菜单结构：顶层 MenuItem 可能有 children（子菜单）或直接是叶子节点（点击跳转）。菜单数据通过 API 获取。

## Goals / Non-Goals

**Goals:**
- 下拉面板正确定位在对应触发菜单项的正下方
- 悬停切换菜单项时无整体偏移/跳动
- 保持现有的交互逻辑（点击文档跳转、标签/分类打开弹窗）
- 保持暗色模式兼容

**Non-Goals:**
- 不替换为 Ant Design 或其他框架
- 不修改菜单数据结构或后端 API
- 不重构其他组件
- 不改变响应式行为（移动端已用 Sheet 抽屉）

## Decisions

### Decision 1: 用 Radix DropdownMenu 替代 NavigationMenu

**选择**: 每个有子菜单的顶层项使用独立的 `@radix-ui/react-dropdown-menu` 实现

**理由**:
- 项目已经依赖 `@radix-ui/react-dropdown-menu`（package.json 中有 `@radix-ui/react-dropdown-menu`）
- DropdownMenu 的定位基于触发元素，不存在 Viewport 共享问题
- API 更简单，每个下拉菜单独立渲染，互不干扰

**备选方案**:
- 纯 CSS hover 下拉（`group-hover`）——简单但需要手动管理焦点和键盘导航
- 保留 NavigationMenu 但修复 Viewport 定位——Viewport 机制是架构限制，难以通过 CSS 修复
- 使用 Headless UI 的 Menu 组件——引入新依赖，不必要

### Decision 2: 组件 API 保持不变

`NavigationMenuWrapper` 的 props 接口不变（items, onFileSelect, onTagSelect, onCategorySelect），对 `App.tsx` 零改动。

## Risks / Trade-offs

- [DropdownMenu 不支持方向键在菜单项间切换] → 可接受，当前 NavigationMenu 的键盘导航本身也有问题
- [DropdownMenu 是 click 触发而非 hover] → 使用 `onOpenChange` + `onPointerEnter` 实现悬停打开，参考常见 hover dropdown 模式
