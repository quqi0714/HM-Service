# 移动优先·稳妥版升级 — 交接说明（给部署方）

日期：2026-07-06
执行方：Claude（按用户勾选的「移动优先·稳妥版」套餐）
基线：`Huamei-third-party-AI-challenge-2026-07-05.zip`
验证：**73/73 测试通过**；四页 HTML 解析通过；375 / 768 / 1440 三档实际渲染核查；全页面无水平溢出；`npm run build` 产物核验通过。

## 一句话总结

CMS 页面视觉归队主站暖纸色系 + 徽章语义系统重建（基于截止日的派生状态）+ 移动端七项专项修复（子页此前在手机上没有任何导航，已补）+ 克制的动效层（呼吸点/倒计时/NEW/入场 stagger，全部带 reduced-motion 豁免与无 JS 兜底）。**未触碰：鉴权、API、D1 迁移、净化器、admin 后台。**

## 改动文件（共 7 个）

| 文件 | 改动 |
|---|---|
| `functions/_lib/cms-core.js` | 本次改动核心，见下文明细 |
| `functions/_lib/cms-production.test.mjs` | 断言跟随新标记；渲染测试改传固定 `now`（根治随日期漂移）；新增 3 个测试（computeDaysLeft / isNewEntry / 已截止章无呼吸点） |
| `index.html` | 导航补「申请攻略」（桌面+移动菜单+本地预览切换脚本）；升级样式块 `#hm-upgrade-0705`；披风卡/横幅 reveal 变体类；计算器结果卡 rc-pop 触发；跑马灯触摸暂停 |
| `vehicle.html` | 桌面导航补公寓清单/申请攻略 + is-current；**新增移动端横滚子导航**（此前手机无任何菜单）；升级样式块 |
| `health.html` | 同 vehicle |
| `love-health.html` | 保留其独立锚点导航（活动落地页的有意设计），仅新增移动端子导航 + 升级样式块 |
| `.gitignore` | 重建（原 zip 未包含 dotfile，导致 build 测试基线失败）；含 `dist/`、`.wrangler/` |

## cms-core.js 明细（按清单编号）

- **T1 暖纸归队**：`renderBaseCss` 末尾追加覆盖层（`/* HM 主站视觉归队 */` 注释起），:root token 重定向到主站色（--forest #3A2E26 / --bone #F2EAD8 / --gold 等），蓝灰 rgba 边框/阴影全部转暖。**原有 CSS 行未动，全部靠后置覆盖**，可整块删除回滚。
- **T2+C-M2+C-M3 徽章语义系统（重要设计决策）**：`applicationStatus` 字段已在 07-05 版被有意退役（admin 隐藏字段、normalize 置空），因此"状态"改为**截止日派生**——新函数 `computeDaysLeft`（UTC 日历日）+ `renderDeadlineChip`：
  - 有截止且 >0 天 → 「开放申请 · 剩 N 天」实心章 + 呼吸点（sage；≤14 天 gold；≤3 天 rose）
  - 0 天 → 「今天截止」rose + 呼吸点
  - 已过 → 「已截止」灰实心、**无呼吸点**（动 = 可申请的语义）
  - 无截止日 → 不显示状态章（不编造）
  - 事实面板"申请截止"行同步加「剩 N 天」小注（`renderDeadlineSuffix`）
- **T3 信息去重**：桌面卡 = facts 三列 + 状态/置顶/标签 chips（不再重复地区/年龄/房型）；移动卡 = facts 隐藏，由 `chip--m` 事实 chips 补位（营销标签移动端隐藏，可见 chips ≤5）。缩略图改为随卡片高度伸展（修掉下方留白）。
- **T4** `renderSiteHeader(siteName, activeNav)`：当前页金色下划线 + `aria-current`；desktop CTA 胶囊（T7，移动端隐藏）。
- **T5/T6**：标题 `text-wrap:balance`；计数/日期/编号/事实值/分页 `tabular-nums`。
- **C-M4** `isNewEntry`（发布 <7 天）→ 卡片 NEW 金标，blur 入场一次。
- **C-M1** 卡片入场 stagger：**纯 CSS animation（非观察器）**，基态 opacity:1，JS 失效也绝不空白；前 6 张阶梯延迟。
- **MB1 筛选折叠**：面板重构为 `.filter-primary`（搜索+地区+按钮）+ `<details class="filter-more" open>`（年龄/房型 chips）。服务端始终渲染 `open`；随附小脚本仅在窄屏且无已选项时收起——**无 JS 的移动端 = 展开态，功能零损失**。桌面 summary 隐藏、强制展开。摘要文案带已选计数。
- **MB2** 详情页移动端底部悬浮条（咨询梅老师 + 拨打电话），`env(safe-area-inset-bottom)` 适配 iOS；body.has-contact-bar 给页脚留位（未用 :has()，兼容老安卓）。
- **MB3** 结果区 `id="list"`；表单 action、筛选 chips、分页链接均带 `#list` 锚 + `scroll-margin-top`；分页补 `rel="prev/next"`。
- **MB4** ≤760px：筛选 chips / 分页 / 表单控件 / summary 最小命中 44px。
- **渲染 API**：`renderListPage/renderEntryPage/renderChips/renderApartmentFacts` 新增可选 `options.now`（测试确定性）；不传时用当前时间,对现有调用方零影响。
- **reduced-motion**：追加块末尾统一豁免（stagger/呼吸点/NEW/过渡全关）。

