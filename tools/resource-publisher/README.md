# 资源发布

在仓库根目录运行。资源目录需包含 `content.json`、`neighbors.json` 和 `assets/`；两个 JSON 的客户端版本信息必须一致，图片须为内容引用的 WebP 文件。

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

发布器会上传图鉴 JSON、友邻静态数据库和引用图片；最后写入 `_complete.json`，其中包含两份 JSON 的 SHA-256、图片数量和友邻数量。网站部署验收会下载并校验两份 JSON 与完成标记。
