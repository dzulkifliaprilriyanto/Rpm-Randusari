import { GoogleGenAI, Type, ThinkingLevel } from '@google/genai';

const DEPRECATED_MODELS = new Set([
  'gemini-1.5-flash',
  'gemini-1.5-pro',
  'gemini-pro',
  'gemini-2.0-flash',
  'gemini-2.0-pro',
  'gemini-2.0-flash-thinking',
]);

export function resolveGeminiModel(): string {
  const configured = (process.env.GEMINI_MODEL || '').trim();
  if (!configured || DEPRECATED_MODELS.has(configured)) {
    return 'gemini-4-hydrogen';
  }
  return configured;
}

export function getGeminiClient(timeoutMs = 45_000): GoogleGenAI {
  const apiKey = (process.env.GEMINI_API_KEY || '').trim();
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    throw new GeminiServiceError(
      'GEMINI_NOT_CONFIGURED',
      'Kunci layanan AI belum dikonfigurasi pada server. Silakan periksa pengaturan GEMINI_API_KEY pada panel Secrets.',
      503,
    );
  }

  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
      timeout: timeoutMs,
      retryOptions: {
        attempts: 2,
        initialDelay: 0.5,
        maxDelay: 2.0,
      },
    },
  });
}

function getCandidateModels(): string[] {
  const primary = resolveGeminiModel();
  const explicitlyConfigured = (process.env.GEMINI_MODEL || '').trim();
  if (!explicitlyConfigured && primary === 'gemini-4-hydrogen') {
    return ['gemini-4-hydrogen', 'gemini-3.1-flash-lite'];
  }
  return [primary];
}

function isTransientQuotaOrTimeout(errMsg: string): boolean {
  return (
    errMsg.includes('RESOURCE_EXHAUSTED') ||
    errMsg.includes('429') ||
    errMsg.includes('503') ||
    errMsg.includes('UNAVAILABLE') ||
    errMsg.includes('high demand') ||
    errMsg.includes('AbortError') ||
    errMsg.includes('aborted') ||
    errMsg.includes('timeout')
  );
}

export class GeminiServiceError extends Error {
  public readonly code: string;
  public readonly statusCode: number;

  constructor(code: string, message: string, statusCode = 500) {
    super(message);
    this.name = 'GeminiServiceError';
    this.code = code;
    this.statusCode = statusCode;
  }
}

export interface GenerateStructuredOptions {
  systemInstruction: string;
  userPrompt: string;
  responseSchema?: Record<string, unknown>;
  thinkingLevel?: ThinkingLevel;
  maxRetries?: number;
}

