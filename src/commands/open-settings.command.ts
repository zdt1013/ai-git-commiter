import * as vscode from 'vscode';
import { CONFIG_CONSTANTS } from '../constants';

export class OpenSettingsCommand {
    constructor(
        private readonly context: vscode.ExtensionContext
    ) { }

    public async execute(): Promise<void> {
        // 打开设置页面
        await vscode.commands.executeCommand(
            'workbench.action.openSettings',
            CONFIG_CONSTANTS.ROOT
        );
    }
} 