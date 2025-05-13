# Phase 4: UI Components - Design

## Component Architecture

The UI integration for the plugin system will follow the React component architecture used in Roo Code's webview. We'll create modular, reusable components organized in a logical hierarchy:

```
plugins/
├── PluginSettings.tsx       # Main container for plugin management in settings view
├── SectionHeader.tsx        # Reusable section header component
├── InstalledPlugins.tsx     # List of installed plugins with controls
├── PluginListItem.tsx       # Individual plugin item rendering
├── PluginWizard.tsx         # Form for creating/editing plugins
├── PluginDetails.tsx        # Expanded view of plugin details
└── PluginExecution.tsx      # Display for plugin execution results
```

## Component Designs

### PluginSettings Component

This is the main container component that integrates into the Settings view:

```tsx
// PluginSettings.tsx
import React, { useState } from 'react';
import { useExtensionState } from '../../../context/ExtensionStateContext';
import { Button } from '@vscode/webview-ui-toolkit/react';
import { SectionHeader } from './SectionHeader';
import { InstalledPlugins } from './InstalledPlugins';
import { PluginWizard } from './PluginWizard';
import { useTranslation } from '../../../i18n/TranslationContext';

export const PluginSettings: React.FC = () => {
  const { plugins } = useExtensionState();
  const [showWizard, setShowWizard] = useState(false);
  const [editingPlugin, setEditingPlugin] = useState<RooPluginEntry | null>(null);
  const { t } = useTranslation();
  
  const handleAddPlugin = () => {
    setEditingPlugin(null); // Ensure not in edit mode
    setShowWizard(true);
  };
  
  const handleEditPlugin = (plugin: RooPluginEntry) => {
    setEditingPlugin(plugin);
    setShowWizard(true);
  };
  
  const handleCloseWizard = () => {
    setShowWizard(false);
    setEditingPlugin(null);
  };
  
  return (
    <div className="plugin-settings">
      <SectionHeader
        title={t('settings.plugins.title')}
        description={t('settings.plugins.description')}
      />
      
      {!showWizard ? (
        <>
          <div className="plugin-settings-actions">
            <Button onClick={handleAddPlugin}>
              {t('settings.plugins.addPlugin')}
            </Button>
          </div>
          
          <InstalledPlugins
            plugins={plugins}
            onEdit={handleEditPlugin}
          />
        </>
      ) : (
        <PluginWizard
          plugin={editingPlugin}
          onClose={handleCloseWizard}
          existingPlugins={plugins}
        />
      )}
    </div>
  );
};
```

### SectionHeader Component

A reusable component for section headers in the settings view:

```tsx
// SectionHeader.tsx
import React from 'react';

interface SectionHeaderProps {
  title: string;
  description?: string;
}

export const SectionHeader: React.FC<SectionHeaderProps> = ({ 
  title, 
  description 
}) => {
  return (
    <div className="section-header">
      <h2 className="section-title">{title}</h2>
      {description && (
        <p className="section-description">{description}</p>
      )}
    </div>
  );
};
```

### InstalledPlugins Component

This component renders the list of installed plugins:

```tsx
// InstalledPlugins.tsx
import React from 'react';
import { vscode } from '../../../utils/vscode';
import { RooPluginEntry } from '../../../shared/plugins';
import { PluginListItem } from './PluginListItem';
import { useTranslation } from '../../../i18n/TranslationContext';

interface InstalledPluginsProps {
  plugins: RooPluginEntry[];
  onEdit: (plugin: RooPluginEntry) => void;
}

export const InstalledPlugins: React.FC<InstalledPluginsProps> = ({
  plugins,
  onEdit,
}) => {
  const { t } = useTranslation();
  
  const handleTogglePlugin = (slug: string, enabled: boolean) => {
    vscode.postMessage({
      type: 'plugin-toggle',
      slug,
      enabled,
    });
  };
  
  const handleRemovePlugin = (slug: string) => {
    if (confirm(t('settings.plugins.confirmRemove'))) {
      vscode.postMessage({
        type: 'plugin-remove',
        slug,
      });
    }
  };
  
  const handleRunPlugin = (slug: string) => {
    vscode.postMessage({
      type: 'plugin-run',
      slug,
    });
  };
  
### PluginListItem Component

This component renders an individual plugin in the list:

```tsx
// PluginListItem.tsx
import React, { useState } from 'react';
import { Checkbox } from '@vscode/webview-ui-toolkit/react';
import { RooPluginEntry } from '../../../shared/plugins';
import { PluginDetails } from './PluginDetails';
import { PluginExecution } from './PluginExecution';
import { useTranslation } from '../../../i18n/TranslationContext';

