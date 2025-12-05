import { 
    ClientCapabilities, 
    ServerCapabilities, 
    ReferencesRequest,
    ReferenceParams,
    Location,
    DocumentSelector
} from 'vscode-languageserver-protocol';
import { 
    Feature, 
    StaticFeature,
    FeatureState,
    ensure 
} from '../Feature';
import { LanguageClient } from '../LanguageClient';

/**
 * References feature - implements LSP find references capability
 */
export class ReferencesFeature implements Feature, StaticFeature {
    private _serverSupportsReferences: boolean = false;

    constructor(private client: LanguageClient) {}

    fillClientCapabilities(capabilities: ClientCapabilities): void {
        const referencesSupport = ensure(ensure(capabilities, 'textDocument')!, 'references')!;
        referencesSupport.dynamicRegistration = true;
    }

    initialize(capabilities: ServerCapabilities, documentSelector?: DocumentSelector): void {
        if (capabilities.referencesProvider) {
            this._serverSupportsReferences = true;
            console.log('[ReferencesFeature] Server supports references');
        }
    }

    getState(): FeatureState {
        return { kind: 'static' };
    }

    clear(): void {
        this._serverSupportsReferences = false;
    }

    /**
     * Check if references is supported
     */
    get isSupported(): boolean {
        return this._serverSupportsReferences;
    }

    /**
     * Find references
     */
    async findReferences(params: ReferenceParams): Promise<Location[] | null> {
        const connection = this.client.getConnection();
        if (!connection || !this._serverSupportsReferences) {
            return null;
        }
        return connection.sendRequest(ReferencesRequest.type, params);
    }
}
