import { MessageType, MessageActionItem, Diagnostic } from 'vscode-languageserver-protocol';

export interface IWindow {
    showMessage(type: MessageType, message: string): void;
    showMessageRequest?(type: MessageType, message: string, actions?: MessageActionItem[]): Promise<MessageActionItem | undefined>;
    logMessage(type: MessageType, message: string): void;
    publishDiagnostics?(uri: string, diagnostics: Diagnostic[]): void;
}

export interface IWorkspace {
    rootUri: string | null;
    // Add more workspace related methods as needed
}

export interface IConfiguration {
    get(section: string): any;
}

export interface IHost {
    window: IWindow;
    workspace: IWorkspace;
    configuration: IConfiguration;
    dispose(): void;
}
