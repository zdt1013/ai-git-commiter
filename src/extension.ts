import * as vscode from 'vscode';
import { GitService } from './git';
import { OpenAIService } from './ai/openai';
import { GeminiService } from './ai/gemini';
import { PromptManager } from './promptManager';
import { PromptTemplate } from './types/types';
import { Repository } from './types/git';
import { PROMPT_CONSTANTS, GIT_CONSTANTS, AI_CONSTANTS, CONFIG_CONSTANTS } from './constants';
import { ConfigService } from './config';

/**
 * 润色用户输入的Commit消息
 * @param message 用户输入的原始消息
 * @param language 语言
 * @param promptTemplate 提示词模板
 * @param provider AI提供商
 * @returns 润色后的消息
 */
async function polishCommitMessage(
    message: string,
    language: string,
    promptTemplate: PromptTemplate,
    provider: string
): Promise<string | undefined> {
    try {
        let result;
        if (provider === CONFIG_CONSTANTS.PROVIDERS.OPENAI) {
            result = await OpenAIService.polishCommitMessage(message, language, promptTemplate);
        } else if (provider === CONFIG_CONSTANTS.PROVIDERS.GEMINI) {
            result = await GeminiService.polishCommitMessage(message, language, promptTemplate);
        }
        return result?.message;
    } catch (error) {
        throw error;
    }
}

// 激活扩展
export function activate(context: vscode.ExtensionContext) {
    const extensionName = context.extension.packageJSON.displayName;
    console.log(`${extensionName} is activated.`);

    // 初始化服务
    const promptManager = new PromptManager(context);
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

            // 检查变更行数
            if (await GitService.checkChangesLimit(repository, config.git.diff.maxChanges)) {
                // 提示用户变更行数过多
                const result = await vscode.window.showWarningMessage(
                    GIT_CONSTANTS.ERROR.TOO_MANY_CHANGES(config.git.diff.maxChanges),
                    { modal: true },
                    '手动输入',
                    '取消'
                );

                if (result === '手动输入') {
                    const message = await vscode.window.showInputBox({
                        placeHolder: '请输入简短的Commit消息',
                        prompt: GIT_CONSTANTS.WARNING.MANUAL_INPUT
                    });

                    if (!message) {
                        return;
                    }

                    // 显示加载中提示
                    vscode.window.withProgress({
                        location: vscode.ProgressLocation.SourceControl,
                        title: AI_CONSTANTS.PROGRESS.POLISHING,
                        cancellable: false
                    }, async (_: vscode.Progress<{ message?: string; increment?: number }>) => {
                        try {
                            // 创建提示词模板
                            const promptTemplate: PromptTemplate = {
                                id: 'default',
                                name: '默认提示词',
                                content: config.prompt.selectedTemplatePrompt,
                                preferredLanguages: [],
                                preferredLibraries: [],
                                source: 'local'
                            };

                            const polishedMessage = await polishCommitMessage(message, config.language, promptTemplate, config.provider);
                            if (polishedMessage) {
                                repository.inputBox.value = polishedMessage;
                                vscode.window.showInformationMessage(AI_CONSTANTS.SUCCESS.POLISH);
                            } else {
                                vscode.window.showErrorMessage(AI_CONSTANTS.ERROR.POLISH);
                            }
                        } catch (error: any) {
                            vscode.window.showErrorMessage(`${AI_CONSTANTS.ERROR.POLISH}: ${error.message}`);
                        }
                        return Promise.resolve();
                    });
                }
                return;
            }

            // 显示加载中提示
            vscode.window.withProgress({
                location: vscode.ProgressLocation.SourceControl,
                title: AI_CONSTANTS.PROGRESS.TITLE,
                cancellable: false
            }, async (_: vscode.Progress<{ message?: string; increment?: number }>) => {
                try {
                    // 获取Git差异
                    if (!repository.rootUri) {
                        vscode.window.showErrorMessage(GIT_CONSTANTS.ERROR.NO_REPOSITORY);
                        return;
                    }
                    const diff = await GitService.getDiff(repository.rootUri.fsPath, config.git.diff);

                    if (!diff) {
                        vscode.window.showInformationMessage(GIT_CONSTANTS.ERROR.NO_CHANGES);
                        return;
                    }

                    // 创建提示词模板
                    const promptTemplate: PromptTemplate = {
                        id: 'default',
                        name: '默认提示词',
                        content: config.prompt.selectedTemplatePrompt,
                        preferredLanguages: [],
                        preferredLibraries: [],
                        source: 'local'
                    };

                    // 根据提供商生成Commit消息
                    let result;
                    if (config.provider === CONFIG_CONSTANTS.PROVIDERS.OPENAI) {
                        result = await OpenAIService.generateCommitMessage(diff, config.language, promptTemplate);
                    } else if (config.provider === CONFIG_CONSTANTS.PROVIDERS.GEMINI) {
                        result = await GeminiService.generateCommitMessage(diff, config.language, promptTemplate);
                    }

                    if (result?.success && result.message) {
                        // 设置Commit消息
                        repository.inputBox.value = result.message;
                        vscode.window.showInformationMessage(AI_CONSTANTS.SUCCESS.GENERATE);
                    } else {
                        vscode.window.showErrorMessage(result?.error || AI_CONSTANTS.ERROR.GENERATE);
                    }
                } catch (error: any) {
                    vscode.window.showErrorMessage(`${AI_CONSTANTS.ERROR.GENERATE}: ${error.message}`);
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
