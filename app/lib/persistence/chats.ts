/**
 * Functions for managing chat data in IndexedDB
 */

import type { Message } from 'ai';
import type { IChatMetadata } from './db';
import type { AuthenticatedChatData, ConflictResolution } from './types';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
}

export interface Chat {
  id: string;
  description?: string;
  messages: Message[];
  timestamp: string;
  urlId?: string;
  metadata?: IChatMetadata;
}

export interface AuthenticatedChat extends Chat {
  userId?: string;
  isPublic: boolean;
  sharedWith?: string[];
  syncStatus: 'synced' | 'pending' | 'conflict';
  lastSyncAt?: string;
  authData?: AuthenticatedChatData;
}

/**
 * Get all chats from the database
 * @param db The IndexedDB database instance
 * @returns A promise that resolves to an array of chats
 */
export async function getAllChats(db: IDBDatabase): Promise<Chat[]> {
  console.log(`getAllChats: Using database '${db.name}', version ${db.version}`);

  return new Promise((resolve, reject) => {
    try {
      const transaction = db.transaction(['chats'], 'readonly');
      const store = transaction.objectStore('chats');
      const request = store.getAll();

      request.onsuccess = () => {
        const result = request.result || [];
        console.log(`getAllChats: Found ${result.length} chats in database '${db.name}'`);
        resolve(result);
      };

      request.onerror = () => {
        console.error(`getAllChats: Error querying database '${db.name}':`, request.error);
        reject(request.error);
      };
    } catch (err) {
      console.error(`getAllChats: Error creating transaction on database '${db.name}':`, err);
      reject(err);
    }
  });
}

/**
 * Get a chat by ID
 * @param db The IndexedDB database instance
 * @param id The ID of the chat to get
 * @returns A promise that resolves to the chat or null if not found
 */
export async function getChatById(db: IDBDatabase, id: string): Promise<Chat | null> {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['chats'], 'readonly');
    const store = transaction.objectStore('chats');
    const request = store.get(id);

    request.onsuccess = () => {
      resolve(request.result || null);
    };

    request.onerror = () => {
      reject(request.error);
    };
  });
}

/**
 * Save a chat to the database
 * @param db The IndexedDB database instance
 * @param chat The chat to save
 * @returns A promise that resolves when the chat is saved
 */
export async function saveChat(db: IDBDatabase, chat: Chat): Promise<void> {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['chats'], 'readwrite');
    const store = transaction.objectStore('chats');
    const request = store.put(chat);

    request.onsuccess = () => {
      resolve();
    };

    request.onerror = () => {
      reject(request.error);
    };
  });
}

/**
 * Delete a chat by ID
 * @param db The IndexedDB database instance
 * @param id The ID of the chat to delete
 * @returns A promise that resolves when the chat is deleted
 */
export async function deleteChat(db: IDBDatabase, id: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['chats'], 'readwrite');
    const store = transaction.objectStore('chats');
    const request = store.delete(id);

    request.onsuccess = () => {
      resolve();
    };

    request.onerror = () => {
      reject(request.error);
    };
  });
}

/**
 * Delete all chats
 * @param db The IndexedDB database instance
 * @returns A promise that resolves when all chats are deleted
 */
export async function deleteAllChats(db: IDBDatabase): Promise<void> {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['chats'], 'readwrite');
    const store = transaction.objectStore('chats');
    const request = store.clear();

    request.onsuccess = () => {
      resolve();
    };

    request.onerror = () => {
      reject(request.error);
    };
  });
}

/**
 * Get chats for a specific authenticated user
 * @param db The IndexedDB database instance
 * @param userId The ID of the user
 * @returns A promise that resolves to an array of user's chats
 */
export async function getChatsByUserId(db: IDBDatabase, userId: string): Promise<AuthenticatedChat[]> {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['chats'], 'readonly');
    const store = transaction.objectStore('chats');

    // Try to use the userId index if it exists
    if (store.indexNames.contains('userId')) {
      const index = store.index('userId');
      const request = index.getAll(userId);

      request.onsuccess = () => {
        const chats = request.result.map((chat) => ({
          ...chat,
          userId: chat.metadata?.userId,
          isPublic: false, // Default to private
          syncStatus: chat.metadata?.syncStatus || 'synced',
          lastSyncAt: chat.metadata?.lastSyncAt,
        })) as AuthenticatedChat[];
        resolve(chats);
      };
      request.onerror = () => reject(request.error);
    } else {
      // Fallback to scanning all chats if index doesn't exist
      const request = store.getAll();

      request.onsuccess = () => {
        const allChats = request.result as Chat[];
        const userChats = allChats
          .filter((chat) => chat.metadata?.userId === userId)
          .map((chat) => ({
            ...chat,
            userId: chat.metadata?.userId,
            isPublic: false,
            syncStatus: chat.metadata?.syncStatus || 'synced',
            lastSyncAt: chat.metadata?.lastSyncAt,
          })) as AuthenticatedChat[];
        resolve(userChats);
      };
      request.onerror = () => reject(request.error);
    }
  });
}

