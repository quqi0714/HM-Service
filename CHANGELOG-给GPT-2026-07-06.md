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

## 追加（2026-07-06 第五批,设计与文案二次打磨）

1. **阅读体验改造（用户两轮反馈）**：aftercare 段从"纯文字卡"→"图标+关键词着色"→最终定为**照片主导卡**（参考成熟商业站配方：16:10 场景照 + 标题 + 一行话）。双支柱卡改为照片底+渐变叠层。新组件类：`.svc-card--photo/.svc-photo/.svc-body/.pillar-photo-card`（vehicle 页内,hover 微缩放,reduced-motion 豁免）。
2. **图片供给机制**：6 张 AI 场景图由用户生成（规格清单另附:AI生图规格-汽车板块-2026-07-06.md）,代码按最终文件名引用 + `onerror` 自动降级站内占位图——图放入 `images/vehicle/` 即生效,无需改码。**部署时若 6 张图尚未就位,占位图兜底,不会破版。**
3. **文案口径第二次修正（红线）**：删除所有未经业务确认的具体服务承诺（"一个电话预约/按华美标准执行/价格提前讲清楚/回访/验收/不加项/全程负责"等）。全部文案统一为**"梅老师的专业 + 陪伴"**基调（行情熟、中文讲明白、有人商量、一路陪伴）。承诺段改为「买车用车，有梅老师陪着。」（专业熟路 / 中文讲明白 / 一路陪伴）。CMS 正文 strong 自动品牌色、列表符号金色（cms-core.js renderBaseCss 追加）。
4. 测试 71/71 通过。

## 追加（2026-07-07 第六批,MaxHope 工作室落款集成,按 v1.1 放置规范定稿）

按 MaxHope 落款资产包 **v1.1**(README 决策树为权威规范;v1.0 的"页脚底部独立行"放法违反其"禁止孤立漂浮"铁律,已拆除重放)集成"Site by MaxHope":
1. **逐页按决策树落位**:
   - vehicle/health(情形 A,底栏右端被邮箱占用)→ 落款放邮箱**左侧**,同行同基线,间距恰 24px;
   - index(情形 C,多层页脚含巨型 HUAMEI 装饰字)→ 与**免责声明行**同行右对齐,位于装饰字**之前**;
   - love-health(情形 B,左对齐版权行)→ 该行改两端对齐,© 左、落款右,位于 LOVE HEALTH 装饰字之前;
   - CMS `renderSiteFooter`(情形 C)→ 与免责声明同行两端对齐,覆盖 /apartments、/blog、详情、错误页。
2. 深色页脚(四静态页)用 `mhk--dark`,CMS 浅色页脚默认蓝标;`utm_source=huameihope`(域名派生)两处一致,无占位符/示例值残留。
3. 几何级验收(1440px 实测):同行 baseline 差 2–6px;右缘与页脚内容容器右缘差 0px;均在装饰层之前;无 >48px 孤立空白。
4. 未集成范围:cms-demo 内部工具页、selected/index-old(不随生产部署)。71/71 测试通过。

## 追加（2026-07-08 第七批,易用性/可读性大修:后台×9 + 客户侧×6 + health 照片卡）

**后台 admin(cms-demo/admin.html + admin.js + styles.css),全部本地实测通过:**
1. C1 按钮按内容状态收敛:新建/草稿态隐藏"下架";未保存内容隐藏"更多操作";**删除与"下架"语义重复的"下架归档"按钮**(remote 模式二者行为相同);"永久删除"折叠进「更多操作 ▾」弹出层(原有输入标题确认对话框保留)。
2. C2/C3 字段级校验:必填项(标题/编号/房型)标 \*;报错时字段红框 + 行内常显错误 + 滚动聚焦(toast 保留为辅助);输入即清除错误态。
3. C4 恢复「预览页面」按钮:草稿走 preview.html(localStorage 预览槽,不污染数据),正式后台已发布内容直开真实 /apartments/:id。**同步反转了两条锁死预览的测试断言**(cms-core.test.mjs,原为 doesNotMatch)。
4. C5 内容列表搜索框(标题/编号/城市即时过滤)。
5. C6 移动端:统计卡横排收紧、hero 说明隐藏、右下「＋新增公寓」悬浮按钮、操作按钮纵排全宽 ≥44px。
6. C7 更新已发布内容前确认("更新后会立即对客户可见")。
7. C9 富文本上方提示"粘贴会自动清理格式"。
8. **补齐缺失的「城市」输入字段**(此前后台无法填城市,而详情页/SEO 均依赖 city;建议填写,不强制——旧数据无城市)。

