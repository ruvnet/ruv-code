import React, { useState } from 'react'
import { useAppTranslation } from "@/i18n/TranslationContext"
import { 
  Download, 
  PlusCircle, 
  Wand2,
  Package,
  ExternalLink,
  Terminal,
  Loader
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { SparcCliService } from './services/SparcCliService'

interface PluginWelcomeScreenProps {
  onAddPlugin: () => void
  onOpenWizard: () => void
}

export const PluginWelcomeScreen: React.FC<PluginWelcomeScreenProps> = ({ 
  onAddPlugin,
  onOpenWizard
}) => {
  const { t } = useAppTranslation()
  const [isTestingNpx, setIsTestingNpx] = useState(false)
  const [testOutput, setTestOutput] = useState<string | null>(null)
  const [testError, setTestError] = useState<string | null>(null)

  const handleTestNpxClick = async () => {
    setIsTestingNpx(true)
    setTestOutput(null)
    setTestError(null)

    try {
      const result = await SparcCliService.testCreateSparc()
      if (result.success) {
        setTestOutput(result.output || "Command executed successfully!")
      } else {
        setTestError(result.error || "Failed to execute command")
      }
    } catch (error) {
      setTestError(error instanceof Error ? error.message : "An unknown error occurred")
    } finally {
      setIsTestingNpx(false)
    }
  }

  return (
    <div className="max-w-[1000px] mx-auto bg-vscode-editor-background rounded-lg border border-vscode-panelBorder p-6 my-4">
      <div className="text-center mb-6">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-vscode-button-background mb-4">
          <Package className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-medium mb-2">{t("welcomeToPlugins")}</h2>
        <p className="text-vscode-descriptionForeground">
          {t("pluginsDescription")}
        </p>
      </div>

      {/* Test npx create-sparc button */}
      <div className="mb-6 bg-vscode-editorWidget-background p-4 rounded-md border border-vscode-panelBorder">
        <div className="flex flex-col items-center text-center">
          <div className="bg-vscode-button-background rounded-full p-2 mb-3">
            <Terminal className="w-6 h-6" />
          </div>
          <h3 className="font-medium mb-1">{t("testNpxCreateSparc", { defaultValue: "Test Plugin Creation" })}</h3>
          <p className="text-sm text-vscode-descriptionForeground mb-3">
            {t("testNpxCreateSparcDescription", { defaultValue: "Run 'npx create-sparc init --force' to test the plugin creation system" })}
          </p>
          <Button 
            size="default" 
            className="flex items-center"
            onClick={handleTestNpxClick}
            disabled={isTestingNpx}
          >
            {isTestingNpx ? (
              <>
                <Loader className="w-4 h-4 mr-2 animate-spin" />
                {t("testing", { defaultValue: "Testing..." })}
              </>
            ) : (
              <>
                <Terminal className="w-4 h-4 mr-2" />
                {t("testNpxCreateSparc", { defaultValue: "Test npx create-sparc" })}
              </>
            )}
          </Button>

          {/* Display the test output or error */}
          {(testOutput || testError) && (
            <div className="mt-4 w-full">
              <div className={`p-3 rounded text-sm font-mono max-h-40 overflow-y-auto ${testError ? 'bg-vscode-errorBackground text-vscode-errorForeground' : 'bg-vscode-editor-background'}`}>
                {testOutput && <div>{testOutput}</div>}
                {testError && <div>Error: {testError}</div>}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="bg-vscode-editorWidget-background p-4 rounded-md border border-vscode-panelBorder">
          <div className="flex items-start">
            <div className="bg-vscode-button-background rounded-full p-2 mr-3">
              <Wand2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-medium mb-1">{t("createAPlugin")}</h3>
              <p className="text-sm text-vscode-descriptionForeground mb-3">
                {t("createPluginDescription")}
              </p>
              <Button 
                size="sm" 
                className="flex items-center"
                onClick={onOpenWizard}
              >
                <PlusCircle className="w-4 h-4 mr-1" />
                {t("createPlugin")}
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
              <h3 className="font-medium mb-1">{t("browseRegistry")}</h3>
              <p className="text-sm text-vscode-descriptionForeground mb-3">
                {t("browseRegistryDescription")}
              </p>
              <Button 
                size="sm" 
                variant="outline"
                className="flex items-center"
                onClick={onAddPlugin}
              >
                <Download className="w-4 h-4 mr-1" />
                {t("browseRegistry")}
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-vscode-editorWidget-background p-4 rounded-md border border-vscode-panelBorder">
        <h3 className="font-medium mb-2">{t("learnMore")}</h3>
        <p className="text-sm text-vscode-descriptionForeground mb-3">
          {t("pluginDocumentation")}
        </p>
        <div className="flex flex-col sm:flex-row gap-3">
          <Button 
            variant="outline" 
            size="sm" 
            className="flex items-center"
            onClick={() => window.open('https://example.com/roo-plugins-docs', '_blank')}
          >
            <ExternalLink className="w-4 h-4 mr-1" />
            {t("pluginDocumentation")}
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            className="flex items-center"
            onClick={() => window.open('https://example.com/roo-plugins-examples', '_blank')}
          >
            <ExternalLink className="w-4 h-4 mr-1" />
            {t("examplePlugins")}
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            className="flex items-center"
            onClick={() => window.open('https://example.com/roo-plugins-api', '_blank')}
          >
            <ExternalLink className="w-4 h-4 mr-1" />
            {t("pluginAPI")}
          </Button>
        </div>
      </div>

      <div className="mt-6 text-center text-sm text-vscode-descriptionForeground">
        <p>{t("pluginSecurityNote")}</p>
      </div>
    </div>
  )
}