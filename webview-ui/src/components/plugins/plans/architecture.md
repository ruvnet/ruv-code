Great. I’ll outline the full implementation steps for a plugin system in Roo Code that uses NPX to install and run both local and remote plugins, managed through a `.rooplugins` config file, and includes a UI component for configuration, discovery, and a plugin wizard.

I’ll define:

* The `.rooplugins` JSON structure and plugin metadata
* How NPX integration should work for remote/local sources
* Automatic updates to the Roo UI
* The plugin configuration panel with settings-style interface
* A guided plugin creation wizard (scaffold, edit, test, save)

I’ll return with a step-by-step architectural and implementation breakdown.


# Roo Code Plugin System Implementation Plan

## Architecture Overview and Goals

The plugin system will extend the Roo Code environment to support **user-defined plugins** that can run either as remote packages (fetched via NPX at runtime) or as local modules for development and private use. The design follows a pattern similar to Roo Code’s custom modes and MCP (Model Context Protocol) configuration, ensuring plugins are defined declaratively and integrated seamlessly. Key architectural components include:

* **Plugin Manifest (.rooplugins)** – A JSON config file (per project or global) listing all plugins and their metadata (slug, name, role, etc.), analogous to how `.roomodes` and `mcp.json` define custom modes and MCP servers.
* **Extension Core (Plugin Manager)** – The VS Code extension backend will have a Plugin Manager module to parse the manifest, install/initialize plugins, spawn plugin processes (for NPX or local code), and handle inter-process communication.
* **Roo UI Integration** – The webview UI will provide a **Plugins panel** (mirroring the settings panel style) to list and manage plugins. Changes via UI (installing, enabling, removal) update the manifest and reflect immediately, and vice versa. A **Plugin Wizard** is included for guided plugin creation.
* **Isolation and Consistency** – Each plugin runs in a **sandboxed context** (separate Node process) to avoid dependency conflicts or crashes affecting the extension. The system will maintain consistent behavior whether actions are triggered via the UI or via CLI/commands, ensuring a unified experience.

This architecture ensures plugins can extend Roo Code’s capabilities (e.g. new tools or agent behaviors) while keeping the core stable and secure.

## Plugin Manifest File (`.rooplugins`) and Structure

Each project (or the user’s global config) will contain a `.rooplugins` JSON file enumerating available plugins. This manifest is structured similarly to `.roomodes` and `.roo/mcp.json`, using a clear schema for each plugin entry. For example, it may use a top-level key like `"plugins"` pointing to an array of plugin definitions. Each plugin object includes fields such as:

* **`slug`** – A unique identifier for the plugin (lowercase, no spaces). This acts as the key for referencing the plugin internally.
* **`name`** – Human-friendly name for display in the UI.
* **`roleDefinition`** – A description of the plugin’s role or purpose. This is akin to a mode’s role definition – it can inform the AI agent what the plugin does or represent the plugin’s “persona” if it provides an AI capability. For example, a plugin could define *“You are a GitHub Issue Manager plugin that can create and manage GitHub issues via the API”*.
* **`groups`** – An array of capability groups or permissions the plugin needs, similar to mode tool groups (e.g. `["read", "edit", "browser", "command", "mcp"]` as in custom modes). This can denote what built-in tools or actions the plugin will utilize. It’s also useful for security – the extension could enforce that a plugin only performs actions within its declared groups.
* **`customInstructions`** – Additional instructions or guidelines for using the plugin. This could be injected into the AI’s context when the plugin is active, ensuring the agent knows how and when to invoke the plugin’s functionality (similar to how custom modes have extra prompt instructions).

In addition to these descriptive fields, the plugin manifest entries will include **execution details** to distinguish remote vs local plugins:

* **`location` or `source`** – e.g. `"remote"` or `"local"` (could be a boolean `isLocal` flag). This indicates how to resolve the plugin.
* **If remote**: a **`package`** name (and optional version). For example, `"package": "@myorg/roo-plugin-sample"` could tell the Plugin Manager to use NPX to run this NPM package. The system may default to the latest version or allow a specific version string. Under the hood this translates to a command like `npx -y @myorg/roo-plugin-sample` (the `-y` auto-confirms installation).
* **If local**: a **`path`** to the plugin’s entry point on disk. This could be a relative path (e.g. `"path": "./plugins/my-plugin"` or a specific script file). The Plugin Manager will resolve this path within the workspace and use it to execute the plugin’s code directly (e.g. via Node).

Optionally, the manifest schema can include fields like **`enabled`** (boolean to quickly toggle a plugin on/off without removing it), **`config`** (an object for plugin-specific settings or environment variables), and metadata like version or author. For instance, an entry might look like:

```json
{
  "slug": "github-issues",
  "name": "GitHub Issue Manager",
  "roleDefinition": "Helps manage GitHub issues via API",
  "groups": ["read", "mcp"],
  "customInstructions": "Use this plugin to create or update GitHub issues.",
  "location": "remote",
  "package": "@myorg/roo-github-issues",
  "enabled": true
}
```

The `.rooplugins` file will live either in the project’s root (for project-specific plugins) or under a central config directory (like `.roo/plugins.json` for global). The system will support **hierarchical config**: project-level `.rooplugins` overrides or adds to any global plugin settings (similar to how `.roomodes` can override global modes).

**Implementation steps for manifest support:**

