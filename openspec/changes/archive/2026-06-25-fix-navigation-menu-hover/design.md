## Context

桌面端（`lg+`）顶部导航由 `NavigationMenuWrapper` 渲染。有子菜单的项当前通过 `NavItemWithDropdown` 实现：受控 `DropdownMenu.Root` + 手写 `pointerenter/leave` 定时器（50ms 打开 / 150ms 关闭）。内容经 `DropdownMenu.Portal` 渲染，`sideOffset={4}` 在 trigger 与面板间留下 hover 空隙。

`web/src/components/ui/README.md` 已将 `navigation-menu` 列为预期 Radix 栈，但 `web/package.json` 仅安装 `dropdown-menu`。移动端导航走 Sheet，不在本次改动范围。

## Goals / Non-Goals

**Goals:**

- 消除 hover 子菜单闪烁与意外关闭。
- 使用 Radix Navigation Menu 内置 hover 时序（`delayDuration` / `skipDelayDuration`）。
- 新增 shadcn 风格 `ui/navigation-menu.tsx`，与现有 UI 组件一致。
- 保留现有定位、样式 token（`bg-popover`、`hover:bg-accent`）与叶子项点击行为。

**Non-Goals:**

- 移动端 Sheet 导航重构。
- 多级嵌套子菜单。
- 移除项目中其他 DropdownMenu 用法。

## Decisions

### D1：用 Navigation Menu 替换 DropdownMenu hover 补丁

**选择**：`@radix-ui/react-navigation-menu` + 共享 `NavigationMenu.Viewport`。

**理由**：Navigation Menu 面向站点顶部 hover 导航，内置 pointer 意图检测、项间 `skipDelayDuration`、共享 viewport 减少 trigger↔content 间隙问题。Dropdown Menu 面向点击交互，与其内置 `onOpenChange` 冲突。

**备选**：继续修补 DropdownMenu（useRef timer、负 margin 桥接、拦截 onOpenChange）——改动小但 edge case 多，长期维护成本高。

### D2：非受控 open 状态，删除手写 timer

**选择**：移除 `useState(open)`、`openTimerRef`/`closeTimerRef` 及 trigger/content 上的 `onPointerEnter/Leave`。由 Radix 管理 open 生命周期。

**理由**：当前 timer 存于 `useState`（非 ref）导致多余重渲染；受控 `open` 与 Radix 内部关闭逻辑（焦点、点击外部）互相打架。

### D3：shadcn 薄封装 `ui/navigation-menu.tsx`

**选择**：按 shadcn/ui 标准导出 `NavigationMenu`、`NavigationMenuList`、`NavigationMenuItem`、`NavigationMenuTrigger`、`NavigationMenuContent`、`NavigationMenuLink`、`NavigationMenuViewport` 等，样式用 `cn()` + 现有 design token。

**理由**：与 `button.tsx`、`dropdown-menu` 等组件模式一致，便于复用与维护。

### D4：Root 级 hover 时序参数

**选择**：`NavigationMenu` Root 设置 `delayDuration={200}`（默认）、`skipDelayDuration={300}`（默认）。首版不暴露为配置项。

**理由**：Radix 默认值已在大量站点验证；实现后可按 UX 反馈微调。

### D5：结构映射

**选择**：

```
NavigationMenu (Root)
  NavigationMenuList
    NavigationMenuItem (无子项) → NavigationMenuLink asChild + button
    NavigationMenuItem (有子项)
      NavigationMenuTrigger
      NavigationMenuContent → 子项 Link/button 列表
  NavigationMenuViewport
```

叶子项点击仍调用现有 `handleLeafClick`；子项点击后 Navigation Menu 自动关闭（Radix 默认行为）。

### D6：保留 DropdownMenu 依赖

**选择**：不卸载 `@radix-ui/react-dropdown-menu`。

**理由**：其他 UI 可能仍依赖；本次仅导航组件迁移。

## Risks / Trade-offs

- **[Viewport 高度/动画布局跳动] → 使用共享 Viewport + 现有 fade 动画类，与 shadcn 默认一致**
- **[delayDuration 偏慢] → 默认 200ms；可在实现后手动验证，必要时降至 100ms**
- **[键盘导航行为变化] → Navigation Menu 提供标准 arrow/Tab/Esc；实现后手动验证 a11y**
- **[与现有 positioning spec 冲突] → delta spec 明确 hover 稳定性；定位需求保持不变**

## Migration Plan

纯前端改动，无数据迁移：

1. `npm install @radix-ui/react-navigation-menu`（在 `web/` 目录）。
2. 新增 `ui/navigation-menu.tsx`。
3. 重构 `NavigationMenu.tsx`。
4. 本地 `npm run dev`，在 `lg+` 视口验证 hover、项间切换、子项点击。
5. 回滚：恢复 `NavigationMenu.tsx` 并移除新依赖/文件即可。

## Open Questions

- 是否在首版调整 `delayDuration`（如 100ms）以更接近当前 50ms 打开感？（倾向先用默认 200ms，避免误触）
- Viewport 是否固定最小高度以防切换 tab 时跳动？（倾向 shadcn 默认，观察后再定）
