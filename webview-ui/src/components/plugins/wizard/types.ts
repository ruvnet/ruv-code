import { RooPluginEntry } from '../schemas/plugin-schema';

/**
 * Props for the main PluginWizard component
 */
export interface PluginWizardProps {
  onClose: () => void;
  onSave: (plugin: RooPluginEntry) => Promise<void>;
}

/**
 * Steps in the plugin creation wizard
 */
export type WizardStep = 'basic' | 'configuration' | 'advanced' | 'scaffold' | 'complete';

/**
 * Form data for the plugin creation
 */
export interface PluginForm {
  slug: string;
  name: string;
  description: string;
  location: 'remote' | 'local';
  package?: string;
  path?: string;
  enabled: boolean;
  category?: string;
  roleDefinition: string;
  customInstructions: string;
}

/**
 * Common props for all step components
 */
export interface StepProps {
  form: PluginForm;
  errors: FormErrors;
  onChange: (field: keyof PluginForm, value: string | boolean) => void;
  onNext: () => void;
  onPrev: () => void;
}

/**
 * Form validation errors
 */
export interface FormErrors {
  [key: string]: string;
}

/**
 * Status of the scaffolding process
 */
export interface ScaffoldStatus {
  isLoading: boolean;
  progress: number;
  logs: string[];
  timeoutError: boolean;
}

/**
 * Result of a scaffolding operation
 */
export interface ScaffoldResult {
  success: boolean;
  error?: string;
  partialSuccess?: boolean;
}