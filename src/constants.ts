import * as vscode from 'vscode';

/**
 * Prompt management constants
 */
export const PROMPT_CONSTANTS = {
    // Commands
    COMMANDS: {
        ADD_PROMPT: 'ai-git-commiter.addPrompt',
        EDIT_PROMPT: 'ai-git-commiter.editPrompt',
        DELETE_PROMPT: 'ai-git-commiter.deletePrompt',
        SELECT_PROMPT: 'ai-git-commiter.selectPrompt',
        DOWNLOAD_PROMPTS: 'ai-git-commiter.downloadPrompts',
        GENERATE_COMMIT_MESSAGE: 'extension.ai-git-commiter',
        MANUAL_POLISH_COMMIT_MESSAGE: 'ai-git-commiter.manualPolishCommitMessage',
        SWITCH_AI_MODEL: 'ai-git-commiter.switchAIModel',
        OPEN_SETTINGS: 'ai-git-commiter.settings'
    },

    // Prompt management text
    PROMPT_MANAGEMENT: {
        INPUT: {
            NAME: {
                get PROMPT() { return vscode.l10n.t('Enter prompt name'); },
                get PLACEHOLDER() { return vscode.l10n.t('For example: Feature update prompt'); },
                VALIDATION: {
                    get EMPTY() { return vscode.l10n.t('Prompt name cannot be empty'); },
                    get EXISTS() { return vscode.l10n.t('This name already exists, please use another one'); }
                }
            },
            CONTENT: {
                get PROMPT() { return vscode.l10n.t('Enter prompt content (use {diff} as a placeholder for code changes)'); },
                get PLACEHOLDER() { return vscode.l10n.t('For example: Please generate a commit message for the following changes:\n\n{diff}'); }
            },
            POLISH_CONTENT: {
                get PROMPT() { return vscode.l10n.t('Enter polish prompt content (use {diff} as a placeholder for the original message)'); },
                get PLACEHOLDER() { return vscode.l10n.t('For example: Please generate a standard commit message based on this original message:\n\n{diff}'); }
            },
            REMOTE_URL: {
                get PROMPT() { return vscode.l10n.t('Enter remote prompts list URL'); },
                get PLACEHOLDER() { return vscode.l10n.t('https://example.com/prompts.json'); }
            }
        },

        SELECT: {
            get TITLE() { return vscode.l10n.t("Select Prompt"); },
            get EDIT() { return vscode.l10n.t('Select a prompt to edit'); },
            get DELETE() { return vscode.l10n.t('Select a prompt to delete'); },
            get USE() { return vscode.l10n.t('Select a prompt to use'); }
        },

        CONFIRM: {
            DELETE: (name: string) => vscode.l10n.t("Are you sure you want to delete prompt '{0}'?", name),
            get CONFIRM_BUTTON() { return vscode.l10n.t('OK'); }
        },

        SUCCESS: {
            ADD: (name: string) => vscode.l10n.t("Prompt '{0}' has been added", name),
            EDIT: (name: string) => vscode.l10n.t("Prompt '{0}' has been updated", name),
            DELETE: (name: string) => vscode.l10n.t("Prompt '{0}' has been deleted", name),
            USE: (name: string) => vscode.l10n.t("Set to use prompt '{0}'", name),
            get DOWNLOAD() { return vscode.l10n.t('Remote prompts downloaded successfully'); }
        },

        ERROR: {
            get LOAD() { return vscode.l10n.t('Failed to load prompts'); },
            get SAVE() { return vscode.l10n.t('Failed to save prompts'); },
            get DOWNLOAD() { return vscode.l10n.t('Failed to download remote prompts'); }
        }
    },

    TAGS: {
        SOURCE: (source: string) => vscode.l10n.t("Source: {0}", source),
        VERSION: (version: string) => vscode.l10n.t("Version: {0}", version),
    }
};

/**
 * Git constants
 */
export const GIT_CONSTANTS = {
    ERROR: {
        get NO_REPOSITORY() { return vscode.l10n.t('No Git repository found'); },
        get NO_CHANGES() { return vscode.l10n.t('No code changes detected'); },
        TOO_MANY_CHANGES: (maxChanges: number) => vscode.l10n.t("Too many line changes (over {0} lines). Please reduce staged files or choose manual input", maxChanges)
    },
    WARNING: {
        get MANUAL_INPUT() { return vscode.l10n.t('You chose manual input. Please enter a short Commit message, and we will polish it for you'); }
    },
    BUTTONS: {
        get MANUAL_INPUT() { return vscode.l10n.t('Manual Input'); }
    },
    INPUT: {
        get COMMIT_MESSAGE_PLACEHOLDER() { return vscode.l10n.t('Please enter a short Commit message'); }
    },
    get NEED_SELECTION() { return vscode.l10n.t('You need to select a Git repository to continue'); }
};

/**
 * AI Service constants
 */
