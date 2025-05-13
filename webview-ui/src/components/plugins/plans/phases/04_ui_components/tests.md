# Phase 4: UI Components - Test Specification

## Test Plan

The test suite will validate the functionality and behavior of the UI components developed for the plugin system. The tests will use React Testing Library along with Jest (or Vitest) to simulate user interactions and verify component rendering and behavior.

## Unit Tests

### PluginSettings Component Tests

These tests validate that the `PluginSettings` component correctly renders and handles state changes:

```typescript
// TEST: PluginSettings component renders correctly and manages state
describe('PluginSettings', () => {
  const mockPlugins = [
    {
      slug: 'test-plugin',
      name: 'Test Plugin',
      location: 'remote',
      package: '@roo/test',
      enabled: true
    }
  ];
  
  beforeEach(() => {
    // Mock ExtensionStateContext
    jest.spyOn(ExtensionStateContext, 'useExtensionState').mockReturnValue({
      plugins: mockPlugins,
      setPlugins: jest.fn(),
      // ...other required context values
    });
  });
  
  it('should render the section header', () => {
    const { getByText } = render(<PluginSettings />);
    
    expect(getByText('settings.plugins.title')).toBeInTheDocument();
    expect(getByText('settings.plugins.description')).toBeInTheDocument();
  });
  
  it('should show the plugin list when not in wizard mode', () => {
    const { getByText, queryByText } = render(<PluginSettings />);
    
    expect(getByText('settings.plugins.addPlugin')).toBeInTheDocument();
    expect(queryByText('settings.plugins.createPlugin')).not.toBeInTheDocument();
  });
  
  it('should show the plugin wizard when add button is clicked', () => {
    const { getByText, queryByText } = render(<PluginSettings />);
    
    // Click the Add Plugin button
    fireEvent.click(getByText('settings.plugins.addPlugin'));
    
    // Should show wizard and hide plugin list
    expect(queryByText('settings.plugins.addPlugin')).not.toBeInTheDocument();
    expect(getByText('settings.plugins.createPlugin')).toBeInTheDocument();
  });
  
  it('should return to plugin list when wizard is closed', () => {
    const { getByText, queryByText, getByRole } = render(<PluginSettings />);
    
    // Click the Add Plugin button to show wizard
    fireEvent.click(getByText('settings.plugins.addPlugin'));
    
    // Click the Cancel button to close wizard
    fireEvent.click(getByText('settings.plugins.cancel'));
    
    // Should show plugin list again
    expect(getByText('settings.plugins.addPlugin')).toBeInTheDocument();
    expect(queryByText('settings.plugins.createPlugin')).not.toBeInTheDocument();
  });
  
  it('should pass the correct plugin to wizard when editing', () => {
    // Mock the InstalledPlugins component to trigger edit
    jest.mock('../InstalledPlugins', () => ({
      InstalledPlugins: ({ onEdit }) => (
        <button onClick={() => onEdit(mockPlugins[0])}>Edit</button>
      )
    }));
    
    const { getByText, queryByText } = render(<PluginSettings />);
    
    // Click the Edit button
    fireEvent.click(getByText('Edit'));
    
    // Should show wizard in edit mode
    expect(getByText('settings.plugins.editPlugin', { name: 'Test Plugin' })).toBeInTheDocument();
  });
});
```

### InstalledPlugins Component Tests

These tests validate that the `InstalledPlugins` component correctly renders plugins and handles actions:

```typescript
// TEST: InstalledPlugins component renders plugins and handles actions
describe('InstalledPlugins', () => {
  const mockPlugins = [
    {
      slug: 'test-plugin',
      name: 'Test Plugin',
      location: 'remote',
      package: '@roo/test',
      enabled: true
    },
    {
      slug: 'local-plugin',
      name: 'Local Plugin',
      location: 'local',
      path: './plugins/local-plugin.js',
      enabled: false
    }
  ];
  
  const mockOnEdit = jest.fn();
  
  beforeEach(() => {
    jest.clearAllMocks();
    global.confirm = jest.fn().mockReturnValue(true); // Mock confirm dialog
    global.vscode = { postMessage: jest.fn() }; // Mock vscode API
  });
  
  it('should render empty state when no plugins', () => {
    const { getByText } = render(
      <InstalledPlugins plugins={[]} onEdit={mockOnEdit} />
    );
    
    expect(getByText('settings.plugins.noPlugins')).toBeInTheDocument();
  });
  
  it('should render a list of plugins', () => {
    const { getByText, getAllByRole } = render(
      <InstalledPlugins plugins={mockPlugins} onEdit={mockOnEdit} />
    );
    
    // Should render both plugins
    expect(getByText('Test Plugin')).toBeInTheDocument();
    expect(getByText('Local Plugin')).toBeInTheDocument();
    
    // Should render list items
    const listItems = getAllByRole('listitem');
    expect(listItems).toHaveLength(2);
  });
  
  it('should call onEdit when edit button is clicked', () => {
    const { getAllByTitle } = render(
      <InstalledPlugins plugins={mockPlugins} onEdit={mockOnEdit} />
    );
    
    // Find edit buttons and click the first one
    const editButtons = getAllByTitle('settings.plugins.edit');
    fireEvent.click(editButtons[0]);
    
    // Should call onEdit with the correct plugin
    expect(mockOnEdit).toHaveBeenCalledWith(mockPlugins[0]);
  });
  
  it('should send toggle message when toggle is clicked', () => {
    const { getAllByRole } = render(
      <InstalledPlugins plugins={mockPlugins} onEdit={mockOnEdit} />
    );
    
    // Find checkboxes and click the first one
    const checkboxes = getAllByRole('checkbox');
    fireEvent.click(checkboxes[0]);
    
    // Should send postMessage with toggle action
    expect(global.vscode.postMessage).toHaveBeenCalledWith({
      type: 'plugin-toggle',
      slug: 'test-plugin',
      enabled: false // Toggling from true to false
    });
  });
  
  it('should send remove message when remove is clicked and confirmed', () => {
    const { getAllByTitle } = render(
      <InstalledPlugins plugins={mockPlugins} onEdit={mockOnEdit} />
    );
    
    // Find remove buttons and click the first one
    const removeButtons = getAllByTitle('settings.plugins.remove');
    fireEvent.click(removeButtons[0]);
    
    // Should confirm first
    expect(global.confirm).toHaveBeenCalledWith('settings.plugins.confirmRemove');
    
    // Should send postMessage with remove action
    expect(global.vscode.postMessage).toHaveBeenCalledWith({
      type: 'plugin-remove',
      slug: 'test-plugin'
    });
  });
  
  it('should not send remove message when not confirmed', () => {
    global.confirm = jest.fn().mockReturnValue(false); // User cancels
    
    const { getAllByTitle } = render(
      <InstalledPlugins plugins={mockPlugins} onEdit={mockOnEdit} />
    );
    
    // Find remove buttons and click the first one
    const removeButtons = getAllByTitle('settings.plugins.remove');
    fireEvent.click(removeButtons[0]);
    
    // Should confirm
    expect(global.confirm).toHaveBeenCalled();
    
    // Should not send postMessage
    expect(global.vscode.postMessage).not.toHaveBeenCalled();
  });
  
  it('should send run message when run button is clicked', () => {
    const { getAllByTitle } = render(
      <InstalledPlugins plugins={mockPlugins} onEdit={mockOnEdit} />
    );
    
    // Find run buttons and click the first one
    const runButtons = getAllByTitle('settings.plugins.run');
    fireEvent.click(runButtons[0]);
    
    // Should send postMessage with run action
    expect(global.vscode.postMessage).toHaveBeenCalledWith({
      type: 'plugin-run',
      slug: 'test-plugin'
    });
  });
});
```

### PluginListItem Component Tests

These tests validate that the `PluginListItem` component correctly renders plugin items and handles interactions:

