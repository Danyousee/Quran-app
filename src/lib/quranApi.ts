import {
  SearchMatch,
  SurahDetail,
  SurahMeta,
  SurahWordsMap,
  TafsirData,
} from '../types/quran';
import { idbClearCache, idbGet, idbListKeys, idbSet } from './quranCache';

const memSurahs: { data: SurahMeta[] | null } = { data: null };
const memSurahDetail = new Map<number, SurahDetail>();
const memWords = new Map<number, SurahWordsMap>();
const memTafsir = new Map<string, TafsirData>();

export async function fetchAllSurahs(): Promise<SurahMeta[]> {
  if (memSurahs.data) return memSurahs.data;

  const cached = await idbGet<SurahMeta[]>('surahs_all');
  if (cached && cached.length === 114) {
    memSurahs.data = cached;
    return cached;
  }

  const res = await fetch('/api/quran/surahs');
  if (!res.ok) throw new Error('Failed to load Surah index');
  const json = await res.json();
  const data = json.data as SurahMeta[];
  memSurahs.data = data;
  await idbSet('surahs_all', data);
  return data;
}

export async function fetchSurahDetail(surahNumber: number): Promise<SurahDetail> {
  const inMem = memSurahDetail.get(surahNumber);
  if (inMem) return inMem;

  const cached = await idbGet<SurahDetail>(`surah_${surahNumber}`);
  if (cached && cached.ayahs?.length > 0) {
    memSurahDetail.set(surahNumber, cached);
    return cached;
  }

  const res = await fetch(`/api/quran/surah/${surahNumber}`);
  if (!res.ok) throw new Error(`Failed to load Surah ${surahNumber}`);
  const json = await res.json();
  const detail = json.data as SurahDetail;
  memSurahDetail.set(surahNumber, detail);
  await idbSet(`surah_${surahNumber}`, detail);
  return detail;
}

export async function fetchSurahWords(surahNumber: number): Promise<SurahWordsMap> {
  const inMem = memWords.get(surahNumber);
  if (inMem) return inMem;

  const cached = await idbGet<SurahWordsMap>(`words_${surahNumber}`);
  if (cached) {
    memWords.set(surahNumber, cached);
    return cached;
  }

  const res = await fetch(`/api/quran/surah/${surahNumber}/words`);
  if (!res.ok) throw new Error(`Failed to load word-by-word data for Surah ${surahNumber}`);
  const json = await res.json();
  const words = json.data as SurahWordsMap;
  memWords.set(surahNumber, words);
  await idbSet(`words_${surahNumber}`, words);
  return words;
}

export async function fetchAyahTafsir(
  surah: number,
  ayah: number
): Promise<TafsirData> {
  const key = `tafsir_${surah}_${ayah}`;
  const inMem = memTafsir.get(key);
  if (inMem) return inMem;

  const cached = await idbGet<TafsirData>(key);
  if (cached) {
    memTafsir.set(key, cached);
    return cached;
  }

  const res = await fetch(`/api/quran/tafsir/${surah}/${ayah}`);
  if (!res.ok) throw new Error(`Failed to load Tafsir for ${surah}:${ayah}`);
  const json = await res.json();
  const tafsir = json.data as TafsirData;
  memTafsir.set(key, tafsir);
  await idbSet(key, tafsir);
  return tafsir;
}

export async function searchQuranText(
  query: string,
  edition: 'en.sahih' | 'ha.gumi' | 'quran-simple-clean'
): Promise<{ count: number; matches: SearchMatch[] }> {
  const res = await fetch(
    `/api/quran/search?q=${encodeURIComponent(query)}&edition=${edition}`
  );
  if (!res.ok) {
    throw new Error('Search request failed');
  }
  const json = await res.json();
  return json.data;
}

export async function getOfflineCachedSurahs(): Promise<number[]> {
  const keys = await idbListKeys('surah_');
  return keys
    .map((k) => Number(k.replace('surah_', '')))
    .filter((n) => Number.isInteger(n) && n >= 1 && n <= 114)
    .sort((a, b) => a - b);
}

export async function cacheSurahOffline(surahNumber: number): Promise<void> {
  await Promise.all([
    fetchSurahDetail(surahNumber),
    fetchSurahWords(surahNumber).catch(() => null),
  ]);
}

export async function clearOfflineQuranCache(): Promise<void> {
  memSurahDetail.clear();
  memWords.clear();
  memTafsir.clear();
  await idbClearCache();
}