function extractJsonText(raw: string): string {
  const trimmed = raw.trim();
  if (trimmed.startsWith('```')) {
    return trimmed
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```$/, '')
      .trim();
  }
  return trimmed;
}

export async function generateStructuredJson<T>(
  options: GenerateStructuredOptions,
): Promise<T> {
  const ai = getGeminiClient(45_000);
  const candidates = getCandidateModels();
  const maxRetries = options.maxRetries ?? 1;

  let lastError: unknown = null;

  for (let mIdx = 0; mIdx < candidates.length; mIdx++) {
    const model = candidates[mIdx];
    const hasFallbackModel = mIdx < candidates.length - 1;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const config: Record<string, unknown> = {
          systemInstruction: options.systemInstruction,
          responseMimeType: 'application/json',
        };

        if (options.responseSchema) {
          config.responseSchema = options.responseSchema;
        }

        if (options.thinkingLevel && model.startsWith('gemini-4')) {
          config.thinkingConfig = { thinkingLevel: options.thinkingLevel };
        }

        const response = await ai.models.generateContent({
          model,
          contents: options.userPrompt,
          config,
        });

        const rawText = (response.text ?? '').trim();
        if (!rawText) {
          throw new Error('Respons AI kosong.');
        }

        const cleanJson = extractJsonText(rawText);
        const parsed = JSON.parse(cleanJson) as T;
        return parsed;
      } catch (error) {
        lastError = error;
        const errMsg = error instanceof Error ? error.message : String(error);

        // Do not retry non-transient auth errors
        if (
          errMsg.includes('API_KEY_INVALID') ||
          errMsg.includes('PERMISSION_DENIED') ||
          errMsg.includes('403')
        ) {
          throw new GeminiServiceError(
            'GEMINI_AUTH_ERROR',
            'Akses ke layanan AI ditolak. Pastikan kunci API di pengaturan server valid.',
            403,
          );
        }

        if (isTransientQuotaOrTimeout(errMsg)) {
          if (hasFallbackModel) {
            console.warn(`[GeminiService] ${model} terhambat (${errMsg.slice(0, 120)}), mencoba fallback ke ${candidates[mIdx + 1]}`);
            break;
          }
          if (errMsg.includes('RESOURCE_EXHAUSTED') || errMsg.includes('429')) {
            throw new GeminiServiceError(
              'GEMINI_QUOTA_ERROR',
              'Kuota permintaan AI sedang penuh. Silakan tunggu beberapa saat lalu coba kembali.',
              429,
            );
          }
          throw new GeminiServiceError(
            'GEMINI_TEMPORARY_UNAVAILABLE',
            'Server AI sedang padat atau lambat merespons. Silakan coba kembali beberapa saat lagi.',
            503,
          );
        }

        if (attempt < maxRetries) {
          const delayMs = 500 * Math.pow(2, attempt);
          await new Promise((resolve) => setTimeout(resolve, delayMs));
        }
      }
    }
  }

  const msg = lastError instanceof Error ? lastError.message : 'Gagal memproses respons AI.';
  console.error('[GeminiService] Gagal setelah retry:', msg);
  throw new GeminiServiceError(
    'GEMINI_GENERATION_FAILED',
    'Layanan AI belum berhasil menyusun respons yang valid saat ini. Silakan coba lagi atau sederhanakan instruksi.',
    502,
  );
}

export async function testGeminiConnection(): Promise<{
  connected: boolean;
  model: string;
  latencyMs: number;
}> {
  const ai = getGeminiClient(18_000);
  const candidates = getCandidateModels();
  const startedAt = Date.now();
  let lastError: unknown = null;

  for (let mIdx = 0; mIdx < candidates.length; mIdx++) {
    const model = candidates[mIdx];
    const hasFallbackModel = mIdx < candidates.length - 1;
    try {
      const config: Record<string, unknown> = {};
      if (model.startsWith('gemini-4')) {
        config.thinkingConfig = { thinkingLevel: ThinkingLevel.LOW };
      }

      const response = await ai.models.generateContent({
        model,
        contents: 'Balas tepat satu kata: OK',
        config,
      });

      const text = (response.text ?? '').trim();
      if (!text) {
        throw new GeminiServiceError(
          'GEMINI_EMPTY_RESPONSE',
          'Server AI merespons tanpa isi. Periksa status layanan atau model Gemini.',
          502,
        );
      }

      return {
        connected: true,
        model,
        latencyMs: Date.now() - startedAt,
      };
    } catch (error) {
      lastError = error;
      if (error instanceof GeminiServiceError) throw error;
      const errMsg = error instanceof Error ? error.message : String(error);
      if (
        errMsg.includes('API_KEY_INVALID') ||
        errMsg.includes('PERMISSION_DENIED') ||
        errMsg.includes('403') ||
        errMsg.includes('401')
      ) {
        throw new GeminiServiceError(
          'GEMINI_AUTH_ERROR',
          'Kredensial GEMINI_API_KEY di server ditolak atau tidak valid.',
          403,
        );
      }
      if (isTransientQuotaOrTimeout(errMsg) && hasFallbackModel) {
        continue;
      }
      if (errMsg.includes('RESOURCE_EXHAUSTED') || errMsg.includes('429')) {
        throw new GeminiServiceError(
          'GEMINI_QUOTA_ERROR',
          'Kuota permintaan Gemini API sedang terlampaui.',
          429,
        );
      }
      if (errMsg.includes('503') || errMsg.includes('UNAVAILABLE') || errMsg.includes('high demand')) {
        throw new GeminiServiceError(
          'GEMINI_TEMPORARY_UNAVAILABLE',
          'Server model Gemini sedang mengalami lonjakan trafik sementara (503). Silakan coba Periksa Koneksi beberapa saat lagi.',
          503,
        );
      }
    }
  }

  const msg = lastError instanceof Error ? lastError.message : '';
  console.error('[GeminiService] testGeminiConnection gagal:', msg);
  throw new GeminiServiceError(
    'GEMINI_CONNECTION_FAILED',
    'Pengujian koneksi ke Gemini API gagal merespons. Periksa koneksi jaringan atau coba beberapa saat lagi.',
    502,
  );
}

export { Type, ThinkingLevel };

