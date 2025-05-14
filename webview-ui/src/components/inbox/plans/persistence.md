# Agentic Inbox - Persistence Implementation Plan

## Overview

This document outlines the persistence mechanism for the Agentic Inbox feature in Roo-Code, detailing how task data is stored, retrieved, and managed throughout its lifecycle. The Agentic Inbox relies on VSCode's extension storage capabilities combined with custom file-based persistence.

## Current Persistence Architecture

Roo-Code's task persistence follows a two-tier approach:

### 1. VSCode Extension State Storage

Tasks are primarily tracked through a `taskHistory` array stored in VSCode's `globalState`:

```typescript
// In ClineProvider.ts
async updateTaskHistory(item: HistoryItem): Promise<HistoryItem[]> {
  const history = (this.getGlobalState("taskHistory") as HistoryItem[] | undefined) || []
  const existingItemIndex = history.findIndex((h) => h.id === item.id)

  if (existingItemIndex !== -1) {
    history[existingItemIndex] = item
  } else {
    history.push(item)
  }

  await this.updateGlobalState("taskHistory", history)
  return history
}
```

This provides:
- Quick access to task metadata (ID, title, timestamp, etc.)
- Fast loading for the task list UI components
- Efficient filtering and sorting operations

### 2. File-Based Detail Storage

Detailed task content is stored in the file system:

```typescript
// In taskMessages.ts
export async function saveTaskMessages({ messages, taskId, globalStoragePath }: SaveTaskMessagesOptions) {
  const taskDir = await getTaskDirectoryPath(globalStoragePath, taskId)
  const filePath = path.join(taskDir, GlobalFileNames.uiMessages)
  await fs.writeFile(filePath, JSON.stringify(messages))
}
```

Each task has its own directory containing:
- `ui_messages.json` - Full conversation history
- Additional files for API logs, metrics, etc.

## Inbox Task Persistence Flow

The Agentic Inbox extends the existing persistence architecture with specific adaptations for task management:

### 1. Task Creation

When a user creates a task through the `CreateTaskDialog`:

1. The UI collects task metadata (title, description, priority, state, mode)
2. This data is formatted as markdown and sent via `vscode.postMessage({type: "newTask", ...})`
3. The extension handles this message by:
   - Creating a new task ID (timestamp-based)
   - Creating a task directory
   - Initializing the task's message history
   - Adding the task to the `taskHistory` array

```typescript
// In CreateTaskDialog.tsx - Client side
vscode.postMessage({
  type: "newTask",
  text: taskContent,
  images: []
});

// In extension - Server side (simplified)
async handleNewTask(text, images) {
  const taskId = Date.now().toString()
  await this.saveClineMessages(text, taskId)
  const historyItem = await taskMetadata(...)
  await this.updateTaskHistory(historyItem)
}
```

### 2. Task State Management

When a user changes a task's state (active → completed → archived):

1. The UI triggers a state change via `onChangeState` callback
2. This updates the local React state for immediate visual feedback
3. The change is persisted via `vscode.postMessage({type: "showTaskWithId", ...})`
4. The extension updates both:
   - The task's entry in `taskHistory`
   - The task's message content to reflect the new state

```typescript
// In InboxTaskHeader.tsx - Triggering state change
onChangeState && onChangeState(task.ts.toString(), "completed")

// In EditTaskDialog.tsx - Persisting changes
vscode.postMessage({
  type: "showTaskWithId",
  text: taskContent, // Updated content with new state
  images: []
});
```

### 3. Task Deletion

When a user deletes a task:

1. The UI confirms via `DeleteTaskConfirmationDialog`
2. The deletion request is sent via `vscode.postMessage({type: "deleteTaskWithId", ...})`
3. The extension:
   - Removes the task from `taskHistory`
   - Optionally deletes the task's directory from the file system

```typescript
// In DeleteTaskConfirmationDialog.tsx
vscode.postMessage({ 
  type: "deleteTaskWithId", 
  text: taskId 
});

// In extension (simplified)
async deleteTaskFromState(id: string) {
  const taskHistory = this.getGlobalState("taskHistory") ?? []
  const updatedTaskHistory = taskHistory.filter((task) => task.id !== id)
  await this.updateGlobalState("taskHistory", updatedTaskHistory)
}
```

## Storage Directory Structure

Tasks are stored in a hierarchical directory structure:

```
{storageBasePath}/
  ├── settings/
  │   ├── api_conversation_history.json
  │   ├── custom_modes.json
  │   └── mcp_settings.json
  │
  └── tasks/
      ├── {taskId1}/
      │   ├── ui_messages.json
      │   └── api_messages.json
      ├── {taskId2}/
      │   ├── ui_messages.json
      │   └── api_messages.json
      └── ...
```

The base storage path is determined by:
1. User configuration with `roo-cline.customStoragePath`
2. Default VSCode global storage location

## Task Metadata Structure

Each task in `taskHistory` is represented as a `HistoryItem`:

