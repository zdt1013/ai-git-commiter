export interface Prompt {
    id: string;
    name: string;
    content: string;
    polishContent: string;
    source: 'default' | 'local' | 'remote';
} 