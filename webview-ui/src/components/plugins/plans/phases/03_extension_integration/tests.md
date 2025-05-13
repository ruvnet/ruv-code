# Phase 3: Extension Integration - Test Specification

## Test Plan

The test suite will validate the integration of the Plugin Manager with the rest of the VSCode extension, focusing on state management, message handling, and command registration. Tests will use Vitest/Jest with appropriate mocking of VS Code APIs, file system, and webview communication.

## Unit Tests

### ClineProvider Integration Tests

These tests validate that the `PluginManager` is correctly integrated into the `ClineProvider`:

```typescript
// TEST: Plugin manager is properly integrated into ClineProvider
describe('ClineProvider - Plugin Integration', () => {
  let provider: ClineProvider;
  let mockContext: any;
  
  beforeEach(() => {
    // Mock VS Code extension context
    mockContext = {
      globalState: {
        update: jest.fn().mockResolvedValue(undefined),
        get: jest.fn()
      },
      subscriptions: [],
      workspaceState: {
        update: jest.fn().mockResolvedValue(undefined),
        get: jest.fn()
      }
    };
    
    // Mock file system, etc. as needed
    
    // Create ClineProvider with mocked context
    provider = new ClineProvider(mockContext);
  });
  
  afterEach(() => {
    // Clean up
    provider.dispose();
  });
  
  it('should initialize the plugin manager on construction', () => {
    // Check that plugin manager is created
    expect(provider.pluginManager).toBeDefined();
    expect(provider.pluginManager).toBeInstanceOf(PluginManager);
  });
  
  it('should pass the update callback to plugin manager', async () => {
    // Mock postStateToWebview
    const postStateToWebviewSpy = jest.spyOn(provider, 'postStateToWebview')
      .mockResolvedValue();
    
    // Access the plugin manager's update callback (stored during construction)
    // and invoke it manually to simulate a plugin change
    const updateCallback = (provider.pluginManager as any).onUpdateCallback;
    expect(updateCallback).toBeDefined();
    await updateCallback();
    
    // Verify postStateToWebview was called
    expect(postStateToWebviewSpy).toHaveBeenCalled();
  });
  
  it('should dispose the plugin manager when disposed', () => {
    // Spy on plugin manager dispose
    const disposeSpy = jest.spyOn(provider.pluginManager, 'dispose');
    
    // Dispose the provider
    provider.dispose();
    
    // Verify plugin manager was disposed
    expect(disposeSpy).toHaveBeenCalled();
  });
  
  it('should include plugins in state sent to webview', async () => {
    // Setup test plugins
    const testPlugins = [
      {
        slug: 'test-plugin',
        name: 'Test Plugin',
        location: 'remote' as const,
        package: '@roo/test',
        enabled: true
      }
    ];
    
    // Mock getPlugins method to return test plugins
    jest.spyOn(provider.pluginManager, 'getPlugins')
      .mockReturnValue(testPlugins);
    
    // Get state to post to webview
    const state = provider.getStateToPostToWebview();
    
    // Verify plugins are included in state
    expect(state).toHaveProperty('plugins');
    expect(state.plugins).toEqual(testPlugins);
  });
});
```

### Message Handling Tests

These tests validate that plugin-related messages from the webview are handled correctly:

