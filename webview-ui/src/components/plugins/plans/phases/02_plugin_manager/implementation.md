# Phase 2: Plugin Manager - Implementation Plan

## Overview

The Plugin Manager is the core backend component responsible for:
1. Reading and writing the `.rooplugins` manifest file
2. Validating plugin entries against a schema
3. Managing file watching for hot reloading
4. Executing plugins (both local and remote)
5. Providing a clean API for the extension to interact with plugins

This document outlines the implementation strategy for the `PluginManager` class and its supporting components.

## Implementation Approach

The implementation follows these principles:
1. Clear separation of concerns
2. Schema-based validation
3. File-system based persistence
4. Robust error handling
5. Event-driven updates

## File Structure

```
src/core/config/
├── PluginManager.ts       # Main plugin manager implementation
├── PluginsSchema.ts       # Zod schema for plugin validation
└── __tests__/
    └── PluginManager.test.ts  # Unit tests
```

## Class Structure

### PluginManager

```typescript
export class PluginManager implements vscode.Disposable {
  private plugins: RooPluginEntry[] = [];
  private fileWatcher: vscode.FileSystemWatcher | undefined;
  private disposables: vscode.Disposable[] = [];
  private manifestPath: string | undefined;
  private writeQueue: PQueue;
  private onUpdateCallback: () => Promise<void>;

  constructor(
    private context: vscode.ExtensionContext,
    onUpdate: () => Promise<void>
  ) {
    this.onUpdateCallback = onUpdate;
    this.writeQueue = new PQueue({ concurrency: 1 });
    this.init();
  }

  private async init() {
    // Initialize the manager
    // 1. Determine manifest path
    // 2. Set up file watcher
    // 3. Load plugins from file
  }

  public async loadPlugins(): Promise<RooPluginEntry[]> {
    // Load and validate plugins from manifest file
    // Return the loaded plugins
  }

  public getPlugins(): RooPluginEntry[] {
    // Return the current plugins list
    return this.plugins;
  }

  public async addPlugin(plugin: RooPluginEntry): Promise<void> {
    // Add a new plugin to the list and save
  }

  public async removePlugin(slug: string): Promise<void> {
    // Remove a plugin by slug and save
  }

  public async togglePlugin(slug: string, enabled: boolean): Promise<void> {
    // Toggle a plugin's enabled state and save
  }

  public async updatePlugin(
    slug: string, 
    updates: Partial<RooPluginEntry>
  ): Promise<void> {
    // Update an existing plugin's properties and save
  }

  public async executePlugin(
    slug: string, 
    input?: string
  ): Promise<string> {
    // Execute a plugin by slug
    // Handle both local and remote plugins
    // Return the output
  }

  private async savePlugins(): Promise<void> {
    // Queue the save operation
    // Write plugins to the manifest file
  }

  public getPluginsFilePath(): string {
    // Get the path to the plugins manifest file
    return this.manifestPath!;
  }

  public async createDefaultManifest(): Promise<void> {
    // Create a default manifest file if none exists
  }

  public dispose() {
    // Clean up resources
    this.disposables.forEach(d => d.dispose());
  }
}
```

## Detailed Implementation Steps

### 1. Schema Definition

First, we'll define the schema for plugin entries in `PluginsSchema.ts`:

```typescript
import { z } from 'zod';

// Define schema for a plugin entry
export const pluginEntrySchema = z.object({
  slug: z.string().regex(/^[a-z0-9-]+$/, 'Slug must be lowercase letters, numbers, and hyphens only'),
  name: z.string().min(1, 'Name is required'),
  roleDefinition: z.string().optional(),
  groups: z.array(z.string()).optional(),
  customInstructions: z.string().optional(),
  location: z.enum(['local', 'remote']),
  package: z.string().optional(),
  path: z.string().optional(),
  enabled: z.boolean().default(true),
}).superRefine((val, ctx) => {
  // Validate location-specific fields
  if (val.location === 'remote' && !val.package) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Remote plugins must specify a 'package' name",
      path: ['package'],
    });
  }
  
  if (val.location === 'local' && !val.path) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Local plugins must specify a 'path'",
      path: ['path'],
    });
  }
});

// Define schema for the manifest file
export const roopluginsSchema = z.object({
  plugins: z.array(pluginEntrySchema),
});

// TypeScript types derived from the schemas
export type RooPluginEntry = z.infer<typeof pluginEntrySchema>;
export type RooPluginManifest = z.infer<typeof roopluginsSchema>;
```

