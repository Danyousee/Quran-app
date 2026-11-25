import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  BookOpen,
  Bookmark,
  Check,
  ChevronLeft,
  ChevronRight,
  Copy,
  Download,
  Eye,
  EyeOff,
  Languages,
  Loader2,
  Pause,
  Play,
  Repeat,
  Search,
  SlidersHorizontal,
  Volume2,
  X,
} from 'lucide-react';
import { JUZ_LIST, RECITERS } from '../data/reciters';
import {
  cacheSurahOffline,
  fetchAyahTafsir,
  fetchSurahDetail,
  fetchSurahWords,
  getOfflineCachedSurahs,
  searchQuranText,
} from '../lib/quranApi';
import { useAuthSync } from '../context/AuthSyncContext';
import { useAudioPlayer } from '../context/AudioPlayerContext';
import {
  RepeatCount,
  SearchMatch,
  SurahDetail,
  SurahMeta,
  SurahWordsMap,
  TafsirData,
  TranslationMode,
} from '../types/quran';

interface QuranReaderViewProps {
  surahs: SurahMeta[];
  surahNumber: number;
  targetAyah?: number;
  initialOpenMemorisation?: boolean;
  initialOpenTafsir?: boolean;
  onSelectSurah: (surahNumber: number, ayahNumber?: number) => void;
}

function toArabicIndicNumerals(n: number): string {
  const digits = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
  return String(n)
    .split('')
    .map((d) => digits[Number(d)] ?? d)
    .join('');
}

const REPEAT_COUNTS: RepeatCount[] = [1, 2, 3, 5, 10, 'infinite'];

