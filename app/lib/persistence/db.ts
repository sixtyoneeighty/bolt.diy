import type { Message } from 'ai';
import { createScopedLogger } from '~/utils/logger';
import type { ChatHistoryItem } from './useChatHistory';
import type { Snapshot, ConflictResolution, SyncMetadata } from './types';

export interface IChatMetadata {
  gitUrl?: string;
  gitBranch?: string;
  netlifySiteId?: string;
  userId?: string; // Add user ID for authenticated chats
  syncStatus?: 'synced' | 'pending' | 'conflict'; // Add sync status
  lastSyncAt?: string; // Add last sync timestamp
}

const logger = createScopedLogger('ChatHistory');

// this is used at the top level and never rejects
export async function openDatabase(): Promise<IDBDatabase | undefined> {
  if (typeof indexedDB === 'undefined') {
    console.error('indexedDB is not available in this environment.');
    return undefined;
  }

  return new Promise((resolve) => {
    const request = indexedDB.open('boltHistory', 4);

    request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
      const db = (event.target as IDBOpenDBRequest).result;
      const oldVersion = event.oldVersion;

      if (oldVersion < 1) {
        if (!db.objectStoreNames.contains('chats')) {
          const store = db.createObjectStore('chats', { keyPath: 'id' });
          store.createIndex('id', 'id', { unique: true });
          store.createIndex('urlId', 'urlId', { unique: true });
        }
      }

      if (oldVersion < 2) {
        if (!db.objectStoreNames.contains('snapshots')) {
          db.createObjectStore('snapshots', { keyPath: 'chatId' });
        }
      }

      if (oldVersion < 3) {
        // Add userId index to chats store for filtering authenticated user chats
        if (db.objectStoreNames.contains('chats')) {
          const transaction = (event.target as IDBOpenDBRequest).transaction;
          const store = transaction?.objectStore('chats');

          if (store && !store.indexNames.contains('userId')) {
            store.createIndex('userId', 'metadata.userId', { unique: false });
          }
        }
      }

      if (oldVersion < 4) {
        // Add conflict resolution store for handling sync conflicts
        if (!db.objectStoreNames.contains('conflicts')) {
          const conflictStore = db.createObjectStore('conflicts', { keyPath: 'chatId' });
          conflictStore.createIndex('chatId', 'chatId', { unique: true });
          conflictStore.createIndex('conflictType', 'conflictType', { unique: false });
          conflictStore.createIndex('resolution', 'resolution', { unique: false });
        }

        // Add sync metadata store for tracking sync state
        if (!db.objectStoreNames.contains('syncMetadata')) {
          const syncStore = db.createObjectStore('syncMetadata', { keyPath: 'chatId' });
          syncStore.createIndex('chatId', 'chatId', { unique: true });
          syncStore.createIndex('lastSyncTimestamp', 'lastSyncTimestamp', { unique: false });
        }

        // Add additional indexes to chats store for sync functionality
        if (db.objectStoreNames.contains('chats')) {
          const transaction = (event.target as IDBOpenDBRequest).transaction;
          const store = transaction?.objectStore('chats');

          if (store) {
            if (!store.indexNames.contains('syncStatus')) {
              store.createIndex('syncStatus', 'metadata.syncStatus', { unique: false });
            }

            if (!store.indexNames.contains('lastSyncAt')) {
              store.createIndex('lastSyncAt', 'metadata.lastSyncAt', { unique: false });
            }
          }
        }
      }
    };

    request.onsuccess = (event: Event) => {
      resolve((event.target as IDBOpenDBRequest).result);
    };

    request.onerror = (event: Event) => {
      resolve(undefined);
      logger.error((event.target as IDBOpenDBRequest).error);
    };
  });
}

export async function getAll(db: IDBDatabase): Promise<ChatHistoryItem[]> {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction('chats', 'readonly');
    const store = transaction.objectStore('chats');
    const request = store.getAll();

    request.onsuccess = () => resolve(request.result as ChatHistoryItem[]);
    request.onerror = () => reject(request.error);
  });
}

