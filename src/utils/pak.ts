import type {
  PakAutoDetectInput,
  PakElementId,
  PakIntegrationRecord,
  PakReferenceItem,
  PakRelevanceStatus,
  PakSubElementCode,
  RpmCoreContent,
} from '../types/rpm';

export interface PakFrameworkSubElement {
  code: PakSubElementCode;
  elemenId: PakElementId;
  nama: string;
}

export interface PakFrameworkElement {
  id: PakElementId;
  kode: string;
  nama: string;
  subElements: PakFrameworkSubElement[];
  contohKonteksSd: string[];
}

export const PAK_ELEMENTS_FRAMEWORK: PakFrameworkElement[] = [
  {
    id: 'elemen_1',
    kode: 'ELEMEN 1',
    nama: 'Ketaatan pada Aturan',
    subElements: [
      { code: '1.1', elemenId: 'elemen_1', nama: 'Kesadaran pentingnya taat aturan' },
      { code: '1.2', elemenId: 'elemen_1', nama: 'Menjaga komitmen diri dalam menjalankan aturan' },
    ],
    contohKonteksSd: [
      'Mematuhi kesepakatan kelas.',
      'Disiplin mengerjakan tugas.',
      'Mengikuti aturan permainan.',
      'Menghargai tata tertib sekolah.',
      'Bertanggung jawab atas komitmen yang dibuat.',
    ],
  },
  {
    id: 'elemen_2',
    kode: 'ELEMEN 2',
    nama: 'Konsep Kepemilikan',
    subElements: [
      {
        code: '2.1',
        elemenId: 'elemen_2',
        nama: 'Kesadaran terhadap hak dan kewajiban terkait kepemilikan',
      },
      {
        code: '2.2',
        elemenId: 'elemen_2',
        nama: 'Menghormati hak kepemilikan dan bertanggung jawab',
      },
    ],
    contohKonteksSd: [
      'Menghargai barang milik orang lain.',
      'Tidak mengambil barang tanpa izin.',
      'Menjaga fasilitas sekolah.',
      'Menggunakan fasilitas umum secara bertanggung jawab.',
      'Mengembalikan barang yang ditemukan.',
    ],
  },
  {
    id: 'elemen_3',
    kode: 'ELEMEN 3',
    nama: 'Menjaga Amanah',
    subElements: [
      { code: '3.1', elemenId: 'elemen_3', nama: 'Kesadaran pentingnya menjaga amanah' },
      {
        code: '3.2',
        elemenId: 'elemen_3',
        nama: 'Menjaga amanah, termasuk konflik kepentingan',
      },
    ],
    contohKonteksSd: [
      'Menjalankan tugas piket.',
      'Menjadi ketua kelompok yang bertanggung jawab.',
      'Menyampaikan hasil pengamatan secara jujur.',
      'Menjaga kepercayaan guru dan teman.',
      'Tidak menyalahgunakan tanggung jawab yang diberikan.',
    ],
  },
  {
    id: 'elemen_4',
    kode: 'ELEMEN 4',
    nama: 'Pengelolaan Dilema Etis',
    subElements: [
      {
        code: '4.1',
        elemenId: 'elemen_4',
        nama: 'Kesadaran pentingnya berpikir kritis dalam dilema etis',
      },
      {
        code: '4.2',
        elemenId: 'elemen_4',
        nama: 'Bertindak berdasarkan nilai integritas dalam dilema etis',
      },
    ],
    contohKonteksSd: [
      'Memilih berkata jujur meskipun melakukan kesalahan.',
      'Menolak ajakan menyontek.',
      'Mengakui kesalahan.',
      'Bersikap adil dalam pembagian tugas.',
      'Menentukan tindakan yang benar berdasarkan situasi sederhana.',
    ],
  },
  {
    id: 'elemen_5',
    kode: 'ELEMEN 5',
    nama: 'Membangun Budaya Antikorupsi',
    subElements: [
      { code: '5.1', elemenId: 'elemen_5', nama: 'Literasi antikorupsi' },
      {
        code: '5.2',
        elemenId: 'elemen_5',
        nama: 'Berpartisipasi aktif membangun budaya antikorupsi',
      },
    ],
    contohKonteksSd: [
      'Mengenal perilaku koruptif dalam kehidupan sehari-hari.',
      'Membiasakan kejujuran.',
      'Melaksanakan kantin kejujuran.',
      'Membuat kampanye antikorupsi.',
      'Membangun budaya disiplin dan tanggung jawab di kelas.',
    ],
  },
];

