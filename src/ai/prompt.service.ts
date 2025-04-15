import * as vscode from 'vscode';
import * as fs from 'fs';
import { readFile, access, constants, readdir, writeFile } from 'fs/promises';
import * as path from 'path';
import * as xml2js from 'xml2js';
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import { PromptTemplate, XmlPrompt } from '../types/types';
import { PROMPT_CONSTANTS, CONFIG_CONSTANTS, GIT_CONSTANTS, AI_CONSTANTS } from '../constants';
import { GitService } from '../git';
import { ConfigService } from '../config';
import { AIServiceFactory } from './ai-service.factory';

/**
 * 提示词管理器类
 */
export class PromptService {
    private _promptsStoragePath: string;
    private _prompts: PromptTemplate[] = [];
    private _onDidChangePrompts: vscode.EventEmitter<void> = new vscode.EventEmitter<void>();
    private _defaultPromptsPath: string;

    public readonly onDidChangePrompts: vscode.Event<void> = this._onDidChangePrompts.event;

    constructor(private context: vscode.ExtensionContext) {
        // 设置存储路径
        this._promptsStoragePath = path.join(context.globalStorageUri.fsPath, 'prompts.json');
        this._defaultPromptsPath = path.join(context.extensionPath, 'asserts', 'prompts');

        // 确保存储目录存在
        if (!fs.existsSync(path.dirname(this._promptsStoragePath))) {
            fs.mkdirSync(path.dirname(this._promptsStoragePath), { recursive: true });
        }

        // 初始化提示词
        this.initialize();
    }

    /**
     * 更新设置项
     */
    private async updateSettings(prompt: PromptTemplate): Promise<void> {
        const config = vscode.workspace.getConfiguration(CONFIG_CONSTANTS.ROOT);
        await config.update(CONFIG_CONSTANTS.PROMPT.SELECTED_PROMPT_TEMPLATE_ID, prompt.id, true);
        await config.update(CONFIG_CONSTANTS.PROMPT.SELECTED_TEMPLATE_PROMPT, prompt.content, true);
        await config.update(CONFIG_CONSTANTS.PROMPT.LANGUAGE_AWARENESS, prompt.preferredLanguages?.join(', ') || '', true);
        await config.update(CONFIG_CONSTANTS.PROMPT.LIBRARY_AWARENESS, prompt.preferredLibraries?.join(', ') || '', true);
    }

    /**
     * 初始化提示词管理器
     */
    private async initialize(): Promise<void> {
        // 加载提示词
        await this.loadPrompts();

        // 注册提示词管理命令
        this.registerCommands();

        // 获取当前选中的提示词ID
        const config = vscode.workspace.getConfiguration(CONFIG_CONSTANTS.ROOT);
        const selectedPromptId = config.get<string>(CONFIG_CONSTANTS.PROMPT.SELECTED_PROMPT_TEMPLATE_ID);

        // bugfix: 如果用户没有选择任何提示词，则设置默认提示词
        if (!selectedPromptId) {
            const defaultPrompt = this._prompts.find(p => p.id === 'default');
            if (defaultPrompt) {
                await this.updateSettings(defaultPrompt);
            }
        }
    }

    /**
     * 从 XML 文件中解析提示词
     */
    /**
     * 从XML文件解析提示词模板
     * @param filePath XML文件路径
     * @returns 解析成功的提示词模板对象，解析失败返回null
     */
    private async parsePromptFromXml(filePath: string): Promise<PromptTemplate | null> {
        try {
            // 读取XML文件内容
            const content = await readFile(filePath, 'utf8');
            // 创建XML解析器
            const parser = new xml2js.Parser();
            // 解析XML内容为JS对象
            const result = await parser.parseStringPromise(content);

            // 检查是否包含prompt节点
            if (!result.prompt) {
                return null;
            }

            // 类型断言为XmlPrompt接口
            const prompt = result.prompt as XmlPrompt;
            // 构建并返回提示词模板对象
            return {
                id: prompt.id[0],  // 提示词ID
                name: prompt.name[0],  // 提示词名称
                content: prompt.content[0].trim(),  // 提示词内容(去除首尾空格)
                polishContent: prompt.polishContent[0].trim(),  // 润色提示词内容(去除首尾空格)
                source: prompt.source?.[0] || 'local',  // 来源(默认为本地)
                description: prompt.description?.[0],  // 描述信息(可选)
                preferredLanguages: prompt.preferredLanguages?.[0]?.language || [],  // 偏好语言列表
                preferredLibraries: prompt.preferredLibraries?.[0]?.library || [],  // 偏好库列表
                preferredLanguagePrompt: prompt.preferredLanguagePrompt?.[0],  // 语言相关提示(可选)
                preferredLibraryPrompt: prompt.preferredLibraryPrompt?.[0],  // 库相关提示(可选)
                version: prompt.version?.[0]  // 版本号(可选)
            };
        } catch (error) {
            // 捕获并记录解析错误
            console.error(`解析提示词文件失败 ${filePath}:`, error);
            return null;
        }
    }

