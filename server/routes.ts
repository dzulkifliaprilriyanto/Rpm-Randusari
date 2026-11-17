import { Router, type Request, type Response } from 'express';
import {
  GeminiServiceError,
  generateStructuredJson,
  resolveGeminiModel,
  testGeminiConnection,
  ThinkingLevel,
  Type,
} from './geminiClient';
import {
  createGoogleAuthUrl,
  isServerGoogleOAuthConfigured,
  resolveAppBaseUrl,
} from './googleAuth';
import {
  SYSTEM_PROMPT_AI_INTERVIEW,
  SYSTEM_PROMPT_FIELD_ADVISOR,
  SYSTEM_PROMPT_KIT_GENERATOR,
  SYSTEM_PROMPT_PAK_AUTODETECT,
  SYSTEM_PROMPT_QUALITY_CONTROL,
  SYSTEM_PROMPT_REVISION_ENGINE,
  SYSTEM_PROMPT_RPM_GENERATOR,
} from './prompts';
import {
  sanitizeString,
  SlidingWindowRateLimiter,
  validateAndNormalizePakIntegration,
  validateAndNormalizeRpmCore,
  validateQualityReport,
} from './validation';
import { createDefaultProfile, createDefaultRpmCore } from '../src/utils/pedagogy';
import {
  applyPakIntegrationToRpmCore,
  PAK_ELEMENTS_FRAMEWORK,
  PAK_VALIDATION_CRITERIA,
} from '../src/utils/pak';
import {
  buildLkpdPakSummaryFromRecord,
  getGradeBandGuidance,
  normalizeLkpdKit,
  validateAndReconcileCrossDocument,
} from '../src/utils/lkpd';
import type {
  AutoGeneratorInput,
  CrossDocumentValidationResult,
  LkpdKit,
  PakAutoDetectInput,
  PakIntegrationRecord,
  RpmCoreContent,
} from '../src/types/rpm';

const limiter = new SlidingWindowRateLimiter(40, 60_000);

function getClientKey(req: Request): string {
  const fwd = req.headers['x-forwarded-for'];
  const ip = typeof fwd === 'string' ? fwd.split(',')[0].trim() : req.ip || 'local';
  const uidHeader = req.headers['x-session-uid'];
  const uid = typeof uidHeader === 'string' ? uidHeader.slice(0, 64) : 'anon';
  return `${ip}:${uid}`;
}

function handleRouteError(res: Response, err: unknown) {
  if (err instanceof GeminiServiceError) {
    return res.status(err.statusCode).json({ error: err.message, code: err.code });
  }
  console.error('[API Error]', err instanceof Error ? err.message : err);
  return res.status(500).json({
    error: 'Terjadi kendala saat memproses permintaan. Silakan coba beberapa saat lagi.',
    code: 'INTERNAL_ERROR',
  });
}

const activityStepSchema = {
  type: Type.OBJECT,
  properties: {
    id: { type: Type.STRING },
    namaAktivitas: { type: Type.STRING },
    tahap: { type: Type.STRING },
    prinsip: { type: Type.ARRAY, items: { type: Type.STRING } },
    aktivitasGuru: { type: Type.STRING },
    aktivitasPesertaDidik: { type: Type.STRING },
    alokasiWaktuMenit: { type: Type.INTEGER },
    metodeStrategi: { type: Type.STRING },
    tujuanAktivitas: { type: Type.STRING },
    nilaiPakDikembangkan: { type: Type.ARRAY, items: { type: Type.STRING } },
  },
  required: [
    'namaAktivitas',
    'prinsip',
    'aktivitasGuru',
    'aktivitasPesertaDidik',
    'alokasiWaktuMenit',
    'metodeStrategi',
    'tujuanAktivitas',
  ],
};

const assessmentBlockSchema = {
  type: Type.OBJECT,
  properties: {
    tujuan: { type: Type.STRING },
    teknik: { type: Type.STRING },
    instrumen: { type: Type.STRING },
    indikatorPenilaian: { type: Type.STRING },
    kriteriaKeberhasilan: { type: Type.STRING },
  },
  required: ['tujuan', 'teknik', 'instrumen', 'indikatorPenilaian', 'kriteriaKeberhasilan'],
};

const rpmCoreResponseSchema = {
  type: Type.OBJECT,
  properties: {
    identitas: {
      type: Type.OBJECT,
      properties: {
        namaSatuanPendidikan: { type: Type.STRING },
        namaGuru: { type: Type.STRING },
        mataPelajaran: { type: Type.STRING },
        kelas: { type: Type.STRING },
        fase: { type: Type.STRING },
        semester: { type: Type.STRING },
        tahunAjaran: { type: Type.STRING },
        materi: { type: Type.STRING },
        alokasiWaktu: { type: Type.STRING },
      },
      required: ['namaSatuanPendidikan', 'mataPelajaran', 'kelas', 'fase', 'materi', 'alokasiWaktu'],
    },
    identifikasi: {
      type: Type.OBJECT,
      properties: {
        karakteristikPesertaDidik: { type: Type.STRING },
        pengetahuanAwal: { type: Type.STRING },
        kebutuhanBelajar: { type: Type.STRING },
        potensiMinat: { type: Type.STRING },
        konteksLingkunganSekolah: { type: Type.STRING },
        materiPembelajaran: { type: Type.STRING },
        dimensiProfilLulusan: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING },
              nama: { type: Type.STRING },
              alasanRelevansi: { type: Type.STRING },
            },
            required: ['id', 'alasanRelevansi'],
          },
        },
      },
      required: [
        'karakteristikPesertaDidik',
        'pengetahuanAwal',
        'kebutuhanBelajar',
        'potensiMinat',
        'konteksLingkunganSekolah',
        'materiPembelajaran',
        'dimensiProfilLulusan',
      ],
    },
    desain: {
      type: Type.OBJECT,
      properties: {
        capaianPembelajaran: { type: Type.STRING },
        cpPerluVerifikasi: { type: Type.BOOLEAN },
        tujuanPembelajaran: { type: Type.ARRAY, items: { type: Type.STRING } },
        kriteriaKetercapaian: { type: Type.ARRAY, items: { type: Type.STRING } },
        topikPembelajaran: { type: Type.STRING },
        praktikPedagogis: { type: Type.STRING },
        modelPembelajaran: { type: Type.STRING },
        metodePembelajaran: { type: Type.STRING },
        kemitraanPembelajaran: { type: Type.STRING },
        lingkunganPembelajaran: { type: Type.STRING },
        pemanfaatanDigital: { type: Type.STRING },
        mediaSumberBelajar: { type: Type.ARRAY, items: { type: Type.STRING } },
        keterkaitanPedagogis: { type: Type.STRING },
      },
      required: [
        'capaianPembelajaran',
        'cpPerluVerifikasi',
        'tujuanPembelajaran',
        'kriteriaKetercapaian',
        'topikPembelajaran',
        'praktikPedagogis',
        'modelPembelajaran',
        'metodePembelajaran',
        'kemitraanPembelajaran',
        'lingkunganPembelajaran',
        'pemanfaatanDigital',
        'mediaSumberBelajar',
        'keterkaitanPedagogis',
      ],
    },
    pengalamanBelajar: {
      type: Type.OBJECT,
      properties: {
        pendahuluan: { type: Type.ARRAY, items: activityStepSchema },
        inti: {
          type: Type.OBJECT,
          properties: {
            memahami: { type: Type.ARRAY, items: activityStepSchema },
            mengaplikasi: { type: Type.ARRAY, items: activityStepSchema },
            merefleksi: { type: Type.ARRAY, items: activityStepSchema },
          },
          required: ['memahami', 'mengaplikasi', 'merefleksi'],
        },
        penutup: { type: Type.ARRAY, items: activityStepSchema },
      },
      required: ['pendahuluan', 'inti', 'penutup'],
    },
    asesmen: {
      type: Type.OBJECT,
      properties: {
        diagnostik: assessmentBlockSchema,
        formatif: assessmentBlockSchema,
        sumatif: assessmentBlockSchema,
      },
      required: ['diagnostik', 'formatif', 'sumatif'],
    },
    diferensiasi: {
      type: Type.OBJECT,
      properties: {
        konten: { type: Type.STRING },
        proses: { type: Type.STRING },
        produk: { type: Type.STRING },
      },
      required: ['konten', 'proses', 'produk'],
    },
    refleksi: {
      type: Type.OBJECT,
      properties: {
        refleksiGuru: { type: Type.ARRAY, items: { type: Type.STRING } },
        refleksiPesertaDidik: { type: Type.ARRAY, items: { type: Type.STRING } },
      },
      required: ['refleksiGuru', 'refleksiPesertaDidik'],
    },
  },
  required: [
    'identitas',
    'identifikasi',
    'desain',
    'pengalamanBelajar',
    'asesmen',
    'diferensiasi',
    'refleksi',
  ],
};

