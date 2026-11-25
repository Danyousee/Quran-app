import { and, desc, eq } from 'drizzle-orm';
import { db } from './index.ts';
import {
  bookmarks,
  collections,
  readingProgress,
  users,
} from './schema.ts';

export async function getOrCreateUser(
  uid: string,
  email: string,
  displayName?: string | null
) {
  try {
    const result = await db
      .insert(users)
      .values({
        uid,
        email,
        displayName: displayName ?? null,
      })
      .onConflictDoUpdate({
        target: users.uid,
        set: {
          email,
          ...(displayName !== undefined ? { displayName } : {}),
        },
      })
      .returning();

    return result[0];
  } catch (error) {
    console.error('Database error in getOrCreateUser:', error);
    throw new Error('Failed to synchronize user profile.', { cause: error });
  }
}

export async function getUserSyncState(userId: number) {
  try {
    const [userCollections, userBookmarks, progressRows] = await Promise.all([
      db
        .select()
        .from(collections)
        .where(eq(collections.userId, userId))
        .orderBy(collections.createdAt),
      db
        .select()
        .from(bookmarks)
        .where(eq(bookmarks.userId, userId))
        .orderBy(desc(bookmarks.createdAt)),
      db
        .select()
        .from(readingProgress)
        .where(eq(readingProgress.userId, userId)),
    ]);

    return {
      collections: userCollections,
      bookmarks: userBookmarks,
      progress: progressRows[0] ?? null,
    };
  } catch (error) {
    console.error('Database error in getUserSyncState:', error);
    throw new Error('Failed to load synced Quran data.', { cause: error });
  }
}

export async function upsertReadingProgress(
  userId: number,
  data: {
    lastSurah?: number;
    lastAyah?: number;
    lastJuz?: number;
    completedSurahs?: number[];
    readAyahKeys?: string[];
    preferredReciter?: string;
    preferredTranslation?: string;
    arabicFontSize?: number;
    theme?: string;
  }
) {
  try {
    const existing = await db
      .select()
      .from(readingProgress)
      .where(eq(readingProgress.userId, userId));

    const prev = existing[0];
    const mergedCompleted = data.completedSurahs
      ? Array.from(
          new Set([...(prev?.completedSurahs ?? []), ...data.completedSurahs])
        )
      : (prev?.completedSurahs ?? []);
    const mergedAyahKeys = data.readAyahKeys
      ? Array.from(
          new Set([...(prev?.readAyahKeys ?? []), ...data.readAyahKeys])
        )
      : (prev?.readAyahKeys ?? []);

    const [row] = await db
      .insert(readingProgress)
      .values({
        userId,
        lastSurah: data.lastSurah ?? prev?.lastSurah ?? 1,
        lastAyah: data.lastAyah ?? prev?.lastAyah ?? 1,
        lastJuz: data.lastJuz ?? prev?.lastJuz ?? 1,
        completedSurahs: mergedCompleted,
        readAyahKeys: mergedAyahKeys,
        preferredReciter:
          data.preferredReciter ?? prev?.preferredReciter ?? 'alafasy',
        preferredTranslation:
          data.preferredTranslation ?? prev?.preferredTranslation ?? 'both',
        arabicFontSize: data.arabicFontSize ?? prev?.arabicFontSize ?? 34,
        theme: data.theme ?? prev?.theme ?? 'light',
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: readingProgress.userId,
        set: {
          ...(data.lastSurah !== undefined ? { lastSurah: data.lastSurah } : {}),
          ...(data.lastAyah !== undefined ? { lastAyah: data.lastAyah } : {}),
          ...(data.lastJuz !== undefined ? { lastJuz: data.lastJuz } : {}),
          completedSurahs: mergedCompleted,
          readAyahKeys: mergedAyahKeys,
          ...(data.preferredReciter !== undefined
            ? { preferredReciter: data.preferredReciter }
            : {}),
          ...(data.preferredTranslation !== undefined
            ? { preferredTranslation: data.preferredTranslation }
            : {}),
          ...(data.arabicFontSize !== undefined
            ? { arabicFontSize: data.arabicFontSize }
            : {}),
          ...(data.theme !== undefined ? { theme: data.theme } : {}),
          updatedAt: new Date(),
        },
      })
      .returning();

    return row;
  } catch (error) {
    console.error('Database error in upsertReadingProgress:', error);
    throw new Error('Failed to save reading progress.', { cause: error });
  }
}

export async function upsertBookmark(
  userId: number,
  input: {
    surahNumber: number;
    ayahNumber: number;
    surahName: string;
    arabicText: string;
    translationText: string;
    note?: string | null;
    collectionId?: number | null;
  }
) {
  try {
    const [row] = await db
      .insert(bookmarks)
      .values({
        userId,
        surahNumber: input.surahNumber,
        ayahNumber: input.ayahNumber,
        surahName: input.surahName,
        arabicText: input.arabicText,
        translationText: input.translationText,
        note: input.note ?? null,
        collectionId: input.collectionId ?? null,
      })
      .onConflictDoUpdate({
        target: [bookmarks.userId, bookmarks.surahNumber, bookmarks.ayahNumber],
        set: {
          note: input.note ?? null,
          collectionId: input.collectionId ?? null,
          translationText: input.translationText,
        },
      })
      .returning();

    return row;
  } catch (error) {
    console.error('Database error in upsertBookmark:', error);
    throw new Error('Failed to save bookmark.', { cause: error });
  }
}

export async function deleteBookmark(
  userId: number,
  surahNumber: number,
  ayahNumber: number
) {
  try {
    await db
      .delete(bookmarks)
      .where(
        and(
          eq(bookmarks.userId, userId),
          eq(bookmarks.surahNumber, surahNumber),
          eq(bookmarks.ayahNumber, ayahNumber)
        )
      );
  } catch (error) {
    console.error('Database error in deleteBookmark:', error);
    throw new Error('Failed to remove bookmark.', { cause: error });
  }
}

export async function createCollection(
  userId: number,
  name: string,
  description?: string | null
) {
  try {
    const [row] = await db
      .insert(collections)
      .values({
        userId,
        name,
        description: description ?? null,
      })
      .returning();
    return row;
  } catch (error) {
    console.error('Database error in createCollection:', error);
    throw new Error('Failed to create collection.', { cause: error });
  }
}

export async function deleteCollection(userId: number, collectionId: number) {
  try {
    await db
      .delete(collections)
      .where(
        and(eq(collections.id, collectionId), eq(collections.userId, userId))
      );
  } catch (error) {
    console.error('Database error in deleteCollection:', error);
    throw new Error('Failed to delete collection.', { cause: error });
  }
}
