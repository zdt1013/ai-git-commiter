import * as vscode from 'vscode';
import { GitService } from '../../git';
import { BasePromptCommand } from './base-prompt.command';
import { PROMPT_CONSTANTS, GIT_CONSTANTS, AI_CONSTANTS } from '../../constants';
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
            const repository = await GitService.getCurrentRepository();
            if (!repository) {
                vscode.window.showErrorMessage(GIT_CONSTANTS.ERROR.NO_REPOSITORY);
                return;
            }

            // 获取配置
            const config = this.configService.getExtensionConfig();

            // 检查AI配置是否完整
            if (!(await this.configService.checkAIConfig(config, config.provider))) {
                return;
            }

            // 获取用户输入的原始Commit消息
            const message = await vscode.window.showInputBox({
                placeHolder: '请输入简短的Commit消息',
                prompt: '请输入您想要润色的Commit消息'
            });

            if (!message) {
                return;
            }

            // 显示加载中提示
            await vscode.window.withProgress({
                location: vscode.ProgressLocation.SourceControl,
                title: AI_CONSTANTS.PROGRESS.POLISHING,
                cancellable: false
            }, async (_: vscode.Progress<{ message?: string; increment?: number }>) => {
                // 从配置中获取选中的提示词模板
                const promptTemplate = this.promptService.getSelectedPrompt();

                // 使用工厂创建AI服务并润色消息（流式）
                const aiService = AIServiceFactory.getAIService();
                try {
                    const stream = aiService.polishCommitMessage(message, config.language, promptTemplate);
                    let aggregated = '';
                    for await (const chunk of stream) {
                        aggregated += chunk;
                        repository.inputBox.value = aggregated;
                    }
                    // 移除代码块标记符并更新输入框的最终内容
                    repository.inputBox.value = TextUtils.removeCodeBlockMarkers(aggregated.trim());
                    vscode.window.showInformationMessage(AI_CONSTANTS.SUCCESS.POLISH);
                } catch (error: any) {
                    vscode.window.showErrorMessage(error?.message || AI_CONSTANTS.ERROR.POLISH);
                }
                return Promise.resolve();
            });
        } catch (error: any) {
            vscode.window.showErrorMessage(`执行命令时出错: ${error.message}`);
        }
    }
} 