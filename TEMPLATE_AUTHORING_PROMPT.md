# Mood Space（浪漫空间）模板制作 — AI / 开发者提示词（2026 版）

将以下全文作为系统提示词或需求说明，用于生成**可上架到 Mood Space 前端建造机**的单页模板包。

---

## 一、产品定位

- **品牌**：Mood Space / 浪漫空间 — 用户通过建造机填写表单，一键生成可分享的浪漫主题单页（纪念、告白、旅行地图、胶片墙等）。
- **用户画像**：几乎不懂代码；害怕「JSON、HEX、变量名」等技术词汇。
- **你的目标**：产出 **视觉高级、移动优先、零外部 JS 框架** 的模板；配置层（`config.json`）必须让**非技术用户**在建造机里只看懂中文标签与可选配色，而不是技术实现细节。

---

## 二、交付物结构（每个模板一个目录）

```
{template_name}/          # 仅小写 + 下划线，与 config.name 一致
  index.html              # 单页主体（含内联或同目录 style.css 引用规则见下）
  config.json             # 元数据与字段定义
  （可选）style.css       # 若无则全部样式写入 index.html 的 <style>
```

- **禁止**引入 React / Vue / jQuery / Tailwind CDN 等外部 JS/CSS 框架。
- **允许**：原生 JS（少量）、CSS 动画、`@keyframes`、CSS 变量、`backdrop-filter` 毛玻璃。
- **必须**包含 viewport meta，禁止用户随意缩放导致布局崩坏（可与现网 `index.html` 策略一致）。

---

## 三、`index.html` 内容规范

1. **占位符语法**：仅使用 `{{field_id}}`（与 `config.json` 里 `fields[].id` 一致）。不要在用户可见文案中暴露 `field_id` 本身。
2. **移动优先**：窄屏可读可点；桌面为增强布局。触控区域足够大。
3. **视觉**：浪漫、克制的高级感；推荐毛玻璃、柔和渐变、微动效；避免廉价素材堆叠。
4. **图片**：
   - 需要用户换图时，使用**图床 HTTPS URL** 或建造机支持的占位逻辑；不要在文档里要求用户理解 `src` / `url` 术语，字段 `label` 写「背景图」「封面图」即可。
5. **列表 / 结构化数据**（如多城市、多胶片格）：
   - **优先**：拆成多个简单字段（城市 1 名称、日期、一句话…），让用户逐项填写。
   - **若必须一条结构化数据**：在 `config.json` 里 `type` 使用 `json` 或 `textarea`，`label` **不要**出现「JSON」字样，写「地点与故事（按示例修改）」；在 `placeholder` 或说明里给**一整段可复制改写的示例**，不要让用户理解数组语法。
6. **配色**：
   - **禁止**在 `label` 里写「HEX」「色值」「#RRGGBB」等字眼。
   - 每个颜色字段使用独立 `id`（建议命名语义化：`color_primary`、`color_accent`、`color_surface` 等），`type` 设为 **`color`**（或建造机可识别的主色/辅色关键词）；建造机会提供**全站通用配色预设** + 取色板；模板内用 `{{color_primary}}` 注入到 `style` 或内联样式中（如 CSS 变量：`--ms-primary: {{color_primary}};`）。
   - 同一模板颜色字段数量建议 **≤ 5 个**，并与预设的「按顺序填入」规则兼容（通常前 3 个映射主色、辅色、背景/中性色）。

---

## 四、`config.json` 规范

```json
{
  "name": "city_trace_map",
  "title": "城市轨迹地图",
  "fields": [
    { "id": "couple_names", "label": "你们的称呼", "type": "text", "default": "你 & TA", "placeholder": "例如：小明 & 小红" },
    { "id": "color_primary", "label": "主强调色", "type": "color", "default": "#67e8c6" },
    { "id": "color_secondary", "label": "辅助色", "type": "color", "default": "#60a5fa" },
    { "id": "color_neutral", "label": "浅色背景", "type": "color", "default": "#f3f4f6" }
  ]
}
```

- **`name`**：小写 + 下划线，与目录名一致。  
- **`title`**：中文展示名（大厅/建造机列表）。  
- **`fields`**：
  - `id`：小写 + 下划线，**仅英文**，用于 `{{id}}`；**不要在 label 中重复 id**。
  - `label`：**仅用户可见的中文**（可极少量必要英文品牌名），避免 JSON/HEX/API 等技术词。
  - `type`：`text` | `textarea` | `color` | `json`（`json` 慎用，见上）。
  - `default` / `placeholder`：给足示例，降低空白页概率。

---

## 五、与 Mood Space 建造机 / 后端的兼容要点

1. 模板会被套上 **`<base href="https://www.{域名}/assets/{name}/">` 用于静态资源**；外链图片需 **HTTPS**；勿依赖会拦截 iframe 预览的响应头。
2. 动态文案由建造机替换 `{{}}`；勿在模板里写死与某用户绑定的隐私数据。
3. 若需「制作同款」推广条，遵循现网约定（由发布数据控制，不在此提示词展开）。
4. **不要在模板内做「发布」按钮跳转到外站**；发布与额度流程由 **Mood Space 应用壳**（建造机底部操作栏、发布 Tab、额度弹窗）统一处理。模板内 CTA 仅限「滚动到表单区」「打开某 overlay」等页内交互。

---

## 六、自检清单（提交前）

- [ ] 手机竖屏首屏是否惊艳、信息是否可读？  
- [ ] 是否**零**外部 JS 框架？  
- [ ] 所有用户可见文案是否**无 JSON/HEX/字段 id**？  
- [ ] 颜色字段是否为 `type: "color"` 且 label  plain 中文？  
- [ ] 结构化数据是否已尽量拆字段；不得已用 `json` 时 label 是否友好并带示例？  
- [ ] `{{变量}}` 是否均能在 `config.json` 找到对应 `id`？  
- [ ] 目录名、`name`、占位符 id 是否**全部小写+下划线**一致？

---

## 七、设计关键词（可选参考）

毛玻璃、星轨、胶片、地图轨迹、手写信、霓虹、极简留白、深色夜空、柔和粉紫渐变 — 根据模板主题择一主线，保持**统一**与**高级**，避免元素杂糅。

---

*本文件与 Mood Space-Frontend 建造机行为对齐；若后端字段类型扩展，以仓库内 `Builder.jsx` 与 API 为准更新本节。*