export async function getChatsByUserId(db: IDBDatabase, userId: string): Promise<ChatHistoryItem[]> {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction('chats', 'readonly');
    const store = transaction.objectStore('chats');

    // Try to use the userId index if it exists
    if (store.indexNames.contains('userId')) {
      const index = store.index('userId');
      const request = index.getAll(userId);

      request.onsuccess = () => resolve(request.result as ChatHistoryItem[]);
      request.onerror = () => reject(request.error);
    } else {
      // Fallback to scanning all chats if index doesn't exist
      const request = store.getAll();

      request.onsuccess = () => {
        const allChats = request.result as ChatHistoryItem[];
        const userChats = allChats.filter((chat) => chat.metadata?.userId === userId);
        resolve(userChats);
      };
      request.onerror = () => reject(request.error);
    }
  });
}

export async function getUnauthenticatedChats(db: IDBDatabase): Promise<ChatHistoryItem[]> {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction('chats', 'readonly');
    const store = transaction.objectStore('chats');
    const request = store.getAll();

    request.onsuccess = () => {
      const allChats = request.result as ChatHistoryItem[];

      // Return chats that don't have a userId (created before authentication)
      const unauthenticatedChats = allChats.filter((chat) => !chat.metadata?.userId);
      resolve(unauthenticatedChats);
    };
    request.onerror = () => reject(request.error);
  });
}

export async function setMessages(
  db: IDBDatabase,
  id: string,
  messages: Message[],
  urlId?: string,
  description?: string,
  timestamp?: string,
  metadata?: IChatMetadata,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction('chats', 'readwrite');
    const store = transaction.objectStore('chats');

    if (timestamp && isNaN(Date.parse(timestamp))) {
      reject(new Error('Invalid timestamp'));
      return;
    }

    const request = store.put({
      id,
      messages,
      urlId,
      description,
      timestamp: timestamp ?? new Date().toISOString(),
      metadata,
    });

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function getMessages(db: IDBDatabase, id: string): Promise<ChatHistoryItem> {
  return (await getMessagesById(db, id)) || (await getMessagesByUrlId(db, id));
}

export async function getMessagesByUrlId(db: IDBDatabase, id: string): Promise<ChatHistoryItem> {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction('chats', 'readonly');
    const store = transaction.objectStore('chats');
    const index = store.index('urlId');
    const request = index.get(id);

    request.onsuccess = () => resolve(request.result as ChatHistoryItem);
    request.onerror = () => reject(request.error);
  });
}

export async function getMessagesById(db: IDBDatabase, id: string): Promise<ChatHistoryItem> {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction('chats', 'readonly');
    const store = transaction.objectStore('chats');
    const request = store.get(id);

    request.onsuccess = () => resolve(request.result as ChatHistoryItem);
    request.onerror = () => reject(request.error);
  });
}

export async function deleteById(db: IDBDatabase, id: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['chats', 'snapshots'], 'readwrite'); // Add snapshots store to transaction
    const chatStore = transaction.objectStore('chats');
    const snapshotStore = transaction.objectStore('snapshots');

    const deleteChatRequest = chatStore.delete(id);
    const deleteSnapshotRequest = snapshotStore.delete(id); // Also delete snapshot

    let chatDeleted = false;
    let snapshotDeleted = false;

    const checkCompletion = () => {
      if (chatDeleted && snapshotDeleted) {
        resolve(undefined);
      }
    };

    deleteChatRequest.onsuccess = () => {
      chatDeleted = true;
      checkCompletion();
    };
    deleteChatRequest.onerror = () => reject(deleteChatRequest.error);

    deleteSnapshotRequest.onsuccess = () => {
      snapshotDeleted = true;
      checkCompletion();
    };

    deleteSnapshotRequest.onerror = (event) => {
      if ((event.target as IDBRequest).error?.name === 'NotFoundError') {
        snapshotDeleted = true;
        checkCompletion();
      } else {
        reject(deleteSnapshotRequest.error);
      }
    };

    transaction.oncomplete = () => {
      // This might resolve before checkCompletion if one operation finishes much faster
    };
    transaction.onerror = () => reject(transaction.error);
  });
}

