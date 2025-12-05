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
    ClientCapabilities,
    ServerCapabilities,
    DocumentSelector,
    RegistrationRequest,
    RegistrationParams,
    UnregistrationRequest,
    UnregistrationParams,
    ShutdownRequest,
    ExitNotification,
    ProtocolNotificationType,
    ProtocolNotificationType0,
    ProtocolRequestType,
    ProtocolRequestType0,
    NotificationType,
    NotificationType0,
    RequestType,
    RequestType0,
    CancellationToken,
    NotificationHandler,
    NotificationHandler0,
    RequestHandler,
    RequestHandler0,
    GenericNotificationHandler,
    GenericRequestHandler,
    MessageSignature,
    ErrorCodes,
    TextDocumentSyncKind,
    TextDocumentSyncOptions
} from 'vscode-languageserver-protocol';
import { IHost } from '../interfaces/IHost';
import { ITransport } from '../transports/ITransport';
import { 
    Feature, 
    StaticFeature, 
    DynamicFeature, 
    RegistrationData 
} from './Feature';
import * as Is from './utils/is';

/**
 * Client state enum
 */
export enum ClientState {
    Initial = 'initial',
    Starting = 'starting',
    StartFailed = 'startFailed',
    Running = 'running',
    Stopping = 'stopping',
    Stopped = 'stopped'
}

/**
 * Public state for external consumers
 */
export enum State {
    Stopped = 1,
    Starting = 3,
    StartFailed = 4,
    Running = 2
}

/**
 * State change event
 */
export interface StateChangeEvent {
    oldState: State;
    newState: State;
}

/**
 * Error action enum
 */
export enum ErrorAction {
    Continue = 1,
    Shutdown = 2
}

/**
 * Close action enum
 */
export enum CloseAction {
    DoNotRestart = 1,
    Restart = 2
}

/**
 * Error handler interface
 */
export interface ErrorHandler {
    error(error: Error, message: any | undefined, count: number | undefined): { action: ErrorAction };
    closed(): { action: CloseAction };
}

/**
 * Default error handler
 */
class DefaultErrorHandler implements ErrorHandler {
    private restarts: number[] = [];
    
    constructor(private maxRestartCount: number = 4) {}
    
    error(_error: Error, _message: any, count: number): { action: ErrorAction } {
        if (count && count <= 3) {
            return { action: ErrorAction.Continue };
        }
        return { action: ErrorAction.Shutdown };
    }
    
    closed(): { action: CloseAction } {
        this.restarts.push(Date.now());
        if (this.restarts.length <= this.maxRestartCount) {
            return { action: CloseAction.Restart };
        } else {
            const diff = this.restarts[this.restarts.length - 1] - this.restarts[0];
            if (diff <= 3 * 60 * 1000) {
                return { action: CloseAction.DoNotRestart };
            } else {
                this.restarts.shift();
                return { action: CloseAction.Restart };
            }
        }
    }
}

/**
 * Middleware interface for intercepting requests/notifications
 */
export interface Middleware {
    didOpen?: (params: DidOpenTextDocumentParams, next: (params: DidOpenTextDocumentParams) => void) => void;
    didChange?: (params: DidChangeTextDocumentParams, next: (params: DidChangeTextDocumentParams) => void) => void;
    didClose?: (params: DidCloseTextDocumentParams, next: (params: DidCloseTextDocumentParams) => void) => void;
    didSave?: (params: DidSaveTextDocumentParams, next: (params: DidSaveTextDocumentParams) => void) => void;
    handleDiagnostics?: (uri: string, diagnostics: any[], next: (uri: string, diagnostics: any[]) => void) => void;
    handleRegisterCapability?: (params: RegistrationParams, next: (params: RegistrationParams) => Promise<void>) => Promise<void>;
    handleUnregisterCapability?: (params: UnregistrationParams, next: (params: UnregistrationParams) => Promise<void>) => Promise<void>;
}

/**
 * Language Client options
 */
export interface LanguageClientOptions {
    documentSelector?: DocumentSelector;
    middleware?: Middleware;
    initializationOptions?: any | (() => any);
    errorHandler?: ErrorHandler;
}

/**
 * Resolved text document sync capabilities
 */
