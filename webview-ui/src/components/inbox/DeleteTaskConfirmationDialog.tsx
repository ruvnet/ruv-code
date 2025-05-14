import React from "react"
import { useTranslation } from "react-i18next"

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  Button
} from "@/components/ui"
import { vscode } from "@/utils/vscode"

/**
 * DeleteTaskConfirmationDialog Component
 * 
 * This dialog prompts users to confirm deletion of a task.
 * It displays a warning message and provides cancel/confirm buttons.
 */
interface DeleteTaskConfirmationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  taskId: string;
  taskTitle: string;
}

const DeleteTaskConfirmationDialog: React.FC<DeleteTaskConfirmationDialogProps> = ({
  open,
  onOpenChange,
  taskId,
  taskTitle
}) => {
  const { t } = useTranslation();

  const handleDelete = () => {
    // Send delete message to extension
    vscode.postMessage({ 
      type: "deleteTaskWithId", 
      text: taskId 
    });
    
    // Close the dialog
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle>{t("inbox:deleteTask")}</DialogTitle>
          <DialogDescription className="text-vscode-descriptionForeground">
            {t("inbox:deleteTaskConfirmation")}
          </DialogDescription>
        </DialogHeader>
        
        <div className="py-4">
          <div className="bg-vscode-panel-background p-3 rounded-sm border border-vscode-panel-border">
            <p className="text-sm font-medium break-words">{taskTitle}</p>
          </div>
        </div>
        
        <DialogFooter className="flex gap-2">
          <Button 
            variant="secondary" 
            onClick={() => onOpenChange(false)}
          >
            {t("inbox:cancel")}
          </Button>
          <Button 
            variant="default"
            className="bg-vscode-errorForeground hover:bg-vscode-errorForeground/90" 
            onClick={handleDelete}
          >
            {t("inbox:confirmDelete")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default DeleteTaskConfirmationDialog;