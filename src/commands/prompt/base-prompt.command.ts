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
            description: prompt.source === 'default' ? vscode.l10n.t("Default prompt") : vscode.l10n.t("Custom prompt"),
            detail: `版本号: ${prompt.version || vscode.l10n.t("None")}`,
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