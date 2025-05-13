import { vscode } from "@/utilities/vscode";
import { RooPluginEntry } from "../../schemas/plugin-schema";
import { ScaffoldResult } from "../types";

/**
 * Service for handling plugin scaffolding operations with improved
 * timeout handling and chunked operations
 */
export class PluginScaffoldService {
  /**
   * Initialize plugin scaffolding by creating base directory structure
   * 
   * @param plugin The plugin entry to scaffold
   * @returns Promise with result of the operation
   */
  static async initializePlugin(plugin: RooPluginEntry): Promise<ScaffoldResult> {
    try {
      const response = await vscode.postMessage<{
        command: 'scaffoldPluginInit';
        plugin: RooPluginEntry;
      }, ScaffoldResult>({
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
   * 
   * @param plugin The plugin entry to create content for
   * @returns Promise with result of the operation
   */
  static async createPluginContent(plugin: RooPluginEntry): Promise<ScaffoldResult> {
    try {
      const response = await vscode.postMessage<{
        command: 'scaffoldPluginContent';
        plugin: RooPluginEntry;
      }, ScaffoldResult>({
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
   * Register plugin in the manifest
   * 
   * @param plugin The plugin entry to register
   * @returns Promise with result of the operation
   */
  static async registerPlugin(plugin: RooPluginEntry): Promise<ScaffoldResult> {
    try {
      const response = await vscode.postMessage<{
        command: 'registerPlugin';
        plugin: RooPluginEntry;
      }, ScaffoldResult>({
        command: 'registerPlugin',
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
   * Legacy method for scaffolding plugin files in a single operation
   * This is maintained for backward compatibility
   * 
   * @param plugin The plugin entry to scaffold
   * @returns Promise with result of the operation
   * @deprecated Use the chunked operations instead for better reliability
   */
  static async scaffoldPluginFiles(plugin: RooPluginEntry): Promise<ScaffoldResult> {
    try {
      const response = await vscode.postMessage<{
        command: 'scaffoldPluginFiles';
        plugin: RooPluginEntry;
      }, ScaffoldResult>({
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
}