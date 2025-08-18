/**
 * 文本处理工具类
 */
export class TextUtils {
    /**
     * 去除文本首尾的代码块标记（```）
     * @param text 需要处理的文本
     * @returns 处理后的文本
     */
    public static removeCodeBlockMarkers(text: string): string {
        if (!text) {
            return '';
        }

        let result = text.trim();

        // 去除首尾的```符号，如果有的话
        const lines = result.split('\n');
        if (lines.length > 0) {
            if (lines[0].trim() === '```') {
                lines.shift();
            }
            if (lines.length > 0 && lines[lines.length - 1].trim() === '```') {
                lines.pop();
            }
            result = lines.join('\n').trim();
        }

        return result;
    }
} 