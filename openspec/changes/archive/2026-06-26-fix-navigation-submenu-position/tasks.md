## 1. Viewport 结构修复

- [x] 1.1 修改 `web/src/components/ui/navigation-menu.tsx`：移除 `NavigationMenuViewport` 外层 `<div className="absolute left-0 top-full flex justify-center">` wrapper
- [x] 1.2 将 `absolute top-full left-0 z-50` 及现有视觉样式（`mt-1`、`origin-top-center`、popover 边框/阴影、fade 动画、`md:w-[var(--radix-navigation-menu-viewport-width)]` 等）合并到 `NavigationMenuPrimitive.Viewport` 的 `className`

## 2. 验证

- [x] 2.1 确认 `NavigationMenuViewport` 无外层 absolute wrapper，定位 class 直接在 Viewport primitive 上（满足 spec DOM 结构约束）
- [ ] 2.2 手动验证（`lg+` 视口）：hover 第 2/3 个有子菜单项 → 面板出现在该项正下方，而非导航栏最左侧
- [ ] 2.3 手动验证项间切换：从第一个子菜单 trigger 移到第二个 → 面板跟随，菜单项无水平位移
- [ ] 2.4 手动验证 hover 稳定性不退化：trigger → 子菜单项 pointer 路径无闪烁/意外关闭；无子项点击行为不变
- [ ] 2.5 手动验证键盘导航：Tab 聚焦、Enter 激活、Esc 关闭子菜单
