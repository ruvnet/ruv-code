import React, { useEffect, useState } from "react";
import { TaskState } from "./InboxSidebar";

interface TaskStateTransitionProps {
  taskState: TaskState;
  children: React.ReactNode;
  className?: string;
}

/**
 * TaskStateTransition Component
 * 
 * This component adds smooth CSS animations when a task changes state.
 * It wraps child components with appropriate transition classes based on the task state.
 * 
 * @param taskState The current state of the task
 * @param children The child components to animate
 * @param className Additional CSS classes to apply
 */
const TaskStateTransition: React.FC<TaskStateTransitionProps> = ({
  taskState,
  children,
  className = "",
}) => {
  // Keep track of previous state to determine animation
  const [prevState, setPrevState] = useState<TaskState>(taskState);
  const [isAnimating, setIsAnimating] = useState(false);
  const [transitionClass, setTransitionClass] = useState("");
  
  useEffect(() => {
    // Only animate if the state changes
    if (prevState !== taskState) {
      // Set the appropriate transition class based on state change
      if (prevState === "active" && taskState === "completed") {
        setTransitionClass("task-transition-to-completed");
      } else if (prevState === "active" && taskState === "archived") {
        setTransitionClass("task-transition-to-archived");
      } else if (taskState === "active") {
        setTransitionClass("task-transition-to-active");
      } else {
        setTransitionClass("task-transition-default");
      }
      
      setIsAnimating(true);
      setPrevState(taskState);
      
      // Reset animating flag after animation completes
      const timer = setTimeout(() => {
        setIsAnimating(false);
        setTransitionClass("");
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [taskState, prevState]);

  return (
    <div 
      className={`
        transition-all duration-300
        ${className}
        ${isAnimating ? transitionClass : ""}
        ${taskState === "completed" ? "task-completed" : ""}
        ${taskState === "archived" ? "task-archived" : ""}
      `}
    >
      {children}
    </div>
  );
};

export default TaskStateTransition;