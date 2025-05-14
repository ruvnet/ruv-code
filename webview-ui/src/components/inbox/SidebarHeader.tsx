import React from "react";
import { useTranslation } from "react-i18next";
import { PlusCircle, Filter } from "lucide-react";
import { Button } from "@/components/ui";

interface SidebarHeaderProps {
  showFilters: boolean;
  setShowFilters: (show: boolean) => void;
  setCreateDialogOpen: (open: boolean) => void;
}

/**
 * SidebarHeader Component
 * 
 * Header section for the inbox sidebar with title and action buttons
 */
const SidebarHeader: React.FC<SidebarHeaderProps> = ({
  showFilters,
  setShowFilters,
  setCreateDialogOpen
}) => {
  const { t } = useTranslation();

  return (
    <div className="p-3 border-b border-vscode-panel-border flex justify-between items-center">
      <h2 className="text-md font-medium text-vscode-sideBarTitle-foreground flex items-center">
        <span className="codicon codicon-inbox mr-2"></span>
        {t("common:ui.inbox")}
      </h2>
      <div className="flex space-x-1">
        <Button
          variant="ghost"
          size="icon"
          className="w-6 h-6"
          onClick={() => setShowFilters(!showFilters)}
          title={t("inbox:filter") + " (Alt+F)"}
        >
          <Filter size={14} className={showFilters ? "text-vscode-button-foreground" : ""} />
        </Button>
        <Button
          variant="ghost" 
          size="icon"
          className="w-6 h-6"
          onClick={() => setCreateDialogOpen(true)}
          title={t("inbox:createTask") + " (Alt+N)"}
        >
          <PlusCircle size={14} />
        </Button>
      </div>
    </div>
  );
};

export default SidebarHeader;