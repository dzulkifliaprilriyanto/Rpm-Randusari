import type {
  DimensiProfilLulusanId,
  PakIntegrationRecord,
  PhaseCode,
  RpmCoreContent,
  RpmDocument,
  SchoolClass,
  TeacherProfile,
} from '../types/rpm';
import { applyPakIntegrationToRpmCore, PAK_OFFICIAL_REFERENCES } from './pak';
import { createSyncedSampleLkpd, validateAndReconcileCrossDocument } from './lkpd';

export const DIMENSI_PROFIL_LULUSAN: {
  id: DimensiProfilLulusanId;
  nama: string;
  deskripsi: string;
}[] = [
  {
    id: 'keimanan',
    nama: 'Keimanan dan Ketakwaan terhadap Tuhan Yang Maha Esa',
    deskripsi: 'Menumbuhkan kesadaran spiritual, akhlak mulia, rasa syukur, dan kepedulian terhadap ciptaan Tuhan.',
  },
  {
    id: 'kewargaan',
    nama: 'Kewargaan',
    deskripsi: 'Menunjukkan kesadaran hak dan kewajiban, cinta tanah air, toleransi, dan kepedulian sosial di lingkungan sekolah dan masyarakat.',
  },
  {
    id: 'penalaran_kritis',
    nama: 'Penalaran Kritis',
    deskripsi: 'Menganalisis informasi, membandingkan fakta, mengajukan pertanyaan mendalam, dan mengambil keputusan berbasis bukti.',
  },
  {
    id: 'kreativitas',
    nama: 'Kreativitas',
    deskripsi: 'Menghasilkan gagasan orisinal, karya nyata, serta solusi alternatif dalam menghadapi persoalan sehari-hari.',
  },
  {
    id: 'kolaborasi',
    nama: 'Kolaborasi',
    deskripsi: 'Bekerja sama secara aktif, saling menghargai peran, dan berbagi tanggung jawab dalam kelompok belajar.',
  },
  {
    id: 'kemandirian',
    nama: 'Kemandirian',
    deskripsi: 'Mengelola waktu, mengambil inisiatif belajar, memantau kemajuan diri, dan bertanggung jawab atas tugas.',
  },
  {
    id: 'kesehatan',
    nama: 'Kesehatan',
    deskripsi: 'Menjaga kebugaran jasmani, kebiasaan hidup bersih dan sehat, serta keseimbangan emosi peserta didik.',
  },
  {
    id: 'komunikasi',
    nama: 'Komunikasi',
    deskripsi: 'Menyampaikan gagasan secara lisan maupun tertulis dengan santun, runtut, dan mudah dipahami.',
  },
];

export const MATA_PELAJARAN_SD: string[] = [
  'Pendidikan Pancasila',
  'Bahasa Indonesia',
  'Matematika',
  'Ilmu Pengetahuan Alam dan Sosial (IPAS)',
  'Pendidikan Jasmani, Olahraga, dan Kesehatan (PJOK)',
  'Seni Budaya dan Prakarya (Seni Rupa)',
  'Seni Budaya dan Prakarya (Seni Musik)',
  'Bahasa Inggris',
  'Bahasa Jawa (Muatan Lokal)',
  'Pendidikan Agama dan Budi Pekerti',
  'Projek Kokurikuler / Lintas Mapel',
];

export const MODEL_PEMBELAJARAN_OPTIONS: string[] = [
  'Biarkan AI Merekomendasikan',
  'Problem Based Learning (PBL)',
  'Project Based Learning (PjBL)',
  'Inquiry Learning',
  'Discovery Learning',
  'Cooperative Learning',
  'Contextual Teaching and Learning (CTL)',
];

export function derivePhaseFromGrade(grade: number): PhaseCode {
  if (grade <= 2) return 'A';
  if (grade <= 4) return 'B';
  return 'C';
}

export function extractGradeNumber(kelasText: string): number {
  const match = String(kelasText || '').match(/[1-6]/);
  return match ? Number(match[0]) : 5;
}

export function sanitizeTextInput(text: string, maxLength = 4000): string {
  if (typeof text !== 'string') return '';
  return text
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
    .trim()
    .slice(0, maxLength);
}

export function createDefaultProfile(): TeacherProfile {
  return {
    namaGuru: '',
    nip: '',
    namaSekolah: 'SDN Randusari',
    alamatSekolah: 'Jl. Randusari, Kecamatan Randusari',
    jabatan: 'Guru Kelas',
    mataPelajaranUtama: 'Ilmu Pengetahuan Alam dan Sosial (IPAS)',
    namaKepalaSekolah: '',
    nipKepalaSekolah: '',
    catatanTambahan: '',
    updatedAt: new Date().toISOString(),
  };
}

