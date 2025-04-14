// 配置项
export interface AIConfig {
    provider: string;
    language: string;
    customPrompt: string;
    git?: {
        wordDiff: boolean;
        unified: number;
        noColor: boolean;
        diffFilter: string;
        filterMeta: boolean;
    };
    openai?: {
        baseUrl: string;
        apiKey: string;
        model: string;
        temperature?: number;
        topP?: number;
        maxTokens?: number;
    };
    gemini?: {
        baseUrl: string;
        apiKey: string;
        model: string;
        temperature?: number;
        topK?: number;
        topP?: number;
        maxOutputTokens?: number;
    };
}

export interface AIResponse {
    success: boolean;
    message: string;
    error?: string;
    prompt?: PromptTemplate;  // 使用的提示词模板
}

export interface Repository {
    rootUri: { fsPath: string };
    inputBox: { value: string };
}

export interface XmlPrompt {
    id: string[];
    name: string[];
    content: string[];
    source?: string[];
    description?: string[];
    preferredLanguages?: Array<{ language: string[] }>;
    preferredLibraries?: Array<{ library: string[] }>;
    preferredLanguagePrompt?: string[];
    preferredLibraryPrompt?: string[];
    version?: string[];
}

export interface PromptTemplate {
    id: string;
    name: string;
    content: string;
    source?: string;
    description?: string;
    preferredLanguages?: string[];
    preferredLibraries?: string[];
    preferredLanguagePrompt?: string;
    preferredLibraryPrompt?: string;
    url?: string;
    version?: string;
} 