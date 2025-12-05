import { ITransport } from './ITransport';
import { MessageReader, MessageWriter, StreamMessageReader, StreamMessageWriter } from 'vscode-jsonrpc/node';
import { spawn, ChildProcess } from 'child_process';

export class StdioTransport implements ITransport {
    private process: ChildProcess | undefined;

    constructor(private command: string, private args: string[]) {}

    async connect(): Promise<{ reader: MessageReader; writer: MessageWriter }> {
        this.process = spawn(this.command, this.args);

        if (!this.process.stdout || !this.process.stdin) {
            throw new Error('Failed to spawn process with stdout/stdin');
        }

        const reader = new StreamMessageReader(this.process.stdout);
        const writer = new StreamMessageWriter(this.process.stdin);

        return { reader, writer };
    }

    dispose(): void {
        if (this.process) {
            this.process.kill();
        }
    }
}
