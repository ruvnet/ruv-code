import React, { useState, useEffect } from "react"
import { useAppTranslation } from "@/i18n/TranslationContext"
import {
  Plus,
  Wand2,
  X,
  ChevronDown,
  ChevronUp
} from "lucide-react"
import { VSCodeTextField, VSCodeCheckbox } from "@vscode/webview-ui-toolkit/react"
import { Button } from "@/components/ui/button"

import { RooPluginEntry } from "./schemas/plugin-schema"

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
  onSave: (plugin: RooPluginEntry) => void
}

export const PluginWizard: React.FC<PluginWizardProps> = ({ onClose, onSave }) => {
  const { t } = useAppTranslation()
  
  // Categories for selection
  const categories = ["Development", "Testing", "UI", "API", "Other"]
  
  // Advanced options toggle
  const [showAdvanced, setShowAdvanced] = useState(false)

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

  // Validate form and submit
  const handleSubmit = async () => {
    setIsLoading(true)
    const newErrors: FormErrors = {}
    
    if (!form.name.trim()) {
      newErrors.name = t("common:nameRequired")
    }
    
    if (!form.slug.trim()) {
      newErrors.slug = t("common:slugRequired")
    } else if (!/^[a-z0-9-]+$/.test(form.slug)) {
      newErrors.slug = t("common:invalidSlugFormat")
    }
    
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
    
    try {
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
      
      await onSave(plugin)
    } catch (error) {
      console.error("Error saving plugin:", error)
      setErrors({
        general: error instanceof Error ? error.message : "An unexpected error occurred"
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-vscode-editor-background p-6 rounded-md w-[500px] max-w-[90vw]">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold flex items-center">
            <Wand2 className="mr-2" size={18} />
            {t("common:createNewPlugin")}
          </h3>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={onClose}
            className="p-1 h-auto"
          >
            <X size={18} />
          </Button>
        </div>
        
        <div className="mb-4">
          <label className="block mb-2 text-sm">{t("common:pluginName")}</label>
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
          <label className="block mb-2 text-sm">{t("common:description")}</label>
          <VSCodeTextField 
            placeholder={t("common:descriptionPlaceholder")} 
            style={{ width: '100%' }}
            value={form.description}
            onChange={(e) => handleChange('description', (e.target as HTMLInputElement).value)}
          />
        </div>
        
        <div className="mb-4">
          <label className="block mb-2 text-sm">{t("common:pluginSlug")}</label>
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
            {t("common:slugDescription")}
          </p>
        </div>
        
        <div className="mb-4">
          <label className="block mb-2 text-sm">{t("common:pluginType")}</label>
          <select
            className="py-2 px-2 w-full bg-vscode-dropdown-background text-vscode-dropdown-foreground border border-vscode-dropdown-border rounded-md"
            value={form.location}
            onChange={(e) => handleChange('location', e.target.value as "remote" | "local")}
          >
            <option value="remote">{t("common:remotePlugin")}</option>
            <option value="local">{t("common:localPlugin")}</option>
          </select>
        </div>
        
        {form.location === "remote" && (
          <div className="mb-4">
            <label className="block mb-2 text-sm">{t("common:packageName")}</label>
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
            <label className="block mb-2 text-sm">{t("common:pluginPath")}</label>
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
          <label className="block mb-2 text-sm">{t("common:category")}</label>
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
        
        {/* Advanced options toggle */}
        <button
          type="button"
          className="w-full flex items-center justify-between py-2 px-1 text-sm text-vscode-descriptionForeground mb-4 border-b border-vscode-panelBorder"
          onClick={() => setShowAdvanced(!showAdvanced)}
        >
          <span className="font-medium">{t("common:advancedOptions")}</span>
          {showAdvanced ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
        
        {/* Advanced options section */}
        {showAdvanced && (
          <>
            <div className="mb-4">
              <label className="block mb-2 text-sm">{t("common:roleDefinition")}</label>
              <VSCodeTextField
                placeholder={t("common:roleDefinitionPlaceholder")}
                style={{ width: '100%' }}
                value={form.roleDefinition}
                onChange={(e) => handleChange('roleDefinition', (e.target as HTMLInputElement).value)}
              />
              <p className="text-xs text-vscode-descriptionForeground mt-1">
                {t("common:roleDefinitionHelp")}
              </p>
            </div>
            
            <div className="mb-4">
              <label className="block mb-2 text-sm">{t("common:customInstructions")}</label>
              <textarea
                className="py-2 px-2 w-full bg-vscode-input-background text-vscode-input-foreground border border-vscode-input-border rounded-md"
                rows={3}
                placeholder={t("common:customInstructionsPlaceholder")}
                value={form.customInstructions}
                onChange={(e) => handleChange('customInstructions', e.target.value)}
              />
              <p className="text-xs text-vscode-descriptionForeground mt-1">
                {t("common:customInstructionsHelp")}
              </p>
            </div>
          </>
        )}
        
        {/* Display general error message if any */}
        {errors.general && (
          <div className="mb-4 p-2 bg-vscode-errorBackground text-vscode-errorForeground rounded text-sm">
            {errors.general}
          </div>
        )}
        
        <div className="mb-6">
          <VSCodeCheckbox 
            checked={form.enabled}
            onChange={(e) => handleChange('enabled', (e.target as HTMLInputElement).checked)}
          >
            {t("common:enableAfterCreation")}
          </VSCodeCheckbox>
        </div>
        
        <div className="flex justify-end gap-2 mt-6">
          <Button variant="outline" onClick={onClose}>
            {t("common:cancel")}
          </Button>
          <Button
            onClick={handleSubmit}
            className="flex items-center"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <div className="w-4 h-4 border-2 border-t-transparent border-white rounded-full animate-spin mr-1" />
                {t("common:creating")}
              </>
            ) : (
              <>
                <Plus size={14} className="mr-1" />
                {t("common:createPlugin")}
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}