```typescript
// TEST: PluginListItem component renders items and handles interactions
describe('PluginListItem', () => {
  const mockPlugin = {
    slug: 'test-plugin',
    name: 'Test Plugin',
    location: 'remote',
    package: '@roo/test',
    roleDefinition: 'This is a test plugin for testing purposes',
    customInstructions: 'Use this plugin for testing',
    groups: ['read', 'command'],
    enabled: true
  };
  
  const mockHandlers = {
    onEdit: jest.fn(),
    onRemove: jest.fn(),
    onToggle: jest.fn(),
    onRun: jest.fn()
  };
  
  beforeEach(() => {
    jest.clearAllMocks();
  });
  
  it('should render basic plugin information', () => {
    const { getByText } = render(
      <PluginListItem plugin={mockPlugin} {...mockHandlers} />
    );
    
    expect(getByText('Test Plugin')).toBeInTheDocument();
    expect(getByText('settings.plugins.typeRemote')).toBeInTheDocument();
    expect(getByText('This is a test plugin for testing purposes')).toBeInTheDocument();
  });
  
  it('should call handlers when buttons are clicked', () => {
    const { getByTitle } = render(
      <PluginListItem plugin={mockPlugin} {...mockHandlers} />
    );
    
    // Click the edit button
    fireEvent.click(getByTitle('settings.plugins.edit'));
    expect(mockHandlers.onEdit).toHaveBeenCalled();
    
    // Click the remove button
    fireEvent.click(getByTitle('settings.plugins.remove'));
    expect(mockHandlers.onRemove).toHaveBeenCalled();
    
    // Click the run button
    fireEvent.click(getByTitle('settings.plugins.run'));
    expect(mockHandlers.onRun).toHaveBeenCalled();
  });
  
  it('should call onToggle when checkbox is toggled', () => {
    const { getByRole } = render(
      <PluginListItem plugin={mockPlugin} {...mockHandlers} />
    );
    
    // Click the checkbox
    fireEvent.click(getByRole('checkbox'));
    expect(mockHandlers.onToggle).toHaveBeenCalledWith(false); // Toggling from true to false
  });
  
  it('should expand to show details when clicked', () => {
    const { getByText, queryByText } = render(
      <PluginListItem plugin={mockPlugin} {...mockHandlers} />
    );
    
    // Initially, details should not be visible
    expect(queryByText('settings.plugins.roleDefinition')).not.toBeInTheDocument();
    
    // Click on the plugin info to expand
    fireEvent.click(getByText('Test Plugin').closest('.plugin-info')!);
    
    // Details should now be visible
    expect(getByText('settings.plugins.roleDefinition')).toBeInTheDocument();
    expect(getByText('settings.plugins.customInstructions')).toBeInTheDocument();
    expect(getByText('settings.plugins.technicalDetails')).toBeInTheDocument();
  });
  
  it('should disable run button when plugin is disabled', () => {
    const disabledPlugin = { ...mockPlugin, enabled: false };
    
    const { getByTitle } = render(
      <PluginListItem plugin={disabledPlugin} {...mockHandlers} />
    );
    
    // Run button should be disabled
    expect(getByTitle('settings.plugins.run')).toBeDisabled();
  });
  
  it('should show execution results when run is clicked', () => {
    const { getByTitle, getByText, queryByText } = render(
      <PluginListItem plugin={mockPlugin} {...mockHandlers} />
    );
    
    // Click the run button
    fireEvent.click(getByTitle('settings.plugins.run'));
    
    // Should call onRun
    expect(mockHandlers.onRun).toHaveBeenCalled();
    
    // Should show execution component
    expect(getByText('settings.plugins.executionResults')).toBeInTheDocument();
  });
});
```

### PluginWizard Component Tests

These tests validate that the `PluginWizard` component correctly handles form inputs and validation:

```typescript
// TEST: PluginWizard component handles form inputs and validation
describe('PluginWizard', () => {
  const mockPlugin = {
    slug: 'test-plugin',
    name: 'Test Plugin',
    location: 'remote',
    package: '@roo/test',
    enabled: true
  };
  
  const mockExistingPlugins = [mockPlugin];
  const mockOnClose = jest.fn();
  
  beforeEach(() => {
    jest.clearAllMocks();
    global.vscode = { postMessage: jest.fn() }; // Mock vscode API
  });
  
  it('should render the create form when no plugin provided', () => {
    const { getByText, getByLabelText } = render(
      <PluginWizard
        plugin={null}
        onClose={mockOnClose}
        existingPlugins={mockExistingPlugins}
      />
    );
    
    expect(getByText('settings.plugins.createPlugin')).toBeInTheDocument();
    expect(getByLabelText('settings.plugins.name')).toHaveValue('');
    expect(getByLabelText('settings.plugins.slug')).toHaveValue('');
  });
  
  it('should render the edit form when plugin is provided', () => {
    const { getByText, getByLabelText } = render(
      <PluginWizard
        plugin={mockPlugin}
        onClose={mockOnClose}
        existingPlugins={mockExistingPlugins}
      />
    );
    
    expect(getByText('settings.plugins.editPlugin', { name: 'Test Plugin' })).toBeInTheDocument();
    expect(getByLabelText('settings.plugins.name')).toHaveValue('Test Plugin');
    expect(getByLabelText('settings.plugins.slug')).toHaveValue('test-plugin');
  });
  
  it('should auto-generate slug from name in create mode', () => {
    const { getByLabelText } = render(
      <PluginWizard
        plugin={null}
        onClose={mockOnClose}
        existingPlugins={mockExistingPlugins}
      />
    );
    
    // Enter a name
    fireEvent.change(getByLabelText('settings.plugins.name'), {
      target: { value: 'My New Plugin' }
    });
    
    // Slug should be auto-generated
    expect(getByLabelText('settings.plugins.slug')).toHaveValue('my-new-plugin');
  });
  
  it('should not auto-generate slug if manually edited', () => {
    const { getByLabelText } = render(
      <PluginWizard
        plugin={null}
        onClose={mockOnClose}
        existingPlugins={mockExistingPlugins}
      />
    );
    
    // Enter a custom slug
    fireEvent.change(getByLabelText('settings.plugins.slug'), {
      target: { value: 'custom-slug' }
    });
    
    // Enter a name
    fireEvent.change(getByLabelText('settings.plugins.name'), {
      target: { value: 'My New Plugin' }
    });
    
    // Slug should not change
    expect(getByLabelText('settings.plugins.slug')).toHaveValue('custom-slug');
  });
  
  it('should show package field for remote location', () => {
    const { getByLabelText, queryByLabelText } = render(
      <PluginWizard
        plugin={null}
        onClose={mockOnClose}
        existingPlugins={mockExistingPlugins}
      />
    );
    
    // Select remote location
    fireEvent.click(getByLabelText('settings.plugins.locationRemote'));
    
    // Should show package field and hide path field
    expect(getByLabelText('settings.plugins.package')).toBeInTheDocument();
    expect(queryByLabelText('settings.plugins.path')).not.toBeInTheDocument();
  });
  
  it('should show path field for local location', () => {
    const { getByLabelText, queryByLabelText } = render(
      <PluginWizard
        plugin={mockPlugin} // Remote plugin
        onClose={mockOnClose}
        existingPlugins={mockExistingPlugins}
      />
    );
    
    // Select local location
    fireEvent.click(getByLabelText('settings.plugins.locationLocal'));
    
    // Should show path field and hide package field
    expect(getByLabelText('settings.plugins.path')).toBeInTheDocument();
    expect(queryByLabelText('settings.plugins.package')).not.toBeInTheDocument();
  });
  
  it('should validate form and show errors', () => {
    const { getByText, getByLabelText } = render(
      <PluginWizard
        plugin={null}
        onClose={mockOnClose}
        existingPlugins={mockExistingPlugins}
      />
    );
    
    // Click submit without filling required fields
    fireEvent.click(getByText('settings.plugins.createPlugin'));
    
    // Should show validation errors
    expect(getByText('settings.plugins.errorNameRequired')).toBeInTheDocument();
    expect(getByText('settings.plugins.errorSlugRequired')).toBeInTheDocument();
    
    // Fill name but with invalid slug
    fireEvent.change(getByLabelText('settings.plugins.name'), {
      target: { value: 'Test' }
    });
    fireEvent.change(getByLabelText('settings.plugins.slug'), {
      target: { value: 'invalid slug!' }
    });
    
    // Click submit again
    fireEvent.click(getByText('settings.plugins.createPlugin'));
    
    // Should show slug format error
    expect(getByText('settings.plugins.errorSlugFormat')).toBeInTheDocument();
  });
  
  it('should validate duplicate slugs', () => {
    const { getByText, getByLabelText } = render(
      <PluginWizard
        plugin={null} // New plugin
        onClose={mockOnClose}
        existingPlugins={mockExistingPlugins}
      />
    );
    
    // Enter name and existing slug
    fireEvent.change(getByLabelText('settings.plugins.name'), {
      target: { value: 'Duplicate Test' }
    });
    fireEvent.change(getByLabelText('settings.plugins.slug'), {
      target: { value: 'test-plugin' } // Already exists
    });
    
    // Click submit
    fireEvent.click(getByText('settings.plugins.createPlugin'));
    
    // Should show duplicate slug error
    expect(getByText('settings.plugins.errorSlugExists')).toBeInTheDocument();
  });
  
  it('should send add plugin message when creating', () => {
    const { getByText, getByLabelText } = render(
      <PluginWizard
        plugin={null}
        onClose={mockOnClose}
        existingPlugins={mockExistingPlugins}
      />
    );
    
    // Fill required fields
    fireEvent.change(getByLabelText('settings.plugins.name'), {
      target: { value: 'New Plugin' }
    });
    // Slug should be auto-generated
    
    // Select remote and fill package
    fireEvent.click(getByLabelText('settings.plugins.locationRemote'));
    fireEvent.change(getByLabelText('settings.plugins.package'), {
      target: { value: '@roo/new-plugin' }
    });
    
    // Click submit
    fireEvent.click(getByText('settings.plugins.createPlugin'));
    
    // Should send postMessage with add action
    expect(global.vscode.postMessage).toHaveBeenCalledWith({
      type: 'plugin-add',
      plugin: expect.objectContaining({
        name: 'New Plugin',
        slug: 'new-plugin',
        location: 'remote',
        package: '@roo/new-plugin',
        enabled: true
      })
    });
    
    // Should close the wizard
    expect(mockOnClose).toHaveBeenCalled();
  });
  
  it('should send update plugin message when editing', () => {
    const { getByText, getByLabelText } = render(
      <PluginWizard
        plugin={mockPlugin}
        onClose={mockOnClose}
        existingPlugins={mockExistingPlugins}
      />
    );
    
    // Change name
    fireEvent.change(getByLabelText('settings.plugins.name'), {
      target: { value: 'Updated Plugin' }
    });
    
    // Click submit
    fireEvent.click(getByText('settings.plugins.saveChanges'));
    
    // Should send postMessage with update action
    expect(global.vscode.postMessage).toHaveBeenCalledWith({
      type: 'plugin-update',
      slug: 'test-plugin',
      updates: expect.objectContaining({
        name: 'Updated Plugin',
        enabled: true
      })
    });
    
    // Should close the wizard
    expect(mockOnClose).toHaveBeenCalled();
  });
  
  it('should close without saving when cancel is clicked', () => {
    const { getByText } = render(
      <PluginWizard
        plugin={null}
        onClose={mockOnClose}
        existingPlugins={mockExistingPlugins}
      />
    );
    
    // Click cancel
    fireEvent.click(getByText('settings.plugins.cancel'));
    
    // Should close without sending message
    expect(mockOnClose).toHaveBeenCalled();
    expect(global.vscode.postMessage).not.toHaveBeenCalled();
  });
});
```

