# Section 8 三期系列 SEO 方案

- 状态：发布前方案
- 制定日期：2026-07-13
- 目标：以三个不同搜索意图建立“Section 8 中文政策解读”内容集群，避免三篇争抢同一个关键词。

## 关键词与搜索意图分工

### 第一期：认识与资格

- 主要搜索词：`Section 8 申请条件`
- 次要搜索词：`什么是 Section 8 住房券`、`没有绿卡可以申请 Section 8 吗`、`外州可以申请 Section 8 吗`
- 搜索意图：用户正在了解计划，希望快速判断自己是否值得继续查询和申请。
- 内容边界：回答“是什么、谁能申请”，不详细展开流程和租金计算。

### 第二期：申请、等候与资格审核

- 主要搜索词：`Section 8 怎么申请`
- 次要搜索词：`Section 8 waiting list`、`Section 8 要等多久`、`Section 8 收入限制`、`Section 8 资产限制`
- 搜索意图：用户已经准备行动，需要了解步骤、等待时间和资格审核。
- 内容边界：集中解决“怎么办”，不重复第一期的基础定义。

### 第三期：租金、搬迁与住房选择

- 主要搜索词：`Section 8 租金怎么算`
- 次要搜索词：`Section 8 可以搬家吗`、`Section 8 Portability`、`Section 8 可以在哪些城市使用`、`Section 8 和 30% 收入公寓的区别`
- 搜索意图：用户在获券前后做实际住房决策，关心家庭预算、房源和未来搬迁弹性。
- 内容边界：集中解决“拿券后怎么用”，不重复完整申请流程。

## 内容层已完成

- 每篇只有一个清晰的 H1，主要搜索问题出现在标题、开头和相关 H2/H3 中。
- 每篇拥有不同的 SEO 标题、描述、英文 Slug 和搜索意图。
- 正文使用问答结构，可直接覆盖用户的长尾搜索问题。
- 全部问答结论严格以用户提供的原 Q&A 为基准，SEO 只影响标题、摘要、Slug 和页面结构，不改变回答方向。
- 每篇末尾加入与内容自然衔接的华美服务提示，承接“及时申请、多个项目一起申请”的原始建议。

## 发布前技术 SEO 必做项

1. 将 Blog 的 `Article` 结构化数据补全为更具体的 `BlogPosting`，加入准确的 `author`、`mainEntityOfPage`、`inLanguage`、`datePublished` 和 `dateModified`。
2. 保留现有 canonical、BreadcrumbList、独立 title/description、Open Graph 和动态 sitemap。
3. 为文章页加入 `max-image-preview:large`，允许 Google 在合适的搜索与 Discover 场景使用大图预览。
4. 修改 CMS 对正文链接的处理：可信的 HUD、USA.gov 和站内链接不应全部强制加 `nofollow`，仅保留必要的安全属性。
5. 封面按 1200×630 制作，使用与每篇内容相关的真实视觉，不使用通用网站 Logo 代替。
6. 封面文件名使用简短的英文描述，并为每张图填写与画面内容相符的中文 alt，不堆叠关键词。
7. 三期逐期发布时添加“上一期 / 下一期”和语义明确的站内链接；新一期上线后，回填旧文链接，避免指向尚未发布的 404 页面。
8. 发布后确认 sitemap 出现新 URL，canonical 与实际 URL 一致，并在 Google Search Console 中检查编入索引状态。

## 作者与可信度

住房补贴信息会影响家庭的重要决策，页面应显示真实、可核实的作者或审核者信息。

- 如果由梅老师审核，可在确认后使用“华美服务中心整理，梅老师审核”。
- 不会在未经确认的情况下虚构专业资历或把 AI 写成政策专家。
- 建议后续建立一个简短的作者/机构说明页，解释华美的服务经验、内容审核方法与联系方式。

## 发布后衡量

- 不以“已发布”作为 SEO 完成标准。
- 在 Search Console 持续观察展现量、搜索词、平均排名、点击率与编入索引状态。
- 根据真实搜索词补充读者仍然关心的问题，只有当政策或正文实质更新时才更新 `dateModified`。
- 排名无法保证；目标是提高可发现性、内容可信度和搜索结果点击率，再通过持续的内容集群与站内链接积累主题权威。

## 参考的 Google 官方规范

- [Google：Creating helpful, reliable, people-first content](https://developers.google.com/search/docs/fundamentals/creating-helpful-content)
- [Google：Article structured data](https://developers.google.com/search/docs/appearance/structured-data/article)
- [Google：Title links](https://developers.google.com/search/docs/appearance/title-link)
- [Google：Link best practices](https://developers.google.com/search/docs/crawling-indexing/links-crawlable)
- [Google：Image SEO best practices](https://developers.google.com/search/docs/appearance/google-images)