1. **Define JSON schema** – Specify the schema for `.rooplugins` (keys and their types). This helps in validation and documentation. (It can be similar to how `mcp.json` defines an object of `mcpServers` mapping to commands).
2. **Load and parse** – On extension activation, read the `.rooplugins` file (if present in workspace, or global config). Use a JSON parser to create an internal list of plugin definitions. Handle errors (malformed JSON) gracefully, perhaps showing an error in UI.
3. **Watch for changes** – Set up a file watcher on `.rooplugins`. If the user manually edits this file, the extension should auto-reload the plugin list. This ensures changes in plugin config (new plugin added, or fields edited) are picked up without requiring a VS Code reload. The watcher will trigger the Plugin Manager to update internal state (and possibly restart or adjust running plugins if needed).

By using a structured manifest, we maintain a single source of truth for installed plugins that both the CLI/extension and the UI can reference.

## Plugin Execution Mechanism (Remote via NPX vs Local)

To support both **remote plugins (via NPX)** and **local plugins**, the Plugin Manager in the extension core will handle launching plugin code in an appropriate way based on the manifest entry:

* **Remote Plugins (NPX)**: For a plugin defined with a package name, the manager will spawn a child process using `npx` to run the module on demand. This can be done with Node’s child\_process (or a library like execa) to execute a command such as: `npx -y <package>@<version>`. The `-y` flag auto-installs the package if not already cached. We may also include specific arguments if the plugin expects any (for example, an entry could have `"args": ["--mode", "server"]` if needed, similar to MCP server configs). This approach is directly inspired by how Roo Code launches external MCP servers using NPX. Each NPX invocation will fetch the plugin’s NPM package (if not already in the cache) and run its declared binary.

  *Implementation detail:* The first run might incur an installation time, so we might consider a **pre-install step** for new plugins (e.g. when a plugin is added, run `npx --no-install <pkg>` to prefetch it). NPX typically caches the package, so subsequent runs are faster. Alternatively, we could manage a persistent install (e.g., store plugins under a `.roo/plugins/node_modules` directory by running `npm install` there, which might give more control over versions and offline use). However, using NPX on-the-fly is simpler and keeps the extension lightweight (no permanent bloat for unused plugins).

* **Local Plugins**: For a plugin referencing a local path, the manager will resolve the absolute path and run the plugin’s entry file. If the local plugin is a Node project (scaffolded by the wizard), it will have either a compiled JavaScript file or a script that can be executed. There are two possible execution strategies:

  * **Direct Node Execution**: Spawn a child process with `node <plugin_entry.js>` (or `.ts` if we use a TS runner). This assumes the plugin has no external dependencies beyond Node’s standard library or has already installed them locally. We will set the working directory to the plugin’s folder so that `require` calls in the plugin will load its own `node_modules`.
  * **NPX with local path**: NPX can also execute local packages if given a file path or a tarball. We could leverage `npx <path_to_plugin_folder>` which will run the plugin if the folder has a package.json with a `bin` script. This has the benefit of using NPX’s logic (ensuring any local dependencies are resolved). Alternatively, we might use a simpler approach for local: require the plugin’s main module into the extension process via dynamic import. **However, importing directly can risk dependency conflicts and lack sandboxing**, so spawning a separate process is safer.

In both cases, **the plugin runs as an external process**, isolated from the extension’s process. This provides a sandbox of sorts: the plugin cannot directly manipulate VS Code internals except through controlled channels (stdin/stdout or an IPC interface we define). It also prevents version conflicts (each plugin can have its own dependency versions, since an NPX call or separate Node process will use the plugin’s dependencies, not the extension’s).

**Data Flow for Plugin Execution:**

1. **Initialization**: When Roo Code starts or when a new plugin is installed, the Plugin Manager may **pre-initialize** plugins. For example, certain plugins that act as long-lived services (like an MCP server plugin) might be started immediately (if enabled) and kept running. In other cases, the plugin might only be invoked on demand (lazy start when used). We should design the manifest to indicate if a plugin needs to run persistently (e.g., a plugin with a background server vs. a one-off tool invocation).

2. **Invocation**: When the AI agent or user triggers a plugin action, the extension will:

   * Identify the plugin by slug and check if it’s enabled and loaded.
   * If the plugin process is not running (for a one-off or first use), spawn it via NPX or Node as described. If it’s already running (persistent plugin), prepare to send a command to it.
   * Provide **input data** to the plugin. This could be done by command-line arguments, environment variables, or via IPC. For instance, for a one-shot plugin call, the extension might pipe a JSON payload to the process’s STDIN. For a persistent plugin, we might establish a communication channel (e.g., sending messages over STDIO or opening a local socket/port that the plugin listens on).
   * Example: Suppose an AI agent needs to use a “GitHub Issue Manager” plugin to create an issue. The agent’s output (parsed by Roo Code) might be a special command or annotation indicating to use plugin `github-issues` with certain parameters. The Plugin Manager receives this request, then launches or signals the corresponding plugin process, perhaps passing the issue title/description via a JSON message.

3. **Execution in Sandbox**: The plugin process performs its task. It might interact with external services or perform computations. Importantly, it runs with **limited scope**:

   * It can access the project files if we allow (we may pass the project root path or specific file paths as needed).
   * It can use network or system calls, but these are not directly able to interfere with the VS Code process except through outputs.
   * If a plugin misbehaves or crashes, it should not crash the main extension – the Plugin Manager can detect a non-zero exit or a stalled plugin and handle it (log error, maybe attempt restart or show failure in UI).

