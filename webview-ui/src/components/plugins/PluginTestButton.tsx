import React, { useState } from 'react';
import { Play, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PluginExtensionIntegration } from './services/PluginExtensionIntegration';

/**
 * Test button that executes the "npx create-sparc init --force" command
 * to verify the npx plugin creation approach works
 */
export const PluginTestButton: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<{
    status: 'idle' | 'success' | 'error';
    message: string;
  }>({ status: 'idle', message: '' });

  const handleTestClick = async () => {
    setIsLoading(true);
    setResult({ status: 'idle', message: '' });
    
    try {
      const cmdResult = await PluginExtensionIntegration.executeNpxCommand(
        'create-sparc',
        ['init', '--force'],
        {} // Use default working directory
      );

      if (cmdResult.success) {
        setResult({
          status: 'success',
          message: 'Command executed successfully'
        });
      } else {
        setResult({
          status: 'error',
          message: cmdResult.error || 'Failed to execute the npx command'
        });
      }
    } catch (error) {
      setResult({
        status: 'error',
        message: error instanceof Error ? error.message : 'An unknown error occurred'
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col mb-4">
      <Button
        onClick={handleTestClick}
        disabled={isLoading}
        className="flex items-center gap-1 mb-2 w-full sm:w-auto"
      >
        {isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Play className="h-4 w-4" />
        )}
        Test npx create-sparc
      </Button>
      
      {result.message && (
        <div className={`mt-1 text-sm ${
          result.status === 'success' ? 'text-green-500' :
          result.status === 'error' ? 'text-red-500' : ''
        }`}>
          {result.message}
        </div>
      )}
    </div>
  );
};