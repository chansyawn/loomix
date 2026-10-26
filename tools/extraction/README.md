# 客户端资源提取

代码、配置、文档和测试都位于本包。当前 profile 对应客户端 0.95.2，data revision 1449213、resource revision 1391927、清单 5662883。更新版本须先重新确认解码布局、范围和关联规则。

代码按产物边界组织：

- `src/workflow/`：与提取领域无关的流水线内核，负责哈希、manifest、checkpoint、锁、进程、目录替换和 JSON；
- `src/client/`：客户端快照、版本清单、Asset Map 解析和 AnimeStudio；
- `src/environment/`：客户端环境产物；
- `src/extraction/`：解码、内容、图片、证据和来源审计；
- `src/delivery/`：WebP、交付 JSON、发布和交付验收；
- `src/verify.ts`：整条 manifest 链与已发布字节的最终验收。

`src/workflow/process.ts` 通过 execa 统一执行 AnimeStudio、构建工具和准备步骤，直接将 stdout/stderr 写入同一日志，支持追加或覆盖，不缓冲完整进程输出。`src/client/asset-map.ts` 通过 sax 流式读取 Asset Map，统一处理 XML 实体、CDATA、跨块文本、必需字段和 Persistent overlay；环境构建把它压缩为只含 Texture2D、Sprite、MiHoYoBinData 的 `asset-index.json`。AnimeStudio 退出码为 0 但日志报错时仍判定失败。

## 入口

需要 Node >=22.18.0、仓库锁定的 Vite Plus 1.3.0，以及 `vp install` 安装的依赖。在仓库根目录运行：

```sh
vp run '@loomix/extraction#init'
vp run '@loomix/extraction#extract' --environment <environment-id>
vp run '@loomix/extraction#deliver' --extraction <extraction-id> --artifact-only
vp run '@loomix/extraction#verify' --delivery <delivery-id>
vp run '@loomix/extraction#test'
vp check
```

每个入口成功时打印下一阶段需要的完整 SHA256 ID。将 `<…-id>` 替换为打印值。所有路径相对仓库解析，与执行命令的工作目录无关；`--help` 不初始化工具。`verify` 是显式验收入口。

- `init` 校验客户端版本、revision、配置对和本地资源清单，准备固定 AnimeStudio，建立覆盖 StreamingAssets 与 Persistent 的 Asset Map，压缩为资源索引，验证后原子发布 environment。相同身份复用已验证环境。
- `extract` 只接受已初始化 environment，重新核对客户端快照完整文件集合与 SHA256；内部按 admissions + decode → structure → raw-assets → collection → seed-images，以及 neighbors → neighbor-images → source-audit → extraction-verify 自动恢复。输出图鉴、版本化友邻静态数据库、原始 PNG、证据和审计，完成后封存 manifest，不发布网站资源。
- `deliver --artifact-only` 只读已验证 extraction bundle，处理图片、按最终字节 SHA256 去重，在 `var/artifacts/deliveries/<id>/staging/` 封存 JSON 与 WebP；不访问网站交付目录。默认网站发布路径保留，v4 只支持 artifact-only 模式。
- `verify` 核对整个 manifest 依赖链、实际客户端输入、表范围、字段证据和图片。manifest 的 `deliveryMode: artifact-only` 仅验收封存产物；网站发布模式额外核对已发布字节。

仓库根配置默认不缓存 package scripts，因此每次都会执行入口并重新验证真实输入。内部 checkpoint 是提取恢复协议，与 Vite Task 缓存无关；`logs/`、`checkpoints/` 和 `run-report.json` 不属于 manifest 的语义输出。

## 输入、缓存与产物