4. **Return Output**: The plugin returns results to the extension. For one-off execution, this could simply be the process’s stdout (e.g., a JSON string or text that the extension reads when the process exits). For persistent plugins, we might get asynchronous messages. The Plugin Manager will need to handle parsing these results. For consistency, we can define that plugins should output their data in a structured format (JSON or a specific protocol) that the extension knows how to interpret. For example, a plugin could always output JSON with a specific schema (like `{ "event": "result", "data": {…} }`). The extension then takes this and feeds it back into the Roo UI or the AI conversation as needed.

5. **Termination or Persistence**: If it was a one-time use plugin call, the process can exit after output. The Plugin Manager should ensure to clean up (kill the process if it hangs, etc.). If it’s a long-lived plugin (like a server), it might stay running in background; the extension should keep track of it (perhaps storing a reference in the Plugin Manager’s state). On shutdown or plugin disable, those processes should be terminated to free resources.

**Example Data Flow (Remote plugin)**: A user has a plugin with slug `weather` that fetches weather info via an API. When the agent decides to get weather, the extension spawns `npx -y roo-plugin-weather` with an input query (city name). The plugin prints out “Sunny, 25°C” as JSON. The extension captures that and inserts it into the chat or uses it in code.

**Example Data Flow (Local plugin)**: A user-developed plugin `db-migrator` (path `./plugins/db-migrator`) is enabled. The agent triggers a database migration. The extension runs `node plugins/db-migrator/index.js --applyMigration "users_table"` (passing arguments). The plugin script applies changes and returns status text, which the extension shows to the user.

By handling remote and local in this unified way (spawn processes), we ensure **plugins run in isolation** and we can manage their lifecycles (e.g., kill a plugin that’s running too long or if user disables it).

## Plugin Lifecycle (Install, Initialize, Update, Remove)

Managing the **plugin lifecycle** is crucial for a smooth user experience. Below is the plan for each stage of the lifecycle and how data flows through the system:

* **Installation (Add Plugin)**: This can happen in two ways – via the UI (Plugin Wizard or an “Add Plugin” form) or by manually editing the `.rooplugins` file. In either case, adding a plugin means creating a new entry in the manifest.

  1. **UI flow**: User opens the plugin panel, clicks “Add Plugin”. They might select from a known registry or enter a package name or local path. Upon confirmation, the UI sends a request to the extension (e.g., via VS Code API message passing) with the new plugin info.
  2. Extension receives the request and updates `.rooplugins` (appending the new JSON entry). It then triggers the Plugin Manager to **install/initialize** it. For a remote plugin, this might involve a test run of `npx` to ensure it installs properly (or we can run `npm view` to check package availability). For a local plugin, maybe verify the path exists.
  3. The extension then sends a response back to UI indicating success or errors. If successful, the plugin now appears in the UI list.
  4. **Automatic UI update**: Because our system watches the manifest file, even if the file is edited outside the UI, the extension will catch changes. When a new plugin entry is detected, the Plugin Manager will incorporate it (and possibly auto-run any initialization code needed, such as compiling a local plugin if needed, or pre-fetching an NPX package).

* **Initialization**: Some plugins require an init step (for example, starting a server or preparing a cache). We can define an optional script or function that runs on extension startup or when enabling a plugin. Implementation-wise, when the extension activates or when a plugin is added/enabled:

  * The Plugin Manager goes through the list of plugins. For each that is marked `"enabled": true`, it will initialize it. This could mean spawning it in a “ready” state. For instance, an AI tool plugin might not do anything until called, so no need to spawn yet. But an MCP server plugin (like those in `mcp.json`) should start immediately so the AI can use it.
  * We might add a field `"autoload": true/false` in the manifest to control this behavior (or infer it: e.g., if a plugin has a `"roleDefinition"` but no continuous process, maybe autoload = false).
  * After initialization, ensure the UI knows the plugin’s status (running or idle). The UI could show indicators if a plugin is currently active.

* **Execution/Usage**: (Covered in the previous section on data flow.)

* **Update (Edit Plugin)**: Updates happen in two forms: updating the plugin’s **code/content** or updating its **metadata/config**.

  * *Metadata update:* If a user edits the `.rooplugins` entry (changing fields like name, instructions, or toggling enabled), the extension watcher will detect it. The Plugin Manager then applies changes: e.g., if `enabled` was turned false, it should terminate the plugin process if running. If the slug or other fields changed, it updates its internal records. The UI panel, upon refresh event from the extension, will reflect the changes (e.g., new name, or plugin now shown as disabled).
  * *Code update:* This mainly applies to local plugins (since remote plugin code is managed via the package manager). If the user modifies the code of a local plugin (say they open `plugins/my-plugin/index.ts` in the editor and change it), we should allow reloading it easily:

    * We can watch the plugin’s directory for file changes (possibly optional, behind a setting if it’s expensive). Or the user can click a “Reload” button on the plugin in the UI.
    * On code change, if the plugin is currently running, the extension can stop it (kill the process) and restart it to pick up new code. If it’s not running, we might just mark that it needs rebuild.
    * For TypeScript, if using a build step, either auto-run the build or prompt the user to rebuild. The wizard could integrate a build command with a hotkey.
    * In summary, updating a plugin’s code will typically be a manual process (developer edits code, then triggers re-run). Our system will provide convenient reload without full extension restart.
  * *Remote plugin update:* If the plugin is from NPM and a new version is released, user might want to update. This could be done by editing the version in `.rooplugins` or via a UI action “Update”. The extension could then run `npx -y <pkg>@latest --help` or similar to fetch the new version into cache. We should show the current version and allow updates.

