import { GoogleGenAI } from '@google/genai';
import * as vscode from 'vscode';
import { PromptTemplate } from '../types/types';
import { CONFIG_CONSTANTS } from '../constants';
import { IAIService } from './ai-service.interface';
import { TextUtils } from '../utils/text-utils';
import { AIModel } from '../types/model';
import { Logger } from '../utils/logger';

export class GeminiService implements IAIService {
    private static instance: GeminiService | null = null;
    private genAIClient: GoogleGenAI | null = null;

    private constructor() {
        // 私有构造函数，防止外部直接实例化
        // Private constructor to prevent direct instantiation
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
                throw new Error(vscode.l10n.t("Please configure Google Gemini API key in settings"));
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
        // Gemini currently doesn't support fetching available models
        throw new Error(vscode.l10n.t("Current AI provider does not support fetching available model list"));
    }

    /**
     * 调用Gemini API生成文本（非官方流式，按整体返回一次分片）
     * @param prompt - 提示词文本
     * @param _promptTemplate - 提示词模板（保留参数以便未来扩展）
     * @returns 返回字符串分片的异步生成器
     */
    private async *callGemini(prompt: string, _promptTemplate: PromptTemplate): AsyncGenerator<string> {
        // 从Configure中获取Gemini相关参数
        const config = vscode.workspace.getConfiguration(CONFIG_CONSTANTS.ROOT);
        const model = config.get<string>(CONFIG_CONSTANTS.GEMINI.MODEL) || CONFIG_CONSTANTS.DEFAULTS.GEMINI.MODEL;
        const temperature = config.get<number>(CONFIG_CONSTANTS.GEMINI.TEMPERATURE) || CONFIG_CONSTANTS.DEFAULTS.GEMINI.TEMPERATURE;
        const topK = config.get<number>(CONFIG_CONSTANTS.GEMINI.TOP_K) || CONFIG_CONSTANTS.DEFAULTS.GEMINI.TOP_K;
        const topP = config.get<number>(CONFIG_CONSTANTS.GEMINI.TOP_P) || CONFIG_CONSTANTS.DEFAULTS.GEMINI.TOP_P;
        const maxOutputTokens = config.get<number>(CONFIG_CONSTANTS.GEMINI.MAX_OUTPUT_TOKENS) || CONFIG_CONSTANTS.DEFAULTS.GEMINI.MAX_OUTPUT_TOKENS;

        // 获取Gemini客户端实例
        // Get Gemini client instance
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
            Logger.error(vscode.l10n.t("Gemini API call failed"), error);
            throw new Error(`Gemini API call failed: ${error.message}`);
        }
    }

    generateCommitMessage(diff: string, language: string, promptTemplate: PromptTemplate, projectInfo?: string, recentCommits?: string): AsyncGenerator<string> {
        // 构建提示词：替换模板中的占位符
        // Build prompt: replace placeholders in template
        let prompt = promptTemplate.content
            .replace('{diff}', diff)
            .replaceAll('{language}', language);

        if (projectInfo) {
            if (prompt.includes('{projectInfo}')) {
                prompt = prompt.replaceAll('{projectInfo}', projectInfo);
            } else {
                prompt += `\n\n【项目基础信息】\n${projectInfo}`;
            }
        } else {
            prompt = prompt.replaceAll('{projectInfo}', '');
        }

        if (recentCommits) {
            if (prompt.includes('{recentCommits}')) {
                prompt = prompt.replaceAll('{recentCommits}', recentCommits);
            } else {
                prompt += `\n\n## Style Reference\n${recentCommits}`;
            }
        } else {
            prompt = prompt.replaceAll('{recentCommits}', '');
        }

        return this.callGemini(prompt, promptTemplate);
    }

    polishCommitMessage(message: string, language: string, promptTemplate: PromptTemplate, projectInfo?: string): AsyncGenerator<string> {
        let prompt = promptTemplate.polishContent
            .replace('{diff}', message)
            .replaceAll('{language}', language);

        if (projectInfo) {
            if (prompt.includes('{projectInfo}')) {
                prompt = prompt.replaceAll('{projectInfo}', projectInfo);
            } else {
                prompt += `\n\n【项目基础信息】\n${projectInfo}`;
            }
        } else {
            prompt = prompt.replaceAll('{projectInfo}', '');
        }

        return this.callGemini(prompt, promptTemplate);
    }
} 