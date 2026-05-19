import { OpenAI, ClientOptions } from 'openai';
import * as vscode from 'vscode';
import { PromptTemplate } from '../types/types';
import { CONFIG_CONSTANTS } from '../constants';
import { IAIService } from './ai-service.interface';
import { AIModel } from '../types/model';
import { ChatCompletionChunk, ChatCompletionCreateParamsStreaming } from 'openai/resources/chat/completions';
import { Stream } from 'openai/streaming';
import { Logger } from '../utils/logger';


export class OpenAIService implements IAIService {
    private static instance: OpenAIService | null = null;
    private openaiClient: OpenAI | null = null;

    private constructor() {
        // 私有构造函数，防止外部直接实例化
        // Private constructor to prevent direct instantiation
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
                throw new Error(vscode.l10n.t("Please configure OpenAI API key in settings"));
            }

            const userAgent = config.get<string>(CONFIG_CONSTANTS.USER_AGENT) || '';
            const clientConfig: ClientOptions = {
                apiKey: apiKey,
                baseURL: baseUrl
            };
            if (userAgent) {
                clientConfig.defaultHeaders = {
                    'User-Agent': userAgent
                };
            }
            this.openaiClient = new OpenAI(clientConfig);
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
            // Extract more info for all models
            const models = response.data
                .map((model: { id: string; owned_by?: string; created: number }) => ({
                    id: model.id,
                    owner_by: model.owned_by || 'unknown',
                    created: model.created
                }));

