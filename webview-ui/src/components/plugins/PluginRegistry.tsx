import React, { useState, useEffect, useRef } from "react"
import { useAppTranslation } from "@/i18n/TranslationContext"
import { PluginExtensionIntegration } from "./services/PluginExtensionIntegration"
import { RooPluginEntry } from "./schemas/plugin-schema"
import {
  Search,
  X,
  Filter,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Section } from "@/components/settings/Section"
import { SectionHeader } from "@/components/plugins/SectionHeader"
import { Badge } from "@/components/ui/badge"
import {
  Collapsible,
  CollapsibleContent,
} from "@/components/ui/collapsible"

// Import our new components
import { RegistryPlugin, DetailedPluginView } from "./DetailedPluginView"
import { PluginCard } from "./PluginCard"
import { FeaturedPlugins } from "./FeaturedPlugins"

interface PluginRegistryProps {
  onInstallPlugin: (plugin: RooPluginEntry) => void;
}

// Categories for plugins
const ALL_CATEGORIES = [
  "All",
  "Development",
  "Testing",
  "UI",
  "API",
  "Workflow",
  "Performance",
  "Security",
  "Other",
]

export const PluginRegistry: React.FC<PluginRegistryProps> = ({ onInstallPlugin }) => {
  const { t } = useAppTranslation()
  
  const [registryPlugins, setRegistryPlugins] = useState<RegistryPlugin[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [installLoading, setInstallLoading] = useState<{[key: string]: boolean}>({})
  const [selectedCategory, setSelectedCategory] = useState("All")
  const [filtersOpen, setFiltersOpen] = useState(false)
  
  // State for detailed plugin view
  const [selectedPlugin, setSelectedPlugin] = useState<RegistryPlugin | null>(null)
  const [detailDialogOpen, setDetailDialogOpen] = useState(false)
  const [installSuccess, setInstallSuccess] = useState<{[key: string]: boolean}>({})

  // Refs for scroll position
  const pluginsContainerRef = useRef<HTMLDivElement>(null)
  
  // Fetch registry plugins - non-blocking loading pattern
  useEffect(() => {
    const fetchPlugins = async () => {
      // Start loading in the background
      setIsLoading(true)
      setError(null)
      
      try {
        // In a real implementation, this would call PluginExtensionIntegration.getRegistryPlugins()
        // For now, we'll use enhanced mock data
        
        // Simulated API call delay - reduced to make UI more responsive
        await new Promise(resolve => setTimeout(resolve, 800))
        
        // Mock data with more detailed information
        setRegistryPlugins([
          {
            id: "eslint-config-manager",
            name: "ESLint Config Manager",
            description: "A tool to manage ESLint configurations for different project types. Automatically sets up best practices and optimizes rules for your specific development environment.",
            author: "Lint Tools",
            stars: 125,
            downloads: 4583,
            category: "Development",
            package: "@roo/eslint-config-manager",
            version: "1.2.0",
            license: "MIT",
            repository: "https://github.com/roo-plugins/eslint-config-manager",
            dependencies: ["eslint", "prettier"],
            documentation: "Comprehensive management for ESLint configurations with templates for React, Node.js, and TypeScript projects. Includes automatic detection and integration with existing projects.",
            created: "2024-02-15",
            updated: "2025-03-10",
            installCommand: "npx @roo/eslint-config-manager init",
            featuredRank: 3
          },
          {
            id: "typescript-schema-generator",
            name: "TypeScript Schema Generator",
            description: "Generate TypeScript types from JSON schemas automatically. Supports complex nested types, arrays, and custom type transformations.",
            author: "Type Systems",
            stars: 347,
            downloads: 12876,
            category: "Development",
            package: "@roo/typescript-schema-generator",
            version: "2.1.3",
            license: "Apache-2.0",
            repository: "https://github.com/roo-plugins/typescript-schema-generator",
            dependencies: ["typescript", "json-schema"],
            documentation: "Generates TypeScript interfaces and types from JSON Schema definitions with support for custom transformations, validation decorators, and integration with popular frameworks.",
            created: "2023-11-05",
            updated: "2025-04-22",
            installCommand: "npx @roo/typescript-schema-generator generate",
            featuredRank: 1
          },
          {
            id: "react-perf-analyzer",
            name: "React Performance Analyzer",
            description: "Analyze React component performance and find optimization opportunities. Identifies render bottlenecks, excessive re-renders, and memory leaks.",
            author: "React Tools",
            stars: 498,
            downloads: 9245,
            category: "Performance",
            package: "@roo/react-perf-analyzer",
            version: "1.5.2",
            license: "MIT",
            repository: "https://github.com/roo-plugins/react-perf-analyzer",
            dependencies: ["react", "react-dom"],
            documentation: "Analyzes React applications for performance issues, providing detailed reports on component render times, re-render frequency, and optimization recommendations.",
            created: "2024-01-20",
            updated: "2025-04-15",
            installCommand: "npx @roo/react-perf-analyzer analyze",
            featuredRank: 2
          },
          {
            id: "api-mock-server",
            name: "API Mock Server",
            description: "Create realistic API mocks with dynamic responses and request validation. Perfect for frontend development without backend dependencies.",
            author: "API Toolkit",
            stars: 289,
            downloads: 7532,
            category: "API",
            package: "@roo/api-mock-server",
            version: "2.0.1",
            license: "MIT",
            repository: "https://github.com/roo-plugins/api-mock-server",
            dependencies: ["express", "faker"],
            documentation: "Creates realistic API mocks that can be customized with dynamic responses, latency simulation, and validation rules. Supports RESTful and GraphQL endpoints.",
            created: "2023-12-10",
            updated: "2025-03-25",
            installCommand: "npx @roo/api-mock-server start",
          },
          {
            id: "testing-snapshot-manager",
            name: "Testing Snapshot Manager",
            description: "Manage and update Jest snapshots with an interactive UI. Review, approve, and update snapshots efficiently.",
            author: "Test Tools",
            stars: 156,
            downloads: 3241,
            category: "Testing",
            package: "@roo/testing-snapshot-manager",
            version: "1.1.0",
            license: "MIT",
            repository: "https://github.com/roo-plugins/testing-snapshot-manager",
            dependencies: ["jest"],
            documentation: "Interactive UI for managing Jest snapshots, allowing developers to review, approve, or update test snapshots efficiently. Includes diff visualization and batch operations.",
            created: "2024-03-05",
            updated: "2025-02-18",
            installCommand: "npx @roo/testing-snapshot-manager",
          },
          {
            id: "security-scanner",
            name: "Security Scanner",
            description: "Analyze your project for security vulnerabilities and suggest fixes. Integrates with popular security databases.",
            author: "Security Team",
            stars: 412,
            downloads: 8763,
            category: "Security",
            package: "@roo/security-scanner",
            version: "3.2.1",
            license: "GPL-3.0",
            repository: "https://github.com/roo-plugins/security-scanner",
            dependencies: ["vulnerability-db", "code-analyzer"],
            documentation: "Comprehensive security scanner that checks for known vulnerabilities, insecure patterns, and outdated dependencies. Provides actionable recommendations and integrates with CI/CD pipelines.",
            created: "2023-08-15",
            updated: "2025-04-30",
            installCommand: "npx @roo/security-scanner analyze",
          },
          {
            id: "workflow-automator",
            name: "Workflow Automator",
            description: "Automate development workflows like code formatting, linting, and testing. Configurable for different project types.",
            author: "Automation Team",
            stars: 223,
            downloads: 5421,
            category: "Workflow",
            package: "@roo/workflow-automator",
            version: "2.3.0",
            license: "MIT",
            repository: "https://github.com/roo-plugins/workflow-automator",
            dependencies: ["husky", "lint-staged"],
            documentation: "Configurable automation tool for development workflows, handling code formatting, linting, testing, and other routine tasks. Includes preset configurations for popular project types.",
            created: "2024-01-25",
            updated: "2025-03-15",
            installCommand: "npx @roo/workflow-automator init",
          },
          {
            id: "component-showcase",
            name: "UI Component Showcase",
            description: "Generate interactive documentation for your UI components. Auto-detects props and supports live editing.",
            author: "UI Toolkit",
            stars: 178,
            downloads: 4129,
            category: "UI",
            package: "@roo/component-showcase",
            version: "1.4.2",
            license: "MIT",
            repository: "https://github.com/roo-plugins/component-showcase",
            dependencies: ["react", "styled-components"],
            documentation: "Generates interactive documentation for UI components, automatically detecting props and supporting live editing. Includes theme support and responsive previews.",
            created: "2024-02-10",
            updated: "2025-03-28",
            installCommand: "npx @roo/component-showcase start",
          }
        ])
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to fetch plugins")
      } finally {
        setIsLoading(false)
      }
    }
    
    // Start loading immediately
    fetchPlugins()
  }, [])

  // Filter plugins based on search and category
  const filteredPlugins = registryPlugins.filter(plugin => {
    const matchesSearch = searchQuery 
      ? plugin.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        plugin.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        plugin.author.toLowerCase().includes(searchQuery.toLowerCase()) ||
        plugin.category.toLowerCase().includes(searchQuery.toLowerCase())
      : true
    
    const matchesCategory = selectedCategory === "All" || plugin.category === selectedCategory
    
    return matchesSearch && matchesCategory
  })

  // Get featured plugins
  const featuredPlugins = registryPlugins
    .filter(plugin => plugin.featuredRank !== undefined)
    .sort((a, b) => (a.featuredRank || 999) - (b.featuredRank || 999))
    .slice(0, 3)

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
        // Set success state for the animation
        setInstallSuccess(prev => ({ ...prev, [plugin.id]: true }))
        // Reset success state after animation completes
        setTimeout(() => {
          setInstallSuccess(prev => ({ ...prev, [plugin.id]: false }))
        }, 2000)
      } else {
        setError(`Failed to install ${plugin.name}: ${result.error}`)
      }
    } catch (err) {
      setError(`Error installing ${plugin.name}: ${err instanceof Error ? err.message : String(err)}`)
    } finally {
      setInstallLoading(prev => ({ ...prev, [plugin.id]: false }))
    }
  }

  // Open detailed plugin view
  const openPluginDetails = (plugin: RegistryPlugin) => {
    setSelectedPlugin(plugin)
    setDetailDialogOpen(true)
  }

  return (
    <div className="relative">
      <SectionHeader>
        <div className="flex items-center gap-2">
          <div>{t("common:pluginRegistry")}</div>
        </div>
      </SectionHeader>

      <Section>
        {/* Search box, category filter, and filter button */}
        <div className="flex flex-col sm:flex-row gap-2 mb-4 items-start">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 text-vscode-inputPlaceholderForeground" size={16} />
            <input
              type="text"
              placeholder={t("common:searchRegistry")}
              className="pl-8 pr-3 py-2 w-full bg-vscode-input-background text-vscode-input-foreground border border-vscode-input-border rounded-md"
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
          
          <div className="flex gap-2 w-full sm:w-auto">
            <select
              className="py-2 px-3 bg-vscode-dropdown-background text-vscode-dropdown-foreground border border-vscode-dropdown-border rounded-md flex-1 sm:flex-none"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
            >
              {ALL_CATEGORIES.map(category => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>
            
            <Button
              variant="outline"
              size="icon"
              className="p-2"
              onClick={() => setFiltersOpen(!filtersOpen)}
              aria-label="Advanced filters"
            >
              <Filter size={16} />
            </Button>
          </div>
        </div>
        
        {/* Advanced filters panel */}
        <Collapsible open={filtersOpen} onOpenChange={setFiltersOpen} className="mb-4">
          <CollapsibleContent className="bg-vscode-editor-background p-3 rounded-md border border-vscode-panelBorder">
            <h3 className="text-vscode-foreground font-semibold text-sm mb-2">Advanced Filters</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs block mb-1">Sort By</label>
                <select
                  className="w-full py-1 px-2 bg-vscode-dropdown-background text-vscode-dropdown-foreground border border-vscode-dropdown-border rounded-md text-sm"
                >
                  <option value="newest">Newest</option>
                  <option value="popular">Most Popular</option>
                  <option value="downloads">Most Downloaded</option>
                  <option value="updated">Recently Updated</option>
                </select>
              </div>
              
              <div>
                <label className="text-xs block mb-1">License</label>
                <select
                  className="w-full py-1 px-2 bg-vscode-dropdown-background text-vscode-dropdown-foreground border border-vscode-dropdown-border rounded-md text-sm"
                >
                  <option value="any">Any License</option>
                  <option value="mit">MIT</option>
                  <option value="apache">Apache</option>
                  <option value="gpl">GPL</option>
                </select>
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>
        
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
        
        {/* Non-blocking loading indicator */}
        {isLoading && (
          <div className="absolute top-4 right-4 flex items-center bg-vscode-editorWidget-background px-3 py-2 rounded-md shadow-md z-10">
            <div className="w-4 h-4 border-2 border-t-transparent border-vscode-foreground rounded-full animate-spin mr-2"></div>
            <span className="text-sm text-vscode-foreground">Loading registry...</span>
          </div>
        )}
        
        {/* Main content */}
        <div className="mt-4" ref={pluginsContainerRef}>
          {/* Featured plugins section */}
          {!searchQuery && selectedCategory === "All" && !isLoading && (
            <FeaturedPlugins 
              plugins={featuredPlugins}
              onPluginClick={openPluginDetails}
            />
          )}
          
          {/* Category pills for quick filtering */}
          {!isLoading && (
            <div className="flex overflow-x-auto gap-2 mb-4 pb-2 scrollbar-thin">
              {ALL_CATEGORIES.map(category => (
                <Badge
                  key={category}
                  variant={selectedCategory === category ? "default" : "outline"}
                  className="cursor-pointer whitespace-nowrap"
                  onClick={() => setSelectedCategory(category)}
                >
                  {category}
                </Badge>
              ))}
            </div>
          )}
          
          {/* Results count */}
          {!isLoading && filteredPlugins.length > 0 && (
            <div className="text-sm text-vscode-descriptionForeground mb-4">
              Showing {filteredPlugins.length} plugins
            </div>
          )}
          
          {/* Plugin cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredPlugins.length > 0 ? (
              filteredPlugins.map(plugin => (
                <PluginCard
                  key={plugin.id}
                  plugin={plugin}
                  onInstall={handleInstallPlugin}
                  onViewDetails={openPluginDetails}
                  isInstalling={!!installLoading[plugin.id]}
                  isInstallSuccess={!!installSuccess[plugin.id]}
                />
              ))
            ) : (
              <div className="text-center p-8 col-span-full text-vscode-descriptionForeground">
                {searchQuery ? t("common:noPluginsFound") :
                  isLoading ? "Loading plugins..." : t("common:noPluginsInRegistry")}
              </div>
            )}
          </div>
          
          {/* More plugins button */}
          {filteredPlugins.length > 0 && (
            <div className="mt-8 mb-4 text-center">
              <p className="text-vscode-descriptionForeground mb-4">
                {t("common:discoverMore")}
              </p>
              <Button className="mx-auto">
                Browse Full Registry
              </Button>
            </div>
          )}
        </div>
      </Section>

      {/* Detailed plugin view dialog */}
      <DetailedPluginView
        plugin={selectedPlugin}
        isOpen={detailDialogOpen}
        onClose={() => setDetailDialogOpen(false)}
        onInstall={handleInstallPlugin}
        isInstalling={selectedPlugin ? !!installLoading[selectedPlugin.id] : false}
        isInstallSuccess={selectedPlugin ? !!installSuccess[selectedPlugin.id] : false}
      />
    </div>
  )
}