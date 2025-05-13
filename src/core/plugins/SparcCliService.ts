import * as path from "path"
import { RooPluginEntry, ScaffoldResult } from "../../shared/WebviewMessage"
import { getWorkspacePath } from "../../utils/path"
import { runTerminalCommand } from "../../utils/terminal"
import { TerminalRegistry } from "../../integrations/terminal/TerminalRegistry"

/**
 * Service for handling plugin scaffolding operations using the SPARC CLI tool
 */
export class SparcCliService {
  /**
   * Initialize a plugin using npx create-sparc init command
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

      // Create the plugin directory path
      const pluginDir = path.join(workspacePath, ".roo", "plugins", plugin.slug)
      
      try {
        // Execute the create-sparc command
        const cliCmd = this.buildSparcCliCommand(plugin, pluginDir)
        await runTerminalCommand(cliCmd, workspacePath)
        return { success: true }
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : "Failed to initialize plugin with create-sparc"
        }
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error initializing plugin with create-sparc"
      }
    }
  }

  /**
   * Run the npx create-sparc command using terminal integration
   * This uses TerminalRegistry for more robust terminal handling than simple runTerminalCommand
   * 
   * @param plugin The plugin entry to scaffold
   * @returns Promise with result of the operation
   */
  static async runCreateSparcCommand(plugin: RooPluginEntry): Promise<ScaffoldResult> {
    try {
      const workspacePath = getWorkspacePath()
      if (!workspacePath) {
        return {
          success: false,
          error: "No workspace folder is open"
        }
      }

      // Create the plugin directory path
      const pluginDir = path.join(workspacePath, ".roo", "plugins", plugin.slug)
      
      // Get or create a terminal using TerminalRegistry
      const terminal = await TerminalRegistry.getOrCreateTerminal(
        workspacePath,
        true, // Required CWD
        undefined, // Task ID
        "vscode" // Provider
      )

      // Build the CLI command
      const cliCmd = this.buildSparcCliCommand(plugin, pluginDir)
      
      try {
        // Show terminal and execute command via runCommand
        await terminal.runCommand(cliCmd, {
          onLine: () => {},
          onCompleted: () => {},
          onShellExecutionStarted: () => {},
          onShellExecutionComplete: () => {}
        })
        return { success: true }
      } catch (error) {
        console.error("Error executing create-sparc command:", error)
        return {
          success: false,
          error: error instanceof Error ? error.message : "Failed to execute create-sparc command"
        }
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error running create-sparc command"
      }
    }
  }

  /**
   * Build the create-sparc CLI command with parameters
   * 
   * @param plugin The plugin entry
   * @param pluginDir The plugin directory path
   * @returns The CLI command string
   */
  private static buildSparcCliCommand(plugin: RooPluginEntry, pluginDir: string): string {
    // Start with the base command with --force to ensure it works automatically
    let cmd = `npx create-sparc init --force`
    
    // Add plugin name as parameter
    cmd += ` --name "${plugin.name}"`
    
    // Add slug parameter
    cmd += ` --slug "${plugin.slug}"`
    
    // Add output directory
    cmd += ` --outDir "${pluginDir}"`
    
    // Add description if available
    if (plugin.description) {
      cmd += ` --description "${plugin.description}"`
    }
    
    // Add additional parameters as needed
    // Note: author and version are added via metadata passed from the UI
    // but aren't part of the RooPluginEntry type, so we check as optional
    if ((plugin as any).author) {
      cmd += ` --author "${(plugin as any).author}"`
    }
    
    // Add version if available
    if ((plugin as any).version) {
      cmd += ` --version "${(plugin as any).version || '0.1.0'}"`
    }
    
    return cmd
  }
}