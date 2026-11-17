import type {
  DeepLearningPrinciple,
  DimensiProfilLulusanId,
  PakActivityItem,
  PakElementId,
  PakIntegrationRecord,
  PakMaterialItem,
  PakQualityValidationItem,
  PakRelevanceStatus,
  PakSelectedElement,
  PakSelectedSubElement,
  PakSubElementCode,
  PhaseCode,
  QualityControlReport,
  QualityPredicate,
  RpmActivityStep,
  RpmCoreContent,
} from '../src/types/rpm';
import {
  formatPakRelevanceLabel,
  PAK_CORE_VALUES,
  PAK_ELEMENTS_FRAMEWORK,
  PAK_OFFICIAL_REFERENCES,
  PAK_VALIDATION_CRITERIA,
} from '../src/utils/pak';

const VALID_DIMENSIONS: Record<DimensiProfilLulusanId, string> = {
  keimanan: 'Keimanan dan Ketakwaan terhadap Tuhan Yang Maha Esa',
  kewargaan: 'Kewargaan',
  penalaran_kritis: 'Penalaran Kritis',
  kreativitas: 'Kreativitas',
  kolaborasi: 'Kolaborasi',
  kemandirian: 'Kemandirian',
  kesehatan: 'Kesehatan',
  komunikasi: 'Komunikasi',
};

export function sanitizeString(val: unknown, maxLen = 4000, fallback = ''): string {
  if (typeof val !== 'string') return fallback;
  const cleaned = val
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
    .trim()
    .slice(0, maxLen);
  return cleaned || fallback;
}

export function sanitizeStringArray(val: unknown, maxItems = 12, maxLen = 600): string[] {
  if (!Array.isArray(val)) return [];
  return val
    .map((item) => sanitizeString(item, maxLen))
    .filter((item) => item.length > 0)
    .slice(0, maxItems);
}

function normalizeSteps(
  rawSteps: unknown,
  defaultTahap: RpmActivityStep['tahap'],
): RpmActivityStep[] {
  if (!Array.isArray(rawSteps) || rawSteps.length === 0) {
    return [
      {
        id: `step-${defaultTahap.toLowerCase()}-${Date.now()}`,
        namaAktivitas: `Aktivitas ${defaultTahap}`,
        tahap: defaultTahap,
        prinsip: ['Meaningful'],
        aktivitasGuru: 'Guru memfasilitasi kegiatan pembelajaran sesuai tahapan.',
        aktivitasPesertaDidik: 'Peserta didik mengikuti aktivitas pembelajaran secara aktif.',
        alokasiWaktuMenit: 15,
        metodeStrategi: 'Pembelajaran aktif terbimbing',
        tujuanAktivitas: `Mencapai tujuan tahap ${defaultTahap}.`,
      },
    ];
  }

  return rawSteps.slice(0, 6).map((item, idx) => {
    const step = (item && typeof item === 'object' ? item : {}) as Record<string, unknown>;
    const rawPrinsip = Array.isArray(step.prinsip) ? step.prinsip : [];
    const prinsip = rawPrinsip.filter((p): p is 'Mindful' | 'Meaningful' | 'Joyful' =>
      p === 'Mindful' || p === 'Meaningful' || p === 'Joyful',
    );
    const menit = Number(step.alokasiWaktuMenit);

    const nilaiPak = sanitizeStringArray(step.nilaiPakDikembangkan, 5, 40);

    return {
      id: sanitizeString(step.id, 64, `step-${defaultTahap.toLowerCase()}-${idx + 1}`),
      namaAktivitas: sanitizeString(step.namaAktivitas, 200, `Aktivitas ${defaultTahap} ${idx + 1}`),
      tahap: defaultTahap,
      prinsip: prinsip.length > 0 ? prinsip : ['Meaningful'],
      aktivitasGuru: sanitizeString(step.aktivitasGuru, 1500, 'Guru memandu aktivitas peserta didik.'),
      aktivitasPesertaDidik: sanitizeString(
        step.aktivitasPesertaDidik,
        1500,
        'Peserta didik terlibat aktif dalam aktivitas.',
      ),
      alokasiWaktuMenit: Number.isFinite(menit) && menit > 0 && menit <= 240 ? Math.round(menit) : 15,
      metodeStrategi: sanitizeString(step.metodeStrategi, 200, 'Diskusi & praktik terbimbing'),
      tujuanAktivitas: sanitizeString(step.tujuanAktivitas, 400, `Mendukung tujuan ${defaultTahap}.`),
      ...(nilaiPak.length > 0 ? { nilaiPakDikembangkan: nilaiPak } : {}),
    };
  });
}

