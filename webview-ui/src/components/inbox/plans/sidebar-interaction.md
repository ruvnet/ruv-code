# Agentic Inbox - Sidebar Interaction Plan

## Overview

This document outlines the implementation plan for enhancing the sidebar navigation in the Agentic Inbox feature, focusing on enabling edit/delete functionality and ensuring proper integration with task creation. The plan addresses how to make the sidebar fully interactive, maintaining state consistency across the application.

## Current Sidebar Implementation

The sidebar is implemented in `InboxSidebar.tsx` with the following key elements:

- Task categories (active, completed, archived)
- Task listings within each category
- Edit/delete icons that appear on hover or selection
- Task creation button

Currently, the implementation has these limitations:

1. Edit/delete functionality is partially implemented but not connected to backend persistence
2. Task creation workflow doesn't automatically refresh sidebar content
3. Task state changes (e.g., active → completed) require manual UI updates

## Implementation Plan

### 1. Enhancing Edit/Delete Functionality

#### Edit Icon Implementation

```typescript
// In InboxSidebar.tsx
const handleEditTask = useCallback((taskId: string, task: TaskItem, e: React.MouseEvent) => {
  e.stopPropagation();
  setEditingTask(task);
  setEditDialogOpen(true);
  
  // This callback is provided by parent but needs to be properly implemented
  if (onEditTask) {
    onEditTask(taskId, task);
  }
}, []);
```

To fully implement this functionality:

1. **Update Task Edit Dialog Integration**
   
   ```typescript
   // In InboxView.tsx - Enhance the handleEditTask function
   const handleEditTask = useCallback((taskId: string, task: TaskItem) => {
     // Store the task being edited
     setEditTaskData({
       id: taskId,
       title: task.title,
       description: task.description,
       priority: task.priority,
       state: task.state,
       mode: task.mode,
       message: task.message
     });
     
     // This triggers the EditTaskDialog to open
   }, []);
   ```

2. **Implement Task Update Persistence**

   ```typescript
   // In EditTaskDialog.tsx - Enhance the handleUpdateTask function
   const handleUpdateTask = () => {
     // Create updated task content with all metadata
     const taskContent = formatTaskContent(title, description, priority, state, selectedMode, taskId);
     
     // Send update to extension
     vscode.postMessage({
       type: "updateTask", // New message type for task updates
       id: taskId,
       content: taskContent,
       metadata: {
         title,
         description,
         priority,
         state,
         mode: selectedMode
       }
     });
     
     onOpenChange(false); // Close dialog
   };
   ```

3. **Extension Message Handler**

   On the extension side, add a handler for the "updateTask" message:

   ```typescript
   // In extension message handler
   case "updateTask": {
     const { id, content, metadata } = message;
     
     // Update task in memory
     const updatedTask = {
       ...existingTask,
       task: content,
       ...metadata
     };
     
     // Update in taskHistory
     await updateTaskHistory(updatedTask);
     
     // Update task file
     await saveTaskContent(id, content);
     
     // Notify WebView of successful update
     webviewView.webview.postMessage({ 
       type: "taskUpdated", 
       taskId: id,
       task: updatedTask
     });
     
     break;
   }
   ```

#### Delete Icon Implementation

1. **Enhance Delete Confirmation Dialog**

   ```typescript
   // In InboxSidebar.tsx - Enhance handleDeleteTask
   const handleDeleteTask = (taskId: string, taskTitle: string, e: React.MouseEvent) => {
     e.stopPropagation();
     setDeleteTaskData({ id: taskId, title: taskTitle });
     
     // This will trigger the DeleteTaskConfirmationDialog
   };
   ```

2. **Implement Task Deletion Persistence**

   ```typescript
   // In DeleteTaskConfirmationDialog.tsx - Enhance handleDelete
   const handleDelete = () => {
     // Send deletion request to extension
     vscode.postMessage({ 
       type: "deleteTaskWithId", 
       text: taskId,
       permanent: true // Flag to indicate permanent deletion
     });
     
     onOpenChange(false); // Close dialog
   };
   ```