const lkpdResponseSchema = {
  type: Type.OBJECT,
  properties: {
    judul: { type: Type.STRING },
    identitasPesertaDidik: { type: Type.STRING },
    tujuanKegiatan: { type: Type.STRING },
    petunjukPengerjaan: { type: Type.ARRAY, items: { type: Type.STRING } },
    materiPengantar: { type: Type.STRING },
    aktivitas: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          nomor: { type: Type.INTEGER },
          jenisAktivitas: { type: Type.STRING },
          judul: { type: Type.STRING },
          instruksi: { type: Type.STRING },
          langkahSingkat: { type: Type.ARRAY, items: { type: Type.STRING } },
        },
        required: ['nomor', 'jenisAktivitas', 'judul', 'instruksi', 'langkahSingkat'],
      },
    },
    pertanyaan: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          nomor: { type: Type.INTEGER },
          tingkatKesulitan: { type: Type.STRING },
          pertanyaan: { type: Type.STRING },
          ruangJawabanHint: { type: Type.STRING },
          barisRuangJawaban: { type: Type.INTEGER },
        },
        required: ['nomor', 'tingkatKesulitan', 'pertanyaan', 'ruangJawabanHint', 'barisRuangJawaban'],
      },
    },
    aktivitasPenguatanPak: {
      type: Type.OBJECT,
      properties: {
        relevan: { type: Type.BOOLEAN },
        judul: { type: Type.STRING },
        bentuk: { type: Type.STRING },
        skenarioAtauInstruksi: { type: Type.STRING },
        pertanyaanPanduan: { type: Type.ARRAY, items: { type: Type.STRING } },
      },
      required: ['relevan', 'judul', 'bentuk', 'skenarioAtauInstruksi', 'pertanyaanPanduan'],
    },
    refleksiSiswa: { type: Type.ARRAY, items: { type: Type.STRING } },
    kesimpulan: {
      type: Type.OBJECT,
      properties: {
        prompt: { type: Type.STRING },
        ruangKesimpulanHint: { type: Type.STRING },
      },
      required: ['prompt', 'ruangKesimpulanHint'],
    },
    penilaian: {
      type: Type.OBJECT,
      properties: {
        indikatorPenilaian: { type: Type.ARRAY, items: { type: Type.STRING } },
        kriteriaKeberhasilan: { type: Type.STRING },
        rubrikSederhana: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              aspek: { type: Type.STRING },
              sangatBaik: { type: Type.STRING },
              perluBimbingan: { type: Type.STRING },
            },
            required: ['aspek', 'sangatBaik', 'perluBimbingan'],
          },
        },
      },
      required: ['indikatorPenilaian', 'kriteriaKeberhasilan', 'rubrikSederhana'],
    },
  },
  required: [
    'judul',
    'identitasPesertaDidik',
    'tujuanKegiatan',
    'petunjukPengerjaan',
    'materiPengantar',
    'aktivitas',
    'pertanyaan',
    'aktivitasPenguatanPak',
    'refleksiSiswa',
    'kesimpulan',
    'penilaian',
  ],
};

const pakAutoDetectSchema = {
  type: Type.OBJECT,
  properties: {
    relevanceStatus: { type: Type.STRING },
    relevanceReason: { type: Type.STRING },
    alternatifPenguatan: { type: Type.STRING },
    elements: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.STRING },
          kode: { type: Type.STRING },
          nama: { type: Type.STRING },
          peran: { type: Type.STRING },
        },
        required: ['id', 'nama', 'peran'],
      },
    },
    subElements: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          code: { type: Type.STRING },
          elemenId: { type: Type.STRING },
          nama: { type: Type.STRING },
        },
        required: ['code', 'nama'],
      },
    },
    nilaiAntikorupsi: { type: Type.ARRAY, items: { type: Type.STRING } },
    learningObjectives: { type: Type.ARRAY, items: { type: Type.STRING } },
    materials: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          namaMateri: { type: Type.STRING },
          elemen: { type: Type.STRING },
          subelemen: { type: Type.STRING },
          nilaiAntikorupsi: { type: Type.ARRAY, items: { type: Type.STRING } },
          tujuanPenguatanKarakter: { type: Type.STRING },
          penjelasanMateri: { type: Type.STRING },
          contohPenerapan: { type: Type.ARRAY, items: { type: Type.STRING } },
          aktivitasPesertaDidik: { type: Type.STRING },
          pertanyaanPemantik: { type: Type.ARRAY, items: { type: Type.STRING } },
          asesmenRingkas: { type: Type.STRING },
          indikatorKeberhasilan: { type: Type.ARRAY, items: { type: Type.STRING } },
        },
        required: [
          'namaMateri',
          'elemen',
          'subelemen',
          'nilaiAntikorupsi',
          'tujuanPenguatanKarakter',
          'penjelasanMateri',
          'contohPenerapan',
          'aktivitasPesertaDidik',
          'pertanyaanPemantik',
          'asesmenRingkas',
          'indikatorKeberhasilan',
        ],
      },
    },
    activities: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          jenisAktivitas: { type: Type.STRING },
          judul: { type: Type.STRING },
          tujuan: { type: Type.STRING },
          elemenPak: { type: Type.STRING },
          subelemenPak: { type: Type.STRING },
          prinsipPembelajaranMendalam: { type: Type.ARRAY, items: { type: Type.STRING } },
          langkahKegiatan: { type: Type.ARRAY, items: { type: Type.STRING } },
          peranGuru: { type: Type.STRING },
          peranPesertaDidik: { type: Type.STRING },
          alokasiWaktuMenit: { type: Type.INTEGER },
          indikatorKeberhasilan: { type: Type.STRING },
        },
        required: [
          'jenisAktivitas',
          'judul',
          'tujuan',
          'elemenPak',
          'subelemenPak',
          'prinsipPembelajaranMendalam',
          'langkahKegiatan',
          'peranGuru',
          'peranPesertaDidik',
          'alokasiWaktuMenit',
          'indikatorKeberhasilan',
        ],
      },
    },
    assessments: {
      type: Type.OBJECT,
      properties: {
        pengetahuan: {
          type: Type.OBJECT,
          properties: {
            fokus: { type: Type.ARRAY, items: { type: Type.STRING } },
            bentukInstrumen: { type: Type.STRING },
            indikator: { type: Type.ARRAY, items: { type: Type.STRING } },
          },
          required: ['fokus', 'bentukInstrumen', 'indikator'],
        },
        sikapPerilaku: {
          type: Type.OBJECT,
          properties: {
            nilaiDiamati: { type: Type.ARRAY, items: { type: Type.STRING } },
            teknikObservasi: { type: Type.STRING },
            indikator: { type: Type.ARRAY, items: { type: Type.STRING } },
          },
          required: ['nilaiDiamati', 'teknikObservasi', 'indikator'],
        },
        praktik: {
          type: Type.OBJECT,
          properties: {
            bentukPraktik: { type: Type.ARRAY, items: { type: Type.STRING } },
            kriteriaPengamatan: { type: Type.STRING },
            indikator: { type: Type.ARRAY, items: { type: Type.STRING } },
          },
          required: ['bentukPraktik', 'kriteriaPengamatan', 'indikator'],
        },
        rubrikPerkembangan: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              aspek: { type: Type.STRING },
              sangatBerkembang: { type: Type.STRING },
              berkembangSesuaiHarapan: { type: Type.STRING },
              mulaiBerkembang: { type: Type.STRING },
              memerlukanBimbingan: { type: Type.STRING },
            },
            required: [
              'aspek',
              'sangatBerkembang',
              'berkembangSesuaiHarapan',
              'mulaiBerkembang',
              'memerlukanBimbingan',
            ],
          },
        },
        catatanPembinaanNonLabeling: { type: Type.STRING },
      },
      required: [
        'pengetahuan',
        'sikapPerilaku',
        'praktik',
        'rubrikPerkembangan',
        'catatanPembinaanNonLabeling',
      ],
    },
    refleksiIntegritas: { type: Type.ARRAY, items: { type: Type.STRING } },
    integrasiRpmRingkasan: {
      type: Type.OBJECT,
      properties: {
        identifikasiKarakter: { type: Type.STRING },
        desainKarakter: { type: Type.STRING },
        pengalamanMemahami: { type: Type.STRING },
        pengalamanMengaplikasi: { type: Type.STRING },
        pengalamanMerefleksi: { type: Type.STRING },
        aktivitasGuruSiswa: { type: Type.STRING },
        asesmenPengamatan: { type: Type.STRING },
        refleksiHarian: { type: Type.STRING },
      },
      required: [
        'identifikasiKarakter',
        'desainKarakter',
        'pengalamanMemahami',
        'pengalamanMengaplikasi',
        'pengalamanMerefleksi',
        'aktivitasGuruSiswa',
        'asesmenPengamatan',
        'refleksiHarian',
      ],
    },
    qualityValidation: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          nomor: { type: Type.INTEGER },
          kriteria: { type: Type.STRING },
          memenuhi: { type: Type.BOOLEAN },
          catatan: { type: Type.STRING },
        },
        required: ['nomor', 'kriteria', 'memenuhi', 'catatan'],
      },
    },
  },
  required: [
    'relevanceStatus',
    'relevanceReason',
    'elements',
    'subElements',
    'nilaiAntikorupsi',
    'learningObjectives',
    'materials',
    'activities',
    'assessments',
    'refleksiIntegritas',
    'integrasiRpmRingkasan',
    'qualityValidation',
  ],
};