### ExtensionStateContext Integration Tests

These tests validate that the `ExtensionStateContext` correctly handles plugin-related messages:

```typescript
// TEST: ExtensionStateContext handles plugin messages correctly
describe('ExtensionStateContext - Plugin Integration', () => {
  let wrapper: ReactWrapper;
  let mockSetPlugins: jest.Mock;
  let mockSetPluginOutput: jest.Mock;
  
  beforeEach(() => {
    mockSetPlugins = jest.fn();
    mockSetPluginOutput = jest.fn();
    
    // Mock useState for plugins array
    jest.spyOn(React, 'useState')
      .mockImplementationOnce(() => [[], mockSetPlugins])
      .mockImplementationOnce(() => [{}, mockSetPluginOutput]);
    
    // Mount the provider
    wrapper = mount(
      <ExtensionStateProvider>
        <div>Test Child</div>
      </ExtensionStateProvider>
    );
  });
  
  it('should update plugins state on state message', () => {
    const mockPlugins = [{ slug: 'test', name: 'Test', enabled: true }];
    
    // Simulate a state message from extension
    const messageEvent = new MessageEvent('message', {
      data: {
        type: 'state',
        state: {
          plugins: mockPlugins
        }
      }
    });
    
    window.dispatchEvent(messageEvent);
    
    // Should update plugins state
    expect(mockSetPlugins).toHaveBeenCalledWith(mockPlugins);
  });
  
  it('should update plugin output on pluginResult message', () => {
    // Simulate a pluginResult message from extension
    const messageEvent = new MessageEvent('message', {
      data: {
        type: 'pluginResult',
        slug: 'test-plugin',
        output: 'Plugin execution output',
        error: false
      }
    });
    
    window.dispatchEvent(messageEvent);
    
    // Should update plugin output state
    expect(mockSetPluginOutput).toHaveBeenCalledWith(
      'test-plugin',
      'Plugin execution output',
      false
    );
  });
});
```

