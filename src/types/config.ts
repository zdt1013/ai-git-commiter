/**
 * Git差异配置
 */
export interface GitDiffConfig {
    wordDiff: boolean;
    unified: number;
    noColor: boolean;
    diffFilter: string;
    filterMeta: boolean;
    maxChanges: number;
}

/**
 * OpenAI配置
 */
export interface OpenAIConfig {
    apiKey: string;
    model: string;
    baseUrl: string;
}

/**
 * Gemini配置
 */
export interface GeminiConfig {
    apiKey: string;
}

/**
 * 扩展配置
 */
export interface ExtensionConfig {
    provider: string;
    language: string;
    openai: OpenAIConfig;
    gemini: GeminiConfig;
    git: {
        diff: GitDiffConfig;
    };
    prompt: {
        selectedTemplatePrompt: string;
        selectedPromptTemplateId: string;
    };
} 