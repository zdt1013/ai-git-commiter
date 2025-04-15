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