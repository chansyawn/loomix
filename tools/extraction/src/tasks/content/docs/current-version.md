# 当前版本执行手册

客户端 **0.95.2**，data revision **1449213**，resource revision **1391927**，清单 **5662883**。这是本地快照版本。

## 前置条件与命令

在仓库根目录执行 `vp install`。输入为 `resources/game-client/config.ini` 和 `resources/game-client/PetitPlanet_Data/`，包含基础包、Persistent 更新包、版本清单和匹配清单的 OBB 配置对。解码布局、字段及数量约束位于 `src/tasks/content/config.ts`，客户端身份位于 `src/infrastructure/client-profile.ts`。

依次运行；每步用上一步打印的 ID 替换占位符：

```sh
vp run --no-cache '@loomix/extraction#init'
vp run --no-cache '@loomix/extraction#extract' --environment <environment-id>
vp run --no-cache '@loomix/extraction#postprocess' --extraction <extraction-id>
vp run --no-cache '@loomix/extraction#verify' --delivery <delivery-id>
vp run --no-cache '@loomix/extraction#test'
vp check
vp run --no-cache -r build
```

只有这三个处理阶段及验收入口；内部 decode、structure、raw-assets、source-audit、extraction-verify 的依赖由 checkpoint 自动处理。没有 `--step` 或按输出路径切换工作目录的接口。命令和目录详见[README](../../../../README.md)。

## 产物与恢复

- AnimeStudio 缓存：`resources/temp/extraction/tool-cache/anime-studio/`，源码、SDK、runtime、构建产物和日志均在此根目录。
- 初始化：`resources/temp/extraction/environments/<environment-id>/`，绑定实际客户端完整输入 hash；Asset Map 由 init 构建并封存在此。
- 提取：`resources/temp/extraction/runs/<extraction-id>/`，包含 prepared 冻结 OBB 与解码表、raw JSON、bindata、exports 原始 PNG、evidence、logs、checkpoints 和报告。
- 后处理：`resources/temp/extraction/deliveries/<delivery-id>/`，包含交付 manifest、staging、图片 manifest、字段证据与验证报告。读取 extraction bundle，不扫描客户端。
- 网站：`resources/website/`，只含 content.json、assets/ 和可选 .gitkeep。通过完整验证后目录重命名发布，异常恢复旧目录。

失败后重复执行相同命令；输入及输出哈希正确的 checkpoint 才可复用，改变输入、profile、实现或产物会使依赖链失效。客户端变化须重新 init，不能将旧环境强行绑定到新输入。未知字段为 null，具体原因见 evidence/missing-fields.json，不能推断值不存在。

## 本次重构验证（2026-10-22）

- `vp check`：通过严格类型、lint 与格式检查。
- `vp run --no-cache -r test`：全仓 231 项通过，其中 extraction 的 Vitest 测试为 13 个文件、51 项。
- `vp run --no-cache -r build`、`vp run --no-cache website#verify-build`：通过。网站构建仍提示 vite:css-post 的 sourcemap warning，不影响构建成功。
- 本机 macOS arm64 的 AnimeStudio 已完成实际初始化、版本探测和缓存输出哈希验证；解码、图片处理、路径安全、checkpoint 篡改失效、候选证据协议与发布回滚有独立测试。
- 真实客户端 `init → extract → postprocess → verify` 已通过。environment 的全部客户端文件 hash 与实际输入一致；Asset Map 含 533,128 个对象，覆盖基础与 Persistent 资源。资源清单校验通过：基础文件 1,511 个、Persistent res 文件 77 个、data 更新包 1 个；两份 OBB 在配置选择和来源审计中独立核对。
- 根据用户授权，仅更新本地忽略目录中 `Persistent/versions/5662883/res_versions.json` 的一条 MD5：`AssetBundle/blocks/00/00000001.blk` 从 `ab5ca6c7196496482cf16829af5d3875` 改为实际 `2bc75b5be6cebc7a8b3281b97fd4c601`，大小仍为 1,040,199 字节。未修改包字节或绕过校验；该包通过 AnimeStudio 实际解析。新清单字节已纳入 environment 输入身份。
- 新提取结果：2,327 条记录、4,413 个原始图片候选、2,255 条有图记录、2,244 张唯一交付 WebP；109 个来源包及两份配置通过审计。全部原始 PNG 和最终 WebP 完整解码、尺寸与 hash 校验通过；ID 范围、字段白名单、成员引用、证据值和交付文件集合均通过。
- 正式证据包含 21,648 条非空字段证明、2,107 条明确缺失原因和 519 条未确认候选。最终 `content.json` SHA256 为 `0910ddcb10e060ea6bf85c3a209a82cee919544013146093f157810f8ab22329`。
- 所有非图片字段及 2,255 条选图来源与旧本地交付一致。旧生成资源的 `processed-images.json` 使用 contain/effort=6，仓库现有实现使用 cover/effort=4；用旧参数已精确复现样例旧 WebP 的 SHA256。因此旧网站图片字节不同，本次保持仓库已有图片策略。

