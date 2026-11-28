# 发布契约检查

用发布契约检查验证真实资源是否满足网站对可见性、分组或命名的假设。所有消费者都依赖的结构与引用约束归[共享数据契约](../../../packages/schema/README.md)，客户端来源与关联依据归提取器。

## 运行方式

两项检查均在仓库根目录运行。

| 检查对象                   | 命令                              |
| -------------------------- | --------------------------------- |
| 开发配置指向的本地资源目录 | `vp run website#verify-contracts` |
| 生产配置指向的已发布资源   | `vp run website#verify-release`   |

两条命令在加载资源后运行同一组检查。远端加载还会校验完成标记、CORS 和代表图片。需要核验本地图片文件的完整性时，运行 `vp run resources verify --local`，见[网站资源管理](../../../tools/resources/README.md#校验与发布)。

## 新增检查

1. 按 [ReleaseCheck 接口](../scripts/release-checks/types.ts)在 [checks](../scripts/release-checks/checks/) 中实现一类假设，并加入[检查注册入口](../scripts/release-checks/index.ts)。检查函数只读 `WebsiteResources`，文件与网络访问由加载器负责。
2. 将预期的数据问题作为 `issues` 返回，尽量给出数据位置。用有效和失败样例覆盖规则。关键预期应独立于生产配置，否则配置写错时测试也会通过。
3. 运行 `vp run website#test`，再对实际资源运行对应的契约检查。

## 失败处理

按报告中的检查名和数据位置核对资源版本、来源数据与网站假设，在出错的一层修正后重跑。新一级食材标签缺少归属、同级标签重名等问题按[标签筛选策略](tag-filter-policy.md)处理。
