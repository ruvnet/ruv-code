Perfect. I’ll create a detailed implementation plan for directly integrating the NPX-based plugin system into the main Roo Code VSCode extension. This will include hot-reload support, manifest management, UI updates, and a complete example of a Hello World NPX plugin scaffolded with local development and execution.

I’ll return with file-by-file instructions covering both backend (extension code) and frontend (webview UI) changes, including plugin discovery, execution, and lifecycle handling.


# Implementation Plan for Roo Code Plugin System

## Backend (Extension) Implementation

### New Files (Extension)

* **`src/core/config/PluginManager.ts` (new):**
  Implements a `PluginManager` class to handle plugin manifest loading, file watching, and plugin execution. Key elements:

  * **Constructor:** Accepts `vscode.ExtensionContext` and a callback `onUpdate: () => Promise<void>` (similar to `CustomModesManager`). On init, determine the manifest file path (see below) and set up a file watcher. Use `vscode.workspace.createFileSystemWatcher("**/.rooplugins")` (or specifically the workspace root path) to watch for creation, changes, or deletion of the `.rooplugins` file. Also watch for changes to any local plugin script files (optional, for hot-reload of plugin code).
  * **Manifest Path Resolution:** In `getPluginsFilePath()`, locate the `.rooplugins` JSON manifest. If the workspace has an open folder:

    * Look for `[workspace]/.rooplugins`. If not found, create one with default content (e.g. `{ "plugins": [] }`). Optionally, store it under a `.roo` directory (e.g. `.roo/plugins.json`) for organization, but the simplest is a `.rooplugins` file at the workspace root.
    * If no workspace folder (single-file context), fall back to a global settings file (e.g. in `context.globalStoragePath`) named `plugins.json` – this ensures the extension still operates (though plugin features might be limited without a workspace).
  * **Loading & Validation:** Provide a method `loadPlugins(): Promise<RooPluginEntry[]>` that reads the `.rooplugins` file and parses JSON. Validate the structure using a schema (see **PluginsSchema** below). If JSON is malformed or required fields are missing, log an error and show `vscode.window.showErrorMessage` (e.g. “Invalid plugin manifest format”). On success, return the parsed list of plugins.
  * **State Storage:** Keep the current plugin list in memory (e.g. `this.plugins: RooPluginEntry[]`). Also update `context.globalState` or `context.workspaceState` with the plugin list if needed for other parts of the extension (similar to how custom modes are stored in global state on update). For instance, on every successful load from file, do `context.globalState.update("plugins", plugins)`.
  * **File Watching:** On file change (or save) events, call `loadPlugins()` and if validation passes, update internal state and trigger the `onUpdate` callback so the UI can refresh. Use debounce if needed to avoid spamming on rapid changes. Also handle file deletion: if `.rooplugins` is deleted, perhaps recreate a blank one or treat as no plugins.
  * **CRUD Operations:** Provide methods to manage plugins programmatically:

    * `getPlugins(): RooPluginEntry[]` – returns the current plugin list (from memory or by reading file).
    * `addPlugin(plugin: RooPluginEntry): Promise<void>` – inserts a new plugin entry into the list and writes the updated JSON to disk (preserving formatting/indentation). Should check for duplicate `slug` or conflicts.
    * `removePlugin(slug: string): Promise<void>` – removes the plugin with matching slug and writes file.
    * `togglePlugin(slug: string, enabled: boolean): Promise<void>` – sets a plugin’s `enabled` field and writes file. (If the manifest doesn’t include an `enabled` property by default, assume missing means enabled; but we will include it for clarity).
    * These write operations should use a queue or guard (as in `CustomModesManager.queueWrite`) to serialize writes and avoid race conditions. After writing, the file watcher will pick up the change and trigger `onUpdate` – or call `onUpdate` directly after successful write to immediately sync UI.
  * **Execution API:** Implement `executePlugin(slug: string, input?: string): Promise<string>` to run a plugin on demand. This will:

    * Find the plugin by slug in the current list and ensure it’s `enabled`. If not found or disabled, throw or return an error message.
    * Spawn a child process to run the plugin:

      * If `plugin.location === "remote"` and `plugin.package` is defined, run: `npx -y ${plugin.package}`. Use `-y` to auto-confirm install if not cached. If the plugin expects input via STDIN, you could pipe `input` to the process; otherwise, just run it.
      * If `plugin.location === "local"` and `plugin.path` is defined, resolve the path (if relative, relative to workspace root) and run Node on it. For example: `node <plugin.path>` (assuming the script has a proper shebang or is a Node JS file). Alternatively `npx <plugin.path>` also works for local binaries/scripts.
    * Capture the process output. Listen to `stdout` and `stderr`. For a simple plugin contract, assume the plugin prints its result to STDOUT. Accumulate the output (or stream it if needed). On process exit, resolve with the captured output (or error). Use `outputChannel.appendLine` to log plugin outputs for debugging.

      * If the plugin exits with non-zero code or throws, surface that (e.g. include `stderr` in an error message to the user).
    * This method will allow both the extension’s internal logic and the UI (via messages or commands) to invoke plugins.
  * **Lifecycle Hooks:** Optionally, handle plugin installation/setup if needed:

    * For **install** (particularly for remote plugins): Since we rely on NPX, explicit installation might not be needed (NPX will fetch on first run). However, we could provide a convenience to pre-install a remote plugin (e.g. download it to cache) to avoid delay on first execution. This could be done by running `npm install -g <package>` or similar, but this is outside VSCode’s environment by default. Likely we skip explicit install and let NPX handle it.
    * For completeness, we treat “install plugin” as simply adding it to the manifest (and thus making it available). If a plugin requires additional setup, that can be handled within the plugin itself on run.
    * **Reload**: Exposed via UI as “Reload Plugins,” can simply call `loadPlugins()` and refresh state (essentially re-reading the manifest). But since file watching handles live updates, a manual reload command is mostly for safety. We will add a command for it (see below).
    * **Enable/Disable**: As noted, toggling `enabled` in the manifest effectively controls whether `executePlugin` will run it. Also, if plugins are integrated as AI tools (future), the `enabled` flag will control if the AI is allowed to use them.

