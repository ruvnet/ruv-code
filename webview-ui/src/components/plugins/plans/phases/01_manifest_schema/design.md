# Phase 1: Plugin Manifest Schema - Design

## Data Structure Design

### Plugin Entry Structure

The core data structure is the `RooPluginEntry` which represents a single plugin:

```typescript
/**
 * Represents a single plugin entry in the .rooplugins manifest
 */
interface RooPluginEntry {
  /**
   * Unique identifier for the plugin (lowercase, no spaces, hyphen-separated)
   */
  slug: string;

  /**
   * Human-friendly name for display in the UI
   */
  name: string;

  /**
   * Description of the plugin's role or purpose, used for AI context
   */
  roleDefinition?: string;

  /**
   * Categories or tool groups this plugin belongs to
   * (e.g., "read", "edit", "browser", "command", "mcp")
   */
  groups?: string[];

  /**
   * Additional instructions or guidance for using this plugin
   */
  customInstructions?: string;

  /**
   * Source type: "remote" for NPM packages, "local" for workspace scripts
   */
  location: "local" | "remote";

  /**
   * NPM package name (required if location is "remote")
   */
  package?: string;

  /**
   * Local script path (required if location is "local")
   */
  path?: string;

  /**
   * Whether the plugin is active/enabled
   */
  enabled: boolean;
}
```

### Manifest Structure

The overall manifest structure is:

```typescript
/**
 * Structure of the .rooplugins manifest file
 */
interface RooPluginManifest {
  /**
   * Array of plugin entries
   */
  plugins: RooPluginEntry[];
}
```

## Zod Schema Design

Zod will be used for runtime validation. The schema will enforce the required fields based on plugin location:

```typescript
import { z } from 'zod';

// Base plugin schema with common fields
const pluginEntryBaseSchema = z.object({
  slug: z.string().min(1).regex(/^[a-z0-9-]+$/, 
    "Slug must contain only lowercase letters, numbers, and hyphens"),
  name: z.string().min(1),
  roleDefinition: z.string().optional(),
  groups: z.array(z.string()).optional(),
  customInstructions: z.string().optional(),
  enabled: z.boolean().optional().default(true),
});

// Remote plugin schema - requires package field
const remotePluginSchema = pluginEntryBaseSchema.extend({
  location: z.literal("remote"),
  package: z.string().min(1),
  path: z.undefined(),
});

// Local plugin schema - requires path field
const localPluginSchema = pluginEntryBaseSchema.extend({
  location: z.literal("local"),
  package: z.undefined(),
  path: z.string().min(1),
});

// Combined schema using discriminated union
const pluginEntrySchema = z.discriminatedUnion("location", [
  remotePluginSchema,
  localPluginSchema,
]);

// Full manifest schema
const pluginsManifestSchema = z.object({
  plugins: z.array(pluginEntrySchema),
});

// TypeScript types derived from schema
type RooPluginEntry = z.infer<typeof pluginEntrySchema>;
type RooPluginManifest = z.infer<typeof pluginsManifestSchema>;
```

## JSON Schema for Editor Support

The JSON schema for VS Code IntelliSense and validation:

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "Roo Plugins Configuration",
  "description": "Configuration file for Roo Code plugins",
  "type": "object",
  "required": ["plugins"],
  "properties": {
    "plugins": {
      "type": "array",
      "description": "List of available plugins",
      "items": {
        "type": "object",
        "required": ["slug", "name", "location"],
        "properties": {
          "slug": {
            "type": "string",
            "description": "Unique identifier for the plugin (lowercase, hyphen-separated)",
            "pattern": "^[a-z0-9-]+$"
          },
          "name": {
            "type": "string",
            "description": "Human-friendly name for display in the UI"
          },
          "roleDefinition": {
            "type": "string",
            "description": "Description of the plugin's role or purpose, used for AI context"
          },
          "groups": {
            "type": "array",
            "description": "Categories or tool groups this plugin belongs to",
            "items": {
              "type": "string"
            },
            "examples": [["read"], ["command", "mcp"], ["edit", "browser"]]
          },
          "customInstructions": {
            "type": "string",
            "description": "Additional instructions or guidance for using this plugin"
          },
          "location": {
            "type": "string",
            "enum": ["local", "remote"],
            "description": "Source type: 'remote' for NPM packages, 'local' for workspace scripts"
          },
          "package": {
            "type": "string",
            "description": "NPM package name (required if location is 'remote')"
          },
          "path": {
            "type": "string",
            "description": "Local script path (required if location is 'local')"
          },
          "enabled": {
            "type": "boolean",
            "description": "Whether the plugin is active/enabled",
            "default": true
          }
        },
        "allOf": [
          {
            "if": {
              "properties": { "location": { "enum": ["remote"] } }
            },
            "then": {
              "required": ["package"],
              "not": { "required": ["path"] }
            }
          },
          {
            "if": {
              "properties": { "location": { "enum": ["local"] } }
            },
            "then": {
              "required": ["path"],
              "not": { "required": ["package"] }
            }
          }
        ]
      }
    }
  }
}
```

## Module Structure

The implementation will be organized across these files:

1. `src/shared/plugins.ts` - Core interfaces shared between extension and webview
   - Defines `RooPluginEntry` and `RooPluginManifest` interfaces
   - May include simple utility functions for plugins

2. `src/core/config/PluginsSchema.ts` - Zod schema for validation
   - Implements the validation schema
   - Exports types derived from the schema
   - Provides validation helpers

3. `schemas/rooplugins-schema.json` - JSON Schema file for editor integration
   - Used for VS Code's JSON validation feature
   - Referenced in `package.json` contributions

## Design Considerations

### Validation Strategy

The validation will:
1. Check the basic structure (plugins array exists)
2. Validate each plugin has required fields (slug, name, location)
3. Apply conditional validation based on location:
   - For "remote": require package, forbid path
   - For "local": require path, forbid package
4. Apply format validation (slug format, non-empty strings)

### Type Safety

TypeScript types will enforce:
1. Required fields at compile time
2. Proper typing of location ("local" | "remote")
3. Discriminated union pattern to ensure the right fields exist based on location

### Future Extension

The schema design allows for future enhancements:
1. Version field could be added to track schema versions
2. Configuration section could be added for plugin-specific settings
3. Additional metadata fields (author, description, website) can be easily added

## Example Manifest

```json
{
  "plugins": [
    {
      "slug": "hello-world",
      "name": "Hello World Plugin",
      "roleDefinition": "A simple plugin that demonstrates basic functionality",
      "groups": ["command"],
      "customInstructions": "Use this plugin to print a greeting message",
      "location": "local",
      "path": ".roo/plugins/hello-world/index.js",
      "enabled": true
    },
    {
      "slug": "github-issues",
      "name": "GitHub Issue Manager",
      "roleDefinition": "Manages GitHub issues via API",
      "groups": ["mcp", "command"],
      "customInstructions": "Use this to create and update GitHub issues",
      "location": "remote",
      "package": "@roo/github-issues",
      "enabled": true
    }
  ]
}
```

This example shows one local plugin and one remote plugin, illustrating the different fields required for each.