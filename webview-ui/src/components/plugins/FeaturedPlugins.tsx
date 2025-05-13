import React from "react";
import { Button } from "@/components/ui/button";
import {
  ChevronRight,
  Download,
  Package,
  Star
} from "lucide-react";
import { RegistryPlugin } from "./DetailedPluginView";

interface FeaturedPluginsProps {
  plugins: RegistryPlugin[];
  onPluginClick: (plugin: RegistryPlugin) => void;
}

export const FeaturedPlugins: React.FC<FeaturedPluginsProps> = ({
  plugins,
  onPluginClick
}) => {
  if (plugins.length === 0) return null;
  
  return (
    <div className="mb-6">
      <h2 className="text-vscode-foreground font-semibold text-lg mb-3">
        Featured Plugins
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {plugins.map(plugin => (
          <div
            key={plugin.id}
            className="bg-vscode-editor-background rounded-lg shadow p-4 border border-vscode-focusBorder cursor-pointer transition-all duration-200 hover:shadow-md"
            onClick={() => onPluginClick(plugin)}
          >
            <div className="flex items-start mb-2">
              <div className="bg-vscode-button-background rounded-full p-2 mr-3">
                <Package size={18} />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-vscode-foreground font-semibold text-base truncate">{plugin.name}</h3>
                <p className="text-vscode-descriptionForeground text-xs">by {plugin.author}</p>
              </div>
            </div>
            <p className="text-vscode-descriptionForeground text-sm line-clamp-2 mb-2">
              {plugin.description}
            </p>
            <div className="flex items-center justify-between text-xs mt-auto">
              <div className="flex items-center gap-2">
                <span className="flex items-center">
                  <Star size={12} className="mr-1" />
                  {plugin.stars}
                </span>
                <span className="flex items-center">
                  <Download size={12} className="mr-1" />
                  {plugin.downloads}
                </span>
              </div>
              <Button 
                variant="ghost" 
                size="sm" 
                className="text-xs p-0 h-auto flex items-center text-vscode-focusBorder hover:text-vscode-foreground"
                onClick={(e) => {
                  e.stopPropagation();
                  onPluginClick(plugin);
                }}
              >
                Details
                <ChevronRight size={12} className="ml-1" />
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default FeaturedPlugins;