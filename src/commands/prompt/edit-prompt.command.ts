import * as vscode from 'vscode';
import { BasePromptCommand } from './base-prompt.command';
import { PROMPT_CONSTANTS } from '../../constants';

export class EditPromptCommand extends BasePromptCommand {
    public async execute(): Promise<void> {
        try {
            // 让用户选择要编辑的提示词
            const selected = await this.selectPrompt(PROMPT_CONSTANTS.PROMPT_MANAGEMENT.SELECT.EDIT);
            if (!selected) return;

            // 检查是否为默认提示词（不可编辑）
            if (this.isDefaultPrompt(selected)) {
                vscode.window.showWarningMessage('默认提示词不能修改');
                return;
            }

            // 获取修改后的名称
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
            const content = await vscode.window.showInputBox({
                prompt: PROMPT_CONSTANTS.PROMPT_MANAGEMENT.INPUT.CONTENT.PROMPT,
                value: selected.content,
                ignoreFocusOut: true
            });

            if (!content) return;

            // 获取修改后的润色提示词内容
            const polishContent = await vscode.window.showInputBox({
                prompt: PROMPT_CONSTANTS.PROMPT_MANAGEMENT.INPUT.POLISH_CONTENT.PROMPT,
                value: selected.polishContent,
                ignoreFocusOut: true
            });

            if (!polishContent) return;

            // 更新提示词并保存
            const updatedPrompt = {
                ...selected,
                name,
                content,
                polishContent
            };

            this.promptService.updatePrompt(updatedPrompt);
            vscode.window.showInformationMessage(PROMPT_CONSTANTS.PROMPT_MANAGEMENT.SUCCESS.EDIT(name));
        } catch (error: any) {
            vscode.window.showErrorMessage(`编辑提示词时出错: ${error.message}`);
        }
    }
} 