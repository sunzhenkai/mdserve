## 1. 重写导航菜单组件

- [x] 1.1 重写 `NavigationMenu.tsx`，将 Radix `NavigationMenu` 替换为 `DropdownMenu`，每个有子菜单的顶层项使用独立的 DropdownMenu，实现悬停打开
- [x] 1.2 为没有子菜单的顶层项渲染为普通按钮/链接，点击直接触发操作

## 2. 清理旧代码

- [x] 2.1 删除 `components/ui/navigation-menu.tsx`（不再需要的 Radix NavigationMenu 原语包装）
- [x] 2.2 检查 `package.json` 中 `@radix-ui/react-navigation-menu` 是否仍被其他组件使用，若无则移除

## 3. 验证

- [x] 3.1 本地运行 `pnpm dev`，验证导航菜单下拉面板定位正确（每个菜单项下方）
- [x] 3.2 验证悬停切换菜单项时无水平偏移/跳动
- [x] 3.3 验证暗色模式下菜单样式正常
- [x] 3.4 验证移动端不受影响（导航菜单仅在 `lg:` 以上显示）
