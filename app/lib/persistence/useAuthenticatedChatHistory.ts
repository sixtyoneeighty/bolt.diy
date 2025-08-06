/**
 * Hook for managing authenticated chat history with sync capabilities
 */

import { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-toastify';
import type { Message } from 'ai';
import { createScopedLogger } from '~/utils/logger';
import { openDatabase } from './db';
import { getChatsByUserId, type AuthenticatedChat } from './chats';
import { chatSyncService, type SyncResult } from './chatSync';
import { userProfileStore } from '~/lib/stores/user';

const logger = createScopedLogger('AuthenticatedChatHistory');

export interface UseAuthenticatedChatHistoryReturn {
  chats: AuthenticatedChat[];
  loading: boolean;
  error: string | null;
  syncStatus: 'idle' | 'syncing' | 'error';
  conflictedChats: AuthenticatedChat[];

  // Actions
  refreshChats: () => Promise<void>;
  syncAllChats: () => Promise<SyncResult[]>;
  syncChat: (chatId: string) => Promise<SyncResult>;
  resolveConflict: (
    chatId: string,
    resolution: 'local' | 'remote' | 'merged',
    resolvedMessages?: Message[],
  ) => Promise<boolean>;
  enableAutoSync: () => () => void;
  transferUnauthenticatedChats: () => Promise<number>;
}

export function useAuthenticatedChatHistory(): UseAuthenticatedChatHistoryReturn {
  const [chats, setChats] = useState<AuthenticatedChat[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'error'>('idle');
  const [conflictedChats, setConflictedChats] = useState<AuthenticatedChat[]>([]);

  const currentUser = userProfileStore.get();

  // Load chats for the current user
  const loadChats = useCallback(async () => {
    if (!currentUser) {
      setChats([]);
      setLoading(false);

      return;
    }

    try {
      setLoading(true);
      setError(null);

      const db = await openDatabase();

      if (!db) {
        throw new Error('Database not available');
      }

      const userChats = await getChatsByUserId(db, currentUser.id);
      setChats(userChats);

      // Load conflicted chats
      const conflicts = await chatSyncService.getConflictedChats(currentUser.id);
      setConflictedChats(conflicts);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load chats';
      setError(errorMessage);
      logger.error('Failed to load authenticated chats', err);
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  // Load chats when user changes
  useEffect(() => {
    loadChats();
  }, [loadChats]);

  // Refresh chats
  const refreshChats = useCallback(async () => {
    await loadChats();
  }, [loadChats]);

  // Sync all chats for the current user
  const syncAllChats = useCallback(async (): Promise<SyncResult[]> => {
    if (!currentUser) {
      return [];
    }

    try {
      setSyncStatus('syncing');

      const results = await chatSyncService.syncAllChats(currentUser.id);

      const failedSyncs = results.filter((r) => !r.success);

      if (failedSyncs.length > 0) {
        toast.warning(`${failedSyncs.length} chat${failedSyncs.length > 1 ? 's' : ''} failed to sync`);
        setSyncStatus('error');
      } else {
        toast.success('All chats synchronized successfully');
        setSyncStatus('idle');
      }

      // Refresh chats after sync
      await refreshChats();

      return results;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Sync failed';
      toast.error(`Sync failed: ${errorMessage}`);
      setSyncStatus('error');
      logger.error('Failed to sync all chats', err);

      return [];
    }
  }, [currentUser, refreshChats]);

  // Sync a specific chat
  const syncChat = useCallback(
    async (chatId: string): Promise<SyncResult> => {
      try {
        setSyncStatus('syncing');

        const result = await chatSyncService.syncChat(chatId);

        if (result.success) {
          toast.success('Chat synchronized successfully');
          setSyncStatus('idle');
          await refreshChats();
        } else {
          toast.error(`Sync failed: ${result.error}`);
          setSyncStatus('error');
        }

        return result;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Sync failed';
        const result: SyncResult = { success: false, chatId, error: errorMessage };
        toast.error(`Sync failed: ${errorMessage}`);
        setSyncStatus('error');
        logger.error(`Failed to sync chat ${chatId}`, err);

        return result;
      }
    },
    [refreshChats],
  );

  // Resolve a conflict
  const resolveConflict = useCallback(
    async (
      chatId: string,
      resolution: 'local' | 'remote' | 'merged',
      resolvedMessages?: Message[],
    ): Promise<boolean> => {
      try {
        const success = await chatSyncService.resolveConflict(chatId, resolution, resolvedMessages);

        if (success) {
          toast.success('Conflict resolved successfully');
          await refreshChats();
        } else {
          toast.error('Failed to resolve conflict');
        }

        return success;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to resolve conflict';
        toast.error(errorMessage);
        logger.error(`Failed to resolve conflict for chat ${chatId}`, err);

        return false;
      }
    },
    [refreshChats],
  );

  // Enable auto-sync
  const enableAutoSync = useCallback((): (() => void) => {
    if (!currentUser) {
      return () => {
        // No-op cleanup function when user is not authenticated
      };
    }

    return chatSyncService.enableAutoSync(currentUser.id);
  }, [currentUser]);

  // Transfer unauthenticated chats to current user
  const transferUnauthenticatedChats = useCallback(async (): Promise<number> => {
    if (!currentUser) {
      return 0;
    }

    try {
      const db = await openDatabase();

      if (!db) {
        throw new Error('Database not available');
      }

      const { transferUnauthenticatedChats: transferChats } = await import('./chats');
      const count = await transferChats(db, currentUser.id);

      if (count > 0) {
        toast.success(`Transferred ${count} chat${count > 1 ? 's' : ''} to your account`);
        await refreshChats();
      }

      return count;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to transfer chats';
      toast.error(errorMessage);
      logger.error('Failed to transfer unauthenticated chats', err);

      return 0;
    }
  }, [currentUser, refreshChats]);

  return {
    chats,
    loading,
    error,
    syncStatus,
    conflictedChats,
    refreshChats,
    syncAllChats,
    syncChat,
    resolveConflict,
    enableAutoSync,
    transferUnauthenticatedChats,
  };
}
