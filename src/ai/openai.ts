import { OpenAI } from 'openai';
import * as vscode from 'vscode';
import { AIResponse } from '../types/types';
import { PromptTemplate } from '../types/types';
import { CONFIG_CONSTANTS } from '../constants';

export class OpenAIService {
    static async generateCommitMessage(diff: string, language: string, promptTemplate: PromptTemplate): Promise<AIResponse> {
        try {
            // 从VS Code配置中获取OpenAI相关设置
            const config = vscode.workspace.getConfiguration(CONFIG_CONSTANTS.ROOT);
            const baseUrl = config.get<string>(CONFIG_CONSTANTS.OPENAI.BASE_URL) || CONFIG_CONSTANTS.DEFAULTS.OPENAI.BASE_URL;
            const apiKey = config.get<string>(CONFIG_CONSTANTS.OPENAI.API_KEY);
            const model = config.get<string>(CONFIG_CONSTANTS.OPENAI.MODEL) || CONFIG_CONSTANTS.DEFAULTS.OPENAI.MODEL;
            const temperature = config.get<number>(CONFIG_CONSTANTS.OPENAI.TEMPERATURE) || CONFIG_CONSTANTS.DEFAULTS.OPENAI.TEMPERATURE;
            const topP = config.get<number>(CONFIG_CONSTANTS.OPENAI.TOP_P) || CONFIG_CONSTANTS.DEFAULTS.OPENAI.TOP_P;
            const maxTokens = config.get<number>(CONFIG_CONSTANTS.OPENAI.MAX_TOKENS) || CONFIG_CONSTANTS.DEFAULTS.OPENAI.MAX_TOKENS;

            // 检查API密钥是否配置
            if (!apiKey) {
                return {
                    success: false,
                    message: '',
                    error: '请在设置中配置OpenAI API密钥'
                };
            }

            // 构建提示词：替换模板中的占位符
            let prompt = promptTemplate.content
                .replace('{diff}', diff)  // 插入代码差异
                .replaceAll('{language}', language);  // 设置输出语言

            // 从配置中获取是否启用语言和库感知
            const enableLanguageAwareness = config.get<boolean>(CONFIG_CONSTANTS.PROMPT.ENABLE_LANGUAGE_AWARENESS) ?? true;
            const enableLibraryAwareness = config.get<boolean>(CONFIG_CONSTANTS.PROMPT.ENABLE_LIBRARY_AWARENESS) ?? true;

            // 如果启用了语言感知且有首选语言，添加到提示词中
            if (enableLanguageAwareness && promptTemplate.preferredLanguages?.length) {
                const prefix = promptTemplate.preferredLanguagePrompt || '项目主要使用的编程语言：';
                prompt = prompt.replace('{preferredLanguages}', `\n${prefix}${promptTemplate.preferredLanguages.join(', ')}`);
            } else {
                prompt = prompt.replace('{preferredLanguages}', '');
            }

            // 如果启用了库感知且有首选库，添加到提示词中
            if (enableLibraryAwareness && promptTemplate.preferredLibraries?.length) {
                const prefix = promptTemplate.preferredLibraryPrompt || '项目主要使用的三方库：';
                prompt = prompt.replace('{preferredLibraries}', `\n${prefix}${promptTemplate.preferredLibraries.join(', ')}`);
            } else {
                prompt = prompt.replace('{preferredLibraries}', '');
            }

            // 初始化OpenAI客户端
            const openai = new OpenAI({
                apiKey: apiKey,  // API密钥
                baseURL: baseUrl  // API基础URL
            });

            // 调用OpenAI API生成提交信息
            const response = await openai.chat.completions.create({
                model: model,  // 使用的模型
                messages: [{ role: 'user', content: prompt }],  // 用户消息
                temperature: temperature,  // 控制生成随机性
                top_p: topP,  // 核采样参数
                max_tokens: maxTokens,  // 最大输出token数
                stream: false  // 非流式响应
            });

            // 返回成功结果
            return {
                success: true,
                message: response.choices[0].message.content?.trim() || '',  // 获取第一个选择的回复内容
                prompt: promptTemplate
            };
        } catch (error: any) {
            // 处理错误情况
            console.error('OpenAI API调用失败:', error);
            return {
                success: false,
                message: '',
                error: `OpenAI API调用失败: ${error.message}`,
                prompt: promptTemplate
            };
        }
    }

    static async polishCommitMessage(message: string, language: string, promptTemplate: PromptTemplate): Promise<AIResponse> {
        try {
            // 从VS Code配置中获取OpenAI相关设置
            const config = vscode.workspace.getConfiguration(CONFIG_CONSTANTS.ROOT);
            const baseUrl = config.get<string>(CONFIG_CONSTANTS.OPENAI.BASE_URL) || CONFIG_CONSTANTS.DEFAULTS.OPENAI.BASE_URL;
            const apiKey = config.get<string>(CONFIG_CONSTANTS.OPENAI.API_KEY);
            const model = config.get<string>(CONFIG_CONSTANTS.OPENAI.MODEL) || CONFIG_CONSTANTS.DEFAULTS.OPENAI.MODEL;
            const temperature = config.get<number>(CONFIG_CONSTANTS.OPENAI.TEMPERATURE) || CONFIG_CONSTANTS.DEFAULTS.OPENAI.TEMPERATURE;
            const topP = config.get<number>(CONFIG_CONSTANTS.OPENAI.TOP_P) || CONFIG_CONSTANTS.DEFAULTS.OPENAI.TOP_P;
            const maxTokens = config.get<number>(CONFIG_CONSTANTS.OPENAI.MAX_TOKENS) || CONFIG_CONSTANTS.DEFAULTS.OPENAI.MAX_TOKENS;

            // 检查API密钥是否配置
            if (!apiKey) {
                return {
                    success: false,
                    message: '',
                    error: '请在设置中配置OpenAI API密钥'
                };
            }

            // 构建提示词：替换模板中的占位符
            let prompt = promptTemplate.content
                .replace('{message}', message)  // 插入原始消息
                .replaceAll('{language}', language);  // 设置输出语言

            // 初始化OpenAI客户端
            const openai = new OpenAI({
                apiKey: apiKey,
                baseURL: baseUrl
            });

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
                message: response.choices[0].message.content || '',
                error: ''
            };
        } catch (error: any) {
            return {
                success: false,
                message: '',
                error: error.message
            };
        }
    }
} 