import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { getAyahAudioUrl, getReciterById } from '../data/reciters';
import { fetchSurahDetail } from '../lib/quranApi';
import { MemorisationRange, RepeatCount, SurahMeta } from '../types/quran';
import { useAuthSync } from './AuthSyncContext';

interface ActiveTrack {
  surah: number;
  ayah: number;
  surahEnglishName: string;
  surahArabicName: string;
  totalAyahs: number;
}

interface AudioPlayerContextValue {
  activeTrack: ActiveTrack | null;
  reciterId: string;
  isPlaying: boolean;
  isLoading: boolean;
  errorMessage: string | null;
  currentTime: number;
  duration: number;
  volume: number;
  isMuted: boolean;
  playbackRate: number;
  continuousSurah: boolean;
  autoAdvanceSurah: boolean;
  repeatAyahCount: RepeatCount;
  currentRepeatIteration: number;
  memorisationRange: MemorisationRange;
  currentRangeLoop: number;
  playAyah: (
    surah: number,
    ayah: number,
    meta?: SurahMeta,
    overrideReciterId?: string
  ) => Promise<void>;
  switchReciter: (newReciterId: string) => void;
  togglePlayPause: () => void;
  playNextAyah: () => void;
  playPreviousAyah: () => void;
  replayCurrentAyah: () => void;
  retryAudio: () => void;
  seekTo: (seconds: number) => void;
  setVolume: (vol: number) => void;
  toggleMute: () => void;
  setPlaybackRate: (rate: number) => void;
  setContinuousSurah: (val: boolean) => void;
  setAutoAdvanceSurah: (val: boolean) => void;
  setRepeatAyahCount: (count: RepeatCount) => void;
  setMemorisationRange: React.Dispatch<React.SetStateAction<MemorisationRange>>;
  stopPlayback: () => void;
}

const AudioPlayerContext = createContext<AudioPlayerContextValue | null>(null);