* **`src/core/config/PluginsSchema.ts` (new):**
  Defines the JSON schema or Zod schema for plugin manifest entries. Using Zod (since the project uses it for other schemas) and TypeScript types:

  * Define a Zod object for a plugin entry, enforcing required and optional fields:

    * `slug: z.string()` (identifier, ideally alphanumeric/hyphen; we can enforce a regex for valid slug if desired).
    * `name: z.string()`.
    * `roleDefinition: z.string().optional()`.
    * `groups: z.array(z.string()).optional()` – list of group names (e.g. `"read"`, `"edit"`, etc.). We assume simple strings for now (if complex group definitions are needed (like in modes with fileRegex), we could allow union with an object schema, but keep it simple).
    * `customInstructions: z.string().optional()`.
    * `location: z.enum(["local","remote"])` – type of plugin.
    * `package: z.string().optional()` – required if location is "remote".
    * `path: z.string().optional()` – required if location is "local".
    * `enabled: z.boolean().optional()` – defaults to true if omitted.
  * Add a refinement or custom check: either `package` or `path` must be present according to `location`. For example, if `location==="remote"`, then `package` must be a non-empty string and `path` should be undefined; if `location==="local"`, then `path` must exist. This can be done with Zod `.superRefine` or by using a union of two schema variants for local vs remote plugin.
  * Also define the overall manifest schema, e.g.: `roopluginsSchema = z.object({ plugins: z.array(pluginEntrySchema) })`. If we expect the `.rooplugins` file to have a top-level `"plugins"` array, use this. (Alternatively, the file could just be an array of entries without a wrapping object – but using a wrapper object is consistent with how `.roomodes` contains `customModes` array, so we’ll do the same with `plugins` array.)
  * Export TypeScript types `RooPluginEntry` and `RooPluginManifest` from this schema (`z.infer<typeof pluginEntrySchema>` etc.) for use across the extension.

* **`src/shared/plugins.ts` (new):**
  Define shared interfaces/types for plugin data, to ensure the extension and webview use the same structure. For example:

  ```ts
  export interface RooPluginEntry {
    slug: string;
    name: string;
    roleDefinition?: string;
    groups?: string[];
    customInstructions?: string;
    location: "local" | "remote";
    package?: string;
    path?: string;
    enabled: boolean;
  }
  export interface RooPluginManifest {
    plugins: RooPluginEntry[];
  }
  ```

  These mirror the schema above. We mark `package` and `path` as optional in the type, with the understanding (documented via comments) that exactly one will be defined based on `location`. This interface will be used when sending data to the webview and for intellisense (it can also be referenced in a JSON schema).
  Also, consider adding a brief description for each field as JSDoc, since this may be transformed into the JSON schema for editor hinting:

  * `slug`: Unique identifier (used in code/invocations).
  * `name`: Human-friendly name.
  * `roleDefinition`: A description of the assistant’s role when this plugin is active (could be used in system prompts).
  * `groups`: Categories or tool groups this plugin belongs to or can operate in (e.g. contexts in which it’s available).
  * `customInstructions`: Additional instructions or guidance for using this plugin.
  * `location`: `"remote"` for an NPM-based plugin, `"local"` for a local script.
  * `package`: NPM package name (if remote).
  * `path`: File path to script (if local, relative to workspace or absolute).
  * `enabled`: Whether the plugin is active/enabled.
    These comments can be included in the JSON schema for better documentation in IntelliSense.

### Updated Files (Extension)

* **`src/core/webview/ClineProvider.ts` (updated):**
  Integrate the `PluginManager` into the main extension provider so that plugin state is loaded and synchronized with the UI:

  * **Properties:** Add a property `public pluginManager: PluginManager` to the class. Instantiate it in the constructor similar to `customModesManager`. For example:

    ```ts
    this.pluginManager = new PluginManager(this.context, async () => {
      await this.postStateToWebview();
    });
    ```

    This ensures that whenever the plugin manifest changes, the UI state is refreshed (the `postStateToWebview()` will send an updated state message to the webview). Add the necessary import for `PluginManager`.
  * **Dispose:** In the `dispose()` method, call `this.pluginManager.dispose()` to clean up watchers. For parity with custom modes, ensure to handle `pluginManager` existence safely (e.g. `this.pluginManager?.dispose()` before logging “Disposed all disposables”).
  * **State Integration:** Update `getStateToPostToWebview()` (or `getState()`) to include the current plugin list. The extension’s state object sent to the webview should have a new property, say `plugins: RooPluginEntry[]`. For example:

    ```ts
    const plugins = await this.pluginManager.getPlugins();
    return {
       ...otherState,
       plugins,
       settingsImportedAt: this.settingsImportedAt,
       // etc.
    }
    ```

    Ensure this `plugins` property is included in the object returned and thus in the `ExtensionState`. After this change, whenever `postStateToWebview()` is called, the webview will receive the full state including the plugin list.
  * **Global State (if used):** If we decided to store plugins in `context.globalState`, the PluginManager will have updated it on file changes. In `getState()`, if you gather values from `contextProxy` or `globalState` for custom modes, do the same for plugins. For example, `const pluginList = context.globalState.get<RooPluginEntry[]>("plugins")`. However, since we have `PluginManager.getPlugins()` reading from file directly, using that is sufficient (and ensures we always have the latest from disk).
  * **Commands to run plugin (optional):** We may add a convenience method in ClineProvider to execute a plugin by slug, which simply calls `this.pluginManager.executePlugin(slug, input)`. This can be used if the AI or UI requests a plugin run. (If plugins are used as tools in AI, the invocation might come through a message – see **WebviewMessage** below.)