export function createDefaultRpmCore(
  profile: TeacherProfile,
  selectedClass?: SchoolClass,
): RpmCoreContent {
  const gradeNum = selectedClass ? selectedClass.grade : 5;
  const phase = selectedClass ? selectedClass.phase : derivePhaseFromGrade(gradeNum);
  const semester = selectedClass ? selectedClass.semester : '1';
  const academicYear = selectedClass ? selectedClass.academicYear : '2026/2027';
  const kelasLabel = selectedClass ? selectedClass.className : `Kelas ${gradeNum}`;
  const todayFormatted = new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date());

  return {
    identitas: {
      namaSatuanPendidikan: profile.namaSekolah || 'SDN Randusari',
      namaGuru: profile.namaGuru || '',
      nipGuru: profile.nip || '',
      mataPelajaran: profile.mataPelajaranUtama || 'Ilmu Pengetahuan Alam dan Sosial (IPAS)',
      kelas: kelasLabel,
      fase: phase,
      semester,
      tahunAjaran: academicYear,
      materi: '',
      alokasiWaktu: '2 x 35 menit (1 Pertemuan)',
    },
    identifikasi: {
      karakteristikPesertaDidik: selectedClass
        ? `Peserta didik ${kelasLabel} berjumlah ${selectedClass.studentCount} siswa dengan beragam gaya belajar visual, auditori, dan kinestetik.`
        : 'Peserta didik Sekolah Dasar dengan beragam kecepatan belajar, rasa ingin tahu tinggi, dan menyukai aktivitas konkret.',
      pengetahuanAwal: '',
      kebutuhanBelajar: '',
      potensiMinat: '',
      konteksLingkunganSekolah: 'Lingkungan SDN Randusari mendukung pembelajaran aktif berbasis observasi lingkungan sekitar sekolah dan kolaborasi kelompok kecil.',
      materiPembelajaran: '',
      dimensiProfilLulusan: [
        {
          id: 'penalaran_kritis',
          nama: 'Penalaran Kritis',
          alasanRelevansi: 'Peserta didik dilatih mengamati fenomena nyata dan menarik kesimpulan berbasis bukti.',
        },
        {
          id: 'kolaborasi',
          nama: 'Kolaborasi',
          alasanRelevansi: 'Peserta didik bekerja dalam kelompok kecil untuk memecahkan masalah dan berbagi peran.',
        },
      ],
    },
    desain: {
      capaianPembelajaran: '',
      cpPerluVerifikasi: true,
      tujuanPembelajaran: [''],
      kriteriaKetercapaian: [''],
      topikPembelajaran: '',
      praktikPedagogis: 'Pembelajaran aktif berpusat pada peserta didik dengan eksplorasi konsep konkret menuju pemahaman bermakna.',
      modelPembelajaran: 'Problem Based Learning (PBL)',
      metodePembelajaran: 'Diskusi kelompok, observasi, tanya jawab terbimbing, dan presentasi karya',
      kemitraanPembelajaran: 'Kolaborasi antarpeserta didik, guru kelas, dan orang tua/wali dalam penguatan konteks di rumah.',
      lingkunganPembelajaran: 'Ruang kelas yang ditata berkelompok dan lingkungan halaman SDN Randusari yang aman serta kondusif.',
      pemanfaatanDigital: 'Proyektor/layar kelas untuk menayangkan gambar/video pemantik singkat atau kuis reflektif sederhana.',
      mediaSumberBelajar: ['Buku Guru & Buku Siswa Kurikulum Merdeka', 'Lembar Kerja Peserta Didik (LKPD)', 'Benda konkret / gambar kontekstual'],
      keterkaitanPedagogis: '',
    },
    pengalamanBelajar: {
      pendahuluan: [
        {
          id: 'step-pendahuluan-1',
          namaAktivitas: 'Orientasi Berkesadaran dan Apersepsi Bermakna',
          tahap: 'Pendahuluan',
          prinsip: ['Mindful', 'Meaningful'],
          aktivitasGuru: 'Membuka pelajaran dengan salam, doa bersama, mengecek kehadiran dan kesiapan emosional siswa, lalu mengaitkan pengalaman sehari-hari siswa dengan topik pembelajaran.',
          aktivitasPesertaDidik: 'Menjawab salam, berdoa dengan khidmat, melakukan teknik napas tenang sejenak, dan menyampaikan pengalaman yang berkaitan dengan pertanyaan pemantik.',
          alokasiWaktuMenit: 10,
          metodeStrategi: 'Apersepsi interaktif dan kesadaran penuh (mindful check-in)',
          tujuanAktivitas: 'Membangun kesiapan mental, fokus belajar, dan koneksi bermakna dengan pengetahuan awal siswa.',
        },
      ],
      inti: {
        memahami: [
          {
            id: 'step-memahami-1',
            namaAktivitas: 'Eksplorasi Konsep dari Fenomena Nyata',
            tahap: 'Memahami',
            prinsip: ['Mindful', 'Meaningful'],
            aktivitasGuru: 'Menyajikan fenomena atau masalah kontekstual sesuai kehidupan siswa SD, lalu membimbing siswa mengamati dan merumuskan pertanyaan kunci.',
            aktivitasPesertaDidik: 'Mengamati objek/bacaan/ilustrasi dengan saksama, mencatat temuan penting, dan berdiskusi mendalami konsep dasar.',
            alokasiWaktuMenit: 20,
            metodeStrategi: 'Observasi terbimbing dan tanya jawab mendalam',
            tujuanAktivitas: 'Membangun pemahaman konsep secara mendalam melalui pengamatan dan penalaran kritis.',
          },
        ],
        mengaplikasi: [
          {
            id: 'step-mengaplikasi-1',
            namaAktivitas: 'Pemecahan Masalah dan Aksi Kolaboratif',
            tahap: 'Mengaplikasi',
            prinsip: ['Meaningful', 'Joyful'],
            aktivitasGuru: 'Membagi kelompok heterogen, membagikan LKPD, memantau kerja kelompok, dan memberi bimbingan diferensiasi bagi siswa yang membutuhkan.',
            aktivitasPesertaDidik: 'Bekerja sama menyelesaikan tantangan pada LKPD, mencoba mempraktikkan konsep ke situasi baru, dan mempresentasikan hasilnya dengan percaya diri.',
            alokasiWaktuMenit: 25,
            metodeStrategi: 'Diskusi kelompok, praktik terbimbing, dan presentasi',
            tujuanAktivitas: 'Menerapkan pemahaman konseptual ke dalam konteks nyata secara kolaboratif dan menggembirakan.',
          },
        ],
        merefleksi: [
          {
            id: 'step-merefleksi-1',
            namaAktivitas: 'Sintesis dan Refleksi Diri',
            tahap: 'Merefleksi',
            prinsip: ['Mindful', 'Meaningful'],
            aktivitasGuru: 'Memandu siswa meninjau kembali apa yang telah dipelajari, kesulitan yang ditemui, serta manfaat materi bagi kehidupan sehari-hari.',
            aktivitasPesertaDidik: 'Menyampaikan kesimpulan dengan bahasa sendiri, mengisi catatan refleksi singkat, dan memberi umpan balik positif kepada teman.',
            alokasiWaktuMenit: 10,
            metodeStrategi: 'Refleksi terbimbing dan umpan balik teman sebaya',
            tujuanAktivitas: 'Menumbuhkan metakognisi dan kesadaran akan proses serta makna belajar.',
          },
        ],
      },
      penutup: [
        {
          id: 'step-penutup-1',
          namaAktivitas: 'Penguatan, Tindak Lanjut, dan Doa Penutup',
          tahap: 'Penutup',
          prinsip: ['Mindful', 'Joyful'],
          aktivitasGuru: 'Memberikan umpan balik apresiatif, menyampaikan rencana pertemuan berikutnya, serta menutup kelas dengan doa dan salam.',
          aktivitasPesertaDidik: 'Menyimak penguatan guru, mencatat pesan tindak lanjut sederhana, dan berdoa bersama dengan tertib.',
          alokasiWaktuMenit: 5,
          metodeStrategi: 'Penguatan positif dan penutupan berkesadaran',
          tujuanAktivitas: 'Menutup pembelajaran dengan rasa pencapaian, kejelasan tindak lanjut, dan ketenangan.',
        },
      ],
    },
    asesmen: {
      diagnostik: {
        tujuan: 'Mengidentifikasi kesiapan belajar dan pemahaman awal peserta didik sebelum materi inti dimulai.',
        teknik: 'Tanya jawab lisan dan pemetaan cepat',
        instrumen: 'Pertanyaan pemantik awal dan catatan kesiapan siswa',
        indikatorPenilaian: 'Siswa mampu mengungkapkan pengalaman atau pengetahuan awal terkait topik.',
        kriteriaKeberhasilan: 'Guru memperoleh peta kesiapan belajar siswa (mahir, berkembang, perlu bimbingan).',
      },
      formatif: {
        tujuan: 'Memantau perkembangan pemahaman, proses kolaborasi, dan keterampilan berpikir selama pembelajaran berlangsung.',
        teknik: 'Observasi kinerja dan penilaian proses LKPD',
        instrumen: 'Lembar observasi aktivitas kelompok dan rubrik proses',
        indikatorPenilaian: 'Ketepatan analisis, keaktifan berdiskusi, dan keberanian mengemukakan alasan.',
        kriteriaKeberhasilan: 'Minimal 75% peserta didik aktif berpartisipasi dan menunjukkan kemajuan pemahaman konsep.',
      },
      sumatif: {
        tujuan: 'Mengukur ketercapaian Tujuan Pembelajaran di akhir rangkaian pertemuan.',
        teknik: 'Tes tertulis/unjuk kerja dan produk hasil belajar',
        instrumen: 'Soal evaluasi terstruktur dan rubrik penilaian produk',
        indikatorPenilaian: 'Ketuntasan menjawab soal pemahaman serta kemampuan menerapkan konsep pada kasus nyata.',
        kriteriaKeberhasilan: 'Peserta didik mencapai kriteria ketercapaian tujuan pembelajaran (minimal kategori Baik).',
      },
    },
    diferensiasi: {
      konten: 'Menyediakan bahan bacaan bergambar dan contoh konkret bagi siswa yang memerlukan dukungan visual, serta tantangan pengayaan kontekstual bagi siswa yang cepat memahami.',
      proses: 'Memberikan pendampingan langkah demi langkah pada kelompok yang membutuhkan dan kebebasan eksplorasi mandiri bagi kelompok yang sudah siap.',
      produk: 'Peserta didik dapat menyampaikan hasil pemahaman melalui tulisan terstruktur, poster mini, atau presentasi lisan sesuai potensi masing-masing.',
    },
    refleksi: {
      refleksiGuru: [
        'Apakah seluruh tujuan pembelajaran dan alokasi waktu terlaksana sesuai rencana?',
        'Bagian aktivitas mana yang paling mendorong peserta didik berpikir mendalam dan antusias?',
        'Peserta didik mana yang memerlukan tindak lanjut pendampingan pada pertemuan berikutnya?',
      ],
      refleksiPesertaDidik: [
        'Hal baru dan paling bermakna apa yang aku pelajari hari ini?',
        'Bagian mana yang masih terasa membingungkan dan ingin kupelajari lagi?',
        'Bagaimana perasaanku saat bekerja sama dengan teman hari ini?',
      ],
    },
    pengesahan: {
      tempat: 'Randusari',
      tanggal: todayFormatted,
      jabatanKepalaSekolah: 'Kepala SDN Randusari',
      namaKepalaSekolah: profile.namaKepalaSekolah || '',
      nipKepalaSekolah: profile.nipKepalaSekolah || '',
      namaGuru: profile.namaGuru || '',
      nipGuru: profile.nip || '',
    },
  };
}

