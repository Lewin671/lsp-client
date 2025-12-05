import { 
    ClientCapabilities, 
    ServerCapabilities, 
    RenameRequest,
    RenameParams,
    PrepareRenameRequest,
    PrepareRenameParams,
    WorkspaceEdit,
    Range,
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
 * Rename feature - implements LSP rename capability
 */
export class RenameFeature implements Feature, StaticFeature {
    private _serverSupportsRename: boolean = false;
    private _serverSupportsPrepareRename: boolean = false;

    constructor(private client: LanguageClient) {}

    fillClientCapabilities(capabilities: ClientCapabilities): void {
        const renameCapability = ensure(ensure(capabilities, 'textDocument')!, 'rename')!;
        renameCapability.dynamicRegistration = true;
        renameCapability.prepareSupport = true;
        renameCapability.prepareSupportDefaultBehavior = 1; // Identifier
        renameCapability.honorsChangeAnnotations = true;
    }

    initialize(capabilities: ServerCapabilities, documentSelector?: DocumentSelector): void {
        if (capabilities.renameProvider) {
            this._serverSupportsRename = true;
            if (typeof capabilities.renameProvider === 'object' && capabilities.renameProvider.prepareProvider) {
                this._serverSupportsPrepareRename = true;
            }
            console.log('[RenameFeature] Server supports rename');
        }
    }

    getState(): FeatureState {
        return { kind: 'static' };
    }

    clear(): void {
        this._serverSupportsRename = false;
        this._serverSupportsPrepareRename = false;
    }

    /**
     * Check if rename is supported
     */
    get isSupported(): boolean {
        return this._serverSupportsRename;
    }

    /**
     * Check if prepare rename is supported
     */
    get isPrepareSupported(): boolean {
        return this._serverSupportsPrepareRename;
    }

    /**
     * Prepare rename - check if rename is valid at position
     */
    async prepareRename(params: PrepareRenameParams): Promise<Range | { range: Range; placeholder: string } | { defaultBehavior: boolean } | null> {
        const connection = this.client.getConnection();
        if (!connection || !this._serverSupportsPrepareRename) {
            return null;
        }
        return connection.sendRequest(PrepareRenameRequest.type, params);
    }

    /**
     * Perform rename
     */
    async rename(params: RenameParams): Promise<WorkspaceEdit | null> {
        const connection = this.client.getConnection();
        if (!connection || !this._serverSupportsRename) {
            return null;
        }
        return connection.sendRequest(RenameRequest.type, params);
    }
}
