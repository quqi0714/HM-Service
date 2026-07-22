# MaxHope AI-Ready 标准 v2 反馈报告

**反馈日期：**2026-07-22  
**评估对象：**MaxHope AI-Ready 标准 v2（2026-07-22 正式版）  
**评估范围：**只评估标准本身的逻辑、可验收性、证据治理和对客风险，不引用任何具体客户网站问题。

## 一、总体结论

v2 已经是一份**成熟的内部策略框架**：它把内容、代码、部署、生态注册和持续观测纳入同一交付链，也正确设置了“不承诺收录、引用或排名”的边界。

但它还不是一份**可无歧义执行的授标标准**。主要缺口是：

- 没有唯一的强制控制项和授标矩阵。
- 缺少适用性、N/A 和条件通过模型。
- 证据类型、有效期、复审和撤标治理不完整。
- 部分生态表述超出当前官方文档能支持的确定性。
- 通用标准、市场策略和项目默认值尚未完全分层。

下一版应优先从“知道要做什么”升级为“任何两个审核人都能得到同样结论”。

## 二、P0：下一正式版发布前应修正

### 1. 修正章节交叉引用

前言把“非 Google 生态专章”称为第四章，实际是第三章；文末又同时将第三、四章称为生态复核重点。

**建议：**改用稳定条款 ID（如 ECO-OPENAI-01），不要只写“第几章”；发布前增加编号和内部链接校验。

### 2. 解决 48 项、25 个 A–E 条款和 10 项授标闸门的数量冲突

标准提到“48 项清单”，正文 A–E 只有 25 个编号条款，场景卡三只有 10 个步骤，且没有映射。

**建议二选一：**

- 将 48 项正式收入附录，每项映射到 A–E 条款、证据和授标结果；或
- 删除“48 项”的数量承诺，只保留唯一受控的 Control Register。

### 3. 建立唯一授标矩阵

“全标准通过”与“场景卡三十项通过”不等价；十项闸门没有完整验收 A2、A3、A4、A6 等内容条款。

场景卡应只是执行顺序，Control Register 才是授标正本。每个控制项至少包含：

| 字段 | 说明 |
|---|---|
| Control ID | 不随章节移动的稳定编号 |
| Requirement | 一条可判定的要求 |
| Applicability | 什么类型的项目适用 |
| Severity | 失败时的 P0/P1/P2 |
| Evidence | 必需证据类型 |
| Freshness | 证据有效期 |
| Result | Pass / Fail / Conditional / N/A / Not Tested |
| Owner | 实施与批准责任人 |

### 4. 引入适用性和结果状态

预约制业务、无公开地址业务、无特定许可证行业、只提供单一语言服务的项目，不应因不适用字段被误判。

**建议：**每条标记 Required / Conditional / Optional。N/A 必须有理由、批准人和证据；Not Tested 不得视为通过。

### 5. 补齐标识授权生命周期

标准缺少待验收状态、授标人、证据包编号、发放日、到期日、复审日和过期处理。

**建议：**建立 Pending Integration / Awarded / Expired or Revoked 三态。无论是否托管，均应有复审期；可先采用 12 个月有效期，P0 事件立即触发复审。

### 6. 修正训练爬虫与搜索/实时代理的判级冲突

C2 允许客户知情选择屏蔽训练爬虫，但场景卡二又可能把“屏蔽 AI 爬虫”笼统判为 P0/P1。

**建议明确分开：**

- 搜索索引爬虫被阻断：AI-Ready 失败。
- 实时用户代理被阻断：AI-Ready 失败或明确的功能降级。
- 训练爬虫被阻断：可作为合规政策变体，前提是有业务方签字决定，且不影响搜索与实时访问。

## 三、P1：技术和表述修订

### 7. 更新爬虫注册表，并拆分 UA 仿真与真实身份验证

- C3/C6 增加 Claude-SearchBot、Claude-User、Perplexity-User。
- Google-Extended 是 robots.txt 产品 token，没有独立 HTTP User-Agent，不应进入 HTTP UA 请求矩阵。
- C6 拆为两类证据：
  1. **可访问性仿真：**指定 UA 检查状态码、正文和挑战页。
  2. **真实爬虫证据：**官方 IP 范围、反向 DNS 或 Cloudflare verified-bot/日志。

