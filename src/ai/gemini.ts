import { GoogleGenAI } from '@google/genai';
import * as vscode from 'vscode';
import { AIResponse } from '../types';
import { PromptTemplate } from '../types';
import { CONFIG_CONSTANTS } from '../constants';

export class GeminiService {
    static async generateCommitMessage(diff: string, language: string, promptTemplate: PromptTemplate): Promise<AIResponse> {
        try {
            const config = vscode.workspace.getConfiguration(CONFIG_CONSTANTS.ROOT);
            const apiKey = config.get<string>(CONFIG_CONSTANTS.GEMINI.API_KEY);
            const model = config.get<string>(CONFIG_CONSTANTS.GEMINI.MODEL) || CONFIG_CONSTANTS.DEFAULTS.GEMINI.MODEL;
            const temperature = config.get<number>(CONFIG_CONSTANTS.GEMINI.TEMPERATURE) || CONFIG_CONSTANTS.DEFAULTS.GEMINI.TEMPERATURE;
            const topK = config.get<number>(CONFIG_CONSTANTS.GEMINI.TOP_K) || CONFIG_CONSTANTS.DEFAULTS.GEMINI.TOP_K;
            const topP = config.get<number>(CONFIG_CONSTANTS.GEMINI.TOP_P) || CONFIG_CONSTANTS.DEFAULTS.GEMINI.TOP_P;
            const maxOutputTokens = config.get<number>(CONFIG_CONSTANTS.GEMINI.MAX_OUTPUT_TOKENS) || CONFIG_CONSTANTS.DEFAULTS.GEMINI.MAX_OUTPUT_TOKENS;

            if (!apiKey) {
                return {
                    success: false,
                    message: '',
                    error: '请在设置中配置Google Gemini API密钥'
                };
            }

            // 构建提示词
            let prompt = promptTemplate.content
                .replace('{diff}', diff)
                .replace('{language}', language === 'English' ? 'English' : '简体中文');

            // 添加项目相关信息
            const enableLanguageAwareness = config.get<boolean>(CONFIG_CONSTANTS.PROMPT.ENABLE_LANGUAGE_AWARENESS) ?? true;
            const enableLibraryAwareness = config.get<boolean>(CONFIG_CONSTANTS.PROMPT.ENABLE_LIBRARY_AWARENESS) ?? true;

            if (enableLanguageAwareness && promptTemplate.preferredLanguages?.length) {
                const prefix = promptTemplate.preferredLanguagePrompt || '> Project Preferred Languages: ';
                prompt = prompt.replace('{preferredLanguagePrompt}', `\n${prefix}${promptTemplate.preferredLanguages.join(', ')}`);
            } else {
                prompt = prompt.replace('{preferredLanguagePrompt}', '');
            }

            if (enableLibraryAwareness && promptTemplate.preferredLibraries?.length) {
                const prefix = promptTemplate.preferredLibraryPrompt || '> Project Preferred Libraries: ';
                prompt = prompt.replace('{preferredLibraryPrompt}', `\n${prefix}${promptTemplate.preferredLibraries.join(', ')}`);
            } else {
                prompt = prompt.replace('{preferredLibraryPrompt}', '');
            }

            // 初始化 Gemini 客户端
            const genAI = new GoogleGenAI({ apiKey });

            // 调用 Gemini API
            const result = await genAI.models.generateContent({
                model,
                contents: prompt,
                config: {
                    temperature,
                    topK,
                    topP,
                    maxOutputTokens,
                }
            }
            );
            const text = await result.text;

            return {
                success: true,
                message: text?.trim() || "",
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
} 