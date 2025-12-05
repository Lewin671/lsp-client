import { 
    ClientCapabilities, 
    ServerCapabilities, 
    HoverRequest, 
    HoverParams,
    Hover,
    HoverOptions,
    HoverRegistrationOptions,
    DocumentSelector,
    MarkupKind
} from 'vscode-languageserver-protocol';
import { 
    Feature, 
    StaticFeature,
    FeatureState,
    ensure 
} from '../Feature';
import { LanguageClient } from '../LanguageClient';

/**
 * Hover feature - implements LSP hover capability
 */
export class HoverFeature implements Feature, StaticFeature {
    private _serverSupportsHover: boolean = false;

    constructor(private client: LanguageClient) {}

    fillClientCapabilities(capabilities: ClientCapabilities): void {
        const hoverCapability = ensure(ensure(capabilities, 'textDocument')!, 'hover')!;
        hoverCapability.dynamicRegistration = true;
        hoverCapability.contentFormat = [MarkupKind.Markdown, MarkupKind.PlainText];
    }

    initialize(capabilities: ServerCapabilities, documentSelector?: DocumentSelector): void {
        if (capabilities.hoverProvider) {
            this._serverSupportsHover = true;
            console.log('[HoverFeature] Server supports hover');
        }
    }

    getState(): FeatureState {
        return { kind: 'static' };
    }

    clear(): void {
        this._serverSupportsHover = false;
    }

    /**
     * Check if hover is supported
     */
    get isSupported(): boolean {
        return this._serverSupportsHover;
    }

    /**
     * Provide hover information
     */
    async provideHover(params: HoverParams): Promise<Hover | null> {
        const connection = this.client.getConnection();
        if (!connection || !this._serverSupportsHover) {
            return null;
        }
        return connection.sendRequest(HoverRequest.type, params);
    }
}
