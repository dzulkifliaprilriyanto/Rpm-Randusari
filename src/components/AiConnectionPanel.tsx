import React, { useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Info,
  Link2,
  Link2Off,
  Loader2,
  RefreshCw,
  ShieldCheck,
} from 'lucide-react';
import {
  AI_STATUS_LABELS,
  type AiConnectionState,
  type AiConnectionStatus,
} from '../services/aiConnection';

function getStatusColors(status: AiConnectionStatus) {
  switch (status) {
    case 'berhasil_terhubung':
      return {
        box: 'border-emerald-200 dark:border-emerald-800/80 bg-emerald-50/70 dark:bg-emerald-950/30',
        text: 'text-emerald-800 dark:text-emerald-300',
        icon: <CheckCircle2 className="w-4 h-4 text-emerald-700 dark:text-emerald-400 shrink-0" />,
      };
    case 'menghubungkan':
      return {
        box: 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60',
        text: 'text-slate-800 dark:text-slate-200',
        icon: <Loader2 className="w-4 h-4 text-emerald-700 dark:text-emerald-400 animate-spin shrink-0" />,
      };
    case 'memerlukan_konfigurasi':
    case 'sesi_berakhir':
      return {
        box: 'border-amber-200 dark:border-amber-800/80 bg-amber-50/80 dark:bg-amber-950/30',
        text: 'text-amber-900 dark:text-amber-200',
        icon: <AlertTriangle className="w-4 h-4 text-amber-700 dark:text-amber-400 shrink-0" />,
      };
    case 'koneksi_gagal':
      return {
        box: 'border-red-200 dark:border-red-800/80 bg-red-50/80 dark:bg-red-950/30',
        text: 'text-red-800 dark:text-red-300',
        icon: <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0" />,
      };
    case 'belum_terhubung':
    default:
      return {
        box: 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40',
        text: 'text-slate-800 dark:text-slate-200',
        icon: <Info className="w-4 h-4 text-slate-500 dark:text-slate-400 shrink-0" />,
      };
  }
}

