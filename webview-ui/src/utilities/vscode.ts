/**
 * Helper to communicate with the extension host
 */
export interface VSCodeAPI {
  /**
   * Post a message to the extension host
   * @param message The message to post
   * @returns A promise that resolves with the response from the extension host
   */
  postMessage<T, R>(message: T): Promise<R>;
  
  /**
   * Get the current state stored in the webview
   */
  getState(): any;
  
  /**
   * Set the current state to store in the webview
   * @param state The state to store
   */
  setState(state: any): void;
}

/**
 * Wrapper for the acquireVsCodeApi function
 */
const createVSCodeApi = (): VSCodeAPI => {
  // Access VS Code API
  const vsCodeApi = (() => {
    try {
      // In VS Code context, this exists
      return acquireVsCodeApi();
    } catch (error) {
      // In a test or non-VS Code context, create a mock
      return {
        postMessage: () => {},
        getState: () => ({}),
        setState: () => {}
      };
    }
  })();

  // Create Promise-based message handling
  const callbacks = new Map<string, { resolve: Function; reject: Function }>();
  
  // Listen for messages from the extension
  window.addEventListener('message', (event) => {
    const message = event.data;
    
    // Handle responses to our requests
    if (message && message.requestId && callbacks.has(message.requestId)) {
      const { resolve, reject } = callbacks.get(message.requestId)!;
      
      if (message.error) {
        reject(new Error(message.error));
      } else {
        resolve(message);
      }
      
      callbacks.delete(message.requestId);
    }
  });

  // The promise-based API
  return {
    postMessage<T, R>(message: T): Promise<R> {
      return new Promise((resolve, reject) => {
        // Generate a unique request ID
        const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        // Store the callbacks
        callbacks.set(requestId, { resolve, reject });
        
        // Send the message with the request ID
        vsCodeApi.postMessage({
          ...message,
          requestId
        });
        
        // Set a timeout to prevent hanging promises
        setTimeout(() => {
          if (callbacks.has(requestId)) {
            callbacks.delete(requestId);
            reject(new Error('Request timed out'));
          }
        }, 30000); // 30 second timeout
      });
    },
    
    getState(): any {
      return vsCodeApi.getState();
    },
    
    setState(state: any): void {
      vsCodeApi.setState(state);
    }
  };
};

// Create and export the VS Code API
export const vscode = createVSCodeApi();