* **Removal (Uninstall Plugin)**: Removing a plugin will delete its entry from `.rooplugins`.

  1. **UI flow**: User clicks a “Remove” (trash) icon on a plugin in the list. Prompt confirmation, then the UI tells extension to remove it.
  2. Extension removes the JSON entry (or marks it removed) in the manifest file and saves it. The file watcher picks up the change (or the extension already knows since it initiated), and the Plugin Manager cleans up: if the plugin was running, kill the process. If it had any temporary files or installed packages, consider removing them (for NPX, nothing permanent unless cached globally – which we might leave or remove via `npm cache clean` if needed).
  3. The extension notifies the UI to update the list (the removed plugin disappears). If the plugin had any UI elements or mode entries, those should be cleared as well (e.g., if the plugin added a custom command in the command palette, deregister it).
  4. Also ensure that any references in memory (like if the AI was in the middle of using it) are handled (perhaps an error message if the agent tries to call a removed plugin).

Throughout these stages, the system ensures **state consistency**:

* The `.rooplugins` file is the source of truth for what’s installed and enabled.
* The extension’s Plugin Manager maintains a runtime state (which plugins are running, etc.) that is synchronized with the manifest.
* The UI reflects the manifest state in near real-time (listening for events from extension on changes).

By handling lifecycle events with clear triggers, we avoid issues like “stale plugins” or requiring a full VS Code reload to apply changes. This dynamic handling is similar to how enabling/disabling MCP servers in settings takes effect immediately in recent Roo Code versions.

## UI Integration and Automatic Updates

A major part of the plugin system is an intuitive UI for configuration. The Roo Code UI (likely a React-based webview) will get a new **Plugins section** in the settings or a dedicated panel. The integration plan is as follows:

* **Plugins List Panel**: This UI will enumerate all plugins from the `.rooplugins` manifest. For each plugin, it will display key info and controls:

  * Name (with maybe slug or source as subtitle),
  * A description or roleDefinition snippet,
  * An indicator for whether it’s enabled (toggle switch),
  * Perhaps an icon denoting remote vs local (e.g., a globe for remote, folder icon for local),
  * Buttons for actions: Edit, Remove, maybe Run (if applicable).

  This can be presented similarly to how Roo Code’s settings list MCP servers or custom modes. For example, in Roo Code v2.2.5, they introduced toggles for each MCP server in the settings – we’ll mirror that pattern: a simple on/off toggle next to each plugin to enable or disable it quickly.

* **Automatic Refresh**: Whenever a plugin is installed, updated, or removed, the UI should update without manual intervention. To achieve this:

  * The extension will send a message (using VS Code’s webview communication API) to the UI whenever it detects changes. For instance, after adding a plugin, the extension might post a message like `{ type: "pluginsChanged", plugins: [ ...new list... ] }`.
  * The UI, upon receiving this, will re-render the list. Alternatively, the UI could request the latest list from the extension when it gets focus or on an interval, but push notifications are more efficient.
  * We will leverage the file watcher and Plugin Manager events: essentially, any time the internal plugin list is modified (add/edit/remove, or enabled toggled), we emit an event that the UI listens to.

* **Editing Configuration**: The UI could allow editing plugin details. For example, clicking “Edit” on a plugin could show a form with fields (name, instructions, etc.). Changing these would update the manifest via extension. This is a more user-friendly alternative to editing JSON manually. We must ensure validation (unique slug, required fields, etc.) in the form. On save, update the file and refresh the list.

* **Registry Management**: The UI will also have a section for **Plugin Sources/Registries**. This addresses the requirement for managing approved registries or Git sources:

  * By default, the system might use the public NPM registry for `npx`. We could allow adding other registries (for private plugins). For instance, a user could add a custom NPM registry URL or select a GitHub repository as a source.
  * This could be implemented as a simple list of allowed domains or scopes. E.g., “Allowed plugin sources: npmjs.com, github.com/yourOrg/\*”. If a plugin’s package is not from an approved source, the system could warn or block installation for security.
  * UI wise, a sub-page or modal in settings can list current sources with option to add/remove. This would correspond to perhaps a setting in a config file (like the extension’s global settings). The extension then enforces these rules when installing plugins: e.g., if user tries to add a plugin `bad-plugin` from an unapproved registry, it shows an error.
  * Additionally, we can provide a curated “official plugin registry” view – for example, plugins published by Roo or verified developers could be listed for easy discovery. This could simply be documentation or a link, unless we integrate a live fetch from an API.

* **Enabling/Disabling Plugins**: The toggle in the UI directly controls whether a plugin is active. Implementing this means:

  * The toggle change triggers a webview event to the extension, e.g., `{ type: "setPluginEnabled", slug: "xyz", value: false }`.
  * The extension updates the `.rooplugins` entry for that plugin (`"enabled": false`) and if the plugin was running, stops it. If enabling, does the opposite (maybe initialize it).
  * On success, extension sends updated plugin list state back to UI. We should also reflect plugin status (maybe a plugin currently running could show a small “online” dot).
  * This approach ensures the UI and backend state remain consistent quickly. It’s essentially the same pattern as toggling a setting in VS Code’s UI and updating a JSON config.

* **Consistent Design**: The plugins UI will mirror the style of existing Roo Code settings for familiarity. It likely will be a collapsible section under settings or perhaps a tab (the release notes mention vertical tab navigation for settings in Roo Code 3.16, so “Plugins” could be a new tab).

  * Each plugin entry might be collapsible to show more details (like full roleDefinition or custom instructions text, and any plugin-specific configuration fields).
  * Provide an “Add Plugin” button at the top (or bottom) of the list, which opens the Plugin Wizard (addressed below).

