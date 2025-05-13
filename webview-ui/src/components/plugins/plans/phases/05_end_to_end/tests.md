# Phase 5: End-to-end Tests - Test Specification

## Test Strategy Overview

The end-to-end tests for the plugin system validate the complete user workflows from UI interaction through to extension functionality and file system changes. These tests ensure that all components work together correctly in real-world usage scenarios.

## Test Environment

Each test will run in an isolated environment with:

1. A clean VSCode instance with our extension loaded
2. A dedicated test workspace with fixtures
3. Mock plugins for both local and remote types
4. Automated UI interaction via Playwright
5. Extension API access for state verification
6. File system access for manifest verification

## Test Suites

### 1. Plugin Creation and Management Test Suite

These tests verify the end-to-end workflows for creating, editing, and managing plugins.

#### TC-E2E-001: Create Local Plugin

**Objective**: Verify the complete workflow for creating a local plugin from UI to file system.

**Steps**:
1. Open the VSCode instance with test workspace
2. Navigate to the Plugin Settings section
3. Click "Add Plugin" button
4. Fill the form with valid local plugin details:
   - Name: "Test Local Plugin"
   - Location: Local
   - Path: ".roo/plugins/test-local.js"
   - Role Definition: "A test local plugin"
   - Groups: ["read", "command"]
5. Submit the form
6. Verify plugin appears in the UI list
7. Verify plugin state in the extension
8. Verify manifest file contains the new plugin
9. Verify plugin is enabled by default

**Expected Results**:
- UI shows the newly created plugin in the list
- Plugin appears in the extension's plugin manager state
- Manifest file contains the correctly formatted plugin entry
- Plugin shows as enabled in both UI and state

**Test Data**:
```json
{
  "name": "Test Local Plugin",
  "location": "local",
  "path": ".roo/plugins/test-local.js",
  "roleDefinition": "A test local plugin",
  "groups": ["read", "command"]
}
```

**Implementation**:
```typescript
test('TC-E2E-001: Create Local Plugin', async () => {
  // Navigate to plugin settings
  await automation.navigateToPluginSettings();
  
  // Test data
  const newPlugin = {
    name: "Test Local Plugin",
    location: "local",
    path: ".roo/plugins/test-local.js",
    roleDefinition: "A test local plugin",
    groups: ["read", "command"]
  };
  
  // Create plugin
  await automation.createNewPlugin(newPlugin);
  
  // Verify plugin in UI list
  const pluginExists = await automation.pluginExistsInList(newPlugin.name);
  expect(pluginExists).toBe(true);
  
  // Verify plugin in extension state
  const state = await helper.getPluginManagerState();
  const pluginInState = state.plugins.find(p => p.name === newPlugin.name);
  expect(pluginInState).toBeDefined();
  expect(pluginInState?.location).toBe("local");
  expect(pluginInState?.path).toBe(newPlugin.path);
  expect(pluginInState?.enabled).toBe(true);
  
  // Verify manifest file
  const manifestValid = await helper.verifyPluginManifest([{
    slug: "test-local-plugin", // Auto-generated from name
    name: newPlugin.name,
    location: "local",
    path: newPlugin.path,
    roleDefinition: newPlugin.roleDefinition,
    groups: newPlugin.groups,
    enabled: true
  }]);
  expect(manifestValid).toBe(true);
});
```

#### TC-E2E-002: Create Remote Plugin

**Objective**: Verify the complete workflow for creating a remote NPM package plugin.

**Steps**:
1. Open the VSCode instance with test workspace
2. Navigate to the Plugin Settings section
3. Click "Add Plugin" button
4. Fill the form with valid remote plugin details:
   - Name: "Test Remote Plugin"
   - Location: Remote
   - Package: "@roo/test-plugin"
   - Role Definition: "A test remote plugin"
   - Groups: ["read", "browser"]
5. Submit the form
6. Verify plugin appears in the UI list
7. Verify plugin state in the extension
8. Verify manifest file contains the new plugin

