import * as vscode from 'vscode';
import { ExtensionConfig } from './types/config';
import { CONFIG_CONSTANTS } from './constants';
import { AIServiceFactory } from './ai/ai-service.factory';

/**
 * 配置服务类 - 单例模式
 */
export class ConfigService {
    private static _instance: ConfigService | null = null;
    private static _initializing: Promise<void> | null = null;
    private _onDidChangeConfig: vscode.EventEmitter<void> = new vscode.EventEmitter<void>();
    private _disposables: vscode.Disposable[] = [];
    public readonly onDidChangeConfig: vscode.Event<void> = this._onDidChangeConfig.event;

    private constructor() {
        // 监听配置变更
        this._disposables.push(
            vscode.workspace.onDidChangeConfiguration(e => {
                if (e.affectsConfiguration(`${CONFIG_CONSTANTS.ROOT}.${CONFIG_CONSTANTS.PROVIDER}`)) {
                    // 当供应商设置变更时，重置AI服务实例
                    AIServiceFactory.resetInstance();
                    this._onDidChangeConfig.fire();
                }
            })
        );
    }

    /**
     * 初始化配置服务
     */
    private async initialize(): Promise<void> {
        // 这里可以添加任何需要的异步初始化逻辑
        // 目前没有异步初始化需求，但保留此方法以保持一致性
        await Promise.resolve();
    }

    /**
     * 获取 ConfigService 实例
     * @returns Promise<ConfigService> 初始化完成的 ConfigService 实例
     */
    public static async getInstance(): Promise<ConfigService> {
        if (!ConfigService._instance) {
            ConfigService._instance = new ConfigService();
            ConfigService._initializing = ConfigService._instance.initialize();
        }

        // 等待初始化完成
        await ConfigService._initializing;
        return ConfigService._instance;
    }

    /**
     * 获取扩展配置
     * @returns 扩展配置对象
     */
    public getExtensionConfig(): ExtensionConfig {
        const config = vscode.workspace.getConfiguration(CONFIG_CONSTANTS.ROOT);

        return {
            provider: config.get<string>('provider') || CONFIG_CONSTANTS.PROVIDERS.OPENAI,
            language: config.get<string>(CONFIG_CONSTANTS.LANGUAGE) || CONFIG_CONSTANTS.DEFAULTS.LANGUAGE,
            openai: {
                apiKey: config.get<string>(CONFIG_CONSTANTS.OPENAI.API_KEY) || '',
                model: config.get<string>(CONFIG_CONSTANTS.OPENAI.MODEL) || CONFIG_CONSTANTS.DEFAULTS.OPENAI.MODEL,
                baseUrl: config.get<string>(CONFIG_CONSTANTS.OPENAI.BASE_URL) || CONFIG_CONSTANTS.DEFAULTS.OPENAI.BASE_URL
            },
            gemini: {
                apiKey: config.get<string>(CONFIG_CONSTANTS.GEMINI.API_KEY) || ''
            },
            git: {
                diff: {
                    wordDiff: config.get<boolean>(CONFIG_CONSTANTS.GIT.DIFF.WORD_DIFF) ?? CONFIG_CONSTANTS.DEFAULTS.GIT.DIFF.WORD_DIFF,
                    unified: config.get<number>(CONFIG_CONSTANTS.GIT.DIFF.UNIFIED) ?? CONFIG_CONSTANTS.DEFAULTS.GIT.DIFF.UNIFIED,
                    noColor: config.get<boolean>(CONFIG_CONSTANTS.GIT.DIFF.NO_COLOR) ?? CONFIG_CONSTANTS.DEFAULTS.GIT.DIFF.NO_COLOR,
                    diffFilter: config.get<string>(CONFIG_CONSTANTS.GIT.DIFF.DIFF_FILTER) ?? CONFIG_CONSTANTS.DEFAULTS.GIT.DIFF.DIFF_FILTER,
                    filterMeta: config.get<boolean>(CONFIG_CONSTANTS.GIT.DIFF.FILTER_META) ?? CONFIG_CONSTANTS.DEFAULTS.GIT.DIFF.FILTER_META,
                    maxChanges: config.get<number>(CONFIG_CONSTANTS.GIT.DIFF.MAX_CHANGES) ?? CONFIG_CONSTANTS.DEFAULTS.GIT.DIFF.MAX_CHANGES
                }
            },
            prompt: {
                selectedTemplatePrompt: config.get<string>(CONFIG_CONSTANTS.PROMPT.SELECTED_TEMPLATE_PROMPT) || '',
                selectedPromptTemplateId: config.get<string>(CONFIG_CONSTANTS.PROMPT.SELECTED_PROMPT_TEMPLATE_ID) || '',
            }
        };
    }

    /**
     * 检查AI配置是否完整
     * @param config 扩展配置
     * @param provider AI提供商
     * @returns 配置是否完整
     */
    public async checkAIConfig(config: ExtensionConfig, provider: string): Promise<boolean> {
        if (provider === CONFIG_CONSTANTS.PROVIDERS.OPENAI) {
            const { apiKey, model, baseUrl } = config.openai;
            if (!baseUrl || !apiKey || !model) {
                const result = await vscode.window.showWarningMessage(
                    'OpenAI配置不完整，是否立即配置？',
                    { modal: true },
                    '配置',
                );

                if (result === '配置') {
                    await vscode.commands.executeCommand('workbench.action.openSettings', CONFIG_CONSTANTS.ROOT);
                }
                return false;
            }
        } else if (provider === CONFIG_CONSTANTS.PROVIDERS.GEMINI) {
            const { apiKey } = config.gemini;
            if (!apiKey) {
                const result = await vscode.window.showWarningMessage(
                    'Gemini配置不完整，是否立即配置？',
                    { modal: true },
                    '配置',
                );

                if (result === '配置') {
                    await vscode.commands.executeCommand('workbench.action.openSettings', CONFIG_CONSTANTS.ROOT);
                }
                return false;
            }
        }
        return true;
    }

    dispose() {
        this._disposables.forEach(d => d.dispose());
        this._onDidChangeConfig.dispose();
    }
} 