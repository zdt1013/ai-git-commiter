import * as vscode from 'vscode';
import { simpleGit, SimpleGit } from 'simple-git';
import { GitExtension, Repository } from './types/git';

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
    }): Promise<string | undefined> {
        try {
            this.git = simpleGit(repoPath);
            const diffOptions: string[] = ['--cached'];

            // 添加word diff选项
            if (options?.wordDiff) {
                diffOptions.push('--word-diff');
            }

            // 添加上下文行数选项
            if (options?.unified !== undefined) {
                diffOptions.push(`-U${options.unified}`);
            }

            // 添加颜色选项
            if (options?.noColor) {
                diffOptions.push('--no-color');
            }

            // 添加文件过滤选项
            if (options?.diffFilter) {
                diffOptions.push(`--diff-filter=${options.diffFilter}`);
            }

            let diff = await this.git.diff(diffOptions);

            // 过滤元信息
            if (options?.filterMeta) {
                diff = diff.split('\n')
                    .filter(line => !line.startsWith('index ') &&
                        !line.startsWith('diff --git') &&
                        !line.startsWith('Binary file') &&
                        !line.startsWith('---') &&
                        !line.startsWith('+++'))
                    .join('\n');
            }

            return diff;
        } catch (error) {
            console.error('获取Git差异失败:', error);
            return undefined;
        }
    }

    /**
     * 获取当前VS Code打开的Git仓库信息
     * @returns 返回当前仓库的Repository对象，如果没有找到则返回null
     */
    static async getCurrentRepository(): Promise<Repository | undefined> {
        const gitExtension = vscode.extensions.getExtension<GitExtension>('vscode.git')?.exports;
        if (!gitExtension) {
            return undefined;
        }
        const api = gitExtension.getAPI(1);
        const repositories = api.repositories;
        return repositories[0];
    }

    /**
     * 获取当前Git仓库的变更行数
     * @param repoPath 仓库路径 
     * @return 返回变更行数
     */
    static async getChangesCount(repoPath: string): Promise<number> {
        try {
            this.git = simpleGit(repoPath);
            const stats = (await this.git.diff(['--cached', '--shortstat'])).trim();

            let totalChanges = 0;

            // 使用正则表达式一次性提取所有数字
            const regex = /(\d+) files? changed(?:, (\d+) insertions?\(\+\))?(?:, (\d+) deletions?\(-\))?|(?:(\d+) insertions?\(\+\))?(?:, (\d+) deletions?\(-\))?/;
            const matches = stats.match(regex);

            if (matches) {
                // 文件变更数
                const filesChanged = matches[1] ? parseInt(matches[1], 10) : 0;

                // 新增行数 - 可能在不同位置出现
                const insertions = matches[2] ? parseInt(matches[2], 10) :
                    matches[4] ? parseInt(matches[4], 10) : 0;

                // 删除行数 - 可能在不同位置出现
                const deletions = matches[3] ? parseInt(matches[3], 10) :
                    matches[5] ? parseInt(matches[5], 10) : 0;

                totalChanges = insertions + deletions;

                // 如果没有行变更但有文件变更，使用文件数
                if (totalChanges === 0 && filesChanged > 0) {
                    totalChanges = filesChanged;
                }
            }

            return totalChanges;
        } catch (error) {
            console.error('获取变更行数失败:', error);
            return 0;
        }
    }

    /**
     * 检查变更行数是否超过限制
     * @param repository Git仓库
     * @param maxChanges 最大变更行数
     * @returns 是否超过限制
     */
    public static async checkChangesLimit(repository: Repository, maxChanges: number): Promise<boolean> {
        if (!repository.rootUri) {
            return false;
        }
        const changes = await this.getChangesCount(repository.rootUri.fsPath);
        return changes > maxChanges;
    }
} 