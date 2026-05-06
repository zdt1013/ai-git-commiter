import { describe, it, expect } from 'vitest';
import { TextUtils } from '../../../src/utils/text-utils';

describe('TextUtils', () => {
    describe('removeCodeBlockMarkers()', () => {
        it('应该移除首尾的 markdown 代码块标记', () => {
            const input = "```json\n{\n  \"key\": \"value\"\n}\n```";
            const expected = "{\n  \"key\": \"value\"\n}";
            expect(TextUtils.removeCodeBlockMarkers(input)).toBe(expected);
        });

        it('处理空字符串应当安全返回', () => {
            expect(TextUtils.removeCodeBlockMarkers('')).toBe('');
        });
        
        it('如果没有首尾标记，应返回修剪空格后的原样文本', () => {
            const input = "  some text  ";
            expect(TextUtils.removeCodeBlockMarkers(input)).toBe("some text");
        });
        
        it('只有开头标记的情况下应该正常移除开头标记', () => {
            const input = "```json\nsome text";
            expect(TextUtils.removeCodeBlockMarkers(input)).toBe("some text");
        });

        it('只有结尾标记的情况下应该正常移除结尾标记', () => {
            const input = "some text\n```";
            expect(TextUtils.removeCodeBlockMarkers(input)).toBe("some text");
        });
    });

    describe('stripBase64Images()', () => {
        it('应该将 HTML 的 base64 data URI 替换为占位符', () => {
            const longBase64 = 'A'.repeat(100);
            const input = `<img src="data:image/png;base64,${longBase64}" />`;
            
            const { result, count } = TextUtils.stripBase64Images(input);
            expect(count).toBe(1);
            expect(result).toContain('[base64 image data placeholder]');
            expect(result).not.toContain(longBase64);
        });

        it('应该将 Markdown 图片语法中的 base64 替换为占位符', () => {
            const longBase64 = 'B'.repeat(80);
            const input = `![test image](data:image/jpeg;base64,${longBase64})`;
            
            const { result, count } = TextUtils.stripBase64Images(input);
            expect(count).toBe(1);
            expect(result).toBe('![test image](data:image/jpeg;base64,[base64 image data placeholder])');
        });

        it('应该将 JSON 中的长 base64 字符串替换为占位符', () => {
            const longBase64 = 'C'.repeat(100);
            const input = `{ "image/png": "${longBase64}" }`;
            
            const { result, count } = TextUtils.stripBase64Images(input);
            expect(count).toBe(1);
            expect(result).toBe(`{ "image/png": "[base64 image data placeholder]" }`);
        });

        it('应该替换裸 base64 行', () => {
            // 这是 git diff 中添加一行长 base64 字符串的场景
            const longBase64 = 'D'.repeat(100) + '==';
            const input = `+ ${longBase64}`;
            
            const { result, count } = TextUtils.stripBase64Images(input);
            expect(count).toBe(1);
            expect(result).toBe(`+ [base64 image data placeholder]`);
        });
        
        it('对较短的字符串（非图片 base64 数据）不应该替换', () => {
            const shortString = "Hello World";
            const input = `+ ${shortString}`;
            
            const { result, count } = TextUtils.stripBase64Images(input);
            expect(count).toBe(0);
            expect(result).toBe(input);
        });
    });
});
