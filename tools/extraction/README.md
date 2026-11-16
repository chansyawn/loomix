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
- `src/verify.ts`：整条 manifest 链与已发布字节的最终验收。

`src/workflow/process.ts` 通过 execa 统一执行 AnimeStudio、构建工具和准备步骤，直接将 stdout/stderr 写入同一日志，支持追加或覆盖，不缓冲完整进程输出。`src/client/asset-map.ts` 通过 sax 流式读取 Asset Map，统一处理 XML 实体、CDATA、跨块文本、必需字段和 Persistent overlay；环境构建把它压缩为只含 Texture2D、Sprite、MiHoYoBinData 的 `asset-index.json`。AnimeStudio 退出码为 0 但日志报错时仍判定失败。

## 首次配置

使用仓库锁定的 Node 和 Vite+ 版本，先运行 `vp install`。复制根目录 `.env.example` 为 `.env`，填写共享数据目录的绝对路径 `LOOMIX_DATA_ROOT`；代码不设默认路径，已有进程环境变量优先于 `.env`。该文件与网站、资源发布工具共用；提取器不读取 `.env.local` 或模式文件。

在仓库根目录导入并选择客户端；来源也可以是仓库外的绝对路径：

```sh
cp .env.example .env
# 填写 .env 后执行以下命令
vp run '@loomix/extraction#client' -- import --source resources/game-client
vp run '@loomix/extraction#client' -- select --snapshot <snapshot-id>
```

导入会校验复制前后的完整文件清单与 SHA256，并将快照设为只读。选择记录保存在共享根；新 environment 绑定所选 snapshot ID，后续切换选择不会改变已有 environment 的输入。客户端更新后重新导入、选择，旧快照保留。

各 worktree 需单独提供根目录 `.env`。同机 worktree 共享客户端、工具缓存和版本化产物，临时调查文件仍放在各自的 `var/scratch/`。

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

唯一共享包为 `@loomix/schema`。发布契约只保留网站消费的结构化字段，客户端原始字段、未确认候选和解析诊断只保存在提取观察与证据中。`catalog.items` 是全部物品的唯一集合，按 `kind` 区分家具、服饰、外观、友邻服饰、生物、植物、种子、菜肴、杂物和 `reference`；`reference` 是仅被正式数据引用的范围外物品，只保存名称与说明，不生成列表或详情。`catalog.collections` 保存套组与系列，用 `memberKind` 声明成员种类。一对一的从属数据内嵌在所属物品中：种子携带 `growth`，菜肴携带 `cooking`，家具携带 `craftingRecipes`。`gameplayTags` 是独立发布的完整标签树；物品只发布合并后的 `tagIds`，来源为主表 318.6–17 的 12 组直接标签按固定顺序展开，再追加主表类型对应的 `BTypeCfg.typetag`（716.10），稳定去重且不扩展祖先；各来源列的归属只保存在字段证据中。颜色、材质、风格、产区按标签子树派生，食材分类由 `tagIds` 的食材子树闭包派生，送礼偏好共用同一标签身份。`category` 与 `furnitureCategory` 分别保存展示分类与家具分类。发布只包含结构化值：家具尺寸、生物体型范围和菜肴力气以数值交付，展示文案由网站拼接。`neighbors` 按友邻组织，星球、故事、能力、住宅、送礼偏好与好感插画、角色立绘均内嵌在友邻实体中。

源观察模型位于 `tools/extraction`，只供提取与来源验收使用；基础观察和详情观察是内部 checkpoint，不是公开交付版本。领域组装读取冻结观察，补全已确认的物品引用，生成 dataset.json，并执行跨领域引用、集合成员类型、分类环、生长阶段和图片覆盖检查。verify 从冻结观察重建领域数据、交付任务与领域证据，防止只修改输出使其自洽。

`evidence/domain-fields.json` 使用实体集合、身份和字段路径定位值，区分 confirmed、absent、unresolved；来源区分表行、完整表扫描、素材对象和人工确认。可定位的集合为 `catalog.items`、`catalog.collections`、`neighbors.neighbors` 与 `gameplayTags.tags`；内嵌数据通过所属实体的字段路径定位，例如种子的 `growth.stages.0.image`、菜肴的 `cooking.slots`。未发布的观察字段、原图鉴标记、准入依据、未确认候选和排除原因继续保存在源审计中。

