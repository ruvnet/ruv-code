import React from 'react';
import { VSCodeTextField, VSCodeCheckbox } from '@vscode/webview-ui-toolkit/react';
import { StepProps } from '../types';
import { useAppTranslation } from '@/i18n/TranslationContext';

/**
 * Configuration step of the wizard for location, package/path, and other settings
 */
export const ConfigurationStep: React.FC<StepProps> = ({ form, errors, onChange }) => {
  const { t } = useAppTranslation();
  
  // Categories for selection
  const categories = ["Development", "Testing", "UI", "API", "Other"];

  return (
    <>
      <div className="mb-4">
        <label className="block mb-2 text-sm font-medium">
          {t('common:pluginType') || 'Plugin Type'}
        </label>
        <select
          className="py-2 px-2 w-full bg-vscode-dropdown-background text-vscode-dropdown-foreground border border-vscode-dropdown-border rounded-md"
          value={form.location}
          onChange={(e) => onChange('location', e.target.value as "remote" | "local")}
        >
          <option value="remote">{t('common:remotePlugin') || "Remote (NPM Package)"}</option>
          <option value="local">{t('common:localPlugin') || "Local (File Path)"}</option>
        </select>
        <p className="text-xs text-vscode-descriptionForeground mt-1">
          {form.location === "remote" 
            ? (t('common:remotePluginDescription') || "Use an NPM package from a registry") 
            : (t('common:localPluginDescription') || "Use a local plugin from your filesystem")}
        </p>
      </div>
      
      {form.location === "remote" && (
        <div className="mb-4">
          <label className="block mb-2 text-sm font-medium">{t('common:packageName') || "Package Name"}</label>
          <VSCodeTextField
            placeholder="@roo/my-plugin"
            style={{ width: '100%' }}
            value={form.package}
            onChange={(e) => onChange('package', (e.target as HTMLInputElement).value)}
          />
          {errors.package && (
            <p className="text-vscode-errorForeground text-xs mt-1">{errors.package}</p>
          )}
        </div>
      )}
      
      {form.location === "local" && (
        <div className="mb-4">
          <label className="block mb-2 text-sm font-medium">{t('common:pluginPath') || "Plugin Path"}</label>
          <VSCodeTextField
            placeholder="/path/to/plugin"
            style={{ width: '100%' }}
            value={form.path}
            onChange={(e) => onChange('path', (e.target as HTMLInputElement).value)}
          />
          {errors.path && (
            <p className="text-vscode-errorForeground text-xs mt-1">{errors.path}</p>
          )}
        </div>
      )}
      
      <div className="mb-4">
        <label className="block mb-2 text-sm font-medium">{t('common:category') || "Category"}</label>
        <select
          className="py-2 px-2 w-full bg-vscode-dropdown-background text-vscode-dropdown-foreground border border-vscode-dropdown-border rounded-md"
          value={form.category}
          onChange={(e) => onChange('category', e.target.value)}
        >
          {categories.map(category => (
            <option key={category} value={category}>{category}</option>
          ))}
        </select>
      </div>
      
      <div className="mb-4">
        <VSCodeCheckbox 
          checked={form.enabled}
          onChange={(e) => onChange('enabled', (e.target as HTMLInputElement).checked)}
        >
          {t('common:enableAfterCreation') || "Enable plugin after creation"}
        </VSCodeCheckbox>
      </div>
    </>
  );
};