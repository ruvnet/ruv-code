import React from "react";
import { useTranslation } from "react-i18next";
import { Search } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui";
import PriorityBadge from "./PriorityBadge";

interface FilterBarProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  filterPriority: 'all' | 'high' | 'medium' | 'low';
  setFilterPriority: (priority: 'all' | 'high' | 'medium' | 'low') => void;
}

/**
 * FilterBar Component
 * 
 * Provides search and filter controls for tasks
 */
const FilterBar: React.FC<FilterBarProps> = ({
  searchQuery,
  setSearchQuery,
  filterPriority,
  setFilterPriority
}) => {
  const { t } = useTranslation();

  return (
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
  );
};

export default FilterBar;