    /**
     * 加载默认提示词
     */
    private async loadDefaultPrompts(): Promise<PromptTemplate[]> {
        const prompts: PromptTemplate[] = [];

        try {
            access(this._defaultPromptsPath, constants.R_OK | constants.W_OK);
            const files = await readdir(this._defaultPromptsPath);
            for (const file of files) {
                if (file.endsWith('.xml')) {
                    const prompt = await this.parsePromptFromXml(
                        path.join(this._defaultPromptsPath, file)
                    );
                    if (prompt) {
                        prompts.push(prompt);
                    }
                }
            }
        } catch (error) {
            console.error('加载默认提示词失败:', error);
        }

        return prompts;
    }

    /**
     * 加载提示词
     */
    private async loadPrompts(): Promise<void> {
        // 加载默认提示词
        const defaultPrompts = await this.loadDefaultPrompts();
        try {
            access(this._promptsStoragePath, constants.R_OK | constants.W_OK);
            const data = await readFile(this._promptsStoragePath, 'utf8');
            this._prompts = JSON.parse(data);

            // 比较版本并更新提示词
            for (const defaultPrompt of defaultPrompts) {
                const existingPrompt = this._prompts.find(p => p.id === defaultPrompt.id);
                if (existingPrompt) {
                    // 如果版本号不同，更新提示词
                    if (defaultPrompt.version && existingPrompt.version !== defaultPrompt.version) {
                        const index = this._prompts.findIndex(p => p.id === defaultPrompt.id);
                        if (index !== -1) {
                            this._prompts[index] = {
                                ...defaultPrompt,
                                source: 'local'
                            };
                        }
                    }
                } else {
                    // 如果提示词不存在，添加它
                    this._prompts.push({
                        ...defaultPrompt,
                        source: 'local'
                    });
                }
            }
            // 保存更新后的提示词
            await this.savePrompts();
        } catch (error) {
            // 如果存储文件不存在，使用默认提示词
            this._prompts = defaultPrompts.map(prompt => ({
                ...prompt,
                source: 'local'
            }));
        }
    }

    /**
     * 保存提示词
     */
    /**
     * 保存当前所有提示词到存储文件
     * @throws 当文件写入失败时抛出错误
     */
    private async savePrompts(): Promise<void> {
        try {
            // 将提示词数组转换为格式化的JSON字符串并写入文件
            await writeFile(this._promptsStoragePath, JSON.stringify(this._prompts, null, 2), 'utf8');
            // 触发提示词变更事件通知所有监听器
            this._onDidChangePrompts.fire();
        } catch (error) {
            // 捕获并记录文件写入错误
            console.error('保存提示词失败:', error);
            // 向用户显示保存失败的提示信息
            vscode.window.showErrorMessage(PROMPT_CONSTANTS.PROMPT_MANAGEMENT.ERROR.SAVE);
        }
    }

