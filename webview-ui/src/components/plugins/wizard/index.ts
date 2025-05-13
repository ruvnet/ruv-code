/**
 * Plugin Wizard - A modular plugin creation wizard
 * 
 * This module exports a more maintainable version of the plugin wizard with
 * separation of concerns to prevent timeout issues and improve code organization.
 */

// Export the main wizard component
export { PluginWizard } from './PluginWizard';

// Export types
export * from './types';

// Export hooks for reuse
export { usePluginForm } from './hooks/usePluginForm';
export { useWizardNavigation } from './hooks/useWizardNavigation';
export { usePluginScaffolding } from './hooks/usePluginScaffolding';

// Export utilities
export { slugify, isValidSlug } from './utils/slugify';
export { 
  validateBasicInfo,
  validateConfiguration,
  validateAdvanced,
  formatPluginError
} from './utils/validation';

// Export services
export { PluginScaffoldService } from './services/PluginScaffoldService';