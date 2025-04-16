import { GoogleGenAI } from '@google/genai';
import * as vscode from 'vscode';
import { AIResponse } from '../types/types';
import { PromptTemplate } from '../types/types';
import { CONFIG_CONSTANTS } from '../constants';
import { IAIService } from './ai-service.interface';
import { TextUtils } from '../utils/text-utils';

export class GeminiService implements IAIService {
    private static instance: GeminiService | null = null;
    private genAIClient: GoogleGenAI | null = null;

    private constructor() {
        // 私有构造函数，防止外部直接实例化
    }

    public static getInstance(): GeminiService {
        if (GeminiService.instance === null) {
            GeminiService.instance = new GeminiService();
        }
        return GeminiService.instance;
    }

    private getGenAIClient(): GoogleGenAI {
        if (this.genAIClient === null) {
            const config = vscode.workspace.getConfiguration(CONFIG_CONSTANTS.ROOT);
            const apiKey = config.get<string>(CONFIG_CONSTANTS.GEMINI.API_KEY);

            if (!apiKey) {
                throw new Error('请在设置中配置Google Gemini API密钥');
            }

            this.genAIClient = new GoogleGenAI({ apiKey });
        }
        return this.genAIClient;
    }

    private async callGemini(prompt: string, promptTemplate: PromptTemplate): Promise<AIResponse> {
        try {
            const config = vscode.workspace.getConfiguration(CONFIG_CONSTANTS.ROOT);
            const model = config.get<string>(CONFIG_CONSTANTS.GEMINI.MODEL) || CONFIG_CONSTANTS.DEFAULTS.GEMINI.MODEL;
            const temperature = config.get<number>(CONFIG_CONSTANTS.GEMINI.TEMPERATURE) || CONFIG_CONSTANTS.DEFAULTS.GEMINI.TEMPERATURE;
            const topK = config.get<number>(CONFIG_CONSTANTS.GEMINI.TOP_K) || CONFIG_CONSTANTS.DEFAULTS.GEMINI.TOP_K;
            const topP = config.get<number>(CONFIG_CONSTANTS.GEMINI.TOP_P) || CONFIG_CONSTANTS.DEFAULTS.GEMINI.TOP_P;
            const maxOutputTokens = config.get<number>(CONFIG_CONSTANTS.GEMINI.MAX_OUTPUT_TOKENS) || CONFIG_CONSTANTS.DEFAULTS.GEMINI.MAX_OUTPUT_TOKENS;

            const genAI = this.getGenAIClient();
            const result = await genAI.models.generateContent({
                model,
                contents: prompt,
                config: {
                    temperature,
                    topK,
                    topP,
                    maxOutputTokens,
                }
            });
            let text = await result.text;
            // 处理API返回的文本
            text = text?.trim() || "";
            // 处理API返回的文本
            let message = TextUtils.removeCodeBlockMarkers(text);

            return {
                success: true,
                message,
                prompt: promptTemplate
            };
        } catch (error: any) {
            console.error('Gemini API调用失败:', error);
            return {
                success: false,
                message: '',
                error: `Gemini API调用失败: ${error.message}`,
                prompt: promptTemplate
            };
        }
    }

    async generateCommitMessage(diff: string, language: string, promptTemplate: PromptTemplate): Promise<AIResponse> {
        // 构建提示词：替换模板中的占位符
        let prompt = promptTemplate.content
            .replace('{diff}', diff)
            .replaceAll('{language}', language);

        // 从配置中获取是否启用语言和库感知
        const config = vscode.workspace.getConfiguration(CONFIG_CONSTANTS.ROOT);
        const enableLanguageAwareness = config.get<boolean>(CONFIG_CONSTANTS.PROMPT.ENABLE_LANGUAGE_AWARENESS) ?? true;
        const enableLibraryAwareness = config.get<boolean>(CONFIG_CONSTANTS.PROMPT.ENABLE_LIBRARY_AWARENESS) ?? true;

        // 如果启用了语言感知且有首选语言，添加到提示词中
        if (enableLanguageAwareness && promptTemplate.preferredLanguages?.length) {
            const prefix = promptTemplate.preferredLanguagePrompt || 'The preferred programming language for this project is: ';
            prompt = prompt.replace('{preferredLanguages}', `\n${prefix}${promptTemplate.preferredLanguages.join(', ')}`);
        } else {
            prompt = prompt.replace('{preferredLanguages}', '');
        }

        // 如果启用了库感知且有首选库，添加到提示词中
        if (enableLibraryAwareness && promptTemplate.preferredLibraries?.length) {
            const prefix = promptTemplate.preferredLibraryPrompt || 'The project uses the following third-party libraries: ';
            prompt = prompt.replace('{preferredLibraries}', `\n${prefix}${promptTemplate.preferredLibraries.join(', ')}`);
        } else {
            prompt = prompt.replace('{preferredLibraries}', '');
        }

        const response = await this.callGemini(prompt, promptTemplate);
        return response;
    }

    async polishCommitMessage(message: string, language: string, promptTemplate: PromptTemplate): Promise<AIResponse> {
        let prompt = promptTemplate.polishContent
            .replace('{diff}', message)
            .replaceAll('{language}', language);

        const response = await this.callGemini(prompt, promptTemplate);
        return response;
    }
} 