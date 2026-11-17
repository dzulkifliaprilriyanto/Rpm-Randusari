export type NavPageId =
  | 'dashboard'
  | 'buat-rpm'
  | 'ai-interview'
  | 'generator-otomatis'
  | 'pengisian-manual'
  | 'integrasi-pak'
  | 'riwayat-rpm'
  | 'template-saya'
  | 'manajemen-kelas'
  | 'profil-guru'
  | 'pengaturan'
  | 'pusat-bantuan'
  | 'dokumen-rpm';

export type PhaseCode = 'A' | 'B' | 'C';
export type SemesterCode = '1' | '2';
export type RpmStatus = 'draft' | 'final';
export type DeepLearningPrinciple = 'Mindful' | 'Meaningful' | 'Joyful';

export type DimensiProfilLulusanId =
  | 'keimanan'
  | 'kewargaan'
  | 'penalaran_kritis'
  | 'kreativitas'
  | 'kolaborasi'
  | 'kemandirian'
  | 'kesehatan'
  | 'komunikasi';

export interface TeacherProfile {
  namaGuru: string;
  nip: string;
  namaSekolah: string;
  alamatSekolah: string;
  jabatan: string;
  mataPelajaranUtama: string;
  namaKepalaSekolah: string;
  nipKepalaSekolah: string;
  catatanTambahan: string;
  updatedAt: string;
}

export interface SchoolClass {
  id: string;
  className: string;
  grade: number; // 1 - 6
  phase: PhaseCode;
  semester: SemesterCode;
  academicYear: string;
  studentCount: number;
  studentRosterNotes?: string; // non-PII summary or initial list
  createdAt: string;
}

export interface DimensiProfilSelection {
  id: DimensiProfilLulusanId;
  nama: string;
  alasanRelevansi: string;
}

export interface RpmActivityStep {
  id: string;
  namaAktivitas: string;
  tahap: 'Pendahuluan' | 'Memahami' | 'Mengaplikasi' | 'Merefleksi' | 'Penutup';
  prinsip: DeepLearningPrinciple[];
  aktivitasGuru: string;
  aktivitasPesertaDidik: string;
  alokasiWaktuMenit: number;
  metodeStrategi: string;
  tujuanAktivitas: string;
  nilaiPakDikembangkan?: string[];
}

export interface AssessmentBlock {
  tujuan: string;
  teknik: string;
  instrumen: string;
  indikatorPenilaian: string;
  kriteriaKeberhasilan: string;
}

export interface LkpdIdentity {
  namaSekolah: string;
  mataPelajaran: string;
  kelas: string;
  fase: PhaseCode;
  semester: SemesterCode;
  tahunAjaran: string;
  materi: string;
  alokasiWaktu: string;
  namaPesertaDidikLabel: string;
  nomorAbsenLabel: string;
}

export interface LkpdPakIntegrationSummary {
  elemenPak: string[];
  subelemenPak: string[];
  nilaiKarakter: string[];
  perilakuDiharapkan: string[];
  relevanLangsung: boolean;
  catatan?: string;
}

export interface LkpdActivityItem {
  nomor: number;
  jenisAktivitas?: string;
  judul: string;
  instruksi: string;
  langkahSingkat?: string[];
}

export interface LkpdTaskItem {
  nomor: number;
  tingkatKesulitan?: 'Dasar' | 'Menengah' | 'HOTS Ringan';
  pertanyaan: string;
  ruangJawabanHint: string;
  barisRuangJawaban?: number;
}

export interface LkpdPakActivity {
  relevan: boolean;
  judul: string;
  bentuk: string;
  skenarioAtauInstruksi: string;
  pertanyaanPanduan: string[];
}

export interface LkpdAssessmentSection {
  indikatorPenilaian: string[];
  kriteriaKeberhasilan: string;
  rubrikSederhana: {
    aspek: string;
    sangatBaik: string;
    perluBimbingan: string;
  }[];
  catatanGuruLabel: string;
}

export interface LkpdKit {
  id?: string;
  lessonPlanId?: string;
  identitas?: LkpdIdentity;
  judul: string;
  identitasPesertaDidik: string;
  tujuanKegiatan: string;
  tujuanPembelajaran?: string[];
  integrasiPak?: LkpdPakIntegrationSummary;
  petunjukPengerjaan: string[];
  materiPengantar: string;
  aktivitas: LkpdActivityItem[];
  pertanyaan: LkpdTaskItem[];
  aktivitasPenguatanPak?: LkpdPakActivity;
  refleksiSiswa: string[];
  kesimpulan?: {
    prompt: string;
    ruangKesimpulanHint: string;
  };
  penilaian?: LkpdAssessmentSection;
  validationStatus?: CrossDocumentValidationResult;
  createdAt?: string;
  updatedAt?: string;
}

