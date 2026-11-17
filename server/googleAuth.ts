import crypto from 'crypto';
import { Router, type Request, type Response } from 'express';

interface PendingOAuthState {
  createdAt: number;
  origin: string;
}

const pendingStates = new Map<string, PendingOAuthState>();
const STATE_TTL_MS = 10 * 60 * 1000;

function cleanupExpiredStates() {
  const now = Date.now();
  for (const [key, val] of pendingStates.entries()) {
    if (now - val.createdAt > STATE_TTL_MS) {
      pendingStates.delete(key);
    }
  }
}

export function resolveAppBaseUrl(req: Request): string {
  const envUrl = (process.env.APP_URL || '').trim().replace(/\/+$/, '');
  if (envUrl && envUrl !== 'MY_APP_URL') {
    return envUrl;
  }
  const proto = (req.headers['x-forwarded-proto'] as string)?.split(',')[0]?.trim() || req.protocol || 'http';
  const host = (req.headers['x-forwarded-host'] as string)?.split(',')[0]?.trim() || req.get('host') || 'localhost:3000';
  return `${proto}://${host}`;
}

export function isServerGoogleOAuthConfigured(): boolean {
  const clientId = (process.env.GOOGLE_CLIENT_ID || '').trim();
  const clientSecret = (process.env.GOOGLE_CLIENT_SECRET || '').trim();
  return Boolean(clientId && clientSecret);
}

export function createGoogleAuthUrl(req: Request): {
  configured: boolean;
  url?: string;
  redirectUri: string;
  message?: string;
} {
  cleanupExpiredStates();
  const baseUrl = resolveAppBaseUrl(req);
  const redirectUri = `${baseUrl}/auth/google/callback`;
  const clientId = (process.env.GOOGLE_CLIENT_ID || '').trim();
  const clientSecret = (process.env.GOOGLE_CLIENT_SECRET || '').trim();

  if (!clientId || !clientSecret) {
    return {
      configured: false,
      redirectUri,
      message:
        'Konfigurasi Google OAuth Server (GOOGLE_CLIENT_ID & GOOGLE_CLIENT_SECRET) belum tersedia di environment.',
    };
  }

  const state = crypto.randomBytes(24).toString('hex');
  pendingStates.set(state, {
    createdAt: Date.now(),
    origin: baseUrl,
  });

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'openid email profile',
    access_type: 'online',
    prompt: 'select_account',
    state,
  });

  return {
    configured: true,
    redirectUri,
    url: `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`,
  };
}

function renderPopupCallbackHtml(payload: {
  ok: boolean;
  email?: string;
  name?: string;
  expiresIn?: number;
  error?: string;
}) {
  const safeJson = JSON.stringify({
    type: 'GOOGLE_AUTH_CALLBACK',
    ...payload,
  }).replace(/</g, '\\u003c');

  const statusText = payload.ok
    ? `Akun ${payload.email || 'Google'} berhasil dipilih. Jendela ini akan tertutup otomatis.`
    : payload.error || 'Autentikasi Google dibatalkan atau gagal.';

  return `<!doctype html>
<html lang="id">
<head>
  <meta charset="utf-8" />
  <title>Hubungkan Google Account — AI RPM SDN Randusari</title>
  <style>
    body { font-family: system-ui, sans-serif; display:flex; align-items:center; justify-content:center; min-height:100vh; margin:0; background:#f8fafc; color:#0f172a; }
    .card { max-width:420px; padding:24px; border-radius:12px; background:#fff; border:1px solid #e2e8f0; text-align:center; }
    h1 { font-size:16px; margin:0 0 8px; color:${payload.ok ? '#047857' : '#dc2626'}; }
    p { font-size:13px; color:#475569; margin:0; line-height:1.5; }
  </style>
</head>
<body>
  <div class="card">
    <h1>${payload.ok ? 'Autentikasi Google Berhasil' : 'Autentikasi Belum Berhasil'}</h1>
    <p>${statusText}</p>
  </div>
  <script>
    (function () {
      var data = ${safeJson};
      try {
        if (window.opener && !window.opener.closed) {
          window.opener.postMessage(data, window.location.origin);
        }
      } catch (e) {}
      setTimeout(function () {
        window.close();
      }, 600);
    })();
  </script>
</body>
</html>`;
}

export function createGoogleAuthCallbackRouter(): Router {
  const router = Router();

  router.get(['/callback', '/callback/'], async (req: Request, res: Response) => {
    const errorParam = typeof req.query.error === 'string' ? req.query.error : '';
    const code = typeof req.query.code === 'string' ? req.query.code : '';
    const state = typeof req.query.state === 'string' ? req.query.state : '';

    if (errorParam) {
      return res.status(200).send(
        renderPopupCallbackHtml({
          ok: false,
          error:
            errorParam === 'access_denied'
              ? 'Pemilihan akun Google dibatalkan oleh pengguna.'
              : `Autentikasi Google ditolak (${errorParam}).`,
        }),
      );
    }

    const storedState = pendingStates.get(state);
    pendingStates.delete(state);
    if (!state || !storedState || Date.now() - storedState.createdAt > STATE_TTL_MS) {
      return res.status(400).send(
        renderPopupCallbackHtml({
          ok: false,
          error: 'Sesi verifikasi OAuth tidak valid atau telah kedaluwarsa. Silakan ulangi.',
        }),
      );
    }

    if (!code) {
      return res.status(400).send(
        renderPopupCallbackHtml({
          ok: false,
          error: 'Kode otorisasi Google tidak ditemukan.',
        }),
      );
    }

    const clientId = (process.env.GOOGLE_CLIENT_ID || '').trim();
    const clientSecret = (process.env.GOOGLE_CLIENT_SECRET || '').trim();
    const redirectUri = `${resolveAppBaseUrl(req)}/auth/google/callback`;

    if (!clientId || !clientSecret) {
      return res.status(500).send(
        renderPopupCallbackHtml({
          ok: false,
          error: 'Kredensial Google OAuth server belum lengkap.',
        }),
      );
    }

    try {
      const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          code,
          client_id: clientId,
          client_secret: clientSecret,
          redirect_uri: redirectUri,
          grant_type: 'authorization_code',
        }),
      });

      const tokenJson = (await tokenRes.json()) as {
        access_token?: string;
        expires_in?: number;
        error_description?: string;
      };

      if (!tokenRes.ok || !tokenJson.access_token) {
        return res.status(400).send(
          renderPopupCallbackHtml({
            ok: false,
            error: tokenJson.error_description || 'Gagal menukar kode OAuth Google.',
          }),
        );
      }

      // Fetch only basic verified profile email/name server-side; never persist or leak access token to browser storage
      const userRes = await fetch('https://openidconnect.googleapis.com/v1/userinfo', {
        headers: { Authorization: `Bearer ${tokenJson.access_token}` },
      });

      const userInfo = (await userRes.json()) as { email?: string; name?: string };
      if (!userRes.ok || !userInfo.email) {
        return res.status(400).send(
          renderPopupCallbackHtml({
            ok: false,
            error: 'Akun Google berhasil diautentikasi tetapi alamat email tidak tersedia.',
          }),
        );
      }

      return res.status(200).send(
        renderPopupCallbackHtml({
          ok: true,
          email: userInfo.email,
          name: userInfo.name,
          expiresIn: typeof tokenJson.expires_in === 'number' ? tokenJson.expires_in : 3600,
        }),
      );
    } catch {
      return res.status(502).send(
        renderPopupCallbackHtml({
          ok: false,
          error: 'Terjadi kesalahan jaringan saat memverifikasi akun Google.',
        }),
      );
    }
  });

  return router;
}
