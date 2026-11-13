# 客户端资源提取

代码、配置、文档和测试都位于本包。当前 profile 对应客户端 0.95.2，data revision 1449213、resource revision 1391927、清单 5662883。更新版本须先重新确认解码布局、范围和关联规则。

代码按产物边界组织：

- `src/workflow/`：与提取领域无关的流水线内核，负责哈希、manifest、checkpoint、锁、进程、目录替换和 JSON；
- `src/client/`：客户端快照、版本清单、Asset Map 解析和 AnimeStudio；
- `src/environment/`：客户端环境产物；
- `src/source/client/`：共享客户端表读取规则；
- `src/extraction/`：解码、源观察、图片、证据和来源审计；
- `src/domains/`：领域组装、引用闭包、资源登记和统一证据映射；
- `src/delivery/`：WebP、交付 JSON、发布和交付验收；
- `src/storage/`：旧缓存与产物迁移；
- `src/verify.ts`：整条 manifest 链与已发布字节的最终验收。

`src/workflow/process.ts` 通过 execa 统一执行 AnimeStudio、构建工具和准备步骤，直接将 stdout/stderr 写入同一日志，支持追加或覆盖，不缓冲完整进程输出。`src/client/asset-map.ts` 通过 sax 流式读取 Asset Map，统一处理 XML 实体、CDATA、跨块文本、必需字段和 Persistent overlay；环境构建把它压缩为只含 Texture2D、Sprite、MiHoYoBinData 的 `asset-index.json`。AnimeStudio 退出码为 0 但日志报错时仍判定失败。

## 首次配置

使用仓库锁定的 Node 和 Vite+ 版本，先运行 `vp install`。复制根目录 `.env.example` 为 `.env`，填写共享数据目录的绝对路径 `LOOMIX_DATA_ROOT`；代码不设默认路径，已有进程环境变量优先于 `.env`。

在仓库根目录导入并选择客户端；来源也可以是仓库外的绝对路径：

```sh
cp .env.example .env
# 填写 .env 后执行以下命令
vp run '@loomix/extraction#client' -- import --source resources/game-client
vp run '@loomix/extraction#client' -- select --snapshot <snapshot-id>
```

导入会校验复制前后的完整文件清单与 SHA256，并将快照设为只读。选择记录保存在共享根；新 environment 绑定所选 snapshot ID，后续切换选择不会改变已有 environment 的输入。客户端更新后重新导入、选择，旧快照保留。

Codex managed worktree 通过 `.worktreeinclude` 携带 `.env` 和网站资源，setup 只安装依赖。同机 worktree 共享客户端、工具缓存和版本化产物，临时调查文件仍放在各自的 `var/scratch/`。

## 提取与交付

日常更新网站资源：

```sh
vp run '@loomix/extraction#refresh'
# 将 refresh 打印的 delivery-id 填入下面的命令
vp run '@loomix/extraction#verify' --delivery <delivery-id>
vp run '@loomix/extraction#materialize' --delivery <delivery-id>
```

`refresh` 依次执行 `init`、`extract`、`deliver`，打印三阶段 ID。也可分别执行 `vp run '@loomix/extraction#<入口>'`，将前一步打印的 ID 传给下一步：

| 入口与参数                    | 行为                                                                                                           |
| ----------------------------- | -------------------------------------------------------------------------------------------------------------- |
| `init`                        | 校验客户端配置及资源清单，准备 AnimeStudio 并生成资源索引；相同身份复用已验证 environment。                    |
| `extract --environment <id>`  | 从绑定快照提取数据、PNG 和证据，完成来源审计与验收后封存 extraction；内部 checkpoint 自动恢复。                |
| `deliver --extraction <id>`   | 从已验证 extraction 生成共享的 artifact-only 交付，封存 JSON 和 WebP。`--website` 可同时发布到当前 worktree。  |
| `verify --delivery <id>`      | 核对实际客户端、整条 manifest 链及领域证据；网站发布模式额外核对已发布字节，artifact-only 模式只验收封存产物。 |
| `materialize --delivery <id>` | 校验 artifact-only 交付并替换当前 worktree 的 `resources/website/`，失败时恢复旧目录。                         |

