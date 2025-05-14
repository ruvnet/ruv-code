import { VSCodeButton, VSCodeLink } from "@vscode/webview-ui-toolkit/react"
import { Trans } from "react-i18next"
import { useAppTranslation } from "@src/i18n/TranslationContext"
import RooHero from "@src/components/welcome/RooHero"
import { useRef, useEffect } from "react"

/**
 * InboxWelcomeView Component
 * 
 * This component serves as the welcome screen for the Agentic Inbox feature.
 * It provides an overview of the agentic tasks system and its benefits.
 */
interface InboxWelcomeViewProps {
  onCreateTask?: () => void
}

const InboxWelcomeView: React.FC<InboxWelcomeViewProps> = ({ onCreateTask }) => {
  const { t } = useAppTranslation()
  const containerRef = useRef<HTMLDivElement>(null)
  
  // Add effect to handle scroll shadow visibility
  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    
    const handleScroll = () => {
      const topShadow = container.querySelector('.scroll-shadow-top') as HTMLElement
      const bottomShadow = container.querySelector('.scroll-shadow-bottom') as HTMLElement
      
      if (topShadow && bottomShadow) {
        // Show top shadow when scrolled down
        topShadow.style.opacity = container.scrollTop > 20 ? '1' : '0'
        
        // Show bottom shadow when not at the bottom
        const atBottom = container.scrollHeight - container.scrollTop <= container.clientHeight + 20
        bottomShadow.style.opacity = atBottom ? '0' : '1'
      }
    }
    
    // Set initial shadow states
    handleScroll()
    
    // Add scroll event listener
    container.addEventListener('scroll', handleScroll)
    
    // Cleanup
    return () => {
      container.removeEventListener('scroll', handleScroll)
    }
  }, [])
  
  // We don't need imagesBaseUri here as RooHero component handles this internally
  return (
    <div 
      ref={containerRef}
      className="flex flex-col gap-5 px-3.5 min-[370px]:px-10 pt-5 pb-10 h-full overflow-y-auto scroll-smooth relative [scrollbar-gutter:stable] [scrollbar-width:thin] welcome-scrollable-container"
    >
      {/* Scroll shadow indicators */}
      <div className="scroll-shadow-top absolute left-0 right-0 top-0 h-6 pointer-events-none bg-gradient-to-b from-vscode-editor-background to-transparent opacity-0 transition-opacity duration-300 z-10"></div>
      <div className="scroll-shadow-bottom absolute left-0 right-0 bottom-0 h-6 pointer-events-none bg-gradient-to-t from-vscode-editor-background to-transparent opacity-0 transition-opacity duration-300 z-10"></div>
      
      <RooHero />
      
      <h2 className="text-center font-medium">Agentic Inbox</h2>
      
      <div className="border border-vscode-panel-border rounded p-3 sm:p-5 bg-vscode-editor-background">
        <h3 className="text-md sm:text-lg font-medium mb-2 sm:mb-3 text-vscode-foreground">Manage Concurrent Tasks Efficiently</h3>
        
        <p className="text-sm sm:text-base text-vscode-editor-foreground mb-3 sm:mb-4">
          The Agentic Inbox allows you to create, manage, and monitor multiple AI-powered tasks simultaneously,
          improving your workflow productivity.
        </p>
        
        <div className="space-y-2 sm:space-y-3 mb-4">
          <div className="flex items-start">
            <span className="codicon codicon-multiple-windows text-lg mr-2 mt-0.5 text-vscode-descriptionForeground"></span>
            <div>
              <h4 className="font-medium text-vscode-foreground">Concurrent Execution</h4>
              <p className="text-sm text-vscode-descriptionForeground">Run multiple AI tasks in parallel without blocking your main workflow</p>
            </div>
          </div>
          
          <div className="flex items-start">
            <span className="codicon codicon-list-tree text-lg mr-2 mt-0.5 text-vscode-descriptionForeground"></span>
            <div>
              <h4 className="font-medium text-vscode-foreground">Task Hierarchy</h4>
              <p className="text-sm text-vscode-descriptionForeground">Create subtasks that can work independently while maintaining context</p>
            </div>
          </div>
          
          <div className="flex items-start">
            <span className="codicon codicon-references text-lg mr-2 mt-0.5 text-vscode-descriptionForeground"></span>
            <div>
              <h4 className="font-medium text-vscode-foreground">Context Awareness</h4>
              <p className="text-sm text-vscode-descriptionForeground">Tasks maintain access to relevant context while operating independently</p>
            </div>
          </div>
          
          <div className="flex items-start">
            <span className="codicon codicon-dashboard text-lg mr-2 mt-0.5 text-vscode-descriptionForeground"></span>
            <div>
              <h4 className="font-medium text-vscode-foreground">Progress Monitoring</h4>
              <p className="text-sm text-vscode-descriptionForeground">Track the status and progress of all running tasks from a central dashboard</p>
            </div>
          </div>
        </div>
        
        <div className="bg-vscode-panel-background p-3 rounded border border-vscode-panel-border">
          <h4 className="font-medium mb-1 text-vscode-foreground">When to use the Agentic Inbox:</h4>
          <ul className="list-disc pl-5 space-y-1 text-sm text-vscode-descriptionForeground">
            <li>When you need to run multiple complex tasks simultaneously</li>
            <li>For breaking down large projects into parallel workstreams</li>
            <li>To delegate research, code generation, or analysis while you focus on other work</li>
            <li>To maintain organization when working with multiple AI assistants</li>
          </ul>
        </div>
      </div>
      
      <div className="text-center text-vscode-descriptionForeground text-xs sm:text-sm mt-2">
        <Trans
          i18nKey="inbox:welcomeLearnMore"
          defaults="To learn more about the Agentic Inbox, visit <DocsLink>the documentation</DocsLink>"
          components={{
            DocsLink: (
              <VSCodeLink href="https://docs.roocode.com/" target="_blank" rel="noopener noreferrer">
                the documentation
              </VSCodeLink>
            ),
          }}
        />
      </div>
      
      <div className="mt-4 mb-6 text-center">
        <VSCodeButton
          appearance="primary"
          onClick={onCreateTask}
        >
          {t("inbox:startNewTask")}
        </VSCodeButton>
      </div>
    </div>
  )
}

export default InboxWelcomeView