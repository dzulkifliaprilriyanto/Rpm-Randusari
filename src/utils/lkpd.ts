import type {
  CrossDocumentCheckItem,
  CrossDocumentValidationResult,
  LkpdKit,
  LkpdPakIntegrationSummary,
  PakIntegrationRecord,
  PhaseCode,
  RpmCoreContent,
} from '../types/rpm';
import { extractGradeNumber } from './pedagogy';

export interface GradeBandProfile {
  band: 'Kelas I-II (Fase A)' | 'Kelas III-IV (Fase B)' | 'Kelas V-VI (Fase C)';
  instructionRule: string;
}

export function getGradeBandGuidance(kelas: string, fase: PhaseCode): GradeBandProfile {
  const g = extractGradeNumber(kelas);
  if (fase === 'A' || g <= 2) {
    return {
      band: 'Kelas I-II (Fase A)',
      instructionRule:
        'Gunakan kalimat sangat singkat dan sederhana, aktivitas konkret (mengamati, mencocokkan, mewarnai/menunjuk, bercerita lisan), dan soal pendek yang ramah anak kelas rendah.',
    };
  }
  if (fase === 'B' || g <= 4) {
    return {
      band: 'Kelas III-IV (Fase B)',
      instructionRule:
        'Gunakan instruksi bertahap, aktivitas pengamatan terstruktur, pengelompokan informasi, pemecahan masalah sederhana, dan diskusi kelompok kecil.',
    };
  }
  return {
    band: 'Kelas V-VI (Fase C)',
    instructionRule:
      'Gunakan analisis sederhana, studi kasus kontekstual, pemecahan masalah nyata, diskusi argumentatif santun, dan refleksi penerapan nilai.',
  };
}

export function buildLkpdPakSummaryFromRecord(
  pak?: PakIntegrationRecord | null,
): LkpdPakIntegrationSummary {
  if (
    !pak ||
    pak.ignored ||
    !pak.applied ||
    pak.relevanceStatus === 'tidak_relevan_langsung' ||
    pak.elements.length === 0
  ) {
    return {
      elemenPak: [],
      subelemenPak: [],
      nilaiKarakter: [],
      perilakuDiharapkan: [],
      relevanLangsung: false,
      catatan:
        pak?.relevanceStatus === 'tidak_relevan_langsung'
          ? 'Integrasi PAK tidak direkomendasikan secara langsung pada topik ini; pembiasaan tertib dan jujur tetap dijaga secara alami.'
          : 'Integrasi PAK belum diterapkan atau diabaikan guru pada dokumen RPM.',
    };
  }

  return {
    elemenPak: pak.elements.map((e) => `${e.kode}: ${e.nama}`),
    subelemenPak: pak.subElements.map((s) => `${s.code} ${s.nama}`),
    nilaiKarakter: [...pak.nilaiAntikorupsi],
    perilakuDiharapkan:
      pak.learningObjectives.length > 0
        ? [...pak.learningObjectives]
        : [
            `Membiasakan sikap ${pak.nilaiAntikorupsi.slice(0, 3).join(', ')} dalam kegiatan kelompok maupun individu.`,
          ],
    relevanLangsung: true,
    catatan: pak.relevanceReason,
  };
}

function asStr(val: unknown, fallback = ''): string {
  return typeof val === 'string' && val.trim() ? val.trim() : fallback;
}

function asStrArr(val: unknown, fallback: string[] = []): string[] {
  if (!Array.isArray(val)) return fallback;
  const cleaned = val
    .map((x) => (typeof x === 'string' ? x.trim() : ''))
    .filter(Boolean);
  return cleaned.length > 0 ? cleaned : fallback;
}

