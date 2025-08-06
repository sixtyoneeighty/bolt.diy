import { useState } from 'react';
import type { ProviderInfo } from '~/types/model';
import { createScopedLogger } from '~/utils/logger';

const logger = createScopedLogger('usePromptEnhancement');

export function usePromptEnhancer() {
  const [enhancingPrompt, setEnhancingPrompt] = useState(false);
  const [promptEnhanced, setPromptEnhanced] = useState(false);

  const resetEnhancer = () => {
    setEnhancingPrompt(false);
    setPromptEnhanced(false);
  };

  const enhancePrompt = async (
    input: string,
    setInput: (value: string) => void,
    model: string,
    provider: ProviderInfo,
    apiKeys?: Record<string, string>,
  ) => {
    setEnhancingPrompt(true);
    setPromptEnhanced(false);

    const requestBody: any = {
      message: input,
      model,
      provider,
    };

    if (apiKeys) {
      requestBody.apiKeys = apiKeys;
    }

    const originalInput = input;
    let _input = '';
    let timeoutId: NodeJS.Timeout | null = null;

    try {
      // Add timeout to prevent hanging
      const controller = new AbortController();
      timeoutId = setTimeout(() => {
        controller.abort();
      }, 30000); // 30 second timeout

      const response = await fetch('/api/enhancer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const reader = response.body?.getReader();

      if (reader) {
        const decoder = new TextDecoder();
        setInput('');

        // Add a read timeout for each chunk
        while (true) {
          const readPromise = reader.read();
          const chunkTimeoutPromise = new Promise<never>((_, reject) => {
            setTimeout(() => reject(new Error('Chunk read timeout')), 10000);
          });

          const { value, done } = await Promise.race([readPromise, chunkTimeoutPromise]);

          if (done) {
            break;
          }

          const chunk = decoder.decode(value, { stream: true });
          _input += chunk;

          logger.trace('Set input', _input);
          setInput(_input);
        }
      } else {
        throw new Error('No response body received');
      }
    } catch (error) {
      logger.error('Prompt enhancement error:', error);
      setInput(originalInput);
    } finally {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }

      setEnhancingPrompt(false);
      setPromptEnhanced(true);

      // Reset the enhanced state after a short delay
      setTimeout(() => {
        setPromptEnhanced(false);
      }, 2000);
    }
  };

  return { enhancingPrompt, promptEnhanced, enhancePrompt, resetEnhancer };
}
