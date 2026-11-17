import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { ExportConfig, LkpdKit, RpmDocument } from '../types/rpm';
import { buildLkpdPakSummaryFromRecord, getGradeBandGuidance } from '../utils/lkpd';

interface PdfCursor {
  y: number;
  margin: number;
  pageWidth: number;
  pageHeight: number;
  contentWidth: number;
  baseFont: number;
}

function createPdfHelpers(pdf: jsPDF, config: ExportConfig): {
  cur: PdfCursor;
  ensureSpace: (neededMm: number) => void;
  addSectionTitle: (title: string) => void;
  addParagraph: (text: string, label?: string) => void;
  applyChrome: (headerTitle: string, footerLabel: string) => void;
} {
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = config.marginMm;
  const contentWidth = pageWidth - margin * 2;
  const baseFont = config.fontSize;
  const cur: PdfCursor = {
    y: margin + 4,
    margin,
    pageWidth,
    pageHeight,
    contentWidth,
    baseFont,
  };

  const ensureSpace = (neededMm: number) => {
    if (cur.y + neededMm > cur.pageHeight - cur.margin - 8) {
      pdf.addPage();
      cur.y = cur.margin + 4;
    }
  };

  const addSectionTitle = (title: string) => {
    ensureSpace(12);
    cur.y += 4;
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(baseFont + 1.5);
    pdf.setTextColor(6, 95, 70);
    pdf.text(title, cur.margin, cur.y);
    cur.y += 2;
    pdf.setDrawColor(16, 185, 129);
    pdf.setLineWidth(0.4);
    pdf.line(cur.margin, cur.y, cur.pageWidth - cur.margin, cur.y);
    cur.y += 5;
    pdf.setTextColor(15, 23, 42);
  };

  const addParagraph = (text: string, label?: string) => {
    pdf.setFontSize(baseFont);
    const fullText = label ? `${label}: ${text || '-'}` : text || '-';
    const lines = pdf.splitTextToSize(fullText, cur.contentWidth) as string[];
    const lineHeight = baseFont * 0.44;
    ensureSpace(lines.length * lineHeight + 3);
    pdf.setFont('helvetica', 'normal');
    for (const line of lines) {
      ensureSpace(lineHeight + 2);
      pdf.text(line, cur.margin, cur.y);
      cur.y += lineHeight;
    }
    cur.y += 2;
  };

  const applyChrome = (headerTitle: string, footerLabel: string) => {
    const totalPages = pdf.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      pdf.setPage(i);
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(8.5);
      pdf.setTextColor(100, 116, 139);

      if (config.showHeader && i > 1) {
        pdf.text(headerTitle, cur.pageWidth - cur.margin, Math.max(8, cur.margin - 6), {
          align: 'right',
        });
      }

      const footerY = cur.pageHeight - Math.max(7, cur.margin - 8);
      if (config.showFooter) {
        pdf.text(footerLabel, cur.margin, footerY);
      }
      if (config.showPageNumbers) {
        pdf.text(`Halaman ${i} dari ${totalPages}`, cur.pageWidth - cur.margin, footerY, {
          align: 'right',
        });
      }
    }
  };

  return { cur, ensureSpace, addSectionTitle, addParagraph, applyChrome };
}