### 2. Manager Initialization

The `init` method will set up the manager:

```typescript
private async init() {
  // Determine manifest path
  this.manifestPath = this.getPluginsFilePath();
  
  // Set up file watcher
  this.setupFileWatcher();
  
  // Initial load of plugins
  await this.loadPlugins();
}

private getPluginsFilePath(): string {
  const workspaceFolders = vscode.workspace.workspaceFolders;
  if (workspaceFolders && workspaceFolders.length > 0) {
    // Use workspace root if available
    return path.join(workspaceFolders[0].uri.fsPath, '.rooplugins');
  } else {
    // Fall back to global storage path
    return path.join(this.context.globalStoragePath, 'plugins.json');
  }
}

private setupFileWatcher() {
  if (this.manifestPath) {
    // Create a file watcher for .rooplugins
    this.fileWatcher = vscode.workspace.createFileSystemWatcher(
      new vscode.RelativePattern(
        path.dirname(this.manifestPath),
        path.basename(this.manifestPath)
      )
    );
    
    // Handle file changes
    this.fileWatcher.onDidChange(this.handleFileChange);
    this.fileWatcher.onDidCreate(this.handleFileChange);
    this.fileWatcher.onDidDelete(this.handleFileDelete);
    
    this.disposables.push(this.fileWatcher);
  }
}

private handleFileChange = async (uri: vscode.Uri) => {
  try {
    await this.loadPlugins();
    await this.onUpdateCallback();
  } catch (error) {
    vscode.window.showErrorMessage(
      `Error loading plugins: ${error.message}`
    );
  }
}

private handleFileDelete = async (uri: vscode.Uri) => {
  // If file is deleted, create a default one
  try {
    await this.createDefaultManifest();
    await this.loadPlugins();
    await this.onUpdateCallback();
  } catch (error) {
    vscode.window.showErrorMessage(
      `Error recreating plugins manifest: ${error.message}`
    );
  }
}
```

### 3. Loading Plugins

The `loadPlugins` method will read and validate the manifest file:

```typescript
public async loadPlugins(): Promise<RooPluginEntry[]> {
  try {
    // Check if file exists, create default if not
    try {
      await vscode.workspace.fs.stat(vscode.Uri.file(this.manifestPath!));
    } catch {
      await this.createDefaultManifest();
    }
    
    // Read file content
    const content = await vscode.workspace.fs.readFile(
      vscode.Uri.file(this.manifestPath!)
    );
    
    // Parse JSON
    const text = new TextDecoder().decode(content);
    const data = JSON.parse(text);
    
    // Validate with schema
    const result = roopluginsSchema.safeParse(data);
    
    if (!result.success) {
      // If invalid, show error and return empty array
      const formattedError = JSON.stringify(result.error.format(), null, 2);
      vscode.window.showErrorMessage(
        `Invalid plugin manifest format: ${formattedError}`
      );
      return [];
    }
    
    // Update internal state
    this.plugins = result.data.plugins;
    
    // Update global state for persistence
    await this.context.globalState.update('plugins', this.plugins);
    
    return this.plugins;
  } catch (error) {
    vscode.window.showErrorMessage(
      `Failed to load plugins: ${error.message}`
    );
    return [];
  }
}
```

### 4. Plugin Operations (CRUD)

Implement methods to manage plugins:

