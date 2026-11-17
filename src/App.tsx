import React, { Component, useCallback, useEffect, useRef, useState } from 'react';
import { AiInterviewView } from './components/AiInterviewView';
import { AutoGeneratorView } from './components/AutoGeneratorView';
import { ClassesView } from './components/ClassesView';
import { CreateHubView } from './components/CreateHubView';
import { DashboardView } from './components/DashboardView';
import { DocumentWorkspaceView } from './components/DocumentWorkspaceView';
import { HelpCenterView } from './components/HelpCenterView';
import { HistoryView } from './components/HistoryView';
import { ManualEditorView } from './components/ManualEditorView';
import { PakIntegrationHubView } from './components/PakIntegrationHubView';
import { ProfileView } from './components/ProfileView';
import { OfflineIndicator } from './components/PwaBanners';
import { SettingsView } from './components/SettingsView';
import { Sidebar } from './components/Sidebar';
import { TemplatesView } from './components/TemplatesView';
import { ToastContainer, type ToastItem } from './components/ToastAndDialog';
import { TopBar, type LocalSaveStatus } from './components/TopBar';
import {
  apiFetchAiCapabilities,
  apiGetGoogleAuthUrl,
  apiRunLiveGeminiTest,
  connectWithClientGisIfAvailable,
  type AiConnectionState,
} from './services/aiConnection';
import { apiGenerateRpm } from './services/api';
import {
  buildBackupPayload,
  clearAllWorkspaceData,
  createEmptyWorkspace,
  getOrCreateAnonymousUid,
  loadWorkspaceData,
  parseAndValidateSingleRpmJson,
  saveActivities,
  saveBackups,
  saveClasses,
  saveInterviewDraft,
  saveLessonPlans,
  savePakIntegrations,
  saveProfile,
  saveSettings,
  saveTemplates,
  saveWorksheets,
  upsertPakIntegration,
  upsertSingleLessonPlan,
  upsertWorksheet,
  type ExportedBackupPayload,
  type UserWorkspaceData,
} from './services/storage';
import type {
  ActivityLogItem,
  AppSettings,
  AutoGeneratorInput,
  InterviewSessionState,
  NavPageId,
  PakIntegrationRecord,
  RpmCoreContent,
  RpmDocument,
  RpmTemplate,
  SchoolClass,
  TeacherProfile,
  WorksheetRecord,
} from './types/rpm';
import { normalizeLkpdKit, validateAndReconcileCrossDocument } from './utils/lkpd';
import { applyPakIntegrationToRpmCore } from './utils/pak';
import { createSampleIpasRpm } from './utils/pedagogy';

function buildWorksheetRecord(
  doc: RpmDocument,
  existing?: WorksheetRecord,
): WorksheetRecord | null {
  if (!doc.perangkat?.lkpd) return null;
  const now = doc.updatedAt || new Date().toISOString();
  const reconciled = validateAndReconcileCrossDocument(
    doc.content,
    doc.perangkat.lkpd,
    doc.pakIntegration,
    doc.id,
    'audit_only',
  );
  return {
    id: existing?.id || `ws-${doc.id}`,
    lessonPlanId: doc.id,
    worksheetContent: reconciled.lkpd,
    pakIntegration: doc.pakIntegration,
    validationStatus: doc.crossValidation || reconciled.validation,
    createdAt: existing?.createdAt || doc.perangkat.lkpd.createdAt || now,
    updatedAt: now,
  };
}

