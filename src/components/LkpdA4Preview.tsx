import React from 'react';
import type { ExportConfig, LkpdKit, RpmDocument } from '../types/rpm';
import { buildLkpdPakSummaryFromRecord, getGradeBandGuidance } from '../utils/lkpd';

export function LkpdA4Preview({
  docData,
  lkpd,
  config,
}: {
  docData: RpmDocument;
  lkpd: LkpdKit;
  config: ExportConfig;
}) {
  const c = docData.content;
  const isLandscape = config.orientation === 'landscape';
  const fontSizeClass =
    config.fontSize === 10
      ? 'text-[12px]'
      : config.fontSize === 12
        ? 'text-[14.5px]'
        : 'text-[13.5px]';
  const paddingStyle = {
    padding: `${config.marginMm}px`,
  };

  const pakSummary = lkpd.integrasiPak || buildLkpdPakSummaryFromRecord(docData.pakIntegration);
  const tps =
    lkpd.tujuanPembelajaran && lkpd.tujuanPembelajaran.length > 0
      ? lkpd.tujuanPembelajaran
      : c.desain.tujuanPembelajaran;
  const gradeGuide = getGradeBandGuidance(c.identitas.kelas, c.identitas.fase);

  return (
    <div className="overflow-x-auto pb-4">
      <article
        style={paddingStyle}
        className={`print-only-container mx-auto bg-white text-slate-900 border border-slate-300 shadow-sm leading-relaxed ${fontSizeClass} ${
          isLandscape ? 'w-full max-w-[1050px]' : 'w-full max-w-[794px]'
        }`}
      >
        {config.showHeader && (
          <div className="pb-2 mb-4 border-b border-slate-200 flex items-center justify-between text-[11px] text-slate-500">
            <span>{lkpd.identitas?.namaSekolah || c.identitas.namaSatuanPendidikan}</span>
            <span>
              LKPD · {c.identitas.mataPelajaran} · {c.identitas.kelas}
            </span>
          </div>
        )}

        {/* Header */}
        <header className="text-center pb-4 mb-5 border-b-2 border-emerald-700">
          <h2 className="font-display text-lg font-bold tracking-tight text-emerald-900">
            LEMBAR KERJA PESERTA DIDIK (LKPD)
          </h2>
          <p className="text-xs font-semibold text-slate-700 mt-1">
            {lkpd.identitas?.namaSekolah || c.identitas.namaSatuanPendidikan} · {gradeGuide.band}
          </p>
        </header>

        {/* 1. IDENTITAS LKPD */}
        <section className="mb-5">
          <h3 className="font-display font-bold text-emerald-900 border-b border-emerald-200 pb-1 mb-2.5">
            1. IDENTITAS LKPD
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse border border-slate-300 text-left">
              <tbody>
                {[
                  ['Nama Sekolah', lkpd.identitas?.namaSekolah || c.identitas.namaSatuanPendidikan],
                  ['Mata Pelajaran', lkpd.identitas?.mataPelajaran || c.identitas.mataPelajaran],
                  [
                    'Kelas / Fase',
                    `${lkpd.identitas?.kelas || c.identitas.kelas} / Fase ${lkpd.identitas?.fase || c.identitas.fase}`,
                  ],
                  [
                    'Semester / Tahun Ajaran',
                    `Semester ${lkpd.identitas?.semester || c.identitas.semester} / ${lkpd.identitas?.tahunAjaran || c.identitas.tahunAjaran}`,
                  ],
                  ['Materi', lkpd.identitas?.materi || c.identitas.materi],
                  ['Alokasi Waktu', lkpd.identitas?.alokasiWaktu || c.identitas.alokasiWaktu],
                  ['Nama Peserta Didik', '........................................................................'],
                  ['Nomor Absen', '..........................'],
                ].map(([label, val]) => (
                  <tr key={label} className="border-b border-slate-300">
                    <th className="w-48 bg-emerald-50/70 px-3 py-1.5 font-semibold text-slate-800 border-r border-slate-300 align-top">
                      {label}
                    </th>
                    <td className="px-3 py-1.5 text-slate-900 align-top">{val}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* 2. JUDUL KEGIATAN */}
        <section className="mb-5">
          <h3 className="font-display font-bold text-emerald-900 border-b border-emerald-200 pb-1 mb-2">
            2. JUDUL KEGIATAN
          </h3>
          <p className="font-bold text-slate-900">{lkpd.judul}</p>
        </section>

        {/* 3. TUJUAN PEMBELAJARAN */}
        <section className="mb-5">
          <h3 className="font-display font-bold text-emerald-900 border-b border-emerald-200 pb-1 mb-2">
            3. TUJUAN PEMBELAJARAN
          </h3>
          <ol className="list-decimal pl-5 space-y-1">
            {tps.map((tp, idx) => (
              <li key={idx}>{tp}</li>
            ))}
          </ol>
          {lkpd.tujuanKegiatan && (
            <p className="mt-2 text-xs text-slate-700">
              <strong>Fokus Kegiatan Siswa:</strong> {lkpd.tujuanKegiatan}
            </p>
          )}
        </section>

        {/* 4. INTEGRASI PENDIDIKAN ANTIKORUPSI */}
        <section className="mb-5">
          <h3 className="font-display font-bold text-emerald-900 border-b border-emerald-200 pb-1 mb-2">
            4. INTEGRASI PENDIDIKAN ANTIKORUPSI
          </h3>
          {pakSummary.relevanLangsung ? (
            <div className="p-3 rounded border border-emerald-300 bg-emerald-50/40 space-y-1.5 text-xs">
              <p>
                <strong>Elemen PAK:</strong> {pakSummary.elemenPak.join(' · ')}
              </p>
              <p>
                <strong>Subelemen PAK:</strong> {pakSummary.subelemenPak.join('; ')}
              </p>
              <p>
                <strong>Nilai Karakter yang Dikembangkan:</strong>{' '}
                {pakSummary.nilaiKarakter.join(', ')}
              </p>
              <div>
                <strong>Perilaku Positif yang Diharapkan:</strong>
                <ul className="list-disc pl-5 mt-1 space-y-0.5">
                  {pakSummary.perilakuDiharapkan.map((p, i) => (
                    <li key={i}>{p}</li>
                  ))}
                </ul>
              </div>
            </div>
          ) : (
            <p className="text-xs text-slate-700">
              {pakSummary.catatan ||
                'Topik ini berfokus pada kompetensi inti pembelajaran; sikap jujur dan tertib tetap dibiasakan saat mengerjakan LKPD.'}
            </p>
          )}
        </section>

        {/* 5. PETUNJUK PENGERJAAN */}
        <section className="mb-5">
          <h3 className="font-display font-bold text-emerald-900 border-b border-emerald-200 pb-1 mb-2">
            5. PETUNJUK PENGERJAAN
          </h3>
          <ol className="list-decimal pl-5 space-y-1">
            {lkpd.petunjukPengerjaan.map((step, i) => (
              <li key={i}>{step}</li>
            ))}
          </ol>
        </section>

        {/* 6. MATERI PENGANTAR */}
        <section className="mb-5">
          <h3 className="font-display font-bold text-emerald-900 border-b border-emerald-200 pb-1 mb-2">
            6. MATERI PENGANTAR
          </h3>
          <p className="p-3 rounded border border-slate-200 bg-slate-50/70">
            {lkpd.materiPengantar}
          </p>
        </section>

        {/* 7. KEGIATAN PESERTA DIDIK */}
        <section className="mb-5">
          <h3 className="font-display font-bold text-emerald-900 border-b border-emerald-200 pb-1 mb-2">
            7. KEGIATAN PESERTA DIDIK
          </h3>
          <div className="space-y-3">
            {lkpd.aktivitas.map((act) => (
              <div key={act.nomor} className="p-3 rounded border border-slate-300 space-y-1">
                <p className="font-bold text-emerald-900">
                  Kegiatan {act.nomor}: {act.judul}
                  {act.jenisAktivitas ? (
                    <span className="font-normal text-xs text-slate-600">
                      {' '}
                      ({act.jenisAktivitas})
                    </span>
                  ) : null}
                </p>
                <p>{act.instruksi}</p>
                {act.langkahSingkat && act.langkahSingkat.length > 0 && (
                  <ol className="list-decimal pl-5 text-xs space-y-0.5 pt-1">
                    {act.langkahSingkat.map((l, idx) => (
                      <li key={idx}>{l}</li>
                    ))}
                  </ol>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* 8. LATIHAN DAN TUGAS */}
        <section className="mb-5">
          <h3 className="font-display font-bold text-emerald-900 border-b border-emerald-200 pb-1 mb-2">
            8. LATIHAN DAN TUGAS
          </h3>
          <div className="space-y-4">
            {lkpd.pertanyaan.map((q) => {
              const lineCount = Math.max(2, Math.min(6, q.barisRuangJawaban || 3));
              return (
                <div key={q.nomor} className="space-y-1.5">
                  <p className="font-semibold">
                    {q.nomor}. {q.pertanyaan}{' '}
                    {q.tingkatKesulitan && (
                      <span className="font-normal text-xs text-slate-500">
                        [{q.tingkatKesulitan}]
                      </span>
                    )}
                  </p>
                  <div className="p-2.5 rounded border border-dashed border-slate-400 space-y-3">
                    <p className="text-[11px] text-slate-500 italic">{q.ruangJawabanHint}</p>
                    {Array.from({ length: lineCount }).map((_, idx) => (
                      <div key={idx} className="border-b border-dotted border-slate-300 h-4" />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* 9. AKTIVITAS PENGUATAN PAK */}
        {lkpd.aktivitasPenguatanPak?.relevan && (
          <section className="mb-5">
            <h3 className="font-display font-bold text-emerald-900 border-b border-emerald-200 pb-1 mb-2">
              9. AKTIVITAS PENGUATAN PENDIDIKAN ANTIKORUPSI
            </h3>
            <div className="p-3 rounded border border-emerald-300 bg-emerald-50/30 space-y-1.5">
              <p className="font-bold text-emerald-900">
                {lkpd.aktivitasPenguatanPak.judul} ({lkpd.aktivitasPenguatanPak.bentuk})
              </p>
              <p>{lkpd.aktivitasPenguatanPak.skenarioAtauInstruksi}</p>
              {lkpd.aktivitasPenguatanPak.pertanyaanPanduan.length > 0 && (
                <ol className="list-decimal pl-5 space-y-1 pt-1">
                  {lkpd.aktivitasPenguatanPak.pertanyaanPanduan.map((pq, i) => (
                    <li key={i}>
                      <p>{pq}</p>
                      <div className="mt-1 mb-2 border-b border-dotted border-slate-400 h-5" />
                    </li>
                  ))}
                </ol>
              )}
            </div>
          </section>
        )}

        {/* 10. REFLEKSI PESERTA DIDIK */}
        <section className="mb-5">
          <h3 className="font-display font-bold text-emerald-900 border-b border-emerald-200 pb-1 mb-2">
            {lkpd.aktivitasPenguatanPak?.relevan ? '10.' : '9.'} REFLEKSI PESERTA DIDIK
          </h3>
          <div className="space-y-3">
            {lkpd.refleksiSiswa.map((ref, idx) => (
              <div key={idx}>
                <p>
                  {idx + 1}. {ref}
                </p>
                <div className="mt-1 border-b border-dotted border-slate-400 h-5" />
              </div>
            ))}
          </div>
        </section>

        {/* 11. KESIMPULAN */}
        <section className="mb-5">
          <h3 className="font-display font-bold text-emerald-900 border-b border-emerald-200 pb-1 mb-2">
            {lkpd.aktivitasPenguatanPak?.relevan ? '11.' : '10.'} KESIMPULAN
          </h3>
          <p className="mb-1.5">{lkpd.kesimpulan?.prompt}</p>
          <div className="p-2.5 rounded border border-dashed border-slate-400 space-y-3">
            <p className="text-[11px] text-slate-500 italic">
              {lkpd.kesimpulan?.ruangKesimpulanHint}
            </p>
            <div className="border-b border-dotted border-slate-300 h-4" />
            <div className="border-b border-dotted border-slate-300 h-4" />
            <div className="border-b border-dotted border-slate-300 h-4" />
          </div>
        </section>

        {/* 12. PENILAIAN */}
        {lkpd.penilaian && (
          <section className="mb-4">
            <h3 className="font-display font-bold text-emerald-900 border-b border-emerald-200 pb-1 mb-2">
              {lkpd.aktivitasPenguatanPak?.relevan ? '12.' : '11.'} PENILAIAN
            </h3>
            <p className="mb-1">
              <strong>Indikator Penilaian:</strong>{' '}
              {lkpd.penilaian.indikatorPenilaian.join('; ')}
            </p>
            <p className="mb-2">
              <strong>Kriteria Keberhasilan:</strong> {lkpd.penilaian.kriteriaKeberhasilan}
            </p>
            {lkpd.penilaian.rubrikSederhana.length > 0 && (
              <div className="overflow-x-auto mb-3">
                <table className="w-full border-collapse border border-slate-300 text-left text-xs">
                  <thead>
                    <tr className="bg-emerald-800 text-white">
                      <th className="px-2.5 py-1.5 border border-slate-300 w-[26%]">Aspek</th>
                      <th className="px-2.5 py-1.5 border border-slate-300 w-[37%]">Sangat Baik</th>
                      <th className="px-2.5 py-1.5 border border-slate-300 w-[37%]">
                        Perlu Bimbingan
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {lkpd.penilaian.rubrikSederhana.map((r, i) => (
                      <tr key={i} className="border-b border-slate-300">
                        <td className="px-2.5 py-1.5 border-r border-slate-300 font-semibold">
                          {r.aspek}
                        </td>
                        <td className="px-2.5 py-1.5 border-r border-slate-300">{r.sangatBaik}</td>
                        <td className="px-2.5 py-1.5">{r.perluBimbingan}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <div className="p-2.5 rounded border border-slate-300 text-xs">
              {lkpd.penilaian.catatanGuruLabel}
            </div>
          </section>
        )}

        {(config.showFooter || config.showPageNumbers) && (
          <footer className="mt-6 pt-2 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-500">
            <span>{config.showFooter ? 'LKPD Terintegrasi AI RPM SDN Randusari' : ''}</span>
            <span>{config.showPageNumbers ? 'Pratinjau A4 LKPD' : ''}</span>
          </footer>
        )}
      </article>
    </div>
  );
}
