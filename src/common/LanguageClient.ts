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
    MessageType,
    ClientCapabilities
} from 'vscode-languageserver-protocol';
import { IHost } from '../interfaces/IHost';
import { ITransport } from '../transports/ITransport';

export interface Middleware {
    didOpen?: (data: any, next: (data: any) => void) => void;
    // Add more middleware hooks as needed
}

export class LanguageClient {
    private connection: MessageConnection | undefined;

    constructor(
        private host: IHost,
        private transport: ITransport,
        private clientCapabilities: ClientCapabilities = {},
        private middleware: Middleware = {}
    ) {}

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
    }

    private async initialize(): Promise<InitializeResult> {
        if (!this.connection) {
            throw new Error('Connection not initialized');
        }

        const params: InitializeParams = {
            processId: process.pid,
            rootUri: this.host.workspace.rootUri,
            capabilities: this.clientCapabilities,
            workspaceFolders: null // TODO: Support workspace folders
        };

        try {
            const result = await this.connection.sendRequest(InitializeRequest.type, params);
            await this.connection.sendNotification(InitializedNotification.type, {});
            this.host.window.logMessage(MessageType.Info, 'LSP Client initialized');
            return result;
        } catch (e) {
            this.host.window.logMessage(MessageType.Error, `Initialization failed: ${e}`);
            throw e;
        }
    }

    async stop(): Promise<void> {
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
}
