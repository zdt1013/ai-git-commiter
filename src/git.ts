import * as vscode from 'vscode';
import { Repository } from './types';
import { simpleGit, SimpleGit } from 'simple-git';

export class GitService {
    //  获取Git差异
    static async getDiff(repoPath: string): Promise<string> {
        try {
            const config = vscode.workspace.getConfiguration('ai-git-commit');
            const wordDiff = config.get<boolean>('git.wordDiff') ?? true;
            const unified = config.get<number>('git.unified') ?? 0;
            const noColor = config.get<boolean>('git.noColor') ?? true;
            const diffFilter = config.get<string>('git.diffFilter') ?? 'ACMRT';
            const filterMeta = config.get<boolean>('git.filterMeta') ?? true;

            const git: SimpleGit = simpleGit(repoPath);

            // 配置 diff 选项
            const diffOptions = {
                '--word-diff': wordDiff,
                '--unified': unified,
                '--no-color': noColor,
                '--diff-filter': diffFilter
            };

            // 获取暂存区的差异
            let diff = await git.diff(['--staged', ...Object.entries(diffOptions)
                .filter(([_, value]) => value !== false)
                .map(([key, value]) => value === true ? key : `${key}=${value}`)
            ]);

            // 如果暂存区没有差异，获取工作区的差异
            if (!diff.trim()) {
                diff = await git.diff([...Object.entries(diffOptions)
                    .filter(([_, value]) => value !== false)
                    .map(([key, value]) => value === true ? key : `${key}=${value}`)
                ]);
            }

            // 过滤元信息
            if (filterMeta) {
                diff = diff.split('\n')
                    .filter(line => !line.startsWith('index ') &&
                        !line.startsWith('diff ') &&
                        !line.startsWith('Binary file ') &&
                        !line.startsWith('--- ') &&
                        !line.startsWith('+++ '))
                    .join('\n');
            }

            return diff;
        } catch (error) {
            console.error('获取Git差异时出错:', error);
            return '';
        }
    }

    // 获取当前仓库
    /**
     * 获取当前VS Code打开的Git仓库信息
     * @returns 返回当前仓库的Repository对象，如果没有找到则返回null
     */
    static async getCurrentRepository(): Promise<Repository | null> {
        // 获取VS Code的Git扩展
        const gitExtension = vscode.extensions.getExtension('vscode.git')?.exports;
        if (!gitExtension) {
            return null;
        }

        // 获取Git API (版本1)
        const api = gitExtension.getAPI(1);
        // 获取所有仓库列表
        const repositories = api.repositories;

        // 如果没有仓库则返回null
        if (!repositories.length) {
            return null;
        }

        // 返回第一个仓库(通常是当前工作区的仓库)
        return repositories[0];
    }
} 