* **Error Display**: If a plugin fails to install or run, the UI should inform the user. For instance, if `npx` returns an error (package not found or runtime error), catch that and show a notification or an error entry in the list (e.g., the plugin could be listed as “Error: failed to start”). Roo Code already has an "Errors" tab for MCP servers; plugins could tie into a similar error reporting mechanism. Perhaps if a plugin crashes, its status in the UI could turn red and an error log can be viewed.

By tightly coupling the UI with the extension events, we achieve a **live view** of the plugin system’s state. Users can trust that what they see in the Plugins panel is the ground truth of what’s installed and running. Automatic updates remove the need to reload VS Code or manually refresh the panel, making plugin management feel integrated and instant.

## Plugin Wizard for Development

To encourage users to develop their own plugins, a “Plugin Wizard” will be provided. This wizard is essentially a guided interface that helps create the scaffolding for a new plugin and integrates it into the system. Here’s the step-by-step plan for the wizard:

1. **Initiation**: The user clicks “Create New Plugin” (or a similar call to action) in the Plugins UI. This opens a wizard UI (possibly a multi-step form or modal in the webview).

2. **Plugin Metadata Setup**: In the first step, the wizard collects basic information:

   * **Name** and **Slug**: The user provides a name and a slug is suggested (based on name, lowercased and hyphenated). We ensure the slug is unique (check against existing plugins).
   * **Description/Role**: The user writes what the plugin will do (this could become the roleDefinition).
   * **Capabilities**: The wizard lets the user pick which tool groups or permissions the plugin needs (maybe a list of checkboxes: Read Files, Edit Files, Internet access (browser), Terminal commands, External API (MCP), etc.). These selections populate the `groups` field and also inform the scaffold (for example, if they choose “External API”, the wizard might include some sample code on how to call an API or mention using MCP client).
   * **Remote vs Local**: The user chooses whether this plugin will be local (developed in this workspace) or is an existing remote package.

     * If “Local (Develop here)” is chosen, the wizard will proceed with scaffolding code.
     * If “Remote (NPX)”, then the wizard might simply prompt for the package name and version, and then it can skip code generation steps, focusing only on adding the manifest entry (since remote plugin code isn’t edited here). In that case, the wizard essentially becomes an “Add remote plugin” flow, which might be simpler (just confirm package and update .rooplugins). We might actually implement “Add remote plugin” as a separate short form, and reserve “Wizard” mainly for creating new local plugins.

3. **Scaffolding (for local plugins)**: If a new local plugin is being created, the wizard will automatically generate the necessary files and directories in the workspace:

   * By convention, we can create a directory under a `.roo/plugins/` folder or a top-level `plugins/` directory in the project (depending on user preference or project structure). For example, create `./.roo/plugins/<slug>/`.
   * Inside this, generate a `package.json` for the plugin. This package.json will have:

     * `"name": "<slug>"` (possibly with a scope like `@user/<slug>` if needed),
     * version (start at 0.1.0),
     * `"type": "module"` for ESM, or appropriate type if using commonjs,
     * dependencies for any chosen options (e.g., if they selected “browser” group, maybe include a library for web requests, or if “mcp”, perhaps include the `@modelcontextprotocol/client` as a dependency; this could be optional or instructive),
     * a `"bin"` entry if we plan to use NPX for local testing (e.g., `"bin": { "<slug>": "dist/index.js" }` so that running `npx <slug>` locally would execute the plugin).
   * Create a source file, e.g., `index.ts` or `index.js`, pre-filled with a basic template:

     * Perhaps a function or CLI code that prints a hello message or demonstrates how to use input. For example, if the plugin is supposed to act on some input text, the template might read from process.stdin and print a result.
     * If the plugin selected certain groups, include hints or sample code. For instance, if “browser” (web access) was selected, include a snippet of how to fetch a URL (using `node-fetch` or similar if allowed). If “command” selected, show how to run a shell command via `child_process` in the plugin. Essentially, tailor the scaffold to the chosen capabilities.
   * Optionally, include a README.md in the plugin folder with instructions for development, and a TS config if using TypeScript.
   * If using TypeScript, set up a simple `tsconfig.json` and possibly install `typescript` and `ts-node` as dev dependencies so that the plugin can be run in dev without manual compilation. Alternatively, use a bundler (maybe the Roo extension’s own build pipeline can transpile it on the fly).

4. **Wizard – Finishing Up**: After generating files, the wizard’s final step will:

   * Show a summary (maybe the generated slug, and where files are created).
   * Possibly offer to open the new plugin’s code in the editor (so the user can start coding right away).
   * Actually add the plugin entry to the `.rooplugins` file. The entry will have `"location": "local"` and the path, etc. If we created under `.roo/plugins/<slug>`, the path might be that, or we can omit path if we assume the convention (the system could auto-resolve `<slug>` to `.roo/plugins/<slug>`).
   * Enable the plugin by default (since the user just created it). The extension might try to run it in a safe way – perhaps just do a test invocation that prints “Plugin <name> loaded” to ensure everything is wired. Or if we have an init function in the template, call it.

5. **Editing and Iteration**: The wizard should make it easy to iterate:

   * If the plugin is already created (user has been editing it), the wizard could be re-opened to edit metadata. Or simpler, users can edit the `.rooplugins` fields via the UI list (as described earlier).
   * We may include a button like “Edit Code” next to each local plugin, which just opens the plugin folder in VS Code’s file explorer or directly opens the main file.
   * Also, for convenience, a “Run Plugin Now” button in the UI could trigger the plugin with some test input (maybe opening a small input box or using default dummy input) – this helps test that the plugin runs without writing a full AI prompt.