* **`src/extension.ts` (updated):**
  Register any new commands and ensure activation covers plugin setup:

  * Confirm that creating the `ClineProvider` (which we do at activate) will instantiate PluginManager as above. This means plugin system is ready as soon as the webview is registered.
  * **Commands:** Add VS Code commands for plugin lifecycle actions:

    * `"roo-scheduler.reloadPlugins"` – triggers a manual reload of the plugin manifest. Implement by calling `provider.pluginManager.loadPlugins()` and then `provider.postStateToWebview()`. This is similar to the existing `"schedulesUpdated"` command which triggers a state refresh. Only needed if hot-reload doesn’t catch something or for user to force refresh.
    * `"roo-scheduler.openPluginsManifest"` – optional, opens the `.rooplugins` file in the editor for manual editing. Use `vscode.workspace.openTextDocument` and `vscode.window.showTextDocument` on the manifest path. (This can be a fallback for advanced users who prefer editing JSON directly instead of the UI forms.)
    * `"roo-scheduler.addPlugin"` – optional, to launch the Plugin Wizard from outside (though if the UI covers this, we might not need a separate command).
    * Register these with `commands.registerCommand` and push to context.subscriptions. Only add those needed; the UI will mostly drive actions via messaging, but having commands (especially open manifest) can be useful.
  * **Activation Events:** In `package.json`, ensure there’s an activation event for the above commands if added. Also consider adding an activation event on opening a `.rooplugins` file, e.g. `"onLanguage:json"` or `"onFileSystem:.rooplugins"` if we want the extension to activate when the manifest is opened. However, since the extension likely activates on startup or when the Roo view is shown, this might not be necessary.

* **`src/shared/ExtensionMessage.ts` (updated):**
  Extend the definition of the extension-to-webview message and state to include plugins:

  * Add `plugins: RooPluginEntry[]` to the `ExtensionState` interface type that is sent to the webview. The `ExtensionState` type is likely derived from `GlobalSettings` plus additional fields. We should include plugins similarly. For example, if `ExtensionState` is defined via an intersection, update it to:

    ```ts
    export interface ExtensionState /* extends GlobalSettings, etc */ {
      // ... other fields ...
      customModes: ModeConfig[];
      plugins: RooPluginEntry[];  // new
    }
    ```

    In the code, since we attach `plugins` in `getStateToPostToWebview()`, it will show up in `message.state`. We need to ensure the front-end’s TypeScript knows about it. If `ExtensionState` is not explicitly defined, we might define it now or extend an existing interface. (In the test, they import `ExtensionState` from here, so we should update it.)
  * If there are specific messages for plugin actions from extension to UI (likely not, since we rely on full state sync), we can add new `ExtensionMessage` types:

    * e.g. `{ type: "pluginsUpdated", plugins: RooPluginEntry[] }` if we wanted a targeted message. But since we use the full `state` message, that suffices. We might still include a simpler message type for certain interactions (like confirm plugin ran).
  * Document that `ExtensionMessage.type: "state"` will carry the updated `plugins` list in the `state` payload.

* **`src/shared/WebviewMessage.ts` (updated):**
  Define messages from the webview to the extension for plugin management. We need to handle user interactions like toggling, adding, or removing plugins:

  * Add new message types or extend existing ones for plugin events. For example, if we use a unified approach, we can define a field like `message.type = "plugin"` with a sub-action, or simply distinct types. Proposed messages:

    * `{ type: "plugin-add", plugin: Partial<RooPluginEntry> }` – when the user submits the Add Plugin form. The `plugin` object might contain fields from the form (except perhaps `enabled` which defaults true). The extension will complete any missing fields (e.g. add `enabled: true`, or fill in default groups if needed) and call `PluginManager.addPlugin()`. After adding, it can either rely on the file watcher to update UI or proactively call `postStateToWebview()`.
    * `{ type: "plugin-remove", slug: string }` – user clicked remove. Extension calls `PluginManager.removePlugin(slug)`.
    * `{ type: "plugin-toggle", slug: string, enabled: boolean }` – user toggled enable/disable. Extension sets the flag via `PluginManager.togglePlugin(slug, enabled)`.
    * `{ type: "plugin-edit", plugin: RooPluginEntry }` – if editing an existing plugin’s details (aside from enable), we might treat it similar to remove+add (or have a direct edit method). Likely easiest is to remove the old entry (by slug) and add the updated one.
    * `{ type: "plugin-run", slug: string }` – user clicked a “Run Plugin” action (if provided in UI for testing). Extension will invoke `PluginManager.executePlugin(slug)` and then return the output. The result could be sent back as another message, e.g. `{ type: "plugin-result", slug, output }` to display to the user.
  * Update the TypeScript definition `WebviewMessage` union to include these variants. For example:

    ```ts
    type WebviewMessage = 
      | { type: "plugin-add"; plugin: Omit<RooPluginEntry,"enabled"> & { enabled?: boolean } }
      | { type: "plugin-remove"; slug: string }
      | { type: "plugin-toggle"; slug: string; enabled: boolean }
      | { type: "plugin-run"; slug: string };
    ```

    (We can omit `enabled` in add if we assume new plugins are enabled by default, or allow it explicitly.)
  * The extension side needs to handle these in the message listener. If there is a central `webviewMessageHandler` function, extend it:

    * On `"plugin-add"`, construct a plugin entry and call `pluginManager.addPlugin`.
    * On `"plugin-remove"`, call `pluginManager.removePlugin`.
    * On `"plugin-toggle"`, call `pluginManager.togglePlugin`.
    * On `"plugin-run"`, call `pluginManager.executePlugin` and then possibly send a follow-up message with the result (the handler can use `postMessageToWebview` to send a message of type "pluginResult" or perhaps simply print it to the output channel and let the user see it).
  * Ensure to `await` these calls as needed (they return Promises). If any error occurs (e.g. JSON parse error, or plugin script error), catch it and use `vscode.window.showErrorMessage` or send an error back to UI so the user is informed.

