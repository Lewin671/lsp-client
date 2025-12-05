import { 
    ClientCapabilities, 
    ServerCapabilities, 
    InitializeParams,
    DocumentSelector,
    RegistrationType,
    TextDocumentRegistrationOptions,
    StaticRegistrationOptions,
    WorkDoneProgressOptions
} from 'vscode-languageserver-protocol';
import * as Is from './utils/is';
import * as UUID from './utils/uuid';

/**
 * Helper function to ensure a property exists on an object
 */
export function ensure<T, K extends keyof T>(target: T, key: K): T[K] {
    if (target[key] === undefined) {
        target[key] = {} as any;
    }
    return target[key];
}

/**
 * Registration data for dynamic features
 */
export interface RegistrationData<T> {
    id: string;
    registerOptions: T;
}

/**
 * Feature state kind
 */
export type FeatureStateKind = 'document' | 'workspace' | 'static' | 'window';

/**
 * Feature state describes the current state of a feature
 */
export type FeatureState = {
    kind: 'document';
    id: string;
    registrations: boolean;
    matches: boolean;
} | {
    kind: 'workspace';
    id: string;
    registrations: boolean;
} | {
    kind: 'window';
    id: string;
    registrations: boolean;
} | {
    kind: 'static';
};

/**
 * A static feature. A static feature can't be dynamically activated via the
 * server. It is wired during the initialize sequence.
 */
export interface StaticFeature {
    /**
     * Called to fill the initialize params.
     */
    fillInitializeParams?: (params: InitializeParams) => void;

    /**
     * Called to fill in the client capabilities this feature implements.
     */
    fillClientCapabilities(capabilities: ClientCapabilities): void;

    /**
     * A preflight where the server capabilities are shown to all features
     * before a feature is actually initialized.
     */
    preInitialize?: (capabilities: ServerCapabilities, documentSelector: DocumentSelector | undefined) => void;

    /**
     * Initialize the feature. This method is called on a feature instance
     * when the client has successfully received the initialize request from
     * the server and before the client sends the initialized notification
     * to the server.
     */
    initialize(capabilities: ServerCapabilities, documentSelector: DocumentSelector | undefined): void;

    /**
     * Returns the state the feature is in.
     */
    getState(): FeatureState;

    /**
     * Called when the client is stopped or re-started to clear this feature.
     */
    clear(): void;
}

export namespace StaticFeature {
    export function is(value: any): value is StaticFeature {
        const candidate: StaticFeature = value;
        return candidate !== undefined && candidate !== null &&
            Is.func(candidate.fillClientCapabilities) && 
            Is.func(candidate.initialize) && 
            Is.func(candidate.getState) && 
            Is.func(candidate.clear) &&
            (candidate.fillInitializeParams === undefined || Is.func(candidate.fillInitializeParams));
    }
}

/**
 * A dynamic feature can be activated via the server.
 */
export interface DynamicFeature<RO> {
    /**
     * Called to fill the initialize params.
     */
    fillInitializeParams?: (params: InitializeParams) => void;

    /**
     * Called to fill in the client capabilities this feature implements.
     */
    fillClientCapabilities(capabilities: ClientCapabilities): void;

    /**
     * A preflight where the server capabilities are shown to all features
     * before a feature is actually initialized.
     */
    preInitialize?: (capabilities: ServerCapabilities, documentSelector: DocumentSelector | undefined) => void;

    /**
     * Initialize the feature.
     */
    initialize(capabilities: ServerCapabilities, documentSelector: DocumentSelector | undefined): void;

    /**
     * Returns the state the feature is in.
     */
    getState(): FeatureState;

    /**
     * The signature (e.g. method) for which this features support dynamic activation / registration.
     */
    registrationType: RegistrationType<RO>;

    /**
     * Is called when the server send a register request for the given message.
     */
    register(data: RegistrationData<RO>): void;

    /**
     * Is called when the server wants to unregister a feature.
     */
    unregister(id: string): void;

    /**
     * Called when the client is stopped or re-started to clear this feature.
     */
    clear(): void;
}

export namespace DynamicFeature {
    export function is<T>(value: any): value is DynamicFeature<T> {
        const candidate: DynamicFeature<T> = value;
        return candidate !== undefined && candidate !== null &&
            Is.func(candidate.fillClientCapabilities) && 
            Is.func(candidate.initialize) && 
            Is.func(candidate.getState) && 
            Is.func(candidate.clear) &&
            (candidate.fillInitializeParams === undefined || Is.func(candidate.fillInitializeParams)) && 
            Is.func(candidate.register) &&
            Is.func(candidate.unregister) && 
            candidate.registrationType !== undefined;
    }
}

/**
 * Helper interface for getting registration options
 */
export interface DocumentSelectorOptions {
    documentSelector: DocumentSelector;
}

/**
 * Base class for features that work with text documents
 */
export abstract class TextDocumentFeature<PO, RO extends TextDocumentRegistrationOptions & PO, MW = any> implements DynamicFeature<RO> {
    
