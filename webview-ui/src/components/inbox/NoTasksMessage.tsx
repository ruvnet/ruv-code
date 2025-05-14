import React from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui";

interface NoTasksMessageProps {
  resetFilters: () => void;
}

/**
 * NoTasksMessage Component
 * 
 * Displays a message when no tasks match the current filters
 */
const NoTasksMessage: React.FC<NoTasksMessageProps> = ({
  resetFilters
}) => {
  const { t } = useTranslation();

  return (
    <div className="p-4 text-center text-vscode-descriptionForeground">
      <div className="text-2xl mb-2">🔍</div>
      <div>{t("inbox:noTasksMatchFilter")}</div>
      <Button 
        variant="secondary" 
        size="sm" 
        className="mt-2"
        onClick={resetFilters}
      >
        {t("inbox:clearFilters")}
      </Button>
    </div>
  );
};

export default NoTasksMessage;