## Test Matrix

The test suite covers the following scenarios:

| Component | Test Case | Expected Result |
|-----------|-----------|----------------|
| **PluginSettings** | Render section header | Header titles displayed |
| | Show plugin list | List visible, wizard hidden |
| | Click add button | Shows wizard, hides list |
| | Close wizard | Shows list, hides wizard |
| | Edit plugin | Passes plugin to wizard |
| **InstalledPlugins** | Empty state | Shows "no plugins" message |
| | Render plugin list | All plugins displayed |
| | Click edit button | onEdit called with plugin |
| | Toggle plugin | Toggle message sent |
| | Remove plugin (confirmed) | Remove message sent |
| | Remove plugin (canceled) | No message sent |
| | Run plugin | Run message sent |
| **PluginListItem** | Render basic info | Name, type, description shown |
| | Click buttons | All handlers called |
| | Toggle checkbox | onToggle called with value |
| | Click to expand | Details shown |
| | Disabled plugin | Run button disabled |
| | Run plugin | Shows execution results |
| **PluginWizard** | Create mode | Empty form shown |
| | Edit mode | Form pre-filled with values |
| | Auto-generate slug | Slug updated from name |
| | Manual slug edit | No auto-generation |
| | Remote location | Package field shown |
| | Local location | Path field shown |
| | Form validation | Errors shown for invalid inputs |
| | Duplicate slug check | Error shown for duplicate |
| | Submit create form | Add message sent |
| | Submit edit form | Update message sent |
| | Click cancel | Closes without saving |
| **ExtensionState** | State message | Updates plugins state |
| | Plugin result message | Updates plugin output state |

These tests provide comprehensive coverage of the UI components, ensuring that they render correctly, handle user interactions properly, validate inputs, and communicate with the extension through message passing.