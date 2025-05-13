# Phase 3: Extension Integration - Webview Message Handler

## Overview

The webview message handler is a critical component that processes messages from the UI and calls the appropriate Plugin Manager methods. This document outlines how to extend the existing message handler to support plugin-related operations.

## Goals

1. Process plugin-related messages from the webview UI
2. Call appropriate Plugin Manager methods
3. Send responses and updates back to the UI
4. Handle errors gracefully

## Implementation Details

### File: `src/core/webview/webviewMessageHandler.ts`

We'll extend the existing message handler to process plugin-related messages:

```typescript
// In webviewMessageHandler.ts

import * as vscode from 'vscode';
import { WebviewMessage } from '../../shared/WebviewMessage';
import { ClineProvider } from './ClineProvider';

export async function webviewMessageHandler(
  message: WebviewMessage,
  provider: ClineProvider
): Promise<void> {
  try {
    switch (message.type) {
      // Existing message handlers...
      
      // Plugin-related message handlers
      case 'plugin-add':
        await handlePluginAdd(message, provider);
        break;
        
      case 'plugin-remove':
        await handlePluginRemove(message, provider);
        break;
        
      case 'plugin-toggle':
        await handlePluginToggle(message, provider);
        break;
        
      case 'plugin-update':
        await handlePluginUpdate(message, provider);
        break;
        
      case 'plugin-run':
        await handlePluginRun(message, provider);
        break;
        
      // Other message handlers...
    }
  } catch (error) {
    vscode.window.showErrorMessage(
      `Error handling message: ${error.message}`
    );
    console.error('Error handling message:', error);
  }
}

// Handle adding a new plugin
async function handlePluginAdd(
  message: Extract<WebviewMessage, { type: 'plugin-add' }>,
  provider: ClineProvider
): Promise<void> {
  try {
    const plugin = message.plugin;
    
    // Ensure enabled is set (default to true if not specified)
    if (plugin.enabled === undefined) {
      plugin.enabled = true;
    }
    
    // Add plugin to manager
    await provider.pluginManager.addPlugin(plugin);
    
    // Show success message
    vscode.window.showInformationMessage(
      `Plugin '${plugin.name}' added successfully.`
    );
    
    // If plugin is local, create file if it doesn't exist
    if (plugin.location === 'local' && plugin.path) {
      // File creation is handled in the PluginManager.addPlugin method
    }
  } catch (error) {
    vscode.window.showErrorMessage(
      `Failed to add plugin: ${error.message}`
    );
    throw error;
  }
}

// Handle removing a plugin
async function handlePluginRemove(
  message: Extract<WebviewMessage, { type: 'plugin-remove' }>,
  provider: ClineProvider
): Promise<void> {
  try {
    const { slug } = message;
    
    // Get plugin name for the success message
    const plugins = provider.pluginManager.getPlugins();
    const plugin = plugins.find(p => p.slug === slug);
    
    if (!plugin) {
      throw new Error(`Plugin with slug '${slug}' not found.`);
    }
    
    // Remove plugin
    await provider.pluginManager.removePlugin(slug);
    
    // Show success message
    vscode.window.showInformationMessage(
      `Plugin '${plugin.name}' removed successfully.`
    );
  } catch (error) {
    vscode.window.showErrorMessage(
      `Failed to remove plugin: ${error.message}`
    );
    throw error;
  }
}

// Handle toggling a plugin's enabled state
async function handlePluginToggle(
  message: Extract<WebviewMessage, { type: 'plugin-toggle' }>,
  provider: ClineProvider
): Promise<void> {
  try {
    const { slug, enabled } = message;
    
    // Toggle plugin
    await provider.pluginManager.togglePlugin(slug, enabled);
    
    // Get plugin for success message
    const plugins = provider.pluginManager.getPlugins();
    const plugin = plugins.find(p => p.slug === slug);
    
    if (plugin) {
      // Show success message
      vscode.window.showInformationMessage(
        `Plugin '${plugin.name}' ${enabled ? 'enabled' : 'disabled'}.`
      );
    }
  } catch (error) {
    vscode.window.showErrorMessage(
      `Failed to ${message.enabled ? 'enable' : 'disable'} plugin: ${error.message}`
    );
    throw error;
  }
}

// Handle updating a plugin
async function handlePluginUpdate(
  message: Extract<WebviewMessage, { type: 'plugin-update' }>,
  provider: ClineProvider
): Promise<void> {
  try {
    const { slug, updates } = message;
    
    // Update plugin
    await provider.pluginManager.updatePlugin(slug, updates);
    
    // Get updated plugin for success message
    const plugins = provider.pluginManager.getPlugins();
    const plugin = plugins.find(p => p.slug === updates.slug || p.slug === slug);
    
    if (plugin) {
      // Show success message
      vscode.window.showInformationMessage(
        `Plugin '${plugin.name}' updated successfully.`
      );
    }
  } catch (error) {
    vscode.window.showErrorMessage(
      `Failed to update plugin: ${error.message}`
    );
    throw error;
  }
}

// Handle running a plugin
async function handlePluginRun(
  message: Extract<WebviewMessage, { type: 'plugin-run' }>,
  provider: ClineProvider
): Promise<void> {
  try {
    const { slug, input } = message;
    
    // Get plugin for success message
    const plugins = provider.pluginManager.getPlugins();
    const plugin = plugins.find(p => p.slug === slug);
    
    if (!plugin) {
      throw new Error(`Plugin with slug '${slug}' not found.`);
    }
    
    // Show executing message
    vscode.window.setStatusBarMessage(
      `Executing plugin '${plugin.name}'...`,
      3000
    );
    
    // Execute plugin
    const output = await provider.pluginManager.executePlugin(slug, input);
    
    // Send result back to webview
    provider.postMessageToWebview({
      type: 'pluginResult',
      slug,
      output,
      error: false
    });
  } catch (error) {
    // Send error to webview
    provider.postMessageToWebview({
      type: 'pluginResult',
      slug: message.slug,
      output: `Error: ${error.message}`,
      error: true
    });
    
    vscode.window.showErrorMessage(
      `Failed to execute plugin: ${error.message}`
    );
  }
}
```

