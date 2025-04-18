import * as vscode from 'vscode';
import { BasePromptCommand } from './base-prompt.command';
import { PROMPT_CONSTANTS } from '../../constants';

export class SelectPromptCommand extends BasePromptCommand {
    public async execute(): Promise<void> {
        try {
            // 让用户选择要使用的提示词
            const selected = await this.selectPrompt(PROMPT_CONSTANTS.PROMPT_MANAGEMENT.SELECT.USE);
            if (!selected) return;

            // 更新设置项为选中的提示词
            await this.promptService.updateSelectedPrompt(selected);

            vscode.window.showInformationMessage(PROMPT_CONSTANTS.PROMPT_MANAGEMENT.SUCCESS.USE(selected.name));
        } catch (error: any) {
            vscode.window.showErrorMessage(`选择提示词时出错: ${error.message}`);
        }
    }
} 