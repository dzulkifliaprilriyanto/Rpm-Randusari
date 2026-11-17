import type {
  ActivityLogItem,
  AppSettings,
  BackupMetadata,
  InterviewSessionState,
  PakIntegrationRecord,
  RpmDocument,
  RpmTemplate,
  SchoolClass,
  TeacherProfile,
  WorksheetRecord,
} from '../types/rpm';
import { createDefaultProfile } from '../utils/pedagogy';
import { localDb } from './db';
import {
  DEFAULT_SETTINGS,
  extractRpmSearchTokens,
  type UserWorkspaceData,
} from './storageValidation';

export * from './storageValidation';

const UID_KEY = 'ai_rpm_sdn_randusari_anon_uid';
const LEGACY_COLLECTIONS = [
  'profile',
  'classes',
  'templates',
  'lessonPlans',
  'backups',
  'activities',
  'settings',
  'interviewDraft',
] as const;

function legacyDataKey(uid: string, collection: string): string {
  return `ai_rpm_sdn_randusari_v1:${uid}:${collection}`;
}

function readLegacyJson<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function handleStorageError(err: unknown, context: string): never {
  const name = err instanceof Error ? err.name : '';
  const msg = err instanceof Error ? err.message : String(err);
  if (name === 'QuotaExceededError' || msg.toLowerCase().includes('quota')) {
    throw new Error(
      `Penyimpanan browser penuh saat ${context}. Ekspor backup JSON atau bersihkan ruang browser Anda tanpa menghapus dokumen secara otomatis.`,
    );
  }
  throw new Error(`Gagal menyimpan data lokal (${context}): ${msg}`);
}

