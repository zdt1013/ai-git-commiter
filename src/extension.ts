import * as vscode from 'vscode';
import { GitService } from './git';
import { OpenAIService } from './ai/openai';
import { GeminiService } from './ai/gemini';
import { PromptManager } from './promptManager';
import { PromptTemplate } from './types';
import { PROMPT_CONSTANTS, GIT_CONSTANTS, AI_CONSTANTS, CONFIG_CONSTANTS } from './constants';

/**
 * 检查AI配置是否完整
 * @param config VS Code配置
 * @param provider AI提供商
 * @returns 配置是否完整
 */
function checkAIConfig(config: vscode.WorkspaceConfiguration, provider: string): boolean {
    if (provider === CONFIG_CONSTANTS.PROVIDERS.OPENAI) {
        const apiKey = config.get<string>(CONFIG_CONSTANTS.OPENAI.API_KEY);
        const model = config.get<string>(CONFIG_CONSTANTS.OPENAI.MODEL);
        const baseUrl = config.get<string>(CONFIG_CONSTANTS.OPENAI.BASE_URL);
        if (!baseUrl) {
            vscode.window.showErrorMessage('请在设置中配置OpenAI API基础URL');
            return false;
        }
        if (!apiKey) {
            vscode.window.showErrorMessage('请在设置中配置OpenAI API密钥');
            return false;
        }
        if (!model) {
            vscode.window.showErrorMessage('请在设置中配置OpenAI模型');
            return false;
        }
    } else if (provider === CONFIG_CONSTANTS.PROVIDERS.GEMINI) {
        const apiKey = config.get<string>(CONFIG_CONSTANTS.GEMINI.API_KEY);
        if (!apiKey) {
            vscode.window.showErrorMessage('请在设置中配置Google Gemini API密钥');
            return false;
        }
    }
    return true;
}

// 激活扩展
export function activate(context: vscode.ExtensionContext) {
    const extensionName = context.extension.packageJSON.displayName;
    console.log(`${extensionName} is activated.`);

    // 初始化提示词管理器
    const promptManager = new PromptManager(context);

    // 注册命令
    let disposable = vscode.commands.registerCommand(PROMPT_CONSTANTS.COMMANDS.GENERATE_COMMIT_MESSAGE, async () => {
        try {
            // 获取Git仓库
            const repository = await GitService.getCurrentRepository();
            if (!repository) {
                vscode.window.showErrorMessage(GIT_CONSTANTS.ERROR.NO_REPOSITORY);
                return;
            }

            // 显示加载中提示
            vscode.window.withProgress({
                location: vscode.ProgressLocation.SourceControl,
                title: AI_CONSTANTS.PROGRESS.TITLE,
                cancellable: false
            }, async (_: vscode.Progress<{ message?: string; increment?: number }>) => {
                try {
                    // 获取配置
                    const config = vscode.workspace.getConfiguration(CONFIG_CONSTANTS.ROOT);
                    const provider = config.get<string>('provider') || CONFIG_CONSTANTS.PROVIDERS.OPENAI;

                    // 检查AI配置是否完整
                    if (!checkAIConfig(config, provider)) {
                        return;
                    }

                    // 获取Git差异
                    const diff = await GitService.getDiff(repository.rootUri.fsPath);

                    if (!diff) {
                        vscode.window.showInformationMessage(GIT_CONSTANTS.ERROR.NO_CHANGES);
                        return;
                    }

                    const language = config.get<string>(CONFIG_CONSTANTS.LANGUAGE)!;
                    const customPrompt = config.get<string>(CONFIG_CONSTANTS.PROMPT.SELECTED_TEMPLATE_PROMPT) || '';

                    // 创建提示词模板
                    const promptTemplate: PromptTemplate = {
                        id: 'default',
                        name: '默认提示词',
                        content: customPrompt,
                        preferredLanguages: [],
                        preferredLibraries: [],
                        source: 'local'
                    };

                    // 根据提供商生成Commit消息
                    let result;
                    if (provider === CONFIG_CONSTANTS.PROVIDERS.OPENAI) {
                        result = await OpenAIService.generateCommitMessage(diff, language, promptTemplate);
                    } else if (provider === CONFIG_CONSTANTS.PROVIDERS.GEMINI) {
                        result = await GeminiService.generateCommitMessage(diff, language, promptTemplate);
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
