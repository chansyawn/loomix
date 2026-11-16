# 客户端资源提取

本工具将客户端快照转换为可验证的资源交付；各阶段概念遵循[领域术语表](../../GLOSSARY.md#提取与交付)。操作前准备支持平台上的客户端文件与本机共享数据目录；当前支持 Windows x64、macOS arm64/x64，首次准备 AnimeStudio 需要网络、Git 与归档解压工具。客户端更新后须先按[提取原理](extraction-method.md)重新确认解码布局、范围和关联规则。

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
| `extract --environment <id>`  | 从绑定快照提取数据、PNG 和证据，完成来源审计与验收后封存 extraction；昂贵解码和原图导出批次自动恢复。          |
| `deliver --extraction <id>`   | 从已验证提取结果生成共享的 artifact-only 资源交付，封存 JSON 和 WebP。`--website` 可同时落地到当前 worktree。  |
| `verify --delivery <id>`      | 核对实际客户端、整条阶段清单链及领域证据；website 模式额外核对本地落地字节，artifact-only 模式只验收封存产物。 |
| `materialize --delivery <id>` | 校验 artifact-only 交付并替换当前 worktree 的 `resources/website/`，失败时恢复旧目录。                         |

客户端快照与三阶段产物的 ID 均为完整 SHA256，含义分别对应输入文件身份及 environment、extraction、delivery 身份，不能互换；领域快照的 `snapshotId` 映射见[共享数据契约](../../packages/schema/README.md#快照图片与发布)。线上 release ID 由资源发布工具另行指定。相对输入路径和网站目标相对仓库根解析，与命令工作目录无关。`--help` 不初始化工具。工具测试运行 `vp run @loomix/extraction#test`，静态检查运行 `vp check`。

## 输入、缓存与产物

```text
<LOOMIX_DATA_ROOT>/
  clients/<snapshot-id>/game-client/             # 按完整文件清单哈希寻址的只读客户端快照
  selections/client.json                         # 当前选定的 snapshot ID
  cache/anime-studio/<rid>/<tool-key>/           # 已验证 CLI/runtime、ready.json
  cache/anime-studio/<rid>/<tool-key>.work/      # 下载、源码、补丁后源码、SDK
  cache/decode/<key>/                            # 绑定源输入、profile、实现和真实工具字节的解码缓存
  cache/originals/<key>/                         # 验证过完整 PNG 的导出批次
  cache/{decode,originals}/failures/             # 未完成批次的诊断与日志
  cache/failures/                                # 未完成提取的诊断副本
  cache/anime-studio/logs/                       # 初始化与默认工具日志
  artifacts/environments/<environment-id>/
    environment-manifest.json
    config-source.json                           # 选中的配置对、哈希与候选
    asset-index.json                             # Texture2D / Sprite / MiHoYoBinData
    asset-map-audit.json
    resource-manifest-audit.json
    logs/
  artifacts/extractions/<extraction-id>/
    extraction-manifest.json
    source/                                      # 冻结 OBB、索引、TextMap、BinData、人工清单
    observations.json                            # typed 源观察、具体依据、图片用途和调查信息
    originals.json                               # 所有参与选图的源对象及 PNG 完整性
    originals/<PNG-SHA256>.png                   # 内容去重；不同源对象仍保留身份
    dataset.json                                 # 统一领域快照，严格结构和引用图校验
    evidence.json                                # 最终字段证据与确认状态
    image-bindings.json                          # 图片用途、候选选择结果与缺失原因
    image-jobs.json                              # 精确覆盖发布引用的图片转换任务
    source-audit.json                            # 全部候选图片包、BinData 和配置审计
    validation.json                              # 独立来源验收及可重现性结果
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

目录树只列主要产物；完整语义输出以各阶段 manifest 的 `outputs` 为准。补充清单保存在 `source/`；排除项、未确认候选和调查信息归入 `observations.json`。提取结果包含离线验收与交付所需输入，删除恢复缓存不会影响已有封存结果。

## 故障恢复与清理

复用前核对输出哈希和精确文件集合；新提取在独立 staging 中完成构建、来源验收和审计，manifest 最后发布并原子提交目录。已有完整有效的同身份提取结果只读复用，失败不会撤销其成功封存。失败后查看 `cache/failures/` 及对应 `cache/decode/failures/`、`cache/originals/failures/`，修复原因后重跑；已完成并通过字节复验的昂贵批次可复用，源观察和组装重新计算。恢复与证据协议见[本仓库实现](extraction-method.md#本仓库实现)。

`materialize` 替换本地资源失败时恢复旧目录；替换期间可能短暂不可用，不承诺跨进程读取或断电的事务隔离。线上资源更新流程见[CI/CD 与部署](../../DEPLOYMENT.md#资源更新流程)。

客户端、共享缓存/产物、`var/` 下的临时文件和日志均不提交。无运行任务时可以删除失败的 `.staging`、旧 environment/extraction/delivery 或共享 AnimeStudio 缓存；删除 extraction 会使依赖它的 delivery 无法进行完整追溯验收。保留当前在用的整条链。

## 实现参考

- [提取原理](extraction-method.md)：客户端解码、准入与关联规则、证据及本仓库实现。
- [共享数据契约](../../packages/schema/README.md)：领域模型、资源发布清单与图片引用。
- [AnimeStudio 配置](src/client/anime-studio/config.ts)：固定源码提交、SDK、runtime 与下载摘要；平台准备和补丁位于同目录。Windows Actions 下载过期时须显式更新固定版本，不能自动跟随最新构建。
