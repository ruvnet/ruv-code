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