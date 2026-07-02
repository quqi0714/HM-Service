# Huamei CMS 上线前审计交接说明

日期：2026-07-01

## 本轮目标

本轮完成两件事：

1. 首页加入清晰的“公寓清单”入口。
2. 将后台从纯本地演示，推进到“本地演示 / Cloudflare 正式后台”自动切换的结构。

## 本轮主要改动

- `index.html`
  - 桌面导航新增“公寓清单”。
  - 手机菜单新增“公寓清单”。
  - 住房板块新增“查看最新开放公寓”按钮。
  - 本地预览时，公寓入口自动指向 `cms-demo/apartments.html`；正式网站仍指向 `/apartments`。
  - 修复旧的 `tailwind is not defined` 控制台错误。

- `cms-demo/cms-backend.mjs`
  - 新增后台连接器。
  - 本地地址自动使用浏览器本地演示数据。
  - 正式域名自动使用 Cloudflare API：`/api/content` 和 `/api/upload`。
  - 兼容 Cloudflare 图片字段 `coverImageUrl` 与演示字段 `coverImage`。

- `cms-demo/admin.js`
  - 后台初始化改为异步读取。
  - 保存、发布、置顶、下架、图片上传在正式环境走 Cloudflare API。
  - 本地环境继续使用 `localStorage` 演示数据。
  - 页面显示当前模式：本地演示 / 正式后台。

- `cms-demo/published-apartments.js`
  - 已发布公寓集中管理页同样支持本地演示 / 正式后台自动切换。

- `functions/_lib/content-repository.js`
  - 正式后台遇到重复公寓编号时，返回清楚的 409 错误，而不是笼统服务器错误。

## 已验证

命令验证：

```bash
node --test cms-demo/cms-backend.test.mjs cms-demo/cms-core.test.mjs functions/_lib/cms-production.test.mjs
```

结果：38 项测试通过，0 失败。

浏览器验证：

- 首页打开正常。
- 首页存在 3 个公寓清单入口：桌面导航、手机菜单、住房板块按钮。
- 本地预览下入口自动指向 `cms-demo/apartments.html`。
- 后台打开正常，显示“本地演示”。
- 后台读取到 4 条演示内容。
- 已发布公寓管理页读取到 2 条已发布公寓。
- 搜索 `318` 后只显示 `#318`。
- 手机菜单打开后能看到“公寓清单”。

## 仍需上线前完成

这些不是本地代码能完全完成的，需要 Cloudflare 账号操作：

- 创建 Cloudflare D1 数据库，并把数据库 ID 写入 `wrangler.toml`。
- 执行 `migrations/0001_create_cms_tables.sql`。
- 创建 R2 图片 bucket。
- 设置 Cloudflare Access，限制后台登录邮箱。
- 在 Cloudflare 上配置环境变量。
- 用 Cloudflare 预览地址测试真实发布、编辑、置顶、下架、上传图片。

## 审计重点建议

请重点检查：

- 后台 API 是否可能被未登录用户写入。
- 图片上传类型、大小、路径是否安全。
- 富文本过滤是否足够防止恶意脚本。
- 公寓编号重复时是否稳定返回清楚错误。
- `/apartments`、`/apartments/:number`、`/blog/:slug` 是否适合 SEO 收录。
- `_routes.json` 是否正确控制 Cloudflare Functions 路由。
- 正式上线前是否应该把 `/cms-demo/` 改名为更正式的后台路径。
