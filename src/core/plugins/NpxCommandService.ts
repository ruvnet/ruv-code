import * as vscode from "vscode"
import { TerminalRegistry } from "../../integrations/terminal/TerminalRegistry"
import { type RooTerminalCallbacks, ExitCodeDetails } from "../../integrations/terminal/types"

/**
 * Service for executing NPX commands for plugin creation and management
 */
export class NpxCommandService {
  /**
   * Execute an NPX command with optional arguments
   *
   * @param npxCommand The NPX command to execute
   * @param args Additional arguments to pass to the command
   * @param options Optional configuration options
   * @returns Promise with result of the operation
   */
  static async executeNpxCommand(
    npxCommand: string,
    args: string[] = [],
    options: {cwd?: string} = {}
  ): Promise<{success: boolean; output?: string; error?: string}> {
    try {
      console.log(`Executing npx command: ${npxCommand} with args:`, args)
      
      // Ensure the command starts with "npx"
      const command = `npx ${npxCommand} ${args.join(' ')}`
      
      // Working directory
      const workingDir = options.cwd || vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || ""
      
      // Store command results
      let outputContent = ""
      let errorContent = ""
      let exitCode = 0
      
      // Prepare callback handlers for terminal output
      const callbacks: RooTerminalCallbacks = {
        onLine: (lines: string) => {
          outputContent += lines
        },
        onCompleted: (output: string | undefined) => {
          if (output) outputContent = output
        },
        onShellExecutionComplete: (details: ExitCodeDetails) => {
          exitCode = details.exitCode ?? 1
          if (exitCode !== 0) {
            errorContent = `Command exited with code ${exitCode}`
          }
        },
        onShellExecutionStarted: () => {
          // Required by interface but not needed for our implementation
        }
      }
      
      // Get or create a terminal
      const terminal = await TerminalRegistry.getOrCreateTerminal(workingDir, false, undefined, "vscode")
      
      // Execute the command in the terminal
      const process = terminal.runCommand(command, callbacks)
      
      // Wait for command to complete
      await process
      
      // Return success or failure based on exit code
      if (exitCode === 0) {
        return {
          success: true,
          output: outputContent
        }
      } else {
        return {
          success: false,
          error: errorContent || `Command failed with exit code ${exitCode}`
        }
      }
    } catch (error) {
      console.error("Error executing npx command:", error)
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error executing npx command"
      }
    }
  }
}