- 对相同输入完整重跑 `init → extract → postprocess → verify`，三个 ID 均保持一致；五个 checkpoint 经输入及输出 hash 验证后复用。environment、extraction、delivery 和网站共 9,693 个文件（不含日志）逐字节一致。
- 使用完整真实交付副本注入第二次目录重命名失败，原 JSON 和图片共 2,246 个文件全部恢复，未遗留发布暂存目录。实际修改客户端 config.ini 和 profile 时旧环境均被拒绝；修改实现源码字节时提取 ID 改变，恢复后回到原 ID。所有探测文件已逐字节恢复；checkpoint 测试另确认输入身份变化会重跑全部下游。
- 本地机器验收报告：`resources/temp/extraction/acceptance/acceptance-report.json`，`passed: true`；首次及重复运行完整文件 hash 清单分别为同目录的 `first-pass.json` 和 `repeat-pass.json`，重复阶段日志也保留在此。临时验收脚本已清理，仅保留报告与证据；这些生成文件全部忽略。

本次成功身份（本地生成文件不提交）：

| 类型        | SHA256 ID                                                          |
| ----------- | ------------------------------------------------------------------ |
| environment | `e44b2dfa5207185992e883299953343e0c4407d190d019bc31f5a485a23cede9` |
| extraction  | `198ce989865a62d47675f0208e6adce0bbab1fa720ad0c82a10c2d58ed8b4005` |
| delivery    | `bdb27492690f523250f3fb4a04e70ddd025c8707a1caf3dbefe8b84b853aff1c` |

## 数据使用与边界

本次真实验收统计（逐字段结果以当前 manifest、coverage.json 和 validation.json 为准）：

| 项目                               |                                        结果 |
| ---------------------------------- | ------------------------------------------: |
| 记录 / 唯一编号                    |                               2,327 / 2,327 |
| 已解析成员的集合                   |                                   143 / 143 |
| 独立 WebP / 图片覆盖记录           |                               2,244 / 2,255 |
| 无图记录                           | 72（67 个主题系列、2 件家具、3 个家具套组） |
| 来源包清单校验                     |                   109 / 109，另核对两份 OBB |
| 生物地区、出没地、季节、时间、天气 |                                各 317 / 317 |
| 菜肴难度、食用效果                 |                                各 121 / 121 |
| 家具类型 / 尺寸                    |                   881 / 289（分母均为 887） |
| 作物产物收获茬数                   |             85 / 85；其余植物尚无已确认关联 |

本次验收的原始 PNG 与交付 WebP 完整解码、ID 集合、成员引用和字段白名单检查通过。详细逐字段覆盖率以 coverage.json 为准，不能把 null 当成已确认不存在。解码、内容和统一提取工具测试一起运行；若 Vite+ 缓存客户端在当前受限环境报权限错误，使用上面的 `--no-cache` 命令。

本次验收比较 4,413 个独立图片候选，按实际原生像素数选择最高分辨率，覆盖 2,255 条记录。原始 PNG 包括 2,048 张 512×512、159 张 256×256、15 张 1024×512、21 张 2037×1019 和 1 张 2048×1095。选图后，家具套组统一转换为 1024×512，其他有图记录（包括服饰套装）统一转换为 256×256；使用 Lanczos3 等比缩放、居中裁切，WebP 质量 85、透明通道质量 100。最终交付 2,244 张 WebP：37 张 1024×512、2,207 张 256×256。素材总字节数由 336,190,776 降至 26,778,506，减少约 92.03%。交付文件以编码后字节的 SHA256 命名并去重，原始 PNG 保留在临时导出目录。来源校验包括未选中的大小图候选包。纯图片或配置导出禁用无关 Shader 解析，避免当前工具尚未支持的 Shader 布局阻断图片提取。

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
- 阶段失败：重复执行相同三阶段命令；内部 checkpoint 自动核验并补齐依赖，查看对应 ID 目录的 run-report.json 和 logs/。

更新客户端必须重新核对版本、掩码、根字段、标量宽度、成员反向引用、品阶枚举、显示键、图片用途及分类统计，并同步两份文档和真实字节样例。
