import React from "react";
import { WizardStep } from "../types";

interface WizardStepIndicatorProps {
  currentStep: WizardStep;
}

/**
 * Component that displays the current step and progress in the wizard
 */
export const WizardStepIndicator: React.FC<WizardStepIndicatorProps> = ({ currentStep }) => {
  // Steps in order
  const steps: WizardStep[] = ['basic', 'configuration', 'advanced', 'scaffold', 'complete'];
  
  // Get current step index
  const currentIndex = steps.indexOf(currentStep);
  
  // Step name mapping
  const stepNames: Record<WizardStep, string> = {
    basic: "Basic Info",
    configuration: "Configuration",
    advanced: "Advanced Options",
    scaffold: "Create Plugin",
    complete: "Complete"
  };
  
  // Progress percentage calculation
  const progressPercentage = ((currentIndex + 1) / steps.length) * 100;
  
  return (
    <div className="mb-3">
      {/* Current step indicator */}
      <div className="flex items-center justify-between mb-3 border-b border-vscode-panelBorder pb-3">
        <div className="flex items-center">
          <div 
            className="flex items-center justify-center h-8 w-8 rounded-full text-sm font-medium bg-vscode-button-background text-vscode-foreground mr-3"
          >
            {currentIndex + 1}
          </div>
          <div className="font-medium">
            {stepNames[currentStep]}
          </div>
        </div>
        <div className="text-sm text-vscode-descriptionForeground">
          Step {currentIndex + 1} of {steps.length}
        </div>
      </div>
      
      {/* Progress bar */}
      <div className="w-full bg-vscode-editor-background h-1 mb-6">
        <div
          className="h-1 bg-vscode-button-background transition-all duration-300"
          style={{ width: `${progressPercentage}%` }}
        ></div>
      </div>
    </div>
  );
};