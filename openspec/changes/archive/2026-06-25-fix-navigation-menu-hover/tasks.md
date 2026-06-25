## 1. 依赖与 UI 封装

- [x] 1.1 在 `web/` 目录安装 `@radix-ui/react-navigation-menu`，更新 `web/package.json` 与 lockfile
- [x] 1.2 新增 `web/src/components/ui/navigation-menu.tsx`：按 shadcn/ui 模式导出 Root、List、Item、Trigger、Content、Link、Viewport 等组件，样式对齐现有 token（`bg-popover`、`hover:bg-accent` 等）

## 2. 导航组件迁移

- [x] 2.1 重构 `web/src/components/NavigationMenu.tsx`：顶层结构改为 `NavigationMenu` + `NavigationMenuList` + 共享 `NavigationMenuViewport`
- [x] 2.2 将 `NavItemWithDropdown` 替换为 `NavigationMenuItem` + `NavigationMenuTrigger` + `NavigationMenuContent` 组合，移除受控 `open` 状态与所有 hover 定时器
- [x] 2.3 无子菜单项改用 `NavigationMenuLink asChild` + button，保留现有 `handleLeafClick` 行为与样式
- [x] 2.4 子菜单项点击后触发 `onLeafClick` 并关闭菜单（依赖 Radix 默认行为，无需手动 `setOpen(false)`）

## 3. 清理与验证

- [x] 3.1 确认 `NavigationMenu.tsx` 不再 import `@radix-ui/react-dropdown-menu`
- [x] 3.2 运行 `cd web && npm run build`，确认 TypeScript 编译通过
- [x] 3.3 手动验证（`lg+` 视口）：hover 触发项 → 移入子菜单项无闪烁/意外关闭；项间切换正常；无子项点击行为不变
- [x] 3.4 手动验证键盘导航：Tab 聚焦、Enter 激活、Esc 关闭子菜单
