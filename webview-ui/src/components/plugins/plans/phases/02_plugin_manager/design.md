# Phase 2: Plugin Manager - Design

## Class Structure

The `PluginManager` class is the core component responsible for managing the plugin lifecycle. It will be implemented in `src/core/config/PluginManager.ts`.

```typescript
/**
 * Manages plugin discovery, loading, and execution
 */
export class PluginManager implements vscode.Disposable {
  private plugins: RooPluginEntry[] = [];
  private watcher: vscode.FileSystemWatcher | undefined;
  private writeQueue: Queue<() => Promise<void>>;
  private runningPlugins: Map<string, ChildProcess> = new Map();
  private outputChannel: vscode.OutputChannel;
  private onUpdateCallback: () => Promise<void>;
  private context: vscode.ExtensionContext;

  /**
   * Creates a new PluginManager
   * 
   * @param context The extension context
   * @param onUpdate Callback to invoke when plugin list changes
   */
  constructor(
    context: vscode.ExtensionContext,
    onUpdate: () => Promise<void>
  ) {
    this.context = context;
    this.onUpdateCallback = onUpdate;
    this.writeQueue = new Queue({concurrency: 1});
    this.outputChannel = vscode.window.createOutputChannel('Roo Plugins');
    
    // Initialize plugin list
    this.initializePlugins().catch(err => 
      this.logError('Failed to initialize plugins', err));
  }
  
  /**
   * Disposes resources used by the manager
   */
  dispose() {
    this.watcher?.dispose();
    this.stopAllPlugins();
    this.outputChannel.dispose();
  }
  
  // Additional methods described below...
}
```

## Core Methods

### Manifest Management

```typescript
/**
 * Initialize the plugin system - load plugins and set up watchers
 */
private async initializePlugins(): Promise<void> {
  // Set up file watcher for .rooplugins
  this.setupWatcher();
  
  // Load initial plugins
  await this.loadPlugins();
}

/**
 * Set up watcher for .rooplugins file
 */
private setupWatcher(): void {
  const pattern = new vscode.RelativePattern(
    vscode.workspace.workspaceFolders?.[0] || '', 
    '.rooplugins'
  );
  
  this.watcher = vscode.workspace.createFileSystemWatcher(pattern);
  
  // Watch for create/change events
  this.watcher.onDidCreate(() => this.loadPlugins());
  this.watcher.onDidChange(() => this.loadPlugins());
  
  // Watch for delete events - recreate default file
  this.watcher.onDidDelete(async () => {
    await this.createDefaultManifest();
    await this.loadPlugins();
  });
}

/**
 * Get the path to the .rooplugins file
 */
private getPluginsFilePath(): string | undefined {
  if (!vscode.workspace.workspaceFolders?.[0]) {
    return undefined;
  }
  
  return path.join(
    vscode.workspace.workspaceFolders[0].uri.fsPath,
    '.rooplugins'
  );
}

/**
 * Create a default .rooplugins file if none exists
 */
private async createDefaultManifest(): Promise<void> {
  const filePath = this.getPluginsFilePath();
  if (!filePath) {
    return;
  }
  
  const defaultContent = JSON.stringify({
    plugins: []
  }, null, 2);
  
  try {
    await fs.writeFile(filePath, defaultContent, 'utf8');
    this.log('Created default .rooplugins file');
  } catch (err) {
    this.logError('Failed to create default .rooplugins file', err);
    throw err;
  }
}

/**
 * Load plugins from the .rooplugins file
 */
async loadPlugins(): Promise<RooPluginEntry[]> {
  try {
    const filePath = this.getPluginsFilePath();
    if (!filePath) {
      this.plugins = [];
      return this.plugins;
    }
    
    // Check if file exists
    try {
      await fs.access(filePath);
    } catch {
      // File doesn't exist, create default
      await this.createDefaultManifest();
    }
    
    // Read and parse file
    const content = await fs.readFile(filePath, 'utf8');
    let data: unknown;
    
    try {
      data = JSON.parse(content);
    } catch (err) {
      this.logError('Invalid JSON in .rooplugins file', err);
      vscode.window.showErrorMessage('Invalid JSON in .rooplugins file');
      return this.plugins;
    }
    
    // Validate with schema
    const result = pluginsManifestSchema.safeParse(data);
    
    if (!result.success) {
      this.logError('Invalid .rooplugins format', result.error);
      vscode.window.showErrorMessage(
        'Invalid .rooplugins format: ' + result.error.errors[0]?.message
      );
      return this.plugins;
    }
    
    // Update internal state
    this.plugins = result.data.plugins;
    
    // Update global state
    await this.context.globalState.update('plugins', this.plugins);
    
    // Notify about update
    await this.onUpdateCallback();
    
    return this.plugins;
  } catch (err) {
    this.logError('Failed to load plugins', err);
    throw err;
  }
}
```

