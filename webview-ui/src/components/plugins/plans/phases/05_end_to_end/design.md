# Phase 5: End-to-end Tests - Design

## E2E Testing Architecture

The end-to-end testing architecture for the plugin system will follow a layered approach, testing the integration between all previously implemented components. The architecture consists of:

```
E2E Test Layer
┌───────────────────────────────────────────────────────────────┐
│                                                               │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────────┐    │
│  │ User Action │    │   VSCode    │    │  File System    │    │
│  │ Simulation  │───▶│  Extension  │───▶│  Integration    │    │
│  └─────────────┘    │ Integration │    └─────────────────┘    │
│                     └─────────────┘            │              │
│                           ▲                    │              │
│                           │                    ▼              │
│                     ┌─────────────┐    ┌─────────────────┐    │
│                     │  Webview    │    │  Test Fixtures  │    │
│                     │     UI      │◀───│  & Validation   │    │
│                     └─────────────┘    └─────────────────┘    │
│                                                               │
└───────────────────────────────────────────────────────────────┘
```

## Test Implementation Approach

### 1. Test Framework Setup

We will use the VSCode Extension Testing framework along with Playwright for UI automation:

```typescript
// e2e-test-setup.ts
import * as vscode from 'vscode';
import * as path from 'path';
import { 
  runTests, 
  downloadAndUnzipVSCode,
  resolveCliArgsFromVSCodeExecutablePath
} from '@vscode/test-electron';
import { _electron as electron } from 'playwright';

export async function setupTestEnvironment() {
  try {
    // Download VS Code, unzip it, and run the integration test
    const vscodeExecutablePath = await downloadAndUnzipVSCode('stable');
    const [cli, ...args] = resolveCliArgsFromVSCodeExecutablePath(vscodeExecutablePath);
    
    // Create test workspace with fixtures
    const testWorkspacePath = path.resolve(__dirname, '../../test-fixtures/plugin-test-workspace');
    
    // Setup test VSCode instance with our extension
    const extensionDevelopmentPath = path.resolve(__dirname, '../../');
    const extensionTestsPath = path.resolve(__dirname, './suite/index');
    
    // Run tests
    await runTests({
      vscodeExecutablePath,
      extensionDevelopmentPath,
      extensionTestsPath,
      launchArgs: [
        testWorkspacePath,
        '--disable-extensions',
        '--disable-gpu',
        '--skip-welcome',
        '--skip-release-notes'
      ]
    });
  } catch (err) {
    console.error('Failed to run tests', err);
    process.exit(1);
  }
}
```

### 2. Test Fixtures

We will create a set of test fixtures to simulate various plugin scenarios:

```
test-fixtures/
├── plugin-test-workspace/        # Test workspace for VSCode
│   ├── .vscode/                  # VSCode settings
│   └── .roo/                     # Roo Code config
│       └── plugins/              # Plugin directory
│           ├── valid-local/      # Valid local plugin
│           ├── invalid-local/    # Invalid local plugin
│           └── rooplugins.json   # Plugin manifest
├── mock-remote-plugins/          # Mock NPM packages
│   ├── valid-remote/             # Valid remote plugin
│   └── invalid-remote/           # Invalid remote plugin
└── test-scenarios/               # Predefined test scenarios
    ├── create-plugin.json        # Plugin creation scenario
    ├── edit-plugin.json          # Plugin editing scenario
    └── execution-results.json    # Plugin execution scenario
```

### 3. Test Automation

We'll use Playwright to automate UI interactions with the VSCode webview:

