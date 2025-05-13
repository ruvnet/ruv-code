# Hello World Plugin Examples

This directory contains examples of Roo Code plugins that demonstrate the basic structure and functionality of both local and remote plugins.

## Overview

The examples showcase:
1. Basic plugin structure
2. Input/output handling
3. Integration with the Roo Code Plugin System
4. Manifest configuration
5. Documentation

## Directory Structure

```
hello_world_example/
├── local_plugin/             # Local file-based plugin example
│   ├── .rooplugins           # Example manifest file
│   ├── index.js              # Plugin implementation
│   ├── package.json          # Package definition
│   └── README.md             # Plugin documentation
│
└── remote_plugin/            # Remote NPX-based plugin example
    ├── .rooplugins           # Example manifest file
    ├── index.js              # Plugin implementation with NPX support
    ├── package.json          # Package definition with NPX configuration
    └── README.md             # Plugin documentation
```

## Local Plugin Example

The local plugin demonstrates a simple file-based plugin that:
- Accepts an optional name input
- Generates a time-based greeting
- Returns formatted output
- Shows basic error handling

### How to Use the Local Plugin

1. Copy the plugin files to your workspace at `.roo/plugins/hello-world/`
2. Add the plugin entry to your `.rooplugins` file (see the example manifest)
3. Make the script executable with `chmod +x .roo/plugins/hello-world/index.js`
4. Enable the plugin in the Roo Code Plugin Settings panel
5. Click "Run" to execute the plugin

## Remote Plugin Example

The remote plugin demonstrates an NPX-compatible plugin that:
- Uses the NPX execution model
- Includes a third-party dependency (chalk)
- Provides formatted color output
- Shows advanced input handling

### How to Use the Remote Plugin

#### Publishing the Plugin

1. Create a directory for the plugin outside your workspace
2. Copy the plugin files to this directory
3. Run `npm install` to install dependencies
4. Make the script executable with `chmod +x index.js`
5. Publish to NPM with `npm publish` (requires an NPM account)

#### Using the Published Plugin

1. Add the plugin entry to your `.rooplugins` file (see the example manifest)
2. Enable the plugin in the Roo Code Plugin Settings panel
3. Click "Run" to execute the plugin

#### Testing Without Publishing

For testing without publishing to NPM:
1. Create a tarball with `npm pack`
2. Install the tarball globally with `npm install -g ./roo-hello-plugin-1.0.0.tgz`
3. Test execution with `roo-hello-plugin [name]`

## Integration with Roo Code

These examples demonstrate integration with the Roo Code Plugin System:
1. The plugin entries in `.rooplugins` tell Roo Code how to find and execute the plugins
2. The `"enabled": true` property allows the plugins to be used
3. The `roleDefinition` and `customInstructions` properties provide context for the plugins
4. The `groups` property categorizes the plugins

## Extending the Examples

These examples can be extended to create more complex plugins:
1. Add configuration options via JSON files or command-line arguments
2. Implement interactive prompts using a library like `inquirer`
3. Add API integrations to external services
4. Create plugins that modify files or workspace content
5. Implement plugins that interact with the extension's functionality

## Troubleshooting

If you encounter issues:
1. Ensure the scripts are executable
2. Check that paths in the `.rooplugins` file are correct
3. Verify NPM packages are installed correctly
4. Check console output for error messages
5. Use `console.error()` for better error visibility

## License

MIT