    /**
     * 下载远程提示词
     */
    private async downloadPrompts(url: string): Promise<void> {
        try {
            const response = await axios.get(url);
            let remotePrompts: PromptTemplate[] = response.data;

            // 校验返回内容是否包含必要的设置项
            const invalidPrompts = remotePrompts.filter(prompt => {
                return !prompt.id || !prompt.name || !prompt.content || !prompt.polishContent;
            });

            if (invalidPrompts.length > 0) {
                vscode.window.showErrorMessage(`下载的提示词中有${invalidPrompts.length}个缺少必要的设置项(id、name、content、polishContent)，已跳过这些提示词`);
                // 过滤掉无效的提示词
                remotePrompts = remotePrompts.filter(prompt => {
                    return prompt.id && prompt.name && prompt.content && prompt.polishContent;
                });
            }

            // 合并提示词
            remotePrompts.forEach(remotePrompt => {
                const existingIndex = this._prompts.findIndex(p => p.id === remotePrompt.id);
                if (existingIndex === -1) {
                    // 添加新提示词
                    this._prompts.push({
                        ...remotePrompt,
                        source: 'remote',
                        url
                    });
                } else {
                    // 如果本地提示词是默认提示词，不更新
                    if (this.isDefaultPrompt(this._prompts[existingIndex])) {
                        return;
                    }
                    // 更新现有提示词
                    this._prompts[existingIndex] = {
                        ...this._prompts[existingIndex],
                        ...remotePrompt,
                        source: 'remote',
                        url
                    };
                }
            });

            await this.savePrompts();
            vscode.window.showInformationMessage(PROMPT_CONSTANTS.PROMPT_MANAGEMENT.SUCCESS.DOWNLOAD);
        } catch (error) {
            console.error('下载远程提示词失败:', error);
            vscode.window.showErrorMessage(PROMPT_CONSTANTS.PROMPT_MANAGEMENT.ERROR.DOWNLOAD);
        }
    }

    /**
     * 判断提示词是否为默认提示词
     */
    private isDefaultPrompt(prompt: PromptTemplate): boolean {
        return prompt.source === 'local' &&
            !!this._defaultPromptsPath &&
            fs.existsSync(path.join(this._defaultPromptsPath, `${prompt.id}.xml`));
    }

