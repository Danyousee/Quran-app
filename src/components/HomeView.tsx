import React, { useMemo, useState } from 'react';
import {
  ArrowRight,
  BookOpen,
  Headphones,
  Loader2,
  Play,
  Search,
  Sparkles,
} from 'lucide-react';
import {
  JUZ_LIST,
  RECITERS,
  TOTAL_QURAN_AYAHS,
  TOTAL_QURAN_SURAHS,
} from '../data/reciters';
import { searchQuranText } from '../lib/quranApi';
import { useAuthSync } from '../context/AuthSyncContext';
import { SearchMatch, SectionView, SurahMeta } from '../types/quran';

interface HomeViewProps {
  surahs: SurahMeta[];
  loadingSurahs: boolean;
  onOpenSurah: (
    surahNumber: number,
    ayahNumber?: number,
    options?: { autoPlay?: boolean; openMemorisation?: boolean; openTafsir?: boolean }
  ) => void;
  onNavigate: (section: SectionView) => void;
}

const HERO_IMG = '/src/assets/images/hero_quran_sanctuary_1795616596398.jpg';
const TAFSIR_IMG = '/src/assets/images/card_tafsir_manuscript_1795616597634.jpg';
const MEMO_IMG = '/src/assets/images/card_memorisation_study_1795616596598.jpg';

