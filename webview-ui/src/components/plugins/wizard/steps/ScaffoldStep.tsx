import React from "react";
import { ScaffoldProgressIndicator } from "../components/ScaffoldProgressIndicator";
import { StepProps } from "../types";
import { ScaffoldStatus, FormErrors } from "../types";

interface ScaffoldStepProps extends StepProps {
  status: ScaffoldStatus;
  scaffoldErrors: FormErrors;
}

/**
 * Scaffold step in the wizard - shows progress of plugin creation
 */
export const ScaffoldStep: React.FC<ScaffoldStepProps> = ({ 
  form,
  status,
  scaffoldErrors,
  onNext
}) => {
  return (
    <ScaffoldProgressIndicator
      status={status}
      errors={scaffoldErrors}
      pluginSlug={form.slug}
      onRetry={onNext}
    />
  );
};