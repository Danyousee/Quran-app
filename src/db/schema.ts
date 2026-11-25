import { relations } from 'drizzle-orm';
import {
  integer,
  jsonb,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
} from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uid: text('uid').notNull().unique(),
  email: text('email').notNull(),
  displayName: text('display_name'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const collections = pgTable('collections', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  name: text('name').notNull(),
  description: text('description'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const bookmarks = pgTable(
  'bookmarks',
  {
    id: serial('id').primaryKey(),
    userId: integer('user_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
    collectionId: integer('collection_id').references(() => collections.id, {
      onDelete: 'set null',
    }),
    surahNumber: integer('surah_number').notNull(),
    ayahNumber: integer('ayah_number').notNull(),
    surahName: text('surah_name').notNull(),
    arabicText: text('arabic_text').notNull(),
    translationText: text('translation_text').notNull(),
    note: text('note'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('bookmarks_user_surah_ayah_idx').on(
      table.userId,
      table.surahNumber,
      table.ayahNumber
    ),
  ]
);

export const readingProgress = pgTable('reading_progress', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull()
    .unique(),
  lastSurah: integer('last_surah').notNull().default(1),
  lastAyah: integer('last_ayah').notNull().default(1),
  lastJuz: integer('last_juz').notNull().default(1),
  completedSurahs: jsonb('completed_surahs')
    .$type<number[]>()
    .notNull()
    .default([]),
  readAyahKeys: jsonb('read_ayah_keys')
    .$type<string[]>()
    .notNull()
    .default([]),
  preferredReciter: text('preferred_reciter').notNull().default('alafasy'),
  preferredTranslation: text('preferred_translation').notNull().default('both'),
  arabicFontSize: integer('arabic_font_size').notNull().default(34),
  theme: text('theme').notNull().default('light'),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const usersRelations = relations(users, ({ many, one }) => ({
  collections: many(collections),
  bookmarks: many(bookmarks),
  readingProgress: one(readingProgress),
}));

export const collectionsRelations = relations(collections, ({ one, many }) => ({
  user: one(users, {
    fields: [collections.userId],
    references: [users.id],
  }),
  bookmarks: many(bookmarks),
}));

export const bookmarksRelations = relations(bookmarks, ({ one }) => ({
  user: one(users, {
    fields: [bookmarks.userId],
    references: [users.id],
  }),
  collection: one(collections, {
    fields: [bookmarks.collectionId],
    references: [collections.id],
  }),
}));

export const readingProgressRelations = relations(
  readingProgress,
  ({ one }) => ({
    user: one(users, {
      fields: [readingProgress.userId],
      references: [users.id],
    }),
  })
);