export function validateAndNormalizeRpmCore(
  raw: unknown,
  fallbackBase: RpmCoreContent,
): RpmCoreContent {
  if (!raw || typeof raw !== 'object') {
    throw new Error('Struktur RPM tidak valid: respons bukan objek JSON.');
  }
  const obj = raw as Record<string, unknown>;
  const idRaw = (obj.identitas && typeof obj.identitas === 'object' ? obj.identitas : {}) as Record<string, unknown>;
  const identRaw = (obj.identifikasi && typeof obj.identifikasi === 'object' ? obj.identifikasi : {}) as Record<string, unknown>;
  const desRaw = (obj.desain && typeof obj.desain === 'object' ? obj.desain : {}) as Record<string, unknown>;
  const pengRaw = (obj.pengalamanBelajar && typeof obj.pengalamanBelajar === 'object' ? obj.pengalamanBelajar : {}) as Record<string, unknown>;
  const intiRaw = (pengRaw.inti && typeof pengRaw.inti === 'object' ? pengRaw.inti : {}) as Record<string, unknown>;
  const asesRaw = (obj.asesmen && typeof obj.asesmen === 'object' ? obj.asesmen : {}) as Record<string, unknown>;
  const difRaw = (obj.diferensiasi && typeof obj.diferensiasi === 'object' ? obj.diferensiasi : {}) as Record<string, unknown>;
  const refRaw = (obj.refleksi && typeof obj.refleksi === 'object' ? obj.refleksi : {}) as Record<string, unknown>;

  const faseVal = sanitizeString(idRaw.fase, 2, fallbackBase.identitas.fase);
  const safeFase: PhaseCode = faseVal === 'A' || faseVal === 'B' || faseVal === 'C' ? faseVal : fallbackBase.identitas.fase;
  const semVal = sanitizeString(idRaw.semester, 2, fallbackBase.identitas.semester);
  const safeSemester = semVal === '1' || semVal === '2' ? semVal : fallbackBase.identitas.semester;

  const rawDims = Array.isArray(identRaw.dimensiProfilLulusan) ? identRaw.dimensiProfilLulusan : [];
  const normalizedDims = rawDims
    .map((d) => {
      if (!d || typeof d !== 'object') return null;
      const item = d as Record<string, unknown>;
      const id = sanitizeString(item.id, 40) as DimensiProfilLulusanId;
      if (!VALID_DIMENSIONS[id]) return null;
      return {
        id,
        nama: VALID_DIMENSIONS[id],
        alasanRelevansi: sanitizeString(
          item.alasanRelevansi,
          400,
          `Relevan untuk menguatkan dimensi ${VALID_DIMENSIONS[id]} selama pembelajaran.`,
        ),
      };
    })
    .filter((item): item is NonNullable<typeof item> => item !== null)
    .slice(0, 5);

  const normalizeAssessment = (blockRaw: unknown, fb: RpmCoreContent['asesmen']['diagnostik']) => {
    const b = (blockRaw && typeof blockRaw === 'object' ? blockRaw : {}) as Record<string, unknown>;
    return {
      tujuan: sanitizeString(b.tujuan, 600, fb.tujuan),
      teknik: sanitizeString(b.teknik, 300, fb.teknik),
      instrumen: sanitizeString(b.instrumen, 500, fb.instrumen),
      indikatorPenilaian: sanitizeString(b.indikatorPenilaian, 600, fb.indikatorPenilaian),
      kriteriaKeberhasilan: sanitizeString(b.kriteriaKeberhasilan, 600, fb.kriteriaKeberhasilan),
    };
  };

  const tps = sanitizeStringArray(desRaw.tujuanPembelajaran, 8, 500);
  const kktps = sanitizeStringArray(desRaw.kriteriaKetercapaian, 10, 400);
  const medias = sanitizeStringArray(desRaw.mediaSumberBelajar, 10, 300);
  const refGuru = sanitizeStringArray(refRaw.refleksiGuru, 8, 400);
  const refSiswa = sanitizeStringArray(refRaw.refleksiPesertaDidik, 8, 400);

  return {
    identitas: {
      namaSatuanPendidikan: sanitizeString(idRaw.namaSatuanPendidikan, 150, fallbackBase.identitas.namaSatuanPendidikan),
      namaGuru: sanitizeString(idRaw.namaGuru, 150, fallbackBase.identitas.namaGuru),
      nipGuru: fallbackBase.identitas.nipGuru,
      mataPelajaran: sanitizeString(idRaw.mataPelajaran, 150, fallbackBase.identitas.mataPelajaran),
      kelas: sanitizeString(idRaw.kelas, 50, fallbackBase.identitas.kelas),
      fase: safeFase,
      semester: safeSemester,
      tahunAjaran: sanitizeString(idRaw.tahunAjaran, 30, fallbackBase.identitas.tahunAjaran),
      materi: sanitizeString(idRaw.materi, 300, fallbackBase.identitas.materi),
      alokasiWaktu: sanitizeString(idRaw.alokasiWaktu, 80, fallbackBase.identitas.alokasiWaktu),
    },
    identifikasi: {
      karakteristikPesertaDidik: sanitizeString(identRaw.karakteristikPesertaDidik, 1200, fallbackBase.identifikasi.karakteristikPesertaDidik),
      pengetahuanAwal: sanitizeString(identRaw.pengetahuanAwal, 1000, 'Peserta didik memiliki pengalaman awal dari kehidupan sehari-hari terkait topik.'),
      kebutuhanBelajar: sanitizeString(identRaw.kebutuhanBelajar, 1000, 'Memerlukan bimbingan bertahap dan contoh konkret sesuai tahap perkembangan anak SD.'),
      potensiMinat: sanitizeString(identRaw.potensiMinat, 1000, 'Antusias terhadap kegiatan praktik, diskusi kelompok, dan media visual.'),
      konteksLingkunganSekolah: sanitizeString(identRaw.konteksLingkunganSekolah, 1000, fallbackBase.identifikasi.konteksLingkunganSekolah),
      materiPembelajaran: sanitizeString(identRaw.materiPembelajaran, 1200, fallbackBase.identitas.materi),
      dimensiProfilLulusan:
        normalizedDims.length > 0 ? normalizedDims : fallbackBase.identifikasi.dimensiProfilLulusan,
    },
    desain: {
      capaianPembelajaran: sanitizeString(desRaw.capaianPembelajaran, 2000, fallbackBase.desain.capaianPembelajaran),
      cpPerluVerifikasi: typeof desRaw.cpPerluVerifikasi === 'boolean' ? desRaw.cpPerluVerifikasi : true,
      tujuanPembelajaran: tps.length > 0 ? tps : fallbackBase.desain.tujuanPembelajaran,
      kriteriaKetercapaian: kktps.length > 0 ? kktps : ['Peserta didik mampu menunjukkan pemahaman konsep inti dan menerapkannya pada tugas kontekstual.'],
      topikPembelajaran: sanitizeString(desRaw.topikPembelajaran, 300, fallbackBase.identitas.materi),
      praktikPedagogis: sanitizeString(desRaw.praktikPedagogis, 1000, fallbackBase.desain.praktikPedagogis),
      modelPembelajaran: sanitizeString(desRaw.modelPembelajaran, 150, fallbackBase.desain.modelPembelajaran),
      metodePembelajaran: sanitizeString(desRaw.metodePembelajaran, 300, fallbackBase.desain.metodePembelajaran),
      kemitraanPembelajaran: sanitizeString(desRaw.kemitraanPembelajaran, 800, fallbackBase.desain.kemitraanPembelajaran),
      lingkunganPembelajaran: sanitizeString(desRaw.lingkunganPembelajaran, 800, fallbackBase.desain.lingkunganPembelajaran),
      pemanfaatanDigital: sanitizeString(desRaw.pemanfaatanDigital, 800, fallbackBase.desain.pemanfaatanDigital),
      mediaSumberBelajar: medias.length > 0 ? medias : fallbackBase.desain.mediaSumberBelajar,
      keterkaitanPedagogis: sanitizeString(
        desRaw.keterkaitanPedagogis,
        2000,
        'Tujuan pembelajaran dirumuskan selaras dengan Capaian Pembelajaran dan menguatkan Dimensi Profil Lulusan melalui pengalaman Memahami, Mengaplikasi, dan Merefleksi.',
      ),
    },
    pengalamanBelajar: {
      pendahuluan: normalizeSteps(pengRaw.pendahuluan, 'Pendahuluan'),
      inti: {
        memahami: normalizeSteps(intiRaw.memahami, 'Memahami'),
        mengaplikasi: normalizeSteps(intiRaw.mengaplikasi, 'Mengaplikasi'),
        merefleksi: normalizeSteps(intiRaw.merefleksi, 'Merefleksi'),
      },
      penutup: normalizeSteps(pengRaw.penutup, 'Penutup'),
    },
    asesmen: {
      diagnostik: normalizeAssessment(asesRaw.diagnostik, fallbackBase.asesmen.diagnostik),
      formatif: normalizeAssessment(asesRaw.formatif, fallbackBase.asesmen.formatif),
      sumatif: normalizeAssessment(asesRaw.sumatif, fallbackBase.asesmen.sumatif),
    },
    diferensiasi: {
      konten: sanitizeString(difRaw.konten, 1000, fallbackBase.diferensiasi.konten),
      proses: sanitizeString(difRaw.proses, 1000, fallbackBase.diferensiasi.proses),
      produk: sanitizeString(difRaw.produk, 1000, fallbackBase.diferensiasi.produk),
    },
    refleksi: {
      refleksiGuru: refGuru.length > 0 ? refGuru : fallbackBase.refleksi.refleksiGuru,
      refleksiPesertaDidik: refSiswa.length > 0 ? refSiswa : fallbackBase.refleksi.refleksiPesertaDidik,
    },
    pengesahan: fallbackBase.pengesahan,
  };
}

