import * as vscode from 'vscode';
import { PromptService } from '../../ai/prompt.service';
import { PROMPT_CONSTANTS } from '../../constants';

export abstract class BasePromptCommand {
    constructor(
        protected readonly context: vscode.ExtensionContext,
        protected readonly promptService: PromptService
    ) { }

    protected async selectPrompt(placeHolder: string) {
        const items = this.promptService.getPrompts().map(prompt => ({
            label: prompt.name,
            description: prompt.source === 'default' ? '默认提示词' : '自定义提示词',
            detail: `版本号: ${prompt.version || '无'}\n偏好语言: ${prompt.preferredLanguages?.join(', ') || '无'}\n偏好库: ${prompt.preferredLibraries?.join(', ') || '无'}`,
            prompt
        }));

        const selected = await vscode.window.showQuickPick(items, {
            placeHolder,
            title: PROMPT_CONSTANTS.PROMPT_MANAGEMENT.SELECT.TITLE
        });

        return selected?.prompt;
    }

    protected isDefaultPrompt(prompt: any): boolean {
        return prompt.source === 'default';
    }
} 