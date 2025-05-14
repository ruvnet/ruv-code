import React, { useState, useMemo, useEffect } from "react"
import { useTranslation } from "react-i18next"
import { PlusCircle, ChevronDown, ChevronRight, Edit2, Trash2, Filter, Search } from "lucide-react"

import { Button } from "@/components/ui"
import { Input } from "@/components/ui/input"
import CreateTaskDialog from "./CreateTaskDialog"
import EditTaskDialog from "./EditTaskDialog"
import TaskBadge from "./TaskBadge"
import PriorityBadge from "./PriorityBadge"
import TaskStateTransition from "./TaskStateTransition"

// Import CSS for animations and state styling
import "./inbox.css"

/**
 * Interface for task category in the sidebar
 */
interface TaskCategory {
  id: string
  name: string
  count: number
  isExpanded: boolean
  tasks: TaskItem[]
}

/**
 * Task state enum
 */
export type TaskState = "active" | "completed" | "archived";

/**
 * Interface for individual task items
 */
interface TaskItem {
  id: string
  title: string
  priority: "high" | "medium" | "low"
  state: TaskState
  running?: boolean
}

/**
 * Props for the InboxSidebar component
 */
interface InboxSidebarProps {
  onCreateTask: () => void
  onSelectTask: (taskId: string) => void
  selectedTaskId?: string
  onEditTask?: (taskId: string, task: TaskItem) => void
  onDeleteTask?: (taskId: string, taskTitle: string) => void
}

/**
 * InboxSidebar Component
 *
 * Provides a Slack-like sidebar for the Agentic Inbox with task management features.
 * The sidebar is organized into collapsible sections with tasks grouped by categories.
 * Includes filtering functionality for finding tasks by name or priority.
 *
 * Features:
 * - Task categories with collapsible sections for organization
 * - Filtering system with search input and priority filters
 * - Visual indicators for task priority and state
 * - Action buttons for task management (edit, delete)
 * - Integration with CreateTaskDialog for task creation
 * - Keyboard shortcuts for efficient navigation and task management
 *
 * Usage:
 * This component serves as the navigation hub for the Agentic Inbox system.
 * Users interact with it to browse, filter, and select tasks, as well as
 * to create new tasks or manage existing ones.
 */
