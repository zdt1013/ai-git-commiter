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
        if (result.startsWith('```') && result.endsWith('```')) {
            result = result.split('\n').slice(1, -1).join('\n').trim();
        }

        return result;
    }
} 