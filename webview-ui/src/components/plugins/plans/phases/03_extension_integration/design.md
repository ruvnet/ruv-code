# Phase 3: Extension Integration - Design

## Integration Architecture

This phase focuses on integrating the `PluginManager` created in Phase 2 into the main VS Code extension architecture. The integration will follow the established patterns in the Roo Code extension, particularly the way it handles custom modes and other extension features.

## ClineProvider Integration

The `ClineProvider` class in `src/core/webview/ClineProvider.ts` serves as the main integration point between the extension backend and the webview UI. We'll update it to include the plugin manager:

```typescript
export class ClineProvider implements vscode.Disposable {
  // Existing properties
  private context: vscode.ExtensionContext;
  private customModesManager: CustomModesManager;
  
  // New plugin manager property
  public pluginManager: PluginManager;
  
  constructor(context: vscode.ExtensionContext) {
    this.context = context;
    
    // Initialize plugin manager with callback for state updates
    this.pluginManager = new PluginManager(context, async () => {
      // When plugins change, update the webview state
      await this.postStateToWebview();
    });
    
    // Other initialization...
    this.customModesManager = new CustomModesManager(context, async () => {
      await this.postStateToWebview();
    });
    
    // Continue with existing initialization...
  }
  
  // Update dispose method to clean up plugin manager
  dispose() {
    // Existing cleanup
    this.customModesManager.dispose();
    
    // Add plugin manager cleanup
    this.pluginManager.dispose();
    
    // Other dispose operations...
    this.logger.dispose();
    this.disposables.forEach(d => d.dispose());
  }
  
  // Update the state getter to include plugins
  getStateToPostToWebview() {
    const plugins = this.pluginManager.getPlugins();
    
    return {
      // Existing state properties
      ...this.getState(),
      
      // Add plugins to state
      plugins,
    };
  }
}
```

## Extension State Updates

The extension state is shared with the webview through the `ExtensionState` interface in `src/shared/ExtensionMessage.ts`. We'll update this interface to include plugin data:

```typescript
// In src/shared/ExtensionMessage.ts

import { RooPluginEntry } from './plugins'; // Import shared plugin types

export interface ExtensionState {
  // Existing properties
  customModes: ModeConfig[];
  mcpServers?: Record<string, McpServer>;
  // ...
  
  // Add plugins array
  plugins: RooPluginEntry[];
}

export type ExtensionMessage =
  | { type: "state"; state: ExtensionState }
  | { type: "pluginResult"; slug: string; output: string }
  | // Existing message types
    { type: "apiRequestCompleted"; requestId: string; /* ... */ };
```

## Webview Message Handling

To handle plugin-related messages from the webview, we'll update the webview message handler in `src/core/webview/webviewMessageHandler.ts`:

```typescript
// In src/core/webview/webviewMessageHandler.ts

export async function webviewMessageHandler(
  message: WebviewMessage,
  provider: ClineProvider
) {
  try {
    switch (message.type) {
      // Existing message handlers...
      
      // Plugin-related message handlers
      case "plugin-add": {
        const { plugin } = message;
        await provider.pluginManager.addPlugin(plugin);
        break;
      }
      
      case "plugin-remove": {
        const { slug } = message;
        await provider.pluginManager.removePlugin(slug);
        break;
      }
      
      case "plugin-toggle": {
        const { slug, enabled } = message;
        await provider.pluginManager.togglePlugin(slug, enabled);
        break;
      }
      
      case "plugin-update": {
        const { slug, updates } = message;
        await provider.pluginManager.updatePlugin(slug, updates);
        break;
      }
      
      case "plugin-run": {
        const { slug, input } = message;
        try {
          const output = await provider.pluginManager.executePlugin(slug, input);
          
          // Send result back to webview
          provider.postMessageToWebview({
            type: "pluginResult",
            slug,
            output
          });
        } catch (err) {
          // Handle execution error
          const errorMessage = err instanceof Error ? err.message : String(err);
          vscode.window.showErrorMessage(`Plugin execution failed: ${errorMessage}`);
          
          // Send error to webview
          provider.postMessageToWebview({
            type: "pluginResult",
            slug,
            output: `Error: ${errorMessage}`,
            error: true
          });
        }
        break;
      }
      
      // Continue with other message types...
    }
  } catch (err) {
    // Error handling...
  }
}
```