6. **Saving and Documentation**: The plugin wizard will ensure all changes are saved:

   * The manifest entry is written to file.
   * The scaffolding files are created on disk.
   * It will not overwrite an existing plugin of the same slug (will warn if slug already exists).
   * Provide inline documentation in the code comments to guide the developer on how to implement advanced behaviors, how to access the plugin’s input from Roo (perhaps via environment or STDIN), and how to output results.

The wizard essentially lowers the barrier to creating plugins by automating boilerplate setup. This integrated approach means users don’t have to manually configure project structure or remember to add entries to `.rooplugins` – the wizard does it in one flow, reducing errors.

## Security, Sandboxing, and Dependency Handling

Because plugins involve executing arbitrary code (possibly downloaded from the internet), security and stability are top priorities. Several measures will be put in place:

* **Isolated Process Sandbox**: Running each plugin in its own Node.js process (whether via NPX or local spawn) is a form of sandboxing. The plugin code cannot directly access VS Code’s internal APIs or modify the editor state except by communicating through the limited channels we define. It also means if it crashes or hangs, we can terminate that process without affecting the main extension (aside from maybe losing that plugin’s functionality).

* **Restricted Capabilities**: The `groups` declared in the plugin manifest can serve as a permission declaration. The extension can enforce certain rules:

  * If a plugin does not declare the `"command"` group, the extension could refuse to honor any request the plugin makes to run shell commands (though if the plugin is malicious it could still attempt it in its own process – we cannot fully prevent that since it’s just Node.js code).
  * Similarly, if no `"browser"` group, perhaps block any attempt to use our internal browser automation (though a plugin could still make network requests via Node’s fetch; we might not stop that unless we implement network sandboxes).
  * This is more about communicating to the user what the plugin *intends* to do rather than a strict security sandbox. We might log or warn if a plugin tries to do something outside its declared scope (like if a “read-only” plugin tries to execute a system command, we could flag that in logs).

* **Environment Isolation**: When spawning plugin processes, we will carefully construct the environment:

  * Only pass needed environment variables. For example, if the plugin has an `"env"` config in `.rooplugins` (like API keys or settings), we inject those. We might pass a `ROO_PLUGIN=1` flag or something to let the process know it’s under Roo context.
  * We should **not** pass along sensitive editor or user environment by default. (E.g., VS Code’s own environment or secrets should not leak in.) Keep it minimal.
  * Possibly set `NODE_ENV=production` for remote plugins to avoid any dev behaviors, unless the plugin needs dev mode.
  * If possible, run with a restricted user permission (though on desktop that’s the user anyway; if VS Code is running as user, plugin runs same level).

* **Dependency Handling**: By isolating processes, we handle dependency version conflicts (each plugin can use its own versions). But we should also manage how dependencies are fetched:

  * NPX will pull from npm (or other registries if configured). This means code from external sources is being executed. We rely on user discretion and the registry’s integrity. To mitigate risks:

    * Use the **registry allow-list** as mentioned. Perhaps even show a warning “You are about to run a plugin from an unverified source. Proceed?” on first install of a given slug.
    * Possibly provide checksums or signing for official plugins (future enhancement).
  * Local plugins’ dependencies: The wizard could either bundle necessary dependencies or instruct the user to run `npm install` in the plugin folder. We should make sure that when we spawn the plugin, it knows where to require its packages:

    * If using NPX on a local folder, NPX will install missing deps as needed (or use local `node_modules`).
    * If using direct node, we ensure `NODE_PATH` or `npm_prefix` is set so it finds `./node_modules` in the plugin directory.
    * Encourage minimal dependencies for faster loads. Possibly allow plugins to piggy-back on some of Roo Code’s dependencies if marked (but safer not to share; treat each as separate).

* **Resource Limits**: To prevent a plugin from consuming too many resources (CPU or memory) indefinitely, implement basic controls:

  * Use `child_process.spawn` with timeouts. For example, if a plugin is expected to respond, we can kill it if it exceeds a certain timeout (configurable per plugin if needed).
  * If a plugin goes rogue (e.g., a while(true) loop), the user should have the ability to terminate it. We can provide a “Stop” button in the UI for running plugins.
  * Monitor output size as well – if a plugin floods gigabytes of text, perhaps cut off and warn.

* **Safe APIs**: If the plugin wants to interact with the user’s filesystem (beyond the project), it could do so as it’s just Node code. We might not prevent `fs` module usage. However, we could design an official plugin API that encourages using provided abstractions:

  * For example, the plugin can call certain commands via stdout protocol to ask the extension to read a file rather than reading it directly (this way, the extension could enforce file access rules, like read-only or scope to workspace).
  * But implementing a full sandbox FS is complex; to keep the plan feasible, we accept that a plugin is essentially equivalent to running a Node script on the user’s machine – it has that level of access. So trust and verification are key (like how one trusts a VS Code extension or an npm package).

* **Registry and Signature**: Over time, we might incorporate a signing mechanism for plugins. For now, the **approved registries list** in the UI is our main guard. Company or team settings could restrict to an internal registry, ensuring only vetted plugins run.

In summary, while we cannot sandbox to the level of a browser (since Node plugins are quite powerful), our strategy is to **inform the user** (via manifest `groups` and source info), **isolate execution** (so at least it doesn’t crash the editor or conflict with other code), and **provide controls** (enable/disable, stop, allow-list sources) to mitigate risk. This approach is similar in spirit to how VS Code handles extensions (you trust what you install, but if one misbehaves you can disable it and it’s isolated from others).

