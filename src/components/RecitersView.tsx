import React from 'react';
import { Check, Headphones, Pause, Play, Volume2 } from 'lucide-react';
import { RECITERS } from '../data/reciters';
import { useAudioPlayer } from '../context/AudioPlayerContext';
import { SurahMeta } from '../types/quran';

interface RecitersViewProps {
  surahs: SurahMeta[];
  onOpenSurah: (surah: number, ayah: number) => void;
}

export const RecitersView: React.FC<RecitersViewProps> = ({
  surahs,
  onOpenSurah,
}) => {
  const {
    reciterId,
    activeTrack,
    isPlaying,
    switchReciter,
    playAyah,
    togglePlayPause,
  } = useAudioPlayer();

  const handleAudition = (targetReciterId: string) => {
    if (reciterId === targetReciterId && activeTrack) {
      togglePlayPause();
      return;
    }
    if (activeTrack) {
      switchReciter(targetReciterId);
    } else {
      const fatiha = surahs.find((s) => s.number === 1);
      switchReciter(targetReciterId);
      playAyah(1, 1, fatiha, targetReciterId);
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 pb-32 pt-8 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-3 border-b border-stone-200 pb-6 sm:flex-row sm:items-end sm:justify-between dark:border-slate-800">
        <div>
          <p className="text-xs font-medium uppercase tracking-widest text-emerald-700 dark:text-emerald-400">
            Verified Audio Streams
          </p>
          <h1 className="font-display mt-2 text-3xl font-semibold text-stone-900 dark:text-stone-100">
            Quran Reciters
          </h1>
          <p className="mt-1.5 max-w-2xl text-sm text-stone-600 dark:text-stone-400">
            Select your preferred Qari at any time. Switching reciters immediately continues playback from your current Ayah with the newly selected voice.
          </p>
        </div>

        {activeTrack && (
          <button
            type="button"
            onClick={() => onOpenSurah(activeTrack.surah, activeTrack.ayah)}
            className="inline-flex h-10 items-center gap-2 rounded-lg border border-emerald-700/30 bg-emerald-50 px-4 text-xs font-semibold text-emerald-800 hover:bg-emerald-100 dark:border-emerald-500/30 dark:bg-emerald-950/50 dark:text-emerald-300 whitespace-nowrap shrink-0"
          >
            <Volume2 className="h-4 w-4" />
            <span>
              Now Playing {activeTrack.surahEnglishName} {activeTrack.surah}:
              {activeTrack.ayah}
            </span>
          </button>
        )}
      </div>

      <div className="mt-8 grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
        {RECITERS.map((reciter) => {
          const isSelected = reciterId === reciter.id;
          const isThisPlaying = isSelected && isPlaying;

          return (
            <div
              key={reciter.id}
              className={`flex flex-col justify-between rounded-2xl border p-6 transition-colors ${
                isSelected
                  ? 'border-emerald-700/60 bg-emerald-50/60 dark:border-emerald-500/60 dark:bg-emerald-950/30'
                  : 'border-stone-200 bg-white hover:border-stone-300 dark:border-slate-800 dark:bg-slate-900/60 dark:hover:border-slate-700'
              }`}
            >
              <div>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p
                      className="font-arabic text-2xl text-emerald-800 dark:text-emerald-400"
                      dir="rtl"
                      lang="ar"
                    >
                      {reciter.arabicName}
                    </p>
                    <h2 className="font-display mt-1 text-xl font-semibold text-stone-900 dark:text-stone-100">
                      {reciter.name}
                    </h2>
                  </div>
                  {isSelected && (
                    <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-700 text-white dark:bg-emerald-600">
                      <Check className="h-4 w-4" />
                    </span>
                  )}
                </div>

                <p className="mt-2 text-xs text-stone-500 dark:text-stone-400">
                  {reciter.country} · {reciter.style}
                </p>

                <p className="mt-4 text-sm leading-relaxed text-stone-600 dark:text-stone-300">
                  {reciter.bio}
                </p>
              </div>

              <div className="mt-6 flex items-center gap-2 border-t border-stone-200/80 pt-4 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => handleAudition(reciter.id)}
                  className={`inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-lg px-4 text-xs font-semibold transition-colors whitespace-nowrap ${
                    isSelected
                      ? 'bg-emerald-700 text-white hover:bg-emerald-800 dark:bg-emerald-600 dark:hover:bg-emerald-500'
                      : 'border border-stone-300 bg-white text-stone-800 hover:bg-stone-100 dark:border-slate-700 dark:bg-slate-950 dark:text-stone-200 dark:hover:bg-slate-800'
                  }`}
                >
                  {isThisPlaying ? (
                    <>
                      <Pause className="h-3.5 w-3.5" />
                      <span>Pause Recitation</span>
                    </>
                  ) : (
                    <>
                      <Play className="h-3.5 w-3.5" />
                      <span>
                        {activeTrack
                          ? `Play ${activeTrack.surah}:${activeTrack.ayah}`
                          : 'Listen (Al-Faatiha 1:1)'}
                      </span>
                    </>
                  )}
                </button>

                {!isSelected && (
                  <button
                    type="button"
                    onClick={() => switchReciter(reciter.id)}
                    aria-label={`Set ${reciter.name} as default reciter`}
                    className="inline-flex h-10 items-center justify-center gap-1.5 rounded-lg border border-stone-200 px-3 text-xs font-medium text-stone-700 hover:bg-stone-100 dark:border-slate-700 dark:text-stone-300 dark:hover:bg-slate-800 whitespace-nowrap shrink-0"
                  >
                    <Headphones className="h-3.5 w-3.5" />
                    <span>Select</span>
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
