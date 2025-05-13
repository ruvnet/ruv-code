import '@testing-library/jest-dom';
import { vi } from 'vitest';
import { cleanup } from '@testing-library/react';

// Add custom Jest DOM matchers to Vitest
// This will make assertions like toBeInTheDocument() available

// Clean up after each test
afterEach(() => {
  cleanup();
});

// Create a mocked console to avoid actual console logs during tests
global.console = {
  ...console,
  // Mock console methods for tests
  log: vi.fn(),
  error: vi.fn(),
  warn: vi.fn(),
  info: vi.fn(),
};