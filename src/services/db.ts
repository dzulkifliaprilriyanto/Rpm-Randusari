import Dexie, { type Table } from 'dexie';
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

export interface StoredProfileRecord {
  uid: string;
  profile: TeacherProfile;
}

export interface StoredClassRecord extends SchoolClass {
  uid: string;
}

export interface StoredTemplateRecord extends RpmTemplate {
  uid: string;
}

export interface StoredRpmRecord extends RpmDocument {
  searchTokens: string[];
}

export interface StoredPakIntegrationRecord extends PakIntegrationRecord {
  uid: string;
}

export interface StoredWorksheetRecord extends WorksheetRecord {
  uid: string;
}

export interface StoredBackupRecord extends BackupMetadata {
  uid: string;
}

export interface StoredActivityRecord extends ActivityLogItem {
  uid: string;
}

export interface StoredSettingsRecord {
  uid: string;
  settings: AppSettings;
}

export interface StoredInterviewDraftRecord {
  uid: string;
  draft: InterviewSessionState;
}

export interface StoredMetaRecord {
  key: string;
  value: string;
  updatedAt: string;
}

export class AiRpmSdnRandusariDB extends Dexie {
  profiles!: Table<StoredProfileRecord, string>;
  classes!: Table<StoredClassRecord, string>;
  templates!: Table<StoredTemplateRecord, string>;
  lessonPlans!: Table<StoredRpmRecord, string>;
  pakIntegrations!: Table<StoredPakIntegrationRecord, string>;
  worksheets!: Table<StoredWorksheetRecord, string>;
  backups!: Table<StoredBackupRecord, string>;
  activities!: Table<StoredActivityRecord, string>;
  settings!: Table<StoredSettingsRecord, string>;
  interviewDrafts!: Table<StoredInterviewDraftRecord, string>;
  meta!: Table<StoredMetaRecord, string>;

  constructor() {
    super('AiRpmSdnRandusariDB');
    this.version(1).stores({
      profiles: 'uid',
      classes: 'id, uid, grade, phase, className',
      templates: 'id, uid, subject, grade, phase, updatedAt',
      lessonPlans: 'id, uid, subject, grade, phase, status, updatedAt, *searchTokens',
      backups: 'id, uid, createdAt',
      activities: 'id, uid, timestamp',
      settings: 'uid',
      interviewDrafts: 'uid',
      meta: 'key',
    });
    this.version(2).stores({
      profiles: 'uid',
      classes: 'id, uid, grade, phase, className',
      templates: 'id, uid, subject, grade, phase, updatedAt',
      lessonPlans: 'id, uid, subject, grade, phase, status, updatedAt, *searchTokens',
      pakIntegrations: 'id, uid, lessonPlanId, relevanceStatus, updatedAt',
      backups: 'id, uid, createdAt',
      activities: 'id, uid, timestamp',
      settings: 'uid',
      interviewDrafts: 'uid',
      meta: 'key',
    });
    this.version(3).stores({
      profiles: 'uid',
      classes: 'id, uid, grade, phase, className',
      templates: 'id, uid, subject, grade, phase, updatedAt',
      lessonPlans: 'id, uid, subject, grade, phase, status, updatedAt, *searchTokens',
      pakIntegrations: 'id, uid, lessonPlanId, relevanceStatus, updatedAt',
      worksheets: 'id, uid, lessonPlanId, updatedAt',
      backups: 'id, uid, createdAt',
      activities: 'id, uid, timestamp',
      settings: 'uid',
      interviewDrafts: 'uid',
      meta: 'key',
    });
  }
}

export const localDb = new AiRpmSdnRandusariDB();