3. **Extension Message Handler**

   ```typescript
   // In extension message handler
   case "deleteTaskWithId": {
     const taskId = message.text;
     const permanent = message.permanent || false;
     
     if (permanent) {
       // Remove from taskHistory
       await deleteTaskFromState(taskId);
       
       // Remove task files
       await deleteTaskFiles(taskId);
       
       // Notify WebView of successful deletion
       webviewView.webview.postMessage({ 
         type: "taskDeleted", 
         taskId 
       });
     } else {
       // Handle non-permanent deletion (archive instead)
       // ...
     }
     
     break;
   }
   ```

### 2. Task Creation and Sidebar Refresh

To ensure the sidebar refreshes when a new task is created:

1. **Enhance Task Creation Flow**

   ```typescript
   // In CreateTaskDialog.tsx - Enhance handleCreateTask
   const handleCreateTask = () => {
     // Format task content
     const taskContent = formatTaskContent(taskName, description, priority, state, selectedMode);
     
     // Create task with metadata
     vscode.postMessage({
       type: "newTask",
       text: taskContent,
       images: [],
       metadata: {
         title: taskName,
         description,
         priority,
         state,
         mode: selectedMode
       }
     });
     
     onOpenChange(false); // Close dialog
   };
   ```

2. **Extension Message Handler**

   ```typescript
   // In extension message handler
   case "newTask": {
     const { text, images, metadata } = message;
     
     // Create task
     const taskId = Date.now().toString();
     await saveTaskMessages({
       messages: [{ text, images, ts: Date.now() }],
       taskId,
       globalStoragePath: this.globalStoragePath
     });
     
     // Create and add to history
     const historyItem = {
       id: taskId,
       number: this.getNextTaskNumber(),
       ts: Date.now(),
       task: text,
       tokensIn: 0,
       tokensOut: 0,
       cacheWrites: 0,
       cacheReads: 0,
       totalCost: 0,
       size: 0,
       workspace: this.cwd,
       ...metadata
     };
     
     await this.updateTaskHistory(historyItem);
     
     // Notify WebView of successful creation
     webviewView.webview.postMessage({ 
       type: "taskCreated", 
       task: historyItem
     });
     
     break;
   }
   ```

3. **WebView Message Handler**

   ```typescript
   // In InboxView.tsx - Add handler for extension messages
   useEffect(() => {
     const handleExtensionMessage = (event: MessageEvent) => {
       const message = event.data;
       
       switch (message.type) {
         case "taskCreated":
           // Add new task to local state
           setTasks(prevTasks => [message.task, ...prevTasks]);
           // Optionally select the new task
           setSelectedTaskId(message.task.id);
           break;
           
         case "taskUpdated":
           // Update existing task in local state
           setTasks(prevTasks => 
             prevTasks.map(task => 
               task.id === message.taskId ? message.task : task
             )
           );
           break;
           
         case "taskDeleted":
           // Remove task from local state
           setTasks(prevTasks => 
             prevTasks.filter(task => task.id !== message.taskId)
           );
           // Clear selection if deleted task was selected
           if (selectedTaskId === message.taskId) {
             setSelectedTaskId(undefined);
           }
           break;
       }
     };
     
     // Add event listener for messages from extension
     window.addEventListener('message', handleExtensionMessage);
     
     return () => {
       window.removeEventListener('message', handleExtensionMessage);
     };
   }, [selectedTaskId]);
   ```

### 3. Task State Management

To properly handle task state transitions (e.g., active → completed):

1. **Enhance State Change Handler**

   ```typescript
   // In InboxView.tsx - Enhance handleChangeTaskState
   const handleChangeTaskState = useCallback((taskId: string, newState: TaskState) => {
     // Update local state immediately for responsive UI
     setTasks(prevTasks =>
       prevTasks.map(task =>
         task.id === taskId
           ? { ...task, state: newState }
           : task
       )
     );
     
     // Send update to extension
     vscode.postMessage({
       type: "updateTaskState",
       taskId,
       newState
     });
   }, []);
   ```

