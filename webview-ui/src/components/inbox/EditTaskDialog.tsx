import React, { useState, useCallback, useEffect } from "react"
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
 * EditTaskDialog Component
 * 
 * This dialog allows users to edit existing tasks in the Agentic Inbox.
 * It provides fields for task name, description, priority, and state selection.
 * The component integrates with the extension's messaging system to update tasks.
 * 
 * Features:
 * - Form-based task editing with validation
 * - Priority selection with visual indicators
 * - State selection for task workflow management (Active, Completed, Archived)
 * - Mode selection integrated with available extension modes
 * - Task content formatting with priority and state information
 * - Tabbed interface for basic, tasks, and advanced options
 * 
 * Technical notes:
 * - Uses the vscode messaging system to update tasks in the extension
 * - Provides visual feedback on required fields and validates input
 */
type FlowType = "sequential" | "parallel" | "concurrent" | "swarm";

interface Subtask {
  id: string;
  name: string;
  completed: boolean;
}

interface EditTaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  taskId: string;
  taskTitle: string;
  taskDescription: string;
  taskPriority: "high" | "medium" | "low";
  taskState: TaskState;
  taskMode: string;
  // Optional props with default values for the new tabs
  taskSubtasks?: Subtask[];
  taskFlowType?: FlowType;
  taskDependencies?: string[];
  taskPromptTemplate?: string;
  taskExecutionOptions?: {
    autoStart: boolean;
    notifyOnCompletion: boolean;
  };
}

