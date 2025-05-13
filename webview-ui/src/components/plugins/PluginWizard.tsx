import React, { useState, useEffect } from "react"
import { useAppTranslation } from "@/i18n/TranslationContext"
import {
  Wand2,
  ChevronRight,
  ChevronLeft,
  FileCode,
  Save,
  AlertCircle,
  RefreshCw
} from "lucide-react"
import { VSCodeTextField, VSCodeCheckbox } from "@vscode/webview-ui-toolkit/react"
import { Button } from "@/components/ui/button"
import { Section } from "@/components/settings/Section"
import { SectionHeader } from "@/components/plugins/SectionHeader"

import { RooPluginEntry } from "./schemas/plugin-schema"
import { PluginExtensionIntegration } from "../plugins/services/PluginExtensionIntegration"

// Plugin form interface that aligns with schema
interface PluginForm {
  slug: string
  name: string
  description?: string
  location: "remote" | "local"
  package?: string
  path?: string
  enabled: boolean
  roleDefinition?: string
  customInstructions?: string
  category?: string
}

// Component props
interface PluginWizardProps {
  onClose: () => void
  onSave: (plugin: RooPluginEntry) => Promise<void>
}

// Steps in the wizard
type WizardStep = 'basic' | 'configuration' | 'advanced' | 'scaffold' | 'complete'