2. **Extension Message Handler**

   ```typescript
   // In extension message handler
   case "updateTaskState": {
     const { taskId, newState } = message;
     
     // Get current task from history
     const taskHistory = this.getGlobalState("taskHistory") || [];
     const taskIndex = taskHistory.findIndex(task => task.id === taskId);
     
     if (taskIndex !== -1) {
       // Update task in history
       const updatedTask = {
         ...taskHistory[taskIndex],
         state: newState
       };
       
       taskHistory[taskIndex] = updatedTask;
       
       // Save updated history
       await this.updateGlobalState("taskHistory", taskHistory);
       
       // Update task content to reflect new state
       const taskMessages = await readTaskMessages({
         taskId,
         globalStoragePath: this.globalStoragePath
       });
       
       if (taskMessages.length > 0) {
         // Update state in task content
         const firstMessage = taskMessages[0];
         const updatedText = updateTaskStateInContent(firstMessage.text, newState);
         
         taskMessages[0] = {
           ...firstMessage,
           text: updatedText
         };
         
         // Save updated messages
         await saveTaskMessages({
           messages: taskMessages,
           taskId,
           globalStoragePath: this.globalStoragePath
         });
       }
       
       // Notify WebView of successful update
       webviewView.webview.postMessage({ 
         type: "taskStateUpdated", 
         taskId,
         newState,
         task: updatedTask
       });
     }
     
     break;
   }
   ```

3. **Helper Function to Update Task Content**

   ```typescript
   // Helper function to update state in task content
   function updateTaskStateInContent(content: string, newState: string): string {
     // Replace state in task content
     return content.replace(
       /\*\*State:\*\*\s+(active|completed|archived)/i,
       `**State:** ${newState}`
     );
   }
   ```

### 4. Task Filtering and Categorization

Enhance the sidebar to properly filter and categorize tasks:

1. **Implement Task Filtering Logic**

   ```typescript
   // In InboxSidebar.tsx - Enhanced filtering logic
   const filteredCategories = useMemo(() => {
     // Group tasks by state
     const tasksByState = {
       active: [] as TaskItem[],
       completed: [] as TaskItem[],
       archived: [] as TaskItem[]
     };
     
     // Filter and categorize tasks
     tasks.forEach(task => {
       // Apply filters
       const matchesSearch = !searchQuery || 
         task.title.toLowerCase().includes(searchQuery.toLowerCase());
       const matchesPriority = filterPriority === 'all' || task.priority === filterPriority;
       
       if (matchesSearch && matchesPriority) {
         // Add to appropriate category
         tasksByState[task.state].push(task);
       }
     });
     
     // Create filtered categories
     return [
       {
         id: "active",
         name: t("inbox:categories.active"),
         count: tasksByState.active.length,
         isExpanded: expandedCategories.includes("active"),
         filteredTasks: tasksByState.active
       },
       {
         id: "completed",
         name: t("inbox:categories.completed"),
         count: tasksByState.completed.length,
         isExpanded: expandedCategories.includes("completed"),
         filteredTasks: tasksByState.completed
       },
       {
         id: "archived",
         name: t("inbox:categories.archived"),
         count: tasksByState.archived.length,
         isExpanded: expandedCategories.includes("archived"),
         filteredTasks: tasksByState.archived
       }
     ];
   }, [tasks, searchQuery, filterPriority, expandedCategories, t]);
   ```

2. **Track Expanded Categories**

   ```typescript
   // In InboxSidebar.tsx - Track expanded categories
   const [expandedCategories, setExpandedCategories] = useState<string[]>(["active"]);
   
   const toggleCategory = useCallback((categoryId: string) => {
     setExpandedCategories(prev => 
       prev.includes(categoryId)
         ? prev.filter(id => id !== categoryId)
         : [...prev, categoryId]
     );
   }, []);
   ```

### 5. Extension-to-WebView Communication Flow

Establish a clear communication flow to ensure UI updates properly reflect backend changes:

1. **Initial Data Loading**

   ```typescript
   // In InboxView.tsx - Load initial data
   useEffect(() => {
     // Request task data from extension
     vscode.postMessage({ type: "getInboxTasks" });
     
     // Handler for extension response
     const handleInitialData = (event: MessageEvent) => {
       const message = event.data;
       
       if (message.type === "inboxTasksData") {
         setTasks(message.tasks);
         setInitialized(true);
       }
     };
     
     window.addEventListener('message', handleInitialData);
     
     return () => {
       window.removeEventListener('message', handleInitialData);
     };
   }, []);
   ```

