# Phase 6: Hello World Example Implementation

## Overview

This document provides a detailed implementation plan for the Hello World plugin examples that will demonstrate the functionality of the Roo Code Plugin System. We'll create both a local file-based plugin and a remote NPX-based plugin.

## Hello World Plugins

The Hello World plugins will demonstrate:
1. Basic plugin structure
2. Integration with the plugin system
3. Input handling
4. Output formatting
5. Error handling

## Local Plugin Implementation

### Directory Structure

For the local plugin, we'll create the following directory structure:

```
.roo/
└── plugins/
    └── hello-world/
        ├── package.json     # Package definition
        ├── index.js         # Plugin entry point
        └── README.md        # Documentation
```

### Plugin Files

#### package.json

```json
{
  "name": "hello-world-plugin",
  "version": "1.0.0",
  "description": "A simple Hello World plugin for Roo Code",
  "main": "index.js",
  "scripts": {
    "test": "echo \"Error: no test specified\" && exit 1"
  },
  "keywords": ["roo", "plugin", "hello-world"],
  "author": "Roo Code",
  "license": "MIT"
}
```

#### index.js

```javascript
#!/usr/bin/env node

/**
 * Hello World Plugin for Roo Code
 * 
 * This plugin demonstrates the basic structure of a Roo Code plugin.
 * It accepts an optional name parameter and returns a greeting.
 */

// Check if a name was provided
let name = 'World';

// Read input from command line arguments or stdin
if (process.argv.length > 2) {
  // Use command line argument
  name = process.argv[2];
} else {
  // Check for stdin
  const stdin = process.stdin;
  
  // If stdin is not connected to a terminal, read from it
  if (!stdin.isTTY) {
    try {
      // Read synchronously for simplicity
      const fs = require('fs');
      const input = fs.readFileSync(0, 'utf-8').trim();
      
      if (input) {
        name = input;
      }
    } catch (error) {
      console.error('Error reading input:', error.message);
    }
  }
}

// Generate greeting
const currentTime = new Date();
const hour = currentTime.getHours();

let greeting;
if (hour < 12) {
  greeting = 'Good morning';
} else if (hour < 18) {
  greeting = 'Good afternoon';
} else {
  greeting = 'Good evening';
}

// Output the greeting
console.log(`${greeting}, ${name}! 👋`);
console.log('Hello World plugin executed successfully.');
console.log(`Current time: ${currentTime.toLocaleTimeString()}`);
console.log('This is a sample output from a local Roo Code plugin.');
```

#### README.md

```markdown
# Hello World Plugin for Roo Code

This is a sample plugin that demonstrates the basic capabilities of the Roo Code Plugin System.

## Usage

This plugin can be run directly or used within Roo Code.

### Direct Usage

```bash
node index.js [name]
```

### Roo Code Integration

1. Ensure the plugin is added to your `.rooplugins` file
2. Enable the plugin in the Roo Code Plugin Settings panel
3. Click the "Run" button to execute

## Input

The plugin accepts an optional name parameter:
- If provided as a command line argument: `node index.js Alice`
- If provided via stdin: `echo "Bob" | node index.js`
- If no input is provided, it defaults to "World"

## Output

The plugin generates a time-appropriate greeting based on the current time and the provided name.

## Extending

This simple example can be extended by:
1. Adding more sophisticated input parsing
2. Integrating with external APIs
3. Adding configuration options
4. Implementing more complex functionality

## License

MIT
```

### Manifest Entry

Add this entry to the `.rooplugins` file:

```json
{
  "plugins": [
    {
      "slug": "hello-world",
      "name": "Hello World",
      "roleDefinition": "A simple plugin that demonstrates the basic capabilities of the Roo Code Plugin System.",
      "groups": ["command"],
      "customInstructions": "This plugin accepts an optional name parameter and returns a time-appropriate greeting.",
      "location": "local",
      "path": ".roo/plugins/hello-world/index.js",
      "enabled": true
    }
  ]
}
```

## Remote Plugin Implementation