export interface ResolvedTextDocumentSyncCapabilities {
    openClose?: boolean;
    change?: TextDocumentSyncKind;
    save?: { includeText?: boolean } | boolean;
}

/**
 * Event emitter for state changes
 */
type StateChangeListener = (event: StateChangeEvent) => void;

export class LanguageClient {
    private connection: MessageConnection | undefined;
    private _features: (StaticFeature | DynamicFeature<any>)[] = [];
    private _dynamicFeatures: Map<string, DynamicFeature<any>> = new Map();
    private _legacyFeatures: Feature[] = [];
    
    private _state: ClientState = ClientState.Initial;
    private _initializeResult: InitializeResult | undefined;
    private _capabilities: ServerCapabilities & { resolvedTextDocumentSync?: ResolvedTextDocumentSyncCapabilities } | undefined;
    
    private _onStart: Promise<void> | undefined;
    private _onStop: Promise<void> | undefined;
    
    private _stateChangeListeners: StateChangeListener[] = [];
    private _errorHandler: ErrorHandler;
    private _middleware: Middleware;
    private _documentSelector: DocumentSelector | undefined;
    private _ignoredRegistrations: Set<string> = new Set();

    constructor(
        private host: IHost,
        private transport: ITransport,
        private clientCapabilities: ClientCapabilities = {},
        private options: LanguageClientOptions = {}
    ) {
        this._errorHandler = options.errorHandler ?? new DefaultErrorHandler();
        this._middleware = options.middleware ?? {};
        this._documentSelector = options.documentSelector;
    }

    /**
     * Get current state
     */
    public get state(): State {
        return this.getPublicState();
    }

    private get $state(): ClientState {
        return this._state;
    }

    private set $state(value: ClientState) {
        const oldState = this.getPublicState();
        this._state = value;
        const newState = this.getPublicState();
        if (newState !== oldState) {
            this._stateChangeListeners.forEach(listener => {
                listener({ oldState, newState });
            });
        }
    }

    private getPublicState(): State {
        switch (this.$state) {
            case ClientState.Starting:
                return State.Starting;
            case ClientState.Running:
                return State.Running;
            case ClientState.StartFailed:
                return State.StartFailed;
            default:
                return State.Stopped;
        }
    }

    /**
     * Add state change listener
     */
    public onDidChangeState(listener: StateChangeListener): { dispose(): void } {
        this._stateChangeListeners.push(listener);
        return {
            dispose: () => {
                const index = this._stateChangeListeners.indexOf(listener);
                if (index >= 0) {
                    this._stateChangeListeners.splice(index, 1);
                }
            }
        };
    }

    /**
     * Get initialize result
     */
    public get initializeResult(): InitializeResult | undefined {
        return this._initializeResult;
    }

    /**
     * Get server capabilities
     */
    public get capabilities(): ServerCapabilities | undefined {
        return this._capabilities;
    }

    /**
     * Check if client is running
     */
    public isRunning(): boolean {
        return this.$state === ClientState.Running;
    }

    /**
     * Register a legacy feature
     */
    public registerFeature(feature: Feature): void {
        this._legacyFeatures.push(feature);
    }

    /**
     * Register a static or dynamic feature
     */
    public registerFeatures(features: (StaticFeature | DynamicFeature<any>)[]): void {
        for (const feature of features) {
            this.registerStaticOrDynamicFeature(feature);
        }
    }

    /**
     * Register a single static or dynamic feature
     */
    public registerStaticOrDynamicFeature(feature: StaticFeature | DynamicFeature<any>): void {
        this._features.push(feature);
        if (DynamicFeature.is(feature)) {
            const registrationType = feature.registrationType;
            this._dynamicFeatures.set(registrationType.method, feature);
        }
    }

    /**
     * Get a dynamic feature by method
     */
    public getFeature(method: string): DynamicFeature<any> | undefined {
        return this._dynamicFeatures.get(method);
    }

    /**
     * Start the language client
     */
    async start(): Promise<void> {
        if (this.$state === ClientState.Stopping) {
            throw new Error('Client is currently stopping. Can only restart a fully stopped client');
        }
        
        if (this._onStart !== undefined) {
            return this._onStart;
        }

        this._onStart = this.doStart();
        return this._onStart;
    }

