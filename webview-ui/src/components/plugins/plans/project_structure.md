# Roo Code Plugin System - Project Structure

## Overview

The Roo Code Plugin System is designed to extend the VSCode extension with the ability to manage and execute both local and remote (NPX-based) plugins. This document outlines the high-level project structure, components, and file organization.

## Key Components

### Backend (Extension)

1. **Plugin Manager** - Core controller for plugin operations
2. **Plugin Schema** - Validation rules for plugin entries
3. **Message Handler** - Processes messages from the webview UI
4. **Command Registration** - Registers VS Code commands for plugin actions
5. **Execution Engine** - Runs plugins in separate processes

### Frontend (Webview UI)

1. **Plugin Settings** - Main UI container for plugin management
2. **Installed Plugins** - Displays and manages the list of plugins
3. **Plugin Wizard** - Form for creating and editing plugins
4. **Plugin Execution** - Displays results from plugin execution
5. **Extension State Integration** - Connects UI to extension state

## File Structure

```
src/
├── core/
│   ├── config/
│   │   ├── PluginManager.ts             # Core manager implementation
│   │   ├── PluginsSchema.ts             # Validation schema definition
│   │   └── __tests__/
│   │       └── PluginManager.test.ts    # Unit tests
│   └── webview/
│       ├── ClineProvider.ts             # Updated to include plugin manager
│       └── webviewMessageHandler.ts     # Updated to handle plugin messages
│
├── shared/
│   ├── plugins.ts                       # Shared plugin interfaces
│   ├── ExtensionMessage.ts              # Updated with plugin messages
│   └── WebviewMessage.ts                # Updated with plugin messages
│
├── schemas/
│   └── rooplugins-schema.json           # JSON Schema for manifest validation
│
└── extension.ts                         # Updated to register plugin commands

webview-ui/
├── src/
│   ├── components/
│   │   ├── plugins/                     # New plugin UI components
│   │   │   ├── InstalledPlugins.tsx     # List of installed plugins
│   │   │   ├── PluginDetails.tsx        # Plugin detail display
│   │   │   ├── PluginExecution.tsx      # Plugin execution results
│   │   │   ├── PluginListItem.tsx       # Individual plugin list item
│   │   │   ├── PluginSettings.tsx       # Plugin settings container
│   │   │   ├── PluginWizard.tsx         # Form for adding/editing plugins
│   │   │   └── SectionHeader.tsx        # Header component
│   │   │
│   │   └── settings/
│   │       └── SettingsView.tsx         # Updated to include PluginSettings
│   │
│   ├── context/
│   │   └── ExtensionStateContext.tsx    # Updated to handle plugin state
│   │
│   ├── i18n/
│   │   └── locales/
│   │       └── en/
│   │           └── settings.json        # Updated with plugin translations
│   │
│   └── utils/
│       └── vscode.ts                    # Utilities for VS Code messaging
```

## Development Phases

The implementation is divided into distinct phases:

### Phase 1: Core Schema & Interface Design
- Define shared interfaces and types
- Create the plugin manifest schema
- Set up extension message types

### Phase 2: Plugin Manager Implementation
- Build the PluginManager class
- Implement plugin CRUD operations
- Create file watcher for real-time updates
- Develop plugin execution logic

### Phase 3: Extension Integration
- Update ClineProvider to initialize PluginManager
- Register VSCode commands for plugin actions
- Extend webview message handler for plugin operations
- Create JSON schema for manifest validation

### Phase 4: UI Component Development
- Create plugin settings components
- Build plugin list and item rendering
- Develop plugin wizard form
- Implement execution results display
- Update ExtensionStateContext for plugin state

### Phase 5: Testing & Refinement
- Unit test plugin manager
- Test UI components with React Testing Library
- Integration test full plugin lifecycle
- Perform end-to-end testing

### Phase 6: Documentation & Examples
- Create Hello World example plugins
- Document plugin API
- Write user and developer guides
- Create tutorials for plugin development

## Data Flow Patterns

The plugin system follows these primary data flow patterns:

### 1. Plugin State Update
```
File Change → PluginManager.loadPlugins() → ClineProvider.onUpdate() → 
postStateToWebview() → UI State Update → Components Re-render
```

### 2. UI Action Flow
```
User Action → UI Component Event → vscode.postMessage() → 
Extension Message Handler → PluginManager Method → File Update → 
File Watcher Event → State Update (as above)
```

### 3. Plugin Execution Flow
```
Run Button Click → vscode.postMessage() → Extension Handler → 
PluginManager.executePlugin() → Child Process Execution → 
Output Capture → postMessage() → UI Update
```

## Key Interfaces

### RooPluginEntry
```typescript
interface RooPluginEntry {
  slug: string;               // Unique identifier
  name: string;               // Human-friendly name
  roleDefinition?: string;    // Plugin purpose description
  groups?: string[];          // Capability groups
  customInstructions?: string; // Additional instructions
  location: 'local' | 'remote'; // Plugin type
  package?: string;           // NPM package (for remote)
  path?: string;              // File path (for local)
  enabled: boolean;           // Enabled status
}
```

### Plugin Messages
```typescript
// From UI to Extension
type PluginUIMessage = 
  | { type: 'plugin-add'; plugin: Omit<RooPluginEntry, 'enabled'> & { enabled?: boolean } }
  | { type: 'plugin-remove'; slug: string }
  | { type: 'plugin-toggle'; slug: string; enabled: boolean }
  | { type: 'plugin-update'; slug: string; updates: Partial<RooPluginEntry> }
  | { type: 'plugin-run'; slug: string; input?: string };

// From Extension to UI
type PluginExtensionMessage =
  | { type: 'state'; state: { plugins: RooPluginEntry[] } }
  | { type: 'pluginResult'; slug: string; output: string; error?: boolean };
```

## Integration Points

The plugin system integrates with existing Roo Code components at these key points:

1. **ClineProvider** - Initializes the Plugin Manager
2. **ExtensionStateContext** - Maintains plugin state in UI
3. **Settings View** - Hosts the plugin management UI
4. **Command Registry** - Provides plugin-related commands
5. **Message System** - Carries plugin messages between UI and extension

## Manifest Format

The `.rooplugins` file uses this JSON structure:

```json
{
  "plugins": [
    {
      "slug": "hello-world",
      "name": "Hello World Plugin",
      "roleDefinition": "A simple plugin that greets the world",
      "groups": ["command"],
      "customInstructions": "Use this plugin to print a greeting",
      "location": "local",
      "path": ".roo/plugins/hello-world.js",
      "enabled": true
    },
    {
      "slug": "remote-example",
      "name": "Remote Example",
      "roleDefinition": "An example remote plugin",
      "groups": ["command", "read"],
      "customInstructions": "This plugin runs via NPX",
      "location": "remote",
      "package": "@roo/example-plugin",
      "enabled": true
    }
  ]
}
```

## Implementation Priorities

1. **Core Functionality** - Ensure basic plugin management works reliably
2. **User Experience** - Create an intuitive and responsive UI
3. **Error Handling** - Provide clear feedback for error conditions
4. **Documentation** - Make it easy to create and use plugins
5. **Performance** - Minimize impact on the extension's performance
6. **Extensibility** - Design for future enhancements

## Conclusion

This project structure provides a comprehensive framework for implementing the Roo Code Plugin System. By following a modular approach with clear separation of concerns, the system will be maintainable, extensible, and user-friendly.