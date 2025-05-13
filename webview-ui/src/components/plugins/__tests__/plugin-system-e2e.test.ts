import { vi, describe, test, expect, beforeEach } from 'vitest';
import { PluginManager } from '../services/PluginManager';
import { PluginExtensionIntegration } from '../services/PluginExtensionIntegration';
import { RooPluginEntry } from '../schemas/plugin-schema';
import { vscode } from '@/utilities/vscode';

// Mock the vscode module for extension communication
vi.mock('@/utilities/vscode', () => ({
  vscode: {
    postMessage: vi.fn()
  }
}));

describe('Plugin System E2E Tests', () => {
  let pluginManager: PluginManager;
  
  // Sample plugins for testing
  const remotePlugin: RooPluginEntry = {
    slug: 'test-remote',
    name: 'Test Remote Plugin',
    enabled: true,
    location: 'remote',
    package: '@roo/test-plugin'
  };
  
  const localPlugin: RooPluginEntry = {
    slug: 'test-local',
    name: 'Test Local Plugin',
    enabled: true,
    location: 'local',
    path: '/path/to/local/plugin'
  };
  
  // Reset state before each test
  beforeEach(() => {
    vi.resetAllMocks();
    pluginManager = new PluginManager();
  });
  
  test('Complete plugin lifecycle', async () => {
    // 1. Plugin validation and installation
    const validationResult = pluginManager.installPlugin(remotePlugin);
    expect(validationResult.success).toBe(true);
    expect(pluginManager.getPlugins()).toHaveLength(1);
    
    // 2. Extension communication for installation
    vi.mocked(vscode.postMessage).mockResolvedValueOnce({
      success: true
    });
    
    const extensionResult = await PluginExtensionIntegration.installPlugin(remotePlugin);
    expect(extensionResult.success).toBe(true);
    expect(vscode.postMessage).toHaveBeenCalledWith({
      command: 'installPlugin',
      plugin: remotePlugin
    });
    
    // 3. Update plugin configuration
    const updateResult = pluginManager.updatePlugin('test-remote', {
      name: 'Updated Plugin Name',
      enabled: false
    });
    
    expect(updateResult.success).toBe(true);
    if (updateResult.success) {
      expect(updateResult.plugin.name).toBe('Updated Plugin Name');
      expect(updateResult.plugin.enabled).toBe(false);
    }
    
    // 4. Sync update with extension
    vi.mocked(vscode.postMessage).mockResolvedValueOnce({
      success: true,
      plugin: {
        ...remotePlugin,
        name: 'Updated Plugin Name',
        enabled: false
      }
    });
    
    const extensionUpdateResult = await PluginExtensionIntegration.updatePlugin(
      'test-remote',
      { name: 'Updated Plugin Name', enabled: false }
    );
    
    expect(extensionUpdateResult.success).toBe(true);
    expect(vscode.postMessage).toHaveBeenCalledWith({
      command: 'updatePlugin',
      slug: 'test-remote',
      updates: { name: 'Updated Plugin Name', enabled: false }
    });
    
    // 5. Enable the plugin
    const enableResult = pluginManager.enablePlugin('test-remote');
    expect(enableResult.success).toBe(true);
    if (enableResult.success) {
      expect(enableResult.plugin.enabled).toBe(true);
    }
    
    // Verify the plugin is enabled in the manager
    const enabledPlugin = pluginManager.getPlugin('test-remote');
    expect(enabledPlugin?.enabled).toBe(true);
    
    // 6. Sync enabled state with extension
    vi.mocked(vscode.postMessage).mockResolvedValueOnce({
      success: true,
      plugin: {
        ...remotePlugin,
        name: 'Updated Plugin Name',
        enabled: true
      }
    });
    
    const extensionEnableResult = await PluginExtensionIntegration.enablePlugin('test-remote');
    expect(extensionEnableResult.success).toBe(true);
    expect(vscode.postMessage).toHaveBeenCalledWith({
      command: 'updatePlugin',
      slug: 'test-remote',
      updates: { enabled: true }
    });
    
    // 7. Run the plugin
    vi.mocked(vscode.postMessage).mockResolvedValueOnce({
      success: true
    });
    
    const runResult = await PluginExtensionIntegration.runPlugin('test-remote');
    expect(runResult.success).toBe(true);
    expect(vscode.postMessage).toHaveBeenCalledWith({
      command: 'runPlugin',
      slug: 'test-remote'
    });
    
    // 8. Remove the plugin
    const removeResult = pluginManager.removePlugin('test-remote');
    expect(removeResult.success).toBe(true);
    expect(pluginManager.hasPlugin('test-remote')).toBe(false);
    
    // 9. Sync removal with extension
    vi.mocked(vscode.postMessage).mockResolvedValueOnce({
      success: true
    });
    
    const extensionRemoveResult = await PluginExtensionIntegration.removePlugin('test-remote');
    expect(extensionRemoveResult.success).toBe(true);
    expect(vscode.postMessage).toHaveBeenCalledWith({
      command: 'removePlugin',
      slug: 'test-remote'
    });
  });
  
  test('Loading and validating a complete manifest', () => {
    // Create a complete plugin manifest
    const manifest = {
      plugins: [remotePlugin, localPlugin]
    };
    
    // Load the manifest
    const loadResult = pluginManager.loadManifest(manifest);
    expect(loadResult.success).toBe(true);
    if (loadResult.success) {
      expect(loadResult.plugins).toHaveLength(2);
    }
    
    // Verify plugins are loaded
    expect(pluginManager.getPlugins()).toHaveLength(2);
    expect(pluginManager.hasPlugin('test-remote')).toBe(true);
    expect(pluginManager.hasPlugin('test-local')).toBe(true);
    
    // Get the manifest and verify it matches
    const currentManifest = pluginManager.getManifest();
    expect(currentManifest.plugins).toHaveLength(2);
    expect(currentManifest.plugins).toContainEqual(remotePlugin);
    expect(currentManifest.plugins).toContainEqual(localPlugin);
  });
  
  test('Handles invalid plugins and manifests', () => {
    // Invalid plugin (remote without package)
    const invalidPlugin = {
      slug: 'invalid-plugin',
      name: 'Invalid Plugin',
      enabled: true,
      location: 'remote' as const
      // Missing required package field
    };
    
    // Attempt to install the invalid plugin
    const installResult = pluginManager.installPlugin(invalidPlugin as RooPluginEntry);
    expect(installResult.success).toBe(false);
    expect(pluginManager.getPlugins()).toHaveLength(0);
    
    // Invalid manifest
    const invalidManifest = {
      plugins: [
        // Invalid plugin in the manifest
        invalidPlugin
      ]
    };
    
    // Attempt to load the invalid manifest
    const loadResult = pluginManager.loadManifest(invalidManifest);
    expect(loadResult.success).toBe(false);
    expect(pluginManager.getPlugins()).toHaveLength(0);
  });
  
  test('Integration between manager and extension', async () => {
    // 1. Install on the manager side
    pluginManager.installPlugin(remotePlugin);
    
    // 2. Mock extension responses for sync
    vi.mocked(vscode.postMessage).mockResolvedValueOnce({
      success: true,
      plugins: [remotePlugin]
    });
    
    // 3. Get plugins from extension
    const extensionPluginsResult = await PluginExtensionIntegration.getPlugins();
    expect(extensionPluginsResult.success).toBe(true);
    if (extensionPluginsResult.success) {
      expect(extensionPluginsResult.plugins).toHaveLength(1);
      expect(extensionPluginsResult.plugins![0]).toEqual(remotePlugin);
    }
    
    // 4. Mock manifest response from extension
    vi.mocked(vscode.postMessage).mockResolvedValueOnce({
      success: true,
      manifest: {
        plugins: [remotePlugin]
      }
    });
    
    // 5. Load manifest from extension
    const extensionManifestResult = await PluginExtensionIntegration.loadManifest();
    expect(extensionManifestResult.success).toBe(true);
    if (extensionManifestResult.success) {
      expect(extensionManifestResult.manifest!.plugins).toHaveLength(1);
      expect(extensionManifestResult.manifest!.plugins[0]).toEqual(remotePlugin);
    }
  });
});