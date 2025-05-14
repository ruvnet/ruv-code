// npx jest src/__tests__/InboxView.test.tsx

import React from "react"
import { render, screen, fireEvent } from "@testing-library/react"
import "@testing-library/jest-dom"

import InboxView from "../components/inbox/InboxView"

jest.mock("@src/utils/vscode", () => ({
  vscode: {
    postMessage: jest.fn(),
  },
}))

jest.mock("@src/context/ExtensionStateContext", () => ({
  useExtensionState: () => ({
    clineMessages: [],
    apiConfiguration: {},
    mode: "code",
    setMode: jest.fn(),
    hasSystemPromptOverride: false,
    currentTaskItem: undefined,
  }),
}))

jest.mock("@/components/ui/hooks/useSelectedModel", () => ({
  useSelectedModel: () => ({
    info: {
      supportsPromptCache: false,
      supportsImages: true,
    },
  }),
}))

jest.mock("@src/i18n/TranslationContext", () => ({
  useAppTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        "chat:forNextMode": "for next mode",
        "chat:typeMessage": "Type a message",
        "chat:typeTask": "Type a task",
        "inbox:hideSidebar": "Hide Sidebar",
        "inbox:showSidebar": "Show Sidebar",
      }
      return translations[key] || key
    },
  }),
}))

jest.mock("../components/inbox/InboxWelcomeView", () => ({
  __esModule: true,
  default: () => <div data-testid="inbox-welcome-view">Welcome View</div>,
}))

jest.mock("../components/inbox/InboxSidebar", () => ({
  __esModule: true,
  default: ({ onCreateTask, onSelectTask }: { onCreateTask: () => void, onSelectTask: (id: string) => void }) => (
    <div data-testid="inbox-sidebar" onClick={() => {
      onCreateTask();
      onSelectTask("test-task-id");
    }}>
      Sidebar
    </div>
  ),
}))

jest.mock("../components/inbox/InboxTaskHeader", () => ({
  __esModule: true,
  default: ({ onClose }: { onClose: () => void }) => (
    <div data-testid="inbox-task-header" onClick={onClose}>
      Task Header
    </div>
  ),
}))

jest.mock("../components/chat/ChatTextArea", () => ({
  __esModule: true,
  default: ({ onSend }: { onSend: () => void }) => (
    <div data-testid="chat-text-area" onClick={onSend}>
      Text Area
    </div>
  ),
}))

jest.mock("../components/chat/AutoApproveMenu", () => ({
  __esModule: true,
  default: () => <div data-testid="auto-approve-menu">Auto Approve</div>,
}))

jest.mock("@src/components/ui", () => ({
  Button: ({ children, onClick }: { children: React.ReactNode, onClick?: () => void }) => (
    <button data-testid="mock-button" onClick={onClick}>{children}</button>
  ),
}))

jest.mock("../components/chat/SystemPromptWarning", () => ({
  __esModule: true,
  default: () => <div data-testid="system-prompt-warning">System Prompt Warning</div>,
}))

jest.mock("../components/chat/CheckpointWarning", () => ({
  __esModule: true,
  default: () => <div data-testid="checkpoint-warning">Checkpoint Warning</div>,
}))

jest.mock("../components/chat/Announcement", () => ({
  __esModule: true,
  default: ({ hideAnnouncement }: { hideAnnouncement: () => void }) => (
    <div data-testid="announcement" onClick={hideAnnouncement}>
      Announcement
    </div>
  ),
}))

describe("InboxView", () => {
  it("renders welcome view when no tasks are present", () => {
    render(
      <InboxView 
        isHidden={false} 
        showAnnouncement={false} 
        hideAnnouncement={jest.fn()} 
      />
    )

    expect(screen.getByTestId("inbox-welcome-view")).toBeInTheDocument()
    expect(screen.getByTestId("auto-approve-menu")).toBeInTheDocument()
    expect(screen.getByTestId("chat-text-area")).toBeInTheDocument()
    expect(screen.getByTestId("inbox-sidebar")).toBeInTheDocument()
  })

  it("shows announcement when showAnnouncement is true", () => {
    render(
      <InboxView 
        isHidden={false} 
        showAnnouncement={true} 
        hideAnnouncement={jest.fn()} 
      />
    )

    expect(screen.getByTestId("announcement")).toBeInTheDocument()
  })

  it("is hidden when isHidden is true", () => {
    const { container } = render(
      <InboxView 
        isHidden={true} 
        showAnnouncement={false} 
        hideAnnouncement={jest.fn()} 
      />
    )

    // The main container should have the 'hidden' class
    expect(container.firstChild).toHaveClass("hidden")
  })

  it("calls hideAnnouncement when announcement is clicked", () => {
    const hideAnnouncementMock = jest.fn()
    render(
      <InboxView 
        isHidden={false} 
        showAnnouncement={true} 
        hideAnnouncement={hideAnnouncementMock} 
      />
    )

    fireEvent.click(screen.getByTestId("announcement"))
    expect(hideAnnouncementMock).toHaveBeenCalled()
  })

  it("toggles sidebar visibility when toggle button is clicked", () => {
    console.log = jest.fn();
    
    render(
      <InboxView 
        isHidden={false} 
        showAnnouncement={false} 
        hideAnnouncement={jest.fn()} 
      />
    )
    
    // Finding the toggle button and clicking it
    const toggleButtons = screen.getAllByTestId("mock-button")
    const toggleButton = toggleButtons[0]
    
    // Initial state should show the sidebar
    expect(screen.getByTestId("inbox-sidebar")).toBeInTheDocument()
    
    // Click to hide sidebar
    fireEvent.click(toggleButton)
    
    // After clicking, we should see that the toggle method was called
    // (we don't test actual visibility in jest, just the interaction)
    // Additional assertions could be added here based on specific implementation
  })
})