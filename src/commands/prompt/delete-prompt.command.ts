import * as vscode from 'vscode';
import { BasePromptCommand } from './base-prompt.command';
import { PROMPT_CONSTANTS } from '../../constants';

export class DeletePromptCommand extends BasePromptCommand {
    public async execute(): Promise<void> {
        try {
            // 让用户选择要删除的提示词
            // Let user select prompt to delete
            // Let the user select the prompt to delete
            const selected = await this.selectPrompt(PROMPT_CONSTANTS.PROMPT_MANAGEMENT.SELECT.DELETE);
            if (!selected) return;

            // 检查是否为Default prompt（不可删除）
            // Check if it is a default prompt (cannot be deleted)
            if (this.isDefaultPrompt(selected)) {
                vscode.window.showWarningMessage(vscode.l10n.t('Default prompt cannot be deleted'));
                return;
            }

            // 确认删除操作
            // Confirm delete operation
            const confirmed = await vscode.window.showWarningMessage(
                PROMPT_CONSTANTS.PROMPT_MANAGEMENT.CONFIRM.DELETE(selected.name),
                { modal: true },
                PROMPT_CONSTANTS.PROMPT_MANAGEMENT.CONFIRM.CONFIRM_BUTTON
            );

            // 执行删除并保存
            // Execute deletion and save
            if (confirmed === PROMPT_CONSTANTS.PROMPT_MANAGEMENT.CONFIRM.CONFIRM_BUTTON) {
                this.promptService.deletePrompt(selected.id);
                vscode.window.showInformationMessage(PROMPT_CONSTANTS.PROMPT_MANAGEMENT.SUCCESS.DELETE(selected.name));
            }
        } catch (error: any) {
            vscode.window.showErrorMessage(vscode.l10n.t("Error deleting prompt: {0}", error.message));
        }
    }
} 