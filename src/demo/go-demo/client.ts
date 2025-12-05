/**
 * Go LSP Demo Client
 * 
 * This demo shows how to use the lsp-client library to interact with 
 * Go Language Server (gopls) and test various LSP features:
 * - Hover
 * - Completion
 * - Go to Definition
 * - Find References
 * - Document Symbols
 * - Rename
 * - Diagnostics
 */

import * as path from 'path';
import * as fs from 'fs';
import { LanguageClient } from '../../common/LanguageClient';
import { CompletionFeature } from '../../common/features/CompletionFeature';
import { HoverFeature } from '../../common/features/HoverFeature';
import { DefinitionFeature } from '../../common/features/DefinitionFeature';
import { ReferencesFeature } from '../../common/features/ReferencesFeature';
import { DocumentSymbolFeature } from '../../common/features/DocumentSymbolFeature';
import { RenameFeature } from '../../common/features/RenameFeature';
import { DiagnosticFeature } from '../../common/features/DiagnosticFeature';
import { IHost, IWindow, IWorkspace, IConfiguration } from '../../interfaces/IHost';
import { StdioTransport } from '../../transports/StdioTransport';
import { 
    MessageType, 
    MessageActionItem, 
    Diagnostic,
    Position,
    Location,
    DocumentSymbol,
    SymbolInformation,
    CompletionItem,
    Hover,
    WorkspaceEdit
} from 'vscode-languageserver-protocol';

// Color utilities for console output
const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m',
    red: '\x1b[31m'
};

function log(color: string, prefix: string, message: string) {
    console.log(`${color}[${prefix}]${colors.reset} ${message}`);
}

function logSection(title: string) {
    console.log(`\n${colors.bright}${colors.cyan}${'='.repeat(60)}${colors.reset}`);
    console.log(`${colors.bright}${colors.cyan}  ${title}${colors.reset}`);
    console.log(`${colors.bright}${colors.cyan}${'='.repeat(60)}${colors.reset}\n`);
}

function logSuccess(message: string) {
    log(colors.green, '✓', message);
}

function logInfo(message: string) {
    log(colors.blue, 'i', message);
}

function logWarning(message: string) {
    log(colors.yellow, '!', message);
}

function logError(message: string) {
    log(colors.red, '✗', message);
}

// Sample project paths - resolve from source directory, not lib
// When running from lib, we need to point to src/demo/go-demo/sample-project
const PROJECT_ROOT = path.resolve(__dirname, '..', '..', '..');
const SAMPLE_PROJECT_DIR = path.join(PROJECT_ROOT, 'src', 'demo', 'go-demo', 'sample-project');
const SAMPLE_FILES = {
    math: path.join(SAMPLE_PROJECT_DIR, 'src', 'math.go'),
    person: path.join(SAMPLE_PROJECT_DIR, 'src', 'person.go'),
    calculator: path.join(SAMPLE_PROJECT_DIR, 'src', 'calculator.go'),
    userService: path.join(SAMPLE_PROJECT_DIR, 'src', 'user_service.go'),
    main: path.join(SAMPLE_PROJECT_DIR, 'src', 'main.go'),
    testDiagnostics: path.join(SAMPLE_PROJECT_DIR, 'src', 'test_diagnostics.go')
};

/**
 * Console-based Window implementation
 */
class ConsoleWindow implements IWindow {
    private diagnosticsMap: Map<string, Diagnostic[]> = new Map();

    showMessage(type: MessageType, message: string): void {
        const typeStr = type === MessageType.Error ? 'ERROR' : 
                       type === MessageType.Warning ? 'WARNING' : 'INFO';
        log(colors.magenta, `Window.${typeStr}`, message);
    }

    async showMessageRequest(type: MessageType, message: string, actions?: MessageActionItem[]): Promise<MessageActionItem | undefined> {
        log(colors.magenta, 'Window.Request', message);
        if (actions && actions.length > 0) {
            logInfo(`Available actions: ${actions.map(a => a.title).join(', ')}`);
        }
        return undefined;
    }

    logMessage(type: MessageType, message: string): void {
        log(colors.magenta, 'Window.Log', message);
    }

