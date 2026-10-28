# 有效内容提取原理与独立实现指南

本文说明独立实现所需的输入、解码、关联和验收规则，不要求使用本仓库脚本。当前参数对应客户端 **0.95.2**、配置 revision **1449213**、资源 revision **1391927**、清单目录 **5662883**，新版本必须重新定位字段。

用户已确认当前根字段 93 的全部记录属于开放游戏内容。字段 1 为 1 的外观也是开放内容，只是不计入万象列表；67 个主题集合是各大类内的小分类。另有用户明确确认的十三条实装记录由版本绑定清单收录；其他表外内容是否开放不能由名称、图标或配方引用推断。

## 输入及版本选择

准备客户端的 config.ini、PetitPlanet_Data 内的基础与 Persistent 更新资源，以及覆盖两者的 Unity 对象索引。读取 config.ini 的 game_version，并分别核对 data_revision 和 res_revision。

名为 data_versions.json、res_versions.json 的清单实际为 CSV，列为 FilePath、md5、FileSize。配置候选包括 StreamingAssets/GenerateAssets、Persistent/GenerateAssets 和 Persistent/Temp/<清单目录>/GenerateAssets。只有 ed.obb、cs.obb 同时匹配同一 data 清单的配置对才能采用。当前采用 Persistent/Temp/5662883/GenerateAssets；忽略 Temp 会读到旧配置。

对象索引至少包含 Type、Name、Container、PathID、Source。PathID 保留为字符串，避免 64 位精度损失。Source 通过 PetitPlanet_Data 后的内部相对路径重定位；不使用旧机器的绝对路径。更新对象优先于基础对象，并校验每个实际使用包的大小与 MD5：基础包对应基础 res 清单，更新包先查更新 data 清单，再查更新 res 清单。

## 二进制布局与解码

以下字段编号均从 0 开始，地址均为文件字节偏移。先检查完整读取范围，再进行任何解引用。

```text
u32(p) = unsigned32(read_uint32_big_endian(p) XOR 0x53020253)
i32(p) = reinterpret_signed32(u32(p))
u16(p) = read_uint16_big_endian(p) XOR 0x5555
ref(p) = p + u32(p)
root = u32(0)

vtable = object - i32(object)
vtable_length = u16(vtable)
object_size = u16(vtable + 2)
field_count = (vtable_length - 4) / 2
offset(k) = u16(vtable + 4 + 2*k)
field(k) = null if offset(k) == 0 else object + offset(k)
```

vtable 偏移是有符号数，vtable 可能位于对象之后。校验 vtable 长度为偶数且至少 4、对象完整范围以及字段偏移位于对象内。字段超出 vtable 或偏移为 0 表示未写入；不能读地址 0。

字节数组或其他宽度标量的变换如下，n 是字节数：

```text
key = unsigned32(n XOR 0x01350257)
mask = [key & 255, (key >> 8) & 255, (key >> 16) & 255, (key >> 24) & 255]
for i in 0 .. n-1:
    j = n-1-i
    index = 0 if i == j else min(i, j) modulo 4
    output[j] = input[i] XOR mask[index]
```

奇数中心必须使用 mask[0]，长数组不能丢弃 n 的高字节。标量先对其实际宽度变换，再按小端解释为 uint8、uint32 或 float32。字段 93.1 是单字节，不应读取相邻四字节；93.17 是 float32，当前约为 0.8，不能当作整数品阶。

普通集合：根字段解引用到包装对象，包装字段 0 再解引用到行向量 v。行数为 u32(v)，第 i 行地址为 ref(v+4+4*i)。检查整个引用数组后逐行遍历。

已确认的整数向量：字段 p 解引用到 v，n=u32(v)，读取 n 个 u32(v+4+4*i)。字符串：字段 p 解引用到 v，n=u32(v)，对 v+4 开始的 n 字节使用上述变换，再严格 UTF-8 解码。整数向量和字符串具有相似头部，必须按已确认 schema 选择，不能根据“碰巧可读”判断。

