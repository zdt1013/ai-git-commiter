---
artifact_contract: spec-unified-plan/v1
artifact_readiness: implementation-ready
product_contract_source: spec-brainstorm
execution: code
status: active
---

# 默认提示词模板选中稳定性修复 - Plan

## Goal Capsule

**目标：** 让内置默认提示词模板的"默认"身份由显式声明决定，而不是由 `readdir` 返回的文件名字典序偶然决定。新增任何内置模板都不得改变默认选中项和模板列表首项。

**产品权威：** 当前会话用户已确认范围。

**未决阻塞项：** 无阻塞。存在一项证据限制，见下文。

## Product Contract

### 问题

内置模板通过 `loadDefaultPrompts()` 用 `readdir` 遍历 `asserts/prompts/` 加载，数组顺序即文件名字典序。新增 `default-no-emoji.xml` 后它排在 `default.xml` 之前，导致：

- `getSelectedPrompt()` 的最后兜底 `return this._prompts[0]`（`src/ai/prompt.service.ts:337`）会返回无 Emoji 版本
- 「选择提示词」面板列表首项是无 Emoji 版本（`src/commands/prompt/base-prompt.command.ts:12` 直接沿用 `getPrompts()` 顺序），回车即误选

`'default'` 作为默认模板 id 以字符串字面量形式散落在 `src/ai/prompt.service.ts:69` 和 `:330`，没有单一权威声明。

### 需求

- **R1** 默认模板 id 提升为 `src/constants.ts` 中的单一权威常量，替换 `prompt.service.ts:69` 和 `:330` 的字面量。
- **R2** 移除 `getSelectedPrompt()` 的 `return this._prompts[0]` 盲兜底。兜底链变为：配置选中项 → 权威默认 id → 均取不到时记日志并给出用户可见错误提示。
- **R3** `loadDefaultPrompts()` 加载后强制排序：权威默认模板置顶，其余按名称排序。模板列表顺序不再依赖文件名。

### 验收示例

- **A1** 在 `asserts/prompts/` 新增一个文件名字典序排在 `default.xml` 之前的模板；`selectedPromptTemplateId` 为空时初始化，选中项仍是权威默认模板。
- **A2** 同上条件下，`getPrompts()` 首项仍是权威默认模板。
- **A3** `asserts/prompts/` 中权威默认模板缺失时，`getSelectedPrompt()` 不静默返回任意模板，而是记录日志并触发用户可见错误提示。

### 范围边界

**不做：**

- 不迁移或改写已受影响用户的 `selectedPromptTemplateId` 配置（用户确认：只防以后，不处理存量）
- 不改动 `default.xml` 与 `default-no-emoji.xml` 的内容或版本号
- 不重构提示词存储结构或 `downloadPrompts()` 的远程合并逻辑
- 不新增"内置模板必须注册"之类的额外校验机制

### 成功标准

- A1–A3 由单元测试覆盖（项目使用 vitest，参照 `test/unit/prompts/default-no-emoji.test.ts` 的加载器测试方式）
- `npx tsc --noEmit` 通过
- 现有测试全部通过

### 关键决策

- **K1 — 移除盲兜底而非仅排序。** 单靠排序只是把顺序巧合换成顺序约定，任何后续对 `_prompts[0]` 的依赖仍然脆弱。显式声明默认 id 才消除机制上的不确定性。排序作为补充，用于消除交互层的误选面。
- **K2 — 不处理存量用户配置。** 自动改写 `selectedPromptTemplateId` 会覆盖真实想用无 Emoji 版本的用户的选择。用户确认接受这一取舍。

### 显式假设与证据限制

- 写入 `selectedPromptTemplateId` 的两条代码路径已读全（`prompt.service.ts:71` 初始化写入、`select-prompt.command.ts:15` 用户手动选择），均不会写出 `default-no-emoji`，因此配置变化的确切触发点未定论。
- 探索期间 git 命令工具不可用，各发布 tag 之间 `src/ai/prompt.service.ts` 的差异未能核对。
- 本计划按"消除顺序依赖"设计，不依赖根因结论；上述限制不影响 R1–R3 的正确性。
- **失效条件：** 若后续发现存在第三条写入 `selectedPromptTemplateId` 的路径（例如某个版本的迁移逻辑），需重新评估是否还有独立缺陷。