```typescript
public async addPlugin(plugin: RooPluginEntry): Promise<void> {
  // Validate plugin with schema
  const result = pluginEntrySchema.safeParse(plugin);
  if (!result.success) {
    const formattedError = JSON.stringify(result.error.format(), null, 2);
    throw new Error(`Invalid plugin format: ${formattedError}`);
  }
  
  // Check for duplicate slug
  if (this.plugins.some(p => p.slug === plugin.slug)) {
    throw new Error(`Plugin with slug '${plugin.slug}' already exists`);
  }
  
  // Add to plugins array
  this.plugins.push(plugin);
  
  // Create local plugin file if needed
  if (plugin.location === 'local' && plugin.path) {
    await this.createLocalPluginFile(plugin);
  }
  
  // Save to manifest
  await this.savePlugins();
}

private async createLocalPluginFile(plugin: RooPluginEntry): Promise<void> {
  try {
    const fullPath = this.resolveLocalPluginPath(plugin.path!);
    
    // Create parent directories if they don't exist
    const dirPath = path.dirname(fullPath);
    await fs.mkdir(dirPath, { recursive: true });
    
    // Check if file already exists
    try {
      await vscode.workspace.fs.stat(vscode.Uri.file(fullPath));
      // File exists, don't overwrite
      return;
    } catch {
      // File doesn't exist, create it
    }
    
    // Create a basic template
    const template = `// Roo Code Plugin: ${plugin.name}
// This plugin currently just prints a greeting. Modify it as needed.
console.log("Hello from ${plugin.name} plugin!");`;
    
    // Write to file
    await vscode.workspace.fs.writeFile(
      vscode.Uri.file(fullPath),
      Buffer.from(template, 'utf8')
    );
    
    // Open the file in the editor
    const doc = await vscode.workspace.openTextDocument(fullPath);
    await vscode.window.showTextDocument(doc);
  } catch (error) {
    vscode.window.showErrorMessage(
      `Failed to create plugin file: ${error.message}`
    );
  }
}

private resolveLocalPluginPath(pluginPath: string): string {
  // If path is relative, resolve against workspace root
  if (!path.isAbsolute(pluginPath) && vscode.workspace.workspaceFolders) {
    return path.join(
      vscode.workspace.workspaceFolders[0].uri.fsPath,
      pluginPath
    );
  }
  return pluginPath;
}

public async removePlugin(slug: string): Promise<void> {
  // Find plugin index
  const index = this.plugins.findIndex(p => p.slug === slug);
  if (index === -1) {
    throw new Error(`Plugin with slug '${slug}' not found`);
  }
  
  // Remove from array
  this.plugins.splice(index, 1);
  
  // Save to manifest
  await this.savePlugins();
}

public async togglePlugin(slug: string, enabled: boolean): Promise<void> {
  // Find plugin
  const plugin = this.plugins.find(p => p.slug === slug);
  if (!plugin) {
    throw new Error(`Plugin with slug '${slug}' not found`);
  }
  
  // Update enabled state
  plugin.enabled = enabled;
  
  // Save to manifest
  await this.savePlugins();
}

public async updatePlugin(
  slug: string, 
  updates: Partial<RooPluginEntry>
): Promise<void> {
  // Find plugin
  const plugin = this.plugins.find(p => p.slug === slug);
  if (!plugin) {
    throw new Error(`Plugin with slug '${slug}' not found`);
  }
  
  // If slug is being updated, ensure no conflicts
  if (updates.slug && updates.slug !== slug && 
      this.plugins.some(p => p.slug === updates.slug)) {
    throw new Error(`Plugin with slug '${updates.slug}' already exists`);
  }
  
  // Apply updates
  Object.assign(plugin, updates);
  
  // Validate updated plugin
  const result = pluginEntrySchema.safeParse(plugin);
  if (!result.success) {
    const formattedError = JSON.stringify(result.error.format(), null, 2);
    throw new Error(`Invalid plugin format after update: ${formattedError}`);
  }
  
  // Save to manifest
  await this.savePlugins();
}
```

### 5. Saving Plugins

Implement queueing for safely writing to the manifest file:

```typescript
private async savePlugins(): Promise<void> {
  // Queue the save operation to prevent concurrent writes
  return this.writeQueue.add(async () => {
    try {
      const manifest: RooPluginManifest = {
        plugins: this.plugins
      };
      
      // Update global state for persistence
      await this.context.globalState.update('plugins', this.plugins);
      
      // Write to file
      await vscode.workspace.fs.writeFile(
        vscode.Uri.file(this.manifestPath!),
        Buffer.from(JSON.stringify(manifest, null, 2), 'utf8')
      );
      
      // Trigger update callback
      await this.onUpdateCallback();
    } catch (error) {
      vscode.window.showErrorMessage(
        `Failed to save plugins: ${error.message}`
      );
      throw error;
    }
  });
}

public async createDefaultManifest(): Promise<void> {
  try {
    // Create a default manifest with empty plugins array
    const manifest: RooPluginManifest = { plugins: [] };
    
    // Ensure directory exists
    const dirPath = path.dirname(this.manifestPath!);
    await fs.mkdir(dirPath, { recursive: true });
    
    // Write to file
    await vscode.workspace.fs.writeFile(
      vscode.Uri.file(this.manifestPath!),
      Buffer.from(JSON.stringify(manifest, null, 2), 'utf8')
    );
  } catch (error) {
    vscode.window.showErrorMessage(
      `Failed to create default manifest: ${error.message}`
    );
    throw error;
  }
}
```

### 6. Plugin Execution

Implement plugin execution for both local and remote plugins:

```typescript
public async executePlugin(
  slug: string, 
  input?: string
): Promise<string> {
  // Find plugin
  const plugin = this.plugins.find(p => p.slug === slug);
  if (!plugin) {
    throw new Error(`Plugin with slug '${slug}' not found`);
  }
  
  // Check if enabled
  if (!plugin.enabled) {
    throw new Error(`Plugin '${plugin.name}' is disabled`);
  }
  
  try {
    let command: string;
    let args: string[] = [];
    let cwd: string | undefined;
    
    if (plugin.location === 'remote') {
      // For remote plugins, use NPX
      command = 'npx';
      args = ['-y', plugin.package!];
    } else {
      // For local plugins, use Node
      command = 'node';
      const fullPath = this.resolveLocalPluginPath(plugin.path!);
      args = [fullPath];
      cwd = path.dirname(fullPath); // Set working directory to plugin dir
    }
    
    // Create output channel if needed
    const outputChannel = vscode.window.createOutputChannel(
      `Plugin: ${plugin.name}`
    );
    
    // Show output channel
    outputChannel.show();
    outputChannel.appendLine(`Executing plugin '${plugin.name}'...`);
    
    // Execute the process
    const process = cp.spawn(command, args, {
      cwd,
      shell: true,
    });
    
    // Capture output
    let stdout = '';
    let stderr = '';
    
    process.stdout.on('data', (data) => {
      const text = data.toString();
      stdout += text;
      outputChannel.append(text);
    });
    
    process.stderr.on('data', (data) => {
      const text = data.toString();
      stderr += text;
      outputChannel.append(text);
    });
    
    // Send input if provided
    if (input) {
      process.stdin.write(input);
      process.stdin.end();
    }
    
    // Wait for process to complete
    return new Promise<string>((resolve, reject) => {
      process.on('close', (code) => {
        outputChannel.appendLine(`\nExited with code ${code}`);
        
        if (code !== 0) {
          const error = `Plugin execution failed with code ${code}${stderr ? ': ' + stderr : ''}`;
          outputChannel.appendLine(`Error: ${error}`);
          reject(new Error(error));
        } else {
          resolve(stdout);
        }
      });
      
      process.on('error', (error) => {
        outputChannel.appendLine(`\nExecution error: ${error.message}`);
        reject(error);
      });
    });
  } catch (error) {
    vscode.window.showErrorMessage(
      `Failed to execute plugin '${plugin.name}': ${error.message}`
    );
    throw error;
  }
}
```

### 7. Cleanup

Implement proper disposal of resources:

```typescript
public dispose() {
  // Clean up resources
  this.disposables.forEach(d => d.dispose());
  this.disposables = [];
}
```

