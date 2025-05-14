import React, { useState, useEffect } from "react";
import { TaskState } from "./types";

interface TaskStateTransitionProps {
  taskState: TaskState;
  children: React.ReactNode;
  className?: string;
}

/**
 * TaskStateTransition Component
 * 
 * Provides animated transitions between task states
 */
const TaskStateTransition: React.FC<TaskStateTransitionProps> = ({
  taskState,
  children,
  className = ""
}) => {
  const [animationState, setAnimationState] = useState<
    "entering" | "entered" | "exiting" | "exited"
  >("entered");
  
  const [prevState, setPrevState] = useState<TaskState>(taskState);
  
  // Handle state changes with animations
  useEffect(() => {
    if (taskState !== prevState) {
      // Exit animation
      setAnimationState("exiting");
      
      // After exit animation, update state and start enter animation
      const timer = setTimeout(() => {
        setPrevState(taskState);
        setAnimationState("entering");
        
        // After enter animation starts, mark as entered
        const enterTimer = setTimeout(() => {
          setAnimationState("entered");
        }, 300); // Match the CSS transition duration
        
        return () => clearTimeout(enterTimer);
      }, 300); // Match the CSS transition duration
      
      return () => clearTimeout(timer);
    }
  }, [taskState, prevState]);
  
  return (
    <div
      className={`
        task-state-transition
        task-${animationState}
        ${className}
      `}
    >
      {children}
    </div>
  );
};

export default TaskStateTransition;