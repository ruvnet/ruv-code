import { PluginForm, FormErrors } from '../types';
import { isValidSlug } from './slugify';

/**
 * Validates the basic information step of the wizard
 * 
 * @param form The current form state
 * @param t Translation function
 * @returns Object containing validation errors if any
 */
export function validateBasicInfo(form: PluginForm, t: (key: string) => string): FormErrors {
  const errors: FormErrors = {};
  
  if (!form.name.trim()) {
    errors.name = t("common:nameRequired");
  }
  
  if (!form.slug.trim()) {
    errors.slug = t("common:slugRequired");
  } else if (!isValidSlug(form.slug)) {
    errors.slug = t("common:invalidSlugFormat");
  }
  
  return errors;
}

/**
 * Validates the configuration step of the wizard
 * 
 * @param form The current form state
 * @param t Translation function
 * @returns Object containing validation errors if any
 */
export function validateConfiguration(form: PluginForm, t: (key: string) => string): FormErrors {
  const errors: FormErrors = {};
  
  if (form.location === "remote" && !form.package?.trim()) {
    errors.package = t("common:packageRequired");
  }
  
  if (form.location === "local" && !form.path?.trim()) {
    errors.path = t("common:pathRequired");
  }
  
  return errors;
}

/**
 * Validates the advanced step of the wizard
 * Currently, there are no required fields in the advanced step
 * 
 * @param form The current form state
 * @returns Empty error object (no validation required for advanced step)
 */
export function validateAdvanced(): FormErrors {
  return {};
}

/**
 * Formats a plugin creation error appropriately
 * 
 * @param error The error object or message
 * @param isTimeout Whether this is a timeout error
 * @returns Formatted error message
 */
export function formatPluginError(error: unknown, isTimeout: boolean = false): string {
  if (isTimeout) {
    return "Operation timed out. The plugin may still be created in the background.";
  }
  
  return error instanceof Error ? error.message : "An unexpected error occurred";
}