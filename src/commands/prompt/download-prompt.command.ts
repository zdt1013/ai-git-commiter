import * as vscode from 'vscode';
import { BasePromptCommand } from './base-prompt.command';
import { PROMPT_CONSTANTS } from '../../constants';

export class DownloadPromptCommand extends BasePromptCommand {
    public async execute(): Promise<void> {
        try {
            // 获取用户输入的远程URL
            // Get remote URL from user input
            const url = await vscode.window.showInputBox({
                prompt: PROMPT_CONSTANTS.PROMPT_MANAGEMENT.INPUT.REMOTE_URL.PROMPT,
                placeHolder: PROMPT_CONSTANTS.PROMPT_MANAGEMENT.INPUT.REMOTE_URL.PLACEHOLDER
            });

            // 下载并合并远程提示词
            // Download and merge remote prompts
            if (url) {
                await this.promptService.downloadPrompts(url);
            }
        } catch (error: any) {
            vscode.window.showErrorMessage(vscode.l10n.t("Error downloading prompt: {0}", error.message));
        }
    }
} 