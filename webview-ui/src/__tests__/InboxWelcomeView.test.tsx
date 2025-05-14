import React from 'react';
import { render, screen } from '@testing-library/react';
import InboxWelcomeView from '../components/inbox/InboxWelcomeView';
import { useAppTranslation } from '@src/i18n/TranslationContext';

// Mock the translation hook
jest.mock('@src/i18n/TranslationContext', () => ({
  useAppTranslation: jest.fn(() => ({
    t: (key: string) => key === 'inbox:startNewTask' ? 'Start New Task' : key,
  })),
}));

// Mock RooHero component since we're not testing its implementation
jest.mock('@src/components/welcome/RooHero', () => {
  return {
    __esModule: true,
    default: () => <div data-testid="roo-hero">RooHero Mock</div>,
  };
});

describe('InboxWelcomeView', () => {
  beforeEach(() => {
    // Reset mocks
    (useAppTranslation as jest.Mock).mockClear();
  });

  it('renders correctly with all required elements', () => {
    const mockOnCreateTask = jest.fn();
    render(<InboxWelcomeView onCreateTask={mockOnCreateTask} />);
    
    // Check that RooHero is rendered
    expect(screen.getByTestId('roo-hero')).toBeInTheDocument();
    
    // Check heading is present
    expect(screen.getByText('Agentic Inbox')).toBeInTheDocument();
    
    // Check that "Start New Task" button is present
    const startButton = screen.getByText('Start New Task');
    expect(startButton).toBeInTheDocument();
    
    // Check for the main feature sections
    expect(screen.getByText('Concurrent Execution')).toBeInTheDocument();
    expect(screen.getByText('Task Hierarchy')).toBeInTheDocument();
    expect(screen.getByText('Context Awareness')).toBeInTheDocument();
    expect(screen.getByText('Progress Monitoring')).toBeInTheDocument();
    
    // Check that scrollable container exists
    const scrollableContainer = document.querySelector('.welcome-scrollable-container');
    expect(scrollableContainer).toBeInTheDocument();
    
    // Check that scroll shadows exist
    expect(document.querySelector('.scroll-shadow-top')).toBeInTheDocument();
    expect(document.querySelector('.scroll-shadow-bottom')).toBeInTheDocument();
  });

  it('calls onCreateTask when button is clicked', () => {
    const mockOnCreateTask = jest.fn();
    render(<InboxWelcomeView onCreateTask={mockOnCreateTask} />);
    
    // Find and click the "Start New Task" button
    const startButton = screen.getByText('Start New Task');
    startButton.click();
    
    // Verify that the onCreateTask callback was called
    expect(mockOnCreateTask).toHaveBeenCalledTimes(1);
  });
});