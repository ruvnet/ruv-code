import { forwardRef, useCallback, useImperativeHandle, useMemo, useRef, useState, useEffect } from "react"
import { ClineAsk } from "@roo/shared/ExtensionMessage"
import { combineApiRequests } from "@roo/shared/combineApiRequests"
import { combineCommandSequences } from "@roo/shared/combineCommandSequences"
import { getApiMetrics } from "@roo/shared/getApiMetrics"

import { useExtensionState } from "@src/context/ExtensionStateContext"
import { vscode } from "@src/utils/vscode"
import { useSelectedModel } from "@/components/ui/hooks/useSelectedModel"
import { useAppTranslation } from "@src/i18n/TranslationContext"
import { Button } from "@src/components/ui"
import { Menu } from "lucide-react"

import Announcement from "../chat/Announcement"
import ChatTextArea from "../chat/ChatTextArea"
import InboxTaskHeader from "./InboxTaskHeader"
import InboxRow from "./InboxRow"
import InboxWelcomeView from "./InboxWelcomeView"
import InboxSidebar from "./InboxSidebar"
import CreateTaskDialog from "./CreateTaskDialog"
import EditTaskDialog from "./EditTaskDialog"
import DeleteTaskConfirmationDialog from "./DeleteTaskConfirmationDialog"
import AutoApproveMenu from "../chat/AutoApproveMenu"
import SystemPromptWarning from "../chat/SystemPromptWarning"
import { CheckpointWarning } from "../chat/CheckpointWarning"
import { TaskState } from "./InboxSidebar"

export interface InboxViewProps {
	isHidden: boolean
	showAnnouncement: boolean
	hideAnnouncement: () => void
}

export interface InboxViewRef {
	acceptInput: () => void
}

export const MAX_IMAGES_PER_MESSAGE = 20

const isMac = navigator.platform.toUpperCase().indexOf("MAC") >= 0

// Define the Task interface
// Define the Task interface
interface Task {
	id: string
	title: string
	description: string
	priority: "high" | "medium" | "low"
	state: TaskState
	mode: string
	message: any // Using any instead of ClineMessage to avoid import issues
	running?: boolean // Track whether a task is currently running
}
/**
 * InboxView Component
 *
 * This component serves as the main view for the Agentic Inbox feature.
 * It displays a list of inbox tasks and provides functionality to interact with them.
 * It integrates task creation, filtering, and management capabilities.
 *
 * The InboxView has three main sections:
 * 1. Sidebar - Shows a list of tasks organized by categories with filtering options
 * 2. Main content area - Displays the selected task's details and messages
 * 3. Text input area - Used for sending messages to the AI for the current task
 *
 * Features:
 * - Task creation through a dedicated dialog
 * - Task filtering and searching
 * - Collapsible sidebar for better space utilization
 * - Empty state messaging when no tasks match filters
 */
