import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  applyPakIntegrationToRpmCore,
  formatPakRelevanceLabel,
  hasMinimumPakDetectContext,
  PAK_CORE_VALUES,
  PAK_ELEMENTS_FRAMEWORK,
  PAK_OFFICIAL_REFERENCES,
  PAK_VALIDATION_CRITERIA,
  stripPakIntegrationFromRpmCore,
} from './pak';
import { createDefaultProfile, createDefaultRpmCore } from './pedagogy';
import type { PakIntegrationRecord } from '../types/rpm';

function makeSamplePakRecord(overrides: Partial<PakIntegrationRecord> = {}): PakIntegrationRecord {
  return {
    id: 'pak-test-1',
    lessonPlanId: 'rpm-test-1',
    elements: [
      {
        id: 'elemen_1',
        kode: 'ELEMEN 1',
        nama: 'Ketaatan pada Aturan',
        peran: 'utama',
      },
    ],
    subElements: [
      {
        code: '1.1',
        elemenId: 'elemen_1',
        nama: 'Kesadaran pentingnya taat aturan',
      },
    ],
    nilaiAntikorupsi: ['Jujur', 'Disiplin'],
    relevanceStatus: 'sangat_relevan',
    relevanceLabel: 'Sangat Relevan',
    relevanceReason: 'Topik membahas aturan dan tanggung jawab bersama di kelas.',
    alternatifPenguatan: 'Pembiasaan tertib dalam kelompok.',
    learningObjectives: ['Membiasakan mematuhi kesepakatan kelompok saat praktik.'],
    materials: [
      {
        namaMateri: 'Jujur Mengikuti Aturan Kelompok',
        elemen: 'Ketaatan pada Aturan',
        subelemen: 'Kesadaran pentingnya taat aturan',
        nilaiAntikorupsi: ['Jujur', 'Disiplin'],
        tujuanPenguatanKarakter: 'Membiasakan kepatuhan terhadap kesepakatan.',
        penjelasanMateri: 'Kepatuhan pada aturan membuat kerja kelompok adil untuk semua.',
        contohPenerapan: ['Mengembalikan alat ukur setelah selesai'],
        aktivitasPesertaDidik: 'Membuat kesepakatan kelompok sebelum praktik.',
        pertanyaanPemantik: ['Mengapa kita perlu jujur mencatat hasil pengamatan?'],
        asesmenRingkas: 'Observasi kepatuhan kelompok.',
        indikatorKeberhasilan: ['Mencatat data apa adanya'],
        isAiGenerated: true,
      },
    ],
    activities: [
      {
        jenisAktivitas: 'Kesepakatan kelas berintegritas',
        judul: 'Janji Peneliti Jujur',
        tujuan: 'Melatih kejujuran data pengamatan.',
        elemenPak: 'Ketaatan pada Aturan',
        subelemenPak: 'Kesadaran pentingnya taat aturan',
        prinsipPembelajaranMendalam: ['Mindful', 'Meaningful'],
        langkahKegiatan: ['Menyusun aturan main kelompok', 'Mencatat hasil tanpa mengubah angka'],
        peranGuru: 'Mendampingi refleksi kelompok',
        peranPesertaDidik: 'Menjalankan peran sesuai kesepakatan',
        alokasiWaktuMenit: 10,
        indikatorKeberhasilan: 'Data kelompok sesuai hasil pengamatan nyata',
      },
    ],
    assessments: {
      pengetahuan: {
        fokus: ['Pemahaman manfaat aturan'],
        bentukInstrumen: 'Tanya jawab singkat',
        indikator: ['Menjelaskan alasan pentingnya taat aturan'],
      },
      sikapPerilaku: {
        nilaiDiamati: ['Jujur', 'Disiplin'],
        teknikObservasi: 'Lembar observasi guru',
        indikator: ['Tidak mengubah hasil kelompok lain'],
      },
      praktik: {
        bentukPraktik: ['Praktik pembagian tugas adil'],
        kriteriaPengamatan: 'Kepatuhan terhadap peran kelompok',
        indikator: ['Menjalankan tugas tepat waktu'],
      },
      rubrikPerkembangan: [
        {
          aspek: 'Kejujuran & Kepatuhan Aturan',
          sangatBerkembang: 'Konsisten taat aturan dan mengingatkan teman dengan santun.',
          berkembangSesuaiHarapan: 'Menjalankan kesepakatan kelompok dengan mandiri.',
          mulaiBerkembang: 'Menjalankan kesepakatan setelah diingatkan guru.',
          memerlukanBimbingan: 'Perlu pendampingan guru untuk memahami aturan kelompok.',
        },
      ],
      catatanPembinaanNonLabeling: 'Pembinaan positif tanpa memberi label.',
    },
    refleksiIntegritas: ['Apakah saya sudah mencatat hasil belajar dengan jujur hari ini?'],
    integrasiRpmRingkasan: {
      identifikasiKarakter: 'Penguatan karakter Jujur dan Disiplin.',
      desainKarakter: 'Kesepakatan kelompok.',
      pengalamanMemahami: 'Guru mengaitkan aturan praktik dengan kejujuran.',
      pengalamanMengaplikasi: 'Siswa mencatat hasil pengamatan secara jujur.',
      pengalamanMerefleksi: 'Menyadari pentingnya integritas data.',
      aktivitasGuruSiswa: 'Simulasi peneliti jujur.',
      asesmenPengamatan: 'Observasi perilaku jujur.',
      refleksiHarian: 'Apakah saya sudah jujur hari ini?',
    },
    references: PAK_OFFICIAL_REFERENCES,
    qualityValidation: PAK_VALIDATION_CRITERIA.map((k, idx) => ({
      nomor: idx + 1,
      kriteria: k,
      memenuhi: true,
      catatan: 'Sesuai',
    })),
    applied: true,
    ignored: false,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('PAK framework invariants and RPM core integration', () => {
  it('enforces exact 5 elements, 10 sub-elements, 9 core values, and 10 validation criteria', () => {
    assert.equal(PAK_ELEMENTS_FRAMEWORK.length, 5);
    const totalSubElements = PAK_ELEMENTS_FRAMEWORK.reduce(
      (sum, el) => sum + el.subElements.length,
      0,
    );
    assert.equal(totalSubElements, 10);
    assert.equal(PAK_CORE_VALUES.length, 9);
    assert.equal(PAK_VALIDATION_CRITERIA.length, 10);
    assert.equal(PAK_OFFICIAL_REFERENCES.length, 5);
    assert.equal(formatPakRelevanceLabel('sangat_relevan'), 'Sangat Relevan');
    assert.equal(formatPakRelevanceLabel('relevan_penguatan'), 'Relevan sebagai Penguatan');
    assert.equal(formatPakRelevanceLabel('tidak_relevan_langsung'), 'Tidak Relevan Secara Langsung');
  });

  it('validates minimum context detection before running auto-detect', () => {
    assert.equal(hasMinimumPakDetectContext({ mataPelajaran: 'IPAS', materi: 'Siklus Air' }), true);
    assert.equal(hasMinimumPakDetectContext({ mataPelajaran: 'IPAS', materi: 'ab' }), false);
    assert.equal(hasMinimumPakDetectContext({ mataPelajaran: '', materi: 'Siklus Air' }), false);
  });

  it('applies PAK integration idempotently without mutating academic Tujuan Pembelajaran', () => {
    const base = createDefaultRpmCore(createDefaultProfile());
    const originalTp = [...base.desain.tujuanPembelajaran];
    const pak = makeSamplePakRecord({ applied: true, ignored: false });

    const appliedOnce = applyPakIntegrationToRpmCore(base, pak);
    const appliedTwice = applyPakIntegrationToRpmCore(appliedOnce, pak);

    assert.deepEqual(appliedOnce.desain.tujuanPembelajaran, originalTp);
    assert.ok(appliedOnce.identifikasi.karakteristikPesertaDidik.includes('[Integrasi PAK]'));
    assert.ok(appliedOnce.desain.keterkaitanPedagogis.includes('[Pemetaan Pendidikan Antikorupsi]'));
    assert.ok(appliedOnce.asesmen.formatif.indikatorPenilaian.includes('[Asesmen PAK]'));
    assert.equal(
      appliedTwice.identifikasi.karakteristikPesertaDidik,
      appliedOnce.identifikasi.karakteristikPesertaDidik,
    );
    assert.equal(
      appliedTwice.refleksi.refleksiPesertaDidik.length,
      appliedOnce.refleksi.refleksiPesertaDidik.length,
    );

    const stripped = stripPakIntegrationFromRpmCore(appliedTwice);
    assert.equal(stripped.identifikasi.karakteristikPesertaDidik.includes('[Integrasi PAK]'), false);
    assert.equal(stripped.desain.keterkaitanPedagogis.includes('[Pemetaan Pendidikan Antikorupsi]'), false);
    assert.equal(stripped.asesmen.formatif.indikatorPenilaian.includes('[Asesmen PAK]'), false);
  });

  it('does not force PAK markers when relevanceStatus is tidak_relevan_langsung', () => {
    const base = createDefaultRpmCore(createDefaultProfile());
    const pak = makeSamplePakRecord({
      applied: true,
      relevanceStatus: 'tidak_relevan_langsung',
    });
    const result = applyPakIntegrationToRpmCore(base, pak);
    assert.equal(result.identifikasi.karakteristikPesertaDidik.includes('[Integrasi PAK]'), false);
  });
});