## 静态四页明细

- **A-M1**：`.reveal-scale`（5 张 pillar 卡）与 `.reveal-clip`（2 处装饰横幅）变体；其余 reveal 不变。
- **A-M2 保险丝**：`.reveal:not(.visible)` 在 2.8s 后由纯 CSS 动画强制显现——观察器失效/快速跳读/JS 被拦截时**永不整段空白**。
- **prefers-reduced-motion**：四页此前出现次数为 0,现全站豁免（跑马灯/reveal/hero 逐行/呼吸圆点/滚动指示）。
- **H3**：计算器结果卡 rc-pop 入场（重复计算可重触发）。数字动画 animateValue 为原有代码未改。
- **跑马灯**：原本已是真文字跑马 + hover 暂停；补了**触摸暂停**（按住停、松开走）。
- **MB4**：移动菜单项与微信弹窗按钮 ≥44px。

## 清单里"已存在、无需改"的项（诚实对账）

- H1 城市跑马灯（07-05 版已是真跑马，webp 只是背景照）→ 只补触摸暂停/reduced-motion
- A-M5 CountUp 缓动（已有 easeOutQuart）→ 只补 tabular-nums
- A-M7 FAQ 动画（已有 max-height 过渡，实现良好）→ 未动
- MB5 移动菜单动效（已有 max-height+模糊过渡）→ 未动
- MB6 海报比例保护（已有 max-height+contain+portrait 上限）→ 验证通过，未动
- E1 三张大图剔除（build 清单已不含且测试列为禁止项）→ 无需改

## 部署注意

1. **无新增文件依赖**：动效全部内联（CSS/JS），无新 js/ 目录,build 脚本无需改动。
2. 部署流程不变：`npm test`（73 项）→ `npm run build` → 发布 `dist/` + 根目录 `functions/`。
3. 时区说明：倒计时按 UTC 日历日计算，页面缓存 max-age=120,日级精度足够；如要严格洛杉矶时区可后续在 `computeDaysLeft` 注入 offset。
4. 回滚方法：cms-core.js 的视觉层集中在 renderBaseCss 追加块（一段删除即回滚）；四个静态页各自的 `#hm-upgrade-0705` style 块同理;标记类改动分散在上述函数,建议整文件回滚。

## 建议真机复核清单（预览环境）

- [ ] iPhone Safari：详情页底部悬浮条不遮页脚、安全区正常；筛选默认收起、点开流畅
- [ ] 系统开启"减弱动态效果"后：跑马灯静止、无呼吸点、内容全部直接可见
- [ ] 子页（vehicle/health）手机端横滚导航可用,可到达公寓清单
- [ ] 列表翻页后落点在列表顶部而非页首
- [ ] 首页计算器结果卡入场动画 + 数字滚动（桌面预览器后台标签会冻结 rAF,请前台真机验证）
- [ ] 快速 PageDown 跳读首页：2.8 秒内所有段落显现（保险丝生效）

## 追加（2026-07-06 第二批,用户实测反馈后）

1. **`cms-demo/apartments.html`、`blog.html`、`detail.html` 不再随生产部署**（`scripts/build-deploy.mjs` 的 CMS_DEMO_FILES 已移除,build 测试新增缺席断言）。这三个是本地演示用的"客户样"页面,带"后台 Demo"入口和演示文案,不应暴露给客户;正式客户页是 `/apartments`、`/blog`、`/apartments/:id`。仓库中文件保留,供本地演示后台工作流。
2. **保留的后台页（admin / preview / published-apartments）导航统一指向正式页** `/apartments`、`/blog`;本地演示模式下由各自 JS 自动回退到 demo 文件（`applyLocalNavFallback` / public.js 顶部回退）。published-apartments 的"公开页"按钮在正式后台模式下改用 `buildRemoteEntryUrl`（真实 `/apartments/:id`）。
3. **移动端筛选"更多条件"改为始终默认折叠**（原为"有已选项时保持展开"）;摘要文案显示"已选 N 项",信息不丢失;无 JS 时仍安全展开。
4. 测试 73/73 通过;`npm run build` 后 dist/cms-demo 仅含后台所需 10 个文件。