### CRUD Operations

```typescript
/**
 * Get the current list of plugins
 */
getPlugins(): RooPluginEntry[] {
  return [...this.plugins];
}

/**
 * Add a new plugin to the manifest
 */
async addPlugin(plugin: RooPluginEntry): Promise<void> {
  // Validate the plugin entry
  const validation = pluginEntrySchema.safeParse(plugin);
  if (!validation.success) {
    this.logError('Invalid plugin entry', validation.error);
    throw new Error(`Invalid plugin entry: ${validation.error.errors[0]?.message}`);
  }
  
  // Check for duplicate slug
  if (this.plugins.some(p => p.slug === plugin.slug)) {
    throw new Error(`Plugin with slug "${plugin.slug}" already exists`);
  }
  
  // Queue the write operation
  return this.queueWrite(async () => {
    // Get the latest plugins first
    await this.loadPlugins();
    
    // Add the plugin
    this.plugins.push(plugin);
    
    // Write to file
    await this.savePlugins();
    
    // If it's a local plugin that needs scaffolding, create it
    if (plugin.location === 'local' && plugin.path) {
      await this.createLocalPluginScaffold(plugin);
    }
  });
}

/**
 * Remove a plugin by slug
 */
async removePlugin(slug: string): Promise<void> {
  return this.queueWrite(async () => {
    // Get the latest plugins first
    await this.loadPlugins();
    
    // Find and remove the plugin
    const index = this.plugins.findIndex(p => p.slug === slug);
    if (index === -1) {
      throw new Error(`Plugin with slug "${slug}" not found`);
    }
    
    // Stop the plugin if it's running
    await this.stopPlugin(slug);
    
    // Remove from array
    this.plugins.splice(index, 1);
    
    // Write to file
    await this.savePlugins();
  });
}

/**
 * Toggle a plugin's enabled state
 */
async togglePlugin(slug: string, enabled: boolean): Promise<void> {
  return this.queueWrite(async () => {
    // Get the latest plugins first
    await this.loadPlugins();
    
    // Find the plugin
    const plugin = this.plugins.find(p => p.slug === slug);
    if (!plugin) {
      throw new Error(`Plugin with slug "${slug}" not found`);
    }
    
    // Update enabled state
    plugin.enabled = enabled;
    
    // If disabling, stop it if running
    if (!enabled) {
      await this.stopPlugin(slug);
    }
    
    // Write to file
    await this.savePlugins();
  });
}

/**
 * Update a plugin by slug
 */
async updatePlugin(slug: string, updates: Partial<RooPluginEntry>): Promise<void> {
  return this.queueWrite(async () => {
    // Get the latest plugins first
    await this.loadPlugins();
    
    // Find the plugin
    const index = this.plugins.findIndex(p => p.slug === slug);
    if (index === -1) {
      throw new Error(`Plugin with slug "${slug}" not found`);
    }
    
    const plugin = this.plugins[index];
    
    // Create updated plugin
    const updatedPlugin = {
      ...plugin,
      ...updates
    };
    
    // Validate the updated plugin
    const validation = pluginEntrySchema.safeParse(updatedPlugin);
    if (!validation.success) {
      throw new Error(`Invalid plugin update: ${validation.error.errors[0]?.message}`);
    }
    
    // Stop the plugin if it's running
    await this.stopPlugin(slug);
    
    // Update the plugin
    this.plugins[index] = updatedPlugin;
    
    // Write to file
    await this.savePlugins();
    
    // If slug changed, update running processes map
    if (updates.slug && updates.slug !== slug) {
      if (this.runningPlugins.has(slug)) {
        const process = this.runningPlugins.get(slug);
        this.runningPlugins.delete(slug);
        if (process) {
          this.runningPlugins.set(updates.slug, process);
        }
      }
    }
  });
}

/**
 * Write plugins to the .rooplugins file
 */
private async savePlugins(): Promise<void> {
  const filePath = this.getPluginsFilePath();
  if (!filePath) {
    return;
  }
  
  const data = { plugins: this.plugins };
  
  try {
    await fs.writeFile(
      filePath,
      JSON.stringify(data, null, 2),
      'utf8'
    );
    
    // Update global state
    await this.context.globalState.update('plugins', this.plugins);
    
    // Notify about update
    await this.onUpdateCallback();
  } catch (err) {
    this.logError('Failed to save plugins', err);
    throw err;
  }
}

/**
 * Queue a write operation to prevent race conditions
 */
private async queueWrite(operation: () => Promise<void>): Promise<void> {
  return this.writeQueue.add(operation);
}
```