## Webview Message Types

To support the new message types, we'll update the `WebviewMessage` type in `src/shared/WebviewMessage.ts`:

```typescript
// In src/shared/WebviewMessage.ts

import { RooPluginEntry } from './plugins';

export type WebviewMessage =
  | // Existing message types
    { type: "custom-mode-add"; /* ... */ }
  
  // Plugin-related message types
  | { type: "plugin-add"; plugin: Omit<RooPluginEntry, "enabled"> & { enabled?: boolean } }
  | { type: "plugin-remove"; slug: string }
  | { type: "plugin-toggle"; slug: string; enabled: boolean }
  | { type: "plugin-update"; slug: string; updates: Partial<RooPluginEntry> }
  | { type: "plugin-run"; slug: string; input?: string };
```

## Command Registration

We'll register VS Code commands for plugin operations in `src/extension.ts`:

```typescript
// In src/extension.ts (or a dedicated registerPluginCommands.ts file)

function registerPluginCommands(
  context: vscode.ExtensionContext,
  provider: ClineProvider
) {
  // Command to reload plugins
  context.subscriptions.push(
    vscode.commands.registerCommand('roo-scheduler.reloadPlugins', async () => {
      await provider.pluginManager.loadPlugins();
      vscode.window.showInformationMessage('Plugins reloaded');
    })
  );
  
  // Command to open plugins manifest file
  context.subscriptions.push(
    vscode.commands.registerCommand('roo-scheduler.openPluginsManifest', async () => {
      const filePath = provider.pluginManager.getPluginsFilePath();
      if (!filePath) {
        vscode.window.showErrorMessage('No workspace folder open');
        return;
      }
      
      const uri = vscode.Uri.file(filePath);
      try {
        // Try to access file
        await vscode.workspace.fs.stat(uri);
      } catch {
        // File doesn't exist, create default
        await provider.pluginManager.createDefaultManifest();
      }
      
      // Open the file
      const doc = await vscode.workspace.openTextDocument(uri);
      await vscode.window.showTextDocument(doc);
    })
  );
  
  // Command to run a plugin (with quick pick selection)
  context.subscriptions.push(
    vscode.commands.registerCommand('roo-scheduler.runPlugin', async () => {
      const plugins = provider.pluginManager.getPlugins().filter(p => p.enabled);
      
      if (plugins.length === 0) {
        vscode.window.showInformationMessage('No enabled plugins found');
        return;
      }
      
      // Show quick pick to select plugin
      const selected = await vscode.window.showQuickPick(
        plugins.map(p => ({ label: p.name, description: p.slug })),
        { placeHolder: 'Select a plugin to run' }
      );
      
      if (!selected) {
        return; // User cancelled
      }
      
      try {
        // Optional: Ask for input
        const input = await vscode.window.showInputBox({
          prompt: `Input for plugin ${selected.label} (optional)`,
          placeHolder: 'Leave empty for no input'
        });
        
        // Run plugin
        const output = await provider.pluginManager.executePlugin(
          selected.description,
          input || undefined
        );
        
        // Show output
        const outputChannel = vscode.window.createOutputChannel(`Plugin: ${selected.label}`);
        outputChannel.appendLine(output);
        outputChannel.show();
      } catch (err) {
        vscode.window.showErrorMessage(
          `Failed to run plugin ${selected.label}: ${err instanceof Error ? err.message : String(err)}`
        );
      }
    })
  );
}
```

## JSON Schema Registration

We'll add a JSON schema for the `.rooplugins` file to provide IntelliSense when editing the file. This requires:

1. Creating a schema file
2. Registering it in `package.json`

