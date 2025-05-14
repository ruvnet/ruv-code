import * as React from "react";

interface SwitchProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  id?: string;
  className?: string;
}

const Switch: React.FC<SwitchProps> = ({ 
  checked, 
  onCheckedChange,
  id,
  className = "" 
}) => {
  return (
    <div 
      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-vscode-focusBorder focus-visible:ring-offset-2 ${checked ? 'bg-vscode-button-background' : 'bg-vscode-dropdown-border'} ${className}`}
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
};

export { Switch };