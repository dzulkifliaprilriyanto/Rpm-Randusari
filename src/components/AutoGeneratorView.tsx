import React, { useEffect, useState } from 'react';
import { Loader2, Sparkles, Wand2 } from 'lucide-react';
import type {
  AutoGeneratorInput,
  PakIntegrationRecord,
  PhaseCode,
  SchoolClass,
  SemesterCode,
  TeacherProfile,
} from '../types/rpm';
import {
  derivePhaseFromGrade,
  extractGradeNumber,
  MATA_PELAJARAN_SD,
  MODEL_PEMBELAJARAN_OPTIONS,
} from '../utils/pedagogy';
import { apiSuggestField } from '../services/api';
import { PakAutoDetectPanel } from './PakAutoDetectPanel';
import { InfoTooltip, SkeletonCard } from './ToastAndDialog';

export function AutoGeneratorView({
  profile,
  classes,
  uid,
  isGenerating,
  onGenerate,
  onNotify,
}: {
  profile: TeacherProfile;
  classes: SchoolClass[];
  uid: string;
  isGenerating: boolean;
  onGenerate: (input: AutoGeneratorInput) => Promise<void>;
  onNotify: (type: 'success' | 'error' | 'warning' | 'info', title: string, message?: string) => void;
}) {
  const defaultClass = classes[0];
  const [selectedClassId, setSelectedClassId] = useState<string>(defaultClass?.id || '');

  const [form, setForm] = useState<AutoGeneratorInput>({
    namaGuru: profile.namaGuru || '',
    namaSekolah: profile.namaSekolah || 'SDN Randusari',
    kelas: defaultClass?.className || 'Kelas 5',
    fase: defaultClass?.phase || 'C',
    semester: defaultClass?.semester || '1',
    tahunAjaran: defaultClass?.academicYear || '2026/2027',
    mataPelajaran: profile.mataPelajaranUtama || MATA_PELAJARAN_SD[3],
    materi: '',
    alokasiWaktu: '2 x 35 menit (1 Pertemuan)',
    capaianPembelajaran: '',
    tujuanPembelajaran: '',
    karakteristikPesertaDidik: defaultClass
      ? `Peserta didik ${defaultClass.className} berjumlah ${defaultClass.studentCount} siswa dengan beragam gaya belajar.`
      : '',
    modelPembelajaran: MODEL_PEMBELAJARAN_OPTIONS[0],
    metodePembelajaran: '',
  });

  const [suggestingField, setSuggestingField] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [pakIntegration, setPakIntegration] = useState<PakIntegrationRecord | null>(null);

  useEffect(() => {
    setForm((prev) => ({
      ...prev,
      namaGuru: prev.namaGuru || profile.namaGuru || '',
      namaSekolah: profile.namaSekolah || prev.namaSekolah,
    }));
  }, [profile]);

  const handleSelectClass = (classId: string) => {
    setSelectedClassId(classId);
    const found = classes.find((c) => c.id === classId);
    if (found) {
      setForm((prev) => ({
        ...prev,
        kelas: found.className,
        fase: found.phase,
        semester: found.semester,
        tahunAjaran: found.academicYear,
        karakteristikPesertaDidik: `Peserta didik ${found.className} berjumlah ${found.studentCount} siswa di ${form.namaSekolah}.`,
      }));
    }
  };

  const handleSuggest = async (field: 'tujuanPembelajaran' | 'karakteristikPesertaDidik' | 'metodePembelajaran') => {
    if (!form.materi.trim()) {
      onNotify('warning', 'Isi Materi Terlebih Dahulu', 'Masukkan topik atau materi pembelajaran agar AI dapat memberi rekomendasi yang tepat.');
      return;
    }
    setSuggestingField(field);
    try {
      const res = await apiSuggestField(
        field,
        {
          mataPelajaran: form.mataPelajaran,
          kelas: form.kelas,
          fase: form.fase,
          materi: form.materi,
          capaianPembelajaran: form.capaianPembelajaran,
        },
        form[field],
        uid,
      );
      setForm((prev) => ({ ...prev, [field]: res.suggestion }));
      onNotify('success', 'Rekomendasi Diterapkan', res.rationale);
    } catch (err) {
      onNotify('error', 'Gagal Meminta Rekomendasi', err instanceof Error ? err.message : 'Coba lagi nanti.');
    } finally {
      setSuggestingField(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);
    if (!form.namaGuru.trim() || !form.materi.trim() || !form.mataPelajaran.trim()) {
      setValidationError('Nama Guru, Mata Pelajaran, dan Materi Pembelajaran wajib diisi.');
      return;
    }
    await onGenerate({
      ...form,
      pakIntegration: pakIntegration || undefined,
    });
  };

  if (isGenerating) {
    return (
      <div className="space-y-4">
        <div className="p-6 rounded-xl border border-emerald-200 dark:border-emerald-800 bg-white dark:bg-slate-900">
          <div className="flex items-center gap-3">
            <Loader2 className="w-5 h-5 text-emerald-700 dark:text-emerald-400 animate-spin" />
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                AI Sedang Merancang RPM Pembelajaran Mendalam...
              </h2>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                Menyelaraskan CP, TP, Dimensi Profil Lulusan, prinsip Mindful/Meaningful/Joyful,
                asesmen, dan diferensiasi untuk {form.kelas}.
              </p>
            </div>
          </div>
        </div>
        <SkeletonCard lines={4} />
        <SkeletonCard lines={5} />
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="p-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200 dark:border-slate-800">
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">
              Generator RPM Otomatis
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-0.5">
              Data sekolah, guru, dan kelas terisi otomatis. Bagian bertanda opsional dapat
              dilengkapi oleh AI secara pedagogis.
            </p>
          </div>
          {classes.length > 0 && (
            <div className="min-w-[220px]">
              <label
                htmlFor="auto-select-class"
                className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1"
              >
                Pilih Kelas Tersimpan
              </label>
              <select
                id="auto-select-class"
                value={selectedClassId}
                onChange={(e) => handleSelectClass(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm text-slate-900 dark:text-slate-100"
              >
                <option value="">Isi manual kelas...</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.className} (Fase {c.phase} · Sem {c.semester})
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {validationError && (
          <div
            role="alert"
            className="mt-4 p-3.5 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-sm text-red-700 dark:text-red-300"
          >
            {validationError}
          </div>
        )}

        <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="auto-guru" className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">
              Nama Guru <span className="text-red-600">*</span>
            </label>
            <input
              id="auto-guru"
              type="text"
              required
              value={form.namaGuru}
              onChange={(e) => setForm({ ...form, namaGuru: e.target.value })}
              placeholder="Contoh: Siti Aminah, S.Pd."
              className="w-full px-3.5 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm text-slate-900 dark:text-slate-100"
            />
          </div>

          <div>
            <label htmlFor="auto-sekolah" className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">
              Nama Sekolah <span className="text-red-600">*</span>
            </label>
            <input
              id="auto-sekolah"
              type="text"
              required
              value={form.namaSekolah}
              onChange={(e) => setForm({ ...form, namaSekolah: e.target.value })}
              className="w-full px-3.5 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm text-slate-900 dark:text-slate-100"
            />
          </div>

          <div>
            <label htmlFor="auto-mapel" className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">
              Mata Pelajaran <span className="text-red-600">*</span>
            </label>
            <select
              id="auto-mapel"
              value={form.mataPelajaran}
              onChange={(e) => setForm({ ...form, mataPelajaran: e.target.value })}
              className="w-full px-3.5 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm text-slate-900 dark:text-slate-100"
            >
              {MATA_PELAJARAN_SD.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label htmlFor="auto-kelas" className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">
                Kelas <span className="text-red-600">*</span>
              </label>
              <input
                id="auto-kelas"
                type="text"
                required
                value={form.kelas}
                onChange={(e) => {
                  const val = e.target.value;
                  const g = extractGradeNumber(val);
                  setForm({ ...form, kelas: val, fase: derivePhaseFromGrade(g) });
                }}
                placeholder="Kelas 5A"
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm text-slate-900 dark:text-slate-100"
              />
            </div>

            <div>
              <label htmlFor="auto-fase" className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">
                Fase
              </label>
              <select
                id="auto-fase"
                value={form.fase}
                onChange={(e) => setForm({ ...form, fase: e.target.value as PhaseCode })}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm text-slate-900 dark:text-slate-100"
              >
                <option value="A">Fase A (1-2)</option>
                <option value="B">Fase B (3-4)</option>
                <option value="C">Fase C (5-6)</option>
              </select>
            </div>

            <div>
              <label htmlFor="auto-semester" className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">
                Semester
              </label>
              <select
                id="auto-semester"
                value={form.semester}
                onChange={(e) => setForm({ ...form, semester: e.target.value as SemesterCode })}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm text-slate-900 dark:text-slate-100"
              >
                <option value="1">1 (Ganjil)</option>
                <option value="2">2 (Genap)</option>
              </select>
            </div>
          </div>

          <div>
            <label htmlFor="auto-tahun" className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">
              Tahun Ajaran
            </label>
            <input
              id="auto-tahun"
              type="text"
              value={form.tahunAjaran}
              onChange={(e) => setForm({ ...form, tahunAjaran: e.target.value })}
              className="w-full px-3.5 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm text-slate-900 dark:text-slate-100"
            />
          </div>

          <div>
            <label htmlFor="auto-waktu" className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">
              Alokasi Waktu
            </label>
            <input
              id="auto-waktu"
              type="text"
              value={form.alokasiWaktu}
              onChange={(e) => setForm({ ...form, alokasiWaktu: e.target.value })}
              placeholder="Contoh: 2 x 35 menit (1 Pertemuan)"
              className="w-full px-3.5 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm text-slate-900 dark:text-slate-100"
            />
          </div>
        </div>

        <div className="mt-4 space-y-4">
          <div>
            <label htmlFor="auto-materi" className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">
              Materi atau Topik Pembelajaran <span className="text-red-600">*</span>
            </label>
            <input
              id="auto-materi"
              type="text"
              required
              value={form.materi}
              onChange={(e) => setForm({ ...form, materi: e.target.value })}
              placeholder="Contoh: Siklus Air dan Pelestarian Sumber Air Bersih"
              className="w-full px-3.5 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm text-slate-900 dark:text-slate-100"
            />
          </div>

          <div>
            <label htmlFor="auto-cp" className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">
              Capaian Pembelajaran (CP)
              <InfoTooltip text="Tempelkan teks CP resmi dari dokumen Kurikulum Merdeka sekolah. Jika dikosongkan, AI akan menyusun draf CP dan memberi penanda verifikasi." />
            </label>
            <textarea
              id="auto-cp"
              rows={2}
              value={form.capaianPembelajaran}
              onChange={(e) => setForm({ ...form, capaianPembelajaran: e.target.value })}
              placeholder="Tempel CP resmi (opsional, jika dikosongkan akan ditandai perlu verifikasi guru)"
              className="w-full px-3.5 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm text-slate-900 dark:text-slate-100"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label htmlFor="auto-tp" className="text-sm font-medium text-slate-700 dark:text-slate-200">
                Tujuan Pembelajaran (Opsional)
              </label>
              <button
                type="button"
                disabled={suggestingField === 'tujuanPembelajaran'}
                onClick={() => handleSuggest('tujuanPembelajaran')}
                className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 dark:text-emerald-400 hover:underline disabled:opacity-50"
              >
                <Wand2 className="w-3.5 h-3.5" />
                <span>{suggestingField === 'tujuanPembelajaran' ? 'Menyusun...' : 'Rekomendasi AI'}</span>
              </button>
            </div>
            <textarea
              id="auto-tp"
              rows={2}
              value={form.tujuanPembelajaran}
              onChange={(e) => setForm({ ...form, tujuanPembelajaran: e.target.value })}
              placeholder="Kosongkan agar AI merumuskan TP operasional sesuai CP dan Fase"
              className="w-full px-3.5 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm text-slate-900 dark:text-slate-100"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label htmlFor="auto-karak" className="text-sm font-medium text-slate-700 dark:text-slate-200">
                Karakteristik Peserta Didik (Opsional)
              </label>
              <button
                type="button"
                disabled={suggestingField === 'karakteristikPesertaDidik'}
                onClick={() => handleSuggest('karakteristikPesertaDidik')}
                className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 dark:text-emerald-400 hover:underline disabled:opacity-50"
              >
                <Wand2 className="w-3.5 h-3.5" />
                <span>
                  {suggestingField === 'karakteristikPesertaDidik' ? 'Menyusun...' : 'Rekomendasi AI'}
                </span>
              </button>
            </div>
            <textarea
              id="auto-karak"
              rows={2}
              value={form.karakteristikPesertaDidik}
              onChange={(e) => setForm({ ...form, karakteristikPesertaDidik: e.target.value })}
              placeholder="Contoh: Siswa aktif secara kinestetik, sebagian masih perlu bimbingan membaca pemahaman"
              className="w-full px-3.5 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm text-slate-900 dark:text-slate-100"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="auto-model" className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">
                Model Pembelajaran (Opsional)
              </label>
              <select
                id="auto-model"
                value={form.modelPembelajaran}
                onChange={(e) => setForm({ ...form, modelPembelajaran: e.target.value })}
                className="w-full px-3.5 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm text-slate-900 dark:text-slate-100"
              >
                {MODEL_PEMBELAJARAN_OPTIONS.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="auto-metode" className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">
                Metode Pembelajaran (Opsional)
              </label>
              <input
                id="auto-metode"
                type="text"
                value={form.metodePembelajaran}
                onChange={(e) => setForm({ ...form, metodePembelajaran: e.target.value })}
                placeholder="Contoh: Eksperimen mini, diskusi, presentasi"
                className="w-full px-3.5 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm text-slate-900 dark:text-slate-100"
              />
            </div>
          </div>
        </div>

        <div className="mt-6">
          <PakAutoDetectPanel
            uid={uid}
            context={{
              mataPelajaran: form.mataPelajaran,
              kelas: form.kelas,
              fase: form.fase,
              materi: form.materi,
              capaianPembelajaran: form.capaianPembelajaran,
              tujuanPembelajaran: form.tujuanPembelajaran,
              karakteristikPesertaDidik: form.karakteristikPesertaDidik,
              modelPembelajaran: form.modelPembelajaran,
              metodePembelajaran: form.metodePembelajaran,
            }}
            value={pakIntegration}
            onChange={setPakIntegration}
            autoTrigger={true}
            onNotify={onNotify}
          />
        </div>

        <div className="mt-6 pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-3">
          <button
            type="submit"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-sm font-semibold transition-colors whitespace-nowrap shrink-0"
          >
            <Sparkles className="w-4 h-4" />
            <span>Susun RPM Lengkap dengan AI</span>
          </button>
        </div>
      </div>
    </form>
  );
}
