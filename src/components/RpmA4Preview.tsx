import React from 'react';
import { AlertTriangle } from 'lucide-react';
import type { ExportConfig, RpmDocument } from '../types/rpm';

export function RpmA4Preview({
  docData,
  config,
}: {
  docData: RpmDocument;
  config: ExportConfig;
}) {
  const c = docData.content;
  const allSteps = [
    ...c.pengalamanBelajar.pendahuluan,
    ...c.pengalamanBelajar.inti.memahami,
    ...c.pengalamanBelajar.inti.mengaplikasi,
    ...c.pengalamanBelajar.inti.merefleksi,
    ...c.pengalamanBelajar.penutup,
  ];

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
            <span>{c.identitas.namaSatuanPendidikan}</span>
            <span>
              {c.identitas.mataPelajaran} · {c.identitas.kelas}
            </span>
          </div>
        )}

        {/* Document Header */}
        <header className="text-center pb-4 mb-5 border-b-2 border-emerald-700">
          <h2 className="font-display text-lg font-bold tracking-tight text-emerald-900">
            RENCANA PEMBELAJARAN MENDALAM (RPM)
          </h2>
          <p className="text-xs font-semibold text-slate-700 mt-1">
            {c.identitas.namaSatuanPendidikan} · Kurikulum Merdeka · Pendekatan Deep Learning
          </p>
        </header>

        {/* CP Verification Notice if applicable */}
        {c.desain.cpPerluVerifikasi && (
          <div className="mb-5 p-3 rounded-lg border border-amber-300 bg-amber-50 text-amber-950 text-xs flex items-start gap-2 no-print">
            <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
            <span>
              <strong>Catatan Verifikasi CP:</strong> Teks Capaian Pembelajaran (CP) di bawah ini
              merupakan draf pedagogis AI. Mohon verifikasi kembali kesesuaiannya dengan dokumen CP
              resmi satuan pendidikan sebelum disahkan.
            </span>
          </div>
        )}

        {/* A. IDENTITAS */}
        <section className="mb-5">
          <h3 className="font-display font-bold text-emerald-900 border-b border-emerald-200 pb-1 mb-2.5">
            A. IDENTITAS PEMBELAJARAN
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse border border-slate-300 text-left">
              <tbody>
                {[
                  ['Satuan Pendidikan', c.identitas.namaSatuanPendidikan],
                  [
                    'Nama Guru',
                    c.identitas.namaGuru + (c.identitas.nipGuru ? ` (NIP. ${c.identitas.nipGuru})` : ''),
                  ],
                  ['Mata Pelajaran', c.identitas.mataPelajaran],
                  ['Kelas / Fase', `${c.identitas.kelas} / Fase ${c.identitas.fase}`],
                  ['Semester / Tahun Ajaran', `Semester ${c.identitas.semester} / ${c.identitas.tahunAjaran}`],
                  ['Materi / Topik', c.identitas.materi || '-'],
                  ['Alokasi Waktu', c.identitas.alokasiWaktu],
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

        {/* B. IDENTIFIKASI */}
        <section className="mb-5 space-y-2">
          <h3 className="font-display font-bold text-emerald-900 border-b border-emerald-200 pb-1 mb-2.5">
            B. IDENTIFIKASI
          </h3>
          <p>
            <strong>Karakteristik Peserta Didik:</strong> {c.identifikasi.karakteristikPesertaDidik}
          </p>
          <p>
            <strong>Pengetahuan Awal:</strong> {c.identifikasi.pengetahuanAwal}
          </p>
          <p>
            <strong>Kebutuhan Belajar:</strong> {c.identifikasi.kebutuhanBelajar}
          </p>
          <p>
            <strong>Potensi dan Minat:</strong> {c.identifikasi.potensiMinat}
          </p>
          <p>
            <strong>Konteks Lingkungan Sekolah:</strong> {c.identifikasi.konteksLingkunganSekolah}
          </p>
          <p>
            <strong>Materi Pembelajaran:</strong> {c.identifikasi.materiPembelajaran}
          </p>
          <div>
            <strong>Dimensi Profil Lulusan yang Relevan:</strong>
            <ul className="list-disc pl-5 mt-1 space-y-1">
              {c.identifikasi.dimensiProfilLulusan.map((d) => (
                <li key={d.id}>
                  <strong>{d.nama}:</strong> {d.alasanRelevansi}
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* C. DESAIN PEMBELAJARAN */}
        <section className="mb-5 space-y-2">
          <h3 className="font-display font-bold text-emerald-900 border-b border-emerald-200 pb-1 mb-2.5">
            C. DESAIN PEMBELAJARAN
          </h3>
          <p>
            <strong>Capaian Pembelajaran (CP):</strong> {c.desain.capaianPembelajaran}
          </p>
          <div>
            <strong>Tujuan Pembelajaran (TP):</strong>
            <ol className="list-decimal pl-5 mt-1 space-y-1">
              {c.desain.tujuanPembelajaran.map((tp, i) => (
                <li key={i}>{tp}</li>
              ))}
            </ol>
          </div>
          <div>
            <strong>Kriteria Ketercapaian Tujuan Pembelajaran (KKTP):</strong>
            <ul className="list-disc pl-5 mt-1 space-y-1">
              {c.desain.kriteriaKetercapaian.map((k, i) => (
                <li key={i}>{k}</li>
              ))}
            </ul>
          </div>
          <p>
            <strong>Topik Pembelajaran:</strong> {c.desain.topikPembelajaran}
          </p>
          <p>
            <strong>Praktik Pedagogis:</strong> {c.desain.praktikPedagogis}
          </p>
          <p>
            <strong>Model & Metode Pembelajaran:</strong> {c.desain.modelPembelajaran} —{' '}
            {c.desain.metodePembelajaran}
          </p>
          <p>
            <strong>Kemitraan Pembelajaran:</strong> {c.desain.kemitraanPembelajaran}
          </p>
          <p>
            <strong>Lingkungan Pembelajaran:</strong> {c.desain.lingkunganPembelajaran}
          </p>
          <p>
            <strong>Pemanfaatan Digital:</strong> {c.desain.pemanfaatanDigital}
          </p>
          <p>
            <strong>Media & Sumber Belajar:</strong> {c.desain.mediaSumberBelajar.join(', ')}
          </p>
          {c.desain.keterkaitanPedagogis && (
            <p>
              <strong>Keterkaitan Pedagogis (CP–TP–Dimensi–Pengalaman–Asesmen):</strong>{' '}
              {c.desain.keterkaitanPedagogis}
            </p>
          )}
        </section>

        {/* D. PENGALAMAN BELAJAR */}
        <section className="mb-5">
          <h3 className="font-display font-bold text-emerald-900 border-b border-emerald-200 pb-1 mb-2.5">
            D. PENGALAMAN BELAJAR
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse border border-slate-300 text-left">
              <thead>
                <tr className="bg-emerald-800 text-white">
                  <th className="px-2.5 py-2 border border-slate-300 w-[22%]">Tahap & Prinsip</th>
                  <th className="px-2.5 py-2 border border-slate-300 w-[29%]">Aktivitas Guru</th>
                  <th className="px-2.5 py-2 border border-slate-300 w-[29%]">
                    Aktivitas Peserta Didik
                  </th>
                  <th className="px-2.5 py-2 border border-slate-300 w-[20%]">Waktu & Tujuan</th>
                </tr>
              </thead>
              <tbody>
                {allSteps.map((step, idx) => (
                  <tr key={`${step.id}-${idx}`} className="border-b border-slate-300">
                    <td className="px-2.5 py-2 border-r border-slate-300 align-top">
                      <p className="font-bold text-emerald-900">
                        {step.tahap}: {step.namaAktivitas}
                      </p>
                      <p className="text-[11px] text-slate-600 mt-1">
                        Prinsip: {step.prinsip.join(', ')}
                      </p>
                      <p className="text-[11px] text-slate-600">Metode: {step.metodeStrategi}</p>
                    </td>
                    <td className="px-2.5 py-2 border-r border-slate-300 align-top">
                      {step.aktivitasGuru}
                    </td>
                    <td className="px-2.5 py-2 border-r border-slate-300 align-top">
                      {step.aktivitasPesertaDidik}
                    </td>
                    <td className="px-2.5 py-2 align-top">
                      <p className="font-semibold tabular-nums">{step.alokasiWaktuMenit} menit</p>
                      <p className="text-[11px] text-slate-600 mt-1">{step.tujuanAktivitas}</p>
                      {step.nilaiPakDikembangkan && step.nilaiPakDikembangkan.length > 0 && (
                        <p className="text-[11px] font-semibold text-emerald-800 mt-1">
                          Nilai PAK: {step.nilaiPakDikembangkan.join(', ')}
                        </p>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* E. ASESMEN */}
        <section className="mb-5">
          <h3 className="font-display font-bold text-emerald-900 border-b border-emerald-200 pb-1 mb-2.5">
            E. ASESMEN PEMBELAJARAN
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse border border-slate-300 text-left">
              <thead>
                <tr className="bg-emerald-800 text-white">
                  <th className="px-2.5 py-2 border border-slate-300 w-[16%]">Jenis</th>
                  <th className="px-2.5 py-2 border border-slate-300 w-[28%]">Tujuan & Teknik</th>
                  <th className="px-2.5 py-2 border border-slate-300 w-[30%]">
                    Instrumen & Indikator
                  </th>
                  <th className="px-2.5 py-2 border border-slate-300 w-[26%]">
                    Kriteria Keberhasilan
                  </th>
                </tr>
              </thead>
              <tbody>
                {[
                  ['Diagnostik', c.asesmen.diagnostik],
                  ['Formatif', c.asesmen.formatif],
                  ['Sumatif', c.asesmen.sumatif],
                ].map(([jenis, b]) => {
                  const block = b as typeof c.asesmen.diagnostik;
                  return (
                    <tr key={String(jenis)} className="border-b border-slate-300">
                      <td className="px-2.5 py-2 border-r border-slate-300 font-bold align-top">
                        {String(jenis)}
                      </td>
                      <td className="px-2.5 py-2 border-r border-slate-300 align-top">
                        <p>
                          <strong>Tujuan:</strong> {block.tujuan}
                        </p>
                        <p className="mt-1">
                          <strong>Teknik:</strong> {block.teknik}
                        </p>
                      </td>
                      <td className="px-2.5 py-2 border-r border-slate-300 align-top">
                        <p>
                          <strong>Instrumen:</strong> {block.instrumen}
                        </p>
                        <p className="mt-1">
                          <strong>Indikator:</strong> {block.indikatorPenilaian}
                        </p>
                      </td>
                      <td className="px-2.5 py-2 align-top">{block.kriteriaKeberhasilan}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        {/* F. DIFERENSIASI */}
        <section className="mb-5 space-y-1.5">
          <h3 className="font-display font-bold text-emerald-900 border-b border-emerald-200 pb-1 mb-2.5">
            F. DIFERENSIASI PEMBELAJARAN
          </h3>
          <p>
            <strong>Diferensiasi Konten:</strong> {c.diferensiasi.konten}
          </p>
          <p>
            <strong>Diferensiasi Proses:</strong> {c.diferensiasi.proses}
          </p>
          <p>
            <strong>Diferensiasi Produk:</strong> {c.diferensiasi.produk}
          </p>
        </section>

        {/* G. REFLEKSI */}
        <section className="mb-5 space-y-2">
          <h3 className="font-display font-bold text-emerald-900 border-b border-emerald-200 pb-1 mb-2.5">
            G. REFLEKSI
          </h3>
          <div>
            <strong>Refleksi Guru:</strong>
            <ul className="list-disc pl-5 mt-1">
              {c.refleksi.refleksiGuru.map((r, i) => (
                <li key={i}>{r}</li>
              ))}
            </ul>
          </div>
          <div>
            <strong>Refleksi Peserta Didik:</strong>
            <ul className="list-disc pl-5 mt-1">
              {c.refleksi.refleksiPesertaDidik.map((r, i) => (
                <li key={i}>{r}</li>
              ))}
            </ul>
          </div>
        </section>

        {/* INTEGRASI PENDIDIKAN ANTIKORUPSI (PAK) */}
        {docData.pakIntegration && !docData.pakIntegration.ignored && (
          <section className="mb-5 space-y-2.5 pt-3 border-t border-slate-300">
            <h3 className="font-display font-bold text-emerald-900 border-b border-emerald-200 pb-1 mb-2.5">
              INTEGRASI PENDIDIKAN ANTIKORUPSI (PAK)
            </h3>
            {docData.pakIntegration.applied &&
            docData.pakIntegration.relevanceStatus !== 'tidak_relevan_langsung' ? (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse border border-slate-300 text-left">
                    <thead>
                      <tr className="bg-emerald-800 text-white">
                        <th className="w-52 px-3 py-1.5 border border-slate-300">Komponen</th>
                        <th className="px-3 py-1.5 border border-slate-300">Hasil Pemetaan</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[
                        [
                          'Elemen PAK',
                          docData.pakIntegration.elements
                            .map((e) => `${e.kode}: ${e.nama} (${e.peran})`)
                            .join(' · '),
                        ],
                        [
                          'Subelemen PAK',
                          docData.pakIntegration.subElements
                            .map((s) => `${s.code} ${s.nama}`)
                            .join('; '),
                        ],
                        [
                          'Relevansi',
                          `${docData.pakIntegration.relevanceLabel} — ${docData.pakIntegration.relevanceReason}`,
                        ],
                        [
                          'Nilai yang dikembangkan',
                          docData.pakIntegration.nilaiAntikorupsi.join(', '),
                        ],
                        [
                          'Tujuan penguatan',
                          docData.pakIntegration.learningObjectives.join('; ') || '-',
                        ],
                        [
                          'Bentuk integrasi',
                          docData.pakIntegration.integrasiRpmRingkasan.desainKarakter ||
                            docData.pakIntegration.integrasiRpmRingkasan.aktivitasGuruSiswa ||
                            'Terintegrasi dalam Pendahuluan, Inti, Penutup, Asesmen, dan Refleksi.',
                        ],
                      ].map(([komp, hasil]) => (
                        <tr key={komp} className="border-b border-slate-300">
                          <th className="w-52 bg-emerald-50/70 px-3 py-1.5 font-semibold text-slate-800 border-r border-slate-300 align-top">
                            {komp}
                          </th>
                          <td className="px-3 py-1.5 text-slate-900 align-top">{hasil}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

              {docData.pakIntegration.learningObjectives.length > 0 && (
                <div>
                  <strong>Tujuan Penguatan Karakter (Melengkapi TP Utama):</strong>
                  <ol className="list-decimal pl-5 mt-1 space-y-1">
                    {docData.pakIntegration.learningObjectives.map((obj, idx) => (
                      <li key={idx}>{obj}</li>
                    ))}
                  </ol>
                </div>
              )}

              {docData.pakIntegration.materials.map((m, idx) => (
                <div key={idx} className="p-2.5 rounded border border-slate-300 bg-slate-50/50 space-y-1">
                  <p>
                    <strong>Materi PAK ({idx + 1}): {m.namaMateri}</strong>{' '}
                    <span className="text-[11px] text-slate-600">(Disusun AI untuk telaah guru)</span>
                  </p>
                  <p>{m.penjelasanMateri}</p>
                  {m.contohPenerapan.length > 0 && (
                    <p>
                      <strong>Contoh Penerapan Sehari-hari:</strong> {m.contohPenerapan.join('; ')}
                    </p>
                  )}
                </div>
              ))}

              {docData.pakIntegration.activities.length > 0 && (
                <div>
                  <strong>Aktivitas Penguatan Karakter SD:</strong>
                  <ul className="list-disc pl-5 mt-1 space-y-1">
                    {docData.pakIntegration.activities.map((act, idx) => (
                      <li key={idx}>
                        <strong>
                          {act.judul} ({act.jenisAktivitas} · {act.alokasiWaktuMenit} menit ·{' '}
                          {act.prinsipPembelajaranMendalam.join(', ')}):
                        </strong>{' '}
                        {act.peranPesertaDidik} Indikator: {act.indikatorKeberhasilan}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="space-y-1">
                <p>
                  <strong>Asesmen PAK:</strong> Pengetahuan ({docData.pakIntegration.assessments.pengetahuan.bentukInstrumen}) ·
                  Sikap ({docData.pakIntegration.assessments.sikapPerilaku.teknikObservasi}) ·
                  Praktik ({docData.pakIntegration.assessments.praktik.kriteriaPengamatan})
                </p>
                {docData.pakIntegration.assessments.rubrikPerkembangan.length > 0 && (
                  <div className="overflow-x-auto mt-1.5">
                    <table className="w-full border-collapse border border-slate-300 text-left text-[11px]">
                      <thead>
                        <tr className="bg-emerald-800 text-white">
                          <th className="px-2 py-1.5 border border-slate-300">Aspek</th>
                          <th className="px-2 py-1.5 border border-slate-300">Sangat Berkembang</th>
                          <th className="px-2 py-1.5 border border-slate-300">Berkembang Sesuai Harapan</th>
                          <th className="px-2 py-1.5 border border-slate-300">Mulai Berkembang</th>
                          <th className="px-2 py-1.5 border border-slate-300">Memerlukan Bimbingan</th>
                        </tr>
                      </thead>
                      <tbody>
                        {docData.pakIntegration.assessments.rubrikPerkembangan.map((row, rIdx) => (
                          <tr key={rIdx} className="border-b border-slate-300">
                            <td className="px-2 py-1.5 border-r border-slate-300 font-semibold">{row.aspek}</td>
                            <td className="px-2 py-1.5 border-r border-slate-300">{row.sangatBerkembang}</td>
                            <td className="px-2 py-1.5 border-r border-slate-300">{row.berkembangSesuaiHarapan}</td>
                            <td className="px-2 py-1.5 border-r border-slate-300">{row.mulaiBerkembang}</td>
                            <td className="px-2 py-1.5">{row.memerlukanBimbingan}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
                <p className="text-[11px] text-slate-600">
                  <strong>Catatan Pembinaan:</strong>{' '}
                  {docData.pakIntegration.assessments.catatanPembinaanNonLabeling}
                </p>
              </div>

              <p className="text-[11px] text-slate-600">
                <strong>Rujukan Kerangka PAK:</strong>{' '}
                {docData.pakIntegration.references
                  .slice(0, 4)
                  .map((r) => `${r.lembaga} — ${r.judul} (${r.url})`)
                  .join('; ')}
              </p>
              </>
            ) : (
              <div className="p-3 rounded border border-slate-300 bg-slate-50/70 text-xs space-y-1">
                <p>
                  <strong>Status Relevansi PAK:</strong> {docData.pakIntegration.relevanceLabel}.
                  Berdasarkan analisis materi pembelajaran, integrasi Pendidikan Antikorupsi tidak
                  direkomendasikan secara langsung pada topik ini agar fokus tujuan akademik tetap
                  terjaga.
                </p>
                {docData.pakIntegration.alternatifPenguatan && (
                  <p>
                    <strong>Pembiasaan Karakter Alami:</strong>{' '}
                    {docData.pakIntegration.alternatifPenguatan}
                  </p>
                )}
              </div>
            )}
          </section>
        )}

        {/* Lampiran Perangkat jika sudah dibuat */}
        {docData.perangkat.lkpd && (
          <section className="mb-5 pt-3 border-t border-slate-300 space-y-2">
            <h3 className="font-display font-bold text-emerald-900 border-b border-emerald-200 pb-1 mb-2">
              LAMPIRAN: LEMBAR KERJA PESERTA DIDIK (LKPD)
            </h3>
            <p className="font-bold">{docData.perangkat.lkpd.judul}</p>
            <p className="text-xs text-slate-700">{docData.perangkat.lkpd.identitasPesertaDidik}</p>
            <p>
              <strong>Tujuan Kegiatan:</strong> {docData.perangkat.lkpd.tujuanKegiatan}
            </p>
            <p>
              <strong>Materi Pengantar:</strong> {docData.perangkat.lkpd.materiPengantar}
            </p>
            <div>
              <strong>Langkah Aktivitas:</strong>
              <ol className="list-decimal pl-5 mt-1 space-y-1">
                {docData.perangkat.lkpd.aktivitas.map((a) => (
                  <li key={a.nomor}>
                    <strong>{a.judul}:</strong> {a.instruksi}
                  </li>
                ))}
              </ol>
            </div>
            <div>
              <strong>Pertanyaan & Ruang Jawaban:</strong>
              <ol className="list-decimal pl-5 mt-1 space-y-2">
                {docData.perangkat.lkpd.pertanyaan.map((q) => (
                  <li key={q.nomor}>
                    <p>{q.pertanyaan}</p>
                    <div className="mt-1 p-2 border border-dashed border-slate-300 text-xs text-slate-500">
                      Ruang jawaban: {q.ruangJawabanHint}
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          </section>
        )}

        {/* H. PENGESAHAN */}
        {config.showPengesahan && (
          <section className="mt-8 pt-4">
            <h3 className="font-display font-bold text-emerald-900 border-b border-emerald-200 pb-1 mb-4">
              H. PENGESAHAN
            </h3>
            <div className="grid grid-cols-2 gap-8">
              <div>
                <p>Mengetahui,</p>
                <p>{c.pengesahan.jabatanKepalaSekolah || 'Kepala SDN Randusari'}</p>
                <div className="h-16" />
                <p className="font-bold">
                  {c.pengesahan.namaKepalaSekolah || '(__________________________)'}
                </p>
                <p>
                  {c.pengesahan.nipKepalaSekolah ? `NIP. ${c.pengesahan.nipKepalaSekolah}` : 'NIP. -'}
                </p>
              </div>

              <div>
                <p>
                  {c.pengesahan.tempat}, {c.pengesahan.tanggal}
                </p>
                <p>Guru Kelas / Mata Pelajaran</p>
                <div className="h-16" />
                <p className="font-bold">
                  {c.pengesahan.namaGuru || c.identitas.namaGuru || '(__________________________)'}
                </p>
                <p>
                  {c.pengesahan.nipGuru || c.identitas.nipGuru
                    ? `NIP. ${c.pengesahan.nipGuru || c.identitas.nipGuru}`
                    : 'NIP. -'}
                </p>
              </div>
            </div>
          </section>
        )}

        {(config.showFooter || config.showPageNumbers) && (
          <footer className="mt-8 pt-2 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-500">
            <span>{config.showFooter ? 'AI RPM SDN Randusari · Kurikulum Merdeka' : ''}</span>
            <span>{config.showPageNumbers ? 'Halaman 1 (Pratinjau A4)' : ''}</span>
          </footer>
        )}
      </article>
    </div>
  );
}
