# HM·华美服务中心 × MaxHope AI-Ready 双向审计

**审计日期：**2026-07-22  
**审计对象：**`/Users/qu/Documents/Huamei-官网` 本地发布源码＋`https://huameihope.com` 线上只读抽检  
**对照规范：**MaxHope AI-Ready 标准 v2（2026-07-22）  
**结论口径：**“本地已完成”、“线上已验证”和“外部平台已留证”分开判定。

## 管理结论

华美已经具备良好的 AI 可读取地基：静态 HTML / 服务端渲染内容、结构化数据、公开 sitemap、低响应时间、明确的爬虫政策和 CMS 发布通知管线。本轮又修正了主网址冲突、补全了 Anthropic / Perplexity 爬虫、增强了 AI 引流识别。

但按现行 v2 “全部通过才授标”的字面规则，网站目前**尚不应被判定为已完成正式授标**。主要未闭环项为：关键页独立英文 URL / hreflang（按现标准 A5）、商户事实源与资质证据、Cloudflare 后台截图、Search Console / Bing / GBP 留证、CWV 实测与季度观测流程。

v2.1 标识已接入本地发布源，但本报告建议在外部验收和授标规则补完前，先作为待发布候选版，不把“已接入标识”等同于“已通过全部验收”。

## 一、按 v2 审计华美官网

状态含义：**通过**=当前证据足够；**部分通过**=已有基础但尚缺要件或线上发布；**未验证**=需外部平台或人工证据；**未通过**=按当前条文明确不满足。

### A 层·内容与事实

| 条款 | 状态 | 当前证据与差距 |
|---|---|---|
| A1 官方事实源 | 部分通过 | 名称、电话、邮箱、地址、微信和加州服务范围在站内已出现；营业/预约时间、资质/执照适用性、`HM·华美服务中心` 与 `HM Auto Grant Service Inc` 的公开关系尚需一张权威事实表；GBP / Yelp 一致性未验。 |
| A2 答案形状 | 部分通过 | 内容覆盖广，但首页及服务页 H1 仍是英文品牌口号，不能独立回答“是什么/给谁/在哪里/怎么联系”。建议为每个关键页增加可独立引用的中文摘要。 |
| A3 真实 FAQ | 部分通过 | 首页住房 FAQ 有 10 个可见问题并与 FAQPage 对应；车辆、健康、爱健康页尚无来自真实需求采集的问答组。 |
| A4 原创/作者/资质 | 部分通过 | 梅老师身份、照片、经历及 CMS BlogPosting 作者/发布方已有基础；图片真实性/授权台账、执照或“无需执照”的判定证据未建档。 |
| A5 多语言 | 未通过 | 页面主要为中文，英文装饰标题不构成独立英文服务页；没有独立 URL、语言入口和 hreflang。 |
| A6 边界诚实 | 部分通过 | 条款、健康免责和“不保证结果”较完整；“比市场价低 50% 以上”、“先申请的人永远在前面”、“不会突然删除”等宽泛政策表述需增加来源、适用范围和最后审核日期。 |

### B 层·代码

| 条款 | 状态 | 当前证据与差距 |
|---|---|---|
| B1 初始 HTML | 通过 | 主站是静态 HTML，公寓/Blog 由 Pages Functions 服务端输出完整 HTML；禁用 JS 仍能读核心正文。 |
| B2 语义结构 | 部分通过 | 7 个静态公开页均只有 1 个 H1，并有 main/nav/footer 及跳转链接；关键页 H1 内容过于品牌化，与页面主题的语义距离大。 |
| B3 结构化数据 | 部分通过 | 本地 JSON-LD 可解析；首页有 Organization / LocalBusiness / Person / WebSite / Service / FAQPage，服务页有 Service / BreadcrumbList，CMS Blog 有 BlogPosting。尚需 Google Rich Results / Schema.org 实际校验和“可见内容逐项一致”人工记录。 |
| B4 元信息/主网址 | 本地通过，线上待发布 | 现网会把 `.html` 301 到无扩展名 URL，但旧 canonical / sitemap 仍指向 `.html`。本轮已统一为 `/vehicle`、`/health` 等真实主网址并加测试；需发布后线上复验。法务页缺 OG 不阻断主业务收录，可作 P2 补全。 |
| B5 性能/图片 | 部分通过 | 静态 HTML 约 20–204 KB，远离 2 MB HTML 处理界限；主图多为 WebP。但首页 4 张、车辆页 17 张、健康页 10 张、爱健康页 4 张 `<img>` 未同时声明 width/height；CWV 未做正式实验室＋现场数据验收。 |
| B6 llms.txt | 不计分 | 未部署；按标准本身不影响授标。 |

