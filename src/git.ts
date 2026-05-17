import * as vscode from 'vscode';
import { simpleGit, SimpleGit } from 'simple-git';
import { GitExtension, Repository } from './types/git';
import { GIT_CONSTANTS } from './constants';
import { Logger } from './utils/logger';
import { TextUtils } from './utils/text-utils';

export class GitService {
    private static git: SimpleGit;

    /**
     * 获取当前Git仓库的路径
     * @param repoPath 仓库路径
     * @param options diff选项
     * @returns 返回当前Git仓库的路径，如果没有找到则返回undefined
     * */
    static async getDiff(repoPath: string, options?: {
        wordDiff?: boolean;
        unified?: number;
        noColor?: boolean;
        diffFilter?: string;
        filterMeta?: boolean;
        area?: string;
    }): Promise<string | undefined> {
        try {
            this.git = simpleGit(repoPath);
            const diffOptions: string[] = [];

            // 根据areaConfigure决定是否使用--cached选项
            if (options?.area === 'staged' || options?.area === 'cached') {
                diffOptions.push('--cached');
            } else if (options?.area === "working") {
                diffOptions.push(`HEAD`);
            } else if (options?.area === "auto") {
                // 自动判断：先检查暂存区，如果有变更则返回暂存区变更，否则检查工作区
                // Auto determine: check staged first, if changes exist return staged changes, else check working area
                const stagedChanges = await this.getChangesCount(repoPath, 'staged', options?.diffFilter);
                if (stagedChanges > 0) {
                    // 暂存区有变更，使用暂存区
                    // Staged area has changes, use staged area
                    diffOptions.push('--cached');
                } else {
                    // 暂存区None变更，检查工作区
                    const workingChanges = await this.getChangesCount(repoPath, 'working', options?.diffFilter);
                    if (workingChanges > 0) {
                        // 工作区有变更，使用工作区
                        // Working area has changes, use working area
                        diffOptions.push('HEAD');
                    } else {
                        // 两个区域都没有变更
                        // Neither area has changes
                        return undefined;
                    }
                }
            } else {
                return undefined;
            }

            // 添加word diff选项
            // Add word diff option
            if (options?.wordDiff) {
                diffOptions.push('--word-diff');
            }

            // 添加上下文行数选项
            // Add context lines count option
            if (options?.unified !== undefined) {
                diffOptions.push(`-U${options.unified}`);
            }

            // 添加颜色选项
            // Add color option
            if (options?.noColor) {
                diffOptions.push('--no-color');
            }

            // 添加文件过滤选项
            // Add file filter option
            if (options?.diffFilter) {
                diffOptions.push(`--diff-filter=${options.diffFilter}`);
            }

            let diff = await this.git.diff(diffOptions);

            // 过滤元信息
            // Filter meta info
            if (options?.filterMeta) {
                diff = diff.split('\n')
                    .filter(line => !line.startsWith('index ') &&
                        !line.startsWith('diff --git') &&
                        !line.startsWith('Binary file') &&
                        !line.startsWith('---') &&
                        !line.startsWith('+++'))
                    .join('\n');
            }

            // 替换 base64 图片数据，避免内容过大
            // Replace base64 image data to avoid content being too large
            const { result: strippedDiff, count: base64Count } = TextUtils.stripBase64Images(diff);
            if (base64Count > 0) {
                Logger.log(`[GitService] Stripped ${base64Count} base64 image(s) from diff`);
                diff = strippedDiff;
            }

            return diff;
        } catch (error) {
            Logger.error(vscode.l10n.t("Failed to get Git diff"), error);
            return undefined;
        }
    }

