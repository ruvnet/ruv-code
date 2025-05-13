import * as path from "path"
import * as fs from "fs/promises"
import * as vscode from "vscode"
import { RooPluginEntry, ScaffoldResult } from "../../shared/WebviewMessage"
import { getWorkspacePath } from "../../utils/path"
import { fileExistsAtPath } from "../../utils/fs"

/**
 * Service for handling plugin scaffolding operations
 */
export class PluginScaffoldService {
  private static readonly TEMPLATE_DIR = "webview-ui/src/components/plugins/templates"
  private static readonly PLUGINS_DIR = ".roo/plugins"

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

      // Create the plugin directory
      const pluginDir = path.join(workspacePath, this.PLUGINS_DIR, plugin.slug)
      
      // Create all necessary directories
      await fs.mkdir(pluginDir, { recursive: true })
      
      return {
        success: true
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

      const pluginDir = path.join(workspacePath, this.PLUGINS_DIR, plugin.slug)
      const extensionPath = vscode.extensions.getExtension("roo.roo-cline")?.extensionPath
      
      if (!extensionPath) {
        return {
          success: false,
          error: "Extension path not found"
        }
      }

      // Read all template files
      const templatePath = path.join(extensionPath, this.TEMPLATE_DIR)
      
      // Define the files to create
      const files = [
        { 
          name: "package.json", 
          template: "package.json.template" 
        },
        { 
          name: "index.js", 
          template: "index.js.template" 
        },
        { 
          name: ".rooplugins", 
          template: "rooplugins.template" 
        },
        { 
          name: "README.md", 
          template: "README.md.template" 
        }
      ]

      let partialSuccess = false
      
      // Generate each file
      for (const file of files) {
        try {
          // Read the template
          const templateFilePath = path.join(templatePath, file.template)
          const templateExists = await fileExistsAtPath(templateFilePath)
          
          if (!templateExists) {
            console.warn(`Template file not found: ${templateFilePath}`)
            partialSuccess = true
            continue
          }
          
          const templateContent = await fs.readFile(templateFilePath, 'utf8')
          
          // Replace variables in the template
          let content = this.processTemplate(templateContent, plugin)
          
          // Write the file
          const outputPath = path.join(pluginDir, file.name)
          await fs.writeFile(outputPath, content, 'utf8')
        } catch (error) {
          console.error(`Error creating file ${file.name}:`, error)
          partialSuccess = true
        }
      }

      if (partialSuccess) {
        return {
          success: true,
          partialSuccess: true
        }
      }
      
      return {
        success: true
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error creating plugin content"
      }
    }
  }

  /**
   * Simple template processor to replace variables in templates
   * 
   * @param template Template content
   * @param plugin Plugin data
   * @returns Processed template content
   */
  private static processTemplate(template: string, plugin: RooPluginEntry): string {
    // Basic variable replacement
    let content = template
      .replace(/\{\{slug\}\}/g, plugin.slug)
      .replace(/\{\{name\}\}/g, plugin.name)
      .replace(/\{\{enabled\}\}/g, String(plugin.enabled))
      
    if (plugin.description) {
      content = content.replace(/\{\{description\}\}/g, plugin.description)
    } else {
      content = content.replace(/\{\{description\}\}/g, `${plugin.name} plugin for Roo`)
    }
    
    // Handle location-specific fields
    if (plugin.location === 'remote') {
      content = content.replace(/\{\{package\}\}/g, plugin.package)
    } else if (plugin.location === 'local') {
      content = content.replace(/\{\{path\}\}/g, plugin.path)
    }
    
    // Handle conditional sections
    if (plugin.roleDefinition) {
      content = this.processConditional(content, 'roleDefinition', true)
      content = content.replace(/\{\{roleDefinition\}\}/g, plugin.roleDefinition)
    } else {
      content = this.processConditional(content, 'roleDefinition', false)
    }
    
    if (plugin.customInstructions) {
      content = this.processConditional(content, 'customInstructions', true)
      content = content.replace(/\{\{customInstructions\}\}/g, plugin.customInstructions)
    } else {
      content = this.processConditional(content, 'customInstructions', false)
    }
    
    if (plugin.groups && plugin.groups.length > 0) {
      content = this.processConditional(content, 'groups', true)
      content = content.replace(/\{\{groups\}\}/g, JSON.stringify(plugin.groups))
    } else {
      content = this.processConditional(content, 'groups', false)
    }
    
    return content
  }
  
  /**
   * Process conditional sections in templates
   * 
   * @param template Template content
   * @param conditionName Condition name
   * @param include Whether to include the section
   * @returns Processed template
   */
  private static processConditional(template: string, conditionName: string, include: boolean): string {
    const startTag = `{{#if ${conditionName}}}`
    const endTag = `{{/if}}`
    
    if (include) {
      // Keep the content, but remove the conditional tags
      return template
        .replace(new RegExp(startTag, 'g'), '')
        .replace(new RegExp(endTag, 'g'), '')
    } else {
      // Remove the conditional sections
      const regex = new RegExp(`${startTag}[\\s\\S]*?${endTag}`, 'g')
      return template.replace(regex, '')
    }
  }
}