### 本地化影响

R2 新增的用户可见错误提示须用 `vscode.l10n.t()` 包裹，并同步更新 `l10n/bundle.l10n.zh-cn.json`。

---

## Planning Contract

Product Contract unchanged (byte-preserved upstream source slice)

**推荐方案：** 在 `PROMPT_CONSTANTS` 下新增 `DEFAULT_PROMPT_ID` 权威常量，`loadDefaultPrompts()` 返回前按「权威默认置顶、其余按 name 升序」排序，`getSelectedPrompt()` 兜底链收敛为「配置选中项 → 权威默认 id → 抛错」。架构姿态为 **extend**：沿用现有单例服务与常量集中管理约定，不引入新抽象、新文件或新注册机制。

**决策焦点：** `getSelectedPrompt()` 契约从"永远有返回值"改为"取不到即抛错"，由三个既有调用方的 try/catch 承接。

**验证焦点：** 新增一个文件名字典序早于 `default.xml` 的临时内置模板，确认默认选中项与列表首项都不变。

**最大风险：** `getSelectedPrompt()` 抛错路径若有调用方未包裹 try/catch，会变成未捕获异常。已核对三处调用方均在 try/catch 内（见 KTD3）。

### Key Technical Decisions

- **KTD1 — 常量落在 `PROMPT_CONSTANTS.DEFAULT_PROMPT_ID`。** 该常量描述提示词领域概念，而非 VSCode 配置键路径，因此归入 `PROMPT_CONSTANTS`（`src/constants.ts:6`）而不是 `CONFIG_CONSTANTS.PROMPT`（后者全是 `prompt.xxx` 形式的配置路径字符串）。`PROMPT_CONSTANTS` 现有成员多为 l10n getter，新增一个纯字符串常量与 `COMMANDS` 段风格一致。

- **KTD2 — 排序只作用于内置模板。** 在 `loadDefaultPrompts()` 返回前排序，不动 `loadPrompts()` 里合并后的 `_prompts` 整体。理由：整体排序会打乱用户自定义模板与远程下载模板的既有相对顺序，超出问题范围。内置模板在 `loadPrompts()` 的两条分支里都先于其他来源进入数组，排好后自然占据列表前部，`getPrompts()` 首项即权威默认模板。（用户已确认）

- **KTD3 — `getSelectedPrompt()` 保持非可选返回类型，取不到即抛错。** 移除 `return this._prompts[0]` 后，若配置选中项与权威默认 id 都取不到，抛出带 l10n 文案的 `Error`。三处调用方 `src/commands/commit.command.ts:137`、`:210`、`src/commands/prompt/manual-polish.command.ts:55` 均已在 try/catch 中并走 `vscode.window.showErrorMessage`，因此错误可见性由既有链路承接。替代方案（改签名为 `PromptTemplate | undefined`）需改三处调用点并新增判空分支，diff 更大且收益相同。（用户已确认）

- **KTD4 — 不在 `initialize()` 阶段主动弹窗。** 权威默认模板缺失属于"不该发生"的打包异常。在扩展激活时弹窗会打扰所有用户；改为在实际调用 `getSelectedPrompt()` 时抛错，出错时机贴近使用场景。`initialize()` 侧仅在找不到权威默认模板时记 `Logger.error`。（用户已确认）

- **KTD5 — 排序比较用 `localeCompare`。** 内置模板 name 含中文（`默认提示词`、`默认提示词（无 Emoji）`），朴素 `<` 比较按 UTF-16 码点排序，结果对中文无意义但稳定。用 `localeCompare` 让顺序对用户可读。非默认内置模板当前只有一个，此决策是为将来新增模板时的顺序可预期性。

### Requirements 追溯

| 需求 | 实现单元 | 验收示例 |
| --- | --- | --- |
| R1 权威常量 | U1 | 由 A1/A2 间接覆盖 |
| R2 移除盲兜底 | U2 | A3 |
| R3 加载后排序 | U3 | A1、A2 |

---

## Implementation Units

### U1. 引入 `DEFAULT_PROMPT_ID` 权威常量

**Goal：** 消除 `'default'` 字符串字面量的散落，为 U2、U3 提供单一引用点。

**Requirements：** R1

**Dependencies：** 无

