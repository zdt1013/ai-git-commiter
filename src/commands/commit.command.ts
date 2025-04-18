import * as vscode from 'vscode';
import { GitService } from '../git';
import { PromptService } from '../ai/prompt.service';
import { PROMPT_CONSTANTS, GIT_CONSTANTS, AI_CONSTANTS, CONFIG_CONSTANTS } from '../constants';
import { ConfigService } from '../config';
import { AIServiceFactory } from '../ai/ai-service.factory';
import { ExtensionConfig } from '../types/config';
import { Repository } from '../types/git';

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
        if (await GitService.checkChangesLimit(repository, config.git.diff.maxChanges, config.git.diff.area)) {
            await this.handleLargeChanges(repository, config);
        } else {
            await this.handleNormalChanges(repository, config);
        }
    }

    private async handleLargeChanges(repository: Repository, config: ExtensionConfig): Promise<void> {
        const confirmResult = await vscode.window.showWarningMessage(
            GIT_CONSTANTS.ERROR.TOO_MANY_CHANGES(config.git.diff.maxChanges),
            { modal: true },
            GIT_CONSTANTS.BUTTONS.MANUAL_INPUT,
        );

        if (confirmResult !== GIT_CONSTANTS.BUTTONS.MANUAL_INPUT) {
            return;
        }

        const message = await vscode.window.showInputBox({
            placeHolder: GIT_CONSTANTS.INPUT.COMMIT_MESSAGE_PLACEHOLDER,
            prompt: GIT_CONSTANTS.WARNING.MANUAL_INPUT
        });

        if (!message) {
            return;
        }

        const promptTemplate = this.promptService.getSelectedPrompt();
        const aiService = AIServiceFactory.getAIService();
        const result = await aiService.polishCommitMessage(message, config.language, promptTemplate);

        if (result?.success && result.message) {
            repository.inputBox.value = result.message;
            vscode.window.showInformationMessage(AI_CONSTANTS.SUCCESS.POLISH);
        } else {
            vscode.window.showErrorMessage(result?.error || AI_CONSTANTS.ERROR.POLISH);
        }
    }

    private async handleNormalChanges(repository: Repository, config: ExtensionConfig): Promise<void> {
        if (!repository.rootUri) {
            vscode.window.showErrorMessage(GIT_CONSTANTS.ERROR.NO_REPOSITORY);
            return;
        }

        const diff = await GitService.getDiff(repository.rootUri.fsPath, {
            wordDiff: config.git.diff.wordDiff,
            unified: config.git.diff.unified,
            noColor: config.git.diff.noColor,
            diffFilter: config.git.diff.diffFilter,
            filterMeta: config.git.diff.filterMeta,
            area: config.git.diff.area
        });

        if (!diff) {
            vscode.window.showInformationMessage(GIT_CONSTANTS.ERROR.NO_CHANGES, { modal: true });
            return;
        }

        const promptTemplate = this.promptService.getSelectedPrompt();
        const aiService = AIServiceFactory.getAIService();
        const result = await aiService.generateCommitMessage(diff, config.language, promptTemplate);

        if (result?.success && result.message) {
            repository.inputBox.value = result.message;
            vscode.window.showInformationMessage(AI_CONSTANTS.SUCCESS.GENERATE);
        } else {
            vscode.window.showErrorMessage(result?.error || AI_CONSTANTS.ERROR.GENERATE);
        }
    }
} 