export const AI_CONSTANTS = {
    PROGRESS: {
        get TITLE() { return vscode.l10n.t('Generating Commit message...'); },
        get POLISHING() { return vscode.l10n.t('Polishing Commit message...'); },
        get LOADING_MODELS() { return vscode.l10n.t('Loading available models...'); }
    },
    SUCCESS: {
        get GENERATE() { return vscode.l10n.t('Successfully generated Commit message'); },
        get POLISH() { return vscode.l10n.t('Successfully polished Commit message'); },
        get SWITCH_MODEL() { return vscode.l10n.t('Successfully switched AI model'); }
    },
    ERROR: {
        get GENERATE() { return vscode.l10n.t('Failed to generate Commit message'); },
        get POLISH() { return vscode.l10n.t('Failed to polish Commit message'); },
        get LOAD_MODELS() { return vscode.l10n.t('Failed to load available models'); },
        get UNSUPPORTED_PROVIDER() { return vscode.l10n.t('Current AI provider does not support reading available models'); },
        get NO_BASE_URL() { return vscode.l10n.t('OpenAI Base URL is not set. Please configure it first'); },
        get NO_AVAILABLE_MODELS() { return vscode.l10n.t('No available AI models found'); }
    },
    UI: {
        get MODEL_SELECTION_PLACEHOLDER() { return vscode.l10n.t('Select an AI model to use'); },
        get MODEL_SELECTION_TITLE() { return vscode.l10n.t('AI Model Selection'); }
    }
};

/**
 * Config constants
 */
export const CONFIG_CONSTANTS = {
    // Config Root
    ROOT: 'ai-git-commiter',

    // Provider
    PROVIDER: 'provider',

    // General Config
    ENABLE_THINKING: 'enable_thinking',
    THINKING_MODE: 'openai.thinkingMode',
    USER_AGENT: 'userAgent',

    // Prompt Config
    PROMPT: {
        SELECTED_TEMPLATE_PROMPT: 'prompt.selectedTemplatePrompt',
        SELECTED_PROMPT_TEMPLATE_ID: 'prompt.selectedPromptTemplateId',
        ENABLE_PROJECT_PERCEPTION: 'prompt.enableProjectPerception',
        PROJECT_INFO_PATH: 'prompt.projectInfoPath',
        ENABLE_RECENT_COMMITS: 'prompt.enableRecentCommits',
        RECENT_COMMITS_COUNT: 'prompt.recentCommitsCount'
    },

    // Git Config
    GIT: {
        DIFF: {
            MAX_CHANGES: 'git-diff.maxChanges',
            WORD_DIFF: 'git-diff.wordDiff',
            UNIFIED: 'git-diff.unified',
            NO_COLOR: 'git-diff.noColor',
            DIFF_FILTER: 'git-diff.diffFilter',
            FILTER_META: 'git-diff.filterMeta',
            INCLUDE_SUMMARY: 'git-diff.includeSummary',
            AREA: 'git-diff.area'
        }
    },

    // OpenAI Config
    OPENAI: {
        BASE_URL: 'openai.baseUrl',
        API_KEY: 'openai.apiKey',
        MODEL: 'openai.model',
        TEMPERATURE: 'openai.temperature',
        TOP_P: 'openai.topP',
        MAX_TOKENS: 'openai.maxTokens'
    },

    // Gemini Config
    GEMINI: {
        API_KEY: 'gemini.apiKey',
        MODEL: 'gemini.model',
        TEMPERATURE: 'gemini.temperature',
        TOP_K: 'gemini.topK',
        TOP_P: 'gemini.topP',
        MAX_OUTPUT_TOKENS: 'gemini.maxOutputTokens',
        BASE_URL: 'gemini.baseUrl'
    },

    // Anthropic Config
    ANTHROPIC: {
        BASE_URL: 'anthropic.baseUrl',
        API_KEY: 'anthropic.apiKey',
        MODEL: 'anthropic.model',
        TEMPERATURE: 'anthropic.temperature',
        TOP_P: 'anthropic.topP',
        MAX_TOKENS: 'anthropic.maxTokens'
    },

    // Default Values
    DEFAULTS: {
        PROVIDER: 'OpenAI',
        ENABLE_THINKING: false,
        THINKING_MODE: 'disabled' as 'disabled' | 'standard' | 'legacy' | 'vllm',
        OPENAI: {
            BASE_URL: 'https://api.openai.com/v1',
            MODEL: 'gpt-3.5-turbo',
            TEMPERATURE: 0.3,
            TOP_P: 1,
            MAX_TOKENS: 500
        },
        GEMINI: {
            MODEL: 'gemini-pro',
            TEMPERATURE: 0.3,
            TOP_K: 40,
            TOP_P: 0.95,
            MAX_OUTPUT_TOKENS: 500,
            BASE_URL: 'https://generativelanguage.googleapis.com'
        },
        ANTHROPIC: {
            BASE_URL: 'https://open.bigmodel.cn/api/anthropic',
            MODEL: 'glm-5.1',
            TEMPERATURE: 0.3,
            TOP_P: 1,
            MAX_TOKENS: 500
        },
        GIT: {
            DIFF: {
                MAX_CHANGES: 100,
                WORD_DIFF: true,
                UNIFIED: 0,
                NO_COLOR: true,
                DIFF_FILTER: 'ACDMRT',
                FILTER_META: false,
                INCLUDE_SUMMARY: true,
                AREA: 'auto'
            }
        },
        LANGUAGE: 'English',
        PROMPT: {
            ENABLE_RECENT_COMMITS: false,
            RECENT_COMMITS_COUNT: 3
        }
    },

    // Providers
    PROVIDERS: {
        OPENAI: 'OpenAI',
        GEMINI: 'Gemini',
        ANTHROPIC: 'Anthropic'
    },
    LANGUAGE: "language"
};