const EditTaskDialog: React.FC<EditTaskDialogProps> = ({
  open,
  onOpenChange,
  taskId,
  taskTitle,
  taskDescription,
  taskPriority,
  taskState,
  taskMode,
  taskSubtasks = [],
  taskFlowType = "sequential",
  taskDependencies = [],
  taskPromptTemplate = "",
  taskExecutionOptions = { autoStart: false, notifyOnCompletion: true }
}) => {
  const { t } = useTranslation();
  const { mode, customModes } = useExtensionState();
  
  // Tab state
  const [activeTab, setActiveTab] = useState<string>("basic");
  
  // Basic tab state
  const [title, setTitle] = useState(taskTitle);
  const [description, setDescription] = useState(taskDescription);
  const [priority, setPriority] = useState<"high" | "medium" | "low">(taskPriority);
  const [state, setState] = useState<TaskState>(taskState);
  const [selectedMode, setSelectedMode] = useState(taskMode || mode || "code");
  
  // Tasks tab state
  const [subtasks, setSubtasks] = useState<Subtask[]>(taskSubtasks);
  const [newSubtaskName, setNewSubtaskName] = useState("");
  const [flowType, setFlowType] = useState<FlowType>(taskFlowType);
  const [dependencies, setDependencies] = useState<string[]>(taskDependencies);
  
  // Advanced tab state
  const [promptTemplate, setPromptTemplate] = useState(taskPromptTemplate);
  const [executionOptions, setExecutionOptions] = useState(taskExecutionOptions);
  
  // Reset form when dialog opens with the current task data
  useEffect(() => {
    if (open) {
      // Reset Basic tab
      setTitle(taskTitle);
      setDescription(taskDescription);
      setPriority(taskPriority);
      setState(taskState);
      setSelectedMode(taskMode || mode || "code");
      
      // Reset Tasks tab
      setSubtasks(taskSubtasks);
      setNewSubtaskName("");
      setFlowType(taskFlowType);
      setDependencies(taskDependencies);
      
      // Reset Advanced tab
      setPromptTemplate(taskPromptTemplate);
      setExecutionOptions(taskExecutionOptions);
      
      // Reset active tab
      setActiveTab("basic");
    }
  }, [
    open, 
    taskTitle, 
    taskDescription, 
    taskPriority, 
    taskState, 
    taskMode, 
    mode, 
    taskSubtasks, 
    taskFlowType, 
    taskDependencies, 
    taskPromptTemplate, 
    taskExecutionOptions
  ]);
  
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
  
  // Update a task
  const handleUpdateTask = useCallback(() => {
    if (!title.trim()) {
      return; // Don't update tasks without a title
    }
    
    // Format subtasks if any
    const subtasksContent = subtasks.length > 0
      ? `\n\n### Subtasks\n${subtasks.map(st => `- [${st.completed ? 'x' : ' '}] ${st.name}`).join('\n')}`
      : '';
    
    // Format flow type and dependencies
    const workflowContent = flowType !== "sequential" || dependencies.length > 0
      ? `\n\n### Workflow\n**Flow Type:** ${flowType}${dependencies.length > 0 ? `\n**Dependencies:** ${dependencies.join(', ')}` : ''}`
      : '';
    
    // Format advanced options
    const advancedContent = promptTemplate || executionOptions.autoStart || executionOptions.notifyOnCompletion
      ? `\n\n### Advanced Options\n${promptTemplate ? `**Prompt Template:** ${promptTemplate}\n` : ''}**Auto Start:** ${executionOptions.autoStart}\n**Notify on Completion:** ${executionOptions.notifyOnCompletion}`
      : '';
    
    // Include priority, state, mode and taskId information in the task content
    // We need to embed the taskId in the content since there's no specific field for it
    const taskContent = `# ${title}\n\n${description}\n\n**Priority:** ${priority}\n**State:** ${state}\n**Mode:** ${selectedMode}\n**TaskId:** ${taskId}${subtasksContent}${workflowContent}${advancedContent}`;
    
    // Instead of creating a new task, we can use the showTaskWithId type which is available
    vscode.postMessage({
      type: "showTaskWithId",
      text: taskContent,
      images: [] // Include empty images array to match CreateTaskDialog
    });
    
    // Close the dialog
    onOpenChange(false);
  }, [
    taskId, 
    title, 
    description, 
    priority, 
    state, 
    selectedMode, 
    subtasks, 
    flowType, 
    dependencies, 
    promptTemplate, 
    executionOptions, 
    onOpenChange
  ]);
  
  // All available modes for selection
  const allModes = React.useMemo(() => getAllModes(customModes), [customModes]);
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>{t("inbox:editTask")}</DialogTitle>
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
              {/* Task title field */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-vscode-foreground">
                  {t("inbox:taskName")}
                </label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
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
          
          {/* Advanced Tab Content */}
          {activeTab === "advanced" && (
            <>
              {/* Prompt selection */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-vscode-foreground">
                  Prompt Template
                </label>
                <Select value={promptTemplate} onValueChange={setPromptTemplate}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select a prompt template" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">
                      <div className="flex items-center">
                        <span className="codicon codicon-edit mr-2" />
                        Default (No Template)
                      </div>
                    </SelectItem>
                    <SelectItem value="code-review">
                      <div className="flex items-center">
                        <span className="codicon codicon-code mr-2" />
                        Code Review
                      </div>
                    </SelectItem>
                    <SelectItem value="data-analysis">
                      <div className="flex items-center">
                        <span className="codicon codicon-graph mr-2" />
                        Data Analysis
                      </div>
                    </SelectItem>
                    <SelectItem value="document-generation">
                      <div className="flex items-center">
                        <span className="codicon codicon-file-text mr-2" />
                        Document Generation
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              {/* Execution options */}
              <div className="space-y-4">
                <label className="text-sm font-medium text-vscode-foreground">
                  Execution Options
                </label>
                
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="auto-start"
                    checked={executionOptions.autoStart}
                    onCheckedChange={(checked) =>
                      setExecutionOptions({...executionOptions, autoStart: checked === true})
                    }
                  />
                  <label htmlFor="auto-start" className="text-sm cursor-pointer">
                    Auto-start task after creation
                  </label>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="notify-completion"
                    checked={executionOptions.notifyOnCompletion}
                    onCheckedChange={(checked) =>
                      setExecutionOptions({...executionOptions, notifyOnCompletion: checked === true})
                    }
                  />
                  <label htmlFor="notify-completion" className="text-sm cursor-pointer">
                    Notify when task completes
                  </label>
                </div>
              </div>
            </>
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
              onClick={handleUpdateTask}
              disabled={!title.trim()}
            >
              {t("inbox:updateTask")}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default EditTaskDialog;