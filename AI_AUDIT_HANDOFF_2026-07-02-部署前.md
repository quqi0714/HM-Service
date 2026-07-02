# Huamei 官网 + CMS 部署前审计交接说明

日期：2026-07-02

## 审计包范围

本次审计包包含主页与 CMS 上线相关文件，不只是本次新增功能：

- 主页与现有公开页面：`index.html`、`vehicle.html`、`health.html`、`love-health.html`
- 公共样式与图片：`css/`、`images/`
- CMS 演示/后台页面：`cms-demo/`
- Cloudflare Pages Functions：`functions/`
- D1 数据库迁移：`migrations/`
- Cloudflare 配置：`wrangler.toml`、`_routes.json`、`_headers`
- 构建与测试脚本：`package.json`、`scripts/`
- 上线说明：`CLOUDFLARE-上线步骤-2026-07-01.md`

不包含：`.git/`、`dist/`、旧审计压缩包。

## 本轮最后修复

- Blog 详情页找不到文章时，404 页面不再显示英文 `Blog post not found`，改为中文 `文章不存在`。
- 新增回归测试，防止以后又退回英文访客文案。

## 当前已验证

已运行完整测试：

```bash
npm test
```

结果：52 项测试通过，0 失败。

已运行上线构建：

```bash
npm run build
```

结果：成功生成 `dist/`，Cloudflare Pages 配置为部署 `dist/`，避免把审计文档、测试文件、脚本目录等内部文件直接公开出去。

## 需要第三方重点审计

- 主页上“公寓清单”入口是否清晰，是否会影响原官网核心转化。
- 手机端 `/apartments` 公寓列表的信息密度是否适合几百套公寓浏览。
- 后台发布、编辑、置顶/取消置顶、下架归档的逻辑是否仍有 P0/P1 风险。
- Cloudflare Access / D1 / R2 配置说明是否完整，是否存在部署后后台裸露风险。
- Google 是否能访问公开公寓详情页、列表页和 sitemap。
- `dist/` 构建产物是否只包含应该公开给访客的文件。

## 尚未在本地完成的事项

- 尚未接入真实 Cloudflare D1、R2、Access，因此真实账号登录、真实图片上传、真实数据库发布需要在 Cloudflare 预览环境中再测。
- `/cms-demo/*` 当前通过 `X-Robots-Tag: noindex, nofollow` 阻止搜索引擎收录；正式部署时仍应在 Cloudflare Access 里限制只有管理员可访问。
