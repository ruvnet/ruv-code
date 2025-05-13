import React from 'react';
import { Button } from '@/components/ui/button';
import { Save } from 'lucide-react';
import { StepProps } from '../types';
import { useAppTranslation } from '@/i18n/TranslationContext';

/**
 * Final completion step of the plugin wizard
 */
export const CompleteStep: React.FC<StepProps & { onFinish: () => void }> = ({ 
  form, 
  onFinish 
}) => {
  const { t } = useAppTranslation();

  return (
    <div className="mb-4">
      <div className="text-center py-6">
        <div className="bg-vscode-button-background rounded-full h-16 w-16 flex items-center justify-center mx-auto mb-4">
          <Save size={32} className="text-vscode-foreground" />
        </div>
        
        <h3 className="text-xl font-medium mb-2">
          {t('common:pluginCreatedSuccess') || "Plugin Created Successfully!"}
        </h3>
        <p className="text-sm text-vscode-descriptionForeground mb-4">
          {form.name} {t('common:hasBeenCreated') || "has been successfully created and is ready to use."}
        </p>
        
        <Button 
          className="flex items-center mx-auto" 
          onClick={onFinish}
        >
          {t('common:viewInstalledPlugins') || "View Installed Plugins"}
        </Button>
      </div>
    </div>
  );
};