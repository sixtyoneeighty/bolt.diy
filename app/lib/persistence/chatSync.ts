/**
 * Chat synchronization service for authenticated users
 */

import type { Message } from 'ai';
import { createScopedLogger } from '~/utils/logger';
import type { AuthenticatedChat } from './chats';
import type { ConflictResolution } from './types';
import {
  openDatabase,
  markChatForSync,
  markChatSynced,
  detectConflict,
  resolveConflict,
  getChatsBySyncStatus,
  getSyncMetadata,
  getMessages,
} from './db';

const logger = createScopedLogger('ChatSync');

export interface SyncResult {
  success: boolean;
  chatId: string;
  conflictDetected?: boolean;
  error?: string;
}

export interface SyncOptions {
  forceSync?: boolean;
  conflictResolution?: 'local' | 'remote' | 'manual';
}

export class ChatSyncService {
  private _db: IDBDatabase | undefined;
  private _syncInProgress = new Set<string>();

  constructor() {
    this._initializeDatabase();
  }

  private async _initializeDatabase(): Promise<void> {
    try {
      this._db = await openDatabase();
    } catch (error) {
      logger.error('Failed to initialize database for sync service', error);
    }
  }

  /**
   * Sync a specific chat with the server
   */
  async syncChat(chatId: string, options: SyncOptions = {}): Promise<SyncResult> {
    if (!this._db) {
      return { success: false, chatId, error: 'Database not available' };
    }

    if (this._syncInProgress.has(chatId)) {
      return { success: false, chatId, error: 'Sync already in progress' };
    }

    this._syncInProgress.add(chatId);

    try {
      const chat = await getMessages(this._db, chatId);

      if (!chat) {
        return { success: false, chatId, error: 'Chat not found' };
      }

      // Mark chat as pending sync
      await markChatForSync(this._db, chatId, ['messages']);

      // Simulate server sync (in a real implementation, this would make API calls)
      const syncResult = await this._performServerSync(chat, options);

      if (syncResult.success) {
        await markChatSynced(this._db, chatId);
      }

      return syncResult;
    } catch (error) {
      logger.error(`Failed to sync chat ${chatId}`, error);
      return {
        success: false,
        chatId,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    } finally {
      this._syncInProgress.delete(chatId);
    }
  }

  /**
   * Sync all pending chats for a user
   */
  async syncAllChats(userId: string, options: SyncOptions = {}): Promise<SyncResult[]> {
    if (!this._db) {
      return [];
    }

    try {
      const pendingChats = await getChatsBySyncStatus(this._db, 'pending');
      const userChats = pendingChats.filter((chat) => chat.metadata?.userId === userId);

      const results: SyncResult[] = [];

      for (const chat of userChats) {
        const result = await this.syncChat(chat.id, options);
        results.push(result);
      }

      return results;
    } catch (error) {
      logger.error(`Failed to sync all chats for user ${userId}`, error);
      return [];
    }
  }

  /**
   * Handle conflict resolution for a chat
   */
  async resolveConflict(
    chatId: string,
    resolution: 'local' | 'remote' | 'merged',
    resolvedMessages?: Message[],
  ): Promise<boolean> {
    if (!this._db) {
      return false;
    }

    try {
      await resolveConflict(this._db, chatId, resolution, resolvedMessages);
      logger.info(`Conflict resolved for chat ${chatId} using ${resolution} resolution`);

      return true;
    } catch (error) {
      logger.error(`Failed to resolve conflict for chat ${chatId}`, error);
      return false;
    }
  }

  /**
   * Get sync status for a chat
   */
  async getSyncStatus(chatId: string): Promise<{
    syncStatus: 'synced' | 'pending' | 'conflict';
    lastSyncAt?: string;
    pendingChanges: string[];
  }> {
    if (!this._db) {
      return { syncStatus: 'synced', pendingChanges: [] };
    }

    try {
      const chat = await getMessages(this._db, chatId);
      const syncMetadata = await getSyncMetadata(this._db, chatId);

      return {
        syncStatus: chat?.metadata?.syncStatus || 'synced',
        lastSyncAt: chat?.metadata?.lastSyncAt,
        pendingChanges: syncMetadata?.pendingChanges || [],
      };
    } catch (error) {
      logger.error(`Failed to get sync status for chat ${chatId}`, error);
      return { syncStatus: 'synced', pendingChanges: [] };
    }
  }

  /**
   * Force sync a chat (ignores current sync status)
   */
  async forceSyncChat(chatId: string): Promise<SyncResult> {
    return this.syncChat(chatId, { forceSync: true });
  }

  /**
   * Check for conflicts between local and remote versions
   */
  async checkForConflicts(chatId: string, remoteMessages: Message[]): Promise<ConflictResolution | null> {
    if (!this._db) {
      return null;
    }

    try {
      const chat = await getMessages(this._db, chatId);

      if (!chat) {
        return null;
      }

      return await detectConflict(this._db, chatId, chat.messages, remoteMessages);
    } catch (error) {
      logger.error(`Failed to check for conflicts in chat ${chatId}`, error);
      return null;
    }
  }

  /**
   * Merge messages from local and remote versions
   */
  mergeMessages(localMessages: Message[], remoteMessages: Message[]): Message[] {
    // Simple merge strategy: combine messages by timestamp and remove duplicates
    const allMessages = [...localMessages, ...remoteMessages];
    const messageMap = new Map<string, Message>();

    // Use message ID as key to remove duplicates, keeping the most recent version
    allMessages.forEach((message) => {
      const existing = messageMap.get(message.id);

      if (!existing || (message.createdAt && existing.createdAt && message.createdAt > existing.createdAt)) {
        messageMap.set(message.id, message);
      }
    });

    // Sort by creation time or order in original arrays
    return Array.from(messageMap.values()).sort((a, b) => {
      if (a.createdAt && b.createdAt) {
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      }

      // Fallback to original order if no timestamps
      const aIndex = localMessages.findIndex((m) => m.id === a.id);
      const bIndex = localMessages.findIndex((m) => m.id === b.id);

      if (aIndex !== -1 && bIndex !== -1) {
        return aIndex - bIndex;
      }

      return 0;
    });
  }

  /**
   * Simulate server synchronization (placeholder for actual API calls)
   */
  private async _performServerSync(chat: any, _options: SyncOptions): Promise<SyncResult> {
    /*
     * In a real implementation, this would:
     * 1. Send local changes to server
     * 2. Fetch remote changes from server
     * 3. Detect and handle conflicts
     * 4. Update local storage with resolved state
     */

    try {
      // Simulate network delay
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Simulate successful sync for now
      logger.info(`Simulated sync for chat ${chat.id}`);

      return {
        success: true,
        chatId: chat.id,
        conflictDetected: false,
      };
    } catch (error) {
      return {
        success: false,
        chatId: chat.id,
        error: error instanceof Error ? error.message : 'Sync failed',
      };
    }
  }

  /**
   * Enable automatic sync for authenticated users
   */
  enableAutoSync(userId: string, intervalMs: number = 30000): () => void {
    const interval = setInterval(async () => {
      try {
        await this.syncAllChats(userId, { conflictResolution: 'local' });
      } catch (error) {
        logger.error(`Auto-sync failed for user ${userId}`, error);
      }
    }, intervalMs);

    // Return cleanup function
    return () => {
      clearInterval(interval);
    };
  }

  /**
   * Get all chats that have conflicts
   */
  async getConflictedChats(userId?: string): Promise<AuthenticatedChat[]> {
    if (!this._db) {
      return [];
    }

    try {
      const conflictedChats = await getChatsBySyncStatus(this._db, 'conflict');

      if (userId) {
        return conflictedChats.filter((chat) => chat.metadata?.userId === userId) as AuthenticatedChat[];
      }

      return conflictedChats as AuthenticatedChat[];
    } catch (error) {
      logger.error('Failed to get conflicted chats', error);
      return [];
    }
  }
}

// Singleton instance
export const chatSyncService = new ChatSyncService();
