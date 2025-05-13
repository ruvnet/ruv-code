# Phase 1: Schema & Interface Design

## Overview

This phase focuses on defining the data structures, schemas, and interfaces that will form the foundation of the plugin system. We'll create shared types that will be used across both the extension backend and the webview UI.

## Goals

1. Define the plugin entry schema and interface
2. Create shared types for plugin-related messages
3. Design a JSON schema for manifest validation
4. Ensure type safety and consistency across the system

## Implementation Details

### 1. Plugin Entry Interface

First, we'll create a shared interface file to define the structure of a plugin entry.

**File**: `src/shared/plugins.ts`

```typescript
/**
 * Defines the structure of a plugin entry in the .rooplugins manifest.
 */
export interface RooPluginEntry {
  /**
   * Unique identifier for the plugin (lowercase, hyphens only).
   */
  slug: string;
  
  /**
   * Human-friendly name for display in the UI.
   */
  name: string;
  
  /**
   * Description of the plugin's role or purpose.
   * This could inform the AI agent about what the plugin does.
   */
  roleDefinition?: string;
  
  /**
   * Capability groups or permissions the plugin needs.
   * Examples: "read", "edit", "browser", "command", "mcp"
   */
  groups?: string[];
  
  /**
   * Additional instructions or guidelines for using the plugin.
   */
  customInstructions?: string;
  
  /**
   * Indicates whether this is a remote NPM package or a local script.
   */
  location: 'local' | 'remote';
  
  /**
   * NPM package name (for remote plugins).
   * Required if location is "remote".
   */
  package?: string;
  
  /**
   * Path to plugin script (for local plugins).
   * Required if location is "local".
   */
  path?: string;
  
  /**
   * Whether the plugin is enabled or disabled.
   */
  enabled: boolean;
}

/**
 * Structure of the complete .rooplugins manifest file.
 */
export interface RooPluginManifest {
  /**
   * Array of plugin entries.
   */
  plugins: RooPluginEntry[];
}
```

### 2. Zod Schema (for Validation)

We'll create a validation schema using Zod. This will be used to validate plugin entries when reading from and writing to the manifest file.

**File**: `src/core/config/PluginsSchema.ts`

```typescript
import { z } from 'zod';
import { RooPluginEntry, RooPluginManifest } from '../../shared/plugins';

/**
 * Zod schema for validating a plugin entry.
 */
export const pluginEntrySchema = z.object({
  // Slug must be lowercase letters, numbers, and hyphens only
  slug: z.string()
    .regex(/^[a-z0-9-]+$/, 'Slug must be lowercase letters, numbers, and hyphens only')
    .min(1, 'Slug is required'),
  
  // Name is required
  name: z.string()
    .min(1, 'Name is required'),
  
  // Optional fields
  roleDefinition: z.string().optional(),
  groups: z.array(z.string()).optional(),
  customInstructions: z.string().optional(),
  
  // Location must be either 'local' or 'remote'
  location: z.enum(['local', 'remote']),
  
  // Package and path are conditionally required based on location
  package: z.string().optional(),
  path: z.string().optional(),
  
  // Enabled defaults to true if not provided
  enabled: z.boolean().default(true),
}).superRefine((val, ctx) => {
  // Validate that remote plugins have a package
  if (val.location === 'remote' && !val.package) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Remote plugins must specify a 'package' name",
      path: ['package'],
    });
  }
  
  // Validate that local plugins have a path
  if (val.location === 'local' && !val.path) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Local plugins must specify a 'path'",
      path: ['path'],
    });
  }
});

/**
 * Zod schema for validating the entire manifest file.
 */
export const roopluginsSchema = z.object({
  plugins: z.array(pluginEntrySchema),
});

/**
 * Type assertion to ensure our TypeScript types match the Zod schema.
 * This will cause a compile-time error if the types don't match.
 */
type SchemaType = z.infer<typeof pluginEntrySchema>;
type ManifestType = z.infer<typeof roopluginsSchema>;

// These type assertions will fail at compile time if the types don't match
export const _typeCheck: RooPluginEntry = {} as SchemaType;
export const _manifestCheck: RooPluginManifest = {} as ManifestType;
```

### 3. JSON Schema for VS Code

We'll create a JSON schema that VS Code can use to validate the `.rooplugins` file and provide IntelliSense when editing it directly.

