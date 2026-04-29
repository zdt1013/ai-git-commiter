import * as vscode from 'vscode';

/**
 * 全局输出频道，用于插件调试日志
 * 在 activate() 中调用 Logger.init() 初始化一次，之后任意位置直接使用
 */
export class Logger {
    private static channel: vscode.OutputChannel | null = null;

    /** 在 activate() 中调用一次 */
    static init(channelName: string): void {
        if (!this.channel) {
            this.channel = vscode.window.createOutputChannel(channelName);
        }
    }

    /** 普通信息日志 */
    static log(message: string, ...args: any[]): void {
        this.write('INFO', message, ...args);
    }

    /** 警告日志 */
    static warn(message: string, ...args: any[]): void {
        this.write('WARN', message, ...args);
    }

    /** 错误日志 */
    static error(message: string, error?: any): void {
        this.write('ERROR', message);
        if (error) {
            if (error instanceof Error) {
                this.write('ERROR', `  ${error.message}`);
                if (error.stack) {
                    this.write('ERROR', error.stack);
                }
            } else {
                this.write('ERROR', `  ${String(error)}`);
            }
        }
    }

    /** 在输出面板中显示频道（不强制抢焦点） */
    static show(): void {
        this.channel?.show(true);
    }

    /** 释放资源，在 deactivate() 中调用 */
    static dispose(): void {
        this.channel?.dispose();
        this.channel = null;
    }

    private static write(level: string, message: string, ...args: any[]): void {
        const timestamp = new Date().toISOString();
        const extra = args.length ? ' ' + args.map(a => JSON.stringify(a)).join(' ') : '';
        const line = `[${timestamp}] [${level}] ${message}${extra}`;

        // 同时写到 VS Code 输出频道和开发者控制台
        this.channel?.appendLine(line);
        console.log(line);
    }
}