* **`src/shared/globalFileNames.ts` (updated):**
  If this file lists names of config files (we saw an entry for `custom_modes.json`), add an entry for the plugin manifest. For example:

  ```ts
  GlobalFileNames.plugins = "plugins.json";  
  ```

  This would be used if we decide to store a global fallback or just for consistency. If `.rooplugins` is always in the workspace, this may not be critical. Alternatively, add a constant for the manifest filename:

  ```ts
  export const PLUGIN_MANIFEST_FILENAME = ".rooplugins";
  ```

  and use that in `PluginManager` to avoid hardcoding the string in multiple places.

* **`package.json` (updated):**
  Update the extension manifest to support the plugin system:

  * **JSON Schema Association:** Provide a JSON schema for the `.rooplugins` file to improve user experience when editing it directly. Under `"contributes.jsonValidation"`, add an entry:

    ```json
    {
      "fileMatch": ["**/.rooplugins"],
      "url": "./schemas/rooplugins-schema.json"
    }
    ```

    This associates our schema with any file named `.rooplugins`. The schema file (we will create `rooplugins-schema.json`) should be included in the extension package (e.g. placed in a `schemas` or `assets` folder and listed in `package.json` files to pack).

    * The JSON schema should include definitions for all plugin fields, marking `slug`, `name`, and `location` as required, and either `package` or `path` as conditionally required. We can generate this schema from the Zod schema or write it manually. For example, use an `oneOf` or `anyOf` in JSON Schema to enforce the mutual exclusivity of `package`/`path` based on `location`. Also include descriptions for each field from our interface JSDocs.
    * This will enable IntelliSense in the JSON editor for `.rooplugins` (autocomplete suggestions for fields and validation errors).
  * **Language Association (if needed):** If VS Code does not automatically treat `.rooplugins` as JSON, we might need to ensure the file is recognized as JSON. This can be done by adding:

    ```json
    "contributes": {
      "languages": [
        {
          "id": "rooplugins-json",
          "aliases": ["RooPlugins JSON"],
          "filenames": [".rooplugins"],
          "configuration": ""
        }
      ]
    }
    ```

    and possibly a `"grammars"` entry mapping it to JSON grammar. However, since we use `jsonValidation`, VS Code will likely infer it as JSON when the schema is applied. We can test this – if not recognized, instruct users to manually select JSON. (This step is optional; main point is the schema for validation).
  * **Commands:** If we added commands like `reloadPlugins` or `openPluginsManifest`, declare them in `contributes.commands` with title and category (e.g. category "Roo Code: Plugins"). For example:

    ```json
    "commands": [
      { "command": "roo-scheduler.reloadPlugins", "title": "Reload Roo Plugins" },
      { "command": "roo-scheduler.openPluginsManifest", "title": "Open Plugins Manifest (.rooplugins)" }
    ]
    ```

    And if needed, add a keybinding or context menu (not strictly required).
  * **Activation Events:** Add entries like `"onCommand:roo-scheduler.reloadPlugins"` etc., so that these commands can trigger activation if extension isn’t already active.
  * **ensure packaging**: Include the schema file in the extension bundle (e.g., not excluded by `.vscodeignore`). If we created new source files (`PluginManager.ts`, etc.), ensure they are compiled (if using webpack or tsc, they will be). The `webview-ui` likely has its own build, but adding new UI components will be covered in front-end.

### Testing & Verification (Backend)

* **Unit Tests:** Create tests under `src/core/config/__tests__/PluginManager.test.ts` (new) to verify:

  * Reading a well-formed `.rooplugins` file yields correct `RooPluginEntry[]`.
  * Invalid JSON or schema violations trigger an error message (simulate by feeding bad JSON to `loadPlugins()`).
  * Adding, removing, toggling plugins updates the JSON file content as expected. You can use a temp file or in-memory FS (perhaps abstract file operations for testability, or use Node’s `fs` on a temp directory).
  * `executePlugin`: This is tricky to unit-test without an actual script. Use a dummy Node script (e.g. create a file that just `console.log("hello")`) and point PluginManager to it. Then verify that `executePlugin` returns `"hello\n"`. For remote, you might mock the `npx` call or use a lightweight package (if network is accessible in test). Since this is an implementation plan, just note that we should test that the output capture and error handling works. Perhaps include a plugin that exits with code 1 to see if we catch the error.
* **Integration Test:** If possible, simulate the extension context:

  * Open a workspace folder in a test with a sample `.rooplugins` containing a known plugin (like a local script that writes a file or prints text). Activate the extension (or call `activate()` function in a test context), then programmatically modify the `.rooplugins` file and ensure `context.globalState` or the PluginManager’s state updates. Verify that `postStateToWebview` would send updated plugin list (perhaps spy on `postMessageToWebview`).
  * Test that disabling a plugin (enabled=false) causes `executePlugin` to skip it (e.g. returns an error or does nothing).
