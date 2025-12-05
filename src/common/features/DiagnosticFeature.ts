import { 
    ClientCapabilities, 
    ServerCapabilities, 
    PublishDiagnosticsNotification,
    PublishDiagnosticsParams,
    DocumentSelector,
    DiagnosticTag
} from 'vscode-languageserver-protocol';
import { 
    Feature, 
    StaticFeature,
    FeatureState,
    ensure 
} from '../Feature';
import { LanguageClient } from '../LanguageClient';

/**
 * Diagnostic feature - handles publish diagnostics from server
 */
export class DiagnosticFeature implements Feature, StaticFeature {
    private _disposable: { dispose(): void } | undefined;

    constructor(private client: LanguageClient) {}

    fillClientCapabilities(capabilities: ClientCapabilities): void {
        const diagnostics = ensure(ensure(capabilities, 'textDocument')!, 'publishDiagnostics')!;
        diagnostics.relatedInformation = true;
        diagnostics.tagSupport = {
            valueSet: [DiagnosticTag.Unnecessary, DiagnosticTag.Deprecated]
        };
        diagnostics.versionSupport = true;
        diagnostics.codeDescriptionSupport = true;
        diagnostics.dataSupport = true;
    }

    initialize(capabilities: ServerCapabilities, documentSelector?: DocumentSelector): void {
        // Diagnostics are handled in the LanguageClient's built-in listeners
        // We just need to ensure the capability is set up properly
        console.log('[DiagnosticFeature] Diagnostics support initialized');
    }

    getState(): FeatureState {
        return { kind: 'static' };
    }

    clear(): void {
        if (this._disposable) {
            this._disposable.dispose();
            this._disposable = undefined;
        }
    }
}