function renderRpmIntoPdf(
  pdf: jsPDF,
  docData: RpmDocument,
  config: ExportConfig,
  helpers: ReturnType<typeof createPdfHelpers>,
  includeLkpdSummary = false,
): void {
  const c = docData.content;
  const { cur, ensureSpace, addSectionTitle, addParagraph } = helpers;

  // Header Title
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(cur.baseFont + 4);
  pdf.setTextColor(6, 95, 70);
  pdf.text('RENCANA PEMBELAJARAN MENDALAM (RPM)', cur.pageWidth / 2, cur.y, { align: 'center' });
  cur.y += 6;
  pdf.setFontSize(cur.baseFont + 0.5);
  pdf.setTextColor(51, 65, 85);
  pdf.text(`${c.identitas.namaSatuanPendidikan} · Kurikulum Merdeka`, cur.pageWidth / 2, cur.y, {
    align: 'center',
  });
  cur.y += 6;
  pdf.setTextColor(15, 23, 42);

  // A. IDENTITAS
  addSectionTitle('A. IDENTITAS PEMBELAJARAN');
  autoTable(pdf, {
    startY: cur.y,
    margin: { left: cur.margin, right: cur.margin },
    theme: 'grid',
    styles: { fontSize: cur.baseFont - 1, cellPadding: 2.2, textColor: [15, 23, 42], overflow: 'linebreak' },
    columnStyles: {
      0: { cellWidth: 48, fontStyle: 'bold', fillColor: [236, 253, 245] },
      1: { cellWidth: cur.contentWidth - 48 },
    },
    body: [
      ['Satuan Pendidikan', c.identitas.namaSatuanPendidikan],
      ['Nama Guru', c.identitas.namaGuru + (c.identitas.nipGuru ? ` (NIP. ${c.identitas.nipGuru})` : '')],
      ['Mata Pelajaran', c.identitas.mataPelajaran],
      ['Kelas / Fase', `${c.identitas.kelas} / Fase ${c.identitas.fase}`],
      ['Semester / Tahun Ajaran', `Semester ${c.identitas.semester} / ${c.identitas.tahunAjaran}`],
      ['Materi / Topik', c.identitas.materi || '-'],
      ['Alokasi Waktu', c.identitas.alokasiWaktu],
    ],
  });
  cur.y = (pdf as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 5;

  // B. IDENTIFIKASI
  addSectionTitle('B. IDENTIFIKASI');
  addParagraph(c.identifikasi.karakteristikPesertaDidik, 'Karakteristik Peserta Didik');
  addParagraph(c.identifikasi.pengetahuanAwal, 'Pengetahuan Awal');
  addParagraph(c.identifikasi.kebutuhanBelajar, 'Kebutuhan Belajar');
  addParagraph(c.identifikasi.potensiMinat, 'Potensi & Minat');
  addParagraph(c.identifikasi.konteksLingkunganSekolah, 'Konteks Lingkungan Sekolah');
  addParagraph(c.identifikasi.materiPembelajaran, 'Materi Pembelajaran');
  addParagraph(
    c.identifikasi.dimensiProfilLulusan.map((d) => `${d.nama} (${d.alasanRelevansi})`).join('; '),
    'Dimensi Profil Lulusan',
  );

  // C. DESAIN PEMBELAJARAN
  addSectionTitle('C. DESAIN PEMBELAJARAN');
  addParagraph(
    c.desain.capaianPembelajaran +
      (c.desain.cpPerluVerifikasi ? ' [Perlu verifikasi dokumen resmi]' : ''),
    'Capaian Pembelajaran (CP)',
  );
  addParagraph(
    c.desain.tujuanPembelajaran.map((t, i) => `${i + 1}. ${t}`).join('  '),
    'Tujuan Pembelajaran (TP)',
  );
  addParagraph(
    c.desain.kriteriaKetercapaian.map((k, i) => `${i + 1}. ${k}`).join('  '),
    'Kriteria Ketercapaian (KKTP)',
  );
  addParagraph(c.desain.praktikPedagogis, 'Praktik Pedagogis');
  addParagraph(`${c.desain.modelPembelajaran} — ${c.desain.metodePembelajaran}`, 'Model & Metode');
  addParagraph(c.desain.kemitraanPembelajaran, 'Kemitraan Pembelajaran');
  addParagraph(c.desain.lingkunganPembelajaran, 'Lingkungan Pembelajaran');
  addParagraph(c.desain.pemanfaatanDigital, 'Pemanfaatan Digital');
  addParagraph(c.desain.mediaSumberBelajar.join(', '), 'Media & Sumber Belajar');
  addParagraph(c.desain.keterkaitanPedagogis, 'Keterkaitan Pedagogis');

  // D. PENGALAMAN BELAJAR
  addSectionTitle('D. PENGALAMAN BELAJAR');
  const allSteps = [
    ...c.pengalamanBelajar.pendahuluan,
    ...c.pengalamanBelajar.inti.memahami,
    ...c.pengalamanBelajar.inti.mengaplikasi,
    ...c.pengalamanBelajar.inti.merefleksi,
    ...c.pengalamanBelajar.penutup,
  ];
  autoTable(pdf, {
    startY: cur.y,
    margin: { left: cur.margin, right: cur.margin },
    theme: 'grid',
    styles: { fontSize: cur.baseFont - 1.5, cellPadding: 2, textColor: [15, 23, 42], overflow: 'linebreak' },
    headStyles: { fillColor: [6, 95, 70], textColor: [255, 255, 255], fontStyle: 'bold' },
    head: [['Tahap & Prinsip', 'Aktivitas Guru', 'Aktivitas Peserta Didik', 'Waktu & Tujuan']],
    body: allSteps.map((s) => [
      `${s.tahap}: ${s.namaAktivitas}\n[${s.prinsip.join(', ')}]\n${s.metodeStrategi}`,
      s.aktivitasGuru,
      s.aktivitasPesertaDidik,
      `${s.alokasiWaktuMenit} menit\n${s.tujuanAktivitas}${
        s.nilaiPakDikembangkan?.length ? `\nNilai PAK: ${s.nilaiPakDikembangkan.join(', ')}` : ''
      }`,
    ]),
  });
  cur.y = (pdf as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 5;

  // E. ASESMEN
  addSectionTitle('E. ASESMEN PEMBELAJARAN');
  autoTable(pdf, {
    startY: cur.y,
    margin: { left: cur.margin, right: cur.margin },
    theme: 'grid',
    styles: { fontSize: cur.baseFont - 1.5, cellPadding: 2, textColor: [15, 23, 42], overflow: 'linebreak' },
    headStyles: { fillColor: [6, 95, 70], textColor: [255, 255, 255], fontStyle: 'bold' },
    head: [['Jenis', 'Tujuan & Teknik', 'Instrumen & Indikator', 'Kriteria Keberhasilan']],
    body: [
      [
        'Diagnostik',
        `${c.asesmen.diagnostik.tujuan}\nTeknik: ${c.asesmen.diagnostik.teknik}`,
        `Instrumen: ${c.asesmen.diagnostik.instrumen}\nIndikator: ${c.asesmen.diagnostik.indikatorPenilaian}`,
        c.asesmen.diagnostik.kriteriaKeberhasilan,
      ],
      [
        'Formatif',
        `${c.asesmen.formatif.tujuan}\nTeknik: ${c.asesmen.formatif.teknik}`,
        `Instrumen: ${c.asesmen.formatif.instrumen}\nIndikator: ${c.asesmen.formatif.indikatorPenilaian}`,
        c.asesmen.formatif.kriteriaKeberhasilan,
      ],
      [
        'Sumatif',
        `${c.asesmen.sumatif.tujuan}\nTeknik: ${c.asesmen.sumatif.teknik}`,
        `Instrumen: ${c.asesmen.sumatif.instrumen}\nIndikator: ${c.asesmen.sumatif.indikatorPenilaian}`,
        c.asesmen.sumatif.kriteriaKeberhasilan,
      ],
    ],
  });
  cur.y = (pdf as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 5;

  // F. DIFERENSIASI
  addSectionTitle('F. DIFERENSIASI PEMBELAJARAN');
  addParagraph(c.diferensiasi.konten, 'Diferensiasi Konten');
  addParagraph(c.diferensiasi.proses, 'Diferensiasi Proses');
  addParagraph(c.diferensiasi.produk, 'Diferensiasi Produk');

  // G. REFLEKSI
  addSectionTitle('G. REFLEKSI');
  addParagraph(c.refleksi.refleksiGuru.map((r, i) => `${i + 1}. ${r}`).join('  '), 'Refleksi Guru');
  addParagraph(
    c.refleksi.refleksiPesertaDidik.map((r, i) => `${i + 1}. ${r}`).join('  '),
    'Refleksi Peserta Didik',
  );

  // INTEGRASI PENDIDIKAN ANTIKORUPSI (PAK)
  const pak = docData.pakIntegration;
  if (pak && !pak.ignored) {
    addSectionTitle('INTEGRASI PENDIDIKAN ANTIKORUPSI (PAK)');
    if (pak.applied && pak.relevanceStatus !== 'tidak_relevan_langsung') {
      autoTable(pdf, {
        startY: cur.y,
        margin: { left: cur.margin, right: cur.margin },
        theme: 'grid',
        styles: { fontSize: cur.baseFont - 1, cellPadding: 2, textColor: [15, 23, 42], overflow: 'linebreak' },
        headStyles: { fillColor: [6, 95, 70], textColor: [255, 255, 255], fontStyle: 'bold' },
        columnStyles: {
          0: { cellWidth: 48, fontStyle: 'bold', fillColor: [236, 253, 245] },
          1: { cellWidth: cur.contentWidth - 48 },
        },
        head: [['Komponen', 'Hasil Pemetaan']],
        body: [
          ['Elemen PAK', pak.elements.map((e) => `${e.kode}: ${e.nama} (${e.peran})`).join(' · ')],
          ['Subelemen PAK', pak.subElements.map((s) => `${s.code} ${s.nama}`).join('; ')],
          ['Relevansi', `${pak.relevanceLabel} — ${pak.relevanceReason}`],
          ['Nilai yang dikembangkan', pak.nilaiAntikorupsi.join(', ')],
          ['Tujuan penguatan', pak.learningObjectives.join('; ') || '-'],
          [
            'Bentuk integrasi',
            pak.integrasiRpmRingkasan.desainKarakter ||
              pak.integrasiRpmRingkasan.aktivitasGuruSiswa ||
              'Terintegrasi dalam Pendahuluan, Inti, Penutup, Asesmen, dan Refleksi.',
          ],
        ],
      });
      cur.y = (pdf as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 4;

      pak.materials.forEach((m, idx) => {
        addParagraph(
          `${m.namaMateri} (Disusun AI) — ${m.penjelasanMateri} Contoh: ${m.contohPenerapan.join('; ')}`,
          `Materi PAK ${idx + 1}`,
        );
      });
      pak.activities.forEach((act, idx) => {
        addParagraph(
          `${act.judul} [${act.jenisAktivitas}, ${act.alokasiWaktuMenit} menit, ${act.prinsipPembelajaranMendalam.join(', ')}] — ${act.peranPesertaDidik} (Indikator: ${act.indikatorKeberhasilan})`,
          `Aktivitas PAK ${idx + 1}`,
        );
      });
      addParagraph(
        `Pengetahuan: ${pak.assessments.pengetahuan.bentukInstrumen}; Sikap: ${pak.assessments.sikapPerilaku.teknikObservasi}; Praktik: ${pak.assessments.praktik.kriteriaPengamatan}`,
        'Asesmen PAK',
      );
      if (pak.assessments.rubrikPerkembangan.length > 0) {
        autoTable(pdf, {
          startY: cur.y,
          margin: { left: cur.margin, right: cur.margin },
          theme: 'grid',
          styles: { fontSize: cur.baseFont - 1.5, cellPadding: 2, textColor: [15, 23, 42], overflow: 'linebreak' },
          headStyles: { fillColor: [6, 95, 70], textColor: [255, 255, 255], fontStyle: 'bold' },
          head: [
            ['Aspek', 'Sangat Berkembang', 'Berkembang Sesuai Harapan', 'Mulai Berkembang', 'Memerlukan Bimbingan'],
          ],
          body: pak.assessments.rubrikPerkembangan.map((r) => [
            r.aspek,
            r.sangatBerkembang,
            r.berkembangSesuaiHarapan,
            r.mulaiBerkembang,
            r.memerlukanBimbingan,
          ]),
        });
        cur.y = (pdf as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 5;
      }
      addParagraph(pak.assessments.catatanPembinaanNonLabeling, 'Catatan Pembinaan Non-Labeling');
      addParagraph(
        pak.references
          .slice(0, 4)
          .map((r) => `${r.lembaga}: ${r.judul} (${r.url})`)
          .join('; '),
        'Rujukan Kerangka PAK',
      );
    } else {
      addParagraph(
        `${pak.relevanceLabel}. Berdasarkan analisis materi pembelajaran, integrasi Pendidikan Antikorupsi tidak direkomendasikan secara langsung pada topik ini agar fokus tujuan akademik tetap terjaga. ${pak.alternatifPenguatan || ''}`,
        'Status Relevansi PAK',
      );
    }
  }

  if (includeLkpdSummary && docData.perangkat.lkpd) {
    const lkpd = docData.perangkat.lkpd;
    addSectionTitle('LAMPIRAN RINGKAS: LEMBAR KERJA PESERTA DIDIK (LKPD)');
    addParagraph(lkpd.judul, 'Judul');
    addParagraph(lkpd.tujuanKegiatan, 'Tujuan');
    addParagraph(lkpd.materiPengantar, 'Materi Pengantar');
  }

  if (docData.perangkat.rubrikPenilaian) {
    const rub = docData.perangkat.rubrikPenilaian;
    addSectionTitle('LAMPIRAN: RUBRIK PENILAIAN');
    autoTable(pdf, {
      startY: cur.y,
      margin: { left: cur.margin, right: cur.margin },
      theme: 'grid',
      styles: { fontSize: cur.baseFont - 1.5, cellPadding: 2, textColor: [15, 23, 42], overflow: 'linebreak' },
      headStyles: { fillColor: [6, 95, 70], textColor: [255, 255, 255], fontStyle: 'bold' },
      head: [['Aspek', 'Sangat Baik', 'Baik', 'Cukup', 'Perlu Bimbingan']],
      body: rub.kriteria.map((k) => [k.aspek, k.sangatBaik, k.baik, k.cukup, k.perluBimbingan]),
    });
    cur.y = (pdf as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 5;
  }

  // H. PENGESAHAN
  if (config.showPengesahan) {
    ensureSpace(38);
    addSectionTitle('H. PENGESAHAN');
    const col2X = cur.margin + cur.contentWidth * 0.55;
    pdf.setFontSize(cur.baseFont);
    pdf.setFont('helvetica', 'normal');
    pdf.text('Mengetahui,', cur.margin, cur.y);
    pdf.text(`${c.pengesahan.tempat}, ${c.pengesahan.tanggal}`, col2X, cur.y);
    cur.y += 5;
    pdf.text(c.pengesahan.jabatanKepalaSekolah || 'Kepala SDN Randusari', cur.margin, cur.y);
    pdf.text('Guru Kelas / Mata Pelajaran', col2X, cur.y);
    cur.y += 18;
    pdf.setFont('helvetica', 'bold');
    pdf.text(c.pengesahan.namaKepalaSekolah || '(______________________)', cur.margin, cur.y);
    pdf.text(c.pengesahan.namaGuru || c.identitas.namaGuru || '(______________________)', col2X, cur.y);
    cur.y += 5;
    pdf.setFont('helvetica', 'normal');
    pdf.text(
      c.pengesahan.nipKepalaSekolah ? `NIP. ${c.pengesahan.nipKepalaSekolah}` : 'NIP. -',
      cur.margin,
      cur.y,
    );
    pdf.text(
      c.pengesahan.nipGuru || c.identitas.nipGuru
        ? `NIP. ${c.pengesahan.nipGuru || c.identitas.nipGuru}`
        : 'NIP. -',
      col2X,
      cur.y,
    );
  }
}

function renderLkpdIntoPdf(
  pdf: jsPDF,
  docData: RpmDocument,
  lkpd: LkpdKit,
  helpers: ReturnType<typeof createPdfHelpers>,
): void {
  const c = docData.content;
  const { cur, ensureSpace, addSectionTitle, addParagraph } = helpers;
  const gradeGuide = getGradeBandGuidance(c.identitas.kelas, c.identitas.fase);
  const pakSummary = lkpd.integrasiPak || buildLkpdPakSummaryFromRecord(docData.pakIntegration);
  const tps =
    lkpd.tujuanPembelajaran && lkpd.tujuanPembelajaran.length > 0
      ? lkpd.tujuanPembelajaran
      : c.desain.tujuanPembelajaran;

  // Header
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(cur.baseFont + 4);
  pdf.setTextColor(6, 95, 70);
  pdf.text('LEMBAR KERJA PESERTA DIDIK (LKPD)', cur.pageWidth / 2, cur.y, { align: 'center' });
  cur.y += 6;
  pdf.setFontSize(cur.baseFont + 0.5);
  pdf.setTextColor(51, 65, 85);
  pdf.text(
    `${lkpd.identitas?.namaSekolah || c.identitas.namaSatuanPendidikan} · ${gradeGuide.band}`,
    cur.pageWidth / 2,
    cur.y,
    { align: 'center' },
  );
  cur.y += 6;
  pdf.setTextColor(15, 23, 42);

  // 1. IDENTITAS LKPD
  addSectionTitle('1. IDENTITAS LKPD');
  autoTable(pdf, {
    startY: cur.y,
    margin: { left: cur.margin, right: cur.margin },
    theme: 'grid',
    styles: { fontSize: cur.baseFont - 1, cellPadding: 2.2, textColor: [15, 23, 42], overflow: 'linebreak' },
    columnStyles: {
      0: { cellWidth: 48, fontStyle: 'bold', fillColor: [236, 253, 245] },
      1: { cellWidth: cur.contentWidth - 48 },
    },
    body: [
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
    ],
  });
  cur.y = (pdf as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 5;

  // 2. JUDUL KEGIATAN
  addSectionTitle('2. JUDUL KEGIATAN');
  addParagraph(lkpd.judul);

  // 3. TUJUAN PEMBELAJARAN
  addSectionTitle('3. TUJUAN PEMBELAJARAN');
  tps.forEach((tp, idx) => addParagraph(`${idx + 1}. ${tp}`));

  // 4. INTEGRASI PENDIDIKAN ANTIKORUPSI
  addSectionTitle('4. INTEGRASI PENDIDIKAN ANTIKORUPSI');
  if (pakSummary.relevanLangsung) {
    addParagraph(pakSummary.elemenPak.join(' · '), 'Elemen PAK');
    addParagraph(pakSummary.subelemenPak.join('; '), 'Subelemen PAK');
    addParagraph(pakSummary.nilaiKarakter.join(', '), 'Nilai Karakter');
    addParagraph(pakSummary.perilakuDiharapkan.join('; '), 'Perilaku Diharapkan');
  } else {
    addParagraph(
      pakSummary.catatan ||
        'Topik ini berfokus pada kompetensi inti pembelajaran dengan pembiasaan jujur dan tertib.',
    );
  }

  // 5. PETUNJUK PENGERJAAN
  addSectionTitle('5. PETUNJUK PENGERJAAN');
  lkpd.petunjukPengerjaan.forEach((step, i) => addParagraph(`${i + 1}. ${step}`));

  // 6. MATERI PENGANTAR
  addSectionTitle('6. MATERI PENGANTAR');
  addParagraph(lkpd.materiPengantar);

  // 7. KEGIATAN PESERTA DIDIK
  addSectionTitle('7. KEGIATAN PESERTA DIDIK');
  lkpd.aktivitas.forEach((act) => {
    addParagraph(
      `${act.instruksi}${act.langkahSingkat?.length ? ` Langkah: ${act.langkahSingkat.join('; ')}` : ''}`,
      `Kegiatan ${act.nomor}: ${act.judul}${act.jenisAktivitas ? ` (${act.jenisAktivitas})` : ''}`,
    );
  });

  // 8. LATIHAN DAN TUGAS
  addSectionTitle('8. LATIHAN DAN TUGAS');
  lkpd.pertanyaan.forEach((q) => {
    addParagraph(
      `${q.pertanyaan}${q.tingkatKesulitan ? ` [${q.tingkatKesulitan}]` : ''}`,
      `Soal ${q.nomor}`,
    );
    const linesCount = Math.max(2, Math.min(5, q.barisRuangJawaban || 3));
    ensureSpace(linesCount * 6 + 6);
    pdf.setFontSize(cur.baseFont - 2);
    pdf.setTextColor(100, 116, 139);
    pdf.text(q.ruangJawabanHint || 'Ruang jawaban siswa:', cur.margin + 2, cur.y);
    cur.y += 4;
    pdf.setDrawColor(148, 163, 184);
    for (let i = 0; i < linesCount; i++) {
      pdf.line(cur.margin + 2, cur.y, cur.pageWidth - cur.margin - 2, cur.y);
      cur.y += 5.5;
    }
    pdf.setTextColor(15, 23, 42);
    cur.y += 2;
  });

  // 9. AKTIVITAS PENGUATAN PAK
  let nextNum = 9;
  if (lkpd.aktivitasPenguatanPak?.relevan) {
    addSectionTitle('9. AKTIVITAS PENGUATAN PENDIDIKAN ANTIKORUPSI');
    addParagraph(
      `${lkpd.aktivitasPenguatanPak.skenarioAtauInstruksi}`,
      `${lkpd.aktivitasPenguatanPak.judul} (${lkpd.aktivitasPenguatanPak.bentuk})`,
    );
    lkpd.aktivitasPenguatanPak.pertanyaanPanduan.forEach((pq, i) => {
      addParagraph(`${i + 1}. ${pq}`);
    });
    nextNum = 10;
  }

  // 10. REFLEKSI PESERTA DIDIK
  addSectionTitle(`${nextNum}. REFLEKSI PESERTA DIDIK`);
  lkpd.refleksiSiswa.forEach((r, idx) => addParagraph(`${idx + 1}. ${r}`));

  // 11. KESIMPULAN
  addSectionTitle(`${nextNum + 1}. KESIMPULAN`);
  addParagraph(lkpd.kesimpulan?.prompt || 'Tuliskan kesimpulan belajarmu hari ini:');
  ensureSpace(18);
  pdf.setDrawColor(148, 163, 184);
  for (let i = 0; i < 3; i++) {
    pdf.line(cur.margin + 2, cur.y, cur.pageWidth - cur.margin - 2, cur.y);
    cur.y += 5.5;
  }

  // 12. PENILAIAN
  if (lkpd.penilaian) {
    addSectionTitle(`${nextNum + 2}. PENILAIAN`);
    addParagraph(lkpd.penilaian.indikatorPenilaian.join('; '), 'Indikator Penilaian');
    addParagraph(lkpd.penilaian.kriteriaKeberhasilan, 'Kriteria Keberhasilan');
    if (lkpd.penilaian.rubrikSederhana.length > 0) {
      autoTable(pdf, {
        startY: cur.y,
        margin: { left: cur.margin, right: cur.margin },
        theme: 'grid',
        styles: { fontSize: cur.baseFont - 1.5, cellPadding: 2, textColor: [15, 23, 42], overflow: 'linebreak' },
        headStyles: { fillColor: [6, 95, 70], textColor: [255, 255, 255], fontStyle: 'bold' },
        head: [['Aspek', 'Sangat Baik', 'Perlu Bimbingan']],
        body: lkpd.penilaian.rubrikSederhana.map((r) => [r.aspek, r.sangatBaik, r.perluBimbingan]),
      });
      cur.y = (pdf as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 5;
    }
    addParagraph(lkpd.penilaian.catatanGuruLabel);
  }
}

export function exportRpmToPdf(docData: RpmDocument, config: ExportConfig): void {
  const orientation = config.orientation === 'landscape' ? 'l' : 'p';
  const pdf = new jsPDF({ orientation, unit: 'mm', format: 'a4' });
  const helpers = createPdfHelpers(pdf, config);
  renderRpmIntoPdf(pdf, docData, config, helpers, false);
  const c = docData.content;
  helpers.applyChrome(
    `${c.identitas.namaSatuanPendidikan} · ${c.identitas.mataPelajaran} (${c.identitas.kelas})`,
    'AI RPM SDN Randusari · Kurikulum Merdeka',
  );
  const safeName = (docData.title || 'RPM_SDN_Randusari').replace(/[^a-zA-Z0-9_-]+/g, '_').slice(0, 60);
  pdf.save(`${safeName}.pdf`);
}

export function exportLkpdToPdf(docData: RpmDocument, lkpd: LkpdKit, config: ExportConfig): void {
  const orientation = config.orientation === 'landscape' ? 'l' : 'p';
  const pdf = new jsPDF({ orientation, unit: 'mm', format: 'a4' });
  const helpers = createPdfHelpers(pdf, config);
  renderLkpdIntoPdf(pdf, docData, lkpd, helpers);
  const c = docData.content;
  helpers.applyChrome(
    `LKPD · ${c.identitas.namaSatuanPendidikan} · ${c.identitas.mataPelajaran} (${c.identitas.kelas})`,
    'LKPD Terintegrasi AI RPM SDN Randusari',
  );
  const safeName = (lkpd.judul || docData.title || 'LKPD_SDN_Randusari')
    .replace(/[^a-zA-Z0-9_-]+/g, '_')
    .slice(0, 60);
  pdf.save(`LKPD_${safeName}.pdf`);
}

export function exportPaketRpmLkpdToPdf(
  docData: RpmDocument,
  lkpd: LkpdKit,
  config: ExportConfig,
): void {
  const orientation = config.orientation === 'landscape' ? 'l' : 'p';
  const pdf = new jsPDF({ orientation, unit: 'mm', format: 'a4' });
  const helpers = createPdfHelpers(pdf, config);
  renderRpmIntoPdf(pdf, docData, config, helpers, false);
  pdf.addPage();
  helpers.cur.y = helpers.cur.margin + 4;
  renderLkpdIntoPdf(pdf, docData, lkpd, helpers);
  const c = docData.content;
  helpers.applyChrome(
    `Paket RPM + LKPD · ${c.identitas.namaSatuanPendidikan} (${c.identitas.kelas})`,
    'Paket Dokumen AI RPM SDN Randusari · Kurikulum Merdeka',
  );
  const safeName = (docData.title || 'Paket_RPM_LKPD_SDN_Randusari')
    .replace(/[^a-zA-Z0-9_-]+/g, '_')
    .slice(0, 55);
  pdf.save(`Paket_RPM_LKPD_${safeName}.pdf`);
}
