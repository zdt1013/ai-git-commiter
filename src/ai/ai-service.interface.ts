import { AIResponse } from '../types/types';
import { PromptTemplate } from '../types/types';
import { AIModel } from '../types/model';

export interface IAIService {
    generateCommitMessage(diff: string, language: string, promptTemplate: PromptTemplate): Promise<AIResponse>;
    polishCommitMessage(message: string, language: string, promptTemplate: PromptTemplate): Promise<AIResponse>;
    getAvailableModels?(): Promise<AIModel[]>;
} 