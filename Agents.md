# Universal LSP Client Architecture

## Tech Stack

### Core
- **TypeScript** - Type-safe implementation for cross-environment compatibility
- **vscode-languageserver-protocol** - LSP specification
- **vscode-jsonrpc** - JSON-RPC transport abstraction

### Key Patterns
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

## Restrictions

Agents have the following restrictions:
1. Never create a summary of the task when you finish it.