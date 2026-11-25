import { ReciterInfo } from '../types/quran';

export const RECITERS: ReciterInfo[] = [
  {
    id: 'alafasy',
    name: 'Mishary Rashid Alafasy',
    arabicName: 'مشاري راشد العفاسي',
    country: 'Kuwait',
    style: 'Murattal · 128 kbps',
    bitrate: '128 kbps',
    folder: 'Alafasy_128kbps',
    bio: 'Imam of the Grand Mosque in Kuwait, celebrated worldwide for crystal-clear tajwid precision and warm melodic phrasing.',
  },
  {
    id: 'sudais',
    name: 'Abdul Rahman Al-Sudais',
    arabicName: 'عبد الرحمن السديس',
    country: 'Saudi Arabia',
    style: 'Haramain Murattal · 192 kbps',
    bitrate: '192 kbps',
    folder: 'Abdurrahmaan_As-Sudais_192kbps',
    bio: 'Chief Imam of Masjid al-Haram in Makkah, known for commanding Haramain cadence and deeply moving Taraweeh recitations.',
  },
  {
    id: 'muaiqly',
    name: 'Maher Al-Muaiqly',
    arabicName: 'ماهر المعيقلي',
    country: 'Saudi Arabia',
    style: 'Murattal · 128 kbps',
    bitrate: '128 kbps',
    folder: 'MaherAlMuaiqly128kbps',
    bio: 'Imam of Masjid al-Haram in Makkah, beloved for his measured pace, tranquil tone, and steady breath ideal for memorisation.',
  },
  {
    id: 'ghamdi',
    name: 'Saad Al-Ghamdi',
    arabicName: 'سعد الغامدي',
    country: 'Saudi Arabia',
    style: 'Murattal · Clear Study Stream',
    bitrate: '40 kbps',
    folder: 'Ghamadi_40kbps',
    bio: 'Renowned scholar and Qari from Dammam whose balanced, uncluttered recitation makes following word-by-word text effortless.',
  },
  {
    id: 'abdulbasit',
    name: 'Abdul Basit Abdus Samad',
    arabicName: 'عبد الباسط عبد الصمد',
    country: 'Egypt',
    style: 'Classical Murattal · 192 kbps',
    bitrate: '192 kbps',
    folder: 'Abdul_Basit_Murattal_192kbps',
    bio: 'Legendary Egyptian master of Maqam and Tajwid, revered across generations for authoritative classical articulation.',
  },
  {
    id: 'minshawi',
    name: 'Mohamed Siddiq Al-Minshawi',
    arabicName: 'محمد صديق المنشاوي',
    country: 'Egypt',
    style: 'Classical Murattal · 128 kbps',
    bitrate: '128 kbps',
    folder: 'Minshawy_Murattal_128kbps',
    bio: 'Iconic Egyptian reciter remembered for heartfelt humility and deliberate pacing tailored for deep reflection and Hifz.',
  },
];

export function getReciterById(id: string): ReciterInfo {
  return RECITERS.find((r) => r.id === id) ?? RECITERS[0];
}

export function getAyahAudioUrl(
  reciterId: string,
  surahNumber: number,
  ayahNumber: number
): string {
  const reciter = getReciterById(reciterId);
  const sss = String(surahNumber).padStart(3, '0');
  const aaa = String(ayahNumber).padStart(3, '0');
  return `https://everyayah.com/data/${reciter.folder}/${sss}${aaa}.mp3`;
}

export interface JuzStart {
  juz: number;
  name: string;
  surah: number;
  ayah: number;
}

export const JUZ_LIST: JuzStart[] = [
  { juz: 1, name: 'Alif Lam Mim', surah: 1, ayah: 1 },
  { juz: 2, name: 'Sayaqul', surah: 2, ayah: 142 },
  { juz: 3, name: 'Tilka r-Rusul', surah: 2, ayah: 253 },
  { juz: 4, name: 'Lan Tanalu', surah: 3, ayah: 93 },
  { juz: 5, name: 'Wal-Muhsanat', surah: 4, ayah: 24 },
  { juz: 6, name: 'La Yuhibbullah', surah: 4, ayah: 148 },
  { juz: 7, name: 'Wa Idha Samiu', surah: 5, ayah: 82 },
  { juz: 8, name: 'Wa Law Annana', surah: 6, ayah: 111 },
  { juz: 9, name: 'Qalal-Mala’u', surah: 7, ayah: 88 },
  { juz: 10, name: 'Wa‘lamu', surah: 8, ayah: 41 },
  { juz: 11, name: 'Ya‘tadhirun', surah: 9, ayah: 93 },
  { juz: 12, name: 'Wa Ma Min Dabbah', surah: 11, ayah: 6 },
  { juz: 13, name: 'Wa Ma Ubarri’u', surah: 12, ayah: 53 },
  { juz: 14, name: 'Rubama', surah: 15, ayah: 1 },
  { juz: 15, name: 'Subhanalladhi', surah: 17, ayah: 1 },
  { juz: 16, name: 'Qala Alam', surah: 18, ayah: 75 },
  { juz: 17, name: 'Iqtaraba', surah: 21, ayah: 1 },
  { juz: 18, name: 'Qad Aflaha', surah: 23, ayah: 1 },
  { juz: 19, name: 'Wa Qalalladhina', surah: 25, ayah: 21 },
  { juz: 20, name: 'Amman Khalaqa', surah: 27, ayah: 56 },
  { juz: 21, name: 'Utlu Ma Uhiya', surah: 29, ayah: 46 },
  { juz: 22, name: 'Wa Man Yaqnut', surah: 33, ayah: 31 },
  { juz: 23, name: 'Wa Maliya', surah: 36, ayah: 28 },
  { juz: 24, name: 'Faman Azlamu', surah: 39, ayah: 32 },
  { juz: 25, name: 'Ilayhi Yuraddu', surah: 41, ayah: 47 },
  { juz: 26, name: 'Ha Mim', surah: 46, ayah: 1 },
  { juz: 27, name: 'Qala Fama Khatbukum', surah: 51, ayah: 31 },
  { juz: 28, name: 'Qad Sami‘allahu', surah: 58, ayah: 1 },
  { juz: 29, name: 'Tabarakalladhi', surah: 67, ayah: 1 },
  { juz: 30, name: 'Amma Yatasa’alun', surah: 78, ayah: 1 },
];

export const TOTAL_QURAN_AYAHS = 6236;
export const TOTAL_QURAN_SURAHS = 114;
