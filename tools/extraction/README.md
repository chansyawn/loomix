# 客户端资源提取

本工具从客户端快照提取资料、打包并安装网站资源。新增收录规则或修改验收逻辑前，参阅[提取要求与规范](docs/extraction-requirements.md)。

## 首次配置

先按[根 README](../../README.md#本地开发)安装依赖，并按其中的环境配置说明，在根目录 `.env` 中填写共享数据目录的绝对路径 `LOOMIX_DATA_ROOT`。准备支持平台上的客户端文件；支持平台以 [AnimeStudio 平台配置](src/client/anime-studio/config.ts)为准，首次准备工具需要网络、Git 与归档解压工具。

在仓库根目录导入客户端。来源应指向包含 `config.ini` 和客户端数据目录的文件夹，可使用仓库外的绝对路径。

```sh
vp run @loomix/extraction#client -- import --source /path/to/client
```

导入会校验并冻结客户端，打印完整快照 ID 和目录。`init` 和 `refresh` 默认使用唯一匹配当前[版本配置](src/profile.ts)的快照。无匹配时导入所需版本；有多个匹配时传入 `--snapshot <完整 ID>`，显式指定也必须匹配。客户端更新时先确认版本适配，再导入新客户端。

## 提取、打包与本地安装

日常更新网站资源：

```sh
vp run @loomix/extraction#refresh
# 将 refresh 打印的 resource-package-id 填入下面的命令
vp run @loomix/extraction#verify --resource-package <resource-package-id>
vp run @loomix/extraction#install-resources --resource-package <resource-package-id>
```

`refresh` 依次准备提取环境、提取数据及原图、生成资源包。`verify` 核对实际客户端及整条产物链。`install-resources` 校验资源包及其上游后，整体替换当前 worktree 的 `resources/website/`。共享目录已有资源包及其完整上游链、且与当前工具兼容时，可直接安装，无需重新提取。

需要分阶段运行时，从帮助查看入口与参数：

```sh
vp run @loomix/extraction#refresh -- --help
```

帮助无需准备提取工具。阶段命令会打印完整 ID 和目录路径；引用阶段产物时可使用完整 ID 或准确的目录名。`client import --source` 的相对路径以仓库根目录为准。

## 输入、缓存与产物

同机 worktree 共享 `LOOMIX_DATA_ROOT` 下的客户端、工具缓存和版本化产物；本地网站资源与临时调查文件各自独立。

提取除读取客户端快照，也读取 `tools/extraction/data/external/` 下人工维护的外部资料。这些资料只补充客户端无法提供的事实，不覆盖客户端证据。换版时须核对来源、适用版本及引用；所需文件缺失、目标游戏版本或数据修订与快照不符，或记录未通过校验时，提取会中止。更新后重新运行 `refresh` 和 `verify`，再安装资源。[提取要求与规范](docs/extraction-requirements.md#外部资料) · [业务确认与调查](docs/business-investigation.md)

| 位置                          | 用途                                 |
| ----------------------------- | ------------------------------------ |
| 共享根 `clients/`             | 按客户端版本和哈希前缀命名的只读快照 |
| 共享根 `cache/`               | 工具准备、昂贵批次恢复与失败诊断     |
| 共享根 `artifacts/`           | 封存的提取环境、提取结果与资源包     |
| worktree `resources/website/` | 当前网站读取的本地资源               |
| worktree `var/scratch/`       | 临时调查文件                         |

产物位置以阶段清单的 `outputs` 为准。调查时从 `client-read-records.json` 查读取记录、排除项和候选，从 `field-evidence.json` 查最终字段依据。客户端源文件路径以快照根目录为准。

需要单独取得客户端图标时，运行 `vp run @loomix/extraction#init`，再将环境 ID 传给 `vp run @loomix/extraction#extract --environment <环境ID>`。提取目录的 `client-icons.json` 按业务 ID 收录食物效果、厨具小图、烹饪难度、生物习性、送礼偏好、图鉴页签、家具分类和服饰部位。查菜肴时先用 `dishes[].id` 找到其效果、厨具或难度 ID；查图鉴页签时同时使用 `groupId` 和 `id`。用图片槽位的 `image.object` 在同目录 `originals.json` 匹配 `object`，再按 `file` 打开 PNG。多个槽位可以引用同一张图，`image: null` 表示客户端未配置该图片。这份索引仅随提取产物封存；旧提取目录缺少该文件时需重新提取。

## 故障恢复与清理

失败后先查看命令错误及日志：工具准备日志在 `cache/anime-studio/logs/`，提取诊断在 `cache/failures/`，批次诊断在 `cache/decode/failures/` 和 `cache/originals/failures/`。修复原因后重跑；已完成且通过复验的昂贵批次可复用，不必先清空缓存。工具版本或下载失效时检查 [AnimeStudio 配置](src/client/anime-studio/config.ts)，显式更新固定版本与摘要，不自动跟随最新构建。

阶段清单或资源格式不受支持时，用匹配当前工具的客户端快照运行 `refresh`，再用新资源包 ID 验收和安装。

本地资源切换期间可能短暂不可用。新目录切换失败时，安装命令会尝试恢复旧目录；成功安装后不会保留旧目录。

**升级前**停止当前 worktree 的安装和发布任务，记下当前可用的代码提交与资源包 ID，保留资源包、提取结果、提取环境及客户端快照。**回滚时**使用能验证旧产物格式和客户端版本的提取工具，重新运行 `install-resources`；如果跨网站资源格式回滚，还需恢复能读取旧格式的网站代码。只保留旧资源包不够。线上回滚见[CI/CD 与部署](../../DEPLOYMENT.md#资源更新流程)。

等共用数据目录的任务停下后，再清理失败的暂存目录、缓存或废弃产物；保留各 worktree 在用或用于回滚的完整产物链。删除恢复缓存不会影响已封存的结果。遇到目录哈希冲突或身份不明时，先检查清单并移走占用目录，再重试。客户端、共享缓存及产物、临时文件和日志均不提交。
