import * as vscode from 'vscode';
import { PROMPT_CONSTANTS } from '../constants';
import { CommitCommand } from './commit.command';
import { SwitchModelCommand } from './switch-model.command';
import { PromptService } from '../ai/prompt.service';
import { ConfigService } from '../config';
import { AddPromptCommand } from './prompt/add-prompt.command';
import { EditPromptCommand } from './prompt/edit-prompt.command';
import { DeletePromptCommand } from './prompt/delete-prompt.command';
import { SelectPromptCommand } from './prompt/select-prompt.command';
import { DownloadPromptCommand } from './prompt/download-prompt.command';
import { ManualPolishCommand } from './prompt/manual-polish.command';

export class CommandRegistry {
    constructor(
        private readonly context: vscode.ExtensionContext,
        private readonly promptService: PromptService,
        private readonly configService: ConfigService
    ) { }

    public registerCommands(): void {
        // 注册生成提交消息命令
        const commitCommand = new CommitCommand(
            this.context,
            this.promptService,
            this.configService
        );

        const commitDisposable = vscode.commands.registerCommand(
            PROMPT_CONSTANTS.COMMANDS.GENERATE_COMMIT_MESSAGE,
            () => commitCommand.execute()
        );

        // 注册切换AI模型命令
        const switchModelCommand = new SwitchModelCommand(
            this.context,
            this.configService
        );

        const switchModelDisposable = vscode.commands.registerCommand(
            PROMPT_CONSTANTS.COMMANDS.SWITCH_AI_MODEL,
            () => switchModelCommand.execute()
        );

        // 注册添加提示词命令
        const addPromptCommand = new AddPromptCommand(
            this.context,
            this.promptService
        );

        const addPromptDisposable = vscode.commands.registerCommand(
            PROMPT_CONSTANTS.COMMANDS.ADD_PROMPT,
            () => addPromptCommand.execute()
        );

        // 注册编辑提示词命令
        const editPromptCommand = new EditPromptCommand(
            this.context,
            this.promptService
        );

        const editPromptDisposable = vscode.commands.registerCommand(
            PROMPT_CONSTANTS.COMMANDS.EDIT_PROMPT,
            () => editPromptCommand.execute()
        );

        // 注册删除提示词命令
        const deletePromptCommand = new DeletePromptCommand(
            this.context,
            this.promptService
        );

        const deletePromptDisposable = vscode.commands.registerCommand(
            PROMPT_CONSTANTS.COMMANDS.DELETE_PROMPT,
            () => deletePromptCommand.execute()
        );

        // 注册选择提示词命令
        const selectPromptCommand = new SelectPromptCommand(
            this.context,
            this.promptService
        );

        const selectPromptDisposable = vscode.commands.registerCommand(
            PROMPT_CONSTANTS.COMMANDS.SELECT_PROMPT,
            () => selectPromptCommand.execute()
        );

        // 注册下载提示词命令
        const downloadPromptCommand = new DownloadPromptCommand(
            this.context,
            this.promptService
        );

        const downloadPromptDisposable = vscode.commands.registerCommand(
            PROMPT_CONSTANTS.COMMANDS.DOWNLOAD_PROMPTS,
            () => downloadPromptCommand.execute()
        );

        // 注册手动润色命令
        const manualPolishCommand = new ManualPolishCommand(
            this.context,
            this.promptService,
            this.configService
        );

        const manualPolishDisposable = vscode.commands.registerCommand(
            PROMPT_CONSTANTS.COMMANDS.MANUAL_POLISH_COMMIT_MESSAGE,
            () => manualPolishCommand.execute()
        );

        // 将命令添加到订阅列表
        this.context.subscriptions.push(
            commitDisposable,
            switchModelDisposable,
            addPromptDisposable,
            editPromptDisposable,
            deletePromptDisposable,
            selectPromptDisposable,
            downloadPromptDisposable,
            manualPolishDisposable
        );
    }
} 