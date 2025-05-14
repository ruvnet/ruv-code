import React, { useState, useCallback } from "react"
import { useTranslation } from "react-i18next"
import { getAllModes } from "@roo/shared/modes"
import { TaskState } from "./InboxSidebar"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  Button,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { useExtensionState } from "@/context/ExtensionStateContext"
import { vscode } from "@/utils/vscode"
import { TabList, TabTrigger } from "@/components/common/Tab"
import { ListTodo, Layers, Settings } from "lucide-react"

/**
 * CreateTaskDialog Component
 * 
 * This dialog allows users to create new tasks for the Agentic Inbox.
 * It provides fields for task name, description, priority, and mode selection.
 * The component integrates with the extension's messaging system to create tasks.
 * 
 * Features:
 * - Form-based task creation with validation
 * - Priority selection with visual indicators
 * - Mode selection integrated with available extension modes
 * - Task content formatting with priority information
 * - Tabbed interface for basic, tasks, and advanced options
 * 
 * Usage:
 * This dialog is used throughout the Inbox system whenever a new task needs 
 * to be created, either from the sidebar, welcome screen, or other UI elements.
 * It handles the task creation flow in a consistent manner, ensuring all necessary
 * information is captured.
 * 
 * Technical notes:
 * - Uses the vscode messaging system to create tasks in the extension
 * - Integrates with the extension's mode system for task type specification
 * - Provides visual feedback on required fields and validates input
 */
type FlowType = "sequential" | "parallel" | "concurrent" | "swarm";

interface Subtask {
  id: string;
  name: string;
  completed: boolean;
}

