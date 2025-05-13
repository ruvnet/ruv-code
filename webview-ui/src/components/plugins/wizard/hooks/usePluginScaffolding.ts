import { useState } from 'react';
import { RooPluginEntry } from '../../schemas/plugin-schema';
import { PluginForm, ScaffoldStatus, FormErrors } from '../types';
import { PluginScaffoldService } from '../services/PluginScaffoldService';
import { formatPluginError } from '../utils/validation';

interface UsePluginScaffoldingProps {
  form: PluginForm;
  onSave: (plugin: RooPluginEntry) => Promise<void>;
  onComplete: () => void;
}

/**
 * Custom hook for managing plugin scaffolding operations
 * 
 * @param props Form data and callbacks
 * @returns Scaffolding status and methods
 */
export function usePluginScaffolding(props: UsePluginScaffoldingProps) {
  const { form, onSave, onComplete } = props;
  
  // Scaffolding state
  const [status, setStatus] = useState<ScaffoldStatus>({
    isLoading: false,
    progress: 0,
    logs: [],
    timeoutError: false
  });
  
  // Form errors
  const [errors, setErrors] = useState<FormErrors>({});
  
  /**
   * Add a log entry and update progress
   * 
   * @param message Log message to add
   * @param progress Optional progress value to set
   */
  const addLog = (message: string, progress?: number) => {
    setStatus(prev => ({
      ...prev,
      logs: [...prev.logs, message],
      progress: progress !== undefined ? progress : prev.progress
    }));
  };
  
  /**
   * Start the scaffolding process in chunks to prevent timeouts
   */
  const startScaffolding = async () => {
    setStatus({
      isLoading: true,
      progress: 0,
      logs: [],
      timeoutError: false
    });
    setErrors({});
    
    try {
      // Initial log entry
      addLog(`Creating plugin: ${form.name}`, 5);
      
      // Convert form to proper RooPluginEntry
      const plugin: RooPluginEntry = form.location === "remote"
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
      
      // Step 1: Initialize plugin (create base directory)
      addLog(`Preparing plugin structure...`, 10);
      addLog(`Setting up plugin directory in .roo/plugins/${plugin.slug}/`, 20);
      
      const initResult = await PluginScaffoldService.initializePlugin(plugin);
      
      if (!initResult.success) {
        throw new Error(initResult.error || 'Failed to initialize plugin directory');
      }
      
      // Step 2: Create plugin content files
      addLog(`Directory created, generating plugin files...`, 40);
      
      const contentResult = await PluginScaffoldService.createPluginContent(plugin);
      
      if (!contentResult.success) {
        // Handle partial success
        if (contentResult.partialSuccess) {
          addLog(`Warning: Some plugin files may not have been created correctly.`, 60);
        } else {
          throw new Error(contentResult.error || 'Failed to create plugin content');
        }
      }
      
      addLog(`Created package.json with plugin metadata`, 70);
      addLog(`Created index.js entry point`, 75);
      addLog(`Created .rooplugins configuration`, 80);
      addLog(`Created README.md with documentation`, 85);
      
      // Step 3: Register the plugin in the manifest
      addLog(`Registering plugin in manifest...`, 90);
      
      try {
        await onSave(plugin);
        addLog(`Plugin registration completed!`, 100);
        onComplete();
      } catch (saveError) {
        throw new Error(saveError instanceof Error ? 
          saveError.message : 'Failed to register plugin in manifest');
      }
    } catch (error) {
      console.error("Error scaffolding plugin:", error);
      
      // Determine if this was a timeout error
      const isTimeout = error instanceof Error && error.message.includes('timed out');
      
      setErrors({
        general: formatPluginError(error, isTimeout)
      });
      
      // Add to logs
      if (!isTimeout) {
        addLog(`Error: ${error instanceof Error ? error.message : "An unexpected error occurred"}`);
      } else {
        setStatus(prev => ({
          ...prev,
          timeoutError: true
        }));
        
        addLog(`Warning: Operation took longer than expected. This often happens with large plugins.`);
        addLog(`The plugin may still be created in the background.`);
        addLog(`You can check the .roo/plugins/${form.slug}/ directory to verify.`);
        addLog(`Tip: You can check if the plugin was created by looking in the .roo/plugins/ directory.`);
      }
    } finally {
      setStatus(prev => ({
        ...prev,
        isLoading: false
      }));
    }
  };
  
  return {
    status,
    errors,
    startScaffolding,
    addLog
  };
}