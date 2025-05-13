import * as path from "path"
import * as vscode from "vscode"
import { RooPluginEntry, ScaffoldResult } from "../../shared/WebviewMessage"
import { getWorkspacePath } from "../../utils/path"
import { runTerminalCommand } from "../../utils/terminal"

/**
 * Service for handling plugin scaffolding operations using CLI tools instead of VS Code API
 * This approach provides a more reliable file system operation mechanism
 */
export class CliPluginScaffoldService {
  /**
   * Initialize plugin scaffolding by creating base directory structure
   * 
   * @param plugin The plugin entry to scaffold
   * @returns Promise with result of the operation
   */
  static async initializePlugin(plugin: RooPluginEntry): Promise<ScaffoldResult> {
    try {
      const workspacePath = getWorkspacePath()
      if (!workspacePath) {
        return {
          success: false,
          error: "No workspace folder is open"
        }
      }

      // Create the plugin directory using mkdir command
      // This is separate from full scaffolding to maintain the same API
      // as the original PluginScaffoldService
      const pluginDir = path.join(workspacePath, ".roo", "plugins", plugin.slug)
      
      try {
        await runTerminalCommand(`mkdir -p "${pluginDir}"`, workspacePath)
        return { success: true }
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : "Failed to create plugin directory"
        }
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error initializing plugin"
      }
    }
  }

  /**
   * Create plugin content files after directory structure is initialized
   * Uses the create-roo-plugin CLI tool to generate all plugin files
   * 
   * @param plugin The plugin entry to create content for
   * @returns Promise with result of the operation
   */
  static async createPluginContent(plugin: RooPluginEntry): Promise<ScaffoldResult> {
    try {
      const workspacePath = getWorkspacePath()
      if (!workspacePath) {
        return {
          success: false,
          error: "No workspace folder is open"
        }
      }

      // Build the CLI command with all plugin parameters
      const cliCmd = this.buildCliCommand(plugin, workspacePath)
      
      try {
        // Run the CLI command in a terminal
        await runTerminalCommand(cliCmd, workspacePath)
        return { success: true }
      } catch (error) {
        console.error("Error running plugin scaffold CLI:", error)
        return {
          success: false,
          error: error instanceof Error ? error.message : "Failed to scaffold plugin files"
        }
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error creating plugin content"
      }
    }
  }

  /**
   * Legacy method for scaffolding plugin files in a single operation
   * This is maintained for backward compatibility
   * 
   * @param plugin The plugin entry to scaffold
   * @returns Promise with result of the operation
   * @deprecated Use the chunked operations instead for better reliability
   */
  static async scaffoldPluginFiles(plugin: RooPluginEntry): Promise<ScaffoldResult> {
    try {
      // For the legacy method, just chain the initialize and create operations
      const initResult = await this.initializePlugin(plugin)
      if (!initResult.success) {
        return initResult
      }
      
      return await this.createPluginContent(plugin)
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error scaffolding plugin files"
      }
    }
  }

  /**
   * Build the CLI command with all plugin parameters
   * 
   * @param plugin The plugin entry
   * @param workspacePath The workspace path
   * @returns The CLI command string
   */
  private static buildCliCommand(plugin: RooPluginEntry, workspacePath: string): string {
    // Determine the path to the CLI script relative to the extension
    const extensionPath = vscode.extensions.getExtension("roo.roo-cline")?.extensionPath || "."
    const cliPath = path.join(extensionPath, "scripts", "create-roo-plugin.js")
    
    // Start building the base command
    let cmd = `node "${cliPath}" --slug "${plugin.slug}" --name "${plugin.name}" --workspacePath "${workspacePath}"`
    
    // Add optional parameters
    if (plugin.description) {
      cmd += ` --description "${plugin.description}"`
    }
    
    cmd += ` --enabled ${plugin.enabled}`
    cmd += ` --location "${plugin.location}"`
    
    if (plugin.location === "remote" && plugin.package) {
      cmd += ` --package "${plugin.package}"`
    } else if (plugin.location === "local" && plugin.path) {
      cmd += ` --path "${plugin.path}"`
    }
    
    if (plugin.roleDefinition) {
      cmd += ` --roleDefinition "${plugin.roleDefinition}"`
    }
    
    if (plugin.customInstructions) {
      cmd += ` --customInstructions "${plugin.customInstructions}"`
    }
    
    if (plugin.groups && plugin.groups.length > 0) {
      cmd += ` --groups "${JSON.stringify(plugin.groups).replace(/"/g, '\\"')}"`
    }
    
    return cmd
  }
}