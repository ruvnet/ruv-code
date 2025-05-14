import React, { memo, useEffect, useMemo, useRef, useState } from "react"
import { useSize } from "react-use"
import { useTranslation } from "react-i18next"
import deepEqual from "fast-deep-equal"
import { ChevronDown, Play, Square } from "lucide-react"

import { ClineMessage } from "@roo/shared/ExtensionMessage"
import { TaskState } from "./InboxSidebar"

import { useCopyToClipboard } from "@src/utils/clipboard"
import {
  Button,
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem
} from "@src/components/ui"

import MarkdownBlock from "../common/MarkdownBlock"
import Thumbnails from "../common/Thumbnails"
import { Mention } from "../chat/Mention"
import TaskBadge from "./TaskBadge"
import PriorityBadge from "./PriorityBadge"
import TaskStateTransition from "./TaskStateTransition"

// Import the CSS for animations and state-based styling
import "./inbox.css"

/**
 * Props for the InboxRow component
 */
interface InboxRowProps {
	message: ClineMessage
	isExpanded: boolean
	isLast: boolean
	isStreaming: boolean
	onToggleExpand: () => void
	onHeightChange: (isTaller: boolean) => void
	onProcessTask?: () => void
	taskState?: TaskState
	onChangeState?: (taskId: string, newState: TaskState) => void
	running?: boolean
	onRunningChange?: (taskId: string, running: boolean) => void
}

/**
 * Content props exclude onHeightChange for internal use
 */
interface InboxRowContentProps extends Omit<InboxRowProps, "onHeightChange"> {}

/**
 * InboxRow Component
 * 
 * This component renders a single task row in the inbox.
 * It displays task information and provides interaction options.
 */
const InboxRow = memo(
	(props: InboxRowProps) => {
		const { isLast, onHeightChange, message } = props
		// Store the previous height to compare with the current height
		// This allows us to detect changes without causing re-renders
		const prevHeightRef = useRef(0)

		const [row, { height }] = useSize(
			<div className="px-[15px] py-[10px] pr-[6px]">
				<InboxRowContent {...props} />
			</div>,
		)

		useEffect(() => {
			// used for partials, command output, etc.
			const isInitialRender = prevHeightRef.current === 0 // prevents scrolling when new element is added
			// height starts off at Infinity
			if (isLast && height !== 0 && height !== Infinity && height !== prevHeightRef.current) {
				if (!isInitialRender) {
					onHeightChange(height > prevHeightRef.current)
				}
				prevHeightRef.current = height
			}
		}, [height, isLast, onHeightChange, message])

		return row
	},
	// memo does deep comparison of props
	deepEqual,
)

export default InboxRow

/**
 * The main content of the InboxRow
 */
