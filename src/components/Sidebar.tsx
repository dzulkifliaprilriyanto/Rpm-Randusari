import React from 'react';
import {
  BookOpenCheck,
  FileEdit,
  FolderKanban,
  HelpCircle,
  History,
  LayoutDashboard,
  MessageSquareHeart,
  PlusCircle,
  Settings,
  ShieldCheck,
  Sparkles,
  UserCheck,
  Users,
  X,
} from 'lucide-react';
import type { NavPageId } from '../types/rpm';

export interface NavMenuItem {
  id: NavPageId;
  label: string;
  icon: React.ReactNode;
  group: 'utama' | 'generator' | 'pustaka' | 'akun';
}

export const NAV_ITEMS: NavMenuItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard className="w-4 h-4" />, group: 'utama' },
  { id: 'buat-rpm', label: 'Buat RPM', icon: <PlusCircle className="w-4 h-4" />, group: 'utama' },
  { id: 'ai-interview', label: 'AI Interview', icon: <MessageSquareHeart className="w-4 h-4" />, group: 'generator' },
  { id: 'generator-otomatis', label: 'Generator Otomatis', icon: <Sparkles className="w-4 h-4" />, group: 'generator' },
  { id: 'pengisian-manual', label: 'Pengisian Manual', icon: <FileEdit className="w-4 h-4" />, group: 'generator' },
  { id: 'integrasi-pak', label: 'AI Integrasi PAK', icon: <ShieldCheck className="w-4 h-4" />, group: 'generator' },
  { id: 'riwayat-rpm', label: 'Riwayat RPM', icon: <History className="w-4 h-4" />, group: 'pustaka' },
  { id: 'template-saya', label: 'Template Saya', icon: <FolderKanban className="w-4 h-4" />, group: 'pustaka' },
  { id: 'manajemen-kelas', label: 'Manajemen Kelas', icon: <Users className="w-4 h-4" />, group: 'akun' },
  { id: 'profil-guru', label: 'Profil Guru', icon: <UserCheck className="w-4 h-4" />, group: 'akun' },
  { id: 'pengaturan', label: 'Pengaturan', icon: <Settings className="w-4 h-4" />, group: 'akun' },
  { id: 'pusat-bantuan', label: 'Pusat Bantuan', icon: <HelpCircle className="w-4 h-4" />, group: 'akun' },
];

function SdnRandusariCrest() {
  return (
    <svg
      viewBox="0 0 40 40"
      className="w-9 h-9 shrink-0"
      aria-hidden="true"
    >
      <rect x="2" y="2" width="36" height="36" rx="9" fill="#047857" />
      <path
        d="M11 13.5C11 12.1 12.1 11 13.5 11H19V28H13.5C12.1 28 11 26.9 11 25.5V13.5Z"
        fill="#FFFFFF"
      />
      <path
        d="M29 13.5C29 12.1 27.9 11 26.5 11H21V28H26.5C27.9 28 29 26.9 29 25.5V13.5Z"
        fill="#ECFDF5"
      />
      <circle cx="20" cy="9" r="3" fill="#FBBF24" />
      <path d="M13 31H27" stroke="#FBBF24" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  );
}

export function Sidebar({
  activePage,
  onNavigate,
  mobileOpen,
  onCloseMobile,
  schoolName,
  hasActiveDoc,
}: {
  activePage: NavPageId;
  onNavigate: (page: NavPageId) => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
  schoolName: string;
  hasActiveDoc: boolean;
}) {
  const groups: { key: NavMenuItem['group']; label: string }[] = [
    { key: 'utama', label: 'Menu Utama' },
    { key: 'generator', label: 'Metode Penyusunan' },
    { key: 'pustaka', label: 'Arsip & Template' },
    { key: 'akun', label: 'Kelas & Pengaturan' },
  ];

  const navContent = (
    <div className="flex flex-col h-full bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800">
      <div className="flex items-center justify-between gap-3 px-4 py-4 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-3 min-w-0">
          <SdnRandusariCrest />
          <div className="min-w-0">
            <p className="font-display font-bold text-sm text-slate-900 dark:text-slate-100 truncate">
              AI RPM
            </p>
            <p className="text-xs text-emerald-700 dark:text-emerald-400 font-medium truncate">
              {schoolName || 'SDN Randusari'}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onCloseMobile}
          aria-label="Tutup menu navigasi"
          className="lg:hidden p-2 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5" aria-label="Navigasi Utama">
        {hasActiveDoc && (
          <div>
            <button
              type="button"
              onClick={() => {
                onNavigate('dokumen-rpm');
                onCloseMobile();
              }}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors text-left ${
                activePage === 'dokumen-rpm'
                  ? 'bg-emerald-700 text-white'
                  : 'bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 border border-amber-200 dark:border-amber-800/70 hover:bg-amber-100 dark:hover:bg-amber-950/60'
              }`}
            >
              <BookOpenCheck className="w-4 h-4 shrink-0" />
              <span className="truncate">Dokumen RPM Aktif</span>
            </button>
          </div>
        )}

        {groups.map((grp) => {
          const items = NAV_ITEMS.filter((i) => i.group === grp.key);
          return (
            <div key={grp.key}>
              <p className="px-3 mb-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400">
                {grp.label}
              </p>
              <ul className="space-y-1">
                {items.map((item) => {
                  const isActive = activePage === item.id;
                  return (
                    <li key={item.id}>
                      <button
                        type="button"
                        onClick={() => {
                          onNavigate(item.id);
                          onCloseMobile();
                        }}
                        aria-current={isActive ? 'page' : undefined}
                        className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                          isActive
                            ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 font-semibold'
                            : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/80'
                        }`}
                      >
                        <span className={isActive ? 'text-emerald-700 dark:text-emerald-400' : 'text-slate-500 dark:text-slate-400'}>
                          {item.icon}
                        </span>
                        <span className="truncate">{item.label}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </nav>
    </div>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden lg:block w-64 shrink-0 no-print">{navContent}</aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden flex no-print">
          <div
            className="fixed inset-0 bg-slate-950/50"
            onClick={onCloseMobile}
            aria-hidden="true"
          />
          <aside className="relative z-50 w-72 max-w-[85vw] h-full">{navContent}</aside>
        </div>
      )}
    </>
  );
}
