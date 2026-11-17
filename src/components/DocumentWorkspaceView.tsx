import React, { useState } from 'react';
import {
  CheckCircle2,
  ClipboardCheck,
  Download,
  Edit3,
  Eye,
  FileText,
  FolderPlus,
  History,
  Layers,
  Loader2,
  Package,
  Printer,
  Redo2,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Undo2,
  Wand2,
} from 'lucide-react';
import type {
  CrossDocumentValidationResult,
  ExportConfig,
  LkpdKit,
  PerangkatPembelajaran,
  QualityControlReport,
  RevisionTargetSection,
  RpmCoreContent,
  RpmDocument,
} from '../types/rpm';
import {
  apiGenerateDiagnostikDetail,
  apiGenerateLkpd,
  apiGenerateMaterial,
  apiGenerateMedia,
  apiGenerateObservasi,
  apiGenerateRefleksiDetail,
  apiGenerateRubric,
  apiGenerateSoalEvaluasi,
  apiReviseRpm,
  apiValidateRpm,
} from '../services/api';
import {
  exportLkpdToDocx,
  exportPaketRpmLkpdToDocx,
  exportRpmToDocx,
} from '../services/exportDocx';
import {
  exportLkpdToPdf,
  exportPaketRpmLkpdToPdf,
  exportRpmToPdf,
} from '../services/exportPdf';
import { buildSingleRpmExportPayload } from '../services/storageValidation';
import { auditRpmStructure, computeRpmDiff } from '../utils/pedagogy';
import { applyPakIntegrationToRpmCore, stripPakIntegrationFromRpmCore } from '../utils/pak';
import {
  getGradeBandGuidance,
  normalizeLkpdKit,
  validateAndReconcileCrossDocument,
} from '../utils/lkpd';
import { LkpdA4Preview } from './LkpdA4Preview';
import { LkpdEditorPanel } from './LkpdEditorPanel';
import { PakAutoDetectPanel } from './PakAutoDetectPanel';
import { RpmA4Preview } from './RpmA4Preview';

type WorkspaceTab = 'preview' | 'lkpd' | 'perangkat' | 'pak' | 'qc' | 'revisi';