export const HomeView: React.FC<HomeViewProps> = ({
  surahs,
  loadingSurahs,
  onOpenSurah,
  onNavigate,
}) => {
  const { progress, bookmarks } = useAuthSync();

  const [filterType, setFilterType] = useState<'all' | 'Meccan' | 'Medinan' | 'juz'>('all');
  const [surahQuery, setSurahQuery] = useState('');
  const [verseSearchQuery, setVerseSearchQuery] = useState('');
  const [verseSearchEdition, setVerseSearchEdition] = useState<
    'en.sahih' | 'ha.gumi' | 'quran-simple-clean'
  >('en.sahih');
  const [searchingVerses, setSearchingVerses] = useState(false);
  const [verseResults, setVerseResults] = useState<{
    count: number;
    matches: SearchMatch[];
  } | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);

  const [heroImgFailed, setHeroImgFailed] = useState(false);
  const [tafsirImgFailed, setTafsirImgFailed] = useState(false);
  const [memoImgFailed, setMemoImgFailed] = useState(false);

  const lastSurahMeta = useMemo(
    () => surahs.find((s) => s.number === progress.lastSurah),
    [surahs, progress.lastSurah]
  );

  const filteredSurahs = useMemo(() => {
    const q = surahQuery.trim().toLowerCase();
    return surahs.filter((s) => {
      if (filterType === 'Meccan' && s.revelationType !== 'Meccan') return false;
      if (filterType === 'Medinan' && s.revelationType !== 'Medinan') return false;
      if (!q) return true;
      return (
        s.englishName.toLowerCase().includes(q) ||
        s.englishNameTranslation.toLowerCase().includes(q) ||
        s.name.includes(surahQuery.trim()) ||
        String(s.number) === q
      );
    });
  }, [surahs, filterType, surahQuery]);

  const khatmahPct = Math.min(
    100,
    Math.round((progress.readAyahKeys.length / TOTAL_QURAN_AYAHS) * 1000) / 10
  );

  const handleVerseSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    const q = verseSearchQuery.trim();
    if (q.length < 2) {
      setSearchError('Enter at least 2 characters to search across the Quran.');
      return;
    }
    setSearchingVerses(true);
    setSearchError(null);
    try {
      const res = await searchQuranText(q, verseSearchEdition);
      setVerseResults(res);
    } catch {
      setSearchError('Could not complete search right now. Please try again.');
    } finally {
      setSearchingVerses(false);
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 pb-28 pt-8 sm:px-6 lg:px-8">
      {/* Hero Split */}
      <section className="grid grid-cols-1 items-stretch gap-8 lg:grid-cols-12">
        <div className="flex flex-col justify-between rounded-2xl border border-stone-200 bg-stone-50/70 p-6 sm:p-10 lg:col-span-7 dark:border-slate-800 dark:bg-slate-900/70">
          <div>
            <p className="text-xs font-medium uppercase tracking-widest text-emerald-800 dark:text-emerald-400">
              Complete Uthmani Mushaf · 114 Surahs · 6,236 Ayahs
            </p>
            <h1 className="font-display text-balance mt-4 text-3xl font-semibold leading-tight tracking-tight text-stone-900 sm:text-5xl dark:text-stone-50">
              Read, listen, and memorise the Noble Quran with clarity.
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-relaxed text-stone-600 dark:text-stone-300">
              Click any Ayah to hear verified recitation from world-renowned Qaris, explore English, Hausa, and word-by-word translations alongside classical Tafsir, and track your reading and Hifz progress.
            </p>
          </div>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() =>
                onOpenSurah(progress.lastSurah, progress.lastAyah)
              }
              className="inline-flex h-11 items-center gap-2 rounded-lg bg-emerald-700 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 dark:bg-emerald-600 dark:hover:bg-emerald-500 whitespace-nowrap shrink-0"
            >
              <span>
                Resume{' '}
                {lastSurahMeta
                  ? `${lastSurahMeta.englishName} ${progress.lastSurah}:${progress.lastAyah}`
                  : `Surah ${progress.lastSurah}:${progress.lastAyah}`}
              </span>
              <ArrowRight className="h-4 w-4" />
            </button>

            <button
              type="button"
              onClick={() =>
                onOpenSurah(1, 1, { autoPlay: true })
              }
              className="inline-flex h-11 items-center gap-2 rounded-lg border border-stone-300 bg-white px-5 py-2.5 text-sm font-medium text-stone-800 transition-colors hover:bg-stone-100 dark:border-slate-700 dark:bg-slate-900 dark:text-stone-200 dark:hover:bg-slate-800 whitespace-nowrap shrink-0"
            >
              <Play className="h-4 w-4 text-emerald-700 dark:text-emerald-400" />
              <span>Listen to Al-Faatiha</span>
            </button>

            <button
              type="button"
              onClick={() => onNavigate('reciters')}
              className="inline-flex h-11 items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium text-stone-600 transition-colors hover:text-emerald-800 dark:text-stone-300 dark:hover:text-emerald-400 whitespace-nowrap shrink-0"
            >
              <Headphones className="h-4 w-4" />
              <span>{RECITERS.length} Reciters</span>
            </button>
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-stone-200 bg-stone-100 lg:col-span-5 dark:border-slate-800 dark:bg-slate-900">
          {!heroImgFailed ? (
            <img
              src={HERO_IMG}
              alt="Sunlit Islamic library courtyard with open Quran manuscript on a wooden rahle"
              referrerPolicy="no-referrer"
              onError={() => setHeroImgFailed(true)}
              className="h-64 w-full object-cover lg:h-full"
            />
          ) : (
            <div className="flex h-64 w-full flex-col items-center justify-center bg-gradient-to-br from-emerald-950 via-emerald-900 to-stone-900 p-8 text-center text-stone-100 lg:h-full">
              <BookOpen className="h-10 w-10 text-amber-400" />
              <p className="font-arabic mt-4 text-3xl text-amber-200" dir="rtl" lang="ar">
                بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ
              </p>
            </div>
          )}
        </div>
      </section>

      {/* Full-width 4-column Progress & Stats Strip */}
      <section
        aria-label="Reading progress summary"
        className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4"
      >
        <button
          type="button"
          onClick={() => onOpenSurah(progress.lastSurah, progress.lastAyah)}
          className="rounded-xl border border-stone-200 bg-white p-5 text-left transition-colors hover:border-emerald-700/40 dark:border-slate-800 dark:bg-slate-900/60 dark:hover:border-emerald-500/40"
        >
          <p className="text-xs font-medium text-stone-500 dark:text-stone-400">
            Last Read Position
          </p>
          <p className="font-mono-tabular mt-1.5 text-xl font-semibold text-stone-900 dark:text-stone-100">
            {progress.lastSurah}:{progress.lastAyah}
          </p>
          <p className="mt-1 truncate text-xs text-emerald-700 dark:text-emerald-400">
            {lastSurahMeta?.englishName ?? 'Al-Faatiha'} · Juz {progress.lastJuz}
          </p>
        </button>

        <div className="rounded-xl border border-stone-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900/60">
          <p className="text-xs font-medium text-stone-500 dark:text-stone-400">
            Khatmah Progress
          </p>
          <p className="font-mono-tabular mt-1.5 text-xl font-semibold text-stone-900 dark:text-stone-100">
            {khatmahPct}%
          </p>
          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-stone-100 dark:bg-slate-800">
            <div
              className="h-full bg-emerald-700 dark:bg-emerald-500"
              style={{ width: `${Math.max(2, khatmahPct)}%` }}
            />
          </div>
        </div>

        <div className="rounded-xl border border-stone-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900/60">
          <p className="text-xs font-medium text-stone-500 dark:text-stone-400">
            Surahs Completed
          </p>
          <p className="font-mono-tabular mt-1.5 text-xl font-semibold text-stone-900 dark:text-stone-100">
            {progress.completedSurahs.length} / {TOTAL_QURAN_SURAHS}
          </p>
          <p className="font-mono-tabular mt-1 text-xs text-stone-500 dark:text-stone-400">
            {progress.readAyahKeys.length} Ayahs engaged
          </p>
        </div>

        <button
          type="button"
          onClick={() => onNavigate('bookmarks')}
          className="rounded-xl border border-stone-200 bg-white p-5 text-left transition-colors hover:border-amber-600/40 dark:border-slate-800 dark:bg-slate-900/60 dark:hover:border-amber-500/40"
        >
          <p className="text-xs font-medium text-stone-500 dark:text-stone-400">
            Saved Bookmarks
          </p>
          <p className="font-mono-tabular mt-1.5 text-xl font-semibold text-stone-900 dark:text-stone-100">
            {bookmarks.length}
          </p>
          <p className="mt-1 text-xs text-amber-700 dark:text-amber-400">
            View personal collections
          </p>
        </button>
      </section>

      {/* Editorial Study Spotlights */}
      <section className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-2">
        <div className="flex flex-col overflow-hidden rounded-2xl border border-stone-200 bg-white sm:flex-row dark:border-slate-800 dark:bg-slate-900/60">
          <div className="h-48 w-full shrink-0 sm:h-auto sm:w-48 bg-stone-100 dark:bg-slate-800">
            {!tafsirImgFailed ? (
              <img
                src={TAFSIR_IMG}
                alt="Illuminated Quran manuscript with emerald and gold leaf ornamentation"
                referrerPolicy="no-referrer"
                onError={() => setTafsirImgFailed(true)}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-emerald-900/20 text-emerald-700 dark:text-emerald-400">
                <BookOpen className="h-8 w-8" />
              </div>
            )}
          </div>
          <div className="flex flex-1 flex-col justify-between p-6">
            <div>
              <p className="text-xs font-medium text-amber-700 dark:text-amber-400">
                Translation &amp; Tafsir
              </p>
              <h2 className="font-display mt-1.5 text-xl font-semibold text-stone-900 dark:text-stone-100">
                English, Hausa &amp; Word-by-Word Study
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-stone-600 dark:text-stone-300">
                Examine every Arabic root alongside Sahih International English, Abubakar Gumi Hausa, and Tafsir Ibn Kathir.
              </p>
            </div>
            <div className="mt-4">
              <button
                type="button"
                onClick={() => onOpenSurah(1, 1, { openTafsir: true })}
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-700 hover:text-emerald-800 dark:text-emerald-400 dark:hover:text-emerald-300"
              >
                <span>Open Tafsir Study</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        <div className="flex flex-col overflow-hidden rounded-2xl border border-stone-200 bg-white sm:flex-row dark:border-slate-800 dark:bg-slate-900/60">
          <div className="h-48 w-full shrink-0 sm:h-auto sm:w-48 bg-stone-100 dark:bg-slate-800">
            {!memoImgFailed ? (
              <img
                src={MEMO_IMG}
                alt="Minimalist linen notebook, brass bookmark, and wooden prayer beads for memorisation study"
                referrerPolicy="no-referrer"
                onError={() => setMemoImgFailed(true)}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-amber-900/20 text-amber-700 dark:text-amber-400">
                <Sparkles className="h-8 w-8" />
              </div>
            )}
          </div>
          <div className="flex flex-1 flex-col justify-between p-6">
            <div>
              <p className="text-xs font-medium text-emerald-700 dark:text-emerald-400">
                Hifz &amp; Revision Studio
              </p>
              <h2 className="font-display mt-1.5 text-xl font-semibold text-stone-900 dark:text-stone-100">
                Ayah Ranges, Loops &amp; Blind Recall
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-stone-600 dark:text-stone-300">
                Repeat individual verses or custom Ayah ranges with configurable loop counts and tap-to-reveal Arabic hiding.
              </p>
            </div>
            <div className="mt-4">
              <button
                type="button"
                onClick={() =>
                  onOpenSurah(progress.lastSurah || 78, 1, {
                    openMemorisation: true,
                  })
                }
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-700 hover:text-emerald-800 dark:text-emerald-400 dark:hover:text-emerald-300"
              >
                <span>Open Memorisation Mode</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Global Quran Verse Search */}
      <section className="mt-12 rounded-2xl border border-stone-200 bg-stone-50/70 p-6 sm:p-8 dark:border-slate-800 dark:bg-slate-900/50">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="font-display text-2xl font-semibold text-stone-900 dark:text-stone-100">
              Search the Holy Quran
            </h2>
            <p className="mt-1 text-sm text-stone-600 dark:text-stone-400">
              Search across all 6,236 Ayahs in English, Hausa, or Arabic script.
            </p>
          </div>
        </div>

        <form
          onSubmit={handleVerseSearch}
          className="mt-5 flex flex-col gap-3 sm:flex-row"
        >
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
            <input
              type="text"
              value={verseSearchQuery}
              onChange={(e) => setVerseSearchQuery(e.target.value)}
              placeholder="Search verses (e.g. mercy, patience, rahama, الرحمن)..."
              className="h-11 w-full rounded-lg border border-stone-200 bg-white pl-10 pr-4 text-sm text-stone-900 placeholder:text-stone-400 focus:border-emerald-700 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-stone-100"
            />
          </div>

          <select
            aria-label="Search language edition"
            value={verseSearchEdition}
            onChange={(e) =>
              setVerseSearchEdition(
                e.target.value as 'en.sahih' | 'ha.gumi' | 'quran-simple-clean'
              )
            }
            className="h-11 rounded-lg border border-stone-200 bg-white px-3 text-sm font-medium text-stone-800 focus:border-emerald-700 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-stone-200"
          >
            <option value="en.sahih">English (Sahih)</option>
            <option value="ha.gumi">Hausa (Gumi)</option>
            <option value="quran-simple-clean">Arabic</option>
          </select>

          <button
            type="submit"
            disabled={searchingVerses}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-emerald-700 px-6 text-sm font-semibold text-white transition-colors hover:bg-emerald-800 disabled:opacity-60 dark:bg-emerald-600 dark:hover:bg-emerald-500 whitespace-nowrap shrink-0"
          >
            {searchingVerses ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Searching...</span>
              </>
            ) : (
              <span>Search Verses</span>
            )}
          </button>
        </form>

        {searchError && (
          <p className="mt-3 text-sm text-red-700 dark:text-red-400">
            {searchError}
          </p>
        )}

        {verseResults && (
          <div className="mt-5 border-t border-stone-200 pt-5 dark:border-slate-800">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-stone-500 dark:text-stone-400">
                Found {verseResults.count} matching Ayahs
              </p>
              <button
                type="button"
                onClick={() => setVerseResults(null)}
                className="text-xs font-medium text-stone-500 hover:text-stone-800 dark:text-stone-400 dark:hover:text-stone-200"
              >
                Clear results
              </button>
            </div>
            {verseResults.matches.length === 0 ? (
              <p className="mt-3 text-sm text-stone-600 dark:text-stone-400">
                No verses matched your query. Try a shorter keyword or switch language edition.
              </p>
            ) : (
              <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
                {verseResults.matches.slice(0, 8).map((m) => (
                  <button
                    key={`${m.surahNumber}:${m.numberInSurah}`}
                    type="button"
                    onClick={() =>
                      onOpenSurah(m.surahNumber, m.numberInSurah)
                    }
                    className="rounded-xl border border-stone-200 bg-white p-4 text-left transition-colors hover:border-emerald-700/50 dark:border-slate-800 dark:bg-slate-950 dark:hover:border-emerald-500/50"
                  >
                    <div className="flex items-center justify-between text-xs text-emerald-700 dark:text-emerald-400">
                      <span className="font-semibold">
                        {m.surahEnglishName} ({m.surahNumber}:{m.numberInSurah})
                      </span>
                      <span className="font-arabic text-sm">{m.surahName}</span>
                    </div>
                    <p
                      className={`mt-2 line-clamp-2 text-sm text-stone-700 dark:text-stone-300 ${
                        verseSearchEdition === 'quran-simple-clean'
                          ? 'font-arabic text-right text-lg'
                          : ''
                      }`}
                      dir={
                        verseSearchEdition === 'quran-simple-clean'
                          ? 'rtl'
                          : 'ltr'
                      }
                    >
                      {m.text}
                    </p>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </section>

      {/* Complete 114 Surahs & 30 Juz Directory */}
      <section className="mt-12">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-display text-2xl font-semibold text-stone-900 dark:text-stone-100">
              Browse Surahs &amp; Juz
            </h2>
            <p className="mt-1 text-sm text-stone-600 dark:text-stone-400">
              Select any chapter to read, listen verse-by-verse, or save offline.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1 rounded-lg bg-stone-100 p-1 dark:bg-slate-900">
              {(
                [
                  { id: 'all', label: 'All 114' },
                  { id: 'Meccan', label: 'Meccan' },
                  { id: 'Medinan', label: 'Medinan' },
                  { id: 'juz', label: '30 Juz' },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setFilterType(tab.id)}
                  className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                    filterType === tab.id
                      ? 'bg-white text-stone-900 shadow-xs dark:bg-slate-800 dark:text-white'
                      : 'text-stone-600 hover:text-stone-900 dark:text-stone-400 dark:hover:text-stone-100'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {filterType !== 'juz' && (
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-stone-400" />
                <input
                  type="text"
                  value={surahQuery}
                  onChange={(e) => setSurahQuery(e.target.value)}
                  placeholder="Filter Surah..."
                  aria-label="Filter Surahs by name or number"
                  className="h-9 w-44 rounded-lg border border-stone-200 bg-white pl-8 pr-3 text-xs text-stone-900 placeholder:text-stone-400 focus:border-emerald-700 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-stone-100"
                />
              </div>
            )}
          </div>
        </div>

        {filterType === 'juz' ? (
          <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {JUZ_LIST.map((j) => {
              const sMeta = surahs.find((s) => s.number === j.surah);
              return (
                <button
                  key={j.juz}
                  type="button"
                  onClick={() => onOpenSurah(j.surah, j.ayah)}
                  className="flex items-center justify-between rounded-xl border border-stone-200 bg-white p-4 text-left transition-colors hover:border-emerald-700/50 dark:border-slate-800 dark:bg-slate-900/60 dark:hover:border-emerald-500/50"
                >
                  <div className="flex items-center gap-3.5">
                    <span className="font-mono-tabular flex h-10 w-10 items-center justify-center rounded-lg bg-stone-100 text-sm font-semibold text-stone-800 dark:bg-slate-800 dark:text-stone-200">
                      {j.juz}
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-stone-900 dark:text-stone-100">
                        Juz {j.juz} · {j.name}
                      </p>
                      <p className="mt-0.5 text-xs text-stone-500 dark:text-stone-400">
                        Starts at {sMeta?.englishName ?? `Surah ${j.surah}`} {j.surah}:{j.ayah}
                      </p>
                    </div>
                  </div>
                  <ArrowRight className="h-4 w-4 text-stone-400" />
                </button>
              );
            })}
          </div>
        ) : loadingSurahs ? (
          <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 9 }).map((_, idx) => (
              <div
                key={idx}
                className="h-20 animate-pulse rounded-xl border border-stone-200 bg-stone-100 dark:border-slate-800 dark:bg-slate-900"
              />
            ))}
          </div>
        ) : (
          <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {filteredSurahs.map((surah) => {
              const isDone = progress.completedSurahs.includes(surah.number);
              return (
                <button
                  key={surah.number}
                  type="button"
                  onClick={() => onOpenSurah(surah.number, 1)}
                  className="group flex items-center justify-between rounded-xl border border-stone-200 bg-white p-4 text-left transition-colors hover:border-emerald-700/50 hover:bg-stone-50/50 dark:border-slate-800 dark:bg-slate-900/60 dark:hover:border-emerald-500/50 dark:hover:bg-slate-900"
                >
                  <div className="flex min-w-0 items-center gap-3.5">
                    <span
                      className={`font-mono-tabular flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-sm font-semibold transition-colors ${
                        isDone
                          ? 'bg-emerald-700 text-white dark:bg-emerald-600'
                          : 'bg-stone-100 text-stone-800 group-hover:bg-emerald-50 group-hover:text-emerald-800 dark:bg-slate-800 dark:text-stone-200 dark:group-hover:bg-emerald-950/60 dark:group-hover:text-emerald-300'
                      }`}
                    >
                      {surah.number}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-stone-900 dark:text-stone-100">
                        {surah.englishName}
                      </p>
                      <p className="truncate text-xs text-stone-500 dark:text-stone-400">
                        {surah.englishNameTranslation} · {surah.revelationType} ·{' '}
                        <span className="font-mono-tabular">{surah.numberOfAyahs} Ayahs</span>
                      </p>
                    </div>
                  </div>

                  <span
                    className="font-arabic ml-3 shrink-0 text-xl text-emerald-800 dark:text-emerald-400"
                    dir="rtl"
                    lang="ar"
                  >
                    {surah.name.replace('سُورَةُ ', '')}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
};