```typescript
// TEST: Plugin messages are handled correctly
describe('WebviewMessageHandler - Plugin Messages', () => {
  let provider: ClineProvider;
  let mockContext: any;
  
  beforeEach(() => {
    // Mock setup similar to previous tests
    provider = new ClineProvider(mockContext);
  });
  
  it('should handle plugin-add message', async () => {
    // Spy on plugin manager's addPlugin method
    const addPluginSpy = jest.spyOn(provider.pluginManager, 'addPlugin')
      .mockResolvedValue();
    
    // Create a plugin-add message
    const message = {
      type: 'plugin-add',
      plugin: {
        slug: 'test-plugin',
        name: 'Test Plugin',
        location: 'remote',
        package: '@roo/test'
      }
    } as WebviewMessage;
    
    // Handle the message
    await webviewMessageHandler(message, provider);
    
    // Verify addPlugin was called with correct args
    expect(addPluginSpy).toHaveBeenCalledWith(message.plugin);
  });
  
  it('should handle plugin-remove message', async () => {
    // Spy on plugin manager's removePlugin method
    const removePluginSpy = jest.spyOn(provider.pluginManager, 'removePlugin')
      .mockResolvedValue();
    
    // Create a plugin-remove message
    const message = {
      type: 'plugin-remove',
      slug: 'test-plugin'
    } as WebviewMessage;
    
    // Handle the message
    await webviewMessageHandler(message, provider);
    
    // Verify removePlugin was called with correct args
    expect(removePluginSpy).toHaveBeenCalledWith('test-plugin');
  });
  
  it('should handle plugin-toggle message', async () => {
    // Spy on plugin manager's togglePlugin method
    const togglePluginSpy = jest.spyOn(provider.pluginManager, 'togglePlugin')
      .mockResolvedValue();
    
    // Create a plugin-toggle message
    const message = {
      type: 'plugin-toggle',
      slug: 'test-plugin',
      enabled: false
    } as WebviewMessage;
    
    // Handle the message
    await webviewMessageHandler(message, provider);
    
    // Verify togglePlugin was called with correct args
    expect(togglePluginSpy).toHaveBeenCalledWith('test-plugin', false);
  });
  
  it('should handle plugin-update message', async () => {
    // Spy on plugin manager's updatePlugin method
    const updatePluginSpy = jest.spyOn(provider.pluginManager, 'updatePlugin')
      .mockResolvedValue();
    
    // Create a plugin-update message
    const message = {
      type: 'plugin-update',
      slug: 'test-plugin',
      updates: { name: 'Updated Name' }
    } as WebviewMessage;
    
    // Handle the message
    await webviewMessageHandler(message, provider);
    
    // Verify updatePlugin was called with correct args
    expect(updatePluginSpy).toHaveBeenCalledWith('test-plugin', { name: 'Updated Name' });
  });
  
  it('should handle plugin-run message and send result back', async () => {
    // Spy on plugin manager's executePlugin method
    const executePluginSpy = jest.spyOn(provider.pluginManager, 'executePlugin')
      .mockResolvedValue('Plugin output');
    
    // Spy on postMessageToWebview
    const postMessageSpy = jest.spyOn(provider, 'postMessageToWebview')
      .mockImplementation();
    
    // Create a plugin-run message
    const message = {
      type: 'plugin-run',
      slug: 'test-plugin',
      input: 'Test input'
    } as WebviewMessage;
    
    // Handle the message
    await webviewMessageHandler(message, provider);
    
    // Verify executePlugin was called with correct args
    expect(executePluginSpy).toHaveBeenCalledWith('test-plugin', 'Test input');
    
    // Verify result was sent back to webview
    expect(postMessageSpy).toHaveBeenCalledWith({
      type: 'pluginResult',
      slug: 'test-plugin',
      output: 'Plugin output'
    });
  });
  
  it('should handle execution errors in plugin-run message', async () => {
    // Spy on plugin manager's executePlugin method to throw an error
    const executePluginSpy = jest.spyOn(provider.pluginManager, 'executePlugin')
      .mockRejectedValue(new Error('Execution failed'));
    
    // Spy on postMessageToWebview
    const postMessageSpy = jest.spyOn(provider, 'postMessageToWebview')
      .mockImplementation();
    
    // Mock vscode.window.showErrorMessage
    const showErrorSpy = jest.spyOn(vscode.window, 'showErrorMessage')
      .mockImplementation();
    
    // Create a plugin-run message
    const message = {
      type: 'plugin-run',
      slug: 'test-plugin'
    } as WebviewMessage;
    
    // Handle the message
    await webviewMessageHandler(message, provider);
    
    // Verify executePlugin was called
    expect(executePluginSpy).toHaveBeenCalled();
    
    // Verify error was shown
    expect(showErrorSpy).toHaveBeenCalledWith(expect.stringContaining('Execution failed'));
    
    // Verify error was sent back to webview
    expect(postMessageSpy).toHaveBeenCalledWith(expect.objectContaining({
      type: 'pluginResult',
      slug: 'test-plugin',
      output: expect.stringContaining('Error'),
      error: true
    }));
  });
});
```