export function getOrCreateAnonymousUid(): string {
  let uid = '';
  try {
    uid = localStorage.getItem(UID_KEY) || '';
  } catch {
    uid = '';
  }
  if (!uid || !/^[a-zA-Z0-9_-]{8,80}$/.test(uid)) {
    const rawUuid =
      typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : `anon-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    uid = `guru_${rawUuid.replace(/[^a-zA-Z0-9_-]/g, '')}`;
    try {
      localStorage.setItem(UID_KEY, uid);
    } catch {
      // Ignore if localStorage is restricted; IndexedDB remains authoritative
    }
  }
  return uid;
}

async function migrateLegacyLocalStorageIfNeeded(uid: string): Promise<void> {
  const migrationKey = `migrated_v1_${uid}`;
  const already = await localDb.meta.get(migrationKey);
  if (already) return;

  const legacyProfile = readLegacyJson<TeacherProfile>(legacyDataKey(uid, 'profile'));
  const legacyClasses = readLegacyJson<SchoolClass[]>(legacyDataKey(uid, 'classes'));
  const legacyTemplates = readLegacyJson<RpmTemplate[]>(legacyDataKey(uid, 'templates'));
  const legacyPlans = readLegacyJson<RpmDocument[]>(legacyDataKey(uid, 'lessonPlans'));
  const legacyBackups = readLegacyJson<BackupMetadata[]>(legacyDataKey(uid, 'backups'));
  const legacyActivities = readLegacyJson<ActivityLogItem[]>(legacyDataKey(uid, 'activities'));
  const legacySettings = readLegacyJson<Partial<AppSettings>>(legacyDataKey(uid, 'settings'));
  const legacyDraft = readLegacyJson<InterviewSessionState>(legacyDataKey(uid, 'interviewDraft'));

  const hasAnyLegacy = Boolean(
    legacyProfile ||
      (legacyClasses && legacyClasses.length) ||
      (legacyTemplates && legacyTemplates.length) ||
      (legacyPlans && legacyPlans.length) ||
      (legacyBackups && legacyBackups.length) ||
      (legacyActivities && legacyActivities.length) ||
      legacySettings ||
      legacyDraft,
  );

  if (hasAnyLegacy) {
    await localDb.transaction(
      'rw',
      [
        localDb.profiles,
        localDb.classes,
        localDb.templates,
        localDb.lessonPlans,
        localDb.backups,
        localDb.activities,
        localDb.settings,
        localDb.interviewDrafts,
        localDb.meta,
      ],
      async () => {
        if (legacyProfile) {
          await localDb.profiles.put({ uid, profile: legacyProfile });
        }
        if (Array.isArray(legacyClasses) && legacyClasses.length) {
          await localDb.classes.bulkPut(legacyClasses.map((c) => ({ ...c, uid })));
        }
        if (Array.isArray(legacyTemplates) && legacyTemplates.length) {
          await localDb.templates.bulkPut(legacyTemplates.map((t) => ({ ...t, uid })));
        }
        if (Array.isArray(legacyPlans) && legacyPlans.length) {
          await localDb.lessonPlans.bulkPut(
            legacyPlans.map((p) => ({
              ...p,
              uid,
              searchTokens: extractRpmSearchTokens(p),
            })),
          );
        }
        if (Array.isArray(legacyBackups) && legacyBackups.length) {
          await localDb.backups.bulkPut(legacyBackups.map((b) => ({ ...b, uid })));
        }
        if (Array.isArray(legacyActivities) && legacyActivities.length) {
          await localDb.activities.bulkPut(legacyActivities.map((a) => ({ ...a, uid })));
        }
        if (legacySettings) {
          await localDb.settings.put({
            uid,
            settings: {
              ...DEFAULT_SETTINGS,
              ...legacySettings,
              exportConfig: {
                ...DEFAULT_SETTINGS.exportConfig,
                ...(legacySettings.exportConfig || {}),
              },
            },
          });
        }
        if (legacyDraft) {
          await localDb.interviewDrafts.put({ uid, draft: legacyDraft });
        }
        await localDb.meta.put({
          key: migrationKey,
          value: 'migrated',
          updatedAt: new Date().toISOString(),
        });
      },
    );

    // Clean legacy keys only after IndexedDB transaction succeeds
    for (const col of LEGACY_COLLECTIONS) {
      try {
        localStorage.removeItem(legacyDataKey(uid, col));
      } catch {
        // Ignore cleanup issues
      }
    }
  } else {
    await localDb.meta.put({
      key: migrationKey,
      value: 'clean',
      updatedAt: new Date().toISOString(),
    });
  }
}

export function createEmptyWorkspace(uid: string): UserWorkspaceData {
  return {
    uid,
    profile: createDefaultProfile(),
    classes: [],
    templates: [],
    lessonPlans: [],
    pakIntegrations: [],
    worksheets: [],
    backups: [],
    activities: [],
    settings: DEFAULT_SETTINGS,
    interviewDraft: null,
  };
}

export async function loadWorkspaceData(uid: string): Promise<UserWorkspaceData> {
  await localDb.meta.put({
    key: 'active_uid',
    value: uid,
    updatedAt: new Date().toISOString(),
  });

  await migrateLegacyLocalStorageIfNeeded(uid);

  const [
    profileRec,
    classRecs,
    templateRecs,
    planRecs,
    pakRecs,
    worksheetRecs,
    backupRecs,
    activityRecs,
    settingsRec,
    draftRec,
  ] = await Promise.all([
    localDb.profiles.get(uid),
    localDb.classes.where('uid').equals(uid).toArray(),
    localDb.templates.where('uid').equals(uid).toArray(),
    localDb.lessonPlans.where('uid').equals(uid).toArray(),
    localDb.pakIntegrations.where('uid').equals(uid).toArray(),
    localDb.worksheets.where('uid').equals(uid).toArray(),
    localDb.backups.where('uid').equals(uid).toArray(),
    localDb.activities.where('uid').equals(uid).toArray(),
    localDb.settings.get(uid),
    localDb.interviewDrafts.get(uid),
  ]);

  const sortedPakIntegrations = pakRecs
    .map(({ uid: _u, ...rest }) => rest as PakIntegrationRecord)
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

  const sortedWorksheets = worksheetRecs
    .map(({ uid: _u, ...rest }) => rest as WorksheetRecord)
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

  const pakByLessonPlanId = new Map(sortedPakIntegrations.map((p) => [p.lessonPlanId, p]));
  const worksheetByLessonPlanId = new Map(sortedWorksheets.map((w) => [w.lessonPlanId, w]));

  const sortedPlans = planRecs
    .map(({ searchTokens: _tokens, ...rest }) => {
      let plan = rest as RpmDocument;
      if (!plan.pakIntegration && pakByLessonPlanId.has(plan.id)) {
        plan = { ...plan, pakIntegration: pakByLessonPlanId.get(plan.id) };
      }
      const ws = worksheetByLessonPlanId.get(plan.id);
      if (ws && !plan.perangkat?.lkpd) {
        plan = {
          ...plan,
          perangkat: {
            ...(plan.perangkat || {}),
            lkpd: ws.worksheetContent,
          },
          crossValidation: plan.crossValidation || ws.validationStatus,
        };
      }
      return plan;
    })
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

  const sortedClasses = classRecs
    .map(({ uid: _u, ...rest }) => rest as SchoolClass)
    .sort((a, b) => a.grade - b.grade || a.className.localeCompare(b.className));

  const sortedTemplates = templateRecs
    .map(({ uid: _u, ...rest }) => rest as RpmTemplate)
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

  const sortedBackups = backupRecs
    .map(({ uid: _u, ...rest }) => rest as BackupMetadata)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const sortedActivities = activityRecs
    .map(({ uid: _u, ...rest }) => rest as ActivityLogItem)
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 40);

  return {
    uid,
    profile: profileRec?.profile || createDefaultProfile(),
    classes: sortedClasses,
    templates: sortedTemplates,
    lessonPlans: sortedPlans,
    pakIntegrations: sortedPakIntegrations,
    worksheets: sortedWorksheets,
    backups: sortedBackups,
    activities: sortedActivities,
    settings: settingsRec?.settings
      ? {
          ...DEFAULT_SETTINGS,
          ...settingsRec.settings,
          exportConfig: {
            ...DEFAULT_SETTINGS.exportConfig,
            ...(settingsRec.settings.exportConfig || {}),
          },
        }
      : DEFAULT_SETTINGS,
    interviewDraft: draftRec?.draft || null,
  };
}

export async function saveProfile(uid: string, profile: TeacherProfile): Promise<void> {
  try {
    await localDb.profiles.put({ uid, profile });
  } catch (err) {
    handleStorageError(err, 'menyimpan profil guru');
  }
}

export async function saveClasses(uid: string, classes: SchoolClass[]): Promise<void> {
  try {
    await localDb.transaction('rw', localDb.classes, async () => {
      await localDb.classes.where('uid').equals(uid).delete();
      if (classes.length > 0) {
        await localDb.classes.bulkPut(classes.map((c) => ({ ...c, uid })));
      }
    });
  } catch (err) {
    handleStorageError(err, 'menyimpan daftar kelas');
  }
}

export async function saveTemplates(uid: string, templates: RpmTemplate[]): Promise<void> {
  try {
    await localDb.transaction('rw', localDb.templates, async () => {
      await localDb.templates.where('uid').equals(uid).delete();
      if (templates.length > 0) {
        await localDb.templates.bulkPut(templates.map((t) => ({ ...t, uid })));
      }
    });
  } catch (err) {
    handleStorageError(err, 'menyimpan template RPM');
  }
}

export async function saveLessonPlans(uid: string, plans: RpmDocument[]): Promise<void> {
  try {
    await localDb.transaction('rw', localDb.lessonPlans, async () => {
      await localDb.lessonPlans.where('uid').equals(uid).delete();
      if (plans.length > 0) {
        await localDb.lessonPlans.bulkPut(
          plans.map((p) => ({
            ...p,
            uid,
            searchTokens: extractRpmSearchTokens(p),
          })),
        );
      }
    });
  } catch (err) {
    handleStorageError(err, 'menyimpan dokumen RPM');
  }
}

export async function upsertSingleLessonPlan(uid: string, doc: RpmDocument): Promise<void> {
  try {
    await localDb.lessonPlans.put({
      ...doc,
      uid,
      searchTokens: extractRpmSearchTokens(doc),
    });
  } catch (err) {
    handleStorageError(err, 'menyimpan perubahan dokumen RPM');
  }
}

export async function saveBackups(uid: string, backups: BackupMetadata[]): Promise<void> {
  try {
    await localDb.transaction('rw', localDb.backups, async () => {
      await localDb.backups.where('uid').equals(uid).delete();
      if (backups.length > 0) {
        await localDb.backups.bulkPut(backups.slice(0, 20).map((b) => ({ ...b, uid })));
      }
    });
  } catch (err) {
    handleStorageError(err, 'menyimpan metadata backup');
  }
}

export async function saveActivities(uid: string, activities: ActivityLogItem[]): Promise<void> {
  try {
    await localDb.transaction('rw', localDb.activities, async () => {
      await localDb.activities.where('uid').equals(uid).delete();
      if (activities.length > 0) {
        await localDb.activities.bulkPut(activities.slice(0, 40).map((a) => ({ ...a, uid })));
      }
    });
  } catch (err) {
    handleStorageError(err, 'menyimpan log aktivitas');
  }
}

export async function saveSettings(uid: string, settings: AppSettings): Promise<void> {
  try {
    await localDb.settings.put({ uid, settings });
  } catch (err) {
    handleStorageError(err, 'menyimpan pengaturan aplikasi');
  }
}

export async function saveInterviewDraft(
  uid: string,
  draft: InterviewSessionState | null,
): Promise<void> {
  try {
    if (!draft) {
      await localDb.interviewDrafts.delete(uid);
    } else {
      await localDb.interviewDrafts.put({ uid, draft });
    }
  } catch (err) {
    handleStorageError(err, 'menyimpan draf wawancara AI');
  }
}

export async function savePakIntegrations(
  uid: string,
  records: PakIntegrationRecord[],
): Promise<void> {
  try {
    await localDb.transaction('rw', localDb.pakIntegrations, async () => {
      await localDb.pakIntegrations.where('uid').equals(uid).delete();
      if (records.length > 0) {
        await localDb.pakIntegrations.bulkPut(records.map((r) => ({ ...r, uid })));
      }
    });
  } catch (err) {
    handleStorageError(err, 'menyimpan daftar integrasi PAK');
  }
}

export async function upsertPakIntegration(
  uid: string,
  record: PakIntegrationRecord,
): Promise<void> {
  try {
    await localDb.pakIntegrations.put({ ...record, uid });
  } catch (err) {
    handleStorageError(err, 'menyimpan integrasi Pendidikan Antikorupsi');
  }
}

export async function saveWorksheets(
  uid: string,
  records: WorksheetRecord[],
): Promise<void> {
  try {
    await localDb.transaction('rw', localDb.worksheets, async () => {
      await localDb.worksheets.where('uid').equals(uid).delete();
      if (records.length > 0) {
        await localDb.worksheets.bulkPut(records.map((r) => ({ ...r, uid })));
      }
    });
  } catch (err) {
    handleStorageError(err, 'menyimpan daftar LKPD');
  }
}

export async function upsertWorksheet(
  uid: string,
  record: WorksheetRecord,
): Promise<void> {
  try {
    await localDb.worksheets.put({ ...record, uid });
  } catch (err) {
    handleStorageError(err, 'menyimpan Lembar Kerja Peserta Didik (LKPD)');
  }
}

export async function clearAllWorkspaceData(uid: string): Promise<void> {
  await localDb.transaction(
    'rw',
    [
      localDb.profiles,
      localDb.classes,
      localDb.templates,
      localDb.lessonPlans,
      localDb.pakIntegrations,
      localDb.worksheets,
      localDb.backups,
      localDb.activities,
      localDb.settings,
      localDb.interviewDrafts,
    ],
    async () => {
      await Promise.all([
        localDb.profiles.delete(uid),
        localDb.classes.where('uid').equals(uid).delete(),
        localDb.templates.where('uid').equals(uid).delete(),
        localDb.lessonPlans.where('uid').equals(uid).delete(),
        localDb.pakIntegrations.where('uid').equals(uid).delete(),
        localDb.worksheets.where('uid').equals(uid).delete(),
        localDb.backups.where('uid').equals(uid).delete(),
        localDb.activities.where('uid').equals(uid).delete(),
        localDb.settings.delete(uid),
        localDb.interviewDrafts.delete(uid),
      ]);
    },
  );
}

export interface LocalStorageDiagnostics {
  supported: boolean;
  persisted: boolean | null;
  usageBytes: number;
  quotaBytes: number;
  usagePercent: number;
  counts: {
    lessonPlans: number;
    worksheets: number;
    classes: number;
    templates: number;
    activities: number;
    backups: number;
  };
  cacheNames: string[];
}

export async function getLocalStorageDiagnostics(uid: string): Promise<LocalStorageDiagnostics> {
  let usageBytes = 0;
  let quotaBytes = 0;
  let persisted: boolean | null = null;
  const supported = typeof indexedDB !== 'undefined';

  if (typeof navigator !== 'undefined' && navigator.storage) {
    try {
      if (typeof navigator.storage.estimate === 'function') {
        const est = await navigator.storage.estimate();
        usageBytes = est.usage ?? 0;
        quotaBytes = est.quota ?? 0;
      }
      if (typeof navigator.storage.persisted === 'function') {
        persisted = await navigator.storage.persisted();
      }
    } catch {
      // Ignore storage estimate restrictions
    }
  }

  let cacheNames: string[] = [];
  if (typeof caches !== 'undefined') {
    try {
      cacheNames = await caches.keys();
    } catch {
      cacheNames = [];
    }
  }

  const [lessonPlans, worksheets, classes, templates, activities, backups] = await Promise.all([
    localDb.lessonPlans.where('uid').equals(uid).count(),
    localDb.worksheets.where('uid').equals(uid).count(),
    localDb.classes.where('uid').equals(uid).count(),
    localDb.templates.where('uid').equals(uid).count(),
    localDb.activities.where('uid').equals(uid).count(),
    localDb.backups.where('uid').equals(uid).count(),
  ]);

  const usagePercent =
    quotaBytes > 0 ? Math.min(100, Math.round((usageBytes / quotaBytes) * 1000) / 10) : 0;

  return {
    supported,
    persisted,
    usageBytes,
    quotaBytes,
    usagePercent,
    counts: {
      lessonPlans,
      worksheets,
      classes,
      templates,
      activities,
      backups,
    },
    cacheNames,
  };
}

export async function requestPersistentBrowserStorage(): Promise<boolean> {
  if (typeof navigator !== 'undefined' && navigator.storage && typeof navigator.storage.persist === 'function') {
    try {
      return await navigator.storage.persist();
    } catch {
      return false;
    }
  }
  return false;
}
