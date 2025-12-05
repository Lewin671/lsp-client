import * as path from 'path';
import { LanguageClient } from '../common/LanguageClient';
import { IHost, IWindow, IWorkspace, IConfiguration } from '../interfaces/IHost';
import { StdioTransport } from '../transports/StdioTransport';
import { MessageType } from 'vscode-languageserver-protocol';

class ConsoleWindow implements IWindow {
    showMessage(type: MessageType, message: string): void {
        console.log(`[Window] ${message}`);
    }
    logMessage(type: MessageType, message: string): void {
        console.log(`[Log] ${message}`);
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

    try {
        await client.start();
        console.log('Client started successfully');
        
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
