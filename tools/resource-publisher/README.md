# 资源发布

在仓库根目录运行。资源目录由 `release.json` 描述，包含 `assets.json`、`zh-CN/{catalog,neighbors,world}.json` 和 `assets/`。文档必须具有相同快照身份与语言；manifest 记录每份文档的实际 SHA256 与字节数。发布器验证领域引用图、资源覆盖、完整 WebP 像素与尺寸，并拒绝额外文件或符号链接。

## 配置凭证

复制示例文件并填写 Cloudflare R2 凭证：

```sh
cp tools/resource-publisher/.env.example tools/resource-publisher/.env
```

需要配置 `CLOUDFLARE_ACCOUNT_ID`、`R2_ACCESS_KEY_ID` 和 `R2_SECRET_ACCESS_KEY`。也可通过同名环境变量提供；环境变量优先于 `.env`。`.env` 已被 Git 忽略，请勿提交凭证。

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

发布器上传 manifest 声明的领域文档、资源清单、图片及 release.json，最后写入 `_complete.json`，包含 release ID 与 manifestSha256。网站部署验收沿完成标记校验 manifest 与全部文档的哈希、大小、上下文和引用图。资源版本不可变；现有预留、并发冲突和失败诊断机制保持有效。
