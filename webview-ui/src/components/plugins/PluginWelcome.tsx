import React from 'react'
import { useAppTranslation } from "@/i18n/TranslationContext"
import { 
  Download, 
  PlusCircle, 
  Wand2,
  Package,
  ExternalLink
} from 'lucide-react'
import { Button } from '@/components/ui/button'

interface PluginWelcomeProps {
  onCreatePlugin: () => void
  onBrowseRegistry: () => void
}

export const PluginWelcome: React.FC<PluginWelcomeProps> = ({ 
  onCreatePlugin,
  onBrowseRegistry
}) => {
  const { t } = useAppTranslation()

  return (
    <div className="max-w-[1000px] mx-auto bg-vscode-editor-background rounded-lg border border-vscode-panelBorder p-6 my-4">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-vscode-button-background mb-4">
          <Package className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-medium mb-2">{t("common:welcomeToPlugins") || "Welcome to Roo Plugins"}</h2>
        <p className="text-vscode-descriptionForeground">
          {t("common:pluginsDescription") || "Extend Roo's capabilities with plugins that add new features, integrations, and tools."}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="bg-vscode-editorWidget-background p-4 rounded-md border border-vscode-panelBorder">
          <div className="flex items-start">
            <div className="bg-vscode-button-background rounded-full p-2 mr-3">
              <Wand2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-medium mb-1">{t("common:createAPlugin") || "Create a Plugin"}</h3>
              <p className="text-sm text-vscode-descriptionForeground mb-3">
                {t("common:createPluginDescription") || "Create your own plugin to extend Roo's capabilities or solve specific problems."}
              </p>
              <Button 
                size="sm" 
                className="flex items-center"
                onClick={onCreatePlugin}
              >
                <PlusCircle className="w-4 h-4 mr-1" />
                {t("common:createPlugin") || "Create Plugin"}
              </Button>
            </div>
          </div>
        </div>

        <div className="bg-vscode-editorWidget-background p-4 rounded-md border border-vscode-panelBorder">
          <div className="flex items-start">
            <div className="bg-vscode-button-background rounded-full p-2 mr-3">
              <Download className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-medium mb-1">{t("common:browseRegistry") || "Browse Registry"}</h3>
              <p className="text-sm text-vscode-descriptionForeground mb-3">
                {t("common:browseRegistryDescription") || "Discover and install pre-built plugins from the registry."}
              </p>
              <Button 
                size="sm" 
                variant="outline"
                className="flex items-center"
                onClick={onBrowseRegistry}
              >
                <Download className="w-4 h-4 mr-1" />
                {t("common:browseRegistry") || "Browse Registry"}
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-vscode-editorWidget-background p-4 rounded-md border border-vscode-panelBorder">
        <h3 className="font-medium mb-2">{t("common:learnMore") || "Learn More"}</h3>
        <p className="text-sm text-vscode-descriptionForeground mb-3">
          {t("common:pluginDocumentation") || "Find out more about how plugins work and how to create your own."}
        </p>
        <div className="flex flex-col sm:flex-row gap-3">
          <Button 
            variant="outline" 
            size="sm" 
            className="flex items-center"
            onClick={() => window.open('https://example.com/roo-plugins-docs', '_blank')}
          >
            <ExternalLink className="w-4 h-4 mr-1" />
            {t("common:pluginDocumentation") || "Plugin Documentation"}
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            className="flex items-center"
            onClick={() => window.open('https://example.com/roo-plugins-examples', '_blank')}
          >
            <ExternalLink className="w-4 h-4 mr-1" />
            {t("common:examplePlugins") || "Example Plugins"}
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            className="flex items-center"
            onClick={() => window.open('https://example.com/roo-plugins-api', '_blank')}
          >
            <ExternalLink className="w-4 h-4 mr-1" />
            {t("common:pluginAPI") || "Plugin API Reference"}
          </Button>
        </div>
      </div>

      <div className="mt-6 text-center text-sm text-vscode-descriptionForeground">
        <p>{t("common:pluginSecurityNote") || "Plugins can access your workspace and perform actions on your behalf. Only install plugins from trusted sources."}</p>
      </div>
    </div>
  )
}