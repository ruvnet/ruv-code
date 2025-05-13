import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import { describe, test, expect, beforeEach } from 'vitest';
import PluginsView from '../PluginsView';
import { PluginExtensionIntegration } from '../services/PluginExtensionIntegration';
import { RooPluginEntry } from '../schemas/plugin-schema';

// Mock the translation context
vi.mock('@/i18n/TranslationContext', () => ({
  useAppTranslation: vi.fn(() => ({
    t: (key: string) => key, // Just return the key for simplicity
  })),
}));

// Mock the extension state context
vi.mock('@/context/ExtensionStateContext', () => ({
  useExtensionState: () => ({
    // Provide any values needed for testing
    language: 'en',
  }),
}));

// Mock the vscode API
vi.mock('@/utilities/vscode', () => ({
  vscode: {
    postMessage: vi.fn(),
  },
}));

// Mock the ResizeObserver
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Mock scrollIntoView which isn't available in the test environment
Element.prototype.scrollIntoView = vi.fn();

// Mock the lucide-react icons
vi.mock('lucide-react', () => ({
  Package: () => <div data-testid="package-icon" />,
  Download: () => <div data-testid="download-icon" />,
  Settings: () => <div data-testid="settings-icon" />,
  LucideIcon: () => <div data-testid="lucide-icon" />,
}));

// Mock PluginExtensionIntegration
vi.mock('../services/PluginExtensionIntegration', () => ({
  PluginExtensionIntegration: {
    getPlugins: vi.fn(),
    installPlugin: vi.fn(),
    updatePlugin: vi.fn(),
    enablePlugin: vi.fn(),
    disablePlugin: vi.fn(),
    removePlugin: vi.fn(),
    runPlugin: vi.fn(),
  },
}));

// Mock child components
vi.mock('../InstalledPlugins', () => ({
  InstalledPlugins: ({ onAddPlugin, plugins, onPluginsChanged }: any) => (
    <div data-testid="installed-plugins">
      <p>Installed Plugins Mock</p>
      <button onClick={onAddPlugin} data-testid="add-plugin-btn">Add Plugin</button>
      <div data-testid="plugins-count">{plugins.length}</div>
      <button onClick={onPluginsChanged} data-testid="refresh-plugins-btn">Refresh</button>
    </div>
  ),
}));

vi.mock('../PluginRegistry', () => ({
  PluginRegistry: ({ onInstallPlugin }: any) => (
    <div data-testid="plugin-registry">
      <p>Plugin Registry Mock</p>
      <button onClick={() => onInstallPlugin({ slug: 'test' })} data-testid="install-plugin-btn">
        Install Plugin
      </button>
    </div>
  ),
}));

vi.mock('../PluginSettings', () => ({
  PluginSettings: ({ _pluginManager, onSettingsChanged }: any) => (
    <div data-testid="plugin-settings">
      <p>Plugin Settings Mock</p>
      <button onClick={onSettingsChanged} data-testid="change-settings-btn">
        Change Settings
      </button>
    </div>
  ),
}));

vi.mock('../PluginWizard', () => ({
  PluginWizard: ({ onClose, onSave }: any) => (
    <div data-testid="plugin-wizard">
      <p>Plugin Wizard Mock</p>
      <button onClick={onClose} data-testid="close-wizard-btn">Close</button>
      <button 
        onClick={() => onSave({
          slug: 'new-plugin',
          name: 'New Plugin',
          enabled: true,
          location: 'remote',
          package: '@roo/new-plugin'
        })} 
        data-testid="save-plugin-btn"
      >
        Save
      </button>
    </div>
  ),
}));

