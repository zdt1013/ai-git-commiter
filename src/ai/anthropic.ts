import Anthropic from '@anthropic-ai/sdk';
import * as vscode from 'vscode';
import { PromptTemplate } from '../types/types';
import { CONFIG_CONSTANTS } from '../constants';
import { IAIService } from './ai-service.interface';
import { AIModel } from '../types/model';
import { Logger } from '../utils/logger';

export class AnthropicService implements IAIService {
    private static instance: AnthropicService | null = null;
    private anthropicClient: Anthropic | null = null;

    private constructor() {
    }

    resetInstance(): void {
        AnthropicService.instance = null;
    }

    public static getInstance(): AnthropicService {
        if (AnthropicService.instance === null) {
            AnthropicService.instance = new AnthropicService();
        }
        return AnthropicService.instance;
    }

    private getAnthropicClient(): Anthropic {
        if (this.anthropicClient === null) {
            const config = vscode.workspace.getConfiguration(CONFIG_CONSTANTS.ROOT);
            const baseUrl = config.get<string>(CONFIG_CONSTANTS.ANTHROPIC.BASE_URL) || CONFIG_CONSTANTS.DEFAULTS.ANTHROPIC.BASE_URL;
            const apiKey = config.get<string>(CONFIG_CONSTANTS.ANTHROPIC.API_KEY);

            if (!apiKey) {
                throw new Error('请在设置中配置Anthropic API密钥');
            }

            this.anthropicClient = new Anthropic({
                apiKey: apiKey,
                baseURL: baseUrl
            });
        }
        return this.anthropicClient;
    }

    public async getAvailableModels(): Promise<AIModel[]> {
        throw new Error('当前AI服务商不支持读取可用模型列表');
    }

    private async *callAnthropic(prompt: string, _promptTemplate: PromptTemplate): AsyncGenerator<string> {
        const config = vscode.workspace.getConfiguration(CONFIG_CONSTANTS.ROOT);
        const model = config.get<string>(CONFIG_CONSTANTS.ANTHROPIC.MODEL) || CONFIG_CONSTANTS.DEFAULTS.ANTHROPIC.MODEL;
        const temperature = config.get<number>(CONFIG_CONSTANTS.ANTHROPIC.TEMPERATURE) ?? CONFIG_CONSTANTS.DEFAULTS.ANTHROPIC.TEMPERATURE;
        const topP = config.get<number>(CONFIG_CONSTANTS.ANTHROPIC.TOP_P) ?? CONFIG_CONSTANTS.DEFAULTS.ANTHROPIC.TOP_P;
        const maxTokens = config.get<number>(CONFIG_CONSTANTS.ANTHROPIC.MAX_TOKENS) ?? CONFIG_CONSTANTS.DEFAULTS.ANTHROPIC.MAX_TOKENS;

        const client = this.getAnthropicClient();

        try {
            const stream = client.messages.stream({
                model: model,
                messages: [{ role: 'user', content: prompt }],
                temperature: temperature,
                top_p: topP,
                max_tokens: maxTokens,
            });

            for await (const event of stream) {
                if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
                    yield event.delta.text;
                }
            }
        } catch (error: any) {
            Logger.error('Anthropic API调用失败', error);
            throw new Error(`Anthropic API调用失败: ${error.message}`);
        }
    }

    generateCommitMessage(diff: string, language: string, promptTemplate: PromptTemplate): AsyncGenerator<string> {
        let prompt = promptTemplate.content
            .replace('{diff}', diff)
            .replaceAll('{language}', language);

        const config = vscode.workspace.getConfiguration(CONFIG_CONSTANTS.ROOT);
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

        return this.callAnthropic(prompt, promptTemplate);
    }

    polishCommitMessage(message: string, language: string, promptTemplate: PromptTemplate): AsyncGenerator<string> {
        let prompt = promptTemplate.polishContent
            .replace('{diff}', message)
            .replaceAll('{language}', language);

        return this.callAnthropic(prompt, promptTemplate);
    }
}
