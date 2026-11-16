# 提取原理

本文说明独立实现所需的输入、解码、关联和验收规则；末节单独说明本仓库的流水线实现。概念定义见[领域术语表](../../GLOSSARY.md)，发布结构与字段映射见[共享数据契约](../../packages/schema/README.md)。以下客户端规则适用于“已验证基线”所列版本，新版本必须重新定位字段。

## 范围与前提

用户已确认当前根字段 93 的全部记录属于开放游戏内容。字段 1 为 1 的外观也是开放内容，只是不计入万象列表；67 个主题集合是各大类内的小分类。另有用户明确确认的十三条实装记录由版本绑定清单收录；其他表外内容是否开放不能由名称、图标或配方引用推断。

## 输入及版本选择

准备客户端的 config.ini、PetitPlanet_Data 内的基础与 Persistent 更新资源，以及覆盖两者的 Unity 对象索引。读取 config.ini 的 game_version，并分别核对 data_revision 和 res_revision。

名为 data_versions.json、res_versions.json 的客户端资源清单实际为 CSV，列为 FilePath、md5、FileSize。配置候选包括 StreamingAssets/GenerateAssets、Persistent/GenerateAssets 和 Persistent/Temp/<清单目录>/GenerateAssets。只有 ed.obb、cs.obb 同时匹配同一 data 清单的配置对才能采用。当前采用 Persistent/Temp/5662883/GenerateAssets；忽略 Temp 会读到旧配置。

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

物品的直接标签由 318.6–17 的十二组标签按字段顺序展开，再追加主表类型对应的 716.10 typetag，稳定去重，不展开祖先；各来源列的归属保存在字段证据中。客户端 EnumName 仅在提取侧用于解析生态展示键。

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
| 生物尺寸范围           | 132.0 = 生物 ID；132.4/5 为整数端点，乘 132.6 的浮点系数得到显示范围，单位为“厘”；132.3 在当前配置中恒为 100，不参与显示换算               |
| 生物地区               | 325.31 的显示键，经显示字典或直接文本键解析                                                                                                |
| 生物出没地             | 325.30 的 CHabitat_<EnumName>，核对 GameplayTag EnumName 后解析 TagDisplayName_<EnumName>；部分旧 TagUIData 文本键已经失效                 |
| 季节、时间、天气       | 325.34、325.32、325.33 的显示键；分号分隔多值。AllSeason 经显示字典关联 TagDisplayName_AllSeason                                           |
| 植物原产星系、菜肴风味 | 318.8 区域／风味标签的显示文本；未写入标签不擅自补“全地区”或“通行风味”                                                                     |
| 作物收获茬数           | 144.10 的产物编号向量 → 144.5 收获次数；如番茄种子 30213 的产物 30219–30223，收获次数 3。种子、苗与产物不合并成一条记录                    |
| 菜肴难度               | 122.4 指向菜肴产物，122.2 → 121.0，121.1 为显示名 hash：简单、招牌、宴客、秘制                                                             |
| 厨具                   | 同一菜谱 122.16 → 126.2，126.1 为名称。当前 2 煮锅、4 烤箱、5 榨汁机；未解析的代码不猜名称                                                 |
| 食用效果               | 325.8 的力气数值代入 TextMap 4027993099“增加 %s 力气”。325.9 有附加效果时必须继续解析，不只输出基础力气掩盖未知效果                        |

显示表存在重复 ID。对最终需要的字段进行语义比较：数值比较数值、向量比较内容、字符串比较文本，不能比较相对引用地址。相同内容可合并；范围内冲突必须停止。范围外冲突不应通过覆盖顺序影响结果。

种子和生长配置使用 formatVersion 11 的正式契约。通过确定性种植关系校验的种子合入正式物品，生长配置内嵌在种子的 `growth` 中，不改写原图鉴收录事实。当前共有 79 个种子和 317 个阶段：17 个作物种子沿表 144/137 解析；新增 62 个种子（42 个花种子、20 个树木及灌木种子）沿表 334/709/241 解析。友邻服饰同样作为 `catalog.items` 的 neighborClothing 正式物品交付；候选数据先经过准入清单筛选，保留 131 条正式记录，并以 neighborId、playerItemId、体型和价格保存可验证的关系。

