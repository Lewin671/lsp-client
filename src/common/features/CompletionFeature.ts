import { 
    ClientCapabilities, 
    ServerCapabilities, 
    CompletionRequest, 
    CompletionParams, 
    CompletionList, 
    CompletionItem,
    CompletionOptions,
    CompletionRegistrationOptions,
    DocumentSelector,
    CompletionItemKind,
    CompletionItemTag,
    InsertTextMode,
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
 * Supported completion item kinds
 */
const SupportedCompletionItemKinds: CompletionItemKind[] = [
    CompletionItemKind.Text,
    CompletionItemKind.Method,
    CompletionItemKind.Function,
    CompletionItemKind.Constructor,
    CompletionItemKind.Field,
    CompletionItemKind.Variable,
    CompletionItemKind.Class,
    CompletionItemKind.Interface,
    CompletionItemKind.Module,
    CompletionItemKind.Property,
    CompletionItemKind.Unit,
    CompletionItemKind.Value,
    CompletionItemKind.Enum,
    CompletionItemKind.Keyword,
    CompletionItemKind.Snippet,
    CompletionItemKind.Color,
    CompletionItemKind.File,
    CompletionItemKind.Reference,
    CompletionItemKind.Folder,
    CompletionItemKind.EnumMember,
    CompletionItemKind.Constant,
    CompletionItemKind.Struct,
    CompletionItemKind.Event,
    CompletionItemKind.Operator,
    CompletionItemKind.TypeParameter
];

/**
 * Completion feature - implements LSP completion capability
 */
export class CompletionFeature implements Feature, StaticFeature {
    private _serverSupportsCompletion: boolean = false;

    constructor(private client: LanguageClient) {}

    fillClientCapabilities(capabilities: ClientCapabilities): void {
        const completion = ensure(ensure(capabilities, 'textDocument')!, 'completion')!;
        completion.dynamicRegistration = true;
        completion.contextSupport = true;
        completion.completionItem = {
            snippetSupport: true,
            commitCharactersSupport: true,
            documentationFormat: [MarkupKind.Markdown, MarkupKind.PlainText],
            deprecatedSupport: true,
            preselectSupport: true,
            tagSupport: { valueSet: [CompletionItemTag.Deprecated] },
            insertReplaceSupport: true,
            resolveSupport: {
                properties: ['documentation', 'detail', 'additionalTextEdits']
            },
            insertTextModeSupport: { valueSet: [InsertTextMode.asIs, InsertTextMode.adjustIndentation] },
            labelDetailsSupport: true
        };
        completion.insertTextMode = InsertTextMode.adjustIndentation;
        completion.completionItemKind = { valueSet: SupportedCompletionItemKinds };
        completion.completionList = {
            itemDefaults: [
                'commitCharacters', 'editRange', 'insertTextFormat', 'insertTextMode', 'data'
            ]
        };
    }

    initialize(capabilities: ServerCapabilities, documentSelector?: DocumentSelector): void {
        // Check if server supports completion
        if (capabilities.completionProvider) {
            this._serverSupportsCompletion = true;
            console.log('[CompletionFeature] Server supports completion');
        }
    }

    getState(): FeatureState {
        return { kind: 'static' };
    }

    clear(): void {
        this._serverSupportsCompletion = false;
    }

    /**
     * Check if completion is supported
     */
    get isSupported(): boolean {
        return this._serverSupportsCompletion;
    }

    /**
     * Provide completion items
     */
    async provideCompletion(params: CompletionParams): Promise<CompletionItem[] | CompletionList | null> {
        const connection = this.client.getConnection();
        if (!connection || !this._serverSupportsCompletion) {
            return null;
        }
        return connection.sendRequest(CompletionRequest.type, params);
    }
}