export interface BahanAjarKit {
  judul: string;
  ringkasanKonsep: string;
  uraianMateri: {
    subjudul: string;
    isi: string;
  }[];
  contohKontekstual: string;
  glosarium: { istilah: string; arti: string }[];
  sumberBacaan: string[];
}

export interface MediaPembelajaranKit {
  judul: string;
  jenisMedia: string;
  tujuanPenggunaan: string;
  alatBahan: string[];
  langkahPembuatan: string[];
  panduanPenggunaan: string[];
  alternatifDigital: string;
}

export interface AsesmenDiagnostikDetailKit {
  tujuanPemetaan: string;
  kisiKisi: string[];
  pertanyaanPemantik: { nomor: number; pertanyaan: string; kategori: string }[];
  pemetaanKesiapan: {
    kategori: string;
    ciriSiswa: string;
    tindakLanjut: string;
  }[];
}

export interface SoalEvaluasiKit {
  kisiKisi: { nomor: number; indikator: string; levelKognitif: string; bentuk: string }[];
  soalFormatif: {
    nomor: number;
    pertanyaan: string;
    opsi?: string[];
    kunciJawaban: string;
  }[];
  soalSumatif: {
    nomor: number;
    pertanyaan: string;
    opsi?: string[];
    kunciJawaban: string;
    pedomanPenskoran: string;
  }[];
}

export interface RubrikPenilaianKit {
  judul: string;
  skala: string;
  kriteria: {
    aspek: string;
    sangatBaik: string;
    baik: string;
    cukup: string;
    perluBimbingan: string;
  }[];
}

export interface LembarObservasiKit {
  judul: string;
  fokusObservasi: string;
  indikator: {
    nomor: number;
    aspek: string;
    indikatorPerilaku: string;
  }[];
  catatanAnekdotPanduan: string;
}

export interface RefleksiDetailKit {
  pertanyaanRefleksiGuru: string[];
  pertanyaanRefleksiSiswa: string[];
  rencanaTindakLanjut: string;
}

export interface PerangkatPembelajaran {
  lkpd?: LkpdKit;
  bahanAjar?: BahanAjarKit;
  mediaPembelajaran?: MediaPembelajaranKit;
  asesmenDiagnostikDetail?: AsesmenDiagnostikDetailKit;
  soalEvaluasi?: SoalEvaluasiKit;
  rubrikPenilaian?: RubrikPenilaianKit;
  lembarObservasi?: LembarObservasiKit;
  refleksiDetail?: RefleksiDetailKit;
}

export type QualityPredicate = 'Sangat Baik' | 'Baik' | 'Perlu Revisi';

export interface QualityCriterionResult {
  kode: string;
  aspek: string;
  status: 'Memenuhi' | 'Sebagian' | 'Perlu Perbaikan';
  catatan: string;
}

export interface QualityControlReport {
  predikat: QualityPredicate;
  ringkasan: string;
  aspekEvaluasi: QualityCriterionResult[];
  rekomendasiPerbaikan: string[];
  peringatanVerifikasiCP: string;
  checkedAt: string;
}

export interface CrossDocumentCheckItem {
  kode: string;
  dimensi: 'RPM' | 'PAK' | 'LKPD' | 'KONSISTENSI';
  aspek: string;
  status: 'Memenuhi' | 'Diperbaiki Otomatis' | 'Perlu Perhatian';
  catatan: string;
}

export interface CrossDocumentValidationResult {
  valid: boolean;
  checkedAt: string;
  checks: CrossDocumentCheckItem[];
  autoFixedNotes: string[];
}

export interface WorksheetRecord {
  id: string;
  lessonPlanId: string;
  worksheetContent: LkpdKit;
  pakIntegration?: PakIntegrationRecord;
  validationStatus: CrossDocumentValidationResult;
  createdAt: string;
  updatedAt: string;
}

