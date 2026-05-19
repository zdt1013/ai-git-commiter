import * as vscode from 'vscode';
import { BasePromptCommand } from './base-prompt.command';
import { PROMPT_CONSTANTS } from '../../constants';

export class EditPromptCommand extends BasePromptCommand {
    public async execute(): Promise<void> {
        try {
            // 让用户选择要编辑的提示词
            // Let user select prompt to edit
            const selected = await this.selectPrompt(PROMPT_CONSTANTS.PROMPT_MANAGEMENT.SELECT.EDIT);
            if (!selected) return;

            // 检查是否为Default prompt（不可编辑）
            if (this.isDefaultPrompt(selected)) {
                vscode.window.showWarningMessage(vscode.l10n.t("Default prompts cannot be edited"));
                return;
            }

            // 获取修改后的名称
            // Get modified name
            const name = await vscode.window.showInputBox({
                prompt: PROMPT_CONSTANTS.PROMPT_MANAGEMENT.INPUT.NAME.PROMPT,
                value: selected.name,
                validateInput: (value) => {
                    if (!value) {
                        return PROMPT_CONSTANTS.PROMPT_MANAGEMENT.INPUT.NAME.VALIDATION.EMPTY;
                    }
                    const exists = this.promptService.getPrompts().some(p => p.id !== selected.id && p.name === value);
                    if (exists) {
                        return PROMPT_CONSTANTS.PROMPT_MANAGEMENT.INPUT.NAME.VALIDATION.EXISTS;
                    }
                    return null;
                }
            });

            if (!name) return;

            // 获取修改后的内容
            // Get modified content
            const content = await vscode.window.showInputBox({
                prompt: PROMPT_CONSTANTS.PROMPT_MANAGEMENT.INPUT.CONTENT.PROMPT,
                value: selected.content,
                ignoreFocusOut: true
            });

            if (!content) return;

            // 获取修改后的润色提示词内容
            // Get modified polish prompt content
            const polishContent = await vscode.window.showInputBox({
                prompt: PROMPT_CONSTANTS.PROMPT_MANAGEMENT.INPUT.POLISH_CONTENT.PROMPT,
                value: selected.polishContent,
                ignoreFocusOut: true
            });

            if (!polishContent) return;

            // 更新提示词并保存
            // Update prompt and save
            const updatedPrompt = {
                ...selected,
                name,
                content,
                polishContent
            };

            this.promptService.updatePrompt(updatedPrompt);
            vscode.window.showInformationMessage(PROMPT_CONSTANTS.PROMPT_MANAGEMENT.SUCCESS.EDIT(name));
        } catch (error: any) {
            vscode.window.showErrorMessage(vscode.l10n.t("Error editing prompt: {0}", error.message));
        }
    }
} 