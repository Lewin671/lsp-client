import { MessageReader, MessageWriter } from 'vscode-jsonrpc';

export interface ITransport {
    connect(): Promise<{ reader: MessageReader; writer: MessageWriter }>;
    dispose(): void;
}