## Integration Points

The PluginManager will be integrated with the rest of the extension in these ways:

1. **Initialization**: Created in the `ClineProvider` constructor
2. **State Updates**: Uses the provided `onUpdate` callback to notify when plugins change
3. **Command Registration**: Several VS Code commands will be registered to interact with the manager
4. **Webview Communication**: The extension's message handler will call Plugin Manager methods in response to UI actions

## Error Handling Strategy

The implementation includes robust error handling:

1. **Validation Errors**: Schema validation with clear error messages
2. **File System Errors**: Gracefully handle missing files, permission issues
3. **Execution Errors**: Capture and report plugin execution failures
4. **User Feedback**: Show appropriate error messages via VS Code notifications
5. **Recovery**: Create default files when missing, maintain a valid state

## Performance Considerations

1. **Concurrency Control**: Queue for file writes to prevent race conditions
2. **Efficient File Watching**: Only watch the specific manifest file
3. **Lazy Loading**: Plugin files are only executed when needed
4. **Error Isolation**: Plugin failures don't affect extension operation

## Schema JSON

The PluginManager will also generate a JSON schema for VS Code's built-in JSON validation:

```typescript
// Generate JSON schema for .rooplugins
export function generatePluginsJsonSchema(): any {
  // Convert Zod schema to JSON schema
  return {
    $schema: "http://json-schema.org/draft-07/schema#",
    title: "Roo Plugins Configuration",
    type: "object",
    required: ["plugins"],
    properties: {
      plugins: {
        type: "array",
        description: "List of plugin definitions",
        items: {
          type: "object",
          required: ["slug", "name", "location"],
          properties: {
            slug: {
              type: "string",
              description: "Unique identifier (lowercase, hyphens)",
              pattern: "^[a-z0-9-]+$"
            },
            name: {
              type: "string",
              description: "Human-readable name"
            },
            roleDefinition: {
              type: "string",
              description: "Description of the plugin's purpose and role"
            },
            groups: {
              type: "array",
              description: "Capability groups the plugin belongs to",
              items: {
                type: "string"
              }
            },
            customInstructions: {
              type: "string",
              description: "Additional instructions for using the plugin"
            },
            location: {
              type: "string",
              description: "Plugin source location type",
              enum: ["local", "remote"]
            },
            package: {
              type: "string",
              description: "NPM package name (for remote plugins)"
            },
            path: {
              type: "string",
              description: "Path to plugin script (for local plugins)"
            },
            enabled: {
              type: "boolean",
              description: "Whether the plugin is enabled",
              default: true
            }
          },
          allOf: [
            {
              if: {
                properties: { location: { enum: ["remote"] } },
                required: ["location"]
              },
              then: { required: ["package"] }
            },
            {
              if: {
                properties: { location: { enum: ["local"] } },
                required: ["location"]
              },
              then: { required: ["path"] }
            }
          ]
        }
      }
    }
  };
}
```

## Extension Points

The PluginManager is designed with future extensions in mind:

1. **Plugin Type Extensions**: Support for additional plugin types beyond local/remote
2. **Configuration Options**: Extending the schema for plugin-specific settings
3. **Event System**: Expanding the callback system for more granular events
4. **Dependency Management**: Future support for managing plugin dependencies

## Testing Strategy

The PluginManager will be thoroughly tested:

1. **Unit Tests**: Test individual methods with mocked dependencies
2. **Integration Tests**: Test file system interactions and command execution
3. **Schema Validation**: Test validation of valid and invalid plugin entries
4. **Error Handling**: Test recovery from various error conditions

## Implementation Timeline

1. Define schemas and interfaces (1 day)
2. Implement core manager functionality (2 days)
3. Implement file watching and persistence (1 day)
4. Implement plugin execution logic (1 day)
5. Write unit and integration tests (2 days)
6. Integration with extension and UI (1 day)

## Dependencies

- VS Code Extensions API
- Node.js child_process module
- p-queue for write queue
- zod for schema validation