interface PluginListItemProps {
  plugin: RooPluginEntry;
  onEdit: () => void;
  onRemove: () => void;
  onToggle: (enabled: boolean) => void;
  onRun: () => void;
}

export const PluginListItem: React.FC<PluginListItemProps> = ({
  plugin,
  onEdit,
  onRemove,
  onToggle,
  onRun,
}) => {
  const [expanded, setExpanded] = useState(false);
  const [showingOutput, setShowingOutput] = useState(false);
  const { t } = useTranslation();
  
  const handleToggle = (e: React.ChangeEvent<HTMLInputElement>) => {
    onToggle(e.target.checked);
  };
  
  const toggleExpanded = () => {
    setExpanded(!expanded);
    if (expanded) {
      setShowingOutput(false); // Close output when collapsing
    }
  };
  
  const handleRun = () => {
    onRun();
    setShowingOutput(true);
    setExpanded(true); // Expand to show output
  };
  
  return (
    <li className={`plugin-item ${expanded ? 'expanded' : ''}`}>
      <div className="plugin-item-header">
        <Checkbox 
          checked={plugin.enabled}
          onChange={handleToggle}
        />
        
        <div className="plugin-info" onClick={toggleExpanded}>
          <div className="plugin-name">
            {plugin.name}
            <span className="plugin-type">
              {plugin.location === 'local' ? t('settings.plugins.typeLocal') : t('settings.plugins.typeRemote')}
            </span>
          </div>
          
          <div className="plugin-description">
            {plugin.roleDefinition?.slice(0, 100) || t('settings.plugins.noDescription')}
            {(plugin.roleDefinition?.length || 0) > 100 ? '...' : ''}
          </div>
        </div>
        
        <div className="plugin-actions">
          <button
            className="codicon codicon-edit action-button"
            title={t('settings.plugins.edit')}
            onClick={onEdit}
          />
          <button
            className="codicon codicon-trash action-button"
            title={t('settings.plugins.remove')}
            onClick={onRemove}
          />
          <button
            className="codicon codicon-play action-button"
            title={t('settings.plugins.run')}
            onClick={handleRun}
            disabled={!plugin.enabled}
          />
        </div>
      </div>
      
      {expanded && (
        <div className="plugin-item-content">
          {showingOutput ? (
            <PluginExecution 
              pluginSlug={plugin.slug}
              onClose={() => setShowingOutput(false)}
            />
          ) : (
            <PluginDetails plugin={plugin} />
          )}
        </div>
      )}
    </li>
  );
};
```

### PluginDetails Component

This component shows the expanded details of a plugin:

```tsx
// PluginDetails.tsx
import React from 'react';
import { RooPluginEntry } from '../../../shared/plugins';
import { useTranslation } from '../../../i18n/TranslationContext';

interface PluginDetailsProps {
  plugin: RooPluginEntry;
}

