import type {
  AppSettings,
  PakIntegrationRecord,
  RpmDocument,
  RpmTemplate,
  SchoolClass,
  TeacherProfile,
  WorksheetRecord,
} from '../types/rpm';

export const BACKUP_APP_ID = 'AI_RPM_SDN_RANDUSARI' as const;
export const BACKUP_APP_VERSION = '1.3.0';
export const BACKUP_SCHEMA_VERSION = 3;

export const DEFAULT_SETTINGS: AppSettings = {
  theme: 'light',
  autoSaveDraft: true,
  exportConfig: {
    orientation: 'portrait',
    fontSize: 11,
    marginMm: 20,
    showHeader: true,
    showFooter: true,
    showPageNumbers: true,
    showPengesahan: true,
  },
};

export interface UserWorkspaceData {
  uid: string;
  profile: TeacherProfile;
  classes: SchoolClass[];
  templates: RpmTemplate[];
  lessonPlans: RpmDocument[];
  pakIntegrations: PakIntegrationRecord[];
  worksheets: WorksheetRecord[];
  backups: {
    id: string;
    fileName: string;
    rpmCount: number;
    classCount: number;
    templateCount: number;
    createdAt: string;
  }[];
  activities: {
    id: string;
    type: 'create' | 'update' | 'export' | 'qc' | 'backup' | 'class' | 'profile' | 'pak' | 'lkpd';
    title: string;
    detail: string;
    timestamp: string;
  }[];
  settings: AppSettings;
  interviewDraft: import('../types/rpm').InterviewSessionState | null;
}

export interface ExportedBackupPayload {
  app: typeof BACKUP_APP_ID;
  appVersion?: string;
  schemaVersion: 1 | 2 | 3;
  exportedAt: string;
  sourceUid: string;
  counts?: {
    lessonPlans: number;
    classes: number;
    templates: number;
    pakIntegrations?: number;
    worksheets?: number;
  };
  structure?: string[];
  data: {
    profile: TeacherProfile;
    classes: SchoolClass[];
    templates: RpmTemplate[];
    lessonPlans: RpmDocument[];
    pakIntegrations?: PakIntegrationRecord[];
    worksheets?: WorksheetRecord[];
    settings: AppSettings;
  };
}

export interface ExportedSingleRpmPayload {
  app: typeof BACKUP_APP_ID;
  kind: 'SINGLE_RPM_DOCUMENT';
  appVersion: string;
  schemaVersion: 2 | 3;
  exportedAt: string;
  document: RpmDocument;
}

export function extractRpmSearchTokens(doc: RpmDocument): string[] {
  const raw = [
    doc.title,
    doc.subject,
    doc.grade,
    doc.phase,
    doc.topic,
    doc.status,
    doc.content?.identitas?.namaGuru || '',
    doc.content?.identitas?.materi || '',
    doc.content?.desain?.modelPembelajaran || '',
    ...(doc.pakIntegration?.nilaiAntikorupsi || []),
  ]
    .join(' ')
    .toLowerCase();

  const tokens = raw
    .split(/[^a-z0-9]+/i)
    .map((t) => t.trim())
    .filter((t) => t.length >= 2);
  return Array.from(new Set(tokens));
}

export function buildBackupPayload(workspace: UserWorkspaceData): ExportedBackupPayload {
  return {
    app: BACKUP_APP_ID,
    appVersion: BACKUP_APP_VERSION,
    schemaVersion: BACKUP_SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    sourceUid: workspace.uid,
    counts: {
      lessonPlans: workspace.lessonPlans.length,
      classes: workspace.classes.length,
      templates: workspace.templates.length,
      pakIntegrations: workspace.pakIntegrations.length,
      worksheets: workspace.worksheets.length,
    },
    structure: [
      'profile',
      'classes',
      'templates',
      'lessonPlans',
      'pakIntegrations',
      'worksheets',
      'settings',
    ],
    data: {
      profile: workspace.profile,
      classes: workspace.classes,
      templates: workspace.templates,
      lessonPlans: workspace.lessonPlans,
      pakIntegrations: workspace.pakIntegrations,
      worksheets: workspace.worksheets,
      settings: workspace.settings,
    },
  };
}

export function parseAndValidateBackupJson(rawText: string): ExportedBackupPayload {
  let parsed: Partial<ExportedBackupPayload>;
  try {
    parsed = JSON.parse(rawText) as Partial<ExportedBackupPayload>;
  } catch {
    throw new Error('Berkas JSON tidak dapat dibaca atau formatnya rusak.');
  }

  if (parsed.app !== BACKUP_APP_ID || !parsed.data || typeof parsed.data !== 'object') {
    throw new Error('Berkas backup bukan format resmi AI RPM SDN Randusari.');
  }

  if (
    parsed.schemaVersion !== undefined &&
    parsed.schemaVersion !== 1 &&
    parsed.schemaVersion !== 2 &&
    parsed.schemaVersion !== 3
  ) {
    throw new Error(`Versi skema backup (${String(parsed.schemaVersion)}) tidak didukung.`);
  }

  const d = parsed.data;
  if (!Array.isArray(d.lessonPlans) || !Array.isArray(d.classes) || !Array.isArray(d.templates)) {
    throw new Error('Struktur koleksi (lessonPlans, classes, templates) di dalam berkas backup tidak lengkap.');
  }
  if (!d.profile || typeof d.profile !== 'object') {
    throw new Error('Data profil guru di dalam berkas backup tidak ditemukan.');
  }

  for (const plan of d.lessonPlans) {
    if (!plan || typeof plan !== 'object' || typeof plan.id !== 'string' || !plan.content?.identitas) {
      throw new Error('Terdapat entri dokumen RPM yang tidak valid di dalam berkas backup.');
    }
  }

  return parsed as ExportedBackupPayload;
}

export function buildSingleRpmExportPayload(doc: RpmDocument): ExportedSingleRpmPayload {
  return {
    app: BACKUP_APP_ID,
    kind: 'SINGLE_RPM_DOCUMENT',
    appVersion: BACKUP_APP_VERSION,
    schemaVersion: BACKUP_SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    document: doc,
  };
}

export function parseAndValidateSingleRpmJson(rawText: string): RpmDocument {
  let parsed: Partial<ExportedSingleRpmPayload>;
  try {
    parsed = JSON.parse(rawText) as Partial<ExportedSingleRpmPayload>;
  } catch {
    throw new Error('Berkas dokumen JSON tidak valid atau rusak.');
  }

  if (
    parsed.app !== BACKUP_APP_ID ||
    parsed.kind !== 'SINGLE_RPM_DOCUMENT' ||
    !parsed.document ||
    typeof parsed.document !== 'object'
  ) {
    throw new Error('Berkas bukan format dokumen RPM satuan AI RPM SDN Randusari.');
  }

  const doc = parsed.document;
  if (!doc.id || !doc.title || !doc.content?.identitas || !doc.content?.desain) {
    throw new Error('Struktur isi dokumen RPM tidak lengkap.');
  }
  return doc;
}

export function formatBytesIndonesian(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  let value = bytes;
  let unitIdx = 0;
  while (value >= 1024 && unitIdx < units.length - 1) {
    value /= 1024;
    unitIdx++;
  }
  return `${value >= 10 || unitIdx === 0 ? Math.round(value) : value.toFixed(1)} ${units[unitIdx]}`;
}