Google 明确提醒 UA 可伪造；Perplexity 也建议 WAF 同时匹配 UA 与官方 IP 清单。

### 8. 降低 Bing/IndexNow 与 ChatGPT 之间的因果语气

“ChatGPT 高度依赖 Bing”“最有效杠杆是 Bing”“GPT 版 Search Console”过于绝对。OpenAI 当前公开的直接条件是不要阻断 OAI-SearchBot，并仅说明 URL 也可能来自第三方搜索提供商。

**建议文案：**“Bing Webmaster Tools 与 IndexNow 是值得布局的补充发现渠道；对 OpenAI 已公开的直接要求，核心是保证 OAI-SearchBot 可访问。”

### 9. 将“至少中英双语”改为服务语言条件

A5 把特定市场策略写成所有网站的强制基线。

**建议文案：**“对业务真实提供服务的每一种语言，建立独立、对人可见、可维护的 URL，并按适用性配置语言入口与 hreflang。禁止只给机器看的隐藏翻译页。”

“中英双语”可放进特定市场的 Project Profile，不应是通用授标条件。

### 10. 将 A1 从“逐字一致”改为“适用事实的语义一致”

- 营业时间、地址、许可证等字段支持 Applicable / N/A。
- 电话的空格、括号和国家码等非语义展示差异不应判失败。
- 建立标准值、公开展示值、渠道限制和最后核对日。

### 11. 将 Schema 改为页面类型适用矩阵

B3 容易被误读为所有页面都要部署 LocalBusiness＋Service＋FAQPage。

**建议：**按组织页、地点页、服务页、文章页、列表页选择与可见内容符合的类型。Google 已说明生成式 AI 搜索不需要特殊 Schema；FAQ rich result 自 2026 年 5 月起也不再展示。FAQPage 应被表述为可见 FAQ 的语义表达，不是 AI 收录或富结果保证。

### 12. 明确 B5 的 2MB 是哪一种体量

“单页体量远离 2MB”容易被误解为 HTML、CSS、JS、图片全部加总。

**建议：**写明 Googlebot 对普通 URL 当前抓取前 2MB（包含 HTTP header），HTML 超过后会截断；被 HTML 引用的可抓取资源有独立的每 URL 字节计数。页面总重、LCP 图片、JS/CSS 和 CWV 应由另一张性能预算表验收。

### 13. 完善分析归因规则

D4 应定义：

1. 显式 UTM 优先。
2. referrer host 回退。
3. 无法识别时记为 unknown/unattributed。
4. 报告中明示 AI referral 是可观测下限，不是全量。

OpenAI 当前说明 ChatGPT 搜索链接会自动带 utm_source=chatgpt.com，这个信号应直接进入验收。

## 四、P2：使标准可复现、可维护、可扩展

### 14. 建立权威来源登记表

附录增加 Source Registry：

| 字段 | 说明 |
|---|---|
| Source ID | 与条款绑定的来源编号 |
| Official URL | 官方原文地址 |
| Claim Supported | 该来源支持的精确表述 |
| Last Verified | 最后核对日期 |
| Owner | 复核负责人 |
| Change Impact | 变更影响的条款和模板 |
| Next Review | 下次必须复核日期 |

“官方文档优先”是正确原则，但只有来源登记表才能让它可执行。

### 15. 统一证据等级

- **E1 源码证据：**代码、配置、静态分析。
- **E2 构建证据：**测试、构建产物、本地运行。
- **E3 线上证据：**真实域名、状态码、正文、日志。
- **E4 平台证据：**Cloudflare、Search Console、Bing、分析平台截图或导出。
- **E5 结果观测：**引用、展示、引流、人工提问实验。

每个 Control 应指定最低证据等级。E1/E2 不能代替 E3/E4；E5 是观测，不是授标因果证明。

### 16. 让季度人工提问实验可重复

除了固定问题集和截图，还应固定：

- Prompt Set 版本和问题 ID。
- 产品/模型、日期时间、地区、语言。
- 登录状态、账号类型、新会话和个性化条件。
- 是否联网、引用 URL、完整截图或导出。
- 结果标签：出现/未出现、引用/未引用、事实正确/部分/错误。

