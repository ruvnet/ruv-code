import React from "react"
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Star,
  Download,
  Check,
  Github
} from "lucide-react"

// Interface for registry plugin data
export interface RegistryPlugin {
  id: string;
  name: string;
  description: string;
  author: string;
  stars: number;
  downloads: number;
  category: string;
  package: string;
  // Added fields for detailed plugin view
  version?: string;
  license?: string;
  repository?: string;
  dependencies?: string[];
  documentation?: string;
  created?: string;
  updated?: string;
  featuredRank?: number; // Lower number means higher featured ranking
  installCommand?: string;
}

interface DetailedPluginViewProps {
  plugin: RegistryPlugin | null;
  isOpen: boolean;
  onClose: () => void;
  onInstall: (plugin: RegistryPlugin) => void;
  isInstalling: boolean;
  isInstallSuccess: boolean;
}

export const DetailedPluginView: React.FC<DetailedPluginViewProps> = ({
  plugin,
  isOpen,
  onClose,
  onInstall,
  isInstalling,
  isInstallSuccess
}) => {
  if (!plugin) return null;
  
  // Format date string
  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "N/A";
    
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric"
      });
    } catch (e) {
      return dateStr;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl flex items-center gap-2">
            {plugin.name}
            <Badge variant="secondary" className="ml-2">v{plugin.version}</Badge>
          </DialogTitle>
          <DialogDescription className="text-sm">
            by {plugin.author} • {formatDate(plugin.updated)}
          </DialogDescription>
        </DialogHeader>
        
        <div className="mt-4 flex flex-col gap-4">
          {/* Stats and metadata */}
          <div className="flex flex-wrap gap-4 text-sm">
            <div className="flex items-center">
              <Star size={14} className="mr-1" />
              <span className="text-vscode-foreground">{plugin.stars} stars</span>
            </div>
            <div className="flex items-center">
              <Download size={14} className="mr-1" />
              <span className="text-vscode-foreground">{plugin.downloads} downloads</span>
            </div>
            <div className="flex items-center">
              <Badge variant="outline">{plugin.category}</Badge>
            </div>
            {plugin.license && (
              <div className="flex items-center">
                <Badge variant="outline">{plugin.license}</Badge>
              </div>
            )}
          </div>
          
          {/* Description */}
          <div className="mt-2">
            <h3 className="text-sm font-semibold mb-1">Description</h3>
            <p className="text-vscode-descriptionForeground text-sm">
              {plugin.description}
            </p>
          </div>
          
          {/* Documentation */}
          {plugin.documentation && (
            <div className="mt-2">
              <h3 className="text-sm font-semibold mb-1">Documentation</h3>
              <p className="text-vscode-descriptionForeground text-sm">
                {plugin.documentation}
              </p>
            </div>
          )}
          
          {/* Installation command */}
          {plugin.installCommand && (
            <div className="mt-2">
              <h3 className="text-sm font-semibold mb-1">Installation Command</h3>
              <div className="bg-vscode-editor-background p-2 rounded-md font-mono text-xs overflow-x-auto">
                {plugin.installCommand}
              </div>
            </div>
          )}
          
          {/* Dependencies */}
          {plugin.dependencies && plugin.dependencies.length > 0 && (
            <div className="mt-2">
              <h3 className="text-sm font-semibold mb-1">Dependencies</h3>
              <div className="flex flex-wrap gap-2">
                {plugin.dependencies.map(dep => (
                  <Badge key={dep} variant="outline" className="text-xs">{dep}</Badge>
                ))}
              </div>
            </div>
          )}
          
          {/* Repository link */}
          {plugin.repository && (
            <div className="mt-2">
              <h3 className="text-sm font-semibold mb-1">Repository</h3>
              <a 
                href={plugin.repository}
                target="_blank"
                rel="noopener noreferrer"
                className="text-vscode-link text-sm flex items-center"
              >
                <Github size={14} className="mr-1" />
                {plugin.repository.replace('https://github.com/', '')}
              </a>
            </div>
          )}
          
          {/* Package info */}
          <div className="mt-2">
            <h3 className="text-sm font-semibold mb-1">Package Information</h3>
            <div className="text-sm text-vscode-descriptionForeground">
              <p>Package: {plugin.package}</p>
              <p>Version: {plugin.version || 'Unknown'}</p>
              <p>Created: {formatDate(plugin.created)}</p>
              <p>Updated: {formatDate(plugin.updated)}</p>
            </div>
          </div>
        </div>
        
        <DialogFooter className="mt-4 flex gap-2">
          <Button
            variant="outline"
            onClick={onClose}
          >
            Close
          </Button>
          <Button
            variant="default"
            className={`flex items-center ${isInstallSuccess ? 'bg-green-600' : ''}`}
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
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default DetailedPluginView;