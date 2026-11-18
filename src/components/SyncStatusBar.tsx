import React from 'react';
import {
  Cloud,
  CloudOff,
  Loader2,
  LogIn,
  LogOut,
  RefreshCw,
  WifiOff,
} from 'lucide-react';
import { SyncStatus } from '../hooks/useSportsStore';

interface SyncStatusBarProps {
  syncStatus: SyncStatus;
  onConnectCloud: () => void;
  onDisconnectCloud: () => void;
  onSyncNow: () => void;
  compact?: boolean;
}

export const SyncStatusBar: React.FC<SyncStatusBarProps> = ({
  syncStatus,
  onConnectCloud,
  onDisconnectCloud,
  onSyncNow,
  compact = false,
}) => {
  const {
    isOnline,
    cloudEmail,
    isCloudConnected,
    queuedCount,
    hasPendingWrites,
    isSyncing,
    lastError,
  } = syncStatus;

  const pendingTotal = queuedCount;

  return (
    <div className="flex flex-wrap items-center gap-2 no-print">
      {/* Network & Outbox Status Indicator */}
      <div
        data-testid="sync-status-badge"
        title={
          lastError
            ? `Last sync notice: ${lastError}`
            : !isOnline
              ? 'Network offline — changes are saved locally and queued for upload'
              : pendingTotal > 0
                ? `${pendingTotal} pending change(s) queued for Firestore upload`
                : isCloudConnected
                  ? 'Live Firestore sync active'
                  : 'Local mode — connect Google Cloud Sync to push to Firestore'
        }
        className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium whitespace-nowrap ${
          !isOnline
            ? 'border-amber-500/40 bg-amber-500/10 text-amber-300'
            : pendingTotal > 0 || hasPendingWrites
              ? 'border-blue-500/40 bg-blue-500/10 text-blue-300'
              : isCloudConnected
                ? 'border-emerald-500/35 bg-emerald-500/10 text-emerald-300'
                : 'border-zinc-800 bg-zinc-950 text-zinc-400'
        }`}
      >
        {!isOnline ? (
          <WifiOff className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        ) : isSyncing ? (
          <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin" aria-hidden="true" />
        ) : isCloudConnected ? (
          <Cloud className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        ) : (
          <CloudOff className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        )}

        <span>
          {!isOnline
            ? pendingTotal > 0
              ? `Offline · ${pendingTotal} queued`
              : 'Offline (Saved Locally)'
            : isSyncing
              ? `Uploading (${pendingTotal})…`
              : pendingTotal > 0
                ? `${pendingTotal} queued`
                : isCloudConnected
                  ? hasPendingWrites
                    ? 'Syncing cache…'
                    : 'Cloud Synced'
                  : 'Local Mode'}
        </span>
      </div>

      {/* Manual Sync Now Button when online & items queued or connected */}
      {(pendingTotal > 0 || (isCloudConnected && isOnline)) && (
        <button
          type="button"
          onClick={onSyncNow}
          disabled={!isOnline || isSyncing || !isCloudConnected}
          className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-800 bg-zinc-950 px-2.5 py-1.5 text-xs font-medium text-zinc-300 hover:bg-zinc-900 disabled:opacity-40 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
          title="Flush queued changes and refresh cloud sync"
        >
          <RefreshCw
            className={`h-3.5 w-3.5 ${isSyncing ? 'animate-spin' : ''}`}
            aria-hidden="true"
          />
          {!compact && <span>Sync Now</span>}
        </button>
      )}

      {/* Google Cloud Account Connect / Disconnect */}
      {isCloudConnected ? (
        <button
          type="button"
          onClick={onDisconnectCloud}
          className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-800 bg-zinc-950 px-2.5 py-1.5 text-xs font-medium text-zinc-300 hover:bg-zinc-900 transition-colors whitespace-nowrap"
          title={`Connected as ${cloudEmail ?? 'Google User'} — Click to disconnect cloud sync`}
        >
          <LogOut className="h-3 w-3 shrink-0 text-zinc-400" aria-hidden="true" />
          <span className="max-w-[140px] truncate">
            {compact ? 'Cloud' : cloudEmail ?? 'Connected'}
          </span>
        </button>
      ) : (
        <button
          type="button"
          onClick={onConnectCloud}
          disabled={!isOnline}
          className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
        >
          <LogIn className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span>{compact ? 'Cloud Sync' : 'Connect Cloud Sync'}</span>
        </button>
      )}
    </div>
  );
};
