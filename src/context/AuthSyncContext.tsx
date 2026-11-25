import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import {
  User,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
} from 'firebase/auth';
import { auth, googleAuthProvider } from '../lib/firebase';
import {
  BookmarkItem,
  CollectionItem,
  ReadingProgressState,
  TranslationMode,
} from '../types/quran';

const STORAGE_KEYS = {
  bookmarks: 'albayan_bookmarks_v1',
  collections: 'albayan_collections_v1',
  progress: 'albayan_progress_v1',
};

const DEFAULT_PROGRESS: ReadingProgressState = {
  lastSurah: 1,
  lastAyah: 1,
  lastJuz: 1,
  completedSurahs: [],
  readAyahKeys: [],
  preferredReciter: 'alafasy',
  preferredTranslation: 'both',
  arabicFontSize: 34,
  theme: 'light',
};

function loadLocal<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function saveLocal<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Ignore storage quota errors
  }
}

interface AuthSyncContextValue {
  user: User | null;
  authLoading: boolean;
  syncing: boolean;
  authError: string | null;
  bookmarks: BookmarkItem[];
  collections: CollectionItem[];
  progress: ReadingProgressState;
  signInWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  isBookmarked: (surah: number, ayah: number) => boolean;
  toggleBookmark: (payload: {
    surahNumber: number;
    ayahNumber: number;
    surahName: string;
    arabicText: string;
    translationText: string;
    note?: string | null;
    collectionId?: number | string | null;
  }) => Promise<void>;
  updateBookmarkMeta: (
    surahNumber: number,
    ayahNumber: number,
    updates: { note?: string | null; collectionId?: number | string | null }
  ) => Promise<void>;
  addCollection: (name: string, description?: string) => Promise<void>;
  removeCollection: (id: number | string) => Promise<void>;
  updateLastRead: (surah: number, ayah: number, juz?: number) => void;
  markAyahRead: (surah: number, ayah: number) => void;
  toggleSurahCompleted: (surah: number) => void;
  updatePreferences: (
    prefs: Partial<{
      preferredReciter: string;
      preferredTranslation: TranslationMode;
      arabicFontSize: number;
      theme: 'light' | 'dark';
    }>
  ) => void;
}

const AuthSyncContext = createContext<AuthSyncContextValue | null>(null);

