import * as vscode from 'vscode';
import { PromptService } from './ai/prompt.service';
import { ConfigService } from './config';
import { CommandRegistry } from './commands/command.registry';
import { Logger } from './utils/logger';

// 激活扩展
export async function activate(context: vscode.ExtensionContext) {
    const extensionName = context.extension.packageJSON.displayName;

    // 初始化输出频道（整个插件生命周期只初始化一次）
    Logger.init(extensionName);
    Logger.log(`${extensionName} is activated.`);

    // 初始化服务
    const promptService = await PromptService.getInstance(context);
    const configService = await ConfigService.getInstance();

    // 注册命令
    const commandRegistry = new CommandRegistry(context, promptService, configService);
    commandRegistry.registerCommands();

    Logger.log('All commands registered.');
}

// 停用扩展
export function deactivate() {
    Logger.dispose();
}