发布目录由 release.json 指定四个文档：zh-CN/gameplay-tags.json、zh-CN/catalog.json、zh-CN/neighbors.json 和 assets.json。formatVersion、snapshotId、locale 与来源版本只在 manifest 中声明，各文档通过实际字节数与 SHA256 绑定到 manifest。领域图片使用 {assetId, variant}，assets.json 解析到按最终字节 SHA256 命名的 WebP、大小和尺寸。同一源图的 icon、banner、illustration 独立登记。当前提取 zh-CN；语言是快照上下文，后续语言无需改变实体字段名。

当前交付 formatVersion 11，正式收录 2,550 条，包括图鉴与白名单的 2,340 条、79 个确定性种子以及 131 条正式友邻服饰。作物与花树统一种子和阶段契约，生长规则区分 crop/staged；成熟天数未确认，不进入发布数据。配方、掉落、对应玩家服饰和送礼偏好引用到范围外物品时生成 `reference` 物品，不扩大正式集合。家具只保留正式产物需要的有效创想卡配方；材料缺失的配方以 `materials: null` 表示未知，不解释为免费制作。烹饪配方的食材表达式必须全部解析，解锁条件必须是已知结构，否则中止提取。主题目标、升级用量、秘方物品和商店库存等尚未确认的关系不发布，只记录排除证据。友邻服饰通过 neighborId、playerItemId、可穿戴体型与友邻服饰币价格表达关联。

图片规则保持不变：按实际像素面积选最高原生分辨率，平手保留大图优先顺序；家具套组 1024×512，其余有图记录 256×256；Lanczos3 等比缩放、居中裁切，WebP 质量 85、alphaQuality 100。原始 PNG 与最终 WebP 均完整解码，交付文件按最终字节 SHA256 命名和去重。

输出目录拒绝危险路径、符号链接和无关文件，只接受 release.json、assets.json、语言目录下的领域 JSON、assets/ 和可选 .gitkeep。友邻 JSON 只公开客户端确认的数据，不包含 OBB 来源编号或玩家账号状态；来源证据和排除项仅保存在 extraction bundle。发布先验证同级暂存副本，再将旧目录移到备份并重命名整个新目录；不会逐文件混合两个版本。重命名失败时恢复完整旧目录。发布锁串行化本工具的发布；两次目录重命名之间存在短暂不可用窗口，不承诺跨进程读取或机器断电的事务隔离。

## AnimeStudio 与清理

`src/client/anime-studio/` 维护下载、macOS 补丁、平台准备、锁、完整缓存字节校验和 CLI 调用。固定提交 `e616e3f824f47dd68cfbd44977bf8584756ac446`，SDK 10.0.402，Windows Runtime 10.0.13。

Windows x64 使用固定下载和局部 runtime；macOS arm64/x64 使用相同源码提交、补丁和局部 SDK 构建。其他平台/架构明确报错。首次准备需要网络、Git 与归档解压工具。下载包校验摘要，生成内容在 `.staging` 完成探测和哈希验证后才发布；ready marker 和 `--version` 探测都通过后才复用。缓存版本同时考虑平台、架构和补丁。Windows Actions 下载过期须显式更新固定版本，不能自动跟随最新构建。

客户端、共享缓存/产物、`var/` 下的临时文件和日志均不提交。无运行任务时可以删除失败的 `.staging`、旧 environment/extraction/delivery 或共享 AnimeStudio 缓存；删除 extraction 会使依赖它的 delivery 无法进行完整追溯验收。保留当前在用的整条链。

详细范围和关联规则见[提取原理](docs/extraction-method.md)。

`src/extraction/neighbors/` 通过固定 NPC ID 白名单过滤正式主档（当前名单排除图塔，新增友邻需显式更新白名单），输出内部观察 `raw/neighbors.json`（schemaVersion 4）；正式交付 `zh-CN/neighbors.json` 使用共享契约 formatVersion 11。当前快照收录 12 个友邻、12 个星球、44 章故事（220 个段落记录）。同行反应、交往说明、事件标签、邂逅岛、世界岛屿和资源路径不被网站使用，不再提取。白名单成员缺少正式主档或必要字段时停止提取；非白名单 NPC 不收录，并写入排除审计。补充图片只保留友邻详情页使用的好感插画与角色立绘，均归属于具体友邻。

友邻数据库保持稳定排序且不写入生成时间；同一输入重复提取产生相同字节。故事按章节和段落顺序聚合，保留纯文、普通单图、竖版单图及左右图文布局；布局来自故事表的正文、配图和排列标记，独立于图片是否成功交付。验收对照固定白名单及冻结主档独立检查友邻集合、检查完整数据库及版本绑定数量，再确认交付领域数据与封存 dataset 一致。
