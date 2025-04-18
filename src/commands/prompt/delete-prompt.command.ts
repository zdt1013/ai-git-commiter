import * as vscode from 'vscode';
import { BasePromptCommand } from './base-prompt.command';
import { PROMPT_CONSTANTS } from '../../constants';

export class DeletePromptCommand extends BasePromptCommand {
    public async execute(): Promise<void> {
        try {
            // 让用户选择要删除的提示词
            const selected = await this.selectPrompt(PROMPT_CONSTANTS.PROMPT_MANAGEMENT.SELECT.DELETE);
            if (!selected) return;

            // 检查是否为默认提示词（不可删除）
            if (this.isDefaultPrompt(selected)) {
                vscode.window.showWarningMessage('默认提示词不能删除');
                return;
            }

            // 确认删除操作
            const confirmed = await vscode.window.showWarningMessage(
                PROMPT_CONSTANTS.PROMPT_MANAGEMENT.CONFIRM.DELETE(selected.name),
                { modal: true },
                PROMPT_CONSTANTS.PROMPT_MANAGEMENT.CONFIRM.CONFIRM_BUTTON
            );

            // 执行删除并保存
            if (confirmed === PROMPT_CONSTANTS.PROMPT_MANAGEMENT.CONFIRM.CONFIRM_BUTTON) {
                this.promptService.deletePrompt(selected.id);
                vscode.window.showInformationMessage(PROMPT_CONSTANTS.PROMPT_MANAGEMENT.SUCCESS.DELETE(selected.name));
            }
        } catch (error: any) {
            vscode.window.showErrorMessage(`删除提示词时出错: ${error.message}`);
        }
    }
} 