### Command Registration Tests

These tests validate that VS Code commands for plugin operations are registered and work correctly:

```typescript
// TEST: VS Code commands are registered and working
describe('Plugin Commands', () => {
  let provider: ClineProvider;
  let mockContext: any;
  let commandsMap: Map<string, (...args: any[]) => any>;
  
  beforeEach(() => {
    // Mock context and provider setup
    
    // Mock VS Code commands registration
    commandsMap = new Map();
    jest.spyOn(vscode.commands, 'registerCommand')
      .mockImplementation((id, callback) => {
        commandsMap.set(id, callback);
        return { dispose: jest.fn() };
      });
    
    // Register commands (this would normally happen in extension.ts)
    registerPluginCommands(mockContext, provider);
  });
  
  it('should register the reload plugins command', () => {
    expect(commandsMap.has('roo-scheduler.reloadPlugins')).toBe(true);
  });
  
  it('should register the open plugins manifest command', () => {
    expect(commandsMap.has('roo-scheduler.openPluginsManifest')).toBe(true);
  });
  
  it('should register the run plugin command', () => {
    expect(commandsMap.has('roo-scheduler.runPlugin')).toBe(true);
  });
  
  it('should reload plugins when reload command is executed', async () => {
    // Spy on plugin manager's loadPlugins method
    const loadPluginsSpy = jest.spyOn(provider.pluginManager, 'loadPlugins')
      .mockResolvedValue([]);
    
    // Mock showInformationMessage
    const showInfoSpy = jest.spyOn(vscode.window, 'showInformationMessage')
      .mockImplementation();
    
    // Execute the reload command
    const callback = commandsMap.get('roo-scheduler.reloadPlugins');
    await callback();
    
    // Verify loadPlugins was called
    expect(loadPluginsSpy).toHaveBeenCalled();
    
    // Verify information message was shown
    expect(showInfoSpy).toHaveBeenCalledWith('Plugins reloaded');
  });
  
  it('should open manifest file when open command is executed', async () => {
    // Mock getPluginsFilePath to return a test path
    jest.spyOn(provider.pluginManager, 'getPluginsFilePath')
      .mockReturnValue('/test/path/.rooplugins');
    
    // Mock createDefaultManifest
    const createDefaultSpy = jest.spyOn(provider.pluginManager, 'createDefaultManifest')
      .mockResolvedValue();
    
    // Mock vscode.workspace.fs.stat to simulate file exists
    jest.spyOn(vscode.workspace.fs, 'stat')
      .mockResolvedValue({ type: vscode.FileType.File } as vscode.FileStat);
    
    // Mock openTextDocument and showTextDocument
    const openTextDocSpy = jest.spyOn(vscode.workspace, 'openTextDocument')
      .mockResolvedValue({} as vscode.TextDocument);
    const showTextDocSpy = jest.spyOn(vscode.window, 'showTextDocument')
      .mockResolvedValue({} as vscode.TextEditor);
    
    // Execute the open manifest command
    const callback = commandsMap.get('roo-scheduler.openPluginsManifest');
    await callback();
    
    // Verify document was opened and shown
    expect(openTextDocSpy).toHaveBeenCalledWith(expect.anything());
    expect(showTextDocSpy).toHaveBeenCalled();
  });
  
  it('should create default manifest if file does not exist', async () => {
    // Mock getPluginsFilePath to return a test path
    jest.spyOn(provider.pluginManager, 'getPluginsFilePath')
      .mockReturnValue('/test/path/.rooplugins');
    
    // Mock createDefaultManifest
    const createDefaultSpy = jest.spyOn(provider.pluginManager, 'createDefaultManifest')
      .mockResolvedValue();
    
    // Mock vscode.workspace.fs.stat to simulate file does not exist
    jest.spyOn(vscode.workspace.fs, 'stat')
      .mockRejectedValue(new Error('File not found'));
    
    // Mock openTextDocument and showTextDocument
    jest.spyOn(vscode.workspace, 'openTextDocument')
      .mockResolvedValue({} as vscode.TextDocument);
    jest.spyOn(vscode.window, 'showTextDocument')
      .mockResolvedValue({} as vscode.TextEditor);
    
    // Execute the open manifest command
    const callback = commandsMap.get('roo-scheduler.openPluginsManifest');
    await callback();
    
    // Verify default manifest was created
    expect(createDefaultSpy).toHaveBeenCalled();
  });
  
  it('should show quick pick when run plugin command is executed', async () => {
    // Mock getPlugins to return test plugins
    const testPlugins = [
      {
        slug: 'test-plugin',
        name: 'Test Plugin',
        location: 'remote' as const,
        package: '@roo/test',
        enabled: true
      }
    ];
    jest.spyOn(provider.pluginManager, 'getPlugins')
      .mockReturnValue(testPlugins);
    
    // Mock showQuickPick to return a selection
    jest.spyOn(vscode.window, 'showQuickPick')
      .mockResolvedValue({ label: 'Test Plugin', description: 'test-plugin' });
    
    // Mock showInputBox to return input
    jest.spyOn(vscode.window, 'showInputBox')
      .mockResolvedValue('test input');
    
    // Mock executePlugin
    const executePluginSpy = jest.spyOn(provider.pluginManager, 'executePlugin')
      .mockResolvedValue('Plugin output');
    
    // Mock output channel
    const mockOutputChannel = {
      appendLine: jest.fn(),
      show: jest.fn()
    };
    jest.spyOn(vscode.window, 'createOutputChannel')
      .mockReturnValue(mockOutputChannel as any);
    
    // Execute the run plugin command
    const callback = commandsMap.get('roo-scheduler.runPlugin');
    await callback();
    
    // Verify executePlugin was called with correct args
    expect(executePluginSpy).toHaveBeenCalledWith('test-plugin', 'test input');
    
    // Verify output was shown
    expect(mockOutputChannel.appendLine).toHaveBeenCalledWith('Plugin output');
    expect(mockOutputChannel.show).toHaveBeenCalled();
  });
  
  it('should show message when no plugins are available', async () => {
    // Mock getPlugins to return empty array
    jest.spyOn(provider.pluginManager, 'getPlugins')
      .mockReturnValue([]);
    
    // Mock showInformationMessage
    const showInfoSpy = jest.spyOn(vscode.window, 'showInformationMessage')
      .mockImplementation();
    
    // Execute the run plugin command
    const callback = commandsMap.get('roo-scheduler.runPlugin');
    await callback();
    
    // Verify information message was shown
    expect(showInfoSpy).toHaveBeenCalledWith('No enabled plugins found');
  });
  
  it('should handle plugin execution errors', async () => {
    // Mock getPlugins to return test plugins
    const testPlugins = [
      {
        slug: 'test-plugin',
        name: 'Test Plugin',
        location: 'remote' as const,
        package: '@roo/test',
        enabled: true
      }
    ];
    jest.spyOn(provider.pluginManager, 'getPlugins')
      .mockReturnValue(testPlugins);
    
    // Mock showQuickPick to return a selection
    jest.spyOn(vscode.window, 'showQuickPick')
      .mockResolvedValue({ label: 'Test Plugin', description: 'test-plugin' });
    
    // Mock showInputBox to return input
    jest.spyOn(vscode.window, 'showInputBox')
      .mockResolvedValue('test input');
    
    // Mock executePlugin to throw error
    jest.spyOn(provider.pluginManager, 'executePlugin')
      .mockRejectedValue(new Error('Execution failed'));
    
    // Mock showErrorMessage
    const showErrorSpy = jest.spyOn(vscode.window, 'showErrorMessage')
      .mockImplementation();
    
    // Execute the run plugin command
    const callback = commandsMap.get('roo-scheduler.runPlugin');
    await callback();
    
    // Verify error message was shown
    expect(showErrorSpy).toHaveBeenCalledWith(expect.stringContaining('Execution failed'));
  });
});
```