    publishDiagnostics(uri: string, diagnostics: Diagnostic[]): void {
        this.diagnosticsMap.set(uri, diagnostics);
        if (diagnostics.length > 0) {
            logWarning(`Diagnostics for ${path.basename(uri)}: ${diagnostics.length} issue(s)`);
            diagnostics.forEach(d => {
                const severity = d.severity === 1 ? 'Error' : d.severity === 2 ? 'Warning' : 'Info';
                console.log(`    - [${severity}] Line ${d.range.start.line + 1}: ${d.message}`);
            });
        }
    }

    getDiagnostics(uri: string): Diagnostic[] {
        return this.diagnosticsMap.get(uri) || [];
    }
}


/**
 * Workspace implementation pointing to sample project
 */
class GoWorkspace implements IWorkspace {
    rootUri: string;

    constructor() {
        this.rootUri = `file://${SAMPLE_PROJECT_DIR}`;
    }
}

/**
 * Simple configuration for Go
 */
class GoConfiguration implements IConfiguration {
    get(section: string) {
        // Go specific settings
        if (section === 'go') {
            return {
                lintTool: 'golangci-lint',
                lintFlags: [],
                formatOnSave: true,
                useLanguageServer: true
            };
        }
        return {};
    }
}

/**
 * Host implementation
 */
class GoHost implements IHost {
    window = new ConsoleWindow();
    workspace = new GoWorkspace();
    configuration = new GoConfiguration();

    dispose() {}
}

/**
 * Read file content
 */
function readFileContent(filePath: string): string {
    return fs.readFileSync(filePath, 'utf-8');
}

/**
 * Convert file path to URI
 */
function toUri(filePath: string): string {
    return `file://${filePath}`;
}

/**
 * Find line and character for a search string in file content
 */
function findPosition(content: string, searchStr: string): Position | null {
    const index = content.indexOf(searchStr);
    if (index === -1) return null;

    const lines = content.substring(0, index).split('\n');
    return {
        line: lines.length - 1,
        character: lines[lines.length - 1].length
    };
}

/**
 * Main demo function
 */
async function main() {
    console.log(`${colors.bright}${colors.cyan}`);
    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║              Go LSP Client Demo                           ║');
    console.log('║         Testing LSP features with gopls                   ║');
    console.log('╚════════════════════════════════════════════════════════════╝');
    console.log(colors.reset);

    // Check if sample project exists
    if (!fs.existsSync(SAMPLE_PROJECT_DIR)) {
        logError(`Sample project not found at: ${SAMPLE_PROJECT_DIR}`);
        logInfo('Please make sure the sample-project directory exists.');
        process.exit(1);
    }

    // Find gopls
    const goplsPath = findGopls();
    if (!goplsPath) {
        logError('Could not find Go Language Server (gopls)');
        logInfo('Please install gopls: go install github.com/golang/tools/gopls@latest');
        logInfo('Or: go get -u github.com/golang/tools/gopls');
        process.exit(1);
    }
    logSuccess(`Found gopls at: ${goplsPath}`);

    // Create transport using gopls
    const transport = new StdioTransport(goplsPath, []);

    const window = new ConsoleWindow();
    const host = new GoHost();
    (host as any).window = window; // Store reference for diagnostics access
    
    const client = new LanguageClient(host, transport, {
        textDocument: {
            hover: { dynamicRegistration: true, contentFormat: ['markdown', 'plaintext'] },
            completion: { 
                dynamicRegistration: true,
                completionItem: {
                    snippetSupport: true,
                    documentationFormat: ['markdown', 'plaintext']
                }
            },
            definition: { dynamicRegistration: true, linkSupport: true },
            references: { dynamicRegistration: true },
            documentSymbol: { 
                dynamicRegistration: true, 
                hierarchicalDocumentSymbolSupport: true 
            },
            rename: { dynamicRegistration: true, prepareSupport: true },
            publishDiagnostics: { relatedInformation: true }
        },
        workspace: {
            workspaceFolders: true
        }
    });

    // Register all features
    const hoverFeature = new HoverFeature(client);
    const completionFeature = new CompletionFeature(client);
    const definitionFeature = new DefinitionFeature(client);
    const referencesFeature = new ReferencesFeature(client);
    const documentSymbolFeature = new DocumentSymbolFeature(client);
    const renameFeature = new RenameFeature(client);
    const diagnosticFeature = new DiagnosticFeature(client);

    client.registerFeature(hoverFeature);
    client.registerFeature(completionFeature);
    client.registerFeature(definitionFeature);
    client.registerFeature(referencesFeature);
    client.registerFeature(documentSymbolFeature);
    client.registerFeature(renameFeature);
    client.registerFeature(diagnosticFeature);

    try {
        logSection('Starting Language Client');
        await client.start();
        logSuccess('Language client started successfully!');
        
        // Give server time to initialize
        await sleep(2000);

        // Open documents
        logSection('Opening Documents');
        await openDocuments(client);

        // Wait for server to process documents
        await sleep(2000);

        // Test each feature
        await testHover(client, hoverFeature);
        await testCompletion(client, completionFeature);
        await testDefinition(client, definitionFeature);
        await testReferences(client, referencesFeature);
        await testDocumentSymbols(client, documentSymbolFeature);
        await testRename(client, renameFeature);
        await testDiagnostics(client, diagnosticFeature, window);

        // Final summary
        logSection('Demo Complete');
        logSuccess('All LSP feature tests completed!');

        // Keep alive briefly then stop
        await sleep(1000);
        
        logInfo('Stopping language client...');
        await client.stop();
        logSuccess('Client stopped gracefully');

    } catch (e) {
        logError(`Error: ${e instanceof Error ? e.message : String(e)}`);
        console.error(e);
        process.exit(1);
    }
}

