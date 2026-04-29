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

    /**
     * 将 git diff 内容中嵌入的 base64 图片数据替换为占位符，
     * 避免因图片数据过大导致 token 超限。
     *
     * 覆盖场景：
     *  - HTML/SVG：src="data:image/...;base64,AAA..."
     *  - Markdown：![alt](data:image/...;base64,AAA...)
     *  - CSS：url(data:image/...;base64,AAA...)
     *  - 源码字符串赋值：= "data:image/...;base64,AAA..."
     *  - Jupyter Notebook：JSON 字段值为纯 base64 字符串（image/png 等）
     *  - 裸 base64 行：diff 行内容几乎全为 base64 字符且长度超过阈值
     *
     * @param diff 原始 git diff 文本
     * @returns 替换后的 diff 文本，以及替换次数
     */
    public static stripBase64Images(diff: string): { result: string; count: number } {
        if (!diff) {
            return { result: diff, count: 0 };
        }

        let count = 0;
        const placeholder = '[base64 image data placeholder]';

        // ── 1. data URI 内联图片 ──────────────────────────────────────────────
        // 覆盖：HTML src/href、Markdown ![]()、CSS url()、源码字符串赋值
        // 匹配 data:image/<type>;base64, 后跟 base64 字符（含跨行续行）
        let result = diff.replace(
            /(data:image\/[a-zA-Z0-9+\-.]+;base64,)[A-Za-z0-9+/=\r\n]{20,}/g,
            (_match, prefix) => {
                count++;
                return `${prefix}${placeholder}`;
            }
        );

        // ── 2. Jupyter Notebook / JSON 图片字段 ──────────────────────────────
        // 形如 "image/png": "iVBOR..." 或 "image/jpeg": "..."
        // 也覆盖 ipynb outputs 中 source 字段里的长 base64 字符串值
        result = result.replace(
            /("(?:image\/[a-zA-Z0-9+\-.]+|data)":\s*")[A-Za-z0-9+/=\r\n]{64,}(")/g,
            (_match, prefix, suffix) => {
                count++;
                return `${prefix}${placeholder}${suffix}`;
            }
        );

        // ── 3. 裸 base64 行 ───────────────────────────────────────────────────
        // 针对 SVG 内嵌、自定义序列化等把整行写成 base64 的情况
        // diff 行前缀为 +、-、空格或 \ 后跟一个可选的空格
        result = result.replace(
            /^([ +\-\\][ +\-]?)([A-Za-z0-9+/]{64,}={0,2})$/gm,
            (_match, linePrefix) => {
                count++;
                return `${linePrefix}${placeholder}`;
            }
        );

        return { result, count };
    }
}
