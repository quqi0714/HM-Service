# Huamei CMS 审计修复后交接说明

日期：2026-07-01

## 本轮根据 Claude 审计修复的内容

### P0 部署阻断项

- sitemap 已合并输出：
  - `/`
  - `/vehicle.html`
  - `/health.html`
  - `/love-health.html`
  - `/apartments`
  - `/blog`
  - 全部已发布 CMS 条目
- 生产 `/apartments` 列表页已加入：
  - 搜索框
  - 地区筛选
  - 年龄筛选
  - 房型筛选
  - “仅看开放中”开关
  - 服务端分页，每页 24 条
- 移动端生产卡片已限制徽章数量，避免 375px 宽度下竖排堆叠。
- `CMS_AUTH_BYPASS` 只允许 localhost / 127.0.0.1 / ::1 生效。
- `CMS_ADMIN_EMAILS` 空值时远程后台直接拒绝。
- Access JWT 增加 `iss` 校验。
- Access 证书增加 1 小时缓存。
- `cms-demo/` 已加入 `robots.txt` 屏蔽，并通过 `_headers` 加 `X-Robots-Tag: noindex, nofollow`。

### P1 上线前应修项

- SSR 列表页和详情页已加入主站风格头部、logo、主导航、页脚。
- 详情页和列表页已加入华美联系 CTA，优先引导咨询梅老师。
- 公寓详情事实面板已加入“城市”行。
- HTML 路由异常时返回中文友好页面，不再给访客裸 JSON。
- PUT 更新已加入 `updatedAt` 乐观锁，避免多人编辑互相覆盖。
- SSR 模板已加入 Google Analytics。
- OG / Twitter 分享字段已补充 `site_name`、`locale`、`twitter:card`、图片尺寸。
- 后台“删除”按钮文案改为“下架归档”。
- `archiveEntry` 对不存在的 id 返回 404。
- 正式后台一次读取上限从 200 提升到 5000，适配几百套公寓管理。

## 已验证

命令：

```bash
node --test cms-demo/cms-backend.test.mjs cms-demo/cms-core.test.mjs functions/_lib/cms-production.test.mjs
```

结果：44 项测试通过，0 失败。

语法检查已覆盖主要 demo 与 functions JS 文件。

## 未做 / 需要 Cloudflare 人工完成

- 还没有真实 Cloudflare D1/R2/Access 环境，因此无法在本地完成真实登录、真实上传图片、真实发布到 D1 的端到端测试。
- `cms-demo/` 当前已 noindex，但正式上线仍建议用 Cloudflare Access 保护 `/cms-demo/*`，或后续改为正式 `/admin/` 路径。
- Cloudflare 配置顺序请看 `CLOUDFLARE-上线步骤-2026-07-01.md`。

## 请第三方继续重点审计

- `/apartments` 服务端筛选 SQL 是否完整、安全。
- sitemap 是否同时保留主站页面和 CMS 页面。
- 移动端卡片 CSS 是否满足信息密度要求。
- 鉴权 fail-closed 是否有遗漏。
- 乐观锁是否能覆盖后台实际编辑路径。
- `cms-demo/` 上线处置是否还需要更严格地从生产包排除。