### Plugin Execution

```typescript
/**
 * Execute a plugin by slug
 */
async executePlugin(slug: string, input?: string): Promise<string> {
  // Find the plugin
  const plugin = this.plugins.find(p => p.slug === slug);
  if (!plugin) {
    throw new Error(`Plugin with slug "${slug}" not found`);
  }
  
  // Check if the plugin is enabled
  if (!plugin.enabled) {
    throw new Error(`Plugin "${plugin.name}" is disabled`);
  }
  
  this.log(`Executing plugin: ${plugin.name} (${plugin.slug})`);
  
  try {
    // Different execution based on plugin location
    if (plugin.location === 'remote') {
      return this.executeRemotePlugin(plugin, input);
    } else {
      return this.executeLocalPlugin(plugin, input);
    }
  } catch (err) {
    this.logError(`Error executing plugin "${plugin.name}"`, err);
    throw err;
  }
}

/**
 * Execute a remote plugin via NPX
 */
private async executeRemotePlugin(
  plugin: RooPluginEntry, 
  input?: string
): Promise<string> {
  if (!plugin.package) {
    throw new Error(`Remote plugin "${plugin.name}" has no package specified`);
  }
  
  return new Promise<string>((resolve, reject) => {
    // Build the NPX command
    const command = 'npx';
    const args = ['-y', plugin.package!];
    
    this.log(`Running: ${command} ${args.join(' ')}`);
    
    // Spawn the process
    const process = spawn(command, args, {
      shell: true
    });
    
    // Track the running plugin
    this.runningPlugins.set(plugin.slug, process);
    
    // Collect output
    let stdout = '';
    let stderr = '';
    
    process.stdout.on('data', (data) => {
      const text = data.toString();
      stdout += text;
      this.log(`[${plugin.slug}] ${text.trimEnd()}`);
    });
    
    process.stderr.on('data', (data) => {
      const text = data.toString();
      stderr += text;
      this.log(`[${plugin.slug}:error] ${text.trimEnd()}`);
    });
    
    // Send input if provided
    if (input && input.length > 0) {
      process.stdin.write(input);
      process.stdin.end();
    }
    
    // Handle process completion
    process.on('close', (code) => {
      this.runningPlugins.delete(plugin.slug);
      
      if (code !== 0) {
        this.log(`Plugin "${plugin.name}" exited with code ${code}`);
        reject(new Error(`Plugin exited with code ${code}: ${stderr}`));
        return;
      }
      
      resolve(stdout);
    });
    
    process.on('error', (err) => {
      this.runningPlugins.delete(plugin.slug);
      this.logError(`Failed to start plugin "${plugin.name}"`, err);
      reject(err);
    });
  });
}

/**
 * Execute a local plugin via Node.js
 */
private async executeLocalPlugin(
  plugin: RooPluginEntry, 
  input?: string
): Promise<string> {
  if (!plugin.path) {
    throw new Error(`Local plugin "${plugin.name}" has no path specified`);
  }
  
  // Resolve the path (may be relative to workspace root)
  const workspacePath = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
  let pluginPath = plugin.path;
  
  if (workspacePath && !path.isAbsolute(pluginPath)) {
    pluginPath = path.join(workspacePath, pluginPath);
  }
  
  // Check if the file exists
  try {
    await fs.access(pluginPath);
  } catch {
    throw new Error(`Plugin file not found: ${plugin.path}`);
  }
  
  return new Promise<string>((resolve, reject) => {
    // Build the Node command
    const command = 'node';
    const args = [pluginPath];
    
    this.log(`Running: ${command} ${args.join(' ')}`);
    
    // Spawn the process
    const process = spawn(command, args, {
      shell: true
    });
    
    // Track the running plugin
    this.runningPlugins.set(plugin.slug, process);
    
    // Collect output
    let stdout = '';
    let stderr = '';
    
    process.stdout.on('data', (data) => {
      const text = data.toString();
      stdout += text;
      this.log(`[${plugin.slug}] ${text.trimEnd()}`);
    });
    
    process.stderr.on('data', (data) => {
      const text = data.toString();
      stderr += text;
      this.log(`[${plugin.slug}:error] ${text.trimEnd()}`);
    });
    
    // Send input if provided
    if (input && input.length > 0) {
      process.stdin.write(input);
      process.stdin.end();
    }
    
    // Handle process completion
    process.on('close', (code) => {
      this.runningPlugins.delete(plugin.slug);
      
      if (code !== 0) {
        this.log(`Plugin "${plugin.name}" exited with code ${code}`);
        reject(new Error(`Plugin exited with code ${code}: ${stderr}`));
        return;
      }
      
      resolve(stdout);
    });
    
    process.on('error', (err) => {
      this.runningPlugins.delete(plugin.slug);
      this.logError(`Failed to start plugin "${plugin.name}"`, err);
      reject(err);
    });
  });
}
```

