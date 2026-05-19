import * as vscode from 'vscode';
import { v4 as uuidv4 } from 'uuid';
import { BasePromptCommand } from './base-prompt.command';
import { PROMPT_CONSTANTS } from '../../constants';

export class AddPromptCommand extends BasePromptCommand {
    public async execute(): Promise<void> {
        try {
            // 获取用户输入的新提示词名称
            // Get new prompt name from user input
            const name = await vscode.window.showInputBox({
                prompt: PROMPT_CONSTANTS.PROMPT_MANAGEMENT.INPUT.NAME.PROMPT,
                placeHolder: PROMPT_CONSTANTS.PROMPT_MANAGEMENT.INPUT.NAME.PLACEHOLDER,
                validateInput: (value) => {
                    if (!value) {
                        return PROMPT_CONSTANTS.PROMPT_MANAGEMENT.INPUT.NAME.VALIDATION.EMPTY;
                    }
                    const exists = this.promptService.getPrompts().some(p => p.name === value);
                    if (exists) {
                        return PROMPT_CONSTANTS.PROMPT_MANAGEMENT.INPUT.NAME.VALIDATION.EXISTS;
                    }
                    return null;
                }
            });

            if (!name) return;

            // 获取用户输入的提示词内容
            // Get prompt content from user input
            const content = await vscode.window.showInputBox({
                prompt: PROMPT_CONSTANTS.PROMPT_MANAGEMENT.INPUT.CONTENT.PROMPT,
                placeHolder: PROMPT_CONSTANTS.PROMPT_MANAGEMENT.INPUT.CONTENT.PLACEHOLDER,
                ignoreFocusOut: true
            });

            if (!content) return;

            // 获取用户输入的润色提示词内容
            // Get polish prompt content from user input
            const polishContent = await vscode.window.showInputBox({
                prompt: PROMPT_CONSTANTS.PROMPT_MANAGEMENT.INPUT.POLISH_CONTENT.PROMPT,
                placeHolder: PROMPT_CONSTANTS.PROMPT_MANAGEMENT.INPUT.POLISH_CONTENT.PLACEHOLDER,
                ignoreFocusOut: true
            });

            if (!polishContent) return;

            // 创建新提示词并保存
            // Create new prompt and save
            const newPrompt = {
                id: uuidv4(),
                name,
                content,
                polishContent,
                source: 'local'
            };

            this.promptService.addPrompt(newPrompt);
            vscode.window.showInformationMessage(PROMPT_CONSTANTS.PROMPT_MANAGEMENT.SUCCESS.ADD(name));
        } catch (error: any) {
            vscode.window.showErrorMessage(vscode.l10n.t("Error adding prompt: {0}", error.message));
        }
    }
} 