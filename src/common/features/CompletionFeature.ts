import { 
    ClientCapabilities, 
    ServerCapabilities, 
    CompletionRequest, 
    CompletionParams, 
    CompletionList, 
    CompletionItem 
} from 'vscode-languageserver-protocol';
import { Feature } from '../Feature';
import { LanguageClient } from '../LanguageClient';

export class CompletionFeature implements Feature {
    constructor(private client: LanguageClient) {}

    fillClientCapabilities(capabilities: ClientCapabilities): void {
        capabilities.textDocument = capabilities.textDocument || {};
        capabilities.textDocument.completion = {
            dynamicRegistration: false, // Not supported yet
            completionItem: {
                snippetSupport: true,
                commitCharactersSupport: true,
                documentationFormat: ['markdown', 'plaintext'],
                deprecatedSupport: true,
                preselectSupport: true
            },
            contextSupport: true
        };
    }

    initialize(capabilities: ServerCapabilities): void {
        // Check if server supports completion
        if (capabilities.completionProvider) {
            // In a real VS Code extension, we would register a CompletionItemProvider here.
            // For this universal client, we just mark it as available.
            console.log('[CompletionFeature] Server supports completion');
        }
    }

    clear(): void {
        // Cleanup if needed
    }

    async provideCompletion(params: CompletionParams): Promise<CompletionItem[] | CompletionList | null> {
        const connection = this.client.getConnection();
        if (!connection) {
            return null;
        }
        return connection.sendRequest(CompletionRequest.type, params);
    }
}