表 334.0 为种子 ID，334.1 仅接受 ITEM_USE_EFFECT_PLANT_TREE_SEEDLING 或 ITEM_USE_EFFECT_PLANT_FIXED_SEEDLING，334.2 是十进制字符串形式的初始植株 ID。以 709.0 为键，沿 709.2 完整遍历后继阶段，直到没有 709 行；循环、悬空 ID、未知效果或参数格式变化均中止。不能在遇到正式植物时截断：栀子花丛、杜鹃花丛、沙漠玫瑰丛、鹤望兰丛、南天竹丛之后仍有配置阶段。

生长配置按 kind 区分 crop 和 staged。作物保留初生向量 initialStageIds、返生向量、成熟形态、枯萎阶段和收获茬数，不推断它们之间的运行时事件；花树的 stages 顺序直接保存来源链。阶段 plantId 由 137.1 的作物产物、241.1/2 的花材，或阶段自身与正式树木／灌木的同 ID 关联确认；冲突即失败。种子不再重复保存 productIds，植物不再保存 harvestCount 或 maturityPeriod。果实与树木关系继续使用 drops，并以 `source` 区分果实与砍树掉落。

只有完整链能连接正式植物的确定性种子才准入。枫叶树种子 30224 缺少使用配置；杂草种子 30228/30238 未关联正式植物；随机种植测试种子 56999 不在本次范围；四项写入 plant-exclusions.json。阶段和种子的名称、描述、品质、图片、交易与来源从对应客户端表读取。缺图不阻断关系，配置匹配后的导出失败仍须中止。

成熟天数仍未确认，不进入发布数据。表 709.3/4/7 的数值仅保存到 plant-investigation.json，不把阶段数或候选参数解释为天数。plant-evidence.json 保留每个种子和生长字段的表、行偏移及关联依据，正式领域证据同时覆盖图片与未知字段。

生物尺寸经游戏内数据交叉核对后按 `132.4/5 × 132.6` 计算，结果单位为“厘”；132.3 在当前 329 行配置中均为 100，不参与该计算。薄荷炫彩灯鱼（30/50 × 0.05 = 1.5/2.5）、酢漿灰蝶（23/38 × 0.2 = 4.6/7.6）、红石蟹（26/46 × 0.2 = 5.2/9.2）和椰子螺（20/40 × 0.7 = 14/28）均与游戏内查看值相符。132.6 为 32 位浮点数，计算时归一化到两位小数精度，避免二进制浮点误差外显。

其他未确认字段输出 null，并记录实际候选数据和未确认原因。表 134、135 已有时间、栖息地文案，但不能仅因编号相同就连接生物记录。用当前 UI 显示键关联优于推测关联。

## 图片提取与转换

普通单品及家具、服饰套组采用显示表明确关联的图片，导出全部可用大小图候选后，按原生宽×高选择像素数最多的图片；像素数相同时按原始配置 rank 优先大图，再按源对象身份排序。选图使用原生尺寸，所有参与比较的候选 PNG 均封存到提取结果。选图完成后，家具套组（furniture.set）统一输出 1024×512，其他有图记录（包括服饰套装）统一输出 256×256；按原比例缩放、居中裁切，使用 Lanczos3 和有损 WebP 质量 85、alphaQuality 100，保留透明通道。67 个生物、植物、菜肴主题集合复用家具图标；目前未确认这些图是系列的实际展示图，图片保持 null。不要改用成员图或拼图替代。

UISprite 引用加 assets/moleres/rel/sres/ 前缀，统一斜杠和小写，只去除末尾 png/jpg/jpeg/tga/psd。按完整 Container 匹配 Texture2D。Texture2D 名称为 sactx- 图集时，改用完整 Container 加精确 Sprite 名称匹配，名称为引用路径末段去扩展名。不能导出整张图集当单品。更新来源优先且所有来源包须通过清单校验。

源对象身份由冻结包 SHA256、对象类型和规范有符号 64 位 PathID 共同确定；PathID 使用 BigInt 验证，不经过 Number。配置引用、源对象、PNG 字节身份和领域图片引用分别保留。assetId 使用源对象身份，PNG SHA256 只负责原图内容存储；同一源对象可以有 icon、banner 和 illustration 三种用途变体。

导出时同时筛选对象名和 Container；若这两个筛选仍不能唯一定位请求 PathID，立即报歧义。同一个包内若有同名 Sprite，分别导出，避免工具以名称写文件时发生覆盖。任何已选对象导出失败均停止。完整解码 PNG、校验 CRC、尺寸和全部像素数据；仅转换选中的图片，完整解码最终 WebP 并检查目标尺寸；用最终 WebP 字节的 SHA256 命名并去重。相同原图用于不同目标尺寸时分别转换，清单分别记录原始 PNG 和交付 WebP 的路径、哈希及尺寸。

