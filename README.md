# Universal LSP Client SDK

A TypeScript SDK for building Language Server Protocol (LSP) clients that run in any environment (Node.js, Browser, Electron, VS Code, etc.).

## Features

- **Universal**: Decoupled from VS Code API. Runs anywhere.
- **Type-Safe**: Built with TypeScript.
- **Pluggable Transports**: Support for Stdio, IPC, WebSocket, and custom transports.
- **Flexible Architecture**: Middleware, Plugins, and Host abstractions.

## Installation

```bash
npm install @lewin671/lsp-client
```

## Usage

### Basic Example

```typescript
import { LanguageClient, StdioTransport } from '@lewin671/lsp-client';

// 1. Create a transport (e.g., Stdio for a local server)
const transport = new StdioTransport('path/to/server-executable', ['--stdio']);

// 2. Initialize the client
const client = new LanguageClient({
    name: 'My Language Client',
    transport: transport,
    // ... other options
});

// 3. Start the client
await client.start();

// 4. Send a request
const result = await client.sendRequest('textDocument/hover', { ... });
```

## Architecture

See [Agents.md](./Agents.md) for architectural details.

## Development

### Build

```bash
npm install
npm run build
```

### Run Demo

```bash
npm run demo
```

## License

MIT