### C 层·Cloudflare 与线上抓取

| 条款 | 状态 | 当前证据与差距 |
|---|---|---|
| C1 无挑战页 | 通过（抽检） | 2026-07-22 以 10 类 UA 请求首页、车辆页、健康页，均为 200 且三类页面的下载字节对各 UA 一致，未见挑战页。 |
| C2 AI 阻断开关 | 未验证 | 需 Cloudflare 后台“Block AI Bots / AI Crawl Control / WAF”截图和规则顺序留档；仅靠前台 200 不能证明所有验证爬虫均长期豁免。 |
| C3 robots 分类政策 | 本地通过，线上待发布 | 本地已显式允许 GPTBot / OAI-SearchBot / ChatGPT-User / Google-Extended / ClaudeBot / Claude-SearchBot / Claude-User / PerplexityBot / Perplexity-User，并声明 `search=yes, ai-input=yes, ai-train=yes`。线上 robots 仍是旧版，只有通配允许与 Google/Bing 显式组。 |
| C4 技术健康 | 部分通过 | www→主域 301、TLS、sitemap 与动态内容真实 lastmod 已验；`.html` 与 canonical 冲突已在本地修正，发布后才能改判线上通过。 |
| C5 缓存/响应 | 通过（抽检） | LAX 抽检首页 TTFB 约 30 ms、车辆页约 84 ms；静态图片和 CSS 返回 `max-age=14400`。建议保留多时段/多区域抽样而非把单次结果当 SLA。 |
| C6 UA 矩阵 | 通过（抽检） | 实测 Googlebot、Bingbot、GPTBot、OAI-SearchBot、ChatGPT-User、ClaudeBot、Claude-SearchBot、Claude-User、PerplexityBot、Perplexity-User，每类均测首页＋2 个关键页，共30项均返回 200。正式验收还应用 Cloudflare 日志校验 verified-bot / 官方 IP，因为单纯 UA 可伪造。 |

### D 层·生态注册

| 条款 | 状态 | 当前证据与差距 |
|---|---|---|
| D1 Search Console | 未验证 | 需下一轮登录检查所有权、sitemap 成功状态、生成式 AI Include 设置及报告可用性。 |
| D2 Bing / IndexNow | 部分通过 | CMS 已写好发布、更新、改址、下架、删除的异步 IndexNow 通知和密钥验证端点；尚需 Cloudflare `INDEXNOW_KEY`、Bing Webmaster 注册与 sitemap 截图。 |
| D3 GBP / 目录 | 未验证 | 需 GBP / Yelp / 站内 / JSON-LD 事实对照表。 |
| D4 GA4 / AI referral | 部分通过 | GA4 已在线；本地已接入 `ai_referral_visit`，同时识别 referrer 和 `utm_source`，但尚需发布及在 GA4 创建 `ai_source` / `detection_method` 自定义维度和报表。 |

### E 层·持续与观测

| 条款 | 状态 | 当前证据与差距 |
|---|---|---|
| E1 事实同步 | 未通过 | 暂无“站内—GBP—Schema—目录”的责任人、变更工单与完成时限。 |
| E2 季度观测 | 未通过 | 暂无固定提问集版本、基线截图包、爬取日志、AI referral 仪表盘和每季工单。 |
| E3 表述纪律 | 未验证 | 规范已写“只说观察到”，但尚无客户报告模板和抽查记录。 |