export const AuthSyncProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const [bookmarks, setBookmarks] = useState<BookmarkItem[]>(() =>
    loadLocal(STORAGE_KEYS.bookmarks, [])
  );
  const [collections, setCollections] = useState<CollectionItem[]>(() =>
    loadLocal(STORAGE_KEYS.collections, [
      { id: 'local-reflection', name: 'Daily Reflections', description: 'Verses for quiet contemplation' },
      { id: 'local-hifz', name: 'Memorisation Targets', description: 'Ayahs currently in review' },
    ])
  );
  const [progress, setProgress] = useState<ReadingProgressState>(() =>
    loadLocal(STORAGE_KEYS.progress, DEFAULT_PROGRESS)
  );

  const progressSyncTimer = useRef<number | null>(null);
  const userRef = useRef<User | null>(null);

  // Keep HTML root class in sync with theme
  useEffect(() => {
    const root = document.documentElement;
    if (progress.theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [progress.theme]);

  // Persist locally on changes
  useEffect(() => {
    saveLocal(STORAGE_KEYS.bookmarks, bookmarks);
  }, [bookmarks]);

  useEffect(() => {
    saveLocal(STORAGE_KEYS.collections, collections);
  }, [collections]);

  useEffect(() => {
    saveLocal(STORAGE_KEYS.progress, progress);
  }, [progress]);

  const authedFetch = useCallback(
    async (url: string, options: RequestInit = {}, activeUser?: User | null) => {
      const targetUser = activeUser ?? userRef.current;
      if (!targetUser) throw new Error('Not authenticated');
      const token = await targetUser.getIdToken();
      const res = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          ...(options.headers ?? {}),
        },
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Sync request failed');
      }
      return res.json();
    },
    []
  );

  const syncFromCloud = useCallback(
    async (firebaseUser: User) => {
      setSyncing(true);
      setAuthError(null);
      try {
        const data = await authedFetch('/api/sync', {}, firebaseUser);

        if (Array.isArray(data.collections) && data.collections.length > 0) {
          setCollections(
            data.collections.map((c: any) => ({
              id: c.id,
              name: c.name,
              description: c.description,
            }))
          );
        }

        const cloudBookmarks: BookmarkItem[] = (data.bookmarks ?? []).map(
          (b: any) => ({
            id: `${b.surahNumber}:${b.ayahNumber}`,
            surahNumber: b.surahNumber,
            ayahNumber: b.ayahNumber,
            surahName: b.surahName,
            arabicText: b.arabicText,
            translationText: b.translationText,
            note: b.note,
            collectionId: b.collectionId,
            createdAt: b.createdAt ?? new Date().toISOString(),
          })
        );

        // Merge any unsaved local bookmarks into cloud
        const localCurrent = loadLocal<BookmarkItem[]>(STORAGE_KEYS.bookmarks, []);
        const cloudKeySet = new Set(cloudBookmarks.map((b) => b.id));
        const toUpload = localCurrent.filter((b) => !cloudKeySet.has(b.id));

        if (toUpload.length > 0) {
          await Promise.all(
            toUpload.map((b) =>
              authedFetch(
                '/api/bookmarks',
                {
                  method: 'POST',
                  body: JSON.stringify({
                    surahNumber: b.surahNumber,
                    ayahNumber: b.ayahNumber,
                    surahName: b.surahName,
                    arabicText: b.arabicText,
                    translationText: b.translationText,
                    note: b.note ?? null,
                  }),
                },
                firebaseUser
              ).catch(() => null)
            )
          );
        }

        const mergedBookmarks = [...cloudBookmarks, ...toUpload];
        setBookmarks(mergedBookmarks);

        if (data.progress) {
          const cp = data.progress;
          setProgress((prev) => ({
            lastSurah: cp.lastSurah ?? prev.lastSurah,
            lastAyah: cp.lastAyah ?? prev.lastAyah,
            lastJuz: cp.lastJuz ?? prev.lastJuz,
            completedSurahs: Array.from(
              new Set([...(cp.completedSurahs ?? []), ...prev.completedSurahs])
            ),
            readAyahKeys: Array.from(
              new Set([...(cp.readAyahKeys ?? []), ...prev.readAyahKeys])
            ),
            preferredReciter: cp.preferredReciter ?? prev.preferredReciter,
            preferredTranslation:
              (cp.preferredTranslation as TranslationMode) ??
              prev.preferredTranslation,
            arabicFontSize: cp.arabicFontSize ?? prev.arabicFontSize,
            theme: (cp.theme as 'light' | 'dark') ?? prev.theme,
          }));
        } else {
          // Push initial local progress to cloud
          const localProg = loadLocal<ReadingProgressState>(
            STORAGE_KEYS.progress,
            DEFAULT_PROGRESS
          );
          await authedFetch(
            '/api/progress',
            {
              method: 'PUT',
              body: JSON.stringify(localProg),
            },
            firebaseUser
          ).catch(() => null);
        }
      } catch (error: any) {
        console.error('Cloud sync failed:', error);
        setAuthError(error.message || 'Could not sync with cloud.');
      } finally {
        setSyncing(false);
      }
    },
    [authedFetch]
  );

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      userRef.current = firebaseUser;
      setUser(firebaseUser);
      setAuthLoading(false);
      if (firebaseUser) {
        syncFromCloud(firebaseUser);
      }
    });
    return () => unsubscribe();
  }, [syncFromCloud]);

  const scheduleProgressSync = useCallback(
    (nextProgress: ReadingProgressState) => {
      if (!userRef.current) return;
      if (progressSyncTimer.current) {
        window.clearTimeout(progressSyncTimer.current);
      }
      progressSyncTimer.current = window.setTimeout(() => {
        authedFetch('/api/progress', {
          method: 'PUT',
          body: JSON.stringify(nextProgress),
        }).catch((err) => console.error('Background progress sync error:', err));
      }, 900);
    },
    [authedFetch]
  );

  const signInWithGoogle = useCallback(async () => {
    setAuthError(null);
    try {
      await signInWithPopup(auth, googleAuthProvider);
    } catch (error: any) {
      if (error?.code !== 'auth/popup-closed-by-user') {
        setAuthError(error?.message || 'Google Sign-In could not be completed.');
      }
    }
  }, []);

  const logout = useCallback(async () => {
    await signOut(auth);
  }, []);

  const isBookmarked = useCallback(
    (surah: number, ayah: number) =>
      bookmarks.some((b) => b.surahNumber === surah && b.ayahNumber === ayah),
    [bookmarks]
  );

  const toggleBookmark = useCallback(
    async (payload: {
      surahNumber: number;
      ayahNumber: number;
      surahName: string;
      arabicText: string;
      translationText: string;
      note?: string | null;
      collectionId?: number | string | null;
    }) => {
      const id = `${payload.surahNumber}:${payload.ayahNumber}`;
      const exists = bookmarks.some((b) => b.id === id);

      if (exists) {
        setBookmarks((prev) => prev.filter((b) => b.id !== id));
        if (userRef.current) {
          await authedFetch(
            `/api/bookmarks/${payload.surahNumber}/${payload.ayahNumber}`,
            { method: 'DELETE' }
          ).catch(() => null);
        }
      } else {
        const newItem: BookmarkItem = {
          id,
          surahNumber: payload.surahNumber,
          ayahNumber: payload.ayahNumber,
          surahName: payload.surahName,
          arabicText: payload.arabicText,
          translationText: payload.translationText,
          note: payload.note ?? null,
          collectionId: payload.collectionId ?? null,
          createdAt: new Date().toISOString(),
        };
        setBookmarks((prev) => [newItem, ...prev]);
        if (userRef.current) {
          const numericCol =
            typeof payload.collectionId === 'number' ? payload.collectionId : null;
          await authedFetch('/api/bookmarks', {
            method: 'POST',
            body: JSON.stringify({
              ...payload,
              collectionId: numericCol,
            }),
          }).catch(() => null);
        }
      }
    },
    [bookmarks, authedFetch]
  );

  const updateBookmarkMeta = useCallback(
    async (
      surahNumber: number,
      ayahNumber: number,
      updates: { note?: string | null; collectionId?: number | string | null }
    ) => {
      const id = `${surahNumber}:${ayahNumber}`;
      let updatedTarget: BookmarkItem | undefined;
      setBookmarks((prev) =>
        prev.map((b) => {
          if (b.id !== id) return b;
          updatedTarget = {
            ...b,
            ...(updates.note !== undefined ? { note: updates.note } : {}),
            ...(updates.collectionId !== undefined
              ? { collectionId: updates.collectionId }
              : {}),
          };
          return updatedTarget;
        })
      );

      if (userRef.current && updatedTarget) {
        await authedFetch('/api/bookmarks', {
          method: 'POST',
          body: JSON.stringify({
            surahNumber: updatedTarget.surahNumber,
            ayahNumber: updatedTarget.ayahNumber,
            surahName: updatedTarget.surahName,
            arabicText: updatedTarget.arabicText,
            translationText: updatedTarget.translationText,
            note: updatedTarget.note ?? null,
            collectionId:
              typeof updatedTarget.collectionId === 'number'
                ? updatedTarget.collectionId
                : null,
          }),
        }).catch(() => null);
      }
    },
    [authedFetch]
  );

  const addCollection = useCallback(
    async (name: string, description?: string) => {
      const trimmed = name.trim();
      if (!trimmed) return;
      if (userRef.current) {
        try {
          const res = await authedFetch('/api/collections', {
            method: 'POST',
            body: JSON.stringify({ name: trimmed, description }),
          });
          setCollections((prev) => [...prev, res.collection]);
          return;
        } catch (err) {
          console.error(err);
        }
      }
      setCollections((prev) => [
        ...prev,
        { id: `local-${Date.now()}`, name: trimmed, description: description ?? null },
      ]);
    },
    [authedFetch]
  );

  const removeCollection = useCallback(
    async (id: number | string) => {
      setCollections((prev) => prev.filter((c) => c.id !== id));
      setBookmarks((prev) =>
        prev.map((b) => (b.collectionId === id ? { ...b, collectionId: null } : b))
      );
      if (userRef.current && typeof id === 'number') {
        await authedFetch(`/api/collections/${id}`, { method: 'DELETE' }).catch(
          () => null
        );
      }
    },
    [authedFetch]
  );

  const updateLastRead = useCallback(
    (surah: number, ayah: number, juz?: number) => {
      setProgress((prev) => {
        const key = `${surah}:${ayah}`;
        const readAyahKeys = prev.readAyahKeys.includes(key)
          ? prev.readAyahKeys
          : [...prev.readAyahKeys, key];
        const next: ReadingProgressState = {
          ...prev,
          lastSurah: surah,
          lastAyah: ayah,
          lastJuz: juz ?? prev.lastJuz,
          readAyahKeys,
        };
        scheduleProgressSync(next);
        return next;
      });
    },
    [scheduleProgressSync]
  );

  const markAyahRead = useCallback(
    (surah: number, ayah: number) => {
      const key = `${surah}:${ayah}`;
      setProgress((prev) => {
        if (prev.readAyahKeys.includes(key)) return prev;
        const next = { ...prev, readAyahKeys: [...prev.readAyahKeys, key] };
        scheduleProgressSync(next);
        return next;
      });
    },
    [scheduleProgressSync]
  );

  const toggleSurahCompleted = useCallback(
    (surah: number) => {
      setProgress((prev) => {
        const exists = prev.completedSurahs.includes(surah);
        const completedSurahs = exists
          ? prev.completedSurahs.filter((s) => s !== surah)
          : [...prev.completedSurahs, surah].sort((a, b) => a - b);
        const next = { ...prev, completedSurahs };
        scheduleProgressSync(next);
        return next;
      });
    },
    [scheduleProgressSync]
  );

  const updatePreferences = useCallback(
    (
      prefs: Partial<{
        preferredReciter: string;
        preferredTranslation: TranslationMode;
        arabicFontSize: number;
        theme: 'light' | 'dark';
      }>
    ) => {
      setProgress((prev) => {
        const next = { ...prev, ...prefs };
        scheduleProgressSync(next);
        return next;
      });
    },
    [scheduleProgressSync]
  );

  return (
    <AuthSyncContext.Provider
      value={{
        user,
        authLoading,
        syncing,
        authError,
        bookmarks,
        collections,
        progress,
        signInWithGoogle,
        logout,
        isBookmarked,
        toggleBookmark,
        updateBookmarkMeta,
        addCollection,
        removeCollection,
        updateLastRead,
        markAyahRead,
        toggleSurahCompleted,
        updatePreferences,
      }}
    >
      {children}
    </AuthSyncContext.Provider>
  );
};

export function useAuthSync(): AuthSyncContextValue {
  const ctx = useContext(AuthSyncContext);
  if (!ctx) {
    throw new Error('useAuthSync must be used within AuthSyncProvider');
  }
  return ctx;
}
