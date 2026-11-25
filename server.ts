import express from 'express';
import * as dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { AuthRequest, requireAuth } from './src/middleware/auth.ts';
import {
  createCollection,
  deleteBookmark,
  deleteCollection,
  getOrCreateUser,
  getUserSyncState,
  upsertBookmark,
  upsertReadingProgress,
} from './src/db/repository.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json({ limit: '1mb' }));

// In-memory cache for upstream Quran API calls to improve latency & reliability
const apiCache = new Map<string, { data: unknown; expiresAt: number }>();
const CACHE_TTL_MS = 1000 * 60 * 60 * 6; // 6 hours

async function fetchWithCache<T>(key: string, fetcher: () => Promise<T>): Promise<T> {
  const cached = apiCache.get(key);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.data as T;
  }
  const data = await fetcher();
  apiCache.set(key, { data, expiresAt: Date.now() + CACHE_TTL_MS });
  return data;
}

// ---------- Quran Data Proxy & Cache Routes ----------

app.get('/api/quran/surahs', async (_req, res) => {
  try {
    const surahs = await fetchWithCache('surahs_all', async () => {
      const response = await fetch('https://api.alquran.cloud/v1/surah');
      if (!response.ok) throw new Error(`Upstream error: ${response.status}`);
      const json = await response.json();
      return json.data;
    });
    res.json({ data: surahs });
  } catch (error) {
    console.error('Error fetching surah list:', error);
    res.status(502).json({ error: 'Unable to load Surah index from Quran API.' });
  }
});

app.get('/api/quran/surah/:number', async (req, res) => {
  const surahNumber = Number(req.params.number);
  if (!Number.isInteger(surahNumber) || surahNumber < 1 || surahNumber > 114) {
    return res.status(400).json({ error: 'Surah number must be between 1 and 114.' });
  }

  try {
    const payload = await fetchWithCache(`surah_${surahNumber}`, async () => {
      const response = await fetch(
        `https://api.alquran.cloud/v1/surah/${surahNumber}/editions/quran-uthmani,en.sahih,ha.gumi`
      );
      if (!response.ok) throw new Error(`Upstream error: ${response.status}`);
      const json = await response.json();
      const editions = json.data;
      if (!Array.isArray(editions) || editions.length < 3) {
        throw new Error('Unexpected Quran API edition response.');
      }

      const [uthmani, english, hausa] = editions;
      const ayahs = uthmani.ayahs.map((ayah: any, idx: number) => ({
        number: ayah.number,
        numberInSurah: ayah.numberInSurah,
        text: ayah.text,
        englishText: english.ayahs[idx]?.text ?? '',
        hausaText: hausa.ayahs[idx]?.text ?? '',
        juz: ayah.juz,
        manzil: ayah.manzil,
        page: ayah.page,
        ruku: ayah.ruku,
        hizbQuarter: ayah.hizbQuarter,
        sajda: Boolean(ayah.sajda),
      }));

      return {
        surah: {
          number: uthmani.number,
          name: uthmani.name,
          englishName: uthmani.englishName,
          englishNameTranslation: uthmani.englishNameTranslation,
          revelationType: uthmani.revelationType,
          numberOfAyahs: uthmani.numberOfAyahs,
        },
        ayahs,
      };
    });

    res.json({ data: payload });
  } catch (error) {
    console.error(`Error fetching surah ${surahNumber}:`, error);
    res.status(502).json({ error: `Unable to load Surah ${surahNumber}.` });
  }
});

app.get('/api/quran/surah/:number/words', async (req, res) => {
  const surahNumber = Number(req.params.number);
  if (!Number.isInteger(surahNumber) || surahNumber < 1 || surahNumber > 114) {
    return res.status(400).json({ error: 'Surah number must be between 1 and 114.' });
  }

  try {
    const wordsMap = await fetchWithCache(`words_${surahNumber}`, async () => {
      const response = await fetch(
        `https://api.quran.com/api/v4/verses/by_chapter/${surahNumber}?language=en&words=true&word_fields=text_uthmani,transliteration,translation&per_page=300`
      );
      if (!response.ok) throw new Error(`Upstream error: ${response.status}`);
      const json = await response.json();
      const result: Record<
        number,
        Array<{
          position: number;
          arabic: string;
          transliteration: string;
          translation: string;
          charType: string;
        }>
      > = {};

      for (const verse of json.verses ?? []) {
        result[verse.verse_number] = (verse.words ?? [])
          .filter((w: any) => w.char_type_name === 'word')
          .map((w: any) => ({
            position: w.position,
            arabic: w.text_uthmani ?? w.text ?? '',
            transliteration: w.transliteration?.text ?? '',
            translation: w.translation?.text ?? '',
            charType: w.char_type_name,
          }));
      }
      return result;
    });

    res.json({ data: wordsMap });
  } catch (error) {
    console.error(`Error fetching word-by-word for surah ${surahNumber}:`, error);
    res.status(502).json({ error: 'Unable to load word-by-word breakdown.' });
  }
});

