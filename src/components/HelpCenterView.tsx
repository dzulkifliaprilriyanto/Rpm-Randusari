import React from 'react';
import { BookOpen, CheckCircle2, Compass, Layers, Sparkles } from 'lucide-react';
import { DIMENSI_PROFIL_LULUSAN } from '../utils/pedagogy';

export function HelpCenterView() {
  return (
    <div className="max-w-4xl space-y-6">
      <section className="p-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        <h1 className="text-xl lg:text-2xl font-bold text-slate-900 dark:text-slate-100">
          Pusat Bantuan & Panduan Pembelajaran Mendalam
        </h1>
        <p className="mt-1.5 text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
          Panduan ringkas bagi guru SDN Randusari untuk merancang Rencana Pembelajaran Mendalam
          (RPM) berbasis Kurikulum Merdeka tanpa memerlukan keahlian menulis prompt AI.
        </p>
      </section>

      <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-2">
          <div className="w-9 h-9 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 flex items-center justify-center">
            <Compass className="w-5 h-5" />
          </div>
          <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
            1. Mindful Learning
          </h2>
          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
            Pembelajaran berkesadaran: peserta didik hadir utuh secara emosional dan fokus,
            memahami tujuan belajarnya, dan aktif memantau pemahaman dirinya.
          </p>
        </div>

        <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-2">
          <div className="w-9 h-9 rounded-lg bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400 flex items-center justify-center">
            <BookOpen className="w-5 h-5" />
          </div>
          <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
            2. Meaningful Learning
          </h2>
          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
            Pembelajaran bermakna: konsep dikaitkan erat dengan pengetahuan awal, pengalaman
            sehari-hari anak SD, dan konteks nyata lingkungan sekolah.
          </p>
        </div>

        <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-2">
          <div className="w-9 h-9 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 flex items-center justify-center">
            <Sparkles className="w-5 h-5" />
          </div>
          <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
            3. Joyful Learning
          </h2>
          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
            Pembelajaran menggembirakan: suasana kelas aman, positif, menantang secara sehat, dan
            mendorong rasa ingin tahu melalui eksplorasi serta kolaborasi.
          </p>
        </div>
      </section>

      <section className="p-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-4">
        <div className="flex items-center gap-2">
          <Layers className="w-5 h-5 text-emerald-700 dark:text-emerald-400" />
          <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
            Alur Cepat Penggunaan Aplikasi
          </h2>
        </div>
        <ol className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs text-slate-700 dark:text-slate-300">
          {[
            '1. Lengkapi Profil Guru & data Kepala Sekolah agar bagian Identitas dan Pengesahan terisi otomatis.',
            '2. Tambahkan Kelas pada menu Manajemen Kelas agar Fase (A/B/C) dan jumlah siswa ikut terisi otomatis.',
            '3. Pilih metode penyusunan RPM: Generator Otomatis, AI Interview, atau Pengisian Manual.',
            '4. Periksa Pratinjau Dokumen A4, lalu lengkapi LKPD, Bahan Ajar, Soal, dan Rubrik di tab Perangkat Pembelajaran.',
            '5. Jalankan Quality Control Pedagogis dan gunakan Revisi AI untuk menyempurnakan bagian tertentu.',
            '6. Simpan dokumen, ekspor ke PDF atau DOCX (siap edit di Word), dan lakukan Backup Data berkala.',
          ].map((step) => (
            <li
              key={step}
              className="flex items-start gap-2 p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60"
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-700 dark:text-emerald-400 shrink-0 mt-0.5" />
              <span>{step}</span>
            </li>
          ))}
        </ol>
      </section>

      <section className="p-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-3">
        <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
          Delapan Dimensi Profil Lulusan
        </h2>
        <p className="text-xs text-slate-600 dark:text-slate-400">
          Dalam setiap RPM, AI memilih 2–4 dimensi yang paling relevan dengan tujuan pembelajaran,
          bukan memaksakan kedelapan dimensi sekaligus.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          {DIMENSI_PROFIL_LULUSAN.map((d, i) => (
            <div key={d.id} className="p-3 rounded-lg border border-slate-200 dark:border-slate-800">
              <p className="font-bold text-slate-900 dark:text-slate-100">
                {i + 1}. {d.nama}
              </p>
              <p className="text-slate-600 dark:text-slate-400 mt-1">{d.deskripsi}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="p-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-3 text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
        <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
          Penyimpanan Lokal IndexedDB & Koneksi AI Gemini
        </h2>
        <p>
          <strong>Penyimpanan Lokal Tanpa Cloud:</strong> Seluruh data operasional (profil guru,
          kelas, RPM, LKPD, rubrik, riwayat versi, dan preferensi) disimpan langsung di{' '}
          <strong>IndexedDB</strong> browser perangkat Anda. Service Worker menggunakan Cache
          Storage khusus untuk aset statis agar aplikasi tetap dapat dibuka saat offline.
        </p>
        <p>
          <strong>Koneksi Akun Google & Gemini API:</strong> Fitur Hubungkan Google Account
          menggunakan Google OAuth resmi untuk mengenali identitas akun Google pengguna secara aman.
          Pemanggilan layanan Gemini API dilakukan melalui backend server aplikasi yang terlindungi
          agar kredensial tidak pernah terekspos di browser.
        </p>
      </section>
    </div>
  );
}