export interface LocalQualityAudit {
  isComplete: boolean;
  totalMinutes: number;
  coveredPrinciples: string[];
  missingSections: string[];
  warnings: string[];
}

export function auditRpmStructure(rpm: RpmCoreContent): LocalQualityAudit {
  const missingSections: string[] = [];
  const warnings: string[] = [];

  if (!rpm.identitas.materi.trim()) missingSections.push('Materi / Topik Pembelajaran');
  if (!rpm.identitas.mataPelajaran.trim()) missingSections.push('Mata Pelajaran');
  if (!rpm.desain.capaianPembelajaran.trim()) missingSections.push('Capaian Pembelajaran (CP)');
  const validTps = rpm.desain.tujuanPembelajaran.filter((t) => t.trim().length > 0);
  if (validTps.length === 0) missingSections.push('Tujuan Pembelajaran (TP)');
  if (rpm.identifikasi.dimensiProfilLulusan.length === 0) {
    missingSections.push('Dimensi Profil Lulusan');
  }

  const allSteps = [
    ...rpm.pengalamanBelajar.pendahuluan,
    ...rpm.pengalamanBelajar.inti.memahami,
    ...rpm.pengalamanBelajar.inti.mengaplikasi,
    ...rpm.pengalamanBelajar.inti.merefleksi,
    ...rpm.pengalamanBelajar.penutup,
  ];

  if (rpm.pengalamanBelajar.inti.memahami.length === 0) missingSections.push('Kegiatan Inti: Memahami');
  if (rpm.pengalamanBelajar.inti.mengaplikasi.length === 0) missingSections.push('Kegiatan Inti: Mengaplikasi');
  if (rpm.pengalamanBelajar.inti.merefleksi.length === 0) missingSections.push('Kegiatan Inti: Merefleksi');

  const totalMinutes = allSteps.reduce((acc, s) => acc + (Number(s.alokasiWaktuMenit) || 0), 0);
  const principleSet = new Set<string>();
  for (const s of allSteps) {
    for (const p of s.prinsip || []) {
      principleSet.add(p);
    }
  }

  const coveredPrinciples = Array.from(principleSet);
  if (coveredPrinciples.length < 3) {
    warnings.push('Pastikan ketiga prinsip Mindful, Meaningful, dan Joyful terintegrasi pada rangkaian kegiatan.');
  }
  if (rpm.desain.cpPerluVerifikasi) {
    warnings.push('Capaian Pembelajaran (CP) ditandai perlu verifikasi terhadap dokumen resmi Kurikulum Merdeka terbaru.');
  }
  if (rpm.identifikasi.dimensiProfilLulusan.length > 5) {
    warnings.push('Terlalu banyak Dimensi Profil Lulusan dipilih. Sebaiknya pilih 2-4 dimensi yang paling relevan agar fokus.');
  }
  if (totalMinutes <= 0) {
    warnings.push('Total alokasi waktu aktivitas masih 0 menit.');
  }

  return {
    isComplete: missingSections.length === 0,
    totalMinutes,
    coveredPrinciples,
    missingSections,
    warnings,
  };
}