* **Manual Testing:** After implementation, manually try:

  1. Create a `.rooplugins` file in a workspace with a “Hello World” plugin entry (see example below). Open the Roo Code sidebar – it should load without errors. The plugin should appear in the UI list.
  2. Toggle the plugin off and on, ensure the `.rooplugins` file updates (check disk) and the UI reflects the change.
  3. Use the “Run” button (or a test command) to execute the plugin. For a local plugin, see that its output appears (perhaps in the chat or output panel). For a remote plugin, try an NPM package (for example, a trivial one that prints a message).
  4. Edit the `.rooplugins` file manually (e.g. add a new plugin entry or change a field) and save – the UI should auto-update (hot reload).
  5. Try the Plugin Wizard UI to add a new plugin and verify it creates the entry (and file if local) correctly.

### Hello World Plugin Example

As a concrete example, consider a **Hello World plugin** implemented both as a local script and as a remote package:

* **Local script example:**
  Create a file `hello-plugin.js` in the workspace (for example, under `.roo/plugins/hello-plugin.js`). Content:

  ```js
  console.log("Hello from Roo Plugin!");
  ```

  In `.rooplugins`, add:

  ```json
  {
    "plugins": [
      {
        "slug": "hello-plugin",
        "name": "Hello World Plugin",
        "roleDefinition": "A simple plugin that greets the world.",
        "groups": ["command"],
        "customInstructions": "Simply prints a greeting to demonstrate plugin execution.",
        "location": "local",
        "path": ".roo/plugins/hello-plugin.js",
        "enabled": true
      }
    ]
  }
  ```

  When the user runs this plugin (via the UI or a command), the extension will execute `node .roo/plugins/hello-plugin.js`. The script’s STDOUT “Hello from Roo Plugin!” will be captured. The extension could then display it in the Roo output channel or insert it into the chat conversation (for instance, as an assistant message). This verifies that local plugin execution works.

* **Remote (NPM) example:**
  Suppose an NPM package `@ruv/hello-roo` exists which, when run, prints “Hello from Roo (via NPX)”. The manifest entry would be:

  ```json
  {
    "slug": "hello-roo-npx",
    "name": "Hello Roo (NPX)",
    "roleDefinition": "An example remote plugin that greets via NPX.",
    "groups": ["command"],
    "customInstructions": "This plugin is fetched and run via npx to print a greeting.",
    "location": "remote",
    "package": "@ruv/hello-roo",
    "enabled": true
  }
  ```

  The extension will run `npx -y @ruv/hello-roo`. On first run, NPX will download the package (which should have a CLI that prints the message). Subsequent runs use cache. The output “Hello from Roo (via NPX)” is captured similarly.
  This demonstrates that remote plugins can be used without installing them into the extension permanently.

These examples should be included in documentation for users (perhaps in the extension README or in an inline help in the Plugin Wizard).

### File Tree Updates (Backend)

Below is a summary of new and modified files in the extension for the plugin system:

```plaintext
src/
├─ core/
│  ├─ config/
│  │  ├─ PluginManager.ts          (new) – Plugin system backend logic
│  │  ├─ PluginsSchema.ts          (new) – Zod schema & types for .rooplugins
│  │  └─ CustomModesManager.ts     (unchanged, for reference)
│  └─ webview/
│     └─ ClineProvider.ts         (updated) – initialize PluginManager, include plugins in state
├─ shared/
│  ├─ plugins.ts                  (new) – PluginEntry interface definitions
│  ├─ ExtensionMessage.ts         (updated) – add plugins in ExtensionState
│  ├─ WebviewMessage.ts           (updated) – define plugin-related message types
│  └─ globalFileNames.ts          (updated) – add .rooplugins filename constant
├─ extension.ts                   (updated) – register plugin commands, ensure activation covers plugins
├─ schemas/
│   └─ rooplugins-schema.json     (new) – JSON Schema for .rooplugins files (for editor validation)
└─ package.json                   (updated) – contributes jsonValidation for .rooplugins, new commands, etc.
```

## Frontend (Webview UI) Implementation

The Roo Code extension’s webview is a React app (the `webview-ui` bundle) that renders a sidebar with chat, settings, etc. We will integrate a **Plugins management UI** into this webview, specifically in the Settings panel.

### Updated Context and State Management

* **`webview-ui/src/context/ExtensionStateContext.tsx` (updated):**
  This React context holds the extension state sent from the extension and provides setter functions. We need to include `plugins` in this state:

  * Extend the `ExtensionStateContextType` interface to include the plugins list and relevant setter:

    ```ts
    interface ExtensionStateContextType extends ExtensionState {
      // ... existing fields ...
      plugins: RooPluginEntry[];              // new: current plugins list
      setPlugins: (plugins: RooPluginEntry[]) => void;  // new: state updater for plugins
      // possibly no direct setter needed if we update via state sync only
    }
    ```

    (We import `RooPluginEntry` from the shared types we created.) If `ExtensionState` is imported from extension types and already has plugins, this might be automatically in `ExtensionStateContextType` after updating the types.
  * Initialize the plugins state in the context provider. In the initial `useState`, set `plugins: []` by default.
  * In the `useEvent("message", ...)` handler that listens for extension messages, handle the `type: "state"` case. The code likely merges new state into context using something like `mergeExtensionState`. Ensure that when a new `state.plugins` comes in, it replaces the current `plugins` state:

    ```ts
    case "state": {
      const newState = message.state!;
      setState(prev => ({
        ...prev,
        ...newState,
        plugins: newState.plugins ?? prev.plugins
      }));
      break;
    }
    ```

    If a `mergeExtensionState` utility exists, update it to merge arrays properly (e.g. fully replace `customModes` and `plugins` arrays).
  * Provide a setter function `setPlugins`: e.g. `setPlugins: (value) => setState(prev => ({ ...prev, plugins: value }))`. This might not be heavily used because plugin state mostly comes from extension messages, but if the UI needs to optimistically update (e.g. immediately remove an item from list before extension confirms), we could use it.
  * With this in place, any state update from the extension (triggered by `postStateToWebview`) will refresh the `plugins` array in the React app.

