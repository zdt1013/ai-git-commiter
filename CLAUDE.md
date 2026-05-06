# AI Git Commiter

VSCode 插件，使用 AI 大模型根据 git diff 自动生成规范的 Commit 消息。

## 项目结构

```
src/
├── extension.ts              # 插件入口（activate/deactivate）
├── config.ts                 # 配置服务（单例，监听 VSCode 设置变更）
├── constants.ts              # 所有常量定义
├── git.ts                    # Git 操作封装（diff、仓库识别、变更统计）
├── ai/
│   ├── ai-service.interface.ts  # AI 服务接口定义
│   ├── ai-service.factory.ts    # AI 服务工厂（按 provider 分发）
│   ├── openai.ts                # OpenAI 及兼容服务商
│   ├── gemini.ts                # Google Gemini
│   ├── anthropic.ts             # Anthropic 及兼容服务商（智谱等）
│   └── prompt.service.ts        # 提示词模板管理（CRUD、远程下载、XML 解析）
├── commands/
│   ├── command.registry.ts      # 命令注册中心
│   ├── commit.command.ts        # 核心：生成 commit 消息
│   ├── switch-model.command.ts  # 切换 AI 模型
│   ├── open-settings.command.ts # 打开设置页
│   └── prompt/
│       ├── base-prompt.command.ts    # 提示词命令基类
│       ├── add-prompt.command.ts     # 添加模板
│       ├── edit-prompt.command.ts    # 编辑模板（XML 文件编辑）
│       ├── delete-prompt.command.ts  # 删除模板
│       ├── select-prompt.command.ts  # 选择使用模板
│       ├── download-prompt.command.ts # 下载远程模板
│       └── manual-polish.command.ts  # 手动润色
├── types/
│   ├── config.ts, model.ts, prompt.ts, types.ts  # 类型定义
│   └── git.d.ts               # VSCode Git API 类型声明
└── utils/
    ├── logger.ts              # 输出频道日志
    └── text-utils.ts          # 文本处理（base64 过滤、代码块清理）
```

## 技术栈

- TypeScript + VSCode Extension API
- 构建：Vite（输出 CJS，target node20）
- 依赖：openai、@google/genai、@anthropic-ai/sdk、simple-git、xml2js、axios
- 引擎要求：VSCode >= 1.75，Node >= 20

## 常用命令

```bash
# 安装依赖
npm install

# 类型检查
npx tsc --noEmit

# 开发构建
npx vite build --mode development

# 生产构建
npx vite build --mode production

# 打包 VSIX（需要 vsce）
npx vite build --mode production && npx vsce package --no-dependencies
```

## 架构要点

### AI 服务层
- `IAIService` 接口定义了 `generateCommitMessage` 和 `polishCommitMessage`，均返回 `AsyncGenerator<string>`（流式输出）
- 三个实现类（OpenAI/Gemini/Anthropic）都是单例，通过 `AIServiceFactory` 获取
- 配置变更时通过 `AIServiceFactory.resetInstance()` 重置

### 提示词系统
- 模板存储在 `asserts/prompts/*.xml`（内置）和 `globalStorage/prompts.json`（用户数据）
- XML 格式，prompt 内容用 `<![CDATA[]]>` 包裹
- 占位符：`{diff}`（代码变更）、`{language}`（输出语言）

### 配置体系
- 所有配置项在 `package.json` 的 `contributes.configuration` 中声明
- `ConfigService`（单例）负责读取配置和监听变更
- 常量路径集中在 `constants.ts` 的 `CONFIG_CONSTANTS` 中

## 编码规范

- 单例模式：服务类使用 `static getInstance()` + 私有构造函数
- 命令模式：每个命令继承 `BasePromptCommand` 或独立类，在 `CommandRegistry` 中注册
- 日志：使用 `Logger` 类输出到 VSCode Output Channel，不要用 `console.log`
- 错误处理：catch 后通过 `vscode.window.showErrorMessage` 提示用户
- 新增 AI provider：实现 `IAIService` 接口，在 `AIServiceFactory` 中添加分支，在 `package.json` 中添加配置项

## 注意事项

- Vite 构建已有 `simple-git` 的兼容性问题（node:path externalize），这是已知问题
- `@anthropic-ai/sdk` 和 `openai` 的 `ClientOptions` 类型在当前版本有已知类型错误，不影响运行
- 编辑模板时临时文件存在 `globalStorage/.tmp/`，扩展激活时自动清理残留
- package.json 中的 版本号不需要手动维护，每次打包后会自动更新
