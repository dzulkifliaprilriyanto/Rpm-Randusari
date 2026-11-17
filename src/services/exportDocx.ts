import {
  AlignmentType,
  BorderStyle,
  Document,
  Footer,
  Header,
  HeadingLevel,
  Packer,
  PageBreak,
  PageNumber,
  PageOrientation,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} from 'docx';
import type { ExportConfig, LkpdKit, RpmDocument } from '../types/rpm';
import { buildLkpdPakSummaryFromRecord, getGradeBandGuidance } from '../utils/lkpd';

function mmToTwip(mm: number): number {
  return Math.round(mm * 56.6929);
}

function makeHeading(text: string): Paragraph {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 260, after: 100 },
    children: [
      new TextRun({
        text,
        bold: true,
        color: '065F46',
      }),
    ],
  });
}

function makeSubHeading(text: string): Paragraph {
  return new Paragraph({
    spacing: { before: 160, after: 60 },
    children: [
      new TextRun({
        text,
        bold: true,
        color: '0F172A',
      }),
    ],
  });
}

function makeBody(text: string, boldPrefix?: string): Paragraph {
  const children: TextRun[] = [];
  if (boldPrefix) {
    children.push(new TextRun({ text: boldPrefix, bold: true }));
  }
  children.push(new TextRun({ text: text || '-' }));
  return new Paragraph({
    spacing: { after: 80, line: 276 },
    children,
  });
}

function makeBullet(text: string): Paragraph {
  return new Paragraph({
    bullet: { level: 0 },
    spacing: { after: 50, line: 276 },
    children: [new TextRun({ text })],
  });
}

const CELL_BORDERS = {
  top: { style: BorderStyle.SINGLE, size: 4, color: 'CBD5E1' },
  bottom: { style: BorderStyle.SINGLE, size: 4, color: 'CBD5E1' },
  left: { style: BorderStyle.SINGLE, size: 4, color: 'CBD5E1' },
  right: { style: BorderStyle.SINGLE, size: 4, color: 'CBD5E1' },
};

function makeCell(text: string, bold = false, shaded = false): TableCell {
  return new TableCell({
    borders: CELL_BORDERS,
    shading: shaded ? { fill: 'ECFDF5' } : undefined,
    margins: { top: 80, bottom: 80, left: 110, right: 110 },
    children: [
      new Paragraph({
        spacing: { after: 20 },
        children: [new TextRun({ text: text || '-', bold })],
      }),
    ],
  });
}

