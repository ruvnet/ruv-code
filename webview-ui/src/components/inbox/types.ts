/**
 * Task state enum
 */
export type TaskState = "active" | "completed" | "archived";

/**
 * Interface for individual task items
 */
export interface TaskItem {
  id: string;
  title: string;
  priority: "high" | "medium" | "low";
  state: TaskState;
  running?: boolean;
  description?: string;
  mode?: string;
}

/**
 * Interface for task category in the sidebar
 */
export interface TaskCategory {
  id: string;
  name: string;
  count: number;
  isExpanded: boolean;
  tasks: TaskItem[];
}

/**
 * Category with filtered tasks
 */
export interface FilteredTaskCategory extends TaskCategory {
  filteredTasks: TaskItem[];
}

/**
 /**
  * Props for the InboxSidebar component
  */
 export interface InboxSidebarProps {
   onCreateTask: () => void;
   onSelectTask: (taskId: string) => void;
   selectedTaskId?: string;
   onEditTask?: (taskId: string, task: TaskItem) => void;
   onDeleteTask?: (taskId: string, taskTitle: string) => void;
   isMinimized?: boolean; // Whether the sidebar is in minimized state
 }
/**
 * Props for the TaskItem component
 */
export interface TaskItemProps {
  task: TaskItem;
  isSelected: boolean;
  onSelectTask: (taskId: string) => void;
  onEditTask: (taskId: string, task: TaskItem, e: React.MouseEvent) => void;
  onDeleteTask: (taskId: string, taskTitle: string, e: React.MouseEvent) => void;
}

/**
 * Props for the CategoryItem component
 */
export interface CategoryItemProps {
  category: FilteredTaskCategory;
  toggleCategory: (categoryId: string) => void;
}

/**
 * Props for the TaskList component
 */
export interface TaskListProps {
  category: FilteredTaskCategory;
  selectedTaskId?: string;
  onSelectTask: (taskId: string) => void;
  onEditTask: (taskId: string, task: TaskItem, e: React.MouseEvent) => void;
  onDeleteTask: (taskId: string, taskTitle: string, e: React.MouseEvent) => void;
}

/**
 * State change event
 */
export interface StateChangeEvent {
  id: string;
  newState: TaskState;
}