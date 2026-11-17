import type {
  AsesmenDiagnostikDetailKit,
  AutoGeneratorInput,
  BahanAjarKit,
  CrossDocumentValidationResult,
  LembarObservasiKit,
  LkpdKit,
  MediaPembelajaranKit,
  PakAutoDetectInput,
  PakIntegrationRecord,
  QualityControlReport,
  RefleksiDetailKit,
  RevisionTargetSection,
  RpmCoreContent,
  RubrikPenilaianKit,
  SoalEvaluasiKit,
} from '../types/rpm';

async function postJson<T>(url: string, body: unknown, uid: string): Promise<T> {
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-session-uid': uid,
    },
    body: JSON.stringify(body),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const msg =
      (data && typeof data.error === 'string' && data.error) ||
      'Permintaan ke layanan AI gagal diproses. Silakan coba lagi.';
    throw new Error(msg);
  }
  return data as T;
}

export interface GeneratedRpmBundle {
  rpm: RpmCoreContent;
  pakIntegration?: PakIntegrationRecord;
  lkpd?: LkpdKit;
  crossValidation?: CrossDocumentValidationResult;
}

export async function apiGenerateRpm(
  input: AutoGeneratorInput & {
    lessonPlanId?: string;
    nipGuru?: string;
    namaKepalaSekolah?: string;
    nipKepalaSekolah?: string;
  },
  uid: string,
): Promise<GeneratedRpmBundle> {
  return postJson<GeneratedRpmBundle>('/api/generate-rpm', input, uid);
}

export interface InterviewTurnResponse {
  reply: string;
  explanation?: string;
  choices: string[];
  collectedInfo: Record<string, string>;
  missingFields: string[];
  readyToGenerate: boolean;
  summaryText: string;
}

export async function apiAiInterviewTurn(
  history: { role: 'assistant' | 'user'; text: string }[],
  knownContext: Record<string, string>,
  uid: string,
): Promise<InterviewTurnResponse> {
  return postJson<InterviewTurnResponse>('/api/ai-interview', { history, knownContext }, uid);
}

export async function apiGenerateLkpd(
  rpm: RpmCoreContent,
  uid: string,
  options?: {
    pakIntegration?: PakIntegrationRecord | null;
    regenerationNote?: string;
    lessonPlanId?: string;
  },
): Promise<{ lkpd: LkpdKit; crossValidation?: CrossDocumentValidationResult }> {
  return postJson<{ lkpd: LkpdKit; crossValidation?: CrossDocumentValidationResult }>(
    '/api/generate-lkpd',
    {
      rpm,
      pakIntegration: options?.pakIntegration,
      regenerationNote: options?.regenerationNote,
      lessonPlanId: options?.lessonPlanId,
    },
    uid,
  );
}

export async function apiGenerateMaterial(rpm: RpmCoreContent, uid: string): Promise<BahanAjarKit> {
  const res = await postJson<{ bahanAjar: BahanAjarKit }>('/api/generate-material', { rpm }, uid);
  return res.bahanAjar;
}

export async function apiGenerateDiagnostikDetail(
  rpm: RpmCoreContent,
  uid: string,
): Promise<AsesmenDiagnostikDetailKit> {
  const res = await postJson<{ asesmenDiagnostikDetail: AsesmenDiagnostikDetailKit }>(
    '/api/generate-assessment',
    { rpm, mode: 'diagnostik' },
    uid,
  );
  return res.asesmenDiagnostikDetail;
}

export async function apiGenerateSoalEvaluasi(
  rpm: RpmCoreContent,
  uid: string,
): Promise<SoalEvaluasiKit> {
  const res = await postJson<{ soalEvaluasi: SoalEvaluasiKit }>(
    '/api/generate-assessment',
    { rpm, mode: 'soal' },
    uid,
  );
  return res.soalEvaluasi;
}

export async function apiGenerateRubric(
  rpm: RpmCoreContent,
  uid: string,
): Promise<RubrikPenilaianKit> {
  const res = await postJson<{ rubrikPenilaian: RubrikPenilaianKit }>(
    '/api/generate-rubric',
    { rpm },
    uid,
  );
  return res.rubrikPenilaian;
}

export async function apiGenerateMedia(
  rpm: RpmCoreContent,
  uid: string,
): Promise<MediaPembelajaranKit> {
  const res = await postJson<{ mediaPembelajaran: MediaPembelajaranKit }>(
    '/api/generate-kit',
    { rpm, kitType: 'media' },
    uid,
  );
  return res.mediaPembelajaran;
}

export async function apiGenerateObservasi(
  rpm: RpmCoreContent,
  uid: string,
): Promise<LembarObservasiKit> {
  const res = await postJson<{ lembarObservasi: LembarObservasiKit }>(
    '/api/generate-kit',
    { rpm, kitType: 'observasi' },
    uid,
  );
  return res.lembarObservasi;
}

export async function apiGenerateRefleksiDetail(
  rpm: RpmCoreContent,
  uid: string,
): Promise<RefleksiDetailKit> {
  const res = await postJson<{ refleksiDetail: RefleksiDetailKit }>(
    '/api/generate-kit',
    { rpm, kitType: 'refleksi' },
    uid,
  );
  return res.refleksiDetail;
}

export async function apiValidateRpm(
  rpm: RpmCoreContent,
  hasPerangkat: Record<string, boolean>,
  uid: string,
): Promise<QualityControlReport> {
  const res = await postJson<{ report: QualityControlReport }>(
    '/api/validate-rpm',
    { rpm, hasPerangkat },
    uid,
  );
  return res.report;
}

export async function apiReviseRpm(
  rpm: RpmCoreContent,
  targetSection: RevisionTargetSection,
  instruction: string,
  uid: string,
  options?: {
    pakIntegration?: PakIntegrationRecord | null;
    lkpd?: LkpdKit | null;
    lessonPlanId?: string;
  },
): Promise<{ rpm: RpmCoreContent; lkpd?: LkpdKit; crossValidation?: CrossDocumentValidationResult }> {
  return postJson<{ rpm: RpmCoreContent; lkpd?: LkpdKit; crossValidation?: CrossDocumentValidationResult }>(
    '/api/revise-rpm',
    {
      rpm,
      targetSection,
      instruction,
      pakIntegration: options?.pakIntegration,
      lkpd: options?.lkpd,
      lessonPlanId: options?.lessonPlanId,
    },
    uid,
  );
}

export async function apiSuggestField(
  fieldName: string,
  currentContext: Record<string, string>,
  currentValue: string,
  uid: string,
): Promise<{ suggestion: string; items?: string[]; rationale: string }> {
  return postJson('/api/suggest-field', { fieldName, currentContext, currentValue }, uid);
}

export async function apiAutoDetectPak(
  input: PakAutoDetectInput,
  uid: string,
): Promise<PakIntegrationRecord> {
  const res = await postJson<{ pakIntegration: PakIntegrationRecord }>(
    '/api/pak/auto-detect',
    input,
    uid,
  );
  return res.pakIntegration;
}
