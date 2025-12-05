import { ClientCapabilities, ServerCapabilities, InitializeParams } from 'vscode-languageserver-protocol';
import { LanguageClient } from './LanguageClient';

export interface Feature {
    /**
     * Called to fill the initialize params.
     */
    fillInitializeParams?: (params: InitializeParams) => void;

    /**
     * Called to fill in the client capabilities this feature implements.
     */
    fillClientCapabilities(capabilities: ClientCapabilities): void;

    /**
     * Initialize the feature. This method is called when the client has successfully 
     * received the initialize request from the server.
     */
    initialize(capabilities: ServerCapabilities): void;

    /**
     * Called when the client is stopped to clear this feature.
     */
    clear(): void;
}
