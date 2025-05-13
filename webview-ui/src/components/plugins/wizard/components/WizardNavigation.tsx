import React from "react";
import { ChevronLeft, ChevronRight, RefreshCw, FileCode } from "lucide-react";
import { Button } from "@/components/ui/button";
import { WizardStep } from "../types";

interface WizardNavigationProps {
  currentStep: WizardStep;
  isLoading: boolean;
  timeoutError: boolean;
  onNext: () => void;
  onPrev: () => void;
  onClose: () => void;
}

/**
 * Component for wizard navigation buttons
 */
export const WizardNavigation: React.FC<WizardNavigationProps> = ({
  currentStep,
  isLoading,
  timeoutError,
  onNext,
  onPrev,
  onClose
}) => {
  if (currentStep === 'complete') {
    return null;
  }
  
  return (
    <div className="flex flex-col sm:flex-row justify-between gap-3">
      <Button
        variant="outline"
        onClick={currentStep === 'basic' ? onClose : onPrev}
        disabled={currentStep === 'scaffold' && isLoading}
      >
        {currentStep === 'basic' ? "Cancel" : (
          <>
            <ChevronLeft size={16} className="mr-1" />
            Back
          </>
        )}
      </Button>
      
      <Button 
        onClick={onNext}
        className="flex items-center"
        disabled={(currentStep === 'scaffold' && isLoading)}
      >
        {currentStep === 'scaffold' ? (
          isLoading ? (
            <>
              <div className="w-4 h-4 border-2 border-t-transparent border-white rounded-full animate-spin mr-1" />
              Creating...
            </>
          ) : timeoutError ? (
            <>
              <RefreshCw size={16} className="mr-1" />
              Retry
            </>
          ) : (
            <>
              <FileCode size={16} className="mr-1" />
              Create Now
            </>
          )
        ) : (
          <>
            Next
            <ChevronRight size={16} className="ml-1" />
          </>
        )}
      </Button>
    </div>
  );
};