/**
 * Find gopls executable
 */
function findGopls(): string | null {
    const possiblePaths = [
        // Local GOPATH
        path.join(process.env.GOPATH || path.join(process.env.HOME || '', 'go'), 'bin', 'gopls'),
        // Common locations
        '/usr/local/bin/gopls',
        '/usr/bin/gopls',
        path.join(process.env.HOME || '', 'go', 'bin', 'gopls'),
    ];

    // Try using which command
    try {
        const { execSync } = require('child_process');
        const result = execSync('which gopls', { encoding: 'utf-8' }).trim();
        if (result && fs.existsSync(result)) {
            return result;
        }
    } catch (e) {
        // Ignore
    }

    for (const p of possiblePaths) {
        if (fs.existsSync(p)) {
            return p;
        }
    }

    return null;
}

/**
 * Sleep utility
 */
function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Open sample documents
 */
async function openDocuments(client: LanguageClient) {
    const files = [
        { name: 'math.go', path: SAMPLE_FILES.math },
        { name: 'person.go', path: SAMPLE_FILES.person },
        { name: 'calculator.go', path: SAMPLE_FILES.calculator },
        { name: 'main.go', path: SAMPLE_FILES.main }
    ];

    for (const file of files) {
        if (fs.existsSync(file.path)) {
            const content = readFileContent(file.path);
            client.didOpen({
                textDocument: {
                    uri: toUri(file.path),
                    languageId: 'go',
                    version: 1,
                    text: content
                }
            });
            logSuccess(`Opened: ${file.name}`);
        } else {
            logWarning(`File not found: ${file.path}`);
        }
    }
}

/**
 * Test Hover feature
 */
async function testHover(client: LanguageClient, feature: HoverFeature) {
    logSection('Testing Hover Feature');

    if (!feature.isSupported) {
        logWarning('Hover not supported by server');
        return;
    }

    const filePath = SAMPLE_FILES.math;
    const content = readFileContent(filePath);
    
    // Test hover on 'Add' function
    const addPos = findPosition(content, 'func Add');
    if (addPos) {
        logInfo(`Testing hover at position: line ${addPos.line + 1}, char ${addPos.character + 9}`);
        const hover = await feature.provideHover({
            textDocument: { uri: toUri(filePath) },
            position: { line: addPos.line, character: addPos.character + 5 } // position on 'Add'
        });
        
        if (hover) {
            logSuccess('Hover result received:');
            printHoverContent(hover);
        } else {
            logWarning('No hover information returned');
        }
    }

    // Test hover on 'int' type
    const intPos = findPosition(content, '(a, b int)');
    if (intPos) {
        logInfo(`Testing hover on type annotation`);
        const hover = await feature.provideHover({
            textDocument: { uri: toUri(filePath) },
            position: { line: intPos.line, character: intPos.character + 8 }
        });
        
        if (hover) {
            logSuccess('Hover on type:');
            printHoverContent(hover);
        }
    }
}

