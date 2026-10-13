# 客户端内容提取

这里保存星布谷地客户端提取任务的文档和当前有效脚本。客户端实现变化较快，各任务直接维护自己的模块与配置，历史版本由 Git 保存。

## 物品数据

阅读顺序：

1. [提取原理与独立实现指南](tasks/items/docs/extraction-method.md)：完整的数据布局、解码与关联方法，不依赖本项目脚本。需要重写或更新算法时先读这份。
2. [当前版本执行手册](tasks/items/docs/current-version.md)：对应现有脚本的环境、配置、命令、产物和排查方法。需要重跑数据时读这份。

使用仓库的 Node 环境和包管理器。在仓库根目录安装依赖后执行：

```powershell
vp install
vp run --no-cache extraction#items
vp run extraction#test
```

客户端、Asset Map 和 AnimeStudio 需另行准备，位置见执行手册。全部提取脚本使用 Node；无需 Python。默认物品产物目录为：

```text
resources/petit-planet-extraction/<version>/items/
```

客户端保存于 `resources/petit-planet-game/<version>/`；对应索引保存于 `resources/petit-planet-extraction/<version>/index/`，供各任务共用。`<version>` 为客户端版本号。物品任务只写 items 目录，不覆盖共用索引。客户端版本与配置/资源 revision 分开记录，目录不再拼接 revision。

产物、日志、索引文件与客户端不纳入 Git，也不会自动接入网站。`resources/temp/` 用于存储临时文件；维护中的实现以本目录为准。提取任务依赖 Git 忽略的本地输入，执行时关闭任务缓存。

## 有效内容

[提取原理](tasks/content/docs/extraction-method.md)说明根字段 93 的收录范围、分类、属性及素材关联；[执行手册](tasks/content/docs/current-version.md)说明当前实现的命令、产物和未确认信息。

```powershell
vp run --no-cache extraction#content
```

默认交付目录为 `resources/petit-planet-extraction/<version>/content/`，仅包含 `content.json` 和 `assets/`。JSON 按英文大类、子类分组，显示值使用中文；只包含指定基础字段和分类属性。未确认信息为 `null`。

该任务从客户端重新读取输入，不依赖 items 产物或历史调查快照。中间数据、日志、来源证据、字段覆盖率和缺失原因存入 `resources/temp/content/`，按版本及输出目录标识隔离。实际工作目录会显示在运行结果中。新版本必须重新确认表 93 的范围和关联字段。

## 扩展任务

新任务使用 `tasks/<任务名>/docs/` 和 `tasks/<任务名>/scripts/`；例如菜谱使用 `tasks/recipes/`。每个任务分别提供原理文档、执行手册、当前配置和入口，并把产物写到 `resources/petit-planet-extraction/<version>/<任务名>/`，读取同版本 index 内的共用索引。

更新客户端时，先重新确认数据布局、字段含义和版本一致性，再修改配置或重写脚本，同步更新两份文档与验证样例。只有实际出现重复需求时才提取共用模块。测试只保存小型字节样例，不提交完整游戏文件、索引或生成数据库。
