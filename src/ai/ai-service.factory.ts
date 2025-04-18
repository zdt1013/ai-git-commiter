import * as vscode from 'vscode';
import { IAIService } from './ai-service.interface';
import { OpenAIService } from './openai';
import { GeminiService } from './gemini';
import { CONFIG_CONSTANTS } from '../constants';

export class AIServiceFactory {
    private static instance: IAIService | null = null;

    static getAIService(): IAIService {
        if (this.instance) {
            return this.instance;
        }

        const config = vscode.workspace.getConfiguration(CONFIG_CONSTANTS.ROOT);
        const provider = config.get<string>(CONFIG_CONSTANTS.PROVIDER) || CONFIG_CONSTANTS.DEFAULTS.PROVIDER;

        switch (provider) {
            case 'OpenAI':
                this.instance = OpenAIService.getInstance();
                break;
            case 'Gemini':
                this.instance = GeminiService.getInstance();
                break;
            default:
                throw new Error(`不支持的AI服务提供商: ${provider}`);
        }

        return this.instance;
    }

    static resetInstance(): void {
        this.instance = null;
    }
} 