## 追加（2026-07-06 第三批,业务反馈：截止日/租金/收入字段不符合实际）

**业务背景（用户确认）**：绝大多数公寓没有明确申请截止日，"满了即止"，团队需电话核实；租金/收入限制常为无法结构化的区间或缺失。

1. **拆除截止日倒计时/派生状态系统**：`computeDaysLeft`、`renderDeadlineChip`、`renderDeadlineSuffix` 及对应 CSS（chip--deadline / chip-dot / deadline-note / hm-breathe）全部移除；相关测试删除。`applicationDeadline / rentRange / incomeLimit` 三个字段在 D1 与数据层保留（后台表单本就未暴露），若未来对个别抽签项目恢复展示，成本很低。
2. **详情页事实面板只保留普遍存在的字段**：城市 / 地区 / 年龄要求 / 房型。租金、收入限制改由正文文案表达（员工在富文本里写）。
3. **NEW 标记保留**（基于 publishedAt,数据真实）。
4. **全站 SEO 优化（核心词：加州低收入公寓清单）**：
   - 列表页 H1 改「加州低收入公寓清单」，`<title>`「加州低收入公寓清单 · 老人公寓与可负担住房持续更新」，描述含 洛杉矶/尔湾/旧金山/60+ 城市 等词;Blog 列表同理（低收入住房申请攻略）。
   - 列表页新增 CollectionPage + ItemList JSON-LD；列表页 og:image 补品牌分享图（/images/og-share.jpg，需确认该文件在 images 目录存在）。
   - 详情页新增 BreadcrumbList JSON-LD（首页 → 加州低收入公寓清单 → 标题）。
   - 公寓详情无自定义摘要时，meta description 自动生成「{城市} 加州低收入公寓：{标题}。年龄…房型…」。
   - 首页住房板块 CTA 锚文本改「查看加州低收入公寓清单」（内链关键词）。
   - 未做 FAQPage 结构化数据：Google 已于 2023 年基本停用普通站点的 FAQ 富摘要，投入产出不成立。
5. 测试更新后 **71/71 通过**（删除 2 个截止日专项测试；列表/详情测试改为断言核心词、ItemList、面包屑、以及"申请截止/租金范围/收入限制/倒计时不再出现"）。

## 追加（2026-07-06 第四批,业务升级：汽车板块 买车+用车 双支柱）

**业务背景**：汽车板块从"购车补贴单点"扩展为双支柱——买车（政府补贴申请是重头戏 + 选车行/办手续）与用车（保险、贴膜、保养、维修）。
**对客口径（重要）**：全部以"华美自己的服务"表述（华美安排 / 标准我们定 / 全程负责），**不得出现**"筛选商家 / 合作商家 / 对接 / 推荐 / 转介"等第三方措辞——商家网络是内部运营机制，不进入客户可见文案与结构化数据。保险相关文案使用"协助/跟进"口吻，未宣称承保资质。

改动明细：
1. **vehicle.html**：
   - Hero：「02 / Vehicle · 汽车服务」；副标题「买车省到位，用车有人管 — 从政府补贴到保险保养，华美全程把关。」
   - 新增「双支柱总览」两张导航卡（买车 → #programs / 用车 → #aftercare）。
   - 补贴六卡与 EV 深挖段原样保留；programs 段 eyebrow 改「— Buy · 政府补贴项目」。
   - 新增 `#aftercare` 用车服务段：汽车保险 / 贴膜·漆面保护 / 常规保养 / 维修·事故协助 四卡 + 「更多用车服务陆续上线；具体项目与价格以咨询时确认为准」+ CTA。
   - 页尾 coming-soon 占位段 → 「买车用车，一个华美，全程负责。」承诺段（统一标准 / 价格透明 / 全程负责）。
   - SEO：title「汽车服务 · 购车补贴与用车保障」；description 更新；新增 Service JSON-LD「华美用车服务」（OfferCatalog 四项）；#programs/#aftercare 加 scroll-margin。
2. **全站导航**「购车补贴」→「汽车服务」（index 桌面+移动、vehicle/health 桌面+子导航、love-health 页脚、CMS renderSiteHeader）。vehicle 页 title 保留"购车补贴"关键词（SEO）。
3. **首页车辆披风卡**（大卡+mini 卡）改为双支柱、自营口吻。
4. 验证：71/71 测试；四页解析；4 块 JSON-LD 合法；1440/375 双档 DOM 几何验证；A-M2 防白屏保险丝实测生效。
5. **注意：本批次后进入打磨期，zip 按用户"定版"指令再统一生成**——请以最终交付的 zip 为准，勿使用中间版本。
