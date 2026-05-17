import * as vscode from 'vscode';
import { GitService } from '../../git';
import { BasePromptCommand } from './base-prompt.command';
import { GIT_CONSTANTS, AI_CONSTANTS } from '../../constants';
import { ConfigService } from '../../config';
import { AIServiceFactory } from '../../ai/ai-service.factory';
import { TextUtils } from '../../utils/text-utils';

export class ManualPolishCommand extends BasePromptCommand {
    constructor(
        context: vscode.ExtensionContext,
        promptService: any,
        private readonly configService: ConfigService
    ) {
        super(context, promptService);
    }

    public async execute(): Promise<void> {
        try {
            // 获取Git仓库
            // Get Git repository
            const repository = await GitService.getCurrentRepository(null);
            if (!repository) {
                vscode.window.showErrorMessage(GIT_CONSTANTS.ERROR.NO_REPOSITORY);
                return;
            }

            // 获取Configure
            const config = this.configService.getExtensionConfig();

            // 检查AIConfigure是否完整
            if (!(await this.configService.checkAIConfig(config, config.provider))) {
                return;
            }

            // 获取用户输入的原始Commit消息
            // Get original commit message from user input
            const message = await vscode.window.showInputBox({
                placeHolder: vscode.l10n.t("Please enter a short commit message"),
                prompt: vscode.l10n.t("Please enter the commit message to polish")
            });

            if (!message) {
                return;
            }

            // 显示加载中提示
            // Show loading indicator
            await vscode.window.withProgress({
                location: vscode.ProgressLocation.SourceControl,
                title: AI_CONSTANTS.PROGRESS.POLISHING,
                cancellable: false
            }, async (_: vscode.Progress<{ message?: string; increment?: number }>) => {
                // 从Configure中获取选中的提示词模板
                const promptTemplate = this.promptService.getSelectedPrompt();

                // 使用工厂创建AI服务并润色消息（流式）
                // Use factory to create AI service and polish message (streaming)
                const aiService = AIServiceFactory.getAIService();
                try {
                    const stream = aiService.polishCommitMessage(message, config.language, promptTemplate);
                    let aggregated = '';
                    for await (const chunk of stream) {
                        aggregated += chunk;
                        repository.inputBox.value = aggregated;
                    }
                    // 移除代码块标记符并更新输入框的最终内容
                    // Remove code block markers and update final input box content
                    repository.inputBox.value = TextUtils.removeCodeBlockMarkers(aggregated.trim());
                    vscode.window.showInformationMessage(AI_CONSTANTS.SUCCESS.POLISH);
                } catch (error: any) {
                    vscode.window.showErrorMessage(error?.message || AI_CONSTANTS.ERROR.POLISH);
                }
                return Promise.resolve();
            });
        } catch (error: any) {
            vscode.window.showErrorMessage(vscode.l10n.t("Error executing command: {0}", error.message));
        }
    }
} 