### Package.json Registration Tests

These tests validate that the `package.json` has the correct contributions for plugin features:

```typescript
// TEST: package.json has correct plugin contributions
describe('Package.json - Plugin Contributions', () => {
  let packageJson: any;
  
  beforeAll(async () => {
    // Load package.json for testing
    const packageJsonPath = path.join(__dirname, '../../../package.json');
    const packageJsonContent = await fs.promises.readFile(packageJsonPath, 'utf8');
    packageJson = JSON.parse(packageJsonContent);
  });
  
  it('should have JSON validation for .rooplugins files', () => {
    const jsonValidation = packageJson.contributes.jsonValidation;
    expect(jsonValidation).toBeDefined();
    
    // Find the entry for .rooplugins
    const roopluginsValidation = jsonValidation.find(
      (v: any) => v.fileMatch === '**/.rooplugins'
    );
    
    expect(roopluginsValidation).toBeDefined();
    expect(roopluginsValidation).toHaveProperty('url');
    expect(roopluginsValidation.url).toContain('rooplugins-schema.json');
  });
  
  it('should have commands for plugin operations', () => {
    const commands = packageJson.contributes.commands;
    expect(commands).toBeDefined();
    
    // Check for reload plugins command
    const reloadCommand = commands.find(
      (c: any) => c.command === 'roo-scheduler.reloadPlugins'
    );
    expect(reloadCommand).toBeDefined();
    
    // Check for open manifest command
    const openCommand = commands.find(
      (c: any) => c.command === 'roo-scheduler.openPluginsManifest'
    );
    expect(openCommand).toBeDefined();
    
    // Check for run plugin command
    const runCommand = commands.find(
      (c: any) => c.command === 'roo-scheduler.runPlugin'
    );
    expect(runCommand).toBeDefined();
  });
  
  it('should have activation events for plugin commands', () => {
    const activationEvents = packageJson.activationEvents;
    expect(activationEvents).toBeDefined();
    
    // Check for reload plugins activation event
    expect(activationEvents).toContain('onCommand:roo-scheduler.reloadPlugins');
    
    // Check for open manifest activation event
    expect(activationEvents).toContain('onCommand:roo-scheduler.openPluginsManifest');
    
    // Check for run plugin activation event
    expect(activationEvents).toContain('onCommand:roo-scheduler.runPlugin');
  });
});
```