**Files：**
- `src/constants.ts`（修改：`PROMPT_CONSTANTS` 新增 `DEFAULT_PROMPT_ID: 'default'`）
- `src/ai/prompt.service.ts`（修改：`:69`、`:330` 两处字面量改为常量引用）

**Approach：** 常量加在 `PROMPT_CONSTANTS` 的 `COMMANDS` 段之后、`PROMPT_MANAGEMENT` 之前，位置上与其他纯字符串常量相邻。`prompt.service.ts` 已 import `PROMPT_CONSTANTS`，无需新增 import。

**Patterns to follow：** `PROMPT_CONSTANTS.COMMANDS` 的纯字符串常量写法（`src/constants.ts:8-18`）。

**Test scenarios：** `Test expectation: none -- 纯常量提取，无行为变化；由 U3 的测试间接覆盖常量值正确性。`

**Verification：** `npx tsc --noEmit` 通过；`src/` 下再无 `id === 'default'` 形式的字面量比较。

### U2. 收敛 `getSelectedPrompt()` 兜底链

**Goal：** 移除顺序依赖的盲兜底，让取不到默认模板的情况显式失败而非静默降级。

**Requirements：** R2

**Dependencies：** U1

**Files：**
- `src/ai/prompt.service.ts`（修改：`getSelectedPrompt()` 约 `:317-338`）
- `src/constants.ts`（修改：`PROMPT_CONSTANTS.PROMPT_MANAGEMENT.ERROR` 新增 `DEFAULT_MISSING` l10n getter）
- `l10n/bundle.l10n.zh-cn.json`（修改：新增对应中文翻译）
- `test/unit/prompts/default-prompt-selection.test.ts`（新建，与 U3 共用）

**Approach：** 兜底链三段：配置 `selectedPromptTemplateId` 命中 → `DEFAULT_PROMPT_ID` 命中 → 记 `Logger.error` 并 `throw new Error(...)`。错误文案走 `PROMPT_CONSTANTS.PROMPT_MANAGEMENT.ERROR.DEFAULT_MISSING`，用 `vscode.l10n.t()` 包裹（英文原文建议 `Default prompt template is missing. Please reinstall the extension`）。同时在 `initialize()` 的 `if (!selectedPromptId)` 分支补 else：找不到权威默认模板时记 `Logger.error`（KTD4，不弹窗）。

**Execution note：** 先写 A3 的失败测试（模板目录不含权威默认模板时应抛错），再改实现。当前代码会静默返回首个模板，测试应先红。

**Patterns to follow：** `PROMPT_CONSTANTS.PROMPT_MANAGEMENT.ERROR` 现有 getter 写法（`src/constants.ts:64-68`）；`Logger.error` 用法（`src/utils/logger.ts:32`）。

**Test scenarios：**
- 配置中 `selectedPromptTemplateId` 为某个存在的 id → 返回该模板。
- 配置为空字符串 → 返回 `DEFAULT_PROMPT_ID` 对应模板。
- 配置指向一个不存在的 id（如 `deleted-template`）→ 回落到 `DEFAULT_PROMPT_ID` 对应模板，不抛错。
- **Covers A3.** 模板目录不含 `default.xml` 但含其他模板 → 抛出 `Error`，且 `Logger.error` 被调用；不返回任意模板。
- 模板列表为空 → 抛出 `Error`，不返回 `undefined`、不抛 `TypeError`。

**Verification：** 上述场景全部通过；`getSelectedPrompt()` 返回类型仍为 `PromptTemplate`（非可选）；`src/ai/prompt.service.ts` 中再无 `this._prompts[0]`。

### U3. 内置模板加载后强制排序

**Goal：** 让模板列表顺序由显式规则决定，`getPrompts()` 首项稳定是权威默认模板。

**Requirements：** R3

**Dependencies：** U1

**Files：**
- `src/ai/prompt.service.ts`（修改：`loadDefaultPrompts()` 约 `:134-155`，return 前排序）
- `test/unit/prompts/default-prompt-selection.test.ts`（新建，与 U2 共用）

**Approach：** `return prompts` 前插入排序：权威默认模板（`id === DEFAULT_PROMPT_ID`）排第一，其余按 `name` 用 `localeCompare` 升序（KTD5）。排序作用域限于本方法返回值，不触碰 `loadPrompts()` 里的 `_prompts`（KTD2）。

