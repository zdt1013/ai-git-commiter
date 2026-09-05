import { afterEach, describe, expect, it, vi } from 'vitest';
import * as vscode from '../../../test/__mocks__/vscode';
import { AIServiceFactory } from '../../../src/ai/ai-service.factory';
import { CommitCommand } from '../../../src/commands/commit.command';
import { GitService } from '../../../src/git';

describe('CommitCommand', () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('AI 返回空正文时保留原输入且不提示生成成功', async () => {
        const repository = {
            rootUri: { fsPath: '/mock/repository' },
            inputBox: { value: 'existing commit message' },
        } as any;
        const config = {
            language: '简体中文',
            git: {
                diff: {
                    wordDiff: false,
                    unified: 3,
                    noColor: true,
                    diffFilter: 'ACMRTUXB',
                    filterMeta: false,
                    includeSummary: false,
                    area: 'working',
                },
            },
            prompt: {
                enableProjectPerception: false,
                projectInfoPath: '',
                enableRecentCommits: false,
                recentCommitsCount: 3,
            },
        } as any;
        const promptService = {
            getSelectedPrompt: () => ({ id: 'default', content: '{diff}', polishContent: '{diff}' }),
        } as any;
        const emptyService = {
            async *generateCommitMessage() {},
        } as any;

        vi.spyOn(GitService, 'getDiff').mockResolvedValue('mock diff');
        vi.spyOn(AIServiceFactory, 'getAIService').mockReturnValue(emptyService);
        const successSpy = vi.spyOn(vscode.window, 'showInformationMessage');
        const errorSpy = vi.spyOn(vscode.window, 'showErrorMessage');

        const command = new CommitCommand({} as any, promptService, {} as any);
        await (command as any).handleNormalChanges(repository, config);

        expect(repository.inputBox.value).toBe('existing commit message');
        expect(successSpy).not.toHaveBeenCalled();
        expect(errorSpy).toHaveBeenCalledWith(
            'The AI model returned an empty response. Please try again or increase the max output tokens.',
        );
    });
});
