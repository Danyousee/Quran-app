import React, { useMemo, useState } from 'react';
import {
  ArrowRight,
  Bookmark,
  Cloud,
  FolderPlus,
  LogIn,
  Play,
  Trash2,
} from 'lucide-react';
import { TOTAL_QURAN_AYAHS, TOTAL_QURAN_SURAHS } from '../data/reciters';
import { useAuthSync } from '../context/AuthSyncContext';
import { useAudioPlayer } from '../context/AudioPlayerContext';
import { SurahMeta } from '../types/quran';

interface BookmarksViewProps {
  surahs: SurahMeta[];
  onOpenSurah: (surah: number, ayah: number) => void;
}

export const BookmarksView: React.FC<BookmarksViewProps> = ({
  surahs,
  onOpenSurah,
}) => {
  const {
    user,
    syncing,
    authError,
    bookmarks,
    collections,
    progress,
    signInWithGoogle,
    toggleBookmark,
    updateBookmarkMeta,
    addCollection,
    removeCollection,
  } = useAuthSync();

  const { playAyah } = useAudioPlayer();

  const [selectedCollection, setSelectedCollection] = useState<string>('all');
  const [newCollectionName, setNewCollectionName] = useState('');
  const [editingNoteKey, setEditingNoteKey] = useState<string | null>(null);
  const [noteDraft, setNoteDraft] = useState('');

  const lastSurahMeta = useMemo(
    () => surahs.find((s) => s.number === progress.lastSurah),
    [surahs, progress.lastSurah]
  );

  const filteredBookmarks = useMemo(() => {
    if (selectedCollection === 'all') return bookmarks;
    return bookmarks.filter(
      (b) => String(b.collectionId ?? '') === selectedCollection
    );
  }, [bookmarks, selectedCollection]);

  const khatmahPct = Math.min(
    100,
    Math.round((progress.readAyahKeys.length / TOTAL_QURAN_AYAHS) * 1000) / 10
  );

  const handleCreateCollection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCollectionName.trim()) return;
    await addCollection(newCollectionName.trim());
    setNewCollectionName('');
  };

  return (
    <div className="mx-auto max-w-7xl px-4 pb-32 pt-8 sm:px-6 lg:px-8">
      {/* Header + Cloud Sync CTA */}
      <div className="flex flex-col gap-4 border-b border-stone-200 pb-6 sm:flex-row sm:items-end sm:justify-between dark:border-slate-800">
        <div>
          <p className="text-xs font-medium uppercase tracking-widest text-amber-700 dark:text-amber-400">
            Personal Study Archive
          </p>
          <h1 className="font-display mt-2 text-3xl font-semibold text-stone-900 dark:text-stone-100">
            Bookmarks &amp; Reading Progress
          </h1>
          <p className="mt-1.5 text-sm text-stone-600 dark:text-stone-400">
            Organise favourite Ayahs into personal collections, record reflections, and continue seamlessly from where you stopped.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {user ? (
            <div className="flex items-center gap-2 rounded-xl border border-emerald-700/30 bg-emerald-50 px-4 py-2 text-xs font-medium text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-950/40 dark:text-emerald-300">
              <Cloud className="h-4 w-4" />
              <span>
                {syncing ? 'Syncing...' : `Synced as ${user.email}`}
              </span>
            </div>
          ) : (
            <button
              type="button"
              onClick={signInWithGoogle}
              className="inline-flex h-10 items-center gap-2 rounded-lg bg-emerald-700 px-4 text-xs font-semibold text-white transition-colors hover:bg-emerald-800 dark:bg-emerald-600 dark:hover:bg-emerald-500 whitespace-nowrap shrink-0"
            >
              <LogIn className="h-4 w-4" />
              <span>Sign in to Cloud Sync</span>
            </button>
          )}
        </div>
      </div>

      {authError && (
        <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-xs text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
          {authError}
        </p>
      )}

      {/* Progress & Last-Read Position Section */}
      <div className="mt-8 grid grid-cols-1 gap-5 lg:grid-cols-3">
        <div className="flex flex-col justify-between rounded-2xl border border-stone-200 bg-stone-50/70 p-6 lg:col-span-2 dark:border-slate-800 dark:bg-slate-900/60">
          <div>
            <p className="text-xs font-medium text-stone-500 dark:text-stone-400">
              Last-Read Position
            </p>
            <h2 className="font-display mt-1.5 text-2xl font-semibold text-stone-900 dark:text-stone-100">
              {lastSurahMeta?.englishName ?? `Surah ${progress.lastSurah}`} ·{' '}
              <span className="font-mono-tabular">
                {progress.lastSurah}:{progress.lastAyah}
              </span>
            </h2>
            <p className="mt-1 text-sm text-stone-600 dark:text-stone-400">
              Juz {progress.lastJuz} ·{' '}
              <span className="font-mono-tabular">
                {progress.readAyahKeys.length} / {TOTAL_QURAN_AYAHS}
              </span>{' '}
              Ayahs read ({khatmahPct}%) ·{' '}
              <span className="font-mono-tabular">
                {progress.completedSurahs.length} / {TOTAL_QURAN_SURAHS}
              </span>{' '}
              Surahs completed
            </p>
            <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-stone-200 dark:bg-slate-800">
              <div
                className="h-full bg-emerald-700 transition-all dark:bg-emerald-500"
                style={{ width: `${Math.max(2, khatmahPct)}%` }}
              />
            </div>
          </div>

          <div className="mt-6">
            <button
              type="button"
              onClick={() => onOpenSurah(progress.lastSurah, progress.lastAyah)}
              className="inline-flex h-10 items-center gap-2 rounded-lg bg-emerald-700 px-5 text-sm font-semibold text-white transition-colors hover:bg-emerald-800 dark:bg-emerald-600 dark:hover:bg-emerald-500"
            >
              <span>Continue Reading from {progress.lastSurah}:{progress.lastAyah}</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Create Collection Form */}
        <div className="rounded-2xl border border-stone-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900/60">
          <h3 className="font-display text-lg font-semibold text-stone-900 dark:text-stone-100">
            Personal Collections
          </h3>
          <p className="mt-1 text-xs text-stone-500 dark:text-stone-400">
            Group favourite Ayahs by theme, dua, or Hifz revision set.
          </p>

          <form onSubmit={handleCreateCollection} className="mt-4 flex gap-2">
            <input
              type="text"
              value={newCollectionName}
              onChange={(e) => setNewCollectionName(e.target.value)}
              placeholder="New collection name..."
              className="h-10 flex-1 rounded-lg border border-stone-200 bg-stone-50 px-3 text-xs text-stone-900 focus:border-emerald-700 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-stone-100"
            />
            <button
              type="submit"
              aria-label="Create collection"
              className="inline-flex h-10 items-center gap-1.5 rounded-lg bg-stone-900 px-3.5 text-xs font-semibold text-white hover:bg-stone-800 dark:bg-stone-100 dark:text-stone-900 dark:hover:bg-white"
            >
              <FolderPlus className="h-3.5 w-3.5" />
              <span>Add</span>
            </button>
          </form>

          <div className="mt-4 space-y-1.5">
            {collections.map((col) => (
              <div
                key={String(col.id)}
                className="flex items-center justify-between rounded-lg px-2.5 py-1.5 text-xs hover:bg-stone-50 dark:hover:bg-slate-800/60"
              >
                <button
                  type="button"
                  onClick={() => setSelectedCollection(String(col.id))}
                  className={`font-medium ${
                    selectedCollection === String(col.id)
                      ? 'text-emerald-700 dark:text-emerald-400'
                      : 'text-stone-700 dark:text-stone-300'
                  }`}
                >
                  {col.name}
                </button>
                <button
                  type="button"
                  onClick={() => removeCollection(col.id)}
                  aria-label={`Delete collection ${col.name}`}
                  className="text-stone-400 hover:text-red-600"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Collection Filter Tabs */}
      <div className="mt-10 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setSelectedCollection('all')}
          className={`rounded-lg px-3.5 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
            selectedCollection === 'all'
              ? 'bg-emerald-700 text-white dark:bg-emerald-600'
              : 'bg-stone-100 text-stone-600 hover:text-stone-900 dark:bg-slate-900 dark:text-stone-300'
          }`}
        >
          All Bookmarks ({bookmarks.length})
        </button>

        {collections.map((c) => {
          const count = bookmarks.filter(
            (b) => String(b.collectionId ?? '') === String(c.id)
          ).length;
          return (
            <button
              key={String(c.id)}
              type="button"
              onClick={() => setSelectedCollection(String(c.id))}
              className={`rounded-lg px-3.5 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                selectedCollection === String(c.id)
                  ? 'bg-emerald-700 text-white dark:bg-emerald-600'
                  : 'bg-stone-100 text-stone-600 hover:text-stone-900 dark:bg-slate-900 dark:text-stone-300'
              }`}
            >
              {c.name} ({count})
            </button>
          );
        })}
      </div>

      {/* Bookmarks List */}
      {filteredBookmarks.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-dashed border-stone-300 bg-stone-50/50 p-12 text-center dark:border-slate-700 dark:bg-slate-900/40">
          <Bookmark className="mx-auto h-8 w-8 text-stone-400" />
          <h3 className="font-display mt-3 text-lg font-semibold text-stone-900 dark:text-stone-100">
            No bookmarks in this view yet
          </h3>
          <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">
            Tap the bookmark icon on any Ayah while reading to save it to your collection.
          </p>
          <button
            type="button"
            onClick={() => onOpenSurah(progress.lastSurah, progress.lastAyah)}
            className="mt-5 inline-flex h-10 items-center gap-2 rounded-lg bg-emerald-700 px-4 text-xs font-semibold text-white hover:bg-emerald-800"
          >
            <span>Open Quran Reader</span>
          </button>
        </div>
      ) : (
        <div className="mt-6 space-y-4">
          {filteredBookmarks.map((b) => {
            const isEditing = editingNoteKey === b.id;
            return (
              <div
                key={b.id}
                className="rounded-2xl border border-stone-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900/60"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="font-mono-tabular rounded-lg bg-stone-100 px-2.5 py-1 text-xs font-semibold text-emerald-800 dark:bg-slate-800 dark:text-emerald-400">
                      {b.surahName} {b.surahNumber}:{b.ayahNumber}
                    </span>

                    <select
                      aria-label="Assign bookmark to collection"
                      value={String(b.collectionId ?? '')}
                      onChange={(e) => {
                        const raw = e.target.value;
                        const matched = collections.find(
                          (c) => String(c.id) === raw
                        );
                        updateBookmarkMeta(b.surahNumber, b.ayahNumber, {
                          collectionId: matched ? matched.id : null,
                        });
                      }}
                      className="h-8 rounded-lg border border-stone-200 bg-stone-50 px-2 text-xs text-stone-700 dark:border-slate-700 dark:bg-slate-950 dark:text-stone-300"
                    >
                      <option value="">No collection</option>
                      {collections.map((c) => (
                        <option key={String(c.id)} value={String(c.id)}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        const meta = surahs.find(
                          (s) => s.number === b.surahNumber
                        );
                        playAyah(b.surahNumber, b.ayahNumber, meta);
                      }}
                      className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-emerald-700 px-3 text-xs font-semibold text-white hover:bg-emerald-800 dark:bg-emerald-600"
                    >
                      <Play className="h-3.5 w-3.5" />
                      <span>Listen</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => onOpenSurah(b.surahNumber, b.ayahNumber)}
                      className="inline-flex h-9 items-center gap-1 rounded-lg border border-stone-200 px-3 text-xs font-medium text-stone-700 hover:bg-stone-100 dark:border-slate-700 dark:text-stone-200 dark:hover:bg-slate-800"
                    >
                      <span>Open</span>
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        toggleBookmark({
                          surahNumber: b.surahNumber,
                          ayahNumber: b.ayahNumber,
                          surahName: b.surahName,
                          arabicText: b.arabicText,
                          translationText: b.translationText,
                        })
                      }
                      aria-label={`Remove bookmark ${b.surahNumber}:${b.ayahNumber}`}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-stone-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/30"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <p
                  className="font-arabic mt-4 text-right text-2xl leading-loose text-stone-900 dark:text-stone-100"
                  dir="rtl"
                  lang="ar"
                >
                  {b.arabicText}
                </p>

                <p className="mt-3 text-sm leading-relaxed text-stone-600 dark:text-stone-300">
                  {b.translationText}
                </p>

                <div className="mt-4 border-t border-stone-100 pt-3 dark:border-slate-800">
                  {isEditing ? (
                    <div className="flex flex-col gap-2 sm:flex-row">
                      <input
                        type="text"
                        value={noteDraft}
                        onChange={(e) => setNoteDraft(e.target.value)}
                        placeholder="Write a personal reflection or Hifz note..."
                        className="h-9 flex-1 rounded-lg border border-stone-200 bg-stone-50 px-3 text-xs text-stone-900 dark:border-slate-700 dark:bg-slate-950 dark:text-stone-100"
                      />
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={async () => {
                            await updateBookmarkMeta(
                              b.surahNumber,
                              b.ayahNumber,
                              { note: noteDraft.trim() || null }
                            );
                            setEditingNoteKey(null);
                          }}
                          className="h-9 rounded-lg bg-emerald-700 px-3 text-xs font-semibold text-white"
                        >
                          Save Note
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingNoteKey(null)}
                          className="h-9 rounded-lg border border-stone-200 px-3 text-xs text-stone-600 dark:border-slate-700 dark:text-stone-300"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs italic text-stone-500 dark:text-stone-400">
                        {b.note ? `Note: ${b.note}` : 'No reflection note added'}
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingNoteKey(b.id);
                          setNoteDraft(b.note ?? '');
                        }}
                        className="text-xs font-medium text-emerald-700 hover:underline dark:text-emerald-400"
                      >
                        {b.note ? 'Edit note' : 'Add note'}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