export const QuranReaderView: React.FC<QuranReaderViewProps> = ({
  surahs,
  surahNumber,
  targetAyah,
  initialOpenMemorisation = false,
  initialOpenTafsir = false,
  onSelectSurah,
}) => {
  const {
    progress,
    isBookmarked,
    toggleBookmark,
    toggleSurahCompleted,
    updateLastRead,
    updatePreferences,
  } = useAuthSync();

  const {
    activeTrack,
    reciterId,
    isPlaying,
    isLoading: audioLoading,
    repeatAyahCount,
    memorisationRange,
    playAyah,
    switchReciter,
    togglePlayPause,
    setRepeatAyahCount,
    setMemorisationRange,
  } = useAudioPlayer();

  const [detail, setDetail] = useState<SurahDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [wordByWordEnabled, setWordByWordEnabled] = useState(false);
  const [wordsMap, setWordsMap] = useState<SurahWordsMap | null>(null);
  const [loadingWords, setLoadingWords] = useState(false);

  const [openTafsirAyah, setOpenTafsirAyah] = useState<number | null>(
    initialOpenTafsir ? 1 : null
  );
  const [tafsirCache, setTafsirCache] = useState<Record<string, TafsirData>>({});
  const [loadingTafsir, setLoadingTafsir] = useState(false);

  const [showMemorisationPanel, setShowMemorisationPanel] = useState(
    initialOpenMemorisation
  );
  const [hideArabicText, setHideArabicText] = useState(false);
  const [revealedAyahs, setRevealedAyahs] = useState<Record<number, boolean>>({});

  const [showSearchBar, setShowSearchBar] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchEdition, setSearchEdition] = useState<
    'en.sahih' | 'ha.gumi' | 'quran-simple-clean'
  >('en.sahih');
  const [searchResults, setSearchResults] = useState<SearchMatch[] | null>(null);
  const [searching, setSearching] = useState(false);

  const [offlineSurahs, setOfflineSurahs] = useState<number[]>([]);
  const [savingOffline, setSavingOffline] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const ayahRefs = useRef<Record<number, HTMLDivElement | null>>({});

  useEffect(() => {
    setShowMemorisationPanel(initialOpenMemorisation);
  }, [initialOpenMemorisation]);

  useEffect(() => {
    if (initialOpenTafsir) {
      setOpenTafsirAyah(targetAyah ?? 1);
    }
  }, [initialOpenTafsir, targetAyah]);

  // Load Surah Uthmani + English + Hausa
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadError(null);
    setRevealedAyahs({});
    setOpenTafsirAyah(initialOpenTafsir ? targetAyah ?? 1 : null);

    fetchSurahDetail(surahNumber)
      .then((data) => {
        if (cancelled) return;
        setDetail(data);
        setLoading(false);
        const firstAyah = data.ayahs[0];
        updateLastRead(
          surahNumber,
          targetAyah ?? 1,
          firstAyah?.juz ?? progress.lastJuz
        );
        setMemorisationRange((prev) => ({
          ...prev,
          startAyah: 1,
          endAyah: Math.min(5, data.ayahs.length),
        }));
      })
      .catch(() => {
        if (cancelled) return;
        setLoading(false);
        setLoadError('Unable to load this Surah. Check your connection and retry.');
      });

    getOfflineCachedSurahs().then((list) => {
      if (!cancelled) setOfflineSurahs(list);
    });

    return () => {
      cancelled = true;
    };
  }, [surahNumber]);

  // Load Word-by-Word when enabled
  useEffect(() => {
    if (!wordByWordEnabled) return;
    let cancelled = false;
    setLoadingWords(true);
    fetchSurahWords(surahNumber)
      .then((map) => {
        if (!cancelled) {
          setWordsMap(map);
          setLoadingWords(false);
        }
      })
      .catch(() => {
        if (!cancelled) setLoadingWords(false);
      });
    return () => {
      cancelled = true;
    };
  }, [wordByWordEnabled, surahNumber]);

  // Load Tafsir when an Ayah Tafsir panel is opened
  useEffect(() => {
    if (!openTafsirAyah) return;
    const key = `${surahNumber}:${openTafsirAyah}`;
    if (tafsirCache[key]) return;
    let cancelled = false;
    setLoadingTafsir(true);
    fetchAyahTafsir(surahNumber, openTafsirAyah)
      .then((data) => {
        if (!cancelled) {
          setTafsirCache((prev) => ({ ...prev, [key]: data }));
          setLoadingTafsir(false);
        }
      })
      .catch(() => {
        if (!cancelled) setLoadingTafsir(false);
      });
    return () => {
      cancelled = true;
    };
  }, [openTafsirAyah, surahNumber, tafsirCache]);

  // Scroll to target Ayah on navigation
  useEffect(() => {
    if (!loading && detail && targetAyah) {
      const el = ayahRefs.current[targetAyah];
      if (el) {
        window.setTimeout(() => {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 120);
      }
    }
  }, [loading, detail, targetAyah]);

  // Auto-scroll to currently playing Ayah whenever playback moves
  useEffect(() => {
    if (!activeTrack || activeTrack.surah !== surahNumber) return;
    const el = ayahRefs.current[activeTrack.ayah];
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [activeTrack?.surah, activeTrack?.ayah, surahNumber]);

  const handleSaveOffline = async () => {
    setSavingOffline(true);
    try {
      await cacheSurahOffline(surahNumber);
      const updated = await getOfflineCachedSurahs();
      setOfflineSurahs(updated);
    } finally {
      setSavingOffline(false);
    }
  };

  const handleSearchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim().length < 2) return;
    setSearching(true);
    try {
      const res = await searchQuranText(searchQuery.trim(), searchEdition);
      setSearchResults(res.matches);
    } catch {
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  };

  const handleCopyAyah = useCallback(
    (arabic: string, english: string, ayahNum: number) => {
      const text = `${arabic}\n\n"${english}"\n— Quran ${surahNumber}:${ayahNum}`;
      navigator.clipboard?.writeText(text).then(() => {
        const key = `${surahNumber}:${ayahNum}`;
        setCopiedKey(key);
        window.setTimeout(() => setCopiedKey(null), 1800);
      });
    },
    [surahNumber]
  );

  const juzSpanText = useMemo(() => {
    if (!detail || detail.ayahs.length === 0) return '';
    const first = detail.ayahs[0].juz;
    const last = detail.ayahs[detail.ayahs.length - 1].juz;
    return first === last ? `Juz ${first}` : `Juz ${first}–${last}`;
  }, [detail]);

  const isSurahSavedOffline = offlineSurahs.includes(surahNumber);
  const isSurahCompleted = progress.completedSurahs.includes(surahNumber);
  const translationMode = progress.preferredTranslation;

  const startMemorisationRange = () => {
    if (!detail) return;
    const start = Math.max(
      1,
      Math.min(memorisationRange.startAyah, detail.ayahs.length)
    );
    const end = Math.max(
      start,
      Math.min(memorisationRange.endAyah, detail.ayahs.length)
    );
    setMemorisationRange((prev) => ({
      ...prev,
      enabled: true,
      startAyah: start,
      endAyah: end,
    }));
    playAyah(surahNumber, start, detail.surah);
  };

  return (
    <div className="mx-auto max-w-5xl px-4 pb-32 pt-6 sm:px-6 lg:px-8">
      {/* Top Reader Navigation & Controls Bar */}
      <div className="rounded-2xl border border-stone-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900/70">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Surah & Ayah & Juz Selectors */}
          <div className="flex flex-wrap items-center gap-2">
            <select
              aria-label="Select Surah"
              value={surahNumber}
              onChange={(e) => onSelectSurah(Number(e.target.value), 1)}
              className="h-10 max-w-[220px] rounded-lg border border-stone-200 bg-stone-50 px-3 text-sm font-medium text-stone-900 focus:border-emerald-700 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-stone-100"
            >
              {surahs.map((s) => (
                <option key={s.number} value={s.number}>
                  {s.number}. {s.englishName} ({s.numberOfAyahs})
                </option>
              ))}
            </select>

            {detail && (
              <select
                aria-label="Jump to Ayah"
                value={targetAyah ?? 1}
                onChange={(e) => {
                  const ayahNum = Number(e.target.value);
                  const el = ayahRefs.current[ayahNum];
                  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                  updateLastRead(surahNumber, ayahNum);
                }}
                className="font-mono-tabular h-10 rounded-lg border border-stone-200 bg-stone-50 px-3 text-sm text-stone-800 focus:border-emerald-700 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-stone-200"
              >
                {detail.ayahs.map((a) => (
                  <option key={a.numberInSurah} value={a.numberInSurah}>
                    Ayah {a.numberInSurah}
                  </option>
                ))}
              </select>
            )}

            <select
              aria-label="Jump to Juz"
              defaultValue=""
              onChange={(e) => {
                const jNum = Number(e.target.value);
                const found = JUZ_LIST.find((j) => j.juz === jNum);
                if (found) onSelectSurah(found.surah, found.ayah);
              }}
              className="h-10 rounded-lg border border-stone-200 bg-stone-50 px-3 text-sm text-stone-700 focus:border-emerald-700 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-stone-300"
            >
              <option value="" disabled>
                Jump to Juz
              </option>
              {JUZ_LIST.map((j) => (
                <option key={j.juz} value={j.juz}>
                  Juz {j.juz} · {j.name}
                </option>
              ))}
            </select>
          </div>

          {/* Reader Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setWordByWordEnabled((v) => !v)}
              className={`inline-flex h-10 items-center gap-1.5 rounded-lg border px-3 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                wordByWordEnabled
                  ? 'border-emerald-700/40 bg-emerald-50 text-emerald-800 dark:border-emerald-500/40 dark:bg-emerald-950/50 dark:text-emerald-300'
                  : 'border-stone-200 text-stone-700 hover:bg-stone-100 dark:border-slate-700 dark:text-stone-300 dark:hover:bg-slate-800'
              }`}
            >
              <Languages className="h-3.5 w-3.5" />
              <span>Word by Word</span>
            </button>

            <button
              type="button"
              onClick={() => setShowMemorisationPanel((v) => !v)}
              className={`inline-flex h-10 items-center gap-1.5 rounded-lg border px-3 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                showMemorisationPanel || memorisationRange.enabled || hideArabicText
                  ? 'border-amber-600/40 bg-amber-50 text-amber-800 dark:border-amber-500/40 dark:bg-amber-950/40 dark:text-amber-300'
                  : 'border-stone-200 text-stone-700 hover:bg-stone-100 dark:border-slate-700 dark:text-stone-300 dark:hover:bg-slate-800'
              }`}
            >
              <SlidersHorizontal className="h-3.5 w-3.5" />
              <span>Memorisation</span>
            </button>

            <button
              type="button"
              onClick={() => setShowSearchBar((v) => !v)}
              aria-label="Toggle Quran search"
              className={`inline-flex h-10 items-center gap-1.5 rounded-lg border px-3 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                showSearchBar
                  ? 'border-emerald-700/40 bg-emerald-50 text-emerald-800 dark:border-emerald-500/40 dark:bg-emerald-950/50 dark:text-emerald-300'
                  : 'border-stone-200 text-stone-700 hover:bg-stone-100 dark:border-slate-700 dark:text-stone-300 dark:hover:bg-slate-800'
              }`}
            >
              <Search className="h-3.5 w-3.5" />
              <span>Search</span>
            </button>

            <button
              type="button"
              onClick={handleSaveOffline}
              disabled={savingOffline}
              className={`inline-flex h-10 items-center gap-1.5 rounded-lg border px-3 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                isSurahSavedOffline
                  ? 'border-emerald-700/40 bg-emerald-50 text-emerald-800 dark:border-emerald-500/40 dark:bg-emerald-950/50 dark:text-emerald-300'
                  : 'border-stone-200 text-stone-700 hover:bg-stone-100 dark:border-slate-700 dark:text-stone-300 dark:hover:bg-slate-800'
              }`}
            >
              {savingOffline ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : isSurahSavedOffline ? (
                <Check className="h-3.5 w-3.5" />
              ) : (
                <Download className="h-3.5 w-3.5" />
              )}
              <span>{isSurahSavedOffline ? 'Saved Offline' : 'Save Offline'}</span>
            </button>
          </div>
        </div>

        {/* Translation & Reciter Quick Strip */}
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-stone-200/80 pt-3 dark:border-slate-800">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="mr-1 text-xs font-medium text-stone-500 dark:text-stone-400">
              Translation:
            </span>
            {(
              [
                { id: 'both', label: 'English & Hausa' },
                { id: 'english', label: 'English' },
                { id: 'hausa', label: 'Hausa' },
                { id: 'arabic-only', label: 'Arabic Only' },
              ] as Array<{ id: TranslationMode; label: string }>
            ).map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() =>
                  updatePreferences({ preferredTranslation: opt.id })
                }
                className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                  translationMode === opt.id
                    ? 'bg-emerald-700 text-white dark:bg-emerald-600'
                    : 'bg-stone-100 text-stone-600 hover:text-stone-900 dark:bg-slate-800 dark:text-stone-300 dark:hover:text-white'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <label
              htmlFor="reader-reciter"
              className="text-xs font-medium text-stone-500 dark:text-stone-400"
            >
              Reciter:
            </label>
            <select
              id="reader-reciter"
              value={reciterId}
              onChange={(e) => switchReciter(e.target.value)}
              className="h-8 rounded-lg border border-stone-200 bg-stone-50 px-2.5 text-xs font-medium text-stone-800 focus:border-emerald-700 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-stone-200"
            >
              {RECITERS.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Inline Search Drawer */}
        {showSearchBar && (
          <div className="mt-3 border-t border-stone-200 pt-3 dark:border-slate-800">
            <form onSubmit={handleSearchSubmit} className="flex flex-wrap gap-2">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search any verse across the Quran..."
                className="h-10 min-w-[200px] flex-1 rounded-lg border border-stone-200 bg-stone-50 px-3 text-sm text-stone-900 focus:border-emerald-700 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-stone-100"
              />
              <select
                aria-label="Search edition"
                value={searchEdition}
                onChange={(e) =>
                  setSearchEdition(
                    e.target.value as 'en.sahih' | 'ha.gumi' | 'quran-simple-clean'
                  )
                }
                className="h-10 rounded-lg border border-stone-200 bg-stone-50 px-2.5 text-xs font-medium text-stone-800 dark:border-slate-700 dark:bg-slate-950 dark:text-stone-200"
              >
                <option value="en.sahih">English</option>
                <option value="ha.gumi">Hausa</option>
                <option value="quran-simple-clean">Arabic</option>
              </select>
              <button
                type="submit"
                disabled={searching}
                className="h-10 rounded-lg bg-emerald-700 px-4 text-xs font-semibold text-white hover:bg-emerald-800"
              >
                {searching ? 'Searching...' : 'Search'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowSearchBar(false);
                  setSearchResults(null);
                }}
                aria-label="Close search"
                className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-stone-200 text-stone-500 hover:bg-stone-100 dark:border-slate-700 dark:text-stone-400"
              >
                <X className="h-4 w-4" />
              </button>
            </form>

            {searchResults && (
              <div className="mt-3 max-h-64 space-y-2 overflow-y-auto pr-1">
                {searchResults.length === 0 ? (
                  <p className="text-xs text-stone-500 dark:text-stone-400">
                    No matching Ayahs found.
                  </p>
                ) : (
                  searchResults.map((m) => (
                    <button
                      key={`${m.surahNumber}:${m.numberInSurah}`}
                      type="button"
                      onClick={() => {
                        onSelectSurah(m.surahNumber, m.numberInSurah);
                        setShowSearchBar(false);
                      }}
                      className="block w-full rounded-lg border border-stone-200 bg-stone-50 p-3 text-left text-xs hover:border-emerald-700/50 dark:border-slate-800 dark:bg-slate-950"
                    >
                      <span className="font-semibold text-emerald-700 dark:text-emerald-400">
                        {m.surahEnglishName} {m.surahNumber}:{m.numberInSurah}
                      </span>
                      <p className="mt-1 line-clamp-2 text-stone-700 dark:text-stone-300">
                        {m.text}
                      </p>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
        )}

        {/* Memorisation Studio Panel */}
        {showMemorisationPanel && detail && (
          <div className="mt-3 border-t border-stone-200 pt-4 dark:border-slate-800">
            <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl bg-stone-50 p-4 dark:bg-slate-950/70">
              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setHideArabicText((v) => !v);
                    setRevealedAyahs({});
                  }}
                  className={`inline-flex h-9 items-center gap-2 rounded-lg border px-3 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                    hideArabicText
                      ? 'border-amber-600 bg-amber-600 text-white'
                      : 'border-stone-300 bg-white text-stone-800 hover:bg-stone-100 dark:border-slate-700 dark:bg-slate-900 dark:text-stone-200'
                  }`}
                >
                  {hideArabicText ? (
                    <Eye className="h-3.5 w-3.5" />
                  ) : (
                    <EyeOff className="h-3.5 w-3.5" />
                  )}
                  <span>
                    {hideArabicText ? 'Show All Arabic Text' : 'Hide Arabic for Recall'}
                  </span>
                </button>

                <div className="flex items-center gap-1.5">
                  <Repeat className="h-3.5 w-3.5 text-stone-500" />
                  <span className="text-xs font-medium text-stone-600 dark:text-stone-300">
                    Repeat Ayah:
                  </span>
                  <select
                    aria-label="Repeat each Ayah count"
                    value={repeatAyahCount}
                    onChange={(e) => {
                      const val = e.target.value;
                      setRepeatAyahCount(
                        val === 'infinite' ? 'infinite' : (Number(val) as RepeatCount)
                      );
                    }}
                    className="font-mono-tabular h-9 rounded-lg border border-stone-200 bg-white px-2 text-xs font-medium text-stone-800 dark:border-slate-700 dark:bg-slate-900 dark:text-stone-200"
                  >
                    {REPEAT_COUNTS.map((c) => (
                      <option key={String(c)} value={String(c)}>
                        {c === 'infinite' ? '∞ Infinite' : `${c}x`}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Ayah Range Loop Controls */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-medium text-stone-600 dark:text-stone-300">
                  Range Loop:
                </span>
                <input
                  type="number"
                  min={1}
                  max={detail.ayahs.length}
                  value={memorisationRange.startAyah}
                  onChange={(e) =>
                    setMemorisationRange((prev) => ({
                      ...prev,
                      startAyah: Math.max(1, Number(e.target.value) || 1),
                    }))
                  }
                  aria-label="Range start Ayah"
                  className="font-mono-tabular h-9 w-16 rounded-lg border border-stone-200 bg-white px-2 text-center text-xs text-stone-900 dark:border-slate-700 dark:bg-slate-900 dark:text-stone-100"
                />
                <span className="text-xs text-stone-400">to</span>
                <input
                  type="number"
                  min={1}
                  max={detail.ayahs.length}
                  value={memorisationRange.endAyah}
                  onChange={(e) =>
                    setMemorisationRange((prev) => ({
                      ...prev,
                      endAyah: Math.min(
                        detail.ayahs.length,
                        Math.max(1, Number(e.target.value) || 1)
                      ),
                    }))
                  }
                  aria-label="Range end Ayah"
                  className="font-mono-tabular h-9 w-16 rounded-lg border border-stone-200 bg-white px-2 text-center text-xs text-stone-900 dark:border-slate-700 dark:bg-slate-900 dark:text-stone-100"
                />

                <select
                  aria-label="Range loop repetitions"
                  value={memorisationRange.rangeLoops}
                  onChange={(e) => {
                    const val = e.target.value;
                    setMemorisationRange((prev) => ({
                      ...prev,
                      rangeLoops:
                        val === 'infinite' ? 'infinite' : (Number(val) as RepeatCount),
                    }));
                  }}
                  className="font-mono-tabular h-9 rounded-lg border border-stone-200 bg-white px-2 text-xs text-stone-800 dark:border-slate-700 dark:bg-slate-900 dark:text-stone-200"
                >
                  {REPEAT_COUNTS.map((c) => (
                    <option key={String(c)} value={String(c)}>
                      {c === 'infinite' ? '∞ Loops' : `${c} Loops`}
                    </option>
                  ))}
                </select>

                {memorisationRange.enabled ? (
                  <button
                    type="button"
                    onClick={() =>
                      setMemorisationRange((prev) => ({ ...prev, enabled: false }))
                    }
                    className="h-9 rounded-lg border border-red-300 bg-red-50 px-3 text-xs font-semibold text-red-700 hover:bg-red-100 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300"
                  >
                    Stop Range
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={startMemorisationRange}
                    className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-emerald-700 px-3.5 text-xs font-semibold text-white hover:bg-emerald-800 dark:bg-emerald-600"
                  >
                    <Play className="h-3.5 w-3.5" />
                    <span>Play Range</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Loading / Error State */}
      {loading ? (
        <div className="mt-10 flex flex-col items-center justify-center rounded-2xl border border-stone-200 bg-white py-24 dark:border-slate-800 dark:bg-slate-900/50">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-700 dark:text-emerald-400" />
          <p className="mt-3 text-sm text-stone-500 dark:text-stone-400">
            Loading Uthmani script and translations...
          </p>
        </div>
      ) : loadError || !detail ? (
        <div className="mt-10 flex flex-col items-center justify-center rounded-2xl border border-stone-200 bg-white p-12 text-center dark:border-slate-800 dark:bg-slate-900/50">
          <AlertCircle className="h-8 w-8 text-red-600" />
          <p className="mt-3 text-sm font-medium text-stone-800 dark:text-stone-200">
            {loadError ?? 'Surah could not be loaded.'}
          </p>
          <button
            type="button"
            onClick={() => onSelectSurah(surahNumber, targetAyah)}
            className="mt-4 rounded-lg bg-emerald-700 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-800"
          >
            Try Again
          </button>
        </div>
      ) : (
        <>
          {/* Surah Opening Header Card */}
          <div className="mt-6 rounded-2xl border border-stone-200 bg-stone-50/70 px-6 py-8 text-center dark:border-slate-800 dark:bg-slate-900/60">
            <p
              className="font-arabic text-4xl text-emerald-800 sm:text-5xl dark:text-emerald-400"
              dir="rtl"
              lang="ar"
            >
              {detail.surah.name}
            </p>
            <h1 className="font-display mt-3 text-2xl font-semibold text-stone-900 sm:text-3xl dark:text-stone-100">
              {detail.surah.number}. {detail.surah.englishName}
            </h1>
            <p className="mt-1 text-sm text-stone-600 dark:text-stone-400">
              {detail.surah.englishNameTranslation} · {detail.surah.revelationType} ·{' '}
              <span className="font-mono-tabular">
                {detail.surah.numberOfAyahs} Ayahs
              </span>{' '}
              · {juzSpanText}
            </p>

            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => playAyah(surahNumber, 1, detail.surah)}
                className="inline-flex h-10 items-center gap-2 rounded-lg bg-emerald-700 px-5 text-sm font-semibold text-white transition-colors hover:bg-emerald-800 dark:bg-emerald-600 dark:hover:bg-emerald-500"
              >
                <Play className="h-4 w-4" />
                <span>Play Full Surah</span>
              </button>

              <button
                type="button"
                onClick={() => toggleSurahCompleted(surahNumber)}
                className={`inline-flex h-10 items-center gap-2 rounded-lg border px-4 text-sm font-medium transition-colors ${
                  isSurahCompleted
                    ? 'border-emerald-700 bg-emerald-50 text-emerald-800 dark:border-emerald-500 dark:bg-emerald-950/50 dark:text-emerald-300'
                    : 'border-stone-300 bg-white text-stone-700 hover:bg-stone-100 dark:border-slate-700 dark:bg-slate-900 dark:text-stone-200 dark:hover:bg-slate-800'
                }`}
              >
                <Check className="h-4 w-4" />
                <span>
                  {isSurahCompleted ? 'Completed' : 'Mark Surah Completed'}
                </span>
              </button>
            </div>

            {surahNumber !== 1 && surahNumber !== 9 && (
              <p
                className="font-arabic mt-7 border-t border-stone-200/80 pt-6 text-3xl text-stone-800 dark:border-slate-800 dark:text-stone-200"
                dir="rtl"
                lang="ar"
              >
                بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ
              </p>
            )}
          </div>

          {/* Click-to-Recite Guidance Hint */}
          <p className="mt-4 text-center text-xs text-stone-500 dark:text-stone-400">
            Tap any Ayah below to listen immediately with automatic highlighting and continuous recitation.
          </p>

          {/* Ayahs List */}
          <div className="mt-5 space-y-4">
            {detail.ayahs.map((ayah) => {
              const isCurrentTrack =
                activeTrack?.surah === surahNumber &&
                activeTrack?.ayah === ayah.numberInSurah;
              const bookmarked = isBookmarked(surahNumber, ayah.numberInSurah);
              const tafsirOpen = openTafsirAyah === ayah.numberInSurah;
              const tafsirData = tafsirCache[`${surahNumber}:${ayah.numberInSurah}`];
              const words = wordsMap?.[ayah.numberInSurah];
              const isRevealed =
                !hideArabicText || Boolean(revealedAyahs[ayah.numberInSurah]);
              const inMemoRange =
                memorisationRange.enabled &&
                ayah.numberInSurah >= memorisationRange.startAyah &&
                ayah.numberInSurah <= memorisationRange.endAyah;

              return (
                <div
                  key={ayah.numberInSurah}
                  ref={(el) => {
                    ayahRefs.current[ayah.numberInSurah] = el;
                  }}
                  onClick={() => playAyah(surahNumber, ayah.numberInSurah, detail.surah)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      playAyah(surahNumber, ayah.numberInSurah, detail.surah);
                    }
                  }}
                  aria-label={`Play Surah ${detail.surah.englishName} Ayah ${ayah.numberInSurah}`}
                  className={`group cursor-pointer rounded-2xl border p-5 transition-colors sm:p-7 focus-visible:outline-2 focus-visible:outline-emerald-700 ${
                    isCurrentTrack
                      ? 'border-emerald-600/60 bg-emerald-50/75 shadow-sm dark:border-emerald-500/60 dark:bg-emerald-950/35'
                      : inMemoRange
                      ? 'border-amber-500/40 bg-amber-50/40 hover:border-amber-600/60 dark:border-amber-500/40 dark:bg-amber-950/20'
                      : 'border-stone-200 bg-white hover:border-emerald-700/40 hover:bg-stone-50/60 dark:border-slate-800 dark:bg-slate-900/50 dark:hover:border-emerald-500/40 dark:hover:bg-slate-900'
                  }`}
                >
                  {/* Ayah Header Strip: Number, Juz/Page metadata, Action Controls */}
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span
                        className={`font-mono-tabular inline-flex h-8 min-w-[2.5rem] items-center justify-center rounded-lg px-2 text-xs font-semibold transition-colors ${
                          isCurrentTrack
                            ? 'bg-emerald-700 text-white dark:bg-emerald-600'
                            : 'bg-stone-100 text-stone-700 group-hover:bg-emerald-100 group-hover:text-emerald-800 dark:bg-slate-800 dark:text-stone-300 dark:group-hover:bg-emerald-950 dark:group-hover:text-emerald-300'
                        }`}
                      >
                        {surahNumber}:{ayah.numberInSurah}
                      </span>

                      <span className="font-mono-tabular text-xs text-stone-500 dark:text-stone-400">
                        Juz {ayah.juz} · Page {ayah.page}
                        {ayah.sajda ? ' · Sajdah' : ''}
                      </span>

                      {isCurrentTrack && (
                        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                          <Volume2 className="h-3.5 w-3.5" />
                          <span>{isPlaying ? 'Reciting' : 'Selected'}</span>
                        </span>
                      )}
                    </div>

                    {/* Non-propagating Action Buttons */}
                    <div
                      className="flex items-center gap-1"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        type="button"
                        onClick={() => {
                          if (isCurrentTrack) {
                            togglePlayPause();
                          } else {
                            playAyah(
                              surahNumber,
                              ayah.numberInSurah,
                              detail.surah
                            );
                          }
                        }}
                        aria-label={
                          isCurrentTrack && isPlaying
                            ? `Pause Ayah ${ayah.numberInSurah}`
                            : `Play Ayah ${ayah.numberInSurah}`
                        }
                        className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-stone-600 transition-colors hover:bg-stone-100 hover:text-emerald-700 dark:text-stone-300 dark:hover:bg-slate-800 dark:hover:text-emerald-400"
                      >
                        {isCurrentTrack && audioLoading ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : isCurrentTrack && isPlaying ? (
                          <Pause className="h-4 w-4 text-emerald-700 dark:text-emerald-400" />
                        ) : (
                          <Play className="h-4 w-4" />
                        )}
                      </button>

                      {hideArabicText && (
                        <button
                          type="button"
                          onClick={() =>
                            setRevealedAyahs((prev) => ({
                              ...prev,
                              [ayah.numberInSurah]: !prev[ayah.numberInSurah],
                            }))
                          }
                          aria-label={
                            isRevealed ? 'Hide Arabic verse' : 'Reveal Arabic verse'
                          }
                          className="inline-flex h-9 items-center gap-1 rounded-lg px-2.5 text-xs font-medium text-amber-700 hover:bg-amber-50 dark:text-amber-400 dark:hover:bg-amber-950/40"
                        >
                          {isRevealed ? (
                            <EyeOff className="h-3.5 w-3.5" />
                          ) : (
                            <Eye className="h-3.5 w-3.5" />
                          )}
                          <span>{isRevealed ? 'Hide' : 'Peek'}</span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() =>
                          setOpenTafsirAyah(
                            tafsirOpen ? null : ayah.numberInSurah
                          )
                        }
                        className={`inline-flex h-9 items-center gap-1 rounded-lg px-2.5 text-xs font-medium transition-colors ${
                          tafsirOpen
                            ? 'bg-emerald-700 text-white dark:bg-emerald-600'
                            : 'text-stone-600 hover:bg-stone-100 hover:text-stone-900 dark:text-stone-300 dark:hover:bg-slate-800'
                        }`}
                      >
                        <BookOpen className="h-3.5 w-3.5" />
                        <span>Tafsir</span>
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          toggleBookmark({
                            surahNumber,
                            ayahNumber: ayah.numberInSurah,
                            surahName: detail.surah.englishName,
                            arabicText: ayah.text,
                            translationText: ayah.englishText,
                          })
                        }
                        aria-label={
                          bookmarked
                            ? `Remove bookmark for ${surahNumber}:${ayah.numberInSurah}`
                            : `Bookmark ${surahNumber}:${ayah.numberInSurah}`
                        }
                        className={`inline-flex h-9 w-9 items-center justify-center rounded-lg transition-colors ${
                          bookmarked
                            ? 'text-amber-600 hover:bg-amber-50 dark:text-amber-400 dark:hover:bg-amber-950/40'
                            : 'text-stone-500 hover:bg-stone-100 hover:text-stone-900 dark:text-stone-400 dark:hover:bg-slate-800'
                        }`}
                      >
                        <Bookmark
                          className="h-4 w-4"
                          fill={bookmarked ? 'currentColor' : 'none'}
                        />
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          handleCopyAyah(
                            ayah.text,
                            ayah.englishText,
                            ayah.numberInSurah
                          )
                        }
                        aria-label={`Copy Ayah ${ayah.numberInSurah}`}
                        className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-stone-500 hover:bg-stone-100 hover:text-stone-900 dark:text-stone-400 dark:hover:bg-slate-800"
                      >
                        {copiedKey === `${surahNumber}:${ayah.numberInSurah}` ? (
                          <Check className="h-4 w-4 text-emerald-700 dark:text-emerald-400" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Uthmani Arabic Text */}
                  <div className="mt-5" dir="rtl" lang="ar">
                    {isRevealed ? (
                      <p
                        className="font-arabic text-right leading-[2.15] text-stone-900 dark:text-stone-50"
                        style={{ fontSize: `${progress.arabicFontSize}px` }}
                      >
                        {ayah.text}{' '}
                        <span className="mx-1 inline-block text-amber-700 dark:text-amber-400">
                          ﴿{toArabicIndicNumerals(ayah.numberInSurah)}﴾
                        </span>
                      </p>
                    ) : (
                      <div
                        onClick={(e) => {
                          e.stopPropagation();
                          setRevealedAyahs((prev) => ({
                            ...prev,
                            [ayah.numberInSurah]: true,
                          }));
                        }}
                        className="flex items-center justify-between rounded-xl border border-dashed border-stone-300 bg-stone-100/80 px-5 py-6 text-sm text-stone-600 transition-colors hover:bg-stone-100 dark:border-slate-700 dark:bg-slate-800/60 dark:text-stone-300"
                        dir="ltr"
                      >
                        <span>
                          Arabic text hidden for memorisation recall · Tap here to reveal Ayah {ayah.numberInSurah}
                        </span>
                        <Eye className="h-4 w-4 shrink-0 text-amber-700 dark:text-amber-400" />
                      </div>
                    )}
                  </div>

                  {/* Word-by-Word Breakdown */}
                  {wordByWordEnabled && isRevealed && (
                    <div
                      className="mt-5 border-t border-stone-200/80 pt-4 dark:border-slate-800"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {loadingWords && !words ? (
                        <p className="text-xs text-stone-500">
                          Loading word-by-word meanings...
                        </p>
                      ) : words && words.length > 0 ? (
                        <div
                          className="flex flex-wrap gap-2"
                          dir="rtl"
                        >
                          {words.map((w) => (
                            <div
                              key={w.position}
                              className="rounded-lg border border-stone-200 bg-stone-50/80 px-3 py-2 text-center dark:border-slate-800 dark:bg-slate-950/70"
                            >
                              <p
                                className="font-arabic text-xl text-stone-900 dark:text-stone-100"
                                lang="ar"
                              >
                                {w.arabic}
                              </p>
                              {w.transliteration && (
                                <p
                                  className="mt-0.5 text-[11px] italic text-emerald-700 dark:text-emerald-400"
                                  dir="ltr"
                                >
                                  {w.transliteration}
                                </p>
                              )}
                              <p
                                className="mt-0.5 text-[11px] text-stone-600 dark:text-stone-400"
                                dir="ltr"
                              >
                                {w.translation}
                              </p>
                            </div>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  )}

                  {/* Translations Underneath Each Arabic Ayah */}
                  {translationMode !== 'arabic-only' && (
                    <div className="mt-5 space-y-3 border-t border-stone-200/70 pt-4 dark:border-slate-800/80">
                      {(translationMode === 'english' ||
                        translationMode === 'both') && (
                        <div>
                          <span className="text-[11px] font-medium uppercase tracking-wider text-stone-400 dark:text-stone-500">
                            English · Sahih International
                          </span>
                          <p className="mt-1 max-w-3xl text-[15px] leading-relaxed text-stone-700 dark:text-stone-200">
                            {ayah.englishText}
                          </p>
                        </div>
                      )}

                      {(translationMode === 'hausa' ||
                        translationMode === 'both') && (
                        <div>
                          <span className="text-[11px] font-medium uppercase tracking-wider text-emerald-700/80 dark:text-emerald-400/80">
                            Hausa · Abubakar Mahmoud Gumi
                          </span>
                          <p className="mt-1 max-w-3xl text-[15px] leading-relaxed text-stone-700 dark:text-stone-300">
                            {ayah.hausaText}
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Inline Expandable Tafsir Commentary */}
                  {tafsirOpen && (
                    <div
                      onClick={(e) => e.stopPropagation()}
                      className="mt-5 rounded-xl border border-stone-200 bg-stone-50 p-5 dark:border-slate-800 dark:bg-slate-950/80"
                    >
                      <div className="flex items-center justify-between border-b border-stone-200 pb-3 dark:border-slate-800">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wider text-amber-700 dark:text-amber-400">
                            Tafsir &amp; Explanation · {surahNumber}:{ayah.numberInSurah}
                          </p>
                          <p className="mt-0.5 text-xs text-stone-500 dark:text-stone-400">
                            {tafsirData?.sourceName ?? 'Tafsir Ibn Kathir (Abridged)'} &amp; Tafsir Al-Muyassar
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setOpenTafsirAyah(null)}
                          className="rounded-lg p-1.5 text-stone-500 hover:bg-stone-200/70 dark:hover:bg-slate-800"
                          aria-label="Close Tafsir"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>

                      {loadingTafsir && !tafsirData ? (
                        <div className="flex items-center gap-2 py-6 text-xs text-stone-500">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span>Loading Tafsir commentary...</span>
                        </div>
                      ) : tafsirData ? (
                        <div className="mt-4 space-y-4">
                          {tafsirData.arabicMuyassar && (
                            <div
                              className="rounded-lg bg-white p-4 dark:bg-slate-900"
                              dir="rtl"
                              lang="ar"
                            >
                              <p className="text-xs font-medium text-emerald-700 dark:text-emerald-400">
                                التفسير الميسر
                              </p>
                              <p className="font-arabic mt-1.5 text-xl leading-loose text-stone-800 dark:text-stone-200">
                                {tafsirData.arabicMuyassar}
                              </p>
                            </div>
                          )}

                          {tafsirData.englishParagraphs.length > 0 ? (
                            <div className="space-y-3 text-sm leading-relaxed text-stone-700 dark:text-stone-300">
                              {tafsirData.englishParagraphs.map((para, i) => (
                                <p key={i}>{para}</p>
                              ))}
                            </div>
                          ) : (
                            <p className="text-sm text-stone-500">
                              Detailed English Tafsir for this Ayah is referenced in the preceding verses of this passage.
                            </p>
                          )}
                        </div>
                      ) : (
                        <p className="py-4 text-sm text-stone-500">
                          Unable to load Tafsir right now.
                        </p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Previous / Next Surah Footer Navigation */}
          <div className="mt-8 flex items-center justify-between gap-4 border-t border-stone-200 pt-6 dark:border-slate-800">
            <button
              type="button"
              disabled={surahNumber <= 1}
              onClick={() => onSelectSurah(surahNumber - 1, 1)}
              className="inline-flex h-11 items-center gap-2 rounded-lg border border-stone-200 bg-white px-4 text-sm font-medium text-stone-800 transition-colors hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-800 dark:bg-slate-900 dark:text-stone-200 dark:hover:bg-slate-800"
            >
              <ChevronLeft className="h-4 w-4" />
              <span>Previous Surah</span>
            </button>

            <span className="font-mono-tabular text-xs text-stone-500 dark:text-stone-400">
              Surah {surahNumber} of 114
            </span>

            <button
              type="button"
              disabled={surahNumber >= 114}
              onClick={() => onSelectSurah(surahNumber + 1, 1)}
              className="inline-flex h-11 items-center gap-2 rounded-lg bg-emerald-700 px-4 text-sm font-semibold text-white transition-colors hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-40 dark:bg-emerald-600 dark:hover:bg-emerald-500"
            >
              <span>Next Surah</span>
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </>
      )}
    </div>
  );
};
