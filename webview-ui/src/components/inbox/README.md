# Inbox Component Documentation

## Overview

The Inbox component provides a Slack-like sidebar for task management. It follows a modular design pattern with smaller focused components and custom hooks for state management and filtering.

## Features

- Task organization in categories (Active, Completed, Archived)
- Search and filter functionality
- Task prioritization (High, Medium, Low)
- Responsive design with minimization support
- Keyboard shortcuts for common actions
- Smooth transitions and animations

## Components

### Core Components

- **InboxSidebar**: Main container component
- **SidebarHeader**: Header with title and action buttons
- **SidebarFooter**: Footer with quick action buttons
- **FilterBar**: Search and filter controls
- **CategoryItem**: Collapsible category header
- **TaskList**: Container for tasks in a category
- **TaskItem**: Individual task entry with actions
- **NoTasksMessage**: Empty state message
- **CreateTaskDialog**: Dialog for creating new tasks
- **EditTaskDialog**: Dialog for editing existing tasks

### Visual Components

- **TaskBadge**: Badge with icon for task state
- **PriorityBadge**: Badge with icon for task priority
- **TaskStateTransition**: Animation wrapper for state changes

## Hooks

- **useTaskManagement**: Manages task CRUD operations
- **useTaskFilter**: Handles search and filter logic
- **useSidebarState**: Manages sidebar visibility and click-outside detection

## Minimization Behavior

The sidebar has a feature to automatically minimize when a user clicks outside of it. This is implemented through:

1. A custom hook `useSidebarState` that:
   - Tracks the minimized state
   - Uses a ref to detect clicks outside the sidebar
   - Automatically minimizes when clicking outside

2. CSS classes in the InboxSidebar that:
   - Set width to 0 when minimized
   - Make content invisible with opacity
   - Prevent interaction with `pointer-events-none`
   - Ensure proper transitions with `transition-all`

## CSS Classes

Custom CSS classes are defined in `inbox.css` for:
- Task state transitions
- Priority and state badges
- Animation effects
- Keyboard shortcut styling

## Usage

```tsx
<InboxSidebar
  onSelectTask={handleSelectTask}
  selectedTaskId={selectedTaskId}
  onEditTask={handleEditTask}
  onDeleteTask={handleDeleteTask}
/>
```

## Future Improvements

- Drag and drop for task reordering
- Task grouping by custom tags
- Enhanced filtering options
- Persistent task storage
- Multi-selection support