TextMap 特殊处理：根字段 1 解引用到包装层，包装字段 0 解引用到字典。字典字段 0 是记录数、3 是桶向量、4 是文本记录引用向量。每桶 8 字节，按字节数组算法解码为小端 uint64；低 32 位为 0xffffffff 表示空桶，否则 hash=高 32 位、index=低 32 位右移 8。文本行地址为 ref(values+4+4*index)，行字段 1 为简中、0 为英文。使用精确 64 位整数，检查索引范围、hash 唯一和有效桶数等于记录数。当前记录 116,673，桶 233,343。

对明文文本键，hash 从 0 开始按 UTF-16 code unit 计算：`hash = unsigned32(hash * 31 + code_unit)`。例如 TagDisplayName_Habitat_Flowers 的 hash 为 2692302836，对应“花朵附近”。

## 内容收录、分类及关联

以主物品表 318 的字段 0 建立身份，收录集合为根表 93 ID 与冻结补充清单 ID 的并集。按同一 ID 可选关联图鉴 93、显示配置 325、生物配置 186。表 93 的全部 2,327 个 ID 必须保留，不因缺图、缺描述或外观标记而删除。主物品字段 1 是名字 hash，2 是内部类型；类型 500/501 是集合记录。其编号与表 33 的子分类编号不是同一种枚举。

从 Unity 包导出 GameplayTag 树及 TagUIData、显示键字典。当前对象名分别为 633e15d6、b429c67e、15896ba2，类型 MiHoYoBinData；这些是版本参数，不是跨版本固定规则。树中的 AllNodes 以 TagId 为键，包含 TagName、EnumName、ParentId。TagUIData 以 TagId 关联 nameInGame.textId；必须再查当前 TextMap。

普通单品使用 318.6 与 318.15 的逗号标签，并沿 ParentId 补齐祖先标签。表 33 每行字段 0 是大类编码、3 是子类编号、4 是子类显示名 hash、5 是 OR 标签筛选。当前大类为 1 生物、2 植物、3 菜肴、4 家具、5 服饰、6 杂物。每个普通单品必须且只能命中一个子类；植物子类 304 输出“采摘材料”。

外观标记 93.1 为 1 时单独归入服饰外观，依据主物品标签继承确定发型、眼睛、眉毛、面饰或肤色。当前实际为发型 23、眼睛 19、眉毛 8、面饰 1；不补造肤色。

集合由 318.6 的已确认标签分类：家具套组、服装套组、鱼套组、昆虫套组、赶海生物套组、作物套组、花套组、烹饪套组。名称仍使用主物品名称。成员由下列显式反向引用建立，不通过名称相似度连接：

| 集合                 | 成员配置                             |
| -------------------- | ------------------------------------ |
| 家具套组             | 家具表 262.0 成员 ID，262.9 套组 ID  |
| 服饰套装             | 服装表 519.0 成员 ID，519.9 套装 ID  |
| 生物、植物、菜肴系列 | 显示表 325.0 成员 ID，325.35 系列 ID |

成员仅保留已确认收录范围内对应大类的单品，外部引用单独记录。未知关系为 null；不能凭没有匹配记录就宣布集合已确认为空。当前 143 个集合均有有效成员。

## 属性字段与确认依据