export function validateQualityReport(raw: unknown): QualityControlReport {
  if (!raw || typeof raw !== 'object') {
    throw new Error('Hasil Quality Control tidak valid.');
  }
  const obj = raw as Record<string, unknown>;
  const rawPredikat = sanitizeString(obj.predikat, 30, 'Baik');
  const predikat: QualityPredicate =
    rawPredikat === 'Sangat Baik' || rawPredikat === 'Baik' || rawPredikat === 'Perlu Revisi'
      ? rawPredikat
      : 'Baik';

  const rawAspek = Array.isArray(obj.aspekEvaluasi) ? obj.aspekEvaluasi : [];
  const aspekEvaluasi = rawAspek.slice(0, 12).map((item, idx) => {
    const a = (item && typeof item === 'object' ? item : {}) as Record<string, unknown>;
    const rawStatus = sanitizeString(a.status, 30, 'Memenuhi');
    const status: 'Memenuhi' | 'Sebagian' | 'Perlu Perbaikan' =
      rawStatus === 'Memenuhi' || rawStatus === 'Sebagian' || rawStatus === 'Perlu Perbaikan'
        ? rawStatus
        : 'Memenuhi';
    return {
      kode: sanitizeString(a.kode, 16, `QC-${idx + 1}`),
      aspek: sanitizeString(a.aspek, 150, `Aspek ${idx + 1}`),
      status,
      catatan: sanitizeString(a.catatan, 500, '-'),
    };
  });

  return {
    predikat,
    ringkasan: sanitizeString(obj.ringkasan, 1200, 'Evaluasi pedagogis telah diselesaikan.'),
    aspekEvaluasi,
    rekomendasiPerbaikan: sanitizeStringArray(obj.rekomendasiPerbaikan, 10, 400),
    peringatanVerifikasiCP: sanitizeString(
      obj.peringatanVerifikasiCP,
      600,
      'Pastikan redaksi Capaian Pembelajaran (CP) diverifikasi ulang dengan dokumen resmi Kurikulum Merdeka satuan pendidikan.',
    ),
    checkedAt: new Date().toISOString(),
  };
}

