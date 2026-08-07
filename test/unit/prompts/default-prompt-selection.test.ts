import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mkdir, mkdtemp, rm, writeFile } from 'fs/promises';
import { tmpdir } from 'os';
import path from 'path';
import { PromptService } from '../../../src/ai/prompt.service';

// 在每个测试前重置 PromptService 单例，避免跨测试污染
function resetPromptService() {
    (PromptService as any)._instance = null;
    (PromptService as any)._initializing = null;
}

// 构造最小可用的 XML 提示词模板
function buildXml(id: string, name: string, version = '1.0.0') {
    return `<?xml version="1.0" encoding="UTF-8"?>
<prompt>
    <id>${id}</id>
    <name>${name}</name>
    <source>local</source>
    <version>${version}</version>
    <description>test</description>
    <content><![CDATA[content {diff} {language} {projectInfo} {recentCommits}]]></content>
    <polishContent><![CDATA[polish {diff} {language} {projectInfo}]]></polishContent>
</prompt>`;
}

describe('默认提示词模板排序与选中稳定性', () => {
    let storagePath: string;
    let extensionRoot: string;
    let promptsDir: string;

    beforeEach(async () => {
        resetPromptService();
        storagePath = await mkdtemp(path.join(tmpdir(), 'ai-git-commiter-sel-'));
        extensionRoot = await mkdtemp(path.join(tmpdir(), 'ai-git-commiter-extension-'));
        promptsDir = path.join(extensionRoot, 'asserts', 'prompts');
        await mkdir(promptsDir, { recursive: true });
    });

    afterEach(async () => {
        await rm(storagePath, { recursive: true, force: true });
        await rm(extensionRoot, { recursive: true, force: true });
    });

    /**
     * A2 & 排序回归 — 真实 asserts/prompts/ 目录
     * default-no-emoji.xml 字典序在 default.xml 前面，排序后 default 应在首位
     */
    it('A2: 真实 asserts/prompts/ 加载后 getPrompts() 首项应为 default', async () => {
        const ctx = {
            extensionPath: process.cwd(),
            globalStorageUri: { fsPath: storagePath },
        } as any;
        const svc = await PromptService.getInstance(ctx);
        const prompts = svc.getPrompts();
        expect(prompts.length).toBeGreaterThan(0);
        expect(prompts[0].id).toBe('default');
    });

    /**
     * A1 — 字典序靠前的新模板不影响默认选中项
     * aaa-first.xml 字典序在 default.xml 前面，初始化后选中项应仍为 default
     */
    it('A1: 目录含字典序靠前的模板时，初始化选中项仍为 default', async () => {
        // 写入三个模板：aaa-first（字典序最前）、default、zzz-last
        await writeFile(path.join(promptsDir, 'aaa-first.xml'), buildXml('aaa-first', 'AAA First'));
        await writeFile(path.join(promptsDir, 'default.xml'), buildXml('default', '默认提示词'));
        await writeFile(path.join(promptsDir, 'zzz-last.xml'), buildXml('zzz-last', 'ZZZ Last'));

        const svc = await PromptService.getInstance({
            extensionPath: extensionRoot,
            globalStorageUri: { fsPath: storagePath },
        } as any);

        const prompts = svc.getPrompts();
        expect(prompts[0].id).toBe('default');

        // 选中项应写入 default
        const selected = svc.getSelectedPrompt();
        expect(selected.id).toBe('default');
    });

    /**
     * A2 — 非默认模板按 name localeCompare 排序
     */
    it('A2: default 置顶，其余按 name localeCompare 升序', async () => {
        await writeFile(path.join(promptsDir, 'aaa-first.xml'), buildXml('aaa-first', 'ZZZ Name'));
        await writeFile(path.join(promptsDir, 'default.xml'), buildXml('default', '默认提示词'));
        await writeFile(path.join(promptsDir, 'zzz-last.xml'), buildXml('zzz-last', 'AAA Name'));

        const svc = await PromptService.getInstance({
            extensionPath: extensionRoot,
            globalStorageUri: { fsPath: storagePath },
        } as any);

        const prompts = svc.getPrompts();
        expect(prompts[0].id).toBe('default');
        expect(prompts[1].id).toBe('zzz-last'); // name: 'AAA Name'
        expect(prompts[2].id).toBe('aaa-first'); // name: 'ZZZ Name'
    });

    /**
     * A3 — 权威默认模板缺失时 getSelectedPrompt() 应抛错
     */
    it('A3: 目录不含 default.xml 时 getSelectedPrompt() 抛错', async () => {
        await writeFile(path.join(promptsDir, 'other.xml'), buildXml('other', 'Other Template'));

        const svc = await PromptService.getInstance({
            extensionPath: extensionRoot,
            globalStorageUri: { fsPath: storagePath },
        } as any);

        expect(() => svc.getSelectedPrompt()).toThrow();
    });

    /**
     * getSelectedPrompt() — 配置选中项回落到 default
     */
    it('配置 selectedPromptTemplateId 为不存在的 id 时回落到 default', async () => {
        await writeFile(path.join(promptsDir, 'default.xml'), buildXml('default', '默认提示词'));

        const svc = await PromptService.getInstance({
            extensionPath: extensionRoot,
            globalStorageUri: { fsPath: storagePath },
        } as any);

        // mock：getConfiguration().get 返回不存在的 id
        const vscode = await import('../../../test/__mocks__/vscode');
        vi.spyOn(vscode.workspace, 'getConfiguration').mockReturnValue({
            get: (key: string) => key.endsWith('selectedPromptTemplateId') ? 'deleted-template' : undefined,
            update: () => Promise.resolve(),
            has: () => true,
        } as any);

        const selected = svc.getSelectedPrompt();
        expect(selected.id).toBe('default');

        vi.restoreAllMocks();
    });

    /**
     * getSelectedPrompt() — 列表为空时抛 Error 而非 TypeError
     */
    it('模板列表为空时 getSelectedPrompt() 抛 Error 不崩溃', async () => {
        // 空目录 → 无任何模板
        const svc = await PromptService.getInstance({
            extensionPath: extensionRoot,
            globalStorageUri: { fsPath: storagePath },
        } as any);

        expect(() => svc.getSelectedPrompt()).toThrow(Error);
    });
});