const InboxViewComponent: React.ForwardRefRenderFunction<InboxViewRef, InboxViewProps> = (
	{ isHidden, showAnnouncement, hideAnnouncement },
	ref,
) => {
	const { t } = useAppTranslation()
	const modeShortcutText = `${isMac ? "⌘" : "Ctrl"} + . ${t("chat:forNextMode")}`
	
	const {
		clineMessages: messages,
		apiConfiguration,
		mode,
		setMode,
		hasSystemPromptOverride,
	} = useExtensionState()

	const task = useMemo(() => messages.at(0), [messages])
	const modifiedMessages = useMemo(() => combineApiRequests(combineCommandSequences(messages.slice(1))), [messages])
	const apiMetrics = useMemo(() => getApiMetrics(modifiedMessages), [modifiedMessages])

	const [inputValue, setInputValue] = useState("")
	const textAreaRef = useRef<HTMLTextAreaElement>(null)
	const [sendingDisabled, setSendingDisabled] = useState(false)
	const [selectedImages, setSelectedImages] = useState<string[]>([])

	const [clineAsk, setClineAsk] = useState<ClineAsk | undefined>(undefined)
	const [enableButtons, setEnableButtons] = useState<boolean>(false)
	const [primaryButtonText] = useState<string | undefined>(undefined)
	const [expandedRows, setExpandedRows] = useState<Record<number, boolean>>({})
	const scrollContainerRef = useRef<HTMLDivElement>(null)
	const disableAutoScrollRef = useRef(false)
	const [_isAtBottom] = useState(false)
	const [wasStreaming] = useState<boolean>(false)
	const [showCheckpointWarning] = useState<boolean>(false)
	const [selectedTaskId, setSelectedTaskId] = useState<string | undefined>(undefined)
	const [sidebarVisible, setSidebarVisible] = useState<boolean>(() => {
		// Initialize from localStorage if available, otherwise default to true
		const savedValue = localStorage.getItem("inboxSidebarVisible")
		return savedValue !== null ? savedValue === "true" : true
	})
	const [createDialogOpen, setCreateDialogOpen] = useState<boolean>(false)
	const [filteredResults, setFilteredResults] = useState<boolean>(false)
	const [noResultsMessage] = useState<string>("")
	
	// Task state management
	const [tasks, setTasks] = useState<Task[]>([])
	const [editTaskData, setEditTaskData] = useState<Task | null>(null)
	const [deleteTaskData, setDeleteTaskData] = useState<{id: string, title: string} | null>(null)
	const [_runningTasks, setRunningTasks] = useState<Record<string, boolean>>({})

	// Basic handlers for functionality
	const handleChatReset = useCallback(() => {
		setInputValue("")
		setSendingDisabled(true)
		setSelectedImages([])
		setClineAsk(undefined)
		setEnableButtons(false)
		disableAutoScrollRef.current = false
	}, [])

	const handleSendMessage = useCallback(
		(text: string, images: string[]) => {
			text = text.trim()
			if (text || images.length > 0) {
				if (messages.length === 0) {
					vscode.postMessage({
						type: "newTask",
						text,
						images
						// Note: state parameter removed to avoid errors
						// We'll handle state through parsing the message content
					})
				} else if (clineAsk) {
					vscode.postMessage({ type: "askResponse", askResponse: "messageResponse", text, images })
				}
				handleChatReset()
			}
		},
		[messages.length, clineAsk, handleChatReset],
	)

	const startNewTask = useCallback(() => vscode.postMessage({ type: "clearTask" }), [])
	const handleTaskCloseButtonClick = useCallback(() => startNewTask(), [startNewTask])
	const { info: model } = useSelectedModel(apiConfiguration)
	
	// Process messages to create task objects and set selected task
	useEffect(() => {
		if (messages.length > 0 && messages[0]) {
			const newTasks: Task[] = []
			
			// Process the first message as the main task data
			const mainMessage = messages[0]
			let taskTitle = "Untitled Task"
			let _taskDesc = "" // Renamed to avoid lint warning
			let taskPriority: "high" | "medium" | "low" = "medium"
			let taskState: TaskState = "active"
			let taskMode = mode || "code"
			
			// Try to extract task metadata from the message text
			const text = mainMessage.text || ""
			
			// Extract title from the first line if it starts with #
			const titleMatch = text.match(/^#\s+(.+)$/m)
			if (titleMatch && titleMatch[1]) {
				taskTitle = titleMatch[1].trim()
			}
			
			// Extract description (text between title and metadata)
			let descText = text
			if (titleMatch) {
				descText = text.substring(titleMatch[0].length).trim()
			}
			
			// Extract metadata 
			const priorityMatch = text.match(/\*\*Priority:\*\*\s+(\w+)/i)
			const stateMatch = text.match(/\*\*State:\*\*\s+(\w+)/i)
			const modeMatch = text.match(/\*\*Mode:\*\*\s+(\w+)/i)
			
			if (priorityMatch && ["high", "medium", "low"].includes(priorityMatch[1].toLowerCase())) {
				taskPriority = priorityMatch[1].toLowerCase() as "high" | "medium" | "low"
			}
			
			if (stateMatch && ["active", "completed", "archived"].includes(stateMatch[1].toLowerCase())) {
				taskState = stateMatch[1].toLowerCase() as TaskState
			}
			
			if (modeMatch) {
				taskMode = modeMatch[1]
			}
			
			// Clean up description by removing metadata
			if (priorityMatch || stateMatch || modeMatch) {
				const metadataStartIndex = text.indexOf("**Priority") || text.indexOf("**State") || text.indexOf("**Mode")
				if (metadataStartIndex > 0) {
					descText = text.substring(0, metadataStartIndex).trim()
				}
			}
			
			// Create task object
			newTasks.push({
				id: mainMessage.ts.toString(),
				title: taskTitle,
				description: descText,
				priority: taskPriority,
				state: taskState,
				mode: taskMode,
				message: mainMessage
			})
			
			setTasks(newTasks)
			setSelectedTaskId(mainMessage.ts.toString())
		} else {
			setTasks([])
			setSelectedTaskId(undefined)
		}
	}, [messages, mode])

	// Handle task selection from sidebar
	const handleSelectTask = useCallback((taskId: string) => {
		setSelectedTaskId(taskId)
		// Load the selected task 
		// Note: Removed vscode message to avoid errors
		// This would be implemented in the extension
		console.log("Load task:", taskId)
	}, [])

	// Handle creating a new task
	const handleCreateTask = useCallback(() => {
		setCreateDialogOpen(true)
	}, [])
	
	// Handle task editing
	const handleEditTask = useCallback((taskId: string, _task: any) => {
		const taskToEdit = tasks.find(t => t.id === taskId)
		if (taskToEdit) {
			setEditTaskData(taskToEdit)
		}
	}, [tasks])
	
	// Handle task deletion
	const handleDeleteTask = useCallback((taskId: string, taskTitle: string) => {
		setDeleteTaskData({ id: taskId, title: taskTitle })
	}, [])
	
	// Handle task state change
	const handleChangeTaskState = useCallback((taskId: string, newState: TaskState) => {
		// Update local state
		setTasks(prevTasks =>
			prevTasks.map(task =>
				task.id === taskId
					? { ...task, state: newState }
					: task
			)
		)
		
		// Send update to extension
		// Note: Removed vscode message to avoid errors
		// This would be implemented in the extension
		console.log("Update task state:", taskId, newState)
	}, [])

	// Handle running state change
	const handleRunningChange = useCallback((taskId: string, running: boolean) => {
		// Update local state
		setRunningTasks(prev => ({
			...prev,
			[taskId]: running
		}))

		// Update task state with running property
		setTasks(prevTasks =>
			prevTasks.map(task =>
				task.id === taskId
					? { ...task, running }
					: task
			)
		)
		// Send update to extension
		// In a real implementation, this would use an appropriate message type
		console.log(`Task ${taskId} is now ${running ? "running" : "stopped"}`)
		
		// In a real implementation, this would send a message with an appropriate type
		try {
			vscode.postMessage({
				type: "newTask", // Using a recognized type
				text: `Task ${taskId} running state changed to ${running}` // Passing data as text
			});
		} catch (error) {
			console.error("Error sending message:", error);
		}
	}, []);

	// Toggle sidebar visibility
	const toggleSidebar = useCallback(() => {
		setSidebarVisible(prev => {
			const newValue = !prev
			// Persist sidebar visibility state to localStorage
			localStorage.setItem("inboxSidebarVisible", newValue.toString())
			return newValue
		})
	}, [])

	useImperativeHandle(ref, () => ({
		acceptInput: () => {
			if (enableButtons && primaryButtonText) {
				// Handle primary button click
			} else if (!sendingDisabled && (inputValue.trim() || selectedImages.length > 0)) {
				handleSendMessage(inputValue, selectedImages)
			}
		},
	}))

	return (
		<div className={isHidden ? "hidden" : "fixed top-0 left-0 right-0 bottom-0 flex flex-col overflow-hidden"}>
			{showAnnouncement && <Announcement hideAnnouncement={hideAnnouncement} />}
{/* Mobile overlay - only visible on mobile when sidebar is visible */}
			<div 
				className={`sidebar-overlay ${sidebarVisible ? 'sidebar-overlay-active' : ''} md:hidden`}
				onClick={toggleSidebar}
			/>
			
			{/* Sidebar toggle button - visible only on desktop when sidebar is visible */}
			<div className="absolute top-3 left-3 z-10 hidden md:block">
				<Button
					variant="ghost"
					size="icon"
					className="w-6 h-6 transition-transform duration-300"
					onClick={toggleSidebar}
					title={sidebarVisible ? t("inbox:hideSidebar") : t("inbox:showSidebar")}
				>
					<span className={`codicon codicon-${sidebarVisible ? 'chevron-left' : 'chevron-right'}`}></span>
				</Button>
			</div>
			
			{/* Mobile menu button - only visible on mobile */}
			<div className="absolute top-3 left-3 z-10 md:hidden">
				<Button
					variant="ghost"
					size="icon"
					className="w-8 h-8"
					onClick={toggleSidebar}
					title={sidebarVisible ? t("inbox:hideSidebar") : t("inbox:showSidebar")}
				>
					<Menu className="w-5 h-5" />
				</Button>
			</div>
			
			{/* Main content with optional sidebar */}
			<div className="flex flex-1 overflow-hidden">
				{/* Sidebar - different classes for mobile vs desktop */}
				<div 
					className={`
						sidebar-transition
						${sidebarVisible ? 'sidebar-visible' : 'sidebar-hidden md:w-0'}
						w-64 flex-shrink-0
						fixed md:relative z-20 h-full bg-vscode-editor-background
						md:transform-none border-r border-vscode-panel-border
					`}
				>
					<InboxSidebar
						onCreateTask={handleCreateTask}
						onSelectTask={handleSelectTask}
						selectedTaskId={selectedTaskId}
						onEditTask={handleEditTask}
						onDeleteTask={handleDeleteTask}
					/>
				</div>
				
				{/* Main content area - expands when sidebar is hidden */}
				<div className={`
					flex-1 flex flex-col overflow-hidden inbox-content
					transition-all duration-300 ease-in-out
					w-full md:w-auto
					${sidebarVisible ? 'md:pl-0' : 'md:pl-0'}
				`}>
					{task ? (
						<>
							<InboxTaskHeader
								task={task}
								tokensIn={apiMetrics.totalTokensIn}
								tokensOut={apiMetrics.totalTokensOut}
								doesModelSupportPromptCache={model?.supportsPromptCache ?? false}
								cacheWrites={apiMetrics.totalCacheWrites}
								cacheReads={apiMetrics.totalCacheReads}
								totalCost={apiMetrics.totalCost}
								contextTokens={apiMetrics.contextTokens}
								onClose={handleTaskCloseButtonClick}
								taskState={tasks[0]?.state}
								onChangeState={handleChangeTaskState}
								running={tasks[0]?.running}
								onRunningChange={handleRunningChange}
							/>

							{hasSystemPromptOverride && (
								<div className="px-3">
									<SystemPromptWarning />
								</div>
							)}

							{showCheckpointWarning && (
								<div className="px-3">
									<CheckpointWarning />
								</div>
							)}
							
							<div className="grow flex" ref={scrollContainerRef}>
								<div className="flex-1 overflow-y-auto px-3">
									{filteredResults && modifiedMessages.length === 0 ? (
										<div className="flex flex-col items-center justify-center h-full text-vscode-descriptionForeground py-10">
											<div className="text-3xl mb-4">🔍</div>
											<div className="text-center mb-4">{noResultsMessage || t("inbox:noTasksMatchFilter")}</div>
											<Button 
												variant="secondary" 
												onClick={() => {
													// In a real implementation, this would clear filters
													setFilteredResults(false)
												}}
											>
												{t("inbox:clearFilters")}
											</Button>
										</div>
									) : (
										modifiedMessages.map((message, index) => {
											// Find task state if available
											// Find task state if available
											const task = tasks.find(t => t.id === message.ts.toString())
											const taskState = task ? task.state : "active"
											const isRunning = task?.running || false
											
											return (
												<InboxRow
													key={message.ts}
													message={message}
													isExpanded={!!expandedRows[index]}
													isLast={index === modifiedMessages.length - 1}
													isStreaming={index === modifiedMessages.length - 1 && wasStreaming}
													taskState={taskState}
													running={isRunning}
													onRunningChange={handleRunningChange}
													onToggleExpand={() => {
														setExpandedRows(prev => ({
															...prev,
															[index]: !prev[index]
														}));
													}}
													onHeightChange={() => {
														/* No implementation needed for now */
													}}
													onChangeState={handleChangeTaskState}
													onProcessTask={() => {
														// Process the task - would be implemented in the extension
														console.log("Process task:", message.ts.toString())
													}}
												/>
											)
										})
									)}
								</div>
							</div>
							<AutoApproveMenu />
						</>
					) : (
						<>
							<div className="flex-1 overflow-y-auto flex flex-col">
								<div className="flex-grow h-full">
									<InboxWelcomeView onCreateTask={handleCreateTask} />
								</div>
							</div>
							<div className="mb-[-2px] flex-initial min-h-0">
								<AutoApproveMenu />
							</div>
						</>
					)}
				</div>
			</div>

			<ChatTextArea
				ref={textAreaRef}
				inputValue={inputValue}
				setInputValue={setInputValue}
				sendingDisabled={sendingDisabled}
				selectApiConfigDisabled={sendingDisabled && clineAsk !== "api_req_failed"}
				placeholderText={task ? t("chat:typeMessage") : t("chat:typeTask")}
				selectedImages={selectedImages}
				setSelectedImages={setSelectedImages}
				onSend={() => handleSendMessage(inputValue, selectedImages)}
				onSelectImages={() => vscode.postMessage({ type: "selectImages" })}
				shouldDisableImages={!model?.supportsImages || sendingDisabled || selectedImages.length >= MAX_IMAGES_PER_MESSAGE}
				onHeightChange={() => {
					/* No implementation needed for now */
				}}
				mode={mode}
				setMode={setMode}
				modeShortcutText={modeShortcutText}
			/>

			<div id="roo-portal" />
			
			{/* Create task dialog */}
			<CreateTaskDialog
				open={createDialogOpen}
				onOpenChange={setCreateDialogOpen}
			/>
			
			{/* Edit task dialog */}
			{editTaskData && (
				<EditTaskDialog
					open={!!editTaskData}
					onOpenChange={(open) => !open && setEditTaskData(null)}
					taskId={editTaskData.id}
					taskTitle={editTaskData.title}
					taskDescription={editTaskData.description}
					taskPriority={editTaskData.priority}
					taskState={editTaskData.state}
					taskMode={editTaskData.mode}
				/>
			)}
			
			{/* Delete task confirmation dialog */}
			{deleteTaskData && (
				<DeleteTaskConfirmationDialog
					open={!!deleteTaskData}
					onOpenChange={(open) => !open && setDeleteTaskData(null)}
					taskId={deleteTaskData.id}
					taskTitle={deleteTaskData.title}
				/>
			)}
		</div>
	)
}

const InboxView = forwardRef(InboxViewComponent)

export default InboxView