export async function getNextId(db: IDBDatabase): Promise<string> {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction('chats', 'readonly');
    const store = transaction.objectStore('chats');
    const request = store.getAllKeys();

    request.onsuccess = () => {
      const highestId = request.result.reduce((cur, acc) => Math.max(+cur, +acc), 0);
      resolve(String(+highestId + 1));
    };

    request.onerror = () => reject(request.error);
  });
}

export async function getUrlId(db: IDBDatabase, id: string): Promise<string> {
  const idList = await getUrlIds(db);

  if (!idList.includes(id)) {
    return id;
  } else {
    let i = 2;

    while (idList.includes(`${id}-${i}`)) {
      i++;
    }

    return `${id}-${i}`;
  }
}

async function getUrlIds(db: IDBDatabase): Promise<string[]> {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction('chats', 'readonly');
    const store = transaction.objectStore('chats');
    const idList: string[] = [];

    const request = store.openCursor();

    request.onsuccess = (event: Event) => {
      const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;

      if (cursor) {
        idList.push(cursor.value.urlId);
        cursor.continue();
      } else {
        resolve(idList);
      }
    };

    request.onerror = () => {
      reject(request.error);
    };
  });
}

export async function forkChat(db: IDBDatabase, chatId: string, messageId: string): Promise<string> {
  const chat = await getMessages(db, chatId);

  if (!chat) {
    throw new Error('Chat not found');
  }

  // Find the index of the message to fork at
  const messageIndex = chat.messages.findIndex((msg) => msg.id === messageId);

  if (messageIndex === -1) {
    throw new Error('Message not found');
  }

  // Get messages up to and including the selected message
  const messages = chat.messages.slice(0, messageIndex + 1);

  return createChatFromMessages(db, chat.description ? `${chat.description} (fork)` : 'Forked chat', messages);
}

export async function duplicateChat(db: IDBDatabase, id: string): Promise<string> {
  const chat = await getMessages(db, id);

  if (!chat) {
    throw new Error('Chat not found');
  }

  return createChatFromMessages(db, `${chat.description || 'Chat'} (copy)`, chat.messages);
}

export async function createChatFromMessages(
  db: IDBDatabase,
  description: string,
  messages: Message[],
  metadata?: IChatMetadata,
): Promise<string> {
  const newId = await getNextId(db);
  const newUrlId = await getUrlId(db, newId); // Get a new urlId for the duplicated chat

  await setMessages(
    db,
    newId,
    messages,
    newUrlId, // Use the new urlId
    description,
    undefined, // Use the current timestamp
    metadata,
  );

  return newUrlId; // Return the urlId instead of id for navigation
}

export async function updateChatDescription(db: IDBDatabase, id: string, description: string): Promise<void> {
  const chat = await getMessages(db, id);

  if (!chat) {
    throw new Error('Chat not found');
  }

  if (!description.trim()) {
    throw new Error('Description cannot be empty');
  }

  await setMessages(db, id, chat.messages, chat.urlId, description, chat.timestamp, chat.metadata);
}

export async function updateChatMetadata(
  db: IDBDatabase,
  id: string,
  metadata: IChatMetadata | undefined,
): Promise<void> {
  const chat = await getMessages(db, id);

  if (!chat) {
    throw new Error('Chat not found');
  }

  await setMessages(db, id, chat.messages, chat.urlId, chat.description, chat.timestamp, metadata);
}

export async function getSnapshot(db: IDBDatabase, chatId: string): Promise<Snapshot | undefined> {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction('snapshots', 'readonly');
    const store = transaction.objectStore('snapshots');
    const request = store.get(chatId);

    request.onsuccess = () => resolve(request.result?.snapshot as Snapshot | undefined);
    request.onerror = () => reject(request.error);
  });
}

export async function setSnapshot(db: IDBDatabase, chatId: string, snapshot: Snapshot): Promise<void> {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction('snapshots', 'readwrite');
    const store = transaction.objectStore('snapshots');
    const request = store.put({ chatId, snapshot });

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function deleteSnapshot(db: IDBDatabase, chatId: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction('snapshots', 'readwrite');
    const store = transaction.objectStore('snapshots');
    const request = store.delete(chatId);

    request.onsuccess = () => resolve();

    request.onerror = (event) => {
      if ((event.target as IDBRequest).error?.name === 'NotFoundError') {
        resolve();
      } else {
        reject(request.error);
      }
    };
  });
}