```typescript
// plugin-ui-automation.ts
import { Page, ElementHandle } from 'playwright';

export class PluginUIAutomation {
  constructor(private page: Page) {}
  
  async navigateToPluginSettings() {
    // Click on settings icon
    await this.page.click('.settings-view-icon');
    
    // Navigate to plugins section
    await this.page.click('text="Plugins"');
    
    // Wait for plugin list to load
    await this.page.waitForSelector('.plugin-list', { timeout: 5000 });
  }
  
  async createNewPlugin(pluginData: {
    name: string;
    location: 'local' | 'remote';
    package?: string;
    path?: string;
    roleDefinition?: string;
    customInstructions?: string;
    groups?: string[];
  }) {
    // Click add plugin button
    await this.page.click('text="Add Plugin"');
    
    // Wait for wizard to appear
    await this.page.waitForSelector('.plugin-wizard', { timeout: 5000 });
    
    // Fill the form
    await this.page.fill('[aria-label="Name"]', pluginData.name);
    
    // Select location
    if (pluginData.location === 'remote') {
      await this.page.click('text="Remote (NPM package)"');
      await this.page.fill('[aria-label="Package"]', pluginData.package || '');
    } else {
      await this.page.click('text="Local (script in workspace)"');
      await this.page.fill('[aria-label="Path"]', pluginData.path || '');
    }
    
    // Fill optional fields
    if (pluginData.roleDefinition) {
      await this.page.fill('[aria-label="Role Definition"]', pluginData.roleDefinition);
    }
    
    if (pluginData.customInstructions) {
      await this.page.fill('[aria-label="Custom Instructions"]', pluginData.customInstructions);
    }
    
    // Select groups
    if (pluginData.groups && pluginData.groups.length > 0) {
      for (const group of pluginData.groups) {
        await this.page.check(`text="${group}"`);
      }
    }
    
    // Submit form
    await this.page.click(pluginData.location === 'local' 
      ? 'button:text("Create Plugin")' 
      : 'button:text("Create Plugin")'
    );
    
    // Wait for plugin list to refresh
    await this.page.waitForSelector('.plugin-list', { timeout: 5000 });
  }
  
  async togglePlugin(pluginName: string) {
    const pluginItem = await this.findPluginByName(pluginName);
    const checkbox = await pluginItem.$('input[type="checkbox"]');
    await checkbox?.click();
    
    // Wait for state to update
    await this.page.waitForTimeout(500);
  }
  
  async runPlugin(pluginName: string) {
    const pluginItem = await this.findPluginByName(pluginName);
    const runButton = await pluginItem.$('button[title="Run"]');
    await runButton?.click();
    
    // Wait for execution results
    await this.page.waitForSelector('.plugin-execution', { timeout: 5000 });
  }
  
  async deletePlugin(pluginName: string) {
    const pluginItem = await this.findPluginByName(pluginName);
    const deleteButton = await pluginItem.$('button[title="Remove"]');
    await deleteButton?.click();
    
    // Confirm deletion
    await this.page.click('button:text("OK")');
    
    // Wait for plugin to be removed
    await this.page.waitForTimeout(500);
  }
  
  private async findPluginByName(name: string): Promise<ElementHandle<SVGElement | HTMLElement>> {
    const plugins = await this.page.$$('.plugin-item');
    
    for (const plugin of plugins) {
      const nameText = await plugin.$eval('.plugin-name', el => el.textContent);
      if (nameText?.includes(name)) {
        return plugin;
      }
    }
    
    throw new Error(`Plugin with name "${name}" not found`);
  }
}
```

### 4. Test Integration with VS Code Extension API

We'll create helpers to interact with the extension API and validate internal state:

```typescript
// extension-test-helpers.ts
import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

export class ExtensionTestHelper {
  constructor(private context: vscode.ExtensionContext) {}
  
  async getPluginManagerState() {
    // Access the plugin manager through extension API
    const extension = vscode.extensions.getExtension('anthropic.roo-code');
    if (!extension) {
      throw new Error('Roo Code extension not found');
    }
    
    const api = await extension.activate();
    return api.getPluginManager().getState();
  }
  
  async verifyPluginManifest(expectedPlugins: any[]) {
    // Read the plugin manifest file
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders) {
      throw new Error('No workspace folder open');
    }
    
    const manifestPath = path.join(
      workspaceFolders[0].uri.fsPath,
      '.roo/plugins/rooplugins.json'
    );
    
    // Verify file exists
    if (!fs.existsSync(manifestPath)) {
      throw new Error('Plugin manifest file not found');
    }
    
    // Read and parse manifest
    const manifestContent = fs.readFileSync(manifestPath, 'utf-8');
    const manifest = JSON.parse(manifestContent);
    
    // Compare with expected plugins
    expectedPlugins.forEach(expected => {
      const actual = manifest.plugins.find((p: any) => p.slug === expected.slug);
      if (!actual) {
        throw new Error(`Plugin with slug "${expected.slug}" not found in manifest`);
      }
      
      // Verify plugin properties
      for (const key in expected) {
        if (JSON.stringify(actual[key]) !== JSON.stringify(expected[key])) {
          throw new Error(
            `Plugin property mismatch for "${key}": expected ${JSON.stringify(expected[key])}, got ${JSON.stringify(actual[key])}`
          );
        }
      }
    });
    
    return true;
  }
  
  async waitForCondition(
    condition: () => Promise<boolean>, 
    timeout: number = 5000,
    message: string = 'Condition not met within timeout'
  ): Promise<void> {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeout) {
      if (await condition()) {
        return;
      }
      
      // Wait a bit before checking again
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    throw new Error(message);
  }
}
```

