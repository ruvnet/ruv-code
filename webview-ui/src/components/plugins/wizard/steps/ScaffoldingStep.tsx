import React from 'react';
import { AlertCircle, Wand2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PluginExtensionIntegration } from '../../services/PluginExtensionIntegration';
import { StepProps } from '../types';
import { ScaffoldStatus } from '../types';
import { useAppTranslation } from '@/i18n/TranslationContext';

interface ScaffoldingStepProps extends StepProps {
  scaffoldStatus: ScaffoldStatus;
}

/**
 * Scaffolding step of the wizard that shows progress and logs
 */
export const ScaffoldingStep: React.FC<ScaffoldingStepProps> = ({ 
  form, 
  errors, 
  scaffoldStatus 
}) => {
  const { t } = useAppTranslation();
  const { isLoading, progress, logs, timeoutError } = scaffoldStatus;

  return (
    <div className="mb-4">
      <div className="mb-4">
        <h3 className="text-lg font-medium mb-2">
          {t('common:createPlugin') || "Create Plugin"}
        </h3>
        <p className="text-sm text-vscode-descriptionForeground mb-4">
          {t('common:pluginWelcomeDescription') || "Creating the plugin structure and files"}
        </p>
        
        {/* Progress bar */}
        <div className="w-full bg-vscode-editor-background rounded-full h-2.5 mb-4 dark:bg-gray-700">
          <div 
            className="bg-vscode-button-background h-2.5 rounded-full transition-all duration-300" 
            style={{ width: `${progress}%` }}
          ></div>
        </div>
        
        {/* Log output */}
        <div className="bg-vscode-editor-background p-3 rounded max-h-60 overflow-y-auto font-mono text-sm">
          {logs.map((log, index) => (
            <div key={index} className="mb-1">{log}</div>
          ))}
          {isLoading && <div className="animate-pulse">_</div>}
        </div>
      </div>
      
      {/* Display error if any */}
      {errors.general && (
        <div className="mb-4 p-2 bg-vscode-errorBackground text-vscode-errorForeground rounded flex items-start gap-2">
          <AlertCircle size={18} className="mt-0.5" />
          <div>{errors.general}</div>
        </div>
      )}
      
      {/* Display recovery options for timeout errors */}
      {timeoutError && !isLoading && (
        <div className="mt-4 p-3 border border-vscode-panelBorder rounded">
          <h4 className="font-medium mb-2">Recovery Options:</h4>
          <ul className="list-disc pl-5 mb-3 text-sm">
            <li>The plugin might still be created correctly despite the timeout</li>
            <li>You can check in the .roo/plugins/{form.slug}/ directory to verify</li>
            <li>The plugin may be registered in the plugin list already</li>
          </ul>
          
          {/* SPARC CLI alternative option */}
          <div className="mt-4 pt-4 border-t border-vscode-panelBorder">
            <h4 className="font-medium mb-2">Alternative Method:</h4>
            <p className="text-sm mb-3">Try using the SPARC CLI method which may be more reliable:</p>
            <Button
              type="button"
              variant="secondary"
              className="flex items-center gap-2"
              onClick={async () => {
                try {
                  // Convert the form to a plugin entry
                  const plugin = {
                    slug: form.slug,
                    name: form.name,
                    description: form.description,
                    location: 'local' as const,
                    enabled: true,
                    path: `./.roo/plugins/${form.slug}`
                    // Optional fields like author and version can be added in the SparcCliService
                  };
                  
                  // Call the SPARC CLI service
                  const result = await PluginExtensionIntegration.createSparcPlugin(plugin);
                  
                  if (result.success) {
                    // Add success log
                    scaffoldStatus.logs.push('🚀 SPARC CLI successfully created the plugin!');
                  } else {
                    // Add error log
                    scaffoldStatus.logs.push(`❌ SPARC CLI error: ${result.error}`);
                  }
                } catch (error) {
                  // Add error log
                  scaffoldStatus.logs.push(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
                }
              }}
            >
              <Wand2 size={16} />
              Use SPARC CLI
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};