const InboxSidebar: React.FC<InboxSidebarProps> = ({
  onCreateTask: _onCreateTask, // Renamed to _onCreateTask since we use the dialog directly
  onSelectTask,
  selectedTaskId,
  onEditTask,
  onDeleteTask
}) => {
  const { t } = useTranslation()
  
  // Filter state
  const [showFilters, setShowFilters] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [filterPriority, setFilterPriority] = useState<'all' | 'high' | 'medium' | 'low'>('all')
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [editingTask, setEditingTask] = useState<TaskItem | null>(null)
  const [stateChanged, setStateChanged] = useState<{id: string, newState: TaskState} | null>(null)
  
  // Mock data for task categories and tasks
  // In a real implementation, this would come from the extension state
  const [categories, setCategories] = useState<TaskCategory[]>([
    {
      id: "active",
      name: t("inbox:categories.active"),
      count: 3,
      isExpanded: true,
      tasks: [
        { id: "task1", title: "Refactor authentication logic", priority: "high", state: "active" },
        { id: "task2", title: "Update documentation for API", priority: "medium", state: "active" },
        { id: "task3", title: "Fix styling issues in mobile view", priority: "low", state: "active" }
      ]
    },
    {
      id: "completed",
      name: t("inbox:categories.completed"),
      count: 2,
      isExpanded: false,
      tasks: [
        { id: "task4", title: "Optimize database queries", priority: "medium", state: "completed" },
        { id: "task5", title: "Add unit tests for components", priority: "high", state: "completed" }
      ]
    },
    {
      id: "archived",
      name: t("inbox:categories.archived"),
      count: 1,
      isExpanded: false,
      tasks: [
        { id: "task6", title: "Legacy code migration plan", priority: "low", state: "archived" }
      ]
    }
  ])

  /**
   * Toggle the expanded state of a category
   */
  const toggleCategory = (categoryId: string) => {
    setCategories(prevCategories => 
      prevCategories.map(category => 
        category.id === categoryId
          ? { ...category, isExpanded: !category.isExpanded }
          : category
      )
    )
  }

  /**
   * Handle editing a task
   */
  const handleEditTask = (taskId: string, task: TaskItem, e: React.MouseEvent) => {
    e.stopPropagation()
    setEditingTask(task)
    setEditDialogOpen(true)
    
    // Also notify parent component if callback provided
    if (onEditTask) {
      onEditTask(taskId, task)
    }
  }

  /**
   * Handle deleting a task (mock implementation)
   */
  const handleDeleteTask = (taskId: string, taskTitle: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (onDeleteTask) {
      onDeleteTask(taskId, taskTitle)
    }
  }
  
  /**
   * Handle keyboard shortcuts for task management
   */
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only process if we have a selected task and Alt key is pressed
      if (!selectedTaskId || !e.altKey) return;
      
      // Get the selected task
      let selectedTask: TaskItem | undefined;
      for (const category of categories) {
        selectedTask = category.tasks.find(task => task.id === selectedTaskId);
        if (selectedTask) break;
      }
      
      if (!selectedTask) return;
      
      // Handle state change shortcuts
      if (e.key === "a" || e.key === "A") {
        // Alt+A: Set to Active
        if (selectedTask.state !== "active") {
          setStateChanged({ id: selectedTaskId, newState: "active" });
        }
      } else if (e.key === "c" || e.key === "C") {
        // Alt+C: Set to Completed
        if (selectedTask.state !== "completed") {
          setStateChanged({ id: selectedTaskId, newState: "completed" });
        }
      } else if (e.key === "r" || e.key === "R") {
        // Alt+R: Set to Archived
        if (selectedTask.state !== "archived") {
          setStateChanged({ id: selectedTaskId, newState: "archived" });
        }
      } else if (e.key === "p" || e.key === "P") {
        // Alt+P: Process task (would call onProcessTask here)
        console.log("Process task shortcut:", selectedTaskId);
      } else if (e.key === "e" || e.key === "E") {
        // Alt+E: Edit task
        if (onEditTask && selectedTask) {
          onEditTask(selectedTaskId, selectedTask);
        }
      }
    };
    
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [categories, selectedTaskId, onEditTask]);
  
  // Apply state changes when triggered by keyboard shortcuts
  useEffect(() => {
    if (stateChanged) {
      // Find the task and update its state
      setCategories(prevCategories => 
        prevCategories.map(category => ({
          ...category,
          tasks: category.tasks.map(task => 
            task.id === stateChanged.id 
              ? { ...task, state: stateChanged.newState }
              : task
          )
        }))
      );
      
      // Reset the state change trigger
      setStateChanged(null);
    }
  }, [stateChanged]);
  
  // Filter tasks based on search query and priority filter
  const filteredCategories = useMemo(() => {
    return categories.map(category => {
      const filteredTasks = category.tasks.filter(task => {
        const matchesSearch = !searchQuery || 
          task.title.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesPriority = filterPriority === 'all' || task.priority === filterPriority;
        
        return matchesSearch && matchesPriority;
      });
      
      return {
        ...category,
        filteredTasks,
      };
    });
  }, [categories, searchQuery, filterPriority]);

  return (
    <div className="flex flex-col h-full bg-vscode-sideBar-background border-r border-vscode-panel-border">
      {/* Header with title */}
      <div className="p-3 border-b border-vscode-panel-border flex justify-between items-center">
        <h2 className="text-md font-medium text-vscode-sideBarTitle-foreground flex items-center">
          <span className="codicon codicon-inbox mr-2"></span>
          {t("common:ui.inbox")}
        </h2>
        <div className="flex space-x-1">
          <Button
            variant="ghost"
            size="icon"
            className="w-6 h-6"
            onClick={() => setShowFilters(!showFilters)}
            title={t("inbox:filter") + " (Alt+F)"}
          >
            <Filter size={14} className={showFilters ? "text-vscode-button-foreground" : ""} />
          </Button>
          <Button
            variant="ghost" 
            size="icon"
            className="w-6 h-6"
            onClick={() => setCreateDialogOpen(true)}
            title={t("inbox:createTask") + " (Alt+N)"}
          >
            <PlusCircle size={14} />
          </Button>
        </div>
      </div>

      {/* Search and filter controls */}
      {showFilters && (
        <div className="p-2 border-b border-vscode-panel-border">
          <div className="relative">
            <Input
              className="pl-8 w-full"
              placeholder={t("inbox:searchTasks")}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 text-vscode-descriptionForeground" size={16} />
          </div>
          
          <div className="mt-2 flex flex-wrap gap-1">
            <Button 
              size="sm" 
              variant={filterPriority === 'all' ? 'default' : 'secondary'}
              className="text-xs"
              onClick={() => setFilterPriority('all')}
            >
              {t("inbox:allPriorities")}
            </Button>
            
            {/* Priority filter buttons */}
            <Button 
              size="sm" 
              variant={filterPriority === 'high' ? 'default' : 'secondary'}
              className="text-xs"
              onClick={() => setFilterPriority('high')}
            >
              <PriorityBadge priority="high" showLabel={true} size="sm" />
            </Button>
            <Button 
              size="sm" 
              variant={filterPriority === 'medium' ? 'default' : 'secondary'}
              className="text-xs"
              onClick={() => setFilterPriority('medium')}
            >
              <PriorityBadge priority="medium" showLabel={true} size="sm" />
            </Button>
            <Button 
              size="sm" 
              variant={filterPriority === 'low' ? 'default' : 'secondary'}
              className="text-xs"
              onClick={() => setFilterPriority('low')}
            >
              <PriorityBadge priority="low" showLabel={true} size="sm" />
            </Button>
          </div>
        </div>
      )}

      {/* Categories and tasks list */}
      <div className="flex-grow overflow-y-auto p-2">
        {filteredCategories.map((category) => (
          <div key={category.id} className="mb-3">
            {/* Category header */}
            <div 
              className="flex items-center px-2 py-1 text-vscode-foreground cursor-pointer hover:bg-vscode-list-hoverBackground rounded"
              onClick={() => toggleCategory(category.id)}
            >
              {category.isExpanded ? 
                <ChevronDown size={16} className="mr-1" /> : 
                <ChevronRight size={16} className="mr-1" />
              }
              <span className="text-sm font-medium flex items-center gap-2">
                <TaskBadge 
                  state={category.id as TaskState} 
                  showLabel={false}
                  size="sm"
                />
                {category.name}
              </span>
              <span className="ml-2 text-xs px-1.5 py-0.5 rounded-full bg-vscode-badge-background text-vscode-badge-foreground">
                {category.filteredTasks.length}
              </span>
            </div>

            {/* Task items */}
            {category.isExpanded && (
              <div className="ml-6 mt-1 space-y-1">
                {category.filteredTasks.length > 0 ? (
                  category.filteredTasks.map((task) => (
                    <TaskStateTransition
                      key={task.id}
                      taskState={task.state}
                      className="transition-all duration-200"
                    >
                      <div 
                        className={`
                          flex items-center justify-between px-2 py-1 text-sm rounded cursor-pointer
                          task-row task-row-${task.state}
                          ${task.state === "completed" ? "task-completed" : ""}
                          ${task.state === "archived" ? "task-archived" : ""}
                          ${selectedTaskId === task.id 
                            ? 'bg-vscode-list-activeSelectionBackground text-vscode-list-activeSelectionForeground' 
                            : 'hover:bg-vscode-list-hoverBackground'
                          }
                        `}
                        onClick={() => onSelectTask(task.id)}
                      >
                        <div className="flex items-center truncate overflow-hidden flex-grow">
                          <PriorityBadge 
                            priority={task.priority}
                            showLabel={false}
                            size="sm"
                            className="mr-2 flex-shrink-0"
                          />
                          <span className={`truncate ${task.state === "completed" ? "line-through" : ""}`}>
                            {task.title}
                          </span>
                          
                          <TaskBadge 
                            state={task.state}
                            showLabel={false}
                            size="sm"
                            className="ml-2 flex-shrink-0"
                          />
                        </div>
                        
                        {/* Action buttons, visible on hover or selection */}
                        <div className={`flex space-x-1 transition-opacity duration-200 ${
                          selectedTaskId === task.id ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                        }`}>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="w-5 h-5"
                            title={t("inbox:editTask") + " (Alt+E)"}
                            onClick={(e) => handleEditTask(task.id, task, e)}
                          >
                            <Edit2 size={12} />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="w-5 h-5"
                            title={t("inbox:deleteTask") + " (Alt+D)"}
                            onClick={(e) => handleDeleteTask(task.id, task.title, e)}
                          >
                            <Trash2 size={12} />
                          </Button>
                        </div>
                      </div>
                    </TaskStateTransition>
                  ))
                ) : (
                  <div className="text-sm text-vscode-descriptionForeground py-1 px-2">
                    {t("inbox:noTasksMatch")}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
        
        {filteredCategories.every(cat => cat.filteredTasks.length === 0) && (
          <div className="p-4 text-center text-vscode-descriptionForeground">
            <div className="text-2xl mb-2">🔍</div>
            <div>{t("inbox:noTasksMatchFilter")}</div>
            <Button 
              variant="secondary" 
              size="sm" 
              className="mt-2"
              onClick={() => {
                setSearchQuery('');
                setFilterPriority('all');
              }}
            >
              {t("inbox:clearFilters")}
            </Button>
          </div>
        )}
      </div>

      {/* Quick actions footer */}
      <div className="p-2 border-t border-vscode-panel-border">
        <Button
          variant="secondary"
          size="sm"
          className="w-full flex items-center justify-center"
          onClick={() => setCreateDialogOpen(true)}
        >
          <PlusCircle size={14} className="mr-1" />
          {t("inbox:createNewTask")}
          <span className="ml-auto kbd-shortcut">Alt+N</span>
        </Button>
      </div>
      
      {/* Create task dialog */}
      <CreateTaskDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
      />
      
      {/* Edit task dialog */}
      {editingTask && (
        <EditTaskDialog
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          taskId={editingTask.id}
          taskTitle={editingTask.title}
          taskDescription=""
          taskPriority={editingTask.priority}
          taskState={editingTask.state}
          taskMode="code" // Default mode, would be retrieved from task in real implementation
        />
      )}
    </div>
  )
}

export default InboxSidebar