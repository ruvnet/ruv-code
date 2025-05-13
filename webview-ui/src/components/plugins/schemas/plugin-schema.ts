import { z } from 'zod';

// Template types
export type PluginTemplateType = 'basic' | 'advanced' | 'utility' | 'data-connector';

// Plugin template schema to describe available templates
export const pluginTemplateSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  image: z.string().optional(),
  files: z.record(z.string()).optional(),
});

export type PluginTemplate = z.infer<typeof pluginTemplateSchema>;

// Plugin configuration options
export const pluginConfigSchema = z.object({
  templateType: z.enum(['basic', 'advanced', 'utility', 'data-connector']).default('basic'),
  dependencies: z.array(z.string()).optional(),
  generateTests: z.boolean().default(false),
  strictMode: z.boolean().default(false),
  documentationLevel: z.enum(['minimal', 'standard', 'comprehensive']).default('standard'),
});

export type PluginConfig = z.infer<typeof pluginConfigSchema>;

// Common plugin properties schema
const pluginCommonSchema = z.object({
  slug: z.string()
    .regex(/^[a-z0-9-]+$/, "Slug must contain only lowercase letters, numbers, and hyphens"),
  name: z.string(),
  enabled: z.boolean().default(true),
  description: z.string().optional(),
  roleDefinition: z.string().optional(),
  customInstructions: z.string().optional(),
  groups: z.array(z.string()).optional(),
  config: pluginConfigSchema.optional(),
});

// Remote plugin schema with strict validation
const remotePluginSchema = pluginCommonSchema.extend({
  location: z.literal('remote'),
  package: z.string(),
}).strict().refine(
  data => !('path' in data),
  {
    message: "Remote plugins cannot have a path field",
    path: ['path']
  }
);

// Local plugin schema with strict validation
const localPluginSchema = pluginCommonSchema.extend({
  location: z.literal('local'),
  path: z.string(),
}).strict().refine(
  data => !('package' in data),
  {
    message: "Local plugins cannot have a package field",
    path: ['package']
  }
);

// Combined plugin entry schema (either remote or local)
export const pluginEntrySchema = z.union([
  remotePluginSchema,
  localPluginSchema
]);

// Full plugins manifest schema
export const pluginsManifestSchema = z.object({
  plugins: z.array(pluginEntrySchema)
});

// TypeScript types derived from the schemas
export type RooPluginCommon = {
  slug: string;
  name: string;
  enabled: boolean;
  description?: string;
  roleDefinition?: string;
  customInstructions?: string;
  groups?: string[];
  config?: PluginConfig;
};

export type RooRemotePlugin = RooPluginCommon & {
  location: 'remote';
  package: string;
};

export type RooLocalPlugin = RooPluginCommon & {
  location: 'local';
  path: string;
};

export type RooPluginEntry = RooRemotePlugin | RooLocalPlugin;

export type RooPluginManifest = {
  plugins: RooPluginEntry[];
};