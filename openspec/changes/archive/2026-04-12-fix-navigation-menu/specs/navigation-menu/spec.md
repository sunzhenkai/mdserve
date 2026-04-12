## MODIFIED Requirements

### Requirement: Navigation dropdown positioning
下拉菜单面板 SHALL 定位在触发它的菜单项正下方，面板水平位置跟随触发项，而非固定在导航栏某一侧。

#### Scenario: Hover on second menu item
- **WHEN** 鼠标悬停在第二个有子菜单的导航项上
- **THEN** 下拉面板出现在该菜单项的正下方，水平居中对齐

#### Scenario: Hover switch between items
- **WHEN** 鼠标从第一个子菜单项移动到第二个子菜单项
- **THEN** 第一个下拉面板关闭，第二个下拉面板在第二个菜单项下方打开，菜单项不发生水平位移

#### Scenario: No children menu item click
- **WHEN** 点击没有子菜单的导航项
- **THEN** 直接触发对应操作（打开文档、打开标签弹窗等），不出现下拉面板