For the remote plugin, we'll create a separate package that can be published to NPM.

### Setup Project

1. Create a new directory outside the workspace
2. Initialize a new NPM package
3. Implement the plugin
4. Publish to NPM

### Directory Structure

```
roo-hello-plugin/
├── package.json     # Package definition
├── index.js         # Plugin entry point
├── LICENSE          # MIT license file
└── README.md        # Documentation
```

### Plugin Files

#### package.json

```json
{
  "name": "roo-hello-plugin",
  "version": "1.0.0",
  "description": "A Hello World plugin for Roo Code demonstrating NPX integration",
  "main": "index.js",
  "bin": {
    "roo-hello-plugin": "./index.js"
  },
  "scripts": {
    "test": "echo \"Error: no test specified\" && exit 1"
  },
  "keywords": ["roo", "plugin", "hello-world", "npx"],
  "author": "Roo Code",
  "license": "MIT",
  "dependencies": {
    "chalk": "^4.1.2"
  }
}
```

#### index.js

```javascript
#!/usr/bin/env node

/**
 * Hello World Remote Plugin for Roo Code
 * 
 * This plugin demonstrates how to create a remote NPX-executable plugin.
 * It uses chalk for colored output and accepts optional input.
 */

const chalk = require('chalk');

// Banner
console.log(chalk.blue.bold('┌─────────────────────────────────┐'));
console.log(chalk.blue.bold('│ Roo Code Remote Hello Plugin    │'));
console.log(chalk.blue.bold('└─────────────────────────────────┘'));
console.log();

// Process input
let name = 'World';

// Read from arguments
if (process.argv.length > 2) {
  name = process.argv[2];
} else {
  // Check if running in a pipeline
  if (!process.stdin.isTTY) {
    const data = [];
    
    process.stdin.on('data', chunk => {
      data.push(chunk);
    });
    
    process.stdin.on('end', () => {
      const input = Buffer.concat(data).toString().trim();
      if (input) {
        name = input;
      }
      
      // Continue with execution after input is processed
      printGreeting(name);
    });
    
    // Exit early as we'll handle greeting in the callback
    return;
  }
}

// If we didn't exit early for stdin processing, print greeting now
printGreeting(name);

function printGreeting(name) {
  // Get time-based greeting
  const hour = new Date().getHours();
  
  let greeting;
  let color;
  
  if (hour < 12) {
    greeting = 'Good morning';
    color = chalk.yellow;
  } else if (hour < 18) {
    greeting = 'Good afternoon';
    color = chalk.green;
  } else {
    greeting = 'Good evening';
    color = chalk.blue;
  }
  
  // Output the greeting with color
  console.log(color(`${greeting}, ${chalk.bold(name)}! 👋`));
  console.log();
  
  // System info
  console.log(chalk.gray('System Information:'));
  console.log(chalk.gray('────────────────────'));
  console.log(chalk.gray(`Time: ${new Date().toLocaleTimeString()}`));
  console.log(chalk.gray(`Node: ${process.version}`));
  console.log(chalk.gray(`Platform: ${process.platform}`));
  console.log();
  
  // Plugin info
  console.log(chalk.green('This is a remote NPX plugin for Roo Code.'));
  console.log(chalk.green('It demonstrates how to create plugins that can be executed via NPX.'));
  console.log();
  
  console.log(chalk.magenta('Try running it with:'));
  console.log(chalk.cyan('npx roo-hello-plugin [name]'));
  console.log();
}
```

#### README.md