## 二、本轮已完成的代码改进

1. 将 7 个静态公开页和 CMS 动态页页脚从 MaxHope v2.0 升级到 v2.1：104 px 同轴长药丸、96 px 悬浮卡标识、浅色高对比适配、44 px 触控区、reduced-motion 静态帧，两处 UTM 均为 `huameihope`。
2. 显式放行 Anthropic 和 Perplexity 的训练、索引及实时代理，与用户“不阻止训练爬虫”的政策一致。
3. 将静态页 canonical、OG / JSON-LD URL、站内链接、sitemap 和重定向一致收拢到无扩展名 URL。
4. AI 引流追踪除 referrer 外，也读取 `utm_source`，避免 App / 隐私浏览器不提供 referrer 时漏记 ChatGPT 等引流。
5. 保留 CMS 异步 IndexNow、筛选参数页 `noindex,follow`、真实 sitemap lastmod、BlogPosting 发布方/栏目/关键词等上一批改造。

### v2.1 标识资产的渲染验收

- 1280 px 桌面宽度：页脚同轴双签完整，AI-READY 宽 104 px、比例约 3.29（对应 1000:304），深色页脚正确使用浅色高对比轨道。
- 键盘焦点：在转场结束后，悬浮卡 `opacity=1`、`pointer-events=auto`，桌面宽度下未裁切。
- 390 px 触屏政策：源码的 `@media(hover:none)` 会隐藏悬浮卡，保留整枚落款链接。
- **已发现资产包级别的响应式缺陷：**390 px 窄屏但仍支持 hover/键盘的环境中，键盘聚焦后 306 px 名片左侧超出视口约 110 px。普通触屏手机不会触发，但小窗口桌面/平板键盘/混合设备会违反 README “键盘聚焦可完整显示”。根据“不改定稿”铁律，本站未私自改写资产 CSS；建议由品牌资产源修正为 v2.2，用窄屏安全定位且保持箭头继续指向 MaxHope。

## 三、下一步行动方案

### P0：在对外声称“已通过 AI-Ready”前

1. 明确授标状态：本地已接入 v2.1，但先完成下列外部验收和 A 层决策再正式发布标识。
2. Cloudflare：确认 Block AI Bots 关闭、AI Crawl Control 未拦截、WAF/挑战对验证爬虫的例外及规则顺序，并截图留档。
3. Search Console：验证所有权、提交 sitemap、确认生成式 AI Include 和报告状态。
4. Bing Webmaster：验证、提交 sitemap；Cloudflare 配置 `INDEXNOW_KEY`并实发一篇测试内容验证请求。
5. 建立一页事实正本：品牌名/公司法定名、地址、电话、预约时间、服务范围、资质适用性、主要目录链接和负责人；与 GBP / Yelp / JSON-LD 对照。

### P1：内容可引用性与证据

1. 为首页、住房、车辆、健康和爱健康增加“一段话讲清”的可见摘要，保留现有视觉口号但不让口号承担主要语义。
2. 对住房 FAQ 和健康/补贴政策语句建立“主张—官方来源—适用范围—审核日”表；不改用户已确认的 Q&A 口径，但补足证据和边界。
3. 从客服记录提取车辆/健康真实 FAQ，页面可见后再加 FAQPage；不把 Schema 当成富结果保证。
4. 由业务方决定英文是否真实提供服务；如提供，建立独立英文 URL，用 hreflang 互指，并纳入事实同步流程。

### P2：性能与持续观测

1. 为缺少固有尺寸的内容图增加 width/height 或 CSS aspect-ratio，再做 Lighthouse＋PageSpeed Insights＋Search Console CWV 三层验收。
2. GA4 建立 AI 来源维度、落地页报表和转化视图；注明 referrer / UTM 都可缺失，数据是下限而不是全量。
3. 建立季度证据包：固定提问集版本、测试日期/地区/语言/模型/登录状态、引用 URL、Search Console、Cloudflare 日志、GA4 及变更日志。

