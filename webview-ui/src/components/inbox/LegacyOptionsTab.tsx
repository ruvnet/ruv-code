import React from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui";
import { Checkbox } from "@/components/ui/checkbox";

interface LegacyOptionsTabProps {
  promptTemplate: string;
  setPromptTemplate: (value: string) => void;
  executionOptions: {
    autoStart: boolean;
    notifyOnCompletion: boolean;
  };
  setExecutionOptions: (options: {
    autoStart: boolean;
    notifyOnCompletion: boolean;
  }) => void;
}

/**
 * LegacyOptionsTab Component
 * 
 * This component provides legacy options for task management in the Agentic Inbox.
 * It includes options for prompt templates and execution settings.
 */
const LegacyOptionsTab: React.FC<LegacyOptionsTabProps> = ({
  promptTemplate,
  setPromptTemplate,
  executionOptions,
  setExecutionOptions
}) => {
  return (
    <div className="space-y-4">
      <h3 className="text-sm font-medium mb-4">Legacy Options</h3>
      
      {/* Prompt selection */}
      <div className="space-y-2 mb-4">
        <label className="text-sm font-medium text-vscode-foreground">
          Prompt Template
        </label>
        <Select value={promptTemplate} onValueChange={setPromptTemplate}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select a prompt template" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">
              <div className="flex items-center">
                <span className="codicon codicon-edit mr-2" />
                Default (No Template)
              </div>
            </SelectItem>
            <SelectItem value="code-review">
              <div className="flex items-center">
                <span className="codicon codicon-code mr-2" />
                Code Review
              </div>
            </SelectItem>
            <SelectItem value="data-analysis">
              <div className="flex items-center">
                <span className="codicon codicon-graph mr-2" />
                Data Analysis
              </div>
            </SelectItem>
            <SelectItem value="document-generation">
              <div className="flex items-center">
                <span className="codicon codicon-file-text mr-2" />
                Document Generation
              </div>
            </SelectItem>
          </SelectContent>
        </Select>
      </div>
      
      {/* Execution options */}
      <div className="space-y-4">
        <label className="text-sm font-medium text-vscode-foreground">
          Execution Options
        </label>
        
        <div className="flex items-center space-x-2">
          <Checkbox
            id="auto-start"
            checked={executionOptions.autoStart}
            onCheckedChange={(checked) =>
              setExecutionOptions({...executionOptions, autoStart: checked === true})
            }
          />
          <label htmlFor="auto-start" className="text-sm cursor-pointer">
            Auto-start task after creation
          </label>
        </div>
        
        <div className="flex items-center space-x-2">
          <Checkbox
            id="notify-completion"
            checked={executionOptions.notifyOnCompletion}
            onCheckedChange={(checked) =>
              setExecutionOptions({...executionOptions, notifyOnCompletion: checked === true})
            }
          />
          <label htmlFor="notify-completion" className="text-sm cursor-pointer">
            Notify when task completes
          </label>
        </div>
      </div>
    </div>
  );
};

export default LegacyOptionsTab;