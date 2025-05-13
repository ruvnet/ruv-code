import * as path from "path"
import { TerminalRegistry } from "../../../integrations/terminal/TerminalRegistry"
import { runTerminalCommand } from "../../../utils/terminal"
import { getWorkspacePath } from "../../../utils/path"
import { SparcCliService } from "../SparcCliService"

// Mock dependencies
jest.mock("../../../utils/terminal")
jest.mock("../../../utils/path")
jest.mock("../../../integrations/terminal/TerminalRegistry")

describe("SparcCliService", () => {
  const mockPlugin = {
    slug: "test-plugin",
    name: "Test Plugin",
    description: "A test plugin",
    enabled: true,
    location: "local" as const,
    path: "./plugins/test-plugin"
  }

  const mockWorkspacePath = "/mock/workspace"
  const mockPluginDir = path.join(mockWorkspacePath, ".roo", "plugins", mockPlugin.slug)
  
  beforeEach(() => {
    jest.clearAllMocks()
    // Mock workspace path
    ;(getWorkspacePath as jest.Mock).mockReturnValue(mockWorkspacePath)
  })

  describe("initializePlugin", () => {
    it("should run the create-sparc command with correct parameters", async () => {
      // Mock runTerminalCommand to resolve successfully
      ;(runTerminalCommand as jest.Mock).mockResolvedValue(undefined)

      // Call the method
      const result = await SparcCliService.initializePlugin(mockPlugin)

      // Verify that runTerminalCommand was called with correct command
      expect(runTerminalCommand).toHaveBeenCalledWith(
        expect.stringContaining(`npx create-sparc init --force`),
        mockWorkspacePath
      )
      expect(runTerminalCommand).toHaveBeenCalledWith(
        expect.stringContaining(`--name "${mockPlugin.name}"`),
        mockWorkspacePath
      )
      expect(runTerminalCommand).toHaveBeenCalledWith(
        expect.stringContaining(`--slug "${mockPlugin.slug}"`),
        mockWorkspacePath
      )
      expect(runTerminalCommand).toHaveBeenCalledWith(
        expect.stringContaining(`--outDir "${mockPluginDir}"`),
        mockWorkspacePath
      )
      expect(runTerminalCommand).toHaveBeenCalledWith(
        expect.stringContaining(`--description "${mockPlugin.description}"`),
        mockWorkspacePath
      )

      // Verify the result is successful
      expect(result.success).toBe(true)
    })

    it("should return an error if workspace path is not available", async () => {
      // Mock workspace path to return undefined
      ;(getWorkspacePath as jest.Mock).mockReturnValue(undefined)

      // Call the method
      const result = await SparcCliService.initializePlugin(mockPlugin)

      // Verify the result contains an error
      expect(result.success).toBe(false)
      expect(result.error).toBe("No workspace folder is open")
    })

    it("should return an error if runTerminalCommand fails", async () => {
      // Mock runTerminalCommand to reject
      const mockError = new Error("Command failed")
      ;(runTerminalCommand as jest.Mock).mockRejectedValue(mockError)

      // Call the method
      const result = await SparcCliService.initializePlugin(mockPlugin)

      // Verify the result contains an error
      expect(result.success).toBe(false)
      expect(result.error).toBe(mockError.message)
    })
  })

  describe("runCreateSparcCommand", () => {
    it("should use TerminalRegistry to run the command", async () => {
      // Create mock terminal
      const mockTerminal = {
        runCommand: jest.fn().mockResolvedValue(undefined)
      }
      
      // Mock TerminalRegistry to return the mock terminal
      ;(TerminalRegistry.getOrCreateTerminal as jest.Mock).mockResolvedValue(mockTerminal)

      // Call the method
      const result = await SparcCliService.runCreateSparcCommand(mockPlugin)

      // Verify TerminalRegistry was called correctly
      expect(TerminalRegistry.getOrCreateTerminal).toHaveBeenCalledWith(
        mockWorkspacePath,
        true,
        undefined,
        "vscode"
      )

      // Verify terminal.runCommand was called with the correct command
      expect(mockTerminal.runCommand).toHaveBeenCalledWith(
        expect.stringContaining(`npx create-sparc init --force`),
        expect.objectContaining({
          onLine: expect.any(Function),
          onCompleted: expect.any(Function),
          onShellExecutionStarted: expect.any(Function),
          onShellExecutionComplete: expect.any(Function)
        })
      )

      // Verify the result is successful
      expect(result.success).toBe(true)
    })

    it("should return an error if terminal.runCommand fails", async () => {
      // Create mock terminal
      const mockError = new Error("Command failed")
      const mockTerminal = {
        runCommand: jest.fn().mockRejectedValue(mockError)
      }
      
      // Mock TerminalRegistry to return the mock terminal
      ;(TerminalRegistry.getOrCreateTerminal as jest.Mock).mockResolvedValue(mockTerminal)

      // Call the method
      const result = await SparcCliService.runCreateSparcCommand(mockPlugin)

      // Verify the result contains an error
      expect(result.success).toBe(false)
      expect(result.error).toBe(mockError.message)
    })
  })
})