2. **Extension Message Handler**

   ```typescript
   // In extension message handler
   case "getInboxTasks": {
     // Get tasks from history
     const taskHistory = this.getGlobalState("taskHistory") || [];
     
     // Format tasks for inbox
     const inboxTasks = taskHistory.map(item => ({
       id: item.id,
       title: extractTaskTitle(item.task),
       description: extractTaskDescription(item.task),
       priority: extractTaskPriority(item.task) || "medium",
       state: extractTaskState(item.task) || "active",
       mode: extractTaskMode(item.task) || "code",
       ts: item.ts
     }));
     
     // Send tasks to WebView
     webviewView.webview.postMessage({ 
       type: "inboxTasksData", 
       tasks: inboxTasks
     });
     
     break;
   }
   ```

## UI/UX Enhancements

To improve the sidebar interaction experience:

1. **Visual Feedback for Actions**

   ```typescript
   // In InboxSidebar.tsx - Add visual feedback for actions
   const [actionFeedback, setActionFeedback] = useState<{
     type: "edit" | "delete" | "create" | "move",
     taskId: string,
     timestamp: number
   } | null>(null);
   
   // Show feedback when an action is performed
   const showActionFeedback = (type: "edit" | "delete" | "create" | "move", taskId: string) => {
     setActionFeedback({ type, taskId, timestamp: Date.now() });
     
     // Clear feedback after animation completes
     setTimeout(() => {
       setActionFeedback(null);
     }, 1500);
   };
   ```

2. **Drag and Drop for Task Reordering**

   ```typescript
   // In InboxSidebar.tsx - Implement drag and drop
   const onDragEnd = (result: DropResult) => {
     // Handle drag end
     const { source, destination } = result;
     
     if (!destination) return;
     
     // Different category (state change)
     if (source.droppableId !== destination.droppableId) {
       const sourceCategory = source.droppableId as TaskState;
       const destCategory = destination.droppableId as TaskState;
       const taskId = getTaskIdFromIndex(sourceCategory, source.index);
       
       // Change task state
       if (taskId) {
         handleChangeTaskState(taskId, destCategory);
         showActionFeedback("move", taskId);
       }
     } 
     // Same category (reordering)
     else if (source.index !== destination.index) {
       // Implementation for custom ordering would go here
     }
   };
   ```

3. **Bulk Actions**

   ```typescript
   // In InboxSidebar.tsx - Add bulk action handlers
   const [selectedTasks, setSelectedTasks] = useState<string[]>([]);
   
   const handleBulkStateChange = (newState: TaskState) => {
     // Apply state change to all selected tasks
     selectedTasks.forEach(taskId => {
       handleChangeTaskState(taskId, newState);
     });
     
     // Clear selection after action
     setSelectedTasks([]);
   };
   ```

## Task Creation Workflow

Enhance the task creation workflow to ensure smooth integration with the sidebar:

1. **Creation Success Indicator**

   ```typescript
   // In InboxView.tsx - Add task creation success handler
   const [creationSuccess, setCreationSuccess] = useState<{
     taskId: string,
     timestamp: number
   } | null>(null);
   
   // Extension message handler
   useEffect(() => {
     const handleMessage = (event: MessageEvent) => {
       const message = event.data;
       
       if (message.type === "taskCreated") {
         // Add new task to state
         setTasks(prev => [message.task, ...prev]);
         
         // Show success indicator
         setCreationSuccess({
           taskId: message.task.id,
           timestamp: Date.now()
         });
         
         // Clear indicator after animation
         setTimeout(() => {
           setCreationSuccess(null);
         }, 2000);
       }
     };
     
     window.addEventListener('message', handleMessage);
     
     return () => {
       window.removeEventListener('message', handleMessage);
     };
   }, []);
   ```

2. **Automatic Category Expansion**

   ```typescript
   // In InboxSidebar.tsx - Auto-expand category for new tasks
   useEffect(() => {
     // When a task is added to state
     if (latestTaskId) {
       // Get task state
       const task = tasks.find(t => t.id === latestTaskId);
       
       if (task) {
         // Ensure category is expanded
         setExpandedCategories(prev => 
           prev.includes(task.state) ? prev : [...prev, task.state]
         );
         
         // Scroll task into view
         const taskElement = document.getElementById(`task-${latestTaskId}`);
         if (taskElement) {
           taskElement.scrollIntoView({ behavior: "smooth", block: "nearest" });
         }
       }
     }
   }, [latestTaskId, tasks]);
   ```

