import { useState, useMemo } from "react";
import { TaskCategory, FilteredTaskCategory } from "./types";

/**
 * Custom hook for managing task filters
 * 
 * This hook handles:
 * - Search filtering
 * - Priority filtering
 * - Category expansion
 * - Filter UI visibility
 */
export function useTaskFilter(categories: TaskCategory[]) {
  // Filter display state
  const [showFilters, setShowFilters] = useState(false);
  
  // Search filter
  const [searchQuery, setSearchQuery] = useState("");
  
  // Priority filter
  const [filterPriority, setFilterPriority] = useState<"all" | "high" | "medium" | "low">("all");
  
  // Filter tasks based on search and priority
  const filteredCategories = useMemo(() => {
    return categories.map((category) => {
      // Filter tasks in this category
      const filteredTasks = category.tasks.filter((task) => {
        // Filter by search query (if exists)
        const matchesSearch = searchQuery.trim() === '' || 
          task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (task.description && task.description.toLowerCase().includes(searchQuery.toLowerCase()));
        
        // Filter by priority (if not 'all')
        const matchesPriority = filterPriority === "all" || task.priority === filterPriority;
        
        // Task matches if it passes both filters
        return matchesSearch && matchesPriority;
      });
      
      // Return category with filtered tasks
      return {
        ...category,
        filteredTasks
      } as FilteredTaskCategory;
    });
  }, [categories, searchQuery, filterPriority]);

  // Check if any category has filtered tasks
  const noFilteredTasks = useMemo(() => {
    return filteredCategories.every(cat => cat.filteredTasks.length === 0);
  }, [filteredCategories]);

  // Reset all filters
  const resetFilters = () => {
    setSearchQuery("");
    setFilterPriority("all");
  };

  return {
    // Filter UI state
    showFilters,
    setShowFilters,
    
    // Search filter
    searchQuery, 
    setSearchQuery,
    
    // Priority filter
    filterPriority,
    setFilterPriority,
    
    // Filtered data
    filteredCategories,
    noFilteredTasks,
    
    // Actions
    resetFilters
  };
}