# 兼容性提升

支持这种配置方式：

```
tags:
  - [play, media]
categories:
  - [play, media]
```

对于 categories，可能有多条分类，每一个分类可能有多个层级。需要设计基于层级的分类管理，只需要支持两级即可，对于更深层级的分类忽略并打印warn日志即可。
