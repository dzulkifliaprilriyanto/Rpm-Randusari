export type AiConnectionStatus =
  | 'belum_terhubung'
  | 'menghubungkan'
  | 'berhasil_terhubung'
  | 'koneksi_gagal'
  | 'sesi_berakhir'
  | 'memerlukan_konfigurasi';

export const AI_STATUS_LABELS: Record<AiConnectionStatus, string> = {
  belum_terhubung: 'Belum terhubung',
  menghubungkan: 'Menghubungkan akun Google',
  berhasil_terhubung: 'Berhasil terhubung',
  koneksi_gagal: 'Koneksi gagal',
  sesi_berakhir: 'Sesi berakhir',
  memerlukan_konfigurasi: 'Memerlukan konfigurasi tambahan',
};

export interface AiBackendCapabilities {
  hasServerApiKey: boolean;
  model: string;
  oauthServerConfigured: boolean;
  oauthClientConfigured: boolean;
  redirectUri: string;
  supportedNote: string;
}

export interface AiTestResult {
  ok: boolean;
  status: AiConnectionStatus;
  model?: string;
  latencyMs?: number;
  message: string;
}

export interface AiConnectionState {
  status: AiConnectionStatus;
  connectedEmail: string | null;
  connectedName: string | null;
  authMethod: 'none' | 'google_oauth' | 'backend_env_fallback';
  lastVerifiedAt: string | null;
  latencyMs: number | null;
  model: string;
  statusMessage: string;
  capabilities: AiBackendCapabilities | null;
}

export async function apiFetchAiCapabilities(): Promise<AiBackendCapabilities> {
  const res = await fetch('/api/ai/connection', { cache: 'no-store' });
  if (!res.ok) {
    throw new Error('Tidak dapat memeriksa konfigurasi server AI.');
  }
  return (await res.json()) as AiBackendCapabilities;
}

export async function apiRunLiveGeminiTest(): Promise<AiTestResult> {
  const res = await fetch('/api/ai/test', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
  const data = (await res.json().catch(() => ({}))) as {
    ok?: boolean;
    status?: AiConnectionStatus;
    model?: string;
    latencyMs?: number;
    message?: string;
    error?: string;
  };

  if (res.ok && data.ok) {
    return {
      ok: true,
      status: 'berhasil_terhubung',
      model: data.model,
      latencyMs: data.latencyMs,
      message: data.message || 'Koneksi Gemini API berhasil diverifikasi.',
    };
  }

  return {
    ok: false,
    status: data.status || 'koneksi_gagal',
    message: data.error || 'Pengujian koneksi ke Gemini API belum berhasil.',
  };
}

export async function apiGetGoogleAuthUrl(): Promise<{
  configured: boolean;
  url?: string;
  redirectUri: string;
  message?: string;
}> {
  const res = await fetch('/api/auth/google/url', { cache: 'no-store' });
  if (!res.ok) {
    throw new Error('Gagal menyiapkan sesi autentikasi Google.');
  }
  return (await res.json()) as {
    configured: boolean;
    url?: string;
    redirectUri: string;
    message?: string;
  };
}

declare global {
  interface Window {
    google?: {
      accounts?: {
        oauth2?: {
          initTokenClient: (config: {
            client_id: string;
            scope: string;
            prompt?: string;
            callback: (resp: {
              access_token?: string;
              expires_in?: number;
              error?: string;
            }) => void;
          }) => { requestAccessToken: () => void };
        };
      };
    };
  }
}

export async function connectWithClientGisIfAvailable(clientId: string): Promise<{
  email: string;
  name?: string;
  expiresIn: number;
}> {
  if (!document.getElementById('google-gis-script')) {
    await new Promise<void>((resolve, reject) => {
      const script = document.createElement('script');
      script.id = 'google-gis-script';
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('Gagal memuat Google Identity Services.'));
      document.head.appendChild(script);
    });
  }

  const tokenClientFactory = window.google?.accounts?.oauth2?.initTokenClient;
  if (!tokenClientFactory) {
    throw new Error('Google Identity Services belum siap di browser.');
  }

  // Strictly ephemeral token kept in closure only (never stored in localStorage/IndexedDB/Cache)
  return new Promise((resolve, reject) => {
    const client = tokenClientFactory({
      client_id: clientId,
      scope: 'openid email profile',
      prompt: 'select_account',
      callback: async (resp) => {
        if (resp.error || !resp.access_token) {
          reject(new Error('Pemilihan akun Google dibatalkan atau gagal.'));
          return;
        }
        try {
          const userRes = await fetch('https://openidconnect.googleapis.com/v1/userinfo', {
            headers: { Authorization: `Bearer ${resp.access_token}` },
          });
          const profile = (await userRes.json()) as { email?: string; name?: string };
          if (!userRes.ok || !profile.email) {
            reject(new Error('Email akun Google tidak diperoleh dari proses autentikasi.'));
            return;
          }
          resolve({
            email: profile.email,
            name: profile.name,
            expiresIn: resp.expires_in ?? 3600,
          });
        } catch {
          reject(new Error('Gagal mengambil profil akun Google dari server OAuth resmi.'));
        }
      },
    });
    client.requestAccessToken();
  });
}