interface CreateTaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const CreateTaskDialog: React.FC<CreateTaskDialogProps> = ({
  open,
  onOpenChange
}) => {
  const { t } = useTranslation();
  const { mode, customModes } = useExtensionState();
  
  // Tab state
  const [activeTab, setActiveTab] = useState<string>("basic");
  
  // Basic tab state
  const [taskName, setTaskName] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<"high" | "medium" | "low">("medium");
  const [state, setState] = useState<TaskState>("active");
  const [selectedMode, setSelectedMode] = useState(mode || "code");
  
  // Tasks tab state
  const [subtasks, setSubtasks] = useState<Subtask[]>([]);
  const [newSubtaskName, setNewSubtaskName] = useState("");
  const [flowType, setFlowType] = useState<FlowType>("sequential");
  const [dependencies, setDependencies] = useState<string[]>([]);
  
  // Reset form when dialog opens
  React.useEffect(() => {
    if (open) {
      // Reset Basic tab
      setTaskName("");
      setDescription("");
      setPriority("medium");
      setState("active");
      setSelectedMode(mode || "code");
      
      // Reset Tasks tab
      setSubtasks([]);
      setNewSubtaskName("");
      setFlowType("sequential");
      setDependencies([]);
      
      // Reset active tab
      setActiveTab("basic");
    }
  }, [open, mode]);

  // Add a subtask to the list
  const addSubtask = useCallback(() => {
    if (newSubtaskName.trim()) {
      const newSubtask: Subtask = {
        id: `subtask-${Date.now()}`,
        name: newSubtaskName,
        completed: false
      };
      setSubtasks([...subtasks, newSubtask]);
      setNewSubtaskName("");
    }
  }, [newSubtaskName, subtasks]);

  // Remove a subtask from the list
  const removeSubtask = useCallback((id: string) => {
    setSubtasks(subtasks.filter(subtask => subtask.id !== id));
  }, [subtasks]);

  // Toggle subtask completion
  const toggleSubtaskCompletion = useCallback((id: string) => {
    setSubtasks(
      subtasks.map(subtask =>
        subtask.id === id
          ? { ...subtask, completed: !subtask.completed }
          : subtask
      )
    );
  }, [subtasks]);

  // Create a new task
  const handleCreateTask = useCallback(() => {
    if (!taskName.trim()) {
      return; // Don't create tasks without a name
    }
    
    try {
      // Format subtasks if any
      const subtasksContent = subtasks.length > 0
        ? `\n\n### Subtasks\n${subtasks.map(st => `- [ ] ${st.name}`).join('\n')}`
        : '';
      
      // Format flow type and dependencies
      const workflowContent = flowType !== "sequential" || dependencies.length > 0
        ? `\n\n### Workflow\n**Flow Type:** ${flowType}${dependencies.length > 0 ? `\n**Dependencies:** ${dependencies.join(', ')}` : ''}`
        : '';
      
      // No advanced options to include
      const advancedContent = '';
      
      // Include all information in the task content
      const taskContent = `# ${taskName}\n\n${description}\n\n**Priority:** ${priority}\n**State:** ${state}\n**Mode:** ${selectedMode}${subtasksContent}${workflowContent}${advancedContent}`;
      
      // Create a new task using the existing messaging infrastructure
      vscode.postMessage({
        type: "newTask",
        text: taskContent,
        images: []
        // State is embedded in the task content for the extension to parse
      });
      
      // Close the dialog
      onOpenChange(false);
    } catch (error) {
      console.error("Error creating task:", error);
      // Provide user feedback about the error using the showNotification type
      vscode.postMessage({
        type: "newTask",
        text: "# Error Creating Task\n\nThe Advanced tab functionality is still in development.",
        images: []
      });
    }
  }, [
    taskName, 
    description, 
    priority, 
    state, 
    selectedMode, 
    subtasks, 
    flowType, 
    dependencies,
    onOpenChange
  ]);
  
  // All available modes for selection
  const allModes = React.useMemo(() => getAllModes(customModes), [customModes]);
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>{t("inbox:createTask")}</DialogTitle>
        </DialogHeader>
        
        {/* Tabs */}
        <div className="border-b border-vscode-panel-border">
          <TabList
            value={activeTab}
            onValueChange={setActiveTab}
            className="flex"
          >
            <TabTrigger
              value="basic"
              className={`flex items-center px-4 py-2 ${activeTab === "basic" ? "border-b-2 border-vscode-focusBorder" : ""}`}
            >
              <ListTodo className="w-4 h-4 mr-2" />
              Basic
            </TabTrigger>
            <TabTrigger
              value="tasks"
              className={`flex items-center px-4 py-2 ${activeTab === "tasks" ? "border-b-2 border-vscode-focusBorder" : ""}`}
            >
              <Layers className="w-4 h-4 mr-2" />
              Tasks
            </TabTrigger>
            <TabTrigger
              value="advanced"
              className={`flex items-center px-4 py-2 ${activeTab === "advanced" ? "border-b-2 border-vscode-focusBorder" : ""}`}
            >
              <Settings className="w-4 h-4 mr-2" />
              Advanced
            </TabTrigger>
          </TabList>
        </div>
        
        <div className="py-4 space-y-4">
          {/* Basic Tab Content */}
          {activeTab === "basic" && (
            <>
              {/* Task name field */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-vscode-foreground">
                  {t("inbox:taskName")}
                </label>
                <Input
                  value={taskName}
                  onChange={(e) => setTaskName(e.target.value)}
                  placeholder={t("inbox:taskNamePlaceholder")}
                  className="w-full"
                  data-testid="task-name-input"
                />
              </div>
              
              {/* Task description field */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-vscode-foreground">
                  {t("inbox:taskDescription")}
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder={t("inbox:taskDescriptionPlaceholder")}
                  className="flex w-full min-h-[100px] text-vscode-input-foreground border border-vscode-dropdown-border bg-vscode-input-background rounded-xs px-3 py-2 text-base transition-colors focus:outline-0 focus-visible:outline-none focus-visible:border-vscode-focusBorder"
                  data-testid="task-description-input"
                />
              </div>
              
              {/* Priority selection */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-vscode-foreground">
                  {t("inbox:taskPriority")}
                </label>
                <Select value={priority} onValueChange={(value) => setPriority(value as "high" | "medium" | "low")}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={t("inbox:selectPriority")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="high">
                      <div className="flex items-center">
                        <span className="w-2 h-2 rounded-full mr-2" style={{ backgroundColor: "var(--vscode-errorForeground)" }} />
                        {t("inbox:priorityHigh")}
                      </div>
                    </SelectItem>
                    <SelectItem value="medium">
                      <div className="flex items-center">
                        <span className="w-2 h-2 rounded-full mr-2" style={{ backgroundColor: "var(--vscode-editorWarning-foreground)" }} />
                        {t("inbox:priorityMedium")}
                      </div>
                    </SelectItem>
                    <SelectItem value="low">
                      <div className="flex items-center">
                        <span className="w-2 h-2 rounded-full mr-2" style={{ backgroundColor: "var(--vscode-charts-green)" }} />
                        {t("inbox:priorityLow")}
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              {/* State selection */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-vscode-foreground">
                  {t("inbox:taskState")}
                </label>
                <Select value={state} onValueChange={(value) => setState(value as TaskState)}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={t("inbox:selectState")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">
                      <div className="flex items-center">
                        <span className="codicon codicon-play mr-2 text-vscode-charts-blue" />
                        {t("inbox:categories.active")}
                      </div>
                    </SelectItem>
                    <SelectItem value="completed">
                      <div className="flex items-center">
                        <span className="codicon codicon-check mr-2 text-vscode-charts-green" />
                        {t("inbox:categories.completed")}
                      </div>
                    </SelectItem>
                    <SelectItem value="archived">
                      <div className="flex items-center">
                        <span className="codicon codicon-archive mr-2 text-vscode-descriptionForeground" />
                        {t("inbox:categories.archived")}
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              {/* Mode selection */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-vscode-foreground">
                  {t("inbox:taskMode")}
                </label>
                <Select value={selectedMode} onValueChange={setSelectedMode}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={t("inbox:selectMode")} />
                  </SelectTrigger>
                  <SelectContent>
                    {allModes.map((modeConfig) => (
                      <SelectItem key={modeConfig.slug} value={modeConfig.slug}>
                        {modeConfig.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </>
          )}
          
          {/* Tasks Tab Content */}
          {activeTab === "tasks" && (
            <>
              {/* Subtasks section */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-vscode-foreground">
                  Subtasks
                </label>
                <div className="space-y-2">
                  {subtasks.map((subtask) => (
                    <div key={subtask.id} className="flex items-center gap-2">
                      <Checkbox
                        id={subtask.id}
                        checked={subtask.completed}
                        onCheckedChange={() => toggleSubtaskCompletion(subtask.id)}
                      />
                      <label
                        htmlFor={subtask.id}
                        className={`text-sm flex-1 ${subtask.completed ? 'line-through opacity-70' : ''}`}
                      >
                        {subtask.name}
                      </label>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0"
                        onClick={() => removeSubtask(subtask.id)}
                      >
                        <span className="codicon codicon-trash"></span>
                      </Button>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2 mt-2">
                  <Input
                    value={newSubtaskName}
                    onChange={(e) => setNewSubtaskName(e.target.value)}
                    placeholder="Add a subtask..."
                    className="flex-1"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && newSubtaskName.trim()) {
                        addSubtask();
                      }
                    }}
                  />
                  <Button variant="default" onClick={addSubtask} disabled={!newSubtaskName.trim()}>
                    Add
                  </Button>
                </div>
              </div>
              
              {/* Flow type selection */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-vscode-foreground">
                  Flow Type
                </label>
                <Select value={flowType} onValueChange={(value) => setFlowType(value as FlowType)}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select flow type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sequential">
                      <div className="flex items-center">
                        <span className="codicon codicon-arrow-right mr-2" />
                        Sequential
                      </div>
                    </SelectItem>
                    <SelectItem value="parallel">
                      <div className="flex items-center">
                        <span className="codicon codicon-split-horizontal mr-2" />
                        Parallel
                      </div>
                    </SelectItem>
                    <SelectItem value="concurrent">
                      <div className="flex items-center">
                        <span className="codicon codicon-debug-step-over mr-2" />
                        Concurrent
                      </div>
                    </SelectItem>
                    <SelectItem value="swarm">
                      <div className="flex items-center">
                        <span className="codicon codicon-type-hierarchy-sub mr-2" />
                        Swarm
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              {/* Task dependencies */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-vscode-foreground">
                  Task Dependencies
                </label>
                <Input
                  value={dependencies.join(", ")}
                  onChange={(e) => setDependencies(e.target.value.split(",").map(d => d.trim()).filter(Boolean))}
                  placeholder="Enter comma-separated task IDs"
                  className="w-full"
                />
                <p className="text-xs text-vscode-descriptionForeground">
                  Enter the IDs of tasks that this task depends on, separated by commas.
                </p>
              </div>
            </>
          )}
          
          {/* Advanced Tab Content - Extremely simplified to prevent errors */}
          {activeTab === "advanced" && (
            <div className="flex flex-col items-center justify-center p-8 text-center">
              <div className="w-16 h-16 mb-4 text-vscode-editorWarning-foreground flex items-center justify-center">
                <Settings className="w-10 h-10" />
              </div>
              <h3 className="text-lg font-medium mb-2">Advanced Features Coming Soon</h3>
              <p className="text-vscode-descriptionForeground mb-6">
                The advanced task settings are currently under development.
                <br />
                Please use the Basic and Tasks tabs for now.
              </p>
              <Button 
                variant="secondary" 
                onClick={() => setActiveTab("basic")}
                className="mt-2"
              >
                Go back to Basic tab
              </Button>
            </div>
          )}
        </div>
        
        <DialogFooter className="flex justify-between">
          <div className="flex gap-1">
            {activeTab !== "basic" && (
              <Button variant="secondary" onClick={() => setActiveTab(activeTab === "tasks" ? "basic" : "tasks")}>
                Previous
              </Button>
            )}
            {activeTab !== "advanced" && (
              <Button variant="secondary" onClick={() => setActiveTab(activeTab === "basic" ? "tasks" : "advanced")}>
                Next
              </Button>
            )}
          </div>
          <div className="flex gap-1">
            <Button variant="secondary" onClick={() => onOpenChange(false)}>
              {t("inbox:cancel")}
            </Button>
            <Button
              variant="default"
              onClick={handleCreateTask}
              disabled={!taskName.trim()}
            >
              {t("inbox:createTask")}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CreateTaskDialog;