function matchCanonicalElement(rawVal: string): (typeof PAK_ELEMENTS_FRAMEWORK)[number] | null {
  const low = rawVal.toLowerCase();
  for (const el of PAK_ELEMENTS_FRAMEWORK) {
    if (
      low === el.id ||
      low.includes(el.nama.toLowerCase()) ||
      low.includes(el.kode.toLowerCase())
    ) {
      return el;
    }
  }
  return null;
}

function matchCanonicalSubElement(rawCode: string, rawName: string) {
  const cleanCode = rawCode.trim();
  const lowName = rawName.toLowerCase();
  for (const el of PAK_ELEMENTS_FRAMEWORK) {
    for (const sub of el.subElements) {
      if (cleanCode.startsWith(sub.code) || lowName.includes(sub.nama.toLowerCase())) {
        return sub;
      }
    }
  }
  return null;
}

export function validateAndNormalizePakIntegration(
  raw: unknown,
  lessonPlanId = '',
  existingId?: string,
): PakIntegrationRecord {
  if (!raw || typeof raw !== 'object') {
    throw new Error('Hasil AI Auto-Detect PAK tidak valid.');
  }
  const obj = raw as Record<string, unknown>;
  const now = new Date().toISOString();

  const rawRel = sanitizeString(obj.relevanceStatus, 40, 'relevan_penguatan').toLowerCase();
  let relevanceStatus: PakRelevanceStatus = 'relevan_penguatan';
  if (rawRel.includes('sangat')) relevanceStatus = 'sangat_relevan';
  else if (rawRel.includes('tidak')) relevanceStatus = 'tidak_relevan_langsung';

  // Enforce canonical 5 elements & max 3 elements (never force all 5)
  const rawElements = Array.isArray(obj.elements) ? obj.elements : [];
  const elementMap = new Map<PakElementId, PakSelectedElement>();
  for (const item of rawElements) {
    const rec = (item && typeof item === 'object' ? item : {}) as Record<string, unknown>;
    const keyStr = `${sanitizeString(rec.id, 40)} ${sanitizeString(rec.kode, 30)} ${sanitizeString(rec.nama, 120)}`;
    const matched = matchCanonicalElement(keyStr);
    if (matched && !elementMap.has(matched.id)) {
      const peran: 'utama' | 'pendukung' =
        elementMap.size === 0 && sanitizeString(rec.peran, 20) !== 'pendukung'
          ? 'utama'
          : sanitizeString(rec.peran, 20) === 'utama' && elementMap.size === 0
            ? 'utama'
            : 'pendukung';
      elementMap.set(matched.id, {
        id: matched.id,
        kode: matched.kode,
        nama: matched.nama,
        peran,
      });
    }
    if (elementMap.size >= 3) break;
  }

  // Enforce canonical 10 sub-elements
  const rawSubs = Array.isArray(obj.subElements) ? obj.subElements : [];
  const subMap = new Map<PakSubElementCode, PakSelectedSubElement>();
  for (const item of rawSubs) {
    const rec = (item && typeof item === 'object' ? item : {}) as Record<string, unknown>;
    const matched = matchCanonicalSubElement(
      sanitizeString(rec.code, 20),
      sanitizeString(rec.nama, 200),
    );
    if (matched && !subMap.has(matched.code)) {
      subMap.set(matched.code, {
        code: matched.code,
        elemenId: matched.elemenId,
        nama: matched.nama,
      });
      if (!elementMap.has(matched.elemenId) && elementMap.size < 3) {
        const parent = PAK_ELEMENTS_FRAMEWORK.find((e) => e.id === matched.elemenId);
        if (parent) {
          elementMap.set(parent.id, {
            id: parent.id,
            kode: parent.kode,
            nama: parent.nama,
            peran: elementMap.size === 0 ? 'utama' : 'pendukung',
          });
        }
      }
    }
    if (subMap.size >= 4) break;
  }

  if (relevanceStatus !== 'tidak_relevan_langsung' && elementMap.size === 0) {
    const fallbackEl = PAK_ELEMENTS_FRAMEWORK[0];
    elementMap.set(fallbackEl.id, {
      id: fallbackEl.id,
      kode: fallbackEl.kode,
      nama: fallbackEl.nama,
      peran: 'utama',
    });
    if (subMap.size === 0) {
      subMap.set(fallbackEl.subElements[0].code, { ...fallbackEl.subElements[0] });
    }
  }

  const elements = Array.from(elementMap.values());
  const subElements = Array.from(subMap.values());

  const rawValues = sanitizeStringArray(obj.nilaiAntikorupsi, 6, 60);
  const validValues = rawValues.filter((v) =>
    PAK_CORE_VALUES.some((c) => c.toLowerCase() === v.toLowerCase()),
  );
  const nilaiAntikorupsi =
    validValues.length > 0
      ? validValues
      : relevanceStatus === 'tidak_relevan_langsung'
        ? []
        : ['Jujur', 'Tanggung Jawab', 'Disiplin'];

  const rawMaterials = Array.isArray(obj.materials) ? obj.materials : [];
  const materials: PakMaterialItem[] = rawMaterials.slice(0, 3).map((m, idx) => {
    const rec = (m && typeof m === 'object' ? m : {}) as Record<string, unknown>;
    return {
      namaMateri: sanitizeString(rec.namaMateri, 200, `Materi Integritas SD ${idx + 1}`),
      elemen: sanitizeString(rec.elemen, 120, elements[0]?.nama || 'Ketaatan pada Aturan'),
      subelemen: sanitizeString(rec.subelemen, 200, subElements[0]?.nama || 'Kesadaran pentingnya taat aturan'),
      nilaiAntikorupsi: sanitizeStringArray(rec.nilaiAntikorupsi, 5, 60).length
        ? sanitizeStringArray(rec.nilaiAntikorupsi, 5, 60)
        : nilaiAntikorupsi,
      tujuanPenguatanKarakter: sanitizeString(
        rec.tujuanPenguatanKarakter,
        400,
        'Membiasakan sikap jujur, disiplin, dan bertanggung jawab dalam keseharian di kelas.',
      ),
      penjelasanMateri: sanitizeString(
        rec.penjelasanMateri,
        1400,
        'Penjelasan materi kontekstual yang disusun AI sesuai perkembangan peserta didik Sekolah Dasar.',
      ),
      contohPenerapan: sanitizeStringArray(rec.contohPenerapan, 6, 300),
      aktivitasPesertaDidik: sanitizeString(
        rec.aktivitasPesertaDidik,
        600,
        'Siswa berdiskusi dan mempraktikkan sikap positif sesuai kesepakatan kelas.',
      ),
      pertanyaanPemantik: sanitizeStringArray(rec.pertanyaanPemantik, 5, 300),
      asesmenRingkas: sanitizeString(
        rec.asesmenRingkas,
        400,
        'Pengamatan sikap dan refleksi lisan/tertulis siswa.',
      ),
      indikatorKeberhasilan: sanitizeStringArray(rec.indikatorKeberhasilan, 6, 300),
      isAiGenerated: true,
    };
  });

  const rawActivities = Array.isArray(obj.activities) ? obj.activities : [];
  const activities: PakActivityItem[] = rawActivities.slice(0, 4).map((a, idx) => {
    const rec = (a && typeof a === 'object' ? a : {}) as Record<string, unknown>;
    const rawPrinsip = Array.isArray(rec.prinsipPembelajaranMendalam)
      ? rec.prinsipPembelajaranMendalam
      : [];
    const prinsip = rawPrinsip.filter(
      (p): p is DeepLearningPrinciple =>
        p === 'Mindful' || p === 'Meaningful' || p === 'Joyful',
    );
    const menit = Number(rec.alokasiWaktuMenit);
    return {
      jenisAktivitas: sanitizeString(rec.jenisAktivitas, 100, 'Diskusi kelompok'),
      judul: sanitizeString(rec.judul, 200, `Aktivitas Penguatan Karakter ${idx + 1}`),
      tujuan: sanitizeString(rec.tujuan, 400, 'Melatih penerapan nilai integritas secara nyata.'),
      elemenPak: sanitizeString(rec.elemenPak, 120, elements[0]?.nama || 'Ketaatan pada Aturan'),
      subelemenPak: sanitizeString(rec.subelemenPak, 200, subElements[0]?.nama || ''),
      prinsipPembelajaranMendalam: prinsip.length ? prinsip : ['Meaningful', 'Joyful'],
      langkahKegiatan: sanitizeStringArray(rec.langkahKegiatan, 8, 350),
      peranGuru: sanitizeString(rec.peranGuru, 500, 'Membimbing diskusi dan memberi umpan balik apresiatif.'),
      peranPesertaDidik: sanitizeString(rec.peranPesertaDidik, 500, 'Berpartisipasi aktif, jujur, dan bekerja sama.'),
      alokasiWaktuMenit: Number.isFinite(menit) && menit > 0 && menit <= 120 ? Math.round(menit) : 15,
      indikatorKeberhasilan: sanitizeString(
        rec.indikatorKeberhasilan,
        400,
        'Peserta didik menunjukkan perilaku sesuai nilai yang disepakati.',
      ),
    };
  });

  const rawAses = (obj.assessments && typeof obj.assessments === 'object' ? obj.assessments : {}) as Record<string, unknown>;
  const rawPengetahuan = (rawAses.pengetahuan && typeof rawAses.pengetahuan === 'object' ? rawAses.pengetahuan : {}) as Record<string, unknown>;
  const rawSikap = (rawAses.sikapPerilaku && typeof rawAses.sikapPerilaku === 'object' ? rawAses.sikapPerilaku : {}) as Record<string, unknown>;
  const rawPraktik = (rawAses.praktik && typeof rawAses.praktik === 'object' ? rawAses.praktik : {}) as Record<string, unknown>;
  const rawRubrik = Array.isArray(rawAses.rubrikPerkembangan) ? rawAses.rubrikPerkembangan : [];

  const rubrikPerkembangan = rawRubrik.slice(0, 6).map((r, idx) => {
    const row = (r && typeof r === 'object' ? r : {}) as Record<string, unknown>;
    return {
      aspek: sanitizeString(row.aspek, 150, `Aspek Karakter ${idx + 1}`),
      sangatBerkembang: sanitizeString(row.sangatBerkembang, 300, 'Konsisten menunjukkan perilaku berintegritas dan menjadi teladan bagi teman.'),
      berkembangSesuaiHarapan: sanitizeString(row.berkembangSesuaiHarapan, 300, 'Menunjukkan perilaku sesuai kesepakatan dengan kesadaran sendiri.'),
      mulaiBerkembang: sanitizeString(row.mulaiBerkembang, 300, 'Mulai menunjukkan perilaku positif dengan sesekali pengingat dari guru.'),
      memerlukanBimbingan: sanitizeString(row.memerlukanBimbingan, 300, 'Memerlukan pendampingan khusus dan pembiasaan bertahap secara positif.'),
    };
  });

  const rawRingkasan = (obj.integrasiRpmRingkasan && typeof obj.integrasiRpmRingkasan === 'object'
    ? obj.integrasiRpmRingkasan
    : {}) as Record<string, unknown>;

  const rawQc = Array.isArray(obj.qualityValidation) ? obj.qualityValidation : [];
  const qualityValidation: PakQualityValidationItem[] = PAK_VALIDATION_CRITERIA.map((kriteria, idx) => {
    const found = (rawQc[idx] && typeof rawQc[idx] === 'object' ? rawQc[idx] : {}) as Record<string, unknown>;
    return {
      nomor: idx + 1,
      kriteria,
      memenuhi: typeof found.memenuhi === 'boolean' ? found.memenuhi : true,
      catatan: sanitizeString(found.catatan, 300, 'Sesuai dengan konteks kelas SD dan tidak mengganggu TP utama.'),
    };
  });

  return {
    id: existingId || `pak-${Date.now()}`,
    lessonPlanId: sanitizeString(lessonPlanId, 100, ''),
    elements,
    subElements,
    nilaiAntikorupsi,
    relevanceStatus,
    relevanceLabel: formatPakRelevanceLabel(relevanceStatus),
    relevanceReason: sanitizeString(
      obj.relevanceReason,
      1000,
      'Analisis AI Auto-Detect PAK berdasarkan kesesuaian materi, capaian pembelajaran, dan konteks keseharian peserta didik SD.',
    ),
    alternatifPenguatan: sanitizeString(
      obj.alternatifPenguatan,
      800,
      'Dapat diterapkan pembiasaan jujur, tertib, dan tanggung jawab terhadap tugas kelas secara ringan tanpa mengubah materi utama.',
    ),
    learningObjectives: sanitizeStringArray(obj.learningObjectives, 6, 400),
    materials,
    activities,
    assessments: {
      pengetahuan: {
        fokus: sanitizeStringArray(rawPengetahuan.fokus, 6, 200),
        bentukInstrumen: sanitizeString(rawPengetahuan.bentukInstrumen, 250, 'Tanya jawab pemahaman kontekstual'),
        indikator: sanitizeStringArray(rawPengetahuan.indikator, 6, 300),
      },
      sikapPerilaku: {
        nilaiDiamati: sanitizeStringArray(rawSikap.nilaiDiamati, 7, 60),
        teknikObservasi: sanitizeString(rawSikap.teknikObservasi, 250, 'Observasi perilaku selama pembelajaran berlangsung'),
        indikator: sanitizeStringArray(rawSikap.indikator, 6, 300),
      },
      praktik: {
        bentukPraktik: sanitizeStringArray(rawPraktik.bentukPraktik, 6, 250),
        kriteriaPengamatan: sanitizeString(rawPraktik.kriteriaPengamatan, 300, 'Kepatuhan kesepakatan kelompok dan tanggung jawab alat belajar'),
        indikator: sanitizeStringArray(rawPraktik.indikator, 6, 300),
      },
      rubrikPerkembangan: rubrikPerkembangan.length
        ? rubrikPerkembangan
        : [
            {
              aspek: 'Penerapan Nilai Integritas di Kelas',
              sangatBerkembang: 'Konsisten bersikap jujur, disiplin, dan mengingatkan teman dengan santun.',
              berkembangSesuaiHarapan: 'Menunjukkan sikap jujur dan bertanggung jawab atas tugas sendiri secara mandiri.',
              mulaiBerkembang: 'Menunjukkan sikap jujur dan tertib ketika diingatkan dalam kegiatan kelas.',
              memerlukanBimbingan: 'Memerlukan pendampingan langkah demi langkah dalam membiasakan sikap tertib dan jujur.',
            },
          ],
      catatanPembinaanNonLabeling: sanitizeString(
        rawAses.catatanPembinaanNonLabeling,
        500,
        'Penilaian bersifat formatif dan pembinaan perkembangan karakter positif. Hindari memberikan label moral permanen kepada peserta didik.',
      ),
    },
    refleksiIntegritas: sanitizeStringArray(obj.refleksiIntegritas, 6, 300),
    integrasiRpmRingkasan: {
      identifikasiKarakter: sanitizeString(rawRingkasan.identifikasiKarakter, 600, ''),
      desainKarakter: sanitizeString(rawRingkasan.desainKarakter, 600, ''),
      pengalamanMemahami: sanitizeString(rawRingkasan.pengalamanMemahami, 600, ''),
      pengalamanMengaplikasi: sanitizeString(rawRingkasan.pengalamanMengaplikasi, 600, ''),
      pengalamanMerefleksi: sanitizeString(rawRingkasan.pengalamanMerefleksi, 600, ''),
      aktivitasGuruSiswa: sanitizeString(rawRingkasan.aktivitasGuruSiswa, 600, ''),
      asesmenPengamatan: sanitizeString(rawRingkasan.asesmenPengamatan, 600, ''),
      refleksiHarian: sanitizeString(rawRingkasan.refleksiHarian, 600, ''),
    },
    references: PAK_OFFICIAL_REFERENCES,
    qualityValidation,
    applied: false,
    ignored: false,
    createdAt: now,
    updatedAt: now,
  };
}

// Simple sliding-window in-memory rate limiter for backend API routes
export class SlidingWindowRateLimiter {
  private readonly hits = new Map<string, number[]>();
  private readonly maxRequests: number;
  private readonly windowMs: number;

  constructor(maxRequests = 30, windowMs = 60_000) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
  }

  public check(key: string, now = Date.now()): { allowed: boolean; remaining: number } {
    const cutoff = now - this.windowMs;
    const recent = (this.hits.get(key) || []).filter((t) => t > cutoff);
    if (recent.length >= this.maxRequests) {
      this.hits.set(key, recent);
      return { allowed: false, remaining: 0 };
    }
    recent.push(now);
    this.hits.set(key, recent);
    return { allowed: true, remaining: this.maxRequests - recent.length };
  }
}
