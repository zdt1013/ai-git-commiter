/**
 * Git差异Configure
 */
export interface GitDiffConfig {
    wordDiff: boolean;
    unified: number;
    noColor: boolean;
    diffFilter: string;
    filterMeta: boolean;
    maxChanges: number;
    area: string;
}

/**
 * OpenAIConfigure
 */
export interface OpenAIConfig {
    apiKey: string;
    model: string;
    baseUrl: string;
}

/**
 * GeminiConfigure
 */
export interface GeminiConfig {
    apiKey: string;
}

/**
 * AnthropicConfigure
 */
export interface AnthropicConfig {
    apiKey: string;
    model: string;
    baseUrl: string;
}

/**
 * 扩展Configure
 */
export interface ExtensionConfig {
    provider: string;
    language: string;
    userAgent: string;
    openai: OpenAIConfig;
    gemini: GeminiConfig;
    anthropic: AnthropicConfig;
    git: {
        diff: GitDiffConfig;
    };
    prompt: {
        selectedTemplatePrompt: string;
        selectedPromptTemplateId: string;
        enableProjectPerception: boolean;
        projectInfoPath: string;
    };
} 