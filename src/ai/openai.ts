import { OpenAI } from 'openai';
import * as vscode from 'vscode';
import { PromptTemplate } from '../types/types';
import { CONFIG_CONSTANTS } from '../constants';
import { IAIService } from './ai-service.interface';
import { TextUtils } from '../utils/text-utils';
import { AIModel } from '../types/model';
import { ChatCompletionChunk, ChatCompletionCreateParamsStreaming } from 'openai/resources/chat/completions';
import { Stream } from 'openai/streaming';
import { ConfigService } from '../config';


export class OpenAIService implements IAIService {
    private static instance: OpenAIService | null = null;
    private openaiClient: OpenAI | null = null;

    private constructor() {
        // 私有构造函数，防止外部直接实例化
    }

    resetInstance(): void {
        OpenAIService.instance = null;
    }

    public static getInstance(): OpenAIService {
        if (OpenAIService.instance === null) {
            OpenAIService.instance = new OpenAIService();
        }
        return OpenAIService.instance;
    }

    private getOpenAIClient(): OpenAI {
        if (this.openaiClient === null) {
            const config = vscode.workspace.getConfiguration(CONFIG_CONSTANTS.ROOT);
            const baseUrl = config.get<string>(CONFIG_CONSTANTS.OPENAI.BASE_URL) || CONFIG_CONSTANTS.DEFAULTS.OPENAI.BASE_URL;
            const apiKey = config.get<string>(CONFIG_CONSTANTS.OPENAI.API_KEY);

            if (!apiKey) {
                throw new Error('请在设置中配置OpenAI API密钥');
            }

            this.openaiClient = new OpenAI({
                apiKey: apiKey,
                baseURL: baseUrl
            });
        }
        return this.openaiClient;
    }

    /**
     * 获取可用的AI模型列表
     * @returns 模型列表
     */
    public async getAvailableModels(): Promise<AIModel[]> {
        try {
            const openai = this.getOpenAIClient();
            const response = await openai.models.list();

            // 提取所有模型的更多信息
            const models = response.data
                .map((model: { id: string; owned_by?: string; created: number }) => ({
                    id: model.id,
                    owner_by: model.owned_by || 'unknown',
                    created: model.created
                }));

            return models;
        } catch (error: any) {
            console.error('获取OpenAI模型列表失败:', error);
            throw new Error(`获取OpenAI模型列表失败: ${error.message}`);
        }
    }

    /**
     * 调用OpenAI API生成文本（流式）
     * @param prompt - 提示词文本
     * @param _promptTemplate - 提示词模板（保留参数以便未来扩展）
     * @returns 返回字符串分片的异步生成器
     */
    private async *callOpenAI(prompt: string, _promptTemplate: PromptTemplate): AsyncGenerator<string> {
        // 从配置中获取OpenAI相关参数
        const config = vscode.workspace.getConfiguration(CONFIG_CONSTANTS.ROOT);
        const model = config.get<string>(CONFIG_CONSTANTS.OPENAI.MODEL) || CONFIG_CONSTANTS.DEFAULTS.OPENAI.MODEL;
        const temperature = config.get<number>(CONFIG_CONSTANTS.OPENAI.TEMPERATURE) || CONFIG_CONSTANTS.DEFAULTS.OPENAI.TEMPERATURE;
        const topP = config.get<number>(CONFIG_CONSTANTS.OPENAI.TOP_P) || CONFIG_CONSTANTS.DEFAULTS.OPENAI.TOP_P;
        const maxTokens = config.get<number>(CONFIG_CONSTANTS.OPENAI.MAX_TOKENS) || CONFIG_CONSTANTS.DEFAULTS.OPENAI.MAX_TOKENS;
        const enableThinking = config.get<boolean>(CONFIG_CONSTANTS.ENABLE_THINKING) ?? CONFIG_CONSTANTS.DEFAULTS.ENABLE_THINKING;

        // 获取OpenAI客户端实例
        const openai = this.getOpenAIClient();

        // 调用OpenAI API生成文本（流式）
        const createBody: ChatCompletionCreateParamsStreaming = {
            model: model,
            messages: [{ role: 'user', content: prompt }],
            temperature: temperature,
            top_p: topP,
            max_tokens: maxTokens,
            stream: true,
            chat_template_kwargs: { "enable_thinking": enableThinking },
            enable_thinking: enableThinking,
        } as any;

        try {
            const stream = await openai.chat.completions.create(createBody) as Stream<ChatCompletionChunk>;
            for await (const chunk of stream) {
                const content = chunk.choices[0]?.delta?.content || '';
                if (content) {
                    yield content;
                }
            }
        } catch (error: any) {
            console.error('OpenAI API调用失败:', error);
            throw new Error(`OpenAI API调用失败: ${error.message}`);
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

        return this.callOpenAI(prompt, promptTemplate);
    }

    polishCommitMessage(message: string, language: string, promptTemplate: PromptTemplate): AsyncGenerator<string> {
        let prompt = promptTemplate.polishContent
            .replace('{diff}', message)
            .replaceAll('{language}', language);

        return this.callOpenAI(prompt, promptTemplate);
    }
} 