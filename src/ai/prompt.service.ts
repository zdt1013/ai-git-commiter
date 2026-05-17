import * as vscode from 'vscode';
import * as fs from 'fs';
import { readFile, access, constants, readdir, writeFile } from 'fs/promises';
import * as path from 'path';
import * as xml2js from 'xml2js';
import axios from 'axios';
import { PromptTemplate, XmlPrompt } from '../types/types';
import { PROMPT_CONSTANTS, CONFIG_CONSTANTS } from '../constants';

/**
 * 提示词管理器类 - 单例模式
 */
export class PromptService {
    private static _instance: PromptService | null = null;
    private static _initializing: Promise<void> | null = null;
    private _promptsStoragePath: string;
    private _prompts: PromptTemplate[] = [];
    private _onDidChangePrompts: vscode.EventEmitter<void> = new vscode.EventEmitter<void>();
    private _defaultPromptsPath: string;
    private readonly _context: vscode.ExtensionContext;

    public readonly onDidChangePrompts: vscode.Event<void> = this._onDidChangePrompts.event;

    private constructor(context: vscode.ExtensionContext) {
        this._context = context;
        // 设置存储路径
        // Set storage path
        this._promptsStoragePath = path.join(context.globalStorageUri.fsPath, 'prompts.json');
        this._defaultPromptsPath = path.join(context.extensionPath, 'asserts', 'prompts');

        // 确保存储目录存在
        // Ensure storage directory exists
        if (!fs.existsSync(path.dirname(this._promptsStoragePath))) {
            fs.mkdirSync(path.dirname(this._promptsStoragePath), { recursive: true });
        }
    }

    /**
     * 获取 PromptService 实例
     * @param context VSCode扩展上下文
     * @returns Promise<PromptService> 初始化完成的 PromptService 实例
     */
    public static async getInstance(context: vscode.ExtensionContext): Promise<PromptService> {
        if (!PromptService._instance) {
            PromptService._instance = new PromptService(context);
            PromptService._initializing = PromptService._instance.initialize();
        }

        // 等待初始化完成
        // Wait for initialization to complete
        await PromptService._initializing;
        return PromptService._instance;
    }