/**
 * Print hover content
 */
function printHoverContent(hover: Hover) {
    if (typeof hover.contents === 'string') {
        console.log(`    ${hover.contents}`);
    } else if (Array.isArray(hover.contents)) {
        hover.contents.forEach(c => {
            if (typeof c === 'string') {
                console.log(`    ${c}`);
            } else {
                console.log(`    [${c.language}] ${c.value}`);
            }
        });
    } else if ('kind' in hover.contents) {
        console.log(`    ${hover.contents.value.substring(0, 200)}...`);
    } else if ('value' in hover.contents) {
        console.log(`    [${hover.contents.language}] ${hover.contents.value}`);
    }
}

/**
 * Test Completion feature
 */
async function testCompletion(client: LanguageClient, feature: CompletionFeature) {
    logSection('Testing Completion Feature');

    if (!feature.isSupported) {
        logWarning('Completion not supported by server');
        return;
    }

    const filePath = SAMPLE_FILES.calculator;
    const content = readFileContent(filePath);
    
    // Find a good position for completion (after method receiver)
    const funcPos = findPosition(content, 'func (c *Calculator)');
    if (funcPos) {
        logInfo(`Testing completion in method`);
        const items = await feature.provideCompletion({
            textDocument: { uri: toUri(filePath) },
            position: { line: funcPos.line + 5, character: 10 }
        });
        
        if (items) {
            const completionItems = Array.isArray(items) ? items : items.items;
            logSuccess(`Received ${completionItems.length} completion item(s):`);
            completionItems.slice(0, 10).forEach((item: CompletionItem) => {
                console.log(`    - ${item.label} (${getCompletionKindName(item.kind || 0)})`);
            });
            if (completionItems.length > 10) {
                console.log(`    ... and ${completionItems.length - 10} more`);
            }
        } else {
            logWarning('No completion items returned');
        }
    }
}

/**
 * Get completion kind name
 */
function getCompletionKindName(kind: number): string {
    const kinds: Record<number, string> = {
        1: 'Text', 2: 'Method', 3: 'Function', 4: 'Constructor',
        5: 'Field', 6: 'Variable', 7: 'Class', 8: 'Interface',
        9: 'Module', 10: 'Property', 11: 'Unit', 12: 'Value',
        13: 'Enum', 14: 'Keyword', 15: 'Snippet', 16: 'Color',
        17: 'File', 18: 'Reference', 19: 'Folder', 20: 'EnumMember',
        21: 'Constant', 22: 'Struct', 23: 'Event', 24: 'Operator',
        25: 'TypeParameter'
    };
    return kinds[kind] || 'Unknown';
}

/**
 * Test Definition feature
 */
