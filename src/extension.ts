import * as vscode from 'vscode';
import { GitService } from './git';
import { PromptService } from './ai/prompt.service';
import { PROMPT_CONSTANTS, GIT_CONSTANTS, AI_CONSTANTS } from './constants';
import { ConfigService } from './config';
import { AIServiceFactory } from './ai/ai-service.factory';

// 激活扩展
export function activate(context: vscode.ExtensionContext) {
    const extensionName = context.extension.packageJSON.displayName;
    console.log(`${extensionName} is activated.`);

    // 初始化服务
    const promptService = new PromptService(context);
    const configService = new ConfigService();

    // 注册命令
    let disposable = vscode.commands.registerCommand(PROMPT_CONSTANTS.COMMANDS.GENERATE_COMMIT_MESSAGE, async () => {
        try {
            // 获取Git仓库
            const repository = await GitService.getCurrentRepository();
            if (!repository) {
                vscode.window.showErrorMessage(GIT_CONSTANTS.ERROR.NO_REPOSITORY);
                return;
            }

            // 获取配置
            const config = configService.getExtensionConfig();

            // 检查AI配置是否完整
            if (!(await configService.checkAIConfig(config, config.provider))) {
                return;
            }


            // 否则直接使用AI生成Commit消息
            // 显示加载中提示
            vscode.window.withProgress({
                location: vscode.ProgressLocation.SourceControl,
                title: AI_CONSTANTS.PROGRESS.TITLE,
                cancellable: false
            }, async (_: vscode.Progress<{ message?: string; increment?: number }>) => {
                // 检查变更行数
                if (await GitService.checkChangesLimit(repository, config.git.diff.maxChanges)) {
                    // 如果变更行数超过限制，提示用户手动输入
                    // 提示用户变更行数过多
                    const confirmResult = await vscode.window.showWarningMessage(
                        GIT_CONSTANTS.ERROR.TOO_MANY_CHANGES(config.git.diff.maxChanges),
                        { modal: true },
                        '手动输入',
                    );
                    if (confirmResult !== '手动输入') {
                        return;
                    }

                    const message = await vscode.window.showInputBox({
                        placeHolder: '请输入简短的Commit消息',
                        prompt: GIT_CONSTANTS.WARNING.MANUAL_INPUT
                    });

                    if (!message) {
                        return;
                    }

                    // 从配置中获取选中的提示词模板
                    const promptTemplate = promptService.getSelectedPrompt();

                    // 使用工厂创建AI服务并润色消息
                    const aiService = AIServiceFactory.createService();
                    const result = await aiService.polishCommitMessage(message, config.language, promptTemplate);

                    if (result?.success && result.message) {
                        repository.inputBox.value = result.message;
                        vscode.window.showInformationMessage(AI_CONSTANTS.SUCCESS.POLISH);
                    } else {
                        vscode.window.showErrorMessage(result?.error || AI_CONSTANTS.ERROR.POLISH);
                    }
                } else {
                    // 获取Git差异
                    if (!repository.rootUri) {
                        vscode.window.showErrorMessage(GIT_CONSTANTS.ERROR.NO_REPOSITORY);
                        return;
                    }
                    const diff = await GitService.getDiff(repository.rootUri.fsPath, config.git.diff);

                    if (!diff) {
                        vscode.window.showInformationMessage(GIT_CONSTANTS.ERROR.NO_CHANGES, { modal: true });
                        return;
                    }

                    // 从配置中获取选中的提示词模板
                    const promptTemplate = promptService.getSelectedPrompt()
                    // 使用工厂创建AI服务并生成Commit消息
                    const aiService = AIServiceFactory.createService();
                    const result = await aiService.generateCommitMessage(diff, config.language, promptTemplate);

                    if (result?.success && result.message) {
                        // 设置Commit消息
                        repository.inputBox.value = result.message;
                        vscode.window.showInformationMessage(AI_CONSTANTS.SUCCESS.GENERATE);
                    } else {
                        vscode.window.showErrorMessage(result?.error || AI_CONSTANTS.ERROR.GENERATE);
                    }
                }
                return Promise.resolve();
            });
        } catch (error: any) {
            vscode.window.showErrorMessage(`执行命令时出错: ${error.message}`);
        }
    });

    context.subscriptions.push(disposable);
}

// 停用扩展
export function deactivate() { }