app.get('/api/quran/tafsir/:surah/:ayah', async (req, res) => {
  const surah = Number(req.params.surah);
  const ayah = Number(req.params.ayah);
  if (
    !Number.isInteger(surah) ||
    surah < 1 ||
    surah > 114 ||
    !Number.isInteger(ayah) ||
    ayah < 1
  ) {
    return res.status(400).json({ error: 'Invalid Surah or Ayah reference.' });
  }

  try {
    const tafsir = await fetchWithCache(`tafsir_${surah}_${ayah}`, async () => {
      const [ibnKathirRes, muyassarRes] = await Promise.all([
        fetch(`https://api.quran.com/api/v4/tafsirs/169/by_ayah/${surah}:${ayah}`),
        fetch(`https://api.alquran.cloud/v1/ayah/${surah}:${ayah}/ar.muyassar`),
      ]);

      let englishHtml = '';
      let sourceName = 'Tafsir Ibn Kathir (Abridged)';
      if (ibnKathirRes.ok) {
        const ikJson = await ibnKathirRes.json();
        englishHtml = ikJson?.tafsir?.text ?? '';
        sourceName = ikJson?.tafsir?.resource_name ?? sourceName;
      }

      let arabicText = '';
      if (muyassarRes.ok) {
        const muJson = await muyassarRes.json();
        arabicText = muJson?.data?.text ?? '';
      }

      // Strip HTML tags safely into readable paragraphs on the server
      const cleanParagraphs = englishHtml
        .replace(/<\/?(p|div|br|h[1-6])[^>]*>/gi, '\n')
        .replace(/<[^>]+>/g, '')
        .replace(/&amp;/g, '&')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean);

      return {
        surah,
        ayah,
        sourceName,
        englishParagraphs: cleanParagraphs,
        arabicMuyassar: arabicText,
      };
    });

    res.json({ data: tafsir });
  } catch (error) {
    console.error(`Error fetching tafsir ${surah}:${ayah}:`, error);
    res.status(502).json({ error: 'Unable to load Tafsir commentary.' });
  }
});

app.get('/api/quran/search', async (req, res) => {
  const query = String(req.query.q ?? '').trim();
  const edition = String(req.query.edition ?? 'en.sahih');
  const allowedEditions = new Set(['en.sahih', 'ha.gumi', 'quran-simple-clean']);

  if (query.length < 2) {
    return res.status(400).json({ error: 'Search query must be at least 2 characters.' });
  }
  if (!allowedEditions.has(edition)) {
    return res.status(400).json({ error: 'Unsupported search edition.' });
  }

  try {
    const cacheKey = `search_${edition}_${query.toLowerCase()}`;
    const results = await fetchWithCache(cacheKey, async () => {
      const response = await fetch(
        `https://api.alquran.cloud/v1/search/${encodeURIComponent(query)}/all/${edition}`
      );
      if (!response.ok) {
        if (response.status === 404) return { count: 0, matches: [] };
        throw new Error(`Upstream search error: ${response.status}`);
      }
      const json = await response.json();
      const matches = (json?.data?.matches ?? []).slice(0, 40).map((m: any) => ({
        number: m.number,
        text: m.text,
        numberInSurah: m.numberInSurah,
        surahNumber: m.surah?.number,
        surahName: m.surah?.name,
        surahEnglishName: m.surah?.englishName,
        surahEnglishTranslation: m.surah?.englishNameTranslation,
      }));
      return {
        count: json?.data?.count ?? matches.length,
        matches,
      };
    });

    res.json({ data: results });
  } catch (error) {
    console.error('Error searching Quran:', error);
    res.status(502).json({ error: 'Search service temporarily unavailable.' });
  }
});

// ---------- Cloud SQL User Sync Routes ----------

app.get('/api/sync', requireAuth, async (req: AuthRequest, res) => {
  try {
    const user = await getOrCreateUser(
      req.user!.uid,
      req.user!.email ?? '',
      req.user!.name ?? null
    );
    const state = await getUserSyncState(user.id);
    res.json({ user, ...state });
  } catch (error: any) {
    console.error('GET /api/sync error:', error);
    res.status(500).json({ error: error.message || 'Failed to sync user state.' });
  }
});

