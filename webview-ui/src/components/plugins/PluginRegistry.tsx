import React, { useState, useEffect } from "react"
import { useAppTranslation } from "@/i18n/TranslationContext"
import { PluginExtensionIntegration } from "./services/PluginExtensionIntegration"
import { RooPluginEntry } from "./schemas/plugin-schema"
import { 
  Package, 
  Download, 
  ExternalLink,
  Search,
  X
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Section } from "@/components/settings/Section"
import { SectionHeader } from "@/components/plugins/SectionHeader"

interface RegistryPlugin {
  id: string;
  name: string;
  description: string;
  author: string;
  stars: number;
  downloads: number;
  category: string;
  package: string;
}

interface PluginRegistryProps {
  onInstallPlugin: (plugin: RooPluginEntry) => void;
}

export const PluginRegistry: React.FC<PluginRegistryProps> = ({ onInstallPlugin }) => {
  const { t } = useAppTranslation()
  
  const [registryPlugins, setRegistryPlugins] = useState<RegistryPlugin[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [installLoading, setInstallLoading] = useState<{[key: string]: boolean}>({})

  // Fetch registry plugins
  useEffect(() => {
    const fetchPlugins = async () => {
      setIsLoading(true)
      setError(null)
      
      try {
        // In a real implementation, this would call PluginExtensionIntegration.getRegistryPlugins()
        // For now, we'll use mock data
        
        // Simulated API call delay
        await new Promise(resolve => setTimeout(resolve, 1000))
        
        // Mock data
        setRegistryPlugins([
          {
            id: "eslint-config-manager",
            name: "ESLint Config Manager",
            description: "A tool to manage ESLint configurations for different project types",
            author: "Lint Tools",
            stars: 125,
            downloads: 4583,
            category: "Development",
            package: "@roo/eslint-config-manager"
          },
          {
            id: "typescript-schema-generator",
            name: "TypeScript Schema Generator",
            description: "Generate TypeScript types from JSON schemas automatically",
            author: "Type Systems",
            stars: 347,
            downloads: 12876,
            category: "Development",
            package: "@roo/typescript-schema-generator"
          },
          {
            id: "react-perf-analyzer",
            name: "React Perf Analyzer",
            description: "Analyze React component performance and find optimization opportunities",
            author: "React Tools",
            stars: 498,
            downloads: 9245,
            category: "Performance",
            package: "@roo/react-perf-analyzer"
          }
        ])
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to fetch plugins")
      } finally {
        setIsLoading(false)
      }
    }
    
    fetchPlugins()
  }, [])

  // Filter plugins based on search
  const filteredPlugins = searchQuery
    ? registryPlugins.filter(plugin =>
        plugin.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        plugin.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        plugin.author.toLowerCase().includes(searchQuery.toLowerCase()) ||
        plugin.category.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : registryPlugins

  // Handle plugin installation
  const handleInstallPlugin = async (plugin: RegistryPlugin) => {
    setInstallLoading(prev => ({ ...prev, [plugin.id]: true }))
    
    try {
      // Create plugin entry from registry plugin
      const pluginEntry: RooPluginEntry = {
        slug: plugin.id,
        name: plugin.name,
        enabled: true,
        location: "remote",
        package: plugin.package
      }
      
      const result = await PluginExtensionIntegration.installPlugin(pluginEntry)
      
      if (result.success) {
        onInstallPlugin(pluginEntry)
      } else {
        setError(`Failed to install ${plugin.name}: ${result.error}`)
      }
    } catch (err) {
      setError(`Error installing ${plugin.name}: ${err instanceof Error ? err.message : String(err)}`)
    } finally {
      setInstallLoading(prev => ({ ...prev, [plugin.id]: false }))
    }
  }

  // Registry card component
  const renderRegistryCard = (plugin: RegistryPlugin) => (
    <div key={plugin.id} className="bg-vscode-editor-background rounded-md p-4 mb-4 border border-vscode-panelBorder">
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <div className="flex items-center">
            <h3 className="text-vscode-foreground font-semibold text-base">{plugin.name}</h3>
            <span className="ml-2 text-xs text-vscode-descriptionForeground">
              <span className="mr-2">⭐ {plugin.stars}</span>
              <span>📥 {plugin.downloads}</span>
            </span>
          </div>
          <p className="text-vscode-descriptionForeground text-sm mt-1">{plugin.description}</p>
          <div className="text-xs text-vscode-descriptionForeground mt-2">
            By: {plugin.author}
          </div>
          <div className="text-xs px-2 py-1 bg-vscode-button-hoverBackground inline-block rounded-sm mt-2">
            {plugin.category}
          </div>
        </div>
      </div>
      <div className="flex mt-4 gap-2">
        <Button
          variant="default"
          size="sm"
          className="flex items-center"
          onClick={() => handleInstallPlugin(plugin)}
          disabled={installLoading[plugin.id]}
        >
          {installLoading[plugin.id] ? (
            <div className="w-4 h-4 border-2 border-t-transparent border-white rounded-full animate-spin mr-1" />
          ) : (
            <Download size={14} className="mr-1" />
          )}
          {t("common:install")}
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="flex items-center"
          onClick={() => window.open(`https://example.com/plugins/${plugin.id}`, '_blank')}
        >
          <ExternalLink size={14} className="mr-1" />
          {t("common:viewDetails")}
        </Button>
      </div>
    </div>
  )

  return (
    <div>
      <SectionHeader>
        <div className="flex items-center gap-2">
          <Download className="w-4" />
          <div>{t("common:pluginRegistry")}</div>
        </div>
      </SectionHeader>

      <Section>
        <div className="flex mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 text-vscode-inputPlaceholderForeground" size={16} />
            <input
              type="text"
              placeholder={t("common:searchRegistry")}
              className="pl-8 pr-3 py-1 w-full bg-vscode-input-background text-vscode-input-foreground border border-vscode-input-border rounded-md"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <button 
              className="absolute right-2 top-1/2 transform -translate-y-1/2 text-vscode-inputPlaceholderForeground"
            >
              <X size={14} />
            </button>
          </div>
        </div>
        
        {/* Error message */}
        {error && (
          <div className="mb-4 p-2 bg-vscode-errorBackground text-vscode-errorForeground rounded">
            {error}
            <button
              className="ml-2 text-xs underline"
              onClick={() => setError(null)}
            >
              Dismiss
            </button>
          </div>
        )}
        
        {/* Loading state */}
        {isLoading ? (
          <div className="flex items-center justify-center h-40">
            <div className="w-8 h-8 border-4 border-t-transparent border-vscode-foreground rounded-full animate-spin"></div>
          </div>
        ) : (
          <div className="mt-4">
            {filteredPlugins.length > 0 ? (
              filteredPlugins.map(renderRegistryCard)
            ) : (
              <div className="text-center p-8 text-vscode-descriptionForeground">
                {searchQuery ? t("common:noPluginsFound") : t("common:noPluginsInRegistry")}
              </div>
            )}
            
            <div className="mt-8 mb-4 text-center">
              <p className="text-vscode-descriptionForeground mb-4">
                {t("common:discoverMore")}
              </p>
              <Button className="flex items-center mx-auto">
                <ExternalLink size={14} className="mr-1" />
                {t("common:browseFullRegistry")}
              </Button>
            </div>
          </div>
        )}
      </Section>
    </div>
  )
}