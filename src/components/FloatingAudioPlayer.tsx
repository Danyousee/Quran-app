import React, { useState } from 'react';
import {
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Loader2,
  Pause,
  Play,
  Repeat,
  RotateCcw,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import { RECITERS, getReciterById } from '../data/reciters';
import { useAudioPlayer } from '../context/AudioPlayerContext';
import { RepeatCount } from '../types/quran';

interface FloatingAudioPlayerProps {
  onJumpToActiveAyah: (surah: number, ayah: number) => void;
}

const REPEAT_OPTIONS: RepeatCount[] = [1, 2, 3, 5, 10, 'infinite'];

function formatTime(sec: number): string {
  if (!Number.isFinite(sec) || sec <= 0) return '0:00';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

export const FloatingAudioPlayer: React.FC<FloatingAudioPlayerProps> = ({
  onJumpToActiveAyah,
}) => {
  const {
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
    repeatAyahCount,
    currentRepeatIteration,
    memorisationRange,
    currentRangeLoop,
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
    setRepeatAyahCount,
    stopPlayback,
  } = useAudioPlayer();

  const [expandedMobile, setExpandedMobile] = useState(false);

  if (!activeTrack) return null;

  const reciter = getReciterById(reciterId);
  const progressPct =
    duration > 0 ? Math.min(100, (currentTime / duration) * 100) : 0;

  const cycleRepeat = () => {
    const idx = REPEAT_OPTIONS.indexOf(repeatAyahCount);
    const next = REPEAT_OPTIONS[(idx + 1) % REPEAT_OPTIONS.length];
    setRepeatAyahCount(next);
  };

  const repeatLabel =
    repeatAyahCount === 'infinite' ? 'Loop' : `${repeatAyahCount}x`;

  return (
    <div
      role="region"
      aria-label="Quran Audio Player"
      className="fixed inset-x-0 bottom-0 z-50 border-t border-stone-200 bg-white/95 shadow-lg backdrop-blur-md transition-colors dark:border-slate-800 dark:bg-slate-950/95"
    >
      {/* Thin interactive progress bar along top edge of player */}
      <div className="relative h-1.5 w-full bg-stone-100 dark:bg-slate-800">
        <div
          className="h-full bg-emerald-700 transition-all duration-150 dark:bg-emerald-500"
          style={{ width: `${progressPct}%` }}
        />
        <input
          type="range"
          min={0}
          max={duration || 1}
          step={0.1}
          value={currentTime}
          onChange={(e) => seekTo(Number(e.target.value))}
          aria-label="Seek recitation progress"
          className="absolute inset-0 h-3 w-full cursor-pointer opacity-0"
        />
      </div>

      {/* Error banner if stream fails */}
      {errorMessage && (
        <div className="flex items-center justify-between gap-3 border-b border-red-200 bg-red-50 px-4 py-1.5 text-xs text-red-800 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300">
          <div className="flex items-center gap-2 truncate">
            <AlertCircle className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{errorMessage}</span>
          </div>
          <button
            type="button"
            onClick={retryAudio}
            className="shrink-0 rounded bg-red-700 px-2.5 py-1 text-xs font-medium text-white hover:bg-red-800"
          >
            Retry
          </button>
        </div>
      )}

      <div className="mx-auto max-w-7xl px-3 py-2 sm:px-6 lg:px-8">
        {/* Main compact bar */}
        <div className="flex items-center justify-between gap-3">
          {/* Left: Track info */}
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <button
              type="button"
              onClick={() =>
                onJumpToActiveAyah(activeTrack.surah, activeTrack.ayah)
              }
              className="group min-w-0 text-left focus-visible:outline-2 focus-visible:outline-emerald-700"
              title="Jump to playing Ayah"
            >
              <div className="flex items-center gap-2 text-sm font-semibold text-stone-900 group-hover:text-emerald-700 dark:text-stone-100 dark:group-hover:text-emerald-400">
                <span className="truncate">{activeTrack.surahEnglishName}</span>
                <span className="font-mono-tabular shrink-0 text-xs text-emerald-700 dark:text-emerald-400">
                  {activeTrack.surah}:{activeTrack.ayah}
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-stone-500 dark:text-stone-400">
                <span className="truncate">{reciter.name}</span>
                {repeatAyahCount !== 1 && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span className="font-mono-tabular shrink-0 text-amber-700 dark:text-amber-400">
                      Repeat {currentRepeatIteration}/
                      {repeatAyahCount === 'infinite' ? '∞' : repeatAyahCount}
                    </span>
                  </>
                )}
                {memorisationRange.enabled && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span className="font-mono-tabular shrink-0 text-emerald-700 dark:text-emerald-400">
                      Range {memorisationRange.startAyah}–
                      {memorisationRange.endAyah} (Loop {currentRangeLoop}/
                      {memorisationRange.rangeLoops === 'infinite'
                        ? '∞'
                        : memorisationRange.rangeLoops}
                      )
                    </span>
                  </>
                )}
              </div>
            </button>
          </div>

          {/* Center: Core playback controls */}
          <div className="flex items-center gap-1 sm:gap-2">
            <button
              type="button"
              onClick={playPreviousAyah}
              aria-label="Previous Ayah"
              className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-stone-600 transition-colors hover:bg-stone-100 hover:text-stone-900 dark:text-stone-300 dark:hover:bg-slate-800 dark:hover:text-white"
            >
              <SkipBack className="h-4 w-4" />
            </button>

            <button
              type="button"
              onClick={togglePlayPause}
              aria-label={isPlaying ? 'Pause recitation' : 'Play recitation'}
              className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-emerald-700 text-white shadow-sm transition-colors hover:bg-emerald-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 dark:bg-emerald-600 dark:hover:bg-emerald-500"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : isPlaying ? (
                <Pause className="h-4 w-4" />
              ) : (
                <Play className="h-4 w-4 translate-x-0.5" />
              )}
            </button>

            <button
              type="button"
              onClick={playNextAyah}
              aria-label="Next Ayah"
              className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-stone-600 transition-colors hover:bg-stone-100 hover:text-stone-900 dark:text-stone-300 dark:hover:bg-slate-800 dark:hover:text-white"
            >
              <SkipForward className="h-4 w-4" />
            </button>

            <button
              type="button"
              onClick={replayCurrentAyah}
              aria-label="Replay current Ayah"
              title="Replay current Ayah"
              className="hidden sm:inline-flex h-10 w-10 items-center justify-center rounded-lg text-stone-600 transition-colors hover:bg-stone-100 hover:text-stone-900 dark:text-stone-300 dark:hover:bg-slate-800 dark:hover:text-white"
            >
              <RotateCcw className="h-4 w-4" />
            </button>
          </div>

          {/* Right: Desktop extended controls + mobile expand */}
          <div className="flex flex-1 items-center justify-end gap-2">
            <span className="font-mono-tabular hidden lg:inline text-xs text-stone-500 dark:text-stone-400">
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>

            {/* Reciter Quick Select (desktop) */}
            <select
              aria-label="Select Quran reciter"
              value={reciterId}
              onChange={(e) => switchReciter(e.target.value)}
              className="hidden md:block h-9 max-w-[175px] rounded-lg border border-stone-200 bg-stone-50 px-2.5 text-xs font-medium text-stone-800 focus:border-emerald-700 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-stone-200"
            >
              {RECITERS.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>

            {/* Repeat cycle button (desktop) */}
            <button
              type="button"
              onClick={cycleRepeat}
              title="Repeat current Ayah count"
              className={`hidden md:inline-flex h-9 items-center gap-1.5 rounded-lg border px-2.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                repeatAyahCount !== 1
                  ? 'border-amber-600/40 bg-amber-50 text-amber-800 dark:border-amber-500/40 dark:bg-amber-950/40 dark:text-amber-300'
                  : 'border-stone-200 text-stone-600 hover:bg-stone-100 dark:border-slate-700 dark:text-stone-300 dark:hover:bg-slate-800'
              }`}
            >
              <Repeat className="h-3.5 w-3.5" />
              <span className="font-mono-tabular">{repeatLabel}</span>
            </button>

            {/* Continuous Surah toggle (desktop) */}
            <button
              type="button"
              onClick={() => setContinuousSurah(!continuousSurah)}
              title="Continuous Surah playback"
              className={`hidden xl:inline-flex h-9 items-center rounded-lg border px-2.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                continuousSurah
                  ? 'border-emerald-600/40 bg-emerald-50 text-emerald-800 dark:border-emerald-500/40 dark:bg-emerald-950/40 dark:text-emerald-300'
                  : 'border-stone-200 text-stone-600 hover:bg-stone-100 dark:border-slate-700 dark:text-stone-300 dark:hover:bg-slate-800'
              }`}
            >
              Auto-Next
            </button>

            {/* Speed selector (desktop) */}
            <select
              aria-label="Playback speed"
              value={playbackRate}
              onChange={(e) => setPlaybackRate(Number(e.target.value))}
              className="hidden lg:block h-9 rounded-lg border border-stone-200 bg-stone-50 px-2 text-xs font-medium text-stone-700 dark:border-slate-700 dark:bg-slate-900 dark:text-stone-200"
            >
              <option value={0.75}>0.75x</option>
              <option value={1}>1.0x</option>
              <option value={1.25}>1.25x</option>
            </select>

            {/* Volume (desktop) */}
            <div className="hidden lg:flex items-center gap-1.5">
              <button
                type="button"
                onClick={toggleMute}
                aria-label={isMuted ? 'Unmute audio' : 'Mute audio'}
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-stone-600 hover:bg-stone-100 dark:text-stone-300 dark:hover:bg-slate-800"
              >
                {isMuted || volume === 0 ? (
                  <VolumeX className="h-4 w-4" />
                ) : (
                  <Volume2 className="h-4 w-4" />
                )}
              </button>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={isMuted ? 0 : volume}
                onChange={(e) => setVolume(Number(e.target.value))}
                aria-label="Audio volume"
                className="w-16 accent-emerald-700 dark:accent-emerald-500"
              />
            </div>

            {/* Expand mobile controls */}
            <button
              type="button"
              onClick={() => setExpandedMobile((v) => !v)}
              aria-label={expandedMobile ? 'Collapse player options' : 'Expand player options'}
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-stone-600 hover:bg-stone-100 md:hidden dark:text-stone-300 dark:hover:bg-slate-800"
            >
              {expandedMobile ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronUp className="h-4 w-4" />
              )}
            </button>

            <button
              type="button"
              onClick={stopPlayback}
              aria-label="Close audio player"
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-stone-500 hover:bg-stone-100 hover:text-stone-900 dark:text-stone-400 dark:hover:bg-slate-800 dark:hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Mobile expanded controls drawer */}
        {expandedMobile && (
          <div className="mt-3 grid grid-cols-2 gap-2 border-t border-stone-200 pt-3 md:hidden dark:border-slate-800">
            <select
              aria-label="Select reciter"
              value={reciterId}
              onChange={(e) => switchReciter(e.target.value)}
              className="col-span-2 h-10 rounded-lg border border-stone-200 bg-stone-50 px-3 text-xs font-medium text-stone-800 dark:border-slate-700 dark:bg-slate-900 dark:text-stone-200"
            >
              {RECITERS.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={cycleRepeat}
              className="flex h-10 items-center justify-center gap-1.5 rounded-lg border border-stone-200 text-xs font-medium text-stone-700 dark:border-slate-700 dark:text-stone-200"
            >
              <Repeat className="h-3.5 w-3.5" />
              <span>Repeat: {repeatLabel}</span>
            </button>

            <button
              type="button"
              onClick={() => setContinuousSurah(!continuousSurah)}
              className={`flex h-10 items-center justify-center rounded-lg border text-xs font-medium ${
                continuousSurah
                  ? 'border-emerald-600/40 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300'
                  : 'border-stone-200 text-stone-700 dark:border-slate-700 dark:text-stone-200'
              }`}
            >
              Continuous: {continuousSurah ? 'On' : 'Off'}
            </button>

            <button
              type="button"
              onClick={replayCurrentAyah}
              className="flex h-10 items-center justify-center gap-1.5 rounded-lg border border-stone-200 text-xs font-medium text-stone-700 dark:border-slate-700 dark:text-stone-200"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>Replay Ayah</span>
            </button>

            <div className="flex h-10 items-center gap-2 rounded-lg border border-stone-200 px-3 dark:border-slate-700">
              <Volume2 className="h-3.5 w-3.5 text-stone-500" />
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={isMuted ? 0 : volume}
                onChange={(e) => setVolume(Number(e.target.value))}
                aria-label="Volume"
                className="w-full accent-emerald-700"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
