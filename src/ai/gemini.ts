import { GoogleGenAI } from '@google/genai';
import * as vscode from 'vscode';
import { AIResponse } from '../types/types';
import { PromptTemplate } from '../types/types';
import { CONFIG_CONSTANTS } from '../constants';

export class GeminiService {
    static async generateCommitMessage(diff: string, language: string, promptTemplate: PromptTemplate): Promise<AIResponse> {
        try {
            // 从VS Code配置中获取Gemini API相关设置
            const config = vscode.workspace.getConfiguration(CONFIG_CONSTANTS.ROOT);
            const apiKey = config.get<string>(CONFIG_CONSTANTS.GEMINI.API_KEY);
            const model = config.get<string>(CONFIG_CONSTANTS.GEMINI.MODEL) || CONFIG_CONSTANTS.DEFAULTS.GEMINI.MODEL;
            const temperature = config.get<number>(CONFIG_CONSTANTS.GEMINI.TEMPERATURE) || CONFIG_CONSTANTS.DEFAULTS.GEMINI.TEMPERATURE;
            const topK = config.get<number>(CONFIG_CONSTANTS.GEMINI.TOP_K) || CONFIG_CONSTANTS.DEFAULTS.GEMINI.TOP_K;
            const topP = config.get<number>(CONFIG_CONSTANTS.GEMINI.TOP_P) || CONFIG_CONSTANTS.DEFAULTS.GEMINI.TOP_P;
            const maxOutputTokens = config.get<number>(CONFIG_CONSTANTS.GEMINI.MAX_OUTPUT_TOKENS) || CONFIG_CONSTANTS.DEFAULTS.GEMINI.MAX_OUTPUT_TOKENS;

            // 检查API密钥是否配置
            if (!apiKey) {
                return {
                    success: false,
                    message: '',
                    error: '请在设置中配置Google Gemini API密钥'
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
                const prefix = promptTemplate.preferredLanguagePrompt || '> Project Preferred Languages: ';
                prompt = prompt.replace('{preferredLanguagePrompt}', `\n${prefix}${promptTemplate.preferredLanguages.join(', ')}`);
            } else {
                prompt = prompt.replace('{preferredLanguagePrompt}', '');
            }

            // 如果启用了库感知且有首选库，添加到提示词中
            if (enableLibraryAwareness && promptTemplate.preferredLibraries?.length) {
                const prefix = promptTemplate.preferredLibraryPrompt || '> Project Preferred Libraries: ';
                prompt = prompt.replace('{preferredLibraryPrompt}', `\n${prefix}${promptTemplate.preferredLibraries.join(', ')}`);
            } else {
                prompt = prompt.replace('{preferredLibraryPrompt}', '');
            }

            // 初始化Gemini客户端
            const genAI = new GoogleGenAI({ apiKey });

            // 调用Gemini API生成内容
            const result = await genAI.models.generateContent({
                model,
                contents: prompt,
                config: {
                    temperature,  // 控制生成结果的随机性
                    topK,        // 限制采样范围
                    topP,        // 核采样参数
                    maxOutputTokens,  // 最大输出token数
                }
            });
            const text = await result.text;

            // 返回成功结果
            return {
                success: true,
                message: text?.trim() || "",
                prompt: promptTemplate
            };
        } catch (error: any) {
            // 处理错误情况
            console.error('Gemini API调用失败:', error);
            return {
                success: false,
                message: '',
                error: `Gemini API调用失败: ${error.message}`,
                prompt: promptTemplate
            };
        }
    }

    static async polishCommitMessage(message: string, language: string, promptTemplate: PromptTemplate): Promise<AIResponse> {
        try {
            // 从VS Code配置中获取Gemini API相关设置
            const config = vscode.workspace.getConfiguration(CONFIG_CONSTANTS.ROOT);
            const apiKey = config.get<string>(CONFIG_CONSTANTS.GEMINI.API_KEY);
            const model = config.get<string>(CONFIG_CONSTANTS.GEMINI.MODEL) || CONFIG_CONSTANTS.DEFAULTS.GEMINI.MODEL;
            const temperature = config.get<number>(CONFIG_CONSTANTS.GEMINI.TEMPERATURE) || CONFIG_CONSTANTS.DEFAULTS.GEMINI.TEMPERATURE;
            const topK = config.get<number>(CONFIG_CONSTANTS.GEMINI.TOP_K) || CONFIG_CONSTANTS.DEFAULTS.GEMINI.TOP_K;
            const topP = config.get<number>(CONFIG_CONSTANTS.GEMINI.TOP_P) || CONFIG_CONSTANTS.DEFAULTS.GEMINI.TOP_P;
            const maxOutputTokens = config.get<number>(CONFIG_CONSTANTS.GEMINI.MAX_OUTPUT_TOKENS) || CONFIG_CONSTANTS.DEFAULTS.GEMINI.MAX_OUTPUT_TOKENS;

            // 检查API密钥是否配置
            if (!apiKey) {
                return {
                    success: false,
                    message: '',
                    error: '请在设置中配置Google Gemini API密钥'
                };
            }

            // 构建提示词：替换模板中的占位符
            let prompt = promptTemplate.content
                .replace('{message}', message)  // 插入原始消息
                .replaceAll('{language}', language);  // 设置输出语言

            // 初始化Gemini客户端
            const genAI = new GoogleGenAI({ apiKey });

            // 调用Gemini API生成内容
            const result = await genAI.models.generateContent({
                model,
                contents: prompt,
                config: {
                    temperature,  // 控制生成结果的随机性
                    topK,        // 限制采样范围
                    topP,        // 核采样参数
                    maxOutputTokens,  // 最大输出token数
                }
            });
            const text = await result.text;

            // 返回成功结果
            return {
                success: true,
                message: text?.trim() || "",
                prompt: promptTemplate
            };
        } catch (error: any) {
            // 处理错误情况
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