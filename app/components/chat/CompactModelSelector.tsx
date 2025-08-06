import type { ProviderInfo } from '~/types/model';
import { useEffect, useState, useRef } from 'react';
import type { KeyboardEvent } from 'react';
import type { ModelInfo } from '~/lib/modules/llm/types';
import { classNames } from '~/utils/classNames';

interface CompactModelSelectorProps {
  model?: string;
  setModel?: (model: string) => void;
  provider?: ProviderInfo;
  setProvider?: (provider: ProviderInfo) => void;
  modelList: ModelInfo[];
  providerList: ProviderInfo[];
  apiKeys: Record<string, string>;
  modelLoading?: string;
}

export const CompactModelSelector = ({
  model,
  setModel,
  provider: _provider,
  setProvider,
  modelList,
  providerList,
  modelLoading,
}: CompactModelSelectorProps) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const optionsRef = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);

    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Get all available models grouped by provider
  const availableModels = modelList
    .filter((modelInfo) => modelInfo.name && modelInfo.provider)
    .map((modelInfo) => {
      const providerInfo = providerList.find((p) => p.name === modelInfo.provider);
      return {
        name: modelInfo.name,
        provider: modelInfo.provider,
        providerInfo,
        modelInfo,
        available: !!providerInfo,
        displayName: modelInfo.label || modelInfo.name,
      };
    })
    .filter((m) => m.available)
    .sort((a, b) => {
      // Sort by provider first, then by model name
      if (a.provider !== b.provider) {
        return a.provider.localeCompare(b.provider);
      }

      return a.displayName.localeCompare(b.displayName);
    });

  // Get current model display info
  const currentModel = availableModels.find((m) => m.modelInfo?.name === model);
  const currentDisplayName = currentModel?.displayName || model || 'Select model';

  useEffect(() => {
    setFocusedIndex(-1);
  }, [isDropdownOpen]);

  useEffect(() => {
    if (focusedIndex >= 0 && optionsRef.current[focusedIndex]) {
      optionsRef.current[focusedIndex]?.scrollIntoView({ block: 'nearest' });
    }
  }, [focusedIndex]);

  // Set default model if none selected
  useEffect(() => {
    if (!model && availableModels.length > 0) {
      const defaultModel = availableModels[0];

      if (defaultModel.modelInfo && defaultModel.providerInfo) {
        setModel?.(defaultModel.modelInfo.name);
        setProvider?.(defaultModel.providerInfo);
      }
    }
  }, [model, availableModels, setModel, setProvider]);

  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (!isDropdownOpen) {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        setIsDropdownOpen(true);
      }

      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setFocusedIndex((prev) => (prev + 1 >= availableModels.length ? 0 : prev + 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setFocusedIndex((prev) => (prev - 1 < 0 ? availableModels.length - 1 : prev - 1));
        break;
      case 'Enter':
        e.preventDefault();

        if (focusedIndex >= 0 && focusedIndex < availableModels.length) {
          const selectedModel = availableModels[focusedIndex];

          if (selectedModel.modelInfo && selectedModel.providerInfo) {
            setModel?.(selectedModel.modelInfo.name);
            setProvider?.(selectedModel.providerInfo);
          }

          setIsDropdownOpen(false);
        }

        break;
      case 'Escape':
        e.preventDefault();
        setIsDropdownOpen(false);
        break;
    }
  };

  const handleModelSelect = (selectedModel: (typeof availableModels)[0]) => {
    if (selectedModel.modelInfo && selectedModel.providerInfo) {
      setModel?.(selectedModel.modelInfo.name);
      setProvider?.(selectedModel.providerInfo);
    }

    setIsDropdownOpen(false);
  };

  if (availableModels.length === 0) {
    return <div className="text-xs text-bolt-elements-textTertiary px-2 py-1">No models available</div>;
  }

  return (
    <div className="relative" onKeyDown={handleKeyDown} ref={dropdownRef}>
      <button
        type="button"
        className={classNames(
          'flex items-center gap-1.5 px-2 py-1 text-xs rounded-md transition-all',
          'bg-bolt-elements-button-secondary-background hover:bg-bolt-elements-button-secondary-backgroundHover',
          'text-bolt-elements-button-secondary-text border border-bolt-elements-borderColor',
          'focus:outline-none focus:ring-2 focus:ring-bolt-elements-borderColorActive',
          isDropdownOpen ? 'ring-2 ring-bolt-elements-borderColorActive' : undefined,
        )}
        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
        aria-expanded={isDropdownOpen}
        aria-haspopup="listbox"
        title={`Current model: ${currentDisplayName}`}
      >
        <div className="i-ph:cpu text-sm" />
        <span className="truncate max-w-24">{currentDisplayName}</span>
        <div
          className={classNames(
            'i-ph:caret-down text-xs transition-transform',
            isDropdownOpen ? 'rotate-180' : undefined,
          )}
        />
      </button>

      {isDropdownOpen && (
        <div
          className="absolute z-50 top-full left-0 mt-1 py-1 min-w-48 rounded-lg border border-bolt-elements-borderColor bg-bolt-elements-background-depth-2 shadow-lg"
          role="listbox"
        >
          <div className="px-2 pb-2">
            <div className="text-xs font-medium text-bolt-elements-textSecondary mb-1">Select Model</div>
          </div>

          <div className="max-h-60 overflow-y-auto">
            {modelLoading === 'all' ? (
              <div className="px-3 py-2 text-xs text-bolt-elements-textTertiary">Loading...</div>
            ) : (
              availableModels.map((modelOption, index) => (
                <div
                  ref={(el) => (optionsRef.current[index] = el)}
                  key={`${modelOption.provider}-${modelOption.name}`}
                  role="option"
                  aria-selected={model === modelOption.modelInfo?.name}
                  className={classNames(
                    'px-3 py-2 text-xs cursor-pointer flex items-center justify-between',
                    'hover:bg-bolt-elements-background-depth-3',
                    'text-bolt-elements-textPrimary',
                    'outline-none',
                    model === modelOption.modelInfo?.name || focusedIndex === index
                      ? 'bg-bolt-elements-background-depth-3'
                      : undefined,
                    focusedIndex === index ? 'ring-1 ring-inset ring-bolt-elements-borderColorActive' : undefined,
                  )}
                  onClick={() => handleModelSelect(modelOption)}
                  tabIndex={focusedIndex === index ? 0 : -1}
                >
                  <div className="flex flex-col items-start">
                    <span className="font-medium">{modelOption.displayName}</span>
                    <span className="text-bolt-elements-textTertiary text-xs">{modelOption.provider}</span>
                  </div>
                  {model === modelOption.modelInfo?.name && (
                    <div className="i-ph:check text-sm text-bolt-elements-button-primary-text" />
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