function buildPakDetectPrompt(params: {
  mataPelajaran: string;
  kelas: string;
  fase: string;
  materi: string;
  cp?: string;
  tp?: string;
  karakteristik?: string;
  aktivitas?: string;
  model?: string;
  metode?: string;
  lingkungan?: string;
  regenerationNote?: string;
}): string {
  const frameworkSummary = PAK_ELEMENTS_FRAMEWORK.map(
    (el) =>
      `${el.id} | ${el.kode}: ${el.nama} -> Subelemen: ${el.subElements.map((s) => `${s.code} ${s.nama}`).join('; ')}`,
  ).join('\n');

  return `Jalankan 7 Tahap AI Auto-Detect Pendidikan Antikorupsi (PAK) untuk rancangan pembelajaran berikut:
1. Mata Pelajaran: ${params.mataPelajaran}
2. Kelas & Fase: ${params.kelas} (Fase ${params.fase})
3. Materi / Topik Pembelajaran: ${params.materi}
4. Capaian Pembelajaran (CP): ${params.cp || '(Belum diisi - analisis berdasarkan materi dan mapel)'}
5. Tujuan Pembelajaran (TP): ${params.tp || '(Belum diisi - jaga agar TP akademik utama tidak terdistorsi)'}
6. Karakteristik Peserta Didik: ${params.karakteristik || '(Anak SD sesuai fase tersebut)'}
7. Aktivitas Pembelajaran: ${params.aktivitas || '(Aktivitas pembelajaran aktif di kelas SD)'}
8. Model & Metode Pembelajaran: ${params.model || '-'} / ${params.metode || '-'}
9. Lingkungan Pembelajaran: ${params.lingkungan || 'Ruang kelas dan lingkungan sekolah SDN Randusari'}
${params.regenerationNote ? `\nCatatan Guru untuk Regenerasi: ${params.regenerationNote}` : ''}

KERANGKA PEMETAAN WAJIB:
${frameworkSummary}

10 KRITERIA VALIDASI KUALITAS PAK (isi tepat 10 butir sesuai urutan):
${PAK_VALIDATION_CRITERIA.map((k, i) => `${i + 1}. ${k}`).join('\n')}

INSTRUKSI KHUSUS (PADAT, OPERASIONAL, CEPAT):
- Nilai relevansi secara objektif: "sangat_relevan" | "relevan_penguatan" | "tidak_relevan_langsung".
- Jangan memaksakan PAK jika tidak relevan secara pedagogis. Jangan memilih semua 5 elemen sekaligus (maksimal 1 elemen utama + 1 elemen pendukung).
- Susun jawaban yang padat dan langsung pakai (1–2 kalimat per bidang):
  * materials: 1 materi PAK inti yang paling relevan (atau 0 jika tidak_relevan_langsung).
  * activities: 1–2 aktivitas konkret SD dengan 3–4 langkah singkat.
  * rubrikPerkembangan: 2 aspek utama dengan 4 tingkat ("Sangat Berkembang", "Berkembang Sesuai Harapan", "Mulai Berkembang", "Memerlukan Bimbingan") tanpa label moral permanen.
  * integrasiRpmRingkasan: masing-masing 1 kalimat padat.
  * qualityValidation: tepat 10 butir ringkas sesuai urutan.`;
}

function buildLkpdPrompt(
  rpm: RpmCoreContent,
  pak?: PakIntegrationRecord | null,
  regenerationNote?: string,
): string {
  const gradeBand = getGradeBandGuidance(rpm.identitas.kelas, rpm.identitas.fase);
  const pakSummary = buildLkpdPakSummaryFromRecord(pak);
  const stepsSummary = [
    ...rpm.pengalamanBelajar.inti.memahami,
    ...rpm.pengalamanBelajar.inti.mengaplikasi,
  ]
    .map((s) => `${s.tahap}: ${s.namaAktivitas} (${s.aktivitasPesertaDidik})`)
    .join('\n');

  const pakLine = pakSummary.relevanLangsung
    ? `INTEGRASI PAK WAJIB SELARAS DENGAN RPM:
- Elemen PAK: ${pakSummary.elemenPak.join(', ')}
- Subelemen PAK: ${pakSummary.subelemenPak.join('; ')}
- Nilai Antikorupsi: ${pakSummary.nilaiKarakter.join(', ')}
- Perilaku Diharapkan: ${pakSummary.perilakuDiharapkan.join('; ')}
Sertakan aktivitasPenguatanPak dengan relevan: true yang kontekstual bagi anak SD.`
    : `INTEGRASI PAK: Tidak ada integrasi PAK langsung pada RPM ini (${pakSummary.catatan}). Set aktivitasPenguatanPak.relevan = false dan JANGAN memaksakan materi PAK.`;

  return `Susun Lembar Kerja Peserta Didik (LKPD) lengkap (12 komponen) yang 100% diturunkan dari RPM berikut:
- Satuan Pendidikan: ${sanitizeString(rpm.identitas.namaSatuanPendidikan, 150)}
- Mata Pelajaran: ${sanitizeString(rpm.identitas.mataPelajaran, 150)}
- Kelas / Fase: ${sanitizeString(rpm.identitas.kelas, 50)} / Fase ${sanitizeString(rpm.identitas.fase, 4)} (${gradeBand.band})
- Aturan Bahasa & Kompleksitas Usia: ${gradeBand.instructionRule}
- Materi: ${sanitizeString(rpm.identitas.materi, 300)}
- Tujuan Pembelajaran (TP): ${(rpm.desain?.tujuanPembelajaran || []).join('; ')}
- Ringkasan Materi Inti: ${sanitizeString(rpm.identifikasi?.materiPembelajaran, 600)}
- Aktivitas Inti pada RPM:
${stepsSummary || '(Gunakan aktivitas eksplorasi sesuai topik)'}
${regenerationNote ? `\nCatatan Penyempurnaan dari Guru: ${sanitizeString(regenerationNote, 500)}` : ''}

${pakLine}

ATURAN WAJIB LKPD SD:
1. Jangan meminta data pribadi sensitif (hanya kolom Nama & Nomor Absen).
2. petunjukPengerjaan: 3–5 langkah jelas ramah anak SD.
3. materiPengantar: penjelasan inti singkat yang mudah dipahami siswa sesuai fase.
4. aktivitas: 2–3 aktivitas terstruktur dengan jenisAktivitas (mis. Mengamati/Membaca/Berdiskusi/Memecahkan Masalah/Praktik) dan langkahSingkat.
5. pertanyaan: 3–4 latihan bertingkat dari tingkatKesulitan "Dasar", "Menengah", hingga "HOTS Ringan", sertakan ruangJawabanHint dan barisRuangJawaban (3–5 baris).
6. refleksiSiswa: 3–4 pertanyaan refleksi pemahaman, penerapan sehari-hari, nilai kejujuran/tanggung jawab, dan rencana tindakan.
7. kesimpulan: prompt kesimpulan yang diisi siswa + ruangKesimpulanHint.
8. penilaian: indikatorPenilaian, kriteriaKeberhasilan, dan rubrikSederhana (2 aspek dengan kriteria sangatBaik & perluBimbingan).`;
}

