import React, { useState, useEffect } from "react"
import { useAppTranslation } from "@/i18n/TranslationContext"
import { PluginManager } from "./services/PluginManager"
import { PluginExtensionIntegration } from "./services/PluginExtensionIntegration"
import {
  Settings,
  Save
} from "lucide-react"
import { VSCodeCheckbox, VSCodeTextField } from "@vscode/webview-ui-toolkit/react"
import { Section } from "@/components/settings/Section"
import { SectionHeader } from "@/components/plugins/SectionHeader"
import { Button } from "@/components/ui/button"

interface PluginSettingsProps {
  pluginManager: PluginManager;
  onSettingsChanged: () => void;
}

export const PluginSettings: React.FC<PluginSettingsProps> = ({
  pluginManager,
  onSettingsChanged
}) => {
  const { t } = useAppTranslation()
  
  // Plugin settings state
  const [settings, setSettings] = useState({
    enableRegistry: true,
    npmRegistry: "https://registry.npmjs.org",
    verifyPlugins: true,
    allowThirdParty: false,
    allowFileSystem: true,
    allowNetwork: true,
    allowTerminal: false,
    developerMode: false,
    pluginTimeout: "60"
  })
  
  const [storageInfo, setStorageInfo] = useState({
    storageSize: "0",
    pluginLocation: "~/.roo/plugins"
  })
  
  const [isLoading, setIsLoading] = useState(true)
  const [saveMessage, setSaveMessage] = useState<{type: 'success' | 'error', text: string} | null>(null)
  
  // Load settings on mount - non-blocking
  useEffect(() => {
    const loadSettings = async () => {
      // Start loading without initially showing the loading indicator
      // This allows the UI to render immediately
      setIsLoading(true)
      
      try {
        // Fetch plugin settings from extension
        const settingsResult = await PluginExtensionIntegration.getPluginSettings()
        
        if (settingsResult.success && settingsResult.settings) {
          // Update our settings with the saved ones from the extension
          setSettings(prev => ({
            ...prev,
            ...settingsResult.settings
          }))
        }
        
        // Simulate fetching storage info
        setStorageInfo({
          storageSize: "24.3 MB",
          pluginLocation: "~/.roo/plugins"
        })
      } catch (error) {
        console.error("Failed to load settings:", error)
      } finally {
        setIsLoading(false)
      }
    }
    
    // Start the loading process immediately
    loadSettings()
    
    // Return empty fragments to initialize with default values
    // This shows the UI immediately while data loads in background
    return () => {}
  }, [])
  
  // Handle settings changes
  const handleSettingChange = (key: keyof typeof settings, value: any) => {
    setSettings(prev => ({
      ...prev,
      [key]: value
    }))
    
    // Update plugin manager config if needed
    if (key === 'enableRegistry' || key === 'verifyPlugins') {
      // Update the plugin manager configuration
      pluginManager.setConfiguration?.({
        [key]: value
      })
    }
    
    // Notify parent component
    onSettingsChanged()
  }
  
  // Save settings to extension
  const handleSaveSettings = async () => {
    try {
      const result = await PluginExtensionIntegration.savePluginSettings(settings)
      
      if (result.success) {
        setSaveMessage({ type: 'success', text: t("common:settingsSaved") })
      } else {
        setSaveMessage({ type: 'error', text: result.error || t("common:saveSettingsError") })
      }
      
      // Clear message after a few seconds
      setTimeout(() => setSaveMessage(null), 3000)
    } catch (error) {
      setSaveMessage({
        type: 'error',
        text: `${t("common:saveSettingsError")}: ${error instanceof Error ? error.message : String(error)}`
      })
    }
  }
  
  // Handle clear cache
  const handleClearCache = async () => {
    try {
      // In a real implementation, this would call the extension
      await PluginExtensionIntegration.clearPluginCache()
      setSaveMessage({ type: 'success', text: t("common:cacheClearedSuccess") })
      
      // Reset after a few seconds
      setTimeout(() => setSaveMessage(null), 3000)
    } catch (error) {
      setSaveMessage({
        type: 'error',
        text: `${t("common:cacheClearError")}: ${error instanceof Error ? error.message : String(error)}`
      })
    }
  }

  return (
    <div className="relative">
      <SectionHeader>
        <div className="flex items-center gap-2">
          <Settings className="w-4" />
          <div>{t("common:pluginSettings")}</div>
        </div>
      </SectionHeader>

      <Section>
        <div className="space-y-6">
          {/* Plugin Sources Section */}
          <div>
            <h4 className="text-vscode-foreground text-base mb-2">
              {t("common:pluginSources")}
            </h4>
            <div className="bg-vscode-editor-background p-4 rounded-md border border-vscode-panelBorder">
              <div className="mb-4">
                <div className="mb-1 font-medium">{t("common:enableRegistry")}</div>
                <div className="flex items-center">
                  <VSCodeCheckbox
                    checked={settings.enableRegistry}
                    onChange={() => handleSettingChange('enableRegistry', !settings.enableRegistry)}
                  />
                  <span className="ml-2 text-vscode-descriptionForeground text-sm">
                    {t("common:allowPluginRegistry")}
                  </span>
                </div>
                <p className="text-xs text-vscode-descriptionForeground mt-1">
                  {t("common:registryDescription")}
                </p>
              </div>

              <div className="mb-4">
                <div className="mb-1 font-medium">{t("common:npmRegistry")}</div>
                <div className="flex gap-2 items-center">
                  <VSCodeTextField 
                    value={settings.npmRegistry}
                    style={{ width: '100%' }}
                    onChange={(e) => handleSettingChange('npmRegistry', (e.target as HTMLInputElement).value)}
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleClearCache}
                  >
                    {t("common:reset")}
                  </Button>
                </div>
                <p className="text-xs text-vscode-descriptionForeground mt-1">
                  {t("common:npmRegistryDescription")}
                </p>
              </div>
            </div>
          </div>

          {/* Plugin Security Settings */}
          <div>
            <h4 className="text-vscode-foreground text-base mb-2">
              {t("common:security")}
            </h4>
            <div className="bg-vscode-editor-background p-4 rounded-md border border-vscode-panelBorder">
              <div className="mb-4">
                <div className="flex items-center">
                  <VSCodeCheckbox
                    checked={settings.verifyPlugins}
                    onChange={() => handleSettingChange('verifyPlugins', !settings.verifyPlugins)}
                  />
                  <span className="ml-2 font-medium">
                    {t("common:verifyPlugins")}
                  </span>
                </div>
                <p className="text-xs text-vscode-descriptionForeground mt-1">
                  {t("common:verifyPluginsDescription")}
                </p>
              </div>

              <div className="mb-4">
                <div className="flex items-center">
                  <VSCodeCheckbox
                    checked={settings.allowThirdParty}
                    onChange={() => handleSettingChange('allowThirdParty', !settings.allowThirdParty)}
                  />
                  <span className="ml-2 font-medium">
                    {t("common:allowThirdParty")}
                  </span>
                </div>
                <p className="text-xs text-vscode-descriptionForeground mt-1">
                  {t("common:allowThirdPartyDescription")}
                </p>
              </div>

              <div>
                <div className="mb-1 font-medium">{t("common:pluginPermissions")}</div>
                <div className="flex items-center">
                  <VSCodeCheckbox
                    checked={settings.allowFileSystem}
                    onChange={() => handleSettingChange('allowFileSystem', !settings.allowFileSystem)}
                  />
                  <span className="ml-2 text-vscode-descriptionForeground text-sm">
                    {t("common:allowFileSystem")}
                  </span>
                </div>
                <div className="flex items-center mt-2">
                  <VSCodeCheckbox
                    checked={settings.allowNetwork}
                    onChange={() => handleSettingChange('allowNetwork', !settings.allowNetwork)}
                  />
                  <span className="ml-2 text-vscode-descriptionForeground text-sm">
                    {t("common:allowNetwork")}
                  </span>
                </div>
                <div className="flex items-center mt-2">
                  <VSCodeCheckbox
                    checked={settings.allowTerminal}
                    onChange={() => handleSettingChange('allowTerminal', !settings.allowTerminal)}
                  />
                  <span className="ml-2 text-vscode-descriptionForeground text-sm">
                    {t("common:allowTerminal")}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Plugin Storage Section */}
          <div>
            <h4 className="text-vscode-foreground text-base mb-2">
              {t("common:storage")}
            </h4>
            <div className="bg-vscode-editor-background p-4 rounded-md border border-vscode-panelBorder">
              <div className="mb-4">
                <div className="mb-1 font-medium">{t("common:pluginStorage")}</div>
                <div className="flex items-center justify-between">
                  <span className="text-vscode-descriptionForeground text-sm">
                    {t("common:currentStorage")}: {storageInfo.storageSize}
                  </span>
                  <Button size="sm" variant="outline">
                    {t("common:clearCache")}
                  </Button>
                </div>
              </div>

              <div className="flex items-center justify-between mt-4">
                <span className="text-sm">{t("common:pluginLocation")}</span>
                <code className="bg-vscode-editor-background text-xs p-1 rounded">
                  {storageInfo.pluginLocation}
                </code>
              </div>
            </div>
          </div>

          {/* Advanced Settings */}
          <div>
            <h4 className="text-vscode-foreground text-base mb-2">
              {t("common:advanced")}
            </h4>
            <div className="bg-vscode-editor-background p-4 rounded-md border border-vscode-panelBorder">
              <div className="mb-4">
                <div className="flex items-center">
                  <VSCodeCheckbox
                    checked={settings.developerMode}
                    onChange={() => handleSettingChange('developerMode', !settings.developerMode)}
                  />
                  <span className="ml-2 font-medium">
                    {t("common:developerMode")}
                  </span>
                </div>
                <p className="text-xs text-vscode-descriptionForeground mt-1">
                  {t("common:developerModeDescription")}
                </p>
              </div>

              <div className="mb-4">
                <div className="mb-1 font-medium">{t("common:pluginTimeout")}</div>
                <select
                  className="py-1 px-2 bg-vscode-dropdown-background text-vscode-dropdown-foreground border border-vscode-dropdown-border rounded-md"
                  value={settings.pluginTimeout}
                  onChange={(e) => handleSettingChange('pluginTimeout', e.target.value)}
                >
                  <option value="30">30 {t("common:seconds")}</option>
                  <option value="60">60 {t("common:seconds")}</option>
                  <option value="120">120 {t("common:seconds")}</option>
                  <option value="300">300 {t("common:seconds")}</option>
                </select>
              </div>
            </div>
          </div>
          
          {/* Save settings button */}
          <div className="mt-6">
            <Button
              className="flex items-center"
              onClick={handleSaveSettings}
            >
              <Save size={14} className="mr-1" />
              {t("common:saveSettings")}
            </Button>
          </div>
          
          {/* Status message */}
          {saveMessage && (
            <div className={`mt-4 p-2 rounded ${
              saveMessage.type === 'success'
                ? 'bg-vscode-button-background text-vscode-foreground'
                : 'bg-vscode-errorBackground text-vscode-errorForeground'
            }`}>
              {saveMessage.text}
            </div>
          )}
          
          {/* Non-blocking loading indicator */}
          {isLoading && (
            <div className="absolute top-4 right-4 flex items-center bg-vscode-editorWidget-background px-3 py-2 rounded-md shadow-md z-10">
              <div className="w-4 h-4 border-2 border-t-transparent border-vscode-foreground rounded-full animate-spin mr-2"></div>
              <span className="text-sm text-vscode-foreground">Loading settings...</span>
            </div>
          )}
        </div>
      </Section>
    </div>
  )
}