```text
resources/game-client/                          # 本地客户端快照（只读输入）
  config.ini
  PetitPlanet_Data/{StreamingAssets,Persistent}/
resources/website/{content.json,neighbors.json,assets/} # 固定默认交付目录
var/                                              # 运行时数据，整体忽略
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
    supplemental-admissions.json                 # 冻结的版本绑定补充确认清单
    record-evidence.json                         # 收录依据及图鉴存在/缺失证据
    prepared/                                    # 冻结 OBB、表索引、TextMap、素材索引
    bindata/                                     # MiHoYoBinData 导出
    raw/{content.json,images-content.json,content-v4.json,images-content-v4.json,neighbors.json,assets/}
    collection-evidence.json                     # v4 扩展字段与种子索引证据
    crafting-audit.json                          # 全部制作配置及范围外产物
    seed-exports/                                # 完整种子原始 PNG
    seed-image-{candidates,originals,manifest}.json
    neighbor-audit.json                            # 友邻字段来源、计数和规范化记录
    neighbor-exclusions.json                       # 未进入公共数据库的候选
    exports/                                     # 完整原始 PNG
    evidence/                                    # 正式证据协议
    checkpoints/
    logs/
    run-report.json
  artifacts/deliveries/<delivery-id>/
    delivery-manifest.json
    staging/{content.json,neighbors.json,assets/}
    image-manifest.json
    field-evidence.json
    coverage.json
    collection-coverage.json                     # 七项扩展字段的覆盖率
    validation.json
    run-report.json
  scratch/                                        # 失败运行、探针、一次性调查
```

快照保持在 `resources/game-client/`，environment 绑定其完整文件清单、大小与 SHA256，不复制整个客户端。输入新增、删除或字节变化会改变身份；旧 environment 的 extract/verify 会拒绝已变化的快照，须先重新 init。每次 extract 前后都核对，运行期间不要更新客户端。

更新清单包含基础包、未安装的可选下载及未落地的 overlay。init 校验清单格式与已安装条目的 MD5/大小，data manifest 优先于同路径 res manifest；记录未安装项和 MD5 为 0 的无校验值条目；配置对必须完整匹配当前 data manifest。extract 进一步强制核验实际使用的全部图片候选包、BinData 来源包和两份 OBB；未安装项不视为“内容不存在”的证明。

环境身份绑定客户端清单、profile、工具实际 ready manifest 和实现摘要；提取身份绑定 environment manifest、冻结补充清单 SHA256、profile、实现源码、共享 schema 与 lockfile。每个 checkpoint 保存输入摘要、依赖摘要和输出的相对路径、SHA256、字节数。重跑仅在输入、输出字节和文件集合均匹配时跳过；变化或失败会先清除该阶段及所有下游 marker，再执行。已有最终 manifest 在重跑开始时失效，全部验证成功后才重新原子写入。

manifest 使用 `schemaVersion: 1`，区分 environment、extraction、delivery，记录稳定 ID、verified 状态、创建时间、输入、实现/profile 摘要、工具版本、输出和验证结果。失败记录写入报告，不生成成功 manifest。相同提取重跑保留创建时间，正式输出与 checkpoint 的哈希保持稳定。日志不作为语义产物。

## 证据与交付约束

网站当前的 v3 契约仍由 `@loomix/content-schema` 导出；独立产物使用 `@loomix/content-schema/v4` 的 schemaVersion 4。基础提取保留 v3 中间结果，collection 阶段在其上构建 v4，最终 `staging/content.json` 只包含完整 v4。六大类及 item/set/series/appearance 由 category/kind 表达，记录按 ID 排序。字段证据包含记录 ID、字段、值、来源文件、表/行/字段或资源 PathID、关联/转换说明和确认状态；未知值必须有原因。

v4 补充四大类获取途径、生物学名及课题、菜肴口味和难度前置条件、作物种子关联、家具制作配方。`cropSeeds` 保存种子 ID、名称、图片与产物引用，不计入收藏条目。版本绑定人工清单新增寒松木 30115、陨星矿石 30136、雪晶 30299、纯净雪花 30300；共 2,340 条收藏，其中杂物 23 条。四种新增物品的名称、描述、品质、来源与图标均从客户端读取；配置缺失时保留空值。

