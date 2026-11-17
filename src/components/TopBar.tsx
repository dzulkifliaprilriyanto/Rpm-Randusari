import React from 'react';
import { CheckCircle2, Database, Loader2, Menu, Moon, Plus, ShieldAlert, Sun } from 'lucide-react';
import type { NavPageId } from '../types/rpm';
import { NAV_ITEMS } from './Sidebar';
import { PWAInstallButton } from './PwaBanners';

export type LocalSaveStatus = 'idle' | 'saving' | 'saved' | 'error';

export function TopBar({
  activePage,
  theme,
  saveStatus = 'saved',
  lastSavedAt,
  onToggleTheme,
  onOpenMobileNav,
  onCreateNew,
  onOpenBackupSettings,
  activeDocTitle,
}: {
  activePage: NavPageId;
  theme: 'light' | 'dark';
  saveStatus?: LocalSaveStatus;
  lastSavedAt?: string | null;
  onToggleTheme: () => void;
  onOpenMobileNav: () => void;
  onCreateNew: () => void;
  onOpenBackupSettings: () => void;
  activeDocTitle?: string;
}) {
  const currentLabel =
    activePage === 'dokumen-rpm'
      ? activeDocTitle || 'Workspace Dokumen RPM'
      : NAV_ITEMS.find((i) => i.id === activePage)?.label || 'Dashboard';

  return (
    <header className="sticky top-0 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur border-b border-slate-200 dark:border-slate-800 px-4 lg:px-6 py-3 no-print">
      <div className="flex items-center justify-between gap-4">
        {/* Zone 1: Mobile Menu Trigger + Breadcrumb */}
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={onOpenMobileNav}
            aria-label="Buka menu navigasi"
            className="lg:hidden p-2 -ml-1 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 shrink-0"
          >
            <Menu className="w-5 h-5" />
          </button>

          <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-sm min-w-0">
            <span className="hidden sm:inline font-display font-bold text-slate-900 dark:text-slate-100 whitespace-nowrap shrink-0">
              AI RPM SDN Randusari
            </span>
            <span className="hidden sm:inline text-slate-400 shrink-0" aria-hidden="true">
              /
            </span>
            <span className="text-slate-800 dark:text-slate-200 font-semibold sm:font-medium truncate">
              {currentLabel}
            </span>
          </nav>
        </div>

        {/* Zone 2: Actions */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Save Status Indicator */}
          <button
            type="button"
            onClick={onOpenBackupSettings}
            title={
              lastSavedAt
                ? `Terakhir disimpan ke IndexedDB: ${new Date(lastSavedAt).toLocaleTimeString('id-ID')}`
                : 'Penyimpanan lokal IndexedDB aktif'
            }
            className="hidden md:inline-flex items-center gap-1.5 px-2.5 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0"
          >
            {saveStatus === 'saving' ? (
              <>
                <Loader2 className="w-3.5 h-3.5 text-emerald-700 animate-spin" />
                <span>Menyimpan...</span>
              </>
            ) : saveStatus === 'error' ? (
              <>
                <ShieldAlert className="w-3.5 h-3.5 text-red-600" />
                <span className="text-red-600 dark:text-red-400">Gagal Simpan</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-400" />
                <Database className="w-3 h-3 text-slate-400" />
                <span>Tersimpan Lokal</span>
              </>
            )}
          </button>

          <PWAInstallButton />

          <button
            type="button"
            onClick={onToggleTheme}
            aria-label={theme === 'dark' ? 'Aktifkan mode terang' : 'Aktifkan mode gelap'}
            className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shrink-0"
          >
            {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
          </button>

          <button
            type="button"
            onClick={onCreateNew}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-sm font-semibold transition-colors whitespace-nowrap shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Buat RPM Baru</span>
            <span className="sm:hidden">Buat</span>
          </button>
        </div>
      </div>
    </header>
  );
}