    /**
     * 获取当前VS Code打开的Git仓库信息
     * @returns 返回当前仓库的Repository对象，如果没有找到则返回null
     */
    static async getCurrentRepository(rootUri: vscode.Uri | null): Promise<Repository | null> {
        Logger.log(`[GitService] getCurrentRepository called, rootUri=${rootUri?.fsPath ?? 'null'}`);

        const gitExtension = vscode.extensions.getExtension<GitExtension>('vscode.git')?.exports;
        if (!gitExtension) {
            Logger.warn('[GitService] vscode.git extension not found or not exported');
            return null;
        }

        const api = gitExtension.getAPI(1);

        // 如果 git API 还未初始化完成，等待就绪（最多 5 秒）
        // If git API is not initialized yet, wait for readiness (max 5 secs)
        if (api.state === 'uninitialized') {
            Logger.log('[GitService] git API is uninitialized, waiting for it to be ready...');
            await new Promise<void>((resolve) => {
                const disposable = api.onDidChangeState((state) => {
                    if (state !== 'uninitialized') {
                        Logger.log(`[GitService] git API state changed to: ${state}`);
                        disposable.dispose();
                        resolve();
                    }
                });
                // 超时保险：5 秒后不管状态如何都继续
                // Timeout safeguard: continue after 5 secs regardless of status
                setTimeout(() => { disposable.dispose(); resolve(); }, 5000);
            });
        }

        Logger.log(`[GitService] git API state=${api.state}, repositories count=${api.repositories.length}`);
        api.repositories.forEach((r, i) => {
            Logger.log(`[GitService]   repo[${i}]: ${r.rootUri?.fsPath}`);
        });

        if (!rootUri) {
            const repositories = api.repositories;
            if (repositories.length === 0) {
                Logger.warn('[GitService] No repositories found in workspace');
                return null;
            } else if (repositories.length === 1) {
                Logger.log(`[GitService] Single repository found: ${repositories[0].rootUri?.fsPath}`);
                return repositories[0];
            } else {
                // 多个仓库时，尝试获取活动编辑器所在的仓库
                // If multiple repos, try to get repo of active editor
                const activeEditor = vscode.window.activeTextEditor;
                Logger.log(`[GitService] Multiple repos (${repositories.length}), activeEditor=${activeEditor?.document.uri.fsPath ?? 'none'}`);
                if (activeEditor) {
                    const activeDocUri = activeEditor.document.uri;
                    const activeRepo = api.getRepository(activeDocUri);
                    if (activeRepo) {
                        Logger.log(`[GitService] Resolved repo from active editor: ${activeRepo.rootUri?.fsPath}`);
                        return activeRepo;
                    }
                    Logger.warn(`[GitService] Could not resolve repo for active editor: ${activeDocUri.fsPath}`);
                } else {
                    // 如果没有活动编辑器，弹窗让用户选择仓库
                    // If no active editor, prompt user to select repo
                    const repoItems = repositories.map(repo => ({
                        label: repo.rootUri.fsPath,
                        repo: repo
                    }));
                    // 显示快速选择菜单,让用户选择仓库
                    // Show quick pick menu for user to select repo
                    const selected = await vscode.window.showQuickPick(repoItems, {
                        placeHolder: GIT_CONSTANTS.NEED_SELECTION
                    });
                    Logger.log(`[GitService] User selected repo: ${selected?.label ?? 'none (cancelled)'}`);
                    return selected ? selected.repo : null;
                }
            }
        }

        const resolved = rootUri ? api.getRepository(rootUri) : null;
        Logger.log(`[GitService] getRepository(rootUri) => ${resolved?.rootUri?.fsPath ?? 'null'}`);
        return resolved;
    }

    /**
     * 获取当前Git仓库的变更行数
     * @param repoPath 仓库路径 
     * @param area 变更区域
     * @param diffFilter 文件过滤选项
     * @return 返回变更行数
     */
    static async getChangesCount(repoPath: string, area?: string, diffFilter?: string): Promise<number> {
        try {
            this.git = simpleGit(repoPath);
            const diffOptions: string[] = [];

            // 根据areaConfigure决定是否使用--cached选项
            if (area === 'staged' || area === 'cached') {
                diffOptions.push(`--cached`); // staged 与 cached 等价
 // staged is equivalent to cached
            } else if (area === "working") {
                diffOptions.push(`HEAD`);
            } else if (area === "auto") {
                // 自动判断：先检查暂存区，如果有变更则返回暂存区变更，否则检查工作区
                // Auto determine: check staged first, if changes exist return staged changes, else check working area
                const stagedChanges = await this.getChangesCount(repoPath, 'staged', diffFilter);
                if (stagedChanges > 0) {
                    return stagedChanges;
                }
                return await this.getChangesCount(repoPath, 'working', diffFilter);
            } else {
                return -1;
            }

            // 添加文件过滤选项
            // Add file filter option
            if (diffFilter) {
                diffOptions.push(`--diff-filter=${diffFilter}`);
            }

            const stats = (await this.git.diff([...diffOptions, '--shortstat'])).trim();

            let totalChanges = 0;

            // 使用正则表达式一次性提取所有数字
            // Extract all numbers at once using regex
            const regex = /(\d+) files? changed(?:, (\d+) insertions?\(\+\))?(?:, (\d+) deletions?\(-\))?|(?:(\d+) insertions?\(\+\))?(?:, (\d+) deletions?\(-\))?/;
            const matches = stats.match(regex);

            if (matches) {
                // 文件变更数
                // Files changed count
                const filesChanged = matches[1] ? parseInt(matches[1], 10) : 0;

                // 新增行数 - 可能在不同位置出现
                // Added lines count - might appear in different positions
                const insertions = matches[2] ? parseInt(matches[2], 10) :
                    matches[4] ? parseInt(matches[4], 10) : 0;

                // 删除行数 - 可能在不同位置出现
                // Deleted lines count - might appear in different positions
                const deletions = matches[3] ? parseInt(matches[3], 10) :
                    matches[5] ? parseInt(matches[5], 10) : 0;

                totalChanges = insertions + deletions;

                // 如果没有行变更但有文件变更，使用文件数
                // If no line changes but file changes exist, use file count
                if (totalChanges === 0 && filesChanged > 0) {
                    totalChanges = filesChanged;
                }
            }

            return totalChanges;
        } catch (error) {
            Logger.error(vscode.l10n.t("Failed to get changed lines count"), error);
            return -1;
        }
    }

    /**
     * 检查变更行数是否超过限制
     * @param repository Git仓库
     * @param maxChanges 最大变更行数
     * @param area 变更区域
     * @param diffFilter 文件过滤选项
     * @returns 是否超过限制
     */
    public static async checkChangesLimit(
        repository: Repository,
        maxChanges: number,
        area?: string,
        diffFilter?: string
    ): Promise<boolean> {
        if (!repository.rootUri) {
            return false;
        }
        const changes = await this.getChangesCount(repository.rootUri.fsPath, area, diffFilter);
        return changes > maxChanges;
    }
} 