import React from "react";
import { useTranslation } from "react-i18next";
import { PlusCircle } from "lucide-react";
import { Button } from "@/components/ui";

interface SidebarFooterProps {
  setCreateDialogOpen: (open: boolean) => void;
}

/**
 * SidebarFooter Component
 * 
 * Footer section for the inbox sidebar with action buttons
 */
const SidebarFooter: React.FC<SidebarFooterProps> = ({
  setCreateDialogOpen
}) => {
  const { t } = useTranslation();

  return (
    <div className="p-2 border-t border-vscode-panel-border">
      <Button
        variant="secondary"
        size="sm"
        className="w-full flex items-center justify-center"
        onClick={() => setCreateDialogOpen(true)}
      >
        <PlusCircle size={14} className="mr-1" />
        {t("inbox:createNewTask")}
        <span className="ml-auto kbd-shortcut">Alt+N</span>
      </Button>
    </div>
  );
};

export default SidebarFooter;