## Test Matrix

The test suite covers the following scenarios:

| Category | Test Case | Expected Result |
|----------|-----------|----------------|
| **ClineProvider Integration** | Initialize plugin manager | Plugin manager created |
| | Pass update callback | Callback calls postStateToWebview |
| | Dispose plugin manager | Plugin manager disposed properly |
| | Include plugins in state | Plugins included in state |
| **Message Handling** | Handle plugin-add | addPlugin called with correct args |
| | Handle plugin-remove | removePlugin called with correct args |
| | Handle plugin-toggle | togglePlugin called with correct args |
| | Handle plugin-update | updatePlugin called with correct args |
| | Handle plugin-run | executePlugin called and result sent |
| | Handle execution errors | Error shown and sent to webview |
| **Command Registration** | Register reload command | Command registered |
| | Register open manifest command | Command registered |
| | Register run plugin command | Command registered |
| | Execute reload command | loadPlugins called |
| | Execute open manifest (file exists) | File opened |
| | Execute open manifest (file missing) | Default created and opened |
| | Execute run plugin (plugins available) | Plugin executed and output shown |
| | Execute run plugin (no plugins) | Information message shown |
| | Handle execution errors | Error message shown |
| **Package.json** | JSON validation contribution | Contribution for .rooplugins |
| | Command contributions | Commands for plugin operations |
| | Activation events | Events for plugin commands |

These tests provide comprehensive coverage of the plugin system's integration with the VSCode extension architecture, ensuring that all components work together correctly and that the user experience is consistent.