| 输出信息               | 读取与关联                                                                                                                                 |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| 介绍                   | 优先 93.4 的介绍 hash，再取 186.6 的直接长文本，最后取 325.27 的简短介绍 hash；不把 93.16 学名加入输出                                     |
| 品阶                   | 325.15 → 83.1 的品阶编码；83.2 是名称 hash。编码为 0 普通、1 优质、2 珍稀、3 特等、4 奇迹。存在 UI 行但未写标量时默认 0；没有 UI 行为 null |
| 颜色、材质、风格       | 分别取 318.9、318.11、318.12 标签，经 TagUIData 的文本键显示；缺失或未解析不替换成任意默认值                                               |
| 获取来源               | 325.2 是 uint32 来源编号向量，关联 618.0，再读取 618.1 文案 hash；如 102“格连商店购买”、187“星海唤舟获得”                                  |
| 家具类型               | 265.5 细分标签匹配 318.6 原始标签，取 265.2、265.4 的显示文本组成“基础家具·床”等；无细分匹配时核对 265.3 父级标签，只接受唯一显示结果      |
| 家具尺寸               | 318.14 的尺寸标签，尺寸_1_2a5 → 1.0x2.5；缺少尺寸标签时不从图片边界估算                                                                    |
| 生物地区               | 325.31 的显示键，经显示字典或直接文本键解析                                                                                                |
| 生物出没地             | 325.30 的 CHabitat_<EnumName>，核对 GameplayTag EnumName 后解析 TagDisplayName_<EnumName>；部分旧 TagUIData 文本键已经失效                 |
| 季节、时间、天气       | 325.34、325.32、325.33 的显示键；分号分隔多值。AllSeason 经显示字典关联 TagDisplayName_AllSeason                                           |
| 植物原产星系、菜肴风味 | 318.8 区域／风味标签的显示文本；未写入标签不擅自补“全地区”或“通行风味”                                                                     |
| 作物收获茬数           | 144.10 的产物编号向量 → 144.5 收获次数；如番茄种子 30213 的产物 30219–30223，收获次数 3。种子、苗与产物不合并成一条记录                    |
| 菜肴难度               | 122.4 指向菜肴产物，122.2 → 121.0，121.1 为显示名 hash：简单、招牌、宴客、秘制                                                             |
| 厨具                   | 同一菜谱 122.16 → 126.2，126.1 为名称。当前 2 煮锅、4 烤箱、5 榨汁机；未解析的代码不猜名称                                                 |
| 食用效果               | 325.8 的力气数值代入 TextMap 4027993099“增加 %s 力气”。325.9 有附加效果时必须继续解析，不只输出基础力气掩盖未知效果                        |

显示表存在重复 ID。对最终需要的字段进行语义比较：数值比较数值、向量比较内容、字符串比较文本，不能比较相对引用地址。相同内容可合并；范围内冲突必须停止。范围外冲突不应通过覆盖顺序影响结果。

目前仍未确认两个属性的完整显示规则：

- 生物尺寸：132.4/5 是候选整数端点，132.3/6 是浮点参数。端点相关性不足以独立证明单位及换算，不直接输出候选数值。
- 成熟周期：144.3 为 DAILY 周期模式，144.4 为生长阶段向量；阶段数量不能独立证明经过的天数或首次收获规则。花和树的周期也需要继续定位，不能套用作物默认值。

这些字段输出 null，同时记录实际候选数据和未确认原因。表 134、135 已有时间、栖息地文案，但不能仅因编号相同就连接生物记录。用当前 UI 显示键关联优于推测关联。

## 图片与交付 JSON

普通单品及家具、服饰套组采用显示表明确关联的图片，导出全部可用大小图候选后，按原生宽×高选择像素数最多的图片；像素数相同时优先配置的大图。选图使用原生尺寸，原始 PNG 保留在临时导出目录。选图完成后，家具套组（furniture.set）统一输出 1024×512，其他有图记录（包括服饰套装）统一输出 256×256；按原比例缩放、居中裁切，使用 Lanczos3 和有损 WebP 质量 85，保留透明通道。67 个生物、植物、菜肴主题集合复用家具图标；目前未确认这些图是系列的实际展示图，图片保持 null。不要改用成员图或拼图替代。

UISprite 引用加 assets/moleres/rel/sres/ 前缀，统一斜杠和小写，只去除末尾 png/jpg/jpeg/tga/psd。按完整 Container 匹配 Texture2D。Texture2D 名称为 sactx- 图集时，改用完整 Container 加精确 Sprite 名称匹配，名称为引用路径末段去扩展名。不能导出整张图集当单品。更新来源优先且所有来源包须通过清单校验。

导出时同时筛选对象名和 Container。同一个包内若有同名 Sprite，分别导出，避免工具以名称写文件时发生覆盖。任何已选对象导出失败均停止。完整解码 PNG、校验 CRC、尺寸和全部像素数据；仅转换选中的图片，完整解码最终 WebP 并检查目标尺寸；用最终 WebP 字节的 SHA256 命名并去重。相同原图用于不同目标尺寸时分别转换，清单分别记录原始 PNG 和交付 WebP 的路径、哈希及尺寸。