## 补充收录与证据

补充清单位于 `src/extraction/source/catalog/supplemental-admissions.json`，schemaVersion 为 1，source 绑定同一客户端版本，confirmation 保存人工确认说明。entries 仅含 `id`、`expectedName`、`category`、`subcategory`：苹果 30161、李子 30169、牛油果 30265、芒果 30266、仙人掌果 30267、竹笋 30268 为 plants/采摘材料；肉 2000050、蛋 2000051、奶 2000052，以及寒松木 30115、陨星矿石 30136、雪晶 30299、纯净雪花 30300 为 miscellaneous/null。名称、描述、图片和品质始终从客户端提取，不从清单复制。缺失主表、版本或名称错配、重复 ID、与图鉴分类冲突均中止提取；重叠 ID 只生成一次且保存双方依据。

十三条补充记录的系列引用、描述及其他属性均从冻结客户端读取，不因人工收录而推断关联或补造字段；未配置或未确认的字段按契约保留 null，并记录来源证据或未确认原因。图鉴行缺失不会阻断 UI 描述或图片来源。

`observations.json` 的 `diagnostics.admissions` 保存 `id`、`admissionSources` 和 `encyclopedia`。图鉴收录源含 kind=encyclopedia、file、table=93、rowOffset；人工源含 kind=manual、file、pointer、sha256。图鉴证据为 present（含原始行及 listed）或 absent（含扫描文件及 table=93），不与未知属性混用。字段路径使用 name、subcategory、attributes.originGalaxy、memberIds 等；ID 证据统一为 318.0，只有分类字段允许引用冻结清单的 JSON Pointer 和 SHA256。

