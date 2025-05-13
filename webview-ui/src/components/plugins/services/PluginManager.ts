import { z } from 'zod';
import { RooPluginManifest, RooPluginEntry, pluginsManifestSchema } from '../schemas/plugin-schema';

/**
 * Manages plugin installation, validation, and lifecycle
 */
export class PluginManager {
  private pluginManifest: RooPluginManifest;
  private installedPlugins: Map<string, RooPluginEntry>;
  private configuration: Record<string, any> = {
    enableRegistry: true,
    verifyPlugins: true,
    allowThirdParty: false
  };

  /**
   * Initialize the PluginManager
   * @param initialManifest Optional initial manifest to load plugins from
   */
  constructor(initialManifest?: RooPluginManifest) {
    this.pluginManifest = initialManifest || { plugins: [] };
    this.installedPlugins = new Map();
    
    // Initialize the map with plugins from the manifest
    this.pluginManifest.plugins.forEach(plugin => {
      this.installedPlugins.set(plugin.slug, plugin);
    });
  }

  /**
   * Get all installed plugins
   */
  getPlugins(): RooPluginEntry[] {
    return Array.from(this.installedPlugins.values());
  }

  /**
   * Get a specific plugin by slug
   * @param slug The plugin slug
   */
  getPlugin(slug: string): RooPluginEntry | undefined {
    return this.installedPlugins.get(slug);
  }

  /**
   * Check if a plugin is installed
   * @param slug The plugin slug
   */
  hasPlugin(slug: string): boolean {
    return this.installedPlugins.has(slug);
  }

  /**
   * Install a new plugin
   * @param plugin The plugin to install
   * @returns The installed plugin or error message
   */
  installPlugin(plugin: RooPluginEntry): { success: true; plugin: RooPluginEntry } | { success: false; error: string } {
    // Validate the plugin against our schema
    const validationResult = z.object({}).extend({
      plugin: pluginsManifestSchema.shape.plugins.element
    }).safeParse({ plugin });

    if (!validationResult.success) {
      return {
        success: false,
        error: validationResult.error.message
      };
    }

    // Check if plugin with this slug already exists
    if (this.installedPlugins.has(plugin.slug)) {
      return {
        success: false,
        error: `Plugin with slug '${plugin.slug}' is already installed`
      };
    }

    // Store the plugin and update the manifest
    this.installedPlugins.set(plugin.slug, plugin);
    this.pluginManifest.plugins = this.getPlugins();

    return {
      success: true,
      plugin
    };
  }

  /**
   * Update an existing plugin
   * @param slug The plugin slug to update
   * @param updates The plugin properties to update
   */
  updatePlugin(
    slug: string, 
    updates: Partial<Omit<RooPluginEntry, 'slug'>>
  ): { success: true; plugin: RooPluginEntry } | { success: false; error: string } {
    // Check if plugin exists
    const existingPlugin = this.installedPlugins.get(slug);
    if (!existingPlugin) {
      return {
        success: false,
        error: `Plugin with slug '${slug}' not found`
      };
    }

    // Create updated plugin
    const updatedPlugin = {
      ...existingPlugin,
      ...updates,
      // Ensure slug cannot be changed
      slug: existingPlugin.slug
    };

    // Validate the updated plugin
    const validationResult = z.object({}).extend({
      plugin: pluginsManifestSchema.shape.plugins.element
    }).safeParse({ plugin: updatedPlugin });

    if (!validationResult.success) {
      return {
        success: false,
        error: validationResult.error.message
      };
    }

    // Update the plugin
    this.installedPlugins.set(slug, updatedPlugin as RooPluginEntry);
    this.pluginManifest.plugins = this.getPlugins();

    return {
      success: true,
      plugin: updatedPlugin as RooPluginEntry
    };
  }

  /**
   * Remove a plugin
   * @param slug The plugin slug to remove
   */
  removePlugin(slug: string): { success: true } | { success: false; error: string } {
    // Check if plugin exists
    if (!this.installedPlugins.has(slug)) {
      return {
        success: false,
        error: `Plugin with slug '${slug}' not found`
      };
    }

    // Remove the plugin
    this.installedPlugins.delete(slug);
    this.pluginManifest.plugins = this.getPlugins();

    return { success: true };
  }

  /**
   * Enable a plugin
   * @param slug The plugin slug to enable
   */
  enablePlugin(slug: string): { success: true; plugin: RooPluginEntry } | { success: false; error: string } {
    return this.updatePlugin(slug, { enabled: true });
  }

  /**
   * Disable a plugin
   * @param slug The plugin slug to disable
   */
  disablePlugin(slug: string): { success: true; plugin: RooPluginEntry } | { success: false; error: string } {
    return this.updatePlugin(slug, { enabled: false });
  }

  /**
   * Get the current plugin manifest
   */
  getManifest(): RooPluginManifest {
    return this.pluginManifest;
  }

  /**
   * Load plugins from a manifest
   * @param manifest The manifest to load
   */
  /**
   * Set configuration options for the plugin manager
   * @param config The configuration options to set
   */
  setConfiguration(config: Record<string, any>): void {
    this.configuration = {
      ...this.configuration,
      ...config
    };
  }
  
  /**
   * Get the current configuration
   */
  getConfiguration(): Record<string, any> {
    return { ...this.configuration };
  }

  /**
   * Load plugins from a manifest
   * @param manifest The manifest to load
   */
  loadManifest(manifest: unknown): { success: true; plugins: RooPluginEntry[] } | { success: false; error: string } {
    // Validate the manifest
    const validationResult = pluginsManifestSchema.safeParse(manifest);
    
    if (!validationResult.success) {
      return {
        success: false,
        error: validationResult.error.message
      };
    }

    // Reset the current state
    this.pluginManifest = validationResult.data;
    this.installedPlugins.clear();

    // Load all plugins from the manifest
    validationResult.data.plugins.forEach(plugin => {
      this.installedPlugins.set(plugin.slug, plugin);
    });

    return {
      success: true,
      plugins: validationResult.data.plugins
    };
  }
}