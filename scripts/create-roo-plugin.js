#!/usr/bin/env node

/**
 * Roo Plugin Scaffolding CLI
 * 
 * This script creates a plugin structure for Roo in the workspace
 * It can be run directly via npx or installed globally
 */

const fs = require('fs');
const path = require('path');
// const { execSync } = require('child_process'); // Uncomment if needed for future functionality

// Command line arguments
const args = process.argv.slice(2);
const params = {};

// Parse command line arguments
for (let i = 0; i < args.length; i++) {
  if (args[i].startsWith('--')) {
    const key = args[i].slice(2);
    const value = args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : 'true';
    params[key] = value;
    if (value !== 'true') i++; // Skip the next argument if it was used as a value
  }
}

// Required parameters
const REQUIRED_PARAMS = ['slug', 'name', 'workspacePath'];

// Check for help flag
if (params.help || args.includes('--help') || args.includes('-h')) {
  showHelp();
  process.exit(0);
}

// Validate required parameters
const missingParams = REQUIRED_PARAMS.filter(param => !(param in params));
if (missingParams.length > 0) {
  console.error(`Missing required parameters: ${missingParams.join(', ')}`);
  showHelp();
  process.exit(1);
}

// Path configuration
const WORKSPACE_PATH = params.workspacePath;
const PLUGINS_DIR = path.join(WORKSPACE_PATH, '.roo', 'plugins');
const PLUGIN_DIR = path.join(PLUGINS_DIR, params.slug);

// Default values for optional parameters
params.description = params.description || `${params.name} plugin for Roo`;
params.enabled = params.enabled === 'true' || params.enabled === true;
params.location = params.location || 'local';
params.package = params.package || `roo-plugin-${params.slug}`;

// Template content
const TEMPLATE_CONTENT = {
  'package.json': `{
  "name": "${params.package}",
  "version": "1.0.0",
  "description": "${params.description}",
  "main": "index.js",
  "scripts": {
    "test": "echo \\"Error: no test specified\\" && exit 1"
  },
  "keywords": [
    "roo",
    "plugin",
    "${params.slug}"
  ],
  "author": "",
  "license": "MIT",
  "rooplugins": {
    "plugin": true
  }
}`,
  'index.js': `/**
 * ${params.name} - Roo Plugin
 * ${params.description}
 */

/**
 * Plugin initialization function
 * @param {object} context - The plugin context
 */
function initialize(context) {
  // Register this plugin with Roo
  context.registerPlugin({
    slug: '${params.slug}',
    name: '${params.name}',
    description: '${params.description}',
    version: '1.0.0',
    ${params.roleDefinition ? `
    // Custom role definition provided during plugin creation
    roleDefinition: \`${params.roleDefinition}\`,` : ''}
    ${params.customInstructions ? `
    // Custom instructions provided during plugin creation
    customInstructions: \`${params.customInstructions}\`,` : ''}
    
    // Plugin lifecycle hooks
    onActivate: async () => {
      console.log('Plugin ${params.name} activated');
      // You can initialize resources here
    },
    
    onDeactivate: async () => {
      console.log('Plugin ${params.name} deactivated');
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
module.exports = { initialize };`,
  '.rooplugins': `{
  "slug": "${params.slug}",
  "name": "${params.name}",
  "description": "${params.description}",
  "version": "1.0.0",
  "enabled": ${params.enabled},${params.roleDefinition ? `
  "roleDefinition": "${params.roleDefinition}",` : ''}${params.customInstructions ? `
  "customInstructions": "${params.customInstructions}",` : ''}${params.groups ? `
  "groups": ${JSON.stringify(params.groups)},` : ''}
  "main": "index.js"
}`,
  'README.md': `# ${params.name}

${params.description}

## About

This is a plugin for Roo designed to extend its functionality. This plugin was created using the Roo Plugin CLI.

## Features

- [Add plugin features here]

## Installation

### Remote Installation (NPM)

If this plugin is published to npm, you can install it using:

\`\`\`bash
npm install ${params.package}
\`\`\`

Then, in your Roo configuration, add this plugin:

\`\`\`json
{
  "plugins": [
    {
      "slug": "${params.slug}",
      "name": "${params.name}",
      "enabled": true,
      "location": "remote",
      "package": "${params.package}"
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
      "slug": "${params.slug}",
      "name": "${params.name}",
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

This plugin was scaffolded with the Roo Plugin CLI. To modify it:

1. Edit the \`index.js\` file to update functionality
2. Update the \`.rooplugins\` file to change metadata
3. Test your changes with Roo

## License

MIT`
};

/**
 * Show help information
 */
function showHelp() {
  console.log(`
Roo Plugin Scaffolding CLI

Usage:
  npx create-roo-plugin [options]

Required Options:
  --slug           Plugin slug identifier
  --name           Plugin display name
  --workspacePath  Workspace path to create plugin in

Optional Options:
  --description       Plugin description
  --enabled           Whether plugin is enabled (true/false)
  --location          Plugin location (local/remote)
  --package           NPM package name
  --path              Local plugin path
  --roleDefinition    Custom role definition
  --customInstructions Custom instructions
  --groups            Plugin groups (JSON array string)
  --help, -h          Show this help message

Example:
  npx create-roo-plugin --slug my-plugin --name "My Plugin" --workspacePath "/path/to/workspace" --description "A custom plugin"
`);
}

/**
 * Create a file and its directory structure
 * @param {string} filePath 
 * @param {string} content 
 */
function createFile(filePath, content) {
  const dir = path.dirname(filePath);
  
  // Create directory if it doesn't exist
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    console.log(`Created directory: ${dir}`);
  }
  
  // Write file
  fs.writeFileSync(filePath, content);
  console.log(`Created file: ${filePath}`);
}

/**
 * Main execution function
 */
async function main() {
  try {
    console.log(`Creating Roo Plugin: ${params.name} (${params.slug})`);
    
    // Create plugins directory if it doesn't exist
    if (!fs.existsSync(PLUGINS_DIR)) {
      fs.mkdirSync(PLUGINS_DIR, { recursive: true });
      console.log(`Created plugins directory: ${PLUGINS_DIR}`);
    }
    
    // Create plugin directory
    if (!fs.existsSync(PLUGIN_DIR)) {
      fs.mkdirSync(PLUGIN_DIR, { recursive: true });
      console.log(`Created plugin directory: ${PLUGIN_DIR}`);
    } else {
      console.log(`Plugin directory already exists: ${PLUGIN_DIR}`);
    }
    
    // Create each template file
    for (const [fileName, content] of Object.entries(TEMPLATE_CONTENT)) {
      const filePath = path.join(PLUGIN_DIR, fileName);
      createFile(filePath, content);
    }
    
    console.log(`\nPlugin successfully created at: ${PLUGIN_DIR}`);
    console.log(`You can now use this plugin by adding it to your Roo configuration.`);
    
    return {
      success: true,
      pluginPath: PLUGIN_DIR
    };
  } catch (error) {
    console.error('Error creating plugin:', error);
    return {
      success: false,
      error: error.message || 'Unknown error occurred'
    };
  }
}

// Execute main function
main().then(result => {
  if (!result.success) {
    process.exit(1);
  }
});