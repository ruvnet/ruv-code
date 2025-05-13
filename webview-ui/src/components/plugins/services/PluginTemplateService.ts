import { RooPluginEntry, RooRemotePlugin } from '../schemas/plugin-schema';

/**
 * Service responsible for generating plugin template files
 */
export class PluginTemplateService {
  /**
   * Render a template string with plugin data
   * @param template The template string
   * @param plugin The plugin data
   * @returns Rendered template string
   */
  static renderTemplate(template: string, plugin: RooPluginEntry): string {
    // Make a copy of the plugin object to work with
    const data: Record<string, any> = { ...plugin };
    
    // Add formatted groups as JSON string if they exist
    if (data.groups && Array.isArray(data.groups)) {
      data.groups = JSON.stringify(data.groups);
    }
    
    // Replace template variables with data
    let result = template;
    
    // Replace simple placeholders
    for (const [key, value] of Object.entries(data)) {
      if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
        const regex = new RegExp(`{{${key}}}`, 'g');
        result = result.replace(regex, String(value));
      }
    }
    
    // Handle conditional blocks {{#if variable}}...{{/if}}
    const ifRegex = /{{#if\s+([^}]+)}}([\s\S]*?){{\/if}}/g;
    result = result.replace(ifRegex, (match, variable, content) => {
      return data[variable] ? content : '';
    });
    
    return result;
  }
  
  /**
   * Get package.json template for a plugin
   * @param plugin The plugin data
   * @returns Rendered package.json content
   */
  static getPackageJson(plugin: RooPluginEntry): string {
    // Local plugin uses its slug as the package name if no package name is specified
    const packageData = { 
      ...plugin,
      package: plugin.location === 'remote' 
        ? (plugin as RooRemotePlugin).package 
        : `@roo/${plugin.slug}`
    };
    
    const template = `{
  "name": "{{package}}",
  "version": "1.0.0",
  "description": "{{description}}",
  "main": "index.js",
  "scripts": {
    "test": "echo \\"Error: no test specified\\" && exit 1"
  },
  "keywords": [
    "roo",
    "plugin",
    "{{slug}}"
  ],
  "author": "",
  "license": "MIT",
  "rooplugins": {
    "plugin": true
  }
}`;
    
    return this.renderTemplate(template, packageData);
  }
  
  /**
   * Get index.js template for a plugin
   * @param plugin The plugin data
   * @returns Rendered index.js content
   */
  static getIndexJs(plugin: RooPluginEntry): string {
    const template = `/**
 * {{name}} - Roo Plugin
 * {{description}}
 */

/**
 * Plugin initialization function
 * @param {object} context - The plugin context
 */
function initialize(context) {
  // Register this plugin with Roo
  context.registerPlugin({
    slug: '{{slug}}',
    name: '{{name}}',
    description: '{{description}}',
    version: '1.0.0',
    {{#if roleDefinition}}
    // Custom role definition provided during plugin creation
    roleDefinition: \`{{roleDefinition}}\`,
    {{/if}}
    {{#if customInstructions}}
    // Custom instructions provided during plugin creation
    customInstructions: \`{{customInstructions}}\`,
    {{/if}}
    
    // Plugin lifecycle hooks
    onActivate: async () => {
      console.log('Plugin {{name}} activated');
      // You can initialize resources here
    },
    
    onDeactivate: async () => {
      console.log('Plugin {{name}} deactivated');
      // You can clean up resources here
    },
    
    // Plugin command handlers
    commands: {
      // Example command
      exampleCommand: async (args) => {
        return {
          success: true,
          result: \`Example command executed with args: \${JSON.stringify(args)}\`
        };
      }
    }
  });
}

// Export the initialization function
module.exports = { initialize };`;
    
    return this.renderTemplate(template, plugin);
  }
  
  /**
   * Get .rooplugins template for a plugin
   * @param plugin The plugin data
   * @returns Rendered .rooplugins content
   */
  static getRooPluginsConfig(plugin: RooPluginEntry): string {
    const template = `{
  "slug": "{{slug}}",
  "name": "{{name}}",
  "description": "{{description}}",
  "version": "1.0.0",
  "enabled": {{enabled}},
  {{#if roleDefinition}}
  "roleDefinition": "{{roleDefinition}}",
  {{/if}}
  {{#if customInstructions}}
  "customInstructions": "{{customInstructions}}",
  {{/if}}
  {{#if groups}}
  "groups": {{groups}},
  {{/if}}
  "main": "index.js"
}`;
    
    return this.renderTemplate(template, plugin);
  }
  
  /**
   * Get README.md template for a plugin
   * @param plugin The plugin data
   * @returns Rendered README.md content
   */
  static getReadme(plugin: RooPluginEntry): string {
    // Local plugin uses its slug as the package name if no package name is specified
    const packageData = { 
      ...plugin,
      package: plugin.location === 'remote' 
        ? (plugin as RooRemotePlugin).package 
        : `@roo/${plugin.slug}`
    };
    
    const template = `# {{name}}

{{description}}

## About

This is a plugin for Roo designed to extend its functionality. This plugin was created using the Roo Plugin Wizard.

## Features

- [Add plugin features here]

## Installation

### Remote Installation (NPM)

If this plugin is published to npm, you can install it using:

\`\`\`bash
npm install {{package}}
\`\`\`

Then, in your Roo configuration, add this plugin:

\`\`\`json
{
  "plugins": [
    {
      "slug": "{{slug}}",
      "name": "{{name}}",
      "enabled": true,
      "location": "remote",
      "package": "{{package}}"
    }
  ]
}
\`\`\`

### Local Installation

For local development, you can use this plugin from your filesystem:

1. Clone this repository or download the source code
2. In your Roo configuration, add this plugin:

\`\`\`json
{
  "plugins": [
    {
      "slug": "{{slug}}",
      "name": "{{name}}",
      "enabled": true,
      "location": "local",
      "path": "/path/to/plugin/directory"
    }
  ]
}
\`\`\`

## Usage

[Add usage instructions here]

## Development

This plugin was scaffolded with the Roo Plugin Wizard. To modify it:

1. Edit the \`index.js\` file to update functionality
2. Update the \`.rooplugins\` file to change metadata
3. Test your changes with Roo

## License

MIT`;
    
    return this.renderTemplate(template, packageData);
  }
  
  /**
   * Generate all template files for a plugin
   * @param plugin The plugin data
   * @returns Object containing all template file contents
   */
  static generateTemplateFiles(plugin: RooPluginEntry): {
    packageJson: string;
    indexJs: string;
    rooPluginsConfig: string;
    readme: string;
  } {
    return {
      packageJson: this.getPackageJson(plugin),
      indexJs: this.getIndexJs(plugin),
      rooPluginsConfig: this.getRooPluginsConfig(plugin),
      readme: this.getReadme(plugin)
    };
  }
}