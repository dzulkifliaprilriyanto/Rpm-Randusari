import React, { useEffect, useRef, useState } from 'react';
import {
  BookOpen,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Edit3,
  ExternalLink,
  Info,
  Loader2,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  X,
} from 'lucide-react';
import type {
  PakAutoDetectInput,
  PakAutoDetectUiStatus,
  PakIntegrationRecord,
} from '../types/rpm';
import { apiAutoDetectPak } from '../services/api';
import { hasMinimumPakDetectContext, PAK_OFFICIAL_REFERENCES } from '../utils/pak';

type PakDetailTab = 'materi' | 'aktivitas' | 'asesmen' | 'validasi';

export function PakAutoDetectPanel({
  uid,
  context,
  value,
  onChange,
  onApplyToRpm,
  onIgnore,
  autoTrigger = true,
  compactHeader = false,
  onNotify,
}: {
  uid: string;
  context: PakAutoDetectInput;
  value: PakIntegrationRecord | null;
  onChange: (next: PakIntegrationRecord | null) => void;
  onApplyToRpm?: (pak: PakIntegrationRecord) => void;
  onIgnore?: (pak: PakIntegrationRecord | null) => void;
  autoTrigger?: boolean;
  compactHeader?: boolean;
  onNotify?: (type: 'success' | 'error' | 'warning' | 'info', title: string, message?: string) => void;
}) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [detailTab, setDetailTab] = useState<PakDetailTab>('materi');
  const [showDetails, setShowDetails] = useState(false);
  const [showReferences, setShowReferences] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [regenNote, setRegenNote] = useState('');

  // Editable draft fields
  const [editObjectives, setEditObjectives] = useState('');
  const [editMaterialTitle, setEditMaterialTitle] = useState('');
  const [editMaterialDesc, setEditMaterialDesc] = useState('');
  const [editActivityTitle, setEditActivityTitle] = useState('');
  const [editReflections, setEditReflections] = useState('');

  const lastAnalyzedSignatureRef = useRef<string>('');
  const contextSignature = `${context.mataPelajaran.trim()}|${context.kelas.trim()}|${context.fase}|${context.materi.trim()}`;
  const hasMinContext = hasMinimumPakDetectContext(context);

  const runAutoDetect = async (note?: string) => {
    if (!hasMinContext) {
      setErrorMsg('Lengkapi Mata Pelajaran dan Materi Pembelajaran agar AI Auto-Detect PAK dapat menganalisis.');
      return;
    }
    setErrorMsg(null);
    setIsAnalyzing(true);
    try {
      const detected = await apiAutoDetectPak(
        {
          ...context,
          regenerationNote: note || undefined,
        },
        uid,
      );
      lastAnalyzedSignatureRef.current = contextSignature;
      onChange(detected);
      setShowDetails(detected.relevanceStatus !== 'tidak_relevan_langsung');
      onNotify?.(
        'info',
        `AI Auto-Detect PAK: ${detected.relevanceLabel}`,
        detected.relevanceStatus === 'tidak_relevan_langsung'
          ? 'Materi tidak dipaksakan masuk ke PAK. Tersedia opsi penguatan karakter ringan.'
          : 'Rekomendasi elemen, materi, aktivitas, dan asesmen PAK siap ditinjau.',
      );
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : 'Gagal menjalankan analisis AI Auto-Detect PAK.';
      setErrorMsg(msg);
      onNotify?.('error', 'Analisis PAK Gagal', msg);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Automatic debounced Auto-Detect when mataPelajaran & materi become ready
  useEffect(() => {
    if (!autoTrigger || !hasMinContext) return;
    if (context.materi.trim().length < 5) return;
    if (value && (value.applied || value.ignored)) return;
    if (lastAnalyzedSignatureRef.current === contextSignature) return;

    const timer = window.setTimeout(() => {
      void runAutoDetect();
    }, 1800);

    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contextSignature, autoTrigger, hasMinContext]);

  const computeUiStatus = (): { code: PakAutoDetectUiStatus; label: string; tone: string } => {
    if (isAnalyzing) {
      return {
        code: 'sedang_menganalisis',
        label: 'Sedang menganalisis',
        tone: 'text-amber-700 dark:text-amber-400',
      };
    }
    if (!hasMinContext && !value) {
      return {
        code: 'memerlukan_informasi_tambahan',
        label: 'Memerlukan informasi tambahan',
        tone: 'text-slate-600 dark:text-slate-400',
      };
    }
    if (!value) {
      return {
        code: 'memerlukan_informasi_tambahan',
        label: 'Memerlukan informasi tambahan',
        tone: 'text-slate-600 dark:text-slate-400',
      };
    }
    if (value.relevanceStatus === 'tidak_relevan_langsung') {
      return {
        code: 'tidak_ditemukan_keterkaitan_langsung',
        label: 'Tidak ditemukan keterkaitan langsung',
        tone: 'text-slate-700 dark:text-slate-300',
      };
    }
    if (value.applied) {
      return {
        code: 'analisis_selesai',
        label: 'Analisis selesai · Diterapkan ke RPM',
        tone: 'text-emerald-700 dark:text-emerald-400',
      };
    }
    return {
      code: 'rekomendasi_tersedia',
      label: 'Rekomendasi tersedia',
      tone: 'text-emerald-700 dark:text-emerald-400',
    };
  };

  const uiStatus = computeUiStatus();

  const openEditor = () => {
    if (!value) return;
    setEditObjectives(value.learningObjectives.join('\n'));
    setEditMaterialTitle(value.materials[0]?.namaMateri || '');
    setEditMaterialDesc(value.materials[0]?.penjelasanMateri || '');
    setEditActivityTitle(value.activities[0]?.judul || '');
    setEditReflections(value.refleksiIntegritas.join('\n'));
    setIsEditing(true);
  };

  const saveEdit = () => {
    if (!value) return;
    const nextMaterials = [...value.materials];
    if (nextMaterials[0]) {
      nextMaterials[0] = {
        ...nextMaterials[0],
        namaMateri: editMaterialTitle.trim() || nextMaterials[0].namaMateri,
        penjelasanMateri: editMaterialDesc.trim() || nextMaterials[0].penjelasanMateri,
      };
    }
    const nextActivities = [...value.activities];
    if (nextActivities[0]) {
      nextActivities[0] = {
        ...nextActivities[0],
        judul: editActivityTitle.trim() || nextActivities[0].judul,
      };
    }
    const updated: PakIntegrationRecord = {
      ...value,
      learningObjectives: editObjectives
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean),
      materials: nextMaterials,
      activities: nextActivities,
      refleksiIntegritas: editReflections
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean),
      updatedAt: new Date().toISOString(),
    };
    onChange(updated);
    if (updated.applied && onApplyToRpm) {
      onApplyToRpm(updated);
    }
    setIsEditing(false);
    onNotify?.('success', 'Rekomendasi PAK Diperbarui', 'Perubahan guru telah disimpan.');
  };

  const handleApply = () => {
    if (!value) return;
    const next: PakIntegrationRecord = {
      ...value,
      applied: true,
      ignored: false,
      updatedAt: new Date().toISOString(),
    };
    onChange(next);
    onApplyToRpm?.(next);
    onNotify?.(
      'success',
      'Integrasi PAK Diterapkan ke RPM',
      'Elemen, subelemen, aktivitas, asesmen, dan refleksi PAK telah diselaraskan dengan RPM.',
    );
  };

  const handleIgnore = () => {
    if (!value) {
      onIgnore?.(null);
      return;
    }
    const next: PakIntegrationRecord = {
      ...value,
      applied: false,
      ignored: true,
      updatedAt: new Date().toISOString(),
    };
    onChange(next);
    onIgnore?.(next);
    onNotify?.('info', 'Rekomendasi PAK Diabaikan', 'RPM tetap murni tanpa integrasi PAK.');
  };

  return (
    <section
      aria-label="AI Integrasi Pendidikan Antikorupsi"
      className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden"
    >
      {/* Header + A. Status Auto-Detect */}
      <div
        className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 ${
          compactHeader ? 'px-4 py-3.5' : 'px-5 py-4'
        }`}
      >
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-700 dark:text-emerald-400 shrink-0" />
            <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100">
              AI Integrasi Pendidikan Antikorupsi (PAK)
            </h2>
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
            Status Auto-Detect:{' '}
            <strong className={uiStatus.tone}>{uiStatus.label}</strong>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setShowReferences((v) => !v)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 whitespace-nowrap shrink-0"
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Lihat Referensi</span>
          </button>

          <button
            type="button"
            disabled={isAnalyzing || !hasMinContext}
            onClick={() => void runAutoDetect(regenNote)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white text-xs font-semibold whitespace-nowrap shrink-0"
          >
            {isAnalyzing ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Menganalisis...</span>
              </>
            ) : (
              <>
                <RefreshCw className="w-3.5 h-3.5" />
                <span>{value ? 'Regenerasi' : 'Analisis Auto-Detect PAK'}</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Reference Drawer */}
      {showReferences && (
        <div className="px-5 py-4 bg-slate-50 dark:bg-slate-950/60 border-b border-slate-200 dark:border-slate-800 space-y-2.5 text-xs">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-slate-900 dark:text-slate-100">
              Basis Referensi Resmi & Pembedaan Konten AI
            </h3>
            <button
              type="button"
              onClick={() => setShowReferences(false)}
              className="text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
              aria-label="Tutup daftar referensi"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <p className="text-slate-600 dark:text-slate-400">
            Kerangka 5 Elemen & 10 Subelemen merujuk pada portal resmi KPK dan Kemendikdasmen, sedangkan
            redaksi materi, studi kasus, dan rubrik operasional pada rekomendasi merupakan hasil generasi AI untuk ditelaah guru.
          </p>
          <ul className="space-y-2">
            {PAK_OFFICIAL_REFERENCES.map((ref) => (
              <li
                key={ref.id}
                className="p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
              >
                <div className="min-w-0">
                  <p className="font-semibold text-slate-900 dark:text-slate-100">
                    {ref.lembaga} · {ref.judul} ({ref.tahun})
                  </p>
                  <p className="text-slate-500 dark:text-slate-400 mt-0.5">{ref.catatanPenggunaan}</p>
                </div>
                <a
                  href={ref.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-400 font-semibold hover:underline whitespace-nowrap shrink-0"
                >
                  <span>Buka Tautan</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Body */}
      <div className="p-5 space-y-4">
        {!hasMinContext && !value && (
          <div className="flex items-start gap-2.5 text-xs text-slate-600 dark:text-slate-400">
            <Info className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
            <p>
              Isi <strong>Mata Pelajaran</strong> dan <strong>Materi Pembelajaran</strong> terlebih dahulu.
              AI Auto-Detect akan otomatis membaca konteks pembelajaran Anda dan memetakan relevansinya
              terhadap 5 Elemen & 10 Subelemen Pendidikan Antikorupsi.
            </p>
          </div>
        )}

        {errorMsg && (
          <div
            role="alert"
            className="p-3 rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/30 text-xs text-red-700 dark:text-red-300"
          >
            {errorMsg}
          </div>
        )}

        {isAnalyzing && !value && (
          <div className="py-4 flex items-center gap-3 text-xs text-slate-600 dark:text-slate-400">
            <Loader2 className="w-4 h-4 animate-spin text-emerald-700 dark:text-emerald-400 shrink-0" />
            <span>
              Sedang menganalisis keterkaitan materi dengan 5 Elemen dan 10 Subelemen Pendidikan Antikorupsi...
            </span>
          </div>
        )}

        {value && (
          <>
            {/* B. Hasil Pemetaan */}
            <div className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/40">
                  <p className="text-slate-500 dark:text-slate-400 font-medium">Tingkat Relevansi</p>
                  <p
                    className={`mt-1 text-sm font-bold ${
                      value.relevanceStatus === 'sangat_relevan'
                        ? 'text-emerald-700 dark:text-emerald-400'
                        : value.relevanceStatus === 'relevan_penguatan'
                          ? 'text-amber-700 dark:text-amber-400'
                          : 'text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    {value.relevanceLabel}
                  </p>
                  <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                    Indikator rekomendasi internal AI
                  </p>
                </div>

                <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/40">
                  <p className="text-slate-500 dark:text-slate-400 font-medium">Elemen PAK Terpetakan</p>
                  {value.elements.length > 0 ? (
                    <ul className="mt-1 space-y-0.5 text-slate-900 dark:text-slate-100 font-semibold">
                      {value.elements.map((el) => (
                        <li key={el.id}>
                          {el.kode}: {el.nama}{' '}
                          <span className="font-normal text-slate-500 dark:text-slate-400">
                            ({el.peran})
                          </span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-1 text-slate-600 dark:text-slate-400">
                      Tidak ada elemen yang dipaksakan
                    </p>
                  )}
                </div>

                <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/40">
                  <p className="text-slate-500 dark:text-slate-400 font-medium">
                    Subelemen & Nilai Antikorupsi
                  </p>
                  {value.subElements.length > 0 ? (
                    <ul className="mt-1 space-y-0.5 text-slate-800 dark:text-slate-200">
                      {value.subElements.map((s) => (
                        <li key={s.code}>
                          <strong className="tabular-nums">{s.code}</strong> {s.nama}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-1 text-slate-600 dark:text-slate-400">-</p>
                  )}
                  {value.nilaiAntikorupsi.length > 0 && (
                    <p className="mt-1.5 text-[11px] font-semibold text-emerald-700 dark:text-emerald-400">
                      Nilai: {value.nilaiAntikorupsi.join(' · ')}
                    </p>
                  )}
                </div>
              </div>

              <div className="p-3.5 rounded-lg border border-slate-200 dark:border-slate-800 text-xs space-y-1.5">
                <p className="font-semibold text-slate-900 dark:text-slate-100">
                  Alasan Pemetaan AI:
                </p>
                <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
                  {value.relevanceReason}
                </p>
                {value.relevanceStatus === 'tidak_relevan_langsung' && value.alternatifPenguatan && (
                  <p className="pt-1 text-amber-800 dark:text-amber-300">
                    <strong>Alternatif Penguatan Karakter Opsional:</strong> {value.alternatifPenguatan}
                  </p>
                )}
                {value.materials[0] && (
                  <p className="pt-1 text-slate-800 dark:text-slate-200">
                    <strong>Rekomendasi Materi PAK:</strong> {value.materials[0].namaMateri}
                  </p>
                )}
              </div>
            </div>

            {/* C. Rekomendasi AI (Materi, Aktivitas, Tujuan, Asesmen, Validasi) */}
            {value.materials.length > 0 && (
              <div className="border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden">
                <button
                  type="button"
                  onClick={() => setShowDetails((v) => !v)}
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800/60 flex items-center justify-between text-xs font-semibold text-slate-800 dark:text-slate-200"
                >
                  <span>
                    Rincian Rekomendasi AI (Tujuan, Materi, Aktivitas, Asesmen & Validasi 10 Kriteria)
                  </span>
                  {showDetails ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>

                {showDetails && (
                  <div className="p-4 space-y-4">
                    {/* Sub-tabs */}
                    <div className="flex flex-wrap gap-1.5 border-b border-slate-200 dark:border-slate-800 pb-2.5">
                      {[
                        { id: 'materi' as const, label: 'Tujuan & Materi PAK' },
                        { id: 'aktivitas' as const, label: `Aktivitas SD (${value.activities.length})` },
                        { id: 'asesmen' as const, label: 'Asesmen & Rubrik' },
                        { id: 'validasi' as const, label: 'Validasi 10 Kriteria' },
                      ].map((t) => (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => setDetailTab(t.id)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                            detailTab === t.id
                              ? 'bg-emerald-700 text-white'
                              : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                          }`}
                        >
                          {t.label}
                        </button>
                      ))}
                    </div>

                    {detailTab === 'materi' && (
                      <div className="space-y-3 text-xs">
                        <div>
                          <p className="font-bold text-slate-900 dark:text-slate-100 mb-1">
                            Tujuan Penguatan Karakter (Melengkapi TP Utama):
                          </p>
                          <ul className="list-disc pl-5 space-y-1 text-slate-700 dark:text-slate-300">
                            {value.learningObjectives.map((obj, idx) => (
                              <li key={idx}>{obj}</li>
                            ))}
                          </ul>
                        </div>
                        {value.materials.map((m, idx) => (
                          <div
                            key={idx}
                            className="p-3.5 rounded-lg border border-slate-200 dark:border-slate-800 space-y-2"
                          >
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <p className="font-bold text-sm text-emerald-800 dark:text-emerald-400">
                                {m.namaMateri}
                              </p>
                              <span className="text-[11px] text-slate-500 dark:text-slate-400">
                                Konten pedagogis disusun AI · {m.elemen} ({m.subelemen})
                              </span>
                            </div>
                            <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
                              {m.penjelasanMateri}
                            </p>
                            <p>
                              <strong>Contoh Penerapan Sehari-hari:</strong>{' '}
                              {m.contohPenerapan.join(' · ')}
                            </p>
                            <p>
                              <strong>Aktivitas Peserta Didik:</strong> {m.aktivitasPesertaDidik}
                            </p>
                            {m.pertanyaanPemantik.length > 0 && (
                              <div>
                                <strong>Pertanyaan Pemantik:</strong>
                                <ul className="list-disc pl-5 mt-0.5 space-y-0.5">
                                  {m.pertanyaanPemantik.map((q, qi) => (
                                    <li key={qi}>{q}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                            {m.indikatorKeberhasilan.length > 0 && (
                              <p>
                                <strong>Indikator Keberhasilan:</strong>{' '}
                                {m.indikatorKeberhasilan.join('; ')}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {detailTab === 'aktivitas' && (
                      <div className="space-y-3 text-xs">
                        {value.activities.map((act, idx) => (
                          <div
                            key={idx}
                            className="p-3.5 rounded-lg border border-slate-200 dark:border-slate-800 space-y-1.5"
                          >
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <p className="font-bold text-sm text-slate-900 dark:text-slate-100">
                                {act.judul} — {act.jenisAktivitas}
                              </p>
                              <span className="font-semibold text-emerald-700 dark:text-emerald-400 tabular-nums">
                                {act.alokasiWaktuMenit} menit · {act.prinsipPembelajaranMendalam.join(', ')}
                              </span>
                            </div>
                            <p>
                              <strong>Tujuan & Pemetaan:</strong> {act.tujuan} ({act.elemenPak} · {act.subelemenPak})
                            </p>
                            <p>
                              <strong>Peran Guru:</strong> {act.peranGuru}
                            </p>
                            <p>
                              <strong>Peran Peserta Didik:</strong> {act.peranPesertaDidik}
                            </p>
                            <div>
                              <strong>Langkah Kegiatan:</strong>
                              <ol className="list-decimal pl-5 mt-0.5 space-y-0.5">
                                {act.langkahKegiatan.map((lk, li) => (
                                  <li key={li}>{lk}</li>
                                ))}
                              </ol>
                            </div>
                            <p>
                              <strong>Indikator Keberhasilan:</strong> {act.indikatorKeberhasilan}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}

                    {detailTab === 'asesmen' && (
                      <div className="space-y-3 text-xs">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 space-y-1">
                            <p className="font-bold text-slate-900 dark:text-slate-100">
                              A. Asesmen Pengetahuan
                            </p>
                            <p className="text-slate-600 dark:text-slate-400">
                              Instrumen: {value.assessments.pengetahuan.bentukInstrumen}
                            </p>
                            <ul className="list-disc pl-4 space-y-0.5">
                              {value.assessments.pengetahuan.indikator.map((ind, i) => (
                                <li key={i}>{ind}</li>
                              ))}
                            </ul>
                          </div>
                          <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 space-y-1">
                            <p className="font-bold text-slate-900 dark:text-slate-100">
                              B. Asesmen Sikap & Perilaku
                            </p>
                            <p className="text-slate-600 dark:text-slate-400">
                              Nilai: {value.assessments.sikapPerilaku.nilaiDiamati.join(', ')}
                            </p>
                            <ul className="list-disc pl-4 space-y-0.5">
                              {value.assessments.sikapPerilaku.indikator.map((ind, i) => (
                                <li key={i}>{ind}</li>
                              ))}
                            </ul>
                          </div>
                          <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 space-y-1">
                            <p className="font-bold text-slate-900 dark:text-slate-100">
                              C. Asesmen Praktik
                            </p>
                            <p className="text-slate-600 dark:text-slate-400">
                              {value.assessments.praktik.kriteriaPengamatan}
                            </p>
                            <ul className="list-disc pl-4 space-y-0.5">
                              {value.assessments.praktik.indikator.map((ind, i) => (
                                <li key={i}>{ind}</li>
                              ))}
                            </ul>
                          </div>
                        </div>

                        <div className="overflow-x-auto">
                          <table className="w-full border-collapse border border-slate-200 dark:border-slate-800 text-xs">
                            <thead>
                              <tr className="bg-slate-50 dark:bg-slate-800">
                                <th className="p-2 border border-slate-200 dark:border-slate-700 text-left">Aspek</th>
                                <th className="p-2 border border-slate-200 dark:border-slate-700 text-left">Sangat Berkembang</th>
                                <th className="p-2 border border-slate-200 dark:border-slate-700 text-left">Berkembang Sesuai Harapan</th>
                                <th className="p-2 border border-slate-200 dark:border-slate-700 text-left">Mulai Berkembang</th>
                                <th className="p-2 border border-slate-200 dark:border-slate-700 text-left">Memerlukan Bimbingan</th>
                              </tr>
                            </thead>
                            <tbody>
                              {value.assessments.rubrikPerkembangan.map((row, idx) => (
                                <tr key={idx}>
                                  <td className="p-2 border border-slate-200 dark:border-slate-700 font-semibold">{row.aspek}</td>
                                  <td className="p-2 border border-slate-200 dark:border-slate-700">{row.sangatBerkembang}</td>
                                  <td className="p-2 border border-slate-200 dark:border-slate-700">{row.berkembangSesuaiHarapan}</td>
                                  <td className="p-2 border border-slate-200 dark:border-slate-700">{row.mulaiBerkembang}</td>
                                  <td className="p-2 border border-slate-200 dark:border-slate-700">{row.memerlukanBimbingan}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                        <p className="text-[11px] text-slate-600 dark:text-slate-400">
                          <strong>Catatan Pembinaan:</strong> {value.assessments.catatanPembinaanNonLabeling}
                        </p>
                      </div>
                    )}

                    {detailTab === 'validasi' && (
                      <div className="space-y-1.5 text-xs">
                        {value.qualityValidation.map((qc) => (
                          <div
                            key={qc.nomor}
                            className="p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 flex items-start justify-between gap-3"
                          >
                            <div>
                              <p className="font-semibold text-slate-900 dark:text-slate-100">
                                <span className="tabular-nums">{qc.nomor}.</span> {qc.kriteria}
                              </p>
                              <p className="text-slate-600 dark:text-slate-400 mt-0.5">{qc.catatan}</p>
                            </div>
                            <span
                              className={`font-semibold whitespace-nowrap shrink-0 ${
                                qc.memenuhi
                                  ? 'text-emerald-700 dark:text-emerald-400'
                                  : 'text-amber-700 dark:text-amber-400'
                              }`}
                            >
                              {qc.memenuhi ? 'Sesuai' : 'Perlu Cek'}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Inline Edit Form */}
            {isEditing && (
              <div className="p-4 rounded-lg border border-amber-300 dark:border-amber-800 bg-amber-50/40 dark:bg-amber-950/20 space-y-3 text-xs">
                <p className="font-bold text-slate-900 dark:text-slate-100">
                  Edit Rekomendasi PAK Sebelum / Sesudah Diterapkan
                </p>
                <div>
                  <label className="block font-medium mb-1">Tujuan Penguatan Karakter (1 per baris)</label>
                  <textarea
                    rows={2}
                    value={editObjectives}
                    onChange={(e) => setEditObjectives(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-medium mb-1">Judul Materi PAK</label>
                    <input
                      type="text"
                      value={editMaterialTitle}
                      onChange={(e) => setEditMaterialTitle(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                    />
                  </div>
                  <div>
                    <label className="block font-medium mb-1">Judul Aktivitas Utama PAK</label>
                    <input
                      type="text"
                      value={editActivityTitle}
                      onChange={(e) => setEditActivityTitle(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                    />
                  </div>
                </div>
                <div>
                  <label className="block font-medium mb-1">Penjelasan Materi PAK</label>
                  <textarea
                    rows={3}
                    value={editMaterialDesc}
                    onChange={(e) => setEditMaterialDesc(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                  />
                </div>
                <div>
                  <label className="block font-medium mb-1">Refleksi Integritas Siswa (1 per baris)</label>
                  <textarea
                    rows={2}
                    value={editReflections}
                    onChange={(e) => setEditReflections(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                  />
                </div>
                <div className="flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsEditing(false)}
                    className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 font-semibold"
                  >
                    Batal
                  </button>
                  <button
                    type="button"
                    onClick={saveEdit}
                    className="px-3.5 py-1.5 rounded-lg bg-emerald-700 text-white font-semibold"
                  >
                    Simpan Perubahan
                  </button>
                </div>
              </div>
            )}

            {/* D. Tindakan */}
            <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex-1 min-w-0">
                <input
                  type="text"
                  value={regenNote}
                  onChange={(e) => setRegenNote(e.target.value)}
                  placeholder="Catatan opsional jika ingin Regenerasi (misal: fokus ke kerja sama piket atau kantin kejujuran)..."
                  aria-label="Catatan regenerasi PAK"
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs"
                />
              </div>

              <div className="flex flex-wrap items-center gap-2 shrink-0">
                {value.relevanceStatus !== 'tidak_relevan_langsung' && (
                  <button
                    type="button"
                    onClick={handleApply}
                    className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                      value.applied
                        ? 'bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-600 text-emerald-800 dark:text-emerald-300'
                        : 'bg-emerald-700 hover:bg-emerald-800 text-white'
                    }`}
                  >
                    {value.applied ? (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Diterapkan ke RPM</span>
                      </>
                    ) : (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>Terapkan ke RPM</span>
                      </>
                    )}
                  </button>
                )}

                <button
                  type="button"
                  onClick={openEditor}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 whitespace-nowrap shrink-0"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Edit Rekomendasi</span>
                </button>

                <button
                  type="button"
                  disabled={isAnalyzing}
                  onClick={() => void runAutoDetect(regenNote)}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 whitespace-nowrap shrink-0"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Regenerasi</span>
                </button>

                <button
                  type="button"
                  onClick={handleIgnore}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-red-50 dark:hover:bg-red-950/30 hover:text-red-700 dark:hover:text-red-400 whitespace-nowrap shrink-0"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>Abaikan Rekomendasi</span>
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </section>
  );
}
