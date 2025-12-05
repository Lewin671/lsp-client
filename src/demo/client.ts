import * as path from 'path';
import { LanguageClient } from '../common/LanguageClient';
import { CompletionFeature } from '../common/features/CompletionFeature';
import { DiagnosticFeature } from '../common/features/DiagnosticFeature';
import { IHost, IWindow, IWorkspace, IConfiguration } from '../interfaces/IHost';
import { StdioTransport } from '../transports/StdioTransport';
import { MessageType, MessageActionItem, Diagnostic } from 'vscode-languageserver-protocol';

class ConsoleWindow implements IWindow {
    showMessage(type: MessageType, message: string): void {
        console.log(`[Window] ${message}`);
    }
    async showMessageRequest(type: MessageType, message: string, actions?: MessageActionItem[]): Promise<MessageActionItem | undefined> {
        console.log(`[Window Request] ${message}`);
        if (actions) {
            console.log(`[Window Request Actions] ${JSON.stringify(actions)}`);
        }
        return undefined;
    }
    logMessage(type: MessageType, message: string): void {
        console.log(`[Log] ${message}`);
    }
    publishDiagnostics(uri: string, diagnostics: Diagnostic[]): void {
        console.log(`[Diagnostics] ${uri}: ${JSON.stringify(diagnostics)}`);
    }
}

class SimpleWorkspace implements IWorkspace {
    rootUri = null;
}

class SimpleConfiguration implements IConfiguration {
    get(section: string) {
        return {};
    }
}

class ConsoleHost implements IHost {
    window = new ConsoleWindow();
    workspace = new SimpleWorkspace();
    configuration = new SimpleConfiguration();

    dispose() {}
}

async function main() {
    const serverPath = path.join(__dirname, 'server.js');
    
    console.log(`Starting server at ${serverPath}`);

    const transport = new StdioTransport('node', [serverPath, '--stdio']);
    const host = new ConsoleHost();
    const client = new LanguageClient(host, transport);

    // Register features
    const completionFeature = new CompletionFeature(client);
    client.registerFeature(completionFeature);
    
    const diagnosticFeature = new DiagnosticFeature(client);
    client.registerFeature(diagnosticFeature);

    try {
        await client.start();
        console.log('Client started successfully');
        
        // Simulate opening a document
        client.didOpen({
            textDocument: {
                uri: 'file:///test.txt',
                languageId: 'plaintext',
                version: 1,
                text: 'Hello World'
            }
        });

        // Request completion
        console.log('Requesting completion...');
        const items = await completionFeature.provideCompletion({
            textDocument: { uri: 'file:///test.txt' },
            position: { line: 0, character: 5 }
        });
        console.log('Completion items:', JSON.stringify(items, null, 2));

        // Keep alive for a bit to receive messages
        setTimeout(async () => {
            await client.stop();
            console.log('Client stopped');
        }, 3000);

    } catch (e) {
        console.error('Client failed to start', e);
        process.exit(1);
    }
}

main();