### 5. Test Execution Flow

The end-to-end tests follow this general flow:

1. Set up a clean test environment with predefined fixtures
2. Launch VSCode with our extension in development mode
3. Automate UI interactions using Playwright
4. Verify UI state reflects expected changes
5. Verify extension state using extension API
6. Verify file system changes match expectations
7. Cleanup test environment for next test

```typescript
// Sample test case
describe('Plugin E2E Tests', () => {
  let automation: PluginUIAutomation;
  let helper: ExtensionTestHelper;
  
  beforeEach(async () => {
    // Set up test environment
    const { page } = await setupTestEnvironment();
    automation = new PluginUIAutomation(page);
    helper = new ExtensionTestHelper(vscode.extensions.getExtension('anthropic.roo-code')!.exports);
    
    // Navigate to plugin settings
    await automation.navigateToPluginSettings();
  });
  
  afterEach(async () => {
    // Clean up test environment
    await cleanupTestEnvironment();
  });
  
  test('Create and run a local plugin', async () => {
    // Test data
    const newPlugin = {
      name: 'Test Local Plugin',
      location: 'local',
      path: '.roo/plugins/test-local.js',
      roleDefinition: 'Test plugin for E2E testing',
      groups: ['read', 'command']
    };
    
    // Create plugin through UI
    await automation.createNewPlugin(newPlugin);
    
    // Verify plugin appears in the list
    await helper.waitForCondition(async () => {
      const state = await helper.getPluginManagerState();
      return state.plugins.some(p => p.name === newPlugin.name);
    });
    
    // Verify manifest file was updated
    await helper.verifyPluginManifest([{
      slug: 'test-local-plugin',
      name: newPlugin.name,
      location: 'local',
      path: newPlugin.path,
      roleDefinition: newPlugin.roleDefinition,
      groups: newPlugin.groups,
      enabled: true
    }]);
    
    // Run the plugin
    await automation.runPlugin('Test Local Plugin');
    
    // Verify execution results are shown
    // Additional assertions...
  });
  
  // More test cases...
});
```

## Test Coverage Strategy

The end-to-end tests will cover these key scenarios:

1. **Plugin Lifecycle Tests**
   - Creation → Edit → Toggle → Delete for both local and remote plugins
   - Persistence across VSCode reload

2. **File System Integration Tests**
   - Manifest file creation and update
   - External modifications to manifest file
   - Plugin script file detection

3. **UI Component Integration Tests**
   - Form validation in wizard
   - List rendering and filtering
   - Expanding and collapsing plugin details

4. **Extension API Integration Tests**
   - Message passing between webview and extension
   - State synchronization between components
   - Command execution through extension API

5. **Error Handling Tests**
   - Invalid plugin creation attempts
   - Permission boundary violations
   - Execution failures

## Testing Tools and Libraries

For implementing the end-to-end tests, we'll use:

1. **@vscode/test-electron** - For launching and controlling VSCode instances
2. **Playwright** - For automating UI interactions
3. **Jest/Mocha** - For test organization and assertions
4. **Mock file system** - For simulating file system operations
5. **VSCode API mocks** - For simulating extension behavior in isolation tests

## Validation Strategy

End-to-end test validation will occur at multiple levels:

1. **UI State Validation**
   - DOM element presence and content
   - Visual appearance (using snapshots)
   - Interactive behavior

2. **Application State Validation**
   - Extension internal state via API
   - Plugin manager state via API
   - Message passing between components

3. **File System Validation**
   - Manifest file content
   - Created plugin files
   - File watchers and update propagation

4. **Cross-component Validation**
   - End-to-end workflows
   - State consistency across components
   - Error propagation and handling

Each test will include assertions at multiple levels to ensure comprehensive validation of the entire system's behavior.