### Settings Panel UI Integration

* **`webview-ui/src/components/settings/SettingsView.tsx` (updated):**
  Incorporate a new section in the Settings view for Plugins. Assuming `SettingsView` is a panel showing various configuration (like API keys, toggles, etc.), we will add a Plugins management UI here:

  * Import the `useExtensionState` context to get `plugins` and possibly `setPlugins`.
  * Structure: Add a subsection, perhaps under a heading "Plugins". For example:

    ```jsx
    <h2>Plugins</h2>
    {plugins.length === 0 ? (
      <p>No plugins installed.</p>
    ) : (
      <PluginList plugins={plugins} />
    )}
    <Button onClick={handleAddPlugin}>Add Plugin</Button>
    ```

    Use VS Code’s design language (maybe the webview UI toolkit or custom styling) to make it consistent.
  * **PluginList:** We can either implement inline or as a separate component for clarity. Likely, create a `<PluginList>` component (see below) that renders each plugin entry with controls.
  * **Add Plugin button:** When clicked, open the Plugin Wizard UI. This could toggle an “adding” mode in the SettingsView state to show a form, or navigate to a dedicated wizard component overlay. Simpler: within SettingsView, conditionally render an `<PluginWizard onSubmit={...} onCancel={...} />` below the list when `addingPlugin` state is true. Another approach is to have the button send a message to extension to scaffold a default plugin immediately (but better to gather info first).
  * If space in SettingsView is limited or we want a separate full-screen (within webview) experience, we could open a modal. But implementing a modal in a webview React might require adding a simple overlay div with absolute positioning. We can do that if needed for multi-step wizard.
  * For now, plan a simple approach: clicking "Add Plugin" replaces the list with a form (or pushes a new view component) where the user enters details.

* **`webview-ui/src/components/plugins/PluginList.tsx` (new):**
  Displays the list of plugins and controls for each:

  * Props: `{ plugins: RooPluginEntry[] }` (and maybe handlers, though we can also use context and send messages directly).
  * For each plugin in the list, render a row with:

    * **Name & description:** Show plugin name (bold) and maybe slug or a short description. Could also show `roleDefinition` truncated or in a tooltip/popover for more info.
    * **Enable toggle:** A switch or checkbox bound to plugin.enabled. Use a component (maybe a Toggle from VSCode webview UI toolkit if included, or a simple `<input type="checkbox">`). When toggled, call a handler `onToggle(plugin, newValue)`.
    * **Actions:** Buttons or icons for Edit, Remove, and possibly Run:

      * Edit (pencil icon): triggers editing mode (e.g. opens the Plugin Wizard pre-filled with this plugin’s data).
      * Remove (trash icon): sends a remove message immediately.
      * Run (play icon): optional, to test run the plugin. Especially useful for a Hello World plugin to see output.
    * We may reuse VS Code icons (codicons) for these actions (ensure codicon stylesheet is loaded – it is referenced in the webview HTML).
  * Handlers:

    * `handleToggle(plugin, enabled)`: uses `vscode.postMessage({ type: "plugin-toggle", slug: plugin.slug, enabled })`. Also, optimistically update UI state via `setPlugins` to reflect the new toggle (the extension will send back updated state as well, but doing it immediately makes UI snappier).
    * `handleRemove(plugin)`: confirm with user (maybe a simple `window.confirm` or a custom dialog) then `vscode.postMessage({ type: "plugin-remove", slug: plugin.slug })`. Optimistically filter it out of local state or rely on state refresh from extension (which should happen almost immediately via file watch & postState).
    * `handleEdit(plugin)`: set a state like `editingPlugin = plugin` in parent (SettingsView) to show the PluginWizard with this plugin’s data.
    * `handleRun(plugin)`: `vscode.postMessage({ type: "plugin-run", slug: plugin.slug })`. Also, you might display a loading indicator while waiting for a response. The extension will run it and possibly send back a `plugin-result` message. We should listen for that message:

      * In the context’s message listener (ExtensionStateContext or maybe a dedicated hook), handle `{type: "plugin-result"}` if we implement it. For now, perhaps simpler: the extension could use `vscode.window.showInformationMessage` to show the output, which would appear natively. But a cleaner way is to handle it in UI: maybe show the output below the plugin entry or in a toast. We can add a piece of state like `lastRunOutput[slug] = "...output..."` and display it. This is an enhancement – initial version can log to console or output channel.
  * The PluginList component is mostly presentational plus sending messages; it can be placed inside SettingsView.

