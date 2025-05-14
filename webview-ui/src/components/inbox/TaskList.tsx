import React from "react";
import { useTranslation } from "react-i18next";

import TaskItem from "./TaskItem";
import { TaskListProps } from "./types";

/**
 * TaskList Component
 *
 * Renders a list of tasks for a specific category,
 * handling empty states and rendering individual task items
 */
const TaskList: React.FC<TaskListProps> = ({
  category,
  selectedTaskId,
  onSelectTask,
  onEditTask,
  onDeleteTask
}) => {
  const { t } = useTranslation();

  // If there are no tasks to display after filtering
  if (category.filteredTasks.length === 0) {
    return (
      <div className="text-sm text-vscode-descriptionForeground py-1 px-2">
        {t("inbox:noTasksMatch")}
      </div>
    );
  }

  // Render task list
  return (
    <div className="space-y-1">
      {category.filteredTasks.map((task) => (
        <TaskItem
          key={task.id}
          task={task}
          isSelected={selectedTaskId === task.id}
          onSelectTask={onSelectTask}
          onEditTask={onEditTask}
          onDeleteTask={onDeleteTask}
        />
      ))}
    </div>
  );
};

export default TaskList;