**Expected Results**:
- UI shows the newly created remote plugin in the list
- Plugin appears in the extension's plugin manager state
- Manifest file contains the correctly formatted plugin entry with package name
- Plugin shows as enabled in both UI and state

**Implementation**:
```typescript
test('TC-E2E-002: Create Remote Plugin', async () => {
  // Navigate to plugin settings
  await automation.navigateToPluginSettings();
  
  // Test data
  const newPlugin = {
    name: "Test Remote Plugin",
    location: "remote",
    package: "@roo/test-plugin",
    roleDefinition: "A test remote plugin",
    groups: ["read", "browser"]
  };
  
  // Create plugin
  await automation.createNewPlugin(newPlugin);
  
  // Verify plugin in UI list
  const pluginExists = await automation.pluginExistsInList(newPlugin.name);
  expect(pluginExists).toBe(true);
  
  // Verify plugin in extension state
  const state = await helper.getPluginManagerState();
  const pluginInState = state.plugins.find(p => p.name === newPlugin.name);
  expect(pluginInState).toBeDefined();
  expect(pluginInState?.location).toBe("remote");
  expect(pluginInState?.package).toBe(newPlugin.package);
  
  // Verify manifest file
  const manifestValid = await helper.verifyPluginManifest([{
    slug: "test-remote-plugin",
    name: newPlugin.name,
    location: "remote",
    package: newPlugin.package,
    roleDefinition: newPlugin.roleDefinition,
    groups: newPlugin.groups,
    enabled: true
  }]);
  expect(manifestValid).toBe(true);
});
```

#### TC-E2E-003: Edit Existing Plugin

**Objective**: Verify the complete workflow for editing an existing plugin.

**Steps**:
1. Ensure a test plugin exists in the system
2. Navigate to the Plugin Settings section
3. Find the test plugin in the list
4. Click the "Edit" button for the plugin
5. Modify plugin details:
   - Change name to "Edited Plugin Name"
   - Change role definition to "Updated role definition"
   - Add an additional group
6. Submit the form
7. Verify UI shows updated plugin information
8. Verify plugin state in the extension is updated
9. Verify manifest file contains the updated plugin

**Expected Results**:
- UI shows the plugin with updated details
- Plugin appears in the extension's plugin manager state with changes
- Manifest file contains the correctly updated plugin entry
- Plugin retains its enabled/disabled state through the edit

**Implementation**:
```typescript
test('TC-E2E-003: Edit Existing Plugin', async () => {
  // Setup: Ensure plugin exists
  await helper.ensurePluginExists({
    slug: "plugin-to-edit",
    name: "Plugin To Edit",
    location: "local",
    path: ".roo/plugins/edit-test.js",
    roleDefinition: "Original role definition",
    groups: ["read"],
    enabled: true
  });
  
  // Navigate to plugin settings
  await automation.navigateToPluginSettings();
  
  // Click edit button for the plugin
  await automation.editPlugin("Plugin To Edit");
  
  // Update plugin details
  await automation.fillPluginForm({
    name: "Edited Plugin Name",
    roleDefinition: "Updated role definition",
    groups: ["read", "command"]
  });
  
  // Submit form
  await automation.submitPluginForm();
  
  // Verify UI updated
  const pluginExists = await automation.pluginExistsInList("Edited Plugin Name");
  expect(pluginExists).toBe(true);
  
  // Verify extension state updated
  const state = await helper.getPluginManagerState();
  const pluginInState = state.plugins.find(p => p.slug === "plugin-to-edit");
  expect(pluginInState).toBeDefined();
  expect(pluginInState?.name).toBe("Edited Plugin Name");
  expect(pluginInState?.roleDefinition).toBe("Updated role definition");
  expect(pluginInState?.groups).toContain("command");
  
  // Verify manifest file updated
  const manifestValid = await helper.verifyPluginManifest([{
    slug: "plugin-to-edit", // Slug shouldn't change during edit
    name: "Edited Plugin Name",
    location: "local",
    path: ".roo/plugins/edit-test.js",
    roleDefinition: "Updated role definition",
    groups: ["read", "command"],
    enabled: true
  }]);
  expect(manifestValid).toBe(true);
});
```

