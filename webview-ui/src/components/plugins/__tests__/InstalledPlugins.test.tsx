import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { vi } from 'vitest';
import { describe, test, expect, beforeEach } from 'vitest';
import { InstalledPlugins } from '../InstalledPlugins';
import { PluginExtensionIntegration } from '../services/PluginExtensionIntegration';

// Mock PluginExtensionIntegration
vi.mock('../services/PluginExtensionIntegration', () => ({
  PluginExtensionIntegration: {
    runPlugin: vi.fn().mockResolvedValue({ success: true }),
    enablePlugin: vi.fn().mockResolvedValue({ success: true }),
    disablePlugin: vi.fn().mockResolvedValue({ success: true }),
    updatePlugin: vi.fn().mockResolvedValue({ success: true }),
    removePlugin: vi.fn().mockResolvedValue({ success: true }),
  },
}));

// Mock the translation context
vi.mock('@/i18n/TranslationContext', () => ({
  useAppTranslation: vi.fn(() => ({
    t: (key: string) => key, // Just return the key for simplicity
  })),
}));

// Mock the icons from lucide-react
vi.mock('lucide-react', () => ({
  Search: () => <div data-testid="search-icon" />,
  X: () => <div data-testid="x-icon" />,
  Plus: () => <div data-testid="plus-icon" />,
  ExternalLink: () => <div data-testid="external-link-icon" />,
  Edit: () => <div data-testid="edit-icon" />,
  Trash2: () => <div data-testid="trash-icon" />,
  Play: () => <div data-testid="play-icon" />,
  RefreshCcw: () => <div data-testid="refresh-icon" />,
  Server: () => <div data-testid="server-icon" />,
}));

// Mock the VSCodeCheckbox from @vscode/webview-ui-toolkit/react
vi.mock('@vscode/webview-ui-toolkit/react', () => ({
  VSCodeCheckbox: ({ checked, onChange }: any) => (
    <input 
      type="checkbox" 
      checked={checked} 
      onChange={onChange} 
      data-testid="vscode-checkbox" 
    />
  ),
}));

// Mock the Button component
vi.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, disabled, variant, size, className }: any) => (
    <button 
      onClick={onClick}
      disabled={disabled}
      data-variant={variant}
      data-size={size}
      className={className}
      data-testid="ui-button"
    >
      {children}
    </button>
  ),
}));

// Mock the Section component
vi.mock('@/components/settings/Section', () => ({
  Section: ({ children }: any) => <div data-testid="section">{children}</div>,
}));

// Mock the SectionHeader component
vi.mock('@/components/plugins/SectionHeader', () => ({
  SectionHeader: ({ children }: any) => <div data-testid="section-header">{children}</div>,
}));

// Mock window.confirm
global.confirm = vi.fn(() => true);

