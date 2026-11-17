import React, { useState } from 'react';
import { BookOpen, ExternalLink, FileCheck2, ShieldCheck } from 'lucide-react';
import type { PakIntegrationRecord, PhaseCode, RpmDocument } from '../types/rpm';
import {
  applyPakIntegrationToRpmCore,
  PAK_ELEMENTS_FRAMEWORK,
  PAK_OFFICIAL_REFERENCES,
  stripPakIntegrationFromRpmCore,
} from '../utils/pak';
import { derivePhaseFromGrade, extractGradeNumber, MATA_PELAJARAN_SD } from '../utils/pedagogy';
import { PakAutoDetectPanel } from './PakAutoDetectPanel';

export function PakIntegrationHubView({
  uid,
  lessonPlans,
  pakIntegrations,
  onSavePakRecord,
  onApplyPakToDocument,
  onOpenPlan,
  onNotify,
}: {
  uid: string;
  lessonPlans: RpmDocument[];
  pakIntegrations: PakIntegrationRecord[];
  onSavePakRecord: (record: PakIntegrationRecord) => void;
  onApplyPakToDocument: (doc: RpmDocument, pak: PakIntegrationRecord) => void;
  onOpenPlan: (docId: string) => void;
  onNotify: (type: 'success' | 'error' | 'warning' | 'info', title: string, message?: string) => void;
}) {
  const [selectedPlanId, setSelectedPlanId] = useState<string>(lessonPlans[0]?.id || '');
  const selectedPlan = lessonPlans.find((p) => p.id === selectedPlanId) || null;

  // Custom sandbox context if teacher wants to test PAK Auto-Detect on any topic
  const [customMapel, setCustomMapel] = useState(MATA_PELAJARAN_SD[0]);
  const [customKelas, setCustomKelas] = useState('Kelas 5');
  const [customFase, setCustomFase] = useState<PhaseCode>('C');
  const [customMateri, setCustomMateri] = useState('');
  const [draftPak, setDraftPak] = useState<PakIntegrationRecord | null>(
    () => selectedPlan?.pakIntegration || null,
  );

  const activePak =
    selectedPlan?.pakIntegration ||
    pakIntegrations.find((p) => p.lessonPlanId === selectedPlanId) ||
    draftPak;

  const handleSelectPlan = (planId: string) => {
    setSelectedPlanId(planId);
    const found = lessonPlans.find((p) => p.id === planId);
    setDraftPak(
      found?.pakIntegration ||
        pakIntegrations.find((p) => p.lessonPlanId === planId) ||
        null,
    );
  };

  const context = selectedPlan
    ? {
        lessonPlanId: selectedPlan.id,
        mataPelajaran: selectedPlan.content.identitas.mataPelajaran,
        kelas: selectedPlan.content.identitas.kelas,
        fase: selectedPlan.content.identitas.fase,
        materi: selectedPlan.content.identitas.materi,
        capaianPembelajaran: selectedPlan.content.desain.capaianPembelajaran,
        tujuanPembelajaran: selectedPlan.content.desain.tujuanPembelajaran.join('; '),
        karakteristikPesertaDidik: selectedPlan.content.identifikasi.karakteristikPesertaDidik,
        modelPembelajaran: selectedPlan.content.desain.modelPembelajaran,
        metodePembelajaran: selectedPlan.content.desain.metodePembelajaran,
        lingkunganPembelajaran: selectedPlan.content.desain.lingkunganPembelajaran,
      }
    : {
        lessonPlanId: '',
        mataPelajaran: customMapel,
        kelas: customKelas,
        fase: customFase,
        materi: customMateri,
      };

  return (
    <div className="space-y-6">
      {/* Header & Selector */}
      <section className="p-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-700 dark:text-emerald-400" />
              <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                AI Integrasi Pendidikan Antikorupsi (PAK)
              </h1>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
              Analisis otomatis keterkaitan materi pembelajaran SD dengan 5 Elemen dan 10 Subelemen
              Pendidikan Antikorupsi, lengkap dengan materi, aktivitas, asesmen, dan rujukan resmi.
            </p>
          </div>
        </div>

        <div className="pt-4 border-t border-slate-200 dark:border-slate-800 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label
              htmlFor="pak-hub-plan"
              className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1"
            >
              Analisis Dokumen RPM Tersimpan
            </label>
            <select
              id="pak-hub-plan"
              value={selectedPlanId}
              onChange={(e) => handleSelectPlan(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
            >
              <option value="">Simulasi / Topik Baru (Tanpa Menautkan RPM)</option>
              {lessonPlans.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title} ({p.pakIntegration?.applied ? 'PAK Aktif' : 'Belum diintegrasikan'})
                </option>
              ))}
            </select>
          </div>

          {selectedPlan && (
            <div className="flex items-end">
              <button
                type="button"
                onClick={() => onOpenPlan(selectedPlan.id)}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-emerald-300 dark:border-emerald-800 text-xs font-semibold text-emerald-800 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
              >
                <FileCheck2 className="w-4 h-4" />
                <span>Buka Pratinjau & Ekspor RPM Ini</span>
              </button>
            </div>
          )}
        </div>

        {!selectedPlan && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 pt-2">
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                Mata Pelajaran
              </label>
              <select
                value={customMapel}
                onChange={(e) => setCustomMapel(e.target.value)}
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
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                Kelas & Fase
              </label>
              <input
                type="text"
                value={customKelas}
                onChange={(e) => {
                  const val = e.target.value;
                  setCustomKelas(val);
                  setCustomFase(derivePhaseFromGrade(extractGradeNumber(val)));
                }}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                Materi / Topik Pembelajaran
              </label>
              <input
                type="text"
                value={customMateri}
                onChange={(e) => setCustomMateri(e.target.value)}
                placeholder="Contoh: Musyawarah dan Tata Tertib di Kelas / Pecahan dalam Pembagian Adil"
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
              />
            </div>
          </div>
        )}
      </section>

      {/* Main Auto-Detect Panel */}
      <PakAutoDetectPanel
        uid={uid}
        context={context}
        value={activePak}
        autoTrigger={false}
        onChange={(next) => {
          setDraftPak(next);
          if (next) {
            onSavePakRecord({
              ...next,
              lessonPlanId: selectedPlan?.id || next.lessonPlanId || '',
            });
          }
        }}
        onApplyToRpm={(pak) => {
          if (selectedPlan) {
            const enrichedCore = applyPakIntegrationToRpmCore(selectedPlan.content, pak);
            onApplyPakToDocument(
              {
                ...selectedPlan,
                content: enrichedCore,
                pakIntegration: { ...pak, lessonPlanId: selectedPlan.id, applied: true, ignored: false },
                updatedAt: new Date().toISOString(),
              },
              { ...pak, lessonPlanId: selectedPlan.id, applied: true, ignored: false },
            );
          } else {
            onNotify('info', 'Pilih RPM untuk Menerapkan', 'Pilih salah satu RPM pada daftar di atas agar rekomendasi masuk ke dokumen RPM.');
          }
        }}
        onIgnore={(pak) => {
          if (selectedPlan && pak) {
            const stripped = stripPakIntegrationFromRpmCore(selectedPlan.content);
            onApplyPakToDocument(
              {
                ...selectedPlan,
                content: stripped,
                pakIntegration: { ...pak, lessonPlanId: selectedPlan.id, applied: false, ignored: true },
                updatedAt: new Date().toISOString(),
              },
              { ...pak, lessonPlanId: selectedPlan.id, applied: false, ignored: true },
            );
          }
        }}
        onNotify={onNotify}
      />

      {/* 5 Elemen & 10 Subelemen Reference Matrix */}
      <section className="p-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-4">
        <div className="flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
          <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
            Kerangka Wajib 5 Elemen & 10 Subelemen Pendidikan Antikorupsi (SD)
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {PAK_ELEMENTS_FRAMEWORK.map((el) => (
            <div
              key={el.id}
              className="p-4 rounded-lg border border-slate-200 dark:border-slate-800 space-y-2 text-xs"
            >
              <p className="font-bold text-emerald-800 dark:text-emerald-400">
                {el.kode}: {el.nama}
              </p>
              <ul className="space-y-1 text-slate-800 dark:text-slate-200 font-medium">
                {el.subElements.map((s) => (
                  <li key={s.code}>
                    <span className="tabular-nums font-bold">{s.code}</span> {s.nama}
                  </li>
                ))}
              </ul>
              <p className="text-slate-500 dark:text-slate-400 pt-1 border-t border-slate-100 dark:border-slate-800">
                Contoh SD: {el.contohKonteksSd.slice(0, 3).join(' ')}
              </p>
            </div>
          ))}
        </div>

        <div className="pt-3 border-t border-slate-200 dark:border-slate-800">
          <p className="text-xs font-bold text-slate-900 dark:text-slate-100 mb-2">
            Referensi Resmi Eksternal
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 text-xs">
            {PAK_OFFICIAL_REFERENCES.map((ref) => (
              <a
                key={ref.id}
                href={ref.url}
                target="_blank"
                rel="noopener noreferrer"
                className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 flex items-start justify-between gap-2"
              >
                <div className="min-w-0">
                  <p className="font-semibold text-slate-900 dark:text-slate-100 truncate">
                    {ref.lembaga} — {ref.judul}
                  </p>
                  <p className="text-slate-500 dark:text-slate-400 mt-0.5">{ref.catatanPenggunaan}</p>
                </div>
                <ExternalLink className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-400 shrink-0 mt-0.5" />
              </a>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