```markdown
# Roo Hello Plugin

A Hello World plugin for Roo Code demonstrating NPX integration.

## Usage

This plugin can be run directly with npx:

```bash
npx roo-hello-plugin [name]
```

Or you can install it globally:

```bash
npm install -g roo-hello-plugin
roo-hello-plugin [name]
```

## Roo Code Integration

To use this plugin with Roo Code:

1. Add it to your `.rooplugins` file:

```json
{
  "plugins": [
    {
      "slug": "roo-hello-remote",
      "name": "Roo Hello (Remote)",
      "roleDefinition": "A Hello World plugin for Roo Code demonstrating NPX integration",
      "groups": ["command"],
      "customInstructions": "This plugin accepts an optional name parameter and returns a colorful greeting.",
      "location": "remote",
      "package": "roo-hello-plugin",
      "enabled": true
    }
  ]
}
```

2. Open the Roo Code Plugin Settings panel
3. The plugin should appear in your list
4. Click the "Run" button to execute it

## Features

- Time-based greetings (morning/afternoon/evening)
- Colorful output using chalk
- Input from arguments or stdin
- System information display

## License

MIT
```

### Publishing to NPM

To publish the remote plugin:

1. Create an NPM account if you don't have one
2. Login with `npm login`
3. In the plugin directory, run `npm publish`

If you don't want to publish to public NPM, alternatives include:
- Using a private NPM registry
- Using a GitHub Package Registry
- Creating a tarball and hosting it on a server
- For testing, using a local NPX command that points to the directory

### Manifest Entry

Once published, add this entry to the `.rooplugins` file:

```json
{
  "plugins": [
    {
      "slug": "roo-hello-remote",
      "name": "Roo Hello (Remote)",
      "roleDefinition": "A Hello World plugin for Roo Code demonstrating NPX integration",
      "groups": ["command"],
      "customInstructions": "This plugin accepts an optional name parameter and returns a colorful greeting.",
      "location": "remote",
      "package": "roo-hello-plugin",
      "enabled": true
    }
  ]
}
```

## Testing the Plugins

### Local Plugin Testing

1. Create the directory structure:
   ```
   mkdir -p .roo/plugins/hello-world
   ```

2. Create the files described above:
   - `.roo/plugins/hello-world/package.json`
   - `.roo/plugins/hello-world/index.js`
   - `.roo/plugins/hello-world/README.md`

3. Make the script executable:
   ```
   chmod +x .roo/plugins/hello-world/index.js
   ```

4. Test directly:
   ```
   node .roo/plugins/hello-world/index.js "Test User"
   ```

5. Add to `.rooplugins` file or create it if it doesn't exist.

6. Test in Roo Code by clicking the "Run" button in the Plugins panel.

### Remote Plugin Testing

1. Create a separate directory for the remote plugin.

2. Initialize an NPM package and create the files:
   ```
   mkdir roo-hello-plugin
   cd roo-hello-plugin
   npm init
   ```

3. Create the files described above:
   - `package.json`
   - `index.js`
   - `README.md`

4. Install dependencies:
   ```
   npm install chalk@4
   ```

5. Make the script executable:
   ```
   chmod +x index.js
   ```

6. Test locally:
   ```
   node index.js "Test User"
   ```

7. Test with NPX locally:
   ```
   npx ./
   ```

8. If publishing to NPM:
   ```
   npm login
   npm publish
   ```

9. Test the published package:
   ```
   npx roo-hello-plugin "Test User"
   ```

10. Add to `.rooplugins` file and test in Roo Code.

## Troubleshooting

### Local Plugin Issues

- **Script not executing**: Ensure the script has execute permissions (`chmod +x index.js`)
- **Module not found**: Make sure any dependencies are installed in the plugin directory
- **Path not found**: Verify the path in `.rooplugins` is correct and relative to workspace root

### Remote Plugin Issues

- **NPX command not found**: Ensure Node.js and NPM are installed and in your PATH
- **Package not found**: Check that the package name in `.rooplugins` matches the published name
- **Version issues**: Consider specifying a version if needed (e.g., `@1.0.0` after package name)
- **Rate limiting**: NPM has rate limits for unpublished users; consider using a scoped package

## Conclusion

These Hello World examples demonstrate the basic patterns for creating both local and remote plugins for Roo Code. They cover:

1. Basic plugin structure
2. Input handling
3. Output formatting
4. Documentation
5. Integration with the Roo Code plugin system

The examples can be used as templates for more complex plugins that provide extended functionality for Roo Code.