## 四、用华美实战反向审视 AI-Ready 标准 v2

### 值得保留的成熟部分

1. **把“不承诺收录/引用/排名”写成红线**：这是正确的交付边界。
2. **A–E 五层模型**：内容、代码、部署、生态、持续观测形成了完整链条，比只做 robots/Schema 成熟得多。
3. **三类访问者分治**：训练、搜索索引、实时代理分开，符合 OpenAI、Anthropic、Perplexity 当前的官方分类方向。
4. **初始 HTML、Cloudflare 挑战、真实 lastmod、事实一致性和观测表述纪律**：这些都是可交付、可测量的要求。

### 建议在 v2.1 规范中修正的问题

| 优先级 | 现有问题 | 建议修正 |
|---|---|---|
| P0 | 前言说“第四章（非 Google 生态）”，实际非 Google 生态是第三章；文末又同时把第三/四章称为生态专章。 | 统一章节引用，增加文档内链和发布前章节校验。 |
| P0 | 称“48 项清单”，但本文 A–E 表只有 25 项，授标卡只有 10 项，且没有给出 48 项的版本和映射。 | 把 48 项清单收入附录，每项映射 A–E 条款；否则删除数量表述。 |
| P0 | “全标准通过”与“场景卡三 10 项全过”不等价：10 项没有完整验收 A2/A3/A4/A6。 | 建立唯一的授标矩阵，覆盖所有强制条款，并支持 Pass / Fail / Conditional / N/A / Not tested。 |
| P0 | 标识包可先接入，而标准规定只有验收后能挂标；没有“待发布/预验收”状态。 | 增加预发布规则、授标人、证据包 ID、标准版本、授标日/有效期/复审日；CI 只能证明代码合规，不能代替外部验收。 |
| P0 | C3/C6 爬虫矩阵落后于当前官方分类：缺 Claude-SearchBot、Claude-User、Perplexity-User。 | 纳入三者；用“爬虫注册表：名称/用途/官方 URL/官方 IP URL/最后核验日”管理，每季生成矩阵。 |
| P0 | C6 只改 User-Agent 即判定“已验证爬虫”，但 UA 可伪造。 | 把测试拆为“可访问性模拟”与“真实爬虫日志”；正式授标需 Cloudflare verified-bot / 官方 IP 范围证据。 |
| P0 | 场景卡二把“屏蔽 AI 爬虫”泛化为 P0/P1，与 C2 “客户可知情选择屏蔽训练”冲突。 | 仅屏蔽搜索/实时代理才是 AI-Ready 的 P0/P1；训练拒绝如有签字决策，应标为允许的政策变体。 |
| P1 | “Bing 是进 ChatGPT 引用池最有效杠杆”、“ChatGPT 高度依赖 Bing”过于绝对，当前 OpenAI 官方 FAQ 明确的直接要求是放行 OAI-SearchBot，只泛称可能使用第三方搜索提供商。 | 改为“Bing Webmaster / IndexNow 是值得布局的补充发现渠道，OAI-SearchBot 直接可访问是 OpenAI 已公开的核心条件”；不使用“GPT 版 Search Console”作为事实表述。 |
| P1 | A5 将“关键页中英文双语”定为所有 AI-Ready 网站的绝对基线，把 MaxHope 的华人市场策略与通用技术标准混在一起。 | 改为“对业务真实服务的每种语言，提供独立、对人可见、可维护的 URL＋hreflang”；中英文双语可作 MaxHope 华人客户项目配置文件。 |
| P1 | A1 要求所有站点必须有营业时间/执照，且与目录“逐字一致”，不适合预约制或无特定执照的业务。 | 每个字段支持 Required / Applicable / N/A；地址、电话等用规范化后的语义一致判定，不要要求展示格式逐字相同。 |
| P1 | B3 容易被读成“所有页必须 LocalBusiness＋Service＋FAQPage”；Google 已在 2026-05 宣布 FAQ rich result 不再展示。 | 改为按页面可见内容选择适用类型，增加 Schema 适用性矩阵；FAQPage 是语义表达，不承诺 Google 富结果。 |
| P1 | B5 “单页体量远离 2MB”易误解为 HTML＋CSS＋图片的总输送体积。 | 写明这里是 Google 处理的 HTML 响应体前 2 MB，资源性能另用页面总重、LCP 图片、JS/CSS 预算和 CWV 验收。 |
| P1 | `Google-Extended` 可被误当成可直接发请求的 UA。 | 注明 Google-Extended 是 robots 控制 token，没有独立 HTTP User-Agent，实际抓取使用 Google 其他 UA。 |
| P1 | D4 只写 referral 分组，可能漏掉带 UTM 但不带 referrer 的 App/隐私场景。 | 验收改为 UTM 优先＋referrer 回退＋未知来源的测量限制声明。 |
| P2 | E2 只说“固定问题集＋截图”，没有控制模型、日期、地区、语言、登录/个性化等变量。 | 为人工提问实验建立可重现模板，把引用/未引用记为观察值，不做单因果归因。 |
| P2 | 标准没有权威来源登记表和条款负责人，“每季复核”难以执行。 | 附录增加 Source Registry：条款、官方 URL、最后核验日、负责人、变更影响、下次复核日。 |
| P2 | 标识规范宣称“键盘聚焦可完整显示”，但 v2.1 在 390 px 窄屏且 hover 可用时，悬浮卡会被左边界裁切。 | 把标识资产加入 320/390/768/1280 px × hover/pointer × keyboard 矩阵；修正窄屏定位后再发 v2.2，不要让客户项目各自修改定稿。 |