```typescript
interface HistoryItem {
  id: string;           // Unique task identifier
  number: number;       // Sequential task number
  ts: number;           // Timestamp
  task: string;         // Task content/title
  tokensIn: number;     // Input token count
  tokensOut: number;    // Output token count
  cacheWrites: number;  // Cache write operations
  cacheReads: number;   // Cache read operations
  totalCost: number;    // Estimated API cost
  size: number;         // Storage size in bytes
  workspace: string;    // Workspace identifier
  // Inbox-specific fields (to be added)
  priority?: "high" | "medium" | "low";
  state?: "active" | "completed" | "archived";
  mode?: string;
}
```

## Key Components

### 1. Message Passing System

The WebView UI communicates with the extension via `vscode.postMessage()`:

```typescript
// In CreateTaskDialog.tsx
vscode.postMessage({
  type: "newTask",
  text: taskContent,
  images: []
});

// In DeleteTaskConfirmationDialog.tsx
vscode.postMessage({ 
  type: "deleteTaskWithId", 
  text: taskId 
});

// In EditTaskDialog.tsx
vscode.postMessage({
  type: "showTaskWithId",
  text: taskContent,
  images: []
});
```

### 2. Task Content Formatting

Task metadata is embedded within the task content (markdown format):

```markdown
# Task Title

Task description text

**Priority:** high
**State:** active
**Mode:** code

### Subtasks
- [ ] Subtask 1
- [ ] Subtask 2

### Workflow
**Flow Type:** sequential
**Dependencies:** task123, task456
```

This approach allows:
- Human-readable task content
- Embedded metadata for persistence
- Flexibility for future extensions

### 3. State Synchronization

The Inbox UI maintains local state that must be synchronized with the extension:

1. Initial state is loaded from `taskHistory` when the inbox view opens
2. Changes are applied to local React state for immediate feedback
3. Changes are persisted through message passing
4. Incoming state updates from the extension are reflected in the UI

## Implementation Recommendations

1. **Extend the HistoryItem Interface**
   
   Add inbox-specific fields to the HistoryItem interface for better type safety:

   ```typescript
   // In src/shared/HistoryItem.ts
   export interface HistoryItem {
     // ... existing fields
     priority?: "high" | "medium" | "low";
     state?: "active" | "completed" | "archived";
     subtasks?: Array<{id: string, name: string, completed: boolean}>;
     flowType?: "sequential" | "parallel" | "concurrent" | "swarm";
     dependencies?: string[];
   }
   ```

2. **Enhance Task Metadata Parsing**

   Add functionality to extract inbox-specific metadata from task content:

   ```typescript
   // In taskMetadata.ts
   function extractInboxMetadata(text: string) {
     const priority = text.match(/\*\*Priority:\*\*\s+(\w+)/i)?.[1].toLowerCase();
     const state = text.match(/\*\*State:\*\*\s+(\w+)/i)?.[1].toLowerCase();
     // ...extract other metadata
     
     return { 
       priority: priority as "high" | "medium" | "low",
       state: state as "active" | "completed" | "archived",
       // ...other metadata
     };
   }
   ```

3. **Implement Task History Filtering**

   Add functions to filter tasks based on inbox criteria:

   ```typescript
   // New utility function
   export function filterInboxTasks(tasks: HistoryItem[], filters: {
     state?: TaskState,
     priority?: "high" | "medium" | "low" | "all",
     searchQuery?: string
   }) {
     return tasks.filter(task => {
       // Apply filters
       if (filters.state && task.state !== filters.state) return false;
       if (filters.priority && filters.priority !== "all" && task.priority !== filters.priority) return false;
       if (filters.searchQuery && !task.task.toLowerCase().includes(filters.searchQuery.toLowerCase())) return false;
       return true;
     });
   }
   ```

4. **Add Migration Support**

   Ensure backward compatibility with tasks created before inbox features:

   ```typescript
   // In migrateSettings.ts
   export async function migrateTaskHistory(history: HistoryItem[]) {
     return history.map(item => {
       // Add default values for inbox fields if missing
       if (!item.priority) item.priority = "medium";
       if (!item.state) item.state = "active";
       return item;
     });
   }
   ```

## Future Enhancements

1. **Bulk Operations**
   - Implement batch state changes (e.g., mark all completed tasks as archived)
   - Support multi-selection for task operations

2. **Task Dependencies**
   - Enhance the persistence layer to track task relationships
   - Implement validation to prevent circular dependencies

3. **Custom Storage Providers**
   - Add support for cloud-based task storage
   - Enable synchronization across devices

4. **Performance Optimizations**
   - Implement pagination for large task histories
   - Add caching for frequently accessed tasks
   - Optimize JSON storage with compression for large tasks

## Technical Considerations

1. **Race Conditions**
   - Implement proper locking mechanisms for file operations
   - Use optimistic UI updates with rollback on failure

2. **Error Recovery**
   - Add checksums to detect file corruption
   - Implement auto-backup for task history

3. **Storage Limits**
   - Monitor and manage storage usage
   - Implement cleanup strategies for old/archived tasks

4. **Versioning**
   - Add version fields to task metadata
   - Implement migration paths for format changes