export const PAK_CORE_VALUES: string[] = [
  'Jujur',
  'Peduli',
  'Mandiri',
  'Disiplin',
  'Tanggung Jawab',
  'Kerja Keras',
  'Sederhana',
  'Berani',
  'Adil',
];

export const PAK_ACTIVITY_FORMATS: string[] = [
  'Studi kasus sederhana',
  'Bermain peran',
  'Diskusi kelompok',
  'Cerita inspiratif',
  'Permainan edukatif',
  'Simulasi pengambilan keputusan',
  'Proyek kelas',
  'Jurnal kejujuran',
  'Poster kampanye integritas',
  'Kantin kejujuran',
  'Kesepakatan kelas berintegritas',
];

export const PAK_RUBRIC_CATEGORIES = [
  'Sangat Berkembang',
  'Berkembang Sesuai Harapan',
  'Mulai Berkembang',
  'Memerlukan Bimbingan',
] as const;

export const PAK_OFFICIAL_REFERENCES: PakReferenceItem[] = [
  {
    id: 'kpk-model-insersi-2017',
    lembaga: 'KPK',
    judul: 'Buku Model Insersi Pendidikan Antikorupsi dan PPKn',
    tahun: '2017',
    url: 'https://aclc.kpk.go.id/materi-pembelajaran/pendidikan/buku/buku-model-insersi-pendidikan-antikorupsi-dan-ppkn',
    statusVerifikasi: 'rujukan_portal_resmi',
    catatanPenggunaan:
      'Referensi kerangka insersi nilai integritas ke dalam mata pelajaran. Materi pembelajaran operasional pada dokumen ini disusun oleh AI dan perlu ditelaah guru.',
  },
  {
    id: 'kpk-panduan-praktis-2019',
    lembaga: 'KPK',
    judul: 'Panduan Praktis Implementasi Pendidikan Antikorupsi',
    tahun: '2019',
    url: 'https://aclc.kpk.go.id/materi-pembelajaran/pendidikan/buku/panduan-praktis-implementasi-pendidikan-antikorupsi',
    statusVerifikasi: 'rujukan_portal_resmi',
    catatanPenggunaan:
      'Referensi strategi pembiasaan dan budaya sekolah berintegritas.',
  },
  {
    id: 'kpk-portal-pustaka',
    lembaga: 'KPK',
    judul: 'Portal Pustaka Pendidikan Antikorupsi (ACLC KPK)',
    tahun: 'Portal Resmi',
    url: 'https://aclc.kpk.go.id/pendidikan/pustaka',
    statusVerifikasi: 'rujukan_portal_resmi',
    catatanPenggunaan:
      'Sumber bacaan dan bahan ajar jenjang SD dapat diakses langsung melalui portal ACLC KPK.',
  },
  {
    id: 'kpk-dasbor-pak',
    lembaga: 'KPK',
    judul: 'Dasbor Implementasi Pendidikan Antikorupsi',
    tahun: 'Portal Resmi',
    url: 'https://pendidikan.kpk.go.id/implementasipak',
    statusVerifikasi: 'rujukan_portal_resmi',
    catatanPenggunaan:
      'Acuan pemetaan 5 Elemen dan 10 Subelemen Pendidikan Antikorupsi.',
  },
  {
    id: 'kemendikdasmen-pak-2026',
    lembaga: 'Kemendikdasmen',
    judul: 'Panduan Pendidikan Antikorupsi dan Bahan Ajar (2026)',
    tahun: '2026',
    url: 'https://www.kemendikdasmen.go.id',
    statusVerifikasi: 'perlu_verifikasi_portal',
    catatanPenggunaan:
      'Sumber eksternal Kemendikdasmen tahun 2026 belum diverifikasi langsung oleh server; periksa dokumen resmi pada portal kementerian sebelum menjadikannya acuan regulasi.',
  },
];

export const PAK_VALIDATION_CRITERIA: string[] = [
  'Apakah elemen PAK sesuai dengan materi?',
  'Apakah subelemen benar-benar relevan?',
  'Apakah tujuan penguatan karakter jelas?',
  'Apakah aktivitas dapat dilaksanakan peserta didik SD?',
  'Apakah kegiatan sesuai dengan alokasi waktu?',
  'Apakah aktivitas terintegrasi dengan tujuan pembelajaran?',
  'Apakah asesmen dapat mengukur hasil yang diharapkan?',
  'Apakah referensi yang digunakan dapat diverifikasi?',
  'Apakah bahasa sesuai dengan tingkat perkembangan peserta didik?',
  'Apakah integrasi PAK tidak mengganggu tujuan pembelajaran utama?',
];