## Technical Implementation Details

### 1. Updated API Types

Define clear types for the extension-to-webview communication:

```typescript
// Extension message types
type ExtensionMessage =
  | { type: "taskCreated"; task: Task }
  | { type: "taskUpdated"; taskId: string; task: Task }
  | { type: "taskDeleted"; taskId: string }
  | { type: "taskStateUpdated"; taskId: string; newState: TaskState; task: Task }
  | { type: "inboxTasksData"; tasks: Task[] };

// WebView message types
type WebViewMessage =
  | { type: "newTask"; text: string; images: string[]; metadata: TaskMetadata }
  | { type: "updateTask"; id: string; content: string; metadata: TaskMetadata }
  | { type: "deleteTaskWithId"; text: string; permanent: boolean }
  | { type: "updateTaskState"; taskId: string; newState: TaskState }
  | { type: "getInboxTasks" };

// Task metadata interface
interface TaskMetadata {
  title: string;
  description: string;
  priority: "high" | "medium" | "low";
  state: "active" | "completed" | "archived";
  mode: string;
}
```

### 2. Data Flow Architecture

```
┌────────────────┐    ┌────────────────┐    ┌────────────────┐
│                │    │                │    │                │
│  UI Components │    │  WebView State │    │  VS Code Ext   │
│                │    │                │    │                │
└───────┬────────┘    └───────┬────────┘    └───────┬────────┘
        │                     │                     │
        │   User Actions      │      Messages       │
        │  ┌─────────────┐    │  ┌─────────────┐    │
        ├─►│ Edit/Delete │────┼─►│ updateTask  │────┤
        │  └─────────────┘    │  └─────────────┘    │
        │                     │                     │
        │  ┌─────────────┐    │  ┌─────────────┐    │
        ├─►│ Create Task │────┼─►│ newTask     │────┤
        │  └─────────────┘    │  └─────────────┘    │
        │                     │                     │
        │  ┌─────────────┐    │  ┌─────────────┐    │  ┌─────────────┐
        └─►│ Change State│────┼─►│updateTaskSt.│────┼─►│taskStateUpd. │
           └─────────────┘    │  └─────────────┘    │  └──────┬──────┘
                              │                     │         │
                              │  ┌─────────────┐    │         │
                              │◄─┤ Extension   │◄───┤         │
                              │  │ Messages    │    │         │
                              │  └─────────────┘    │         │
                              │                     │         │
                              │                     │         │
                              │                     │  ┌──────▼──────┐
                              │                     │  │ VSCode/File │
                              │                     │  │ Persistence │
                              │                     │  └─────────────┘
```

## Code Implementation Phases

### Phase 1: Basic Edit/Delete Functionality

1. Enhance `EditTaskDialog.tsx` and `DeleteTaskConfirmationDialog.tsx`
2. Implement message handlers in extension
3. Update UI components to reflect changes

### Phase 2: Task Creation Integration

1. Enhance `CreateTaskDialog.tsx` to include metadata
2. Implement success indicators and animations
3. Add automatic category expansion

### Phase 3: State Management

1. Implement task state transition handlers
2. Add visual transitions for state changes
3. Update filtering and categorization logic

### Phase 4: Advanced UI Features

1. Implement drag and drop for reordering
2. Add bulk action capabilities
3. Implement keyboard shortcuts

## Testing Plan

1. **Unit Tests**:
   - Test message format consistency
   - Validate task parsing functions
   - Test filtering and categorization logic

2. **Integration Tests**:
   - Create → Edit → Delete workflow
   - State transition validation
   - Filter application and results

3. **UI Tests**:
   - Verify icon appearance on hover/selection
   - Validate success animations
   - Test responsive layout

## Conclusion

This implementation plan provides a comprehensive approach to enabling the sidebar navigation edit/delete functionality and ensuring proper integration with task creation in the Agentic Inbox. By following this plan, the development team can implement a robust, user-friendly interface for managing tasks within the VSCode extension.