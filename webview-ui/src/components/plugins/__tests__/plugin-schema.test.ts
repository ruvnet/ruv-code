import { pluginEntrySchema, pluginsManifestSchema } from '../schemas/plugin-schema';
import { describe, test, expect } from 'vitest';

describe('Plugin Manifest Schema Validation', () => {
  describe('Plugin Entry Schema', () => {
    test('validates valid remote plugin entries', () => {
      const validRemotePlugin = {
        slug: 'test-plugin',
        name: 'Test Plugin',
        enabled: true,
        location: 'remote' as const,
        package: '@roo/test-plugin',
        roleDefinition: 'A test plugin for Roo',
        customInstructions: 'Custom instructions for the plugin',
        groups: ['development', 'testing']
      };

      const result = pluginEntrySchema.safeParse(validRemotePlugin);
      expect(result.success).toBe(true);
    });

    test('validates valid local plugin entries', () => {
      const validLocalPlugin = {
        slug: 'local-plugin',
        name: 'Local Plugin',
        enabled: true,
        location: 'local' as const,
        path: '/path/to/local/plugin',
        roleDefinition: 'A local test plugin',
        groups: ['development']
      };

      const result = pluginEntrySchema.safeParse(validLocalPlugin);
      expect(result.success).toBe(true);
    });

    test('rejects remote plugins with path field', () => {
      const invalidRemotePlugin = {
        slug: 'remote-with-path',
        name: 'Invalid Remote Plugin',
        enabled: true,
        location: 'remote' as const,
        package: '@roo/test-plugin',
        path: '/some/path' // Invalid for remote plugins
      };

      const result = pluginEntrySchema.safeParse(invalidRemotePlugin);
      expect(result.success).toBe(false);
      if (!result.success) {
        // The key point is the validation fails with an error about the path field
        expect(result.error.issues[0].message).toContain('path');
      }
    });

    test('rejects local plugins with package field', () => {
      const invalidLocalPlugin = {
        slug: 'local-with-package',
        name: 'Invalid Local Plugin',
        enabled: true,
        location: 'local' as const,
        path: '/path/to/plugin',
        package: '@roo/some-package' // Invalid for local plugins
      };

      const result = pluginEntrySchema.safeParse(invalidLocalPlugin);
      expect(result.success).toBe(false);
      if (!result.success) {
        // The key point is the validation fails with an error about the package field
        expect(result.error.issues[0].message).toContain('package');
      }
    });

    test('rejects invalid slug formats', () => {
      const invalidSlugPlugin = {
        slug: 'Invalid_Slug!',  // Invalid slug format
        name: 'Invalid Slug Plugin',
        enabled: true,
        location: 'remote' as const,
        package: '@roo/test-plugin'
      };

      const result = pluginEntrySchema.safeParse(invalidSlugPlugin);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('Slug must contain only lowercase letters');
      }
    });
  });

  describe('Full Manifest Schema', () => {
    test('validates a complete manifest with multiple plugins', () => {
      const validManifest = {
        plugins: [
          {
            slug: 'remote-plugin',
            name: 'Remote Plugin',
            enabled: true,
            location: 'remote' as const,
            package: '@roo/remote-plugin'
          },
          {
            slug: 'local-plugin',
            name: 'Local Plugin',
            enabled: false,
            location: 'local' as const,
            path: '/path/to/local/plugin'
          }
        ]
      };

      const result = pluginsManifestSchema.safeParse(validManifest);
      expect(result.success).toBe(true);
    });

    test('rejects manifest with invalid plugin entries', () => {
      const invalidManifest = {
        plugins: [
          {
            slug: 'valid-plugin',
            name: 'Valid Plugin',
            enabled: true,
            location: 'remote' as const,
            package: '@roo/valid-plugin'
          },
          {
            slug: 'invalid-plugin',
            name: 'Invalid Plugin',
            enabled: true,
            location: 'local' as const,
            // Missing required 'path' field for local plugins
          }
        ]
      };

      const result = pluginsManifestSchema.safeParse(invalidManifest);
      expect(result.success).toBe(false);
    });

    test('handles plugins with enabled defaulting to true', () => {
      const manifestWithEnabledDefault = {
        plugins: [
          {
            slug: 'plugin-no-enabled',
            name: 'Plugin Without Enabled Flag',
            location: 'remote' as const,
            package: '@roo/test-plugin'
            // No enabled flag, should default to true
          }
        ]
      };

      const result = pluginsManifestSchema.safeParse(manifestWithEnabledDefault);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.plugins[0].enabled).toBe(true);
      }
    });
  });
});