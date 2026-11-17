import React from 'react';
import {
  ArrowRight,
  BookOpen,
  Download,
  FileEdit,
  FileText,
  FolderKanban,
  MessageSquareHeart,
  PlusCircle,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Users,
} from 'lucide-react';
import type {
  ActivityLogItem,
  NavPageId,
  RpmDocument,
  RpmTemplate,
  SchoolClass,
  TeacherProfile,
} from '../types/rpm';
import type { AiConnectionState } from '../services/aiConnection';
import { AiConnectionPanel } from './AiConnectionPanel';
import { EmptyState } from './ToastAndDialog';

export function DashboardView({
  profile,
  lessonPlans,
  templates,
  classes,
  activities,
  uid,
  aiConnection,
  onConnectGoogle,
  onCheckAiConnection,
  onDisconnectGoogle,
  onNavigate,
  onOpenPlan,
  onLoadSamplePlan,
  onQuickBackup,
}: {
  profile: TeacherProfile;
  lessonPlans: RpmDocument[];
  templates: RpmTemplate[];
  classes: SchoolClass[];
  activities: ActivityLogItem[];
  uid: string;
  aiConnection: AiConnectionState;
  onConnectGoogle: () => Promise<void>;
  onCheckAiConnection: () => Promise<void>;
  onDisconnectGoogle: () => void;
  onNavigate: (page: NavPageId) => void;
  onOpenPlan: (planId: string) => void;
  onLoadSamplePlan: () => void;
  onQuickBackup: () => void;
}) {
  const recentPlans = [...lessonPlans]
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 5);

  const greetingName = profile.namaGuru?.trim() ? profile.namaGuru : 'Bapak/Ibu Guru';

  return (
    <div className="space-y-6">
      {/* Header Greeting & School Identity */}
      <section className="p-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="space-y-1">
            <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">
              {profile.namaSekolah || 'SDN Randusari'} · Kurikulum Merdeka · Pembelajaran Mendalam
            </p>
            <h1 className="text-2xl lg:text-3xl font-bold text-slate-900 dark:text-slate-100">
              Selamat Datang, {greetingName}
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-400 max-w-2xl">
              Asisten Cerdas Guru dalam Merancang Pembelajaran Mendalam. Susun RPM lengkap beserta
              LKPD, bahan ajar, asesmen, dan rubrik penilaian dalam satu ruang kerja terpadu.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            {!profile.namaGuru?.trim() && (
              <button
                type="button"
                onClick={() => onNavigate('profil-guru')}
                className="px-4 py-2.5 rounded-lg border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 text-sm font-semibold hover:bg-amber-100 dark:hover:bg-amber-950/60 transition-colors whitespace-nowrap shrink-0"
              >
                Lengkapi Profil Guru
              </button>
            )}
            <button
              type="button"
              onClick={() => onNavigate('buat-rpm')}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-sm font-semibold transition-colors whitespace-nowrap shrink-0"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Buat RPM Baru</span>
            </button>
          </div>
        </div>

        {/* Real Metrics Strip (no dummy numbers) */}
        <div className="mt-6 pt-5 border-t border-slate-200 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <button
            type="button"
            onClick={() => onNavigate('riwayat-rpm')}
            className="text-left p-4 rounded-lg bg-slate-50 dark:bg-slate-800/50 hover:bg-emerald-50/70 dark:hover:bg-emerald-950/30 border border-slate-200/80 dark:border-slate-800 transition-colors"
          >
            <div className="flex items-center justify-between text-xs font-medium text-slate-600 dark:text-slate-400">
              <span>Jumlah RPM Dibuat</span>
              <FileText className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
            </div>
            <p className="mt-1.5 text-2xl font-bold text-slate-900 dark:text-slate-100 tabular-nums">
              {lessonPlans.length}
            </p>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
              {lessonPlans.filter((p) => p.status === 'final').length} selesai ·{' '}
              {lessonPlans.filter((p) => p.status === 'draft').length} draft
            </p>
          </button>

          <button
            type="button"
            onClick={() => onNavigate('template-saya')}
            className="text-left p-4 rounded-lg bg-slate-50 dark:bg-slate-800/50 hover:bg-emerald-50/70 dark:hover:bg-emerald-950/30 border border-slate-200/80 dark:border-slate-800 transition-colors"
          >
            <div className="flex items-center justify-between text-xs font-medium text-slate-600 dark:text-slate-400">
              <span>Template Tersimpan</span>
              <FolderKanban className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            </div>
            <p className="mt-1.5 text-2xl font-bold text-slate-900 dark:text-slate-100 tabular-nums">
              {templates.length}
            </p>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
              Siap dipakai ulang kapan saja
            </p>
          </button>

          <button
            type="button"
            onClick={() => onNavigate('manajemen-kelas')}
            className="text-left p-4 rounded-lg bg-slate-50 dark:bg-slate-800/50 hover:bg-emerald-50/70 dark:hover:bg-emerald-950/30 border border-slate-200/80 dark:border-slate-800 transition-colors"
          >
            <div className="flex items-center justify-between text-xs font-medium text-slate-600 dark:text-slate-400">
              <span>Kelas Terkelola</span>
              <Users className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
            </div>
            <p className="mt-1.5 text-2xl font-bold text-slate-900 dark:text-slate-100 tabular-nums">
              {classes.length}
            </p>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
              Auto-fill otomatis ke formulir RPM
            </p>
          </button>
        </div>
      </section>

      {/* AI Gemini & Google Account Connection Status */}
      <AiConnectionPanel
        compact
        connection={aiConnection}
        onConnectGoogle={onConnectGoogle}
        onCheckConnection={onCheckAiConnection}
        onDisconnect={onDisconnectGoogle}
        onOpenSettings={() => onNavigate('pengaturan')}
      />

      {/* Quick Access to 3 Hybrid Generators */}
      <section aria-labelledby="quick-generators-heading">
        <div className="flex items-center justify-between mb-3">
          <h2
            id="quick-generators-heading"
            className="text-base font-bold text-slate-900 dark:text-slate-100"
          >
            Akses Cepat Penyusunan RPM
          </h2>
          <button
            type="button"
            onClick={() => onNavigate('pusat-bantuan')}
            className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 hover:underline whitespace-nowrap shrink-0"
          >
            Pelajari Panduan Pembelajaran Mendalam
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col justify-between">
            <div>
              <div className="w-9 h-9 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 flex items-center justify-center mb-3">
                <Sparkles className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                Generator Otomatis
              </h3>
              <p className="mt-1.5 text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                Isi formulir terstruktur sekali klik dari profil dan data kelas, lalu AI menyusun RPM
                lengkap siap ekspor.
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('generator-otomatis')}
              className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-700 dark:text-emerald-400 hover:text-emerald-800"
            >
              <span>Buka Generator Otomatis</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col justify-between">
            <div>
              <div className="w-9 h-9 rounded-lg bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400 flex items-center justify-center mb-3">
                <MessageSquareHeart className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                AI Interview
              </h3>
              <p className="mt-1.5 text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                Konsultan pedagogis AI memandu dengan pertanyaan bertahap dan pilihan praktis tanpa
                perlu menulis prompt.
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('ai-interview')}
              className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-700 dark:text-emerald-400 hover:text-emerald-800"
            >
              <span>Mulai Wawancara AI</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col justify-between">
            <div>
              <div className="w-9 h-9 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center mb-3">
                <FileEdit className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                Pengisian Manual
              </h3>
              <p className="mt-1.5 text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                Susun sendiri setiap komponen RPM, simpan sebagai draft, dan minta bantuan AI per
                bagian kapan saja.
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('pengisian-manual')}
              className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-700 dark:text-emerald-400 hover:text-emerald-800"
            >
              <span>Buka Editor Manual</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="mt-4 p-4 rounded-xl border border-emerald-200 dark:border-emerald-900/70 bg-emerald-50/60 dark:bg-emerald-950/25 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-lg bg-emerald-700 text-white flex items-center justify-center shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                AI Auto-Detect Pendidikan Antikorupsi (PAK)
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                Deteksi otomatis keterkaitan materi dengan 5 Elemen & 10 Subelemen PAK (
                <strong className="tabular-nums">
                  {lessonPlans.filter((p) => p.pakIntegration?.applied).length}
                </strong>{' '}
                RPM sudah terintegrasi).
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('integrasi-pak')}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold transition-colors whitespace-nowrap shrink-0"
          >
            <span>Buka AI Integrasi PAK</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </section>

      {/* Recent Documents & Activity Split */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <section className="lg:col-span-2 p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          <div className="flex items-center justify-between gap-4 mb-4">
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
              Dokumen RPM Terakhir
            </h2>
            {lessonPlans.length > 0 && (
              <button
                type="button"
                onClick={() => onNavigate('riwayat-rpm')}
                className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 hover:underline whitespace-nowrap shrink-0"
              >
                Lihat Semua ({lessonPlans.length})
              </button>
            )}
          </div>

          {recentPlans.length === 0 ? (
            <EmptyState
              icon={<BookOpen className="w-5 h-5" />}
              title="Belum Ada Dokumen RPM Tersimpan"
              description="Mulai buat Rencana Pembelajaran Mendalam pertama Anda atau muat 1 contoh RPM IPAS Kelas 5 untuk mencoba pratinjau A4 dan ekspor DOCX/PDF."
              actionLabel="Muat Contoh RPM IPAS Kelas 5"
              onAction={onLoadSamplePlan}
            />
          ) : (
            <div className="divide-y divide-slate-200 dark:divide-slate-800">
              {recentPlans.map((plan) => (
                <div
                  key={plan.id}
                  className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <button
                      type="button"
                      onClick={() => onOpenPlan(plan.id)}
                      className="text-left font-semibold text-sm text-slate-900 dark:text-slate-100 hover:text-emerald-700 dark:hover:text-emerald-400 truncate block max-w-full"
                    >
                      {plan.title}
                    </button>
                    <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                      {plan.subject} · {plan.grade} (Fase {plan.phase}) ·{' '}
                      {plan.status === 'final' ? 'Final' : 'Draft'} · Versi {plan.version}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => onOpenPlan(plan.id)}
                      className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 whitespace-nowrap shrink-0"
                    >
                      Buka & Pratinjau
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col justify-between gap-4">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 mb-3">
              Aktivitas Terbaru
            </h2>
            {activities.length === 0 ? (
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Belum ada riwayat aktivitas pada sesi ini. Setiap pembuatan, revisi, atau ekspor
                dokumen akan tercatat di sini.
              </p>
            ) : (
              <ul className="space-y-3">
                {activities.slice(0, 5).map((act) => (
                  <li key={act.id} className="text-xs border-b border-slate-100 dark:border-slate-800 pb-2.5 last:border-0">
                    <p className="font-semibold text-slate-800 dark:text-slate-200">{act.title}</p>
                    <p className="text-slate-500 dark:text-slate-400 mt-0.5">{act.detail}</p>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Anonymous Session Limitation & Backup Notice */}
          <div className="p-4 rounded-lg bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/70">
            <div className="flex items-start gap-2.5">
              <ShieldAlert className="w-4 h-4 text-amber-700 dark:text-amber-400 shrink-0 mt-0.5" />
              <div className="text-xs text-amber-950 dark:text-amber-100 space-y-1.5">
                <p className="font-semibold">Penyimpanan Lokal Perangkat (IndexedDB)</p>
                <p className="text-amber-900/90 dark:text-amber-200/90 leading-relaxed">
                  Seluruh RPM, kelas, dan template disimpan lokal di IndexedDB perangkat Anda (ID
                  Sesi: <span className="font-mono">{uid.slice(0, 14)}...</span>). Data tetap aman
                  saat offline, namun tidak sinkron antar perangkat dan dapat hilang bila cache/data
                  browser dihapus.
                </p>
                <button
                  type="button"
                  onClick={onQuickBackup}
                  className="inline-flex items-center gap-1.5 font-semibold text-emerald-800 dark:text-emerald-300 hover:underline pt-1"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Ekspor Backup Data Sekarang</span>
                </button>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
