import React, { useEffect, useRef, useState } from 'react';
import {
  Database,
  Download,
  FileJson,
  HardDrive,
  Moon,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  Sun,
  Trash2,
  Upload,
} from 'lucide-react';
import type { AiConnectionState } from '../services/aiConnection';
import {
  formatBytesIndonesian,
  getLocalStorageDiagnostics,
  parseAndValidateBackupJson,
  requestPersistentBrowserStorage,
  type ExportedBackupPayload,
  type LocalStorageDiagnostics,
} from '../services/storage';
import type { AppSettings, BackupMetadata } from '../types/rpm';
import { AiConnectionPanel } from './AiConnectionPanel';
import { ConfirmDialog } from './ToastAndDialog';

export function SettingsView({
  uid,
  settings,
  backups,
  aiConnection,
  onConnectGoogle,
  onCheckAiConnection,
  onDisconnectGoogle,
  onUpdateSettings,
  onExportBackup,
  onApplyParsedBackup,
  onImportSingleRpmFile,
  onResetAllData,
  onNotify,
}: {
  uid: string;
  settings: AppSettings;
  backups: BackupMetadata[];
  aiConnection: AiConnectionState;
  onConnectGoogle: () => Promise<void>;
  onCheckAiConnection: () => Promise<void>;
  onDisconnectGoogle: () => void;
  onUpdateSettings: (next: AppSettings) => void;
  onExportBackup: () => void;
  onApplyParsedBackup: (payload: ExportedBackupPayload, mode: 'merge' | 'replace') => Promise<void>;
  onImportSingleRpmFile: (file: File) => Promise<void>;
  onResetAllData: () => void;
  onNotify: (type: 'success' | 'error' | 'warning' | 'info', title: string, message?: string) => void;
}) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const singleRpmInputRef = useRef<HTMLInputElement | null>(null);
  const [importMode, setImportMode] = useState<'merge' | 'replace'>('merge');
  const [pendingImport, setPendingImport] = useState<{
    payload: ExportedBackupPayload;
    fileName: string;
    mode: 'merge' | 'replace';
  } | null>(null);
  const [confirmClearOpen, setConfirmClearOpen] = useState(false);
  const [diagnostics, setDiagnostics] = useState<LocalStorageDiagnostics | null>(null);
  const [loadingDiag, setLoadingDiag] = useState(false);

  const refreshDiagnostics = async () => {
    setLoadingDiag(true);
    try {
      const diag = await getLocalStorageDiagnostics(uid);
      setDiagnostics(diag);
    } finally {
      setLoadingDiag(false);
    }
  };

  useEffect(() => {
    void refreshDiagnostics();
  }, [uid, backups.length]);

  const handleRequestPersist = async () => {
    const granted = await requestPersistentBrowserStorage();
    await refreshDiagnostics();
    if (granted) {
      onNotify(
        'success',
        'Penyimpanan Persisten Aktif',
        'Browser memberi prioritas agar data IndexedDB tidak mudah terhapus otomatis.',
      );
    } else {
      onNotify(
        'info',
        'Izin Persisten Belum Diberikan Browser',
        'Browser mengatur kebijakan penyimpanan otomatis. Tetap lakukan Ekspor Backup berkala.',
      );
    }
  };

  const handleSelectBackupFile = async (file: File) => {
    try {
      const text = await file.text();
      const parsed = parseAndValidateBackupJson(text);
      setPendingImport({
        payload: parsed,
        fileName: file.name,
        mode: importMode,
      });
    } catch (err) {
      onNotify(
        'error',
        'Berkas Backup Tidak Valid',
        err instanceof Error ? err.message : 'Pastikan berkas JSON berasal dari AI RPM SDN Randusari.',
      );
    }
  };

  return (
    <div className="max-w-4xl space-y-6">
      {/* AI Gemini & Google Account Connection */}
      <AiConnectionPanel
        connection={aiConnection}
        onConnectGoogle={onConnectGoogle}
        onCheckConnection={onCheckAiConnection}
        onDisconnect={onDisconnectGoogle}
      />

      {/* Appearance & Export Preferences */}
      <section className="p-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-5">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">
            Pengaturan Aplikasi & Ekspor Dokumen
          </h1>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
            Atur tema tampilan, autosave lokal, serta standar tata letak A4 untuk pratinjau, PDF,
            dan DOCX.
          </p>
        </div>

        <div className="flex items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
          <div>
            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Tema Tampilan</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Pilih Mode Terang atau Mode Gelap sesuai kenyamanan mata saat menyusun RPM.
            </p>
          </div>
          <div className="flex items-center gap-1 p-1 rounded-lg bg-slate-100 dark:bg-slate-800">
            <button
              type="button"
              onClick={() => onUpdateSettings({ ...settings, theme: 'light' })}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                settings.theme === 'light'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 dark:text-slate-300'
              }`}
            >
              <Sun className="w-3.5 h-3.5" /> Terang
            </button>
            <button
              type="button"
              onClick={() => onUpdateSettings({ ...settings, theme: 'dark' })}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                settings.theme === 'dark'
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-300'
              }`}
            >
              <Moon className="w-3.5 h-3.5" /> Gelap
            </button>
          </div>
        </div>

        <label className="flex items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800 cursor-pointer">
          <div>
            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              Autosave Draft ke IndexedDB
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Menyimpan perubahan secara otomatis di perangkat saat guru mengetik di Editor Manual.
            </p>
          </div>
          <input
            type="checkbox"
            checked={settings.autoSaveDraft}
            onChange={(e) => onUpdateSettings({ ...settings, autoSaveDraft: e.target.checked })}
            className="w-4 h-4 accent-emerald-700"
          />
        </label>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label htmlFor="set-orient" className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
              Orientasi Kertas A4
            </label>
            <select
              id="set-orient"
              value={settings.exportConfig.orientation}
              onChange={(e) =>
                onUpdateSettings({
                  ...settings,
                  exportConfig: {
                    ...settings.exportConfig,
                    orientation: e.target.value as 'portrait' | 'landscape',
                  },
                })
              }
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
            >
              <option value="portrait">Portrait</option>
              <option value="landscape">Landscape</option>
            </select>
          </div>

          <div>
            <label htmlFor="set-font" className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
              Ukuran Font Standar
            </label>
            <select
              id="set-font"
              value={settings.exportConfig.fontSize}
              onChange={(e) =>
                onUpdateSettings({
                  ...settings,
                  exportConfig: {
                    ...settings.exportConfig,
                    fontSize: Number(e.target.value) as 10 | 11 | 12,
                  },
                })
              }
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
            >
              <option value={10}>10 pt (Padat)</option>
              <option value={11}>11 pt (Standar)</option>
              <option value={12}>12 pt (Lega)</option>
            </select>
          </div>

          <div>
            <label htmlFor="set-margin" className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
              Margin Halaman
            </label>
            <select
              id="set-margin"
              value={settings.exportConfig.marginMm}
              onChange={(e) =>
                onUpdateSettings({
                  ...settings,
                  exportConfig: {
                    ...settings.exportConfig,
                    marginMm: Number(e.target.value) as 15 | 20 | 25,
                  },
                })
              }
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
            >
              <option value={15}>15 mm</option>
              <option value={20}>20 mm</option>
              <option value={25}>25 mm</option>
            </select>
          </div>
        </div>

        <div className="flex flex-wrap gap-5 text-sm">
          {[
            { key: 'showHeader', label: 'Tampilkan Header Sekolah' },
            { key: 'showFooter', label: 'Tampilkan Footer' },
            { key: 'showPageNumbers', label: 'Tampilkan Nomor Halaman' },
            { key: 'showPengesahan', label: 'Tampilkan Blok Pengesahan' },
          ].map((item) => {
            const checked = settings.exportConfig[item.key as keyof typeof settings.exportConfig] as boolean;
            return (
              <label key={item.key} className="inline-flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={(e) =>
                    onUpdateSettings({
                      ...settings,
                      exportConfig: {
                        ...settings.exportConfig,
                        [item.key]: e.target.checked,
                      },
                    })
                  }
                  className="accent-emerald-700"
                />
                <span>{item.label}</span>
              </label>
            );
          })}
        </div>
      </section>

      {/* Local IndexedDB Capacity & Persistence Diagnostics */}
      <section className="p-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Database className="w-5 h-5 text-emerald-700 dark:text-emerald-400" />
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                Penyimpanan Lokal Perangkat (IndexedDB) & Kapasitas Browser
              </h2>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
              Seluruh dokumen operasional disimpan di IndexedDB perangkat; Cache Storage hanya
              menyimpan aset statis agar aplikasi tetap dapat dibuka saat offline.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => void refreshDiagnostics()}
              disabled={loadingDiag}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingDiag ? 'animate-spin' : ''}`} />
              <span>Perbarui Info</span>
            </button>
            <button
              type="button"
              onClick={() => void handleRequestPersist()}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs font-semibold hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Minta Penyimpanan Persisten</span>
            </button>
          </div>
        </div>

        {diagnostics && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <HardDrive className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-400" />
                  Kapasitas Penyimpanan Browser
                </span>
                <span className="tabular-nums font-mono text-slate-600 dark:text-slate-300">
                  {formatBytesIndonesian(diagnostics.usageBytes)} /{' '}
                  {diagnostics.quotaBytes > 0
                    ? formatBytesIndonesian(diagnostics.quotaBytes)
                    : 'Tidak dilaporkan'}
                </span>
              </div>
              <div className="w-full h-2 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                <div
                  className="h-full bg-emerald-600 rounded-full transition-all"
                  style={{ width: `${Math.max(diagnostics.usageBytes > 0 ? 2 : 0, diagnostics.usagePercent)}%` }}
                />
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 tabular-nums">
                Terpakai {diagnostics.usagePercent}% · Status Persisten:{' '}
                <strong>
                  {diagnostics.persisted === true
                    ? 'Persisten (Prioritas Tinggi)'
                    : diagnostics.persisted === false
                      ? 'Standar Browser'
                      : 'Tidak tersedia'}
                </strong>
              </p>
            </div>

            <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 space-y-1.5 text-xs">
              <p className="font-semibold text-slate-700 dark:text-slate-300">
                Ringkasan Koleksi di IndexedDB
              </p>
              <p className="text-slate-600 dark:text-slate-400 tabular-nums">
                <strong>{diagnostics.counts.lessonPlans}</strong> Dokumen RPM ·{' '}
                <strong>{diagnostics.counts.worksheets}</strong> LKPD ·{' '}
                <strong>{diagnostics.counts.classes}</strong> Kelas ·{' '}
                <strong>{diagnostics.counts.templates}</strong> Template ·{' '}
                <strong>{diagnostics.counts.activities}</strong> Log Aktivitas
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Cache Storage Aset Statis:{' '}
                {diagnostics.cacheNames.length > 0
                  ? diagnostics.cacheNames.join(', ')
                  : 'Aktif saat Service Worker berjalan'}
              </p>
            </div>
          </div>
        )}

        <div className="flex items-start gap-3 p-4 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
          <ShieldAlert className="w-5 h-5 text-amber-700 dark:text-amber-400 shrink-0 mt-0.5" />
          <div className="text-xs text-amber-950 dark:text-amber-100 space-y-1 leading-relaxed">
            <p className="font-bold">Catatan Keamanan Data Lokal Browser</p>
            <p>
              ID Sesi Lokal Anda: <span className="font-mono">{uid}</span>. Data tersimpan di
              IndexedDB pada browser/perangkat saat ini tanpa database cloud, sehingga tetap
              berjalan cepat dan privat. Namun, data tetap dapat terhapus apabila Anda membersihkan
              data situs browser atau sistem operasi membebaskan ruang penyimpanan. Lakukan{' '}
              <strong>Ekspor Backup</strong> secara berkala.
            </p>
          </div>
        </div>

        {/* Backup & Restore Controls */}
        <div className="flex flex-wrap items-center gap-3 pt-1">
          <button
            type="button"
            onClick={onExportBackup}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-sm font-semibold"
          >
            <Download className="w-4 h-4" />
            <span>Ekspor Backup Lengkap (.json)</span>
          </button>

          <div className="flex flex-wrap items-center gap-2">
            <select
              aria-label="Mode impor backup"
              value={importMode}
              onChange={(e) => setImportMode(e.target.value as 'merge' | 'replace')}
              className="px-3 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs font-medium"
            >
              <option value="merge">Gabungkan dengan data saat ini</option>
              <option value="replace">Ganti seluruh data saat ini</option>
            </select>
            <input
              ref={fileInputRef}
              type="file"
              accept="application/json,.json"
              className="hidden"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (file) {
                  await handleSelectBackupFile(file);
                  e.target.value = '';
                }
              }}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 text-sm font-semibold hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <Upload className="w-4 h-4" />
              <span>Impor Backup</span>
            </button>

            <input
              ref={singleRpmInputRef}
              type="file"
              accept="application/json,.json"
              className="hidden"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (file) {
                  await onImportSingleRpmFile(file);
                  e.target.value = '';
                }
              }}
            />
            <button
              type="button"
              onClick={() => singleRpmInputRef.current?.click()}
              className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <FileJson className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
              <span>Impor 1 Dokumen RPM (.json)</span>
            </button>
          </div>

          <button
            type="button"
            onClick={() => setConfirmClearOpen(true)}
            className="ml-auto inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg border border-red-300 dark:border-red-800 text-red-600 dark:text-red-400 text-sm font-semibold hover:bg-red-50 dark:hover:bg-red-950/40"
          >
            <Trash2 className="w-4 h-4" />
            <span>Hapus Semua Data</span>
          </button>
        </div>

        {backups.length > 0 && (
          <div className="pt-3 border-t border-slate-200 dark:border-slate-800">
            <p className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-2">
              Riwayat Ekspor Backup Terakhir
            </p>
            <ul className="space-y-1.5 text-xs text-slate-600 dark:text-slate-300">
              {backups.slice(0, 5).map((b) => (
                <li key={b.id} className="flex items-center justify-between">
                  <span className="font-mono">{b.fileName}</span>
                  <span className="tabular-nums text-slate-500">
                    {b.rpmCount} RPM · {b.classCount} Kelas ·{' '}
                    {new Date(b.createdAt).toLocaleDateString('id-ID')}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      {/* Privacy & AI Usage Policy */}
      <section className="p-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-2 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
        <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
          Kebijakan Privasi, Keamanan Token & Penggunaan AI
        </h2>
        <p>
          1. Seluruh permintaan generasi AI diproses melalui backend API terproteksi; tidak ada
          kunci API rahasia atau OAuth token yang disimpan di <code className="font-mono">localStorage</code>,{' '}
          <code className="font-mono">IndexedDB</code>, maupun Cache Storage.
        </p>
        <p>
          2. Demi perlindungan privasi anak, jangan memasukkan NIK, alamat rumah, atau data pribadi
          peserta didik ke dalam kolom formulir maupun wawancara AI.
        </p>
        <p>
          3. Keluaran AI bersifat asisten rancangan pedagogis. Guru tetap memegang kendali penuh
          untuk memverifikasi kesesuaian Capaian Pembelajaran (CP) resmi sekolah dan menyesuaikan
          dengan kondisi nyata kelas.
        </p>
      </section>

      <ConfirmDialog
        open={pendingImport !== null}
        title={
          pendingImport?.mode === 'replace'
            ? 'Konfirmasi Ganti Seluruh Data Lokal?'
            : 'Konfirmasi Penggabungan Backup?'
        }
        description={
          pendingImport
            ? `Berkas "${pendingImport.fileName}" memuat ${pendingImport.payload.data.lessonPlans.length} RPM, ${pendingImport.payload.data.classes.length} Kelas, dan ${pendingImport.payload.data.templates.length} Template. ${
                pendingImport.mode === 'replace'
                  ? 'Mode GANTI akan menimpa seluruh data lokal saat ini di IndexedDB.'
                  : 'Mode GABUNG akan menambahkan atau memperbarui data berdasarkan ID tanpa menghapus data lain.'
              }`
            : ''
        }
        confirmLabel={pendingImport?.mode === 'replace' ? 'Ya, Ganti Data Sekarang' : 'Ya, Gabungkan Data'}
        danger={pendingImport?.mode === 'replace'}
        onCancel={() => setPendingImport(null)}
        onConfirm={async () => {
          if (pendingImport) {
            await onApplyParsedBackup(pendingImport.payload, pendingImport.mode);
            await refreshDiagnostics();
          }
          setPendingImport(null);
        }}
      />

      <ConfirmDialog
        open={confirmClearOpen}
        title="Hapus Seluruh Data Sesi Ini?"
        description="Semua RPM, template, data kelas, dan profil guru di IndexedDB browser ini akan dihapus permanen. Pastikan Anda sudah mengekspor backup JSON terlebih dahulu."
        confirmLabel="Ya, Hapus Semua"
        danger
        onCancel={() => setConfirmClearOpen(false)}
        onConfirm={() => {
          onResetAllData();
          setConfirmClearOpen(false);
        }}
      />
    </div>
  );
}