结果必须写成观察值，不得用单次前后对比证明因果。

### 17. 增加“代理可用性与安全”控制组

标准已经提到浏览器代理，但缺少可操作验收。建议增加：

- 表单字段有可程序识别的 label、错误和成功状态。
- 关键操作可只用键盘完成，焦点顺序可预测。
- 不可逆操作前有清楚的二次确认。
- 服务端仍执行身份、CSRF、频率限制和输入验证。
- 不建立只对代理可见、对人类隐藏的功能页。

## 五、建议的下一版文档结构

1. 第一章：定义、承诺边界、适用范围。
2. 第二章：唯一 Control Register。
3. 第三章：证据、结果状态和例外模型。
4. 第四章：生态爬虫与平台注册表。
5. 第五章：新建、诊断、授标三张执行卡。
6. 第六章：标识授权、有效期、复审和撤标。
7. 附录 A：48 项映射表（如保留数量承诺）。
8. 附录 B：Source Registry。
9. 附录 C：证据包模板。
10. 附录 D：季度观测模板。

## 六、建议修订顺序

### 第一轮：授标逻辑

1. 固定 Control Register。
2. 解决 48 / 25 / 10 的映射。
3. 增加 Applicability 和五种 Result。
4. 定义证据等级和有效期。
5. 定义标识授权、复审、过期与撤标。

### 第二轮：生态事实

1. 更新 OpenAI / Anthropic / Perplexity / Google 爬虫表。
2. 拆分 UA 仿真与真实爬虫证据。
3. 降低 Bing 因果表述。
4. 修正 Schema、FAQ rich result、2MB 和 Google-Extended。
5. 建立 Source Registry 与季度复核。

### 第三轮：可重复交付

1. 编写新建、诊断、授标的证据模板。
2. 建立固定提问集和观测数据字典。
3. 增加代理可用性与安全验收。
4. CI 只证明代码结果；外部平台和结果观测由独立证据包承担。

## 七、成熟度判断

| 维度 | 判断 |
|---|---|
| 方向和边界 | 成熟 |
| 技术覆盖 | 较成熟，需生态表更新 |
| 可执行性 | 中等，场景卡可用 |
| 可重复验收 | 不足 |
| 授标治理 | 不足 |
| 证据与复审 | 不足 |
| 对客风险控制 | 有良好基础，需补标识生命周期 |

**一句话结论：**下一版不应继续堆新技巧，而应优先补齐**唯一授标矩阵、证据包/有效期、官方来源登记表**。这三项完成后，它才适合作为可稳定授标的对客标准。

## 八、本次核对的官方来源

- [Google：生成式 AI 搜索优化指南](https://developers.google.com/search/docs/fundamentals/ai-optimization-guide)
- [Google：Search Console 生成式 AI 表现报告](https://developers.google.com/search/blog/2026/06/gen-ai-performance-reports)
- [Google：常见爬虫与 Google-Extended](https://developers.google.com/crawling/docs/crawlers-fetchers/google-common-crawlers)
- [Google：Googlebot 抓取的 2MB 字节边界](https://developers.google.com/search/blog/2026/03/crawler-blog-post)
- [Google：FAQ rich result 停止展示的更新记录](https://developers.google.com/search/updates)
- [OpenAI：Publishers and Developers FAQ](https://help.openai.com/en/articles/12627856-publishers-and-developers-faq)
- [Anthropic：ClaudeBot / Claude-SearchBot / Claude-User](https://support.claude.com/en/articles/8896518-does-anthropic-crawl-data-from-the-web-and-how-can-site-owners-block-the-crawler)
- [Perplexity：PerplexityBot / Perplexity-User](https://docs.perplexity.ai/docs/resources/perplexity-crawlers)
- [Cloudflare：managed robots.txt 与 Content Signals](https://developers.cloudflare.com/bots/additional-configurations/managed-robots-txt/)
- [Cloudflare：AI Crawl Control 与 Bot/WAF 优先级](https://developers.cloudflare.com/ai-crawl-control/configuration/ai-crawl-control-with-bots/)
- [IndexNow：协议文档](https://www.indexnow.org/documentation)

