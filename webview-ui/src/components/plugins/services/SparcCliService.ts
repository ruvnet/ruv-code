import { vscode } from "@/utilities/vscode";

/**
 * Service for executing remote npx commands for plugin creation and management
 * This is the primary implementation for plugin scaffolding and management
 */
export class SparcCliService {
  /**
   * Executes the 'npx create-sparc init --force' command to initialize a basic plugin
   * 
   * @returns Promise with result of the operation
   */
  static async testCreateSparc(): Promise<{success: boolean; output?: string; error?: string}> {
    try {
      const response = await vscode.postMessage<{
        command: 'executeNpxCommand';
        npxCommand: 'create-sparc';
        args: string[];
      }, {success: boolean; output?: string; error?: string}>({
        command: 'executeNpxCommand',
        npxCommand: 'create-sparc',
        args: ['init', '--force']
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
   * Creates a plugin using the specified npx command
   * 
   * @param npxCommand The base npx command (e.g., 'create-sparc', 'create-roo-plugin')
   * @param args Additional arguments to pass to the command
   * @param options Optional configuration options
   * @returns Promise with result of the operation
   */
  static async createPlugin(
    npxCommand: string, 
    args: string[] = [], 
    options: {cwd?: string} = {}
  ): Promise<{success: boolean; output?: string; error?: string}> {
    try {
      // Verify the command starts with 'npx'
      const baseCommand = npxCommand.startsWith('npx ') ? npxCommand : `npx ${npxCommand}`;
      
      const response = await vscode.postMessage<{
        command: 'executeNpxCommand';
        npxCommand: string;
        args: string[];
        options?: {cwd?: string};
      }, {success: boolean; output?: string; error?: string}>({
        command: 'executeNpxCommand',
        npxCommand: baseCommand.replace('npx ', ''),
        args,
        options
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