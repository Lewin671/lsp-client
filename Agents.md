## Restrictions

Agents have the following restrictions:
1. Never create a summary of the task when you finish it.

## Tech Stack - Universal LSP Client Architecture

### Core
- **TypeScript** - Type-safe implementation for cross-environment compatibility
- **vscode-languageserver-protocol** (3.17.6) - LSP specification
- **vscode-jsonrpc** - JSON-RPC transport abstraction

### Build & Testing
to be defined...

### Key Patterns (Inspired by vscode-languageclient)
- **Host Abstraction** - Abstract interfaces for Window, Workspace, and Configuration (decoupling from VS Code API)
- **Plugin Architecture** - Pluggable feature system
- **Middleware Pattern** - Request/response interception
- **Converter Pattern** - Protocol ↔ Host environment conversion
- **Disposable Pattern** - Resource lifecycle management
- **Transport Abstraction** - Stream/Socket/Worker/Custom transport support

### Code Organization
- **common/** - Host-agnostic core (protocol, features, document model)
- **interfaces/** - Host environment abstractions (IWindow, IWorkspace, IConfiguration)
- **transports/** - Platform-specific transports (NodeIPC, WebSocket, Stdio)
- **middleware/** - Feature transformation logic
- **utils/** - Cross-platform utilities (minimatch, semver)