交付契约集中在 `packages/schema/src/`，按 catalog、neighbors、world、assets、dataset、release 和 extraction 组织。源观察与交付领域模型分离，不保留历史版本解析分支。

catalog 的 items 使用 type 判别字段；groups、appearances、seeds、growths 与 entries 各自保存身份。entries 引用领域实体并单独保存 encyclopedia 状态；引用到范围外的已确认物品使用 reference 实体，不计入收录。生长配置只保存一份，植物与种子使用 growthId；反向关系由使用方派生。颜色、材质、来源等多值字段使用数组，不从展示字符串反向拆解。

领域图片使用 {assetId, variant}，不包含交付路径。assets.json 将引用映射为不可变文件路径、SHA256、大小与尺寸。release.json 指定语言目录下的 catalog.json、neighbors.json、world.json 和共享 assets.json，绑定 formatVersion、snapshotId、locale 及每份文档的实际字节校验值。所有未知值显式为 null，严格拒绝附加字段；null 与已确认空数组含义不同。

补充清单位于 `src/extraction/content/supplemental-admissions.json`，schemaVersion 为 1，source 绑定同一客户端版本，confirmation 保存人工确认说明。entries 仅含 `id`、`expectedName`、`category`、`subcategory`：苹果 30161、李子 30169、牛油果 30265、芒果 30266、仙人掌果 30267、竹笋 30268 为 plants/采摘材料；肉 2000050、蛋 2000051、奶 2000052，以及寒松木 30115、陨星矿石 30136、雪晶 30299、纯净雪花 30300 为 miscellaneous/null。名称、描述、图片和品质始终从客户端提取，不从清单复制。缺失主表、版本或名称错配、重复 ID、与图鉴分类冲突均中止提取；重叠 ID 只生成一次且保存双方依据。

九条均无系列引用，六种植物的原产星系、成熟周期和收获茬数均未配置，保留 null。肉蛋奶描述未解析到，保留 null。图鉴行缺失不会阻断 UI 描述或图片来源。

`record-evidence.json` 独立记录 `id`、`admissionSources` 和 `encyclopedia`。图鉴收录源含 kind=encyclopedia、file、table=93、rowOffset；人工源含 kind=manual、file、pointer、sha256。图鉴证据为 present（含原始行及 listed）或 absent（含扫描文件及 table=93），不与未知属性混用。字段路径使用 name、subcategory、attributes.harvestCount、memberIds 等；ID 证据统一为 318.0，只有分类字段允许引用冻结清单的 JSON Pointer 和 SHA256。

前端通过 toCollectionView 从领域实体和资源清单派生页面 DTO；展示层命名不进入共享契约。reference 实体可展示名称，但不生成未收录详情页链接。

## 验收与版本更新

当前构成：家具 887 单品+42 套组；生物 317+27 系列；植物 208+31 系列；菜肴 121+9 系列；服饰 590 服装+34 套装+51 外观；杂物 23，共 2,340 条（原图鉴 2,327 条另行核验）。

验收 ID 集合与冻结表 93 及冻结补充清单的并集完全相等、跨组无重复、所有字段符合白名单、所有成员可解析且类别正确、每个非空值有确认依据、每个未知属性 null 有原因，图鉴 null 有完整表扫描缺失证据。检查每个引用 WebP 完整解码、尺寸符合分组规则、内容哈希相等、素材无多余文件，并复核原始 PNG 的来源、哈希、尺寸和完整解码。检查配置对及所有使用资源包的清单校验值。

更新版本时重新确认根字段、字段宽度、引用／向量类型、TextMap 包装、GameplayTag 和显示对象位置、品阶枚举与缺省值、成员关系及图片用途。统计吻合是辅助证据，不能代替真实字段和显示规则的验证。不要为了匹配旧数量删除新增记录。

## 三阶段证据链与版本协议

