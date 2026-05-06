// Mock for vscode API
export const window = {
    showInformationMessage: () => Promise.resolve(),
    showErrorMessage: () => Promise.resolve(),
    showWarningMessage: () => Promise.resolve(),
    createOutputChannel: () => ({
        append: () => {},
        appendLine: () => {},
        clear: () => {},
        show: () => {},
        hide: () => {},
        dispose: () => {}
    })
};

export const workspace = {
    getConfiguration: () => ({
        get: (key: string, defaultValue?: any) => defaultValue,
        update: () => Promise.resolve(),
        has: () => true,
    }),
    onDidChangeConfiguration: () => ({ dispose: () => {} }),
};

export const commands = {
    registerCommand: () => ({ dispose: () => {} }),
    executeCommand: () => Promise.resolve(),
};

export const Uri = {
    file: (f: string) => ({ fsPath: f }),
    parse: (u: string) => ({ fsPath: u })
};

export const EventEmitter = class {
    private listeners: any[] = [];
    event = (listener: any) => {
        this.listeners.push(listener);
        return { dispose: () => {} };
    };
    fire = (data?: any) => {
        this.listeners.forEach(l => l(data));
    };
};

export const ExtensionContext = {
    globalStorageUri: { fsPath: '/mock/storage/path' },
    extensionPath: '/mock/extension/path',
    subscriptions: [],
};

// Export as default export as well in case of default imports
export default {
    window,
    workspace,
    commands,
    Uri,
    EventEmitter,
    ExtensionContext
};
