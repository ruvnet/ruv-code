import React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Download,
  Info,
  Star,
  Check
} from "lucide-react";
import { RegistryPlugin } from "./DetailedPluginView";

interface PluginCardProps {
  plugin: RegistryPlugin;
  onInstall: (plugin: RegistryPlugin) => void;
  onViewDetails: (plugin: RegistryPlugin) => void;
  isInstalling: boolean;
  isInstallSuccess: boolean;
}

export const PluginCard: React.FC<PluginCardProps> = ({
  plugin,
  onInstall,
  onViewDetails,
  isInstalling,
  isInstallSuccess
}) => {
  return (
    <div 
      key={plugin.id} 
      className="bg-vscode-editor-background rounded-lg shadow-sm p-4 mb-4 border border-vscode-panelBorder transition-all duration-200 hover:shadow-md relative overflow-hidden"
    >
      {/* Category badge */}
      <Badge 
        variant="secondary" 
        className="absolute top-0 right-0 rounded-bl-md rounded-tr-md text-xs"
      >
        {plugin.category}
      </Badge>

      <div className="flex flex-col">
        <div className="flex justify-between items-start mb-2 pt-1">
          <h3 className="text-vscode-foreground font-semibold text-lg">{plugin.name}</h3>
        </div>
        
        <div className="flex items-center text-xs text-vscode-descriptionForeground mb-2 gap-3">
          <span className="flex items-center">
            <Star size={12} className="mr-1" />
            {plugin.stars}
          </span>
          <span className="flex items-center">
            <Download size={12} className="mr-1" />
            {plugin.downloads}
          </span>
          <span>by {plugin.author}</span>
        </div>
        
        <p className="text-vscode-descriptionForeground text-sm mt-1 mb-3 line-clamp-2">
          {plugin.description}
        </p>
        
        <div className="flex flex-wrap mt-auto pt-2 gap-2">
          <Button
            variant="default"
            size="sm"
            className={`flex items-center transition-all duration-300 ${isInstallSuccess ? 'bg-green-600' : ''}`}
            onClick={() => onInstall(plugin)}
            disabled={isInstalling}
          >
            {isInstalling ? (
              <div className="w-4 h-4 border-2 border-t-transparent border-white rounded-full animate-spin mr-1" />
            ) : isInstallSuccess ? (
              <Check size={16} className="mr-1" />
            ) : (
              <Download size={14} className="mr-1" />
            )}
            {isInstallSuccess ? 'Installed' : 'Install'}
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="flex items-center"
            onClick={() => onViewDetails(plugin)}
          >
            <Info size={14} className="mr-1" />
            View Details
          </Button>
        </div>
      </div>
    </div>
  );
};

export default PluginCard;