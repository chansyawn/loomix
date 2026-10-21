# 当前版本物品提取执行手册

当前脚本对应客户端 **0.95.2**、branch `live_0.95`、data revision **1379138**、resource revision **1359983**，清单目录 **5662883**。算法、字段位置和验收常量统一记录在同级 `../scripts/config.mjs`。原理与独立重写方法见 [提取原理](extraction-method.md)。

## 环境与输入

使用仓库的 Node 和包管理环境，遵循根 package.json 的 `node >=22.18.0`；本次完整运行使用仓库 vp 管理的 Node 24.21.0。SQLite 使用 `node:sqlite`，PNG 完整解码使用声明为直接依赖的 `pngjs`；不需要 Python、系统 SQLite 或打包构建。

从仓库根目录执行 `vp install`。以下输入不在 Git 中，需要准备本地副本：

| 输入            | 默认位置（相对仓库根目录）                                    |
| --------------- | ------------------------------------------------------------- |
| 客户端版本标记  | resources/petit-planet-game/0.95.2/config.ini                 |
| 游戏数据目录    | resources/petit-planet-game/0.95.2/PetitPlanet_Data           |
| Asset Map XML   | resources/petit-planet-extraction/0.95.2/index/assets_map.xml |
| AnimeStudio CLI | 统一模块自动初始化，缓存于 resources/extraction-tools/        |