export function formatPakRelevanceLabel(status: PakRelevanceStatus): string {
  switch (status) {
    case 'sangat_relevan':
      return 'Sangat Relevan';
    case 'relevan_penguatan':
      return 'Relevan sebagai Penguatan';
    case 'tidak_relevan_langsung':
      return 'Tidak Relevan Secara Langsung';
  }
}

export function hasMinimumPakDetectContext(input: Partial<PakAutoDetectInput>): boolean {
  return Boolean(
    input.mataPelajaran &&
      input.mataPelajaran.trim().length >= 2 &&
      input.materi &&
      input.materi.trim().length >= 3,
  );
}

/**
 * Integrates approved PAK recommendations into RpmCoreContent sections cleanly
 * without overwriting or distorting academic Tujuan Pembelajaran.
 */
export function applyPakIntegrationToRpmCore(
  core: RpmCoreContent,
  pak: PakIntegrationRecord,
): RpmCoreContent {
  if (!pak.applied || pak.ignored || pak.relevanceStatus === 'tidak_relevan_langsung') {
    return core;
  }

  const elementNames = pak.elements.map((e) => e.nama).join(', ');
  const subNames = pak.subElements.map((s) => `${s.code} ${s.nama}`).join('; ');
  const ringkasan = pak.integrasiRpmRingkasan;

  const next = structuredClone(core);

  // A. Identifikasi — append character integration note cleanly (idempotent marker)
  const identMarker = '[Integrasi PAK]';
  const baseKar = next.identifikasi.karakteristikPesertaDidik
    .replace(/\n*\[Integrasi PAK\][\s\S]*$/m, '')
    .trim();
  const identNote =
    ringkasan.identifikasiKarakter ||
    `Penguatan nilai ${pak.nilaiAntikorupsi.join(', ')} (${elementNames}) sesuai kebutuhan perkembangan siswa SD.`;
  next.identifikasi.karakteristikPesertaDidik = `${baseKar}\n\n${identMarker} ${identNote}`.trim();

  // B. Desain Pembelajaran — append PAK alignment to keterkaitanPedagogis without mutating academic TP
  const desainMarker = '[Pemetaan Pendidikan Antikorupsi]';
  const baseKeterkaitan = next.desain.keterkaitanPedagogis
    .replace(/\n*\[Pemetaan Pendidikan Antikorupsi\][\s\S]*$/m, '')
    .trim();
  const desainSummary = `${desainMarker} Elemen: ${elementNames} | Subelemen: ${subNames}. Tujuan Penguatan Karakter: ${pak.learningObjectives.join('; ')}.`;
  next.desain.keterkaitanPedagogis = `${baseKeterkaitan}\n\n${desainSummary}`.trim();

  // C & D. Pengalaman Belajar & Kegiatan Pembelajaran (Pendahuluan, Inti: Memahami/Mengaplikasi/Merefleksi, Penutup)
  const pakTagPrefix = '[Penguatan PAK]';
  const stripPakSuffix = (text: string) =>
    text.replace(/\n*\[Penguatan PAK\][\s\S]*$/m, '').trim();
  const topValues = pak.nilaiAntikorupsi.slice(0, 3);

  // A. Pendahuluan: apersepsi, pertanyaan pemantik, pengaitan perilaku berintegritas
  if (next.pengalamanBelajar.pendahuluan[0]) {
    const step = next.pengalamanBelajar.pendahuluan[0];
    const introNote =
      pak.materials[0]?.pertanyaanPemantik[0]
        ? `Pemantik integritas: "${pak.materials[0].pertanyaanPemantik[0]}" (${topValues.join(', ')}).`
        : `Apersepsi dan pengaitan kesepakatan kelas berintegritas (${topValues.join(', ')}).`;
    step.aktivitasGuru = `${stripPakSuffix(step.aktivitasGuru)}\n\n${pakTagPrefix} ${introNote}`;
    step.nilaiPakDikembangkan = topValues;
  }

  // B. Inti: Memahami, Mengaplikasi, Merefleksi
  if (next.pengalamanBelajar.inti.memahami[0]) {
    const step = next.pengalamanBelajar.inti.memahami[0];
    step.aktivitasGuru = `${stripPakSuffix(step.aktivitasGuru)}\n\n${pakTagPrefix} ${ringkasan.pengalamanMemahami || ringkasan.aktivitasGuruSiswa}`;
    step.nilaiPakDikembangkan = topValues;
  }
  if (next.pengalamanBelajar.inti.mengaplikasi[0]) {
    const step = next.pengalamanBelajar.inti.mengaplikasi[0];
    const actDetail = pak.activities[0]
      ? `${pak.activities[0].judul} (${pak.activities[0].jenisAktivitas}): ${pak.activities[0].peranPesertaDidik}`
      : ringkasan.pengalamanMengaplikasi;
    step.aktivitasPesertaDidik = `${stripPakSuffix(step.aktivitasPesertaDidik)}\n\n${pakTagPrefix} ${ringkasan.pengalamanMengaplikasi || actDetail}`;
    step.nilaiPakDikembangkan = topValues;
  }
  if (next.pengalamanBelajar.inti.merefleksi[0]) {
    const step = next.pengalamanBelajar.inti.merefleksi[0];
    step.tujuanAktivitas = `${stripPakSuffix(step.tujuanAktivitas)} ${pakTagPrefix} ${ringkasan.pengalamanMerefleksi}`;
    step.nilaiPakDikembangkan = topValues;
  }

  // C. Penutup: refleksi nilai antikorupsi, penguatan karakter, komitmen penerapan
  if (next.pengalamanBelajar.penutup[0]) {
    const step = next.pengalamanBelajar.penutup[0];
    const closingNote =
      ringkasan.refleksiHarian ||
      `Penguatan karakter (${topValues.join(', ')}) dan komitmen penerapan perilaku jujur serta bertanggung jawab dalam keseharian.`;
    step.aktivitasGuru = `${stripPakSuffix(step.aktivitasGuru)}\n\n${pakTagPrefix} ${closingNote}`;
    step.aktivitasPesertaDidik = `${stripPakSuffix(step.aktivitasPesertaDidik)}\n\n${pakTagPrefix} Menyampaikan satu komitmen nyata menerapkan sikap ${topValues[0] || 'jujur dan tanggung jawab'} di kelas maupun rumah.`;
    step.nilaiPakDikembangkan = topValues;
  }

  // E. Asesmen — enrich formative observation indicator
  const baseInd = next.asesmen.formatif.indikatorPenilaian
    .replace(/\s*\| \[Asesmen PAK\][\s\S]*$/m, '')
    .trim();
  const pakAsesText =
    ringkasan.asesmenPengamatan ||
    `Observasi perilaku ${pak.assessments.sikapPerilaku.nilaiDiamati.slice(0, 3).join(', ')} dengan rubrik perkembangan non-labeling.`;
  next.asesmen.formatif.indikatorPenilaian = `${baseInd} | [Asesmen PAK] ${pakAsesText}`;

  // F. Refleksi — include integrity reflection prompt without duplicating
  const existingRefSet = new Set(next.refleksi.refleksiPesertaDidik.map((r) => r.trim()));
  for (const r of pak.refleksiIntegritas) {
    const clean = r.trim();
    if (clean && !existingRefSet.has(clean)) {
      next.refleksi.refleksiPesertaDidik.push(clean);
      existingRefSet.add(clean);
    }
  }

  return next;
}

