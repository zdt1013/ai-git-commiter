import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import * as xml2js from 'xml2js';
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import { PromptTemplate, XmlPrompt } from './types';
import { PROMPT_CONSTANTS, CONFIG_CONSTANTS } from './constants';

/**
 * 提示词管理器类
 */
export class PromptManager {
    private _promptsStoragePath: string;
    private _prompts: PromptTemplate[] = [];
    private _onDidChangePrompts: vscode.EventEmitter<void> = new vscode.EventEmitter<void>();
    private _defaultPromptsPath: string;
    
    public readonly onDidChangePrompts: vscode.Event<void> = this._onDidChangePrompts.event;

    constructor(private context: vscode.ExtensionContext) {
        // 设置存储路径
        this._promptsStoragePath = path.join(context.globalStorageUri.fsPath, 'prompts.json');
        this._defaultPromptsPath = path.join(context.extensionPath, 'resources', 'prompts');
        
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
        await config.update(CONFIG_CONSTANTS.PROMPT.SELECTED_TEMPLATE_PROMPT, prompt.content, true);
        await config.update(CONFIG_CONSTANTS.PROMPT.SELECTED_PROMPT_TEMPLATE_ID, prompt.id, true);
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
        
        // 如果有默认提示词，更新设置项
        const defaultPrompt = this._prompts.find(p => p.id === 'default');
        if (defaultPrompt) {
            await this.updateSettings(defaultPrompt);
        }
    }