// Conflict Resolution Functions

export async function saveConflictResolution(db: IDBDatabase, conflict: ConflictResolution): Promise<void> {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction('conflicts', 'readwrite');
    const store = transaction.objectStore('conflicts');
    const request = store.put(conflict);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function getConflictResolution(db: IDBDatabase, chatId: string): Promise<ConflictResolution | undefined> {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction('conflicts', 'readonly');
    const store = transaction.objectStore('conflicts');
    const request = store.get(chatId);

    request.onsuccess = () => resolve(request.result as ConflictResolution | undefined);
    request.onerror = () => reject(request.error);
  });
}

export async function deleteConflictResolution(db: IDBDatabase, chatId: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction('conflicts', 'readwrite');
    const store = transaction.objectStore('conflicts');
    const request = store.delete(chatId);

    request.onsuccess = () => resolve();

    request.onerror = (event) => {
      if ((event.target as IDBRequest).error?.name === 'NotFoundError') {
        resolve();
      } else {
        reject(request.error);
      }
    };
  });
}

export async function getPendingConflicts(db: IDBDatabase): Promise<ConflictResolution[]> {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction('conflicts', 'readonly');
    const store = transaction.objectStore('conflicts');
    const index = store.index('resolution');
    const request = index.getAll('manual');

    request.onsuccess = () => resolve(request.result as ConflictResolution[]);
    request.onerror = () => reject(request.error);
  });
}

// Sync Metadata Functions

export async function setSyncMetadata(db: IDBDatabase, chatId: string, metadata: SyncMetadata): Promise<void> {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction('syncMetadata', 'readwrite');
    const store = transaction.objectStore('syncMetadata');
    const request = store.put({ chatId, ...metadata });

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function getSyncMetadata(db: IDBDatabase, chatId: string): Promise<SyncMetadata | undefined> {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction('syncMetadata', 'readonly');
    const store = transaction.objectStore('syncMetadata');
    const request = store.get(chatId);

    request.onsuccess = () => {
      const result = request.result;

      if (result) {
        // Remove chatId from the result to return pure SyncMetadata
        const { chatId: _, ...metadata } = result;
        resolve(metadata as SyncMetadata);
      } else {
        resolve(undefined);
      }
    };
    request.onerror = () => reject(request.error);
  });
}

export async function deleteSyncMetadata(db: IDBDatabase, chatId: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction('syncMetadata', 'readwrite');
    const store = transaction.objectStore('syncMetadata');
    const request = store.delete(chatId);

    request.onsuccess = () => resolve();

    request.onerror = (event) => {
      if ((event.target as IDBRequest).error?.name === 'NotFoundError') {
        resolve();
      } else {
        reject(request.error);
      }
    };
  });
}

export async function getChatsBySyncStatus(
  db: IDBDatabase,
  syncStatus: 'synced' | 'pending' | 'conflict',
): Promise<ChatHistoryItem[]> {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction('chats', 'readonly');
    const store = transaction.objectStore('chats');

    if (store.indexNames.contains('syncStatus')) {
      const index = store.index('syncStatus');
      const request = index.getAll(syncStatus);

      request.onsuccess = () => resolve(request.result as ChatHistoryItem[]);
      request.onerror = () => reject(request.error);
    } else {
      // Fallback to scanning all chats if index doesn't exist
      const request = store.getAll();

      request.onsuccess = () => {
        const allChats = request.result as ChatHistoryItem[];
        const filteredChats = allChats.filter((chat) => chat.metadata?.syncStatus === syncStatus);
        resolve(filteredChats);
      };
      request.onerror = () => reject(request.error);
    }
  });
}

// Chat Synchronization Functions