### Plugin Lifecycle Management

```typescript
/**
 * Stop a running plugin by slug
 */
async stopPlugin(slug: string): Promise<void> {
  const process = this.runningPlugins.get(slug);
  if (!process) {
    return;
  }
  
  this.log(`Stopping plugin: ${slug}`);
  
  try {
    // Try graceful termination first
    process.kill();
    
    // Wait for process to exit or force kill after timeout
    await new Promise<void>((resolve) => {
      const timeout = setTimeout(() => {
        if (this.runningPlugins.has(slug)) {
          this.log(`Force killing plugin: ${slug}`);
          process.kill('SIGKILL');
        }
        resolve();
      }, 3000);
      
      process.on('exit', () => {
        clearTimeout(timeout);
        resolve();
      });
    });
    
    this.runningPlugins.delete(slug);
  } catch (err) {
    this.logError(`Error stopping plugin "${slug}"`, err);
    
    // Ensure it's removed from the map even if there was an error
    this.runningPlugins.delete(slug);
    
    throw err;
  }
}

/**
 * Stop all running plugins
 */
async stopAllPlugins(): Promise<void> {
  const slugs = Array.from(this.runningPlugins.keys());
  
  for (const slug of slugs) {
    await this.stopPlugin(slug);
  }
}
```

### Local Plugin Scaffolding

```typescript
/**
 * Create scaffold files for a local plugin
 */
private async createLocalPluginScaffold(plugin: RooPluginEntry): Promise<void> {
  if (!plugin.path) {
    return;
  }
  
  const workspacePath = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
  if (!workspacePath) {
    return;
  }
  
  // Resolve the absolute path
  let pluginPath = plugin.path;
  if (!path.isAbsolute(pluginPath)) {
    pluginPath = path.join(workspacePath, pluginPath);
  }
  
  // Create the directory if it doesn't exist
  const dir = path.dirname(pluginPath);
  try {
    await fs.mkdir(dir, { recursive: true });
  } catch (err) {
    this.logError(`Failed to create plugin directory: ${dir}`, err);
    throw err;
  }
  
  // Check if the file already exists
  try {
    await fs.access(pluginPath);
    // File exists, don't overwrite
    this.log(`Plugin file already exists: ${pluginPath}`);
    return;
  } catch {
    // File doesn't exist, create it
  }
  
  // Create a basic plugin template
  const template = `// Roo Code Plugin: ${plugin.name}