    /**
     * 从 XML 文件中解析提示词
     */
    private async parsePromptFromXml(filePath: string): Promise<PromptTemplate | null> {
        try {
            const content = fs.readFileSync(filePath, 'utf8');
            const parser = new xml2js.Parser();
            const result = await parser.parseStringPromise(content);
            
            if (!result.prompt) {
                return null;
            }

            const prompt = result.prompt as XmlPrompt;
            return {
                id: prompt.id[0],
                name: prompt.name[0],
                content: prompt.content[0].trim(),
                source: prompt.source?.[0] || 'local',
                description: prompt.description?.[0],
                preferredLanguages: prompt.preferredLanguages?.[0]?.language || [],
                preferredLibraries: prompt.preferredLibraries?.[0]?.library || [],
                preferredLanguagePrompt: prompt.preferredLanguagePrompt?.[0],
                preferredLibraryPrompt: prompt.preferredLibraryPrompt?.[0]
            };
        } catch (error) {
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
            if (fs.existsSync(this._defaultPromptsPath)) {
                const files = fs.readdirSync(this._defaultPromptsPath);
                
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
        try {
            if (fs.existsSync(this._promptsStoragePath)) {
                const data = fs.readFileSync(this._promptsStoragePath, 'utf8');
                this._prompts = JSON.parse(data);
            } else {
                // 从 resources/prompts 目录加载默认提示词
                this._prompts = await this.loadDefaultPrompts();
                await this.savePrompts();
            }
        } catch (error) {
            console.error('加载提示词失败:', error);
            vscode.window.showErrorMessage(PROMPT_CONSTANTS.PROMPT_MANAGEMENT.ERROR.LOAD);
        }
    }

    /**
     * 保存提示词
     */
    private async savePrompts(): Promise<void> {
        try {
            fs.writeFileSync(this._promptsStoragePath, JSON.stringify(this._prompts, null, 2), 'utf8');
            this._onDidChangePrompts.fire();
        } catch (error) {
            console.error('保存提示词失败:', error);
            vscode.window.showErrorMessage(PROMPT_CONSTANTS.PROMPT_MANAGEMENT.ERROR.SAVE);
        }
    }

    /**
     * 下载远程提示词
     */
    private async downloadPrompts(url: string): Promise<void> {
        try {
            const response = await axios.get(url);
            const remotePrompts: PromptTemplate[] = response.data;
            
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
     * 注册提示词管理命令
     */
    private registerCommands(): void {
        // 添加提示词
        this.context.subscriptions.push(
            vscode.commands.registerCommand(PROMPT_CONSTANTS.COMMANDS.ADD_PROMPT, async () => {
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
                
                const content = await vscode.window.showInputBox({
                    prompt: PROMPT_CONSTANTS.PROMPT_MANAGEMENT.INPUT.CONTENT.PROMPT,
                    placeHolder: PROMPT_CONSTANTS.PROMPT_MANAGEMENT.INPUT.CONTENT.PLACEHOLDER,
                    ignoreFocusOut: true
                });
                
                if (!content) return;

                const languagesInput = await vscode.window.showInputBox({
                    prompt: PROMPT_CONSTANTS.PROMPT_MANAGEMENT.INPUT.PREFERRED_LANGUAGES.PROMPT,
                    placeHolder: PROMPT_CONSTANTS.PROMPT_MANAGEMENT.INPUT.PREFERRED_LANGUAGES.PLACEHOLDER,
                    ignoreFocusOut: true
                });

                const librariesInput = await vscode.window.showInputBox({
                    prompt: PROMPT_CONSTANTS.PROMPT_MANAGEMENT.INPUT.PREFERRED_LIBRARIES.PROMPT,
                    placeHolder: PROMPT_CONSTANTS.PROMPT_MANAGEMENT.INPUT.PREFERRED_LIBRARIES.PLACEHOLDER,
                    ignoreFocusOut: true
                });
                
                // 处理语言和库的输入
                const languages = languagesInput ? languagesInput.split(',').map(lang => lang.trim()) : [];
                const libraries = librariesInput ? librariesInput.split(',').map(lib => lib.trim()) : [];
                
                this._prompts.push({
                    id: uuidv4(),
                    name,
                    content,
                    preferredLanguages: languages,
                    preferredLibraries: libraries,
                    source: 'local'
                });
                this.savePrompts();
                vscode.window.showInformationMessage(PROMPT_CONSTANTS.PROMPT_MANAGEMENT.SUCCESS.ADD(name));
            })
        );
        
        // 编辑提示词
        this.context.subscriptions.push(
            vscode.commands.registerCommand(PROMPT_CONSTANTS.COMMANDS.EDIT_PROMPT, async () => {
                const selected = await this.selectPrompt(PROMPT_CONSTANTS.PROMPT_MANAGEMENT.SELECT.EDIT);
                if (!selected) return;

                if (this.isDefaultPrompt(selected)) {
                    vscode.window.showWarningMessage('默认提示词不能修改');
                    return;
                }
                
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
                
                const content = await vscode.window.showInputBox({
                    prompt: PROMPT_CONSTANTS.PROMPT_MANAGEMENT.INPUT.CONTENT.PROMPT,
                    value: selected.content,
                    ignoreFocusOut: true
                });
                
                if (!content) return;

                const languagesInput = await vscode.window.showInputBox({
                    prompt: PROMPT_CONSTANTS.PROMPT_MANAGEMENT.INPUT.PREFERRED_LANGUAGES.PROMPT,
                    value: selected.preferredLanguages?.join(', ') || '',
                    placeHolder: PROMPT_CONSTANTS.PROMPT_MANAGEMENT.INPUT.PREFERRED_LANGUAGES.PLACEHOLDER,
                    ignoreFocusOut: true
                });

                const librariesInput = await vscode.window.showInputBox({
                    prompt: PROMPT_CONSTANTS.PROMPT_MANAGEMENT.INPUT.PREFERRED_LIBRARIES.PROMPT,
                    value: selected.preferredLibraries?.join(', ') || '',
                    placeHolder: PROMPT_CONSTANTS.PROMPT_MANAGEMENT.INPUT.PREFERRED_LIBRARIES.PLACEHOLDER,
                    ignoreFocusOut: true
                });
                
                // 处理语言和库的输入
                const preferredLanguages = languagesInput ? languagesInput.split(',').map(lang => lang.trim()) : [];
                const preferredLibraries = librariesInput ? librariesInput.split(',').map(lib => lib.trim()) : [];
                
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
        
        // 删除提示词
        this.context.subscriptions.push(
            vscode.commands.registerCommand(PROMPT_CONSTANTS.COMMANDS.DELETE_PROMPT, async () => {
                const selected = await this.selectPrompt(PROMPT_CONSTANTS.PROMPT_MANAGEMENT.SELECT.DELETE);
                if (!selected) return;

                if (this.isDefaultPrompt(selected)) {
                    vscode.window.showWarningMessage('默认提示词不能删除');
                    return;
                }
                
                const confirmed = await vscode.window.showWarningMessage(
                    PROMPT_CONSTANTS.PROMPT_MANAGEMENT.CONFIRM.DELETE(selected.name),
                    { modal: true },
                    PROMPT_CONSTANTS.PROMPT_MANAGEMENT.CONFIRM.CONFIRM_BUTTON
                );
                
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
        
        // 使用提示词
        this.context.subscriptions.push(
            vscode.commands.registerCommand(PROMPT_CONSTANTS.COMMANDS.USE_PROMPT, async () => {
                const selected = await this.selectPrompt(PROMPT_CONSTANTS.PROMPT_MANAGEMENT.SELECT.USE);
                if (!selected) return;
                
                // 更新设置项
                await this.updateSettings(selected);
                
                vscode.window.showInformationMessage(PROMPT_CONSTANTS.PROMPT_MANAGEMENT.SUCCESS.USE(selected.name));
            })
        );

        // 下载远程提示词
        this.context.subscriptions.push(
            vscode.commands.registerCommand(PROMPT_CONSTANTS.COMMANDS.DOWNLOAD_PROMPTS, async () => {
                const url = await vscode.window.showInputBox({
                    prompt: PROMPT_CONSTANTS.PROMPT_MANAGEMENT.INPUT.REMOTE_URL.PROMPT,
                    placeHolder: PROMPT_CONSTANTS.PROMPT_MANAGEMENT.INPUT.REMOTE_URL.PLACEHOLDER
                });
                
                if (url) {
                    await this.downloadPrompts(url);
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
            if (prompt.preferredLanguages?.length) tags.push(PROMPT_CONSTANTS.TAGS.LANGUAGES(prompt.preferredLanguages));
            if (prompt.preferredLibraries?.length) tags.push(PROMPT_CONSTANTS.TAGS.LIBRARIES(prompt.preferredLibraries));
            if (prompt.source) tags.push(PROMPT_CONSTANTS.TAGS.SOURCE(prompt.source));
            
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
}
