#!/usr/bin/env node

/**
 * Hello World Plugin for Roo Code
 * 
 * This plugin demonstrates the basic structure of a Roo Code plugin.
 * It accepts an optional name parameter and returns a greeting.
 */

// Check if a name was provided
let name = 'World';

// Read input from command line arguments or stdin
if (process.argv.length > 2) {
  // Use command line argument
  name = process.argv[2];
} else {
  // Check for stdin
  const stdin = process.stdin;
  
  // If stdin is not connected to a terminal, read from it
  if (!stdin.isTTY) {
    try {
      // Read synchronously for simplicity
      const fs = require('fs');
      const input = fs.readFileSync(0, 'utf-8').trim();
      
      if (input) {
        name = input;
      }
    } catch (error) {
      console.error('Error reading input:', error.message);
    }
  }
}

// Generate greeting
const currentTime = new Date();
const hour = currentTime.getHours();

let greeting;
if (hour < 12) {
  greeting = 'Good morning';
} else if (hour < 18) {
  greeting = 'Good afternoon';
} else {
  greeting = 'Good evening';
}

// Output the greeting
console.log(`${greeting}, ${name}! 👋`);
console.log('Hello World plugin executed successfully.');
console.log(`Current time: ${currentTime.toLocaleTimeString()}`);
console.log('This is a sample output from a local Roo Code plugin.');