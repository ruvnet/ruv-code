import React from "react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui";
import { Clock, Bell, Tag, Calendar } from "lucide-react";

// Custom Switch component since we don't want to add external dependencies
const CustomSwitch: React.FC<{
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  id?: string;
}> = ({ checked, onCheckedChange, id }) => (
  <div
    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors ${checked ? 'bg-vscode-button-background' : 'bg-vscode-dropdown-border'}`}
    onClick={() => onCheckedChange(!checked)}
  >
    <input
      type="checkbox"
      className="sr-only"
      checked={checked}
      onChange={() => {}}
      id={id}
    />
    <span
      className={`pointer-events-none block h-5 w-5 rounded-full bg-white shadow-lg ring-0 transition-transform ${
        checked ? 'translate-x-5' : 'translate-x-0'
      }`}
    />
  </div>
);

interface AdvancedTabProps {
  dueDate: string;
  setDueDate: (value: string) => void;
  tags: string[];
  setTags: (value: string[]) => void;
  reminders: boolean;
  setReminders: (value: boolean) => void;
  recurrence: string;
  setRecurrence: (value: string) => void;
  estimatedTime: string;
  setEstimatedTime: (value: string) => void;
}

/**
 * AdvancedTab Component
 * 
 * This component provides advanced options for task creation in the Agentic Inbox.
 * It includes options for due dates, tags, reminders, recurrence, and time estimation.
 */
const AdvancedTab: React.FC<AdvancedTabProps> = ({
  dueDate,
  setDueDate,
  tags,
  setTags,
  reminders,
  setReminders,
  recurrence,
  setRecurrence,
  estimatedTime,
  setEstimatedTime
}) => {
  return (
    <div className="space-y-4">
      {/* Due Date */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-vscode-foreground flex items-center">
          <Calendar className="w-4 h-4 mr-2" />
          Due Date
        </label>
        <Input
          type="date"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
          className="w-full"
        />
      </div>

      {/* Tags */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-vscode-foreground flex items-center">
          <Tag className="w-4 h-4 mr-2" />
          Tags
        </label>
        <Input
          value={tags.join(", ")}
          onChange={(e) => setTags(e.target.value.split(",").map(tag => tag.trim()).filter(Boolean))}
          placeholder="Enter comma-separated tags"
          className="w-full"
        />
        <p className="text-xs text-vscode-descriptionForeground">
          Enter tags separated by commas (e.g., work, urgent, feature)
        </p>
      </div>

      {/* Reminders */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bell className="w-4 h-4" />
          <label htmlFor="reminder-toggle" className="text-sm font-medium">
            Enable Reminders
          </label>
        </div>
        <CustomSwitch
          id="reminder-toggle"
          checked={reminders}
          onCheckedChange={setReminders}
        />
      </div>

      {/* Recurrence */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-vscode-foreground flex items-center">
          <span className="codicon codicon-sync mr-2"></span>
          Recurrence Pattern
        </label>
        <Select value={recurrence} onValueChange={setRecurrence}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select recurrence pattern" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">
              <div className="flex items-center">
                <span className="codicon codicon-circle-slash mr-2" />
                None
              </div>
            </SelectItem>
            <SelectItem value="daily">
              <div className="flex items-center">
                <span className="codicon codicon-calendar mr-2" />
                Daily
              </div>
            </SelectItem>
            <SelectItem value="weekly">
              <div className="flex items-center">
                <span className="codicon codicon-calendar mr-2" />
                Weekly
              </div>
            </SelectItem>
            <SelectItem value="monthly">
              <div className="flex items-center">
                <span className="codicon codicon-calendar mr-2" />
                Monthly
              </div>
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Time Estimation */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-vscode-foreground flex items-center">
          <Clock className="w-4 h-4 mr-2" />
          Estimated Time
        </label>
        <Select value={estimatedTime} onValueChange={setEstimatedTime}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select estimated time" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="quick">
              <div className="flex items-center">
                <span className="codicon codicon-clock mr-2" />
                Quick (&lt; 30 min)
              </div>
            </SelectItem>
            <SelectItem value="medium">
              <div className="flex items-center">
                <span className="codicon codicon-clock mr-2" />
                Medium (30-60 min)
              </div>
            </SelectItem>
            <SelectItem value="long">
              <div className="flex items-center">
                <span className="codicon codicon-clock mr-2" />
                Long (1-2 hrs)
              </div>
            </SelectItem>
            <SelectItem value="project">
              <div className="flex items-center">
                <span className="codicon codicon-clock mr-2" />
                Project (&gt; 2 hrs)
              </div>
            </SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
};

export default AdvancedTab;