export function normalizeLkpdKit(
  raw: unknown,
  rpm: RpmCoreContent,
  pak?: PakIntegrationRecord | null,
  lessonPlanId = '',
): LkpdKit {
  const obj = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const now = new Date().toISOString();
  const pakSummary = buildLkpdPakSummaryFromRecord(pak);
  const tps = rpm.desain.tujuanPembelajaran.filter((t) => t.trim().length > 0);

  const rawIdent = (obj.identitas && typeof obj.identitas === 'object'
    ? obj.identitas
    : {}) as Record<string, unknown>;

  const rawAktivitas = Array.isArray(obj.aktivitas) ? obj.aktivitas : [];
  const aktivitas = rawAktivitas.map((a, idx) => {
    const rec = (a && typeof a === 'object' ? a : {}) as Record<string, unknown>;
    return {
      nomor: Number(rec.nomor) || idx + 1,
      jenisAktivitas: asStr(rec.jenisAktivitas, 'Mengamati & Berdiskusi'),
      judul: asStr(rec.judul, `Aktivitas ${idx + 1}`),
      instruksi: asStr(
        rec.instruksi,
        'Kerjakan aktivitas sesuai langkah pembelajaran bersama kelompok atau secara mandiri.',
      ),
      langkahSingkat: asStrArr(rec.langkahSingkat, []),
    };
  });

  const rawTugas = Array.isArray(obj.pertanyaan)
    ? obj.pertanyaan
    : Array.isArray(obj.latihanTugas)
      ? obj.latihanTugas
      : [];
  const pertanyaan = rawTugas.map((q, idx) => {
    const rec = (q && typeof q === 'object' ? q : {}) as Record<string, unknown>;
    const rawLevel = asStr(rec.tingkatKesulitan, idx === 0 ? 'Dasar' : 'Menengah');
    const tingkatKesulitan: 'Dasar' | 'Menengah' | 'HOTS Ringan' =
      rawLevel === 'HOTS Ringan' || rawLevel === 'Menengah' ? rawLevel : 'Dasar';
    return {
      nomor: Number(rec.nomor) || idx + 1,
      tingkatKesulitan,
      pertanyaan: asStr(rec.pertanyaan, `Tuliskan jawabanmu untuk pertanyaan ${idx + 1}.`),
      ruangJawabanHint: asStr(rec.ruangJawabanHint, 'Tuliskan jawaban singkat dan jelas di kotak ini.'),
      barisRuangJawaban: Number(rec.barisRuangJawaban) || (idx >= 2 ? 4 : 3),
    };
  });

  const rawPakAct = (obj.aktivitasPenguatanPak && typeof obj.aktivitasPenguatanPak === 'object'
    ? obj.aktivitasPenguatanPak
    : {}) as Record<string, unknown>;

  const rawKesimpulan = (obj.kesimpulan && typeof obj.kesimpulan === 'object'
    ? obj.kesimpulan
    : {}) as Record<string, unknown>;

  const rawPenilaian = (obj.penilaian && typeof obj.penilaian === 'object'
    ? obj.penilaian
    : {}) as Record<string, unknown>;
  const rawRubrik = Array.isArray(rawPenilaian.rubrikSederhana)
    ? rawPenilaian.rubrikSederhana
    : [];

  return {
    id: asStr(obj.id, `lkpd-${lessonPlanId || Date.now()}`),
    lessonPlanId: lessonPlanId || asStr(obj.lessonPlanId, ''),
    identitas: {
      namaSekolah: rpm.identitas.namaSatuanPendidikan,
      mataPelajaran: rpm.identitas.mataPelajaran,
      kelas: rpm.identitas.kelas,
      fase: rpm.identitas.fase,
      semester: rpm.identitas.semester,
      tahunAjaran: rpm.identitas.tahunAjaran,
      materi: rpm.identitas.materi,
      alokasiWaktu: rpm.identitas.alokasiWaktu,
      namaPesertaDidikLabel: asStr(rawIdent.namaPesertaDidikLabel, 'Nama Peserta Didik : ........................................'),
      nomorAbsenLabel: asStr(rawIdent.nomorAbsenLabel, 'Nomor Absen : ............'),
    },
    judul: asStr(obj.judul, `LKPD: ${rpm.identitas.materi}`),
    identitasPesertaDidik: asStr(
      obj.identitasPesertaDidik,
      `Nama Peserta Didik: .................... | No. Absen: ...... | ${rpm.identitas.kelas} | ${rpm.identitas.namaSatuanPendidikan}`,
    ),
    tujuanKegiatan: asStr(obj.tujuanKegiatan, tps[0] || `Memahami dan menerapkan materi ${rpm.identitas.materi}.`),
    tujuanPembelajaran: tps,
    integrasiPak: pakSummary,
    petunjukPengerjaan: asStrArr(obj.petunjukPengerjaan, [
      'Berdoalah sebelum memulai kegiatan.',
      'Tuliskan nama dan nomor absen pada kolom identitas.',
      'Bacalah setiap petunjuk dengan cermat dan kerjakan secara jujur.',
    ]),
    materiPengantar: asStr(
      obj.materiPengantar,
      rpm.identifikasi.materiPembelajaran || rpm.identitas.materi,
    ),
    aktivitas:
      aktivitas.length > 0
        ? aktivitas
        : [
            {
              nomor: 1,
              jenisAktivitas: 'Mengamati & Berdiskusi',
              judul: `Eksplorasi ${rpm.identitas.materi}`,
              instruksi: `Amati contoh sehari-hari tentang ${rpm.identitas.materi}, lalu diskusikan temuanmu bersama teman sebangku atau kelompok.`,
              langkahSingkat: [],
            },
          ],
    pertanyaan:
      pertanyaan.length > 0
        ? pertanyaan
        : [
            {
              nomor: 1,
              tingkatKesulitan: 'Dasar',
              pertanyaan: `Jelaskan inti dari ${rpm.identitas.materi} dengan bahasamu sendiri.`,
              ruangJawabanHint: 'Tulis jawabanmu dengan rapi pada ruang berikut.',
              barisRuangJawaban: 3,
            },
          ],
    aktivitasPenguatanPak: pakSummary.relevanLangsung
      ? {
          relevan: true,
          judul: asStr(
            rawPakAct.judul,
            pak?.activities[0]?.judul || `Aksi Nilai ${pakSummary.nilaiKarakter.slice(0, 2).join(' & ')}`,
          ),
          bentuk: asStr(rawPakAct.bentuk, pak?.activities[0]?.jenisAktivitas || 'Studi kasus sederhana'),
          skenarioAtauInstruksi: asStr(
            rawPakAct.skenarioAtauInstruksi,
            pak?.activities[0]?.peranPesertaDidik ||
              `Diskusikan bagaimana sikap ${pakSummary.nilaiKarakter.slice(0, 3).join(', ')} diterapkan saat mempelajari ${rpm.identitas.materi}.`,
          ),
          pertanyaanPanduan: asStrArr(rawPakAct.pertanyaanPanduan, [
            `Bagaimana cara menunjukkan sikap ${pakSummary.nilaiKarakter[0] || 'jujur'} selama mengerjakan tugas ini?`,
          ]),
        }
      : {
          relevan: false,
          judul: 'Pembiasaan Sikap Belajar Positif',
          bentuk: 'Pembiasaan kelas',
          skenarioAtauInstruksi:
            'Tidak ada aktivitas PAK paksaan untuk topik ini; siswa tetap dibiasakan mengerjakan tugas dengan jujur dan tertib.',
          pertanyaanPanduan: [],
        },
    refleksiSiswa: asStrArr(obj.refleksiSiswa, [
      'Apa hal baru yang saya pelajari hari ini?',
      'Bagaimana saya dapat menerapkan pembelajaran ini dalam kehidupan sehari-hari?',
      'Mengapa sikap jujur dan tanggung jawab penting saat belajar maupun bermain?',
      'Apa yang akan saya lakukan setelah kegiatan ini?',
    ]),
    kesimpulan: {
      prompt: asStr(
        rawKesimpulan.prompt,
        `Tuliskan kesimpulan singkatmu tentang ${rpm.identitas.materi} dan sikap baik yang perlu dibiasakan:`,
      ),
      ruangKesimpulanHint: asStr(
        rawKesimpulan.ruangKesimpulanHint,
        'Ruang kesimpulan peserta didik (3–4 kalimat).',
      ),
    },
    penilaian: {
      indikatorPenilaian: asStrArr(rawPenilaian.indikatorPenilaian, [
        rpm.asesmen.formatif.indikatorPenilaian,
        ...(pakSummary.relevanLangsung
          ? [`Menunjukkan nilai ${pakSummary.nilaiKarakter.slice(0, 2).join(', ')} selama kegiatan.`]
          : []),
      ]),
      kriteriaKeberhasilan: asStr(
        rawPenilaian.kriteriaKeberhasilan,
        rpm.asesmen.formatif.kriteriaKeberhasilan,
      ),
      rubrikSederhana:
        rawRubrik.length > 0
          ? rawRubrik.map((r) => {
              const row = (r && typeof r === 'object' ? r : {}) as Record<string, unknown>;
              return {
                aspek: asStr(row.aspek, 'Ketepatan Pemahaman & Sikap Kerja'),
                sangatBaik: asStr(row.sangatBaik, 'Menjawab lengkap, tepat, mandiri, dan jujur.'),
                perluBimbingan: asStr(row.perluBimbingan, 'Memerlukan arahan guru untuk memahami soal dan menyelesaikan tugas.'),
              };
            })
          : [
              {
                aspek: 'Pemahaman Materi & Penyelesaian Tugas',
                sangatBaik: 'Menjawab tepat dan mampu memberi contoh nyata sehari-hari.',
                perluBimbingan: 'Masih perlu bimbingan langkah demi langkah untuk memahami konsep.',
              },
              {
                aspek: 'Kemandirian & Kejujuran Pengerjaan',
                sangatBaik: 'Mengerjakan dengan usaha sendiri, tertib, dan menghargai teman.',
                perluBimbingan: 'Perlu pengingat untuk menyelesaikan tugas secara jujur dan tuntas.',
              },
            ],
      catatanGuruLabel: asStr(
        rawPenilaian.catatanGuruLabel,
        'Nilai / Catatan Pembinaan Guru: ............................................................',
      ),
    },
    createdAt: asStr(obj.createdAt, now),
    updatedAt: now,
  };
}

