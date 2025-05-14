import React from "react";
import { useTranslation } from "react-i18next";
import { Keyboard } from "lucide-react";

import { Button } from "@/components/ui";

/**
 * KeyboardShortcutsGuide Component
 * 
 * This component displays a comprehensive guide of keyboard shortcuts
 * available in the Agentic Inbox, helping users navigate and operate efficiently.
 * 
 * It includes shortcuts for task state management, navigation, and common actions.
 */
const KeyboardShortcutsGuide: React.FC<{
  isOpen: boolean;
  onClose: () => void;
}> = ({ isOpen, onClose }) => {
  const { t } = useTranslation();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
      <div className="bg-vscode-editor-background border border-vscode-panel-border rounded-md shadow-md p-4 max-w-md w-full">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-vscode-foreground font-medium flex items-center">
            <Keyboard size={18} className="mr-2" />
            {t("inbox:shortcuts.title")}
          </h2>
          <Button 
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-6 w-6"
          >
            <span className="codicon codicon-close" />
          </Button>
        </div>
        
        <div className="grid grid-cols-1 gap-4">
          <div>
            <h3 className="text-sm font-semibold mb-2 border-b border-vscode-panel-border pb-1">
              {t("inbox:categories.active")}
            </h3>
            <div className="grid grid-cols-2 gap-2">
              <div className="flex items-center">
                <span className="kbd-shortcut">Alt+A</span>
                <span className="ml-2 text-sm">{t("inbox:shortcuts.active")}</span>
              </div>
              <div className="flex items-center">
                <span className="kbd-shortcut">Alt+C</span>
                <span className="ml-2 text-sm">{t("inbox:shortcuts.completed")}</span>
              </div>
              <div className="flex items-center">
                <span className="kbd-shortcut">Alt+R</span>
                <span className="ml-2 text-sm">{t("inbox:shortcuts.archived")}</span>
              </div>
              <div className="flex items-center">
                <span className="kbd-shortcut">Alt+P</span>
                <span className="ml-2 text-sm">{t("inbox:shortcuts.process")}</span>
              </div>
            </div>
          </div>
          
          <div>
            <h3 className="text-sm font-semibold mb-2 border-b border-vscode-panel-border pb-1">
              {t("inbox:createTask")}
            </h3>
            <div className="grid grid-cols-2 gap-2">
              <div className="flex items-center">
                <span className="kbd-shortcut">Alt+N</span>
                <span className="ml-2 text-sm">{t("inbox:shortcuts.createTask")}</span>
              </div>
              <div className="flex items-center">
                <span className="kbd-shortcut">Alt+E</span>
                <span className="ml-2 text-sm">{t("inbox:shortcuts.edit")}</span>
              </div>
              <div className="flex items-center">
                <span className="kbd-shortcut">Alt+D</span>
                <span className="ml-2 text-sm">{t("inbox:shortcuts.delete")}</span>
              </div>
              <div className="flex items-center">
                <span className="kbd-shortcut">Alt+B</span>
                <span className="ml-2 text-sm">{t("inbox:shortcuts.toggleSidebar")}</span>
              </div>
            </div>
          </div>
          
          <div>
            <h3 className="text-sm font-semibold mb-2 border-b border-vscode-panel-border pb-1">
              {t("inbox:filter")}
            </h3>
            <div className="grid grid-cols-2 gap-2">
              <div className="flex items-center">
                <span className="kbd-shortcut">Alt+F</span>
                <span className="ml-2 text-sm">{t("inbox:shortcuts.filter")}</span>
              </div>
              <div className="flex items-center">
                <span className="kbd-shortcut">Esc</span>
                <span className="ml-2 text-sm">{t("inbox:cancel")}</span>
              </div>
            </div>
          </div>
        </div>
        
        <div className="mt-4 text-xs text-vscode-descriptionForeground border-t border-vscode-panel-border pt-2">
          <p>{t("inbox:shortcuts.tip", "Tip: Press Alt+B at any time to view a condensed list of shortcuts.")}</p>
        </div>
      </div>
    </div>
  );
};

export default KeyboardShortcutsGuide;