export interface RpmFilterParams {
  search: string;
  grade: string;
  subject: string;
  status: 'all' | 'draft' | 'final';
  page: number;
  pageSize: number;
}

export function filterAndPaginateRpms(
  plans: RpmDocument[],
  params: RpmFilterParams,
): { items: RpmDocument[]; totalItems: number; totalPages: number; currentPage: number } {
  const q = params.search.trim().toLowerCase();
  const filtered = plans.filter((plan) => {
    if (params.status !== 'all' && plan.status !== params.status) return false;
    if (params.grade !== 'all' && !plan.grade.toLowerCase().includes(params.grade.toLowerCase())) {
      return false;
    }
    if (params.subject !== 'all' && plan.subject !== params.subject) return false;
    if (q) {
      const hay = `${plan.title} ${plan.topic} ${plan.subject} ${plan.grade} ${plan.content.identitas.namaGuru}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });

  const sorted = [...filtered].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  );

  const pageSize = Math.max(1, params.pageSize);
  const totalItems = sorted.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const currentPage = Math.min(Math.max(1, params.page), totalPages);
  const start = (currentPage - 1) * pageSize;
  return {
    items: sorted.slice(start, start + pageSize),
    totalItems,
    totalPages,
    currentPage,
  };
}

export interface SectionDiffItem {
  section: string;
  changed: boolean;
  beforeSummary: string;
  afterSummary: string;
}

export function computeRpmDiff(before: RpmCoreContent, after: RpmCoreContent): SectionDiffItem[] {
  const sections: { key: keyof RpmCoreContent; label: string; summarize: (val: RpmCoreContent) => string }[] = [
    {
      key: 'identitas',
      label: 'A. Identitas Pembelajaran',
      summarize: (v) => `${v.identitas.mataPelajaran} · ${v.identitas.kelas} · ${v.identitas.materi || '(belum diisi)'}`,
    },
    {
      key: 'identifikasi',
      label: 'B. Identifikasi & Profil Lulusan',
      summarize: (v) =>
        `${v.identifikasi.dimensiProfilLulusan.length} dimensi · ${v.identifikasi.karakteristikPesertaDidik.slice(0, 90)}`,
    },
    {
      key: 'desain',
      label: 'C. Desain Pembelajaran (CP, TP, Model)',
      summarize: (v) =>
        `${v.desain.tujuanPembelajaran.length} TP · Model: ${v.desain.modelPembelajaran}`,
    },
    {
      key: 'pengalamanBelajar',
      label: 'D. Pengalaman Belajar (Memahami, Mengaplikasi, Merefleksi)',
      summarize: (v) => {
        const count =
          v.pengalamanBelajar.pendahuluan.length +
          v.pengalamanBelajar.inti.memahami.length +
          v.pengalamanBelajar.inti.mengaplikasi.length +
          v.pengalamanBelajar.inti.merefleksi.length +
          v.pengalamanBelajar.penutup.length;
        return `${count} langkah aktivitas · ${v.pengalamanBelajar.inti.memahami[0]?.namaAktivitas || ''}`;
      },
    },
    {
      key: 'asesmen',
      label: 'E. Asesmen Pembelajaran',
      summarize: (v) => `Diagnostik: ${v.asesmen.diagnostik.teknik} · Sumatif: ${v.asesmen.sumatif.teknik}`,
    },
    {
      key: 'diferensiasi',
      label: 'F. Diferensiasi Pembelajaran',
      summarize: (v) => v.diferensiasi.proses.slice(0, 100),
    },
    {
      key: 'refleksi',
      label: 'G. Refleksi Guru & Peserta Didik',
      summarize: (v) => `${v.refleksi.refleksiGuru.length} butir guru · ${v.refleksi.refleksiPesertaDidik.length} butir siswa`,
    },
  ];

  return sections.map((sec) => {
    const bStr = JSON.stringify(before[sec.key]);
    const aStr = JSON.stringify(after[sec.key]);
    return {
      section: sec.label,
      changed: bStr !== aStr,
      beforeSummary: sec.summarize(before),
      afterSummary: sec.summarize(after),
    };
  });
}

export function createSampleIpasRpm(profile: TeacherProfile, uid: string): RpmDocument {
  const base = createDefaultRpmCore(profile);
  const now = new Date().toISOString();
  base.identitas = {
    ...base.identitas,
    namaGuru: profile.namaGuru || 'Ibu Siti Aminah, S.Pd.',
    mataPelajaran: 'Ilmu Pengetahuan Alam dan Sosial (IPAS)',
    kelas: 'Kelas 5A',
    fase: 'C',
    semester: '1',
    tahunAjaran: '2026/2027',
    materi: 'Siklus Air dan Pelestarian Sumber Air Bersih di Lingkungan Sekitar',
    alokasiWaktu: '2 x 35 menit (1 Pertemuan)',
  };
  base.identifikasi = {
    karakteristikPesertaDidik:
      'Peserta didik Kelas 5A berjumlah 28 anak dengan kemampuan membaca beragam; sebagian besar sangat antusias pada percobaan sederhana dan pengamatan langsung.',
    pengetahuanAwal:
      'Siswa sudah mengenal wujud benda (padat, cair, gas) serta mengalami peristiwa hujan dan genangan yang mengering.',
    kebutuhanBelajar:
      'Memerlukan bantuan visualisasi proses penguapan dan pengembunan karena proses perubahan uap air tidak selalu terlihat langsung.',
    potensiMinat:
      'Tertarik pada kegiatan eksperimen mini, menggambar alur, dan diskusi kelompok tentang lingkungan sekolah.',
    konteksLingkunganSekolah:
      'SDN Randusari memiliki halaman sekolah dengan tanaman rindang, saluran resapan, dan sumur sekolah yang dapat diamati langsung.',
    materiPembelajaran:
      'Tahapan siklus air (evaporasi, kondensasi, presipitasi, infiltrasi) serta dampaknya bagi ketersediaan air bersih.',
    dimensiProfilLulusan: [
      {
        id: 'penalaran_kritis',
        nama: 'Penalaran Kritis',
        alasanRelevansi: 'Siswa menganalisis hubungan perubahan wujud air dengan fenomena hujan dan banjir di lingkungan.',
      },
      {
        id: 'kolaborasi',
        nama: 'Kolaborasi',
        alasanRelevansi: 'Siswa bekerja bersama merangkai alat simulasi siklus air sederhana dan mendiskusikan hasilnya.',
      },
      {
        id: 'komunikasi',
        nama: 'Komunikasi',
        alasanRelevansi: 'Siswa mempresentasikan hasil pengamatan dan ajakan hemat air dengan bahasa yang runtut.',
      },
    ],
  };
  base.desain = {
    capaianPembelajaran:
      'Peserta didik memahami hubungan antara fenomena alam (siklus air) dengan kondisi lingkungan sekitar serta upaya pelestarian sumber daya air. [Catatan: Mohon verifikasi redaksi CP resmi sekolah/Kurikulum Merdeka terbaru].',
    cpPerluVerifikasi: true,
    tujuanPembelajaran: [
      'Menjelaskan tahapan siklus air (evaporasi, kondensasi, presipitasi, dan infiltrasi) secara runtut berdasarkan pengamatan simulasi.',
      'Menganalisis dampak perilaku manusia terhadap siklus air dan merancang tindakan nyata hemat air di SDN Randusari.',
    ],
    kriteriaKetercapaian: [
      'Mampu mengurutkan dan menjelaskan minimal 4 tahapan siklus air dengan istilah yang tepat.',
      'Mampu menyebutkan minimal 2 penyebab terganggunya penyerapan air dan 2 solusi hemat air di sekolah.',
    ],
    topikPembelajaran: 'Bagaimana Air Terus Berputar dan Mengapa Kita Harus Menjaganya?',
    praktikPedagogis:
      'Pendekatan Pembelajaran Mendalam berbasis inkuiri dan pemecahan masalah nyata di lingkungan sekolah.',
    modelPembelajaran: 'Problem Based Learning (PBL)',
    metodePembelajaran: 'Eksperimen mini, observasi lingkungan, diskusi kelompok, dan presentasi poster alur.',
    kemitraanPembelajaran: 'Kolaborasi guru kelas, penjaga sekolah terkait pengamatan saluran air/tandon, dan orang tua untuk pembiasaan hemat air di rumah.',
    lingkunganPembelajaran: 'Kelas ditata dalam 5 meja kelompok serta observasi singkat ke taman resapan halaman SDN Randusari.',
    pemanfaatanDigital: 'Menayangkan ilustrasi animasi siklus air menggunakan proyektor kelas selama 3 menit sebagai penguat konsep.',
    mediaSumberBelajar: [
      'Wadah bening, air hangat, es batu, dan plastik penutup untuk simulasi hujan mini',
      'Kartu tahapan siklus air dan LKPD SDN Randusari',
      'Buku Siswa IPAS Kelas V Kurikulum Merdeka',
    ],
    keterkaitanPedagogis:
      'CP tentang fenomena alam diturunkan menjadi TP analisis siklus air dan aksi pelestarian. Hal ini melatih Penalaran Kritis, Kolaborasi, dan Komunikasi melalui model PBL yang memadukan pengalaman Memahami (eksperimen), Mengaplikasi (audit penggunaan air di sekolah), dan Merefleksi (komitmen pribadi).',
  };
  base.pengalamanBelajar = {
    pendahuluan: [
      {
        id: 'sample-pend-1',
        namaAktivitas: 'Hening Sejenak dan Pertanyaan Pemantik Segelas Air',
        tahap: 'Pendahuluan',
        prinsip: ['Mindful', 'Meaningful'],
        aktivitasGuru:
          'Menyapa siswa dengan hangat, mengajak berdoa, melakukan latihan napas tenang 30 detik, lalu menunjukkan segelas air bersih dan bertanya: "Dari mana asal air ini sebelum sampai ke keran sekolah kita?"',
        aktivitasPesertaDidik:
          'Mengikuti latihan fokus dengan tenang, mengamati gelas air, lalu berbagi dugaan awal tentang asal-usul air dan hujan.',
        alokasiWaktuMenit: 10,
        metodeStrategi: 'Mindful check-in & pertanyaan pemantik kontekstual',
        tujuanAktivitas: 'Memusatkan perhatian siswa secara sadar dan menggali pengetahuan awal tentang siklus air.',
      },
    ],
    inti: {
      memahami: [
        {
          id: 'sample-mem-1',
          namaAktivitas: 'Simulasi Mini Hujan dalam Wadah Bening',
          tahap: 'Memahami',
          prinsip: ['Mindful', 'Meaningful'],
          aktivitasGuru:
            'Membimbing kelompok menaruh air hangat dalam wadah bening, menutup dengan plastik berisi es batu, dan memandu siswa mengamati terbentuknya uap serta titik air jatuh.',
          aktivitasPesertaDidik:
            'Mengamati perubahan di dalam wadah tiap menit, mencatat proses penguapan, pengembunan di plastik, dan tetesan air yang jatuh layaknya hujan.',
          alokasiWaktuMenit: 20,
          metodeStrategi: 'Eksperimen terbimbing dan pengamatan cermat',
          tujuanAktivitas: 'Memahami proses evaporasi, kondensasi, dan presipitasi melalui pengalaman konkret.',
        },
      ],
      mengaplikasi: [
        {
          id: 'sample-app-1',
          namaAktivitas: 'Detektif Air SDN Randusari dan Peta Solusi',
          tahap: 'Mengaplikasi',
          prinsip: ['Meaningful', 'Joyful'],
          aktivitasGuru:
            'Mengajak siswa menelusuri LKPD tantangan kasus halaman sekolah yang tergenang/keran menetes, lalu meminta tiap kelompok membuat diagram alur siklus air beserta 2 aksi nyata menjaga air bersih.',
          aktivitasPesertaDidik:
            'Berdiskusi dalam kelompok, menggambar diagram siklus air berwarna pada kertas plano/LKPD, dan mempresentasikan solusi hemat air dengan gaya kreatif.',
          alokasiWaktuMenit: 25,
          metodeStrategi: 'Diskusi pemecahan masalah & gallery walk sederhana',
          tujuanAktivitas: 'Mengaplikasikan konsep siklus air dan infiltrasi untuk memecahkan masalah nyata di sekolah.',
        },
      ],
      merefleksi: [
        {
          id: 'sample-ref-1',
          namaAktivitas: 'Kartu Komitmen dan Refleksi Makna Air',
          tahap: 'Merefleksi',
          prinsip: ['Mindful', 'Meaningful'],
          aktivitasGuru:
            'Membagikan kartu refleksi singkat dan memandu siswa menuliskan satu kebiasaan baru menghemat air yang akan dilakukan mulai hari ini.',
          aktivitasPesertaDidik:
            'Menuliskan pemahaman kunci yang baru didapat serta satu aksi pribadi menjaga air bersih di sekolah dan rumah.',
          alokasiWaktuMenit: 10,
          metodeStrategi: 'Refleksi tertulis & berbagi berpasangan',
          tujuanAktivitas: 'Menyadari makna pembelajaran bagi kehidupan sehari-hari dan membangun tanggung jawab diri.',
        },
      ],
    },
    penutup: [
      {
        id: 'sample-pen-1',
        namaAktivitas: 'Rangkuman Bersama dan Apresiasi',
        tahap: 'Penutup',
        prinsip: ['Joyful', 'Mindful'],
        aktivitasGuru:
          'Bersama siswa menyimpulkan 4 tahap siklus air dengan tepuk irama singkat, memberi apresiasi atas kerja sama kelompok, dan menutup dengan doa.',
        aktivitasPesertaDidik:
          'Mengucapkan rangkuman alur siklus air secara bersama-sama, merapikan alat percobaan, dan berdoa penutup.',
        alokasiWaktuMenit: 5,
        metodeStrategi: 'Rangkuman kolaboratif & penutupan positif',
        tujuanAktivitas: 'Menguatkan ingatan konsep inti dengan suasana menggembirakan dan tertib.',
      },
    ],
  };

  const lessonPlanId = `rpm-sample-${Date.now()}`;
  const samplePak: PakIntegrationRecord = {
    id: `pak-sample-${Date.now()}`,
    lessonPlanId,
    elements: [
      {
        id: 'elemen_2',
        kode: 'ELEMEN 2',
        nama: 'Konsep Kepemilikan',
        peran: 'utama',
      },
      {
        id: 'elemen_3',
        kode: 'ELEMEN 3',
        nama: 'Menjaga Amanah',
        peran: 'pendukung',
      },
    ],
    subElements: [
      {
        code: '2.2',
        elemenId: 'elemen_2',
        nama: 'Menghormati hak kepemilikan dan bertanggung jawab',
      },
      {
        code: '3.1',
        elemenId: 'elemen_3',
        nama: 'Kesadaran pentingnya menjaga amanah',
      },
    ],
    nilaiAntikorupsi: ['Jujur', 'Peduli', 'Tanggung Jawab'],
    relevanceStatus: 'sangat_relevan',
    relevanceLabel: 'Sangat Relevan',
    relevanceReason:
      'Materi pelestarian air bersih di lingkungan sekolah berkaitan erat dengan tanggung jawab menjaga fasilitas umum bersama dan sikap jujur melaporkan kondisi penggunaan air.',
    alternatifPenguatan:
      'Pembiasaan menutup keran air setelah digunakan dan menjaga kebersihan taman resapan sekolah.',
    learningObjectives: [
      'Menunjukkan sikap peduli dan tanggung jawab dalam menjaga sumber serta fasilitas air bersih milik bersama di sekolah.',
      'Melaporkan hasil pengamatan penggunaan air di sekolah secara jujur dan objektif.',
    ],
    materials: [
      {
        namaMateri: 'Menjaga Air Bersih Sebagai Amanah Bersama',
        elemen: 'ELEMEN 2: Konsep Kepemilikan',
        subelemen: '2.2 Menghormati hak kepemilikan dan bertanggung jawab',
        nilaiAntikorupsi: ['Jujur', 'Peduli', 'Tanggung Jawab'],
        tujuanPenguatanKarakter:
          'Menumbuhkan rasa memiliki dan tanggung jawab atas fasilitas air bersih bersama di sekolah.',
        penjelasanMateri:
          'Air bersih dan keran sekolah adalah milik bersama. Membiarkan air terbuang percuma atau merusak saluran air merugikan hak teman-teman lain.',
        contohPenerapan: [
          'Menutup rapat keran air setelah mencuci tangan.',
          'Mencatat hasil pengamatan kelompok sesuai fakta sebenarnya.',
        ],
        aktivitasPesertaDidik:
          'Mengaudit titik penggunaan air di sekolah secara jujur dan menyepakati piket pengingat hemat air kelas.',
        pertanyaanPemantik: [
          'Apa yang terjadi bagi teman-teman lain jika kita membiarkan keran sekolah terus menetes?',
        ],
        asesmenRingkas: 'Observasi tanggung jawab merapikan alat simulasi dan kejujuran catatan pengamatan.',
        indikatorKeberhasilan: [
          'Siswa mencatat data pengamatan secara jujur.',
          'Siswa menjaga peralatan simulasi dan fasilitas air sekolah.',
        ],
        isAiGenerated: false,
      },
    ],
    activities: [
      {
        jenisAktivitas: 'Studi kasus sederhana',
        judul: 'Audit Jujur & Aksi Hemat Air Kelas 5A',
        tujuan: 'Melatih tanggung jawab menjaga fasilitas bersama dan kejujuran melaporkan pengamatan.',
        elemenPak: 'Konsep Kepemilikan',
        subelemenPak: '2.2 Menghormati hak kepemilikan dan bertanggung jawab',
        prinsipPembelajaranMendalam: ['Meaningful', 'Joyful'],
        langkahKegiatan: [
          'Mengamati kondisi keran dan saluran air sekolah sesuai daftar cek.',
          'Mencatat temuan secara jujur tanpa menambah atau mengurangi fakta.',
          'Menyusun 2 kesepakatan kelas untuk menjaga air bersih.',
        ],
        peranGuru: 'Memandu diskusi adil dan mengapresiasi laporan jujur peserta didik.',
        peranPesertaDidik: 'Bekerja sama jujur dan menjaga kebersihan alat belajar.',
        alokasiWaktuMenit: 15,
        indikatorKeberhasilan: 'Seluruh kelompok menyajikan catatan sesuai fakta dan komitmen kelas.',
      },
    ],
    assessments: {
      pengetahuan: {
        fokus: ['Hak dan tanggung jawab menjaga fasilitas air bersama'],
        bentukInstrumen: 'Pertanyaan reflektif pada LKPD',
        indikator: ['Menjelaskan alasan pentingnya menghemat air bagi kepentingan bersama.'],
      },
      sikapPerilaku: {
        nilaiDiamati: ['Jujur', 'Peduli', 'Tanggung Jawab'],
        teknikObservasi: 'Observasi selama eksperimen dan diskusi kelompok',
        indikator: ['Menggunakan air secukupnya dan mencatat hasil sesuai pengamatan nyata.'],
      },
      praktik: {
        bentukPraktik: ['Merapikan alat simulasi dan menutup keran sekolah dengan benar'],
        kriteriaPengamatan: 'Kemandirian dan kepedulian terhadap fasilitas kelas',
        indikator: ['Alat percobaan kembali bersih dan tertata rapi setelah pembelajaran.'],
      },
      rubrikPerkembangan: [
        {
          aspek: 'Tanggung Jawab Fasilitas Bersama & Kejujuran',
          sangatBerkembang: 'Konsisten menjaga fasilitas air/alat belajar, mencatat jujur, dan mengingatkan teman dengan santun.',
          berkembangSesuaiHarapan: 'Menjaga alat belajar dan menuliskan hasil pengamatan sesuai fakta secara mandiri.',
          mulaiBerkembang: 'Menjaga alat dan melaporkan hasil dengan pengingat dari guru atau teman.',
          memerlukanBimbingan: 'Memerlukan pendampingan langsung dalam membiasakan sikap tertib dan tanggung jawab.',
        },
      ],
      catatanPembinaanNonLabeling:
        'Penilaian bersifat pembinaan karakter positif dan tidak memberi label moral permanen kepada anak.',
    },
    refleksiIntegritas: [
      'Bagaimana caraku menjaga fasilitas air dan barang milik bersama di sekolah dengan penuh tanggung jawab?',
    ],
    integrasiRpmRingkasan: {
      identifikasiKarakter:
        'Penguatan nilai Jujur, Peduli, dan Tanggung Jawab dalam menjaga sumber daya air sebagai fasilitas bersama.',
      desainKarakter:
        'Terintegrasi dengan ELEMEN 2 (2.2) dan ELEMEN 3 (3.1) pada konteks audit hemat air sekolah.',
      pengalamanMemahami:
        'Mencatat hasil pengamatan simulasi hujan secara jujur dan objektif sesuai fakta kelompok.',
      pengalamanMengaplikasi:
        'Melakukan audit penggunaan air sekolah dan merancang kesepakatan kelas menjaga fasilitas bersama.',
      pengalamanMerefleksi:
        'Menyadari dampak kejujuran dan tanggung jawab terhadap ketersediaan air bagi semua warga sekolah.',
      aktivitasGuruSiswa:
        'Guru membimbing observasi adil; siswa mencatat jujur dan merapikan peralatan bersama.',
      asesmenPengamatan:
        'Observasi sikap jujur mencatat data serta tanggung jawab menjaga alat dan keran sekolah.',
      refleksiHarian:
        'Komitmen menutup keran rapat dan mengingatkan teman dengan santun.',
    },
    references: PAK_OFFICIAL_REFERENCES,
    qualityValidation: [],
    applied: true,
    ignored: false,
    createdAt: now,
    updatedAt: now,
  };

  const integratedCore = applyPakIntegrationToRpmCore(base, samplePak);
  const rawLkpd = createSyncedSampleLkpd(integratedCore, samplePak, lessonPlanId);
  const reconciled = validateAndReconcileCrossDocument(
    integratedCore,
    rawLkpd,
    samplePak,
    lessonPlanId,
    'reconcile_lkpd_to_rpm',
  );

  return {
    id: lessonPlanId,
    uid,
    title: 'RPM IPAS Kelas 5 — Siklus Air & Pelestarian Sumber Air',
    subject: reconciled.rpm.identitas.mataPelajaran,
    grade: reconciled.rpm.identitas.kelas,
    phase: reconciled.rpm.identitas.fase,
    semester: reconciled.rpm.identitas.semester,
    topic: reconciled.rpm.identitas.materi,
    status: 'draft',
    version: 1,
    content: reconciled.rpm,
    perangkat: {
      lkpd: reconciled.lkpd,
    },
    pakIntegration: samplePak,
    crossValidation: reconciled.validation,
    revisionHistory: [
      {
        version: 1,
        timestamp: now,
        section: 'Inisialisasi',
        summary: 'Contoh RPM Pembelajaran Mendalam IPAS Kelas 5 terintegrasi PAK & LKPD dimuat',
        content: reconciled.rpm,
        perangkat: {
          lkpd: reconciled.lkpd,
        },
      },
    ],
    createdAt: now,
    updatedAt: now,
  };
}
