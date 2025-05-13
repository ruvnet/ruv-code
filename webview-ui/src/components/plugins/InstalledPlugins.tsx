import React, { useState } from "react"
import { useAppTranslation } from "@/i18n/TranslationContext"
import {
  Search,
  X,
  Plus,
  ExternalLink,
  Edit,
  Trash2,
  Play,
  RefreshCcw,
  Server
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { VSCodeCheckbox } from "@vscode/webview-ui-toolkit/react"
import { Section } from "@/components/settings/Section"
import { SectionHeader } from "@/components/plugins/SectionHeader"

import { RooPluginEntry } from "./schemas/plugin-schema"
import { PluginExtensionIntegration } from "./services/PluginExtensionIntegration"
import { PluginWelcomeScreen } from "./PluginWelcomeScreen"

interface InstalledPluginsProps {
  plugins: RooPluginEntry[]
  onAddPlugin: () => void
  onPluginsChanged: () => void
}

// Categories for filtering
const categories = ["All", "Development", "Testing", "UI", "API", "Other"]

export const InstalledPlugins: React.FC<InstalledPluginsProps> = ({ plugins, onAddPlugin, onPluginsChanged }) => {
  const { t } = useAppTranslation()
  
  const [searchQuery, setSearchQuery] = useState<string>("")
  const [selectedCategory, setSelectedCategory] = useState<string>("All")
  
  // Loading state for operations
  const [loading, setLoading] = useState<{[key: string]: boolean}>({})
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  // Helper to track loading state for operations
  const startOperation = (slug: string) => {
    setLoading(prev => ({ ...prev, [slug]: true }))
    setError(null)
  }

  const finishOperation = (slug: string, success: boolean, message?: string) => {
    setLoading(prev => ({ ...prev, [slug]: false }))
    
    if (!success && message) {
      setError(message)
      setTimeout(() => setError(null), 5000) // Clear error after 5 seconds
    } else if (success && message) {
      setSuccessMessage(message)
      setTimeout(() => setSuccessMessage(null), 3000) // Clear success after 3 seconds
    }
  }

  // Filtered plugins based on search and category
  const filteredPlugins = plugins.filter(plugin => {
    const matchesSearch = plugin.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        (plugin.roleDefinition || "").toLowerCase().includes(searchQuery.toLowerCase())
    
    // Match category
    const matchesCategory = selectedCategory === "All" ||
                          (plugin.groups && plugin.groups.includes(selectedCategory))
    
    return matchesSearch && matchesCategory
  })

  // Handle plugin actions
  const handleRunPlugin = async (slug: string) => {
    startOperation(slug)
    
    try {
      const result = await PluginExtensionIntegration.runPlugin(slug)
      
      if (result.success) {
        finishOperation(slug, true, `Successfully ran plugin: ${slug}`)
      } else {
        finishOperation(slug, false, `Failed to run plugin: ${result.error}`)
      }
    } catch (error) {
      finishOperation(slug, false, `Error running plugin: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  const handleToggleEnable = async (slug: string, enabled: boolean) => {
    startOperation(slug)
    
    try {
      const result = enabled
        ? await PluginExtensionIntegration.enablePlugin(slug)
        : await PluginExtensionIntegration.disablePlugin(slug)
      
      if (result.success) {
        finishOperation(slug, true, `Successfully ${enabled ? 'enabled' : 'disabled'} plugin: ${slug}`)
        onPluginsChanged() // Notify parent to refresh plugins
      } else {
        finishOperation(slug, false, `Failed to ${enabled ? 'enable' : 'disable'} plugin: ${result.error}`)
      }
    } catch (error) {
      finishOperation(slug, false, `Error ${enabled ? 'enabling' : 'disabling'} plugin: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  const handleEditPlugin = async (slug: string) => {
    // Find the plugin to edit
    const plugin = plugins.find(p => p.slug === slug)
    if (!plugin) {
      setError(`Plugin with slug ${slug} not found`)
      return
    }
    
    // This would open an edit dialog in a real implementation
    // For now, we'll just simulate an update
    startOperation(slug)
    
    try {
      // Example: toggle some setting
      const updates = {
        // In a real implementation, this would contain the updated values
        roleDefinition: plugin.roleDefinition
          ? `${plugin.roleDefinition} (edited)`
          : "New role definition"
      }
      
      const result = await PluginExtensionIntegration.updatePlugin(slug, updates)
      
      if (result.success) {
        finishOperation(slug, true, `Successfully updated plugin: ${slug}`)
        onPluginsChanged() // Refresh plugins list
      } else {
        finishOperation(slug, false, `Failed to update plugin: ${result.error}`)
      }
    } catch (error) {
      finishOperation(slug, false, `Error updating plugin: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  const handleDeletePlugin = async (slug: string) => {
    if (!window.confirm(t("common:confirmDeletePlugin"))) {
      return
    }
    
    startOperation(slug)
    
    try {
      const result = await PluginExtensionIntegration.removePlugin(slug)
      
      if (result.success) {
        finishOperation(slug, true, `Successfully removed plugin: ${slug}`)
        onPluginsChanged() // Notify parent to refresh plugins
      } else {
        finishOperation(slug, false, `Failed to remove plugin: ${result.error}`)
      }
    } catch (error) {
      finishOperation(slug, false, `Error removing plugin: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  // Function to refresh plugin list
  const handleRefresh = () => {
    onPluginsChanged()
  }

  // Plugin card component
  const renderPluginCard = (plugin: RooPluginEntry) => (
    <div key={plugin.slug} className="bg-vscode-editor-background rounded-md p-4 mb-4 border border-vscode-panelBorder">
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <div className="flex items-center">
            <h3 className="text-vscode-foreground font-semibold text-base">{plugin.name}</h3>
            {plugin.location === "remote" && (
              <span className="ml-2 inline-flex items-center">
                <ExternalLink size={12} className="mr-1" />
                <span className="text-xs text-vscode-descriptionForeground">Remote</span>
              </span>
            )}
            {plugin.location === "local" && (
              <span className="ml-2 inline-flex items-center">
                <Server size={12} className="mr-1" />
                <span className="text-xs text-vscode-descriptionForeground">Local</span>
              </span>
            )}
          </div>
          <p className="text-vscode-descriptionForeground text-sm mt-1">
            {plugin.roleDefinition ? plugin.roleDefinition.substring(0, 100) + (plugin.roleDefinition.length > 100 ? '...' : '') : 'No role definition provided.'}
          </p>
          <div className="text-xs text-vscode-descriptionForeground mt-2">
            {plugin.location === "remote" ? `Package: ${plugin.package}` : `Path: ${plugin.path}`}
          </div>
        </div>
        <div>
          <VSCodeCheckbox
            checked={plugin.enabled}
            onChange={() => handleToggleEnable(plugin.slug, !plugin.enabled)}
            disabled={loading[plugin.slug]}
          />
        </div>
      </div>
      <div className="flex mt-4 gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => handleRunPlugin(plugin.slug)}
          disabled={!plugin.enabled || loading[plugin.slug]}
          className="flex items-center"
        >
          {loading[plugin.slug] ? (
            <div className="w-4 h-4 border-2 border-t-transparent border-vscode-foreground rounded-full animate-spin mr-1" />
          ) : (
            <Play size={14} className="mr-1" />
          )}
          {t("common:run")}
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => handleEditPlugin(plugin.slug)}
          disabled={loading[plugin.slug]}
          className="flex items-center"
        >
          <Edit size={14} className="mr-1" />
          {t("common:edit")}
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => handleDeletePlugin(plugin.slug)}
          disabled={loading[plugin.slug]}
          className="flex items-center text-vscode-errorForeground hover:text-vscode-errorForeground"
        >
          <Trash2 size={14} className="mr-1" />
          {t("common:delete")}
        </Button>
      </div>
    </div>
  )

  return (
    <div className="max-w-[1200px] mx-auto">
      <SectionHeader>
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-2">
            <Plus className="w-4" />
            <div>{t("common:installedPlugins")}</div>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              className="w-8 h-8 p-0"
              onClick={handleRefresh}
              title={t("common:refresh")}
            >
              <RefreshCcw size={16} />
            </Button>
            <Button
              size="icon"
              className="w-8 h-8 p-0"
              onClick={onAddPlugin}
              title={t("common:newPlugin")}
            >
              <Plus size={16} />
            </Button>
          </div>
        </div>
      </SectionHeader>

      <Section>
        <div className="mb-4">
          {/* Search and Category dropdown in a single row */}
          <div className="flex flex-wrap gap-2 mb-2 w-full items-center">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 text-vscode-inputPlaceholderForeground" size={16} />
              <input
                type="text"
                placeholder={t("common:searchPlugins")}
                className="pl-8 pr-3 py-1 w-full bg-vscode-input-background text-vscode-input-foreground border border-vscode-input-border rounded-md"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 text-vscode-inputPlaceholderForeground"
                  onClick={() => setSearchQuery("")}
                >
                  <X size={14} />
                </button>
              )}
            </div>
            
            <select
              className="py-1 px-3 bg-vscode-dropdown-background text-vscode-dropdown-foreground border border-vscode-dropdown-border rounded-md"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
            >
              {categories.map(category => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>
          </div>
        </div>
        
        {/* Status messages */}
        {error && (
          <div className="mb-2 p-2 bg-vscode-errorBackground text-vscode-errorForeground rounded">
            {error}
          </div>
        )}
        
        {successMessage && (
          <div className="mb-2 p-2 bg-vscode-button-background text-vscode-foreground rounded">
            {successMessage}
          </div>
        )}
        
        {/* Welcome screen with zero top margin */}
        {plugins.length === 0 && !searchQuery && (
          <div className="mt-0 mb-2">
            <PluginWelcomeScreen
              onAddPlugin={onAddPlugin}
              onOpenWizard={onAddPlugin}
            />
          </div>
        )}
        
        {/* Show plugin list or "no plugins found" message */}
        {(plugins.length > 0 || searchQuery) && (
          <div className="mt-2">
            {filteredPlugins.length > 0 ? (
              filteredPlugins.map(renderPluginCard)
            ) : (
              <div className="text-center p-4 text-vscode-descriptionForeground">
                {t("common:noPluginsFound")}
              </div>
            )}
          </div>
        )}
      </Section>
    </div>
  )
}