class AppErrorBoundary extends Component<
  { children: React.ReactNode },
  { hasError: boolean; message: string }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, message: error.message };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center p-6 bg-slate-50 text-slate-900">
          <div className="max-w-md w-full p-6 rounded-xl border border-red-200 bg-white space-y-3">
            <h1 className="text-lg font-bold text-red-700">Terjadi Kendala Tampilan</h1>
            <p className="text-sm text-slate-600">{this.state.message}</p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="px-4 py-2 rounded-lg bg-emerald-700 text-white text-sm font-semibold"
            >
              Muat Ulang Aplikasi
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  const [uid] = useState<string>(() => getOrCreateAnonymousUid());
  const [workspace, setWorkspace] = useState<UserWorkspaceData>(() => createEmptyWorkspace(uid));
  const [workspaceReady, setWorkspaceReady] = useState(false);

  const [saveStatus, setSaveStatus] = useState<LocalSaveStatus>('saved');
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);

  const [activePage, setActivePage] = useState<NavPageId>('dashboard');
  const [activeDocId, setActiveDocId] = useState<string | null>(null);
  const [manualEditingDocId, setManualEditingDocId] = useState<string | null>(null);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [isGeneratingRpm, setIsGeneratingRpm] = useState(false);
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  // In-memory only AI & Google Account connection state (zero token persistence in browser storage)
  const [aiConnection, setAiConnection] = useState<AiConnectionState>({
    status: 'belum_terhubung',
    connectedEmail: null,
    connectedName: null,
    authMethod: 'none',
    lastVerifiedAt: null,
    latencyMs: null,
    model: 'gemini-4-hydrogen',
    statusMessage: 'Memeriksa status layanan AI backend...',
    capabilities: null,
  });
  const sessionExpiryTimerRef = useRef<number | null>(null);

  const notify = useCallback(
    (type: ToastItem['type'], title: string, message?: string) => {
      const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      setToasts((prev) => [...prev.slice(-1), { id, type, title, message }]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 3500);
    },
    [],
  );

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const persistWrite = useCallback(
    async (task: () => Promise<void>) => {
      setSaveStatus('saving');
      try {
        await task();
        setSaveStatus('saved');
        setLastSavedAt(new Date().toISOString());
      } catch (err) {
        setSaveStatus('error');
        notify(
          'error',
          'Gagal Menyimpan ke IndexedDB',
          err instanceof Error ? err.message : 'Ruang penyimpanan browser tidak tersedia.',
        );
      }
    },
    [notify],
  );

  // Hydrate workspace asynchronously from IndexedDB on boot
  useEffect(() => {
    let active = true;
    loadWorkspaceData(uid)
      .then((loaded) => {
        if (!active) return;
        setWorkspace(loaded);
        setWorkspaceReady(true);
        setLastSavedAt(new Date().toISOString());
      })
      .catch((err) => {
        if (!active) return;
        setWorkspaceReady(true);
        setSaveStatus('error');
        notify(
          'error',
          'Gagal Memuat Data Lokal',
          err instanceof Error ? err.message : 'IndexedDB tidak dapat diakses.',
        );
      });
    return () => {
      active = false;
    };
  }, [uid, notify]);

  // Apply Light/Dark mode class to <html>
  useEffect(() => {
    const isDark = workspace.settings.theme === 'dark';
    document.documentElement.classList.toggle('dark', isDark);
  }, [workspace.settings.theme]);

  const scheduleSessionExpiry = useCallback((expiresInSeconds: number) => {
    if (sessionExpiryTimerRef.current !== null) {
      window.clearTimeout(sessionExpiryTimerRef.current);
    }
    const ms = Math.max(60_000, expiresInSeconds * 1000);
    sessionExpiryTimerRef.current = window.setTimeout(() => {
      setAiConnection((prev) => ({
        ...prev,
        status: 'sesi_berakhir',
        statusMessage:
          'Sesi autentikasi akun Google telah berakhir. Klik Hubungkan Google Account untuk menyambung ulang.',
      }));
    }, ms);
  }, []);

  // Verify real AI connection on startup (never assumes connected unless live test passes)
  const handleCheckAiConnection = useCallback(async () => {
    try {
      const caps = await apiFetchAiCapabilities();
      const test = await apiRunLiveGeminiTest();
      const now = new Date().toISOString();

      setAiConnection((prev) => ({
        ...prev,
        status: test.status,
        model: test.model || caps.model,
        latencyMs: test.latencyMs ?? null,
        lastVerifiedAt: now,
        capabilities: caps,
        authMethod:
          prev.connectedEmail
            ? 'google_oauth'
            : test.ok
              ? 'backend_env_fallback'
              : 'none',
        statusMessage: test.ok
          ? prev.connectedEmail
            ? `Akun Google ${prev.connectedEmail} terhubung dan Gemini API backend (${test.model}) terverifikasi aktif.`
            : `${test.message} Menggunakan konfigurasi backend administrator (fallback resmi).`
          : test.message,
      }));
    } catch {
      setAiConnection((prev) => ({
        ...prev,
        status: 'koneksi_gagal',
        lastVerifiedAt: new Date().toISOString(),
        statusMessage: 'Tidak dapat menghubungi backend server AI. Periksa koneksi internet Anda.',
      }));
    }
  }, []);

  useEffect(() => {
    void handleCheckAiConnection();
    return () => {
      if (sessionExpiryTimerRef.current !== null) {
        window.clearTimeout(sessionExpiryTimerRef.current);
      }
    };
  }, [handleCheckAiConnection]);

  // Official Google OAuth popup flow + live Gemini verification
  const handleConnectGoogle = useCallback(async () => {
    setAiConnection((prev) => ({
      ...prev,
      status: 'menghubungkan',
      statusMessage: 'Menghubungkan akun Google melalui jendela autentikasi resmi...',
    }));

    try {
      const caps = await apiFetchAiCapabilities().catch(() => null);
      const authInfo = await apiGetGoogleAuthUrl();

      if (authInfo.configured && authInfo.url) {
        const result = await new Promise<{
          ok: boolean;
          email?: string;
          name?: string;
          expiresIn?: number;
          error?: string;
        }>((resolve) => {
          let settled = false;
          const onMessage = (ev: MessageEvent) => {
            if (ev.origin !== window.location.origin) return;
            const d = ev.data as {
              type?: string;
              ok?: boolean;
              email?: string;
              name?: string;
              expiresIn?: number;
              error?: string;
            };
            if (d?.type !== 'GOOGLE_AUTH_CALLBACK') return;
            settled = true;
            window.removeEventListener('message', onMessage);
            resolve({
              ok: Boolean(d.ok),
              email: d.email,
              name: d.name,
              expiresIn: d.expiresIn,
              error: d.error,
            });
          };

          window.addEventListener('message', onMessage);
          const popup = window.open(
            authInfo.url,
            'google_oauth_sdn_randusari',
            'width=500,height=640,menubar=no,toolbar=no,status=no',
          );

          if (!popup) {
            window.removeEventListener('message', onMessage);
            resolve({
              ok: false,
              error: 'Popup autentikasi Google diblokir oleh browser. Izinkan popup untuk situs ini.',
            });
            return;
          }

          const poll = window.setInterval(() => {
            if (popup.closed) {
              window.clearInterval(poll);
              if (!settled) {
                window.removeEventListener('message', onMessage);
                resolve({
                  ok: false,
                  error: 'Jendela pemilihan akun Google ditutup sebelum selesai.',
                });
              }
            }
          }, 400);
        });

        if (!result.ok || !result.email) {
          setAiConnection((prev) => ({
            ...prev,
            status: 'koneksi_gagal',
            capabilities: caps || prev.capabilities,
            statusMessage: result.error || 'Autentikasi akun Google belum berhasil.',
          }));
          notify('error', 'Koneksi Google Gagal', result.error || 'Silakan coba lagi.');
          return;
        }

        const test = await apiRunLiveGeminiTest();
        scheduleSessionExpiry(result.expiresIn ?? 3600);
        setAiConnection({
          status: test.ok ? 'berhasil_terhubung' : test.status,
          connectedEmail: result.email,
          connectedName: result.name || null,
          authMethod: 'google_oauth',
          lastVerifiedAt: new Date().toISOString(),
          latencyMs: test.latencyMs ?? null,
          model: test.model || caps?.model || 'gemini-4-hydrogen',
          capabilities: caps,
          statusMessage: test.ok
            ? `Akun ${result.email} berhasil terhubung dan Gemini API backend siap digunakan.`
            : `Akun ${result.email} terautentikasi, namun uji Gemini API gagal: ${test.message}`,
        });
        notify(
          test.ok ? 'success' : 'warning',
          test.ok ? 'Akun Google Terhubung' : 'Memerlukan Konfigurasi Gemini API',
          test.ok ? `Terhubung sebagai ${result.email}` : test.message,
        );
        return;
      }

      // Optional GIS Client ID fallback if configured in public env
      const viteClientId = (import.meta.env.VITE_GOOGLE_CLIENT_ID || '').trim();
      if (viteClientId) {
        const gisUser = await connectWithClientGisIfAvailable(viteClientId);
        const test = await apiRunLiveGeminiTest();
        scheduleSessionExpiry(gisUser.expiresIn);
        setAiConnection({
          status: test.ok ? 'berhasil_terhubung' : test.status,
          connectedEmail: gisUser.email,
          connectedName: gisUser.name || null,
          authMethod: 'google_oauth',
          lastVerifiedAt: new Date().toISOString(),
          latencyMs: test.latencyMs ?? null,
          model: test.model || caps?.model || 'gemini-4-hydrogen',
          capabilities: caps,
          statusMessage: test.ok
            ? `Akun ${gisUser.email} terhubung via Google Identity Services dan Gemini API backend aktif.`
            : `Akun ${gisUser.email} dipilih, namun uji Gemini API belum berhasil: ${test.message}`,
        });
        return;
      }

      // Honest state when OAuth Client ID is not configured yet
      const test = await apiRunLiveGeminiTest();
      setAiConnection((prev) => ({
        ...prev,
        status: 'memerlukan_konfigurasi',
        capabilities: caps,
        model: test.model || caps?.model || prev.model,
        latencyMs: test.latencyMs ?? null,
        lastVerifiedAt: new Date().toISOString(),
        statusMessage: test.ok
          ? `Google OAuth Client (GOOGLE_CLIENT_ID & GOOGLE_CLIENT_SECRET) belum diatur untuk memilih akun Google di perangkat. Namun fallback resmi backend Gemini API (${test.model}) sudah AKTIF dan seluruh fitur AI dapat langsung digunakan.`
          : 'Google OAuth Client maupun GEMINI_API_KEY server belum dikonfigurasi. Buka panduan konfigurasi resmi di bawah.',
      }));
      notify(
        'info',
        'Memerlukan Konfigurasi OAuth Google',
        test.ok
          ? 'Fallback backend Gemini API sudah aktif; tambahkan GOOGLE_CLIENT_ID untuk dialog pilih akun Google.'
          : 'Lengkapi konfigurasi environment server terlebih dahulu.',
      );
    } catch (err) {
      setAiConnection((prev) => ({
        ...prev,
        status: 'koneksi_gagal',
        statusMessage:
          err instanceof Error ? err.message : 'Gagal menghubungkan akun Google.',
      }));
      notify('error', 'Koneksi Gagal', err instanceof Error ? err.message : 'Coba beberapa saat lagi.');
    }
  }, [notify, scheduleSessionExpiry]);

  const handleDisconnectGoogle = useCallback(() => {
    if (sessionExpiryTimerRef.current !== null) {
      window.clearTimeout(sessionExpiryTimerRef.current);
      sessionExpiryTimerRef.current = null;
    }
    setAiConnection((prev) => ({
      ...prev,
      status: 'belum_terhubung',
      connectedEmail: null,
      connectedName: null,
      authMethod: 'none',
      latencyMs: null,
      statusMessage:
        'Koneksi akun Google telah diputuskan dari sesi ini. Klik Hubungkan Google Account atau Periksa Koneksi untuk menyambung kembali.',
    }));
    notify('info', 'Koneksi Diputuskan', 'Sesi akun Google pada memori telah dibersihkan.');
  }, [notify]);

  const logActivity = useCallback(
    (type: ActivityLogItem['type'], title: string, detail: string) => {
      setWorkspace((prev) => {
        const entry: ActivityLogItem = {
          id: `act-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
          type,
          title,
          detail,
          timestamp: new Date().toISOString(),
        };
        const nextActs = [entry, ...prev.activities].slice(0, 40);
        void persistWrite(() => saveActivities(prev.uid, nextActs));
        return { ...prev, activities: nextActs };
      });
    },
    [persistWrite],
  );

  const activeDoc =
    workspace.lessonPlans.find((p) => p.id === activeDocId) || workspace.lessonPlans[0] || null;
  const manualEditingDoc = manualEditingDocId
    ? workspace.lessonPlans.find((p) => p.id === manualEditingDocId) || null
    : null;

  const handleSaveProfile = (nextProfile: TeacherProfile) => {
    setWorkspace((prev) => ({ ...prev, profile: nextProfile }));
    void persistWrite(() => saveProfile(workspace.uid, nextProfile));
    logActivity('profile', 'Profil Guru Diperbarui', nextProfile.namaGuru || nextProfile.namaSekolah);
    notify('success', 'Profil Guru Disimpan', 'Identitas guru dan sekolah tersimpan di IndexedDB perangkat.');
  };

  const handleSaveClasses = (nextClasses: SchoolClass[]) => {
    setWorkspace((prev) => ({ ...prev, classes: nextClasses }));
    void persistWrite(() => saveClasses(workspace.uid, nextClasses));
    logActivity('class', 'Daftar Kelas Diperbarui', `${nextClasses.length} kelas aktif`);
  };

  const handleUpdateSettings = (nextSettings: AppSettings) => {
    setWorkspace((prev) => ({ ...prev, settings: nextSettings }));
    void persistWrite(() => saveSettings(workspace.uid, nextSettings));
  };

  const handleGenerateAiRpm = async (input: AutoGeneratorInput) => {
    setIsGeneratingRpm(true);
    try {
      const newDocId = `rpm-${Date.now()}`;
      const bundle = await apiGenerateRpm(
        {
          ...input,
          lessonPlanId: newDocId,
          nipGuru: workspace.profile.nip,
          namaKepalaSekolah: workspace.profile.namaKepalaSekolah,
          nipKepalaSekolah: workspace.profile.nipKepalaSekolah,
        },
        workspace.uid,
      );

      const now = new Date().toISOString();
      const linkedPak: PakIntegrationRecord | undefined = input.pakIntegration
        ? {
            ...input.pakIntegration,
            lessonPlanId: newDocId,
            updatedAt: now,
          }
        : bundle.pakIntegration
          ? {
              ...bundle.pakIntegration,
              lessonPlanId: newDocId,
              updatedAt: now,
            }
          : undefined;
      const finalCore =
        linkedPak && linkedPak.applied && !linkedPak.ignored
          ? applyPakIntegrationToRpmCore(bundle.rpm, linkedPak)
          : bundle.rpm;

      const baseLkpd = normalizeLkpdKit(bundle.lkpd || {}, finalCore, linkedPak, newDocId);
      const reconciled = validateAndReconcileCrossDocument(
        finalCore,
        baseLkpd,
        linkedPak,
        newDocId,
        'reconcile_lkpd_to_rpm',
      );
      const finalPerangkat = { lkpd: reconciled.lkpd };
      const finalValidation = bundle.crossValidation || reconciled.validation;

      const newDoc: RpmDocument = {
        id: newDocId,
        uid: workspace.uid,
        title: `RPM ${finalCore.identitas.mataPelajaran} ${finalCore.identitas.kelas} — ${finalCore.identitas.materi}`,
        subject: finalCore.identitas.mataPelajaran,
        grade: finalCore.identitas.kelas,
        phase: finalCore.identitas.fase,
        semester: finalCore.identitas.semester,
        topic: finalCore.identitas.materi,
        status: 'draft',
        version: 1,
        content: finalCore,
        perangkat: finalPerangkat,
        pakIntegration: linkedPak,
        crossValidation: finalValidation,
        revisionHistory: [
          {
            version: 1,
            timestamp: now,
            section: 'Generasi AI Awal',
            summary: `RPM, PAK & LKPD disusun untuk ${finalCore.identitas.materi}`,
            content: finalCore,
            perangkat: finalPerangkat,
          },
        ],
        createdAt: now,
        updatedAt: now,
      };

      const newWorksheet = buildWorksheetRecord(newDoc);
      const nextPlans = [newDoc, ...workspace.lessonPlans];
      setWorkspace((prev) => ({
        ...prev,
        lessonPlans: nextPlans,
        pakIntegrations: linkedPak
          ? [linkedPak, ...prev.pakIntegrations.filter((p) => p.id !== linkedPak.id)]
          : prev.pakIntegrations,
        worksheets: newWorksheet
          ? [newWorksheet, ...prev.worksheets.filter((w) => w.lessonPlanId !== newDoc.id)]
          : prev.worksheets,
      }));
      await persistWrite(async () => {
        await upsertSingleLessonPlan(workspace.uid, newDoc);
        if (linkedPak) {
          await upsertPakIntegration(workspace.uid, linkedPak);
        }
        if (newWorksheet) {
          await upsertWorksheet(workspace.uid, newWorksheet);
        }
      });
      setActiveDocId(newDoc.id);
      setActivePage('dokumen-rpm');
      logActivity('create', 'Paket RPM & LKPD Dihasilkan AI', newDoc.title);
      if (linkedPak?.applied) {
        logActivity('pak', 'Integrasi PAK Diterapkan', newDoc.title);
      }
      logActivity('lkpd', 'LKPD Otomatis Dihasilkan', reconciled.lkpd.judul);
      notify(
        'success',
        'RPM, PAK & LKPD Berhasil Disusun',
        'Dokumen 1 (RPM) dan Dokumen 2 (LKPD) telah tersimpan di IndexedDB.',
      );
    } catch (err) {
      notify(
        'error',
        'Gagal Menyusun RPM',
        err instanceof Error ? err.message : 'Terjadi kendala saat menghubungi server AI.',
      );
    } finally {
      setIsGeneratingRpm(false);
    }
  };

  // Debounced silent autosave for ManualEditorView
  const handleAutoSaveManualDoc = useCallback(
    (content: RpmCoreContent, title: string, pak?: PakIntegrationRecord | null) => {
      const now = new Date().toISOString();
      setWorkspace((prev) => {
        const existingId =
          manualEditingDocId && prev.lessonPlans.some((p) => p.id === manualEditingDocId)
            ? manualEditingDocId
            : null;

        if (existingId) {
          const existingDoc = prev.lessonPlans.find((p) => p.id === existingId);
          const linkedPak = pak
            ? { ...pak, lessonPlanId: existingId, updatedAt: now }
            : undefined;
          const updatedTarget: RpmDocument | null = existingDoc
            ? {
                ...existingDoc,
                title,
                subject: content.identitas.mataPelajaran,
                grade: content.identitas.kelas,
                phase: content.identitas.fase,
                semester: content.identitas.semester,
                topic: content.identitas.materi,
                content,
                pakIntegration: linkedPak !== undefined ? linkedPak : existingDoc.pakIntegration,
                updatedAt: now,
              }
            : null;
          const nextPlans = updatedTarget
            ? prev.lessonPlans.map((p) => (p.id === existingId ? updatedTarget : p))
            : prev.lessonPlans;
          if (updatedTarget) {
            void persistWrite(async () => {
              await upsertSingleLessonPlan(prev.uid, updatedTarget);
              if (updatedTarget.pakIntegration) {
                await upsertPakIntegration(prev.uid, updatedTarget.pakIntegration);
              }
            });
          }
          return {
            ...prev,
            lessonPlans: nextPlans,
            pakIntegrations: linkedPak
              ? [linkedPak, ...prev.pakIntegrations.filter((x) => x.id !== linkedPak.id)]
              : prev.pakIntegrations,
          };
        }

        const newId = `rpm-${Date.now()}`;
        const linkedPak = pak ? { ...pak, lessonPlanId: newId, updatedAt: now } : undefined;
        const created: RpmDocument = {
          id: newId,
          uid: prev.uid,
          title,
          subject: content.identitas.mataPelajaran,
          grade: content.identitas.kelas,
          phase: content.identitas.fase,
          semester: content.identitas.semester,
          topic: content.identitas.materi,
          status: 'draft',
          version: 1,
          content,
          perangkat: {},
          pakIntegration: linkedPak,
          revisionHistory: [
            {
              version: 1,
              timestamp: now,
              section: 'Autosave Awal',
              summary: 'Draft otomatis disimpan saat pengisian manual',
              content,
            },
          ],
          createdAt: now,
          updatedAt: now,
        };
        setManualEditingDocId(newId);
        setActiveDocId(newId);
        void persistWrite(async () => {
          await upsertSingleLessonPlan(prev.uid, created);
          if (linkedPak) {
            await upsertPakIntegration(prev.uid, linkedPak);
          }
        });
        return {
          ...prev,
          lessonPlans: [created, ...prev.lessonPlans],
          pakIntegrations: linkedPak
            ? [linkedPak, ...prev.pakIntegrations.filter((x) => x.id !== linkedPak.id)]
            : prev.pakIntegrations,
        };
      });
    },
    [manualEditingDocId, persistWrite],
  );

  const handleSaveManualDoc = (
    content: RpmCoreContent,
    title: string,
    goPreview: boolean,
    pak?: PakIntegrationRecord | null,
  ) => {
    const now = new Date().toISOString();
    let targetId = manualEditingDocId;
    let nextPlans: RpmDocument[];
    let savedDoc: RpmDocument;

    if (targetId && workspace.lessonPlans.some((p) => p.id === targetId)) {
      const linkedPak = pak ? { ...pak, lessonPlanId: targetId, updatedAt: now } : undefined;
      nextPlans = workspace.lessonPlans.map((p) => {
        if (p.id !== targetId) return p;
        const nextVersion = p.version + 1;
        savedDoc = {
          ...p,
          title,
          subject: content.identitas.mataPelajaran,
          grade: content.identitas.kelas,
          phase: content.identitas.fase,
          semester: content.identitas.semester,
          topic: content.identitas.materi,
          version: nextVersion,
          content,
          pakIntegration: linkedPak !== undefined ? linkedPak : p.pakIntegration,
          revisionHistory: [
            {
              version: nextVersion,
              timestamp: now,
              section: 'Edit Manual',
              summary: 'Pembaruan manual oleh guru',
              content,
            },
            ...p.revisionHistory,
          ].slice(0, 20),
          updatedAt: now,
        };
        return savedDoc;
      });
    } else {
      targetId = `rpm-${Date.now()}`;
      const linkedPak = pak ? { ...pak, lessonPlanId: targetId, updatedAt: now } : undefined;
      savedDoc = {
        id: targetId,
        uid: workspace.uid,
        title,
        subject: content.identitas.mataPelajaran,
        grade: content.identitas.kelas,
        phase: content.identitas.fase,
        semester: content.identitas.semester,
        topic: content.identitas.materi,
        status: 'draft',
        version: 1,
        content,
        perangkat: {},
        pakIntegration: linkedPak,
        revisionHistory: [
          {
            version: 1,
            timestamp: now,
            section: 'Pengisian Manual',
            summary: 'Draft awal disimpan dari editor manual',
            content,
          },
        ],
        createdAt: now,
        updatedAt: now,
      };
      nextPlans = [savedDoc, ...workspace.lessonPlans];
    }

    const persistedPak = savedDoc!.pakIntegration;
    setWorkspace((prev) => ({
      ...prev,
      lessonPlans: nextPlans,
      pakIntegrations: persistedPak
        ? [persistedPak, ...prev.pakIntegrations.filter((x) => x.id !== persistedPak.id)]
        : prev.pakIntegrations,
    }));
    void persistWrite(async () => {
      await upsertSingleLessonPlan(workspace.uid, savedDoc!);
      if (persistedPak) {
        await upsertPakIntegration(workspace.uid, persistedPak);
      }
    });
    setActiveDocId(targetId);
    logActivity('update', goPreview ? 'RPM Disimpan' : 'Draft Disimpan', title);
    notify('success', goPreview ? 'RPM Disimpan' : 'Draft Tersimpan di IndexedDB', title);

    if (goPreview) {
      setManualEditingDocId(null);
      setActivePage('dokumen-rpm');
    } else {
      setManualEditingDocId(targetId);
    }
  };

  const handleUpdateDocument = (nextDoc: RpmDocument) => {
    const nextPlans = workspace.lessonPlans.map((p) => (p.id === nextDoc.id ? nextDoc : p));
    const docPak = nextDoc.pakIntegration;
    const existingWs = workspace.worksheets.find((w) => w.lessonPlanId === nextDoc.id);
    const nextWs = buildWorksheetRecord(nextDoc, existingWs);

    setWorkspace((prev) => ({
      ...prev,
      lessonPlans: nextPlans,
      pakIntegrations: docPak
        ? [docPak, ...prev.pakIntegrations.filter((x) => x.id !== docPak.id)]
        : prev.pakIntegrations,
      worksheets: nextWs
        ? [nextWs, ...prev.worksheets.filter((w) => w.lessonPlanId !== nextDoc.id)]
        : prev.worksheets,
    }));
    void persistWrite(async () => {
      await upsertSingleLessonPlan(workspace.uid, nextDoc);
      if (docPak) {
        await upsertPakIntegration(workspace.uid, docPak);
      }
      if (nextWs) {
        await upsertWorksheet(workspace.uid, nextWs);
      }
    });
  };

  const handleSavePakRecord = (record: PakIntegrationRecord) => {
    setWorkspace((prev) => ({
      ...prev,
      pakIntegrations: [record, ...prev.pakIntegrations.filter((x) => x.id !== record.id)],
    }));
    void persistWrite(() => upsertPakIntegration(workspace.uid, record));
  };

  const handleDuplicatePlan = (id: string) => {
    const source = workspace.lessonPlans.find((p) => p.id === id);
    if (!source) return;
    const now = new Date().toISOString();
    const newId = `rpm-${Date.now()}`;
    const clonedPak = source.pakIntegration
      ? {
          ...structuredClone(source.pakIntegration),
          id: `pak-${Date.now()}`,
          lessonPlanId: newId,
          updatedAt: now,
        }
      : undefined;
    const clonedPerangkat = structuredClone(source.perangkat || {});
    if (clonedPerangkat.lkpd) {
      clonedPerangkat.lkpd = {
        ...clonedPerangkat.lkpd,
        id: `lkpd-${newId}`,
        lessonPlanId: newId,
        updatedAt: now,
      };
    }
    const copy: RpmDocument = {
      ...structuredClone(source),
      id: newId,
      title: `${source.title} (Salinan)`,
      status: 'draft',
      version: 1,
      perangkat: clonedPerangkat,
      pakIntegration: clonedPak,
      createdAt: now,
      updatedAt: now,
    };
    const clonedWs = buildWorksheetRecord(copy);
    const nextPlans = [copy, ...workspace.lessonPlans];
    setWorkspace((prev) => ({
      ...prev,
      lessonPlans: nextPlans,
      pakIntegrations: clonedPak ? [clonedPak, ...prev.pakIntegrations] : prev.pakIntegrations,
      worksheets: clonedWs ? [clonedWs, ...prev.worksheets] : prev.worksheets,
    }));
    void persistWrite(async () => {
      await upsertSingleLessonPlan(workspace.uid, copy);
      if (clonedPak) {
        await upsertPakIntegration(workspace.uid, clonedPak);
      }
      if (clonedWs) {
        await upsertWorksheet(workspace.uid, clonedWs);
      }
    });
    logActivity('create', 'RPM Diduplikasi', copy.title);
    notify('success', 'Dokumen Diduplikasi', copy.title);
  };

  const handleDeletePlan = (id: string) => {
    const target = workspace.lessonPlans.find((p) => p.id === id);
    const nextPlans = workspace.lessonPlans.filter((p) => p.id !== id);
    const nextPaks = workspace.pakIntegrations.filter((x) => x.lessonPlanId !== id);
    const nextWorksheets = workspace.worksheets.filter((w) => w.lessonPlanId !== id);
    setWorkspace((prev) => ({
      ...prev,
      lessonPlans: nextPlans,
      pakIntegrations: nextPaks,
      worksheets: nextWorksheets,
    }));
    void persistWrite(async () => {
      await Promise.all([
        saveLessonPlans(workspace.uid, nextPlans),
        savePakIntegrations(workspace.uid, nextPaks),
        saveWorksheets(workspace.uid, nextWorksheets),
      ]);
    });
    if (activeDocId === id) {
      setActiveDocId(nextPlans[0]?.id || null);
    }
    notify('info', 'RPM Dihapus', target?.title || 'Dokumen telah dihapus.');
  };

  const handleSaveAsTemplate = (docData: RpmDocument) => {
    const now = new Date().toISOString();
    const tpl: RpmTemplate = {
      id: `tpl-${Date.now()}`,
      name: `Template: ${docData.content.identitas.materi || docData.title}`,
      description: `Struktur Pembelajaran Mendalam (${docData.content.desain.modelPembelajaran}) untuk ${docData.subject} ${docData.grade}.`,
      subject: docData.subject,
      grade: docData.grade,
      phase: docData.phase,
      content: structuredClone(docData.content),
      createdAt: now,
      updatedAt: now,
    };
    const nextTpls = [tpl, ...workspace.templates];
    setWorkspace((prev) => ({ ...prev, templates: nextTpls }));
    void persistWrite(() => saveTemplates(workspace.uid, nextTpls));
    logActivity('create', 'Template Baru Disimpan', tpl.name);
    notify('success', 'Tersimpan ke Template Saya', 'Template siap dipakai ulang pada pembuatan RPM baru.');
  };

  const handleUseTemplate = (templateId: string) => {
    const tpl = workspace.templates.find((t) => t.id === templateId);
    if (!tpl) return;
    const now = new Date().toISOString();
    const newContent = structuredClone(tpl.content);
    newContent.identitas.namaGuru = workspace.profile.namaGuru || newContent.identitas.namaGuru;
    newContent.identitas.namaSatuanPendidikan =
      workspace.profile.namaSekolah || newContent.identitas.namaSatuanPendidikan;

    const newDoc: RpmDocument = {
      id: `rpm-${Date.now()}`,
      uid: workspace.uid,
      title: `${tpl.subject} ${tpl.grade} (Dari Template)`,
      subject: tpl.subject,
      grade: tpl.grade,
      phase: tpl.phase,
      semester: newContent.identitas.semester,
      topic: newContent.identitas.materi,
      status: 'draft',
      version: 1,
      content: newContent,
      perangkat: {},
      revisionHistory: [
        {
          version: 1,
          timestamp: now,
          section: 'Dari Template',
          summary: `Dibuat menggunakan template "${tpl.name}"`,
          content: newContent,
        },
      ],
      createdAt: now,
      updatedAt: now,
    };
    const nextPlans = [newDoc, ...workspace.lessonPlans];
    setWorkspace((prev) => ({ ...prev, lessonPlans: nextPlans }));
    void persistWrite(() => upsertSingleLessonPlan(workspace.uid, newDoc));
    setActiveDocId(newDoc.id);
    setManualEditingDocId(newDoc.id);
    setActivePage('pengisian-manual');
    notify('success', 'Template Diterapkan', 'Sesuaikan materi atau identitas bila diperlukan lalu simpan.');
  };

  const handleLoadSamplePlan = () => {
    const sample = createSampleIpasRpm(workspace.profile, workspace.uid);
    const sampleWs = buildWorksheetRecord(sample);
    const nextPlans = [sample, ...workspace.lessonPlans];
    setWorkspace((prev) => ({
      ...prev,
      lessonPlans: nextPlans,
      pakIntegrations: sample.pakIntegration
        ? [sample.pakIntegration, ...prev.pakIntegrations.filter((x) => x.id !== sample.pakIntegration!.id)]
        : prev.pakIntegrations,
      worksheets: sampleWs
        ? [sampleWs, ...prev.worksheets.filter((w) => w.lessonPlanId !== sample.id)]
        : prev.worksheets,
    }));
    void persistWrite(async () => {
      await upsertSingleLessonPlan(workspace.uid, sample);
      if (sample.pakIntegration) {
        await upsertPakIntegration(workspace.uid, sample.pakIntegration);
      }
      if (sampleWs) {
        await upsertWorksheet(workspace.uid, sampleWs);
      }
    });
    setActiveDocId(sample.id);
    setActivePage('dokumen-rpm');
    logActivity('create', 'Contoh RPM + PAK + LKPD Dimuat', sample.title);
    notify(
      'success',
      'Contoh RPM & LKPD Siap Ditinjau',
      'Tersimpan di IndexedDB lengkap dengan integrasi PAK & 12 bagian LKPD siap cetak.',
    );
  };

  const handleExportBackup = () => {
    const payload = buildBackupPayload(workspace);
    const fileName = `backup-ai-rpm-sdn-randusari-${new Date().toISOString().slice(0, 10)}.json`;
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    const meta = {
      id: `bkp-${Date.now()}`,
      fileName,
      rpmCount: workspace.lessonPlans.length,
      classCount: workspace.classes.length,
      templateCount: workspace.templates.length,
      createdAt: new Date().toISOString(),
    };
    const nextBackups = [meta, ...workspace.backups].slice(0, 15);
    setWorkspace((prev) => ({ ...prev, backups: nextBackups }));
    void persistWrite(() => saveBackups(workspace.uid, nextBackups));
    logActivity('backup', 'Ekspor Backup Berhasil', fileName);
    notify('success', 'Backup Data Diunduh', 'Simpan berkas JSON di tempat aman sebagai cadangan.');
  };

  const handleApplyParsedBackup = async (
    parsed: ExportedBackupPayload,
    mode: 'merge' | 'replace',
  ) => {
    const imp = parsed.data;
    const impPak = Array.isArray(imp.pakIntegrations) ? imp.pakIntegrations : [];
    const impWsRaw = Array.isArray(imp.worksheets) ? imp.worksheets : [];
    const derivedWsMap = new Map(impWsRaw.map((w) => [w.lessonPlanId, w]));
    for (const lp of imp.lessonPlans) {
      if (lp.perangkat?.lkpd && !derivedWsMap.has(lp.id)) {
        const built = buildWorksheetRecord(lp);
        if (built) derivedWsMap.set(lp.id, built);
      }
    }
    const impWs = Array.from(derivedWsMap.values());

    if (mode === 'replace') {
      await persistWrite(async () => {
        await Promise.all([
          saveProfile(workspace.uid, imp.profile),
          saveClasses(workspace.uid, imp.classes),
          saveTemplates(workspace.uid, imp.templates),
          saveLessonPlans(workspace.uid, imp.lessonPlans),
          savePakIntegrations(workspace.uid, impPak),
          saveWorksheets(workspace.uid, impWs),
          imp.settings ? saveSettings(workspace.uid, imp.settings) : Promise.resolve(),
        ]);
      });
      setWorkspace((prev) => ({
        ...prev,
        profile: imp.profile,
        classes: imp.classes,
        templates: imp.templates,
        lessonPlans: imp.lessonPlans,
        pakIntegrations: impPak,
        worksheets: impWs,
        settings: imp.settings || prev.settings,
      }));
    } else {
      const mergeById = <T extends { id: string }>(cur: T[], inc: T[]) => {
        const map = new Map(cur.map((i) => [i.id, i]));
        for (const item of inc) map.set(item.id, item);
        return Array.from(map.values());
      };
      const nextPlans = mergeById(workspace.lessonPlans, imp.lessonPlans);
      const nextClasses = mergeById(workspace.classes, imp.classes);
      const nextTemplates = mergeById(workspace.templates, imp.templates);
      const nextPaks = mergeById(workspace.pakIntegrations, impPak);
      const nextWorksheets = mergeById(workspace.worksheets, impWs);
      await persistWrite(async () => {
        await Promise.all([
          saveLessonPlans(workspace.uid, nextPlans),
          saveClasses(workspace.uid, nextClasses),
          saveTemplates(workspace.uid, nextTemplates),
          savePakIntegrations(workspace.uid, nextPaks),
          saveWorksheets(workspace.uid, nextWorksheets),
        ]);
      });
      setWorkspace((prev) => ({
        ...prev,
        lessonPlans: nextPlans,
        classes: nextClasses,
        templates: nextTemplates,
        pakIntegrations: nextPaks,
        worksheets: nextWorksheets,
      }));
    }

    logActivity('backup', 'Impor Backup Berhasil', `${imp.lessonPlans.length} RPM dipulihkan`);
    notify('success', 'Backup Berhasil Dipulihkan', `${imp.lessonPlans.length} RPM telah dimuat ke IndexedDB.`);
  };

  const handleImportSingleRpmFile = async (file: File) => {
    try {
      const text = await file.text();
      const importedDoc = parseAndValidateSingleRpmJson(text);
      const now = new Date().toISOString();
      const duplicateId = workspace.lessonPlans.some((p) => p.id === importedDoc.id);
      const newDocId = duplicateId ? `rpm-${Date.now()}` : importedDoc.id;
      const normalizedPak = importedDoc.pakIntegration
        ? { ...importedDoc.pakIntegration, lessonPlanId: newDocId, updatedAt: now }
        : undefined;
      const normalizedPerangkat = structuredClone(importedDoc.perangkat || {});
      if (normalizedPerangkat.lkpd) {
        normalizedPerangkat.lkpd = normalizeLkpdKit(
          normalizedPerangkat.lkpd,
          importedDoc.content,
          normalizedPak,
          newDocId,
        );
      }
      const normalizedDoc: RpmDocument = {
        ...importedDoc,
        id: newDocId,
        uid: workspace.uid,
        title: duplicateId ? `${importedDoc.title} (Impor)` : importedDoc.title,
        perangkat: normalizedPerangkat,
        pakIntegration: normalizedPak,
        updatedAt: now,
      };
      const importedWs = buildWorksheetRecord(normalizedDoc);
      const nextPlans = [normalizedDoc, ...workspace.lessonPlans];
      setWorkspace((prev) => ({
        ...prev,
        lessonPlans: nextPlans,
        pakIntegrations: normalizedPak
          ? [normalizedPak, ...prev.pakIntegrations.filter((x) => x.id !== normalizedPak.id)]
          : prev.pakIntegrations,
        worksheets: importedWs
          ? [importedWs, ...prev.worksheets.filter((w) => w.lessonPlanId !== normalizedDoc.id)]
          : prev.worksheets,
      }));
      await persistWrite(async () => {
        await upsertSingleLessonPlan(workspace.uid, normalizedDoc);
        if (normalizedPak) {
          await upsertPakIntegration(workspace.uid, normalizedPak);
        }
        if (importedWs) {
          await upsertWorksheet(workspace.uid, importedWs);
        }
      });
      setActiveDocId(normalizedDoc.id);
      setActivePage('dokumen-rpm');
      logActivity('backup', 'Impor RPM Satuan Berhasil', normalizedDoc.title);
      notify('success', 'Dokumen RPM Diimpor', normalizedDoc.title);
    } catch (err) {
      notify(
        'error',
        'Gagal Mengimpor Dokumen RPM',
        err instanceof Error ? err.message : 'Format JSON dokumen RPM tidak valid.',
      );
    }
  };

  const handleResetAllData = () => {
    void persistWrite(async () => {
      await clearAllWorkspaceData(workspace.uid);
      const fresh = await loadWorkspaceData(workspace.uid);
      setWorkspace(fresh);
    });
    setActiveDocId(null);
    setManualEditingDocId(null);
    setActivePage('dashboard');
    notify('info', 'Data Lokal Dibersihkan', 'Seluruh data IndexedDB pada sesi ini telah direset.');
  };

  const handleSaveInterviewDraft = useCallback(
    (draft: InterviewSessionState) => {
      setWorkspace((prev) => ({ ...prev, interviewDraft: draft }));
      void persistWrite(() => saveInterviewDraft(workspace.uid, draft));
    },
    [workspace.uid, persistWrite],
  );

  return (
    <AppErrorBoundary>
      <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
        <OfflineIndicator />

        <div className="flex-1 flex min-w-0">
          <Sidebar
            activePage={activePage}
            onNavigate={(page) => {
              if (page === 'pengisian-manual') {
                setManualEditingDocId(null);
              }
              setActivePage(page);
            }}
            mobileOpen={mobileNavOpen}
            onCloseMobile={() => setMobileNavOpen(false)}
            schoolName={workspace.profile.namaSekolah}
            hasActiveDoc={activeDoc !== null}
          />

          <div className="flex-1 flex flex-col min-w-0">
            <TopBar
              activePage={activePage}
              theme={workspace.settings.theme}
              saveStatus={saveStatus}
              lastSavedAt={lastSavedAt}
              onToggleTheme={() =>
                handleUpdateSettings({
                  ...workspace.settings,
                  theme: workspace.settings.theme === 'dark' ? 'light' : 'dark',
                })
              }
              onOpenMobileNav={() => setMobileNavOpen(true)}
              onCreateNew={() => setActivePage('buat-rpm')}
              onOpenBackupSettings={() => setActivePage('pengaturan')}
              activeDocTitle={activeDoc?.title}
            />

            <main className="flex-1 p-4 lg:p-6 max-w-[1400px] w-full mx-auto">
              {!workspaceReady ? (
                <div className="space-y-4 animate-pulse">
                  <div className="h-32 rounded-xl bg-slate-200/70 dark:bg-slate-800/70" />
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="h-40 rounded-xl bg-slate-200/70 dark:bg-slate-800/70" />
                    <div className="h-40 rounded-xl bg-slate-200/70 dark:bg-slate-800/70" />
                    <div className="h-40 rounded-xl bg-slate-200/70 dark:bg-slate-800/70" />
                  </div>
                </div>
              ) : (
                <>
                  {activePage === 'dashboard' && (
                    <DashboardView
                      profile={workspace.profile}
                      lessonPlans={workspace.lessonPlans}
                      templates={workspace.templates}
                      classes={workspace.classes}
                      activities={workspace.activities}
                      uid={workspace.uid}
                      aiConnection={aiConnection}
                      onConnectGoogle={handleConnectGoogle}
                      onCheckAiConnection={handleCheckAiConnection}
                      onDisconnectGoogle={handleDisconnectGoogle}
                      onNavigate={(page) => {
                        if (page === 'pengisian-manual') setManualEditingDocId(null);
                        setActivePage(page);
                      }}
                      onOpenPlan={(id) => {
                        setActiveDocId(id);
                        setActivePage('dokumen-rpm');
                      }}
                      onLoadSamplePlan={handleLoadSamplePlan}
                      onQuickBackup={handleExportBackup}
                    />
                  )}

                  {activePage === 'buat-rpm' && (
                    <CreateHubView
                      templates={workspace.templates}
                      onNavigate={(page) => {
                        if (page === 'pengisian-manual') setManualEditingDocId(null);
                        setActivePage(page);
                      }}
                      onUseTemplate={handleUseTemplate}
                    />
                  )}

                  {activePage === 'generator-otomatis' && (
                    <AutoGeneratorView
                      profile={workspace.profile}
                      classes={workspace.classes}
                      uid={workspace.uid}
                      isGenerating={isGeneratingRpm}
                      onGenerate={handleGenerateAiRpm}
                      onNotify={notify}
                    />
                  )}

                  {activePage === 'ai-interview' && (
                    <AiInterviewView
                      profile={workspace.profile}
                      classes={workspace.classes}
                      uid={workspace.uid}
                      savedDraft={workspace.interviewDraft}
                      isGeneratingRpm={isGeneratingRpm}
                      onSaveDraft={handleSaveInterviewDraft}
                      onGenerateFromInterview={handleGenerateAiRpm}
                      onNotify={notify}
                    />
                  )}

                  {activePage === 'pengisian-manual' && (
                    <ManualEditorView
                      key={manualEditingDocId || 'new-manual'}
                      profile={workspace.profile}
                      classes={workspace.classes}
                      uid={workspace.uid}
                      initialContent={manualEditingDoc?.content}
                      initialPakIntegration={manualEditingDoc?.pakIntegration || null}
                      editingTitle={manualEditingDoc?.title}
                      autoSaveEnabled={workspace.settings.autoSaveDraft}
                      onAutoSave={handleAutoSaveManualDoc}
                      onSaveDraft={(c, t, p) => handleSaveManualDoc(c, t, false, p)}
                      onSaveAndPreview={(c, t, p) => handleSaveManualDoc(c, t, true, p)}
                      onNotify={notify}
                    />
                  )}

                  {activePage === 'integrasi-pak' && (
                    <PakIntegrationHubView
                      uid={workspace.uid}
                      lessonPlans={workspace.lessonPlans}
                      pakIntegrations={workspace.pakIntegrations}
                      onSavePakRecord={handleSavePakRecord}
                      onApplyPakToDocument={(updatedDoc, pak) => {
                        handleUpdateDocument(updatedDoc);
                        logActivity(
                          'pak',
                          pak.applied ? 'Integrasi PAK Diterapkan' : 'Integrasi PAK Diabaikan',
                          updatedDoc.title,
                        );
                      }}
                      onOpenPlan={(id) => {
                        setActiveDocId(id);
                        setActivePage('dokumen-rpm');
                      }}
                      onNotify={notify}
                    />
                  )}

                  {activePage === 'dokumen-rpm' && activeDoc && (
                    <DocumentWorkspaceView
                      docData={activeDoc}
                      exportConfig={workspace.settings.exportConfig}
                      uid={workspace.uid}
                      onUpdateExportConfig={(nextCfg) =>
                        handleUpdateSettings({ ...workspace.settings, exportConfig: nextCfg })
                      }
                      onUpdateDocument={handleUpdateDocument}
                      onSaveAsTemplate={handleSaveAsTemplate}
                      onOpenManualEdit={(docItem) => {
                        setManualEditingDocId(docItem.id);
                        setActivePage('pengisian-manual');
                      }}
                      onNotify={notify}
                      onLogActivity={logActivity}
                    />
                  )}

                  {activePage === 'riwayat-rpm' && (
                    <HistoryView
                      plans={workspace.lessonPlans}
                      onOpenPlan={(id) => {
                        setActiveDocId(id);
                        setActivePage('dokumen-rpm');
                      }}
                      onDuplicatePlan={handleDuplicatePlan}
                      onDeletePlan={handleDeletePlan}
                      onCreateNew={() => setActivePage('buat-rpm')}
                    />
                  )}

                  {activePage === 'template-saya' && (
                    <TemplatesView
                      templates={workspace.templates}
                      onUseTemplate={handleUseTemplate}
                      onDeleteTemplate={(id) => {
                        const next = workspace.templates.filter((t) => t.id !== id);
                        setWorkspace((prev) => ({ ...prev, templates: next }));
                        void persistWrite(() => saveTemplates(workspace.uid, next));
                        notify('info', 'Template Dihapus');
                      }}
                      onNavigateToCreate={() => setActivePage('buat-rpm')}
                    />
                  )}

                  {activePage === 'manajemen-kelas' && (
                    <ClassesView
                      classes={workspace.classes}
                      onSaveClasses={handleSaveClasses}
                      onNotify={notify}
                    />
                  )}

                  {activePage === 'profil-guru' && (
                    <ProfileView profile={workspace.profile} onSaveProfile={handleSaveProfile} />
                  )}

                  {activePage === 'pengaturan' && (
                    <SettingsView
                      uid={workspace.uid}
                      settings={workspace.settings}
                      backups={workspace.backups}
                      aiConnection={aiConnection}
                      onConnectGoogle={handleConnectGoogle}
                      onCheckAiConnection={handleCheckAiConnection}
                      onDisconnectGoogle={handleDisconnectGoogle}
                      onUpdateSettings={handleUpdateSettings}
                      onExportBackup={handleExportBackup}
                      onApplyParsedBackup={handleApplyParsedBackup}
                      onImportSingleRpmFile={handleImportSingleRpmFile}
                      onResetAllData={handleResetAllData}
                      onNotify={notify}
                    />
                  )}

                  {activePage === 'pusat-bantuan' && <HelpCenterView />}
                </>
              )}
            </main>
          </div>
        </div>

        <ToastContainer toasts={toasts} onDismiss={dismissToast} />
      </div>
    </AppErrorBoundary>
  );
}
