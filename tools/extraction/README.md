# 客户端资源提取

本工具将客户端快照转换为可验证的网站资源。操作前准备支持平台上的客户端文件与本机共享数据目录；当前支持 Windows x64、macOS arm64/x64，首次准备 AnimeStudio 需要网络、Git 与归档解压工具。客户端更新后须先按[提取原理](extraction-method.md)重新确认解码布局、范围和关联规则。

## 首次配置

先按[根 README](../../README.md#本地开发)安装依赖。在根目录 `.env` 中填写共享数据目录的绝对路径 `LOOMIX_DATA_ROOT`，代码不设默认路径；模板与读取规则见[环境配置](../../README.md#环境配置)。

在仓库根目录导入并选择客户端；来源也可以是仓库外的绝对路径：

```sh
vp run @loomix/extraction#client -- import --source resources/game-client
vp run @loomix/extraction#client -- select --snapshot <snapshot-id>
```

导入会校验复制前后的完整文件清单与 SHA256，并将快照设为只读。选择记录保存在共享根；新 environment 绑定所选 snapshot ID，后续切换选择不会改变已有 environment 的输入。客户端更新后重新导入、选择，旧快照保留。

同机 worktree 共享客户端、工具缓存和版本化产物，临时调查文件仍放在各自的 `var/scratch/`。

## 提取与交付

日常更新网站资源：

```sh
vp run @loomix/extraction#refresh
# 将 refresh 打印的 delivery-id 填入下面的命令
vp run @loomix/extraction#verify --delivery <delivery-id>
vp run @loomix/extraction#materialize --delivery <delivery-id>
```

`refresh` 依次执行 `init`、`extract`、`deliver`，打印三阶段 ID。也可分别执行 `vp run @loomix/extraction#<入口>`，将前一步打印的 ID 传给下一步：

| 入口与参数                    | 行为                                                                                                           |
| ----------------------------- | -------------------------------------------------------------------------------------------------------------- |
| `init`                        | 校验客户端配置及其资源清单，准备 AnimeStudio 并生成资源索引；相同身份复用已验证 environment。                  |
| `extract --environment <id>`  | 从绑定快照提取数据、PNG 和证据，完成来源审计与验收后封存 extraction；内部 checkpoint 自动恢复。                |
| `deliver --extraction <id>`   | 从已验证 extraction 生成共享的 artifact-only 交付，封存 JSON 和 WebP。`--website` 可同时发布到当前 worktree。  |
| `verify --delivery <id>`      | 核对实际客户端、整条 manifest 链及领域证据；网站发布模式额外核对已发布字节，artifact-only 模式只验收封存产物。 |
| `materialize --delivery <id>` | 校验 artifact-only 交付并替换当前 worktree 的 `resources/website/`，失败时恢复旧目录。                         |

ID 均为完整 SHA256。相对输入路径和网站目标相对仓库根解析，与命令工作目录无关。`--help` 不初始化工具。工具测试运行 `vp run @loomix/extraction#test`，静态检查运行 `vp check`。

## 输入、缓存与产物

```text
<LOOMIX_DATA_ROOT>/
  clients/<snapshot-id>/game-client/             # 按完整文件清单哈希寻址的只读客户端快照
  selections/client.json                         # 当前选定的 snapshot ID
  cache/anime-studio/<rid>/<tool-key>/            # 已验证 CLI/runtime、ready.json
  cache/anime-studio/<rid>/<tool-key>.work/       # 下载、源码、补丁后源码、SDK
  cache/anime-studio/logs/                        # 初始化与默认工具日志
  artifacts/environments/<environment-id>/
    environment-manifest.json
    config-source.json                           # 选中的配置对、哈希与候选
    asset-index.json                             # Texture2D / Sprite / MiHoYoBinData
    asset-map-audit.json
    resource-manifest-audit.json
    logs/
  artifacts/extractions/<extraction-id>/
    extraction-manifest.json
    prepared/                                    # 冻结 OBB、表索引、TextMap、素材索引
    bindata/                                     # MiHoYoBinData 导出
    raw/                                         # 解码后的领域观察
    dataset.json                                 # 统一领域快照，严格结构和引用图校验
    image-jobs.json                              # 领域图片引用到原始 PNG 的交付任务
    exports/、seed-exports/、neighbor-exports/ 等     # 原始 PNG
    evidence/                                    # 正式证据协议
    checkpoints/
    logs/
    run-report.json
  artifacts/deliveries/<delivery-id>/
    delivery-manifest.json
    staging/{release.json,assets.json,zh-CN/,assets/}
    image-manifest.json
    coverage.json
    validation.json
    run-report.json
worktree/
  resources/website/                              # 当前 worktree 的本地网站资源
  var/scratch/                                    # 临时调查与失败运行
```

目录树只列主要产物；完整语义输出以各阶段 manifest 的 `outputs` 为准。extraction 根目录还保存补充收录清单、字段证据、排除项与调查报告。

## 故障恢复与清理

复用前会核对输入、输出哈希和文件集合；失败时保留报告，全部验收通过后才写成功 manifest。失败后查看对应产物的 `logs/` 与 `run-report.json`，修复原因后重跑同一入口；已验证的上游 checkpoint 可以复用。恢复协议见[本仓库实现](extraction-method.md#本仓库实现)。

`materialize` 替换本地资源失败时恢复旧目录；替换期间可能短暂不可用，不承诺跨进程读取或断电的事务隔离。线上资源更新流程见[CI/CD 与部署](../../DEPLOYMENT.md#资源更新流程)。

客户端、共享缓存/产物、`var/` 下的临时文件和日志均不提交。无运行任务时可以删除失败的 `.staging`、旧 environment/extraction/delivery 或共享 AnimeStudio 缓存；删除 extraction 会使依赖它的 delivery 无法进行完整追溯验收。保留当前在用的整条链。

## 实现参考

- [提取原理](extraction-method.md)：客户端解码、准入与关联规则、证据及本仓库实现。
- [共享数据契约](../../packages/schema/README.md)：领域模型、资源 manifest 与图片引用。
- [AnimeStudio 配置](src/client/anime-studio/config.ts)：固定源码提交、SDK、runtime 与下载摘要；平台准备和补丁位于同目录。Windows Actions 下载过期时须显式更新固定版本，不能自动跟随最新构建。