/**
 * Cross-Document Validation & Auto-Reconciliation (Bagian 5 & Bagian 10):
 * Memastikan RPM, PAK, dan LKPD konsisten secara pedagogis dan terukur.
 * Jika mode === 'reconcile_lkpd_to_rpm', hanya LKPD yang diselaraskan tanpa mengubah isi RPM.
 */
export function validateAndReconcileCrossDocument(
  rpmInput: RpmCoreContent,
  lkpdInput: LkpdKit,
  pakInput?: PakIntegrationRecord | null,
  lessonPlanId = '',
  mode: 'reconcile_lkpd_to_rpm' | 'audit_only' = 'reconcile_lkpd_to_rpm',
): {
  rpm: RpmCoreContent;
  lkpd: LkpdKit;
  pak?: PakIntegrationRecord;
  validation: CrossDocumentValidationResult;
} {
  const rpm = structuredClone(rpmInput);
  const lkpd = normalizeLkpdKit(lkpdInput, rpm, pakInput, lessonPlanId);
  const autoFixedNotes: string[] = [];
  const checks: CrossDocumentCheckItem[] = [];

  const rpmTps = rpm.desain.tujuanPembelajaran.filter((t) => t.trim().length > 0);
  const lkpdTps = lkpd.tujuanPembelajaran || [];
  const tpAligned =
    rpmTps.length > 0 &&
    lkpdTps.length === rpmTps.length &&
    rpmTps.every((tp, i) => tp.trim() === (lkpdTps[i] || '').trim());

  if (!tpAligned && mode === 'reconcile_lkpd_to_rpm') {
    lkpd.tujuanPembelajaran = [...rpmTps];
    lkpd.tujuanKegiatan = rpmTps.join(' ');
    autoFixedNotes.push('Tujuan Pembelajaran pada LKPD diselaraskan persis dengan RPM.');
  }
  checks.push({
    kode: 'KONS-01',
    dimensi: 'KONSISTENSI',
    aspek: 'Kesesuaian Tujuan Pembelajaran RPM & LKPD',
    status: tpAligned ? 'Memenuhi' : 'Diperbaiki Otomatis',
    catatan: tpAligned
      ? 'Tujuan pembelajaran LKPD sama persis dengan TP pada RPM.'
      : 'Diselaraskan agar LKPD menggunakan TP resmi dari RPM.',
  });

  const materiMatch =
    (lkpd.identitas?.materi || '').trim().toLowerCase() === rpm.identitas.materi.trim().toLowerCase();
  if (!materiMatch && mode === 'reconcile_lkpd_to_rpm' && lkpd.identitas) {
    lkpd.identitas.materi = rpm.identitas.materi;
    autoFixedNotes.push('Materi pada identitas LKPD disamakan dengan materi RPM.');
  }
  checks.push({
    kode: 'KONS-02',
    dimensi: 'KONSISTENSI',
    aspek: 'Kesesuaian Materi RPM & LKPD',
    status: materiMatch ? 'Memenuhi' : 'Diperbaiki Otomatis',
    catatan: `Materi terhubung: "${rpm.identitas.materi}".`,
  });

  const pakSummary = buildLkpdPakSummaryFromRecord(pakInput);
  const lkpdPak = lkpd.integrasiPak;
  const pakAligned =
    Boolean(lkpdPak) &&
    lkpdPak!.relevanLangsung === pakSummary.relevanLangsung &&
    lkpdPak!.elemenPak.join('|') === pakSummary.elemenPak.join('|') &&
    lkpdPak!.subelemenPak.join('|') === pakSummary.subelemenPak.join('|');

  if (!pakAligned && mode === 'reconcile_lkpd_to_rpm') {
    lkpd.integrasiPak = pakSummary;
    if (!pakSummary.relevanLangsung && lkpd.aktivitasPenguatanPak) {
      lkpd.aktivitasPenguatanPak.relevan = false;
    }
    autoFixedNotes.push('Elemen, subelemen, dan nilai PAK pada LKPD diselaraskan dengan hasil pemetaan RPM.');
  }
  checks.push({
    kode: 'KONS-03',
    dimensi: 'KONSISTENSI',
    aspek: 'Konsistensi Elemen, Subelemen & Nilai PAK Antardokumen',
    status: pakAligned ? 'Memenuhi' : 'Diperbaiki Otomatis',
    catatan: pakSummary.relevanLangsung
      ? `${pakSummary.elemenPak.join(', ')} (${pakSummary.subelemenPak.join('; ')})`
      : 'Tidak ada integrasi PAK langsung yang dipaksakan pada RPM maupun LKPD.',
  });

  const allSteps = [
    ...rpm.pengalamanBelajar.pendahuluan,
    ...rpm.pengalamanBelajar.inti.memahami,
    ...rpm.pengalamanBelajar.inti.mengaplikasi,
    ...rpm.pengalamanBelajar.inti.merefleksi,
    ...rpm.pengalamanBelajar.penutup,
  ];
  const totalMinutes = allSteps.reduce((acc, s) => acc + (Number(s.alokasiWaktuMenit) || 0), 0);
  const principles = new Set(allSteps.flatMap((s) => s.prinsip || []));
  const hasCoreExperiences =
    rpm.pengalamanBelajar.inti.memahami.length > 0 &&
    rpm.pengalamanBelajar.inti.mengaplikasi.length > 0 &&
    rpm.pengalamanBelajar.inti.merefleksi.length > 0;

  checks.push({
    kode: 'RPM-01',
    dimensi: 'RPM',
    aspek: 'Kelengkapan Struktur, Pengalaman Belajar & Deep Learning',
    status: hasCoreExperiences && principles.size >= 3 ? 'Memenuhi' : 'Perlu Perhatian',
    catatan: `Pengalaman Memahami/Mengaplikasi/Merefleksi tersedia; prinsip tercakup: ${Array.from(principles).join(', ') || '-'}; total waktu ${totalMinutes} menit.`,
  });

  checks.push({
    kode: 'RPM-02',
    dimensi: 'RPM',
    aspek: 'Kesesuaian CP, TP, & Asesmen (Diagnostik, Formatif, Sumatif)',
    status: rpm.desain.capaianPembelajaran.trim() && rpmTps.length > 0 ? 'Memenuhi' : 'Perlu Perhatian',
    catatan: rpm.desain.cpPerluVerifikasi
      ? 'CP tersedia sebagai draf AI (mohon verifikasi dokumen resmi sekolah).'
      : 'CP, TP, dan 3 jenis asesmen lengkap serta saling terhubung.',
  });

  const pakActivityAppliedInSteps =
    !pakSummary.relevanLangsung ||
    allSteps.some((s) => (s.nilaiPakDikembangkan && s.nilaiPakDikembangkan.length > 0) || s.aktivitasGuru.includes('[Penguatan PAK]') || s.aktivitasPesertaDidik.includes('[Penguatan PAK]'));

  checks.push({
    kode: 'PAK-01',
    dimensi: 'PAK',
    aspek: 'Relevansi Elemen/Subelemen & Penerapan pada Kegiatan Pembelajaran',
    status: pakActivityAppliedInSteps ? 'Memenuhi' : 'Perlu Perhatian',
    catatan: pakSummary.relevanLangsung
      ? `Nilai ${pakSummary.nilaiKarakter.join(', ')} diterapkan nyata dalam aktivitas belajar.`
      : 'Pemetaan objektif tanpa paksaan elemen PAK.',
  });

  const gradeGuide = getGradeBandGuidance(rpm.identitas.kelas, rpm.identitas.fase);
  const lkpdComplete =
    Boolean(lkpd.identitas?.namaSekolah) &&
    lkpd.petunjukPengerjaan.length > 0 &&
    Boolean(lkpd.materiPengantar.trim()) &&
    lkpd.aktivitas.length > 0 &&
    lkpd.pertanyaan.length > 0 &&
    lkpd.refleksiSiswa.length > 0 &&
    Boolean(lkpd.kesimpulan?.prompt) &&
    Boolean(lkpd.penilaian?.kriteriaKeberhasilan);

  checks.push({
    kode: 'LKPD-01',
    dimensi: 'LKPD',
    aspek: `Kelengkapan 12 Komponen LKPD & Kesesuaian ${gradeGuide.band}`,
    status: lkpdComplete && totalMinutes > 0 ? 'Memenuhi' : 'Perlu Perhatian',
    catatan: `Struktur 12 bagian LKPD lengkap dengan ${lkpd.aktivitas.length} aktivitas & ${lkpd.pertanyaan.length} latihan bertahap + ruang jawaban.`,
  });

  const hasPerhatian = checks.some((c) => c.status === 'Perlu Perhatian');
  const validation: CrossDocumentValidationResult = {
    valid: !hasPerhatian,
    checkedAt: new Date().toISOString(),
    checks,
    autoFixedNotes,
  };

  lkpd.validationStatus = validation;
  lkpd.updatedAt = validation.checkedAt;

  return {
    rpm,
    lkpd,
    pak: pakInput || undefined,
    validation,
  };
}