describe('InstalledPlugins Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Sample mock plugins using the appropriate structure for the component
  const mockPlugins = [
    {
      slug: 'plugin1',
      name: 'Test Plugin 1',
      roleDefinition: 'A test plugin for React',
      enabled: true,
      location: 'remote' as const, // Type assertion needed for literal types
      package: '@roo/plugin1',
      groups: ['Development']
    },
    {
      slug: 'plugin2',
      name: 'Test Plugin 2',
      roleDefinition: 'Another test plugin',
      enabled: false,
      location: 'local' as const, // Type assertion needed for literal types
      path: '/path/to/plugin2',
      groups: ['Testing']
    }
  ];

  // Mock handlers
  const onAddPlugin = vi.fn();
  const onPluginsChanged = vi.fn();

  test('renders the component with plugins', () => {
    render(
      <InstalledPlugins 
        plugins={mockPlugins} 
        onAddPlugin={onAddPlugin}
        onPluginsChanged={onPluginsChanged}
      />
    );

    // Check if the section header is rendered
    expect(screen.getByTestId('section-header')).toBeInTheDocument();
    
    // Check if the search input is rendered
    const searchInput = screen.getByPlaceholderText('common:searchPlugins');
    expect(searchInput).toBeInTheDocument();
    
    // Check if both plugins are rendered by their name
    expect(screen.getByText('Test Plugin 1')).toBeInTheDocument();
    expect(screen.getByText('Test Plugin 2')).toBeInTheDocument();
    
    // Check if plugin role definitions are rendered
    // The component truncates role definitions if they're too long
    expect(screen.getByText('A test plugin for React')).toBeInTheDocument();
    expect(screen.getByText('Another test plugin')).toBeInTheDocument();
  });

  test('filters plugins by search query', () => {
    render(
      <InstalledPlugins 
        plugins={mockPlugins} 
        onAddPlugin={onAddPlugin}
        onPluginsChanged={onPluginsChanged}
      />
    );
    
    const searchInput = screen.getByPlaceholderText('common:searchPlugins');
    
    // Search for a plugin
    fireEvent.change(searchInput, { target: { value: 'React' } });
    
    // Check if only matching plugins are displayed
    expect(screen.getByText('Test Plugin 1')).toBeInTheDocument();
    expect(screen.queryByText('Test Plugin 2')).not.toBeInTheDocument();
  });

  test('filters plugins by category', () => {
    render(
      <InstalledPlugins 
        plugins={mockPlugins} 
        onAddPlugin={onAddPlugin}
        onPluginsChanged={onPluginsChanged}
      />
    );
    
    const categorySelect = screen.getByRole('combobox');
    
    // Select 'Testing' category
    fireEvent.change(categorySelect, { target: { value: 'Testing' } });
    
    // Check if only matching category plugins are displayed
    expect(screen.queryByText('Test Plugin 1')).not.toBeInTheDocument();
    expect(screen.getByText('Test Plugin 2')).toBeInTheDocument();
  });

  test('clears search query', () => {
    render(
      <InstalledPlugins 
        plugins={mockPlugins} 
        onAddPlugin={onAddPlugin}
        onPluginsChanged={onPluginsChanged}
      />
    );
    
    const searchInput = screen.getByPlaceholderText('common:searchPlugins');
    
    // Set a search query
    fireEvent.change(searchInput, { target: { value: 'React' } });
    
    // Find and click the clear button (X icon)
    const clearButton = screen.getByTestId('x-icon').closest('button');
    if (clearButton) {
      fireEvent.click(clearButton);
    }
    
    // Check if search query was cleared and both plugins are visible again
    expect(searchInput).toHaveValue('');
    expect(screen.getByText('Test Plugin 1')).toBeInTheDocument();
    expect(screen.getByText('Test Plugin 2')).toBeInTheDocument();
  });

  test('calls onAddPlugin when Add Plugin button is clicked', () => {
    render(
      <InstalledPlugins 
        plugins={mockPlugins} 
        onAddPlugin={onAddPlugin}
        onPluginsChanged={onPluginsChanged}
      />
    );
    
    // Find and click the Add Plugin button
    const addButtons = screen.getAllByText('common:newPlugin');
    fireEvent.click(addButtons[0]);
    
    // Check if the callback was called
    expect(onAddPlugin).toHaveBeenCalled();
  });

  test('calls handleToggleEnable when checkbox is clicked', () => {
    render(
      <InstalledPlugins 
        plugins={mockPlugins} 
        onAddPlugin={onAddPlugin}
        onPluginsChanged={onPluginsChanged}
      />
    );
    
    // Find and click checkboxes
    const checkboxes = screen.getAllByTestId('vscode-checkbox');
    fireEvent.click(checkboxes[0]); // Toggle first plugin (was enabled)
    
    // Check if the disablePlugin method was called with the right plugin slug
    expect(PluginExtensionIntegration.disablePlugin).toHaveBeenCalledWith('plugin1');
    
    // Click the second checkbox (was disabled)
    fireEvent.click(checkboxes[1]);
    
    // Check if the enablePlugin method was called with the right plugin slug
    expect(PluginExtensionIntegration.enablePlugin).toHaveBeenCalledWith('plugin2');
  });

  test('shows no plugins found message when search has no results', () => {
    render(
      <InstalledPlugins 
        plugins={mockPlugins} 
        onAddPlugin={onAddPlugin}
        onPluginsChanged={onPluginsChanged}
      />
    );
    
    const searchInput = screen.getByPlaceholderText('common:searchPlugins');
    
    // Search for something that doesn't exist
    fireEvent.change(searchInput, { target: { value: 'nonexistent plugin' } });
    
    // Check if 'no plugins found' message is displayed
    expect(screen.getByText('common:noPluginsFound')).toBeInTheDocument();
  });
});