* **`webview-ui/src/components/plugins/PluginWizard.tsx` (new):**
  Provides a form UI to add a new plugin or edit an existing one. This could be the same component used for both **Add** and **Edit** modes, populated with defaults or existing values:

  * Fields to input:

    * **Name:** Text input.
    * **Slug:** Text input (perhaps auto-generated from Name but allow editing). Validate uniqueness against existing slugs (we can warn if duplicate).
    * **Location:** Radio buttons or dropdown for “Remote (NPX package)” vs “Local (Node script)”.
    * **Package:** Text input, visible only if “Remote” selected (for npm package name).
    * **Path:** File picker or text input, visible only if “Local” selected. We can provide a button to choose a file from the workspace – however, a webview cannot directly access the filesystem. We can implement a file picker via VS Code API: send a `vscode.postMessage({ type: "invoke", invoke: "openFileDialog" })` and have the extension respond (the extension can handle a custom `openFileDialog` invoke message by using `window.showOpenDialog`). Alternatively, instruct user to put a script in a known folder and just enter the path. For scaffolding a new local plugin, we might not need the user to pick a file – we can decide to create a new file for them.
    * **Role Definition:** Large textarea for roleDefinition. (Could be optional – advanced use.)
    * **Groups:** Multi-select or text input for groups (e.g. comma-separated). Perhaps provide checkboxes for known tool groups (“read”, “edit”, “browser”, “command”, “mcp”, “modes” as seen in code). Users can pick which contexts the plugin applies to. This might guide the AI’s usage of the plugin (if integrated), but for now it’s metadata.
    * **Custom Instructions:** Textarea for any extra instructions.
    * We may exclude `enabled` (it will default to true on creation).
  * If editing an existing plugin, load its current values into these fields. If adding new, some fields can have placeholders (e.g. slug placeholder derived from name, groups default maybe empty or a guess like \["command"]).
  * **Scaffolding local plugin file:** If the user selects “Local” and it’s a new plugin (not editing), we can provide an option “Create new script” versus “Use existing script”. For simplicity, assume we always create a new one in a standard location:

    * We can choose a folder like `.roo/plugins/` in the workspace. Ensure it exists (extension could create it when needed via PluginManager or here).
    * The filename can be derived from slug (e.g. `<slug>.js`). The wizard can display the resolved path for confirmation.
    * The content for a new plugin file: we can insert a boilerplate code, e.g. a simple template:

      ```js
      // Roo Code Plugin: <Name>
      // This plugin currently just prints a greeting. Modify it as needed.
      console.log("Hello from <Name> plugin!");
      ```

      Or if more advanced, we might include how to receive input via arguments or STDIN. For now, a static message is fine.
    * After submission, the webview sends a message to extension to actually create the file and update the manifest.

      * Perhaps extend our `WebviewMessage` with `{ type: "plugin-create-script", slug, content }` or simply include in "plugin-add" an indicator that a file should be created.
      * However, it might be easier: the extension on receiving "plugin-add" with a local plugin and a `path` that doesn’t exist could create the file automatically (since it has FS access). We can implement that: in handling plugin-add, if `location==="local"`:

        * If the given `path` is not found, use `fs.writeFile` to create it with a basic template (the extension knows `name` from payload and can craft a greeting message or a commented template including `roleDefinition` perhaps).
        * If the path is relative (like `.roo/plugins/slug.js`), resolve it relative to workspace root. Ensure the directory exists (`fs.mkdir` if necessary).
      * Notify the user (maybe via `showTextDocument`) that the file was created so they can edit it.
    * If using an existing file, the user would type the path manually (or we implement an open dialog). We can skip that complexity by always creating new (the user can always edit the file later if they want custom logic).
  * **Submit/Cancel:** The wizard will have “Create/Save” and “Cancel” buttons.

    * On Cancel, simply close the form (in SettingsView, set `addingPlugin=false` or `editingPlugin=null`).
    * On Create/Save, validate inputs (ensure required fields are filled, etc.). Then send `vscode.postMessage`:

      * If adding new: `{ type: "plugin-add", plugin: { slug, name, roleDefinition, groups, customInstructions, location, package?, path? } }`. The extension will handle creation (and possibly file scaffold).
      * If editing existing: we could send a `plugin-remove` for the old slug (if slug changed) then `plugin-add` for new, but to reduce flicker, we might instead have a dedicated `plugin-edit` message. We can implement `plugin-edit` for atomic update:

        * Extension handling: find plugin by slug, update its fields, write file. If the slug is changed, it might treat it as removal+add under the hood (ensuring any running state or references are updated).
      * The extension after updating manifest will send back the new full plugin list state, updating the UI.
    * After sending the message, we can optimistically close the form (back to list view). The new plugin will appear in the list once state syncs.
  * In edit mode, if the user changes `location` from local to remote or vice versa, we might handle that carefully (e.g. if switching to local, we might ask if they want to create a new script file).
  * **UI/UX considerations:** Use existing UI components from Roo Code’s toolkit if available (buttons, text fields). If none, basic HTML inputs styled via provided CSS (the React app likely includes styles for forms).
  * **Wizard as separate view:** Alternatively, we could implement the wizard in a separate component and navigate to it (like how there is `PromptsView` for custom modes). If we mimic that pattern:

    * Add a `PluginsView` component that is similar to PromptsView in structure, showing the list and allowing add/edit. But since the question specifically frames it in the settings panel, we’ll keep it within SettingsView to avoid adding another sidebar icon or navigation.
    * If the app has a multi-view state (like `showSettings`, `showPrompts`), adding another might complicate UI flow. So integrating in SettingsView is straightforward.

### Handling Plugin Messages in UI

* The UI will send plugin messages via `vscode.postMessage`. We need to ensure the extension handler (in `webviewMessageHandler`) is set up as above. On the UI side:

  * The `vscode` object is likely exposed (they have `import { vscode } from "../utils/vscode"` which wraps `acquireVsCodeApi()`). We use `vscode.postMessage({...})` to send.
  * After the extension processes an add/remove/toggle, it will send a fresh `state` message. The ExtensionStateContext listener will merge the new state, thus updating the `plugins` in context and causing React to re-render the list with latest data.
  * For immediate feedback, we also update UI state optimistically as noted (especially for toggle and remove).
  * If we implement a `plugin-result` message for runs: in `ExtensionStateContext.useEvent`, add:

    ```ts
    case "plugin-result": {
       const { slug, output } = message;
       // Perhaps store in a state map or simply show an alert:
       alert(`Plugin "${slug}" output:\n${output}`);
       break;
    }
    ```

    A nicer UI could be showing the output in the chat or a dedicated area, but an alert or modal dialog might suffice for initial implementation to confirm it worked. (Alternatively, the extension could just use `showInformationMessage`, which would display in VSCode UI outside the webview.)
  * If a plugin-add fails due to validation (extension will show error), we might not get a state update. We could enhance by having the extension send a message `{ type: "plugin-add-failed", error: "..."};` the UI can then show a notification. This is an optional detail.

