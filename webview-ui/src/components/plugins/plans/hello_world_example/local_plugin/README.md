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