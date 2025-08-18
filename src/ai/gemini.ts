import { GoogleGenAI } from '@google/genai';
import * as vscode from 'vscode';
import { PromptTemplate } from '../types/types';
import { CONFIG_CONSTANTS } from '../constants';
import { IAIService } from './ai-service.interface';
import { TextUtils } from '../utils/text-utils';
import { AIModel } from '../types/model';

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

    resetInstance(): void {
        GeminiService.instance = null;
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

    /**
     * 获取可用的AI模型列表
     * @returns 模型列表
     */
    public async getAvailableModels(): Promise<AIModel[]> {
        // 目前Gemini不支持获取可用模型列表
        throw new Error('当前AI服务商不支持读取可用模型列表');
    }

    /**
     * 调用Gemini API生成文本（非官方流式，按整体返回一次分片）
     * @param prompt - 提示词文本
     * @param _promptTemplate - 提示词模板（保留参数以便未来扩展）
     * @returns 返回字符串分片的异步生成器
     */
    private async *callGemini(prompt: string, _promptTemplate: PromptTemplate): AsyncGenerator<string> {
        // 从配置中获取Gemini相关参数
        const config = vscode.workspace.getConfiguration(CONFIG_CONSTANTS.ROOT);
        const model = config.get<string>(CONFIG_CONSTANTS.GEMINI.MODEL) || CONFIG_CONSTANTS.DEFAULTS.GEMINI.MODEL;
        const temperature = config.get<number>(CONFIG_CONSTANTS.GEMINI.TEMPERATURE) || CONFIG_CONSTANTS.DEFAULTS.GEMINI.TEMPERATURE;
        const topK = config.get<number>(CONFIG_CONSTANTS.GEMINI.TOP_K) || CONFIG_CONSTANTS.DEFAULTS.GEMINI.TOP_K;
        const topP = config.get<number>(CONFIG_CONSTANTS.GEMINI.TOP_P) || CONFIG_CONSTANTS.DEFAULTS.GEMINI.TOP_P;
        const maxOutputTokens = config.get<number>(CONFIG_CONSTANTS.GEMINI.MAX_OUTPUT_TOKENS) || CONFIG_CONSTANTS.DEFAULTS.GEMINI.MAX_OUTPUT_TOKENS;

        // 获取Gemini客户端实例
        const genAI = this.getGenAIClient();

        try {
            const result = await genAI.models.generateContent({
                model,
                contents: prompt,
                config: {
                    temperature,
                    topK,
                    topP,
                    maxOutputTokens
                }
            });

            let text = await result.text;
            text = TextUtils.removeCodeBlockMarkers(text?.trim() || '');
            if (text) {
                yield text;
            }
        } catch (error: any) {
            console.error('Gemini API调用失败:', error);
            throw new Error(`Gemini API调用失败: ${error.message}`);
        }
    }

    generateCommitMessage(diff: string, language: string, promptTemplate: PromptTemplate): AsyncGenerator<string> {
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

        return this.callGemini(prompt, promptTemplate);
    }

    polishCommitMessage(message: string, language: string, promptTemplate: PromptTemplate): AsyncGenerator<string> {
        let prompt = promptTemplate.polishContent
            .replace('{diff}', message)
            .replaceAll('{language}', language);

        return this.callGemini(prompt, promptTemplate);
    }
} 