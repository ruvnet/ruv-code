import { describe, test, expect, vi, beforeEach } from 'vitest';
import { PluginExtensionIntegration } from '../services/PluginExtensionIntegration';
import { RooPluginEntry } from '../schemas/plugin-schema';
import { vscode } from '@/utilities/vscode';

// Mock the vscode module
vi.mock('@/utilities/vscode', () => ({
  vscode: {
    postMessage: vi.fn()
  }
}));

describe('PluginExtensionIntegration', () => {
  // Sample plugin for testing
  const samplePlugin: RooPluginEntry = {
    slug: 'test-plugin',
    name: 'Test Plugin',
    enabled: true,
    location: 'remote',
    package: '@roo/test-plugin'
  };

  // Reset mocks before each test
  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe('Plugin Installation', () => {
    test('successfully installs a plugin', async () => {
      // Mock successful response
      vi.mocked(vscode.postMessage).mockResolvedValueOnce({
        success: true
      });

      const result = await PluginExtensionIntegration.installPlugin(samplePlugin);
      
      // Verify result
      expect(result.success).toBe(true);
      
      // Verify correct message was posted
      expect(vscode.postMessage).toHaveBeenCalledWith({
        command: 'installPlugin',
        plugin: samplePlugin
      });
    });

    test('handles installation failures', async () => {
      // Mock failure response
      vi.mocked(vscode.postMessage).mockResolvedValueOnce({
        success: false,
        error: 'Installation failed'
      });

      const result = await PluginExtensionIntegration.installPlugin(samplePlugin);
      
      // Verify result
      expect(result.success).toBe(false);
      expect(result.error).toBe('Installation failed');
    });

    test('handles exceptions during installation', async () => {
      // Mock exception
      vi.mocked(vscode.postMessage).mockRejectedValueOnce(new Error('Network error'));

      const result = await PluginExtensionIntegration.installPlugin(samplePlugin);
      
      // Verify result
      expect(result.success).toBe(false);
      expect(result.error).toBe('Network error');
    });
  });

  describe('Plugin Updates', () => {
    test('successfully updates a plugin', async () => {
      const updates = {
        name: 'Updated Name',
        enabled: false
      };

      // Mock successful response
      vi.mocked(vscode.postMessage).mockResolvedValueOnce({
        success: true,
        plugin: {
          ...samplePlugin,
          ...updates
        }
      });

      const result = await PluginExtensionIntegration.updatePlugin('test-plugin', updates);
      
      // Verify result
      expect(result.success).toBe(true);
      expect(result.plugin?.name).toBe('Updated Name');
      expect(result.plugin?.enabled).toBe(false);
      
      // Verify correct message was posted
      expect(vscode.postMessage).toHaveBeenCalledWith({
        command: 'updatePlugin',
        slug: 'test-plugin',
        updates
      });
    });
  });

  describe('Plugin Removal', () => {
    test('successfully removes a plugin', async () => {
      // Mock successful response
      vi.mocked(vscode.postMessage).mockResolvedValueOnce({
        success: true
      });

      const result = await PluginExtensionIntegration.removePlugin('test-plugin');
      
      // Verify result
      expect(result.success).toBe(true);
      
      // Verify correct message was posted
      expect(vscode.postMessage).toHaveBeenCalledWith({
        command: 'removePlugin',
        slug: 'test-plugin'
      });
    });
  });

  describe('Plugin Enable/Disable', () => {
    test('enables a plugin', async () => {
      // Mock successful response
      vi.mocked(vscode.postMessage).mockResolvedValueOnce({
        success: true,
        plugin: {
          ...samplePlugin,
          enabled: true
        }
      });

      const result = await PluginExtensionIntegration.enablePlugin('test-plugin');
      
      // Verify result
      expect(result.success).toBe(true);
      expect(result.plugin?.enabled).toBe(true);
      
      // Verify it calls updatePlugin with enabled: true
      expect(vscode.postMessage).toHaveBeenCalledWith({
        command: 'updatePlugin',
        slug: 'test-plugin',
        updates: { enabled: true }
      });
    });

    test('disables a plugin', async () => {
      // Mock successful response
      vi.mocked(vscode.postMessage).mockResolvedValueOnce({
        success: true,
        plugin: {
          ...samplePlugin,
          enabled: false
        }
      });

      const result = await PluginExtensionIntegration.disablePlugin('test-plugin');
      
      // Verify result
      expect(result.success).toBe(true);
      expect(result.plugin?.enabled).toBe(false);
      
      // Verify it calls updatePlugin with enabled: false
      expect(vscode.postMessage).toHaveBeenCalledWith({
        command: 'updatePlugin',
        slug: 'test-plugin',
        updates: { enabled: false }
      });
    });
  });

  describe('Plugin Listing', () => {
    test('gets all plugins from the extension', async () => {
      const plugins = [samplePlugin];
      
      // Mock successful response
      vi.mocked(vscode.postMessage).mockResolvedValueOnce({
        success: true,
        plugins
      });

      const result = await PluginExtensionIntegration.getPlugins();
      
      // Verify result
      expect(result.success).toBe(true);
      expect(result.plugins).toEqual(plugins);
      
      // Verify correct message was posted
      expect(vscode.postMessage).toHaveBeenCalledWith({
        command: 'getPlugins'
      });
    });
  });

  describe('Manifest Loading', () => {
    test('loads the manifest from the extension', async () => {
      const manifest = {
        plugins: [samplePlugin]
      };
      
      // Mock successful response
      vi.mocked(vscode.postMessage).mockResolvedValueOnce({
        success: true,
        manifest
      });

      const result = await PluginExtensionIntegration.loadManifest();
      
      // Verify result
      expect(result.success).toBe(true);
      expect(result.manifest).toEqual(manifest);
      
      // Verify correct message was posted
      expect(vscode.postMessage).toHaveBeenCalledWith({
        command: 'loadPluginManifest'
      });
    });
  });

  describe('Plugin Execution', () => {
      test('runs a plugin', async () => {
        // Mock successful response
        vi.mocked(vscode.postMessage).mockResolvedValueOnce({
          success: true
        });
  
        const result = await PluginExtensionIntegration.runPlugin('test-plugin');
        
        // Verify result
        expect(result.success).toBe(true);
        
        // Verify correct message was posted
        expect(vscode.postMessage).toHaveBeenCalledWith({
          command: 'runPlugin',
          slug: 'test-plugin'
        });
      });
  
      test('handles plugin execution failures', async () => {
        // Mock failure response
        vi.mocked(vscode.postMessage).mockResolvedValueOnce({
          success: false,
          error: 'Plugin execution failed'
        });
  
        const result = await PluginExtensionIntegration.runPlugin('test-plugin');
        
        // Verify result
        expect(result.success).toBe(false);
        expect(result.error).toBe('Plugin execution failed');
      });
    });
  
    describe('Plugin Scaffolding', () => {
      test('successfully scaffolds plugin files', async () => {
        // Mock successful response
        vi.mocked(vscode.postMessage).mockResolvedValueOnce({
          success: true
        });
  
        const result = await PluginExtensionIntegration.scaffoldPluginFiles(samplePlugin);
        
        // Verify result
        expect(result.success).toBe(true);
        
        // Verify correct message was posted
        expect(vscode.postMessage).toHaveBeenCalledWith({
          command: 'scaffoldPluginFiles',
          plugin: samplePlugin
        });
      });
  
      test('handles scaffolding failures', async () => {
        // Mock failure response
        vi.mocked(vscode.postMessage).mockResolvedValueOnce({
          success: false,
          error: 'Failed to scaffold plugin files'
        });
  
        const result = await PluginExtensionIntegration.scaffoldPluginFiles(samplePlugin);
        
        // Verify result
        expect(result.success).toBe(false);
        expect(result.error).toBe('Failed to scaffold plugin files');
      });
    });
});