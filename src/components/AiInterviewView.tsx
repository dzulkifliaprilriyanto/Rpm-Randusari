import React, { useEffect, useState } from 'react';
import { CheckCircle2, Loader2, RotateCcw, Send, Sparkles } from 'lucide-react';
import type {
  AutoGeneratorInput,
  InterviewMessage,
  InterviewSessionState,
  PakIntegrationRecord,
  PhaseCode,
  SchoolClass,
  TeacherProfile,
} from '../types/rpm';
import { apiAiInterviewTurn } from '../services/api';
import { derivePhaseFromGrade, extractGradeNumber } from '../utils/pedagogy';
import { PakAutoDetectPanel } from './PakAutoDetectPanel';

function createInitialInterviewState(
  profile: TeacherProfile,
  classes: SchoolClass[],
): InterviewSessionState {
  const firstClass = classes[0];
  const collectedInfo: Record<string, string> = {
    namaSekolah: profile.namaSekolah || 'SDN Randusari',
    namaGuru: profile.namaGuru || '',
  };
  if (firstClass) {
    collectedInfo.kelas = firstClass.className;
    collectedInfo.fase = `Fase ${firstClass.phase}`;
    collectedInfo.karakteristikSiswa = `${firstClass.className}, ${firstClass.studentCount} peserta didik`;
  }

  const greetingText = `Selamat datang${profile.namaGuru ? `, ${profile.namaGuru}` : ''}. Saya siap mendampingi Anda menyusun Rencana Pembelajaran Mendalam untuk ${profile.namaSekolah || 'SDN Randusari'}. Mata pelajaran dan materi apa yang akan Anda ajarkan pada pertemuan ini?`;

  return {
    messages: [
      {
        id: `msg-init-${Date.now()}`,
        role: 'assistant',
        text: greetingText,
        explanation:
          'Menentukan mata pelajaran dan materi di awal membantu saya menyesuaikan fase, contoh aktivitas konkret SD, serta pilihan model Pembelajaran Mendalam.',
        choices: [
          'IPAS — Perubahan Wujud Benda / Siklus Air',
          'Matematika — Pecahan dalam Kehidupan Sehari-hari',
          'Bahasa Indonesia — Teks Narasi & Ide Pokok',
          'Pendidikan Pancasila — Keragaman & Gotong Royong',
        ],
        timestamp: new Date().toISOString(),
      },
    ],
    collectedInfo,
    missingFields: ['mataPelajaran', 'materi', 'tujuanPembelajaran', 'modelPembelajaran'],
    readyToGenerate: false,
    summaryText: '',
    updatedAt: new Date().toISOString(),
  };
}