// 
// This is a basic plugin template that prints a greeting.
// You can modify this file to implement your plugin functionality.
//
// To receive input: process.stdin.on('data', (data) => { ... })
// To provide output: simply use console.log()
//
console.log("Hello from ${plugin.name} plugin!");
`;
  
  try {
    await fs.writeFile(pluginPath, template, 'utf8');
    this.log(`Created plugin scaffold: ${pluginPath}`);
    
    // Open the file in the editor
    const uri = vscode.Uri.file(pluginPath);
    await vscode.window.showTextDocument(uri);
  } catch (err) {
    this.logError(`Failed to create plugin scaffold: ${pluginPath}`, err);
    throw err;
  }
}
```

### Utility Methods

```typescript
/**
 * Log a message to the output channel
 */
private log(message: string): void {
  this.outputChannel.appendLine(`[${new Date().toISOString()}] ${message}`);
}

/**
 * Log an error to the output channel
 */
private logError(message: string, error: unknown): void {
  this.outputChannel.appendLine(`[${new Date().toISOString()}] ERROR: ${message}`);
  if (error instanceof Error) {
    this.outputChannel.appendLine(`- ${error.message}`);
    if (error.stack) {
      this.outputChannel.appendLine(`- ${error.stack}`);
    }
  } else {
    this.outputChannel.appendLine(`- ${String(error)}`);
  }
}
```

## Design Patterns

### Queue for Write Operations

The `writeQueue` is used to serialize write operations, preventing race conditions. This is implemented using a simple promise-based queue:

```typescript
class Queue<T> {
  private queue: (() => Promise<T>)[] = [];
  private running = false;
  private concurrency: number;
  
  constructor(options: { concurrency: number }) {
    this.concurrency = options.concurrency;
  }
  
  async add(operation: () => Promise<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      this.queue.push(async () => {
        try {
          const result = await operation();
          resolve(result);
          return result;
        } catch (err) {
          reject(err);
          throw err;
        }
      });
      
      this.runNext();
    });
  }
  
  private async runNext(): Promise<void> {
    if (this.running) {
      return;
    }
    
    this.running = true;
    
    try {
      while (this.queue.length > 0) {
        const operation = this.queue.shift();
        if (operation) {
          await operation();
        }
      }
    } finally {
      this.running = false;
    }
  }
}
```

### Observer Pattern

The PluginManager uses a callback-based observer pattern to notify interested components when the plugin list changes:

1. The constructor takes an `onUpdate` callback
2. This callback is invoked after any operation that changes the plugin list
3. Components like `ClineProvider` can pass a callback to refresh the UI

### Factory Pattern

Different plugin execution strategies are encapsulated in separate methods, acting as factories for plugin processes:

1. `executeRemotePlugin` for NPX-based plugins
2. `executeLocalPlugin` for Node-based plugins

This pattern allows for future expansion with different execution strategies.

## Error Handling

The design includes comprehensive error handling:

1. **Schema Validation:** All inputs are validated against the schema
2. **File Operations:** All file operations are wrapped in try/catch
3. **Process Execution:** Process errors and non-zero exit codes are captured
4. **Logging:** Detailed error logs with stack traces
5. **User Feedback:** Important errors are surfaced to the user via `showErrorMessage`

## Integration with Extension Context

The PluginManager integrates with the VS Code extension context:

1. Stores plugin list in `globalState` for persistence
2. Uses `OutputChannel` for logging
3. Uses `FileSystemWatcher` for manifest changes
4. Handles workspace paths and file access