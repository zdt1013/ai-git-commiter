import { AIResponse } from '../types/types';
import { PromptTemplate } from '../types/types';

export interface IAIService {
    generateCommitMessage(diff: string, language: string, promptTemplate: PromptTemplate): Promise<AIResponse>;
    polishCommitMessage(message: string, language: string, promptTemplate: PromptTemplate): Promise<AIResponse>;
} 