function buildRpmDocxElements(docData: RpmDocument, config: ExportConfig): (Paragraph | Table)[] {
  const c = docData.content;
  const fontSizeHalfPt = config.fontSize * 2;
  const children: (Paragraph | Table)[] = [];

  children.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 40 },
      children: [
        new TextRun({
          text: 'RENCANA PEMBELAJARAN MENDALAM (RPM)',
          bold: true,
          size: fontSizeHalfPt + 8,
          color: '065F46',
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 180 },
      children: [
        new TextRun({
          text: `${c.identitas.namaSatuanPendidikan} · Kurikulum Merdeka`,
          bold: true,
          size: fontSizeHalfPt + 2,
          color: '334155',
        }),
      ],
    }),
  );

  // A. IDENTITAS PEMBELAJARAN
  children.push(makeHeading('A. IDENTITAS PEMBELAJARAN'));
  const identityRows: [string, string][] = [
    ['Satuan Pendidikan', c.identitas.namaSatuanPendidikan],
    ['Nama Guru', c.identitas.namaGuru + (c.identitas.nipGuru ? ` (NIP. ${c.identitas.nipGuru})` : '')],
    ['Mata Pelajaran', c.identitas.mataPelajaran],
    ['Kelas / Fase', `${c.identitas.kelas} / Fase ${c.identitas.fase}`],
    ['Semester / Tahun Ajaran', `Semester ${c.identitas.semester} / ${c.identitas.tahunAjaran}`],
    ['Materi / Topik', c.identitas.materi],
    ['Alokasi Waktu', c.identitas.alokasiWaktu],
  ];

  children.push(
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: identityRows.map(
        ([label, val]) =>
          new TableRow({
            children: [makeCell(label, true, true), makeCell(val)],
          }),
      ),
    }),
  );

  // B. IDENTIFIKASI
  children.push(makeHeading('B. IDENTIFIKASI'));
  children.push(makeBody(c.identifikasi.karakteristikPesertaDidik, 'Karakteristik Peserta Didik: '));
  children.push(makeBody(c.identifikasi.pengetahuanAwal, 'Pengetahuan Awal: '));
  children.push(makeBody(c.identifikasi.kebutuhanBelajar, 'Kebutuhan Belajar: '));
  children.push(makeBody(c.identifikasi.potensiMinat, 'Potensi dan Minat: '));
  children.push(makeBody(c.identifikasi.konteksLingkunganSekolah, 'Konteks Lingkungan Sekolah: '));
  children.push(makeBody(c.identifikasi.materiPembelajaran, 'Materi Pembelajaran: '));
  children.push(makeSubHeading('Dimensi Profil Lulusan yang Relevan:'));
  for (const d of c.identifikasi.dimensiProfilLulusan) {
    children.push(makeBullet(`${d.nama}: ${d.alasanRelevansi}`));
  }

  // C. DESAIN PEMBELAJARAN
  children.push(makeHeading('C. DESAIN PEMBELAJARAN'));
  children.push(
    makeBody(
      c.desain.capaianPembelajaran +
        (c.desain.cpPerluVerifikasi ? ' [Memerlukan verifikasi terhadap dokumen resmi sekolah]' : ''),
      'Capaian Pembelajaran (CP): ',
    ),
  );
  children.push(makeSubHeading('Tujuan Pembelajaran (TP):'));
  c.desain.tujuanPembelajaran.forEach((tp, idx) => children.push(makeBullet(`${idx + 1}. ${tp}`)));
  children.push(makeSubHeading('Kriteria Ketercapaian Tujuan Pembelajaran (KKTP):'));
  c.desain.kriteriaKetercapaian.forEach((k, idx) => children.push(makeBullet(`${idx + 1}. ${k}`)));
  children.push(makeBody(c.desain.topikPembelajaran, 'Topik Pembelajaran: '));
  children.push(makeBody(c.desain.praktikPedagogis, 'Praktik Pedagogis: '));
  children.push(makeBody(c.desain.modelPembelajaran, 'Model Pembelajaran: '));
  children.push(makeBody(c.desain.metodePembelajaran, 'Metode Pembelajaran: '));
  children.push(makeBody(c.desain.kemitraanPembelajaran, 'Kemitraan Pembelajaran: '));
  children.push(makeBody(c.desain.lingkunganPembelajaran, 'Lingkungan Pembelajaran: '));
  children.push(makeBody(c.desain.pemanfaatanDigital, 'Pemanfaatan Digital: '));
  children.push(makeBody(c.desain.mediaSumberBelajar.join(', '), 'Media & Sumber Belajar: '));
  children.push(makeBody(c.desain.keterkaitanPedagogis, 'Penjelasan Keterkaitan Pedagogis: '));

  // D. PENGALAMAN BELAJAR
  children.push(makeHeading('D. PENGALAMAN BELAJAR'));
  const allSteps = [
    ...c.pengalamanBelajar.pendahuluan,
    ...c.pengalamanBelajar.inti.memahami,
    ...c.pengalamanBelajar.inti.mengaplikasi,
    ...c.pengalamanBelajar.inti.merefleksi,
    ...c.pengalamanBelajar.penutup,
  ];

  children.push(
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({
          tableHeader: true,
          children: [
            makeCell('Tahap & Prinsip', true, true),
            makeCell('Aktivitas Guru', true, true),
            makeCell('Aktivitas Peserta Didik', true, true),
            makeCell('Waktu & Tujuan', true, true),
          ],
        }),
        ...allSteps.map(
          (step) =>
            new TableRow({
              children: [
                makeCell(
                  `${step.tahap}: ${step.namaAktivitas}\n[${step.prinsip.join(', ')}]\nMetode: ${step.metodeStrategi}`,
                ),
                makeCell(step.aktivitasGuru),
                makeCell(step.aktivitasPesertaDidik),
                makeCell(
                  `${step.alokasiWaktuMenit} menit\nTujuan: ${step.tujuanAktivitas}${
                    step.nilaiPakDikembangkan?.length
                      ? `\nNilai PAK: ${step.nilaiPakDikembangkan.join(', ')}`
                      : ''
                  }`,
                ),
              ],
            }),
        ),
      ],
    }),
  );

  // E. ASESMEN PEMBELAJARAN
  children.push(makeHeading('E. ASESMEN PEMBELAJARAN'));
  const asesRows: [string, typeof c.asesmen.diagnostik][] = [
    ['Asesmen Diagnostik', c.asesmen.diagnostik],
    ['Asesmen Formatif', c.asesmen.formatif],
    ['Asesmen Sumatif', c.asesmen.sumatif],
  ];
  children.push(
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({
          tableHeader: true,
          children: [
            makeCell('Jenis Asesmen', true, true),
            makeCell('Tujuan & Teknik', true, true),
            makeCell('Instrumen & Indikator', true, true),
            makeCell('Kriteria Keberhasilan', true, true),
          ],
        }),
        ...asesRows.map(
          ([nama, block]) =>
            new TableRow({
              children: [
                makeCell(nama, true),
                makeCell(`Tujuan: ${block.tujuan}\nTeknik: ${block.teknik}`),
                makeCell(`Instrumen: ${block.instrumen}\nIndikator: ${block.indikatorPenilaian}`),
                makeCell(block.kriteriaKeberhasilan),
              ],
            }),
        ),
      ],
    }),
  );

  // F. DIFERENSIASI PEMBELAJARAN
  children.push(makeHeading('F. DIFERENSIASI PEMBELAJARAN'));
  children.push(makeBody(c.diferensiasi.konten, 'Diferensiasi Konten: '));
  children.push(makeBody(c.diferensiasi.proses, 'Diferensiasi Proses: '));
  children.push(makeBody(c.diferensiasi.produk, 'Diferensiasi Produk: '));

  // G. REFLEKSI
  children.push(makeHeading('G. REFLEKSI'));
  children.push(makeSubHeading('Refleksi Guru:'));
  c.refleksi.refleksiGuru.forEach((r) => children.push(makeBullet(r)));
  children.push(makeSubHeading('Refleksi Peserta Didik:'));
  c.refleksi.refleksiPesertaDidik.forEach((r) => children.push(makeBullet(r)));

  // INTEGRASI PENDIDIKAN ANTIKORUPSI (PAK)
  const pak = docData.pakIntegration;
  if (pak && !pak.ignored) {
    children.push(makeHeading('INTEGRASI PENDIDIKAN ANTIKORUPSI (PAK)'));
    if (pak.applied && pak.relevanceStatus !== 'tidak_relevan_langsung') {
      const mappingRows: [string, string][] = [
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
      ];
      children.push(
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [
            new TableRow({
              tableHeader: true,
              children: [makeCell('Komponen', true, true), makeCell('Hasil Pemetaan', true, true)],
            }),
            ...mappingRows.map(
              ([k, v]) => new TableRow({ children: [makeCell(k, true, true), makeCell(v)] }),
            ),
          ],
        }),
      );

      if (pak.materials.length > 0) {
        children.push(makeSubHeading('Materi Pendidikan Antikorupsi (Disusun AI untuk Telaah Guru):'));
        pak.materials.forEach((m) => {
          children.push(makeBody(m.penjelasanMateri, `${m.namaMateri}: `));
          if (m.contohPenerapan.length > 0) {
            children.push(makeBullet(`Contoh penerapan: ${m.contohPenerapan.join('; ')}`));
          }
        });
      }

      if (pak.activities.length > 0) {
        children.push(makeSubHeading('Aktivitas Penguatan Karakter SD:'));
        pak.activities.forEach((act) => {
          children.push(
            makeBullet(
              `${act.judul} (${act.jenisAktivitas}, ${act.alokasiWaktuMenit} menit, ${act.prinsipPembelajaranMendalam.join(', ')}): ${act.peranPesertaDidik} | Indikator: ${act.indikatorKeberhasilan}`,
            ),
          );
        });
      }

      children.push(
        makeBody(
          `Pengetahuan: ${pak.assessments.pengetahuan.bentukInstrumen}; Sikap: ${pak.assessments.sikapPerilaku.teknikObservasi}; Praktik: ${pak.assessments.praktik.kriteriaPengamatan}`,
          'Asesmen PAK: ',
        ),
      );

      if (pak.assessments.rubrikPerkembangan.length > 0) {
        children.push(makeSubHeading('Rubrik Perkembangan Karakter PAK (Non-Labeling):'));
        children.push(
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                tableHeader: true,
                children: [
                  makeCell('Aspek', true, true),
                  makeCell('Sangat Berkembang', true, true),
                  makeCell('Berkembang Sesuai Harapan', true, true),
                  makeCell('Mulai Berkembang', true, true),
                  makeCell('Memerlukan Bimbingan', true, true),
                ],
              }),
              ...pak.assessments.rubrikPerkembangan.map(
                (r) =>
                  new TableRow({
                    children: [
                      makeCell(r.aspek, true),
                      makeCell(r.sangatBerkembang),
                      makeCell(r.berkembangSesuaiHarapan),
                      makeCell(r.mulaiBerkembang),
                      makeCell(r.memerlukanBimbingan),
                    ],
                  }),
              ),
            ],
          }),
        );
      }

      children.push(
        makeBody(pak.assessments.catatanPembinaanNonLabeling, 'Catatan Pembinaan Non-Labeling: '),
      );
      children.push(
        makeBody(
          pak.references
            .slice(0, 4)
            .map((r) => `${r.lembaga} — ${r.judul} (${r.url})`)
            .join('; '),
          'Rujukan Resmi Kerangka PAK: ',
        ),
      );
    } else {
      children.push(
        makeBody(
          `${pak.relevanceLabel}. Berdasarkan analisis materi pembelajaran, integrasi Pendidikan Antikorupsi tidak direkomendasikan secara langsung pada topik ini agar fokus tujuan akademik tetap terjaga. ${pak.alternatifPenguatan || ''}`,
          'Status Relevansi PAK: ',
        ),
      );
    }
  }

  if (docData.perangkat.bahanAjar) {
    const ba = docData.perangkat.bahanAjar;
    children.push(makeHeading('LAMPIRAN. BAHAN AJAR'));
    children.push(makeBody(ba.judul, 'Judul: '));
    children.push(makeBody(ba.ringkasanKonsep, 'Ringkasan Konsep: '));
    ba.uraianMateri.forEach((u) => children.push(makeBody(u.isi, `${u.subjudul}: `)));
    children.push(makeBody(ba.contohKontekstual, 'Contoh Kontekstual: '));
  }

  if (docData.perangkat.rubrikPenilaian) {
    const rub = docData.perangkat.rubrikPenilaian;
    children.push(makeHeading('LAMPIRAN. RUBRIK PENILAIAN'));
    children.push(
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [
          new TableRow({
            tableHeader: true,
            children: [
              makeCell('Aspek', true, true),
              makeCell('Sangat Baik', true, true),
              makeCell('Baik', true, true),
              makeCell('Cukup', true, true),
              makeCell('Perlu Bimbingan', true, true),
            ],
          }),
          ...rub.kriteria.map(
            (k) =>
              new TableRow({
                children: [
                  makeCell(k.aspek, true),
                  makeCell(k.sangatBaik),
                  makeCell(k.baik),
                  makeCell(k.cukup),
                  makeCell(k.perluBimbingan),
                ],
              }),
          ),
        ],
      }),
    );
  }

  // H. PENGESAHAN
  if (config.showPengesahan) {
    children.push(makeHeading('H. PENGESAHAN'));
    children.push(
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [
          new TableRow({
            children: [
              new TableCell({
                borders: {
                  top: { style: BorderStyle.NONE },
                  bottom: { style: BorderStyle.NONE },
                  left: { style: BorderStyle.NONE },
                  right: { style: BorderStyle.NONE },
                },
                children: [
                  new Paragraph({ text: 'Mengetahui,' }),
                  new Paragraph({ text: c.pengesahan.jabatanKepalaSekolah || 'Kepala SDN Randusari' }),
                  new Paragraph({ text: '', spacing: { before: 480 } }),
                  new Paragraph({
                    children: [
                      new TextRun({
                        text: c.pengesahan.namaKepalaSekolah || '(__________________________)',
                        bold: true,
                      }),
                    ],
                  }),
                  new Paragraph({
                    text: c.pengesahan.nipKepalaSekolah ? `NIP. ${c.pengesahan.nipKepalaSekolah}` : 'NIP. -',
                  }),
                ],
              }),
              new TableCell({
                borders: {
                  top: { style: BorderStyle.NONE },
                  bottom: { style: BorderStyle.NONE },
                  left: { style: BorderStyle.NONE },
                  right: { style: BorderStyle.NONE },
                },
                children: [
                  new Paragraph({ text: `${c.pengesahan.tempat}, ${c.pengesahan.tanggal}` }),
                  new Paragraph({ text: 'Guru Kelas / Mata Pelajaran' }),
                  new Paragraph({ text: '', spacing: { before: 480 } }),
                  new Paragraph({
                    children: [
                      new TextRun({
                        text: c.pengesahan.namaGuru || c.identitas.namaGuru || '(__________________________)',
                        bold: true,
                      }),
                    ],
                  }),
                  new Paragraph({
                    text: c.pengesahan.nipGuru || c.identitas.nipGuru
                      ? `NIP. ${c.pengesahan.nipGuru || c.identitas.nipGuru}`
                      : 'NIP. -',
                  }),
                ],
              }),
            ],
          }),
        ],
      }),
    );
  }

  return children;
}

