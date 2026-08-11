## Why

文本画图生成的 SVG 在全屏预览中采用固定的初始与最大缩放上限；当图形内在尺寸较小时，预览只占屏幕很小区域，即使放大到最大仍难以查看。需要让预览缩放依据实际视口和图形尺寸动态计算，使 Mermaid 与 Kroki 图表都能获得可读、可继续放大的预览体验。

## What Changes

- 调整图表预览的 fit-to-screen 规则，以实际预览视口计算缩放，并允许小型 SVG 自动放大到可读尺寸。
- 将最大缩放从固定绝对倍数改为相对 fit 基准的动态上限，确保用户可在适屏状态上继续有效放大。
- 在预览视口尺寸变化时重新计算适屏基准，并确保重置操作回到当前视口对应的适屏状态。
- 统一 Mermaid 内联 SVG 与 Kroki 图片模式的缩放边界和交互语义。
- 补充小图、大图、极端宽高比及视口变化场景的验证覆盖。

## Capabilities

### New Capabilities

无。

### Modified Capabilities

- `diagram-rendering`: 明确图表预览对小尺寸 SVG 的自适应放大、相对适屏缩放上限、视口变化与重置行为。

## Impact

- 主要影响 `web/src/components/diagram/DiagramPreviewDialog.tsx` 的尺寸测量、适屏计算与缩放边界。
- 可能调整 `web/src/components/diagram/svgMeasure.ts`，以使用稳定的 SVG 内在尺寸进行计算。
- 不改变图表渲染器接口、Kroki API、缓存、下载格式或 Markdown 语法。
- 不新增运行时依赖；前端验证以纯计算测试（若现有工具链可承载）和浏览器交互回归为主。

## Non-goals

- 不修改 Mermaid/Kroki 的图表生成质量、源码解析或服务端渲染流程。
- 不重构正文中的图表布局、缩略图样式或下载功能。
- 不在本变更中建设完整的前端端到端测试基础设施。
- 普通 Markdown 位图预览的缩放策略不属于本次修复范围。