## TypeScript and ESM Support for Plugins

Modern Node development often uses TypeScript and ES Module format. The plugin system will be built with full support for TS/ESM to make plugin development convenient:

* **ESM by Default**: We will encourage writing plugins as ES modules. The scaffolded `package.json` for local plugins will have `"type": "module"`, and we’ll use `import/export` in examples. This aligns with VS Code’s Node version (which supports ESM). For remote plugins, authors can publish them as ESM too. When using NPX to run an ESM package’s binary, it’s typically fine as long as the entry point is specified. (Node will handle it since NPX just invokes the package’s bin which can be an ESM script with a proper shebang or a Node loader).

* **CommonJS fallback**: In case a plugin is not ESM (some might use commonJS), our system should handle it. If a local plugin’s package.json is `"type": "commonjs"` or has .cjs files, we’ll spawn it accordingly. NPX doesn’t care – it runs whatever the package provides. So compatibility is maintained.

* **TypeScript Development**: For local plugins:

  * We integrate a build step. E.g., include a simple `npm run build` that calls `tsc` to produce a `dist/` folder with JS. The wizard can even run an initial build so that `dist/index.js` exists.
  * For quick iteration, we can use `ts-node` to execute the TS directly without compiling. One approach: when spawning a plugin that has `.ts` entry, use `ts-node` as the runner. For instance, spawn `npx -y ts-node --transpile-only plugins/my-plugin/index.ts`. If performance of transpile is an issue, fallback to pre-building.
  * Since Roo Code itself may bundle utilities like **esbuild**, we could leverage that for fast transpilation. For example, when a plugin is run, the extension could call an internal API to bundle the plugin code and then execute the bundle. However, this adds complexity and might not be needed if ts-node suffices for dev and users can compile for production.

  In the interest of simplicity: the wizard will set up TS but instruct the user to compile before using the plugin normally. Or we mark in manifest if a plugin needs compilation. Perhaps an `"autoCompile": true` flag, and the extension then invokes `tsc` on save events.

* **Testing and Debugging**: Because plugins run as separate processes, debugging them might require attaching a debugger. We could allow launching a plugin with `--inspect` when running in development mode. The manifest or UI could have a “debug mode” toggle that restarts the plugin with a debug port open, so the user can attach VS Code debugger to the plugin’s process.

  * The wizard can include instructions for debugging (like adding a configuration in `.vscode/launch.json` to attach to the plugin process on a known port).
  * This will greatly help developers ensure their plugin works as expected.

* **Compatibility with CLI**: If the plugin is also meant to be used via CLI outside Roo, our approach of making it a Node CLI with bin script means the same code can run stand-alone. This is beneficial for testing (run `node index.js` with sample input) and also means plugin authors can reuse existing CLI tools as plugins with minimal changes (just integration points).

* **Example**: Suppose a user writes a plugin in `index.ts` using TS. We generate a `tsconfig.json` targeting ES2020 and module=ESNext. The user codes and tests within VS Code. On saving, they run the plugin via the UI; behind the scenes, `ts-node` runs it. When ready to distribute or for performance, they run `npm run build` (maybe we also automate this on enabling the plugin in release mode), which creates `dist/index.js`. Our manifest for that plugin could then point to `dist/index.js` as the execution entry to avoid the TS overhead.

By handling TypeScript, we ensure the developer experience is smooth. No need for them to manually wire up compilation each time – the extension/wizard takes care of the heavy lifting. This will likely increase the quality of plugins since authors can use strong typing and modern JS features confidently.

## Consistency Between CLI and UI Usage

It’s important that whether a user interacts with plugins through the VS Code UI or through any CLI or command palette commands, the behavior remains consistent.

* **VS Code Commands**: We will introduce new VS Code commands (in the extension’s `package.json` contribution points) for plugin actions such as:

  * `rooPlugins.refresh` – reload the plugin list (though this might be automated, it’s useful to have a command to manually trigger if needed).
  * `rooPlugins.openSettings` – open the Plugins UI panel quickly.
  * `rooPlugins.runPlugin` – possibly a generic command to run a plugin by slug on the current context. This could be hooked into the command palette or as a code lens (for example, if user wants to manually invoke a plugin on a selected text).
  * These commands allow keyboard shortcuts or scripting (via VS Code tasks or macros) to trigger plugin features.

* **Headless/CLI Mode**: If the Roo Code environment has a headless mode (for example, a CLI tool named “roo” or if one uses VS Code’s `code-cli` to run tasks), we want plugin operations to be accessible. This could mean:

  * Ensuring that editing the `.rooplugins` file by hand and running a CLI command to refresh will load the new plugin the same as the UI workflow.
  * Possibly providing a CLI interface, e.g., `roo plugins add <pkg>` or `roo plugins list` that manipulates the same config. (This would be an extension of Roo’s CLI if exists.)
  * If not a separate CLI, at least using VS Code’s built-in command-line (via the `code` command or tasks) to achieve similar results.

* **Synchronization**: Because we rely on the manifest as the single source of truth, any method of updating that manifest yields the same outcome. If a user prefers to not use the UI and instead adds an entry in `.rooplugins` and saves the file, the extension’s watcher catches it and it’s as if they used the official UI (the plugin will install, UI will update). Conversely, using the UI writes to the file so that if the user inspects it or uses git, all changes are transparent and version-controlled.