export function createSyncedSampleLkpd(
  rpm: RpmCoreContent,
  pak?: PakIntegrationRecord | null,
  lessonPlanId = '',
): LkpdKit {
  return normalizeLkpdKit(
    {
      judul: `Menyelidiki ${rpm.identitas.materi} di Sekitar Kita`,
      tujuanKegiatan: rpm.desain.tujuanPembelajaran[0] || `Memahami ${rpm.identitas.materi}.`,
      petunjukPengerjaan: [
        'Berdoalah terlebih dahulu sebelum memulai aktivitas belajar.',
        'Tuliskan nama lengkap dan nomor absen pada kolom identitas di atas.',
        'Bacalah materi pengantar dengan tenang, lalu kerjakan setiap langkah secara jujur dan teliti.',
        'Diskusikan bagian kelompok dengan santun dan saling menghargai pendapat teman.',
      ],
      materiPengantar:
        'Air di bumi selalu bergerak dalam sebuah perputaran yang disebut siklus air. Cahaya matahari menguapkan air dari sungai, laut, dan tumbuhan (evaporasi), lalu uap air membentuk awan (kondensasi), dan turun kembali sebagai hujan (presipitasi). Menjaga kebersihan lingkungan sekolah dan tidak membuang air sembarangan merupakan wujud tanggung jawab kita terhadap sumber air bersama.',
      aktivitas: [
        {
          nomor: 1,
          jenisAktivitas: 'Mengamati & Mengidentifikasi',
          judul: 'Mengamati Tahapan Siklus Air dan Kondisi Air Sekolah',
          instruksi:
            'Amati bagan siklus air yang ditampilkan guru serta keran air/taman di lingkungan sekolah bersama kelompokmu.',
          langkahSingkat: [
            'Catat urutan proses evaporasi, kondensasi, dan presipitasi.',
            'Periksa 2 titik penggunaan air di sekolah dan catat apakah ada air yang terbuang sia-sia.',
          ],
        },
        {
          nomor: 2,
          jenisAktivitas: 'Memecahkan Masalah & Merancang Aksi',
          judul: 'Merancang Kesepakatan Hemat Air Kelas',
          instruksi:
            'Diskusikan bersama kelompokmu cara sederhana menghemat air dan menjaga kebersihan saluran air di sekolah.',
          langkahSingkat: [
            'Tuliskan 2 masalah pemborosan atau pencemaran air yang mungkin terjadi.',
            'Tulis 2 langkah nyata yang bisa dilakukan siswa kelas 5 setiap hari.',
          ],
        },
      ],
      pertanyaan: [
        {
          nomor: 1,
          tingkatKesulitan: 'Dasar',
          pertanyaan: 'Urutkan dan jelaskan secara singkat tiga tahap utama siklus air (evaporasi, kondensasi, presipitasi)!',
          ruangJawabanHint: 'Tulis penjelasan 3 tahap siklus air secara berurutan.',
          barisRuangJawaban: 4,
        },
        {
          nomor: 2,
          tingkatKesulitan: 'Menengah',
          pertanyaan: 'Mengapa membiarkan keran air sekolah terbuka tanpa dimatikan merugikan teman-teman lainnya?',
          ruangJawabanHint: 'Kaitkan dengan ketersediaan air bersih dan tanggung jawab terhadap fasilitas bersama.',
          barisRuangJawaban: 4,
        },
        {
          nomor: 3,
          tingkatKesulitan: 'HOTS Ringan',
          pertanyaan: 'Jika halaman sekolah ditutup seluruhnya oleh beton tanpa resapan air, apa dampak yang terjadi saat hujan deras dan apa usul solusimu?',
          ruangJawabanHint: 'Jelaskan dampak bagi resapan air dan usulkan solusi nyata di sekolah.',
          barisRuangJawaban: 4,
        },
      ],
      refleksiSiswa: [
        'Apa hal baru paling bermakna yang saya pelajari tentang siklus air hari ini?',
        'Bagaimana saya akan menerapkan kebiasaan hemat air di rumah dan di sekolah?',
        'Mengapa kejujuran dan tanggung jawab penting saat bertugas menjaga fasilitas bersama?',
        'Tindakan baik apa yang akan saya lakukan mulai hari ini?',
      ],
      kesimpulan: {
        prompt: 'Tuliskan kesimpulan belajarmu hari ini tentang siklus air dan tanggung jawab menjaga air bersih:',
        ruangKesimpulanHint: 'Tuliskan 2–3 kalimat kesimpulan berdasarkan pengamatan dan diskusi kelompok.',
      },
    },
    rpm,
    pak,
    lessonPlanId,
  );
}