export function AiInterviewView({
  profile,
  classes,
  uid,
  savedDraft,
  isGeneratingRpm,
  onSaveDraft,
  onGenerateFromInterview,
  onNotify,
}: {
  profile: TeacherProfile;
  classes: SchoolClass[];
  uid: string;
  savedDraft: InterviewSessionState | null;
  isGeneratingRpm: boolean;
  onSaveDraft: (draft: InterviewSessionState) => void;
  onGenerateFromInterview: (input: AutoGeneratorInput) => Promise<void>;
  onNotify: (type: 'success' | 'error' | 'warning' | 'info', title: string, message?: string) => void;
}) {
  const [session, setSession] = useState<InterviewSessionState>(() =>
    savedDraft && savedDraft.messages.length > 0
      ? savedDraft
      : createInitialInterviewState(profile, classes),
  );
  const [inputText, setInputText] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [pakIntegration, setPakIntegration] = useState<PakIntegrationRecord | null>(null);

  useEffect(() => {
    onSaveDraft(session);
  }, [session, onSaveDraft]);

  const sendAnswer = async (text: string) => {
    const clean = text.trim();
    if (!clean || isThinking || isGeneratingRpm) return;

    const userMsg: InterviewMessage = {
      id: `msg-u-${Date.now()}`,
      role: 'user',
      text: clean,
      timestamp: new Date().toISOString(),
    };

    const nextHistory = [...session.messages, userMsg];
    setSession((prev) => ({
      ...prev,
      messages: nextHistory,
      updatedAt: new Date().toISOString(),
    }));
    setInputText('');
    setIsThinking(true);

    try {
      const response = await apiAiInterviewTurn(
        nextHistory.map((m) => ({ role: m.role, text: m.text })),
        session.collectedInfo,
        uid,
      );

      const mergedInfo: Record<string, string> = { ...session.collectedInfo };
      for (const [k, v] of Object.entries(response.collectedInfo || {})) {
        if (typeof v === 'string' && v.trim()) {
          mergedInfo[k] = v.trim();
        }
      }

      const botMsg: InterviewMessage = {
        id: `msg-a-${Date.now()}`,
        role: 'assistant',
        text: response.reply,
        explanation: response.explanation,
        choices: response.choices || [],
        timestamp: new Date().toISOString(),
      };

      setSession({
        messages: [...nextHistory, botMsg],
        collectedInfo: mergedInfo,
        missingFields: response.missingFields || [],
        readyToGenerate: Boolean(response.readyToGenerate),
        summaryText: response.summaryText || '',
        updatedAt: new Date().toISOString(),
      });
    } catch (err) {
      onNotify(
        'error',
        'Wawancara AI Terganggu',
        err instanceof Error ? err.message : 'Silakan kirim ulang jawaban Anda.',
      );
    } finally {
      setIsThinking(false);
    }
  };

  const handleReset = () => {
    const fresh = createInitialInterviewState(profile, classes);
    setSession(fresh);
    onNotify('info', 'Wawancara Dimulai Ulang', 'Sesi wawancara AI baru siap digunakan.');
  };

  const handleConfirmGenerate = async () => {
    const info = session.collectedInfo;
    const kelasVal = info.kelas || classes[0]?.className || 'Kelas 5';
    const rawFase = (info.fase || '').replace(/[^ABC]/gi, '').toUpperCase();
    const fase: PhaseCode =
      rawFase === 'A' || rawFase === 'B' || rawFase === 'C'
        ? (rawFase as PhaseCode)
        : derivePhaseFromGrade(extractGradeNumber(kelasVal));

    await onGenerateFromInterview({
      namaGuru: profile.namaGuru || info.namaGuru || 'Guru SDN Randusari',
      namaSekolah: profile.namaSekolah || info.namaSekolah || 'SDN Randusari',
      kelas: kelasVal,
      fase,
      semester: classes[0]?.semester || '1',
      tahunAjaran: classes[0]?.academicYear || '2026/2027',
      mataPelajaran: info.mataPelajaran || profile.mataPelajaranUtama || 'IPAS',
      materi: info.materi || 'Pembelajaran Kontekstual SD',
      alokasiWaktu: info.alokasiWaktu || '2 x 35 menit (1 Pertemuan)',
      capaianPembelajaran: info.capaianPembelajaran || '',
      tujuanPembelajaran: info.tujuanPembelajaran || '',
      karakteristikPesertaDidik: [info.karakteristikSiswa, info.kondisiSekolah]
        .filter(Boolean)
        .join(' '),
      modelPembelajaran: info.modelPembelajaran || 'Biarkan AI Merekomendasikan',
      metodePembelajaran: info.pengalamanBelajar || '',
      pakIntegration: pakIntegration || undefined,
    });
  };

  const lastAssistantMsg = [...session.messages].reverse().find((m) => m.role === 'assistant');

  const interviewKelas = session.collectedInfo.kelas || classes[0]?.className || 'Kelas 5';
  const interviewRawFase = (session.collectedInfo.fase || '').replace(/[^ABC]/gi, '').toUpperCase();
  const interviewFase: PhaseCode =
    interviewRawFase === 'A' || interviewRawFase === 'B' || interviewRawFase === 'C'
      ? (interviewRawFase as PhaseCode)
      : derivePhaseFromGrade(extractGradeNumber(interviewKelas));

  return (
    <div className="space-y-6">
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Main Interview Conversation */}
      <section className="lg:col-span-2 flex flex-col rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden min-h-[560px]">
        <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
          <div>
            <h1 className="text-lg font-bold text-slate-900 dark:text-slate-100">
              AI Interview — Konsultan Pedagogis
            </h1>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              Jawab bertahap atau klik pilihan rekomendasi. Jawaban tersimpan otomatis.
            </p>
          </div>
          <button
            type="button"
            onClick={handleReset}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 whitespace-nowrap shrink-0"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Mulai Ulang</span>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4 max-h-[480px]">
          {session.messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[88%] rounded-xl px-4 py-3 text-sm leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-emerald-700 text-white'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100'
                }`}
              >
                <p>{msg.text}</p>
                {msg.role === 'assistant' && msg.explanation && (
                  <p className="mt-2 pt-2 border-t border-slate-200 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-300">
                    Catatan pedagogis: {msg.explanation}
                  </p>
                )}
              </div>
            </div>
          ))}

          {isThinking && (
            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
              <Loader2 className="w-4 h-4 animate-spin text-emerald-700" />
              <span>Konsultan AI sedang menganalisis jawaban Anda...</span>
            </div>
          )}
        </div>

        {/* Quick Recommendation Choices */}
        {!isThinking && lastAssistantMsg?.choices && lastAssistantMsg.choices.length > 0 && (
          <div className="px-5 py-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/50">
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-2">
              Pilihan Cepat (klik untuk menjawab atau ketik sendiri di bawah):
            </p>
            <div className="flex flex-wrap gap-2">
              {lastAssistantMsg.choices.map((choice) => (
                <button
                  key={choice}
                  type="button"
                  onClick={() => sendAnswer(choice)}
                  className="px-3 py-1.5 rounded-lg border border-emerald-200 dark:border-emerald-800 bg-white dark:bg-slate-800 text-xs font-medium text-emerald-800 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/60 text-left transition-colors"
                >
                  {choice}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Chat Input */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            sendAnswer(inputText);
          }}
          className="p-4 border-t border-slate-200 dark:border-slate-800 flex items-center gap-2"
        >
          <label htmlFor="interview-input" className="sr-only">
            Ketik jawaban Anda
          </label>
          <input
            id="interview-input"
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Tulis jawaban atau kebutuhan kelas Anda di sini..."
            disabled={isThinking || isGeneratingRpm}
            className="flex-1 px-3.5 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm text-slate-900 dark:text-slate-100"
          />
          <button
            type="submit"
            disabled={!inputText.trim() || isThinking || isGeneratingRpm}
            aria-label="Kirim jawaban"
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white text-sm font-semibold transition-colors shrink-0"
          >
            <Send className="w-4 h-4" />
            <span className="hidden sm:inline">Kirim</span>
          </button>
        </form>
      </section>

      {/* Collected Summary & Generate Trigger */}
      <aside className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col justify-between gap-4">
        <div className="space-y-4">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
              Ringkasan Kebutuhan RPM
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Terisi otomatis dari profil & jawaban wawancara.
            </p>
          </div>

          <dl className="space-y-2.5 text-xs">
            {Object.entries(session.collectedInfo)
              .filter(([, v]) => v && v.trim().length > 0)
              .map(([k, v]) => (
                <div key={k} className="pb-2 border-b border-slate-100 dark:border-slate-800">
                  <dt className="font-semibold text-slate-500 dark:text-slate-400 capitalize">
                    {k.replace(/([A-Z])/g, ' $1')}
                  </dt>
                  <dd className="text-slate-900 dark:text-slate-100 mt-0.5">{v}</dd>
                </div>
              ))}
          </dl>

          {session.summaryText && (
            <div className="p-3.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-950 dark:text-emerald-100 space-y-1">
              <div className="flex items-center gap-1.5 font-bold">
                <CheckCircle2 className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
                <span>Siap Disusun Menjadi RPM</span>
              </div>
              <p className="leading-relaxed">{session.summaryText}</p>
            </div>
          )}
        </div>

          {pakIntegration && (
            <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/40 text-xs">
              <p className="font-semibold text-slate-800 dark:text-slate-200">
                Integrasi PAK:{' '}
                <span className="text-emerald-700 dark:text-emerald-400">
                  {pakIntegration.applied
                    ? 'Diterapkan ke RPM'
                    : pakIntegration.ignored
                      ? 'Diabaikan'
                      : pakIntegration.relevanceLabel}
                </span>
              </p>
            </div>
          )}

          <button
            type="button"
            disabled={isGeneratingRpm || !session.collectedInfo.materi}
            onClick={handleConfirmGenerate}
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white text-sm font-semibold transition-colors"
          >
            {isGeneratingRpm ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Menyusun RPM...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>
                  {session.readyToGenerate ? 'Konfirmasi & Hasilkan RPM' : 'Hasilkan RPM Sekarang'}
                </span>
              </>
            )}
          </button>
      </aside>
    </div>

    <PakAutoDetectPanel
      uid={uid}
      compactHeader={true}
      autoTrigger={true}
      context={{
        mataPelajaran: session.collectedInfo.mataPelajaran || profile.mataPelajaranUtama || '',
        kelas: interviewKelas,
        fase: interviewFase,
        materi: session.collectedInfo.materi || '',
        capaianPembelajaran: session.collectedInfo.capaianPembelajaran || '',
        tujuanPembelajaran: session.collectedInfo.tujuanPembelajaran || '',
        karakteristikPesertaDidik: [
          session.collectedInfo.karakteristikSiswa,
          session.collectedInfo.kondisiSekolah,
        ]
          .filter(Boolean)
          .join(' '),
        modelPembelajaran: session.collectedInfo.modelPembelajaran || '',
        metodePembelajaran: session.collectedInfo.pengalamanBelajar || '',
      }}
      value={pakIntegration}
      onChange={setPakIntegration}
      onNotify={onNotify}
    />
    </div>
  );
}
