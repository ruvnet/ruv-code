import { describe, test, expect } from 'vitest';
import { PluginTemplateService } from '../services/PluginTemplateService';
import { RooPluginEntry } from '../schemas/plugin-schema';

describe('PluginTemplateService', () => {
  // Sample plugin for testing
  const sampleRemotePlugin: RooPluginEntry = {
    slug: 'test-plugin',
    name: 'Test Plugin',
    description: 'A test plugin for Roo',
    enabled: true,
    location: 'remote',
    package: '@roo/test-plugin',
    roleDefinition: 'Test role definition',
    customInstructions: 'Test custom instructions',
    groups: ['Development', 'Testing']
  };
  
  const sampleLocalPlugin: RooPluginEntry = {
    slug: 'local-test-plugin',
    name: 'Local Test Plugin',
    description: 'A local test plugin for Roo',
    enabled: true,
    location: 'local',
    path: '/path/to/plugin',
    roleDefinition: 'Local test role definition',
    groups: ['Development']
  };

  describe('renderTemplate', () => {
    test('replaces simple placeholders', () => {
      const template = 'Plugin {{name}} with slug {{slug}}';
      const result = PluginTemplateService.renderTemplate(template, sampleRemotePlugin);
      
      expect(result).toBe('Plugin Test Plugin with slug test-plugin');
    });

    test('handles conditional blocks', () => {
      const template = '{{name}}{{#if roleDefinition}}\nRole: {{roleDefinition}}{{/if}}';
      const result = PluginTemplateService.renderTemplate(template, sampleRemotePlugin);
      
      expect(result).toBe('Test Plugin\nRole: Test role definition');
    });

    test('skips conditional blocks when condition is false', () => {
      const template = '{{name}}{{#if nonexistentField}}\nThis won\'t appear{{/if}}';
      const result = PluginTemplateService.renderTemplate(template, sampleRemotePlugin);
      
      expect(result).toBe('Test Plugin');
    });
  });

  describe('getPackageJson', () => {
    test('generates package.json for remote plugin', () => {
      const result = PluginTemplateService.getPackageJson(sampleRemotePlugin);
      
      expect(result).toContain('"name": "@roo/test-plugin"');
      expect(result).toContain('"description": "A test plugin for Roo"');
      expect(result).toContain('"keywords": [');
      expect(result).toContain('"plugin": true');
    });
    
    test('generates package.json for local plugin', () => {
      const result = PluginTemplateService.getPackageJson(sampleLocalPlugin);
      
      expect(result).toContain('"name": "@roo/local-test-plugin"');
      expect(result).toContain('"description": "A local test plugin for Roo"');
    });
  });

  describe('getIndexJs', () => {
    test('generates index.js with all plugin fields', () => {
      const result = PluginTemplateService.getIndexJs(sampleRemotePlugin);
      
      expect(result).toContain('Test Plugin - Roo Plugin');
      expect(result).toContain('slug: \'test-plugin\'');
      expect(result).toContain('roleDefinition: `Test role definition`');
      expect(result).toContain('customInstructions: `Test custom instructions`');
      expect(result).toContain('onActivate: async () => {');
      expect(result).toContain('onDeactivate: async () => {');
    });
    
    test('generates index.js without optional fields', () => {
      const minimalPlugin: RooPluginEntry = {
        slug: 'minimal-plugin',
        name: 'Minimal Plugin',
        enabled: true,
        location: 'remote',
        package: '@roo/minimal-plugin'
      };
      
      const result = PluginTemplateService.getIndexJs(minimalPlugin);
      
      expect(result).toContain('Minimal Plugin - Roo Plugin');
      expect(result).toContain('slug: \'minimal-plugin\'');
      expect(result).not.toContain('roleDefinition');
      expect(result).not.toContain('customInstructions');
    });
  });

  describe('getRooPluginsConfig', () => {
    test('generates .rooplugins config with all fields', () => {
      const result = PluginTemplateService.getRooPluginsConfig(sampleRemotePlugin);
      
      const parsed = JSON.parse(result);
      expect(parsed.slug).toBe('test-plugin');
      expect(parsed.name).toBe('Test Plugin');
      expect(parsed.enabled).toBe(true);
      expect(parsed.roleDefinition).toBe('Test role definition');
      expect(parsed.customInstructions).toBe('Test custom instructions');
      expect(parsed.groups).toEqual(['Development', 'Testing']);
    });
    
    test('generates .rooplugins config without optional fields', () => {
      const minimalPlugin: RooPluginEntry = {
        slug: 'minimal-plugin',
        name: 'Minimal Plugin',
        enabled: true,
        location: 'remote',
        package: '@roo/minimal-plugin'
      };
      
      const result = PluginTemplateService.getRooPluginsConfig(minimalPlugin);
      const parsed = JSON.parse(result);
      
      expect(parsed.slug).toBe('minimal-plugin');
      expect(parsed.name).toBe('Minimal Plugin');
      expect(parsed).not.toHaveProperty('roleDefinition');
      expect(parsed).not.toHaveProperty('customInstructions');
      expect(parsed).not.toHaveProperty('groups');
    });
  });

  describe('getReadme', () => {
    test('generates README with remote plugin details', () => {
      const result = PluginTemplateService.getReadme(sampleRemotePlugin);
      
      expect(result).toContain('# Test Plugin');
      expect(result).toContain('A test plugin for Roo');
      expect(result).toContain('npm install @roo/test-plugin');
      expect(result).toContain('"slug": "test-plugin"');
    });
    
    test('generates README with local plugin details', () => {
      const result = PluginTemplateService.getReadme(sampleLocalPlugin);
      
      expect(result).toContain('# Local Test Plugin');
      expect(result).toContain('A local test plugin for Roo');
      expect(result).toContain('npm install @roo/local-test-plugin');
      expect(result).toContain('"slug": "local-test-plugin"');
    });
  });

  describe('generateTemplateFiles', () => {
    test('generates all template files', () => {
      const result = PluginTemplateService.generateTemplateFiles(sampleRemotePlugin);
      
      expect(result).toHaveProperty('packageJson');
      expect(result).toHaveProperty('indexJs');
      expect(result).toHaveProperty('rooPluginsConfig');
      expect(result).toHaveProperty('readme');
      
      // Verify each property is a string with content
      expect(typeof result.packageJson).toBe('string');
      expect(result.packageJson.length).toBeGreaterThan(10);
      
      expect(typeof result.indexJs).toBe('string');
      expect(result.indexJs.length).toBeGreaterThan(10);
      
      expect(typeof result.rooPluginsConfig).toBe('string');
      expect(result.rooPluginsConfig.length).toBeGreaterThan(10);
      
      expect(typeof result.readme).toBe('string');
      expect(result.readme.length).toBeGreaterThan(10);
    });
  });
});