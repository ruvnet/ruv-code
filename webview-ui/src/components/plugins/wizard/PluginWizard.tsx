import React, { useState } from 'react';
import { useAppTranslation } from '@/i18n/TranslationContext';
import {
  Wand2,
  ChevronRight,
  ChevronLeft,
  FileCode,
  RefreshCw
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Section } from '@/components/settings/Section';
import { SectionHeader } from '@/components/plugins/SectionHeader';

// Import types from our types file
import { PluginWizardProps, WizardStep, ScaffoldStatus } from './types';
import { usePluginForm } from './hooks/usePluginForm';

// Import the PluginExtensionIntegration for communication with the extension
import { PluginExtensionIntegration } from '../services/PluginExtensionIntegration';

// Import all our step components
import {
  BasicInfoStep,
  ConfigurationStep,
  AdvancedStep,
  ScaffoldingStep,
  CompleteStep
} from './steps';

// Import RooPlugin schema to convert form to plugin entry
import { RooPluginEntry } from '../schemas/plugin-schema';

/**
 * The PluginWizard component that guides users through creating a new plugin
 * with improved chunked scaffolding to prevent timeouts
 */
export const PluginWizard: React.FC<PluginWizardProps> = ({ onClose, onSave }) => {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { t } = useAppTranslation();
  
  // Use our custom hook for form state and validation
  const {
    form,
    errors,
    setErrors,
    handleChange,
    validateBasicInfo,
    validateConfiguration
  } = usePluginForm();
  
  // Wizard step tracking
  const [currentStep, setCurrentStep] = useState<WizardStep>('basic');
  
  // Scaffolding status
  const [scaffoldStatus, setScaffoldStatus] = useState<ScaffoldStatus>({
    isLoading: false,
    progress: 0,
    logs: [],
    timeoutError: false
  });
  
  // Helper to add a log message
  const addLog = (message: string) => {
    setScaffoldStatus(prev => ({
      ...prev,
      logs: [...prev.logs, message]
    }));
  };
  
  // Navigation between steps
  const nextStep = () => {
    if (currentStep === 'basic') {
      if (validateBasicInfo()) {
        setCurrentStep('configuration');
      }
    } else if (currentStep === 'configuration') {
      if (validateConfiguration()) {
        setCurrentStep('advanced');
      }
    } else if (currentStep === 'advanced') {
      setCurrentStep('scaffold');
      startScaffolding();
    } else if (currentStep === 'scaffold' && !scaffoldStatus.isLoading) {
      // If we're on the scaffold step and not currently loading, this is the "retry" scenario
      startScaffolding();
    }
  };
  
  const prevStep = () => {
    if (currentStep === 'configuration') {
      setCurrentStep('basic');
    } else if (currentStep === 'advanced') {
      setCurrentStep('configuration');
    } else if (currentStep === 'scaffold' && !scaffoldStatus.isLoading) {
      setCurrentStep('advanced');
    }
  };

  // Convert form to proper RooPluginEntry
  const getPluginFromForm = (): RooPluginEntry => {
    return form.location === "remote"
      ? {
          slug: form.slug,
          name: form.name,
          enabled: form.enabled,
          location: "remote",
          package: form.package!,
          roleDefinition: form.roleDefinition || undefined,
          customInstructions: form.customInstructions || undefined,
          groups: form.category ? [form.category] : undefined
        }
      : {
          slug: form.slug,
          name: form.name,
          enabled: form.enabled,
          location: "local",
          path: form.path!,
          roleDefinition: form.roleDefinition || undefined,
          customInstructions: form.customInstructions || undefined,
          groups: form.category ? [form.category] : undefined
        };
  };

  // Create the plugin using a chunked approach to avoid timeouts
  const startScaffolding = async () => {
    // Reset scaffolding state
    setScaffoldStatus({
      isLoading: true,
      progress: 0,
      logs: [`Creating plugin: ${form.name}`],
      timeoutError: false
    });
    
    setErrors({});
    
    try {
      const plugin = getPluginFromForm();
      
      // STEP 1: Initialize plugin directories (quick operation)
      addLog('Preparing plugin structure...');
      setScaffoldStatus(prev => ({ ...prev, progress: 10 }));
      
      addLog(`Setting up plugin directory in .roo/plugins/${plugin.slug}/`);
      setScaffoldStatus(prev => ({ ...prev, progress: 20 }));
      
      const initResult = await PluginExtensionIntegration.scaffoldPluginInit(plugin);
      
      if (!initResult.success) {
        throw new Error(initResult.error || 'Failed to initialize plugin structure');
      }
      
      addLog('Created base directory structure');
      setScaffoldStatus(prev => ({ ...prev, progress: 30 }));
      
      // STEP 2: Create plugin content files (slower operation)
      addLog('Generating plugin files (this may take a moment)...');
      setScaffoldStatus(prev => ({ ...prev, progress: 40 }));
      
      const contentResult = await PluginExtensionIntegration.scaffoldPluginContent(plugin);
      
      if (!contentResult.success && !contentResult.partialSuccess) {
        throw new Error(contentResult.error || 'Failed to create plugin files');
      }
      
      if (contentResult.partialSuccess) {
        addLog('Warning: Some plugin files may be incomplete');
      }
      
      addLog('Created package.json with plugin metadata');
      setScaffoldStatus(prev => ({ ...prev, progress: 60 }));
      
      addLog('Created index.js entry point');
      setScaffoldStatus(prev => ({ ...prev, progress: 70 }));
      
      addLog('Created .rooplugins configuration');
      setScaffoldStatus(prev => ({ ...prev, progress: 80 }));
      
      // STEP 3: Register the plugin in the manifest (quick operation)
      addLog('Registering plugin in manifest...');
      setScaffoldStatus(prev => ({ ...prev, progress: 90 }));
      
      await onSave(plugin);
      
      addLog('Plugin creation completed!');
      setScaffoldStatus(prev => ({ ...prev, progress: 100, isLoading: false }));
      
      // Show complete step
      setCurrentStep('complete');
      
    } catch (error) {
      console.error("Error scaffolding plugin:", error);
      
      // Determine if this was a timeout error
      const isTimeout = error instanceof Error && error.message.includes('timed out');
      
      if (isTimeout) {
        setScaffoldStatus(prev => ({ 
          ...prev, 
          timeoutError: true,
          isLoading: false
        }));
        
        addLog('Warning: Operation took longer than expected. This often happens with large plugins.');
        addLog('The plugin may still be created in the background.');
        addLog(`You can check the .roo/plugins/${form.slug}/ directory to verify.`);
        
        // Try to register the plugin anyway
        try {
          addLog('Attempting to register plugin in manifest anyway...');
          await onSave(getPluginFromForm());
          addLog('Registration attempted. Check the plugins list to verify.');
        } catch (saveError) {
          addLog(`Could not register plugin: ${saveError instanceof Error ? saveError.message : String(saveError)}`);
        }
      } else {
        setScaffoldStatus(prev => ({ ...prev, isLoading: false }));
        addLog(`Error: ${error instanceof Error ? error.message : "An unexpected error occurred"}`);
      }
      
      setErrors({
        general: isTimeout 
          ? "Operation timed out. The plugin may still be created in the background." 
          : (error instanceof Error ? error.message : "An unexpected error occurred")
      });
    }
  };

  // Render wizard content based on current step
  const renderStepContent = () => {
    switch (currentStep) {
      case 'basic':
        return (
          <BasicInfoStep 
            form={form} 
            errors={errors} 
            onChange={handleChange} 
            onNext={nextStep}
            onPrev={prevStep}
          />
        );
      
      case 'configuration':
        return (
          <ConfigurationStep 
            form={form} 
            errors={errors} 
            onChange={handleChange} 
            onNext={nextStep}
            onPrev={prevStep}
          />
        );
      
      case 'advanced':
        return (
          <AdvancedStep 
            form={form} 
            errors={errors} 
            onChange={handleChange} 
            onNext={nextStep}
            onPrev={prevStep}
          />
        );
      
      case 'scaffold':
        return (
          <ScaffoldingStep 
            form={form} 
            errors={errors} 
            onChange={handleChange} 
            onNext={nextStep}
            onPrev={prevStep}
            scaffoldStatus={scaffoldStatus}
          />
        );
      
      case 'complete':
        return (
          <CompleteStep 
            form={form} 
            errors={errors} 
            onChange={handleChange} 
            onNext={nextStep}
            onPrev={prevStep}
            onFinish={onClose}
          />
        );
      
      default:
        return null;
    }
  };

  return (
    <div>
      <SectionHeader>
        <div className="flex items-center gap-2">
          <Wand2 className="w-4" />
          <div>Plugin Wizard</div>
        </div>
      </SectionHeader>

      <Section>
        {/* Steps indicator */}
        <div className="mb-3">
          {/* Current step indicator */}
          <div className="flex items-center justify-between mb-3 border-b border-vscode-panelBorder pb-3">
            <div className="flex items-center">
              <div className={`flex items-center justify-center h-8 w-8 rounded-full text-sm font-medium bg-vscode-button-background text-vscode-foreground mr-3`}>
                {['basic', 'configuration', 'advanced', 'scaffold', 'complete'].indexOf(currentStep) + 1}
              </div>
              <div className="font-medium">
                {currentStep === 'basic' && "Basic Info"}
                {currentStep === 'configuration' && "Configuration"}
                {currentStep === 'advanced' && "Advanced Options"}
                {currentStep === 'scaffold' && "Create Plugin"}
                {currentStep === 'complete' && "Complete"}
              </div>
            </div>
            <div className="text-sm text-vscode-descriptionForeground">
              Step {['basic', 'configuration', 'advanced', 'scaffold', 'complete'].indexOf(currentStep) + 1} of 5
            </div>
          </div>
          
          {/* Progress bar */}
          <div className="w-full bg-vscode-editor-background h-1 mb-6">
            <div
              className="h-1 bg-vscode-button-background transition-all duration-300"
              style={{
                width: `${((['basic', 'configuration', 'advanced', 'scaffold', 'complete'].indexOf(currentStep) + 1) / 5) * 100}%`
              }}
            ></div>
          </div>
        </div>
        
        {/* Step content */}
        <div className="mb-4">
          <div className="bg-vscode-editor-background p-4 rounded-md border border-vscode-panelBorder">
            <div className="border-b border-vscode-panelBorder pb-3 mb-4">
              <h2 className="text-lg font-medium">
                {currentStep === 'basic' && "Basic Info"}
                {currentStep === 'configuration' && "Configuration"}
                {currentStep === 'advanced' && "Advanced Options"}
                {currentStep === 'scaffold' && "Create Plugin"}
                {currentStep === 'complete' && "Complete"}
              </h2>
              <p className="text-sm text-vscode-descriptionForeground mt-1">
                {currentStep === 'basic' && "Enter the basic information about your plugin"}
                {currentStep === 'configuration' && "Configure how your plugin will be installed and used"}
                {currentStep === 'advanced' && "Set advanced options for your plugin"}
                {currentStep === 'scaffold' && "Creating the plugin structure and files"}
                {currentStep === 'complete' && "Your plugin has been created successfully"}
              </p>
            </div>
            
            {renderStepContent()}
          </div>
        </div>
        
        {/* Navigation buttons */}
        {currentStep !== 'complete' && (
          <div className="flex flex-col sm:flex-row justify-between gap-3">
            <Button
              variant="outline"
              onClick={currentStep === 'basic' ? onClose : prevStep}
              disabled={currentStep === 'scaffold' && scaffoldStatus.isLoading}
            >
              {currentStep === 'basic' ? "Cancel" : (
                <>
                  <ChevronLeft size={16} className="mr-1" />
                  Back
                </>
              )}
            </Button>
            
            <Button 
              onClick={nextStep}
              className="flex items-center"
              disabled={(currentStep === 'scaffold' && scaffoldStatus.isLoading)}
            >
              {currentStep === 'scaffold' ? (
                scaffoldStatus.isLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-t-transparent border-white rounded-full animate-spin mr-1" />
                    Creating...
                  </>
                ) : scaffoldStatus.timeoutError ? (
                  <>
                    <RefreshCw size={16} className="mr-1" />
                    Retry
                  </>
                ) : (
                  <>
                    <FileCode size={16} className="mr-1" />
                    Create Now
                  </>
                )
              ) : (
                <>
                  Next
                  <ChevronRight size={16} className="ml-1" />
                </>
              )}
            </Button>
          </div>
        )}
      </Section>
    </div>
  );
};