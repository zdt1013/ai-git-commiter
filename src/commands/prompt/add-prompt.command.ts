import * as vscode from 'vscode';
import { v4 as uuidv4 } from 'uuid';
import { BasePromptCommand } from './base-prompt.command';
import { PROMPT_CONSTANTS } from '../../constants';

export class AddPromptCommand extends BasePromptCommand {
    public async execute(): Promise<void> {
        try {
            // 获取用户输入的新提示词名称
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
            const content = await vscode.window.showInputBox({
                prompt: PROMPT_CONSTANTS.PROMPT_MANAGEMENT.INPUT.CONTENT.PROMPT,
                placeHolder: PROMPT_CONSTANTS.PROMPT_MANAGEMENT.INPUT.CONTENT.PLACEHOLDER,
                ignoreFocusOut: true
            });

            if (!content) return;

            // 获取用户输入的润色提示词内容
            const polishContent = await vscode.window.showInputBox({
                prompt: PROMPT_CONSTANTS.PROMPT_MANAGEMENT.INPUT.POLISH_CONTENT.PROMPT,
                placeHolder: PROMPT_CONSTANTS.PROMPT_MANAGEMENT.INPUT.POLISH_CONTENT.PLACEHOLDER,
                ignoreFocusOut: true
            });

            if (!polishContent) return;

            // 获取用户输入的偏好语言
            const languagesInput = await vscode.window.showInputBox({
                prompt: PROMPT_CONSTANTS.PROMPT_MANAGEMENT.INPUT.PREFERRED_LANGUAGES.PROMPT,
                placeHolder: PROMPT_CONSTANTS.PROMPT_MANAGEMENT.INPUT.PREFERRED_LANGUAGES.PLACEHOLDER,
                ignoreFocusOut: true
            });

            // 获取用户输入的偏好库
            const librariesInput = await vscode.window.showInputBox({
                prompt: PROMPT_CONSTANTS.PROMPT_MANAGEMENT.INPUT.PREFERRED_LIBRARIES.PROMPT,
                placeHolder: PROMPT_CONSTANTS.PROMPT_MANAGEMENT.INPUT.PREFERRED_LIBRARIES.PLACEHOLDER,
                ignoreFocusOut: true
            });

            // 处理语言和库的输入
            const languages = languagesInput ? languagesInput.split(',').map(lang => lang.trim()) : [];
            const libraries = librariesInput ? librariesInput.split(',').map(lib => lib.trim()) : [];

            // 创建新提示词并保存
            const newPrompt = {
                id: uuidv4(),
                name,
                content,
                polishContent,
                preferredLanguages: languages,
                preferredLibraries: libraries,
                source: 'local'
            };

            this.promptService.addPrompt(newPrompt);
            vscode.window.showInformationMessage(PROMPT_CONSTANTS.PROMPT_MANAGEMENT.SUCCESS.ADD(name));
        } catch (error: any) {
            vscode.window.showErrorMessage(`添加提示词时出错: ${error.message}`);
        }
    }
} 