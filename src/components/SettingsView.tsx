import React, { useEffect, useState } from 'react';
import {
  Check,
  Cloud,
  Download,
  Loader2,
  LogIn,
  LogOut,
  Moon,
  Sun,
  Trash2,
} from 'lucide-react';
import { RECITERS } from '../data/reciters';
import {
  cacheSurahOffline,
  clearOfflineQuranCache,
  getOfflineCachedSurahs,
} from '../lib/quranApi';
import { useAuthSync } from '../context/AuthSyncContext';
import { useAudioPlayer } from '../context/AudioPlayerContext';
import { TranslationMode } from '../types/quran';

export const SettingsView: React.FC = () => {
  const {
    user,
    syncing,
    progress,
    signInWithGoogle,
    logout,
    updatePreferences,
  } = useAuthSync();

  const {
    reciterId,
    switchReciter,
    continuousSurah,
    setContinuousSurah,
    autoAdvanceSurah,
    setAutoAdvanceSurah,
  } = useAudioPlayer();

  const [cachedSurahs, setCachedSurahs] = useState<number[]>([]);
  const [downloadingJuzAmma, setDownloadingJuzAmma] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);

  useEffect(() => {
    getOfflineCachedSurahs().then(setCachedSurahs);
  }, []);

  const handleCacheJuzAmma = async () => {
    setDownloadingJuzAmma(true);
    setDownloadProgress(0);
    const total = 114 - 78 + 1;
    let done = 0;
    for (let s = 78; s <= 114; s++) {
      await cacheSurahOffline(s).catch(() => null);
      done += 1;
      setDownloadProgress(Math.round((done / total) * 100));
    }
    const updated = await getOfflineCachedSurahs();
    setCachedSurahs(updated);
    setDownloadingJuzAmma(false);
  };

  const handleClearCache = async () => {
    await clearOfflineQuranCache();
    setCachedSurahs([]);
  };

  const isDark = progress.theme === 'dark';

  return (
    <div className="mx-auto max-w-4xl px-4 pb-32 pt-8 sm:px-6 lg:px-8">
      <div className="border-b border-stone-200 pb-6 dark:border-slate-800">
        <p className="text-xs font-medium uppercase tracking-widest text-emerald-700 dark:text-emerald-400">
          Preferences &amp; Storage
        </p>
        <h1 className="font-display mt-2 text-3xl font-semibold text-stone-900 dark:text-stone-100">
          Settings
        </h1>
        <p className="mt-1.5 text-sm text-stone-600 dark:text-stone-400">
          Customise Arabic typography, default translations, audio behaviour, offline storage, and cloud sync.
        </p>
      </div>

      <div className="mt-8 space-y-6">
        {/* Cloud Sync Account */}
        <section className="rounded-2xl border border-stone-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900/60">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-display text-lg font-semibold text-stone-900 dark:text-stone-100">
                Cloud Sync &amp; Account
              </h2>
              <p className="mt-1 text-sm text-stone-600 dark:text-stone-400">
                {user
                  ? `Signed in as ${user.email}. Bookmarks and reading progress sync automatically.`
                  : 'Sign in with Google to back up and sync your bookmarks, collections, and reading position across devices.'}
              </p>
            </div>

            {user ? (
              <button
                type="button"
                onClick={logout}
                className="inline-flex h-10 items-center gap-2 rounded-lg border border-stone-300 px-4 text-xs font-semibold text-stone-700 hover:bg-stone-100 dark:border-slate-700 dark:text-stone-200 dark:hover:bg-slate-800 whitespace-nowrap shrink-0"
              >
                <LogOut className="h-4 w-4" />
                <span>{syncing ? 'Syncing...' : 'Sign Out'}</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={signInWithGoogle}
                className="inline-flex h-10 items-center gap-2 rounded-lg bg-emerald-700 px-4 text-xs font-semibold text-white hover:bg-emerald-800 dark:bg-emerald-600 whitespace-nowrap shrink-0"
              >
                <LogIn className="h-4 w-4" />
                <span>Sign in with Google</span>
              </button>
            )}
          </div>
          {user && (
            <div className="mt-4 flex items-center gap-2 text-xs text-emerald-700 dark:text-emerald-400">
              <Cloud className="h-4 w-4" />
              <span>Cloud database connected and synchronized</span>
            </div>
          )}
        </section>

        {/* Appearance & Typography */}
        <section className="rounded-2xl border border-stone-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900/60">
          <h2 className="font-display text-lg font-semibold text-stone-900 dark:text-stone-100">
            Appearance &amp; Arabic Typography
          </h2>

          <div className="mt-5 flex items-center justify-between gap-4 border-b border-stone-100 pb-5 dark:border-slate-800">
            <div>
              <p className="text-sm font-medium text-stone-900 dark:text-stone-100">
                Theme Mode
              </p>
              <p className="text-xs text-stone-500 dark:text-stone-400">
                Choose crisp daylight white or serene night reading mode.
              </p>
            </div>
            <div className="flex items-center gap-1 rounded-lg bg-stone-100 p-1 dark:bg-slate-800">
              <button
                type="button"
                onClick={() => updatePreferences({ theme: 'light' })}
                className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                  !isDark
                    ? 'bg-white text-stone-900 shadow-xs'
                    : 'text-stone-400 hover:text-stone-200'
                }`}
              >
                <Sun className="h-3.5 w-3.5" />
                <span>Light</span>
              </button>
              <button
                type="button"
                onClick={() => updatePreferences({ theme: 'dark' })}
                className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                  isDark
                    ? 'bg-slate-950 text-white shadow-xs'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                <Moon className="h-3.5 w-3.5" />
                <span>Dark</span>
              </button>
            </div>
          </div>

          <div className="mt-5">
            <div className="flex items-center justify-between">
              <label
                htmlFor="arabic-size-slider"
                className="text-sm font-medium text-stone-900 dark:text-stone-100"
              >
                Arabic Script Size
              </label>
              <span className="font-mono-tabular text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                {progress.arabicFontSize}px
              </span>
            </div>
            <input
              id="arabic-size-slider"
              type="range"
              min={24}
              max={48}
              step={2}
              value={progress.arabicFontSize}
              onChange={(e) =>
                updatePreferences({ arabicFontSize: Number(e.target.value) })
              }
              className="mt-3 w-full accent-emerald-700 dark:accent-emerald-500"
            />
            <div className="mt-4 rounded-xl border border-stone-200 bg-stone-50 p-5 text-right dark:border-slate-800 dark:bg-slate-950">
              <p
                className="font-arabic leading-[2.1] text-stone-900 dark:text-stone-100"
                style={{ fontSize: `${progress.arabicFontSize}px` }}
                dir="rtl"
                lang="ar"
              >
                ٱلْحَمْدُ لِلَّهِ رَبِّ ٱلْعَالَمِينَ ﴿٢﴾
              </p>
            </div>
          </div>
        </section>

        {/* Translation & Recitation Defaults */}
        <section className="rounded-2xl border border-stone-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900/60">
          <h2 className="font-display text-lg font-semibold text-stone-900 dark:text-stone-100">
            Translation &amp; Recitation Defaults
          </h2>

          <div className="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-2">
            <div>
              <label
                htmlFor="default-translation"
                className="block text-xs font-medium text-stone-600 dark:text-stone-300"
              >
                Display Translation
              </label>
              <select
                id="default-translation"
                value={progress.preferredTranslation}
                onChange={(e) =>
                  updatePreferences({
                    preferredTranslation: e.target.value as TranslationMode,
                  })
                }
                className="mt-2 h-10 w-full rounded-lg border border-stone-200 bg-stone-50 px-3 text-sm text-stone-900 focus:border-emerald-700 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-stone-100"
              >
                <option value="both">English &amp; Hausa</option>
                <option value="english">English (Sahih International)</option>
                <option value="hausa">Hausa (Abubakar Mahmoud Gumi)</option>
                <option value="arabic-only">Arabic Uthmani Only</option>
              </select>
            </div>

            <div>
              <label
                htmlFor="default-reciter"
                className="block text-xs font-medium text-stone-600 dark:text-stone-300"
              >
                Preferred Reciter
              </label>
              <select
                id="default-reciter"
                value={reciterId}
                onChange={(e) => switchReciter(e.target.value)}
                className="mt-2 h-10 w-full rounded-lg border border-stone-200 bg-stone-50 px-3 text-sm text-stone-900 focus:border-emerald-700 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-stone-100"
              >
                {RECITERS.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="mt-6 space-y-4 border-t border-stone-100 pt-5 dark:border-slate-800">
            <label className="flex cursor-pointer items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-stone-900 dark:text-stone-100">
                  Continuous Surah Playback
                </p>
                <p className="text-xs text-stone-500 dark:text-stone-400">
                  Automatically continue to the next Ayah when the current recitation finishes.
                </p>
              </div>
              <input
                type="checkbox"
                checked={continuousSurah}
                onChange={(e) => setContinuousSurah(e.target.checked)}
                className="h-5 w-5 accent-emerald-700"
              />
            </label>

            <label className="flex cursor-pointer items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-stone-900 dark:text-stone-100">
                  Auto-Advance to Next Surah
                </p>
                <p className="text-xs text-stone-500 dark:text-stone-400">
                  Continue directly into the following Surah after the final Ayah completes.
                </p>
              </div>
              <input
                type="checkbox"
                checked={autoAdvanceSurah}
                onChange={(e) => setAutoAdvanceSurah(e.target.checked)}
                className="h-5 w-5 accent-emerald-700"
              />
            </label>
          </div>
        </section>

        {/* Offline Reading Support */}
        <section className="rounded-2xl border border-stone-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900/60">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-display text-lg font-semibold text-stone-900 dark:text-stone-100">
                Offline Reading Cache
              </h2>
              <p className="mt-1 text-sm text-stone-600 dark:text-stone-400">
                <span className="font-mono-tabular font-semibold text-emerald-700 dark:text-emerald-400">
                  {cachedSurahs.length} / 114
                </span>{' '}
                Surahs currently cached in your browser for instant offline reading.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleCacheJuzAmma}
                disabled={downloadingJuzAmma}
                className="inline-flex h-10 items-center gap-2 rounded-lg bg-emerald-700 px-4 text-xs font-semibold text-white hover:bg-emerald-800 disabled:opacity-60 dark:bg-emerald-600"
              >
                {downloadingJuzAmma ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Caching Juz Amma ({downloadProgress}%)</span>
                  </>
                ) : cachedSurahs.length >= 37 &&
                  cachedSurahs.includes(78) &&
                  cachedSurahs.includes(114) ? (
                  <>
                    <Check className="h-4 w-4" />
                    <span>Juz Amma Cached</span>
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4" />
                    <span>Save Juz Amma Offline (78–114)</span>
                  </>
                )}
              </button>

              {cachedSurahs.length > 0 && (
                <button
                  type="button"
                  onClick={handleClearCache}
                  className="inline-flex h-10 items-center gap-1.5 rounded-lg border border-stone-200 px-3 text-xs font-medium text-stone-600 hover:bg-stone-100 dark:border-slate-700 dark:text-stone-300 dark:hover:bg-slate-800"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  <span>Clear Cache</span>
                </button>
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};
