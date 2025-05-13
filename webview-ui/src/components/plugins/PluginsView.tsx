import React, {
	forwardRef,
	memo,
	useCallback,
	useEffect,
	useImperativeHandle,
	useLayoutEffect,
	useMemo,
	useRef,
	useState,
} from "react"
import { useAppTranslation } from "@/i18n/TranslationContext"
import {
	Package,
	Download,
	Settings,
	LucideIcon,
} from "lucide-react"

import { vscode } from "@/utilities/vscode"
import { useExtensionState } from "@/context/ExtensionStateContext"
import { PluginExtensionIntegration } from "./services/PluginExtensionIntegration"
import { PluginManager } from "./services/PluginManager"
import { RooPluginEntry } from "./schemas/plugin-schema"
import {
	AlertDialog,
	AlertDialogContent,
	AlertDialogTitle,
	AlertDialogDescription,
	AlertDialogCancel,
	AlertDialogAction,
	AlertDialogHeader,
	AlertDialogFooter,
	Button,
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui"

import { Tab, TabContent, TabHeader, TabList, TabTrigger } from "../common/Tab"
import { InstalledPlugins } from "./InstalledPlugins"
import { PluginRegistry } from "./PluginRegistry"
import { PluginSettings } from "./PluginSettings"
import { PluginWizard } from "./PluginWizard"
import { cn } from "@/lib/utils"

export const pluginsTabsContainer = "flex flex-1 overflow-hidden [&.narrow_.tab-label]:hidden"
export const pluginsTabList =
	"w-48 data-[compact=true]:w-12 flex-shrink-0 flex flex-col overflow-y-auto overflow-x-hidden border-r border-vscode-sideBar-background"
export const pluginsTabTrigger =
	"whitespace-nowrap overflow-hidden min-w-0 h-12 px-4 py-3 box-border flex items-center border-l-2 border-transparent text-vscode-foreground opacity-70 hover:bg-vscode-list-hoverBackground data-[compact=true]:w-12 data-[compact=true]:p-4"
export const pluginsTabTriggerActive = "opacity-100 border-vscode-focusBorder bg-vscode-list-activeSelectionBackground"

export interface PluginsViewRef {
	checkUnsaveChanges: (then: () => void) => void
}

const sectionNames = [
	"installed",
	"registry",
	"settings",
] as const

type SectionName = (typeof sectionNames)[number]

type PluginsViewProps = {
	onDone: () => void
	targetSection?: string
}


const PluginsView = forwardRef<PluginsViewRef, PluginsViewProps>(({ onDone, targetSection }, ref) => {
	const { t } = useAppTranslation()

	const _extensionState = useExtensionState()

	const [isDiscardDialogShow, setDiscardDialogShow] = useState(false)
	const [isChangeDetected, setChangeDetected] = useState(false)
	// Error handling state
	const [_errorMessage, setErrorMessage] = useState<string | undefined>(undefined)
	
	// Display error as toast or notification
	useEffect(() => {
		if (_errorMessage) {
			// Show error notification
			console.error(_errorMessage)
			
			// Clear error after 5 seconds
			const timer = setTimeout(() => {
				setErrorMessage(undefined)
			}, 5000)
			
			return () => clearTimeout(timer)
		}
	}, [_errorMessage])
	const [activeTab, setActiveTab] = useState<SectionName>(
		targetSection && sectionNames.includes(targetSection as SectionName)
			? (targetSection as SectionName)
			: "installed",
	)

	// Plugin state
	const [plugins, setPlugins] = useState<RooPluginEntry[]>([])
	const [isLoading, setIsLoading] = useState(true)
	const pluginManager = useRef(new PluginManager())
	
	// Load plugins on mount
	useEffect(() => {
		loadPlugins()
	}, [])
	
	// Load plugins from extension
	const loadPlugins = async () => {
		setIsLoading(true)
		try {
			const result = await PluginExtensionIntegration.getPlugins()
			if (result.success && result.plugins) {
				setPlugins(result.plugins)
				pluginManager.current.loadManifest({ plugins: result.plugins })
			} else {
				setErrorMessage(result.error || "Failed to load plugins")
			}
		} catch (error) {
			setErrorMessage(error instanceof Error ? error.message : "Unknown error loading plugins")
		} finally {
			setIsLoading(false)
		}
	}

	const confirmDialogHandler = useRef<() => void>()
	const [showWizard, setShowWizard] = useState(false)

	// Handle unsaved changes
	const checkUnsaveChanges = useCallback((then: () => void) => {
		if (isChangeDetected) {
			setDiscardDialogShow(true)
			confirmDialogHandler.current = then
		} else {
			then()
		}
	}, [isChangeDetected])

	// Implement the ref interface
	useImperativeHandle(ref, () => ({
		checkUnsaveChanges,
	}))

	const handleSubmit = useCallback(() => {
		// Save any pending changes
		vscode.postMessage({
			type: "savePlugins",
			plugins: pluginManager.current.getPlugins()
		})
		setChangeDetected(false)
	}, [])

	const handleTabChange = useCallback(
		(tabId: SectionName) => {
			if (tabId === activeTab) return

			checkUnsaveChanges(() => {
				setActiveTab(tabId)
			})
		},
		[activeTab, checkUnsaveChanges],
	)

	// Track whether we're in compact mode
	const [isCompactMode, setIsCompactMode] = useState(false)
	const containerRef = useRef<HTMLDivElement>(null)
	const tabRefs = useRef<Record<string, HTMLDivElement | null>>({})

	// Setup resize observer to detect when we should switch to compact mode
	useEffect(() => {
		if (!containerRef.current) return

		const observer = new ResizeObserver((entries) => {
			for (const entry of entries) {
				// If container width is less than 500px, switch to compact mode
				setIsCompactMode(entry.contentRect.width < 500)
			}
		})

		observer.observe(containerRef.current)

		return () => {
			observer?.disconnect()
		}
	}, [])

	const sections: { id: SectionName; icon: LucideIcon }[] = useMemo(
		() => [
			{ id: "installed", icon: Package },
			{ id: "registry", icon: Download },
			{ id: "settings", icon: Settings },
		],
		[]
	)

	// Update target section logic to set active tab
	useEffect(() => {
		if (targetSection && sectionNames.includes(targetSection as SectionName)) {
			setActiveTab(targetSection as SectionName)
		}
	}, [targetSection])

	// Function to scroll the active tab into view for vertical layout
	const scrollToActiveTab = useCallback(() => {
		const activeTabElement = tabRefs.current[activeTab]

		if (activeTabElement) {
			activeTabElement.scrollIntoView({
				behavior: "smooth",
				block: "nearest",
			})
		}
	}, [activeTab])

	// Apply the scroll effect when active tab changes
	useLayoutEffect(() => {
		scrollToActiveTab()
	}, [activeTab, scrollToActiveTab])

	return (
		<Tab>
			<TabHeader className="flex justify-between items-center gap-2">
				<div className="flex items-center gap-1">
					<h3 className="text-vscode-foreground m-0">{t("common:plugins")}</h3>
				</div>
				<div className="flex gap-2">
					<Button
						variant={isChangeDetected ? "default" : "secondary"}
						title={isChangeDetected ? t("settings:header.saveButtonTooltip") : t("settings:header.nothingChangedTooltip")}
						onClick={handleSubmit}
						disabled={!isChangeDetected}
						data-testid="save-button">
						{t("settings:common.save")}
					</Button>
					<Button
						variant="secondary"
						title={t("settings:header.doneButtonTooltip")}
						onClick={() => checkUnsaveChanges(onDone)}>
						{t("settings:common.done")}
					</Button>
				</div>
			</TabHeader>

			{/* Vertical tabs layout */}
			<div ref={containerRef} className={cn(pluginsTabsContainer, isCompactMode && "narrow")}>
				{/* Tab sidebar */}
				<TabList
					value={activeTab}
					onValueChange={(value) => handleTabChange(value as SectionName)}
					className={cn(pluginsTabList)}
					data-compact={isCompactMode}
					data-testid="plugins-tab-list">
					{sections.map(({ id, icon: Icon }) => {
						const isSelected = id === activeTab
						const onSelect = () => handleTabChange(id)

						// Base TabTrigger component definition
						const triggerComponent = (
							<TabTrigger
								ref={(element) => (tabRefs.current[id] = element as any)}
								value={id}
								isSelected={isSelected}
								className={cn(
									isSelected
										? `${pluginsTabTrigger} ${pluginsTabTriggerActive}`
										: pluginsTabTrigger,
									"focus:ring-0",
								)}
								data-testid={`tab-${id}`}
								data-compact={isCompactMode}>
								<div className={cn("flex items-center gap-2", isCompactMode && "justify-center")}>
									<Icon className="w-4 h-4" />
									<span className="tab-label">{t(`common:pluginSections.${id}`)}</span>
								</div>
							</TabTrigger>
						)

						if (isCompactMode) {
							// Wrap in Tooltip for compact mode
							return (
								<TooltipProvider key={id} delayDuration={0}>
									<Tooltip>
										<TooltipTrigger asChild onClick={onSelect}>
											{React.cloneElement(triggerComponent)}
										</TooltipTrigger>
										<TooltipContent side="right" className="text-base">
											<p className="m-0">{t(`common:pluginSections.${id}`)}</p>
										</TooltipContent>
									</Tooltip>
								</TooltipProvider>
							)
						} else {
							return React.cloneElement(triggerComponent, { key: id })
						}
					})}
				</TabList>

				{/* Content area */}
				<TabContent className="p-0 flex-1 overflow-auto">
					{/* Installed Plugins Section */}
					{activeTab === "installed" && (
						<>
							{isLoading ? (
								<div className="flex items-center justify-center h-40">
									<div className="w-8 h-8 border-4 border-t-transparent border-vscode-foreground rounded-full animate-spin"></div>
								</div>
							) : (
								<InstalledPlugins
									onAddPlugin={() => setShowWizard(true)}
									plugins={plugins}
									onPluginsChanged={loadPlugins}
								/>
							)}
						</>
					)}

					{/* Plugin Registry Section */}
					{activeTab === "registry" && (
						<PluginRegistry
							onInstallPlugin={(_plugin) => {
								// Handle plugin installation from registry
								loadPlugins() // Refresh after installation
								setChangeDetected(true)
							}}
						/>
					)}

					{/* Plugin Settings Section */}
					{activeTab === "settings" && (
						<PluginSettings
							pluginManager={pluginManager.current}
							onSettingsChanged={() => {
								setChangeDetected(true)
							}}
						/>
					)}
				</TabContent>
			</div>

			{/* Plugin Wizard Dialog */}
			{showWizard && (
				<PluginWizard
					onClose={() => setShowWizard(false)}
					onSave={async (plugin) => {
						// Install the plugin
						try {
							const result = await PluginExtensionIntegration.installPlugin(plugin)
							if (result.success) {
								setShowWizard(false)
								setChangeDetected(true)
								loadPlugins() // Refresh plugins list
							} else {
								setErrorMessage(result.error || "Failed to install plugin")
							}
						} catch (error) {
							setErrorMessage(error instanceof Error ? error.message : "Unknown error installing plugin")
						}
					}}
				/>
			)}

			{/* Unsaved Changes Dialog */}
			<AlertDialog open={isDiscardDialogShow} onOpenChange={setDiscardDialogShow}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>{t("settings:header.unsavedChangesTitle")}</AlertDialogTitle>
						<AlertDialogDescription>
							{t("settings:header.unsavedChangesDescription")}
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>{t("settings:header.keepEditing")}</AlertDialogCancel>
						<AlertDialogAction
							onClick={() => {
								if (confirmDialogHandler.current) {
									confirmDialogHandler.current()
									setChangeDetected(false)
								}
							}}>
							{t("settings:header.discardChanges")}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</Tab>
	)
})

PluginsView.displayName = "PluginsView"

export default memo(PluginsView)