#### TC-E2E-004: Toggle Plugin Enabled State

**Objective**: Verify enabling and disabling a plugin updates UI, state, and manifest.

**Steps**:
1. Ensure a test plugin exists in the system in enabled state
2. Navigate to the Plugin Settings section
3. Find the test plugin in the list
4. Click the toggle checkbox to disable the plugin
5. Verify UI shows plugin as disabled
6. Verify plugin state in extension shows as disabled
7. Verify manifest file shows plugin as disabled
8. Click the toggle checkbox again to re-enable
9. Verify plugin is re-enabled in UI, state, and manifest

**Expected Results**:
- UI shows correct enabled/disabled state after each toggle
- Extension state reflects the enabled/disabled state
- Manifest file updates with the correct enabled property
- Disabled plugin's run button is not clickable

**Implementation**:
```typescript
test('TC-E2E-004: Toggle Plugin Enabled State', async () => {
  // Setup: Ensure plugin exists and is enabled
  await helper.ensurePluginExists({
    slug: "toggle-test-plugin",
    name: "Toggle Test Plugin",
    location: "local",
    path: ".roo/plugins/toggle-test.js",
    enabled: true
  });
  
  // Navigate to plugin settings
  await automation.navigateToPluginSettings();
  
  // Disable the plugin
  await automation.togglePlugin("Toggle Test Plugin");
  
  // Verify UI shows as disabled
  const isDisabled = await automation.isPluginDisabled("Toggle Test Plugin");
  expect(isDisabled).toBe(true);
  
  // Verify extension state
  let state = await helper.getPluginManagerState();
  let pluginInState = state.plugins.find(p => p.slug === "toggle-test-plugin");
  expect(pluginInState?.enabled).toBe(false);
  
  // Verify manifest updated
  let manifestValid = await helper.verifyPluginManifest([{
    slug: "toggle-test-plugin",
    name: "Toggle Test Plugin",
    location: "local",
    path: ".roo/plugins/toggle-test.js",
    enabled: false
  }]);
  expect(manifestValid).toBe(true);
  
  // Verify run button is disabled
  const isRunDisabled = await automation.isRunButtonDisabled("Toggle Test Plugin");
  expect(isRunDisabled).toBe(true);
  
  // Re-enable the plugin
  await automation.togglePlugin("Toggle Test Plugin");
  
  // Verify UI shows as enabled
  const isEnabled = await automation.isPluginEnabled("Toggle Test Plugin");
  expect(isEnabled).toBe(true);
  
  // Verify extension state updated
  state = await helper.getPluginManagerState();
  pluginInState = state.plugins.find(p => p.slug === "toggle-test-plugin");
  expect(pluginInState?.enabled).toBe(true);
  
  // Verify manifest updated
  manifestValid = await helper.verifyPluginManifest([{
    slug: "toggle-test-plugin",
    name: "Toggle Test Plugin",
    location: "local",
    path: ".roo/plugins/toggle-test.js",
    enabled: true
  }]);
  expect(manifestValid).toBe(true);
  
  // Verify run button is enabled
  const isRunEnabled = await automation.isRunButtonEnabled("Toggle Test Plugin");
  expect(isRunEnabled).toBe(true);
});
```

#### TC-E2E-005: Delete Plugin

**Objective**: Verify the complete workflow for removing a plugin.

**Steps**:
1. Ensure a test plugin exists in the system
2. Navigate to the Plugin Settings section
3. Find the test plugin in the list
4. Click the "Remove" button for the plugin
5. Confirm deletion in the dialog
6. Verify plugin is removed from the UI list
7. Verify plugin is removed from extension state
8. Verify plugin is removed from manifest file