**File**: `src/schemas/rooplugins-schema.json`

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "Roo Plugins Configuration",
  "description": "Defines plugins for the Roo Code extension",
  "type": "object",
  "required": ["plugins"],
  "properties": {
    "plugins": {
      "type": "array",
      "description": "Array of plugin definitions",
      "items": {
        "type": "object",
        "required": ["slug", "name", "location"],
        "properties": {
          "slug": {
            "type": "string",
            "description": "Unique identifier (lowercase, hyphens)",
            "pattern": "^[a-z0-9-]+$"
          },
          "name": {
            "type": "string",
            "description": "Human-readable name"
          },
          "roleDefinition": {
            "type": "string",
            "description": "Description of the plugin's purpose and role"
          },
          "groups": {
            "type": "array",
            "description": "Capability groups the plugin belongs to",
            "items": {
              "type": "string",
              "enum": ["read", "edit", "browser", "command", "mcp"]
            }
          },
          "customInstructions": {
            "type": "string",
            "description": "Additional instructions for using the plugin"
          },
          "location": {
            "type": "string",
            "description": "Plugin source location type",
            "enum": ["local", "remote"]
          },
          "package": {
            "type": "string",
            "description": "NPM package name (for remote plugins)"
          },
          "path": {
            "type": "string",
            "description": "Path to plugin script (for local plugins)"
          },
          "enabled": {
            "type": "boolean",
            "description": "Whether the plugin is enabled",
            "default": true
          }
        },
        "allOf": [
          {
            "if": {
              "properties": { "location": { "enum": ["remote"] } },
              "required": ["location"]
            },
            "then": { "required": ["package"] }
          },
          {
            "if": {
              "properties": { "location": { "enum": ["local"] } },
              "required": ["location"]
            },
            "then": { "required": ["path"] }
          }
        ]
      }
    }
  }
}
```

### 4. Update Extension Message Types

Next, we'll update the extension message types to include plugin-related messages.

**File**: `src/shared/ExtensionMessage.ts`

```typescript
import { RooPluginEntry } from './plugins';

// Existing code...

/**
 * Message from extension to webview for plugin execution results.
 */
export interface PluginResultMessage {
  type: 'pluginResult';
  slug: string;
  output: string;
  error: boolean;
}

/**
 * Union of all extension message types.
 */
export type ExtensionMessage = 
  // Existing message types...
  | PluginResultMessage;

/**
 * State sent from extension to webview.
 */
export interface ExtensionState {
  // Existing state properties...
  
  /**
   * List of available plugins from the .rooplugins file.
   */
  plugins: RooPluginEntry[];
}
```

### 5. Update Webview Message Types

We'll also update the webview message types to include plugin-related messages.

**File**: `src/shared/WebviewMessage.ts`

```typescript
import { RooPluginEntry } from './plugins';

// Existing code...

/**
 * Message from webview to extension to add a new plugin.
 */
export interface PluginAddMessage {
  type: 'plugin-add';
  plugin: Omit<RooPluginEntry, 'enabled'> & { enabled?: boolean };
}

/**
 * Message from webview to extension to remove a plugin.
 */
export interface PluginRemoveMessage {
  type: 'plugin-remove';
  slug: string;
}

/**
 * Message from webview to extension to toggle a plugin's enabled state.
 */
export interface PluginToggleMessage {
  type: 'plugin-toggle';
  slug: string;
  enabled: boolean;
}

/**
 * Message from webview to extension to update a plugin's properties.
 */
export interface PluginUpdateMessage {
  type: 'plugin-update';
  slug: string;
  updates: Partial<RooPluginEntry>;
}

/**
 * Message from webview to extension to run a plugin.
 */
export interface PluginRunMessage {
  type: 'plugin-run';
  slug: string;
  input?: string;
}

/**
 * Union of all webview message types.
 */
export type WebviewMessage = 
  // Existing message types...
  | PluginAddMessage
  | PluginRemoveMessage
  | PluginToggleMessage
  | PluginUpdateMessage
  | PluginRunMessage;