**Patterns to follow：** 无既有排序代码可参照；保持与 `loadDefaultPrompts()` 现有 try/catch 结构一致，排序放在 try 内 `readdir` 循环之后。

**Test scenarios：**
- **Covers A2.** 用真实 `asserts/prompts/` 加载 → `getPrompts()` 首项 `id` 为 `default`（当前目录下 `default-no-emoji.xml` 字典序在前，此测试即回归保护）。
- **Covers A1、A2.** 临时目录内放三个模板（`aaa-first.xml`、`default.xml`、`zzz-last.xml`）→ 列表首项为 `default`，后两项按 name 的 `localeCompare` 顺序。
- 临时目录不含权威默认模板 → 不抛错，其余模板按 name 升序（排序本身要能容忍默认缺失，抛错由 U2 的 `getSelectedPrompt()` 负责）。
- **Covers A1.** `selectedPromptTemplateId` 为空时走 `initialize()` → 选中项写入的是 `default`，即便目录中有字典序更靠前的模板。

**Verification：** 上述场景全部通过；新增任意文件名的内置模板后，首项与默认选中项均不变。

---

## Verification Contract

按顺序执行：

1. `npx tsc --noEmit` — 类型检查通过（含 `getSelectedPrompt()` 返回类型未退化为可选）
2. `pnpm test` — vitest 全量通过，含既有 `test/unit/prompts/default-no-emoji.test.ts` 与新增测试
3. `pnpm run lint` — eslint 无新增告警
4. `npx vite build --mode development` — 构建通过（`simple-git` 的 `node:path` externalize 告警为已知问题，可忽略）
5. 人工检查 `l10n/bundle.l10n.zh-cn.json` — 新增键有对应中文翻译，JSON 合法

### 测试基建注意事项

- `PromptService` 是单例且 `getInstance()` 内部缓存 `_instance` 与 `_initializing`，同一进程内二次调用会拿到旧实例。测试需要多次以不同 `extensionPath` 初始化，必须在每个用例间重置静态字段（现有 `default-no-emoji.test.ts` 只初始化一次，未遇到此问题）。可用 vitest 的 `beforeEach` 配合对私有静态字段的显式重置。
- `test/__mocks__/vscode.ts` 的 `workspace.getConfiguration().get` 固定返回 `defaultValue`，即 `config.get<string>(...)` 恒为 `undefined`。测试要模拟"配置已选中某模板"必须扩展该 mock 或在用例内 stub。这是 U2 前三个测试场景的前置条件。
- `Logger` 未在测试中 `init()`，`channel` 为 `null`，`Logger.error` 只走 `console.log`。断言"记了日志"需 spy `console.log` 或 spy `Logger.error`。

---

## Definition of Done

- R1：`src/` 内无 `'default'` 作为默认模板 id 的字面量比较，全部引用 `PROMPT_CONSTANTS.DEFAULT_PROMPT_ID`
- R2：`getSelectedPrompt()` 无 `_prompts[0]` 兜底；默认模板缺失时抛错并记日志；错误文案已 l10n 且中文翻译已同步
- R3：`loadDefaultPrompts()` 返回值按「权威默认置顶、其余 name 升序」排序
- A1–A3 各有对应测试且通过
- Verification Contract 五步全部通过
- CHANGELOG.md 追加一条记录，格式遵循文件头约定，因属用户可感知的修复需带 `(user-visible)` 后缀

---

## Open Questions（延后到实现期）

- 单例重置的具体写法（直接改私有静态字段 vs 新增 `@internal` 重置方法）留给实现时按 vitest 实际报错情况决定。倾向前者以免为测试改动生产接口。
- `vscode` mock 中配置读取的扩展方式（改 mock 文件 vs 用例内 `vi.spyOn`）同样留给实现期。改 mock 文件会影响其他测试，需先确认无副作用。

---

## Sources & Research

- 本地代码勘察：`src/ai/prompt.service.ts`、`src/constants.ts`、`src/commands/prompt/*.ts`、`src/commands/commit.command.ts`、`test/__mocks__/vscode.ts`、`vitest.config.ts`
- origin：本文件 Product Contract 区域（`product_contract_source: spec-brainstorm`）
- 未做外部研究：问题完全由本仓库代码的顺序依赖导致，无需外部最佳实践输入
