import { OpenAI } from 'openai';
import * as vscode from 'vscode';
import { AIResponse } from '../types';
import { PromptTemplate } from '../types';
import { CONFIG_CONSTANTS } from '../constants';

export class OpenAIService {
    static async generateCommitMessage(diff: string, language: string, promptTemplate: PromptTemplate): Promise<AIResponse> {
        try {
            const config = vscode.workspace.getConfiguration(CONFIG_CONSTANTS.ROOT);
            const baseUrl = config.get<string>(CONFIG_CONSTANTS.OPENAI.BASE_URL) || CONFIG_CONSTANTS.DEFAULTS.OPENAI.BASE_URL;
            const apiKey = config.get<string>(CONFIG_CONSTANTS.OPENAI.API_KEY);
            const model = config.get<string>(CONFIG_CONSTANTS.OPENAI.MODEL) || CONFIG_CONSTANTS.DEFAULTS.OPENAI.MODEL;
            const temperature = config.get<number>(CONFIG_CONSTANTS.OPENAI.TEMPERATURE) || CONFIG_CONSTANTS.DEFAULTS.OPENAI.TEMPERATURE;
            const topP = config.get<number>(CONFIG_CONSTANTS.OPENAI.TOP_P) || CONFIG_CONSTANTS.DEFAULTS.OPENAI.TOP_P;
            const maxTokens = config.get<number>(CONFIG_CONSTANTS.OPENAI.MAX_TOKENS) || CONFIG_CONSTANTS.DEFAULTS.OPENAI.MAX_TOKENS;

            if (!apiKey) {
                return {
                    success: false,
                    message: '',
                    error: '请在设置中配置OpenAI API密钥'
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
                const prefix = promptTemplate.preferredLanguagePrompt || '项目主要使用的编程语言：';
                prompt = prompt.replace('{preferredLanguages}', `\n${prefix}${promptTemplate.preferredLanguages.join(', ')}`);
            } else {
                prompt = prompt.replace('{preferredLanguages}', '');
            }

            if (enableLibraryAwareness && promptTemplate.preferredLibraries?.length) {
                const prefix = promptTemplate.preferredLibraryPrompt || '项目主要使用的三方库：';
                prompt = prompt.replace('{preferredLibraries}', `\n${prefix}${promptTemplate.preferredLibraries.join(', ')}`);
            } else {
                prompt = prompt.replace('{preferredLibraries}', '');
            }

            // 初始化 OpenAI 客户端
            const openai = new OpenAI({
                apiKey: apiKey,
                baseURL: baseUrl
            });

            // 调用 OpenAI API
            const response = await openai.chat.completions.create({
                model: model,
                messages: [{ role: 'user', content: prompt }],
                temperature: temperature,
                top_p: topP,
                max_tokens: maxTokens,
                stream: false
            });

            return {
                success: true,
                message: response.choices[0].message.content?.trim() || '',
                prompt: promptTemplate
            };
        } catch (error: any) {
            console.error('OpenAI API调用失败:', error);
            return {
                success: false,
                message: '',
                error: `OpenAI API调用失败: ${error.message}`,
                prompt: promptTemplate
            };
        }
    }
} 