## Message Types

These message handlers process the following message types from the UI:

1. **`plugin-add`**: Add a new plugin to the system
2. **`plugin-remove`**: Remove an existing plugin
3. **`plugin-toggle`**: Enable or disable a plugin
4. **`plugin-update`**: Update a plugin's properties
5. **`plugin-run`**: Execute a plugin and return results

## Updates to WebviewMessage.ts

We need to extend the `WebviewMessage` type in `src/shared/WebviewMessage.ts` to include these new message types:

```typescript
// In WebviewMessage.ts

export type WebviewMessage =
  // Existing message types...
  
  // Plugin message types
  | { type: 'plugin-add'; plugin: Omit<RooPluginEntry, 'enabled'> & { enabled?: boolean } }
  | { type: 'plugin-remove'; slug: string }
  | { type: 'plugin-toggle'; slug: string; enabled: boolean }
  | { type: 'plugin-update'; slug: string; updates: Partial<RooPluginEntry> }
  | { type: 'plugin-run'; slug: string; input?: string };
```

## Updates to ExtensionMessage.ts

We also need to extend the `ExtensionMessage` type in `src/shared/ExtensionMessage.ts` to include the plugin result message:

```typescript
// In ExtensionMessage.ts

export type ExtensionMessage =
  // Existing message types...
  
  // Plugin message types
  | { type: 'pluginResult'; slug: string; output: string; error: boolean };
```

And update the `ExtensionState` interface to include plugins:

```typescript
// In ExtensionMessage.ts

export interface ExtensionState {
  // Existing state properties...
  
  // Add plugins to state
  plugins: RooPluginEntry[];
}
```

## Error Handling Strategy

The message handler implements a robust error handling strategy:

1. **Top-level try/catch**: Catches all errors in the message handler
2. **Function-specific try/catch**: Each handler function has its own error handling
3. **User notification**: Shows error messages via VS Code notifications
4. **Detailed logging**: Logs detailed errors to the console
5. **Error propagation**: Sends error results back to the webview when appropriate