export function DocumentWorkspaceView({
  docData,
  exportConfig,
  uid,
  onUpdateExportConfig,
  onUpdateDocument,
  onSaveAsTemplate,
  onOpenManualEdit,
  onNotify,
  onLogActivity,
}: {
  docData: RpmDocument;
  exportConfig: ExportConfig;
  uid: string;
  onUpdateExportConfig: (next: ExportConfig) => void;
  onUpdateDocument: (nextDoc: RpmDocument) => void;
  onSaveAsTemplate: (docData: RpmDocument) => void;
  onOpenManualEdit: (docData: RpmDocument) => void;
  onNotify: (type: 'success' | 'error' | 'warning' | 'info', title: string, message?: string) => void;
  onLogActivity: (type: 'update' | 'export' | 'qc' | 'pak' | 'lkpd', title: string, detail: string) => void;
}) {
  const [activeTab, setActiveTab] = useState<WorkspaceTab>('preview');
  const [exportingType, setExportingType] = useState<
    'rpm-pdf' | 'rpm-docx' | 'lkpd-pdf' | 'lkpd-docx' | 'paket-pdf' | 'paket-docx' | null
  >(null);
  const [busyKit, setBusyKit] = useState<string | null>(null);
  const [isCheckingQc, setIsCheckingQc] = useState(false);

  // LKPD Preview, Edit & Regeneration state
  const [isEditingLkpd, setIsEditingLkpd] = useState(false);
  const [isRegeneratingLkpd, setIsRegeneratingLkpd] = useState(false);
  const [lkpdRegenNote, setLkpdRegenNote] = useState('');

  // Revision Engine & Undo/Redo stacks
  const [undoStack, setUndoStack] = useState<RpmCoreContent[]>([]);
  const [redoStack, setRedoStack] = useState<RpmCoreContent[]>([]);
  const [revTarget, setRevTarget] = useState<RevisionTargetSection>('all');
  const [revInstruction, setRevInstruction] = useState('');
  const [isRevising, setIsRevising] = useState(false);
  const [lastBeforeRevision, setLastBeforeRevision] = useState<RpmCoreContent | null>(null);

  const localAudit = auditRpmStructure(docData.content);
  const normalizedExistingLkpd = docData.perangkat.lkpd
    ? normalizeLkpdKit(docData.perangkat.lkpd, docData.content, docData.pakIntegration, docData.id)
    : null;
  const liveCrossValidation = validateAndReconcileCrossDocument(
    docData.content,
    normalizedExistingLkpd || normalizeLkpdKit({}, docData.content, docData.pakIntegration, docData.id),
    docData.pakIntegration,
    docData.id,
    'audit_only',
  ).validation;
  const gradeBandProfile = getGradeBandGuidance(
    docData.content.identitas.kelas,
    docData.content.identitas.fase,
  );

  const getExportableLkpd = (): LkpdKit =>
    normalizedExistingLkpd ||
    normalizeLkpdKit({}, docData.content, docData.pakIntegration, docData.id);

  const handleExportRpmPdf = () => {
    setExportingType('rpm-pdf');
    try {
      exportRpmToPdf(docData, exportConfig);
      onLogActivity('export', 'Ekspor RPM PDF Berhasil', docData.title);
      onNotify('success', 'Dokumen RPM PDF Diunduh', 'Tata letak A4 telah disesuaikan dengan pengaturan Anda.');
    } catch (err) {
      onNotify('error', 'Gagal Mengekspor RPM PDF', err instanceof Error ? err.message : 'Coba lagi.');
    } finally {
      setExportingType(null);
    }
  };

  const handleExportRpmDocx = async () => {
    setExportingType('rpm-docx');
    try {
      await exportRpmToDocx(docData, exportConfig);
      onLogActivity('export', 'Ekspor RPM DOCX Berhasil', docData.title);
      onNotify('success', 'Dokumen RPM DOCX Diunduh', 'Berkas dapat langsung dibuka dan diedit di Microsoft Word.');
    } catch (err) {
      onNotify('error', 'Gagal Mengekspor RPM DOCX', err instanceof Error ? err.message : 'Coba lagi.');
    } finally {
      setExportingType(null);
    }
  };

  const handleExportLkpdPdf = () => {
    setExportingType('lkpd-pdf');
    try {
      const lkpdTarget = getExportableLkpd();
      exportLkpdToPdf(docData, lkpdTarget, exportConfig);
      onLogActivity('export', 'Ekspor LKPD PDF Berhasil', lkpdTarget.judul);
      onNotify('success', 'Dokumen LKPD PDF Diunduh', 'LKPD siap dicetak dalam ukuran A4.');
    } catch (err) {
      onNotify('error', 'Gagal Mengekspor LKPD PDF', err instanceof Error ? err.message : 'Coba lagi.');
    } finally {
      setExportingType(null);
    }
  };

  const handleExportLkpdDocx = async () => {
    setExportingType('lkpd-docx');
    try {
      const lkpdTarget = getExportableLkpd();
      await exportLkpdToDocx(docData, lkpdTarget, exportConfig);
      onLogActivity('export', 'Ekspor LKPD DOCX Berhasil', lkpdTarget.judul);
      onNotify('success', 'Dokumen LKPD DOCX Diunduh', 'Berkas LKPD dapat langsung diedit di Microsoft Word.');
    } catch (err) {
      onNotify('error', 'Gagal Mengekspor LKPD DOCX', err instanceof Error ? err.message : 'Coba lagi.');
    } finally {
      setExportingType(null);
    }
  };

  const handleExportPaketPdf = () => {
    setExportingType('paket-pdf');
    try {
      const lkpdTarget = getExportableLkpd();
      exportPaketRpmLkpdToPdf(docData, lkpdTarget, exportConfig);
      onLogActivity('export', 'Ekspor Paket RPM + LKPD PDF Berhasil', docData.title);
      onNotify('success', 'Paket RPM + LKPD PDF Diunduh', 'RPM dan LKPD tergabung rapi dengan pemisah halaman A4.');
    } catch (err) {
      onNotify('error', 'Gagal Mengekspor Paket PDF', err instanceof Error ? err.message : 'Coba lagi.');
    } finally {
      setExportingType(null);
    }
  };

  const handleExportPaketDocx = async () => {
    setExportingType('paket-docx');
    try {
      const lkpdTarget = getExportableLkpd();
      await exportPaketRpmLkpdToDocx(docData, lkpdTarget, exportConfig);
      onLogActivity('export', 'Ekspor Paket RPM + LKPD DOCX Berhasil', docData.title);
      onNotify('success', 'Paket RPM + LKPD DOCX Diunduh', 'Dokumen gabungan RPM dan LKPD siap diedit di Microsoft Word.');
    } catch (err) {
      onNotify('error', 'Gagal Mengekspor Paket DOCX', err instanceof Error ? err.message : 'Coba lagi.');
    } finally {
      setExportingType(null);
    }
  };

  const handleExportJson = () => {
    const payload = buildSingleRpmExportPayload(docData);
    const safeSlug = docData.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 48);
    const fileName = `${safeSlug || docData.id}.rpm.json`;
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    onLogActivity('export', 'Ekspor JSON Dokumen Berhasil', docData.title);
    onNotify('success', 'Dokumen JSON Diunduh', 'Dokumen satuan dapat diimpor ulang di perangkat lain.');
  };

  const handleToggleStatus = () => {
    const nextStatus = docData.status === 'final' ? 'draft' : 'final';
    onUpdateDocument({
      ...docData,
      status: nextStatus,
      updatedAt: new Date().toISOString(),
    });
    onNotify(
      'success',
      nextStatus === 'final' ? 'Dokumen Ditandai Final' : 'Dokumen Dikembalikan ke Draft',
    );
  };

  const generateKit = async (
    kitKey: keyof PerangkatPembelajaran,
    label: string,
    fn: () => Promise<Partial<PerangkatPembelajaran>>,
  ) => {
    setBusyKit(kitKey);
    try {
      const patch = await fn();
      const nextPerangkat = { ...docData.perangkat, ...patch };
      onUpdateDocument({
        ...docData,
        perangkat: nextPerangkat,
        updatedAt: new Date().toISOString(),
      });
      onLogActivity('update', `Perangkat ${label} Dihasilkan`, docData.title);
      onNotify('success', `${label} Berhasil Dibuat`, 'Telah tertaut langsung pada dokumen RPM ini.');
    } catch (err) {
      onNotify('error', `Gagal Membuat ${label}`, err instanceof Error ? err.message : 'Silakan coba lagi.');
    } finally {
      setBusyKit(null);
    }
  };

  const handleRunQualityControl = async () => {
    setIsCheckingQc(true);
    try {
      const hasPerangkat = {
        lkpd: Boolean(docData.perangkat.lkpd),
        bahanAjar: Boolean(docData.perangkat.bahanAjar),
        mediaPembelajaran: Boolean(docData.perangkat.mediaPembelajaran),
        asesmenDiagnostikDetail: Boolean(docData.perangkat.asesmenDiagnostikDetail),
        soalEvaluasi: Boolean(docData.perangkat.soalEvaluasi),
        rubrikPenilaian: Boolean(docData.perangkat.rubrikPenilaian),
        lembarObservasi: Boolean(docData.perangkat.lembarObservasi),
        refleksiDetail: Boolean(docData.perangkat.refleksiDetail),
      };
      const report: QualityControlReport = await apiValidateRpm(docData.content, hasPerangkat, uid);
      onUpdateDocument({
        ...docData,
        qualityReport: report,
        updatedAt: new Date().toISOString(),
      });
      onLogActivity('qc', `Quality Control: ${report.predikat}`, docData.title);
      onNotify('success', `Hasil Evaluasi: ${report.predikat}`, 'Tinjau catatan perbaikan di tab Quality Control.');
    } catch (err) {
      onNotify('error', 'Quality Control Gagal', err instanceof Error ? err.message : 'Coba lagi nanti.');
    } finally {
      setIsCheckingQc(false);
    }
  };

  const handleRegenerateLkpd = async (note?: string) => {
    setIsRegeneratingLkpd(true);
    try {
      const res = await apiGenerateLkpd(docData.content, uid, {
        pakIntegration: docData.pakIntegration,
        regenerationNote: (note ?? lkpdRegenNote).trim() || undefined,
        lessonPlanId: docData.id,
      });
      const reconciled = validateAndReconcileCrossDocument(
        docData.content,
        res.lkpd,
        docData.pakIntegration,
        docData.id,
        'reconcile_lkpd_to_rpm',
      );
      onUpdateDocument({
        ...docData,
        perangkat: { ...docData.perangkat, lkpd: reconciled.lkpd },
        crossValidation: res.crossValidation || reconciled.validation,
        updatedAt: new Date().toISOString(),
      });
      setIsEditingLkpd(false);
      onLogActivity('lkpd', 'LKPD Dihasilkan / Diperbarui AI', reconciled.lkpd.judul);
      onNotify('success', 'LKPD Siap Digunakan', '12 komponen LKPD telah diselaraskan dengan RPM & PAK.');
    } catch (err) {
      onNotify('error', 'Gagal Menghasilkan LKPD', err instanceof Error ? err.message : 'Silakan coba lagi.');
    } finally {
      setIsRegeneratingLkpd(false);
    }
  };

  const handleSaveManualLkpd = (editedLkpd: LkpdKit) => {
    const reconciled = validateAndReconcileCrossDocument(
      docData.content,
      editedLkpd,
      docData.pakIntegration,
      docData.id,
      'reconcile_lkpd_to_rpm',
    );
    onUpdateDocument({
      ...docData,
      perangkat: { ...docData.perangkat, lkpd: reconciled.lkpd },
      crossValidation: reconciled.validation,
      updatedAt: new Date().toISOString(),
    });
    setIsEditingLkpd(false);
    onLogActivity('lkpd', 'LKPD Disunting Mandiri', reconciled.lkpd.judul);
    onNotify(
      'success',
      'Perubahan LKPD Disimpan',
      'Perubahan LKPD tersimpan ke IndexedDB tanpa mengubah isi RPM induk.',
    );
  };

  const applyNewContentWithHistory = (
    nextContent: RpmCoreContent,
    sectionLabel: string,
    summary: string,
    nextPerangkat?: PerangkatPembelajaran,
    nextCrossValidation?: CrossDocumentValidationResult,
  ) => {
    setUndoStack((prev) => [...prev, docData.content]);
    setRedoStack([]);
    setLastBeforeRevision(docData.content);
    const nextVersion = docData.version + 1;
    const now = new Date().toISOString();
    const resolvedPerangkat = nextPerangkat || docData.perangkat;
    onUpdateDocument({
      ...docData,
      version: nextVersion,
      content: nextContent,
      perangkat: resolvedPerangkat,
      crossValidation: nextCrossValidation ?? docData.crossValidation,
      revisionHistory: [
        {
          version: nextVersion,
          timestamp: now,
          section: sectionLabel,
          summary,
          content: nextContent,
          perangkat: resolvedPerangkat,
        },
        ...docData.revisionHistory,
      ].slice(0, 20),
      updatedAt: now,
    });
  };

  const handleRunRevision = async (customInstruction?: string) => {
    const instr = (customInstruction ?? revInstruction).trim();
    if (!instr) {
      onNotify('warning', 'Instruksi Kosong', 'Tuliskan arahan revisi yang Anda inginkan.');
      return;
    }
    setIsRevising(true);
    try {
      const result = await apiReviseRpm(docData.content, revTarget, instr, uid, {
        pakIntegration: docData.pakIntegration,
        lkpd: docData.perangkat.lkpd,
        lessonPlanId: docData.id,
      });
      const nextPerangkat = result.lkpd
        ? { ...docData.perangkat, lkpd: result.lkpd }
        : docData.perangkat;
      applyNewContentWithHistory(
        result.rpm,
        revTarget,
        instr,
        nextPerangkat,
        result.crossValidation,
      );
      setRevInstruction('');
      onLogActivity('update', `Revisi AI (${revTarget})`, instr);
      onNotify('success', 'Revisi AI Diterapkan', 'Perbandingan sebelum dan sesudah tersedia di bawah.');
    } catch (err) {
      onNotify('error', 'Revisi AI Gagal', err instanceof Error ? err.message : 'Silakan coba lagi.');
    } finally {
      setIsRevising(false);
    }
  };

  const handleUndo = () => {
    if (undoStack.length === 0) return;
    const prev = undoStack[undoStack.length - 1];
    setUndoStack((s) => s.slice(0, -1));
    setRedoStack((r) => [...r, docData.content]);
    onUpdateDocument({ ...docData, content: prev, updatedAt: new Date().toISOString() });
    onNotify('info', 'Undo Berhasil', 'Dokumen dikembalikan ke kondisi sebelumnya.');
  };

  const handleRedo = () => {
    if (redoStack.length === 0) return;
    const next = redoStack[redoStack.length - 1];
    setRedoStack((r) => r.slice(0, -1));
    setUndoStack((s) => [...s, docData.content]);
    onUpdateDocument({ ...docData, content: next, updatedAt: new Date().toISOString() });
    onNotify('info', 'Redo Berhasil', 'Perubahan diterapkan kembali.');
  };

  const handleSaveManualSnapshot = () => {
    const nextVersion = docData.version + 1;
    const now = new Date().toISOString();
    onUpdateDocument({
      ...docData,
      version: nextVersion,
      revisionHistory: [
        {
          version: nextVersion,
          timestamp: now,
          section: 'Simpan Versi Manual',
          summary: `Versi ${nextVersion} disimpan oleh guru`,
          content: docData.content,
        },
        ...docData.revisionHistory,
      ].slice(0, 20),
      updatedAt: now,
    });
    onNotify('success', `Versi ${nextVersion} Disimpan`, 'Snapshot tersimpan di riwayat versi.');
  };

  const diffList = lastBeforeRevision ? computeRpmDiff(lastBeforeRevision, docData.content) : [];

  return (
    <div className="space-y-5">
      {/* Workspace Header & Action Bar */}
      <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 no-print">
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-lg lg:text-xl font-bold text-slate-900 dark:text-slate-100 truncate">
              {docData.title}
            </h1>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
              {docData.subject} · {docData.grade} (Fase {docData.phase}) · Status:{' '}
              <strong className={docData.status === 'final' ? 'text-emerald-700 dark:text-emerald-400' : 'text-amber-700 dark:text-amber-400'}>
                {docData.status === 'final' ? 'Final' : 'Draft'}
              </strong>{' '}
              · Versi <span className="tabular-nums">{docData.version}</span>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleToggleStatus}
              className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 whitespace-nowrap shrink-0"
            >
              {docData.status === 'final' ? 'Ubah ke Draft' : 'Tandai Final'}
            </button>
            <button
              type="button"
              onClick={() => onOpenManualEdit(docData)}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 whitespace-nowrap shrink-0"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Edit Manual RPM</span>
            </button>
            <button
              type="button"
              onClick={() => onSaveAsTemplate(docData)}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 whitespace-nowrap shrink-0"
            >
              <FolderPlus className="w-3.5 h-3.5" />
              <span>Simpan Template</span>
            </button>
            <button
              type="button"
              onClick={handleExportJson}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 whitespace-nowrap shrink-0"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Unduh JSON</span>
            </button>
          </div>
        </div>

        {/* Dedicated 6-Mode Export Bar + Cross-Document Sync Status */}
        <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-800 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="font-semibold text-slate-600 dark:text-slate-400">Ekspor A4:</span>
            <button
              type="button"
              disabled={exportingType !== null}
              onClick={handleExportRpmPdf}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-300 font-semibold hover:bg-red-100 dark:hover:bg-red-950/60 whitespace-nowrap shrink-0 disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{exportingType === 'rpm-pdf' ? 'Menyiapkan...' : 'RPM PDF'}</span>
            </button>
            <button
              type="button"
              disabled={exportingType !== null}
              onClick={handleExportRpmDocx}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-emerald-200 dark:border-emerald-900 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-300 font-semibold hover:bg-emerald-100 dark:hover:bg-emerald-950/60 whitespace-nowrap shrink-0 disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{exportingType === 'rpm-docx' ? 'Menyiapkan...' : 'RPM DOCX'}</span>
            </button>
            <button
              type="button"
              disabled={exportingType !== null}
              onClick={handleExportLkpdPdf}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-300 font-semibold hover:bg-red-100 dark:hover:bg-red-950/60 whitespace-nowrap shrink-0 disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{exportingType === 'lkpd-pdf' ? 'Menyiapkan...' : 'LKPD PDF'}</span>
            </button>
            <button
              type="button"
              disabled={exportingType !== null}
              onClick={handleExportLkpdDocx}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-emerald-200 dark:border-emerald-900 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-300 font-semibold hover:bg-emerald-100 dark:hover:bg-emerald-950/60 whitespace-nowrap shrink-0 disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{exportingType === 'lkpd-docx' ? 'Menyiapkan...' : 'LKPD DOCX'}</span>
            </button>
            <button
              type="button"
              disabled={exportingType !== null}
              onClick={handleExportPaketPdf}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white font-semibold whitespace-nowrap shrink-0 disabled:opacity-50"
            >
              <Package className="w-3.5 h-3.5" />
              <span>{exportingType === 'paket-pdf' ? 'Menyiapkan...' : 'Paket RPM + LKPD PDF'}</span>
            </button>
            <button
              type="button"
              disabled={exportingType !== null}
              onClick={handleExportPaketDocx}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-semibold whitespace-nowrap shrink-0 disabled:opacity-50"
            >
              <Package className="w-3.5 h-3.5" />
              <span>{exportingType === 'paket-docx' ? 'Menyiapkan...' : 'Paket RPM + LKPD DOCX'}</span>
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600 dark:text-slate-400">
            <span>
              PAK:{' '}
              <strong
                className={
                  docData.pakIntegration?.applied &&
                  !docData.pakIntegration?.ignored &&
                  docData.pakIntegration?.relevanceStatus !== 'tidak_relevan_langsung'
                    ? 'text-emerald-700 dark:text-emerald-400'
                    : 'text-slate-700 dark:text-slate-300'
                }
              >
                {docData.pakIntegration?.applied && !docData.pakIntegration?.ignored
                  ? docData.pakIntegration.relevanceStatus === 'tidak_relevan_langsung'
                    ? 'Tidak Relevan Langsung'
                    : `Terintegrasi (${docData.pakIntegration.elements.map((e) => e.kode).join(', ')})`
                  : docData.pakIntegration?.ignored
                    ? 'Diabaikan Guru'
                    : 'Belum Ditetapkan'}
              </strong>
            </span>
            <span>·</span>
            <span>
              LKPD:{' '}
              <strong
                className={
                  normalizedExistingLkpd
                    ? 'text-emerald-700 dark:text-emerald-400'
                    : 'text-amber-700 dark:text-amber-400'
                }
              >
                {normalizedExistingLkpd ? 'Tersedia (12 Bagian)' : 'Belum Dibuat'}
              </strong>
            </span>
            <span>·</span>
            <button
              type="button"
              onClick={() => setActiveTab('qc')}
              className="font-semibold underline hover:text-emerald-700 dark:hover:text-emerald-400"
            >
              Validasi Antardokumen:{' '}
              {liveCrossValidation.valid ? 'Konsisten' : 'Perlu Perhatian'}
            </button>
          </div>
        </div>

        {/* Workspace Navigation Tabs */}
        <div
          role="tablist"
          aria-label="Bagian Ruang Kerja Dokumen"
          className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center gap-1.5"
        >
          {[
            { id: 'preview', label: 'TAB 1: DOKUMEN RPM', icon: <FileText className="w-4 h-4" /> },
            { id: 'lkpd', label: 'TAB 2: LKPD', icon: <Edit3 className="w-4 h-4" /> },
            { id: 'perangkat', label: 'Perangkat Pembelajaran', icon: <Layers className="w-4 h-4" /> },
            { id: 'pak', label: 'AI Integrasi PAK', icon: <ShieldCheck className="w-4 h-4" /> },
            { id: 'qc', label: 'Quality Control Pedagogis', icon: <ClipboardCheck className="w-4 h-4" /> },
            { id: 'revisi', label: 'Revisi AI & Versi', icon: <Wand2 className="w-4 h-4" /> },
          ].map((tab) => {
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                role="tab"
                type="button"
                aria-selected={active}
                onClick={() => setActiveTab(tab.id as WorkspaceTab)}
                className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                  active
                    ? 'bg-emerald-700 text-white'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* TAB 1: LIVE PREVIEW & PAGE SETTINGS */}
      {activeTab === 'preview' && (
        <div className="space-y-4">
          <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-wrap items-center justify-between gap-4 no-print">
            <div className="flex flex-wrap items-center gap-4 text-xs">
              <label className="flex items-center gap-2">
                <span className="font-medium text-slate-600 dark:text-slate-400">Orientasi:</span>
                <select
                  value={exportConfig.orientation}
                  onChange={(e) =>
                    onUpdateExportConfig({
                      ...exportConfig,
                      orientation: e.target.value as 'portrait' | 'landscape',
                    })
                  }
                  className="px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                >
                  <option value="portrait">Portrait (A4)</option>
                  <option value="landscape">Landscape (A4)</option>
                </select>
              </label>

              <label className="flex items-center gap-2">
                <span className="font-medium text-slate-600 dark:text-slate-400">Ukuran Font:</span>
                <select
                  value={exportConfig.fontSize}
                  onChange={(e) =>
                    onUpdateExportConfig({
                      ...exportConfig,
                      fontSize: Number(e.target.value) as 10 | 11 | 12,
                    })
                  }
                  className="px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                >
                  <option value={10}>10 pt</option>
                  <option value={11}>11 pt</option>
                  <option value={12}>12 pt</option>
                </select>
              </label>

              <label className="flex items-center gap-2">
                <span className="font-medium text-slate-600 dark:text-slate-400">Margin:</span>
                <select
                  value={exportConfig.marginMm}
                  onChange={(e) =>
                    onUpdateExportConfig({
                      ...exportConfig,
                      marginMm: Number(e.target.value) as 15 | 20 | 25,
                    })
                  }
                  className="px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                >
                  <option value={15}>15 mm</option>
                  <option value={20}>20 mm</option>
                  <option value={25}>25 mm</option>
                </select>
              </label>

              <label className="inline-flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={exportConfig.showPengesahan}
                  onChange={(e) =>
                    onUpdateExportConfig({ ...exportConfig, showPengesahan: e.target.checked })
                  }
                  className="accent-emerald-700"
                />
                <span>Pengesahan</span>
              </label>
            </div>

            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 whitespace-nowrap shrink-0"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Cetak A4</span>
            </button>
          </div>

          <RpmA4Preview docData={docData} config={exportConfig} />
        </div>
      )}

      {/* TAB 2: LEMBAR KERJA PESERTA DIDIK (LKPD) */}
      {activeTab === 'lkpd' && (
        <div className="space-y-4">
          <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-3 no-print">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                  Lembar Kerja Peserta Didik (LKPD) Terintegrasi RPM &amp; PAK
                </h2>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                  Penyesuaian Jenjang: <strong>{gradeBandProfile.band}</strong> ·{' '}
                  {gradeBandProfile.instructionRule}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2 shrink-0">
                {normalizedExistingLkpd && (
                  <>
                    <button
                      type="button"
                      onClick={() => setIsEditingLkpd(false)}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap ${
                        !isEditingLkpd
                          ? 'bg-emerald-700 text-white'
                          : 'border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`}
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Pratinjau LKPD</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsEditingLkpd(true)}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap ${
                        isEditingLkpd
                          ? 'bg-emerald-700 text-white'
                          : 'border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`}
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>Edit LKPD</span>
                    </button>
                    <button
                      type="button"
                      disabled={exportingType !== null}
                      onClick={handleExportLkpdPdf}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-semibold whitespace-nowrap disabled:opacity-50"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Ekspor LKPD PDF</span>
                    </button>
                    <button
                      type="button"
                      disabled={exportingType !== null}
                      onClick={handleExportLkpdDocx}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold whitespace-nowrap disabled:opacity-50"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Ekspor LKPD DOCX</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => window.print()}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 whitespace-nowrap"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      <span>Cetak</span>
                    </button>
                  </>
                )}
              </div>
            </div>

            <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                aria-label="Catatan regenerasi LKPD"
                value={lkpdRegenNote}
                onChange={(e) => setLkpdRegenNote(e.target.value)}
                placeholder="Catatan regenerasi LKPD (opsional), misal: tambahkan studi kasus jujur saat berbelanja di kantin..."
                className="flex-1 px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs"
              />
              <button
                type="button"
                disabled={isRegeneratingLkpd}
                onClick={() => void handleRegenerateLkpd()}
                className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold whitespace-nowrap shrink-0 disabled:opacity-50"
              >
                {isRegeneratingLkpd ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Menyusun LKPD...</span>
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>{normalizedExistingLkpd ? 'Regenerasi LKPD' : 'Hasilkan LKPD AI'}</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {!normalizedExistingLkpd ? (
            <div className="p-8 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-center space-y-3">
              <p className="text-sm font-bold text-slate-900 dark:text-slate-100">
                LKPD Belum Dibuat untuk Dokumen Ini
              </p>
              <p className="text-xs text-slate-600 dark:text-slate-400 max-w-xl mx-auto">
                Klik tombol di bawah untuk menghasilkan 12 komponen LKPD lengkap yang diturunkan langsung
                dari Tujuan Pembelajaran, Aktivitas Inti, dan integrasi PAK pada dokumen RPM ini.
              </p>
              <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
                <button
                  type="button"
                  disabled={isRegeneratingLkpd}
                  onClick={() => void handleRegenerateLkpd()}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold disabled:opacity-50"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Hasilkan LKPD Otomatis (AI)</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const draft = normalizeLkpdKit(
                      {},
                      docData.content,
                      docData.pakIntegration,
                      docData.id,
                    );
                    handleSaveManualLkpd(draft);
                    setIsEditingLkpd(true);
                  }}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <Edit3 className="w-4 h-4" />
                  <span>Buat Draf &amp; Edit Manual</span>
                </button>
              </div>
            </div>
          ) : isEditingLkpd ? (
            <LkpdEditorPanel
              initialLkpd={normalizedExistingLkpd}
              onSave={handleSaveManualLkpd}
              onCancel={() => setIsEditingLkpd(false)}
            />
          ) : (
            <LkpdA4Preview
              docData={docData}
              lkpd={normalizedExistingLkpd}
              config={exportConfig}
            />
          )}
        </div>
      )}

      {/* TAB 3: GENERATOR PERANGKAT PEMBELAJARAN (8 KITS) */}
      {activeTab === 'perangkat' && (
        <div className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              {
                key: 'lkpd' as const,
                title: 'A. Generator LKPD',
                desc: '12 komponen LKPD selaras TP, aktivitas inti & integrasi PAK. Kelola lengkap di TAB 2: LKPD.',
                ready: Boolean(docData.perangkat.lkpd),
                action: () =>
                  generateKit('lkpd', 'LKPD', async () => {
                    const res = await apiGenerateLkpd(docData.content, uid, {
                      pakIntegration: docData.pakIntegration,
                      lessonPlanId: docData.id,
                    });
                    return { lkpd: res.lkpd };
                  }),
              },
              {
                key: 'bahanAjar' as const,
                title: 'B. Bahan Ajar',
                desc: 'Ringkasan konsep, uraian materi anak SD, contoh kontekstual, glosarium.',
                ready: Boolean(docData.perangkat.bahanAjar),
                action: () =>
                  generateKit('bahanAjar', 'Bahan Ajar', async () => ({
                    bahanAjar: await apiGenerateMaterial(docData.content, uid),
                  })),
              },
              {
                key: 'mediaPembelajaran' as const,
                title: 'C. Media Pembelajaran',
                desc: 'Alat bahan terjangkau, langkah pembuatan, panduan kelas, alternatif digital.',
                ready: Boolean(docData.perangkat.mediaPembelajaran),
                action: () =>
                  generateKit('mediaPembelajaran', 'Media Pembelajaran', async () => ({
                    mediaPembelajaran: await apiGenerateMedia(docData.content, uid),
                  })),
              },
              {
                key: 'asesmenDiagnostikDetail' as const,
                title: 'D. Asesmen Diagnostik',
                desc: 'Pertanyaan pemantik awal dan pemetaan kesiapan belajar siswa.',
                ready: Boolean(docData.perangkat.asesmenDiagnostikDetail),
                action: () =>
                  generateKit('asesmenDiagnostikDetail', 'Asesmen Diagnostik', async () => ({
                    asesmenDiagnostikDetail: await apiGenerateDiagnostikDetail(docData.content, uid),
                  })),
              },
              {
                key: 'soalEvaluasi' as const,
                title: 'E. Soal Formatif & Sumatif',
                desc: 'Kisi-kisi, 5 soal formatif, 5 soal sumatif, kunci jawaban & penskoran.',
                ready: Boolean(docData.perangkat.soalEvaluasi),
                action: () =>
                  generateKit('soalEvaluasi', 'Soal Evaluasi', async () => ({
                    soalEvaluasi: await apiGenerateSoalEvaluasi(docData.content, uid),
                  })),
              },
              {
                key: 'rubrikPenilaian' as const,
                title: 'F. Rubrik Penilaian',
                desc: 'Rubrik analitik 4 tingkat capaian selaras TP & Profil Lulusan.',
                ready: Boolean(docData.perangkat.rubrikPenilaian),
                action: () =>
                  generateKit('rubrikPenilaian', 'Rubrik Penilaian', async () => ({
                    rubrikPenilaian: await apiGenerateRubric(docData.content, uid),
                  })),
              },
              {
                key: 'lembarObservasi' as const,
                title: 'G. Lembar Observasi',
                desc: 'Indikator pengamatan sikap, kolaborasi & catatan anekdot kelas.',
                ready: Boolean(docData.perangkat.lembarObservasi),
                action: () =>
                  generateKit('lembarObservasi', 'Lembar Observasi', async () => ({
                    lembarObservasi: await apiGenerateObservasi(docData.content, uid),
                  })),
              },
              {
                key: 'refleksiDetail' as const,
                title: 'H. Refleksi Terstruktur',
                desc: 'Pertanyaan refleksi mendalam guru, peserta didik & tindak lanjut.',
                ready: Boolean(docData.perangkat.refleksiDetail),
                action: () =>
                  generateKit('refleksiDetail', 'Refleksi Terstruktur', async () => ({
                    refleksiDetail: await apiGenerateRefleksiDetail(docData.content, uid),
                  })),
              },
            ].map((item) => (
              <div
                key={item.key}
                className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col justify-between gap-3"
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                      {item.title}
                    </h3>
                    {item.ready && (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" aria-label="Tersedia" />
                    )}
                  </div>
                  <p className="mt-1.5 text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                    {item.desc}
                  </p>
                </div>

                <button
                  type="button"
                  disabled={busyKit !== null}
                  onClick={item.action}
                  className={`w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${
                    item.ready
                      ? 'border border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/40'
                      : 'bg-emerald-700 hover:bg-emerald-800 text-white'
                  } disabled:opacity-50`}
                >
                  {busyKit === item.key ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Menyusun...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>{item.ready ? 'Perbarui Perangkat' : 'Hasilkan dengan AI'}</span>
                    </>
                  )}
                </button>
              </div>
            ))}
          </div>

          {/* Rendered Kits */}
          {docData.perangkat.lkpd && (
            <section className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-2.5 text-sm">
              <h3 className="font-bold text-emerald-800 dark:text-emerald-400">
                Pratinjau LKPD — {docData.perangkat.lkpd.judul}
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                {docData.perangkat.lkpd.identitasPesertaDidik}
              </p>
              <p>
                <strong>Tujuan Kegiatan:</strong> {docData.perangkat.lkpd.tujuanKegiatan}
              </p>
              <p>
                <strong>Materi Pengantar:</strong> {docData.perangkat.lkpd.materiPengantar}
              </p>
              <div>
                <strong>Petunjuk Pengerjaan:</strong>
                <ul className="list-disc pl-5 mt-1 text-xs space-y-1">
                  {docData.perangkat.lkpd.petunjukPengerjaan.map((p, i) => (
                    <li key={i}>{p}</li>
                  ))}
                </ul>
              </div>
              <div>
                <strong>Aktivitas & Pertanyaan:</strong>
                <div className="mt-2 space-y-2">
                  {docData.perangkat.lkpd.aktivitas.map((a) => (
                    <div key={a.nomor} className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 text-xs">
                      <p className="font-semibold">
                        Aktivitas {a.nomor}: {a.judul}
                      </p>
                      <p className="mt-1">{a.instruksi}</p>
                    </div>
                  ))}
                  {docData.perangkat.lkpd.pertanyaan.map((q) => (
                    <div key={q.nomor} className="p-3 rounded-lg border border-dashed border-slate-300 dark:border-slate-700 text-xs">
                      <p className="font-semibold">
                        {q.nomor}. {q.pertanyaan}
                      </p>
                      <p className="text-slate-500 mt-1">Ruang jawaban: {q.ruangJawabanHint}</p>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          )}

          {docData.perangkat.bahanAjar && (
            <section className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-2.5 text-sm">
              <h3 className="font-bold text-emerald-800 dark:text-emerald-400">
                Pratinjau Bahan Ajar — {docData.perangkat.bahanAjar.judul}
              </h3>
              <p>{docData.perangkat.bahanAjar.ringkasanKonsep}</p>
              {docData.perangkat.bahanAjar.uraianMateri.map((u, idx) => (
                <div key={idx} className="pt-2">
                  <p className="font-semibold">{u.subjudul}</p>
                  <p className="text-xs text-slate-700 dark:text-slate-300 mt-0.5">{u.isi}</p>
                </div>
              ))}
              <p className="text-xs">
                <strong>Contoh Kontekstual:</strong> {docData.perangkat.bahanAjar.contohKontekstual}
              </p>
            </section>
          )}

          {docData.perangkat.mediaPembelajaran && (
            <section className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-2 text-sm">
              <h3 className="font-bold text-emerald-800 dark:text-emerald-400">
                Media Pembelajaran — {docData.perangkat.mediaPembelajaran.judul}
              </h3>
              <p className="text-xs">
                <strong>Jenis:</strong> {docData.perangkat.mediaPembelajaran.jenisMedia} ·{' '}
                <strong>Alat & Bahan:</strong> {docData.perangkat.mediaPembelajaran.alatBahan.join(', ')}
              </p>
              <p className="text-xs">
                <strong>Alternatif Digital:</strong> {docData.perangkat.mediaPembelajaran.alternatifDigital}
              </p>
            </section>
          )}

          {docData.perangkat.asesmenDiagnostikDetail && (
            <section className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-2 text-sm">
              <h3 className="font-bold text-emerald-800 dark:text-emerald-400">
                Asesmen Diagnostik Detail
              </h3>
              <p className="text-xs">{docData.perangkat.asesmenDiagnostikDetail.tujuanPemetaan}</p>
              <ul className="list-disc pl-5 text-xs space-y-1">
                {docData.perangkat.asesmenDiagnostikDetail.pertanyaanPemantik.map((q) => (
                  <li key={q.nomor}>
                    [{q.kategori}] {q.pertanyaan}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {docData.perangkat.soalEvaluasi && (
            <section className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-3 text-sm">
              <h3 className="font-bold text-emerald-800 dark:text-emerald-400">
                Soal Evaluasi Formatif & Sumatif
              </h3>
              <div className="space-y-2 text-xs">
                <p className="font-semibold">Soal Formatif:</p>
                {docData.perangkat.soalEvaluasi.soalFormatif.map((s) => (
                  <div key={s.nomor} className="p-2.5 rounded bg-slate-50 dark:bg-slate-800/60">
                    <p>
                      {s.nomor}. {s.pertanyaan}
                    </p>
                    <p className="text-emerald-700 dark:text-emerald-400 mt-0.5">
                      Kunci: {s.kunciJawaban}
                    </p>
                  </div>
                ))}
                <p className="font-semibold pt-2">Soal Sumatif:</p>
                {docData.perangkat.soalEvaluasi.soalSumatif.map((s) => (
                  <div key={s.nomor} className="p-2.5 rounded bg-slate-50 dark:bg-slate-800/60">
                    <p>
                      {s.nomor}. {s.pertanyaan}
                    </p>
                    {s.opsi && s.opsi.length > 0 && (
                      <p className="text-slate-600 dark:text-slate-400 mt-0.5">{s.opsi.join(' · ')}</p>
                    )}
                    <p className="text-emerald-700 dark:text-emerald-400 mt-0.5">
                      Kunci: {s.kunciJawaban} ({s.pedomanPenskoran})
                    </p>
                  </div>
                ))}
              </div>
            </section>
          )}

          {docData.perangkat.rubrikPenilaian && (
            <section className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-2 text-sm overflow-x-auto">
              <h3 className="font-bold text-emerald-800 dark:text-emerald-400">
                Rubrik Penilaian — {docData.perangkat.rubrikPenilaian.judul}
              </h3>
              <table className="w-full border-collapse border border-slate-200 dark:border-slate-700 text-xs">
                <thead>
                  <tr className="bg-slate-100 dark:bg-slate-800">
                    <th className="p-2 border border-slate-200 dark:border-slate-700 text-left">Aspek</th>
                    <th className="p-2 border border-slate-200 dark:border-slate-700 text-left">Sangat Baik</th>
                    <th className="p-2 border border-slate-200 dark:border-slate-700 text-left">Baik</th>
                    <th className="p-2 border border-slate-200 dark:border-slate-700 text-left">Cukup</th>
                    <th className="p-2 border border-slate-200 dark:border-slate-700 text-left">Perlu Bimbingan</th>
                  </tr>
                </thead>
                <tbody>
                  {docData.perangkat.rubrikPenilaian.kriteria.map((k, i) => (
                    <tr key={i}>
                      <td className="p-2 border border-slate-200 dark:border-slate-700 font-semibold">{k.aspek}</td>
                      <td className="p-2 border border-slate-200 dark:border-slate-700">{k.sangatBaik}</td>
                      <td className="p-2 border border-slate-200 dark:border-slate-700">{k.baik}</td>
                      <td className="p-2 border border-slate-200 dark:border-slate-700">{k.cukup}</td>
                      <td className="p-2 border border-slate-200 dark:border-slate-700">{k.perluBimbingan}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          )}

          {docData.perangkat.lembarObservasi && (
            <section className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-2 text-xs">
              <h3 className="text-sm font-bold text-emerald-800 dark:text-emerald-400">
                Lembar Observasi — {docData.perangkat.lembarObservasi.judul}
              </h3>
              <p>{docData.perangkat.lembarObservasi.fokusObservasi}</p>
              <ul className="list-disc pl-5 space-y-1">
                {docData.perangkat.lembarObservasi.indikator.map((ind) => (
                  <li key={ind.nomor}>
                    <strong>{ind.aspek}:</strong> {ind.indikatorPerilaku}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {docData.perangkat.refleksiDetail && (
            <section className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-2 text-xs">
              <h3 className="text-sm font-bold text-emerald-800 dark:text-emerald-400">
                Instrumen Refleksi Terstruktur
              </h3>
              <p>
                <strong>Tindak Lanjut:</strong> {docData.perangkat.refleksiDetail.rencanaTindakLanjut}
              </p>
            </section>
          )}
        </div>
      )}

      {/* TAB 2B: AI INTEGRASI PENDIDIKAN ANTIKORUPSI (PAK) */}
      {activeTab === 'pak' && (
        <PakAutoDetectPanel
          uid={uid}
          autoTrigger={false}
          context={{
            lessonPlanId: docData.id,
            mataPelajaran: docData.content.identitas.mataPelajaran,
            kelas: docData.content.identitas.kelas,
            fase: docData.content.identitas.fase,
            materi: docData.content.identitas.materi,
            capaianPembelajaran: docData.content.desain.capaianPembelajaran,
            tujuanPembelajaran: docData.content.desain.tujuanPembelajaran.join('; '),
            karakteristikPesertaDidik: docData.content.identifikasi.karakteristikPesertaDidik,
            modelPembelajaran: docData.content.desain.modelPembelajaran,
            metodePembelajaran: docData.content.desain.metodePembelajaran,
            lingkunganPembelajaran: docData.content.desain.lingkunganPembelajaran,
          }}
          value={docData.pakIntegration || null}
          onChange={(next) => {
            onUpdateDocument({
              ...docData,
              pakIntegration: next
                ? { ...next, lessonPlanId: docData.id, updatedAt: new Date().toISOString() }
                : undefined,
              updatedAt: new Date().toISOString(),
            });
          }}
          onApplyToRpm={(pak) => {
            const nextPak = {
              ...pak,
              lessonPlanId: docData.id,
              applied: true,
              ignored: false,
              updatedAt: new Date().toISOString(),
            };
            const enriched = applyPakIntegrationToRpmCore(docData.content, nextPak);
            let nextPerangkat = docData.perangkat;
            let nextCrossVal = docData.crossValidation;
            if (docData.perangkat.lkpd) {
              const reconciled = validateAndReconcileCrossDocument(
                enriched,
                docData.perangkat.lkpd,
                nextPak,
                docData.id,
                'reconcile_lkpd_to_rpm',
              );
              nextPerangkat = { ...docData.perangkat, lkpd: reconciled.lkpd };
              nextCrossVal = reconciled.validation;
            }
            onUpdateDocument({
              ...docData,
              content: enriched,
              perangkat: nextPerangkat,
              pakIntegration: nextPak,
              crossValidation: nextCrossVal,
              updatedAt: new Date().toISOString(),
            });
            onLogActivity('pak', 'Integrasi PAK Diterapkan', docData.title);
          }}
          onIgnore={(pak) => {
            const nextPak = pak
              ? {
                  ...pak,
                  lessonPlanId: docData.id,
                  applied: false,
                  ignored: true,
                  updatedAt: new Date().toISOString(),
                }
              : undefined;
            const stripped = stripPakIntegrationFromRpmCore(docData.content);
            let nextPerangkat = docData.perangkat;
            let nextCrossVal = docData.crossValidation;
            if (docData.perangkat.lkpd) {
              const reconciled = validateAndReconcileCrossDocument(
                stripped,
                docData.perangkat.lkpd,
                nextPak,
                docData.id,
                'reconcile_lkpd_to_rpm',
              );
              nextPerangkat = { ...docData.perangkat, lkpd: reconciled.lkpd };
              nextCrossVal = reconciled.validation;
            }
            onUpdateDocument({
              ...docData,
              content: stripped,
              perangkat: nextPerangkat,
              pakIntegration: nextPak,
              crossValidation: nextCrossVal,
              updatedAt: new Date().toISOString(),
            });
            onLogActivity('pak', 'Integrasi PAK Diabaikan', docData.title);
          }}
          onNotify={onNotify}
        />
      )}

      {/* TAB 5: AI PEDAGOGICAL & CROSS-DOCUMENT QUALITY CONTROL */}
      {activeTab === 'qc' && (
        <div className="space-y-5">
          {/* 4-Dimension Cross-Document Validation (RPM, PAK, LKPD, Konsistensi) */}
          <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                  Final Quality Control Antardokumen (RPM, PAK, LKPD &amp; Konsistensi)
                </h2>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                  Memverifikasi keselarasan Capaian Pembelajaran, Tujuan Pembelajaran, Elemen/Subelemen PAK,
                  serta kelengkapan 12 bagian LKPD secara otomatis.
                </p>
              </div>
              <span
                className={`px-3 py-1.5 rounded-lg border text-xs font-semibold shrink-0 ${
                  liveCrossValidation.valid
                    ? 'border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300'
                    : 'border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300'
                }`}
              >
                {liveCrossValidation.valid ? 'Seluruh Dimensi Konsisten' : 'Ada Catatan Penyelarasan'}
              </span>
            </div>

            {!normalizedExistingLkpd && (
              <div className="p-3 rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 text-xs text-amber-900 dark:text-amber-200 flex flex-wrap items-center justify-between gap-2">
                <span>
                  Dokumen LKPD belum disimpan pada RPM ini. Audit di bawah mengevaluasi draf dasar; buat LKPD resmi di TAB 2: LKPD.
                </span>
                <button
                  type="button"
                  onClick={() => setActiveTab('lkpd')}
                  className="font-semibold underline"
                >
                  Buka TAB 2: LKPD
                </button>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {(
                [
                  { dim: 'RPM', title: 'A. Kualitas RPM' },
                  { dim: 'PAK', title: 'B. Kualitas PAK' },
                  { dim: 'LKPD', title: 'C. Kualitas LKPD' },
                  { dim: 'KONSISTENSI', title: 'D. Konsistensi Antardokumen' },
                ] as const
              ).map((group) => {
                const items = liveCrossValidation.checks.filter((ch) => ch.dimensi === group.dim);
                return (
                  <div
                    key={group.dim}
                    className="p-4 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/30 space-y-2.5"
                  >
                    <h3 className="text-xs font-bold uppercase tracking-wide text-slate-700 dark:text-slate-300">
                      {group.title}
                    </h3>
                    <div className="space-y-2">
                      {items.map((item) => (
                        <div
                          key={item.kode}
                          className="p-2.5 rounded-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-semibold text-slate-900 dark:text-slate-100">
                              {item.aspek}
                            </span>
                            <span
                              className={`font-semibold shrink-0 ${
                                item.status === 'Memenuhi'
                                  ? 'text-emerald-700 dark:text-emerald-400'
                                  : item.status === 'Diperbaiki Otomatis'
                                    ? 'text-blue-700 dark:text-blue-400'
                                    : 'text-amber-700 dark:text-amber-400'
                              }`}
                            >
                              {item.status}
                            </span>
                          </div>
                          <p className="text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
                            {item.catatan}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Instant Structural Audit */}
          <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                  Pemeriksaan Mutu Pedagogis (10 Kriteria)
                </h2>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                  Total alokasi aktivitas tercatat:{' '}
                  <strong className="tabular-nums">{localAudit.totalMinutes} menit</strong> ·
                  Prinsip tercakup: {localAudit.coveredPrinciples.join(', ') || 'Belum ada'}
                </p>
              </div>
              <button
                type="button"
                disabled={isCheckingQc}
                onClick={handleRunQualityControl}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-sm font-semibold disabled:opacity-50 whitespace-nowrap shrink-0"
              >
                {isCheckingQc ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Mengevaluasi...</span>
                  </>
                ) : (
                  <>
                    <ClipboardCheck className="w-4 h-4" />
                    <span>Jalankan Quality Control AI</span>
                  </>
                )}
              </button>
            </div>

            {localAudit.warnings.length > 0 && (
              <ul className="mt-4 space-y-1.5 text-xs text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/30 p-3.5 rounded-lg border border-amber-200 dark:border-amber-800/60">
                {localAudit.warnings.map((w, idx) => (
                  <li key={idx}>• {w}</li>
                ))}
              </ul>
            )}
          </div>

          {/* AI QC Report */}
          {docData.qualityReport && (
            <div className="p-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-800">
                <div>
                  <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                    Predikat Mutu Pedagogis
                  </p>
                  <p
                    className={`text-xl font-bold mt-0.5 ${
                      docData.qualityReport.predikat === 'Sangat Baik'
                        ? 'text-emerald-700 dark:text-emerald-400'
                        : docData.qualityReport.predikat === 'Baik'
                          ? 'text-amber-700 dark:text-amber-400'
                          : 'text-red-600 dark:text-red-400'
                    }`}
                  >
                    {docData.qualityReport.predikat}
                  </p>
                </div>
                <p className="text-xs text-slate-500 tabular-nums">
                  Diperiksa: {new Date(docData.qualityReport.checkedAt).toLocaleString('id-ID')}
                </p>
              </div>

              <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                {docData.qualityReport.ringkasan}
              </p>

              <div className="p-3.5 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-xs text-amber-900 dark:text-amber-200">
                <strong>Verifikasi Regulasi & CP:</strong>{' '}
                {docData.qualityReport.peringatanVerifikasiCP}
              </div>

              <div className="overflow-x-auto">
                <table className="w-full border-collapse border border-slate-200 dark:border-slate-800 text-xs">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-800">
                      <th className="p-2.5 border border-slate-200 dark:border-slate-800 text-left">Aspek Penilaian</th>
                      <th className="p-2.5 border border-slate-200 dark:border-slate-800 text-left w-32">Status</th>
                      <th className="p-2.5 border border-slate-200 dark:border-slate-800 text-left">Catatan Evaluator</th>
                    </tr>
                  </thead>
                  <tbody>
                    {docData.qualityReport.aspekEvaluasi.map((a, idx) => (
                      <tr key={idx}>
                        <td className="p-2.5 border border-slate-200 dark:border-slate-800 font-semibold">
                          {a.aspek}
                        </td>
                        <td
                          className={`p-2.5 border border-slate-200 dark:border-slate-800 font-semibold ${
                            a.status === 'Memenuhi'
                              ? 'text-emerald-700 dark:text-emerald-400'
                              : a.status === 'Sebagian'
                                ? 'text-amber-700 dark:text-amber-400'
                                : 'text-red-600 dark:text-red-400'
                          }`}
                        >
                          {a.status}
                        </td>
                        <td className="p-2.5 border border-slate-200 dark:border-slate-800">{a.catatan}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {docData.qualityReport.rekomendasiPerbaikan.length > 0 && (
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-2">
                    Rekomendasi Perbaikan
                  </h3>
                  <ul className="space-y-1.5 text-xs text-slate-700 dark:text-slate-300">
                    {docData.qualityReport.rekomendasiPerbaikan.map((rec, i) => (
                      <li key={i} className="flex items-start justify-between gap-3 p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                        <span>• {rec}</span>
                        <button
                          type="button"
                          onClick={() => {
                            setActiveTab('revisi');
                            setRevTarget('all');
                            setRevInstruction(rec);
                          }}
                          className="text-emerald-700 dark:text-emerald-400 font-semibold hover:underline whitespace-nowrap shrink-0"
                        >
                          Terapkan di Revisi AI
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* TAB 4: AI REVISION ENGINE & VERSION HISTORY */}
      {activeTab === 'revisi' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-5">
            <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                  Revisi Terarah Berbasis AI
                </h2>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={undoStack.length === 0}
                    onClick={handleUndo}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-medium disabled:opacity-40"
                  >
                    <Undo2 className="w-3.5 h-3.5" /> Undo
                  </button>
                  <button
                    type="button"
                    disabled={redoStack.length === 0}
                    onClick={handleRedo}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-medium disabled:opacity-40"
                  >
                    <Redo2 className="w-3.5 h-3.5" /> Redo
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveManualSnapshot}
                    className="px-2.5 py-1.5 rounded-lg border border-emerald-300 dark:border-emerald-800 text-xs font-semibold text-emerald-700 dark:text-emerald-400"
                  >
                    Simpan Versi
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label htmlFor="rev-target" className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                    Bagian yang Direvisi
                  </label>
                  <select
                    id="rev-target"
                    value={revTarget}
                    onChange={(e) => setRevTarget(e.target.value as RevisionTargetSection)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
                  >
                    <option value="all">Perbaiki Seluruh RPM</option>
                    <option value="identifikasi">Perbaiki Identifikasi</option>
                    <option value="tujuan">Perbaiki Tujuan Pembelajaran</option>
                    <option value="kegiatan">Perbaiki Kegiatan Pembelajaran</option>
                    <option value="asesmen">Perbaiki Asesmen</option>
                    <option value="diferensiasi">Perbaiki Diferensiasi</option>
                    <option value="lkpd">Perbaiki Keterkaitan LKPD</option>
                    <option value="pak">Perbaiki Integrasi PAK</option>
                    <option value="bahasa">Perbaiki Bahasa Baku</option>
                    <option value="format">Perbaiki Format Dokumen</option>
                  </select>
                </div>
              </div>

              <div>
                <label htmlFor="rev-instruction" className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                  Instruksi Revisi Khusus
                </label>
                <textarea
                  id="rev-instruction"
                  rows={3}
                  value={revInstruction}
                  onChange={(e) => setRevInstruction(e.target.value)}
                  placeholder="Contoh: Buat aktivitas pada tahap Mengaplikasi lebih berbasis permainan kolaboratif tanpa gawai karena proyektor sedang diperbaiki..."
                  className="w-full px-3.5 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
                />
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3">
                <button
                  type="button"
                  disabled={isRevising}
                  onClick={() =>
                    handleRunRevision(
                      'Segarkan kembali variasi aktivitas agar lebih kreatif dan kontekstual untuk anak SD.',
                    )
                  }
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-50"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Regenerate Bagian Ini</span>
                </button>
                <button
                  type="button"
                  disabled={isRevising || !revInstruction.trim()}
                  onClick={() => handleRunRevision()}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-sm font-semibold disabled:opacity-50"
                >
                  {isRevising ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Merevisi...</span>
                    </>
                  ) : (
                    <>
                      <Wand2 className="w-4 h-4" />
                      <span>Terapkan Revisi AI</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Before vs After Comparison */}
            {diffList.length > 0 && (
              <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-3">
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  Perbandingan Sebelum & Sesudah Revisi Terakhir
                </h3>
                <div className="space-y-2 text-xs">
                  {diffList.map((d) => (
                    <div
                      key={d.section}
                      className={`p-3 rounded-lg border ${
                        d.changed
                          ? 'border-emerald-300 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/30'
                          : 'border-slate-200 dark:border-slate-800'
                      }`}
                    >
                      <div className="flex items-center justify-between font-semibold">
                        <span>{d.section}</span>
                        <span className={d.changed ? 'text-emerald-700 dark:text-emerald-400' : 'text-slate-400'}>
                          {d.changed ? 'Diperbarui' : 'Tetap'}
                        </span>
                      </div>
                      {d.changed && (
                        <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-2">
                          <div className="p-2 rounded bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                            <p className="font-semibold text-slate-500">Sebelum:</p>
                            <p className="mt-0.5">{d.beforeSummary}</p>
                          </div>
                          <div className="p-2 rounded bg-white dark:bg-slate-950 border border-emerald-200 dark:border-emerald-800">
                            <p className="font-semibold text-emerald-700 dark:text-emerald-400">Sesudah:</p>
                            <p className="mt-0.5">{d.afterSummary}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Version History */}
          <aside className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-3">
            <div className="flex items-center gap-2">
              <History className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Riwayat Versi ({docData.revisionHistory.length})
              </h3>
            </div>
            <div className="space-y-2.5 max-h-[420px] overflow-y-auto">
              {docData.revisionHistory.map((v) => (
                <div
                  key={`${v.version}-${v.timestamp}`}
                  className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 text-xs space-y-1"
                >
                  <div className="flex items-center justify-between font-semibold">
                    <span>Versi {v.version} · {v.section}</span>
                    <button
                      type="button"
                      onClick={() => {
                        setUndoStack((s) => [...s, docData.content]);
                        onUpdateDocument({
                          ...docData,
                          content: v.content,
                          perangkat: v.perangkat ?? docData.perangkat,
                          updatedAt: new Date().toISOString(),
                        });
                        onNotify('info', `Dipulihkan ke Versi ${v.version}`);
                      }}
                      className="text-emerald-700 dark:text-emerald-400 hover:underline"
                    >
                      Pulihkan
                    </button>
                  </div>
                  <p className="text-slate-600 dark:text-slate-400">{v.summary}</p>
                  <p className="text-[11px] text-slate-400 tabular-nums">
                    {new Date(v.timestamp).toLocaleString('id-ID')}
                  </p>
                </div>
              ))}
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}