```json
// In schemas/rooplugins-schema.json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "Roo Plugins Configuration",
  "description": "Configuration file for Roo Code plugins",
  "type": "object",
  "required": ["plugins"],
  "properties": {
    "plugins": {
      "type": "array",
      "description": "List of available plugins",
      "items": {
        "type": "object",
        "required": ["slug", "name", "location"],
        "properties": {
          "slug": {
            "type": "string",
            "description": "Unique identifier for the plugin (lowercase, hyphen-separated)",
            "pattern": "^[a-z0-9-]+$"
          },
          "name": {
            "type": "string",
            "description": "Human-friendly name for display in the UI"
          },
          "roleDefinition": {
            "type": "string",
            "description": "Description of the plugin's role or purpose, used for AI context"
          },
          "groups": {
            "type": "array",
            "description": "Categories or tool groups this plugin belongs to",
            "items": {
              "type": "string"
            },
            "examples": [["read"], ["command", "mcp"], ["edit", "browser"]]
          },
          "customInstructions": {
            "type": "string",
            "description": "Additional instructions or guidance for using this plugin"
          },
          "location": {
            "type": "string",
            "enum": ["local", "remote"],
            "description": "Source type: 'remote' for NPM packages, 'local' for workspace scripts"
          },
          "package": {
            "type": "string",
            "description": "NPM package name (required if location is 'remote')"
          },
          "path": {
            "type": "string",
            "description": "Local script path (required if location is 'local')"
          },
          "enabled": {
            "type": "boolean",
            "description": "Whether the plugin is active/enabled",
            "default": true
          }
        },
        "allOf": [
          {
            "if": {
              "properties": { "location": { "enum": ["remote"] } }
            },
            "then": {
              "required": ["package"],
              "not": { "required": ["path"] }
            }
          },
          {
            "if": {
              "properties": { "location": { "enum": ["local"] } }
            },
            "then": {
              "required": ["path"],
              "not": { "required": ["package"] }
            }
          }
        ]
      }
    }
  }
}
```

Then, register it in `package.json`:

```json
// In package.json
{
  "contributes": {
    "jsonValidation": [
      {
        "fileMatch": "**/.rooplugins",
        "url": "./schemas/rooplugins-schema.json"
      }
    ],
    "commands": [
      {
        "command": "roo-scheduler.reloadPlugins",
        "title": "Roo Code: Reload Plugins"
      },
      {
        "command": "roo-scheduler.openPluginsManifest",
        "title": "Roo Code: Open Plugins Manifest"
      },
      {
        "command": "roo-scheduler.runPlugin",
        "title": "Roo Code: Run Plugin"
      }
    ]
  },
  "activationEvents": [
    "onCommand:roo-scheduler.reloadPlugins",
    "onCommand:roo-scheduler.openPluginsManifest",
    "onCommand:roo-scheduler.runPlugin"
  ]
}
```

## Error Handling

The integration will include comprehensive error handling:

1. Each plugin-related message handler will have try/catch blocks
2. Errors will be logged to the output channel
3. User-facing errors will be shown via `vscode.window.showErrorMessage`
4. For plugin execution, errors will be captured and sent back to the webview

## Design Considerations

### Message Flow

The message flow follows this pattern:

1. User interacts with the UI (e.g., clicks "Add Plugin")
2. Webview sends a message (e.g., `{ type: "plugin-add", plugin: {...} }`)
3. Extension receives message and passes it to the message handler
4. Message handler calls appropriate `PluginManager` method
5. `PluginManager` performs the operation and updates the manifest
6. File watcher detects the change and triggers the callback
7. Callback calls `postStateToWebview()` to update the UI
8. UI receives the updated state and reflects the changes

This ensures a consistent flow where changes made via the UI or direct file edits are reflected in both places.

### Integration with Existing Code

The integration follows these principles:

1. **Consistent Patterns**: Uses the same patterns as the `CustomModesManager`
2. **Clear Responsibilities**: `PluginManager` handles plugin-specific logic; `ClineProvider` handles extension integration
3. **State Synchronization**: Uses the established state synchronization mechanism
4. **Message Types**: Follows the pattern of existing message types

### Error Feedback

Errors are handled at multiple levels:

1. **Validation**: Input is validated before operations
2. **Operation Errors**: Errors during operations are caught and handled
3. **UI Feedback**: Errors are shown to the user with clear messages
4. **Logging**: Detailed errors are logged to the output channel

## Integration Summary

The integration connects the `PluginManager` to the rest of the extension, ensuring:

1. Plugin state is included in the extension state sent to the webview
2. Webview messages for plugin operations are handled correctly
3. VS Code commands for plugin operations are registered
4. JSON schema provides IntelliSense for `.rooplugins` file
5. Error handling provides clear feedback to the user
6. The integration follows established architectural patterns