export interface RpmCoreContent {
  identitas: {
    namaSatuanPendidikan: string;
    namaGuru: string;
    nipGuru: string;
    mataPelajaran: string;
    kelas: string;
    fase: PhaseCode;
    semester: SemesterCode;
    tahunAjaran: string;
    materi: string;
    alokasiWaktu: string;
  };
  identifikasi: {
    karakteristikPesertaDidik: string;
    pengetahuanAwal: string;
    kebutuhanBelajar: string;
    potensiMinat: string;
    konteksLingkunganSekolah: string;
    materiPembelajaran: string;
    dimensiProfilLulusan: DimensiProfilSelection[];
  };
  desain: {
    capaianPembelajaran: string;
    cpPerluVerifikasi: boolean;
    tujuanPembelajaran: string[];
    kriteriaKetercapaian: string[];
    topikPembelajaran: string;
    praktikPedagogis: string;
    modelPembelajaran: string;
    metodePembelajaran: string;
    kemitraanPembelajaran: string;
    lingkunganPembelajaran: string;
    pemanfaatanDigital: string;
    mediaSumberBelajar: string[];
    keterkaitanPedagogis: string;
  };
  pengalamanBelajar: {
    pendahuluan: RpmActivityStep[];
    inti: {
      memahami: RpmActivityStep[];
      mengaplikasi: RpmActivityStep[];
      merefleksi: RpmActivityStep[];
    };
    penutup: RpmActivityStep[];
  };
  asesmen: {
    diagnostik: AssessmentBlock;
    formatif: AssessmentBlock;
    sumatif: AssessmentBlock;
  };
  diferensiasi: {
    konten: string;
    proses: string;
    produk: string;
  };
  refleksi: {
    refleksiGuru: string[];
    refleksiPesertaDidik: string[];
  };
  pengesahan: {
    tempat: string;
    tanggal: string;
    jabatanKepalaSekolah: string;
    namaKepalaSekolah: string;
    nipKepalaSekolah: string;
    namaGuru: string;
    nipGuru: string;
  };
}

export interface RpmVersionSnapshot {
  version: number;
  timestamp: string;
  section: string;
  summary: string;
  content: RpmCoreContent;
  perangkat?: PerangkatPembelajaran;
}

export interface RpmDocument {
  id: string;
  uid: string;
  title: string;
  subject: string;
  grade: string;
  phase: PhaseCode;
  semester: SemesterCode;
  topic: string;
  status: RpmStatus;
  version: number;
  content: RpmCoreContent;
  perangkat: PerangkatPembelajaran;
  pakIntegration?: PakIntegrationRecord;
  qualityReport?: QualityControlReport;
  crossValidation?: CrossDocumentValidationResult;
  revisionHistory: RpmVersionSnapshot[];
  createdAt: string;
  updatedAt: string;
}

export interface RpmTemplate {
  id: string;
  name: string;
  description: string;
  subject: string;
  grade: string;
  phase: PhaseCode;
  content: RpmCoreContent;
  createdAt: string;
  updatedAt: string;
}

export interface BackupMetadata {
  id: string;
  fileName: string;
  rpmCount: number;
  classCount: number;
  templateCount: number;
  createdAt: string;
}

export interface ActivityLogItem {
  id: string;
  type: 'create' | 'update' | 'export' | 'qc' | 'backup' | 'class' | 'profile' | 'pak' | 'lkpd';
  title: string;
  detail: string;
  timestamp: string;
}

export interface ExportConfig {
  orientation: 'portrait' | 'landscape';
  fontSize: 10 | 11 | 12;
  marginMm: 15 | 20 | 25;
  showHeader: boolean;
  showFooter: boolean;
  showPageNumbers: boolean;
  showPengesahan: boolean;
}

export interface AppSettings {
  theme: 'light' | 'dark';
  exportConfig: ExportConfig;
  autoSaveDraft: boolean;
}

export interface InterviewMessage {
  id: string;
  role: 'assistant' | 'user';
  text: string;
  choices?: string[];
  explanation?: string;
  timestamp: string;
}

export interface InterviewSessionState {
  messages: InterviewMessage[];
  collectedInfo: Record<string, string>;
  missingFields: string[];
  readyToGenerate: boolean;
  summaryText: string;
  updatedAt: string;
}

export type RevisionTargetSection =
  | 'all'
  | 'identifikasi'
  | 'tujuan'
  | 'kegiatan'
  | 'asesmen'
  | 'diferensiasi'
  | 'lkpd'
  | 'pak'
  | 'bahasa'
  | 'format';

export interface AutoGeneratorInput {
  namaGuru: string;
  namaSekolah: string;
  kelas: string;
  fase: PhaseCode;
  semester: SemesterCode;
  tahunAjaran: string;
  mataPelajaran: string;
  materi: string;
  alokasiWaktu: string;
  capaianPembelajaran: string;
  tujuanPembelajaran: string;
  karakteristikPesertaDidik: string;
  modelPembelajaran: string;
  metodePembelajaran: string;
  pakIntegration?: PakIntegrationRecord;
}

// --- AI AUTO-DETECT & INTEGRASI PENDIDIKAN ANTIKORUPSI (PAK) ---