**Expected Results**:
- UI no longer shows the deleted plugin
- Plugin is removed from the extension's plugin manager state
- Manifest file no longer contains the plugin entry

**Implementation**:
```typescript
test('TC-E2E-005: Delete Plugin', async () => {
  // Setup: Ensure plugin exists
  await helper.ensurePluginExists({
    slug: "plugin-to-delete",
    name: "Plugin To Delete",
    location: "local",
    path: ".roo/plugins/delete-test.js",
    enabled: true
  });
  
  // Navigate to plugin settings
  await automation.navigateToPluginSettings();
  
  // Delete the plugin
  await automation.deletePlugin("Plugin To Delete");
  
  // Verify plugin removed from UI
  const pluginExists = await automation.pluginExistsInList("Plugin To Delete");
  expect(pluginExists).toBe(false);
  
  // Verify plugin removed from extension state
  const state = await helper.getPluginManagerState();
  const pluginInState = state.plugins.find(p => p.slug === "plugin-to-delete");
  expect(pluginInState).toBeUndefined();
  
  // Verify plugin removed from manifest
  const manifest = await helper.readPluginManifest();
  const pluginInManifest = manifest.plugins.find((p: any) => p.slug === "plugin-to-delete");
  expect(pluginInManifest).toBeUndefined();
});
```

### 2. Plugin Execution Test Suite

These tests verify the execution of plugins and display of results.

#### TC-E2E-006: Execute Plugin and View Results

**Objective**: Verify running a plugin shows execution results in the UI.

**Steps**:
1. Ensure a test plugin exists in the system
2. Navigate to the Plugin Settings section
3. Find the test plugin in the list
4. Click the "Run" button for the plugin
5. Wait for execution to complete
6. Verify execution results are displayed
7. Verify copy button works for result output

**Expected Results**:
- Execution results appear in the UI
- Loading state is shown during execution
- Results are properly formatted
- Copy button copies the output to clipboard

**Implementation**:
```typescript
test('TC-E2E-006: Execute Plugin and View Results', async () => {
  // Setup: Ensure plugin exists with mock implementation
  await helper.ensurePluginExists({
    slug: "execution-test",
    name: "Execution Test Plugin",
    location: "local",
    path: ".roo/plugins/execution-test.js",
    enabled: true
  });
  
  // Create mock implementation file
  await helper.createPluginImplementation(
    ".roo/plugins/execution-test.js",
    `module.exports = async function() {
      return "Plugin execution successful with test output";
    }`
  );
  
  // Navigate to plugin settings
  await automation.navigateToPluginSettings();
  
  // Run the plugin
  await automation.runPlugin("Execution Test Plugin");
  
  // Verify loading state shown initially
  const loadingShown = await automation.waitForLoadingState();
  expect(loadingShown).toBe(true);
  
  // Verify results displayed
  const results = await automation.getExecutionResults();
  expect(results).toContain("Plugin execution successful");
  
  // Test copy button
  await automation.clickCopyButton();
  const clipboard = await automation.getClipboardText();
  expect(clipboard).toContain("Plugin execution successful");
});
```

#### TC-E2E-007: Handle Plugin Execution Error

**Objective**: Verify error handling when a plugin execution fails.

**Steps**:
1. Ensure a test plugin exists that will throw an error during execution
2. Navigate to the Plugin Settings section
3. Find the test plugin in the list
4. Click the "Run" button for the plugin
5. Wait for execution to complete
6. Verify error message is displayed
7. Verify UI indication of failure

**Expected Results**:
- Error message appears in the UI
- UI provides visual indication of failure
- Error details are properly formatted