export const AudioPlayerProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { progress, updatePreferences, updateLastRead, markAyahRead } =
    useAuthSync();

  const [activeTrack, setActiveTrack] = useState<ActiveTrack | null>(null);
  const [reciterId, setReciterId] = useState<string>(
    progress.preferredReciter || 'alafasy'
  );
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolumeState] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackRate, setPlaybackRateState] = useState(1);
  const [continuousSurah, setContinuousSurah] = useState(true);
  const [autoAdvanceSurah, setAutoAdvanceSurah] = useState(false);
  const [repeatAyahCount, setRepeatAyahCount] = useState<RepeatCount>(1);
  const [currentRepeatIteration, setCurrentRepeatIteration] = useState(1);
  const [memorisationRange, setMemorisationRange] = useState<MemorisationRange>({
    enabled: false,
    startAyah: 1,
    endAyah: 5,
    rangeLoops: 3,
  });
  const [currentRangeLoop, setCurrentRangeLoop] = useState(1);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const preloadAudioRef = useRef<HTMLAudioElement | null>(null);
  const surahMetaCache = useRef<Map<number, SurahMeta>>(new Map());

  // Keep reciter synced with user cloud preferences when loaded
  useEffect(() => {
    if (progress.preferredReciter && progress.preferredReciter !== reciterId) {
      setReciterId(progress.preferredReciter);
    }
  }, [progress.preferredReciter]);

  const stateRef = useRef({
    activeTrack,
    reciterId,
    repeatAyahCount,
    currentRepeatIteration,
    memorisationRange,
    currentRangeLoop,
    continuousSurah,
    autoAdvanceSurah,
  });

  useEffect(() => {
    stateRef.current = {
      activeTrack,
      reciterId,
      repeatAyahCount,
      currentRepeatIteration,
      memorisationRange,
      currentRangeLoop,
      continuousSurah,
      autoAdvanceSurah,
    };
  }, [
    activeTrack,
    reciterId,
    repeatAyahCount,
    currentRepeatIteration,
    memorisationRange,
    currentRangeLoop,
    continuousSurah,
    autoAdvanceSurah,
  ]);

  const loadAndPlayUrl = useCallback(
    async (
      surah: number,
      ayah: number,
      targetReciterId: string,
      meta: SurahMeta
    ) => {
      if (!audioRef.current) {
        audioRef.current = new Audio();
      }
      const audio = audioRef.current;
      const url = getAyahAudioUrl(targetReciterId, surah, ayah);

      setErrorMessage(null);
      setIsLoading(true);
      setCurrentTime(0);
      setDuration(0);

      setActiveTrack({
        surah,
        ayah,
        surahEnglishName: meta.englishName,
        surahArabicName: meta.name,
        totalAyahs: meta.numberOfAyahs,
      });

      markAyahRead(surah, ayah);
      updateLastRead(surah, ayah);

      // Preload next ayah silently
      if (ayah < meta.numberOfAyahs) {
        if (!preloadAudioRef.current) {
          preloadAudioRef.current = new Audio();
        }
        preloadAudioRef.current.preload = 'metadata';
        preloadAudioRef.current.src = getAyahAudioUrl(
          targetReciterId,
          surah,
          ayah + 1
        );
      }

      audio.src = url;
      audio.volume = isMuted ? 0 : volume;
      audio.playbackRate = playbackRate;

      try {
        await audio.play();
        setIsPlaying(true);
        setIsLoading(false);
      } catch (err: any) {
        if (err?.name !== 'AbortError') {
          setIsPlaying(false);
          setIsLoading(false);
          setErrorMessage(
            `Could not play audio from ${getReciterById(targetReciterId).name}. Check your connection or try another reciter.`
          );
        }
      }
    },
    [isMuted, volume, playbackRate, markAyahRead, updateLastRead]
  );

  const resolveSurahMeta = useCallback(async (surah: number, provided?: SurahMeta) => {
    if (provided) {
      surahMetaCache.current.set(surah, provided);
      return provided;
    }
    const cached = surahMetaCache.current.get(surah);
    if (cached) return cached;
    const detail = await fetchSurahDetail(surah);
    surahMetaCache.current.set(surah, detail.surah);
    return detail.surah;
  }, []);

  const playAyah = useCallback(
    async (
      surah: number,
      ayah: number,
      meta?: SurahMeta,
      overrideReciterId?: string
    ) => {
      const targetReciter = overrideReciterId ?? stateRef.current.reciterId;
      setCurrentRepeatIteration(1);
      if (
        !stateRef.current.memorisationRange.enabled ||
        ayah < stateRef.current.memorisationRange.startAyah ||
        ayah > stateRef.current.memorisationRange.endAyah
      ) {
        setCurrentRangeLoop(1);
      }
      try {
        const resolved = await resolveSurahMeta(surah, meta);
        const safeAyah = Math.max(1, Math.min(ayah, resolved.numberOfAyahs));
        await loadAndPlayUrl(surah, safeAyah, targetReciter, resolved);
      } catch {
        setIsLoading(false);
        setErrorMessage('Unable to load Surah metadata for playback.');
      }
    },
    [resolveSurahMeta, loadAndPlayUrl]
  );

  const switchReciter = useCallback(
    (newReciterId: string) => {
      setReciterId(newReciterId);
      updatePreferences({ preferredReciter: newReciterId });
      const current = stateRef.current.activeTrack;
      if (current) {
        playAyah(current.surah, current.ayah, undefined, newReciterId);
      }
    },
    [updatePreferences, playAyah]
  );

  const togglePlayPause = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || !stateRef.current.activeTrack) return;

    if (audio.paused) {
      setErrorMessage(null);
      audio
        .play()
        .then(() => setIsPlaying(true))
        .catch(() =>
          setErrorMessage('Playback blocked by browser. Tap Play again.')
        );
    } else {
      audio.pause();
      setIsPlaying(false);
    }
  }, []);

  const replayCurrentAyah = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || !stateRef.current.activeTrack) return;
    audio.currentTime = 0;
    audio
      .play()
      .then(() => setIsPlaying(true))
      .catch(() => null);
  }, []);

  const retryAudio = useCallback(() => {
    const current = stateRef.current.activeTrack;
    if (!current) return;
    playAyah(current.surah, current.ayah);
  }, [playAyah]);

  const playNextAyah = useCallback(() => {
    const current = stateRef.current.activeTrack;
    if (!current) return;
    if (current.ayah < current.totalAyahs) {
      playAyah(current.surah, current.ayah + 1);
    } else if (current.surah < 114) {
      playAyah(current.surah + 1, 1);
    }
  }, [playAyah]);

  const playPreviousAyah = useCallback(() => {
    const current = stateRef.current.activeTrack;
    if (!current) return;
    if (current.ayah > 1) {
      playAyah(current.surah, current.ayah - 1);
    } else if (current.surah > 1) {
      resolveSurahMeta(current.surah - 1).then((prevMeta) => {
        playAyah(current.surah - 1, prevMeta.numberOfAyahs, prevMeta);
      });
    }
  }, [playAyah, resolveSurahMeta]);

  const seekTo = useCallback((seconds: number) => {
    const audio = audioRef.current;
    if (!audio || !Number.isFinite(seconds)) return;
    audio.currentTime = Math.max(0, Math.min(seconds, audio.duration || 0));
    setCurrentTime(audio.currentTime);
  }, []);

  const setVolume = useCallback(
    (vol: number) => {
      const clamped = Math.max(0, Math.min(1, vol));
      setVolumeState(clamped);
      if (clamped > 0 && isMuted) setIsMuted(false);
      if (audioRef.current) {
        audioRef.current.volume = clamped;
      }
    },
    [isMuted]
  );

  const toggleMute = useCallback(() => {
    setIsMuted((prev) => {
      const next = !prev;
      if (audioRef.current) {
        audioRef.current.volume = next ? 0 : volume;
      }
      return next;
    });
  }, [volume]);

  const setPlaybackRate = useCallback((rate: number) => {
    setPlaybackRateState(rate);
    if (audioRef.current) {
      audioRef.current.playbackRate = rate;
    }
  }, []);

  const stopPlayback = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    setIsPlaying(false);
    setActiveTrack(null);
  }, []);

  // Wire persistent HTML5 audio element events
  useEffect(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio();
    }
    const audio = audioRef.current;

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime || 0);
    };
    const handleLoadedMetadata = () => {
      setDuration(audio.duration || 0);
      setIsLoading(false);
    };
    const handleWaiting = () => setIsLoading(true);
    const handleCanPlay = () => setIsLoading(false);
    const handleError = () => {
      setIsPlaying(false);
      setIsLoading(false);
      setErrorMessage(
        'Audio stream unavailable for this Ayah. Check connection or switch reciter.'
      );
    };

    const handleEnded = async () => {
      const s = stateRef.current;
      const track = s.activeTrack;
      if (!track) return;

      // 1. Check per-Ayah repetition
      const shouldRepeatAyah =
        s.repeatAyahCount === 'infinite' ||
        s.currentRepeatIteration < s.repeatAyahCount;

      if (shouldRepeatAyah) {
        setCurrentRepeatIteration((n) => n + 1);
        audio.currentTime = 0;
        try {
          await audio.play();
          setIsPlaying(true);
        } catch {
          setIsPlaying(false);
        }
        return;
      }

      setCurrentRepeatIteration(1);

      // 2. Check Memorisation Range Loop
      if (s.memorisationRange.enabled) {
        const rangeStart = Math.max(1, s.memorisationRange.startAyah);
        const rangeEnd = Math.min(track.totalAyahs, s.memorisationRange.endAyah);

        if (track.ayah < rangeEnd && track.ayah >= rangeStart) {
          const meta = await resolveSurahMeta(track.surah);
          await loadAndPlayUrl(track.surah, track.ayah + 1, s.reciterId, meta);
          return;
        }

        // Reached end of range
        const moreLoops =
          s.memorisationRange.rangeLoops === 'infinite' ||
          s.currentRangeLoop < s.memorisationRange.rangeLoops;
        if (moreLoops) {
          setCurrentRangeLoop((n) => n + 1);
          const meta = await resolveSurahMeta(track.surah);
          await loadAndPlayUrl(track.surah, rangeStart, s.reciterId, meta);
          return;
        }

        setCurrentRangeLoop(1);
        setIsPlaying(false);
        return;
      }

      // 3. Continuous Surah playback
      if (s.continuousSurah) {
        if (track.ayah < track.totalAyahs) {
          const meta = await resolveSurahMeta(track.surah);
          await loadAndPlayUrl(track.surah, track.ayah + 1, s.reciterId, meta);
          return;
        }
        if (s.autoAdvanceSurah && track.surah < 114) {
          const nextMeta = await resolveSurahMeta(track.surah + 1);
          await loadAndPlayUrl(track.surah + 1, 1, s.reciterId, nextMeta);
          return;
        }
      }

      setIsPlaying(false);
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('waiting', handleWaiting);
    audio.addEventListener('canplay', handleCanPlay);
    audio.addEventListener('error', handleError);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('waiting', handleWaiting);
      audio.removeEventListener('canplay', handleCanPlay);
      audio.removeEventListener('error', handleError);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [loadAndPlayUrl, resolveSurahMeta]);

  return (
    <AudioPlayerContext.Provider
      value={{
        activeTrack,
        reciterId,
        isPlaying,
        isLoading,
        errorMessage,
        currentTime,
        duration,
        volume,
        isMuted,
        playbackRate,
        continuousSurah,
        autoAdvanceSurah,
        repeatAyahCount,
        currentRepeatIteration,
        memorisationRange,
        currentRangeLoop,
        playAyah,
        switchReciter,
        togglePlayPause,
        playNextAyah,
        playPreviousAyah,
        replayCurrentAyah,
        retryAudio,
        seekTo,
        setVolume,
        toggleMute,
        setPlaybackRate,
        setContinuousSurah,
        setAutoAdvanceSurah,
        setRepeatAyahCount,
        setMemorisationRange,
        stopPlayback,
      }}
    >
      {children}
    </AudioPlayerContext.Provider>
  );
};

export function useAudioPlayer(): AudioPlayerContextValue {
  const ctx = useContext(AudioPlayerContext);
  if (!ctx) {
    throw new Error('useAudioPlayer must be used within AudioPlayerProvider');
  }
  return ctx;
}
