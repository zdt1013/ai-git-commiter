import * as vscode from 'vscode';
import { PROMPT_CONSTANTS, AI_CONSTANTS, CONFIG_CONSTANTS } from '../constants';
import { ConfigService } from '../config';
import { AIServiceFactory } from '../ai/ai-service.factory';

export class SwitchModelCommand {
    constructor(
        private readonly context: vscode.ExtensionContext,
        private readonly configService: ConfigService
    ) { }

    public async execute(): Promise<void> {
        try {
            // 获取配置
            const config = this.configService.getExtensionConfig();

            // 检查当前提供商是否为OpenAI
            if (config.provider !== CONFIG_CONSTANTS.PROVIDERS.OPENAI) {
                vscode.window.showInformationMessage(AI_CONSTANTS.ERROR.UNSUPPORTED_PROVIDER);
                return;
            }

            // 检查是否设置了baseUrl
            if (!config.openai.baseUrl) {
                vscode.window.showErrorMessage(AI_CONSTANTS.ERROR.NO_BASE_URL);
                return;
            }

            // 显示加载中提示
            await vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: AI_CONSTANTS.PROGRESS.LOADING_MODELS,
                cancellable: false
            }, async (_: vscode.Progress<{ message?: string; increment?: number }>) => {
                await this.handleModelSwitch();
                return Promise.resolve();
            });
        } catch (error: any) {
            vscode.window.showErrorMessage(`执行命令时出错: ${error.message}`);
        }
    }

    private async handleModelSwitch(): Promise<void> {
        try {
            // 创建AI服务并获取可用模型列表
            const aiService = AIServiceFactory.getAIService();

            if (!aiService.getAvailableModels) {
                vscode.window.showInformationMessage(AI_CONSTANTS.ERROR.UNSUPPORTED_PROVIDER);
                return;
            }

            const models = await aiService.getAvailableModels();

            if (models.length === 0) {
                vscode.window.showInformationMessage(AI_CONSTANTS.ERROR.NO_AVAILABLE_MODELS);
                return;
            }

            // 准备下拉列表项
            const items = models.map(model => ({
                label: model.id,
                description: model.owner_by,
                detail: `创建时间: ${new Date(model.created * 1000).toLocaleDateString()}`,
                model: model
            }));

            // 显示模型选择下拉框
            const selectedItem = await vscode.window.showQuickPick(items, {
                placeHolder: AI_CONSTANTS.UI.MODEL_SELECTION_PLACEHOLDER,
                title: AI_CONSTANTS.UI.MODEL_SELECTION_TITLE
            });

            if (selectedItem) {
                // 更新配置
                await vscode.workspace.getConfiguration(CONFIG_CONSTANTS.ROOT).update(
                    CONFIG_CONSTANTS.OPENAI.MODEL,
                    selectedItem.model.id,
                    vscode.ConfigurationTarget.Global
                );

                // 重置AI服务实例
                AIServiceFactory.resetInstance();

                vscode.window.showInformationMessage(AI_CONSTANTS.SUCCESS.SWITCH_MODEL);
            }
        } catch (error: any) {
            vscode.window.showErrorMessage(`${AI_CONSTANTS.ERROR.LOAD_MODELS}: ${error.message}`);
        }
    }
} 