    /**
     * 初始化提示词管理器
     */
    public async initialize(): Promise<void> {
        // 加载提示词
        // Load prompt
        await this.loadPrompts();
        // 获取当前选中的提示词ID
        // Get currently selected prompt ID
        const config = vscode.workspace.getConfiguration(CONFIG_CONSTANTS.ROOT);
        const selectedPromptId = config.get<string>(CONFIG_CONSTANTS.PROMPT.SELECTED_PROMPT_TEMPLATE_ID);

        // bugfix: 如果用户没有选择任何提示词，则设置Default prompt
        if (!selectedPromptId) {
            const defaultPrompt = this._prompts.find(p => p.id === 'default');
            if (defaultPrompt) {
                await this.updateSelectedPrompt(defaultPrompt);
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
            // Read XML file content
            const content = await readFile(filePath, 'utf8');
            // 创建XML解析器
            // Create XML parser
            const parser = new xml2js.Parser();
            // 解析XML内容为JS对象
            // Parse XML content to JS object
            const result = await parser.parseStringPromise(content);

            // 检查是否包含prompt节点
            // Check if contains prompt node
            if (!result.prompt) {
                return null;
            }

            // 类型断言为XmlPrompt接口
            // Type assertion to XmlPrompt interface
            const prompt = result.prompt as XmlPrompt;
            // 构建并返回提示词模板对象
            // Build and return prompt template object
            return {
                id: prompt.id[0],  // 提示词ID
  // Prompt ID
                name: prompt.name[0],  // 提示词名称
  // Prompt name
                content: prompt.content[0].trim(),  // 提示词内容(去除首尾空格)
  // Prompt content (trim whitespaces)
                polishContent: prompt.polishContent[0].trim(),  // 润色提示词内容(去除首尾空格)
  // Polish prompt content (trim whitespaces)
                source: prompt.source?.[0] || 'local',  // 来源(默认为本地)
  // Source (default to local)
                description: prompt.description?.[0],  // 描述信息(可选)
  // Description (optional)
                version: prompt.version?.[0]  // 版本号(可选)
  // Version (optional)
            };
        } catch (error) {
            // 捕获并记录解析错误
            // Catch and log parsing error
            console.error(`解析提示词文件失败 ${filePath}:`, error);
            return null;
        }
    }

    /**
     * 加载Default prompt
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
            console.error(vscode.l10n.t("Failed to load default prompt:"), error);
        }

        return prompts;
    }

    /**
     * 加载提示词
     */
    private async loadPrompts(): Promise<void> {
        // 加载Default prompt
        const defaultPrompts = await this.loadDefaultPrompts();
        try {
            await access(this._promptsStoragePath, constants.F_OK | constants.W_OK);
            const data = await readFile(this._promptsStoragePath, 'utf8');
            this._prompts = JSON.parse(data);

            // 比较版本并更新提示词
            // Compare version and update prompt
            for (const defaultPrompt of defaultPrompts) {
                const existingPrompt = this._prompts.find(p => p.id === defaultPrompt.id);
                if (existingPrompt) {
                    // 如果版本号不同，更新提示词
                    // If version number differs, update prompt
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
                    // If prompt doesn't exist, add it
                    this._prompts.push({
                        ...defaultPrompt,
                        source: 'local'
                    });
                }
            }
            // 保存更新后的提示词
            // Save updated prompt
            await this.savePrompts();
        } catch (error) {
            // 如果存储文件不存在，使用Default prompt
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
            // Convert prompt array to formatted JSON string and write to file
            await writeFile(this._promptsStoragePath, JSON.stringify(this._prompts, null, 2), 'utf8');
            // 触发提示词变更事件通知所有监听器
            // Trigger prompt change event to notify all listeners
            this._onDidChangePrompts.fire();
        } catch (error) {
            // 捕获并记录文件写入错误
            // Catch and log file writing error
            console.error(vscode.l10n.t("Failed to save prompt:"), error);
            // 向用户显示保存失败的提示信息
            // Show save failure notification to user
            vscode.window.showErrorMessage(PROMPT_CONSTANTS.PROMPT_MANAGEMENT.ERROR.SAVE);
        }
    }

    /**
     * 下载远程提示词
     */
    public async downloadPrompts(url: string): Promise<void> {
        try {
            const response = await axios.get(url);
            let remotePrompts: PromptTemplate[] = response.data;

            // 校验返回内容是否包含必要的设置项
            // Validate if return content contains necessary settings
            const invalidPrompts = remotePrompts.filter(prompt => {
                return !prompt.id || !prompt.name || !prompt.content || !prompt.polishContent;
            });

            if (invalidPrompts.length > 0) {
                vscode.window.showErrorMessage(vscode.l10n.t("Skipped {0} downloaded prompts because they are missing required fields (id, name, content, polishContent)", invalidPrompts.length));
                // 过滤掉None效的提示词
                remotePrompts = remotePrompts.filter(prompt => {
                    return prompt.id && prompt.name && prompt.content && prompt.polishContent;
                });
            }

            // 合并提示词
            // Merge prompts
            remotePrompts.forEach(remotePrompt => {
                const existingIndex = this._prompts.findIndex(p => p.id === remotePrompt.id);
                if (existingIndex === -1) {
                    // 添加新提示词
                    // Add new prompt
                    this._prompts.push({
                        ...remotePrompt,
                        source: 'remote',
                        url
                    });
                } else {
                    // 如果本地提示词是Default prompt，不更新
                    if (this.isDefaultPrompt(this._prompts[existingIndex])) {
                        return;
                    }
                    // 更新现有提示词
                    // Update existing prompt
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
            console.error(vscode.l10n.t("Failed to download remote prompts:"), error);
            vscode.window.showErrorMessage(PROMPT_CONSTANTS.PROMPT_MANAGEMENT.ERROR.DOWNLOAD);
        }
    }

    /**
     * 判断提示词是否为Default prompt
     */
    private isDefaultPrompt(prompt: PromptTemplate): boolean {
        return prompt.source === 'local' &&
            !!this._defaultPromptsPath &&
            fs.existsSync(path.join(this._defaultPromptsPath, `${prompt.id}.xml`));
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
        // Find selected template
        const selectedPrompt = this._prompts.find(p => p.id === selectedPromptId);
        if (selectedPrompt) {
            return selectedPrompt;
        }

        // 如果没有选中模板，返回默认模板
        // Return default template if none selected
        const defaultPrompt = this._prompts.find(p => p.id === 'default');
        if (defaultPrompt) {
            return defaultPrompt;
        }

        // 如果连默认模板都没有，返回第一个模板
        // Return first template if no default template
        return this._prompts[0];
    }

    public async updateSelectedPrompt(prompt: PromptTemplate): Promise<void> {
        const config = vscode.workspace.getConfiguration(CONFIG_CONSTANTS.ROOT);
        await config.update(CONFIG_CONSTANTS.PROMPT.SELECTED_PROMPT_TEMPLATE_ID, prompt.id, true);
        await config.update(CONFIG_CONSTANTS.PROMPT.SELECTED_TEMPLATE_PROMPT, prompt.content, true);
    }

    public addPrompt(prompt: PromptTemplate): void {
        this._prompts.push(prompt);
        this.savePrompts();
    }

    public updatePrompt(prompt: PromptTemplate): void {
        const index = this._prompts.findIndex(p => p.id === prompt.id);
        if (index !== -1) {
            this._prompts[index] = prompt;
            this.savePrompts();
        }
    }

    public deletePrompt(id: string): void {
        const index = this._prompts.findIndex(p => p.id === id);
        if (index !== -1) {
            this._prompts.splice(index, 1);
            this.savePrompts();
        }
    }
}