function buildLkpdDocxElements(
  docData: RpmDocument,
  lkpd: LkpdKit,
  config: ExportConfig,
): (Paragraph | Table)[] {
  const c = docData.content;
  const fontSizeHalfPt = config.fontSize * 2;
  const children: (Paragraph | Table)[] = [];
  const gradeGuide = getGradeBandGuidance(c.identitas.kelas, c.identitas.fase);
  const pakSummary = lkpd.integrasiPak || buildLkpdPakSummaryFromRecord(docData.pakIntegration);
  const tps =
    lkpd.tujuanPembelajaran && lkpd.tujuanPembelajaran.length > 0
      ? lkpd.tujuanPembelajaran
      : c.desain.tujuanPembelajaran;

  children.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 40 },
      children: [
        new TextRun({
          text: 'LEMBAR KERJA PESERTA DIDIK (LKPD)',
          bold: true,
          size: fontSizeHalfPt + 8,
          color: '065F46',
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 180 },
      children: [
        new TextRun({
          text: `${lkpd.identitas?.namaSekolah || c.identitas.namaSatuanPendidikan} · ${gradeGuide.band}`,
          bold: true,
          size: fontSizeHalfPt + 2,
          color: '334155',
        }),
      ],
    }),
  );

  // 1. IDENTITAS LKPD
  children.push(makeHeading('1. IDENTITAS LKPD'));
  children.push(
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: (
        [
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
        ] as [string, string][]
      ).map(
        ([k, v]) => new TableRow({ children: [makeCell(k, true, true), makeCell(v)] }),
      ),
    }),
  );

  // 2. JUDUL KEGIATAN
  children.push(makeHeading('2. JUDUL KEGIATAN'));
  children.push(makeBody(lkpd.judul));

  // 3. TUJUAN PEMBELAJARAN
  children.push(makeHeading('3. TUJUAN PEMBELAJARAN'));
  tps.forEach((tp, idx) => children.push(makeBullet(`${idx + 1}. ${tp}`)));

  // 4. INTEGRASI PENDIDIKAN ANTIKORUPSI
  children.push(makeHeading('4. INTEGRASI PENDIDIKAN ANTIKORUPSI'));
  if (pakSummary.relevanLangsung) {
    children.push(makeBody(pakSummary.elemenPak.join(' · '), 'Elemen PAK: '));
    children.push(makeBody(pakSummary.subelemenPak.join('; '), 'Subelemen PAK: '));
    children.push(makeBody(pakSummary.nilaiKarakter.join(', '), 'Nilai Karakter: '));
    children.push(makeBody(pakSummary.perilakuDiharapkan.join('; '), 'Perilaku Diharapkan: '));
  } else {
    children.push(
      makeBody(
        pakSummary.catatan ||
          'Topik berfokus pada kompetensi inti pembelajaran dengan pembiasaan jujur dan tertib.',
      ),
    );
  }

  // 5. PETUNJUK PENGERJAAN
  children.push(makeHeading('5. PETUNJUK PENGERJAAN'));
  lkpd.petunjukPengerjaan.forEach((p, idx) => children.push(makeBullet(`${idx + 1}. ${p}`)));

  // 6. MATERI PENGANTAR
  children.push(makeHeading('6. MATERI PENGANTAR'));
  children.push(makeBody(lkpd.materiPengantar));

  // 7. KEGIATAN PESERTA DIDIK
  children.push(makeHeading('7. KEGIATAN PESERTA DIDIK'));
  lkpd.aktivitas.forEach((act) => {
    children.push(
      makeBody(
        act.instruksi,
        `Kegiatan ${act.nomor}: ${act.judul}${act.jenisAktivitas ? ` (${act.jenisAktivitas})` : ''}: `,
      ),
    );
    act.langkahSingkat?.forEach((l) => children.push(makeBullet(l)));
  });

  // 8. LATIHAN DAN TUGAS
  children.push(makeHeading('8. LATIHAN DAN TUGAS'));
  lkpd.pertanyaan.forEach((q) => {
    children.push(
      makeBody(
        `${q.pertanyaan}${q.tingkatKesulitan ? ` [${q.tingkatKesulitan}]` : ''}`,
        `Soal ${q.nomor}: `,
      ),
    );
    children.push(makeBody(q.ruangJawabanHint || 'Tuliskan jawabanmu di bawah ini:', 'Ruang Jawaban: '));
    children.push(makeBody('________________________________________________________________________'));
    children.push(makeBody('________________________________________________________________________'));
  });

  // 9. AKTIVITAS PENGUATAN PAK
  let nextNum = 9;
  if (lkpd.aktivitasPenguatanPak?.relevan) {
    children.push(makeHeading('9. AKTIVITAS PENGUATAN PENDIDIKAN ANTIKORUPSI'));
    children.push(
      makeBody(
        lkpd.aktivitasPenguatanPak.skenarioAtauInstruksi,
        `${lkpd.aktivitasPenguatanPak.judul} (${lkpd.aktivitasPenguatanPak.bentuk}): `,
      ),
    );
    lkpd.aktivitasPenguatanPak.pertanyaanPanduan.forEach((pq, idx) =>
      children.push(makeBullet(`${idx + 1}. ${pq}`)),
    );
    nextNum = 10;
  }

  // 10. REFLEKSI PESERTA DIDIK
  children.push(makeHeading(`${nextNum}. REFLEKSI PESERTA DIDIK`));
  lkpd.refleksiSiswa.forEach((r, idx) => {
    children.push(makeBody(`${idx + 1}. ${r}`));
    children.push(makeBody('________________________________________________________________________'));
  });

  // 11. KESIMPULAN
  children.push(makeHeading(`${nextNum + 1}. KESIMPULAN`));
  children.push(makeBody(lkpd.kesimpulan?.prompt || 'Tuliskan kesimpulan belajarmu hari ini:'));
  children.push(makeBody('________________________________________________________________________'));
  children.push(makeBody('________________________________________________________________________'));

  // 12. PENILAIAN
  if (lkpd.penilaian) {
    children.push(makeHeading(`${nextNum + 2}. PENILAIAN`));
    children.push(makeBody(lkpd.penilaian.indikatorPenilaian.join('; '), 'Indikator Penilaian: '));
    children.push(makeBody(lkpd.penilaian.kriteriaKeberhasilan, 'Kriteria Keberhasilan: '));
    if (lkpd.penilaian.rubrikSederhana.length > 0) {
      children.push(
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [
            new TableRow({
              tableHeader: true,
              children: [
                makeCell('Aspek', true, true),
                makeCell('Sangat Baik', true, true),
                makeCell('Perlu Bimbingan', true, true),
              ],
            }),
            ...lkpd.penilaian.rubrikSederhana.map(
              (r) =>
                new TableRow({
                  children: [makeCell(r.aspek, true), makeCell(r.sangatBaik), makeCell(r.perluBimbingan)],
                }),
            ),
          ],
        }),
      );
    }
    children.push(makeBody(lkpd.penilaian.catatanGuruLabel));
  }

  return children;
}