`collection-evidence.json` 保存新增字段和种子索引的逐字段证据，`crafting-audit.json` 保留表 568 全部记录及范围外产物。配方存在但材料槽缺失时输出 `materials: null` 与 `unresolvedReason`，不能解释为免费制作；缺少整个配方行时 `craftingRecipes` 为 null。研究课题保留原始文案，不推算尺寸范围或玩家进度。难度前置条件保存原始 JSON 与类型明确的条件，不解释为完整的解锁规则。中间 PNG 引用分别位于 `exports/` 与 `seed-exports/`，最终交付只接受 `assets/<SHA256>.webp`。

图片规则保持不变：按实际像素面积选最高原生分辨率，平手保留大图优先顺序；家具套组 1024×512，其余有图记录 256×256；Lanczos3 等比缩放、居中裁切，WebP 质量 85、alphaQuality 100。原始 PNG 与最终 WebP 均完整解码，交付文件按最终字节 SHA256 命名和去重。

输出目录拒绝危险路径、符号链接和无关文件，只接受 `content.json`、`neighbors.json`、`assets/` 和可选 `.gitkeep`。友邻 JSON 只公开客户端确认的数据，不包含 OBB 来源编号或玩家账号状态；来源证据和排除项仅保存在 extraction bundle。发布先验证同级暂存副本，再将旧目录移到备份并重命名整个新目录；不会逐文件混合两个版本。重命名失败时恢复完整旧目录。发布锁串行化本工具的发布；两次目录重命名之间存在短暂不可用窗口，不承诺跨进程读取或机器断电的事务隔离。

## AnimeStudio 与清理

`src/client/anime-studio/` 维护下载、macOS 补丁、平台准备、锁、完整缓存字节校验和 CLI 调用。固定提交 `e616e3f824f47dd68cfbd44977bf8584756ac446`，SDK 10.0.402，Windows Runtime 10.0.13。

Windows x64 使用固定下载和局部 runtime；macOS arm64/x64 使用相同源码提交、补丁和局部 SDK 构建。其他平台/架构明确报错。首次准备需要网络、Git 与归档解压工具。下载包校验摘要，生成内容在 `.staging` 完成探测和哈希验证后才发布；ready marker 和 `--version` 探测都通过后才复用。缓存版本同时考虑平台、架构和补丁。Windows Actions 下载过期须显式更新固定版本，不能自动跟随最新构建。

客户端、`var/` 下的缓存/产物/临时文件和日志均忽略，不提交游戏资源或大型生成文件。无运行任务时可以删除失败的 `.staging`、旧 environment/extraction/delivery 或整个 `var/cache/anime-studio`；删除缓存后 init 会重新准备工具。删除 extraction 会使依赖它的 delivery 无法进行完整追溯验收。保留当前在用的整条链。旧 `resources/extraction-tools/`、`resources/temp/extraction/` 和旧 `runs/` 已不再读取，可直接删除。

详细范围和关联规则见[提取原理](docs/extraction-method.md)。

`src/extraction/neighbors/` 将友邻专用表与正式 NPC 主档取交集，输出独立的 `neighbors.json`（schemaVersion 1）。当前快照收录 13 个友邻、13 个星球、48 章故事（231 个段落记录）、198 条同行反应（12 条通用回退）、10 个邂逅岛、11 个装修主题及 256 件家具/服装奖励引用。59 条唯一交往说明保留客户端原始中文和样式；4 条未投放测试说明和完全相同的重复教程行写入内部审计。亚菈缺少正式主档，巴彦和卡逻缺少友邻专用配置，均不进入公开友邻数组。

友邻数据库保持稳定排序且不写入生成时间；同一输入重复提取产生相同字节。故事按章节和段落顺序聚合，同行资源反应不解释为礼物偏好。无法直接确认的 NPC、奖励和资源关联保留空数组；邂逅岛的场景 ID 已确认，但不根据岛名猜测 NPC 关联。友邻事件标签使用已确认的中文标签作为键；一个装修主题的数值 ID 未确认，因此保留空值并用其确认名称维持引用。资源索引冻结于 `prepared/asset-index.json`，公共资源记录只保存客户端路径，不新增二进制导出。验收从冻结表独立重建友邻集合、检查完整数据库及版本绑定数量，再确认交付 JSON 与提取 JSON 的字节一致。