    private async doStart(): Promise<void> {
        this.$state = ClientState.Starting;
        
        try {
            const { reader, writer } = await this.transport.connect();
            this.connection = createMessageConnection(reader, writer);

            this.registerBuiltinListeners();
            this.connection.listen();

            await this.initialize();
            this.$state = ClientState.Running;
        } catch (e) {
            this.$state = ClientState.StartFailed;
            this.host.window.logMessage(MessageType.Error, `Client start failed: ${e}`);
            throw e;
        }
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

        // Handle dynamic registration
        this.connection.onRequest(RegistrationRequest.type, params => this.handleRegistrationRequest(params));
        this.connection.onRequest(UnregistrationRequest.type, params => this.handleUnregistrationRequest(params));

        // Handle diagnostics
        this.connection.onNotification(PublishDiagnosticsNotification.type, (params) => {
            const handleDiagnostics = (uri: string, diagnostics: any[]) => {
                if (this.host.window.publishDiagnostics) {
                    this.host.window.publishDiagnostics(uri, diagnostics);
                }
            };
            
            if (this._middleware.handleDiagnostics) {
                this._middleware.handleDiagnostics(params.uri, params.diagnostics, handleDiagnostics);
            } else {
                handleDiagnostics(params.uri, params.diagnostics);
            }
        });
    }

    private async initialize(): Promise<InitializeResult> {
        if (!this.connection) {
            throw new Error('Connection not initialized');
        }

        // Fill client capabilities from legacy features
        for (const feature of this._legacyFeatures) {
            feature.fillClientCapabilities(this.clientCapabilities);
        }

        // Fill client capabilities from new features
        for (const feature of this._features) {
            feature.fillClientCapabilities(this.clientCapabilities);
        }

        const initOption = this.options.initializationOptions;
        const params: InitializeParams = {
            processId: process.pid,
            rootUri: this.host.workspace.rootUri,
            capabilities: this.clientCapabilities,
            workspaceFolders: null,
            initializationOptions: Is.func(initOption) ? initOption() : initOption
        };

        // Fill initialize params from legacy features
        for (const feature of this._legacyFeatures) {
            if (feature.fillInitializeParams) {
                feature.fillInitializeParams(params);
            }
        }

        // Fill initialize params from new features
        for (const feature of this._features) {
            if (Is.func(feature.fillInitializeParams)) {
                feature.fillInitializeParams(params);
            }
        }

        try {
            const result = await this.connection.sendRequest(InitializeRequest.type, params);
            this._initializeResult = result;
            
            // Resolve text document sync capabilities
            let textDocumentSyncOptions: TextDocumentSyncOptions | undefined = undefined;
            if (Is.number(result.capabilities.textDocumentSync)) {
                if (result.capabilities.textDocumentSync === TextDocumentSyncKind.None) {
                    textDocumentSyncOptions = {
                        openClose: false,
                        change: TextDocumentSyncKind.None,
                        save: undefined
                    };
                } else {
                    textDocumentSyncOptions = {
                        openClose: true,
                        change: result.capabilities.textDocumentSync,
                        save: { includeText: false }
                    };
                }
            } else if (result.capabilities.textDocumentSync !== undefined && result.capabilities.textDocumentSync !== null) {
                textDocumentSyncOptions = result.capabilities.textDocumentSync as TextDocumentSyncOptions;
            }

            this._capabilities = Object.assign({}, result.capabilities, { 
                resolvedTextDocumentSync: textDocumentSyncOptions 
            });

            // PreInitialize features
            for (const feature of this._features) {
                if (Is.func(feature.preInitialize)) {
                    feature.preInitialize(result.capabilities, this._documentSelector);
                }
            }
            
            // Initialize legacy features
            for (const feature of this._legacyFeatures) {
                feature.initialize(result.capabilities);
            }

            // Initialize new features
            for (const feature of this._features) {
                feature.initialize(result.capabilities, this._documentSelector);
            }

            await this.connection.sendNotification(InitializedNotification.type, {});
            this.host.window.logMessage(MessageType.Info, 'LSP Client initialized');
            return result;
        } catch (e) {
            this.host.window.logMessage(MessageType.Error, `Initialization failed: ${e}`);
            throw e;
        }
    }