// Mock UI components
vi.mock('@/components/ui', () => ({
  AlertDialog: ({ children }: any) => <div data-testid="alert-dialog">{children}</div>,
  AlertDialogContent: ({ children }: any) => <div data-testid="alert-dialog-content">{children}</div>,
  AlertDialogTitle: ({ children }: any) => <div data-testid="alert-dialog-title">{children}</div>,
  AlertDialogDescription: ({ children }: any) => <div data-testid="alert-dialog-description">{children}</div>,
  AlertDialogCancel: ({ children }: any) => <button data-testid="alert-dialog-cancel">{children}</button>,
  AlertDialogAction: ({ children, onClick }: any) => (
    <button data-testid="alert-dialog-action" onClick={onClick}>
      {children}
    </button>
  ),
  AlertDialogHeader: ({ children }: any) => <div data-testid="alert-dialog-header">{children}</div>,
  AlertDialogFooter: ({ children }: any) => <div data-testid="alert-dialog-footer">{children}</div>,
  Button: ({ children, onClick, disabled, variant }: any) => (
    <button
      onClick={onClick}
      disabled={disabled}
      data-variant={variant}
      data-testid="ui-button"
    >
      {children}
    </button>
  ),
  Tooltip: ({ children }: any) => <div data-testid="tooltip">{children}</div>,
  TooltipContent: ({ children }: any) => <div data-testid="tooltip-content">{children}</div>,
  TooltipProvider: ({ children }: any) => <div data-testid="tooltip-provider">{children}</div>,
  TooltipTrigger: ({ children, onClick }: any) => (
    <div data-testid="tooltip-trigger" onClick={onClick}>
      {children}
    </div>
  ),
}));

// Mock Tab components
vi.mock('../common/Tab', () => {
  return {
    Tab: ({ children }: any) => <div data-testid="tab">{children}</div>,
    TabContent: ({ children, className }: any) => (
      <div data-testid="tab-content" className={className}>{children}</div>
    ),
    TabHeader: ({ children, className }: any) => (
      <div data-testid="tab-header" className={className}>{children}</div>
    ),
    TabList: ({ children, _value, onValueChange, className }: any) => (
      <div data-testid="tab-list" className={className}>
        {React.Children.map(children, (child) => {
          if (React.isValidElement(child)) {
            return React.cloneElement(child as React.ReactElement<any>, { onValueChange });
          }
          return child;
        })}
      </div>
    ),
    TabTrigger: ({ children, value, isSelected, className, onValueChange, 'data-testid': testId }: any) => (
      <button
        data-testid={testId}
        className={className}
        data-value={value}
        data-selected={isSelected}
        onClick={() => onValueChange && onValueChange(value)}
      >
        {children}
      </button>
    ),
  };
});

