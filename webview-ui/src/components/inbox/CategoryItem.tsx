import React from "react";
import { ChevronDown, ChevronRight } from "lucide-react";

import TaskBadge from "./TaskBadge";
import { CategoryItemProps } from "./types";

/**
 * CategoryItem Component
 * 
 * Renders a collapsible category header with count and indicator
 */
const CategoryItem: React.FC<CategoryItemProps> = ({
  category,
  toggleCategory
}) => {
  // We don't need translation here as category names come pre-translated
  // const { t } = useTranslation();

  return (
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
          state={category.id as any} 
          showLabel={false}
          size="sm"
        />
        {category.name}
      </span>
      <span className="ml-2 text-xs px-1.5 py-0.5 rounded-full bg-vscode-badge-background text-vscode-badge-foreground">
        {category.filteredTasks.length}
      </span>
    </div>
  );
};

export default CategoryItem;