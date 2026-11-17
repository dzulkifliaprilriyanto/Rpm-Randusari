import React, { useState } from 'react';
import { Save } from 'lucide-react';
import type { TeacherProfile } from '../types/rpm';
import { MATA_PELAJARAN_SD } from '../utils/pedagogy';

export function ProfileView({
  profile,
  onSaveProfile,
}: {
  profile: TeacherProfile;
  onSaveProfile: (next: TeacherProfile) => void;
}) {
  const [form, setForm] = useState<TeacherProfile>(profile);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveProfile({
      ...form,
      updatedAt: new Date().toISOString(),
    });
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="max-w-3xl p-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-5"
    >
      <div>
        <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">
          Profil Guru & Identitas Sekolah
        </h1>
        <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
          Data ini otomatis mengisi bagian Identitas dan Pengesahan pada setiap dokumen RPM agar
          Anda tidak perlu mengetik ulang.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label htmlFor="prof-nama" className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">
            Nama Lengkap & Gelar Guru
          </label>
          <input
            id="prof-nama"
            type="text"
            value={form.namaGuru}
            onChange={(e) => setForm({ ...form, namaGuru: e.target.value })}
            placeholder="Contoh: Siti Aminah, S.Pd."
            className="w-full px-3.5 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
          />
        </div>

        <div>
          <label htmlFor="prof-nip" className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">
            NIP / NUPTK (Opsional)
          </label>
          <input
            id="prof-nip"
            type="text"
            value={form.nip}
            onChange={(e) => setForm({ ...form, nip: e.target.value })}
            placeholder="Contoh: 19880412 201903 2 004"
            className="w-full px-3.5 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm font-mono"
          />
        </div>

        <div>
          <label htmlFor="prof-sekolah" className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">
            Nama Satuan Pendidikan
          </label>
          <input
            id="prof-sekolah"
            type="text"
            value={form.namaSekolah}
            onChange={(e) => setForm({ ...form, namaSekolah: e.target.value })}
            className="w-full px-3.5 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
          />
        </div>

        <div>
          <label htmlFor="prof-jabatan" className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">
            Jabatan
          </label>
          <input
            id="prof-jabatan"
            type="text"
            value={form.jabatan}
            onChange={(e) => setForm({ ...form, jabatan: e.target.value })}
            placeholder="Contoh: Guru Kelas V"
            className="w-full px-3.5 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
          />
        </div>

        <div className="md:col-span-2">
          <label htmlFor="prof-alamat" className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">
            Alamat Sekolah
          </label>
          <input
            id="prof-alamat"
            type="text"
            value={form.alamatSekolah}
            onChange={(e) => setForm({ ...form, alamatSekolah: e.target.value })}
            className="w-full px-3.5 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
          />
        </div>

        <div>
          <label htmlFor="prof-mapel" className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">
            Mata Pelajaran Utama
          </label>
          <select
            id="prof-mapel"
            value={form.mataPelajaranUtama}
            onChange={(e) => setForm({ ...form, mataPelajaranUtama: e.target.value })}
            className="w-full px-3.5 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
          >
            {MATA_PELAJARAN_SD.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="prof-kepsek" className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">
            Nama Kepala Sekolah (untuk Pengesahan)
          </label>
          <input
            id="prof-kepsek"
            type="text"
            value={form.namaKepalaSekolah}
            onChange={(e) => setForm({ ...form, namaKepalaSekolah: e.target.value })}
            placeholder="Opsional"
            className="w-full px-3.5 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
          />
        </div>

        <div>
          <label htmlFor="prof-nip-kepsek" className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">
            NIP Kepala Sekolah (Opsional)
          </label>
          <input
            id="prof-nip-kepsek"
            type="text"
            value={form.nipKepalaSekolah}
            onChange={(e) => setForm({ ...form, nipKepalaSekolah: e.target.value })}
            className="w-full px-3.5 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm font-mono"
          />
        </div>

        <div className="md:col-span-2">
          <label htmlFor="prof-catatan" className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">
            Informasi Tambahan Konteks Sekolah
          </label>
          <textarea
            id="prof-catatan"
            rows={2}
            value={form.catatanTambahan}
            onChange={(e) => setForm({ ...form, catatanTambahan: e.target.value })}
            placeholder="Contoh: Sekolah memiliki taman literasi, proyektor kelas, dan kebun sekolah untuk observasi IPAS."
            className="w-full px-3.5 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
          />
        </div>
      </div>

      <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex justify-end">
        <button
          type="submit"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-sm font-semibold"
        >
          <Save className="w-4 h-4" />
          <span>Simpan Profil Guru</span>
        </button>
      </div>
    </form>
  );
}
