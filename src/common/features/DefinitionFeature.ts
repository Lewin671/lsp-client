import { 
    ClientCapabilities, 
    ServerCapabilities, 
    DefinitionRequest,
    DefinitionParams,
    Definition,
    DefinitionLink,
    DefinitionOptions,
    DefinitionRegistrationOptions,
    DocumentSelector,
    Location,
    LocationLink
} from 'vscode-languageserver-protocol';
import { 
    Feature, 
    StaticFeature,
    FeatureState,
    ensure 
} from '../Feature';
import { LanguageClient } from '../LanguageClient';

/**
 * Definition feature - implements LSP go to definition capability
 */
export class DefinitionFeature implements Feature, StaticFeature {
    private _serverSupportsDefinition: boolean = false;

    constructor(private client: LanguageClient) {}

    fillClientCapabilities(capabilities: ClientCapabilities): void {
        const definitionSupport = ensure(ensure(capabilities, 'textDocument')!, 'definition')!;
        definitionSupport.dynamicRegistration = true;
        definitionSupport.linkSupport = true;
    }

    initialize(capabilities: ServerCapabilities, documentSelector?: DocumentSelector): void {
        if (capabilities.definitionProvider) {
            this._serverSupportsDefinition = true;
            console.log('[DefinitionFeature] Server supports definition');
        }
    }

    getState(): FeatureState {
        return { kind: 'static' };
    }

    clear(): void {
        this._serverSupportsDefinition = false;
    }

    /**
     * Check if definition is supported
     */
    get isSupported(): boolean {
        return this._serverSupportsDefinition;
    }

    /**
     * Go to definition
     */
    async provideDefinition(params: DefinitionParams): Promise<Definition | DefinitionLink[] | null> {
        const connection = this.client.getConnection();
        if (!connection || !this._serverSupportsDefinition) {
            return null;
        }
        return connection.sendRequest(DefinitionRequest.type, params);
    }
}
