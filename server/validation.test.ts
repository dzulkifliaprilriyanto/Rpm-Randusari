import test from 'node:test';
import assert from 'node:assert/strict';
import {
  SlidingWindowRateLimiter,
  validateAndNormalizePakIntegration,
  validateAndNormalizeRpmCore,
  validateQualityReport,
} from './validation';
import { createDefaultProfile, createDefaultRpmCore } from '../src/utils/pedagogy';

test('validateAndNormalizeRpmCore preserves identity invariants and filters unknown dimensions', () => {
  const base = createDefaultRpmCore(createDefaultProfile());
  base.identitas.nipGuru = '198801012019032001';

  const normalized = validateAndNormalizeRpmCore(
    {
      identitas: {
        namaSatuanPendidikan: 'SDN Randusari',
        mataPelajaran: 'Matematika',
        kelas: 'Kelas 4A',
        fase: 'INVALID',
        semester: '2',
        materi: 'Pecahan Senilai',
      },
      identifikasi: {
        dimensiProfilLulusan: [
          { id: 'penalaran_kritis', alasanRelevansi: 'Menganalisis perbandingan pecahan' },
          { id: 'dimensi_palsu', alasanRelevansi: 'Harus diabaikan' },
        ],
      },
      desain: {
        tujuanPembelajaran: ['Membandingkan dua pecahan senilai menggunakan benda konkret'],
      },
    },
    base,
  );

  assert.equal(normalized.identitas.fase, base.identitas.fase);
  assert.equal(normalized.identitas.semester, '2');
  assert.equal(normalized.identitas.nipGuru, '198801012019032001');
  assert.equal(normalized.identifikasi.dimensiProfilLulusan.length, 1);
  assert.equal(normalized.identifikasi.dimensiProfilLulusan[0].id, 'penalaran_kritis');
});

test('validateQualityReport restricts predikat to allowed values', () => {
  const valid = validateQualityReport({
    predikat: 'Sangat Baik',
    ringkasan: 'Koheren dan lengkap.',
    aspekEvaluasi: [{ kode: 'QC-1', aspek: 'CP dan TP', status: 'Memenuhi', catatan: 'Selaras.' }],
    rekomendasiPerbaikan: [],
  });
  assert.equal(valid.predikat, 'Sangat Baik');

  const fallback = validateQualityReport({
    predikat: 'Nilai A+++',
    ringkasan: 'Test',
  });
  assert.equal(fallback.predikat, 'Baik');
});

test('validateAndNormalizePakIntegration enforces canonical 5 elements, caps forced elements, and preserves official references', () => {
  const normalized = validateAndNormalizePakIntegration(
    {
      relevanceStatus: 'sangat_relevan',
      elements: [
        { id: 'elemen_2', kode: 'ELEMEN 2', nama: 'Konsep Kepemilikan', peran: 'utama' },
        { id: 'elemen_3', kode: 'ELEMEN 3', nama: 'Menjaga Amanah', peran: 'pendukung' },
        { id: 'elemen_1', kode: 'ELEMEN 1', nama: 'Ketaatan pada Aturan', peran: 'pendukung' },
        { id: 'elemen_4', kode: 'ELEMEN 4', nama: 'Pengelolaan Dilema Etis', peran: 'pendukung' },
        { id: 'elemen_5', kode: 'ELEMEN 5', nama: 'Membangun Budaya Antikorupsi', peran: 'pendukung' },
      ],
      subElements: [
        { code: '2.2', nama: 'Menghormati hak kepemilikan dan bertanggung jawab' },
        { code: '9.9', nama: 'Subelemen palsu yang harus dibuang' },
      ],
      nilaiAntikorupsi: ['Jujur', 'Peduli', 'NilaiPalsu'],
    },
    'rpm-123',
  );

  assert.equal(normalized.lessonPlanId, 'rpm-123');
  assert.equal(normalized.relevanceLabel, 'Sangat Relevan');
  assert.equal(normalized.elements.length, 3);
  assert.equal(normalized.subElements.length, 1);
  assert.equal(normalized.subElements[0].code, '2.2');
  assert.deepEqual(normalized.nilaiAntikorupsi, ['Jujur', 'Peduli']);
  assert.equal(normalized.qualityValidation.length, 10);
  assert.equal(normalized.references.length, 5);
  assert.equal(normalized.applied, false);
});

test('SlidingWindowRateLimiter enforces request ceiling within time window', () => {
  const limiter = new SlidingWindowRateLimiter(2, 1000);
  assert.equal(limiter.check('ip1', 100).allowed, true);
  assert.equal(limiter.check('ip1', 200).allowed, true);
  assert.equal(limiter.check('ip1', 300).allowed, false);
  assert.equal(limiter.check('ip1', 1200).allowed, true);
});
