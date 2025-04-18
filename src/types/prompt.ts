export interface Prompt {
    id: string;
    name: string;
    content: string;
    polishContent: string;
    preferredLanguages?: string[];
    preferredLibraries?: string[];
    source: 'default' | 'local' | 'remote';
} 