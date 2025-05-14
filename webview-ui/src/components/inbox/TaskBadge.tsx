import React from "react";
import { useTranslation } from "react-i18next";
import { CheckCircle, Archive, Clock } from "lucide-react";

interface TaskBadgeProps {
  state: "active" | "completed" | "archived";
  showLabel?: boolean;
  size?: "sm" | "md";
  className?: string;
}

/**
 * TaskBadge Component
 * 
 * Displays a badge with icon and optional label for a task state
 */
const TaskBadge: React.FC<TaskBadgeProps> = ({
  state,
  showLabel = true,
  size = "md",
  className = ""
}) => {
  const { t } = useTranslation();
  
  // State-specific configuration
  const config = {
    active: {
      icon: <Clock size={size === "sm" ? 12 : 14} />,
      label: t("inbox:active"),
      className: "task-badge-active"
    },
    completed: {
      icon: <CheckCircle size={size === "sm" ? 12 : 14} />,
      label: t("inbox:completed"),
      className: "task-badge-completed"
    },
    archived: {
      icon: <Archive size={size === "sm" ? 12 : 14} />,
      label: t("inbox:archived"),
      className: "task-badge-archived"
    }
  };
  
  const stateConfig = config[state];
  
  return (
    <span 
      className={`
        task-badge
        ${stateConfig.className}
        ${size === "sm" ? "text-xs px-1" : "text-sm px-2 py-0.5"}
        ${className}
      `}
    >
      {stateConfig.icon}
      {showLabel && <span className="ml-1">{stateConfig.label}</span>}
    </span>
  );
};

export default TaskBadge;