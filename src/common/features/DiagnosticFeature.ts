import { 
    ClientCapabilities, 
    ServerCapabilities, 
    PublishDiagnosticsNotification,
    PublishDiagnosticsParams
} from 'vscode-languageserver-protocol';
import { Feature } from '../Feature';
import { LanguageClient } from '../LanguageClient';

export class DiagnosticFeature implements Feature {
    constructor(private client: LanguageClient) {}

    fillClientCapabilities(capabilities: ClientCapabilities): void {
        capabilities.textDocument = capabilities.textDocument || {};
        capabilities.textDocument.publishDiagnostics = {
            relatedInformation: true,
            tagSupport: {
                valueSet: [1, 2] // Unnecessary and Deprecated
            },
            versionSupport: true,
            codeDescriptionSupport: true,
            dataSupport: true
        };
    }

    initialize(capabilities: ServerCapabilities): void {
        const connection = this.client.getConnection();
        if (connection) {
            connection.onNotification(PublishDiagnosticsNotification.type, (params: PublishDiagnosticsParams) => {
                const host = this.client.getHost();
                if (host.window.publishDiagnostics) {
                    host.window.publishDiagnostics(params.uri, params.diagnostics);
                }
            });
        }
    }

    clear(): void {
        // Cleanup if needed
    }
}