export const InboxRowContent: React.FC<InboxRowContentProps> = ({
	message,
	isExpanded,
	isLast: _isLast,
	isStreaming: _isStreaming,
	onToggleExpand,
	onProcessTask,
	taskState = "active",
	onChangeState,
	running = false,
	onRunningChange,
}) => {
	const { t } = useTranslation()
	const { copyWithFeedback } = useCopyToClipboard()
	const [showCopySuccess, setShowCopySuccess] = useState(false)

	// For demonstration, using a mocked priority value
	// In a real implementation, this would come from the task metadata
	const priority = useMemo(() => {
		// Extract priority from message text if available
		const priorityMatch = message.text?.match(/\*\*Priority:\*\*\s+(\w+)/i);
		if (priorityMatch && ["high", "medium", "low"].includes(priorityMatch[1].toLowerCase())) {
			return priorityMatch[1].toLowerCase() as "high" | "medium" | "low";
		}
		return "medium"; // Default priority
	}, [message.text]);

	// Keyboard shortcut for changing state
	const stateShortcuts = {
		active: "Alt+A",
		completed: "Alt+C", 
		archived: "Alt+R"
	};

	return (
		<TaskStateTransition 
			taskState={taskState}
			className={`task-row task-row-${taskState} ${running ? "task-running" : ""}`}
		>
			<div className={`
				border border-vscode-panel-border rounded-sm mb-2 bg-vscode-editor-background
				transition-all duration-200
				${taskState === "completed" ? "task-completed" : ""}
				${taskState === "archived" ? "task-archived" : ""}
				${running ? "task-running border-l-4 border-l-vscode-button-background" : ""}
			`}>
				<div className="flex justify-between items-start p-3">
					<div 
						className="flex-grow cursor-pointer"
						onClick={onToggleExpand}
					>
						<div className="flex items-center mb-2">
							{/* Task state indicator */}
							<TaskBadge state={taskState} size="sm" className="mr-2" />
							
							<span className="font-medium text-vscode-foreground">
								{t("inbox:task.title", "Inbox Task")}
							</span>
							
							{/* Priority badge */}
							<PriorityBadge 
								priority={priority}
								size="sm"
								className="ml-2"
							/>
							
							{/* Running indicator */}
							{running && (
								<span className="ml-2 animate-pulse text-vscode-button-background">
									<span className="codicon codicon-play"></span>
								</span>
							)}
							
							<span className={`codicon codicon-chevron-${isExpanded ? "up" : "down"} ml-auto`} />
						</div>
						
						{!isExpanded && (
							<div className={`
								text-vscode-descriptionForeground text-sm truncate
								${taskState === "completed" ? "line-through" : ""}
							`}>
								<Mention text={message.text} />
							</div>
						)}
					</div>
					
					<div className="flex space-x-2">
						{/* Play/Stop button */}
						{onRunningChange && (
							<Button
								variant={running ? "destructive" : "secondary"}
								size="sm"
								onClick={(e) => {
                                    e.stopPropagation();
                                    onRunningChange(message.ts.toString(), !running);
                                }}
								title={running ? t("inbox:stopTask") : t("inbox:startTask")}
								className="flex items-center"
							>
								{running ? (
									<>
										<Square size={14} className="mr-1" />
										{t("inbox:stopTask")}
									</>
								) : (
									<>
										<Play size={14} className="mr-1" />
										{t("inbox:startTask")}
									</>
								)}
							</Button>
						)}
						
						{/* Task state dropdown */}
						<DropdownMenu>
							<DropdownMenuTrigger asChild>
								<Button
									variant="secondary"
									size="sm"
									className="flex items-center"
								>
									<TaskBadge state={taskState} size="sm" />
									<ChevronDown size={14} className="ml-1" />
								</Button>
							</DropdownMenuTrigger>
							<DropdownMenuContent align="end">
								<DropdownMenuItem
									className="flex items-center cursor-pointer"
									disabled={taskState === "active"}
									onClick={() => onChangeState && onChangeState(message.ts.toString(), "active")}
								>
									<TaskBadge state="active" size="sm" showLabel={false} className="mr-2" />
									{t("inbox:categories.active")}
									<span className="ml-auto kbd-shortcut">{stateShortcuts.active}</span>
								</DropdownMenuItem>
								<DropdownMenuItem
									className="flex items-center cursor-pointer"
									disabled={taskState === "completed"}
									onClick={() => onChangeState && onChangeState(message.ts.toString(), "completed")}
								>
									<TaskBadge state="completed" size="sm" showLabel={false} className="mr-2" />
									{t("inbox:categories.completed")}
									<span className="ml-auto kbd-shortcut">{stateShortcuts.completed}</span>
								</DropdownMenuItem>
								<DropdownMenuItem
									className="flex items-center cursor-pointer"
									disabled={taskState === "archived"}
									onClick={() => onChangeState && onChangeState(message.ts.toString(), "archived")}
								>
									<TaskBadge state="archived" size="sm" showLabel={false} className="mr-2" />
									{t("inbox:categories.archived")}
									<span className="ml-auto kbd-shortcut">{stateShortcuts.archived}</span>
								</DropdownMenuItem>
							</DropdownMenuContent>
						</DropdownMenu>
						
						{/* Process button */}
						<Button
							variant="secondary"
							size="sm"
							onClick={onProcessTask}
							title={t("inbox:processTask") + " (Alt+P)"}
						>
							{t("inbox:processTask")}
						</Button>
					</div>
				</div>
				
				{isExpanded && (
					<div className="px-3 pb-3">
						<div className="border-t border-vscode-panel-border pt-3">
							<div className={taskState === "completed" ? "line-through opacity-80" : ""}>
								<MarkdownBlock markdown={message.text || ""} />
							</div>
							
							{message.images && message.images.length > 0 && (
								<Thumbnails 
									images={message.images} 
									style={{ 
										marginTop: "8px",
										...(taskState === "archived" ? { opacity: 0.7, filter: "grayscale(30%)" } : {})
									}} 
								/>
							)}
							
							<div className="mt-3 flex justify-between items-center">
								<div className="text-xs text-vscode-descriptionForeground">
									{new Date(message.ts).toLocaleString()}
								</div>
								
								<Button
									variant="ghost"
									size="sm"
									title={t("common:copyText") + " (Ctrl+C)"}
									onClick={(e) => {
										e.stopPropagation();
										
										copyWithFeedback(message.text || "").then((success) => {
											if (success) {
												setShowCopySuccess(true);
												setTimeout(() => {
													setShowCopySuccess(false);
												}, 1000);
											}
										});
									}}
								>
									<span className={`codicon codicon-${showCopySuccess ? "check" : "copy"}`} />
								</Button>
							</div>
						</div>
					</div>
				)}
			</div>
		</TaskStateTransition>
	)
}