CLI 由统一提取模块自动初始化和调用，Windows 下载固定构建，macOS 本地构建；也可运行 `vp run --no-cache '@loomix/extraction#tools:init'` 提前准备，见[提取入口说明](../../../README.md#统一提取工具)。配置中的游戏模式为 HYG_CB1。Asset Map 必须由匹配客户端的基础与更新资源生成，不能只保留 item 目录或 Texture2D。

配置选择会检查 game_version、两个 revision，并扫描基础、Persistent/GenerateAssets 和 Persistent/Temp/5662883/GenerateAssets；只有 cs.obb、ed.obb 大小和 MD5 同时匹配 data_versions 清单才继续。当前选中 Temp 中的更新配置。data 包也必须匹配清单。失败时应核对输入，不要取消检查或静默回落到基础配置。

`config.mjs` 的 `paths` 可调整本地输入；路径相对仓库解析，也可配置绝对路径。Asset Map 的 Source 即使包含旧机器路径，也按 `PetitPlanet_Data/` 后的相对路径重新定位。脚本运行时无需进入特定目录。

默认客户端、索引和输出路径统一从 `profile.gameVersion` 生成。版本内 index 是各任务共用输入，items 是物品任务的输出；移动后的索引文件不改写，Source 重定位会读取版本目录中的客户端。目录只使用客户端版本号，revision 保留在配置和数据元信息中。

## 一键与分步执行

在仓库根目录执行：

```powershell
vp run --no-cache '@loomix/extraction#items'
vp run --no-cache '@loomix/extraction#items' -- --help
vp run '@loomix/extraction#test'
```

提取输入和输出都被 Git 忽略，务必使用 `--no-cache`，防止 workspace 任务缓存跳过本地数据重建。也可直接使用仓库 Node 运行入口：

```powershell
node tools/extraction/tasks/items/scripts/run.mjs --help
node tools/extraction/tasks/items/scripts/run.mjs
```

默认产物目录：`resources/petit-planet-extraction/0.95.2/items/`。覆盖输出示例：

```powershell
node tools/extraction/tasks/items/scripts/run.mjs --output resources/temp/items-check-run
```

`--output` 和 `--baseline` 均接受绝对路径或仓库相对路径，含空格时按 shell 规则加引号。输出目录用于本任务生成文件，不应指定客户端、版本内的 index 或其他应用的数据目录。原客户端与旧调查目录不会修改。

统一入口按下表顺序执行。`--step` 只跑所选步骤，不自动补跑依赖；每个 `.mjs` 也可直接执行，接受相同的 `--output` 和 `--baseline` 参数。

| 步骤名（同名 .mjs）    | 前置输入                                      | 主要产物                                                                                                          |
| ---------------------- | --------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| select-config-source   | 客户端、版本标记、data/res 清单               | active-config-source.json、version-audit.json                                                                     |
| inspect-resources      | Asset Map                                     | textures.json、sprites.json、index-summary.json 等索引摘要                                                        |
| probe-tables           | 已选 ed.obb                                   | obb-table-index.json                                                                                              |
| decode-textmap         | 已选 ed.obb                                   | textmap-zh-en.json                                                                                                |
| scan-decoded-tables    | ed.obb、表索引、TextMap                       | decoded-tables/*.json、decoded-table-summary.json                                                                 |
| decode-cs-index        | 已选 cs.obb                                   | cs-file-index.json（辅助调查）                                                                                    |
| build-resolved-catalog | 主物品/显示/类型解码表、Texture2D/Sprite 索引 | resolved-items.json/csv、resolved-types.json、resolved-summary.json、unmatched-icons.json                         |
| export-catalog-icons   | resolved-items.json、来源包、CLI              | icon-batch/ 缓存、catalog/icons/、icon-manifest.json、icon-export-failures.json                                   |
| audit-icon-sources     | 图标 manifest、来源包、版本清单               | catalog/icon-source-audit.json                                                                                    |
| build-database         | 已关联记录、类型、图标 manifest、版本检查     | catalog/petit-planet.sqlite、items.json/csv、types.json、summary.json、missing-icons.json；可选 version-diff.json |
| validate-catalog       | 最终数据、原 OBB、生物表、图标、来源审计      | catalog/validation.json、png-validation.json                                                                      |

例如在任务目录中单步验证已有产物：

```powershell
cd tools/extraction/tasks/items
node scripts/run.mjs --step validate-catalog
```

入口在输出目录生成 `run-report.json`，记录本轮参数、步骤、时间、退出码和最终状态；每次运行覆盖该文件。步骤输出保存在 `logs/<步骤>.log`，图标工具日志也放在 logs 中。任何步骤失败后入口立即退出非零，后续步骤不会执行；已经产生的文件仅供排查，不能当作已通过的完整数据集。

图标步骤按包和类型分组处理，重跑可复用同一输出目录内已有的完整导出文件；新版本应使用新目录。选定图标导出失败、PNG 非法或 CLI 返回错误会使步骤失败。配置有引用但索引没找到、或没有显示记录/图标引用，属于已记录的数据缺失，不是导出故障。

## 可选版本对比

默认不依赖旧调查快照。没有 `--baseline` 时删除本输出目录中旧的 `catalog/version-diff.json`，日志与运行报告明确标记跳过。其他数据照常生成。

基线需为含 `items` 数组的已提取 JSON，可使用完整 `catalog/items.json` 或早期 resolved-items.json。例如：

```powershell
node tools/extraction/tasks/items/scripts/run.mjs --step build-database --baseline resources/temp/petit-planet-extraction/baseline-revision-1217551/resolved-items.json
```

对比 ID 增删以及名称、类型、标签、中英文说明；来源路径、行偏移、图标缓存和本地文件位置不作为这份对比的业务字段。旧文件没有 revision 元数据时 fromRevision 为 null，不猜测它来自哪个版本。提供的基线不存在、不可解析或没有 items 数组时提前失败。

目录整理前的全部提取资料归档于 `resources/temp/petit-planet-extraction/`，包括 `items/0.95.2-rev1379138/` 中已验证的数据库。历史产物保留原内容，其中绝对来源路径可能已失效；用于数据对比时读取基础字段，不直接运行归档中的实验脚本。正式 items 目录通过当前入口重新生成。

## 产物使用与当前验收

最终数据位于输出目录的 `catalog/`：

- `petit-planet.sqlite` 含 items、types、icons、metadata；`items.type_id` 关联 types.id，icon_asset_key 关联 icons.asset_key。
- `items.json` 保留基础字段、名称 hash、原始小/大图引用、来源及版本；`items.csv` 为 UTF-8 BOM CSV。
- `icons/` 与数据集一起保留，iconFile/icon_file 相对 catalog 目录。icon-manifest 保存 Source、PathID、类型、尺寸和 SHA256。
- `missing-icons.json` 记录无本地图标的物品；summary 和两个 validation 文件记录覆盖及检查结果。

`iconStatus` 为 exported、reference_not_indexed、no_reference 或 export_failed。当前没有 export_failed。多件物品可以共用一张 PNG。availability 为 unknown；类型名保留客户端内部标签，不能直接解释为 Wiki 分类或开放状态。

当前验收值：6,002 个唯一物品 ID，全部有中文名称和主类别；101 个类型；116,673 个 TextMap 项；724 个普通集合；3,047 条主物品说明；3,069 张 PNG 覆盖 4,564 条物品；117 个图标来源包全部匹配清单。缺失图标中 121 条有未匹配引用、1,317 条无已识别引用。

验证步骤还检查 8 个跨类别名称/图标样例、71 字节奇数路径、353 字节长说明、ID 16 的旧图标前缀陷阱、310 个同名生物的跨表核对，并保留 9 个原始名称差异。全部 PNG 使用 pngjs 完整解码并检查 CRC、尺寸、SHA256；SQLite 完整性为 ok，外键违规为 0。

查询示例：

```sql
SELECT i.id, i.name_zh, t.name AS type_name, i.icon_file
FROM items i JOIN types t ON t.id = i.type_id
WHERE i.type_id IN (20, 9, 7, 50, 66, 26)
ORDER BY i.type_id, i.id;
```

## 排查与更新

| 现象                                  | 检查方向                                                               |
| ------------------------------------- | ---------------------------------------------------------------------- |
| 客户端或 revision 不匹配              | config.ini 与选择的 data/res 清单；当前配置只承诺已验证版本            |
| 找不到匹配配置对                      | 检查 Temp，核对大小/MD5；不要混用不同来源的 cs、ed                     |
| 缺少 active-config-source 或中间 JSON | 使用同一 output 先执行对应前置步骤；单步不会补跑依赖                   |
| 名称乱码、图标路径拼写异常            | 掩码高字节、奇数中心字节、UTF-8 字节长度；参考原理文档                 |
| CLI 不存在/非零退出或选定图片缺失     | 工具及依赖、HYG_CB1 模式、来源包、logs 中的工具日志                    |
| 图集输出错图或同名图冲突              | Container 与名称必须同时精确筛选；不能导出整张 atlas 代替 Sprite       |
| 来源包校验失败                        | 索引是否对应这份客户端、data 对 res 的同路径覆盖、基础与更新包是否混用 |
| 图鉴名称不一致                        | 可能是客户端原始占位/用字差异，查 validation 差异列表，不自动覆写主名  |
| 节点缺少 pngjs                        | 从仓库根目录执行 vp install，不能只复制单个 .mjs 文件                  |

新客户端先按原理文档重新确认，再调整 config 的版本、清单目录、路径、编码常量、根字段、行字段和验收样例/数量；结构变化时直接重写对应模块。语言布局、cs 文件索引结构和字符串探测边界也需要人工核对。新产物使用新版本目录，两份文档与小型测试样例同步更新。

通用 decoded-tables 的字符串/文本检测可能误判，它是调查材料；正式数据只使用已确认字段。当前不提取价格、获取方式、配方数量、生物出现条件或种植关系，也不将数据自动接入网站。