export type PakElementId = 'elemen_1' | 'elemen_2' | 'elemen_3' | 'elemen_4' | 'elemen_5';

export type PakSubElementCode =
  | '1.1'
  | '1.2'
  | '2.1'
  | '2.2'
  | '3.1'
  | '3.2'
  | '4.1'
  | '4.2'
  | '5.1'
  | '5.2';

export type PakRelevanceStatus =
  | 'sangat_relevan'
  | 'relevan_penguatan'
  | 'tidak_relevan_langsung';

export type PakAutoDetectUiStatus =
  | 'sedang_menganalisis'
  | 'analisis_selesai'
  | 'rekomendasi_tersedia'
  | 'tidak_ditemukan_keterkaitan_langsung'
  | 'memerlukan_informasi_tambahan';

export interface PakSelectedElement {
  id: PakElementId;
  kode: string;
  nama: string;
  peran: 'utama' | 'pendukung';
}

export interface PakSelectedSubElement {
  code: PakSubElementCode;
  elemenId: PakElementId;
  nama: string;
}

export interface PakMaterialItem {
  namaMateri: string;
  elemen: string;
  subelemen: string;
  nilaiAntikorupsi: string[];
  tujuanPenguatanKarakter: string;
  penjelasanMateri: string;
  contohPenerapan: string[];
  aktivitasPesertaDidik: string;
  pertanyaanPemantik: string[];
  asesmenRingkas: string;
  indikatorKeberhasilan: string[];
  isAiGenerated: boolean;
}

export interface PakActivityItem {
  jenisAktivitas: string;
  judul: string;
  tujuan: string;
  elemenPak: string;
  subelemenPak: string;
  prinsipPembelajaranMendalam: DeepLearningPrinciple[];
  langkahKegiatan: string[];
  peranGuru: string;
  peranPesertaDidik: string;
  alokasiWaktuMenit: number;
  indikatorKeberhasilan: string;
}

export interface PakRubricRow {
  aspek: string;
  sangatBerkembang: string;
  berkembangSesuaiHarapan: string;
  mulaiBerkembang: string;
  memerlukanBimbingan: string;
}

export interface PakAssessmentDesign {
  pengetahuan: {
    fokus: string[];
    bentukInstrumen: string;
    indikator: string[];
  };
  sikapPerilaku: {
    nilaiDiamati: string[];
    teknikObservasi: string;
    indikator: string[];
  };
  praktik: {
    bentukPraktik: string[];
    kriteriaPengamatan: string;
    indikator: string[];
  };
  rubrikPerkembangan: PakRubricRow[];
  catatanPembinaanNonLabeling: string;
}

export interface PakReferenceItem {
  id: string;
  lembaga: 'KPK' | 'Kemendikdasmen';
  judul: string;
  tahun: string;
  url: string;
  statusVerifikasi: 'rujukan_portal_resmi' | 'perlu_verifikasi_portal';
  catatanPenggunaan: string;
}

export interface PakQualityValidationItem {
  nomor: number;
  kriteria: string;
  memenuhi: boolean;
  catatan: string;
}

export interface PakIntegrationRecord {
  id: string;
  lessonPlanId: string;
  elements: PakSelectedElement[];
  subElements: PakSelectedSubElement[];
  nilaiAntikorupsi: string[];
  relevanceStatus: PakRelevanceStatus;
  relevanceLabel: string;
  relevanceReason: string;
  alternatifPenguatan: string;
  learningObjectives: string[];
  materials: PakMaterialItem[];
  activities: PakActivityItem[];
  assessments: PakAssessmentDesign;
  refleksiIntegritas: string[];
  integrasiRpmRingkasan: {
    identifikasiKarakter: string;
    desainKarakter: string;
    pengalamanMemahami: string;
    pengalamanMengaplikasi: string;
    pengalamanMerefleksi: string;
    aktivitasGuruSiswa: string;
    asesmenPengamatan: string;
    refleksiHarian: string;
  };
  references: PakReferenceItem[];
  qualityValidation: PakQualityValidationItem[];
  applied: boolean;
  ignored: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PakAutoDetectInput {
  lessonPlanId?: string;
  mataPelajaran: string;
  kelas: string;
  fase: PhaseCode;
  capaianPembelajaran?: string;
  tujuanPembelajaran?: string;
  materi: string;
  karakteristikPesertaDidik?: string;
  aktivitasPembelajaran?: string;
  modelPembelajaran?: string;
  metodePembelajaran?: string;
  lingkunganPembelajaran?: string;
  regenerationNote?: string;
}