**客户侧(functions/_lib/cms-core.js):**
9. A1 移动端卡片右侧常显「›」(此前整卡可点但无视觉提示);A2 移动端事实 chips 去按钮感(纯文本+间隔点);A3 移动端信息字号统一 ≥14px;A5 排序说明并入计数行("共 N 条 · 最新在前 · 第 x/y 页")。
10. B1 详情页 chips 去「置顶」(运营概念不对客户暴露;列表卡保留);B2 移动端详情页正文内"咨询梅老师"隐藏(底部悬浮条已有,消除同屏重复);B3 详情页 kicker 行补 NEW 标。

**health.html(D2):**
11. 六张纯文字服务卡 → 照片卡(与汽车页同配方:16:10 图 + is-pending 占位 + hover 缩放;HHS 卡保留弹窗与 CTA);"完整健康服务页正在准备中"占位段 → 「家里长者的事,有梅老师陪着。」(专业+陪伴口径)。生图清单另附:AI生图规格-健康板块-2026-07-08.md(6 张,images/health/)。
12. 范围修正(诚实记录):原清单 D1(首页 services 段)经复核**本已是照片卡,无需改造**;love-health 影像节奏完好,未改动。

测试 71/71 通过;后台九项交互逐一实测(状态收敛/字段红框/搜索过滤/预览按钮)。

## 追加（2026-07-08 第八批,后台修正+专业换肤 / GA4 事件层 / 合规包）

