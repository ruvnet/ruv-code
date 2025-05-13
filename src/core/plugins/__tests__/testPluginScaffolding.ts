import * as path from "path"
import * as fs from "fs/promises"
import { PluginScaffoldService } from "../PluginScaffoldService"
import { PluginRegistryService } from "../PluginRegistryService"
import { RooPluginEntry } from "../../../shared/WebviewMessage"

/**
 * Simple manual test script for plugin scaffolding
 * 
 * Note: This is not an automated test, but a script to manually verify the functionality works
 */
async function testPluginScaffolding() {
  try {
    console.log("Starting plugin scaffolding test...")
    
    // Test plugin data
    const testPlugin: RooPluginEntry = {
      slug: "test-plugin",
      name: "Test Plugin",
      enabled: true,
      description: "A test plugin to verify scaffolding works",
      roleDefinition: "You are a test plugin that helps with testing",
      customInstructions: "This is a test plugin created to verify scaffolding",
      groups: ["testing", "samples"],
      location: "local",
      path: "./test-plugin"
    }
    
    // Test initialization
    console.log("1. Testing plugin initialization...")
    const initResult = await PluginScaffoldService.initializePlugin(testPlugin)
    console.log("Initialization result:", initResult)
    
    if (!initResult.success) {
      console.error("Initialization failed, stopping test.")
      return
    }
    
    // Test content creation
    console.log("2. Testing plugin content creation...")
    const contentResult = await PluginScaffoldService.createPluginContent(testPlugin)
    console.log("Content creation result:", contentResult)
    
    if (!contentResult.success) {
      console.error("Content creation failed, stopping test.")
      return
    }
    
    // Test plugin registration
    console.log("3. Testing plugin registration...")
    const registerResult = await PluginRegistryService.registerPlugin(testPlugin)
    console.log("Registration result:", registerResult)
    
    if (!registerResult.success) {
      console.error("Registration failed, stopping test.")
      return
    }
    
    // Verify files were created
    console.log("4. Verifying created files...")
    const workspacePath = process.cwd()
    const pluginPath = path.join(workspacePath, ".roo", "plugins", testPlugin.slug)
    
    const expectedFiles = [
      "package.json",
      "index.js",
      ".rooplugins",
      "README.md"
    ]
    
    for (const file of expectedFiles) {
      try {
        const filePath = path.join(pluginPath, file)
        const stats = await fs.stat(filePath)
        console.log(`✓ File ${file} exists: ${stats.isFile()}`)
        
        // Read and display file content for verification
        const content = await fs.readFile(filePath, 'utf8')
        console.log(`Content of ${file}:`)
        console.log('--------------------------------------')
        console.log(content)
        console.log('--------------------------------------')
      } catch (error) {
        console.error(`✗ File ${file} does not exist or cannot be read:`, error)
      }
    }
    
    // Check if manifest was created
    try {
      const manifestPath = path.join(workspacePath, ".roo", "plugins-manifest.json")
      const manifestExists = await fs.stat(manifestPath)
      console.log(`✓ Plugins manifest exists: ${manifestExists.isFile()}`)
      
      const manifestContent = await fs.readFile(manifestPath, 'utf8')
      console.log(`Content of plugins-manifest.json:`)
      console.log('--------------------------------------')
      console.log(manifestContent)
      console.log('--------------------------------------')
    } catch (error) {
      console.error("✗ Plugins manifest does not exist or cannot be read:", error)
    }
    
    console.log("Test completed successfully!")
  } catch (error) {
    console.error("Test failed with error:", error)
  }
}

// Uncomment to run the test manually
// testPluginScaffolding()
//   .then(() => console.log("Test script finished"))
//   .catch(error => console.error("Error in test script:", error))

export { testPluginScaffolding }