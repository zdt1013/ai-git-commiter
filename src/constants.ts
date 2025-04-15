/**
 * 提示词管理相关常量
 */
export const PROMPT_CONSTANTS = {
    // 命令ID
    COMMANDS: {
        ADD_PROMPT: 'ai-git-commit.addPrompt',
        EDIT_PROMPT: 'ai-git-commit.editPrompt',
        DELETE_PROMPT: 'ai-git-commit.deletePrompt',
        SELECT_PROMPT: 'ai-git-commit.selectPrompt',
        DOWNLOAD_PROMPTS: 'ai-git-commit.downloadPrompts',
        GENERATE_COMMIT_MESSAGE: 'extension.ai-git-commit',
        MANUAL_POLISH_COMMIT_MESSAGE: 'ai-git-commit.manualPolishCommitMessage'
    },

    // 提示词管理相关文本
    PROMPT_MANAGEMENT: {
        // 输入框提示
        INPUT: {
            NAME: {
                PROMPT: '输入提示词名称',
                PLACEHOLDER: '例如：功能更新提示词',
                VALIDATION: {
                    EMPTY: '提示词名称不能为空',
                    EXISTS: '该名称已存在，请使用其他名称'
                }
            },
            CONTENT: {
                PROMPT: '输入提示词内容 (使用 {diff} 作为代码差异的占位符)',
                PLACEHOLDER: '例如：请根据以下代码变更生成一个关于功能更新的commit消息：\n\n{diff}'
            },
            POLISH_CONTENT: {
                PROMPT: '输入润色提示词内容 (使用 {diff} 作为原始消息的占位符)',
                PLACEHOLDER: '例如：请根据以下原始消息生成一个更规范的commit消息：\n\n{diff}'
            },
            PREFERRED_LANGUAGES: {
                PROMPT: '输入偏好编程语言（多个语言用逗号分隔）',
                PLACEHOLDER: '例如：TypeScript, JavaScript, Python'
            },
            PREFERRED_LIBRARIES: {
                PROMPT: '输入偏好三方库（多个库用逗号分隔）',
                PLACEHOLDER: '例如：React, Vue, Express'
            },
            REMOTE_URL: {
                PROMPT: '输入远程提示词列表地址',
                PLACEHOLDER: 'https://example.com/prompts.json'
            }
        },

        // 选择框提示
        SELECT: {
            EDIT: '选择要编辑的提示词',
            DELETE: '选择要删除的提示词',
            USE: '选择要使用的提示词'
        },

        // 确认提示
        CONFIRM: {
            DELETE: (name: string) => `确定要删除提示词 "${name}" 吗？`,
            CONFIRM_BUTTON: '确定'
        },

        // 成功提示
        SUCCESS: {
            ADD: (name: string) => `提示词 "${name}" 已添加`,
            EDIT: (name: string) => `提示词 "${name}" 已更新`,
            DELETE: (name: string) => `提示词 "${name}" 已删除`,
            USE: (name: string) => `已设置使用提示词 "${name}"`,
            DOWNLOAD: '远程提示词下载成功'
        },

        // 错误提示
        ERROR: {
            LOAD: '加载提示词失败',
            SAVE: '保存提示词失败',
            DOWNLOAD: '下载远程提示词失败'
        }
    },

    // 标签显示
    TAGS: {
        LANGUAGES: (languages: string[]) => `偏好编程语言: ${languages.join(', ')}`,
        LIBRARIES: (libraries: string[]) => `偏好三方库: ${libraries.join(', ')}`,
        SOURCE: (source: string) => `来源: ${source}`,
        VERSION: (version: string) => `版本: ${version}`,
    }
};

/**
 * Git相关常量
 */
export const GIT_CONSTANTS = {
    ERROR: {
        NO_REPOSITORY: '未找到Git仓库',
        NO_CHANGES: '没有检测到代码变更',
        TOO_MANY_CHANGES: (maxChanges: number) => `变更行数过多（超过${maxChanges}行），请减少暂存文件数量或选择手动输入`
    },
    WARNING: {
        MANUAL_INPUT: '您选择了手动输入，请输入简短的Commit消息，我们将帮您润色'
    }
};

/**
 * AI服务相关常量
 */
export const AI_CONSTANTS = {
    PROGRESS: {
        TITLE: '正在生成Commit消息...',
        POLISHING: '正在润色Commit消息...'
    },
    SUCCESS: {
        GENERATE: '成功生成Commit消息',
        POLISH: '成功润色Commit消息'
    },
    ERROR: {
        GENERATE: '生成Commit消息失败',
        POLISH: '润色Commit消息失败'
    }
};

/**
 * 配置相关常量
 */
export const CONFIG_CONSTANTS = {
    // 配置根节点
    ROOT: 'ai-git-commit',

    // 提供商配置
    PROVIDER: 'provider',

    // 提示词配置
    PROMPT: {
        SELECTED_TEMPLATE_PROMPT: 'prompt.selectedTemplatePrompt',
        SELECTED_PROMPT_TEMPLATE_ID: 'prompt.selectedPromptTemplateId',
        LIBRARY_AWARENESS: 'prompt.libraryAwareness',
        LANGUAGE_AWARENESS: 'prompt.languageAwareness',
        ENABLE_LANGUAGE_AWARENESS: 'prompt.enableLanguageAwareness',
        ENABLE_LIBRARY_AWARENESS: 'prompt.enableLibraryAwareness'
    },

    // Git配置
    GIT: {
        DIFF: {
            MAX_CHANGES: 'git-diff.maxChanges',
            WORD_DIFF: 'git-diff.wordDiff',
            UNIFIED: 'git-diff.unified',
            NO_COLOR: 'git-diff.noColor',
            DIFF_FILTER: 'git-diff.diffFilter',
            FILTER_META: 'git-diff.filterMeta'
        }
    },

    // OpenAI配置
    OPENAI: {
        BASE_URL: 'openai.baseUrl',
        API_KEY: 'openai.apiKey',
        MODEL: 'openai.model',
        TEMPERATURE: 'openai.temperature',
        TOP_P: 'openai.topP',
        MAX_TOKENS: 'openai.maxTokens'
    },

    // Gemini配置
    GEMINI: {
        API_KEY: 'gemini.apiKey',
        MODEL: 'gemini.model',
        TEMPERATURE: 'gemini.temperature',
        TOP_K: 'gemini.topK',
        TOP_P: 'gemini.topP',
        MAX_OUTPUT_TOKENS: 'gemini.maxOutputTokens',
        BASE_URL: 'gemini.baseUrl'
    },

    // 默认值
    DEFAULTS: {
        PROVIDER: 'OpenAI',
        OPENAI: {
            BASE_URL: 'https://api.openai.com/v1',
            MODEL: 'gpt-3.5-turbo',
            TEMPERATURE: 0.7,
            TOP_P: 1,
            MAX_TOKENS: 500
        },
        GEMINI: {
            MODEL: 'gemini-pro',
            TEMPERATURE: 0.7,
            TOP_K: 40,
            TOP_P: 0.95,
            MAX_OUTPUT_TOKENS: 500,
            BASE_URL: 'https://generativelanguage.googleapis.com'
        },
        GIT: {
            DIFF: {
                MAX_CHANGES: 100,
                WORD_DIFF: true,
                UNIFIED: 0,
                NO_COLOR: true,
                DIFF_FILTER: 'ACMRT',
                FILTER_META: false
            }
        },
        LANGUAGE: '中文'
    },

    // AI提供商
    PROVIDERS: {
        OPENAI: 'OpenAI',
        GEMINI: 'Gemini'
    },
    LANGUAGE: "language"
}; 