export async function markChatForSync(db: IDBDatabase, chatId: string, changes: string[]): Promise<void> {
  const chat = await getMessages(db, chatId);

  if (!chat) {
    throw new Error('Chat not found');
  }

  // Update chat sync status
  const updatedMetadata: IChatMetadata = {
    gitUrl: '',
    ...chat.metadata,
    syncStatus: 'pending',
    lastSyncAt: new Date().toISOString(),
  };

  await setMessages(db, chatId, chat.messages, chat.urlId, chat.description, chat.timestamp, updatedMetadata);

  // Update sync metadata
  const existingMetadata = await getSyncMetadata(db, chatId);
  const syncMetadata: SyncMetadata = {
    lastSyncTimestamp: Date.now(),
    pendingChanges: [...(existingMetadata?.pendingChanges || []), ...changes],
    conflictResolution: existingMetadata?.conflictResolution || 'local',
  };

  await setSyncMetadata(db, chatId, syncMetadata);
}

export async function markChatSynced(db: IDBDatabase, chatId: string): Promise<void> {
  const chat = await getMessages(db, chatId);

  if (!chat) {
    throw new Error('Chat not found');
  }

  // Update chat sync status
  const updatedMetadata: IChatMetadata = {
    gitUrl: '',
    ...chat.metadata,
    syncStatus: 'synced',
    lastSyncAt: new Date().toISOString(),
  };

  await setMessages(db, chatId, chat.messages, chat.urlId, chat.description, chat.timestamp, updatedMetadata);

  // Clear sync metadata
  const syncMetadata: SyncMetadata = {
    lastSyncTimestamp: Date.now(),
    pendingChanges: [],
    conflictResolution: 'local',
  };

  await setSyncMetadata(db, chatId, syncMetadata);
}

export async function detectConflict(
  db: IDBDatabase,
  chatId: string,
  localMessages: Message[],
  remoteMessages: Message[],
): Promise<ConflictResolution | null> {
  // Simple conflict detection based on message count and last message timestamp
  if (localMessages.length !== remoteMessages.length) {
    const conflict: ConflictResolution = {
      chatId,
      conflictType: 'concurrent_edit',
      localVersion: localMessages,
      remoteVersion: remoteMessages,
      resolution: 'manual',
    };

    await saveConflictResolution(db, conflict);

    return conflict;
  }

  // Check if last messages are different
  const lastLocal = localMessages[localMessages.length - 1];
  const lastRemote = remoteMessages[remoteMessages.length - 1];

  if (lastLocal?.id !== lastRemote?.id || lastLocal?.content !== lastRemote?.content) {
    const conflict: ConflictResolution = {
      chatId,
      conflictType: 'version_mismatch',
      localVersion: localMessages,
      remoteVersion: remoteMessages,
      resolution: 'manual',
    };

    await saveConflictResolution(db, conflict);

    return conflict;
  }

  return null;
}

export async function resolveConflict(
  db: IDBDatabase,
  chatId: string,
  resolution: 'local' | 'remote' | 'merged',
  resolvedMessages?: Message[],
): Promise<void> {
  const conflict = await getConflictResolution(db, chatId);

  if (!conflict) {
    throw new Error('No conflict found for chat');
  }

  let finalMessages: Message[];

  switch (resolution) {
    case 'local':
      finalMessages = conflict.localVersion;
      break;
    case 'remote':
      finalMessages = conflict.remoteVersion;
      break;
    case 'merged':
      if (!resolvedMessages) {
        throw new Error('Resolved messages required for merged resolution');
      }

      finalMessages = resolvedMessages;
      break;
    default:
      throw new Error('Invalid resolution type');
  }

  // Update the chat with resolved messages
  const chat = await getMessages(db, chatId);

  if (chat) {
    const updatedMetadata: IChatMetadata = {
      gitUrl: '',
      ...chat.metadata,
      syncStatus: 'synced',
      lastSyncAt: new Date().toISOString(),
    };

    await setMessages(db, chatId, finalMessages, chat.urlId, chat.description, chat.timestamp, updatedMetadata);
  }

  // Update conflict resolution record
  const updatedConflict: ConflictResolution = {
    ...conflict,
    resolvedVersion: finalMessages,
    resolution,
    resolvedAt: new Date().toISOString(),
  };

  await saveConflictResolution(db, updatedConflict);

  // Clear sync metadata
  await markChatSynced(db, chatId);
}
