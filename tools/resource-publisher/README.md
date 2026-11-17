# 资源发布

在仓库根目录运行。本工具校验完整本地交付，并上传不可变资源版本；整体流程见[CI/CD 与部署](../../DEPLOYMENT.md#资源更新流程)，概念边界见[领域术语表](../../GLOSSARY.md#资源发布)。下面示例使用的输入为 `resources/website/`，由其中的资源发布清单 `release.json` 描述，格式见[共享数据契约](../../packages/schema/README.md)。发布器验证领域引用图、资源覆盖、完整 WebP 像素与尺寸，并拒绝额外文件或符号链接。

## 配置凭证

在根目录 `.env` 中配置 `CLOUDFLARE_ACCOUNT_ID`、`R2_ACCESS_KEY_ID` 和 `R2_SECRET_ACCESS_KEY`，模板与读取规则见[根 README](../../README.md#环境配置)。`.env` 已被 Git 忽略，请勿提交凭证。

## 校验与发布

先运行 dry-run 校验资源，不需要凭证，也不会上传：

```sh
vp run @loomix/resource-publisher#publish \
  --content resources/website \
  --release 0.95.2-r1 \
  --dry-run
```

校验通过后，使用新的 release ID 发布：

```sh
vp run @loomix/resource-publisher#publish \
  --content resources/website \
  --release 0.95.2-r1
```

`--content` 路径相对仓库根目录；release ID 只能发布一次。默认上传到 `loomix-assets` bucket，可用 `--bucket <name>` 指定其他 bucket。进度写入 stderr，发布结果 JSON 写入 stdout。

发布成功后再按部署流程更新网站资源指针。发布结果不代表网站已切换到新资源；网站假设仍需通过发布契约检查。完整参数见 [CLI](src/cli.ts)，上传与完成判定见[发布实现](src/publish.ts)。

## 失败处理

dry-run 失败时先修复本地交付，不会占用远程 release ID。正式上传会先预留 ID；预留成功后即使上传中途失败，该 ID 也保持占用，当前工具不支持用它续传。

遇到 `Release already exists` 时使用新的 release ID。网络或上传校验失败后，保留命令输出以定位原因，修复后重新 dry-run 并用新 ID 发布；不要删除预留标记来绕过不可变约束，也不要把网站指针切到未确认完成的版本。上传期间不要修改输入目录。