export function AiConnectionPanel({
  connection,
  compact = false,
  onConnectGoogle,
  onCheckConnection,
  onDisconnect,
  onOpenSettings,
}: {
  connection: AiConnectionState;
  compact?: boolean;
  onConnectGoogle: () => Promise<void>;
  onCheckConnection: () => Promise<void>;
  onDisconnect: () => void;
  onOpenSettings?: () => void;
}) {
  const [guideOpen, setGuideOpen] = useState(false);
  const [busyAction, setBusyAction] = useState<'connect' | 'check' | null>(null);
  const colors = getStatusColors(connection.status);
  const label = AI_STATUS_LABELS[connection.status];

  const handleConnect = async () => {
    setBusyAction('connect');
    try {
      await onConnectGoogle();
    } finally {
      setBusyAction(null);
    }
  };

  const handleCheck = async () => {
    setBusyAction('check');
    try {
      await onCheckConnection();
    } finally {
      setBusyAction(null);
    }
  };

  if (compact) {
    return (
      <section className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-start gap-3 min-w-0">
            <div className="mt-0.5">{colors.icon}</div>
            <div className="min-w-0 space-y-0.5">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  Status Koneksi AI Gemini:
                </h2>
                <span className={`text-sm font-bold ${colors.text}`}>{label}</span>
                {connection.connectedEmail && (
                  <span className="text-xs text-slate-600 dark:text-slate-400 font-mono">
                    ({connection.connectedEmail})
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                {connection.statusMessage}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              disabled={busyAction !== null || connection.status === 'menghubungkan'}
              onClick={handleConnect}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold disabled:opacity-50 whitespace-nowrap shrink-0"
            >
              <Link2 className="w-3.5 h-3.5" />
              <span>Hubungkan Google Account</span>
            </button>
            <button
              type="button"
              disabled={busyAction !== null}
              onClick={handleCheck}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold disabled:opacity-50 whitespace-nowrap shrink-0"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${busyAction === 'check' ? 'animate-spin' : ''}`} />
              <span>Periksa Koneksi</span>
            </button>
            {(connection.connectedEmail || connection.status === 'berhasil_terhubung') && (
              <button
                type="button"
                onClick={onDisconnect}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 text-xs font-semibold whitespace-nowrap shrink-0"
              >
                <Link2Off className="w-3.5 h-3.5" />
                <span>Putuskan Koneksi</span>
              </button>
            )}
            {onOpenSettings && (
              <button
                type="button"
                onClick={onOpenSettings}
                className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 hover:underline px-1 whitespace-nowrap shrink-0"
              >
                Detail Pengaturan
              </button>
            )}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="p-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-700 dark:text-emerald-400" />
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
              Integrasi Layanan AI Gemini & Akun Google
            </h2>
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
            Pilih akun Google melalui mekanisme OAuth resmi dan verifikasi koneksi langsung ke
            backend Gemini API tanpa menyimpan token atau kata sandi di browser.
          </p>
        </div>
        <span className="text-xs font-mono text-slate-500 dark:text-slate-400 shrink-0">
          Model: {connection.model}
        </span>
      </div>

      {/* Live Verified Status Card */}
      <div className={`p-4 rounded-lg border ${colors.box} space-y-2`}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            {colors.icon}
            <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">
              Status Koneksi AI:
            </span>
            <span className={`text-sm font-bold ${colors.text}`}>{label}</span>
          </div>
          {connection.latencyMs !== null && connection.status === 'berhasil_terhubung' && (
            <span className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
              Latensi uji: {connection.latencyMs} ms
            </span>
          )}
        </div>

        <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
          {connection.statusMessage}
        </p>

        {connection.connectedEmail && (
          <p className="text-xs text-slate-800 dark:text-slate-200 pt-1">
            Akun Google Terhubung:{' '}
            <strong className="font-mono">{connection.connectedEmail}</strong>
            {connection.connectedName ? ` (${connection.connectedName})` : ''}
          </p>
        )}

        {connection.lastVerifiedAt && (
          <p className="text-[11px] text-slate-500 dark:text-slate-400 tabular-nums">
            Terakhir diperiksa: {new Date(connection.lastVerifiedAt).toLocaleString('id-ID')}
          </p>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap items-center gap-2.5">
        <button
          type="button"
          disabled={busyAction !== null || connection.status === 'menghubungkan'}
          onClick={handleConnect}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-sm font-semibold disabled:opacity-50 whitespace-nowrap shrink-0"
        >
          {busyAction === 'connect' ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Link2 className="w-4 h-4" />
          )}
          <span>Hubungkan Google Account</span>
        </button>

        <button
          type="button"
          disabled={busyAction !== null}
          onClick={handleCheck}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 text-sm font-semibold disabled:opacity-50 whitespace-nowrap shrink-0"
        >
          <RefreshCw className={`w-4 h-4 ${busyAction === 'check' ? 'animate-spin' : ''}`} />
          <span>Periksa Koneksi</span>
        </button>

        <button
          type="button"
          disabled={
            connection.status === 'belum_terhubung' || connection.status === 'menghubungkan'
          }
          onClick={onDisconnect}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 text-sm font-semibold disabled:opacity-40 whitespace-nowrap shrink-0"
        >
          <Link2Off className="w-4 h-4" />
          <span>Putuskan Koneksi</span>
        </button>
      </div>

      {/* Honest Authentication Architecture & Official Configuration Guide */}
      <div className="border-t border-slate-200 dark:border-slate-800 pt-3">
        <button
          type="button"
          onClick={() => setGuideOpen((v) => !v)}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400 hover:underline"
        >
          {guideOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          <span>Panduan Metode Autentikasi Resmi & Fallback Backend</span>
        </button>

        {guideOpen && (
          <div className="mt-3 p-4 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-300 space-y-2.5 leading-relaxed">
            <p>
              <strong>1. Keamanan Token & Akses Gemini API:</strong> Login akun Google standar
              melalui Google OAuth hanya memverifikasi identitas akun pengguna dan tidak otomatis
              memberikan akses langsung ke Gemini Developer API. Oleh karena itu, permintaan AI tetap
              diproses melalui backend server yang aman.
            </p>
            <p>
              <strong>2. Jalur Fallback Resmi Administrator:</strong> Administrator sekolah/sistem
              mengelola <code className="font-mono">GEMINI_API_KEY</code> melalui environment
              variable server (<code className="font-mono">Secrets</code> / Vercel Environment
              Variables). Jika kunci server aktif, tombol <strong>Periksa Koneksi</strong> akan
              menguji Gemini API secara nyata sebelum menampilkan status{' '}
              <em>Berhasil terhubung</em>.
            </p>
            <p>
              <strong>3. Mengaktifkan Pemilihan Akun Google (OAuth 2.0):</strong> Untuk mengaktifkan
              dialog pilih akun Google di perangkat pengguna, administrator cukup menambahkan{' '}
              <code className="font-mono">GOOGLE_CLIENT_ID</code> dan{' '}
              <code className="font-mono">GOOGLE_CLIENT_SECRET</code> pada environment server dengan
              Redirect URI resmi:{' '}
              <code className="font-mono break-all">
                {connection.capabilities?.redirectUri || `${window.location.origin}/auth/google/callback`}
              </code>
              . Tidak ada token akses atau kunci rahasia yang disimpan di{' '}
              <code className="font-mono">localStorage</code> maupun{' '}
              <code className="font-mono">IndexedDB</code>.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
