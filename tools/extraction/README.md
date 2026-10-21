# 客户端内容提取

这里保存星布谷地客户端提取任务的文档和当前有效脚本。客户端实现变化较快，各任务直接维护自己的模块与配置，历史版本由 Git 保存。

客户端保存于 `resources/petit-planet-game/<version>/`，共用索引保存于 `resources/petit-planet-extraction/<version>/index/`。产物、日志、索引和客户端不纳入 Git。提取任务依赖本地输入，执行时关闭任务缓存。使用仓库 Node 环境，无需 Python。

## 统一提取工具

`lib/anime-studio/` 统一负责 AnimeStudio 的平台准备、版本缓存、XML 索引和资源导出。任务只通过公共模块调用工具，不自行维护可执行文件路径或启动 CLI。

首次提取时自动初始化，也可提前准备：

```sh
vp run --no-cache '@loomix/extraction#tools:init'
vp run --no-cache '@loomix/extraction#index'
```

`index` 默认读取当前 profile 的完整客户端目录，覆盖基础和 Persistent 更新资源，生成对应版本的 `index/assets_map.xml`。可用 `--input`、`--output` 和 `--game` 指定其他输入；路径相对于仓库根目录。新索引在生成完整且非空后替换目标，失败保留已有索引。使用 `--help` 查看参数，帮助命令不会初始化工具。

- Windows x64：下载固定提交的官方 .NET 10 构建并验证 SHA256，保留 CLI 与依赖布局；自动下载并校验局部标准 .NET Runtime。
- macOS arm64/x64：检出同一固定提交，应用维护中的 macOS 补丁，使用固定 SDK 编译包含运行时的原生 CLI。需要 Git、tar 和网络；无需系统级安装 .NET。Intel Mac 尚未实机验证。
- 其他平台或架构明确报错。首次准备需要联网；初始化成功后可离线复用缓存。

工具版本集中在 `lib/anime-studio/config.mjs`。当前固定 AnimeStudio 提交 `e616e3f824f47dd68cfbd44977bf8584756ac446`、SDK `10.0.402` 和 Windows Runtime `10.0.13`。Windows Actions 产物有保留期限；固定下载失效时需要显式更新版本与校验值，不自动使用最新构建。

源码、SDK、运行时、产物和初始化日志集中保存在 `resources/extraction-tools/anime-studio/`，按平台、架构和版本区分；macOS 缓存同时考虑补丁摘要。同一缓存的并发初始化会串行执行，失败重试不会复用半成品。该目录可删除后重新初始化，旧 `resources/anime-studio/` 已移除。

公共接口为 `ensureAnimeStudio()`、`exportAssets(options)` 和 `buildAssetMap(options)`，全部异步。导出参数包含 `input`、`output`、`game`、`types`，可选 `names`、`containers`（正则字符串数组）和 `logFile`。索引接口使用 `input`、`output`、`game` 与可选 `logFile`。例如任务脚本可以调用：

```js
import { exportAssets } from "../../../lib/anime-studio/index.mjs";

await exportAssets({
  input: source,
  output: destination,
  game: profile.animeGame,
  types: ["Sprite"],
  names: ["^ExactName$"],
  containers: ["^assets/example/icon\\.png$"],
  logFile,
});
```

模块处理启动错误、非零退出和 CLI 错误日志；任务继续检查预期 JSON、PNG 等产物。默认导出目录为 `MiHoYoBinData/*.json`、`Texture2D/*.png` 和 `Sprite/*.png`。当前支持范围为 HYG_CB1 的配置、XML 索引、Texture2D 与 Sprite 图标；模型、动画、音频和 Shader 转换未适配。

工具初始化不改变任务的 revision 约束。2026-10-21 的本地客户端为 data revision **1449213**、resource revision **1391927**；完整 content 任务仍锁定执行手册中的旧 revision，需要另行完成新版本字段和验收验证。

## 有效内容

[提取原理](tasks/content/docs/extraction-method.md)说明根字段 93 的收录范围、分类、属性及素材关联；[执行手册](tasks/content/docs/current-version.md)说明当前实现的命令、产物和未确认信息。

```powershell
vp run --no-cache '@loomix/extraction#content'
```

共享包 `@loomix/content-schema` 约定交付 JSON 的格式、类型、ID 唯一性和成员引用；客户端范围、数量与来源证据仍由本任务验收。Node >=22.18.0 直接加载契约的 TypeScript 源码，无需前置构建。

默认交付目录为 `resources/petit-planet-extraction/<version>/content/`，仅包含 `content.json` 和 `assets/`。JSON 按英文大类、子类分组，显示值使用中文；只包含指定基础字段和分类属性。未确认信息为 `null`。

该任务从客户端重新读取输入。中间数据、日志、来源证据、字段覆盖率和缺失原因存入 `resources/temp/content/`，按版本及输出目录标识隔离。实际工作目录会显示在运行结果中。新版本必须重新确认表 93 的范围和关联字段。

## 扩展任务

新任务使用 `tasks/<任务名>/docs/` 和 `tasks/<任务名>/scripts/`；例如菜谱使用 `tasks/recipes/`。每个任务分别提供原理文档、执行手册、当前配置和入口，并把产物写到 `resources/petit-planet-extraction/<version>/<任务名>/`，读取同版本 index 内的共用索引。

更新客户端时，先重新确认数据布局、字段含义和版本一致性，再修改配置或重写脚本，同步更新两份文档与验证样例。只有实际出现重复需求时才提取共用模块。测试只保存小型字节样例，不提交完整游戏文件、索引或生成数据库。