```text
resources/game-client/ 中的客户端文件
  → config.ini、revision、branch、资源清单校验（init）
  → 完整文件集合、SHA256、profile、工具字节与实现摘要
  → 覆盖基础包和 Persistent 的 Asset Map、environment-manifest.json
  → OBB 配置对冻结到 prepared/；MiHoYoBinData 导出到 bindata/（extract/decode）
  → 表、行偏移、字段、TextMap 解码
  → 已确认的 ID、产物向量、枚举、tag 过滤与系列反向引用（structure）
  → raw/content.json、图片候选关联
  → 完整 PNG 导出、原生分辨率比较、稳定选图（raw-assets）
  → 字段证据、未知原因、未确认候选、范围外成员、来源包审计
  → 领域组装 dataset.json、image-jobs.json、evidence/domain-fields.json
  → extraction-verify、extraction-manifest.json
  → 只读取 extraction bundle 的图片缩放、裁切、WebP 编码（deliver）
  → 最终 JSON 与按最终字节 SHA256 去重的 WebP
  → 交付验证、delivery-manifest.json、目录发布与失败回滚
  → verify 对输入、整条 manifest 链及已发布字节进行验收
```

版本化产物统一位于 `var/artifacts/{environments,extractions,deliveries}/<id>/`，工具缓存位于 `var/cache/anime-studio/`；客户端输入和网站交付分别位于 `resources/game-client/`、`resources/website/`。不同版本或提取需求通过内容身份区分，不按交付路径创建工作区。

environment、extraction、delivery 的 manifest 均采用 schemaVersion 1。输出项使用相对 manifest 所在目录的 `path`、SHA256 和 `bytes`；输入清单也有整体 SHA256。实现摘要覆盖维护源码、共享契约、提取包配置和仓库 lockfile，profile 摘要不受资源索引路径影响。状态只有全部验证成功后才写为 verified。manifest 使用临时文件加 rename 发布，不以 marker 存在代替字节验证。

每个内部 checkpoint 保存 `schemaVersion`、阶段名、输入摘要、依赖摘要和输出清单。每次恢复都检查原始输入、依赖、输出哈希和输出集合。一个 checkpoint 失效会在运行前删除它和下游 marker；上游成功但下游失败后，可以重用已核实的上游产物。最终 extraction manifest 在重新执行时先失效，避免旧成功状态掩盖失败。

正式 `evidence/field-evidence.json` 的每条记录包含 `id`、`group`、`field`、`value`、类型明确的原始 `evidence`、`sources`、`association`、`transformation` 和 `status`。`sources` 指向冻结 OBB 的表号、行编号/偏移、字段索引，或原始资源包的 PathID；本地化/标签解析同时保留 TextMap、BinData 的追溯文件。图片还保留配置 reference、精确 Container、来源包、PathID 和原始/最终尺寸及哈希。

`evidence/missing-fields.json` 使用同一字段协议，状态 unconfirmed 且必须带 reason；字段未找到、文本缺失、用途未确认、冲突等均不等价于值不存在。`field-candidates.json` 保留实际候选参数，`outside-members.json` 解释被范围规则排除的关联；它们不回填交付字段。`source-audit.json` 将所有候选图片、BinData 和 OBB 来源绑定到版本清单，不能只审计最后选中的图片。

raw/content.json 保留结构阶段结果；raw/images-content.json 在不修改结构 checkpoint 输出的情况下加入选中 PNG 的 bundle 相对路径。详情观察保存在 raw/images-catalog-observations.json，领域组装生成统一 dataset 与图片交付任务。交付阶段只读封存 dataset，处理图片并生成领域 JSON、assets.json 和 release.json，不重做业务关联。最终验证从 bundle 中冻结的 OBB 重新核对表 93 与冻结确认清单的收录并集、分类、图鉴状态、品阶及成员，不打开客户端；只有 init、extract 和完整链 verify 会核对实际客户端快照。

补充清单在 extract 的 admissions checkpoint 冻结，原始字节 SHA256 进入提取身份和 manifest，structure 依赖此 checkpoint。修改工作区清单不能影响已封存交付；验证器重读冻结 OBB 和冻结清单重建并集，不信任 scope.json。线上切换须先上传新的不可变资源版本，再同步资源指针与网站代码；本次仅完成本地交付，不更新生产指针。
