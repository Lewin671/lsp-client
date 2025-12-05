import { 
    ClientCapabilities, 
    ServerCapabilities, 
    DocumentSymbolRequest,
    DocumentSymbolParams,
    DocumentSymbol,
    SymbolInformation,
    DocumentSelector,
    SymbolKind,
    SymbolTag
} from 'vscode-languageserver-protocol';
import { 
    Feature, 
    StaticFeature,
    FeatureState,
    ensure 
} from '../Feature';
import { LanguageClient } from '../LanguageClient';

/**
 * Supported symbol kinds
 */
const SupportedSymbolKinds: SymbolKind[] = [
    SymbolKind.File,
    SymbolKind.Module,
    SymbolKind.Namespace,
    SymbolKind.Package,
    SymbolKind.Class,
    SymbolKind.Method,
    SymbolKind.Property,
    SymbolKind.Field,
    SymbolKind.Constructor,
    SymbolKind.Enum,
    SymbolKind.Interface,
    SymbolKind.Function,
    SymbolKind.Variable,
    SymbolKind.Constant,
    SymbolKind.String,
    SymbolKind.Number,
    SymbolKind.Boolean,
    SymbolKind.Array,
    SymbolKind.Object,
    SymbolKind.Key,
    SymbolKind.Null,
    SymbolKind.EnumMember,
    SymbolKind.Struct,
    SymbolKind.Event,
    SymbolKind.Operator,
    SymbolKind.TypeParameter
];

/**
 * Document Symbol feature - implements LSP document symbols capability
 */
export class DocumentSymbolFeature implements Feature, StaticFeature {
    private _serverSupportsDocumentSymbol: boolean = false;

    constructor(private client: LanguageClient) {}

    fillClientCapabilities(capabilities: ClientCapabilities): void {
        const documentSymbolCapability = ensure(ensure(capabilities, 'textDocument')!, 'documentSymbol')!;
        documentSymbolCapability.dynamicRegistration = true;
        documentSymbolCapability.symbolKind = {
            valueSet: SupportedSymbolKinds
        };
        documentSymbolCapability.hierarchicalDocumentSymbolSupport = true;
        documentSymbolCapability.tagSupport = {
            valueSet: [SymbolTag.Deprecated]
        };
        documentSymbolCapability.labelSupport = true;
    }

    initialize(capabilities: ServerCapabilities, documentSelector?: DocumentSelector): void {
        if (capabilities.documentSymbolProvider) {
            this._serverSupportsDocumentSymbol = true;
            console.log('[DocumentSymbolFeature] Server supports document symbols');
        }
    }

    getState(): FeatureState {
        return { kind: 'static' };
    }

    clear(): void {
        this._serverSupportsDocumentSymbol = false;
    }

    /**
     * Check if document symbols is supported
     */
    get isSupported(): boolean {
        return this._serverSupportsDocumentSymbol;
    }

    /**
     * Get document symbols
     */
    async getDocumentSymbols(params: DocumentSymbolParams): Promise<DocumentSymbol[] | SymbolInformation[] | null> {
        const connection = this.client.getConnection();
        if (!connection || !this._serverSupportsDocumentSymbol) {
            return null;
        }
        return connection.sendRequest(DocumentSymbolRequest.type, params);
    }
}
