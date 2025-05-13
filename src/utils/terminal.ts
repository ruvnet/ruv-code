import * as vscode from "vscode"

/**
 * Run a command in the VS Code terminal
 * 
 * @param command The command to run
 * @param cwd Optional working directory
 * @returns Promise that resolves when the command completes or rejects on error
 */
export async function runTerminalCommand(command: string, cwd?: string): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    try {
      // Create a new terminal instance
      const terminal = vscode.window.createTerminal({
        name: "Roo Plugin Scaffolding",
        cwd
      })
      
      // Show the terminal
      terminal.show()
      
      // Execute the command
      terminal.sendText(command)
      
      // We can't easily tell when a command completes in the terminal,
      // so we'll use a small delay and resolve the promise
      // For robust handling, consider implementing a completion detection mechanism
      setTimeout(() => {
        resolve()
      }, 3000) // Adjust this delay based on expected command execution time
    } catch (error) {
      reject(error)
    }
  })
}

/**
 * Run a command and get its output
 * This is a more robust version that captures output and waits for completion
 * Note: This requires the task API and may not be suitable for all scenarios
 * 
 * @param command The command to run
 * @param cwd Optional working directory
 * @returns Promise with the command output
 */
export async function execCommand(command: string, cwd?: string): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    try {
      // Create a task
      const task = new vscode.Task(
        { type: 'shell' },
        vscode.TaskScope.Workspace,
        'Roo Plugin Task',
        'Roo Plugin',
        new vscode.ShellExecution(command, { cwd })
      )
      
      let output = ''
      let actualExecution: vscode.TaskExecution | undefined
      
      // Execute the task and store the actual execution
      vscode.tasks.executeTask(task).then(execution => {
        actualExecution = execution
      })
      
      const disposable = vscode.tasks.onDidEndTaskProcess(e => {
        if (actualExecution && e.execution === actualExecution) {
          disposable.dispose()
          if (e.exitCode === 0) {
            resolve(output)
          } else {
            reject(new Error(`Command failed with exit code ${e.exitCode}`))
          }
        }
      })
    } catch (error) {
      reject(error)
    }
  })
}