describe('PluginsView Component', () => {
  // Mock handlers
  const onDone = vi.fn();
  const mockPlugins: RooPluginEntry[] = [
    {
      slug: 'test-plugin-1',
      name: 'Test Plugin 1',
      enabled: true,
      location: 'remote' as const,
      package: '@roo/test-plugin-1',
    },
    {
      slug: 'test-plugin-2',
      name: 'Test Plugin 2',
      enabled: false,
      location: 'local' as const,
      path: '/path/to/plugin',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    // Mock successful API responses
    vi.mocked(PluginExtensionIntegration.getPlugins).mockResolvedValue({
      success: true,
      plugins: mockPlugins,
    });
    
    vi.mocked(PluginExtensionIntegration.installPlugin).mockResolvedValue({
      success: true,
    });
  });

  test('renders with initial state and loads plugins', async () => {
    render(<PluginsView onDone={onDone} />);
    
    // Verify initial render
    expect(screen.getByText('common:plugins')).toBeInTheDocument();
    
    // Verify plugin loading is triggered
    expect(PluginExtensionIntegration.getPlugins).toHaveBeenCalled();
    
    // Wait for plugins to load
    await waitFor(() => {
      expect(screen.getByTestId('installed-plugins')).toBeInTheDocument();
    });
  });

  test('switches between tabs correctly', async () => {
    render(<PluginsView onDone={onDone} />);
    
    // Wait for plugins to load
    await waitFor(() => {
      expect(screen.getByTestId('installed-plugins')).toBeInTheDocument();
    });
    
    // Switch to Registry tab by clicking on the registry tab
    fireEvent.click(screen.getByTestId('tab-registry'));
    expect(screen.getByTestId('plugin-registry')).toBeInTheDocument();
    
    // Switch to Settings tab
    fireEvent.click(screen.getByTestId('tab-settings'));
    expect(screen.getByTestId('plugin-settings')).toBeInTheDocument();
    
    // Switch back to Installed tab
    fireEvent.click(screen.getByTestId('tab-installed'));
    expect(screen.getByTestId('installed-plugins')).toBeInTheDocument();
  });

  test('opens plugin wizard and handles plugin installation', async () => {
    render(<PluginsView onDone={onDone} />);
    
    // Wait for plugins to load
    await waitFor(() => {
      expect(screen.getByTestId('installed-plugins')).toBeInTheDocument();
    });
    
    // Click add plugin button to open wizard
    fireEvent.click(screen.getByTestId('add-plugin-btn'));
    expect(screen.getByTestId('plugin-wizard')).toBeInTheDocument();
    
    // Save new plugin
    fireEvent.click(screen.getByTestId('save-plugin-btn'));
    
    // Verify installation API is called
    await waitFor(() => {
      expect(PluginExtensionIntegration.installPlugin).toHaveBeenCalledWith({
        slug: 'new-plugin',
        name: 'New Plugin',
        enabled: true,
        location: 'remote',
        package: '@roo/new-plugin'
      });
    });
    
    // Verify plugin list is refreshed
    await waitFor(() => {
      expect(PluginExtensionIntegration.getPlugins).toHaveBeenCalledTimes(2);
    });
  });

  test('marks changes when modifying plugin settings', async () => {
    render(<PluginsView onDone={onDone} />);
    
    // Wait for plugins to load
    await waitFor(() => {
      expect(screen.getByTestId('installed-plugins')).toBeInTheDocument();
    });
    
    // Switch to Settings tab
    fireEvent.click(screen.getByTestId('tab-settings'));
    expect(screen.getByTestId('plugin-settings')).toBeInTheDocument();
    
    // Make a change to settings
    fireEvent.click(screen.getByTestId('change-settings-btn'));
    
    // Verify save button is enabled
    const saveButtons = screen.getAllByTestId('ui-button');
    const saveButton = saveButtons.find(button => button.textContent === 'settings:common.save');
    expect(saveButton).not.toBeDisabled();
  });

  test('confirms before discarding changes', async () => {
    render(<PluginsView onDone={onDone} />);
    
    // Wait for plugins to load
    await waitFor(() => {
      expect(screen.getByTestId('installed-plugins')).toBeInTheDocument();
    });
    
    // Switch to Registry tab
    fireEvent.click(screen.getByTestId('tab-registry'));
    
    // Install a plugin to trigger a change
    fireEvent.click(screen.getByTestId('install-plugin-btn'));
    
    // Try to switch tabs with unsaved changes
    fireEvent.click(screen.getByTestId('tab-settings'));
    
    // Confirm dialog should appear
    await waitFor(() => {
      expect(screen.getByTestId('alert-dialog')).toBeInTheDocument();
    });
    
    // Click "Discard Changes" button
    fireEvent.click(screen.getByTestId('alert-dialog-action'));
    
    // Should switch to settings tab
    expect(screen.getByTestId('plugin-settings')).toBeInTheDocument();
  });

  test('applies targetSection prop correctly', async () => {
    // Render with targetSection set to "settings"
    render(<PluginsView onDone={onDone} targetSection="settings" />);
    
    // Wait for plugins to load
    await waitFor(() => {
      // Should render settings tab directly
      expect(screen.getByTestId('plugin-settings')).toBeInTheDocument();
    });
  });
});