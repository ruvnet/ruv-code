import React from 'react';
import { VSCodeTextField } from '@vscode/webview-ui-toolkit/react';
import { StepProps } from '../types';
import { useAppTranslation } from '@/i18n/TranslationContext';

/**
 * Advanced step of the wizard for role definition and custom instructions
 */
export const AdvancedStep: React.FC<StepProps> = ({ form, onChange }) => {
  const { t } = useAppTranslation();

  return (
    <>
      <div className="mb-4">
        <label className="block mb-2 text-sm font-medium">
          {t('common:roleDefinition') || "Role Definition"}
        </label>
        <VSCodeTextField
          placeholder={t('common:roleDefinitionPlaceholder') || "Define what this plugin does..."}
          style={{ width: '100%' }}
          value={form.roleDefinition}
          onChange={(e) => onChange('roleDefinition', (e.target as HTMLInputElement).value)}
        />
        <p className="text-xs text-vscode-descriptionForeground mt-1">
          {t('common:roleDefinitionHelp') || "Define the purpose and capabilities of this plugin"}
        </p>
      </div>
      
      <div className="mb-4">
        <label className="block mb-2 text-sm font-medium">
          {t('common:customInstructions') || "Custom Instructions"}
        </label>
        <textarea
          className="py-2 px-2 w-full bg-vscode-input-background text-vscode-input-foreground border border-vscode-input-border rounded-md"
          rows={3}
          placeholder={t('common:customInstructionsPlaceholder') || "Add any custom instructions for using this plugin..."}
          value={form.customInstructions}
          onChange={(e) => onChange('customInstructions', e.target.value)}
        />
        <p className="text-xs text-vscode-descriptionForeground mt-1">
          {t('common:customInstructionsHelp') || "Provide specific instructions for how the plugin should be used"}
        </p>
      </div>
    </>
  );
};