export function stripPakIntegrationFromRpmCore(core: RpmCoreContent): RpmCoreContent {
  const next = structuredClone(core);
  next.identifikasi.karakteristikPesertaDidik = next.identifikasi.karakteristikPesertaDidik
    .replace(/\n*\[Integrasi PAK\][\s\S]*$/m, '')
    .trim();
  next.desain.keterkaitanPedagogis = next.desain.keterkaitanPedagogis
    .replace(/\n*\[Pemetaan Pendidikan Antikorupsi\][\s\S]*$/m, '')
    .trim();
  const cleanSteps = (steps: typeof next.pengalamanBelajar.pendahuluan) => {
    for (const step of steps) {
      step.aktivitasGuru = step.aktivitasGuru.replace(/\n*\[Penguatan PAK\][\s\S]*$/m, '').trim();
      step.aktivitasPesertaDidik = step.aktivitasPesertaDidik
        .replace(/\n*\[Penguatan PAK\][\s\S]*$/m, '')
        .trim();
      step.tujuanAktivitas = step.tujuanAktivitas.replace(/\s*\[Penguatan PAK\][\s\S]*$/m, '').trim();
      delete step.nilaiPakDikembangkan;
    }
  };
  cleanSteps(next.pengalamanBelajar.pendahuluan);
  cleanSteps(next.pengalamanBelajar.inti.memahami);
  cleanSteps(next.pengalamanBelajar.inti.mengaplikasi);
  cleanSteps(next.pengalamanBelajar.inti.merefleksi);
  cleanSteps(next.pengalamanBelajar.penutup);
  next.asesmen.formatif.indikatorPenilaian = next.asesmen.formatif.indikatorPenilaian
    .replace(/\s*\| \[Asesmen PAK\][\s\S]*$/m, '')
    .trim();
  return next;
}
