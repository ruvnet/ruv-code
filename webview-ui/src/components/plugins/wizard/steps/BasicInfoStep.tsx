import React from 'react';
import { VSCodeTextField } from '@vscode/webview-ui-toolkit/react';
import { StepProps } from '../types';
import { useAppTranslation } from '@/i18n/TranslationContext';

/**
 * First step of the wizard for basic plugin information
 */
export const BasicInfoStep: React.FC<StepProps> = ({ form, errors, onChange }) => {
  const { t } = useAppTranslation();

  return (
    <>
      <div className="mb-4">
        <label className="block mb-2 text-sm font-medium">
          {t('common:pluginName') || 'Plugin Name'}
        </label>
        <VSCodeTextField 
          placeholder={t('common:pluginNamePlaceholder') || 'My Awesome Plugin'}
          style={{ width: '100%' }}
          value={form.name}
          onChange={(e) => onChange('name', (e.target as HTMLInputElement).value)}
        />
        {errors.name && (
          <p className="text-vscode-errorForeground text-xs mt-1">{errors.name}</p>
        )}
      </div>
      
      <div className="mb-4">
        <label className="block mb-2 text-sm font-medium">
          {t('common:description') || 'Description'}
        </label>
        <VSCodeTextField 
          placeholder={t('common:descriptionPlaceholder') || 'Describe what your plugin does'}
          style={{ width: '100%' }}
          value={form.description}
          onChange={(e) => onChange('description', (e.target as HTMLInputElement).value)}
        />
      </div>
      
      <div className="mb-4">
        <label className="block mb-2 text-sm font-medium">
          {t('common:pluginSlug') || 'Plugin Slug'}
        </label>
        <VSCodeTextField
          placeholder="my-awesome-plugin"
          style={{ width: '100%' }}
          value={form.slug}
          onChange={(e) => onChange('slug', (e.target as HTMLInputElement).value)}
        />
        {errors.slug && (
          <p className="text-vscode-errorForeground text-xs mt-1">{errors.slug}</p>
        )}
        <p className="text-xs text-vscode-descriptionForeground mt-1">
          {t('common:slugDescription') || 'A unique identifier for your plugin (lowercase, alphanumeric with hyphens)'}
        </p>
      </div>
    </>
  );
};