# 客户端资源提取

本工具将客户端快照转换为可验证的资源交付；概念定义见[领域术语表](../../GLOSSARY.md#提取与交付)。本文提供运行与排障指引，维护决策及版本调查见[提取原理](docs/extraction-method.md)，具体参数和产物结构以代码与运行结果为准。

## 首次配置

先按[根 README](../../README.md#本地开发)安装依赖，并按其中的环境配置说明，在根目录 `.env` 中填写共享数据目录的绝对路径 `LOOMIX_DATA_ROOT`。准备支持平台上的客户端文件；支持平台以 [AnimeStudio 平台配置](src/client/anime-studio/config.ts)为准，首次准备工具需要网络、Git 与归档解压工具。

在仓库根目录导入并选择客户端；来源也可以是仓库外的绝对路径：

```sh
vp run @loomix/extraction#client -- import --source resources/game-client
vp run @loomix/extraction#client -- select --snapshot <snapshot-id>
```

使用导入命令打印的 snapshot ID。导入会校验并冻结客户端；新提取环境绑定所选快照，后续切换选择不会改变已有提取环境的输入。客户端更新时先按[提取原理](docs/extraction-method.md#客户端更新与调查)确认版本适配，再重新导入、选择，旧快照保留。

## 提取与交付

日常更新网站资源：

```sh
vp run @loomix/extraction#refresh
# 将 refresh 打印的 delivery-id 填入下面的命令
vp run @loomix/extraction#verify --delivery <delivery-id>
vp run @loomix/extraction#materialize --delivery <delivery-id>
```

`refresh` 依次准备提取环境、提取数据及原图、生成资源交付，不更新当前网站资源。`verify` 核对实际客户端及整条产物链；`materialize` 校验交付后替换当前 worktree 的 `resources/website/`。已有共享交付时，配置共享数据目录后可直接执行 `materialize`，无需重新提取。

需要分阶段运行时，从帮助查看入口与参数：

```sh
vp run @loomix/extraction#refresh -- --help
```

帮助不会初始化工具，完整命令定义见 [CLI](src/cli.ts)。各阶段 ID 不能互换；领域快照身份与发布格式见[共享数据契约](../../packages/schema/README.md#快照图片与发布)。相对输入路径相对仓库根解析。

## 输入、缓存与产物

同机 worktree 共享 `LOOMIX_DATA_ROOT` 下的客户端、工具缓存和版本化产物；本地网站资源与临时调查文件各自独立。

| 位置                          | 用途                               |
| ----------------------------- | ---------------------------------- |
| 共享根 `clients/`             | 只读客户端快照                     |
| 共享根 `cache/`               | 工具准备、昂贵批次恢复与失败诊断   |
| 共享根 `artifacts/`           | 封存的提取环境、提取结果与资源交付 |
| worktree `resources/website/` | 当前网站读取的本地资源             |
| worktree `var/scratch/`       | 临时调查文件                       |

具体输出以各阶段 manifest 的 `outputs` 为准。调查时从提取结果的 `observations.json` 查源观察、排除项与未确认候选，从 `evidence.json` 查最终字段依据；结构入口见[提取原理](docs/extraction-method.md#按任务定位实现)。

小栖地收录在提取快照 `dataset.json` 的 `vignettes` 字段，配图可通过 `originals.json` 定位到封存 PNG。只需要这些数据时，运行 `init` 和 `extract` 即可。现有网站交付按 v14 契约取用这份快照。准入证据及版本边界见[业务确认与调查](docs/business-investigation.md#小栖地)。

## 故障恢复与清理

失败后先查看命令错误及日志：工具准备日志在 `cache/anime-studio/logs/`，提取诊断在 `cache/failures/`，批次诊断在 `cache/decode/failures/` 和 `cache/originals/failures/`。修复原因后重跑；已完成且通过复验的昂贵批次可复用，不必先清空缓存。工具版本或下载失效时检查 [AnimeStudio 配置](src/client/anime-studio/config.ts)，显式更新固定版本与摘要，不自动跟随最新构建。

`materialize` 替换本地资源失败时恢复旧目录；替换期间可能短暂不可用，不承诺跨进程读取或断电的事务隔离。线上更新另按[CI/CD 与部署](../../DEPLOYMENT.md#资源更新流程)执行，本地落地不等于线上发布。

无运行任务时再清理失败的暂存目录、缓存或不再使用的产物。按交付 ID 清理共享根 `artifacts/deliveries/`，并保留各 worktree 在用和计划用于回滚的交付及其上游完整链，以便重新落地和追溯验收。删除恢复缓存不会影响已有封存提取结果。客户端、共享缓存及产物、临时文件和日志均不提交。
