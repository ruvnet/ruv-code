import { memo, useRef, useState, useEffect } from "react"
import { useWindowSize } from "react-use"
import { useTranslation } from "react-i18next"
import { VSCodeBadge } from "@vscode/webview-ui-toolkit/react"
import { CloudUpload, CloudDownload, Info } from "lucide-react"

import { ClineMessage } from "@roo/shared/ExtensionMessage"

import { getMaxTokensForModel } from "@src/utils/model-utils"
import { formatLargeNumber } from "@src/utils/format"
import { cn } from "@src/lib/utils"
import { Button, DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@src/components/ui"
import { useExtensionState } from "@src/context/ExtensionStateContext"
import { useSelectedModel } from "@/components/ui/hooks/useSelectedModel"

import Thumbnails from "../common/Thumbnails"
import { TaskActions } from "../chat/TaskActions"
import { ContextWindowProgress } from "../chat/ContextWindowProgress"
import { Mention } from "../chat/Mention"
import TaskBadge from "./TaskBadge"
import { TaskState } from "./InboxSidebar"
import TaskStateTransition from "./TaskStateTransition"

// Import CSS for animations and styling
import "./inbox.css"

export interface InboxTaskHeaderProps {
	task: ClineMessage
	tokensIn: number
	tokensOut: number
	doesModelSupportPromptCache: boolean
	cacheWrites?: number
	cacheReads?: number
	totalCost: number
	contextTokens: number
	onClose: () => void
	taskState?: TaskState
	onChangeState?: (taskId: string, newState: TaskState) => void
	running?: boolean
	onRunningChange?: (taskId: string, running: boolean) => void
}

const InboxTaskHeader = ({
	task,
	tokensIn,
	tokensOut,
	doesModelSupportPromptCache,
	cacheWrites,
	cacheReads,
	totalCost,
	contextTokens,
	onClose,
	taskState = "active",
	onChangeState,
	running = false,
	onRunningChange,
}: InboxTaskHeaderProps) => {
	const { t } = useTranslation()
	const { apiConfiguration, currentTaskItem } = useExtensionState()
	const { info: model } = useSelectedModel(apiConfiguration)
	const [isTaskExpanded, setIsTaskExpanded] = useState(false)
	const [showShortcutsTooltip, setShowShortcutsTooltip] = useState(false)

	const textContainerRef = useRef<HTMLDivElement>(null)
	const textRef = useRef<HTMLDivElement>(null)
	const contextWindow = model?.contextWindow || 1

	const { width: windowWidth } = useWindowSize()
	
	// Keyboard shortcut for changing state
	const stateShortcuts = {
		active: "Alt+A",
		completed: "Alt+C", 
		archived: "Alt+R"
	};
	
	// Add keyboard shortcut event listeners
	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			// Only process if Alt key is pressed
			if (!e.altKey) return;
			
			// Handle state change shortcuts if onChangeState is defined
			if (onChangeState) {
				if (e.key === "a" || e.key === "A") {
					// Alt+A: Set to Active
					if (taskState !== "active") {
						onChangeState(task.ts.toString(), "active");
					}
				} else if (e.key === "c" || e.key === "C") {
					// Alt+C: Set to Completed
					if (taskState !== "completed") {
						onChangeState(task.ts.toString(), "completed");
					}
				} else if (e.key === "r" || e.key === "R") {
					// Alt+R: Set to Archived
					if (taskState !== "archived") {
						onChangeState(task.ts.toString(), "archived");
					}
				}
			}
			
			// Alt+B: Toggle shortcuts tooltip
			if (e.key === "b" || e.key === "B") {
				setShowShortcutsTooltip(prev => !prev);
			}
			
			// Alt+S: Toggle running state
			if ((e.key === "s" || e.key === "S") && onRunningChange) {
				onRunningChange(task.ts.toString(), !running);
			}
		};
		
		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [task.ts, taskState, onChangeState, running, onRunningChange]);

	return (
		<div className="py-2 px-3">
			<TaskStateTransition taskState={taskState}>
				<div
					className={cn(
						"rounded-xs p-2.5 flex flex-col gap-1.5 relative z-1 border",
						`task-row task-row-${taskState}`,
						taskState === "completed" ? "task-completed" : "",
						taskState === "archived" ? "task-archived" : "",
						!!isTaskExpanded
							? "border-vscode-panel-border text-vscode-foreground"
							: "border-vscode-panel-border/80 text-vscode-foreground/80",
					)}>
					<div className="flex justify-between items-center gap-2">
						<div
							className="flex items-center cursor-pointer select-none grow min-w-0"
							onClick={() => setIsTaskExpanded(!isTaskExpanded)}>
							<div className="flex items-center shrink-0">
								<span className={`codicon codicon-chevron-${isTaskExpanded ? "down" : "right"}`}></span>
							</div>
							<div className="flex items-center ml-1.5 whitespace-nowrap overflow-hidden text-ellipsis grow min-w-0">
								<span className="codicon codicon-inbox mr-2"></span>
								<span className="font-bold">
									{t("inbox:task.title", "Inbox Task")}
									{!isTaskExpanded && ":"}
								</span>
								
								{/* Display task state badge */}
								<TaskBadge
									state={taskState}
									showLabel={true}
									size="sm"
									className="ml-2"
								/>
								
								{/* Running indicator */}
								{running && (
									<span className="ml-2 animate-pulse text-vscode-button-background">
										<span className="codicon codicon-play"></span>
									</span>
								)}
								
								{!isTaskExpanded && (
									<span className="ml-1">
										<Mention text={task.text} />
									</span>
								)}
							</div>
						</div>
						
						{/* Task state controls dropdown */}
						{onChangeState && (
							<DropdownMenu>
								<DropdownMenuTrigger asChild>
									<Button
										variant="ghost"
										size="icon"
										title={t("inbox:taskState")}
										className="shrink-0 w-5 h-5 mr-1">
										<span className="codicon codicon-briefcase" />
									</Button>
								</DropdownMenuTrigger>
								<DropdownMenuContent align="end">
									<DropdownMenuItem
										className="flex items-center cursor-pointer"
										disabled={taskState === "active"}
										onClick={() => onChangeState && onChangeState(task.ts.toString(), "active")}
									>
										<TaskBadge state="active" size="sm" showLabel={false} className="mr-2" />
										{t("inbox:categories.active")}
										<span className="ml-auto kbd-shortcut">{stateShortcuts.active}</span>
									</DropdownMenuItem>
									<DropdownMenuItem
										className="flex items-center cursor-pointer"
										disabled={taskState === "completed"}
										onClick={() => onChangeState && onChangeState(task.ts.toString(), "completed")}
									>
										<TaskBadge state="completed" size="sm" showLabel={false} className="mr-2" />
										{t("inbox:categories.completed")}
										<span className="ml-auto kbd-shortcut">{stateShortcuts.completed}</span>
									</DropdownMenuItem>
									<DropdownMenuItem
										className="flex items-center cursor-pointer"
										disabled={taskState === "archived"}
										onClick={() => onChangeState && onChangeState(task.ts.toString(), "archived")}
									>
										<TaskBadge state="archived" size="sm" showLabel={false} className="mr-2" />
										{t("inbox:categories.archived")}
										<span className="ml-auto kbd-shortcut">{stateShortcuts.archived}</span>
									</DropdownMenuItem>
								</DropdownMenuContent>
							</DropdownMenu>
						)}
						
						{/* Play/Stop button */}
						{onRunningChange && (
							<Button
								variant={running ? "destructive" : "secondary"}
								size="icon"
								onClick={() => onRunningChange(task.ts.toString(), !running)}
								title={running ? t("inbox:stopTask") + " (Alt+S)" : t("inbox:startTask") + " (Alt+S)"}
								className="shrink-0 w-5 h-5">
								{running ?
									<span className="codicon codicon-debug-stop" /> :
									<span className="codicon codicon-debug-start" />
								}
							</Button>
						)}
						
						{/* Keyboard shortcuts help button */}
						<Button
							variant="ghost"
							size="icon"
							onClick={() => setShowShortcutsTooltip(!showShortcutsTooltip)}
							title={t("inbox:shortcuts.title") + " (Alt+B)"}
							className="shrink-0 w-5 h-5">
							<Info size={14} />
						</Button>
						
						<Button
							variant="ghost"
							size="icon"
							onClick={onClose}
							title={t("inbox:task.closeAndStart", "Close task and start new one")}
							className="shrink-0 w-5 h-5">
							<span className="codicon codicon-close" />
						</Button>
					</div>
					
					{/* Keyboard shortcuts tooltip */}
					{showShortcutsTooltip && (
						<div className="bg-vscode-editor-background border border-vscode-panel-border p-2 rounded-sm text-xs mb-2">
							<div className="font-bold mb-1">{t("inbox:shortcuts.title")}</div>
							<div className="grid grid-cols-2 gap-1">
								<div><span className="kbd-shortcut">{stateShortcuts.active}</span> {t("inbox:shortcuts.active")}</div>
								<div><span className="kbd-shortcut">{stateShortcuts.completed}</span> {t("inbox:shortcuts.completed")}</div>
								<div><span className="kbd-shortcut">{stateShortcuts.archived}</span> {t("inbox:shortcuts.archived")}</div>
								<div><span className="kbd-shortcut">Alt+P</span> {t("inbox:shortcuts.process")}</div>
								<div><span className="kbd-shortcut">Alt+N</span> {t("inbox:shortcuts.createTask")}</div>
								<div><span className="kbd-shortcut">Alt+E</span> {t("inbox:shortcuts.edit")}</div>
								<div><span className="kbd-shortcut">Alt+S</span> {t("inbox:shortcuts.toggleRunning")}</div>
							</div>
						</div>
					)}
					
					{/* Collapsed state: Track context and cost if we have any */}
					{!isTaskExpanded && contextWindow > 0 && (
						<div className={`w-full flex flex-row gap-1 h-auto mt-1`}>
							<ContextWindowProgress
								contextWindow={contextWindow}
								contextTokens={contextTokens || 0}
								maxTokens={getMaxTokensForModel(model, apiConfiguration)}
							/>
							{!!totalCost && <VSCodeBadge>${totalCost.toFixed(2)}</VSCodeBadge>}
						</div>
					)}
					{/* Expanded state: Show task text and images */}
					{isTaskExpanded && (
						<>
							<div
								ref={textContainerRef}
								className="-mt-0.5 text-vscode-font-size overflow-y-auto break-words break-anywhere relative">
								<div
									ref={textRef}
									className={`overflow-auto max-h-80 whitespace-pre-wrap break-words break-anywhere ${taskState === "completed" ? "line-through opacity-80" : ""}`}
									style={{
										display: "-webkit-box",
										WebkitLineClamp: "unset",
										WebkitBoxOrient: "vertical",
									}}>
									<Mention text={task.text} />
								</div>
							</div>
							{task.images && task.images.length > 0 && (
								<Thumbnails 
									images={task.images} 
									style={taskState === "archived" ? { opacity: 0.7, filter: "grayscale(30%)" } : undefined}
								/>
							)}

							<div className="flex flex-col gap-1 mt-2">
								{isTaskExpanded && contextWindow > 0 && (
									<div
										className={`w-full flex ${windowWidth < 400 ? "flex-col" : "flex-row"} gap-1 h-auto mb-2`}>
										<div className="flex items-center gap-1 flex-shrink-0">
											<span className="font-bold" data-testid="context-window-label">
												{t("inbox:task.contextWindow", "Context Window")}
											</span>
										</div>
										<ContextWindowProgress
											contextWindow={contextWindow}
											contextTokens={contextTokens || 0}
											maxTokens={getMaxTokensForModel(model, apiConfiguration)}
										/>
									</div>
								)}
								<div className="flex justify-between items-center h-[20px] mb-1">
									<div className="flex items-center gap-1 flex-wrap">
										<span className="font-bold">{t("inbox:task.tokens", "Tokens")}</span>
										{typeof tokensIn === "number" && tokensIn > 0 && (
											<span className="flex items-center gap-0.5">
												<i className="codicon codicon-arrow-up text-xs font-bold" />
												{formatLargeNumber(tokensIn)}
											</span>
										)}
										{typeof tokensOut === "number" && tokensOut > 0 && (
											<span className="flex items-center gap-0.5">
												<i className="codicon codicon-arrow-down text-xs font-bold" />
												{formatLargeNumber(tokensOut)}
											</span>
										)}
									</div>
									{!totalCost && <TaskActions item={currentTaskItem} />}
								</div>

								{doesModelSupportPromptCache &&
									((typeof cacheReads === "number" && cacheReads > 0) ||
										(typeof cacheWrites === "number" && cacheWrites > 0)) && (
										<div className="flex items-center gap-1 flex-wrap h-[20px] mb-1">
											<span className="font-bold">{t("inbox:task.cache", "Cache")}</span>
											{typeof cacheWrites === "number" && cacheWrites > 0 && (
												<span className="flex items-center gap-0.5">
													<CloudUpload size={16} />
													{formatLargeNumber(cacheWrites)}
												</span>
											)}
											{typeof cacheReads === "number" && cacheReads > 0 && (
												<span className="flex items-center gap-0.5">
													<CloudDownload size={16} />
													{formatLargeNumber(cacheReads)}
												</span>
											)}
										</div>
									)}

								{!!totalCost && (
									<div className="flex justify-between items-center h-[20px] mb-1">
										<div className="flex items-center gap-1">
											<span className="font-bold">{t("inbox:task.apiCost", "API Cost")}</span>
											<span>${totalCost?.toFixed(2)}</span>
										</div>
										<TaskActions item={currentTaskItem} />
									</div>
								)}
							</div>
						</>
					)}
				</div>
			</TaskStateTransition>
		</div>
	)
}

export default memo(InboxTaskHeader)