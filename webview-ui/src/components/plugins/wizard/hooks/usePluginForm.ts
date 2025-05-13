import { useState, useEffect } from 'react';
import { FormErrors, PluginForm } from '../types';
import { slugify, isValidSlug } from '../utils/slugify';

/**
 * Hook for managing plugin form state and validation
 */
export function usePluginForm() {
  // Initial form state
  const [form, setForm] = useState<PluginForm>({
    slug: '',
    name: '',
    description: '',
    location: 'remote',
    package: '',
    path: '',
    enabled: true,
    category: 'Development',
    roleDefinition: '',
    customInstructions: '',
  });

  // Form validation errors
  const [errors, setErrors] = useState<FormErrors>({});

  // When location changes, clear irrelevant field
  useEffect(() => {
    if (form.location === 'remote') {
      setForm(prev => ({ ...prev, path: '' }));
    } else {
      setForm(prev => ({ ...prev, package: '' }));
    }
  }, [form.location]);

  // Generate slug from name
  useEffect(() => {
    if (form.name && !form.slug) {
      setForm(prev => ({ ...prev, slug: slugify(form.name) }));
    }
  }, [form.name, form.slug]);

  // Handle form field changes
  const handleChange = (field: keyof PluginForm, value: string | boolean) => {
    setForm(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Clear error when field is changed
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  // Validate basic info step
  const validateBasicInfo = (): boolean => {
    const newErrors: FormErrors = {};
    
    if (!form.name.trim()) {
      newErrors.name = 'Name is required';
    }
    
    if (!form.slug.trim()) {
      newErrors.slug = 'Slug is required';
    } else if (!isValidSlug(form.slug)) {
      newErrors.slug = 'Invalid slug format (use lowercase letters, numbers, and hyphens)';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Validate configuration step
  const validateConfiguration = (): boolean => {
    const newErrors: FormErrors = {};
    
    if (form.location === 'remote' && !form.package?.trim()) {
      newErrors.package = 'Package name is required';
    }
    
    if (form.location === 'local' && !form.path?.trim()) {
      newErrors.path = 'Path is required';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  return {
    form,
    setForm,
    errors,
    setErrors,
    handleChange,
    validateBasicInfo,
    validateConfiguration,
  };
}