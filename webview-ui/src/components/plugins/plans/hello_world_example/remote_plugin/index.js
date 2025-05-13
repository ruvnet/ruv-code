#!/usr/bin/env node

/**
 * Hello World Remote Plugin for Roo Code
 * 
 * This plugin demonstrates how to create a remote NPX-executable plugin.
 * It uses chalk for colored output and accepts optional input.
 */

const chalk = require('chalk');

// Banner
console.log(chalk.blue.bold('┌─────────────────────────────────┐'));
console.log(chalk.blue.bold('│ Roo Code Remote Hello Plugin    │'));
console.log(chalk.blue.bold('└─────────────────────────────────┘'));
console.log();
// Define main function to handle all processing
function main() {
  // Process input
  let userName = 'World';

  // Read from arguments
  if (process.argv.length > 2) {
    userName = process.argv[2];
  } else {
    // Check if running in a pipeline
    if (!process.stdin.isTTY) {
      const data = [];
      
      process.stdin.on('data', chunk => {
        data.push(chunk);
      });
      
      process.stdin.on('end', () => {
        const input = Buffer.concat(data).toString().trim();
        if (input) {
          userName = input;
        }
        
        // Continue with execution after input is processed
        printGreeting(userName);
      });
      
      // Exit early as we'll handle greeting in the callback
      return;
    }
  }

  // If we didn't exit early for stdin processing, print greeting now
  printGreeting(userName);
}

// Execute the main function
main();
printGreeting(name);

function printGreeting(name) {
  // Get time-based greeting
  const hour = new Date().getHours();
  
  let greeting;
  let color;
  
  if (hour < 12) {
    greeting = 'Good morning';
    color = chalk.yellow;
  } else if (hour < 18) {
    greeting = 'Good afternoon';
    color = chalk.green;
  } else {
    greeting = 'Good evening';
    color = chalk.blue;
  }
  
  // Output the greeting with color
  console.log(color(`${greeting}, ${chalk.bold(name)}! 👋`));
  console.log();
  
  // System info
  console.log(chalk.gray('System Information:'));
  console.log(chalk.gray('────────────────────'));
  console.log(chalk.gray(`Time: ${new Date().toLocaleTimeString()}`));
  console.log(chalk.gray(`Node: ${process.version}`));
  console.log(chalk.gray(`Platform: ${process.platform}`));
  console.log();
  
  // Plugin info
  console.log(chalk.green('This is a remote NPX plugin for Roo Code.'));
  console.log(chalk.green('It demonstrates how to create plugins that can be executed via NPX.'));
  console.log();
  
  console.log(chalk.magenta('Try running it with:'));
  console.log(chalk.cyan('npx roo-hello-plugin [name]'));
  console.log();
}