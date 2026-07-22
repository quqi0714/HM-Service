# MaxHope 落款资产包 v2.1 问题反馈

**反馈日期：**2026-07-22  
**对象：**MaxHope落款资产包-v2.1-AI-Ready.zip  
**用途：**供品牌资产源修复，不要求客户项目自行改定稿 CSS。

## 结论

v2.1 当前确认了 **1 个资产包级别的功能缺陷**：在窄视口但仍支持 hover/键盘的环境中，悬浮名片会越出屏幕左侧，与 README 中“桌面悬停与键盘聚焦可完整显示名片”的验收承诺冲突。

建议以 **v2.1.1** 发布源代码级修复；如果同时改动了箭头、品牌锁定区或响应式视觉规范，则按品牌版本策略升为 v2.2。

## ISSUE-01：窄视口下键盘聚焦名片被左侧裁切

| 字段 | 内容 |
|---|---|
| 优先级 | P1 / High：阻断资产完整验收，但不影响普通纯触屏手机直接点击 |
| 影响面 | 窄桌面窗口、带键盘/触控板的平板、混合指针设备、高倍缩放、窄容器或 WebView |
| 触发条件 | 视口约 390px 宽，环境报告 hover:hover，用键盘聚焦落款链接 |
| 实际结果 | 306px 宽名片的计算位置约为 left:-110px、right:196px，左侧约 110px 离开视口 |
| 期望结果 | 名片完整位于视口安全边距内；键盘可访问；箭头仍指向 MaxHope 主品牌区 |

### 复现步骤

1. 打开资产包的 demo.html，或把 snippet.html 原样放入窄宽测试页。
2. 将视口设为 390 × 844，并保持浏览器具备 hover 能力。
3. 用 Tab 键聚焦 .mhk-credit，触发 .mhk:focus-within .mhk-card。
4. 读取 .mhk-card.getBoundingClientRect()，或直接观察名片左缘。
5. 名片越出视口左侧，内容无法完整阅读。

### 根因

snippet.html 的定位逻辑相当于：

    .mhk-card {
      position: absolute;
      bottom: calc(100% + 19px);
      right: 118px;
      width: 306px;
      max-width: min(306px, 88vw);
    }

    @media (hover: none) {
      .mhk-card { display: none; }
    }

max-width:88vw 只约束名片宽度，不限制水平坐标。固定 right:118px 在窄视口会把名片整体推向左侧。hover:none 只能保护纯触屏设备，不能覆盖窄屏且仍支持 hover/键盘的环境。

## 源头修复要求

品牌资产源需要增加“窄视口＋可 hover”的独立定位规则，同时保持现有视觉定稿。

### 必须保持

- 桌面宽视口中的 306px 名片宽度与现有布局。
- 页脚 AI-READY 宽 104px，名片内标识宽 96px。
- AI-READY 1000:304 比例、颜色、轨道光和文案不变。
- 名片箭头只指向 MaxHope，不指向 AI-READY。
- hover:none 的纯触屏设备不弹名片，整枚落款直接打开 MaxHope 官网。
- prefers-reduced-motion:reduce 下无持续动画。
- 44px 触控热区、可见键盘焦点、UTM 占位符和 mhk- 命名空间不变。

### 实现方向

可增加类似下列的窄视口分支。以下只是定位思路，不是品牌几何值的定稿：

    @media (max-width: 560px) and (hover: hover) {
      .mhk-card {
        right: auto;
        left: 0;
        max-width: min(306px, calc(100vw - 32px));
      }

      .mhk-card::after {
        right: auto;
        /* left 值由品牌线校准，确保箭头指向 MaxHope */
      }
    }

可以采用左对齐、保护边距或基于容器的坐标计算；关键是同时满足“不越界”和“箭头继续锁定 MaxHope”。

### 不接受的客户项目级补丁

- 不在每个客户网站里单独覆盖 .mhk-card。
- 不用 overflow:hidden 隐藏缺陷。
- 不在所有窄屏直接禁用键盘名片，这会降低可访问性。
- 不通过压缩 AI-READY 比例或字号来容纳名片。

## 回传前验收矩阵

| 项目 | 要求 |
|---|---|
| 视口宽度 | 320 / 390 / 768 / 1024 / 1280px |
| 输入能力 | hover:hover＋鼠标；纯键盘；hover:none；混合 coarse/fine pointer |
| 缩放 | 100% 与 200% |
| 页脚背景 | 浅色与深色 mhk--dark |
| 动效 | 默认与 prefers-reduced-motion:reduce |
| 边界 | 落款位于容器左端、中部、右端均测试 |

每个需要弹出名片的组合必须满足：

1. 名片外框 left 不小于 12px，right 不超过 viewport 减 12px。
2. document.scrollWidth 不大于 clientWidth，不产生水平滚动。
3. 键盘可从主落款进入名片 CTA，焦点可见，内容不被裁切。
4. 悬浮与聚焦两种触发都能完整显示。
5. 纯触屏测试中名片不出现，点击落款正常跳转。
6. 箭头在所有定位分支中都指向 MaxHope 锁定区。

## 资产包回传清单

- [ ] 更新后的 snippet.html。
- [ ] 同步更新的 demo.html，包含窄屏 hover/键盘测试区。
- [ ] README 验收清单增加窄视口与 200% 缩放。
- [ ] 版本号、日期、变更日志同步更新。
- [ ] 回传整个 ZIP，不只回传一段补丁 CSS。