**Implementation**:
```typescript
test('TC-E2E-007: Handle Plugin Execution Error', async () => {
  // Setup: Ensure plugin exists with failing implementation
  await helper.ensurePluginExists({
    slug: "error-test",
    name: "Error Test Plugin",
    location: "local",
    path: ".roo/plugins/error-test.js",
    enabled: true
  });
  
  // Create failing implementation file
  await helper.createPluginImplementation(
    ".roo/plugins/error-test.js",
    `module.exports = async function() {
      throw new Error("Test plugin execution error");
    }`
  );
  
  // Navigate to plugin settings
  await automation.navigateToPluginSettings();
  
  // Run the plugin
  await automation.runPlugin("Error Test Plugin");
  
  // Verify error state shown
  const errorShown = await automation.waitForErrorState();
  expect(errorShown).toBe(true);
  
  // Verify error message
  const errorMessage = await automation.getExecutionResults();
  expect(errorMessage).toContain("Test plugin execution error");
  
  // Verify error styling
  const hasErrorStyling = await automation.hasErrorStyling();
  expect(hasErrorStyling).toBe(true);
});
```

### 3. Integration Validation Test Suite

These tests verify the integration between UI, extension, and file system.

#### TC-E2E-008: External Manifest Changes Reflect in UI

**Objective**: Verify that changes to the manifest file from outside VSCode are reflected in the UI.

**Steps**:
1. Start with a clean plugin state
2. Manually create a new plugin entry in the manifest file
3. Wait for file watcher to detect the change
4. Navigate to the Plugin Settings section
5. Verify the new plugin appears in the UI

**Expected Results**:
- Plugin added externally appears in the UI list
- Plugin state in extension includes the new plugin
- All plugin properties are correctly displayed

**Implementation**:
```typescript
test('TC-E2E-008: External Manifest Changes Reflect in UI', async () => {
  // Get workspace path
  const workspacePath = await helper.getWorkspacePath();
  const manifestPath = path.join(workspacePath, '.roo/plugins/rooplugins.json');
  
  // Read current manifest
  const manifest = await helper.readPluginManifest();
  
  // Add new plugin
  const newPlugin = {
    slug: "external-added-plugin",
    name: "Externally Added Plugin",
    location: "local",
    path: ".roo/plugins/external-test.js",
    roleDefinition: "Plugin added outside VSCode",
    enabled: true
  };
  
  manifest.plugins.push(newPlugin);
  
  // Write updated manifest
  await fs.promises.writeFile(
    manifestPath,
    JSON.stringify(manifest, null, 2),
    'utf-8'
  );
  
  // Wait for file watcher to detect change
  await helper.waitForCondition(async () => {
    const state = await helper.getPluginManagerState();
    return state.plugins.some(p => p.slug === "external-added-plugin");
  }, 5000, "Extension did not detect external manifest change");
  
  // Navigate to plugin settings
  await automation.navigateToPluginSettings();
  
  // Verify plugin appears in UI
  const pluginExists = await automation.pluginExistsInList("Externally Added Plugin");
  expect(pluginExists).toBe(true);
  
  // Verify plugin details are correct
  const details = await automation.getPluginDetails("Externally Added Plugin");
  expect(details.roleDefinition).toContain("Plugin added outside VSCode");
});
```

#### TC-E2E-009: State Persistence Across VSCode Restart

**Objective**: Verify that plugin state persists across VSCode restarts.

**Steps**:
1. Create a test plugin with specific configuration
2. Modify its state (e.g., disable it)
3. Close and reopen VSCode
4. Navigate to the Plugin Settings section
5. Verify the plugin exists with the correct state

**Expected Results**:
- Plugin configuration persists after VSCode restart
- Enabled/disabled state is preserved
- All plugin properties are maintained

