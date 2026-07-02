# Cloudflare 上线步骤

日期：2026-07-01

## 正确顺序

不要先把首页入口发到正式域名。正确顺序是：

1. 先在 Cloudflare 预览环境配置 D1 数据库、R2 图片空间、Access 登录保护。
2. 在预览环境完整测试后台：登录、发布、上传图片、置顶、下架、打开公寓清单和详情页。
3. 预览环境确认无误后，再发布正式域名。
4. 正式发布后重新提交 sitemap。

## 必须配置

- D1 数据库：保存公寓和 Blog 文字内容。
- R2 图片空间：保存后台上传图片。
- Cloudflare Access：保护后台页面和 `/api/*`。
- `CMS_ADMIN_EMAILS`：必须填写允许登录后台的邮箱，不能留空。
- 不要在正式环境设置 `CMS_AUTH_BYPASS`。

## cms-demo 目录

`cms-demo/` 只用于本地演示和审计。当前已在 `robots.txt` 和 `_headers` 中禁止搜索引擎收录。

正式上线时仍建议在 Cloudflare Access 中保护 `/cms-demo/*`，或后续改成正式的 `/admin/` 路径。
