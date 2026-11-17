import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  BACKUP_APP_ID,
  BACKUP_SCHEMA_VERSION,
  buildBackupPayload,
  buildSingleRpmExportPayload,
  DEFAULT_SETTINGS,
  extractRpmSearchTokens,
  formatBytesIndonesian,
  parseAndValidateBackupJson,
  parseAndValidateSingleRpmJson,
  type UserWorkspaceData,
} from './storageValidation';
import { createDefaultProfile, createSampleIpasRpm } from '../utils/pedagogy';

function makeWorkspace(): UserWorkspaceData {
  const profile = createDefaultProfile();
  profile.namaGuru = 'Ibu Siti Aminah, S.Pd.';
  const sample = createSampleIpasRpm(profile, 'guru_test_1');
  return {
    uid: 'guru_test_1',
    profile,
    classes: [
      {
        id: 'cls-5a',
        className: 'Kelas 5A',
        grade: 5,
        phase: 'C',
        semester: '1',
        academicYear: '2026/2027',
        studentCount: 28,
        createdAt: '2026-01-01T00:00:00.000Z',
      },
    ],
    templates: [],
    lessonPlans: [sample],
    pakIntegrations: [],
    worksheets: [],
    backups: [],
    activities: [],
    settings: DEFAULT_SETTINGS,
    interviewDraft: null,
  };
}

describe('storageValidation backup & single RPM JSON', () => {
  it('builds and validates schema v3 full backup payload with metadata', () => {
    const ws = makeWorkspace();
    const payload = buildBackupPayload(ws);
    assert.equal(payload.app, BACKUP_APP_ID);
    assert.equal(payload.schemaVersion, BACKUP_SCHEMA_VERSION);
    assert.deepEqual(payload.counts, {
      lessonPlans: 1,
      classes: 1,
      templates: 0,
      pakIntegrations: 0,
      worksheets: 0,
    });
    assert.ok(Array.isArray(payload.structure));

    const parsed = parseAndValidateBackupJson(JSON.stringify(payload));
    assert.equal(parsed.data.lessonPlans.length, 1);
    assert.equal(parsed.data.profile.namaGuru, 'Ibu Siti Aminah, S.Pd.');
  });

  it('still accepts legacy schema v1 and v2 backup payloads', () => {
    const ws = makeWorkspace();
    const v1 = { ...buildBackupPayload(ws), schemaVersion: 1 };
    const parsedV1 = parseAndValidateBackupJson(JSON.stringify(v1));
    assert.equal(parsedV1.schemaVersion, 1);
    assert.equal(parsedV1.data.classes.length, 1);

    const v2 = { ...buildBackupPayload(ws), schemaVersion: 2 };
    const parsedV2 = parseAndValidateBackupJson(JSON.stringify(v2));
    assert.equal(parsedV2.schemaVersion, 2);
    assert.equal(parsedV2.data.lessonPlans.length, 1);
  });

  it('rejects malformed or non-app backup files cleanly', () => {
    assert.throws(() => parseAndValidateBackupJson('not json'), /rusak/);
    assert.throws(
      () => parseAndValidateBackupJson(JSON.stringify({ app: 'OTHER', data: {} })),
      /bukan format resmi/,
    );
    assert.throws(
      () =>
        parseAndValidateBackupJson(
          JSON.stringify({
            app: BACKUP_APP_ID,
            schemaVersion: 99,
            data: { profile: {}, lessonPlans: [], classes: [], templates: [] },
          }),
        ),
      /tidak didukung/,
    );
  });

  it('exports and validates single RPM document JSON', () => {
    const ws = makeWorkspace();
    const doc = ws.lessonPlans[0];
    const single = buildSingleRpmExportPayload(doc);
    assert.equal(single.kind, 'SINGLE_RPM_DOCUMENT');
    const restored = parseAndValidateSingleRpmJson(JSON.stringify(single));
    assert.equal(restored.id, doc.id);
    assert.equal(restored.content.identitas.materi, doc.content.identitas.materi);
  });

  it('extracts lowercase search tokens for IndexedDB multiEntry index', () => {
    const ws = makeWorkspace();
    const tokens = extractRpmSearchTokens(ws.lessonPlans[0]);
    assert.ok(tokens.includes('ipas'));
    assert.ok(tokens.includes('siti'));
  });

  it('formats byte sizes cleanly', () => {
    assert.equal(formatBytesIndonesian(0), '0 B');
    assert.equal(formatBytesIndonesian(512), '512 B');
    assert.equal(formatBytesIndonesian(2048), '2.0 KB');
    assert.equal(formatBytesIndonesian(5 * 1024 * 1024), '5.0 MB');
  });
});