**Implementation**:
```typescript
test('TC-E2E-009: State Persistence Across VSCode Restart', async () => {
  // Setup: Create a test plugin
  await automation.navigateToPluginSettings();
  await automation.createNewPlugin({
    name: "Persistence Test Plugin",
    location: "local",
    path: ".roo/plugins/persistence-test.js",
    roleDefinition: "Testing state persistence"
  });
  
  // Disable the plugin
  await automation.togglePlugin("Persistence Test Plugin");
  
  // Verify it's disabled
  const isDisabled = await automation.isPluginDisabled("Persistence Test Plugin");
  expect(isDisabled).toBe(true);
  
  // Restart VSCode
  await helper.restartVSCode();
  
  // Navigate back to plugin settings
  await automation.navigateToPluginSettings();
  
  // Verify plugin still exists and is disabled
  const pluginExists = await automation.pluginExistsInList("Persistence Test Plugin");
  expect(pluginExists).toBe(true);
  
  const stillDisabled = await automation.isPluginDisabled("Persistence Test Plugin");
  expect(stillDisabled).toBe(true);
  
  // Verify other properties persisted
  const details = await automation.getPluginDetails("Persistence Test Plugin");
  expect(details.roleDefinition).toContain("Testing state persistence");
  expect(details.path).toContain("persistence-test.js");
});
```

### 4. Form Validation Test Suite

These tests verify the validation logic in the plugin creation and editing forms.

#### TC-E2E-010: Validate Plugin Creation Form

**Objective**: Verify that form validation prevents invalid plugin creation.

**Steps**:
1. Navigate to the Plugin Settings section
2. Click "Add Plugin" button
3. Submit the form without filling required fields
4. Verify error messages for required fields
5. Enter invalid values (e.g., invalid slug format)
6. Verify validation errors for format requirements
7. Enter a slug that already exists
8. Verify duplicate slug error

**Expected Results**:
- Form prevents submission with missing required fields
- Appropriate error messages are displayed
- Format validation ensures proper values
- Duplicate slug detection works correctly

**Implementation**:
```typescript
test('TC-E2E-010: Validate Plugin Creation Form', async () => {
  // Setup: Ensure a plugin exists for duplicate testing
  await helper.ensurePluginExists({
    slug: "existing-plugin",
    name: "Existing Plugin",
    location: "local",
    path: ".roo/plugins/existing.js",
    enabled: true
  });
  
  // Navigate to plugin settings
  await automation.navigateToPluginSettings();
  
  // Click Add Plugin
  await automation.clickAddPlugin();
  
  // Try to submit empty form
  await automation.submitPluginForm();
  
  // Verify required field errors
  const nameError = await automation.getFieldError("Name");
  expect(nameError).toContain("required");
  
  // Enter name but invalid slug
  await automation.fillField("Name", "Test Plugin");
  await automation.fillField("Slug", "invalid slug!");
  await automation.submitPluginForm();
  
  // Verify format error
  const slugFormatError = await automation.getFieldError("Slug");
  expect(slugFormatError).toContain("format");
  
  // Enter duplicate slug
  await automation.fillField("Slug", "existing-plugin");
  await automation.submitPluginForm();
  
  // Verify duplicate error
  const slugDuplicateError = await automation.getFieldError("Slug");
  expect(slugDuplicateError).toContain("exists");
  
  // Select remote but no package
  await automation.selectLocation("remote");
  await automation.fillField("Slug", "valid-slug"); // Fix slug
  await automation.submitPluginForm();
  
  // Verify package required error
  const packageError = await automation.getFieldError("Package");
  expect(packageError).toContain("required");
});
```

### 5. Edge Case Test Suite

These tests verify handling of unusual conditions and edge cases.

#### TC-E2E-011: Handle Large Number of Plugins

**Objective**: Verify UI and system performance with a large number of plugins.

**Steps**:
1. Create a manifest file with a large number of plugins (e.g., 50+)
2. Navigate to the Plugin Settings section
3. Verify all plugins are displayed correctly
4. Measure load time and UI responsiveness
5. Test operations on plugins at different positions in the list

**Expected Results**:
- All plugins are rendered correctly
- UI remains responsive
- Operations work correctly regardless of plugin position
- Performance meets acceptable thresholds