配方、掉落、对应玩家服饰和送礼偏好引用到范围外物品时生成仅供引用物品（`reference`），不扩大正式收录范围；术语边界见[领域术语表](../../GLOSSARY.md#收录与图鉴)。家具只保留正式产物需要的有效创想卡配方；材料缺失的配方以 `materials: null` 表示未知，不解释为免费制作。烹饪配方的食材表达式必须全部解析，解锁条件必须是已知结构，否则中止提取。主题目标、升级用量、秘方物品和商店库存等尚未确认的关系不发布，只记录排除证据。

## 友邻准入与故事

[友邻提取模块](src/extraction/source/neighbors/) 通过固定 NPC ID 白名单过滤正式主档（当前名单排除图塔，新增友邻需显式更新白名单），在 `observations.json` 保存内部友邻观察（schemaVersion 4）；正式交付 `zh-CN/neighbors.json` 使用共享契约的当前 formatVersion。同行反应、交往说明、事件标签、邂逅岛、世界岛屿和资源路径不被网站使用，不再提取。白名单成员缺少正式主档或必要字段时停止提取；非白名单 NPC 不收录，并写入排除审计。补充图片只保留友邻详情页使用的好感插画与角色立绘，均归属于具体友邻。

友邻数据库保持稳定排序且不写入生成时间；同一输入重复提取产生相同字节。故事按章节和段落顺序聚合，保留纯文、普通单图、竖版单图及左右图文布局；布局来自故事表的正文、配图和排列标记，独立于图片是否成功交付。验收对照固定白名单及冻结主档独立检查友邻集合、检查完整数据库及版本绑定数量，再确认交付领域数据与封存 dataset 一致。

## 已验证基线

当前客户端版本参数由 [profile](src/profile.ts) 维护，提取语言为 zh-CN。本节记录已验证的客户端 **0.95.2**、配置 revision **1449213**、资源 revision **1391927**、清单目录 **5662883**，对应交付 formatVersion 11。本文的字段编号、对象名和数量仅适用于此基线。

正式 records 为 2,550 条：家具 887 单品+42 套组；生物 317+27 系列；植物 208+31 系列；菜肴 121+9 系列；玩家服饰 590 服装+34 套装+51 外观；杂物 23，共 2,340 条（原图鉴 2,327 条另行核验）；加上 79 个确定性种子和 131 条正式友邻服饰。

友邻为 12 个友邻、12 个星球、44 章故事（220 个段落记录）。统计用于交叉核验，不作为跨版本固定数量。

## 验收与版本更新

分别验收准入集合：图鉴与人工补充部分的 ID 集合必须等于冻结表 93 与冻结补充清单的并集；种子按上文确定性种植关系与排除证据独立验收；友邻服饰按其准入清单及客户端关联独立验收。合并后的正式物品与集合跨组无重复，所有字段符合白名单、所有成员可解析且类别正确、每个非空值有确认依据、每个未知属性 null 有原因，图鉴 null 有完整表扫描缺失证据。检查每个引用 WebP 完整解码、尺寸符合分组规则、内容哈希相等、素材无多余文件，并复核原始 PNG 的来源、哈希、尺寸和完整解码。检查配置对及所有使用资源包的清单校验值。

更新版本时重新确认根字段、字段宽度、引用／向量类型、TextMap 包装、GameplayTag 和显示对象位置、品阶枚举与缺省值、成员关系及图片用途。统计吻合是辅助证据，不能代替真实字段和显示规则的验证。不要为了匹配旧数量删除新增记录。

## 本仓库实现

### 模块边界与工具准备

代码按事实解释、纯组装和生命周期归属组织：

- `src/workflow/`：哈希、manifest、锁、进程、目录替换和 JSON；
- `src/client/`：客户端快照、版本清单、Asset Map 解析和 AnimeStudio；
- `src/environment/`：客户端环境产物；
- `src/extraction/source/`：冻结、解码及目录、种植、配方、友邻 reader；同次返回事实、具体依据、图片用途和诊断；
- `src/extraction/images/`：源对象身份、统一导出 adapter、批次缓存及确定性选择；
- `src/extraction/assemble/`：纯领域组装、引用闭包及证据路径投影，不读取文件或客户端表；
- `src/extraction/build.ts`、`bundle.ts`、`cache.ts`：固定提取流程、不可变封存视图和昂贵批次恢复；
- `src/verify/`：独立来源断言，直接对照冻结表、图片索引、原图和证据；
- `src/delivery/`：消费验证后的类型化封存视图，按 variant 转换图片并交付；
- `src/verify.ts`：实际客户端、整条 manifest 链与落地字节的验收。

`src/workflow/process.ts` 通过 execa 统一执行 AnimeStudio、构建工具和准备步骤，直接将 stdout/stderr 写入同一日志，支持追加或覆盖，不缓冲完整进程输出。`src/client/asset-map.ts` 通过 sax 流式读取 Asset Map，统一处理 XML 实体、CDATA、跨块文本、必需字段和 Persistent overlay；环境构建把它压缩为只含 Texture2D、Sprite、MiHoYoBinData 的 `asset-index.json`。AnimeStudio 退出码为 0 但日志报错时仍判定失败。

AnimeStudio 的固定版本与下载摘要见[配置](src/client/anime-studio/config.ts)。Windows 使用局部 runtime；macOS 使用固定源码、补丁与局部 SDK 构建。下载包校验摘要，生成内容在 `.staging` 完成探测和哈希验证后才发布；ready marker 和 `--version` 探测都通过后才复用。缓存版本同时考虑平台、架构和补丁。

### 三阶段证据链与版本协议

```text
$LOOMIX_DATA_ROOT/clients/<snapshot-id>/game-client/ 中的客户端文件
  → config.ini、revision、branch、客户端资源清单校验（init）
  → 完整文件集合、SHA256、profile、工具字节与实现摘要
  → 覆盖基础包和 Persistent 的 Asset Map、environment-manifest.json
  → source/ 冻结 OBB、索引、TextMap、BinData、人工清单
  → reader 同次提取 typed 事实、具体证据、图片用途及调查信息
  → observations.json、统一源对象和候选配置
  → 昂贵导出批次缓存、完整 PNG 验证、originals.json
  → assemble(observations, originals) 纯组装及稳定选图
  → dataset.json、evidence.json、image-bindings.json、image-jobs.json
  → 全候选来源包审计、独立来源验收及可重现性比较
  → validation.json、extraction-manifest.json 最后写入并原子封存
  → 只读取 extraction bundle 的图片缩放、裁切、WebP 编码（deliver）
  → 最终 JSON 与按最终字节 SHA256 去重的 WebP
  → 交付验证与 delivery-manifest.json 封存（deliver）
  → verify 核对实际客户端及整条 manifest 链
  → materialize 将已验证交付发布到当前 worktree，失败时恢复旧目录
```

存储目录与运行命令见[客户端资源提取](README.md#输入缓存与产物)。版本通过内容身份区分，不按交付路径创建工作区；默认 deliver 只封存共享交付，materialize 才更新 worktree 网站资源。`--website` 直接发布模式的 verify 还会核对已发布字节。

更新清单包含基础包、未安装的可选下载及未落地的 overlay。init 校验清单格式与已安装条目的 MD5/大小，data manifest 优先于同路径 res manifest；记录未安装项和 MD5 为 0 的无校验值条目；配置对必须完整匹配当前 data manifest。extract 进一步强制核验实际使用的全部图片候选包、BinData 来源包和两份 OBB；未安装项不视为“内容不存在”的证明。

环境身份绑定客户端清单、profile、工具字节和实现摘要；提取身份还绑定 environment manifest 与冻结补充清单。实现摘要覆盖源码、发布契约与 lockfile，修改这些输入会产生新身份。

仓库根配置默认不缓存 package scripts，因此每次都会执行入口并重新验证真实输入。提取只对解码和外部原图导出保留恢复缓存，与 Vite Task 缓存无关。缓存身份绑定冻结输入、profile、完整实现和真实工具字节；解码域包含 BinData 导出，因而也绑定工具和导出选项。每个缓存批次在 staging 中完成，核对完整文件集合与哈希后写 receipt，再原子提交；相同身份加锁，失败批次不成为可复用结果。

environment、extraction、delivery 的 manifest 均采用 schemaVersion 1。输出项使用相对 manifest 所在目录的 `path`、SHA256 和 `bytes`；输入清单也有整体 SHA256。实现摘要覆盖维护源码、共享契约、提取包配置和仓库 lockfile，profile 摘要不受资源索引路径影响。状态只有全部验证成功后才写为 verified。旧内部 raw、分领域图片清单与 checkpoint 协议不再读取；重新提取会生成新身份。

新提取始终在独立 staging 目录内构建和验收，manifest 最后写入，再 rename 提交整个目录。已有同身份的有效封存先核验后直接复用；只在完整性损坏时隔离旧目录，不在重跑开始时撤销成功标记。封存包含冻结源、所有参与选图的原图与观察，恢复缓存可独立删除。

`observations.json` 是唯一源观察产物：reader 同次保存值与具体表行、TextMap、BinData 或人工依据，并声明结构化图片用途及其所有候选。未知原因、排除项、范围外成员与调查信息留在该产物中。不会在最终组装时回读客户端补值，也不按表号提示猜测证据来源。生长阶段和制作配方以语义身份定位证据，组装确定顺序和归属时投影最终字段路径。

`evidence.json` 使用实体集合、身份和字段路径定位值，区分 confirmed、absent、unresolved；来源区分表行、完整表扫描、素材对象和人工确认。可定位集合为 `catalog.items`、`catalog.collections`、`neighbors.neighbors` 与 `gameplayTags.tags`；内嵌数据通过所属实体字段路径定位，例如 `growth.stages.0.image`、`cooking.slots`。确认状态冲突或悬空证据路径直接失败。

统一原图目录按源对象去重导出，按 PNG SHA256 去重存储。`image-bindings.json` 保存用途到候选选择的关联，`image-jobs.json` 精确覆盖公开图片引用，只含 ImageRef 和原图元数据；delivery 按 icon/banner/illustration 选择转换规格。`source-audit.json` 必须覆盖所有参与比较的候选包及 BinData、配置，不能只审计赢家。

验收把可重现性与独立来源断言分开：前者重读源观察并重新 assemble，对照 dataset、证据、绑定和 jobs；后者直接从冻结 OBB、清单、图片索引与 PNG 计算准入集合、成员、种植链、材料、掉落、标签、候选及选图断言。独立检查器不调用生产分类、关联、选图 reader 生成 expected。数据与证据一起篡改的回归必须被独立断言拒绝。提取结果的离线验收不打开实际客户端；整链 verify 继续验证实际客户端和上游环境。

补充清单原始字节在 extract 开始时冻结到 `source/`，其 SHA256 进入提取身份及最终 manifest。修改工作区清单不会改变已封存结果。提取与 materialize 只更新本地产物；线上切换须先上传新的不可变资源版本，再同步资源指针与网站代码。

### 本地落地与资源替换

输出目录拒绝危险路径、符号链接和无关文件，只接受 release.json、assets.json、语言目录下的领域 JSON、assets/ 和可选 .gitkeep。友邻 JSON 只公开客户端确认的数据，不包含 OBB 来源编号或玩家账号状态；来源证据和排除项仅保存在 extraction bundle。本地落地先验证同级暂存副本，再将旧目录移到备份并重命名整个新目录；不会逐文件混合两个版本。重命名失败时恢复完整旧目录。输出目录锁串行化本工具的落地操作；两次目录重命名之间存在短暂不可用窗口，不承诺跨进程读取或机器断电的事务隔离。
