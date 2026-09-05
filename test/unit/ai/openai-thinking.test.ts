import { describe, expect, it } from 'vitest';
import { buildOpenAIThinkingConfig, isAlwaysThinkingModel } from '../../../src/ai/openai-thinking';

describe('OpenAI 思考参数', () => {
    it.each([
        'glm-5.3',
        'glm-5.3-flash',
        'GLM-5.3-FLASH[1m]',
    ])('识别强制思考模型 %s', (model) => {
        expect(isAlwaysThinkingModel(model)).toBe(true);
    });

    it('普通模型禁用思考时保留用户设置的 token 上限', () => {
        expect(buildOpenAIThinkingConfig('gpt-4.1-mini', 500, false, 'disabled')).toEqual({
            effectiveMaxTokens: 500,
            requestOptions: {},
        });
    });

    it('GLM 5.3 禁用思考设置时仍预留推理预算并使用低强度', () => {
        expect(buildOpenAIThinkingConfig('glm-5.3-flash', 500, false, 'disabled')).toEqual({
            effectiveMaxTokens: 4596,
            requestOptions: {
                thinking: { type: 'enabled' },
                reasoning_effort: 'low',
            },
        });
    });

    it('GLM 5.3 显式启用思考时使用高强度', () => {
        expect(buildOpenAIThinkingConfig('glm-5.3', 1000, true, 'standard')).toEqual({
            effectiveMaxTokens: 5096,
            requestOptions: {
                thinking: { type: 'enabled' },
                reasoning_effort: 'high',
            },
        });
    });
});
