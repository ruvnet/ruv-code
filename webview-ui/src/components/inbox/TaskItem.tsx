import React from "react";
import { Edit2, Trash2, MoreHorizontal } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";
import TaskBadge from "./TaskBadge";
import PriorityBadge from "./PriorityBadge";
import TaskStateTransition from "./TaskStateTransition";
import { TaskItemProps } from "./types";

/**
 * TaskItem Component
 * 
 * Renders an individual task item with status indicators and action buttons
 */
const TaskItem: React.FC<TaskItemProps> = ({
  task,
  isSelected,
  onSelectTask,
  onEditTask,
  onDeleteTask
}) => {
  const { t } = useTranslation();

  return (
    <TaskStateTransition
      taskState={task.state}
      className="transition-all duration-200"
    >
      <div 
        className={`
          flex items-center justify-between px-2 py-1 text-sm rounded cursor-pointer
          task-row task-row-${task.state}
          ${task.state === "completed" ? "task-completed" : ""}
          ${task.state === "archived" ? "task-archived" : ""}
          ${isSelected 
            ? 'bg-vscode-list-activeSelectionBackground text-vscode-list-activeSelectionForeground' 
            : 'hover:bg-vscode-list-hoverBackground'
          }
        `}
        onClick={() => onSelectTask(task.id)}
      >
        <div className="flex items-center truncate overflow-hidden flex-grow">
          <PriorityBadge 
            priority={task.priority}
            showLabel={false}
            size="sm"
            className="mr-2 flex-shrink-0"
          />
          <span className={`truncate ${task.state === "completed" ? "line-through" : ""}`}>
            {task.title}
          </span>
          <TaskBadge
            state={task.state}
            showLabel={false}
            size="sm"
            className="ml-2 flex-shrink-0"
          />
        </div>
        
        {/* Action menu, visible on hover or selection */}
        <div className={`transition-opacity duration-200 ${
          isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
        }`}>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="w-5 h-5"
                title={t("inbox:taskOptions")}
                onClick={(e) => e.stopPropagation()}
              >
                <MoreHorizontal size={12} />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" side="right">
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  onEditTask(task.id, task, e as unknown as React.MouseEvent);
                }}
              >
                <Edit2 size={14} />
                {t("inbox:editTask")}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteTask(task.id, task.title, e as unknown as React.MouseEvent);
                }}
                className="text-vscode-errorForeground"
              >
                <Trash2 size={14} />
                {t("inbox:deleteTask")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </TaskStateTransition>
  );
};

export default TaskItem;