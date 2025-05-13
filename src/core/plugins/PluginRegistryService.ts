import * as path from "path"
import * as fs from "fs/promises"
import { RooPluginEntry, ScaffoldResult } from "../../shared/WebviewMessage"
import { getWorkspacePath } from "../../utils/path"
import { fileExistsAtPath } from "../../utils/fs"

/**
 * Service for handling plugin registration in the manifest
 */
export class PluginRegistryService {
  private static readonly PLUGINS_MANIFEST_PATH = ".roo/plugins-manifest.json"

  /**
   * Register plugin in the plugins manifest
   * 
   * @param plugin The plugin entry to register
   * @returns Promise with result of the operation
   */
  static async registerPlugin(plugin: RooPluginEntry): Promise<ScaffoldResult> {
    try {
      const workspacePath = getWorkspacePath()
      if (!workspacePath) {
        return {
          success: false,
          error: "No workspace folder is open"
        }
      }

      // Create .roo directory if it doesn't exist
      const rooDir = path.join(workspacePath, ".roo")
      await fs.mkdir(rooDir, { recursive: true })
// Check if manifest exists, if not create it
const manifestPath = path.join(workspacePath, this.PLUGINS_MANIFEST_PATH)
const manifestExists = await fileExistsAtPath(manifestPath)

let manifest: { plugins: RooPluginEntry[] } = { plugins: [] }
      
      if (manifestExists) {
        try {
          const manifestContent = await fs.readFile(manifestPath, 'utf8')
          manifest = JSON.parse(manifestContent)
        } catch (error) {
          console.warn("Error reading plugins manifest, creating new one:", error)
        }
      }
      
      // Check if plugin already exists
      const existingPluginIndex = manifest.plugins.findIndex(
        (p: RooPluginEntry) => p.slug === plugin.slug
      )
      
      if (existingPluginIndex >= 0) {
        // Replace existing plugin
        manifest.plugins[existingPluginIndex] = plugin
      } else {
        // Add new plugin
        manifest.plugins.push(plugin)
      }
      
      // Write manifest back to file
      await fs.writeFile(
        manifestPath, 
        JSON.stringify(manifest, null, 2), 
        'utf8'
      )
      
      return {
        success: true
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error registering plugin"
      }
    }
  }

  /**
   * Scaffold plugin files in a single operation (legacy method)
   * 
   * @param plugin The plugin entry to scaffold
   * @returns Promise with result of the operation
   */
  static async scaffoldPluginFiles(plugin: RooPluginEntry): Promise<ScaffoldResult> {
    try {
      // Get workspace path
      const workspacePath = getWorkspacePath()
      if (!workspacePath) {
        return {
          success: false,
          error: "No workspace folder is open"
        }
      }
      
      // Import the plugin scaffold service
      const { PluginScaffoldService } = await import('./PluginScaffoldService')
      
      // Execute steps in sequence
      const initResult = await PluginScaffoldService.initializePlugin(plugin)
      if (!initResult.success) {
        return initResult
      }
      
      const contentResult = await PluginScaffoldService.createPluginContent(plugin)
      if (!contentResult.success) {
        return {
          success: false,
          partialSuccess: true,
          error: contentResult.error || "Failed to create some plugin content"
        }
      }
      
      const registerResult = await this.registerPlugin(plugin)
      if (!registerResult.success) {
        return {
          success: false,
          partialSuccess: true,
          error: registerResult.error || "Failed to register plugin"
        }
      }
      
      return {
        success: true
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error in scaffoldPluginFiles"
      }
    }
  }
}