import { SparcCliService } from '../SparcCliService'
import { TerminalRegistry } from "../../../integrations/terminal/TerminalRegistry"
import { RooPluginEntry } from '../../../shared/WebviewMessage'

// Mock the terminal registry
jest.mock("../../../integrations/terminal/TerminalRegistry")

describe('SparcCliService Integration Tests', () => {
  // Mock plugin data
  const mockPlugin: RooPluginEntry = {
    slug: 'test-plugin',
    name: 'Test Plugin',
    description: 'A test plugin',
    enabled: true,
    location: 'local',
    path: './.roo/plugins/test-plugin'
  }

  // Mock terminal for testing
  const mockTerminal = {
    runCommand: jest.fn().mockResolvedValue(undefined)
  }
  
  beforeEach(() => {
    jest.clearAllMocks()
    ;(TerminalRegistry.getOrCreateTerminal as jest.Mock).mockResolvedValue(mockTerminal)
  })

  it('should generate the correct npx command with plugin parameters', async () => {
    // Call the method
    await SparcCliService.runCreateSparcCommand(mockPlugin)

    // Verify that the terminal was created
    expect(TerminalRegistry.getOrCreateTerminal).toHaveBeenCalled()

    // Check that runCommand was called with the correct command
    expect(mockTerminal.runCommand).toHaveBeenCalledWith(
      expect.stringContaining(`npx create-sparc init --force`),
      expect.any(Object)
    )

    // Verify required parameters are included
    const command = mockTerminal.runCommand.mock.calls[0][0]
    expect(command).toContain(`--name "${mockPlugin.name}"`)
    expect(command).toContain(`--slug "${mockPlugin.slug}"`)
    expect(command).toContain(`--description "${mockPlugin.description}"`)
  })

  it('should handle errors properly', async () => {
    // Setup the mock to reject
    mockTerminal.runCommand.mockRejectedValueOnce(new Error('Command failed'))

    // Call the method
    const result = await SparcCliService.runCreateSparcCommand(mockPlugin)

    // Verify error handling
    expect(result.success).toBe(false)
    expect(result.error).toBe('Command failed')
  })

  it('should handle additional parameters when provided', async () => {
    // Extended plugin with additional metadata
    const extendedPlugin = {
      ...mockPlugin,
      author: 'Test Author',
      version: '1.0.0'
    }

    // Call the method
    await SparcCliService.runCreateSparcCommand(extendedPlugin as any)

    // Verify additional parameters are included when available
    const command = mockTerminal.runCommand.mock.calls[0][0]
    expect(command).toContain(`--author "Test Author"`)
    expect(command).toContain(`--version "1.0.0"`)
  })
})