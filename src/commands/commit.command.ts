import * as vscode from 'vscode';
import { GitService } from '../git';
import { PromptService } from '../ai/prompt.service';
import { GIT_CONSTANTS, AI_CONSTANTS } from '../constants';
import { ConfigService } from '../config';
import { AIServiceFactory } from '../ai/ai-service.factory';
import { ExtensionConfig } from '../types/config';
import { Repository } from '../types/git';
import { TextUtils } from '../utils/text-utils';

export class CommitCommand {
    constructor(
        private readonly context: vscode.ExtensionContext,
        private readonly promptService: PromptService,
        private readonly configService: ConfigService
    ) { }

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

            // 显示加载中提示
            await vscode.window.withProgress({
                location: vscode.ProgressLocation.SourceControl,
                title: AI_CONSTANTS.PROGRESS.TITLE,
                cancellable: false
            }, async (_: vscode.Progress<{ message?: string; increment?: number }>) => {
                await this.handleCommitMessageGeneration(repository, config);
                return Promise.resolve();
            });
        } catch (error: any) {
            vscode.window.showErrorMessage(`执行命令时出错: ${error.message}`);
        }
    }

    private async handleCommitMessageGeneration(repository: Repository, config: ExtensionConfig): Promise<void> {
        // 检查变更行数
        if (await GitService.checkChangesLimit(repository, config.git.diff.maxChanges, config.git.diff.area, config.git.diff.diffFilter)) {
            await this.handleLargeChanges(repository, config);
        } else {
            await this.handleNormalChanges(repository, config);
        }
    }

    /**
     * 处理大量变更的情况
     * @param repository - 仓库对象，包含仓库相关信息
     * @param config - 扩展配置对象，包含各种配置参数
     */
    private async handleLargeChanges(repository: Repository, config: ExtensionConfig): Promise<void> {
        // 显示警告消息，提示变更数量过多，并提供手动输入按钮
        const confirmResult = await vscode.window.showWarningMessage(
            GIT_CONSTANTS.ERROR.TOO_MANY_CHANGES(config.git.diff.maxChanges), // 使用配置中的最大变更数生成错误消息
            { modal: true }, // 设置为模态对话框
            GIT_CONSTANTS.BUTTONS.MANUAL_INPUT, // 提供手动输入按钮选项
        );

        // 如果用户没有点击手动输入按钮，则直接返回
        if (confirmResult !== GIT_CONSTANTS.BUTTONS.MANUAL_INPUT) {
            return;
        }

        // 显示输入框，让用户输入提交信息
        const message = await vscode.window.showInputBox({
            placeHolder: GIT_CONSTANTS.INPUT.COMMIT_MESSAGE_PLACEHOLDER, // 输入框占位符文本
            prompt: GIT_CONSTANTS.WARNING.MANUAL_INPUT // 输入框提示文本
        });

        // 如果用户没有输入消息，则直接返回
        if (!message) {
            return;
        }

        // 获取当前选定的提示模板
        const promptTemplate = this.promptService.getSelectedPrompt();
        // 获取AI服务实例
        const aiService = AIServiceFactory.getAIService();
        try {
            // 使用AI服务优化提交信息，以流式方式处理
            const stream = aiService.polishCommitMessage(message, config.language, promptTemplate);
            let aggregated = ''; // 用于累积流式数据的变量
            // 遍历流式数据，实时更新输入框内容
            for await (const chunk of stream) {
                aggregated += chunk;
                repository.inputBox.value = aggregated;
            }
            // 移除代码块标记符并更新输入框的最终内容
            repository.inputBox.value = TextUtils.removeCodeBlockMarkers(aggregated.trim());
            // 显示成功消息
            vscode.window.showInformationMessage(AI_CONSTANTS.SUCCESS.POLISH);
        } catch (error: any) {
            // 显示错误消息，使用错误对象的message属性或默认错误消息
            vscode.window.showErrorMessage(error?.message || AI_CONSTANTS.ERROR.POLISH);
        }
    }

    /**
     * 处理普通变更情况，生成提交信息
     * @param repository - 仓库对象，包含仓库相关信息
     * @param config - 扩展配置对象，包含各种设置选项
     */
    private async handleNormalChanges(repository: Repository, config: ExtensionConfig): Promise<void> {
        // 检查仓库是否存在根目录URI，如果不存在则显示错误信息并返回
        if (!repository.rootUri) {
            vscode.window.showErrorMessage(GIT_CONSTANTS.ERROR.NO_REPOSITORY);
            return;
        }

        // 获取Git差异信息，使用配置中的各种diff选项
        const diff = await GitService.getDiff(repository.rootUri.fsPath, {
            wordDiff: config.git.diff.wordDiff,       // 是否启用词级差异
            unified: config.git.diff.unified,         // 统一差异格式的上下文行数
            noColor: config.git.diff.noColor,         // 是否禁用颜色输出
            diffFilter: config.git.diff.diffFilter,   // 差异过滤器，指定显示哪些类型的变更
            filterMeta: config.git.diff.filterMeta,   // 过滤元数据
            area: config.git.diff.area                 // 指定差异区域
        });

        // 如果没有检测到任何变更，显示提示信息并返回
        if (!diff) {
            vscode.window.showInformationMessage(GIT_CONSTANTS.ERROR.NO_CHANGES, { modal: true });
            return;
        }

        // 获取选定的提示模板和AI服务实例
        const promptTemplate = this.promptService.getSelectedPrompt();
        const aiService = AIServiceFactory.getAIService();
        try {
            // 生成提交信息的流式处理
            const stream = aiService.generateCommitMessage(diff, config.language, promptTemplate);
            let aggregated = '';
            // 逐步处理流式数据并更新输入框内容
            for await (const chunk of stream) {
                aggregated += chunk;
                repository.inputBox.value = aggregated;
            }
            // 移除代码块标记并更新最终输入框内容，显示成功信息
            repository.inputBox.value = TextUtils.removeCodeBlockMarkers(aggregated.trim());
            vscode.window.showInformationMessage(AI_CONSTANTS.SUCCESS.GENERATE);
        } catch (error: any) {
            // 处理生成过程中可能出现的错误
            vscode.window.showErrorMessage(error?.message || AI_CONSTANTS.ERROR.GENERATE);
        }
    }
} 