### Frontend File Tree Updates

```plaintext
webview-ui/
├─ src/
│  ├─ context/
│  │  └─ ExtensionStateContext.tsx       (updated) – include plugins in state
│  ├─ components/
│  │  ├─ settings/
│  │  │   └─ SettingsView.tsx           (updated) – add Plugins section, handle add/edit
│  │  └─ plugins/                       (new directory for plugin UI components)
│  │       ├─ PluginList.tsx            (new) – list each plugin with controls
│  │       └─ PluginWizard.tsx          (new) – form interface for adding/editing plugins
│  └─ utils/vscode.ts                   (possibly unchanged, used for postMessage)
└─ ... (other components like PromptsView, ChatView unchanged)
```

### Testing & Verification (Frontend)

* **Manual UI testing:** Launch the extension with the updated webview:

  1. Open the Roo Code sidebar, click the Settings gear (or however SettingsView is accessed – possibly via a settings button action, which triggers `settingsButtonClicked` and shows SettingsView). The SettingsView should now include the Plugins section.
  2. If no plugins in manifest, verify it shows “No plugins installed” (or similar message).
  3. Click “Add Plugin”. The PluginWizard form should appear. Fill in a test plugin:

     * For remote: e.g. Name "Test Remote", Slug "test-remote", Location = Remote, Package = some package (perhaps use `npm pacote` or a fake one if not actually installing, since we just want to see it appear). Submit. The form should disappear and the new plugin should list with enabled toggle on. Check that `.rooplugins` file was updated correctly and that no errors occurred.
     * For local: e.g. Name "Test Local", Slug "test-local", Location = Local. Submit. The extension should create a file (check the workspace `.roo/plugins/test-local.js`) and the new plugin shows up. Also verify the file was opened or at least exists with the template content.
  4. Test toggling the new plugins off and on via the UI; the switch should respond and the `.rooplugins` file’s `enabled` flag updates.
  5. Test Remove: remove one of the plugins via the UI. It should disappear from the list. Confirm the manifest no longer has that entry and no errors.
  6. Test Edit: add another plugin or reuse one, click Edit (pencil). The form should appear pre-filled. Change some fields (e.g. name or groups), submit. The list should update that entry accordingly. If slug was changed, ensure the old slug entry was replaced.
  7. Test Run: if a plugin is runnable (like our Hello World), click the Run (play) button. Expect to see an alert or message with the output. If none, check the VS Code output channel for the plugin output. Adjust handling if needed.
  8. Also test that if the manifest is edited outside (open the file manually and add an entry), the UI updates. For example, add a plugin in the JSON and save – the PluginManager’s file watcher should trigger a state update and the new entry should appear in the list (perhaps without a fancy name if fields missing, but as per the file).
* **Edge cases:** Try adding a plugin with a duplicate slug via UI – the extension should ideally reject it (we could have PluginManager check slug uniqueness on add and throw). Make sure an error is shown (likely via `showErrorMessage`). The UI might not automatically convey that, so ensure the user sees it (maybe it’s fine if VS Code shows the error natively). The entry should not appear.
* **Responsiveness:** The webview should handle a reasonable number of plugins. If many, ensure the list is scrollable. The design should remain user-friendly.
* **Internationalization:** If the extension uses i18n (`t()` function in extension, and likely JSON for UI text), we should add any user-facing text ("Plugins", "Add Plugin", etc.) to the localization files.

## Summary and Additional Notes

With this plan, the Roo Code VSCode extension will support hot-reloadable plugins defined in a `.rooplugins` manifest. The backend handles reading the manifest, executing plugin scripts via NPX/Node, and syncing state. The frontend provides a user-friendly way to manage plugins entirely within the VSCode sidebar UI.

By following the above steps, we ensure:

* **Hot Reload:** Changes to `.rooplugins` or plugin files reflect immediately without restarting the extension (achieved via file watchers and state synchronization).
* **Manifest Structure:** A clear JSON format for plugins with schema validation and TypeScript interfaces to avoid mistakes.
* **Lifecycle Management:** Users can add new plugins (with optional scaffolding of script files), enable or disable them on the fly, reload if needed, and remove them. All these update the manifest file so they are persisted.
* **UI Integration:** The Settings panel now includes a plugin manager interface with toggles and an interactive wizard, making plugin management accessible to non-technical users as well.
* **Hello World Verification:** A sample Hello World plugin has been demonstrated in both local and remote forms, ensuring that the execution pipeline (NPX and Node processes) works and that output can be captured and shown to the user.

Finally, as the plugin system matures, we can integrate plugin functionality deeper into Roo’s AI workflow. For example, the `roleDefinition` and `customInstructions` of enabled plugins could be injected into the AI’s system prompt or conversation context, and the AI agent could be allowed to invoke plugins as tools (perhaps by outputting a special command that Roo intercepts and runs `executePlugin`). This would unlock dynamic, extensible behaviors for the AI assistant. For now, the groundwork laid by this implementation plan focuses on the core architecture and user-facing controls, ensuring the plugin system is robust and user-friendly.