    private async handleRegistrationRequest(params: RegistrationParams): Promise<void> {
        const doRegister = async (params: RegistrationParams): Promise<void> => {
            if (!this.isRunning()) {
                for (const registration of params.registrations) {
                    this._ignoredRegistrations.add(registration.id);
                }
                return;
            }

            for (const registration of params.registrations) {
                const feature = this._dynamicFeatures.get(registration.method);
                if (feature === undefined) {
                    throw new Error(`No feature implementation for ${registration.method} found. Registration failed.`);
                }
                const options = registration.registerOptions ?? {};
                (options as any).documentSelector = (options as any).documentSelector ?? this._documentSelector;
                const data: RegistrationData<any> = {
                    id: registration.id,
                    registerOptions: options
                };
                feature.register(data);
            }
        };

        if (this._middleware.handleRegisterCapability) {
            return this._middleware.handleRegisterCapability(params, doRegister);
        }
        return doRegister(params);
    }

    private async handleUnregistrationRequest(params: UnregistrationParams): Promise<void> {
        const doUnregister = async (params: UnregistrationParams): Promise<void> => {
            for (const unregistration of params.unregisterations) {
                if (this._ignoredRegistrations.has(unregistration.id)) {
                    continue;
                }
                const feature = this._dynamicFeatures.get(unregistration.method);
                if (!feature) {
                    throw new Error(`No feature implementation for ${unregistration.method} found. Unregistration failed.`);
                }
                feature.unregister(unregistration.id);
            }
        };

        if (this._middleware.handleUnregisterCapability) {
            return this._middleware.handleUnregisterCapability(params, doUnregister);
        }
        return doUnregister(params);
    }

    /**
     * Stop the language client
     */
    async stop(timeout: number = 2000): Promise<void> {
        if (this.$state === ClientState.Stopped || this.$state === ClientState.Initial) {
            return;
        }

        if (this.$state === ClientState.Stopping) {
            if (this._onStop !== undefined) {
                return this._onStop;
            }
            throw new Error('Client is stopping but no stop promise available.');
        }

        if (this.$state !== ClientState.Running) {
            throw new Error(`Client is not running and can't be stopped. Current state: ${this.$state}`);
        }

        this.$state = ClientState.Stopping;
        this._onStop = this.doStop(timeout);
        return this._onStop;
    }

    private async doStop(timeout: number): Promise<void> {
        // Clear features in reverse order
        for (const feature of [...this._legacyFeatures].reverse()) {
            feature.clear();
        }
        for (const feature of [...this._features].reverse()) {
            feature.clear();
        }

        if (this.connection) {
            try {
                const tp = new Promise<void>(resolve => setTimeout(resolve, timeout));
                const shutdown = (async () => {
                    await this.connection!.sendRequest(ShutdownRequest.type);
                    await this.connection!.sendNotification(ExitNotification.type);
                })();

                await Promise.race([tp, shutdown]);
            } catch (e) {
                this.host.window.logMessage(MessageType.Error, `Error during shutdown: ${e}`);
            } finally {
                this.connection.dispose();
                this.connection = undefined;
            }
        }

        this.transport.dispose();
        this.$state = ClientState.Stopped;
        this._onStart = undefined;
        this._onStop = undefined;
        this._ignoredRegistrations.clear();
    }

    // === Request/Notification API ===

    /**
     * Send a request to the server
     */
    public sendRequest<R, PR, E, RO>(type: ProtocolRequestType0<R, PR, E, RO>, token?: CancellationToken): Promise<R>;
    public sendRequest<P, R, PR, E, RO>(type: ProtocolRequestType<P, R, PR, E, RO>, params: P, token?: CancellationToken): Promise<R>;
    public sendRequest<R, E>(type: RequestType0<R, E>, token?: CancellationToken): Promise<R>;
    public sendRequest<P, R, E>(type: RequestType<P, R, E>, params: P, token?: CancellationToken): Promise<R>;
    public sendRequest<R>(method: string, token?: CancellationToken): Promise<R>;
    public sendRequest<R>(method: string, param: any, token?: CancellationToken): Promise<R>;
    public async sendRequest<R>(type: string | MessageSignature, ...params: any[]): Promise<R> {
        if (!this.isRunning() || !this.connection) {
            throw new ResponseError(ErrorCodes.ConnectionInactive, 'Client is not running');
        }
        return this.connection.sendRequest<R>(type as any, ...params);
    }