```

### 6. Update Package.json for JSON Schema

We need to register our JSON schema in `package.json` so that VS Code will use it for validation.

**File**: `package.json` (partial update)

```json
{
  "contributes": {
    "jsonValidation": [
      {
        "fileMatch": "**/.rooplugins",
        "url": "./schemas/rooplugins-schema.json"
      }
    ]
  }
}
```

## Testing Strategy

To ensure the schema and types are working correctly, we'll create the following tests:

### 1. Interface Consistency Tests

**File**: `src/shared/__tests__/plugins.test.ts`

```typescript
import { RooPluginEntry, RooPluginManifest } from '../plugins';

describe('Plugin Interfaces', () => {
  it('should allow valid plugin entries', () => {
    const localPlugin: RooPluginEntry = {
      slug: 'test-local',
      name: 'Test Local',
      location: 'local',
      path: './plugins/test.js',
      enabled: true
    };
    
    expect(localPlugin).toBeDefined();
    
    const remotePlugin: RooPluginEntry = {
      slug: 'test-remote',
      name: 'Test Remote',
      location: 'remote',
      package: '@roo/test',
      enabled: true
    };
    
    expect(remotePlugin).toBeDefined();
    
    const manifest: RooPluginManifest = {
      plugins: [localPlugin, remotePlugin]
    };
    
    expect(manifest).toBeDefined();
  });
  
  // TypeScript compilation will fail if these tests are written incorrectly
  // which is part of the test itself
});
```

### 2. Schema Validation Tests

**File**: `src/core/config/__tests__/PluginsSchema.test.ts`

```typescript
import { pluginEntrySchema, roopluginsSchema } from '../PluginsSchema';

describe('Plugin Schema Validation', () => {
  it('should validate a valid local plugin', () => {
    const result = pluginEntrySchema.safeParse({
      slug: 'test-local',
      name: 'Test Local',
      location: 'local',
      path: './plugins/test.js',
      enabled: true
    });
    
    expect(result.success).toBe(true);
  });
  
  it('should validate a valid remote plugin', () => {
    const result = pluginEntrySchema.safeParse({
      slug: 'test-remote',
      name: 'Test Remote',
      location: 'remote',
      package: '@roo/test',
      enabled: true
    });
    
    expect(result.success).toBe(true);
  });
  
  it('should reject a local plugin without a path', () => {
    const result = pluginEntrySchema.safeParse({
      slug: 'test-local',
      name: 'Test Local',
      location: 'local',
      enabled: true
    });
    
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toContain('must specify a \'path\'');
    }
  });
  
  it('should reject a remote plugin without a package', () => {
    const result = pluginEntrySchema.safeParse({
      slug: 'test-remote',
      name: 'Test Remote',
      location: 'remote',
      enabled: true
    });
    
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toContain('must specify a \'package\'');
    }
  });
  
  it('should reject an invalid slug', () => {
    const result = pluginEntrySchema.safeParse({
      slug: 'Invalid Slug!',
      name: 'Test',
      location: 'local',
      path: './test.js',
      enabled: true
    });
    
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].path).toContain('slug');
    }
  });
  
  it('should validate a complete manifest', () => {
    const result = roopluginsSchema.safeParse({
      plugins: [
        {
          slug: 'test-local',
          name: 'Test Local',
          location: 'local',
          path: './plugins/test.js',
          enabled: true
        },
        {
          slug: 'test-remote',
          name: 'Test Remote',
          location: 'remote',
          package: '@roo/test',
          enabled: true
        }
      ]
    });
    
    expect(result.success).toBe(true);
  });
  
  it('should apply default values', () => {
    const result = pluginEntrySchema.safeParse({
      slug: 'test',
      name: 'Test',
      location: 'local',
      path: './test.js'
      // No enabled field provided
    });
    
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.enabled).toBe(true);
    }
  });
});
```

## Implementation Timeline

1. Define basic interfaces (1 hour)
2. Create Zod schema for validation (2 hours)
3. Generate JSON schema for VS Code (1 hour)
4. Update message types (1 hour)
5. Write tests (2 hours)
6. Documentation and review (1 hour)

Total: 8 hours

## Dependencies

- Zod for schema validation
- TypeScript for type definitions
- Jest for testing

## Expected Output

After completing this phase, we'll have:

1. A well-defined interface for plugin entries
2. A validation schema for ensuring data integrity
3. JSON schema for VS Code IntelliSense
4. Message types for UI-extension communication
5. Tests for verifying schema correctness

These components will form the foundation for the rest of the plugin system implementation.