### 标准成熟度判断

v2 已经是一份**成熟的内部策略框架**：方向正确、边界清楚、把代码之外的部署与持续运营纳入交付。但它还不是一份**可无歧义授标的成熟验收标准**：强制条款与 10 项闸门不完全映射，没有 N/A/条件通过，没有证据有效期和授标生命周期，部分生态表述超出官方可证范围。

建议下一版不继续堆新技巧，而是优先完成三件事：**唯一授标矩阵、证据包/有效期、官方来源注册表**。这三项补齐后，它才适合作为 MaxHope 对客的“可授标”标准。

## 五、本次参考的现行官方来源

- [Google：生成式 AI 搜索优化指南](https://developers.google.com/search/docs/fundamentals/ai-optimization-guide)
- [Google：Search Console 生成式 AI 表现报告](https://developers.google.com/search/blog/2026/06/gen-ai-performance-reports)
- [Google：常见爬虫与 Google-Extended 说明](https://developers.google.com/crawling/docs/crawlers-fetchers/google-common-crawlers)
- [Google：爬取与 HTML 2 MB 处理说明](https://developers.google.com/search/blog/2026/03/crawler-blog-post)
- [Google：2026-05 FAQ rich result 停止展示的更新记录](https://developers.google.com/search/updates)
- [OpenAI：Publishers and Developers FAQ](https://help.openai.com/en/articles/12627856-publishers-and-developers-faq)
- [Anthropic：ClaudeBot / Claude-SearchBot / Claude-User](https://support.claude.com/en/articles/8896518-does-anthropic-crawl-data-from-the-web-and-how-can-site-owners-block-the-crawler)
- [Perplexity：PerplexityBot / Perplexity-User](https://docs.perplexity.ai/docs/resources/perplexity-crawlers)
- [Cloudflare：managed robots.txt 与 Content Signals](https://developers.cloudflare.com/bots/additional-configurations/managed-robots-txt/)
- [Cloudflare：AI Crawl Control 与 WAF/Bot 优先级](https://developers.cloudflare.com/ai-crawl-control/configuration/ai-crawl-control-with-bots/)
- [IndexNow 协议](https://www.indexnow.org/documentation)
