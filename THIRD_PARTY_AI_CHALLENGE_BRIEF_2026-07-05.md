# 第三方 AI 挑战升级说明

日期：2026-07-05

## 目标

请重点挑战并升级华美官网新增内容系统的公开展示体验，而不是重新审计 Cloudflare 后台配置。

当前官网主体 `huameihope.com` 的首页观感相对成熟，但新增的公寓清单页、公寓详情页、Blog 页面仍显得毛坯，主要问题是信息层级、版式、色彩、留白、图片呈现和移动端阅读体验还不够精致。

## 重点页面

- 公寓清单页：`/apartments`
- 公寓详情页：`/apartments/:slug`
- Blog 列表页：`/blog`
- Blog 详情页：`/blog/:slug`
- 后台演示页：`/cms-demo/admin.html`，仅用于理解内容字段和发布流程

## 希望第三方 AI 挑战的问题

1. 公寓清单页如何在桌面端和移动端更高效展示上百条公寓内容。
2. 公寓详情页如何减少图片对首屏信息的挤压，同时保留用户点开查看海报/图片的能力。
3. 9:16、3:4、4:3、16:9 等不同图片比例如何自适应显示，不产生奇怪白边或大面积空洞。
4. 公寓清单、详情、Blog 目前的视觉设计如何更接近成熟官网，而不是临时演示页。
5. 如何让标签、编号、发布时间、地区、年龄、房型这些信息更易扫读。
6. 如何改善移动端筛选和信息流翻阅效率。

## 技术边界

- 当前网站部署在 Cloudflare Pages。
- CMS 后台依赖 Cloudflare Pages Functions、D1、R2、Cloudflare Access。
- 不要建议改成 WordPress 或传统服务器方案，除非作为长期替代方案单独说明。
- 不要依赖本地电脑手动改文件发布内容，后台发布仍是核心方向。

## 文件说明

- `functions/_lib/cms-core.js`：线上公寓/Blog 页面渲染核心。
- `functions/apartments/`、`functions/blog/`：公开页面入口。
- `functions/api/`：后台内容和图片接口。
- `cms-demo/`：本地演示后台和公开页逻辑。
- `migrations/`：D1 数据库表结构。
- `dist/`：当前构建后的 Cloudflare Pages 输出，可直接用于查看最终静态文件结构。

## 注意

本包已排除 `.git`、`node_modules`、`.wrangler`、旧 zip 包和本地密钥类文件。