async function testDefinition(client: LanguageClient, feature: DefinitionFeature) {
    logSection('Testing Go to Definition');

    if (!feature.isSupported) {
        logWarning('Definition not supported by server');
        return;
    }

    const filePath = SAMPLE_FILES.calculator;
    const content = readFileContent(filePath);
    
    // Find usage of 'Add' function
    const addUsage = findPosition(content, 'Add(a, b');
    if (addUsage) {
        logInfo(`Testing go to definition on 'Add' function call`);
        const definition = await feature.provideDefinition({
            textDocument: { uri: toUri(filePath) },
            position: { line: addUsage.line, character: addUsage.character + 1 }
        });
        
        if (definition) {
            if (Array.isArray(definition)) {
                logSuccess(`Found ${definition.length} definition(s):`);
                definition.forEach((loc: Location | any) => {
                    const uri = 'targetUri' in loc ? loc.targetUri : loc.uri;
                    const range = 'targetRange' in loc ? loc.targetRange : loc.range;
                    console.log(`    - ${path.basename(uri)} at line ${range.start.line + 1}`);
                });
            } else {
                const loc = definition as Location;
                logSuccess(`Definition found:`);
                console.log(`    - ${path.basename(loc.uri)} at line ${loc.range.start.line + 1}`);
            }
        } else {
            logWarning('No definition found');
        }
    }

    // Test definition on Person type
    const filePath2 = SAMPLE_FILES.userService;
    const content2 = readFileContent(filePath2);
    const personUsage = findPosition(content2, '*Person');
    if (personUsage) {
        logInfo(`Testing go to definition on 'Person' type`);
        const definition = await feature.provideDefinition({
            textDocument: { uri: toUri(filePath2) },
            position: { line: personUsage.line, character: personUsage.character + 1 }
        });
        
        if (definition) {
            logSuccess('Person type definition found');
        }
    }
}

/**
 * Test References feature
 */
async function testReferences(client: LanguageClient, feature: ReferencesFeature) {
    logSection('Testing Find References');

    if (!feature.isSupported) {
        logWarning('References not supported by server');
        return;
    }

    const filePath = SAMPLE_FILES.math;
    const content = readFileContent(filePath);
    
    // Find references to 'Add' function
    const addDef = findPosition(content, 'func Add');
    if (addDef) {
        logInfo(`Finding all references to 'Add' function`);
        const references = await feature.findReferences({
            textDocument: { uri: toUri(filePath) },
            position: { line: addDef.line, character: addDef.character + 5 },
            context: { includeDeclaration: true }
        });
        
        if (references && references.length > 0) {
            logSuccess(`Found ${references.length} reference(s):`);
            references.forEach((ref: Location) => {
                console.log(`    - ${path.basename(ref.uri)} at line ${ref.range.start.line + 1}`);
            });
        } else {
            logWarning('No references found');
        }
    }
}

/**
 * Test Document Symbols feature
 */
async function testDocumentSymbols(client: LanguageClient, feature: DocumentSymbolFeature) {
    logSection('Testing Document Symbols');

    if (!feature.isSupported) {
        logWarning('Document symbols not supported by server');
        return;
    }

    const filePath = SAMPLE_FILES.person;
    logInfo(`Getting symbols for person.go`);
    
    const symbols = await feature.getDocumentSymbols({
        textDocument: { uri: toUri(filePath) }
    });
    
    if (symbols && symbols.length > 0) {
        logSuccess(`Found ${symbols.length} symbol(s):`);
        printSymbols(symbols, 0);
    } else {
        logWarning('No symbols found');
    }
}

/**
 * Print symbols recursively
 */
function printSymbols(symbols: (DocumentSymbol | SymbolInformation)[], indent: number) {
    const prefix = '    '.repeat(indent);
    symbols.forEach(symbol => {
        if ('children' in symbol) {
            // DocumentSymbol with children
            console.log(`${prefix}- ${symbol.name} (${getSymbolKindName(symbol.kind)})`);
            if (symbol.children) {
                printSymbols(symbol.children, indent + 1);
            }
        } else {
            // SymbolInformation
            console.log(`${prefix}- ${symbol.name} (${getSymbolKindName(symbol.kind)})`);
        }
    });
}

/**
 * Get symbol kind name
 */
function getSymbolKindName(kind: number): string {
    const kinds: Record<number, string> = {
        1: 'File', 2: 'Module', 3: 'Namespace', 4: 'Package',
        5: 'Class', 6: 'Method', 7: 'Property', 8: 'Field',
        9: 'Constructor', 10: 'Enum', 11: 'Interface', 12: 'Function',
        13: 'Variable', 14: 'Constant', 15: 'String', 16: 'Number',
        17: 'Boolean', 18: 'Array', 19: 'Object', 20: 'Key',
        21: 'Null', 22: 'EnumMember', 23: 'Struct', 24: 'Event',
        25: 'Operator', 26: 'TypeParameter'
    };
    return kinds[kind] || 'Unknown';
}

