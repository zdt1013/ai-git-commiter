import { PromptTemplate } from '../types/types';
import { AIModel } from '../types/model';

export interface IAIService {
    generateCommitMessage(diff: string, language: string, promptTemplate: PromptTemplate, projectInfo?: string): AsyncGenerator<string>;
    polishCommitMessage(message: string, language: string, promptTemplate: PromptTemplate, projectInfo?: string): AsyncGenerator<string>;
    getAvailableModels?(): Promise<AIModel[]>;
    resetInstance(): void;
} 