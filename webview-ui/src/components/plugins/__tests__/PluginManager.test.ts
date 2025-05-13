import { describe, test, expect, beforeEach } from 'vitest';
import { PluginManager } from '../services/PluginManager';
import { RooPluginEntry } from '../schemas/plugin-schema';

describe('PluginManager', () => {
  let pluginManager: PluginManager;
  
  // Sample valid plugins for testing
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

  // Reset the plugin manager before each test
  beforeEach(() => {
    pluginManager = new PluginManager();
  });

  describe('Plugin Installation', () => {
    test('installs valid remote plugins', () => {
      const result = pluginManager.installPlugin(remotePlugin);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.plugin).toEqual(remotePlugin);
      }
      expect(pluginManager.getPlugins()).toHaveLength(1);
      expect(pluginManager.hasPlugin('test-remote')).toBe(true);
    });

    test('installs valid local plugins', () => {
      const result = pluginManager.installPlugin(localPlugin);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.plugin).toEqual(localPlugin);
      }
      expect(pluginManager.getPlugins()).toHaveLength(1);
      expect(pluginManager.hasPlugin('test-local')).toBe(true);
    });

    test('rejects invalid plugins', () => {
      const invalidPlugin = {
        slug: 'invalid-plugin',
        name: 'Invalid Plugin',
        enabled: true,
        location: 'remote',
        // Missing required 'package' field
      } as RooPluginEntry;

      const result = pluginManager.installPlugin(invalidPlugin);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBeTruthy();
      }
      expect(pluginManager.getPlugins()).toHaveLength(0);
    });

    test('prevents duplicate plugin installations', () => {
      // First installation should succeed
      const firstResult = pluginManager.installPlugin(remotePlugin);
      expect(firstResult.success).toBe(true);
      
      // Second installation with same slug should fail
      const secondResult = pluginManager.installPlugin(remotePlugin);
      expect(secondResult.success).toBe(false);
      if (!secondResult.success) {
        expect(secondResult.error).toContain('already installed');
      }
      
      // Only one plugin should be installed
      expect(pluginManager.getPlugins()).toHaveLength(1);
    });
  });

  describe('Plugin Retrieval', () => {
    beforeEach(() => {
      pluginManager.installPlugin(remotePlugin);
      pluginManager.installPlugin(localPlugin);
    });

    test('gets all installed plugins', () => {
      const plugins = pluginManager.getPlugins();
      expect(plugins).toHaveLength(2);
      expect(plugins).toContainEqual(remotePlugin);
      expect(plugins).toContainEqual(localPlugin);
    });

    test('gets a specific plugin by slug', () => {
      const plugin = pluginManager.getPlugin('test-remote');
      expect(plugin).toEqual(remotePlugin);
    });

    test('returns undefined for non-existent plugins', () => {
      const plugin = pluginManager.getPlugin('non-existent');
      expect(plugin).toBeUndefined();
    });

    test('checks if a plugin exists', () => {
      expect(pluginManager.hasPlugin('test-remote')).toBe(true);
      expect(pluginManager.hasPlugin('test-local')).toBe(true);
      expect(pluginManager.hasPlugin('non-existent')).toBe(false);
    });
  });

  describe('Plugin Updates', () => {
    beforeEach(() => {
      pluginManager.installPlugin(remotePlugin);
    });

    test('updates plugin properties', () => {
      const result = pluginManager.updatePlugin('test-remote', {
        name: 'Updated Name',
        enabled: false
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.plugin.name).toBe('Updated Name');
        expect(result.plugin.enabled).toBe(false);
        // Slug should remain unchanged
        expect(result.plugin.slug).toBe('test-remote');
      }

      // Verify the plugin was actually updated in the manager
      const updatedPlugin = pluginManager.getPlugin('test-remote');
      expect(updatedPlugin?.name).toBe('Updated Name');
      expect(updatedPlugin?.enabled).toBe(false);
    });

    test('prevents updates to non-existent plugins', () => {
      const result = pluginManager.updatePlugin('non-existent', { name: 'New Name' });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('not found');
      }
    });

    test('rejects invalid updates', () => {
      // Try to update a remote plugin to be local without a path
      const result = pluginManager.updatePlugin('test-remote', {
        location: 'local',
        // Missing required 'path' field for local plugins
      } as any);

      expect(result.success).toBe(false);
    });
  });

  describe('Plugin Removal', () => {
    beforeEach(() => {
      pluginManager.installPlugin(remotePlugin);
      pluginManager.installPlugin(localPlugin);
    });

    test('removes plugins by slug', () => {
      const result = pluginManager.removePlugin('test-remote');
      expect(result.success).toBe(true);
      
      // Plugin should no longer exist
      expect(pluginManager.hasPlugin('test-remote')).toBe(false);
      expect(pluginManager.getPlugins()).toHaveLength(1);
      
      // Other plugins should be unaffected
      expect(pluginManager.hasPlugin('test-local')).toBe(true);
    });

    test('handles removal of non-existent plugins', () => {
      const result = pluginManager.removePlugin('non-existent');
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('not found');
      }
      
      // Existing plugins should be unaffected
      expect(pluginManager.getPlugins()).toHaveLength(2);
    });
  });

  describe('Plugin Enable/Disable', () => {
    beforeEach(() => {
      pluginManager.installPlugin(remotePlugin);
    });

    test('enables a plugin', () => {
      // First disable the plugin
      pluginManager.disablePlugin('test-remote');
      
      // Then enable it
      const result = pluginManager.enablePlugin('test-remote');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.plugin.enabled).toBe(true);
      }
      
      // Verify the plugin is enabled in the manager
      const plugin = pluginManager.getPlugin('test-remote');
      expect(plugin?.enabled).toBe(true);
    });

    test('disables a plugin', () => {
      const result = pluginManager.disablePlugin('test-remote');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.plugin.enabled).toBe(false);
      }
      
      // Verify the plugin is disabled in the manager
      const plugin = pluginManager.getPlugin('test-remote');
      expect(plugin?.enabled).toBe(false);
    });
  });

  describe('Manifest Handling', () => {
    test('loads plugins from a valid manifest', () => {
      const manifest = {
        plugins: [remotePlugin, localPlugin]
      };

      const result = pluginManager.loadManifest(manifest);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.plugins).toHaveLength(2);
      }
      
      // Verify the plugins are loaded
      expect(pluginManager.getPlugins()).toHaveLength(2);
      expect(pluginManager.hasPlugin('test-remote')).toBe(true);
      expect(pluginManager.hasPlugin('test-local')).toBe(true);
    });

    test('rejects invalid manifests', () => {
      const invalidManifest = {
        plugins: [
          {
            // Missing required fields
            slug: 'invalid'
          }
        ]
      };

      const result = pluginManager.loadManifest(invalidManifest);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBeTruthy();
      }
      
      // No plugins should be loaded
      expect(pluginManager.getPlugins()).toHaveLength(0);
    });

    test('gets the current manifest', () => {
      // Install plugins
      pluginManager.installPlugin(remotePlugin);
      pluginManager.installPlugin(localPlugin);
      
      // Get the manifest
      const manifest = pluginManager.getManifest();
      expect(manifest.plugins).toHaveLength(2);
      expect(manifest.plugins).toContainEqual(remotePlugin);
      expect(manifest.plugins).toContainEqual(localPlugin);
    });

    test('initializes from a manifest in constructor', () => {
      const initialManifest = {
        plugins: [remotePlugin, localPlugin]
      };
      
      const manager = new PluginManager(initialManifest);
      expect(manager.getPlugins()).toHaveLength(2);
      expect(manager.hasPlugin('test-remote')).toBe(true);
      expect(manager.hasPlugin('test-local')).toBe(true);
    });
  });
});