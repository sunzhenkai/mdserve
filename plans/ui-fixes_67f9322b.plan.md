---
name: ui-fixes
overview: 修复文档侧边与大纲折叠按钮遮挡、meta 阴影、全屏按钮受滚动条显隐影响，以及“标签和分类”弹窗的条件展示与 header 切换位置。
todos:
  - id: app-zindex-meta-fullscreen
    content: 在 `web/src/App.tsx` 提升折叠/展开按钮 `z-index`，删除 meta 包裹层 `shadow-sm`，并给滚动容器加入用于稳定布局的类。
    status: completed
  - id: globals-scrollbar-gutter
    content: "在 `web/src/styles/globals.css` 新增 `.mdserve-scrollbar { scrollbar-gutter: stable; }` 以避免滚动条显隐导致布局抖动。"
    status: completed
  - id: tagsmodal-header-and-conditional
    content: 在 `web/src/components/TagsModal.tsx` 移除 Tabs：将标签/分类切换放入 modal header；当未选择时不渲染“请选择标签/分类查看关联文档”区域。
    status: completed
isProject: false
---

## 目标

按你的 5 点要求完成以下 UI 调整：

1. “文档列表/大纲”折叠/展开按钮不再被中间文档 card 遮挡。
2. 文档 meta 信息下边框只保留边框，不保留阴影。
3. 滚动条隐藏/显示时，全屏按钮位置保持不变（隐藏尽量不影响布局）。
4. “请选择标签/分类查看关联文档”：当未选择标签/分类时不显示该区域。
5. “标签和分类”modal：把分类/标签切换放进 modal header（按选项 A：不使用 Tabs 组件）。

## 实施范围与关键文件

- [web/src/App.tsx](web/src/App.tsx)
- [web/src/components/TagsModal.tsx](web/src/components/TagsModal.tsx)
- [web/src/styles/globals.css](web/src/styles/globals.css)

## 具体改动

### 1) 折叠/展开按钮遮挡（文档 card 遮住）

- 在 [web/src/App.tsx](web/src/App.tsx) 中，对这几处 chevron 按钮提高层级：
  - 文件列表折叠/展开按钮（`收起文件列表` / `展开文件列表`）
  - 大纲折叠/展开按钮（`收起目录` / `展开目录`）
- 通过把按钮的 `z-10` 提升到更高值（例如 `z-20`/`z-30`）来确保它们在中间 card 之上。

### 2) 移除 meta 下边框阴影但保留边框

- 在 [web/src/App.tsx](web/src/App.tsx) 中，找到 `bg-point-soft ... border-b ... shadow-sm` 的 meta 包裹层：
  - 非全屏区域
  - 全屏区域
- 删除该包裹层上的 `shadow-sm`，保留 `border-b border-border/70`。

### 3) 滚动条隐藏时，全屏按钮不随布局抖动

- 在 [web/src/styles/globals.css](web/src/styles/globals.css) 新增一个常量类：
  - `.mdserve-scrollbar { scrollbar-gutter: stable; }`（让滚动条显隐不改变右侧可用宽度）
- 在 [web/src/App.tsx](web/src/App.tsx) 给两个滚动容器（`contentScrollRef` 与 `fullscreenScrollRef`）同时加入 `mdserve-scrollbar`：
  - 仍然通过现有逻辑只切换 `mdserve-scrollbar-hidden`（隐藏滚动条），但布局稳定。

### 4) 未选择标签/分类时，不显示“请选择标签/分类查看关联文档”组件

- 在 [web/src/components/TagsModal.tsx](web/src/components/TagsModal.tsx) 中，修改 `ItemPanel` 的底部区域：
  - 当 `selectedItem === null` 时不渲染任何关联文档区域（直接返回 `null`），不要再渲染占位文案。

### 5) “标签和分类”modal：把切换放 header，并移除 Tabs

- 在 [web/src/components/TagsModal.tsx](web/src/components/TagsModal.tsx) 中：
  - 移除 `Tabs / TabsList / TabsTrigger / TabsContent` 的用法与 import。
  - 在 modal header（标题行）加入两个切换按钮（分类/标签），根据 `activeTab` 高亮，并在切换时：
    - `setActiveTab(newTab)`
    - `setSelectedItem(null)`（保持与现有逻辑一致）
  - Body 只保留一个滚动区域：根据 `activeTab` 选择渲染标签列表或分类列表。

## 验证清单（手动）

- 桌面：折叠/展开“文件列表/目录”按钮应始终位于中间文档 card 之上且可点击。
- 非全屏：meta 下边框不再有阴影，仅保留边框。
- 全屏：滚动条隐藏/显示时，“全屏/退出全屏”按钮不发生左右漂移。
- 标签 modal：未选择标签/分类时不显示“请选择标签/分类查看关联文档”。
- 标签 modal：分类/标签切换出现在 header 且功能正常。