* **UI vs JSON Source**: This dual approach is similar to how one can either toggle a setting in VS Code UI or edit `settings.json` – both are valid and sync with each other. We aim for the same with plugins.

* **Consistent Behavior**: Enabling or disabling a plugin via UI toggle or via changing the JSON `"enabled"` field manually should trigger identical code paths (our Plugin Manager logic doesn’t care how it changed, it performs the enable/disable routine and sends out update events). This prevents any discrepancy like “UI says enabled but actually not running” – which we avoid by having a single logic for enabling (the one in extension, not in UI).

* **CLI Execution of Plugins**: Another aspect of consistency is if the agent or user triggers plugin use in conversation vs a manual run:

  * Suppose in the chat the user says, “Use the GitHub plugin to create an issue.” The AI (modeled to know about the plugin via roleDefinition) will output an action that causes the extension to run the plugin. This path should achieve the same result as if the user manually ran a command “Run GitHub Issue Manager” from a menu. In practice, this means our invocation logic (described in data flow) is centralized and can be called from multiple triggers (AI intent or user manual trigger).
  * We might implement a context menu or command palette entry for each plugin to “Run \[plugin name]…” which could prompt for input and execute it. This would use the same Plugin Manager.runPlugin(slug, input) function that the AI path uses. Thus, testing and usage are consistent.

* **Feedback Loop**: The UI will display any output or status from plugins similarly regardless of how they were triggered. For example, if a plugin returns a result that’s inserted into the chat, the UI chat view shows it. If manually run, perhaps we show a notification or output panel with the result. It could be beneficial to have a unified “Plugin Output” panel or feed in the UI where all plugin invocation results (no matter how triggered) are logged. This helps debugging and transparency.

* **Documentation and Training**: We will ensure the user documentation for Roo Code’s plugin system explains that the UI and the underlying JSON are two interfaces to the same system. Advanced users might script changes, while others use the GUI – both are fine. Our testing will include scenarios using both to verify the state remains synchronized.

By designing for consistency, we reduce confusion and potential errors. A plugin enabled means it’s active in both UI and actual behavior; a plugin listed in config is always visible in UI. This holistic approach makes the plugin system robust and user-friendly for both GUI-centric users and power users who might automate or script their setups.

## File/Folder Structure Summary

To clarify the various file locations mentioned:

* **Project Root**: Contains `.rooplugins` (project plugin manifest). May also contain `.roomodes` and `.roo/mcp.json` as before. These config files can live alongside each other logically.
* **Global Config**: Possibly `~/.roo/plugins.json` for user-level plugins that apply to all projects (optional extension if needed).
* **Plugin Code Folders**: For local plugins created via wizard, a suggested location is under a hidden `.roo/plugins/` directory within the workspace. Each plugin gets a subfolder: e.g., `.roo/plugins/github-issues/` containing its code. This keeps plugin code together and out of the main project source (which might be important if the user doesn’t want it checked into the same repo, etc. They could .gitignore the .roo/plugins folder if needed).

  * Alternatively, we could put local plugin code in a top-level `plugins/` folder for visibility. This is a design choice – `.roo/plugins` keeps things hidden/tidy, while `plugins/` is explicit. We might lean on `.roo/plugins` since Roo already uses `.roo/` for configs, making it a central place.
* **Cache/Temp**: If we choose to cache NPX installations manually, we might use a folder like `.roo/plugins/node_modules/` or `.roo/plugins/cache/`. But if relying on NPX’s own cache, we don’t need to manage this.
* **UI/Extension Files**:

  * The extension’s source will have new modules, e.g., `src/pluginManager.ts` (for core logic), `src/commands/plugins.ts` (for command registrations), and updates to `src/extension.ts` to initialize the system.
  * The webview UI (likely under `webview-ui/src`) will have new React components like `PluginsPanel.tsx`, and maybe `PluginListItem.tsx`, and a separate route or tab integrated into settings navigation.

A quick example folder tree to visualize after adding two plugins (one local, one remote):

```
my-project/
├── .roo/
│   ├── mcp.json
│   └── plugins/               # directory for local plugins
│       └── hello-world-plugin/
│           ├── package.json
│           ├── index.ts
│           └── tsconfig.json
├── .roomodes                  # existing custom modes config
├── .rooplugins                # new plugins manifest
├── src/ (project code)
└── ... other files ...
```

And the `.rooplugins` file might look like:

```json
{
  "plugins": [
    {
      "slug": "hello-world-plugin",
      "name": "Hello World Plugin",
      "roleDefinition": "Prints Hello World message.",
      "groups": ["read"],
      "customInstructions": "This is a test plugin.",
      "location": "local",
      "path": ".roo/plugins/hello-world-plugin",
      "enabled": true
    },
    {
      "slug": "time-checker",
      "name": "Time Checker",
      "roleDefinition": "Provides current time via world clock API.",
      "groups": ["mcp", "browser"],
      "customInstructions": "Use this to get the current time in any timezone.",
      "location": "remote",
      "package": "roocode-time-checker",
      "enabled": true
    }
  ]
}
```

This structure and planning ensures the plugin system is implemented in a **modular, extensible way**, fitting naturally into Roo Code’s ecosystem of JSON configs and VS Code integration. The step-by-step approach from manifest to execution, UI, and wizard covers both the developer experience and the runtime behavior comprehensively.

With this plan, Roo Code will gain a powerful plugin mechanism that allows customization and extension of AI coding workflows in a safe and user-friendly manner, blending the flexibility of NPX (to pull in community tools) with the control of local development.&#x20;