ID 均为完整 SHA256。相对输入路径和网站目标相对仓库根解析，与命令工作目录无关。`--help` 不初始化工具。工具测试运行 `vp run '@loomix/extraction#test'`，静态检查运行 `vp check`。

仓库根配置默认不缓存 package scripts，因此每次都会执行入口并重新验证真实输入。内部 checkpoint 是提取恢复协议，与 Vite Task 缓存无关；`logs/`、`checkpoints/` 和 `run-report.json` 不属于 manifest 的语义输出。

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

更新清单包含基础包、未安装的可选下载及未落地的 overlay。init 校验清单格式与已安装条目的 MD5/大小，data manifest 优先于同路径 res manifest；记录未安装项和 MD5 为 0 的无校验值条目；配置对必须完整匹配当前 data manifest。extract 进一步强制核验实际使用的全部图片候选包、BinData 来源包和两份 OBB；未安装项不视为“内容不存在”的证明。

环境身份绑定客户端清单、profile、工具字节和实现摘要；提取身份还绑定 environment manifest 与冻结补充清单。实现摘要覆盖源码、发布契约与 lockfile，修改这些输入会产生新身份。

复用前核对输入、输出哈希和文件集合；失败时保留报告，全部验收通过后才写成功 manifest。checkpoint 失效与恢复规则见[三阶段证据链与版本协议](docs/extraction-method.md#三阶段证据链与版本协议)。

## 证据与交付约束

唯一共享包为 `@loomix/schema`。`catalog.records` 是全部正式记录的唯一集合，按 type 区分单品、套组、系列、外观和种子；准入条件是图鉴、版本绑定白名单或通过现有确定性种植关系验证的种子。范围外物品仅在 `references` 保存 ID 与名称，不获得列表或详情；`craftingRecipes`、`growths` 和 `ingredientCategories` 保存正式记录及其他已发布领域所需的关联资料。`gameplayTags` 是独立发布的完整标签树；记录将主表 318.6–15 合并为稳定去重的直接 `tagIds`，颜色、材质、风格等按子树派生。食材分类仅保存 `tagId` 与成员，送礼偏好共用同一标签身份；原始字段归属保留在来源证据中。种子以 growthId 引用生长配置，阶段以 plantId 关联正式植物，阶段图片保留上下文语义，反向关系由消费方派生。`neighbors` 与 `world` 保存各自实体和单向关系，不重复保存反向索引或物品名称。

源观察模型位于 `tools/extraction`，只供提取与来源验收使用；基础观察和详情观察是内部 checkpoint，不是公开交付版本。领域组装读取冻结观察，补全已确认的物品引用，生成 dataset.json，并执行跨领域引用、集合成员类型、分类环、生长阶段和图片覆盖检查。verify 从冻结观察重建领域数据、交付任务与领域证据，防止只修改输出使其自洽。

`evidence/domain-fields.json` 使用实体集合、身份和字段路径定位值，区分 confirmed、absent、unresolved；来源区分表行、完整表扫描、素材对象和人工确认。正式记录的准入原因有独立证据，原图鉴标记与缺失证据保留在 record-evidence.json，生长配置有独立实体证据，友邻和世界保留实体级表来源。细粒度字段来源、未确认候选和排除原因继续保存在源审计中。

发布目录由 release.json 指定四个文档：zh-CN/catalog.json、zh-CN/neighbors.json、zh-CN/world.json 和 assets.json。每个文档绑定相同 formatVersion、snapshotId、locale；manifest 保存实际字节数与 SHA256。领域图片使用 {assetId, variant}，assets.json 解析到按最终字节 SHA256 命名的 WebP、大小和尺寸。同一源图的 icon、banner、illustration 独立登记。当前提取 zh-CN；语言是快照上下文，后续语言无需改变实体字段名。

当前交付 formatVersion 6，正式记录 2,419 条，包括图鉴与白名单的 2,340 条（杂物 23 条）以及 79 个确定性种子；另保留 79 份生长配置及 317 个关联阶段。作物与花树统一种子和阶段契约，生长规则区分 crop/staged；未确认的成熟天数保持 null。配方、掉落、货币和友邻等引用到范围外物品时只建立最小 references，不递归提取其详情，也不扩大正式集合。制作配方只保留正式产物需要的有效卡片关联，不交付非准入制作卡、卡组或专属图片。未确认属性保留 null，配方材料缺失不解释为免费制作。

图片规则保持不变：按实际像素面积选最高原生分辨率，平手保留大图优先顺序；家具套组 1024×512，其余有图记录 256×256；Lanczos3 等比缩放、居中裁切，WebP 质量 85、alphaQuality 100。原始 PNG 与最终 WebP 均完整解码，交付文件按最终字节 SHA256 命名和去重。

输出目录拒绝危险路径、符号链接和无关文件，只接受 release.json、assets.json、语言目录下的领域 JSON、assets/ 和可选 .gitkeep。友邻 JSON 只公开客户端确认的数据，不包含 OBB 来源编号或玩家账号状态；来源证据和排除项仅保存在 extraction bundle。发布先验证同级暂存副本，再将旧目录移到备份并重命名整个新目录；不会逐文件混合两个版本。重命名失败时恢复完整旧目录。发布锁串行化本工具的发布；两次目录重命名之间存在短暂不可用窗口，不承诺跨进程读取或机器断电的事务隔离。

## AnimeStudio 与清理

`src/client/anime-studio/` 维护下载、macOS 补丁、平台准备、锁、完整缓存字节校验和 CLI 调用。固定提交 `e616e3f824f47dd68cfbd44977bf8584756ac446`，SDK 10.0.402，Windows Runtime 10.0.13。

Windows x64 使用固定下载和局部 runtime；macOS arm64/x64 使用相同源码提交、补丁和局部 SDK 构建。其他平台/架构明确报错。首次准备需要网络、Git 与归档解压工具。下载包校验摘要，生成内容在 `.staging` 完成探测和哈希验证后才发布；ready marker 和 `--version` 探测都通过后才复用。缓存版本同时考虑平台、架构和补丁。Windows Actions 下载过期须显式更新固定版本，不能自动跟随最新构建。

客户端、共享缓存/产物、`var/` 下的临时文件和日志均不提交。首次执行提取、交付或验收入口时会迁移通过校验的旧 `var/cache/anime-studio/` 和 `var/artifacts/`，完成后写入共享根的 `migration-v1.json`；旧来源保留不删除。无运行任务时可以删除失败的 `.staging`、旧 environment/extraction/delivery 或共享 AnimeStudio 缓存；删除 extraction 会使依赖它的 delivery 无法进行完整追溯验收。保留当前在用的整条链。

详细范围和关联规则见[提取原理](docs/extraction-method.md)。

`src/extraction/neighbors/` 通过固定 NPC ID 白名单过滤正式主档（当前名单排除图塔，新增友邻需显式更新白名单），输出独立的 `neighbors.json`（schemaVersion 2）。当前快照收录 12 个友邻、12 个星球、44 章故事（220 个段落记录）、198 条同行反应（12 条通用回退）、10 个邂逅岛、11 个装修主题及 256 件家具/服装奖励引用。59 条唯一交往说明保留客户端原始中文和样式；4 条未投放测试说明和完全相同的重复教程行写入内部审计。白名单成员缺少正式主档或必要字段时停止提取；非白名单 NPC 不收录，并写入排除审计。明确归属于非白名单 NPC 的专属奖励和补充图片一并排除，共享和未确认归属的内容保留。

友邻数据库保持稳定排序且不写入生成时间；同一输入重复提取产生相同字节。故事按章节和段落顺序聚合，保留纯文、普通单图、竖版单图及左右图文布局；布局来自故事表的正文、配图和排列标记，独立于图片是否成功交付。同行资源反应不解释为礼物偏好。无法直接确认的 NPC、奖励和资源关联保留空数组；邂逅岛的场景 ID 已确认，但不根据岛名猜测 NPC 关联。友邻事件标签使用已确认的中文标签作为键；一个装修主题的数值 ID 未确认，因此保留空值并用其确认名称维持引用。资源索引冻结于 `prepared/asset-index.json`，公共资源记录只保存客户端路径，不新增二进制导出。验收对照固定白名单及冻结主档独立检查友邻集合、检查完整数据库及版本绑定数量，再确认交付领域数据与封存 dataset 一致。
