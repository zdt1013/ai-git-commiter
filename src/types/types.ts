// 流式返回后，AIResponse 已不再使用；保留类型以兼容旧代码，但不再被导出给新代码使用
export interface AIResponse {
    success: boolean;
    message: string;
    error?: string;
    prompt?: PromptTemplate;  // 使用的提示词模板
}

export interface XmlPrompt {
    id: string[];
    name: string[];
    content: string[];
    polishContent: string[];
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
    polishContent: string;
    source?: string;
    description?: string;
    preferredLanguages?: string[];
    preferredLibraries?: string[];
    preferredLanguagePrompt?: string;
    preferredLibraryPrompt?: string;
    url?: string;
    version?: string;
} 