**Implementation**:
```typescript
test('TC-E2E-011: Handle Large Number of Plugins', async () => {
  // Setup: Create many plugins in manifest
  const pluginsToCreate = 50;
  const plugins = [];
  
  for (let i = 0; i < pluginsToCreate; i++) {
    plugins.push({
      slug: `perf-test-${i}`,
      name: `Performance Test Plugin ${i}`,
      location: "local",
      path: `.roo/plugins/perf-test-${i}.js`,
      enabled: i % 2 === 0 // Alternate enabled/disabled
    });
  }
  
  await helper.setPluginsInManifest(plugins);
  
  // Start performance measurement
  const startTime = Date.now();
  
  // Navigate to plugin settings
  await automation.navigateToPluginSettings();
  
  // Measure load time
  const loadTime = Date.now() - startTime;
  console.log(`Load time for ${pluginsToCreate} plugins: ${loadTime}ms`);
  
  // Verify all plugins are displayed
  const pluginCount = await automation.getPluginCount();
  expect(pluginCount).toBe(pluginsToCreate);
  
  // Test operations on first plugin
  await automation.togglePlugin(`Performance Test Plugin 0`);
  
  // Test operations on middle plugin
  await automation.togglePlugin(`Performance Test Plugin ${Math.floor(pluginsToCreate / 2)}`);
  
  // Test operations on last plugin
  await automation.togglePlugin(`Performance Test Plugin ${pluginsToCreate - 1}`);
  
  // Assert performance expectations
  expect(loadTime).toBeLessThan(1000); // Should load in less than 1 second
});
```

#### TC-E2E-012: Handle Malformed Manifest File

**Objective**: Verify system gracefully handles corrupted manifest files.

**Steps**:
1. Create a malformed JSON in the manifest file
2. Navigate to the Plugin Settings section
3. Verify error handling in the UI
4. Fix the manifest file
5. Verify system recovers correctly

**Expected Results**:
- System detects and reports the corrupted manifest
- UI shows appropriate error message
- System recovers when manifest is fixed
- No data loss occurs for valid plugins

**Implementation**:
```typescript
test('TC-E2E-012: Handle Malformed Manifest File', async () => {
  // Get workspace path
  const workspacePath = await helper.getWorkspacePath();
  const manifestPath = path.join(workspacePath, '.roo/plugins/rooplugins.json');
  
  // Create malformed JSON
  await fs.promises.writeFile(
    manifestPath,
    '{ "plugins": [ { "incomplete": true',
    'utf-8'
  );
  
  // Navigate to plugin settings
  await automation.navigateToPluginSettings();
  
  // Verify error state in UI
  const errorShown = await automation.isManifestErrorShown();
  expect(errorShown).toBe(true);
  
  // Fix the manifest
  await fs.promises.writeFile(
    manifestPath,
    '{ "plugins": [ { "slug": "recovery-test", "name": "Recovery Test", "location": "local", "path": ".roo/plugins/recovery.js", "enabled": true } ] }',
    'utf-8'
  );
  
  // Wait for system to recover
  await helper.waitForCondition(async () => {
    return await automation.pluginExistsInList("Recovery Test");
  }, 5000, "System did not recover after manifest was fixed");
  
  // Verify system recovered
  const pluginExists = await automation.pluginExistsInList("Recovery Test");
  expect(pluginExists).toBe(true);
});
```

## Test Execution Guidelines

1. **Test Isolation**: Each test must run in isolation and clean up after itself
2. **Deterministic Results**: Tests should produce the same results on each run
3. **Realistic Workflows**: Tests should simulate real user behaviors
4. **Complete Validation**: Tests should validate at UI, extension, and file system levels
5. **Error Recovery**: Tests should verify error handling and recovery mechanisms
6. **Performance Metrics**: Performance-critical tests should measure and assert timing

## Test Reporting

End-to-end test results will be reported in a structured format:

1. Test ID and name
2. Pass/fail status
3. Test duration
4. Screenshots for UI validation failures
5. Detailed error messages for failures
6. Performance metrics for relevant tests

The test report will help identify any integration issues between the plugin system components before release.

## Continuous Integration

These end-to-end tests will be integrated into the CI pipeline to ensure that changes to any component do not break the overall system functionality. They will run after unit tests but before release.