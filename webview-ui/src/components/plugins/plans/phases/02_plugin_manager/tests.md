# Phase 2: Plugin Manager - Test Specification

## Test Plan

The test suite will validate the functionality of the `PluginManager` class, focusing on manifest management, file operations, plugin execution, and error handling. Tests will use Vitest (or Jest if that's the project standard) with appropriate mocking of VS Code APIs and file system.

## Unit Tests

### Manifest Management Tests

These tests validate the `PluginManager` can correctly load and manage the plugin manifest:

```typescript
// TEST: Plugin manager can load and validate manifests
describe('PluginManager - Manifest Loading', () => {
  let pluginManager: PluginManager;
  let mockContext: any;
  let mockFs: any;
  
  beforeEach(() => {
    // Mock VS Code extension context
    mockContext = {
      globalState: {
        update: jest.fn().mockResolvedValue(undefined)
      },
      subscriptions: []
    };
    
    // Mock file system operations
    mockFs = {
      readFile: jest.fn(),
      writeFile: jest.fn().mockResolvedValue(undefined),
      access: jest.fn(),
      mkdir: jest.fn().mockResolvedValue(undefined)
    };
    
    // Mock VS Code API
    const mockVscode = {
      workspace: {
        workspaceFolders: [{ uri: { fsPath: '/workspace' } }],
        createFileSystemWatcher: jest.fn().mockReturnValue({
          onDidCreate: jest.fn().mockReturnValue({ dispose: jest.fn() }),
          onDidChange: jest.fn().mockReturnValue({ dispose: jest.fn() }),
          onDidDelete: jest.fn().mockReturnValue({ dispose: jest.fn() }),
          dispose: jest.fn()
        })
      },
      window: {
        createOutputChannel: jest.fn().mockReturnValue({
          appendLine: jest.fn(),
          dispose: jest.fn()
        }),
        showErrorMessage: jest.fn(),
        showTextDocument: jest.fn().mockResolvedValue(undefined)
      },
      Uri: {
        file: jest.fn().mockImplementation(path => ({ fsPath: path }))
      }
    };
    
    // Inject mocks
    jest.spyOn(global, 'require').mockImplementation((module) => {
      if (module === 'fs/promises') return mockFs;
      if (module === 'vscode') return mockVscode;
      return jest.requireActual(module);
    });
    
    // Create plugin manager
    const onUpdate = jest.fn().mockResolvedValue(undefined);
    pluginManager = new PluginManager(mockContext, onUpdate);
  });
  
  afterEach(() => {
    jest.restoreAllMocks();
  });
  
  it('should create default manifest if none exists', async () => {
    // Setup mocks for "file not found" scenario
    mockFs.access.mockRejectedValueOnce(new Error('ENOENT'));
    mockFs.readFile.mockResolvedValueOnce(JSON.stringify({ plugins: [] }));
    
    await pluginManager.loadPlugins();
    
    // Should try to access the file
    expect(mockFs.access).toHaveBeenCalledWith('/workspace/.rooplugins');
    
    // Should create default file
    expect(mockFs.writeFile).toHaveBeenCalledWith(
      '/workspace/.rooplugins',
      expect.stringContaining('"plugins": []'),
      'utf8'
    );
    
    // Should read the new file
    expect(mockFs.readFile).toHaveBeenCalledWith('/workspace/.rooplugins', 'utf8');
  });
  
  it('should load valid plugins from manifest', async () => {
    // Setup mock for valid manifest
    const validManifest = {
      plugins: [
        {
          slug: 'test-plugin',
          name: 'Test Plugin',
          location: 'remote',
          package: '@roo/test-plugin',
          enabled: true
        }
      ]
    };
    
    mockFs.access.mockResolvedValueOnce(undefined);
    mockFs.readFile.mockResolvedValueOnce(JSON.stringify(validManifest));
    
    const plugins = await pluginManager.loadPlugins();
    
    // Should load the plugins correctly
    expect(plugins).toHaveLength(1);
    expect(plugins[0].slug).toBe('test-plugin');
    expect(plugins[0].name).toBe('Test Plugin');
    
    // Should update global state
    expect(mockContext.globalState.update).toHaveBeenCalledWith(
      'plugins',
      validManifest.plugins
    );
  });
  
  it('should handle invalid JSON in manifest', async () => {
    // Setup mock for invalid JSON
    mockFs.access.mockResolvedValueOnce(undefined);
    mockFs.readFile.mockResolvedValueOnce('invalid json {{');
    
    const plugins = await pluginManager.loadPlugins();
    
    // Should return empty array on error
    expect(plugins).toEqual([]);
    
    // Should show error message
    expect(mockVscode.window.showErrorMessage).toHaveBeenCalled();
  });
  
  it('should handle invalid schema in manifest', async () => {
    // Setup mock for invalid schema
    const invalidManifest = {
      plugins: [
        {
          // Missing required fields
          slug: 'test-plugin'
        }
      ]
    };
    
    mockFs.access.mockResolvedValueOnce(undefined);
    mockFs.readFile.mockResolvedValueOnce(JSON.stringify(invalidManifest));
    
    const plugins = await pluginManager.loadPlugins();
    
    // Should return empty array on error
    expect(plugins).toEqual([]);
    
    // Should show error message
    expect(mockVscode.window.showErrorMessage).toHaveBeenCalled();
  });
  
  it('should correctly get plugins after loading', async () => {
    // Setup mock for valid manifest
    const validManifest = {
      plugins: [
        {
          slug: 'test-plugin',
          name: 'Test Plugin',
          location: 'remote',
          package: '@roo/test-plugin',
          enabled: true
        }
      ]
    };
    
    mockFs.access.mockResolvedValueOnce(undefined);
    mockFs.readFile.mockResolvedValueOnce(JSON.stringify(validManifest));
    
    await pluginManager.loadPlugins();
    const plugins = pluginManager.getPlugins();
    
    // Should return a copy of the plugins
    expect(plugins).toHaveLength(1);
    expect(plugins[0].slug).toBe('test-plugin');
    expect(plugins).not.toBe(pluginManager['plugins']); // Should be a copy
### CRUD Operation Tests

These tests validate the plugin manager can correctly add, remove, update, and toggle plugins:

```typescript
// TEST: Plugin manager CRUD operations work correctly
describe('PluginManager - CRUD Operations', () => {
  let pluginManager: PluginManager;
  let mockContext: any;
  let mockFs: any;
  let onUpdateMock: jest.Mock;
  
  beforeEach(() => {
    // Mock setup similar to previous tests...
    
    // Mock for serialized write operations
    jest.spyOn(pluginManager as any, 'queueWrite').mockImplementation(async (operation) => {
      return operation();
    });
  });
  
  it('should add a valid plugin', async () => {
    // Initial empty plugins
    mockFs.readFile.mockResolvedValue(JSON.stringify({ plugins: [] }));
    await pluginManager.loadPlugins();
    
    const newPlugin = {
      slug: 'new-plugin',
      name: 'New Plugin',
      location: 'remote' as const,
      package: '@roo/new',
      enabled: true
    };
    
    await pluginManager.addPlugin(newPlugin);
    
    // Should write to file with the new plugin
    expect(mockFs.writeFile).toHaveBeenCalledWith(
      '/workspace/.rooplugins',
      expect.stringContaining('"slug": "new-plugin"'),
      'utf8'
    );
    
    // Should update global state
    expect(mockContext.globalState.update).toHaveBeenCalled();
    
    // Should call onUpdate callback
    expect(onUpdateMock).toHaveBeenCalled();
  });
  
  it('should reject adding a plugin with duplicate slug', async () => {
    // Initial plugins with one entry
    const existingPlugin = {
      slug: 'existing-plugin',
      name: 'Existing Plugin',
      location: 'remote' as const,
      package: '@roo/existing',
      enabled: true
    };
    
    mockFs.readFile.mockResolvedValue(JSON.stringify({
      plugins: [existingPlugin]
    }));
    
    await pluginManager.loadPlugins();
    
    // Try to add a plugin with the same slug
    const duplicatePlugin = {
      slug: 'existing-plugin', // Same slug
      name: 'Duplicate Plugin',
      location: 'remote' as const,
      package: '@roo/duplicate',
      enabled: true
    };
    
    await expect(pluginManager.addPlugin(duplicatePlugin))
      .rejects.toThrow('already exists');
    
    // Should not write to file
    expect(mockFs.writeFile).not.toHaveBeenCalled();
  });
  
  it('should remove a plugin by slug', async () => {
    // Initial plugins with one entry
    const existingPlugin = {
      slug: 'existing-plugin',
      name: 'Existing Plugin',
      location: 'remote' as const,
      package: '@roo/existing',
      enabled: true
    };
    
    mockFs.readFile.mockResolvedValue(JSON.stringify({
      plugins: [existingPlugin]
    }));
    
    await pluginManager.loadPlugins();
    
    // Mock stopPlugin method
    jest.spyOn(pluginManager, 'stopPlugin').mockResolvedValue();
    
    await pluginManager.removePlugin('existing-plugin');
    
    // Should stop the plugin
    expect(pluginManager.stopPlugin).toHaveBeenCalledWith('existing-plugin');
    
    // Should write empty plugins to file
    expect(mockFs.writeFile).toHaveBeenCalledWith(
      '/workspace/.rooplugins',
      expect.stringContaining('"plugins": []'),
      'utf8'
    );
    
    // Updated list should be empty
    expect(pluginManager.getPlugins()).toHaveLength(0);
  });
  
  it('should toggle a plugin enabled state', async () => {
    // Initial plugins with one enabled entry
    const existingPlugin = {
      slug: 'existing-plugin',
      name: 'Existing Plugin',
      location: 'remote' as const,
      package: '@roo/existing',
      enabled: true
    };
    
    mockFs.readFile.mockResolvedValue(JSON.stringify({
      plugins: [existingPlugin]
    }));
    
    await pluginManager.loadPlugins();
    
    // Mock stopPlugin method
    jest.spyOn(pluginManager, 'stopPlugin').mockResolvedValue();
    
    // Disable the plugin
    await pluginManager.togglePlugin('existing-plugin', false);
    
    // Should stop the plugin when disabling
    expect(pluginManager.stopPlugin).toHaveBeenCalledWith('existing-plugin');
    
    // Should write updated state to file
    expect(mockFs.writeFile).toHaveBeenCalledWith(
      '/workspace/.rooplugins',
      expect.stringContaining('"enabled": false'),
      'utf8'
    );
    
    // Plugin should now be disabled
    const plugins = pluginManager.getPlugins();
    expect(plugins[0].enabled).toBe(false);
  });
  
  it('should update a plugin', async () => {
    // Initial plugins with one entry
    const existingPlugin = {
      slug: 'existing-plugin',
      name: 'Existing Plugin',
      location: 'remote' as const,
      package: '@roo/existing',
      enabled: true
    };
    
    mockFs.readFile.mockResolvedValue(JSON.stringify({
      plugins: [existingPlugin]
    }));
    
    await pluginManager.loadPlugins();
    
    // Mock stopPlugin method
    jest.spyOn(pluginManager, 'stopPlugin').mockResolvedValue();
    
    // Update the plugin
    await pluginManager.updatePlugin('existing-plugin', {
      name: 'Updated Plugin',
      package: '@roo/updated'
    });
    
    // Should stop the plugin when updating
    expect(pluginManager.stopPlugin).toHaveBeenCalledWith('existing-plugin');
    
    // Should write updated state to file
    expect(mockFs.writeFile).toHaveBeenCalledWith(
      '/workspace/.rooplugins',
      expect.stringContaining('"name": "Updated Plugin"'),
      'utf8'
    );
    
    // Plugin should have updated values
    const plugins = pluginManager.getPlugins();
    expect(plugins[0].name).toBe('Updated Plugin');
    expect(plugins[0].package).toBe('@roo/updated');
    expect(plugins[0].slug).toBe('existing-plugin'); // Slug remains the same
  });
  
  it('should validate updates before applying them', async () => {
    // Initial plugins with one entry
    const existingPlugin = {
### Plugin Execution Tests

These tests validate the plugin manager can correctly execute plugins:

```typescript
// TEST: Plugin execution works correctly
describe('PluginManager - Plugin Execution', () => {
  let pluginManager: PluginManager;
  let mockContext: any;
  let mockChildProcess: any;
  
  beforeEach(() => {
    // Mock setup similar to previous tests...
    
    // Mock child_process.spawn
    mockChildProcess = {
      stdout: {
        on: jest.fn().mockImplementation((event, callback) => {
          if (event === 'data') {
            // Store the callback to simulate data later
            mockChildProcess.stdout.dataCallback = callback;
          }
        })
      },
      stderr: {
        on: jest.fn().mockImplementation((event, callback) => {
          if (event === 'data') {
            mockChildProcess.stderr.dataCallback = callback;
          }
        })
      },
      stdin: {
        write: jest.fn(),
        end: jest.fn()
      },
      on: jest.fn().mockImplementation((event, callback) => {
        if (event === 'close') {
          mockChildProcess.closeCallback = callback;
        } else if (event === 'error') {
          mockChildProcess.errorCallback = callback;
        }
      }),
      kill: jest.fn()
    };
    
    // Mock spawn to return our mock process
    jest.spyOn(childProcess, 'spawn').mockReturnValue(mockChildProcess);
  });
  
  it('should execute a remote plugin via NPX', async () => {
    // Setup test plugin
    const remotePlugin = {
      slug: 'remote-plugin',
      name: 'Remote Plugin',
      location: 'remote' as const,
      package: '@roo/test',
      enabled: true
    };
    
    mockFs.readFile.mockResolvedValue(JSON.stringify({
      plugins: [remotePlugin]
    }));
    
    await pluginManager.loadPlugins();
    
    // Start execution (will be a promise)
    const executionPromise = pluginManager.executePlugin('remote-plugin');
    
    // Simulate stdout data
    mockChildProcess.stdout.dataCallback(Buffer.from('Hello from remote plugin!'));
    
    // Simulate successful completion
    mockChildProcess.closeCallback(0);
    
    // Wait for execution to complete
    const output = await executionPromise;
    
    // Should have called spawn with correct arguments
    expect(childProcess.spawn).toHaveBeenCalledWith(
      'npx',
      ['-y', '@roo/test'],
      expect.objectContaining({ shell: true })
    );
    
    // Should return stdout output
    expect(output).toBe('Hello from remote plugin!');
  });
  
  it('should execute a local plugin via Node', async () => {
    // Setup test plugin
    const localPlugin = {
      slug: 'local-plugin',
      name: 'Local Plugin',
      location: 'local' as const,
      path: '.roo/plugins/local-plugin.js',
      enabled: true
    };
    
    mockFs.readFile.mockResolvedValue(JSON.stringify({
      plugins: [localPlugin]
    }));
    
    // Mock file access check
    mockFs.access.mockResolvedValue(undefined);
    
    await pluginManager.loadPlugins();
    
    // Start execution (will be a promise)
    const executionPromise = pluginManager.executePlugin('local-plugin');
    
    // Simulate stdout data
    mockChildProcess.stdout.dataCallback(Buffer.from('Hello from local plugin!'));
    
    // Simulate successful completion
    mockChildProcess.closeCallback(0);
    
    // Wait for execution to complete
    const output = await executionPromise;
    
    // Should have called spawn with correct arguments
    expect(childProcess.spawn).toHaveBeenCalledWith(
      'node',
      [expect.stringContaining('local-plugin.js')],
      expect.objectContaining({ shell: true })
    );
    
    // Should return stdout output
    expect(output).toBe('Hello from local plugin!');
  });
  
  it('should pass input to plugin process', async () => {
    // Setup test plugin
    const remotePlugin = {
      slug: 'remote-plugin',
      name: 'Remote Plugin',
      location: 'remote' as const,
      package: '@roo/test',
      enabled: true
    };
    
    mockFs.readFile.mockResolvedValue(JSON.stringify({
      plugins: [remotePlugin]
    }));
    
    await pluginManager.loadPlugins();
    
    // Start execution with input
    const executionPromise = pluginManager.executePlugin('remote-plugin', 'test input');
    
    // Simulate stdout data
    mockChildProcess.stdout.dataCallback(Buffer.from('Received: test input'));
    
    // Simulate successful completion
    mockChildProcess.closeCallback(0);
    
    // Wait for execution to complete
    await executionPromise;
    
    // Should have written input to stdin
    expect(mockChildProcess.stdin.write).toHaveBeenCalledWith('test input');
    expect(mockChildProcess.stdin.end).toHaveBeenCalled();
  });
  
  it('should handle plugin execution errors', async () => {
    // Setup test plugin
    const remotePlugin = {
      slug: 'remote-plugin',
      name: 'Remote Plugin',
      location: 'remote' as const,
      package: '@roo/test',
      enabled: true
    };
    
    mockFs.readFile.mockResolvedValue(JSON.stringify({
      plugins: [remotePlugin]
    }));
    
    await pluginManager.loadPlugins();
    
    // Start execution
    const executionPromise = pluginManager.executePlugin('remote-plugin');
    
    // Simulate stderr data
    mockChildProcess.stderr.dataCallback(Buffer.from('Error in plugin'));
    
    // Simulate error exit code
    mockChildProcess.closeCallback(1);
    
    // Execution should fail
    await expect(executionPromise).rejects.toThrow('Plugin exited with code 1');
    
    // Plugin should be removed from running plugins map
    expect(pluginManager['runningPlugins'].has('remote-plugin')).toBe(false);
  });
  
  it('should check if plugin is enabled before execution', async () => {
    // Setup test plugin (disabled)
    const disabledPlugin = {
      slug: 'disabled-plugin',
      name: 'Disabled Plugin',
      location: 'remote' as const,
      package: '@roo/test',
      enabled: false
    };
    
    mockFs.readFile.mockResolvedValue(JSON.stringify({
      plugins: [disabledPlugin]
    }));
    
    await pluginManager.loadPlugins();
    
    // Try to execute disabled plugin
    await expect(pluginManager.executePlugin('disabled-plugin'))
      .rejects.toThrow('is disabled');
    
    // Should not have spawned a process
    expect(childProcess.spawn).not.toHaveBeenCalled();
  });
  
  it('should verify local plugin file exists before execution', async () => {
    // Setup test plugin
    const localPlugin = {
      slug: 'local-plugin',
      name: 'Local Plugin',
      location: 'local' as const,
      path: '.roo/plugins/local-plugin.js',
      enabled: true
    };
    
    mockFs.readFile.mockResolvedValue(JSON.stringify({
      plugins: [localPlugin]
    }));
    
    // Mock file access to fail
    mockFs.access.mockRejectedValue(new Error('ENOENT'));
    
    await pluginManager.loadPlugins();
    
    // Try to execute non-existent local plugin
    await expect(pluginManager.executePlugin('local-plugin'))
      .rejects.toThrow('Plugin file not found');
    
    // Should not have spawned a process
    expect(childProcess.spawn).not.toHaveBeenCalled();
  });
});
### Plugin Lifecycle Tests

These tests validate the plugin manager can correctly handle plugin lifecycle:

```typescript
// TEST: Plugin lifecycle management works correctly
describe('PluginManager - Plugin Lifecycle', () => {
  let pluginManager: PluginManager;
  let mockChildProcess: any;
  
  beforeEach(() => {
    // Mock setup similar to previous tests...
  });
  
  it('should stop a running plugin', async () => {
    // Setup test with a running plugin
    const mockProcess = {
      kill: jest.fn(),
      on: jest.fn().mockImplementation((event, callback) => {
        if (event === 'exit') {
          // Store callback to simulate exit later
          mockProcess.exitCallback = callback;
        }
      })
    };
    
    // Add to running plugins map
    pluginManager['runningPlugins'].set('test-plugin', mockProcess as any);
    
    // Stop the plugin
    const stopPromise = pluginManager.stopPlugin('test-plugin');
    
    // Simulate process exit
    mockProcess.exitCallback();
    
    // Wait for stop to complete
    await stopPromise;
    
    // Should have called kill
    expect(mockProcess.kill).toHaveBeenCalled();
    
    // Should have removed from running plugins map
    expect(pluginManager['runningPlugins'].has('test-plugin')).toBe(false);
  });
  
  it('should force kill plugin if it does not exit gracefully', async () => {
    jest.useFakeTimers();
    
    // Setup test with a running plugin
    const mockProcess = {
      kill: jest.fn(),
      on: jest.fn().mockImplementation((event, callback) => {
        if (event === 'exit') {
          // Store callback but don't call it (simulating hang)
          mockProcess.exitCallback = callback;
        }
      })
    };
    
    // Add to running plugins map
    pluginManager['runningPlugins'].set('hanging-plugin', mockProcess as any);
    
    // Stop the plugin
    const stopPromise = pluginManager.stopPlugin('hanging-plugin');
    
    // Fast-forward the timeout (plugin should be force killed after timeout)
    jest.advanceTimersByTime(3500);
    
    // Wait for stop to complete
    await stopPromise;
    
    // Should have called kill with SIGKILL after timeout
    expect(mockProcess.kill).toHaveBeenCalledWith('SIGKILL');
    
    // Should have removed from running plugins map
    expect(pluginManager['runningPlugins'].has('hanging-plugin')).toBe(false);
    
    jest.useRealTimers();
  });
  
  it('should stop all running plugins', async () => {
    // Setup test with multiple running plugins
    const mockPlugins = {
      'plugin1': {
        kill: jest.fn(),
        on: jest.fn().mockImplementation((event, callback) => {
          if (event === 'exit') {
            setTimeout(() => callback(), 0);
          }
        })
      },
      'plugin2': {
        kill: jest.fn(),
        on: jest.fn().mockImplementation((event, callback) => {
          if (event === 'exit') {
            setTimeout(() => callback(), 0);
          }
        })
      }
    };
    
    // Add to running plugins map
    for (const [slug, process] of Object.entries(mockPlugins)) {
      pluginManager['runningPlugins'].set(slug, process as any);
    }
    
    // Stop all plugins
    await pluginManager.stopAllPlugins();
    
    // Should have called kill on all processes
    expect(mockPlugins.plugin1.kill).toHaveBeenCalled();
    expect(mockPlugins.plugin2.kill).toHaveBeenCalled();
    
    // Should have cleared running plugins map
### Local Plugin Scaffolding Tests

These tests validate the plugin manager can correctly scaffold local plugins:

```typescript
// TEST: Local plugin scaffolding works correctly
describe('PluginManager - Local Plugin Scaffolding', () => {
  let pluginManager: PluginManager;
  let mockFs: any;
  
  beforeEach(() => {
    // Mock setup similar to previous tests...
  });
  
  it('should create scaffold for local plugin', async () => {
    const localPlugin = {
      slug: 'local-test',
      name: 'Local Test Plugin',
      location: 'local' as const,
      path: '.roo/plugins/local-test.js',
      enabled: true
    };
    
    // Mock file not existing yet
    mockFs.access.mockRejectedValueOnce(new Error('ENOENT'));
    
    // Call the scaffold method
    await pluginManager['createLocalPluginScaffold'](localPlugin);
    
    // Should have created the directory
    expect(mockFs.mkdir).toHaveBeenCalledWith(
      expect.stringContaining('/plugins'),
      expect.objectContaining({ recursive: true })
    );
    
    // Should have written the file
    expect(mockFs.writeFile).toHaveBeenCalledWith(
      expect.stringContaining('local-test.js'),
      expect.stringContaining('Hello from Local Test Plugin'),
      'utf8'
    );
    
    // Should have opened the file in editor
    expect(mockVscode.window.showTextDocument).toHaveBeenCalled();
  });
  
  it('should not overwrite existing plugin files', async () => {
    const localPlugin = {
      slug: 'existing-local',
      name: 'Existing Local Plugin',
      location: 'local' as const,
      path: '.roo/plugins/existing-local.js',
      enabled: true
    };
    
    // Mock file already existing
    mockFs.access.mockResolvedValueOnce(undefined);
    
    // Call the scaffold method
    await pluginManager['createLocalPluginScaffold'](localPlugin);
    
    // Should not have written the file
    expect(mockFs.writeFile).not.toHaveBeenCalled();
  });
  
  it('should create script when adding a local plugin', async () => {
    // Initial empty plugins
    mockFs.readFile.mockResolvedValue(JSON.stringify({ plugins: [] }));
    await pluginManager.loadPlugins();
    
    // Spy on createLocalPluginScaffold
    const scaffoldSpy = jest.spyOn(
      pluginManager as any, 
      'createLocalPluginScaffold'
    ).mockResolvedValue(undefined);
    
    const newLocalPlugin = {
      slug: 'new-local',
      name: 'New Local Plugin',
      location: 'local' as const,
      path: '.roo/plugins/new-local.js',
      enabled: true
    };
    
    await pluginManager.addPlugin(newLocalPlugin);
    
    // Should have called scaffold method
    expect(scaffoldSpy).toHaveBeenCalledWith(newLocalPlugin);
  });
});
```

### Integration Tests

These tests validate the integration of the PluginManager with the rest of the extension:

```typescript
// TEST: Integration with extension components
describe('PluginManager - Extension Integration', () => {
  let pluginManager: PluginManager;
  let mockContext: any;
  let clineProvider: any;
  
  beforeEach(() => {
    // Mocks for the extension components...
  });
  
  it('should integrate with ClineProvider for state updates', async () => {
    // Mock ClineProvider with a postStateToWebview method
    clineProvider = {
      postStateToWebview: jest.fn().mockResolvedValue(undefined)
    };
    
    // Create plugin manager with onUpdate callback to postState
    const onUpdate = jest.fn().mockImplementation(() => {
      return clineProvider.postStateToWebview();
    });
    
    pluginManager = new PluginManager(mockContext, onUpdate);
    
    // Mock plugin list load
    mockFs.readFile.mockResolvedValue(JSON.stringify({
      plugins: [{ 
        slug: 'test', 
        name: 'Test',
        location: 'remote',
        package: '@roo/test',
        enabled: true 
      }]
    }));
    
    // Load plugins
    await pluginManager.loadPlugins();
    
    // Should have called the onUpdate callback
    expect(onUpdate).toHaveBeenCalled();
    
    // Should have posted state to webview
    expect(clineProvider.postStateToWebview).toHaveBeenCalled();
  });
  
  it('should clean up resources on dispose', async () => {
    // Create manager with mocks
    pluginManager = new PluginManager(mockContext, jest.fn());
    
    // Mock watcher and running plugins
    const mockWatcher = {
      dispose: jest.fn()
    };
    
    pluginManager['watcher'] = mockWatcher as any;
    
    // Mock stopAllPlugins
    const stopAllSpy = jest.spyOn(pluginManager, 'stopAllPlugins')
      .mockResolvedValue(undefined);
    
    // Dispose
    pluginManager.dispose();
    
    // Should have disposed watcher
    expect(mockWatcher.dispose).toHaveBeenCalled();
    
    // Should have stopped all plugins
    expect(stopAllSpy).toHaveBeenCalled();
  });
});
```

## Test Matrix

The test suite covers the following scenarios:

| Category | Test Case | Expected Result |
|----------|-----------|----------------|
| **Manifest Loading** | Load valid manifest | Success, plugins loaded |
| | Create default if missing | Default manifest created |
| | Handle invalid JSON | Error shown, empty array returned |
| | Handle invalid schema | Error shown, empty array returned |
| | Get plugins after loading | Returns copy of plugins |
| **CRUD Operations** | Add valid plugin | Plugin added to manifest |
| | Reject duplicate slug | Error thrown |
| | Remove plugin by slug | Plugin removed from manifest |
| | Toggle plugin enabled state | Plugin enabled state changed |
| | Update plugin | Plugin fields updated |
| | Validate updates | Invalid updates rejected |
| **Plugin Execution** | Execute remote plugin | NPX called with correct args |
| | Execute local plugin | Node called with correct args |
| | Pass input to plugin | Input written to process stdin |
| | Handle execution errors | Error propagated |
| | Check plugin enabled | Disabled plugins rejected |
| | Verify local file exists | Missing files rejected |
| **Plugin Lifecycle** | Stop running plugin | Process killed, removed from map |
| | Force kill hanging plugin | SIGKILL sent after timeout |
| | Stop all plugins | All processes stopped |
| **Plugin Scaffolding** | Create scaffold | Directory and file created |
| | Don't overwrite existing | No file write if exists |
| | Create when adding | Scaffold created on add |
| **Integration** | State updates | onUpdate callback triggers UI update |
| | Resource cleanup | All resources disposed properly |

These tests provide comprehensive coverage of the `PluginManager` class, ensuring that it correctly handles plugin manifest management, file operations, plugin execution, and lifecycle management.
    expect(pluginManager['runningPlugins'].size).toBe(0);
  });
});
```
```
      slug: 'existing-plugin',
      name: 'Existing Plugin',
      location: 'remote' as const,
      package: '@roo/existing',
      enabled: true
    };
    
    mockFs.readFile.mockResolvedValue(JSON.stringify({
      plugins: [existingPlugin]
    }));
    
    await pluginManager.loadPlugins();
    
    // Try invalid update (missing package for remote plugin)
    await expect(pluginManager.updatePlugin('existing-plugin', {
      package: undefined
    })).rejects.toThrow('Invalid plugin update');
    
    // Should not write to file
    expect(mockFs.writeFile).not.toHaveBeenCalled();
  });
});
```
  });
});