1. **后台"设为置顶"双控件修复(用户指出)**:表单本有"列表置顶"复选框,操作区又有"设为置顶"按钮——删除按钮及 togglePinned 全链路,置顶只走表单复选框;相应测试断言已更新(cms-core.test.mjs:isPinned 存在、togglePin 不得存在)。
2. **后台专业主题(admin-theme)**:admin.html 与 published-apartments.html 的 body 挂 `admin-theme` 类,styles.css 追加 scoped 主题层——深藏青顶栏(#16202e)、灰白工作区(#eef1f5)、蓝色主操作(#2f6fed)、红描边危险键;字体 Inter 优先。**与官网暖纸色系完全区分**,demo 客户样页与 preview.html 不受影响(保持官网观感)。
3. **GA4 事件层(全站)**:四个静态页 + CMS 渲染页统一注入委托式事件脚本(同一 G-B1ZL92HNR6):`contact_click`(#contact 链接)、`call_click`(tel:)、`wechat_copy`(index 复制微信号,含再次复制)、`apartment_card_click`(列表卡,带编号)、`apartment_list_click`(清单入口)、`apply_link_click`(详情外部申请链)。均有 `typeof gtag` 守卫,不依赖 GA 加载成功。
4. **合规包**:
   - 新增 `privacy.html`(隐私政策:收集范围、GA4/Cookie 披露、不出售声明、CCPA/CPRA 权利与行使渠道、保留与安全、联系方式;生效日 2026-07-08)与 `terms.html`(服务条款:独立第三方性质、信息以官方为准、不保证申请结果、用户义务、费用、责任限制、加州法适用)。两页均带完整 GA、canonical、站点风格 header/footer 与 MaxHope 落款(v1.1 规范:与 © 行同行)。
   - 全站页脚(4 静态页 + CMS renderSiteFooter)加"隐私政策 · 服务条款"链接;sitemap 静态清单收编两页;build PUBLIC_ROOT_FILES 收编两文件(dist 已验证包含)。
   - **提请注意**:两份法律文本为按业务实情起草的初稿,正式上线前建议由法律顾问复核一遍。
5. 测试 71/71;四页+两新页 HTML 解析通过;admin 新主题实际渲染核验(截图确认与官网视觉区分)。

## 追加（2026-07-08 第九批,公寓清单首页一等入口）

**背景(用户定调)**:公寓清单是全站最重要功能之一,此前移动端首屏不可见(藏在汉堡菜单与 housing 段深处)。

1. **Hero CTA 位**:次按钮「了解我们的服务(锚 #practices)」→ **「查看公寓清单 →」**(新样式 btn-gold-light:金描边+淡金底,与主按钮"免费咨询梅老师"并列且视觉可区分;带 data-apartment-list-link 本地预览切换)。
2. **移动端顶栏常显胶囊**:汉堡按钮左侧新增 sage 底「公寓清单」胶囊(nav-quick-apts),**不展开菜单即第一眼可见可点**;滚动后随 nav.scrolled 换 forest 配色。仅 <768px 显示(默认 display:none + max-width 媒体查询,规避了与 Tailwind md:hidden 的优先级冲突——首版曾在桌面漏显,已修)。
3. GA:两个新入口均命中既有 `apartment_list_click` 事件(线上 href=/apartments)。
4. 测试 71/71;本地预览切换验证通过(本地自动指向 cms-demo 演示页)。

---

## 终版定稿（2026-07-13）· 部署前必读

本包为以上九批改动的**定版交付包**,业主已完成局域网真机预览验收。

### 本版新入包的资产

- **健康板块 6 张实景配图**(`images/health/hlth-{hhs,ihss,medicare,medical,eligibility,wellness}.webp`):全部 1600×1000 webp、单张 ≤150KB,已逐张验证可解码、页面正常显示。health.html 六卡自动从"实景图更新中"占位态切换为真图,**代码零改动**。
- 汽车板块 12 张配图(`images/vehicle/`)沿用上批,均在包内。

### 本地已验证的内容

- `npm test` 71/71 通过;`npm run build` 通过,dist 产物核验:privacy/terms 已入、cms-demo 三个演示样页(apartments/blog/detail.html)确认**不在** dist、两板块图片目录完整。
- 四静态页 + CMS 渲染页在 375 / 768 / 1440 三档视口逐页人工过检;业主手机+电脑真机预览通过。

### ⚠️ 三处本地无法验证、部署后请顺手核实

1. **后台「预览页面」按钮的远程模式**:demo 模式(本地 preview.html 通路)已实测;但真 D1 + Cloudflare Access 下"已发布内容 → 新窗口打开线上详情页"(buildRemoteEntryUrl 分支)只做了代码走查。部署后在真后台点一次即可确认。
2. **Cloudflare Pages 构建**:本地 node 构建通过,但本包未在 CF 构建环境跑过。配置未动(wrangler.toml / pages_build_output_dir=dist),预期无事,构建日志扫一眼即可。
3. **GA4 事件层实发**:事件脚本已注入全站(第八批),代码有 `typeof gtag` 守卫;但**事件是否真正发出未在真实浏览器观测过**。部署后开 GA4 DebugView(或实时报告),点一遍:首页微信按钮(`wechat_copy`)、tel 链接(`call_click`)、公寓清单入口(`apartment_list_click`)、列表卡(`apartment_card_click`)——四个都到即整层正常。

### 追加修正(2026-07-13,业主真机预览中发现)

- **照片卡占位逻辑加固(health.html ×6 / vehicle.html ×12,共 18 处 onerror)**:原写法一次加载失败即永久盖"实景图更新中"占位并移除 img,导致弱网/并发下偶发单张图随机缺失(本地预览已实测复现;上线后手机弱网同样会踩)。改为**失败后 500ms 带缓存穿透参数重试一次,再失败才盖章**——真缺图(连续两次 404)仍正常显示占位态,网络闪失则自愈。18 处内联脚本语法解析与状态机行为已验,测试 71/71。

### 其他事项

- **法务复核**:privacy.html / terms.html(生效日 2026-07-08)为按业务实情起草的初稿,上线不阻塞,但请业主安排法律顾问复核(第八批已提)。
- **测试锁位翻转**:cms-core.test.mjs 中两处旧断言为配合功能变更**故意**翻转——预览按钮由"不得存在"改"必须存在"(第七批 C4),togglePin 由"必须存在"改"不得存在"(第八批)。非回归,勿改回。
- **包内不含**:`dist/`(请部署侧重新构建)、`preview-*.html`(本地演示物)、node_modules(项目无运行时依赖)。
- **部署流程不变**:`npm test` → `npm run build` → 发布 dist/ + 根目录 functions/。回滚 = 重发上一版包。