/**
 * Test Rename feature
 */
async function testRename(client: LanguageClient, feature: RenameFeature) {
    logSection('Testing Rename');

    if (!feature.isSupported) {
        logWarning('Rename not supported by server');
        return;
    }

    const filePath = SAMPLE_FILES.math;
    const content = readFileContent(filePath);
    
    // Test prepare rename on 'Add' function
    const addDef = findPosition(content, 'func Add');
    if (addDef && feature.isPrepareSupported) {
        logInfo(`Testing prepare rename on 'Add' function`);
        const prepareResult = await feature.prepareRename({
            textDocument: { uri: toUri(filePath) },
            position: { line: addDef.line, character: addDef.character + 5 }
        });
        
        if (prepareResult) {
            logSuccess('Prepare rename result:');
            if ('placeholder' in prepareResult) {
                console.log(`    Placeholder: ${prepareResult.placeholder}`);
            } else if ('defaultBehavior' in prepareResult) {
                console.log(`    Default behavior: ${prepareResult.defaultBehavior}`);
            } else {
                console.log(`    Range: line ${prepareResult.start.line + 1}, char ${prepareResult.start.character}`);
            }
        }
    }

    // Test actual rename (dry run - we won't apply the changes)
    if (addDef) {
        logInfo(`Testing rename 'Add' -> 'AddNumbers' (dry run)`);
        const workspaceEdit = await feature.rename({
            textDocument: { uri: toUri(filePath) },
            position: { line: addDef.line, character: addDef.character + 5 },
            newName: 'AddNumbers'
        });
        
        if (workspaceEdit) {
            logSuccess('Rename would affect:');
            printWorkspaceEdit(workspaceEdit);
        } else {
            logWarning('No rename edits returned');
        }
    }
}

/**
 * Test Diagnostics feature
 */
async function testDiagnostics(client: LanguageClient, feature: DiagnosticFeature, window: ConsoleWindow) {
    logSection('Testing Diagnostics');

    const filePath = SAMPLE_FILES.testDiagnostics;
    logInfo(`Opening file with errors: test_diagnostics.go`);
    
    const content = readFileContent(filePath);
    client.didOpen({
        textDocument: {
            uri: toUri(filePath),
            languageId: 'go',
            version: 1,
            text: content
        }
    });

    // Wait for diagnostics to be published
    await sleep(2000);

    // Get diagnostics from the window
    const diagnostics = window.getDiagnostics(toUri(filePath));

    if (diagnostics && diagnostics.length > 0) {
        logSuccess(`Found ${diagnostics.length} diagnostic(s):`);
        diagnostics.forEach((diag: Diagnostic, index: number) => {
            const severity = diag.severity === 1 ? 'Error' : 
                           diag.severity === 2 ? 'Warning' : 'Info';
            console.log(`    ${index + 1}. [${severity}] Line ${diag.range.start.line + 1}, Col ${diag.range.start.character + 1}`);
            console.log(`       ${diag.message}`);
            if (diag.code) {
                console.log(`       Code: ${diag.code}`);
            }
        });
    } else {
        logWarning('No diagnostics returned. This may indicate:');
        logWarning('  - gopls is still processing the file');
        logWarning('  - The errors are not severe enough for diagnostics');
        logWarning('  - Diagnostics feature is not fully supported');
    }
}

/**
 * Print workspace edit
 */
function printWorkspaceEdit(edit: WorkspaceEdit) {
    if (edit.changes) {
        for (const [uri, edits] of Object.entries(edit.changes)) {
            console.log(`    ${path.basename(uri)}: ${edits.length} edit(s)`);
            edits.slice(0, 3).forEach(e => {
                console.log(`      - Line ${e.range.start.line + 1}: "${e.newText}"`);
            });
            if (edits.length > 3) {
                console.log(`      ... and ${edits.length - 3} more`);
            }
        }
    }
    if (edit.documentChanges) {
        console.log(`    Document changes: ${edit.documentChanges.length} file(s)`);
    }
}

// Run the demo
main().catch(console.error);
