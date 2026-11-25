export type SectionView = 'home' | 'quran' | 'reciters' | 'bookmarks' | 'settings';

export type TranslationMode = 'english' | 'hausa' | 'both' | 'arabic-only';

export type RepeatCount = 1 | 2 | 3 | 5 | 10 | 'infinite';

export interface SurahMeta {
  number: number;
  name: string;
  englishName: string;
  englishNameTranslation: string;
  revelationType: 'Meccan' | 'Medinan' | string;
  numberOfAyahs: number;
}

export interface AyahData {
  number: number; // global 1..6236
  numberInSurah: number;
  text: string; // Uthmani Arabic
  englishText: string;
  hausaText: string;
  juz: number;
  manzil: number;
  page: number;
  ruku: number;
  hizbQuarter: number;
  sajda: boolean;
}

export interface SurahDetail {
  surah: SurahMeta;
  ayahs: AyahData[];
}

export interface WordByWordToken {
  position: number;
  arabic: string;
  transliteration: string;
  translation: string;
  charType: string;
}

export type SurahWordsMap = Record<number, WordByWordToken[]>;

export interface TafsirData {
  surah: number;
  ayah: number;
  sourceName: string;
  englishParagraphs: string[];
  arabicMuyassar: string;
}

export interface SearchMatch {
  number: number;
  text: string;
  numberInSurah: number;
  surahNumber: number;
  surahName: string;
  surahEnglishName: string;
  surahEnglishTranslation: string;
}

export interface ReciterInfo {
  id: string;
  name: string;
  arabicName: string;
  country: string;
  style: string;
  bitrate: string;
  folder: string;
  bio: string;
}

export interface BookmarkItem {
  id: string;
  surahNumber: number;
  ayahNumber: number;
  surahName: string;
  arabicText: string;
  translationText: string;
  note?: string | null;
  collectionId?: number | string | null;
  createdAt: string;
}

export interface CollectionItem {
  id: number | string;
  name: string;
  description?: string | null;
}

export interface ReadingProgressState {
  lastSurah: number;
  lastAyah: number;
  lastJuz: number;
  completedSurahs: number[];
  readAyahKeys: string[];
  preferredReciter: string;
  preferredTranslation: TranslationMode;
  arabicFontSize: number;
  theme: 'light' | 'dark';
}

export interface MemorisationRange {
  enabled: boolean;
  startAyah: number;
  endAyah: number;
  rangeLoops: RepeatCount;
}
