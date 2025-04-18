import * as vscode from 'vscode';
import { PromptService } from './ai/prompt.service';
import { ConfigService } from './config';
import { CommandRegistry } from './commands/command.registry';

// 激活扩展
export async function activate(context: vscode.ExtensionContext) {
    const extensionName = context.extension.packageJSON.displayName;
    console.log(`${extensionName} is activated.`);

    // 初始化服务
    const promptService = await PromptService.getInstance(context);
    const configService = await ConfigService.getInstance();

    // 注册命令
    const commandRegistry = new CommandRegistry(context, promptService, configService);
    commandRegistry.registerCommands();
}

// 停用扩展
export function deactivate() { }
