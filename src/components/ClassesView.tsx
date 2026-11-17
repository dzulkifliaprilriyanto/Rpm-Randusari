import React, { useState } from 'react';
import { Pencil, Plus, Trash2, Users } from 'lucide-react';
import type { SchoolClass, SemesterCode } from '../types/rpm';
import { derivePhaseFromGrade } from '../utils/pedagogy';
import { ConfirmDialog, EmptyState } from './ToastAndDialog';

export function ClassesView({
  classes,
  onSaveClasses,
  onNotify,
}: {
  classes: SchoolClass[];
  onSaveClasses: (next: SchoolClass[]) => void;
  onNotify: (type: 'success' | 'error' | 'warning' | 'info', title: string, message?: string) => void;
}) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [className, setClassName] = useState('');
  const [grade, setGrade] = useState<number>(5);
  const [semester, setSemester] = useState<SemesterCode>('1');
  const [academicYear, setAcademicYear] = useState('2026/2027');
  const [studentCount, setStudentCount] = useState<number>(28);
  const [studentRosterNotes, setStudentRosterNotes] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<SchoolClass | null>(null);

  const resetForm = () => {
    setEditingId(null);
    setClassName('');
    setGrade(5);
    setSemester('1');
    setAcademicYear('2026/2027');
    setStudentCount(28);
    setStudentRosterNotes('');
  };

  const startEdit = (c: SchoolClass) => {
    setEditingId(c.id);
    setClassName(c.className);
    setGrade(c.grade);
    setSemester(c.semester);
    setAcademicYear(c.academicYear);
    setStudentCount(c.studentCount);
    setStudentRosterNotes(c.studentRosterNotes || '');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = className.trim();
    if (!cleanName) {
      onNotify('warning', 'Nama Kelas Kosong', 'Contoh: Kelas 5A atau Kelas 1B.');
      return;
    }

    const phase = derivePhaseFromGrade(grade);
    if (editingId) {
      const updated = classes.map((c) =>
        c.id === editingId
          ? {
              ...c,
              className: cleanName,
              grade,
              phase,
              semester,
              academicYear: academicYear.trim() || '2026/2027',
              studentCount: Math.max(1, Number(studentCount) || 1),
              studentRosterNotes: studentRosterNotes.trim(),
            }
          : c,
      );
      onSaveClasses(updated);
      onNotify('success', 'Data Kelas Diperbarui', `${cleanName} (Fase ${phase}) telah disimpan.`);
    } else {
      const newClass: SchoolClass = {
        id: `cls-${Date.now()}`,
        className: cleanName,
        grade,
        phase,
        semester,
        academicYear: academicYear.trim() || '2026/2027',
        studentCount: Math.max(1, Number(studentCount) || 1),
        studentRosterNotes: studentRosterNotes.trim(),
        createdAt: new Date().toISOString(),
      };
      onSaveClasses([...classes, newClass]);
      onNotify('success', 'Kelas Ditambahkan', `${cleanName} siap dipakai untuk auto-fill RPM.`);
    }
    resetForm();
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Add/Edit Form */}
      <form
        onSubmit={handleSubmit}
        className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-4 h-fit"
      >
        <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
          {editingId ? 'Edit Data Kelas' : 'Tambah Kelas Baru'}
        </h2>

        <div>
          <label htmlFor="cls-name" className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
            Nama Kelas <span className="text-red-600">*</span>
          </label>
          <input
            id="cls-name"
            type="text"
            required
            value={className}
            onChange={(e) => setClassName(e.target.value)}
            placeholder="Contoh: Kelas 5A"
            className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="cls-grade" className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
              Tingkat (SD 1–6)
            </label>
            <select
              id="cls-grade"
              value={grade}
              onChange={(e) => setGrade(Number(e.target.value))}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
            >
              {[1, 2, 3, 4, 5, 6].map((g) => (
                <option key={g} value={g}>
                  Kelas {g} (Fase {derivePhaseFromGrade(g)})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="cls-semester" className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
              Semester
            </label>
            <select
              id="cls-semester"
              value={semester}
              onChange={(e) => setSemester(e.target.value as SemesterCode)}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
            >
              <option value="1">1 (Ganjil)</option>
              <option value="2">2 (Genap)</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="cls-year" className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
              Tahun Ajaran
            </label>
            <input
              id="cls-year"
              type="text"
              value={academicYear}
              onChange={(e) => setAcademicYear(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
            />
          </div>

          <div>
            <label htmlFor="cls-count" className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
              Jumlah Siswa
            </label>
            <input
              id="cls-count"
              type="number"
              min={1}
              max={60}
              value={studentCount}
              onChange={(e) => setStudentCount(Number(e.target.value))}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm tabular-nums"
            />
          </div>
        </div>

        <div>
          <label htmlFor="cls-notes" className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
            Catatan Kebutuhan Belajar / Inisial (Opsional, tanpa data pribadi sensitif)
          </label>
          <textarea
            id="cls-notes"
            rows={2}
            value={studentRosterNotes}
            onChange={(e) => setStudentRosterNotes(e.target.value)}
            placeholder="Contoh: 4 kelompok belajar; 2 siswa perlu pendampingan membaca"
            className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
          />
        </div>

        <div className="flex items-center gap-2 pt-2">
          <button
            type="submit"
            className="flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-sm font-semibold"
          >
            <Plus className="w-4 h-4" />
            <span>{editingId ? 'Simpan Perubahan' : 'Simpan Kelas'}</span>
          </button>
          {editingId && (
            <button
              type="button"
              onClick={resetForm}
              className="px-3 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 text-sm"
            >
              Batal
            </button>
          )}
        </div>
      </form>

      {/* Class List */}
      <div className="lg:col-span-2 space-y-4">
        <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">
            Manajemen Kelas ({classes.length})
          </h1>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
            Kelas yang tersimpan akan muncul otomatis pada formulir pembuatan RPM. Tidak perlu
            memasukkan NIK atau data pribadi peserta didik.
          </p>
        </div>

        {classes.length === 0 ? (
          <EmptyState
            icon={<Users className="w-5 h-5" />}
            title="Belum Ada Kelas Terdaftar"
            description="Tambahkan minimal satu kelas yang Anda ampu menggunakan formulir di sebelah kiri agar Generator Otomatis dapat mengisi kelas, fase, dan jumlah siswa secara instan."
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {classes.map((c) => (
              <div
                key={c.id}
                className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col justify-between gap-3"
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                      {c.className}
                    </h3>
                    <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                      Fase {c.phase}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-slate-600 dark:text-slate-400 tabular-nums">
                    Kelas {c.grade} · Semester {c.semester} · {c.academicYear} · {c.studentCount} siswa
                  </p>
                  {c.studentRosterNotes && (
                    <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                      {c.studentRosterNotes}
                    </p>
                  )}
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => startEdit(c)}
                    aria-label={`Edit ${c.className}`}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800"
                  >
                    <Pencil className="w-3.5 h-3.5" /> Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleteTarget(c)}
                    aria-label={`Hapus ${c.className}`}
                    className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <ConfirmDialog
        open={deleteTarget !== null}
        title="Hapus Data Kelas?"
        description={`Kelas "${deleteTarget?.className || ''}" akan dihapus dari daftar kelas Anda.`}
        confirmLabel="Ya, Hapus Kelas"
        danger
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (deleteTarget) {
            onSaveClasses(classes.filter((c) => c.id !== deleteTarget.id));
            onNotify('info', 'Kelas Dihapus', `${deleteTarget.className} telah dihapus.`);
          }
          setDeleteTarget(null);
        }}
      />
    </div>
  );
}