    /**
     * 注册所有提示词管理相关的命令
     */
    private registerCommands(): void {
        // 添加提示词命令
        this.context.subscriptions.push(
            vscode.commands.registerCommand(PROMPT_CONSTANTS.COMMANDS.ADD_PROMPT, async () => {
                // 获取用户输入的新提示词名称
                const name = await vscode.window.showInputBox({
                    prompt: PROMPT_CONSTANTS.PROMPT_MANAGEMENT.INPUT.NAME.PROMPT,
                    placeHolder: PROMPT_CONSTANTS.PROMPT_MANAGEMENT.INPUT.NAME.PLACEHOLDER,
                    validateInput: (value) => {
                        if (!value) {
                            return PROMPT_CONSTANTS.PROMPT_MANAGEMENT.INPUT.NAME.VALIDATION.EMPTY;
                        }
                        const exists = this._prompts.some(p => p.name === value);
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
                this._prompts.push({
                    id: uuidv4(),
                    name,
                    content,
                    polishContent,
                    preferredLanguages: languages,
                    preferredLibraries: libraries,
                    source: 'local'
                });
                this.savePrompts();
                vscode.window.showInformationMessage(PROMPT_CONSTANTS.PROMPT_MANAGEMENT.SUCCESS.ADD(name));
            })
        );

        // 编辑提示词命令
        this.context.subscriptions.push(
            vscode.commands.registerCommand(PROMPT_CONSTANTS.COMMANDS.EDIT_PROMPT, async () => {
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
                        const exists = this._prompts.some(p => p.id !== selected.id && p.name === value);
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

                // 获取修改后的偏好语言
                const languagesInput = await vscode.window.showInputBox({
                    prompt: PROMPT_CONSTANTS.PROMPT_MANAGEMENT.INPUT.PREFERRED_LANGUAGES.PROMPT,
                    value: selected.preferredLanguages?.join(', ') || '',
                    placeHolder: PROMPT_CONSTANTS.PROMPT_MANAGEMENT.INPUT.PREFERRED_LANGUAGES.PLACEHOLDER,
                    ignoreFocusOut: true
                });

                // 获取修改后的偏好库
                const librariesInput = await vscode.window.showInputBox({
                    prompt: PROMPT_CONSTANTS.PROMPT_MANAGEMENT.INPUT.PREFERRED_LIBRARIES.PROMPT,
                    value: selected.preferredLibraries?.join(', ') || '',
                    placeHolder: PROMPT_CONSTANTS.PROMPT_MANAGEMENT.INPUT.PREFERRED_LIBRARIES.PLACEHOLDER,
                    ignoreFocusOut: true
                });

                // 处理语言和库的输入
                const preferredLanguages = languagesInput ? languagesInput.split(',').map(lang => lang.trim()) : [];
                const preferredLibraries = librariesInput ? librariesInput.split(',').map(lib => lib.trim()) : [];

                // 更新提示词并保存
                const index = this._prompts.findIndex(p => p.id === selected.id);
                if (index !== -1) {
                    this._prompts[index] = {
                        ...selected,
                        name,
                        content,
                        preferredLanguages,
                        preferredLibraries
                    };
                    this.savePrompts();
                    vscode.window.showInformationMessage(PROMPT_CONSTANTS.PROMPT_MANAGEMENT.SUCCESS.EDIT(name));
                }
            })
        );

        // 删除提示词命令
        this.context.subscriptions.push(
            vscode.commands.registerCommand(PROMPT_CONSTANTS.COMMANDS.DELETE_PROMPT, async () => {
                // 让用户选择要删除的提示词
                const selected = await this.selectPrompt(PROMPT_CONSTANTS.PROMPT_MANAGEMENT.SELECT.DELETE);
                if (!selected) return;

                // 检查是否为默认提示词（不可删除）
                if (this.isDefaultPrompt(selected)) {
                    vscode.window.showWarningMessage('默认提示词不能删除');
                    return;
                }

                // 确认删除操作
                const confirmed = await vscode.window.showWarningMessage(
                    PROMPT_CONSTANTS.PROMPT_MANAGEMENT.CONFIRM.DELETE(selected.name),
                    { modal: true },
                    PROMPT_CONSTANTS.PROMPT_MANAGEMENT.CONFIRM.CONFIRM_BUTTON
                );

                // 执行删除并保存
                if (confirmed === PROMPT_CONSTANTS.PROMPT_MANAGEMENT.CONFIRM.CONFIRM_BUTTON) {
                    const index = this._prompts.findIndex(p => p.id === selected.id);
                    if (index !== -1) {
                        this._prompts.splice(index, 1);
                        this.savePrompts();
                        vscode.window.showInformationMessage(PROMPT_CONSTANTS.PROMPT_MANAGEMENT.SUCCESS.DELETE(selected.name));
                    }
                }
            })
        );

        // 选择提示词命令
        this.context.subscriptions.push(
            vscode.commands.registerCommand(PROMPT_CONSTANTS.COMMANDS.SELECT_PROMPT, async () => {
                // 让用户选择要使用的提示词
                const selected = await this.selectPrompt(PROMPT_CONSTANTS.PROMPT_MANAGEMENT.SELECT.USE);
                if (!selected) return;

                // 更新设置项为选中的提示词
                await this.updateSettings(selected);

                vscode.window.showInformationMessage(PROMPT_CONSTANTS.PROMPT_MANAGEMENT.SUCCESS.USE(selected.name));
            })
        );

        // 下载远程提示词命令
        this.context.subscriptions.push(
            vscode.commands.registerCommand(PROMPT_CONSTANTS.COMMANDS.DOWNLOAD_PROMPTS, async () => {
                // 获取用户输入的远程URL
                const url = await vscode.window.showInputBox({
                    prompt: PROMPT_CONSTANTS.PROMPT_MANAGEMENT.INPUT.REMOTE_URL.PROMPT,
                    placeHolder: PROMPT_CONSTANTS.PROMPT_MANAGEMENT.INPUT.REMOTE_URL.PLACEHOLDER
                });

                // 下载并合并远程提示词
                if (url) {
                    await this.downloadPrompts(url);
                }
            })
        );

        // 手动生成Commit消息（AI润色）命令
        this.context.subscriptions.push(
            vscode.commands.registerCommand(PROMPT_CONSTANTS.COMMANDS.MANUAL_POLISH_COMMIT_MESSAGE, async () => {
                try {
                    // 获取Git仓库
                    const repository = await GitService.getCurrentRepository();
                    if (!repository) {
                        vscode.window.showErrorMessage(GIT_CONSTANTS.ERROR.NO_REPOSITORY);
                        return;
                    }

                    // 获取配置
                    const configService = new ConfigService();
                    const config = configService.getExtensionConfig();

                    // 检查AI配置是否完整
                    if (!(await configService.checkAIConfig(config, config.provider))) {
                        return;
                    }

                    // 获取用户输入的原始Commit消息
                    const message = await vscode.window.showInputBox({
                        placeHolder: '请输入简短的Commit消息',
                        prompt: '请输入您想要润色的Commit消息'
                    });

                    if (!message) {
                        return;
                    }

                    // 显示加载中提示
                    vscode.window.withProgress({
                        location: vscode.ProgressLocation.SourceControl,
                        title: AI_CONSTANTS.PROGRESS.POLISHING,
                        cancellable: false
                    }, async (_: vscode.Progress<{ message?: string; increment?: number }>) => {
                        // 从配置中获取选中的提示词模板
                        const promptTemplate = this.getSelectedPrompt();

                        // 使用工厂创建AI服务并润色消息
                        const aiService = AIServiceFactory.createService();
                        const result = await aiService.polishCommitMessage(message, config.language, promptTemplate);

                        if (result?.success && result.message) {
                            repository.inputBox.value = result.message;
                            vscode.window.showInformationMessage(AI_CONSTANTS.SUCCESS.POLISH);
                        } else {
                            vscode.window.showErrorMessage(result?.error || AI_CONSTANTS.ERROR.POLISH);
                        }
                        return Promise.resolve();
                    });
                } catch (error: any) {
                    vscode.window.showErrorMessage(`执行命令时出错: ${error.message}`);
                }
            })
        );
    }

    /**
     * 选择提示词
     */
    private async selectPrompt(placeHolder: string): Promise<PromptTemplate | undefined> {
        const items = this._prompts.map(prompt => {
            // 构建标签数组
            const tags: string[] = [];
            if (prompt.version) tags.push(PROMPT_CONSTANTS.TAGS.VERSION(prompt.version));
            if (prompt.source) tags.push(PROMPT_CONSTANTS.TAGS.SOURCE(prompt.source));
            if (prompt.preferredLanguages?.length) tags.push(PROMPT_CONSTANTS.TAGS.LANGUAGES(prompt.preferredLanguages));
            if (prompt.preferredLibraries?.length) tags.push(PROMPT_CONSTANTS.TAGS.LIBRARIES(prompt.preferredLibraries));

            return {
                label: prompt.name,
                description: tags.join(' | '),
                detail: prompt.content.length > 50 ? prompt.content.substring(0, 50) + '...' : prompt.content,
                prompt
            };
        });

        const selected = await vscode.window.showQuickPick(items, {
            placeHolder,
            matchOnDescription: true
        });

        return selected?.prompt;
    }

    /**
     * 获取所有提示词
     */
    public getPrompts(): PromptTemplate[] {
        return [...this._prompts];
    }

    /**
     * 获取提示词内容
     */
    public getPromptContent(id: string): string | undefined {
        const prompt = this._prompts.find(p => p.id === id);
        return prompt?.content;
    }

    /**
     * 获取当前选中的提示词模板
     * @returns 当前选中的提示词模板对象，如果未选中则返回默认模板
     */
    public getSelectedPrompt(): PromptTemplate {
        const config = vscode.workspace.getConfiguration(CONFIG_CONSTANTS.ROOT);
        const selectedPromptId = config.get<string>(CONFIG_CONSTANTS.PROMPT.SELECTED_PROMPT_TEMPLATE_ID);

        // 查找选中的模板
        const selectedPrompt = this._prompts.find(p => p.id === selectedPromptId);
        if (selectedPrompt) {
            return selectedPrompt;
        }

        // 如果没有选中模板，返回默认模板
        const defaultPrompt = this._prompts.find(p => p.id === 'default');
        if (defaultPrompt) {
            return defaultPrompt;
        }

        // 如果连默认模板都没有，返回第一个模板
        return this._prompts[0];
    }
}
