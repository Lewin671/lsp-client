import { MessageType } from 'vscode-languageserver-protocol';

export interface IWindow {
    showMessage(type: MessageType, message: string): void;
    logMessage(type: MessageType, message: string): void;
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
