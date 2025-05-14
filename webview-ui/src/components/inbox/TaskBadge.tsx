import React from "react";
import { Play, Check, Archive } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { TaskState } from "./InboxSidebar";

interface TaskBadgeProps {
  state: TaskState;
  showLabel?: boolean;
  className?: string;
  size?: "sm" | "md" | "lg";
}

/**
 * TaskBadge Component
 * 
 * This component displays a visual indicator for a task's state.
 * It shows an appropriate icon and/or label with styling that corresponds to the task state.
 * 
 * @param state The current state of the task (active, completed, archived)
 * @param showLabel Whether to show the text label alongside the icon
 * @param className Additional CSS classes to apply
 * @param size The size variant of the badge
 */
const TaskBadge: React.FC<TaskBadgeProps> = ({ 
  state, 
  showLabel = true, 
  className = "",
  size = "md"
}) => {
  const { t } = useTranslation();
  
  // State-specific styles
  const stateStyles = {
    active: {
      icon: <Play size={size === "sm" ? 12 : size === "lg" ? 16 : 14} />,
      color: "text-vscode-charts-blue",
      bgColor: "bg-vscode-charts-blue/10",
      borderColor: "border-vscode-charts-blue/30",
      label: t("inbox:categories.active")
    },
    completed: {
      icon: <Check size={size === "sm" ? 12 : size === "lg" ? 16 : 14} />,
      color: "text-vscode-charts-green",
      bgColor: "bg-vscode-charts-green/10",
      borderColor: "border-vscode-charts-green/30",
      label: t("inbox:categories.completed")
    },
    archived: {
      icon: <Archive size={size === "sm" ? 12 : size === "lg" ? 16 : 14} />,
      color: "text-vscode-descriptionForeground",
      bgColor: "bg-vscode-descriptionForeground/10",
      borderColor: "border-vscode-descriptionForeground/30",
      label: t("inbox:categories.archived")
    }
  };
  
  const currentStyle = stateStyles[state];
  
  return (
    <Badge 
      className={cn(
        "border px-2 py-0.5 transition-all duration-200",
        currentStyle.bgColor,
        currentStyle.color,
        currentStyle.borderColor,
        size === "sm" ? "text-xs" : size === "lg" ? "text-sm px-3 py-1" : "text-xs",
        className
      )}
      variant="outline"
    >
      <span className="flex items-center space-x-1">
        <span className={currentStyle.color}>{currentStyle.icon}</span>
        {showLabel && <span>{currentStyle.label}</span>}
      </span>
    </Badge>
  );
};

export default TaskBadge;