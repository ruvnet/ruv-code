import { z } from 'zod';

// Common plugin properties schema
const pluginCommonSchema = z.object({
  slug: z.string()
    .regex(/^[a-z0-9-]+$/, "Slug must contain only lowercase letters, numbers, and hyphens"),
  name: z.string(),
  enabled: z.boolean().default(true),
  roleDefinition: z.string().optional(),
  customInstructions: z.string().optional(),
  groups: z.array(z.string()).optional(),
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
  roleDefinition?: string;
  customInstructions?: string;
  groups?: string[];
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