    protected readonly _registrations: Map<string, { data: RegistrationData<RO>; disposable?: { dispose(): void } }>;
    protected readonly _registrationType: RegistrationType<RO>;

    constructor(
        protected readonly _client: any,
        registrationType: RegistrationType<RO>
    ) {
        this._registrations = new Map();
        this._registrationType = registrationType;
    }

    public get registrationType(): RegistrationType<RO> {
        return this._registrationType;
    }

    public abstract fillClientCapabilities(capabilities: ClientCapabilities): void;
    public abstract initialize(capabilities: ServerCapabilities, documentSelector: DocumentSelector | undefined): void;

    public getState(): FeatureState {
        const registrations = this._registrations.size > 0;
        return { kind: 'document', id: this.registrationType.method, registrations, matches: registrations };
    }

    public register(data: RegistrationData<RO>): void {
        if (!data.registerOptions.documentSelector) {
            return;
        }
        this._registrations.set(data.id, { data });
    }

    public unregister(id: string): void {
        const registration = this._registrations.get(id);
        if (registration !== undefined) {
            this._registrations.delete(id);
            if (registration.disposable) {
                registration.disposable.dispose();
            }
        }
    }

    public clear(): void {
        this._registrations.forEach((value) => {
            if (value.disposable) {
                value.disposable.dispose();
            }
        });
        this._registrations.clear();
    }

    /**
     * Get registration info from server capabilities
     */
    protected getRegistration(
        documentSelector: DocumentSelector | undefined, 
        capability: undefined | PO | (RO & StaticRegistrationOptions)
    ): [string | undefined, (RO & { documentSelector: DocumentSelector }) | undefined] {
        if (!capability) {
            return [undefined, undefined];
        } else if (TextDocumentRegistrationOptions.is(capability)) {
            const id = StaticRegistrationOptions.hasId(capability) ? capability.id : UUID.generateUuid();
            const selector = capability.documentSelector ?? documentSelector;
            if (selector) {
                return [id, Object.assign({}, capability, { documentSelector: selector }) as RO & { documentSelector: DocumentSelector }];
            }
        } else if (Is.boolean(capability) && capability === true || WorkDoneProgressOptions.is(capability)) {
            if (!documentSelector) {
                return [undefined, undefined];
            }
            const options: RO & { documentSelector: DocumentSelector } = (Is.boolean(capability) && capability === true 
                ? { documentSelector } 
                : Object.assign({}, capability, { documentSelector })) as any;
            return [UUID.generateUuid(), options];
        }
        return [undefined, undefined];
    }

    protected getRegistrationOptions(
        documentSelector: DocumentSelector | undefined, 
        capability: undefined | PO
    ): (RO & { documentSelector: DocumentSelector }) | undefined {
        if (!documentSelector || !capability) {
            return undefined;
        }
        return (Is.boolean(capability) && capability === true 
            ? { documentSelector } 
            : Object.assign({}, capability, { documentSelector })) as RO & { documentSelector: DocumentSelector };
    }
}

/**
 * Base class for workspace features
 */
export abstract class WorkspaceFeature<RO, MW = any> implements DynamicFeature<RO> {
    
    protected readonly _registrations: Map<string, { disposable?: { dispose(): void } }>;
    protected readonly _registrationType: RegistrationType<RO>;

    constructor(
        protected readonly _client: any,
        registrationType: RegistrationType<RO>
    ) {
        this._registrations = new Map();
        this._registrationType = registrationType;
    }

    public get registrationType(): RegistrationType<RO> {
        return this._registrationType;
    }

    public abstract fillClientCapabilities(capabilities: ClientCapabilities): void;
    public abstract initialize(capabilities: ServerCapabilities, documentSelector: DocumentSelector | undefined): void;

    public getState(): FeatureState {
        const registrations = this._registrations.size > 0;
        return { kind: 'workspace', id: this.registrationType.method, registrations };
    }

    public register(data: RegistrationData<RO>): void {
        this._registrations.set(data.id, {});
    }

    public unregister(id: string): void {
        const registration = this._registrations.get(id);
        if (registration !== undefined) {
            this._registrations.delete(id);
            if (registration.disposable) {
                registration.disposable.dispose();
            }
        }
    }

    public clear(): void {
        this._registrations.forEach((value) => {
            if (value.disposable) {
                value.disposable.dispose();
            }
        });
        this._registrations.clear();
    }
}

// Legacy Feature interface for backward compatibility
export interface Feature {
    /**
     * Called to fill the initialize params.
     */
    fillInitializeParams?: (params: InitializeParams) => void;

    /**
     * Called to fill in the client capabilities this feature implements.
     */
    fillClientCapabilities(capabilities: ClientCapabilities): void;

    /**
     * Initialize the feature. This method is called when the client has successfully 
     * received the initialize request from the server.
     */
    initialize(capabilities: ServerCapabilities): void;

    /**
     * Called when the client is stopped to clear this feature.
     */
    clear(): void;
}
