import React, { useState } from 'react';
import { BookOpen, Menu, Moon, Sun, X } from 'lucide-react';
import { SectionView } from '../types/quran';
import { useAuthSync } from '../context/AuthSyncContext';

interface NavbarProps {
  activeSection: SectionView;
  onNavigate: (section: SectionView) => void;
  onResumeReading: () => void;
}

const NAV_ITEMS: Array<{ id: SectionView; label: string }> = [
  { id: 'home', label: 'Home' },
  { id: 'quran', label: 'Quran' },
  { id: 'reciters', label: 'Reciters' },
  { id: 'bookmarks', label: 'Bookmarks' },
  { id: 'settings', label: 'Settings' },
];

export const Navbar: React.FC<NavbarProps> = ({
  activeSection,
  onNavigate,
  onResumeReading,
}) => {
  const { progress, updatePreferences } = useAuthSync();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isDark = progress.theme === 'dark';

  const handleNavClick = (section: SectionView) => {
    onNavigate(section);
    setMobileMenuOpen(false);
  };

  return (
    <header className="sticky top-0 z-40 border-b border-stone-200/80 bg-white/95 backdrop-blur-md transition-colors dark:border-slate-800 dark:bg-slate-950/95">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-8 px-4 sm:px-6 lg:px-8">
        {/* Zone 1: Single-line brand wordmark */}
        <button
          type="button"
          onClick={() => handleNavClick('home')}
          className="font-display flex items-center gap-2.5 text-lg font-semibold tracking-tight text-stone-900 transition-colors hover:text-emerald-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 dark:text-stone-100 dark:hover:text-emerald-400 whitespace-nowrap shrink-0"
        >
          <BookOpen className="h-5 w-5 text-emerald-700 dark:text-emerald-400" aria-hidden="true" />
          <span>Al-Bayan Quran</span>
        </button>

        {/* Zone 2: Clean single-line navigation links */}
        <nav
          aria-label="Main navigation"
          className="hidden md:flex items-center gap-7"
        >
          {NAV_ITEMS.map((item) => {
            const isActive = activeSection === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleNavClick(item.id)}
                className={`relative py-1 text-sm font-medium transition-colors whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-emerald-700 ${
                  isActive
                    ? 'text-emerald-800 dark:text-emerald-400'
                    : 'text-stone-600 hover:text-stone-900 dark:text-stone-300 dark:hover:text-white'
                }`}
              >
                {item.label}
                {isActive && (
                  <span
                    aria-hidden="true"
                    className="absolute inset-x-0 -bottom-[17px] h-0.5 bg-emerald-700 dark:bg-emerald-400"
                  />
                )}
              </button>
            );
          })}
        </nav>

        {/* Zone 3: Single primary action + mobile menu trigger */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() =>
              updatePreferences({ theme: isDark ? 'light' : 'dark' })
            }
            aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
            className="hidden sm:inline-flex h-10 w-10 items-center justify-center rounded-lg text-stone-600 transition-colors hover:bg-stone-100 hover:text-stone-900 focus-visible:outline-2 focus-visible:outline-emerald-700 dark:text-stone-300 dark:hover:bg-slate-800 dark:hover:text-white"
          >
            {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>

          <button
            type="button"
            onClick={onResumeReading}
            className="inline-flex h-10 items-center justify-center rounded-lg bg-emerald-700 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-emerald-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 dark:bg-emerald-600 dark:hover:bg-emerald-500 whitespace-nowrap shrink-0"
          >
            Continue {progress.lastSurah}:{progress.lastAyah}
          </button>

          <button
            type="button"
            onClick={() => setMobileMenuOpen((v) => !v)}
            aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
            aria-expanded={mobileMenuOpen}
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-stone-200 text-stone-700 transition-colors hover:bg-stone-100 md:hidden dark:border-slate-700 dark:text-stone-200 dark:hover:bg-slate-800"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Responsive mobile navigation drawer */}
      {mobileMenuOpen && (
        <nav
          aria-label="Mobile navigation"
          className="border-t border-stone-200 bg-white px-4 py-3 md:hidden dark:border-slate-800 dark:bg-slate-950"
        >
          <div className="flex flex-col gap-1">
            {NAV_ITEMS.map((item) => {
              const isActive = activeSection === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleNavClick(item.id)}
                  className={`flex h-11 items-center justify-between rounded-lg px-3 text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300'
                      : 'text-stone-700 hover:bg-stone-100 dark:text-stone-200 dark:hover:bg-slate-900'
                  }`}
                >
                  <span>{item.label}</span>
                  {isActive && (
                    <span className="text-xs text-emerald-700 dark:text-emerald-400">
                      Active
                    </span>
                  )}
                </button>
              );
            })}
            <button
              type="button"
              onClick={() =>
                updatePreferences({ theme: isDark ? 'light' : 'dark' })
              }
              className="mt-1 flex h-11 items-center justify-between rounded-lg border border-stone-200 px-3 text-sm font-medium text-stone-700 dark:border-slate-800 dark:text-stone-200"
            >
              <span>Appearance</span>
              <span className="inline-flex items-center gap-1.5 text-xs text-stone-500 dark:text-stone-400">
                {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                {isDark ? 'Dark' : 'Light'}
              </span>
            </button>
          </div>
        </nav>
      )}
    </header>
  );
};
