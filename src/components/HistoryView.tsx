import React, { useMemo, useState } from 'react';
import { Copy, FileText, Search, Trash2 } from 'lucide-react';
import type { RpmDocument } from '../types/rpm';
import { filterAndPaginateRpms, MATA_PELAJARAN_SD } from '../utils/pedagogy';
import { ConfirmDialog, EmptyState } from './ToastAndDialog';

export function HistoryView({
  plans,
  onOpenPlan,
  onDuplicatePlan,
  onDeletePlan,
  onCreateNew,
}: {
  plans: RpmDocument[];
  onOpenPlan: (id: string) => void;
  onDuplicatePlan: (id: string) => void;
  onDeletePlan: (id: string) => void;
  onCreateNew: () => void;
}) {
  const [search, setSearch] = useState('');
  const [grade, setGrade] = useState('all');
  const [subject, setSubject] = useState('all');
  const [status, setStatus] = useState<'all' | 'draft' | 'final'>('all');
  const [page, setPage] = useState(1);
  const [deleteTarget, setDeleteTarget] = useState<RpmDocument | null>(null);

  const uniqueGrades = useMemo(
    () => Array.from(new Set(plans.map((p) => p.grade).filter(Boolean))).sort(),
    [plans],
  );

  const paginated = filterAndPaginateRpms(plans, {
    search,
    grade,
    subject,
    status,
    page,
    pageSize: 8,
  });

  return (
    <div className="space-y-5">
      <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">Riwayat RPM</h1>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
              Cari, filter, duplikasi, atau kelola seluruh Rencana Pembelajaran Mendalam Anda.
            </p>
          </div>
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400 tabular-nums">
            Total: {paginated.totalItems} dokumen
          </p>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="search"
              aria-label="Cari judul atau materi RPM"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Cari judul, materi, guru..."
              className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
            />
          </div>

          <select
            aria-label="Filter berdasarkan kelas"
            value={grade}
            onChange={(e) => {
              setGrade(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
          >
            <option value="all">Semua Kelas</option>
            {uniqueGrades.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>

          <select
            aria-label="Filter berdasarkan mata pelajaran"
            value={subject}
            onChange={(e) => {
              setSubject(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
          >
            <option value="all">Semua Mata Pelajaran</option>
            {MATA_PELAJARAN_SD.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>

          <select
            aria-label="Filter berdasarkan status"
            value={status}
            onChange={(e) => {
              setStatus(e.target.value as 'all' | 'draft' | 'final');
              setPage(1);
            }}
            className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
          >
            <option value="all">Semua Status</option>
            <option value="draft">Draft</option>
            <option value="final">Final</option>
          </select>
        </div>
      </div>

      {paginated.items.length === 0 ? (
        <EmptyState
          icon={<FileText className="w-5 h-5" />}
          title={plans.length === 0 ? 'Belum Ada RPM Tersimpan' : 'Tidak Ada RPM yang Cocok'}
          description={
            plans.length === 0
              ? 'Buat RPM pertama Anda menggunakan Generator Otomatis, AI Interview, atau Pengisian Manual.'
              : 'Ubah kata kunci pencarian atau filter kelas dan mata pelajaran.'
          }
          actionLabel={plans.length === 0 ? 'Buat RPM Baru' : undefined}
          onAction={plans.length === 0 ? onCreateNew : undefined}
        />
      ) : (
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
          <div className="divide-y divide-slate-200 dark:divide-slate-800">
            {paginated.items.map((plan) => (
              <div
                key={plan.id}
                className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
              >
                <div className="min-w-0">
                  <button
                    type="button"
                    onClick={() => onOpenPlan(plan.id)}
                    className="text-left font-bold text-sm text-slate-900 dark:text-slate-100 hover:text-emerald-700 dark:hover:text-emerald-400 truncate block max-w-full"
                  >
                    {plan.title}
                  </button>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    {plan.subject} · {plan.grade} (Fase {plan.phase}) · Semester {plan.semester} ·{' '}
                    <span className={plan.status === 'final' ? 'text-emerald-700 dark:text-emerald-400 font-semibold' : 'text-amber-700 dark:text-amber-400 font-semibold'}>
                      {plan.status === 'final' ? 'Final' : 'Draft'}
                    </span>
                    {plan.pakIntegration?.applied && !plan.pakIntegration?.ignored && (
                      <>
                        {' · '}
                        <span className="text-emerald-700 dark:text-emerald-400 font-semibold">
                          PAK Aktif
                        </span>
                      </>
                    )}{' '}
                    · Diperbarui {new Date(plan.updatedAt).toLocaleDateString('id-ID')}
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => onOpenPlan(plan.id)}
                    className="px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold whitespace-nowrap shrink-0"
                  >
                    Buka Dokumen
                  </button>
                  <button
                    type="button"
                    onClick={() => onDuplicatePlan(plan.id)}
                    aria-label={`Duplikasi ${plan.title}`}
                    className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleteTarget(plan)}
                    aria-label={`Hapus ${plan.title}`}
                    className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {paginated.totalPages > 1 && (
            <div className="px-4 py-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
              <span className="text-slate-600 dark:text-slate-400 tabular-nums">
                Halaman {paginated.currentPage} dari {paginated.totalPages}
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={paginated.currentPage <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-40"
                >
                  Sebelumnya
                </button>
                <button
                  type="button"
                  disabled={paginated.currentPage >= paginated.totalPages}
                  onClick={() => setPage((p) => p + 1)}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-40"
                >
                  Berikutnya
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      <ConfirmDialog
        open={deleteTarget !== null}
        title="Hapus Dokumen RPM?"
        description={`Dokumen "${deleteTarget?.title || ''}" akan dihapus permanen dari penyimpanan lokal perangkat ini.`}
        confirmLabel="Ya, Hapus RPM"
        danger
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (deleteTarget) onDeletePlan(deleteTarget.id);
          setDeleteTarget(null);
        }}
      />
    </div>
  );
}
