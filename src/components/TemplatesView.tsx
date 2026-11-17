import React, { useState } from 'react';
import { FolderKanban, Plus, Trash2 } from 'lucide-react';
import type { RpmTemplate } from '../types/rpm';
import { ConfirmDialog, EmptyState } from './ToastAndDialog';

export function TemplatesView({
  templates,
  onUseTemplate,
  onDeleteTemplate,
  onNavigateToCreate,
}: {
  templates: RpmTemplate[];
  onUseTemplate: (id: string) => void;
  onDeleteTemplate: (id: string) => void;
  onNavigateToCreate: () => void;
}) {
  const [deleteTarget, setDeleteTarget] = useState<RpmTemplate | null>(null);

  return (
    <div className="space-y-5">
      <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">Template Saya</h1>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
            Simpan struktur RPM terbaik sebagai template agar dapat digunakan kembali untuk kelas
            atau semester berikutnya.
          </p>
        </div>
        <button
          type="button"
          onClick={onNavigateToCreate}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold whitespace-nowrap shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Buat RPM Baru</span>
        </button>
      </div>

      {templates.length === 0 ? (
        <EmptyState
          icon={<FolderKanban className="w-5 h-5" />}
          title="Belum Ada Template Tersimpan"
          description="Buka dokumen RPM apa saja lalu klik tombol 'Simpan Template' di ruang kerja dokumen untuk menyimpannya ke koleksi ini."
          actionLabel="Buat RPM Pertama"
          onAction={onNavigateToCreate}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {templates.map((tpl) => (
            <div
              key={tpl.id}
              className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col justify-between gap-4"
            >
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                  {tpl.name}
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  {tpl.subject} · {tpl.grade} (Fase {tpl.phase})
                </p>
                <p className="text-sm text-slate-600 dark:text-slate-300 mt-2">
                  {tpl.description}
                </p>
              </div>

              <div className="flex items-center justify-between gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => onUseTemplate(tpl.id)}
                  className="px-3.5 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold"
                >
                  Gunakan Template Ini
                </button>
                <button
                  type="button"
                  onClick={() => setDeleteTarget(tpl)}
                  aria-label={`Hapus template ${tpl.name}`}
                  className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={deleteTarget !== null}
        title="Hapus Template?"
        description={`Template "${deleteTarget?.name || ''}" akan dihapus dari daftar template Anda.`}
        confirmLabel="Ya, Hapus Template"
        danger
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (deleteTarget) onDeleteTemplate(deleteTarget.id);
          setDeleteTarget(null);
        }}
      />
    </div>
  );
}
