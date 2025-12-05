import {
    createMessageConnection,
    MessageConnection,
    ResponseError,
    InitializeParams,
    InitializeResult,
    InitializeRequest,
    InitializedNotification,
    LogMessageNotification,
    ShowMessageNotification,
    ShowMessageRequest,
    PublishDiagnosticsNotification,
    DidOpenTextDocumentNotification,
    DidOpenTextDocumentParams,
    DidChangeTextDocumentNotification,
    DidChangeTextDocumentParams,
    DidCloseTextDocumentNotification,
    DidCloseTextDocumentParams,
    DidSaveTextDocumentNotification,
    DidSaveTextDocumentParams,
    MessageType,
    ClientCapabilities
} from 'vscode-languageserver-protocol';
import { IHost } from '../interfaces/IHost';
import { ITransport } from '../transports/ITransport';
import { Feature } from './Feature';

export interface Middleware {
    didOpen?: (data: any, next: (data: any) => void) => void;
    // Add more middleware hooks as needed
}

export class LanguageClient {
    private connection: MessageConnection | undefined;
    private features: Feature[] = [];

    constructor(
        private host: IHost,
        private transport: ITransport,
        private clientCapabilities: ClientCapabilities = {},
        private middleware: Middleware = {}
    ) {}

    public registerFeature(feature: Feature): void {
        this.features.push(feature);
    }

    async start(): Promise<void> {
        const { reader, writer } = await this.transport.connect();
        this.connection = createMessageConnection(reader, writer);

        this.registerBuiltinListeners();

        this.connection.listen();

        await this.initialize();
    }

    private registerBuiltinListeners() {
        if (!this.connection) return;

        this.connection.onNotification(LogMessageNotification.type, (params) => {
            this.host.window.logMessage(params.type, params.message);
        });

        this.connection.onNotification(ShowMessageNotification.type, (params) => {
            this.host.window.showMessage(params.type, params.message);
        });

        this.connection.onRequest(ShowMessageRequest.type, async (params) => {
            if (this.host.window.showMessageRequest) {
                return await this.host.window.showMessageRequest(params.type, params.message, params.actions);
            }
            this.host.window.showMessage(params.type, params.message);
            return null;
        });

        this.connection.onNotification(PublishDiagnosticsNotification.type, (params) => {
            if (this.host.window.publishDiagnostics) {
                this.host.window.publishDiagnostics(params.uri, params.diagnostics);
            }
        });
    }

    private async initialize(): Promise<InitializeResult> {
        if (!this.connection) {
            throw new Error('Connection not initialized');
        }

        for (const feature of this.features) {
            feature.fillClientCapabilities(this.clientCapabilities);
        }

        const params: InitializeParams = {
            processId: process.pid,
            rootUri: this.host.workspace.rootUri,
            capabilities: this.clientCapabilities,
            workspaceFolders: null // TODO: Support workspace folders
        };

        for (const feature of this.features) {
            if (feature.fillInitializeParams) {
                feature.fillInitializeParams(params);
            }
        }

        try {
            const result = await this.connection.sendRequest(InitializeRequest.type, params);
            
            for (const feature of this.features) {
                feature.initialize(result.capabilities);
            }

            await this.connection.sendNotification(InitializedNotification.type, {});
            this.host.window.logMessage(MessageType.Info, 'LSP Client initialized');
            return result;
        } catch (e) {
            this.host.window.logMessage(MessageType.Error, `Initialization failed: ${e}`);
            throw e;
        }
    }

    async stop(): Promise<void> {
        for (const feature of this.features) {
            feature.clear();
        }
        if (this.connection) {
            this.connection.dispose();
            this.connection = undefined;
        }
        this.transport.dispose();
    }

    // Expose connection for custom requests/notifications
    public getConnection(): MessageConnection | undefined {
        return this.connection;
    }

    public sendNotification(type: any, params: any): void {
        if (this.connection) {
            this.connection.sendNotification(type, params);
        }
    }

    public didOpen(params: DidOpenTextDocumentParams): void {
        this.sendNotification(DidOpenTextDocumentNotification.type, params);
    }

    public didChange(params: DidChangeTextDocumentParams): void {
        this.sendNotification(DidChangeTextDocumentNotification.type, params);
    }

    public didClose(params: DidCloseTextDocumentParams): void {
        this.sendNotification(DidCloseTextDocumentNotification.type, params);
    }

    public didSave(params: DidSaveTextDocumentParams): void {
        this.sendNotification(DidSaveTextDocumentNotification.type, params);
    }
}
