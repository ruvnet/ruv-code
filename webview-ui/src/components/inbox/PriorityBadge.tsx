import React from "react";
import { useTranslation } from "react-i18next";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type PriorityLevel = "high" | "medium" | "low";

interface PriorityBadgeProps {
  priority: PriorityLevel;
  showLabel?: boolean;
  className?: string;
  size?: "sm" | "md" | "lg";
}

/**
 * PriorityBadge Component
 * 
 * This component displays a visual indicator for a task's priority level.
 * It uses color-coded badges with optional labels to represent priority levels.
 * 
 * @param priority The priority level of the task (high, medium, low)
 * @param showLabel Whether to show the text label alongside the indicator
 * @param className Additional CSS classes to apply
 * @param size The size variant of the badge
 */
const PriorityBadge: React.FC<PriorityBadgeProps> = ({ 
  priority, 
  showLabel = true, 
  className = "",
  size = "md"
}) => {
  const { t } = useTranslation();
  
  // Priority-specific styles
  const priorityStyles = {
    high: {
      dotColor: "bg-vscode-errorForeground",
      textColor: "text-vscode-errorForeground",
      bgColor: "bg-vscode-errorForeground/10",
      borderColor: "border-vscode-errorForeground/30",
      label: t("inbox:priorityHigh")
    },
    medium: {
      dotColor: "bg-vscode-editorWarning-foreground",
      textColor: "text-vscode-editorWarning-foreground",
      bgColor: "bg-vscode-editorWarning-foreground/10",
      borderColor: "border-vscode-editorWarning-foreground/30",
      label: t("inbox:priorityMedium")
    },
    low: {
      dotColor: "bg-vscode-charts-green",
      textColor: "text-vscode-charts-green",
      bgColor: "bg-vscode-charts-green/10",
      borderColor: "border-vscode-charts-green/30",
      label: t("inbox:priorityLow")
    }
  };
  
  const currentStyle = priorityStyles[priority];
  
  return (
    <Badge 
      className={cn(
        "border px-2 py-0.5 transition-all duration-200",
        currentStyle.bgColor,
        currentStyle.textColor,
        currentStyle.borderColor,
        size === "sm" ? "text-xs" : size === "lg" ? "text-sm px-3 py-1" : "text-xs",
        className
      )}
      variant="outline"
    >
      <span className="flex items-center space-x-1">
        <span className={`w-2 h-2 rounded-full ${currentStyle.dotColor}`}></span>
        {showLabel && <span>{currentStyle.label}</span>}
      </span>
    </Badge>
  );
};

export default PriorityBadge;