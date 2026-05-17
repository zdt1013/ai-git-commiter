// 流式返回后，AIResponse 已不再使用；保留类型以兼容旧代码，但不再被导出给新代码使用
// AIResponse is no longer used after streaming return; keep type for backward compatibility but do not export for new code
export interface AIResponse {
    success: boolean;
    message: string;
    error?: string;
    prompt?: PromptTemplate;  // 使用的提示词模板
  // Prompt template used
}

export interface XmlPrompt {
    id: string[];
    name: string[];
    content: string[];
    polishContent: string[];
    source?: string[];
    description?: string[];
    version?: string[];
}

export interface PromptTemplate {
    id: string;
    name: string;
    content: string;
    polishContent: string;
    source?: string;
    description?: string;
    url?: string;
    version?: string;
} 