            return models;
        } catch (error: any) {
            Logger.error(vscode.l10n.t("Failed to get OpenAI model list"), error);
            throw new Error(`Failed to get OpenAI model list: ${error.message}`);
        }
    }

    /**
     * 调用OpenAI API生成文本（流式）
     * @param prompt - 提示词文本
     * @param _promptTemplate - 提示词模板（保留参数以便未来扩展）
     * @returns 返回字符串分片的异步生成器
     */
    private async *callOpenAI(prompt: string, _promptTemplate: PromptTemplate): AsyncGenerator<string> {
        // 从Configure中获取OpenAI相关参数
        const config = vscode.workspace.getConfiguration(CONFIG_CONSTANTS.ROOT);
        const model = config.get<string>(CONFIG_CONSTANTS.OPENAI.MODEL) || CONFIG_CONSTANTS.DEFAULTS.OPENAI.MODEL;
        const temperature = config.get<number>(CONFIG_CONSTANTS.OPENAI.TEMPERATURE) || CONFIG_CONSTANTS.DEFAULTS.OPENAI.TEMPERATURE;
        const topP = config.get<number>(CONFIG_CONSTANTS.OPENAI.TOP_P) || CONFIG_CONSTANTS.DEFAULTS.OPENAI.TOP_P;
        const maxTokens = config.get<number>(CONFIG_CONSTANTS.OPENAI.MAX_TOKENS) || CONFIG_CONSTANTS.DEFAULTS.OPENAI.MAX_TOKENS;
        const enableThinking = config.get<boolean>(CONFIG_CONSTANTS.ENABLE_THINKING) ?? CONFIG_CONSTANTS.DEFAULTS.ENABLE_THINKING;
        const thinkingMode = config.get<'disabled' | 'standard' | 'legacy' | 'vllm'>(CONFIG_CONSTANTS.THINKING_MODE) ?? CONFIG_CONSTANTS.DEFAULTS.THINKING_MODE;

        const isThinkingEnabled = enableThinking && thinkingMode !== 'disabled';
        // 思考模式下 reasoning token 和正文 token 共享 max_tokens，
        // In thinking mode, reasoning token and content token share max_tokens,
        // 在用户Configure值基础上额外追加 4096 作为思考预留，确保正文有足够配额输出。
        const THINKING_EXTRA_TOKENS = 4096;
        const effectiveMaxTokens = isThinkingEnabled ? maxTokens + THINKING_EXTRA_TOKENS : maxTokens;

        // 获取OpenAI客户端实例
        // Get OpenAI client instance
        const openai = this.getOpenAIClient();

        // 调用OpenAI API生成文本（流式）
        // Call OpenAI API to generate text (streaming)
        const createBody: ChatCompletionCreateParamsStreaming = {
            model: model,
            messages: [{ role: 'user', content: prompt }],
            temperature: temperature,
            top_p: topP,
            max_tokens: effectiveMaxTokens,
            stream: true,
            // 根据 thinkingMode 决定传哪个思考参数，始终显式传入，让服务端明确收到开关状态：
            // Decide which thinking parameter to pass based on thinkingMode, always pass explicitly:
            // - disabled: 不传任何思考参数，兼容标准 OpenAI 及大多数服务商
            // - disabled: Do not pass any thinking param, compatible with standard OpenAI and most providers
            // - standard: 新版标准 OpenAI reasoning API（reasoning.effort），适用于 o1/o3 等官方推理模型
            // - standard: New standard OpenAI reasoning API (reasoning_effort), suitable for o1/o3 official models
            //             开启时传 "medium"，关闭时传 "none"
            //             Pass 'medium' when enabled, 'none' when disabled
            // - legacy:   旧版标准接口，直接传 enable_thinking: true/false
            // - legacy: Legacy standard API, directly pass enable_thinking: true/false
            // - vllm:     vllm 部署的思考模型，使用 chat_template_kwargs.enable_thinking 包装
            // - vllm: Thinking model deployed via vllm, wrapped with chat_template_kwargs.enable_thinking
            ...(thinkingMode === 'standard' && {
                reasoning: enableThinking ? { effort: 'medium' } : "none",
            }),
            ...(thinkingMode === 'legacy' && {
                enable_thinking: enableThinking,
            }),
            ...(thinkingMode === 'vllm' && {
                chat_template_kwargs: { enable_thinking: enableThinking },
            }),
        } as any;
        try {
            const stream = await openai.chat.completions.create(createBody) as Stream<ChatCompletionChunk>;
            let hasLoggedReasoning = false;
            let hasLoggedReasoningDone = false;
            for await (const chunk of stream) {
                // vllm 思考模型在思考阶段结束时可能返回 choices 为空的 chunk，跳过
                // vllm thinking model might return empty choices chunk when thinking ends, skip
                if (!chunk.choices || chunk.choices.length === 0) {
                    continue;
                }

                const choice = chunk.choices[0];
                const delta = choice?.delta as any;

                // vllm 部署的思考模型实际字段名为 "reasoning"（非 content/reasoning_content）
                // vllm deployed thinking model actual field name is 'reasoning' (not content/reasoning_content)
                // 正式输出在 content，思考过程在 reasoning，只 yield content，跳过 reasoning
                // Official output in content, thinking process in reasoning, only yield content, skip reasoning
                const reasoning = delta?.reasoning || delta?.reasoning_content || '';
                if (reasoning && !hasLoggedReasoning) {
                    Logger.log(vscode.l10n.t("[OpenAI] Thinking content detected, model is reasoning"));
                    hasLoggedReasoning = true;
                }

                const content = delta?.content || '';
                if (content) {
                    if (hasLoggedReasoning && !hasLoggedReasoningDone) {
                        Logger.log(vscode.l10n.t("[OpenAI] Reasoning complete, starting text output"));
                        hasLoggedReasoningDone = true;
                    }
                    yield content;
                }
            }
        } catch (error: any) {
            Logger.error(vscode.l10n.t("OpenAI API call failed"), error);
            throw new Error(`OpenAI API call failed: ${error.message}`);
        }
    }

    generateCommitMessage(diff: string, language: string, promptTemplate: PromptTemplate, projectInfo?: string): AsyncGenerator<string> {
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

        return this.callOpenAI(prompt, promptTemplate);
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

        return this.callOpenAI(prompt, promptTemplate);
    }
} 