import { 
    ClientCapabilities, 
    ServerCapabilities, 
    DocumentFormattingRequest,
    DocumentFormattingParams,
    DocumentRangeFormattingRequest,
    DocumentRangeFormattingParams,
    TextEdit,
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
 * Formatting feature - implements LSP document formatting capability
 */
export class FormattingFeature implements Feature, StaticFeature {
    private _serverSupportsFormatting: boolean = false;
    private _serverSupportsRangeFormatting: boolean = false;

    constructor(private client: LanguageClient) {}

    fillClientCapabilities(capabilities: ClientCapabilities): void {
        const formattingCapability = ensure(ensure(capabilities, 'textDocument')!, 'formatting')!;
        formattingCapability.dynamicRegistration = true;

        const rangeFormattingCapability = ensure(ensure(capabilities, 'textDocument')!, 'rangeFormatting')!;
        rangeFormattingCapability.dynamicRegistration = true;
    }

    initialize(capabilities: ServerCapabilities, documentSelector?: DocumentSelector): void {
        if (capabilities.documentFormattingProvider) {
            this._serverSupportsFormatting = true;
            console.log('[FormattingFeature] Server supports document formatting');
        }
        if (capabilities.documentRangeFormattingProvider) {
            this._serverSupportsRangeFormatting = true;
            console.log('[FormattingFeature] Server supports range formatting');
        }
    }

    getState(): FeatureState {
        return { kind: 'static' };
    }

    clear(): void {
        this._serverSupportsFormatting = false;
        this._serverSupportsRangeFormatting = false;
    }

    /**
     * Check if formatting is supported
     */
    get isFormattingSupported(): boolean {
        return this._serverSupportsFormatting;
    }

    /**
     * Check if range formatting is supported
     */
    get isRangeFormattingSupported(): boolean {
        return this._serverSupportsRangeFormatting;
    }

    /**
     * Format entire document
     */
    async formatDocument(params: DocumentFormattingParams): Promise<TextEdit[] | null> {
        const connection = this.client.getConnection();
        if (!connection || !this._serverSupportsFormatting) {
            return null;
        }
        return connection.sendRequest(DocumentFormattingRequest.type, params);
    }

    /**
     * Format document range
     */
    async formatRange(params: DocumentRangeFormattingParams): Promise<TextEdit[] | null> {
        const connection = this.client.getConnection();
        if (!connection || !this._serverSupportsRangeFormatting) {
            return null;
        }
        return connection.sendRequest(DocumentRangeFormattingRequest.type, params);
    }
}
