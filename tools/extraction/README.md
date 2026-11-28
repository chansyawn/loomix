# 客户端资源提取

本工具从客户端快照提取资料、打包并安装网站资源。以下命令在仓库根目录执行。

## 首次配置

按[根 README](../../README.md#本地开发)安装依赖，在根目录 `.env` 中将 `LOOMIX_DATA_ROOT` 设为共享数据目录的绝对路径。首次准备工具需要网络、Git 和归档解压工具，支持平台见 [AnimeStudio 配置](src/client/anime-studio/config.ts)。

导入包含 `config.ini` 和客户端数据目录的文件夹。可使用绝对路径或相对仓库根目录的路径。

```sh
vp run @loomix/extraction#client -- import --source /path/to/client
```

导入会校验并冻结客户端，打印快照 ID。`init` 和 `refresh` 需要匹配当前[版本配置](src/profile.ts)的快照，有多个匹配时加 `--snapshot <完整 ID>`。客户端换版时先确认版本适配，再导入新快照。

## 提取、打包与本地安装

```sh
vp run @loomix/extraction#refresh
# 将 refresh 打印的 resource-package-id 填入下面的命令
vp run @loomix/extraction#verify --resource-package <resource-package-id>
vp run @loomix/extraction#install-resources --resource-package <resource-package-id>
```

`refresh` 依次准备提取环境、提取数据及原图、生成资源包。`verify` 核对实际客户端及整条产物链。`install-resources` 校验资源包及其上游后，整体替换当前 worktree 的 `resources/website/`。共享目录已有资源包及其完整上游链、且与当前工具兼容时，可直接安装，无需重新提取。

分阶段运行的命令和参数见 `vp run @loomix/extraction#refresh -- --help`。引用阶段产物时可传完整 ID 或准确的目录名。

## 输入、缓存与产物

同机 worktree 共用 `LOOMIX_DATA_ROOT`。换版时按[提取要求与规范](docs/extraction-requirements.md#外部资料)复核[外部资料](data/external/)的来源、适用版本与引用，再提取、验收和安装。

| 位置                          | 用途                                 |
| ----------------------------- | ------------------------------------ |
| 共享根 `clients/`             | 按客户端版本和哈希前缀命名的只读快照 |
| 共享根 `cache/`               | 工具准备、昂贵批次恢复与失败诊断     |
| 共享根 `artifacts/`           | 封存的提取环境、提取结果与资源包     |
| worktree `resources/website/` | 当前网站读取的本地资源               |
| worktree `var/scratch/`       | 临时调查文件                         |

产物位置见阶段清单的 `outputs`。查候选和排除项用 `client-read-records.json`，查最终字段依据用 `field-evidence.json`。客户端源路径以快照根目录为准。

**查原图**时打开提取结果目录。客户端图标在 `client-icons.json` 中按业务 ID 查 `image.object`（图鉴页签需同时匹配 `groupId` 和 `id`）。友邻头像、房屋、图纸和日记在 `neighbor-images.json` 中按 `neighborId` 查槽位的 `object`。用该值匹配同目录 `originals.json` 的 `object`，按 `file` 打开 PNG。[图标索引结构](src/extraction/client-icons/model.ts) · [友邻原图索引结构](src/extraction/neighbor-images/model.ts)

旧提取结果缺少索引时，运行 `vp run @loomix/extraction#init`，再用 `vp run @loomix/extraction#extract --environment <环境ID>` 重新提取。只查原图无需打包或安装。

## 故障恢复与清理

- **提取失败**时按阶段查看共享根下的日志。工具准备查 `cache/anime-studio/logs/`，提取查 `cache/failures/`，解码与原图批次查 `cache/decode/failures/` 和 `cache/originals/failures/`。修复后直接重跑，可复用通过复验的批次。下载失效时核对固定的工具版本与摘要。
- **产物格式不兼容**时，用匹配当前工具的快照重新运行 `refresh`，验收并安装新资源包。
- **升级前**停止当前 worktree 的安装和发布。安装会替换本地目录，切换期间资源可能短暂不可用。记下可用提交和资源包 ID，保留资源包、提取结果、提取环境及客户端快照。回滚时用兼容工具重新安装旧包，跨格式时同步恢复网站代码。线上回滚见[CI/CD 与部署](../../DEPLOYMENT.md#资源更新流程)。
- **清理共享目录**前，等使用该目录的任务结束，保留各 worktree 在用及回滚所需的完整产物链。目录哈希冲突或身份不明时先核对清单，移走占用目录再重试。
