# 资源发布

在仓库根目录运行。本工具校验完整本地交付，并上传不可变资源版本；整体流程见[CI/CD 与部署](../../DEPLOYMENT.md#资源更新流程)，概念边界见[领域术语表](../../GLOSSARY.md#资源发布)。输入默认示例为 `resources/website/`，由其中的资源发布清单 `release.json` 描述，格式见[共享数据契约](../../packages/schema/README.md)。发布器验证领域引用图、资源覆盖、完整 WebP 像素与尺寸，并拒绝额外文件或符号链接。

## 配置凭证

在根目录 `.env` 中配置 `CLOUDFLARE_ACCOUNT_ID`、`R2_ACCESS_KEY_ID` 和 `R2_SECRET_ACCESS_KEY`，模板与读取规则见[环境配置](../../README.md#环境配置)。`.env` 已被 Git 忽略，请勿提交凭证。

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

发布器上传资源发布清单声明的领域文档、assets 文档（`assets.json`）、图片及清单 `release.json`，最后写入 `_complete.json`，包含 release ID 与 manifestSha256。网站部署验收沿完成标记校验清单与全部文档的哈希、大小、上下文和引用图。资源版本不可变；发布器通过预留与冲突检测避免覆盖已有版本；失败时保留诊断信息。