export function createApiRouter(): Router {
  const router = Router();

  // Rate limit middleware for all AI routes
  router.use((req, res, next) => {
    if (req.path === '/health') return next();
    const key = getClientKey(req);
    const check = limiter.check(key);
    if (!check.allowed) {
      return res.status(429).json({
        error: 'Terlalu banyak permintaan dalam waktu singkat. Mohon tunggu 1 menit sebelum mencoba kembali.',
        code: 'RATE_LIMITED',
      });
    }
    return next();
  });

  router.get('/health', (_req, res) => {
    res.json({
      status: 'ok',
      model: resolveGeminiModel(),
      aiConfigured: Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'MY_GEMINI_API_KEY'),
    });
  });

  router.get('/ai/connection', (req, res) => {
    const hasServerApiKey = Boolean(
      process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'MY_GEMINI_API_KEY',
    );
    const oauthServerConfigured = isServerGoogleOAuthConfigured();
    const clientGisId = (process.env.VITE_GOOGLE_CLIENT_ID || '').trim();
    const baseUrl = resolveAppBaseUrl(req);

    res.json({
      hasServerApiKey,
      model: resolveGeminiModel(),
      oauthServerConfigured,
      oauthClientConfigured: Boolean(clientGisId),
      redirectUri: `${baseUrl}/auth/google/callback`,
      supportedNote:
        'Google OAuth mengautentikasi identitas akun Google pengguna secara resmi, sedangkan inferensi Gemini API dijalankan secara aman melalui backend menggunakan GEMINI_API_KEY yang dikelola administrator.',
    });
  });

  router.post('/ai/test', async (_req, res) => {
    try {
      const result = await testGeminiConnection();
      return res.json({
        ok: true,
        status: 'berhasil_terhubung',
        model: result.model,
        latencyMs: result.latencyMs,
        message: `Koneksi Gemini API aktif melalui backend (${result.model}, ${result.latencyMs} ms).`,
      });
    } catch (err) {
      if (err instanceof GeminiServiceError) {
        const status =
          err.code === 'GEMINI_NOT_CONFIGURED' ? 'memerlukan_konfigurasi' : 'koneksi_gagal';
        return res.status(err.statusCode).json({
          ok: false,
          status,
          code: err.code,
          error: err.message,
        });
      }
      return res.status(502).json({
        ok: false,
        status: 'koneksi_gagal',
        code: 'UNKNOWN_ERROR',
        error: 'Gagal menguji koneksi Gemini API pada server.',
      });
    }
  });

  router.get('/auth/google/url', (req, res) => {
    const info = createGoogleAuthUrl(req);
    return res.json(info);
  });

  // 1. POST /api/generate-rpm (Generates Integrated RPM+PAK & Derived 12-Section LKPD)
  router.post('/generate-rpm', async (req, res) => {
    try {
      const body = (req.body || {}) as Partial<AutoGeneratorInput> & {
        lessonPlanId?: string;
        nipGuru?: string;
        namaKepalaSekolah?: string;
        nipKepalaSekolah?: string;
      };

      const materi = sanitizeString(body.materi, 300);
      const mataPelajaran = sanitizeString(body.mataPelajaran, 150);
      if (!materi || !mataPelajaran) {
        return res.status(400).json({
          error: 'Mata pelajaran dan materi pembelajaran wajib diisi sebelum menyusun RPM.',
        });
      }

      const fallbackProfile = createDefaultProfile();
      fallbackProfile.namaGuru = sanitizeString(body.namaGuru, 120, 'Guru SDN Randusari');
      fallbackProfile.nip = sanitizeString(body.nipGuru, 40, '');
      fallbackProfile.namaSekolah = sanitizeString(body.namaSekolah, 150, 'SDN Randusari');
      fallbackProfile.mataPelajaranUtama = mataPelajaran;
      fallbackProfile.namaKepalaSekolah = sanitizeString(body.namaKepalaSekolah, 120, '');
      fallbackProfile.nipKepalaSekolah = sanitizeString(body.nipKepalaSekolah, 40, '');

      const fallbackBase = createDefaultRpmCore(fallbackProfile);
      fallbackBase.identitas = {
        ...fallbackBase.identitas,
        kelas: sanitizeString(body.kelas, 50, 'Kelas 5'),
        fase: body.fase === 'A' || body.fase === 'B' || body.fase === 'C' ? body.fase : 'C',
        semester: body.semester === '1' || body.semester === '2' ? body.semester : '1',
        tahunAjaran: sanitizeString(body.tahunAjaran, 30, '2026/2027'),
        materi,
        alokasiWaktu: sanitizeString(body.alokasiWaktu, 80, '2 x 35 menit (1 Pertemuan)'),
      };

      const cpProvided = sanitizeString(body.capaianPembelajaran, 2000);
      const tpProvided = sanitizeString(body.tujuanPembelajaran, 1500);
      const karakProvided = sanitizeString(body.karakteristikPesertaDidik, 1200);
      const modelPref = sanitizeString(body.modelPembelajaran, 150);
      const metodePref = sanitizeString(body.metodePembelajaran, 300);
      const lessonPlanId = sanitizeString(body.lessonPlanId, 100, `rpm-${Date.now()}`);

      const preApprovedPak = body.pakIntegration as PakIntegrationRecord | undefined;
      const pakInstructionBlock =
        preApprovedPak &&
        preApprovedPak.applied &&
        !preApprovedPak.ignored &&
        preApprovedPak.relevanceStatus !== 'tidak_relevan_langsung'
          ? `\n\nINTEGRASI PENDIDIKAN ANTIKORUPSI (PAK) YANG DISETUJUI GURU:
- Elemen PAK: ${preApprovedPak.elements.map((e) => `${e.kode} ${e.nama}`).join(', ')}
- Subelemen PAK: ${preApprovedPak.subElements.map((s) => `${s.code} ${s.nama}`).join('; ')}
- Nilai Antikorupsi: ${preApprovedPak.nilaiAntikorupsi.join(', ')}
- Tujuan Penguatan Karakter: ${preApprovedPak.learningObjectives.join('; ')}
- Integrasi Materi & Aktivitas: ${preApprovedPak.materials.map((m) => `${m.namaMateri}: ${m.aktivitasPesertaDidik}`).join(' | ')}
- Refleksi Integritas: ${preApprovedPak.refleksiIntegritas.join('; ')}
WAJIB integrasikan nilai dan aktivitas PAK tersebut ke Pendahuluan, Inti (Memahami, Mengaplikasi, Merefleksi), Penutup (isi nilaiPakDikembangkan pada tiap langkah), Asesmen Formatif, dan Refleksi TANPA mengubah TP akademik utama.`
          : '';

      const userPrompt = `Susun Rencana Pembelajaran Mendalam (RPM) lengkap dan sistematis untuk Sekolah Dasar dengan data masukan guru berikut:
- Satuan Pendidikan: ${fallbackBase.identitas.namaSatuanPendidikan}
- Nama Guru: ${fallbackBase.identitas.namaGuru}
- Mata Pelajaran: ${fallbackBase.identitas.mataPelajaran}
- Kelas / Fase: ${fallbackBase.identitas.kelas} / Fase ${fallbackBase.identitas.fase}
- Semester / Tahun Ajaran: Semester ${fallbackBase.identitas.semester} / ${fallbackBase.identitas.tahunAjaran}
- Materi / Topik Pembelajaran: ${materi}
- Alokasi Waktu: ${fallbackBase.identitas.alokasiWaktu}
- Capaian Pembelajaran (CP) dari Guru: ${cpProvided || '(Belum diisi guru - susun draf CP yang relevan dan tandai cpPerluVerifikasi: true)'}
- Tujuan Pembelajaran (TP) dari Guru: ${tpProvided || '(Belum diisi guru - rumuskan 2-3 TP operasional yang selaras dengan CP)'}
- Karakteristik Peserta Didik: ${karakProvided || '(Sesuaikan secara realistis dengan anak SD pada kelas dan fase tersebut)'}
- Preferensi Model Pembelajaran: ${modelPref && modelPref !== 'Biarkan AI Merekomendasikan' ? modelPref : '(Rekomendasikan model terbaik yang sesuai)'}
- Preferensi Metode Pembelajaran: ${metodePref || '(Rekomendasikan metode aktif yang realistis untuk SD)'}${pakInstructionBlock}

Pastikan pada pengalamanBelajar.inti terdapat langkah konkret pada tahap memahami, mengaplikasi, dan merefleksi, serta prinsip dalam setiap langkah hanya memilih dari ["Mindful", "Meaningful", "Joyful"].
Untuk dimensiProfilLulusan, gunakan id tepat dari daftar: keimanan, kewargaan, penalaran_kritis, kreativitas, kolaborasi, kemandirian, kesehatan, komunikasi.`;

      // Step 1: Generate RPM (and auto-detect PAK in parallel if caller didn't pre-supply one)
      const rpmPromise = generateStructuredJson<Record<string, unknown>>({
        systemInstruction: SYSTEM_PROMPT_RPM_GENERATOR,
        userPrompt,
        responseSchema: rpmCoreResponseSchema,
      });

      const pakPromise = preApprovedPak
        ? Promise.resolve<PakIntegrationRecord | null>(preApprovedPak)
        : generateStructuredJson<Record<string, unknown>>({
            systemInstruction: SYSTEM_PROMPT_PAK_AUTODETECT,
            userPrompt: buildPakDetectPrompt({
              mataPelajaran,
              kelas: fallbackBase.identitas.kelas,
              fase: fallbackBase.identitas.fase,
              materi,
              cp: cpProvided,
              tp: tpProvided,
              karakteristik: karakProvided,
              model: modelPref,
              metode: metodePref,
            }),
            responseSchema: pakAutoDetectSchema,
            thinkingLevel: ThinkingLevel.LOW,
          })
            .then((rawPak) => {
              const normalizedPak = validateAndNormalizePakIntegration(rawPak, lessonPlanId);
              if (normalizedPak.relevanceStatus !== 'tidak_relevan_langsung') {
                normalizedPak.applied = true;
              }
              return normalizedPak;
            })
            .catch(() => null);

      const [rawRpmResult, resolvedPak] = await Promise.all([rpmPromise, pakPromise]);

      let normalizedRpm = validateAndNormalizeRpmCore(rawRpmResult, fallbackBase);
      if (!cpProvided) {
        normalizedRpm.desain.cpPerluVerifikasi = true;
      }

      if (
        resolvedPak &&
        resolvedPak.applied &&
        !resolvedPak.ignored &&
        resolvedPak.relevanceStatus !== 'tidak_relevan_langsung'
      ) {
        normalizedRpm = applyPakIntegrationToRpmCore(normalizedRpm, {
          ...resolvedPak,
          lessonPlanId,
          applied: true,
        });
      }

      // Step 2: Generate 12-section LKPD derived directly from the exact integrated RPM + PAK
      const rawLkpd = await generateStructuredJson<Record<string, unknown>>({
        systemInstruction: SYSTEM_PROMPT_KIT_GENERATOR,
        userPrompt: buildLkpdPrompt(normalizedRpm, resolvedPak),
        responseSchema: lkpdResponseSchema,
        thinkingLevel: ThinkingLevel.LOW,
      });

      const normalizedLkpd = normalizeLkpdKit(rawLkpd, normalizedRpm, resolvedPak, lessonPlanId);
      const reconciled = validateAndReconcileCrossDocument(
        normalizedRpm,
        normalizedLkpd,
        resolvedPak,
        lessonPlanId,
        'reconcile_lkpd_to_rpm',
      );

      return res.json({
        rpm: reconciled.rpm,
        pakIntegration: resolvedPak ? { ...resolvedPak, lessonPlanId } : undefined,
        lkpd: reconciled.lkpd,
        crossValidation: reconciled.validation,
      });
    } catch (err) {
      return handleRouteError(res, err);
    }
  });

  // 2. POST /api/ai-interview
  router.post('/ai-interview', async (req, res) => {
    try {
      const body = (req.body || {}) as {
        history?: { role: 'assistant' | 'user'; text: string }[];
        knownContext?: Record<string, string>;
      };

      const history = Array.isArray(body.history) ? body.history.slice(-14) : [];
      const known = body.knownContext || {};

      const historyText = history
        .map((m) => `${m.role === 'user' ? 'Guru' : 'Konsultan AI'}: ${sanitizeString(m.text, 1200)}`)
        .join('\n');

      const knownLines = Object.entries(known)
        .filter(([, v]) => typeof v === 'string' && v.trim().length > 0)
        .map(([k, v]) => `- ${k}: ${sanitizeString(v, 500)}`)
        .join('\n');

      const userPrompt = `Data Awal / Profil yang Sudah Tersedia:
${knownLines || '(Belum ada data awal)'}

Riwayat Percakapan Wawancara Sejauh Ini:
${historyText || '(Wawancara baru dimulai. Sapa guru dengan ramah dan ajukan pertanyaan pertama yang belum tersedia.)'}

Tugas Anda:
1. Perbarui "collectedInfo" dengan mengekstrak informasi yang sudah terjawab (mataPelajaran, materi, kelas, fase, alokasiWaktu, capaianPembelajaran, tujuanPembelajaran, karakteristikSiswa, kondisiSekolah, modelPembelajaran, pengalamanBelajar, asesmen).
2. Tentukan "missingFields" yang benar-benar masih kurang.
3. Jika informasi inti sudah cukup untuk menyusun RPM bermutu (minimal mataPelajaran, materi, kelas, dan gambaran tujuan/karakteristik) atau guru meminta langsung dibuatkan RPM, set "readyToGenerate": true dan berikan "summaryText" ringkas yang siap dikonfirmasi guru.
4. Jika masih ada yang perlu digali, ajukan tepat 1 pertanyaan fokus yang belum terjawab pada "reply", sertakan "explanation" singkat jika membantu, dan 2-4 "choices" rekomendasi jawaban.`;

      const schema = {
        type: Type.OBJECT,
        properties: {
          reply: { type: Type.STRING },
          explanation: { type: Type.STRING },
          choices: { type: Type.ARRAY, items: { type: Type.STRING } },
          collectedInfo: {
            type: Type.OBJECT,
            properties: {
              mataPelajaran: { type: Type.STRING },
              materi: { type: Type.STRING },
              kelas: { type: Type.STRING },
              fase: { type: Type.STRING },
              alokasiWaktu: { type: Type.STRING },
              capaianPembelajaran: { type: Type.STRING },
              tujuanPembelajaran: { type: Type.STRING },
              karakteristikSiswa: { type: Type.STRING },
              kondisiSekolah: { type: Type.STRING },
              modelPembelajaran: { type: Type.STRING },
              pengalamanBelajar: { type: Type.STRING },
              asesmen: { type: Type.STRING },
            },
          },
          missingFields: { type: Type.ARRAY, items: { type: Type.STRING } },
          readyToGenerate: { type: Type.BOOLEAN },
          summaryText: { type: Type.STRING },
        },
        required: ['reply', 'choices', 'collectedInfo', 'missingFields', 'readyToGenerate', 'summaryText'],
      };

      const result = await generateStructuredJson<Record<string, unknown>>({
        systemInstruction: SYSTEM_PROMPT_AI_INTERVIEW,
        userPrompt,
        responseSchema: schema,
      });

      return res.json(result);
    } catch (err) {
      return handleRouteError(res, err);
    }
  });

  // 3. POST /api/generate-lkpd (12-section LKPD derived from RPM + PAK)
  router.post('/generate-lkpd', async (req, res) => {
    try {
      const { rpm, pakIntegration, regenerationNote, lessonPlanId } = (req.body || {}) as {
        rpm?: RpmCoreContent;
        pakIntegration?: PakIntegrationRecord | null;
        regenerationNote?: string;
        lessonPlanId?: string;
      };
      if (!rpm || !rpm.identitas?.materi) {
        return res.status(400).json({ error: 'Data RPM belum lengkap untuk menyusun LKPD.' });
      }

      const rawLkpd = await generateStructuredJson<Record<string, unknown>>({
        systemInstruction: SYSTEM_PROMPT_KIT_GENERATOR,
        userPrompt: buildLkpdPrompt(rpm, pakIntegration, regenerationNote),
        responseSchema: lkpdResponseSchema,
        thinkingLevel: ThinkingLevel.LOW,
      });

      const normalized = normalizeLkpdKit(rawLkpd, rpm, pakIntegration, lessonPlanId || '');
      const reconciled = validateAndReconcileCrossDocument(
        rpm,
        normalized,
        pakIntegration,
        lessonPlanId || '',
        'reconcile_lkpd_to_rpm',
      );

      return res.json({
        lkpd: reconciled.lkpd,
        crossValidation: reconciled.validation,
      });
    } catch (err) {
      return handleRouteError(res, err);
    }
  });

  // 4. POST /api/generate-material
  router.post('/generate-material', async (req, res) => {
    try {
      const { rpm } = (req.body || {}) as { rpm?: RpmCoreContent };
      if (!rpm || !rpm.identitas?.materi) {
        return res.status(400).json({ error: 'Data RPM belum lengkap untuk menyusun Bahan Ajar.' });
      }

      const userPrompt = `Susun Bahan Ajar lengkap dan mudah dipahami siswa SD berdasarkan RPM:
- Mata Pelajaran: ${sanitizeString(rpm.identitas.mataPelajaran, 150)}
- Kelas / Fase: ${sanitizeString(rpm.identitas.kelas, 50)} / Fase ${sanitizeString(rpm.identitas.fase, 4)}
- Materi: ${sanitizeString(rpm.identitas.materi, 300)}
- Tujuan Pembelajaran: ${(rpm.desain?.tujuanPembelajaran || []).join('; ')}
- Konteks Lingkungan: ${sanitizeString(rpm.identifikasi?.konteksLingkunganSekolah, 400)}`;

      const schema = {
        type: Type.OBJECT,
        properties: {
          judul: { type: Type.STRING },
          ringkasanKonsep: { type: Type.STRING },
          uraianMateri: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                subjudul: { type: Type.STRING },
                isi: { type: Type.STRING },
              },
              required: ['subjudul', 'isi'],
            },
          },
          contohKontekstual: { type: Type.STRING },
          glosarium: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                istilah: { type: Type.STRING },
                arti: { type: Type.STRING },
              },
              required: ['istilah', 'arti'],
            },
          },
          sumberBacaan: { type: Type.ARRAY, items: { type: Type.STRING } },
        },
        required: ['judul', 'ringkasanKonsep', 'uraianMateri', 'contohKontekstual', 'glosarium', 'sumberBacaan'],
      };

      const bahanAjar = await generateStructuredJson({
        systemInstruction: SYSTEM_PROMPT_KIT_GENERATOR,
        userPrompt,
        responseSchema: schema,
      });

      return res.json({ bahanAjar });
    } catch (err) {
      return handleRouteError(res, err);
    }
  });

  // 5. POST /api/generate-assessment
  router.post('/generate-assessment', async (req, res) => {
    try {
      const { rpm, mode } = (req.body || {}) as {
        rpm?: RpmCoreContent;
        mode?: 'soal' | 'diagnostik';
      };
      if (!rpm || !rpm.identitas?.materi) {
        return res.status(400).json({ error: 'Data RPM belum lengkap untuk menyusun Asesmen.' });
      }

      if (mode === 'diagnostik') {
        const userPrompt = `Susun perangkat Asesmen Diagnostik Awal untuk RPM:
- Mata Pelajaran: ${sanitizeString(rpm.identitas.mataPelajaran, 150)}
- Kelas / Fase: ${sanitizeString(rpm.identitas.kelas, 50)} / Fase ${sanitizeString(rpm.identitas.fase, 4)}
- Materi: ${sanitizeString(rpm.identitas.materi, 300)}
- Pengetahuan Awal yang Diharapkan: ${sanitizeString(rpm.identifikasi?.pengetahuanAwal, 500)}`;

        const schema = {
          type: Type.OBJECT,
          properties: {
            tujuanPemetaan: { type: Type.STRING },
            kisiKisi: { type: Type.ARRAY, items: { type: Type.STRING } },
            pertanyaanPemantik: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  nomor: { type: Type.INTEGER },
                  pertanyaan: { type: Type.STRING },
                  kategori: { type: Type.STRING },
                },
                required: ['nomor', 'pertanyaan', 'kategori'],
              },
            },
            pemetaanKesiapan: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  kategori: { type: Type.STRING },
                  ciriSiswa: { type: Type.STRING },
                  tindakLanjut: { type: Type.STRING },
                },
                required: ['kategori', 'ciriSiswa', 'tindakLanjut'],
              },
            },
          },
          required: ['tujuanPemetaan', 'kisiKisi', 'pertanyaanPemantik', 'pemetaanKesiapan'],
        };

        const asesmenDiagnostikDetail = await generateStructuredJson({
          systemInstruction: SYSTEM_PROMPT_KIT_GENERATOR,
          userPrompt,
          responseSchema: schema,
        });

        return res.json({ asesmenDiagnostikDetail });
      }

      // Default: Soal Formatif dan Sumatif
      const userPrompt = `Susun Kisi-Kisi serta Soal Evaluasi Formatif (5 soal singkat/uraian proses) dan Sumatif (5 soal pilihan ganda + uraian beserta kunci jawaban & pedoman penskoran) yang selaras dengan Tujuan Pembelajaran:
- Mata Pelajaran: ${sanitizeString(rpm.identitas.mataPelajaran, 150)}
- Kelas / Fase: ${sanitizeString(rpm.identitas.kelas, 50)} / Fase ${sanitizeString(rpm.identitas.fase, 4)}
- Materi: ${sanitizeString(rpm.identitas.materi, 300)}
- Tujuan Pembelajaran: ${(rpm.desain?.tujuanPembelajaran || []).join('; ')}`;

      const schema = {
        type: Type.OBJECT,
        properties: {
          kisiKisi: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                nomor: { type: Type.INTEGER },
                indikator: { type: Type.STRING },
                levelKognitif: { type: Type.STRING },
                bentuk: { type: Type.STRING },
              },
              required: ['nomor', 'indikator', 'levelKognitif', 'bentuk'],
            },
          },
          soalFormatif: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                nomor: { type: Type.INTEGER },
                pertanyaan: { type: Type.STRING },
                opsi: { type: Type.ARRAY, items: { type: Type.STRING } },
                kunciJawaban: { type: Type.STRING },
              },
              required: ['nomor', 'pertanyaan', 'kunciJawaban'],
            },
          },
          soalSumatif: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                nomor: { type: Type.INTEGER },
                pertanyaan: { type: Type.STRING },
                opsi: { type: Type.ARRAY, items: { type: Type.STRING } },
                kunciJawaban: { type: Type.STRING },
                pedomanPenskoran: { type: Type.STRING },
              },
              required: ['nomor', 'pertanyaan', 'kunciJawaban', 'pedomanPenskoran'],
            },
          },
        },
        required: ['kisiKisi', 'soalFormatif', 'soalSumatif'],
      };

      const soalEvaluasi = await generateStructuredJson({
        systemInstruction: SYSTEM_PROMPT_KIT_GENERATOR,
        userPrompt,
        responseSchema: schema,
      });

      return res.json({ soalEvaluasi });
    } catch (err) {
      return handleRouteError(res, err);
    }
  });

  // 6. POST /api/generate-rubric
  router.post('/generate-rubric', async (req, res) => {
    try {
      const { rpm } = (req.body || {}) as { rpm?: RpmCoreContent };
      if (!rpm || !rpm.identitas?.materi) {
        return res.status(400).json({ error: 'Data RPM belum lengkap untuk menyusun Rubrik.' });
      }

      const userPrompt = `Susun Rubrik Penilaian Analitik (4 tingkat: Sangat Baik, Baik, Cukup, Perlu Bimbingan) yang mengukur ketercapaian Tujuan Pembelajaran dan Dimensi Profil Lulusan untuk:
- Mata Pelajaran: ${sanitizeString(rpm.identitas.mataPelajaran, 150)}
- Kelas / Fase: ${sanitizeString(rpm.identitas.kelas, 50)} / Fase ${sanitizeString(rpm.identitas.fase, 4)}
- Materi: ${sanitizeString(rpm.identitas.materi, 300)}
- Tujuan Pembelajaran: ${(rpm.desain?.tujuanPembelajaran || []).join('; ')}
- Dimensi Profil Lulusan: ${(rpm.identifikasi?.dimensiProfilLulusan || []).map((d) => d.nama).join(', ')}`;

      const schema = {
        type: Type.OBJECT,
        properties: {
          judul: { type: Type.STRING },
          skala: { type: Type.STRING },
          kriteria: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                aspek: { type: Type.STRING },
                sangatBaik: { type: Type.STRING },
                baik: { type: Type.STRING },
                cukup: { type: Type.STRING },
                perluBimbingan: { type: Type.STRING },
              },
              required: ['aspek', 'sangatBaik', 'baik', 'cukup', 'perluBimbingan'],
            },
          },
        },
        required: ['judul', 'skala', 'kriteria'],
      };

      const rubrikPenilaian = await generateStructuredJson({
        systemInstruction: SYSTEM_PROMPT_KIT_GENERATOR,
        userPrompt,
        responseSchema: schema,
      });

      return res.json({ rubrikPenilaian });
    } catch (err) {
      return handleRouteError(res, err);
    }
  });

  // 7. POST /api/generate-kit (media, observasi, refleksi detail)
  router.post('/generate-kit', async (req, res) => {
    try {
      const { rpm, kitType } = (req.body || {}) as {
        rpm?: RpmCoreContent;
        kitType?: 'media' | 'observasi' | 'refleksi';
      };
      if (!rpm || !rpm.identitas?.materi) {
        return res.status(400).json({ error: 'Data RPM belum lengkap.' });
      }

      const baseContext = `Mata Pelajaran: ${sanitizeString(rpm.identitas.mataPelajaran, 150)}, Kelas ${sanitizeString(rpm.identitas.kelas, 50)}, Materi: ${sanitizeString(rpm.identitas.materi, 300)}, Tujuan Pembelajaran: ${(rpm.desain?.tujuanPembelajaran || []).join('; ')}`;

      if (kitType === 'media') {
        const schema = {
          type: Type.OBJECT,
          properties: {
            judul: { type: Type.STRING },
            jenisMedia: { type: Type.STRING },
            tujuanPenggunaan: { type: Type.STRING },
            alatBahan: { type: Type.ARRAY, items: { type: Type.STRING } },
            langkahPembuatan: { type: Type.ARRAY, items: { type: Type.STRING } },
            panduanPenggunaan: { type: Type.ARRAY, items: { type: Type.STRING } },
            alternatifDigital: { type: Type.STRING },
          },
          required: [
            'judul',
            'jenisMedia',
            'tujuanPenggunaan',
            'alatBahan',
            'langkahPembuatan',
            'panduanPenggunaan',
            'alternatifDigital',
          ],
        };
        const mediaPembelajaran = await generateStructuredJson({
          systemInstruction: SYSTEM_PROMPT_KIT_GENERATOR,
          userPrompt: `Rancang Media Pembelajaran SD yang praktis, terjangkau, dan mendukung pemahaman mendalam untuk ${baseContext}`,
          responseSchema: schema,
        });
        return res.json({ mediaPembelajaran });
      }

      if (kitType === 'observasi') {
        const schema = {
          type: Type.OBJECT,
          properties: {
            judul: { type: Type.STRING },
            fokusObservasi: { type: Type.STRING },
            indikator: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  nomor: { type: Type.INTEGER },
                  aspek: { type: Type.STRING },
                  indikatorPerilaku: { type: Type.STRING },
                },
                required: ['nomor', 'aspek', 'indikatorPerilaku'],
              },
            },
            catatanAnekdotPanduan: { type: Type.STRING },
          },
          required: ['judul', 'fokusObservasi', 'indikator', 'catatanAnekdotPanduan'],
        };
        const lembarObservasi = await generateStructuredJson({
          systemInstruction: SYSTEM_PROMPT_KIT_GENERATOR,
          userPrompt: `Susun Lembar Observasi Sikap, Kolaborasi, dan Keterampilan Proses untuk ${baseContext}`,
          responseSchema: schema,
        });
        return res.json({ lembarObservasi });
      }

      const schema = {
        type: Type.OBJECT,
        properties: {
          pertanyaanRefleksiGuru: { type: Type.ARRAY, items: { type: Type.STRING } },
          pertanyaanRefleksiSiswa: { type: Type.ARRAY, items: { type: Type.STRING } },
          rencanaTindakLanjut: { type: Type.STRING },
        },
        required: ['pertanyaanRefleksiGuru', 'pertanyaanRefleksiSiswa', 'rencanaTindakLanjut'],
      };
      const refleksiDetail = await generateStructuredJson({
        systemInstruction: SYSTEM_PROMPT_KIT_GENERATOR,
        userPrompt: `Susun Instrumen Refleksi Guru dan Peserta Didik beserta rencana tindak lanjut untuk ${baseContext}`,
        responseSchema: schema,
      });
      return res.json({ refleksiDetail });
    } catch (err) {
      return handleRouteError(res, err);
    }
  });

  // 8. POST /api/validate-rpm (AI Pedagogical Quality Control)
  router.post('/validate-rpm', async (req, res) => {
    try {
      const { rpm, hasPerangkat } = (req.body || {}) as {
        rpm?: RpmCoreContent;
        hasPerangkat?: Record<string, boolean>;
      };
      if (!rpm) {
        return res.status(400).json({ error: 'Dokumen RPM tidak ditemukan untuk dievaluasi.' });
      }

      const userPrompt = `Evaluasi mutu pedagogis dokumen RPM berikut secara kritis dan jujur berdasarkan 10 kriteria Quality Control:
1. Kesesuaian CP dan TP
2. Kejelasan tujuan pembelajaran
3. Kesesuaian model pembelajaran
4. Keterkaitan aktivitas dengan tujuan
5. Integrasi prinsip Pembelajaran Mendalam (Mindful, Meaningful, Joyful) & (Memahami, Mengaplikasi, Merefleksi)
6. Kesesuaian asesmen dengan tujuan
7. Kesesuaian alokasi waktu
8. Kesesuaian materi dengan fase dan kelas
9. Kesesuaian karakteristik peserta didik
10. Kelengkapan perangkat pembelajaran

Status kelengkapan perangkat tambahan saat ini: ${JSON.stringify(hasPerangkat || {})}

Dokumen RPM yang dinilai:
${JSON.stringify(rpm).slice(0, 18000)}`;

      const schema = {
        type: Type.OBJECT,
        properties: {
          predikat: { type: Type.STRING },
          ringkasan: { type: Type.STRING },
          aspekEvaluasi: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                kode: { type: Type.STRING },
                aspek: { type: Type.STRING },
                status: { type: Type.STRING },
                catatan: { type: Type.STRING },
              },
              required: ['kode', 'aspek', 'status', 'catatan'],
            },
          },
          rekomendasiPerbaikan: { type: Type.ARRAY, items: { type: Type.STRING } },
          peringatanVerifikasiCP: { type: Type.STRING },
        },
        required: [
          'predikat',
          'ringkasan',
          'aspekEvaluasi',
          'rekomendasiPerbaikan',
          'peringatanVerifikasiCP',
        ],
      };

      const rawReport = await generateStructuredJson<Record<string, unknown>>({
        systemInstruction: SYSTEM_PROMPT_QUALITY_CONTROL,
        userPrompt,
        responseSchema: schema,
      });

      const report = validateQualityReport(rawReport);
      return res.json({ report });
    } catch (err) {
      return handleRouteError(res, err);
    }
  });

  // 9. POST /api/revise-rpm (AI Revision Engine)
  router.post('/revise-rpm', async (req, res) => {
    try {
      const { rpm, targetSection, instruction, pakIntegration, lkpd, lessonPlanId } =
        (req.body || {}) as {
          rpm?: RpmCoreContent;
          targetSection?: string;
          instruction?: string;
          pakIntegration?: PakIntegrationRecord | null;
          lkpd?: LkpdKit | null;
          lessonPlanId?: string;
        };
      if (!rpm) {
        return res.status(400).json({ error: 'Dokumen RPM wajib disertakan untuk revisi.' });
      }

      const cleanInstruction = sanitizeString(instruction, 1500);
      if (!cleanInstruction) {
        return res.status(400).json({ error: 'Silakan tulis instruksi revisi yang diinginkan.' });
      }

      const targetLabel = sanitizeString(targetSection, 60, 'all');
      const pakNote =
        pakIntegration && pakIntegration.applied && !pakIntegration.ignored
          ? `\nKonteks PAK aktif pada RPM: ${pakIntegration.elements.map((e) => e.nama).join(', ')} (${pakIntegration.nilaiAntikorupsi.join(', ')}). Pertahankan keselarasan nilai ini jika relevan.`
          : '';

      const userPrompt = `Lakukan revisi pada dokumen RPM berikut.
Target Bagian yang Diminta Guru: "${targetLabel}"
Instruksi Khusus Guru: "${cleanInstruction}"${pakNote}

ATURAN:
- Utamakan hanya mengubah bagian "${targetLabel}" (kecuali penyesuaian kecil pada bagian lain memang diperlukan agar konsisten).
- Kembalikan dokumen RPM lengkap dalam format JSON yang persis sesuai skema.

Dokumen RPM Sebelum Revisi:
${JSON.stringify(rpm).slice(0, 18000)}`;

      const rawRevised = await generateStructuredJson<Record<string, unknown>>({
        systemInstruction: SYSTEM_PROMPT_REVISION_ENGINE,
        userPrompt,
        responseSchema: rpmCoreResponseSchema,
      });

      const revised = validateAndNormalizeRpmCore(rawRevised, rpm);
      let reconciledLkpd: LkpdKit | undefined;
      let crossValidation: CrossDocumentValidationResult | undefined;

      if (lkpd) {
        const resValidation = validateAndReconcileCrossDocument(
          revised,
          lkpd,
          pakIntegration,
          lessonPlanId || '',
          'reconcile_lkpd_to_rpm',
        );
        reconciledLkpd = resValidation.lkpd;
        crossValidation = resValidation.validation;
      }

      return res.json({
        rpm: revised,
        ...(reconciledLkpd ? { lkpd: reconciledLkpd } : {}),
        ...(crossValidation ? { crossValidation } : {}),
      });
    } catch (err) {
      return handleRouteError(res, err);
    }
  });

  // 10. POST /api/suggest-field (Manual editor & Auto generator field recommendations)
  router.post('/suggest-field', async (req, res) => {
    try {
      const { fieldName, currentContext, currentValue } = (req.body || {}) as {
        fieldName?: string;
        currentContext?: Record<string, string>;
        currentValue?: string;
      };

      const cleanField = sanitizeString(fieldName, 100);
      if (!cleanField) {
        return res.status(400).json({ error: 'Nama bagian yang diminta wajib diisi.' });
      }

      const userPrompt = `Berikan rekomendasi isi atau perbaikan terbaik untuk bagian RPM: "${cleanField}".
Konteks Pembelajaran:
${JSON.stringify(currentContext || {}).slice(0, 3000)}
Isi Saat Ini:
${sanitizeString(currentValue, 1500) || '(Masih kosong)'}

Berikan 1 rumusan utama yang langsung siap pakai ("suggestion") dan catatan singkat alasan pedagogisnya ("rationale").`;

      const schema = {
        type: Type.OBJECT,
        properties: {
          suggestion: { type: Type.STRING },
          items: { type: Type.ARRAY, items: { type: Type.STRING } },
          rationale: { type: Type.STRING },
        },
        required: ['suggestion', 'rationale'],
      };

      const result = await generateStructuredJson({
        systemInstruction: SYSTEM_PROMPT_FIELD_ADVISOR,
        userPrompt,
        responseSchema: schema,
      });

      return res.json(result);
    } catch (err) {
      return handleRouteError(res, err);
    }
  });

  // 11. POST /api/pak/auto-detect (AI Auto-Detect & Integrasi Pendidikan Antikorupsi)
  router.post('/pak/auto-detect', async (req, res) => {
    try {
      const body = (req.body || {}) as Partial<PakAutoDetectInput>;
      const mataPelajaran = sanitizeString(body.mataPelajaran, 150);
      const materi = sanitizeString(body.materi, 400);

      if (!mataPelajaran || !materi) {
        return res.status(400).json({
          error: 'Mata pelajaran dan materi pembelajaran diperlukan untuk analisis AI Auto-Detect PAK.',
          code: 'MISSING_CONTEXT',
        });
      }

      const kelas = sanitizeString(body.kelas, 50, 'Kelas 5');
      const fase = body.fase === 'A' || body.fase === 'B' || body.fase === 'C' ? body.fase : 'C';
      const cp = sanitizeString(body.capaianPembelajaran, 1500);
      const tp = sanitizeString(body.tujuanPembelajaran, 1500);
      const karakteristik = sanitizeString(body.karakteristikPesertaDidik, 1000);
      const aktivitas = sanitizeString(body.aktivitasPembelajaran, 1500);
      const model = sanitizeString(body.modelPembelajaran, 150);
      const metode = sanitizeString(body.metodePembelajaran, 300);
      const lingkungan = sanitizeString(body.lingkunganPembelajaran, 400);
      const regenerationNote = sanitizeString(body.regenerationNote, 500);
      const lessonPlanId = sanitizeString(body.lessonPlanId, 100, '');

      const userPrompt = buildPakDetectPrompt({
        mataPelajaran,
        kelas,
        fase,
        materi,
        cp,
        tp,
        karakteristik,
        aktivitas,
        model,
        metode,
        lingkungan,
        regenerationNote,
      });

      const rawPak = await generateStructuredJson<Record<string, unknown>>({
        systemInstruction: SYSTEM_PROMPT_PAK_AUTODETECT,
        userPrompt,
        responseSchema: pakAutoDetectSchema,
        thinkingLevel: ThinkingLevel.LOW,
      });

      const pakIntegration = validateAndNormalizePakIntegration(rawPak, lessonPlanId);
      return res.json({ pakIntegration });
    } catch (err) {
      return handleRouteError(res, err);
    }
  });

  return router;
}
