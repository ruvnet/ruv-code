# Phase 1: Plugin Manifest Schema - Test Specification

## Test Plan

The test suite will focus on validating the schema definitions, type safety, and validation logic. Tests will be implemented using Vitest (or Jest if that's the project's standard).

## Unit Tests

### Interface and Type Tests

These tests verify the TypeScript type system correctly enforces constraints:

```typescript
// TEST: TypeScript types correctly enforce field requirements
describe('RooPluginEntry Type Safety', () => {
  
  it('should allow valid remote plugin entry', () => {
    // This should compile without errors
    const validRemotePlugin: RooPluginEntry = {
      slug: 'test-plugin',
      name: 'Test Plugin',
      location: 'remote',
      package: '@roo/test-plugin',
      enabled: true
    };
    
    expect(validRemotePlugin.location).toBe('remote');
  });
  
  it('should allow valid local plugin entry', () => {
    // This should compile without errors
    const validLocalPlugin: RooPluginEntry = {
      slug: 'local-plugin',
      name: 'Local Plugin',
      location: 'local',
      path: '.roo/plugins/local-plugin/index.js',
      enabled: true
    };
    
    expect(validLocalPlugin.location).toBe('local');
  });
  
  // This test verifies TypeScript compilation errors (would be checked manually)
  // TypeScript should error if required fields are missing
  it('should require package for remote plugins (TypeScript error)', () => {
    // @ts-expect-error - package is required for remote plugins
    const invalidRemotePlugin: RooPluginEntry = {
      slug: 'invalid-remote',
      name: 'Invalid Remote',
      location: 'remote',
      enabled: true
    };
  });
  
  // This test verifies TypeScript compilation errors (would be checked manually)
  // TypeScript should error if path is provided for remote plugins
  it('should prevent path for remote plugins (TypeScript error)', () => {
    // @ts-expect-error - path should not be used with remote plugins
    const invalidRemoteWithPath: RooPluginEntry = {
      slug: 'invalid-remote',
      name: 'Invalid Remote',
      location: 'remote',
      package: '@roo/test',
      path: 'some/path',
      enabled: true
    };
  });
});

describe('RooPluginManifest Type Safety', () => {
  it('should accept valid manifest structure', () => {
    // This should compile without errors
    const validManifest: RooPluginManifest = {
      plugins: [
        {
          slug: 'test-plugin',
          name: 'Test Plugin',
          location: 'remote',
          package: '@roo/test-plugin',
          enabled: true
        }
      ]
    };
    
    expect(validManifest.plugins.length).toBe(1);
  });
});
```

### Schema Validation Tests

These tests verify the Zod schema correctly validates plugin entries:

```typescript
// TEST: Zod schema validates plugin entries correctly
describe('Plugin Schema Validation', () => {

  it('should validate a valid remote plugin entry', () => {
    const validRemote = {
      slug: 'test-plugin',
      name: 'Test Plugin',
      location: 'remote',
      package: '@roo/test-plugin',
      enabled: true
    };
    
    const result = pluginEntrySchema.safeParse(validRemote);
    expect(result.success).toBe(true);
  });
  
  it('should validate a valid local plugin entry', () => {
    const validLocal = {
      slug: 'local-plugin',
      name: 'Local Plugin',
      location: 'local',
      path: '.roo/plugins/local-plugin/index.js',
      enabled: true
    };
    
    const result = pluginEntrySchema.safeParse(validLocal);
    expect(result.success).toBe(true);
  });
  
  it('should validate optional fields', () => {
    const pluginWithOptionals = {
      slug: 'plugin-with-optionals',
      name: 'Plugin With Optionals',
      location: 'remote',
      package: '@roo/test',
      roleDefinition: 'This is a test plugin role',
      groups: ['read', 'command'],
      customInstructions: 'Custom usage instructions'
    };
    
    const result = pluginEntrySchema.safeParse(pluginWithOptionals);
    expect(result.success).toBe(true);
    
    if (result.success) {
      expect(result.data.roleDefinition).toBe('This is a test plugin role');
      expect(result.data.groups).toContain('read');
      expect(result.data.groups).toContain('command');
      expect(result.data.customInstructions).toBe('Custom usage instructions');
    }
  });
  
  it('should reject remote plugin without package', () => {
    const invalidRemote = {
      slug: 'invalid-remote',
      name: 'Invalid Remote',
      location: 'remote',
      enabled: true
    };
    
    const result = pluginEntrySchema.safeParse(invalidRemote);
    expect(result.success).toBe(false);
    
    if (!result.success) {
      expect(result.error.issues.some(issue => 
        issue.path.includes('package'))).toBe(true);
    }
  });
  
  it('should reject local plugin without path', () => {
    const invalidLocal = {
      slug: 'invalid-local',
      name: 'Invalid Local',
      location: 'local',
      enabled: true
    };
    
    const result = pluginEntrySchema.safeParse(invalidLocal);
    expect(result.success).toBe(false);
    
    if (!result.success) {
      expect(result.error.issues.some(issue => 
        issue.path.includes('path'))).toBe(true);
    }
  });
  
  it('should reject remote plugin with path', () => {
    const invalidRemote = {
      slug: 'invalid-remote',
      name: 'Invalid Remote',
      location: 'remote',
      package: '@roo/test',
      path: 'some/path',
      enabled: true
    };
    
    const result = pluginEntrySchema.safeParse(invalidRemote);
    expect(result.success).toBe(false);
  });
  
  it('should reject local plugin with package', () => {
    const invalidLocal = {
      slug: 'invalid-local',
      name: 'Invalid Local',
      location: 'local',
      package: '@roo/test',
      path: 'some/path',
      enabled: true
    };
    
    const result = pluginEntrySchema.safeParse(invalidLocal);
    expect(result.success).toBe(false);
  });
  
  it('should enforce slug format', () => {
    const invalidSlug = {
      slug: 'Invalid Slug',  // Contains spaces and uppercase
      name: 'Invalid Slug',
      location: 'remote',
      package: '@roo/test',
      enabled: true
    };
    
    const result = pluginEntrySchema.safeParse(invalidSlug);
    expect(result.success).toBe(false);
    
    if (!result.success) {
      expect(result.error.issues.some(issue => 
        issue.path.includes('slug'))).toBe(true);
    }
  });
});
```

### Manifest Validation Tests

These tests verify the full manifest schema validation:

```typescript
// TEST: Full manifest schema validation works correctly
describe('Manifest Schema Validation', () => {

  it('should validate a valid manifest with both types of plugins', () => {
    const validManifest = {
      plugins: [
        {
          slug: 'remote-plugin',
          name: 'Remote Plugin',
          location: 'remote',
          package: '@roo/test',
          enabled: true
        },
        {
          slug: 'local-plugin',
          name: 'Local Plugin',
          location: 'local',
          path: '.roo/plugins/local-plugin/index.js',
          enabled: false
        }
      ]
    };
    
    const result = pluginsManifestSchema.safeParse(validManifest);
    expect(result.success).toBe(true);
    
    if (result.success) {
      expect(result.data.plugins.length).toBe(2);
      expect(result.data.plugins[0].location).toBe('remote');
      expect(result.data.plugins[1].location).toBe('local');
    }
  });
  
  it('should validate an empty plugins array', () => {
    const emptyManifest = {
      plugins: []
    };
    
    const result = pluginsManifestSchema.safeParse(emptyManifest);
    expect(result.success).toBe(true);
    
    if (result.success) {
      expect(result.data.plugins.length).toBe(0);
    }
  });
  
  it('should reject missing plugins array', () => {
    const invalidManifest = {};
    
    const result = pluginsManifestSchema.safeParse(invalidManifest);
    expect(result.success).toBe(false);
  });
  
  it('should reject plugins array with invalid entries', () => {
    const invalidManifest = {
      plugins: [
        {
          slug: 'valid-plugin',
          name: 'Valid Plugin',
          location: 'remote',
          package: '@roo/test'
        },
        {
          // Missing required fields
          name: 'Invalid Plugin'
        }
      ]
    };
    
    const result = pluginsManifestSchema.safeParse(invalidManifest);
    expect(result.success).toBe(false);
  });
});
```

### Default Value Tests

These tests verify that default values are applied correctly:

```typescript
// TEST: Default values are correctly applied
describe('Plugin Schema Default Values', () => {

  it('should apply default enabled=true', () => {
    const pluginWithoutEnabled = {
      slug: 'test-plugin',
      name: 'Test Plugin',
      location: 'remote',
      package: '@roo/test'
    };
    
    const result = pluginEntrySchema.safeParse(pluginWithoutEnabled);
    expect(result.success).toBe(true);
    
    if (result.success) {
      expect(result.data.enabled).toBe(true);
    }
  });
  
  it('should preserve explicit enabled=false', () => {
    const pluginWithEnabledFalse = {
      slug: 'test-plugin',
      name: 'Test Plugin',
      location: 'remote',
      package: '@roo/test',
      enabled: false
    };
    
    const result = pluginEntrySchema.safeParse(pluginWithEnabledFalse);
    expect(result.success).toBe(true);
    
    if (result.success) {
      expect(result.data.enabled).toBe(false);
    }
  });
});
```

## Integration Tests

These tests verify that the schema integrates correctly with the rest of the codebase:

```typescript
// TEST: JSON Schema for editor is compatible with Zod schema
describe('JSON Schema Compatibility', () => {
  
  // This test needs access to the JSON schema file
  it('should validate the same examples as Zod schema', async () => {
    // Load the JSON schema
    const jsonSchemaPath = path.join(__dirname, '../../../schemas/rooplugins-schema.json');
    const jsonSchema = JSON.parse(await fs.readFile(jsonSchemaPath, 'utf8'));
    
    // Use a JSON schema validator (like Ajv)
    const ajv = new Ajv();
    const validate = ajv.compile(jsonSchema);
    
    // Test cases that should pass both validators
    const validExamples = [
      {
        plugins: [
          {
            slug: 'remote-example',
            name: 'Remote Example',
            location: 'remote',
            package: '@roo/example'
          }
        ]
      },
      {
        plugins: [
          {
            slug: 'local-example',
            name: 'Local Example',
            location: 'local',
            path: './plugins/example.js'
          }
        ]
      }
    ];
    
    for (const example of validExamples) {
      // Validate with JSON Schema
      const jsonValid = validate(example);
      expect(jsonValid).toBe(true);
      
      // Validate with Zod
      const zodResult = pluginsManifestSchema.safeParse(example);
      expect(zodResult.success).toBe(true);
    }
    
    // Test cases that should fail both validators
    const invalidExamples = [
      {
        plugins: [
          {
            slug: 'invalid-remote',
            name: 'Invalid Remote',
            location: 'remote'
            // Missing package
          }
        ]
      },
      {
        plugins: [
          {
            slug: 'invalid-local',
            name: 'Invalid Local',
            location: 'local'
            // Missing path
          }
        ]
      }
    ];
    
    for (const example of invalidExamples) {
      // Both validators should reject
      const jsonValid = validate(example);
      expect(jsonValid).toBe(false);
      
      const zodResult = pluginsManifestSchema.safeParse(example);
      expect(zodResult.success).toBe(false);
    }
  });
});
```

## Test Matrix

The test suite covers the following scenarios:

| Category | Test Case | Expected Result |
|----------|-----------|----------------|
| **Type Safety** | Valid remote plugin | TypeScript accepts |
| | Valid local plugin | TypeScript accepts |
| | Missing required fields | TypeScript error |
| | Wrong fields for plugin type | TypeScript error |
| **Validation** | Valid remote plugin | Validation passes |
| | Valid local plugin | Validation passes |
| | Optional fields included | Validation passes, fields preserved |
| | Remote without package | Validation fails |
| | Local without path | Validation fails |
| | Remote with path | Validation fails |
| | Local with package | Validation fails |
| | Invalid slug format | Validation fails |
| | Empty plugins array | Validation passes |
| | Missing plugins key | Validation fails |
| | Mixed valid/invalid entries | Validation fails |
| **Defaults** | Missing enabled field | Defaults to true |
| | Explicit enabled=false | Preserved as false |
| **Integration** | JSON Schema compatibility | Same validation results as Zod |

## Implementation Notes

- Type tests will be verified manually during development (TypeScript errors)
- Runtime validation tests will be automated with Vitest/Jest
- The JSON Schema compatibility test requires a JSON schema validator library