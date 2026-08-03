import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { mkdtemp, readFile, rm } from 'fs/promises';
import { tmpdir } from 'os';
import path from 'path';
import { Parser } from 'xml2js';
import { PromptService } from '../../../src/ai/prompt.service';
import type { PromptTemplate } from '../../../src/types/types';

describe('default-no-emoji prompt template', () => {
    const extensionPath = process.cwd();
    const templatePath = path.join(extensionPath, 'asserts', 'prompts', 'default-no-emoji.xml');
    let storagePath: string;
    let defaultTemplate: PromptTemplate | undefined;
    let template: PromptTemplate | undefined;

    beforeAll(async () => {
        storagePath = await mkdtemp(path.join(tmpdir(), 'ai-git-commiter-prompt-'));
        const promptService = await PromptService.getInstance({
            extensionPath,
            globalStorageUri: { fsPath: storagePath },
        } as never);

        const prompts = promptService.getPrompts();
        defaultTemplate = prompts.find(prompt => prompt.id === 'default');
        template = prompts.find(prompt => prompt.id === 'default-no-emoji');
    });

    afterAll(async () => {
        await rm(storagePath, { recursive: true, force: true });
    });

    it('应该通过现有提示词加载器发现完整的内置模板', () => {
        expect(template).toMatchObject({
            id: 'default-no-emoji',
            name: '默认提示词（无 Emoji）',
            source: 'local',
        });
        expect(template?.version).toBe(defaultTemplate?.version);
        expect(template?.content).toBeTruthy();
        expect(template?.polishContent).toBeTruthy();
        expect(template?.description).toBeTruthy();
    });

    it('自动生成与手动润色提示词应该使用无 Emoji 标题格式', () => {
        const contents = [template?.content, template?.polishContent];

        for (const content of contents) {
            expect(content).toContain('<type>(<scope>): <subject>');
            expect(content).not.toMatch(/\p{Extended_Pictographic}/u);
            expect(content).not.toContain('<emoji>');
            expect(content).not.toContain('| Emoji |');
        }
    });

    it('应该保留两条生成路径所需的占位符', () => {
        expect(template?.content).toEqual(expect.stringContaining('{diff}'));
        expect(template?.content).toEqual(expect.stringContaining('{language}'));
        expect(template?.content).toEqual(expect.stringContaining('{projectInfo}'));
        expect(template?.content).toEqual(expect.stringContaining('{recentCommits}'));

        expect(template?.polishContent).toEqual(expect.stringContaining('{diff}'));
        expect(template?.polishContent).toEqual(expect.stringContaining('{language}'));
        expect(template?.polishContent).toEqual(expect.stringContaining('{projectInfo}'));
    });

    it('应该包含模板使用说明', async () => {
        const xml = await readFile(templatePath, 'utf8');
        const parsed = await new Parser().parseStringPromise(xml);

        expect(parsed.prompt.usage[0].step).toHaveLength(4);
    });
});