/**
 * Get chats that need synchronization
 * @param db The IndexedDB database instance
 * @param userId The ID of the user (optional, for filtering)
 * @returns A promise that resolves to an array of chats needing sync
 */
export async function getChatsNeedingSync(db: IDBDatabase, userId?: string): Promise<AuthenticatedChat[]> {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['chats'], 'readonly');
    const store = transaction.objectStore('chats');

    if (store.indexNames.contains('syncStatus')) {
      const index = store.index('syncStatus');
      const request = index.getAll('pending');

      request.onsuccess = () => {
        let chats = request.result.map((chat) => ({
          ...chat,
          userId: chat.metadata?.userId,
          isPublic: false,
          syncStatus: chat.metadata?.syncStatus || 'pending',
          lastSyncAt: chat.metadata?.lastSyncAt,
        })) as AuthenticatedChat[];

        // Filter by userId if provided
        if (userId) {
          chats = chats.filter((chat) => chat.userId === userId);
        }

        resolve(chats);
      };
      request.onerror = () => reject(request.error);
    } else {
      // Fallback to scanning all chats
      const request = store.getAll();

      request.onsuccess = () => {
        const allChats = request.result as Chat[];
        let pendingChats = allChats
          .filter((chat) => chat.metadata?.syncStatus === 'pending')
          .map((chat) => ({
            ...chat,
            userId: chat.metadata?.userId,
            isPublic: false,
            syncStatus: chat.metadata?.syncStatus || 'pending',
            lastSyncAt: chat.metadata?.lastSyncAt,
          })) as AuthenticatedChat[];

        // Filter by userId if provided
        if (userId) {
          pendingChats = pendingChats.filter((chat) => chat.userId === userId);
        }

        resolve(pendingChats);
      };
      request.onerror = () => reject(request.error);
    }
  });
}

/**
 * Save an authenticated chat with sync metadata
 * @param db The IndexedDB database instance
 * @param chat The authenticated chat to save
 * @returns A promise that resolves when the chat is saved
 */
export async function saveAuthenticatedChat(db: IDBDatabase, chat: AuthenticatedChat): Promise<void> {
  const metadata = {
    gitUrl: '',
    ...chat.metadata,
    userId: chat.userId,
    syncStatus: chat.syncStatus,
    lastSyncAt: chat.lastSyncAt || new Date().toISOString(),
  };

  const chatToSave: Chat = {
    id: chat.id,
    description: chat.description,
    messages: chat.messages,
    timestamp: chat.timestamp,
    urlId: chat.urlId,
    metadata,
  };

  return saveChat(db, chatToSave);
}

/**
 * Transfer ownership of unauthenticated chats to a user
 * @param db The IndexedDB database instance
 * @param userId The ID of the user to transfer chats to
 * @returns A promise that resolves to the number of chats transferred
 */
export async function transferUnauthenticatedChats(db: IDBDatabase, userId: string): Promise<number> {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['chats'], 'readwrite');
    const store = transaction.objectStore('chats');
    const request = store.getAll();

    request.onsuccess = async () => {
      const allChats = request.result as Chat[];
      const unauthenticatedChats = allChats.filter((chat) => !chat.metadata?.userId);

      let transferredCount = 0;

      try {
        for (const chat of unauthenticatedChats) {
          const updatedMetadata = {
            gitUrl: '',
            ...chat.metadata,
            userId,
            syncStatus: 'synced' as const,
            lastSyncAt: new Date().toISOString(),
          };

          const updatedChat: Chat = {
            ...chat,
            metadata: updatedMetadata,
          };

          await saveChat(db, updatedChat);
          transferredCount++;
        }

        resolve(transferredCount);
      } catch (error) {
        reject(error);
      }
    };

    request.onerror = () => reject(request.error);
  });
}