export const PluginDetails: React.FC<PluginDetailsProps> = ({ plugin }) => {
  const { t } = useTranslation();
  
  return (
    <div className="plugin-details">
      <div className="detail-section">
        <h4>{t('settings.plugins.roleDefinition')}</h4>
        <div className="detail-content">
          {plugin.roleDefinition || t('settings.plugins.noRoleDefinition')}
        </div>
      </div>
      
      <div className="detail-section">
        <h4>{t('settings.plugins.customInstructions')}</h4>
        <div className="detail-content">
          {plugin.customInstructions || t('settings.plugins.noCustomInstructions')}
        </div>
      </div>
      
      <div className="detail-section">
        <h4>{t('settings.plugins.technicalDetails')}</h4>
        <div className="detail-content technical">
          <div>
            <strong>{t('settings.plugins.slug')}:</strong> {plugin.slug}
          </div>
          
          {plugin.location === 'remote' ? (
            <div>
              <strong>{t('settings.plugins.package')}:</strong> {plugin.package}
            </div>
          ) : (
            <div>
              <strong>{t('settings.plugins.path')}:</strong> {plugin.path}
            </div>
          )}
          
          {plugin.groups && plugin.groups.length > 0 && (
            <div>
              <strong>{t('settings.plugins.groups')}:</strong> {plugin.groups.join(', ')}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
```

### PluginExecution Component

This component displays the execution results of a plugin:

```tsx
// PluginExecution.tsx
import React, { useState, useEffect } from 'react';
import { useExtensionState } from '../../../context/ExtensionStateContext';
import { useTranslation } from '../../../i18n/TranslationContext';

interface PluginExecutionProps {
  pluginSlug: string;
  onClose: () => void;
}

export const PluginExecution: React.FC<PluginExecutionProps> = ({
  pluginSlug,
  onClose,
}) => {
  const [output, setOutput] = useState<string | null>(null);
  const [error, setError] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const { t } = useTranslation();
  
  // Listen for plugin execution results
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const message = event.data;
      
      if (message.type === 'pluginResult' && message.slug === pluginSlug) {
        setOutput(message.output);
        setError(!!message.error);
        setLoading(false);
      }
    };
    
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [pluginSlug]);
  
  const copyToClipboard = () => {
    if (output) {
      navigator.clipboard.writeText(output);
    }
  };
  
  return (
    <div className={`plugin-execution ${error ? 'error' : ''}`}>
      <div className="execution-header">
        <h4>{t('settings.plugins.executionResults')}</h4>
        <div className="execution-actions">
          {output && (
            <button
              className="codicon codicon-copy action-button"
              title={t('settings.plugins.copy')}
              onClick={copyToClipboard}
            />
          )}
          <button
            className="codicon codicon-close action-button"
            title={t('settings.plugins.close')}
            onClick={onClose}
          />
        </div>
      </div>
      
      <div className="execution-content">
        {loading ? (
          <div className="loading-spinner">
            {t('settings.plugins.executing')}...
          </div>
        ) : output ? (
          <pre className="execution-output">{output}</pre>
        ) : (
          <div className="empty-output">
            {t('settings.plugins.noOutput')}
          </div>
        )}
      </div>
    </div>
  );
};
```
### PluginWizard Component

This component provides a form for creating or editing plugins:

```tsx
// PluginWizard.tsx
import React, { useState, useEffect } from 'react';
import { Button, TextField, Dropdown, Option } from '@vscode/webview-ui-toolkit/react';
import { RooPluginEntry } from '../../../shared/plugins';
import { vscode } from '../../../utils/vscode';
import { useTranslation } from '../../../i18n/TranslationContext';

interface PluginWizardProps {
  plugin: RooPluginEntry | null; // null for add mode, plugin for edit mode
  onClose: () => void;
  existingPlugins: RooPluginEntry[];
}

export const PluginWizard: React.FC<PluginWizardProps> = ({
  plugin,
  onClose,
  existingPlugins,
}) => {
  const isEditMode = !!plugin;
  const { t } = useTranslation();
  
  // Form state
  const [name, setName] = useState(plugin?.name || '');
  const [slug, setSlug] = useState(plugin?.slug || '');
  const [location, setLocation] = useState<'local' | 'remote'>(plugin?.location || 'local');
  const [packageName, setPackageName] = useState(plugin?.package || '');
  const [path, setPath] = useState(plugin?.path || '.roo/plugins/');
  const [roleDefinition, setRoleDefinition] = useState(plugin?.roleDefinition || '');
  const [customInstructions, setCustomInstructions] = useState(plugin?.customInstructions || '');
  const [groups, setGroups] = useState<string[]>(plugin?.groups || []);
  
  // Validation state
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [autoGeneratedSlug, setAutoGeneratedSlug] = useState(!plugin); // Track if slug is auto-generated
  
  // Auto-generate slug from name when not in edit mode
  useEffect(() => {
    if (!isEditMode && autoGeneratedSlug && name) {
      const generatedSlug = name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
      setSlug(generatedSlug);
    }
  }, [name, isEditMode, autoGeneratedSlug]);
  
  // When user manually edits slug, stop auto-generating
  const handleSlugChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSlug(e.target.value);
    setAutoGeneratedSlug(false);
  };
  
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    if (!name.trim()) {
      newErrors.name = t('settings.plugins.errorNameRequired');
    }
    
    if (!slug.trim()) {
      newErrors.slug = t('settings.plugins.errorSlugRequired');
    } else if (!/^[a-z0-9-]+$/.test(slug)) {
      newErrors.slug = t('settings.plugins.errorSlugFormat');
    } else if (!isEditMode && existingPlugins.some(p => p.slug === slug)) {
      newErrors.slug = t('settings.plugins.errorSlugExists');
    }
    
    if (location === 'remote' && !packageName.trim()) {
      newErrors.package = t('settings.plugins.errorPackageRequired');
    }
    
    if (location === 'local' && !path.trim()) {
      newErrors.path = t('settings.plugins.errorPathRequired');
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  const handleSubmit = () => {
    if (!validateForm()) {
      return;
    }
    
    const pluginData: Omit<RooPluginEntry, 'enabled'> & { enabled?: boolean } = {
      slug,
      name,
      location,
      ...(location === 'remote' ? { package: packageName } : { path }),
      ...(roleDefinition ? { roleDefinition } : {}),
      ...(customInstructions ? { customInstructions } : {}),
      ...(groups.length > 0 ? { groups } : {}),
    };
    
    if (isEditMode) {
      // For edit mode, keep the current enabled state
      pluginData.enabled = plugin.enabled;
      
      vscode.postMessage({
        type: 'plugin-update',
        slug: plugin.slug,
        updates: pluginData,
      });
    } else {
      // For add mode, enable by default
      pluginData.enabled = true;
      
      vscode.postMessage({
        type: 'plugin-add',
        plugin: pluginData,
      });
    }
    
    onClose();
  };
  
  const handleToggleGroup = (group: string) => {
    if (groups.includes(group)) {
      setGroups(groups.filter(g => g !== group));
    } else {
      setGroups([...groups, group]);
    }
  };
  
  return (
    <div className="plugin-wizard">
      <h3>
        {isEditMode 
          ? t('settings.plugins.editPlugin', { name: plugin.name })
          : t('settings.plugins.createPlugin')}
      </h3>
      
      <div className="form-fields">
        <TextField
          value={name}
          onChange={e => setName((e.target as HTMLInputElement).value)}
          label={t('settings.plugins.name')}
          placeholder={t('settings.plugins.namePlaceholder')}
          error={!!errors.name}
          errorMessage={errors.name}
        />
        
        <TextField
          value={slug}
          onChange={handleSlugChange}
          label={t('settings.plugins.slug')}
          placeholder={t('settings.plugins.slugPlaceholder')}
          error={!!errors.slug}
          errorMessage={errors.slug}
          description={t('settings.plugins.slugDescription')}
        />
        
        <div className="form-field">
          <label>{t('settings.plugins.location')}</label>
          <div className="radio-group">
            <label>
              <input
                type="radio"
                name="location"
                value="local"
                checked={location === 'local'}
                onChange={() => setLocation('local')}
              />
              {t('settings.plugins.locationLocal')}
            </label>
            <label>
              <input
                type="radio"
                name="location"
                value="remote"
                checked={location === 'remote'}
                onChange={() => setLocation('remote')}
              />
              {t('settings.plugins.locationRemote')}
            </label>
          </div>
        </div>
        
        {location === 'remote' ? (
          <TextField
            value={packageName}
            onChange={e => setPackageName((e.target as HTMLInputElement).value)}
            label={t('settings.plugins.package')}
            placeholder={t('settings.plugins.packagePlaceholder')}
            error={!!errors.package}
            errorMessage={errors.package}
            description={t('settings.plugins.packageDescription')}
          />
        ) : (
          <TextField
            value={path}
            onChange={e => setPath((e.target as HTMLInputElement).value)}
            label={t('settings.plugins.path')}
            placeholder={t('settings.plugins.pathPlaceholder')}
            error={!!errors.path}
            errorMessage={errors.path}
            description={t('settings.plugins.pathDescription')}
          />
        )}
        
        <TextField
          value={roleDefinition}
          onChange={e => setRoleDefinition((e.target as HTMLInputElement).value)}
          label={t('settings.plugins.roleDefinition')}
          placeholder={t('settings.plugins.roleDefinitionPlaceholder')}
          multiline
          rows={3}
        />
        
        <TextField
          value={customInstructions}
          onChange={e => setCustomInstructions((e.target as HTMLInputElement).value)}
          label={t('settings.plugins.customInstructions')}
          placeholder={t('settings.plugins.customInstructionsPlaceholder')}
          multiline
          rows={3}
        />
        
        <div className="form-field">
          <label>{t('settings.plugins.groups')}</label>
          <div className="checkbox-group">
            {['read', 'edit', 'browser', 'command', 'mcp'].map(group => (
              <label key={group}>
                <input
                  type="checkbox"
                  checked={groups.includes(group)}
                  onChange={() => handleToggleGroup(group)}
                />
                {t(`settings.plugins.group_${group}`)}
              </label>
            ))}
          </div>
        </div>
      </div>
      
      <div className="wizard-actions">
        <Button onClick={onClose} appearance="secondary">
          {t('settings.plugins.cancel')}
        </Button>
        <Button onClick={handleSubmit} appearance="primary">
## Extension State Context Integration

To integrate with the extension state, we'll leverage the existing `ExtensionStateContext`. We need to listen for plugin-related messages from the extension and update the UI accordingly:

```tsx
// In ExtensionStateContext.tsx (update)
import React, { useEffect, createContext, useContext, useState } from 'react';
import { RooPluginEntry } from '../shared/plugins';

interface ExtensionStateContextType {
  // Existing properties
  
  // Add plugin-related properties
  plugins: RooPluginEntry[];
  pluginOutput: Record<string, { output: string; error: boolean }>;
  
  // Add methods for plugin state updates
  setPlugins: (plugins: RooPluginEntry[]) => void;
  setPluginOutput: (slug: string, output: string, error?: boolean) => void;
}

export const ExtensionStateContext = createContext<ExtensionStateContextType>({
  // Existing defaults
  
  // Add defaults for plugin properties
  plugins: [],
  pluginOutput: {},
  setPlugins: () => {},
  setPluginOutput: () => {},
});

export const ExtensionStateProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Existing state
  
  // Add plugin state
  const [plugins, setPlugins] = useState<RooPluginEntry[]>([]);
  const [pluginOutput, setPluginOutputState] = useState<Record<string, { output: string; error: boolean }>>({});
  
  const setPluginOutput = (slug: string, output: string, error = false) => {
    setPluginOutputState(prev => ({
      ...prev,
      [slug]: { output, error },
    }));
  };
  
  // Update useEvent to handle plugin messages
  useEvent('message', (event) => {
    const message = event.data;
    
    if (message.type === 'state' && message.state?.plugins) {
      setPlugins(message.state.plugins);
    } else if (message.type === 'pluginResult') {
      setPluginOutput(message.slug, message.output, message.error);
    }
    
    // Other message handling...
  });
  
  return (
    <ExtensionStateContext.Provider
      value={{
        // Existing state values
        
        // Add plugin state values
        plugins,
        pluginOutput,
        setPlugins,
        setPluginOutput,
      }}
    >
      {children}
    </ExtensionStateContext.Provider>
  );
};

export const useExtensionState = () => useContext(ExtensionStateContext);
```

## Styles

For styling the plugin UI components, we'll use CSS modules or a styled-components approach consistent with the rest of the application. The styles will focus on:

1. Maintaining VS Code's design language
2. Ensuring proper spacing and hierarchy
3. Supporting both light and dark themes
4. Providing proper focus and hover states for accessibility

## Internationalization

The UI will fully support internationalization using the existing translation infrastructure:

```json
// In i18n/locales/en/settings.json (add)
{
  "plugins": {
    "title": "Plugins",
    "description": "Manage plugins to extend Roo Code's capabilities",
    "addPlugin": "Add Plugin",
    "noPlugins": "No plugins installed.",
    "edit": "Edit",
    "remove": "Remove",
    "run": "Run",
    "confirmRemove": "Are you sure you want to remove this plugin?",
    "typeLocal": "Local",
    "typeRemote": "Remote",
    "noDescription": "No description provided",
    "roleDefinition": "Role Definition",
    "noRoleDefinition": "No role definition provided",
    "customInstructions": "Custom Instructions",
    "noCustomInstructions": "No custom instructions provided",
    "technicalDetails": "Technical Details",
    "slug": "Slug",
    "package": "Package",
    "path": "Path",
    "groups": "Groups",
    "executionResults": "Execution Results",
    "copy": "Copy to Clipboard",
    "close": "Close",
    "executing": "Executing plugin",
    "noOutput": "No output from plugin execution",
    "createPlugin": "Create Plugin",
    "editPlugin": "Edit Plugin: {{name}}",
    "name": "Name",
    "namePlaceholder": "My Plugin",
    "slugPlaceholder": "my-plugin",
    "slugDescription": "Unique identifier (lowercase, hyphens)",
    "location": "Location",
    "locationLocal": "Local (script in workspace)",
    "locationRemote": "Remote (NPM package)",
    "packagePlaceholder": "@org/package-name",
    "packageDescription": "NPM package name for NPX execution",
    "pathPlaceholder": ".roo/plugins/my-plugin.js",
    "pathDescription": "Path to plugin script (relative to workspace)",
    "roleDefinitionPlaceholder": "Describe the plugin's purpose and capabilities...",
    "customInstructionsPlaceholder": "Additional instructions for using this plugin...",
    "group_read": "Read Files",
    "group_edit": "Edit Files",
    "group_browser": "Browser Access",
    "group_command": "Run Commands",
    "group_mcp": "MCP Integration",
    "cancel": "Cancel",
    "saveChanges": "Save Changes",
    "errorNameRequired": "Name is required",
    "errorSlugRequired": "Slug is required",
    "errorSlugFormat": "Slug must be lowercase letters, numbers, and hyphens only",
    "errorSlugExists": "A plugin with this slug already exists",
    "errorPackageRequired": "Package name is required for remote plugins",
    "errorPathRequired": "Path is required for local plugins"
  }
}
```

## Integration with Settings View

The plugin UI will be integrated into the existing Settings view. In the `SettingsView.tsx` component, we'll add the `PluginSettings` component alongside other settings sections:

```tsx
// In SettingsView.tsx (update)
import { PluginSettings } from '../plugins/PluginSettings';

export const SettingsView: React.FC = () => {
  // Existing code
  
  return (
    <div className="settings-view">
      {/* Other settings sections */}
      
      {/* Add Plugin Settings section */}
      <PluginSettings />
      
      {/* Remaining settings sections */}
    </div>
  );
};
```

## Design Considerations

### Message Flow

The component communication flow follows this pattern:

1. User interacts with UI components (e.g., toggles a plugin)
2. Component calls a handler (e.g., `handleTogglePlugin`)
3. Handler sends a message to the extension (e.g., `vscode.postMessage({ type: 'plugin-toggle', ... })`)
4. Extension processes the message and performs the operation
5. Extension sends back a state update
6. `ExtensionStateContext` captures the update and updates React state
7. UI components re-render with the updated state

This ensures a consistent flow where changes made in the UI are processed by the extension and then reflected back in the UI.

### Error Handling

The UI will handle errors at multiple levels:

1. **Form Validation**: The `PluginWizard` component validates inputs and shows inline error messages
2. **Operation Errors**: If the extension encounters an error during an operation, it sends an error message that the UI displays
3. **Execution Errors**: The `PluginExecution` component displays errors from plugin execution in a distinct way (e.g., red background)

### User Experience Improvements

To enhance the user experience, we'll implement:

1. **Loading States**: Show loading indicators during plugin operations
2. **Optimistic Updates**: Update the UI immediately for toggle operations, falling back if there's an error
3. **Confirmation Dialogs**: Confirm before destructive operations like removing a plugin
4. **Visual Feedback**: Provide visual feedback for successful operations
5. **Keyboard Navigation**: Ensure all interactions are keyboard accessible

## Component Summary

The UI components work together to provide a complete plugin management experience:

1. `PluginSettings` integrates into the Settings view and manages overall layout
2. `InstalledPlugins` displays the list of installed plugins
3. `PluginListItem` renders individual plugins with controls
4. `PluginDetails` shows expanded information about a plugin
5. `PluginExecution` displays execution results
6. `PluginWizard` provides the form interface for creating and editing plugins
7. `SectionHeader` provides a consistent header style for the plugin section

Together, these components provide a cohesive and user-friendly interface for managing plugins in Roo Code.
          {isEditMode ? t('settings.plugins.saveChanges') : t('settings.plugins.createPlugin')}
        </Button>
      </div>
    </div>
  );
};
```
  if (plugins.length === 0) {
    return (
      <div className="no-plugins">
        <p>{t('settings.plugins.noPlugins')}</p>
      </div>
    );
  }
  
  return (
    <div className="installed-plugins">
      <ul className="plugin-list">
        {plugins.map(plugin => (
          <PluginListItem
            key={plugin.slug}
            plugin={plugin}
            onEdit={() => onEdit(plugin)}
            onRemove={() => handleRemovePlugin(plugin.slug)}
            onToggle={(enabled) => handleTogglePlugin(plugin.slug, enabled)}
            onRun={() => handleRunPlugin(plugin.slug)}
          />
        ))}
      </ul>
    </div>
  );
};