    /**
     * Register a request handler
     */
    public onRequest<R, PR, E, RO>(type: ProtocolRequestType0<R, PR, E, RO>, handler: RequestHandler0<R, E>): { dispose(): void };
    public onRequest<P, R, PR, E, RO>(type: ProtocolRequestType<P, R, PR, E, RO>, handler: RequestHandler<P, R, E>): { dispose(): void };
    public onRequest<R, E>(type: RequestType0<R, E>, handler: RequestHandler0<R, E>): { dispose(): void };
    public onRequest<P, R, E>(type: RequestType<P, R, E>, handler: RequestHandler<P, R, E>): { dispose(): void };
    public onRequest<R, E>(method: string, handler: GenericRequestHandler<R, E>): { dispose(): void };
    public onRequest<R, E>(type: string | MessageSignature, handler: GenericRequestHandler<R, E>): { dispose(): void } {
        if (!this.connection) {
            throw new Error('Client not started');
        }
        return this.connection.onRequest(type as any, handler);
    }

    /**
     * Send a notification to the server
     */
    public sendNotification<RO>(type: ProtocolNotificationType0<RO>): Promise<void>;
    public sendNotification<P, RO>(type: ProtocolNotificationType<P, RO>, params?: P): Promise<void>;
    public sendNotification(type: NotificationType0): Promise<void>;
    public sendNotification<P>(type: NotificationType<P>, params?: P): Promise<void>;
    public sendNotification(method: string): Promise<void>;
    public sendNotification(method: string, params: any): Promise<void>;
    public async sendNotification<P>(type: string | MessageSignature, params?: P): Promise<void> {
        if (!this.isRunning() || !this.connection) {
            throw new ResponseError(ErrorCodes.ConnectionInactive, 'Client is not running');
        }
        return this.connection.sendNotification(type as any, params);
    }

    /**
     * Register a notification handler
     */
    public onNotification<RO>(type: ProtocolNotificationType0<RO>, handler: NotificationHandler0): { dispose(): void };
    public onNotification<P, RO>(type: ProtocolNotificationType<P, RO>, handler: NotificationHandler<P>): { dispose(): void };
    public onNotification(type: NotificationType0, handler: NotificationHandler0): { dispose(): void };
    public onNotification<P>(type: NotificationType<P>, handler: NotificationHandler<P>): { dispose(): void };
    public onNotification(method: string, handler: GenericNotificationHandler): { dispose(): void };
    public onNotification(type: string | MessageSignature, handler: GenericNotificationHandler): { dispose(): void } {
        if (!this.connection) {
            throw new Error('Client not started');
        }
        return this.connection.onNotification(type as any, handler);
    }

    // === Text Document Notifications (convenience methods) ===

    public didOpen(params: DidOpenTextDocumentParams): void {
        const send = (p: DidOpenTextDocumentParams) => {
            this.sendNotification(DidOpenTextDocumentNotification.type, p);
        };
        if (this._middleware.didOpen) {
            this._middleware.didOpen(params, send);
        } else {
            send(params);
        }
    }

    public didChange(params: DidChangeTextDocumentParams): void {
        const send = (p: DidChangeTextDocumentParams) => {
            this.sendNotification(DidChangeTextDocumentNotification.type, p);
        };
        if (this._middleware.didChange) {
            this._middleware.didChange(params, send);
        } else {
            send(params);
        }
    }

    public didClose(params: DidCloseTextDocumentParams): void {
        const send = (p: DidCloseTextDocumentParams) => {
            this.sendNotification(DidCloseTextDocumentNotification.type, p);
        };
        if (this._middleware.didClose) {
            this._middleware.didClose(params, send);
        } else {
            send(params);
        }
    }

    public didSave(params: DidSaveTextDocumentParams): void {
        const send = (p: DidSaveTextDocumentParams) => {
            this.sendNotification(DidSaveTextDocumentNotification.type, p);
        };
        if (this._middleware.didSave) {
            this._middleware.didSave(params, send);
        } else {
            send(params);
        }
    }

    // === Accessors ===

    public getConnection(): MessageConnection | undefined {
        return this.connection;
    }

    public getHost(): IHost {
        return this.host;
    }

    public get middleware(): Middleware {
        return this._middleware;
    }

    public get documentSelector(): DocumentSelector | undefined {
        return this._documentSelector;
    }
}
