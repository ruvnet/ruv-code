import { useState, useCallback } from "react";
import { v4 as uuidv4 } from "uuid";
import { TaskItem, TaskCategory, TaskState } from "./types";

/**
 * Example tasks data
 */
const EXAMPLE_TASKS: TaskItem[] = [
  {
    id: "task-1",
    title: "Complete project documentation",
    priority: "high",
    state: "active",
  },
  {
    id: "task-2",
    title: "Review pull requests",
    priority: "medium", 
    state: "active",
  },
  {
    id: "task-3",
    title: "Fix sidebar responsiveness",
    priority: "low",
    state: "active", 
  },
  {
    id: "task-4",
    title: "Implement dark mode",
    priority: "medium",
    state: "completed",
  },
  {
    id: "task-5",
    title: "Refactor authentication module",
    priority: "high",
    state: "archived",
  }
];

/**
 * Custom hook for task management
 * 
 * Provides functionality for task CRUD operations,
 * category management, and state transitions.
 */
export function useTaskManagement() {
  // Task categories state
  const [categories, setCategories] = useState<TaskCategory[]>([
    {
      id: "active",
      name: "Active",
      count: EXAMPLE_TASKS.filter(t => t.state === "active").length,
      isExpanded: true,
      tasks: EXAMPLE_TASKS.filter(t => t.state === "active"),
    },
    {
      id: "completed",
      name: "Completed",
      count: EXAMPLE_TASKS.filter(t => t.state === "completed").length,
      isExpanded: false,
      tasks: EXAMPLE_TASKS.filter(t => t.state === "completed"),
    },
    {
      id: "archived",
      name: "Archived",
      count: EXAMPLE_TASKS.filter(t => t.state === "archived").length,
      isExpanded: false,
      tasks: EXAMPLE_TASKS.filter(t => t.state === "archived"),
    }
  ]);

  // Dialog state management 
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<TaskItem | null>(null);

  // Toggle category expansion
  const toggleCategory = useCallback((categoryId: string) => {
    setCategories(prevCategories =>
      prevCategories.map(category =>
        category.id === categoryId
          ? { ...category, isExpanded: !category.isExpanded }
          : category
      )
    );
  }, []);

  // Create new task
  const createTask = useCallback((
    title: string,
    priority: "high" | "medium" | "low",
    state: TaskState,
    description?: string,
    mode?: string
  ) => {
    const newTask: TaskItem = {
      id: uuidv4(),
      title,
      priority,
      state,
      description,
      mode
    };

    setCategories(prevCategories =>
      prevCategories.map(category =>
        category.id === state
          ? {
              ...category,
              tasks: [...category.tasks, newTask],
              count: category.count + 1
            }
          : category
      )
    );

    return newTask.id;
  }, []);

  // Edit task
  const editTask = useCallback((
    taskId: string,
    updates: Partial<Omit<TaskItem, "id">>
  ) => {
    let oldCategory: string | null = null;
    let newCategory: string | null = null;

    if (updates.state) {
      // Find which category the task is currently in
      for (const category of categories) {
        if (category.tasks.some(task => task.id === taskId)) {
          oldCategory = category.id;
          break;
        }
      }
      
      newCategory = updates.state;
    }

    setCategories(prevCategories => {
      // Handle category transfer if state has changed
      if (oldCategory && newCategory && oldCategory !== newCategory) {
        // Find the task in its old category
        const taskToMove = prevCategories
          .find(c => c.id === oldCategory)
          ?.tasks.find(t => t.id === taskId);

        if (!taskToMove) return prevCategories;

        // Create updated task
        const updatedTask = { ...taskToMove, ...updates };

        // Remove from old category, add to new category
        return prevCategories.map(category => {
          if (category.id === oldCategory) {
            // Remove from old category
            return {
              ...category,
              tasks: category.tasks.filter(t => t.id !== taskId),
              count: category.count - 1
            };
          } else if (category.id === newCategory) {
            // Add to new category
            return {
              ...category,
              tasks: [...category.tasks, updatedTask],
              count: category.count + 1
            };
          }
          return category;
        });
      } else {
        // Simple update without category transfer
        return prevCategories.map(category => ({
          ...category,
          tasks: category.tasks.map(task =>
            task.id === taskId ? { ...task, ...updates } : task
          )
        }));
      }
    });
  }, [categories]);

  // Delete task
  const deleteTask = useCallback((taskId: string) => {
    setCategories(prevCategories =>
      prevCategories.map(category => {
        const hasTask = category.tasks.some(task => task.id === taskId);
        
        if (hasTask) {
          return {
            ...category,
            tasks: category.tasks.filter(task => task.id !== taskId),
            count: category.count - 1
          };
        }
        
        return category;
      })
    );
  }, []);

  // Handle edit task (for the UI)
  const handleEditTask = useCallback((taskId: string, task: TaskItem, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    
    setEditingTask(task);
    setEditDialogOpen(true);
  }, []);

  // Handle delete task (for the UI)
  const handleDeleteTask = useCallback((taskId: string, taskTitle: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    
    if (window.confirm(`Are you sure you want to delete "${taskTitle}"?`)) {
      deleteTask(taskId);
    }
  }, [deleteTask]);

  // Keyboard shortcut handler
  const getKeyboardShortcutHandler = useCallback((selectedTaskId: string | undefined) => {
    return (e: KeyboardEvent) => {
      // Alt+N to create new task
      if (e.altKey && e.key === "n") {
        e.preventDefault();
        setCreateDialogOpen(true);
      }
      
      // Alt+F to toggle filters
      if (e.altKey && e.key === "f") {
        e.preventDefault();
        // This would be handled by the parent component
      }
      
      // Alt+E to edit selected task
      if (e.altKey && e.key === "e" && selectedTaskId) {
        e.preventDefault();
        
        // Find the task across all categories
        for (const category of categories) {
          const task = category.tasks.find(t => t.id === selectedTaskId);
          if (task) {
            handleEditTask(selectedTaskId, task);
            break;
          }
        }
      }
    };
  }, [categories, handleEditTask]);

  return {
    // State
    categories,
    editDialogOpen,
    setEditDialogOpen,
    editingTask,
    setEditingTask,
    createDialogOpen,
    setCreateDialogOpen,
    
    // Actions
    toggleCategory,
    createTask,
    editTask,
    deleteTask,
    handleEditTask,
    handleDeleteTask,
    getKeyboardShortcutHandler
  };
}