## Testing Strategy

To test the message handler, we should:

1. **Unit Tests**:
   - Mock `ClineProvider` and `PluginManager`
   - Test each handler function with valid and invalid inputs
   - Verify correct method calls on the plugin manager
   - Check error handling behavior

2. **Integration Tests**:
   - Test full message flow from webview to handler to plugin manager
   - Verify state updates and UI notifications
   - Test error conditions and recovery

Example test for `handlePluginAdd`:

```typescript
// In __tests__/webviewMessageHandler.test.ts

describe('handlePluginAdd', () => {
  let mockProvider: jest.Mocked<ClineProvider>;
  
  beforeEach(() => {
    // Mock ClineProvider and PluginManager
    mockProvider = {
      pluginManager: {
        addPlugin: jest.fn(),
        getPlugins: jest.fn().mockReturnValue([]),
      },
    } as unknown as jest.Mocked<ClineProvider>;
  });
  
  it('should add a valid plugin', async () => {
    const message = {
      type: 'plugin-add',
      plugin: {
        slug: 'test-plugin',
        name: 'Test Plugin',
        location: 'remote',
        package: '@roo/test',
      }
    };
    
    await handlePluginAdd(message, mockProvider);
    
    // Verify plugin manager was called with correct parameters
    expect(mockProvider.pluginManager.addPlugin).toHaveBeenCalledWith({
      ...message.plugin,
      enabled: true,
    });
  });
  
  it('should handle errors when adding a plugin', async () => {
    const message = {
      type: 'plugin-add',
      plugin: {
        slug: 'test-plugin',
        name: 'Test Plugin',
        location: 'remote',
        package: '@roo/test',
      }
    };
    
    // Mock error in plugin manager
    mockProvider.pluginManager.addPlugin.mockRejectedValue(
      new Error('Test error')
    );
    
    // Expect error to be thrown
    await expect(handlePluginAdd(message, mockProvider))
      .rejects.toThrow('Test error');
  });
});
```

## Integration with ClineProvider

The message handler relies on the `ClineProvider` instance, which must be updated to include the `PluginManager`. This integration happens in the `ClineProvider` class:

```typescript
// In ClineProvider.ts

export class ClineProvider implements vscode.Disposable {
  // Existing properties
  
  // Add plugin manager
  public pluginManager: PluginManager;
  
  constructor(/* existing parameters */) {
    // Existing initialization
    
    // Initialize plugin manager
    this.pluginManager = new PluginManager(this.context, async () => {
      await this.postStateToWebview();
    });
  }
  
  // Update getState method to include plugins
  public async getState(): Promise<ExtensionState> {
    // Get plugins
    const plugins = this.pluginManager.getPlugins();
    
    // Return state with plugins
    return {
      // Existing state
      plugins,
    };
  }
  
  // Other methods...
}
```

## Command Registration

In addition to the message handler, we should register VS Code commands for plugin operations. This happens in `src/extension.ts`:

```typescript
// In extension.ts

// Register plugin commands
context.subscriptions.push(
  vscode.commands.registerCommand('roo-scheduler.reloadPlugins', async () => {
    if (provider) {
      await provider.pluginManager.loadPlugins();
      await provider.postStateToWebview();
      vscode.window.showInformationMessage('Plugins reloaded.');
    }
  }),
  
  vscode.commands.registerCommand('roo-scheduler.openPluginsManifest', async () => {
    if (provider) {
      const manifestPath = provider.pluginManager.getPluginsFilePath();
      try {
        const doc = await vscode.workspace.openTextDocument(manifestPath);
        await vscode.window.showTextDocument(doc);
      } catch (error) {
        vscode.window.showErrorMessage(
          `Failed to open plugins manifest: ${error.message}`
        );
      }
    }
  })
);
```

## Conclusion

By extending the webview message handler and related components, we enable seamless communication between the UI and the plugin manager. This creates a consistent user experience where changes made in the UI are immediately reflected in the plugin system.