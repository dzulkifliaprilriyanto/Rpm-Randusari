import React from 'react';
import { Download, WifiOff } from 'lucide-react';
import { useOnlineStatus, usePWAInstall } from '../hooks/usePwaStatus';

export function OfflineIndicator() {
  const isOnline = useOnlineStatus();
  if (isOnline) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="bg-amber-600 text-white px-4 py-2 text-xs font-medium flex items-center justify-center gap-2 no-print"
    >
      <WifiOff className="w-3.5 h-3.5 shrink-0" />
      <span>
        Mode Offline aktif — seluruh dokumen RPM tetap tersimpan dan dapat dibuka dari IndexedDB
        perangkat. Fitur generasi AI memerlukan koneksi internet.
      </span>
    </div>
  );
}

export function PWAInstallButton() {
  const { canInstall, promptInstall } = usePWAInstall();
  if (!canInstall) return null;

  return (
    <button
      type="button"
      onClick={() => void promptInstall()}
      className="hidden md:inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 text-xs font-semibold hover:bg-emerald-100 dark:hover:bg-emerald-950/70 transition-colors whitespace-nowrap shrink-0"
    >
      <Download className="w-3.5 h-3.5" />
      <span>Pasang Aplikasi</span>
    </button>
  );
}
