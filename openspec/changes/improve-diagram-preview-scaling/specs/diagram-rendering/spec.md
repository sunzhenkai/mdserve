## MODIFIED Requirements

### Requirement: 前端图表组件抽象

前端 SHALL 抽出通用 `<Diagram>` 组件，封装所有引擎共享的 UI：loading 态、错误态、未配置提示、toolbar（源码切换 / 复制 / 下载 SVG / 全屏预览）、PreviewDialog（缩放 / 拖拽 / 滚轮 / fit-to-screen）。

PreviewDialog MUST 使用实际预览视口的可用尺寸和图表的有效内在尺寸计算适屏比例。适屏比例 MUST 是在保留安全边距且完整显示图表的前提下可采用的最大比例，系统 MUST NOT 使用阻止小尺寸 SVG 填充可用视口的固定自动放大上限。

PreviewDialog 的最大缩放比例 MUST 相对于当前适屏比例动态计算，MUST 不小于适屏比例的四倍且 MUST 不小于 `5`；最小缩放比例 MUST 不高于适屏比例。按钮与滚轮缩放 MUST 共享相同的动态边界。

PreviewDialog MUST 在实际预览视口尺寸变化时更新适屏比例。若用户仍处于适屏状态，系统 MUST 应用新的适屏比例并保持图表居中；若用户已主动缩放，系统 MUST 保留用户状态并限制在更新后的有效边界内。重置操作 MUST 返回当前视口对应的适屏比例并恢复居中。

Mermaid 内联 SVG 与 Kroki 图片模式 MUST 遵循相同的适屏、动态边界、缩放、拖拽、滚轮和重置语义。

各引擎 MUST 通过实现统一 `DiagramRenderer` 接口注入：

```typescript
interface DiagramRenderer {
  readonly engine: string
  isAvailable(): boolean
  render(code: string): Promise<string>
  getUnavailableHint?(): { title: string; solution: string }
}
```

`MermaidRenderer` 与 `KrokiRenderer` MUST 实现此接口。

#### Scenario: Mermaid 渲染注入
- **WHEN** MarkdownViewer 拦截到 `mermaid` 代码块
- **THEN** MUST 实例化 `MermaidRenderer` 并传给 `<Diagram>`
- **AND** `isAvailable()` MUST 始终返回 `true`

#### Scenario: Kroki 渲染注入
- **WHEN** MarkdownViewer 拦截到 `d2` 代码块
- **THEN** MUST 实例化 `KrokiRenderer('d2')` 并传给 `<Diagram>`
- **AND** `isAvailable()` MUST 根据后端 Kroki 配置状态返回

#### Scenario: 通用外壳复用
- **WHEN** 任一 Renderer 渲染成功
- **THEN** 展示的 toolbar、预览对话框、下载按钮 MUST 行为一致（来自 `<Diagram>` 共享实现）

#### Scenario: 小尺寸 SVG 初次适屏预览
- **WHEN** 用户打开内在宽高均明显小于预览视口的图表
- **THEN** PreviewDialog MUST 放大图表，使其在保留安全边距的前提下适配可用视口
- **AND** MUST NOT 因固定 `1.5` 倍或其他固定自动放大上限而保持为小尺寸显示

#### Scenario: 从适屏状态继续放大
- **WHEN** 图表已处于适屏比例
- **AND** 用户通过放大按钮或滚轮继续放大
- **THEN** PreviewDialog MUST 允许缩放至不小于适屏比例四倍的动态最大值
- **AND** 按钮与滚轮 MUST 在同一动态最大值处停止

#### Scenario: 大尺寸或极端宽高比图表适屏
- **WHEN** 图表的宽度或高度超过预览视口，或具有极端宽高比
- **THEN** PreviewDialog MUST 缩小图表以完整显示其全部内容
- **AND** 图表与视口边缘之间 MUST 保留安全边距

#### Scenario: 视口变化时更新适屏状态
- **WHEN** 预览视口尺寸发生变化
- **AND** 用户尚未离开适屏状态
- **THEN** PreviewDialog MUST 按新视口重新计算并应用适屏比例
- **AND** 图表 MUST 保持居中

#### Scenario: 视口变化时保留用户缩放
- **WHEN** 预览视口尺寸发生变化
- **AND** 用户已主动缩放或平移图表
- **THEN** PreviewDialog MUST 保留用户缩放和偏移
- **AND** 当前缩放 MUST 被限制在新视口对应的动态边界内

#### Scenario: 重置到当前适屏比例
- **WHEN** 用户在缩放或平移后点击重置
- **THEN** PreviewDialog MUST 使用当前预览视口对应的最新适屏比例
- **AND** 图表 MUST 恢复居中

#### Scenario: 两种嵌入模式行为一致
- **WHEN** 用户分别预览 Mermaid 内联 SVG 与 Kroki 返回的 SVG 图片
- **THEN** 两种模式 MUST 使用相同的适屏计算与动态缩放边界
- **AND** 两种模式的放大、缩小、滚轮、拖拽和重置行为 MUST 一致
