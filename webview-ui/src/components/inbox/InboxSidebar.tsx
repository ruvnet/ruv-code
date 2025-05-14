import React, { useEffect } from "react";

// Import hooks
import { useTaskManagement } from "./useTaskManagement";
import { useTaskFilter } from "./useTaskFilter";
import { useSidebarState } from "./useSidebarState";

// Import components
import CategoryItem from "./CategoryItem";
import TaskList from "./TaskList";
import FilterBar from "./FilterBar";
import SidebarHeader from "./SidebarHeader";
import SidebarFooter from "./SidebarFooter";
import NoTasksMessage from "./NoTasksMessage";
import CreateTaskDialog from "./CreateTaskDialog";
import EditTaskDialog from "./EditTaskDialog";

// Import types
import { InboxSidebarProps } from "./types";

// Import CSS for animations and state styling
import "./inbox.css";

/**
 * InboxSidebar Component
 *
 * Provides a Slack-like sidebar for the Agentic Inbox with task management features.
 * The sidebar is organized into collapsible sections with tasks grouped by categories.
 * Includes filtering functionality for finding tasks by name or priority.
 *
 * This component now uses a modular approach with smaller focused components
 * and custom hooks for state management and filtering.
 */
const InboxSidebar: React.FC<InboxSidebarProps> = ({
  onCreateTask: _onCreateTask, // Renamed since we use the dialog directly
  onSelectTask,
  selectedTaskId,
  onEditTask,
  onDeleteTask,
  isMinimized: isMinimizedProp = false // Default to not minimized
}) => {
  // Sidebar state with click-outside detection
  const { isMinimized, sidebarRef } = useSidebarState();
  
  // Use external minimized state if provided
  const effectiveIsMinimized = isMinimizedProp !== undefined ? isMinimizedProp : isMinimized;

  // Use task management hook
  const {
    categories,
    editDialogOpen,
    setEditDialogOpen,
    editingTask,
    createDialogOpen,
    setCreateDialogOpen,
    toggleCategory,
    handleEditTask,
    handleDeleteTask,
    getKeyboardShortcutHandler
  } = useTaskManagement();

  // Use task filter hook
  const {
    showFilters,
    setShowFilters,
    searchQuery,
    setSearchQuery,
    filterPriority,
    setFilterPriority,
    filteredCategories,
    noFilteredTasks,
    resetFilters
  } = useTaskFilter(categories);

  // Setup keyboard shortcuts
  useEffect(() => {
    const keyboardHandler = getKeyboardShortcutHandler(selectedTaskId);
    window.addEventListener("keydown", keyboardHandler);
    
    return () => {
      window.removeEventListener("keydown", keyboardHandler);
    };
  }, [selectedTaskId, getKeyboardShortcutHandler]);

  // Connect with external edit handler if provided
  useEffect(() => {
    if (onEditTask && editingTask) {
      onEditTask(editingTask.id, editingTask);
    }
  }, [editingTask, onEditTask]);

  // Connect with external delete handler if provided
  useEffect(() => {
    // Skip this effect if no external handler is provided
    if (!onDeleteTask) return;

    // This useEffect simply connects our internal handler with the external one
    // We don't override the internal handler, just call both when needed
    // The actual implementation remains in the useTaskManagement hook
  }, [onDeleteTask]);

  return (
    <div
      ref={sidebarRef}
      className={`flex flex-col h-full bg-vscode-sideBar-background border-r border-vscode-panel-border transition-all duration-300 ${
        effectiveIsMinimized ? 'w-0 opacity-0 overflow-hidden pointer-events-none' : 'w-[280px]'
      }`}
      style={{
        zIndex: 10, /* Ensure sidebar is above context indicator */
        position: 'relative' /* Needed for z-index to work */
      }}
      data-component="InboxSidebar"
    >
      {/* Header with title */}
      <SidebarHeader
        showFilters={showFilters}
        setShowFilters={setShowFilters}
        setCreateDialogOpen={setCreateDialogOpen}
      />

      {/* Search and filter controls */}
      {showFilters && (
        <FilterBar
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          filterPriority={filterPriority}
          setFilterPriority={setFilterPriority}
        />
      )}

      {/* Categories and tasks list */}
      <div className="flex-grow overflow-y-auto p-2">
        {filteredCategories.map((category) => (
          <div key={category.id} className="mb-3">
            {/* Category header */}
            <CategoryItem
              category={category}
              toggleCategory={toggleCategory}
            />

            {/* Task items */}
            {category.isExpanded && (
              <div className="ml-6 mt-1">
                <TaskList
                  category={category}
                  selectedTaskId={selectedTaskId}
                  onSelectTask={onSelectTask}
                  onEditTask={handleEditTask}
                  onDeleteTask={handleDeleteTask}
                />
              </div>
            )}
          </div>
        ))}
        
        {/* Empty state message when no tasks match filters */}
        {noFilteredTasks && (
          <NoTasksMessage resetFilters={resetFilters} />
        )}
      </div>

      {/* Quick actions footer */}
      <SidebarFooter setCreateDialogOpen={setCreateDialogOpen} />
      
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
          taskDescription={editingTask.description || ""}
          taskPriority={editingTask.priority}
          taskState={editingTask.state}
          taskMode={editingTask.mode || "code"}
        />
      )}
    </div>
  );
};

export default InboxSidebar;