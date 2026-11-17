import test from 'node:test';
import assert from 'node:assert/strict';
import {
  auditRpmStructure,
  computeRpmDiff,
  createDefaultProfile,
  createDefaultRpmCore,
  createSampleIpasRpm,
  derivePhaseFromGrade,
  filterAndPaginateRpms,
  sanitizeTextInput,
} from './pedagogy';

test('derivePhaseFromGrade maps SD grades 1-6 to Kurikulum Merdeka phases A, B, C', () => {
  assert.equal(derivePhaseFromGrade(1), 'A');
  assert.equal(derivePhaseFromGrade(2), 'A');
  assert.equal(derivePhaseFromGrade(3), 'B');
  assert.equal(derivePhaseFromGrade(4), 'B');
  assert.equal(derivePhaseFromGrade(5), 'C');
  assert.equal(derivePhaseFromGrade(6), 'C');
});

test('sanitizeTextInput removes control characters and enforces maxLength', () => {
  const dirty = '  Halo\u0000 SDN\u0007 Randusari  ';
  assert.equal(sanitizeTextInput(dirty, 100), 'Halo SDN Randusari');
  assert.equal(sanitizeTextInput('abcdef', 3), 'abc');
});

test('auditRpmStructure detects missing required sections and calculates minutes', () => {
  const profile = createDefaultProfile();
  const emptyRpm = createDefaultRpmCore(profile);
  const emptyAudit = auditRpmStructure(emptyRpm);
  assert.equal(emptyAudit.isComplete, false);
  assert.ok(emptyAudit.missingSections.includes('Capaian Pembelajaran (CP)'));
  assert.equal(emptyAudit.totalMinutes, 70);

  const sample = createSampleIpasRpm(profile, 'test-uid');
  const sampleAudit = auditRpmStructure(sample.content);
  assert.equal(sampleAudit.isComplete, true);
  assert.equal(sampleAudit.totalMinutes, 70);
  assert.deepEqual(sampleAudit.coveredPrinciples.sort(), ['Joyful', 'Meaningful', 'Mindful']);
});

test('filterAndPaginateRpms filters by subject, grade, status, search and paginates accurately', () => {
  const profile = createDefaultProfile();
  const p1 = createSampleIpasRpm(profile, 'u1');
  p1.id = '1';
  p1.status = 'final';
  p1.updatedAt = '2026-11-10T10:00:00.000Z';

  const p2 = createSampleIpasRpm(profile, 'u1');
  p2.id = '2';
  p2.title = 'RPM Matematika Pecahan';
  p2.subject = 'Matematika';
  p2.grade = 'Kelas 4B';
  p2.status = 'draft';
  p2.updatedAt = '2026-11-12T10:00:00.000Z';

  const resAll = filterAndPaginateRpms([p1, p2], {
    search: '',
    grade: 'all',
    subject: 'all',
    status: 'all',
    page: 1,
    pageSize: 1,
  });
  assert.equal(resAll.totalItems, 2);
  assert.equal(resAll.totalPages, 2);
  assert.equal(resAll.items[0].id, '2'); // sorted newest first

  const resFiltered = filterAndPaginateRpms([p1, p2], {
    search: 'pecahan',
    grade: 'Kelas 4',
    subject: 'Matematika',
    status: 'draft',
    page: 1,
    pageSize: 10,
  });
  assert.equal(resFiltered.totalItems, 1);
  assert.equal(resFiltered.items[0].id, '2');
});

test('computeRpmDiff accurately identifies modified vs unchanged sections', () => {
  const profile = createDefaultProfile();
  const before = createSampleIpasRpm(profile, 'u1').content;
  const after = structuredClone(before);
  after.diferensiasi.proses = 'Kelompok diberi kartu panduan langkah bertahap.';

  const diff = computeRpmDiff(before, after);
  const diffDif = diff.find((d) => d.section.includes('Diferensiasi'));
  const diffIdent = diff.find((d) => d.section.includes('Identitas'));

  assert.equal(diffDif?.changed, true);
  assert.equal(diffIdent?.changed, false);
});
