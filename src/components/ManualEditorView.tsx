import React, { useEffect, useRef, useState } from 'react';
import { BookOpenCheck, Plus, Save, Trash2, Wand2 } from 'lucide-react';
import type {
  DeepLearningPrinciple,
  DimensiProfilLulusanId,
  PakIntegrationRecord,
  PhaseCode,
  RpmActivityStep,
  RpmCoreContent,
  SchoolClass,
  SemesterCode,
  TeacherProfile,
} from '../types/rpm';
import {
  applyPakIntegrationToRpmCore,
  stripPakIntegrationFromRpmCore,
} from '../utils/pak';
import {
  createDefaultRpmCore,
  derivePhaseFromGrade,
  DIMENSI_PROFIL_LULUSAN,
  extractGradeNumber,
  MATA_PELAJARAN_SD,
} from '../utils/pedagogy';
import { apiSuggestField } from '../services/api';
import { PakAutoDetectPanel } from './PakAutoDetectPanel';

export function ManualEditorView({
  profile,
  classes,
  uid,
  initialContent,
  initialPakIntegration,
  editingTitle,
  autoSaveEnabled = true,
  onAutoSave,
  onSaveDraft,
  onSaveAndPreview,
  onNotify,
}: {
  profile: TeacherProfile;
  classes: SchoolClass[];
  uid: string;
  initialContent?: RpmCoreContent;
  initialPakIntegration?: PakIntegrationRecord | null;
  editingTitle?: string;
  autoSaveEnabled?: boolean;
  onAutoSave?: (content: RpmCoreContent, title: string, pak?: PakIntegrationRecord | null) => void;
  onSaveDraft: (content: RpmCoreContent, title: string, pak?: PakIntegrationRecord | null) => void;
  onSaveAndPreview: (content: RpmCoreContent, title: string, pak?: PakIntegrationRecord | null) => void;
  onNotify: (type: 'success' | 'error' | 'warning' | 'info', title: string, message?: string) => void;
}) {
  const [content, setContent] = useState<RpmCoreContent>(
    () => initialContent || createDefaultRpmCore(profile, classes[0]),
  );
  const [pakIntegration, setPakIntegration] = useState<PakIntegrationRecord | null>(
    () => initialPakIntegration || null,
  );
  const [docTitle, setDocTitle] = useState<string>(editingTitle || '');
  const [aiBusyKey, setAiBusyKey] = useState<string | null>(null);
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    if (!autoSaveEnabled || !onAutoSave) return;
    const computedTitle =
      docTitle.trim() ||
      `RPM ${content.identitas.mataPelajaran} ${content.identitas.kelas} — ${content.identitas.materi || 'Draft Baru'}`;

    const timer = window.setTimeout(() => {
      onAutoSave(content, computedTitle, pakIntegration);
    }, 900);

    return () => window.clearTimeout(timer);
  }, [content, docTitle, pakIntegration, autoSaveEnabled, onAutoSave]);

  const toggleDimensi = (id: DimensiProfilLulusanId) => {
    const exists = content.identifikasi.dimensiProfilLulusan.some((d) => d.id === id);
    if (exists) {
      setContent((prev) => ({
        ...prev,
        identifikasi: {
          ...prev.identifikasi,
          dimensiProfilLulusan: prev.identifikasi.dimensiProfilLulusan.filter((d) => d.id !== id),
        },
      }));
    } else {
      const def = DIMENSI_PROFIL_LULUSAN.find((d) => d.id === id);
      if (!def) return;
      setContent((prev) => ({
        ...prev,
        identifikasi: {
          ...prev.identifikasi,
          dimensiProfilLulusan: [
            ...prev.identifikasi.dimensiProfilLulusan,
            { id: def.id, nama: def.nama, alasanRelevansi: def.deskripsi },
          ],
        },
      }));
    }
  };

  const askAiForSection = async (
    key: string,
    fieldName: string,
    currentVal: string,
    applyFn: (suggestion: string) => void,
  ) => {
    setAiBusyKey(key);
    try {
      const res = await apiSuggestField(
        fieldName,
        {
          mataPelajaran: content.identitas.mataPelajaran,
          kelas: content.identitas.kelas,
          fase: content.identitas.fase,
          materi: content.identitas.materi,
          capaianPembelajaran: content.desain.capaianPembelajaran,
        },
        currentVal,
        uid,
      );
      applyFn(res.suggestion);
      onNotify('success', `Saran AI untuk ${fieldName} diterapkan`, res.rationale);
    } catch (err) {
      onNotify(
        'error',
        'Gagal Meminta Saran AI',
        err instanceof Error ? err.message : 'Silakan coba lagi.',
      );
    } finally {
      setAiBusyKey(null);
    }
  };

  const updateIntiStep = (
    phaseKey: 'memahami' | 'mengaplikasi' | 'merefleksi',
    idx: number,
    patch: Partial<RpmActivityStep>,
  ) => {
    setContent((prev) => {
      const list = [...prev.pengalamanBelajar.inti[phaseKey]];
      list[idx] = { ...list[idx], ...patch };
      return {
        ...prev,
        pengalamanBelajar: {
          ...prev.pengalamanBelajar,
          inti: { ...prev.pengalamanBelajar.inti, [phaseKey]: list },
        },
      };
    });
  };

  const togglePrinciple = (
    phaseKey: 'memahami' | 'mengaplikasi' | 'merefleksi',
    idx: number,
    p: DeepLearningPrinciple,
  ) => {
    const current = content.pengalamanBelajar.inti[phaseKey][idx].prinsip;
    const next = current.includes(p)
      ? current.filter((x) => x !== p)
      : [...current, p];
    updateIntiStep(phaseKey, idx, { prinsip: next.length ? next : [p] });
  };

  const resolvedTitle =
    docTitle.trim() ||
    `RPM ${content.identitas.mataPelajaran} ${content.identitas.kelas} — ${content.identitas.materi || 'Draft Baru'}`;

  return (
    <div className="space-y-6">
      {/* Top Action Bar */}
      <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex-1 min-w-0">
          <label htmlFor="manual-doc-title" className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
            Judul Dokumen RPM
          </label>
          <input
            id="manual-doc-title"
            type="text"
            value={docTitle}
            onChange={(e) => setDocTitle(e.target.value)}
            placeholder={resolvedTitle}
            className="w-full px-3.5 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm font-semibold text-slate-900 dark:text-slate-100"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={() => onSaveDraft(content, resolvedTitle, pakIntegration)}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 text-sm font-semibold whitespace-nowrap shrink-0"
          >
            <Save className="w-4 h-4" />
            <span>Simpan Draft</span>
          </button>
          <button
            type="button"
            onClick={() => onSaveAndPreview(content, resolvedTitle, pakIntegration)}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-sm font-semibold whitespace-nowrap shrink-0"
          >
            <BookOpenCheck className="w-4 h-4" />
            <span>Simpan & Buka Pratinjau</span>
          </button>
        </div>
      </div>

      {/* Section A: Identitas */}
      <section className="p-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-4">
        <h2 className="text-base font-bold text-emerald-800 dark:text-emerald-400">
          A. Identitas Pembelajaran
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label htmlFor="man-sekolah" className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
              Satuan Pendidikan
            </label>
            <input
              id="man-sekolah"
              type="text"
              value={content.identitas.namaSatuanPendidikan}
              onChange={(e) =>
                setContent({ ...content, identitas: { ...content.identitas, namaSatuanPendidikan: e.target.value } })
              }
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
            />
          </div>
          <div>
            <label htmlFor="man-guru" className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
              Nama Guru
            </label>
            <input
              id="man-guru"
              type="text"
              value={content.identitas.namaGuru}
              onChange={(e) =>
                setContent({ ...content, identitas: { ...content.identitas, namaGuru: e.target.value } })
              }
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
            />
          </div>
          <div>
            <label htmlFor="man-mapel" className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
              Mata Pelajaran
            </label>
            <select
              id="man-mapel"
              value={content.identitas.mataPelajaran}
              onChange={(e) =>
                setContent({ ...content, identitas: { ...content.identitas, mataPelajaran: e.target.value } })
              }
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
            >
              {MATA_PELAJARAN_SD.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="man-kelas" className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
              Kelas
            </label>
            <input
              id="man-kelas"
              type="text"
              value={content.identitas.kelas}
              onChange={(e) => {
                const v = e.target.value;
                setContent({
                  ...content,
                  identitas: {
                    ...content.identitas,
                    kelas: v,
                    fase: derivePhaseFromGrade(extractGradeNumber(v)),
                  },
                });
              }}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
            />
          </div>
          <div>
            <label htmlFor="man-fase" className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
              Fase & Semester
            </label>
            <div className="grid grid-cols-2 gap-2">
              <select
                id="man-fase"
                value={content.identitas.fase}
                onChange={(e) =>
                  setContent({
                    ...content,
                    identitas: { ...content.identitas, fase: e.target.value as PhaseCode },
                  })
                }
                className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
              >
                <option value="A">Fase A</option>
                <option value="B">Fase B</option>
                <option value="C">Fase C</option>
              </select>
              <select
                aria-label="Semester"
                value={content.identitas.semester}
                onChange={(e) =>
                  setContent({
                    ...content,
                    identitas: { ...content.identitas, semester: e.target.value as SemesterCode },
                  })
                }
                className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
              >
                <option value="1">Sem 1</option>
                <option value="2">Sem 2</option>
              </select>
            </div>
          </div>
          <div>
            <label htmlFor="man-waktu" className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
              Alokasi Waktu
            </label>
            <input
              id="man-waktu"
              type="text"
              value={content.identitas.alokasiWaktu}
              onChange={(e) =>
                setContent({ ...content, identitas: { ...content.identitas, alokasiWaktu: e.target.value } })
              }
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
            />
          </div>
        </div>
        <div>
          <label htmlFor="man-materi" className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
            Materi / Topik Pembelajaran
          </label>
          <input
            id="man-materi"
            type="text"
            value={content.identitas.materi}
            onChange={(e) =>
              setContent({
                ...content,
                identitas: { ...content.identitas, materi: e.target.value },
                identifikasi: { ...content.identifikasi, materiPembelajaran: e.target.value },
                desain: { ...content.desain, topikPembelajaran: e.target.value },
              })
            }
            placeholder="Masukkan materi pokok pembelajaran..."
            className="w-full px-3.5 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
          />
        </div>
      </section>

      {/* Section B: Identifikasi & 8 Dimensi Profil Lulusan */}
      <section className="p-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-4">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-base font-bold text-emerald-800 dark:text-emerald-400">
            B. Identifikasi & Dimensi Profil Lulusan
          </h2>
          <button
            type="button"
            disabled={aiBusyKey === 'identifikasi'}
            onClick={() =>
              askAiForSection(
                'identifikasi',
                'Karakteristik Peserta Didik dan Kebutuhan Belajar',
                content.identifikasi.karakteristikPesertaDidik,
                (s) =>
                  setContent((prev) => ({
                    ...prev,
                    identifikasi: { ...prev.identifikasi, karakteristikPesertaDidik: s },
                  })),
              )
            }
            className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 dark:text-emerald-400 hover:underline"
          >
            <Wand2 className="w-3.5 h-3.5" />
            <span>{aiBusyKey === 'identifikasi' ? 'Menyusun...' : 'Rekomendasi AI'}</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="man-karak" className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
              Karakteristik Peserta Didik
            </label>
            <textarea
              id="man-karak"
              rows={2}
              value={content.identifikasi.karakteristikPesertaDidik}
              onChange={(e) =>
                setContent({
                  ...content,
                  identifikasi: { ...content.identifikasi, karakteristikPesertaDidik: e.target.value },
                })
              }
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
            />
          </div>
          <div>
            <label htmlFor="man-pengetahuan" className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
              Pengetahuan Awal & Kebutuhan Belajar
            </label>
            <textarea
              id="man-pengetahuan"
              rows={2}
              value={content.identifikasi.pengetahuanAwal}
              onChange={(e) =>
                setContent({
                  ...content,
                  identifikasi: { ...content.identifikasi, pengetahuanAwal: e.target.value },
                })
              }
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
            />
          </div>
        </div>

        <div>
          <p className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-2">
            Pilih Dimensi Profil Lulusan yang Paling Relevan (disarankan 2–4 dimensi):
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
            {DIMENSI_PROFIL_LULUSAN.map((dim) => {
              const checked = content.identifikasi.dimensiProfilLulusan.some((d) => d.id === dim.id);
              return (
                <label
                  key={dim.id}
                  className={`flex items-start gap-2 p-2.5 rounded-lg border text-xs cursor-pointer transition-colors ${
                    checked
                      ? 'border-emerald-600 bg-emerald-50/70 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200'
                      : 'border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleDimensi(dim.id)}
                    className="mt-0.5 accent-emerald-700"
                  />
                  <span className="font-medium leading-snug">{dim.nama}</span>
                </label>
              );
            })}
          </div>
        </div>
      </section>

      {/* Section C: Desain Pembelajaran */}
      <section className="p-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-4">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-base font-bold text-emerald-800 dark:text-emerald-400">
            C. Desain Pembelajaran (CP, TP, Model, Kerangka)
          </h2>
          <button
            type="button"
            disabled={aiBusyKey === 'tp'}
            onClick={() =>
              askAiForSection(
                'tp',
                'Tujuan Pembelajaran dan Kriteria Ketercapaian',
                content.desain.tujuanPembelajaran.join('\n'),
                (s) =>
                  setContent((prev) => ({
                    ...prev,
                    desain: {
                      ...prev.desain,
                      tujuanPembelajaran: s
                        .split(/\n+/)
                        .map((x) => x.replace(/^\d+[\.)]\s*/, '').trim())
                        .filter(Boolean),
                    },
                  })),
              )
            }
            className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 dark:text-emerald-400 hover:underline"
          >
            <Wand2 className="w-3.5 h-3.5" />
            <span>{aiBusyKey === 'tp' ? 'Menyusun...' : 'Rekomendasi TP dengan AI'}</span>
          </button>
        </div>

        <div>
          <label htmlFor="man-cp" className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
            Capaian Pembelajaran (CP)
          </label>
          <textarea
            id="man-cp"
            rows={2}
            value={content.desain.capaianPembelajaran}
            onChange={(e) =>
              setContent({
                ...content,
                desain: { ...content.desain, capaianPembelajaran: e.target.value, cpPerluVerifikasi: false },
              })
            }
            placeholder="Masukkan CP sesuai dokumen resmi Kurikulum Merdeka..."
            className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-medium text-slate-600 dark:text-slate-400">
              Tujuan Pembelajaran (TP)
            </span>
            <button
              type="button"
              onClick={() =>
                setContent({
                  ...content,
                  desain: {
                    ...content.desain,
                    tujuanPembelajaran: [...content.desain.tujuanPembelajaran, ''],
                  },
                })
              }
              className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 dark:text-emerald-400"
            >
              <Plus className="w-3.5 h-3.5" /> Tambah TP
            </button>
          </div>
          <div className="space-y-2">
            {content.desain.tujuanPembelajaran.map((tp, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <input
                  type="text"
                  aria-label={`Tujuan Pembelajaran ${idx + 1}`}
                  value={tp}
                  onChange={(e) => {
                    const next = [...content.desain.tujuanPembelajaran];
                    next[idx] = e.target.value;
                    setContent({ ...content, desain: { ...content.desain, tujuanPembelajaran: next } });
                  }}
                  placeholder={`Tujuan Pembelajaran ${idx + 1}`}
                  className="flex-1 px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
                />
                {content.desain.tujuanPembelajaran.length > 1 && (
                  <button
                    type="button"
                    aria-label={`Hapus TP ${idx + 1}`}
                    onClick={() => {
                      const next = content.desain.tujuanPembelajaran.filter((_, i) => i !== idx);
                      setContent({ ...content, desain: { ...content.desain, tujuanPembelajaran: next } });
                    }}
                    className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="man-model" className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
              Model Pembelajaran
            </label>
            <input
              id="man-model"
              type="text"
              value={content.desain.modelPembelajaran}
              onChange={(e) =>
                setContent({ ...content, desain: { ...content.desain, modelPembelajaran: e.target.value } })
              }
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
            />
          </div>
          <div>
            <label htmlFor="man-digital" className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
              Pemanfaatan Digital
            </label>
            <input
              id="man-digital"
              type="text"
              value={content.desain.pemanfaatanDigital}
              onChange={(e) =>
                setContent({ ...content, desain: { ...content.desain, pemanfaatanDigital: e.target.value } })
              }
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
            />
          </div>
        </div>
      </section>

      {/* Section D: Pengalaman Belajar (Memahami, Mengaplikasi, Merefleksi) */}
      <section className="p-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-5">
        <h2 className="text-base font-bold text-emerald-800 dark:text-emerald-400">
          D. Pengalaman Belajar Inti (Memahami · Mengaplikasi · Merefleksi)
        </h2>

        {(['memahami', 'mengaplikasi', 'merefleksi'] as const).map((phaseKey) => {
          const titleMap = {
            memahami: '1. Memahami',
            mengaplikasi: '2. Mengaplikasi',
            merefleksi: '3. Merefleksi',
          };
          return (
            <div key={phaseKey} className="p-4 rounded-lg border border-slate-200 dark:border-slate-800 space-y-3">
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">{titleMap[phaseKey]}</h3>
              {content.pengalamanBelajar.inti[phaseKey].map((step, idx) => (
                <div key={step.id} className="space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="md:col-span-2">
                      <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                        Nama Aktivitas
                      </label>
                      <input
                        type="text"
                        value={step.namaAktivitas}
                        onChange={(e) => updateIntiStep(phaseKey, idx, { namaAktivitas: e.target.value })}
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                        Alokasi Waktu (Menit)
                      </label>
                      <input
                        type="number"
                        min={1}
                        max={180}
                        value={step.alokasiWaktuMenit}
                        onChange={(e) =>
                          updateIntiStep(phaseKey, idx, { alokasiWaktuMenit: Number(e.target.value) || 10 })
                        }
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm tabular-nums"
                      />
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 text-xs">
                    <span className="font-medium text-slate-600 dark:text-slate-400">Prinsip Terintegrasi:</span>
                    {(['Mindful', 'Meaningful', 'Joyful'] as DeepLearningPrinciple[]).map((p) => (
                      <label key={p} className="inline-flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={step.prinsip.includes(p)}
                          onChange={() => togglePrinciple(phaseKey, idx, p)}
                          className="accent-emerald-700"
                        />
                        <span>{p}</span>
                      </label>
                    ))}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                        Aktivitas Guru
                      </label>
                      <textarea
                        rows={2}
                        value={step.aktivitasGuru}
                        onChange={(e) => updateIntiStep(phaseKey, idx, { aktivitasGuru: e.target.value })}
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                        Aktivitas Peserta Didik
                      </label>
                      <textarea
                        rows={2}
                        value={step.aktivitasPesertaDidik}
                        onChange={(e) => updateIntiStep(phaseKey, idx, { aktivitasPesertaDidik: e.target.value })}
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          );
        })}
      </section>

      {/* Section E & F: Asesmen & Diferensiasi */}
      <section className="p-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-4">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-base font-bold text-emerald-800 dark:text-emerald-400">
            E & F. Asesmen dan Diferensiasi Pembelajaran
          </h2>
          <button
            type="button"
            disabled={aiBusyKey === 'diferensiasi'}
            onClick={() =>
              askAiForSection(
                'diferensiasi',
                'Diferensiasi Proses dan Produk SD',
                content.diferensiasi.proses,
                (s) =>
                  setContent((prev) => ({
                    ...prev,
                    diferensiasi: { ...prev.diferensiasi, proses: s },
                  })),
              )
            }
            className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 dark:text-emerald-400 hover:underline"
          >
            <Wand2 className="w-3.5 h-3.5" />
            <span>{aiBusyKey === 'diferensiasi' ? 'Menyusun...' : 'Perbaiki Diferensiasi dengan AI'}</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
              Diferensiasi Konten
            </label>
            <textarea
              rows={3}
              value={content.diferensiasi.konten}
              onChange={(e) =>
                setContent({ ...content, diferensiasi: { ...content.diferensiasi, konten: e.target.value } })
              }
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
              Diferensiasi Proses
            </label>
            <textarea
              rows={3}
              value={content.diferensiasi.proses}
              onChange={(e) =>
                setContent({ ...content, diferensiasi: { ...content.diferensiasi, proses: e.target.value } })
              }
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
              Diferensiasi Produk
            </label>
            <textarea
              rows={3}
              value={content.diferensiasi.produk}
              onChange={(e) =>
                setContent({ ...content, diferensiasi: { ...content.diferensiasi, produk: e.target.value } })
              }
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
            />
          </div>
        </div>
      </section>

      {/* Section G: AI Auto-Detect Pendidikan Antikorupsi (PAK) */}
      <PakAutoDetectPanel
        uid={uid}
        autoTrigger={true}
        context={{
          mataPelajaran: content.identitas.mataPelajaran,
          kelas: content.identitas.kelas,
          fase: content.identitas.fase,
          materi: content.identitas.materi,
          capaianPembelajaran: content.desain.capaianPembelajaran,
          tujuanPembelajaran: content.desain.tujuanPembelajaran.join('; '),
          karakteristikPesertaDidik: content.identifikasi.karakteristikPesertaDidik,
          modelPembelajaran: content.desain.modelPembelajaran,
          metodePembelajaran: content.desain.metodePembelajaran,
          lingkunganPembelajaran: content.desain.lingkunganPembelajaran,
        }}
        value={pakIntegration}
        onChange={setPakIntegration}
        onApplyToRpm={(pak) => {
          setPakIntegration(pak);
          setContent((prev) => applyPakIntegrationToRpmCore(prev, pak));
        }}
        onIgnore={(pak) => {
          setPakIntegration(pak);
          setContent((prev) => stripPakIntegrationFromRpmCore(prev));
        }}
        onNotify={onNotify}
      />
    </div>
  );
}
