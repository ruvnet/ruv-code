import { RooPluginEntry, RooPluginManifest } from '../schemas/plugin-schema';
import { vscode } from '@/utilities/vscode';

/**
 * Handles communication between the webview UI and the extension
 * for plugin-related operations
 */
export class PluginExtensionIntegration {
  /**
   * Scaffold new plugin files in the .roo/plugins directory
   * This method is maintained for backward compatibility
   * 
   * @param plugin The plugin entry to scaffold
   * @returns A promise with the result of the operation
   */
  static async scaffoldPluginFiles(plugin: RooPluginEntry): Promise<{ success: boolean; error?: string; partialSuccess?: boolean }> {
    try {
      const response = await vscode.postMessage<{
        command: 'scaffoldPluginFiles';
        plugin: RooPluginEntry;
      }, { success: boolean; error?: string }>({
        command: 'scaffoldPluginFiles',
        plugin
      });
      
      return response;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Initialize plugin scaffolding by creating base directory structure
   * This is part of the chunked scaffolding approach to prevent timeouts
   * 
   * @param plugin The plugin entry to initialize
   * @returns Promise with result of the operation
   */
  static async scaffoldPluginInit(plugin: RooPluginEntry): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await vscode.postMessage<{
        command: 'scaffoldPluginInit';
        plugin: RooPluginEntry;
      }, { success: boolean; error?: string }>({
        command: 'scaffoldPluginInit',
        plugin
      });
      
      return response;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }
  
  /**
   * Create plugin content files after directory structure is initialized
   * This is part of the chunked scaffolding approach to prevent timeouts
   * 
   * @param plugin The plugin entry to create content for
   * @returns Promise with result of the operation
   */
  static async scaffoldPluginContent(plugin: RooPluginEntry): Promise<{ success: boolean; error?: string; partialSuccess?: boolean }> {
    try {
      const response = await vscode.postMessage<{
        command: 'scaffoldPluginContent';
        plugin: RooPluginEntry;
      }, { success: boolean; error?: string; partialSuccess?: boolean }>({
        command: 'scaffoldPluginContent',
        plugin
      });
      
      return response;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Install a plugin and notify the extension
   * @param plugin The plugin to install
   */
  static async installPlugin(plugin: RooPluginEntry): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await vscode.postMessage<{
        command: 'installPlugin';
        plugin: RooPluginEntry;
      }, { success: boolean; error?: string }>({
        command: 'installPlugin',
        plugin
      });
      
      return response;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Update a plugin and notify the extension
   * @param slug The plugin slug
   * @param updates The plugin updates
   */
  static async updatePlugin(
    slug: string, 
    updates: Partial<Omit<RooPluginEntry, 'slug'>>
  ): Promise<{ success: boolean; plugin?: RooPluginEntry; error?: string }> {
    try {
      const response = await vscode.postMessage<{
        command: 'updatePlugin';
        slug: string;
        updates: Partial<Omit<RooPluginEntry, 'slug'>>;
      }, { success: boolean; plugin?: RooPluginEntry; error?: string }>({
        command: 'updatePlugin',
        slug,
        updates
      });
      
      return response;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Remove a plugin and notify the extension
   * @param slug The plugin slug to remove
   */
  static async removePlugin(slug: string): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await vscode.postMessage<{
        command: 'removePlugin';
        slug: string;
      }, { success: boolean; error?: string }>({
        command: 'removePlugin',
        slug
      });
      
      return response;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Enable a plugin and notify the extension
   * @param slug The plugin slug to enable
   */
  static async enablePlugin(slug: string): Promise<{ success: boolean; plugin?: RooPluginEntry; error?: string }> {
    return this.updatePlugin(slug, { enabled: true });
  }

  /**
   * Disable a plugin and notify the extension
   * @param slug The plugin slug to disable
   */
  static async disablePlugin(slug: string): Promise<{ success: boolean; plugin?: RooPluginEntry; error?: string }> {
    return this.updatePlugin(slug, { enabled: false });
  }

  /**
   * Get all installed plugins from the extension
   */
  static async getPlugins(): Promise<{ success: boolean; plugins?: RooPluginEntry[]; error?: string }> {
    try {
      const response = await vscode.postMessage<{
        command: 'getPlugins';
      }, { success: boolean; plugins?: RooPluginEntry[]; error?: string }>({
        command: 'getPlugins'
      });
      
      return response;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Load manifest from the extension
   */
  static async loadManifest(): Promise<{ success: boolean; manifest?: RooPluginManifest; error?: string }> {
    try {
      const response = await vscode.postMessage<{
        command: 'loadPluginManifest';
      }, { success: boolean; manifest?: RooPluginManifest; error?: string }>({
        command: 'loadPluginManifest'
      });
      
      return response;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Run a specific plugin
   * @param slug The plugin slug to run
   */
  static async runPlugin(slug: string): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await vscode.postMessage<{
        command: 'runPlugin';
        slug: string;
      }, { success: boolean; error?: string }>({
        command: 'runPlugin',
        slug
      });
      
      return response;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Clear the plugin cache
   */
  static async clearPluginCache(): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await vscode.postMessage<{
        command: 'clearPluginCache';
      }, { success: boolean; error?: string }>({
        command: 'clearPluginCache'
      });
      
      return response;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Save plugin settings
   * @param settings The plugin settings to save
   */
  static async savePluginSettings(settings: Record<string, any>): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await vscode.postMessage<{
        command: 'savePluginSettings';
        settings: Record<string, any>;
      }, { success: boolean; error?: string }>({
        command: 'savePluginSettings',
        settings
      });
      
      return response;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Get plugin settings
   */
  static async getPluginSettings(): Promise<{ success: boolean; settings?: Record<string, any>; error?: string }> {
    try {
      const response = await vscode.postMessage<{
        command: 'getPluginSettings';
      }, { success: boolean; settings?: Record<string, any>; error?: string }>({
        command: 'getPluginSettings'
      });
      
      return response;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }
}