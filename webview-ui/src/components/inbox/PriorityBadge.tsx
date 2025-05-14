import React from "react";
import { useTranslation } from "react-i18next";
import { Flag } from "lucide-react";

interface PriorityBadgeProps {
  priority: "high" | "medium" | "low";
  showLabel?: boolean;
  size?: "sm" | "md";
  className?: string;
}

/**
 * PriorityBadge Component
 * 
 * Displays a badge with icon and optional label for task priority
 */
const PriorityBadge: React.FC<PriorityBadgeProps> = ({
  priority,
  showLabel = true,
  size = "md",
  className = ""
}) => {
  const { t } = useTranslation();
  
  // Priority-specific configuration
  const config = {
    high: {
      label: t("inbox:highPriority"),
      className: "priority-badge-high"
    },
    medium: {
      label: t("inbox:mediumPriority"),
      className: "priority-badge-medium"
    },
    low: {
      label: t("inbox:lowPriority"),
      className: "priority-badge-low"
    }
  };
  
  const priorityConfig = config[priority];
  
  return (
    <span 
      className={`
        priority-badge
        ${priorityConfig.className}
        ${size === "sm" ? "text-xs px-1" : "text-sm px-2 py-0.5"}
        ${className}
      `}
    >
      <Flag size={size === "sm" ? 12 : 14} />
      {showLabel && <span className="ml-1">{priorityConfig.label}</span>}
    </span>
  );
};

export default PriorityBadge;