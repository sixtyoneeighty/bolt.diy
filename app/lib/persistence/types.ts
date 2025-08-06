import type { FileMap } from '~/lib/stores/files';
import type { Message } from 'ai';

export interface Snapshot {
  chatIndex: string;
  files: FileMap;
  summary?: string;
}

export interface SyncMetadata {
  lastSyncTimestamp: number;
  pendingChanges: string[];
  conflictResolution: 'local' | 'remote' | 'manual';
}

export interface AuthenticatedChatData {
  userId: string;
  isPublic: boolean;
  sharedWith?: string[];
  syncStatus: 'synced' | 'pending' | 'conflict';
  lastSyncAt: string;
  syncMetadata?: SyncMetadata;
}

export interface ConflictResolution {
  chatId: string;
  conflictType: 'concurrent_edit' | 'version_mismatch' | 'sync_error';
  localVersion: Message[];
  remoteVersion: Message[];
  resolvedVersion?: Message[];
  resolution: 'local' | 'remote' | 'manual' | 'merged';
  resolvedAt?: string;
}
