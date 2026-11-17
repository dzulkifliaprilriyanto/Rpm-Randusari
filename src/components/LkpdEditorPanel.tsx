import React, { useState } from 'react';
import { Plus, Save, Trash2, X } from 'lucide-react';
import type { LkpdKit } from '../types/rpm';

export function LkpdEditorPanel({
  initialLkpd,
  onSave,
  onCancel,
}: {
  initialLkpd: LkpdKit;
  onSave: (nextLkpd: LkpdKit) => void;
  onCancel: () => void;
}) {
  const [draft, setDraft] = useState<LkpdKit>(() => structuredClone(initialLkpd));

  const updatePetunjuk = (idx: number, val: string) => {
    const next = [...draft.petunjukPengerjaan];
    next[idx] = val;
    setDraft({ ...draft, petunjukPengerjaan: next });
  };

  const updateRefleksi = (idx: number, val: string) => {
    const next = [...draft.refleksiSiswa];
    next[idx] = val;
    setDraft({ ...draft, refleksiSiswa: next });
  };

  return (
    <div className="p-5 sm:p-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
            Edit Konten LKPD (Mandiri Tanpa Mengubah RPM Induk)
          </h2>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
            Tujuan Pembelajaran & pemetaan PAK tetap tersinkron otomatis dengan RPM induk.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={onCancel}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="w-3.5 h-3.5" />
            <span>Batal</span>
          </button>
          <button
            type="button"
            onClick={() => onSave({ ...draft, updatedAt: new Date().toISOString() })}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold"
          >
            <Save className="w-3.5 h-3.5" />
            <span>Simpan Perubahan LKPD</span>
          </button>
        </div>
      </div>

      {/* Judul & Tujuan Kegiatan */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label htmlFor="lkpd-edit-judul" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
            Judul Kegiatan LKPD
          </label>
          <input
            id="lkpd-edit-judul"
            type="text"
            value={draft.judul}
            onChange={(e) => setDraft({ ...draft, judul: e.target.value })}
            className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
          />
        </div>
        <div>
          <label htmlFor="lkpd-edit-tujuan" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
            Fokus Tujuan Kegiatan
          </label>
          <input
            id="lkpd-edit-tujuan"
            type="text"
            value={draft.tujuanKegiatan}
            onChange={(e) => setDraft({ ...draft, tujuanKegiatan: e.target.value })}
            className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
          />
        </div>
      </div>

      {/* Materi Pengantar */}
      <div>
        <label htmlFor="lkpd-edit-materi" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
          Materi Pengantar (Ramah Anak SD)
        </label>
        <textarea
          id="lkpd-edit-materi"
          rows={3}
          value={draft.materiPengantar}
          onChange={(e) => setDraft({ ...draft, materiPengantar: e.target.value })}
          className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
        />
      </div>

      {/* Petunjuk Pengerjaan */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
            Petunjuk Pengerjaan ({draft.petunjukPengerjaan.length})
          </p>
          <button
            type="button"
            onClick={() =>
              setDraft({
                ...draft,
                petunjukPengerjaan: [...draft.petunjukPengerjaan, 'Kerjakan dengan tertib dan jujur.'],
              })
            }
            className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 dark:text-emerald-400 hover:underline"
          >
            <Plus className="w-3.5 h-3.5" /> Tambah Petunjuk
          </button>
        </div>
        {draft.petunjukPengerjaan.map((step, i) => (
          <div key={i} className="flex items-center gap-2">
            <input
              type="text"
              value={step}
              onChange={(e) => updatePetunjuk(i, e.target.value)}
              className="flex-1 px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
            />
            {draft.petunjukPengerjaan.length > 1 && (
              <button
                type="button"
                aria-label="Hapus petunjuk"
                onClick={() =>
                  setDraft({
                    ...draft,
                    petunjukPengerjaan: draft.petunjukPengerjaan.filter((_, idx) => idx !== i),
                  })
                }
                className="p-1.5 rounded text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Kegiatan Peserta Didik */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
            Kegiatan Peserta Didik ({draft.aktivitas.length})
          </p>
          <button
            type="button"
            onClick={() =>
              setDraft({
                ...draft,
                aktivitas: [
                  ...draft.aktivitas,
                  {
                    nomor: draft.aktivitas.length + 1,
                    jenisAktivitas: 'Berdiskusi',
                    judul: `Kegiatan ${draft.aktivitas.length + 1}`,
                    instruksi: 'Tuliskan instruksi aktivitas peserta didik di sini.',
                    langkahSingkat: [],
                  },
                ],
              })
            }
            className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 dark:text-emerald-400 hover:underline"
          >
            <Plus className="w-3.5 h-3.5" /> Tambah Kegiatan
          </button>
        </div>
        {draft.aktivitas.map((act, idx) => (
          <div key={idx} className="p-3.5 rounded-lg border border-slate-200 dark:border-slate-800 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-bold text-emerald-800 dark:text-emerald-400">
                Kegiatan {idx + 1}
              </span>
              {draft.aktivitas.length > 1 && (
                <button
                  type="button"
                  onClick={() =>
                    setDraft({
                      ...draft,
                      aktivitas: draft.aktivitas
                        .filter((_, i) => i !== idx)
                        .map((item, n) => ({ ...item, nomor: n + 1 })),
                    })
                  }
                  className="text-xs text-red-600 hover:underline"
                >
                  Hapus
                </button>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <input
                type="text"
                value={act.judul}
                onChange={(e) => {
                  const next = [...draft.aktivitas];
                  next[idx] = { ...act, judul: e.target.value };
                  setDraft({ ...draft, aktivitas: next });
                }}
                placeholder="Judul kegiatan"
                className="px-3 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs"
              />
              <input
                type="text"
                value={act.jenisAktivitas || ''}
                onChange={(e) => {
                  const next = [...draft.aktivitas];
                  next[idx] = { ...act, jenisAktivitas: e.target.value };
                  setDraft({ ...draft, aktivitas: next });
                }}
                placeholder="Jenis (Mengamati, Berdiskusi, Praktik...)"
                className="px-3 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs"
              />
            </div>
            <textarea
              rows={2}
              value={act.instruksi}
              onChange={(e) => {
                const next = [...draft.aktivitas];
                next[idx] = { ...act, instruksi: e.target.value };
                setDraft({ ...draft, aktivitas: next });
              }}
              className="w-full px-3 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs"
            />
          </div>
        ))}
      </div>

      {/* Latihan dan Tugas */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
            Latihan dan Tugas ({draft.pertanyaan.length})
          </p>
          <button
            type="button"
            onClick={() =>
              setDraft({
                ...draft,
                pertanyaan: [
                  ...draft.pertanyaan,
                  {
                    nomor: draft.pertanyaan.length + 1,
                    tingkatKesulitan: 'Menengah',
                    pertanyaan: 'Tuliskan soal latihan baru.',
                    ruangJawabanHint: 'Tuliskan jawaban singkat dengan bahasamu sendiri.',
                    barisRuangJawaban: 3,
                  },
                ],
              })
            }
            className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 dark:text-emerald-400 hover:underline"
          >
            <Plus className="w-3.5 h-3.5" /> Tambah Soal
          </button>
        </div>
        {draft.pertanyaan.map((q, idx) => (
          <div key={idx} className="p-3.5 rounded-lg border border-slate-200 dark:border-slate-800 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold">Soal {idx + 1}</span>
                <select
                  value={q.tingkatKesulitan || 'Dasar'}
                  onChange={(e) => {
                    const next = [...draft.pertanyaan];
                    next[idx] = {
                      ...q,
                      tingkatKesulitan: e.target.value as 'Dasar' | 'Menengah' | 'HOTS Ringan',
                    };
                    setDraft({ ...draft, pertanyaan: next });
                  }}
                  className="px-2 py-1 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs"
                >
                  <option value="Dasar">Dasar</option>
                  <option value="Menengah">Menengah</option>
                  <option value="HOTS Ringan">HOTS Ringan</option>
                </select>
              </div>
              {draft.pertanyaan.length > 1 && (
                <button
                  type="button"
                  onClick={() =>
                    setDraft({
                      ...draft,
                      pertanyaan: draft.pertanyaan
                        .filter((_, i) => i !== idx)
                        .map((item, n) => ({ ...item, nomor: n + 1 })),
                    })
                  }
                  className="text-xs text-red-600 hover:underline"
                >
                  Hapus
                </button>
              )}
            </div>
            <textarea
              rows={2}
              value={q.pertanyaan}
              onChange={(e) => {
                const next = [...draft.pertanyaan];
                next[idx] = { ...q, pertanyaan: e.target.value };
                setDraft({ ...draft, pertanyaan: next });
              }}
              className="w-full px-3 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs"
            />
            <input
              type="text"
              value={q.ruangJawabanHint}
              onChange={(e) => {
                const next = [...draft.pertanyaan];
                next[idx] = { ...q, ruangJawabanHint: e.target.value };
                setDraft({ ...draft, pertanyaan: next });
              }}
              placeholder="Petunjuk ruang jawaban siswa"
              className="w-full px-3 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs"
            />
          </div>
        ))}
      </div>

      {/* Refleksi & Kesimpulan */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
            Pertanyaan Refleksi Peserta Didik
          </p>
          {draft.refleksiSiswa.map((r, i) => (
            <input
              key={i}
              type="text"
              value={r}
              onChange={(e) => updateRefleksi(i, e.target.value)}
              className="w-full px-3 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs"
            />
          ))}
        </div>
        <div className="space-y-2">
          <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
            Prompt Kesimpulan Peserta Didik
          </p>
          <textarea
            rows={3}
            value={draft.kesimpulan?.prompt || ''}
            onChange={(e) =>
              setDraft({
                ...draft,
                kesimpulan: {
                  prompt: e.target.value,
                  ruangKesimpulanHint:
                    draft.kesimpulan?.ruangKesimpulanHint || 'Ruang kesimpulan peserta didik.',
                },
              })
            }
            className="w-full px-3 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs"
          />
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
        <button
          type="button"
          onClick={onCancel}
          className="px-3.5 py-2 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800"
        >
          Batal
        </button>
        <button
          type="button"
          onClick={() => onSave({ ...draft, updatedAt: new Date().toISOString() })}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold"
        >
          <Save className="w-3.5 h-3.5" />
          <span>Simpan Perubahan LKPD</span>
        </button>
      </div>
    </div>
  );
}
