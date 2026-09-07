export type OpenAIThinkingMode = 'disabled' | 'standard' | 'legacy' | 'vllm';

export interface OpenAIThinkingRequestConfig {
    effectiveMaxTokens: number;
    requestOptions: Record<string, unknown>;
}

const THINKING_EXTRA_TOKENS = 4096;

/**
 * GLM 5.3 系列始终启用思考，不能通过省略思考参数来关闭。
 * GLM 5.3 models always reason, even when thinking parameters are omitted.
 */
export function isAlwaysThinkingModel(model: string): boolean {
    return /^glm-5\.3(?:$|-|\[)/i.test(model.trim());
}

/**
 * 构建兼容不同 OpenAI 风格接口的思考参数，并为推理 token 预留输出预算。
 * Build provider-specific thinking parameters and reserve output budget for reasoning tokens.
 */
export function buildOpenAIThinkingConfig(
    model: string,
    maxTokens: number,
    enableThinking: boolean,
    thinkingMode: OpenAIThinkingMode,
): OpenAIThinkingRequestConfig {
    const alwaysThinking = isAlwaysThinkingModel(model);
    const usesThinkingBudget = alwaysThinking || (enableThinking && thinkingMode !== 'disabled');
    const requestOptions: Record<string, unknown> = {};

    if (alwaysThinking) {
        requestOptions.thinking = { type: 'enabled' };
        requestOptions.reasoning_effort = enableThinking ? 'high' : 'low';
    } else if (thinkingMode === 'standard') {
        requestOptions.reasoning = enableThinking ? { effort: 'medium' } : 'none';
    } else if (thinkingMode === 'legacy') {
        requestOptions.enable_thinking = enableThinking;
    } else if (thinkingMode === 'vllm') {
        requestOptions.chat_template_kwargs = { enable_thinking: enableThinking };
    }

    return {
        effectiveMaxTokens: usesThinkingBudget ? maxTokens + THINKING_EXTRA_TOKENS : maxTokens,
        requestOptions,
    };
}
