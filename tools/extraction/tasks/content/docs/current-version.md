# 当前版本有效内容提取执行手册

当前客户端 **0.95.2**，配置 revision **1449213**，资源 revision **1391927**，清单目录 **5662883**。本地快照不代表当前线上最新版本。

## 输入与环境

使用根目录规定的 Node 版本（>=22.18.0，本次运行使用仓库提供的 Node），在仓库根目录执行 `vp install`。PNG 完整验证使用 extraction 已声明的 pngjs，不需要 Python。

输入位置：

```text
resources/game-client/config.ini
resources/game-client/PetitPlanet_Data/
resources/temp/extraction/index/assets_map.xml
```

CLI 由统一提取模块自动初始化和调用，缓存位于 `resources/extraction-tools/`；可用 `vp run --no-cache '@loomix/extraction#tools:init'` 提前准备，见[提取入口说明](../../../README.md#统一提取工具)。工具初始化不改变本任务的 revision 和验收约束。

客户端必须包含 StreamingAssets 和 Persistent 更新包及版本清单。Asset Map 包含 Texture2D、Sprite 和 MiHoYoBinData，已有 Source 的绝对路径可以不同，运行时会重定位。任务只读共用 index，不依赖 resources/temp 中的旧调查数据。

版本、表位置、字段、BinData 对象名和验收数量集中在 scripts/config.ts；基础客户端配置位于 lib/client-profile.ts，版本核对、索引与 TextMap 解码步骤位于 scripts/preparation/；新版本需同时复核基础 profile 与 content 配置。

## 命令与步骤

从仓库根目录完整运行：

```powershell
vp run --no-cache '@loomix/extraction#content'
vp run --no-cache '@loomix/extraction#test'
```

共享内容契约直接引用 TypeScript 源码，无需构建。也可直接调用 Node 入口：

```powershell
vp exec node tools/extraction/tasks/content/scripts/run.ts --help
vp exec node tools/extraction/tasks/content/scripts/run.ts --output resources/temp/content-acceptance
vp exec node tools/extraction/tasks/content/scripts/run.ts --step structure
```

路径为绝对路径或仓库相对路径，与当前工作目录无关。`--step` 只执行指定步骤，不自动补齐依赖；更换 `--output` 会使用不同的临时工作目录，需要先完整准备。任务没有 baseline 参数。

| 步骤      | 依赖                           | 工作目录产物                                                                                                                                                                                |
| --------- | ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| prepare   | 客户端、Asset Map、AnimeStudio | prepared/ 中的版本核对、对象索引、表索引、TextMap、表扫描和文件索引；bindata/ 和 bindata-manifest.json                                                                                      |
| structure | prepare                        | staging/content.json、scope.json、quality-enum.json、candidate-images.json、field-evidence.json、missing-fields.json、outside-members.json、field-candidates.json、field-investigation.json |
| assets    | structure                      | staging/assets/、更新的 staging/content.json、exports/、image-candidates.json、selected-images.json、image-manifest.json、图片导出日志                                                      |
| audit     | assets、prepare                | source-audit.json；核对全部图像与 BinData 来源包以及 ed.obb、cs.obb                                                                                                                         |
| validate  | audit、assets                  | coverage.json、validation.json；严格字段、成员、图片和来源检查                                                                                                                              |
| publish   | validate                       | 重新核验暂存数据后，将 content.json 与 assets/ 发布到指定目录                                                                                                                               |

中间文件位于 `resources/temp/extraction/content/<输出路径标识>/`，标识是绝对输出路径小写后的 SHA256 前 16 位，实际目录会在运行结果中显示。run-report.json 保存步骤、状态和失败堆栈，logs/ 保存子进程输出。重新构建会使旧验证结果失效，避免使用上一轮成功状态。

默认交付目录为 `resources/website/`，包含 content.json 和 assets/，允许保留 .gitkeep 目录占位文件。产物只在全部检查通过后发布；重跑替换旧素材，不留下未引用图。发布使用暂存副本与旧产物备份，失败时恢复旧产物。目标目录包含其他文件时拒绝覆盖，客户端、工具缓存、共用索引和提取工作目录及其父目录不可作为输出。

## 数据使用与边界

当前已验证的交付统计：

| 项目                               |                                        结果 |
| ---------------------------------- | ------------------------------------------: |
| 记录 / 唯一编号                    |                               2,327 / 2,327 |
| 已解析成员的集合                   |                                   143 / 143 |
| 独立 PNG / 图片覆盖记录            |                               2,244 / 2,255 |
| 无图记录                           | 72（67 个主题系列、2 件家具、3 个家具套组） |
| 来源包清单校验                     |                   109 / 109，另核对两份 OBB |
| 生物地区、出没地、季节、时间、天气 |                                各 317 / 317 |
| 菜肴难度、食用效果                 |                                各 121 / 121 |
| 家具类型 / 尺寸                    |                   881 / 289（分母均为 887） |
| 作物产物收获茬数                   |             85 / 85；其余植物尚无已确认关联 |

全部 PNG 完整解码、ID 集合、成员引用和字段白名单检查通过。详细逐字段覆盖率以 coverage.json 为准，不能把 null 当成已确认不存在。解码、内容和统一提取工具测试一起运行；若 Vite+ 缓存客户端在当前受限环境报权限错误，使用上面的 `--no-cache` 命令。

本次比较 4,413 个独立图片候选，按实际原生像素数选择最高分辨率，覆盖 2,255 条记录。最终 PNG 包括 2,048 张 512×512、159 张 256×256、15 张 1024×512、21 张 2037×1019 和 1 张 2048×1095。不缩放、不重新编码，来源校验包括未选中的大小图候选包。纯图片或配置导出禁用无关 Shader 解析，避免当前工具尚未支持的 Shader 布局阻断图片提取。

JSON 使用英文分组和字段名，显示内容为中文。`image` 相对 JSON 文件解析；如为空则展示缺图状态。成员数组保存单品 id，可建立 ID 索引后查询。未知成员关系为 null，不应当成空集合。系列名称与基础 name 分别保留。

品阶为内部编码：**0 普通、1 优质、2 珍稀、3 特等、4 奇迹**。对应显示表 325.15 与表 83.1；有 UI 行但省略该标量为 0，没有 UI 行为 null，不使用根字段 93 的其他未知数值代替。

当前保持 null 的重要信息：

- 生物尺寸范围：候选端点和浮点参数已写入 field-candidates.json，但显示单位、换算尚未独立确认。
- 植物成熟周期：已追踪 DAILY 模式和阶段向量；尚未确认首次收获与每日阶段推进规则，不能用阶段数量冒充天数。
- 67 个生物、植物、菜肴系列的图片：显示配置复用家具图像，未确认用途，不进入素材文件夹。
- 部分介绍、颜色、尺寸、原产星系和风味等未在已确认配置中提供，或对应文本不在当前 TextMap。未写区域标签不默认解释为“全地区”或“通行风味”。

生物介绍优先使用表 93 的长介绍；主物品名字始终使用表 318，不用图鉴别名替换。外观实际包括眉毛、面饰，没有肤色记录。完整 JSON 字段清单与关联见原理文档；本任务不创建数据库；验证通过后直接更新网站本地资源。

## 排查与更新

- 版本、revision 或配置校验不匹配：检查完整更新资源及 Temp/5662883/GenerateAssets，不把基础 OBB 当最新配置。
- 缺少索引或 BinData：重新建立包含基础和更新对象的 Asset Map，检查当前对象名及包路径；不要复制旧调查 JSON 充当输入。
- 相同 ID 冲突：范围内显示配置允许需要字段语义相同的重复行，冲突则停止；不能按行顺序随意覆盖。
- 同名 Sprite：同时核对 Container 和名称；任务对同名对象分批导出。图片不可用时查看 logs/assets-*.log，已选对象导出失败不会降级成成功。
- 出没地缺失：核对 CHabitat_ 后的枚举和当前 TagDisplayName_<EnumName>；旧 TagUIData 键可能失效。
- null 增多：查看 missing-fields.json 的逐条原因、coverage.json 的逐字段覆盖率以及 field-candidates.json；不要通过默认值消除缺失。
- 单步失败：按上表补齐同一输出对应工作目录的依赖；确认 run-report.json 和子进程日志。

更新客户端必须重新核对版本、掩码、根字段、标量宽度、成员反向引用、品阶枚举、显示键、图片用途及分类统计，并同步两份文档和真实字节样例。
