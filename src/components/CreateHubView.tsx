import React from 'react';
import { ArrowRight, FileEdit, FolderKanban, MessageSquareHeart, Sparkles } from 'lucide-react';
import type { NavPageId, RpmTemplate } from '../types/rpm';

export function CreateHubView({
  templates,
  onNavigate,
  onUseTemplate,
}: {
  templates: RpmTemplate[];
  onNavigate: (page: NavPageId) => void;
  onUseTemplate: (templateId: string) => void;
}) {
  return (
    <div className="space-y-6">
      <div className="p-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        <h1 className="text-xl lg:text-2xl font-bold text-slate-900 dark:text-slate-100">
          Pilih Metode Penyusunan RPM
        </h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          Semua metode terintegrasi dengan pendekatan Pembelajaran Mendalam (Mindful, Meaningful,
          Joyful) dan data profil guru serta kelas Anda.
        </p>

        <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Method A */}
          <div className="p-5 rounded-xl border border-emerald-200 dark:border-emerald-800/70 bg-emerald-50/40 dark:bg-emerald-950/20 flex flex-col justify-between">
            <div>
              <div className="w-10 h-10 rounded-lg bg-emerald-700 text-white flex items-center justify-center mb-4">
                <Sparkles className="w-5 h-5" />
              </div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                1. Generator Otomatis
              </h2>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                Cukup isi informasi dasar pembelajaran seperti mata pelajaran, materi, dan kelas.
                AI melengkapi struktur RPM, kegiatan inti, asesmen, dan diferensiasi secara otomatis.
              </p>
              <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
                Cocok untuk: Penyusunan cepat · Guru sudah menentukan topik pembelajaran
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('generator-otomatis')}
              className="mt-5 w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-sm font-semibold transition-colors"
            >
              <span>Gunakan Generator Otomatis</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          {/* Method B */}
          <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col justify-between">
            <div>
              <div className="w-10 h-10 rounded-lg bg-amber-500 text-white flex items-center justify-center mb-4">
                <MessageSquareHeart className="w-5 h-5" />
              </div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                2. AI Interview
              </h2>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                Konsultan pedagogis AI memandu Anda melalui tanya-jawab bertahap dengan pilihan
                rekomendasi yang mudah dipilih tanpa harus memikirkan prompt.
              </p>
              <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
                Cocok untuk: Eksplorasi ide kegiatan · Menyesuaikan kondisi kelas secara mendalam
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('ai-interview')}
              className="mt-5 w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 text-sm font-semibold transition-colors"
            >
              <span>Mulai AI Interview</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          {/* Method C */}
          <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col justify-between">
            <div>
              <div className="w-10 h-10 rounded-lg bg-slate-800 dark:bg-slate-700 text-white flex items-center justify-center mb-4">
                <FileEdit className="w-5 h-5" />
              </div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                3. Pengisian Manual
              </h2>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                Isi langsung setiap bagian RPM sesuai format resmi, simpan sebagai draft, dan minta
                rekomendasi atau perbaikan AI hanya pada bagian yang diinginkan.
              </p>
              <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
                Cocok untuk: Kontrol penuh isi dokumen · Melanjutkan rancangan guru yang sudah ada
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('pengisian-manual')}
              className="mt-5 w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 text-sm font-semibold transition-colors"
            >
              <span>Buka Pengisian Manual</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Saved Templates Quick Start */}
      {templates.length > 0 && (
        <section className="p-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          <div className="flex items-center gap-2 mb-3">
            <FolderKanban className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
              Atau Mulai dari Template Tersimpan
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {templates.slice(0, 4).map((tpl) => (
              <div
                key={tpl.id}
                className="p-4 rounded-lg border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3"
              >
                <div className="min-w-0">
                  <p className="font-semibold text-sm text-slate-900 dark:text-slate-100 truncate">
                    {tpl.name}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                    {tpl.subject} · {tpl.grade} (Fase {tpl.phase})
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onUseTemplate(tpl.id)}
                  className="px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold whitespace-nowrap shrink-0"
                >
                  Pakai Template
                </button>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