async function saveDocxDocument(
  children: (Paragraph | Table)[],
  headerText: string,
  footerPrefix: string,
  fileName: string,
  config: ExportConfig,
): Promise<void> {
  const fontSizeHalfPt = config.fontSize * 2;
  const marginTwip = mmToTwip(config.marginMm);
  const isLandscape = config.orientation === 'landscape';

  const doc = new Document({
    styles: {
      default: {
        document: {
          run: {
            font: 'Calibri',
            size: fontSizeHalfPt,
            color: '0F172A',
          },
        },
      },
    },
    sections: [
      {
        properties: {
          page: {
            size: {
              width: isLandscape ? 16838 : 11906,
              height: isLandscape ? 11906 : 16838,
              orientation: isLandscape ? PageOrientation.LANDSCAPE : PageOrientation.PORTRAIT,
            },
            margin: {
              top: marginTwip,
              bottom: marginTwip,
              left: marginTwip,
              right: marginTwip,
            },
          },
        },
        headers: config.showHeader
          ? {
              default: new Header({
                children: [
                  new Paragraph({
                    alignment: AlignmentType.RIGHT,
                    children: [new TextRun({ text: headerText, size: 18, color: '64748B' })],
                  }),
                ],
              }),
            }
          : undefined,
        footers:
          config.showFooter || config.showPageNumbers
            ? {
                default: new Footer({
                  children: [
                    new Paragraph({
                      alignment: AlignmentType.RIGHT,
                      children: [
                        ...(config.showFooter
                          ? [new TextRun({ text: `${footerPrefix}  |  `, size: 18, color: '64748B' })]
                          : []),
                        ...(config.showPageNumbers
                          ? [
                              new TextRun({ text: 'Halaman ', size: 18, color: '64748B' }),
                              new TextRun({ children: [PageNumber.CURRENT], size: 18, color: '64748B' }),
                              new TextRun({ text: ' dari ', size: 18, color: '64748B' }),
                              new TextRun({ children: [PageNumber.TOTAL_PAGES], size: 18, color: '64748B' }),
                            ]
                          : []),
                      ],
                    }),
                  ],
                }),
              }
            : undefined,
        children,
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

export async function exportRpmToDocx(docData: RpmDocument, config: ExportConfig): Promise<void> {
  const c = docData.content;
  const safeName = (docData.title || 'RPM_SDN_Randusari')
    .replace(/[^a-zA-Z0-9_-]+/g, '_')
    .slice(0, 60);
  await saveDocxDocument(
    buildRpmDocxElements(docData, config),
    `${c.identitas.namaSatuanPendidikan} · RPM ${c.identitas.mataPelajaran} (${c.identitas.kelas})`,
    'AI RPM SDN Randusari · Kurikulum Merdeka',
    `${safeName}.docx`,
    config,
  );
}

export async function exportLkpdToDocx(
  docData: RpmDocument,
  lkpd: LkpdKit,
  config: ExportConfig,
): Promise<void> {
  const c = docData.content;
  const safeName = (lkpd.judul || docData.title || 'LKPD_SDN_Randusari')
    .replace(/[^a-zA-Z0-9_-]+/g, '_')
    .slice(0, 60);
  await saveDocxDocument(
    buildLkpdDocxElements(docData, lkpd, config),
    `LKPD · ${c.identitas.namaSatuanPendidikan} · ${c.identitas.mataPelajaran} (${c.identitas.kelas})`,
    'LKPD Terintegrasi AI RPM SDN Randusari',
    `LKPD_${safeName}.docx`,
    config,
  );
}

export async function exportPaketRpmLkpdToDocx(
  docData: RpmDocument,
  lkpd: LkpdKit,
  config: ExportConfig,
): Promise<void> {
  const c = docData.content;
  const safeName = (docData.title || 'Paket_RPM_LKPD_SDN_Randusari')
    .replace(/[^a-zA-Z0-9_-]+/g, '_')
    .slice(0, 55);
  const combined: (Paragraph | Table)[] = [
    ...buildRpmDocxElements(docData, config),
    new Paragraph({ children: [new PageBreak()] }),
    ...buildLkpdDocxElements(docData, lkpd, config),
  ];
  await saveDocxDocument(
    combined,
    `Paket RPM + LKPD · ${c.identitas.namaSatuanPendidikan} (${c.identitas.kelas})`,
    'Paket Dokumen AI RPM SDN Randusari · Kurikulum Merdeka',
    `Paket_RPM_LKPD_${safeName}.docx`,
    config,
  );
}