app.put('/api/progress', requireAuth, async (req: AuthRequest, res) => {
  try {
    const user = await getOrCreateUser(
      req.user!.uid,
      req.user!.email ?? '',
      req.user!.name ?? null
    );

    const {
      lastSurah,
      lastAyah,
      lastJuz,
      completedSurahs,
      readAyahKeys,
      preferredReciter,
      preferredTranslation,
      arabicFontSize,
      theme,
    } = req.body ?? {};

    const progress = await upsertReadingProgress(user.id, {
      ...(typeof lastSurah === 'number' ? { lastSurah } : {}),
      ...(typeof lastAyah === 'number' ? { lastAyah } : {}),
      ...(typeof lastJuz === 'number' ? { lastJuz } : {}),
      ...(Array.isArray(completedSurahs) ? { completedSurahs } : {}),
      ...(Array.isArray(readAyahKeys) ? { readAyahKeys } : {}),
      ...(typeof preferredReciter === 'string' ? { preferredReciter } : {}),
      ...(typeof preferredTranslation === 'string' ? { preferredTranslation } : {}),
      ...(typeof arabicFontSize === 'number' ? { arabicFontSize } : {}),
      ...(typeof theme === 'string' ? { theme } : {}),
    });

    res.json({ progress });
  } catch (error: any) {
    console.error('PUT /api/progress error:', error);
    res.status(500).json({ error: error.message || 'Failed to save progress.' });
  }
});

app.post('/api/bookmarks', requireAuth, async (req: AuthRequest, res) => {
  try {
    const user = await getOrCreateUser(
      req.user!.uid,
      req.user!.email ?? '',
      req.user!.name ?? null
    );

    const {
      surahNumber,
      ayahNumber,
      surahName,
      arabicText,
      translationText,
      note,
      collectionId,
    } = req.body ?? {};

    if (
      !Number.isInteger(surahNumber) ||
      !Number.isInteger(ayahNumber) ||
      typeof surahName !== 'string' ||
      typeof arabicText !== 'string'
    ) {
      return res.status(400).json({ error: 'Invalid bookmark payload.' });
    }

    const bookmark = await upsertBookmark(user.id, {
      surahNumber,
      ayahNumber,
      surahName,
      arabicText,
      translationText: typeof translationText === 'string' ? translationText : '',
      note: typeof note === 'string' ? note : null,
      collectionId: typeof collectionId === 'number' ? collectionId : null,
    });

    res.json({ bookmark });
  } catch (error: any) {
    console.error('POST /api/bookmarks error:', error);
    res.status(500).json({ error: error.message || 'Failed to save bookmark.' });
  }
});

app.delete(
  '/api/bookmarks/:surahNumber/:ayahNumber',
  requireAuth,
  async (req: AuthRequest, res) => {
    try {
      const user = await getOrCreateUser(
        req.user!.uid,
        req.user!.email ?? '',
        req.user!.name ?? null
      );
      const surahNumber = Number(req.params.surahNumber);
      const ayahNumber = Number(req.params.ayahNumber);
      if (!Number.isInteger(surahNumber) || !Number.isInteger(ayahNumber)) {
        return res.status(400).json({ error: 'Invalid Surah or Ayah number.' });
      }
      await deleteBookmark(user.id, surahNumber, ayahNumber);
      res.json({ ok: true });
    } catch (error: any) {
      console.error('DELETE /api/bookmarks error:', error);
      res.status(500).json({ error: error.message || 'Failed to remove bookmark.' });
    }
  }
);

app.post('/api/collections', requireAuth, async (req: AuthRequest, res) => {
  try {
    const user = await getOrCreateUser(
      req.user!.uid,
      req.user!.email ?? '',
      req.user!.name ?? null
    );
    const name = String(req.body?.name ?? '').trim();
    const description =
      typeof req.body?.description === 'string'
        ? req.body.description.trim()
        : null;

    if (!name || name.length > 80) {
      return res.status(400).json({ error: 'Collection name must be 1–80 characters.' });
    }

    const collection = await createCollection(user.id, name, description);
    res.json({ collection });
  } catch (error: any) {
    console.error('POST /api/collections error:', error);
    res.status(500).json({ error: error.message || 'Failed to create collection.' });
  }
});

app.delete('/api/collections/:id', requireAuth, async (req: AuthRequest, res) => {
  try {
    const user = await getOrCreateUser(
      req.user!.uid,
      req.user!.email ?? '',
      req.user!.name ?? null
    );
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) {
      return res.status(400).json({ error: 'Invalid collection id.' });
    }
    await deleteCollection(user.id, id);
    res.json({ ok: true });
  } catch (error: any) {
    console.error('DELETE /api/collections error:', error);
    res.status(500).json({ error: error.message || 'Failed to delete collection.' });
  }
});

// ---------- Frontend Serving (Vite Dev / Production Dist) ----------

async function startServer() {
  const port = Number(process.env.PORT) || 3000;
  const distPath = path.resolve(__dirname, 'dist');
  const isProd = process.env.NODE_ENV === 'production' && fs.existsSync(distPath);

  if (isProd) {
    app.use(express.static(distPath));
    app.get('/{*splat}', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(port, '0.0.0.0', () => {
    console.log(`Al-Bayan Quran server running on http://0.0.0.0:${port}`);
  });
}

startServer();