export const PluginWizard: React.FC<PluginWizardProps> = ({ onClose, onSave }) => {
  const { t } = useAppTranslation()
  
  // Wizard step tracking
  const [currentStep, setCurrentStep] = useState<WizardStep>('basic')
  
  // Categories for selection
  const categories = ["Development", "Testing", "UI", "API", "Other"]

  // Initial form state
  const [form, setForm] = useState<PluginForm>({
    slug: "",
    name: "",
    description: "",
    location: "remote",
    package: "",
    path: "",
    enabled: true,
    category: "Development",
    roleDefinition: "",
    customInstructions: ""
  })
  
  // Loading state
  const [isLoading, setIsLoading] = useState(false)
  const [scaffoldProgress, setScaffoldProgress] = useState(0)
  const [scaffoldLog, setScaffoldLog] = useState<string[]>([])
  const [timeoutError, setTimeoutError] = useState(false)
  
  // When location changes, clear irrelevant field
  useEffect(() => {
    if (form.location === "remote") {
      setForm(prev => ({ ...prev, path: "" }))
    } else {
      setForm(prev => ({ ...prev, package: "" }))
    }
  }, [form.location])
  
  // Form validation
  interface FormErrors extends Partial<Record<keyof PluginForm, string>> {
    general?: string;
  }
  
  const [errors, setErrors] = useState<FormErrors>({})
  
  // Handle form changes
  const handleChange = (field: keyof PluginForm, value: string | boolean) => {
    setForm(prev => ({
      ...prev,
      [field]: value
    }))
    
    // Clear error when field is changed
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev }
        delete newErrors[field]
        return newErrors
      })
    }
  }
  
  // Generate slug from name
  useEffect(() => {
    if (form.name) {
      const generatedSlug = form.name
        .toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9-]/g, '')
      
      setForm(prev => ({ ...prev, slug: generatedSlug }))
    }
  }, [form.name])

  // Navigation between steps
  const nextStep = () => {
    if (currentStep === 'basic') {
      // Validate basic info
      const newErrors: FormErrors = {}
      
      if (!form.name.trim()) {
        newErrors.name = t("common:nameRequired")
      }
      
      if (!form.slug.trim()) {
        newErrors.slug = t("common:slugRequired")
      } else if (!/^[a-z0-9-]+$/.test(form.slug)) {
        newErrors.slug = t("common:invalidSlugFormat")
      }
      
      if (Object.keys(newErrors).length > 0) {
        setErrors(newErrors)
        return
      }
      
      setCurrentStep('configuration')
    } else if (currentStep === 'configuration') {
      // Validate config
      const newErrors: FormErrors = {}
      
      if (form.location === "remote" && !form.package?.trim()) {
        newErrors.package = t("common:packageRequired")
      }
      
      if (form.location === "local" && !form.path?.trim()) {
        newErrors.path = t("common:pathRequired")
      }
      
      if (Object.keys(newErrors).length > 0) {
        setErrors(newErrors)
        return
      }
      
      setCurrentStep('advanced')
    } else if (currentStep === 'advanced') {
      setCurrentStep('scaffold')
      startScaffolding() // Start creating plugin scaffolding
    } else if (currentStep === 'scaffold' && !isLoading) {
      // If we're on the scaffold step and not currently loading, this is the "retry" scenario
      startScaffolding() // Try scaffolding again
    }
  }
  
  const prevStep = () => {
    if (currentStep === 'configuration') {
      setCurrentStep('basic')
    } else if (currentStep === 'advanced') {
      setCurrentStep('configuration')
    } else if (currentStep === 'scaffold' && !isLoading) {
      setCurrentStep('advanced')
    }
  }

  // Create actual plugin files and scaffold the plugin structure
  const startScaffolding = async () => {
    setIsLoading(true)
    setScaffoldProgress(0)
    setScaffoldLog([])
    setTimeoutError(false)
    setErrors({}) // Clear any previous errors
    
    try {
      // Initial log entry
      setScaffoldLog(prev => [...prev, `Creating plugin: ${form.name}`])
      setScaffoldProgress(5)
      
      // Convert form to proper RooPluginEntry and submit
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
          }
      
      // Detailed progress logging
      setScaffoldLog(prev => [...prev, `Preparing plugin structure...`])
      setScaffoldProgress(10)
      
      // Scaffold the plugin files - create detailed logging for better feedback
      setScaffoldLog(prev => [...prev, `Setting up plugin directory in .roo/plugins/${plugin.slug}/`])
      setScaffoldProgress(20)
      
      // Log the plugin size estimation to help with debugging
      const complexityLevel = form.roleDefinition && form.roleDefinition.length > 500 ? 'High' : 'Standard'
      setScaffoldLog(prev => [...prev, `Plugin complexity: ${complexityLevel}`])
      setScaffoldProgress(25)
      
      // Break down the scaffolding process into more granular steps
      setScaffoldLog(prev => [...prev, `Creating directory structure...`])
      setScaffoldProgress(30)
      
      // Call the scaffolding function with timeout handling
      try {
        setScaffoldLog(prev => [...prev, `Generating plugin files (this may take a while for larger plugins)...`])
        setScaffoldProgress(40)
        
        const scaffoldResult = await PluginExtensionIntegration.scaffoldPluginFiles(plugin)
        
        if (!scaffoldResult.success) {
          throw new Error(scaffoldResult.error || 'Failed to scaffold plugin files')
        }
        
        setScaffoldLog(prev => [...prev, `Created package.json with plugin metadata`])
        setScaffoldProgress(60)
        
        setScaffoldLog(prev => [...prev, `Created index.js entry point`])
        setScaffoldProgress(70)
        
        setScaffoldLog(prev => [...prev, `Created .rooplugins configuration`])
        setScaffoldProgress(80)
        
        setScaffoldLog(prev => [...prev, `Created README.md with documentation`])
        setScaffoldProgress(90)
        
        // Register the plugin in the manifest
        setScaffoldLog(prev => [...prev, `Registering plugin in manifest...`])
        await onSave(plugin)
        
        // Add final log entry
        setScaffoldLog(prev => [...prev, "Plugin creation completed!"])
        setScaffoldProgress(100)
        
        // Show complete step
        setCurrentStep('complete')
      } catch (error) {
        // Special handling for timeout errors
        if (error instanceof Error && error.message.includes('timed out')) {
          setTimeoutError(true)
          setScaffoldLog(prev => [
            ...prev, 
            `Warning: Operation took longer than expected. This often happens with large plugins.`,
            `The plugin may still be created in the background.`,
            `You can check the .roo/plugins/${plugin.slug}/ directory to verify.`
          ])
          
          // Attempt to register the plugin anyway - it might have been created
          try {
            setScaffoldLog(prev => [...prev, `Attempting to register plugin in manifest anyway...`])
            await onSave(plugin)
            setScaffoldLog(prev => [...prev, `Registration attempted. Check the plugins list to verify.`])
          } catch (saveError) {
            setScaffoldLog(prev => [...prev, `Could not register plugin: ${saveError instanceof Error ? saveError.message : String(saveError)}`])
          }
          
          throw error
        } else {
          throw error
        }
      }
    } catch (error) {
      console.error("Error scaffolding plugin:", error)
      
      // Determine if this was a timeout error
      const isTimeout = error instanceof Error && error.message.includes('timed out')
      
      setErrors({
        general: isTimeout 
          ? "Operation timed out. The plugin may still be created in the background." 
          : (error instanceof Error ? error.message : "An unexpected error occurred")
      })
      
      if (!isTimeout) {
        setScaffoldLog(prev => [...prev, `Error: ${error instanceof Error ? error.message : "An unexpected error occurred"}`])
      }
      
      // Add retry suggestion for timeout errors
      if (isTimeout) {
        setScaffoldLog(prev => [...prev, `Tip: You can check if the plugin was created by looking in the .roo/plugins/ directory.`])
      }
    } finally {
      setIsLoading(false)
    }
  }
  
  // Render step content
  const renderStepContent = () => {
    switch (currentStep) {
      case 'basic':
        return (
          <>
            <div className="mb-4">
              <label className="block mb-2 text-sm font-medium">{t("common:pluginName")}</label>
              <VSCodeTextField 
                placeholder={t("common:pluginNamePlaceholder")} 
                style={{ width: '100%' }}
                value={form.name}
                onChange={(e) => handleChange('name', (e.target as HTMLInputElement).value)}
              />
              {errors.name && (
                <p className="text-vscode-errorForeground text-xs mt-1">{errors.name}</p>
              )}
            </div>
            
            <div className="mb-4">
              <label className="block mb-2 text-sm font-medium">{t("common:description")}</label>
              <VSCodeTextField 
                placeholder={t("common:descriptionPlaceholder")} 
                style={{ width: '100%' }}
                value={form.description}
                onChange={(e) => handleChange('description', (e.target as HTMLInputElement).value)}
              />
            </div>
            
            <div className="mb-4">
              <label className="block mb-2 text-sm font-medium">{t("common:pluginSlug")}</label>
              <VSCodeTextField
                placeholder="my-plugin-name"
                style={{ width: '100%' }}
                value={form.slug}
                onChange={(e) => handleChange('slug', (e.target as HTMLInputElement).value)}
              />
              {errors.slug && (
                <p className="text-vscode-errorForeground text-xs mt-1">{errors.slug}</p>
              )}
              <p className="text-xs text-vscode-descriptionForeground mt-1">
                {t("common:slugDescription") || "A unique identifier for your plugin (lowercase, alphanumeric with hyphens)"}
              </p>
            </div>
          </>
        )
      
      case 'configuration':
        return (
          <>
            <div className="mb-4">
              <label className="block mb-2 text-sm font-medium">{t("common:pluginType")}</label>
              <select
                className="py-2 px-2 w-full bg-vscode-dropdown-background text-vscode-dropdown-foreground border border-vscode-dropdown-border rounded-md"
                value={form.location}
                onChange={(e) => handleChange('location', e.target.value as "remote" | "local")}
              >
                <option value="remote">{t("common:remotePlugin") || "Remote (NPM Package)"}</option>
                <option value="local">{t("common:localPlugin") || "Local (File Path)"}</option>
              </select>
              <p className="text-xs text-vscode-descriptionForeground mt-1">
                {form.location === "remote" 
                  ? (t("common:remotePluginDescription") || "Use an NPM package from a registry") 
                  : (t("common:localPluginDescription") || "Use a local plugin from your filesystem")}
              </p>
            </div>
            
            {form.location === "remote" && (
              <div className="mb-4">
                <label className="block mb-2 text-sm font-medium">{t("common:packageName") || "Package Name"}</label>
                <VSCodeTextField
                  placeholder="@roo/my-plugin"
                  style={{ width: '100%' }}
                  value={form.package}
                  onChange={(e) => handleChange('package', (e.target as HTMLInputElement).value)}
                />
                {errors.package && (
                  <p className="text-vscode-errorForeground text-xs mt-1">{errors.package}</p>
                )}
              </div>
            )}
            
            {form.location === "local" && (
              <div className="mb-4">
                <label className="block mb-2 text-sm font-medium">{t("common:pluginPath") || "Plugin Path"}</label>
                <VSCodeTextField
                  placeholder="/path/to/plugin"
                  style={{ width: '100%' }}
                  value={form.path}
                  onChange={(e) => handleChange('path', (e.target as HTMLInputElement).value)}
                />
                {errors.path && (
                  <p className="text-vscode-errorForeground text-xs mt-1">{errors.path}</p>
                )}
              </div>
            )}
            
            <div className="mb-4">
              <label className="block mb-2 text-sm font-medium">{t("common:category") || "Category"}</label>
              <select
                className="py-2 px-2 w-full bg-vscode-dropdown-background text-vscode-dropdown-foreground border border-vscode-dropdown-border rounded-md"
                value={form.category}
                onChange={(e) => handleChange('category', e.target.value)}
              >
                {categories.map(category => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
            </div>
            
            <div className="mb-4">
              <VSCodeCheckbox 
                checked={form.enabled}
                onChange={(e) => handleChange('enabled', (e.target as HTMLInputElement).checked)}
              >
                {t("common:enableAfterCreation") || "Enable plugin after creation"}
              </VSCodeCheckbox>
            </div>
          </>
        )
      
      case 'advanced':
        return (
          <>
            <div className="mb-4">
              <label className="block mb-2 text-sm font-medium">{t("common:roleDefinition") || "Role Definition"}</label>
              <VSCodeTextField
                placeholder={t("common:roleDefinitionPlaceholder") || "Define what this plugin does..."}
                style={{ width: '100%' }}
                value={form.roleDefinition}
                onChange={(e) => handleChange('roleDefinition', (e.target as HTMLInputElement).value)}
              />
              <p className="text-xs text-vscode-descriptionForeground mt-1">
                {t("common:roleDefinitionHelp") || "Define the purpose and capabilities of this plugin"}
              </p>
            </div>
            
            <div className="mb-4">
              <label className="block mb-2 text-sm font-medium">{t("common:customInstructions") || "Custom Instructions"}</label>
              <textarea
                className="py-2 px-2 w-full bg-vscode-input-background text-vscode-input-foreground border border-vscode-input-border rounded-md"
                rows={3}
                placeholder={t("common:customInstructionsPlaceholder") || "Add any custom instructions for using this plugin..."}
                value={form.customInstructions}
                onChange={(e) => handleChange('customInstructions', e.target.value)}
              />
              <p className="text-xs text-vscode-descriptionForeground mt-1">
                {t("common:customInstructionsHelp") || "Provide specific instructions for how the plugin should be used"}
              </p>
            </div>
          </>
        )
      
      case 'scaffold':
        return (
          <div className="mb-4">
            <div className="mb-4">
              <h3 className="text-lg font-medium mb-2">{t("common:createPlugin") || "Create Plugin"}</h3>
              <p className="text-sm text-vscode-descriptionForeground mb-4">
                {t("common:pluginWelcomeDescription") || "Creating the plugin structure and files"}
              </p>
              
              {/* Progress bar */}
              <div className="w-full bg-vscode-editor-background rounded-full h-2.5 mb-4 dark:bg-gray-700">
                <div 
                  className="bg-vscode-button-background h-2.5 rounded-full" 
                  style={{ width: `${scaffoldProgress}%` }}
                ></div>
              </div>
              
              {/* Log output */}
              <div className="bg-vscode-editor-background p-3 rounded max-h-60 overflow-y-auto font-mono text-sm">
                {scaffoldLog.map((log, index) => (
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
              </div>
            )}
          </div>
        )
      
      case 'complete':
        return (
          <div className="mb-4">
            <div className="text-center py-6">
              <div className="bg-vscode-button-background rounded-full h-16 w-16 flex items-center justify-center mx-auto mb-4">
                <Save size={32} className="text-vscode-foreground" />
              </div>
              
              <h3 className="text-xl font-medium mb-2">Plugin Created Successfully!</h3>
              <p className="text-sm text-vscode-descriptionForeground mb-4">
                {form.name} has been successfully created and is ready to use.
              </p>
              
              <Button 
                className="flex items-center mx-auto" 
                onClick={onClose}
              >
                View Installed Plugins
              </Button>
            </div>
          </div>
        )
      
      default:
        return null
    }
  }

  return (
    <div>
      <SectionHeader>
        <div className="flex items-center gap-2">
          <Wand2 className="w-4" />
          <div>Plugin Wizard</div>
        </div>
      </SectionHeader>

      <Section>
        {/* Steps indicator - Mobile-friendly vertical layout */}
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
        
        {/* Step content - Fully responsive */}
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
        
        {/* Navigation buttons - Responsive layout */}
        {currentStep !== 'complete' && (
          <div className="flex flex-col sm:flex-row justify-between gap-3">
            <Button
              variant="outline"
              onClick={currentStep === 'basic' ? onClose : prevStep}
              disabled={currentStep === 'scaffold' && isLoading}
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
              disabled={(currentStep === 'scaffold' && isLoading)}
            >
              {currentStep === 'scaffold' ? (
                isLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-t-transparent border-white rounded-full animate-spin mr-1" />
                    Creating...
                  </>
                ) : timeoutError ? (
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
  )
}